import { scenic, sightOfRoad } from './sights';
import { places, platformsAt, routes, stations, type Hub, type Place, type Service, type Side } from './network';
import type { TravelTicket } from './ticket-machine';
import { freshNeeds, type Needs } from './needs';
import { newPhone, readPhone, type PhoneState } from './phone';
import type { Mode } from './story';

/** Where the traveller stands: the place and position in scene px, the station walked out of on the street (`town`) or an exit's map,
 * and in a corridor, the station and gates it lies behind. */
export interface Spot {place:Place;x:number;y:number;outside:{from:Hub;side:Side}|null;gate?:{hub:Hub;service:Service}|null}
/** The journey kept between sessions under one versioned key: the tickets carried, where the traveller stands, the time on the journey's clock (clock.ts), the time the alarm is set to (alarm.ts), the phone (phone.ts), what was bought at the konbini (names, Japanese and English) hunger and thirst (needs.ts) and, in the story mode (story.ts), the chapter it is at;
 * more progress joins it as new fields. */
export interface Save {tickets:TravelTicket[];at?:Spot;clock?:number;alarm?:number;phone:PhoneState;groceries:[string,string][];needs:Needs;story?:number}
const key='yorimichi-save',version=1;
// Only tickets for routes and stations that still exist, and a spot whose place (and the station it needs) still exists; a save from another version starts afresh.
const valid=(at:Spot|undefined)=>!!at&&(at.place in places||at.place in stations)&&Number.isFinite(at.x)&&Number.isFinite(at.y)&&(!at.outside||at.outside.from in stations)
  &&(!['town','home-street','kyoto-lane','kyoto-house','kyoto-upstairs','apartment'].includes(at.place)&&!scenic(at.place)&&!sightOfRoad(at.place)||!!at.outside)&&(at.place!=='corridor'||!!at.gate&&at.gate.hub in stations&&platformsAt(at.gate.hub,at.gate.service).length>0)&&at.place!=='platform';
export function loadSave():Save{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.version===version){
    // A ticket punched before punches named their station was punched at its own.
    const tickets=(Array.isArray(saved.tickets)?saved.tickets as TravelTicket[]:[]).filter(t=>t.from in stations&&(t.kind!=='route'||routes.some(route=>route.id===t.id)));for(const t of tickets)if((t.punched as unknown)===true)t.punched=t.from;
    return {tickets,at:valid(saved.at)?saved.at:undefined,clock:Number.isFinite(saved.clock)?saved.clock:undefined,alarm:Number.isFinite(saved.alarm)?saved.alarm:undefined,phone:readPhone(saved.phone,at=>at in stations||!!sightOfRoad(at)),groceries:Array.isArray(saved.groceries)?saved.groceries:[],needs:Number.isFinite(saved.needs?.hunger)&&Number.isFinite(saved.needs?.thirst)?saved.needs:freshNeeds(),story:Number.isInteger(saved.story)?saved.story:undefined};
  }}catch{}
  return {tickets:[],phone:newPhone(),groceries:[],needs:freshNeeds()};
}
const readers:(()=>void)[]=[];
/** What a module read from `localStorage` once at load and keeps in memory, read again (`reread`) whenever the journey under it changes: `eraseSlot` and `useSlot` run after every module has loaded, without a reload. */
export const onErase=(reread:()=>void)=>{readers.push(reread)};
/** The journeys kept side by side, one for each way to play (story.ts `Mode`): the one in play lives under the game's own keys, the other packed under `yorimichi-slot-<mode>`.
 * `yorimichi-mode` names the one in play; it and `yorimichi-story-pace` are the browser's, not a journey's. Every other `yorimichi-` key belongs to the journey. */
const shared=(name:string)=>name==='yorimichi-mode'||name==='yorimichi-story-pace'||name.startsWith('yorimichi-slot-');
const own=()=>Object.keys(localStorage).filter(name=>name.startsWith('yorimichi-')&&!shared(name));
const live=():Mode=>{try{return localStorage.getItem('yorimichi-mode')==='story'?'story':'explore'}catch{return 'explore'}};
const packed=(mode:Mode):Record<string,string>=>{try{return JSON.parse(localStorage.getItem('yorimichi-slot-'+mode)||'{}')??{}}catch{return {}}};
/** Whether a journey is kept for that way to play. */
export const hasSave=(mode:Mode)=>{try{return mode===live()?localStorage.getItem(key)!==null:key in packed(mode)}catch{return false}};
/** Puts that way to play's journey in play, packing the other away. */
export function useSlot(mode:Mode){
  const from=live();if(mode===from)return;
  try{
    localStorage.setItem('yorimichi-slot-'+from,JSON.stringify(Object.fromEntries(own().map(name=>[name,localStorage.getItem(name)!]))));
    for(const name of own())localStorage.removeItem(name);
    for(const [name,value] of Object.entries(packed(mode)))localStorage.setItem(name,value);
    localStorage.removeItem('yorimichi-slot-'+mode);localStorage.setItem('yorimichi-mode',mode);
  }catch{}
  for(const reread of readers)reread();
}
/** The journey in play, gone: where the traveller is, wallet, bank, memories, scratch cards and machines' trays. The other way to play's journey is kept. */
export const eraseSlot=()=>{for(const name of own())localStorage.removeItem(name);for(const reread of readers)reread()};
export const writeSave=(save:Save)=>{try{localStorage.setItem(key,JSON.stringify({version,...save}))}catch{}};
