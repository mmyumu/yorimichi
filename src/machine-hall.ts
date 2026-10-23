import { fareMapHeight, fareMapWidth, renderTokyoFareMap, renderWallFareMap } from './tokyo-fares';
import type { Hub, Service } from './network';

type DeviceKind=Service|'charge';
interface Device {id:string;kind:DeviceKind;x:number;label:string}
const devices:Device[]=[
  {id:'tickets-01',kind:'local',x:450,label:'01 · きっぷ / Billets locaux'},
  {id:'charge-02',kind:'charge',x:1050,label:'02 · チャージ専用 / Recharge IC'},
  {id:'tickets-03',kind:'local',x:1650,label:'03 · きっぷ / Billets locaux'},
  {id:'charge-04',kind:'charge',x:2250,label:'04 · チャージ専用 / Recharge IC'},
  {id:'express-05',kind:'shinkansen',x:2850,label:'05 · 新幹線 / Shinkansen'},
];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** A CSS 3D station alcove: lateral body movement and head rotation are independent. */
export class MachineHall {
  private overlay=document.createElement('div');
  private viewport=document.createElement('div');
  private camera=document.createElement('div');
  private wall=document.createElement('div');
  private position=document.createElement('span');
  private status=document.createElement('span');
  private use!:HTMLButtonElement;
  private keys=new Set<string>();
  private frame=0;
  private previousTime=0;
  private paused=false;
  private disposed=false;
  private notice:HTMLElement|null=null;
  private mapDetail:HTMLElement|null=null;
  private x=1900;
  private targetX=1900;
  private yaw=0;
  private pitch=12;
  private distance=1120;
  private holding=0;
  private drag:{id:number;x:number;y:number;startX:number;startY:number;moved:boolean;device?:string}|null=null;
  private hovered:HTMLElement|null=null;
  private lastPadButtons:boolean[]=[];
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private hub:Hub,initial:Service,private open:(service:Service,id:string)=>void,private exit:()=>void){
    if(initial==='shinkansen')this.x=this.targetX=3100;
    this.overlay.className='machine-hall';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Devant les distributeurs de billets');
    const header=this.el(this.overlay,'header','','hall-header');
    this.el(header,'div',`${hub==='tokyo'?'東京 TOKYO':'京都 KYOTO'} / きっぷうりば`,'hall-heading');
    this.button(header,'Retour au hall',()=>this.close(),'hall-exit');
    this.viewport.className='hall-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','Regarder autour en glissant. Flèches gauche et droite pour se déplacer.');
    this.overlay.append(this.viewport);this.viewport.append(this.camera);this.camera.className='hall-camera';this.wall.className='hall-wall';this.camera.append(this.wall);
    this.buildWall();
    const controls=this.el(this.overlay,'div','','hall-controls');
    const movement=this.el(controls,'div','','hall-movement');
    this.holdButton(movement,'← Se décaler',-1);this.holdButton(movement,'Se décaler →',1);
    const views=this.el(controls,'div','','hall-view-controls');
    this.button(views,'↑ Regarder le plan',()=>this.lookAtMap());
    if(hub==='tokyo')this.button(views,'Lire les gares',()=>this.openMapDetail());
    this.button(views,'↓ Regarder les bornes',()=>this.lookAtMachines());
    this.button(views,'−',()=>this.distance=clamp(this.distance+160,550,1500),'hall-zoom');
    this.button(views,'+',()=>this.distance=clamp(this.distance-160,550,1500),'hall-zoom');
    const actions=this.el(controls,'div','','hall-actions');this.use=this.button(actions,'Utiliser cette borne',()=>this.activate(),'hall-use');
    const bottom=this.el(this.overlay,'div','','hall-bottom');bottom.append(this.position,this.status);
    this.el(this.overlay,'p','Glisser : tourner la tête · Flèches / A–D : se décaler · Manette : stick gauche / stick droit · A : utiliser · B : retour','hall-help');
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',this.keyup);
    this.overlay.addEventListener('focusout',()=>{this.keys.clear();this.holding=0});
    window.addEventListener('blur',this.blur);
    this.viewport.addEventListener('pointerdown',this.pointerDown);
    this.viewport.addEventListener('pointermove',this.pointerMove);
    this.viewport.addEventListener('pointerup',this.pointerUp);
    this.viewport.addEventListener('pointercancel',()=>this.drag=null);
    this.viewport.addEventListener('pointerleave',()=>this.hover(null));
    this.viewport.addEventListener('wheel',this.wheel,{passive:false});
    document.body.append(this.overlay);this.viewport.focus();this.frame=requestAnimationFrame(this.tick);
  }
  private el(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private button(parent:HTMLElement,label:string,action:()=>void,cls=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=action;parent.append(b);return b;}
  private holdButton(parent:HTMLElement,label:string,direction:number){
    const b=this.button(parent,label,()=>{},'hall-strafe');
    b.onpointerdown=event=>{event.preventDefault();b.focus();b.setPointerCapture(event.pointerId);this.holding=direction};
    b.onpointerup=()=>this.holding=0;b.onpointercancel=()=>this.holding=0;b.onlostpointercapture=()=>this.holding=0;
    b.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();this.holding=direction}};
    b.onkeyup=()=>this.holding=0;
  }
  private buildWall(){
    this.el(this.wall,'div','','hall-ceiling');
    for(let i=0;i<6;i++){const light=this.el(this.wall,'div','','hall-strip-light');light.style.left=(120+i*650)+'px'}
    const mapFrame=this.el(this.wall,'div','','hall-map-frame');
    if(this.hub==='kyoto')this.el(mapFrame,'h2','京都駅 / KYOTO · のりば案内','hall-map-title');
    if(this.hub==='tokyo'){
      const map=renderWallFareMap();map.classList.add('hall-fare-map');mapFrame.append(map);
    }else{
      this.el(mapFrame,'div','京都 KYOTO  ━━━━━  新幹線 SHINKANSEN  ━━━━━  東京 TOKYO','kyoto-hall-map');
      this.el(mapFrame,'div','京都 KYOTO  ━━━━━  嵯峨野線 SAGANO  ━━━━━  嵐山 ARASHIYAMA  ¥240','kyoto-hall-map');
      this.el(mapFrame,'p','Plan tarifaire détaillé de Kyoto à venir.','hall-map-footnote');
    }
    for(const device of devices){
      // Each machine is a CSS 3D box standing out of the wall: body, lit canopy, slanted screen console, coin ledge and ticket tray.
      const cabinet=this.el(this.wall,'div','','hall-cabinet '+device.kind);cabinet.style.left=device.x+'px';cabinet.dataset.device=device.id;
      for(const side of ['cab-side left','cab-side right'])this.el(cabinet,'div','',side);
      const front=this.el(cabinet,'div','','cab-front');
      const title=device.kind==='charge'?'チャージ専用':device.kind==='local'?'きっぷ Tickets':'新幹線・特急';
      const canopy=this.el(cabinet,'div','','cab-canopy');
      for(const side of ['canopy-side left','canopy-side right','canopy-under'])this.el(canopy,'div','',side);
      this.el(canopy,'div',title,'cabinet-sign');
      this.el(front,'div',device.kind==='charge'?'Charge / Recharge IC':device.kind==='local'?'Tickets / Billets':'Reserved Seat / Shinkansen','cabinet-subtitle');
      const consoleBox=this.el(cabinet,'div','','cab-console');
      for(const side of ['console-cheek left','console-cheek right','console-ledge'])this.el(consoleBox,'div','',side);
      const panel=this.el(consoleBox,'div','','cabinet-panel');
      this.el(panel,'div',device.kind==='charge'?'ICカードを入れてください':'ご希望のボタンをお選びください','cabinet-instructions');
      const screen=this.el(panel,'div','','cabinet-screen');
      if(device.kind==='charge'){
        this.el(screen,'div','IC','cabinet-ic-icon');this.el(screen,'strong','カードを入れてください');this.el(screen,'small','Please insert your IC card');
      }else{
        this.el(screen,'strong',device.kind==='local'?'きっぷ購入':'指定席');
        const buttons=this.el(screen,'div','','cabinet-mini-keys');for(const text of device.kind==='local'?['¥160','¥200','¥210','¥260','¥350','¥440']:['新幹線','指定席','予約','受取'])this.el(buttons,'span',text);
      }
      this.el(consoleBox,'div','現金  ¥  /  IC  ▰','cabinet-slots');
      const tray=this.el(cabinet,'div','','cab-tray');this.el(tray,'div','きっぷ・おつり ▼','cabinet-tray');this.el(tray,'div','','tray-lip');this.el(tray,'div','','tray-lip-top');
      this.el(front,'div',device.id.slice(-2),'cabinet-number');
    }
    this.el(this.wall,'div','','hall-floor');
  }
  private nearest(){return devices.reduce((a,b)=>Math.abs(a.x+250-this.x)<Math.abs(b.x+250-this.x)?a:b)}
  private focusDevice(device:Device){this.x=this.targetX=device.x+250;this.yaw=0;this.pitch=0;this.activate();}
  private activate(){
    if(this.paused||this.notice)return;
    if(this.pitch>20||Math.abs(this.yaw)>30){this.lookAtMachines();return;}
    const device=this.nearest();this.x=this.targetX=device.x+250;
    if(device.kind==='charge'){this.chargeNotice();return;}
    this.pause();this.open(device.kind,device.id);
  }
  private chargeNotice(){
    this.keys.clear();this.holding=0;
    this.notice=this.el(this.overlay,'section','','charge-notice');this.notice.setAttribute('role','alertdialog');this.notice.setAttribute('aria-label','Recharge de carte IC');
    this.el(this.notice,'span','チャージ専用 / IC CARD CHARGE','charge-eyebrow');
    this.el(this.notice,'h2','カードを入れてください');this.el(this.notice,'p','Insérez votre carte IC pour recharger.');
    this.el(this.notice,'div','IC','charge-card-illustration');
    this.el(this.notice,'p','Vous n’avez pas de carte IC. Cette borne ne vend pas de carte : la recharge est indisponible.');
    this.button(this.notice,'Acheter une carte · plus tard',()=>{}).disabled=true;
    this.button(this.notice,'Revenir devant les machines',()=>this.closeNotice(),'charge-back').focus();
  }
  private closeNotice(){this.notice?.remove();this.notice=null;this.viewport.focus();}
  private openMapDetail(){
    if(this.mapDetail||this.hub!=='tokyo')return;
    this.keys.clear();this.holding=0;
    const detail=this.el(this.overlay,'section','','hall-map-detail');
    detail.setAttribute('role','dialog');detail.setAttribute('aria-modal','true');detail.setAttribute('aria-label','Plan JR détaillé');
    this.mapDetail=detail;
    const toolbar=this.el(detail,'div','','hall-map-detail-toolbar');
    this.el(toolbar,'strong','東京駅から · JR線近距離きっぷ運賃表');
    const lineSelect=document.createElement('select');lineSelect.setAttribute('aria-label','Filtrer les noms par ligne');toolbar.append(lineSelect);
    for(const [name,color] of [['Toutes les gares',''],['山手線','#77b92e'],['中央線','#f26826'],['高崎・宇都宮線','#f27a24'],['宇都宮・埼京線','#00a9ad'],['常磐線','#087abc'],['総武線','#e8c600'],['東海道線','#ef8b25'],['京葉線','#c85465']]){
      const option=document.createElement('option');option.value=color;option.textContent=name;lineSelect.append(option);
    }
    const selected=this.el(toolbar,'span','Toutes les gares sont affichées. Touchez un arrêt pour lire son nom.','hall-map-selected');
    const viewport=this.el(detail,'div','','hall-map-canvas');viewport.tabIndex=0;
    viewport.setAttribute('aria-label','Plan JR à déplacer horizontalement et verticalement');
    const diagram=renderTokyoFareMap();viewport.append(diagram);
    lineSelect.onchange=()=>{
      diagram.querySelectorAll<SVGTextElement>('.fare-map-detail').forEach(text=>text.style.display=!lineSelect.value||text.dataset.line===lineSelect.value?'':'none');
      selected.textContent=lineSelect.value?'Noms de la ligne sélectionnée. Touchez un arrêt pour le lire.':'Toutes les gares sont affichées. Touchez un arrêt pour lire son nom.';
    };
    diagram.addEventListener('click',event=>{
      const marker=(event.target as Element).closest<SVGElement>('[data-name]');
      if(!marker)return;
      const fare=marker.getAttribute('data-fare');
      selected.textContent=marker.getAttribute('data-name')!+(fare?` · ¥${Number(fare).toLocaleString('en-US')}`:' · tarif non renseigné');
    });
    let zoom=1;
    const size=()=>{diagram.style.width=`${fareMapWidth*zoom}px`;diagram.style.height=`${fareMapHeight*zoom}px`};
    const changeZoom=(factor:number)=>{
      const old=zoom;zoom=clamp(zoom*factor,.55,2.2);
      const centerX=viewport.scrollLeft+viewport.clientWidth/2,centerY=viewport.scrollTop+viewport.clientHeight/2;
      size();viewport.scrollLeft=centerX*zoom/old-viewport.clientWidth/2;viewport.scrollTop=centerY*zoom/old-viewport.clientHeight/2;
    };
    this.button(toolbar,'−',()=>changeZoom(.8));
    this.button(toolbar,'+',()=>changeZoom(1.25));
    this.button(toolbar,'Fermer',()=>this.closeMapDetail());
    let drag:{id:number;x:number;y:number;left:number;top:number;moved:boolean}|null=null;
    viewport.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse')return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,moved:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(!drag.moved&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>4){drag.moved=true;viewport.setPointerCapture(event.pointerId)}
      if(drag.moved){viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY}
    });
    viewport.addEventListener('pointerup',()=>drag=null);viewport.addEventListener('pointercancel',()=>drag=null);
    size();
    requestAnimationFrame(()=>{viewport.scrollLeft=1185-viewport.clientWidth/2;viewport.scrollTop=610-viewport.clientHeight/2});
    toolbar.querySelector<HTMLButtonElement>('button:last-child')?.focus();
  }
  private closeMapDetail(){this.mapDetail?.remove();this.mapDetail=null;this.viewport.focus();}
  lookAtMap(){this.pitch=26;this.yaw=0;}
  private lookAtMachines(){this.pitch=0;this.yaw=0;}
  pause(){this.paused=true;this.overlay.hidden=true;this.keys.clear();this.holding=0;this.drag=null;}
  resume(map=false){if(this.disposed)return;this.paused=false;this.overlay.hidden=false;this.lastPadButtons=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];if(map)this.lookAtMap();else this.lookAtMachines();this.viewport.focus();}
  destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);window.removeEventListener('blur',this.blur);this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.exit();}
  private blur=()=>{this.keys.clear();this.holding=0;this.drag=null;};
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){
      const selector=this.mapDetail?'.hall-map-detail button:not(:disabled), .hall-map-detail select, .hall-map-canvas':this.notice?'.charge-notice button:not(:disabled)':'button:not(:disabled), .hall-viewport';
      const all=Array.from(this.overlay.querySelectorAll<HTMLElement>(selector));
      if(event.shiftKey&&document.activeElement===all[0]){event.preventDefault();all.at(-1)?.focus()}else if(!event.shiftKey&&document.activeElement===all.at(-1)){event.preventDefault();all[0]?.focus()}return;
    }
    if(event.key==='Escape'){event.preventDefault();if(this.mapDetail)this.closeMapDetail();else if(this.notice)this.closeNotice();else this.close();return;}
    if(this.notice||this.mapDetail)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','a','A','d','D','w','W','s','S'].includes(event.key)){event.preventDefault();this.keys.add(event.key.toLowerCase())}
    if((event.key.toLowerCase()==='e'||event.key===' ')&&event.target===this.viewport){event.preventDefault();if(!event.repeat)this.activate()}
  };
  private keyup=(event:KeyboardEvent)=>{event.stopPropagation();this.keys.delete(event.key.toLowerCase())};
  private pointerDown=(event:PointerEvent)=>{
    if((event.target as HTMLElement).closest('button'))return;
    const device=(event.target as HTMLElement).closest<HTMLElement>('.hall-cabinet')?.dataset.device;
    this.viewport.setPointerCapture(event.pointerId);this.viewport.focus();this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,device};
  };
  private pointerMove=(event:PointerEvent)=>{
    const drag=this.drag;if(!drag){this.hover((event.target as HTMLElement).closest<HTMLElement>('.hall-cabinet'));return}
    if(event.pointerId!==drag.id)return;
    const sensitivity=80/Math.max(500,this.viewport.clientWidth);
    this.yaw=clamp(this.yaw-(event.clientX-drag.x)*sensitivity,-42,42);this.pitch=clamp(this.pitch+(event.clientY-drag.y)*sensitivity,-24,48);
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4)drag.moved=true;
    drag.x=event.clientX;drag.y=event.clientY;
  };
  private pointerUp=(event:PointerEvent)=>{
    const drag=this.drag;if(drag?.id!==event.pointerId)return;
    this.drag=null;if(!drag.moved&&drag.device)this.clickDevice(drag.device);
  };
  private hover(cabinet:HTMLElement|null){this.hovered?.classList.remove('is-hover');this.hovered=cabinet;cabinet?.classList.add('is-hover')}
  /** A click on a machine uses it when standing in front of it; otherwise it walks there first. */
  private clickDevice(id:string){
    const device=devices.find(d=>d.id===id);if(!device||this.paused||this.notice||this.mapDetail)return;
    if(this.nearest().id===id)this.focusDevice(device);else{this.targetX=device.x+250;this.yaw=0;this.pitch=0}
  }
  private wheel=(event:WheelEvent)=>{event.preventDefault();if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))this.targetX=clamp(this.targetX+(event.deltaX||event.deltaY)*1.4,650,3250);else this.distance=clamp(this.distance+event.deltaY*.6,550,1500)};
  private tick=(time:number)=>{
    if(this.disposed)return;
    const dt=Math.min((time-this.previousTime)/1000||0,.04);this.previousTime=time;
    if(!this.paused){
      let strafe=this.holding+(this.keys.has('arrowright')||this.keys.has('d')?1:0)-(this.keys.has('arrowleft')||this.keys.has('a')?1:0);
      let vertical=(this.keys.has('arrowup')||this.keys.has('w')?1:0)-(this.keys.has('arrowdown')||this.keys.has('s')?1:0);
      const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);
      if(pad){
        const dead=(v:number)=>Math.abs(v)>.18?v:0;
        if(!this.notice&&!this.mapDetail){strafe+=dead(pad.axes[0]??0);this.distance=clamp(this.distance+dead(pad.axes[1]??0)*500*dt,550,1500);this.yaw=clamp(this.yaw+dead(pad.axes[2]??0)*65*dt,-42,42);this.pitch=clamp(this.pitch-dead(pad.axes[3]??0)*55*dt,-24,48)}
        const pressed=pad.buttons.map(b=>b.pressed);
        if(pressed[0]&&!this.lastPadButtons[0]){if(this.notice)this.closeNotice();else if(!this.mapDetail)this.activate()}
        if(pressed[1]&&!this.lastPadButtons[1]){if(this.mapDetail)this.closeMapDetail();else if(this.notice)this.closeNotice();else this.close()}
        if(!this.notice&&!this.mapDetail){if(pressed[14])strafe-=1;if(pressed[15])strafe+=1;if(pressed[12])vertical+=1;if(pressed[13])vertical-=1}
        this.lastPadButtons=pressed;
      }
      if(!this.notice&&!this.mapDetail){this.targetX=clamp(this.targetX+strafe*660*dt,650,3250);this.pitch=clamp(this.pitch+vertical*42*dt,-24,48)}
      this.x+=(this.targetX-this.x)*Math.min(1,dt*14);
      // The camera rotates; translation remains the player's body position along the wall.
      this.camera.style.transform=`rotateX(${this.pitch}deg) rotateY(${this.yaw}deg)`;
      this.wall.style.transform=`translate3d(${-this.x}px,-1120px,${-this.distance}px)`;
      const nearest=this.nearest();
      this.wall.querySelectorAll('.hall-cabinet').forEach(c=>c.classList.toggle('is-near',(c as HTMLElement).dataset.device===nearest.id));
      this.position.textContent=nearest.label;
      this.status.textContent=this.pitch>20?'Plan au mur · décalez-vous pour suivre les lignes':nearest.kind==='charge'?'Carte IC nécessaire · aucune carte détenue':'Cliquer la borne ou E / A : utiliser · glisser pour regarder autour';
      this.use.textContent=this.pitch>20?'Baisser les yeux vers les bornes':nearest.kind==='charge'?'Examiner la recharge':'Utiliser cette borne';
      this.overlay.dataset.machine=nearest.id;this.overlay.dataset.x=this.x.toFixed(1);this.overlay.dataset.pitch=this.pitch.toFixed(1);this.overlay.dataset.yaw=this.yaw.toFixed(1);
      this.overlay.dataset.mapDetail=String(this.pitch>20&&this.distance<=700);
    }
    if(!this.disposed)this.frame=requestAnimationFrame(this.tick);
  };
}
