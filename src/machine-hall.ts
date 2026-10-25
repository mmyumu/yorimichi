import { fareMapHeight, fareMapWidth, renderTokyoFareMap } from './tokyo-fares';
import { HallScene } from './hall-scene';
import { leftInTray, trayKey } from './ticket-machine';
import { machineKinds, stations, type Hub, type Service } from './network';
import type { Figure } from './people';

type DeviceKind=Service|'charge';
interface Device {id:string;kind:DeviceKind;x:number;label:string}
const names:Record<DeviceKind,[string,string]>={local:['tickets','きっぷ / Local tickets'],charge:['charge','チャージ専用 / IC charge'],shinkansen:['express','新幹線 / Shinkansen']};
/** The station's machine bank (machineKinds), 600 px apart along the wall. */
const bank=(hub:Hub):Device[]=>machineKinds(hub).map((kind,i)=>{const n=String(i+1).padStart(2,'0');return {id:`${names[kind][0]}-${n}`,kind,x:450+i*600,label:`${n} · ${names[kind][1]}`}});
// How close to and far from the machines the player can stand: near enough to read the payment faces, never so far that the hall's edges show.
const minDistance=250,maxDistance=1000,backOut=.6;
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
  // The machine whose screen opened the enlarged map, so closing it goes back to that screen.
  private mapFrom:Device|null=null;
  private mapZoom:((factor:number,clientX?:number,clientY?:number)=>void)|null=null;
  private x=1900;
  private targetX=1900;
  private yaw=0;
  private pitch=0;
  private distance=760;
  // Seconds spent still stepping back once as far back as the hall allows: past backOut, the player turns back to the concourse.
  private backing=0;
  private drag:{id:number;x:number;y:number;startX:number;startY:number;moved:boolean;device?:string}|null=null;
  // Starts with the buttons already held, so the A press that opened the hall does not also use a machine.
  private lastPadButtons:boolean[]=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];
  private previousFocus=document.activeElement as HTMLElement|null;
  // The machine the player stands at (index in devices), told to the concourse so its commuters leave it free.
  private standing=-1;
  private devices:Device[];
  constructor(private hub:Hub,initial:Service,private open:(service:Service,id:string)=>void,private exit:()=>void,private crowd?:{figures:()=>Figure[];standAt:(machine:number)=>void;busy:(machine:number)=>boolean;start?:number}){
    const devices=this.devices=bank(hub);
    if(initial==='shinkansen')this.x=this.targetX=3100;
    // Facing the machine the player walked up to on the map.
    if(crowd?.start!==undefined&&crowd.start>=0)this.x=this.targetX=devices[crowd.start].x+250;
    this.overlay.className='machine-hall';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','In front of the ticket machines');
    const header=this.el(this.overlay,'header','','hall-header');
    this.el(header,'div',`${stations[hub].ja} ${stations[hub].en.toUpperCase()} / きっぷうりば`,'hall-heading');
    this.button(header,'Back to the hall',()=>this.close(),'hall-exit');
    this.viewport.className='hall-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','Drag to look around. Left and right arrows to move sideways, up and down to step closer or back.');
    this.overlay.append(this.viewport);this.scene=new HallScene(this.viewport,hub,devices,crowd?.figures);
    const bottom=this.el(this.overlay,'div','','hall-bottom');bottom.append(this.position,this.status);
    this.el(this.overlay,'p','Drag or R / F: look around · Arrows / WASD: move · Wheel: distance · Click, E or A: use · Gamepad: sticks · B / Esc: back','hall-help');
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
  private nearest(){return this.devices.reduce((a,b)=>Math.abs(a.x+250-this.x)<Math.abs(b.x+250-this.x)?a:b)}
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
    // Someone is using it: wait for them to finish (the status line says so) or take another.
    if(this.crowd?.busy(this.devices.indexOf(device)))return;
    if(device.kind==='charge'){this.chargeNotice();return;}
    this.pause();this.open(device.kind,device.id);
  }
  private chargeNotice(){
    this.keys.clear();
    this.notice=this.el(this.overlay,'section','','charge-notice');this.notice.setAttribute('role','alertdialog');this.notice.setAttribute('aria-label','IC card charge');
    this.el(this.notice,'span','チャージ専用 / IC CARD CHARGE','charge-eyebrow');
    this.el(this.notice,'h2','カードを入れてください');this.el(this.notice,'p','Insert your IC card to charge it.');
    this.el(this.notice,'div','IC','charge-card-illustration');
    this.el(this.notice,'p','You have no IC card. This machine does not sell cards, so charging is unavailable.');
    this.button(this.notice,'Buy a card · coming later',()=>{}).disabled=true;
    this.button(this.notice,'Back to the machines',()=>this.closeNotice(),'charge-back').focus();
  }
  private closeNotice(){this.notice?.remove();this.notice=null;this.viewport.focus();}
  private openMapDetail(){
    if(this.mapDetail||this.hub!=='tokyo')return;
    this.keys.clear();
    const detail=this.el(this.overlay,'section','','hall-map-detail');
    detail.setAttribute('role','dialog');detail.setAttribute('aria-modal','true');detail.setAttribute('aria-label','Detailed JR map');
    this.mapDetail=detail;
    const toolbar=this.el(detail,'div','','hall-map-detail-toolbar');
    this.el(toolbar,'strong','東京駅から · JR線近距離きっぷ運賃表');
    this.el(toolbar,'span','Wheel, pinch or LT / RT: zoom · drag or sticks: move','hall-map-selected');
    const viewport=this.el(detail,'div','','hall-map-canvas');viewport.tabIndex=0;
    viewport.setAttribute('aria-label','JR map, drag horizontally and vertically');
    const diagram=renderTokyoFareMap();viewport.append(diagram);
    // Zooming out stops once the whole map fits; the point under the cursor (or the centre) stays in place.
    let zoom=1;
    const size=()=>{diagram.style.width=`${fareMapWidth*zoom}px`;diagram.style.height=`${fareMapHeight*zoom}px`};
    const changeZoom=(factor:number,clientX?:number,clientY?:number)=>{
      const view=viewport.getBoundingClientRect(),before=diagram.getBoundingClientRect();
      const x=clientX??view.left+view.width/2,y=clientY??view.top+view.height/2;
      const old=zoom;zoom=clamp(zoom*factor,Math.min(viewport.clientWidth/fareMapWidth,viewport.clientHeight/fareMapHeight),2.2);if(zoom===old)return;
      size();const after=diagram.getBoundingClientRect();
      viewport.scrollLeft+=after.left+(x-before.left)*zoom/old-x;viewport.scrollTop+=after.top+(y-before.top)*zoom/old-y;
    };
    this.mapZoom=changeZoom;
    viewport.addEventListener('wheel',event=>{event.preventDefault();changeZoom(Math.exp(-event.deltaY*(event.deltaMode===1?16:1)*.0015),event.clientX,event.clientY)},{passive:false});
    this.button(toolbar,'Close',()=>this.closeMapDetail());
    // One finger or the mouse drags the map; two fingers pinch to zoom around their midpoint and pan with it.
    const pointers=new Map<number,{x:number;y:number}>();let moved=false;
    const spread=()=>{const [a,b]=[...pointers.values()];return {d:Math.hypot(a.x-b.x,a.y-b.y),x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
    viewport.addEventListener('pointerdown',event=>{pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pointers.size===1)moved=false});
    viewport.addEventListener('pointermove',event=>{
      const last=pointers.get(event.pointerId);if(!last)return;
      const before=pointers.size===2?spread():null;
      if(!moved&&Math.hypot(event.clientX-last.x,event.clientY-last.y)>4){moved=true}
      if(!moved)return;
      if(!viewport.hasPointerCapture(event.pointerId))viewport.setPointerCapture(event.pointerId);
      if(!before){viewport.scrollLeft+=last.x-event.clientX;viewport.scrollTop+=last.y-event.clientY}
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(before){const after=spread();if(before.d>0)changeZoom(after.d/before.d,after.x,after.y);viewport.scrollLeft+=before.x-after.x;viewport.scrollTop+=before.y-after.y}
    });
    for(const type of ['pointerup','pointercancel'])viewport.addEventListener(type,event=>pointers.delete((event as PointerEvent).pointerId));
    size();
    requestAnimationFrame(()=>{viewport.scrollLeft=1185-viewport.clientWidth/2;viewport.scrollTop=610-viewport.clientHeight/2});
    toolbar.querySelector<HTMLButtonElement>('button:last-child')?.focus();
  }
  private closeMapDetail(){
    this.mapDetail?.remove();this.mapDetail=null;this.mapZoom=null;this.lookAtMachines();this.viewport.focus();
    const device=this.mapFrom;this.mapFrom=null;if(device&&device.kind!=='charge'){this.pause();this.open(device.kind,device.id);}
  }
  lookAtMap(){this.pitch=16;this.yaw=0;}
  private lookAtMachines(){this.pitch=-5;this.yaw=0;}
  pause(){this.paused=true;this.overlay.hidden=true;this.keys.clear();this.drag=null;}
  resume(map=false){if(this.disposed)return;this.paused=false;this.overlay.hidden=false;this.lastPadButtons=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];if(map){this.lookAtMap();this.viewport.focus();this.openMapDetail();if(this.mapDetail)this.mapFrom=this.nearest();}else{this.lookAtMachines();this.viewport.focus();}}
  destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.scene.dispose();window.removeEventListener('blur',this.blur);this.overlay.remove();this.previousFocus?.focus();}
  private close(){this.destroy();this.exit();}
  private blur=()=>{this.keys.clear();this.drag=null;};
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){
      const selector=this.mapDetail?'.hall-map-detail button:not(:disabled), .hall-map-canvas':this.notice?'.charge-notice button:not(:disabled)':'button:not(:disabled), .hall-viewport';
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
    const device=this.devices.find(d=>d.id===id);if(!device)return;
    if(this.nearest().id===id)this.focusDevice(device);else{this.targetX=device.x+250;this.yaw=0;this.pitch=-5}
  }
  private wheel=(event:WheelEvent)=>{event.preventDefault();if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))this.targetX=clamp(this.targetX+(event.deltaX||event.deltaY)*1.4,650,3250);else{if(event.deltaY>0&&this.distance>=maxDistance&&!this.notice&&!this.mapDetail&&!this.paused)this.backing+=Math.min(.2,event.deltaY/500);this.distance=clamp(this.distance+event.deltaY*.6,minDistance,maxDistance)}};
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
        // On the enlarged map, the triggers zoom (LT out, RT in) and either stick pans.
        if(this.mapDetail&&this.mapZoom){
          const zoomIn=(pad.buttons[7]?.value??0)-(pad.buttons[6]?.value??0);if(Math.abs(zoomIn)>.05)this.mapZoom(Math.exp(zoomIn*1.6*dt));
          const canvas=this.mapDetail.querySelector<HTMLElement>('.hall-map-canvas')!;
          canvas.scrollLeft+=(dead(pad.axes[0]??0)+dead(pad.axes[2]??0))*900*dt;canvas.scrollTop+=(dead(pad.axes[1]??0)+dead(pad.axes[3]??0))*900*dt;
        }
        if(!this.notice&&!this.mapDetail){if(pressed[14])strafe-=1;if(pressed[15])strafe+=1;if(pressed[12])vertical+=1;if(pressed[13])vertical-=1}
        this.lastPadButtons=pressed;
      }
      if(!this.notice&&!this.mapDetail){this.targetX=clamp(this.targetX+strafe*1200*dt,650,3250);this.distance=clamp(this.distance-vertical*1000*dt,minDistance,maxDistance);this.pitch=clamp(this.pitch+((this.keys.has('lookUp')?1:0)-(this.keys.has('lookDown')?1:0))*55*dt,-20,30)}
      this.x+=(this.targetX-this.x)*Math.min(1,dt*14);
      // Keeping on stepping back from the farthest spot leaves the machines, like the Back button; letting go slowly forgets it.
      this.backing=vertical<0&&this.distance>=maxDistance&&!this.notice&&!this.mapDetail?this.backing+dt:Math.max(0,this.backing-dt*.5);
      if(this.backing>=backOut){this.close();return;}
      // The camera rotates; translation remains the player's body position along the wall.
      const nearest=this.nearest();
      if(this.devices.indexOf(nearest)!==this.standing){this.standing=this.devices.indexOf(nearest);this.crowd?.standAt(this.standing)}
      const free=!this.notice&&!this.mapDetail;
      this.scene.render(this.x,this.yaw,this.pitch,this.distance,free&&this.facingMap()?'map':free&&this.facingMachines()?nearest.id:null);
      this.position.textContent=nearest.label;
      this.status.textContent=this.distance>=maxDistance&&this.backing>0?'Keep stepping back to return to the hall':this.crowd?.busy(this.devices.indexOf(nearest))&&!this.facingMap()&&this.pitch<=10?'Someone is using this machine · wait for them or take another':this.facingMap()?'Wall map · click, E or A: read the stations':this.pitch>10?'Wall map · move sideways to follow the lines':nearest.kind==='charge'?'IC card needed · you have none':leftInTray(trayKey(this.hub,nearest.id))?'Something was left in the outlets · E / A: use the machine':'Click the machine or E / A: use · drag to look around';
      this.overlay.dataset.machine=nearest.id;this.overlay.dataset.x=this.x.toFixed(1);this.overlay.dataset.pitch=this.pitch.toFixed(1);this.overlay.dataset.yaw=this.yaw.toFixed(1);
      this.overlay.dataset.mapDetail=String(this.pitch>10&&this.distance<=700);
    }
    if(!this.disposed)this.frame=requestAnimationFrame(this.tick);
  };
}
