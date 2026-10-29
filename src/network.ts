import { linesAt, railLines, stopNames, type RailLine } from './rail';

import { shinkansenFare } from './fares';

/** A station, by id (stations): every stop of a local line in rail.ts is one, all laid out alike. */
export type Hub=string;
/** Beyond the stations: an exit's own map, the street outside (`town`), the corridor behind a station's gates with the stairs up to its platforms
 * (which station and gates: `Journey.gateway`), a platform, and the traveller's home: the lane from the street outside its station (`home-street`) and the apartment at its end. */
export type Place=Hub|'kamakura-trail'|'arashiyama'|'town'|'corridor'|'platform'|'home-street'|'apartment';
export type Side='west'|'east';
/** The konbini chains: the shop by a station's street is the same for all, only its sign differs (see makeTown). */
export type Konbini='seven'|'family'|'lawson';
const hash=(id:string)=>[...id].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
/** Each station's konbini, picked once and for all from its id. */
export const konbiniFor=(id:string)=>(['seven','family','lawson'] as const)[hash(id)%3];
export type Service='shinkansen'|'local';
/** A Shinkansen ticket bookable at a station's machines, on one of the lines of rail.ts (`lineId`, whose names and colour it carries: `ja` and `color` draw it on the station's board),
 * leaving from `platform`, the track at the station whose trains run its way (see runOf in platform.ts). Local trips are fare tickets (fares.ts). */
export interface Route {id:string;from:Hub;to:Hub;service:Service;name:string;lineId:string;line:string;ja:string;color:string;fare:number;platform:string}
/** The places that are not stations, by name. */
export const places:Record<string,string>={'kamakura-trail':'Kamakura · The temple trail',arashiyama:'Arashiyama · The bamboo path',town:'Outside the station',corridor:'To the platforms',platform:'On the platform','home-street':'Higashi-Nakano · The way home',apartment:'Higashi-Nakano · Home'};
/** Where the traveller lives: the street outside this station's exit has a lane at its left end (the 東中野一丁目 sign) to the home street, the apartment at its end. */
export const home:{hub:Hub;side:Side}={hub:'higashi-nakano',side:'west'};
export const isHub=(place:Place):place is Hub=>place in stations;

/** The stations, all laid out alike (see art.ts and hall-scene.ts): what tells them apart is their name, accent colour, exits (`west` and `east`: their name on the signs and
 * what lies that way; empty for a plain 西口 / 東口), and the far right of the concourse, the Shinkansen transfer gates where the station has a Shinkansen platform, a NewDays shop otherwise.
 * An exit listed in `maps` leads to that place's own map; every other one to the generic street outside the station (`town`).
 * `tracks` numbers the two tracks of each line stopping there (rail.ts, by id), lines of one colour sharing a pair, and the routes leave from them; lines sharing a pair share the island platform. */
export interface Station {id:Hub;ja:string;en:string;accent:string;west:[string,string];east:[string,string];maps?:Partial<Record<Side,Place>>;tracks:Record<string,[number,number]>}
/** What sets some stations apart: names for their exits, real-looking track numbers, an exit with its own map. */
const known:Record<string,Partial<Station>>={
  東京:{accent:'#b66c51',west:['Marunouchi / Bus','Marunouchi and the buses'],east:['Yaesu / Taxi','Yaesu and the taxis'],
    tracks:{'chuo-rapid':[1,2],'keihin-tohoku':[3,4],yamanote:[5,6],utsunomiya:[7,8],takasaki:[7,8],tokaido:[9,10],joban:[11,12],'yokosuka-sobu':[13,14],keiyo:[15,16],'tokaido-shinkansen':[18,19],'tohoku-shinkansen':[20,21]}},
  京都:{accent:'#608776',west:['Hachijo / Bus','Hachijo and the buses'],east:['Karasuma / Taxi','Karasuma and the taxis'],
    tracks:{'biwako-kyoto':[4,5],kosei:[6,7],nara:[8,9],sagano:[32,33],'tokaido-shinkansen':[11,12]}},
  鎌倉:{accent:'#3f6f9e',west:['Onari / Enoden','Onari-dori and the Enoden line'],east:['Komachi / Temples','Komachi-dori and the temples'],maps:{east:'kamakura-trail'}},
  嵯峨嵐山:{east:['Bamboo path','the bamboo path and the river'],maps:{east:'arashiyama'}},
};
const accents=['#b66c51','#608776','#3f6f9e','#8a6a9e','#9e7b3f','#5c7f8f','#a0565f','#6b7f4a'];
/** The tracks of a station without its own numbering: a pair for each line in board order, local lines first, lines of one colour (Utsunomiya and Takasaki) sharing theirs. */
function numberTracks(ja:string){
  const tracks:Record<string,[number,number]>={},pairs=new Map<string,[number,number]>();
  for(const line of [...linesAt(ja,'local'),...linesAt(ja,'shinkansen')]){const key=line.service+line.color;if(!pairs.has(key))pairs.set(key,[pairs.size*2+1,pairs.size*2+2]);tracks[line.id]=pairs.get(key)!}
  return tracks;
}
export const stations:Record<Hub,Station>=Object.fromEntries([...new Set(railLines.filter(line=>line.service==='local').flatMap(line=>line.stops))].map(ja=>{
  const en=stopNames[ja],id=en.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  return [id,{id,ja,en,accent:accents[hash(id)%accents.length],west:['',''],east:['',''],tracks:numberTracks(ja),...known[ja]} as Station];
}));
const byJa=new Map(Object.values(stations).map(station=>[station.ja,station.id]));
/** The station of a stop (Japanese name), if the game has it: every stop of a local line. */
export const stationAt=(ja:string):Hub|undefined=>byJa.get(ja);
/** The station an exit's own map lies outside. */
export const stationOf=(place:Place):Hub=>Object.values(stations).find(station=>Object.values(station.maps??{}).includes(place))!.id;
/** The lines through a station as its board lists them where it has no fare map: each line's name and colour, and the end of the line it runs to (the other end at a terminus). */
export const boardLines=(hub:Hub)=>linesAt(stations[hub].ja).map(line=>{const ja=stations[hub].ja,end=line.loop?line.stops[(line.stops.indexOf(ja)+line.stops.length/2)|0]:line.stops.at(-1)===ja?line.stops[0]:line.stops.at(-1)!;return {ja:line.ja,line:line.en,color:line.color,name:`${stopNames[end]} / ${end}`}});
/** The Shinkansen tickets: between every two stations on a Shinkansen line, from the track running the way of the destination. */
export const routes:Route[]=railLines.filter(line=>line.service==='shinkansen').flatMap(line=>{
  const at=line.stops.filter(ja=>stationAt(ja));
  return at.flatMap((from,i)=>at.flatMap((to,j)=>{
    if(i===j)return [];const a=stations[stationAt(from)!],b=stations[stationAt(to)!];
    return [{id:`${a.id}-${b.id}`,from:a.id,to:b.id,service:'shinkansen' as const,name:`${b.en.toUpperCase()} / ${b.ja}`,lineId:line.id,line:line.en,ja:line.ja,color:line.color,fare:shinkansenFare(line,from,to),platform:`TRACK ${a.tracks[line.id][j>i?1:0]}`}];
  }));
});

/** An island platform behind a hub's gates (the central gates for local lines, the transfer gates for the Shinkansen), reached from the corridor by a staircase on
 * each side (makeCorridor in art.ts), the left one to its first track, the right one to its second; the lines stopping there, from rail.ts. */
export interface Platform {tracks:[number,number];lines:RailLine[]}
/** The platforms behind a hub's gates, the lowest tracks first: one for each pair of tracks of the lines through the station. */
export function platformsAt(hub:Hub,service:Service):Platform[]{
  const station=stations[hub],out=new Map<string,Platform>();
  for(const line of linesAt(station.ja,service)){
    const tracks=station.tracks[line.id];if(!tracks)throw Error(`${station.en}: no tracks for the ${line.en}`);
    const key=tracks.join('·');if(!out.has(key))out.set(key,{tracks,lines:[]});out.get(key)!.lines.push(line);
  }
  return [...out.values()].sort((a,b)=>a.tracks[0]-b.tracks[0]);
}
/** The tracks behind a hub's gates, first to last, as the signs over the gates show them. */
export const tracksFor=(hub:Hub,service:Service,dash='〜')=>{const tracks=platformsAt(hub,service).flatMap(platform=>platform.tracks);return `${Math.min(...tracks)}${dash}${Math.max(...tracks)}`};
/** The track a route leaves from. */
export const trackOf=(route:Route)=>Number(route.platform.replace(/\D/g,''));
export const hasShinkansen=(hub:Hub)=>platformsAt(hub,'shinkansen').length>0;
// Every route leaves from one of its line's tracks at its station.
for(const route of routes)if(!stations[route.from].tracks[route.lineId]?.includes(trackOf(route)))throw Error(`Route ${route.id}: ${route.platform} is not a track of the ${route.line} at ${stations[route.from].en}`);
/** The five machines of the bank, left to right: the last sells Shinkansen tickets where there is a Shinkansen. */
export const machineKinds=(hub:Hub)=>['local','charge','local','charge',hasShinkansen(hub)?'shinkansen':'local'] as const;
