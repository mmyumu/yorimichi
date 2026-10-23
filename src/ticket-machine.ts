import { routes, type Hub, type Route, type Service } from './network';
import { tokyoFareAmounts, renderTokyoFareMap } from './tokyo-fares';

export interface RouteTicket extends Route { kind:'route'; reservation?: { day:string; train:string; seat:string } }
export interface FareTicket {kind:'fare';from:'tokyo';service:'local';fare:number}
export type TravelTicket=RouteTicket|FareTicket;
type Step='home'|'method'|'fares'|'map'|'destination'|'date'|'passengers'|'train'|'seat'|'review'|'payment'|'issued';
type Lang='ja'|'en';
interface MachineOptions {fixedService?:boolean;lookAtWall?:()=>void}

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
    this.service=service;
    this.overlay.className='machine-overlay';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Distributeur de billets');
    this.panel.className='machine-viewport';this.design.className='machine-design';this.panel.append(this.design);this.overlay.append(this.panel);document.body.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.design.style.transform=`scale(${this.panel.clientWidth/960})`);this.observer.observe(this.panel);
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
      if((dx||dy)&&time-this.lastNavigation>180){this.moveFocus(dx,dy);this.lastNavigation=time;}
      if(pressed[0]&&!this.padPrevious[0]){
        const active=document.activeElement as HTMLElement;
        if(this.overlay.contains(active))active.click();
      }
      if(pressed[1]&&!this.padPrevious[1]){this.close();return;}
      this.padPrevious=pressed;
    }
    if(!this.disposed)this.padFrame=requestAnimationFrame(this.pollPad);
  };
  private moveFocus(dx:number,dy:number){
    const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(button=>button.getClientRects().length);
    const active=document.activeElement as HTMLElement;
    if(!this.overlay.contains(active)){buttons[0]?.focus();return;}
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
  resume(){this.padPrevious=this.currentPad()?.buttons.map(b=>b.pressed)??[];this.hidden=false;this.overlay.hidden=false;this.overlay.style.display='';this.overlay.querySelector<HTMLButtonElement>('button')?.focus();}
  destroy(){this.disposed=true;cancelAnimationFrame(this.padFrame);this.observer.disconnect();this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.dismiss();}
  private go(step:Step){this.history.push(this.step);this.step=step;this.render();}
  private back(){this.step=this.history.pop()??'home';this.render();}
  private button(parent:HTMLElement,label:string,action:()=>void,cls='',disabled=false){
    const button=document.createElement('button');button.type='button';button.className=cls;button.textContent=label;button.disabled=disabled;button.addEventListener('click',action);parent.append(button);return button;
  }
  private element(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private routeButton(parent:HTMLElement,route:Route){
    this.button(parent,route.name,()=>{this.route=route;this.go(this.service==='local'?'review':'date')},'station-key');
  }
  private get options(){return routes.filter(r=>r.from===this.hub&&r.service===this.service);}
  private get price(){return this.fareAmount??this.route?.fare??0;}
  private deposit(amount:number){
    this.deposited+=amount;
    if(this.price>0&&this.deposited>=this.price){
      let ticket:TravelTicket;
      if(this.hub==='tokyo'&&this.service==='local'&&this.fareAmount!==null)ticket={kind:'fare',from:'tokyo',service:'local',fare:this.fareAmount};
      else if(this.route){
        ticket={...this.route,kind:'route'};
        if(this.service==='shinkansen')ticket.reservation={day:this.day,train:this.train,seat:this.seat};
      }else return;
      this.issue(ticket);this.step='issued';this.history=[];
    }
    this.render();
  }
  private render(){
    this.design.className='machine-design '+this.service;this.design.replaceChildren();
    const outer=this.element(this.design,'div','','machine-shell');
    const heading=this.element(outer,'div','','machine-brand');
    this.element(heading,'strong',this.service==='local'?'きっぷ・ICカード':'新幹線・特急 指定席券売機');
    this.element(heading,'span',this.service==='local'?'Tickets / IC cards':'Shinkansen / Limited Express Tickets');
    const switcher=this.element(this.design,'div','','machine-switcher');
    if(this.uiOptions.fixedService){
      this.button(switcher,'← Devant les machines',()=>this.close());
      if(this.uiOptions.lookAtWall)this.button(switcher,'↑ Regarder le plan mural',()=>this.uiOptions.lookAtWall!());
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
    this.button(bottom,this.tr('とりけし','Cancel'),()=>this.close(),'cancel');
    if(this.history.length&&this.step!=='issued')this.button(bottom,this.tr('もどる','Back'),()=>this.back(),'back');
    this.element(bottom,'span',this.tr('大人 1人　小児 0人','Adult 1   Child 0'),'passenger-count');
    const hardware=this.element(outer,'div','','machine-hardware');
    this.element(hardware,'div','カード / CARD  ▰','card-slot');this.element(hardware,'div','硬貨 / COINS  ◉','coin-slot');this.element(hardware,'div','紙幣 / BANKNOTES  ▰','cash-slot');
    this.element(hardware,'div',this.step==='issued'?'▼ きっぷ・おつり / TICKETS & CHANGE ▼':'きっぷ・おつり / TICKETS & CHANGE','output-slot'+(this.step==='issued'?' lit':''));
    this.element(this.design,'p','SIMULATION DE JEU · Destinations et tarifs adaptés · Aucun paiement réel','machine-disclaimer');
    this.design.querySelector<HTMLButtonElement>('.language')?.focus({preventScroll:true});
  }
  private changeMachine(service:Service){
    if(this.step==='issued'){this.close();return;}
    this.service=service;this.step='home';this.route=null;this.history=[];this.deposited=0;this.fareAmount=null;this.render();
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
      if(this.hub==='tokyo'&&this.service==='local')this.button(body,tr('旧試作版の遠足','Prototype excursions'),()=>{this.fareAmount=null;this.go('destination')},'legacy-excursions');
    }else if(this.step==='method'){
      const grid=this.element(body,'div','','payment-methods');
      this.button(grid,tr('現金・ICカード\nCash · IC Card','Cash · IC Card\nOrange Card')+'\n\n¥  ▰',()=>this.go('fares'));
      this.button(grid,'QR Code\n\n▦',()=>{},'',true);
    }else if(this.step==='fares'){
      this.element(body,'div',tr('JR線 きっぷ　　大人片道','JR Tickets · Adult single fare'),'fare-tabs');
      if(this.hub==='tokyo'){
        this.button(body,this.uiOptions.lookAtWall?tr('上の運賃表を見る','Look up at the wall fare map'):tr('東京駅からの運賃表を見る','View JR Tokyo fare map'),()=>this.uiOptions.lookAtWall?this.uiOptions.lookAtWall():this.go('map'),'open-fare-map');
        const grid=this.element(body,'div','','fare-grid all-fares');
        tokyoFareAmounts.forEach(amount=>this.button(grid,'¥'+amount.toLocaleString('en-US'),()=>{this.route=null;this.fareAmount=amount;this.go('review')}));
        this.element(body,'p',tr('運賃表で目的地の金額を調べてからお選びください。','Read the fare map, then choose your amount.'),'fare-note');
      }else{
        const grid=this.element(body,'div','','fare-grid');
        this.options.forEach(route=>this.button(grid,'¥'+route.fare.toLocaleString('en-US'),()=>{this.route=route;this.fareAmount=null;this.go('review')}));
        this.element(body,'p',tr('京都の運賃表は準備中です。','Kyoto fare map will come later.'),'fare-note');
        const table=this.element(body,'div','','fare-table');this.options.forEach(route=>this.element(table,'span',route.name+'   ¥'+route.fare.toLocaleString('en-US')));
      }
    }else if(this.step==='map'){
      const tools=this.element(body,'div','','map-tools');
      const viewport=this.element(body,'div','','fare-map-viewport');viewport.tabIndex=0;viewport.setAttribute('aria-label','Scrollable Tokyo JR fare map');
      const diagram=renderTokyoFareMap();diagram.style.width=(1275*this.mapZoom)+'px';diagram.style.height=(855*this.mapZoom)+'px';viewport.append(diagram);
      const zoom=(factor:number)=>{
        const old=this.mapZoom;this.mapZoom=Math.max(.55,Math.min(1.8,old*factor));const ratio=this.mapZoom/old;
        const x=(viewport.scrollLeft+viewport.clientWidth/2)*ratio-viewport.clientWidth/2,y=(viewport.scrollTop+viewport.clientHeight/2)*ratio-viewport.clientHeight/2;
        diagram.style.width=(1275*this.mapZoom)+'px';diagram.style.height=(855*this.mapZoom)+'px';viewport.scrollLeft=x;viewport.scrollTop=y;
      };
      this.button(tools,'−',()=>zoom(.8),'map-zoom');this.button(tools,'+',()=>zoom(1.25),'map-zoom');
      this.element(tools,'span',tr('ドラッグで移動 · 東京から','Drag map · from Tokyo'),'map-hint');
      this.button(tools,tr('金額を選ぶ','Choose amount'),()=>this.back(),'map-return');
      let drag:{x:number;y:number;left:number;top:number}|null=null;
      viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse')return;drag={x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};viewport.setPointerCapture(event.pointerId)});
      viewport.addEventListener('pointermove',event=>{if(drag){const scale=this.panel.clientWidth/960;viewport.scrollLeft=drag.left-(event.clientX-drag.x)/scale;viewport.scrollTop=drag.top-(event.clientY-drag.y)/scale}});
      viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
      this.element(body,'p',tr('JRのみ・きっぷ運賃 / ゲーム用参考図','JR East 2024 · Proposed 2026 paper fares · Game reference, not live fares'),'map-source');
      requestAnimationFrame(()=>{viewport.scrollLeft=800*this.mapZoom-viewport.clientWidth/2;viewport.scrollTop=490*this.mapZoom-viewport.clientHeight/2});
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
    }else if(this.step==='review'&&this.fareAmount!==null){
      this.element(body,'h3',tr('東京駅からの乗車券','Basic fare ticket from Tokyo'),'amount-ticket-title');
      this.element(body,'div','¥'+this.fareAmount.toLocaleString('en-US'),'amount-ticket-value');
      this.element(body,'p',tr('この金額のきっぷを購入します。目的地は指定されません。','This buys a value ticket. No destination is selected.'),'origin-note');
      this.element(body,'p',tr('目的地までの運賃は、運賃表でご確認ください。','Check your destination’s fare on the map.'),'origin-note');
      this.button(body,tr('確認','Confirm'),()=>{this.deposited=0;this.go('payment')},'confirm review-confirm');
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
      this.button(body,tr('確認','Confirm'),()=>{this.deposited=0;this.go('payment')},'confirm review-confirm');
    }else if(this.step==='payment'&&this.price>0){
      const totals=this.element(body,'div','','payment-totals');
      this.element(totals,'div',tr('お支払い金額','Amount due')+'\n¥'+this.price.toLocaleString('en-US'));
      this.element(totals,'div',tr('お預り金額','Amount inserted')+'\n¥'+this.deposited.toLocaleString('en-US'));
      this.element(body,'p',tr('下の現金ボタンで、投入をシミュレーションします。','Use the cash buttons below to simulate inserting money.'),'origin-note');
      const cash=this.element(body,'div','','cash-buttons');
      for(const amount of [100,500,1000,5000,10000])this.button(cash,'¥'+amount.toLocaleString('en-US'),()=>this.deposit(amount));
    }else if(this.step==='issued'&&this.price>0){
      this.element(body,'h3',tr('ありがとうございました','Thank you'),'thanks');
      const stub=this.element(body,'div','','paper-ticket');
      this.element(stub,'strong',this.hub.toUpperCase()+' → '+(this.fareAmount!==null?'¥'+this.fareAmount.toLocaleString('en-US'):this.route!.to.toUpperCase()));
      this.element(stub,'span',this.fareAmount!==null?tr('普通乗車券 · JR線','Basic fare ticket · JR lines'):this.route!.line+' · '+this.route!.platform);
      this.element(stub,'span','ADULT 1   ¥'+this.price.toLocaleString('en-US'));
      if(this.service==='shinkansen')this.element(stub,'span',this.day+' · '+this.train+' · '+this.seat);
      this.element(body,'p',tr('おつり','Change')+'   ¥'+(this.deposited-this.price).toLocaleString('en-US'),'change-due');
      this.button(body,tr('きっぷとおつりを取る','Take tickets and change'),()=>this.close(),'confirm collect-ticket');
    }
  }
}
