import { box } from './hall-scene';
import { wrap, write } from './konbini-till';
import { loadLook, paintTraveller } from './look';
import { connectedPad } from './pad';
import { crispText, fitPicture } from './ticket-gate';

// The in-game menu, drawn as the title screen is (title.ts): one 480 × 320 picture over the paused scene, its own size, the scene showing through a dithered dusk veil.
// A string of lanterns sways across the top; on the left the journal's page of choices, on the right a travel card: the traveller walking on the spot, the day and time, where they stand, purse and memories, stamped with the 寄り道 seal.
const W=480,H=320,ink='#3a2a20',paper='#efe3c2',edge='#5a3f2c',rule='#d6c49a',red='#c0463a',faint='#8a7558';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
type Rect=[number,number,number,number];
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;
/** What the card shows, read when the menu opens (the clock is held meanwhile). */
export interface PauseFacts {where:[string,string];day:string;time:string;yen:number;memories:[number,number]}
export interface PauseActions {resume:()=>void;journal:()=>void;stamps:()=>void;title:()=>void}

/** The veil, drawn once and stretched over the whole game canvas (the picture itself keeps whole-pixel scaling): the scene darkened, a dusk blue dithered over it, deeper towards the foot. */
function veil(){
  const c=document.createElement('canvas');c.width=W;c.height=H;c.className='veil';const g=c.getContext('2d')!;
  g.fillStyle='#0b0a1680';g.fillRect(0,0,W,H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(bayer[(y&3)*4+(x&3)]<4+Math.floor(y/H*5)){g.fillStyle=y<H*.5?'#23264f':'#171a3c';g.fillRect(x,y,1,1)}
  return c;
}

/** Opens the menu; `resume` and the others are called once it has gone. */
export function openPauseMenu(facts:PauseFacts,actions:PauseActions){
  const overlay=document.createElement('div');overlay.className='pause-screen';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Menu');
  const stage=document.createElement('div'),canvas=document.createElement('canvas'),shade=veil();canvas.width=W;canvas.height=H;stage.append(shade,canvas);overlay.append(stage);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
  const sprite=document.createElement('canvas');sprite.width=20;sprite.height=28;const look=loadLook();
  // Laid over the game's own canvas (same proportions), so that the veil covers the scene and nothing else.
  const fit=()=>{const game=document.querySelector<HTMLCanvasElement>('#game canvas')?.getBoundingClientRect();Object.assign(stage.style,game?{left:game.left+'px',top:game.top+'px',width:game.width+'px',height:game.height+'px'}:{left:'0',top:'0',width:'100%',height:'100%'});fitPicture(canvas,stage,W,H)},watcher=new ResizeObserver(fit);watcher.observe(overlay);fit();
  let focus=0,frame=0,over=false,opened=performance.now(),items:{rect:Rect;act:()=>void}[]=[];

  const outlined=(text:string,x:number,y:number,font:string,color:string,shadow:string)=>{g.font=font;const w=Math.round(g.measureText(text).width),left=Math.round(x-w/2);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1],[2,2]])crispText(g,text,left+dx,y+dy,shadow);crispText(g,text,left,y,color)};
  const spaced=(text:string,x:number,y:number,color:string,gap=3)=>{g.font='10px "Yorimichi Bitmap"';const widths=[...text].map(c=>g.measureText(c).width),total=widths.reduce((a,b)=>a+b,0)+gap*(text.length-1);let left=Math.round(x-total/2);[...text].forEach((c,i)=>{crispText(g,c,left,y,color);left+=widths[i]+gap})};
  const big=(text:string,x:number,y:number,color:string)=>{g.font='20px "Yorimichi Bitmap"';crispText(g,text,x,y,color)};
  const panel=([x,y,w,h]:Rect)=>{box(g,x+3,y+3,w,h,'#0b0a1688');box(g,x,y,w,h,paper,edge);box(g,x+2,y+2,w-4,h-4,paper,rule)};
  const triangle=(x:number,y:number,color:string)=>{g.fillStyle=color;for(let k=0;k<4;k++)g.fillRect(x+k,y+k,1,7-k*2)};
  const button=([x,y,w,h]:Rect,label:string,chosen:boolean)=>{box(g,x,y+1,w,h,'#7a5a40');box(g,x,y,w,h,chosen?red:'#f8f0da',chosen?'#7a2a22':edge);write(g,label,x+w/2,y+Math.round((h-10)/2),chosen?'#fff6e0':ink,'center')};
  const dashes=(x:number,y:number,w:number)=>{for(let k=0;k<w;k+=4)box(g,x+k,y,2,1,rule)};

  /** Lanterns on a sagging string across the top, swaying a little, each lit from inside. */
  const lanterns=(t:number)=>{
    const sag=(x:number)=>Math.round(10+Math.sin(x/W*Math.PI)*8);
    for(let x=0;x<W;x++)box(g,x,sag(x),1,1,'#0c0b18');
    for(let x=18;x<W;x+=36){
      const y=sag(x)+1,sway=Math.round(Math.sin(t/900+x*.07)*1.4),lx=x+sway,glow=Math.sin(t/300+x)>.92?'#ffb27a':'#ff9a6a';
      box(g,x,y,1,2,'#2a1a1a');box(g,lx-2,y+2,5,1,'#2a1a1a');box(g,lx-3,y+3,7,8,'#d6402e');box(g,lx-2,y+3,5,8,'#e2553f');box(g,lx-1,y+5,1,4,glow);box(g,lx-3,y+6,7,1,'#a8301f');box(g,lx-2,y+11,5,1,'#2a1a1a');box(g,lx,y+12,1,2,'#e8b060');
    }
  };
  /** The seal, a red ring with 道 in it, pressed a little crooked in the card's corner. */
  const seal=(x:number,y:number)=>{
    for(let dy=-11;dy<=11;dy++)for(let dx=-11;dx<=11;dx++){const d=dx*dx+dy*dy;if(d<=121&&d>=81&&bayer[((dy+12)&3)*4+((dx+12)&3)]<13)box(g,x+dx,y+dy,1,1,'#c0463acc')}
    g.font='10px "Yorimichi Bitmap"';crispText(g,'道',x-5,y-5,'#c0463add');
  };

  const choices:[string,()=>void][]=[['つづける · RESUME',()=>close(actions.resume)],['旅の日記 · JOURNAL',()=>close(actions.journal)],['スタンプ帳 · STAMP BOOK',()=>close(actions.stamps)],['タイトルへ · TITLE SCREEN',()=>close(actions.title)]];
  const drawChoices=()=>{
    const p:Rect=[44,84,200,196];panel(p);
    write(g,'ひとやすみ · PAUSED',p[0]+p[2]/2,p[1]+8,red,'center');box(g,p[0]+12,p[1]+21,p[2]-24,1,rule);
    items=choices.map(([,act],i)=>({rect:[p[0]+16,p[1]+30+i*26,p[2]-32,18] as Rect,act}));
    items.forEach(({rect:[x,y,w]},i)=>{const on=i===focus;if(on){box(g,x,y-2,w,20,'#e6d4a6');triangle(x+5,y+4,red)}write(g,choices[i][0],x+w/2+4,y+3,on?red:ink,'center');if(on)box(g,x+18,y+15,w-28,1,red)});
    dashes(p[0]+12,p[1]+p[3]-30,p[2]-24);
    write(g,'The journey is kept as you go.',p[0]+p[2]/2,p[1]+p[3]-22,faint,'center');
  };
  const drawCard=(t:number)=>{
    const c:Rect=[264,84,172,196],[x,y,w,h]=c;panel(c);
    // The ticket's notches either side of its tear line, and its header band.
    {const ny=y+98;box(g,x,ny,4,8,'#1c1a34');box(g,x,ny-1,4,1,edge);box(g,x,ny+8,4,1,edge);box(g,x+4,ny,1,8,edge);box(g,x+w-4,ny,4,8,'#1c1a34');box(g,x+w-4,ny-1,4,1,edge);box(g,x+w-4,ny+8,4,1,edge);box(g,x+w-5,ny,1,8,edge)}
    box(g,x+4,y+4,w-8,16,'#3f9a5a');write(g,'旅人 · TRAVELLER',x+w/2,y+7,'#f4f0dc','center');
    // The traveller, walking on the spot, in a little frame.
    box(g,x+10,y+26,52,68,'#e2d3ac','#c8b48a');box(g,x+16,y+82,40,4,'#cdbb92');
    const s=sprite.getContext('2d')!;s.clearRect(0,0,20,28);paintTraveller(s,'down',[0,1,0,2][Math.floor(t/180)%4],look);g.drawImage(sprite,0,0,20,28,x+16,y+30,40,56);
    write(g,facts.day,x+72,y+30,faint);big(facts.time,x+72,y+44,ink);
    write(g,`¥${facts.yen.toLocaleString('en-US')}`,x+72,y+70,ink);write(g,`${facts.memories[0]}/${facts.memories[1]} memories`,x+72,y+82,ink);
    dashes(x+10,y+102,w-20);
    write(g,'現在地',x+12,y+110,red);
    const [ja,en]=facts.where;let line=y+124;if(ja){write(g,ja,x+12,line,ink);line+=13}
    wrap(g,en,w-24).slice(0,3).forEach(text=>{write(g,text,x+12,line,faint);line+=12});
    seal(x+w-22,y+h-22);
  };
  const draw=()=>{
    const t=performance.now(),rise=Math.max(0,1-(t-opened)/220);
    g.clearRect(0,0,W,H);shade.style.opacity=String(1-rise);
    g.save();g.translate(0,Math.round(rise*rise*24));
    lanterns(t);
    outlined('寄り道',W/2,26,'32px "Yorimichi Pixel"','#f6dfa0','#1b1530');spaced('YORIMICHI',W/2,62,'#f0d0a8');
    drawChoices();drawCard(t);
    g.restore();
    const hint='↑↓ choose · Enter or A · Esc or B resume';g.font='10px "Yorimichi Bitmap"';const hw=Math.ceil(g.measureText(hint).width)+20;box(g,(W-hw)/2,H-20,hw,15,'#0b0a16d0','#3a3466');write(g,hint,W/2,H-17,'#f0d0a8','center');
    pad();frame=requestAnimationFrame(draw);
  };

  function close(then:()=>void){if(over)return;over=true;cancelAnimationFrame(frame);watcher.disconnect();document.removeEventListener('keydown',key,true);overlay.remove();then()}
  const move=(d:number)=>{focus=(focus+d+items.length)%items.length};
  const back=()=>close(actions.resume);
  const choose=()=>items[focus]?.act();
  function key(event:KeyboardEvent){
    const keys:Record<string,()=>void>={ArrowUp:()=>move(-1),ArrowDown:()=>move(1),ArrowLeft:()=>move(-1),ArrowRight:()=>move(1),KeyW:()=>move(-1),KeyS:()=>move(1),KeyA:()=>move(-1),KeyD:()=>move(1),Enter:choose,Space:choose,KeyE:choose,Escape:back,Backspace:back};
    const fn=keys[event.code];event.preventDefault();event.stopPropagation();if(fn&&(!event.repeat||event.code.startsWith('Arrow')))fn();
  }
  document.addEventListener('keydown',key,true);

  // The pad: D-pad or stick to choose, held to repeat; A to take, B or Start to go back.
  let held:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[],repeatAt=0,lastDir=0;
  function pad(){
    const p=connectedPad();if(!p)return;const now=performance.now(),pressed=p.buttons.map(b=>b.pressed),edge=(i:number)=>pressed[i]&&!held[i];held=pressed;
    const ax=p.axes[0]??0,ay=p.axes[1]??0,dir=pressed[12]||pressed[14]||ay<-.5||ax<-.5?-1:pressed[13]||pressed[15]||ay>.5||ax>.5?1:0;
    if(dir&&(dir!==lastDir||now>repeatAt)){repeatAt=now+(dir!==lastDir?380:140);move(dir)}lastDir=dir;
    if(edge(0))choose();else if(edge(1)||edge(9))back();
  }

  // The pointer: hovering picks, a click takes; a click outside the picture's panels resumes.
  const at=(event:PointerEvent):[number,number]=>{const r=canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H]};
  canvas.addEventListener('pointermove',event=>{const [x,y]=at(event),i=items.findIndex(item=>inside(item.rect,x,y));if(i>=0)focus=i;canvas.style.cursor=i>=0?'pointer':'default'});
  overlay.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;event.preventDefault();const [x,y]=at(event),i=items.findIndex(item=>inside(item.rect,x,y));
    if(i>=0){focus=i;items[i].act()}else if(!inside([44,84,392,196],x,y))close(actions.resume);
  });
  draw();
}
