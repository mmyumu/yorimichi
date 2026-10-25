export type Hub='tokyo'|'kyoto'|'kamakura';
export type Place=Hub|'kamakura-trail'|'arashiyama'|'jr-stop';
export type Service='shinkansen'|'local';
/** A route bookable at a hub's machines; `ja` and `color` draw it on the station's board, `train` and `decoy` are the two departures shown at the gates. */
export interface Route {id:string;from:Hub;to:Place;service:Service;name:string;line:string;ja:string;color:string;fare:number;platform:string;train:string;decoy:string}
export const places:Record<Place,string>={tokyo:'Tokyo · Main station',kyoto:'Kyoto · Main station',kamakura:'Kamakura · JR station','kamakura-trail':'Kamakura · The temple trail',arashiyama:'Arashiyama · The bamboo path','jr-stop':'JR station'};
export const routes:Route[]=[
{id:'tokyo-kyoto',from:'tokyo',to:'kyoto',service:'shinkansen',name:'KYOTO / 京都',line:'Tokaido Shinkansen',ja:'新幹線',color:'#2a6fb3',fare:14000,platform:'TRACK 19',train:'のぞみ / NOZOMI → KYOTO',decoy:'回送 / NOT IN SERVICE'},
{id:'kyoto-tokyo',from:'kyoto',to:'tokyo',service:'shinkansen',name:'TOKYO / 東京',line:'Tokaido Shinkansen',ja:'新幹線',color:'#2a6fb3',fare:14000,platform:'TRACK 11',train:'のぞみ / NOZOMI → TOKYO',decoy:'回送 / NOT IN SERVICE'},
{id:'kyoto-arashiyama',from:'kyoto',to:'arashiyama',service:'local',name:'ARASHIYAMA / 嵐山',line:'Sagano Line',ja:'嵯峨野線',color:'#b45843',fare:240,platform:'TRACK 33',train:'嵯峨野線 / SAGANO → SAGA-ARASHIYAMA',decoy:'反対方向 / DIRECTION KYOTO'},
{id:'kamakura-tokyo',from:'kamakura',to:'tokyo',service:'local',name:'TOKYO / 東京',line:'Yokosuka Line',ja:'横須賀線',color:'#2f6db5',fare:1040,platform:'TRACK 2',train:'横須賀線 / YOKOSUKA → TOKYO',decoy:'反対方向 / DIRECTION ZUSHI'},
];
export const isHub=(place:Place):place is Hub=>place in stations;
export const returnHub=(place:Place):Hub=>place==='arashiyama'?'kyoto':place==='kamakura-trail'?'kamakura':'tokyo';

/** The hub stations, all laid out alike (see art.ts and hall-scene.ts): what tells them apart is their name, accent colour, exits,
 * and the far right of the concourse, the Shinkansen transfer gates where the station has a Shinkansen platform, a NewDays shop otherwise.
 * An exit with `walk` leads somewhere playable. */
export interface Station {ja:string;en:string;accent:string;west:[string,string];east:[string,string];walk?:{east:Place;label:string}}
export const stations:Record<Hub,Station>={
  tokyo:{ja:'東京',en:'Tokyo',accent:'#b66c51',west:['Marunouchi / Bus','Marunouchi and the buses'],east:['Yaesu / Taxi','Yaesu and the taxis']},
  kyoto:{ja:'京都',en:'Kyoto',accent:'#608776',west:['Hachijo / Bus','Hachijo and the buses'],east:['Karasuma / Taxi','Karasuma and the taxis']},
  kamakura:{ja:'鎌倉',en:'Kamakura',accent:'#3f6f9e',west:['Onari / Enoden','Onari-dori and the Enoden line'],east:['Komachi / Temples','Komachi-dori and the temples'],walk:{east:'kamakura-trail',label:'Walk to the temple trail'}},
};

// Fictional platform assignments kept stable so signs, tickets and staff agree.
// Tokyo local trips use value tickets from the fare map, so they have no route here.
const platforms:Record<Hub,{local:string;shinkansen?:string}>={tokyo:{local:'TRACK 3',shinkansen:'TRACK 19'},kyoto:{local:'TRACK 33',shinkansen:'TRACK 11'},kamakura:{local:'TRACK 2'}};
export const platformFor=(hub:Hub,service:Service)=>platforms[hub][service]??'';
export const hasShinkansen=(hub:Hub)=>!!platforms[hub].shinkansen;
/** The five machines of the bank, left to right: the last sells Shinkansen tickets where there is a Shinkansen. */
export const machineKinds=(hub:Hub)=>['local','charge','local','charge',hasShinkansen(hub)?'shinkansen':'local'] as const;
