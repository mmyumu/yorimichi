/** Debug (G, in dev or with `?debug`): a list of every place the game can show, filtered as one types; Enter or a click goes there at once. */
export interface Destination {label:string;search:string;go:()=>void}
export const debugAllowed=import.meta.env.DEV||new URLSearchParams(location.search).has('debug');

/** Opens the list over the game; `close` runs however it is left (Esc, a destination taken). */
export function openTeleport(all:Destination[],close:()=>void){
  const root=document.createElement('div'),input=document.createElement('input'),list=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(10,16,20,.72);display:flex;justify-content:center;align-items:flex-start;padding:5vh 16px;font:14px monospace;color:#e8e2d0';
  const panel=document.createElement('div');panel.style.cssText='width:min(640px,100%);max-height:88vh;display:flex;flex-direction:column;background:#1d2a2c;border:2px solid #8fb3a8;box-shadow:0 0 0 4px #10181a';
  const head=document.createElement('div');head.textContent='DEBUG · Teleport (type to filter, ↑ ↓, Enter, Esc)';head.style.cssText='padding:8px 10px;background:#2c4040;color:#f2d98a';
  input.placeholder='tokyo platform, kinkaku, home…';input.style.cssText='margin:8px;padding:8px;font:inherit;background:#0f1719;color:inherit;border:1px solid #4d6a66;outline:none';
  list.style.cssText='overflow-y:auto;padding:0 8px 8px';
  panel.append(head,input,list);root.append(panel);document.body.append(root);
  let shown:Destination[]=[],focus=0;
  const done=(then?:()=>void)=>{root.remove();close();then?.()};
  const paint=()=>{
    const words=input.value.toLowerCase().split(/\s+/).filter(Boolean);
    shown=all.filter(d=>words.every(w=>d.search.includes(w))).slice(0,150);focus=Math.min(focus,Math.max(0,shown.length-1));
    list.replaceChildren(...shown.map((d,i)=>{const row=document.createElement('div');row.textContent=d.label;row.style.cssText=`padding:4px 8px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${i===focus?'background:#4d6a66;color:#fff':''}`;row.onmousemove=()=>{if(focus!==i){focus=i;paint()}};row.onclick=()=>done(d.go);return row}));
    list.children[focus]?.scrollIntoView({block:'nearest'});
  };
  input.oninput=()=>{focus=0;paint()};
  root.addEventListener('keydown',event=>{event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();done()}
    else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();focus=(focus+(event.key==='ArrowDown'?1:-1)+shown.length)%Math.max(1,shown.length);paint()}
    else if(event.key==='Enter'&&shown[focus]){event.preventDefault();done(shown[focus].go)}});
  root.addEventListener('keyup',event=>event.stopPropagation());
  root.onclick=event=>{if(event.target===root)done()};
  paint();input.focus();
}
