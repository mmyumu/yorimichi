import Phaser from 'phaser';
import './style.css';
import { makeArt } from './art';
import { MachineHall } from './machine-hall';
import { TicketMachine, trayKey, type TravelTicket, type FareTicket } from './ticket-machine';
import { openTokyoDepartures, type FareStation } from './tokyo-fares';
import { coinCount, coins, loadWallet, notes, saveWallet, walkFactor, walletTotal } from './wallet';

import { looks, type Figure } from './people';
import { places, isHub, returnHub, platformFor, hasShinkansen, routes, stations, type Hub, type Place, type Service } from './network';
// Highlight frames around the hotspots of nearby(), in scene pixels (art × 2), shown while the player is in range.
const hotspotFrames:Record<string,[number,number,number,number]>={staff:[0,130,124,92],ticket:[336,150,288,94],local:[124,132,136,100],shinkansen:[724,132,236,100],shop:[724,130,236,92],westExit:[14,444,162,64],eastExit:[778,444,168,64],photo:[682,376,56,58],return:[96,336,116,58],'return-jr-stop':[100,330,206,94]};
type Step={x:number;y:number;alpha?:number}|{wait:number;face:string;spot?:string};
type Commuter={image:Phaser.GameObjects.Image;look:number;steps:Step[];speed:number;face?:string;bump?:number};
const pick=<T,>(items:readonly T[])=>items[Math.floor(Math.random()*items.length)],between=(a:number,b:number)=>a+Math.random()*(b-a);
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
  private ticket:TravelTicket|null=null;
  private currentStation:FareStation|null=null;
  private departures:{destroy:()=>void}|null=null;
  private hall:MachineHall|null=null;
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
  private purse!:Phaser.GameObjects.Text;
  constructor(){super('Journey')}
  create(){
    makeArt(this);
    this.input.addPointer(3);
    this.keys=this.input.keyboard!.createCursorKeys();
    this.input.keyboard!.on('keydown',(event:KeyboardEvent)=>{if(['KeyW','KeyA','KeyS','KeyD'].includes(event.code))this.held.add(event.code);else if(['KeyE','Space','Enter'].includes(event.code)&&!event.repeat)this.interact()});
    this.input.keyboard!.on('keyup',(event:KeyboardEvent)=>this.held.delete(event.code));
    this.game.events.on('blur',()=>this.held.clear());
    this.loadPlace('tokyo');
    // A click or tap on a hotspot uses it, walking there first if needed; elsewhere it walks.
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer, objects:Phaser.GameObjects.GameObject[])=>{
      const x=pointer.x,y=pointer.y-this.world.y;if(this.modal||objects.length||pointer.y<=70)return;
      const spot=this.hotspotAt(x,y);
      if(spot&&spot===this.nearby()){this.interact();return}
      const frame=spot?this.frameFor(spot):null;this.pending=spot;
      this.navigate(frame?frame[0]+frame[2]/2:x,frame?frame[1]+frame[3]/2:y);
    });
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>this.input.setDefaultCursor(!this.modal&&this.hotspotAt(pointer.x,pointer.y-this.world.y)?'pointer':''));
  }
  private rect(x:number,y:number,w:number,h:number,color:number,container=this.world){const r=this.add.rectangle(x,y,w,h,color).setOrigin(0);container.add(r);return r}
  private label(x:number,y:number,text:string,size=16,color='#283d3c',container=this.world){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,lineSpacing:5});container.add(t);return t}
  private loadPlace(place:Place){
    this.machine?.destroy();this.machine=null;this.hall?.destroy();this.hall=null;this.machineId=null;this.departures?.destroy();this.departures=null;
    if(place!=='jr-stop')this.currentStation=null;
    this.modal?.destroy();this.modal=null;this.world?.destroy(true);this.hud?.destroy(true);
    this.place=place;this.commuters=[];this.spots.clear();this.playerSpot=this.hallSpot='';this.bump=1;this.path=[];this.solids=[];this.direction={x:0,y:0};
    // The stations sit lower under the top band, leaving the back wall room for the station's name.
    this.world=this.add.container(0,isHub(place)?24:0);this.hud=this.add.container(0,0);
    this.world.add(this.add.image(0,0,'map-'+place).setOrigin(0));
    // The back wall, the ticket office and the gates beside it (set back on the left), the machine wall between its pillars, and the Shinkansen gates or the shop on the right.
    if(isHub(place))this.solids.push(new Phaser.Geom.Rectangle(0,70,960,64),new Phaser.Geom.Rectangle(0,70,124,146),new Phaser.Geom.Rectangle(124,70,140,162),new Phaser.Geom.Rectangle(260,70,464,180),new Phaser.Geom.Rectangle(724,70,236,hasShinkansen(place)?162:146));
    if(place==='kamakura-trail'||place==='arashiyama')this.solids.push(new Phaser.Geom.Rectangle(330,94,270,178));
    if(place==='jr-stop')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,185));
    // Two concourse pillars carrying the yellow exit signs, drawn in depth order with the people (see update) and solid at their foot.
    if(isHub(place))for(const [x,side] of [[254,'west'],[690,'east']] as const){this.world.add(this.add.image(x,380,`exit-pillar-${place}-${side}`).setOrigin(.5,1));this.solids.push(new Phaser.Geom.Rectangle(x-30,364,60,16))}
    // As in the hall, every outfit is in the concourse: two stand reading, the others come and go at random (planTrip), already spread out along their first trip.
    if(isHub(place))looks.forEach((_,look)=>{
      const face=look===looks.length-2?[312,272]:look===looks.length-1?[760,238]:null;
      const image=this.add.image(face?.[0]??0,face?.[1]??0,`commuter-${look}-${face?'up':'down'}-0`).setOrigin(.5,.85).setScale(1.9*(looks[look].height??1));
      const commuter:Commuter={image,look,steps:[],speed:(.045+(look*7%5)*.006)*(looks[look].pace??1),face:face?'up':undefined};this.world.add(image);this.commuters.push(commuter);
      if(!face)for(let t=between(0,20000);t>0;t-=200)this.stepCommuter(commuter,look,200);
    });
    this.glow=this.add.graphics();this.world.add(this.glow);
    this.marker=this.add.circle(0,0,9,0xf3d28e,.35).setStrokeStyle(2,0xffedb9).setVisible(false);this.world.add(this.marker);
    this.player=this.add.container(480,isHub(place)?490:410);this.world.add(this.player);
    this.sprite=this.add.image(0,0,'traveller-down-0').setOrigin(.5,.85).setScale(2);this.player.add(this.sprite);
    this.rect(0,0,960,70,0x263d39,this.hud);
    this.rect(0,66,960,2,0xb8ad83,this.hud);
    this.label(24,12,'寄り道 / TRAVEL JOURNAL',11,'#b6bd98',this.hud);
    if(place==='jr-stop'&&this.currentStation){this.label(348,176,this.currentStation.ja,24,'#f1e5ba');this.label(348,210,this.currentStation.en.toUpperCase(),13,'#cbd6b1');}
    this.label(24,32,this.currentStation?this.currentStation.en+' · JR station':places[place],18,'#f3dfb1',this.hud);
    this.purse=this.label(404,14,'',12,'#e6ce98',this.hud).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.showWallet());this.refreshPurse();
    this.button(548,14,108,40,'Ticket',()=>this.showTicket(),this.hud);
    this.label(676,26,`${this.collected.size}/2 memories`,12,'#cfceaa',this.hud);
    this.button(833,14,104,40,'Journal',()=>this.album(),this.hud);
    // No bottom bar: the action prompt floats over the player when something is in reach (see update), the station announcements run in the top band.
    this.prompt=this.label(0,0,'',13,'#fff0d4',this.hud).setOrigin(.5,1).setPadding(8,4,8,4).setBackgroundColor('#263d39e0').setVisible(false);
    this.announcement=this.label(176,13,'',10,'#96aa95',this.hud);
  }
  private button(x:number,y:number,w:number,h:number,text:string,fn:()=>void,parent:Phaser.GameObjects.Container){
    this.rect(x-2,y-2,w+4,h+4,0x9b9e7d,parent);this.rect(x,y+3,w,h,0x182f2c,parent);const b=this.rect(x,y,w,h,0x415c4f,parent).setInteractive({useHandCursor:true});this.label(x+w/2,y+h/2,text,16,'#fff0d4',parent).setOrigin(.5);b.on('pointerdown',fn);return b;
  }
  private frameFor(spot:string){return hotspotFrames[spot==='return'&&this.place==='jr-stop'?'return-jr-stop':spot]}
  private hotspotAt(x:number,y:number){
    const spots=isHub(this.place)?['staff','ticket','local',this.right(this.place),'westExit','eastExit']:this.place==='jr-stop'?['return']:['return','photo'];
    return spots.find(spot=>{const [fx,fy,w,h]=this.frameFor(spot);return x>=fx&&x<fx+w&&y>=fy&&y<fy+h})??'';
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
    }else{
      if(x<240&&y<453)return 'return';
      if(this.place!=='jr-stop'&&Phaser.Math.Distance.Between(x,y,710,409)<95)return 'photo';
    }
    return '';
  }
  /** What stands on the right of a hub's concourse: the Shinkansen transfer gates, or a shop where there is no Shinkansen. */
  private right(hub:Hub){return hasShinkansen(hub)?'shinkansen':'shop'}
  private dialog(title:string,body:string,choices:[string,()=>void][]=[]){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();this.rect(200,145,560,365,0xf0e6cb,c);this.rect(200,145,560,7,0xba654c,c);
    this.label(228,173,title,22,'#294a48',c);this.label(228,220,body,16,'#475b50',c).setWordWrapWidth(500);
    const close=()=>{c.destroy(true);this.modal=null;};
    const buttons:PadChoice[]=[...choices.map(([label,fn],i):PadChoice=>[this.button(228,320+i*54,504,44,label,fn,c),fn]),[this.button(650,461,82,32,'Close',close,c),close]];
    // Gamepad focus ring: d-pad / stick to move, A to choose, B to close.
    const ring=this.add.rectangle(0,0,1,1).setOrigin(0).setStrokeStyle(3,0xf3d76b).setVisible(false);c.add(ring);c.setData({choices:buttons,ring});this.focusChoice(c,0);
  }
  private focusChoice(c:Phaser.GameObjects.Container,index:number){
    const choices=c.getData('choices') as PadChoice[],i=(index+choices.length)%choices.length,[b]=choices[i];
    c.setData('focus',i);(c.getData('ring') as Phaser.GameObjects.Rectangle).setPosition(b.x-5,b.y-5).setSize(b.width+10,b.height+10);
  }
  /** Gamepad outside the ticket hall (which reads the pad itself): walking, A to act, X ticket, Y journal, and the dialogs and departures board. Returns the stick/d-pad direction. */
  private gamepad(){
    const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected),dead=(v=0)=>Math.abs(v)>.3?v:0;
    const state=pad?.buttons.map(b=>b.pressed)??[],ax=dead(pad?.axes[0]),ay=dead(pad?.axes[1]);
    state[20]=!!state[12]||ay<-.5;state[21]=!!state[13]||ay>.5;
    const prev=this.padPrev,edge=(i:number)=>state[i]&&!prev[i];this.padPrev=state;
    if(!pad||this.hall||this.machine)return {x:0,y:0};
    const step=edge(20)?-1:edge(21)?1:0;
    if(this.departures){
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
      if(edge(0))this.interact();else if(edge(2))this.showTicket();else if(edge(3))this.album();
      return {x:state[14]?-1:state[15]?1:ax,y:state[12]?-1:state[13]?1:ay};
    }
    return {x:0,y:0};
  }
  private interact(){
    if(this.modal)return;
    switch(this.nearby()){
      case 'ticket':this.ticketTerminal();break;
      case 'local':case 'shinkansen':{
        const service=this.nearby() as Service;
        if(service==='local'&&this.place==='tokyo'&&this.ticket?.kind==='fare'){this.tokyoDepartures(this.ticket);break;}
        if(!this.ticket||this.ticket.from!==this.place||this.ticket.service!==service){
          this.dialog(service==='local'?'在来線 改札 / Local gates':'新幹線 改札 / Shinkansen gates',this.ticket?this.ticket.kind==='fare'?'This ticket is only valid on Tokyo local JR lines.':`Your ticket is for ${this.ticket.platform.toLowerCase()}.\nPick the matching platform or another ticket.`:'Buy your ticket at the machines on the back wall.',[[service==='local'?'See local lines':'See the Shinkansen',()=>this.ticketTerminal(service)]]);
        }else{
          const ticket=this.ticket;
          if(ticket.kind==='fare')break;
          // From the network rather than the ticket, which may have waited in a machine's outlet since before the routes had their trains.
          const {train:correct,decoy}=routes.find(route=>route.id===ticket.id)??ticket;
          this.dialog(ticket.platform+' · 発車案内',`Two trains are announced.\nTicket: ${ticket.to.toUpperCase()} · ${ticket.line}\nCheck the destination before boarding.`,[
            [decoy,()=>this.dialog('Wrong train',service==='shinkansen'?'This train is not in service.\nYour ticket is still valid.':'This departure does not serve your destination.\nYour ticket is still valid.',[['Read the board again',()=>{this.modal?.destroy(true);this.modal=null;this.interact();}]])],
            [correct,()=>this.dialog(ticket.line,`${places[ticket.from]} → ${places[ticket.to]}\n${ticket.platform} · Departure confirmed.`,[['Board the train',()=>{this.ticket=null;this.loadPlace(ticket.to);}]])]
          ]);
        }
        break;
      }
      case 'staff':this.stationHelp();break;
      case 'shop':this.dialog('NewDays / ニューデイズ','The station’s convenience store: onigiri, ekiben, drinks and snacks.\nShopping, and spending those ¥1 and ¥5 coins, will come in a later version.');break;
      case 'westExit':case 'eastExit':{
        const west=this.nearby()==='westExit',station=stations[this.place as Hub],walk=west?undefined:station.walk;
        this.dialog(west?'西口 / West exit':'東口 / East exit',`This way leads to ${station[west?'west':'east'][1]}.\nIt does not lead to the trains.`,walk?[[walk.label,()=>this.loadPlace(walk.east)]]:[['Check my ticket',()=>this.showTicket()]]);break;
      }
      case 'return':{
        const hub=returnHub(this.place);
        this.dialog('Back to '+stations[hub].en,hub==='tokyo'?'Free return to Tokyo in this prototype.':hub==='kamakura'?'A short walk back to the JR station.\nThe way to Tokyo is a ticket from its machines.':'The local return is included in the excursion ticket.',[['Return to the station',()=>this.loadPlace(hub)]]);break;
      }
      case 'photo':this.collected.add(this.place);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.dialog('A memory for your journal',`${places[this.place]}\n\nPlaceholder for your future travel photo.\nThe memory is saved on this device.`);break;
      default:this.dialog('Welcome to Japan','Tap the map to move, or tap a spot to walk there.\nKeyboard: arrows or WASD (ZQSD on AZERTY), E or Space to interact.\nGamepad: stick or D-pad, A to interact.\n\nTicket machines on the back wall.\nFollow the signs or ask at the ticket office.');
    }
  }
  private showTicket(){
    if(!this.ticket){this.dialog('Your ticket wallet','No ticket.\nLook for the きっぷ machines on the back wall.\nThe staff at the みどりの窓口 counter can help.');return;}
    const ticket=this.ticket;
    if(ticket.kind==='fare'){this.dialog('普通乗車券 / Fare ticket',`TOKYO → ¥${ticket.fare.toLocaleString('en-US')}\nJR · 1 adult · One way\nNo destination chosen at purchase.\nFind its fare on the map at the machines.`);return;}
    this.dialog('乗車券 / Your ticket',`${ticket.from.toUpperCase()} → ${ticket.to.toUpperCase()}\n${ticket.line}\n${ticket.platform} · 1 adult · ¥${ticket.fare.toLocaleString('en-US')}\n${ticket.reservation?ticket.reservation.day+' · '+ticket.reservation.train+' · '+ticket.reservation.seat:ticket.service==='shinkansen'?'Shinkansen · one way':isHub(ticket.to)?'One way':'Return to hub included'}`);
  }
  private stationHelp(){
    const hub=isHub(this.place)?this.place:'tokyo';
    const body=this.ticket?.kind==='fare'?`Your JR ticket is worth ¥${this.ticket.fare.toLocaleString('en-US')}.\nThe map at the machines shows each station’s fare.\nThen choose your trip at the local gates,\nright beside this office. A ticket that is too cheap is refused.`:this.ticket?`For ${this.ticket.to.toUpperCase()}, look for ${this.ticket.platform}.\n${this.ticket.service==='local'?'在来線 gates, right beside this office.':'新幹線 gates, on the far right.'}\nOn the board, check the line name too.\nThe 西口 and 東口 exits lead out of the station.`:`きっぷ: ticket machines on the back wall.\n在来線: local lines, ${platformFor(hub,'local')}, central gates beside this office.\n${hasShinkansen(hub)?`新幹線: Shinkansen, ${platformFor(hub,'shinkansen')}, gates on the far right.`:'No Shinkansen here: the far right is the NewDays.'}\nThe yellow signs point to the exits.`;
    const choices:[string,()=>void][]=[['Thanks, I’ll look',()=>{this.modal?.destroy(true);this.modal=null;}]];
    if(hub==='tokyo')choices.push(['Ask for a fare hint',()=>this.tokyoFareHint()]);
    this.dialog('駅員 / Station staff',body,choices);
  }
  private tokyoFareHint(){
    this.stopNavigation();this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.departures?.destroy();this.departures=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    this.departures=openTokyoDepartures(station=>{close();this.dialog('駅員 / Fare hint',`For ${station.en}, look for ¥${station.fare}\non the map of fares from Tokyo.\nLine: ${station.line}.\nSelecting the amount at the machine is up to you.`)},close,true);
  }
  private tokyoDepartures(ticket:FareTicket){
    this.stopNavigation();this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.departures?.destroy();this.departures=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    this.departures=openTokyoDepartures(station=>{
      close();
      if(ticket.fare<station.fare){
        this.dialog('運賃不足 / Fare too low',`To ${station.en}: ¥${station.fare}.\nYour ticket: ¥${ticket.fare}.\nYou keep the ticket. Choose another amount.`,[['Back to the machine',()=>this.ticketTerminal('local')]]);return;
      }
      this.dialog(station.line,`TOKYO → ${station.en.toUpperCase()}\nFare: ¥${station.fare} · Ticket: ¥${ticket.fare}\n${ticket.fare>station.fare?'Ticket accepted. The overpayment is not refunded.':'The amount matches.'}`,[['Board the train',()=>{this.ticket=null;if(station.id==='kamakura'){this.loadPlace('kamakura');return;}this.currentStation=station;this.loadPlace('jr-stop');}]]);
    },close);
  }
  private ticketTerminal(service:Service='local'){
    if(!isHub(this.place))return;
    const hub=this.place;
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.machine?.destroy();this.hall?.destroy();this.machine=null;this.machineId=null;
    this.modal=this.add.container(0,0).setDepth(20);
    this.hall=new MachineHall(hub,service,(kind,id)=>{
      if(this.machine&&this.machineId===id){this.machine.resume();return;}
      this.machine?.destroy();this.machineId=id;
      this.machine=new TicketMachine(hub,kind,ticket=>{this.ticket=ticket},()=>{
        this.machine=null;this.machineId=null;this.hall?.resume();this.input.keyboard?.resetKeys();
      },{fixedService:true,lookAtWall:()=>{this.machine?.suspend();this.hall?.resume(true);},wallet:this.wallet,onWallet:()=>this.refreshPurse(),trayKey:trayKey(hub,id)});
    },()=>{
      this.machine?.destroy();this.machine=null;this.machineId=null;this.hall=null;this.hallSpot='';this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();
    },{
      // The hall shows the concourse's own commuters, read live from their top-down sprites (the simulation keeps running under the hall).
      figures:()=>this.commuters.map(c=>({look:c.look,x:c.image.x,y:c.image.y,alpha:c.image.alpha,face:c.image.texture.key.split('-')[2] as Figure['face'],moving:!c.face&&!!c.steps.length&&!('wait' in c.steps[0])})),
      standAt:machine=>{this.hallSpot='machine'+machine},busy:machine=>this.inUse('machine'+machine),start:this.machineAhead(),
    });
  }
  private refreshPurse(){const heavy=walkFactor(this.wallet)<1;this.purse.setText(`◉ ${coinCount(this.wallet)} coins${heavy?' · heavy':''}\n¥${walletTotal(this.wallet).toLocaleString('en-US')}`).setColor(heavy?'#ffb35a':'#e6ce98');}
  /** The purse: every coin beyond eight slows the walk. 1 and 5 yen coins are refused by ticket machines. */
  private showWallet(){
    const line=(values:number[])=>values.map(v=>`¥${v.toLocaleString('en-US')} ×${this.wallet[v]??0}`).join('   ');
    const factor=walkFactor(this.wallet);
    this.dialog('財布 / Wallet',`${line(notes)}\n${line(coins)}\nTotal ¥${walletTotal(this.wallet).toLocaleString('en-US')} · ${coinCount(this.wallet)} coins · ${factor<1?`walking at ${Math.round(factor*100)}%`:'full speed'}`,[
      ['Withdraw ¥10,000 at the ATM',()=>{this.wallet[10000]=(this.wallet[10000]??0)+1;saveWallet(this.wallet);this.refreshPurse();this.showWallet();}]
    ]);
  }
  private album(){this.dialog('My travel journal',`MEMORIES COLLECTED · ${this.collected.size}/2\n\n${this.collected.has('kamakura-trail')?'●':'○'} Kamakura · The temple cherry trees\n${this.collected.has('arashiyama')?'●':'○'} Arashiyama · The bamboo path\n\nReal photos will be added in a future version.`);}
  private canWalk(x:number,y:number){
    // Down to the canvas edge, feet still in view (the hub's world sits 24px lower).
    return x>18&&x<942&&y>88&&y<628-this.world.y&&!this.solids.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(r,new Phaser.Geom.Rectangle(x-10,y-10,20,25)));
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
    const cols=58,rows=33,step=16;
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
    const tail=c.steps.slice(-3),inner=tail[0] as {x:number;y:number},here={x:c.image.x,y:c.image.y},other=this.freeMachine();
    if(other)this.spots.add(other.spot);
    c.steps=[...(other?[...this.route(here,other),{wait:between(3000,7000),face:'up',spot:other.spot},...this.route(other,inner)]:this.route(here,inner)),...tail.slice(1)];
  }
  /** A random trip: in from an exit, the bottom of the concourse, off a train through the gates or out of the shop, maybe a stop at a free machine, counter or spot to look around,
   * then out through the gates, into the shop or out by an exit. */
  private planTrip(c:Commuter){
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
  update(_time:number,delta:number){
    if(!this.player)return;
    if(isHub(this.place)){
      const ahead=this.machineAhead();this.playerSpot=this.hall?this.hallSpot:ahead>=0?'machine'+ahead:'';
      this.commuters.forEach((commuter,i)=>{if(this.playerSpot)this.giveWay(commuter);commuter.bump=Math.min(1,(commuter.bump??1)+delta/700);this.stepCommuter(commuter,i,Math.min(delta,100))});
      const announcements=['まもなく電車がまいります…','出口 Exit / 乗換 Transfer / 改札 Gates','足元の黄色い線までお下がりください'];
      this.announcement.setText(announcements[Math.floor(this.time.now/6500)%announcements.length]);
      this.world.sort('y');
    }else this.announcement.setText('');
    const pad=this.gamepad();
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
    const speed=190*walkFactor(this.wallet)*this.bump*Math.min(delta,40)/1000;
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
    this.moving=!!(x||y);this.walk+=delta;
    if(this.moving)this.facing=Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');
    this.sprite.setTexture(`traveller-${this.facing}-${this.moving?Math.floor(this.walk/130)%3:0}`);
    const messages:Record<string,string>={ticket:'Buy a ticket',local:'在来線 改札',shinkansen:'新幹線 改札',shop:'NewDays',staff:'駅員 / Staff',westExit:'西口',eastExit:'東口',return:'Back to the station',photo:'Keep a memory'};
    const near=this.nearby(),frame=near?this.frameFor(near):null;
    if(this.pending&&near===this.pending){this.pending='';this.stopNavigation();this.interact();return}
    if(!this.path.length)this.pending='';
    this.prompt.setText(near?`◎ ${messages[near]} · E / Ⓐ / click`:'').setVisible(!!near);
    if(near)this.prompt.setPosition(Phaser.Math.Clamp(this.player.x,this.prompt.width/2+8,952-this.prompt.width/2),Math.max(this.player.y+this.world.y-62,this.prompt.height+76));
    this.glow.clear();if(frame)this.glow.fillStyle(0xf3d76b,.14).fillRoundedRect(...frame,6).lineStyle(3,0xf3d76b,.6+.35*Math.sin(this.time.now/170)).strokeRoundedRect(...frame,6);
  }
}
// Started once the pixel font is in: the map lettering is painted into textures with it.
document.fonts.load('10px "Yorimichi Bitmap"').catch(()=>{}).finally(()=>new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#91ab78',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Journey}));
// No browser menu on right click, over the scene or the hall and kiosk overlays.
document.addEventListener('contextmenu',e=>e.preventDefault());
