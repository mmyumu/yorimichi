import { C, accents, anchors, box, dither, facadeD, facadeTop, floorY, fromConcourse, housings, machineW, paintPerson, paintPoster, recessBottom, recessD, recessTop, signH, wallL, wallR, type HallDevice } from './hall-scene';
import { Picture, type View } from './ticket-gate';
import { renderWallFareMap } from './tokyo-fares';
import { hasShinkansen, routes, stations, type Hub } from './network';
import { looks, type Figure } from './people';

type P=[number,number,number];
type Rect=[number,number,number,number];
// The picture is 400 × 250 pixels, scaled up whole. Hall units as in hall-scene.ts, given in its CSS-style y (down from the ceiling) and z (out of the wall); `at` turns them into the gate picture's world (y up, z away from the eye).
const W=400,H=250;
// The eye walks along the bank 2400 units back, at about 1 px per 7 units on the wall: some four machines wide, from the foot of the board down to the floor.
// Raised to the board (`look` 1), the picture pans up to the station's name.
const eyeZ=-2400,eyeH=700,k=340,vyMachines=110,vyBoard=160;
const at=(x:number,y:number,z:number):P=>[x,floorY-y,-z];
// The fare map as buildBoard lays it out (1387 × 780 scaled by .877, an 18-unit frame), the station's name above it.
const board={cx:1950,top:220,w:1216,h:684,border:18},plate={w:860,top:50,h:140};
const payTop=recessTop+180;
const titles:Record<string,[string,string]>={local:['きっぷ','Tickets'],charge:['チャージ専用','IC Charge'],shinkansen:['新幹線・特急','Shinkansen']};
// Signs too narrow for those titles on two lines.
const short:Record<string,string>={local:'きっぷ',charge:'チャージ',shinkansen:'新幹線'};
/** Bitmap lettering at whole pixels, as on the gate's picture. */
function letter(g:CanvasRenderingContext2D,text:string,x:number,y:number,color:string,align:'left'|'center'|'right'='center'){g.font='10px "Yorimichi Bitmap"';g.textBaseline='top';g.fillStyle=color;const w=g.measureText(text).width;g.fillText(text,Math.round(align==='center'?x-w/2:align==='right'?x-w:x),Math.round(y-5))}
function frame(g:CanvasRenderingContext2D,[l,t,r,b]:Rect,color:string,width=1){g.fillStyle=color;g.fillRect(l,t,r-l,width);g.fillRect(l,b-width,r-l,width);g.fillRect(l,t,width,b-t);g.fillRect(r-width,t,width,b-t)}
/** Boxes laid out in a face's own units (uw × uh across the rectangle), snapped to whole pixels. */
const onFace=(g:CanvasRenderingContext2D,[l,t,r,b]:Rect,uw:number,uh:number)=>(x:number,y:number,w:number,h:number,color:string)=>{
  const sx=(r-l)/uw,sy=(b-t)/uh,x0=Math.round(l+x*sx),y0=Math.round(t+y*sy);box(g,x0,y0,Math.max(1,Math.round(l+(x+w)*sx)-x0),Math.max(1,Math.round(t+(y+h)*sy)-y0),color);
};

/** The ticket hall as pixel art, like the ticket gate: the bank seen from the concourse, the eye walking along it from machine to machine, the commuters over it. Same interface as HallScene, so MachineHall drives either. */
export class HallPicture {
  private wrap=document.createElement('div');
  private canvas=document.createElement('canvas');
  private g=this.canvas.getContext('2d')!;
  private map:HTMLElement|null=null;
  private view:View={eye:[1900,eyeH,eyeZ],vx:W/2,vy:vyMachines,k};
  private pic=new Picture(this.g,this.view,W,H);
  // Everything that does not move, repainted only when the eye has moved.
  private backdrop=document.createElement('canvas');
  private painted='';
  // 0 looking at the machines, 1 raised to the board; eased towards what MachineHall's pitch asks.
  private look=0;
  private previousTime=0;
  // One sheet of eight frames per look, drawn at one scale whatever their depth (the strip before the machines is too shallow for a size change to read as distance): 2.5, an adult's height before the machines, 1.5 for a child.
  private sheets=looks.map(look=>{const c=document.createElement('canvas');c.width=160;c.height=48;paintPerson(c.getContext('2d')!,look);return c});
  private posters=new Map<string,HTMLCanvasElement>();
  // Where each machine (and the Tokyo fare map) is on the picture, for highlights and clicks.
  private rects=new Map<string,Rect>();
  private hovered:string|null=null;
  private resize=new ResizeObserver(()=>this.fit());
  private xAnchors:number[][];
  constructor(private host:HTMLElement,private hub:Hub,private devices:HallDevice[],private figures:()=>Figure[]=()=>[]){
    this.xAnchors=anchors(hasShinkansen(hub));
    this.canvas.width=this.backdrop.width=W;this.canvas.height=this.backdrop.height=H;this.wrap.className='hall-picture';this.wrap.append(this.canvas);host.append(this.wrap);
    if(hub==='tokyo'){
      // The fare map stays the crisp SVG, laid over the picture where its board is.
      this.map=document.createElement('div');this.map.className='hall-picture-map';
      const svg=renderWallFareMap(stations[hub].ja);svg.setAttribute('width','100%');svg.setAttribute('height','100%');this.map.append(svg);this.wrap.append(this.map);
    }
    this.resize.observe(host);this.fit();
    // The posters' lettering uses the bundled Japanese font: painted again once it is ready.
    document.fonts?.load('16px "Yorimichi JP"').then(()=>{this.posters.clear();this.painted=''}).catch(()=>{});
  }
  /** A rectangle facing the eye at depth z, as whole picture pixels. */
  private rect(x0:number,x1:number,y0:number,y1:number,z:number):Rect{const [l,t]=this.pic.project(at(x0,y0,z)),[r,b]=this.pic.project(at(x1,y1,z));return [Math.round(l),Math.round(t),Math.round(r),Math.round(b)]}
  /** Whole-pixel scaling as soon as the picture is twice its size; smaller screens get what fits. */
  private fit(){
    const fit=Math.min(this.host.clientWidth/W,this.host.clientHeight/H),scale=fit>=2?Math.floor(fit):fit;
    this.wrap.style.width=W*scale+'px';this.wrap.style.height=H*scale+'px';
  }
  private poster(place:'kamakura'|'nikko'){
    let image=this.posters.get(place);if(!image){image=document.createElement('canvas');image.width=140;image.height=200;paintPoster(image.getContext('2d')!,140,200,place);this.posters.set(place,image)}
    return image;
  }
  /** Everything that does not move, from where the eye stands: floor, ceiling, tiled wall, posters, the station's name and board, the machine bank. */
  private paint(){
    const g=this.backdrop.getContext('2d')!,pic=new Picture(g,this.view,W,H),station=stations[this.hub],ex=this.view.eye[0];g.imageSmoothingEnabled=false;
    const front=(x0:number,x1:number,y0:number,y1:number,z:number,color:string,line?:string,alt?:string)=>pic.face([at(x0,y0,z),at(x1,y0,z),at(x1,y1,z),at(x0,y1,z)],color,line,alt);
    const flat=(x0:number,x1:number,y:number,z0:number,z1:number,color:string,alt?:string)=>pic.face([at(x0,y,z0),at(x1,y,z0),at(x1,y,z1),at(x0,y,z1)],color,undefined,alt);
    const side=(x:number,y0:number,y1:number,z0:number,z1:number,color:string)=>pic.face([at(x,y0,z0),at(x,y0,z1),at(x,y1,z1),at(x,y1,z0)],color);
    const line=(a:P,b:P,color:string)=>pic.outline([pic.project(a),pic.project(b)],color);
    // Only what can show either side of the eye.
    const x0=Math.floor((ex-1800)/240)*240,x1=ex+1800;
    // Floor in 120-unit checks, the machines' contact shadow and the tactile paving along them; the ceiling with a light.
    g.fillStyle=C.floorA;g.fillRect(0,0,W,H);
    for(let x=x0;x<x1;x+=120)for(let z=0;z<1440;z+=120)if(((x+z)/120&1)===0)flat(x,x+120,floorY,z,z+120,C.floorB);
    const left=Math.min(...this.devices.map(d=>d.x))-120,right=Math.max(...this.devices.map(d=>d.x))+machineW+120;
    flat(left,right,floorY,facadeD,facadeD+60,C.floorLine,C.floorB);
    flat(wallL+300,wallR-300,floorY,528,592,'#e8c440','#cfa72c');
    flat(x0,x1,0,0,2400,C.ceiling);flat(x0,x1,0,90,130,C.light);
    // Tiled wall, 300 × 176.
    front(x0,x1,0,floorY,0,C.tile);
    for(let x=wallL+Math.ceil((x0-wallL)/300)*300;x<x1;x+=300)line(at(x,0,0),at(x,floorY,0),C.grout);
    for(let y=176;y<floorY;y+=176)line(at(x0,y,0),at(x1,y,0),C.grout);
    // Posters either side of the bank.
    for(const [x,place] of [[-280,'kamakura'],[4080,'nikko']] as const){
      if(Math.abs(x-ex)>2400)continue;
      front(x-300,x+300,590,1430,24,C.steel);
      const [l,t,r,b]=this.rect(x-280,x+280,610,1410,25);g.drawImage(this.poster(place),l,t,r-l,b-t);
    }
    // The station's name over the board, then the board: the Tokyo fare map is laid over it, the others list their routes with the station in red.
    front(board.cx-plate.w/2,board.cx+plate.w/2,plate.top,plate.top+plate.h,2,C.ink);front(board.cx-plate.w/2,board.cx+plate.w/2,plate.top+plate.h-14,plate.top+plate.h,2,station.accent);
    const [,pt,,pb]=this.rect(0,0,plate.top,plate.top+plate.h-14,2);letter(g,`${station.ja}  ${station.en.toUpperCase()}`,pic.project(at(board.cx,0,2))[0],(pt+pb)/2,'#fffef2');
    front(board.cx-board.w/2-board.border,board.cx+board.w/2+board.border,board.top,board.top+board.h+board.border*2,14,C.frame);
    const inner=this.rect(board.cx-board.w/2,board.cx+board.w/2,board.top+board.border,board.top+board.border+board.h,14.5),[l,t,r,b]=inner;
    front(board.cx-board.w/2,board.cx+board.w/2,board.top+board.border,board.top+board.border+board.h,14.5,'#fffef2');
    if(this.hub!=='tokyo'){
      letter(g,`${station.ja}駅 のりば案内`,r-6,t+9,'#2d563e','right');
      routes.filter(route=>route.from===this.hub).forEach((route,i)=>{
        const y=Math.round(t+(b-t)*.4+i*28);
        letter(g,station.ja,l+8,y,'#d6402e','left');box(g,l+32,y-3,7,7,'#d6402e','#fff');box(g,l+39,y-1,r-l-90,3,route.color);box(g,r-51,y-3,7,7,'#fff',C.ink);
        letter(g,route.ja,(l+r-12)/2,y-10,route.color);letter(g,route.name.split(' / ')[1],r-40,y,C.ink,'left');
      });
      letter(g,station.en+' · '+station.ja,l+8,b-9,'#65735a','left');
    }
    if(this.map)Object.assign(this.map.style,{left:l/W*100+'%',top:t/H*100+'%',width:(r-l)/W*100+'%',height:(b-t)/H*100+'%'});
    this.rects.clear();
    if(this.hub==='tokyo')this.rects.set('map',this.rect(board.cx-board.w/2-board.border,board.cx+board.w/2+board.border,board.top,board.top+board.h+board.border*2,14));
    // The bank: each machine in its recess (housing, side reveals, tilted screen, payment block), then the facade around them, the ledge and the lit signs.
    for(const d of this.devices){
      const x=d.x,back=facadeD-recessD,housing=housings[d.kind]??housings.local,kind=d.kind;
      this.rects.set(d.id,this.rect(x-10,x+machineW+10,facadeTop+6,recessBottom,facadeD));
      front(x,x+machineW,recessTop,recessBottom,back,housing);
      if(ex>x)side(x,recessTop,recessBottom,back,facadeD,C.reveal);
      if(ex<x+machineW)side(x+machineW,recessTop,recessBottom,back,facadeD,C.reveal);
      // Screen in its bezel, in 4-unit texels: blue fare buttons, the Shinkansen's grey menu, or the IC card prompt.
      const sr=this.rect(x+40,x+machineW-40,recessTop+18,payTop-4,back+18),s=onFace(g,sr,105,40);
      s(0,0,105,40,C.bezel);
      if(kind==='charge'){s(4,4,97,32,'#faf9eb');s(43,9,18,10,'#7dba71');s(48,12,8,4,'#ffffff');s(22,25,60,2,'#526c5a');s(32,30,40,1,'#526c5a')}
      else if(kind==='shinkansen'){s(4,4,97,32,'#eef0e0');s(36,6,32,3,'#41613b');for(let i=0;i<4;i++)s(8+(i%2)*46,12+Math.floor(i/2)*11,43,9,'#697268')}
      else{s(4,4,97,32,'#0960bc');const [l2,t2,r2,b2]=sr;dither(g,l2+2,t2+2,r2-l2-4,Math.round((b2-t2)/2)-2,'#4dcae3');s(32,6,40,3,'#f3fbef');for(let i=0;i<6;i++)s(7+(i%3)*31,13+Math.floor(i/3)*11,28,9,'#deedf0')}
      // Payment block, its top in shade, the face after paintPayment's layout in its 2-unit texels: labels, yellow-rimmed slots, the coin bowl, keypad and QR reader, the tray.
      const payZ=facadeD-6;flat(x+12,x+machineW-12,payTop,back,payZ,kind==='shinkansen'?'#2f7a3b':C.bodyShade);
      const f=onFace(g,this.rect(x+12,x+machineW-12,payTop,recessBottom,payZ),244,111),Y='#e2c234',D='#1d2622',unit='#f6f6f0',c1=6,c1w=76,c2=86,c2w=60,c3=150,c3w=88,r2=22,r3=54,rh=28;
      f(0,0,244,111,'#e9eae2');f(0,0,244,5,'#c3c7bf');
      for(const [lx,lw] of [[c1,c1w],[c2,c2w],[c3,c3w]])f(lx,8,lw,11,'#4c565a');
      const slot=(sx:number,sy:number,sw:number,sh:number,label=false)=>{f(sx,sy,sw,sh,unit);const lw=Math.round(sw*.62),lx=sx+Math.round((sw-lw)/2),ly=sy+(label?6:Math.round(sh/2)-2);f(lx-2,ly-2,lw+4,8,Y);f(lx,ly,lw,4,D);if(label)f(sx+sw*.25,sy+sh-9,sw*.5,3,'#9aa29a')};
      if(kind==='charge'){
        f(c1,r2,c1w,rh*2+4,unit);slot(c2,r2,c2w,rh);slot(c3,r2,c3w,rh*2+4);
        // The IC reader's ring, 16 texels across its radius, drawn round in whole pixels.
        const [cx,cy]=pic.project(at(x+12+(c1+c1w/2)*476/244,payTop+(r2+25)*210/111,payZ)).map(Math.round),r=Math.max(3,Math.round(32*k/(-payZ-eyeZ)));
        for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const dd=Math.hypot(dx,dy);if(dd<=r+.3)box(g,cx+dx,cy+dy,1,1,dd>=r-1.2?'#7dba71':'#e7f1e4')}
      }else{
        slot(c1,r2,c1w,rh);slot(c2,r2,c2w,rh);f(c3,r2,c3w,rh,Y);f(c3+3,r2+3,c3w-6,rh-6,D);f(c3+c3w/2-8,r2+rh-9,16,2,'#c9a54a');
        slot(c1,r3,c1w,rh,true);slot(c2,r3,c2w,rh,true);
        const kw=46,qx=c3+kw+4,qw=c3+c3w-qx;f(c3,r3,kw,rh,Y);f(c3+2,r3+2,kw-4,rh-4,'#f2e9b8');
        for(let i=0;i<12;i++)f(c3+4+(i%3)*13,r3+4+Math.floor(i/3)*6,11,4,i===9?'#d9534f':i===11?'#4f9a59':'#ffffff');
        f(qx,r3,qw,rh,unit);f(qx+6,r3+11,qw-12,rh-15,'#2b3d44');
      }
      f(c1,86,c2+c2w-c1,19,'#262f2c');f(c3,89,12,12,Y);
    }
    // The facade stands out of the wall around the recesses; its bands carry a seam every 300 units.
    front(left,right,facadeTop,recessTop,facadeD,C.facade);front(left,right,recessBottom,floorY,facadeD,C.facade);
    const edges=[left,...this.devices.flatMap(d=>[d.x,d.x+machineW]),right];
    for(let i=0;i<edges.length;i+=2)front(edges[i],edges[i+1],recessTop,recessBottom,facadeD,C.facade);
    for(let x=left+300;x<right;x+=300){line(at(x,facadeTop,facadeD),at(x,recessTop,facadeD),C.facadeSeam);line(at(x,recessBottom,facadeD),at(x,floorY,facadeD),C.facadeSeam)}
    line(at(left,facadeTop,facadeD),at(right,facadeTop,facadeD),C.facadeShade);
    if(ex<left)side(left,facadeTop,floorY,0,facadeD,C.facadeShade);if(ex>right)side(right,facadeTop,floorY,0,facadeD,C.facadeShade);
    flat(left-20,right+20,recessBottom-1,0,facadeD+40,C.steel);front(left-20,right+20,recessBottom-1,recessBottom+15,facadeD+40,'#8f9590');
    for(const d of this.devices){
      const cx=d.x+machineW/2,signY=(facadeTop+recessTop)/2,[sl,st,sr,sb]=this.rect(cx-200,cx+200,signY-signH/2,signY+signH/2,facadeD+.5),[ja,en]=titles[d.kind]??['',''];
      box(g,sl,st,sr-sl,sb-st,accents[d.kind]??accents.local,'#ffffff');box(g,sl+1,st+1,sr-sl-2,2,'#ffffff33');
      if(sr-sl>=64&&sb-st>=22){letter(g,ja,(sl+sr)/2,st+8,'#ffffff');letter(g,en,(sl+sr)/2,sb-8,'#f2f5ee')}else letter(g,short[d.kind]??'',(sl+sr)/2,(st+sb)/2,'#ffffff');
    }
  }
  setHover(id:string|null){this.hovered=id}
  /** The picture from where the player stands along the bank (x), raised to the board when they look up, the machine (or map) in front highlighted in yellow, a hovered one in white, and the concourse's commuters in front of the bank. */
  render(x:number,_yaw:number,pitch:number,_distance:number,near:string|null){
    const now=performance.now(),dt=Math.min((now-this.previousTime)/1000||0,.1);this.previousTime=now;
    const target=pitch>10?1:0;this.look+=(target-this.look)*Math.min(1,dt*8);if(Math.abs(target-this.look)<.01)this.look=target;
    this.view.eye[0]=Math.round(x);this.view.vy=Math.round(vyMachines+(vyBoard-vyMachines)*this.look);
    const key=`${this.view.eye[0]},${this.view.vy}`;if(key!==this.painted){this.painted=key;this.paint()}
    const g=this.g;g.imageSmoothingEnabled=false;g.drawImage(this.backdrop,0,0);
    for(const [id,rect] of this.rects)if(id===near||id===this.hovered)frame(g,rect,id===near?'#f3d76b':'#ffffff',2);
    const t=now/1000;
    // Only those between the machines and a few steps out: further forward they would stand before the whole bank, behind the wall they are at the gates.
    const people=this.figures().map(f=>({f,...fromConcourse(this.xAnchors,f.x,f.y)})).filter(p=>p.f.alpha>.5&&p.z>60&&p.z<620).sort((a,b)=>a.z-b.z);
    for(const {f,x:fx,z} of people){
      const sheet=this.sheets[f.look];if(!sheet)continue;
      const [sx,sy]=this.pic.project(at(fx,floorY,z)),scale=(looks[f.look].height??1)<.8?1.5:2.5,cell={down:0,up:2,left:4,right:6}[f.face]+(f.moving?Math.floor(t*4+f.look)%2:0);
      if(sx<-20*scale||sx>W+20*scale)continue;
      g.drawImage(sheet,cell*20,0,20,48,Math.round(sx-10*scale),Math.round(sy-48*scale),Math.round(20*scale),Math.round(48*scale));
    }
  }
  /** The machine or the fare map under a viewport point. */
  pick(clientX:number,clientY:number){
    const rect=this.canvas.getBoundingClientRect(),x=(clientX-rect.left)/rect.width*W,y=(clientY-rect.top)/rect.height*H;
    for(const [id,[l,t,r,b]] of this.rects)if(x>=l&&x<=r&&y>=t&&y<=b)return id;
    return null;
  }
  dispose(){this.resize.disconnect();this.wrap.remove()}
}
