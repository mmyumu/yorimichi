import { inKyoto, stations, type Hub } from './network';
import { linesAt } from './rail';

// Every station's commemorative stamp (駅スタンプ), as the stamp books collect them: an ink picture of somewhere near the station in a frame, its name in kanji with 駅 and in capitals under it.
// A stamp is S × S dots, two a book pixel (the half-pixel dots of the map signs' lettering): the picture is drawn on a 64 grid (`Pen`, a dot two dots wide), the lettering in the bitmap fonts' own dots.
// The places known for something have their own picture (`landmarks`, by Japanese name); the others take one of their region's (`pools`), varied by their name. Frame, ink and layout come from the name too, so no two stamps are alike.
export const S=128;
const hash=(text:string)=>[...text].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,2166136261);
/** A small seeded generator (mulberry32). */
export const seeded=(seed:number)=>()=>{seed=(seed+0x6d2b79f5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296};

/** Draws ink (1) or clears it (0) on the 64 grid, testing each dot's centre. The picture's room: x 12–52, y 8–33, the ground at 33. */
class Pen{
  m=new Uint8Array(S*S);flip=false;ox=0;
  constructor(public rand:()=>number){}
  dot(x:number,y:number,v=1){let i=Math.floor(x+this.ox);const j=Math.floor(y);if(this.flip)i=63-i;if(i<0||j<0||i>63||j>63)return;const k=j*2*S+i*2;this.m[k]=this.m[k+1]=this.m[k+S]=this.m[k+S+1]=v}
  private fill(test:(x:number,y:number)=>boolean,x0:number,y0:number,x1:number,y1:number,v:number){for(let j=Math.max(0,Math.floor(y0)-1);j<=Math.min(63,Math.ceil(y1));j++)for(let i=Math.max(0,Math.floor(x0)-1);i<=Math.min(63,Math.ceil(x1));i++)if(test(i+.5,j+.5))this.dot(i,j,v)}
  r(x:number,y:number,w:number,h:number,v=1){this.fill((a,b)=>a>=x&&a<x+w&&b>=y&&b<y+h,x,y,x+w,y+h,v)}
  k(x:number,y:number,w:number,h:number){this.r(x,y,w,h,0)}
  d(cx:number,cy:number,rad:number,v=1){this.fill((a,b)=>(a-cx)**2+(b-cy)**2<=rad*rad,cx-rad,cy-rad,cx+rad,cy+rad,v)}
  e(cx:number,cy:number,rx:number,ry:number,v=1){this.fill((a,b)=>((a-cx)/rx)**2+((b-cy)/ry)**2<=1,cx-rx,cy-ry,cx+rx,cy+ry,v)}
  o(cx:number,cy:number,rad:number,v=1){this.fill((a,b)=>Math.abs(Math.hypot(a-cx,b-cy)-rad)<=.6,cx-rad-1,cy-rad-1,cx+rad+1,cy+rad+1,v)}
  p(pts:number[],v=1){
    const xs=pts.filter((_,i)=>i%2===0),ys=pts.filter((_,i)=>i%2===1),n=xs.length;
    this.fill((a,b)=>{let inside=false;for(let i=0,j=n-1;i<n;j=i++)if((ys[i]>b)!==(ys[j]>b)&&a<(xs[j]-xs[i])*(b-ys[i])/(ys[j]-ys[i])+xs[i])inside=!inside;return inside},Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys),v);
  }
  l(x0:number,y0:number,x1:number,y1:number,v=1){const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))));for(let s=0;s<=n;s++)this.dot(x0+(x1-x0)*s/n,y0+(y1-y0)*s/n,v)}
  /** Three rows of broken strokes: water. */
  water(y:number,x0=10,x1=54){for(let row=0;row<3;row++)for(let x=x0+(row*3+Math.floor(this.rand()*3))%5;x<x1;x+=5)this.r(x,y+row*2,2+(row&1),1)}
  /** Whether a box of the grid is still bare. */
  empty(x:number,y:number,w:number,h:number){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)if(this.m[j*2*S+i*2])return false;return true}
  /** A grid of lit windows cleared out of a block. */
  windows(x:number,y:number,w:number,h:number,step=2){for(let j=y;j<y+h;j+=step)for(let i=x;i<x+w;i+=step)this.k(i,j,1,1)}
}
type Painter=(p:Pen)=>void;

// Shared shapes.
const torii=(p:Pen,cx:number,top:number,w:number,h:number)=>{
  p.p([cx-w/2-2,top-1,cx+w/2+2,top-1,cx+w/2+1,top+1.5,cx-w/2-1,top+1.5]);p.r(cx-w/2-3,top-2,2,1);p.r(cx+w/2+1,top-2,2,1);
  const pw=Math.max(1,Math.round(w/9));p.r(cx-w/2,top+4,w,1);p.r(cx-w/2+1,top+1,pw,h);p.r(cx+w/2-1-pw,top+1,pw,h);p.r(cx-.5,top+1,1,3);
};
const castle=(p:Pen,cx:number,base:number,tiers:number,moat=false)=>{
  p.p([cx-base/2-3,33,cx+base/2+3,33,cx+base/2,27,cx-base/2,27]);for(let x=cx-base/2;x<cx+base/2;x+=4)p.k(x+(x/4&1)*2,30,1,1);
  let y=27,w=base-4;
  for(let t=0;t<tiers;t++){
    p.r(cx-w/2,y-4,w,4);for(let x=cx-w/2+2;x<cx+w/2-1;x+=3)p.k(x,y-3,1,1);
    p.p([cx-w/2-3,y-3.5,cx+w/2+3,y-3.5,cx+w/2,y-6,cx-w/2,y-6]);p.r(cx-w/2-4,y-5,1,1);p.r(cx+w/2+3,y-5,1,1);
    y-=6;w-=6;
  }
  p.r(cx-w/2-1,y-1,1,2);p.r(cx+w/2,y-1,1,2);
  if(moat)p.water(33,10,54);
};
const wheel=(p:Pen,cx:number,cy:number,rad:number)=>{
  p.o(cx,cy,rad);for(let a=0;a<8;a++)p.l(cx,cy,cx+Math.cos(a*Math.PI/4)*rad,cy+Math.sin(a*Math.PI/4)*rad);
  for(let a=0;a<16;a++)p.d(cx+Math.cos(a*Math.PI/8)*rad,cy+Math.sin(a*Math.PI/8)*rad,1.1);
  p.l(cx,cy,cx-rad*.55,33);p.l(cx,cy,cx+rad*.55,33);p.d(cx,cy,1.6);
};
const steam=(p:Pen)=>{
  p.r(16,19,22,8);p.r(18,12,4,7);p.r(17,12,6,1);p.r(27,16,4,3);p.r(38,13,12,15);p.k(41,16,4,4);p.r(37,12,14,1);
  p.p([11,31,16,26,16,31]);p.k(16,24,22,1);
  for(const x of [22,30])p.d(x,29,3.5);p.d(44,30,2.5);for(const x of [22,30,44])p.d(x,x===44?30:29,1,0);p.l(20,29,32,29,0);
  p.d(18,8,2.2);p.d(23,6,1.8);p.d(13,7,1.6);p.r(10,33,44,1);
};
const nose=(p:Pen)=>{
  p.p([10,30,38,30,48,29,54,26,50,23,40,20,10,20]);p.p([41,21.5,48,23.5,46,25,41,24.5],0);
  p.k(10,26,40,1);for(let x=13;x<37;x+=4)p.k(x,22,2,2);p.r(14,30,6,2);p.r(30,30,6,2);p.r(8,33,48,1);
};
const fox=(p:Pen,cx:number,s:number)=>{
  const q=(pts:number[])=>pts.map((v,i)=>i%2?33-v*s:cx+v*s);
  p.p(q([-4,0,4,0,3,9,-2,11]));p.d(cx-1*s,33-14*s,3*s);p.p(q([-3,14,-8,13,-3,12]));
  p.p(q([-3,16,-2,21,0,17]));p.p(q([0,17,1,21,2,16]));p.p(q([3,1,9,7,8,13,5,6]));p.p(q([-2,11,2,11,0,8]),0);
};
const jizo=(p:Pen,cx:number,h=1)=>{
  p.p([cx-4*h,33,cx+4*h,33,cx+4*h,33-7*h,cx+3*h,33-11*h,cx-3*h,33-11*h,cx-4*h,33-7*h]);p.d(cx,33-14.5*h,3.5*h);
  p.p([cx-3*h,33-11*h,cx+3*h,33-11*h,cx,33-7*h],0);p.l(cx-3*h,33-11*h,cx+3*h,33-11*h);
};
const leaf=(p:Pen,cx:number,cy:number,big:number,small:number,lobes:number,turn=0)=>{
  const pts:number[]=[];for(let k=0;k<lobes*2;k++){const a=-Math.PI/2+turn+k*Math.PI/lobes,r=k%2?small:big;pts.push(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}p.p(pts);
  for(let k=0;k<lobes;k++){const a=-Math.PI/2+turn+k*2*Math.PI/lobes;if(Math.sin(a)<.7)p.l(cx,cy,cx+Math.cos(a)*big*.75,cy+Math.sin(a)*big*.75,0)}
};
const bird=(p:Pen,ringed:boolean)=>{
  p.l(12,30,52,22);p.l(12,31,52,23);p.l(40,24,46,15);
  for(const [x,y] of [[18,26],[47,14],[50,19],[24,28]]){p.d(x,y,2);p.dot(x,y,0)}
  p.e(31,21,5,3.2);p.d(36,18,2.8);p.p([27,21,19,25,21,22,26,20]);p.p([38.5,17,42,17.6,38.5,18.6]);
  if(ringed){p.d(36.5,17.5,1.3,0);p.dot(36.5,17.5)}else p.dot(36.5,17.5,0);p.l(28,22,33,23,0);
};
const cherries=(p:Pen,cx:number,cy:number,n:number)=>{for(let i=0;i<n;i++){const x=cx+(p.rand()-.5)*16,y=cy+(p.rand()-.5)*8;p.d(x,y,3+p.rand()*2)}for(let i=0;i<n*2;i++)p.dot(cx+(p.rand()-.5)*18,cy+(p.rand()-.5)*10,0)};
const cedar=(p:Pen,x:number,top:number,base=30)=>{p.p([x-3,base,x+.5,top,x+4,base]);p.r(x,base,1,33-base)};

// The places' own pictures.
const landmarks:Record<string,Painter>={
  // The Marunouchi building's red brick and its two domes.
  東京:p=>{p.r(12,20,40,13);p.r(28,16,8,4);p.p([27,16,37,16,32,12]);for(const x of [17,47]){p.r(x-5,17,10,3);p.p([x-5,17,x-4,13,x-2,11,x+2,11,x+4,13,x+5,17]);p.r(x,8,1,3)}for(let x=14;x<51;x+=3){p.k(x,22,1,2);p.k(x,27,1,2)}p.k(30,29,4,4);p.r(10,33,44,1)},
  京都:p=>{p.r(14,26,36,7);for(let x=16;x<48;x+=3){p.k(x,28,2,1);p.k(x,30,2,1)}p.p([29,26,35,26,34,14,30,14]);p.r(27,11,10,4);p.k(28,12,8,1);p.p([29,11,35,11,33,8,31,8]);p.r(31,3,2,5)},
  鎌倉:p=>{p.p([16,33,48,33,45,25,40,22,24,22,19,25]);p.r(30,20,4,2);p.d(32,15,6.5);p.d(32,8.5,3.5);p.k(26,28,12,2);p.l(25,24,28,32,0);p.l(39,24,36,32,0);p.k(29,15,2,1);p.k(34,15,2,1);p.r(12,33,40,1)},
  // The Shinkyo, the sacred red bridge, its piers and the river under it.
  日光:p=>{for(let x=10;x<55;x++){const y=Math.round(23-4*Math.sin(Math.PI*(x-10)/44));p.r(x,y,1,2);p.r(x,y-3,1,1);if(x%4===0)p.r(x,y-3,1,3)}p.r(17,23,4,10);p.r(43,23,4,10);p.water(27);cedar(p,13,8,18);cedar(p,50,9,18)},
  上野:p=>{p.d(24,13,3.5);p.d(40,13,3.5);p.o(32,21,9);p.o(32,21,8.3);p.d(28,20,2.6);p.d(36,20,2.6);p.dot(28,19,0);p.dot(36,19,0);p.r(31,24,2,1);p.r(30,26,1,1);p.r(33,26,1,1);p.r(31,27,2,1);p.r(48,8,2,25);for(let y=12;y<33;y+=6)p.k(48,y,2,1);p.l(50,15,54,12);p.l(50,22,54,20)},
  渋谷:p=>{p.r(14,31,32,2);p.e(34,25,8,5);p.d(40,27,4);p.p([22,31,27,31,28,18,24,18]);p.d(24,15,4.5);p.r(17,15,6,3.5);p.p([22,11,24,6,27,11]);p.p([25,11,28,7,29,13]);p.dot(22,14,0);p.o(44,19,2.5);p.r(16,33,28,1)},
  // The government towers among the high-rises.
  新宿:p=>{p.r(13,19,7,14);p.r(22,10,6,23);p.r(30,10,6,23);p.r(22,18,14,15);p.k(24,10,2,2);p.k(32,10,2,2);p.r(39,14,6,19);p.r(46,21,6,12);p.windows(23,13,13,19);p.windows(14,21,6,11);p.windows(40,16,5,16);p.windows(47,23,5,9)},
  浜松町:p=>{const lx=(y:number)=>23+(33-y)*8/21,rx=(y:number)=>41-(33-y)*8/21;p.l(lx(33),33,lx(12),12);p.l(lx(33)+1,33,lx(12)+1,12);p.l(rx(33),33,rx(12),12);p.l(rx(33)-1,33,rx(12)-1,12);p.r(25,23,14,2);p.r(28,15,8,2);p.r(31,4,2,11);p.l(lx(33),33,rx(26),26);p.l(rx(33),33,lx(26),26);p.l(lx(22),22,rx(17),17);p.l(rx(22),22,lx(17),17);p.r(10,33,44,1)},
  原宿:p=>{p.r(14,24,30,9);p.p([12,24,46,24,42,18,16,18]);p.r(36,13,8,11);p.p([35,13,45,13,40,6]);p.r(40,4,1,2);for(const x of [17,24,33])p.k(x,25,1,8);p.k(19,26,3,3);p.k(26,26,3,3);p.k(39,16,2,3);p.k(29,28,3,5);p.r(10,33,44,1)},
  // A game pad, for Electric Town.
  秋葉原:p=>{p.p([16,15,48,15,52,25,49,31,43,31,39,25,25,25,21,31,15,31,12,25]);p.k(18,19,7,2);p.k(20.5,16.5,2,7);for(const [x,y] of [[44,17],[41,20],[47,20],[44,23]])p.d(x+.5,y+.5,1.3,0);p.k(28,20,2,1);p.k(33,20,2,1);p.l(32,15,32,10);p.l(32,10,38,8);p.l(38,8,44,9)},
  御茶ノ水:p=>{p.r(10,13,44,2);for(let x=13;x<52;x++){const y=Math.round(16+10*((x-32)/19)**2);p.r(x,y,1,2);if(x%4===0)p.r(x,15,1,y-15)}p.p([10,25,15,25,14,33,10,33]);p.p([49,25,54,25,54,33,50,33]);p.r(17,27,30,4);for(let x=19;x<45;x+=3)p.k(x,28,2,1);p.water(32,14,50)},
  品川:nose,新大阪:nose,
  横浜:p=>{wheel(p,23,18,10);p.p([40,30,49,30,47,7,42,7]);p.k(44,9,1,20);p.r(36,24,4,6);p.water(31)},
  小田原:p=>{castle(p,32,28,3);cedar(p,13,16,30);cedar(p,51,18,30)},
  彦根:p=>{castle(p,32,22,3);p.p([27,21,37,21,32,17],0);p.o(32,20,2)},
  大阪:p=>castle(p,32,30,3,true),
  二条:p=>{p.p([11,16,53,16,48,11,40,9,32,6,24,9,16,11]);p.o(32,12,2.5,0);p.r(15,16,34,2);p.r(17,18,3,15);p.r(44,18,3,15);p.r(22,19,20,14);p.k(31,19,2,14);for(const [x,y] of [[25,22],[37,22],[25,28],[37,28]])p.d(x,y,1.2,0);p.r(10,33,44,1)},
  // ♨: the bath and its three wisps.
  熱海:p=>{p.e(30,27,12,5);p.k(17,21,26,6);for(const s of [-6,0,6])for(let t=0;t<13;t++)p.dot(30+s+Math.round(Math.sin(t*.8)*1.5),24-t);p.water(31,10,54);p.p([46,31,48,14,49,31]);p.l(48,14,53,16);p.l(48,14,43,16);p.l(48,14,52,11)},
  湯河原:p=>{p.e(32,26,13,6);p.k(18,19,28,7);for(const s of [-6,0,6])for(let t=0;t<14;t++)p.dot(32+s+Math.round(Math.sin(t*.8+1)*1.5),23-t);p.p([12,33,22,27,30,30,40,25,52,33])},
  石和温泉:p=>{p.e(24,27,10,5);p.k(13,21,22,6);for(const s of [-5,0,5])for(let t=0;t<12;t++)p.dot(24+s+Math.round(Math.sin(t*.8)*1.5),24-t);for(const [x,y] of [[43,15],[47,15],[41,19],[45,19],[49,19],[43,23],[47,23],[45,27]])p.d(x,y,1.9);p.l(45,13,46,9)},
  鶯谷:p=>bird(p,false),目白:p=>bird(p,true),
  // Yanaka's cats.
  日暮里:p=>{p.e(30,27,7,6);p.d(30,17,5);p.p([25,15,26,9,29,13]);p.p([31,13,34,9,35,15]);p.dot(28,17,0);p.dot(32,17,0);p.l(37,31,44,26);p.l(37,32,45,27);p.l(44,26,45,19);p.l(45,27,46,20);p.r(10,33,44,1);for(let x=12;x<54;x+=6)p.r(x,22,1,11);p.r(10,24,8,1);p.r(42,24,12,1)},
  高尾:p=>{p.p([10,33,30,11,52,26,54,33]);p.l(14,31,40,16,0);p.l(14,30,40,15,0);p.k(25,21,5,4);p.r(27,20,1,1);for(const [x,y] of [[38,28],[44,29],[20,30],[33,24]])p.p([x-2,y+2,x,y-2,x+2,y+2],0)},
  吉祥寺:p=>{p.water(28);p.p([16,27,34,27,32,22,20,22]);p.r(31,14,2,9);p.d(33,14,2);p.r(35,14,2,1);p.l(20,23,28,25,0);p.d(44,14,5);p.d(50,17,4);p.r(46,18,2,9)},
  舞浜:p=>{for(const [cx,cy,r] of [[32,16,9],[47,11,5],[17,13,5]])for(let a=0;a<14;a++){const t=a*Math.PI/7;p.l(cx+Math.cos(t)*r*.35,cy+Math.sin(t)*r*.35,cx+Math.cos(t)*r,cy+Math.sin(t)*r);p.dot(cx+Math.cos(t)*(r+1.5),cy+Math.sin(t)*(r+1.5))}p.water(29)},
  葛西臨海公園:p=>{wheel(p,30,18,13);p.water(31)},
  大宮:steam,新橋:steam,
  宇都宮:p=>{p.o(32,29,16);p.k(10,10,44,19);for(const cx of [21,32,43]){p.d(cx,27,6);p.k(cx-7,27,14,7);for(let i=-3;i<=3;i+=2)p.k(cx+i,22,1,2)}for(const x of [26,33,40])for(let t=0;t<6;t++)p.dot(x+Math.round(Math.sin(t)*1),16-t)},
  勝沼ぶどう郷:p=>{leaf(p,42,13,7,3.5,5);p.l(31,9,33,13);for(const [x,y] of [[25,15],[29,15],[33,15],[37,15],[27,19],[31,19],[35,19],[29,23],[33,23],[31,27]]){p.d(x,y,2);p.dot(x-1,y-1,0)}},
  // The Saruhashi, beams stepping out from either cliff.
  猿橋:p=>{p.p([10,10,20,10,21,33,10,33]);p.p([44,10,54,10,54,33,43,33]);for(let i=0;i<3;i++){p.r(19+i*2,22-i*2,6,1);p.r(39-i*2,22-i*2,6,1)}p.r(24,15,16,2);p.r(24,13,16,1);for(let x=25;x<40;x+=3)p.r(x,13,1,2);p.water(29,22,42)},
  稲荷:p=>{torii(p,32,10,22,23);fox(p,14,.8);p.flip=true;fox(p,14,.8);p.flip=false},
  伏見稲荷:p=>{fox(p,30,1.25);p.o(20,15,1.5);p.l(21,16,25,15);torii(p,46,16,10,17)},
  嵯峨嵐山:p=>{p.p([10,24,20,13,28,17,38,9,54,19,54,24]);for(let i=0;i<14;i++)p.dot(16+p.rand()*34,17+p.rand()*6,0);p.r(10,25,44,1);p.r(10,23,44,1);for(let x=11;x<54;x+=3)p.r(x,26,1,4);p.water(30)},
  // The Phoenix Hall and its pond.
  宇治:p=>{p.r(26,19,12,8);p.p([22,19,42,19,39,14,25,14]);p.r(26,12,1,2);p.r(37,12,1,2);for(const x of [28,32,35])p.k(x,21,1,6);p.r(14,23,12,4);p.p([12,23,26,23,25,20,13,20]);p.r(38,23,12,4);p.p([38,23,52,23,51,20,39,20]);p.r(11,17,4,10);p.p([10,17,16,17,13,14]);p.r(49,17,4,10);p.p([48,17,54,17,51,14]);p.water(29)},
  奈良:p=>{p.e(31,22,9,4);for(const x of [24,27,35,38])p.r(x,25,2,8);p.p([36,20,40,20,43,12,40,12]);p.e(43,12,3.5,2.2);p.p([40,10,37,8,41,9]);p.l(42,10,40,4);p.l(41,7,38,6);p.l(44,10,47,4);p.l(46,7,49,6);for(const [x,y] of [[27,20],[31,21],[34,20],[29,23]])p.dot(x,y,0);p.r(21,20,1,2);p.r(12,33,40,1)},
  東福寺:p=>{leaf(p,32,20,13,6,7);p.l(32,26,34,33);p.l(33,26,35,33)},
  祇園四条:p=>{p.r(10,8,44,2);for(const cx of [22,42]){p.r(cx-1,10,2,3);p.r(cx-4,13,8,2);p.e(cx,21,7,6.5);for(const y of [17,20,23])p.k(cx-7,y,14,1);p.r(cx-4,27,8,2);p.r(cx,29,1,4)}},
  太秦:p=>{for(const x of [22,34]){p.o(x,12,5);p.o(x,12,4.4);p.d(x,12,1.5);for(let a=0;a<3;a++)p.l(x,12,x+Math.cos(a*2.1)*4,12+Math.sin(a*2.1)*4)}p.r(16,18,26,11);p.k(19,21,6,3);p.r(42,20,5,7);p.p([47,19,52,16,52,30,47,27]);p.l(28,29,22,33);p.r(30,29,1,4);p.l(32,29,38,33)},
  大津:p=>{p.p([12,27,52,27,48,31,15,31]);p.r(18,21,26,6);p.r(22,16,18,5);p.windows(19,23,24,2,3);p.windows(23,18,16,1,3);p.d(46,24,4.5);for(let a=0;a<4;a++)p.l(46,24,46+Math.cos(a*.8)*4,24+Math.sin(a*.8)*4,0);p.l(30,16,30,9);p.p([30,9,35,10,30,12]);p.water(32)},
  池袋:p=>{p.e(32,22,8,10);p.p([24,13,26,8,28,13]);p.p([36,13,38,8,40,13]);p.d(28,17,3,0);p.d(36,17,3,0);p.d(28,17,1.2);p.d(36,17,1.2);p.p([30.5,19.5,33.5,19.5,32,23],0);p.l(26,23,28,30,0);p.l(38,23,36,30,0);p.r(14,32,36,2);p.r(28,31,2,1);p.r(34,31,2,1)},
  恵比寿:p=>{p.p([15,21,21,15,31,13,39,16,43,21,39,26,31,29,21,27]);p.p([43,21,52,13,50,21,52,29]);p.k(19,18,2,2);p.p([28,13,33,8,37,15]);for(let x=26;x<40;x+=3)for(let y=17;y<26;y+=3)p.dot(x+(y%2),y,0);p.l(24,16,24,26,0);p.water(31)},
  // The cherry trees along the cutting, a train passing under them.
  東中野:p=>{p.r(10,25,44,6);p.windows(12,26,40,2,3);p.k(10,29,44,1);p.r(10,31,44,1);p.l(12,8,30,15);p.l(12,9,30,16);p.l(30,15,40,11);cherries(p,22,13,6);cherries(p,40,11,5);for(let i=0;i<6;i++)p.dot(14+p.rand()*36,19+p.rand()*4)},
  熊谷:p=>{p.d(43,12,4);for(let a=0;a<8;a++)p.l(43+Math.cos(a*Math.PI/4)*6,12+Math.sin(a*Math.PI/4)*6,43+Math.cos(a*Math.PI/4)*8,12+Math.sin(a*Math.PI/4)*8);p.e(26,18,9,9);for(let a=0;a<5;a++)p.l(26,25,26+Math.cos(-Math.PI*(a+1)/6)*8,18+Math.sin(-Math.PI*(a+1)/6)*8,0);p.r(25,26,2,7)},
  茅ケ崎:p=>{p.p([36,28,40,14,44,10,46,18,50,28]);p.p([12,30,30,22,32,23,14,31]);p.water(29);p.o(22,13,3)},
  真鶴:p=>{p.p([12,13,26,20,32,22,24,13]);p.p([52,9,38,19,32,22,40,12]);p.e(32,22,6,2);p.l(36,22,46,25);p.l(36,23,46,26);p.d(47,25.5,1.5);p.l(27,23,16,26);p.water(30)},
  // The white Kannon over Ofuna.
  大船:p=>{p.p([10,33,18,26,30,24,46,26,54,33]);for(let i=0;i<8;i++)p.dot(16+p.rand()*32,28+p.rand()*4,0);p.p([22,24,42,24,40,20,24,20]);p.p([26,20,27,9,32,6,37,9,38,20]);p.e(32,13.5,3,3.8,0);p.dot(31,13);p.dot(33,13)},
  藤沢:p=>{p.p([18,30,24,22,32,20,40,23,46,30]);p.r(36,11,3,12);p.r(34,10,7,2);p.r(36,6,3,4);p.r(10,29,9,1);p.water(31)},
  錦糸町:p=>{p.p([29,33,35,33,33,9,31,9]);p.r(28,18,8,2);p.r(29,12,6,2);p.r(31,1,2,8);for(let y=21;y<32;y+=3)p.k(31,y,2,1);p.r(12,27,10,6);p.r(40,26,12,7);p.windows(13,28,8,4);p.windows(41,27,10,5)},
  // Togenuki Jizo.
  巣鴨:p=>{jizo(p,26,1.3);jizo(p,42,1);p.r(48,13,1,20);p.d(48.5,12,1.5)},
  大塚:p=>{p.r(22,11,20,20);p.k(22,11,1,1);p.k(41,11,1,1);p.k(24,14,16,7);p.k(28,12,8,1);p.d(32,25,1.5,0);p.r(21,29,22,2);p.l(32,11,37,4);p.r(10,4,44,1);p.l(25,31,18,33);p.l(39,31,46,33);for(const x of [14,50]){p.d(x,22,2.5);p.r(x,24,1,9)}},
  // A slice of lotus root.
  土浦:p=>{p.d(32,20,11.5);p.d(32,20,2.4,0);for(let a=0;a<7;a++)p.d(32+Math.cos(a*Math.PI*2/7)*7,20+Math.sin(a*Math.PI*2/7)*7,1.9,0);p.o(32,20,10.2,0)},
  // The cedar avenue.
  今市:p=>{for(const [x,top] of [[13,6],[19,10],[25,14],[39,14],[45,10],[51,6]])cedar(p,x,top);p.p([28,33,36,33,33,18,31,18],0);p.r(10,33,44,1)},
  清水五条:p=>{p.p([36,33,54,12,54,33]);for(let x=14;x<35;x+=3)p.r(x,20,1,13);p.r(14,24,21,1);p.r(14,28,21,1);p.r(12,18,26,2);p.r(18,13,18,5);p.p([14,13,40,13,36,8,18,8]);p.k(22,14,2,3);p.k(30,14,2,3);for(let i=0;i<5;i++)p.dot(42+p.rand()*10,22+p.rand()*8,0)},
  // The turtle stones across the Kamo.
  出町柳:p=>{p.water(9);p.water(17);p.water(25);for(const [x,y] of [[16,30],[24,26],[32,22],[40,18],[48,14]]){p.e(x,y,5,3.5,0);p.e(x,y,3,2);p.d(x+3.5,y,1);p.dot(x-2,y+2);p.dot(x+2,y+2);p.k(x-1,y,2,1)}},
  三条:p=>{p.r(10,21,44,2);p.r(10,17,44,1);for(let x=11;x<54;x+=4)p.r(x,17,1,4);for(const x of [15,46]){p.r(x,13,3,8);p.d(x+1.5,12,2);p.r(x+1,9,1,2)}for(const x of [18,31,44])p.r(x,23,3,8);p.water(29)},
  国立:p=>{p.r(18,24,28,9);p.p([14,25,32,8,50,25]);p.d(32,18,2,0);p.k(22,27,3,4);p.k(39,27,3,4);p.k(30,27,4,6);p.r(10,33,44,1);cedar(p,12,18,30);cedar(p,52,20,30)},
  平塚:p=>{p.r(10,7,44,1);for(const cx of [20,40]){p.d(cx,12,3.5);for(let i=0;i<5;i++)p.r(cx-4+i*2,15,1,13+(i%2)*4)}p.d(30,10,1.5);p.r(30,12,1,8);p.r(10,33,44,1)},
  高輪ゲートウェイ:p=>{p.p([10,15,18,10,26,15,34,10,42,15,50,10,54,13,54,18,10,18]);p.r(12,18,40,15);p.windows(13,19,38,13,3);p.r(10,33,44,1)},
  千葉:p=>{p.r(10,11,44,3);p.r(14,6,3,5);p.r(47,6,3,5);p.r(27,14,8,3);p.r(19,17,24,10);p.k(19,17,1,1);p.k(42,17,1,1);p.windows(21,19,20,3,3);p.k(19,23,24,1);p.r(10,33,44,1)},
};

// The others' pictures, varied by the station's name: a region's pool.
const generic:Record<string,Painter>={
  train:p=>{const gap=3+Math.floor(p.rand()*2);p.r(8,19,48,11);for(let x=11;x<52;x+=gap+2)p.k(x,21,gap,3);p.k(8,26-Math.floor(p.rand()*2)*2,48,1);p.l(28,19,31,15);p.l(34,19,31,15);p.r(26,14,10,1);p.r(8,12,48,1);p.r(8,32,48,1);for(const x of [14,22,40,48])p.d(x,30.5,1.5);if(p.rand()<.5)cedar(p,52,12,28)},
  fuji:p=>{p.p([10,33,29,11,35,11,54,33]);p.p([24,17,29,11,35,11,40,17,37,15,34,18,31,15,28,18],0);if(p.rand()<.6)p.d(46,12,3);else p.o(46,12,3);for(let i=0;i<2;i++){const y=14+Math.floor(p.rand()*6);p.r(12+Math.floor(p.rand()*6),y,8,1)}if(p.rand()<.5){p.r(10,30,44,3);p.windows(12,31,40,1,3)}},
  mountains:p=>{const peaks=[12+p.rand()*10,30+p.rand()*6,44+p.rand()*8];for(const x of peaks){const h=10+p.rand()*12;p.l(x-14,33-h*.3,x,33-h);p.l(x,33-h,x+14,33-h*.3)}p.p([10,33,10,26,24,22,36,26,54,22,54,33]);for(let x=12;x<54;x+=5)p.p([x,27,x+1.5,23,x+3,27],0);p.water(30)},
  sakura:p=>{p.p([30,33,34,33,33,23,31,23]);p.l(32,23,22,16);p.l(32,23,42,15);cherries(p,24,16,5);cherries(p,40,14,5);cherries(p,32,11,3);for(let i=0;i<7;i++)p.dot(12+p.rand()*40,24+p.rand()*8);p.r(10,33,44,1)},
  bridge:p=>{
    const kind=p.rand(),deck=20+Math.floor(p.rand()*4);p.r(10,deck,44,2);
    if(kind<.35){p.r(14,deck-8,36,1);for(let x=14;x<50;x+=6){p.l(x,deck,x+3,deck-8);p.l(x+6,deck,x+3,deck-8)}}
    else if(kind<.7){for(let x=14;x<51;x++){const y=Math.round(deck-8+8*((x-32)/18)**2);p.r(x,y,1,1);if(x%3===0)p.r(x,y,1,deck-y)}}
    else{p.r(14,deck-6,30,5);p.windows(16,deck-5,26,1,3);p.l(28,deck-6,31,deck-10);p.l(34,deck-6,31,deck-10);p.r(8,deck-11,48,1)}
    for(const x of [19,42])p.r(x,deck+2,3,30-deck);p.water(28);
  },
  town:p=>{let x=10;while(x<52){const w=6+Math.floor(p.rand()*4),h=6+Math.floor(p.rand()*7);p.r(x,33-h,w-1,h);p.p([x-1,33-h,x+w,33-h,x+(w-1)/2,33-h-4]);p.k(x+2,33-h+2,2,2);x+=w}p.r(46,9,1,24);p.r(43,11,7,1);p.l(10,13,46,11);p.l(46,11,54,14)},
  towers:p=>{let x=10;while(x<53){const w=5+Math.floor(p.rand()*5),h=8+Math.floor(p.rand()*16);p.r(x,33-h,w,h);p.windows(x+1,35-h,w-2,h-3);x+=w+1}},
  wave:p=>{p.r(10,28,44,5);p.d(26,22,10);p.d(30,25,8,0);p.k(10,24,6,4);for(let a=0;a<6;a++)p.dot(26+Math.cos(-2.6+a*.35)*10,22+Math.sin(-2.6+a*.35)*10,0);p.p([38,28,45,19,52,28]);p.p([43,21,45,19,47,21],0);p.water(29,24,54)},
  pine:p=>{p.l(26,33,33,20);p.l(27,33,34,20);for(const [x,y,w] of [[22,20,16],[30,16,14],[16,25,12],[36,24,10]])p.e(x+w/2,y,w/2,2.5);p.r(10,33,24,1);p.water(29,36,54);if(p.rand()<.5)p.p([46,26,48,18,50,26])},
  pagoda:p=>{for(let t=0;t<5;t++){const w=22-t*3,y=31-t*4.6;p.r(32-w/2+3,y-2,w-6,2);p.p([32-w/2-1,y-2,32+w/2+1,y-2,32+w/2-2,y-4,32-w/2+2,y-4]);p.dot(32-w/2-2,y-3);p.dot(32+w/2+1,y-3)}p.r(31,4,2,6);for(const y of [5,7])p.k(31,y,2,1);p.r(20,31,24,2);if(p.rand()<.5){cedar(p,14,16,30);cedar(p,50,18,30)}else{p.d(14,24,4);p.d(50,24,4)}},
  shrine:p=>{torii(p,32,9+Math.floor(p.rand()*3),24,22);if(p.rand()<.5){for(const x of [14,50]){p.r(x-2,27,4,6);p.r(x-3,24,6,3);p.r(x-1,21,2,3)}}else{cedar(p,13,10,31);cedar(p,51,10,31)}p.r(10,33,44,1)},
  lantern:p=>{p.r(27,31,10,2);p.r(30,25,4,6);p.r(27,19,10,6);p.k(29,21,6,3);p.p([22,19,42,19,37,14,27,14]);p.d(32,12,1.5);if(p.rand()<.5){p.r(12,10,1,23);p.r(51,10,1,23);for(let y=12;y<32;y+=5){p.l(12,y,14,y-2);p.l(51,y,49,y-2)}}else{leaf(p,46,12,5,2.5,7,.3);leaf(p,17,15,4,2,7,-.2)}},
  bamboo:p=>{for(let i=0;i<6;i++){const x=12+i*7+Math.floor(p.rand()*3);p.r(x,4,2,30);for(let y=8+Math.floor(p.rand()*4);y<33;y+=6)p.k(x,y,2,1);p.l(x+2,10+i*3,x+5,8+i*3)}},
  maple:p=>{leaf(p,24,16,9,4.5,7,.2);leaf(p,42,22,7,3.5,7,-.3);p.l(24,20,22,30);p.l(42,25,44,32)},
  ginkgo:p=>{
    // Ginkgo trees down an avenue, their crowns as tall cones, and a leaf blown across.
    for(const [x,top] of [[14,10],[22,13],[42,13],[50,10]]){p.e(x,top+9,5,10);p.r(x,top+18,1,15-top);for(let i=0;i<4;i++)p.dot(x-3+p.rand()*6,top+3+p.rand()*12,0)}
    p.p([32,24,26,16,29,14,35,14,38,16]);p.p([32,14,31,18,33,18],0);p.l(32,24,32,28);p.r(10,33,44,1);
  },
  rice:p=>{p.l(10,16,22,9);p.l(22,9,34,15);p.l(34,15,44,10);p.l(44,10,54,15);p.r(36,17,12,5);p.p([33,17,51,17,46,12,38,12]);p.k(39,19,3,3);for(let y=24;y<34;y+=3)for(let x=10+(y%2)*2;x<54;x+=4)p.r(x,y,2,1);p.r(10,22,44,1)},
  ship:p=>{p.p([12,25,52,25,47,31,17,31]);if(p.rand()<.5){p.r(22,19,18,6);p.windows(23,21,16,1,3);p.r(34,13,4,6)}else{p.l(30,25,30,6);p.p([31,7,31,23,44,23]);p.p([29,9,29,23,19,23])}p.water(32)},
  jizo:p=>{jizo(p,22);jizo(p,32,1.15);jizo(p,42);p.r(10,33,44,1);p.p([14,12,50,12,46,7,18,7]);p.r(14,12,1,21);p.r(49,12,1,21)},
  station:p=>{
    const w=24+Math.floor(p.rand()*3)*4,x=32-w/2,top=22+Math.floor(p.rand()*3);p.r(x,top,w,33-top);
    if(p.rand()<.5)p.p([x-4,top,x+w+4,top,x+w-1,top-6,x+1,top-6]);else p.p([x-4,top,x+w+4,top,32,top-9]);
    if(p.rand()<.6)p.d(32,top-3,1.6,0);p.k(29,top+4,6,29-top);for(let k=x+3;k<x+w-4;k+=6)if(k<27||k>35)p.k(k,top+3,3,3);
    p.r(10,33,44,1);if(p.rand()<.5){p.r(52,14,1,19);p.d(52.5,13,2)}else{p.d(12,22,4);p.r(12,25,1,8)}
  },
  lake:p=>{p.l(10,18,20,12);p.l(20,12,28,16);p.l(28,16,40,10);p.l(40,10,54,17);p.water(21);p.water(27);p.p([30,26,38,26,36,29,32,29]);p.l(34,26,34,19);p.p([34,19,34,25,39,25])},
};
/** Something in a generic picture's bare sky: the sun, the moon, clouds, birds, stars or nothing, where there is room. */
function sky(p:Pen){
  const kind=Math.floor(p.rand()*6),spots=[[13,9],[44,9],[15,13],[42,12],[28,8]].sort(()=>p.rand()-.5);
  const at=spots.find(([x,y])=>p.empty(x-1,y-1,10,7));if(!at)return;const [x,y]=at;p.ox=0;
  if(kind===0)p.d(x+3,y+2.5,2.5);else if(kind===1){p.d(x+3,y+2.5,2.5);p.d(x+4.5,y+1.5,2.2,0)}
  else if(kind===2){p.r(x,y+2,8,1);p.r(x+2,y+1,4,1);p.r(x+1,y+4,5,1)}
  else if(kind===3)for(const [dx,dy] of [[0,1],[4,3]]){p.dot(x+dx,y+dy);p.dot(x+dx+1,y+dy+1);p.dot(x+dx+2,y+dy)}
  else if(kind===4)for(const [dx,dy] of [[1,0],[6,3],[3,5]]){p.dot(x+dx,y+dy);p.dot(x+dx-1,y+dy);p.dot(x+dx+1,y+dy);p.dot(x+dx,y+dy-1);p.dot(x+dx,y+dy+1)}
}
const pools:Record<string,string[]>={
  city:['towers','train','sakura','ginkgo','station','bridge','town','pine'],
  suburb:['train','rice','sakura','station','bridge','town','mountains','fuji','ginkgo','shrine'],
  coast:['wave','ship','pine','fuji','train','station'],
  hills:['fuji','mountains','bridge','rice','pine','station'],
  kyoto:['pagoda','shrine','lantern','bamboo','maple','jizo','town'],
  lake:['lake','ship','mountains','pagoda','rice','shrine'],
};
const regionOf=(hub:Hub)=>{
  const ids=linesAt(stations[hub].ja).map(line=>line.id);
  if(inKyoto(hub)||ids.some(id=>['nara','sagano','karasuma','keihan'].includes(id)))return 'kyoto';
  if(ids.some(id=>['biwako-kyoto','kosei'].includes(id)))return 'lake';
  if(ids.some(id=>['chuo-main','nikko'].includes(id)))return 'hills';
  if(ids.some(id=>['tokaido','yokosuka-sobu','keiyo','sotobo'].includes(id))&&!ids.includes('yamanote'))return 'coast';
  if(ids.some(id=>['yamanote','chuo-rapid','chuo-sobu','keihin-tohoku','saikyo'].includes(id))&&!ids.some(id=>['utsunomiya','takasaki','joban'].includes(id)))return 'city';
  return 'suburb';
};
for(const name of Object.keys(landmarks))if(!Object.values(stations).some(st=>st.ja===name))throw Error(`Stamp for an unknown station: ${name}`);

// The frames, by the dots inside them `i` in from their edge (centred coordinates).
type Frame=(x:number,y:number,i:number)=>boolean;
const frames:Record<string,Frame>={
  circle:(x,y,i)=>x*x+y*y<=(62-i)**2,
  scallop:(x,y,i)=>Math.hypot(x,y)<=58+4*Math.cos(Math.atan2(y,x)*14)-i,
  rounded:(x,y,i)=>{const h=60-i,c=Math.max(2,14-i*.5),ax=Math.abs(x),ay=Math.abs(y);if(ax>h||ay>h)return false;return ax<=h-c||ay<=h-c||(ax-(h-c))**2+(ay-(h-c))**2<=c*c},
  octagon:(x,y,i)=>Math.abs(x)<=60-i&&Math.abs(y)<=60-i&&Math.abs(x)+Math.abs(y)<=86-i*1.414,
  hexagon:(x,y,i)=>Math.abs(y)<=55-i&&Math.abs(x)+Math.abs(y)*.577<=63.5-i*1.155,
  arch:(x,y,i)=>Math.abs(x)<=52-i&&y<=60-i&&(y>=-8||x*x+(y+8)**2<=(52-i)**2),
  ticket:(x,y,i)=>Math.abs(x)<=62-i&&Math.abs(y)<=50-i&&(Math.abs(x)-62)**2+y*y>=(9+i)**2,
};
/** The inks stamp stands keep: blue, red, purple, green, brown, teal, vermilion, indigo. */
const inks=['#2b4a9a','#b8323a','#5a3f8e','#2f7a4a','#8a4a2a','#1f6f8b','#c0563a','#33406a'];

export interface StampDesign {hub:Hub;ink:string;frame:string;motif:string;band:boolean;double:boolean;rule:boolean;stars:boolean}
const designs=new Map<Hub,StampDesign>();
export function stampOf(hub:Hub):StampDesign{
  let design=designs.get(hub);if(design)return design;
  const ja=stations[hub].ja,h=hash(ja+'|stamp'),names=Object.keys(frames),pool=pools[regionOf(hub)];
  design={hub,ink:inks[(h>>>3)%inks.length],frame:names[h%names.length],motif:landmarks[ja]?ja:pool[(h>>>7)%pool.length],band:(h>>>11)%4===0,double:(h>>>13)%3===0,rule:(h>>>15)%2===0,stars:(h>>>17)%2===0};
  designs.set(hub,design);return design;
}
export const stampInk=(hub:Hub)=>stampOf(hub).ink;

/** Lettering in a font's own dots, centred on `cx`, its top at `top`: ink (1) or cleared (0) where `room` allows. The width it took. */
function letter(m:Uint8Array,text:string,font:string,cx:number,top:number,v:number,room:(x:number,y:number)=>boolean){
  const c=document.createElement('canvas');c.width=S;c.height=32;const g=c.getContext('2d',{willReadFrequently:true})!;g.font=font;g.textBaseline='top';g.fillStyle='#000';
  const w=Math.ceil(g.measureText(text).width),left=Math.round(cx-w/2);g.fillText(text,left,0);const data=g.getImageData(0,0,S,32).data;
  for(let y=0;y<32;y++)for(let x=0;x<S;x++)if(data[(y*S+x)*4+3]>127&&top+y<S&&room(x,top+y))m[(top+y)*S+x]=v;
  return w;
}
const measure=(text:string,font:string)=>{const g=document.createElement('canvas').getContext('2d')!;g.font=font;return Math.ceil(g.measureText(text).width)};
const fonts=['20px "Yorimichi Bitmap"','16px "Yorimichi Pixel"','10px "Yorimichi Bitmap"'];
const fontsReady=()=>!!document.fonts?.check('10px "Yorimichi Bitmap"')&&!!document.fonts?.check('16px "Yorimichi Pixel"');

/** The stamp's face as it prints, S × S, 1 where there is ink: frame, picture, rule, name and English. Kept once the fonts are in. */
const masks=new Map<Hub,Uint8Array>();
export function stampMask(hub:Hub){
  const known=masks.get(hub);if(known)return known;
  const d=stampOf(hub),frame=frames[d.frame],c=(S-1)/2,bw=d.frame==='scallop'?3:4,inner=bw+(d.double?6:3);
  const pen=new Pen(seeded(hash(stations[hub].ja)));if(landmarks[d.motif])landmarks[d.motif](pen);else{pen.ox=Math.floor(pen.rand()*7)-3;generic[d.motif](pen);sky(pen)}
  const m=pen.m,inside=(x:number,y:number,i:number)=>frame(x-c,y-c,i);
  // Everything is kept within the frame, a little in from its line.
  for(let y=0;y<S;y++)for(let x=0;x<S;x++)if(!inside(x,y,inner))m[y*S+x]=0;
  const room=(x:number,y:number)=>inside(x,y,inner+1),width=(y:number)=>{let n=0;for(let x=0;x<S;x++)if(inside(x,y,inner+2))n++;return n};
  // Under the picture, the name and 駅 in the largest lettering that fits its row, then the English in capitals where it fits.
  const ja=stations[hub].ja.replace(/​/g,''),en=stations[hub].en.toUpperCase();
  for(let y=67;y<S;y++)for(let x=0;x<S;x++)m[y*S+x]=0;
  const label=[ja+'駅',ja].find(text=>fonts.some(f=>measure(text,f)<=Math.min(width(72),width(88))-4))??ja,font=fonts.find(f=>measure(label,f)<=Math.min(width(72),width(88))-4)??fonts[2];
  const size=parseInt(font),top=size===20?70:size===16?72:76;
  if(d.band){for(let y=68;y<92;y++)for(let x=0;x<S;x++)if(room(x,y))m[y*S+x]=1;letter(m,label,font,64,top,0,room)}
  else{if(d.rule)for(let x=0;x<S;x++)if(room(x,68)&&room(x-4,68)&&room(x+4,68))m[68*S+x]=1;letter(m,label,font,64,top,1,room)}
  const ew=measure(en,'10px "Yorimichi Bitmap"');
  if(ew<=Math.min(width(95),width(104))-6){letter(m,en,'10px "Yorimichi Bitmap"',64,95,1,room);if(d.stars)for(const x of [64-ew/2-8,64+ew/2+5])for(const [dx,dy] of [[1,0],[0,1],[1,1],[2,1],[1,2]])if(room(x+dx,99+dy))m[(99+dy)*S+Math.round(x+dx)]=1}
  // The frame's own line, doubled by a fine one inside on some.
  for(let y=0;y<S;y++)for(let x=0;x<S;x++)if((inside(x,y,0)&&!inside(x,y,bw))||(d.double&&inside(x,y,bw+3)&&!inside(x,y,bw+4)))m[y*S+x]=1;
  if(fontsReady())masks.set(hub,m);
  return m;
}

/** One impression of a station's stamp: its ink, pressed a little unevenly (`seed`: harder on one side, a few dots missed), S × S. Seed 0 is the stand's sample, pressed evenly. */
const prints=new Map<string,HTMLCanvasElement>();
export function impression(hub:Hub,seed:number){
  const key=`${hub}|${seed}`,known=prints.get(key);if(known)return known;
  const m=stampMask(hub),canvas=document.createElement('canvas');canvas.width=canvas.height=S;const g=canvas.getContext('2d')!,image=g.createImageData(S,S),rand=seeded(seed*7919+1);
  const ink=stampOf(hub).ink,[r,gr,b]=[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16)),a=rand()*Math.PI*2,light=seed?.25+rand()*.35:0,patchy=seed?.04+rand()*.05:.01;
  for(let y=0;y<S;y++)for(let x=0;x<S;x++){
    if(!m[y*S+x])continue;const side=((x-64)*Math.cos(a)+(y-64)*Math.sin(a))/64,miss=patchy+Math.max(0,side-.3)*light;if(rand()<miss)continue;
    const k=(y*S+x)*4;image.data[k]=r;image.data[k+1]=gr;image.data[k+2]=b;image.data[k+3]=seed&&rand()<.2?170:225;
  }
  g.putImageData(image,0,0);if(fontsReady())prints.set(key,canvas);return canvas;
}
