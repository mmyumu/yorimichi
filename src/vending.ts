import { darkness } from './clock';
import { dims, paintItem, shade, vendors, type Item, type Vendor, type VendorId } from './goods';
import { box } from './hall-scene';
import { nearest, Purse, wrap, write, yen, type Rect, type Target } from './konbini-till';
import { connectedPad } from './pad';
import { fitPicture } from './ticket-gate';
import { isCoin, machineSound, saveWallet, type Wallet } from './wallet';

/** A press point on the machine, with the drink its button sells. */
type Spot=Target&{item?:Item};
// The picture, in pixels: the machine fills its left, the purse its right (as at the till). Five drinks to a row behind the glass, each over its price strip and button; below, the hatch on the left, the note slot, then the display over the black coin plate (the change lever beside the coin slot, as on the real ones) and the cup at the foot.
const W=320,H=200,cols=5,cellW=38,cellH=44,glassX=11,glassY=15,sampleH=27,tall=1.75;
const hatchRect:Rect=[12,154,104,194],noteSlot:Rect=[108,154,130,180],led:Rect=[134,149,204,159],coinPlate:Rect=[134,160,204,184],lever:Rect=[136,171,170,184],coinSlot:Rect=[172,171,203,184],cup:Rect=[134,185,204,199],leave:Rect=[W-52,H-14,W-2,H-1];
// What it holds at most, and how long a drink takes to come down.
const creditMax=2000,fall=.7;
const cold='#2f78c8',hot='#d2402e',ink='#1d2622',lit='#ffce42',dark='#20242a';
const inside=([l,t,r,b]:Rect,x:number,y:number)=>x>=l&&x<r&&y>=t&&y<b;
/** Change as these machines give it: coins only, however it was paid. */
function coinsFor(amount:number){const pieces:number[]=[];for(const value of [500,100,50,10])while(amount>=value){pieces.push(value);amount-=value}return pieces}

/** Before a street vending machine, in first person: coins (no ¥1 or ¥5, which drop straight into the cup) or a ¥1,000 note go in, the buttons of what the credit covers light up, a button drops the drink into the hatch at the foot and the change into the cup, and the lever gives the credit back without buying. A pixel-art picture, as at the konbini. */
export class Vending {
  private overlay=document.createElement('div');
  private viewport=document.createElement('div');
  private canvas=document.createElement('canvas');
  private g=this.canvas.getContext('2d')!;
  private vendor:Vendor;
  private purse:Purse;
  private backdrop:HTMLCanvasElement|null=null;
  private credit=0;
  private tray:number[]=[];
  private hatch:Item[]=[];
  private falling:{item:Item;t:number}|null=null;
  private thud=0;
  private pulled=0;
  // The price asked for on the display, until when.
  private asked=0;
  private until=0;
  private got:Item|null=null;
  private overItem:Item|null=null;
  private over:Spot|null=null;
  private cursor:Spot|null=null;
  private carried:{target:Target;x:number;y:number;sx:number;sy:number;moved:boolean}|null=null;
  private resize=new ResizeObserver(()=>fitPicture(this.canvas,this.viewport,W,H));
  private frame=0;
  private previousTime=0;
  private disposed=false;
  private lastStick:[number,number]=[0,0];
  private lastPadButtons:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[];
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(id:VendorId,private wallet:Wallet,private walletChanged:()=>void,private bought:(goods:Item[])=>void,private dismiss:()=>void){
    this.vendor=vendors[id];this.purse=new Purse(wallet);
    this.overlay.className='machine-hall konbini-view';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','A vending machine');
    this.viewport.className='hall-viewport gate-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','The vending machine. Drag coins or a ¥1,000 note from the purse onto the slots, or press them; press the button under a drink; press the hatch to take it, the lever for the change and the cup to take it. The arrows or the D-pad move, E or A presses, Esc or B leaves.');
    this.canvas.width=W;this.canvas.height=H;this.canvas.className='gate-picture';this.viewport.append(this.canvas);this.overlay.append(this.viewport);
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    this.viewport.addEventListener('pointermove',this.pointerMove);
    this.viewport.addEventListener('pointerleave',()=>{this.over=null;this.overItem=null});
    this.viewport.addEventListener('pointerdown',this.pointerDown);
    this.viewport.addEventListener('pointerup',this.pointerUp);this.viewport.addEventListener('pointercancel',()=>{this.carried=null});
    document.body.append(this.overlay);this.resize.observe(this.viewport);fitPicture(this.canvas,this.viewport,W,H);this.viewport.focus();this.frame=requestAnimationFrame(this.tick);
    // The lettering uses the bitmap font: painted again once it is ready.
    document.fonts?.load('10px "Yorimichi Bitmap"').then(()=>{this.backdrop=null}).catch(()=>{});
  }
  private point(event:PointerEvent){const r=this.canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H}}
  private cell(row:number,col:number):Rect{const x=glassX+col*cellW,y=glassY+row*cellH;return [x,y,x+cellW,y+cellH]}
  private isHot(row:number,col:number){return row*cols+col>=cols*this.vendor.rows.length-this.vendor.hot}
  private keep(){saveWallet(this.wallet);this.walletChanged()}
  /** A piece into a slot (its own, without `slot`): ¥1 and ¥5 fall through to the cup; whatever it will not take stays in the hand, with no word of why, as on a real machine. */
  private insert(value:number,slot:Rect=isCoin(value)?coinSlot:noteSlot){
    if(!this.wallet[value])return;
    if(slot!==(isCoin(value)?coinSlot:noteSlot)||value>1000||this.credit+value>creditMax){machineSound('reject');return}
    this.wallet[value]--;
    if(value<10)this.tray.push(value);else this.credit+=value;
    machineSound(isCoin(value)?'coin':'note');
    this.keep();
  }
  /** A drink's button: dark, it only shows the price on the display; lit, the drink starts down. */
  private buy(item:Item){
    if(this.falling)return;
    if(this.credit<item[2]){this.asked=item[2];this.until=performance.now()+1400;machineSound('reject');return}
    this.credit-=item[2];this.falling={item,t:0};machineSound('scan');
  }
  private refund(){this.pulled=performance.now()+260;if(!this.credit)return;this.tray.push(...coinsFor(this.credit));this.credit=0;machineSound('coin')}
  private takeCoins(){for(const value of this.tray.splice(0))this.wallet[value]=(this.wallet[value]??0)+1;this.keep();machineSound('coin')}
  private takeDrinks(){this.got=this.hatch.at(-1)??this.got;this.bought(this.hatch.splice(0));machineSound('drop')}
  /** Everything to press, the purse's pieces first. */
  private targets():Spot[]{
    const list:Spot[]=[];
    for(const {value,rect} of this.purse.spots())if(this.wallet[value])list.push({rect,act:()=>this.insert(value),carry:(g,x,y)=>this.purse.paint(g,value,x-(isCoin(value)?7:14),y-7),drop:(x,y)=>{const slot=[noteSlot,coinSlot].find(s=>inside(s,x,y));if(slot)this.insert(value,slot)}});
    this.vendor.rows.forEach((row,r)=>row.forEach((item,c)=>{const [l,t,right]=this.cell(r,c);list.push({rect:[l+2,t+sampleH,right-2,t+cellH-1],act:()=>this.buy(item),item})}));
    list.push({rect:lever,act:()=>this.refund()});
    if(this.tray.length)list.push({rect:cup,act:()=>this.takeCoins()});
    if(this.hatch.length)list.push({rect:hatchRect,act:()=>this.takeDrinks()});
    list.push({rect:leave,act:()=>this.exit()});
    return list;
  }
  private target(x:number,y:number){return this.targets().find(t=>inside(t.rect,x,y))??null}
  private pointerMove=(event:PointerEvent)=>{
    const p=this.point(event),held=this.carried;
    if(held){held.x=p.x;held.y=p.y;held.moved||=Math.hypot(p.x-held.sx,p.y-held.sy)>4;return}
    this.over=this.target(p.x,p.y);this.cursor=null;this.viewport.style.cursor=this.over?'pointer':'';
    // The sample behind the glass reads like its button.
    this.overItem=this.over?.item??null;this.vendor.rows.forEach((row,r)=>row.forEach((item,c)=>{if(inside(this.cell(r,c),p.x,p.y))this.overItem=item}));
  };
  private pointerDown=(event:PointerEvent)=>{
    this.viewport.focus();const p=this.point(event),target=this.target(p.x,p.y);if(!target)return;
    if(target.carry){this.carried={target,x:p.x,y:p.y,sx:p.x,sy:p.y,moved:false};this.viewport.setPointerCapture(event.pointerId)}else target.act();
  };
  private pointerUp=()=>{const held=this.carried;if(!held)return;this.carried=null;if(held.moved)held.target.drop?.(held.x,held.y);else held.target.act()};
  /** The arrows or the D-pad: to the nearest thing to press that way. */
  private steer(dx:number,dy:number){
    const list=this.targets(),from=list.find(t=>this.cursor&&t.rect.join()===this.cursor.rect.join());
    this.cursor=from?nearest(list,from,dx,dy)??from:list[0];
  }
  private press(){const on=this.targets().find(t=>this.cursor&&t.rect.join()===this.cursor.rect.join());if(on)on.act();else this.steer(0,1)}
  private exit(){this.destroy();this.dismiss()}
  /** Everything that does not change: what stands around the machine, its body, the lit window with its samples, prices and legend, the empty hatch, the panel's plates. */
  private paintBackdrop(){
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d')!,{body,trim,rows,ja}=this.vendor,light=parseInt(body.slice(1,3),16)>200&&parseInt(body.slice(3,5),16)>200,text=light?ink:'#fffef2',night=darkness()>.5;
    g.imageSmoothingEnabled=false;
    box(g,0,0,W,H,night?'#141c30':'#aeb8b4');box(g,0,H-8,W,8,night?'#23293a':'#8f968f');
    box(g,6,0,204,H,body,shade(body,.6));box(g,7,1,202,2,trim);
    write(g,ja,12,3,text);
    write(g,'つめた～い',142,3,light?cold:'#d8ecff','right');write(g,'あたたか～い',204,3,light?hot:'#ffd8d0','right');
    // The window, its lit back fading down each row, the shelves, the samples standing on them.
    box(g,glassX-2,glassY-2,cols*cellW+4,rows.length*cellH+3,'#3b4341');
    rows.forEach((row,r)=>{
      const [,top]=this.cell(r,0);for(let k=0;k<sampleH;k+=2)box(g,glassX,top+k,cols*cellW,2,shade('#fdfdf6',1-(k/sampleH)*.14));
      row.forEach((item,c)=>{
        const [l,t,right]=this.cell(r,c),[dw,dh]=dims[item[3]],s=Math.min(tall,(sampleH-1)/dh),w=Math.round(dw*s),h=Math.round(dh*s),mid=(l+right)>>1;
        box(g,mid-(w>>1)-1,t+sampleH-2,w+3,2,'#00000030');paintItem(g,item[3],mid-(w>>1),t+sampleH-1-h,w,h,item[4],item[5]);
        // The strip that says hot or cold, its price, and the button's well.
        box(g,l,t+sampleH,cellW,cellH-sampleH,'#2b3034');box(g,l+2,t+sampleH,cellW-4,10,this.isHot(r,c)?hot:cold);write(g,String(item[2]),mid,t+sampleH,'#fffef2','center');
      });
    });
    // A long glare across the glass.
    g.fillStyle='#ffffff40';for(let y=glassY;y<glassY+rows.length*cellH;y++)if(y%3&&(y-glassY)%cellH<sampleH){const x=glassX+142-Math.round((y-glassY)*.5);g.fillRect(x,y,7,1);g.fillRect(x+12,y,2,1)}
    // The hatch under its flap.
    const [hl,ht,hr,hb]=hatchRect;box(g,hl-2,ht-2,hr-hl+4,hb-ht+4,shade(body,.6));box(g,hl,ht,hr-hl,hb-ht,'#3b4341');for(let y=ht+3;y<hb-3;y+=3)box(g,hl+3,y,hr-hl-6,1,'#4f585a');box(g,hl+18,ht+12,56,14,'#1d2622c0');write(g,'取出口',(hl+hr)/2,ht+14,'#f4f4ee','center');
    // The note slot, the black coin plate with its lettering and the ringed coin slot, the change cup's orange lip.
    {const [l,t,r,b]=noteSlot;box(g,l,t,r-l,b-t,ink,'#c9cdd0');box(g,l+3,t+4,r-l-6,3,'#000');write(g,'千円',(l+r)/2,t+11,'#f4f4ee','center')}
    {const [l,t,r,b]=coinPlate;box(g,l,t,r-l,b-t,'#1a1d20','#000');write(g,'おつり・返却',(l+r)/2,t+1,'#f4f4ee','center')}
    {const cx=(coinSlot[0]+coinSlot[2])>>1,cy=(coinSlot[1]+coinSlot[3])>>1;for(let y=-6;y<6;y++)for(let x=-6;x<6;x++){const d=Math.hypot(x+.5,y+.5);if(d<6.3)box(g,cx+x,cy+y,1,1,d>4.6?'#e0a020':'#c9cdd0')}box(g,cx-1,cy-4,2,8,'#000')}
    {const [l,t,r,b]=cup;box(g,l,t,r-l,b-t,dark,'#e8a020')}
    return this.backdrop=canvas;
  }
  private draw(){
    const g=this.g,now=performance.now();g.drawImage(this.backdrop??this.paintBackdrop(),0,0);
    // The buttons: lit for whatever the credit covers, one by one chasing while a drink comes down.
    this.vendor.rows.forEach((row,r)=>row.forEach((item,c)=>{const [l,t,right]=this.cell(r,c),falling=this.falling?.item===item,on=!this.falling&&this.credit>=item[2];box(g,l+6,t+sampleH+11,right-l-12,5,falling?(now>>6&1?lit:'#6a5a20'):on?lit:'#6b7274',ink)}));
    // The display: the credit, or the price just asked for.
    const [ll,lt,lr,lb]=led,asking=this.asked&&now<this.until;box(g,ll,lt,lr-ll,lb-lt,'#120806','#5b6462');write(g,asking?`¥${this.asked}`:this.credit?`¥${this.credit}`:'¥ 0',lr-4,lt,asking?'#ffd840':'#ff5a3c','right');
    // The lever on its pivot, tipped down for a moment when pulled, and the coins in the cup.
    const [vl,vt]=lever,pull=now<this.pulled?.2:-.12,hubX=vl+6,hubY=vt+6;
    for(let k=0;k<25;k++){const y=hubY+Math.round(k*pull)-2,thick=k>15?5:4;box(g,hubX+k,y,1,thick,'#f0a818');box(g,hubX+k,y,1,1,'#ffd860');box(g,hubX+k,y+thick,1,1,'#a06a10')}
    box(g,hubX-5,hubY-4,10,9,'#3b4341','#000');box(g,hubX-2,hubY-2,4,4,'#9aa0a4');
    this.tray.forEach((value,i)=>{const [l,t,r]=cup,to=(l+r)/2+Math.cos(i*2.4)*Math.min(26,4+i*4);this.purse.paint(g,value,Math.round(to)-7,t)});
    // The hatch, the flap lifted on what lies in it, on its side.
    if(this.hatch.length){
      const [l,t,r,b]=hatchRect;box(g,l,t,r-l,b-t,'#14181a');box(g,l,t,r-l,4,'#59626a');
      this.hatch.slice(-4).forEach((item,i)=>{const [dw,dh]=dims[item[3]],w=Math.round(dw*tall),h=Math.round(dh*tall),x=l+6+i*16;g.save();g.translate(x+h,b-w-2-(i&1)*2);g.rotate(Math.PI/2);paintItem(g,item[3],0,0,w,h,item[4],item[5]);g.restore()});
    }
    if(now<this.thud){const [l,t,r]=hatchRect;box(g,((l+r)>>1)-24,t+1,48,12,'#1d2622');write(g,'ガコン！',(l+r)/2,t+2,lit,'center')}
    // The purse, then under it the drink pointed at.
    this.purse.draw(g);
    const shown=this.overItem??this.got,cx=264;let y=142;
    if(shown){for(const line of wrap(g,shown[0],96).slice(0,2)){write(g,line,cx,y,'#fffef2','center');y+=11}for(const line of wrap(g,shown[1],96).slice(0,1)){write(g,line,cx,y,'#d8c8a8','center');y+=11}if(shown!==this.got||this.overItem)write(g,yen(shown[2]),cx,y,lit,'center')}
    // The way out, as in the aisles.
    const [fl,ft,fr,fb]=leave;box(g,fl,ft,fr-fl,fb-ft,'#1d2622c0');write(g,'離れる B',(fl+fr)/2,ft+2,'#f4f4ee','center');
    const on=this.over??this.cursor;if(on&&!this.carried){const [l,t,r,b]=on.rect;box(g,l,t,r-l,1,lit);box(g,l,b-1,r-l,1,lit);box(g,l,t,1,b-t,lit);box(g,r-1,t,1,b-t,lit)}
    if(this.carried?.moved)this.carried.target.carry?.(g,Math.round(this.carried.x),Math.round(this.carried.y));
  }
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){event.preventDefault();this.viewport.focus();return}
    if(event.key==='Escape'){event.preventDefault();this.exit();return}
    const dir={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[event.code];
    if(dir){event.preventDefault();this.steer(dir[0],dir[1]);return}
    if(event.code==='Enter'||event.code==='KeyE'||event.code==='Space'){event.preventDefault();if(!event.repeat)this.press()}
  };
  private tick=(time:number)=>{
    if(this.disposed)return;
    const dt=Math.min((time-this.previousTime)/1000||0,.25);this.previousTime=time;
    const pad=connectedPad();
    if(pad){
      const pressed=pad.buttons.map(b=>b.pressed),previous=this.lastPadButtons,edge=(i:number)=>pressed[i]&&!previous[i];this.lastPadButtons=pressed;
      const sx=Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0,sy=Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0;
      const across=edge(14)?-1:edge(15)?1:sx!==this.lastStick[0]?sx:0,down=edge(12)?-1:edge(13)?1:sy!==this.lastStick[1]?sy:0;this.lastStick=[sx,sy];
      if(across)this.steer(across,0);if(down)this.steer(0,down);if(edge(0))this.press();
      if(edge(1)){this.exit();return}
    }
    if(this.falling&&(this.falling.t+=dt)>=fall){this.hatch.push(this.falling.item);this.falling=null;this.thud=performance.now()+600;machineSound('can');if(this.credit){this.tray.push(...coinsFor(this.credit));this.credit=0;machineSound('coin')}}
    this.draw();
    this.frame=requestAnimationFrame(this.tick);
  };
  /** Walking off: the credit and the coins come back to the purse, and no drink stays in the hatch. */
  destroy(){
    if(this.disposed)return;this.disposed=true;
    if(this.falling)this.hatch.push(this.falling.item);this.falling=null;
    this.tray.push(...coinsFor(this.credit));this.credit=0;for(const value of this.tray.splice(0))this.wallet[value]=(this.wallet[value]??0)+1;this.keep();
    if(this.hatch.length)this.bought(this.hatch.splice(0));
    cancelAnimationFrame(this.frame);this.resize.disconnect();this.overlay.remove();this.previousFocus?.focus();
  }
}
