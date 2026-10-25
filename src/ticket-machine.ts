import { routes, type Hub, type Route, type Service } from './network';
import { tokyoFareAmounts, renderTokyoFareMap } from './tokyo-fares';
import { accepted, coinCount, isCoin, loadWallet, machineSound, makeChange, notes, coins, pieceArt, saveWallet, walletTotal, walkFactor, type Wallet } from './wallet';

export interface RouteTicket extends Route { kind:'route'; reservation?: { day:string; train:string; seat:string } }
export interface FareTicket {kind:'fare';from:'tokyo';service:'local';fare:number}
export type TravelTicket=RouteTicket|FareTicket;
type Step='home'|'method'|'fares'|'map'|'destination'|'date'|'passengers'|'train'|'seat'|'review'|'payment'|'issued';
type Lang='ja'|'en';
interface MachineOptions {fixedService?:boolean;lookAtWall?:()=>void;wallet?:Wallet;onWallet?:()=>void;trayKey?:string}
// What lies in the tray under the slots: a piece of money (yen) or the ticket.
type TrayItem={value:number|'ticket';ticket?:TravelTicket;fresh?:boolean};
// Each machine keeps what was left in its outlets (by hub and machine id), so walking away forgets nothing.
const trays:Record<string,TrayItem[]>=(()=>{try{return JSON.parse(localStorage.getItem('yorimichi-trays')||'{}')}catch{return {}}})();
const saveTrays=()=>localStorage.setItem('yorimichi-trays',JSON.stringify(trays,(key,value)=>key==='fresh'?undefined:value));
export const trayKey=(hub:Hub,id:string)=>hub+'-'+id;
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
  private service:Service;
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
  private mapZoom=1;
  private hidden=false;
  private disposed=false;
  private padFrame=0;
  private padPrevious:boolean[]=[];
  private lastNavigation=0;
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private hub:Hub,service:Service,private issue:(ticket:TravelTicket)=>void,private dismiss:()=>void,private uiOptions:MachineOptions={}){
    this.service=service;this.wallet=uiOptions.wallet??loadWallet();this.tray=uiOptions.trayKey?trays[uiOptions.trayKey]??=[]:[];
    this.overlay.className='machine-overlay';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Ticket machine');
    this.panel.className='machine-viewport';this.design.className='machine-design';this.panel.append(this.design);this.overlay.append(this.panel);document.body.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.design.style.transform=`scale(${this.panel.clientWidth/960})`);this.observer.observe(this.panel);
    // :focus-visible ignores gamepad input once the mouse was used, so the gamepad marks its own focus ring; the pointer clears it.
    this.overlay.addEventListener('pointerdown',()=>this.overlay.classList.remove('pad-nav'));this.overlay.addEventListener('pointermove',event=>{if(event.movementX||event.movementY)this.overlay.classList.remove('pad-nav')});
    this.overlay.addEventListener('keydown',this.onKey);this.padPrevious=this.currentPad()?.buttons.map(b=>b.pressed)??[];this.render();this.padFrame=requestAnimationFrame(this.pollPad);
  }
  private currentPad(){return Array.from(navigator.getGamepads?.()??[]).find(pad=>pad?.connected);}
  private pollPad=(time:number)=>{
    if(this.disposed)return;
    const pad=this.currentPad();
    if(!this.hidden&&pad){
      const pressed=pad.buttons.map(b=>b.pressed);
      const dx=(pressed[15]?1:0)-(pressed[14]?1:0)+(Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0);
      const dy=(pressed[13]?1:0)-(pressed[12]?1:0)+(Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0);
      if(dx||dy||pressed.some((p,i)=>p&&!this.padPrevious[i]))this.overlay.classList.add('pad-nav');
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
    let best:HTMLButtonElement|undefined,score=Infinity;
    for(const button of buttons){
      if(button===active)continue;
      const next=button.getBoundingClientRect(),nx=next.x+next.width/2-x,ny=next.y+next.height/2-y;
      const primary=Math.abs(dx)>=Math.abs(dy)?nx*Math.sign(dx):ny*Math.sign(dy);
      const across=Math.abs(dx)>=Math.abs(dy)?Math.abs(ny):Math.abs(nx);
      if(primary>2&&primary+across*2<score){best=button;score=primary+across*2;}
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
  destroy(){if(this.disposed)return;this.refund();this.keepWallet();this.disposed=true;cancelAnimationFrame(this.padFrame);this.observer.disconnect();this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.dismiss();}
  private go(step:Step){this.history.push(this.step);this.step=step;this.render();}
  private back(){if(this.step==='payment')this.refund();this.step=this.history.pop()??'home';this.render();}
  // A fare button goes straight to payment: もどる (or B) is enough to pick another amount.
  private pay(){this.deposited=0;this.inserted=[];this.go('payment');}
  private keepWallet(){saveWallet(this.wallet);saveTrays();this.uiOptions.onWallet?.();}
  private say(notice:[string,string]){this.notice=notice;this.render();}
  /** Cancel gives back what was inserted, into the tray, as real machines do. */
  private refund(){this.tray.push(...this.inserted.map(value=>({value,fresh:true})));this.inserted=[];this.deposited=0;}
  private take(index:number){
    const [item]=this.tray.splice(index,1);if(!item)return;
    if(item.value==='ticket'){if(item.ticket)this.issue(item.ticket);}else this.wallet[item.value]=(this.wallet[item.value]??0)+1;
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
      if(this.hub==='tokyo'&&this.service==='local'&&this.fareAmount!==null)ticket={kind:'fare',from:'tokyo',service:'local',fare:this.fareAmount};
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
  /** Wallet pieces can be dragged onto a slot; a plain click or gamepad A puts them in their own slot. */
  private grab(button:HTMLButtonElement,value:number){
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
        const slot=event.type==='pointerup'?this.slotAt(event):null;if(slot)this.insert(value,slot.dataset.slot!);
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
    this.element(heading,'strong',this.service==='local'?'きっぷ・ICカード':'新幹線・特急 指定席券売機');
    this.element(heading,'span',this.service==='local'?'Tickets / IC cards':'Shinkansen / Limited Express Tickets');
    const switcher=this.element(this.design,'div','','machine-switcher');
    if(this.uiOptions.fixedService){
      if(this.uiOptions.lookAtWall)this.element(this.button(switcher,'↑ Look at the wall map ',()=>this.uiOptions.lookAtWall!()),'kbd','Y','pad-hint').title='Gamepad Y';
    }else{
      this.button(switcher,'在来線 / Local',()=>this.changeMachine('local'),this.service==='local'?'active':'');
      this.button(switcher,'新幹線 / Shinkansen',()=>this.changeMachine('shinkansen'),this.service==='shinkansen'?'active':'');
    }
    const screen=this.element(outer,'div','','machine-screen');screen.setAttribute('lang',this.lang);
    const top=this.element(screen,'div','','machine-top');
    const titles:Record<Step,[string,string]>={home:['きっぷの種類をお選びください','Select ticket type'],method:['お支払い方法をお選びください','Please select the desired payment method'],fares:['ご希望のボタンをお選びください','Make your selection below.'],map:['東京駅からの運賃表','JR fare map from Tokyo'],destination:['降車駅をお選びください','Select station where you will get off'],date:['ご乗車日をお選びください','Select the boarding date'],passengers:['ご利用人数をお選びください','Select the number of passengers'],train:['ご希望の列車をお選びください','Select the train you wish to take'],seat:['お座席をお選びください','Select your desired seat'],review:['内容をご確認ください','If OK, press Confirm'],payment:['現金をお入れください','Please insert cash.'],issued:['きっぷをお取りください','Please take your ticket(s).']};
    this.element(top,'h2',this.tr(...titles[this.step]));
    this.button(top,this.lang==='ja'?'English':'日本語',()=>{this.lang=this.lang==='ja'?'en':'ja';this.render()},'language');
    const body=this.element(screen,'div','','machine-body step-'+this.step);
    this.content(body);
    const bottom=this.element(screen,'div','','machine-bottom');
    this.button(bottom,this.tr('とりけし','Cancel'),()=>{if(this.inserted.length){this.refund();this.step='home';this.history=[];this.say(['お金をお取りください','Cancelled. Take your money from the tray.']);}else this.close()},'cancel');
    if(this.history.length&&this.step!=='issued')this.button(bottom,this.tr('もどる','Back'),()=>this.back(),'back');
    this.element(bottom,'span',this.tr('大人 1人　小児 0人','Adult 1   Child 0'),'passenger-count');
    if(this.notice)this.element(screen,'p',this.tr(...this.notice),'machine-notice');
    // Under the screen, as on JR East machines: card and banknote slots, the coin bowl, then the ticket and change outlets and the keypad.
    const cash=this.element(outer,'div','','machine-cash'+(this.step==='payment'?' ready':''));
    for(const [slot,ja,en] of [['card','クレジットカード・Suica','Card · Suica'],['note','紙幣','Bill'],['coin','硬貨','Coin']]){
      const face=this.element(cash,'div','','slot slot-'+slot+(this.flash.endsWith('-'+slot)?' '+this.flash.split('-')[0]:''));face.dataset.slot=slot;
      this.element(face,'span',slot==='card'?ja+'\n'+en:ja+'  '+en,'slot-label');if(slot!=='card')face.insertAdjacentHTML('beforeend',acceptedIcons(slot));this.element(face,'span','','slot-opening');
    }
    for(const [name,ja,en,ticket] of [['ticket','きっぷ','Ticket',true],['change','おつり','Change',false]] as const){
      const box=this.element(cash,'div','','outlet outlet-'+name+' pay-control');this.element(box,'span',ja+' '+en,'slot-label');
      const items=this.element(box,'div','','outlet-items');
      this.tray.forEach((item,index)=>{
        if((item.value==='ticket')!==ticket)return;
        const button=this.button(items,'',()=>this.take(index),'tray-item'+(item.fresh?' fresh':'')+(item.value==='ticket'?' tray-ticket':isCoin(item.value)?' coin':' note'));button.dataset.key='tray-'+name;
        if(item.value==='ticket'){button.textContent=this.tr('きっぷ','TICKET');button.title=this.tr('きっぷを取る','Take the ticket');}
        else{const image=this.element(button,'img') as HTMLImageElement;image.src=pieceArt(item.value);image.alt='¥'+item.value;image.draggable=false;button.title=this.tr('取る','Take')+' ¥'+item.value.toLocaleString('en-US');}
        item.fresh=false;
      });
      if(items.childElementCount)box.classList.add('lit');
    }
    const keypad=this.element(cash,'div','','keypad');for(const key of '123456789*0#')this.element(keypad,'span',key);
    const purse=this.element(this.design,'div','','machine-wallet pay-control');
    const heavy=walkFactor(this.wallet)<1;
    this.element(purse,'div',`財布 / WALLET   ¥${walletTotal(this.wallet).toLocaleString('en-US')}\n◉ ${coinCount(this.wallet)} ${this.tr('枚','coins')}${heavy?this.tr('・重くて歩くのが遅い',' · heavy, slower walk'):''}`,'wallet-head'+(heavy?' heavy':''));
    const pieces=this.element(purse,'div','','wallet-pieces');
    for(const value of [...notes,...coins]){
      const count=this.wallet[value]??0;
      const button=this.button(pieces,'',()=>{if(performance.now()-this.justDragged>150)this.insert(value,isCoin(value)?'coin':'note')},'wallet-piece'+(isCoin(value)?' coin':' note'),!count);
      button.dataset.key='wallet-'+value;button.title=this.tr('投入','Insert')+' ¥'+value.toLocaleString('en-US');
      const image=this.element(button,'img') as HTMLImageElement;image.src=pieceArt(value);image.alt='';image.draggable=false;
      this.element(button,'span','¥'+value.toLocaleString('en-US'),'piece-value');this.element(button,'span','×'+count,'piece-count');
      this.grab(button,value);
    }
    this.notice=null;this.flash='';
    // Focus stays on the same piece or outlet (taking change keeps you on the change), then the other outlet, then the wallet.
    const keep=focusKey&&(this.design.querySelector<HTMLButtonElement>(`[data-key="${focusKey}"]:not(:disabled)`)??(focusKey.startsWith('tray')?this.design.querySelector<HTMLButtonElement>('.tray-item'):null)??this.design.querySelector<HTMLButtonElement>('.wallet-piece:not(:disabled)'));
    (keep||this.design.querySelector<HTMLButtonElement>('.language'))?.focus({preventScroll:true});
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
      }else{
        this.button(grid,tr('新幹線の指定席を購入','Purchase Shinkansen reserved seat'),()=>this.go('destination'),'purchase-express');
        this.button(grid,tr('予約したきっぷのお受取り','Receive reserved ticket(s)'),()=>{},'',true);
        this.button(grid,tr('在来線の特急券を購入','Purchase limited express tickets'),()=>{},'',true);
        this.button(grid,tr('予約の変更','Change reserved seat ticket(s)'),()=>{},'',true);
      }
      this.element(body,'p',tr('出発駅：','Departure station: ')+this.hub.toUpperCase(),'origin-note');
    }else if(this.step==='method'){
      const grid=this.element(body,'div','','payment-methods');
      this.button(grid,tr('現金・ICカード\nCash · IC Card','Cash · IC Card\nOrange Card')+'\n\n¥  ▰',()=>this.go('fares'));
      this.button(grid,'QR Code\n\n▦',()=>{},'',true);
    }else if(this.step==='fares'){
      this.element(body,'div',tr('JR線 きっぷ　　大人片道','JR Tickets · Adult single fare'),'fare-tabs');
      if(this.hub==='tokyo'){
        // In the hall the fare map is on the wall above: looking up is the player's move (Y, or the control above the machine), not a machine button.
        if(!this.uiOptions.lookAtWall)this.button(body,tr('東京駅からの運賃表を見る','View JR Tokyo fare map'),()=>this.go('map'),'open-fare-map');
        const grid=this.element(body,'div','','fare-grid all-fares');
        tokyoFareAmounts.forEach(amount=>this.button(grid,'¥'+amount.toLocaleString('en-US'),()=>{this.route=null;this.fareAmount=amount;this.pay()}));
        this.element(body,'p',tr('運賃表で目的地の金額を調べてからお選びください。','Read the fare map, then choose your amount.'),'fare-note');
      }else{
        const grid=this.element(body,'div','','fare-grid');
        this.options.forEach(route=>this.button(grid,'¥'+route.fare.toLocaleString('en-US'),()=>{this.route=route;this.fareAmount=null;this.pay()}));
        this.element(body,'p',tr('京都の運賃表は準備中です。','Kyoto fare map will come later.'),'fare-note');
        const table=this.element(body,'div','','fare-table');this.options.forEach(route=>this.element(table,'span',route.name+'   ¥'+route.fare.toLocaleString('en-US')));
      }
    }else if(this.step==='map'){
      const tools=this.element(body,'div','','map-tools');
      const viewport=this.element(body,'div','','fare-map-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Scrollable Tokyo JR fare map');
      const diagram=renderTokyoFareMap();diagram.style.width=(1500*this.mapZoom)+'px';diagram.style.height=(844*this.mapZoom)+'px';viewport.append(diagram);
      const zoom=(factor:number)=>{
        const old=this.mapZoom;this.mapZoom=Math.max(.55,Math.min(1.8,old*factor));const ratio=this.mapZoom/old;
        const x=(viewport.scrollLeft+viewport.clientWidth/2)*ratio-viewport.clientWidth/2,y=(viewport.scrollTop+viewport.clientHeight/2)*ratio-viewport.clientHeight/2;
        diagram.style.width=(1500*this.mapZoom)+'px';diagram.style.height=(844*this.mapZoom)+'px';viewport.scrollLeft=x;viewport.scrollTop=y;
      };
      this.button(tools,'−',()=>zoom(.8),'map-zoom');this.button(tools,'+',()=>zoom(1.25),'map-zoom');
      this.element(tools,'span',tr('ドラッグで移動 · 東京から','Drag map · from Tokyo'),'map-hint');
      this.button(tools,tr('金額を選ぶ','Choose amount'),()=>this.back(),'map-return');
      let drag:{x:number;y:number;left:number;top:number}|null=null;
      viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId)});
      viewport.addEventListener('pointermove',event=>{if(drag){const scale=viewport.getBoundingClientRect().width/viewport.offsetWidth;viewport.scrollLeft=drag.left-(event.clientX-drag.x)/scale;viewport.scrollTop=drag.top-(event.clientY-drag.y)/scale}});
      viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
      this.element(body,'p',tr('JRのみ・きっぷ運賃 / ゲーム用参考図','JR East 2024 · Proposed 2026 paper fares · Game reference, not live fares'),'map-source');
      requestAnimationFrame(()=>{viewport.scrollLeft=926*this.mapZoom-viewport.clientWidth/2;viewport.scrollTop=477*this.mapZoom-viewport.clientHeight/2});
    }else if(this.step==='destination'){
      this.element(body,'p',tr('乗車駅：','From: ')+this.hub.toUpperCase(),'origin-note');
      const grid=this.element(body,'div','','station-grid');this.options.forEach(route=>this.routeButton(grid,route));
    }else if(this.step==='date'){
      const grid=this.element(body,'div','','selection-grid');
      for(const [ja,en,value] of [['本日','Today','Today'],['明日','Tomorrow','Tomorrow']])this.button(grid,tr(ja,en),()=>{this.day=value;this.go('passengers')});
    }else if(this.step==='passengers'){
      const grid=this.element(body,'div','','selection-grid');this.button(grid,tr('大人 1人','1 Adult'),()=>this.go('train'));
      this.element(body,'p',tr('このゲームでは、おひとりでの旅行です。','One traveller in this game.'),'origin-note');
    }else if(this.step==='train'){
      const grid=this.element(body,'div','','train-grid');
      for(const [name,departure,arrival] of [['NOZOMI 21','14:20','16:35'],['NOZOMI 23','14:40','16:55']])this.button(grid,`${name}   ${departure} → ${arrival}   ○`,()=>{this.train=`${name} · ${departure}`;this.go('seat')});
      this.element(body,'p',tr('普通車 指定席　／　時刻はゲーム用です','Ordinary Car · Reserved Seat / Fictional timetable'),'origin-note');
    }else if(this.step==='seat'){
      const grid=this.element(body,'div','','selection-grid');
      for(const [ja,en] of [['指定なし','Any seat'],['窓側','Window'],['通路側','Aisle']])this.button(grid,tr(ja,en),()=>{this.seat=en;this.go('review')});
    }else if(this.step==='review'&&this.route){
      const summary=this.element(body,'div','','review-layout');
      const journey=this.element(summary,'div','','journey-diagram');
      this.element(journey,'h3',tr('乗車券','Train / basic fare ticket'));
      this.element(journey,'div',this.hub.toUpperCase()+'\n│\n│\n'+this.route.to.toUpperCase(),'journey-stations');
      const details=this.element(summary,'dl','','journey-details');
      const fields=[[tr('経由','Via'),this.route.line],[tr('人数','Passengers'),tr('大人 1人','1 Adult')],[tr('のりば','Platform'),this.route.platform]];
      if(this.service==='shinkansen')fields.push([tr('乗車日','Boarding date'),this.day],[tr('列車','Train'),this.train],[tr('座席','Seat'),this.seat]);
      for(const [label,value] of fields){this.element(details,'dt',label);this.element(details,'dd',value)}
      this.element(body,'div',tr('合計金額','Total amount')+'   ¥'+this.route.fare.toLocaleString('en-US'),'fare-total');
      this.button(body,tr('確認','Confirm'),()=>{this.deposited=0;this.inserted=[];this.go('payment')},'confirm review-confirm');
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
