import { darkness } from './clock';
import { box } from './hall-scene';
import { nearest, Purse, write, type Rect, type Target } from './konbini-till';
import { connectedPad } from './pad';
import { fitPicture } from './ticket-gate';
import { isCoin, machineSound, makeChange, saveWallet, walletTotal, type Wallet } from './wallet';

// The picture, in pixels: the front of a Kyoto city bus from the aisle, the door on the left, the fare box in the middle, the driver at the wheel on the right, as in Japan, and the purse down the right edge.
const W=320,H=200,lit='#ffce42',steel='#56616c',plate='#343d47';
const led:Rect=[48,76,146,94],fareSlot:Rect=[48,98,96,138],noteSlot:Rect=[100,98,146,138],tray:Rect=[100,152,146,178],leave:Rect=[W-52,H-14,W-2,H-1];
const inside=([l,t,r,b]:Rect,x:number,y:number)=>x>=l&&x<r&&y>=t&&y<b;
/** Getting off a bus, at the fare box by the driver: coins or a note go in until the fare is covered, what is over comes back in the tray, and the doors open. With too little money to pay, the driver puts the traveller off (`off(false)`), their coins back. */
export class BusFare {
  private overlay=document.createElement('div');private viewport=document.createElement('div');private canvas=document.createElement('canvas');private g=this.canvas.getContext('2d')!;
  private purse:Purse;private paid=0;private change:number[]=[];private doneAt=0;private backdrop:HTMLCanvasElement|null=null;
  private over:Target|null=null;private cursor:Target|null=null;private carried:{target:Target;x:number;y:number;sx:number;sy:number;moved:boolean}|null=null;
  private resize=new ResizeObserver(()=>fitPicture(this.canvas,this.viewport,W,H));private frame=0;private disposed=false;private lastStick:[number,number]=[0,0];private lastPadButtons:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[];
  constructor(private fare:number,private wallet:Wallet,private walletChanged:()=>void,private off:(paid:boolean)=>void){
    this.purse=new Purse(wallet);this.overlay.className='machine-hall konbini-view';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','The bus fare box');
    this.viewport.className='hall-viewport gate-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','The fare box by the driver. Drag coins from the purse into it for the exact fare, or a coin or note onto the change slots. The arrows or the D-pad move, E or A presses.');
    this.canvas.width=W;this.canvas.height=H;this.canvas.className='gate-picture';this.viewport.append(this.canvas);this.overlay.append(this.viewport);
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    this.viewport.addEventListener('pointermove',this.pointerMove);this.viewport.addEventListener('pointerleave',()=>{this.over=null});this.viewport.addEventListener('pointerdown',this.pointerDown);this.viewport.addEventListener('pointerup',this.pointerUp);this.viewport.addEventListener('pointercancel',()=>{this.carried=null});
    document.body.append(this.overlay);this.resize.observe(this.viewport);fitPicture(this.canvas,this.viewport,W,H);this.viewport.focus();this.frame=requestAnimationFrame(this.tick);
    document.fonts?.load('10px "Yorimichi Bitmap"').then(()=>{this.backdrop=null}).catch(()=>{});
  }
  private keep(){saveWallet(this.wallet);this.walletChanged()}
  private point(event:PointerEvent){const r=this.canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H}}
  private held(){return walletTotal(this.wallet)+this.paid+this.change.reduce((sum,value)=>sum+value,0)}
  /** A piece into the box; once the fare is covered, the rest comes back in the tray, fewest pieces first. */
  private pay(value:number){
    if(!this.wallet[value]||this.doneAt)return;
    this.wallet[value]--;this.paid+=value;machineSound(isCoin(value)?'coin':'note');this.keep();
    if(this.paid>=this.fare){this.change=makeChange(this.paid-this.fare);this.paid=this.fare;this.doneAt=performance.now()+(this.change.length?1600:900)}
  }
  private collect(){for(const value of this.change.splice(0))this.wallet[value]=(this.wallet[value]??0)+1;this.keep()}
  private targets():Target[]{
    const list:Target[]=[];
    for(const {value,rect} of this.purse.spots())if(this.wallet[value])list.push({rect,act:()=>this.pay(value),carry:(g,x,y)=>this.purse.paint(g,value,x-(isCoin(value)?7:14),y-7),drop:(x,y)=>{if(inside(fareSlot,x,y)||inside(noteSlot,x,y))this.pay(value);else machineSound('reject')}});
    if(this.change.length)list.push({rect:tray,act:()=>{this.collect();machineSound('coin')}});
    if(this.held()<this.fare)list.push({rect:leave,act:()=>this.exit()});
    return list;
  }
  private target(x:number,y:number){return this.targets().find(t=>inside(t.rect,x,y))??null}
  private pointerMove=(event:PointerEvent)=>{const p=this.point(event),held=this.carried;if(held){held.x=p.x;held.y=p.y;held.moved||=Math.hypot(p.x-held.sx,p.y-held.sy)>4;return}this.over=this.target(p.x,p.y);this.cursor=null;this.viewport.style.cursor=this.over?'pointer':''};
  private pointerDown=(event:PointerEvent)=>{this.viewport.focus();const p=this.point(event),target=this.target(p.x,p.y);if(!target)return;if(target.carry){this.carried={target,x:p.x,y:p.y,sx:p.x,sy:p.y,moved:false};this.viewport.setPointerCapture(event.pointerId)}else target.act()};
  private pointerUp=()=>{const held=this.carried;if(!held)return;this.carried=null;if(held.moved)held.target.drop?.(held.x,held.y);else held.target.act()};
  private steer(dx:number,dy:number){const list=this.targets(),from=list.find(t=>this.cursor&&t.rect.join()===this.cursor.rect.join());this.cursor=from?nearest(list,from,dx,dy)??from:list[0]}
  private press(){const on=this.targets().find(t=>this.cursor&&t.rect.join()===this.cursor.rect.join());if(on)on.act();else this.steer(0,1)}
  private exit(){const paid=this.paid>=this.fare;this.destroy();this.off(paid)}
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();event.preventDefault();
    const dir={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[event.code];
    if(dir)this.steer(dir[0],dir[1]);else if((event.code==='Enter'||event.code==='KeyE'||event.code==='Space')&&!event.repeat)this.press();
  };
  /** What does not change: the cab, the street through the windscreen, the driver from behind, the fare box. */
  private paintBackdrop(){
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d')!,night=darkness()>.5;g.imageSmoothingEnabled=false;
    const r=(x:number,y:number,w:number,h:number,c:string)=>box(g,x,y,w,h,c),oval=(cx:number,cy:number,rx:number,ry:number,c:string)=>{for(let y=-ry;y<ry;y++){const w=Math.round(rx*Math.sqrt(1-((y+.5)/ry)**2));r(cx-w,cy+y,w*2,1,c)}};
    r(0,0,W,H,'#4a5058');
    // The windscreen: a street of low tiled houses, hills at its end, the road running up to them.
    const sky=night?['#0e1428','#141c34','#1c2640']:['#8fc2e0','#a8d0e4','#c8e0e4'];sky.forEach((c,i)=>r(0,28+i*9,212,9,c));
    oval(40,58,60,14,night?'#1a2438':'#7fa596');oval(150,60,74,12,night?'#1e2a3e':'#6d9a84');oval(214,58,50,16,night?'#1a2438':'#7fa596');
    for(const [x,w,h] of [[0,34,16],[34,26,12],[132,30,13],[162,50,16]] as const){r(x,72-h,w,h,night?'#2a2c38':'#5a4232');r(x-1,70-h,w+2,3,night?'#1a1c26':'#4b5456');for(let wx=x+3;wx<x+w-4;wx+=7)r(wx,74-h,4,5,night?'#e8c870':'#d8cfae')}
    r(0,72,212,16,night?'#23293a':'#6d736e');for(let i=0;i<16;i++){const w=Math.round(10+i*7);r(106-w,72+i,w*2,1,night?'#2c3244':'#7f8a84')}for(let i=0;i<4;i++)r(104,73+i*4,3+i,2+i,'#e6e3cc');
    // Pillars, the roof with its LED board, the mirror.
    r(0,0,W,10,'#d8d4c8');r(0,9,W,2,'#b5b1a4');r(14,11,186,17,'#14110e');r(14,11,186,1,'#2e2a26');write(g,'ご乗車ありがとうございます',107,14,'#ff9a2c','center');
    r(44,28,4,62,'#2a2e34');r(150,28,4,60,'#2a2e34');r(208,28,6,62,'#2a2e34');r(92,30,28,9,'#1d2026');r(94,32,24,5,night?'#3a4258':'#b8cad4');
    // The dash along the foot of the glass, wipers lying on it, the boards and buttons by the wheel.
    r(0,86,212,4,'#1d2026');r(0,90,212,16,'#2e3238');r(0,90,212,1,'#454a52');r(58,84,44,2,'#14171b');r(160,84,40,2,'#14171b');
    // The door: its folded glass leaves, the yellow pole, the step with its marked edge.
    r(0,28,44,160,'#2f6e5c');r(3,31,38,70,sky[2]);r(3,104,38,62,sky[1]);r(3,92,38,3,'#2f6e5c');r(21,28,2,160,'#1f4a3e');r(0,166,44,22,'#1f4a3e');r(30,30,5,150,'#e8b820');r(31,30,1,150,'#f6d860');
    r(0,188,214,12,'#6a6e70');for(let i=0;i<70;i++)r((i*37)%212,188+(i*13)%12,2,1,'#7a7e80');r(0,187,44,2,'#f0c820');
    // The driver from behind: wheel, arms, jacket, cap; the seat back before them.
    const jacket='#2c4058',skin='#d8ae86',glove='#f6f4ec';
    oval(180,106,27,7,'#14171b');oval(180,106,23,5,'#3c4048');
    oval(180,108,21,14,jacket);r(159,108,42,18,jacket);r(164,95,32,2,'#3e5674');r(155,101,8,7,jacket);r(197,101,8,7,jacket);r(152,103,7,6,glove);r(201,103,7,6,glove);r(152,108,7,1,'#c8c6bc');r(201,108,7,1,'#c8c6bc');
    r(175,87,10,6,skin);r(174,92,12,3,'#f4f2ea');oval(180,79,12,11,'#20242a');r(167,80,2,4,skin);r(191,80,2,4,skin);r(167,70,26,6,'#1a2433');r(169,64,22,7,'#2a3a50');r(171,63,18,2,'#3e5674');r(167,75,26,1,'#d8b04a');
    r(158,124,44,64,'#27496a');r(160,126,40,60,'#2f5a80');for(let y=130;y<184;y+=6)for(let x=162+(y%4);x<198;x+=6)r(x,y,2,2,'#27496a');r(156,182,48,6,'#1d2026');r(172,188,16,12,'#2a2e34');
    // The box on its post: brushed steel, its corners cut.
    r(82,182,30,18,'#2a2e34');r(76,196,42,4,'#1d2026');r(42,76,110,106,'#14171b');r(40,78,114,104,'#14171b');r(42,76,110,3,'#8a95a0');r(41,78,112,103,steel);r(44,74,106,4,'#68747f');for(let y=80;y<180;y+=3)r(41,y,112,1,'#5c6773');r(41,179,112,2,'#3c444c');r(41,78,2,103,'#7a858f');
    {const [l,t,rt,b]=led;box(g,l-2,t-2,rt-l+4,b-t+4,'#1d2026')}
    // The coins' hopper: a steel funnel, a window on its belt, the slit at its foot.
    {const [l,t,rt,b]=fareSlot,w=rt-l;box(g,l,t,w,b-t,plate,'#14171b');write(g,'運賃',(l+rt)/2,t+1,'#fffef2','center');for(let i=0;i<18;i++){const o=Math.round(i*.9);r(l+4+o,t+13+i,w-8-o*2,1,i%3?'#b8c0c8':'#98a2ac')}r(l+21,t+31,6,4,'#000')}
    // The note slot, its green arrows.
    {const [l,t,rt,b]=noteSlot;box(g,l,t,rt-l,b-t,plate,'#14171b');write(g,'紙幣',(l+rt)/2,t+1,'#fffef2','center');box(g,l+6,t+16,rt-l-12,6,'#000','#c9cdd0');for(let i=0;i<3;i++){r(l+15+i*7,t+26,4,1,'#5ee08a');r(l+16+i*7,t+27,2,2,'#5ee08a')}}
    // The IC reader, for the cards the traveller does not have.
    r(48,142,48,36,'#1d5fae');r(50,144,44,32,'#2a78cc');oval(72,156,10,8,'#f4f4ee');oval(72,156,7,5,'#2a78cc');r(70,153,4,6,'#f4f4ee');write(g,'ICカード',72,165,'#ffffff','center');
    {const [l,t,rt,b]=tray;write(g,'おつり',(l+rt)/2,t-11,'#fffef2','center');box(g,l,t,rt-l,b-t,'#14171b','#c9cdd0');r(l+1,t+1,rt-l-2,3,'#000')}
    return this.backdrop=canvas;
  }
  private draw(){
    const g=this.g;g.drawImage(this.backdrop??this.paintBackdrop(),0,0);
    const [l,t,r,b]=led;box(g,l,t,r-l,b-t,'#120806','#5b6462');write(g,this.doneAt?'ありがとう':`運賃 ${this.fare}円`,l+4,t+1,'#ff5a3c');if(this.paid&&!this.doneAt)write(g,`${this.fare-this.paid}`,r-4,t+1,'#ffd840','right');
    this.change.forEach((value,i)=>this.purse.paint(g,value,Math.round((tray[0]+tray[2])/2+Math.cos(i*2.4)*Math.min(14,3+i*2))-7,tray[1]+6+(i*5)%10));
    this.purse.draw(g);
    if(this.held()<this.fare){const [fl,ft,fr,fb]=leave;box(g,fl,ft,fr-fl,fb-ft,'#1d2622c0');write(g,'降りる',(fl+fr)/2,ft+2,'#f4f4ee','center')}
    const on=this.over??this.cursor;if(on&&!this.carried){const [x0,y0,x1,y1]=on.rect;box(g,x0,y0,x1-x0,1,lit);box(g,x0,y1-1,x1-x0,1,lit);box(g,x0,y0,1,y1-y0,lit);box(g,x1-1,y0,1,y1-y0,lit)}
    if(this.carried?.moved)this.carried.target.carry?.(g,Math.round(this.carried.x),Math.round(this.carried.y));
  }
  private tick=()=>{
    if(this.disposed)return;
    const pad=connectedPad();
    if(pad){
      const pressed=pad.buttons.map(b=>b.pressed),previous=this.lastPadButtons,edge=(i:number)=>pressed[i]&&!previous[i];this.lastPadButtons=pressed;
      const sx=Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0,sy=Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0,across=edge(14)?-1:edge(15)?1:sx!==this.lastStick[0]?sx:0,down=edge(12)?-1:edge(13)?1:sy!==this.lastStick[1]?sy:0;this.lastStick=[sx,sy];
      if(across)this.steer(across,0);if(down)this.steer(0,down);if(edge(0))this.press();
    }
    if(this.doneAt&&performance.now()>this.doneAt){this.exit();return}
    this.draw();this.frame=requestAnimationFrame(this.tick);
  };
  /** What is in the tray or, unpaid, in the box comes back to the purse. */
  destroy(){if(this.disposed)return;this.disposed=true;if(this.paid<this.fare&&this.paid)this.change.push(...this.coinsPaid());this.collect();cancelAnimationFrame(this.frame);this.resize.disconnect();this.overlay.remove()}
  private coinsPaid(){const out:number[]=[];let left=this.paid;for(const value of [100,50,10,5,1])while(left>=value){out.push(value);left-=value}return out}
}
