export type Hub='tokyo'|'kyoto';
export type Place=Hub|'kamakura'|'arashiyama'|'jr-stop';
export type Service='shinkansen'|'local';
export interface Route {id:string;from:Hub;to:Place;service:Service;name:string;line:string;fare:number;platform:string}
export const places:Record<Place,string>={tokyo:'Tokyo · Main station',kyoto:'Kyoto · Main station',kamakura:'Kamakura · The temple trail',arashiyama:'Arashiyama · The bamboo path','jr-stop':'JR station'};
export const routes:Route[]=[
{id:'tokyo-kyoto',from:'tokyo',to:'kyoto',service:'shinkansen',name:'KYOTO / 京都',line:'Tokaido Shinkansen',fare:14000,platform:'TRACK 19'},
{id:'kyoto-tokyo',from:'kyoto',to:'tokyo',service:'shinkansen',name:'TOKYO / 東京',line:'Tokaido Shinkansen',fare:14000,platform:'TRACK 11'},
{id:'kyoto-arashiyama',from:'kyoto',to:'arashiyama',service:'local',name:'ARASHIYAMA / 嵐山',line:'Sagano Line',fare:240,platform:'TRACK 33'},
];
export const isHub=(place:Place):place is Hub=>place==='tokyo'||place==='kyoto';
export const returnHub=(place:Place):Hub=>place==='arashiyama'?'kyoto':'tokyo';

// Fictional platform assignments kept stable so signs, tickets and staff agree.
// Tokyo local trips use value tickets from the fare map, so they have no route here.
const platforms:Record<Hub,Record<Service,string>>={tokyo:{local:'TRACK 3',shinkansen:'TRACK 19'},kyoto:{local:'TRACK 33',shinkansen:'TRACK 11'}};
export const platformFor=(hub:Hub,service:Service)=>platforms[hub][service];
