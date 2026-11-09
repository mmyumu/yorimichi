import { dayOf, monthDay } from './clock';
import { box } from './hall-scene';
import { write } from './konbini-till';
import { stationAt, stations, type Hub } from './network';
import { connectedPad } from './pad';
import { railLines } from './rail';
import { impression, stampOf, S } from './stamps';
import { crispText, fitPicture } from './ticket-gate';
import { machineSound } from './wallet';

/** One stamp pressed into the book: whose, on which page, where on it (its top left, in book px), how it came out (`seed`) and the journey's day. */
export interface Impression {hub:Hub;page:number;x:number;y:number;seed:number;day:number}
const key='yorimichi-stamps';
export function loadImpressions():Impression[]{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(i=>i&&typeof i.hub==='string'&&i.hub in stations):[]}catch{return []}}
const keepImpressions=(list:Impression[])=>{try{localStorage.setItem(key,JSON.stringify(list))}catch{}};
/** The stations stamped at least once. */
export const stampedStations=()=>new Set(loadImpressions().map(i=>i.hub));

// The stamp book (スタンプ帳), drawn as the album is (photo-book.ts): one 480 × 320 picture, the book in its pixels scaled up unsmoothed, the stamps in half-pixel dots.
// An indigo cloth book open on the desk: the first spread its contents (stations stamped, line by line), then 24 spreads of blank pages. At a station's stand (`hub`) the stand is on the right:
// its sign, a sample sheet and the stamp on its ink pad; the stamp is taken, carried over a page and pressed there. From the menu (`hub` null) the same book, the stand's place
// listing the stations on the pages open.
const W=480,H=320,ink='#3a2a20',paper='#f3ead0',rule='#d6c49a',red='#c0463a',faint='#8a7558';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
type Rect=[number,number,number,number];
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;
const left:Rect=[14,22,168,268],right:Rect=[186,22,168,268],spine=184,side:Rect=[366,22,104,268];
/** A stamp's size on the page (S dots, two a pixel), the pages after the contents, and where a stamp goes when the book picks the place (two across, four down). */
/** How long the stamp takes to come down; how tall it stands (its knob above its rubber), in book px. */
const downMs=120,tall=63,size=S/2,pageCount=48,spreads=1+pageCount/2,spots:[number,number][]=[14,90].flatMap(x=>[8,72,136,200].map(y=>[x,y] as [number,number]));
const pageRect=(page:number)=>page%2?right:left;
const totalStations=Object.keys(stations).length;

let desk:HTMLCanvasElement|null=null;
/** The desk, the indigo cloth boards and two blank pages shaded into the spine: drawn once. */
function backdrop(){
  if(desk)return desk;desk=document.createElement('canvas');desk.width=W;desk.height=H;const g=desk.getContext('2d')!;
  box(g,0,0,W,H,'#3a2518');
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=Math.sin(x*.021+Math.sin(y*.13+(y/46|0)*2.3)*2.2+y*.9);if(v>.82&&bayer[(y&3)*4+(x&3)]<7)box(g,x,y,1,1,'#47301f');else if(v<-.9&&bayer[(y&3)*4+(x&3)]<5)box(g,x,y,1,1,'#2e1c12')}
  box(g,10,12,352,288,'#1c110b');box(g,6,8,352,288,'#2c3d6b','#1b2748');box(g,7,9,350,1,'#43568a');
  for(let y=10;y<294;y++)for(let x=8;x<356;x++)if(bayer[(y&3)*4+(x&3)]===0&&(x+y)%3===0)box(g,x,y,1,1,'#33467a');
  for(const [x,y,w,h] of [left,right]){box(g,x,y+h,w,4,'#cdbb92');box(g,x+1,y+h+2,w-2,1,'#e2d3ac');box(g,x,y,w,h,paper)}
  ['#d2c39c','#ddcfa8','#e6d9b4','#ece1bf'].forEach((c,k)=>{box(g,spine-1-k,left[1],1,left[3],c);box(g,spine+k,right[1],1,right[3],c)});
  box(g,spine-1,8,2,288,'#1b2748');
  // A faint printed border on each page.
  for(const [x,y,w,h] of [left,right]){for(let k=6;k<w-6;k+=3){box(g,x+k,y+5,1,1,rule);box(g,x+k,y+h-6,1,1,rule)}for(let k=6;k<h-6;k+=3){box(g,x+5,y+k,1,1,rule);box(g,x+w-6,y+k,1,1,rule)}}
  // The ribbon marker's tail.
  box(g,330,292,5,14,'#b03a30');box(g,330,292,1,14,'#d4574a');
  return desk;
}

export class StampBook{
  private overlay=document.createElement('div');private canvas=document.createElement('canvas');private g=this.canvas.getContext('2d')!;
  private k=1;private frame=0;private watcher:ResizeObserver;private spread=0;private list=loadImpressions();
  /** The stamp: on its pad, carried (its centre, in book px) or coming down (`press`, when it started). */
  private held=false;private at:[number,number]=[0,0];private press=0;private landed=false;private hover:Impression|null=null;
  private targets:{rect:Rect;act:()=>void}[]=[];
  private flip:{from:HTMLCanvasElement;to:HTMLCanvasElement;start:number;by:1|-1}|null=null;
  private pads:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[];private repeatAt=0;private lastDir='';
  constructor(private hub:Hub|null,private close:()=>void){
    this.overlay.style.cssText='position:fixed;inset:0;z-index:60;background:#3a2518;outline:none;overflow:hidden;touch-action:none;user-select:none';this.overlay.tabIndex=-1;
    this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-label',hub?`Stamp stand, ${stations[hub].en}`:'Stamp book');
    this.canvas.style.cssText='position:absolute;display:block';this.overlay.append(this.canvas);document.body.append(this.overlay);this.overlay.focus();
    this.watcher=new ResizeObserver(()=>this.fit());this.watcher.observe(this.overlay);this.fit();
    if(hub){const free=this.freeSpot(1);this.spread=free?1+(free.page>>1):1}
    document.addEventListener('keydown',this.keydown,true);
    this.canvas.addEventListener('pointermove',event=>{const [x,y]=this.point(event);if(this.held&&!this.press)this.carry(x,y);this.hover=this.impressionAt(x,y);this.canvas.style.cursor=this.held?'none':this.targets.some(t=>inside(t.rect,x,y))?'pointer':'default'});
    this.overlay.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;event.preventDefault();const [x,y]=this.point(event);
      if(this.held){if(inside(left,x,y)||inside(right,x,y)){this.carry(x,y);this.stamp()}else this.putBack();return}
      const target=this.targets.find(t=>inside(t.rect,x,y));if(target)target.act();else if(!inside([6,8,464,288],x,y))this.leave();
    });
    // The fonts the stamps are lettered in, before the first is drawn for good.
    Promise.all([document.fonts?.load('10px "Yorimichi Bitmap"'),document.fonts?.load('20px "Yorimichi Bitmap"'),document.fonts?.load('16px "Yorimichi Pixel"')]).catch(()=>{});
    this.frame=requestAnimationFrame(this.tick);
  }
  private fit(){fitPicture(this.canvas,this.overlay,W,H);this.k=parseFloat(this.canvas.style.width)*(devicePixelRatio||1)/W;this.canvas.width=Math.round(W*this.k);this.canvas.height=Math.round(H*this.k);this.flip=null}
  private point(event:PointerEvent):[number,number]{const r=this.canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H]}
  private pagesOpen=()=>this.spread?[(this.spread-1)*2,(this.spread-1)*2+1]:[];
  private impressionAt(x:number,y:number){
    const open=this.pagesOpen();
    for(let i=this.list.length-1;i>=0;i--){const s=this.list[i];if(!open.includes(s.page))continue;const [px,py]=pageRect(s.page);if(inside([px+s.x+6,py+s.y+6,size-12,size-12],x,y))return s}
    return null;
  }
  /** The first place on a page from `from` on where a stamp would not lie over another. */
  private freeSpot(from:number){
    for(let page=Math.max(0,(from-1)*2);page<pageCount;page++)for(const [x,y] of spots)if(!this.list.some(s=>s.page===page&&Math.abs(s.x-x)<size-16&&Math.abs(s.y-y)<size-16))return {page,x,y};
    return null;
  }

  // Turning the pages: the leaf squeezed across the spine (as the album turns them).
  private turn(by:1|-1){
    const to=this.spread+by;if(this.flip||to<(this.held?1:0)||to>=spreads)return;
    const {width,height}=this.canvas,from=document.createElement('canvas');from.width=width;from.height=height;from.getContext('2d')!.drawImage(this.canvas,0,0);
    this.spread=to;const next=document.createElement('canvas');next.width=width;next.height=height;this.flip={from,to:next,start:performance.now(),by};
    if(this.held){const [px,py,pw,ph]=by>0?left:right;this.at=[px+pw/2,py+ph/2]}
  }
  private take(){
    if(!this.hub||this.held)return;this.held=true;this.press=0;
    const free=this.freeSpot(Math.max(1,this.spread));
    if(free&&1+(free.page>>1)===this.spread){const [px,py]=pageRect(free.page);this.at=[px+free.x+size/2,py+free.y+size/2]}
    else if(this.spread===0){if(free){this.spread=1+(free.page>>1);const [px,py]=pageRect(free.page);this.at=[px+free.x+size/2,py+free.y+size/2]}else{this.spread=1;this.at=[left[0]+left[2]/2,left[1]+left[3]/2]}}
    else this.at=[right[0]+right[2]/2,right[1]+right[3]/2];
  }
  private putBack(){this.held=false;this.press=0}
  /** The stamp's centre kept over one page, whole. */
  private carry(x:number,y:number){const [px,py,pw,ph]=x<spine?left:right;this.at=[Math.max(px+size/2,Math.min(px+pw-size/2,Math.round(x))),Math.max(py+size/2,Math.min(py+ph-size/2,Math.round(y)))]}
  private stamp(){if(!this.held||this.press||this.flip||!this.spread)return;this.press=performance.now()}
  /** The stamp reaches the paper: the impression is kept. */
  private land(){
    const [x,y]=this.at,page=(this.spread-1)*2+(x<spine?0:1),[px,py]=pageRect(page);
    this.list.push({hub:this.hub!,page,x:Math.round(x-size/2-px),y:Math.round(y-size/2-py),seed:1+Math.floor(Math.random()*1e6),day:dayOf()});keepImpressions(this.list);machineSound('stamp');
  }
  private leave(){if(this.held){this.putBack();return}this.destroy();this.close()}
  destroy(){cancelAnimationFrame(this.frame);this.watcher.disconnect();document.removeEventListener('keydown',this.keydown,true);this.overlay.remove()}

  /** Carried past the spread's outer edge and held there a moment, the stamp turns the page (`push`: since when, last nudge). */
  private push:[number,number]=[0,0];
  private nudge(dx:number,dy:number){
    if(!this.held){if(dx)this.turn(dx>0?1:-1);return}if(this.press)return;
    const now=performance.now(),x=this.at[0],out=dx<0&&x<=left[0]+size/2||dx>0&&x>=right[0]+right[2]-size/2;
    if(out){if(now-this.push[1]>150)this.push[0]=now;this.push[1]=now;if(now-this.push[0]>320){this.push=[0,0];this.turn(dx>0?1:-1);return}}
    // Across the spine, the stamp hops onto the other page.
    const hop=dx>0&&x<spine&&x>=left[0]+left[2]-size/2?right[0]+size/2:dx<0&&x>spine&&x<=right[0]+size/2?left[0]+left[2]-size/2:x+dx;
    this.carry(hop,this.at[1]+dy);
  }
  private choose(){if(this.held)this.stamp();else this.take()}
  private keydown=(event:KeyboardEvent)=>{
    event.preventDefault();event.stopPropagation();
    const step=event.shiftKey?12:4,keys:Record<string,()=>void>={ArrowLeft:()=>this.nudge(-step,0),ArrowRight:()=>this.nudge(step,0),ArrowUp:()=>this.nudge(0,-step),ArrowDown:()=>this.nudge(0,step),KeyA:()=>this.nudge(-step,0),KeyD:()=>this.nudge(step,0),KeyW:()=>this.nudge(0,-step),KeyS:()=>this.nudge(0,step),
      PageUp:()=>this.turn(-1),PageDown:()=>this.turn(1),KeyQ:()=>this.turn(-1),KeyE:()=>this.turn(1),Enter:()=>this.choose(),Space:()=>this.choose(),Escape:()=>this.leave(),Backspace:()=>this.leave()};
    const fn=keys[event.code];if(fn&&(!event.repeat||this.held||event.code.startsWith('Arrow')))fn();
  };
  /** The pad: the stick or D-pad carries the stamp (or turns the pages), LB / RB turn them, A takes and presses, B puts back and leaves. */
  private pad(){
    const p=connectedPad();if(!p)return;const now=performance.now(),pressed=p.buttons.map(b=>b.pressed),was=this.pads,edge=(i:number)=>pressed[i]&&!was[i];this.pads=pressed;
    const [x=0,y=0]=p.axes;
    if(this.held){const dx=(pressed[14]?-1:pressed[15]?1:Math.abs(x)>.2?x:0),dy=(pressed[12]?-1:pressed[13]?1:Math.abs(y)>.2?y:0);if(dx||dy)this.nudge(dx*3,dy*3)}
    else{const dir=pressed[14]||x<-.5?'left':pressed[15]||x>.5?'right':'';if(dir&&(dir!==this.lastDir||now>this.repeatAt)){this.repeatAt=now+(dir!==this.lastDir?380:200);this.turn(dir==='left'?-1:1)}this.lastDir=dir}
    if(edge(0))this.choose();else if(edge(1))this.leave();else if(edge(4))this.turn(-1);else if(edge(5))this.turn(1);else if(edge(3)&&!this.hub){this.destroy();this.close()}
  }

  private tick=()=>{
    if(!this.overlay.isConnected)return;this.pad();const g=this.g,now=performance.now();
    // The stamp's way down and up: it reaches the paper at 90 ms, is lifted off by 260 and goes back on its pad.
    if(this.press&&!this.landed&&now-this.press>=downMs){this.landed=true;this.land()}
    if(this.press&&now-this.press>downMs*2.8){this.press=0;this.landed=false;this.held=false}
    if(this.flip){
      const {from,to,start,by}=this.flip,t=Math.min(1,(now-start)/320),k=this.k;this.paint(to.getContext('2d')!);g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;
      const part=(src:HTMLCanvasElement,sx:number,sy:number,sw:number,sh:number,dx:number,dy:number,dw:number,dh:number)=>g.drawImage(src,sx*k,sy*k,sw*k,sh*k,dx*k,dy*k,dw*k,dh*k),line=(x:number,y:number,h:number)=>{g.fillStyle='#a8987088';g.fillRect(x*k,y*k,k,h*k)};
      const [lx,ly,lw,lh]=left,rx=right[0],rw=right[2],y0=ly-2,hh=lh+6,ease=t<.5?2*t*t:1-2*(1-t)*(1-t);
      g.drawImage(to,0,0);
      if(by>0){part(from,0,0,spine,H,0,0,spine,H);if(ease<.5){const w=Math.max(1,Math.round(rw*(1-2*ease)));part(from,rx,y0,rw,hh,spine,y0,w,hh);line(spine+w-1,ly,lh)}else{const w=Math.max(1,Math.round(lw*(2*ease-1)));part(to,lx,y0,lw,hh,spine-w,y0,w,hh);line(spine-w,ly,lh)}}
      else{part(from,spine,0,side[0]-6-spine,H,spine,0,side[0]-6-spine,H);if(ease<.5){const w=Math.max(1,Math.round(lw*(1-2*ease)));part(from,lx,y0,lw,hh,spine-w,y0,w,hh);line(spine-w,ly,lh)}else{const w=Math.max(1,Math.round(rw*(2*ease-1)));part(to,rx,y0,rw,hh,spine,y0,w,hh);line(spine+w-1,ly,lh)}}
      if(t>=1)this.flip=null;
    }else this.paint(g);
    this.frame=requestAnimationFrame(this.tick);
  };

  private paint(g:CanvasRenderingContext2D){
    this.targets=[];g.setTransform(this.k,0,0,this.k,0,0);g.imageSmoothingEnabled=false;g.drawImage(backdrop(),0,0);
    if(this.spread===0)this.contents(g);else this.pages(g);
    this.tabs(g);
    if(this.hub)this.stand(g);else this.index(g);
    if(this.held)this.carried(g);
    const hint=this.held?'Move it · LB RB pages · Enter or A stamp · Esc or B put back':this.hub?'Enter or A take the stamp · ←→ LB RB pages · Esc or B leave':'←→ LB RB pages · Esc or B close';
    g.font='10px "Yorimichi Bitmap"';const hw=Math.ceil(g.measureText(hint).width)+20;box(g,(W-hw)/2,H-17,hw,15,'#1c110bd8','#5a3f2c');write(g,hint,W/2,H-14,'#f0d0a8','center');
  }
  private big(g:CanvasRenderingContext2D,text:string,x:number,y:number,color:string,align:'left'|'center'='left'){g.font='20px "Yorimichi Bitmap"';const w=g.measureText(text).width;crispText(g,text,align==='center'?Math.round(x-w/2):x,y,color)}
  /** The corners' tabs to turn back and on, where there is a page that way. */
  private tabs(g:CanvasRenderingContext2D){
    const tab=(x:number,y:number,by:1|-1)=>{box(g,x,y,12,12,'#e6d9b4','#c8b48a');g.fillStyle=faint;for(let i=0;i<4;i++)g.fillRect(by>0?x+4+i:x+7-i,y+3+i,1,7-i*2);this.targets.push({rect:[x-2,y-2,16,16],act:()=>this.turn(by)})};
    if(this.spread>(this.held?1:0))tab(left[0]+4,left[1]+left[3]-16,-1);if(this.spread<spreads-1)tab(right[0]+right[2]-16,right[1]+right[3]-16,1);
  }
  /** The first spread: the book's title and how many stations are in it, line by line. */
  private contents(g:CanvasRenderingContext2D){
    const [x,y,w]=left,have=new Set(this.list.map(s=>s.hub));
    this.big(g,'スタンプ帳',x+w/2,y+18,ink,'center');write(g,'STAMP BOOK',x+w/2,y+42,faint,'center');
    box(g,x+20,y+58,w-40,1,rule);
    write(g,'駅 · STATIONS',x+w/2,y+66,ink,'center');this.big(g,`${have.size} / ${totalStations}`,x+w/2,y+80,red,'center');
    // A seal pressed in the corner.
    const sx=x+w-30,sy=y+28;for(let dy=-11;dy<=11;dy++)for(let dx=-11;dx<=11;dx++){const d=dx*dx+dy*dy;if(d<=121&&d>=81&&bayer[((dy+12)&3)*4+((dx+12)&3)]<13)box(g,sx+dx,sy+dy,1,1,'#c0463acc')}write(g,'駅',sx-5,sy-5,'#c0463add');
    const lines=railLines.filter(line=>line.service==='local'),rows=lines.map(line=>{const stops=[...new Set(line.stops)];return {line,n:stops.filter(ja=>{const hub=stationAt(ja);return hub&&have.has(hub)}).length,of:stops.length}});
    const row=(r:typeof rows[number],rx:number,ry:number,rw:number)=>{
      box(g,rx,ry+2,6,6,r.line.color,'#00000040');g.font='10px "Yorimichi Bitmap"';let name=r.line.en;while(g.measureText(name).width>rw-48&&name.length>4)name=name.slice(0,-2)+'…';
      write(g,name,rx+10,ry,r.n===r.of?red:ink);write(g,`${r.n}/${r.of}`,rx+rw,ry,r.n?ink:faint,'right');
    };
    const first=11;rows.slice(0,first).forEach((r,i)=>row(r,x+12,y+108+i*14,w-24));
    const [rx2,ry2,rw2]=right;write(g,'路線 · LINES',rx2+rw2/2,ry2+12,faint,'center');rows.slice(first).forEach((r,i)=>row(r,rx2+12,ry2+30+i*14,rw2-24));
  }
  private pages(g:CanvasRenderingContext2D){
    for(const page of this.pagesOpen()){const [x,y,w,h]=pageRect(page);write(g,`${page+1}`,x+w/2,y+h-16,faint,'center')}
    const open=this.pagesOpen();
    for(const s of this.list)if(open.includes(s.page)){const [px,py]=pageRect(s.page);g.drawImage(impression(s.hub,s.seed),px+s.x,py+s.y,size,size)}
    if(this.hover&&!this.held){const [px,py]=pageRect(this.hover.page);const [x,y]=[px+this.hover.x,py+this.hover.y];for(let k=0;k<size;k+=3){box(g,x+k,y-2,1,1,faint);box(g,x+k,y+size+1,1,1,faint);box(g,x-2,y+k,1,1,faint);box(g,x+size+1,y+k,1,1,faint)}}
  }
  /** The station's stand: its sign, the sample sheet, the stamp on its ink pad; then what the stamp under the pointer is. */
  private stand(g:CanvasRenderingContext2D){
    const [x,y,w]=side,station=stations[this.hub!],design=stampOf(this.hub!);
    box(g,x+2,y+2,w,248,'#1c110b80');box(g,x,y,w,248,'#7a4e2e','#4a2e1a');box(g,x+2,y+2,w-4,1,'#a8744a');
    // The sign.
    box(g,x+6,y+6,w-12,30,'#283e40');box(g,x+6,y+33,w-12,3,station.accent);write(g,'記念スタンプ',x+w/2,y+9,'#fffef2','center');write(g,station.ja.replace(/​/g,''),x+w/2,y+21,'#f2c230','center');
    // The sample sheet, pinned.
    box(g,x+12,y+44,w-24,92,'#fbf6e8','#c8b48a');write(g,'見本 · SAMPLE',x+w/2,y+48,faint,'center');g.drawImage(impression(this.hub!,0),x+(w-size)/2,y+64,size,size);box(g,x+w/2-1,y+42,3,3,red);
    // The ink pad and, unless carried, the stamp on it.
    const px=x+14,py=y+168;box(g,px,py,w-28,26,'#3b3f48','#22252b');box(g,px+3,py+3,w-34,20,design.ink);for(let j=0;j<20;j++)for(let i=j&1;i<w-34;i+=2)if(bayer[(j&3)*4+(i&3)]<5)box(g,px+3+i,py+3+j,1,1,'#00000040');
    if(!this.held){const cx=x+w/2;box(g,cx-22,py+4,44,10,'#a8744a','#6e4428');box(g,cx-22,py+12,44,3,'#2b2b33');box(g,cx-5,py-10,10,14,'#8a5a36');box(g,cx-4,py-10,2,14,'#a8744a');box(g,cx-9,py-18,18,9,'#c08a58','#7a4e2e');box(g,cx-6,py-17,6,2,'#e0b080')}
    this.targets.push({rect:[x+8,y+140,w-16,64],act:()=>this.take()});
    // Below: the stamp under the pointer, else how many stations so far.
    const iy=y+204;box(g,x+6,iy,w-12,40,'#f3ead0','#c8b48a');
    if(this.hover)this.about(g,this.hover,x+w/2,iy+4);else{write(g,'集めた駅',x+w/2,iy+6,faint,'center');write(g,`${new Set(this.list.map(s=>s.hub)).size} / ${totalStations}`,x+w/2,iy+20,ink,'center')}
  }
  private about(g:CanvasRenderingContext2D,s:Impression,cx:number,y:number){const st=stations[s.hub];write(g,st.ja.replace(/​/g,''),cx,y,ink,'center');write(g,st.en,cx,y+11,faint,'center');write(g,monthDay(s.day),cx,y+22,red,'center')}
  /** From the menu: the stations on the pages open, the one under the pointer marked. */
  private index(g:CanvasRenderingContext2D){
    const [x,y,w,h]=side;box(g,x+2,y+2,w,h,'#1c110b80');box(g,x,y,w,h,paper,'#5a3f2c');box(g,x+2,y+2,w-4,h-4,paper,rule);
    if(!this.spread){write(g,'Stamp each',x+w/2,y+14,faint,'center');write(g,"station's stand",x+w/2,y+26,faint,'center');write(g,'into the book.',x+w/2,y+38,faint,'center');return}
    write(g,'この見開き',x+w/2,y+8,red,'center');box(g,x+10,y+20,w-20,1,rule);
    const open=this.pagesOpen(),here=[...new Map(this.list.filter(s=>open.includes(s.page)).map(s=>[s.hub,s])).values()];
    if(!here.length){write(g,'Blank pages',x+w/2,y+28,faint,'center');return}
    here.slice(0,11).forEach((s,i)=>{const on=this.hover?.hub===s.hub,ry=y+26+i*20;if(on)box(g,x+4,ry-2,w-8,20,'#e6d4a6');write(g,stations[s.hub].ja.replace(/​/g,''),x+8,ry,on?red:ink);write(g,stations[s.hub].en,x+8,ry+9,faint)});
  }
  /** The stamp in hand, seen from above at three-quarters: held over the page above where it will print (that faint below it), so the picture shows (see-through where the page's top leaves it no room); pressed, it comes down onto it and back up. */
  private lifted=document.createElement('canvas');
  private carried(g:CanvasRenderingContext2D){
    const [cx,cy]=this.at,bx=cx-size/2,down=cy+size/2,up=Math.max(cy-size/2-3,tall+1),H=down-up,t=this.press?(performance.now()-this.press)/downMs:0;
    const l=Math.round(this.press?(t<1?H*(1-t*t):Math.max(0,Math.min(H,(t-1.6)*H))):H),bottom=down-l;
    g.globalAlpha=.22;g.drawImage(impression(this.hub!,0),bx,cy-size/2,size,size);g.globalAlpha=1;
    // The rubber's outline on the page and, as the stamp nears it, its shadow.
    for(let k=0;k<size;k+=4){box(g,bx+k,cy-size/2,2,1,'#5a3f2c80');box(g,bx+k,cy+size/2-1,2,1,'#5a3f2c80');box(g,bx,cy-size/2+k,1,2,'#5a3f2c80');box(g,bx+size-1,cy-size/2+k,1,2,'#5a3f2c80')}
    if(l<H){g.globalAlpha=.3*(1-l/H);box(g,bx+3,cy-size/2+2,size-2,size-2,'#3a2518');g.globalAlpha=1}
    // The stamp, drawn apart to be laid over whole, see-through while it hovers over its own print.
    const c=this.lifted;if(c.width!==this.canvas.width||c.height!==this.canvas.height){c.width=this.canvas.width;c.height=this.canvas.height}
    const s=c.getContext('2d')!;s.setTransform(1,0,0,1,0,0);s.clearRect(0,0,c.width,c.height);s.setTransform(this.k,0,0,this.k,0,0);s.imageSmoothingEnabled=false;
    const top=bottom-56,ink=stampOf(this.hub!).ink,disc=(x:number,y:number,rx:number,ry:number,col:string)=>{for(let j=-ry;j<=ry;j++){const w=Math.round(rx*Math.sqrt(1-j*j/(ry*ry)));box(s,x-w,y+j,2*w+1,1,col)}};
    // The block: its top, its front over the inked rubber, the handle rising from the middle of the top and its round knob.
    box(s,bx,top,size,46,'#c08a58','#7a4e2e');box(s,bx+1,top+1,size-2,1,'#e0b080');box(s,bx+1,top+1,1,44,'#d49c68');
    box(s,bx,top+46,size,7,'#8a5a36','#5a3a22');box(s,bx+1,top+47,size-2,1,'#a8744a');box(s,bx+1,bottom-3,size-2,3,ink);box(s,bx+1,bottom-1,size-2,1,'#00000050');
    const hy=top+24;disc(cx,hy,9,4,'#5a3a2250');disc(cx,hy-1,6,3,'#7a4e2e');box(s,cx-5,hy-21,10,21,'#8a5a36');box(s,cx-4,hy-21,3,21,'#a8744a');box(s,cx+3,hy-21,2,21,'#6e4428');
    disc(cx,hy-22,12,6,'#7a4e2e');disc(cx,hy-24,11,5,'#c08a58');disc(cx-3,hy-26,5,2,'#e0b080');
    g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=!this.press&&bottom>cy-size/2?.45:1;g.drawImage(c,0,0);g.restore();
  }
}
