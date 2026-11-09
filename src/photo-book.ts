import { connectedPad } from './pad';
import { photoBase, photoUrl } from './access';
import { box } from './hall-scene';
import { wrap, write } from './konbini-till';
import { areas, onMap } from './city-maps';
import { stations } from './network';
import { busLines, stopNames } from './rail';
import { memoryPages, roadPage, sights, type Page } from './sights';
import { crispText, fitPicture } from './ticket-gate';

/** The photos of each page by its id: public/photos/index.json, written by scripts/import-photos.mjs and, like the photos, kept out of the repository. Without it the album's pages are empty. Always revalidated: a cached index naming photos since replaced would leave every page unavailable. */
type Shelf=Record<string,string[]>;
let shelf:Promise<Shelf>|null=null;
const loadShelf=()=>shelf??=fetch(`${photoBase}index.json`,{cache:'no-cache'}).then(r=>r.ok?r.json() as Promise<Shelf>:{}).catch(()=>({}));
const pages:Page[]=[...memoryPages,roadPage];

// The album as the pause menu is drawn (pause-menu.ts): one 480 × 320 picture, scaled up whole. An open book on a desk: the contents spread (a mounted print per place, blank where not yet found), then a spread per place,
// its name, stamp and contact sheet on the left, the photo itself mounted on the right, and a close-up larger still. Only the book is pixel art: the canvas has the screen's own resolution, the book is drawn in its 480 × 320 pixels scaled up unsmoothed (`k`), the photos smooth over it.
const W=480,H=320,ink='#3a2a20',paper='#efe3c2',edge='#5a3f2c',rule='#d6c49a',red='#c0463a',faint='#8a7558',mount='#fbf6e8',stamp='#5f4f9e';
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
type Rect=[number,number,number,number];
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;
/** The two pages (the spine at 240) and the sizes photos are printed at: contact prints and covers, the mounted print, the close-up. */
const left:Rect=[16,12,222,272],right:Rect=[242,12,222,272],spine=240;
const TW=40,TH=30,PW=180,PH=196,FW=440,FH=262;
/** The contents: four prints a row, three rows under the title on the left, five on the right. */
const columns=4,leftRows=3,rightRows=5,perSpread=columns*(leftRows+rightRows),sheet=12;
const slot=(i:number):Rect=>{const k=i%perSpread,onLeft=k<columns*leftRows,j=onLeft?k:k-columns*leftRows;return [(onLeft?left:right)[0]+14+(j%columns)*50,(onLeft?118:22)+Math.floor(j/columns)*52,44,34]};

/** A photo shrunk by halves for a fair average, cropped to fill (`cover`) or whole, to `w` × `h` at most. */
function shrink(image:HTMLImageElement,w:number,h:number,cover:boolean){
  const iw=image.naturalWidth,ih=image.naturalHeight,s=cover?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih),ow=cover?w:Math.max(1,Math.round(iw*s)),oh=cover?h:Math.max(1,Math.round(ih*s));
  let from:CanvasImageSource=image,fw=cover?w/s:iw,fh=cover?h/s:ih,fx=(iw-fw)/2,fy=(ih-fh)/2;
  while(fw>ow*2&&fh>oh*2){const c=document.createElement('canvas');c.width=Math.ceil(fw/2);c.height=Math.ceil(fh/2);const cg=c.getContext('2d')!;cg.imageSmoothingQuality='high';cg.drawImage(from,fx,fy,fw,fh,0,0,c.width,c.height);from=c;fx=fy=0;fw=c.width;fh=c.height}
  const out=document.createElement('canvas');out.width=ow;out.height=oh;const g=out.getContext('2d')!;g.imageSmoothingQuality='high';g.drawImage(from,fx,fy,fw,fh,0,0,ow,oh);return out;
}
async function source(path:string){const url=await photoUrl(path);try{const image=new Image();image.src=url;await image.decode();return image}finally{if(url.startsWith('blob:'))URL.revokeObjectURL(url)}}
/** Each photo's small and mounted prints, made once a session at the screen's resolution of the time (`sharp` screen pixels a book pixel; the photo decrypted once, then let go); null when it could not be had. The close-up is the photo itself, the last one kept. */
type Prints={thumb:HTMLCanvasElement;print:HTMLCanvasElement;r:number};
let sharp=4;
const prints=new Map<string,Prints|null|'loading'>();
const printsOf=(path:string)=>{
  const known=prints.get(path);if(known!==undefined)return known==='loading'?undefined:known;
  prints.set(path,'loading');source(path).then(image=>{const r=sharp;prints.set(path,{thumb:shrink(image,TW*r,TH*r,true),print:shrink(image,PW*r,PH*r,false),r})}).catch(()=>prints.set(path,null));
};
let closeUp:{path:string;canvas?:HTMLImageElement|null}|null=null;
const closeUpOf=(path:string)=>{if(closeUp?.path!==path){const mine={path} as NonNullable<typeof closeUp>;closeUp=mine;source(path).then(image=>{mine.canvas=image}).catch(()=>{mine.canvas=null})}return closeUp.canvas};

/** The desk, the cloth boards and the two blank pages, shaded into the spine: drawn once. */
let desk:HTMLCanvasElement|null=null;
function backdrop(){
  if(desk)return desk;desk=document.createElement('canvas');desk.width=W;desk.height=H;const g=desk.getContext('2d')!;
  box(g,0,0,W,H,'#3a2518');
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const v=Math.sin(x*.021+Math.sin(y*.13+(y/46|0)*2.3)*2.2+y*.9);if(v>.82&&bayer[(y&3)*4+(x&3)]<7)box(g,x,y,1,1,'#47301f');else if(v<-.9&&bayer[(y&3)*4+(x&3)]<5)box(g,x,y,1,1,'#2e1c12')}
  box(g,12,10,464,290,'#1c110b');box(g,8,6,464,288,'#2f5a48','#1d3a2e');box(g,9,7,462,1,'#4a7a63');
  for(const [x,y,w,h] of [left,right]){box(g,x,y+h,w,6,'#cdbb92');for(let k=0;k<6;k+=2)box(g,x+1,y+h+k,w-2,1,'#e2d3ac');box(g,x,y,w,h,paper)}
  ['#cdbb92','#d9c9a0','#e2d3ac','#e8dbb8','#ebdfbd'].forEach((c,k)=>{box(g,spine-1-k,left[1],1,left[3],c);box(g,spine+k,right[1],1,right[3],c)});
  box(g,spine-1,6,2,288,'#1d3a2e');
  // The red ribbon marker's tail, out from between the pages over the foot of the cover.
  box(g,446,282,6,16,'#b03a30');box(g,446,282,1,16,'#d4574a');box(g,446,298,2,3,'#8a2a22');box(g,450,298,2,3,'#8a2a22');
  return desk;
}
/** The close-up's veil over the book, a checker of shadow. */
let veil:HTMLCanvasElement|null=null;
const veiled=()=>{if(veil)return veil;veil=document.createElement('canvas');veil.width=464;veil.height=288;const g=veil.getContext('2d')!;g.fillStyle='#120b07';for(let y=0;y<288;y++)for(let x=y&1;x<464;x+=2)g.fillRect(x,y,1,1);g.fillStyle='#120b07a0';g.fillRect(0,0,464,288);return veil};
/** Where a page's place is, for its scratch card: the area, the way there (on foot or its km from the nearest station, a bus), the place it is part of, or the station exit leading to it. Nothing for the page from along the way. */
function whereabouts(page:Page):string[]{
  const sight=sights.find(s=>s.id===page.id||s.parts?.some(part=>part.id===page.id));if(!sight)return [];
  const within=sight.id===page.id?[]:[`Part of ${sight.en}`];
  if(!sight.at){const station=Object.values(stations).find(st=>Object.values(st.maps??{}).includes(page.id as never));if(!station)return within;const side=Object.entries(station.maps!).find(([,place])=>place===page.id)![0];return [`${station.en} Station`,`Out of its ${side} exit`,...within]}
  const area=areas.find(a=>onMap(a,sight.at!))?.en,foot=Object.entries(sight.foot??{}).sort((a,b)=>a[1]-b[1])[0],bus=busLines.find(b=>b.sights.some(([,en])=>en===sight.en));
  const way=sight.walk?`A short walk from ${sight.walk.slice(0,2).map(ja=>stopNames[ja]).join(' or ')}`:foot?`${foot[1]} km from ${stopNames[foot[0]]}`:'';
  return [...(area?[area]:[]),...within,...(way?[way]:[]),...(bus?[`Bus ${bus.no} from ${bus.stops.map(ja=>stopNames[ja]).slice(0,2).join(' or ')}`]:[])];
}
/** The scratch card on each place's left page: a silver coat over where it is, scratched off by the pointer (mouse or finger), the right stick's sweeps or, at a press of X, by itself; only what is scratched shows, nothing is uncovered at once.
 * Each coat is kept as scratched in `localStorage['yorimichi-scratch']` (its mask, a bit a pixel, base64; `1` once none of it is left). */
const card:Rect=[left[0]+12,left[1]+204,140,60],scratchKey='yorimichi-scratch';
const saved:Record<string,string>=(()=>{try{const data=JSON.parse(localStorage.getItem(scratchKey)||'{}');return Array.isArray(data)?Object.fromEntries(data.map((id:string)=>[id,'1'])):data}catch{return {}}})();
const coats=new Map<string,{canvas:HTMLCanvasElement;mask:Uint8Array;left:number}>();
/** Writes the coats scratched since the last time. */
function keepCoats(){
  for(const [id,{mask,left}] of coats){if(!left){saved[id]='1';continue}const bytes=new Uint8Array(Math.ceil(mask.length/8));mask.forEach((on,i)=>{if(on)bytes[i>>3]|=1<<(i&7)});saved[id]=btoa(String.fromCharCode(...bytes))}
  try{localStorage.setItem(scratchKey,JSON.stringify(saved))}catch{}
}
function coatOf(id:string){
  let coat=coats.get(id);if(coat)return coat.left?coat:undefined;if(saved[id]==='1')return;
  const [,,w,h]=card,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const g=canvas.getContext('2d')!;
  box(g,0,0,w,h,'#9aa0a8','#767c85');
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const band=(x+y*2)%46,b=bayer[(y&3)*4+(x&3)];if(band<10&&b<(band<5?9:4))box(g,x,y,1,1,'#c3c8cf');else if(b===15)box(g,x,y,1,1,'#8a9098')}
  for(let k=-5;k<=5;k++){const r=Math.round(Math.sqrt(30-k*k));box(g,24-r,30+k,r*2,1,k<0?'#e0b84a':'#c99a30')}box(g,22,27,4,6,'#f4d870');
  write(g,'SCRATCH',w/2+10,17,'#4c525a','center');write(g,'WHERE IS IT?',w/2+10,33,'#5e646c','center');
  const mask=new Uint8Array(w*h).fill(1),bytes=saved[id]?Uint8Array.from(atob(saved[id]),c=>c.charCodeAt(0)):null;
  if(bytes)mask.forEach((_,i)=>{if(!(bytes[i>>3]>>(i&7)&1)){mask[i]=0;g.clearRect(i%w,i/w|0,1,1)}});
  coat={canvas,mask,left:mask.reduce((n,on)=>n+on,0)};coats.set(id,coat);return coat.left?coat:undefined;
}
/** Scratches the coat round a point of the card (its own pixels). */
function scratch(id:string,cx:number,cy:number,r=6){
  const coat=coatOf(id);if(!coat)return;const [,,w,h]=card,g=coat.canvas.getContext('2d')!;
  for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(h-1,cy+r);y++)for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(w-1,cx+r);x++){const d=(x-cx)**2+(y-cy)**2;if(d<=r*r&&(d<(r-1)**2||Math.random()<.5)&&coat.mask[y*w+x]){coat.mask[y*w+x]=0;coat.left--;g.clearRect(x,y,1,1)}}
}
/** A photo, smoothed, on the pixel-art page, in book pixels. */
function photo(g:CanvasRenderingContext2D,image:CanvasImageSource,x:number,y:number,w:number,h:number){g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(image,x,y,w,h);g.imageSmoothingEnabled=false}

/** The album, a full-screen overlay: the contents (a print per place, blank where not yet found), a spread per place and each photo up close. From a place's camera (`start`) it opens on that page and closes from there.
 * Arrows, D-pad or stick, Enter or A to open, LB / RB or Page Up / Down for the previous or next place, Esc or B to go back; the pointer clicks prints and turns pages at their corners. */
export class PhotoBook{
  private overlay=document.createElement('div');private canvas=document.createElement('canvas');private g=this.canvas.getContext('2d')!;
  private mode:'contents'|'page'|'close'='contents';private page=0;private photo=0;private focus=0;private photos:Shelf={};
  private frame=0;private watcher:ResizeObserver;private k=1;private rubbing:[number,number]|null=null;private sweep:[number,number]|null=null;private auto=-1;private targets:{rect:Rect;act:()=>void;hover?:()=>void}[]=[];
  private flip:{from:HTMLCanvasElement;to:HTMLCanvasElement;start:number;by:1|-1}|null=null;
  private held:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[];private repeatAt=0;private lastDir='';
  constructor(private found:Set<string>,private start:string|null,private close:()=>void){
    this.overlay.style.cssText='position:fixed;inset:0;z-index:60;background:#3a2518;outline:none;overflow:hidden;touch-action:manipulation;user-select:none';this.overlay.tabIndex=-1;this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-label','Travel journal');
    this.canvas.style.cssText='position:absolute;display:block';
    this.overlay.append(this.canvas);document.body.append(this.overlay);this.overlay.focus();
    this.watcher=new ResizeObserver(()=>this.fit());this.watcher.observe(this.overlay);this.fit();
    const at=start?pages.findIndex(page=>page.id===start):-1;if(at>=0){this.mode='page';this.page=this.focus=at}
    document.addEventListener('keydown',this.keydown,true);
    // Scratching: a press on the coat and a drag, finger or mouse.
    this.canvas.style.touchAction='none';
    const onCoat=(x:number,y:number)=>this.mode==='page'&&!this.flip&&inside(card,x,y)&&!!coatOf(pages[this.page].id);
    this.canvas.addEventListener('pointermove',event=>{const [x,y]=this.at(event);if(this.rubbing){this.rub(this.rubbing,[x-card[0],y-card[1]]);this.rubbing=[x-card[0],y-card[1]];return}if(onCoat(x,y)){this.canvas.style.cursor='crosshair';return}const target=this.targets.find(t=>inside(t.rect,x,y));target?.hover?.();this.canvas.style.cursor=target?'pointer':'default'});
    const stop=()=>{if(this.rubbing)keepCoats();this.rubbing=null};this.canvas.addEventListener('pointerup',stop);this.canvas.addEventListener('pointercancel',stop);
    this.overlay.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();const [x,y]=this.at(event);if(onCoat(x,y)){this.canvas.setPointerCapture(event.pointerId);this.rubbing=[x-card[0],y-card[1]];this.rub(this.rubbing,this.rubbing);return}const target=this.targets.find(t=>inside(t.rect,x,y));if(target)target.act();else if(!inside([8,6,464,288],x,y)||this.mode==='close')this.back()});
    loadShelf().then(photos=>{this.photos=photos});this.frame=requestAnimationFrame(this.tick);
  }
  /** The canvas at the screen's own pixels, `k` of them a book pixel. */
  private fit(){fitPicture(this.canvas,this.overlay,W,H);this.k=parseFloat(this.canvas.style.width)*(devicePixelRatio||1)/W;this.canvas.width=Math.round(W*this.k);this.canvas.height=Math.round(H*this.k);sharp=Math.max(2,Math.min(8,Math.ceil(this.k)));this.flip=null}
  /** Scratches along a stroke, a point a pixel. */
  private rub([ax,ay]:[number,number],[bx,by]:[number,number]){const id=pages[this.page].id,n=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)));for(let i=0;i<=n;i++)scratch(id,ax+(bx-ax)*i/n,ay+(by-ay)*i/n)}
  /** X: the coin goes over the whole card by itself, row after row. */
  private scratchAll(){if(this.mode==='page'&&coatOf(pages[this.page].id)&&this.auto<0)this.auto=0}
  private autoAt(s:number):[number,number]{const w=card[2],row=Math.floor(s/w),x=s%w;return [row%2?w-1-x:x,3+row*6]}
  private at(event:PointerEvent):[number,number]{const r=this.canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H]}
  private open=(i:number)=>this.found.has(pages[i].id)||pages[i]===roadPage;
  private list=()=>this.open(this.page)?this.photos[pages[this.page].id]??[]:[];

  // Moving about: every change of spread turns a page (`turn`), the close-up does not.
  private turn(by:1|-1,change:()=>void){if(this.flip)return;const {width,height}=this.canvas,from=document.createElement('canvas');from.width=width;from.height=height;from.getContext('2d')!.drawImage(this.canvas,0,0);change();const to=document.createElement('canvas');to.width=width;to.height=height;this.flip={from,to,start:performance.now(),by}}
  private show(i:number){this.turn(1,()=>{this.mode='page';this.page=this.focus=i;this.photo=0})}
  private next(by:1|-1){if(this.mode==='contents')return;const i=this.page+by;if(i>=0&&i<pages.length)this.turn(by,()=>{this.mode='page';this.page=this.focus=i;this.photo=0})}
  private pick(i:number){const n=this.list().length;if(n)this.photo=(i+n)%n}
  private move(by:number){
    if(this.mode==='contents'){const to=Math.max(0,Math.min(pages.length-1,this.focus+by));if(Math.floor(to/perSpread)!==Math.floor(this.focus/perSpread))this.turn(to>this.focus?1:-1,()=>{this.focus=to});else this.focus=to}
    else this.pick(this.photo+by);
  }
  private choose(){if(this.mode==='contents')this.show(this.focus);else if(this.mode==='page'){if(this.list().length)this.mode='close'}else this.mode='page'}
  private back(){
    if(this.mode==='close'){this.mode='page';return}
    if(this.mode==='page'&&!this.start){this.turn(-1,()=>{this.mode='contents';this.focus=this.page});return}
    this.destroy();this.close();
  }
  private keydown=(event:KeyboardEvent)=>{
    event.preventDefault();event.stopPropagation();if(this.flip)return;const vertical=this.mode==='contents'?columns:this.mode==='page'?columns:1;
    const keys:Record<string,()=>void>={ArrowLeft:()=>this.move(-1),ArrowRight:()=>this.move(1),ArrowUp:()=>this.move(-vertical),ArrowDown:()=>this.move(vertical),KeyA:()=>this.move(-1),KeyD:()=>this.move(1),KeyW:()=>this.move(-vertical),KeyS:()=>this.move(vertical),
      PageUp:()=>this.next(-1),PageDown:()=>this.next(1),KeyQ:()=>this.next(-1),KeyE:()=>this.next(1),Enter:()=>this.choose(),Space:()=>this.choose(),KeyX:()=>this.scratchAll(),Escape:()=>this.back(),Backspace:()=>this.back()};
    const fn=keys[event.code];if(fn&&(!event.repeat||event.code.startsWith('Arrow')))fn();
  };
  /** The pad, as keys: a press at a time, the D-pad or stick held repeating; LB / RB the previous or next place, Y closes as it opened. */
  private pad(){
    const p=connectedPad();if(!p)return;const now=performance.now(),pressed=p.buttons.map(b=>b.pressed),was=this.held,edge=(i:number)=>pressed[i]&&!was[i];this.held=pressed;if(this.flip)return;
    const [x=0,y=0]=p.axes,dir=pressed[14]||x<-.5?'ArrowLeft':pressed[15]||x>.5?'ArrowRight':pressed[12]||y<-.5?'ArrowUp':pressed[13]||y>.5?'ArrowDown':'';
    if(dir&&(dir!==this.lastDir||now>this.repeatAt)){this.repeatAt=now+(dir!==this.lastDir?380:160);const v=this.mode==='close'?1:columns;this.move({ArrowLeft:-1,ArrowRight:1,ArrowUp:-v,ArrowDown:v}[dir]!)}this.lastDir=dir;
    if(edge(0))this.choose();else if(edge(1))this.back();else if(edge(3)){this.destroy();this.close()}else if(edge(4))this.next(-1);else if(edge(5))this.next(1);else if(edge(2))this.scratchAll();
    // The right stick sweeps the coin over the card, its tilt the coin's place on it.
    const [,, sx=0,sy=0]=p.axes,id=this.mode==='page'?pages[this.page].id:'';
    if(Math.hypot(sx,sy)>.3&&id&&coatOf(id)){const at:[number,number]=[Math.max(0,Math.min(1,(sx+1)/2))*(card[2]-1),Math.max(0,Math.min(1,(sy+1)/2))*(card[3]-1)];this.rub(this.sweep??at,at);this.sweep=at}else{if(this.sweep)keepCoats();this.sweep=null}
  }

  private tick=()=>{
    if(!this.overlay.isConnected)return;this.pad();const g=this.g;
    if(this.auto>=0){const id=pages[this.page]?.id,end=card[2]*10;if(this.mode!=='page'||!coatOf(id)||this.auto>=end){this.auto=-1;keepCoats()}else{const from=this.autoAt(this.auto);this.auto+=12;this.rub(from,this.autoAt(Math.min(this.auto,end-1)))}}
    if(this.flip){
      const {from,to,start,by}=this.flip,t=Math.min(1,(performance.now()-start)/320),k=this.k;this.paint(to.getContext('2d')!);g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;
      // Both spreads at the screen's pixels, placed in book pixels.
      const part=(src:HTMLCanvasElement,sx:number,sy:number,sw:number,sh:number,dx:number,dy:number,dw:number,dh:number)=>g.drawImage(src,sx*k,sy*k,sw*k,sh*k,dx*k,dy*k,dw*k,dh*k),line=(x:number,y:number,h:number)=>{g.fillStyle='#a8987088';g.fillRect(x*k,y*k,k,h*k)};
      // The turning leaf, squeezed towards the spine and out the other side: the page being turned over, then the back of it landing.
      const [lx,ly,lw,lh]=left,rx=right[0],rw=right[2],y0=ly-6,hh=lh+12,ease=t<.5?2*t*t:1-2*(1-t)*(1-t);
      g.drawImage(to,0,0);
      if(by>0){part(from,0,0,spine,H,0,0,spine,H);if(ease<.5){const w=Math.max(1,Math.round(rw*(1-2*ease)));part(from,rx,y0,rw,hh,spine,y0,w,hh);line(spine+w-1,y0+6,lh)}else{const w=Math.max(1,Math.round(lw*(2*ease-1)));part(to,lx,y0,lw,hh,spine-w,y0,w,hh);line(spine-w,y0+6,lh)}}
      else{part(from,spine,0,W-spine,H,spine,0,W-spine,H);if(ease<.5){const w=Math.max(1,Math.round(lw*(1-2*ease)));part(from,lx,y0,lw,hh,spine-w,y0,w,hh);line(spine-w,y0+6,lh)}else{const w=Math.max(1,Math.round(rw*(2*ease-1)));part(to,rx,y0,rw,hh,spine,y0,w,hh);line(spine+w-1,y0+6,lh)}}
      if(t>=1)this.flip=null;
    }else this.paint(g);
    this.frame=requestAnimationFrame(this.tick);
  };
  private paint(g:CanvasRenderingContext2D){
    this.targets=[];g.setTransform(this.k,0,0,this.k,0,0);g.imageSmoothingEnabled=false;g.drawImage(backdrop(),0,0);
    if(this.mode==='contents')this.contents(g);else this.spread(g);
    if(this.mode==='close')this.closeUp(g);
    const hint=this.mode==='contents'?'Arrows choose · Enter or A open · Esc or B close':this.mode==='page'?'Scratch the card · ←→ photos · Enter/A up close · LB RB places · Esc/B back':'←→ photos · Esc or B back';
    g.font='10px "Yorimichi Bitmap"';const hw=Math.ceil(g.measureText(hint).width)+20;box(g,(W-hw)/2,H-19,hw,15,'#1c110bd8','#5a3f2c');write(g,hint,W/2,H-16,'#f0d0a8','center');
  }

  // What goes on the pages.
  private corners(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,size:number){for(let k=0;k<size;k++){const n=size-k;box(g,x,y+k,n,1,ink);box(g,x+w-n,y+k,n,1,ink);box(g,x,y+h-1-k,n,1,ink);box(g,x+w-n,y+h-1-k,n,1,ink)}}
  private mounted(g:CanvasRenderingContext2D,image:CanvasImageSource|null|undefined,x:number,y:number,w:number,h:number,border:number,corner:number){
    box(g,x+2,y+2,w,h,'#c8b48a');box(g,x,y,w,h,mount,'#d6c49a');
    if(image)photo(g,image,x+border,y+border,w-border*2,h-border*2);else{box(g,x+border,y+border,w-border*2,h-border*2,'#e6d8b4');if(image===null)write(g,'？',x+w/2,y+h/2-5,faint,'center')}
    this.corners(g,x+border-2,y+border-2,w-border*2+4,h-border*2+4,corner);
  }
  private dashes(g:CanvasRenderingContext2D,x:number,y:number,w:number){for(let k=0;k<w;k+=4)box(g,x+k,y,2,1,rule)}
  private fitted(g:CanvasRenderingContext2D,text:string,width:number){g.font='10px "Yorimichi Bitmap"';let t=text;while(t.length>1&&g.measureText(t).width>width)t=t.slice(0,-1);return t}
  /** A page corner curled up, to turn the page there. */
  private curl(g:CanvasRenderingContext2D,toRight:boolean,act:()=>void){
    const s=14,x=toRight?right[0]+right[2]-s:left[0],y=left[1]+left[3]-s;
    for(let k=0;k<s;k++){const n=k+1;if(toRight){box(g,x+s-n,y+k,n,1,'#d9c9a0');box(g,x+s-n,y+k,1,1,edge)}else{box(g,x,y+k,n,1,'#d9c9a0');box(g,x+n-1,y+k,1,1,edge)}}
    this.targets.push({rect:[x-4,y-4,s+8,s+8],act});
  }
  private contents(g:CanvasRenderingContext2D){
    const spread=Math.floor(this.focus/perSpread),[lx,,lw]=left,cx=lx+lw/2,memories=pages.filter((page,i)=>page!==roadPage&&this.open(i)).length,chosen=pages[this.focus],seen=this.open(this.focus);
    g.font='20px "Yorimichi Bitmap"';crispText(g,'旅の日記',Math.round(cx-g.measureText('旅の日記').width/2),24,ink);
    write(g,'TRAVEL JOURNAL',cx,48,faint,'center');write(g,`${memories} / ${memoryPages.length} memories`,cx,61,red,'center');this.dashes(g,lx+12,78,lw-24);
    write(g,seen?chosen.ja:'？',cx,86,ink,'center');write(g,seen?wrap(g,chosen.en,lw-24)[0]??'':'Not yet found',cx,99,faint,'center');
    for(let i=spread*perSpread;i<Math.min(pages.length,(spread+1)*perSpread);i++){
      const [x,y,w,h]=slot(i),page=pages[i],open=this.open(i),cover=this.photos[page.id]?.[0],select=()=>{this.focus=i},on=i===this.focus;
      if(open){const ready=cover?printsOf(`${page.id}/${cover}`):null;this.mounted(g,ready===undefined?undefined:ready?.thumb??null,x,y,w,h,2,3);write(g,this.fitted(g,page.ja,w+4),x+w/2,y+h+3,on?red:ink,'center')}
      else{for(let k=0;k<w;k+=4){box(g,x+k,y,2,1,rule);box(g,x+k,y+h-1,2,1,rule)}for(let k=0;k<h;k+=4){box(g,x,y+k,1,2,rule);box(g,x+w-1,y+k,1,2,rule)}write(g,'？',x+w/2,y+h/2-5,rule,'center')}
      if(on){box(g,x-3,y-3,w+6,1,red);box(g,x-3,y+h+2,w+6,1,red);box(g,x-3,y-3,1,h+6,red);box(g,x+w+2,y-3,1,h+6,red)}
      this.targets.push({rect:[x-3,y-3,w+6,h+16],act:()=>{select();this.show(i)},hover:select});
    }
    if(spread>0)this.curl(g,false,()=>this.move(-perSpread));
    if((spread+1)*perSpread<pages.length)this.curl(g,true,()=>this.move(perSpread));
  }
  private spread(g:CanvasRenderingContext2D){
    const page=pages[this.page],seen=this.open(this.page),list=this.list(),n=list.length,[lx,ly,lw]=left,[rx,ry,rw,rh]=right,ja=seen?page.ja:'？';
    g.font='20px "Yorimichi Bitmap"';if(g.measureText(ja).width<=lw-28)crispText(g,ja,lx+14,ly+12,ink);else write(g,ja,lx+14,ly+16,ink);
    wrap(g,seen?page.en:'Not yet found',lw-28).slice(0,2).forEach((line,i)=>write(g,line,lx+14,ly+38+i*12,faint));this.dashes(g,lx+12,ly+64,lw-24);
    // The contact sheet: every photo of the place, twelve at a time, the one on the right page outlined.
    const first=Math.floor(this.photo/sheet)*sheet;
    for(let i=first;i<Math.min(n,first+sheet);i++){
      const k=i-first,x=lx+14+(k%columns)*50,y=ly+74+Math.floor(k/columns)*40,ready=printsOf(`${page.id}/${list[i]}`);
      this.mounted(g,ready===undefined?undefined:ready?.thumb??null,x,y,44,34,2,3);
      if(i===this.photo){box(g,x-3,y-3,50,1,red);box(g,x-3,y+36,50,1,red);box(g,x-3,y-3,1,40,red);box(g,x+46,y-3,1,40,red)}
      this.targets.push({rect:[x-3,y-3,50,40],act:()=>{if(this.photo===i)this.mode='close';else this.photo=i}});
    }
    if(n>sheet)write(g,`${first+1}-${Math.min(n,first+sheet)} of ${n}`,lx+14,ly+190,faint);
    if(seen&&!n)wrap(g,'No photo on this page yet.',lw-28).forEach((line,i)=>write(g,line,lx+14,ly+80+i*12,faint));
    // The place's stamp, pressed a little unevenly, as at a station's stamp desk.
    if(page!==roadPage)this.scratchCard(g,page);
    if(seen&&page!==roadPage){
      const sx=lx+lw-46,sy=ly+226;
      for(let dy=-24;dy<=24;dy++)for(let dx=-24;dx<=24;dx++){const d=dx*dx+dy*dy,b=bayer[((dy+24)&3)*4+((dx+24)&3)];if((d<=576&&d>=484||d<=400&&d>=361)&&b<13)box(g,sx+dx,sy+dy,1,1,stamp)}
      g.font='20px "Yorimichi Bitmap"';crispText(g,[...page.ja][0],sx-10,sy-18,stamp);write(g,'寄り道',sx,sy+3,stamp,'center');
    }
    // The photo, mounted on the right page.
    if(n){
      const path=`${page.id}/${list[this.photo]}`,ready=printsOf(path),image=ready?ready.print:null,w=(image?Math.round(image.width/ready!.r):PW)+10,h=(image?Math.round(image.height/ready!.r):Math.round(PW*.75))+10,x=Math.round(rx+(rw-w)/2),y=Math.round(ry+10+(rh-40-h)/2);
      this.mounted(g,ready===undefined?undefined:image,x,y,w,h,5,6);
      this.targets.push({rect:[x,y,w,h],act:()=>{this.mode='close'}});
      const cy=ry+rh-24,cx=rx+rw/2;write(g,`${this.photo+1} / ${n}`,cx,cy,faint,'center');
      if(n>1){for(const [by,ax] of [[-1,cx-38],[1,cx+34]] as const){for(let k=0;k<4;k++)box(g,by<0?ax+3-k:ax+k,cy+1+k,1,7-k*2,red);this.targets.push({rect:[ax-6,cy-4,16,18],act:()=>this.pick(this.photo+by)})}}
    }else{const x=rx+20,y=ry+40,w=rw-40,h=150;for(let k=0;k<w;k+=4){box(g,x+k,y,2,1,rule);box(g,x+k,y+h-1,2,1,rule)}for(let k=0;k<h;k+=4){box(g,x,y+k,1,2,rule);box(g,x+w-1,y+k,1,2,rule)}if(!seen)write(g,'？',x+w/2,y+h/2-5,rule,'center')}
    const has=(by:number)=>this.page+by>=0&&this.page+by<pages.length;
    if(has(-1))this.curl(g,false,()=>this.next(-1));if(has(1))this.curl(g,true,()=>this.next(1));
  }
  /** The card: where the place is, under its coat until scratched; the coin over it while the pad scratches. */
  private scratchCard(g:CanvasRenderingContext2D,page:Page){
    const [x,y,w,h]=card;box(g,x+2,y+2,w,h,'#c8b48a');box(g,x,y,w,h,mount,'#d6c49a');
    write(g,'WHERE',x+6,y+5,red);let line=y+18;for(const text of whereabouts(page))for(const part of wrap(g,text,w-12)){if(line<=y+h-12)write(g,part,x+6,line,line===y+18?ink:faint);line+=12}
    const coat=coatOf(page.id);if(coat)g.drawImage(coat.canvas,x,y);
    const coin=this.auto>=0?this.autoAt(this.auto):this.sweep;if(coat&&coin){const [cx,cy]=[x+Math.round(coin[0]),y+Math.round(coin[1])];for(let k=-4;k<=4;k++){const r=Math.round(Math.sqrt(20-k*k));box(g,cx-r,cy+k,r*2,1,k<0?'#f0c850':'#c99a30')}box(g,cx-2,cy-3,3,2,'#fff0a8')}
  }
  private closeUp(g:CanvasRenderingContext2D){
    g.drawImage(veiled(),8,6);this.targets=[];
    const page=pages[this.page],list=this.list(),n=list.length,image=closeUpOf(`${page.id}/${list[this.photo]}`),fit=image?Math.min(FW/image.naturalWidth,FH/image.naturalHeight):0,w=(image?Math.round(image.naturalWidth*fit):Math.round(FH*4/3))+8,h=(image?Math.round(image.naturalHeight*fit):FH)+8,x=Math.round((W-w)/2),y=Math.round(7+(FH+8-h)/2);
    this.mounted(g,image,x,y,w,h,4,0);this.targets.push({rect:[x,y,w,h],act:()=>{this.mode='page'}});
    write(g,`${page.ja} · ${page.en}   ${this.photo+1} / ${n}`,W/2,FH+19,'#f0d0a8','center');
    if(n>1)for(const [by,ax] of [[-1,8],[1,W-20]] as const){for(let k=0;k<6;k++)box(g,by<0?ax+5-k:ax+6+k,H/2-16+k,1,11-k*2,'#f0d0a8');this.targets.push({rect:[ax-4,H/2-24,24,32],act:()=>this.pick(this.photo+by)})}
  }
  destroy(){keepCoats();cancelAnimationFrame(this.frame);this.watcher.disconnect();document.removeEventListener('keydown',this.keydown,true);this.overlay.remove()}
}
