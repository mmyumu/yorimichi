/** Debug (T, or a click on the HUD's clock): the clock's day and time picked on a little panel, in place of typing them: a month's calendar (‹ › between months, ◀ ▶ a day back or on,
 * a click on a day), a clock face showing the time (a click on it sets the hour, in the half of the day shown), the hours and minutes stepped (▲ ▼), a few times of day at once.
 * Keys: ← → a day, ↑ ↓ an hour, Page Up / Down a month, Enter sets it, Esc leaves it as it was. Times are game ms, Japan time read through the UTC fields (clock.ts). */
const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],months=['January','February','March','April','May','June','July','August','September','October','November','December'];
const presets=[['Dawn',5*60],['Morning',9*60],['Noon',12*60],['Afternoon',15*60],['Dusk',18*60],['Night',21*60],['Last trains',23*60+50]] as const;
const dayMs=864e5;

/** Opens the panel over the game at `now`; `set(ms)` with the chosen time when it is confirmed; `close` however it is left. */
export function openClockPicker(now:number,set:(ms:number)=>void,close:()=>void){
  let day=Math.floor(now/dayMs),minute=Math.floor((now-day*dayMs)/60000),month=monthOf(day);
  const root=document.createElement('div');
  root.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(10,16,20,.72);display:flex;justify-content:center;align-items:center;padding:16px;font:14px monospace;color:#e8e2d0';
  const panel=document.createElement('div');panel.style.cssText='width:min(620px,100%);max-height:94vh;overflow:auto;background:#1d2a2c;border:2px solid #8fb3a8;box-shadow:0 0 0 4px #10181a';
  const head=document.createElement('div');head.textContent='DEBUG · Clock (← → day, ↑ ↓ hour, Enter, Esc)';head.style.cssText='padding:8px 10px;background:#2c4040;color:#f2d98a';
  const body=document.createElement('div');body.style.cssText='display:flex;flex-wrap:wrap;gap:16px;padding:12px;justify-content:center';
  const cal=document.createElement('div'),dial=document.createElement('div');cal.style.cssText='flex:1 1 250px;max-width:300px';dial.style.cssText='flex:1 1 200px;max-width:240px;display:flex;flex-direction:column;align-items:center;gap:8px';
  const foot=document.createElement('div');foot.style.cssText='display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:0 12px 12px';
  const summary=document.createElement('div');summary.style.cssText='flex:1;color:#f2d98a';
  const button=(text:string,act:()=>void,css='')=>{const b=document.createElement('button');b.textContent=text;b.style.cssText=`font:inherit;color:inherit;background:#2c4040;border:1px solid #4d6a66;padding:4px 8px;cursor:pointer;${css}`;b.onmouseenter=()=>b.style.background='#4d6a66';b.onmouseleave=()=>b.style.background='#2c4040';b.onclick=e=>{e.stopPropagation();act()};return b};
  const ok=button('Set',()=>done(true),'background:#3d6050;color:#fff;padding:6px 16px'),cancel=button('Cancel',()=>done(false),'padding:6px 12px');
  foot.append(summary,cancel,ok);body.append(cal,dial);panel.append(head,body,foot);root.append(panel);document.body.append(root);

  const shift=(days:number)=>{day+=days;month=monthOf(day);paint()};
  const hour=(by:number)=>{minute+=by;while(minute<0){minute+=1440;day--}while(minute>=1440){minute-=1440;day++}month=monthOf(day);paint()};
  const paint=()=>{
    // The calendar: the month and its arrows, the day with its own, the grid from Monday.
    const [y,m]=month,first=Date.UTC(y,m,1)/dayMs,length=new Date(Date.UTC(y,m+1,0)).getUTCDate(),lead=(new Date(first*dayMs).getUTCDay()+6)%7,today=Math.floor(now/dayMs);
    const bar=(left:HTMLElement,label:string,right:HTMLElement,css='')=>{const row=document.createElement('div');row.style.cssText=`display:flex;align-items:center;gap:6px;margin-bottom:8px;${css}`;const t=document.createElement('div');t.textContent=label;t.style.cssText='flex:1;text-align:center';row.append(left,t,right);return row};
    const date=new Date(day*dayMs);
    const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center';
    for(const w of weekdays){const c=document.createElement('div');c.textContent=w.slice(0,2);c.style.cssText=`color:${w==='Sun'?'#e88':w==='Sat'?'#8ae':'#8fb3a8'};font-size:12px;padding:2px 0`;grid.append(c)}
    for(let i=0;i<lead;i++)grid.append(document.createElement('div'));
    for(let d=1;d<=length;d++){
      const at=first+d-1,c=document.createElement('div'),wd=(lead+d-1)%7,picked=at===day;c.textContent=String(d);
      c.style.cssText=`padding:5px 0;cursor:pointer;border:1px solid ${at===today?'#f2d98a':'transparent'};${picked?'background:#8fb3a8;color:#10181a;font-weight:bold':`color:${wd===6?'#e88':wd===5?'#8ae':'inherit'}`}`;
      if(!picked){c.onmouseenter=()=>c.style.background='#2c4040';c.onmouseleave=()=>c.style.background=''}
      c.onclick=()=>{day=at;paint()};grid.append(c);
    }
    cal.replaceChildren(
      bar(button('‹',()=>{month=m?[y,m-1]:[y-1,11];paint()}),`${months[m]} ${y}`,button('›',()=>{month=m<11?[y,m+1]:[y+1,0];paint()})),
      bar(button('◀ day',()=>shift(-1)),`${weekdays[(date.getUTCDay()+6)%7]} ${date.getUTCDate()} ${months[date.getUTCMonth()].slice(0,3)}`,button('day ▶',()=>shift(1)),'color:#f2d98a'),
      grid,
      bar(button('Today',()=>{day=today;month=monthOf(day);paint()}),'',button('Tomorrow',()=>{day=today+1;month=monthOf(day);paint()}),'margin:8px 0 0'),
    );
    // The clock: the face, the time stepped, the times of day.
    const h=Math.floor(minute/60),mi=minute%60,pm=h>=12,light=h>=6&&h<18;
    const face=document.createElementNS('http://www.w3.org/2000/svg','svg');face.setAttribute('viewBox','-50 -50 100 100');face.style.cssText='width:170px;height:170px;cursor:pointer';
    const hand=(angle:number,length:number,width:number,colour:string)=>`<line x1="0" y1="0" x2="${Math.sin(angle)*length}" y2="${-Math.cos(angle)*length}" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`;
    face.innerHTML=`<circle r="47" fill="${light?'#f4ecd2':'#26324a'}" stroke="#8fb3a8" stroke-width="3"/>`
      +Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2,n=(i||12)+(pm?12:0);return `<text x="${Math.sin(a)*36}" y="${-Math.cos(a)*36+3.5}" text-anchor="middle" font-size="${i%3?8:10}" font-family="monospace" fill="${light?'#3a4a48':'#c8d4e8'}">${n===24?0:n}</text>`}).join('')
      +`<text y="18" text-anchor="middle" font-size="9" font-family="monospace" fill="${light?'#c08020':'#f2d98a'}">${light?'☀':'☾'}</text>`
      +hand((h%12+mi/60)/12*Math.PI*2,22,4,light?'#2c4040':'#e8e2d0')+hand(mi/60*Math.PI*2,33,2.5,light?'#4d6a66':'#8fb3a8')+`<circle r="3" fill="#c84040"/>`;
    face.onclick=e=>{const r=face.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;let n=Math.round(Math.atan2(x,-y)/(Math.PI*2)*12+12)%12;minute=(n+(pm?12:0))*60+mi;paint()};
    const stepper=(value:string,up:()=>void,down:()=>void)=>{const col=document.createElement('div');col.style.cssText='display:flex;flex-direction:column;align-items:center;gap:2px';const v=document.createElement('div');v.textContent=value;v.style.cssText='font-size:28px;color:#f2d98a';col.append(button('▲',up,'padding:0 14px'),v,button('▼',down,'padding:0 14px'));return col};
    const digits=document.createElement('div');digits.style.cssText='display:flex;align-items:center;gap:6px';
    const colon=document.createElement('div');colon.textContent=':';colon.style.cssText='font-size:28px;color:#f2d98a';
    digits.append(stepper(String(h).padStart(2,'0'),()=>hour(60),()=>hour(-60)),colon,stepper(String(mi).padStart(2,'0'),()=>hour(15-mi%15),()=>hour(-(mi%15||15))),button(pm?'PM':'AM',()=>hour(pm?-720:720),'margin-left:6px'));
    const chips=document.createElement('div');chips.style.cssText='display:flex;flex-wrap:wrap;gap:4px;justify-content:center';
    for(const [name,at] of presets)chips.append(button(`${name} ${Math.floor(at/60)}:${String(at%60).padStart(2,'0')}`,()=>{minute=at;paint()},'font-size:11px;padding:2px 6px'));
    dial.replaceChildren(face,digits,chips);
    summary.textContent=`→ ${weekdays[(date.getUTCDay()+6)%7]} ${date.getUTCDate()} ${months[date.getUTCMonth()].slice(0,3)} ${date.getUTCFullYear()}, ${h}:${String(mi).padStart(2,'0')}`;
  };
  const done=(apply:boolean)=>{root.remove();if(apply)set(day*dayMs+minute*60000);close()};
  root.tabIndex=-1;
  root.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();
    if(event.key==='Escape')done(false);else if(event.key==='Enter')done(true);
    else if(event.key==='ArrowLeft'||event.key==='ArrowRight')shift(event.key==='ArrowLeft'?-1:1);
    else if(event.key==='ArrowUp'||event.key==='ArrowDown')hour(event.key==='ArrowUp'?60:-60);
    else if(event.key==='PageUp'||event.key==='PageDown'){const [y,m]=month,d=new Date(day*dayMs).getUTCDate(),to=event.key==='PageUp'?m-1:m+1;day=Math.min(Date.UTC(y,to,d),Date.UTC(y,to+1,0))/dayMs;month=monthOf(day);paint()}});
  root.addEventListener('keyup',event=>event.stopPropagation());
  root.onclick=event=>{if(event.target===root)done(false)};
  paint();root.focus();
}
const monthOf=(day:number):[number,number]=>{const d=new Date(day*dayMs);return [d.getUTCFullYear(),d.getUTCMonth()]};
