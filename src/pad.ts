/** The gamepad as every view reads it, with the right mouse button standing in for B: a right click does whatever B does where the player is.
 * Without a pad, a stand-in pad (`id` 'mouse') shows up from the right press until a moment after its release, so each poller sees B go down, then up. */
let down=false,pressedAt=-1e9,releasedAt=-1e9;
const stop=(event:MouseEvent)=>{if(event.button!==2)return;event.preventDefault();event.stopImmediatePropagation();return true};
// Captured on the window before anything else: the scene and the overlays never see the right button (it never walks, clicks or drags).
for(const type of ['pointerdown','mousedown'] as const)window.addEventListener(type,event=>{if(stop(event)&&!down){down=true;pressedAt=performance.now()}},true);
for(const type of ['pointerup','mouseup'] as const)window.addEventListener(type,event=>{if(stop(event)&&down){down=false;releasedAt=performance.now()}},true);
window.addEventListener('blur',()=>{if(down){down=false;releasedAt=performance.now()}});
const button=(pressed:boolean)=>({pressed,touched:pressed,value:pressed?1:0}) as GamepadButton;
/** The connected pad, or the mouse's stand-in while its right button is in play. B is held while the button is, and for at least 100 ms, so that a quick click is seen. */
export function connectedPad():Gamepad|undefined{
  const real=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)??undefined,now=performance.now(),held=down||now-pressedAt<100;
  if(!held&&now-Math.max(pressedAt,releasedAt)>400)return real;
  if(real)return {id:real.id,index:real.index,connected:true,mapping:real.mapping,timestamp:real.timestamp,axes:real.axes,buttons:real.buttons.map((b,i)=>i===1&&held?button(true):b)} as unknown as Gamepad;
  return {id:'mouse',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},(_,i)=>button(i===1&&held))} as unknown as Gamepad;
}
