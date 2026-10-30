import { dims, paintItem, stockOf, type Aisle, type Item } from './goods';
import { box } from './hall-scene';
import { BasketView, basketTotal, cartIcon, nearest, Till, write, yen, type Line, type Panel, type Rect, type Target } from './konbini-till';
import { connectedPad } from './pad';
import type { Konbini } from './network';
import { crispText, fitPicture, Picture, type View } from './ticket-gate';
import { machineSound, type Wallet } from './wallet';

/** Where a product's facings were drawn, and the shelf they stand on (its height). */
type Spot={item:Item;rect:Rect;level:number};
/** A konbini chain, or JR East's station shop. */
export type Chain=Konbini|'newdays';
const chains:Record<Chain,{ja:string;en:string;accent:string;second:string}>={seven:{ja:'セブン-イレブン',en:'7-Eleven',accent:'#008061',second:'#f58220'},family:{ja:'ファミリーマート',en:'FamilyMart',accent:'#00a040',second:'#0068b7'},lawson:{ja:'ローソン',en:'LAWSON',accent:'#1f5fbf',second:'#d0313c'},newdays:{ja:'ニューデイズ',en:'NewDays',accent:'#2f8a4a',second:'#e8853a'}};
// The picture is 320 × 200 pixels, scaled up whole. World units are centimetres: x across (the eye on 0), y up, z forward. The shelves' fronts stand 120 cm off (130 the fridge's glass), about 0.75 px per cm.
// The fridge's eight doors span ±fridgeX, as much as the picture shows at the glass.
const W=320,H=200,view:View={eye:[0,150,0],vx:160,vy:70,k:92},shelfZ=120,itemZ=122,fridgeZ=130,bottleZ=140,fridgeX=224;
const C={ink:'#1d2622',ceiling:'#f1f0ea',light:'#ffffff',lightEdge:'#d9dcd6',wall:'#e9e6dc',floorA:'#d9d8d0',floorB:'#cfcec5',grout:'#bdbcb2',peg:'#e4e2da',pegLine:'#cfccc2',plate:'#c9ccc8',kick:'#4a524e',lip:'#f4f4ee',lipEdge:'#9aa29a',tag:'#ffffff',sale:'#f2d230',digit:'#283e40',frame:'#5b6462',frameDark:'#3b4341',fridge:'#eef4f6',wire:'#aab4b6',glint:'#ffffff',handle:'#c9cdd0',rod:'#8f969a',selected:'#ffce42'};
// What fits on the basket's page; more products than that stay on the shelf.
const basketLines=12;
const shelves=[12,47,82,117,152],fridgeShelves=[10,49,88,127,166];
// Price-tag digits, 3 × 5.
const digits=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
function tagDigits(g:CanvasRenderingContext2D,price:number,cx:number,y:number){
  const text=String(price),x0=cx-((text.length*4-1)>>1);g.fillStyle=C.digit;
  [...text].forEach((d,i)=>{const bits=digits[Number(d)];for(let k=0;k<15;k++)if(bits[k]==='1')g.fillRect(x0+i*4+k%3,y+(k/3|0),1,1)});
}

/** Inside the konbini, before its shelves: the sweets, the savoury snacks, the crisps and the drinks fridge, one aisle at a time, ← → to walk to the next and the self-checkout after the last (`Till`). Products go into the basket, looked at up close and put back in `BasketView`. A pixel-art picture as at the ticket gate. */
export class Shop {
  private overlay=document.createElement('div');
  private viewport=document.createElement('div');
  private canvas=document.createElement('canvas');
  private g=this.canvas.getContext('2d')!;
  private backdrops:HTMLCanvasElement[]=[];
  // Where each product's facings were drawn on the current aisle, for hover, clicks and the pad.
  private spots:Spot[][]=[];
  private aisle=0;
  // Walking to another aisle: a fade out through the dither, the switch, a fade back in.
  private going:{to:number;t:number}|null=null;
  // The buttons to the neighbouring aisles at the foot of each aisle's picture (left, right), and the one under the pointer.
  private buttons:[Rect|null,Rect|null][]=[];
  private hoveredButton=0;
  private hovered:Item|null=null;
  private selected=-1;
  private picked:Item|null=null;
  // Walking off a shelf's end: the shelf to carry on along in the next aisle, from its near end.
  private arriving:{row:number;side:number}|null=null;
  private resize=new ResizeObserver(()=>this.fit());
  private frame=0;
  private previousTime=0;
  private disposed=false;
  private drawn='';
  private lastStick:[number,number]=[0,0];
  private lastPadButtons:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[];
  private previousFocus=document.activeElement as HTMLElement|null;
  private chain;
  private aisles:Aisle[];
  private basket:Line[]=[];
  // The basket's page, open over the shelves, and the till, while the traveller stands at it (the aisle after the last).
  private basketView:BasketView|null=null;
  private till:Till|null=null;
  private basketButton:Rect=[W-92,2,W-2,16];
  private hoveredBasket=false;
  private hoveredTarget:Target|null=null;
  // The target the arrows or the pad are on, and what the pointer is carrying (a piece, a product).
  private cursor:Target|null=null;
  private stage:string|undefined;
  private carried:{target:Target;x:number;y:number;sx:number;sy:number;moved:boolean}|null=null;
  // A word over the picture, and whether Esc has warned that the basket stays behind.
  private notice='';
  private warned=false;
  private get panel():Panel|null{return this.basketView??this.till}
  constructor(chain:Chain,private wallet:Wallet,private walletChanged:()=>void,private bought:(goods:Item[])=>void,private dismiss:()=>void){
    this.chain=chains[chain];this.aisles=stockOf(chain);
    this.overlay.className='machine-hall konbini-view';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label',`Inside the ${this.chain.en}`);
    this.viewport.className='hall-viewport gate-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label','The shelves. The arrows: from product to product, left and right past the end of a shelf to the next aisle, the till after the last; the shoulder buttons or the buttons at the bottom: straight to the next aisle; E or A: into the basket; C or Y: look in the basket.');
    this.canvas.width=W;this.canvas.height=H;this.canvas.className='gate-picture';this.viewport.append(this.canvas);this.overlay.append(this.viewport);
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    this.viewport.addEventListener('pointermove',this.pointerMove);
    this.viewport.addEventListener('pointerleave',()=>{this.hovered=null;this.hoveredButton=0;this.hoveredBasket=false;this.hoveredTarget=null});
    this.viewport.addEventListener('pointerdown',this.pointerDown);
    this.viewport.addEventListener('pointerup',this.pointerUp);this.viewport.addEventListener('pointercancel',()=>{this.carried=null});
    document.body.append(this.overlay);this.resize.observe(this.viewport);this.fit();this.viewport.focus();this.frame=requestAnimationFrame(this.tick);
    // The signs' lettering uses the bitmap font: painted again once it is ready.
    document.fonts?.load('10px "Yorimichi Bitmap"').then(()=>{this.backdrops=[];this.drawn=''}).catch(()=>{});
  }
  private fit(){fitPicture(this.canvas,this.viewport,W,H)}
  private point(event:PointerEvent){const r=this.canvas.getBoundingClientRect();return {x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H}}
  /** The button to a neighbouring aisle under a picture point: -1 left, 1 right, 0 elsewhere. */
  private button(x:number,y:number){const inside=(r:Rect|null)=>!!r&&x>=r[0]&&x<r[2]&&y>=r[1]&&y<r[3],[left,right]=this.buttons[this.aisle]??[null,null];return this.going?0:inside(left)?-1:inside(right)?1:0}
  private at(x:number,y:number){return this.spots[this.aisle]?.find(({rect:[l,t,r,b]})=>x>=l&&x<r&&y>=t&&y<b)}
  private walk(step:number){const to=this.aisle+step;if(this.going||to<0||to>this.aisles.length)return;this.going={to,t:0};this.till?.close();this.hovered=this.picked=null;this.hoveredButton=0;this.hoveredTarget=this.cursor=null;this.selected=-1;this.notice='';this.warned=false}
  private pointerMove=(event:PointerEvent)=>{
    const p=this.point(event),held=this.carried;
    if(held){held.x=p.x;held.y=p.y;held.moved||=Math.hypot(p.x-held.sx,p.y-held.sy)>4;return}
    const panel=this.panel;
    if(panel){this.hoveredTarget=this.target(p.x,p.y);this.cursor=null;this.viewport.style.cursor=this.hoveredTarget?'pointer':'';return}
    const side=this.button(p.x,p.y);this.hoveredButton=side;this.hoveredBasket=!side&&this.overBasket(p.x,p.y);this.hovered=side||this.hoveredBasket?null:this.at(p.x,p.y)?.item??null;this.viewport.style.cursor=side||this.hoveredBasket||this.hovered?'pointer':'';
  };
  private pointerDown=(event:PointerEvent)=>{
    this.viewport.focus();const p=this.point(event);if(this.going)return;
    if(this.panel){
      const target=this.target(p.x,p.y);if(!target)return;
      if(target.carry){this.carried={target,x:p.x,y:p.y,sx:p.x,sy:p.y,moved:false};this.viewport.setPointerCapture(event.pointerId)}else this.act(target);
      return;
    }
    const side=this.button(p.x,p.y);if(side){this.walk(side);return}
    if(this.overBasket(p.x,p.y)){this.openBasket();return}
    const spot=this.at(p.x,p.y),again=spot&&this.picked===spot.item;this.picked=spot?.item??null;this.selected=spot?this.spots[this.aisle].indexOf(spot):-1;
    // A mouse has already read the name by pointing; a finger's first tap reads it.
    if(spot&&(event.pointerType==='mouse'||again))this.take(spot.item);
  };
  private pointerUp=()=>{const held=this.carried;if(!held)return;this.carried=null;if(held.moved)held.target.drop?.(held.x,held.y);else this.act(held.target)};
  /** A panel's target pressed: anything but the way out takes the warning back. */
  private act(target:Target){const word=this.notice;target.act();if(word&&this.notice===word){this.notice='';this.warned=false}}
  private target(x:number,y:number){return this.panel?.targets().find(({rect:[l,t,r,b]})=>x>=l&&x<r&&y>=t&&y<b)??null}
  private overBasket(x:number,y:number){const [l,t,r,b]=this.basketButton;return !this.atTill&&x>=l&&x<r&&y>=t&&y<b}
  private get atTill(){return this.aisle===this.aisles.length}
  private take(item:Item){
    const line=this.basket.find(l=>l.item===item);this.warned=false;
    if(line)line.n++;else if(this.basket.length<basketLines)this.basket.push({item,n:1});else{machineSound('reject');this.notice='かごがいっぱいです / The basket is full';return}
    this.notice='';machineSound('drop');
  }
  private openBasket(){if(this.going||this.atTill||this.basketView)return;this.notice='';this.warned=false;this.hovered=null;this.hoveredBasket=false;this.cursor=null;const close=()=>{this.basketView=null;this.hoveredTarget=this.cursor=null};this.basketView=new BasketView(this.basket,this.chain.accent,close,()=>{close();this.walk(this.aisles.length-this.aisle)})}
  private openTill(){this.till=new Till(this.basket,this.chain.accent,this.wallet,this.walletChanged,()=>this.walk(-1),()=>this.exit(),this.aisles[this.aisles.length-1].ja,lines=>this.bought(lines.flatMap(({item,n})=>Array<Item>(n).fill(item))))}
  /** The arrows or the D-pad in a panel: to the nearest target that way. */
  private steer(dx:number,dy:number){
    const list=this.panel?.targets()??[];if(!list.length)return;
    const same=(a:Target,b:Target)=>a.rect.join()===b.rect.join(),from=list.find(t=>this.cursor&&same(t,this.cursor));
    if(!from){this.cursor=list[0];return}
    this.cursor=nearest(list,from,dx,dy)??this.cursor;
  }
  /** A or E: the panel's chosen target, or the product picked on the shelf into the basket. */
  private press(){
    if(this.going)return;const panel=this.panel;
    if(panel){const on=this.cursor&&panel.targets().find(t=>t.rect.join()===this.cursor!.rect.join());if(on)this.act(on);else this.steer(0,1);return}
    if(this.picked)this.take(this.picked);
  }
  /** Esc or B: out of the panel, or out of the shop. */
  private backOut(){
    const panel=this.panel;if(panel)panel.back();else this.exit();
  }
  /** Out of the shop, after one warning when the basket would stay behind. */
  private exit(){
    if(this.basket.length&&!this.warned){this.warned=true;this.notice='商品を棚に戻して出ますか？ Again: put it all back, leave';machineSound('reject');return}
    this.leave();
  }
  /** The aisle's shelves, top first, each its products left to right. */
  private shelvesOf(aisle:number){const levels=[...new Set(this.spots[aisle].map(s=>s.level))];return levels.map(level=>this.spots[aisle].filter(s=>s.level===level))}
  private select(spot:Spot|undefined){if(!spot)return;this.selected=this.spots[this.aisle].indexOf(spot);this.picked=spot.item;this.notice='';this.warned=false}
  /** The arrows, D-pad and stick along the shelves: ← → within one, and past its end, unless the key is only held down, to the next aisle; ↑ ↓ to the product nearest above or below. */
  private choose(dx:number,dy:number,walks=true){
    if(this.going)return;const list=this.spots[this.aisle],shelves=this.shelvesOf(this.aisle),spot=list?.[this.selected];if(!spot){this.select(dx<0?shelves[0]?.at(-1):shelves[0]?.[0]);return}
    const row=shelves.findIndex(shelf=>shelf.includes(spot)),middle=(s:Spot)=>(s.rect[0]+s.rect[2])/2;
    if(dx){const next=shelves[row][shelves[row].indexOf(spot)+dx];if(next)this.select(next);else if(walks){this.arriving={row,side:dx};this.walk(dx)}return}
    const shelf=shelves[row+dy];if(shelf)this.select(shelf.reduce((best,s)=>Math.abs(middle(s)-middle(spot))<Math.abs(middle(best)-middle(spot))?s:best));
  }
  private rect(x0:number,x1:number,y0:number,y1:number,z:number,pic:Picture):Rect{const [l,t]=pic.project([x0,y1,z]),[r,b]=pic.project([x1,y0,z]);return [Math.round(l),Math.round(t),Math.round(r),Math.round(b)]}
  /** A row of products on a shelf at `level`: each gets an equal share of the width and as many facings as fit in it (at most `most`), bread stacked two high. */
  private row(g:CanvasRenderingContext2D,pic:Picture,items:Item[],level:number,z:number,x0:number,x1:number,spots:Spot[],most=99){
    const share=(x1-x0)/items.length;
    items.forEach((item,i)=>{
      const [w,h]=dims[item[3]],n=Math.min(most,Math.max(1,Math.floor((share-6)/w))),high=h<=14?2:1,gx=x0+share*i+(share-n*w)/2;let group:Rect|null=null;
      for(let f=0;f<n*high;f++){const fx=gx+(f%n)*w,fy=level+Math.floor(f/n)*h,[l,t,r,b]=this.rect(fx,fx+w,fy,fy+h,z,pic);paintItem(g,item[3],l,t,r-l,b-t,item[4],item[5]);group=group?[Math.min(group[0],l),Math.min(group[1],t),Math.max(group[2],r),Math.max(group[3],b)]:[l,t,r,b]}
      spots.push({item,rect:group!,level});
    });
  }
  /** The price tags on a shelf's rail at depth z, a fraction `at` along each product's share (the middle, or the fridge's first door of two); now and then a yellow one. */
  private tags(g:CanvasRenderingContext2D,pic:Picture,items:Item[],level:number,z:number,x0:number,x1:number,sale:number,at=.5){
    const share=(x1-x0)/items.length;
    items.forEach((item,k)=>{const [cx,ty]=pic.project([x0+share*(k+at),level-1,z]),tw=String(item[2]).length*4+3;box(g,Math.round(cx-tw/2),Math.round(ty),tw,7,(k+level)%7===sale?C.sale:C.tag,C.lipEdge);tagDigits(g,item[2],Math.round(cx),Math.round(ty)+1)});
  }
  /** Everything but the highlight: the shop around (floor, ceiling lights, back wall in the chain's colours), then the gondola or the fridge with its products. */
  private backdrop(index:number){
    if(this.backdrops[index])return this.backdrops[index];
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d')!,pic=new Picture(g,view,W,H),aisle=this.aisles[index],spots:Spot[]=[];g.imageSmoothingEnabled=false;
    const front=(x0:number,x1:number,y0:number,y1:number,z:number,color:string,line?:string,alt?:string)=>pic.face(pic.quad(x0,x1,y0,y1,z,z),color,line,alt);
    const flat=(x0:number,x1:number,y:number,z0:number,z1:number,color:string,alt?:string)=>pic.face(pic.quad(x0,x1,y,y,z0,z1),color,undefined,alt);
    g.fillStyle=C.wall;g.fillRect(0,0,W,H);
    // The ceiling and its light panels, the far wall 9 m off with the chain's stripes, the tiled floor.
    flat(-900,900,260,0,900,C.ceiling);for(let z=150;z<900;z+=150)for(const x of [-300,-60,180])flat(x,x+120,259.9,z,z+14,C.light),pic.edge(pic.quad(x,x+120,259.9,259.9,z,z+14),C.lightEdge);
    front(-900,900,0,260,900,C.wall);front(-900,900,214,226,899.9,this.chain.accent);front(-900,900,208,212,899.9,this.chain.second);
    flat(-900,900,0,0,900,C.floorA);for(let x=-300;x<300;x+=30)for(let z=0;z<shelfZ+20;z+=30)if(((x+z)/30&1)===0)flat(x,x+30,0,z,z+30,C.floorB);
    if(aisle.fridge){
      // The reach-in fridge along the wall, eight doors, each drink behind two of them: its white-lit inside, wire shelves with their tag rails, the bottles, then the doors' frames and glass, and the lit header.
      front(-400,400,0,240,fridgeZ,C.frameDark);front(-fridgeX,fridgeX,10,205,bottleZ+40,C.fridge);
      fridgeShelves.forEach((level,i)=>{flat(-fridgeX,fridgeX,level,fridgeZ+2,bottleZ+40,C.wire);this.row(g,pic,aisle.rows[i],level,bottleZ,-fridgeX,fridgeX,spots);front(-fridgeX,fridgeX,level-5,level,fridgeZ+3,C.lip,C.lipEdge);this.tags(g,pic,aisle.rows[i],level,fridgeZ+2.5,-fridgeX,fridgeX,5,.25)});
      for(let k=0;k<8;k++){
        const x0=-fridgeX+k*fridgeX/4,x1=x0+fridgeX/4,[l,t,r,b]=this.rect(x0,x1,10,205,fridgeZ,pic);
        // A streak of glare across each pane.
        g.fillStyle=C.glint;for(let y=t;y<b;y++){const x=l+Math.round((b-y)*.45)+((k*7)%11);if(y%3!==0&&x>l&&x<r-1)g.fillRect(x,y,1,1);if(y%2===0&&x+5>l&&x+5<r-1)g.fillRect(x+5,y,1,1)}
        front(x0-2,x0+2,0,240,fridgeZ-.5,C.frame);if(k===7)front(x1-2,x1+2,0,240,fridgeZ-.5,C.frame);front(x1-11,x1-9,70,150,fridgeZ-1,C.handle,C.rod);
      }
      front(-fridgeX,fridgeX,0,10,fridgeZ-.5,C.kick);front(-400,400,205,240,fridgeZ-.6,'#fbfbf6',C.frame);front(-400,400,205,209,fridgeZ-.7,this.chain.accent);
      this.sign(g,pic,`${aisle.ja}  ${aisle.en}`,222,fridgeZ-.8,false);
    }else{
      // The gondola: pegboard back, shelf plates, the products, the tag rails, the kick plate and the header, and the aisle's sign hanging before it.
      front(-400,400,0,190,shelfZ+40,C.peg);for(let x=-360;x<=360;x+=90)front(x-.5,x+.5,12,190,shelfZ+39.9,C.pegLine);
      shelves.forEach((level,i)=>{flat(-400,400,level,shelfZ,shelfZ+40,C.plate);this.row(g,pic,aisle.rows[i],level,itemZ,-212,212,spots,6)});
      front(-400,400,0,6,shelfZ+.1,C.kick);
      shelves.forEach((level,i)=>{front(-400,400,level-7,level+1,shelfZ,C.lip,C.lipEdge);front(-400,400,level-7,level-6,shelfZ-.1,this.chain.accent);this.tags(g,pic,aisle.rows[i],level,shelfZ-.5,-212,212,3)});
      front(-400,400,180,192,shelfZ,'#fbfbf6',C.lipEdge);front(-400,400,180,182,shelfZ-.1,this.chain.second);
      for(const x of [-80,80])front(x-1,x+1,226,260,105,C.rod);
      this.sign(g,pic,`${aisle.ja}  ${aisle.en}`,212,105,true);
    }
    // The buttons to the neighbouring aisles, in the bottom corners, with the pad's shoulder buttons that do the same.
    g.font='10px "Yorimichi Bitmap"';
    const button=(text:string,x:number,align:'left'|'right'):Rect=>{const w=Math.ceil(g.measureText(text).width),l=align==='left'?x:x-w-6;box(g,l,H-14,w+6,13,'#1d2622c0');crispText(g,text,l+3,H-12,'#f4f4ee');return [l,H-14,l+w+6,H-1]};
    this.buttons[index]=[index>0?button(`LB ← ${this.aisles[index-1].ja}`,2,'left'):null,button(`${this.aisles[index+1]?.ja??'レジ'} → RB`,W-2,'right')];
    this.spots[index]=spots.sort((a,b)=>b.level-a.level||a.rect[0]-b.rect[0]);
    return this.backdrops[index]=canvas;
  }
  /** A sign at depth z, as wide as its lettering: hanging (white, in the chain's colour) or on the fridge's lit header. */
  private sign(g:CanvasRenderingContext2D,pic:Picture,text:string,y:number,z:number,hanging:boolean){
    g.font='10px "Yorimichi Bitmap"';const half=(g.measureText(text).width/2+(hanging?7:4))*(z-view.eye[2])/view.k,high=8*(z-view.eye[2])/view.k;
    if(hanging){pic.face(pic.quad(-half,half,y-high,y+high,z,z),'#fbfbf6',this.chain.accent);pic.face(pic.quad(-half,half,y-high,y-high+2,z-.1,z-.1),this.chain.second)}
    pic.text(text,pic.project([0,y,z-.2]),hanging?this.chain.accent:C.ink);
  }
  private draw(){
    const going=this.going,fade=going?Math.round(going.t<.18?going.t/.18*16:16-Math.min(1,(going.t-.18)/.18)*16):0,shown=this.hovered??this.picked,lines=this.basket.length,count=this.basket.reduce((sum,l)=>sum+l.n,0),panel=this.panel;
    const key=[this.aisle,fade,shown?.[0],this.hoveredButton,this.hoveredBasket,count,this.notice].join();if(!panel&&key===this.drawn)return;this.drawn=panel?'':key;
    const pic=new Picture(this.g,view,W,H),frame=([l,t,r,b]:Rect)=>pic.outline([[l,t],[r-1,t],[r-1,b-1],[l,b-1]],C.selected);
    if(this.atTill&&this.till)this.till.draw(this.g);else this.g.drawImage(this.backdrop(this.aisle),0,0);
    if(panel&&!(this.atTill&&!this.till)){
      if(this.basketView)this.basketView.draw(this.g);
      // A screen that changes under the arrows' cursor moves it to its first choice.
      const list=panel.targets(),on=(o:Target|null)=>o&&list.find(t=>t.rect.join()===o.rect.join());if(this.cursor&&(!on(this.cursor)||this.till?.stage!==this.stage))this.cursor=list[0]??null;this.stage=this.till?.stage;
      const lit=on(this.hoveredTarget??this.cursor);if(lit&&!going)frame(lit.rect);
      if(this.notice&&this.till){box(this.g,2,H-28,W-4,13,'#d2402ee0');write(this.g,this.notice,6,H-26,'#fffef2')}
      if(this.carried?.moved)this.carried.target.carry?.(this.g,Math.round(this.carried.x),Math.round(this.carried.y));
    }else{
      if(shown&&!going){const spot=this.spots[this.aisle].find(s=>s.item===shown);if(spot){const [l,t,r,b]=spot.rect;pic.outline([[l-1,t-1],[r,t-1],[r,b],[l-1,b]],C.selected)}}
      const lit=this.hoveredButton&&!going?this.buttons[this.aisle]?.[this.hoveredButton<0?0:1]:null;if(lit)frame(lit);
      // The product's name and price, or the shop's word, and the basket.
      if(this.notice){box(this.g,2,18,W-4,13,'#d2402ee0');write(this.g,this.notice,6,20,'#fffef2')}
      if(shown&&!going){box(this.g,2,2,W-98,25,'#1d2622');write(this.g,shown[0],6,3,'#fffef2');write(this.g,shown[1],6,14,'#c9d1cc');write(this.g,yen(shown[2]),W-100,3,C.selected,'right')}
      box(this.g,...this.basketButton.slice(0,2) as [number,number],90,14,'#1d2622c0');cartIcon(this.g,W-89,3,lines?C.selected:'#f4f4ee');write(this.g,`${count}点 ${yen(basketTotal(this.basket))}`,W-6,4,lines?C.selected:'#f4f4ee','right');if(this.hoveredBasket)frame(this.basketButton);
    }
    pic.fade(fade);
  }
  private leave(){this.destroy();this.dismiss()}
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){event.preventDefault();this.viewport.focus();return}
    if(event.key==='Escape'){event.preventDefault();this.backOut();return}
    if(this.panel){
      const dir={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[event.code];
      if(dir){event.preventDefault();this.steer(dir[0],dir[1]);return}
      if(event.code==='Enter'||event.code==='KeyE'||event.code==='Space'){event.preventDefault();if(!event.repeat)this.press();return}
      if(event.code==='KeyC'&&this.basketView)this.basketView.back();
      return;
    }
    const step={ArrowLeft:-1,KeyA:-1,ArrowRight:1,KeyD:1}[event.code];if(step){event.preventDefault();this.choose(step,0,!event.repeat);return}
    const pick={ArrowUp:-1,KeyW:-1,ArrowDown:1,KeyS:1}[event.code];if(pick){event.preventDefault();this.choose(0,pick);return}
    if(event.code==='Enter'||event.code==='KeyE'||event.code==='Space'){event.preventDefault();if(!event.repeat)this.press();return}
    if(event.code==='KeyC')this.openBasket();
  };
  private tick=(time:number)=>{
    if(this.disposed)return;
    const dt=Math.min((time-this.previousTime)/1000||0,.25);this.previousTime=time;
    const pad=connectedPad();
    if(pad){
      const pressed=pad.buttons.map(b=>b.pressed),previous=this.lastPadButtons,edge=(i:number)=>pressed[i]&&!previous[i];this.lastPadButtons=pressed;
      const sx=Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0,sy=Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0;
      const shoulder=edge(4)?-1:edge(5)?1:0,walk=edge(14)?-1:edge(15)?1:sx!==this.lastStick[0]?sx:0,pick=edge(12)?-1:edge(13)?1:sy!==this.lastStick[1]?sy:0;this.lastStick=[sx,sy];
      if(this.panel){if(walk)this.steer(walk,0);if(pick)this.steer(0,pick);if(edge(0))this.press();if(edge(3)&&this.basketView)this.basketView.back();if(this.till&&shoulder<0)this.walk(-1);if(this.till&&shoulder>0)this.exit()}
      else{if(shoulder)this.walk(shoulder);if(walk)this.choose(walk,0);if(pick)this.choose(0,pick);if(edge(0))this.press();if(edge(3))this.openBasket()}
      if(edge(1)){this.backOut();if(this.disposed)return}
    }
    if(this.going){this.going.t+=dt;if(this.going.t>=.18&&this.aisle!==this.going.to){this.aisle=this.going.to;this.till=null;if(this.atTill)this.openTill();else if(this.arriving){this.backdrop(this.aisle);const shelves=this.shelvesOf(this.aisle),shelf=shelves[Math.min(this.arriving.row,shelves.length-1)];this.select(this.arriving.side>0?shelf[0]:shelf.at(-1))}this.arriving=null}if(this.going.t>=.36)this.going=null}
    this.draw();
    this.frame=requestAnimationFrame(this.tick);
  };
  destroy(){if(this.disposed)return;this.disposed=true;this.till?.close();cancelAnimationFrame(this.frame);this.resize.disconnect();this.overlay.remove();this.previousFocus?.focus()}
}
