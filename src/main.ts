import Phaser from 'phaser';
import './style.css';
import { areaMapFace, areaMapWindow, corridorLayout, doorMarks, makeArt, makeAreaMap, makeBoard, makeCorridor, makeHub, makePlatform, makeTown, makeTrain, platformBoards, platformWidth, routeBoard, stationSign, trainLayout } from './art';
import { alightAt, deckFor, runOf, stopEn, type Deck, type Run } from './platform';
import { MachineHall } from './machine-hall';
import { TicketGate } from './ticket-gate';
import { openInventory } from './inventory';
import { Atm } from './atm';
import { Phone, askLorenzo, callLorenzo, contacts, playFlight, type Contact } from './phone';
import { loadSave, writeSave } from './save';
import { TicketMachine, fareDue, trayKey, type TravelTicket } from './ticket-machine';
import { fareBetween, localMinutes, shinkansenMinutes } from './fares';
import { addMinutes, clockMs, darkness, dayLabel, hhmm, inService, minuteMs, minutes, opens, setTimeOfDay, skipTo, startClock, stationOpen, tick, trainsRun } from './clock';
import { openDepartures, onTokyoBoard, tokyoStations } from './tokyo-fares';
import { coinCount, loadWallet, machineSound, walkFactor, walletTotal } from './wallet';

import { looks, type Figure } from './people';
import { places, konbiniFor, isHub, hasShinkansen, platformsAt, stationAt, stationOf, stations, trackOf, tracksFor, type Hub, type Place, type Service, type Side } from './network';
import { firstLegs, linesAt, railLine, type RailLine } from './rail';
// Highlight frames around the hotspots of nearby(), in scene pixels (art × 2), shown while the player is in range.
const hotspotFrames:Record<string,[number,number,number,number]>={staff:[0,130,124,92],ticket:[336,150,288,94],local:[124,132,136,100],shinkansen:[724,132,236,100],shop:[724,130,236,92],westExit:[14,444,162,64],eastExit:[778,444,168,64],photo:[682,376,56,58],return:[96,336,116,58],'return-town':[332,128,296,96],areaMap:[228,208,84,84],atm:[868,156,48,66],uber:[570,380,140,76]};
// Where a click on a hotspot walks to when its frame's centre lies inside an obstacle, out of reach (the area map: the spot in front of it).
const approach:Record<string,[number,number]>={areaMap:[270,300]};
// The hotspots' silhouettes in art px (rectangles from art.ts, unioned), outlined a pixel wide: faintly always, lit when in reach.
const hotspotShapes:Record<string,[number,number,number,number][]>={staff:[[0,56,62,52]],ticket:[[170,76,140,44]],local:[[64,70,52,45]],shinkansen:[[370,70,96,45]],shop:[[362,52,118,56]],westExit:[[8,231,68,24]],eastExit:[[390,231,68,24]],
  photo:[[345,195,20,15],[348,192,7,3],[352,210,3,7]],return:[[49,171,58,16],[58,187,3,8]],
  'return-town':[[166,64,148,26],[176,90,128,6],[190,96,100,16]],areaMap:[[118,108,34,28],[118,136,2,8],[150,136,2,8]],atm:[[438,81,17,6],[440,86,13,22]],uber:[[300,193,37,7],[290,200,59,6],[288,206,62,10],[296,216,11,7],[331,216,11,7]]};
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
type Step={x:number;y:number;alpha?:number}|{wait:number;face:string;spot?:string};
// `queue`: the track, door mark and place (slot) a commuter waits at on a platform.
type Commuter={image:Phaser.GameObjects.Image;look:number;steps:Step[];speed:number;face?:string;bump?:number;queue?:[number,number,number]};
/** A train on one track of the platform, through its cycle: away (`gap`, until it pulls in to leave on time), arriving, doors open for those getting off (`alight`) then the queues (`board`),
 * closing, leaving. `due`: its time on the boards, when it leaves, in minutes on the journey's clock (clock.ts). `player`: the traveller arriving on board (`off`, to get off) or boarded (`on`),
 * the doors shutting at `wait` once they have chosen where to get off. */
type Train={track:0|1;line:RailLine;run:Run;due:number;phase:'gap'|'arrive'|'alight'|'board'|'close'|'leave';t:number;wait:number;tick:number;body:Phaser.GameObjects.Container;image:Phaser.GameObjects.Image;doors:Phaser.GameObjects.Rectangle[];player?:'off'|'on';to?:Deck;served?:number[]};
// How many travellers walk the corridor behind the gates and wait on a platform (to become each station's own density).
const corridorCrowd=8,platformCrowd=24;
/** A train's ms from pulling in to the earliest its doors close (arriving, those getting off, a moment's boarding): its time on the boards is when it leaves, that long after it starts pulling in. */
const dwell=6000+2600+4000;
/** Lights at night, in scene px: x, y, radius, colour and strength. */
type Lamp=[number,number,number,number,number?];
const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)],between=(a:number,b:number)=>a+Math.random()*(b-a);
/** Line names in English, as the prompts and dialogs give them: "Utsunomiya / Takasaki Line" for a shared platform. */
const lineNames=(lines:RailLine[],or=' / ')=>lines.length>1?lines.map(line=>line.en.replace(/ Line$/,'')).join(or)+(lines.every(line=>line.en.endsWith(' Line'))?' Line':''):lines[0]?.en??'';
type PadChoice=[Phaser.GameObjects.Rectangle,()=>void];
class Journey extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private sprite!:Phaser.GameObjects.Image;
  private facing='down';
  private world!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
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
  // The door the traveller queues at to board (a click on the train, or E in its queue): they step in as soon as nobody is ahead.
  private boardAt='';
  /** The track whose train the traveller just stepped off (arrived on, or stayed behind from): not boarding it again on their own until they move or it has left (-1: none). */
  private stayed=-1;
  // The world's height in scene px: the corridor is taller than the screen when the station has many lines, and scrolls with the traveller.
  private mapHeight=640;
  // And its width: the platform runs two screens long, and scrolls sideways.
  private mapWidth=960;
  private departures:{destroy:()=>void}|null=null;
  private bag:{destroy:()=>void;close:()=>void}|null=null;
  private hall:MachineHall|null=null;
  private gate:TicketGate|null=null;
  private atm:Atm|null=null;
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
  // Concourse commuters, one per outfit of the first-person hall: each runs random trips (planTrip) as a queue of steps, or stands still facing `face`.
  private commuters:Commuter[]=[];
  // Machines and counters someone is using, so two commuters never share one.
  private spots=new Set<string>();
  // The machine the player stands at ('machine0'…): the one in front in the first-person hall (hallSpot), else the one stood before on the map.
  // Commuters never pick it, and one on the way there goes elsewhere (giveWay); one already using it finishes first.
  private playerSpot='';
  private hallSpot='';
  // Jostling: brushing past someone slows the walk for a moment (see update).
  private bump=1;
  private announcement!:Phaser.GameObjects.Text;
  // Only places that still exist: memories from removed trips (Kawaguchiko) are dropped, and the Kamakura one, kept before the station, is the temple trail's.
  private collected=new Set<string>((JSON.parse(localStorage.getItem('yorimichi-memories')||'[]') as string[]).map(place=>place==='kamakura'?'kamakura-trail':place).filter(place=>place==='kamakura-trail'||place==='arashiyama'));
  private wallet=loadWallet();
  // When the save was last written (keep): walking saves at most once a second, and once more on stopping.
  private kept=0;
  private purse!:Phaser.GameObjects.Text;
  private day!:Phaser.GameObjects.Text;
  private clockText!:Phaser.GameObjects.Text;
  // Night (clock.ts): the scene multiplied by a dark blue out of doors, lightened where lamps shine (`shade`, redrawn each frame); over it, following the world, the hotspot outlines (`over`).
  private shade!:Phaser.GameObjects.RenderTexture;
  private over!:Phaser.GameObjects.Container;
  // The station's shutters over its entrance in the street, down while it is closed.
  private shutter:Phaser.GameObjects.Graphics|null=null;
  // What glows by itself at night, over the shade (faded in with it): lit windows and signs.
  private neon:Phaser.GameObjects.Graphics|null=null;
  // The traveller's phone (phone.ts): its conversations and Lorenzo's trip, saved with the journey; taken out over the scene (`phoneUi`), and Lorenzo's flight while it is shown.
  private phone=loadSave().phone;
  private phoneUi:Phone|null=null;
  private flight:{skip:()=>void}|null=null;
  // When Lorenzo's next move is due (his OK, then his flight), in scene ms.
  private phoneDue=0;
  // The phone in the HUD's corner and its badge of unread messages.
  private mini!:Phaser.GameObjects.Container;
  private badge!:Phaser.GameObjects.Container;
  private badgeText!:Phaser.GameObjects.Text;
  // Lorenzo's Uber in the street of the station he waits at (`parked` once it has pulled up).
  private car:Phaser.GameObjects.Image|null=null;
  constructor(){super('Journey')}
  create(){
    makeArt(this);startClock(loadSave().clock);
    // A lamp's light: a disc fading out in steps, pixel-hard.
    {const t=this.textures.createCanvas('light',32,32)!,g=t.context;for(let y=0;y<32;y++)for(let x=0;x<32;x++){const d=Math.hypot(x-15.5,y-15.5)/16;if(d<1){g.fillStyle=`rgba(255,255,255,${Math.ceil((1-d)**2*8)/8})`;g.fillRect(x,y,1,1)}}t.refresh()}
    this.shade=this.add.renderTexture(0,0,960,640).setOrigin(0).setDepth(5).setBlendMode(Phaser.BlendModes.MULTIPLY).setVisible(false);this.over=this.add.container(0,0).setDepth(6);
    this.input.addPointer(3);
    this.keys=this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown',(event:KeyboardEvent)=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code))this.held.add(event.code);else if(['KeyE','Space','Enter'].includes(event.code)&&!event.repeat)this.interact();else if(event.code==='KeyT'&&!event.repeat)this.debugTime();else if(event.code==='KeyP'&&!event.repeat)this.openPhone()});
    this.input.keyboard!.on('keyup',(event:KeyboardEvent)=>this.held.delete(event.code));
    this.game.events.on('blur',()=>this.held.clear());
    // Back where the traveller last stood (Tokyo's concourse the first time).
    const at=loadSave().at;this.outside=at?.outside??null;this.gateway=at?.gate??null;
    // Only on the paid side does the ticket that took the traveller there stay punched: anywhere else, a reload gives it back.
    const paid=at?.place==='corridor',inside=paid&&this.tickets.some(ticket=>ticket.punched||ticket.kind==='adjust');if(!paid)for(const ticket of this.tickets)delete ticket.punched;
    if(at?.place==='corridor'&&!inside)this.loadPlace(this.gateway!.hub);else this.loadPlace(at?.place??'tokyo',at);
    // Saved on each move (throttled in update) and when the page is hidden or closed.
    document.addEventListener('visibilitychange',()=>this.keep());addEventListener('pagehide',()=>this.keep());
    // A click or tap on a hotspot uses it, walking there first if needed; elsewhere it walks.
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer, objects:Phaser.GameObjects.GameObject[])=>{
      const x=pointer.x-this.world.x,y=pointer.y-this.world.y;if(this.modal||objects.length||pointer.y<=70)return;
      const spot=this.hotspotAt(x,y);
      if(spot&&spot===this.nearby()){this.interact();return}
      // A train's door: to the end of its queue.
      const frame=spot?this.frameFor(spot):null,end=spot.startsWith('door')?this.queueEnd(spot):null;this.pending=spot;
      const to=approach[spot];this.navigate(end?end.x:to?to[0]:frame?frame[0]+frame[2]/2:x,end?end.y:to?to[1]:frame?frame[1]+frame[3]/2:y);
    });
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>this.input.setDefaultCursor(!this.modal&&this.hotspotAt(pointer.x-this.world.x,pointer.y-this.world.y)?'pointer':''));
  }
  private rect(x:number,y:number,w:number,h:number,color:number,container=this.world){const r=this.add.rectangle(x,y,w,h,color).setOrigin(0);container.add(r);return r}
  private label(x:number,y:number,text:string,size=16,color='#283d3c',container=this.world){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,lineSpacing:5});container.add(t);return t}
  /** Builds `place`, the player at `at` if given and walkable (a reload), else at the way in. */
  private loadPlace(place:Place,at?:{x:number;y:number}){
    this.machine?.destroy();this.machine=null;this.hall?.destroy();this.hall=null;this.gate?.destroy();this.gate=null;this.atm?.destroy();this.atm=null;this.bag?.destroy();this.bag=null;this.phoneUi?.destroy();this.phoneUi=null;this.machineId=null;this.departures?.destroy();this.departures=null;
    if(place!=='corridor'&&place!=='platform')this.gateway=null;
    // Back inside from the street or an exit's map: at that exit.
    const back=this.outside?.from===place?this.outside:null;if(isHub(place))this.outside=null;
    if(isHub(place))makeHub(this,place);
    this.modal?.destroy();this.modal=null;this.world?.destroy(true);this.hud?.destroy(true);this.over.removeAll(true);this.shutter=this.neon=null;this.car=null;
    this.place=place;this.boardAt='';this.stayed=-1;this.overhead=[];this.commuters=[];this.spots.clear();this.playerSpot=this.hallSpot='';this.bump=1;this.path=[];this.solids=[];this.direction={x:0,y:0};
    // The stations sit lower under the top band, leaving the back wall room for the station's name.
    this.world=this.add.container(0,isHub(place)?24:0);this.hud=this.add.container(0,0).setDepth(10);
    this.world.add(this.add.image(0,0,place==='town'?this.townMap():place==='corridor'?this.corridorMap():place==='platform'?this.platformMap():'map-'+place).setOrigin(0));this.mapWidth=place==='platform'?platformWidth*2:960;this.mapHeight=place==='corridor'?this.corridor().height*2:640;
    // The back wall, the ticket office and the gates beside it (set back on the left), the machine wall between its pillars, and the Shinkansen gates or the shop on the right.
    if(isHub(place))this.solids.push(new Phaser.Geom.Rectangle(0,70,960,64),new Phaser.Geom.Rectangle(0,70,124,146),new Phaser.Geom.Rectangle(124,70,140,162),new Phaser.Geom.Rectangle(260,70,464,180),new Phaser.Geom.Rectangle(724,70,236,hasShinkansen(place)?162:146));
    if(place==='kamakura-trail'||place==='arashiyama')this.solids.push(new Phaser.Geom.Rectangle(330,94,270,178));
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
      const w=this.mapWidth;this.solids.push(new Phaser.Geom.Rectangle(0,0,w,180),new Phaser.Geom.Rectangle(0,462,w,200),new Phaser.Geom.Rectangle(0,256,160,128),new Phaser.Geom.Rectangle(w-160,256,160,128),new Phaser.Geom.Rectangle(w/2-140,350,280,26));
      {const {x,y,w}=routeBoard;this.solids.push(new Phaser.Geom.Rectangle(x*2,y*2,w*2,24));hotspotFrames.route=[x*2-10,y*2-20,w*2+20,64];hotspotShapes.route=[[x,y,w,12]];outlines.route=outline(hotspotShapes.route)}
      hotspotFrames.downL=[0,256,232,128];hotspotShapes.downL=[[0,128,80,64]];hotspotFrames.downR=[w-232,256,232,128];hotspotShapes.downR=[[w/2-80,128,80,64]];outlines.downL=outline(hotspotShapes.downL);outlines.downR=outline(hotspotShapes.downR);
      this.doorXs().forEach((x,k)=>{for(const track of [0,1]){const spot=`door${track}-${k}`;hotspotFrames[spot]=[x-30,track?372:186,60,84];hotspotShapes[spot]=[[x/2-4,track?239:77,8,4]];outlines[spot]=outline(hotspotShapes[spot])}});
    }
    if(place==='town')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,154),new Phaser.Geom.Rectangle(40,224,88,48),new Phaser.Geom.Rectangle(820,224,40,20),new Phaser.Geom.Rectangle(236,228,68,60),new Phaser.Geom.Rectangle(152,300,56,20),new Phaser.Geom.Rectangle(752,300,56,20),new Phaser.Geom.Rectangle(900,360,12,14),new Phaser.Geom.Rectangle(0,524,960,116));
    // Two concourse pillars carrying the yellow exit signs, drawn in depth order with the people (see update) and solid at their foot.
    if(isHub(place))for(const [x,side] of [[254,'west'],[690,'east']] as const){this.world.add(this.add.image(x,380,`exit-pillar-${place}-${side}`).setOrigin(.5,1));this.solids.push(new Phaser.Geom.Rectangle(x-30,364,60,16))}
    // As in the hall, every outfit is in the concourse: two stand reading, the others come and go at random (planTrip), already spread out along their first trip.
    if(isHub(place))looks.forEach((_,look)=>{
      const face=look===looks.length-2?[312,272]:look===looks.length-1?[760,238]:null;
      const image=this.add.image(face?.[0]??0,face?.[1]??0,`commuter-${look}-${face?'up':'down'}-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1));
      const commuter:Commuter={image,look,steps:[],speed:(.045+(look*7%5)*.006)*(looks[look].pace??1),face:face?'up':undefined};this.world.add(image);this.commuters.push(commuter);
      if(!face)for(let t=between(0,20000);t>0;t-=200)this.stepCommuter(commuter,look,200);
    });
    // Behind the gates, outfits drawn at random (repeating only past the last one) come and go between the stairs and the gates (corridorTrip), already spread out along their first trip.
    if(place==='corridor'){const order=Phaser.Utils.Array.Shuffle(looks.map((_,i)=>i));for(let k=0;k<corridorCrowd;k++){
      const look=order[k%order.length],image=this.add.image(0,0,`commuter-${look}-down-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1)).setAlpha(0);
      const commuter:Commuter={image,look,steps:[],speed:0};this.world.add(image);this.commuters.push(commuter);for(let t=between(0,20000);t>0;t-=200)this.stepCommuter(commuter,k,200);
    }}
    // On a platform, the two trains, the departure boards and the people on it (platformTrip).
    if(place==='platform'){
      this.queues=[this.doorXs().map(()=>[]),this.doorXs().map(()=>[])];this.trains=[0,1].map(track=>this.train(track as 0|1));
      // The station sign, sorted with the people at its posts' feet: those beyond it pass behind.
      this.world.add(this.add.image(stationSign.x*2,(stationSign.y+stationSign.h)*2,this.platformMap()+'-sign').setOrigin(0,1));
      // The departure boards hang over everyone (kept on top in update): two per track, one by each stairwell, with their text.
      this.overhead=platformBoards.flatMap(({x,y,track})=>{
        const number=this.deck!.platform.tracks[track],key=`platform-board-${number}-${track}`;if(!this.textures.exists(key))makeBoard(this,key,number,!track);
        const board=this.add.image(x*2,(y-(track?0:7))*2,key).setOrigin(0),text=this.label(x*2+36,y*2+5,'',10,'#ffb347').setLineSpacing(1).setData('track',track);this.world.add([board,text]);return [board,text];
      });
      const order=Phaser.Utils.Array.Shuffle(looks.map((_,i)=>i));for(let k=0;k<platformCrowd;k++){
        const look=order[k%order.length],image=this.add.image(0,0,`commuter-${look}-down-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1)).setAlpha(0);
        const commuter:Commuter={image,look,steps:[{wait:between(0,8000),face:'down'}],speed:0};this.world.add(image);this.commuters.push(commuter);
        // A platform already in use: about half wait in the queues, some are on their way up to them, some off an earlier train head for the stairs, the rest come later.
        const r=Math.random();
        if(r<.55){this.platformTrip(commuter);const at=commuter.steps[commuter.steps.length-2] as {x:number;y:number};image.setPosition(at.x,at.y).setAlpha(1);commuter.steps=commuter.steps.slice(-1)}
        else if(r<.75){this.platformTrip(commuter);for(let t=between(500,5000);t>0;t-=200)this.stepCommuter(commuter,k,200)}
        else if(r<.9){
          const from={x:between(220,this.mapWidth-220),y:pick([between(200,240),between(410,440)])},{mouth,end}=this.stairwell(from.x);
          if(this.canWalk(from.x,from.y)){commuter.speed=(.045+(look*7%5)*.006)*(looks[look].pace??1);image.setPosition(from.x,from.y).setAlpha(1);commuter.steps=[...this.route(from,{x:mouth,y:from.y<320?300:340}),{x:end,y:from.y<320?300:340,alpha:0},{wait:between(4000,12000),face:'down'}]}
        }
      }
    }
    // The station's shutters, ribbed, over the glazed entrance (makeTown).
    if(place==='town'){const g=this.shutter=this.add.graphics();g.fillStyle(0x8d938c).fillRect(380,192,200,32);g.fillStyle(0x6f766f);for(let y=194;y<224;y+=4)g.fillRect(380,y,200,2);g.fillStyle(0x4c5550).fillRect(380,222,200,2);this.world.add(g)}
    // At night in the street, some of the station's windows are lit (makeTown's rows), and the shops' signs across the road.
    if(place==='town'){
      const g=this.neon=this.add.graphics().setAlpha(0);this.over.add(g);g.fillStyle(0xf2cf7c,.85);
      for(const y of [46,66])for(let x=4;x<320;x+=24)if((y===46||x<150||x>320)&&(x*13+y*7)%5<2)g.fillRect((x+1)*2,(y+1)*2,28,20);
      g.fillStyle(0xfff6d0);let x=0;for(const w of [70,56,84,62,90,64,54]){g.fillRect((x+8)*2,536,(w-16)*2,8);x+=w}
    }
    // Lorenzo's Uber, waiting in the street of the station he is at.
    if(place==='town'&&this.phone.lorenzo.state==='here'&&this.phone.lorenzo.at===this.townId())this.parkCar();
    // Out of doors, the outlines stay lit over the night.
    this.glow=this.add.graphics();(this.outdoors()?this.over:this.world).add(this.glow);
    this.marker=this.add.circle(0,0,9,0xf3d28e,.35).setStrokeStyle(2,0xffedb9).setVisible(false);this.world.add(this.marker);
    this.player=this.add.container(...(back?[back.side==='west'?150:810,520]:[480,isHub(place)?490:place==='town'?280:place==='corridor'?this.corridor().gates*2-56:place==='platform'?320:410]) as [number,number]);if(at&&this.canWalk(at.x,at.y))this.player.setPosition(at.x,at.y);this.world.add(this.player);
    if(place==='corridor')this.scroll();
    this.sprite=this.add.image(0,0,'traveller-down-0').setOrigin(.5,.85).setScale(2);this.player.add(this.sprite);
    // Up the stairs, out of the stairwell's mouth; on a train pulling in, out of sight until its doors open (alight), nothing to do meanwhile.
    // Up the stairs on the side of the corridor's stairs taken: out of that end's stairwell. On a train pulling in, behind one of its doors near the middle, out of sight until they open.
    if(place==='platform'){
      const deck=this.deck!;
      if(deck.arriving){const n=this.doorXs().length;this.player.setPosition(this.doorPoint(deck.track,Math.floor(between(n/2-3,n/2+3))).x,320).setAlpha(0);this.modal=this.add.container(0,0)}
      else{this.player.setPosition(deck.track?this.mapWidth-190:190,320);this.facing=deck.track?'left':'right'}
      this.scroll();
    }
    this.rect(0,0,960,70,0x263d39,this.hud);
    this.rect(0,66,960,2,0xb8ad83,this.hud);
    // The journey's clock, top left: the date over the time (kept up in update).
    this.day=this.label(24,10,'',11,'#b6bd98',this.hud);this.clockText=this.label(22,26,'',26,'#f3dfb1',this.hud).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.debugTime());
    this.purse=this.label(404,14,'',12,'#e6ce98',this.hud);this.refreshPurse();
    this.button(548,14,108,40,'Inventory',()=>this.inventory(),this.hud);
    this.label(676,26,`${this.collected.size}/2 memories`,12,'#cfceaa',this.hud);
    this.button(833,14,104,40,'Journal',()=>this.album(),this.hud);
    // The phone in the corner, a badge counting what is unread: a click on it (or P, or the pad's RB) takes it out.
    this.mini=this.add.container(916,580);this.hud.add(this.mini);this.mini.add(this.add.image(0,0,'phone-mini').setScale(2).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.openPhone()));
    this.badgeText=this.add.text(0,0,'',{fontFamily:'monospace',fontSize:12,color:'#ffffff'}).setOrigin(.5);this.badge=this.add.container(16,-30,[this.add.circle(0,0,10,0xd6402e).setStrokeStyle(2,0xfffef2),this.badgeText]);this.mini.add(this.badge);this.refreshPhone();
    // No bottom bar: the action prompt floats over the player when something is in reach (see update), the station announcements run in the top band.
    this.prompt=this.label(0,0,'',13,'#fff0d4',this.hud).setOrigin(.5,1).setPadding(8,4,8,4).setBackgroundColor('#263d39e0').setVisible(false);
    this.announcement=this.label(176,13,'',10,'#96aa95',this.hud);
    this.keep();
  }
  /** The street outside the station left by `outside`, its sign naming the station and exit: drawn the first time (makeTown). */
  private townMap(){
    const {from,side}=this.outside!,key=`map-town-${from}-${side}`;
    if(!this.textures.exists(key))makeTown(this,key,`${stations[from].ja}駅 ${side==='west'?'西口':'東口'}`,`${stations[from].en.toUpperCase()} STATION · ${side.toUpperCase()} EXIT`,stations[from].accent,konbiniFor(from));
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
  /** The station whose street the player is in. */
  private townId(){return this.outside?.from??'tokyo'}
  private button(x:number,y:number,w:number,h:number,text:string,fn:()=>void,parent:Phaser.GameObjects.Container){
    this.rect(x-2,y-2,w+4,h+4,0x9b9e7d,parent);this.rect(x,y+3,w,h,0x182f2c,parent);const b=this.rect(x,y,w,h,0x415c4f,parent).setInteractive({useHandCursor:true});this.label(x+w/2,y+h/2,text,16,'#fff0d4',parent).setOrigin(.5);b.on('pointerdown',fn);return b;
  }
  private shapeKey(spot:string){return (spot==='return'||spot==='adjust'||spot==='window')&&(this.place==='town'||this.place==='corridor')?spot+'-'+this.place:spot}
  private frameFor(spot:string){return hotspotFrames[this.shapeKey(spot)]}
  /** Every hotspot of the current place. */
  private hotspots(){return isHub(this.place)?['staff','ticket','local',this.right(this.place),'westExit','eastExit']:this.place==='town'?['return','atm','areaMap',...(this.car?.getData('parked')?['uber']:[])]:this.place==='corridor'?['return','adjust','window',...this.corridorPlatforms().flatMap((_,i)=>[`stairs${i}L`,`stairs${i}R`])]:this.place==='platform'?['downL','downR','route',...this.openDoors()]:['return','photo']}
  private hotspotAt(x:number,y:number){
    // A standing train is clicked anywhere along it, at its nearest door (the door marks themselves are not clickable).
    const train=this.place==='platform'&&this.trains.find(train=>(train.phase==='alight'||train.phase==='board')&&(train.track?y>=470&&y<540:y>=96&&y<176));
    if(train){const doors=this.doorXs();return `door${train.track}-${doors.reduce((best,door,k)=>Math.abs(door-x)<Math.abs(doors[best]-x)?k:best,0)}`}
    // Only the train itself boards: a click on the platform in front of a door just walks.
    return this.hotspots().filter(spot=>!spot.startsWith('door')).find(spot=>{const [fx,fy,w,h]=this.frameFor(spot);return x>=fx&&x<fx+w&&y>=fy&&y<fy+h})??'';
  }
  private nearby(){
    const {x,y}=this.player;
    if(isHub(this.place)){
      if(x<115&&y>455)return 'westExit';
      if(x>845&&y>455)return 'eastExit';
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
    }else if(this.place==='town'){
      if(this.car?.getData('parked')&&Phaser.Math.Distance.Between(x,y,638,417)<84)return 'uber';
      if(x>380&&x<580&&y<262)return 'return';
      if(x>850&&x<945&&y<275)return 'atm';
      // In front of the area map or beside it (between it and the planter on its left, out of the path grid's reach of its front).
      if(x>196&&x<344&&y>230&&y<340)return 'areaMap';
    }else{
      if(x<240&&y<453)return 'return';
      if(Phaser.Math.Distance.Between(x,y,710,409)<95)return 'photo';
    }
    return '';
  }
  /** The corridor's prompts: each staircase names its track and line, and the way back is through the gates. */
  private promptFor(spot:string){
    if(this.place!=='corridor')return null;
    if(spot==='return')return '改札 出口 / Out through the gates';
    if(!spot.startsWith('stairs'))return null;
    const platform=this.corridorPlatforms()[Number(spot.slice(6,-1))];return `↑ ${platform.tracks[spot.endsWith('L')?0:1]}番線 ${platform.lines.map(line=>line.ja).join('・')} / ${lineNames(platform.lines)}`;
  }
  /** What stands on the right of a hub's concourse: the Shinkansen transfer gates, or a shop where there is no Shinkansen. */
  private right(hub:Hub){return hasShinkansen(hub)?'shinkansen':'shop'}
  private dialog(title:string,body:string,choices:[string,()=>void][]=[]){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();const panel=this.rect(200,145,560,365,0xf0e6cb,c);this.rect(200,145,560,7,0xba654c,c);
    this.label(228,173,title,22,'#294a48',c);const text=this.label(228,220,body,16,'#475b50',c).setWordWrapWidth(500);
    // The choices start below the text, clear of the focus ring around them; the panel grows to hold them and Close.
    const top=Math.max(320,220+text.height+22),closeY=Math.max(461,top+choices.length*54+6);panel.setSize(560,closeY+49-145);
    const close=()=>{c.destroy(true);this.modal=null;};
    const buttons:PadChoice[]=[...choices.map(([label,fn],i):PadChoice=>[this.button(228,top+i*54,504,44,label,fn,c),fn]),[this.button(650,closeY,82,32,'Close',close,c),close]];
    // Gamepad focus ring: d-pad / stick to move, A to choose, B to close.
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices:buttons,ring});this.focusChoice(c,0);
  }
  /** The street's area map, read up close: on its board (makeAreaMap, its panels and legend), the street itself at a quarter of the scene's resolution, the traveller on a red 現在地 spot,
   * and on the map's own face the same picture again, smaller each time (each pass nests the last one, until it is under a pixel). */
  private areaMapView(){
    this.stopNavigation();this.direction={x:0,y:0};
    const {from,side}=this.outside!,board=`area-map-${from}-${side}`;if(!this.textures.exists(board))makeAreaMap(this,board,stations[from].ja,stations[from].en,konbiniFor(from));
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
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();this.rect(100,76,760,552,0xf0e6cb,c);this.rect(100,76,760,7,0xba654c,c);
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
    const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected),dead=(v=0)=>Math.abs(v)>.3?v:0;
    const state=pad?.buttons.map(b=>b.pressed)??[],ax=dead(pad?.axes[0]),ay=dead(pad?.axes[1]);
    state[20]=!!state[12]||ay<-.5;state[21]=!!state[13]||ay>.5;
    const prev=this.padPrev,edge=(i:number)=>state[i]&&!prev[i];this.padPrev=state;
    if(!pad||this.hall||this.machine||this.gate||this.atm)return {x:0,y:0};
    const step=edge(20)?-1:edge(21)?1:0;
    if(this.bag){if(edge(0)||edge(1)||edge(2))this.bag.close()}
    else if(this.phoneUi){if(edge(5))this.phoneUi.close();else this.phoneUi.pad(step||(edge(14)?-1:edge(15)?1:0),edge(0),edge(1))}
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
    }else{
      if(edge(0))this.interact();else if(edge(2))this.inventory();else if(edge(3))this.album();else if(edge(5))this.openPhone();
      return {x:state[14]?-1:state[15]?1:ax,y:state[12]?-1:state[13]?1:ay};
    }
    return {x:0,y:0};
  }
  private interact(){
    if(this.modal)return;
    const near=this.nearby();if(near.startsWith('stairs')){this.climb(Number(near.slice(6,-1)),near.endsWith('L'));return}if(!near&&(this.place==='corridor'||this.place==='platform'))return;if(near.startsWith('door')){this.tryBoard(near);return}
    switch(near){
      case 'ticket':this.ticketTerminal();break;
      case 'local':case 'shinkansen':this.ticketGate(this.nearby() as Service);break;
      case 'staff':this.stationHelp();break;
      case 'shop':this.dialog('NewDays / ニューデイズ','The station’s convenience store: onigiri, ekiben, drinks and snacks.\nShopping, and spending those ¥1 and ¥5 coins, will come in a later version.');break;
      case 'westExit':case 'eastExit':{
        // Straight out to the exit's own map where it has one, the generic street otherwise.
        const side:Side=this.nearby()==='westExit'?'west':'east',hub=this.place as Hub;
        this.outside={from:hub,side};this.loadPlace(stations[hub].maps?.[side]??'town');break;
      }
      case 'adjust':this.fareAdjust();break;
      case 'downL':case 'downR':this.descend(this.nearby()==='downR');break;
      // The route map's face on the traveller's side: the top track's from above, the bottom one's from below.
      case 'route':this.routeMap(this.player.y<routeBoard.y*2+12?0:1);break;
      case 'window':this.staffWindow();break;
      // The konbini's ATM, seen through its window: the machine opens over the paused scene.
      case 'atm':this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
        this.atm=new Atm(konbiniFor(this.townId()),this.wallet,()=>this.refreshPurse(),()=>{this.atm=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});break;
      case 'areaMap':this.areaMapView();break;
      case 'uber':this.dialog('Lorenzo’s Uber','“Ciao! Hop in, the driver knows the way.”\nThe ride back to the apartment in Higashi-Nakano will come in a later version.');break;
      case 'return':{
        // Out through the gates, in first person.
        if(this.place==='corridor'){this.exitGate();break}
        // From the street or an exit's own map, straight back in through the doors, unless the shutters are down: waiting for them is up to the traveller.
        if(!stationOpen()){this.dialog('シャッター / Station closed',`The station is closed for the night. Its shutters go up at ${hhmm(opens)}, before the first trains.${this.place==='town'?'\nThe konbini next door stays open around the clock.':''}`,[[`Wait until ${hhmm(opens)}`,()=>{skipTo(opens);this.modal?.destroy(true);this.modal=null}]]);break}
        this.loadPlace(this.outside?.from??stationOf(this.place));break;
      }
      case 'photo':this.collected.add(this.place);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.dialog('A memory for your journal',`${places[this.place]}\n\nPlaceholder for your future travel photo.\nThe memory is saved on this device.`);break;
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
      :ticket.service!==service?`${ticket.service==='local'?'在来線':'新幹線'}のきっぷです\nIt goes through the ${ticket.service==='local'?'local (在来線) gates':'Shinkansen (新幹線) gates'}.`:'',{
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
    this.gate=new TicketGate({ja:station.ja,en:station.en,accent:station.accent,hub,exit:true,exits:['← 西口 West','東口 East →'],cancel},service,[...this.tickets],this.wallet,ticket=>{
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
  /** Up the stairs of platform `i` (the left ones on the side of its first track): onto the platform, if the punched ticket's trip starts here. Which train to take is up to the traveller. */
  private climb(i:number,left:boolean){
    const {hub}=this.gateway!,platform=this.corridorPlatforms()[i],ticket=this.tickets.find(t=>t.punched),title=`${platform.tracks[left?0:1]}番線 · ${platform.lines.map(line=>line.ja).join('・')}`;
    if(!ticket){this.dialog(title,`${lineNames(platform.lines)}, tracks ${platform.tracks.join(' and ')}.`);return}
    // A ticket punched at another station has made its trip: off the train, the way on is out through the gates.
    if(ticket.kind==='adjust'||ticket.punched!==hub){this.dialog(title,`Your ticket's trip ends at ${stations[hub].en}.\nThe way out is through the gates, past the fare adjustment machine.`);return}
    this.toPlatform({...deckFor(stations[hub].ja,platform.lines[0],left?0:1),arriving:undefined});
  }
  private toPlatform(deck:Deck){this.deck=deck;this.gateway={hub:deck.hub,service:deck.service};this.loadPlace('platform')}
  /** The platform, drawn the first time for its station and tracks (makePlatform): the sign names the stops either side on its first line. */
  private platformMap(){
    const {ja,en,platform:{tracks,lines:[line]},service}=this.deck!,key=`map-platform-${ja}-${tracks.join('-')}-${line.id}`,i=line.stops.indexOf(ja),n=line.stops.length;
    const side=(k:number)=>line.loop?line.stops[(i+k+n)%n]:line.stops[i+k]??'';
    if(!this.textures.exists(key))makePlatform(this,key,{ja,en,tracks,color:line.color,prev:side(-1),next:side(1),prevEn:side(-1)&&stopEn(side(-1)),nextEn:side(1)&&stopEn(side(1)),service});
    return key;
  }
  /** The door marks along the platform, in scene px. */
  private doorXs(){return doorMarks(this.deck!.service).map(x=>x*2)}
  /** Where a train's door `k` opens (people step in and out of sight there), and the place of the `i`th in its queue. */
  private doorPoint(track:number,k:number){return {x:this.doorXs()[k],y:track?470:186}}
  /** As at Japanese platforms, two lines at each door, one either side of its mark: place `i` is on the left when even, on the right when odd, a row further back every two.
   * The middle stays clear for those getting off (exitPoint). */
  private slot(track:number,k:number,i:number){const row=Math.min(i>>1,2);return {x:this.doorXs()[k]+(i%2?22:-22),y:track?444-row*18:202+row*18}}
  private exitPoint(track:number,k:number){return {x:this.doorXs()[k],y:track?426:220}}
  /** The first place nobody holds in the queue at door `k`. */
  private freeSlot(track:number,k:number){const held=new Set(this.queues[track][k].map(c=>c.queue![2]));let i=0;while(held.has(i))i++;return i}
  /** The train on `track`: the one the traveller arrives on, pulling in, or none yet, the first one due soon on the side they came up. */
  private train(track:0|1):Train{
    const deck=this.deck!,arriving=deck.arriving&&deck.track===track?deck.arriving:null,{car,doors,cars,origin}=trainLayout(deck.service);
    const body=this.add.container(origin*2,track?478:102),image=this.add.image(0,0,'__DEFAULT').setOrigin(0).setScale(2).setFlipY(!!track);body.add(image);this.world.add(body);
    const rects=Array.from({length:cars},(_,c)=>doors.map(d=>this.add.rectangle(2*(c*car+d),track?0:52,16,8,0x1d2622).setOrigin(.5,0).setScale(0,1))).flat();body.add(rects);
    const train:Train={track,line:arriving??pick(deck.platform.lines),run:runOf(deck.platform.lines[0],deck.ja,track),due:this.dueIn(arriving?dwell-3800:(track===deck.track?1500:7500)+dwell),phase:arriving?'arrive':'gap',t:arriving?3800:0,wait:0,tick:0,body,image,doors:rects,player:arriving?'off':undefined};
    this.dress(train);return train;
  }
  /** Paints a train for its line and sets where it goes from here. */
  private dress(train:Train){
    const key='train-'+train.line.id;if(!this.textures.exists(key))makeTrain(this,key,train.line.color,train.line.service);
    train.image.setTexture(key);train.run=runOf(train.line,this.deck!.ja,train.track);
  }
  /** The time on the boards of a train leaving in `ms` (real ms), whole minutes on the journey's clock, or the first train's if none runs then. */
  private dueIn(ms:number){return inService(Math.ceil(minutes()+ms/minuteMs))}
  /** How far a train is into its `dwell` (ms from pulling in), or `dwell` once past it or away. */
  private into(train:Train){return train.phase==='arrive'?train.t:train.phase==='alight'?6000+train.t:train.phase==='board'?8600+train.t:dwell}
  /** Debug (T, or a click on the clock): sets the clock to the time typed, the trains on the platform retimed to it (one away due as soon as it can come in, one in
   * the station as soon as it can leave). Closing time and nightfall follow on their own. */
  private debugTime(){
    if(this.modal)return;
    const time=prompt('Debug: set the clock (H:MM)',hhmm(minutes()));this.held.clear();this.input.keyboard?.resetKeys();if(time===null)return;
    if(!setTimeOfDay(time)){alert(`Not a time: ${time}`);return}
    for(const train of this.trains)train.due=train.phase==='gap'?this.dueIn(dwell):Math.ceil(minutes()+(dwell-this.into(train))/minuteMs);
    this.keep();
  }
  /** The line of the next train on a track: lines sharing the platform take turns. */
  private nextLine(train:Train){const lines=this.deck!.platform.lines;return lines[(lines.indexOf(train.line)+1)%lines.length]}
  private phase(train:Train,phase:Train['phase']){train.phase=phase;train.t=train.tick=0;train.served=undefined}
  /** The trains' cycles: in, doors open for those getting off then the queues, doors shut, out; the next one follows a moment later (lines sharing the platform take turns).
   * They keep to the journey's clock: each pulls in in time to leave at its time on the boards, and none runs between the last train and the first.
   * The departure boards and the announcements in the top band follow them. */
  private runTrains(delta:number){
    // Far enough out that the whole train is off the platform at either end.
    const deck=this.deck!,{origin,car,cars}=trainLayout(deck.service),stop=origin*2,far=car*cars*2+stop+200;let say='';
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
      else if(train.phase==='alight'){open=Math.min(1,train.t/400);if(train.t>=2600)this.phase(train,'board')}
      else if(train.phase==='board'){open=1;this.boarding(train,delta)}
      // Pulling out, the boards turn to the next train, due once this one is out and the next has come in (a moment's gap between them).
      else if(train.phase==='close'){open=Math.max(0,1-train.t/500);if(train.t>=(train.player==='on'?500:1400)){this.phase(train,'leave');train.due=this.dueIn(6000+2500+dwell)}}
      else{
        // With the traveller on board it pulls out quicker, so the ride starts without a wait.
        const p=Math.min(1,train.t/(train.player==='on'?2500:6000));train.body.x=stop+out*far*p*p;
        if(p>=1){if(train.player==='on'&&train.to){this.ride(train);this.toPlatform(train.to);return}train.player=undefined;train.line=this.nextLine(train);this.dress(train);this.phase(train,'gap');if(this.stayed===train.track)this.stayed=-1}
      }
      train.doors.forEach(door=>door.setScale(open,1));
      // The boards, digital, in Japanese then English by turns: the time and where it goes, the line under it (a loop's trains by their way round); the next train's once this one pulls out.
      const line=train.phase==='leave'?this.nextLine(train):train.line,run=line===train.line?train.run:runOf(line,deck.ja,train.track),time=hhmm(train.due);
      // After the last train, the boards say so until the station closes.
      const en=Math.floor(this.time.now/4000)%2===1,text=train.phase==='gap'&&!trainsRun()?(en?'Service has ended\nfor today':'本日の運転は\n終了しました'):en?`${time} ${line.loop?run.destEn.split(',')[0]:'for '+run.destEn}\n${line.en}`:`${time} ${line.loop?run.dest.split(' ')[0]:run.dest+'行'}\n${line.ja}`;
      for(const board of this.overhead)if(board instanceof Phaser.GameObjects.Text&&board.getData('track')===train.track&&board.text!==text)board.setText(text);
      if(train.phase==='arrive')say=`まもなく ${deck.platform.tracks[train.track]}番線に ${train.line.ja} ${train.run.dest}${train.line.loop?'':'行'}がまいります`;else if(train.phase==='close'&&!say)say='ドアが閉まります ご注意ください';
    }
    this.announcement.setText(say);
  }
  /** The doors open: a few people step off and make for the stairs (out of those away from the platform), and so does the traveller, arriving. */
  private alight(train:Train){
    const free=this.commuters.filter(c=>!c.queue&&c.image.alpha===0&&!!c.steps[0]&&'wait' in c.steps[0]),doors=this.doorXs();
    for(const c of free.slice(0,Math.floor(between(2,6)))){
      const k=Math.floor(Math.random()*doors.length),door=this.doorPoint(train.track,k),out=this.exitPoint(train.track,k),y=between(300,340),{mouth,end}=this.stairwell(door.x);c.image.setPosition(door.x,door.y).setAlpha(0);
      c.steps=[{wait:between(0,1500),face:train.track?'up':'down'},{...out,alpha:1},...this.route(out,{x:mouth,y}),{x:end,y,alpha:0},{wait:between(4000,12000),face:'down'}];
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
  private boardable(spot:string){const [track,k]=spot.slice(4).split('-').map(Number);return this.trains[track]?.phase==='board'&&!this.ahead(track,k)}
  /** Where the traveller joins the queue at a door: the first free place in its two lines. */
  private queueEnd(spot:string){const [track,k]=spot.slice(4).split('-').map(Number);return this.slot(track,k,this.freeSlot(track,k))}
  /** Into the train at that door, once it is the traveller's turn: they choose where to get off (lineMap), the doors held open meanwhile, then ride it out of the station. */
  private tryBoard(spot:string){
    this.boardAt=spot;if(!this.boardable(spot))return;this.boardAt='';
    const [track,k]=spot.slice(4).split('-').map(Number),train=this.trains[track],door=this.doorPoint(track,k);
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0);train.player='on';this.facing=track?'down':'up';
    this.tweens.add({targets:this.player,x:door.x,y:door.y,alpha:0,duration:450});this.lineMap(train);
  }
  /** On board, the doors still open: the line ahead as the map over the doors shows it, from here (現在地, in red) to the end of the run.
   * The stops the game has can be chosen, the doors then shutting at once; staying here steps back off by the same door. */
  private lineMap(train:Train){
    const {line,run}=train,deck=this.deck!,c=this.add.container(0,0).setDepth(20),color=Phaser.Display.Color.HexStringToColor(line.color).color,stops=run.ahead;this.modal?.destroy(true);this.modal=c;
    // Chosen, the map goes and the doors shut at once (the traveller, out of sight, rides out); staying, the traveller steps back out and the train goes on as usual.
    const go=(ja:string)=>{train.to={...deckFor(ja,line,run.dir<0?0:1),arriving:line};train.wait=train.t+200;c.destroy(true);this.modal=this.add.container(0,0)},stay=()=>{c.destroy(true);this.modal=this.add.container(0,0);this.stepOff(train)};
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();this.rect(40,92,880,520,0xf0e6cb,c);this.rect(40,92,880,7,color,c);
    this.label(64,112,`${line.ja}  ${run.dest}${line.loop?'':'行'}`,22,'#294a48',c);this.label(64,146,`${line.en}, for ${run.destEn} · Where do you get off?`,14,'#475b50',c);
    // A loop goes round: its ring, the stops to choose round it in the order the train reaches them.
    if(line.loop){
      const info=this.label(64,170,'',15,'#294a48',c),choices=this.loopRing(c,line,deck.ja,run.dir,go,info);choices.push([this.button(64,560,420,40,`Stay at ${deck.en}: get off`,stay,c),stay]);
      const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices,ring});this.focusChoice(c,0);return;
    }
    const x0=96,step=(880-x0)/stops.length,y=214,info=this.label(64,506,'',15,'#294a48',c);
    this.rect(x0,y-4,step*stops.length,8,color,c);
    c.add(this.add.circle(x0,y,9,0xd6402e));this.label(x0,y-36,'現在地',12,'#d6402e',c).setOrigin(.5,0);this.label(x0,y+16,[...deck.ja].join('\n'),13,'#d6402e',c).setOrigin(.5,0).setLineSpacing(1);
    const choices:PadChoice[]=[];
    stops.forEach((ja,i)=>{
      const x=x0+step*(i+1),to=alightAt(ja);
      c.add(this.add.circle(x,y,to?7:4,to?0xffffff:0x9aa29a).setStrokeStyle(to?3:0,color));this.label(x,y+16,[...ja].join('\n'),13,to?'#294a48':'#a9a48f',c).setOrigin(.5,0).setLineSpacing(1);
      if(!to)return;
      this.label(x,y+24+ja.length*18,stopEn(ja),11,'#59625e',c).setOrigin(0,.5).setAngle(90);
      const hit=this.rect(x-step/2+1,y-14,step-2,190,0xffffff,c).setAlpha(.001).setInteractive({useHandCursor:true}),pick=()=>go(ja);
      hit.setData('hover',()=>info.setText(`${ja} · ${stopEn(ja)}: get off here`)).on('pointerover',()=>hit.getData('hover')()).on('pointerdown',pick);choices.push([hit,pick]);
    });
    if(!choices.length)info.setText('None of these stops is open yet.');
    choices.push([this.button(64,544,420,40,`Stay at ${deck.en}: get off`,stay,c),stay]);
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices,ring});this.focusChoice(c,0);
  }
  /** The time on the train, from here to the stop chosen: on the clock as the traveller gets off. */
  private ride(train:Train){
    const from=this.deck!.ja,to=train.to!.ja;
    addMinutes(train.line.service==='shinkansen'?shinkansenMinutes(train.line,from,to):localMinutes(from,to,train.run.ahead.indexOf(to)+1));
  }
  /** A loop line drawn as the ring it is, roughly as it lies on the map (the list of stops runs anticlockwise from Tokyo on the right: north at the top, Shinjuku on the left),
   * here (現在地) in red and arrows all round the way `dir` runs. With `pick`, the stops the game has can be chosen, in the order the train reaches them (each names itself in `info`). */
  private loopRing(c:Phaser.GameObjects.Container,line:RailLine,here:string,dir:1|-1,pick?:(ja:string)=>void,info?:Phaser.GameObjects.Text){
    const n=line.stops.length,cx=480,cy=356,rx=290,ry=150,color=Phaser.Display.Color.HexStringToColor(line.color).color,g=this.add.graphics();c.add(g);
    const at=(k:number)=>{const a=k/n*Math.PI*2;return {x:cx+rx*Math.cos(a),y:cy-ry*Math.sin(a),cos:Math.cos(a),sin:Math.sin(a)}};
    g.lineStyle(6,color).strokeEllipse(cx,cy,rx*2,ry*2);
    // An arrow between each two stops, along the ring the way the trains go.
    g.fillStyle(0x294a48);
    for(let k=0;k<n;k++){const p=at(k+.5),tx=-rx*p.sin*dir,ty=-ry*p.cos*dir,l=Math.hypot(tx,ty),ux=tx/l,uy=ty/l;g.fillTriangle(p.x+ux*6,p.y+uy*6,p.x-ux*4-uy*5,p.y-uy*4+ux*5,p.x-ux*4+uy*5,p.y-uy*4-ux*5)}
    const i=line.stops.indexOf(here),choices:PadChoice[]=[];
    line.stops.forEach((ja,k)=>{
      const p=at(k),me=ja===here,to=!me&&!!pick&&alightAt(ja);
      c.add(this.add.circle(p.x,p.y,me?8:to?6:4,me?0xd6402e:to?0xffffff:0xf0e6cb).setStrokeStyle(me?0:2,color));
      this.label(p.x+p.cos*16,p.y-p.sin*14,me?`${ja} 現在地`:ja,12,me?'#d6402e':to||!pick?'#294a48':'#a9a48f',c).setOrigin(p.cos>.3?0:p.cos<-.3?1:.5,p.sin>.3?1:p.sin<-.3?0:.5);
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
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();this.rect(40,92,880,528,0xf0e6cb,c);this.rect(40,92,880,7,0x2c8a4a,c);
    this.label(64,112,`${platform.tracks[track]}番線  路線図`,22,'#294a48',c);this.label(64,146,`Track ${platform.tracks[track]} · Route map: its trains go to the stops in colour.`,14,'#475b50',c);
    const rowH=Math.min(220,400/platform.lines.length);
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
      });
    });
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
    writeSave({tickets:out?this.tickets.filter(t=>!t.punched||t.punched===out):this.tickets,at:{...at,outside:this.outside,gate:this.gateway},clock:clockMs(),phone:this.phone});this.kept=this.time.now;
  }
  /** The bag from the top band (or X): tickets and wallet, over the paused scene. */
  private inventory(){
    if(this.modal)return;
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);
    this.bag=openInventory(this.tickets,this.wallet,()=>{this.bag=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()});
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
    },hallView);
  }
  private refreshPurse(){const heavy=walkFactor(this.wallet)<1;this.purse.setText(`◉ ${coinCount(this.wallet)} coins${heavy?' · heavy':''}\n¥${walletTotal(this.wallet).toLocaleString('en-US')}`).setColor(heavy?'#ffb35a':'#e6ce98');}
  private album(){this.dialog('My travel journal',`MEMORIES COLLECTED · ${this.collected.size}/2\n\n${this.collected.has('kamakura-trail')?'●':'○'} Kamakura · The temple cherry trees\n${this.collected.has('arashiyama')?'●':'○'} Arashiyama · The bamboo path\n\nReal photos will be added in a future version.`);}
  private canWalk(x:number,y:number){
    // Down to the canvas edge, feet still in view (the hub's world sits 24px lower).
    return x>18&&x<this.mapWidth-18&&y>88&&y<(this.place==='corridor'?this.mapHeight:628-this.world.y)&&!this.solids.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(r,new Phaser.Geom.Rectangle(x-10,y-10,20,25)));
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
    const start=Phaser.Math.Clamp(Math.round((fy-104)/step),0,rows-1)*cols+Phaser.Math.Clamp(Math.round((fx-24)/step),0,cols-1);
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
    if(this.place==='corridor'){this.corridorTrip(c);return}
    if(this.place==='platform'){this.platformTrip(c);return}
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
    if(Math.random()<.35){
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
  /** Moves a commuter `delta` ms along its steps, planning the next trip when they run out. */
  private stepCommuter(c:Commuter,i:number,delta:number){
    if(c.face){c.image.setTexture(`commuter-${c.look}-${c.face}-0`);return}
    for(let budget=delta;budget>0;){
      if(!c.steps.length)this.planTrip(c);
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
  /** The phone, taken out of the corner over the paused scene. */
  private openPhone(){
    if(this.modal)return;
    this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0).setDepth(20);this.mini.setVisible(false);
    this.phoneUi=new Phone(this.phone,{send:contact=>this.send(contact),changed:()=>{this.keep();this.refreshPhone()},close:()=>{this.phoneUi=null;this.mini.setVisible(true);this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()}});
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
      const hub=this.nearestStation();
      if(hub===trip.at){trip.state='here';this.receive('lorenzo',`I’m already at ${stations[hub].en} Station, my Uber is out front!`)}else{trip.state='driving';trip.at=undefined;this.receive('lorenzo','OK! On my way.');this.phoneDue=this.time.now+4000}
    }
    else if(trip.state==='driving'&&(!this.modal||this.phoneUi))this.land();
    else if(trip.state==='flying'&&!this.flight&&(!this.modal||this.phoneUi)){
      this.phoneUi?.close();this.stopNavigation();this.direction={x:0,y:0};this.modal=this.add.container(0,0);
      this.flight=playFlight(fareBetween(stations[this.nearestStation()].ja,'東京')===null?'kansai':'haneda',()=>{this.flight=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();this.land()});
    }
  }
  /** Lorenzo has landed and taken an Uber to the station nearest the traveller: in its street, the traveller sees it pull up, then his message comes; anywhere else it comes at once, the Uber waiting there. */
  private land(){
    const hub=this.nearestStation(),trip=this.phone.lorenzo;trip.state='here';trip.at=hub;this.keep();
    const say=()=>this.receive('lorenzo',`I’m at ${stations[hub].en} Station! My Uber is waiting out front.`);
    if(this.place==='town'&&this.townId()===hub)this.parkCar(say);else say();
  }
  /** The Uber on the station's side of the road, just past the crossing: parked, or pulling up from the left before `then`. Solid once parked, nudging aside a traveller standing there. */
  private parkCar(then?:()=>void){
    const image=this.car=this.add.image(then?-70:638,417,'uber-car');this.world.add(image);
    const park=()=>{
      if(this.car===image){
        const rect=new Phaser.Geom.Rectangle(578,418,120,28);image.setData('parked',true);this.solids.push(rect);
        // Only once it has pulled up: parked as the street is built, the traveller is not there yet (and a saved spot inside it is refused by canWalk).
        if(then&&Phaser.Geom.Intersects.RectangleToRectangle(rect,new Phaser.Geom.Rectangle(this.player.x-10,this.player.y-10,20,25)))this.player.y=392;
      }
      then?.();
    };
    // Timed apart from the tween, so that the message still comes if the traveller has left the street meanwhile.
    if(then){this.tweens.add({targets:image,x:638,duration:2600,ease:'Cubic.easeOut'});this.time.delayedCall(2600,park)}else park();
  }
  private outdoors(){return this.place==='town'||this.place==='kamakura-trail'||this.place==='arashiyama'}
  /** What lights the night where the traveller is, in scene px (art × 2): in the street the konbini's window, the vending machines, the bus stop, the shops' signs across the road, Lorenzo's Uber
   * and the station's entrance and name while it is open; on the exits' maps the stone lanterns, the temple's lanterns and the lamp; along a platform its lights. */
  private lamps():Lamp[]{
    if(this.place==='platform')return Array.from({length:Math.ceil(this.mapWidth/160)},(_,k):Lamp=>[80+k*160,320,190,0xf4f8ff]);
    if(this.place==='town'){
      const warm=0xfff1cc,cool=0xe4f4ff,shops:Lamp[]=[];let x=0;for(const w of [70,56,84,62,90,64,54]){shops.push([(x+w/2)*2,548,w*.7,warm,.5]);x+=w}
      return [...shops,[720,214,80,cool],[810,214,80,cool],[900,214,76,cool],[810,280,110,warm,.45],[60,250,36,cool,.8],[108,250,36,cool,.8],[912,276,28,cool,.8],...(stationOpen()?[[480,222,96,warm],[480,280,70,warm,.4],[480,154,100,cool,.8]] as Lamp[]:[]),
        // Lorenzo's Uber, its headlights on and lighting the road ahead, its tail lights red.
        ...(this.car?[[this.car.x+60,this.car.y,22,0xfff4c0],[this.car.x+104,this.car.y+8,48,0xfff1cc,.55],[this.car.x-62,this.car.y,12,0xff4a3a,.8]] as Lamp[]:[])];
    }
    if(this.outdoors())return [[379,344,48,0xffd99a],[561,344,48,0xffd99a],[401,258,28,0xffb070,.8],[541,258,28,0xffb070,.8],[198,442,84,0xfff1cc],[154,358,50,0xfff1cc,.6]];
    return [];
  }
  /** Nightfall (darkness on the clock): out of doors the scene turns a deep blue but where the lamps shine, the platforms dim by half; indoors the lights are always on. */
  private nightfall(){
    this.over.setPosition(this.world.x,this.world.y);this.shutter?.setVisible(!stationOpen());
    const k=darkness()*(this.outdoors()?1:this.place==='platform'?.5:0);this.shade.setVisible(k>0);this.neon?.setAlpha(k);if(!k)return;
    const tint=Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0xffffff),Phaser.Display.Color.ValueToColor(0x303c68),1,k);
    this.shade.clear().fill(Phaser.Display.Color.GetColor(tint.r,tint.g,tint.b));
    for(const [x,y,r,color,a=1] of this.lamps())this.shade.stamp('light',undefined,x+this.world.x,y+this.world.y,{scale:r/16,tint:color,alpha:a*k,originX:.5,originY:.5});
  }
  /** Past closing time the station shuts: the staff see the traveller out by its west exit, cancelling the entry of a ticket punched here and keeping the ticket of a trip that ended here. */
  private closeStation(){
    const hub=isHub(this.place)?this.place:this.gateway?.hub??this.deck!.hub;
    for(const ticket of this.tickets)if(ticket.kind!=='adjust'&&ticket.punched===hub)delete ticket.punched;
    this.tickets=this.tickets.filter(ticket=>ticket.kind!=='adjust'&&!ticket.punched);
    this.outside={from:hub,side:'west'};this.loadPlace(stations[hub].maps?.west??'town');
    this.dialog('駅員 / Closing time',`“The last train has gone: the station is closing for the night.”\nThe staff see you out by the west exit. The shutters go up again at ${hhmm(opens)}.`);
  }
  update(_time:number,delta:number){
    if(!this.player)return;
    tick();this.nightfall();{const time=hhmm(minutes());if(this.clockText.text!==time){this.clockText.setText(time);this.day.setText(dayLabel())}}
    // Closing time: once nobody is on a train, the staff see the traveller out.
    if(!stationOpen()&&(isHub(this.place)||this.place==='corridor'||this.place==='platform'&&!this.trains.some(train=>train.player))){this.closeStation();return}
    if(this.place==='platform')this.runTrains(delta);
    if(isHub(this.place)||this.place==='corridor'||this.place==='platform'){
      // The spot the player has taken: a machine of the bank, or the corridor's fare adjustment machine or staffed window.
      const ahead=this.machineAhead(),near=this.place==='corridor'?this.nearby():'';
      this.playerSpot=near==='adjust'||near==='window'?near:this.place==='corridor'?'':this.hall?this.hallSpot:ahead>=0?'machine'+ahead:'';
      this.commuters.forEach((commuter,i)=>{if(this.playerSpot)this.giveWay(commuter);commuter.bump=Math.min(1,(commuter.bump??1)+delta/700);this.stepCommuter(commuter,i,Math.min(delta,100))});
      // The outlines over the people, so that a train's doors show theirs; the overhead signs over all.
      this.world.sort('y');if(this.place==='platform')this.world.bringToTop(this.glow);for(const sign of this.overhead)this.world.bringToTop(sign);
    }
    // The street is not depth-sorted: the traveller passes behind Lorenzo's Uber from the pavement, in front of it from across the road.
    if(this.car)this.player.y<this.car.y+26?this.world.moveAbove<Phaser.GameObjects.GameObject>(this.car,this.player):this.world.moveBelow<Phaser.GameObjects.GameObject>(this.car,this.player);
    if(isHub(this.place)){
      const announcements=trainsRun()?['まもなく電車がまいります…','出口 Exit / 乗換 Transfer / 改札 Gates','足元の黄色い線までお下がりください']:['本日の列車はすべて終了しました','まもなくシャッターを閉めます','出口 Exit'];
      this.announcement.setText(announcements[Math.floor(this.time.now/6500)%announcements.length]);
    }else if(this.place!=='platform')this.announcement.setText('');
    const pad=this.gamepad();this.lorenzo();
    if(this.place==='corridor'||this.place==='platform')this.scroll(Math.min(1,delta/150));
    if(this.modal){this.glow.clear();this.prompt.setVisible(false);this.held.clear();this.pending='';return;}
    let x=pad.x||this.direction.x,y=pad.y||this.direction.y;if(this.keys.left.isDown)x=-1;if(this.keys.right.isDown)x=1;if(this.keys.up.isDown)y=-1;if(this.keys.down.isDown)y=1;
    if(this.held.has('KeyA'))x=-1;if(this.held.has('KeyD'))x=1;if(this.held.has('KeyW'))y=-1;if(this.held.has('KeyS'))y=1;
    if(x||y){this.stopNavigation();this.pending=''}
    // Jostling rather than solid people: brushing past someone slows both for a moment, and a walking player is nudged aside. One check per commuter, however crowded.
    this.bump=Math.min(1,this.bump+delta/700);
    for(const c of this.commuters){
      const dx=this.player.x-c.image.x,dy=(this.player.y-c.image.y)*1.6,d=Math.hypot(dx,dy);if(d>=18||c.image.alpha<.5)continue;
      this.bump=Math.min(this.bump,.35);c.bump=Math.min(c.bump??1,.4);
      const push=(18-d)*.25/(d||1),nx=this.player.x+dx*push,ny=this.player.y+dy/1.6*push;if((x||y||this.path.length)&&d&&this.canWalk(nx,ny))this.player.setPosition(nx,ny);
    }
    const speed=380*walkFactor(this.wallet)*this.bump*Math.min(delta,40)/1000;
    if(this.path.length){
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
    const messages:Record<string,string>={adjust:'精算機 / Fare adjustment',window:'みどりの窓口 / Staff window',ticket:'Buy a ticket',local:'在来線 改札',shinkansen:'新幹線 改札',shop:'NewDays',staff:'駅員 / Staff',westExit:'西口',eastExit:'東口',exit:'出口 / Exit',areaMap:'Area map',atm:'ATM',uber:'Uber · Lorenzo',return:stationOpen()||this.place==='corridor'?'Back to the station':'シャッター / Closed',photo:'Keep a memory'};
    const near=this.nearby();
    // Reaching a door's queue keeps walking to its end, the traveller boarding when their turn comes (boardAt); leaving the queue gives up. Standing still in a queue, however they got there, boards too.
    if(this.pending.startsWith('door')&&near===this.pending){this.boardAt=near;this.pending=''}
    if(this.boardAt&&near!==this.boardAt)this.boardAt='';
    if((this.boardAt||near.startsWith('door')&&!this.moving&&!this.path.length&&this.stayed!==+near[4])&&this.boardable(near)){this.tryBoard(near);return}
    if(this.pending&&near===this.pending){this.pending='';this.stopNavigation();this.interact();return}
    if(!this.path.length)this.pending='';
    // On the platform, the only prompt is the one to board, once it is the traveller's turn.
    const say=this.place!=='platform'?near&&`${this.promptFor(near)??messages[near]}`:near.startsWith('door')&&this.boardable(near)?'乗車 / Board':'';
    this.prompt.setText(say?`◎ ${say} · E / Ⓐ / click`:'').setVisible(!!say);
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
document.fonts.load('10px "Yorimichi Bitmap"').catch(()=>{}).finally(()=>new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#91ab78',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Journey}));
// No browser menu on right click, over the scene or the hall and kiosk overlays.
document.addEventListener('contextmenu',e=>e.preventDefault());
