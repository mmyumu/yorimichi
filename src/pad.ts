/** The gamepad as every view reads it, with the right mouse button standing in for B: a right click does whatever B does where the player is.
 * On a touch screen, so do the round B key in the bottom right corner (`touch-b`) and the system's back gesture or button (`popstate`).
 * Without a pad, a stand-in pad (`id` 'mouse') shows up from the right press until a moment after its release, so each poller sees B go down, then up. */
let down=false,pressedAt=-1e9,releasedAt=-1e9;
const press=()=>{if(!down){down=true;pressedAt=performance.now()}},release=()=>{if(down){down=false;releasedAt=performance.now()}};
const stop=(event:MouseEvent)=>{if(event.button!==2)return;event.preventDefault();event.stopImmediatePropagation();return true};
// Captured on the window before anything else: the scene and the overlays never see the right button (it never walks, clicks or drags).
for(const type of ['pointerdown','mousedown'] as const)window.addEventListener(type,event=>{if(stop(event))press()},true);
for(const type of ['pointerup','mouseup'] as const)window.addEventListener(type,event=>{if(stop(event))release()},true);
window.addEventListener('blur',release);
if(matchMedia('(pointer: coarse)').matches){
  // The B key: a 15×15 pixel-art button over every view, its press held as long as the finger stays on it, never reaching what lies under it.
  const key=document.createElement('canvas');key.className='touch-b';key.width=key.height=15;key.setAttribute('role','button');key.setAttribute('aria-label','Back');
  const glyph=['1110','1001','1110','1001','1110'],paint=(lit:boolean)=>{
    const g=key.getContext('2d')!;g.clearRect(0,0,15,15);
    for(let y=0;y<15;y++)for(let x=0;x<15;x++){const d=Math.hypot(x-7,y-7);if(d>7.4)continue;g.fillStyle=d>6.4?'#0b1614':lit?'#7c2a20':y<6&&d>5.2?'#e07a62':'#b8432f';g.fillRect(x,y,1,1)}
    const o=lit?1:0;glyph.forEach((row,y)=>[...row].forEach((on,x)=>{if(on!=='1')return;if(!lit){g.fillStyle='#5b1f1a';g.fillRect(6+x,6+y,1,1)}g.fillStyle='#f6e3c4';g.fillRect(5+x,5+y+o,1,1)}));
  };
  paint(false);
  key.addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();key.setPointerCapture(event.pointerId);press();paint(true)});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(type,event=>{event.stopPropagation();release();paint(false)});
  for(const type of ['click','contextmenu','touchstart'])key.addEventListener(type,event=>{event.preventDefault();event.stopPropagation()},{passive:false});
  document.body.append(key);
  // The system's back: a spare history entry (`yorimichi`) taken by each back and pressed as B. Browsers skip entries added without a gesture,
  // so it is laid again at the next touch or key rather than at once: two backs in a row with nothing between leave the page.
  let armed=history.state?.yorimichi===true;
  const arm=()=>{if(!armed){history.pushState({yorimichi:true},'');armed=true}};
  // A touch counts as a gesture on its release (pointerup), not its press.
  for(const type of ['pointerup','keydown'] as const)window.addEventListener(type,arm,true);
  window.addEventListener('popstate',()=>{armed=history.state?.yorimichi===true;if(!armed){press();release()}});
  // Full screen in the browser, landscape locked, from the first touch on (installed from the manifest, the page is full screen already).
  // The system's back then leaves full screen instead of going back: that is pressed as B too, and the next touch goes full screen again.
  const root=document.documentElement,installed=matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches;
  if(!installed&&root.requestFullscreen){
    const enter=()=>{if(!document.fullscreenElement)root.requestFullscreen({navigationUI:'hide'}).then(()=>(screen.orientation as ScreenOrientation&{lock?:(o:string)=>Promise<void>}).lock?.('landscape').catch(()=>{})).catch(()=>{})};
    for(const type of ['pointerup','keydown'] as const)window.addEventListener(type,enter,true);
    document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.visibilityState==='visible'){press();release()}});
  }
}
const button=(pressed:boolean)=>({pressed,touched:pressed,value:pressed?1:0}) as GamepadButton;
/** The connected pad, or the stand-in while B is in play (right button, touch key, back gesture). B is held while the button is, and for at least 100 ms, so that a quick press is seen. */
export function connectedPad():Gamepad|undefined{
  const real=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)??undefined,now=performance.now(),held=down||now-pressedAt<100;
  if(!held&&now-Math.max(pressedAt,releasedAt)>400)return real;
  if(real)return {id:real.id,index:real.index,connected:true,mapping:real.mapping,timestamp:real.timestamp,axes:real.axes,buttons:real.buttons.map((b,i)=>i===1&&held?button(true):b)} as unknown as Gamepad;
  return {id:'mouse',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>button(i===1&&held))} as unknown as Gamepad;
}
