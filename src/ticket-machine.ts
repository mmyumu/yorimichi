import { routes, stations, type Hub, type Route, type Service } from './network';
import { connectedPad } from './pad';
import { paintTicket } from './ticket-gate';
import { fareBetween, faresFrom, shinkansenMinutes } from './fares';
import { railLine } from './rail';
import { onTokyoBoard, renderTokyoFareMap } from './tokyo-fares';
import { accepted, coinCount, heapSpot, isCoin, loadWallet, machineSound, makeChange, notes, coins, pieceArt, saveWallet, walletTotal, walkFactor, type Wallet } from './wallet';

// `punched` with the hub whose gate let it through on the way in: the gate's punch leaves a hole in it, and the ticket knows where its trip began.
export interface RouteTicket extends Route { kind:'route'; reservation?: { day:string; train:string; seat:string }; punched?:Hub }
export interface FareTicket {kind:'fare';from:Hub;service:'local';fare:number;punched?:Hub}
/** A fare adjustment ticket (精算券) from the machine by the exit gates: the trip from `from` paid up to `to` (a station's Japanese name, English `toEn`), `fare` the difference paid. Only good for leaving there. */
export interface AdjustTicket {kind:'adjust';from:Hub;to:string;toEn:string;service:'local';fare:number;punched?:Hub}
export type TravelTicket=RouteTicket|FareTicket|AdjustTicket;
/** The fare of the trip a punched ticket made, from the station whose gate punched it out at `exit` (a station's Japanese name): 0 back where it came in, null where it cannot take the traveller.
 * A route is its own fare to its destination; a fare ticket pays the fare by local lines between the two stations (fares.ts). */
export function tripFare(ticket:TravelTicket,exit:string){
  if(!ticket.punched||ticket.kind==='adjust')return null;
  const entry=stations[ticket.punched].ja;if(entry===exit)return 0;
  if(ticket.kind==='route')return ticket.to in stations&&stations[ticket.to as Hub].ja===exit?ticket.fare:null;
  return fareBetween(entry,exit);
}
/** What is still owed to leave through the gates at `exit` with `ticket`: 0 when it covers the trip, null when it cannot be used to leave there. */
export function fareDue(ticket:TravelTicket,exit:string){
  if(ticket.kind==='adjust')return ticket.to===exit?0:null;
  const fare=tripFare(ticket,exit);return fare===null?null:Math.max(0,fare-ticket.fare);
}
/** What a machine sells: tickets, Shinkansen tickets, nothing but IC card charges, or fare adjustments (`adjust`, the のりこし精算機 by the exit gates). */
export type MachineKind=Service|'charge'|'adjust';
type Step='home'|'method'|'fares'|'map'|'destination'|'date'|'passengers'|'train'|'seat'|'review'|'adjust'|'payment'|'issued';
type Lang='ja'|'en';
/** `adjust` (the fare adjustment machine): the station it stands in, the tickets in the traveller's pocket and `hand`, which takes one out of it when it goes into the slot. */
interface MachineOptions {fixedService?:boolean;lookAtWall?:()=>void;wallet?:Wallet;onWallet?:()=>void;trayKey?:string;adjust?:{ja:string;en:string;pocket:()=>TravelTicket[];hand:(ticket:TravelTicket)=>void}}
// What lies in the tray under the slots: a piece of money (yen) or the ticket.
type TrayItem={value:number|'ticket';ticket?:TravelTicket;fresh?:boolean};
// Each machine keeps what was left in its outlets (by hub and machine id), so walking away forgets nothing.
const trays:Record<string,TrayItem[]>=(()=>{try{return JSON.parse(localStorage.getItem('yorimichi-trays')||'{}')}catch{return {}}})();
const saveTrays=()=>localStorage.setItem('yorimichi-trays',JSON.stringify(trays,(key,value)=>key==='fresh'?undefined:value));
export const trayKey=(hub:Hub|string,id:string)=>hub+'-'+id;
export const leftInTray=(key:string)=>!!trays[key]?.length;

// The pieces a slot takes, drawn as on the machine's label plate: ringed coins (the 50 with its hole) and framed notes.
const acceptedIcons=(slot:string)=>slot==='coin'
  ?`<svg class="slot-accepts" viewBox="0 0 128 30" width="128" height="30" aria-label="500, 100, 50, 10 yen">${[500,100,50,10].map((value,i)=>{const x=15+i*32;return `<circle cx="${x}" cy="15" r="13.5"/>`+(value===50?`<text x="${x}" y="12.5" font-size="8">50</text><circle cx="${x}" cy="20" r="3"/>`:`<text x="${x}" y="18.5" font-size="${value>99?9:10}">${value}</text>`)}).join('')}</svg>`
  :`<svg class="slot-accepts" viewBox="0 0 98 34" width="98" height="34" aria-label="10000, 5000, 1000 yen">${[10000,5000,1000].map((value,i)=>{const x=1+(i%2)*49,y=1+Math.floor(i/2)*17;return `<rect x="${x}" y="${y}" width="46" height="15"/><text x="${x+23}" y="${y+11}" font-size="9">${value}</text>`}).join('')}</svg>`;

/** Re-drawn from the JR-West illustrated vending-machine guide (see REFERENCES.md).
 * Real UI families and purchase sequences; only this game's network is bookable. */
export class TicketMachine {
  private overlay=document.createElement('div');
  private panel=document.createElement('div');
  private design=document.createElement('div');
  private observer:ResizeObserver;
  private service:MachineKind;
  private step:Step='home';
  private history:Step[]=[];
  private lang:Lang='ja';
  private route:Route|null=null;
  private deposited=0;
  private wallet:Wallet;
  // Pieces held by the machine until the ticket is issued, so a cancel gives back the very same ones.
  private inserted:number[]=[];
  private tray:TrayItem[];
  private change=0;
  private notice:[string,string]|null=null;
  private flash='';
  private justDragged=0;
  private day='Today';
  private train='NOZOMI 21 · 14:20';
  private seat='Any seat';
  private fareAmount:number|null=null;
  // At the fare adjustment machine: the ticket in its slot, the fare of its trip and what is left to pay.
  private adjusting:{ticket:TravelTicket;fare:number;due:number}|null=null;
  private mapZoom=1;
  private hidden=false;
  private disposed=false;
  private padFrame=0;
  private padPrevious:boolean[]=[];
  private lastNavigation=0;
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private hub:Hub,service:MachineKind,private issue:(ticket:TravelTicket)=>void,private dismiss:()=>void,private uiOptions:MachineOptions={}){
    this.service=service;this.wallet=uiOptions.wallet??loadWallet();this.tray=uiOptions.trayKey?trays[uiOptions.trayKey]??=[]:[];
    this.overlay.className='machine-overlay';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Ticket machine');
    this.panel.className='machine-viewport';this.design.className='machine-design';this.panel.append(this.design);this.overlay.append(this.panel);document.body.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.design.style.transform=`scale(${this.panel.clientWidth/960})`);this.observer.observe(this.panel);
    // :focus-visible ignores gamepad input once the mouse was used, so the gamepad marks its own focus ring; the pointer clears it.
    this.overlay.addEventListener('pointerdown',()=>this.overlay.classList.remove('pad-nav'));this.overlay.addEventListener('pointermove',event=>{if(event.movementX||event.movementY)this.overlay.classList.remove('pad-nav')});
    this.overlay.addEventListener('keydown',this.onKey);this.padPrevious=this.currentPad()?.buttons.map(b=>b.pressed)??[];this.render();this.padFrame=requestAnimationFrame(this.pollPad);
  }
  private currentPad(){return connectedPad();}
  private pollPad=(time:number)=>{
    if(this.disposed)return;
    const pad=this.currentPad();
    if(!this.hidden&&pad){
      const pressed=pad.buttons.map(b=>b.pressed);
      const dx=(pressed[15]?1:0)-(pressed[14]?1:0)+(Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0);
      const dy=(pressed[13]?1:0)-(pressed[12]?1:0)+(Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0);
      if(pad.id!=='mouse'&&(dx||dy||pressed.some((p,i)=>p&&!this.padPrevious[i])))this.overlay.classList.add('pad-nav');
      if((dx||dy)&&time-this.lastNavigation>180){this.moveFocus(dx,dy);this.lastNavigation=time;}
      if(pressed[0]&&!this.padPrevious[0]){
        const active=document.activeElement as HTMLElement;
        if(this.overlay.contains(active))active.click();
      }
      // B steps back like もどる (returning any inserted money); only the home screen, or a finished purchase, leaves the machine.
      if(pressed[1]&&!this.padPrevious[1]){if(this.history.length&&this.step!=='issued')this.back();else{this.close();return;}}
      if(pressed[3]&&!this.padPrevious[3]&&this.uiOptions.lookAtWall)this.uiOptions.lookAtWall();
      this.padPrevious=pressed;
    }
    if(!this.disposed)this.padFrame=requestAnimationFrame(this.pollPad);
  };
  private moveFocus(dx:number,dy:number){
    // Only the machine and the wallet: the controls above it are reached with Y and B.
    const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('.machine-screen button:not(:disabled),.pay-control button:not(:disabled)')).filter(button=>button.getClientRects().length);
    const active=document.activeElement as HTMLButtonElement;
    if(!buttons.includes(active)){buttons[0]?.focus();return;}
    const rect=active.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    // Up and down stay in the column: the screen and its payment block, or the wallet beside them, which left and right reach.
    const column=(button:Element)=>!!button.closest('.machine-wallet'),vertical=Math.abs(dy)>Math.abs(dx);
    let best:HTMLButtonElement|undefined,score=Infinity;
    for(const button of buttons){
      if(button===active||(vertical&&column(button)!==column(active)))continue;
      const next=button.getBoundingClientRect(),nx=next.x+next.width/2-x,ny=next.y+next.height/2-y;
      const primary=Math.abs(dx)>=Math.abs(dy)?nx*Math.sign(dx):ny*Math.sign(dy);
      const across=Math.abs(dx)>=Math.abs(dy)?Math.abs(ny):Math.abs(nx);
      // Buttons in line with this one come first (same row going sideways, same column going up or down); sideways past the last one in line, on to the other column.
      const inLine=vertical?next.left<rect.right&&next.right>rect.left:next.top<rect.bottom&&next.bottom>rect.top,total=primary+across*2+(inLine||(!vertical&&column(button)!==column(active))?0:10000);
      if(primary>2&&total<score){best=button;score=total;}
    }
    best?.focus();
  }
  private tr(ja:string,en:string){return this.lang==='ja'?ja:en;}
  private onKey=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();this.close();}
    if(event.key==='Tab'){
      const focusable=Array.from(this.overlay.querySelectorAll<HTMLElement>('button:not(:disabled), input'));
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  };
  suspend(){this.hidden=true;this.overlay.hidden=true;this.overlay.style.display='none';}
  resume(){this.padPrevious=this.currentPad()?.buttons.map(b=>b.pressed)??[];this.hidden=false;this.overlay.hidden=false;this.overlay.style.display='';this.overlay.querySelector<HTMLButtonElement>('.machine-screen button')?.focus();}
  destroy(){if(this.disposed)return;this.refund();this.release();this.keepWallet();this.disposed=true;cancelAnimationFrame(this.padFrame);this.observer.disconnect();this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.dismiss();}
  private go(step:Step){this.history.push(this.step);this.step=step;this.render();}
  private back(){if(this.step==='payment')this.refund();if(this.step==='adjust')this.release();this.step=this.history.pop()??'home';this.render();}
  // A fare button goes straight to payment: もどる (or B) is enough to pick another amount.
  private pay(){this.deposited=0;this.inserted=[];this.go('payment');}
  private keepWallet(){saveWallet(this.wallet);saveTrays();this.uiOptions.onWallet?.();}
  private say(notice:[string,string]){this.notice=notice;this.render();}
  /** Cancel gives back what was inserted, into the tray, as real machines do. */
  private refund(){this.tray.push(...this.inserted.map(value=>({value,fresh:true})));this.inserted=[];this.deposited=0;}
  /** The ticket in the fare adjustment machine comes back out at the ticket outlet. */
  private release(){if(this.adjusting){this.tray.push({value:'ticket',ticket:this.adjusting.ticket,fresh:true});this.adjusting=null;this.fareAmount=null}}
  /** A ticket from the pocket pushed into a slot of the fare adjustment machine: it reads where the trip began and what the ticket paid, then shows what is left to pay;
   * a ticket that covers the trip, or that it cannot adjust, comes straight back out. */
  private insertTicket(ticket:TravelTicket,slot:string){
    const at=this.uiOptions.adjust;
    if(!at||slot!=='card'||this.step!=='home'||this.adjusting||this.tray.some(item=>item.value==='ticket')){machineSound('reject');this.flash='shake-'+slot;this.render();return;}
    at.hand(ticket);machineSound('note');
    const fare=tripFare(ticket,at.ja),due=fareDue(ticket,at.ja);
    if(!due||fare===null){
      this.tray.push({value:'ticket',ticket,fresh:true});this.keepWallet();
      this.say(ticket.kind==='adjust'?['精算済みのきっぷです。','This ticket is already adjusted.']:!ticket.punched?['入場記録がありません。係員にお申し出ください。','This ticket has no entry record. Please ask the station staff.']
        :fare===null?['このきっぷは精算できません。係員にお申し出ください。','This ticket cannot be adjusted here. Please ask the station staff.']
        :fare===0?['入場駅と同じ駅です。係員にお申し出ください。','You came in at this station. Please see the staff at the staffed window.']:['精算の必要はありません。そのまま改札をお通りください。','Nothing to pay: this ticket covers your trip.']);return;
    }
    this.adjusting={ticket,fare,due};this.fareAmount=due;this.keepWallet();this.go('adjust');
  }
  private take(index:number){
    const item=this.tray[index];if(!item)return;
    if(item.value==='ticket'){this.tray.splice(index,1);if(item.ticket)this.issue(item.ticket);}
    // One grab takes every coin, or every note, in the outlet.
    else{const coin=isCoin(item.value);for(let i=this.tray.length-1;i>=0;i--){const {value}=this.tray[i];if(value!=='ticket'&&isCoin(value)===coin){this.wallet[value]=(this.wallet[value]??0)+1;this.tray.splice(i,1)}}}
    this.keepWallet();machineSound('drop');
    // Everything taken: the machine thanks you and the traveller steps away.
    if(this.step==='issued'&&!this.tray.length){this.render();setTimeout(()=>{if(!this.disposed)this.close()},650);return;}
    this.render();
  }
  /** A piece pushed into a slot ('coin', 'note' or 'card'): money only fits its own slot, and only while a fare is due. A refusal is only a buzz and a shaking slot, no message. */
  private insert(value:number,slot:string){
    if(!this.wallet[value])return;
    if(slot==='card'||(slot==='coin')!==isCoin(value)){machineSound('reject');this.flash='shake-'+slot;this.render();return;}
    if(this.step!=='payment'){machineSound('reject');this.flash='shake-'+slot;this.render();return;}
    this.wallet[value]--;
    if(!accepted(value)){this.tray.push({value,fresh:true});this.keepWallet();machineSound('drop');this.flash='shake-coin';this.render();return;}
    this.inserted.push(value);this.deposited+=value;machineSound(isCoin(value)?'coin':'note');this.flash='take-'+slot;
    if(this.deposited>=this.price){
      let ticket:TravelTicket;
      // The fare adjustment machine keeps the old ticket and issues the 精算券 for the rest of the way out.
      if(this.adjusting&&this.uiOptions.adjust){const {ja,en}=this.uiOptions.adjust;ticket={kind:'adjust',from:this.adjusting.ticket.punched!,to:ja,toEn:en,service:'local',fare:this.adjusting.due};this.adjusting=null}
      else if(this.service==='local'&&this.fareAmount!==null)ticket={kind:'fare',from:this.hub,service:'local',fare:this.fareAmount};
      else if(this.route){
        ticket={...this.route,kind:'route'};
        if(this.service==='shinkansen')ticket.reservation={day:this.day,train:this.train,seat:this.seat};
      }else return;
      this.change=this.deposited-this.price;this.inserted=[];
      this.tray.push({value:'ticket',ticket,fresh:true},...makeChange(this.change).map(value=>({value,fresh:true})));
      this.step='issued';this.history=[];
    }
    this.keepWallet();this.render();
  }
  private slotAt(event:PointerEvent){return document.elementsFromPoint(event.clientX,event.clientY).map(e=>e.closest<HTMLElement>('[data-slot]')).find(Boolean)??null;}
  /** Wallet pieces (and the fare adjustment machine's tickets) can be dragged onto a slot; a plain click or gamepad A puts them in their own slot. */
  private grab(button:HTMLButtonElement,drop:(slot:string)=>void){
    button.addEventListener('pointerdown',down=>{
      if(down.button!==0||button.disabled)return;
      const image=button.querySelector('img')!;let ghost:HTMLImageElement|null=null;
      const hover=(slot:HTMLElement|null)=>this.overlay.querySelectorAll('[data-slot]').forEach(s=>s.classList.toggle('hover',s===slot));
      const move=(event:PointerEvent)=>{
        if(!ghost&&Math.hypot(event.clientX-down.clientX,event.clientY-down.clientY)>6){
          const rect=image.getBoundingClientRect();ghost=image.cloneNode() as HTMLImageElement;ghost.className='piece-ghost';ghost.style.width=rect.width*1.2+'px';ghost.style.height=rect.height*1.2+'px';this.overlay.append(ghost);
        }
        if(ghost){ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';hover(this.slotAt(event));}
      };
      const end=(event:PointerEvent)=>{
        button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',end);
        if(!ghost)return;
        ghost.remove();hover(null);this.justDragged=performance.now();
        const slot=event.type==='pointerup'?this.slotAt(event):null;if(slot)drop(slot.dataset.slot!);
      };
      button.setPointerCapture(down.pointerId);button.addEventListener('pointermove',move);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
    });
  }

  private button(parent:HTMLElement,label:string,action:()=>void,cls='',disabled=false){
    const button=document.createElement('button');button.type='button';button.className=cls;button.textContent=label;button.disabled=disabled;button.addEventListener('click',action);parent.append(button);return button;
  }
  private element(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private routeButton(parent:HTMLElement,route:Route){
    this.button(parent,route.name,()=>{this.route=route;this.go(this.service==='local'?'review':'date')},'station-key');
  }
  private get options(){return routes.filter(r=>r.from===this.hub&&r.service===this.service);}
  private get price(){return this.fareAmount??this.route?.fare??0;}
  private render(){
    const focusKey=(document.activeElement as HTMLElement|null)?.dataset?.key;
    this.design.className='machine-design '+this.service;this.design.replaceChildren();
    const outer=this.element(this.design,'div','','machine-shell');
    const heading=this.element(outer,'div','','machine-brand');
    this.element(heading,'strong',{local:'きっぷ・ICカード',charge:'チャージ専用',shinkansen:'新幹線・特急 指定席券売機',adjust:'のりこし精算機'}[this.service]);
    this.element(heading,'span',{local:'Tickets / IC cards',charge:'IC card charge only',shinkansen:'Shinkansen / Limited Express Tickets',adjust:'Fare Adjustment'}[this.service]);
    const switcher=this.element(this.design,'div','','machine-switcher');
    if(this.uiOptions.fixedService){
      if(this.uiOptions.lookAtWall)this.element(this.button(switcher,'↑ Look at the wall map ',()=>this.uiOptions.lookAtWall!()),'kbd','Y','pad-hint').title='Gamepad Y';
    }else{
      this.button(switcher,'在来線 / Local',()=>this.changeMachine('local'),this.service==='local'?'active':'');
      this.button(switcher,'新幹線 / Shinkansen',()=>this.changeMachine('shinkansen'),this.service==='shinkansen'?'active':'');
    }
    const screen=this.element(outer,'div','','machine-screen');screen.setAttribute('lang',this.lang);
    const top=this.element(screen,'div','','machine-top');
    const titles:Record<Step,[string,string]>={home:['きっぷの種類をお選びください','Select ticket type'],method:['お支払い方法をお選びください','Please select the desired payment method'],fares:['ご希望のボタンをお選びください','Make your selection below.'],map:['東京駅からの運賃表','JR fare map from Tokyo'],destination:['降車駅をお選びください','Select station where you will get off'],date:['ご乗車日をお選びください','Select the boarding date'],passengers:['ご利用人数をお選びください','Select the number of passengers'],train:['ご希望の列車をお選びください','Select the train you wish to take'],seat:['お座席をお選びください','Select your desired seat'],review:['内容をご確認ください','If OK, press Confirm'],adjust:['精算額をご確認ください','Check the fare to pay'],payment:['現金をお入れください','Please insert cash.'],issued:['きっぷをお取りください','Please take your ticket(s).']};
    this.element(top,'h2',this.tr(...(this.service==='charge'&&this.step==='home'?['ICカードをお入れください','Insert your IC card'] as [string,string]:this.service==='adjust'&&this.step==='home'?['きっぷをお入れください','Insert your ticket'] as [string,string]:this.service==='adjust'&&this.step==='issued'?['精算券をお取りください','Please take your fare adjustment ticket.'] as [string,string]:titles[this.step])));
    this.button(top,this.lang==='ja'?'English':'日本語',()=>{this.lang=this.lang==='ja'?'en':'ja';this.render()},'language').dataset.key='language';
    const body=this.element(screen,'div','','machine-body step-'+this.step);
    this.content(body);
    const bottom=this.element(screen,'div','','machine-bottom');
    this.button(bottom,this.tr('とりけし','Cancel'),()=>{if(this.inserted.length||this.adjusting){const ticket=!!this.adjusting;this.refund();this.release();this.step='home';this.history=[];this.say(ticket?['きっぷをお取りください','Cancelled. Take your ticket from the outlet.']:['お金をお取りください','Cancelled. Take your money from the tray.']);}else this.close()},'cancel');
    if(this.history.length&&this.step!=='issued')this.button(bottom,this.tr('もどる','Back'),()=>this.back(),'back');
    this.element(bottom,'span',this.tr('大人 1人　小児 0人','Adult 1   Child 0'),'passenger-count');
    if(this.notice)this.element(screen,'p',this.tr(...this.notice),'machine-notice');
    // Under the screen, as on JR East machines: card and banknote slots, the coin bowl, then the ticket and change outlets and the keypad.
    const cash=this.element(outer,'div','','machine-cash'+(this.step==='payment'||(this.service==='adjust'&&this.step==='home')?' ready':''));
    for(const [slot,ja,en] of [this.service==='adjust'?['card','きっぷ・Suica','Ticket · Suica']:['card','クレジットカード・Suica','Card · Suica'],['note','紙幣','Bill'],['coin','硬貨','Coin']]){
      const face=this.element(cash,'div','','slot slot-'+slot+(this.flash.endsWith('-'+slot)?' '+this.flash.split('-')[0]:''));face.dataset.slot=slot;
      this.element(face,'span',slot==='card'?ja+'\n'+en:ja+'  '+en,'slot-label');if(slot!=='card')face.insertAdjacentHTML('beforeend',acceptedIcons(slot));this.element(face,'span','','slot-opening');
    }
    for(const [name,ja,en,ticket] of [['ticket','きっぷ','Ticket',true],['change','おつり','Change',false]] as const){
      const box=this.element(cash,'div','','outlet outlet-'+name+' pay-control');this.element(box,'span',ja+' '+en,'slot-label');
      // The change comes out in two bins, the notes' and the coins'; a click on either takes all it holds.
      const pair=ticket?box:this.element(box,'div','','outlet-bins'),items=this.element(pair,'div','','outlet-items'),coinBin=ticket?items:this.element(pair,'div','','outlet-items');let stacked=0,heaped=0,cards=0;
      if(!ticket)for(const [bin,coin] of [[items,false],[coinBin,true]] as const)bin.addEventListener('click',event=>{if(event.target!==bin)return;const index=this.tray.findIndex(item=>item.value!=='ticket'&&isCoin(item.value)===coin);if(index>=0)this.take(index)});
      this.tray.forEach((item,index)=>{
        if((item.value==='ticket')!==ticket)return;
        const button=this.button(item.value!=='ticket'&&isCoin(item.value)?coinBin:items,'',()=>this.take(index),'tray-item'+(item.fresh?' fresh':'')+(item.value==='ticket'?' tray-ticket':isCoin(item.value)?' coin':' note'));button.dataset.key='tray-'+name;
        if(item.value==='ticket'){
          // The real card, as the gates and the bag draw it, painted again once the Japanese font is in; several lie stacked, the bin keeping its size.
          {const step=Math.min(cards++,4);button.style.cssText=`left:calc(50% + ${step*3-6}px);top:calc(50% + ${step>>1}px)`}
          const image=this.element(button,'img') as HTMLImageElement,ticket=item.ticket;image.draggable=false;image.alt=button.title=this.tr('きっぷを取る','Take the ticket');
          const paint=()=>{if(!ticket)return;const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;paintTicket(canvas.getContext('2d')!,128,64,ticket);image.src=canvas.toDataURL()};
          paint();document.fonts?.load('16px "Yorimichi JP"').then(paint).catch(()=>{});
        }
        else{
          // The notes in a neat stack, the coins in a loose heap.
          if(isCoin(item.value)){const {x,y,turn}=heapSpot(item.value,heaped++);button.style.cssText=`left:${50+x*32}%;top:${50+y*26}%;rotate:${turn}deg`}
          else{const step=Math.min(stacked++,5);button.style.cssText=`left:calc(50% + ${step*2-5}px);top:calc(50% + ${5-step*2}px)`}
          const image=this.element(button,'img') as HTMLImageElement;image.src=pieceArt(item.value);image.alt='¥'+item.value;image.draggable=false;button.title=isCoin(item.value)?this.tr('硬貨を取る','Take the coins'):this.tr('お札を取る','Take the notes');
        }
        item.fresh=false;
      });
      for(const bin of [items,coinBin])if(bin.childElementCount)bin.classList.add('lit');
    }
    const keypad=this.element(cash,'div','','keypad');for(const key of '123456789*0#')this.element(keypad,'span',key);
    const purse=this.element(this.design,'div','','machine-wallet pay-control');
    const heavy=walkFactor(this.wallet)<1;
    this.element(purse,'div',`財布 / WALLET   ¥${walletTotal(this.wallet).toLocaleString('en-US')}\n◉ ${coinCount(this.wallet)} ${this.tr('枚','coins')}${heavy?this.tr('・重くて歩くのが遅い',' · heavy, slower walk'):''}`,'wallet-head'+(heavy?' heavy':''));
    // At the fare adjustment machine, the tickets carried above the money: dragged onto the ticket slot, or clicked.
    if(this.uiOptions.adjust){
      const pocket=this.element(purse,'div','','wallet-tickets'),tickets=this.uiOptions.adjust.pocket();
      this.element(pocket,'span',this.tr('きっぷ','Tickets')+'  '+tickets.length,'wallet-tickets-head');
      tickets.forEach((ticket,i)=>{
        const button=this.button(pocket,'',()=>{if(performance.now()-this.justDragged>150)this.insertTicket(ticket,'card')},'wallet-ticket',this.step!=='home');button.dataset.key='pocket-'+i;button.title=this.tr('きっぷを入れる','Insert this ticket');
        const image=this.element(button,'img') as HTMLImageElement;image.alt='';image.draggable=false;
        const paint=()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;paintTicket(canvas.getContext('2d')!,128,64,ticket);image.src=canvas.toDataURL()};
        paint();document.fonts?.load('16px "Yorimichi JP"').then(paint).catch(()=>{});
        this.grab(button,slot=>this.insertTicket(ticket,slot));
      });
    }
    const pieces=this.element(purse,'div','','wallet-pieces');
    for(const value of [...notes,...coins]){
      const count=this.wallet[value]??0;
      const button=this.button(pieces,'',()=>{if(performance.now()-this.justDragged>150)this.insert(value,isCoin(value)?'coin':'note')},'wallet-piece'+(isCoin(value)?' coin':' note'),!count);
      button.dataset.key='wallet-'+value;button.title=this.tr('投入','Insert')+' ¥'+value.toLocaleString('en-US');
      const image=this.element(button,'img') as HTMLImageElement;image.src=pieceArt(value);image.alt='';image.draggable=false;
      this.element(button,'span','¥'+value.toLocaleString('en-US'),'piece-value');this.element(button,'span','×'+count,'piece-count');
      this.grab(button,slot=>this.insert(value,slot));
    }
    this.notice=null;this.flash='';
    // Focus stays on the same piece or outlet (taking change keeps you on the change), then the other outlet, then the wallet.
    const keep=focusKey&&(this.design.querySelector<HTMLButtonElement>(`[data-key="${focusKey}"]:not(:disabled)`)??(focusKey.startsWith('tray')?this.design.querySelector<HTMLButtonElement>('.tray-item'):null)??this.design.querySelector<HTMLButtonElement>('.wallet-piece:not(:disabled)'));
    // Otherwise the screen's main button (Confirm, else its first live button), then what waits in the outlets, then the wallet.
    (keep||['.machine-body .confirm:not(:disabled)','.machine-body button:not(:disabled)','.tray-item','.wallet-ticket:not(:disabled)','.wallet-piece:not(:disabled)','.language'].map(q=>this.design.querySelector<HTMLButtonElement>(q)).find(Boolean))?.focus({preventScroll:true});
  }
  private changeMachine(service:Service){
    if(this.step==='issued'){this.close();return;}
    this.refund();this.keepWallet();this.service=service;this.step='home';this.route=null;this.history=[];this.fareAmount=null;this.render();
  }
  private content(body:HTMLElement){
    const tr=(ja:string,en:string)=>this.tr(ja,en);
    if(this.step==='home'){
      const grid=this.element(body,'div','','home-grid');
      if(this.service==='local'){
        this.button(grid,tr('ICカード購入','Purchase IC card'),()=>{},'ic-card',true);
        this.button(grid,tr('チャージ・履歴確認','Charge / Check history'),()=>{},'',true);
        this.button(grid,tr('きっぷ購入','Purchase Ticket')+'  ▰',()=>this.go('method'),'purchase-local');
        this.button(grid,tr('ポイント利用登録','Registration of point usage'),()=>{},'registration',true);
        this.button(grid,tr('入場券','Platform Ticket'),()=>{},'platform-ticket',true);
      }else if(this.service==='charge'){
        // A charge-only machine reads the card first: without one, every button stays off and the slots refuse everything.
        const prompt=this.element(body,'div','','charge-prompt');body.insertBefore(prompt,grid);this.element(prompt,'span','IC','charge-card');
        this.element(prompt,'p',tr('Suica・PASMOなどのICカードを\n下のカード挿入口にお入れください。','Insert a Suica, PASMO or other IC card\ninto the card slot below.'));
        this.button(grid,tr('チャージ','Charge'),()=>{},'',true);this.button(grid,tr('履歴表示','Check history'),()=>{},'',true);
        this.element(body,'p',tr('ICカードをお持ちでないため、ご利用になれません。この機械ではICカードを販売していません。','You have no IC card, so this machine cannot be used. It does not sell cards.'),'origin-note');
      }else if(this.service==='adjust'){
        // The fare adjustment machine only reads tickets: the screen points at the slot.
        const prompt=this.element(body,'div','','charge-prompt adjust-prompt');body.insertBefore(prompt,grid);grid.remove();this.element(prompt,'span','きっぷ','charge-card adjust-card');
        this.element(prompt,'p',tr('のりこし・のりかえの精算ができます。\nきっぷを下のきっぷ挿入口にお入れください。','Paying the rest of a fare that fell short.\nInsert your ticket into the ticket slot below.'));
        this.element(body,'p',tr('現在の駅：','This station: ')+this.uiOptions.adjust?.ja+' '+this.uiOptions.adjust?.en,'origin-note');return;
      }else{
        this.button(grid,tr('新幹線の指定席を購入','Purchase Shinkansen reserved seat'),()=>this.go('destination'),'purchase-express');
        this.button(grid,tr('予約したきっぷのお受取り','Receive reserved ticket(s)'),()=>{},'',true);
        this.button(grid,tr('在来線の特急券を購入','Purchase limited express tickets'),()=>{},'',true);
        this.button(grid,tr('予約の変更','Change reserved seat ticket(s)'),()=>{},'',true);
      }
      this.element(body,'p',tr('出発駅：'+stations[this.hub].ja,'Departure station: '+stations[this.hub].en.toUpperCase()),'origin-note');
    }else if(this.step==='method'){
      const grid=this.element(body,'div','','payment-methods');
      this.button(grid,tr('現金・ICカード\nCash · IC Card','Cash · IC Card\nOrange Card')+'\n\n¥  ▰',()=>this.go('fares'));
      this.button(grid,'QR Code\n\n▦',()=>{},'',true);
    }else if(this.step==='fares'){
      this.element(body,'div',tr('JR線 きっぷ　　大人片道','JR Tickets · Adult single fare'),'fare-tabs');
      // Every fare from here by local lines; the Tokyo area's board shows them from this station (in the hall it is on the wall above: looking up is the player's move, not a machine button).
      const here=stations[this.hub],board=onTokyoBoard(here.ja);
      if(board&&!this.uiOptions.lookAtWall)this.button(body,tr(here.ja+'駅からの運賃表を見る','View JR fare map from '+here.en),()=>this.go('map'),'open-fare-map');
      const grid=this.element(body,'div','','fare-grid all-fares');
      faresFrom(here.ja).forEach(amount=>this.button(grid,'¥'+amount.toLocaleString('en-US'),()=>{this.route=null;this.fareAmount=amount;this.pay()}));
      this.element(body,'p',board?tr('運賃表で目的地の金額を調べてからお選びください。','Read the fare map, then choose your amount.'):tr(here.ja+'駅の運賃表は準備中です。運賃は駅員におたずねください。',here.en+' fare map will come later: ask the station staff for a fare.'),'fare-note');
    }else if(this.step==='map'){
      const tools=this.element(body,'div','','map-tools');
      const viewport=this.element(body,'div','','fare-map-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Scrollable Tokyo JR fare map');
      const diagram=renderTokyoFareMap(stations[this.hub].ja);diagram.style.width=(1500*this.mapZoom)+'px';diagram.style.height=(844*this.mapZoom)+'px';viewport.append(diagram);
      const zoom=(factor:number)=>{
        const old=this.mapZoom;this.mapZoom=Math.max(.55,Math.min(1.8,old*factor));const ratio=this.mapZoom/old;
        const x=(viewport.scrollLeft+viewport.clientWidth/2)*ratio-viewport.clientWidth/2,y=(viewport.scrollTop+viewport.clientHeight/2)*ratio-viewport.clientHeight/2;
        diagram.style.width=(1500*this.mapZoom)+'px';diagram.style.height=(844*this.mapZoom)+'px';viewport.scrollLeft=x;viewport.scrollTop=y;
      };
      this.button(tools,'−',()=>zoom(.8),'map-zoom');this.button(tools,'+',()=>zoom(1.25),'map-zoom');
      this.element(tools,'span',tr('ドラッグで移動 · '+stations[this.hub].ja+'から','Drag map · from '+stations[this.hub].en),'map-hint');
      this.button(tools,tr('金額を選ぶ','Choose amount'),()=>this.back(),'map-return');
      let drag:{x:number;y:number;left:number;top:number}|null=null;
      viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId)});
      viewport.addEventListener('pointermove',event=>{if(drag){const scale=viewport.getBoundingClientRect().width/viewport.offsetWidth;viewport.scrollLeft=drag.left-(event.clientX-drag.x)/scale;viewport.scrollTop=drag.top-(event.clientY-drag.y)/scale}});
      viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
      this.element(body,'p',tr('JRのみ・きっぷ運賃 / ゲーム用参考図','JR East 2024 · Proposed 2026 paper fares · Game reference, not live fares'),'map-source');
      requestAnimationFrame(()=>{viewport.scrollLeft=926*this.mapZoom-viewport.clientWidth/2;viewport.scrollTop=477*this.mapZoom-viewport.clientHeight/2});
    }else if(this.step==='destination'){
      this.element(body,'p',tr('乗車駅：'+stations[this.hub].ja,'From: '+stations[this.hub].en.toUpperCase()),'origin-note');
      const grid=this.element(body,'div','','station-grid');this.options.forEach(route=>this.routeButton(grid,route));
    }else if(this.step==='date'){
      const grid=this.element(body,'div','','selection-grid');
      for(const [ja,en,value] of [['本日','Today','Today'],['明日','Tomorrow','Tomorrow']])this.button(grid,tr(ja,en),()=>{this.day=value;this.go('passengers')});
    }else if(this.step==='passengers'){
      const grid=this.element(body,'div','','selection-grid');this.button(grid,tr('大人 1人','1 Adult'),()=>this.go('train'));
      this.element(body,'p',tr('このゲームでは、おひとりでの旅行です。','One traveller in this game.'),'origin-note');
    }else if(this.step==='train'){
      const grid=this.element(body,'div','','train-grid');
      // Two trains of the line's fastest service, the ride as long as the km make it.
      const line=railLine(this.route!.lineId),minutes=shinkansenMinutes(line,stations[this.hub].ja,stations[this.route!.to].ja),time=(at:number)=>`${Math.floor(at/60)%24}:${String(at%60).padStart(2,'0')}`;
      for(const [name,departure,arrival] of [[0,860],[1,880]].map(([k,at])=>[`${line.id==='tohoku-shinkansen'?'HAYABUSA':'NOZOMI'} ${21+k*2}`,time(at),time(at+minutes)]))this.button(grid,`${name}   ${departure} → ${arrival}   ○`,()=>{this.train=`${name} · ${departure}`;this.go('seat')});
      this.element(body,'p',tr('普通車 指定席　／　時刻はゲーム用です','Ordinary Car · Reserved Seat / Fictional timetable'),'origin-note');
    }else if(this.step==='seat'){
      const grid=this.element(body,'div','','selection-grid');
      for(const [ja,en] of [['指定なし','Any seat'],['窓側','Window'],['通路側','Aisle']])this.button(grid,tr(ja,en),()=>{this.seat=en;this.go('review')});
    }else if(this.step==='review'&&this.route){
      const summary=this.element(body,'div','','review-layout');
      const journey=this.element(summary,'div','','journey-diagram');
      this.element(journey,'h3',tr('乗車券','Train / basic fare ticket'));
      this.element(journey,'div',stations[this.hub].en.toUpperCase()+'\n│\n│\n'+stations[this.route.to].en.toUpperCase(),'journey-stations');
      const details=this.element(summary,'dl','','journey-details');
      const fields=[[tr('経由','Via'),this.route.line],[tr('人数','Passengers'),tr('大人 1人','1 Adult')],[tr('のりば','Platform'),this.route.platform]];
      if(this.service==='shinkansen')fields.push([tr('乗車日','Boarding date'),this.day],[tr('列車','Train'),this.train],[tr('座席','Seat'),this.seat]);
      for(const [label,value] of fields){this.element(details,'dt',label);this.element(details,'dd',value)}
      this.element(body,'div',tr('合計金額','Total amount')+'   ¥'+this.route.fare.toLocaleString('en-US'),'fare-total');
      this.button(body,tr('確認','Confirm'),()=>{this.deposited=0;this.inserted=[];this.go('payment')},'confirm review-confirm');
    }else if(this.step==='adjust'&&this.adjusting&&this.uiOptions.adjust){
      const {ticket,fare,due}=this.adjusting,entry=stations[ticket.punched!],summary=this.element(body,'div','','review-layout');
      const journey=this.element(summary,'div','','journey-diagram');this.element(journey,'h3',tr('のりこし精算','Fare adjustment'));
      this.element(journey,'div',(this.lang==='ja'?entry.ja:entry.en.toUpperCase())+'\n│\n│\n'+(this.lang==='ja'?this.uiOptions.adjust.ja:this.uiOptions.adjust.en.toUpperCase()),'journey-stations');
      const details=this.element(summary,'dl','','journey-details');
      for(const [label,value] of [[tr('乗車駅','From'),tr(entry.ja,entry.en)],[tr('運賃','Fare'),'¥'+fare.toLocaleString('en-US')],[tr('きっぷ','Ticket'),'¥'+ticket.fare.toLocaleString('en-US')],[tr('不足額','To pay'),'¥'+due.toLocaleString('en-US')]]){this.element(details,'dt',label);this.element(details,'dd',value)}
      this.element(body,'div',tr('精算額','Amount due')+'   ¥'+due.toLocaleString('en-US'),'fare-total');
      this.button(body,tr('精算','Pay'),()=>this.pay(),'confirm review-confirm');
    }else if(this.step==='payment'&&this.price>0){
      const totals=this.element(body,'div','','payment-totals');
      this.element(totals,'div',tr('お支払い金額','Amount due')+'\n¥'+this.price.toLocaleString('en-US'));
      this.element(totals,'div',tr('お預り金額','Inserted')+'\n¥'+this.deposited.toLocaleString('en-US'));
      this.element(totals,'div',tr('不足金額','Still to pay')+'\n¥'+(this.price-this.deposited).toLocaleString('en-US'),'still-due');
      this.element(body,'p',tr('財布の硬貨・紙幣を下の投入口へ。','Drag coins and notes from your wallet into the slots below, or click them.'),'origin-note');
      this.element(body,'p',tr('1円・5円硬貨は使えません。','1 and 5 yen coins are not accepted. Change comes in as few coins as possible.'),'origin-note');
      if(walletTotal(this.wallet)+this.deposited<this.price)this.element(body,'p',tr('お金が足りません。','Not enough money. There is an ATM: open the wallet in the top bar.'),'origin-note short');
    }else if(this.step==='issued'&&this.price>0){
      this.element(body,'h3',tr('ありがとうございました','Thank you'),'thanks');
      if(this.change)this.element(body,'p',tr('おつり','Change')+'   ¥'+this.change.toLocaleString('en-US'),'change-due');
    }
  }
}
