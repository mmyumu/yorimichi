export type Hub='tokyo'|'kyoto';
export type Place=Hub|'kamakura'|'kawaguchiko'|'arashiyama';
export type Service='shinkansen'|'local';
export interface Route {id:string;from:Hub;to:Place;service:Service;name:string;line:string;fare:number;platform:string}
export const places:Record<Place,string>={tokyo:'Tokyo · Gare centrale',kyoto:'Kyoto · Gare centrale',kamakura:'Kamakura · Le sentier des temples',kawaguchiko:'Kawaguchiko · Au pied du Fuji',arashiyama:'Arashiyama · Le chemin des bambous'};
export const routes:Route[]=[
{id:'tokyo-kyoto',from:'tokyo',to:'kyoto',service:'shinkansen',name:'KYOTO / 京都',line:'Tokaido Shinkansen',fare:14000,platform:'QUAI 19'},
{id:'kyoto-tokyo',from:'kyoto',to:'tokyo',service:'shinkansen',name:'TOKYO / 東京',line:'Tokaido Shinkansen',fare:14000,platform:'QUAI 11'},
{id:'tokyo-kamakura',from:'tokyo',to:'kamakura',service:'local',name:'KAMAKURA / 鎌倉',line:'Ligne Yokosuka',fare:950,platform:'QUAI 3'},
{id:'tokyo-fuji',from:'tokyo',to:'kawaguchiko',service:'local',name:'KAWAGUCHIKO / 河口湖',line:'Excursion Fuji · correspondances',fare:2500,platform:'QUAI 3'},
{id:'kyoto-arashiyama',from:'kyoto',to:'arashiyama',service:'local',name:'ARASHIYAMA / 嵐山',line:'Ligne Sagano',fare:240,platform:'QUAI 33'},
];
export const isHub=(place:Place):place is Hub=>place==='tokyo'||place==='kyoto';
export const returnHub=(place:Place):Hub=>place==='arashiyama'?'kyoto':'tokyo';

// Fictional platform assignments kept stable so signs, tickets and staff agree.
export const platformFor=(hub:Hub,service:Service)=>routes.find(r=>r.from===hub&&r.service===service)!.platform;
