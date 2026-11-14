import Phaser from 'phaser';
import { connectedPad } from './pad';
import './style.css';
import { hudLayout, paintHud, makeSignals, makeTraffic, signalSize, trafficColours, apartmentProps, apartmentSolids, apartmentWindows, areaMapFace, areaMapWindow, corridorLayout, kyotoSolids, kyotoWindows, homeLights, homeStreetWidth, homeWindows, laneOuter, laneWindows, doorMarks, busStop, makeBus, binShape, carAt, makeArt, makeAreaMap, makeSightRoad, makeTimetable, makeBoard, makeCorridor, makePoles, makeHub, makePlatform, makeTown, makeTrain, boardHeight, doorSize, gantryHeight, trainHeight, trainRoof, trainTop, platformBoards, platformWidth, routeBoard, stationSign, townLights, townWindows, trainLayout } from './art';
import { vivid } from './palette';
import { alightAt, deckFor, lineAt, onTimetable, runOf, stopEn, type Deck, type Run } from './platform';
import { MachineHall } from './machine-hall';
import { TicketGate } from './ticket-gate';
import { openInventory } from './inventory';
import { Atm } from './atm';
import { Shop, type Chain } from './konbini';
import { Vending } from './vending';
import { Cat } from './cat';
import { Pigeons } from './pigeons';
import { busiest, crowdAt, strollers, type Stage } from './crowd';
import type { Item, VendorId } from './goods';
import { playFlight } from './flight';
import { playRopeway } from './ropeway';
import { wakeWheel, type WakeWheel } from './alarm';
import { Phone, askLorenzo, callLorenzo, contacts, walkTime, type Contact } from './phone';
import { loadSave, writeSave } from './save';
import { portraitTexture } from './portraits';
import { showTitle } from './title';
import { openPauseMenu } from './pause-menu';
import { debugAllowed, openTeleport, type Destination } from './teleport';
import { TicketMachine, fareDue, trayKey, type TravelTicket } from './ticket-machine';
import { areaAround, kmApart, onMap, spotOf } from './city-maps';
import { fareBetween, kmBetween, localMinutes, shinkansenMinutes } from './fares';
import { addMinutes, clockMs, darkness, dayLabel, dayOf, hhmm, inService, minuteMs, minuteOfDay, minutes, opens, hold, setTimeOfDay, skipTo, startClock, stationOpen, tick, trainsRun, wake } from './clock';
import { openDepartures, onTokyoBoard, tokyoStations } from './tokyo-fares';
import { carried, feed, filling, freshNeeds, needFactor, spend } from './needs';
import { goodNamed } from './goods';
import { coinCount, loadWallet, machineSound, walkFactor, walletTotal } from './wallet';

import { looks, type Figure } from './people';
import { BusFare } from './bus-fare';
import { PhotoBook } from './photo-book';
import { StampBook } from './stamp-book';
import { avenueOf, cameraBox, dressRoad, exitBox, layoutOf, makeScene, postsOf } from './sight-scenes';
import { chapters, loadMode, loadPace, savePace, speeds, storyEnd, storyIntro, type Pace } from './story';
import { memoryPages, roadTo, scenic, sightOf, sightOfRoad, sights, walkFrom, type Sight } from './sights';
import { routes, exitName, inKyoto, home, kyotoHome, places, konbiniFor, isHub, hasShinkansen, platformsAt, stationAt, stationOf, stations, trackOf, tracksFor, type Hub, type Place, type Service, type Side } from './network';
import { busFare, busLines, connectionsAt, firstLegs, linesAt, railLine, stopNames, type Connection, type RailLine } from './rail';
// Highlight frames around the hotspots of nearby(), in scene pixels (art × 2), shown while the player is in range.
/** Where the traveller waits for the bus and gets off it: on the far pavement, by the stop's post. */
const busSpot=[790,506] as const;
const hotspotFrames:Record<string,[number,number,number,number]>={entrance:[396,176,188,96],walkBack:[0,272,96,90],staff:[0,130,124,92],ticket:[336,150,288,94],local:[124,132,136,100],shinkansen:[724,132,236,100],shop:[724,130,236,92],stamp:[276,200,68,90],westExit:[14,444,162,64],eastExit:[778,444,168,64],photo:[682,376,56,58],bus:[796,408,40,112],return:[96,336,116,58],'return-town':[332,176,296,96],areaMap:[228,208,84,84],atm:[868,204,48,66],konbini:[676,208,52,70],uber:[576,386,124,62],
  lane:[0,272,96,90],'return-home-street':[1336,196,104,200],home:[84,146,44,96],'home-kyoto-lane':[92,264,84,84],'return-kyoto-lane':[884,330,76,80],'konbini-kyoto-lane':[744,208,32,84],'return-apartment':[404,760,60,56],bed:[156,120,52,112],'return-kyoto-house':[56,630,84,44],upstairs:[644,412,84,148],downstairs:[644,300,84,160],bedE:[44,384,76,128],bedD:[356,384,68,128],bedC:[556,384,76,128],
  'vending-town-red':[780,266,42,58],'vending-town-blue':[824,266,42,58],'vending-home-red':[522,158,42,76],'vending-home-white':[476,158,42,76]};
// Where a click on a hotspot walks to when its frame's centre lies inside an obstacle, out of reach (the area map: the spot in front of it).
const approach:Record<string,[number,number]>={entrance:[480,296],stamp:[310,298],bus:[790,496],areaMap:[270,300],'vending-town-red':[801,336],'vending-town-blue':[845,336],'vending-home-red':[543,250],'vending-home-white':[497,250],'return-kyoto-lane':[880,322],'konbini-kyoto-lane':[760,314],upstairs:[686,590],downstairs:[686,270],bedE:[130,470],bedD:[334,470],bedC:[540,470]};
// The hotspots' silhouettes in art px (rectangles from art.ts, unioned), outlined a pixel wide: faintly always, lit when in reach.
const hotspotShapes:Record<string,[number,number,number,number][]>={entrance:[[198,88,84,48]],walkBack:[[1,140,44,13],[10,153,2,25]],staff:[[0,56,62,52]],ticket:[[170,76,140,44]],local:[[64,70,52,45]],shinkansen:[[370,70,96,45]],shop:[[362,52,118,56]],stamp:[[143,103,24,35]],westExit:[[8,231,68,24]],eastExit:[[390,231,68,24]],
  bus:[[400,206,16,12],[407,218,2,41]],photo:[[345,195,20,15],[348,192,7,3],[352,210,3,7]],return:[[49,171,58,16],[58,187,3,8]],
  'return-town':[[166,88,148,26],[176,114,128,6],[190,120,100,19]],areaMap:[[118,108,34,28],[118,136,2,8],[150,136,2,8]],atm:[[438,105,17,6],[440,110,13,22]],konbini:[[338,104,26,35]],uber:[...Array.from({length:7},(_,y):[number,number,number,number]=>[306-y,193+y,26+2*y,1]),[290,200,59,6],[288,206,62,10],[296,216,11,7],[331,216,11,7]],
  lane:[[1,140,44,13],[10,153,2,25]],'return-home-street':[[670,100,48,13],[692,113,2,6]],home:[[46,82,14,30],[48,74,10,6]],'home-kyoto-lane':[[48,135,37,37]],'return-kyoto-lane':[[444,168,34,13],[460,181,2,22]],'konbini-kyoto-lane':Array.from({length:16},(_,d):[number,number,number,number]=>[372+d,112-Math.round(d*1.5),1,28]),'return-apartment':[[206,402,26,6]],bed:[[78,60,26,56]],'return-kyoto-house':[[30,323,36,6]],upstairs:[[322,206,42,74]],downstairs:[[322,150,42,81]],bedE:[[24,196,30,60]],bedD:[[180,196,30,60]],bedC:[[280,196,30,60]],
  'vending-town-red':[[390,133,20,29]],'vending-town-blue':[[412,133,20,29]],'vending-home-red':[[261,79,21,35]],'vending-home-white':[[238,79,21,35]]};
/** The art pixels just outside a shape (4-neighbours, so the corners come out rounded), as [x, y] pairs. */
function outline(shape:[number,number,number,number][]){
  const inside=(x:number,y:number)=>shape.some(([l,t,w,h])=>x>=l&&x<l+w&&y>=t&&y<t+h),pixels:[number,number][]=[];
  const l=Math.min(...shape.map(s=>s[0]))-1,t=Math.min(...shape.map(s=>s[1]))-1,r=Math.max(...shape.map(s=>s[0]+s[2]))+1,b=Math.max(...shape.map(s=>s[1]+s[3]))+1;
  for(let y=t;y<b;y++)for(let x=l;x<r;x++)if(!inside(x,y)&&(inside(x-1,y)||inside(x+1,y)||inside(x,y-1)||inside(x,y+1)))pixels.push([x,y]);
  return pixels;
}
const outlines=Object.fromEntries(Object.entries(hotspotShapes).map(([spot,shape])=>[spot,outline(shape)]));
// The ticket hall in pixel art (HallPicture); ?hall=3d brings back the first-person three.js hall (HallScene), ?hall=voxel the same hall built of voxels (HallVoxels).
const hallParam=new URLSearchParams(location.search).get('hall'),hallView=hallParam==='3d'||hallParam==='voxel'?hallParam:'pixel';
// `off`: the track and door someone getting off a train is stepping away from, until past the queues' lanes.
type Step={x:number;y:number;alpha?:number;off?:[number,number]}|{wait:number;face:string;spot?:string};
// `queue`: the track, door mark and place (slot) a commuter waits at on a platform.
type Commuter={image:Phaser.GameObjects.Image;look:number;steps:Step[];speed:number;face?:string;bump?:number;queue?:[number,number,number];home?:{x:number;y:number};crossed?:number};
/** A train on one track of the platform, through its cycle: away (`gap`, until it pulls in to leave on time), arriving, doors open for those getting off (`alight`) then the queues (`board`),
 * closing, leaving. `due`: its time on the boards, when it leaves, in minutes on the journey's clock (clock.ts). `player`: the traveller arriving on board (`off`, to get off) or boarded (`on`),
 * the doors shutting at `wait` once they have chosen where to get off; `seated`, their reserved seat when they boarded the very train and car it is booked on (a rested ride: ride). */
type Train={track:0|1;line:RailLine;run:Run;due:number;phase:'gap'|'arrive'|'alight'|'board'|'close'|'leave';t:number;wait:number;tick:number;body:Phaser.GameObjects.Container;image:Phaser.GameObjects.Image;doors:Phaser.GameObjects.Rectangle[];player?:'off'|'on';to?:Deck;served?:number[];seated?:string};
/** A train's ms from pulling in to the earliest its doors close (arriving, those getting off, a moment's boarding): its time on the boards is when it leaves, that long after it starts pulling in. */
const dwell=6000+2600+4000;
/** How long (ms) someone getting off leaves the traveller standing in their way dazed. */
const stunned=1400;
/** What a ride in the reserved seat, on the train booked, puts back in hunger and thirst. */
const rested=20;
/** Lights at night, in scene px: x, y, radius, colour and strength. */
/** A light at night: x, y and radius in scene px, its colour, its strength, and how flat its pool lies on the ground (its height over its width, round when left out). */
type Lamp=[number,number,number,number,number?,number?];
/** The scramble's cycle (ms): the cars' green, all red, then the walkers' green to the end of the period. */
const signalPeriod=32000,carsGo=16000,allRed=2000,carTop=.24;
const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)],between=(a:number,b:number)=>a+Math.random()*(b-a);
/** Line names in English, as the prompts and dialogs give them: "Utsunomiya / Takasaki Line" for a shared platform. */
const lineNames=(lines:RailLine[],or=' / ')=>lines.length>1?lines.map(line=>line.en.replace(/ Line$/,'')).join(or)+(lines.every(line=>line.en.endsWith(' Line'))?' Line':''):lines[0]?.en??'';
type PadChoice=[Phaser.GameObjects.Rectangle,()=>void];
/** A connection icon's width, to fit its symbol and, on a bus, the little bus. */
const tagWidth=(tag:Connection)=>Math.max(14,tag.mark.length*7+4)+(tag.bus?11:0);
/** Where the strollers of a sight's street keep to, in art px: the pavement before the sight. */
const pavement:[number,number,number,number]=[20,142,440,50];
class Journey extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private sprite!:Phaser.GameObjects.Image;
  private facing='down';
  private world!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wheel:WakeWheel|null=null;
  private alarm=loadSave().alarm??wake;
  // Movement keys by physical position (KeyboardEvent.code): WASD on QWERTY, ZQSD on AZERTY, the same keys on JIS.
  private held=new Set<string>();
  // Hotspot clicked from afar: used as soon as the walk brings the player in range.
  private pending='';
  private place:Place='tokyo';
  // The tickets the traveller carries, bought one at a time; the gate on the way out keeps the one that went through on the way in (boarding uses it up where no gate waits, as at Arashiyama).
  // Saved whenever one is bought or used up (keep); the punched one stays punched only while the traveller is on the paid side (a corridor behind the gates, or a JR stop's platform).
  private tickets:TravelTicket[]=loadSave().tickets;
  // The station the traveller walked out of (to the generic street, `town`, or an exit's own map) and by which exit: the street's sign names it, and walking back in starts there.
  private outside:{from:Hub;side:Side}|null=null;
  // The hub and gates whose corridor (`corridor`) the traveller walked into; the ticket that went through is the punched one.
  private gateway:{hub:Hub;service:Service}|null=null;
  // The platform the traveller stands on (`platform`), its two trains, and the queues at its door marks (per track, per mark).
  private deck:Deck|null=null;
  private trains:Train[]=[];
  private queues:Commuter[][][]=[[],[]];
  // What hangs over the platform: the departure boards and their text (with its track in `track`).
  private overhead:Phaser.GameObjects.GameObject[]=[];
  // The door deliberately chosen by clicking a queue before arrival, a train door after arrival, or using E in its queue.
  private boardAt='';
  /** The track whose train the traveller just stepped off (arrived on, or stayed behind from): not boarding it again on their own until they move or it has left (-1: none). */
  private stayed=-1;
  // The world's height in scene px: the corridor is taller than the screen when the station has many lines, and scrolls with the traveller.
  private mapHeight=640;
  // And its width: the platform runs two screens long, and scrolls sideways.
  private mapWidth=960;
  private departures:{destroy:()=>void}|null=null;
  private bag:{destroy:()=>void;close:()=>void;step:(by:number)=>void;press:()=>void}|null=null;
  private hall:MachineHall|null=null;
  private gate:TicketGate|null=null;
  private atm:Atm|null=null;
  private shopView:Shop|null=null;
  private vendingView:Vending|null=null;
  private fareBox:BusFare|null=null;
  private machineId:string|null=null;
  private machine:TicketMachine|null=null;
  private modal:Phaser.GameObjects.Container|null=null;
  private direction={x:0,y:0};
  private path: {x:number,y:number}[]=[];
  private marker!: Phaser.GameObjects.Arc;
  private solids:Phaser.Geom.Rectangle[]=[];
  private prompt!:Phaser.GameObjects.Text;
  private glow!:Phaser.GameObjects.Graphics;
  // Gamepad buttons last frame (20/21: stick or d-pad up/down, for menu steps), so presses act once.
  private padPrev:boolean[]=[];
  private walk=0;
  private moving=false;
  // The people about here (gather, as many as the place ever holds; crowd.ts): each runs random trips (planTrip) as a queue of steps, or stands still facing `face`.
  private commuters:Commuter[]=[];
  // Machines and counters someone is using, so two commuters never share one.
  private spots=new Set<string>();
  // The machine the player stands at ('machine0'…): the one in front in the first-person hall (hallSpot), else the one stood before on the map.
  // Commuters never pick it, and one on the way there goes elsewhere (giveWay); one already using it finishes first.
  private playerSpot='';
  private hallSpot='';
  // Jostling: brushing past someone slows the walk for a moment (see update).
  private bump=1;
  // Ms left dazed, knocked by someone getting off: no walking, no boarding, stars over the head (`dizzy`).
  private stun=0;
  private dizzy!:Phaser.GameObjects.Graphics;
  // Only places that still exist: memories from removed trips (Kawaguchiko) are dropped, and the Kamakura one, kept before the station, is the temple trail's.
  private collected=new Set<string>((JSON.parse(localStorage.getItem('yorimichi-memories')||'[]') as string[]).map(place=>place==='kamakura'?'kamakura-trail':place).filter(place=>memoryPages.some(page=>page.id===place)));
  private wallet=loadWallet();
  // When the save was last written (keep): walking saves at most once a second, and once more on stopping.
  private kept=0;
  /** The top band's hovered button (-1: none) and the time it shows. */
  private hudHover=-1;
  private hudTime='';
  // Night (clock.ts): the scene multiplied by a dark blue out of doors, lightened where lamps shine (`shade`, redrawn each frame); over it, following the world, the hotspot outlines (`over`).
  private shade!:Phaser.GameObjects.RenderTexture;
  private over!:Phaser.GameObjects.Container;
  // The concourse's shutters, down while the station is closed: over the gates, the office, the machines and the shop, leaving the way through.
  private shutter:Phaser.GameObjects.Graphics|null=null;
  // How far down they are, from 0 (up) to 1: they roll with the opening hours (rollShutters).
  private rolled=0;
  // What glows by itself at night, over the shade (faded in with it): lit windows and signs.
  private neon:Phaser.GameObjects.Graphics|Phaser.GameObjects.Image|null=null;
  // The way home's sign in the street outside Higashi-Nakano's west exit, in front of the traveller behind it.
  private laneSign:Phaser.GameObjects.Image|null=null;
  // The apartment's windows, night over them as it falls outside.
  private pane:Phaser.GameObjects.Graphics|null=null;
  // The traveller's phone (phone.ts): its conversations and Lorenzo's trip, saved with the journey; taken out over the scene (`phoneUi`), and Lorenzo's flight while it is shown.
  private phone=loadSave().phone;
  private groceries=loadSave().groceries;
  private needs=loadSave().needs;
  /** The clock's time hunger and thirst have been counted up to. */
  private fedAt=0;
  /** How fast all that is carried lets the traveller walk (`refreshPurse`). */
  private burden=1;
  private needBars:Phaser.GameObjects.Rectangle[]=[];
  /** Round each need's icon, the red outline (its shape, a pixel wider every way) that pulses while it slows the walk. */
  private needGlows:Phaser.GameObjects.Container[]=[];
  /** This place's bin, if it has one: its foot in scene px. */
  private bin:[number,number]|null=null;
  private phoneUi:Phone|null=null;
  private flight:{skip:()=>void}|null=null;
  // When Lorenzo's next move is due (his OK, then his flight), in scene ms.
  private phoneDue=0;
  // A scene's `over` layer, kept above what its `people` sort among.
  private lifted:Phaser.GameObjects.Image|null=null;
  /** When the menu paused the game (the scene's `time.now`), 0 otherwise. */
  private pausedAt=0;
  // The phone in the HUD's corner and its badge of unread messages.
  private mini!:Phaser.GameObjects.Container;
  private badge!:Phaser.GameObjects.Container;
  private badgeText!:Phaser.GameObjects.Text;
  // Lorenzo's Uber in the street of the station he waits at (`parked` once it has pulled up).
  private car:Phaser.GameObjects.Image|null=null;
  private bus:Phaser.GameObjects.Image|null=null;
  private pigeons:Pigeons|null=null;
  private cat:Cat|null=null;
  // Set on restarting: nothing is saved again on the way out of the page.
  // The story mode (story.ts): the journey plays itself, chapter after chapter (`storyNext`), the player's own moves ignored; `chapter` is the one under way, saved.
  private story=loadMode()==='story';
  private chapter=loadSave().story??0;
  /** A ticket bought for the ride ahead; whether the chapter has just begun (its time of day still to set); when the director looks again; the last thing it walked to and how often, to cut short a walk that never gets there. */
  private storyTicket=false;private storyFresh=true;private storyIdle=0;private pace=loadPace();private storyHeld=true;private storyTry:[string,number]=['',0];
  constructor(){super('Journey')}
  create(){
    makeArt(this);vivid(this);startClock(loadSave().clock);this.fedAt=minutes();
    // A lamp's light: a disc fading out in steps, pixel-hard.
    {const t=this.textures.createCanvas('light',32,32)!,g=t.context;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-15.5,y-15.5)/16;if(d<1){g.fillStyle=`rgba(255,255,255,${Math.ceil((1-d)**2*8)/8})`;g.fillRect(x,y,1,1)}}t.refresh()}
    this.shade=this.add.renderTexture(0,0,960,640).setOrigin(0).setDepth(5).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);this.over=this.add.container(0,0).setDepth(6);
    // Nightfall once the frame has moved everything, the scroll included: earlier, the lights over the world would trail it by a frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE,()=>{if(this.player)this.nightfall()});
    this.input.addPointer(3);
    this.keys=this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown',(event:KeyboardEvent)=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code))this.held.add(event.code);else if(['KeyE','Space','Enter'].includes(event.code)&&!event.repeat){if(this.story&&!this.modal)this.storyToggle();else this.interact()}else if(this.modal?.getData('talk')&&event.code.startsWith('Arrow')&&!event.repeat){const c=this.modal;(c.getData('ring') as Phaser.GameObjects.Rectangle).setVisible(true);this.focusChoice(c,c.getData('focus')+(event.code==='ArrowLeft'||event.code==='ArrowUp'?-1:1))}else if(event.code==='KeyT'&&!event.repeat)this.debugTime();else if(event.code==='KeyG'&&!event.repeat&&debugAllowed)this.debugGo();else if(event.code==='KeyF'&&!event.repeat&&debugAllowed&&!this.modal){this.needs=freshNeeds();this.fedAt=minutes();this.keep()}else if(event.code==='KeyP'&&!event.repeat)this.openPhone();else if(event.code==='Escape'&&!event.repeat){if(!this.modal)this.menu();else (this.modal.getData('choices') as PadChoice[]|undefined)?.at(-1)?.[1]()}});
    this.input.keyboard!.on('keyup',(event:KeyboardEvent)=>this.held.delete(event.code));
    this.game.events.on('blur',()=>this.held.clear());
    // Back where the traveller last stood (waking up at home the first time: out of the apartment is the lane to Higashi-Nakano's west exit).
    const at=loadSave().at;this.outside=at?at.outside:null;this.gateway=at?.gate??null;
    // Only on the paid side does the ticket that took the traveller there stay punched: anywhere else, a reload gives it back.
    const paid=at?.place==='corridor',inside=paid&&this.tickets.some(ticket=>ticket.punched||ticket.kind==='adjust');if(!paid)for(const ticket of this.tickets)delete ticket.punched;
    if(at?.place==='corridor'&&!inside)this.loadPlace(this.gateway!.hub);else this.loadPlace(at?.place??stationAt('東京')!,at);
    // A new journey: just off the train from the airport.
    this.storySpeed();if(!at&&this.story){this.dialog(storyIntro.title,storyIntro.text);const c=this.modal;this.time.delayedCall(12000*this.time.timeScale,()=>{if(this.modal===c){c?.destroy(true);this.modal=null}})}
    else if(!at)this.dialog('Welcome to Tokyo','You have just arrived at Tokyo Station from Haneda Airport. Your rental is waiting for you in Higashi-Nakano: it is up to you to find your way there.\n\nYour travel journal is still empty. There are memories to find all over Japan: collect them all to fill it.');
    // Saved on each move (throttled in update) and when the page is hidden or closed.
    document.addEventListener('visibilitychange',()=>this.keep());addEventListener('pagehide',()=>this.keep());
    // A click or tap on a hotspot uses it, walking there first if needed; elsewhere it walks.
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer, objects:Phaser.GameObjects.GameObject[])=>{
      const x=pointer.x-this.world.x,y=pointer.y-this.world.y;if(this.modal||objects.length||pointer.y<=70||this.story)return;
      const spot=this.hotspotAt(x,y);this.boardAt='';
      if(spot&&spot===this.nearby()){this.interact();return}
      // A train's door: to the end of its queue.
      const frame=spot?this.frameFor(spot):null,end=spot.startsWith('door')?this.queueEnd(spot):null;this.pending=spot;
      const to=approach[this.shapeKey(spot)];this.navigate(end?end.x:to?to[0]:frame?frame[0]+frame[2]/2:x,end?end.y:to?to[1]:frame?frame[1]+frame[3]/2:y);
    });
    // Over an interactive object Phaser has set its cursor: setting the default now would wipe it.
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer,over:Phaser.GameObjects.GameObject[])=>{if(!over.some(object=>object.input?.cursor))this.input.setDefaultCursor(!this.modal&&this.hotspotAt(pointer.x-this.world.x,pointer.y-this.world.y)?'pointer':'')});
  }
  private rect(x:number,y:number,w:number,h:number,color:number,container=this.world){const r=this.add.rectangle(x,y,w,h,color).setOrigin(0);container.add(r);return r}
  private label(x:number,y:number,text:string,size=16,color='#283d3c',container=this.world){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,lineSpacing:5});container.add(t);return t}
  /** Builds `place`, the player at `at` if given and walkable (a reload), else at the way in. */
  private loadPlace(place:Place,at?:{x:number;y:number}){
    this.machine?.destroy();this.machine=null;this.hall?.destroy();this.hall=null;this.gate?.destroy();this.gate=null;this.atm?.destroy();this.atm=null;this.shopView?.destroy();this.shopView=null;this.vendingView?.destroy();this.vendingView=null;this.fareBox?.destroy();this.fareBox=null;this.bag?.destroy();this.bag=null;this.phoneUi?.destroy();this.phoneUi=null;this.machineId=null;this.departures?.destroy();this.departures=null;
    if(place!=='corridor'&&place!=='platform')this.gateway=null;
    // Back inside from the street or an exit's map: at that exit.
    const back=this.outside?.from===place?this.outside:null;if(isHub(place))this.outside=null;
    if(isHub(place))makeHub(this,place);
    this.modal?.destroy();this.modal=null;this.world?.destroy(true);this.hud?.destroy(true);this.over.removeAll(true);this.shutter=this.neon=this.pane=this.laneSign=null;this.car=this.bus=null;
    this.place=place;this.boardAt='';this.stayed=-1;this.overhead=[];this.commuters=[];this.spots.clear();this.playerSpot=this.hallSpot='';this.bump=1;this.stun=0;this.path=[];this.solids=[];this.direction={x:0,y:0};
    // The stations sit lower under the top band, leaving the back wall room for the station's name.
    if(scenic(place))makeScene(this,place);
    const road=sightOfRoad(place);const avenue=avenueOf(place);if(road)makeSightRoad(this,place,road,this.busesTo(road).length>0,avenue&&dressRoad(this,place));
    this.world=this.add.container(0,isHub(place)?24:0);this.hud=this.add.container(0,0).setDepth(10);
    this.world.add(this.add.image(0,0,place==='town'?this.townMap():place==='corridor'?this.corridorMap():place==='platform'?this.platformMap():'map-'+place).setOrigin(0));const size=layoutOf(place);this.mapWidth=place==='platform'?platformWidth*2:place==='home-street'?homeStreetWidth*2:(size?.width??480)*2;this.mapHeight=place==='corridor'?this.corridor().height*2:place==='apartment'?832:place==='kyoto-house'?680:avenue?avenue.height*2:(size?.height??320)*2;
    // The back wall, the ticket office and the gates beside it (set back on the left), the machine wall between its pillars, and the Shinkansen gates or the shop on the right.
    if(isHub(place))this.solids.push(new Phaser.Geom.Rectangle(0,70,960,64),new Phaser.Geom.Rectangle(0,70,124,146),new Phaser.Geom.Rectangle(124,70,140,162),new Phaser.Geom.Rectangle(260,70,464,180),new Phaser.Geom.Rectangle(724,70,236,hasShinkansen(place)?162:146),new Phaser.Geom.Rectangle(284,248,52,28));
    if(isHub(place)){this.shutter=this.add.graphics();this.world.add(this.shutter);this.rollShutters(true)}
    // A sight's own layout (sight-scenes.ts): its solids, what glows at night (its own picture, unshaded), and the sign and camera as hotspots, standing where its map draws them.
    if(scenic(place)){
      const {solids,lit,exit,camera}=layoutOf(place)!;this.solids.push(...solids.map(([x,y,w,h])=>new Phaser.Geom.Rectangle(x*2,y*2,w*2,h*2)));
      if(lit){this.neon=this.add.image(0,0,`map-${place}-lit`).setOrigin(0).setAlpha(0);this.over.add(this.neon)}
      const out=`return-${place}`,photo=`photo-${place}`;approach[out]=[(exit[0]+10)*2,(exit[1]+26)*2];approach[photo]=[(camera[0]+9)*2,(camera[1]+24)*2];hotspotFrames[out]=[(exit[0]-6)*2,(exit[1]-4)*2,108,92];hotspotShapes[out]=exitBox(exit);outlines[out]=outline(hotspotShapes[out]);hotspotFrames[photo]=[(camera[0]-8)*2,(camera[1]-6)*2,72,72];hotspotShapes[photo]=cameraBox(camera);outlines[photo]=outline(hotspotShapes[photo]);
      const second=layoutOf(place)!.second;if(second){const key=`photo2-${place}`,[x,y]=second.camera;approach[key]=[(x+9)*2,(y+28)*2];hotspotFrames[key]=[(x-8)*2,(y-6)*2,72,72];hotspotShapes[key]=cameraBox(second.camera);outlines[key]=outline(hotspotShapes[key])}
      const way=layoutOf(place)!.way;if(way)this.signpost(`way-${place}`,way.at);
    }
    // A sight's street lights its own signs, windows and lanterns (makeSightRoad).
    if(road&&!avenue){this.neon=this.add.image(0,0,`map-${place}-lit`).setOrigin(0).setAlpha(0);this.over.add(this.neon)}
    if(avenue){
      const {solids,lit,camera}=avenue,photo=`photo-${place}`;this.solids.push(...solids.map(([x,y,w,h])=>new Phaser.Geom.Rectangle(x*2,y*2,w*2,h*2)));
      if(lit){this.neon=this.add.image(0,0,`map-${place}-lit`).setOrigin(0).setAlpha(0);this.over.add(this.neon)}
      approach[photo]=[(camera[0]+9)*2,(camera[1]+24)*2];hotspotFrames[photo]=[(camera[0]-8)*2,(camera[1]-6)*2,72,72];hotspotShapes[photo]=cameraBox(camera);outlines[photo]=outline(hotspotShapes[photo]);
    }
    // The station front and the konbini, the vending machines, the konbini's bins, the area map, the planters, the bus stop and the shops across the road (see makeTown).
    // The corridor's walls between the stairs, its end wall, and the gates' backs at the bottom; each staircase a hotspot, outlined with its sign.
    if(place==='corridor'){
      const {top,gates,stair}=this.corridor();this.solids.push(new Phaser.Geom.Rectangle(0,0,352,this.mapHeight),new Phaser.Geom.Rectangle(608,0,352,this.mapHeight),new Phaser.Geom.Rectangle(0,0,960,top*2+30),new Phaser.Geom.Rectangle(0,gates*2+14,960,this.mapHeight));
      this.corridorPlatforms().forEach((_,i)=>{for(const left of [true,false]){const spot=`stairs${i}${left?'L':'R'}`,y=stair(i);hotspotFrames[spot]=[left?192:608,y*2-36,160,98];hotspotShapes[spot]=[[left?96:304,y,80,30],[left?104:306,y-17,70,15]];outlines[spot]=outline(hotspotShapes[spot])}});
      hotspotFrames['return-corridor']=[352,gates*2+12,256,72];hotspotShapes['return-corridor']=[[178,gates+8,124,32]];outlines['return-corridor']=outline(hotspotShapes['return-corridor']);
      // The ticket office set into the left wall beside the gates (its counters are the staffed window), and the fare adjustment machine against the right wall, just before them.
      hotspotFrames['window-corridor']=[228,(gates-8)*2,124,104];hotspotShapes['window-corridor']=[[114,gates-8,62,52]];outlines['window-corridor']=outline(hotspotShapes['window-corridor']);
      this.solids.push(new Phaser.Geom.Rectangle(576,(gates-36)*2,32,48));hotspotFrames['adjust-corridor']=[540,(gates-46)*2,68,72];hotspotShapes['adjust-corridor']=[[288,gates-36,16,30],[286,gates-43,20,7]];outlines['adjust-corridor']=outline(hotspotShapes['adjust-corridor']);
    }
    // The platform: the tracks beyond both edges, the stairwells at its ends and the station sign's posts in the middle; a hotspot down each stairwell and one at each door mark of each track.
    if(place==='platform'){
      const w=this.mapWidth;this.solids.push(new Phaser.Geom.Rectangle(0,0,w,180),new Phaser.Geom.Rectangle(0,462,w,200),new Phaser.Geom.Rectangle(0,256,160,128),new Phaser.Geom.Rectangle(w-160,256,160,128),new Phaser.Geom.Rectangle(w/2-140,350,280,26),...platformBoards.map(({x,foot})=>new Phaser.Geom.Rectangle((x+38)*2,(foot-4)*2,16,8)));
      {const {x,y,w}=routeBoard;this.solids.push(new Phaser.Geom.Rectangle(x*2,y*2,w*2,24));hotspotFrames.route=[x*2-10,y*2-40,w*2+20,84];hotspotShapes.route=[[x,y+12-routeBoard.h,w,26]];outlines.route=outline(hotspotShapes.route)}
      hotspotFrames.downL=[0,256,232,128];hotspotShapes.downL=[[0,128,80,64]];hotspotFrames.downR=[w-232,256,232,128];hotspotShapes.downR=[[w/2-80,128,80,64]];outlines.downL=outline(hotspotShapes.downL);outlines.downR=outline(hotspotShapes.downR);
      this.doorXs().forEach((x,k)=>{for(const track of [0,1]){const spot=`door${track}-${k}`;hotspotFrames[spot]=[x-36,track?372:186,72,84];hotspotShapes[spot]=[track?[x/2-doorSize/2-2,trainTop[1]-4,doorSize+4,6]:[x/2-doorSize/2,trainTop[0]+trainRoof+3,doorSize,trainHeight-trainRoof-5]];outlines[spot]=outline(hotspotShapes[spot])}});
    }
    if(road)this.solids.push(new Phaser.Geom.Rectangle(0,70,960,202),...(avenue?[]:[new Phaser.Geom.Rectangle(0,524,960,116)]),...townLights.map(x=>new Phaser.Geom.Rectangle(x*2-2,510,10,14)),...(this.busesTo(road).length?[new Phaser.Geom.Rectangle(busStop*2+12,510,12,14)]:[]));
    if(place==='town')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,202),new Phaser.Geom.Rectangle(780,272,84,48),new Phaser.Geom.Rectangle(314,248,22,40),new Phaser.Geom.Rectangle(8,244,140,44),new Phaser.Geom.Rectangle(732,272,40,20),new Phaser.Geom.Rectangle(236,228,68,60),new Phaser.Geom.Rectangle(152,300,56,20),new Phaser.Geom.Rectangle(600,300,56,20),...(this.trips().length?[new Phaser.Geom.Rectangle(busStop*2+12,510,12,14)]:[]),new Phaser.Geom.Rectangle(0,524,960,116),...townLights.map(x=>new Phaser.Geom.Rectangle(x*2-2,510,10,14)));
    // The home street: the far side's walls and houses, the near side's wall and roofs (the side street ends there too). The apartment: its walls
    // and its furniture (apartmentSolids), the sofa, the island and the fridge standing in the room, sorted with the traveller (see makeApartment).
    if(place==='home-street')this.solids.push(new Phaser.Geom.Rectangle(0,0,this.mapWidth,234),new Phaser.Geom.Rectangle(0,396,this.mapWidth,244));
    if(place==='kyoto-lane'){this.solids.push(new Phaser.Geom.Rectangle(0,0,960,290),new Phaser.Geom.Rectangle(0,290,696,54),new Phaser.Geom.Rectangle(0,500,960,140));for(let y=164;y<250;y+=4)this.solids.push(new Phaser.Geom.Rectangle(laneOuter(y)*2-8,y*2,960,8))}
    if(this.kyotoHouse(place))this.solids.push(...kyotoSolids[place].map(([x,y,w,h])=>new Phaser.Geom.Rectangle(x*2,y*2,w*2,h*2)));
    if(place==='apartment'){this.solids.push(...apartmentSolids.map(([x,y,w,h])=>new Phaser.Geom.Rectangle(x*2,y*2,w*2,h*2)));for(const {name,x,base} of apartmentProps)this.world.add(this.add.image(x*2,base*2,`apartment-${name}`).setOrigin(0,1))}
    // Two concourse pillars carrying the yellow exit signs, drawn in depth order with the people (see update) and solid at their foot.
    // The bin: a sprite of its own but in the apartment, solid and sorted with the people.
    this.bin=this.binOf(place);if(this.bin){
      const [x,y]=this.bin,key=place==='town'||isHub(place)?'bin-street':'bin-home',[w,h]=binShape[key];hotspotFrames.bin=[x-20,y-(h*2+8),40,h*2+12];approach.bin=[x,y+26];
      if(place==='apartment'){hotspotFrames.bin=[728,500,60,48];approach.bin=[724,538];hotspotShapes.bin=[[368,254,23,17]]}else{hotspotShapes.bin=[[x/2-w/2,y/2-h,w,h]];this.world.add(this.add.image(x,y,key).setOrigin(.5,1));this.solids.push(new Phaser.Geom.Rectangle(x-w,y-12,w*2,14))}
      outlines.bin=outline(hotspotShapes.bin);
    }
    if(isHub(place))for(const [x,side] of [[254,'west'],[690,'east']] as const){this.world.add(this.add.image(x,380,`exit-pillar-${place}-${side}`).setOrigin(.5,1));this.solids.push(new Phaser.Geom.Rectangle(x-30,364,60,16))}
    // The concourse's people, already spread out along their first trip, and, when it is busy enough, two standing to read: before the right-hand poster (the left one has the stamp stand) and by the far gates.
    if(isHub(place)){
      const people=this.gather();
      if(this.crowd()>=8)for(const [k,[x,y]] of [[648,272],[760,238]].entries()){people[k].face='up';people[k].image.setPosition(x,y).setAlpha(1)}
      people.forEach((commuter,k)=>{for(let t=between(0,20000);t>0;t-=200)this.stepCommuter(commuter,k,200)});
    }
    // Behind the gates, people come and go between the stairs and the gates (corridorTrip); in the street and along the lane, they pass by (streetTrip, laneTrip). All already on their way.
    if(place==='corridor'||place==='town'||place==='home-street'||place==='kyoto-lane')this.gather().forEach((commuter,k)=>{for(let t=between(0,20000);t>0;t-=200)this.stepCommuter(commuter,k,200)});
    // On a platform, the two trains, the departure boards and the people on it (platformTrip).
    if(place==='platform'){
      this.queues=[this.doorXs().map(()=>[]),this.doorXs().map(()=>[])];this.trains=[0,1].map(track=>this.train(track as 0|1));
      // The station sign, sorted with the people at its posts' feet: those beyond it pass behind.
      this.world.add(this.add.image(stationSign.x*2,(stationSign.y+stationSign.h)*2,this.platformMap()+'-sign').setOrigin(0,1));
      this.world.add(this.add.image(routeBoard.x*2,(routeBoard.y+12)*2,this.platformMap()+'-route').setOrigin(0,1));
      // The departure gantries, sorted with the people at their post's foot: a container, to carry each board's text with them.
      const tracks=this.deck!.platform.tracks,key=`platform-board-${tracks.join('-')}`;if(!this.textures.exists(key))makeBoard(this,key,tracks);
      for(const {x,foot} of platformBoards){
        const texts=[0,1].map(track=>this.label(36,(track?boardHeight:7)*2+5-gantryHeight*2,'',10,'#ffb347').setLineSpacing(1).setData('track',track)),gantry=this.add.container(x*2,foot*2,[this.add.image(0,0,key).setOrigin(0,1),...texts]);
        this.world.add(gantry);this.overhead.push(...texts);
      }
      const crowd=this.crowd();this.gather().forEach((commuter,k)=>{
        const {image,look}=commuter;commuter.steps=[{wait:between(0,8000),face:'down'}];if(k>=crowd)return;
        // A platform already in use: about half wait in the queues, some are on their way up to them, some off an earlier train head for the stairs, the rest come later.
        const r=Math.random();
        if(r<.55){this.platformTrip(commuter);const at=commuter.steps[commuter.steps.length-2] as {x:number;y:number};image.setPosition(at.x,at.y).setAlpha(1);commuter.steps=commuter.steps.slice(-1)}
        else if(r<.75){this.platformTrip(commuter);for(let t=between(500,5000);t>0;t-=200)this.stepCommuter(commuter,k,200)}
        else if(r<.9){
          const from={x:between(220,this.mapWidth-220),y:pick([between(200,240),between(410,440)])},{mouth,end}=this.stairwell(from.x);
          if(this.canWalk(from.x,from.y)){commuter.speed=(.045+(look*7%5)*.006)*(looks[look].pace??1);image.setPosition(from.x,from.y).setAlpha(1);commuter.steps=[...this.route(from,{x:mouth,y:from.y<320?300:340}),{x:end,y:from.y<320?300:340,alpha:0},{wait:between(4000,12000),face:'down'}]}
        }
      });
    }
    // At night in the street, some of the station's windows are lit (makeTown's rows), some in the backs of the shops across the road, and the street lights' lamps.
    if(place==='town'){
      const g=this.neon=this.add.graphics().setAlpha(0);this.over.add(g);g.fillStyle(0xf2cf7c,.85);
      // Kyoto's street shows its light between the bars of its lattices (art.ts `lattice`).
      const kyoto=inKyoto(this.outside!.from),lit=(x:number,y:number,w:number,h:number)=>{if(!kyoto){g.fillRect(x*2,y*2,w*2,h*2);return}for(let k=1;k<w;k+=2)g.fillRect((x+k)*2,y*2,2,h*2)};
      if(kyoto){for(const [y,h] of [[51,10],[69,12]])for(let x=12;x<330;x+=48)if((x*13+y*7)%5<2)lit(x,y,28,h)}
      else for(const y of [46,66,88])for(let x=4;x<320;x+=24)if((y<88||x<150||x>320)&&(x*13+y*7)%5<2)lit(x+1,y+1,14,10);
      for(const [x,y,w,h] of townWindows)if(x*13%5<3)lit(x,y,w,h);
      g.fillStyle(0xfff6d0);for(const x of townLights)g.fillRect(x*2+14,430,12,2);
    }
    // At night along the home street, some of the houses' windows and the apartment block's are lit; in the apartment, night darkens its window.
    if(place==='home-street'){const g=this.neon=this.add.graphics().setAlpha(0);this.over.add(g);g.fillStyle(0xf2cf7c,.85);for(const [x,y,w,h] of homeWindows)g.fillRect(x*2,y*2,w*2,h*2)}
    // At night, light through the slats of the house's lattice.
    if(place==='kyoto-lane'){const g=this.neon=this.add.graphics().setAlpha(0);this.over.add(g);g.fillStyle(0xf2cf7c,.7);for(let x=196;x<368;x+=9)g.fillRect(x,276,4,36);for(const [x,y,w,h] of laneWindows)g.fillRect(x*2,y*2,w*2,h*2)}
    if(place==='apartment'||this.kyotoHouse(place)){const g=this.pane=this.add.graphics().setAlpha(0);g.fillStyle(0x1c2448);for(const [x,y,w,h] of this.kyotoHouse(place)?kyotoWindows[place]:apartmentWindows)g.fillRect(x*2,y*2,w*2,h*2);this.world.add(g)}
    // The way home's sign, at the foot of its post (art.ts makeTown): the traveller passes under its board.
    if(place==='town'&&this.laneText()){this.laneSign=this.add.image(0,356,`lane-sign-${this.laneText()![1]}`).setOrigin(0,1);this.world.add(this.laneSign)}
    this.pigeons=place==='town'?new Pigeons(this,this.world):null;
    this.cat=place==='kyoto-lane'?new Cat(this,this.world):null;
    // Lorenzo's Uber, waiting in the street of the station he is at.
    if((place==='town'&&this.phone.lorenzo.at===this.townId()||road&&this.phone.lorenzo.at===place)&&this.phone.lorenzo.state==='here')this.parkCar();
    // Out of doors, the outlines stay lit over the night.
    this.glow=this.add.graphics();(this.outdoors()?this.over:this.world).add(this.glow);
    this.marker=this.add.circle(0,0,9,0xf3d28e,.35).setStrokeStyle(2,0xffedb9).setVisible(false);this.world.add(this.marker);
    this.player=this.add.container(...(back?[back.side==='west'?150:810,520]:[480,isHub(place)?490:place==='town'?328:place==='corridor'?this.corridor().gates*2-56:place==='platform'?320:410]) as [number,number]);if(at&&this.canWalk(at.x,at.y))this.player.setPosition(at.x,at.y);this.world.add(this.player);
    if(scenic(place)&&!(at&&this.canWalk(at.x,at.y))){const [x,y]=layoutOf(place)!.start;this.player.setPosition(x*2,y*2)}
    if(place==='home-street'&&!at)this.player.setPosition(1310,340);if(place==='kyoto-lane'&&!at)this.player.setPosition(840,306);if(place==='apartment'&&!(at&&this.canWalk(at.x,at.y)))this.player.setPosition(438,780);if(place==='kyoto-house'&&!(at&&this.canWalk(at.x,at.y)))this.player.setPosition(96,620);if(place==='kyoto-upstairs'&&!(at&&this.canWalk(at.x,at.y)))this.player.setPosition(686,276);
    if(place==='corridor'||place==='home-street'||place==='apartment'||this.kyotoHouse(place)||this.mapWidth>960||this.mapHeight>640&&!isHub(place))this.scroll();
    this.sprite=this.add.image(0,0,'traveller-down-0').setOrigin(.5,.85).setScale(2);this.player.add(this.sprite);this.dizzy=this.add.graphics();this.player.add(this.dizzy);
    // What the traveller walks under at a sight, and what drifts up from its burner or fountain.
    (layoutOf(place)?.stands??[]).forEach(([,y,,h],i,stands)=>this.world.add(this.add.image(stands[i][0]*2,(y+h)*2-15,`map-${place}-stand-${i}`).setOrigin(0,1-15/(h*2))));
    postsOf(place).forEach(([x,y,,h],i)=>this.world.add(this.add.image(x*2,(y+h)*2-15,`map-${place}-post-${i}`).setOrigin(0,1-15/(h*2))));
    if(place==='town'||road){makePoles(this);const kyoto=place==='town'&&inKyoto(this.townId());for(const x of townLights)this.world.add(this.add.image((x-2)*2,520,kyoto?'pole-light-kyoto':'pole-light').setOrigin(0,1));if(road?this.busesTo(road).length:this.trips().length)this.world.add(this.add.image(busStop*2,520,'pole-bus').setOrigin(0,1))}
    // Above all else, the street's sorting included: it stands at the map's foot.
    if(avenue?.over)this.world.add(this.add.image(0,this.mapHeight,`map-${place}-over`).setOrigin(0,1));
    // A sight's people stroll about their spot (wander), a first pause before setting off.
    // A sight's street has its strollers too, on the pavement before it: more where the sight is crowded, by the hour (`strollers`).
    if(road){const inside=layoutOf(road.id),plain=looks.map((_,i)=>i).filter(i=>looks[i].length!=='robe'&&!looks[i].cane);for(let k=strollers(inside?.busy||road.street?7:Math.min(6,2+Math.ceil((inside?.people?.length??0)/2)));k>0;k--){const look=pick(plain),face=pick(['up','down','left','right'] as const);let x=0,y=0;for(let tries=0;tries<20&&!(x&&this.canWalk(x,y));tries++){x=between(60,900);y=between(290,380)}const image=this.add.image(x,y,`commuter-${look}-${face}-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1));this.world.add(image);this.commuters.push({image,look,steps:[{wait:between(0,4000),face}],speed:.03*(1+(look*7%5)*.15)*(looks[look].pace??1),home:{x,y}})}}
    // A scramble crossing: its lights, sorted with the people at their pole's foot, the crowd beyond those listed coming in from off the screen.
    const crossing=layoutOf(place)?.crossing;this.traffic=[];if(crossing){makeSignals(this);makeTraffic(this)}this.signals=(crossing?.poles??[]).map(([x,y,side])=>{const image=this.add.image(x*2,y*2,`signal-${side}-g-s`).setOrigin((side==='L'?4:44)/signalSize[0],1);this.world.add(image);return image});
    if(crossing)crossing.cars.lanes.forEach(([,dir],lane)=>{this.trafficDue[lane]=between(0,2500);for(let x=between(60,260);x<900;x+=between(180,420))this.addCar(lane,dir>0?x:960-x)});
    if(crossing){const plain=looks.map((_,i)=>i).filter(i=>looks[i].length!=='robe'&&!looks[i].cane);for(let k=layoutOf(place)!.people!.length;k<crossing.crowd;k++){const look=pick(plain),image=this.add.image(0,0,`commuter-${look}-down-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1)).setAlpha(0);this.world.add(image);this.commuters.push({image,look,steps:[{wait:between(0,9000),face:'down'}],speed:.06*(1+(look*7%5)*.15)*(looks[look].pace??1),home:{x:0,y:0}})}}
    for(const [x,y,look,face] of layoutOf(place)?.people??[]){const image=this.add.image(x*2,y*2,`commuter-${look}-${face}-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1));this.world.add(image);const busy=layoutOf(place)!.busy;this.commuters.push({image,look,steps:[{wait:between(0,busy?600:4000),face}],speed:(busy?.06:.03)*(1+(look*7%5)*.15)*(looks[look].pace??1),home:{x:x*2,y:y*2}})}
    if(scenic(place)){const {over,puffs}=layoutOf(place)!;this.lifted=over?this.add.image(0,0,`map-${place}-over`).setOrigin(0):null;if(this.lifted)this.world.add(this.lifted);for(const [x,y,color] of puffs??[])for(let i=0;i<5;i++){const puff=this.add.rectangle(x*2,y*2,6,6,color,.7);this.world.add(puff);this.tweens.add({targets:puff,y:y*2-54,x:x*2+Phaser.Math.Between(-16,16),alpha:0,duration:2600,delay:i*520,repeat:-1})}}
    // Up the stairs, out of the stairwell's mouth; on a train pulling in, out of sight until its doors open (alight), nothing to do meanwhile.
    // Up the stairs on the side of the corridor's stairs taken: out of that end's stairwell. On a train pulling in, behind one of its doors near the middle, out of sight until they open.
    if(place==='platform'){
      const deck=this.deck!;
      if(deck.arriving){const n=this.doorXs().length;this.player.setPosition(this.doorPoint(deck.track,Math.floor(between(n/2-3,n/2+3))).x,320).setAlpha(0);this.modal=this.add.container(0,0)}
      else{this.player.setPosition(deck.track?this.mapWidth-190:190,320);this.facing=deck.track?'left':'right'}
      this.scroll();
    }
    // The top band, painted as a picture (paintHud): the clock (a click sets the time, debugTime), hunger and thirst, the purse, then Menu, Bag and Journal.
    this.hudHover=-1;this.refreshPurse();this.hud.add(this.add.image(0,0,'hud-band').setOrigin(0));
    const zone=([x,y,w,h]:readonly number[],fn:()=>void,i=-1)=>{const z=this.add.zone(x*2,y*2,w*2,h*2).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerdown',fn);if(i>=0)z.on('pointerover',()=>{this.hudHover=i;this.refreshHud()}).on('pointerout',()=>{if(this.hudHover===i){this.hudHover=-1;this.refreshHud()}});this.hud.add(z)};
    zone(hudLayout.clock,()=>this.debugTime());[()=>this.menu(),()=>this.inventory(),()=>this.album()].forEach((fn,i)=>zone(hudLayout.buttons[i],fn,i));
    // In the story, its controls in place of the needs and purse: play / pause, the speeds, the album's turning.
    if(this.story){const {play,speeds:at,album}=hudLayout.story;zone(play,()=>this.storyToggle(),3);at.forEach((rect,i)=>zone(rect,()=>this.storyPace({speed:speeds[i]}),4+i));zone(album,()=>this.storyPace({auto:!this.pace.auto}),7)}
    // Hunger and thirst, each its icon and bar over the band's inset (kept up in update).
    this.needGlows=[];this.needBars=this.story?[]:(['hunger','thirst'] as const).map((need,i)=>{const y=hudLayout.needRows[i]*2,x=hudLayout.needs[0]*2+16;this.needGlows.push(this.add.container(x,y+8,[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([dx,dy])=>this.add.image(dx*2,dy*2,`need-${need}`).setScale(2).setTintFill(0xff3a24))).setAlpha(0));this.hud.add(this.needGlows[i]);this.hud.add(this.add.image(x,y+8,`need-${need}`).setScale(2));return this.rect(hudLayout.needBar*2,y+4,104,8,0xffffff,this.hud).setOrigin(0)});
    // The phone in the corner, a badge counting what is unread: a click on it (or P, or the pad's RB) takes it out.
    this.mini=this.add.container(916,580);this.hud.add(this.mini);this.mini.add(this.add.image(0,0,'phone-mini').setScale(2).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openPhone()));
    this.badgeText=this.add.text(0,0,'',{fontFamily:'monospace',fontSize:12,color:'#ffffff'}).setOrigin(.5);this.badge=this.add.container(16,-30,[this.add.circle(0,0,10,0xd6402e).setStrokeStyle(2,0xfffef2),this.badgeText]);this.mini.add(this.badge);this.refreshPhone();
    // No bottom bar: the action prompt floats over the player when something is in reach (see update).
    this.prompt=this.label(0,0,'',13,'#fff0d4',this.hud).setOrigin(.5,1).setPadding(8,4,8,4).setBackgroundColor('#263d39e0').setVisible(false);
    this.storyIdle=this.storyAfter(900);this.storyTry=['',0];
    this.keep();
  }
  /** The stage the traveller is on and how many are about on it (crowd.ts). */
  private stage(){return (isHub(this.place)?'concourse':this.place) as Stage}
  private crowd(){return crowdAt(this.stage(),stations[this.nearestStation()].ja)}
  /** As many people as this place ever holds, hidden until their first trip: outfits drawn at random, repeating only past the last one, and then only the plainest (no second kimono, no second schoolchild). */
  private gather(){
    const order=Phaser.Utils.Array.Shuffle(looks.map((_,i)=>i)),plain=order.filter(i=>looks[i].length!=='robe'&&(looks[i].height??1)>=.7&&!looks[i].cane);
    return Array.from({length:busiest(this.stage(),stations[this.nearestStation()].ja)},(_,k)=>{
      const look=k<order.length?order[k]:plain[k%plain.length],image=this.add.image(0,0,`commuter-${look}-down-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1)).setAlpha(0);
      const commuter:Commuter={image,look,steps:[],speed:0};this.world.add(image);this.commuters.push(commuter);return commuter;
    });
  }
  /** The street outside the station left by `outside`, its sign naming the station and exit: drawn the first time (makeTown). */
  private townMap(){
    const {from,side}=this.outside!,key=`map-town-${from}-${side}`;
    if(!this.textures.exists(key))makeTown(this,key,`${stations[from].ja}駅 ${exitName(from,side)[0]}`,`${stations[from].en.toUpperCase()} STATION · ${exitName(from,side)[1].toUpperCase()}`,stations[from].accent,konbiniFor(from),this.laneText(),inKyoto(from),from==='kyoto',this.trips().length>0);
    return key;
  }
  /** The corridor behind the gates walked through (gateway), drawn the first time (makeCorridor). */
  private corridorMap(){
    const {hub,service}=this.gateway!,key=`map-corridor-${hub}-${service}`;
    if(!this.textures.exists(key))makeCorridor(this,key,this.corridorPlatforms(),`${stations[hub].ja}  ${service==='local'?'在来線':'新幹線'}のりば`,stations[hub].accent);
    return key;
  }
  private corridorPlatforms(){return platformsAt(this.gateway!.hub,this.gateway!.service)}
  private corridor(){return corridorLayout(this.corridorPlatforms().length)}
  /** Keeps the traveller in the middle of the screen as the corridor or the platform scrolls, within the map. */
  private scroll(ease=1){const x=Phaser.Math.Clamp(480-this.player.x,960-this.mapWidth,0),y=Phaser.Math.Clamp(355-this.player.y,640-this.mapHeight,0);this.world.x=Math.round(this.world.x+(x-this.world.x)*ease);this.world.y=Math.round(this.world.y+(y-this.world.y)*ease)}
  /** Whether this is the street the traveller lives off (`home`): its lane leads to the home street. */
  private homeTown(){return [home,kyotoHome].some(({hub,side})=>this.outside?.from===hub&&this.outside.side===side)}
  /** Its sign. */
  /** The sight a short walk from this station, if any: the street's sign points the way there, as the sight's own street points back. */
  private walkSight(){const ja=stations[this.townId()].ja;return sights.find(sight=>sight.pieces&&sight.walk?.[0]===ja)??sights.find(sight=>sight.pieces&&sight.walk?.includes(ja))}
  /** The sign at the plaza's left edge: the way home, or the way to the sight nearby; null where there is neither. */
  private laneText():[string,string]|null{const sight=this.walkSight();return this.homeTown()?this.outside?.from===kyotoHome.hub?['←南区東九条','HIGASHIKUJO']:['←東中野一丁目','HIGASHINAKANO 1']:sight?[`←${sight.ja}`,sight.en.toUpperCase()]:null}
  /** The station whose street the player is in. */
  private townId(){return this.outside?.from??'tokyo'}
  private button(x:number,y:number,w:number,h:number,text:string,fn:()=>void,parent:Phaser.GameObjects.Container){
    this.rect(x-2,y-2,w+4,h+4,0x9b9e7d,parent);this.rect(x,y+3,w,h,0x182f2c,parent);const b=this.rect(x,y,w,h,0x415c4f,parent).setInteractive({useHandCursor:true});this.label(x+w/2,y+h/2,text,16,'#fff0d4',parent).setOrigin(.5);b.on('pointerdown',fn);return b;
  }
  private kyotoHouse(place:Place):place is 'kyoto-house'|'kyoto-upstairs'{return place==='kyoto-house'||place==='kyoto-upstairs'}
  private shapeKey(spot:string){return (spot==='return'||spot==='photo'||spot==='photo2'||spot==='way')&&scenic(this.place)||spot==='photo'&&avenueOf(this.place)?`${spot}-${this.place}`:(spot==='return'||spot==='adjust'||spot==='window')&&['town','corridor','home-street','kyoto-lane','apartment','kyoto-house'].includes(this.place)||(spot==='home'||spot==='konbini')&&this.place==='kyoto-lane'?spot+'-'+this.place:spot}
  private frameFor(spot:string){return hotspotFrames[this.shapeKey(spot)]}
  /** Every hotspot of the current place. */
  /** A second signpost's hotspot, on the exit sign's pattern. */
  private signpost(key:string,[x,y]:[number,number]){approach[key]=[(x+10)*2,(y+26)*2];hotspotFrames[key]=[(x-6)*2,(y-4)*2,108,92];hotspotShapes[key]=exitBox([x,y]);outlines[key]=outline(hotspotShapes[key])}
  private hotspots(){return [...(this.bin?['bin']:[]),...this.placeSpots()]}
  /** The bin, one per place at most: those of the stations and streets fall where a station's name says (some have none), the homes' by the kitchen. The apartment's is drawn with it. */
  private binOf(place:string):[number,number]|null{
    const roll=(name:string)=>[...name].reduce((sum,c)=>(sum*31+c.charCodeAt(0))>>>0,7)>>>3;
    if(place==='apartment')return [768,532];if(place==='kyoto-house')return [364,208];
    if(isHub(place)){const n=roll(place);return n%2?[n&2?34:926,340]:null}
    if(place==='town'){const n=roll(`${this.townId()}-${this.outside?.side}`);return n%2?[n&2?690:176,372]:null}
    return null;
  }
  private placeSpots(){return isHub(this.place)?[...(stationOpen()?['staff','ticket','local',this.right(this.place)]:[]),'stamp','westExit','eastExit']:this.place==='town'?['return','konbini','atm','vending-town-red','vending-town-blue','areaMap',...(this.trips().length?['bus']:[]),...(this.laneText()?['lane']:[]),...(this.car?.getData('parked')?['uber']:[])]:this.place==='home-street'?['return','home','vending-home-red','vending-home-white']:this.place==='kyoto-lane'?['return','konbini','home']:this.place==='apartment'?['return','bed']:this.place==='kyoto-house'?['return','upstairs']:this.place==='kyoto-upstairs'?['downstairs','bedE','bedD','bedC']:sightOfRoad(this.place)?['entrance','walkBack',...(avenueOf(this.place)?['photo']:[]),...(this.busesTo(sightOfRoad(this.place)!).length?['bus']:[]),...(this.car?.getData('parked')?['uber']:[])]:this.place==='corridor'?['return','adjust','window',...this.corridorPlatforms().flatMap((_,i)=>[`stairs${i}L`,`stairs${i}R`])]:this.place==='platform'?['downL','downR','route',...this.openDoors()]:['return','photo',...(layoutOf(this.place)?.second?['photo2']:[]),...(layoutOf(this.place)?.way?['way']:[])]}
  private hotspotAt(x:number,y:number){
    if(this.place==='platform'){
      const doors=this.doorXs(),k=doors.reduce((best,door,k)=>Math.abs(door-x)<Math.abs(doors[best]-x)?k:best,0);
      if(Math.abs(doors[k]-x)<=36)for(const train of this.trains){
        const queue=train.track?y>=372&&y<448:y>=186&&y<270;
        const door=train.track?y>=448&&y<(trainTop[1]+trainHeight)*2:y>=((trainTop[0]+trainRoof)*2)&&y<(trainTop[0]+trainHeight)*2;
        if((train.phase==='gap'&&queue)||((train.phase==='alight'||train.phase==='board')&&door&&Math.abs(doors[k]-x)<=doorSize+6))return `door${train.track}-${k}`;
      }
    }
    // Once a train has arrived, a click on its queue or body away from a door only walks.
    return this.hotspots().filter(spot=>!spot.startsWith('door')).find(spot=>{const [fx,fy,w,h]=this.frameFor(spot);return x>=fx&&x<fx+w&&y>=fy&&y<fy+h})??'';
  }
  private nearby(){const spot=this.placeNear();return spot||(this.bin&&Phaser.Math.Distance.Between(this.player.x,this.player.y,...this.bin)<58?'bin':'')}
  private placeNear(){
    const {x,y}=this.player;
    if(isHub(this.place)){
      if(x<115&&y>455)return 'westExit';
      if(x>845&&y>455)return 'eastExit';
      // The stamp stand before the left poster, there at any hour.
      if(x>268&&x<334&&y<318)return 'stamp';
      if(!stationOpen())return '';
      if(x>330&&x<630&&y<310)return 'ticket';
      if(x<128&&y<275)return 'staff';
      if(x<272&&y<300)return 'local';
      if(x>724&&y<300)return this.right(this.place);
    }else if(this.place==='corridor'){
      const {gates,stair}=this.corridor();
      if(x>520&&y>gates*2-84&&y<gates*2-30)return 'adjust';
      if(x<400&&y>gates*2-30)return 'window';
      if(y>gates*2-40)return 'return';
      for(let i=0;i<this.corridorPlatforms().length;i++)if(y>stair(i)*2-12&&y<stair(i)*2+72){if(x<400)return `stairs${i}L`;if(x>560)return `stairs${i}R`}
    }else if(this.place==='platform'){
      if(y>250&&y<392){if(x>148&&x<240)return 'downL';if(x>this.mapWidth-240&&x<this.mapWidth-148)return 'downR'}
      if(x>routeBoard.x*2-40&&x<(routeBoard.x+routeBoard.w)*2+40&&y>routeBoard.y*2-56&&y<routeBoard.y*2+80)return 'route';
      const doors=this.doorXs(),k=doors.reduce((best,door,k)=>Math.abs(door-x)<Math.abs(doors[best]-x)?k:best,0);
      if(Math.abs(doors[k]-x)<34&&(y<270||y>370))return `door${y<270?0:1}-${k}`;
    }else if(sightOfRoad(this.place)){
      if(this.car?.getData('parked')&&Phaser.Math.Distance.Between(x,y,638,417)<84)return 'uber';
      if(x>380&&x<580&&y<320&&!sightOfRoad(this.place)!.street)return 'entrance';
      if(x<96&&y>270&&y<400)return 'walkBack';
      if(x>760&&x<860&&y>470&&y<540&&this.busesTo(sightOfRoad(this.place)!).length)return 'bus';
      const camera=avenueOf(this.place)?.camera;if(camera&&Phaser.Math.Distance.Between(x,y,(camera[0]+9)*2,(camera[1]+20)*2)<64)return 'photo';
    }else if(this.place==='town'){
      if(this.car?.getData('parked')&&Phaser.Math.Distance.Between(x,y,638,417)<84)return 'uber';
      if(x>380&&x<580&&y<310)return 'return';
      if(x>850&&x<945&&y<323)return 'atm';
      if(x>650&&x<760&&y<323)return 'konbini';
      if(x>760&&x<880&&y>300&&y<362)return x<823?'vending-town-red':'vending-town-blue';
      // In front of the area map or beside it (between it and the planter on its left, out of the path grid's reach of its front).
      if(x>196&&x<344&&y>230&&y<340)return 'areaMap';
      if(this.laneText()&&x<96&&y>270&&y<400)return 'lane';
      if(x>760&&x<860&&y>470&&this.trips().length)return 'bus';
    }else if(this.place==='home-street'){
      if(x>1330)return 'return';
      if(x>60&&x<150&&y<320)return 'home';
      if(x>470&&x<570&&y<280)return x<520?'vending-home-white':'vending-home-red';
    }else if(this.place==='kyoto-lane'){
      if(x>850&&y<370)return 'return';
      if(x>700&&x<810&&y<350)return 'konbini';
      if(x>70&&x<200&&y<400)return 'home';
    }else if(this.place==='kyoto-house'){
      if(y>610&&x>40&&x<156)return 'return';
      if(x>640&&x<732&&y>552)return 'upstairs';
    }else if(this.place==='kyoto-upstairs'){
      if(x>640&&x<732&&y>240&&y<304)return 'downstairs';
      if(y>370&&y<524)for(const [spot,from,to] of [['bedE',36,140],['bedD',290,434],['bedC',530,630]] as const)if(x>from&&x<to)return spot;
    }else if(this.place==='apartment'){
      if(y>740&&x>396&&x<480)return 'return';
      if(x>140&&x<260&&y<280)return 'bed';
    }else{
      const {exit,camera,way,second}=layoutOf(this.place)!;
      if(second&&Phaser.Math.Distance.Between(x,y,(second.camera[0]+9)*2,(second.camera[1]+28)*2)<64)return 'photo2';
      if(way&&Phaser.Math.Distance.Between(x,y,(way.at[0]+10)*2,(way.at[1]+22)*2)<64)return 'way';
      if(Phaser.Math.Distance.Between(x,y,(exit[0]+10)*2,(exit[1]+22)*2)<64)return 'return';
      if(Phaser.Math.Distance.Between(x,y,(camera[0]+9)*2,(camera[1]+20)*2)<64)return 'photo';
    }
    return '';
  }
  /** The corridor's prompts: each staircase names its track and line, and the way back is through the gates. */
  private promptFor(spot:string){
    if(spot.startsWith('vending'))return 'Vending machine';if(spot.startsWith('bed'))return 'Bed';
    if(spot==='return'&&(this.place==='home-street'||this.place==='kyoto-lane'))return 'To the station →';if(spot==='home'&&this.place==='kyoto-lane')return 'Home';
    if(spot==='return'&&(this.place==='apartment'||this.place==='kyoto-house'))return 'Go out';if(spot==='upstairs')return 'Upstairs';if(spot==='downstairs')return 'Downstairs';
    // An exit, with its name where it has one (Marunouchi, Komachi…).
    if(isHub(this.place)&&(spot==='westExit'||spot==='eastExit')){const west=spot==='westExit',[name]=stations[this.place][west?'west':'east'];return `${stations[this.place].exits?.[west?'west':'east'][1]??(west?'West exit':'East exit')}${name?` · ${name}`:''}`}
    if(spot==='way')return `Enter · ${layoutOf(this.place)!.way!.en}`;
    if(spot==='return'&&layoutOf(this.place)?.out)return layoutOf(this.place)!.out!.en;
    if(spot==='return'&&sightOf(this.place)?.ropeway&&this.place===sightOf(this.place)!.id)return 'Ropeway down';
    if(spot==='return'&&sightOf(this.place)?.pieces)return 'To the street';
    if(spot==='lane'&&!this.homeTown())return `Walk to ${this.walkSight()!.en}`;
    if(spot==='entrance')return `${sightOfRoad(this.place)!.ropeway?'Ropeway':'Enter'} · ${sightOfRoad(this.place)!.en}`;if(spot==='walkBack')return `Walk to ${stations[this.townId()].en} Station`;
    if(this.place!=='corridor')return null;
    if(spot==='return')return 'Out through the gates';
    if(!spot.startsWith('stairs'))return null;
    const platform=this.corridorPlatforms()[Number(spot.slice(6,-1))];return `↑ Track ${platform.tracks[spot.endsWith('L')?0:1]} · ${lineNames(platform.lines)}`;
  }
  /** What stands on the right of a hub's concourse: the Shinkansen transfer gates, or a shop where there is no Shinkansen. */
  private right(hub:Hub){return hasShinkansen(hub)?'shinkansen':'shop'}
  /** Through the konbini's door (the street's, or the NewDays in a concourse), before its shelves in first person; the scene waits under it. */
  private konbini(chain:Chain){
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    this.shopView=new Shop(chain,this.wallet,()=>this.refreshPurse(),this.stash,()=>{this.shopView=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
  }
  /** What was bought goes into the bag. */
  private stash=(goods:Item[])=>{this.groceries.push(...goods.map(([ja,en]):[string,string]=>[ja,en]));this.keep()};
  /** Before a street vending machine, in first person; the scene waits under it. */
  private vending(vendor:VendorId){
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    this.vendingView=new Vending(vendor,this.wallet,()=>this.refreshPurse(),this.stash,()=>{this.vendingView=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
  }
  private dialog(title:string,body:string,choices:[string,()=>void][]=[]){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    const shade=this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),panel=this.rect(200,145,560,365,0xf0e6cb,c);this.rect(200,145,560,7,0xba654c,c);
    this.label(228,173,title,22,'#294a48',c);const text=this.label(228,220,body,16,'#475b50',c).setWordWrapWidth(500);
    // The choices start below the text, clear of the focus ring around them; the panel grows to hold them and Close.
    const wide=choices.length<5,rows=wide?choices.length:Math.ceil(choices.length/2),top=Math.max(wide?320:270,220+text.height+22),closeY=Math.max(461,top+rows*54+6);panel.setSize(560,closeY+49-145);
    const close=()=>{c.destroy(true);this.modal=null;};this.dismissible(shade,panel,close);
    const buttons:PadChoice[]=[...choices.map(([label,fn],i):PadChoice=>[wide?this.button(228,top+i*54,504,44,label,fn,c):this.button(228+(i%2)*256,top+Math.floor(i/2)*54,248,44,label,fn,c),fn]),[this.button(650,closeY,82,32,'Close',close,c),close]];
    // Gamepad focus ring: d-pad / stick to move, A to choose, B to close.
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices:buttons,ring});this.focusChoice(c,0);
  }
  /** A friend speaking face to face, as in a Japanese RPG: a box along the foot of the screen, their face on its left, their name and words typed out.
   * A click, E, Space, Enter, Esc, A or B shows the whole page, then the next; `choices` follow the last page (the last of them also Esc / B), else it closes and `then` follows. */
  private talk(who:Contact,pages:string[],choices:[string,()=>void][]=[],then?:()=>void){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    const X=24,Y=436,W=912,H=188,tx=X+188,g=this.add.graphics();
    const hit=this.add.rectangle(0,0,960,640,0,0).setOrigin(0).setInteractive();c.add([hit,g]);
    // The box: deep blue shading down, a white rim and a faint inner one; the face in its own frame.
    g.fillGradientStyle(0x34489e,0x34489e,0x0e1648,0x0e1648,.96).fillRect(X,Y,W,H).lineStyle(4,0xf4f4fa).strokeRect(X,Y,W,H).lineStyle(2,0x7d88c8).strokeRect(X+6,Y+6,W-12,H-12);
    g.fillStyle(0x0a0f30).fillRect(X+18,Y+20,148,148).lineStyle(2,0xf4f4fa).strokeRect(X+18,Y+20,148,148);
    portraitTexture(this,who,key=>{if(c.active)c.add(this.add.image(X+20,Y+22,key).setOrigin(0).setDisplaySize(144,144))});
    const font='"Yorimichi Pixel","Yorimichi JP",monospace';void document.fonts.load('20px "Yorimichi Pixel"');
    c.add(this.add.text(tx,Y+18,contacts[who].name,{fontFamily:font,fontSize:22,color:'#ffe27a'}));
    const text=this.add.text(tx,Y+54,'',{fontFamily:font,fontSize:20,color:'#ffffff',lineSpacing:8,wordWrap:{width:X+W-tx-28}}),more=this.add.text(X+W-34,Y+H-34,'▼',{fontFamily:font,fontSize:16,color:'#ffffff'}).setVisible(false);c.add([text,more]);
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setVisible(false);c.add(ring);
    let page=0,shown=0,asking=false;
    const blink=this.tweens.add({targets:more,alpha:0,duration:400,yoyo:true,repeat:-1}),close=()=>{typing.remove();blink.remove();c.destroy(true);if(this.modal===c)this.modal=null};
    const typing=this.time.addEvent({delay:28,loop:true,callback:()=>{if(shown<pages[page].length)text.setText(pages[page].slice(0,++shown));else ended()}});
    const ended=()=>{
      if(asking)return;text.setText(pages[page]);shown=pages[page].length;const last=page===pages.length-1;more.setVisible(!last||!choices.length);if(!last||!choices.length)return;
      asking=true;const w=Math.min(300,(X+W-tx-28-12*(choices.length-1))/choices.length);
      const buttons=choices.map(([label,fn],i):PadChoice=>{const go=()=>{close();fn()};return [this.button(tx+i*(w+12),Y+H-60,w,40,label,go,c),go]});
      ring.setStrokeStyle(3,0xf3d76b);c.setData('choices',buttons);this.focusChoice(c,0);
    };
    const press=()=>{if(asking){const buttons=c.getData('choices') as PadChoice[];buttons[c.getData('focus')][1]();return}
      if(shown<pages[page].length){ended();return}
      if(page<pages.length-1){page++;shown=0;text.setText('');more.setVisible(false);return}
      close();then?.()};
    hit.on('pointerdown',()=>{if(!asking)press()});
    c.setData({choices:[[hit,press]],ring,talk:press});this.focusChoice(c,0);
  }
  /** A click on the shade round a popup's panel (`panel`, sized now or later) closes it, as its Close button would. */
  private dismissible(shade:Phaser.GameObjects.Rectangle,panel:Phaser.GameObjects.Rectangle,close:()=>void){shade.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{if(!panel.getBounds().contains(pointer.x,pointer.y))close()})}
  /** The street's area map, read up close: on its board (makeAreaMap, its panels and legend), the street itself at a quarter of the scene's resolution, the traveller on a red 現在地 spot,
   * and on the map's own face the same picture again, smaller each time (each pass nests the last one, until it is under a pixel). */
  private areaMapView(){
    this.stopNavigation();this.direction={x:0,y:0};
    const {from,side}=this.outside!,board=`area-map-${from}-${side}`;if(!this.textures.exists(board))makeAreaMap(this,board,stations[from].ja,stations[from].en,konbiniFor(from),this.trips().length>0);
    const key='area-map-view',W=240,H=160,s=W/960,src=(k:string)=>this.textures.get(k).getSourceImage() as HTMLCanvasElement;
    const texture=(this.textures.exists(key)?this.textures.get(key):this.textures.createCanvas(key,W,H)) as Phaser.Textures.CanvasTexture,g=texture.context;
    const prev=document.createElement('canvas');prev.width=W;prev.height=H;const p=prev.getContext('2d')!;g.imageSmoothingEnabled=p.imageSmoothingEnabled=false;
    const map=src(this.townMap()),me=src(this.sprite.texture.key),{x,y}=this.player,cx=Math.round(x*s),foot=Math.round(y*s);
    // The face fitted at the screen's 3:2, centred; in this picture's pixels (art px / 2).
    const [fx,fy,fw,fh]=areaMapFace,w=Math.min(fw,fh*1.5),h=w/1.5,face=[(fx+(fw-w)/2)/2,(fy+(fh-h)/2)/2,w/2,h/2].map(Math.round);
    for(let pass=0;pass<6;pass++){
      g.drawImage(map,0,0,W,H);if(pass)g.drawImage(prev,face[0],face[1],face[2],face[3]);
      // The red spot under the traveller's feet, clear of the map they stand reading.
      g.fillStyle='#d6402e';g.fillRect(cx-2,foot-1,5,3);g.fillRect(cx-3,foot,7,1);g.drawImage(me,Math.round((x-20)*s),Math.round((y-47.6)*s),10,14);
      p.clearRect(0,0,W,H);p.drawImage(texture.getSourceImage() as HTMLCanvasElement,0,0);
    }
    texture.refresh();
    const c=this.add.container(0,0).setDepth(20);this.modal=c;const close=()=>{c.destroy(true);this.modal=null};
    this.dismissible(this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),this.rect(100,76,760,552,0xf0e6cb,c),close);this.rect(100,76,760,7,0xba654c,c);
    // The board at 4× its art px; the picture in its window at 2× its own (ox, oy: the window's top left).
    const [wx,wy]=areaMapWindow,ox=120+wx*4,oy=132+wy*4;
    this.label(124,94,'周辺案内 / Area map',20,'#294a48',c);this.rect(118,130,724,484,0x4c6156,c);c.add(this.add.image(120,132,board).setOrigin(0).setScale(2));c.add(this.add.image(ox,oy,key).setOrigin(0).setScale(2));
    this.label(Phaser.Math.Clamp(ox+cx*2,ox+80,ox+400),oy+(foot+2)*2+14,'現在地 / You are here',13,'#ffffff',c).setOrigin(.5,0).setPadding(6,3,6,3).setBackgroundColor('#d6402e');
    // Its little arrow, pointing up at the traveller.
    {const ax=ox+cx*2+1,ay=oy+(foot+2)*2+15;c.add(this.add.triangle(0,0,ax,ay-12,ax-6,ay,ax+6,ay,0xd6402e).setOrigin(0))}
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);
    c.setData({choices:[[this.button(754,88,82,32,'Close',close,c),close]],ring});this.focusChoice(c,0);
  }
  private focusChoice(c:Phaser.GameObjects.Container,index:number){
    const choices=c.getData('choices') as PadChoice[],i=(index+choices.length)%choices.length,[b]=choices[i];
    c.setData('focus',i);(c.getData('ring') as Phaser.GameObjects.Rectangle).setPosition(b.x-5,b.y-5).setSize(b.width+10,b.height+10);b.getData('hover')?.();
  }
  /** Gamepad outside the ticket hall (which reads the pad itself): walking, A to act, X ticket, Y journal, RB phone, and the dialogs and departures board. Returns the stick/d-pad direction. */
  private gamepad(){
    const pad=connectedPad(),dead=(v=0)=>Math.abs(v)>.3?v:0;
    const state=pad?.buttons.map(b=>b.pressed)??[],ax=dead(pad?.axes[0]),ay=dead(pad?.axes[1]);
    state[20]=!!state[12]||ay<-.5;state[21]=!!state[13]||ay>.5;
    const prev=this.padPrev,edge=(i:number)=>state[i]&&!prev[i];this.padPrev=state;
    if(!pad||!this.phoneUi&&(this.hall||this.machine||this.gate||this.atm||this.shopView||this.vendingView||this.fareBox))return {x:0,y:0};
    const step=edge(20)?-1:edge(21)?1:0;
    if(this.bag){if(edge(1)||edge(2))this.bag.close();else if(edge(0))this.bag.press();else if(step||edge(14)||edge(15))this.bag.step(step||(edge(14)?-1:1))}
    else if(this.phoneUi){if(edge(5))this.phoneUi.close();else{this.phoneUi.pad(step||(edge(14)?-1:edge(15)?1:0),edge(0),edge(1));if(edge(7))this.phoneUi.zoom(1);else if(edge(6))this.phoneUi.zoom(-1)}}
    else if(this.flight){if(edge(0)||edge(1))this.flight.skip()}
    else if(this.departures){
      const overlay=document.querySelector('.jr-departure-overlay'),buttons=Array.from(overlay?.querySelectorAll('button')??[]),i=buttons.indexOf(document.activeElement as HTMLButtonElement);
      if(step)buttons[(i+step+buttons.length)%buttons.length]?.focus();
      if(edge(0))(document.activeElement as HTMLElement|null)?.click();
      if(edge(1))overlay?.querySelector<HTMLButtonElement>('.departure-close')?.click();
    }else if(this.modal){
      const c=this.modal,choices=c.getData('choices') as PadChoice[]|undefined;if(!choices)return {x:0,y:0};
      (c.getData('ring') as Phaser.GameObjects.Rectangle).setVisible(true);
      if(step)this.focusChoice(c,c.getData('focus')+step);
      if(edge(0))choices[c.getData('focus')][1]();else if(edge(1))choices[choices.length-1][1]();
      return {x:state[14]?-1:state[15]?1:ax,y:0};
    }else{
      if(edge(0)){if(this.story)this.storyToggle();else this.interact()}else if(edge(2))this.inventory();else if(edge(3))this.album();else if(edge(5))this.openPhone();else if(edge(9))this.menu();
      return {x:state[14]?-1:state[15]?1:ax,y:state[12]?-1:state[13]?1:ay};
    }
    return {x:0,y:0};
  }
  private interact(near=this.nearby()){
    if(this.wheel)this.sleep();
    const talking=this.modal?.getData('talk') as (()=>void)|undefined;if(talking){talking();return}
    if(this.modal)return;
    if(this.story&&this.storyAct(near))return;
    if(near.startsWith('stairs')){this.climb(Number(near.slice(6,-1)),near.endsWith('L'));return}if(!near&&(this.place==='corridor'||this.place==='platform'||isHub(this.place)&&!stationOpen()))return;if(near.startsWith('door')){this.tryBoard(near);return}if(near.startsWith('vending')){this.vending(near.split('-')[2] as VendorId);return}
    switch(near){
      case 'ticket':this.ticketTerminal();break;
      case 'local':case 'shinkansen':this.ticketGate(near as Service);break;
      case 'staff':this.stationHelp();break;
      case 'shop':this.konbini('newdays');break;
      case 'stamp':this.stampBook(this.place as Hub);break;
      case 'konbini':this.konbini(this.place==='kyoto-lane'?'family':konbiniFor(this.townId()));break;
      case 'westExit':case 'eastExit':{
        // Straight out to the exit's own map where it has one, the generic street otherwise.
        const side:Side=near==='westExit'?'west':'east',hub=this.place as Hub;
        this.outside={from:hub,side};this.loadPlace(stations[hub].maps?.[side]??'town');break;
      }
      case 'adjust':this.fareAdjust();break;
      case 'downL':case 'downR':this.descend(near==='downR');break;
      // The route map's face on the traveller's side: the top track's from above, the bottom one's from below.
      case 'route':this.routeMap(this.player.y<routeBoard.y*2+12?0:1);break;
      case 'window':this.staffWindow();break;
      // The konbini's ATM, seen through its window: the machine opens over the paused scene.
      case 'atm':this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
        this.atm=new Atm(konbiniFor(this.townId()),this.wallet,()=>this.refreshPurse(),()=>{this.atm=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});break;
      case 'areaMap':this.areaMapView();break;
      case 'bin':this.inventory(true);break;
      case 'lane':if(this.homeTown())this.loadPlace(this.outside?.from===kyotoHome.hub?'kyoto-lane':'home-street');else this.walkTo(this.walkSight()!.id);break;
      case 'home':this.loadPlace(this.place==='kyoto-lane'?'kyoto-house':'apartment');break;
      case 'upstairs':this.loadPlace('kyoto-upstairs');break;
      case 'downstairs':this.loadPlace('kyoto-house',{x:686,y:590});break;
      case 'bed':case 'bedE':case 'bedD':case 'bedC':this.bedside();break;
      case 'uber':this.uber();break;
      case 'return':{
        // Out through the gates, in first person.
        if(this.place==='corridor'){this.exitGate();break}
        // Home: from the apartment out to its door, from the lane back to the station's street by its sign.
        if(this.place==='apartment'||this.place==='kyoto-house'){if(this.outside?.from===kyotoHome.hub)this.loadPlace('kyoto-lane',{x:134,y:366});else this.loadPlace('home-street',{x:106,y:300});break}
        if(this.place==='home-street'||this.place==='kyoto-lane'){this.loadPlace('town',{x:60,y:330});break}
        // From a garden, back into its sight; from a sight, out to the street before it.
        {const out=layoutOf(this.place)?.out;if(out){this.loadPlace(out.to,{x:out.at[0]*2,y:out.at[1]*2});break}}
        if(sightOf(this.place)?.ropeway){this.ropeway(false);break}
        // A sight right outside an exit (Shibuya's crossing, its Hachiko exit): straight back into that station.
        {const from=this.outside&&Object.entries(stations[this.outside.from].maps??{}).find(([,to])=>to===this.place);if(from){this.outside={from:this.outside!.from,side:from[0] as Side};this.loadPlace(this.outside.from);break}}
        if(sightOf(this.place)?.pieces){this.loadPlace(roadTo(this.place),{x:480,y:296});break}
        // From the street or an exit's own map, straight back in through the doors: the concourse stays open all night.
        this.loadPlace(this.outside?.from??stationOf(this.place));break;
      }
      case 'bus':if(sightOfRoad(this.place))this.leaveSight();else this.busStop();break;
      case 'entrance':if(sightOfRoad(this.place)!.ropeway)this.ropeway(true);else this.loadPlace(sightOfRoad(this.place)!.id);break;
      case 'way':this.loadPlace(layoutOf(this.place)!.way!.to);break;
      case 'walkBack':this.walkBack();break;
      case 'photo':case 'photo2':{const page=near==='photo2'?layoutOf(this.place)!.second!.page:this.pageHere();this.collected.add(page);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.photoBook(page);break}
      default:this.dialog('Welcome to Japan','Tap the map to move, or tap a spot to walk there.\nKeyboard: arrows or WASD (ZQSD on AZERTY), E or Space to interact.\nGamepad: stick or D-pad, A to interact.\nPhone: tap it in the corner, P or RB.\n\nTicket machines on the back wall.\nFollow the signs or ask at the ticket office.');
    }
  }
  /** The gates in first person: the ticket goes into the slot and is taken back at the far end, then the departures; a wrong one is handed back.
   * Through the local gates, the corridor to the platforms; through the Shinkansen transfer gates, straight up to the ticket's own track. */
  private ticketGate(service:Service){
    if(!isHub(this.place))return;
    const hub=this.place;
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.gate=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    this.gate=new TicketGate({ja:stations[hub].ja,en:stations[hub].en,accent:stations[hub].accent,hub},service,[...this.tickets],this.wallet,ticket=>ticket.kind==='adjust'?'出場専用のきっぷです\nA fare adjustment ticket only takes you out of a station.'
      :ticket.from!==hub?`このきっぷはご利用になれません\nThis ticket starts its trip at ${stations[ticket.from].en}, not here.`
      :ticket.service!==service?`${ticket.service==='local'?'在来線':'新幹線'}のきっぷです\nIt goes through the ${ticket.service==='local'?'local (在来線) gates':'Shinkansen (新幹線) gates'}.`
      // A Shinkansen ticket is good on its own day only (a reserved seat's train missed, it still is, in the non-reserved cars, as at JR).
      :ticket.kind==='route'&&ticket.reservation?.date!==undefined&&ticket.reservation.date!==dayOf()?'not today':'',{
      pass:ticket=>{
        close();if(ticket.kind!=='route'||service==='local'){this.gateway={hub,service};this.loadPlace('corridor');return}
        const line=railLine(ticket.lineId);this.toPlatform({...deckFor(stations[hub].ja,line,stations[hub].tracks[line.id].indexOf(trackOf(ticket)) as 0|1),arriving:undefined});
      },leave:close,
    });
  }
  /** The gates on the way out, from a corridor or a Shinkansen platform, to the concourse in front of them: they let through a ticket that covers the trip from the station
   * whose gate punched it (fareDue) and keep it; a short one waits for the fare adjustment machine beside them. As at real automatic gates, a ticket that came in at this very
   * station is refused: the agent at the staffed window beside the gates (staffWindow) cancels the entry. The Shinkansen transfer gates, which have no corridor and no window,
   * cancel it themselves: the ticket comes back out unpunched. The gate never says why it refuses. */
  private exitGate(){
    if(!this.gateway)return;const {hub,service}=this.gateway,station=stations[hub];
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.gate=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    const out=()=>this.loadPlace(hub,service==='local'?{x:202,y:262}:{x:836,y:262});
    const cancel=service==='shinkansen'?hub:undefined;
    this.gate=new TicketGate({ja:station.ja,en:station.en,accent:station.accent,hub,exit:true,exits:[`← ${exitName(hub,'west')[0]} ${exitName(hub,'west')[1].replace(' Exit','')}`,`${exitName(hub,'east')[0]} ${exitName(hub,'east')[1].replace(' Exit','')} →`],cancel},service,[...this.tickets],this.wallet,ticket=>{
      if(ticket.kind!=='adjust'&&ticket.punched===hub)return cancel?'':'came in here';
      const due=fareDue(ticket,station.ja);return due===null?'not for here':due?'fare short':'';
    },{
      leave:close,pass:ticket=>{close();if(cancel&&ticket.punched===cancel){delete ticket.punched;this.keep()}else this.useTicket(ticket);out()},
    });
  }
  /** The staffed window beside the gates, inside the corridor (the ticket office's counters, seen from the paid side): whatever went wrong with the tickets, the agent lets the traveller out through the side gate. A ticket punched
   * here on the way in gets its entry cancelled (入場取消) and comes back unpunched; the ticket of a trip that ended here stays with the agent (paying a missing fare here is still to come). */
  private staffWindow(){
    const {hub,service}=this.gateway!,entered=this.tickets.find(t=>t.kind!=='adjust'&&t.punched===hub),travelled=this.tickets.filter(t=>t.kind==='adjust'||!!t.punched&&t.punched!==hub);
    const body=entered?'“You came in here and did not travel? I will cancel the entry (入場取消).”\nYour ticket comes back unpunched, good for another trip.':travelled.length?'“Trouble at the gates? Let me see your ticket.”\nThe agent keeps the ticket of your trip.':'“No ticket? Never mind.”';
    this.dialog('みどりの窓口 / Staff window',`${body}\nThey can let you out through the side gate.`,[['Go out through the side gate',()=>{
      if(entered)delete entered.punched;this.tickets=this.tickets.filter(t=>!travelled.includes(t));this.loadPlace(hub,service==='local'?{x:202,y:262}:{x:836,y:262});
    }]]);
  }
  /** The fare adjustment machine by the exit gates (のりこし精算機): it takes a ticket that falls short of the trip and, the rest paid, issues a 精算券 to leave with. */
  private fareAdjust(){
    const {hub}=this.gateway!,station=stations[hub];
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.machine?.destroy();this.modal=this.add.container(0,0).setDepth(20);
    this.machine=new TicketMachine(hub,'adjust',ticket=>{this.tickets.push(ticket);this.keep()},()=>{this.machine=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()},
      {fixedService:true,wallet:this.wallet,onWallet:()=>this.refreshPurse(),trayKey:trayKey(hub,'adjust'),adjust:{ja:station.ja,en:station.en,pocket:()=>this.tickets,hand:ticket=>{this.tickets=this.tickets.filter(t=>t!==ticket);this.keep()}}});
  }
  /** Up the stairs of platform `i` (the left ones on the side of its first track): onto the platform, with a punched ticket, wherever it was punched: changing lines is free, the fare is settled on the way out. Which train to take is up to the traveller. */
  private climb(i:number,left:boolean){
    const {hub}=this.gateway!,platform=this.corridorPlatforms()[i],ticket=this.tickets.find(t=>t.punched),title=`${platform.tracks[left?0:1]}番線 · ${platform.lines.map(line=>line.ja).join('・')}`;
    if(!ticket){this.dialog(title,`${lineNames(platform.lines)}, tracks ${platform.tracks.join(' and ')}.`);return}
    this.toPlatform({...deckFor(stations[hub].ja,platform.lines[0],left?0:1),arriving:undefined});
  }
  private toPlatform(deck:Deck){this.deck=deck;this.gateway={hub:deck.hub,service:deck.service};this.loadPlace('platform')}
  /** The platform, drawn the first time for its station and tracks (makePlatform): the sign names the stops either side on its first line. */
  private platformMap(){
    const {ja,en,platform:{tracks,lines:[line]},service}=this.deck!,key=`map-platform-${ja}-${tracks.join('-')}-${line.id}`,i=line.stops.indexOf(ja),n=line.stops.length;
    const side=(k:number)=>line.loop?line.stops[(i+k+n)%n]:line.stops[i+k]??'';
    if(!this.textures.exists(key))makePlatform(this,key,{ja,en,tracks,color:line.color,prev:side(-1),next:side(1),prevEn:side(-1)&&stopEn(side(-1)),nextEn:side(1)&&stopEn(side(1)),service,dirs:service==='shinkansen'?[runOf(line,ja,0).dir,runOf(line,ja,1).dir]:undefined});
    return key;
  }
  /** The door marks along the platform, in scene px. */
  private doorXs(){return doorMarks(this.deck!.service).map(x=>x*2)}
  /** Where a train's door `k` opens (people step in and out of sight there), and the place of the `i`th in its queue. */
  private doorPoint(track:number,k:number){return {x:this.doorXs()[k],y:track?470:186}}
  /** As at Japanese platforms, two lines at each door, one either side of its mark: place `i` is on the left when even, on the right when odd, a row further back every two.
   * The middle stays clear for those getting off (exitPoint). */
  private slot(track:number,k:number,i:number){const row=Math.min(i>>1,2);return {x:this.doorXs()[k]+(i%2?26:-26),y:track?444-row*18:202+row*18}}
  private exitPoint(track:number,k:number){return {x:this.doorXs()[k],y:track?426:220}}
  /** Past the back of the queues' lanes, straight out of door `k`: how far those getting off keep to the middle. */
  private clearPoint(track:number,k:number){return {x:this.doorXs()[k],y:track?392:254}}
  /** Whether someone is still getting off at that track's door `k`, or at any of its doors. */
  private alighting(track:number,k?:number){return this.commuters.some(c=>c.steps.some(s=>'off' in s&&s.off?.[0]===track&&(k===undefined||s.off[1]===k)))}
  /** The first place nobody holds in the queue at door `k`. */
  private freeSlot(track:number,k:number){const held=new Set(this.queues[track][k].map(c=>c.queue![2]));let i=0;while(held.has(i))i++;return i}
  /** The train on `track`: the one the traveller arrives on, pulling in, or none yet, the first one due soon on the side they came up. */
  private train(track:0|1):Train{
    const deck=this.deck!,arriving=deck.arriving&&deck.track===track?deck.arriving:null,{car,doors,cars,origin}=trainLayout(deck.service);
    // The near train sorts at the platform's edge, whatever bites into it: those at the edge pass behind its roof.
    const sort=track?472:trainTop[0]*2,lift=trainTop[track]*2-sort,body=this.add.container(origin*2,sort),image=this.add.image(0,lift,'__DEFAULT').setOrigin(0).setScale(2);body.add(image);this.world.add(body);
    // A door open: the far track's shows the dark inside; the near track's, on the side out of sight, the light it spills over the gap to the platform.
    const rects=Array.from({length:cars},(_,c)=>doors.map(d=>(track?this.add.rectangle(2*(c*car+d),lift-8,doorSize*2,8,0xfff1cc):this.add.rectangle(2*(c*car+d),(trainRoof+3)*2,doorSize*2,(trainHeight-trainRoof-5)*2,0x1d2622)).setOrigin(.5,0).setScale(0,1))).flat();body.add(rects);
    const due=arriving?this.dueIn(dwell-3800,false):this.dueIn((track===deck.track?1500:7500)+dwell);
    const train:Train={track,line:arriving??(deck.service==='shinkansen'?lineAt(deck.platform.lines,due):pick(deck.platform.lines)),run:runOf(deck.platform.lines[0],deck.ja,track),due,phase:arriving?'arrive':'gap',t:arriving?3800:0,wait:0,tick:0,body,image,doors:rects,player:arriving?'off':undefined};
    this.dress(train);return train;
  }
  /** Paints a train for its line and sets where it goes from here. */
  private dress(train:Train){
    const key='train-'+train.line.id;if(!this.textures.exists(key))makeTrain(this,key,train.line.color,train.line.service);
    train.image.setTexture(key);train.run=runOf(train.line,this.deck!.ja,train.track);
  }
  /** The time on the boards of a train leaving in `ms` (real ms) at the earliest, whole minutes on the journey's clock, or the first train's if none runs then; a Shinkansen's, the next
   * on its timetable (`timetable`; not the one the traveller arrives on, already running). */
  private dueIn(ms:number,timetable=true){const due=inService(Math.ceil(minutes()+ms/minuteMs));return timetable&&this.deck?.service==='shinkansen'?onTimetable(due):due}
  /** How far a train is into its `dwell` (ms from pulling in), or `dwell` once past it or away. */
  private into(train:Train){return train.phase==='arrive'?train.t:train.phase==='alight'?6000+train.t:train.phase==='board'?8600+train.t:dwell}
  /** Debug (T, or a click on the clock): sets the clock to the time typed, the trains on the platform retimed to it (one away due as soon as it can come in, one in
   * the station as soon as it can leave). Closing time and nightfall follow on their own. */
  private debugTime(){
    if(this.modal)return;
    const time=prompt('Debug: set the clock (H:MM)',hhmm(minutes()));this.held.clear();this.input.keyboard?.resetKeys();if(time===null)return;
    if(!setTimeOfDay(time)){alert(`Not a time: ${time}`);return}this.fedAt=minutes();
    for(const train of this.trains)train.due=train.phase==='gap'?this.dueIn(dwell):Math.ceil(minutes()+(dwell-this.into(train))/minuteMs);
    this.keep();
  }
  /** Debug (G, in dev or with `?debug`): straight to any place, as its way in would leave the traveller there (the station's exit, the corridor's gates, the platform's track);
   * the first-person views open from those places' hotspots. */
  private debugGo(){
    if(this.modal)return;
    this.stopNavigation();this.direction={x:0,y:0};this.held.clear();this.modal=this.add.container(0,0).setDepth(20);
    const to=(label:string,search:string,go:()=>void):Destination=>({label,search:(label+' '+search).toLowerCase(),go}),out=(from:Hub,side:Side)=>()=>{this.outside={from,side}};
    const stationOfSight=(sight:Sight)=>stationAt(sight.walk?.[0]??Object.keys(sight.foot??{})[0]??'')??stationOf(sight.id);
    const homes=[[home,'home-street'],[home,'apartment'],[kyotoHome,'kyoto-lane'],[kyotoHome,'kyoto-house'],[kyotoHome,'kyoto-upstairs']] as const;
    const list:Destination[]=[
      ...homes.map(([at,place])=>to(`Home · ${places[place]}`,place,()=>{out(at.hub,at.side)();this.loadPlace(place)})),
      ...sights.flatMap(sight=>{const hub=stationOfSight(sight),side:Side=sight.pieces?'west':'east',go=(place:string)=>()=>{out(hub,side)();this.loadPlace(place)};return [
        ...sight.street?[]:[to(`Sight · ${sight.en}`,`${sight.id} ${sight.ja}`,go(sight.id))],
        ...sight.pieces?[to(`Sight · ${places[roadTo(sight.id)]}`,`${sight.id} ${sight.ja} road street`,go(roadTo(sight.id)))]:[],
        ...sight.garden?[to(`Sight · ${places[sight.garden]}`,`${sight.id} ${sight.ja} garden`,go(sight.garden))]:[],
        ...sight.ropeway?[to(`Sight · ${sight.en} · Ropeway ride up`,`${sight.id} ropeway`,()=>{out(hub,side)();this.loadPlace(roadTo(sight.id));this.ropeway(true)})]:[]]}),
      ...Object.values(stations).sort((a,b)=>a.en.localeCompare(b.en)).flatMap(station=>{const hub=station.id,search=`${hub} ${station.ja} station`;return [
        to(`${station.en} · Concourse`,search,()=>this.loadPlace(hub)),
        ...(['west','east'] as const).map(side=>to(`${station.en} · ${exitName(hub,side)[1]} · ${station.maps?.[side]?places[station.maps[side]!]:'Street'}`,`${search} exit street town`,()=>{out(hub,side)();this.loadPlace(station.maps?.[side]??'town')})),
        ...(['local','shinkansen'] as const).filter(service=>platformsAt(hub,service).length).flatMap(service=>[
          ...service==='local'?[to(`${station.en} · Corridor`,`${search} corridor gates`,()=>{this.gateway={hub,service};this.loadPlace('corridor')})]:[],
          ...platformsAt(hub,service).flatMap(platform=>platform.tracks.map((track,side)=>to(`${station.en} · Track ${track} · ${platform.lines.map(line=>line.en).join(', ')}`,`${search} platform ${service}`,()=>this.toPlatform({...deckFor(station.ja,platform.lines[0],side as 0|1),arriving:undefined}))))])]}),
    ];
    openTeleport(list,()=>{this.modal?.destroy(true);this.modal=null;this.held.clear();this.input.keyboard?.resetKeys()});
  }
  /** The line of the next train on a track: lines sharing the platform take turns (on the Shinkansen, by its timetable: its `due` is already the next one's as this one leaves). */
  private nextLine(train:Train){const lines=this.deck!.platform.lines;return this.deck!.service==='shinkansen'?lineAt(lines,train.due):lines[(lines.indexOf(train.line)+1)%lines.length]}
  private phase(train:Train,phase:Train['phase']){train.phase=phase;train.t=train.tick=0;train.served=undefined}
  /** The trains' cycles: in, doors open for those getting off then the queues, doors shut, out; the next one follows a moment later (lines sharing the platform take turns).
   * They keep to the journey's clock: each pulls in in time to leave at its time on the boards, and none runs between the last train and the first.
   * The departure boards follow them. */
  private runTrains(delta:number){
    // Far enough out that the whole train is off the platform at either end.
    const deck=this.deck!,{origin,car,cars}=trainLayout(deck.service),stop=origin*2,far=car*cars*2+stop+200;
    for(const train of this.trains){
      // Trains leave the way they go, as the station sign shows it (the next stop on the right); they come in from the other side, or at a terminus from that same side, to turn back.
      const out=train.run.dir,from=train.run.starts?out:-out;let open=0;train.t+=delta;
      // Back from another window or tab, the clock has run on without the trains (the scene stops or slows there): a late train's time on the boards moves on to the
      // earliest it can now leave, from where it is in its cycle (once it has boarded a moment, it simply leaves); one long overdue to pull in waits for its new time
      // (or the first train's, past the last one). A minute's leeway either way, so that a train on time keeps its time.
      const into=this.into(train);
      if(train.phase==='gap'){if(minutes()>train.due-dwell/minuteMs+1)train.due=this.dueIn(dwell)}else if(into<dwell){const earliest=minutes()+(dwell-into)/minuteMs;if(earliest>train.due+1)train.due=Math.ceil(earliest)}
      if(train.phase==='gap'){train.body.setVisible(false);if(minutes()>=train.due-dwell/minuteMs)this.phase(train,'arrive')}
      else if(train.phase==='arrive'){const p=Math.min(1,train.t/6000);train.body.setVisible(true).x=stop+from*far*(1-p)**2;if(p>=1){this.phase(train,'alight');this.alight(train)}}
      else if(train.phase==='alight'){open=Math.min(1,train.t/400);if(train.t>=2600||train.to&&!this.alighting(train.track))this.phase(train,'board')}
      else if(train.phase==='board'){open=1;this.boarding(train,delta)}
      // Pulling out, the boards turn to the next train, due once this one is out and the next has come in (a moment's gap between them).
      else if(train.phase==='close'){open=Math.max(0,1-train.t/500);if(train.t>=(train.player==='on'?500:1400)){this.phase(train,'leave');train.due=this.dueIn(6000+2500+dwell)}}
      else{
        // With the traveller on board it pulls out quicker, so the ride starts without a wait.
        const p=Math.min(1,train.t/(train.player==='on'?2500:6000));train.body.x=stop+out*far*p*p;
        if(p>=1){if(train.player==='on'&&train.to){const seat=train.seated;this.ride(train);this.toPlatform(train.to);if(seat)this.restedNote(seat);return}train.player=undefined;train.line=this.nextLine(train);this.dress(train);this.phase(train,'gap');if(this.stayed===train.track)this.stayed=-1}
      }
      train.doors.forEach(door=>door.setScale(open,1));
      // The boards, digital, in Japanese then English by turns: the time and where it goes, the line under it (a loop's trains by their way round); the next train's once this one pulls out.
      const line=train.phase==='leave'?this.nextLine(train):train.line,run=line===train.line?train.run:runOf(line,deck.ja,train.track),time=hhmm(train.due);
      // After the last train, the boards say so until the station closes.
      const en=Math.floor(this.time.now/4000)%2===1,text=train.phase==='gap'&&!trainsRun()?(en?'Service has ended\nfor today':'本日の運転は\n終了しました'):en?`${time} ${line.loop?run.destEn.split(',')[0]:'for '+run.destEn}\n${line.en}`:`${time} ${line.loop?run.dest.split(' ')[0]:run.dest+'行'}\n${line.ja}`;
      for(const board of this.overhead)if(board instanceof Phaser.GameObjects.Text&&board.getData('track')===train.track&&board.text!==text)board.setText(text);
    }
  }
  /** The doors open: a few people step off and make for the stairs (out of those away from the platform), and so does the traveller, arriving. */
  private alight(train:Train){
    const free=this.commuters.filter(c=>!c.queue&&c.image.alpha===0&&!!c.steps[0]&&'wait' in c.steps[0]),doors=this.doorXs();
    for(const c of free.slice(0,Math.round(between(.3,1)*this.crowd()/4))){
      const k=Math.floor(Math.random()*doors.length),door=this.doorPoint(train.track,k),out=this.clearPoint(train.track,k),y=between(300,340),{mouth,end}=this.stairwell(door.x);c.image.setPosition(door.x,door.y).setAlpha(0);
      c.steps=[{wait:between(0,800),face:train.track?'up':'down'},{...out,alpha:1,off:[train.track,k]},...this.route(out,{x:mouth,y}),{x:end,y,alpha:0},{wait:between(4000,12000),face:'down'}];
    }
    if(train.player==='off')this.stepOff(train);
  }
  /** Out by the door they stood behind, a couple of steps onto the platform, and free to go. */
  private stepOff(train:Train){
    const doors=this.doorXs(),k=doors.reduce((best,x,k)=>Math.abs(x-this.player.x)<Math.abs(doors[best]-this.player.x)?k:best,0),door=this.doorPoint(train.track,k),out=this.exitPoint(train.track,k);train.player=train.to=undefined;
    // Stepped out in one move (the door is past the platform's edge, where nobody can walk), then free.
    this.tweens.killTweensOf(this.player);this.player.setPosition(door.x,door.y);this.facing=train.track?'up':'down';this.stayed=train.track;
    this.tweens.add({targets:this.player,alpha:1,x:out.x,y:out.y,duration:500,onComplete:()=>{this.modal?.destroy(true);this.modal=null}});
  }
  /** Doors open to the queues (once those getting off are out): at each door the two lines take turns, the one in front stepping in through the middle every moment, and those behind move up. The doors shut once nobody is left waiting (and the traveller, in a queue on this side,
   * has had their chance), or after a while whatever happens; the traveller on board, as soon as they have chosen where to get off (train.to, then train.wait), those still queuing left for the next one. */
  private boarding(train:Train,delta:number){
    // Those ahead of the traveller in a queue step in twice as fast, so their turn comes soon.
    const queues=this.queues[train.track];train.tick+=delta;
    const mine=this.stayed!==train.track&&this.nearby().startsWith(`door${train.track}-`);
    if(train.tick>=(mine?325:650)&&train.player!=='on'){
      train.tick=0;
      const served=train.served??=queues.map(()=>0);
      queues.forEach((queue,k)=>{
        const ready=queue.filter(c=>c.image.alpha>.9),front=(side:number)=>ready.filter(c=>c.queue![2]%2===side).sort((a,b)=>a.queue![2]-b.queue![2])[0];
        const head=front(served[k]%2)??front(1-served[k]%2);if(!head)return;
        const side=head.queue![2]%2,door=this.doorPoint(train.track,k);served[k]=side+1;queue.splice(queue.indexOf(head),1);delete head.queue;
        head.steps=[{x:door.x,y:this.slot(train.track,k,0).y},{...door,alpha:0},{wait:between(6000,14000),face:'down'}];this.requeue(train.track,k,side);
      });
    }
    const waiting=queues.some(queue=>queue.length);
    // Not before its time on the boards.
    if(train.player==='on'?!!train.to&&train.t>=train.wait:minutes()>=train.due&&(train.t>=14000||train.t>=4000&&!waiting&&(!mine||train.t>=10000)))this.phase(train,'close');
  }
  /** Those still in one line (`side`) at door `k` move up a place each. */
  private requeue(track:number,k:number,side:number){
    this.queues[track][k].filter(c=>c.queue![2]%2===side).sort((a,b)=>a.queue![2]-b.queue![2]).forEach((c,row)=>{
      const i=side+row*2;if(c.queue![2]===i)return;c.queue![2]=i;const at=this.slot(track,k,i);c.steps=[...this.route({x:c.image.x,y:c.image.y},at),{wait:1e9,face:track?'down':'up'}];
    });
  }
  /** The stairwell nearer `x`: where people step out of it (`mouth`) and where they are out of sight on its steps (`end`). */
  private stairwell(x:number){const left=x<this.mapWidth/2;return {mouth:left?188:this.mapWidth-188,end:left?150:this.mapWidth-150}}
  /** Someone coming up the stairs to wait for a train: at the shortest queue of either track. */
  private platformTrip(c:Commuter){
    const track=Math.random()<.5?0:1,queues=this.queues[track],least=Math.min(...queues.map(queue=>queue.length)),k=pick(queues.flatMap((queue,k)=>queue.length===least?[k]:[]));
    const y=between(300,340),{mouth,end}=this.stairwell(this.doorXs()[k]),from={x:mouth,y},i=this.freeSlot(track,k),at=this.slot(track,k,i);
    c.image.setPosition(end,y).setAlpha(0);c.speed=(.045+(c.look*7%5)*.006)*(looks[c.look].pace??1)*between(.85,1.15);c.queue=[track,k,i];queues[k].push(c);
    c.steps=[{...from,alpha:1},...this.route(from,at),{wait:1e9,face:track?'down':'up'}];
  }
  /** The door marks of the tracks whose train has its doors open: hotspots while they are. */
  private openDoors(){return this.trains.flatMap(train=>train.phase==='alight'||train.phase==='board'?this.doorXs().map((_,k)=>`door${train.track}-${k}`):[])}
  /** How many wait in the queue at door `k` before the traveller (those nearer the edge). */
  private ahead(track:number,k:number){const edge=track?464:176,mine=Math.abs(this.player.y-edge);return this.queues[track][k].filter(c=>c.image.alpha>.5&&Math.abs(c.image.y-edge)<mine).length}
  /** The traveller's turn at that door: its train's doors open, nobody getting off through it, nobody ahead in its queue. */
  private boardable(spot:string){const [track,k]=spot.slice(4).split('-').map(Number),train=this.trains[track];return !this.stun&&(train?.phase==='board'||train?.phase==='alight'&&train.t>=400)&&!this.alighting(track,k)&&!this.ahead(track,k)}
  /** Where the traveller joins the queue at a door: the first free place in its two lines. */
  private queueEnd(spot:string){const [track,k]=spot.slice(4).split('-').map(Number);return this.slot(track,k,this.freeSlot(track,k))}
  /** Into the train at that door, once it is the traveller's turn: they choose where to get off (lineMap), the doors held open meanwhile, then ride it out of the station. */
  private tryBoard(spot:string){
    this.boardAt=spot;if(!this.boardable(spot))return;this.boardAt='';
    const [track,k]=spot.slice(4).split('-').map(Number),train=this.trains[track],door=this.doorPoint(track,k);
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0);train.player='on';this.facing=track?'down':'up';train.seated=this.seatFor(train,k);
    this.tweens.add({targets:this.player,x:door.x,y:door.y,alpha:0,duration:450});this.lineMap(train);
  }
  /** The car of door `k` on a Shinkansen, as the platform's floor numbers it (carAt). */
  private carOf(train:Train,k:number){return carAt(this.doorXs()[k]/2,train.run.dir)}
  /** The traveller's reserved seat if the ticket that brought them up here is booked on this very train, in the car of door `k`. */
  private seatFor(train:Train,k:number){
    const deck=this.deck!;if(deck.service!=='shinkansen')return undefined;
    const r=this.tickets.flatMap(t=>t.kind==='route'&&t.punched===deck.hub&&t.lineId===train.line.id&&trackOf(t)===stations[deck.hub].tracks[train.line.id][train.track]&&t.reservation?.due===train.due?[t.reservation]:[])[0];
    return r?.car===this.carOf(train,k)?`${r.car}号車 ${r.seat}`:undefined;
  }
  /** On board, the doors still open: the line ahead as the map over the doors shows it, from here (現在地, in red) to the end of the run.
   * The stops the game has can be chosen, the doors then shutting at once; staying here steps back off by the same door. */
  private lineMap(train:Train){
    const {line,run}=train,deck=this.deck!,c=this.add.container(0,0).setDepth(20),color=Phaser.Display.Color.HexStringToColor(line.color).color,stops=run.ahead;this.modal?.destroy(true);this.modal=c;
    // Chosen, the map goes and the doors shut at once (the traveller, out of sight, rides out); staying, the traveller steps back out and the train goes on as usual.
    const go=(ja:string)=>{train.to={...deckFor(ja,line,run.dir<0?0:1),arriving:line};train.wait=train.phase==='board'?train.t+200:200;c.destroy(true);this.modal=this.add.container(0,0)},stay=()=>{c.destroy(true);this.modal=this.add.container(0,0);this.stepOff(train)};
    this.dismissible(this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),this.rect(40,92,880,520,0xf0e6cb,c),stay);this.rect(40,92,880,7,color,c);
    this.label(64,112,`${line.ja}  ${run.dest}${line.loop?'':'行'}`,22,'#294a48',c);this.label(64,146,`${line.en}, for ${run.destEn} · Where do you get off?`,14,'#475b50',c);
    // A loop goes round: its ring, the stops to choose round it in the order the train reaches them.
    if(line.loop){
      const info=this.label(64,170,'',15,'#294a48',c),choices=this.loopRing(c,line,deck.ja,run.dir,go,info);choices.push([this.button(64,560,420,40,`Stay at ${deck.en}: get off`,stay,c),stay]);
      const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices,ring});this.focusChoice(c,0);return;
    }
    const x0=96,step=(880-x0)/stops.length,y=200,info=this.label(64,516,'',15,'#294a48',c),tagsAt=(ja:string)=>y+18+ja.length*18;
    this.rect(x0,y-4,step*stops.length,8,color,c);
    c.add(this.add.circle(x0,y,9,0xd6402e));this.label(x0,y-36,'現在地',12,'#d6402e',c).setOrigin(.5,0);this.label(x0,y+16,[...deck.ja].join('\n'),13,'#d6402e',c).setOrigin(.5,0).setLineSpacing(1);this.tagStack(c,x0,tagsAt(deck.ja),connectionsAt(deck.ja,[line]),512-tagsAt(deck.ja));
    const choices:PadChoice[]=[];
    stops.forEach((ja,i)=>{
      const x=x0+step*(i+1),to=alightAt(ja);
      c.add(this.add.circle(x,y,to?7:4,to?0xffffff:0x9aa29a).setStrokeStyle(to?3:0,color));this.label(x,y+16,[...ja].join('\n'),13,to?'#294a48':'#a9a48f',c).setOrigin(.5,0).setLineSpacing(1);
      // Under the name its connections, then the English, which needs what is left down to the foot.
      const tags=connectionsAt(ja,[line]),en=stopEn(ja),room=to?512-en.length*7-4:512,after=this.tagStack(c,x,tagsAt(ja),tags,room-tagsAt(ja));
      if(!to)return;
      this.label(x,after+4,en,11,'#59625e',c).setOrigin(0,.5).setAngle(90);
      const hit=this.rect(x-step/2+1,y-14,step-2,300,0xffffff,c).setAlpha(.001).setInteractive({useHandCursor:true}),pick=()=>go(ja);
      hit.setData('hover',()=>info.setText(`${ja} · ${stopEn(ja)}: get off here`)).on('pointerover',()=>hit.getData('hover')()).on('pointerdown',pick);choices.push([hit,pick]);
    });
    if(!choices.length)info.setText('None of these stops is open yet.');
    choices.push([this.button(64,544,420,40,`Stay at ${deck.en}: get off`,stay,c),stay]);this.busLegend(c,500,546,[deck.ja,...stops]);
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices,ring});this.focusChoice(c,0);
  }
  /** The time on the train, from here to the stop chosen: on the clock as the traveller gets off. */
  private ride(train:Train){
    const from=this.deck!.ja,to=train.to!.ja;
    addMinutes(train.line.service==='shinkansen'?shinkansenMinutes(train.line,from,to):localMinutes(from,to,train.run.ahead.indexOf(to)+1));
    // In the seat booked, on the train booked: the ride costs nothing in hunger and thirst, and puts some back (a reward more than a reason).
    if(train.seated){this.fedAt=minutes();feed(this.needs,{hunger:rested,thirst:rested})}
  }
  /** Once off a ride in the reserved seat, a word about it in the corner. */
  private restedNote(seat:string){
    const note=this.label(886,556,`Seat ${seat}, as booked: a restful ride. Hunger and thirst +${rested}.`,12,'#253634',this.hud).setOrigin(1,.5).setPadding(8,5,8,5).setBackgroundColor('#f3f1eaee').setWordWrapWidth(320);this.time.delayedCall(4500,()=>note.destroy());
  }
  /** A connection's icon at (x,y), its top left: the line's symbol on its colour; a bus's number after a little bus. */
  private lineTag(c:Phaser.GameObjects.Container,x:number,y:number,tag:Connection,h=13){
    const w=tagWidth(tag),{color,red,green,blue}=Phaser.Display.Color.HexStringToColor(tag.color),bright=red*.3+green*.59+blue*.11>165;this.rect(x,y,w,h,color,c);
    if(tag.bus){this.rect(x+2,y+2,8,h-4,0xffffff,c);this.rect(x+3,y+3,6,Math.max(1,h-9),color,c)}
    this.label(x+(tag.bus?11:0)+(w-(tag.bus?11:0))/2,y+h/2,tag.mark,Math.min(10,h-2),bright?'#1d2622':'#ffffff',c).setOrigin(.5);
  }
  /** Connection icons one under the other, centred on x from y, closing up to fit `room`: gives the y below them. */
  private tagStack(c:Phaser.GameObjects.Container,x:number,y:number,tags:Connection[],room:number){
    const pitch=Math.min(15,room/Math.max(1,tags.length));tags.forEach((tag,i)=>this.lineTag(c,x-tagWidth(tag)/2,y+i*pitch,tag,Math.min(13,Math.floor(pitch)-1)));return y+tags.length*pitch;
  }
  /** Where the buses on a map go, as their icons do not say. */
  private busLegend(c:Phaser.GameObjects.Container,x:number,y:number,stops:string[]){
    const buses=[...new Set(stops.flatMap(ja=>connectionsAt(ja,[]).filter(tag=>tag.bus)))].filter((tag,i,all)=>all.findIndex(other=>other.bus===tag.bus)===i);
    buses.forEach((tag,i)=>{this.lineTag(c,x,y+i*15,tag);this.label(x+42,y+i*15,tag.bus!.sights.map(([ja,en])=>`${ja} ${en}`).join(' · '),11,'#294a48',c)});
  }
  /** A loop line drawn as the ring it is, roughly as it lies on the map (the list of stops runs anticlockwise from Tokyo on the right: north at the top, Shinjuku on the left),
   * here (現在地) in red and arrows all round the way `dir` runs. With `pick`, the stops the game has can be chosen, in the order the train reaches them (each names itself in `info`). */
  private loopRing(c:Phaser.GameObjects.Container,line:RailLine,here:string,dir:1|-1,pick?:(ja:string)=>void,info?:Phaser.GameObjects.Text){
    const n=line.stops.length,cx=440,cy=356,rx=290,ry=150,color=Phaser.Display.Color.HexStringToColor(line.color).color,g=this.add.graphics();c.add(g);
    const at=(k:number)=>{const a=k/n*Math.PI*2;return {x:cx+rx*Math.cos(a),y:cy-ry*Math.sin(a),cos:Math.cos(a),sin:Math.sin(a)}};
    g.lineStyle(6,color).strokeEllipse(cx,cy,rx*2,ry*2);
    // An arrow between each two stops, along the ring the way the trains go.
    g.fillStyle(0x294a48);
    for(let k=0;k<n;k++){const p=at(k+.5),tx=-rx*p.sin*dir,ty=-ry*p.cos*dir,l=Math.hypot(tx,ty),ux=tx/l,uy=ty/l;g.fillTriangle(p.x+ux*6,p.y+uy*6,p.x-ux*4-uy*5,p.y-uy*4+ux*5,p.x-ux*4+uy*5,p.y-uy*4-ux*5)}
    const i=line.stops.indexOf(here),choices:PadChoice[]=[];
    line.stops.forEach((ja,k)=>{
      const p=at(k),me=ja===here,to=!me&&!!pick&&alightAt(ja);
      c.add(this.add.circle(p.x,p.y,me?8:to?6:4,me?0xd6402e:to?0xffffff:0xf0e6cb).setStrokeStyle(me?0:2,color));
      const name=this.label(p.x+p.cos*16,p.y-p.sin*14,me?`${ja} 現在地`:ja,12,me?'#d6402e':to||!pick?'#294a48':'#a9a48f',c).setOrigin(p.cos>.3?0:p.cos<-.3?1:.5,p.sin>.3?1:p.sin<-.3?0:.5);
        // Its connections in a row beside the name, on the ring's outer side.
        const tags=connectionsAt(ja,[line]),width=tags.reduce((sum,tag)=>sum+tagWidth(tag)+2,0),box=name.getBounds();let tx=p.cos>.3?name.x:p.cos<-.3?name.x-width:name.x-width/2;
        for(const tag of tags){this.lineTag(c,tx,p.sin>.3?box.top-14:box.bottom+1,tag);tx+=tagWidth(tag)+2}
    });
    if(!pick)return choices;
    for(let j=1;j<n;j++){
      const ja=line.stops[(i+dir*j+n*2)%n],p=at((i+dir*j+n*2)%n);if(!alightAt(ja))continue;
      const hit=this.rect(p.x-14,p.y-14,28,28,0xffffff,c).setAlpha(.001).setInteractive({useHandCursor:true}),go=()=>pick(ja);
      hit.setData('hover',()=>info?.setText(`${ja} · ${stopEn(ja)}: get off here (${j} stop${j>1?'s':''})`)).on('pointerover',()=>hit.getData('hover')()).on('pointerdown',go);choices.push([hit,go]);
    }
    return choices;
  }
  /** The route map (路線図) on the platform, the face for `track`: each line through the platform from end to end as the station sign runs (on a loop, half the loop
   * either side), here (現在地) in red, the stops this track's trains go to in the line's colour, the others greyed. */
  private routeMap(track:0|1){
    const deck=this.deck!,{platform}=deck,c=this.add.container(0,0).setDepth(20);this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.modal=c;
    const close=()=>{c.destroy(true);this.modal=null};
    this.dismissible(this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),this.rect(40,92,880,528,0xf0e6cb,c),close);this.rect(40,92,880,7,0x2c8a4a,c);
    this.label(64,112,`${platform.tracks[track]}番線  路線図`,22,'#294a48',c);this.label(64,146,`Track ${platform.tracks[track]} · Route map: its trains go to the stops in colour.`,14,'#475b50',c);
    const rowH=Math.min(220,400/platform.lines.length),shown:string[]=[];
    platform.lines.forEach((line,r)=>{
      const run=runOf(line,deck.ja,track);
      if(line.loop){this.label(64,170,`${run.dest} / ${run.destEn}`,13,'#294a48',c);this.loopRing(c,line,deck.ja,run.dir);return}
      const i=line.stops.indexOf(deck.ja),n=line.stops.length,color=Phaser.Display.Color.HexStringToColor(line.color).color;
      // Left to right as on the station sign; a loop from half its stops before here to half after, its trains lighting one half.
      const before=Math.floor((n-1)/2),seq=line.loop?Array.from({length:n},(_,k)=>line.stops[(i-before+k+n)%n]):line.stops,here=seq.indexOf(deck.ja);
      const lit=new Set(line.loop?(run.dir>0?seq.slice(here+1):seq.slice(0,here)):run.ahead),x0=84,step=(876-x0)/Math.max(1,seq.length-1),y=236+r*rowH,xOf=(k:number)=>x0+k*step;
      this.label(64,y-38,`${line.ja} ${line.loop?run.dest.split(' ')[0]:run.dest+'行'} / ${line.en}, ${line.loop?run.destEn.split(',')[0]:'for '+run.destEn}`,13,'#294a48',c);
      this.rect(x0,y-3,876-x0,6,0xc9c4a6,c);const end=run.dir>0?seq.length-1:0;this.rect(Math.min(xOf(here),xOf(end)),y-3,Math.abs(xOf(end)-xOf(here)),6,color,c);
      seq.forEach((ja,k)=>{
        const on=lit.has(ja),me=k===here,x=xOf(k);
        c.add(this.add.circle(x,y,me?7:on?5:3,me?0xd6402e:on?0xffffff:0xb0ab95).setStrokeStyle(on&&!me?2:0,color));
        this.label(x,y+10,[...ja].join('\n'),11,me?'#d6402e':on?'#294a48':'#b0ab95',c).setOrigin(.5,0).setLineSpacing(-1);
        const tagsY=y+13+ja.length*13;this.tagStack(c,x,tagsY,connectionsAt(ja,platform.lines),(r<platform.lines.length-1?y+rowH-42:608)-tagsY);shown.push(ja);
      });
    });
    this.busLegend(c,500,546,shown);
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);
    c.setData({choices:[[this.button(818,108,82,32,'Close',close,c),close]],ring});this.focusChoice(c,0);
  }
  /** Down the stairwell: to the foot of this platform's stairs in the corridor behind the gates (the side of the stairwell taken), where the other lines' stairs are too;
   * from the Shinkansen, straight to its transfer gates, facing out. */
  private descend(right:boolean){
    const deck=this.deck!;
    if(deck.service==='shinkansen'){this.exitGate();return}
    this.gateway={hub:deck.hub,service:deck.service};this.loadPlace('corridor',this.stairsSpot(deck,right));
  }
  /** The foot of a platform's stairs in the corridor, on the side of the traveller's track. */
  private stairsSpot(deck:Deck,right=!!deck.track){return {x:right?580:380,y:corridorLayout(platformsAt(deck.hub,deck.service).length).stair(deck.i)*2+30}}
  private useTicket(ticket:TravelTicket){this.tickets=this.tickets.filter(t=>t!==ticket);this.keep()}
  /** Saves the tickets and where the traveller stands. On a platform or a train, the traveller is kept at the foot of the stairs they would take down, in the corridor;
   * off the Shinkansen, already out of its transfer gates: in the concourse before them, the ticket of a trip that ended there kept by the gates. */
  private keep(){
    if(!this.player)return;
    const deck=this.place==='platform'?this.deck:null,out=deck?.service==='shinkansen'?deck.hub:undefined;
    const at=!deck?{place:this.place,x:Math.round(this.player.x),y:Math.round(this.player.y)}:out?{place:out as Place,x:836,y:262}:{place:'corridor' as Place,...this.stairsSpot(deck)};
    writeSave({tickets:out?this.tickets.filter(t=>!t.punched||t.punched===out):this.tickets,at:{...at,outside:this.outside,gate:this.gateway},clock:clockMs(),alarm:this.alarm,phone:this.phone,groceries:this.groceries,needs:this.needs,story:this.chapter});this.kept=this.time.now;if(this.hud?.active)this.refreshPurse();
  }
  /** The game stops while the menu is open: the journey's clock (`hold`), the needs and all that `update` moves, the scene's timers and tweens, and what is due on `time.now`. */
  private pause(on:boolean){this.time.paused=on;if(on){this.tweens.pauseAll();this.pausedAt=this.time.now}else{this.tweens.resumeAll();this.phoneDue+=this.time.now-this.pausedAt;this.pausedAt=0}}
  /** Biwako's ropeway, five minutes between its street and the summit (ropeway.ts); `flight` holds its skip, so that the pad reaches it and Lorenzo's own flight waits for it. */
  private ropeway(up:boolean){
    const sight=sightOf(up?sightOfRoad(this.place)!.id:this.place)!;
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    this.flight=playRopeway(up,()=>{this.flight=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();addMinutes(5);if(up)this.loadPlace(sight.id);else this.loadPlace(roadTo(sight.id),{x:480,y:296})});
  }
  /** The menu from the top band (or Esc, or the pad's Start): the pixel-art picture of pause-menu.ts over the paused scene. */
  private menu(){
    if(this.modal)return;
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20).setData('pause',true);
    const done=()=>{this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    openPauseMenu({where:this.whereabouts(),day:dayLabel(),time:hhmm(minutes()),yen:walletTotal(this.wallet),memories:[this.collected.size,memoryPages.length]},
      {resume:done,journal:()=>{done();this.album()},stamps:()=>{done();this.stampBook(null)},title:()=>{this.keep();location.reload()}});
  }
  /** Where the traveller stands, in Japanese and English, for the menu's card. */
  private whereabouts():[string,string]{
    const p=this.place;
    if(isHub(p))return [`${stations[p].ja}駅`,`${stations[p].en} Station`];
    if(p==='town'&&this.outside){const {from,side}=this.outside,[ja,en]=exitName(from,side);return [`${stations[from].ja}駅 ${ja}`,`${stations[from].en} Station · ${en}`]}
    if(p==='corridor'&&this.gateway){const s=stations[this.gateway.hub];return [`${s.ja}駅`,`${s.en} Station · To the platforms`]}
    if(p==='platform'&&this.deck)return [`${this.deck.ja}駅`,`${this.deck.en} Station · On the platform`];
    return [(sightOf(p)??sightOfRoad(p))?.ja??'',places[p]??p];
  }
  /** The bag from the top band (or X), or at a bin: tickets, groceries and wallet, over the paused scene. */
  private inventory(bin=false){
    if(this.modal)return;
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    const drop=(ja:string)=>{const i=this.groceries.findIndex(good=>good[0]===ja);if(i>=0)this.groceries.splice(i,1)};
    this.bag=openInventory(this.tickets,this.groceries,this.wallet,{bin,pace:()=>this.burden,consume:ja=>{feed(this.needs,filling(goodNamed(ja)));drop(ja);this.keep()},toss:thing=>{if(typeof thing==='string')drop(thing);else this.tickets.splice(this.tickets.indexOf(thing),1);machineSound('drop');this.keep()}},()=>{this.bag=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
  }
  private stationHelp(){
    const hub=isHub(this.place)?this.place:'tokyo';
    const hint=(t:TravelTicket)=>t.kind==='fare'?`¥${t.fare} ticket: read the fare map, then the local gates beside this office and the stairs of your line.`:t.kind==='adjust'?`Fare adjustment ticket: only for leaving ${t.toEn}.`:`${t.to.toUpperCase()}: ${t.platform}, ${t.service==='local'?'在来線 gates beside this office':'新幹線 gates on the far right'}.`;
    const body=this.tickets.length?`${this.tickets.slice(-3).map(hint).join('\n')}\nOn the board, check the line name too.\nToo cheap a fare ticket: pay the rest at the fare adjustment machine before the exit gates.`:`きっぷ: ticket machines on the back wall.\n在来線: local lines, tracks ${tracksFor(hub,'local','–')}, central gates beside this office.\n${hasShinkansen(hub)?`新幹線: Shinkansen, tracks ${tracksFor(hub,'shinkansen','–')}, gates on the far right.`:'No Shinkansen here: the far right is the NewDays.'}\nThe yellow signs point to the exits.`;
    const choices:[string,()=>void][]=[['Thanks, I’ll look',()=>{this.modal?.destroy(true);this.modal=null;}]];
    choices.push(['Ask for a fare hint',()=>this.fareHint(hub)]);
    this.dialog('駅員 / Station staff',body,choices);
  }
  /** The staff's fare hint: in the Tokyo area, the board's fare stations (and Tokyo); elsewhere every station the local lines reach from here. */
  private fareHint(hub:Hub){
    this.stopNavigation();this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const here=stations[hub],close=()=>{this.departures?.destroy();this.departures=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    const destinations=(onTokyoBoard(here.ja)?[{ja:'東京',en:'Tokyo'},...tokyoStations]:Object.values(stations)).filter(station=>station.ja!==here.ja&&fareBetween(here.ja,station.ja));
    this.departures=openDepartures(destinations,station=>{close();this.dialog('駅員 / Fare hint',`For ${station.en}, look for ¥${fareBetween(here.ja,station.ja)}\non the fare map of ${here.en}.\nFrom here, take the ${lineNames([...firstLegs(here.ja,station.ja)].map(railLine),' or ')}.\nSelecting the amount at the machine is up to you.`)},close);
  }
  private ticketTerminal(service:Service='local'){
    if(!isHub(this.place))return;
    const hub=this.place;
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.machine?.destroy();this.hall?.destroy();this.machine=null;this.machineId=null;
    this.modal=this.add.container(0,0).setDepth(20);
    this.hall=new MachineHall(hub,service,(kind,id)=>{
      if(this.machine&&this.machineId===id){this.machine.resume();return;}
      this.machine?.destroy();this.machineId=id;
      this.machine=new TicketMachine(hub,kind,ticket=>{this.tickets.push(ticket);this.keep()},()=>{
        this.machine=null;this.machineId=null;this.hall?.resume();this.input.keyboard?.resetKeys();
      },{fixedService:true,lookAtWall:()=>{this.machine?.suspend();this.hall?.resume(true);},wallet:this.wallet,onWallet:()=>this.refreshPurse(),trayKey:trayKey(hub,id)});
    },()=>{
      this.machine?.destroy();this.machine=null;this.machineId=null;this.hall=null;this.hallSpot='';this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();
    },{
      // The hall shows the concourse's own commuters, read live from their top-down sprites (the simulation keeps running under the hall).
      figures:()=>this.commuters.map(c=>({look:c.look,x:c.image.x,y:c.image.y,alpha:c.image.alpha,face:c.image.texture.key.split('-')[2] as Figure['face'],moving:!c.face&&!!c.steps.length&&!('wait' in c.steps[0])})),
      standAt:machine=>{this.hallSpot='machine'+machine},busy:machine=>this.inUse('machine'+machine),start:this.machineAhead(),
    },hallView,{icon:(this.textures.get('phone-mini').getSourceImage() as HTMLCanvasElement).toDataURL(),open:()=>this.openPhone(()=>this.hall?.phoneClosed()),
      corner:()=>{const r=this.game.canvas.getBoundingClientRect(),k=r.width/960;return {x:r.left+916*k,y:r.top+580*k,k,unread:Object.values(this.phone.unread).reduce((a,b)=>a+b,0)}}});
  }
  private refreshPurse(){this.burden=walkFactor(this.wallet,carried(this.tickets,this.groceries));this.refreshHud()}
  private refreshHud(){this.hudTime=hhmm(minutes());paintHud(this,{day:dayLabel(),time:this.hudTime,coins:coinCount(this.wallet),yen:walletTotal(this.wallet),heavy:this.burden<1,hover:this.hudHover,story:this.story?{held:this.storyHeld,speed:this.pace.speed,speeds,auto:this.pace.auto}:undefined})}
  /** The story's controls on the top band: held (as it starts) or under way, its speed, the album turning by itself or by hand; also Space, Enter, E or A for play / pause. */
  private storyToggle(){if(!this.story)return;this.storyHeld=!this.storyHeld;if(!this.storyHeld)this.storyIdle=this.storyAfter(200);this.refreshHud()}
  private storyPace(change:Partial<Pace>){if(!this.story)return;Object.assign(this.pace,change);savePace(this.pace);this.storySpeed();this.refreshHud()}
  private album(){if(!this.modal)this.photoBook(null)}
  /** The story mode's director, each time the traveller stands idle: one step towards the chapter's memory, through the places as a player would go (a hotspot walked to and used, `storyUse`),
   * the machines, gates and fare boxes passed without their screens (`storyAct`), the trains ridden as a card (`storyRide`); there, the album's slideshow (`storyMemory`), then the next chapter. */
  private storyNext(){
    const chapter=chapters[this.chapter];if(!chapter){this.storyOver();return}
    if(this.storyFresh){this.storyFresh=false;if(this.storyMorning(chapter.time))return}
    if(chapter.page==='road'){this.storyMemory('road');return}
    const goal=this.storyGoal(chapter.page),{sight}=goal;
    if(this.place===goal.place){this.storyUse(goal.spot);return}
    // Within the sight: in from its street, into its garden by the signpost, or back out.
    if(sightOfRoad(this.place)===sight){this.storyUse('entrance');return}
    if(sightOf(this.place)===sight&&sight.pieces){this.storyUse(this.place===sight.id&&goal.place===sight.garden?'way':'return');return}
    // In the street of its station: on foot, or by bus.
    if(this.place==='town'&&this.townId()===goal.hub&&sight.pieces){if(sight.walk?.includes(stations[goal.hub].ja))this.walkTo(sight.id);else this.storyUse('bus');return}
    // Anywhere else off the trains, back to a station.
    if(this.place==='corridor'||this.place==='platform'){this.loadPlace(this.gateway?.hub??this.nearestStation());return}
    if(!isHub(this.place)){this.storyUse(sightOfRoad(this.place)?'walkBack':this.place==='kyoto-upstairs'?'downstairs':'return');return}
    if(this.place!==goal.hub){
      // A ride that would arrive after 19:00 waits for the morning.
      const arrive=minuteOfDay()+this.storyTrip(goal.hub).reduce((sum,leg)=>sum+leg.minutes,0);
      if(!this.storyTicket&&arrive>=19*60&&this.storyMorning('9:00'))return;
      this.storyUse(this.storyTicket?this.storyLegs(goal.hub)[0].service:'ticket');return;
    }
    this.storyUse(goal.side==='east'?'eastExit':'westExit');
  }
  /** Where a page's memory is kept: the place and its camera, and the station to reach it from, by its exit `side` (the one nearest it: a short walk, else the bus stop with the fewest km on foot). */
  /** The album page the camera here keeps: the place, or the sight itself where it is only seen from its street. */
  private pageHere(){const road=sightOfRoad(this.place);return road?.street?road.id:this.place}
  private storyGoal(page:string){
    const sight=sights.find(sight=>sight.id===page||sight.parts?.some(part=>part.id===page))!;
    if(!sight.pieces){const hub=stationOf(page as Place),side=Object.entries(stations[hub].maps??{}).find(([,to])=>to===page)![0] as Side;return {sight,place:page as Place,spot:'photo',hub,side}}
    const ends=[...(sight.walk??[]).map((ja):[string,number]=>[ja,10]),...Object.entries(sight.foot??{}).map(([ja,km]):[string,number]=>[ja,km*12])].sort((a,b)=>a[1]-b[1]);
    const place=(sight.street?roadTo(sight.id):page===roadTo(sight.id)||page===sight.garden||page===sight.id?page:[sight.id,sight.garden].find(place=>place&&layoutOf(place)?.second?.page===page)!) as Place;
    const hub=stationAt(ends[0][0])!;
    return {sight,place,spot:layoutOf(place)?.second?.page===page?'photo2':'photo',hub,side:(Object.entries(stations[hub].maps??{}).find(([,to])=>to===sight.id)?.[0]??'west') as Side};
  }
  /** Walks to a hotspot and uses it, as a click on it would; one that the walk does not reach after a few tries is used from where the traveller stands. */
  private storyUse(spot:string){
    const key=`${this.place}/${spot}`;this.storyTry=this.storyTry[0]===key?[key,this.storyTry[1]+1]:[key,0];
    const to=approach[this.shapeKey(spot)],frame=this.frameFor(spot);
    if(spot===this.nearby()||this.storyTry[1]>=3||!to&&!frame){this.interact(spot);return}
    this.pending=spot;this.navigate(to?to[0]:frame[0]+frame[2]/2,to?to[1]:frame[1]+frame[3]/2);
  }
  /** What the story does in place of the screens a player goes through; false where the hotspot does as usual. */
  private storyAct(spot:string){
    const chapter=chapters[this.chapter];
    if(spot==='ticket'&&isHub(this.place)){
      // A moment at the machine, then the ticket.
      this.facing='up';this.sprite.setTexture('traveller-up-0');this.storyIdle=this.storyAfter(1400);this.time.delayedCall(900,()=>{machineSound('drop');this.storyTicket=true});
      const note=this.label(this.player.x,this.player.y-70,`Ticket · ${stations[this.storyGoal(chapter!.page).hub].en}`,14,'#fff0d4').setOrigin(.5).setPadding(6,3,6,3).setBackgroundColor('#263d39e0').setAlpha(0);
      this.tweens.add({targets:note,alpha:1,y:note.y-24,duration:600,hold:700,yoyo:true,onComplete:()=>note.destroy()});return true;
    }
    if((spot==='local'||spot==='shinkansen')&&chapter&&chapter.page!=='road'){this.storyRide(this.storyGoal(chapter.page).hub);return true}
    if(spot==='photo'||spot==='photo2'){this.storyMemory(spot==='photo2'?layoutOf(this.place)!.second!.page:this.pageHere());return true}
    if(spot==='walkBack'){const sight=sightOfRoad(this.place)!,station=stations[this.townId()];this.walking(`${station.en} Station`,sight.walk?.includes(station.ja)?10:walkFrom(station.ja,sight)?.minutes??60,()=>this.toStation(this.townId()));return true}
    if(spot==='bus'&&this.place==='town'&&chapter){this.busTo(this.storyGoal(chapter.page).sight);return true}
    return false;
  }
  /** The trains from this station to `to`: a local line where fares reach, else the Shinkansen between the two networks, by the stations nearest either end. */
  private storyLegs(to:Hub){
    const from=this.place as Hub,ja=(hub:Hub)=>stations[hub].ja;
    if(fareBetween(ja(from),ja(to))!==null)return [{service:'local' as Service,from,to}];
    let best:{route:typeof routes[number];km:number}|null=null;
    for(const route of routes){const a=kmBetween(ja(from),ja(route.from)),b=kmBetween(ja(route.to),ja(to));if(a!==null&&b!==null&&(!best||a+b<best.km))best={route,km:a+b}}
    const route=best!.route;
    return [...route.from!==from?[{service:'local' as Service,from,to:route.from}]:[],{service:'shinkansen' as Service,from:route.from,to:route.to,line:route.lineId},...route.to!==to?[{service:'local' as Service,from:route.to,to}]:[]];
  }
  /** Through the gates and off at `to`, the ride a card: its lines, the time it takes on the clock, the longest leg's train going by. */
  private storyTrip(to:Hub){
    return this.storyLegs(to).map(leg=>{
      const a=stations[leg.from].ja,b=stations[leg.to].ja,line='line' in leg&&leg.line?railLine(leg.line):railLine([...firstLegs(a,b)][0]??linesAt(a,'local')[0]!.id);
      return {...leg,line,minutes:leg.service==='shinkansen'?shinkansenMinutes(line,a,b):localMinutes(a,b,Math.max(1,Math.round((kmBetween(a,b)??3)/2)))};
    });
  }
  private storyRide(to:Hub){
    const legs=this.storyTrip(to),longest=legs.reduce((a,b)=>b.minutes>a.minutes?b:a),last=legs[legs.length-1];
    this.walking(`${stations[to].en}`,legs.reduce((sum,leg)=>sum+leg.minutes,0),()=>{this.storyTicket=false;this.loadPlace(to,last.service==='local'?{x:202,y:262}:{x:836,y:262})},legs.map(leg=>leg.line.en).join(' · '),{color:longest.line.color,service:longest.line.service});
  }
  /** A new chapter's hour: the time it asks for (later that day, or the next), else the next morning when it would start in the evening or at night. True while that card plays. */
  private storyMorning(time?:string){
    const now=minuteOfDay(),m=time?/^(\d+):(\d\d)$/.exec(time):null,at=m?+m[1]*60+ +m[2]:now>=17*60||now<8*60?9*60:null;
    if(at===null||Math.abs(at-now)<1)return false;
    const length=Math.round((at-now+1440)%1440);this.walking(at>now?'Later that day':'The next morning',length,()=>{},'寄り道','rest');return true;
  }
  /** The memory kept and its page shown as a slideshow, the chapter's words under the photos; then on to the next chapter. */
  private storyMemory(page:string){
    if(page!=='road'){this.collected.add(page);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]))}
    const chapter=chapters[this.chapter];this.stopNavigation();this.direction={x:0,y:0};this.facing='up';this.sprite.setTexture('traveller-up-0');this.modal=this.add.container(0,0).setDepth(20);
    new PhotoBook(this.collected,page,()=>{this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();if(chapter?.page===page){this.chapter++;this.storyFresh=true}this.storyIdle=this.storyAfter(600);this.keep()},chapter?.page===page?chapter:{},this.pace.auto);
  }
  /** The story's speed: Phaser's timers and tweens (the rides' cards, the buses, the steps on and off) run that much faster, the walk in `update` too; the story's own pauses (`storyAfter`) that much shorter. */
  private storySpeed(){const k=this.story?this.pace.speed:1;this.time.timeScale=k;this.tweens.timeScale=k}
  private storyAfter(ms:number){return this.time.now+ms/(this.story?this.pace.speed:1)}
  /** The last page seen: the traveller is the player's again, for this session (a reload plays the ending again). */
  private storyOver(){this.story=false;this.storySpeed();for(const page of memoryPages)this.collected.add(page.id);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.dialog(storyEnd.title,storyEnd.text,[['Look through the album',()=>{this.modal?.destroy(true);this.modal=null;this.photoBook(null)}]])}
  /** The stamp book over the paused scene: at a station's stand (`hub`), to stamp it, or from the menu, to look through it. */
  private stampBook(hub:Hub|null){
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    new StampBook(hub,()=>{this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
  }
  /** The album over the paused scene, from the camera of the place just kept (`start`) or from the journal. */
  private photoBook(start:string|null){
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    new PhotoBook(this.collected,start,()=>{this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
  }
  /** Where the buses at the stop in the street outside this station go; a sight a short walk away is not among them, that one is on foot. */
  private trips(){
    const ja=stations[this.townId()].ja,out:[Sight,string][]=[];
    for(const sight of sights)if(sight.pieces&&!sight.walk?.includes(ja)){const bus=busLines.find(bus=>bus.stops.includes(ja)&&bus.sights.some(([,en])=>en===sight.en));if(bus)out.push([sight,bus.no])}
    return out;
  }
  private busStop(){
    const ja=stations[this.townId()].ja,go=this.trips().map(([sight,no]):[string,()=>void]=>[`Bus ${no} · ${sight.en}`,()=>this.busTo(sight)]);
    if(!trainsRun()){this.timetable(`${ja}駅前`,busLines.filter(bus=>bus.stops.includes(ja)).map(bus=>[bus.no,bus.sights.map(([name])=>name).slice(0,2).join('・')]),[]);return}
    this.dialog('Where to?',`Flat fare ¥${busFare}, paid by the driver as you get off.`,go);
  }
  /** What the phone's Maps offers: out of doors, the map of the area the traveller is in, the sights on it and then its stations, each the nearest first. */
  private walks(){
    if(!this.outdoors())return null;
    const ja=stations[this.townId()].ja,sight=sightOf(this.place)??sightOfRoad(this.place),here=sight?.at??spotOf(ja),area=here&&areaAround(here);
    const places=area?sights.filter(other=>other.pieces&&other!==sight&&onMap(area,other.at!,6)).flatMap(other=>{const walk=walkFrom(ja,other);return walk?[{id:other.id,ja:other.ja,en:other.en,at:other.at!,minutes:walk.minutes}]:[]}):[];
    const stops=area?Object.values(stations).flatMap(station=>{const at=spotOf(station.ja);return at&&onMap(area,at,3)&&(sight||station.id!==this.townId())?[{id:station.id,ja:station.ja,en:station.en,at,minutes:Math.max(1,Math.round(kmApart(here!,at)*1.3*12)),station:true}]:[]}):[];
    const list=[...places.sort((a,b)=>a.minutes-b.minutes),...stops.sort((a,b)=>a.minutes-b.minutes)];
    return {here,area,list};
  }
  /** Walked there, however long it takes; the way back is then through the station nearest the sight, not the one left behind. */
  private walkTo(id:string){
    if(id in stations){const hub=id as Hub,minutes=this.walks()!.list.find(walk=>walk.id===id)!.minutes;this.walking(`${stations[hub].en} Station`,minutes,()=>{this.outside={from:hub,side:'west'};this.loadPlace('town')});return}
    const sight=sights.find(sight=>sight.id===id)!,walk=walkFrom(stations[this.townId()].ja,sight)!,via=stationAt(walk.via)!;
    this.walking(sight.en,walk.minutes,()=>{if(via!==this.townId())this.outside={from:via,side:'west'};if(sight.open)this.loadPlace(id);else this.loadPlace(roadTo(id),{x:480,y:340})});
  }
  /** On foot: the screen fades to the traveller walking along a pavement under the hour's sky, where to, how long and the clock running on, then fades in on the arrival (all the streets look alike, this says one has moved).
   * A little longer the longer the walk. */
  private walking(to:string,length:number,arrive:()=>void,how='On foot',picture?:'rest'|{color:string;service:Service}){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(30),camera=this.cameras.main,start=minutes(),night=darkness()>.5;this.modal=c;
    // Its own fades, forced and followed by their callbacks: a card asked for as the last one fades in (the story's director, fast) neither waits for nor fires another's.
    const fade=(then:()=>void)=>camera.fade(300,0,0,0,true,(_:unknown,p:number)=>{if(p===1)then()});
    fade(()=>{
      this.rect(0,0,960,640,night?0x142238:0xb7d4dc,c);this.rect(0,372,960,268,night?0x2a3442:0xbdb59a,c);this.rect(0,372,960,4,night?0x3c4858:0xe0dccb,c);
      const dashes=Array.from({length:9},(_,i)=>this.rect(i*120,440,60,6,night?0x4a5668:0xa9a187,c)),walker=this.add.image(480,338,'traveller-right-0').setScale(3);c.add(walker);
      // On a train, the train going by instead; resting, the moon or the sun over an empty street.
      if(picture==='rest'){walker.setVisible(false);c.add(this.add.circle(480,300,30,night?0xf4efd2:0xf6c27c))}
      else if(picture){walker.setVisible(false);const key=`story-train-${picture.service}-${picture.color}`;if(!this.textures.exists(key))makeTrain(this,key,picture.color,picture.service);c.add(this.add.image(480,410,key).setOrigin(.5,1).setScale(2))}
      const line=(y:number,text:string,size:number,color:string)=>this.label(480,y,text,size,color,c).setOrigin(.5),ink=night?'#f3dfb1':'#283d3c',clock=line(214,`${hhmm(start)} → ${hhmm(start)}`,22,ink);
      line(120,how,20,ink);line(164,to,34,ink);line(512,walkTime(length),20,night?'#c9d2d8':'#4a5c58');
      const spell=1500+Math.min(length,120)*7;let frame=0;
      const steps=this.time.addEvent({delay:120,loop:true,callback:()=>{frame++;walker.setTexture(`traveller-right-${frame%3}`);if(picture!=='rest')for(const dash of dashes)dash.x=(dash.x-(picture?90:30)+1080)%1080-60}});
      const counter=this.tweens.addCounter({from:start,to:start+length,duration:spell,onUpdate:tween=>{if(clock.active)clock.setText(`${hhmm(start)} → ${hhmm(tween.getValue()??start)}`)}});c.once('destroy',()=>{counter.remove();steps.remove()});
      camera.fadeFrom(300,0,0,0,true);
      this.time.delayedCall(Math.max(spell,400*this.time.timeScale),()=>{fade(()=>{addMinutes(length);spend(this.needs,length*2);c.destroy(true);this.modal=null;arrive();camera.fadeIn(400)})});
    });
  }
  /** The stop with no bus running: its timetable on the pole, a sheet for each line, beside the ways that remain. */
  private timetable(stop:string,lines:[string,string][],choices:[string,()=>void][]){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    const shade=this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),panel=this.rect(60,74,840,562,0xf0e6cb,c),color=inKyoto(this.townId())?'#1f7a5c':'#1d5fae',sheet=([no,to]:[string,string])=>makeTimetable(this,no,stop,to,color);
    const poster=this.add.image(72,85,sheet(lines[0])).setOrigin(0);c.add(poster);this.label(492,92,'Bus stop',18,'#294a48',c);
    const close=()=>{c.destroy(true);this.modal=null};this.dismissible(shade,panel,close);
    const lineChoices=lines.length>1?lines.map(([no,to]):[string,()=>void]=>[`Line ${no}`,()=>{poster.setTexture(sheet([no,to]))}]):[];
    const buttons:PadChoice[]=[...lineChoices,...choices].map(([label,fn],i):PadChoice=>[this.button(492,136+i*52,392,42,label,fn,c),fn]);buttons.push([this.button(802,590,82,32,'Close',close,c),close]);
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices:buttons,ring});this.focusChoice(c,0);
  }
  /** The stations a sight's buses call at, the one this journey came from first. */
  private busesTo(sight:Sight){
    const from=stations[this.townId()].ja,stops=new Set(busLines.filter(bus=>bus.sights.some(([,en])=>en===sight.en)).flatMap(bus=>bus.stops));
    return [...stops].sort((a,b)=>+(b===from)-+(a===from));
  }
  /** Back in the street of a station, as if off the bus at its stop; `outside` moves there when it is another station than the one left. */
  private toStation(hub:Hub){if(hub!==this.townId())this.outside={from:hub,side:'west'};this.loadPlace('town',{x:790,y:496})}
  /** The stop outside a sight: a bus to any station on its lines, while they run; once they have stopped, its timetable. */
  private leaveSight(){
    const sight=sightOfRoad(this.place)!,stops=this.busesTo(sight);
    if(!trainsRun()){this.timetable(`${sight.ja}前`,busLines.filter(bus=>bus.sights.some(([,en])=>en===sight.en)&&bus.stops.some(stop=>stops.includes(stop))).map(bus=>[bus.no,`${bus.stops[0]}駅`]),[]);return}
    this.dialog('Bus stop',`Flat fare ¥${busFare}, paid by the driver as you get off.`,stops.map(ja=>[`Bus to ${stopNames[ja]}`,()=>this.busRide(()=>this.toStation(stationAt(ja)!))]));
  }
  /** The sign to the station: a short walk at once, a long one asked first. */
  private walkBack(){
    const sight=sightOfRoad(this.place)!,station=stations[this.townId()],minutes=sight.walk?.includes(station.ja)?10:walkFrom(station.ja,sight)?.minutes??60,go=()=>this.walking(`${station.en} Station`,minutes,()=>this.toStation(this.townId()));
    if(minutes<=15)go();else this.dialog('To the station',`It is a long way on foot.`,[[`Walk to ${station.en} (${walkTime(minutes)})`,go]]);
  }
  /** On the bus: the traveller goes to wait on the pavement (`busSpot`), the bus pulls up along the near lane with its middle door at them, they get on and leave with it as the screen fades; the clock runs on, and at the stop the fare box by the driver keeps them on board until it is paid. Unable to pay, they are put off and find themselves back where they got on, dazed. */
  /** By bus to a sight: off at its stop in its street, or, an `open` one, straight in it, the bus left out of sight. */
  private busTo(sight:Sight){if(sight.open)this.busRide(()=>this.loadPlace(sight.id),false);else this.busRide(()=>this.loadPlace(roadTo(sight.id),{x:790,y:496}))}
  private busRide(arrive:()=>void,off=true){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.modal=this.add.container(0,0);const camera=this.cameras.main,[x,y]=busSpot;
    this.stepTo(x,y,()=>{
      this.sprite.setTexture('traveller-right-0');const bus=this.busAt(this.mapWidth+150);
      this.tweens.add({targets:bus,x:x-6,duration:2800,ease:'Cubic.easeOut',onUpdate:()=>this.rollBus(bus),onComplete:()=>{
        bus.setTexture(`bus-${bus.getData('livery')}-open`);
        this.time.delayedCall(400,()=>this.stepTo(x,y-30,()=>{this.player.setVisible(false);this.time.delayedCall(350,()=>{
          this.tweens.add({targets:bus,x:-150,duration:2200,ease:'Cubic.easeIn',onUpdate:()=>this.rollBus(bus)});
          this.time.delayedCall(1500,()=>camera.fadeOut(500,0,0,0));
        })}));
      }});
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{
        this.tweens.killTweensOf(bus);bus.destroy();this.bus=null;addMinutes(25);
        // In the story, the fare is paid without a word.
        const land=()=>{arrive();if(off)this.busLeaves();else{camera.fadeIn(500);this.keep()}};
        if(this.story){this.modal?.destroy(true);this.modal=null;land();return}
        this.fareBox=new BusFare(busFare,this.wallet,()=>this.refreshPurse(),paid=>{this.fareBox=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();if(paid)land();else{this.player.setPosition(x,y).setVisible(true);this.stun=stunned;camera.fadeIn(500)}});
      });
    });
  }
  /** Off the bus: the street opens on it stopped, its front door at the traveller, who steps down onto the pavement before it pulls away. */
  private busLeaves(){
    this.modal=this.add.container(0,0);const camera=this.cameras.main,[x,y]=busSpot,bus=this.busAt(x+102);this.player.setPosition(x,y-30);bus.setTexture(`bus-${bus.getData('livery')}-open`);camera.fadeIn(500);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,()=>this.time.delayedCall(250,()=>this.stepTo(x,y,()=>this.time.delayedCall(350,()=>{
      this.tweens.add({targets:bus,x:-150,duration:2600,ease:'Cubic.easeIn',onUpdate:()=>this.rollBus(bus),onComplete:()=>{bus.destroy();if(this.bus===bus)this.bus=null;this.modal?.destroy(true);this.modal=null;this.keep()}});
    }))));
  }
  /** The bus in the near lane at x, sorted with the people by the foot of its wheels: those on the pavement stand before it. */
  private busAt(x:number){const livery=inKyoto(this.townId())?'kyoto':'city';makeBus(this,livery);const bus=this.bus=this.add.image(x,490,`bus-${livery}-0`).setOrigin(.5,1).setData('livery',livery);this.world.add(bus);return bus}
  private rollBus(bus:Phaser.GameObjects.Image){bus.setTexture(`bus-${bus.getData('livery')}-${(Math.floor(bus.x/12)%4+4)%4}`)}
  /** The traveller's few steps to the stop or on and off the bus (which they pass behind, past the foot of its flank). */
  private stepTo(x:number,y:number,then:()=>void){const dx=x-this.player.x,dy=y-this.player.y,face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up',duration=Math.max(450,Math.hypot(dx,dy)*7);this.tweens.add({targets:this.player,x,y,duration,onUpdate:tween=>this.sprite.setTexture(`traveller-${face}-${Math.floor(tween.progress*duration/75)%3}`),onComplete:()=>{this.sprite.setTexture(`traveller-${face}-0`);then()}})}
  private busLights():Lamp[]{const bus=this.bus;return bus?[[bus.x-130,bus.y-24,22,0xfff4c0],[bus.x-175,bus.y-6,48,0xfff1cc,.55],[bus.x+130,bus.y-26,12,0xff4a3a,.8],[bus.x,bus.y-60,96,0xfff1cc,.7,.4]]:[]}

  private canWalk(x:number,y:number){
    // Down to the canvas edge, feet still in view (the hub's world sits 24px lower).
    return x>18&&x<this.mapWidth-18&&y>88&&y<(this.place==='corridor'||this.place==='apartment'||this.kyotoHouse(this.place)||this.mapHeight>640?this.mapHeight:628-this.world.y)&&!this.solids.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(r,new Phaser.Geom.Rectangle(x-10,y-10,20,25)))&&!this.traffic.some(c=>Math.abs(x-c.image.x)<66&&y>c.image.y-38&&y<c.image.y+4);
  }
  private stopNavigation(){this.path=[];this.marker?.setVisible(false);}
  private navigate(x:number,y:number){
    const {path,distance}=this.gridPath(this.player.x,this.player.y,x,y);
    // The start cell is only the snapped player position and may sit in an obstacle's margin: head for the next one, then cut corners diagonally.
    this.path=this.pull([{x:this.player.x,y:this.player.y},...(path.length>1?path.slice(1):path),...(distance<16*16&&this.canWalk(x,y)?[{x,y}]:[])]);
    const last=this.path[this.path.length-1];this.marker.setPosition(last.x,last.y).setVisible(true);
  }
  /** BFS over a 16px grid of walkable ground from (fx, fy) to the reachable cell nearest (x, y), so a tap on scenery stops beside the obstacle. */
  private gridPath(fx:number,fy:number,x:number,y:number){
    const cols=Math.ceil((this.mapWidth-36)/16),rows=Math.ceil((this.mapHeight-104)/16),step=16;
    const point=(id:number)=>({x:24+(id%cols)*step,y:104+Math.floor(id/cols)*step});
    // Start from the nearest walkable cell round the player: the rounded one may be off the ground (the canvas's foot, a solid's margin), and nothing would then be reached.
    const r=(fy-104)/step,q=(fx-24)/step,near=(v:number)=>[-1,0,1,2].map(d=>Math.floor(v)+d),cells=near(r).flatMap(j=>near(q).map(i=>[Phaser.Math.Clamp(j,0,rows-1),Phaser.Math.Clamp(i,0,cols-1)])).sort((a,b)=>Math.hypot(a[0]-r,a[1]-q)-Math.hypot(b[0]-r,b[1]-q));
    const [sj,si]=cells.find(([j,i])=>this.canWalk(24+i*step,104+j*step))??cells[0],start=sj*cols+si;
    const queue=[start],parents=new Map<number,number>([[start,-1]]);
    let best=start,distance=Infinity;
    for(let i=0;i<queue.length;i++){
      const id=queue[i],p=point(id),d=Phaser.Math.Distance.Squared(p.x,p.y,x,y);
      if(d<distance){best=id;distance=d;}
      for(const next of [id-1,id+1,id-cols,id+cols]){
        if(next<0||next>=cols*rows||parents.has(next))continue;
        const n=point(next);
        if(Math.abs(n.x-p.x)>step||!this.canWalk(n.x,n.y))continue;
        parents.set(next,id);queue.push(next);
      }
    }
    const path:{x:number,y:number}[]=[];
    for(let id=best;id!==-1;id=parents.get(id)!)path.unshift(point(id));
    return {path,distance};
  }
  /** A commuter's way from a to b: the grid path, pulled straight. */
  private route(a:{x:number,y:number},b:{x:number,y:number}){return this.pull([a,...this.gridPath(a.x,a.y,b.x,b.y).path.slice(1,-1),b]);}
  /** The points after the first, pulled straight wherever the ground between two of them is clear. */
  private pull(points:{x:number,y:number}[]){
    const out:{x:number,y:number}[]=[];
    const clear=(p:{x:number,y:number},q:{x:number,y:number})=>{const n=Math.ceil(Math.hypot(q.x-p.x,q.y-p.y)/8);for(let k=1;k<n;k++)if(!this.canWalk(p.x+(q.x-p.x)*k/n,p.y+(q.y-p.y)*k/n))return false;return true};
    for(let i=0;i<points.length-1;){let j=points.length-1;while(j>i+1&&!clear(points[i],points[j]))j--;out.push(points[j]);i=j}
    return out;
  }
  /** A ticket machine nobody is using, on the way to or stood at by the player, with where to stand before it. */
  private freeMachine(){const open=[0,1,2,3,4].map(i=>({spot:'machine'+i,x:368+i*56,y:262})).filter(({spot})=>!this.spots.has(spot)&&spot!==this.playerSpot);return open.length?pick(open):null}
  /** The machine the player stands before on the map (index), or -1. */
  private machineAhead(){const {x,y}=this.player;return x>330&&x<630&&y<310?Phaser.Math.Clamp(Math.round((x-368)/56),0,4):-1}
  /** Whether a commuter is at that spot using it right now (not merely on the way). */
  private inUse(spot:string){return this.commuters.some(c=>{const step=c.steps[0];return !!step&&'wait' in step&&step.spot===spot})}
  /** A commuter on the way to the machine the player has taken turns to another free one, or goes straight on to the end of the trip. */
  private giveWay(c:Commuter){
    const k=c.steps.findIndex(step=>'wait' in step&&step.spot===this.playerSpot);if(k<=0||c.image.alpha<1)return;
    this.spots.delete(this.playerSpot);
    // The trip ends with the way in from the concourse (its last point), the way out and a pause off-screen.
    const tail=c.steps.slice(-3),inner=tail[0] as {x:number;y:number},here={x:c.image.x,y:c.image.y},other=this.place==='corridor'?null:this.freeMachine();
    if(other)this.spots.add(other.spot);
    c.steps=[...(other?[...this.route(here,other),{wait:between(3000,7000),face:'up',spot:other.spot},...this.route(other,inner)]:this.route(here,inner)),...tail.slice(1)];
  }
  /** A random trip: in from an exit, the bottom of the concourse, off a train through the gates or out of the shop, maybe a stop at a free machine, counter or spot to look around,
   * then out through the gates, into the shop or out by an exit. */
  private planTrip(c:Commuter){
    // Enough people about for the hour: out of sight until there is room (crowd.ts).
    if(this.commuters.filter(o=>o!==c&&(o.image.alpha>0||o.queue)).length>=this.crowd()){c.image.setAlpha(0);c.steps=[{wait:between(2000,6000),face:'down'}];return}
    if(this.place==='corridor'){this.corridorTrip(c);return}
    if(this.place==='platform'){this.platformTrip(c);return}
    if(this.place==='town'){this.streetTrip(c);return}
    if(this.place==='home-street'||this.place==='kyoto-lane'){this.laneTrip(c);return}
    // The far right of the concourse: the Shinkansen transfer gates, or the shop's door, where people vanish inside.
    const far=this.right(this.place as Hub);
    const end=(kind:string)=>{
      if(kind==='west'||kind==='east'){const y=between(440,530),west=kind==='west';return {outer:{x:west?-24:984,y},inner:{x:west?34:926,y}}}
      if(kind==='bottom'){const x=between(300,660);return {outer:{x,y:700},inner:{x,y:540}}}
      if(kind==='shop')return {outer:{x:906,y:200,alpha:0},inner:{x:906,y:250}};
      const x=pick(kind==='local'?[158,202,246]:[770,814,858,902]);return {outer:{x,y:150,alpha:0},inner:{x,y:250}};
    };
    const free=(spots:{spot:string;x:number;y:number}[])=>{const open=spots.filter(({spot})=>!this.spots.has(spot)&&spot!==this.playerSpot);return open.length?pick(open):null};
    const machine=()=>this.freeMachine(),office=()=>free([22,62,102].map((x,i)=>({spot:'office'+i,x,y:228})));
    const look=()=>({spot:'',x:between(300,640),y:between(300,500)}),r=Math.random();
    let from:string,to:string,stop:{spot:string;x:number;y:number}|null=null,wait=0,face='up';
    // With the shutters down, the concourse is only a way through.
    if(!stationOpen()){from=pick(['west','east','bottom']);to=pick(['west','east','bottom'].filter(kind=>kind!==from))}
    else if(Math.random()<.35){
      // Off a train (or out of the shop): out of the station, sometimes by the ticket office or changing between local lines and the Shinkansen.
      from=pick(['local','local',far]);to=r<.1?(from==='local'?far:'local'):pick(['west','east','bottom']);
      if(r>.75){stop=office();wait=between(5000,10000)}else if(r>.6){stop=look();wait=between(1000,3000);face=pick(['left','right','down'])}
    }else{
      from=pick(['west','east','bottom']);
      if(r<.45){stop=machine();wait=between(3000,7000);to=r<.35?'local':far}
      else if(r<.6){stop=office();wait=between(5000,10000);to=far}
      else if(r<.78)to=r<.72?'local':far;
      else{to=pick(['west','east','bottom'].filter(kind=>kind!==from));if(r>.9){stop=look();wait=between(1000,3000);face=pick(['up','left','right'])}}
    }
    const start=end(from),finish=end(to);c.image.setPosition(start.outer.x,start.outer.y).setAlpha(start.outer.alpha??1);c.speed=(.045+(c.look*7%5)*.006)*(looks[c.look].pace??1)*between(.85,1.15);
    if(stop?.spot)this.spots.add(stop.spot);
    c.steps=[start.inner,...(stop?[...this.route(start.inner,stop),{wait,face,spot:stop.spot},...this.route(stop,finish.inner)]:this.route(start.inner,finish.inner)),finish.outer,{wait:between(500,5000),face:'down'}];
  }
  /** A trip behind the gates: off a train down a staircase and out through the gates (sometimes by the fare adjustment machine or the staffed window first), in through the gates
   * and up to a platform, or across from one platform to another; now and then a pause to read the signs. The same steps as planTrip's, so giveWay applies. */
  private corridorTrip(c:Commuter){
    const {top,gates,stair}=this.corridor(),stairs=this.corridorPlatforms().length*2;
    // The gate lanes between the cabinets, and each staircase (even: left, odd: right), faded in and out a little way up its steps.
    const end=(kind:number)=>{
      if(kind<0){const x=pick([390,434,478,522,566]);return {outer:{x,y:gates*2+100,alpha:0},inner:{x,y:gates*2-8}}}
      const left=kind%2===0,y=stair(kind>>1)*2+between(16,44);return {outer:{x:left?296:664,y,alpha:0},inner:{x:left?372:588,y}};
    };
    const free=(spot:string,x:number,y:number)=>!this.spots.has(spot)&&spot!==this.playerSpot?{spot,x,y}:null;
    const look=()=>({spot:'',x:between(380,580),y:between(top*2+50,gates*2-60)}),r=Math.random(),s=Math.random(),stairway=()=>Math.floor(Math.random()*stairs);
    let from=-1,to=-1,stop:{spot:string;x:number;y:number}|null=null,wait=0,face='up';
    if(r<.5){
      from=stairway();
      if(s<.12){stop=free('adjust',556,(gates-36)*2+30);wait=between(4000,8000);face='right'}
      else if(s<.2){stop=free('window',374,gates*2-14);wait=between(6000,12000);face='left'}
      else if(s<.3){stop=look();wait=between(1000,3000);face=pick(['left','right','up'])}
    }else{
      to=stairway();if(r>.85){from=stairway();if(from===to)to=(to+1)%stairs}
      if(s<.15){stop=look();wait=between(1000,3000);face=pick(['left','right','up'])}
    }
    const start=end(from),finish=end(to);c.image.setPosition(start.outer.x,start.outer.y).setAlpha(0);c.speed=(.045+(c.look*7%5)*.006)*(looks[c.look].pace??1)*between(.85,1.15);
    if(stop?.spot)this.spots.add(stop.spot);
    c.steps=[start.inner,...(stop?[...this.route(start.inner,stop),{wait,face,spot:stop.spot},...this.route(stop,finish.inner)]:this.route(start.inner,finish.inner)),finish.outer,{wait:between(500,5000),face:'down'}];
  }
  /** A walk through the street: between its ends (on either pavement), the station's entrance while it is open and the konbini's door, over the crossing to change pavements,
   * maybe a stop at the bus stop, a vending machine, the area map or just to look at a phone. */
  private streetTrip(c:Commuter){
    const end=(kind:string)=>{
      if(kind==='west'||kind==='east'){const y=between(330,372),west=kind==='west';return {outer:{x:west?-24:984,y},inner:{x:west?34:926,y}}}
      if(kind==='farWest'||kind==='farEast'){const y=between(498,506),west=kind==='farWest';return {outer:{x:west?-24:984,y},inner:{x:west?34:926,y}}}
      const x=kind==='konbini'?between(684,720):between(400,560);return {outer:{x,y:262,alpha:0},inner:{x,y:292}};
    };
    const walk=(a:{x:number;y:number},b:{x:number;y:number})=>{
      if(a.y>450===b.y>450)return this.route(a,b);
      const x=between(424,536),[near,far]=a.y>450?[{x,y:500},{x,y:388}]:[{x,y:388},{x,y:500}];return [...this.route(a,near),far,...this.route(far,b)];
    };
    const kinds=['west','east','west','east','farWest','farEast','konbini','station','station','station'],from=pick(kinds),to=pick(kinds.filter(kind=>kind!==from||kind==='station'));
    const free=(spots:{spot:string;x:number;y:number;face:string}[])=>{const open=spots.filter(({spot})=>!this.spots.has(spot));return open.length?pick(open):null},r=Math.random();
    const stop=r<.2?free(!this.trips().length?[]:[790,766,860].map((x,i)=>({spot:'bus'+i,x,y:500,face:'up'}))):r<.3?free([{spot:'vendingRed',x:801,y:336,face:'up'},{spot:'vendingBlue',x:845,y:336,face:'up'},{spot:'areaMap',x:270,y:300,face:'up'}]):r<.4?{spot:'',x:between(300,660),y:between(330,372),face:pick(['left','right','down'])}:null;
    const start=end(from),finish=end(to),wait=stop?.spot.startsWith('bus')?between(6000,16000):between(2000,5000);
    c.image.setPosition(start.outer.x,start.outer.y).setAlpha(start.outer.alpha??1);c.speed=(.045+(c.look*7%5)*.006)*(looks[c.look].pace??1)*between(.85,1.15);
    if(stop?.spot)this.spots.add(stop.spot);
    c.steps=[start.inner,...(stop?[...walk(start.inner,stop),{wait,face:stop.face,spot:stop.spot},...walk(stop,finish.inner)]:walk(start.inner,finish.inner)),finish.outer,{wait:between(500,5000),face:'down'}];
  }
  /** Someone going by along the lane to the traveller's home, from one end to the other. */
  private laneTrip(c:Commuter){
    const ltr=Math.random()<.5,[from,to]=ltr?[-24,this.mapWidth+24]:[this.mapWidth+24,-24],y=this.place==='kyoto-lane'?between(370,480):between(252,380);
    // The Kyoto lane's far end is round its bend, on the back street.
    const bend=this.place==='kyoto-lane'?[{x:690,y},{x:770+between(-10,10),y:385},{x:840+between(-8,8),y:325}]:[],back=between(298,318);if(bend.length&&!ltr)bend.reverse();
    c.image.setPosition(from,bend.length&&!ltr?back:y).setAlpha(1);c.speed=(.045+(c.look*7%5)*.006)*(looks[c.look].pace??1)*between(.85,1.15);
    c.steps=[...bend,{x:to,y:bend.length?(ltr?back:y):y+between(-12,12)},{wait:between(500,5000),face:'down'}];
  }
  /** Moves a commuter `delta` ms along its steps, planning the next trip when they run out. */
  /** A sight's commuter: off to a spot within the scene's `roam` of their own that they can reach on foot, then a look about; or a while longer where they stand. In a `busy` place, always off again at once. */
  /** The scramble's lights, a cycle of `signalPeriod` ms: the cars' green (amber at its end), all red a moment, then the walkers' green, blinking at its end. */
  private signal=0;private signals:Phaser.GameObjects.Image[]=[];
  /** The scramble's cars, each in its lane (`crossing.cars.lanes`), `v` its speed (scene px/ms); `trafficDue` the time till the next comes in, per lane. */
  private traffic:{image:Phaser.GameObjects.Image;lane:number;colour:number;v:number}[]=[];private trafficDue:number[]=[];
  /** Whether a car is still in the crossing, past its stop line: the walkers wait for it. */
  private carsInside(){const [l,r]=layoutOf(this.place)!.crossing!.cars.stop;return this.traffic.some(c=>c.image.x+62>l*2+2&&c.image.x-62<r*2-2)}
  private addCar(lane:number,x:number){const [foot,dir]=layoutOf(this.place)!.crossing!.cars.lanes[lane],colour=Math.floor(Math.random()*trafficColours.length),image=this.add.image(x,foot*2,`traffic-${colour}-0`).setOrigin(.5,1).setFlipX(dir<0);this.world.add(image);this.traffic.push({image,lane,colour,v:carTop})}
  /** The cars: each gathers speed to `carTop` and holds it, but stops short of the car ahead, of anyone in its way (the traveller included), and of its stop line while the light is not green (on amber, unless too close to stop);
   * past the screen's edge it is gone, another coming in on its lane a while later, if there is room. */
  private drive(delta:number){
    const {lanes,stop}=layoutOf(this.place)!.crossing!.cars,t=this.signal%signalPeriod,green=t<carsGo-2500,amber=!green&&t<carsGo,brake=.0006;
    const people=[{x:this.player.x,y:this.player.y},...this.commuters.filter(c=>c.image.alpha>.5).map(c=>({x:c.image.x,y:c.image.y}))];
    lanes.forEach(([foot,dir],lane)=>{
      const cars=this.traffic.filter(c=>c.lane===lane).sort((a,b)=>dir*(b.image.x-a.image.x)),last=cars[cars.length-1],y=foot*2;
      this.trafficDue[lane]-=delta;if(this.trafficDue[lane]<=0&&cars.length<6&&(!last||(dir>0?last.image.x>80:last.image.x<880))){this.addCar(lane,dir>0?-70:1030);this.trafficDue[lane]=between(1200,5000)}
      cars.forEach((c,i)=>{
        const front=c.image.x+dir*62,line=(dir>0?stop[0]:stop[1])*2,toLine=dir*(line-front);let room=Infinity;
        if(i)room=dir*(cars[i-1].image.x-dir*62-front)-14;
        if(!green&&toLine>=0&&!(amber&&c.v*c.v/(2*brake)>toLine+4))room=Math.min(room,toLine);
        for(const p of people){const ahead=dir*(p.x-front);if(p.y>y-40&&p.y<y+6&&ahead>-124)room=Math.min(room,Math.max(0,ahead-16))}
        c.v=room<=0?0:Math.min(carTop,c.v+.00025*delta,Math.sqrt(2*brake*room));c.image.x+=dir*Math.min(c.v*delta,Math.max(0,room));c.image.setTexture(`traffic-${c.colour}-${(Math.floor(c.image.x/8.5)%4+4)%4}`);
      });
    });
    this.traffic=this.traffic.filter(c=>{const gone=c.image.x>1040||c.image.x<-80;if(gone)c.image.destroy();return !gone});
  }
  private walkLeft(){const t=this.signal%signalPeriod;return t>=carsGo+allRed?signalPeriod-t:0}
  private paintSignals(){
    const t=this.signal%signalPeriod,walk=this.walkLeft(),state=`${t<carsGo-2500?'g':t<carsGo?'a':'r'}-${!walk?'s':walk>4000||Math.floor(t/300)%2===0?'w':'o'}`;
    this.signals.forEach((image,i)=>{const key=`signal-${layoutOf(this.place)!.crossing!.poles[i][2]}-${state}`;if(image.texture.key!==key)image.setTexture(key)});
  }
  /** One of the scramble's walkers, once done with their last steps: in from off the screen to wait at a kerb; across to the other while the walkers' light is green (and not about to turn);
   * across, half of them off the screen, the others waiting there for the next green. Waiting is a wait that never ends, cut short as the light turns green (update). */
  private scramble(c:Commuter){
    const {sides,exits,poles}=layoutOf(this.place)!.crossing!,mid=(sides[0][1]+sides[1][1]),here={x:c.image.x,y:c.image.y};
    const spot=(side:number)=>{const [x,y,w,h]=sides[side];for(let i=0;;i++){const p={x:between(x,x+w)*2,y:between(y,y+h)*2};if(i>12||this.canWalk(p.x,p.y)&&!poles.some(([px,py])=>Math.abs(p.x/2-px)<8&&Math.abs(p.y/2-py)<7))return p}};
    const wait=(side:number):Step=>({wait:1e9,face:side?'up':'down'});
    if(c.image.alpha<.5){const side=Math.random()<.5?0:1,[ex,ey]=pick(exits[side]);c.image.setPosition(ex*2,ey*2).setAlpha(0);c.steps=[...this.route({x:ex*2,y:ey*2},spot(side)),wait(side)];return}
    const side=here.y<mid?0:1;
    const cycle=Math.floor(this.signal/signalPeriod);if(this.walkLeft()>4000&&c.crossed!==cycle&&!this.carsInside()){c.crossed=cycle;c.steps=this.route(here,spot(1-side));return}
    if(c.crossed===cycle&&Math.random()<.5){const [ex,ey]=pick(exits[side]),way:Step[]=this.route(here,{x:ex*2,y:ey*2}).map((p,i,all)=>i===all.length-1?{...p,alpha:0}:p);c.steps=[...way,{wait:between(1000,6000),face:'down'}];return}
    c.steps=[...this.route(here,spot(side)),wait(side)];
  }
  private wander(c:Commuter){
    if(layoutOf(this.place)?.crossing){this.scramble(c);return}
    const {roam=55,busy}=layoutOf(this.place)??{roam:pavement},here={x:c.image.x,y:c.image.y},face=pick(['up','down','left','right']);
    for(let tries=0;tries<(busy?16:8)&&(busy||Math.random()<.75);tries++){
      const to=typeof roam==='number'?{x:c.home!.x+between(-roam,roam)*2,y:c.home!.y+between(-roam,roam)}:{x:between(roam[0],roam[0]+roam[2])*2,y:between(roam[1],roam[1]+roam[3])*2};if(!this.canWalk(to.x,to.y))continue;
      const {path,distance}=this.gridPath(here.x,here.y,to.x,to.y);if(distance>=16*16)continue;
      c.steps=[...this.pull([here,...path.slice(1,-1),to]),{wait:busy?between(0,300):between(1500,6000),face}];return;
    }
    c.steps=[{wait:between(2000,7000),face}];
  }
  private stepCommuter(c:Commuter,i:number,delta:number){
    if(c.face){c.image.setTexture(`commuter-${c.look}-${c.face}-0`);return}
    for(let budget=delta;budget>0;){
      if(!c.steps.length)c.home?this.wander(c):this.planTrip(c);
      const step=c.steps[0];
      if('wait' in step){
        const used=Math.min(budget,step.wait);step.wait-=used;budget-=used;c.image.setTexture(`commuter-${c.look}-${step.face}-0`);
        if(step.wait<=0){if(step.spot)this.spots.delete(step.spot);c.steps.shift()}
        continue;
      }
      const dx=step.x-c.image.x,dy=step.y-c.image.y,d=Math.hypot(dx,dy),alpha=step.alpha??1,speed=c.speed*(c.bump??1);
      if(speed*budget>=d){c.image.setPosition(step.x,step.y).setAlpha(alpha);budget-=d/speed;c.steps.shift();continue}
      const k=speed*budget/d;budget=0;
      c.image.setPosition(c.image.x+dx*k,c.image.y+dy*k).setAlpha(c.image.alpha+(alpha-c.image.alpha)*k);
      c.image.setTexture(`commuter-${c.look}-${Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down')}-${Math.floor(this.time.now/180+i)%3}`);
    }
  }
  /** Out of doors (the street, an exit's own map) night falls; the platforms, under their roof, only dim. */
  /** The phone, taken out of the corner over the paused scene, or over the ticket hall (`over`, told when it is put away: the hall keeps its own modal). */
  private openPhone(over?:()=>void){
    if(this.phoneUi||this.modal&&!over)return;
    if(!over){this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);this.mini.setVisible(false)}
    this.phoneUi=new Phone(this.phone,{send:contact=>this.send(contact),changed:()=>{this.keep();this.refreshPhone()},close:()=>{this.phoneUi=null;if(over)over();else{this.mini.setVisible(true);this.modal?.destroy(true);this.modal=null}this.input.keyboard?.resetKeys()},walks:()=>this.walks(),walk:id=>this.walkTo(id),here:()=>stations[this.nearestStation()].ja});
  }
  private refreshPhone(){const n=Object.values(this.phone.unread).reduce((a,b)=>a+b,0);this.badge.setVisible(n>0);this.badgeText.setText(String(n))}
  /** The suggested reply sent: only to Lorenzo, asked to come while he is still in Hong Kong, or to come and pick the traveller up once he is in Japan (his answer follows in lorenzo). */
  private send(contact:Contact){
    const trip=this.phone.lorenzo;if(contact!=='lorenzo'||trip.state!=='home'&&trip.state!=='here')return;
    this.phone.chats.lorenzo.push({me:true,text:trip.state==='home'?askLorenzo:callLorenzo,at:clockMs()});trip.state=trip.state==='home'?'asked':'called';this.phoneDue=this.time.now+1600;this.keep();this.phoneUi?.refresh();
  }
  /** A message from `contact`, unread until its conversation is shown; with the phone away, it buzzes in its corner, the message beside it for a moment. */
  private receive(contact:Contact,text:string){
    this.phone.chats[contact].push({text,at:clockMs()});this.phone.unread[contact]++;machineSound('message');this.keep();this.refreshPhone();
    if(this.phoneUi){this.phoneUi.refresh();return}
    const toast=this.label(886,556,`${contacts[contact].name}: ${text}`,12,'#253634',this.hud).setOrigin(1,.5).setPadding(8,5,8,5).setBackgroundColor('#f3f1eaee').setWordWrapWidth(320);this.time.delayedCall(4500,()=>toast.destroy());
    this.tweens.add({targets:this.mini,angle:{from:-8,to:8},duration:60,yoyo:true,repeat:5,onComplete:()=>this.mini.setAngle(0)});
  }
  /** The station nearest the traveller: the one they are in, behind the gates of or on a platform of, or the one whose street or exit's map they walked out to. */
  private nearestStation():Hub{return isHub(this.place)?this.place:this.place==='corridor'?this.gateway!.hub:this.place==='platform'?this.deck!.hub:this.outside?.from??stationOf(this.place)}
  /** Lorenzo's trip once asked: his OK a moment later, then, as soon as nothing but the phone is open, his flight from Hong Kong (to Haneda, or to Kansai on the Kyoto side), and he lands (land).
   * Called again once in Japan, he answers that he is already there if he waits at the station nearest the traveller, else he is on his way, his Uber coming to it a moment later (land again). */
  private lorenzo(){
    const trip=this.phone.lorenzo;if(this.time.now<this.phoneDue)return;
    if(trip.state==='asked'){trip.state='flying';this.receive('lorenzo','OK!');this.phoneDue=this.time.now+1800}
    else if(trip.state==='called'){
      const stop=this.pickup();
      if(stop===trip.at){trip.state='here';this.receive('lorenzo',`I’m already at ${this.pickupName(stop)}, my Uber is out front!`)}else{trip.state='driving';trip.at=undefined;this.receive('lorenzo','OK! On my way.');this.phoneDue=this.time.now+4000}
    }
    else if(trip.state==='driving'&&(!this.modal||this.phoneUi))this.land();
    else if(trip.state==='flying'&&!this.flight&&(!this.modal||this.phoneUi)){
      this.phoneUi?.close();this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0);
      this.flight=playFlight(fareBetween(stations[this.nearestStation()].ja,'東京')===null?'kansai':'haneda',()=>{this.flight=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();this.land()});
    }
  }
  /** Where Lorenzo's Uber comes to: the street outside the sight the traveller is at, else the nearest station. */
  private pickup():string{const sight=sightOf(this.place)?.pieces?sightOf(this.place):sightOfRoad(this.place);return sight?roadTo(sight.id):this.nearestStation()}
  private pickupName(stop:string){return sightOfRoad(stop)?.en??`${stations[stop].en} Station`}
  /** Lorenzo has landed and taken an Uber to the station nearest the traveller: in its street, the traveller sees it pull up, then his message comes; anywhere else it comes at once, the Uber waiting there. */
  private land(){
    const stop=this.pickup(),trip=this.phone.lorenzo;trip.state='here';trip.at=stop;this.keep();
    // Seen pulling up, he says it through the window; anywhere else, by message.
    if(this.place==='town'&&this.townId()===stop||this.place===stop)this.parkCar(()=>this.modal?this.receive('lorenzo',`I’m here! My Uber is waiting out front.`):this.talk('lorenzo',['Ciao! There you are!','The Uber’s right here. Hop in whenever you want a ride home.']));
    else this.receive('lorenzo',`I’m at ${this.pickupName(stop)}! My Uber is waiting out front.`);
  }
  /** Lorenzo's Uber, parked in the street: a ride home to the apartment, by road about as far as by rail (some 2.4 minutes a km through town), from anywhere around Tokyo;
   * on the Kyoto side, to the rental there. */
  private uber(){
    const here=stations[this.townId()].ja,near=kmBetween(here,stations[home.hub].ja)===null?kyotoHome:home,km=kmBetween(here,stations[near.hub].ja)??0,ride=Math.max(6,Math.round(km*2.4+4)),name=near===home?'Higashi-Nakano':'Jujo';
    this.talk('lorenzo',[`Ciao! Hop in, the driver knows the way to your place in ${name}. It’s on me!`],[[`Ride home (${ride} min)`,()=>this.rideHome(ride,near)],['Not now',()=>{}]]);
  }
  /** The ride home: the screen fades out on the street and in on the home street, the Uber pulled up at the apartment's door and the traveller just out of it; it drives off,
   * and Lorenzo (wishing a good night from 18:00 to 5:00, else a good morning or afternoon), dropped at Higashi-Nakano Station, waits there (his Uber in its street) until called again. */
  private rideHome(ride:number,to=home){
    this.modal?.destroy(true);this.modal=this.add.container(0,0);const camera=this.cameras.main;
    camera.fadeOut(700,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{
      addMinutes(ride);this.phone.lorenzo={state:'here',at:to.hub};this.outside={from:to.hub,side:to.side};if(to===home)this.loadPlace('home-street',{x:140,y:300});else this.loadPlace('kyoto-lane',{x:134,y:366});this.facing='down';
      this.modal=this.add.container(0,0);const car=this.car=this.add.image(...(to===home?[106,352]:[300,440]) as [number,number],'uber-car-0');this.world.add(car);camera.fadeIn(700);
      // Lorenzo has his word through the window, then the car drives off.
      const hour=minuteOfDay()/60,drive=()=>{this.modal=this.add.container(0,0);this.tweens.add({targets:car,x:this.mapWidth+80,duration:2400,ease:'Cubic.easeIn',onUpdate:()=>this.roll(car),onComplete:()=>{
        car.destroy();if(this.car===car)this.car=null;this.modal?.destroy(true);this.modal=null}})};
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,()=>this.talk('lorenzo',['Here we are!',`${hour>=18||hour<5?'Sleep well.':hour<12?'Have a good morning.':'Enjoy the rest of your afternoon.'} I’ll be around ${to===home?'Higashi-Nakano':'Jujo'} Station if you need me. Just send me a message!`],[],drive));
    });
  }
  /** The Uber on the station's side of the road, just past the crossing: parked, or pulling up from the left before `then`. Solid once parked, nudging aside a traveller standing there. */
  private parkCar(then?:()=>void){
    const image=this.car=this.add.image(then?-70:638,417,'uber-car-0');this.world.add(image);
    const park=()=>{
      if(this.car===image){
        const rect=new Phaser.Geom.Rectangle(578,418,120,28);image.setData('parked',true);this.solids.push(rect);
        // Only once it has pulled up: parked as the street is built, the traveller is not there yet (and a saved spot inside it is refused by canWalk).
        if(then&&Phaser.Geom.Intersects.RectangleToRectangle(rect,new Phaser.Geom.Rectangle(this.player.x-10,this.player.y-10,20,25)))this.player.y=392;
      }
      then?.();
    };
    // Timed apart from the tween, so that the message still comes if the traveller has left the street meanwhile.
    if(then){this.tweens.add({targets:image,x:638,duration:2600,ease:'Cubic.easeOut',onUpdate:()=>this.roll(image)});this.time.delayedCall(2600,park)}else park();
  }
  /** Turns the car's wheels to where it has rolled: an eighth of a turn every 8.5 px (a wheel 68 px round), the bar across the hubcap the same every half turn. */
  private roll(car:Phaser.GameObjects.Image){car.setTexture(`uber-car-${(Math.floor(car.x/8.5)%4+4)%4}`)}
  /** The bedside: the alarm's wheel (alarm.ts), set where it was last left, the hours of sleep it gives, and into bed. */
  private bedside(){
    this.stopNavigation();this.direction={x:0,y:0};const c=this.add.container(0,0).setDepth(20);this.modal=c;
    const shade=this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive(),panel=this.rect(170,110,620,420,0xf0e6cb,c);this.rect(170,110,620,7,0xba654c,c);
    this.label(566,140,'ベッド / Bed',22,'#294a48',c);const text=this.label(566,190,'',16,'#475b50',c).setWordWrapWidth(200);
    const close=()=>{this.wheel=null;c.destroy(true);this.modal=null};this.dismissible(shade,panel,close);
    this.wheel=wakeWheel(this,c,372,320,this.alarm,at=>{this.alarm=at;const left=Math.round(minuteOfDay(at-minuteOfDay()));text.setText(`It is ${hhmm(minutes())}.\n${Math.floor(left/60)} h ${String(left%60).padStart(2,'0')} of sleep.`)});
    const go=()=>this.sleep();
    const buttons:PadChoice[]=[[this.button(566,400,200,44,'Sleep',go,c),go],[this.button(684,462,82,32,'Close',close,c),close]];
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices:buttons,ring});this.focusChoice(c,0);
  }
  /** Into bed: the screen fades to black, the clock runs on to the next time on the alarm's wheel, and the traveller gets up beside the bed (in the Kyoto house, where they stood: its beds are three), free to go. */
  private sleep(){
    const at=this.wheel?.at()??this.alarm;this.wheel=null;this.alarm=at;
    this.modal?.destroy(true);this.modal=this.add.container(0,0);const camera=this.cameras.main;
    camera.fadeOut(900,0,0,0);camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,()=>{
      const lay=minutes();skipTo(at);this.fedAt=(lay+minutes())/2;if(this.place==='apartment'){this.player.setPosition(226,206);this.facing='left'}this.scroll();this.keep();camera.fadeIn(900);
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,()=>{this.modal?.destroy(true);this.modal=null});
    });
  }
  private outdoors(){return this.place==='town'||scenic(this.place)||!!sightOfRoad(this.place)||this.place==='home-street'||this.place==='kyoto-lane'}
  /** What lights the night where the traveller is, in scene px (art × 2): in the street the konbini's window, the vending machines, the bus stop, the street lights across the road, Lorenzo's Uber
   * and the station's entrance and name while it is open; on the exits' maps the stone lanterns, the temple's lanterns and the lamp. */
  private lamps():Lamp[]{
    if(sightOfRoad(this.place)){
      const warm=0xfff1cc,car=this.car;
      return [...townLights.flatMap((x):Lamp[]=>[[x*2+20,428,14,0xfff6d0],[x*2+20,510,70,warm,.7,.45]]),...this.busLights(),[480,262,70,warm],[480,298,110,warm,.5,.4],...(this.busesTo(sightOfRoad(this.place)!).length?[[busStop*2+16,424,28,0xe4f4ff,.8] as Lamp]:[]),...(car?[[car.x+60,car.y,22,0xfff4c0],[car.x+104,car.y+8,48,warm,.55],[car.x-62,car.y,12,0xff4a3a,.8]] as Lamp[]:[]),...(avenueOf(this.place)?.lamps??[]).map(([x,y,r,color=warm,a=1,flat=1]):Lamp=>[x*2,y*2,r*2,color,a,flat])];
    }
    if(this.place==='town'){
      const warm=0xfff1cc,cool=0xe4f4ff,lights=townLights.flatMap((x):Lamp[]=>[[x*2+20,428,14,0xfff6d0],[x*2+20,510,70,warm,.7,.45]]);
      return [...lights,[720,238,40,cool,.7],[810,238,40,cool,.7],[900,238,40,cool,.7],[810,284,110,cool,.8,.35],[800,284,26,cool,.8],[844,284,26,cool,.8],[822,330,50,cool,.6,.4],...this.busLights(),...(this.trips().length?[[busStop*2+16,424,28,cool,.8] as Lamp]:[]),[480,262,70,warm],[480,298,110,warm,.5,.4],[480,202,100,cool,.8],
        // Lorenzo's Uber, its headlights on and lighting the road ahead, its tail lights red.
        ...(this.car?[[this.car.x+60,this.car.y,22,0xfff4c0],[this.car.x+104,this.car.y+8,48,0xfff1cc,.55],[this.car.x-62,this.car.y,12,0xff4a3a,.8]] as Lamp[]:[])];
    }
    // Along the home street, its street lights, the vending machines and the lights over the apartment block's doors.
    if(this.place==='kyoto-lane')return [[385,286,28,0xfff1cc],[385,350,84,0xfff1cc,.7],[130,264,44,0xfff1cc,.8],[758,220,48,0xe4f4ff,.8],[798,122,26,0xe4f4ff,.6],[682,178,14,0xfff6d0],[682,372,96,0xfff1cc,.8,.4]];
    if(this.place==='home-street')return [...(this.car?[[this.car.x+60,this.car.y,22,0xfff4c0],[this.car.x+104,this.car.y+8,48,0xfff1cc,.55],[this.car.x-62,this.car.y,12,0xff4a3a,.8]] as Lamp[]:[]),...homeLights.flatMap((x):Lamp[]=>[[x*2,127,14,0xfff6d0],[x*2,242,100,0xfff1cc,.8,.4]]),[543,194,26,0xe4f4ff,.8],[497,194,26,0xe4f4ff,.8],[520,234,60,0xe4f4ff,.6,.4],...[632,660,688].map((x):Lamp=>[1440-(x-5)*2,170,44,0xfff1cc,.7])];
    if(scenic(this.place))return (layoutOf(this.place)!.lamps??[]).map(([x,y,r,color=0xfff1cc,a=1,flat=1]):Lamp=>[x*2,y*2,r*2,color,a,flat]);
    return [];
  }
  /** The concourse's shutters, ribbed, in art px over makeHub's landmarks: the office, the central gates, the machines, then the transfer gates or the shop front under its sign.
   * They roll down or up from their boxes as the station closes or opens, each a little after the last; `now` sets them at once, for arriving in the concourse. */
  private rollShutters(now=false){
    const g=this.shutter,to=stationOpen()?0:1;if(!g||!now&&this.rolled===to)return;
    this.rolled=now?to:Phaser.Math.Clamp(this.rolled+Math.sign(to-this.rolled)*this.game.loop.delta/3000,0,1);g.clear();
    const panels=[[0,56,62,52],[62,51,68,64],[168,76,144,44],hasShinkansen(this.place as Hub)?[362,51,118,64]:[362,66,118,42]];
    panels.forEach(([x,y,w,h],i)=>{
      const down=Phaser.Math.Clamp(this.rolled*1.6-i*.2,0,1),foot=y*2+8+Math.round((h*2-8)*down/2)*2;if(!down)return;
      g.fillStyle(0x8d938c).fillRect(x*2,y*2,w*2,foot-y*2);g.fillStyle(0x6f766f);for(let k=foot-8;k>y*2+8;k-=4)g.fillRect(x*2,k,w*2,2);
      g.fillStyle(0x4c5550).fillRect(x*2,y*2,w*2,8).fillRect(x*2,foot-4,w*2,4);
    });
  }
  /** Nightfall (darkness on the clock): out of doors the scene turns a deep blue but where the lamps shine, the lit platforms dim evenly, a little; indoors the lights are always on. */
  private nightfall(){
    this.over.setPosition(this.world.x,this.world.y);this.rollShutters();this.pane?.setAlpha(darkness()*.85);
    const k=darkness()*(this.outdoors()?1:this.place==='platform'?.4:0);this.shade.setVisible(k>0);this.neon?.setAlpha(k);if(!k)return;
    const tint=Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff),Phaser.Display.Color.ValueToColor(0x303c68),1,k);
    this.shade.clear().fill(Phaser.Display.Color.GetColor(tint.r,tint.g,tint.b));
    for(const [x,y,r,color,a=1,flat=1] of this.lamps())this.shade.stamp('light',undefined,x+this.world.x,y+this.world.y,{scaleX:r/16,scaleY:r/16*flat,tint:color,alpha:a*k,originX:.5,originY:.5});
  }
  /** Past closing time the shutters come down: the staff see the traveller back through the gates into the concourse, which stays open, cancelling the entry of a ticket punched here and keeping the ticket of a trip that ended here. */
  private closeStation(){
    const hub=this.nearestStation(),shinkansen=this.place==='platform'&&this.deck!.service==='shinkansen';
    for(const ticket of this.tickets)if(ticket.kind!=='adjust'&&ticket.punched===hub)delete ticket.punched;
    this.tickets=this.tickets.filter(ticket=>ticket.kind!=='adjust'&&!ticket.punched);
    this.loadPlace(hub,{x:shinkansen?840:200,y:300});
    this.dialog('駅員 / Closing time',`“The last train has gone: the gates are closing for the night.”\nThe staff see you back out to the concourse. The shutters go up again at ${hhmm(opens)}.`);
  }
  update(_time:number,delta:number){
    if(!this.player)return;
    const paused=!!this.modal?.getData('pause');if(paused!==!!this.pausedAt)this.pause(paused);
    if(paused){hold();this.gamepad();return}
    if(this.story&&this.storyHeld)hold();else tick();if(this.story)this.needs=freshNeeds();spend(this.needs,Math.max(0,minutes()-this.fedAt));this.fedAt=minutes();this.needBars.forEach((bar,i)=>{const level=i?this.needs.thirst:this.needs.hunger;bar.setScale(level/100,1).setFillStyle(level<25?0xd6402e:i?0x4aa8e0:0xe8a040);
      // Walking slowed by it (the emptier, below half): a red outline pulses round its icon, so that the slowness has a cause.
      const other=i?this.needs.hunger:this.needs.thirst,slowing=this.moving&&!this.modal&&level<50&&level<=other;this.needGlows[i]?.setAlpha(slowing?.55+.45*Math.sin(this.time.now/140):0)});
    if(hhmm(minutes())!==this.hudTime)this.refreshHud();
    // Closing time: once off the train, the staff see the traveller back through the gates.
    if(!stationOpen()&&(this.place==='corridor'||this.place==='platform'&&!this.trains.some(train=>train.player))){this.closeStation();return}
    if(this.place==='platform')this.runTrains(delta);
    this.pigeons?.update(Math.min(delta,100),this.player.x,this.player.y);this.cat?.update(Math.min(delta,100),this.player.x,this.player.y);
    if(isHub(this.place)||this.place==='corridor'||this.place==='platform'){
      // The spot the player has taken: a machine of the bank, or the corridor's fare adjustment machine or staffed window.
      const ahead=this.machineAhead(),near=this.place==='corridor'?this.nearby():'';
      this.playerSpot=near==='adjust'||near==='window'?near:this.place==='corridor'?'':this.hall?this.hallSpot:ahead>=0?'machine'+ahead:'';
      this.commuters.forEach((commuter,i)=>{if(this.playerSpot)this.giveWay(commuter);commuter.bump=Math.min(1,(commuter.bump??1)+delta/700);this.stepCommuter(commuter,i,Math.min(delta,100))});
      // The outlines over the people, so that a train's doors show theirs.
      this.world.sort('y');if(this.place==='platform')this.world.bringToTop(this.glow);
    }
    // In the street and along the lane, the passers-by; Lorenzo's Uber and the lane's sign keep their own order with the traveller (below).
    if(this.place==='town'||this.place==='home-street'||this.place==='kyoto-lane'){this.commuters.forEach((commuter,i)=>{commuter.bump=Math.min(1,(commuter.bump??1)+delta/700);this.stepCommuter(commuter,i,Math.min(delta,100))});this.world.sort('y')}
    if(this.signals.length){this.signal+=delta;this.paintSignals();this.drive(Math.min(delta,100));if(this.walkLeft()>4000&&!this.carsInside()){const cycle=Math.floor(this.signal/signalPeriod);for(const c of this.commuters){const step=c.steps[0];if(c.crossed!==cycle&&step&&'wait' in step&&step.wait>1e8)step.wait=between(0,1200)}}}
    if(layoutOf(this.place)?.people)this.commuters.forEach((commuter,i)=>{commuter.bump=Math.min(1,(commuter.bump??1)+delta/700);this.stepCommuter(commuter,i,Math.min(delta,100))});
    // In the apartment, the traveller passes behind the sofa, the island and the fridge.
    if(this.place==='apartment'||layoutOf(this.place)||sightOfRoad(this.place)){this.world.sort('y');if(this.lifted&&layoutOf(this.place))this.world.bringToTop(this.lifted);this.world.bringToTop(this.glow)}
    // The traveller passes behind Lorenzo's Uber from the pavement, in front of it from across the road.
    if(this.laneSign)this.player.y<this.laneSign.y?this.world.moveAbove<Phaser.GameObjects.GameObject>(this.laneSign,this.player):this.world.moveBelow<Phaser.GameObjects.GameObject>(this.laneSign,this.player);
    if(this.car)this.player.y<this.car.y+26?this.world.moveAbove<Phaser.GameObjects.GameObject>(this.car,this.player):this.world.moveBelow<Phaser.GameObjects.GameObject>(this.car,this.player);
    const pad=this.gamepad();this.lorenzo();
    this.wheel?.turn((this.keys.right.isDown?1:0)-(this.keys.left.isDown?1:0)||Math.sign(pad.x));
    if(this.place==='corridor'||this.place==='platform'||this.place==='home-street'||this.place==='apartment'||this.kyotoHouse(this.place)||this.mapWidth>960||this.mapHeight>640)this.scroll(Math.min(1,delta/150));
    if(this.modal){this.glow.clear();this.prompt.setVisible(false);this.held.clear();this.pending='';return;}
    let x=this.story?0:pad.x||this.direction.x,y=this.story?0:pad.y||this.direction.y;if(!this.story){if(this.keys.left.isDown)x=-1;if(this.keys.right.isDown)x=1;if(this.keys.up.isDown)y=-1;if(this.keys.down.isDown)y=1}
    if(this.story)this.held.clear();if(this.held.has('KeyA'))x=-1;if(this.held.has('KeyD'))x=1;if(this.held.has('KeyW'))y=-1;if(this.held.has('KeyS'))y=1;
    this.stun=Math.max(0,this.stun-delta);this.dizzy.clear();
    if(this.stun){
      // Dazed: stars circling over the head, every order dropped.
      x=y=0;this.stopNavigation();this.pending=this.boardAt='';
      for(let i=0;i<4;i++){const a=this.time.now/130+i*Math.PI/2,sx=Math.round(Math.cos(a)*22),sy=Math.round(-62+Math.sin(a)*7);this.dizzy.fillStyle(0x1d2622).fillRect(sx-2,sy-6,4,12).fillRect(sx-6,sy-2,12,4).fillStyle(0xf2c230).fillRect(sx-1,sy-5,2,10).fillRect(sx-5,sy-1,10,2)}
    }
    if(x||y){this.stopNavigation();this.pending=this.boardAt=''}
    // Jostling rather than solid people: brushing past someone slows both for a moment, and a walking player is nudged aside. One check per commuter, however crowded.
    this.bump=Math.min(1,this.bump+delta/700);
    for(const c of this.commuters){
      const dx=this.player.x-c.image.x,dy=(this.player.y-c.image.y)*1.6,d=Math.hypot(dx,dy);if(d>=18||c.image.alpha<.5)continue;
      this.bump=Math.min(this.bump,.35);c.bump=Math.min(c.bump??1,.4);
      // Standing in the middle, where people get off: shoved aside and left dazed, every order dropped and no boarding on their own afterwards (`stayed`): it takes another click, or E.
      const step=c.steps[0];if(!this.stun&&step&&'off' in step&&step.off){const to=this.player.x+(dx<0?-1:1)*18;this.stun=stunned;this.stayed=step.off[0];x=y=0;this.stopNavigation();this.pending=this.boardAt='';if(this.canWalk(to,this.player.y))this.tweens.add({targets:this.player,x:to,duration:120})}
      const push=(18-d)*.25/(d||1),nx=this.player.x+dx*push,ny=this.player.y+dy/1.6*push;if((x||y||this.path.length)&&d&&this.canWalk(nx,ny))this.player.setPosition(nx,ny);
    }
    const speed=(this.story?380*this.pace.speed:380*this.burden*needFactor(this.needs))*this.bump*Math.min(delta,40)/1000;
    if(this.path.length&&!(this.story&&this.storyHeld)){
      let target=this.path[0];
      while(target&&Phaser.Math.Distance.Between(this.player.x,this.player.y,target.x,target.y)<=speed){
        this.player.setPosition(target.x,target.y);this.path.shift();target=this.path[0];
      }
      if(target){x=target.x-this.player.x;y=target.y-this.player.y;}else this.stopNavigation();
    }
    const length=Math.hypot(x,y)||1;

    const nx=this.player.x+x/length*speed,ny=this.player.y+y/length*speed;
    if(this.canWalk(nx,this.player.y))this.player.x=nx;if(this.canWalk(this.player.x,ny))this.player.y=ny;
    const was=this.moving;this.moving=!!(x||y);if(this.moving)this.stayed=-1;this.walk+=delta;if(this.moving?this.time.now-this.kept>1000:was)this.keep();
    if(this.moving)this.facing=Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');
    this.sprite.setTexture(`traveller-${this.facing}-${this.moving?Math.floor(this.walk/75)%3:0}`);
    const messages:Record<string,string>={adjust:'Fare adjustment',window:'Staff window',ticket:'Buy a ticket',local:'Ticket gates',shinkansen:'Shinkansen gates',shop:'NewDays',stamp:'Station stamp',staff:'Staff',exit:'Exit',areaMap:'Area map',bus:'Bus stop',bin:'Bin',atm:'ATM',konbini:'Konbini',lane:'← The way home',home:'102 · Home',bed:'Bed',uber:'Uber · Lorenzo',return:'Back to the station',photo:'Keep a memory',photo2:'Keep a memory'};
    const near=this.nearby();
    // Only a deliberate queue click before arrival or a door click after arrival arms automatic boarding.
    if(this.pending.startsWith('door')&&near===this.pending){this.boardAt=near;this.pending=''}
    if(this.boardAt&&near!==this.boardAt)this.boardAt='';
    if(this.boardAt&&this.boardable(near)){this.tryBoard(near);return}
    if(this.pending&&near===this.pending&&!(this.story&&this.storyHeld)){this.pending='';this.stopNavigation();this.interact();return}
    if(!this.path.length)this.pending='';
    if(this.story&&!this.storyHeld&&!this.path.length&&!this.pending&&!this.stun&&this.time.now>=this.storyIdle&&!this.cameras.main.fadeEffect.isRunning){this.storyIdle=this.storyAfter(500);this.storyNext()}
    // On the platform, the only prompt is the one to board, once it is the traveller's turn.
    const say=this.place!=='platform'?near&&`${this.promptFor(near)??messages[near]}`:near.startsWith('door')&&this.boardable(near)?this.deck!.service==='shinkansen'?`Board · ${this.carOf(this.trains[+near[4]],+near.split('-')[1])}号車`:'Board':'';
    this.prompt.setText(say&&!this.story?`◎ ${say} · E / Ⓐ / click`:'').setVisible(!!say&&!this.story);
    if(say)this.prompt.setPosition(Phaser.Math.Clamp(this.player.x+this.world.x,this.prompt.width/2+8,952-this.prompt.width/2),Math.max(this.player.y+this.world.y-62,this.prompt.height+76));
    // Every hotspot outlined, fading between white and yellow; the one in reach in yellow, pulsing, over a faint wash.
    const k=(1-Math.cos(this.time.now/1000*Math.PI*2))/2,blink=Phaser.Display.Color.GetColor(255-12*k,255-40*k,255-148*k);this.glow.clear();
    for(const spot of this.hotspots()){
      const key=this.shapeKey(spot);
      if(spot===near){this.glow.fillStyle(0xf3d76b,.16);for(const [x,y,w,h] of hotspotShapes[key])this.glow.fillRect(x*2,y*2,w*2,h*2);this.glow.fillStyle(0xf3d76b,.7+.3*Math.sin(this.time.now/170))}
      else this.glow.fillStyle(blink,.6);
      for(const [x,y] of outlines[key])this.glow.fillRect(x*2,y*2,2,2);
    }
  }
}
// Started once the pixel font is in: the map lettering is painted into textures with it.
showTitle(()=>document.fonts.load('10px "Yorimichi Bitmap"').catch(()=>{}).finally(()=>{const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#91ab78',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Journey});if(debugAllowed)(window as unknown as {yorimichi:Phaser.Game}).yorimichi=game}));
// No browser menu on right click, over the scene or the hall and kiosk overlays: the right button is B (pad.ts).
document.addEventListener('contextmenu',e=>e.preventDefault());
