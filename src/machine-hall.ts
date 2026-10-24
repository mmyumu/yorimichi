import { fareMapHeight, fareMapWidth, renderTokyoFareMap } from './tokyo-fares';
import { HallScene } from './hall-scene';
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
// How close to and far from the machines the player can stand: near enough to read the payment faces, never so far that the hall's edges show.
const minDistance=250,maxDistance=1000;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
// By physical key (KeyboardEvent.code), so WASD on QWERTY is ZQSD on AZERTY and the same keys on JIS.
const moveKeys:Record<string,string>={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyR:'lookUp',PageUp:'lookUp',KeyF:'lookDown',PageDown:'lookDown'};

/** A first-person station alcove: lateral body movement and head rotation are independent; HallScene draws it. */
export class MachineHall {
  private overlay=document.createElement('div');
  private viewport=document.createElement('div');
  private scene:HallScene;
  private position=document.createElement('span');
  private status=document.createElement('span');
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
  private pitch=0;
  private distance=760;
  private drag:{id:number;x:number;y:number;startX:number;startY:number;moved:boolean;device?:string}|null=null;
  // Starts with the buttons already held, so the A press that opened the hall does not also use a machine.
  private lastPadButtons:boolean[]=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private hub:Hub,initial:Service,private open:(service:Service,id:string)=>void,private exit:()=>void){
    if(initial==='shinkansen')this.x=this.targetX=3100;
    this.overlay.className='machine-hall';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Devant les distributeurs de billets');
    const header=this.el(this.overlay,'header','','hall-header');
    this.el(header,'div',`${hub==='tokyo'?'東京 TOKYO':'京都 KYOTO'} / きっぷうりば`,'hall-heading');
    this.button(header,'Retour au hall',()=>this.close(),'hall-exit');
    this.viewport.className='hall-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','Regarder autour en glissant. Flèches gauche et droite pour se déplacer, haut et bas pour s’approcher ou s’éloigner.');
    this.overlay.append(this.viewport);this.scene=new HallScene(this.viewport,hub,devices);
    const bottom=this.el(this.overlay,'div','','hall-bottom');bottom.append(this.position,this.status);
    this.el(this.overlay,'p','Glisser ou R / F : tourner la tête · Flèches / ZQSD : se déplacer · Molette : distance · Clic, E ou A : utiliser · Manette : sticks · B / Échap : retour','hall-help');
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',this.keyup);
    this.overlay.addEventListener('focusout',()=>this.keys.clear());
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
  private nearest(){return devices.reduce((a,b)=>Math.abs(a.x+250-this.x)<Math.abs(b.x+250-this.x)?a:b)}
  private focusDevice(device:Device){this.x=this.targetX=device.x+250;this.yaw=0;this.pitch=-5;this.activate();}
  /** Whether A / E would use the nearest machine rather than turn back towards the machines. */
  private facingMachines(){return this.pitch<=10&&Math.abs(this.yaw)<=18}
  /** Whether the head is raised to the Tokyo fare map: it is highlighted and A / E / a click reads it. */
  private facingMap(){return this.hub==='tokyo'&&this.pitch>10&&Math.abs(this.yaw)<=25}
  private activate(){
    if(this.paused||this.notice)return;
    if(this.facingMap()){this.openMapDetail();return;}
    if(!this.facingMachines()){this.lookAtMachines();return;}
    const device=this.nearest();this.x=this.targetX=device.x+250;
    if(device.kind==='charge'){this.chargeNotice();return;}
    this.pause();this.open(device.kind,device.id);
  }
  private chargeNotice(){
    this.keys.clear();
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
    this.keys.clear();
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
  lookAtMap(){this.pitch=16;this.yaw=0;}
  private lookAtMachines(){this.pitch=-5;this.yaw=0;}
  pause(){this.paused=true;this.overlay.hidden=true;this.keys.clear();this.drag=null;}
  resume(map=false){if(this.disposed)return;this.paused=false;this.overlay.hidden=false;this.lastPadButtons=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];if(map)this.lookAtMap();else this.lookAtMachines();this.viewport.focus();}
  destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.scene.dispose();window.removeEventListener('blur',this.blur);this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.exit();}
  private blur=()=>{this.keys.clear();this.drag=null;};
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){
      const selector=this.mapDetail?'.hall-map-detail button:not(:disabled), .hall-map-detail select, .hall-map-canvas':this.notice?'.charge-notice button:not(:disabled)':'button:not(:disabled), .hall-viewport';
      const all=Array.from(this.overlay.querySelectorAll<HTMLElement>(selector));
      if(event.shiftKey&&document.activeElement===all[0]){event.preventDefault();all.at(-1)?.focus()}else if(!event.shiftKey&&document.activeElement===all.at(-1)){event.preventDefault();all[0]?.focus()}return;
    }
    if(event.key==='Escape'){event.preventDefault();if(this.mapDetail)this.closeMapDetail();else if(this.notice)this.closeNotice();else this.close();return;}
    if(this.notice||this.mapDetail)return;
    const move=moveKeys[event.code];if(move){event.preventDefault();this.keys.add(move)}
    if((event.code==='KeyE'||event.code==='Space')&&event.target===this.viewport){event.preventDefault();if(!event.repeat)this.activate()}
  };
  private keyup=(event:KeyboardEvent)=>{event.stopPropagation();const move=moveKeys[event.code];if(move)this.keys.delete(move)};
  private pointerDown=(event:PointerEvent)=>{
    if((event.target as HTMLElement).closest('button'))return;
    const device=this.scene.pick(event.clientX,event.clientY)??undefined;
    this.viewport.setPointerCapture(event.pointerId);this.viewport.focus();this.drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,device};
  };
  private pointerMove=(event:PointerEvent)=>{
    const drag=this.drag;if(!drag){this.hover(this.scene.pick(event.clientX,event.clientY));return}
    if(event.pointerId!==drag.id)return;
    const sensitivity=55/Math.max(500,this.viewport.clientWidth);
    this.yaw=clamp(this.yaw+(event.clientX-drag.x)*sensitivity,-35,35);this.pitch=clamp(this.pitch-(event.clientY-drag.y)*sensitivity,-20,30);
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4)drag.moved=true;
    drag.x=event.clientX;drag.y=event.clientY;
  };
  private pointerUp=(event:PointerEvent)=>{
    const drag=this.drag;if(drag?.id!==event.pointerId)return;
    this.drag=null;if(!drag.moved&&drag.device)this.clickDevice(drag.device);
  };
  private hover(id:string|null){this.scene.setHover(id);this.viewport.style.cursor=id?'pointer':''}
  /** A click on a machine uses it when standing in front of it, otherwise it walks there first; a click on the fare map reads it. */
  private clickDevice(id:string){
    if(this.paused||this.notice||this.mapDetail)return;
    if(id==='map'){this.openMapDetail();return;}
    const device=devices.find(d=>d.id===id);if(!device)return;
    if(this.nearest().id===id)this.focusDevice(device);else{this.targetX=device.x+250;this.yaw=0;this.pitch=-5}
  }
  private wheel=(event:WheelEvent)=>{event.preventDefault();if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))this.targetX=clamp(this.targetX+(event.deltaX||event.deltaY)*1.4,650,3250);else this.distance=clamp(this.distance+event.deltaY*.6,minDistance,maxDistance)};
  private tick=(time:number)=>{
    if(this.disposed)return;
    const dt=Math.min((time-this.previousTime)/1000||0,.04);this.previousTime=time;
    if(!this.paused){
      let strafe=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0);
      let vertical=(this.keys.has('up')?1:0)-(this.keys.has('down')?1:0);
      const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);
      if(pad){
        const dead=(v:number)=>Math.abs(v)>.18?v:0;
        if(!this.notice&&!this.mapDetail){strafe+=dead(pad.axes[0]??0);vertical-=dead(pad.axes[1]??0);this.yaw=clamp(this.yaw+dead(pad.axes[2]??0)*65*dt,-35,35);this.pitch=clamp(this.pitch-dead(pad.axes[3]??0)*55*dt,-20,30)}
        const pressed=pad.buttons.map(b=>b.pressed);
        if(pressed[0]&&!this.lastPadButtons[0]){if(this.notice)this.closeNotice();else if(!this.mapDetail)this.activate()}
        if(pressed[1]&&!this.lastPadButtons[1]){if(this.mapDetail)this.closeMapDetail();else if(this.notice)this.closeNotice();else this.close()}
        if(!this.notice&&!this.mapDetail){if(pressed[14])strafe-=1;if(pressed[15])strafe+=1;if(pressed[12])vertical+=1;if(pressed[13])vertical-=1}
        this.lastPadButtons=pressed;
      }
      if(!this.notice&&!this.mapDetail){this.targetX=clamp(this.targetX+strafe*1200*dt,650,3250);this.distance=clamp(this.distance-vertical*1000*dt,minDistance,maxDistance);this.pitch=clamp(this.pitch+((this.keys.has('lookUp')?1:0)-(this.keys.has('lookDown')?1:0))*55*dt,-20,30)}
      this.x+=(this.targetX-this.x)*Math.min(1,dt*14);
      // The camera rotates; translation remains the player's body position along the wall.
      const nearest=this.nearest();
      const free=!this.notice&&!this.mapDetail;
      this.scene.render(this.x,this.yaw,this.pitch,this.distance,free&&this.facingMap()?'map':free&&this.facingMachines()?nearest.id:null);
      this.position.textContent=nearest.label;
      this.status.textContent=this.facingMap()?'Plan au mur · clic, E ou A : lire les gares':this.pitch>10?'Plan au mur · décalez-vous pour suivre les lignes':nearest.kind==='charge'?'Carte IC nécessaire · aucune carte détenue':'Cliquer la borne ou E / A : utiliser · glisser pour regarder autour';
      this.overlay.dataset.machine=nearest.id;this.overlay.dataset.x=this.x.toFixed(1);this.overlay.dataset.pitch=this.pitch.toFixed(1);this.overlay.dataset.yaw=this.yaw.toFixed(1);
      this.overlay.dataset.mapDetail=String(this.pitch>10&&this.distance<=700);
    }
    if(!this.disposed)this.frame=requestAnimationFrame(this.tick);
  };
}
