import { platformsAt, stationAt, type Hub, type Platform, type Service } from './network';
import { stopNames, type RailLine } from './rail';

/** Which way the trains on one track of a platform run, and what they show: the first track of a pair runs towards the line's first stop (on the Yamanote loop, 外回り),
 * the second towards its last (内回り); at a terminus both leave the only way there is (`starts`: the trains come in from that side too, and turn back). `ahead` lists the stops
 * still to come, in order; `dir` is the way along `stops`. */
export interface Run {dir:1|-1;ahead:string[];dest:string;destEn:string;starts?:boolean}
export function runOf(line:RailLine,station:string,track:0|1):Run{
  const i=line.stops.indexOf(station),n=line.stops.length;
  if(line.loop){
    const dir=track?1:-1,ahead=Array.from({length:n-1},(_,k)=>line.stops[(i+dir*(k+1)+n)%n]),via=[ahead[Math.round((n-1)/6)],ahead[Math.round((n-1)/3)]];
    return {dir,ahead,dest:`${dir<0?'外回り':'内回り'} ${via.join('・')}方面`,destEn:`${dir<0?'Outer':'Inner'} loop, ${via.map(stopEn).join(' and ')}`};
  }
  // At a terminus, both tracks' trains come in and leave on the line's side.
  const starts=i===0||i===n-1,dir:1|-1=i===0?1:i===n-1?-1:track?1:-1;
  const ahead=dir>0?line.stops.slice(i+1):line.stops.slice(0,i).reverse(),last=ahead[ahead.length-1];return {dir,ahead,dest:last,destEn:stopEn(last),starts};
}
/** The station getting off at a stop leads to (its corridor behind the gates), for the stops the game has: every stop of a local line (network.ts). */
export const alightAt=(ja:string):Hub|null=>stationAt(ja)??null;
/** A stop's English name (rail.ts). */
export const stopEn=(ja:string)=>stopNames[ja]??ja;
/** A platform seen from above (`platform` in main.ts): platform `i` behind a station's gates. `track` is the side the traveller came up on, or the track of the train
 * `arriving` with them on board. */
export interface Deck {ja:string;en:string;hub:Hub;i:number;service:Service;platform:Platform;track:0|1;arriving?:RailLine}
/** The platform of `line` at the station `ja`, the traveller on `track`. */
export function deckFor(ja:string,line:RailLine,track:0|1):Deck{
  const hub=stationAt(ja);if(!hub)throw Error(`No station at ${ja}`);
  const platforms=platformsAt(hub,line.service),i=platforms.findIndex(platform=>platform.lines.includes(line));
  return {ja,en:stopEn(ja),hub,i,service:line.service,track,platform:platforms[i]};
}
