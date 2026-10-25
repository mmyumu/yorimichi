import Phaser from 'phaser';
import './style.css';
import { makeArt } from './art';
import { MachineHall } from './machine-hall';
import { TicketMachine, trayKey, type TravelTicket, type FareTicket } from './ticket-machine';
import { openTokyoDepartures, type FareStation } from './tokyo-fares';
import { coinCount, coins, loadWallet, notes, saveWallet, walkFactor, walletTotal } from './wallet';

import { places, isHub, returnHub, platformFor, type Place, type Service } from './network';
// Highlight frames around the hotspots of nearby(), in scene pixels (art × 2), shown while the player is in range.
const hotspotFrames:Record<string,[number,number,number,number]>={staff:[464,290,40,52],ticket:[450,370,60,80],local:[118,254,132,78],shinkansen:[664,254,132,78],westExit:[14,444,162,64],eastExit:[778,444,168,64],photo:[682,376,56,58],return:[96,336,116,58],'return-jr-stop':[100,330,206,94]};
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
  private commuters:Phaser.GameObjects.Image[]=[];
  private announcement!:Phaser.GameObjects.Text;
  // Only places that still exist: memories from removed trips (Kawaguchiko) are dropped.
  private collected=new Set<string>((JSON.parse(localStorage.getItem('yorimichi-memories')||'[]') as string[]).filter(place=>place==='kamakura'||place==='arashiyama'));
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
      if(this.modal||objects.length||pointer.y<=70||pointer.y>=550)return;
      const spot=this.hotspotAt(pointer.x,pointer.y);
      if(spot&&spot===this.nearby()){this.interact();return}
      const frame=spot?this.frameFor(spot):null;this.pending=spot;
      this.navigate(frame?frame[0]+frame[2]/2:pointer.x,frame?frame[1]+frame[3]/2:pointer.y);
    });
    this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>this.input.setDefaultCursor(!this.modal&&this.hotspotAt(pointer.x,pointer.y)?'pointer':''));
  }
  private rect(x:number,y:number,w:number,h:number,color:number,container=this.world){const r=this.add.rectangle(x,y,w,h,color).setOrigin(0);container.add(r);return r}
  private label(x:number,y:number,text:string,size=16,color='#283d3c',container=this.world){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,lineSpacing:5});container.add(t);return t}
  private loadPlace(place:Place){
    this.machine?.destroy();this.machine=null;this.hall?.destroy();this.hall=null;this.machineId=null;this.departures?.destroy();this.departures=null;
    if(place!=='jr-stop')this.currentStation=null;
    this.modal?.destroy();this.modal=null;this.world?.destroy(true);this.hud?.destroy(true);
    this.place=place;this.commuters=[];this.path=[];this.solids=[];this.direction={x:0,y:0};
    this.world=this.add.container(0,0);this.hud=this.add.container(0,0);
    this.world.add(this.add.image(0,0,'map-'+place).setOrigin(0).setScale(2));
    if(isHub(place))this.solids.push(new Phaser.Geom.Rectangle(0,70,960,177),new Phaser.Geom.Rectangle(350,250,260,65),new Phaser.Geom.Rectangle(451,375,58,62));
    if(place==='kamakura'||place==='arashiyama')this.solids.push(new Phaser.Geom.Rectangle(330,94,270,178));
    if(place==='jr-stop')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,185));
    if(isHub(place))for(let i=0;i<9;i++){
      const commuter=this.add.image(94+i*87,352+(i%3)*58,'traveller-'+(i%2?'left':'right')+'-0').setOrigin(.5,.85).setScale(1.7).setTint([0xb5c7c0,0xc7baa0,0x8facae][i%3]);
      this.world.add(commuter);this.commuters.push(commuter);
    }
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
    this.rect(0,564,960,76,0x263d39,this.hud);this.rect(0,564,960,2,0xb8ad83,this.hud);
    this.label(24,582,'TAP / CLICK TO EXPLORE',11,'#e6ce98',this.hud);
    this.label(24,605,'Arrows · WASD · E act · gamepad Ⓐ',10,'#aab69b',this.hud);
    this.prompt=this.label(297,589,'',13,'#fff0d4',this.hud);
    this.announcement=this.label(300,614,'',10,'#96aa95',this.hud);
  }
  private button(x:number,y:number,w:number,h:number,text:string,fn:()=>void,parent:Phaser.GameObjects.Container){
    this.rect(x-2,y-2,w+4,h+4,0x9b9e7d,parent);this.rect(x,y+3,w,h,0x182f2c,parent);const b=this.rect(x,y,w,h,0x415c4f,parent).setInteractive({useHandCursor:true});this.label(x+w/2,y+h/2,text,16,'#fff0d4',parent).setOrigin(.5);b.on('pointerdown',fn);return b;
  }
  private frameFor(spot:string){return hotspotFrames[spot==='return'&&this.place==='jr-stop'?'return-jr-stop':spot]}
  private hotspotAt(x:number,y:number){
    const spots=isHub(this.place)?['staff','ticket','local','shinkansen','westExit','eastExit']:this.place==='jr-stop'?['return']:['return','photo'];
    return spots.find(spot=>{const [fx,fy,w,h]=this.frameFor(spot);return x>=fx&&x<fx+w&&y>=fy&&y<fy+h})??'';
  }
  private nearby(){
    const {x,y}=this.player;
    if(isHub(this.place)){
      if(Phaser.Math.Distance.Between(x,y,480,335)<46)return 'staff';
      if(x<115&&y>455)return 'westExit';
      if(x>845&&y>455)return 'eastExit';
      if(Phaser.Math.Distance.Between(x,y,480,439)<83)return 'ticket';
      if(Phaser.Math.Distance.Between(x,y,200,300)<95)return 'local';
      if(Phaser.Math.Distance.Between(x,y,750,300)<95)return 'shinkansen';
    }else{
      if(x<240&&y<453)return 'return';
      if(this.place!=='jr-stop'&&Phaser.Math.Distance.Between(x,y,710,409)<95)return 'photo';
    }
    return '';
  }
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
          this.dialog(service==='local'?'在来線 改札 / Local gates':'新幹線 改札 / Shinkansen gates',this.ticket?this.ticket.kind==='fare'?'This ticket is only valid on Tokyo local JR lines.':`Your ticket is for ${this.ticket.platform.toLowerCase()}.\nPick the matching platform or another ticket.`:'Buy your ticket at the machine in the middle of the hall.',[[service==='local'?'See local lines':'See the Shinkansen',()=>this.ticketTerminal(service)]]);
        }else{
          const ticket=this.ticket;
          if(ticket.kind==='fare')break;
          const correct=service==='shinkansen'?(this.place==='tokyo'?'のぞみ / NOZOMI → KYOTO':'のぞみ / NOZOMI → TOKYO'):'嵯峨野線 / SAGANO → SAGA-ARASHIYAMA';
          const decoy=service==='shinkansen'?'回送 / NOT IN SERVICE':'反対方向 / DIRECTION KYOTO';
          this.dialog(ticket.platform+' · 発車案内',`Two trains are announced.\nTicket: ${ticket.to.toUpperCase()} · ${ticket.line}\nCheck the destination before boarding.`,[
            [decoy,()=>this.dialog('Wrong train',service==='shinkansen'?'This train is not in service.\nYour ticket is still valid.':'This departure does not serve your destination.\nYour ticket is still valid.',[['Read the board again',()=>{this.modal?.destroy(true);this.modal=null;this.interact();}]])],
            [correct,()=>this.dialog(ticket.line,`${places[ticket.from]} → ${places[ticket.to]}\n${ticket.platform} · Departure confirmed.`,[['Board the train',()=>{this.ticket=null;this.loadPlace(ticket.to);}]])]
          ]);
        }
        break;
      }
      case 'staff':this.stationHelp();break;
      case 'westExit':case 'eastExit':{
        const west=this.nearby()==='westExit';
        this.dialog(west?'西口 / West exit':'東口 / East exit',`This way leads to ${this.place==='tokyo'?(west?'Marunouchi and the buses':'Yaesu and the taxis'):(west?'Hachijo and the buses':'Karasuma and the taxis')}.\nIt does not lead to the trains.`,[['Check my ticket',()=>this.showTicket()]]);break;
      }
      case 'return':{
        const hub=returnHub(this.place);
        this.dialog('Back to '+(hub==='tokyo'?'Tokyo':'Kyoto'),hub==='tokyo'?'Free return to Tokyo in this prototype.':'The local return is included in the excursion ticket.',[['Return to the station',()=>this.loadPlace(hub)]]);break;
      }
      case 'photo':this.collected.add(this.place);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.dialog('A memory for your journal',`${places[this.place]}\n\nPlaceholder for your future travel photo.\nThe memory is saved on this device.`);break;
      default:this.dialog('Welcome to Japan','Tap the map to move, or tap a spot to walk there.\nKeyboard: arrows or WASD (ZQSD on AZERTY), E or Space to interact.\nGamepad: stick or D-pad, A to interact.\n\nMachine in the middle: choose your ticket.\nFollow the signs or ask the staff.');
    }
  }
  private showTicket(){
    if(!this.ticket){this.dialog('Your ticket wallet','No ticket.\nLook for the きっぷ machine in the hall.\nThe staff at the counter can help.');return;}
    const ticket=this.ticket;
    if(ticket.kind==='fare'){this.dialog('普通乗車券 / Fare ticket',`TOKYO → ¥${ticket.fare.toLocaleString('en-US')}\nJR · 1 adult · One way\nNo destination chosen at purchase.\nFind its fare on the map at the machines.`);return;}
    this.dialog('乗車券 / Your ticket',`${ticket.from.toUpperCase()} → ${ticket.to.toUpperCase()}\n${ticket.line}\n${ticket.platform} · 1 adult · ¥${ticket.fare.toLocaleString('en-US')}\n${ticket.reservation?ticket.reservation.day+' · '+ticket.reservation.train+' · '+ticket.reservation.seat:ticket.service==='local'?'Return to hub included':'Shinkansen · one way'}`);
  }
  private stationHelp(){
    const hub=isHub(this.place)?this.place:'tokyo';
    const body=this.ticket?.kind==='fare'?`Your JR ticket is worth ¥${this.ticket.fare.toLocaleString('en-US')}.\nThe map at the machines shows each station’s fare.\nThen choose your trip at the local gates,\non the left. A ticket that is too cheap is refused.`:this.ticket?`For ${this.ticket.to.toUpperCase()}, look for ${this.ticket.platform}.\n${this.ticket.service==='local'?'在来線 gates, on the left.':'新幹線 gates, on the right.'}\nOn the board, check the line name too.\nThe 西口 and 東口 exits lead out of the station.`:`きっぷ: tickets at the central machine.\n在来線: local lines, ${platformFor(hub,'local')}, on the left.\n新幹線: Shinkansen, ${platformFor(hub,'shinkansen')}, on the right.\nThe big yellow arrows also point to exits.`;
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
      this.machine?.destroy();this.machine=null;this.machineId=null;this.hall=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();
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
  private album(){this.dialog('My travel journal',`MEMORIES COLLECTED · ${this.collected.size}/2\n\n${this.collected.has('kamakura')?'●':'○'} Kamakura · The temple cherry trees\n${this.collected.has('arashiyama')?'●':'○'} Arashiyama · The bamboo path\n\nReal photos will be added in a future version.`);}
  private canWalk(x:number,y:number){
    return x>18&&x<942&&y>88&&y<548&&!this.solids.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(r,new Phaser.Geom.Rectangle(x-10,y-10,20,25)));
  }
  private stopNavigation(){this.path=[];this.marker?.setVisible(false);}
  private navigate(x:number,y:number){
    // Search reachable ground so a tap on scenery stops beside the obstacle.
    const cols=58,rows=28,step=16;
    const point=(id:number)=>({x:24+(id%cols)*step,y:104+Math.floor(id/cols)*step});
    const start=Phaser.Math.Clamp(Math.round((this.player.y-104)/step),0,rows-1)*cols+Phaser.Math.Clamp(Math.round((this.player.x-24)/step),0,cols-1);
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
    this.path=[];
    for(let id=best;id!==-1;id=parents.get(id)!)this.path.unshift(point(id));
    // The start cell is only the snapped player position and may sit in an obstacle's margin: head for the next one.
    if(this.path.length>1)this.path.shift();
    if(distance<step*step&&this.canWalk(x,y))this.path.push({x,y});
    const last=this.path[this.path.length-1];this.marker.setPosition(last.x,last.y).setVisible(true);
  }
  update(_time:number,delta:number){
    if(!this.player)return;
    if(isHub(this.place)){
      this.commuters.forEach((person,i)=>{person.x=90+((this.time.now*.017*(i%2?-1:1)+i*87)%780+780)%780;person.setTexture(`traveller-${i%2?'left':'right'}-${Math.floor(this.time.now/180+i)%3}`)});
      const announcements=['まもなく電車がまいります…','出口 Exit / 乗換 Transfer / 改札 Gates','足元の黄色い線までお下がりください'];
      this.announcement.setText(announcements[Math.floor(this.time.now/6500)%announcements.length]);
    }else this.announcement.setText('');
    const pad=this.gamepad();
    if(this.modal){this.glow.clear();this.held.clear();this.pending='';return;}
    let x=pad.x||this.direction.x,y=pad.y||this.direction.y;if(this.keys.left.isDown)x=-1;if(this.keys.right.isDown)x=1;if(this.keys.up.isDown)y=-1;if(this.keys.down.isDown)y=1;
    if(this.held.has('KeyA'))x=-1;if(this.held.has('KeyD'))x=1;if(this.held.has('KeyW'))y=-1;if(this.held.has('KeyS'))y=1;
    if(x||y){this.stopNavigation();this.pending=''}
    const speed=150*walkFactor(this.wallet)*Math.min(delta,40)/1000;
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
    const messages:Record<string,string>={ticket:'Buy a ticket',local:'在来線 改札',shinkansen:'新幹線 改札',staff:'駅員 / Staff',westExit:'西口',eastExit:'東口',return:'Back to the station',photo:'Keep a memory'};
    const near=this.nearby(),frame=near?this.frameFor(near):null;
    if(this.pending&&near===this.pending){this.pending='';this.stopNavigation();this.interact();return}
    if(!this.path.length)this.pending='';
    this.prompt.setText(near?`◎ ${messages[near]} · E / Ⓐ / click`:'A detour, a memory.');
    this.glow.clear();if(frame)this.glow.fillStyle(0xf3d76b,.14).fillRoundedRect(...frame,6).lineStyle(3,0xf3d76b,.6+.35*Math.sin(this.time.now/170)).strokeRoundedRect(...frame,6);
  }
}
export const game = new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#91ab78',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Journey});
