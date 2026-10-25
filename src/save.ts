import { places, routes, stations, type Hub, type Place, type Side } from './network';
import type { TravelTicket } from './ticket-machine';
import { tokyoStations } from './tokyo-fares';

/** Where the traveller stands: the place and position in scene px, the station walked out of on the street (`town`) or an exit's map, and the fare station of the JR stop. */
export interface Spot {place:Place;x:number;y:number;outside:{from:Hub|'jr-stop';side:Side}|null;station:string|null}
/** The journey kept between sessions under one versioned key: the tickets carried and where the traveller stands; more progress joins it as new fields. */
export interface Save {tickets:TravelTicket[];at?:Spot}
const key='yorimichi-save',version=1;
// Only tickets for routes that still exist, and a spot whose place (and the station it needs) still exists; a save from another version starts afresh.
const valid=(at:Spot|undefined)=>!!at&&at.place in places&&Number.isFinite(at.x)&&Number.isFinite(at.y)&&(!at.outside||at.outside.from==='jr-stop'||at.outside.from in stations)
  &&(at.place!=='town'||!!at.outside)&&(at.place!=='jr-stop'&&at.outside?.from!=='jr-stop'||tokyoStations.some(station=>station.id===at.station));
export function loadSave():Save{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===version)return {tickets:(Array.isArray(saved.tickets)?saved.tickets as TravelTicket[]:[]).filter(t=>t.kind==='fare'||routes.some(route=>route.id===t.id)),at:valid(saved.at)?saved.at:undefined};}catch{}
  return {tickets:[]};
}
export const writeSave=(save:Save)=>{try{localStorage.setItem(key,JSON.stringify({version,...save}))}catch{}};
