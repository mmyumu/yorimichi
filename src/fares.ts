import { railLines, type RailLine } from './rail';

/** Fares as JR computes them: from the shortest operating km (営業キロ) between two stations along the lines, by band. Real km where the game has them, so the fares
 * are realistic between any two stations, not only from Tokyo; the local lines of each region (Tokyo, Kyoto) form a network of their own, with no local fare between them. */
/** JR East 幹線 adult paper fares from the March 2026 revision, by operating km rounded up; they reproduce the fares of the Tokyo board (tokyo-fares.ts).
 * Past 140 km (only the Shinkansen goes that far), the earlier bands, raised by the same 4.8 % as the last one. */
const fareBands:[number,number][]=[[3,160],[6,200],[10,210],[15,260],[20,350],[25,440],[30,530],[35,620],[40,720],[45,810],[50,910],[60,1040],[70,1230],[80,1410],[90,1600],[100,1790],[120,2090],[140,2420],
  ...([[160,2640],[180,3080],[200,3410],[220,3740],[240,4070],[260,4510],[280,4840],[300,5170],[320,5500],[340,5720],[360,6050],[380,6380],[400,6600],[420,6930],[440,7150],[460,7480],[480,7700],[500,8030],[520,8360],[540,8580],[560,8910],[600,9460]] as [number,number][]).map(([km,fare]):[number,number]=>[km,Math.round(fare*2420/2310/10)*10])];
export const fareForKm=(km:number)=>fareBands.find(([max])=>Math.ceil(km)<=max)![1];
/** Shortest operating km from Tokyo for the stops of the Tokyo board, from the Wikipedia station tables (October 2026); the board's fare stations' reproduce its fares. */
const fromTokyo:Record<string,number>={東京:0,熊谷:64.7,上尾:38.5,大宮:30.3,久喜:48.9,小山:80.6,土浦:66,浦和:24.2,赤羽:13.2,取手:43.4,柏:32.9,池袋:12.3,上野:3.6,新宿:10.3,渋谷:12.3,新橋:1.9,品川:6.8,川崎:18.2,横浜:28.8,大船:46.5,熱海:104.6,
  吉祥寺:22.5,立川:37.5,八王子:47.4,高尾:53.1,大月:87.8,甲府:134.1,新小岩:10,船橋:23.2,千葉:39.2,蘇我:43,鎌倉:51,北鎌倉:48.8,逗子:54.9,東逗子:56.9,田浦:60.3,横須賀:62.4,衣笠:64.8,久里浜:70.4,神田:1.3,秋葉原:2,御徒町:3,鶯谷:4.7,日暮里:5.8,西日暮里:6.3,田端:7.1,駒込:8.7,巣鴨:9.4,大塚:10.5,目白:13.5,高田馬場:13,新大久保:11.6,代々木:9.6,原宿:11.1,恵比寿:12.4,目黒:10.9,五反田:9.7,大崎:8.8,高輪ゲートウェイ:5.9,田町:4.6,浜松町:3.1,有楽町:0.8,行田:59.9,吹上:57.6,北鴻巣:54.6,鴻巣:50.3,北本:46.7,桶川:42.1,北上尾:40.2,宮原:34.3,土呂:33.3,東大宮:35.4,蓮田:39.2,白岡:43.5,新白岡:45.9,東鷲宮:51.6,栗橋:57.2,古河:64.7,野木:69.4,間々田:73.3,さいたま新都心:28.7,与野:27.6,北浦和:26,南浦和:22.5,蕨:19.7,西川口:17.8,川口:15.8,十条:15.2,板橋:14.1,尾久:8.4,酒折:131.2,石和温泉:127.8,春日居町:125,山梨市:122.2,東山梨:120.1,塩山:116.9,勝沼ぶどう郷:112.5,甲斐大和:106.5,笹子:100.4,初狩:93.9,猿橋:85.3,鳥沢:81.2,梁川:77.6,四方津:74,上野原:69.8,藤野:66.3,相模湖:62.6,西八王子:49.8,豊田:43.1,日野:40.8,国立:34.5,西国分寺:32.8,国分寺:31.4,武蔵小金井:29.1,東小金井:27.4,武蔵境:25.7,三鷹:24.1,西荻窪:20.6,荻窪:18.7,阿佐ケ谷:17.3,高円寺:16.1,中野:14.7,東中野:12.8,四ツ谷:6.6,御茶ノ水:2.6,北千住:11,松戸:21.5,北柏:35,我孫子:37.1,天王台:39.8,藤代:49.2,龍ケ崎市:51.3,牛久:56.4,ひたち野うしく:60.3,荒川沖:63,新日本橋:1.2,馬喰町:2.3,錦糸町:4.8,小岩:12.8,市川:15.4,本八幡:17.4,下総中山:19,西船橋:20.6,東船橋:25,津田沼:26.7,幕張本郷:29.6,幕張:31.6,新検見川:33.2,稲毛:35.9,西千葉:37.8,本千葉:40.6,八丁堀:1.2,越中島:2.8,潮見:5.4,新木場:7.4,葛西臨海公園:10.6,舞浜:12.7,新浦安:16.1,市川塩浜:18.2,南船橋:26,新習志野:28.3,海浜幕張:31.7,検見川浜:33.7,稲毛海岸:35.3,千葉みなと:39,戸塚:40.9,藤沢:51.1,辻堂:54.8,茅ケ崎:58.6,平塚:63.8,大磯:67.8,二宮:73.1,国府津:77.7,鴨宮:80.8,小田原:83.9,早川:86,根府川:90.4,真鶴:95.8,湯河原:99.1};
/** Operating km from Kyoto around it (JR West, rounded from its timetables). */
const fromKyoto:Record<string,number>={京都:0,山科:5.5,草津:22.6,彦根:61.8,米原:67.7,高槻:23,新大阪:39,大阪:42.8,大津京:10.9,堅田:24.8,近江今津:59,東福寺:0.9,稲荷:2.7,宇治:15.4,奈良:34.7,丹波口:2.5,二条:4.2,嵯峨嵐山:9.4,亀岡:20.2,園部:34.2};
/** Between two neighbouring stops, the km is the difference of their km from the region's centre, except where the two are reached from opposite ways round (the far side
 * of the Yamanote loop, the Saikyo and Chuo-Sobu lines across it): there, the real km between them. */
const between:Record<string,number>={'目白 高田馬場':.9,'渋谷 恵比寿':1.6,'渋谷 新宿':3.4,'新宿 池袋':4.8,'板橋 十条':1.7,'十条 赤羽':1.5,'御茶ノ水 秋葉原':.9,'秋葉原 錦糸町':3.4};
/** The local network: each stop's neighbours along every local line, with the km between them. */
const network=new Map<string,Map<string,number>>();
for(const line of railLines)if(line.service==='local'){
  const table=line.stops.every(stop=>stop in fromTokyo)?fromTokyo:fromKyoto;
  const pairs=line.stops.map((stop,i)=>[stop,line.stops[(i+1)%line.stops.length]]).slice(0,line.loop?undefined:-1);
  for(const [a,b] of pairs){
    if(!(a in table&&b in table))throw Error(`No km for ${a} or ${b} (${line.en})`);
    const km=between[`${a} ${b}`]??between[`${b} ${a}`]??Math.abs(table[a]-table[b]);
    for(const [x,y] of [[a,b],[b,a]]){if(!network.has(x))network.set(x,new Map());network.get(x)!.set(y,km)}
  }
}
const distances=new Map<string,Map<string,number>>();
/** The shortest km from `from` to every stop it reaches by local lines (Dijkstra, kept once worked out). */
function kmFrom(from:string){
  let out=distances.get(from);if(out)return out;
  out=new Map([[from,0]]);const done=new Set<string>();
  for(;;){
    let at='',best=Infinity;for(const [stop,km] of out)if(!done.has(stop)&&km<best){at=stop;best=km}
    if(!at)break;done.add(at);
    for(const [next,km] of network.get(at)??[])if(best+km<(out.get(next)??Infinity))out.set(next,Math.round((best+km)*10)/10);
  }
  distances.set(from,out);return out;
}
/** The adult fare by local lines from one station to another (Japanese names): 0 for the same, null where no local line leads. */
export function fareBetween(from:string,to:string){if(from===to)return 0;const km=kmFrom(from).get(to);return km===undefined?null:fareForKm(km)}
/** The shortest operating km by local lines from one station to another (Japanese names), null where no local line leads: an Uber's ride takes about as far by road. */
export const kmBetween=(from:string,to:string)=>from===to?0:kmFrom(from).get(to)??null;
/** Every fare from a station to the others it reaches, cheapest first: the amounts its machines sell. */
export const faresFrom=(from:string)=>[...new Set([...kmFrom(from)].filter(([to])=>to!==from).map(([,km])=>fareForKm(km)))].sort((a,b)=>a-b);
/** How long a local ride of `stops` stops takes, in minutes: about 90 km/h between stations and a minute and a half at each. */
export const localMinutes=(from:string,to:string,stops:number)=>Math.max(2,Math.round(stops*1.5+(kmFrom(from).get(to)??0)/1.5));
/** The Shinkansen's operating km from the start of its line (those of the Tokaido and Tohoku main lines). */
const shinkansenKm:Record<string,Record<string,number>>={'tokaido-shinkansen':{東京:0,品川:6.8,新横浜:28.8,名古屋:366,京都:513.6,新大阪:552.6},'tohoku-shinkansen':{東京:0,上野:3.6,大宮:30.3,宇都宮:109.5,仙台:351.8}};
/** The reserved-seat express charge (指定席特急料金) by km, as on the Nozomi and Hayabusa (rounded: 5,810 from Tokyo to Kyoto or Shin-Osaka). */
const expressBands:[number,number][]=[[50,1000],[100,2400],[200,3800],[300,4900],[400,5500],[600,5810]];
const kmAlong=(line:RailLine,from:string,to:string)=>{const table=shinkansenKm[line.id];if(!(from in table&&to in table))throw Error(`No km for ${from} or ${to} (${line.en})`);return Math.abs(table[to]-table[from])};
/** A Shinkansen ticket's price between two stops of its line: the fare for the km, and the express charge. */
export function shinkansenFare(line:RailLine,from:string,to:string){const km=kmAlong(line,from,to);return fareForKm(km)+expressBands.find(([max])=>Math.ceil(km)<=max)![1]}
/** How long the ride takes, in minutes (the Nozomi's 2 h 15 from Tokyo to Kyoto, about 230 km/h; a few minutes at least). */
export const shinkansenMinutes=(line:RailLine,from:string,to:string)=>Math.max(5,Math.round(kmAlong(line,from,to)/3.8));
