import { connectedPad } from './pad';
import { photoBase, photoUrl } from './access';
import { memoryPages, roadPage } from './sights';

/** The photos of each page by its id: public/photos/index.json, written by scripts/import-photos.mjs and, like the photos, kept out of the repository. Without it the album's pages are empty. */
type Shelf=Record<string,string[]>;
let shelf:Promise<Shelf>|null=null;
const loadShelf=()=>shelf??=fetch(`${photoBase}index.json`).then(r=>r.ok?r.json() as Promise<Shelf>:{}).catch(()=>({}));
const pages=[...memoryPages,roadPage],columns=6;
/** Each page's cover (its first photo) as a URL, decrypted once and kept for the session: the index is redrawn on every move of the focus. */
const covers=new Map<string,Promise<string>>(),coverOf=(path:string)=>{let url=covers.get(path);if(!url){url=photoUrl(path);covers.set(path,url);url.catch(()=>covers.delete(path))}return url};
/** The album, a full-screen DOM overlay: a page for each place, those not yet found blank, and each page's photos one at a time. From a place's camera (`start`) it opens on that page and closes from there.
 * Arrows, D-pad or stick, Enter or A to open, Esc or B to go back. */
export class PhotoBook{
  private overlay=document.createElement('div');private page=-1;private photo=0;private focus=0;private photos:Shelf={};private held=0;private pressed=new Set<number>();private frame=0;private imageUrl:string|null=null;private render=0;
  constructor(private found:Set<string>,private start:string|null,private close:()=>void){
    this.overlay.style.cssText='position:fixed;inset:0;z-index:60;background:#10242a;color:#f0e6cb;font-family:"Yorimichi JP",monospace;display:flex;flex-direction:column;user-select:none';this.overlay.tabIndex=-1;
    this.overlay.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();this.key(event.key)});document.body.append(this.overlay);this.overlay.focus();
    if(start)this.page=pages.findIndex(page=>page.id===start);this.draw();
    loadShelf().then(photos=>{if(this.overlay.isConnected){this.photos=photos;this.draw()}});this.frame=requestAnimationFrame(this.poll);
  }
  private open=(i:number)=>this.found.has(pages[i].id)||pages[i]===roadPage;
  private key(key:string){
    if(key==='Escape'||key==='Backspace'){this.back();return}
    if(this.page>=0){const n=this.photos[pages[this.page].id]?.length??0;if(n&&(key==='ArrowRight'||key==='ArrowDown'))this.turn(1,n);if(n&&(key==='ArrowLeft'||key==='ArrowUp'))this.turn(-1,n);return}
    const step={ArrowRight:1,ArrowLeft:-1,ArrowDown:columns,ArrowUp:-columns}[key];
    if(step){this.focus=Math.max(0,Math.min(pages.length-1,this.focus+step));this.draw()}
    if((key==='Enter'||key===' ')&&this.open(this.focus))this.show(this.focus);
  }
  private turn(by:number,n:number){this.photo=(this.photo+by+n)%n;this.draw()}
  private show(i:number){this.page=i;this.photo=0;this.draw()}
  private back(){if(this.page<0||this.start){this.destroy();this.close();return}this.focus=this.page;this.page=-1;this.draw()}
  /** The pad, as keys: a press at a time, the stick held repeating slowly. */
  private poll=()=>{
    const pad=connectedPad();if(pad){
      const edge=(i:number)=>{const on=!!pad.buttons[i]?.pressed,was=this.pressed.has(i);if(on)this.pressed.add(i);else this.pressed.delete(i);return on&&!was};
      if(edge(0))this.key('Enter');else if(edge(1))this.key('Escape');
      if(edge(12))this.key('ArrowUp');if(edge(13))this.key('ArrowDown');if(edge(14))this.key('ArrowLeft');if(edge(15))this.key('ArrowRight');
      const [x=0,y=0]=pad.axes,now=performance.now(),dir=Math.abs(x)>.5?(x>0?'ArrowRight':'ArrowLeft'):Math.abs(y)>.5?(y>0?'ArrowDown':'ArrowUp'):'';
      if(!dir)this.held=0;else if(now>this.held){this.key(dir);this.held=now+320}
    }
    if(this.overlay.isConnected)this.frame=requestAnimationFrame(this.poll);
  };
  private draw(){
    const render=++this.render;if(this.imageUrl){URL.revokeObjectURL(this.imageUrl);this.imageUrl=null}
    this.overlay.replaceChildren();
    if(this.page<0){this.index();return}
    const page=pages[this.page],list=this.photos[page.id]??[],name=document.createElement('div');
    name.textContent=`${page.ja} · ${page.en}${list.length?`   ${this.photo+1} / ${list.length}`:''}`;name.style.cssText='padding:10px 16px;font-size:18px;text-align:center';
    const stage=document.createElement('div');stage.style.cssText='flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:0 12px 12px';
    if(list.length){
      const image=document.createElement('img');image.alt=page.en;image.draggable=false;image.style.cssText='max-width:100%;max-height:100%;object-fit:contain;border:6px solid #f0e6cb;cursor:pointer';
      image.addEventListener('click',event=>this.turn(event.offsetX<image.clientWidth/3?-1:1,list.length));stage.append(image);
      photoUrl(`${page.id}/${list[this.photo]}`).then(url=>{if(render!==this.render||!this.overlay.isConnected){URL.revokeObjectURL(url);return}this.imageUrl=url;image.src=url}).catch(()=>{if(render===this.render)stage.textContent='Photo unavailable.'});
    }else stage.textContent='No photo on this page.';
    const leave=document.createElement('button');leave.textContent='Close';leave.style.cssText='position:absolute;top:8px;right:12px;font:inherit;padding:4px 12px;background:#415c4f;color:#fff0d4;border:0;cursor:pointer';leave.onclick=()=>this.back();
    this.overlay.append(name,stage,leave);
  }
  private index(){
    const found=pages.filter((_,i)=>this.open(i)&&pages[i]!==roadPage).length,title=document.createElement('div');title.textContent=`My travel journal · ${found} / ${memoryPages.length} memories`;title.style.cssText='padding:12px 16px;font-size:20px';
    const grid=document.createElement('div');grid.style.cssText=`flex:1;min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(${columns},1fr);grid-auto-rows:minmax(110px,1fr);gap:8px;padding:0 16px 16px`;
    pages.forEach((page,i)=>{
      const open=this.open(i),cover=this.photos[page.id]?.[0],card=document.createElement('button');card.textContent=open?`${page.ja}\n${page.en}`:'？';
      card.style.cssText=`font:inherit;font-size:13px;white-space:pre-line;color:#fff;text-shadow:0 1px 3px #000;cursor:${open?'pointer':'default'};display:flex;align-items:flex-end;justify-content:center;padding:6px;background:${open?'#415c4f':'#22393d'};border:3px solid ${i===this.focus?'#f3d76b':'#0000'}`;
      if(open&&cover)coverOf(`${page.id}/${cover}`).then(url=>{if(card.isConnected)card.style.background=`center/cover url("${url}")`}).catch(()=>{});
      card.onclick=()=>{if(open)this.show(i)};grid.append(card);if(i===this.focus)queueMicrotask(()=>card.scrollIntoView({block:'nearest'}));
    });
    const leave=document.createElement('button');leave.textContent='Close';leave.style.cssText='position:absolute;top:8px;right:12px;font:inherit;padding:4px 12px;background:#415c4f;color:#fff0d4;border:0;cursor:pointer';leave.onclick=()=>this.back();
    this.overlay.append(title,grid,leave);
  }
  destroy(){this.render++;if(this.imageUrl)URL.revokeObjectURL(this.imageUrl);cancelAnimationFrame(this.frame);this.overlay.remove()}
}
