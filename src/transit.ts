import { fareBetween, localMinutes, shinkansenFare, shinkansenMinutes } from './fares';
import { busLines, linesAt, stopNames, type RailLine } from './rail';
import { exitName, inKyoto, stationAt, stations, type Side } from './network';
import { runOf } from './platform';
import { sights } from './sights';

/** The phone's Trains app (phone.ts): a station or place looked up by its English or Japanese name, then the trains to it from where the traveller is. */
/** What can be looked up: a station (Japanese name) or a place of `sights`, with the stations it is reached from. */
export interface Entry {kind:'station'|'place';id:string;ja:string;en:string;region:string;lines:RailLine[];ways:Way[]}
/** How a place is reached from a station: on foot, by bus (its number), or out of an exit with its own map. */
export interface Way {station:string;how:'walk'|'bus'|'exit';bus?:string;exit?:string;minutes:number}
export const plain=(ja:string)=>ja.replace('​','');
const region=(ja:string)=>{const hub=stationAt(ja);return hub&&inKyoto(hub)?'Kansai':'Kanto'};
const fold=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9぀-ヿ一-鿿]/g,'');
const exitOf=(id:string)=>{for(const station of Object.values(stations))for(const side of ['west','east'] as Side[])if(station.maps?.[side]===id)return {station:station.ja,exit:exitName(station.id,side)[1]};return null};
export const entries:Entry[]=[
  ...sights.map((sight):Entry=>{
    const out=exitOf(sight.id),ways:Way[]=out?[{station:out.station,how:'exit',exit:out.exit,minutes:0}]:[
      ...(sight.walk??[]).map((station):Way=>({station,how:'walk',minutes:10})),
      ...Object.entries(sight.foot??{}).map(([station,km]):Way=>{const bus=busLines.find(bus=>bus.stops.includes(station)&&bus.sights.some(([,en])=>en===sight.en));return bus?{station,how:'bus',bus:bus.no,minutes:Math.round(5+km*3)}:{station,how:'walk',minutes:Math.round(km*12)}}),
    ];
    return {kind:'place',id:sight.id,ja:sight.ja,en:sight.en,region:ways[0]?region(ways[0].station):'',lines:[],ways};
  }).filter(entry=>entry.ways.length),
  ...Object.values(stations).map((station):Entry=>({kind:'station',id:station.id,ja:station.ja,en:station.en,region:region(station.ja),lines:linesAt(station.ja),ways:[]})).sort((a,b)=>a.en.localeCompare(b.en)),
];
/** The entries matching what was typed, those whose name starts with it first; everything (places, then stations A to Z) for nothing typed. */
export function lookUp(query:string){
  const q=fold(query.trim()),raw=query.trim();if(!q&&!raw)return entries;
  const hits=entries.filter(entry=>fold(entry.en).includes(q)&&q||plain(entry.ja).includes(raw)&&raw);
  const starts=(entry:Entry)=>fold(entry.en).startsWith(q)&&q||plain(entry.ja).startsWith(raw)&&raw?0:1;
  return hits.sort((a,b)=>starts(a)-starts(b));
}
/** One train of a trip: its line, where it is boarded and left, which way it runs (what its trains show) and from which track. */
export interface Leg {line:RailLine;from:string;to:string;stops:number;toward:string;towardEn:string;tracks:number[];minutes:number}
/** A ticket the trip needs: a fare ticket for each run of local trains (changes between them are free), a Shinkansen ticket for each Shinkansen. */
export interface Fare {from:string;to:string;fare:number;shinkansen:boolean}
export interface Trip {legs:Leg[];fares:Fare[];minutes:number}
/** The trains from one station to another (Japanese names): fewest changes, then fewest stops, local lines rather than the Shinkansen wherever they go; null where nothing goes. */
export function tripBetween(from:string,to:string):Trip|null{
  if(from===to)return {legs:[],fares:[],minutes:0};
  type Node={line:RailLine;i:number};const key=(n:Node)=>n.line.id+'|'+n.i,boarding=(line:RailLine)=>line.service==='shinkansen'?300:0;
  const cost=new Map<string,number>(),back=new Map<string,Node|null>(),open:[number,Node][]=[];
  const reach=(n:Node,c:number,prev:Node|null)=>{const k=key(n);if(c<(cost.get(k)??Infinity)){cost.set(k,c);back.set(k,prev);open.push([c,n])}};
  for(const line of linesAt(from))reach({line,i:line.stops.indexOf(from)},boarding(line),null);
  let end:Node|null=null;
  while(open.length){
    open.sort((a,b)=>a[0]-b[0]);const [c,n]=open.shift()!;if(c>cost.get(key(n))!)continue;
    const at=n.line.stops[n.i];if(at===to){end=n;break}
    const len=n.line.stops.length;
    for(const d of [1,-1]){const j=n.i+d;if(n.line.loop)reach({line:n.line,i:(j+len)%len},c+1,n);else if(j>=0&&j<len)reach({line:n.line,i:j},c+1,n)}
    for(const line of linesAt(at))if(line!==n.line)reach({line,i:line.stops.indexOf(at)},c+100+boarding(line),n);
  }
  if(!end)return null;
  const path:Node[]=[];for(let n:Node|null=end;n;n=back.get(key(n))??null)path.unshift(n);
  const legs:Leg[]=[];
  for(let k=0;k<path.length-1;k++){
    const a=path[k],b=path[k+1];if(a.line!==b.line)continue;
    const last=legs[legs.length-1];if(last&&last.line===a.line&&last.to===a.line.stops[a.i]){last.to=b.line.stops[b.i];last.stops++;continue}
    const len=a.line.stops.length,dir=(a.i+1)%len===b.i?1:-1,station=a.line.stops[a.i],run=runOf(a.line,station,dir>0?1:0),pair=stations[stationAt(station)??'']?.tracks[a.line.id];
    const terminus=!a.line.loop&&(a.i===0||a.i===len-1);
    legs.push({line:a.line,from:station,to:b.line.stops[b.i],stops:1,toward:run.dest,towardEn:run.destEn,tracks:pair?terminus&&a.line.service==='local'?[...pair]:[pair[dir>0?1:0]]:[],minutes:0});
  }
  for(const leg of legs)leg.minutes=leg.line.service==='shinkansen'?shinkansenMinutes(leg.line,leg.from,leg.to):localMinutes(leg.from,leg.to,leg.stops);
  const fares:Fare[]=[];
  for(const leg of legs){
    const last=fares[fares.length-1],shinkansen=leg.line.service==='shinkansen';
    if(!shinkansen&&last&&!last.shinkansen){last.to=leg.to;last.fare=fareBetween(last.from,last.to)??last.fare}
    else fares.push({from:leg.from,to:leg.to,shinkansen,fare:shinkansen?shinkansenFare(leg.line,leg.from,leg.to):fareBetween(leg.from,leg.to)??0});
  }
  return {legs,fares,minutes:legs.reduce((n,leg)=>n+leg.minutes,0)+4*(legs.length-1)};
}
/** A place's ways in, the quickest from `from` first (the trains and the last stretch), those no train reaches left out. */
export const waysFrom=(from:string,entry:Entry)=>entry.ways.flatMap(way=>{const trip=tripBetween(from,way.station);return trip?[{way,trip,minutes:trip.minutes+way.minutes}]:[]}).sort((a,b)=>a.minutes-b.minutes);
export const enOf=(ja:string)=>stopNames[ja]??ja;
