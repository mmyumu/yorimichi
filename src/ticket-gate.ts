import { clockBadge, darkness } from './clock';
import { fareBetween } from './fares';
import { box, pixelText } from './hall-scene';
import { stations, tracksFor, type Hub, type Service } from './network';
import type { TravelTicket } from './ticket-machine';
import { coins, isCoin, machineSound, notes, pieceArt, walletTotal, type Wallet } from './wallet';

type P=[number,number,number];
type XY=[number,number];
/** A fixed eye: where it stands and how the scene is laid onto the picture (vanishing point vx, vy; k pixels per cm at 1 cm away). */
export interface View {eye:P;vx:number;vy:number;k:number}
// The picture is 240 × 150 pixels, scaled up whole. World units are centimetres: x across (the player's lane centred on 0), y up, z forward from the gate's near end.
const W=240,H=150,cabW=22,cabH=96,cabL=170,pitch=78,ours=pitch/2,wallZ=330;
// Our lane's cabinet on the right: ticket slot, small screen and exit slot on its lane side, the flaps in the middle.
const slotX=ours-cabW/2+8,entryZ=[34,44],exitZ=[148,156],flapZ=85;
// Two still pictures, teleported between: close before the gate, then over the exit slot.
const views:View[]=[{eye:[0,150,-60],vx:120,vy:20,k:110},{eye:[14,140,105],vx:70,vy:-25,k:110}];
const gateNames:Record<Service,[string,string]>={local:['中央改札','Central Gate'],shinkansen:['新幹線のりかえ口','Shinkansen Transfer']};
/** Which gates: a station's name and accent, and its hub on the way in (`exit` false: the gates punch the ticket with it, the platforms' board beyond);
 * on the way out (`exit`), the station's entrance hall lies beyond under the hanging signs to its `exits` (left, right), and the gate keeps every ticket it lets through,
 * except one punched at `cancel` (an entry cancelled: it comes back out). */
export interface GateSide {ja:string;en:string;accent:string;hub?:Hub;exit?:boolean;exits?:[string,string];cancel?:Hub}
const C={ink:'#1d2622',body:'#2f3634',greenBright:'#55cf5f',green:'#3ea84b',greenDark:'#2a7a35',greenLight:'#7fd08a',top:'#1f2423',topDark:'#181c1b',edge:'#6d7772',grey:'#c9cdc5',greyDark:'#9aa29a',kick:'#59625e',housing:'#3b4341',floorA:'#ddd5c4',floorB:'#c4bdaf',wall:'#e6e3d8',wallLine:'#cbc7b9',ceiling:'#e9eae2',light:'#ffffff',yellow:'#f2c230',yellowDark:'#c9a020',slot:'#e2c234',slit:'#0d1211',icPad:'#cfe7f1',icRing:'#3d9fd3',lcd:'#173a57',lcdNg:'#b8332b',red:'#d6402e',white:'#f4f4ee',orange:'#e8853a',board:'#121614',amber:'#f29a2e',concourseA:'#e2d6bd',concourseB:'#cdbf9f',hallWall:'#e9e2cf',sky:'#d8ecf4',skyLow:'#bcdbe8',pavement:'#c9c7b8',tree:'#6f9c6a',trunk:'#6b5a46',frame:'#4c5f5c',lintel:'#5d6a62',pillar:'#ddd5bf',pillarSide:'#c4bba2',pillarEdge:'#a99f85'};
// 4 × 4 ordered dither, for the fade of the teleport.
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
const ticketPaper=(ticket:TravelTicket):[string,string]=>ticket.kind==='adjust'?['#f6eed2','#e4d39c']:ticket.kind==='route'&&ticket.service==='shinkansen'?['#f7e6cc','#ecc796']:fareBetween('京都',stations[ticket.from].ja)!==null?['#e5eff6','#bcd5ea']:['#e8f1df','#c4ddb3'];

/** A JR magnetic ticket (128 × 64): the issuing company's pattern (JR Central orange on the Shinkansen, JR West blue from Kyoto, JR East green), route and fare;
 * a fare adjustment ticket (精算券) on cream paper, with the trip it settles and the difference paid. */
export function paintTicket(g:CanvasRenderingContext2D,w:number,h:number,ticket:TravelTicket){
  const route=ticket.kind==='route'?ticket:null,shinkansen=route?.service==='shinkansen',ink='#1d2622',soft='#4b5a52',from=stations[ticket.from].ja,[paper,pattern]=ticketPaper(ticket);
  box(g,0,0,w,h,paper,'#b4ab92');
  for(let r=0,y=3;y<h-3;r++,y+=6)for(let x=3+(r%2)*6;x<w-4;x+=12){box(g,x+1,y,1,1,pattern);box(g,x,y+1,3,1,pattern);box(g,x+1,y+2,1,1,pattern)}
  pixelText(g,ticket.kind==='adjust'?'精算券':shinkansen?'乗車券・新幹線特急券':'乗車券',5,8,9,soft,'left',true);pixelText(g,'JR',w-5,8,10,soft,'right',true);
  pixelText(g,route?`${from} → ${route.name.split(' / ')[1]}`:ticket.kind==='adjust'?`${from} → ${ticket.to}`:`${from} → ${ticket.fare}円区間`,w/2,26,route||ticket.kind==='adjust'?16:13,ink,'center',true);
  pixelText(g,`¥${ticket.fare.toLocaleString('en-US')}`,5,44,11,ink,'left',true);pixelText(g,'大人1名',w-5,44,9,soft,'right');
  pixelText(g,'当日限り有効',5,56,8,soft,'left');pixelText(g,ticket.kind==='adjust'?'出場用':'下車前途無効',w-5,56,8,soft,'right');
  // Punched by a gate: a round hole through the card in the blank between the fare and 大人1名, where nothing hides it, its edge pressed dark.
  if(ticket.punched)for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const d=Math.hypot(dx,dy),x=Math.round(w/2)+dx,y=46+dy;if(d<=4.6)g.clearRect(x,y,1,1);else if(d<=6.2)box(g,x,y,1,1,d<=5.4?'#3d3a30':'#8a8270')}
}

/** Flat polygons projected and filled whole pixel by whole pixel (no anti-aliasing), outlined, with bitmap lettering: the gate (and the ticket hall's pixel view) as pixel art. */
export class Picture {
  constructor(private g:CanvasRenderingContext2D,private v:View,private w=W,private h=H){}
  project([x,y,z]:P):XY{const d=z-this.v.eye[2];return [this.v.vx+(x-this.v.eye[0])*this.v.k/d,this.v.vy+(this.v.eye[1]-y)*this.v.k/d]}
  /** Keeps the part of a polygon at least 6 cm in front of the eye. */
  private clip(points:P[]){
    const near=this.v.eye[2]+6,out:P[]=[];
    points.forEach((a,i)=>{const b=points[(i+1)%points.length],ain=a[2]>=near,bin=b[2]>=near;if(ain)out.push(a);if(ain!==bin){const t=(near-a[2])/(b[2]-a[2]);out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,near])}});
    return out;
  }
  /** Fills a screen polygon by scanlines through pixel centres; `alt` checkers it in a second colour. */
  fill(points:XY[],color:string,alt?:string){
    const g=this.g,ys=points.map(p=>p[1]);g.fillStyle=color;
    for(let y=Math.max(0,Math.ceil(Math.min(...ys)-.5));y<=Math.min(this.h-1,Math.floor(Math.max(...ys)-.5));y++){
      const sy=y+.5,xs:number[]=[];
      points.forEach(([ax,ay],i)=>{const [bx,by]=points[(i+1)%points.length];if((ay<=sy)!==(by<=sy))xs.push(ax+(sy-ay)*(bx-ax)/(by-ay))});
      xs.sort((a,b)=>a-b);
      for(let i=0;i+1<xs.length;i+=2){
        const a=Math.max(0,Math.round(xs[i])),b=Math.min(this.w,Math.round(xs[i+1]));if(b<=a)continue;
        g.fillStyle=color;g.fillRect(a,y,b-a,1);if(alt){g.fillStyle=alt;for(let x=a+((a+y)&1);x<b;x+=2)g.fillRect(x,y,1,1)}
      }
    }
  }
  /** One-pixel outline, Bresenham. */
  outline(points:XY[],color:string){
    this.g.fillStyle=color;
    points.forEach((a,i)=>{
      const b=points[(i+1)%points.length];let [x0,y0]=a.map(Math.floor),[x1,y1]=b.map(Math.floor);
      const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx+dy;
      for(let n=0;n<2000;n++){if(x0>=0&&x0<this.w&&y0>=0&&y0<this.h)this.g.fillRect(x0,y0,1,1);if(x0===x1&&y0===y1)break;const e=2*err;if(e>=dy){err+=dy;x0+=sx}if(e<=dx){err+=dx;y0+=sy}}
    });
  }
  /** A world polygon: clipped, projected, filled and optionally outlined. Returns its screen points. */
  face(points:P[],color:string,line?:string,alt?:string){const xy=this.clip(points).map(p=>this.project(p));if(xy.length<3)return xy;this.fill(xy,color,alt);if(line)this.outline(xy,line);return xy}
  edge(points:P[],line:string){const xy=this.clip(points).map(p=>this.project(p));if(xy.length>2)this.outline(xy,line)}
  quad(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number){
    // A rectangle on one of the three planes: whichever extent is zero.
    if(x0===x1)return [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]] as P[];
    if(y0===y1)return [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]] as P[];
    return [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]] as P[];
  }
  /** A disc lying on a horizontal or upright plane, as a 16-gon. */
  disc(cx:number,cy:number,cz:number,r:number,flat:boolean){return Array.from({length:16},(_,i)=>{const a=i*Math.PI/8;return (flat?[cx+Math.cos(a)*r,cy,cz+Math.sin(a)*r]:[cx+Math.cos(a)*r,cy+Math.sin(a)*r,cz]) as P})}
  text(text:string,[x,y]:XY,color:string,size=10){const g=this.g;g.font=`${size}px "Yorimichi Bitmap"`;g.textBaseline='top';g.fillStyle=color;g.fillText(text,Math.round(x-g.measureText(text).width/2),Math.round(y-size/2))}
  visible(p:P){return p[2]-this.v.eye[2]>6}
  /** Fades to black through the ordered dither, `level` 0 to 16. */
  fade(level:number){if(level<=0)return;this.g.fillStyle=C.ink;for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++)if(bayer[(y&3)*4+(x&3)]<level)this.g.fillRect(x,y,1,1)}
}

/** At the ticket gates, standing still before one gate: the inventory beside the picture, the ticket dragged into the slot, picked up again at the far end. */
export class TicketGate {
  private overlay=document.createElement('div');
  private viewport=document.createElement('div');
  private canvas=document.createElement('canvas');
  private g=this.canvas.getContext('2d')!;
  private inventory=document.createElement('aside');
  private pocket=document.createElement('section');
  private position=document.createElement('span');
  private status=document.createElement('span');
  // The hall, floor and far wall of each picture, painted once.
  private backdrops:HTMLCanvasElement[]=[];
  private lcd:'idle'|'ok'|'ng'='idle';
  // How far the flaps are shut, 0 (folded away) to 1.
  private flaps=0;
  // Where the slot and the ticket were drawn, in picture pixels, for drops and clicks.
  private slotRect:[number,number,number,number]|null=null;
  private ticketRect:[number,number,number,number]|null=null;
  private resize=new ResizeObserver(()=>this.fit());
  private frame=0;
  private previousTime=0;
  private disposed=false;
  // ready → reading → passing → out (the ticket waits at the exit slot) → gone, or straight to gone on the way out, where the gate keeps it; or reading → refused (back out at the entry slot) → ready.
  private state:'ready'|'reading'|'passing'|'out'|'refused'|'gone'='ready';
  private since=0;
  // Why the gate refuses the ticket in it ('' when it lets it through); the player is never told, only beeped at: reading the ticket and the signs is up to them.
  private reason='';
  // The tickets in the inventory, the one in the gate and where it was in the pocket (a refused ticket goes back there).
  private held:TravelTicket[];
  private inGate:TravelTicket|null=null;
  private from=0;
  // Kept by the way-out gate at the end of its trip: it does not come back out.
  private kept=false;
  // The ticket chosen in the pocket (D-pad, stick or arrows): what A, E or a click on the slot puts in.
  private selected=0;
  private lastStick=0;
  private dropHover=false;
  private justDragged=0;
  private lastPadButtons:boolean[]=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected)?.buttons.map(b=>b.pressed)??[];
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private side:GateSide,private service:Service,tickets:TravelTicket[],private wallet:Wallet,private refuse:(ticket:TravelTicket)=>string,private done:{pass:(ticket:TravelTicket)=>void;leave:()=>void}){
    this.held=tickets;
    // A JR stop's single gate line has no name of its own.
    const [ja,en]=side.hub||!side.exit?gateNames[service]:['改札口','Ticket gate'];
    this.overlay.className='machine-hall ticket-gate';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label',side.exit?'At the exit gates':'At the ticket gates');
    const header=this.el(this.overlay,'header','','hall-header');
    this.el(header,'div',`${side.ja} ${side.en.toUpperCase()} / ${ja}${side.exit?' · 出口':''}`,'hall-heading');header.append(clockBadge());
    this.button(header,side.exit?'Back to the platforms':'Back to the concourse',()=>this.back(),'hall-exit');
    this.viewport.className='hall-viewport gate-viewport';this.viewport.tabIndex=0;this.viewport.setAttribute('aria-label',`${en} gate. E or A: insert or take the ticket.`);
    this.canvas.width=W;this.canvas.height=H;this.canvas.className='gate-picture';this.viewport.append(this.canvas);
    this.inventory.className='gate-inventory';this.el(this.inventory,'h2','持ち物 / INVENTORY');
    this.pocket.className='gate-pocket';this.inventory.append(this.pocket);
    const purse=this.el(this.inventory,'section','','gate-purse');this.el(purse,'span',`財布 / WALLET  ¥${walletTotal(wallet).toLocaleString('en-US')}`,'gate-label');
    const pieces=this.el(purse,'div','','gate-pieces');
    for(const value of [...notes,...coins])if(wallet[value]){const piece=this.el(pieces,'span','','gate-piece'+(isCoin(value)?' coin':''));piece.title='¥'+value.toLocaleString('en-US');const image=this.el(piece,'img') as HTMLImageElement;image.src=pieceArt(value);image.alt='¥'+value;this.el(piece,'span','×'+wallet[value])}
    this.overlay.append(this.viewport,this.inventory);
    const bottom=this.el(this.overlay,'div','','hall-bottom');bottom.append(this.position,this.status);this.position.textContent=`${ja} ${en}`;
    this.el(this.overlay,'p','Drag a ticket onto the yellow slot, or click it in the inventory (E, A: the chosen one) · Click the ticket at the exit, E or A: take it'+' · B / Esc: back','hall-help');
    this.overlay.addEventListener('keydown',this.keydown);this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    this.viewport.addEventListener('pointermove',event=>{const target=this.pick(event.clientX,event.clientY);this.viewport.style.cursor=target==='ticket'?'pointer':''});
    this.viewport.addEventListener('pointerdown',event=>{this.viewport.focus();const target=this.pick(event.clientX,event.clientY);if(target==='ticket')this.take()});
    document.body.append(this.overlay);this.renderPocket();
    this.resize.observe(this.viewport);this.fit();this.frame=requestAnimationFrame(this.tick);
    document.fonts?.load('16px "Yorimichi JP"').then(()=>{if(!this.disposed)this.renderPocket()}).catch(()=>{});
  }
  private el(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private button(parent:HTMLElement,label:string,action:()=>void,cls=''){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=cls;b.onclick=action;parent.append(b);return b;}
  /** Whole-pixel scaling as soon as the picture is twice its size; smaller screens get what fits. */
  private fit(){
    const fit=Math.min(this.viewport.clientWidth/W,this.viewport.clientHeight/H),scale=fit>=2?Math.floor(fit):fit;
    this.canvas.style.width=W*scale+'px';this.canvas.style.height=H*scale+'px';
  }
  /** The hall around the gate, after the Shinjuku west gate: checked floor, white ceiling with its lights, tiled far wall under the yellow 改札 band, the platform board.
   * On the way out, the station's entrance hall instead (`entrance`). */
  private backdrop(index:number){
    if(this.backdrops[index])return this.backdrops[index];
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const g=canvas.getContext('2d')!,pic=new Picture(g,views[index]),[ja,en]=gateNames[this.service];
    if(this.side.exit){this.entrance(g,pic);return this.backdrops[index]=canvas}
    g.fillStyle=C.floorA;g.fillRect(0,0,W,H);
    for(let x=-420;x<420;x+=30)for(let z=-60;z<wallZ;z+=30)if(((x+z)/30&1)===0)pic.face(pic.quad(x,x+30,0,0,z,z+30),C.floorB);
    pic.face(pic.quad(-420,420,260,260,-60,wallZ),C.ceiling);
    for(let z=0;z<wallZ;z+=120)for(const x of [-150,90])pic.face(pic.quad(x,x+60,259,259,z,z+14),C.light,C.wallLine);
    pic.face(pic.quad(-420,420,0,260,wallZ,wallZ),C.wall);
    for(let x=-420;x<420;x+=40)pic.outline([pic.project([x,0,wallZ]),pic.project([x,260,wallZ])],C.wallLine);
    for(let y=0;y<260;y+=40)pic.outline([pic.project([-420,y,wallZ]),pic.project([420,y,wallZ])],C.wallLine);
    pic.face(pic.quad(-420,420,174,216,wallZ-2,wallZ-2),C.yellow,C.yellowDark);
    pic.text(`${ja}  ${en}`,pic.project([0,195,wallZ-2]),C.ink);
    pic.face(pic.quad(-190,190,122,162,wallZ-4,wallZ-4),C.board,C.kick);pic.text(`${tracksFor(this.side.hub!,this.service)}番線 のりば`,pic.project([0,142,wallZ-4]),C.amber);
    return this.backdrops[index]=canvas;
  }
  /** On the way out, the station's entrance hall beyond the gates: a wide concourse floor running on to the far wall, 7 m off, glazed from the floor
   * with the automatic doors and the daylight (or the night) outside, the station's name over them; two pillars, and the yellow exit signs hanging between them and the gates.
   * Sized for the first view (at the far wall a picture pixel is about 7 cm, at the signs 4.4 cm), so the 10 px lettering sits inside its panels. */
  private entrance(g:CanvasRenderingContext2D,pic:Picture){
    const far=700,signZ=420,[left,right]=this.side.exits??['← 出口 Exit','出口 Exit →'];
    g.fillStyle=C.hallWall;g.fillRect(0,0,W,H);
    for(let x=-1200;x<1200;x+=60)for(let z=-60;z<far;z+=60)pic.face(pic.quad(x,x+60,0,0,z,z+60),((x+z)/60&1)===0?C.concourseB:C.concourseA);
    // The glazed front: daylight (or the night, on the journey's clock), the pavement and a street tree outside, mullions, the transom and the doors in the middle; the lintel and the name board above.
    const night=darkness()>.5,sky=night?'#1f2a48':C.sky,skyLow=night?'#2c3a5c':C.skyLow,tree=night?'#22382c':C.tree,trunk=night?'#2c2620':C.trunk;
    pic.face(pic.quad(-1200,1200,0,600,far,far),C.hallWall);
    pic.face(pic.quad(-520,520,0,190,far,far),sky);pic.face(pic.quad(-520,520,0,95,far-.1,far-.1),skyLow);pic.face(pic.quad(-520,520,0,28,far-.2,far-.2),night?'#5a5d5c':C.pavement);
    pic.face(pic.quad(-430,-330,40,150,far-.3,far-.3),tree);pic.face(pic.quad(-392,-372,0,45,far-.3,far-.3),trunk);pic.face(pic.quad(330,440,50,140,far-.3,far-.3),tree);pic.face(pic.quad(376,394,0,52,far-.3,far-.3),trunk);
    for(let x=-520;x<=520;x+=130)pic.face(pic.quad(x-4,x+4,0,190,far-.4,far-.4),C.frame);
    pic.face(pic.quad(-520,520,152,160,far-.4,far-.4),C.frame);pic.face(pic.quad(-130,130,0,152,far-.5,far-.5),skyLow,C.frame);pic.face(pic.quad(-3,3,0,152,far-.6,far-.6),C.frame);
    pic.face(pic.quad(-540,540,190,204,far-.4,far-.4),C.lintel);
    // The board as wide as the name, with a margin: picture pixels are (far - eye) / k cm there.
    const name=`${this.side.ja}  ${this.side.en}`;g.font='10px "Yorimichi Bitmap"';const half=(g.measureText(name).width/2+6)*(far-views[0].eye[2])/views[0].k;
    pic.face(pic.quad(-half,half,208,284,far-.5,far-.5),C.white,C.edge);pic.face(pic.quad(-half,half,208,215,far-.6,far-.6),this.side.accent);
    pic.text(name,pic.project([0,244,far-.7]),C.ink);
    // Square pillars either side, then the hanging exit signs in front of them, on their rods.
    for(const s of [-1,1]){
      const x0=s*380,x1=s*440,[a,b]=s<0?[x1,x0]:[x0,x1];
      pic.face(pic.quad(x0,x0,0,600,460,520),C.pillarSide,C.pillarEdge);pic.face(pic.quad(a,b,0,600,460,460),C.pillar,C.pillarEdge);pic.face(pic.quad(a,b,30,36,459.8,459.8),C.pillarEdge);
    }
    for(const [x0,x1,text] of [[-520,-220,left],[220,520,right]] as const){
      for(const x of [x0+30,x1-30])pic.face(pic.quad(x-2,x+2,228,600,signZ+1,signZ+1),C.edge);
      pic.face(pic.quad(x0,x1,176,230,signZ,signZ),C.yellow,C.yellowDark);pic.text(text,pic.project([(x0+x1)/2,203,signZ-.2]),C.ink);
    }
  }
  /** A gate cabinet centred on x: green and grey sides, its near end with the direction display and IC mark, and on its top, on the side of the lane it serves (its left), the IC reader, ticket slot, screen and exit slot. */
  private cabinet(pic:Picture,view:View,cx:number){
    // After the JR East gates at Shinjuku: a charcoal body with green flanks and a bright panel near the end, a black top sloping down at the near end into a hood that carries the small screen.
    const x0=cx-cabW/2,x1=cx+cabW/2,[ex,ey,ez]=view.eye,hood=cabH-8,hz=14,ours_=cx===ours;
    for(const x of [x0,x1])if(x===x0?ex<x0:ex>x1){
      for(const [y0,y1,color] of [[0,10,C.kick],[10,52,C.body],[52,hood,C.green]] as [number,number,string][])pic.face(pic.quad(x,x,y0,y1,0,cabL),color);
      pic.face([[x,hood,0],[x,hood,cabL],[x,cabH,cabL],[x,cabH,hz]],C.top);
      pic.face(pic.quad(x,x,58,82,5,30),C.greenBright,C.greenDark);
      pic.face(pic.quad(x,x,52,hood,flapZ-14,flapZ+14),C.housing);
      pic.edge([[x,0,0],[x,0,cabL],[x,cabH,cabL],[x,cabH,hz],[x,hood,0]],C.ink);
    }
    if(ez<0){
      for(const [y0,y1,color] of [[0,10,C.kick],[10,hood,C.body]] as [number,number,string][])pic.face(pic.quad(x0,x1,y0,y1,0,0),color);
      pic.face(pic.quad(x0+4,x1-4,30,82,-.1,-.1),C.green,C.greenDark);
      pic.face(pic.quad(x0+6,x1-6,62,78,-.2,-.2),C.board);
      pic.face([[cx,77,-.3],[cx+4,71,-.3],[cx+1.5,71,-.3],[cx+1.5,64,-.3],[cx-1.5,64,-.3],[cx-1.5,71,-.3],[cx-4,71,-.3]],C.greenLight);
      pic.face(pic.quad(cx-4,cx+4,40,48,-.2,-.2),C.orange);
      pic.edge(pic.quad(x0,x1,0,hood,0,0),C.ink);
    }
    // The hood, and on it the small screen facing the player: blue to go, a green arrow on when let through, a red cross when refused.
    const at=(u:number,v:number):P=>[x0+u*cabW,hood+(cabH-hood)*v,hz*v];
    if(ey>hood||ez<0){
      pic.face([at(0,0),at(1,0),at(1,1),at(0,1)],C.top,C.ink);
      const lcd=ours_?this.lcd:'idle',[u0,u1,v0,v1]=[.14,.86,.18,.86];
      pic.face([at(u0-.04,v0-.08),at(u1+.04,v0-.08),at(u1+.04,v1+.08),at(u0-.04,v1+.08)],C.housing);
      pic.face([at(u0,v0),at(u1,v0),at(u1,v1),at(u0,v1)],{idle:C.lcd,ok:C.board,ng:C.board}[lcd]);
      if(lcd==='ng')for(const [a,b,c,d] of [[[u0+.12,v0+.1],[u0+.22,v0+.1],[u1-.12,v1-.1],[u1-.22,v1-.1]],[[u1-.12,v0+.1],[u1-.22,v0+.1],[u0+.12,v1-.1],[u0+.22,v1-.1]]])pic.face([at(a[0],a[1]),at(b[0],b[1]),at(c[0],c[1]),at(d[0],d[1])],C.red);
      // Let through: a green arrow pointing on, through the gate (up the hood is forward).
      else if(lcd==='ok')pic.face([[.5,v1-.06],[.72,.56],[.58,.56],[.58,v0+.08],[.42,v0+.08],[.42,.56],[.28,.56]].map(([u,v])=>at(u,v)),C.greenBright);
      else pic.face([at(.3,.45),at(.7,.45),at(.7,.6),at(.3,.6)],C.white);
    }
    if(ey>cabH){
      pic.face(pic.quad(x0,x1,cabH,cabH,hz,cabL),C.top,C.ink,C.topDark);
      pic.face(pic.quad(x0,x1,cabH,cabH,flapZ-10,flapZ+10),C.topDark);
      pic.face(pic.quad(x0+2,x0+20,cabH,cabH,16,30),C.icPad,C.icRing);pic.face(pic.disc(x0+11,cabH,23,5.5,true),C.icRing);pic.face(pic.disc(x0+11,cabH,23,4,true),C.icPad);
      const blink=ours_&&this.state==='ready'&&!!this.held.length&&Math.floor(performance.now()/350)%2===0;
      for(const [z0,z1] of [entryZ,exitZ]){
        const rim=pic.face(pic.quad(x0+1,x0+15,cabH,cabH,z0,z1),z0===entryZ[0]&&(blink||(ours_&&this.dropHover))?C.white:C.slot,C.yellowDark);
        pic.face(pic.quad(x0+3,x0+13,cabH,cabH,z0+(z1-z0)*.4,z0+(z1-z0)*.6),C.slit);
        if(ours_&&z0===entryZ[0]&&rim.length){const xs=rim.map(p=>p[0]),ys=rim.map(p=>p[1]);this.slotRect=[Math.min(...xs)-6,Math.min(...ys)-6,Math.max(...xs)+6,Math.max(...ys)+6]}
      }
      if(view===views[1])pic.text('出口',pic.project([x0+8,cabH,exitZ[0]-7]),C.white);
    }
  }
  private drawn='';
  private draw(){
    const t=this.since,teleport=this.state==='passing',index=teleport&&t>=.6||this.state==='out'||this.state==='gone'?1:0,view=views[index],pic=new Picture(this.g,view);
    const [z,out]=this.state==='reading'?[entryZ,t<.35?1-t/.35:0]:this.state==='refused'?[entryZ,clamp01((t-.3)/.3)]:teleport&&!this.kept?[exitZ,clamp01((t-1)/.3)]:this.state==='out'?[exitZ,1]:[entryZ,0];
    const fade=teleport?t<.35?0:t<.6?Math.round((t-.35)/.25*16):Math.round(16-clamp01((t-.6)/.25)*16):0;
    // Repainted only when something in the picture changes: the slot's blink, the screen, the flaps, the ticket, the fade.
    const key=[index,this.state==='ready'&&!!this.held.length&&Math.floor(performance.now()/350)%2,this.dropHover,this.lcd,Math.round(this.flaps*20),z[0],Math.round(out*10),fade].join();
    if(key===this.drawn)return;this.drawn=key;
    this.g.drawImage(this.backdrop(index),0,0);this.slotRect=this.ticketRect=null;
    // Nearest cabinets last; the lane's flaps after them, the ticket on top.
    for(const cx of [-3*ours,3*ours,-ours,ours].sort((a,b)=>Math.abs(b-view.eye[0])-Math.abs(a-view.eye[0])))this.cabinet(pic,view,cx);
    if(this.flaps>.05)for(const side of [-1,1]){
      const inner=side*(ours-cabW/2),tip=inner-side*27*this.flaps,[a,b]=side<0?[inner,tip]:[tip,inner];
      pic.face(pic.quad(a,b,52,88,flapZ-1.5,flapZ-1.5),C.green,C.greenDark);pic.face(pic.disc((a+b)/2,70,flapZ-1.6,Math.min(7,(b-a)/2-1),false),C.red);pic.face(pic.quad((a+b)/2-4,(a+b)/2+4,68.5,71.5,flapZ-1.7,flapZ-1.7),C.white);
    }
    const zm=(z[0]+z[1])/2;
    if(out>0&&this.inGate&&pic.visible([slotX,cabH,zm])){
      const paper=ticketPaper(this.inGate);
      const top=cabH+5*out,xy=pic.face(pic.quad(slotX-5,slotX+5,cabH,top,zm,zm),paper[0],'#8a8270');
      // The print on the ticket, cut off at the slot: what is still inside the cabinet must not show through its top.
      const print=(x0:number,x1:number,y0:number,y1:number,dz:number,color:string)=>{if(y1>cabH+.2)pic.face(pic.quad(x0,x1,Math.max(cabH+.2,y0),y1,zm-dz,zm-dz),color)};
      print(slotX-3.5,slotX+3.5,top-1.6,top-1,.1,paper[1]);print(slotX-4,slotX+1,top-3,top-2.5,.1,C.kick);
      if(this.inGate.punched)print(slotX-.7,slotX+.7,top-4.1,top-2.7,.2,C.ink);
      if(xy.length){const xs=xy.map(p=>p[0]),ys=xy.map(p=>p[1]);this.ticketRect=[Math.min(...xs)-5,Math.min(...ys)-5,Math.max(...xs)+5,Math.max(...ys)+5]}
    }
    pic.fade(fade);
  }
  /** The slot or the ticket under a viewport point. */
  private pick(clientX:number,clientY:number){
    const rect=this.canvas.getBoundingClientRect(),x=(clientX-rect.left)/rect.width*W,y=(clientY-rect.top)/rect.height*H;
    const inside=(r:[number,number,number,number]|null)=>!!r&&x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3];
    if((this.state==='out'||this.state==='refused')&&inside(this.ticketRect))return 'ticket';
    return inside(this.slotRect)?'slot':null;
  }
  private renderPocket(){
    this.selected=Math.min(this.selected,Math.max(0,this.held.length-1));
    this.pocket.replaceChildren();this.el(this.pocket,'span',`きっぷ / TICKETS  ${this.held.length+(this.inGate?1:0)}`,'gate-label');
    const list=this.el(this.pocket,'div','','gate-tickets');
    this.held.forEach((ticket,index)=>{
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;paintTicket(canvas.getContext('2d')!,128,64,ticket);
      const button=this.button(list,'',()=>{if(performance.now()-this.justDragged>150)this.insert(index)},'gate-ticket'+(index===this.selected&&this.held.length>1?' selected':''));button.onfocus=()=>{if(this.selected!==index){this.selected=index;this.pocket.querySelectorAll('.gate-ticket').forEach((b,i)=>b.classList.toggle('selected',i===index))}};button.disabled=this.state!=='ready';button.title='Insert this ticket';
      const image=this.el(button,'img') as HTMLImageElement;image.src=canvas.toDataURL();image.alt=ticket.kind==='route'?`Ticket ${ticket.from} to ${ticket.to}`:ticket.kind==='adjust'?`Fare adjustment ticket to ${ticket.toEn}`:`Fare ticket ¥${ticket.fare}`;image.draggable=false;
      this.grab(button,image,index);
    });
    if(this.inGate&&this.state!=='gone')this.el(list,'p',this.state==='refused'?'Back out at the slot':this.state==='out'?'Waiting at the exit slot':'In the gate','gate-empty');
    else if(this.kept)this.el(list,'p','Kept by the gate: its trip ends here','gate-empty');
    else if(!this.held.length)this.el(list,'p','No ticket','gate-empty');
    // A rebuilt button takes the focus with it: keep it in the overlay, on a ticket or the view.
    if(!this.overlay.contains(document.activeElement))(this.pocket.querySelectorAll<HTMLButtonElement>('.gate-ticket:not(:disabled)')[this.selected]??this.viewport).focus();
  }
  /** The pocket's ticket can be dragged onto the gate's slot; a plain click, E or A puts it in too. */
  private grab(button:HTMLButtonElement,image:HTMLImageElement,index:number){
    button.addEventListener('pointerdown',down=>{
      if(down.button!==0||button.disabled)return;
      let ghost:HTMLImageElement|null=null;
      const move=(event:PointerEvent)=>{
        if(!ghost&&Math.hypot(event.clientX-down.clientX,event.clientY-down.clientY)>6){const rect=image.getBoundingClientRect();ghost=image.cloneNode() as HTMLImageElement;ghost.className='gate-ghost';ghost.style.width=rect.width*.75+'px';this.overlay.append(ghost)}
        if(ghost){ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';this.dropHover=this.pick(event.clientX,event.clientY)==='slot'}
      };
      const end=(event:PointerEvent)=>{
        button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',end);
        if(!ghost)return;
        ghost.remove();this.justDragged=performance.now();const over=this.dropHover&&event.type==='pointerup';this.dropHover=false;if(over)this.insert(index);
      };
      button.setPointerCapture(down.pointerId);button.addEventListener('pointermove',move);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
    });
  }
  private setState(state:TicketGate['state']){this.state=state;this.since=0}
  private insert(index:number){
    const ticket=this.held[index];if(this.state!=='ready'||!ticket)return;
    // A punched ticket has already been through a gate: refused whatever its trip.
    this.reason=ticket.punched&&!this.side.exit?'入場済みのきっぷです\nThis ticket has already gone in through a gate.':this.refuse(ticket);this.inGate=ticket;this.from=this.selected=index;this.held=this.held.filter(t=>t!==ticket);this.setState('reading');machineSound('note');this.viewport.focus();this.renderPocket();
  }
  private take(){
    if(!this.inGate)return;
    if(this.state==='out'){this.held.splice(this.from,0,this.inGate);this.setState('gone')}
    else if(this.state==='refused'){this.held.splice(this.from,0,this.inGate);this.inGate=null;this.lcd='idle';this.setState('ready')}
    else return;
    this.renderPocket();
  }
  private act(){if(this.state==='ready')this.insert(this.selected);else this.take()}
  /** Moves the choice along the pocket, wrapping round, and shows it. */
  private select(step:number){
    if(this.state!=='ready'||this.held.length<2)return;
    this.selected=(this.selected+step+this.held.length)%this.held.length;
    const buttons=this.pocket.querySelectorAll<HTMLButtonElement>('.gate-ticket');buttons.forEach((b,i)=>b.classList.toggle('selected',i===this.selected));buttons[this.selected]?.focus();
  }
  /** Leaving takes back a refused ticket first; at the exit slot it takes the ticket and goes on to the platform. */
  private back(){
    if(this.state==='reading'||this.state==='passing'||this.state==='gone')return;
    if(this.state==='out'){this.take();return}
    this.take();this.destroy();this.done.leave();
  }
  private keydown=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Tab'){
      const all=Array.from(this.overlay.querySelectorAll<HTMLElement>('button:not(:disabled), .gate-viewport'));
      if(event.shiftKey&&document.activeElement===all[0]){event.preventDefault();all.at(-1)?.focus()}else if(!event.shiftKey&&document.activeElement===all.at(-1)){event.preventDefault();all[0]?.focus()}return;
    }
    if(event.key==='Escape'){event.preventDefault();this.back();return}
    if(['KeyE','Space','Enter'].includes(event.code)&&!(event.target as HTMLElement).closest('button')){event.preventDefault();if(!event.repeat)this.act()}
    const step={ArrowLeft:-1,ArrowUp:-1,KeyA:-1,KeyW:-1,ArrowRight:1,ArrowDown:1,KeyD:1,KeyS:1}[event.code];if(step){event.preventDefault();this.select(step)}
  };
  private tick=(time:number)=>{
    if(this.disposed)return;
    const dt=Math.min((time-this.previousTime)/1000||0,.25);this.previousTime=time;this.since+=dt;const t=this.since;
    const pad=Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected);
    if(pad){
      const pressed=pad.buttons.map(b=>b.pressed),previous=this.lastPadButtons,edge=(i:number)=>pressed[i]&&!previous[i];this.lastPadButtons=pressed;
      // D-pad or left stick: one step per push through the tickets.
      const axis=Math.abs(pad.axes[0]??0)>Math.abs(pad.axes[1]??0)?pad.axes[0]??0:pad.axes[1]??0,stick=axis>.5?1:axis<-.5?-1:0;
      const step=edge(14)||edge(12)?-1:edge(15)||edge(13)?1:stick!==this.lastStick?stick:0;this.lastStick=stick;if(step)this.select(step);
      if(edge(0))this.act();else if(edge(1))this.back();if(this.disposed)return;
    }
    // The gate reads the ticket, then lets the player through (a fade to the exit slot, where it comes out) or shuts its flaps and hands it back.
    // On the way in the ticket is punched with the station; on the way out the gate keeps it at the end of its trip.
    if(this.state==='reading'&&t>=.75){if(this.reason){this.lcd='ng';machineSound('beep');this.setState('refused')}else{this.lcd='ok';if(!this.side.exit)this.inGate!.punched=this.side.hub;this.kept=!!this.side.exit&&!(this.side.cancel&&this.inGate!.punched===this.side.cancel);this.setState('passing')}this.renderPocket()}
    else if(this.state==='passing'&&t>=1.4){this.setState(this.kept?'gone':'out');this.renderPocket()}
    else if(this.state==='passing'&&t>=1&&t-dt<1&&!this.kept)machineSound('drop');
    else if(this.state==='refused'&&t>=.3&&t-dt<.3)machineSound('drop');
    else if(this.state==='gone'&&t>=.5){const ticket=this.inGate!;this.destroy();this.done.pass(ticket);return}
    const closed=this.state==='refused'||(this.state==='reading'&&!!this.reason&&t>.7);
    this.flaps+=((closed?1:0)-this.flaps)*Math.min(1,dt*18);
    this.draw();
    this.status.textContent={ready:this.held.length>1?'Choose a ticket (D-pad, stick, arrows) · A / E puts it in, or drag one onto the yellow slot':this.held.length?'Drag your ticket onto the yellow きっぷ slot · or click it in the inventory, E or A':this.side.exit?'No ticket · the way out needs the one you came in with':'No ticket · the ticket machines are on the back wall',reading:'The gate reads your ticket…',passing:'The gate lets you through',out:'Your ticket comes out at the exit · click it, E or A to take it',refused:'Ticket refused · take it back from the slot (click, E or A)',gone:this.kept?'Through the gate · it keeps the ticket':'Through the gate'}[this.state];
    this.frame=requestAnimationFrame(this.tick);
  };
  destroy(){if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frame);this.resize.disconnect();this.overlay.remove();this.previousFocus?.focus()}
}
