import { box } from './hall-scene';
import { dims, paintCloseUp, paintItem, type Item } from './goods';
import { crispText, harden } from './ticket-gate';
import { coins, heapSpot, isCoin, machineSound, makeChange, notes, pieceArt, saveWallet, walletTotal, type Wallet } from './wallet';

export type Rect=[number,number,number,number];
/** A product in the basket, however many of it. */
export interface Line {item:Item;n:number}
/** Something to press in a panel; `carry` makes it draggable, painting what is carried, and `drop` is where it lands (a plain press still calls `act`). */
export interface Target {rect:Rect;act:()=>void;carry?:(g:CanvasRenderingContext2D,x:number,y:number)=>void;drop?:(x:number,y:number)=>void}
/** A view drawn over the picture, worked by the pointer or, target by target, by the arrows, D-pad and A. */
export interface Panel {draw(g:CanvasRenderingContext2D):void;targets():Target[];back():void}

const W=320,H=200,ink='#1d2622',cream='#f8f6ec',red='#d2402e',lit='#ffce42';
export const yen=(n:number)=>'¥'+n.toLocaleString('en-US');
export const basketTotal=(lines:Line[])=>lines.reduce((sum,{item,n})=>sum+item[2]*n,0);
const inside=([l,t,r,b]:Rect,x:number,y:number)=>x>=l&&x<r&&y>=t&&y<b;
export function write(g:CanvasRenderingContext2D,text:string,x:number,y:number,color=ink,align:'left'|'right'|'center'='left'){
  g.font='10px "Yorimichi Bitmap"';const w=g.measureText(text).width;crispText(g,text,align==='left'?x:align==='right'?x-w:x-w/2,y,color);
}
/** Broken to `width`, at a space when there is one (Japanese breaks anywhere). */
export function wrap(g:CanvasRenderingContext2D,text:string,width:number){
  g.font='10px "Yorimichi Bitmap"';const lines:string[]=[];let line='';
  for(const c of text){if(g.measureText(line+c).width>width){const cut=line.lastIndexOf(' ');if(cut>0){lines.push(line.slice(0,cut));line=line.slice(cut+1)+c}else{lines.push(line);line=c}}else line+=c}
  if(line)lines.push(line);return lines;
}
/** A small facing, fitted into a square cell, with how many of it. */
function thumb(g:CanvasRenderingContext2D,{item,n}:Line,x:number,y:number,size:number){
  const [dw,dh]=dims[item[3]],s=Math.min((size-2)/dw,(size-2)/dh),w=Math.round(dw*s),h=Math.round(dh*s);
  paintItem(g,item[3],x+((size-w)>>1),y+((size-h)>>1),w,h,item[4],item[5]);
  if(n>1){const text='×'+n;g.font='10px "Yorimichi Bitmap"';const tw=g.measureText(text).width+2;box(g,x+size-tw,y+size-11,tw,11,'#1d2622d0');write(g,text,x+size-tw+1,y+size-11,'#fffef2')}
}
function button(g:CanvasRenderingContext2D,[l,t,r,b]:Rect,text:string,fill:string,color='#fffef2'){box(g,l,t,r-l,b-t,fill,'#1d262280');write(g,text,(l+r)/2,t+Math.round((b-t-10)/2),color,'center')}

/** The next target from `from` in the direction of the arrows, by nearness, what lies off to the side counting double; null when there is none. */
export function nearest(list:Target[],from:Target,dx:number,dy:number){
  const middle=({rect:[l,t,r,b]}:Target)=>[(l+r)/2,(t+b)/2],[x,y]=middle(from);let best:Target|null=null,score=Infinity;
  for(const t of list){if(t===from)continue;const [tx,ty]=middle(t),along=(tx-x)*dx+(ty-y)*dy,across=Math.abs((tx-x)*dy)+Math.abs((ty-y)*dx);if(along>2&&along+across*2<score){best=t;score=along+across*2}}
  return best;
}
/** The purse as a panel down the picture's right side, shared by the machines that take cash: where each piece lies, notes first, and its images. */
export class Purse {
  private art=new Map<number,HTMLImageElement>();
  constructor(private wallet:Wallet){for(const value of [...notes,...coins]){const image=new Image();image.src=pieceArt(value);this.art.set(value,image)}}
  spots(){const spots:{value:number;rect:Rect}[]=[];notes.forEach((value,i)=>spots.push({value,rect:[wallet0+4,32+i*17,wallet0+60,48+i*17]}));coins.slice().reverse().forEach((value,i)=>spots.push({value,rect:[wallet0+4+(i%2)*50,86+(i>>1)*18,wallet0+52+(i%2)*50,103+(i>>1)*18]}));return spots}
  paint(g:CanvasRenderingContext2D,value:number,x:number,y:number,turn=0){
    const image=this.art.get(value)!;if(!image.complete)return;
    if(!turn){g.drawImage(image,x,y);return}
    g.save();g.imageSmoothingEnabled=false;g.translate(x+image.width/2,y+image.height/2);g.rotate(turn*Math.PI/180);g.drawImage(image,-image.width/2,-image.height/2);g.restore();
  }
  draw(g:CanvasRenderingContext2D){
    box(g,wallet0,6,W-wallet0-4,188,'#5a3b26','#2b1a10');write(g,'財布',wallet0+5,10,'#f6e3c4');write(g,yen(walletTotal(this.wallet)),W-10,10,'#f6e3c4','right');
    for(const {value,rect:[l,t]} of this.spots()){const n=this.wallet[value]??0,x=l+1;if(!n)g.globalAlpha=.3;this.paint(g,value,x,t+1);g.globalAlpha=1;write(g,'×'+n,x+(isCoin(value)?16:30),t+3,n?'#f6e3c4':'#a89070')}
  }
}

const carts=new Map<string,HTMLCanvasElement>();
/** A shopping cart, 13 × 12: its handle, the wire basket narrowing to the frame, two wheels, with the lettering's soft edge. */
export function cartIcon(g:CanvasRenderingContext2D,x:number,y:number,color:string){
  let ink=carts.get(color);
  if(!ink){
    ink=document.createElement('canvas');ink.width=15;ink.height=14;const c=ink.getContext('2d',{willReadFrequently:true})!;
    box(c,1,1,3,1,color);box(c,3,1,1,3,color);for(let r=0;r<6;r++)box(c,4+(r>>1),3+r,10-r,1,color);box(c,5,10,8,1,color);box(c,6,11,2,2,color);box(c,11,11,2,2,color);
    harden(ink,color);carts.set(color,ink);
  }
  g.drawImage(ink,x-1,y-1);
}

/** The basket in hand: each product at a glance, the chosen one up close with its name and price, put back or kept. */
export class BasketView implements Panel {
  private at=0;
  private put:Rect=[170,156,306,172];
  private shut:Rect=[170,174,306,190];
  private till:Rect=[14,168,158,188];
  constructor(private lines:Line[],private accent:string,private close:()=>void,private toTill:()=>void){}
  private cell(i:number):Rect{const x=14+(i%4)*37,y=26+(i/4|0)*46;return [x,y,x+35,y+44]}
  draw(g:CanvasRenderingContext2D){
    box(g,8,6,304,188,cream,'#5b6462');write(g,'かご / BASKET',14,10,ink);write(g,`${this.lines.reduce((sum,l)=>sum+l.n,0)}点  ${yen(basketTotal(this.lines))}`,158,10,ink,'right');
    box(g,164,10,1,178,'#cfccc2');
    this.lines.forEach((line,i)=>{const [l,t,r,b]=this.cell(i);box(g,l,t,r-l,b-t,i===this.at?'#fff0c0':'#ecebe2',i===this.at?lit:undefined);thumb(g,line,l+2,t+2,31);write(g,yen(line.item[2]),(l+r)/2,t+33,ink,'center')});
    const line=this.lines[this.at];
    if(!line){write(g,'かごは空です',238,80,ink,'center');write(g,'Your basket is empty',238,94,'#5b6462','center')}
    else{
      paintCloseUp(g,line.item,178,10,120,94);
      const names=wrap(g,line.item[0],134).slice(0,2);let y=106;for(const text of names){write(g,text,238,y,ink,'center');y+=11}
      for(const text of wrap(g,line.item[1],134).slice(0,3-names.length)){write(g,text,238,y,'#5b6462','center');y+=11}
      write(g,yen(line.item[2])+(line.n>1?` × ${line.n}`:''),238,Math.max(y,142),red,'center');
      button(g,this.put,'もどす Put back',red);
    }
    button(g,this.shut,'とじる Close','#5b6462');
    if(this.lines.length)button(g,this.till,'レジへ  To the till →',this.accent);
  }
  targets(){
    const list:Target[]=this.lines.map((_,i)=>({rect:this.cell(i),act:()=>{this.at=i}}));
    if(this.lines.length)list.push({rect:this.put,act:()=>{const line=this.lines[this.at];if(--line.n<=0){this.lines.splice(this.at,1);this.at=Math.max(0,Math.min(this.at,this.lines.length-1))}machineSound('drop')}});
    list.push({rect:this.shut,act:this.close});if(this.lines.length)list.push({rect:this.till,act:this.toTill});return list;
  }
  back(){this.close()}
}

type Step='welcome'|'scan'|'age'|'points'|'bag'|'method'|'cash'|'thanks';
type Icon='cart'|'yes'|'no'|'money'|'points'|'no points'|'credit'|'e-money'|'qr'|'bag'|'no bag';
type Offer=[string,()=>void,string?,Icon?];
// In picture pixels: the screen, the scanner, the cash unit's note and coin slots and its change trays, and the panel on the right (the basket on the counter, or the purse once it is out).
const screen:Rect=[12,8,128,146],scanner:Rect=[164,42,206,132],noteSlot:Rect=[14,158,76,174],coinSlot:Rect=[84,156,114,176],noteTray:Rect=[122,156,160,196],coinTray:Rect=[162,156,204,196],bagBag=5,wallet0=212;
/** The self-checkout, after FamilyMart's: the tablet that walks through the sale, the handheld scanner on its stand, the payment terminal and the cash unit at its foot. Scan everything in the basket, answer the screens, then feed the cash in and take the change. */
export class Till implements Panel {
  private step:Step='welcome';
  private en=false;
  private note='';
  private todo:Line[];
  private scanned:Line[]=[];
  private wantBag=false;
  private inserted:number[]=[];
  private tray:number[]=[];
  private buttonsNow:Target[]=[];
  private footNow:Target[]=[];
  private purse:Purse;
  private tinted=0;
  constructor(private basket:Line[],private accent:string,private wallet:Wallet,private walletChanged:()=>void,private leave:()=>void,private exit:()=>void,private shelves:string,private bought:(lines:Line[])=>void){
    this.todo=basket.map(line=>({...line}));
    this.purse=new Purse(wallet);
  }
  get stage(){return this.step}
  private tr(ja:string,en:string){return this.en?en:ja}
  private get due(){return basketTotal(this.scanned)+(this.wantBag?bagBag:0)}
  private get paid(){return this.inserted.reduce((sum,v)=>sum+v,0)}
  private keep(){saveWallet(this.wallet);this.walletChanged()}
  private refuse(note=''){machineSound('reject');if(note)this.note=note;this.tinted=performance.now()}
  private go(step:Step){this.step=step;this.note='';machineSound('scan')}
  private scan(line:Line){
    if(this.step!=='scan'){this.refuse();return}
    const seen=this.scanned.find(l=>l.item===line.item);if(seen)seen.n++;else this.scanned.push({item:line.item,n:1});
    if(--line.n<=0)this.todo.splice(this.todo.indexOf(line),1);this.note='';machineSound('scan');
  }
  private insert(value:number,slot:Rect){
    if(this.step!=='cash'||!this.wallet[value]||slot!==(isCoin(value)?coinSlot:noteSlot)){this.refuse();return}
    this.wallet[value]--;this.inserted.push(value);this.keep();machineSound(isCoin(value)?'coin':'note');
  }
  private settle(){
    const change=this.paid-this.due;if(change<0){this.refuse(this.tr('お金が足りません','Not enough yet'));return}
    this.inserted=[];this.tray.push(...makeChange(change));this.bought(this.scanned);this.basket.length=0;this.step='thanks';this.note='';machineSound(change?'drop':'scan');
  }
  private takeChange(coin:boolean){const taken=this.tray.filter(value=>isCoin(value)===coin);if(!taken.length){this.refuse();return}this.tray=this.tray.filter(value=>isCoin(value)!==coin);for(const value of taken)this.wallet[value]=(this.wallet[value]??0)+1;this.keep();machineSound('coin')}
  /** Walking off: what lies in the machine comes back to the purse. */
  close(){for(const value of [...this.inserted.splice(0),...this.tray.splice(0)])this.wallet[value]=(this.wallet[value]??0)+1;this.keep()}
  /** The sale called off: the cash comes back in the tray, the products go back to the basket and the screen to its welcome. */
  private cancel(){this.tray.push(...this.inserted.splice(0));this.todo=this.basket.map(line=>({...line}));this.scanned=[];this.wantBag=false;this.go('welcome')}
  back(){if(this.step==='cash'){this.tray.push(...this.inserted.splice(0));this.go('method')}else if(this.step==='welcome'||this.step==='thanks')this.leave();else this.cancel()}
  /** What the screen says and offers at this step. */
  private page():{title:string;lines:[string,string?][];offers:Offer[]}{
    const tr=this.tr.bind(this);
    switch(this.step){
      case 'welcome':return {title:tr('いらっしゃいませ','Welcome'),lines:[[tr('セルフレジ','Self-checkout')],...this.basket.length?[]:[[tr('かごが空です','Your basket is empty'),red] as [string,string]]],offers:[[tr('お会計','Start'),()=>{if(this.basket.length)this.go('scan');else this.refuse()},this.accent,'cart'],[this.en?'日本語':'English',()=>{this.en=!this.en},'#5b6462']]};
      case 'scan':return {title:tr('商品をスキャン','Scan your items'),lines:[...this.scanned.slice(-4).map((l):[string,string?]=>[`${l.n>1?l.n+'× ':''}${(this.en?l.item[1]:l.item[0])}`]),[`${tr('合計','Total')} ${yen(this.due)}`,red]],offers:[[tr('お支払いへ','To payment'),()=>{if(this.todo.length)this.refuse(tr('かごにまだ商品があります','Items left in the basket'));else if(!this.scanned.length)this.refuse();else this.go(this.scanned.some(l=>l.item[6])?'age':'points')},this.accent,'money'],[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]};
      case 'age':return {title:tr('年齢確認','Age check'),lines:[[tr('お酒が含まれています。20歳以上ですか？','This sale includes alcohol. Are you 20 or over?')]],offers:[[tr('はい','Yes'),()=>this.go('points'),this.accent,'yes'],[tr('いいえ','No'),()=>this.refuse(tr('20歳未満の方には販売できません','Not sold to under-20s')),'#5b6462','no'],[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]};
      case 'points':return {title:tr('ポイントカード','Points card'),lines:[[tr('ポイントカードはお持ちですか？','Do you have a points card?')]],offers:[[tr('はい','Yes'),()=>this.refuse(tr('カードをお持ちではありません','You have no points card')),'#5b6462','points'],[tr('いいえ','No'),()=>this.go('bag'),this.accent,'no points'],[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]};
      case 'bag':return {title:tr('レジ袋','Carrier bag'),lines:[[tr(`レジ袋はご利用ですか？ 1枚 ${yen(bagBag)}`,`Do you want a bag? ${yen(bagBag)}`)]],offers:[[tr('いる','Yes'),()=>{this.wantBag=true;this.go('method')},'#5b6462','bag'],[tr('いらない','No'),()=>{this.wantBag=false;this.go('method')},this.accent,'no bag'],[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]};
      case 'method':return {title:`${tr('お支払い方法','How will you pay?')} ${yen(this.due)}`,lines:[],offers:[[tr('現金','Cash'),()=>this.go('cash'),this.accent,'money'],...([[tr('クレジット','Card'),tr('外国のカードは使えません','Your foreign card is refused'),'credit'],[tr('電子マネー','E-money'),tr('ICカードをお持ちではありません','You have no IC card'),'e-money'],[tr('QRコード','QR code'),tr('QR決済アプリがありません','You have no payment app'),'qr']] as const).map(([label,note,icon]):Offer=>[label,()=>this.refuse(note),'#5b6462',icon]),[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]};
      case 'cash':{const left=this.due-this.paid;return {title:tr('現金を入れてください','Insert your cash'),lines:[[`${tr('合計','Total')} ${yen(this.due)}`],[`${tr('お預かり','Paid')} ${yen(this.paid)}`],left>0?[`${tr('不足','Still due')} ${yen(left)}`,red]:[`${tr('おつり','Change')} ${yen(-left)}`]],offers:[[tr('お会計を確定','Confirm'),()=>this.settle(),left>0?'#9aa29a':this.accent,'yes'],[tr('取消','Cancel'),()=>this.cancel(),'#5b6462']]}}
      case 'thanks':return {title:tr('ありがとうございました','Thank you'),lines:this.tray.length?[[tr('おつりをお取りください','Please take your change'),red]]:[],offers:[]};
    }
  }
  private cell(i:number):Rect{const x=wallet0+6+(i%3)*32,y=24+(i/3|0)*40;return [x,y,x+30,y+38]}
  /** A choice on the screen: its picture on a white plate, the label beneath (a tile across the screen has them side by side). */
  private tile(g:CanvasRenderingContext2D,[l,t,r,b]:Rect,label:string,fill:string,name:Icon){
    box(g,l,t,r-l,b-t,fill,'#1d262280');
    if(b-t<30){box(g,l+2,t+2,34,b-t-4,'#fbfbf6');this.icon(g,name,l+7,t+2);write(g,label,(l+37+r)/2,t+Math.round((b-t-10)/2),'#fffef2','center');return}
    box(g,l+2,t+2,r-l-4,21,'#fbfbf6');this.icon(g,name,((l+r)>>1)-12,t+2);write(g,label,(l+r)/2,t+24,'#fffef2','center');
  }
  /** Icons, 24 × 20 art px: the cart, the circle and cross that mean yes and no in Japan, money, the cards, the QR code, a carrier bag; `no …` strikes one through. */
  private icon(g:CanvasRenderingContext2D,name:Icon,x:number,y:number){
    const round=(cx:number,cy:number,inner:number,outer:number,color:string)=>{for(let v=-outer;v<=outer;v++)for(let u=-outer;u<=outer;u++){const d=Math.hypot(u,v);if(d>=inner&&d<=outer)box(g,cx+u,cy+v,1,1,color)}};
    const cross=(color:string,size:number)=>{for(let k=-size;k<=size;k++){box(g,x+11+k,y+9+k,3,2,color);box(g,x+11-k,y+9+k,3,2,color)}};
    const plate=(fill:string)=>box(g,x+2,y+3,20,14,fill,ink);
    const base=name.startsWith('no ')?name.slice(3):name;
    switch(base){
      case 'cart':cartIcon(g,x+6,y+4,ink);break;
      case 'yes':round(x+12,y+10,4.5,7.5,'#2c8f54');break;
      case 'no':cross(red,6);break;
      case 'money':this.purse.paint(g,1000,x-3,y+1);this.purse.paint(g,100,x+15,y+6);break;
      case 'points':plate('#f6c94c');write(g,'P',x+12,y+5,red,'center');break;
      case 'credit':plate('#3f6fb5');box(g,x+3,y+6,18,3,ink);box(g,x+5,y+11,5,3,'#e5c04a');break;
      case 'e-money':plate('#2e9e6a');for(const k of [0,1,2]){box(g,x+9+k*3,y+8-k,1,4+k*2,'#fffef2');box(g,x+8+k*3,y+7-k,1,1,'#fffef2');box(g,x+8+k*3,y+12+k,1,1,'#fffef2')}break;
      case 'qr':{const dots=['1110101','1010011','1110110','0010100','1101011','0100110','1011101'];dots.forEach((line,v)=>[...line].forEach((dot,u)=>{if(dot==='1')box(g,x+5+u*2,y+3+v*2,2,2,ink)}));for(const [u,v] of [[0,0],[10,0],[0,10]]){box(g,x+5+u,y+3+v,4,4,ink);box(g,x+6+u,y+4+v,2,2,'#fbfbf6')}break}
      case 'bag':box(g,x+6,y+6,12,12,'#dfe8ee',ink);box(g,x+9,y+2,6,1,ink);box(g,x+9,y+2,1,4,ink);box(g,x+14,y+2,1,4,ink);break;
    }
    if(base!==name)for(let k=0;k<16;k++)box(g,x+4+k,y+18-k,2,2,red);
  }
  targets(){
    const list:Target[]=[...this.buttonsNow];
    if(this.step==='cash'){for(const {value,rect} of this.purse.spots())if(this.wallet[value])list.push({rect,act:()=>this.insert(value,isCoin(value)?coinSlot:noteSlot),carry:(g,x,y)=>this.purse.paint(g,value,x-(isCoin(value)?7:14),y-7),drop:(x,y)=>{const slot=[noteSlot,coinSlot].find(s=>inside(s,x,y));if(slot)this.insert(value,slot);else if(y>=150&&x<206)this.refuse()}})}
    else if(this.step==='scan')this.todo.forEach((line,i)=>list.push({rect:this.cell(i),act:()=>this.scan(line),carry:(g,x,y)=>thumb(g,{item:line.item,n:1},x-15,y-15,30),drop:(x,y)=>{if(inside(scanner,x,y))this.scan(line)}}));
    for(const [rect,coin] of [[noteTray,false],[coinTray,true]] as const)if(this.tray.some(value=>isCoin(value)===coin))list.push({rect,act:()=>this.takeChange(coin)});
    return [...list,...this.footNow];
  }
  draw(g:CanvasRenderingContext2D){
    // The shop behind, the counter, the machine's mint back and foot.
    box(g,0,0,W,H,'#e9e6dc');box(g,0,14,W,8,this.accent);box(g,0,0,W,14,'#f1f0ea');box(g,0,120,W,80,'#d9d8d0');box(g,0,148,W,52,'#f4f4ee');box(g,0,148,W,2,'#bdbcb2');
    box(g,4,150,206,50,'#3b4341');box(g,6,0,128,152,'#7fa79a');
    box(g,9,4,122,146,ink);
    // The payment terminal, the scanner on its stand with its red line.
    box(g,136,34,24,84,'#eef4f6','#9aa29a');box(g,139,38,18,24,ink);for(let k=0;k<12;k++)box(g,140+(k%3)*6,66+(k/3|0)*6,4,4,'#c9cdd0');box(g,144,118,8,32,'#7fa79a');
    const ready=this.step==='scan';box(g,scanner[0]+8,scanner[1]+58,26,32,'#7fa79a');box(g,scanner[0]+2,scanner[1]+18,38,30,'#eef4f6','#9aa29a');box(g,scanner[0]+6,scanner[1]+24,30,14,ready?'#3a4a44':'#5b6462');box(g,scanner[0]+10,scanner[1]+48,20,10,'#c9cdd0');
    if(ready){box(g,scanner[0]+2,scanner[1]+40,38,2,red);box(g,scanner[0]+12,scanner[1]+2,2,16,'#d2402e80');box(g,scanner[0]+28,scanner[1]+2,2,16,'#d2402e80')}
    write(g,'スキャン',(scanner[0]+scanner[2])/2,scanner[1]+4,ink,'center');
    // The cash unit: note slot, coin hopper, the change tray and what lies in it.
    const shaking=performance.now()-this.tinted<220,cash=this.step==='cash';
    for(const [rect,text] of [[noteSlot,'紙幣'],[coinSlot,'硬貨']] as const){const [l,t,r,b]=rect;box(g,l,t,r-l,b-t,'#1d2622',cash?lit:'#5b6462');box(g,l+4,(t+b-3)>>1,r-l-8,3,'#000');write(g,text,(l+r)/2,b+1,'#c9cdd0','center')}
    for(const [rect,text,coin] of [[noteTray,'紙幣',false],[coinTray,'硬貨',true]] as const){const [l,t,r,b]=rect,full=this.tray.some(value=>isCoin(value)===coin);box(g,l,t,r-l,b-t,'#1d2622',full?lit:'#5b6462');write(g,full?text:'',(l+r)/2,t+1,'#c9cdd0','center')}
    // The notes in a neat stack in their tray, the coins in a loose heap in theirs.
    let stacked=0,heaped=0;for(const value of this.tray){
      if(isCoin(value)){const {x,y,turn}=heapSpot(value,heaped++);this.purse.paint(g,value,Math.round((coinTray[0]+coinTray[2])/2+x*13)-7,Math.round(coinTray[1]+25+y*7)-7,turn)}
      else{const step=Math.min(stacked++,5);this.purse.paint(g,value,noteTray[0]+3+step,noteTray[1]+21-step)}
    }
    // The screen.
    const page=this.page(),[sl,st,sr,sb]=screen,sw=sr-sl;box(g,sl,st,sw,sb-st,'#fbfbf6');box(g,sl,st,sw,14,this.accent);write(g,page.title,(sl+sr)/2,st+2,'#fffef2','center');
    if(shaking)box(g,sl,st,sw,sb-st,'#d2402e30');
    let y=st+18;for(const [text,color] of page.lines)for(const part of wrap(g,text,sw-6).slice(0,3)){write(g,part,sl+3,y,color);y+=11}
    if(this.note)for(const part of wrap(g,this.note,sw-6)){write(g,part,sl+3,y,red);y+=11}
    // The choices as icon tiles, two by two (a lone one across the screen), the plain buttons at the foot.
    const plain=page.offers.filter(offer=>!offer[3]).length,tiles=page.offers.length-plain,foot=sb-3-plain*16,tall=tiles>1?38:26,rows=Math.ceil(tiles/2);
    let tile=0,row=0;
    this.buttonsNow=page.offers.map(([label,act,fill,name]):Target=>{
      let rect:Rect;
      if(name){
        const k=tile++,half=tiles>1,left=half&&k%2?sl+58:sl+3,top=foot-(rows-(k>>1))*tall;
        rect=[left,top,half?left+55:sr-3,top+tall-2];this.tile(g,rect,label,fill??this.accent,name);
      }else{rect=[sl+3,foot+row*16,sr-3,foot+row*16+14];row++;button(g,rect,label,fill??this.accent)}
      return {rect,act};
    });
    // The right-hand panel: the wire basket waiting on the counter, or the purse.
    if(cash){
      this.purse.draw(g);
    }else{
      box(g,wallet0,6,W-wallet0-4,188,'#d8dcd8','#9aa29a');write(g,'かご / BASKET',wallet0+5,10,ink);
      for(let x=wallet0+6;x<W-8;x+=8)box(g,x,22,1,168,'#b8c0bc');for(let v=22;v<190;v+=8)box(g,wallet0+4,v,W-wallet0-12,1,'#b8c0bc');
      this.todo.forEach((line,i)=>{const [l,t,r,b]=this.cell(i);box(g,l,t,r-l,b-t,'#f4f4eee0');thumb(g,line,l,t+4,30)});
    }
    // In the bottom corners, as in the aisles: back to the shelves, and out of the shop.
    this.footNow=([[`LB ← ${this.shelves}`,2,'left',this.leave],['出口 → RB',W-2,'right',this.exit]] as const).map(([text,x,side,act]):Target=>{g.font='10px "Yorimichi Bitmap"';const w=Math.ceil(g.measureText(text).width),l=side==='left'?x:x-w-6;box(g,l,H-14,w+6,13,'#1d2622c0');write(g,text,l+3,H-12,'#f4f4ee');return {rect:[l,H-14,l+w+6,H-1],act}});
  }
}
