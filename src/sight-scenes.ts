/** Each sight's own screen, laid out after the real place (sources in REFERENCES.md) and the traveller's photos: a 480×320 art px map, drawn on first use by makeScene, seen in the street's three-quarter view.
 * `Layout`, in art px: `start` the way in, `exit` the sign out and `camera` its post, each with its foot clear of `solids`, `lamps` as Lamp in main.ts, `lit` the boxes of the picture that shine through the night,
 * `over` the boxes lifted above the traveller (a gate's roof, a lantern), cut from what the scene paints through `above`, so its own shape and not the ground round it, `puffs` what drifts up from a spot (smoke, spray), `width` and `height` a map larger than the screen, which then scrolls, `people` the commuters about (x, foot y, look, facing at first), each strolling from spot to spot within `roam` art px of their own (55 unless set) or, `roam` a box, anywhere in it; `busy` a crowded place, where everyone keeps walking, briskly, `crossing` a scramble crossing run by its lights (its two kerbs' waiting `sides`, far then near, the `exits` off the screen from each, the signal `poles` (foot, arm's side; `makeSignals` in art.ts), `crowd` how many people in all, the `cars`' lanes (foot y, way) and stop lines (front's x either way)), sorted with the traveller, `stands` the boxes of what `above` paints that are cut out one by one and sorted with the traveller at their foot (a tree beside the path, passed on either side), `way` a second signpost on to another screen of the place, `out` where the exit sign leads instead of the street.
 * Art px × 2 = scene px. An `Avenue` is a street before a sight drawn over makeSightRoad's: the same road, stop and Uber at the same places, its picture going on below. */
import Phaser from 'phaser';
import { letter, mapCanvas, softCrown } from './art';

export type Box=[number,number,number,number];
export type Glow=[number,number,number,number?,number?,number?];
export interface Layout {start:[number,number];exit:[number,number];camera:[number,number];solids:Box[];lamps?:Glow[];lit?:Box[];over?:Box[];stands?:Box[];puffs?:[number,number,number][];width?:number;height?:number;way?:{at:[number,number];to:string;ja:string;sign:string;en:string};second?:{camera:[number,number];page:string};people?:[number,number,number,'up'|'down'|'left'|'right'][];roam?:number|Box;busy?:true;crossing?:{sides:[Box,Box];exits:[[number,number][],[number,number][]];poles:[number,number,'L'|'R'][];crowd:number;cars:{lanes:[number,number][];stop:[number,number]}};out?:{to:string;at:[number,number];en:string}}
export interface Avenue {height:number;camera:[number,number];solids:Box[];lamps?:Glow[];lit?:Box[];over?:Box[]}

type Paint=(x:number,y:number,w:number,h:number,c:string)=>void;
const warm=0xfff1cc,paper=0xffd99a,cool=0xe4f4ff;
/** The rows of a pond or island, to wall it off; `outside` walls off all but it. */
const oval=(cx:number,cy:number,rx:number,ry:number,step=6):Box[]=>{const out:Box[]=[];for(let y=cy-ry;y<cy+ry;y+=step){const t=(y+step/2-cy)/ry,w=rx*Math.sqrt(Math.max(0,1-t*t));out.push([cx-w,y,w*2,step])}return out};
const outside=(cx:number,cy:number,rx:number,ry:number,step=6):Box[]=>[[0,0,480,cy-ry],[0,cy+ry,480,320-cy-ry],...oval(cx,cy,rx,ry,step).flatMap(([x,y,w,h]):Box[]=>[[0,y,x,h],[x+w,y,480-x-w,h]])];
/** A path as the boxes it clears, `w` wide, along a line of points. */
const trail=(points:[number,number][],w=24):[number,number,number][]=>points.slice(1).flatMap(([x,y],i)=>{const [px,py]=points[i],n=Math.ceil(Math.hypot(x-px,y-py)/4);return Array.from({length:n+1},(_,t):[number,number,number]=>[px+(x-px)*t/n,py+(y-py)*t/n,w])});
/** All of a `w`×`h` map but its paths, as solids. */
const fenced=(w:number,h:number,path:[number,number,number][]):Box[]=>{const out:Box[]=[];for(let y=0;y<h;y+=6){let from=-1;for(let x=0;x<w+6;x+=6){const free=x<w&&path.some(([px,py,s])=>Math.abs(x+3-px)<=s/2&&Math.abs(y+3-py)<=s/2);if(x<w&&!free&&from<0)from=x;if((free||x>=w)&&from>=0){out.push([from,y,x-from,6]);from=-1}}}return out};

/** Biwako's Sky Bridge: the top of its deck at `x`, sagging between its two ends, then Mt Horai's grass, rising to the crest, and the walkable way over both. */
const skyDeck=(x:number)=>232+5*(1-((x-366)/274)**2);
const horaiTop=(x:number)=>x<=640?232:x<=790?232-(x-640)/150*100:132;
const horaiWay:[number,number][]=[[640,241],[680,226],[720,206],[760,184],[800,168]];
const horaiTrack=trail(horaiWay,0).map(([x,y]):[number,number]=>[x,y]);
const horaiPath=[...trail([[18,241],[92,241]],18),...trail(Array.from({length:56},(_,i):[number,number]=>[92+i*10,skyDeck(92+i*10)+9]),18),...Array.from({length:38*16},(_,i):[number,number,number]=>[648+i%38*12,134+Math.floor(i/38)*12,14]).filter(([x,y])=>y>=horaiTop(x)+10)];

/** A vertical gradient in `bands` flat steps, each edge broken by a row of dither, as a pixel-art sky is. */
const blend=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const gradient=(r:Paint,x:number,y:number,w:number,h:number,from:string,to:string,bands:number)=>{const step=h/bands;for(let i=0;i<bands;i++){const c=blend(from,to,i/(bands-1)),top=y+Math.round(i*step);r(x,top,w,Math.ceil(step)+1,c);if(i)for(let xx=x+(i%2)*2;xx<x+w;xx+=4)r(xx,top-1,2,1,c)}};

/** The painters every scene shares. */
function kit(g:CanvasRenderingContext2D,seed:number,top:CanvasRenderingContext2D,glow?:CanvasRenderingContext2D){
  let lifting=false,shining=false,dark=false;
  const r:Paint=(x,y,w,h,c)=>{if(dark){if(glow){glow.fillStyle=c;glow.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}return}g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));if(lifting){top.fillStyle=c;top.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}if(shining&&glow){glow.fillStyle=c;glow.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}};
  /** `paint` on the picture and on the layer the `over` boxes are cut from, so that they lift its own shape and not the ground around it. A scene that paints nothing here lifts its boxes whole. */
  const above=(paint:()=>void)=>{lifting=true;paint();lifting=false};
  /** `paint` on the picture and on the layer the `lit` boxes are cut from, so that only what glows shines through the night and not the sky behind it. A scene that paints nothing here lights its boxes whole. */
  const shine=(paint:()=>void)=>{shining=true;paint();shining=false};
  /** `paint` on the `lit` layer only: a light that is there by night and not by day (a doorway, a window). */
  const night=(paint:()=>void)=>{dark=true;paint();dark=false};
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},int=(n:number)=>Math.floor(rand()*n);
  const text=(x:number,y:number,t:string,c='#f4e4b8',big=true)=>{letter(g,x,y,t,c,big);if(lifting)letter(top,x,y,t,c,big);if(shining&&glow)letter(glow,x,y,t,c,big)};
  const ground=(x:number,y:number,w:number,h:number,base:string,fleck:string,n=w*h/60)=>{r(x,y,w,h,base);for(let i=0;i<n;i++)r(x+int(w),y+int(h),2,1,fleck)};
  const ell=(cx:number,cy:number,rx:number,ry:number,c:string)=>{for(let y=-ry;y<ry;y++){const w=rx*Math.sqrt(Math.max(0,1-((y+.5)/ry)**2));r(cx-w,cy+y,w*2,1,c)}};
  /** Grass or moss: lighter and darker patches under it, blades lit and shaded all over, a clover's white here and there (`flowers`). */
  const lawn=(x:number,y:number,w:number,h:number,base:string,fleck=blend(base,'#000000',.12),flowers=true)=>{g.save();g.beginPath();g.rect(x,y,w,h);g.clip();r(x,y,w,h,base);for(let i=0;i<w*h/600;i++)ell(x+int(w),y+int(h),8+int(20),4+int(8),int(2)?'#ffffff0d':'#00000010');
    const hi=blend(base,'#ffffff',.2),mid=blend(base,'#ffffff',.09);for(let i=0;i<w*h/14;i++){const t=int(6);r(x+int(w),y+int(h),1,2,t<2?hi:t<4?fleck:mid)}if(flowers)for(let i=0;i<w*h/420;i++)r(x+int(w),y+int(h),1,1,int(3)?'#f4f4e4':'#f0d860');g.restore()};
  const stones=(x:number,y:number,w:number,h:number,c='#bdb7a2',line='#9f9986')=>{r(x,y,w,h,c);for(let yy=y;yy<y+h;yy+=7){r(x,yy,w,1,line);for(let xx=x+(yy%14?0:6);xx<x+w;xx+=12)r(xx,yy,1,7,line)}};
  const shade=(x:number,y:number,w:number,h=4)=>r(x,y,w,h,'#00000030');
  /** A tiled roof: `h` rows flaring to `w` at the eaves, its corners turned up; (cx,y) the ridge. */
  const eaves=(cx:number,y:number,w:number,h:number,tile:string,rib='#00000030',edge='#2c3032')=>{
    for(let i=0;i<h;i++){const t=i/(h-1||1),o=w*(.6+.4*t**2.2);r(cx-o/2,y+i,o,1,tile);if(i%3===2)r(cx-o/2,y+i,o,1,rib);else if(i>=h*.3)for(let x=cx-w/2+3;x<cx+w/2-2;x+=4)if(Math.abs(x-cx)<o/2-1)r(x,y+i,1,1,rib)}
    r(cx-w/2,y+h,w,2,edge);r(cx-w/2-2,y+h-2,3,3,edge);r(cx+w/2-1,y+h-2,3,3,edge);r(cx-w*.3-1,y-1,w*.6+2,2,edge);r(cx-w*.3-3,y-3,3,3,edge);r(cx+w*.3,y-3,3,3,edge);
  };
  /** A hall from the front: the roof, then a wall of posts and shadow, the door in the middle; foot at y+rh+wh. */
  const hall=(cx:number,y:number,w:number,rh:number,wh:number,wall:string,tile:string,post='#3f2e24',door='#2a2320')=>{
    const b=w-16,top=y+rh,dw=Math.min(32,b/3);r(cx-b/2+2,top+wh+1,b+6,4,'#00000030');r(cx-b/2,top,b,wh,wall);r(cx-b/2,top+Math.round(wh*.3),b,2,'#00000026');for(let x=cx-b/2;x<cx+b/2;x+=14){r(x,top,3,wh,post);r(x,top,1,wh,'#ffffff22')}r(cx+b/2-3,top,3,wh,post);r(cx+b/2-6,top,3,wh,'#00000020');
    r(cx-dw/2-1,top+wh*.3-1,dw+2,wh*.7+1,post);r(cx-dw/2,top+wh*.3,dw,wh*.7,door);r(cx-dw/2,top+wh*.3,dw,2,'#00000040');r(cx-b/2,top+2,b,4,'#00000048');r(cx-b/2-3,top+wh-2,b+6,3,'#9a968a');r(cx-b/2-3,top+wh-2,b+6,1,'#bab6a8');eaves(cx,y,w,rh,tile);
  };
  const pagoda=(cx:number,foot:number,n:number,w0:number,wall:string,tile:string,step=15)=>{
    shade(cx-w0/2+4,foot+2,w0+4);r(cx-w0/2+2,foot-2,w0-4,4,'#8e8a7c');r(cx-w0/2+2,foot-2,w0-4,1,'#b4b0a2');r(cx-1,foot-n*step-20,2,20,'#c9a84a');for(let i=0;i<4;i++)r(cx-3+i,foot-n*step-16+i*4,6-2*i,1,'#e0c060');
    for(let i=n-1;i>=0;i--){const w=w0-i*(w0*.09),y=foot-(i+1)*step,b=w/2-6;r(cx-b,y+6,b*2,step-6,wall);r(cx-b,y+6,2,step-6,'#ffffff24');r(cx+b-3,y+6,3,step-6,'#00000038');r(cx-b,y+9,b*2,2,'#00000050');r(cx-b-2,y+step-2,b*2+4,1,'#2a2320');for(let x=cx-b;x<cx+b;x+=4)r(x,y+step-4,1,2,'#2a232080');r(cx-2,y+10,4,step-10,'#2a2320');eaves(cx,y,w,7,tile)}
  };
  /** A two-storey gate: dark passage in the middle, `pass` wide. */
  const gate=(cx:number,foot:number,w:number,wall:string,tile:string,pass=28,gold='')=>{
    const h=30;shade(cx-w/2+8,foot,w-12);r(cx-w/2+10,foot-h,w-20,h,wall);for(let x=cx-w/2+10;x<cx+w/2-10;x+=(w-24)/5)r(x,foot-h,4,h,'#00000038');r(cx-pass/2,foot-h+4,pass,h-4,'#262019');
    eaves(cx,foot-h-14,w,12,tile);r(cx-w*.3,foot-h-28,w*.6,14,wall);for(let x=cx-w*.3;x<cx+w*.3;x+=8)r(x,foot-h-26,2,12,'#00000040');if(gold)r(cx-w*.3,foot-h-21,w*.6,2,gold);eaves(cx,foot-h-40,w*.82,12,tile);
  };
  const torii=(cx:number,foot:number,w:number,h:number,c:string,top='#3e4640',shine='#ffffff30')=>{
    const x=w/2-5;r(cx-x-3,foot+1,9,3,'#00000030');r(cx+x-3,foot+1,9,3,'#00000030');for(const px of [cx-x-3,cx+x-3]){r(px,foot-h+4,6,h-4,c);r(px+1,foot-h+4,1,h-4,shine)}
    r(cx-w/2+2,foot-h+12,w-4,4,c);r(cx-w/2-3,foot-h+3,w+6,5,c);r(cx-w/2-5,foot-h,w+10,3,top);r(cx-w/2-6,foot-h-2,4,3,top);r(cx+w/2+2,foot-h-2,4,3,top);r(cx-2,foot-h+8,4,4,c);
  };
  const stoneLantern=(x:number,y:number)=>{shade(x-5,y+18,14,2);r(x-4,y+15,12,4,'#8f9184');r(x,y+6,4,10,'#a3a598');r(x-3,y+1,10,6,'#b5b5a8');r(x-1,y+2,6,4,'#5b5a50');r(x-5,y-2,14,3,'#83857a');r(x-1,y-5,6,3,'#a3a598')};
  const lantern=(x:number,y:number,c='#f6efdc',band='#3d3026')=>{r(x+1,y-1,4,1,band);r(x,y,6,8,c);r(x+1,y+2,4,1,'#c8452e');r(x+1,y+5,4,1,'#00000040');r(x+1,y+8,4,1,band)};
  const tree=(x:number,y:number,pal:readonly string[]=greens[int(3)],rx=15+int(6),ry=12+int(5))=>{shade(x-rx+2,y+16,rx*2,3);r(x-3,y+5,6,12,'#5c4636');r(x-1,y+6,1,10,'#8a6a50');softCrown(r,rand,x+(rx-5)*(int(2)?1:-1),y-3,rx-6,ry-5,pal);softCrown(r,rand,x,y-6,rx,ry,pal)};
  const cedar=(x:number,y:number,h=60)=>{shade(x-8,y,20,3);r(x-3,y-h*.35,6,h*.35,'#4c3528');r(x-1,y-h*.35,1,h*.35,'#7a5840');for(let i=0;i<5;i++){const t=y-h*.25-i*h*.15,w=20-i*3;softCrown(r,rand,x,t,w,7,cedars)}};
  /** A garden pine, cloud-pruned: the trunk leaning one way then the other, a bough out to each pad of needles, the pads flat underneath and in shade there. */
  const pine=(x:number,y:number,flip=1)=>{shade(x-12,y+1,26,3);const lean=(i:number)=>x+flip*Math.round(Math.sin(i/6)*6);for(let i=0;i<24;i++){const w=i<4?7:i<14?5:3;r(lean(i)-w/2,y-i,w,1,i%4?'#5a4034':'#46322a');r(lean(i)-w/2,y-i,1,1,'#7d5e4a')}
    for(const [dx,dy,w,at] of [[-12,-17,10,10],[11,-13,9,7],[-5,-27,9,19],[9,-24,8,17],[2,-34,9,23]]){const px=x+flip*dx,py=y+dy,n=Math.max(1,Math.abs(px-lean(at)));for(let i=0;i<=n;i++)r(lean(at)+(px-lean(at))*i/n,y-at+(py+3-(y-at))*i/n,2,1,'#46322a');r(px-w+2,py+4,w*2-4,1,'#16302480');softCrown(r,rand,px,py,w,4,pines);for(let i=0;i<w/2;i++)r(px-w+3+int(w),py-3+int(2),2,1,'#8ab884')}};
  /** A wood seen from above: crowns of every size, unevenly set, its own greens mixed with the others', dark cedars and a turning tree here and there. */
  const forest=(x:number,y:number,w:number,h:number,pal:readonly string[]=greens[0])=>{r(x,y,w,h,pal[0]);for(let yy=y+3;yy<y+h+5;yy+=7+int(5))for(let xx=x+int(16)-4;xx<x+w+4;xx+=11+int(17)){const kind=int(40),rx=8+int(11);softCrown(r,rand,xx,yy+int(6)-3,rx,Math.max(6,rx*.7+int(4)-1),kind<18?pal:kind<28?greens[int(2)]:kind<38?cedars:turning)}};
  /** A ridge of Kyoto's wooded hills behind everything: its summits `peaks` [x,height,spread], the skyline irregular, the slopes mottled with `leaf`, down to `foot`. */
  const ridge=(foot:number,peaks:[number,number,number][],c:string,leaf:string,phase=0)=>{const top=(x:number)=>foot-peaks.reduce((h,[px,ph,spread])=>h+ph*Math.exp(-(((x-px)/spread)**2)),0)-3-Math.sin(x/23+phase)*2-Math.sin(x/9+phase*2)*1.2-Math.sin(x/4+phase);for(let x=0;x<480;x+=2){const y=top(x);r(x,y,2,foot-y,c);for(let n=0;n<(foot-y)/5;n++)r(x,y+2+int(Math.max(1,foot-y-2)),2+int(3),1+int(2),leaf)}};
  const water=(x:number,y:number,w:number,h:number,base='#4f8fa8',spark='#8cc0cf',n=w*h/170)=>{r(x,y,w,h,base);for(let i=0;i<n;i++)r(x+int(Math.max(1,w-8)),y+int(h),4+int(6),1,spark)};
  /** A picture of the box, upside down about `line` (halfway between its foot and the water's edge). */
  const ripples=(x:number,y:number,w:number,h:number)=>{for(let yy=y;yy<y+h;yy+=3)for(let i=0;i<w/30;i++)r(x+int(w),yy,3+int(9),1,'#ffffff24')};
  const mirror=(x:number,y:number,w:number,h:number,line:number,a=.55)=>{g.save();g.imageSmoothingEnabled=false;g.globalAlpha=a;g.translate(0,line*2);g.scale(1,-1);g.drawImage(g.canvas,x*2,y*2,w*2,h*2,x,y,w,h);g.restore();ripples(x,line*2-y-h,w,h)};
  /** `paint` again upside down about `line`, faint: what stands on the water, without what is behind it. */
  const reflect=(line:number,a:number,paint:()=>void)=>{g.save();g.globalAlpha=a;g.translate(0,line*2);g.scale(1,-1);paint();g.restore()};
  const at=(dy:number,paint:()=>void)=>{g.save();g.translate(0,dy);paint();g.restore()};
  /** `paint` kept within an oval: a reflection, in its pond. */
  const inside=(cx:number,cy:number,rx:number,ry:number,paint:()=>void)=>{g.save();g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);g.clip();paint();g.restore()};
  const rock=(x:number,y:number,w:number,h:number,c='#8b8b80')=>{r(x,y+h*.3,w,h*.7,c);r(x+w*.15,y,w*.7,h*.4,c);r(x+w*.25,y+1,w*.35,2,'#ffffff40');r(x,y+h-1,w,1,'#00000040')};
  const fence=(x:number,y:number,w:number,c='#4a3a2c',top='#7a6048')=>{r(x,y+3,w,2,top);r(x,y+8,w,1,top);for(let xx=x;xx<x+w;xx+=4)r(xx,y,2,12,xx%8?c:top)};
  const wall=(x:number,y:number,w:number,h=16,plaster='#d9cfae',tile='#4b5456')=>{r(x,y,w,h,plaster);r(x,y+h-2,w,2,'#00000030');r(x,y-3,w,3,tile);for(let xx=x;xx<x+w;xx+=4)r(xx,y-3,1,3,'#00000040');r(x,y-4,w,1,'#6e787a')};
  const jizo=(x:number,y:number,bib='#c8452e',cap=true)=>{r(x-1,y+13,12,2,'#00000030');r(x,y+5,10,9,'#8d8f84');r(x+2,y-2,6,7,'#a3a598');r(x+3,y+1,1,1,'#5c5c52');r(x+6,y+1,1,1,'#5c5c52');r(x+1,y+5,8,4,bib);if(cap)r(x+1,y-4,8,3,bib)};
  /** A straight stroke `t` px thick, from one point to another: a cable, a crab's leg, a rope. */
  const line=(x0:number,y0:number,x1:number,y1:number,c:string,t=1)=>{const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)));for(let i=0;i<=n;i++)r(x0+(x1-x0)*i/n-t/2,y0+(y1-y0)*i/n-t/2,t,t,c)};
  /** What is already painted in the box, each row slid a pixel or two sideways: a reflection broken by the water's movement. */
  const shimmer=(x:number,y:number,w:number,h:number,amp=1.5)=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;c.getContext('2d')!.drawImage(g.canvas,x*2,y*2,w*2,h*2,0,0,w*2,h*2);g.save();g.imageSmoothingEnabled=false;for(let yy=0;yy<h;yy++)g.drawImage(c,0,yy*2,w*2,2,x+Math.round(Math.sin(yy*1.9+x)*amp+Math.sin(yy*.53)*amp*.6),y+yy,w,1);g.restore()};
  return {g,r,rand,int,text,ground,lawn,ell,stones,shade,eaves,hall,pagoda,gate,torii,stoneLantern,lantern,tree,cedar,pine,forest,ridge,water,mirror,ripples,reflect,at,inside,above,shine,night,rock,fence,wall,jizo,line,shimmer};
}
type Kit=ReturnType<typeof kit>;
const greens=[['#2f5a4e','#3f7558','#5a8c66','#7fa77a'],['#345d48','#487951','#63905b','#86a367'],['#3d5e3e','#557d45','#74995a','#a3b86e']] as const,cedars=['#1f3f33','#2b5242','#3a6a50','#4e8060'] as const,pines=['#234a38','#2f6048','#44795a','#6a9a70'] as const;
const turning=['#6a7a38','#8d9a45','#b3b558','#d6cf78'] as const;
const blossom=['#a86e7c','#c98596','#e9a6ad','#f6c7bb'] as const;

/** A stand of bamboo, `kind` its culms' colour: green, the black 黒竹 or the golden 金明竹. Culms in rows from the back of the stand to its front, each rooted on its row and rising to the top: the far ones thin and dark in the shade, the near ones lit on their left, ringed at their nodes; leaves caught among them, fallen ones at their feet. */
function grove(k:Kit,x:number,w:number,top:number,foot:number,kind:'green'|'black'|'gold'='green'){
  const [o,b,l,leaf]=kind==='black'?['#1a1816','#3b3531','#6a5e52','#5f8a48']:kind==='gold'?['#6a5a24','#c9a93e','#ecd878','#7fa04a']:['#1c3a26','#3a6e40','#6aa45a','#6aa050'],shade='#0c1c14',canopy=kind==='black'?['#22321e','#3a5632','#5a8446','#80a45c']:kind==='gold'?['#55662a','#84963e','#aab456','#d0d47c']:['#234a2c','#3a6e3c','#5a944c','#86b866'];
  k.r(x,top,w,foot-top,shade);for(let i=0;i<w*(foot-top)/40;i++)k.r(x+k.int(w),top+k.int(foot-top),2,1,'#1e3a26');
  for(let yb=top+4;yb<=foot;yb+=7){const depth=(yb-top)/Math.max(1,foot-top),dim=.7*(1-depth)**1.2;
    for(let sx=x-2+k.int(8);sx<x+w;sx+=8+k.int(10)){const sw=depth>.7?3+k.int(2):depth>.3?2+k.int(2):2,cx=Math.min(sx,x+w-sw),h=yb-top,tint=blend(b,[o,l,'#7aa858'][k.int(3)],k.rand()*.3);if(cx<x)continue;
      k.r(cx,top,sw,h,blend(tint,shade,dim));k.r(cx,top,1,h,blend(l,shade,dim));if(sw>2)k.r(cx+sw-1,top,1,h,blend(o,shade,dim));
      for(let ny=yb-4-k.int(8);ny>top;ny-=10+k.int(5)){k.r(cx,ny,sw,1,blend(o,shade,dim));k.r(cx,ny+1,sw,1,blend(l,shade,dim*.8))}
      if(depth>.5)k.r(cx-1,yb-1,sw+2,1,'#00000040')}}
  for(let i=0;i<w/14;i++){const gx=x+k.int(w),gw=2+k.int(4),gh=(foot-top)*(.4+k.rand()*.5);k.r(gx,top,gw,gh,'#0e201660')}
  for(let i=0;i<w*(foot-top)/90;i++){const lx=x+k.int(w),ly=top+k.int(Math.max(1,(foot-top)*.7));k.r(lx,ly,3,1,leaf);k.r(lx+1,ly-1,2,1,blend(leaf,'#ffffff',.25))}
  // The shade deepening towards the ground, and the leaves: the culms' arching tops, ragged against whatever is behind the stand.
  const h=foot-top;for(let i=0;i<5;i++)k.r(x,foot-Math.round(h*.3*(1-i/5)),w,Math.round(h*.3*(1-i/5)),'#0e20161c');
  for(let cx=x+2;cx<x+w;cx+=5+k.int(7)){const rx=Math.min(5+k.int(6),w/2);softCrown(k.r,k.rand,Math.max(x+rx-1,Math.min(cx,x+w-rx+1)),top+k.int(Math.max(3,h*.3)),rx,3+k.int(3),canopy)}
  for(let i=0;i<w*h/1400;i++){const rx=4+k.int(4);softCrown(k.r,k.rand,x+rx+k.int(Math.max(1,w-rx*2)),top+h*.3+k.int(Math.max(1,h*.45)),rx,2+k.int(2),canopy)}
  for(let i=0;i<w/5;i++)k.r(x+k.int(w),foot-2-k.int(3),2,1,kind==='gold'?'#a89040':'#b8a868');
}
/** Woven brushwood (柴垣) between its posts, two split-bamboo rails across: Arashiyama's and the Rakusai park's fence. */
const brushwood=(k:Kit,x:number,y:number,w:number,h=12)=>{k.r(x+2,y+h,w,2,'#00000030');k.r(x,y,w,h,'#6a5232');for(let xx=x;xx<x+w;xx+=1)k.r(xx,y+(xx*7)%3,1,h-((xx*7)%3),['#8c7044','#5a4428','#a08050','#74583a'][(xx*13)%4]);k.r(x,y,w,1,'#4e3c26');
  if(w>h)for(const ry of [y+Math.round(h*.3),y+Math.round(h*.7)]){k.r(x,ry,w,2,'#a8a060');k.r(x,ry,w,1,'#ccc488')}else for(const rx of [x+Math.round(w*.3)]){k.r(rx,y,2,h,'#a8a060')}
  for(let px=x;px<x+w;px+=Math.max(w,h)>w?w:30)k.r(px,y-2,2,h+2,'#4a3a26');k.r(x+w-2,y-2,2,h+2,'#4a3a26')};
/** A wooden town house from the front, two storeys, `w` wide, foot at y+40: its tiled roof, the plastered upper floor and its slatted window, the pent roof, the lattice below, the noren in the doorway and what the shop puts out. */
function machiya(k:Kit,x:number,y:number,w:number,color:string,shop=0){const {r}=k;
  r(x,y+14,w,26,'#5a4232');r(x+2,y+15,w-4,9,k.int(3)?'#e2d8c0':'#5a4232');const mw=Math.min(28,w-16);r(x+w/2-mw/2,y+16,mw,6,'#3c2c22');for(let xx=x+w/2-mw/2+1;xx<x+w/2+mw/2;xx+=2)r(xx,y+16,1,6,'#8a6a50');
  k.eaves(x+w/2,y+23,w+4,4,'#4b5456','#00000030','#2c3032');for(let xx=x+2;xx<x+w-2;xx+=2)r(xx,y+29,1,10,'#3c2c22');r(x,y+29,w,1,'#2a2018');
  const dx=x+(shop%2?6:w-24);k.night(()=>{r(dx+1,y+35,16,5,'#f0c070');r(dx+3,y+30,12,4,'#f6d090');r(x+w/2-mw/2,y+16,mw,6,'#e8c070');for(let xx=x+w/2-mw/2+1;xx<x+w/2+mw/2;xx+=2)r(xx,y+16,1,6,'#6a4a30')});r(dx,y+29,18,11,'#2a2320');r(dx,y+29,18,6,color);r(dx+8,y+29,1,6,'#00000040');r(dx+2,y+30,14,1,'#ffffff40');
  if(shop>0){const sx=shop%2?x+w-22:x+4;r(sx,y+34,18,6,'#6a5240');r(sx,y+34,18,1,'#8a7258');for(let i=0;i<4;i++)r(sx+1+i*4,y+32,3,3,['#e8e0cc','#c8452e','#4a7aa8','#e0b040','#6a8a4a'][k.int(5)])}
  k.eaves(x+w/2,y,w+6,12,'#454e52','#00000030','#262c2e');r(x-2,y+40,w+4,3,'#00000030');r(x+w-2,y+14,2,26,'#00000030')}
/** The Mirror Pond's shore, row by row: a far from even oval, its coves on either side. */
const kyoko=(y:number):[number,number]=>{const reach=204*Math.sqrt(Math.max(0,1-Math.abs((y-172)/84)**2.4)),cove=(at:number,wide:number,deep:number)=>deep*Math.exp(-(((y-at)/wide)**2));return [240-reach*(.86+.14*Math.sin(y/13+1))+cove(214,13,36)+cove(128,10,22),240+reach*(.88+.12*Math.sin(y/17+3))-cove(150,12,34)-cove(232,9,26)]};
const kyokoRows=Array.from({length:43},(_,i):Box=>{const y=88+i*4,[l,r]=kyoko(y+2);return [l,y,r-l,4]});
/** Shinsekai's blocks down each side of the street: side (0 left, 1 right), top, depth. */
const sekaiRows:[number,number,number][]=[[0,100,44],[0,144,46],[0,190,46],[0,236,44],[0,280,40],[1,100,38],[1,138,50],[1,188,46],[1,234,46],[1,280,40]];
/** Meiji-jingu's great trees along the way, by their foot: passed in front of or behind. */
const meijiTrees:[number,number][]=[[56,200],[132,300],[56,290],[132,250],[366,200]];
const kinkakuPines:[number,number][]=[[20,120],[456,120],[30,200],[452,200],[110,300],[350,306]];
/** The Shin-en's ponds, west to east: White Tiger, Blue Dragon, Seiho; the path, its stepping stones and its bridge; and the trees, kept off both. */
const ponds:[number,number,number,number][]=[[88,150,62,44],[310,128,100,46],[572,240,152,122]];
const onWater=(x:number,y:number)=>ponds.some(([cx,cy,rx,ry])=>((x-cx)/rx)**2+((y-cy)/ry)**2<1.1);
const gardenPath=[...trail([[96,402],[70,368],[112,334],[80,300],[122,262],[158,232],[160,190],[162,140]]),...trail([[162,124],[136,104],[116,96]]),...trail([[162,140],[176,126],[198,118]]),...trail([[198,117],[424,117]],18),...trail([[424,118],[420,146],[428,174]]),...trail([[428,174],[718,174]]),...trail([[718,174],[738,212],[740,300],[722,362],[660,392],[560,396],[470,392],[432,398]])];
const azaleas:[number,number][]=[[424,352],[448,368],[620,372],[664,370],[700,350],[716,270],[704,120]];
const gardenTrees=(()=>{let seed=11;const pick=(n:number)=>{seed=(seed*1664525+1013904223)>>>0;return seed%n},out:[number,number,number][]=[];
  for(let i=0;i<340;i++){const x=12+pick(736),y=84+pick(340),near=gardenPath.some(([px,py])=>Math.abs(px-x)<26&&y-py>-22&&y-py<42),block=x>160&&x<432&&y>170,tram=x<110&&y>372,pavilion=x>430&&x<712&&y<160,bush=azaleas.some(([ax,ay])=>Math.abs(ax-x)<32&&ay-y>-14&&ay-y<44);if(near||block||tram||pavilion||bush||onWater(x,y)||x>584&&x<716&&y>220&&y<320||out.some(([ox,oy])=>Math.hypot(ox-x,oy-y)<26))continue;out.push([x,y,x<170&&y>230?2+pick(2)*(pick(2)+1):1+pick(3)*2])}
  return out.sort((a,b)=>a[1]-b[1])})();

const scenes:Record<string,{layout:Layout;draw:(k:Kit)=>void}>={
  // Senso-ji: up Nakamise's red-roofed stalls and under the Hozomon with its great lantern to the incense burner, the main hall ahead under its towering roof, the slender pagoda to its left, the paved court all round, Skytree far off over the trees.
  asakusa:{layout:{busy:true,start:[240,304],exit:[208,284],camera:[330,160],solids:[[140,0,200,122],[52,0,42,122],[225,142,30,20],[176,206,46,28],[258,206,46,28],[140,240,64,80],[276,240,64,80],[0,0,28,320],[452,0,28,320]],over:[[172,160,136,52],[226,204,28,22]],people:[[200,140,11,'up'],[276,136,7,'up'],[300,180,3,'left'],[170,170,9,'right'],[380,150,12,'left'],[110,200,1,'up'],[226,268,5,'up'],[256,290,8,'down']],puffs:[[240,134,0xc8c8c0]],lamps:[[240,212,30,0xffb070],[240,112,44,paper],[240,190,70,warm,.6,.5],[210,276,50,paper,.8],[270,276,50,paper,.8],[240,150,40,0xffb070,.7],[240,100,30,0xffb070,.8]]},draw:k=>{
    const {r}=k;
    // The court: granite flags, the way up the middle in larger slabs.
    r(0,0,480,320,'#aeaa9e');for(let y=0;y<320;y+=8)for(let x=(y%16?0:6);x<480;x+=12)r(x,y,11,7,['#bab6aa','#b6b2a6','#bebaae','#b2aea2'][k.int(4)]);k.stones(204,232,72,88,'#c4bfb0','#a8a294');k.stones(214,120,52,90,'#c4bfb0','#a8a294');
    // The temple's pigeons, pecking about the flags.
    for(const [x,y,f] of [[118,160,1],[126,166,-1],[112,170,1],[360,200,-1],[368,196,1],[352,208,1],[150,232,-1],[400,240,1],[96,250,1],[330,236,-1],[390,130,1]]){r(x,y+2,5,1,'#00000028');r(x,y,4,2,'#7a8088');r(x+(f>0?3:-1),y-1,2,2,'#5a6068');r(x+(f>0?2:1),y,1,1,'#6a9a80');r(x+(f>0?-1:4),y+1,1,1,'#4a5058');r(x+(f>0?5:-2),y,1,1,'#e0a030')}
    // The trees round the court, and over them in the north-east the sky, the city and Skytree.
    r(340,0,140,62,'#c8d8e0');for(let x=344;x<480;x+=6+k.int(6)){const h=6+k.int(14);r(x,62-h,5,h,['#a8b4bc','#b8c0c4','#98a4ac'][k.int(3)])}for(let y=8;y<62;y++){const w=Math.max(1,(y-8)*.08);r(424-w,y,w*2,1,'#e4eef4')}r(421,26,6,3,'#c8d4dc');r(420,36,8,4,'#c8d4dc');r(423,2,2,8,'#e4eef4');
    k.forest(0,40,140,30,greens[1]);k.forest(340,54,140,20,greens[1]);k.forest(0,0,140,44,greens[1]);for(const [x,y] of [[20,120],[20,190],[20,260],[460,110],[460,180],[460,250],[110,285],[380,285],[410,110]])k.tree(x,y,x%3?greens[1]:['#6a7a38','#9aa040','#c8c050','#e8e080']);
    k.pagoda(72,122,5,38,'#c0402e','#3e4648',16);
    // The main hall: the steep roof over all, white plaster under the eaves, vermilion below, the great lantern in the doorway, the wide steps.
    k.hall(240,38,212,40,44,'#c0442f','#454e52');r(152,82,176,8,'#efe9d8');for(let x=156;x<326;x+=14)r(x,82,3,8,'#c0442f');r(180,110,120,12,'#a8a294');for(let y=112;y<122;y+=3){r(180,y,120,1,'#8f8a7c');r(180,y+1,120,1,'#c4beb0')}r(216,98,48,10,'#5a3e2a');r(216,98,48,2,'#7a5a3a');for(let x=218;x<262;x+=4)r(x,100,2,8,'#3a2a1c');
    k.ell(240,92,9,8,'#c8302e');r(232,85,16,2,'#2a2320');r(232,99,16,2,'#2a2320');r(236,90,8,4,'#2a2320');k.lantern(196,95);k.lantern(278,95);
    // The burner: three bronze legs, its bowl, its little roof.
    k.shade(226,160,30);r(228,150,4,10,'#3c3a36');r(248,150,4,10,'#3c3a36');r(226,146,28,8,'#54504a');r(226,146,28,2,'#7a7468');r(236,136,8,10,'#4c4842');k.eaves(240,130,24,6,'#4c4842');
    // The Hozomon: two storeys, white plaster above, vermilion below, the green-latticed niches either side; its great lantern hung in the way through, Kobunacho's name on it.
    k.above(()=>{k.gate(240,234,128,'#c0402e','#454e52',36);r(186,190,108,8,'#efe9d8');for(let x=188;x<292;x+=10)r(x,190,3,8,'#c0402e');for(const x of [180,280])r(x,212,20,20,'#3a6a54'),r(x+2,214,16,16,'#2a2320'),r(x+4,216,12,12,'#5a8a6a40')});
    k.above(()=>{k.ell(240,214,11,12,'#8a2018');k.ell(240,213,10,11,'#c8302e');k.ell(237,209,4,5,'#e04a3a');r(229,204,22,2,'#2a2320');r(229,223,22,3,'#2a2320');r(231,211,18,6,'#2a2320');k.text(233,212,'小舟町','#c8302e',false)});
    // Nakamise: the shops in their row under red tiles, a curved gable at each end, the goods out front, lanterns along.
    for(const [x,w] of [[140,64],[276,64]])for(let y=240;y<320;y+=21){k.r(x,y+6,w,15,'#efe6d0');r(x,y+6,w,1,'#ffffff');k.r(x+(x<240?w-14:2),y+8,12,11,'#6e4630');for(let gx=x+(x<240?4:18);gx<x+(x<240?4:18)+w-22;gx+=4)r(gx,y+10,3,4,['#e0c070','#d07a5a','#7ab0a0','#e9a6ad','#f4f0e4'][k.int(5)]);r(x+(x<240?4:18),y+14,w-22,2,'#8a6a4a');k.r(x,y,w,7,'#b8402e');for(let xx=x;xx<x+w;xx+=3)k.r(xx,y+1,1,6,'#8c2e22');r(x,y,w,1,'#d86a4e');r(x,y+6,w,1,'#5a1a12');k.lantern(x<240?x+w-3:x-3,y+10,'#e8735a')}
    for(const x of [140,276]){r(x,236,64,6,'#b8402e');k.ell(x+32,236,30,4,'#c8503a');r(x+28,232,8,3,'#d8b04a')}
  }},
  // Shibuya: the scramble itself, zebras in every direction and the crowd on them, QFRONT's glass corner wrapped in its screen ahead, the screens stacked on every front, 109's silver cylinder at the fork; Hachiko's plaza in the corner by the station, cars waiting at the lines.
  'shibuya-crossing':{layout:{busy:true,start:[175,306],exit:[8,250],camera:[92,264],solids:[[0,0,480,128],[318,252,162,68],[56,250,30,22],[0,290,28,30],[126,296,28,8],[196,296,28,8],[266,296,28,8],[296,262,20,10]],stands:[[0,276,36,42],[54,240,32,36],[118,264,44,42],[188,268,44,42],[258,264,44,42],[292,234,26,40]],people:[[160,165,0,'right'],[176,172,5,'right'],[212,186,9,'up'],[238,173,3,'left'],[270,198,12,'down'],[300,165,7,'left'],[326,186,1,'up'],[188,211,13,'right'],[256,217,2,'up'],[352,151,10,'left'],[140,235,6,'up'],[290,235,8,'up'],[220,149,4,'down'],[384,219,14,'left']],crossing:{sides:[[100,134,290,5],[106,248,196,10]],exits:[[[10,136],[470,136]],[[150,310],[230,310],[300,310]]],poles:[[120,139,'L'],[368,139,'R'],[120,250,'L'],[368,250,'R']],crowd:32,cars:{lanes:[[166,1],[191,1],[216,-1],[241,-1]],stop:[76,412]}},lit:[[4,60,50,22],[66,68,40,16],[114,56,38,30],[160,60,22,48],[190,52,108,48],[186,100,116,28],[306,58,58,40],[408,64,22,14],[0,112,124,16],[127,112,227,16],[357,112,123,16],[318,246,162,10],[296,238,20,24]],lamps:[[240,144,120,cool,.8,.4],[100,240,80,warm,.7],[400,144,90,warm,.6,.4],[240,190,150,0xffffff,.45],[220,94,90,0x90d0ff,.8],[60,94,70,0xffc090,.7],[420,94,70,0xfff0c0,.6],[360,252,90,warm,.7,.5],...[104,215].flatMap((y):Glow[]=>[[149,y,14,0xffffff,.8],[339,y,14,0xffffff,.8],[126,y+14,10,0xffffff,.8],[362,y+14,10,0xffffff,.8]])]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,70,'#6a8cb0','#b8d0dc',5);for(let x=-4;x<480;){const w=14+k.int(18),h=20+k.int(30);r(x,74-h,w,h+10,blend('#8ea2b4','#a8b8c4',k.rand()));for(let y=78-h;y<70;y+=5)for(let wx=x+2;wx<x+w-2;wx+=4)if(k.int(2))r(wx,y,2,2,'#ffffff30');x+=w+k.int(4)}
    // The fronts stand their full height over the crossing: all this is drawn 24 px lower than its numbers.
    {const paint=k.r,r:typeof paint=(x,y,w,h,c)=>paint(x,y+24,w,h,c),ell=(cx:number,cy:number,rx:number,ry:number,c:string)=>k.ell(cx,cy+24,rx,ry,c),text=(x:number,y:number,t:string,c:string,big=true)=>k.text(x,y+24,t,c,big),word=(x:number,y:number,t:string,c:string)=>letter(k.g,x,y+24,t,c);
    // The fronts across the crossing, every one a screen or a sign.
    const front=(x:number,w:number,top:number,c:string)=>{r(x,top,w,104-top,c);r(x,top,w,2,'#ffffff30');r(x+w-3,top,3,104-top,'#00000030');for(let y=top+4;y<88;y+=6)for(let wx=x+3;wx<x+w-5;wx+=5)r(wx,y,3,3,k.int(4)?'#5a6a78':'#e8d8a0');r(x,88,w,16,'#2a2e34');for(let sx=x+2;sx<x+w-4;sx+=14)r(sx,91,12,11,['#f4dca0','#e8f0f4','#fff0c8'][k.int(3)])};
    front(0,62,20,'#3e444c');front(62,48,30,'#4a4650');front(110,46,24,'#3a4048');front(156,30,16,'#454a54');front(302,66,26,'#3e4250');
    r(4,36,50,22,'#1a1c22');gradient(r,6,38,46,18,'#e0483a','#f0a040',4);word(10,44,'TOKYO','#fffef2');r(66,44,40,16,'#f0c030');text(70,47,'カラオケ','#2a2320',false);r(114,32,38,30,'#1a1c22');gradient(r,116,34,34,26,'#34b6e0','#7ad0f0',4);ell(133,47,8,8,'#fffef2');ell(133,47,5,5,'#e0483a');
    r(160,36,22,48,'#d060b0');r(160,36,22,2,'#f0a0e0');[...'ドラッグ'].forEach((ch,i)=>text(163,39+i*11,ch,'#fffef2'));r(306,34,58,26,'#1a1c22');gradient(r,308,36,54,22,'#2a8a4a','#9ad070',4);text(318,42,'渋谷','#fffef2');r(306,64,58,10,'#e0483a');word(312,66,'SHIBUYA','#fffef2');
    // QFRONT: the glass corner, the great screen over it, the green café on its first floor.
    r(186,14,116,90,'#2f3a44');ell(244,14,58,6,'#3a4650');r(190,28,108,48,'#1a1c22');gradient(r,192,30,104,44,'#3a2a8a','#d060b0',6);ell(226,50,14,14,'#f0d060');ell(226,50,10,10,'#fff4c0');r(252,40,38,8,'#fffef2');r(252,52,30,6,'#34b6e0');r(252,62,36,4,'#f0c030');for(let x=192;x<296;x+=2)r(x,30,1,44,'#00000014');
    r(186,76,116,10,'#c8dde0');for(let x=190;x<300;x+=8)r(x,76,1,10,'#2f3a44');r(206,78,30,6,'#2a7a4a');r(186,86,116,18,'#c8dde0');for(let x=190;x<300;x+=10)r(x,86,2,18,'#2f3a44');r(186,86,116,2,'#ffffff');
    // 109 at the fork: its silver drum in fins, the logo tower.
    r(372,30,94,74,'#c4c9ce');r(372,30,4,74,'#e8ecf0');r(460,30,6,74,'#8e959c');for(let wx=380;wx<460;wx+=8)r(wx,30,2,74,'#9ea4aa');for(let y=40;y<100;y+=12)r(372,y,94,1,'#e0e4e8');r(404,14,30,60,'#d8dde2');r(404,14,30,2,'#ffffff');r(408,40,22,14,'#1a1c22');r(409,41,20,12,'#f4f4ee');text(410,42,'109','#e0483a');r(372,86,94,18,'#2a2e34');for(let x=376;x<462;x+=12)r(x,89,10,13,'#f4dca0');
    // The near pavement over there, kerb and lights.
    r(0,104,480,10,'#b4b0a8');for(let x=0;x<480;x+=12)r(x,104,1,10,'#a09c94');r(0,104,480,3,'#00000030');r(0,114,480,2,'#e0dccb');r(0,116,480,2,'#00000030');
    }
    // The road at three-quarters: the far kerb's face, the asphalt, its lanes either side of the crossing (yellow centre line, dashed lane lines, arrows, the stop lines before the side zebras),
    // then the zebras, their bars across the way they are walked and foreshortened as the ground is (`s`), the paint worn: across the road either side, along the far and near kerbs, both diagonals.
    r(0,140,480,106,'#5c6062');for(let i=0;i<1100;i++)r(k.int(480),143+k.int(102),2,1,k.int(2)?'#666a6c':'#52565a');for(const y of [150,162,175,187,200,212,225,237])if(k.int(2))r(0,y,480,2,'#585b5e');
    r(0,140,480,2,'#cbc6b6');r(0,140,480,.5,'#e8e4d8');r(0,142,480,1,'#3e4244');
    const paint='#e6e3cc',worn=(x:number,y:number,w:number,h:number)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(k.int(11))r(xx,yy,1,1,paint)};
    for(const [x0,x1] of [[0,78],[410,480]]){r(x0,192,x1-x0,1.5,'#e6c84a');for(const y of [167,217])for(let x=x0+4;x<x1;x+=18)worn(x,y,9,1)}
    worn(76,143,3,49);worn(409,194,3,50);
    const arrow=(x:number,y:number,dir:number)=>{worn(dir>0?x-12:x,y,12,2);for(let i=0;i<4;i++)worn(x+dir*i-(dir<0?1:0),y-3+i,1,8-2*i)};arrow(48,155,1);arrow(48,180,1);arrow(440,205,-1);arrow(440,230,-1);
    for(const [mx,my] of [[30,206],[452,160]] as const){k.ell(mx,my,6,2.5,'#45494b');k.ell(mx,my,5,2,'#55595b');r(mx-4,my,8,.5,'#45494b')}
    for(const x of [84,372])for(let y=145;y<243;y+=6)worn(x,y,32,3);
    for(let x=124;x<364;x+=9){worn(x,147,4,10);worn(x,232,4,10)}
    const s=.55,quad=(pts:[number,number][])=>{const ys=pts.map(p=>p[1]);for(let y=Math.floor(Math.min(...ys));y<Math.ceil(Math.max(...ys));y++){const xs:number[]=[];pts.forEach(([ax,ay],i)=>{const [bx,by]=pts[(i+1)%pts.length];if((ay<=y+.5)!==(by<=y+.5))xs.push(ax+(y+.5-ay)/(by-ay)*(bx-ax))});xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2)for(let x=Math.round(xs[i]);x<Math.round(xs[i+1]);x++)if(k.int(11))r(x,y,1,1,paint)}};
    const diagonal=(x0:number,y0:number,x1:number,y1:number)=>{const dx=x1-x0,dz=(y1-y0)/s,d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d;for(let t=8;t<d-6;t+=9){const cx=x0+ux*t,cz=y0/s+uz*t;quad(([[-2,-12],[2,-12],[2,12],[-2,12]] as const).map(([a,b]):[number,number]=>[cx+ux*a-uz*b,(cz+uz*a+ux*b)*s]))}};
    diagonal(126,166,362,224);diagonal(362,166,126,224);
    // The plaza: paving, its tree beds and the dog on his plinth.
    k.stones(0,246,318,74,'#a8a699','#928f83');r(0,244,318,2,'#e0dccb');r(0,246,318,1,'#00000030');for(let i=0;i<60;i++)r(k.int(318),247+k.int(72),3,2,'#b4b2a6');
    k.above(()=>{k.shade(56,272,30,3);r(56,262,28,10,'#7a7a70');r(56,262,28,2,'#94948a');r(56,270,28,2,'#5a5a52');r(62,252,16,10,'#6a5a3c');r(66,246,7,8,'#7a6a4a');r(70,243,4,4,'#6a5a3c');r(64,245,2,3,'#6a5a3c');r(76,250,3,5,'#6a5a3c');r(63,252,3,1,'#8a7a5a');r(66,247,3,1,'#8a7a5a');});
    for(const x of [140,210,280]){r(x-14,296,28,8,'#6a5a48');r(x-14,296,28,2,'#8a7a64');r(x-12,298,24,6,'#4a6a3a')}k.above(()=>{k.tree(14,300,greens[1]);k.tree(140,288,greens[2]);k.tree(210,292,greens[1]);k.tree(280,288,greens[2])});for(const x of [176,244])r(x,272,20,4,'#6a5240'),r(x,276,2,4,'#3a3a38'),r(x+18,276,2,4,'#3a3a38');
    // The station, on our side of the crossing and so seen from over its roof: the parapet, the plant on the flat roof, the glass canopy over its doors along the plaza; its name on a pylon before it.
    r(318,252,162,68,'#8a9096');r(318,252,162,2,'#c4c8cc');r(318,254,162,4,'#5a6068');r(322,260,154,60,'#a2a8ac');for(let y=268;y<320;y+=12)r(322,y,154,1,'#8e9498');for(let x=346;x<476;x+=40)r(x,260,1,60,'#8e9498');
    for(const [x,y] of [[334,270],[362,270],[430,296],[452,296]] as const){r(x+1,y+1,18,12,'#00000030');r(x,y,18,11,'#c8ccd0');r(x,y,18,2,'#e4e8ea');for(let i=2;i<16;i+=3)r(x+i,y+4,1,5,'#7a8288')}r(394,268,26,40,'#b4d0d8');for(let y=268;y<308;y+=8)r(394,y,26,1,'#7e96a0');r(406,268,1,40,'#7e96a0');r(394,268,26,2,'#e4f0f4');
    k.shine(()=>{r(318,246,162,8,'#c8dde0');r(318,246,162,2,'#ffffff');for(let x=318;x<480;x+=12)r(x,246,1,8,'#7e96a0');r(318,253,162,1,'#5a6068')});
    k.above(()=>{k.shade(298,270,18,3);r(304,258,4,14,'#5a5e60');k.shine(()=>{r(296,238,20,22,'#1a1c22');r(297,239,18,7,'#2a8a4a');letter(k.g,301,240,'JR','#fffef2');r(297,247,18,12,'#f6f2e6');for(const [n,ch] of [...'渋谷駅'].entries())k.text(298+n*6,250,ch,'#2a2320',false)});});
  }},
  // Meiji-jingu: the forest of camphor and oak, the wide gravel approach turning a right angle with its stone walk down one side, dappled with shade: the sake casks and Burgundy's wine facing across it on their plinths behind the bamboo rail, then the great plain torii of cypress and the south gate, its copper roof gone dark, over the paved court.
  meiji:{layout:{busy:true,start:[94,304],exit:[64,276],camera:[212,206],solids:[[0,0,60,320],[128,236,352,84],[60,0,230,170],[350,0,130,236],[280,0,80,88]],over:[[262,82,116,30],[286,112,10,22],[344,112,10,22]],stands:meijiTrees.map(([x,y]):Box=>[x===366?356:x-22,y-56,x===366?32:46,59]),people:[[90,226,4,'up'],[240,188,12,'left'],[318,170,7,'up'],[334,122,1,'up']],lamps:[[320,130,54,warm,.5],[320,78,44,paper,.8],[94,220,60,warm,.5],[210,200,80,warm,.45,.5]]},draw:k=>{
    const {r}=k;
    // The forest: crowns of every green, the odd dark evergreen, seen from over the tops.
    k.forest(0,0,480,320,greens[1]);
    // The approach: gravel in two greys, a stone walk down its side, kerbed.
    const gravel=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#cbc4ae');for(let i=0;i<w*h/7;i++)r(x+k.int(w),y+k.int(h),1,1,['#b4ad97','#ddd6c2','#a8a18c','#e6e0cc'][k.int(4)]);r(x,y,w,1,'#8a846f')};
    gravel(60,170,68,150);gravel(60,170,290,66);gravel(290,36,60,200);
    for(const [x,y,w,h] of [[62,170,16,150],[60,222,290,14],[334,88,16,148]] as const){r(x,y,w,h,'#a6a292');for(let yy=y;yy<y+h;yy+=6)for(let xx=x+(yy%12?0:4);xx<x+w;xx+=8)r(xx,yy,7,5,['#bcb8a8','#b2ae9e','#c4c0b0'][k.int(3)])}
    // Shade from the crowns, lying across the gravel.
    for(let i=0;i<40;i++){const [x,y]=[[60+k.int(68),170+k.int(150)],[60+k.int(290),170+k.int(66)],[290+k.int(60),88+k.int(148)]][k.int(3)];k.ell(x,y,6+k.int(12),3+k.int(4),'#00000014')}
    // Great trunks standing along the edges, their crowns over the way.
    const trunk=([x,y]:readonly [number,number])=>{k.shade(x-6,y,16,3);r(x-3,y-30,6,30,'#5c4a3c');r(x-3,y-30,2,30,'#7a6650');r(x+2,y-30,1,30,'#3e3228');softCrown(r,k.rand,x,y-40,20,14,greens[k.int(3)]);softCrown(r,k.rand,x+8,y-34,12,9,greens[1])};
    trunk([286,60]);k.above(()=>meijiTrees.forEach(trunk));
    // The sake casks: white, bound with straw rope, each its maker's mark, stacked under their roof on a stone plinth, behind the grass and the bamboo rail.
    r(130,118,150,52,'#2e241c');r(130,158,150,12,'#9a968a');r(130,158,150,2,'#b4b0a2');for(let row=0;row<3;row++)for(let x=132;x<276;x+=12){const y=121+row*12;r(x+1,y+1,11,11,'#00000040');r(x,y,11,11,['#f2ecdc','#ece4cf','#f6f0e2'][(x+row)%3]);r(x,y,11,1,'#d8c890');r(x,y+3,11,1,'#a89870');r(x,y+8,11,1,'#a89870');r(x+10,y,1,11,'#c8c0aa');const m=['#c8452e','#1d5fae','#2a2320','#2a7a58','#2a2320','#d4a93a'][k.int(6)];r(x+3,y+4,5,1,m);r(x+5,y+4,1,4,m);r(x+3,y+6,2,1,m);r(x+6,y+6,2,1,m)}
    k.eaves(205,106,160,12,'#4a3e32','#00000030','#2a2018');r(130,172,150,2,'#6a9a54');for(let x=132;x<280;x+=24){r(x,172,2,6,'#c8a868');r(x,173,24,1,'#d8c090')}
    // The wine barrels across the way on their racks, a gift from Burgundy.
    r(140,240,128,28,'#3e3024');for(let row=0;row<2;row++)for(let x=142;x<262;x+=20){const y=240+row*13;r(x,y,18,12,'#7a4a30');r(x,y+1,18,1,'#a07048');r(x+4,y,2,12,'#a9aaa6');r(x+12,y,2,12,'#a9aaa6');k.ell(x+9,y+6,3,3,'#5a3420');r(x+8,y+5,2,2,'#3c2418')}r(140,266,128,4,'#9a968a');k.eaves(204,232,136,8,'#4a3e32','#00000030','#2a2018');
    // The court before the south gate: great flags, the gate's dark copper roof, its posts.
    r(270,36,100,52,'#9a968a');for(let y=40;y<88;y+=8)for(let x=270+(y%16?0:10);x<370;x+=20)r(x,y,19,7,['#a8a496','#b2ae9e','#9c988a'][k.int(3)]);
    k.hall(320,30,120,24,30,'#6e5440','#3a4844','#3e2e22','#1f1a15');r(304,62,32,22,'#1f1a15');
    // The torii: cypress left plain, grey-brown, its lintel's ends cut square, its posts on stone.
    k.above(()=>{k.torii(320,150,70,64,'#9c8a6e','#7e6c52','#ffffff28');for(const x of [287,345]){r(x,148,10,4,'#8e8a7c');r(x,148,10,1,'#aeaa9c')}});
    // The lanterns of the gate.
    for(const x of [276,364])k.stoneLantern(x,92);
  }},
  // Ginza: the 4-chome crossing, the Wako's curved stone corner and its clock tower, the San-ai glass drum opposite and Mitsukoshi with its bronze lion beside it; Chuo-dori closed to cars, its wide pavements, the old Ginza lamps along the kerbs, the near blocks' roofs below.
  ginza:{layout:{busy:true,start:[240,304],exit:[184,280],camera:[300,126],solids:[[0,0,188,146],[292,0,188,146],[0,212,188,108],[292,212,188,108]],stands:[60,120,380,460].map((x):Box=>[x-9,183,22,41]),people:[[216,186,1,'up'],[262,236,7,'left'],[230,262,4,'right'],[150,176,11,'right'],[330,180,5,'left'],[420,176,13,'left'],[60,180,0,'right']],lit:[[148,50,34,20],[298,40,70,96],[372,92,40,14],[0,128,182,10],[368,128,112,10],[10,236,30,22],[440,234,30,22]],lamps:[[176,160,44,warm,.8],[304,160,44,warm,.8],[176,206,44,warm,.8],[304,206,44,warm,.8],[240,260,80,warm,.5],[164,60,30,0xfff6d0],[330,90,90,cool,.7],[60,116,30,0xfff6d0,.9],[120,116,30,0xfff6d0,.9],[380,116,30,0xfff6d0,.9],[460,116,30,0xfff6d0,.9],[60,190,30,0xfff6d0,.9],[120,190,30,0xfff6d0,.9],[380,190,30,0xfff6d0,.9],[460,190,30,0xfff6d0,.9],[90,160,70,warm,.5,.4],[420,160,70,warm,.5,.4],[90,134,80,warm,.5,.4],[400,134,80,warm,.5,.4],[389,268,60,0xffc890,.7],[93,244,24,0xfff1cc,.5]]},draw:k=>{
    const {r}=k;r(0,0,480,40,'#8aa8c0');
    // The road: asphalt, its lines, the four zebras.
    r(0,146,480,66,'#5d6163');r(182,0,116,320,'#5d6163');for(let i=0;i<700;i++){const x=k.int(480),y=k.int(320);if(x>182&&x<298||y>146&&y<212)r(x,y,2,1,k.int(2)?'#676b6d':'#53575a')}for(let y=0;y<146;y+=20)r(239,y,2,10,'#e6e3cc');for(let y=226;y<320;y+=20)r(239,y,2,10,'#e6e3cc');
    for(const [x,y,w,h] of [[0,140,188,6],[292,140,188,6],[0,212,188,6],[292,212,188,6],[182,0,6,146],[292,0,6,146],[182,212,18,108],[280,212,18,108]])k.stones(x,y,w,h,'#c4c2bc','#aeaca6');r(199,218,1,102,'#8e8c86');r(280,218,1,102,'#8e8c86');
    for(let x=194;x<288;x+=9)r(x,128,6,12,'#e6e3cc');for(let x=203;x<278;x+=9)r(x,220,6,12,'#e6e3cc');for(let y=154;y<208;y+=9){r(166,y,14,6,'#e6e3cc');r(300,y,14,6,'#e6e3cc')}
    // Wako: pale granite, rows of tall windows between pilasters, the cornice, the corner turned in a curve under the clock tower.
    r(0,30,150,110,'#d6ceb8');r(0,30,150,3,'#ece6d6');for(let x=4;x<146;x+=12){r(x,40,2,90,'#c4bca6');r(x+2,40,1,90,'#e6e0cc')}for(let y=44;y<124;y+=20)for(let x=8;x<142;x+=12){r(x,y,6,14,'#4a5a64');r(x,y,6,2,'#2a3a44');r(x+1,y+2,1,10,'#7a96a4')}r(0,124,150,3,'#b0a890');r(0,127,150,13,'#2e3234');for(let x=6;x<146;x+=12)r(x,129,8,9,'#f4dca0');
    for(let y=30;y<140;y++){const t=(y-30)/110,bulge=Math.round(Math.sqrt(Math.max(0,1-(t*1.2-.1)**2))*6);r(150,y,32+bulge,1,'#dcd4c0');r(176+bulge,y,6,1,'#c4bca6')}for(let y=78;y<124;y+=20)for(const x of [156,166])r(x,y,6,14,'#4a5a64');r(150,127,38,13,'#2e3234');r(156,129,24,9,'#f4dca0');
    r(148,46,36,32,'#ccc4ae');r(148,46,3,32,'#e6e0cc');r(181,46,3,32,'#b0a890');k.ell(166,60,11,11,'#8a8270');k.ell(166,60,10,10,'#fbf8ec');for(let i=0;i<12;i++){const t=i/12*Math.PI*2;r(166+Math.cos(t)*8,60+Math.sin(t)*8,1,1,'#3a3430')}r(166,53,1,7,'#2a2320');r(166,60,5,1,'#2a2320');r(146,40,40,6,'#5f7a6a');r(150,36,32,4,'#6e8a78');r(158,32,16,4,'#7a9a86');r(165,26,2,6,'#3a4a40');
    // The San-ai drum: glass, banded with light, the lit ring of its sign on top; beside it Mitsukoshi in stone, its name, its lion on guard.
    r(298,40,70,96,'#a8c4cc');k.ell(333,40,35,7,'#c8dde0');for(let x=302;x<366;x+=7)r(x,40,2,96,'#7a9aa4');for(let y=48;y<132;y+=7){r(298,y,70,2,'#e4f4f8');r(298,y+2,70,1,'#5a7a84')}r(298,40,6,96,'#d0e4e8');r(360,40,8,96,'#6a8a94');k.ell(333,36,22,5,'#f6efdc');k.ell(333,36,18,3,'#a8c4cc');
    r(368,36,112,104,'#cfc6b0');r(368,36,112,3,'#e8e0cc');for(let y=46;y<120;y+=14)for(let x=374;x<476;x+=10)r(x,y,6,9,'#5c6e78');r(372,92,40,14,'#2a2320');k.text(380,94,'三越','#e8c860');r(368,124,112,16,'#2e3234');for(let x=372;x<476;x+=12)r(x,127,10,10,'#f4dca0');r(368,122,112,2,'#a89f8a');
    k.shade(430,140,22,2);r(428,132,22,8,'#6a6458');r(428,132,22,2,'#8a8478');r(432,124,14,9,'#5a4a30');r(440,118,8,8,'#6a5636');r(443,116,6,6,'#7a6640');r(432,124,3,3,'#8a7450');r(446,120,2,2,'#2a2018');
    // The Ginza lamps: a post, two white globes on a crossbar; those of the near kerb are `stands`, before anyone on the road.
    for(const [x,y] of [[60,144],[120,144],[380,144],[460,144],[60,216],[120,216],[380,216],[460,216]] as const){k.shade(x-2,y+2,8,2);k.above(()=>{r(x,y-22,2,24,'#3a4a40');r(x-6,y-22,14,2,'#3a4a40');k.ell(x-5,y-25,3,3,'#fbf6e6');k.ell(x+7,y-25,3,3,'#fbf6e6');k.ell(x+1,y-29,3,3,'#fbf6e6')})}
    // The blocks to the south, from over their roofs, an alley's shadow between them: plant rooms, tanks and rows of air conditioners, skylights, a roof garden with its little Inari shrine, a beer garden under its parasols and lanterns, the lit signs at the corners facing the crossing.
    const roof=(x:number,w:number,c:string,drop=0)=>{r(x,218,w,102,'#c8cacc');r(x+2,220,w-4,100,c);r(x+2,220,w-4,2,'#00000038');r(x+2,220,2,100,'#00000028');for(let i=0;i<w*2;i++)r(x+3+k.int(w-6),222+k.int(96),2,1,k.int(2)?'#ffffff14':'#00000014');if(drop)r(x+2,220,drop,100,'#00000030')};
    const unit=(x:number,y:number)=>{r(x+1,y+8,10,2,'#00000030');r(x,y,10,8,'#d4d8d8');r(x,y+6,10,2,'#9a9ea0');k.ell(x+5,y+3,3,3,'#7a8286');r(x+4,y+2,2,2,'#c4c8cc')};
    const tank=(x:number,y:number)=>{k.shade(x+3,y+14,12,2);r(x+1,y+8,1,7,'#5a5e60');r(x+10,y+8,1,7,'#5a5e60');r(x,y,12,10,'#b8bcc0');r(x,y,12,3,'#dcdfe0');r(x+10,y,2,10,'#8e9296');r(x+3,y+4,6,1,'#8e9296')};
    const hut=(x:number,y:number,w:number,h:number)=>{r(x+3,y+h,w,4,'#00000030');r(x,y,w,h,'#d2d4d4');r(x,y+h-7,w,7,'#96989a');r(x,y,w,1,'#eceeee');r(x+w-8,y+h-6,5,6,'#5a6064')};
    for(const x of [62,120,356,418])r(x,218,4,102,'#2a2e32');
    roof(0,62,'#9a6e60');roof(66,54,'#8e9498',5);roof(124,58,'#a9acae');roof(298,58,'#a2a5a8');roof(360,58,'#7f8a90',5);roof(422,58,'#9a9da0');
    hut(8,266,24,20);tank(42,264);for(let i=0;i<4;i++)unit(6+i*13,300);r(12,256,2,6,'#3a3e40');r(36,256,2,6,'#3a3e40');
    r(74,226,38,30,'#cfc8b0');for(let i=0;i<30;i++)r(75+k.int(36),227+k.int(28),1,1,'#b4ad96');r(88,228,10,9,'#6a5240');r(86,226,14,3,'#4b5456');r(91,231,4,6,'#2a2320');r(84,241,18,2,'#d0402c');r(83,240,20,1,'#2a2020');r(86,243,2,10,'#d0402c');r(98,243,2,10,'#d0402c');r(85,245,16,1,'#d0402c');r(80,250,3,4,'#a3a598');r(103,250,3,4,'#a3a598');
    k.lawn(72,264,42,48,'#5a8559');r(72,264,42,1,'#3f6a4c');r(90,264,6,48,'#cfc8b0');softCrown(r,k.rand,80,274,7,5,greens[1]);softCrown(r,k.rand,106,282,7,5,greens[2]);softCrown(r,k.rand,79,300,6,5,blossom);softCrown(r,k.rand,107,304,6,4,greens[0]);r(98,292,10,3,'#8a6a48');r(98,295,1,2,'#4a4a48');r(107,295,1,2,'#4a4a48');
    for(const [x,y] of [[132,232],[154,232]]){r(x,y,18,12,'#5a6a74');r(x+1,y+1,16,10,'#a8c4cc');r(x+9,y+1,1,10,'#5a6a74');r(x+2,y+2,5,2,'#e4f4f8')}for(let j=0;j<2;j++)for(let i=0;i<3;i++)unit(134+i*14,256+j*14);hut(132,292,22,20);r(170,286,1,26,'#5a5e60');r(166,290,9,1,'#5a5e60');r(167,296,7,1,'#5a5e60');
    hut(306,228,28,22);for(let i=0;i<3;i++)unit(306+i*14,262);r(304,280,44,3,'#b8bcc0');r(304,280,44,1,'#dcdfe0');r(345,280,3,24,'#b8bcc0');tank(310,292);tank(326,292);
    r(366,228,46,84,'#a8845c');for(let y=228;y<312;y+=4)r(366,y,46,1,'#8e6e4a');r(366,228,46,2,'#00000030');r(366,302,46,8,'#6a5240');r(366,302,46,1,'#8a7258');for(let i=0;i<6;i++)r(369+i*7,298,4,4,['#e8c860','#f4f4ec','#c8452e'][i%3]);
    for(const [x,y,c] of [[378,246,'#d0402c'],[400,252,'#3a78c2'],[378,274,'#3a78c2'],[400,280,'#d0402c']] as const){r(x-5,y+6,12,2,'#00000030');r(x-4,y+2,10,4,'#e8e4d4');r(x-7,y+3,2,3,'#4a4a48');r(x+7,y+3,2,3,'#4a4a48');k.ell(x+1,y-4,9,5,'#00000030');k.ell(x+1,y-6,9,5,c);for(const dx of [-5,5])r(x+dx,y-10,2,9,'#f4f4ec');k.ell(x+1,y-7,2,1,'#2a2020')}
    for(const y of [234,296])for(let x=368;x<410;x+=6){r(x,y+Math.round(Math.sin((x-368)/42*Math.PI)*2),3,4,x%12?'#d0402c':'#f4f4ec');r(x+1,y-1+Math.round(Math.sin((x-368)/42*Math.PI)*2),1,1,'#2a2020')}
    for(let i=0;i<3;i++)unit(428+i*14,268);k.shade(444,304,20,3);k.ell(452,296,9,9,'#7a7e80');k.ell(452,294,8,8,'#b0b4b8');k.ell(449,291,3,2,'#e4e8e8');r(444,256,2,6,'#3a3e40');r(464,256,2,6,'#3a3e40');hut(426,290,14,18);
    for(const [x,c,t] of [[10,'#e0483a','銀座'],[440,'#34b6e0','GINZA']] as const){r(x,234,30,22,'#1a1c22');r(x+1,235,28,20,c);r(x+2,236,26,2,'#ffffff70');if(t==='GINZA')letter(k.g,x+3,243,t,'#fffef2');else k.text(x+5,240,t,'#fffef2')}
  }},
  // Odaiba: the bay and the Rainbow Bridge crossing it away from us, white towers, its two decks and its cables, the city behind with Tokyo Tower; the houseboats, the little Statue of Liberty on her white plinth at the water's edge, the beach, the lawn, the boardwalk, the television building's silver ball.
  odaiba:{layout:{start:[60,298],exit:[18,268],camera:[220,176],solids:[[0,0,480,150],[350,104,44,60],[330,214,150,106],[100,262,28,6],[236,262,28,6],[27,248,4,4],[187,248,4,4],[322,184,98,5]],people:[[120,182,6,'up'],[132,184,1,'up'],[290,196,10,'up'],[300,260,3,'right'],[160,272,11,'left']],lit:[[0,20,480,100],[356,66,32,90],[56,110,52,14],[246,118,52,14]],lamps:[[180,98,24,0xffffff,.8],[307,110,34,0xffffff,.8],[240,90,60,cool,.6],[374,100,40,0xc8ffe8,.9],[120,276,60,warm,.7],[260,276,60,warm,.7],[84,124,40,0xff8060,.7],[274,132,40,0xff8060,.7],[40,252,30,0xfff6d0,.9],[200,252,30,0xfff6d0,.9]]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,86,'#6aa0d0','#cfe2ea',8);
    // The city across the bay: towers in their greys, windows, Tokyo Tower orange among them.
    for(let x=0;x<480;){const w=8+k.int(16),h=10+k.int(34);r(x,86-h,w-1,h,['#8ea2ae','#9aaeb6','#7f96a4','#a8b4bc'][k.int(4)]);r(x+w-3,86-h,2,h,'#00000020');k.shine(()=>{for(let y=88-h;y<84;y+=4)for(let wx=x+1;wx<x+w-2;wx+=3)if(k.int(3))r(wx,y,1,1,'#f0e0a0')});x+=w}
    k.shine(()=>{for(let y=52;y<86;y++){const w=Math.max(.5,(y-52)*.16);r(120-w,y,w*2,1,y%6<3?'#e8642c':'#f4f0e8')}r(116,66,8,2,'#e8642c');r(117,74,6,1,'#f4f0e8');r(119,46,2,6,'#e8642c')});
    // The bay: blue, deeper towards us, the city and the bridge again in it.
    gradient(r,0,86,480,64,'#5a98b4','#3e7c98',5);
    k.mirror(0,40,480,46,86,.28);
    // The Rainbow Bridge crossing the bay away from us, as its street shows it: from the near shore off the right edge, high overhead, to the far shore on the left, its piers, twin-legged towers, two decks, cables and hangers smaller as they go.
    const far=40,t=(x:number)=>(x-far)/440,deckY=(x:number)=>82-t(x)*30,seaY=(x:number)=>88+t(x)*40,topY=(x:number)=>78-t(x)*70;
    k.shine(()=>{r(32,80,10,7,'#d8d8d0');for(const x of [100,240,420]){const w=2+t(x)*4;r(x,deckY(x),w,seaY(x)-deckY(x),'#d8d8d0');r(x+w-1,deckY(x),1,seaY(x)-deckY(x),'#b8b8b0')}
    for(const x of [176,300]){const w=2+t(x)*3,gap=w+2+t(x)*6,top=topY(x),h=seaY(x)-top;for(const lx of [x,x+gap]){r(lx,top,w,h,'#f2f2ea');r(lx+w-1,top,1,h,'#c8c8c0')}for(const f of [0,.3,.62])r(x,top+(deckY(x)-top)*f,gap+w,1+t(x)*3,'#f2f2ea');r(x,top,gap+w,1,'#ffffff');r(x-1,seaY(x)-3,gap+w+2,4,'#d8d8d0')}
    for(const [a,b,sag] of [[far,176,3],[178,300,19],[302,540,8]] as const){const y0=a===far?deckY(far):topY(a),y1=b===540?deckY(540)-2:topY(b);for(let x=a;x<=Math.min(b,479);x++){const q=(x-a)/(b-a),y=y0+(y1-y0)*q+sag*4*q*(1-q);r(x,y,1,1+t(x),'#f2f2ea');if(x%(4+Math.round(t(x)*4))===0&&deckY(x)>y)r(x,y,1,deckY(x)-y,'#dcdcd4')}}
    for(let x=far;x<480;x++){const th=1+t(x)*3,y=deckY(x);r(x,y,1,th,'#f2f2ea');r(x,y+th,1,th*1.6,'#c8ccd0');if(x%Math.round(5+t(x)*6)===0)r(x,y+th,1,th*1.6,'#9aa0a6');r(x,y+th*2.6,1,1,'#8a9096')}});
    for(const x of [100,176,240,300,420]){const w=2+t(x)*(x===176||x===300?12:4);for(let y=0;y<8+t(x)*16;y+=2)r(x+(y%4?1:0),seaY(x)+1+y,w,1,'#ffffff30')}
    k.shimmer(0,120,480,30,1.4);for(let i=0;i<110;i++)r(k.int(470),90+k.int(58),4+k.int(10),1,k.int(2)?'#ffffff28':'#00000020');
    // The houseboats, roofs hung with red lanterns.
    for(const [x,y] of [[60,128],[250,136]] as const){k.ell(x+22,y+6,26,3,'#00000040');r(x,y,44,6,'#6e4a34');r(x,y,44,1,'#8a6248');r(x+2,y-7,40,7,'#f0ead8');k.shine(()=>{for(let i=0;i<6;i++)r(x+4+i*7,y-6,4,4,'#e8b860');for(let i=0;i<7;i++)k.lantern(x+2+i*6,y-12,'#e8735a')});k.eaves(x+22,y-15,46,5,'#5a4a3a')}
    // Liberty on her two-tier white plinth on the deck out over the water.
    r(342,132,60,24,'#8a6240');for(let x=342;x<402;x+=5)r(x,132,1,24,'#6e4a30');r(342,132,60,1,'#a87a50');k.shade(362,156,26,3);
    r(358,130,28,24,'#e4e2da');r(358,130,28,2,'#f4f4ee');r(382,130,4,24,'#c8c6be');r(362,120,20,11,'#ecebe4');r(378,120,4,11,'#cfcdc6');r(360,118,24,2,'#f4f4ee');
    k.shine(()=>{r(358,130,28,24,'#e4e2da');r(362,120,20,11,'#ecebe4');r(366,96,12,22,'#6ea898');r(366,96,3,22,'#8ac0b0');r(375,96,3,22,'#4e8a7a');r(364,112,16,6,'#5e9888');r(369,90,6,7,'#7ab4a4');for(const [dx,dy] of [[-2,-2],[0,-4],[3,-5],[6,-4],[8,-2]] as const)r(370+dx,90+dy,1,3,'#8ac0b0');r(375,74,2,18,'#6ea898');r(374,70,4,4,'#f0d060');r(375,68,2,2,'#fff4c0');r(364,100,4,6,'#c8d8d0')});
    // The beach: the wet sand at the water's line, the foam, the dry sand above, footprints.
    for(let y=148;y<214;y++)r(0,y,480,1,y<160?'#c8b894':'#e0d4ae');for(let x=0;x<480;x+=6){const y=150+Math.sin(x/28)*3;r(x,y-2,6,2,'#a6c8d4');r(x,y,6,3,'#f2eee0')}for(let i=0;i<220;i++)r(k.int(480),160+k.int(54),2,1,k.int(2)?'#cfc29a':'#ece4c8');for(let i=0;i<20;i++){const x=100+i*9,y=196-i*1.5;r(x,y,2,1,'#c4b48c');r(x+4,y+2,2,1,'#c4b48c')}
    // The tide's line of weed and shells, gulls on the wet sand, towels and a sandcastle, the volleyball court taped out with its net; a windsurfer and a paddler on the bay.
    for(let x=0;x<480;x+=3)if(k.int(3))r(x,158+Math.round(Math.sin(x/28)*3)+k.int(2),2,1,k.int(4)?'#8a7a52':'#f4ece0');
    for(const [x,y] of [[70,154],[84,156],[176,153],[268,155],[452,154]]){r(x,y,4,2,'#f6f6f2');r(x+3,y-1,2,2,'#f6f6f2');r(x+5,y,1,1,'#e0a030');r(x,y+2,1,1,'#00000030');r(x-1,y,2,1,'#8a9098')}
    for(const [x,y,c] of [[44,186,'#e0483a'],[150,200,'#34b6e0'],[250,204,'#f0c030']] as const){r(x+1,y+1,16,9,'#00000018');r(x,y,16,9,c);for(let i=2;i<16;i+=4)r(x+i,y,2,9,'#f4f4ec');r(x+12,y-3,6,4,'#8a6a48')}
    r(196,196,10,6,'#d4c498');r(198,192,6,5,'#dccca0');r(200,188,2,4,'#dccca0');r(197,191,2,2,'#c4b48c');r(203,191,2,2,'#c4b48c');r(201,186,2,2,'#e0483a');r(194,202,14,1,'#00000020');
    r(323,167,96,41,'#ffffff18');for(const [x,y,w,h] of [[322,166,98,1],[322,208,98,1],[322,166,1,42],[419,166,1,42]]){r(x,y+1,w,h,'#00000018');r(x,y,w,h,'#fffaf0')}k.shade(322,190,98,2);for(const x of [322,418]){r(x,172,2,18,'#e8e6dc');r(x,172,1,18,'#ffffff')}r(324,174,94,7,'#ffffff50');for(let x=324;x<418;x+=3)r(x,174,1,7,'#f4f4ecb0');r(324,174,94,1,'#f4f4ec');r(324,180,94,1,'#f4f4ec');k.ell(352,200,3,3,'#f4f0e0');r(351,198,2,1,'#e0483a');r(352,201,2,1,'#3a78c2');
    for(const [x,y,c] of [[206,122,'#e86aa0'],[428,116,'#f0c030']] as const){r(x-5,y+12,12,2,'#f4f4ec');for(let i=0;i<12;i++)r(x,y+i,1+Math.round(i*.6),1,i%4?c:'#f4f4ec');r(x-1,y,1,13,'#3a3e40');r(x-3,y+7,2,5,'#2a2e30');for(let i=0;i<4;i++)r(x-10-i*5,y+14,4,1,'#ffffff80')}
    r(120,134,14,2,'#f4f0e0');r(126,126,2,8,'#2a4a6a');r(126,124,2,2,'#e8c8a0');k.line(122,128,131,136,'#6a5240');
    for(const [x,y] of [[60,100],[300,92],[330,98]]){r(x,y,2,1,'#ffffff');r(x+2,y+1,1,1,'#ffffff');r(x+3,y,2,1,'#ffffff')}
    // The lawn and its pines, the boardwalk along the buildings, its rail, benches, lamps.
    k.lawn(0,214,480,40,'#7fa266','#6e925a');for(let i=0;i<200;i++)r(k.int(480),214+k.int(40),1,2,'#94b67a');r(0,214,480,2,'#a8c88a');for(const x of [72,150,300])k.pine(x,246,x===150?-1:1);
    r(0,254,480,66,'#a87a50');for(let y=254;y<320;y+=6){r(0,y,480,1,'#8a6240');r(0,y+1,480,1,'#b88a5e')}for(let y=254;y<320;y+=6)for(let x=(y*7)%40;x<480;x+=40+(y%3)*8)r(x,y,1,6,'#8a6240');r(0,254,480,2,'#6e4a30');
    for(const x of [30,190]){r(x-2,226,2,26,'#4a4a48');r(x-4,224,6,3,'#f6f0dc')}for(const x of [100,236]){k.shade(x,268,30,2);r(x,262,28,4,'#7a5a3a');r(x,262,28,1,'#9a7a54');r(x+2,266,2,3,'#3a3a38');r(x+24,266,2,3,'#3a3a38')}
    // The television building: its grid of open frames, the titanium ball held in it.
    // Seen as the street's near buildings are: its flat roof from above, then its front going down out of the picture. Two towers of framed glass, the open frame between them, the sky corridors across it and the ball hung there, lit from the top left, its shadow on the frame behind.
    r(330,214,150,10,'#dfe2e4');r(330,214,150,1,'#f4f6f6');r(330,223,150,2,'#8a9096');for(let x=340;x<480;x+=24){r(x,216,10,5,'#b8bcc0');r(x,216,10,1,'#e8eaec')}
    r(330,225,150,95,'#c9ccd0');for(const [x0,x1] of [[330,372],[440,480]] as const){for(let x=x0;x<x1;x+=14){r(x,225,3,95,'#9ea4aa');r(x,225,1,95,'#e0e4e8')}for(let y=235;y<320;y+=16){r(x0,y,x1-x0,3,'#9ea4aa');r(x0,y,x1-x0,1,'#e0e4e8')}for(let x=x0+3;x<x1-2;x+=14)for(let y=227;y<318;y+=16)r(x,y+(y>227?11:0)-(y>227?11:0),11,8,'#7a94a8'),r(x,y,11,2,'#a8c0d0')}
    r(372,225,68,95,'#3e4c58');for(let x=372;x<440;x+=17){r(x,225,2,95,'#7e8890');r(x,225,1,95,'#aab2b8')}for(let y=241;y<320;y+=22){r(372,y,68,2,'#7e8890');r(372,y,68,1,'#aab2b8')}
    for(const y of [232,296]){r(372,y,68,9,'#b8c4cc');r(372,y,68,1,'#eef2f4');r(372,y+8,68,1,'#7e8890');for(let x=374;x<440;x+=6)r(x,y+3,4,3,'#7a94a8')}
    k.ell(410,268,25,25,'#1e282e90');k.ell(406,263,25,25,'#6c7278');k.ell(405,262,24,24,'#a4aab0');k.ell(401,257,18,18,'#c4c8cc');k.ell(396,252,9,9,'#e4e8ea');k.ell(394,250,4,4,'#fbfcfc');
    for(let a=-2;a<=2;a++){const y=262+a*8,w=Math.sqrt(Math.max(0,24*24-(a*8)**2));r(405-w,y,w*2,1,'#7c828850')}for(const dx of [-12,0,12]){const h=Math.sqrt(24*24-dx*dx);r(405+dx,262-h,1,h*2,'#7c828840')}
    r(372,225,1,95,'#2a343c');r(439,225,1,95,'#2a343c');
  }},
  // Kinkaku-ji: the Mirror Pond in everything, the pavilion on its far shore doubled in it, the crane and turtle islands with their pines; the way runs one way round, the viewing platform at the foot.
  kinkaku:{layout:{start:[32,296],exit:[424,226],camera:[230,262],people:[[196,278,2,'up'],[272,282,8,'up'],[284,284,12,'left'],[410,292,5,'up']],roam:40,solids:[...kyokoRows,[0,0,480,96],[0,251,400,7],[448,251,32,7],...kinkakuPines.map(([x,y]):Box=>[x-3,y-3,8,5])],stands:kinkakuPines.map(([x,y]):Box=>[x-28,y-44,58,50]),lamps:[[310,84,60,0xffd878,.8],[310,150,50,0xffd878,.4,.6],[150,262,44,warm,.6],[370,262,44,warm,.6]]},draw:k=>{
    k.lawn(0,0,480,320,'#7f9a66','#6e8a5a');k.ground(0,246,480,74,'#cfc6a8','#bdb495');k.ground(402,220,44,28,'#cfc6a8','#bdb495');
    k.r(0,0,480,96,'#b7d4dc');k.ridge(96,[[70,44,70],[215,26,70],[420,40,85]],'#9dbcc0','#92b2b6',1);k.ridge(96,[[150,34,75],[345,24,60],[475,22,55],[5,20,45]],'#7fa596','#73998c',3);k.ridge(96,[[55,22,75],[255,19,80],[405,24,60]],'#5f8a6c','#527d62',5);k.forest(0,86,480,14,greens[1]);
    for(let y=88;y<256;y++){const [l,r]=kyoko(y);if(r>l){k.r(l-4,y,r-l+8,3,'#4a6a40')}}for(let y=89;y<255;y++){const [l,r]=kyoko(y);if(r>l){k.r(l,y,r-l,1,blend('#3e7684','#4f8795',Math.min(1,(y-89)/60)));k.r(l,y,5,1,'#2e5a64');k.r(r-5,y,5,1,'#34626c')}}
    // In the water along the far shore, the wooded hills again, broken by the breeze; lily pads.
    const pond=(paint:()=>void)=>{k.g.save();k.g.beginPath();for(let y=89;y<255;y++){const [l,r]=kyoko(y);if(r>l)k.g.rect(l,y,r-l,1)}k.g.clip();paint();k.g.restore()};
    pond(()=>{k.mirror(0,66,480,30,96,.35);k.shimmer(0,96,480,34,1.2)});for(const [x,y] of [[120,200],[132,206],[380,150],[392,146],[200,236],[330,236]] as const){k.ell(x,y,3,2,'#4a7a48');k.r(x-1,y-1,2,1,'#6a9a5a')}
    // The shore: stones set all round, moss over them, clipped shrubs leaning out.
    for(let y=90;y<254;y+=4+k.int(3)){const [l,r]=kyoko(y);if(r-l<8)continue;for(const x of [l,r]){const w=5+k.int(7);k.r(x-w/2+1,y+3,w,1,'#00000040');k.rock(x-w/2,y-2,w,4+k.int(3),['#7a7a70','#8e8e84','#6a6a62'][k.int(3)]);if(k.int(3)===0)softCrown(k.r,k.rand,x+(x===l?-6:6),y-2,5,3,greens[2])}}
    for(let x=60;x<420;x+=5+k.int(6)){const [l,r]=kyoko(253);if(x<l||x>r)continue;const w=5+k.int(7);k.rock(x,250,w,4+k.int(3),['#7a7a70','#8e8e84'][k.int(2)])}
    // The pavilion: natural wood below, gold leaf over the two floors above, the phoenix on top.
    const pavilion=()=>{
    k.r(262,108,96,4,'#7a5a3a');k.r(274,92,72,17,'#ece4cf');for(let x=276;x<346;x+=7)k.r(x,92,2,17,'#5a4634');k.eaves(310,84,92,8,'#5a4a34','#00000030','#2c2418');
    k.r(280,68,60,16,'#e4b83c');for(let x=282;x<338;x+=7)k.r(x,70,2,12,'#b88a20');k.r(280,74,60,2,'#fbe68a');k.eaves(310,60,78,8,'#6a5a34','#00000030','#c89a28');
    k.r(292,46,36,14,'#f0c848');for(let x=294;x<326;x+=6)k.r(x,47,2,12,'#b88a20');k.eaves(310,38,56,8,'#6a5a34','#00000030','#c89a28');k.r(308,33,4,6,'#fbe68a');k.r(305,31,10,2,'#fbe68a');
        };
    pavilion();k.reflect(112,.5,pavilion);k.ripples(250,114,120,78);
    for(const [x,y,rx,ry] of [[160,150,34,12],[92,186,18,7],[372,196,26,9],[230,212,10,4]] as const){k.ell(x,y+2,rx,ry,'#3a6a74');k.ell(x,y,rx,ry,'#6a8a58');k.ell(x-3,y-2,rx-6,ry-3,'#7fa266');k.rock(x+rx-10,y+2,10,5);k.rock(x-rx+2,y,8,5)}
    k.pine(160,150);k.pine(150,144,-1);k.pine(92,184);k.pine(372,194,-1);for(const [x,y] of [[210,186],[290,226],[60,150],[420,160]])k.rock(x,y,10,6,'#7e7e74');
    k.above(()=>{for(const [x,y] of kinkakuPines)k.pine(x,y,x>240?-1:1)});
    // The railing all along the pond's side of the gravel, open only before the way out.
    k.stones(176,252,128,24,'#b0a890','#98917b');k.fence(0,250,400,'#5a4634','#8a6c50');k.fence(448,250,32,'#5a4634','#8a6c50');
  }},
  // Ginkaku-ji: the raked sea of silver sand, raised, and beside it the round flat-topped moon-viewing cone, the dark Kannon hall by its pond, the abbot's hall, the moss; the hedge lane along the foot.
  ginkaku:{layout:{start:[440,262],exit:[446,226],camera:[126,236],solids:[[0,0,480,86],[66,44,104,74],[165,104,276,122],...oval(84,176,62,38),[0,288,480,32]],lamps:[[120,110,44,warm,.6],[300,170,120,0xdde8ff,.5,.6],[352,94,44,paper,.6]]},draw:k=>{
    const {r}=k;k.lawn(0,0,480,320,'#5a8248','#4a7240',false);for(let i=0;i<500;i++){const x=k.int(480),y=86+k.int(200);k.ell(x,y,2+k.int(3),1+k.int(2),['#6a9250','#4e7640','#7aa25a'][k.int(3)])}k.forest(0,0,480,70,greens[0]);
    // Maples and pines over the moss, trunks and all.
    for(const [x,y,pal] of [[20,100,greens[2]],[460,120,turning],[456,190,greens[1]],[20,240,['#5a3a26','#8a4a2c','#b8683a','#d89050']],[210,258,greens[2]]] as const){k.shade(x-8,y+16,22,3);k.line(x,y+16,x-3,y,'#5c4636',3);k.line(x-3,y+2,x-9,y-6,'#5c4636',2);softCrown(r,k.rand,x-6,y-8,14,10,pal);softCrown(r,k.rand,x+4,y-4,12,8,pal)}
    // The pond: mossy banks, stones set round it, the hall and the pines again in the dark water.
    k.ell(84,178,66,42,'#3e5a36');k.ell(84,176,62,38,'#2e5a5c');k.inside(84,176,60,36,()=>{r(20,138,130,76,'#2e5a5c');k.reflect(120,.4,()=>{r(80,92,80,26,'#5a4a38');r(94,60,52,22,'#3e3228');k.eaves(120,82,100,10,'#46484a');k.eaves(120,50,76,10,'#46484a')});k.ripples(24,140,120,72)});
    for(const a of [.3,.42,.55,1.4,1.5,2.3,2.9,3.05,3.9,4.6,4.7,5.6]){const x=84+Math.cos(a)*(60+k.int(5)),y=176+Math.sin(a)*(36+k.int(4)),w=6+k.int(10);k.shade(x-w/2,y+4,w+2,2);k.rock(x-w/2,y-3,w,4+k.int(5),['#7a7a70','#8e8e84','#6a6a62'][k.int(3)]);if(k.int(2))r(x-w/2+1,y-4,w-2,1,'#5f8a4e')}
    k.rock(60,160,16,9);k.rock(100,186,12,7,'#7a7a70');k.rock(70,190,8,5);k.pine(82,166);k.pine(136,196,-1);
    k.ground(140,226,340,60,'#c9c0a6','#b5ac92');k.ground(0,226,140,60,'#c9c0a6','#b5ac92',200);for(let i=0;i<1500;i++)r(k.int(480),226+k.int(60),1,1,['#b4ab92','#d8d0b8'][k.int(2)]);
    // The sea of silver sand, seen from above and before it: raised, its top raked in bands of waves, its cut front face standing over the gravel.
    const sx=165,sw=196;k.shade(sx+3,224,sw,4);r(sx,104,sw,110,'#a8a69a');r(sx+3,107,sw-6,105,'#d9d7cb');for(let b=0,y=109;y<210;b++,y+=14){const h=Math.min(14,212-y);if(b%2){r(sx+3,y,sw-6,h,'#e3e1d6');r(sx+3,y,sw-6,1,'#bcbaae');r(sx+3,y+h-1,sw-6,1,'#fbfaf4');for(let x=sx+5;x<sx+sw-5;x+=7)r(x+(y%3),y+3+((x*7)%8),2,1,'#c2c0b4')}else for(let yy=y+1;yy<y+h;yy+=4)for(let x=sx+3;x<sx+sw-3;x+=2){const off=Math.round(Math.sin((x+yy*.7)/9)*1.5);r(x,yy+off,2,1,'#aeac9f');r(x,yy+off+2,2,1,'#ecebe1')}}r(sx+3,107,sw-6,1,'#ffffff');r(sx+sw-5,107,2,105,'#bab8ac');for(let i=0;i<60;i++)r(sx+5+k.int(sw-10),110+k.int(100),1,1,'#ffffff');
    r(sx,212,sw,12,'#c6c4b8');r(sx,212,sw,1,'#fbfaf4');r(sx,213,sw,1,'#e3e1d6');for(let x=sx+2;x<sx+sw;x+=4)r(x,215,1,7,'#b6b4a8');r(sx,221,sw,3,'#a09e92');r(sx+sw-2,212,2,12,'#a09e92');
    // The moon-viewing cone beside it, on its own bed of sand: round, heaped and cut flat, raked in rings down its sides, lit on the left, its shadow on the right.
    const cx=402;k.ell(cx,207,46,16,'#a8a69a');k.ell(cx,206,44,14,'#d9d7cb');for(let i=0;i<40;i++)r(cx-38+k.int(76),197+k.int(18),2,1,k.int(2)?'#c2c0b4':'#f4f2e8');k.ell(cx+16,208,34,9,'#00000030');
    for(let i=46;i>=0;i--){const rx=13+21*i/46,ry=4+7*i/46,y=160+i;k.inside(cx,y,rx,ry,()=>{r(cx-rx,y-ry,rx*2+1,ry*2+1,i%4===3?'#c4c2b6':'#e2e0d4');r(cx-rx,y-ry,rx*.55,ry*2+1,i%4===3?'#d8d6ca':'#f2f0e6');r(cx+rx*.4,y-ry,rx*.6+1,ry*2+1,i%4===3?'#aeac9f':'#c8c6ba')})}
    k.ell(cx,161,13,4,'#aeac9f');k.ell(cx,160,13,4,'#f4f2e8');k.ell(cx,160,11,3,'#fbfaf4');r(cx+4,161,7,1,'#e3e1d6');
    // The Kannon hall: white shoji below between dark posts, the bell windows in the dark upper storey, shingle roofs, the bronze phoenix.
    r(80,92,80,26,'#3a2e24');for(let x=82;x<156;x+=12){r(x,96,10,20,'#ece8dc');for(let yy=98;yy<116;yy+=4)r(x,yy,10,1,'#b8b0a0');r(x+5,96,1,20,'#b8b0a0')}r(80,92,80,2,'#2a2018');r(112,100,16,18,'#2a2320');r(78,116,84,3,'#6a5a48');k.eaves(120,82,100,10,'#3e3e3a');
    r(94,60,52,22,'#3e3228');for(const [x,rx] of [[120,6],[104,4],[136,4]] as const){k.ell(x,72,rx+1,8,'#1e1814');r(x-rx-1,74,rx*2+2,5,'#1e1814');k.ell(x,72,rx,7,'#b8b0a0');r(x-rx,74,rx*2,4,'#b8b0a0');r(x,66,1,12,'#6a5a48');r(x-rx,72,rx*2,1,'#6a5a48')}r(92,80,56,2,'#6a5a48');k.eaves(120,50,76,10,'#3e3e3a');r(118,44,4,6,'#b8a060');r(115,43,10,2,'#b8a060');r(117,41,2,2,'#d8c080');
    k.hall(310,52,180,18,28,'#d6ccb4','#54504a');
    // The hedge lane along the foot: the tall clipped hedge on its stone footing, the bamboo fence before it.
    r(0,288,480,32,'#2f5a42');for(let x=0;x<480;x+=5){r(x,288,4,3,'#4f8058');r(x+1,292+k.int(10),2,1,'#3e6a4c')}r(0,306,480,14,'#8a8676');for(let x=0;x<480;x+=10)r(x+k.int(3),308+k.int(6),8,5,['#9a9686','#7a7666','#a8a494'][k.int(3)]);for(let x=0;x<480;x+=3)r(x,298,2,10,'#a8a060');r(0,300,480,1,'#6a6438');r(0,304,480,1,'#6a6438');
  }},
  // Daitoku-ji: the great vermilion Sanmon at the end of a stone lane, ochre earthen walls under their tiles either side, the lane's flagstones down the middle of grey gravel and its white lamps; over the wall the abbot's Zen garden of raked gravel swirling round its rocks and moss islands, clipped pines; below, a sub-temple's moss garden, an old pine on its props.
  daitoku:{layout:{start:[452,212],exit:[434,186],camera:[150,196],solids:[[0,0,96,190],[140,0,340,186],[0,234,480,86],[60,0,120,118]],people:[[300,206,13,'left'],[110,150,4,'up']],lamps:[[118,110,40,paper,.7],[300,206,70,warm,.5,.5],[118,200,60,warm,.5],[60,200,30,0xfff6d0,.8],[260,200,30,0xfff6d0,.8],[380,200,30,0xfff6d0,.8]]},draw:k=>{
    const {r}=k;k.ground(0,0,480,320,'#c9c2ab','#b5ae97');k.forest(0,0,480,70,greens[2]);for(const [x,y] of [[30,120],[34,170],[200,86]])k.pine(x,y);
    k.stones(96,110,44,84,'#b4ae9a','#9c9684');
    // The lane: grey gravel, the flagstones down its middle laid unevenly, kerbs of granite.
    r(0,186,480,48,'#9a968a');for(let i=0;i<3500;i++)r(k.int(480),186+k.int(48),1,1,['#8a867a','#aeaa9e','#7e7a6e','#b8b4a8'][k.int(4)]);
    for(let y=200;y<222;y+=5){let x=-k.int(10);while(x<480){const w=6+k.int(10);r(x+1,y+1,w-1,4,['#c0bcae','#b2ae9e','#c8c4b6','#a8a494'][k.int(4)]);r(x+1,y+1,w-1,1,'#d4d0c2');x+=w}}r(0,199,480,1,'#7a766a');r(0,222,480,1,'#7a766a');
    // The garden: the abbot's veranda, raked gravel in straight lines, swirled round each island of moss and its stones, clipped shrubs against the wall.
    r(146,78,334,8,'#6a5a48');r(146,62,334,16,'#d6ccb4');for(let x=150;x<476;x+=16)r(x,62,3,16,'#4a3a2c');k.eaves(312,46,344,16,'#54504a');r(146,84,334,92,'#e4e0d0');for(let y=86;y<176;y+=3)r(146,y,334,1,'#cdc9b8');r(146,84,334,2,'#8a7a5a');
    for(const [x,y,w,h] of [[220,124,30,16],[340,110,22,12],[410,142,34,18]] as const){for(let i=4;i>0;i--){k.ell(x+w/2,y+h/2+2,w/2+i*6,h/2+i*3,'#cdc9b8');k.ell(x+w/2,y+h/2+2,w/2+i*6-1,h/2+i*3-1,'#e4e0d0')}k.ell(x+w/2,y+h/2+1,w/2+1,h/2+1,'#4e6e3a');k.ell(x+w/2,y+h/2,w/2,h/2,'#5f8a4e');for(let n=0;n<w;n++)r(x+k.int(w),y+2+k.int(h-3),1,1,'#7aa260')}
    for(const [x,y,w,h,c] of [[226,112,10,20,'#7e7c72'],[238,120,14,12,'#6c6a62'],[346,102,8,16,'#7e7c72'],[416,130,12,22,'#6c6a62'],[430,140,10,12,'#8a887e']] as const){k.shade(x,y+h,w+3,2);k.rock(x,y,w,h,c);r(x+1,y+h*.3,2,h*.5,'#ffffff30')}
    for(const x of [160,190,460])softCrown(r,k.rand,x,166,10,6,greens[0]);k.pine(300,136);k.pine(372,166,-1);
    k.wall(140,172,340,14,'#c9a272');r(140,180,340,6,'#8a8070');for(let x=140;x<480;x+=8)r(x+k.int(3),181,5,4,'#9a9080');
    r(140,186,340,2,'#00000030');k.wall(0,172,96,14,'#c9a272');r(0,180,96,6,'#8a8070');
    // The Sanmon, before the garden's end.
    k.gate(118,114,108,'#a8402f','#4d5a5c',24);
    // The lane's white lamps.
    for(const x of [60,260,380]){k.shade(x-1,232,6,2);r(x,204,2,30,'#e8e6de');r(x+2,204,1,30,'#b8b6ae');r(x-2,198,6,7,'#f4f2ea');r(x-3,196,8,2,'#3a3a38');r(x-1,200,4,3,'#fff4c0')}
    // The sub-temple's wall and gate, and its moss garden: clipped azaleas, an old pine on its props.
    k.lawn(0,234,480,86,'#4e7a40','#3e6a36',false);for(let i=0;i<600;i++)r(k.int(480),256+k.int(64),1,1,'#6a9a50');
    k.wall(0,240,480,16,'#c9a272');r(0,250,480,6,'#8a8070');r(286,226,50,30,'#3a2c20');r(296,234,30,22,'#262019');k.eaves(311,216,70,12,'#4b5456');
    r(300,262,180,58,'#e0dcce');for(let y=264;y<320;y+=3)r(300,y,180,1,'#ccc8b8');for(let i=0;i<9;i++){const x=200+i*24+k.int(6),y=300-i*4+k.int(4);k.ell(x,y+1,7,4,'#4a4a42');k.ell(x,y,7,4,'#8a887e');k.ell(x-1,y-1,5,2,'#a8a69c')}for(const [x,y] of [[40,290],[180,300],[400,296],[460,280]] as const)softCrown(r,k.rand,x,y,14,8,greens[0]);for(const [x,y] of [[110,312],[250,306]] as const){k.shade(x-12,y,40,3);k.line(x,y,x+8,y-20,'#5a4034',4);k.line(x+8,y-20,x+40,y-26,'#5a4034',3);for(const [px,py] of [[x+24,y-24],[x+36,y-26]] as const)r(px,py,2,y-py,'#8a7a5a');softCrown(r,k.rand,x+12,y-30,14,6,pines);softCrown(r,k.rand,x+34,y-32,12,5,pines)}
  }},
  // Kenkun-jinja, Oda Nobunaga's shrine on Funaoka hill: the stone stairs up through the great bare torii to the precinct among the cedars, the worship hall of plain cypress under its bark roof, hung with the white curtain and the banners of the Oda crest;
  // the stone of the Atsumori verse and the water basin on the left, the little vermilion Inari shrine behind its torii and foxes on the right, the stone fence along the edge.
  kenkun:{layout:{start:[240,308],exit:[152,290],camera:[292,142],solids:[[0,0,480,112],[0,0,64,320],[416,0,64,320],[64,208,134,14],[282,208,134,14],[0,222,198,64],[282,222,198,64],[0,286,150,34],[330,286,150,34],[80,112,40,48],[76,166,40,32],[348,112,58,42],[355,182,8,5],[389,182,8,5]],
    over:[[184,222,112,22],[192,244,6,36],[282,244,6,36],[348,148,56,20],[356,168,6,12],[390,168,6,12],[64,198,134,20],[282,198,134,20]],people:[[230,128,6,'up'],[334,194,1,'right']],lamps:[[240,98,56,paper,.7],[376,140,36,warm,.6],[240,254,44,warm,.4],[96,186,30,warm,.5],[196,104,24,0xfff6d0,.7],[284,104,24,0xfff6d0,.7]]},draw:k=>{
    const {r}=k;k.forest(0,0,480,320,greens[1]);for(const [x,y] of [[34,120],[450,116],[30,190],[452,196],[40,262],[444,268],[110,300],[370,304]])k.cedar(x,y,64);
    // The precinct's gravel, the flagstones from the head of the stairs to the hall.
    k.ground(64,108,352,112,'#c9c2ab','#b5ae97');for(let i=0;i<1400;i++)r(64+k.int(352),108+k.int(112),1,1,['#b0a994','#dcd6c2','#a8a18c'][k.int(3)]);k.stones(222,112,36,110,'#b2ae9c','#9a9482');
    // The worship hall: cypress left plain, the curtain of the Oda crest under its eaves, the sacred rope and its paper streamers, the bell rope, the offering box on the steps; a lantern either side.
    k.hall(240,40,180,24,44,'#8a6c50','#4a4038','#4a3626','#241c16');r(162,66,156,8,'#f4f2ea');r(162,73,156,1,'#c8c4b8');for(let x=176;x<312;x+=26){k.ell(x+2,70,3,3,'#2a2622');r(x+1,69,2,2,'#e0c060')}
    r(216,78,48,2,'#d8c890');r(216,80,48,1,'#a89860');for(const x of [220,232,246,258])r(x,80,3,5,'#f8f8f0');r(239,72,2,30,'#c8452e');r(239,72,1,30,'#e8735a');
    r(204,108,72,4,'#b2ae9c');r(204,108,72,1,'#ccc8b6');r(228,100,24,8,'#5a4030');r(228,100,24,1,'#7a5a40');for(let x=230;x<252;x+=4)r(x,102,2,5,'#2a2018');for(const x of [196,280])k.stoneLantern(x,90);
    for(const x of [142,330]){r(x,52,1,58,'#d8d4c8');r(x+1,53,9,1,'#d8d4c8');r(x+1,54,9,40,'#f4f2ea');r(x+1,54,1,40,'#ffffff');k.ell(x+5,60,3,3,'#2a2622');r(x+4,59,2,2,'#e0c060');for(const [n,ch] of [...'建勲神社'].entries())k.text(x+3,66+n*6,ch,'#2a2622',false);r(x-1,108,3,2,'#6a6a62')}
    // The stone of the Atsumori verse, its lines cut down its face; the water basin under its little roof.
    k.shade(84,158,34,3);r(82,154,36,5,'#9a968a');r(82,154,36,1,'#b8b4a6');k.rock(86,116,28,40,'#7e7c72');r(88,118,3,34,'#ffffff24');for(const x of [94,100,106])for(let y=122;y<150;y+=4)r(x,y,1,3,'#4a4a44');
    k.shade(80,196,36,3);r(84,186,24,8,'#8a8a80');r(84,186,24,1,'#aaaaa0');r(86,187,20,3,'#6aa0b0');r(98,182,10,1,'#c8b070');for(const x of [80,110])r(x,176,2,22,'#5a4030');k.eaves(96,166,40,9,'#4a4038');
    // The Inari shrine: vermilion, its foxes on their pedestals, the torii before it on white stones.
    k.shade(360,150,36,3);r(358,146,36,5,'#9a968a');r(358,146,36,1,'#b8b4a6');r(362,128,28,18,'#c8452e');r(362,128,2,18,'#e8735a');r(371,134,10,12,'#262019');r(362,132,28,1,'#00000040');k.eaves(376,118,42,10,'#3e4640');
    for(const [x,flip] of [[350,1],[396,-1]] as const){k.shade(x-1,160,10,2);r(x,152,8,8,'#9a968a');r(x,152,8,1,'#b8b4a6');r(x+2,144,4,8,'#e8e6de');r(x+(flip>0?4:1),141,3,4,'#e8e6de');r(x+(flip>0?5:1),139,1,2,'#e8e6de');r(x+3,147,2,2,'#c8452e')}
    for(const x of [359,393]){k.shade(x-4,188,16,2);r(x-4,182,14,6,'#e4e0d6');r(x-4,182,14,1,'#f4f2ea')}k.above(()=>k.torii(376,186,44,38,'#d4502e','#2a2622'));for(const x of [356,390])r(x,180,6,4,'#2a2622');
    // The stairs down the hill and the landing at their foot: worn stone, kerbs either side.
    k.ground(150,286,180,34,'#c9c2ab','#b5ae97');r(198,220,84,66,'#8e8a7a');for(let y=222;y<286;y+=7){r(198,y,84,6,'#b2ae9c');r(198,y,84,1,'#ccc8b6');r(198,y+5,84,1,'#8e8a7a');for(let n=0;n<3;n++)r(200+k.int(78),y+2+k.int(3),3,1,'#a6a290')}r(194,220,4,66,'#6e7264');r(194,220,2,66,'#8a8e80');r(282,220,4,66,'#6e7264');r(198,250,84,8,'#a8a494');r(198,250,84,1,'#c4c0b0');
    // The stone fence along the precinct's edge, and the great bare torii at the foot of the stairs.
    k.above(()=>{for(const from of [66,284]){for(let x=from;x<from+130;x+=11){r(x,200,6,16,'#b4b0a2');r(x,200,2,16,'#d4d0c2');r(x+5,200,1,16,'#8a8678');r(x,199,6,2,'#c8c4b6')}r(from,206,130,2,'#9a968a');r(from,216,132,2,'#00000030')}
      k.torii(240,288,100,64,'#c8b896','#a8987a')});
  }},
  // Yasaka-jinja: in through the vermilion Nishi-romon, the dance stage in the middle of the gravel, its eaves hung all round with lanterns, the great hall behind; Maruyama park's weeping cherry to the right.
  yasaka:{layout:{start:[110,298],exit:[170,262],camera:[350,226],solids:[[0,0,480,106],[176,146,110,54],[56,270,38,30],[126,270,38,30],[0,270,56,50],[164,282,316,38],[400,206,60,24],[0,0,22,320],[326,238,12,8]],over:[[50,200,120,72]],people:[[200,226,11,'up'],[260,222,3,'left'],[320,176,7,'up'],[130,180,1,'right'],[380,140,12,'up']],lit:[[180,172,102,14]],lamps:[[230,180,90,paper,.9],[110,262,44,0xffb070,.7],[300,100,70,paper,.7],[430,180,50,0xffc8d0,.5]]},draw:k=>{
    const {r}=k;k.ground(0,0,480,320,'#cfc8b2','#bab39c');for(let i=0;i<2500;i++)r(k.int(480),k.int(320),1,1,['#bcb59e','#ddd6c2','#b0a992'][k.int(3)]);k.forest(0,0,480,60,greens[1]);
    // The court about the stage, laid in great flags; the way in from the gate.
    r(160,108,260,104,'#a8a496');for(let y=108;y<212;y+=9)for(let x=160+(y%18?0:12);x<420;x+=24)r(x,y,23,8,['#c0bcae','#b8b4a6','#c8c4b6','#b2ae a0'.replace(' ','')][k.int(4)]);k.stones(92,120,36,180,'#c0bcae','#a8a496');k.stones(92,120,68,16,'#c0bcae','#a8a496');
    // The hall behind: vermilion posts, white walls, its bark roof, lanterns along its front.
    k.hall(300,36,270,32,38,'#efe9d8','#5e5044','#c8402e');r(174,104,250,3,'#a8a294');for(let x=196;x<400;x+=10)k.lantern(x,84);
    // The stage on its stone base: open on all sides, vermilion posts, the heavy grey roof, the lanterns in three rows under its eaves, each with its giver's name; the low fence round it.
    k.shade(178,200,118,6);r(172,190,118,10,'#a8a294');r(172,190,118,2,'#c4beb0');r(172,198,118,2,'#7a7468');r(178,150,106,40,'#3a2c22');for(const x of [180,214,248,280])r(x,150,4,40,'#c8402e'),r(x,150,1,40,'#e06a50');
    for(let row=0;row<3;row++)for(let x=180;x<282;x+=7){const y=148+row*12;r(x+1,y-1,4,1,'#2a2320');r(x,y,6,9,'#f6efdc');r(x+1,y+1,1,7,'#fffaf0');r(x+2,y+3,2,4,'#2a2320');r(x+1,y+9,4,1,'#2a2320')}
    k.eaves(231,118,138,28,'#4e5458','#00000030','#2a2e30');r(206,112,50,8,'#3e4446');r(206,112,50,1,'#6a7072');
    for(const [x,w] of [[166,130]] as const){k.fence(x,196,w,'#5a4634','#8a6c50')}
    // The gate.
    k.above(()=>k.gate(110,272,112,'#d4502e','#4d5a5c',30));r(0,284,56,16,'#d4502e');r(164,284,316,16,'#d4502e');r(0,284,56,3,'#efe9d8');r(164,284,316,3,'#efe9d8');k.eaves(320,276,322,8,'#4d5a5c');k.eaves(26,276,62,8,'#4d5a5c');k.stones(0,300,480,20,'#9e9a8c','#88847a');
    // The weeping cherry, its branches trailing; stone lanterns; the offering box.
    k.shade(404,226,54);r(428,192,6,36,'#5c4636');softCrown(r,k.rand,431,176,30,18,blossom);for(let i=0;i<26;i++){const x=402+k.int(58),h=12+k.int(24);for(let y=0;y<h;y+=2)r(x,180+y,1,1,blossom[1+k.int(3)])}k.fence(400,216,60);for(const [x,y] of [[46,130],[50,200],[455,130],[456,260]])k.tree(x,y);
    for(const [x,y] of [[140,96],[440,96],[330,226]] as const)k.stoneLantern(x,y);
  }},
  // Higashiyama: Sannenzaka's stone slope doglegging up between two-storey wooden houses, tiled and latticed, shops open under their pent roofs, the steps across the way; the Yasaka pagoda rising dark at the top of the lane, the wooded hills behind.
  higashiyama:{layout:{start:[370,306],exit:[344,276],camera:[194,190],solids:[[0,0,180,320],[180,242,160,78],[400,190,80,130],[240,0,240,190],[180,0,60,104]],people:[[214,150,11,'down'],[228,212,7,'left'],[290,226,3,'left'],[362,250,1,'up'],[200,126,13,'up']],lit:[[0,56,180,264],[240,56,240,134],[400,190,80,130],[180,242,160,78]],lamps:[[210,92,40,paper,.5],[208,170,44,paper,.7],[300,216,44,paper,.7],[370,262,44,paper,.7],[212,226,30,paper,.5],[120,130,60,warm,.4],[300,180,70,warm,.5],[440,230,60,warm,.4],[100,250,60,warm,.4]]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,60,'#5a96d4','#c8e0ec',6);k.ridge(64,[[60,30,70],[180,22,60],[330,34,80],[460,26,60]],'#4a7a50','#3e6a46',2);k.ridge(64,[[120,14,60],[400,12,70]],'#3a6440','#2e5636',4);
    // The lanes: flagstones laid unevenly, granite kerbs, the gutter; steps across the slopes.
    const flags=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#8e877a');for(let yy=y;yy<y+h;yy+=7){let xx=x-k.int(12);while(xx<x+w){const fw=9+k.int(14),c=['#c0b8a2','#b4ac96','#c8c0aa','#aaa28e','#bcb49c'][k.int(5)];r(Math.max(x,xx)+1,yy+1,Math.min(fw-1,x+w-xx-1)-(xx<x?x-xx:0),6,c);r(Math.max(x,xx)+1,yy+1,Math.min(fw-1,x+w-xx-1)-(xx<x?x-xx:0),1,'#d4ccb6');xx+=fw}}};
    flags(180,98,60,144);flags(180,190,220,52);flags(340,190,60,130);for(const [x,y,w,h] of [[180,98,3,144],[237,98,3,92],[180,239,160,3],[340,239,3,81],[397,190,3,130]] as const)r(x,y,w,h,'#6a6458');
    for(const [x,y,w] of [[340,256,60],[340,290,60],[180,128,60],[180,160,60]] as const)for(let i=0;i<3;i++){r(x,y+i*5,w,3,'#c8c0aa');r(x,y+i*5,w,1,'#ddd6c2');r(x,y+i*5+3,w,2,'#6e675a')}
    // The pagoda at the head of the lane: five dark storeys, nearly as wide at the top as at the foot, its spire.
    k.ground(180,56,60,48,'#a8a290','#948e7c');k.pine(186,92);k.pine(236,90,-1);k.pagoda(210,104,5,60,'#5a4636','#3c4648',14);
    // The houses: each its own width, roof and noren; shops open along the lanes.
    const colors=['#3d5e7a','#a8402f','#d4a93a','#3a6a4c','#6a4a7a','#ece4cf'];
    r(0,56,180,264,'#3c4648');r(240,62,240,128,'#3c4648');r(400,190,80,130,'#3c4648');
    const row=(x0:number,x1:number,y:number,shop=true)=>{let x=x0;while(x<x1-20){const w=Math.min(x1-x,40+k.int(36));if(k.int(9)===0&&w<x1-x){r(x,y+4,w,36,'#566a4e');k.wall(x,y+28,w,12,'#c4b494','#4b5456');r(x+w/2-2,y+16,4,12,'#5c4636');softCrown(r,k.rand,x+w/2,y+12,Math.min(w/2-5,15),11,[greens[0],greens[1],turning,greens[2]][k.int(4)])}else machiya(k,x,y,w,colors[k.int(6)],shop&&k.int(2)?1+k.int(3):0);x+=w}};
    for(const y of [58,98,138,178,218,258])row(0,180,y,true);for(const y of [64,104,144])row(240,480,y,true);for(const y of [194,234,274])row(400,480,y,true);
    // The trees left standing between them: a maple turning, a pine over a wall.
    for(const [x,y,pal] of [[24,96,turning],[150,214,greens[1]],[468,140,['#5a3a26','#8a4a2c','#b8683a','#d89050']]] as const)softCrown(r,k.rand,x,y,14,10,pal);k.pine(462,108,-1);
    // Below the lower lane, more of the same houses, row behind row down the slope.
    r(180,242,160,78,'#3c4648');for(const y of [246,286])row(180,340,y,true);
    for(const [x,y] of [[200,232],[338,232],[394,286]] as const){r(x-1,y-12,2,12,'#3a2c20');k.lantern(x-3,y-20,'#f6efdc')}
  }},
  // Heian-jingu: the imperial court at five-eighths: the Otenmon behind, an expanse of white gravel, the Daigokuden's green roofs ahead, a corridor down each side to the White Tiger tower and the Blue Dragon's, the orange tree on the left before the hall and the cherry on the right (右近の橘, 左近の桜, named from the throne's side).
  heian:{layout:{start:[240,304],exit:[334,250],camera:[240,184],way:{at:[90,120],to:'heian-garden',ja:'神苑',sign:'GARDEN',en:'Shin-en garden'},solids:[[0,0,84,320],[396,0,84,320],[0,0,480,116],[0,276,216,44],[264,276,216,44],[150,128,22,14],[308,128,22,14],[96,226,40,8],[350,226,40,8],[122,164,12,6],[344,164,12,6]],over:[[155,206,170,72]],people:[[200,170,3,'up'],[290,190,11,'up'],[230,140,7,'up'],[380,250,5,'left']],lamps:[[240,106,70,paper,.7],[240,270,60,0xffb070,.6],[72,100,44,paper,.5],[408,100,44,paper,.5],[240,190,120,warm,.3,.5]]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,44,'#5a96d4','#c8e0ec',4);k.ridge(48,[[80,16,80],[300,12,90],[450,18,60]],'#5c8460','#507856',1);
    // The Shin-en wrapping the court on three sides, glimpsed over the corridors: its woods behind the great hall, cherries among them; the White Tiger pond and its irises on the west, the Blue Dragon pond and the stepping pillars of the Garyu-kyo on the east; moss, pines, a maple.
    k.lawn(0,44,480,232,'#6f9a5c','#5f8a4e');k.forest(0,44,480,50,greens[1]);for(const [x,y,w] of [[18,62,13],[64,52,11],[118,58,12],[380,54,12],[426,62,13],[468,56,11],[232,50,10]] as const)softCrown(r,k.rand,x,y,w,w*.75,blossom);for(const x of [8,472])k.cedar(x,104,60);
    for(const [cx,cy,rx,ry] of [[14,176,22,40],[466,184,24,44]] as const){k.ell(cx,cy+2,rx+2,ry+2,'#4a6a40');k.ell(cx,cy,rx,ry,'#3e7684');k.ell(cx,cy+4,rx-3,ry-6,'#4f8795');for(let i=0;i<14;i++){const a=i/14*Math.PI*2;k.rock(cx+Math.cos(a)*rx-3,cy+Math.sin(a)*ry-2,5+k.int(4),4,['#7a7a70','#8e8e84','#6a6a62'][k.int(3)])}for(let i=0;i<8;i++)r(cx-rx/2+k.int(rx),cy-ry/2+k.int(ry),5+k.int(6),1,'#ffffff30')}
    for(const [x,y] of [[8,160],[20,172],[12,190]] as const){k.ell(x,y,3,2,'#4a7a48');r(x-1,y-1,2,1,'#6a9a5a')}for(let i=0;i<7;i++){const x=24+k.int(10),y=146+i*9;r(x,y-5,1,5,'#3a6a3a');r(x-1,y-7,3,2,i%2?'#7a5ab0':'#f4f2f8')}
    for(let i=0;i<7;i++){const x=446+i*5,y=158+i*8;k.ell(x+1,y+2,4,2,'#2e5a64');k.ell(x,y,4,2,'#d0ccc0');k.ell(x-1,y-1,2,1,'#eeeae0')}
    k.pine(22,246);k.pine(458,256,-1);for(const [x,y,pal] of [[26,124,blossom],[456,122,turning],[30,214,greens[2]],[450,232,blossom]] as const){k.shade(x-8,y+13,20,3);r(x-2,y+2,4,12,'#5c4636');softCrown(r,k.rand,x,y,13,10,pal)}
    for(let i=0;i<10;i++){const left=i%2,x=left?6+k.int(34):440+k.int(34),y=110+k.int(160);softCrown(r,k.rand,x,y,4+k.int(3),3,greens[k.int(3)])}
    // The court: white gravel raked in lines, the flagged way down its middle.
    k.ground(80,100,320,176,'#e8e4d4','#d4d0c0',1200);for(let i=0;i<3400;i++)r(80+k.int(320),100+k.int(176),1,1,['#dcd8c8','#f4f2ea','#d0ccbc'][k.int(3)]);for(let y=150;y<270;y+=4){r(92,y,118,1,'#dedac8');r(270,y,118,1,'#dedac8')}
    k.stones(216,116,48,204,'#d8d2be','#c2bca8');
    // Each corridor, seen from over its roof: green tiles either side of the ridge, the vermilion posts and white walls of its open side to the court.
    for(const x of [44,400]){r(x,104,36,186,'#3d7a5e');for(let y=106;y<290;y+=5)r(x,y,36,1,'#2f6048');for(let tx=x+3;tx<x+36;tx+=4)r(tx,104,1,186,'#00000014');r(x,104,18,186,'#ffffff12');r(x+16,104,4,186,'#25443a');r(x+17,104,1,186,'#4d8a6e');r(x+20,104,16,186,'#00000014');r(x+(x<240?36:-4),104,4,186,'#00000020');r(x+(x<240?30:0),104,6,186,'#d4502e');for(let y=116;y<290;y+=14)r(x+(x<240?36:-2),y,3,10,'#efe9d8')}
    k.hall(240,44,300,34,36,'#d4502e','#3d7a5e','#a8402f','#efe9d8');r(106,112,268,6,'#efe9d8');r(106,116,268,2,'#b8b2a0');for(const x of [216,240,264])r(x,106,16,10,'#b8b2a0');r(238,50,4,2,'#d8b04a');r(152,44,8,5,'#d8b04a');r(320,44,8,5,'#d8b04a');
    for(const x of [72,408]){r(x-22,78,44,32,'#d4502e');for(let i=x-22;i<x+22;i+=9)r(i,78,3,32,'#a8402f');k.eaves(x,62,64,12,'#3d7a5e');k.eaves(x,46,42,10,'#3d7a5e');r(x-14,56,28,6,'#d4502e');r(x-1,40,2,6,'#d8b04a')}
    k.shade(150,142,22,2);r(159,120,4,20,'#5c4636');softCrown(r,k.rand,161,114,14,12,greens[2]);for(let i=0;i<8;i++)r(150+k.int(22),106+k.int(16),2,2,'#f0a030');k.fence(150,130,22);k.shade(308,142,22,2);r(317,120,4,20,'#5c4636');softCrown(r,k.rand,319,114,16,12,blossom);for(let i=0;i<14;i++)r(304+k.int(32),132+k.int(12),1,1,'#f6c7bb');k.fence(308,130,22);
    // The Otenmon and the wall either side of it, shutting the garden off from the forecourt.
    k.ground(0,292,480,28,'#cfc8b2','#bab39c');r(0,276,164,16,'#efe9d8');r(316,276,164,16,'#efe9d8');r(0,272,164,5,'#d4502e');r(316,272,164,5,'#d4502e');r(0,270,164,2,'#3d7a5e');r(316,270,164,2,'#3d7a5e');r(0,290,164,2,'#00000026');r(316,290,164,2,'#00000026');k.above(()=>k.gate(240,278,166,'#d4502e','#3d7a5e',46));k.stones(216,276,48,44,'#d8d2be','#c2bca8');
    // The way into the garden, through the corridor beside the White Tiger tower.
    r(70,126,12,38,'#a8402f');r(73,130,9,34,'#262019');k.eaves(76,118,22,8,'#3d7a5e');
    // The omikuji tied by the hundred to their racks, white as frost; the stone lanterns of the court.
    for(const x of [96,350]){k.shade(x,232,40,2);for(const px of [x,x+18,x+36])r(px,214,2,18,'#5a4030');r(x,214,38,2,'#5a4030');r(x,222,38,1,'#5a4030');for(let i=0;i<70;i++)r(x-2+k.int(42),206+k.int(18),2,2,['#f4f4ee','#e4e4dc','#ffffff'][k.int(3)])}
    for(const x of [124,346])k.stoneLantern(x,150);
  }},
  // The Shin-en: the garden wrapping the back of the Daigokuden, walked as it is. In by the South Garden (the winding path, the stream, Kyoto's first tram), up to the White Tiger pond and its tea house, over the Blue Dragon pond on the Garyu-kyo, the old Sanjo bridge's piers, along the Taihei-kaku over the Seiho pond,
  // round behind the Shobikan on its piles, the east hills beyond, and back along the shore by the pebble beach and the propped pine, where the photo was taken.
  'heian-garden':{layout:{width:760,height:430,start:[96,402],exit:[452,364],camera:[600,368],out:{to:'heian',at:[370,150],en:'To the shrine'},solids:fenced(760,430,gardenPath),over:[[426,128,292,22],[428,185,288,6],...Array.from({length:6},(_,i):Box=>[428+i*57,150,3,36])],lamps:[[296,226,70,paper,.6],[296,400,50,0xffb070,.5],[296,320,90,warm,.25,.5],[571,176,110,paper,.6,.6],[650,290,70,paper,.6],[170,78,44,paper,.5],[122,304,44,paper,.5],[398,152,44,paper,.5],[740,160,44,paper,.5],[752,338,44,paper,.5],[560,392,70,warm,.35],[300,118,70,warm,.3]]},draw:k=>{
    k.ground(0,0,760,430,'#4b7350','#5a8559',4000);
    k.ell(610,58,190,50,'#66926e');k.ell(690,74,120,40,'#567f60');k.forest(0,0,760,74,greens[0]);
    // The ponds, each with its bank.
    for(const [cx,cy,rx,ry] of ponds){k.ell(cx,cy,rx+4,ry+4,'#3e6a40');k.ell(cx,cy,rx+1,ry+1,'#5a6a5a');k.ell(cx,cy,rx,ry,'#3e7a88');k.ell(cx,cy-ry*.2,rx*.8,ry*.6,'#4d8796');k.inside(cx,cy,rx,ry,()=>k.ripples(cx-rx,cy-ry,rx*2,ry*2));for(let a=0;a<Math.PI*2;a+=.22+k.rand()*.3){const x=cx+Math.cos(a)*rx,y=cy+Math.sin(a)*ry,w=4+k.int(8);k.rock(x-w/2,y-3,w,4+k.int(4),['#7a7a70','#8e8e84','#6a6a62'][k.int(3)]);if(k.int(2))softCrown(k.r,k.rand,x+(k.int(2)?6:-6),y-2,4,3,greens[2])}}
    const [seiho]=ponds.slice(2),taihei=(deck=true)=>{
      // The gallery: its back wall and windows, a plank floor as deep as the way along it, the front posts and rail; its piles in the water.
      if(deck){k.r(428,148,288,22,'#3a2c20');for(let x=432;x<712;x+=16)k.r(x,152,11,12,'#a9c6c4');k.r(428,168,288,2,'#241a14');
        k.r(428,170,288,20,'#c4a47c');for(let y=173;y<190;y+=4){k.r(428,y,288,1,'#a98a64');for(let x=434+(y%8)*5;x<716;x+=46)k.r(x,y-3,1,3,'#a98a64')}k.r(428,170,288,3,'#8c7050');k.r(428,190,288,3,'#3f3024');for(let x=432;x<716;x+=20)k.r(x,193,3,12,'#2a2018')}
      for(let i=0;i<6;i++)k.r(428+i*57,150,3,42,'#3a2c20');k.r(428,185,288,2,'#6a5038');for(let x=430;x<716;x+=19)k.r(x,187,1,3,'#6a5038');
      k.eaves(571,132,292,16,'#7a6a55','#00000024','#3f3024');k.r(546,118,50,14,'#3a2c20');for(let x=548;x<594;x+=6)k.r(x,120,2,12,'#8a7560');k.eaves(571,110,74,10,'#7a6a55','#00000024','#3f3024');k.r(556,100,30,10,'#3a2c20');k.eaves(571,92,46,9,'#7a6a55','#00000024','#3f3024');k.r(570,86,2,6,'#d8b04a');k.r(567,84,8,2,'#d8b04a');k.r(572,82,4,2,'#d8b04a');
    },shobikan=()=>{k.hall(650,234,116,30,20,'#efeadc','#4a443c','#2a2320','#3a2c20');k.r(600,284,100,14,'#3a2a20');for(let x=602;x<698;x+=4)k.r(x,284,1,14,'#241a14');k.r(596,297,108,3,'#54402f');for(let x=600;x<702;x+=12)k.r(x,300,3,8,'#2a2018')};
    k.inside(...seiho,()=>{k.reflect(202,.34,()=>taihei(false));k.reflect(309,.5,shobikan)});
    shobikan();
    // The islets and water lilies.
    k.ell(300,96,24,9,'#5a8559');k.pine(300,102);k.ell(470,330,20,8,'#5a8559');k.pine(470,334,-1);for(const [x,y] of [[48,130],[66,172],[120,176],[250,160],[352,100],[440,250],[500,300]]){k.ell(x,y,4,2,'#5d9a62');k.r(x,y-1,2,1,'#f0c0d0')}
    // The stream down the South Garden, then the Blue Dragon's stepping stones, under the feet all the way across.
    for(let y=276;y<430;y+=2)k.r(146+Math.sin(y/26)*9,y,7,2,'#5d97a4');for(let y=280;y<430;y+=9)k.r(148+Math.sin(y/26)*9,y,3,1,'#a6d0d8');
    // The gravel of the paths.
    for(const [x,y] of gardenPath.filter((_,i)=>i%2===0))if(!onWater(x,y))k.ell(x,y+1,12,12,'#a79e82');for(const [x,y] of gardenPath.filter((_,i)=>i%2===0))if(!onWater(x,y))k.ell(x,y+1,11,11,'#c0b797');
    for(let i=0;i<1400;i++){const [x,y]=gardenPath[k.int(gardenPath.length)];if(!onWater(x,y))k.r(x-10+k.int(20),y-9+k.int(20),1,1,'#a89f80')}
    k.above(taihei);
    for(let x=214,i=0;x<410;x+=15,i++){const y=123+(i%2?1.5:-1.5);k.r(x-8,y+3,17,4,'#00000040');k.ell(x,y,8,6,'#9c988b');k.ell(x-1,y-1,6,4,'#b7b3a4')}
    // The irises along the White Tiger pond, the tea house over it.
    for(let i=0;i<40;i++){const a=.9+i*.06;k.r(88+Math.cos(a)*64,150+Math.sin(a)*46,2,5,'#5f9a5c');if(i%2)k.r(88+Math.cos(a)*64,149+Math.sin(a)*46,2,2,i%4===1?'#7458b0':'#e6e2f2')}
    k.r(52,84,44,16,'#6a5240');k.r(56,88,12,12,'#d8cfae');k.r(74,88,18,12,'#d8cfae');k.eaves(74,72,58,12,'#7a6a55','#00000024','#3f3024');k.r(50,100,48,3,'#3a2c20');for(const x of [56,76,92])k.r(x,103,2,6,'#2a2018');
    // The middle of it all: the court the garden wraps, as the shrine's own screen shows it, at half its size. White gravel and the stone way up it, a corridor down each side, the Daigokuden and its two towers, the cherry and the orange tree, the Otenmon.
    k.ground(176,214,240,216,'#e8e4d4','#d4d0c0',500);k.stones(284,236,24,194,'#d8d2be','#c2bca8');
    for(const x of [176,398]){k.r(x,216,18,214,'#3d7a5e');for(let y=218;y<430;y+=3)k.r(x,y,18,1,'#2f6048');k.r(x+(x<240?15:0),216,3,214,'#d4502e');for(let y=222;y<430;y+=9)k.r(x+(x<240?18:-2),y,2,6,'#efe9d8')}
    k.hall(296,192,176,20,22,'#d4502e','#3d7a5e','#a8402f','#efe9d8');k.r(222,234,148,3,'#efe9d8');k.r(222,237,148,2,'#b8b2a0');for(const x of [284,296])k.r(x,231,12,6,'#b8b2a0');
    for(const x of [196,396]){k.r(x-11,212,22,22,'#d4502e');for(let i=x-11;i<x+11;i+=5)k.r(i,212,2,22,'#a8402f');k.eaves(x,204,34,8,'#3d7a5e');k.r(x-7,199,14,5,'#d4502e');k.eaves(x,192,24,7,'#3d7a5e');k.r(x-1,189,2,3,'#d8b04a')}
    k.shade(334,270,16,2);k.r(340,256,3,14,'#5c4636');softCrown(k.r,k.rand,341,250,10,8,blossom);k.shade(244,270,16,2);k.r(250,256,3,14,'#5c4636');softCrown(k.r,k.rand,251,250,9,8,greens[2]);for(let i=0;i<6;i++)k.r(244+k.int(14),245+k.int(11),2,2,'#f0a030');
    k.gate(296,430,92,'#d4502e','#3d7a5e',26);for(const x of [194,342]){k.r(x,412,56,18,'#efe9d8');k.r(x,409,56,3,'#d4502e')}
    // Kyoto's first tram, kept in the South Garden.
    k.shade(30,420,62);k.r(30,398,60,18,'#6a7a5a');k.r(30,400,60,3,'#e6dcc0');k.r(30,412,60,4,'#3c4638');for(let x=34;x<84;x+=9)k.r(x,403,6,6,'#cfe0e4');k.r(26,392,68,6,'#5a5048');k.r(40,388,40,4,'#6a6058');k.r(36,416,8,5,'#2a2320');k.r(76,416,8,5,'#2a2320');
    // The pebble beach and the pine on its props, its lower limb out over the water.
    for(let i=0;i<120;i++)k.ell(492+k.int(92),360+k.int(16),2+k.int(2),1+k.int(2),['#8b8b80','#6f6e65','#a3a598'][k.int(3)]);for(const [x,y,w] of [[506,362,14],[540,368,12],[566,362,16]])k.rock(x,y,w,8,'#6f7a62');
    k.pine(528,372);k.pine(575,370,-1);for(let i=0;i<34;i++)k.r(520+i*1.4,352-i*.2,4,3,'#7a4a34');k.r(560,350,3,22,'#c9b98a');k.r(556,349,10,2,'#c9b98a');
    // Clipped azaleas along the shore, then the trees: pines round the ponds, weeping cherries down the South Garden.
    for(const [x,y] of azaleas)softCrown(k.r,k.rand,x,y,14,8,greens[2]);
    for(const [x,y,n] of gardenTrees)if(n===2)k.tree(x,y,blossom);else if(n===1)k.pine(x,y,x%2?1:-1);else k.tree(x,y,greens[n-3]);
    for(const [x,y] of [[168,74],[120,296],[396,146],[738,152],[750,330]])k.stoneLantern(x,y);
  }},
  // The lantern shrine, from the photos: the open pavilion in its plain slatted fence, two tiers of round white lanterns all round under its steep dark roof, the sake casks stacked inside; the plastered hall behind with its own row, the stone torii and its guardian lions, the paving through the dark trees.
  lanterns:{layout:{start:[370,306],exit:[406,204],camera:[238,204],solids:[[0,0,222,320],[0,0,480,108],[300,0,180,128],[402,214,78,106],[222,226,120,94],[326,246,14,16]],over:[[336,210,74,20],[342,226,8,16],[394,226,8,16]],lit:[[40,108,170,58],[306,88,108,16],[226,98,180,40]],lamps:[[126,136,150,0xfff0c0,1],[126,190,110,paper,.6,.5],[360,98,64,0xfff0c0,.9],[360,126,50,paper,.6],[370,270,30,warm,.3]]},draw:k=>{
    const {r}=k;k.forest(0,0,480,320,greens[0]);for(const [x,y] of [[250,76],[440,70],[20,220],[60,280],[150,290],[440,250],[250,270],[460,170]])k.cedar(x,y,60);
    k.ground(222,108,180,118,'#c8bfa6','#b0a890');for(let i=0;i<1500;i++)r(222+k.int(180),108+k.int(118),1,1,['#b4ac94','#d8d0b8','#a8a088'][k.int(3)]);k.ground(402,128,78,86,'#c8bfa6','#b0a890');k.ground(300,128,102,10,'#c8bfa6','#b0a890');
    r(342,214,60,106,'#6e6a5e');for(let y=214;y<320;y+=8)for(let x=342+(y%16?0:6);x<402;x+=12)r(x,y,11,7,['#8e8a7c','#86827a','#96927e'][k.int(3)]);
    // The pavilion: stone base and its gutter, the dark interior and the casks in it, the posts, the two tiers of lanterns, the steep roof.
    r(30,196,190,12,'#8e8a7c');r(30,196,190,2,'#aeaa9c');r(30,206,190,2,'#5a5850');r(36,190,178,8,'#55493c');k.shade(36,206,182,4);
    r(44,104,160,88,'#2a2018');for(let y=108;y<166;y+=6)r(44,y,160,1,'#3a2c20');r(50,166,150,26,'#1e1814');for(const [x,y] of [[112,176],[126,176],[119,166]] as const){r(x,y,12,12,'#f0ead8');r(x,y,12,1,'#4a7a3a');r(x,y+3,12,1,'#a89870');r(x+3,y+5,6,4,'#2a2320')}
    for(const x of [56,116,190])r(x,112,6,82,'#7a5a40'),r(x,112,2,82,'#9a7a58');
    k.shine(()=>{for(let row=0;row<2;row++){r(46,126+row*26,156,2,'#5a4230');for(let x=48;x<200;x+=11){const y=113+row*26;r(x+2,y,6,1,'#2a2320');r(x+1,y+1,8,1,'#e8e0cc');r(x,y+2,10,13,'#f6efdc');r(x+1,y+2,1,13,'#fffaf0');r(x+8,y+2,2,13,'#d8d0bc');for(let ry=y+4;ry<y+15;ry+=3)r(x,ry,10,1,'#e4dccb');r(x+3,y+5,4,1,'#2a2320');r(x+4,y+5,2,6,'#2a2320');r(x+3,y+8,4,1,k.int(4)?'#2a2320':'#c8452e');r(x+1,y+15,8,1,'#e8e0cc');r(x+2,y+16,6,1,'#2a2320')}}});
    r(46,110,156,3,'#3a2e24');k.eaves(124,58,196,50,'#4a4038','#00000028','#2a2420');r(112,62,24,12,'#3a3028');k.eaves(124,54,36,10,'#4a4038','#00000028','#2a2420');r(122,46,4,8,'#6a4e38');
    // The plain slatted fence round it.
    for(const y of [184,200]){r(36,y,178,2,'#8a7050');for(let x=36;x<214;x+=3)r(x,y-8,2,12,x%6?'#b8a07a':'#a08860')}
    // The hall behind, its lanterns along the front.
    r(306,84,108,44,'#ece4cf');r(306,84,108,4,'#4a3a2c');r(342,102,36,26,'#7a5a40');for(let x=344;x<376;x+=5)r(x,104,1,24,'#5a4230');r(312,106,24,16,'#6a5a48');r(384,106,24,16,'#6a5a48');k.eaves(360,60,136,24,'#46484a');k.shine(()=>{for(let i=0;i<11;i++){r(316+i*8,92,6,9,'#f6efdc');r(318+i*8,94,2,5,'#2a2320')}});r(306,128,108,3,'#8e8a7c');
    k.stoneLantern(420,150);
    // The stone torii and its two lions on their pedestals.
    k.above(()=>k.torii(372,264,62,50,'#a7a596','#8e8c80'));for(const x of [326,410]){k.shade(x-1,262,16,2);r(x,248,14,14,'#8e8a7c');r(x,248,14,2,'#aeaa9c');r(x+2,238,10,10,'#7a786e');r(x+3,234,6,6,'#8a887e');r(x+3,236,2,2,'#3a3a34')}
  }},
  // The Rakusai bamboo park: a winding path through stands of different bamboos behind woven fences, the leaves fallen brown on it, to the gathering of old stone Buddhas in their grassy clearing, weathered round and grown with lichen, a heavy stone lantern among them.
  rakusai:{layout:{start:[22,276],exit:[8,230],camera:[336,60],solids:[[0,0,120,250],[0,300,480,20],[300,100,180,220],[165,100,85,50],[120,195,130,55],[400,0,80,100],[0,0,480,50],[262,52,16,12]],over:[[0,298,480,20],[124,184,128,14],[300,90,102,16]],people:[[190,170,4,'up'],[212,80,13,'down']],lamps:[[220,76,44,warm,.5],[276,240,44,warm,.5],[140,130,40,warm,.4],[60,274,44,warm,.5]]},draw:k=>{
    const {r}=k;k.lawn(0,0,480,320,'#5f8a4e','#4d7640',false);
    // The paths: earth, littered with leaves gone brown, a few still green.
    for(const [x,y,w,h] of [[0,250,300,50],[250,150,50,150],[120,150,180,45],[120,60,45,135],[120,50,280,50]] as const){r(x,y,w,h,'#b49a6c');for(let i=0;i<w*h/6;i++)r(x+k.int(w),y+k.int(h),2,1,['#9a7a4a','#c8ac78','#8a6a3c','#d4bc8a','#7a8a48'][k.int(5)])}
    grove(k,0,112,40,246);grove(k,300,84,104,300,'gold');grove(k,390,90,104,300);grove(k,172,72,200,238,'black');grove(k,124,48,200,238);k.forest(0,0,480,46,greens[2]);grove(k,404,76,44,100,'black');
    // The woven fences: those on the far side of a path behind whoever walks it, those on its near side before them.
    brushwood(k,0,238,250,12);k.above(()=>{brushwood(k,0,300,300,16);brushwood(k,300,300,180,16);brushwood(k,124,186,126,10);brushwood(k,300,92,100,12)});
    // The clearing between the paths: long grass, and the old Buddhas in their rows, no two alike, each its seated figure worn into the stone.
    r(165,100,85,50,'#5f8a4e');for(let i=0;i<260;i++)r(165+k.int(85),100+k.int(50),1,2+k.int(2),['#7aa25a','#4d7640','#8ab868'][k.int(3)]);r(165,100,85,2,'#3e6a3a');
    for(const [row,y] of [[0,116],[1,131],[2,147]] as const)for(let x=167+row*3+k.int(3);x<244;x+=9+k.int(4)){const w=7+k.int(4),h=10+k.int(5)+row,c=['#8a8578','#7c7668','#968f80','#6e695e'][k.int(4)],gy=y+k.int(2);k.ell(x+w/2+1,gy,w/2+1,2,'#00000040');r(x,gy-h+3,w,h-3,c);k.ell(x+w/2,gy-h+4,w/2,4,c);r(x,gy-h+3,1,h-3,'#ffffff20');r(x+w-1,gy-h+3,1,h-3,'#00000030');k.ell(x+w/2,gy-h+5,1.5,1.5,blend(c,'#000000',.25));r(x+w/2-2,gy-h+8,4,4,blend(c,'#000000',.2));r(x+w/2-3,gy-h+11,6,2,blend(c,'#000000',.15));for(let n=0;n<3;n++)r(x+k.int(w),gy-h+3+k.int(h-3),2,1,['#b8b888','#8a9a5a','#c8c098'][k.int(3)]);r(x-1,gy-1,w+2,2,'#6a9a54')}
    // The stone lantern at the clearing's head, by the camera.
    {const x=270,y=62;k.shade(x-6,y+2,16,3);r(x-5,y-2,12,4,'#8a8274');r(x-3,y-14,8,12,'#9a9284');r(x-3,y-14,2,12,'#b0a898');r(x-6,y-18,14,4,'#8a8274');r(x-4,y-24,10,6,'#a09888');r(x-2,y-22,6,3,'#4a4438');r(x-9,y-30,20,6,'#7a7466');r(x-9,y-30,20,1,'#a09888');r(x-11,y-26,3,3,'#6a6458');r(x+10,y-26,3,3,'#6a6458');k.ell(x+1,y-33,3,3,'#8a8274')}
  }},
  // Dotonbori: the canal through the middle, the Ebisu bridge across it to the mouth of the Shinsaibashi arcade, the wall of signs along the far bank over the Tonbori River Walk: the great crab of Kani Doraku, the octopus, the screens, the Glico runner, Don Quijote's yellow wheel; all of it again in the water.
  dotonbori:{layout:{busy:true,start:[240,270],exit:[206,244],camera:[340,146],solids:[[0,0,480,120],[0,172,204,64],[276,172,204,64],[0,282,480,38]],people:[[224,198,3,'up'],[262,214,7,'left'],[150,152,1,'up'],[424,156,12,'up'],[100,264,5,'up'],[392,268,9,'up'],[452,262,2,'left']],lit:[[0,20,96,72],[96,30,56,70],[150,30,52,72],[204,30,72,62],[284,26,62,78],[346,30,58,70],[402,0,78,100],[0,100,480,18],[0,176,204,56],[276,176,204,56],[0,288,480,10]],lamps:[[240,140,150,0xffd8e0,.9,.4],[60,110,100,0xffc090,.8,.5],[316,120,90,0x90d0ff,.8,.5],[440,110,90,0xffd070,.8,.5],[240,200,60,warm,.7],[120,256,60,warm,.5],[360,256,60,warm,.5],[30,166,24,warm,.8],[94,166,24,warm,.8],[158,166,24,warm,.8],[322,166,24,warm,.8],[386,166,24,warm,.8],[450,166,24,warm,.8],[206,180,20,warm,.9],[274,180,20,warm,.9],[206,226,20,warm,.9],[274,226,20,warm,.9]]},draw:k=>{
    const {r}=k,win=(x:number,y:number,w:number,h:number,lit='#e8d8a0',dark='#4a5058')=>{for(let yy=y;yy<y+h-3;yy+=6)for(let xx=x;xx<x+w-3;xx+=5)r(xx,yy,3,4,k.int(3)?lit:dark)};
    r(0,0,480,40,'#8fa8b8');
    // The far bank's buildings, shoulder to shoulder, each its own height and skin.
    for(const [x,w,top,c] of [[0,98,14,'#e2dac6'],[96,56,22,'#3c3640'],[150,54,18,'#4a4650'],[202,76,10,'#2e3440'],[276,72,16,'#3a3e48'],[346,58,24,'#4a4e58'],[402,78,0,'#3a3236']] as const){r(x,top,w,104-top,c);r(x,top,2,104-top,'#ffffff18');r(x+w-3,top,3,104-top,'#00000030');r(x,top,w,2,'#00000040')}
    // Kani Doraku: the white board and its name, the crab over it, legs out, claws up.
    r(6,70,86,26,'#f6f2e6');r(6,70,86,2,'#ffffff');r(6,92,86,4,'#c8452e');r(6,96,86,2,'#8a2a1c');k.text(29,78,'かに道楽','#c8452e');
    for(const s of [-1,1]){for(let i=0;i<4;i++){const kx=49+s*(22+i*4),ky=56+i*4;k.line(49+s*(8+i*2),62+i,kx,ky,'#b8301e',3);k.line(kx,ky,kx+s*6,ky+10,'#d4402e',2)}
      k.line(49+s*12,56,49+s*22,46,'#b8301e',4);k.ell(49+s*25,43,6,5,'#d4402e');k.r(49+s*25-3,36,6,6,'#e8604a');k.r(49+s*25-(s>0?0:2),35,2,5,'#d4402e');k.r(49+s*26-2,40,4,2,'#f08a6a')}
    k.ell(49,62,18,9,'#b8301e');k.ell(49,60,16,8,'#d4402e');k.ell(45,57,9,4,'#ec6a50');for(const x of [42,56]){r(x,48,2,8,'#b8301e');r(x-1,46,4,4,'#fffef2');r(x,47,2,2,'#2a2320')}
    // The octopus over its takoyaki stall, its arms curling down the front.
    r(98,84,52,14,'#c8452e');r(98,84,52,2,'#e8735a');k.text(112,88,'たこ焼','#fffef2',false);win(100,60,48,22,'#c8b080','#2a2830');
    for(let i=0;i<6;i++){const a=-1+i*.4;for(let t=0;t<14;t++){const x=124+Math.sin(a)*(6+t*1.6)+Math.sin(t*.5+i)*3,y=62+t*1.6;k.ell(x,y,Math.max(1,3.5-t*.18),Math.max(1,3-t*.15),t%3?'#c8402e':'#e0604a')}}
    k.ell(124,52,12,13,'#b83a28');k.ell(124,50,11,12,'#d4502e');k.ell(119,45,5,5,'#ec7a5a');for(const x of [118,130]){k.ell(x,56,4,4,'#fffef2');r(x-1,55,2,3,'#2a2320')}r(121,63,6,3,'#8a2a1c');
    // Vertical signs, read top to bottom.
    win(152,26,48,76,'#b8a8c8','#2a2830');for(const [x,c,t,ink] of [[156,'#c8452e','道頓堀','#f6e080'],[184,'#f0c030','居酒屋','#a8302a']] as const){r(x-1,34,14,40,'#2a2320');r(x,35,12,38,c);[...t].forEach((ch,i)=>k.text(x+1,37+i*12,ch,ink))}
    // A great screen over the arcade's mouth.
    r(206,36,68,46,'#1a1c22');gradient(r,208,38,64,42,'#d03a8a','#f0a040',6);k.ell(240,58,14,14,'#fff4c0');k.ell(240,58,10,10,'#ffd860');k.text(230,52,'大阪','#c8302e');for(let x=208;x<272;x+=2)r(x,38,1,42,'#00000018');
    // The Glico runner: arms up on his track, the sky behind him, lit by its frame of bulbs.
    r(286,28,58,74,'#1a1c22');gradient(r,290,32,50,60,'#1a5fb8','#62c0ee',6);r(290,82,50,10,'#f4f4ee');r(290,86,50,1,'#1a5fb8');for(let x=286;x<344;x+=3){r(x,29,1,1,'#fff4c0');r(x,100,1,1,'#fff4c0')}for(let y=29;y<102;y+=3){r(287,y,1,1,'#fff4c0');r(342,y,1,1,'#fff4c0')}
    r(292,34,18,8,'#d4302a');letter(k.g,294,35,'Glico','#fffef2');
    const man='#fffef2';k.ell(316,50,3,3,man);r(314,54,5,12,man);k.line(315,56,307,44,man,2);k.line(318,56,326,44,man,2);k.line(316,65,308,70,man,3);k.line(308,70,309,80,man,2);k.line(317,65,323,74,man,3);k.line(323,74,330,80,man,2);r(304,42,3,3,man);r(326,42,3,3,man);
    // Billboards stacked up the next front.
    r(350,34,50,18,'#f08a30');r(350,34,50,2,'#ffc070');letter(k.g,358,40,'OSAKA','#fffef2');r(350,56,50,16,'#2a8a4a');k.text(355,59,'ラーメン','#fffef2',false);r(350,76,50,20,'#d060b0');for(let i=0;i<4;i++)r(354+i*12,80,9,12,['#f0c030','#34b6e0','#e0483a','#efe9dd'][i]);
    // Don Quijote: the yellow wheel running up its front, gondolas all round, the penguin in the middle, the name below.
    win(406,30,70,56,'#c8b080','#2a2830');for(let a=0;a<120;a++){const t=a/120*Math.PI*2,x=442+Math.cos(t)*26,y=62+Math.sin(t)*36;r(x-1,y-1,3,3,'#f0c030');r(442+Math.cos(t)*22,62+Math.sin(t)*32,1,1,'#c89a20')}
    for(let a=0;a<16;a++){const t=a/16*Math.PI*2;k.line(442,62,442+Math.cos(t)*22,62+Math.sin(t)*32,'#c89a2080');r(442+Math.cos(t)*30-2,62+Math.sin(t)*40-2,5,5,['#e0483a','#34b6e0','#f0c030','#efe9dd'][a%4])}
    k.ell(442,60,9,9,'#1d5fae');k.ell(442,62,6,5,'#fffef2');r(439,60,2,2,'#2a2320');r(444,60,2,2,'#2a2320');r(441,64,3,2,'#f0a030');r(408,88,68,12,'#c8302e');r(408,88,68,1,'#f0c030');k.text(410,91,'ドン・キホーテ','#f6e080',false);
    // Their ground floors on the river walk: lit glass, noren, lanterns under each awning; the Shinsaibashi arcade's mouth at the bridge's end.
    r(0,100,480,20,'#2a2628');for(let x=2;x<478;x+=24){if(x>196&&x<278)continue;r(x,104,20,12,['#f4dca0','#e8c890','#fff0c8'][k.int(3)]);r(x+6,104,8,7,['#2a3a6a','#8a2a24','#2a2320'][k.int(3)]);r(x,102,20,2,'#5a4a3e')}for(let x=8;x<472;x+=12)if(x<196||x>280)k.lantern(x,110,'#e8735a');
    r(204,96,72,24,'#3a3e44');r(208,100,64,20,'#fff0c8');for(let x=210;x<272;x+=8)r(x,100,1,20,'#d8c8a0');r(204,84,72,14,'#1a1c22');r(206,85,68,12,'#f4f0e4');k.text(220,86,'心斎橋筋','#c8302e');
    // The river walk: granite in two greys, the planters, the railing and its lamps along the edge.
    k.stones(0,120,480,46,'#9a968e','#86827a');for(let i=0;i<120;i++)r(k.int(480),121+k.int(44),3,2,'#aaa69c');r(0,120,480,2,'#00000040');
    for(const x of [40,134,330,430]){r(x,126,18,8,'#5a4a3e');r(x,126,18,2,'#7a6a5a');softCrown(r,k.rand,x+9,124,8,5,greens[1])}
    // The far quay's face, granite going dark where the water laps it.
    r(0,166,480,6,'#5c5a56');r(0,166,480,1,'#c8c4b8');for(let x=0;x<480;x+=4)r(x,167,1,4,'#2a2a28');for(let x=6;x<480;x+=64){r(x,152,2,14,'#2a2a28');r(x-2,148,6,4,'#fff0c8');r(x-1,147,4,1,'#2a2a28')}
    r(0,172,480,6,'#6e6a62');for(let x=0;x<480;x+=10)r(x,172,1,6,'#54504a');r(0,176,480,2,'#3a3c38');
    // The water, dark green, the signs again in it, broken by the wake.
    gradient(r,0,178,480,54,'#24404a','#1c3038',4);k.mirror(0,40,480,64,141,.34);k.shimmer(0,178,480,54,1.2);for(let y=180;y<232;y+=2)for(let i=0;i<14;i++)r(k.int(480),y,6+k.int(18),1,y%4?'#00000038':'#ffffff14');
    r(0,178,480,2,'#00000050');
    // The Tonbori cruise boat, and a Don Quijote boat at the bank.
    for(const [cx,y,c] of [[110,202,'#34b6e0'],[400,212,'#f0c030']] as const){k.ell(cx,y+12,32,4,'#00000040');r(cx-30,y,60,10,'#efe9dd');r(cx-28,y+8,56,4,c);r(cx-34,y+2,4,6,'#efe9dd');r(cx-16,y-7,30,7,'#3a4048');r(cx-14,y-6,26,4,'#a8c4cc');for(const p of [-10,0,10])r(cx+p,y+1,4,4,['#e0483a','#2a2320','#f0c030'][(p+10)/10])}
    // The near quay's coping and railing, the near walk, the lamps.
    r(0,232,480,4,'#c8c4b8');r(0,236,480,2,'#5c5a56');for(let x=0;x<480;x+=4)r(x,226,1,8,'#2a2a28');r(0,226,480,2,'#3a3a38');k.stones(0,238,480,44,'#9a968e','#86827a');for(let i=0;i<100;i++)r(k.int(480),239+k.int(42),3,2,'#aaa69c');
    // The Ebisu bridge, wide and pale, bellied out over the water, its stone rail and its lamps.
    k.shade(278,178,10,54);r(198,186,84,36,'#00000030');r(204,160,72,88,'#b8b2a4');for(let y=163;y<248;y+=6)r(204,y,72,1,'#a29c90');for(let x=210;x<276;x+=12)for(let y=160;y<248;y+=12)r(x+(y%24?6:0),y,1,6,'#a29c90');
    for(const s of [-1,1]){const ex=(y:number)=>240+s*(36+5*Math.max(0,1-((y-204)/26)**2));for(let y=170;y<238;y++){const x=ex(y);r(x-(s<0?4:0),y,4,1,'#d8d4c8');r(x-(s<0?4:0)+(s<0?0:3),y,1,1,'#8a867c')}for(const y of [176,204,226]){r(ex(y)-2,y-14,3,14,'#3a3a38');k.ell(ex(y)-1,y-16,3,3,'#fff4d0')}}
    // The near shops' roofs along the foot: tiles, a vertical sign's back, the lanterns under the eave.
    r(0,282,480,38,'#3a3e44');for(let y=286;y<320;y+=4)r(0,y,480,1,'#2e3238');for(let x=0;x<480;x+=5)r(x,282,1,38,'#33373c');r(0,282,480,4,'#23262a');for(let x=6;x<474;x+=10)k.lantern(x,288,k.int(4)?'#e8735a':'#f6efdc');for(const x of [60,180,330,440]){r(x,298,14,22,'#5a5e66');r(x,298,14,2,'#7a7e86');r(x+3,302,8,4,'#2a2c30')}
  }},
  // Shinsekai: Tsutenkaku Hondori, the tower standing on its four legs over the road at the end, slender, white, its deck and the lit sign down its shaft; either side the old blocks stepping down the street, each with its shop under the eaves, the blade signs
  // and the great figures stuck out over the road (the kushikatsu chef, the puffer lantern), wires across the sky; Billiken on his plinth, and the SHINSEKAI gate in gold letters at our end.
  shinsekai:{layout:{start:[240,304],exit:[172,276],camera:[176,126],solids:[[0,0,170,320],[310,0,170,320],[0,0,480,100],[176,226,16,14]],over:[[170,104,140,40],[170,232,140,22]],lit:[...sekaiRows.flatMap(([side,y,h]):Box[]=>[[side?310:0,y+h-20,170,14],[side?312:148,y+2,20,34]]),[226,72,28,36],[210,38,60,24],[170,236,140,10],[96,96,46,40]],lamps:[[240,130,90,warm,.7],[240,240,60,paper,.7],[140,190,80,paper,.8],[340,190,80,paper,.8],[240,90,60,0xfff0c0,.9],[240,50,40,0xe4f4ff,.8],[320,160,40,0xffffff,.6],[160,140,40,0xffc090,.8],[160,240,40,0xffc090,.8],[320,250,40,0xffc090,.8],[118,116,40,0xffd070,.7]]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,100,'#5a96d4','#c8e0ec',8);for(const [x,y,w] of [[40,40,80],[360,36,70],[290,60,50]] as const){k.ell(x,y,w/2,8,'#f4f6f4');k.ell(x+w*.15,y-5,w/3,7,'#ffffff');r(x-w/2,y+5,w,2,'#d8e4ec')}
    // Far off, the city's towers past the end of the street.
    for(const [x,w,h,c] of [[176,22,56,'#9aa8b4'],[300,18,44,'#b0a090'],[160,14,40,'#a8b4bc'],[330,26,32,'#c4bcb0'],[120,30,24,'#b8b0a4'],[380,20,36,'#a0acb8']] as const){r(x,100-h,w,h,c);r(x+w-3,100-h,3,h,'#00000020');for(let y=104-h;y<98;y+=4)r(x+2,y,w-4,1,'#ffffff40')}
    // The road: grey stone flags in the middle, a darker kerb of setts each side, the pattern of red tiles down it.
    r(170,100,140,220,'#a6a49c');for(let y=100;y<320;y+=6){r(170,y,140,1,'#94928a');for(let x=170+(y%12?0:8);x<310;x+=16)r(x,y,1,6,'#94928a')}for(let y=150;y<320;y+=30){r(236,y,8,8,'#a09088');r(238,y+2,4,4,'#b09c90')}for(let i=0;i<220;i++)r(170+k.int(140),100+k.int(220),2,1,'#b6b4ac');
    for(const x of [170,302]){r(x,100,8,220,'#7c7a74');for(let y=100;y<320;y+=4)r(x,y,8,1,'#6a6862')}
    // The blocks, stepping down each side: roof with its tank or its units, the face and its windows, the shop under the eaves with its lanterns, and the blade signs facing up the street.
    for(const [side,y,h] of sekaiRows){const x0=side?310:0,w=170;r(x0,y,w,h,'#3a3e42');
      // A row is two or three buildings, each its own width, height and face: windows, dark timber under a pent roof, a painted hoarding, or striped tiles round a porthole.
      for(let sx=x0;sx<x0+w;){const left=x0+w-sx,ww=left<92?left:44+k.int(36),shape=k.int(5),drop=shape===2?-(8+k.int(8)):k.int(3)*3,top=y+drop,face=['#c4b8a0','#b0a8a0','#d4c8a8','#a89c90','#bcb4a8','#c8b0a0'][k.int(6)],style=k.int(4);
        // No two alike from the street up: a flat roof with its tank or its units, a tiled gable, a taller one under a hoarding on its frame, a stepped parapet with its roundel, a water tower on stilts.
        if(shape===1){r(sx,top+4,ww-1,8,face);k.eaves(sx+(ww-1)/2,top-3,ww+1,12,['#4b5456','#5a4a3a','#3e4a52'][k.int(3)])}
        else{r(sx,top,ww-1,10,'#8a8c8e');r(sx,top,ww-1,2,'#a8aaac');r(sx,top+8,ww-1,2,'#6a6c6e');
          if(shape===2){const c=['#f0c030','#e0483a','#34b6e0','#2a8a4a'][k.int(4)];r(sx+9,top-2,1,3,'#3a3e40');r(sx+ww-11,top-2,1,3,'#3a3e40');r(sx+5,top-13,ww-11,11,'#2a2320');r(sx+6,top-12,ww-13,9,c);r(sx+7,top-11,ww-15,1,'#ffffff60');for(let hx=sx+9;hx<sx+ww-10;hx+=5)r(hx,top-8,3,3,c==='#f0c030'?'#2a2320':'#fffef2')}
          else if(shape===3){const a=Math.round(ww*.18),b=Math.round(ww*.34);r(sx+a,top-4,ww-1-a*2,5,face);r(sx+a,top-4,ww-1-a*2,1,'#ffffff50');r(sx+b,top-8,ww-1-b*2,5,face);r(sx+b,top-8,ww-1-b*2,1,'#ffffff50');k.ell(sx+ww/2,top-2,3,3,'#2a2320');k.ell(sx+ww/2,top-2,2,2,'#f4dca0')}
          else if(shape===4){const tx=sx+6+k.int(Math.max(1,ww-26));r(tx+1,top-4,1,6,'#5a5e60');r(tx+10,top-4,1,6,'#5a5e60');r(tx+1,top-2,10,1,'#5a5e60');r(tx,top-15,12,11,'#b8bcc0');r(tx,top-15,12,3,'#dcdfe0');r(tx+10,top-15,2,11,'#8e9296');r(tx+3,top-10,6,1,'#8e9296')}
          else if(k.int(2)){const tx=sx+4+k.int(Math.max(1,ww-24));r(tx,top+1,12,7,'#c8ccd0');r(tx,top+1,12,1,'#e4e6e8');r(tx+12,top+3,2,5,'#00000030')}else for(let i=0;i<2;i++){r(sx+6+i*10,top+2,7,5,'#d4d8d8');r(sx+8+i*10,top+3,3,3,'#7a8286')}}
        r(sx,top+10,ww-1,h-10-drop,face);r(sx,top+10,ww-1,2,'#00000030');
        if(style===0)for(let wy=top+14;wy<y+h-26;wy+=9)for(let wx=sx+5;wx<sx+ww-10;wx+=12){r(wx,wy,8,6,'#4a5a66');r(wx,wy,8,1,'#00000040');r(wx+1,wy+1,3,2,'#8ab0c4');if(k.int(5)===0)r(wx,wy+6,8,2,'#b8bcbc')}
        else if(style===1){r(sx,top+10,ww-1,h-28-drop,'#6a4a34');for(let wx=sx+2;wx<sx+ww-1;wx+=3)r(wx,top+12,1,h-32-drop,'#4a3424');r(sx+4,top+14,ww-10,5,'#e8dcc0');k.eaves(sx+ww/2,y+h-30,ww+2,6,'#4b5456')}
        else if(style===2){const c=['#f0c030','#e0483a','#34b6e0','#f4f4ec'][k.int(4)];r(sx+3,top+13,ww-8,h-38-drop,'#2a2320');r(sx+4,top+14,ww-10,h-40-drop,c);r(sx+5,top+15,ww-12,2,'#ffffff60');k.text(sx+Math.max(5,(ww-22)/2),top+15+Math.max(0,(h-48-drop)/2),['大衆演劇','新世界','づぼらや','ジャンジャン'][k.int(4)].slice(0,4),c==='#e0483a'?'#fffef2':'#2a2320',false)}
        else{const c=['#e0483a','#2a8a4a','#3a78c2','#d060b0'][k.int(4)];for(let wx=sx;wx<sx+ww-1;wx+=6)r(wx,top+12,3,h-36-drop,c);k.ell(sx+ww/2,top+12+(h-36-drop)/2,7,7,'#2a2320');k.ell(sx+ww/2,top+12+(h-36-drop)/2,6,6,'#f4dca0');k.ell(sx+ww/2,top+12+(h-36-drop)/2,3,3,c)}
        const aw=['#3a6a4a','#c8452e','#2a4a7a','#d8a838'][k.int(4)];r(sx,y+h-22,ww-1,3,aw);if(k.int(2))for(let ax=sx+1;ax<sx+ww-3;ax+=6)r(ax,y+h-22,3,3,'#f4f4ec');r(sx,y+h-19,ww-1,19,'#2a2628');
        for(let px=sx+3;px<sx+ww-12;px+=14){r(px,y+h-17,11,14,['#f4dca0','#e8c890','#fff0c8'][k.int(3)]);r(px+3,y+h-17,5,8,['#2a3a6a','#8a2a24','#2a2320'][k.int(3)]);r(px,y+h-6,11,3,['#8a6a48','#c8452e','#5a8a5a'][k.int(3)])}
        if(k.int(2))for(let lx=sx+3;lx<sx+ww-8;lx+=8)k.lantern(lx,y+h-23,k.int(3)?'#e8735a':'#f6efdc');
        r(sx+ww-1,top,1,h-drop,'#00000060');sx+=ww}
      r(x0+(side?0:w-2),y+10,2,h-10,'#00000040');
      const bx=side?312:148,c=['#e0483a','#f0c030','#34b6e0','#d060b0','#2a8a4a'][k.int(5)],t=['串かつ','ふぐ','将棋','酒','ホルモン','たこ焼'][k.int(6)];r(bx,y+2,20,34,'#2a2320');r(bx+1,y+3,18,32,c);r(bx+2,y+4,16,2,'#ffffff70');[...t].slice(0,3).forEach((ch,i)=>k.text(bx+5,y+6+i*10,ch,'#fffef2',false))}
    // The kushikatsu chef, glaring down the street over his shop, skewers in his fist.
    k.ell(118,116,18,18,'#2a2320');k.ell(118,116,16,16,'#f0c8a0');r(102,98,32,8,'#fffef2');r(106,92,24,8,'#fffef2');for(const x of [109,123]){k.line(x-3,108,x+4,111,'#2a2320',2);r(x,113,4,4,'#fffef2');r(x+1,114,2,2,'#2a2320')}r(112,124,12,3,'#8a2a1c');r(108,120,4,2,'#e89080');r(126,120,4,2,'#e89080');for(let i=0;i<3;i++){k.line(138+i*3,124,144+i*3,100,'#c8a060',1);k.ell(144+i*3,104,2,4,'#c8862a')}k.ell(140,126,5,4,'#f0c8a0');
    // The puffer lantern hanging over the right-hand shops.
    r(310,160,10,3,'#2a2320');k.ell(326,160,16,12,'#f0dca0');k.ell(326,166,12,6,'#fffef2');for(let i=0;i<8;i++)r(312+i*4,150+(i%2),2,3,'#c9a84a');r(320,156,4,4,'#2a2320');r(332,156,4,4,'#2a2320');r(325,164,4,2,'#e0483a');r(341,158,6,5,'#e8c070');
    // Tsutenkaku: the lattice shaft rising from its legs, the lit sign down it, the octagonal deck in white, the mast over it.
    const steel='#e8ece8',rib='#9aa4a8';
    k.shade(214,140,56,4);for(let y=62;y<112;y++){const w=12+(y-62)*.14;r(240-w,y,w*2,1,'#d0d8d8');r(240-w,y,2,1,'#ffffff');r(240+w-2,y,2,1,rib)}for(let y=64;y<110;y+=6){k.line(229,y,251,y+6,rib);k.line(251,y,229,y+6,rib);r(228,y,24,1,rib)}
    r(226,72,28,36,'#1a1c22');r(228,74,24,32,'#e0483a');r(229,75,22,2,'#ff8a6a');k.text(235,76,'通','#fffef2');k.text(235,86,'天','#fffef2');k.text(235,96,'閣','#fffef2');
    r(208,58,64,5,'#b8c0c0');r(208,62,64,2,rib);r(210,38,60,20,steel);r(210,38,60,2,'#ffffff');r(210,38,3,20,'#ffffff');for(let x=215;x<266;x+=6)r(x,42,4,11,'#4a6a80');r(210,55,60,3,rib);r(266,38,4,20,'#c0c8c8');r(218,34,44,4,'#c8d0d0');r(222,30,36,4,steel);
    k.above(()=>{r(222,104,36,7,'#d0d8d8');r(222,104,36,1,'#ffffff');r(222,110,36,1,rib);for(const s of [-1,1]){for(let i=0;i<34;i++){const t=i/33,y=106+i,outer=240+s*(17+t*13),inner=240+s*(7+t*9),x=Math.min(outer,inner),w=Math.abs(outer-inner);r(x,y,w,1,'#d0d8d8');r(outer-(s>0?2:0),y,2,1,s>0?rib:'#ffffff');r(inner-(s>0?0:1),y,1,1,rib);if(i%6===5)r(x,y,w,1,rib)}for(let i=0;i<5;i++){const t0=i/5,t1=(i+1)/5;k.line(240+s*(7+t0*9),106+t0*33,240+s*(17+t1*13),106+t1*33,rib)}r(240+s*23-8,139,16,4,'#8a8c8a');r(240+s*23-8,139,16,1,'#b4b6b4')}});
    // Wires across the sky from pole to pole.
    for(const [x0,y0,x1,y1] of [[170,80,310,88],[170,88,310,84],[150,66,330,74]] as const)for(let x=x0;x<x1;x+=2){const t=(x-x0)/(x1-x0);r(x,y0+(y1-y0)*t+Math.sin(t*Math.PI)*5,2,1,'#2a2a2a')}
    // Billiken on his plinth, laughing, soles out.
    k.shade(176,240,18,2);r(176,234,16,6,'#8e8a7c');r(176,234,16,1,'#b4b0a2');r(178,220,12,14,'#d8b04a');r(178,220,3,14,'#ecc860');k.ell(184,216,7,6,'#e0bc60');r(182,210,4,4,'#e0bc60');r(180,216,2,1,'#2a2320');r(186,216,2,1,'#2a2320');r(182,219,4,1,'#8a5a20');r(179,232,4,2,'#f0d070');r(185,232,4,2,'#f0d070');
    // The gate at our end: black girders on two posts, SHINSEKAI in gold over the road, a gold peak over the name.
    k.above(()=>{for(const x of [170,304]){r(x,244,6,76,'#2a2a2e');r(x,244,2,76,'#4a4a50')}r(176,236,128,12,'#1e1e22');for(let x=178;x<302;x+=6){k.line(x,237,x+6,246,'#3a3a40')}r(176,236,128,1,'#4a4a50');r(176,247,128,1,'#4a4a50');k.line(206,236,240,224,'#d8b040',2);k.line(274,236,240,224,'#d8b040',2);r(238,222,4,4,'#f0d060');k.text(218,237,'SHINSEKAI','#f0c840')});
  }},
  // Biwako Terrace: out of the dark timber station at the top of the gondola and across the grass to the Grand Terrace's three wooden tiers, the basin along the highest running on into Lake Biwa, which fills everything beyond, as in the traveller's photos: the islands, the far ridges in the haze, the plain below on the left, the ridge's autumn scrub at either end.
  biwako:{layout:{start:[116,300],exit:[104,262],camera:[392,192],way:{at:[372,282],to:'biwako-horai',ja:'吊橋',sign:'BRIDGE',en:'The Sky Bridge'},solids:[[0,0,480,198],[172,206,30,10],[282,206,30,10],[220,240,44,10],[160,254,30,10],[352,252,30,10],[14,272,84,48],[206,226,6,5],[316,256,6,5]],people:[[120,204,0,'up'],[132,205,3,'up'],[222,204,5,'up'],[232,203,8,'up'],[340,204,11,'up'],[209,231,2,'right'],[319,261,6,'left']],lit:[[24,286,66,16]],lamps:[[76,204,44,warm,.6],[404,204,44,warm,.6],[58,238,44,warm,.6],[422,238,44,warm,.6],[240,226,90,warm,.3],[56,300,60,paper,.7]]},draw:k=>{
    // The sky, deep overhead and pale at the haze, in dithered bands; high cirrus and a line of small cloud along the haze.
    gradient(k.r,0,0,480,76,'#4c84c6','#bcdaea',12);
    for(const [x,y,w] of [[28,24,120],[300,14,150],[210,40,90]] as const)for(let i=0;i<4;i++)k.r(x+i*9,y+i*2,w-i*16,1,i%2?'#d4e4f0':'#a8c6e2');
    for(let x=8;x<470;x+=18+k.int(26)){const w=6+k.int(16);k.r(x,64+k.int(5),w,2,'#f4f6f4');k.r(x+2,63+k.int(4),w-5,1,'#ffffff')}
    // The far shore, ridge behind ridge in the haze, its plain a pale line.
    for(let x=0;x<480;x+=2){const y=71-Math.sin(x/38)*2-Math.sin(x/11+1)*1.2-Math.exp(-(((x-360)/70)**2))*4;k.r(x,y,2,14,'#9ab4cc')}for(let x=0;x<480;x+=2){const y=77-Math.sin(x/27+2)*1.4-Math.exp(-(((x-130)/60)**2))*3;k.r(x,y,2,8,'#84a4bc')}k.r(0,82,480,2,'#b4c2b4');for(let x=3;x<480;x+=7+k.int(9))k.r(x,82,2,1,'#e4e8dc');
    // Lake Biwa, pale far off and deep below, the long slicks of its currents, the sun's track on it, Okishima and its neighbours.
    gradient(k.r,0,84,480,100,'#74aacc','#2c6696',10);
    for(let i=0;i<120;i++){const y=86+k.rand()**1.4*92,w=6+(y-84)*.4+k.int(14);k.r(k.int(480),y,w,1,y<120?'#9cc4dc':'#5a94bc')}
    for(let i=0;i<70;i++){const y=90+k.int(84);k.r(330+(y-90)*.3+k.int(70)-35,y,3+k.int(7),1,'#dcecf4')}
    for(const [cx,w,h] of [[286,34,7],[312,18,5],[246,12,3],[352,9,2]] as const){for(let x=-w;x<w;x++){const t=x/w,top=h*(1-t*t)*(.7+.3*Math.sin(x/3));k.r(cx+x,100-top,1,top+1,x<-w/3?'#6c8a7a':'#527466')}k.r(cx-w,100,w*2,1,'#3a5e70')}
    // Down to the left, the lakeside plain: rice stubble and fields in strips, the town along the shore.
    const shore=(y:number)=>(y-136)*5.2+Math.sin(y/5)*9+Math.sin(y/2.3)*3;for(let y=136;y<178;y++){k.r(0,y,shore(y),1,'#7c9a66');k.r(shore(y)-2,y,4,1,'#d8dccc')}
    for(let i=0;i<60;i++){const y=140+k.int(36),x=k.rand()*(shore(y)-20),w=8+k.int(12);k.r(x,y,w,3,['#b8ac64','#94aa62','#c8b878','#70925a'][k.int(4)]);k.r(x,y+3,w,1,'#5c7a4c')}
    // The town, unbroken along the water: streets and roofs from the quay back, thinning into the fields.
    for(let i=0;i<520;i++){const y=134+k.int(44),x=shore(y)-3-k.rand()**1.5*44;if(x>0)k.r(x,y,2+k.int(3),2,['#eae6dc','#c8cccc','#a8604c','#54666e','#d8d2c4','#6e7a80'][k.int(6)])}
    // The ridge falling away either side of the basin: scrub turning for autumn, the odd bare beech, susuki along it. The middle is left open, so that the water runs into the lake.
    // And on the right, past the ridge, the town again along the shore.
    const shoreRight=(y:number)=>480-(y-126)*2.6-Math.sin(y/4)*5;for(let y=126;y<180;y++){k.r(shoreRight(y),y,480,1,'#7c9a66');k.r(shoreRight(y)-2,y,3,1,'#d8dccc')}
    for(let i=0;i<300;i++){const y=127+k.int(52),x=shoreRight(y)+2+k.rand()*(480-shoreRight(y));k.r(x,y,2+k.int(3),2,['#eae6dc','#c8cccc','#a8604c','#54666e','#d8d2c4','#6e7a80'][k.int(6)])}
    const edge=(x:number)=>186-Math.max(0,Math.abs(x-240)-136)/104*44+Math.sin(x/9)*1.5;
    k.r(0,178,480,20,'#4e6a46');for(let x=0;x<480;x+=2)if(Math.abs(x-240)>136)k.r(x,edge(x),2,198-edge(x),'#4e6a46');
    for(let i=0;i<190;i++){const x=k.rand()*480;if(Math.abs(x-240)<142)continue;const kind=k.rand(),rx=5+k.rand()*8,ry=rx*(.6+k.rand()*.25),top=edge(x)+ry,pal=kind<.36?greens[0]:kind<.64?['#4a4a2c','#6e5a34','#8a6a40','#a88a58']:kind<.86?['#5a3a26','#7a4a30','#9a6038','#b88048']:['#5a6a44','#7a8a54','#9aa868','#c0c088'];softCrown(k.r,k.rand,x,top+k.rand()*Math.max(0,190-top),rx,ry,pal)}
    for(const x of [12,44,78,404,440,470])for(let i=0;i<5;i++){const h=8+k.rand()*7,sx=x+i*2-4;k.r(sx,186-h,1,h,'#b8ae78');k.r(sx-(i<2?1:0),185-h,2,2,'#e8dcae')}
    // The grass of the summit, mown in long bands.
    k.lawn(0,196,480,124,'#7fa266','#6e925a');for(let y=204;y<320;y+=22)k.r(0,y,480,10,'#84a86a');for(let i=0;i<260;i++)k.r(k.int(480),196+k.int(124),1,2,'#a2bc7c');
    // The three tiers of the Grand Terrace, widening towards us: planks in staggered lengths, a dark riser under each with its strip of light, the steps down the middle.
    const tiers=[[64,352,178,44],[48,384,222,30],[30,420,252,28]] as const;
    tiers.forEach(([x,w,y,h],t)=>{k.r(x+3,y+h+4,w,3,'#00000030');k.r(x,y,w,h,['#92806c','#8a7864','#82705c'][t]);
      for(let yy=y;yy<y+h;yy+=4){k.r(x,yy+3,w,1,'#64564a');k.r(x,yy,w,1,'#a8967e');for(let xx=x+(yy%8?7:21);xx<x+w;xx+=28){k.r(xx,yy,1,3,'#64564a');k.r(xx+2,yy+1,10+k.int(12),1,['#9c8a74','#7e6e5c','#ac9a84'][k.int(3)])}}
      k.r(x,y+h,w,5,'#463c34');k.r(x,y+h,w,1,'#b8a890');k.r(x+2,y+h+3,w-4,1,'#f0d49a');k.r(x-2,y,2,h+5,'#463c34');k.r(x+w,y,2,h+5,'#463c34')});
    for(const [y,top] of [[222,'#a8967e'],[252,'#a08e78']] as const){k.r(204,y-5,72,5,'#463c34');k.r(204,y-5,72,1,top);k.r(204,y-3,72,1,top)}
    // The basin along the top tier, cobalt mosaic under a skin of water: its lake side a dark line, so that it stops against the lake; the white kerb on ours.
    gradient(k.r,64,176,352,19,'#1c4ca8','#2f74d8',5);for(let x=66;x<416;x+=6)k.r(x,176,1,19,'#1a429488');for(let y=179;y<195;y+=4)k.r(64,y,352,1,'#1a429488');for(let i=0;i<40;i++)k.r(68+k.int(330),177+k.int(17),5+k.int(14),1,'#6aa4ec');
    k.r(64,175,352,1,'#14306c');k.r(64,195,352,3,'#f4f6f4');k.r(64,198,352,1,'#b8bcc0');k.r(64,199,352,1,'#5a5048');k.r(62,175,2,25,'#f4f6f4');k.r(416,175,2,25,'#f4f6f4');
    // The sofas, each a low white module, its back to the tier above and a cushion or two, by a little table.
    const sofa=(x:number,y:number,w:number)=>{k.r(x-1,y+10,w+2,3,'#00000038');k.r(x,y+3,w,8,'#f2eee2');k.r(x,y+9,w,2,'#c8c2b2');k.r(x,y,w,4,'#dcd6c6');k.r(x,y,w,1,'#fbf8f0');for(let c=x+3;c<x+w-7;c+=w>32?14:12)k.r(c,y+4,6,4,[ '#2f8fb0','#e0a050','#3f7fa8'][(c>>2)%3]);k.r(x+1,y+11,2,2,'#3a3a38');k.r(x+w-3,y+11,2,2,'#3a3a38')};
    const table=(x:number,y:number)=>{k.r(x-4,y+6,10,2,'#00000030');k.r(x-4,y,10,3,'#5a4030');k.r(x-4,y,10,1,'#8a6a48');k.r(x,y+3,2,4,'#3a3a38');k.r(x-2,y-2,2,2,'#f4f0e4')};
    sofa(172,206,30);sofa(282,206,30);sofa(220,240,44);sofa(160,254,30);sofa(352,252,30);table(160,212);table(320,212);table(276,246);
    // The low lamps at the corners of the tiers.
    for(const [x,y] of [[70,200],[408,200],[54,226],[424,226],[36,256],[442,256]] as const){k.r(x,y,2,10,'#2c2c2a');k.r(x-1,y-2,4,3,'#f6e0a0');k.r(x,y-3,2,1,'#2c2c2a')}
    // The way across the grass from the station, boards on two rails.
    for(let y=280;y<320;y+=3){k.r(100,y,34,2,'#a8845a');k.r(100,y,34,1,'#c29c6c');k.r(100,y+2,34,1,'#6e5238')}k.r(99,280,1,40,'#5a4030');k.r(134,280,1,40,'#5a4030');
    // The top station and café: dark charred timber in close slats, a long window, the deep flat roof, the ropeway's rust-brown steel over it and the cable running off down the mountain.
    k.r(14,290,84,3,'#00000030');k.r(16,276,80,44,'#3a302c');for(let x=17;x<96;x+=3)k.r(x,276,1,44,'#2a2220');
    k.r(24,286,66,16,'#ffe2a8');k.r(24,286,66,3,'#c8dce4');for(let x=24;x<90;x+=11)k.r(x,286,1,16,'#2a2220');k.r(24,302,66,2,'#1e1a18');k.r(46,304,22,16,'#1e1a18');k.r(47,305,9,15,'#a8c4cc');k.r(58,305,9,15,'#a8c4cc');
    k.r(10,270,92,6,'#23201e');k.r(10,270,92,1,'#6a6058');k.r(12,276,88,1,'#14110f');k.text(30,271,'びわ湖テラス','#f4e4b8',false);
    for(let x=24;x<76;x+=8){k.r(x,250,2,20,'#7a4a30');k.r(x+1,250,1,20,'#a8643c')}k.r(20,248,60,3,'#7a4a30');k.r(20,258,60,2,'#5e3a26');for(let i=0;i<7;i++){k.r(24+i*8,258-i%2*8,8,1,'#a8643c')}
    k.r(0,262,24,1,'#23292e');k.r(0,264,24,1,'#23292e');
    // Trees at the foot of the grass: a maple turning, young beech, the cedars in the corner.
    k.cedar(462,298,48);k.cedar(444,314,42);k.tree(168,308,['#5a3a26','#8a4a2c','#b8683a','#d89050']);k.tree(310,312,greens[0]);
  }},
  // Otsu: the promenade along Lake Biwa, its quay edged with yellow bollards, the pier and the paddle steamer Michigan waiting at it, the fountain out on the water, Hiei and the far shore's towns behind; and the festival's float, drawn up on the lawn: red curtains, its tapestry, the gilded roof, the lanterns, the great wheels.
  'otsu-shore':{layout:{start:[60,298],exit:[18,268],camera:[132,80],solids:[[0,0,120,148],[160,0,320,148],[0,0,480,66],[336,216,50,44],[44,186,4,4],[176,186,4,4],[304,186,4,4],[448,186,4,4]],puffs:[[420,116,0xdff0f6]],people:[[350,268,0,'up'],[372,270,5,'up'],[300,240,3,'right'],[210,170,9,'up'],[250,172,11,'up']],lit:[[0,36,480,16],[166,90,170,52],[332,176,58,84],[0,146,480,10]],lamps:[[250,104,80,paper,.7],[140,110,40,warm,.8],[360,226,50,paper,.8],[90,170,60,warm,.7],[260,170,60,warm,.7],[420,170,60,warm,.7],[338,190,20,0xff8060,.9],[384,190,20,0xff8060,.9]]},draw:k=>{
    const {r}=k;gradient(r,0,0,480,46,'#6aa0d0','#d4e4ec',6);k.ridge(48,[[130,18,90],[360,12,90]],'#6a8a7a','#5e7e6e',2);k.ridge(48,[[60,8,60],[260,6,70],[440,8,50]],'#5a7a68','#4e6e5c',4);
    // The far shore: towns along the water, a few towers, their lights.
    r(0,44,480,6,'#a8b0a8');for(let x=0;x<480;){const w=4+k.int(10),h=2+k.int(6)+(k.int(9)?0:8);r(x,48-h,w-1,h,['#c8ccc8','#b0b8b8','#d8d4c8'][k.int(3)]);k.shine(()=>{if(k.int(2))r(x+1,47-h+k.int(Math.max(1,h)),2,1,'#f6e0a0')});x+=w}
    // The lake, deep blue towards us, the far shore again in it.
    gradient(r,0,50,480,98,'#7ab0cc','#3c7a9c',7);k.mirror(0,30,480,20,50,.3);for(let i=0;i<140;i++)r(k.int(470),52+k.int(94),4+k.int(12),1,k.int(2)?'#ffffff30':'#00000018');
    // The fountain, its jets in arcs over the water.
    k.ell(420,120,40,5,'#a8d4e0');for(let i=0;i<34;i++){const t=(i-17)/17;r(420+t*36,118-(1-t*t)*44,2,3,'#eaf6fa')}for(let i=0;i<16;i++){const t=(i-8)/8;r(420+t*18,118-(1-t*t)*58,2,3,'#ffffff')}for(let i=0;i<20;i++)r(390+k.int(60),78+k.int(40),1,1,'#ffffff');
    // The pier on its piles.
    for(let y=62;y<152;y+=3){r(120,y,40,3,'#a87f50');r(120,y,40,1,'#c49a68');for(let x=124;x<160;x+=9)r(x,y+1,1,2,'#8a6240')}r(118,60,2,92,'#5a3e2a');r(160,60,2,92,'#5a3e2a');for(const y of [78,110,140]){r(116,y,3,6,'#3a3028');r(161,y,3,6,'#3a3028')}r(162,62,4,90,'#00000030');
    // The Michigan: white decks on a white hull, the red trim, the windows, the twin stacks, the red paddlewheel at her stern; and her reflection.
    const boat=()=>{r(168,126,160,16,'#efe9dd');r(168,136,160,6,'#c8452e');r(168,141,160,1,'#8a2a1c');r(174,112,146,14,'#fbf8ec');k.shine(()=>{for(let x=178;x<316;x+=9)r(x,115,6,7,'#5c7f8f')});r(174,124,146,2,'#d8d2c4');r(184,98,126,14,'#fbf8ec');k.shine(()=>{for(let x=188;x<306;x+=9)r(x,101,6,6,'#5c7f8f')});r(180,96,134,3,'#c8452e');r(204,90,40,8,'#fbf8ec');r(206,92,36,3,'#5c7f8f');r(226,74,8,22,'#3a3a38');r(258,74,8,22,'#3a3a38');r(224,72,12,3,'#d8b04a');r(256,72,12,3,'#d8b04a');r(328,112,18,30,'#c8452e');for(let y=114;y<140;y+=5)r(328,y,18,2,'#efe9dd');r(344,112,2,30,'#8a2a1c')};
    k.reflect(144,.25,boat);boat();k.ell(256,144,96,3,'#00000030');
    // The quay: granite coping, the yellow bollards and their chain, the promenade's paving.
    r(0,146,480,4,'#d8d4c4');r(0,150,480,2,'#6a665a');k.stones(0,152,480,58,'#c8bfa6','#b0a890');for(let i=0;i<90;i++)r(k.int(480),153+k.int(56),3,2,'#d4ccb4');
    for(let x=8;x<480;x+=28){if(x>110&&x<168)continue;k.shade(x,152,6,2);r(x,138,5,14,'#e8c030');r(x,138,5,1,'#f8e070');r(x+4,138,1,14,'#b08a18');r(x,142,5,1,'#2a2320');if(x+28<480&&!(x+28>110&&x+28<168))for(let i=0;i<23;i++)r(x+5+i,143+Math.sin(i/23*Math.PI)*3,1,1,'#4a4a48')}
    k.shine(()=>{for(const x of [46,178,306,450]){r(x-4,156,8,5,'#f6e0a0')}});for(const x of [46,178,306,450]){k.shade(x-1,190,6,2);r(x-1,160,2,30,'#4c6156')}
    // The lawn, the shade trees on it, the path across.
    k.lawn(0,210,480,110,'#7fa266','#6e925a');for(let i=0;i<300;i++)r(k.int(480),210+k.int(110),1,2,'#94b67a');k.stones(0,262,480,22,'#c8bfa6','#b0a890');r(0,262,480,1,'#8e8a7c');r(0,283,480,1,'#8e8a7c');
    for(const [x,y,pal] of [[120,248,greens[1]],[250,244,blossom],[60,316,greens[2]],[420,316,greens[0]],[250,316,greens[1]]] as const)k.tree(x,y-8,pal);
    // The float: on its three great wheels, the red-curtained body hung with its tapestry, the people up on the deck, the gilded roof, a red lantern at each corner.
    k.shade(334,262,60,4);for(const x of [340,382]){k.ell(x,256,8,8,'#3a2c20');k.ell(x,256,6,6,'#6a5038');k.ell(x,256,2,2,'#2a2018')}k.ell(361,258,6,6,'#3a2c20');r(334,244,58,6,'#2a2320');r(334,244,58,1,'#5a4a3a');
    k.shine(()=>{r(338,206,50,38,'#c8302e');r(338,206,50,3,'#e04a3a');r(346,210,34,30,'#d8b04a');r(348,212,30,26,'#5a7a5a');r(352,216,22,16,'#8a9a6a');r(358,218,10,10,'#c8a060');r(386,206,2,38,'#8a2018')});
    r(336,194,54,12,'#2a2320');r(338,196,50,8,'#3a2c20');for(const [x,c] of [[342,'#3a5a8a'],[352,'#e8e0cc'],[362,'#c25b4a'],[372,'#2a2320'],[382,'#e8e0cc']] as const){r(x,190,6,8,c);r(x+1,186,4,4,'#e0b896');r(x+1,185,4,2,'#1a1614')}
    r(334,176,58,10,'#c89a28');for(let x=336;x<390;x+=4)r(x,178,2,6,'#f0d060');k.eaves(363,168,64,10,'#8a2018','#00000030','#c89a28');r(361,160,4,8,'#f0d060');k.ell(363,160,4,3,'#f0d060');
    k.shine(()=>{for(const x of [334,388]){r(x-1,186,1,4,'#2a2320');k.ell(x,194,4,5,'#e0483a');r(x-2,193,4,1,'#2a2320')}});
  }},
  // Biwako Terrace's other half, one long screen looking east over the lake, Uchimi on the left and Horai on the right as the traveller's photos have them: the end of the Sky Bridge (220 m, no tower or pier, steel grating, its cables below the deck), the scrub of the valley it crosses, then the grass up Mt Horai to the summit (1,174 m): the rope fence, the nine stone Jizo, the stone pagoda and the cairn of the bell (彼岸の鐘) against the view, the stepped deck of Cafe 360 and the snow-making pond, all after the traveller's photos.
  'biwako-horai':{layout:{width:1100,height:320,start:[62,241],exit:[30,214],camera:[966,120],second:{camera:[356,214],page:'biwako-bridge'},out:{to:'biwako',at:[382,312],en:'To the terrace'},solids:[...fenced(1100,320,horaiPath),[804,134,112,20],[914,142,44,22],[1000,148,48,20],[990,196,100,62],[838,240,100,44]],over:[[86,222,560,48]],people:[[860,172,4,'up'],[1000,186,2,'down'],[1030,186,8,'right'],[1060,262,9,'up'],[960,180,12,'left']],lamps:[[92,226,60,cool,.4],[640,226,60,cool,.4],[1040,230,90,warm,.5],[976,150,50,warm,.4]]},draw:k=>{
    gradient(k.r,0,0,1100,44,'#4c84c6','#bcdaea',10);for(const [x,y,w] of [[60,14,120],[420,22,150],[760,10,130]] as const)for(let i=0;i<3;i++)k.r(x+i*9,y+i*2,w-i*16,1,i%2?'#d4e4f0':'#a8c6e2');
    for(let x=0;x<1100;x+=2){const y=40-Math.sin(x/38)*2-Math.sin(x/11+1)-Math.exp(-(((x-620)/90)**2))*4;k.r(x,y,2,12,'#9ab4cc')}for(let x=0;x<1100;x+=2){const y=46-Math.sin(x/27+2)*1.4;k.r(x,y,2,6,'#84a4bc')}k.r(0,50,1100,2,'#b4c2b4');
    gradient(k.r,0,52,1100,110,'#74aacc','#2c6696',10);for(let i=0;i<260;i++){const y=54+k.rand()**1.4*100,w=6+(y-52)*.4+k.int(14);k.r(k.int(1100),y,w,1,y<100?'#9cc4dc':'#5a94bc')}
    for(const [cx,w,h] of [[420,40,8],[452,20,5],[372,14,3],[900,26,5]] as const){for(let x=-w;x<w;x++){const t=x/w,top=h*(1-t*t)*(.7+.3*Math.sin(x/3));k.r(cx+x,74-top,1,top+1,x<-w/3?'#6c8a7a':'#527466')}k.r(cx-w,74,w*2,1,'#3a5e70')}
    // The valley's scrub in autumn, muted as the photos have it, from the slope's edge down past the foot of the screen.
    // The town along the shore at the foot of the mountain, all the way, before the scrub climbs up from it.
    {const quay=(x:number)=>136+Math.sin(x/47)*3+Math.sin(x/15)*1.5;for(let x=0;x<1100;x+=2){k.r(x,quay(x),2,22,'#7c9a66');k.r(x,quay(x)-1,2,2,'#d8dccc')}for(let i=0;i<1500;i++){const x=k.int(1100),y=quay(x)+1+k.int(18);k.r(x,y,2+k.int(3),2,['#eae6dc','#c8cccc','#a8604c','#54666e','#d8d2c4','#6e7a80'][k.int(6)])}}
    k.r(0,150,1100,170,'#3d5a40');for(let x=0;x<1100;x+=7){const y=146+Math.sin(x/40)*5+Math.sin(x/13)*2;k.r(x,y,7,12,'#3d5a40')}
    // In depth: row behind row from the coast, tiny there and larger and larger towards us, the forest's cedars standing among them under the bridge. Stamped from a set painted once, thousands being too many to paint pixel by pixel.
    {const pals=[greens[0],greens[0],['#4a4a2c','#6e5a34','#8a6a40','#a88a58'],['#4a4a2c','#6e5a34','#8a6a40','#a88a58'],['#5a3a26','#7a4a30','#9a6038','#b88048'],greens[1]],sizes=[2,3,4,6,8,11,14,18],stamps=pals.map(pal=>sizes.map(rx=>{const c=document.createElement('canvas');c.width=rx*2+6;c.height=Math.ceil(rx*1.5)+6;const g=c.getContext('2d',{willReadFrequently:true})!;softCrown((x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))},k.rand,rx+3,rx*.72+3,rx,rx*.72,pal);return c}));
      for(let y=146;y<336;){const t=Math.min(1,(y-146)/174),size=7*t**1.05,step=2+t**1.4*12;for(let x=-16+k.rand()*step*2;x<1110;x+=step*(.8+k.rand()*.9)){const i=Math.min(7,Math.max(0,Math.round(size+k.rand()*1.6-.8))),stamp=stamps[k.int(pals.length)][i],top=y-stamp.height+2+Math.sin(x/40)*5*(1-t);k.g.drawImage(stamp,Math.round(x-stamp.width/2),Math.round(top))}
        if(y>186)for(let n=0;n<5;n++){const x=96+k.int(548);if(k.rand()<.28+t*.3)k.cedar(x,y+4,10+t*t*54+t*18)}
        y+=1.2+t**1.4*9}
      // The air between: the far scrub paling and greying towards the coast.
      for(let y=142;y<236;y++){k.g.fillStyle=`rgba(112,150,132,${.48*(1-(y-142)/94)**1.6})`;k.g.fillRect(0,y,1100,1)}}
    // The grass: the end on Uchimi's side, then Horai rising to the summit, its crest level against the lake; patched with dry grass, sasa along the crest, as autumn leaves it.
    k.ground(0,196,96,124,'#7f9a58','#6e8a4e');for(let x=640;x<1100;x+=2){const y=horaiTop(x);k.ground(x,y,2,320-y,'#7f9a58','#6e8a4e',(320-y)/30);k.r(x,y,2,1,'#b4bc80')}
    for(let i=0;i<70;i++){const x=660+k.int(440),rx=14+k.int(36),ry=3+k.int(6),y=horaiTop(x)+ry+6+k.int(Math.max(1,320-horaiTop(x)-20));k.ell(x,y,rx,ry,['#92a65e','#a8a464','#8aa05a'][k.int(3)])}
    for(let i=0;i<900;i++){const x=650+k.int(450),y=horaiTop(x)+2+k.int(Math.max(1,318-horaiTop(x)));k.r(x,y,1,2,['#a8b06c','#c0b878','#62804a'][k.int(3)])}
    for(let x=650;x<820;x+=26)softCrown(k.r,k.rand,x,horaiTop(x)+(x<700?6:2),9,5,greens[(x/26|0)%3]);
    for(let x=796;x<1100;x+=7){const h=2+k.int(4);k.r(x,131-h,6,h+2,['#5f7f48','#6e8c50','#4e6e40'][k.int(3)]);k.r(x+2,130-h,1,2,'#8aa660')}
    for(let y=256;y<326;y+=9){softCrown(k.r,k.rand,640,y,11,7,y%2?greens[0]:['#4a4a2c','#6e5a34','#8a6a40','#a88a58']);if(y>262)softCrown(k.r,k.rand,96,y,11,7,y%2?greens[0]:['#5a3a26','#7a4a30','#9a6038','#b88048'])}
    for(const [x,y] of [[20,206],[60,204]] as const)k.r(x,y-16,3,16,'#5a3e2a');k.r(10,186,62,2,'#5a3e2a');
    // The track up the grass, worn pale, and the rope fence on its posts along the summit, orange stakes marking the piste.
    for(const [x,y] of horaiTrack)k.ell(x,y+1,8,5,'#c4b890');for(const [x,y] of horaiTrack.filter((_,i)=>i%3===0))k.r(x-5+k.int(8),y-2+k.int(5),3,1,'#a89c74');
    for(let x=796;x<1094;x+=30){k.r(x+1,136,2,1,'#00000030');k.r(x,124,2,12,'#7a5e44')}for(let x=796;x<1094;x+=2){const t=(x-796)%30/30,sag=Math.sin(t*Math.PI)*2;k.r(x,126+sag,2,1,'#3a2c20')}
    for(const [x,y] of [[700,262],[722,268],[744,272],[766,276],[788,278]] as const){k.r(x,y-9,1,10,'#e8742c');k.r(x+1,y,2,1,'#00000030')}
    // The nine stone Jizo, grey slabs with rounded heads, their faded bibs and shawls, on a low slab in a row along the summit, tufts of grass at their feet.
    k.r(806,150,106,3,'#a8a498');k.r(806,153,106,1,'#6a685e');
    for(let i=0;i<9;i++){const x=808+i*12,y=134+(i%2);k.r(x-1,y+18,10,2,'#00000034');k.r(x+1,y,5,1,'#9a9c92');k.r(x,y+1,7,17,'#8a8c82');k.r(x,y+1,1,17,'#a8aaa0');k.r(x+6,y+1,1,17,'#6c6e66');k.r(x+2,y+3,3,3,'#a8aaa0');k.r(x+3,y+4,1,1,'#5c5c52');k.r(x+1,y+7,5,6,['#d8d0c4','#e0c8c4','#cfd4d0'][i%3]);k.r(x+1,y+7,5,1,'#f0ece4')}
    for(let x=804;x<916;x+=6){k.r(x,153+k.int(2),4,3,'#5f7f48');k.r(x+1,151+k.int(2),1,3,'#8aa660')}
    // The stone hokyoin pagoda on its railed plinth, against the lake.
    {const x=934,y=162;k.r(x-20,y,44,3,'#00000034');k.r(x-18,y-14,40,14,'#8e9088');k.r(x-18,y-14,40,2,'#b4b6ac');k.r(x+16,y-14,6,14,'#6c6e66');for(const dx of [-18,-6,6,18])k.r(x+dx,y-20,4,8,'#a8aaa0');k.r(x-18,y-17,40,1,'#6a4a34');k.r(x-10,y-26,24,8,'#9a9c92');k.r(x-10,y-26,24,1,'#bcbeb4');k.r(x-6,y-37,16,11,'#8e9088');k.r(x-1,y-35,1,8,'#5c5c52');k.r(x-13,y-43,30,6,'#a8aaa0');k.r(x-9,y-46,22,3,'#9a9c92');k.r(x-13,y-38,30,1,'#6c6e66');k.r(x-1,y-50,6,4,'#8e9088');for(let i=0;i<5;i++)k.r(x+i%2,y-54-i*3,4,2,'#8a8c82');k.r(x+1,y-70,2,2,'#8a8c82')}
    // The bell of the far shore: a cairn of dark stones, the bronze disc over its name plate, the bell hung in the hole through it, stone posts and a stone box before it.
    {const x=1022,y=166;k.r(x-20,y,44,3,'#00000034');k.ell(x+2,y-3,24,6,'#5a5e60');for(let row=0;row<38;row+=1){const w=Math.sqrt(1-(row/40)**2)*.0+17-row*row/110;k.r(x-w+2,y-4-row,w*2,1,'#585c60')}
    for(let i=0;i<120;i++){const row=k.int(38),w=17-row*row/110,sx=x+2-w+k.int(Math.max(1,w*2-3));k.r(sx,y-5-row,3+k.int(2),2,['#6e7276','#44484c','#7e7a70','#8a8e90'][k.int(4)])}
    k.ell(x+2,y-34,3,3,'#b8c4c8');k.r(x-3,y-29,10,4,'#2c2e2e');k.ell(x+2,y-18,6,7,'#c4dcea');k.r(x+1,y-23,2,1,'#3a2c20');k.r(x,y-22,4,4,'#3a2c20');k.r(x-4,y-5,4,6,'#a8aaa0');k.r(x+8,y-5,4,6,'#a8aaa0');k.r(x-1,y-6,7,5,'#8e9088')}
    // Cafe 360 on the far slope: the stepped grey-brown deck, the black net of its hammock, the dark rail round it, the tall pole.
    {const [x,y]=[992,206];for(const [dy,w,c] of [[0,96,'#8a7864'],[16,86,'#82705c'],[30,74,'#7a6854']] as const){k.r(x+(96-w)/2,y+dy,w,16,c);for(let yy=y+dy;yy<y+dy+16;yy+=4){k.r(x+(96-w)/2,yy+3,w,1,'#64564a');k.r(x+(96-w)/2,yy,w,1,'#a8967e')}k.r(x+(96-w)/2,y+dy+14,w,2,'#463c34')}
    k.r(x+6,y+3,34,11,'#23221f');for(let i=0;i<34;i+=3)k.r(x+6+i,y+3,1,11,'#54504a');for(let i=0;i<11;i+=3)k.r(x+6,y+3+i,34,1,'#54504a');k.r(x+56,y+18,22,10,'#23221f');for(let i=0;i<22;i+=3)k.r(x+56+i,y+18,1,10,'#54504a');
    k.r(x-2,y-10,100,1,'#23292e');k.r(x-2,y-6,100,1,'#23292e');for(let i=0;i<=100;i+=10)k.r(x-2+i,y-10,1,10,'#23292e');k.r(x+80,y-52,3,50,'#5a4030');k.r(x+76,y-52,11,2,'#3a2c20');k.r(x+78,y-48,7,2,'#3a2c20')}
    // The snow-making pond, black-lined, inside its fence.
    k.r(842,244,92,36,'#14262c');k.r(846,248,84,28,'#2a5a64');for(let i=0;i<9;i++)k.r(850+k.int(70),250+k.int(24),6,1,'#4f8a94');for(let x=838;x<938;x+=8)k.r(x,240,1,44,'#23292e');k.r(838,240,100,1,'#23292e');k.r(838,283,100,1,'#23292e');
    // The Sky Bridge: its two cables slung below the deck, steel frames under each panel, grating, and the mesh rail either side, the near one lifted over the traveller.
    for(const dy of [30,42])for(let x=92;x<640;x+=1){const t=(x-366)/274;k.r(x,skyDeck(x)+dy*(1-t*t)+4,1,1,'#55606a')}
    for(let x=96;x<640;x+=16){const y=skyDeck(x);k.r(x,y+18,2,5,'#6d7880');k.r(x-6,y+22,14,1,'#c8d0d4');k.r(x-6,y+23,14,1,'#55606a')}
    for(let x=92;x<640;x+=2){const y=skyDeck(x);k.r(x,y,2,18,'#6a747c');for(let yy=2;yy<18;yy+=3)k.r(x,y+yy,2,1,'#535c64');if(x%6===0)k.r(x,y,1,18,'#535c64');k.r(x,y+18,2,2,'#3e464e');k.r(x,y-9,2,1,'#e0e6ea');k.r(x,y-5,2,1,'#b4bec4');if(x%16===0)k.r(x,y-11,2,11,'#d0d6da')}
    for(const x of [90,638])k.r(x-3,skyDeck(x)-16,8,38,'#c8d0d4');
    k.above(()=>{for(let x=92;x<640;x+=2){const y=skyDeck(x);k.r(x,y+9,2,1,'#f0f4f6');k.r(x,y+13,2,1,'#c0c8ce');k.r(x,y+17,2,1,'#9aa4aa');if(x%16===0)k.r(x,y+7,2,12,'#e0e6ea')}});
  }},
  // Nikko Toshogu: in by the Nio gate through the cedars, the five-storey pagoda on the left, the plain Sacred Stable with its three monkeys on the right, then the stone stairs to the white-and-gold Yomeimon.
  toshogu:{layout:{start:[240,304],exit:[330,256],camera:[316,190],solids:[[0,0,52,320],[428,0,52,320],[0,0,480,118],[76,178,64,26],[324,194,92,44],[60,280,142,40],[278,280,142,40]],over:[[156,210,168,72],[62,30,94,174]],people:[[230,200,13,'up'],[262,166,4,'up'],[178,186,9,'right'],[300,226,2,'left'],[250,118,7,'up']],lamps:[[240,104,70,0xffe6a0,.8],[110,190,44,paper,.5],[370,240,50,warm,.5],[240,276,44,paper,.6],[196,152,30,paper,.5],[284,152,30,paper,.5]]},draw:k=>{
    const {r}=k;    k.ground(0,0,480,320,'#c9c2ab','#b5ae97');k.forest(0,0,480,70,cedars);for(const y of [84,130,176,222,268,314]){k.cedar(22,y,78);k.cedar(458,y,78);k.cedar(50-(y%3)*2,y+12,70)}
    k.stones(200,120,80,200,'#b2ac98','#9a9482');for(let i=0;i<3000;i++){const x=52+k.int(376),y=118+k.int(202);if(x<200||x>280)r(x,y,1,1,['#b5ae97','#ddd6c0','#a8a18a'][k.int(3)])}
    for(let y=126;y<158;y+=4){k.r(180,y,120,3,'#a8a290');k.r(180,y,120,1,'#c8c2ae')}k.r(90,118,300,8,'#a8a290');k.wall(50,102,150,16,'#c8452e','#3f4a46');k.wall(280,102,150,16,'#c8452e','#3f4a46');for(const x of [50,280]){r(x,114,150,4,'#7a7a6a');for(let xx=x;xx<x+150;xx+=6)r(xx,114,5,3,['#8a8a7a','#6a7a50','#5a7a44'][k.int(3)])}
    // The Yomeimon: white pillars and their carved panels, tier on tier of gilded brackets picked out in blue, green and red, the balcony between the storeys, the black roof edged in gold with its curved gable over the middle, white lions at the corners.
    const brackets=(x:number,y:number,w:number,rows:number)=>{r(x,y,w,rows*3,'#c89a28');for(let row=0;row<rows;row++)for(let bx=x+(row%2)*2;bx<x+w-1;bx+=4){r(bx,y+row*3,3,2,'#f0d060');r(bx+1,y+row*3+1,1,1,['#2f7a8a','#3a8a4a','#c8452e','#2a4a8a'][(bx+row)%4])}r(x,y+rows*3-1,w,1,'#8a6a18')};
    k.shade(196,118,96,4);r(194,114,92,4,'#a8a290');r(198,84,84,30,'#f6f2e6');for(const x of [198,214,230,246,262,276])r(x,84,6,30,'#ffffff'),r(x+1,88,4,22,'#d8dce4'),r(x+5,84,1,30,'#c8c4b8');for(const x of [204,252,268])for(let y=88;y<112;y+=4)r(x+3+(y%8?0:2),y,4,2,'#c8ccd4');r(230,92,22,22,'#262019');r(230,92,22,2,'#c89a28');
    brackets(194,74,92,3);r(190,70,100,4,'#f6f2e6');for(let x=192;x<288;x+=4)r(x,70,1,4,'#c89a28');r(204,58,72,12,'#f6f2e6');for(const x of [204,222,240,258,272])r(x,58,4,12,'#ffffff');for(let x=208;x<272;x+=6)r(x+2,61,2,6,['#c89a28','#2f7a8a','#c8452e'][(x/6|0)%3]);brackets(198,50,84,3);
    k.eaves(240,38,112,12,'#1e2224','#00000040','#d8a838');for(let x=184;x<298;x+=6)r(x,49,3,1,'#f0d060');for(let i=0;i<30;i++){const t=(i-15)/15;r(240+t*18,41-(1-t*t)*7,2,2,'#d8a838')}k.ell(240,40,10,4,'#1e2224');r(230,40,20,1,'#f0d060');
    for(const x of [184,296]){r(x-3,46,6,4,'#f4f2ea');r(x-2,44,3,2,'#f4f2ea')}
    k.above(()=>{k.pagoda(108,202,5,72,'#b5402f','#3f4a46',26);for(let i=0;i<5;i++){const b=(72-i*72*.09)/2-6;k.r(108-b,202-(i+1)*26+6,b*2,1,'#d8a838')}});
    // The Sacred Stable: the one unpainted building; three monkeys on its lintel.
    k.hall(370,178,104,18,40,'#8a6e50','#5a4e3c','#5a4630','#3a2e24');k.r(334,197,60,13,'#6e543c');for(let i=0;i<3;i++){const x=340+i*18;k.r(x,200,8,8,'#d8cfae');k.r(x+2,198,4,4,'#e8e0c4');k.r(x+1+(i===1?-1:0),[201,199,203][i],6,2,'#7a5a3a')}
    for(const x of [186,290])k.stoneLantern(x,136);for(const [x,y] of [[160,210],[320,250],[150,250]])k.stoneLantern(x,y);
    k.above(()=>k.gate(240,282,160,'#b5402f','#3f4a46',40,'#d8a838'));for(const x of [176,296]){k.r(x,256,12,24,'#c8452e');k.r(x+2,258,8,6,'#e8735a');k.r(x+3,264,6,14,'#e0604a')}k.r(60,282,142,14,'#c8452e');k.r(278,282,142,14,'#c8452e');k.eaves(131,274,146,8,'#3f4a46');k.eaves(349,274,146,8,'#3f4a46');k.ground(60,296,142,24,'#a59e88','#918a76');k.ground(278,296,142,24,'#a59e88','#918a76');
  }},
  // Kanmangafuchi: the path along the gorge under the mixed wood, its little channel running along the mossy stone wall, the long uneven row of seated Jizo on their pedestals, red caps and bibs, moss in their laps, some lost; below, the Daiya running turquoise and white over grey boulders, a fall coming down at the end.
  kanmangafuchi:{layout:{start:[22,200],exit:[6,170],camera:[440,180],solids:[[0,0,480,170],[0,232,480,88]],people:[[200,206,8,'left'],[320,212,4,'up']],lamps:[[120,194,50,warm,.4],[300,194,50,warm,.4],[440,270,40,cool,.4]]},draw:k=>{
    const {r}=k;
    // The wood up the slope: cedars dark among maples and oaks on the turn.
    k.forest(0,0,480,124,greens[1]);for(let i=0;i<24;i++)softCrown(r,k.rand,k.int(480),20+k.int(90),8+k.int(8),6+k.int(4),[turning,['#5a3a26','#8a4a2c','#b8683a','#d89050'],greens[2]][k.int(3)]);for(let x=14;x<480;x+=40+k.int(16))k.cedar(x,122+k.int(6),56+k.int(16));
    // The wall: field stones, moss over their tops, the ferns in its joints.
    r(0,118,480,52,'#5a6050');for(let y=118;y<168;y+=7)for(let x=-k.int(10);x<480;x+=10+k.int(8)){const w=8+k.int(8);r(x+1,y+1,w-1,6,['#7a7e70','#6a6e60','#868a7a','#5e6256'][k.int(4)]);r(x+1,y+1,w-1,2,['#4e6e3a','#56783e','#46663a'][k.int(3)])}
    // The row: each Jizo seated on its pedestal, the red knitted cap and bib, moss thick in the lap; the odd one headless or capless.
    for(let x=10,i=0;x<470;x+=15+k.int(3),i++){const y=150+(i%3===1?1:0);k.shade(x-1,y+18,16,2);r(x,y+8,14,10,'#7a7a6e');r(x,y+8,14,2,'#9a9a8c');r(x,y+8,14,3,'#4e6e3a');
      if(i%13===7){r(x+2,y,10,8,'#8d8f84');r(x+2,y,10,2,'#4e6e3a');continue}
      r(x+2,y-4,10,12,'#8d8f84');r(x+2,y-4,2,12,'#a3a598');r(x+3,y+3,8,4,'#4a6a36');r(x+2,y+5,10,3,'#56783e');r(x+4,y+4,3,1,'#6a8a48');r(x+3,y-5,8,4,'#c8302e');r(x+2,y-1,10,3,i%5===3?'#e8e0cc':'#d8402e');r(x+4,y-1,6,1,'#f05a3e');
      r(x+4,y-12,6,7,'#9a9c90');r(x+4,y-12,2,7,'#b0b2a6');r(x+5,y-9,1,1,'#4a4a42');r(x+8,y-9,1,1,'#4a4a42');if(i%4!==2){r(x+3,y-15,8,4,'#c8302e');r(x+4,y-16,6,1,'#e04a38');r(x+3,y-13,8,1,'#8a2018')}}
    // The path: grey gravel, its channel along the wall, leaves.
    r(0,168,480,4,'#2a3a3a');for(let x=0;x<480;x+=5)r(x+k.int(3),169,2,1,'#8ab4b8');r(0,172,480,60,'#a8a290');for(let i=0;i<2400;i++)r(k.int(480),172+k.int(60),1,1,['#948e7c','#bcb6a2','#8a8472','#c8c2ae'][k.int(4)]);for(let i=0;i<60;i++)r(k.int(480),172+k.int(58),2,1,['#c8783a','#d8a040','#8a4a2c'][k.int(3)]);
    // The bank down to the river: boulders, grass and the odd shrub.
    r(0,230,480,18,'#4a5a44');for(let x=0;x<480;x+=10+k.int(10)){k.rock(x,230+k.int(8),12+k.int(14),8+k.int(6),['#7a7c72','#8e8f84','#6a6c64'][k.int(3)])}for(let x=0;x<480;x+=5)r(x,230+k.int(4),2,4,['#6a9a4a','#8ab060','#c8b878'][k.int(3)]);
    // The Daiya: turquoise and deep, paling over the shallows, white where it breaks round the lava rocks.
    gradient(r,0,246,480,74,'#3fa4b0','#2a7a8a',4);for(let i=0;i<40;i++)k.ell(k.int(480),252+k.int(64),10+k.int(20),3,'#5ac0c4');for(let i=0;i<80;i++)r(k.int(460),250+k.int(66),8+k.int(14),1,'#c8ecec');
    for(let i=0;i<18;i++){const x=k.int(450),y=254+k.int(56),w=12+k.int(26);for(let n=0;n<7;n++)r(x-w/2-6-k.int(10),y+3+k.int(8),5+k.int(12),1,'#f4fcfc');for(let n=0;n<3;n++){const ox=(n-1)*w/3+k.int(5)-2,ow=w/3+k.int(w/4)+2,oh=4+k.int(4);k.ell(x+ox,y+8,ow,oh+1,'#2e3634');k.ell(x+ox,y+6,ow,oh,['#5a5e5a','#6a6c66','#4e5452'][k.int(3)]);k.ell(x+ox-2,y+4,ow/2,2,'#8a8c84')}r(x-w/2,y+12,w,1,'#e8f6f6')}
    // The fall at the end, from the rocks above.
    r(424,226,40,50,'#4a5450');for(let i=0;i<26;i++){const x=424+k.int(36),y=226+k.int(44);r(x,y,4+k.int(5),3+k.int(3),k.int(2)?'#5c6660':'#3e4844')}for(let y=226;y<278;y++){const a=432+Math.round(Math.sin(y/5)*1.5)+k.int(2),b=453+Math.round(Math.sin(y/7+2)*2)-k.int(2);r(a,y,b-a,1,'#a8d8e0')}for(let i=0;i<70;i++){const x=434+k.int(18);r(x,226+k.int(46),1,4+k.int(9),['#ffffff','#e8f6f6','#d0ecf0','#7fbcc8'][k.int(4)])}k.ell(443,282,22,7,'#f4fcfc');for(let i=0;i<14;i++)r(424+k.int(40),276+k.int(14),2,1,'#ffffff');
  }},
  // Shinkyo: the Daiya coming down between banks overgrown to the water, white over its rocks, the vermilion bridge arched across on its two stone piers, black lacquer underneath, its rails and their capped posts; and the plain road bridge downstream, from which it is seen; over it, the shrine's stone stairs and the priest Shodo with his two snakes.
  shinkyo:{layout:{start:[60,298],exit:[18,268],camera:[132,206],solids:[[172,0,136,118],[172,150,136,100],[172,286,136,34],[0,0,480,60],[0,0,30,250],[400,0,80,250],[352,120,16,20]],people:[[250,266,6,'up'],[226,268,1,'up']],lamps:[[240,124,60,0xffb070,.6],[130,270,50,warm,.6],[350,270,50,warm,.6],[360,110,30,warm,.5]]},draw:k=>{
    const {r}=k;k.forest(0,0,480,320,cedars);for(let i=0;i<30;i++)softCrown(r,k.rand,k.int(480),k.int(60),8+k.int(8),6+k.int(4),[turning,greens[1],greens[0]][k.int(3)]);
    k.lawn(30,60,142,190,'#7a9a62','#6a8a54');k.lawn(308,60,92,190,'#7a9a62','#6a8a54');for(let i=0;i<300;i++){const x=k.rand()<.6?30+k.int(142):308+k.int(92);r(x,60+k.int(190),1,2,'#8eae70')}k.ground(0,250,172,70,'#a8a496','#969284');k.ground(308,250,172,70,'#a8a496','#969284');
    // The shrine's stone stairs up the far bank.
    r(320,60,60,70,'#a8a290');for(let y=62;y<126;y+=5){r(322,y,56,3,'#c4beaa');r(322,y,56,1,'#d8d2be');r(322,y+3,56,2,'#7e7868')}r(318,60,2,70,'#6a6458');r(380,60,2,70,'#6a6458');
    // The river: green-blue and quick, paler over the shallows, white round its rocks; the banks dark with what hangs over them.
    gradient(r,172,0,136,320,'#5aa0a4','#2e7484',6);for(let i=0;i<180;i++)r(176+k.int(124),k.int(320),4+k.int(10),1,k.int(3)?'#a6d4d8':'#e8f6f6');
    for(let i=0;i<22;i++){const x=184+k.int(108),y=6+k.int(310),w=6+k.int(12);for(let n=0;n<4;n++)r(x-2-k.int(6),y-2-k.int(4),4+k.int(8),1,'#f4fcfc');k.ell(x,y+2,w/2,3,'#2e3634');k.ell(x,y,w/2,3,['#7a7c74','#6a6c66','#8a8a80'][k.int(3)]);r(x-w/4,y-2,w/3,1,'#a8a89c')}
    for(let y=0;y<320;y++){const l=172+Math.sin(y/9)*2+Math.sin(y/23)*3,rr=304+Math.sin(y/7+1)*2+Math.sin(y/19)*3;r(l-4,y,8,1,y%3?'#3e5a3a':'#4a6a42');r(rr-4,y,8,1,y%3?'#3e5a3a':'#4a6a42')}for(let y=0;y<250;y+=5+k.int(9)){if(y>104&&y<156)continue;const s=k.int(2);k.rock(s?296+k.int(8):170+k.int(6),y+4,8+k.int(8),5,['#6a6c66','#7a7c74'][k.int(2)]);softCrown(r,k.rand,s?306-k.int(6):174+k.int(6),y,4+k.int(6),3+k.int(3),[greens[0],greens[1],cedars,turning][k.int(4)])}
    for(const [x,y] of [[60,100],[80,150],[50,200],[150,90],[430,100],[420,190],[390,210]])k.cedar(x,y,62);for(const [x,y] of [[110,130],[440,150]] as const)k.tree(x,y,['#5a3a26','#8a4a2c','#b8683a','#d89050']);
    // The bridge: the stone piers in the stream, the black underside under its arch, the vermilion girder, the deck and its two rails, every post capped.
    const arc=(x:number)=>-6*(1-((x-240)/74)**2);
    for(const px of [200,280]){k.ell(px+4,180,12,4,'#e8f6f6');r(px-4,148,16,32,'#6a6c66');r(px-4,148,4,32,'#8a8c84');r(px+10,148,2,32,'#4a4c46');r(px-4,148,16,2,'#9a9c94')}
    for(let x=166;x<314;x++){const a=arc(x);r(x,146+a,1,8+Math.abs(x-240)/12,'#1a1614');r(x,138+a,1,8,'#c8402e');r(x,140+a,1,1,'#e06a50');r(x,145+a,1,1,'#8a2a1c')}
    for(let x=166;x<314;x++){const a=arc(x);r(x,120+a,1,4,'#c8402e');r(x,124+a,1,10,'#7a3a2a');if(x%3===0)r(x,124+a,1,10,'#6a3024');r(x,134+a,1,4,'#d4502e');r(x,134+a,1,1,'#f07a5a')}
    for(let x=168;x<314;x+=12){const a=arc(x);r(x,114+a,3,8,'#c8402e');r(x,112+a,3,2,'#d8b04a');r(x,130+a,3,8,'#d4502e');r(x,128+a,3,2,'#d8b04a');r(x,138+a,1,4,'#8a2a1c')}
    for(const x of [164,312]){r(x-2,110,6,30,'#c8402e');r(x-2,108,6,3,'#d8b04a');r(x-1,106,4,2,'#2a2320')}
    // The road bridge, from which it is seen.
    r(166,250,148,36,'#6c7070');for(let i=0;i<200;i++)r(166+k.int(148),252+k.int(32),2,1,'#7a7e7e');r(166,250,148,3,'#b9bfbf');r(166,253,148,1,'#8a9090');r(166,283,148,3,'#b9bfbf');r(166,266,148,1,'#e6e3cc');for(let x=168;x<314;x+=10)r(x,246,2,6,'#b9bfbf');r(166,246,148,2,'#d4d8d8');
    // Shodo on his pedestal, his two snakes.
    k.shade(350,138,22,2);r(352,126,16,12,'#8e8a7c');r(352,126,16,2,'#aeaa9c');r(354,108,12,18,'#5a6a60');r(354,108,3,18,'#6e7e72');k.ell(360,105,5,5,'#6e7e72');for(const s of [-1,1]){r(360+s*10-2,122,4,16,'#4a6a4a');k.ell(360+s*10,121,3,2,'#5a7a5a')}
  }},
  // Kamakura: the Great Buddha in the open air on his stone platform, bronze gone green and streaked, the lotus, the incense and the vases before him, the hills behind; on the way there Hase-dera's little Jizo gathered by the hundred round a larger one and his flowers, the three smiling ones on their mossy rock, a pond of koi; Yuigahama's bay through the trees.
  'kamakura-trail':{layout:{start:[240,304],exit:[200,280],camera:[330,196],solids:[[0,0,480,70],[166,70,148,88],[226,158,28,16],[34,214,120,60],[400,60,80,180],[0,0,30,320],[330,280,150,40],[40,286,90,30],[352,224,26,14]],people:[[220,186,3,'up'],[262,190,6,'up'],[280,240,13,'left'],[180,250,9,'up']],puffs:[[240,156,0xc8c8c0]],lamps:[[240,126,70,warm,.5],[240,168,40,0xffb070,.7],[92,250,60,paper,.5],[300,250,50,warm,.4]]},draw:k=>{
    const {r}=k;k.ground(0,0,480,320,'#c4bdaa','#b3ad9b');for(let i=0;i<2500;i++)r(k.int(480),k.int(320),1,1,['#b0a996','#d4cdb8','#a8a18e'][k.int(3)]);k.forest(0,0,480,74,greens[1]);k.stones(208,144,64,176,'#b4ae9a','#9c9684');
    // The bay past the trees on the right: the sky, the sea glittering, the beach's curve, the town along it, the hills across.
    r(400,60,80,84,'#a8cce0');r(400,60,80,12,'#c8e0ec');for(let x=400;x<480;x+=2){const y=78-Math.sin(x/12)*2;r(x,y,2,4,'#7a9a8a')}gradient(r,400,82,80,40,'#5a9ac0','#3a7aa4',4);for(let i=0;i<40;i++)r(400+k.int(76),84+k.int(36),3+k.int(5),1,'#d8ecf4');for(let x=400;x<480;x++){const y=122+Math.sin(x/20)*3;r(x,y,1,4,'#f0eadc');r(x,y+4,1,4,'#d8ccaa')}for(let i=0;i<40;i++)r(400+k.int(78),130+k.int(10),3,2,['#e8e4dc','#a8604c','#6e7a80'][k.int(3)]);
    k.forest(400,140,80,100,greens[2]);for(let y=56;y<150;y+=11)softCrown(r,k.rand,402,y,12,9,greens[1]);for(let x=410;x<480;x+=16)softCrown(r,k.rand,x,60,12,8,greens[1]);
    k.at(13,()=>{
    // The platform: two steps of granite, the lotus petals round the dais.
    k.shade(166,146,152,4);r(164,124,152,22,'#8e8a7c');r(164,124,152,3,'#aeaa9c');r(164,136,152,1,'#7a766a');r(176,114,128,12,'#9e9a8c');r(176,114,128,2,'#bab6a8');for(let x=180;x<300;x+=8){k.ell(x+4,114,4,3,'#6a8478');r(x+3,112,2,1,'#8aa498')}
    // The Buddha: broad-shouldered bronze gone green, streaked darker, lit on his left; hands in his lap, the great head a little forward, the curls, the long ears, eyes lowered.
    const b='#5a7a70',d='#40584e',l='#7a9a8c',hi='#94b0a2';k.ell(240,104,56,14,d);k.ell(240,100,52,14,b);k.ell(228,98,30,8,l);r(190,70,100,34,b);r(190,70,30,34,l);r(268,70,22,34,d);k.ell(240,76,44,26,b);k.ell(226,72,22,16,l);for(let i=0;i<9;i++)r(198+i*10,78+i%2,2,24,d);
    r(218,94,44,12,d);k.ell(240,100,20,6,d);k.ell(240,99,16,5,b);r(232,96,16,4,l);k.ell(240,50,21,22,b);k.ell(232,44,11,13,l);k.ell(250,50,8,14,d);r(216,32,48,14,d);for(let y=28;y<46;y+=3)for(let x=220+(y%6?0:1);x<262;x+=3)r(x,y,2,2,y<36?hi:l);k.ell(240,27,8,4,d);
    r(216,46,4,18,d);r(260,46,4,18,d);r(217,58,3,6,l);r(227,50,10,1,'#2a3a34');r(243,50,10,1,'#2a3a34');r(238,52,4,8,l);r(238,52,1,8,hi);r(234,62,12,1,'#2a3a34');r(238,40,4,4,hi);
    for(let i=0;i<14;i++)r(196+k.int(88),74+k.int(28),1,3+k.int(6),'#3a4e46');
    });
    // Before him: the bronze vases with their lotuses, the incense burner smoking.
    k.shade(226,174,30,2);r(226,160,28,14,'#5a4a38');r(226,160,28,2,'#7a6a54');r(236,150,8,10,'#3c3a36');r(234,148,12,3,'#5a5852');for(const x of [214,260]){r(x,150,5,24,'#54504a');r(x+1,150,1,24,'#7a766e');r(x-3,146,11,5,'#7a8a70');r(x-1,142,7,4,'#e8a0b0');r(x+1,140,3,2,'#f4c8d0')}
    // The little Jizo of Hase, row on row on their stone steps, grey, a cap here and there, round the larger one and his flowers.
    for(let row=0;row<5;row++){r(34,214+row*12,120,12,['#8e8a7c','#9a9688'][row%2]);r(34,214+row*12,120,1,'#b4b0a2');for(let x=36+(row%2)*2;x<150;x+=5){const y=214+row*12,c=['#a3a598','#8e9084','#b0b2a6','#989a8e'][k.int(4)];r(x,y+4,4,6,c);k.ell(x+2,y+3,2,2,c);r(x+3,y+4,1,6,'#00000020');if(k.int(6)===0)r(x,y+1,4,2,['#c8452e','#e8c040','#3a6aa8'][k.int(3)])}}
    {const x=94,y=236;k.shade(x-8,y+22,22,2);r(x-6,y+8,14,14,'#8e9084');r(x-6,y+8,4,14,'#a8aa9e');k.ell(x+1,y+4,5,5,'#9a9c90');r(x-6,y+10,14,4,'#c8452e');for(const [fx,c] of [[-10,'#e8c040'],[-12,'#e84a6a'],[10,'#f0f0f0'],[12,'#a84ac8'],[8,'#e84a6a']] as const)k.ell(x+fx,y+18,2,2,c);r(x-12,y+20,26,3,'#4a7a3a')}
    // The three smiling Jizo on their mossy rock.
    k.shade(350,236,30,2);k.ell(365,232,15,6,'#4e7a3a');k.ell(364,231,13,5,'#6a9a50');for(const [x,h] of [[356,12],[364,11],[372,13]] as const){r(x-3,226-h+6,7,h-2,'#9a9c90');k.ell(x,226-h+4,4,4,'#a8aa9e');r(x-1,226-h+4,1,1,'#4a4a42');r(x+1,226-h+4,1,1,'#4a4a42');r(x-1,226-h+6,3,1,'#5a5a52')}
    // The koi pond in its stones, the fish turning.
    k.ell(85,301,46,15,'#6a6a60');k.ell(85,300,44,13,'#2e5a5a');k.ripples(44,290,82,22);for(const [x,y,c] of [[70,298,'#f0a030'],[96,304,'#f4f0e8'],[110,296,'#e8602a']] as const){k.ell(x,y,4,2,c);r(x+4,y,2,1,c);if(c==='#f4f0e8')r(x-1,y,2,1,'#e8602a')}for(const a of [.2,1.2,2.4,3.4,4.6,5.5])k.rock(85+Math.cos(a)*44-4,300+Math.sin(a)*14-3,8+k.int(4),5,'#7a7a70');
    for(const [x,y] of [[16,120],[70,130],[110,190],[350,110],[376,200],[20,296],[150,300],[350,296],[420,300],[460,296]])k.tree(x,y,x>300?greens[2]:greens[1]);
  }},
  // Arashiyama: the bamboo path itself, climbing and bending between brushwood fences, the culms closing in overhead and the light coming down between them in patches, a rickshaw and its puller waiting at the bend.
  arashiyama:{layout:{start:[230,304],exit:[192,280],camera:[346,160],solids:[[0,0,190,320],[270,200,210,120],[190,0,150,130],[400,0,80,200],[340,0,60,60],[352,74,30,18]],over:[[0,0,190,70],[400,0,80,70]],people:[[386,96,0,'left'],[300,170,7,'left'],[226,232,11,'up'],[244,166,3,'right']],lamps:[[230,250,60,warm,.5],[260,160,60,warm,.5],[370,110,60,warm,.5]]},draw:k=>{
    const {r}=k;
    // The path: packed earth, a darker edge where the fences stand, leaves fallen on it, the light in patches.
    const path=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#bcae88');for(let i=0;i<w*h/10;i++)r(x+k.int(w),y+k.int(h),1,1,['#a89a74','#cabe98','#9c8e6a','#d4c8a4'][k.int(4)])};
    path(190,130,80,190);path(190,130,210,70);path(340,44,60,160);
    for(let i=0;i<26;i++){const [x,y]=[[196+k.int(68),140+k.int(176)],[196+k.int(198),136+k.int(60)],[346+k.int(48),50+k.int(150)]][k.int(3)];k.ell(x,y,4+k.int(8),2+k.int(3),'#e4d8b048')}for(let i=0;i<120;i++){const [x,y]=[[190+k.int(80),130+k.int(190)],[190+k.int(210),130+k.int(70)],[340+k.int(60),44+k.int(160)]][k.int(3)];r(x,y,2,1,['#c8b858','#a8a050','#8a8a48'][k.int(3)])}
    grove(k,0,180,0,306);grove(k,276,204,206,318);grove(k,190,150,0,124);grove(k,406,74,0,196);grove(k,338,62,0,40);
    for(const [x,y,w,h] of [[180,130,10,190],[270,206,6,114],[190,124,150,6],[400,44,6,156],[334,44,6,80]] as const)r(x,y,w,h,'#7c6c4c');
    brushwood(k,178,130,12,190);brushwood(k,270,198,130,14);brushwood(k,190,116,150,14);brushwood(k,400,40,10,160);brushwood(k,330,40,10,80);
    // The canopy over the path: leaves against the light.
    k.above(()=>{for(let i=0;i<60;i++){const x=k.int(480),y=k.int(66);if(x>190&&x<400&&y>40)continue;softCrown(r,k.rand,x,y,6+k.int(8),3+k.int(3),['#2a5230','#3f7640','#62a052','#8cbc6a'])}});
    // The rickshaw, black lacquer and a red rug, its great wheel, its shafts down on the path.
    k.shade(350,90,40,3);r(354,70,22,10,'#1a1816');r(356,72,18,6,'#c8302e');r(354,62,6,10,'#1a1816');r(352,58,16,5,'#2a2826');r(370,80,26,2,'#2a2320');r(394,78,2,6,'#2a2320');k.ell(362,84,8,8,'#1a1816');k.ell(362,84,6,6,'#3a3632');for(let a=0;a<8;a++){const t=a/8*Math.PI*2;k.line(362,84,362+Math.cos(t)*6,84+Math.sin(t)*6,'#8a7a5a')}k.ell(362,84,2,2,'#c9a84a');
  }},
};

/** Heian-jingu's street: Nijo-dori where the other sights have their road, the shrine's corridor across it, the Otenmon at the end of the approach; then, south of the crossing, the Jingu-michi running on between the two museums, under the great torii (24.4 m, vermilion, gold collars, on stone skirts, a pine before its left leg, as in the photo),
 * to the Keiryu bridge over the Okazaki canal and its cherries. */
const avenues:Record<string,{layout:Avenue;draw:(k:Kit)=>void}>={
  // Kyoto Tower is seen from its street: nothing more than the camera's post on the pavement before its building.
  'kyoto-tower-road':{layout:{height:320,camera:[292,148],solids:[[0,262,480,58]]},draw:()=>{}},
  'heian-road':{layout:{height:560,camera:[308,442],solids:[[0,262,150,212],[330,262,150,212],[166,430,24,10],[290,430,24,10],[0,474,194,46],[286,474,194,46],[142,452,36,18]],over:[[136,300,208,20],[150,328,180,10],[170,320,18,98],[294,320,18,98]],lamps:[[178,444,70,warm,.8,.5],[302,444,70,warm,.8,.5],[240,372,110,0xffb070,.55],[158,458,44,0xfff6d0,.8],[322,424,44,0xfff6d0,.8],[240,496,70,warm,.5],[60,546,50,warm,.5],[420,546,50,warm,.5]]},draw:k=>{
    // Across Nijo-dori: the shrine's front, the gate in the middle of its corridor.
    gradient(k.r,0,0,480,104,'#6ea6d8','#d4e6f0',8);
    // Open sky over the shrine, its tall cedars and pines standing behind the vermilion corridor that runs on from the gate, as in the photos: white plaster between red posts, the green-tiled roof over it.
    for(const [x,y,w] of [[330,30,70],[420,52,50],[240,16,60],[40,40,70],[120,18,50]] as const){k.r(x,y,w,4,'#f4f6f4');k.r(x+8,y-3,w-20,3,'#ffffff');k.r(x+4,y+4,w-12,1,'#d8e4ec')}
    for(const [x,h] of [[12,76],[44,60],[76,90],[108,58],[140,82],[170,64],[316,62],[348,84],[376,56],[404,92],[438,70],[468,84]] as const)k.cedar(x,110,h);k.pine(58,106,1);k.pine(150,104,-1);k.pine(330,104,1);k.pine(422,106,-1);
    for(const [from,to] of [[0,194],[286,480]] as const){const w=to-from;k.r(from,112,w,24,'#efe9dd');k.r(from,130,w,6,'#c8c4b4');k.r(from,110,w,3,'#d4502e');for(let x=from?from+4:to-4-22*8;x<to;x+=22){k.r(x,110,5,26,'#d4502e');k.r(x+4,110,1,26,'#a83a22')}k.r(from,100,w,10,'#3d7a5e');for(let x=from;x<to;x+=4)k.r(x,101,1,8,'#2f6048');k.r(from,99,w,2,'#25443a');k.r(from,108,w,2,'#25443a');k.r(from,134,w,2,'#00000030')}
    k.gate(240,134,112,'#d4502e','#3d7a5e',30);
    // South of the crossing: the avenue, its wide brick pavements, the lawns.
    k.ground(0,250,480,310,'#b9b09a','#a89f8a',2000);
    k.stones(150,262,56,212,'#b3aa96','#9f9784');k.stones(274,262,56,212,'#b3aa96','#9f9784');
    k.r(206,247,68,233,'#5d625c');for(let y=268;y<474;y+=22)k.r(239,y,2,12,'#e6e3cc');k.r(204,262,2,212,'#e0dccb');k.r(274,262,2,212,'#e0dccb');for(let x=208;x<272;x+=9)k.r(x,250,5,10,'#e6e3cc');
    // The two museums, either side: the modern art's pale slabs, and the city museum's imperial crown over its brick.
    k.r(0,272,150,136,'#cfcdc4');k.r(0,272,150,6,'#8f8f88');for(let y=284;y<328;y+=14){k.r(8,y,134,9,'#6a7880');for(let x=8;x<142;x+=14)k.r(x,y,2,9,'#cfcdc4')}k.r(10,330,126,8,'#efe4c0');k.text(14,331,'京都国立近代美術館','#3d2e24',false);k.r(0,340,150,68,'#b5b3aa');for(let x=6;x<150;x+=18)k.r(x,342,10,66,'#8f9498');k.r(0,406,150,3,'#00000040');
    k.r(330,296,150,112,'#b9966e');for(let y=300;y<408;y+=5)k.r(330,y,150,1,'#a6845e');k.r(382,272,46,8,'#b9966e');k.eaves(405,264,70,8,'#4b5456');k.eaves(405,280,160,14,'#4b5456');for(const x of [346,374,424,452])k.r(x,302,14,24,'#46525a');k.r(392,350,26,58,'#2a2320');k.r(344,330,122,8,'#efe4c0');k.text(350,331,'京都市京セラ美術館','#3d2e24',false);k.r(330,406,150,3,'#00000040');
    // Lawns and pines before them.
    for(const [x,w] of [[14,136],[330,136]]){k.lawn(x,416,w,54,'#5a8559','#6c9862');k.r(x,414,w,2,'#8f8f88')}
    for(const [x,y] of [[40,462],[100,450],[370,460],[440,450]])k.pine(x,y,x%2?1:-1);
    // The great torii, its legs on their stone skirts, the top beam's ends turned up, gold at the ends and collars.
    const c='#df5526',d='#c2431c',gold='#d8b04a';
    k.above(()=>{
    k.shade(158,440,40,3);k.shade(282,440,40,3);
    for(const x of [178,302]){k.r(x-12,426,24,14,'#c2bcaa');for(let i=x-11;i<x+12;i+=4)k.r(i,426,1,14,'#a39d8c');k.r(x-12,426,24,1,'#dcd7c6');k.r(x-7,320,14,106,c);k.r(x-8,380,16,46,c);k.r(x-5,320,3,106,'#f0764a');k.r(x+4,320,3,106,d);k.r(x-8,320,16,4,gold);k.r(x-2,317,4,3,gold)}
    k.r(150,330,180,7,c);k.r(150,335,180,2,d);k.r(150,330,2,7,gold);k.r(328,330,2,7,gold);k.r(233,318,14,12,d);
    for(let x=136;x<344;x+=2){const t=(x+1-240)/104,y=Math.round(306+4*(1-t*t));k.r(x,y,2,6,c);k.r(x,y,2,1,'#f0764a');k.r(x,y+6,2,6,d)}
    k.r(136,303,3,6,gold);k.r(341,303,3,6,gold);k.ell(240,316,3,3,gold);
    });
    // The pine by its left leg, and the old lamp beside it.
    k.ground(142,452,34,14,'#5a8559','#6c9862',20);k.pine(158,462);
    for(const [x,y] of [[158,424],[322,396]]){k.r(x-1,y,2,38,'#5a4034');k.r(x-3,y-8,6,8,'#f4e4b8');k.r(x-4,y-9,8,2,'#3a2c20')}
    // The canal, its stone walls, a boat, and the vermilion rails of the bridge; Reizen-dori beyond.
    gradient(k.r,0,474,480,46,'#4a8a8c','#3a7478',4);k.mirror(0,420,480,50,472,.35);k.shimmer(0,474,480,44,1.3);for(let i=0;i<70;i++)k.r(k.int(470),476+k.int(42),4+k.int(10),1,k.int(2)?'#ffffff24':'#00000020');
    for(const y of [466,518]){k.r(0,y,480,8,'#8e887a');for(let x=0;x<480;x+=10)k.r(x+(y%20?0:5),y+1,9,3,['#a39d8c','#9a9484','#aca696'][k.int(3)]);k.r(0,y,480,1,'#c4beae')}k.r(0,474,480,2,'#00000050');
    k.ell(113,505,34,4,'#00000040');k.r(80,494,66,10,'#6a5240');k.r(80,494,66,2,'#8a7258');k.r(76,496,4,6,'#6a5240');k.r(146,496,4,6,'#6a5240');k.r(96,484,34,10,'#efe4c0');for(let x=98;x<128;x+=6)k.r(x,486,4,5,'#7a9aa4');k.r(94,482,38,3,'#3a2c20');for(const x of [86,138])k.r(x,490,6,4,'#c8452e');
    k.stones(194,470,92,52,'#b3aa96','#9f9784');k.r(206,470,68,52,'#5d625c');for(const x of [188,286]){k.r(x,468,6,56,'#c8452e');k.r(x,468,6,2,'#e8775a');for(let y=472;y<524;y+=13)k.r(x-1,y,8,3,'#a33622')}
    k.ground(0,522,480,38,'#b9b09a','#a89f8a',400);k.r(0,530,480,24,'#5d625c');for(let x=0;x<480;x+=32)k.r(x,541,16,2,'#e6e3cc');
    for(const x of [30,130,350,450])k.tree(x,456,x%100===30?blossom:greens[2]);for(const x of [60,420])k.tree(x,512,blossom);
  }},
};

export const layoutOf=(place:string)=>scenes[place]?.layout;
export const avenueOf=(place:string)=>avenues[place]?.layout;
export const hasScene=(place:string)=>!!scenes[place];
/** The way out's sign and the camera's post, as the map draws them: the box to outline, the post below it. */
export const exitBox=([x,y]:[number,number]):Box[]=>[[x,y,42,14],[x+8,y+14,3,10]];
export const cameraBox=([x,y]:[number,number]):Box[]=>[[x,y,20,14],[x+3,y-3,7,3],[x+7,y+14,3,8]];
/** The signs and the cameras' posts stand on textures of their own (`map-<place>-post-<i>`, in `postsOf`'s order), sorted with the traveller at their foot, who passes behind them as well as before; the picture only holds their shadows. */
const signPost=([x,y]:[number,number]):Box=>[x,y,42,24],cameraPost=([x,y]:[number,number]):Box=>[x,y-3,20,25];
export const postsOf=(place:string):Box[]=>{const l=scenes[place]?.layout,a=avenues[place]?.layout;return l?[signPost(l.exit),...(l.way?[signPost(l.way.at)]:[]),cameraPost(l.camera),...(l.second?[cameraPost(l.second.camera)]:[])]:a?[cameraPost(a.camera)]:[]};
const paintSign=(g:CanvasRenderingContext2D,ja:string,en:string)=>{const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};r(8,14,3,10,'#5b4a38');r(0,0,42,14,'#3d2e24');r(1,1,40,12,'#efe2c0');letter(g,3,2,ja,'#3d2e24',true);letter(g,24,5,en,'#3d2e24')};
const paintCamera=(g:CanvasRenderingContext2D)=>{const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y+3,w,h)};r(7,14,3,8,'#665c49');r(0,0,20,14,'#f1dfb6');r(3,-3,7,3,'#e5c997');r(9,3,8,8,'#3e6871');r(11,5,4,4,'#9ec8c0');r(2,3,3,2,'#b66a51');r(0,13,20,2,'#a7916a')};
/** A place's posts, once: their shadows on its picture (`k`), themselves on their textures. */
const standPosts=(scene:Phaser.Scene,place:string,k:Kit)=>{const l=scenes[place]?.layout,signs:[string,string][]=l?[['出口','EXIT'],...(l.way?[[l.way.ja,l.way.sign] as [string,string]]:[])]:[];
  postsOf(place).forEach(([x,y,w,h],i)=>{const sign=signs[i];if(sign)k.shade(x+6,y+23,10,2);else k.shade(x+4,y+24,12,2);const key=`map-${place}-post-${i}`;if(scene.textures.exists(key))return;const post=mapCanvas(scene,key,w,h);if(sign)paintSign(post.context,...sign);else paintCamera(post.context);post.refresh()})};
const seedOf=(place:string)=>[...place].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
/** Whether anything was painted on a layer. */
const painted=(c:HTMLCanvasElement)=>c.getContext('2d')!.getImageData(0,0,c.width,c.height).data.some(alpha=>alpha>0);
/** Lift the parts of a finished picture out of it: above the traveller, and above the night. */
const lift=(scene:Phaser.Scene,place:string,picture:HTMLCanvasElement,top:HTMLCanvasElement,{over,lit}:{over?:Box[];lit?:Box[]},w:number,h:number,glow?:HTMLCanvasElement)=>{for(const [name,boxes,from] of [['over',over,painted(top)?top:picture],['lit',lit,glow&&painted(glow)?glow:picture]] as const)if(boxes){const lifted=mapCanvas(scene,`map-${place}-${name}`,w,h);lifted.context.imageSmoothingEnabled=false;for(const [x,y,bw,bh] of boxes)lifted.context.drawImage(from,x*2,y*2,bw*2,bh*2,x,y,bw,bh);lifted.refresh()}};
/** The layer of what `above` paints, as large as the picture and in its art px. */
const topLayer=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d',{willReadFrequently:true})!;g.scale(2,2);return g};
/** What an avenue paints over makeSightRoad's street, its picture's height, and the lifting done once it stands. */
export function dressRoad(scene:Phaser.Scene,place:string){const avenue=avenues[place],top=topLayer(480,avenue.layout.height),glow=topLayer(480,avenue.layout.height);return {height:avenue.layout.height,dress:(g:CanvasRenderingContext2D)=>{const k=kit(g,seedOf(place),top,glow);avenue.draw(k);standPosts(scene,place,k)},lifted:(picture:HTMLCanvasElement)=>lift(scene,place,picture,top.canvas,avenue.layout,480,avenue.layout.height,glow.canvas)}}
/** A place's picture, once: `map-<place>`, with `map-<place>-over`, the boxes of it the traveller walks under, and `map-<place>-lit`, those that shine through the night. */
export function makeScene(scene:Phaser.Scene,place:string){
  if(scene.textures.exists('map-'+place))return;
  const {layout,draw}=scenes[place],w=layout.width??480,h=layout.height??320,texture=mapCanvas(scene,'map-'+place,w,h),g=texture.context,top=topLayer(w,h),glow=topLayer(w,h),k=kit(g,seedOf(place),top,glow);
  draw(k);
  standPosts(scene,place,k);
  texture.refresh();
  lift(scene,place,g.canvas,top.canvas,layout,w,h,glow.canvas);
  (layout.stands??[]).forEach(([x,y,bw,bh],i)=>{const stand=mapCanvas(scene,`map-${place}-stand-${i}`,bw,bh);stand.context.imageSmoothingEnabled=false;stand.context.drawImage(top.canvas,x*2,y*2,bw*2,bh*2,0,0,bw,bh);stand.refresh()});
}
/** A picture painted with the scenes' painters for a place that is no album page (outing.ts): `map-<key>`, `w`×`h` art px, and `map-<key>-lit`, the `lit` boxes of what `shine` and `night` paint. */
export function paintScene(scene:Phaser.Scene,key:string,w:number,h:number,draw:(k:Kit)=>void,lit?:Box[]){
  if(scene.textures.exists('map-'+key))return;
  const texture=mapCanvas(scene,'map-'+key,w,h),g=texture.context,top=topLayer(w,h),glow=topLayer(w,h),k=kit(g,seedOf(key),top,glow);
  draw(k);texture.refresh();lift(scene,key,g.canvas,top.canvas,{lit},w,h,glow.canvas);
}
export { gradient, greens, type Kit };
