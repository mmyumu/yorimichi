import { unlock } from './access';
import { box } from './hall-scene';
import { wrap, write } from './konbini-till';
import { loadLook, paintTraveller, parts, saveLook, unused, type Look } from './look';
import { connectedPad } from './pad';
import { eraseAll, hasSave } from './save';
import { crispText, fitPicture } from './ticket-gate';

// The title screen, one 320 × 200 picture scaled up whole: Fuji at dusk over a town, a train crossing the viaduct. Over it, in turn, the journal check (a code from the printed travel journal, as old games asked for a word from their manual),
// the main menu (continue, new journey) and, for a new journey, the traveller's looks (look.ts), painted as they will walk.
const W=320,H=200,ink='#3a2a20',paper='#efe3c2',edge='#5a3f2c',red='#c0463a';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const journalReferences=[
  {page:1,memory:'Tokyo Station'},
  {page:8,memory:'the Senso-ji lantern'},
  {page:17,memory:'Kinkaku-ji'},
  {page:31,memory:'Shinkyo bridge'},
  {page:42,memory:'Higashi-Nakano'},
];
type Rect=[number,number,number,number];
/** What can be pointed at or chosen: `row` for the arrows and stick, `left`/`right` where it has a value to turn (its arrows drawn at `arrows`). */
interface Item {rect:Rect;row:number;act?:()=>void;left?:()=>void;right?:()=>void;arrows?:[Rect,Rect]}
type Phase='code'|'menu'|'confirm'|'look';
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;

/** Dusk over a town under Fuji, drawn once: the sky banded through the dither, stars, the mountain, a pagoda among the roofs, the viaduct, the river and the roofs in front with their lanterns. */
function backdrop(){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,r=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
  let seed=11;const rand=()=>(seed=seed*16807%2147483647)/2147483647;
  const sky=['#171a3c','#23264f','#3a3466','#5e4373','#8f5578','#c66e72','#ea9468','#f6c27c'];
  for(let y=0;y<140;y++)for(let x=0;x<W;x++){const v=Math.pow(y/140,1.3)*(sky.length-1),i=Math.floor(v);r(x,y,1,1,sky[Math.min(sky.length-1,i+(v-i>(bayer[(y&3)*4+(x&3)]+.5)/16?1:0))])}
  for(let k=0;k<60;k++){const y=Math.floor(rand()*rand()*70);r(Math.floor(rand()*W),y,1,1,k%6?'#9aa0d0':'#fffef2')}
  // The moon, a thin crescent.
  for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++)if(x*x+y*y<38&&(x+3)**2+(y-1)**2>=30)r(44+x,22+y,1,1,'#f4efd2');
  // Fuji, its west face lit by the sunset, the snow down its gullies.
  const peak=236,top=(x:number)=>58+Math.abs(x-peak)*.5+((x-peak)/38)**2*5;
  for(let x=120;x<W;x++){const t=Math.round(top(x));for(let y=t;y<140;y++){const lit=x-peak<(y-58)*-.12+bayer[(y&3)*4+(x&3)]/8,snow=y<58+15+Math.sin(x*.9)*2+Math.sin(x*.31)*3&&y-t<18;r(x,y,1,1,snow?lit?'#f0dfe6':'#b4abd2':lit?'#6c5684':'#4a4272')}}
  // Far hills, then the town's blocks with their windows lit.
  for(let x=0;x<W;x++){const t=Math.round(118+Math.sin(x*.03)*5+Math.sin(x*.11+1)*2);r(x,t,1,140-t,'#3a3462')}
  for(let x=0;x<W;){const w=6+Math.floor(rand()*10),h=6+Math.floor(rand()*rand()*22);r(x,138-h,w,h,'#262548');for(let y=140-h;y<136;y+=3)for(let k=x+1;k<x+w-1;k+=2)if(rand()<.3)r(k,y,1,1,rand()<.8?'#ffd98a':'#fff6d0');x+=w+Math.floor(rand()*2)}
  // A five-storey pagoda over the roofs.
  r(72,72,1,10,'#1a1932');for(let i=0;i<5;i++){const w=26-i*4,y=128-i*11;r(73-w/2+2,y-6,w-4,7,'#1f1d3a');r(73-w/2,y-8,w,2,'#151429');r(73-w/2-1,y-7,1,1,'#151429');r(73+w/2,y-7,1,1,'#151429');if(i<4)r(72,y-5,2,2,'#ffcf7a')}
  r(56,128,34,10,'#1f1d3a');
  // The viaduct the trains run along, its piers into the river.
  r(0,140,W,4,'#2b2843');r(0,139,W,1,'#5a5078');r(0,144,W,1,'#1b1930');for(let x=6;x<W;x+=32){r(x,145,5,16,'#221f38');r(x+5,145,1,16,'#36304e')}
  // The river, the sky's colours broken into streaks, the lights' reflections.
  for(let y=145;y<170;y++){const v=(y-145)/25;r(0,y,W,1,v<.4?'#4b3a68':v<.75?'#3a3060':'#2c2852')}
  for(let k=0;k<120;k++){const y=146+Math.floor(rand()*24),x=Math.floor(rand()*W),w=3+Math.floor(rand()*12);r(x,y,w,1,k%4?'#6a4e78':k%8?'#c66e72':'#f6c27c')}
  for(let k=0;k<26;k++){const x=Math.floor(rand()*W);for(let y=148;y<168;y+=2)if(rand()<.6)r(x,y,1,1,'#ffd98a')}
  // The roofs in front, tiles on a dark street, a string of lanterns across.
  r(0,170,W,30,'#14132a');
  for(let x=-10;x<W;){const w=34+Math.floor(rand()*24),y=172+Math.floor(rand()*8);for(let k=0;k<6;k++)r(x+k,y+5-k,w-k*2,1,'#1c1a34');r(x+5,y,w-10,1,'#3a3658');for(let k=x+6;k<x+w-6;k+=3)r(k,y+2,1,4,'#100f22');r(x+4,y+6,w-8,H-y-6,'#191830');if(rand()<.7)r(x+8+Math.floor(rand()*(w-20)),y+12,6,5,'#e8b060');x+=w-4}
  for(let x=0;x<W;x++){const y=Math.round(176+Math.sin(x/W*Math.PI*3)*3);r(x,y,1,1,'#0c0b18')}
  for(let x=10;x<W;x+=22){const y=Math.round(176+Math.sin(x/W*Math.PI*3)*3)+1;r(x-2,y+1,5,6,'#d6402e');r(x-1,y,3,1,'#2a1a1a');r(x-1,y+7,3,1,'#2a1a1a');r(x-1,y+2,1,3,'#ff9a6a')}
  return c;
}
/** A commuter train of five cars, nose left. */
function train(){
  const cars=5,cw=38,c=document.createElement('canvas');c.width=cars*cw;c.height=12;const g=c.getContext('2d')!,r=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
  for(let k=0;k<cars;k++){const x=k*cw,nose=k===0;r(x+(nose?3:0),0,cw-2-(nose?3:0),1,'#8e959c');r(x+(nose?1:0),1,cw-2-(nose?1:0),9,'#c9ced3');r(x,3,cw-2,4,'#c9ced3');r(x+(nose?4:2),3,cw-(nose?8:6),3,'#2e3a4c');for(let w=x+(nose?6:4);w<x+cw-6;w+=6)r(w,3,4,2,'#ffe2a0');r(x,7,cw-2,1,'#3f9a5a');r(x,10,cw-2,1,'#3a3c44');r(x+4,11,4,1,'#222');r(x+cw-10,11,4,1,'#222');if(nose){r(0,3,2,4,'#2e3a4c');r(1,8,2,1,'#fff6c0')}}
  return c;
}

/** The title screen, over everything until the traveller sets off: `start` runs then. */
export function showTitle(start:()=>void){
  const overlay=document.createElement('div');overlay.className='title-screen';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Yorimichi');
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  // The code is typed into a real field laid invisibly over the picture's box: the phone's keyboard comes up for it, and pasting works.
  const field=document.createElement('input');field.type='password';field.autocomplete='off';field.setAttribute('autocapitalize','off');field.spellcheck=false;field.maxLength=32;field.setAttribute('aria-label','Code from your travel journal');
  overlay.append(canvas,field);document.body.append(overlay);
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
  const scene=backdrop(),cars=train(),sprite=document.createElement('canvas');sprite.width=20;sprite.height=28;
  const reference=journalReferences[Math.floor(Math.random()*journalReferences.length)];
  const codeBox:Rect=[58,130,140,15],okBox:Rect=[204,130,58,15];
  let phase:Phase='code',focus=0,hover=-1,status='',error=false,checking=false,shake=0,items:Item[]=[],frame=0,over=false,ready=false,turned=0,spin=true;
  const look:Look=loadLook();
  const fit=()=>{fitPicture(canvas,overlay,W,H);const scale=canvas.clientWidth/W,[x,y,w,h]=codeBox;Object.assign(field.style,{left:canvas.offsetLeft+x*scale+'px',top:canvas.offsetTop+y*scale+'px',width:w*scale+'px',height:h*scale+'px'})};
  const watcher=new ResizeObserver(fit);watcher.observe(overlay);fit();
  const go=(next:Phase,at=0)=>{phase=next;focus=at;hover=-1;field.hidden=next!=='code';if(next==='code')field.focus();else overlay.focus()};

  // Lettering: the big title in DotGothic16 at twice its grid, outlined; the rest in PixelMplus10 (`write`).
  const outlined=(text:string,x:number,y:number,font:string,color:string,shadow:string)=>{g.font=font;const w=Math.round(g.measureText(text).width),left=Math.round(x-w/2);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1],[2,2]])crispText(g,text,left+dx,y+dy,shadow);crispText(g,text,left,y,color)};
  const spaced=(text:string,x:number,y:number,color:string,gap=3)=>{g.font='10px "Yorimichi Bitmap"';const widths=[...text].map(c=>g.measureText(c).width),total=widths.reduce((a,b)=>a+b,0)+gap*(text.length-1);let left=Math.round(x-total/2);[...text].forEach((c,i)=>{crispText(g,c,left,y,color);left+=widths[i]+gap})};
  const panel=([x,y,w,h]:Rect)=>{box(g,x+3,y+3,w,h,'#0b0a1688');box(g,x,y,w,h,paper,edge);box(g,x+2,y+2,w-4,h-4,paper,'#d6c49a')};
  const triangle=(x:number,y:number,dir:1|-1,color:string)=>{g.fillStyle=color;for(let k=0;k<4;k++)g.fillRect(dir>0?x+k:x+3-k,y+k,1,7-k*2)};
  /** A button: pale, or stamped red when chosen. */
  const button=(rect:Rect,label:string,chosen:boolean)=>{const [x,y,w,h]=rect;box(g,x,y+1,w,h,'#7a5a40');box(g,x,y,w,h,chosen?red:'#f8f0da',chosen?'#7a2a22':edge);write(g,label,x+w/2,y+Math.round((h-10)/2),chosen?'#fff6e0':ink,'center')};
  const chosen=(i:number)=>i===focus;

  const titles=(y:number)=>{outlined('寄り道',W/2,y,'32px "Yorimichi Pixel"','#f6dfa0','#1b1530');spaced('YORIMICHI',W/2,y+36,'#f0d0a8');};
  const drawCode=()=>{
    titles(14);
    panel([34,78,252,88]);
    write(g,'旅の日記 · JOURNAL CHECK',W/2,84,red,'center');box(g,46,96,228,1,'#d6c49a');
    wrap(g,`Open your travel journal to page ${reference.page}. What code is written beside ${reference.memory}?`,220).forEach((line,i)=>write(g,line,W/2,101+i*12,ink,'center'));
    const [x,y,w,h]=codeBox,dx=shake>0?Math.round(Math.sin(shake/14)*2):0,typed=field.value.length;
    box(g,x+dx,y,w,h,'#fbf6e6',document.activeElement===field?red:edge);
    for(let k=0;k<Math.min(typed,22);k++){box(g,x+dx+5+k*6,y+6,3,3,ink)}
    if(document.activeElement===field&&Math.floor(performance.now()/500)%2)box(g,x+dx+5+Math.min(typed,22)*6,y+3,1,9,ink);
    if(!typed&&document.activeElement!==field)write(g,'tap to write the code',x+w/2,y+2,'#a8957a','center');
    items=[{rect:okBox,row:0,act:submit}];button(okBox,checking?'…':'OK',hover===0||!!field.value&&!checking);
    if(status)write(g,status,W/2,150,error?red:'#6a5a48','center');
  };
  const drawMenu=()=>{
    titles(30);
    const save=hasSave(),list:[string,()=>void][]=[...save?[['つづきから · CONTINUE',finish] as [string,()=>void]]:[],['はじめから · NEW JOURNEY',()=>save?go('confirm',0):go('look',parts.length+3)]];
    panel([84,96,152,list.length*22+14]);
    items=list.map(([label,act],i)=>({rect:[96,104+i*22,128,16] as Rect,row:i,act}));
    items.forEach((item,i)=>{const [x,y,w]=item.rect;if(chosen(i))triangle(x-8,y+5,1,red);write(g,list[i][0],x+w/2,y+3,chosen(i)?red:ink,'center');if(chosen(i))box(g,x+10,y+14,w-20,1,red)});
    box(g,0,H-17,W,17,'#0b0a16c0');write(g,'↑↓ choose · Enter or A',W/2,H-14,'#f0d0a8','center');
  };
  const drawConfirm=()=>{
    titles(14);panel([40,82,240,96]);
    write(g,'Start a new journey?',W/2,90,red,'center');
    wrap(g,'Your saved journey will be erased: where you are, tickets, money, groceries, memories and messages.',212).forEach((line,i)=>write(g,line,W/2,106+i*12,ink,'center'));
    items=[{rect:[58,154,96,16],row:0,act:()=>go('menu',0)},{rect:[166,154,96,16],row:0,act:()=>go('look',parts.length+3)}];
    button(items[0].rect,'Keep it',chosen(0));button(items[1].rect,'Erase & start',chosen(1));
  };
  const facing=(t:number)=>spin?(Math.floor(t/1600)+turned)%4:turned%4;
  const drawLook=(t:number)=>{
    panel([10,8,300,184]);
    write(g,'旅人 · YOUR TRAVELLER',W/2,14,red,'center');box(g,20,26,280,1,'#d6c49a');
    // The traveller, walking on the spot and turning round (unless the box under them is unticked), a quarter turn more for each click on them.
    const faces=['down','left','up','right'],face=faces[facing(t)],step=[0,1,0,2][Math.floor(t/160)%4];
    box(g,22,34,86,120,'#e2d3ac','#c8b48a');box(g,32,128,66,6,'#cdbb92');
    const s=sprite.getContext('2d')!;s.clearRect(0,0,20,28);paintTraveller(s,face,step,look);g.drawImage(sprite,0,0,20,28,35,44,60,84);

    items=parts.map((part,i)=>{const y=30+i*13,left:Rect=[178,y,10,13],right:Rect=[290,y,10,13],turn=(d:number)=>{look[part.key]=(look[part.key]+d+part.choices.length)%part.choices.length};return {rect:[116,y,186,13] as Rect,row:i,left:()=>turn(-1),right:()=>turn(1),arrows:[left,right] as [Rect,Rect]}});
    items.forEach((item,i)=>{
      // The jacket and trousers fade out under a costume, which brings its own.
      const part=parts[i],choice=part.choices[look[part.key]],[x,y,w,h]=item.rect,on=chosen(i),faint=unused(look,part.key),text=faint?'#b5a383':ink;
      if(on)box(g,x,y,w,h,'#e6d4a6');write(g,part.label,x+4,y+1,on?red:text);
      triangle(item.arrows![0][0]+3,y+3,-1,on?red:'#8a7558');triangle(item.arrows![1][0]+3,y+3,1,on?red:'#8a7558');
      const swatch=choice.colors[part.key==='jacket'?1:0];
      if(swatch)box(g,194,y+2,8,8,faint?'#d6c49a':swatch,text);write(g,choice.name,206,y+1,text);
    });
    // The box that stops the turning, on the buttons' line (← → reach it), before them.
    const row=parts.length,tick:Rect=[30,139,64,12];items.push({rect:tick,row,act:()=>{const now=facing(performance.now());spin=!spin;turned=spin?(now-Math.floor(performance.now()/1600)%4+4)%4:now}});
    if(chosen(items.length-1))box(g,tick[0]-2,tick[1]-1,tick[2]+4,tick[3]+2,'#d6c49a');box(g,31,141,8,8,'#fbf6e6',ink);if(spin){box(g,33,145,1,2,red);box(g,34,146,1,2,red);box(g,35,143,1,4,red);box(g,36,142,1,2,red)}write(g,'Turning',43,140,ink);
    const buttons:[string,()=>void][]=[['Random',()=>{for(const part of parts)look[part.key]=Math.floor(Math.random()*part.choices.length)}],['Back',()=>go('menu',0)],['Begin',begin]];
    buttons.forEach(([label,act],i)=>{const rect:Rect=[116+i*64,168,58,16];items.push({rect,row,act});button(rect,label,chosen(row+1+i))});
  };

  const draw=()=>{
    const t=performance.now();
    g.drawImage(scene,0,0);
    // A train every twelve seconds, along the viaduct.
    const run=(t%12000)/12000*(W+cars.width+400)-cars.width;g.drawImage(cars,Math.round(W-run),128);
    // The town's lights flicker now and then.
    for(let k=0;k<5;k++){const x=(k*67+Math.floor(t/900)*31)%W;g.fillStyle='#fff6d0';g.fillRect(x,130+(k*7)%6,1,1)}
    if(phase==='look')box(g,0,0,W,H,'#0b0a1655');
    if(ready){if(phase==='code')drawCode();else if(phase==='menu')drawMenu();else if(phase==='confirm')drawConfirm();else drawLook(t)}
    if(shake>0)shake=Math.max(0,shake-16);
    pad();frame=requestAnimationFrame(draw);
  };

  async function submit(){
    if(checking||!field.value)return;checking=true;error=false;status='Checking the code…';
    try{if(!await unlock(field.value)){status='That code is not in your journal.';error=true;shake=360;checking=false;field.focus();return}}
    catch(e){status=e instanceof Error?e.message:'Could not check the code.';error=true;checking=false;return}
    field.value='';checking=false;status='';go('menu',0);
  }
  function begin(){eraseAll();saveLook(look);finish()}
  function finish(){if(over)return;over=true;cancelAnimationFrame(frame);watcher.disconnect();document.removeEventListener('keydown',key,true);overlay.remove();start()}

  // Moving the choice: ↑ ↓ between rows (to the item of that row nearest the one chosen), ← → turn a value or move along a row.
  const move=(dy:number,dx:number)=>{
    if(!items.length)return;const now=items[focus]??items[0];
    if(dx){if(dx<0?now.left:now.right){(dx<0?now.left:now.right)!();return}const same=items.map((item,i)=>[item,i] as const).filter(([item])=>item.row===now.row),k=same.findIndex(([,i])=>i===focus);if(same[k+dx])focus=same[k+dx][1];return}
    const rows=[...new Set(items.map(item=>item.row))].sort((a,b)=>a-b),next=rows[rows.indexOf(now.row)+dy];if(next===undefined)return;
    const cx=now.rect[0]+now.rect[2]/2;focus=items.map((item,i)=>[item,i] as const).filter(([item])=>item.row===next).sort(([a],[b])=>Math.abs(a.rect[0]+a.rect[2]/2-cx)-Math.abs(b.rect[0]+b.rect[2]/2-cx))[0][1];
  };
  const back=()=>{if(phase==='look'||phase==='confirm')go('menu',0)};
  const choose=()=>{items[focus]?.act?.()};
  function key(event:KeyboardEvent){
    if(phase==='code'){if(event.key==='Enter'&&document.activeElement===field){event.preventDefault();submit()}return}
    const keys:Record<string,()=>void>={ArrowUp:()=>move(-1,0),ArrowDown:()=>move(1,0),ArrowLeft:()=>move(0,-1),ArrowRight:()=>move(0,1),KeyW:()=>move(-1,0),KeyS:()=>move(1,0),KeyA:()=>move(0,-1),KeyD:()=>move(0,1),Enter:choose,Space:choose,KeyE:choose,Escape:back,Backspace:back};
    const fn=keys[event.code]??keys[event.key];if(fn){event.preventDefault();event.stopPropagation();if(!event.repeat||event.code.startsWith('Arrow'))fn()}
  }
  document.addEventListener('keydown',key,true);
  field.addEventListener('input',()=>{status='';error=false});

  // The pad: D-pad or stick to choose, held to repeat; A to take, B to go back.
  let held:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[],repeatAt=0,lastDir='';
  function pad(){
    const p=connectedPad();if(!p)return;const now=performance.now(),pressed=p.buttons.map(b=>b.pressed),edge=(i:number)=>pressed[i]&&!held[i];
    const [ax,ay]=[p.axes[0]??0,p.axes[1]??0],dir=pressed[12]||ay<-.5?'up':pressed[13]||ay>.5?'down':pressed[14]||ax<-.5?'left':pressed[15]||ax>.5?'right':'';
    if(phase!=='code'){
      if(dir&&(dir!==lastDir||now>repeatAt)){repeatAt=now+(dir!==lastDir?380:140);({up:()=>move(-1,0),down:()=>move(1,0),left:()=>move(0,-1),right:()=>move(0,1)} as Record<string,()=>void>)[dir]()}
      if(edge(0))choose();if(edge(1))back();
    }else if(edge(0))submit();
    lastDir=dir;held=pressed;
  }

  // The pointer: hovering picks, a click takes (or turns a value by its arrows); a click on the traveller turns them.
  const at=(event:PointerEvent):[number,number]=>{const rect=canvas.getBoundingClientRect();return [(event.clientX-rect.left)/rect.width*W,(event.clientY-rect.top)/rect.height*H]};
  canvas.addEventListener('pointermove',event=>{const [x,y]=at(event),i=items.findIndex(item=>inside(item.rect,x,y));hover=i;if(i>=0&&phase!=='code')focus=i;canvas.style.cursor=i>=0||phase==='look'&&inside([22,34,86,102],x,y)?'pointer':'default'});
  canvas.addEventListener('pointerdown',event=>{
    const [x,y]=at(event);if(phase==='look'&&inside([22,34,86,102],x,y)){turned++;return}
    const i=items.findIndex(item=>inside(item.rect,x,y));if(i<0){if(phase==='code')field.focus();return}
    const item=items[i];focus=i;if(item.arrows){if(x>=item.arrows[0][0]-4&&x<item.arrows[0][0]+14)item.left!();else if(x>=item.arrows[0][0]+14)item.right!();return}
    event.preventDefault();item.act?.();
  });

  Promise.all([document.fonts.load('10px "Yorimichi Bitmap"'),document.fonts.load('32px "Yorimichi Pixel"')]).catch(()=>{}).finally(()=>{ready=true;fit();if(phase==='code')field.focus()});
  // The journal check guards the deployed game only: the dev server (`npm run dev`) opens on the menu, its album reading the plain photos (access.ts).
  go(import.meta.env.DEV?'menu':'code');
  draw();
}
