import { places, platformsAt, routes, stations, type Hub, type Place, type Service, type Side } from './network';
import type { TravelTicket } from './ticket-machine';
import { newPhone, readPhone, type PhoneState } from './phone';

/** Where the traveller stands: the place and position in scene px, the station walked out of on the street (`town`) or an exit's map,
 * and in a corridor, the station and gates it lies behind. */
export interface Spot {place:Place;x:number;y:number;outside:{from:Hub;side:Side}|null;gate?:{hub:Hub;service:Service}|null}
/** The journey kept between sessions under one versioned key: the tickets carried, where the traveller stands, the time on the journey's clock (clock.ts) and the phone (phone.ts);
 * more progress joins it as new fields. */
export interface Save {tickets:TravelTicket[];at?:Spot;clock?:number;phone:PhoneState}
const key='yorimichi-save',version=1;
// Only tickets for routes and stations that still exist, and a spot whose place (and the station it needs) still exists; a save from another version starts afresh.
const valid=(at:Spot|undefined)=>!!at&&(at.place in places||at.place in stations)&&Number.isFinite(at.x)&&Number.isFinite(at.y)&&(!at.outside||at.outside.from in stations)
  &&(at.place!=='town'&&at.place!=='kamakura-trail'&&at.place!=='arashiyama'||!!at.outside)&&(at.place!=='corridor'||!!at.gate&&at.gate.hub in stations&&platformsAt(at.gate.hub,at.gate.service).length>0)&&at.place!=='platform';
export function loadSave():Save{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===version){
    // A ticket punched before punches named their station was punched at its own.
    const tickets=(Array.isArray(saved.tickets)?saved.tickets as TravelTicket[]:[]).filter(t=>t.from in stations&&(t.kind!=='route'||routes.some(route=>route.id===t.id)));for(const t of tickets)if((t.punched as unknown)===true)t.punched=t.from;
    return {tickets,at:valid(saved.at)?saved.at:undefined,clock:Number.isFinite(saved.clock)?saved.clock:undefined,phone:readPhone(saved.phone,hub=>hub in stations)};
  }}catch{}
  return {tickets:[],phone:newPhone()};
}
export const writeSave=(save:Save)=>{try{localStorage.setItem(key,JSON.stringify({version,...save}))}catch{}};
