import { routes, type Hub, type Route, type Service } from './network';

export interface TravelTicket extends Route { reservation?: { day:string; train:string; seat:string } }
type Step='home'|'method'|'fares'|'search'|'destination'|'date'|'passengers'|'train'|'seat'|'review'|'payment'|'issued';
type Lang='ja'|'en';

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
  private search='';
  private searchNote='';
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private hub:Hub,service:Service,private issue:(ticket:TravelTicket)=>void,private dismiss:()=>void){
    this.service=service;
    this.overlay.className='machine-overlay';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Distributeur de billets');
    this.panel.className='machine-viewport';this.design.className='machine-design';this.panel.append(this.design);this.overlay.append(this.panel);document.body.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.design.style.transform=`scale(${this.panel.clientWidth/960})`);this.observer.observe(this.panel);
    this.overlay.addEventListener('keydown',this.onKey);this.render();
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
  destroy(){this.observer.disconnect();this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.dismiss();}
  private go(step:Step){this.history.push(this.step);this.step=step;this.render();}
  private back(){this.step=this.history.pop()??'home';this.searchNote='';this.render();}
  private button(parent:HTMLElement,label:string,action:()=>void,cls='',disabled=false){
    const button=document.createElement('button');button.type='button';button.className=cls;button.textContent=label;button.disabled=disabled;button.addEventListener('click',action);parent.append(button);return button;
  }
  private element(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private routeButton(parent:HTMLElement,route:Route){
    this.button(parent,route.name,()=>{this.route=route;this.go(this.service==='local'?'review':'date')},'station-key');
  }
  private get options(){return routes.filter(r=>r.from===this.hub&&r.service===this.service);}
  private deposit(amount:number){
    this.deposited+=amount;
    if(this.route&&this.deposited>=this.route.fare){
      const ticket:TravelTicket={...this.route};
      if(this.service==='shinkansen')ticket.reservation={day:this.day,train:this.train,seat:this.seat};
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
    this.button(switcher,'在来線 / Local',()=>this.changeMachine('local'),this.service==='local'?'active':'');
    this.button(switcher,'新幹線 / Shinkansen',()=>this.changeMachine('shinkansen'),this.service==='shinkansen'?'active':'');
    const screen=this.element(outer,'div','','machine-screen');screen.setAttribute('lang',this.lang);
    const top=this.element(screen,'div','','machine-top');
    const titles:Record<Step,[string,string]>={home:['きっぷの種類をお選びください','Select ticket type'],method:['お支払い方法をお選びください','Please select the desired payment method'],fares:['ご希望のボタンをお選びください','Make your selection below.'],search:['駅名を入力してください','Enter the station name.'],destination:['降車駅をお選びください','Select station where you will get off'],date:['ご乗車日をお選びください','Select the boarding date'],passengers:['ご利用人数をお選びください','Select the number of passengers'],train:['ご希望の列車をお選びください','Select the train you wish to take'],seat:['お座席をお選びください','Select your desired seat'],review:['内容をご確認ください','If OK, press Confirm'],payment:['現金をお入れください','Please insert cash.'],issued:['きっぷをお取りください','Please take your ticket(s).']};
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
    this.service=service;this.step='home';this.route=null;this.history=[];this.deposited=0;this.search='';this.render();
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
      this.element(body,'div',tr('きっぷ　　他社線　　回数券','JR Tickets     Private Railway     Special Tickets'),'fare-tabs');
      this.button(body,tr('駅名からさがす','Search for a station name'),()=>{this.search='';this.go('search')},'search-station');
      const grid=this.element(body,'div','','fare-grid');
      this.options.forEach(route=>this.button(grid,'¥'+route.fare.toLocaleString('en-US'),()=>{this.route=route;this.go('review')}));
      this.element(body,'p',tr('運賃表をご確認ください。','Please check the fare table.'),'fare-note');
      const table=this.element(body,'div','','fare-table');
      this.options.forEach(route=>this.element(table,'span',route.name+'   ¥'+route.fare.toLocaleString('en-US')));
    }else if(this.step==='search'){
      const form=this.element(body,'form','','station-search');
      const input=document.createElement('input');input.type='search';input.value=this.search;input.placeholder=tr('駅名 / Station name','Station name');input.setAttribute('aria-label','Station name');form.append(input);
      const search=()=>{this.search=input.value.trim();this.searchNote=this.options.some(r=>this.matches(r))?'':tr('この試作版には該当する駅がありません。','No matching station in this prototype.');this.render();};
      form.addEventListener('submit',event=>{event.preventDefault();search()});this.button(form,tr('検索','Search'),search,'confirm');
      const results=this.element(body,'div','','station-grid');this.options.filter(r=>this.matches(r)).forEach(route=>this.routeButton(results,route));
      if(this.searchNote)this.element(body,'p',this.searchNote,'search-note');
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
      this.button(body,tr('確認','Confirm'),()=>{this.deposited=0;this.go('payment')},'confirm review-confirm');
    }else if(this.step==='payment'&&this.route){
      const totals=this.element(body,'div','','payment-totals');
      this.element(totals,'div',tr('お支払い金額','Amount due')+'\n¥'+this.route.fare.toLocaleString('en-US'));
      this.element(totals,'div',tr('お預り金額','Amount inserted')+'\n¥'+this.deposited.toLocaleString('en-US'));
      this.element(body,'p',tr('下の現金ボタンで、投入をシミュレーションします。','Use the cash buttons below to simulate inserting money.'),'origin-note');
      const cash=this.element(body,'div','','cash-buttons');
      for(const amount of [100,500,1000,5000,10000])this.button(cash,'¥'+amount.toLocaleString('en-US'),()=>this.deposit(amount));
    }else if(this.step==='issued'&&this.route){
      this.element(body,'h3',tr('ありがとうございました','Thank you'),'thanks');
      const stub=this.element(body,'div','','paper-ticket');
      this.element(stub,'strong',this.hub.toUpperCase()+' → '+this.route.to.toUpperCase());
      this.element(stub,'span',this.route.line+' · '+this.route.platform);
      this.element(stub,'span','ADULT 1   ¥'+this.route.fare.toLocaleString('en-US'));
      if(this.service==='shinkansen')this.element(stub,'span',this.day+' · '+this.train+' · '+this.seat);
      this.element(body,'p',tr('おつり','Change')+'   ¥'+(this.deposited-this.route.fare).toLocaleString('en-US'),'change-due');
      this.button(body,tr('きっぷとおつりを取る','Take tickets and change'),()=>this.close(),'confirm collect-ticket');
    }
  }
  private matches(route:Route){const needle=this.search.toLocaleLowerCase();return !needle||route.name.toLocaleLowerCase().includes(needle)||route.line.toLocaleLowerCase().includes(needle);}
}
