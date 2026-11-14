/** The places of the trip, each an album page: reached on foot through the phone's Maps (`walkFrom`; `walk`: the stations, Japanese names, a short walk away; `foot`: the km on foot from the stops of its buses, roughly the real ones) or by the buses of rail.ts naming its `en`, or, without `pieces`,
 * by an exit of its own (network.ts `known`). One screen each, its layout and drawing in sight-scenes.ts after the real place (`pieces` and `ground` are only what its street, makeSightRoad, shows of it), with a camera that keeps the memory; its photos are those in
 * public/photos/<id>/, listed in public/photos/index.json by scripts/import-photos.mjs. `open`: a place with no gate (a district, a shore, a path): the bus and the walk arrive straight in it, its street only on the way out.
 * `street`: a place seen from its street only (Kyoto Tower): no screen of its own, its camera stands on the pavement there (an avenue of its road in sight-scenes.ts).
 * Adding a place: a line here, its entry in sight-scenes.ts, a bus or a `walk`, and its folder in that script. */
import { areas, kmApart, onMap, spotOf, type LonLat } from './city-maps';
import { kmBetween } from './fares';
import { busLines } from './rail';

export type Ground='lawn'|'gravel'|'moss'|'street';
export type Piece=['temple',string,string]|['gate',string,string]|['pagoda',number,string,string]|['torii',string]|['pavilion',string,string]|['kyotoTower']|['tsutenkaku']|['bridge',string]|['rainbow']|['lake']|['neon',string]|['jizo']|['bamboo']|['ropeway']|['machiya'];
export interface Sight {id:string;ja:string;en:string;at?:LonLat;walk?:string[];foot?:Record<string,number>;ground?:Ground;pieces?:Piece[];garden?:string;parts?:Page[];ropeway?:boolean;open?:boolean;street?:boolean}
/** An album page and memory of its own: every sight has one, and `parts` adds those of a place too large for one (each with its camera, its id the place it stands in). */
export interface Page {id:string;ja:string;en:string}
export const sights:Sight[]=[
  {id:'asakusa',ja:'浅草寺',en:'Senso-ji',at:[139.7967,35.7148],ground:'gravel',foot:{上野:2.2,秋葉原:2.7},pieces:[['pagoda',5,'#a83a2c','#4d5a5c'],['temple','#b5402f','#4d5a5c']]},
  {id:'shibuya-crossing',open:true,ja:'渋谷',en:'Shibuya',at:[139.7005,35.6595],walk:['渋谷','原宿'],ground:'street',pieces:[['neon','#34b6e0']]},
  {id:'meiji',ja:'明治神宮',en:'Meiji-jingu',at:[139.6993,35.6764],walk:['原宿','代々木'],ground:'gravel',pieces:[['temple','#6e5138','#3f6358'],['torii','#a08a68']]},
  {id:'ginza',open:true,ja:'銀座',en:'Ginza',at:[139.7671,35.6717],walk:['有楽町','新橋'],ground:'street',pieces:[['neon','#e0483a']]},
  {id:'odaiba',open:true,ja:'お台場',en:'Odaiba',at:[139.7756,35.6268],walk:['台場','お台場海浜公園'],foot:{新橋:7,浜松町:6},pieces:[['lake'],['rainbow']]},
  {id:'kinkaku',ja:'金閣寺',en:'Kinkaku-ji',at:[135.7292,35.0394],foot:{京都:8.5,円町:2.6,北大路:2.6,三条:7,祇園四条:7.5},pieces:[['pavilion','#e0b43c','#6d5a2a']]},
  {id:'ginkaku',ja:'銀閣寺',en:'Ginkaku-ji',at:[135.7982,35.0270],ground:'moss',foot:{京都:8,三条:3.8,円町:7,北大路:4},pieces:[['pavilion','#6f6a60','#3a3a38']]},
  {id:'daitoku',ja:'大徳寺',en:'Daitoku-ji',at:[135.7466,35.0432],ground:'gravel',foot:{京都:6.5,円町:3,北大路:1.3,三条:5,祇園四条:5.5},pieces:[['gate','#a8402f','#4d5a5c']]},
  {id:'kenkun',ja:'建勲神社',en:'Kenkun-jinja',at:[135.7500,35.0389],foot:{京都:6.5,円町:3.2,北大路:1.2},pieces:[['temple','#c2513a','#5a4a3a'],['torii','#d4502e']]},
  {id:'yasaka',ja:'八坂神社',en:'Yasaka-jinja',at:[135.7785,35.0037],walk:['祇園四条'],ground:'gravel',pieces:[['temple','#d9d2bd','#4d5a5c']]},
  {id:'higashiyama',open:true,ja:'東山',en:'Higashiyama',at:[135.7789,34.9985],walk:['祇園四条','清水五条'],ground:'gravel',foot:{京都:3,北大路:7.5},pieces:[['pagoda',5,'#4a3a2e','#3c4648'],['machiya']]},
  {id:'heian',ja:'平安神宮',en:'Heian-jingu',at:[135.7824,35.0160],walk:['神宮丸太町'],ground:'gravel',foot:{京都:5,三条:1.8},pieces:[['temple','#d4502e','#3d7a5e']],garden:'heian-garden',parts:[{id:'heian-garden',ja:'神苑',en:'Heian-jingu · The garden'},{id:'heian-road',ja:'大鳥居',en:'Heian-jingu · The great torii'}]},
  {id:'lanterns',ja:'提灯の社',en:'The lantern shrine',at:[135.7850,35.0300],ground:'moss',foot:{京都:5.5,三条:3.2,円町:6,北大路:4},pieces:[['temple','#6e5138','#4a4238'],['torii','#a7a596']]},
  {id:'kyoto-tower',street:true,ja:'京都タワー',en:'Kyoto Tower',at:[135.7595,34.9875],walk:['京都','四条'],ground:'street',pieces:[['kyotoTower']]},
  {id:'rakusai',ja:'洛西竹林公園',en:'Rakusai bamboo park',at:[135.6746,34.9709],ground:'moss',foot:{桂川:3.5,向日町:3.2},pieces:[['bamboo'],['jizo']]},
  {id:'dotonbori',open:true,ja:'道頓堀',en:'Dotonbori',at:[135.5013,34.6687],ground:'street',foot:{大阪:3.8},pieces:[['neon','#f0c030']]},
  {id:'shinsekai',open:true,ja:'新世界',en:'Shinsekai',at:[135.5063,34.6525],ground:'street',foot:{大阪:5.5},pieces:[['tsutenkaku']]},
  {id:'biwako',ja:'びわ湖テラス',en:'Biwako Terrace',at:[135.9030,35.2050],foot:{志賀:3.8},pieces:[['lake'],['ropeway']],ropeway:true,garden:'biwako-horai',parts:[{id:'biwako-horai',ja:'蓬莱山',en:'Biwako Terrace · Mt Horai'},{id:'biwako-bridge',ja:'吊橋',en:'Biwako Terrace · The Sky Bridge'}]},
  {id:'otsu-shore',open:true,ja:'大津',en:'Otsu',at:[135.8675,35.0085],walk:['大津','膳所'],pieces:[['lake']]},
  {id:'toshogu',ja:'日光東照宮',en:'Nikko Toshogu',at:[139.5991,36.7580],ground:'gravel',foot:{日光:2.2},pieces:[['pagoda',5,'#a83a2c','#3f4a46'],['gate','#e0c070','#2f3a38']]},
  {id:'kanmangafuchi',open:true,ja:'憾満ヶ淵',en:'Kanmangafuchi',at:[139.5861,36.7459],ground:'moss',foot:{日光:3.6},pieces:[['bridge',''],['jizo']]},
  {id:'shinkyo',open:true,ja:'神橋',en:'Shinkyo Bridge',at:[139.6037,36.7534],walk:['日光'],ground:'moss',foot:{日光:1.5},pieces:[['bridge','#c8452e']]},
  {id:'kamakura-trail',ja:'鎌倉',en:'Kamakura'},
  {id:'arashiyama',ja:'嵐山',en:'Arashiyama'},
];
/** The sight a place is, or the garden of (`garden`, a second screen of it reached from the first). */
export const sightOf=(place:string)=>sights.find(sight=>sight.id===place&&!sight.street||sight.garden===place);
/** The street outside a sight (`<id>-road`, makeSightRoad in art.ts): where its bus stops, a walk arrives and the Uber pulls up, the sight through its entrance. */
export const roadTo=(id:string)=>`${id}-road`;
export const sightOfRoad=(place:string)=>sights.find(sight=>sight.pieces&&roadTo(sight.id)===place);
/** A place with a screen of its own (sight-scenes.ts): a sight or an exit's map. */
export const scenic=(place:string)=>!!sightOf(place);
// Every stop of a sight's buses has its km on foot, and every km starts where there is a way back (the walkers come back through that station).
for(const sight of sights){
  const stops=busLines.filter(bus=>bus.sights.some(([,en])=>en===sight.en)).flatMap(bus=>bus.stops);
  for(const stop of stops)if(!sight.foot?.[stop])throw Error(`${sight.en}: no km on foot from ${stop}`);
  for(const stop of Object.keys(sight.foot??{}))if(!stops.includes(stop))throw Error(`${sight.en}: no bus from ${stop}`);
  if(sight.pieces&&!sight.walk&&!sight.foot)throw Error(`${sight.en}: no way there on foot`);
  if(sight.pieces&&!(sight.at&&areas.some(area=>onMap(area,sight.at!,6))))throw Error(`${sight.en}: on no map`);
}
/** The walk to a sight from a station's street, as the phone's Maps gives it: along the line, 12 minutes a km, to the station that makes it shortest, then ten minutes from one next to it (`walk`) or its `foot` km, or straight there where both ends are on the maps (city-maps.ts), the streets a third longer than the crow flies, when that is shorter.
 * `via` is that station, the one the traveller will come back through; null from the other side of the country (no km between them). */
export function walkFrom(from:string,sight:Sight){
  const ends:[string,number][]=[...(sight.walk??[]).map((ja):[string,number]=>[ja,10]),...Object.entries(sight.foot??{}).map(([ja,km]):[string,number]=>[ja,km*12])];
  let best:{minutes:number;via:string}|null=null;
  for(const [via,last] of ends){const km=kmBetween(from,via);if(km===null)continue;const minutes=Math.round(km*12+last);if(!best||minutes<best.minutes)best={minutes,via}}
  const start=spotOf(from);
  return best&&start&&sight.at?{...best,minutes:Math.min(best.minutes,Math.round(kmApart(start,sight.at)*1.3*12))}:best;
}
export const memoryPages:Page[]=sights.flatMap(sight=>[sight,...(sight.parts??[])]);
/** The album's last page, not a place: photos from along the way, there from the start. */
export const roadPage={id:'road',ja:'旅の途中',en:'Along the way'};
