/** Each sight's own screen, laid out after the real place (sources in REFERENCES.md) and the traveller's photos: a 480×320 art px map, drawn on first use by makeScene, seen in the street's three-quarter view.
 * `Layout`, in art px: `start` the way in, `exit` the sign out and `camera` its post, each with its foot clear of `solids`, `lamps` as Lamp in main.ts, `lit` the boxes of the picture that shine through the night,
 * `over` the boxes lifted above the traveller (a gate's roof, a lantern), cut from what the scene paints through `above`, so its own shape and not the ground round it, `puffs` what drifts up from a spot (smoke, spray), `width` and `height` a map larger than the screen, which then scrolls, `stands` the boxes of what `above` paints that are cut out one by one and sorted with the traveller at their foot (a tree beside the path, passed on either side), `way` a second signpost on to another screen of the place, `out` where the exit sign leads instead of the street.
 * Art px × 2 = scene px. An `Avenue` is a street before a sight drawn over makeSightRoad's: the same road, stop and Uber at the same places, its picture going on below. */
import Phaser from 'phaser';
import { letter, mapCanvas, softCrown } from './art';

export type Box=[number,number,number,number];
export type Glow=[number,number,number,number?,number?,number?];
export interface Layout {start:[number,number];exit:[number,number];camera:[number,number];solids:Box[];lamps?:Glow[];lit?:Box[];over?:Box[];stands?:Box[];puffs?:[number,number,number][];width?:number;height?:number;way?:{at:[number,number];to:string;ja:string;sign:string;en:string};out?:{to:string;at:[number,number];en:string}}
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

/** The painters every scene shares. */
function kit(g:CanvasRenderingContext2D,seed:number,top:CanvasRenderingContext2D){
  let lifting=false;
  const r:Paint=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));if(lifting){top.fillStyle=c;top.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}};
  /** `paint` on the picture and on the layer the `over` boxes are cut from, so that they lift its own shape and not the ground around it. A scene that paints nothing here lifts its boxes whole. */
  const above=(paint:()=>void)=>{lifting=true;paint();lifting=false};
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},int=(n:number)=>Math.floor(rand()*n);
  const text=(x:number,y:number,t:string,c='#f4e4b8',big=true)=>{letter(g,x,y,t,c,big);if(lifting)letter(top,x,y,t,c,big)};
  const ground=(x:number,y:number,w:number,h:number,base:string,fleck:string,n=w*h/60)=>{r(x,y,w,h,base);for(let i=0;i<n;i++)r(x+int(w),y+int(h),2,1,fleck)};
  const ell=(cx:number,cy:number,rx:number,ry:number,c:string)=>{for(let y=-ry;y<ry;y++){const w=rx*Math.sqrt(Math.max(0,1-((y+.5)/ry)**2));r(cx-w,cy+y,w*2,1,c)}};
  const stones=(x:number,y:number,w:number,h:number,c='#bdb7a2',line='#9f9986')=>{r(x,y,w,h,c);for(let yy=y;yy<y+h;yy+=7){r(x,yy,w,1,line);for(let xx=x+(yy%14?0:6);xx<x+w;xx+=12)r(xx,yy,1,7,line)}};
  const shade=(x:number,y:number,w:number,h=4)=>r(x,y,w,h,'#00000030');
  /** A tiled roof: `h` rows flaring to `w` at the eaves, its corners turned up; (cx,y) the ridge. */
  const eaves=(cx:number,y:number,w:number,h:number,tile:string,rib='#00000030',edge='#2c3032')=>{
    for(let i=0;i<h;i++){const t=i/(h-1||1),o=w*(.6+.4*t**2.2);r(cx-o/2,y+i,o,1,tile);if(i%3===2)r(cx-o/2,y+i,o,1,rib);else if(i>=h*.3)for(let x=cx-w/2+3;x<cx+w/2-2;x+=4)if(Math.abs(x-cx)<o/2-1)r(x,y+i,1,1,rib)}
    r(cx-w/2,y+h,w,2,edge);r(cx-w/2-2,y+h-2,3,3,edge);r(cx+w/2-1,y+h-2,3,3,edge);r(cx-w*.3-1,y-1,w*.6+2,2,edge);r(cx-w*.3-3,y-3,3,3,edge);r(cx+w*.3,y-3,3,3,edge);
  };
  /** A hall from the front: the roof, then a wall of posts and shadow, the door in the middle; foot at y+rh+wh. */
  const hall=(cx:number,y:number,w:number,rh:number,wh:number,wall:string,tile:string,post='#3f2e24',door='#2a2320')=>{
    const b=w-16,top=y+rh;shade(cx-b/2-2,top+wh,b+6);r(cx-b/2,top,b,wh,wall);r(cx-b/2,top+2,b,3,'#00000040');for(let x=cx-b/2;x<cx+b/2;x+=14)r(x,top,3,wh,post);r(cx-b/2,top+wh-2,b,2,post);r(cx-Math.min(16,b/6),top+wh*.3,Math.min(32,b/3),wh*.7,door);eaves(cx,y,w,rh,tile);
  };
  const pagoda=(cx:number,foot:number,n:number,w0:number,wall:string,tile:string,step=15)=>{
    shade(cx-w0/2,foot,w0+4);r(cx-1,foot-n*step-20,2,20,'#c9a84a');for(let i=0;i<4;i++)r(cx-3+i,foot-n*step-16+i*4,6-2*i,1,'#e0c060');
    for(let i=n-1;i>=0;i--){const w=w0-i*(w0*.09),y=foot-(i+1)*step;r(cx-w/2+6,y+6,w-12,step-6,wall);r(cx-2,y+8,4,step-8,'#2a2320');eaves(cx,y,w,7,tile)}
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
  const pine=(x:number,y:number,flip=1)=>{shade(x-12,y+1,26,3);for(let i=0;i<18;i++)r(x+flip*Math.round(Math.sin(i/5)*6)-2,y-i,5,1,i%4?'#5a4034':'#46322a');for(const [dx,dy,w] of [[-10,-24,12],[9,-18,11],[2,-32,10]])softCrown(r,rand,x+flip*dx,y+dy,w,5,pines)};
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
  return {r,rand,int,text,ground,ell,stones,shade,eaves,hall,pagoda,gate,torii,stoneLantern,lantern,tree,cedar,pine,forest,ridge,water,mirror,ripples,reflect,at,inside,above,rock,fence,wall,jizo};
}
type Kit=ReturnType<typeof kit>;
const greens=[['#2f5a4e','#3f7558','#5a8c66','#7fa77a'],['#345d48','#487951','#63905b','#86a367'],['#3d5e3e','#557d45','#74995a','#a3b86e']] as const,cedars=['#1f3f33','#2b5242','#3a6a50','#4e8060'] as const,pines=['#234a38','#2f6048','#44795a','#6a9a70'] as const;
const turning=['#6a7a38','#8d9a45','#b3b558','#d6cf78'] as const;
const blossom=['#a86e7c','#c98596','#e9a6ad','#f6c7bb'] as const;

/** A stand of bamboo, `kind` its stalks' colour: green, the black 黒竹 or the golden 金明竹. */
function grove(k:Kit,x:number,w:number,top:number,foot:number,kind:'green'|'black'|'gold'='green'){
  const [o,b,l]=kind==='black'?['#1f1d1c','#3b3531','#6a5e52']:kind==='gold'?['#7a6a2c','#c9a93e','#ecd878']:['#2c5232','#62a052','#a6d27a'];
  k.r(x,top,w,foot-top,'#203c2c');
  for(let i=0;i<w/5;i++){const sx=x+i*5+(i%2);k.r(sx-1,top,5,foot-top-(i%3)*2,o);k.r(sx,top,3,foot-top-(i%3)*2,b);k.r(sx+1,top,1,foot-top-(i%3)*2,l);for(let y=top+6+(i*7)%12;y<foot-4;y+=14)k.r(sx-1,y,5,1,o)}
  for(let i=0;i<w/8;i++)for(let n=0;n<3;n++)k.r(x+k.int(w),top+k.int(foot-top-4),3,1,kind==='gold'?'#7fa04a':'#7fb069');
}
/** Woven brushwood, Arashiyama's and the Rakusai park's fence. */
const brushwood=(k:Kit,x:number,y:number,w:number,h=12)=>{k.r(x,y,w,h,'#7a6038');for(let xx=x;xx<x+w;xx+=2)k.r(xx,y+1,1,h-2,xx%4?'#9c7f4c':'#5f4a2c');k.r(x,y,w,2,'#4e3c26');k.r(x,y+h-3,w,1,'#4e3c26')};
/** A wooden town house: tiled eave, lattice, a noren and its lantern; foot at y+24. */
function machiya(k:Kit,x:number,y:number,w:number,color:string){k.r(x,y+8,w,16,'#5a4232');for(let xx=x+2;xx<x+w-2;xx+=3)k.r(xx,y+10,1,12,'#3c2c22');k.r(x+w/2-7,y+11,14,5,color);k.r(x+w/2-7,y+16,14,8,'#2a2320');k.eaves(x+w/2,y,w+2,8,'#4b5456');k.r(x,y+24,w,3,'#00000030')}

/** The Mirror Pond's shore, row by row: a far from even oval, its coves on either side. */
const kyoko=(y:number):[number,number]=>{const reach=204*Math.sqrt(Math.max(0,1-Math.abs((y-172)/84)**2.4)),cove=(at:number,wide:number,deep:number)=>deep*Math.exp(-(((y-at)/wide)**2));return [240-reach*(.86+.14*Math.sin(y/13+1))+cove(214,13,36)+cove(128,10,22),240+reach*(.88+.12*Math.sin(y/17+3))-cove(150,12,34)-cove(232,9,26)]};
const kyokoRows=Array.from({length:43},(_,i):Box=>{const y=88+i*4,[l,r]=kyoko(y+2);return [l,y,r-l,4]});
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
  // Senso-ji: up Nakamise's stalls and under the Hozomon with its great lantern to the incense burner, the main hall ahead, the pagoda to its left.
  asakusa:{layout:{start:[240,304],exit:[208,284],camera:[330,160],solids:[[140,0,200,122],[52,0,42,122],[225,142,30,20],[176,206,46,28],[258,206,46,28],[140,240,64,80],[276,240,64,80],[0,0,28,320],[452,0,28,320]],over:[[172,160,136,52],[232,206,16,14]],puffs:[[240,134,0xc8c8c0]],lamps:[[240,212,30,0xffb070],[240,112,44,paper],[240,190,70,warm,.6,.5],[210,276,50,paper,.8],[270,276,50,paper,.8],[240,150,40,0xffb070,.7]]},draw:k=>{
    k.ground(0,0,480,320,'#c4bdaa','#b3ad9b');k.stones(204,232,72,88,'#b7b09c','#a09a88');k.stones(214,120,52,60);
    k.forest(0,0,480,44,greens[1]);for(const [x,y] of [[20,120],[20,190],[20,260],[460,110],[460,180],[460,250],[110,285],[380,285],[410,110]])k.tree(x,y);
    k.pagoda(72,122,5,40,'#b5402f','#4d5a5c',15);
    k.hall(240,44,204,34,44,'#c0442f','#4d5a5c');k.r(180,110,120,12,'#a8a294');for(let y=112;y<122;y+=3)k.r(180,y,120,1,'#8f8a7c');k.r(216,84,48,8,'#d8c9a0');k.lantern(204,95);k.lantern(270,95);
    // The burner: three bronze legs, its bowl, its little roof.
    k.shade(226,160,30);k.r(228,150,4,10,'#3c3a36');k.r(248,150,4,10,'#3c3a36');k.r(226,146,28,8,'#54504a');k.r(226,146,28,2,'#7a7468');k.r(236,136,8,10,'#4c4842');k.eaves(240,130,24,6,'#4c4842');
    k.above(()=>k.gate(240,234,128,'#b5402f','#4d5a5c',36));
    // The Hozomon's 小舟町 lantern, hanging in the way through.
    k.above(()=>{k.ell(240,212,8,9,'#c8452e');k.r(232,204,16,2,'#2a2320');k.r(232,219,16,2,'#2a2320');k.r(238,206,4,12,'#2a2320')});
    for(const [x,w] of [[140,64],[276,64]])for(let y=240;y<320;y+=21){k.r(x,y+6,w,15,'#e4d3a8');k.r(x+(x<240?w-14:2),y+8,12,11,'#6e4630');k.r(x+(x<240?4:18),y+9,w-22,5,['#e0c070','#d07a5a','#7ab0a0','#e9a6ad'][k.int(4)]);k.r(x,y,w,7,'#b5402f');for(let xx=x;xx<x+w;xx+=4)k.r(xx,y+1,1,6,'#8c2e22');k.lantern(x<240?x+w-3:x-3,y+10,'#e8735a')}
  }},
  // Shibuya: the scramble itself, zebras in every direction, Hachiko's plaza in the corner by the station, QFRONT's screen ahead and the silver cylinder at the fork.
  'shibuya-crossing':{layout:{start:[108,292],exit:[14,226],camera:[420,186],solids:[[0,0,480,104],[318,252,162,68],[56,250,30,22],[0,290,28,30]],lit:[[196,52,88,38],[20,54,56,14],[92,62,50,14],[310,58,40,14],[340,262,120,16]],lamps:[[240,120,120,cool,.8,.4],[100,240,80,warm,.7],[400,120,90,warm,.6,.4],[240,180,150,0xffffff,.45]]},draw:k=>{
    k.ground(0,0,480,320,'#6a6e70','#5e6264');
    const zebra=(x:number,y:number,w:number,h:number,across:boolean)=>{for(let i=0;i<(across?w:h);i+=9)across?k.r(x+i,y,5,h,'#e6e3cc'):k.r(x,y+i,w,5,'#e6e3cc')};
    zebra(120,118,250,20,true);zebra(120,226,250,20,true);zebra(96,138,20,88,false);zebra(372,138,20,88,false);
    for(let i=0;i<88;i+=3){for(const [x0,d] of [[124,1],[364,-1]] as const){if(i%9<6){k.r(x0+d*i*2.6,138+i,14,3,'#e6e3cc')}}}
    // The buildings, their faces all signs.
    let x=-4,n=0;for(const w of [84,62,48]){k.r(x,44,w-2,62,['#3e444c','#4a4650','#3a4048'][n]);for(let wy=74;wy<100;wy+=7)for(let wx=x+4;wx<x+w-8;wx+=6)k.r(wx,wy,4,4,'#d8c890');k.r(x+22-(n?10:0),54+n*8,w-26,14,['#e0483a','#f0c030','#34b6e0'][n]);x+=w;n++}
    k.r(190,36,100,70,'#2f3a44');k.r(196,52,88,38,'#34b6e0');k.r(200,56,36,30,'#e8f4f8');k.r(240,56,40,14,'#d060b0');k.r(240,72,40,14,'#f0c030');k.text(204,62,'渋谷','#1d5fae');k.r(190,92,100,14,'#c8dde0');for(let wx=194;wx<288;wx+=12)k.r(wx,92,2,14,'#2f3a44');
    k.r(296,44,70,62,'#454a54');k.r(310,58,40,14,'#e0483a');for(let wy=78;wy<100;wy+=7)for(let wx=300;wx<360;wx+=7)k.r(wx,wy,4,4,'#a8c4cc');
    // The cylinder at the fork.
    k.ell(420,92,44,14,'#aab0b6');k.r(376,44,88,50,'#c4c9ce');for(let wx=380;wx<462;wx+=10)k.r(wx,44,2,50,'#8e959c');k.r(376,52,88,10,'#e0e4e8');k.text(396,52,'109','#c8452e');k.r(376,94,88,10,'#dfe3e6');
    k.r(0,104,480,12,'#a9aaa6');k.r(0,114,480,2,'#e0dccb');
    // The plaza: paving, tree beds, the dog on his plinth.
    k.stones(0,246,318,74,'#a8a699','#928f83');k.r(0,244,318,2,'#e0dccb');k.stones(0,230,86,16,'#a8a699','#928f83');k.r(56,262,28,10,'#7a7a70');k.r(56,262,28,2,'#94948a');k.r(64,252,12,10,'#6a5a3c');k.r(62,246,7,8,'#7a6a4a');k.r(61,245,3,3,'#6a5a3c');k.r(76,250,3,5,'#6a5a3c');
    k.tree(14,300,greens[1]);k.tree(180,290,greens[2]);k.tree(250,296,greens[1]);
    k.r(318,252,162,68,'#3a4048');for(let wx=326;wx<474;wx+=8)for(let wy=284;wy<316;wy+=8)k.r(wx,wy,5,5,'#c8d0a8');k.r(340,262,120,16,'#f0c030');k.text(372,265,'渋谷','#2a2320');k.r(318,250,162,2,'#e0dccb');
  }},
  // Meiji-jingu: the forest, and the gravel approach turning a right angle: the sake casks and Burgundy's wine facing across it, then the plain wooden torii and the south gate.
  meiji:{layout:{start:[94,304],exit:[64,276],camera:[212,206],solids:[[0,0,60,320],[128,236,352,84],[60,0,230,170],[350,0,130,236],[280,0,80,88]],over:[[266,90,108,26],[290,116,8,12],[342,116,8,12]],lamps:[[320,130,54,warm,.5],[320,78,44,paper,.8],[94,220,60,warm,.5],[210,200,80,warm,.45,.5]]},draw:k=>{
    k.forest(0,0,480,320,greens[0]);for(const [x,y,w,h] of [[60,170,68,150],[60,170,290,66],[290,36,60,200]]){k.ground(x,y,w,h,'#d0c9b2','#bab39c');k.r(x,y,w,1,'#a59e88')}
    for(const [x,y] of [[30,180],[40,270],[150,70],[210,60],[250,120],[390,70],[420,160],[380,220],[440,270]])k.cedar(x,y,70);for(let x=132;x<480;x+=26)k.cedar(x,300,50);
    // The sake casks, white with painted labels, stacked in four rows.
    k.r(130,118,150,52,'#3e3024');for(let row=0;row<4;row++)for(let x=132;x<276;x+=12){const y=121+row*12;k.ell(x+6,y+6,6,6,['#f2ecdc','#ece4cf'][(x+row)%2]);k.r(x+3,y+3,6,6,['#c8452e','#1d5fae','#2a7a58','#d4a93a','#2a2320'][k.int(5)]);k.r(x+5,y+4,2,4,'#f8f4e4')}k.eaves(205,108,160,10,'#5a4a3a');
    // The wine barrels, across the way, on their racks.
    k.r(140,244,128,4,'#3e3024');k.r(140,262,128,4,'#3e3024');for(let row=0;row<2;row++)for(let x=142;x<262;x+=20){const y=238+row*14;k.r(x,y,18,13,'#7a4a30');k.r(x,y+1,18,1,'#a07048');k.r(x+4,y,2,13,'#a9aaa6');k.r(x+12,y,2,13,'#a9aaa6');k.r(x+8,y+5,3,3,'#3c2418')}
    k.above(()=>k.torii(320,150,62,56,'#a08a68','#857254','#ffffff24'));
    k.hall(320,36,110,20,32,'#8a6a48','#3f6358');k.r(304,62,32,26,'#1f1a15');
  }},
  // Ginza: the 4-chome crossing, the Wako clock on its corner and the glass drum opposite; Chuo-dori closed to cars, tables and parasols on the road.
  ginza:{layout:{start:[240,304],exit:[192,278],camera:[276,158],solids:[[0,0,188,146],[292,0,188,146],[0,212,188,108],[292,212,188,108]],lit:[[300,60,60,76],[150,58,28,26]],lamps:[[176,160,44,warm,.8],[304,160,44,warm,.8],[176,206,44,warm,.8],[304,206,44,warm,.8],[240,260,80,warm,.5],[160,70,30,0xfff6d0],[330,100,90,cool,.7]]},draw:k=>{
    k.ground(0,0,480,320,'#6a6e70','#5e6264');for(const [x,y,w,h] of [[0,146,188,6],[292,146,188,6],[0,206,188,6],[292,206,188,6],[182,0,6,146],[292,0,6,146],[182,212,6,108],[292,212,6,108]])k.stones(x,y,w,h,'#b9bab6','#a5a6a2');
    for(let x=194;x<288;x+=9){k.r(x,134,5,12,'#e6e3cc');k.r(x,212,5,12,'#e6e3cc')}for(let y=156;y<206;y+=9){k.r(176,y,12,5,'#e6e3cc');k.r(292,y,12,5,'#e6e3cc')}
    // Wako: pale stone, its curve at the corner, the clock tower over it.
    k.r(0,36,182,104,'#d0c8b4');for(let y=66;y<128;y+=15)for(let x=6;x<130;x+=16)k.r(x,y,8,11,'#5c6e78');k.r(130,70,52,70,'#dcd4c0');for(let x=134;x<178;x+=10)k.r(x,86,6,38,'#5c6e78');k.r(0,128,182,4,'#a89f8a');k.r(0,132,182,8,'#3a3e40');
    k.r(146,38,36,34,'#c4bca8');k.ell(164,58,12,12,'#f6f0dc');k.ell(164,58,11,11,'#fbf8ec');k.r(164,50,1,8,'#2a2320');k.r(164,58,6,1,'#2a2320');k.r(144,36,40,3,'#6b7a6e');
    // The glass drum.
    k.r(298,44,70,92,'#a8c4cc');k.ell(333,44,35,8,'#c8dde0');for(let x=302;x<366;x+=9)k.r(x,44,2,92,'#7a9aa4');for(let y=52;y<134;y+=9)k.r(298,y,70,1,'#e4eff2');k.r(368,44,112,92,'#4a4e56');for(let y=54;y<130;y+=9)for(let x=374;x<474;x+=8)k.r(x,y,5,5,'#c8d0a8');k.r(298,128,182,12,'#2f3a40');k.r(306,130,54,8,'#c8dde0');
    // The blocks to the south, seen from over their roofs.
    for(const x of [0,298]){k.r(x,218,182,102,'#8a8d90');for(let yy=226;yy<318;yy+=16)for(let xx=x+8;xx<x+174;xx+=24){k.r(xx,yy,16,8,'#7a7d80');k.r(xx+2,yy+2,5,4,'#a0a4a8')}}k.r(20,240,60,30,'#caa24a');k.r(24,244,52,22,'#e0bc60');k.text(30,250,'銀座','#5a3c18');
    for(const [x,c] of [[208,'#c8452e'],[262,'#34b6e0']] as const){k.shade(x-8,272,24);k.r(x-1,254,2,18,'#5b6558');for(let i=0;i<7;i++)k.r(x-2-i*2,250+i,5+i*4,1,c);k.r(x-9,268,4,4,'#e8e4d4');k.r(x+7,268,4,4,'#e8e4d4')}
  }},
  // Odaiba: the bay and the Rainbow Bridge over it, the city behind; the little Statue of Liberty on its deck, the beach, the boardwalk, the television building's ball.
  odaiba:{layout:{start:[60,298],exit:[18,268],camera:[220,176],solids:[[0,0,480,150],[350,104,44,60],[330,214,150,106]],lit:[[0,76,480,10],[364,100,12,4]],lamps:[[160,110,30,0xffffff,.8],[300,110,30,0xffffff,.8],[230,110,60,cool,.6],[370,112,40,0xc8ffe8,.9],[120,276,60,warm,.7],[260,276,60,warm,.7]]},draw:k=>{
    k.r(0,0,480,100,'#b7d4dc');for(let x=0;x<480;){const w=8+k.int(14),h=8+k.int(26);k.r(x,86-h,w-1,h,['#8ea2ae','#9aaeb6','#7f96a4'][k.int(3)]);for(let y=88-h;y<84;y+=4)for(let wx=x+1;wx<x+w-2;wx+=3)if(k.int(3))k.r(wx,y,1,1,'#f0e0a0');x+=w}
    k.water(0,86,480,70,'#4f8fa8','#8cc0cf');
    for(const x of [170,300]){k.r(x,44,6,76,'#f2f2ea');k.r(x-3,44,12,3,'#f2f2ea');k.r(x-3,62,12,3,'#f2f2ea');k.r(x-3,84,12,3,'#f2f2ea')}k.r(70,100,340,3,'#e4e4dc');k.r(70,105,340,2,'#c8c8c0');
    for(let x=70;x<410;x+=2){const y=x<173?44+(173-x)/103*56:x>303?44+(x-303)/107*56:44+(1-((x-238)/65)**2)*38;k.r(x,y,2,1,'#f2f2ea');if(x%10===0)k.r(x,y,1,100-y,'#d8d8d0')}
    k.reflect(120,.22,()=>{for(const x of [170,300])k.r(x,86,6,34,'#f2f2ea')});
    for(const [x,y] of [[60,128],[250,136]] as const){k.r(x,y,44,6,'#6e4a34');k.r(x+2,y-7,40,7,'#f0ead8');for(let i=0;i<6;i++)k.lantern(x+4+i*6,y-9,'#e8735a');k.eaves(x+22,y-13,46,5,'#5a4a3a')}
    // The beach's curve, then the lawn, the boardwalk along the buildings.
    for(let y=150;y<214;y++){k.r(0,y,480,1,'#e0d4ae')}for(let x=0;x<480;x+=6)k.r(x,150+Math.sin(x/28)*3,6,4,'#f2eee0');for(let i=0;i<160;i++)k.r(k.int(480),156+k.int(60),2,1,'#cfc29a');
    k.ground(0,214,480,40,'#7fa266','#6e925a');for(const x of [40,180,300])k.pine(x,246);
    k.r(0,254,480,66,'#a87a50');for(let y=254;y<320;y+=6)k.r(0,y,480,1,'#8a6240');for(let x=0;x<480;x+=24)for(let y=254;y<320;y+=12)k.r(x+(y%24?12:0),y,1,6,'#8a6240');
    // Liberty on her wooden platform out over the water's edge.
    k.r(346,132,52,24,'#8a6240');for(let x=346;x<398;x+=5)k.r(x,132,1,24,'#6e4a30');k.r(362,120,20,14,'#a3a598');k.r(366,102,12,18,'#7fb0a0');k.r(369,96,6,6,'#8fc0b0');k.r(374,90,2,10,'#7fb0a0');k.r(373,87,4,4,'#f0d060');k.r(367,94,10,2,'#6aa090');
    // The ball in its grid.
    k.r(330,214,150,106,'#c9ccd0');for(let x=334;x<480;x+=18)k.r(x,214,4,106,'#9ea4aa');for(let y=226;y<320;y+=22)k.r(330,y,150,4,'#9ea4aa');k.ell(405,252,26,26,'#d8c07a');k.ell(400,246,16,16,'#ecd9a0');k.ell(396,241,6,6,'#fff4cc');
  }},
  // Kinkaku-ji: the Mirror Pond in everything, the pavilion on its far shore doubled in it, the crane and turtle islands with their pines; the way runs one way round, the viewing platform at the foot.
  kinkaku:{layout:{start:[32,296],exit:[424,226],camera:[230,262],solids:[...kyokoRows,[0,0,480,96],...kinkakuPines.map(([x,y]):Box=>[x-3,y-3,8,5])],stands:kinkakuPines.map(([x,y]):Box=>[x-28,y-44,58,50]),lamps:[[310,84,60,0xffd878,.8],[310,150,50,0xffd878,.4,.6],[150,262,44,warm,.6],[370,262,44,warm,.6]]},draw:k=>{
    k.ground(0,0,480,320,'#7f9a66','#6e8a5a');k.ground(0,246,480,74,'#cfc6a8','#bdb495');
    k.r(0,0,480,96,'#b7d4dc');k.ridge(96,[[70,44,70],[215,26,70],[420,40,85]],'#9dbcc0','#92b2b6',1);k.ridge(96,[[150,34,75],[345,24,60],[475,22,55],[5,20,45]],'#7fa596','#73998c',3);k.ridge(96,[[55,22,75],[255,19,80],[405,24,60]],'#5f8a6c','#527d62',5);k.forest(0,86,480,14,greens[1]);
    for(let y=88;y<256;y++){const [l,r]=kyoko(y);if(r>l){k.r(l-2,y,r-l+4,3,'#6a6a58')}}for(let y=89;y<255;y++){const [l,r]=kyoko(y);if(r>l)k.r(l,y,r-l,1,'#4f8795')}
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
    k.stones(176,252,128,24,'#b0a890','#98917b');k.fence(176,250,128,'#5a4634','#8a6c50');
  }},
  // Ginkaku-ji: the raked sea of silver sand and its flat-topped moon-viewing cone, the dark Kannon hall by its pond, the abbot's hall, the moss; the hedge lane along the foot.
  ginkaku:{layout:{start:[440,262],exit:[446,226],camera:[126,236],solids:[[0,0,480,86],[66,44,104,74],[165,104,276,122],...oval(84,176,62,38),[0,288,480,32]],lamps:[[120,110,44,warm,.6],[300,170,120,0xdde8ff,.5,.6],[352,94,44,paper,.6]]},draw:k=>{
    k.ground(0,0,480,320,'#5f8a4e','#4d7640',900);k.forest(0,0,480,70,greens[0]);for(const [x,y] of [[20,100],[460,120],[456,190],[20,240],[210,258]])k.tree(x,y);
    k.ell(84,176,64,40,'#5a7a4c');k.ell(84,176,62,38,'#3f6f70');k.rock(60,160,16,9);k.rock(100,186,12,7,'#7a7a70');k.rock(70,190,8,5);k.pine(82,166);
    k.ground(140,226,340,60,'#c9c0a6','#b5ac92');k.ground(0,226,140,60,'#c9c0a6','#b5ac92',200);
    // The sand, raked in straight bands, each a shade off the next.
    k.r(165,104,276,122,'#8c8a7c');k.r(168,107,270,116,'#e8e6dc');for(let y=108;y<222;y+=4){k.r(168,y,270,1,y%8?'#d6d4c8':'#c4c2b6');if(y%16===0)for(let x=168;x<438;x+=12)k.r(x,y,6,1,'#f6f4ec')}
    // The cone: sand heaped and cut flat, raked down its sides.
    k.shade(350,207,84,5);for(let i=0;i<46;i++){const w=24+i*1.3;k.r(392-w/2,162+i,w,1,i%4?'#e4e2d6':'#c8c6ba');if(i%3===0){k.r(392-w/2,162+i,2,1,'#b6b4a8');k.r(392+w/2-3,162+i,3,1,'#b6b4a8')}}k.ell(392,162,13,3,'#f4f2e8');
    // The Kannon hall: two dark storeys, bell windows above, the bronze phoenix.
    k.r(80,92,80,26,'#5a4a38');for(let x=82;x<158;x+=8)k.r(x,92,2,26,'#3a2e24');k.r(112,100,16,18,'#2a2320');k.eaves(120,82,100,10,'#46484a');k.r(94,60,52,22,'#3e3228');k.ell(120,72,6,7,'#c8bfa8');k.ell(104,72,3,5,'#c8bfa8');k.ell(136,72,3,5,'#c8bfa8');k.eaves(120,50,76,10,'#46484a');k.r(118,44,4,6,'#b8a060');k.r(115,43,10,2,'#b8a060');
    k.hall(310,52,180,18,28,'#d6ccb4','#54504a');
    k.r(0,288,480,32,'#2f5a42');for(let x=0;x<480;x+=7)k.r(x,288,6,3,'#4f8058');k.wall(0,306,480,14,'#b5ab90');
  }},
  // Daitoku-ji: the great vermilion Sanmon at the end of a stone lane, earthen walls either side, and a Zen garden of raked gravel, rocks and clipped pines over the wall.
  daitoku:{layout:{start:[452,212],exit:[434,186],camera:[150,196],solids:[[0,0,96,190],[140,0,340,186],[0,234,480,86],[60,0,120,118]],lamps:[[118,110,40,paper,.7],[300,206,70,warm,.5,.5],[118,200,60,warm,.5]]},draw:k=>{
    k.ground(0,0,480,320,'#c9c2ab','#b5ae97');k.forest(0,0,480,70,greens[2]);for(const [x,y] of [[30,120],[34,170],[200,86]])k.pine(x,y);
    k.stones(96,110,44,84,'#b4ae9a','#9c9684');k.ground(0,190,480,44,'#c6bea8','#b0a994');k.stones(0,204,480,14,'#b4ae9a','#9c9684');
    k.gate(118,114,108,'#a8402f','#4d5a5c',24);
    // The garden: raked gravel from the wall to the abbot's veranda, a moss island and its standing stones.
    k.r(146,78,334,8,'#6a5a48');k.r(146,62,334,16,'#d6ccb4');for(let x=150;x<476;x+=16)k.r(x,62,3,16,'#4a3a2c');k.eaves(312,46,344,16,'#54504a');k.r(146,84,334,92,'#e4e0d0');for(let y=88;y<174;y+=4)k.r(146,y,334,1,'#ccc8b8');
    for(const [x,y,w,h] of [[220,124,30,16],[340,110,22,12],[410,142,34,18]] as const){for(let i=1;i<4;i++){k.ell(x+w/2,y+h/2+2,w/2+i*6,h/2+i*3,'#d4d0c0');k.ell(x+w/2,y+h/2+2,w/2+i*6-1,h/2+i*3-1,'#e4e0d0')}k.ell(x+w/2,y+h/2,w/2,h/2,'#5f8a4e');k.ell(x+w/2-2,y+h/2-2,w/2-4,h/2-4,'#7fa266')}
    k.rock(226,112,10,20);k.rock(238,120,14,12,'#7c7c72');k.rock(346,102,8,16);k.rock(416,130,12,22,'#7c7c72');k.rock(430,140,10,12);k.pine(300,136);k.pine(372,166,-1);
    k.wall(140,172,340,14,'#c9a878');
    k.r(140,186,340,4,'#a59e88');k.wall(0,172,96,14,'#c9a878');k.ground(0,234,480,86,'#5f8a4e','#4d7640');
    k.wall(0,240,480,16,'#c9a878');k.r(286,226,50,30,'#3a2c20');k.r(296,234,30,22,'#262019');k.eaves(311,216,70,12,'#4b5456');for(const [x,y] of [[60,300],[180,306],[250,290],[400,300],[448,284]])k.tree(x,y-14,greens[k.int(3)]);
  }},
  // Kenkun-jinja: the stone stairs up Funaoka hill through the great bare torii, the vermilion ones above, and from the top Kyoto laid out to the Higashiyama hills.
  kenkun:{layout:{start:[145,306],exit:[112,276],camera:[396,112],solids:[[0,0,100,320],[100,240,8,80],[182,152,298,168],[100,0,380,92],[430,0,50,160],[300,120,8,14],[392,120,8,14]],over:[[100,206,90,24],[109,226,8,16],[173,226,8,16]],lamps:[[150,94,40,paper,.7],[120,150,30,warm,.6],[300,120,44,warm,.5],[145,240,40,warm,.4]]},draw:k=>{
    k.forest(0,0,480,320,greens[1]);for(const [x,y] of [[40,120],[70,200],[30,270],[80,300]])k.cedar(x,y,60);
    // The view, past the rail: sky, the hills, the city's grid running out to them.
    k.r(182,152,298,168,'#b7d4dc');k.ell(330,200,190,34,'#7f9a9c');k.ell(450,206,110,34,'#6e8c8e');k.r(182,200,298,120,'#b0b4a6');for(let y=206;y<320;y+=5)for(let x=184;x<480;x+=7+(y%3)){k.r(x,y,5+k.int(3),3,['#c8c4b4','#9aa09a','#d8d4c4','#8a948c','#a8886a'][k.int(5)]);}k.r(182,226,298,2,'#8a948c');k.r(290,200,2,120,'#8a948c');for(let x=186;x<480;x+=22)k.tree(x,324,greens[1],14,8);k.lantern(360,214,'#e8e4d8');
    k.ground(100,98,330,56,'#c9c2ab','#b5ae97');k.ground(108,150,74,6,'#c9c2ab','#b5ae97');
    k.hall(170,40,140,18,34,'#b5402f','#5a4a3a');k.fence(182,146,250,'#a8402f','#c8604a');
    for(let y=156;y<320;y+=7){k.r(108,y,74,6,'#b2ae9c');k.r(108,y,74,1,'#ccc8b6');k.r(108,y+5,74,1,'#8e8a7a')}k.r(100,156,8,164,'#6e7264');k.r(182,156,4,164,'#6e7264');for(const y of [200,240])k.r(108,y,74,10,'#a8a494');
    k.stoneLantern(112,130);k.stoneLantern(172,130);k.torii(350,136,84,44,'#d4502e','#3e4640');k.above(()=>k.torii(145,262,74,52,'#c8b896','#a8987a'));
    k.tree(450,120,greens[1]);k.tree(446,84,greens[0]);
  }},
  // Yasaka-jinja: in through the vermilion Nishi-romon, the dance stage in the middle of the gravel, its eaves hung all round with lanterns, the great hall behind; Maruyama park's weeping cherry to the right.
  yasaka:{layout:{start:[110,298],exit:[170,262],camera:[350,226],solids:[[0,0,480,106],[176,146,110,54],[56,270,38,30],[126,270,38,30],[0,270,56,50],[164,282,316,38],[400,206,60,24],[0,0,22,320]],over:[[50,200,120,72]],lit:[[180,172,102,14]],lamps:[[230,180,90,paper,.9],[110,262,44,0xffb070,.7],[300,100,70,paper,.7],[430,180,50,0xffc8d0,.5]]},draw:k=>{
    k.ground(0,0,480,320,'#cfc8b2','#bab39c');k.forest(0,0,480,60,greens[1]);k.stones(92,120,36,180);k.stones(92,120,250,16);
    k.hall(300,36,270,32,38,'#ded6c0','#6e5a44','#a8402f');k.r(174,104,250,3,'#a8a294');for(let x=196;x<400;x+=10)k.lantern(x,84);
    // The stage on its stone base: open, four posts, the lanterns in a double row.
    k.shade(176,198,114,5);k.r(176,190,110,10,'#a8a294');k.r(176,190,110,2,'#c4beb0');k.r(180,152,102,38,'#4a3a2c');for(const x of [182,230,276])k.r(x,160,4,30,'#7a5a40');k.eaves(231,134,126,20,'#5a4a3a');
    for(let row=0;row<2;row++)for(let x=180;x<280;x+=7)k.lantern(x,158+row*14);
    // The gate.
    k.above(()=>k.gate(110,272,112,'#d4502e','#4d5a5c',30));k.r(0,284,56,16,'#d4502e');k.r(164,284,316,16,'#d4502e');k.eaves(320,276,322,8,'#4d5a5c');k.eaves(26,276,62,8,'#4d5a5c');k.stones(0,300,480,20,'#9e9a8c','#88847a');
    // The weeping cherry, its branches trailing.
    k.shade(404,226,54);k.r(428,192,6,36,'#5c4636');softCrown(k.r,k.rand,431,176,30,18,blossom);for(let i=0;i<26;i++){const x=402+k.int(58),h=12+k.int(24);for(let y=0;y<h;y+=2)k.r(x,180+y,1,1,blossom[1+k.int(3)])}k.fence(400,216,60);for(const [x,y] of [[46,130],[50,200],[455,130],[456,260]])k.tree(x,y);
  }},
  // Higashiyama: the stone slope doglegging up between wooden town houses, the Yasaka pagoda rising at its end.
  higashiyama:{layout:{start:[370,306],exit:[344,276],camera:[194,190],solids:[[0,0,180,320],[180,242,160,78],[400,190,80,130],[240,0,240,190],[180,0,60,104]],lamps:[[210,92,40,paper,.5],[208,170,44,paper,.7],[300,216,44,paper,.7],[370,262,44,paper,.7],[212,226,30,paper,.5]]},draw:k=>{
    k.r(0,0,480,320,'#4b5456');for(let y=0;y<320;y+=4)k.r(0,y,480,1,'#3f484a');
    k.r(0,0,480,62,'#b7d4dc');k.ell(100,70,140,34,'#6a9068');k.ell(420,78,120,30,'#5c8460');
    k.stones(180,104,60,138,'#c0b8a2','#a8a08c');k.stones(180,190,220,52,'#c0b8a2','#a8a08c');k.stones(340,190,60,130,'#c0b8a2','#a8a08c');
    for(const [x,y,w] of [[340,250,60],[340,284,60],[180,136,60],[210,190,1]] as const)for(let i=0;i<3;i++){k.r(x,y+i*4,w,2,'#a09884');k.r(x,y+i*4+2,w,1,'#d4ccb6')}
    k.pagoda(210,106,5,46,'#4a3a2e','#3c4648',13);
    const colors=['#3d5e7a','#a8402f','#d4a93a','#3a6a4c','#6a4a7a'];
    for(let y=62;y<170;y+=27){machiya(k,120,y+(y%2),60,colors[k.int(5)]);machiya(k,240,y+1,76,colors[k.int(5)])}
    for(const x of [240,316,392])machiya(k,x,158,76,colors[k.int(5)]);for(const x of [120,196,272])machiya(k,x,242,68,colors[k.int(5)]);for(const y of [214,248,282])machiya(k,402,y,78,colors[k.int(5)]);for(const y of [200,230,260,290])machiya(k,110,y,68,colors[k.int(5)]);
    for(const [x,y] of [[34,140],[70,240],[40,306],[440,140]])k.tree(x,y);k.lantern(306,212);k.lantern(344,250);
  }},
  // Heian-jingu: the imperial court at five-eighths: the Otenmon behind, an expanse of white gravel, the Daigokuden's green roofs ahead, a corridor down each side to the White Tiger tower and the Blue Dragon's, the cherry and the orange tree before the hall.
  heian:{layout:{start:[240,304],exit:[334,250],camera:[240,184],way:{at:[64,118],to:'heian-garden',ja:'神苑',sign:'GARDEN',en:'Shin-en garden'},solids:[[0,0,56,320],[424,0,56,320],[0,0,480,116],[56,276,160,44],[264,276,160,44],[150,128,22,14],[308,128,22,14]],over:[[155,206,170,72]],lamps:[[240,106,70,paper,.7],[240,270,60,0xffb070,.6],[110,100,44,paper,.5],[370,100,44,paper,.5],[240,190,120,warm,.3,.5]]},draw:k=>{
    k.r(0,0,480,100,'#6a9068');k.r(0,0,480,60,'#b7d4dc');k.ell(240,70,240,30,'#6a9068');k.ground(0,100,480,220,'#e8e4d4','#d4d0c0',1200);
    k.stones(216,116,48,204,'#d8d2be','#c2bca8');
    // Each corridor: green tiles, vermilion posts, white walls.
    for(const x of [20,424]){k.r(x,110,36,180,'#3d7a5e');for(let y=112;y<290;y+=5)k.r(x,y,36,1,'#2f6048');k.r(x+(x<240?30:0),110,6,180,'#d4502e');for(let y=116;y<290;y+=14)k.r(x+(x<240?36:-2),y,3,10,'#efe9d8')}
    k.hall(240,44,340,34,36,'#d4502e','#3d7a5e','#a8402f','#efe9d8');k.r(100,112,280,6,'#efe9d8');k.r(100,116,280,2,'#b8b2a0');for(const x of [216,240,264])k.r(x,106,16,10,'#b8b2a0');k.r(238,50,4,2,'#d8b04a');k.r(142,44,8,5,'#d8b04a');k.r(330,44,8,5,'#d8b04a');
    for(const x of [60,420]){k.r(x-22,78,44,32,'#d4502e');for(let i=x-22;i<x+22;i+=9)k.r(i,78,3,32,'#a8402f');k.eaves(x,62,64,12,'#3d7a5e');k.eaves(x,46,42,10,'#3d7a5e');k.r(x-14,56,28,6,'#d4502e');k.r(x-1,40,2,6,'#d8b04a')}
    k.shade(150,142,22,2);k.r(159,120,4,20,'#5c4636');softCrown(k.r,k.rand,161,114,16,12,blossom);k.fence(150,130,22);k.r(317,120,4,20,'#5c4636');softCrown(k.r,k.rand,319,114,14,12,greens[2]);for(let i=0;i<8;i++)k.r(308+k.int(22),106+k.int(16),2,2,'#f0a030');k.fence(308,130,22);
    k.above(()=>k.gate(240,278,166,'#d4502e','#3d7a5e',46));k.r(56,276,108,16,'#efe9d8');k.r(316,276,108,16,'#efe9d8');k.r(56,272,108,5,'#d4502e');k.r(316,272,108,5,'#d4502e');k.ground(56,292,368,28,'#cfc8b2','#bab39c');k.stones(216,276,48,44,'#d8d2be','#c2bca8');
    // The way into the garden, through the corridor beside the White Tiger tower.
    k.r(46,124,12,38,'#a8402f');k.r(49,128,9,34,'#262019');k.eaves(52,116,22,8,'#3d7a5e');
  }},
  // The Shin-en: the garden wrapping the back of the Daigokuden, walked as it is. In by the South Garden (the winding path, the stream, Kyoto's first tram), up to the White Tiger pond and its tea house, over the Blue Dragon pond on the Garyu-kyo, the old Sanjo bridge's piers, along the Taihei-kaku over the Seiho pond,
  // round behind the Shobikan on its piles, the east hills beyond, and back along the shore by the pebble beach and the propped pine, where the photo was taken.
  'heian-garden':{layout:{width:760,height:430,start:[96,402],exit:[452,364],camera:[600,368],out:{to:'heian',at:[370,150],en:'To the shrine'},solids:fenced(760,430,gardenPath),over:[[426,128,292,22],[428,185,288,6],...Array.from({length:6},(_,i):Box=>[428+i*57,150,3,36])],lamps:[[296,226,70,paper,.6],[296,400,50,0xffb070,.5],[296,320,90,warm,.25,.5],[571,176,110,paper,.6,.6],[650,290,70,paper,.6],[170,78,44,paper,.5],[122,304,44,paper,.5],[398,152,44,paper,.5],[740,160,44,paper,.5],[752,338,44,paper,.5],[560,392,70,warm,.35],[300,118,70,warm,.3]]},draw:k=>{
    k.ground(0,0,760,430,'#4b7350','#5a8559',4000);
    k.ell(610,58,190,50,'#66926e');k.ell(690,74,120,40,'#567f60');k.forest(0,0,760,74,greens[0]);
    // The ponds, each with its bank.
    for(const [cx,cy,rx,ry] of ponds){k.ell(cx,cy,rx+3,ry+3,'#8d8b72');k.ell(cx,cy,rx,ry,'#4d8796');k.inside(cx,cy,rx,ry,()=>k.ripples(cx-rx,cy-ry,rx*2,ry*2))}
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
    k.shade(244,270,16,2);k.r(250,256,3,14,'#5c4636');softCrown(k.r,k.rand,251,250,10,8,blossom);k.shade(334,270,16,2);k.r(340,256,3,14,'#5c4636');softCrown(k.r,k.rand,341,250,9,8,greens[2]);for(let i=0;i<6;i++)k.r(334+k.int(14),245+k.int(11),2,2,'#f0a030');
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
  // The lantern shrine, from the photos: the corner of a pavilion in its fence, two tiers of white lanterns all round, the plastered hall behind with its own row, the stone torii and the paving through the dark trees.
  lanterns:{layout:{start:[370,306],exit:[406,204],camera:[238,204],solids:[[0,0,222,320],[0,0,480,108],[300,0,180,128],[402,214,78,106],[222,226,120,94]],over:[[336,210,74,20],[342,226,8,16],[394,226,8,16]],lit:[[52,112,150,52],[316,92,88,10]],lamps:[[126,136,150,0xfff0c0,1],[126,190,110,paper,.6,.5],[360,98,64,0xfff0c0,.9],[360,126,50,paper,.6],[370,270,30,warm,.3]]},draw:k=>{
    k.forest(0,0,480,320,greens[0]);for(const [x,y] of [[250,76],[440,70],[20,220],[60,280],[150,290],[440,250],[250,270],[460,170]])k.cedar(x,y,60);
    k.ground(222,108,180,118,'#c8bfa6','#b0a890');k.ground(402,128,78,86,'#c8bfa6','#b0a890');k.ground(300,128,102,10,'#c8bfa6','#b0a890');k.stones(342,214,60,106,'#8e8a7c','#73705f');
    // The pavilion.
    k.r(36,198,178,8,'#55493c');k.shade(36,206,178);k.r(62,164,10,36,'#7a5a40');k.r(178,164,10,36,'#7a5a40');k.r(116,164,12,36,'#7a5a40');k.r(66,176,110,24,'#8e7a5e');k.r(112,184,18,16,'#d8d0b8');
    k.r(46,110,156,5,'#5a4230');k.r(46,162,156,4,'#5a4230');for(let row=0;row<2;row++){k.r(46,126+row*26,156,2,'#5a4230');for(let x=50;x<198;x+=10){const y=114+row*25;k.r(x+1,y,7,1,'#2a2320');k.r(x,y+1,9,18,'#f6efdc');k.r(x+1,y+2,1,16,'#fffaf0');k.r(x+3,y+4,4,10,k.int(3)?'#2a2320':'#c8452e');k.r(x+4,y+6,2,6,'#f6efdc');k.r(x+1,y+19,7,1,'#2a2320')}}
    k.eaves(124,62,190,44,'#54504a');k.r(120,52,8,12,'#6a4e38');k.r(46,104,156,6,'#3a2e24');
    k.fence(36,186,178,'#2e241c','#6a5238');k.fence(36,202,178,'#2e241c','#6a5238');
    // The hall behind.
    k.r(306,84,108,44,'#ece4cf');k.r(306,84,108,4,'#4a3a2c');k.r(342,102,36,26,'#7a5a40');for(let x=344;x<376;x+=5)k.r(x,104,1,24,'#5a4230');k.r(312,106,24,16,'#6a5a48');k.r(384,106,24,16,'#6a5a48');k.eaves(360,60,136,24,'#46484a');for(let i=0;i<11;i++){k.r(316+i*8,92,6,9,'#f6efdc');k.r(318+i*8,94,2,5,'#2a2320')}k.r(306,128,108,3,'#8e8a7c');
    k.stoneLantern(420,150);k.above(()=>k.torii(372,264,62,50,'#a7a596','#8e8c80'));
  }},
  // Kyoto Tower: the round observation deck itself, out of the lift, the windows all round with the city far below: the station's long roof, Higashi-Honganji's, the river, the hills; coin telescopes at the glass.
  'kyoto-tower':{layout:{start:[240,246],exit:[194,226],camera:[352,142],solids:[...outside(240,176,184,134,4),...oval(240,168,66,50,4),[92,160,14,14],[374,186,14,14],[232,276,16,12]],lit:Array.from({length:64},(_,i):Box=>[(i*73)%478,i%2?36+(i*37)%24:286+(i*41)%32,3,2]),lamps:[[240,176,40,warm,.7],[240,262,60,warm,.7],[100,180,60,warm,.7],[380,180,60,warm,.7],[240,86,60,warm,.7]]},draw:k=>{
    k.r(0,0,480,320,'#a8ac9e');for(let y=0;y<320;y+=8)for(let x=(y%16)/2;x<480;x+=9){k.r(x,y,7,6,['#c0bcae','#9ca49c','#d0ccbc','#8a948c','#b09a80'][k.int(5)])}for(let y=0;y<320;y+=48)k.r(0,y,480,3,'#7a8080');for(let x=0;x<480;x+=64)k.r(x,0,3,320,'#7a8080');
    for(let i=0;i<64;i++)k.r((i*73)%478,i%2?36+(i*37)%24:286+(i*41)%32,3,2,'#f6e0a0');k.r(420,0,16,320,'#6a9aac');k.r(0,296,480,12,'#6a7078');for(let x=0;x<480;x+=8)k.r(x,300,5,1,'#e0dccb');k.r(30,270,150,24,'#b4bac0');k.r(30,270,150,3,'#dfe3e6');k.r(4,44,60,50,'#54504a');k.eaves(34,50,70,36,'#54504a');k.forest(0,0,480,40,greens[0]);k.ell(430,40,110,30,'#5c8460');
    // The deck: a ring of carpet between the glass and the lift's drum.
    k.ell(240,176,194,144,'#e8e4d8');k.ell(240,176,190,140,'#6a8ca0');for(let a=0;a<48;a++){const t=a/48*Math.PI*2;k.r(240+Math.cos(t)*186-1,176+Math.sin(t)*137-2,3,5,'#e8e4d8')}k.ell(240,176,184,134,'#5a6a7a');k.ell(240,176,176,126,'#68798a');k.ell(240,176,168,120,'#5a6a7a');
    k.ell(240,168,68,52,'#3a4048');k.ell(240,168,66,50,'#efe9dd');k.ell(240,160,50,34,'#d8d2c4');k.r(190,160,100,58,'#efe9dd');k.r(216,186,48,32,'#8e959c');k.r(239,186,2,32,'#5e656c');k.r(216,183,48,3,'#c8452e');k.r(226,172,28,10,'#c8452e');k.text(230,172,'京都','#fffef2');
    for(const [x,y] of [[92,160],[374,186],[232,276]] as const){k.shade(x,y+13,16,2);k.r(x+5,y+6,5,8,'#4c5a60');k.r(x+1,y,14,7,'#c8452e');k.r(x+11,y+1,4,5,'#2a2320');k.r(x+2,y+1,6,2,'#e8735a')}
  }},
  // The Rakusai bamboo park: a winding path through stands of different bamboos behind woven fences, to the gathering of old stone Buddhas in their clearing.
  rakusai:{layout:{start:[22,276],exit:[8,230],camera:[336,60],solids:[[0,0,120,250],[0,300,480,20],[300,100,180,220],[165,100,85,50],[120,195,130,55],[400,0,80,100],[0,0,480,50]],lamps:[[220,76,44,warm,.5],[276,240,44,warm,.5],[140,130,40,warm,.4],[60,274,44,warm,.5]]},draw:k=>{
    k.ground(0,0,480,320,'#5f8a4e','#4d7640',1200);
    for(const [x,y,w,h] of [[0,250,300,50],[250,150,50,150],[120,150,180,45],[120,60,45,135],[120,50,280,50]])k.ground(x,y,w,h,'#c7ba96','#b0a37e');
    grove(k,0,112,60,246);grove(k,300,84,104,300,'gold');grove(k,390,90,104,300);grove(k,172,72,200,296,'black');grove(k,124,48,200,296);k.forest(0,0,480,46,greens[2]);grove(k,172,72,102,146,'green');grove(k,404,76,44,100,'black');
    for(const [x,w] of [[0,300]])brushwood(k,x,300,w,16);brushwood(k,300,300,180,16);brushwood(k,0,238,120,12);brushwood(k,124,186,126,10);brushwood(k,300,92,100,12);brushwood(k,165,88,40,12);
    // The old Buddhas, weathered round, close together on the moss.
    k.ell(258,84,44,14,'#5f8a4e');for(let i=0;i<16;i++){const x=210+(i%8)*12+k.int(4),y=68+(i>7?12:0)+k.int(3);k.r(x,y+6,11,10,'#7d7d72');k.r(x+2,y,7,7,'#8e8e82');k.r(x+3,y+3,1,1,'#55554c');k.r(x+6,y+3,1,1,'#55554c');k.r(x,y+14,11,2,'#4f6a44');k.r(x+1,y+7,2,2,'#5f8a4e')}
    for(let x=300;x<392;x+=20)k.lantern(x,84,'#e8e4d8');
  }},
  // Dotonbori: the canal through the middle, Ebisu bridge across it, the wall of signs along the far bank: the great crab, the octopus, the strawberry, the running man; all of it again in the water.
  dotonbori:{layout:{start:[240,270],exit:[206,244],camera:[340,146],solids:[[0,0,480,120],[0,172,204,64],[276,172,204,64],[0,282,480,38]],lit:[[20,50,92,34],[126,52,70,30],[216,46,64,50],[292,40,52,70],[356,50,110,30],[0,292,480,8]],lamps:[[240,140,150,0xffd8e0,.9,.4],[80,120,90,0xffc090,.8,.5],[320,120,90,0x90d0ff,.8,.5],[420,120,80,0xffd070,.8,.5],[240,204,50,warm,.7],[120,256,60,warm,.5],[360,256,60,warm,.5]]},draw:k=>{
    k.r(0,0,480,320,'#3a4048');
    let x=0,n=0;for(const w of [118,92,68,62,140]){k.r(x,36,w-2,84,['#3a4048','#4a4650','#343c44','#3e3a48','#44404a'][n]);for(let y=90;y<116;y+=7)for(let wx=x+4;wx<x+w-8;wx+=6)k.r(wx,y,4,4,k.int(3)?'#e8d8a0':'#5a6068');x+=w;n++}
    k.r(20,50,92,34,'#f6efdc');k.r(22,52,88,5,'#c8452e');k.text(46,62,'かに','#c8452e');k.ell(66,48,26,9,'#d4502e');k.ell(66,46,18,6,'#e8735a');for(const s of [-1,1]){for(let i=0;i<4;i++)k.r(66+s*(26+i*3),44+i*4,6,2,'#c8452e');k.r(66+s*40,34,5,8,'#d4502e');k.r(66+s*36,34,5,4,'#e8735a')}k.r(58,42,3,3,'#fffef2');k.r(72,42,3,3,'#fffef2');
    k.r(126,52,70,30,'#fbe9b0');k.ell(160,62,18,11,'#c8452e');k.ell(156,58,8,5,'#e0604a');for(let i=0;i<5;i++)k.r(142+i*8,70+i%2*2,4,10,'#c8452e');k.r(152,60,3,3,'#fffef2');k.r(164,60,3,3,'#fffef2');
    k.r(216,46,64,50,'#f6efdc');k.ell(248,62,16,14,'#d4304a');k.r(238,46,20,5,'#3a8a4a');for(let i=0;i<9;i++)k.r(238+(i%3)*9,57+Math.floor(i/3)*6,2,2,'#f6e080');k.text(232,78,'いちご','#c8452e',false);
    // The runner on his board, arms up, over the bridge's end.
    k.r(292,40,52,70,'#1d6fc4');k.r(296,44,44,62,'#34a6e0');for(let i=0;i<7;i++)k.r(296,44+i*9,44,2,'#ffffff40');k.r(316,54,8,8,'#fffef2');k.r(314,62,12,18,'#fffef2');k.r(304,58,10,4,'#fffef2');k.r(326,56,10,4,'#fffef2');k.r(306,80,10,5,'#fffef2');k.r(304,84,4,10,'#fffef2');k.r(322,80,5,16,'#fffef2');k.r(322,94,10,4,'#fffef2');
    k.r(356,50,110,30,'#d060b0');for(let i=0;i<4;i++)k.r(362+i*26,54,20,22,['#f0c030','#34b6e0','#e0483a','#efe9dd'][i]);
    k.stones(0,120,480,52,'#7c7a78','#6a6866');k.stones(0,236,480,46,'#7c7a78','#6a6866');k.r(0,170,480,2,'#3a3e40');
    k.water(0,172,480,64,'#2f4a5a','#4a6e7e');k.mirror(0,62,204,58,146,.5);k.mirror(276,62,204,58,146,.5);
    for(const [cx,y] of [[110,202]] as const){k.r(cx-30,y,60,10,'#efe9dd');k.r(cx-26,y+7,52,4,'#34b6e0');k.r(cx-16,y-7,30,7,'#3a4048');k.r(cx-14,y-6,26,4,'#a8c4cc')}
    // The bridge, round-bellied in the middle.
    k.stones(204,160,72,88,'#a39e92','#8c877c');k.r(202,172,3,64,'#d8d4c4');k.r(275,172,3,64,'#d8d4c4');k.r(204,166,72,3,'#00000024');for(let y=176;y<236;y+=14){k.r(201,y,5,4,'#efe9dd');k.r(274,y,5,4,'#efe9dd')}
    for(let i=0;i<8;i++)k.r(i*62+6,292,52,8,['#e0483a','#f0c030','#34b6e0','#d060b0'][i%4]);
    k.r(0,282,480,10,'#3a3e44');k.eaves(120,276,210,6,'#4b5456');k.eaves(372,276,190,6,'#4b5456');k.r(0,300,480,20,'#2a2e34');
  }},
  // Shinsekai: the street under the gate's arch, signs stacked out over it, the puffer lantern, the kushikatsu fronts, Billiken on his plinth, and Tsutenkaku straddling the road at its end on four arched legs.
  shinsekai:{layout:{start:[240,304],exit:[172,276],camera:[176,126],solids:[[0,0,170,320],[310,0,170,320],[0,0,480,84],[176,226,16,14]],over:[[170,92,140,28],[170,236,140,16]],lit:[[100,126,68,16],[312,126,68,16],[100,176,68,16],[312,176,68,16],[100,216,68,16],[312,216,68,16],[170,236,140,6],[206,60,68,8]],lamps:[[240,130,90,warm,.7],[240,240,60,paper,.7],[140,190,80,paper,.8],[340,190,80,paper,.8],[240,64,50,0xfff0c0,.9],[320,160,40,0xffffff,.6]]},draw:k=>{
    k.r(0,0,480,320,'#b7d4dc');k.ground(170,84,140,236,'#7c7f7e','#6e7170');for(let y=84;y<320;y+=8)k.r(170,y,3,4,'#e6e3cc');for(let y=84;y<320;y+=8)k.r(307,y,3,4,'#e6e3cc');
    // Tsutenkaku: legs either side of the road, a lattice shaft, the drum and its lit neon.
    k.r(200,36,80,64,'#c9cfcf');k.r(206,44,68,5,'#e0483a');for(let x=206;x<274;x+=8)k.r(x,52,5,14,'#6a8a9a');k.r(212,70,56,30,'#b9bfbf');for(let i=0;i<7;i++){k.r(214+i*8,72,2,26,'#8a9090');k.r(214,72+i*4,54,1,'#8a9090')}k.r(206,60,68,8,'#f0c030');k.text(225,60,'通天閣','#2a2320',false);
    k.above(()=>{k.r(170,96,140,10,'#d9dcd9');for(let x=170;x<310;x+=4)k.r(x,104,2,8,'#a9afaf');for(const x of [170,296]){k.r(x,96,14,24,'#d9dcd9');k.r(x+3,100,8,20,'#a9afaf')}});k.ell(240,112,44,8,'#b7d4dc');k.above(()=>{k.r(170,112,28,6,'#d9dcd9');k.r(282,112,28,6,'#d9dcd9')});
    for(const x of [0,310]){for(let y=120;y<320;y+=50){const c=['#e0483a','#f0c030','#34b6e0','#d060b0'][k.int(4)];k.r(x,y,170,50,'#4a4650');for(let wx=x+6;wx<x+164;wx+=8)k.r(wx,y+4,5,4,'#e8d8a0');k.r(x+(x?2:100),y+6,68,16,c);k.r(x+(x?4:102),y+8,64,2,'#ffffff60');k.text(x+(x?14:112),y+7,['串かつ','ふぐ','将棋'][k.int(3)],'#2a2320',false);k.r(x,y+26,170,18,'#2a2320');k.r(x+(x?4:30),y+28,130,12,'#f6d890');for(let wx=x+(x?4:30);wx<x+(x?134:160);wx+=10)k.lantern(wx,y+22,'#e8735a');k.r(x+(x?0:168),y,2,50,'#2a2320')}k.forest(x,84,170,40,greens[1])}
    k.r(0,84,170,36,'#4a4650');k.r(310,84,170,36,'#4a4650');for(let i=0;i<3;i++){k.r(14+i*50,92,44,28,['#e0483a','#34b6e0','#f0c030'][i]);k.r(324+i*50,92,44,28,['#d060b0','#f0c030','#e0483a'][i])}
    // The puffer.
    k.r(310,160,10,3,'#2a2320');k.ell(326,160,16,12,'#f0dca0');k.ell(326,166,12,6,'#fffef2');for(let i=0;i<8;i++)k.r(312+i*4,150+(i%2),2,3,'#c9a84a');k.r(320,156,4,4,'#2a2320');k.r(332,156,4,4,'#2a2320');k.r(325,164,4,2,'#e0483a');k.r(341,158,6,5,'#e8c070');
    // Billiken.
    k.r(176,234,16,6,'#8e8a7c');k.r(178,220,12,14,'#d8b04a');k.ell(184,216,7,6,'#e0bc60');k.r(182,212,4,3,'#e0bc60');k.r(180,216,2,1,'#2a2320');k.r(186,216,2,1,'#2a2320');k.r(179,232,4,2,'#f0d070');k.r(185,232,4,2,'#f0d070');
    // The arch.
    k.above(()=>{k.r(170,244,6,76,'#b9bfbf');k.r(304,244,6,76,'#b9bfbf');for(let i=0;i<70;i++){const t=(i-35)/35,y=250-(1-t*t)*12;k.r(240+i*2-70,y,2,4,'#efe9dd')}k.r(196,236,88,10,'#c8452e');k.text(204,235.5,'新世界','#fffef2',false)});
  }},
  // Biwako Terrace: off the gondola and across the ridge's grass to the three wooden decks stepping down the summit's edge, the shallow pool at the top of them, Lake Biwa filling everything beyond.
  biwako:{layout:{start:[116,300],exit:[104,262],camera:[392,192],solids:[[0,0,480,186],[172,206,30,10],[282,206,30,10],[220,240,44,10],[20,280,70,40]],lamps:[[120,210,60,warm,.6],[360,210,60,warm,.6],[240,250,70,warm,.6],[70,276,44,cool,.6]]},draw:k=>{
    k.r(0,0,480,86,'#a8d0e4');for(const [x,y,w] of [[40,44,80],[300,50,110],[180,56,60]] as const){k.r(x,y,w,4,'#f4f6f4');k.r(x+8,y-3,w-20,3,'#f4f6f4')}k.ell(380,92,200,20,'#7f9aa8');k.ell(100,90,140,14,'#8ea8b4');
    k.water(0,86,480,100,'#3f7fa8','#7cb4d0');k.ell(340,126,30,9,'#4f7a5a');k.ell(340,124,24,6,'#6a9068');k.ell(90,110,12,3,'#7f9a7c');k.r(0,164,480,22,'#5c8460');for(let x=0;x<480;x+=12)softCrown(k.r,k.rand,x,168,10,8,greens[1]);
    k.ground(0,186,480,134,'#7fa266','#6e925a');
    // The decks, each a step down towards the lake: the pool first, its far edge lost in the lake.
    for(const [y,h,c] of [[178,28,'#b08858'],[206,34,'#a87f50'],[240,36,'#9f7648']] as const){const m=(y-178)/4+40;k.r(m,y,480-m*2,h,c);for(let yy=y;yy<y+h;yy+=4)k.r(m,yy,480-m*2,1,'#8a6240');k.r(m,y+h,480-m*2,3,'#5a3e2a')}
    k.r(40,178,400,10,'#7cc0dc');for(let x=44;x<436;x+=14)k.r(x,181,8,1,'#c0e4f0');
    for(const [x,y] of [[172,206],[282,206],[220,240]] as const){k.shade(x,y+11,30);k.r(x,y+3,30,8,'#efe9dd');k.r(x,y,30,4,'#d8d2c4');k.r(x+2,y+11,3,3,'#3a3a38');k.r(x+25,y+11,3,3,'#3a3a38')}
    for(const x of [100,380]){k.r(x,216,2,20,'#3a3a38');k.r(x-1,212,4,4,'#f6e0a0')}
    // The gondola's top station, the cable running off the foot of the screen.
    k.r(20,276,70,44,'#d8d4c4');k.eaves(55,264,84,14,'#54504a');k.r(32,290,46,30,'#2a3238');k.r(40,296,30,18,'#c8452e');k.r(44,298,10,8,'#a8c4cc');k.r(56,298,10,8,'#a8c4cc');
    k.cedar(460,300,44);k.cedar(440,316,40);k.tree(150,300,greens[2]);k.tree(300,306,greens[2]);
  }},
  // Otsu: the promenade along Lake Biwa, the pier and the paddle steamer waiting at it, the great fountain out on the water, Hiei behind; and the festival's float, drawn up on the lawn.
  'otsu-shore':{layout:{start:[60,298],exit:[18,268],camera:[132,80],solids:[[0,0,120,148],[160,0,320,148],[0,0,480,66],[336,216,50,44]],puffs:[[420,116,0xdff0f6]],lit:[[180,96,140,4],[332,206,58,6],[0,44,480,8]],lamps:[[250,104,80,paper,.7],[140,110,40,warm,.8],[360,226,50,paper,.8],[90,170,60,warm,.7],[260,170,60,warm,.7],[420,170,60,warm,.7]]},draw:k=>{
    k.r(0,0,480,56,'#b7d4dc');k.ell(150,60,180,24,'#5c8460');k.ell(380,62,170,20,'#6a9068');k.r(0,44,480,8,'#a8b0a8');for(let x=4;x<480;x+=11)k.r(x,46+x%5,3,2,'#f6e0a0');k.water(0,52,480,98,'#4f8fa8','#8cc0cf');
    k.ell(420,120,3,3,'#dff0f6');for(let i=0;i<34;i++){const t=(i-17)/17;k.r(420+t*36,118-(1-t*t)*44,2,3,'#eaf6fa')}for(let i=0;i<16;i++){const t=(i-8)/8;k.r(420+t*18,118-(1-t*t)*58,2,3,'#ffffff')}k.ell(420,120,40,5,'#a8d4e0');
    k.stones(120,60,40,92,'#a87f50','#8a6240');k.r(118,60,2,92,'#5a3e2a');k.r(160,60,2,92,'#5a3e2a');for(const y of [78,110,140])k.r(116,y,3,6,'#3a3028');
    // The Michigan: white decks over the hull, the paddlewheel red at her stern.
    k.r(168,126,160,16,'#efe9dd');k.r(168,136,160,6,'#c8452e');k.r(174,112,146,14,'#fbf8ec');for(let x=178;x<316;x+=9)k.r(x,115,6,7,'#5c7f8f');k.r(184,98,126,14,'#fbf8ec');for(let x=188;x<306;x+=9)k.r(x,101,6,6,'#5c7f8f');k.r(180,96,134,3,'#c8452e');k.r(226,76,8,22,'#3a3a38');k.r(258,76,8,22,'#3a3a38');k.r(224,74,12,3,'#d8b04a');k.r(256,74,12,3,'#d8b04a');k.r(328,112,18,30,'#c8452e');for(let y=114;y<140;y+=5)k.r(328,y,18,2,'#efe9dd');
    k.stones(0,148,480,62,'#c8bfa6','#b0a890');k.r(0,146,480,3,'#8e8a7c');k.ground(0,210,480,110,'#7fa266','#6e925a');k.stones(0,262,480,22,'#c8bfa6','#b0a890');
    for(const x of [46,178,306,450]){k.r(x-1,160,2,30,'#4c6156');k.r(x-4,156,8,5,'#f6e0a0')}for(const [x,y] of [[120,244],[250,242],[60,312],[420,310],[250,312]])k.pine(x,y);
    // The float: a lacquered two-storey cart under its roof, curtains red and gold.
    k.shade(334,258,54,3);k.r(338,252,44,4,'#2a2320');k.ell(346,254,6,6,'#3a2c20');k.ell(374,254,6,6,'#3a2c20');k.r(340,232,40,20,'#c8452e');for(let x=342;x<378;x+=6)k.r(x,234,3,16,'#d8b04a');k.r(342,214,36,18,'#2a2320');k.r(346,218,28,10,'#f6e0a0');k.eaves(360,206,58,8,'#3a3028','#00000030','#d8b04a');k.r(358,196,4,10,'#d8b04a');
  }},
  // Nikko Toshogu: in by the Nio gate through the cedars, the five-storey pagoda on the left, the plain Sacred Stable with its three monkeys on the right, then the stone stairs to the white-and-gold Yomeimon.
  toshogu:{layout:{start:[240,304],exit:[330,256],camera:[316,190],solids:[[0,0,52,320],[428,0,52,320],[0,0,480,118],[86,120,48,74],[324,194,92,44],[60,280,142,40],[278,280,142,40]],over:[[156,210,168,72]],lamps:[[240,104,70,0xffe6a0,.8],[110,190,44,paper,.5],[370,240,50,warm,.5],[240,276,44,paper,.6],[196,152,30,paper,.5],[284,152,30,paper,.5]]},draw:k=>{
    k.ground(0,0,480,320,'#c9c2ab','#b5ae97');k.forest(0,0,480,70,cedars);for(const y of [84,130,176,222,268,314]){k.cedar(22,y,78);k.cedar(458,y,78);k.cedar(50-(y%3)*2,y+12,70)}
    k.stones(200,120,80,200,'#b2ac98','#9a9482');
    for(let y=126;y<158;y+=4){k.r(180,y,120,3,'#a8a290');k.r(180,y,120,1,'#c8c2ae')}k.r(90,118,300,8,'#a8a290');k.wall(50,102,150,16,'#c8452e','#3f4a46');k.wall(280,102,150,16,'#c8452e','#3f4a46');
    // The Yomeimon: white pillars, gold brackets stacked under the roofs.
    k.r(196,84,88,34,'#f4f0e4');for(const x of [198,226,246,274])k.r(x,84,6,34,'#ffffff');k.r(226,94,28,24,'#262019');k.r(196,78,88,6,'#d8a838');for(let x=198;x<282;x+=5)k.r(x,79,3,4,k.int(2)?'#2f7a6a':'#c8452e');k.eaves(240,66,112,12,'#2f3a38','#00000040','#d8a838');k.r(208,56,64,10,'#f4f0e4');for(let x=208;x<272;x+=4)k.r(x,58,2,6,k.int(2)?'#d8a838':'#2f7a6a');k.eaves(240,44,92,12,'#2f3a38','#00000040','#d8a838');k.r(220,74,40,3,'#f0d060');
    k.pagoda(110,194,5,44,'#b5402f','#3f4a46',15);for(const y of [120,135,150,165,180])k.r(92,y+6,36,1,'#d8a838');
    // The Sacred Stable: the one unpainted building; three monkeys on its lintel.
    k.hall(370,178,104,18,40,'#8a6e50','#5a4e3c','#5a4630','#3a2e24');k.r(334,197,60,13,'#6e543c');for(let i=0;i<3;i++){const x=340+i*18;k.r(x,200,8,8,'#d8cfae');k.r(x+2,198,4,4,'#e8e0c4');k.r(x+1+(i===1?-1:0),[201,199,203][i],6,2,'#7a5a3a')}
    for(const x of [186,290])k.stoneLantern(x,136);for(const [x,y] of [[160,210],[320,250],[150,250]])k.stoneLantern(x,y);
    k.above(()=>k.gate(240,282,160,'#b5402f','#3f4a46',40,'#d8a838'));for(const x of [176,296]){k.r(x,256,12,24,'#c8452e');k.r(x+2,258,8,6,'#e8735a');k.r(x+3,264,6,14,'#e0604a')}k.r(60,282,142,14,'#c8452e');k.r(278,282,142,14,'#c8452e');k.eaves(131,274,146,8,'#3f4a46');k.eaves(349,274,146,8,'#3f4a46');k.ground(60,296,142,24,'#a59e88','#918a76');k.ground(278,296,142,24,'#a59e88','#918a76');
  }},
  // Kanmangafuchi: the path along the gorge, the moss, the long uneven row of red-capped Jizo facing the river, the Daiya running turquoise over lava rock, a fall coming down at the end.
  kanmangafuchi:{layout:{start:[22,200],exit:[6,170],camera:[440,180],solids:[[0,0,480,170],[0,232,480,88]],lamps:[[120,194,50,warm,.4],[300,194,50,warm,.4],[440,270,40,cool,.4]]},draw:k=>{
    k.forest(0,0,480,130,greens[1]);for(let x=14;x<480;x+=44)k.cedar(x+k.int(14),124+k.int(8),60);k.ground(0,126,480,44,'#5f8a4e','#4d7640');k.ground(0,170,480,62,'#a8a088','#948c76');for(let i=0;i<60;i++)k.ell(k.int(480),173+k.int(56),3+k.int(5),2,'#9a927c');
    // Their row: heads at odds, some lost, a cap and bib on each, the moss climbing.
    for(let x=30,i=0;x<470;x+=13,i++){const y=146+(i%3===1?1:0)+k.int(2);if(i%11===7){k.r(x,y+10,10,4,'#7d7d72');continue}k.jizo(x,y,['#c8452e','#d4503a','#b83a28'][k.int(3)],i%4!==2);k.r(x,y+11,10,3,'#5f8a4e');k.r(x+k.int(7),y+9,3,2,'#6a9a54')}
    k.ground(0,232,480,88,'#3f4f44','#33423a');k.r(0,232,480,4,'#5f8a4e');
    k.water(0,246,480,74,'#3f9ca8','#7fd0d4',90);for(let i=0;i<70;i++)k.r(k.int(460),250+k.int(66),10+k.int(14),1,'#c8ecec');for(let i=0;i<20;i++){const x=k.int(450),y=240+k.int(68),w=14+k.int(26);k.ell(x,y+8,w/2+1,7,'#2a3430');k.ell(x,y+6,w/2,7,'#4a5450');k.ell(x-2,y+4,w/3,3,'#5f8a4e');k.r(x-w/2,y+13,w,1,'#e8f6f6')}
    // The fall, far end.
    k.r(428,232,30,44,'#4a5450');for(let x=434;x<452;x+=3)k.r(x,232,2,48,'#e8f6f6');k.ell(443,282,20,6,'#e8f6f6');
    for(let i=0;i<6;i++){k.r(330,70+i*6,1,1,'#ffffff')}k.r(337,110,5,3,'#d8b030');k.r(338,108,3,8,'#2a2320');
  }},
  // Shinkyo: the Daiya coming down between cedar banks, the vermilion bridge arched across it, black lacquer below, and the plain road bridge downstream, from which it is seen; over it, the shrine's stone stairs and the priest Shodo with his two snakes.
  shinkyo:{layout:{start:[60,298],exit:[18,268],camera:[132,206],solids:[[172,0,136,118],[172,150,136,100],[172,286,136,34],[0,0,480,60],[0,0,30,250],[400,0,80,250],[352,120,16,20]],lamps:[[240,124,60,0xffb070,.6],[130,270,50,warm,.6],[350,270,50,warm,.6],[360,110,30,warm,.5]]},draw:k=>{
    k.forest(0,0,480,320,cedars);k.ground(30,60,142,190,'#8aa070','#7a9060');k.ground(308,60,92,190,'#8aa070','#7a9060');k.ground(0,250,172,70,'#a8a496','#969284');k.ground(308,250,172,70,'#a8a496','#969284');
    k.ground(320,60,60,70,'#c9c2ab','#b5ae97');for(let y=66;y<118;y+=5)k.r(322,y,56,3,'#a8a290');
    k.r(172,0,136,320,'#4f8fa0');k.water(176,0,128,320,'#4f8fa0','#a6d4d8',220);for(let i=0;i<16;i++){const x=180+k.int(112),y=64+k.int(250);k.rock(x,y,12+k.int(10),7,'#8f8f86')}for(let y=0;y<320;y+=3)k.r(172+Math.sin(y/9)*2,y,4,3,'#6f8a7c'),k.r(304+Math.sin(y/7)*2,y,4,3,'#6f8a7c');
    for(const [x,y] of [[60,100],[80,150],[50,200],[150,90],[430,100],[420,190],[390,210]])k.cedar(x,y,62);
    // The arch, side on: stone piers, black under the deck, vermilion all along the rail.
    k.r(196,152,8,28,'#7d7d72');k.r(276,152,8,28,'#7d7d72');for(let i=0;i<140;i++){const t=(i-70)/70,y=146+t*t*12;k.r(170+i,y,1,10,'#1f1a18');k.r(170+i,y+10,1,3,'#3a2c20')}
    k.r(166,122,148,26,'#c8452e');for(let x=166;x<314;x+=4)k.r(x,123,1,24,'#a8342a');k.r(166,118,148,4,'#d4502e');k.r(166,148,148,4,'#d4502e');for(let x=170;x<314;x+=20){k.r(x,114,4,8,'#d4502e');k.r(x,144,4,8,'#d4502e');k.r(x,112,4,3,'#d8b04a');k.r(x,142,4,3,'#d8b04a')}
    // The road bridge.
    k.r(166,250,148,36,'#7c7f7e');k.r(166,250,148,3,'#b9bfbf');k.r(166,283,148,3,'#b9bfbf');k.r(166,266,148,1,'#e6e3cc');
    k.r(352,126,16,12,'#8e8a7c');k.r(354,108,12,18,'#5a6a60');k.ell(360,106,5,5,'#6e7e72');for(const s of [-1,1])k.r(360+s*10-2,122,4,16,'#4a6a4a');
  }},
  // Kamakura: the Great Buddha in the open air on his stone base, the lotus and the incense before him, the hills behind, and on the way there Hase's little Jizo gathered by the hundred; the sea through the trees.
  'kamakura-trail':{layout:{start:[240,304],exit:[200,280],camera:[330,196],solids:[[0,0,480,70],[166,70,148,84],[226,158,28,16],[34,214,120,60],[400,60,80,180],[0,0,30,320],[330,280,150,40]],puffs:[[240,156,0xc8c8c0]],lamps:[[240,126,70,warm,.5],[240,168,40,0xffb070,.7],[92,250,60,paper,.5],[300,250,50,warm,.4]]},draw:k=>{
    k.ground(0,0,480,320,'#c4bdaa','#b3ad9b');k.forest(0,0,480,74,greens[1]);k.stones(208,144,64,176,'#b4ae9a','#9c9684');
    // The sea, past the trees on the right.
    k.r(400,60,80,84,'#b7d4dc');k.water(400,92,80,52,'#5a93b4','#9cc8dc');k.forest(400,140,80,100,greens[2]);for(let y=56;y<150;y+=11)softCrown(k.r,k.rand,402,y,12,9,greens[1]);for(let x=410;x<480;x+=16)softCrown(k.r,k.rand,x,60,12,8,greens[1]);
    k.at(9,()=>{
    k.r(164,124,152,22,'#8e8a7c');k.r(164,124,152,3,'#aeaa9c');k.r(176,114,128,12,'#9e9a8c');
    // The Buddha: broad-shouldered bronze gone green, hands in his lap, the great head a little forward, the curls, the long ears.
    const b='#5a7a70',d='#466258',l='#739488';k.ell(240,104,56,14,d);k.ell(240,100,52,14,b);k.r(190,70,100,34,b);k.ell(240,76,44,26,b);for(let i=0;i<9;i++)k.r(198+i*10,78+i%2,3,24,d);k.r(218,96,44,12,d);k.r(222,98,36,8,b);k.ell(240,50,21,22,b);k.ell(232,44,10,12,l);k.r(216,36,48,12,d);for(let y=30;y<46;y+=4)for(let x=220;x<262;x+=4)k.r(x,y,3,3,l);k.ell(240,30,7,4,d);k.r(217,46,4,18,d);k.r(259,46,4,18,d);k.r(228,50,10,1,'#2a3a34');k.r(242,50,10,1,'#2a3a34');k.r(238,52,4,8,l);k.r(234,62,12,1,'#2a3a34');k.r(238,41,4,4,l);
    });
    k.r(226,160,28,14,'#6a5a48');k.r(226,160,28,2,'#8a7a64');k.r(236,150,8,10,'#3c3a36');for(const x of [214,260]){k.r(x,150,5,24,'#54504a');k.r(x-3,146,11,5,'#7a8a70')}
    // The little Jizo, row on row on their stone steps.
    for(let row=0;row<5;row++){k.r(34,216+row*12,120,12,['#8e8a7c','#9a9688'][row%2]);for(let x=36;x<150;x+=8){const y=214+row*12;k.r(x,y+3,6,7,'#a3a598');k.r(x+1,y,4,4,'#b5b5a8');k.r(x+1,y+4,4,2,k.int(4)?'#c8452e':'#e8c040')}}
    for(const [x,y] of [[16,120],[70,130],[110,190],[350,110],[376,200],[20,296],[110,300],[350,296],[420,300],[460,296]])k.tree(x,y,x>300?greens[2]:greens[1]);
  }},
  // Arashiyama: the bamboo path itself, climbing and bending between brushwood fences, the stalks closing in overhead, a rickshaw waiting at the bend.
  arashiyama:{layout:{start:[230,304],exit:[192,280],camera:[346,160],solids:[[0,0,190,320],[270,200,210,120],[190,0,150,130],[400,0,80,200],[340,0,60,60],[352,74,30,18]],over:[[0,0,190,70],[400,0,80,70]],lamps:[[230,250,60,warm,.5],[260,160,60,warm,.5],[370,110,60,warm,.5]]},draw:k=>{
    k.r(0,0,480,320,'#203c2c');k.ground(190,130,80,190,'#c7ba96','#b0a37e');k.ground(190,130,210,70,'#c7ba96','#b0a37e');k.ground(340,44,60,160,'#c7ba96','#b0a37e');
    grove(k,0,180,36,306);grove(k,276,204,206,318);grove(k,190,152,36,124);grove(k,406,74,36,196);
    brushwood(k,178,130,12,190);brushwood(k,270,200,130,14);brushwood(k,190,118,150,14);brushwood(k,400,44,10,160);brushwood(k,330,44,10,74);
    const leaves=greens[2];for(let i=0;i<14;i++)softCrown(k.r,k.rand,k.int(480),36+k.int(30),16,9,leaves);
    // The rickshaw, black and red, its shafts down.
    k.shade(350,90,36);k.ell(358,84,7,7,'#2a2320');k.ell(358,84,4,4,'#c9a84a');k.r(354,72,24,8,'#c8452e');k.r(354,64,14,9,'#2a2320');k.r(378,78,14,2,'#2a2320');
  }},
};

/** Heian-jingu's street: Nijo-dori where the other sights have their road, the Rohm Theatre and the park across it, the Otenmon at the end of the approach; then, south of the crossing, the Jingu-michi running on between the two museums, under the great torii (24.4 m, vermilion, gold collars, on stone skirts, a pine before its left leg, as in the photo),
 * to the Keiryu bridge over the Okazaki canal and its cherries. */
const avenues:Record<string,{layout:Avenue;draw:(k:Kit)=>void}>={
  'heian-road':{layout:{height:560,camera:[308,442],solids:[[0,262,150,212],[330,262,150,212],[166,430,24,10],[290,430,24,10],[0,474,194,46],[286,474,194,46],[142,452,36,18]],over:[[136,300,208,20],[150,328,180,10],[170,320,18,98],[294,320,18,98]],lit:[[0,94,168,16]],lamps:[[178,444,70,warm,.8,.5],[302,444,70,warm,.8,.5],[240,372,110,0xffb070,.55],[158,458,44,0xfff6d0,.8],[322,424,44,0xfff6d0,.8],[240,496,70,warm,.5],[60,546,50,warm,.5],[420,546,50,warm,.5],[88,120,80,warm,.5,.4]]},draw:k=>{
    // Across Nijo-dori: the theatre's brick foot and long glass floors on the left, the park on the right, the approach to the gate between.
    k.r(0,44,190,92,'#6f6358');k.r(0,44,190,6,'#3e3a36');k.r(0,50,190,8,'#b9a58c');k.r(0,94,168,16,'#e8d8a0');for(let x=0;x<190;x+=12){k.r(x,58,4,52,'#4a4440')}k.r(0,110,190,26,'#7a4a38');for(let y=114;y<136;y+=4)k.r(0,y,190,1,'#5f3a2c');k.text(8,62,'ロームシアター京都','#f4e4b8',false);
    k.forest(190,44,290,92,greens[1]);k.r(186,124,104,12,'#5a8559');
    k.gate(240,134,112,'#d4502e','#3d7a5e',30);
    // South of the crossing: the avenue, its wide brick pavements, the lawns.
    k.ground(0,250,480,310,'#b9b09a','#a89f8a',2000);
    k.stones(150,262,56,212,'#b3aa96','#9f9784');k.stones(274,262,56,212,'#b3aa96','#9f9784');
    k.r(206,247,68,233,'#5d625c');for(let y=268;y<474;y+=22)k.r(239,y,2,12,'#e6e3cc');k.r(204,262,2,212,'#e0dccb');k.r(274,262,2,212,'#e0dccb');for(let x=208;x<272;x+=9)k.r(x,250,5,10,'#e6e3cc');
    // The two museums, either side: the modern art's pale slabs, and the city museum's imperial crown over its brick.
    k.r(0,272,150,136,'#cfcdc4');k.r(0,272,150,6,'#8f8f88');for(let y=284;y<328;y+=14){k.r(8,y,134,9,'#6a7880');for(let x=8;x<142;x+=14)k.r(x,y,2,9,'#cfcdc4')}k.r(10,330,126,8,'#efe4c0');k.text(14,331,'京都国立近代美術館','#3d2e24',false);k.r(0,340,150,68,'#b5b3aa');for(let x=6;x<150;x+=18)k.r(x,342,10,66,'#8f9498');k.r(0,406,150,3,'#00000040');
    k.r(330,296,150,112,'#b9966e');for(let y=300;y<408;y+=5)k.r(330,y,150,1,'#a6845e');k.r(382,272,46,8,'#b9966e');k.eaves(405,264,70,8,'#4b5456');k.eaves(405,280,160,14,'#4b5456');for(const x of [346,374,424,452])k.r(x,302,14,24,'#46525a');k.r(392,350,26,58,'#2a2320');k.r(344,330,122,8,'#efe4c0');k.text(350,331,'京都市京セラ美術館','#3d2e24',false);k.r(330,406,150,3,'#00000040');
    // Lawns and pines before them.
    for(const [x,w] of [[14,136],[330,136]]){k.ground(x,416,w,54,'#5a8559','#6c9862',200);k.r(x,414,w,2,'#8f8f88')}
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
    k.r(0,470,480,4,'#a39d8c');k.water(0,474,480,46,'#4a8a8c','#86bcbc');k.r(0,474,480,3,'#00000040');k.r(0,518,480,4,'#a39d8c');
    k.shade(84,504,58,2);k.r(84,494,58,10,'#6a5240');k.r(98,484,30,10,'#efe4c0');k.r(96,482,34,3,'#3a2c20');
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
const postCamera=(k:Kit,[cx,cy]:[number,number])=>{k.shade(cx+4,cy+21,12,2);k.r(cx+7,cy+14,3,8,'#665c49');k.r(cx,cy,20,14,'#f1dfb6');k.r(cx+3,cy-3,7,3,'#e5c997');k.r(cx+9,cy+3,8,8,'#3e6871');k.r(cx+11,cy+5,4,4,'#9ec8c0');k.r(cx+2,cy+3,3,2,'#b66a51');k.r(cx,cy+13,20,2,'#a7916a')};
const seedOf=(place:string)=>[...place].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
/** Lift the parts of a finished picture out of it: above the traveller, and above the night. */
const lift=(scene:Phaser.Scene,place:string,picture:HTMLCanvasElement,top:HTMLCanvasElement,{over,lit}:{over?:Box[];lit?:Box[]},w:number,h:number)=>{const painted=top.getContext('2d')!.getImageData(0,0,top.width,top.height).data.some(alpha=>alpha>0);for(const [name,boxes,from] of [['over',over,painted?top:picture],['lit',lit,picture]] as const)if(boxes){const lifted=mapCanvas(scene,`map-${place}-${name}`,w,h);lifted.context.imageSmoothingEnabled=false;for(const [x,y,bw,bh] of boxes)lifted.context.drawImage(from,x*2,y*2,bw*2,bh*2,x,y,bw,bh);lifted.refresh()}};
/** The layer of what `above` paints, as large as the picture and in its art px. */
const topLayer=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d',{willReadFrequently:true})!;g.scale(2,2);return g};
/** What an avenue paints over makeSightRoad's street, its picture's height, and the lifting done once it stands. */
export function dressRoad(scene:Phaser.Scene,place:string){const avenue=avenues[place],top=topLayer(480,avenue.layout.height);return {height:avenue.layout.height,dress:(g:CanvasRenderingContext2D)=>{const k=kit(g,seedOf(place),top);avenue.draw(k);postCamera(k,avenue.layout.camera)},lifted:(picture:HTMLCanvasElement)=>lift(scene,place,picture,top.canvas,avenue.layout,480,avenue.layout.height)}}
/** A place's picture, once: `map-<place>`, with `map-<place>-over`, the boxes of it the traveller walks under, and `map-<place>-lit`, those that shine through the night. */
export function makeScene(scene:Phaser.Scene,place:string){
  if(scene.textures.exists('map-'+place))return;
  const {layout,draw}=scenes[place],w=layout.width??480,h=layout.height??320,texture=mapCanvas(scene,'map-'+place,w,h),g=texture.context,top=topLayer(w,h),k=kit(g,seedOf(place),top);
  draw(k);
  const sign=([x,y]:[number,number],ja:string,en:string)=>{k.shade(x+6,y+23,10,2);k.r(x+8,y+14,3,10,'#5b4a38');k.r(x,y,42,14,'#3d2e24');k.r(x+1,y+1,40,12,'#efe2c0');k.text(x+3,y+2,ja,'#3d2e24');letter(g,x+24,y+5,en,'#3d2e24')};
  sign(layout.exit,'出口','EXIT');if(layout.way)sign(layout.way.at,layout.way.ja,layout.way.sign);
  postCamera(k,layout.camera);
  texture.refresh();
  lift(scene,place,g.canvas,top.canvas,layout,w,h);
  (layout.stands??[]).forEach(([x,y,bw,bh],i)=>{const stand=mapCanvas(scene,`map-${place}-stand-${i}`,bw,bh);stand.context.imageSmoothingEnabled=false;stand.context.drawImage(top.canvas,x*2,y*2,bw*2,bh*2,0,0,bw,bh);stand.refresh()});
}
