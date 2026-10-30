import { darkness } from './clock';
import { box } from './hall-scene';
import { crispText, fitPicture, Picture, type View } from './ticket-gate';

// Lorenzo's flight, one 320 × 200 picture scaled up whole: the take-off from Hong Kong, the map of East Asia, the landing at Haneda or Kansai, through a dithered fade, all by day or by night as the clock has it.
const W=320,H=200,ink='#0b1614',horizon=132,seaEnd=162,wheels=178;
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const sheet=(w:number,h:number):[HTMLCanvasElement,CanvasRenderingContext2D]=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d',{willReadFrequently:true})!]};
const random=(seed:number)=>()=>(seed=seed*16807%2147483647)/2147483647;
const flat:View={eye:[0,0,0],vx:0,vy:0,k:1} as View;
const polygon=(g:CanvasRenderingContext2D,points:[number,number][],color:string,w:number,h:number)=>new Picture(g,flat,w,h).fill(points,color);
/** Fades to the ink through the ordered dither, `level` 0 to 16: a 4 × 4 tile repeated, as a whole picture of single pixels takes far too long to fill. */
function fade(g:CanvasRenderingContext2D,level:number){if(level<=0)return;const [tile,t]=sheet(4,4);t.fillStyle=ink;for(let y=0;y<4;y++)for(let x=0;x<4;x++)if(bayer[y*4+x]<level)t.fillRect(x,y,1,1);g.fillStyle=g.createPattern(tile,'repeat')!;g.fillRect(0,0,W,H)}

// The map, East Asia from Hainan to the Tsugaru Strait, in degrees: longitude shrunk by the cosine of its middle latitude.
const west=107.5,east=147.6,north=41.5,south=20;
const at=(lon:number,lat:number):[number,number]=>[(lon-west)/(east-west)*W,(north-lat)/(north-south)*H];
// Coastlines, rough, as [lon, lat] runs: the mainland (closed off the map's top and left), then the islands.
const coasts:number[][]=[
  [100,45,100,21.6,109,21.6,110.2,20.3,111,21.5,112.5,21.8,113.6,22.2,114.2,22.3,115,22.7,116.5,23,117.5,23.8,118.5,24.5,119.5,25.5,119.8,26.5,120.5,27.5,121,28.3,121.9,29.5,121.5,30.6,121.9,31,121,32,120.8,33,120.3,34.3,119.3,35,120.3,36,121,36.8,122.5,37.2,121.5,37.5,120.5,37.6,119,37.2,118.8,38.5,118,39.2,119.5,39.8,121,40.8,122.2,40.5,121.2,38.8,122,39.5,124,40,125,39.5,125.5,38.8,124.8,38,126,37.6,126.5,37,126.2,36,126.5,35,126.3,34.5,127.5,34.6,128.6,34.9,129.3,35.3,129.5,36,129.4,37,128.6,38.5,127.5,39.6,128.5,40.3,129.8,41,130.6,42.4,133,43,135,44,100,45],
  [108.6,19.5,109.6,20.1,110.6,20.1,111,19.6,110.5,18.5,109,18.5],
  [121,25.3,122,25,121.6,24,121,22.5,120.7,22,120.2,22.8,120.1,23.7,120.7,24.6],
  [127.6,26.1,128,26.6,128.3,26.9,127.9,26.7],
  [129.9,33.6,130.9,34,131.7,33.6,131.9,32.9,131.5,31.6,131,31,130.7,31.1,130.2,31.3,130.3,32.2,129.8,32.7,129.6,33.3],
  [132.5,34.3,133.5,34.4,134.6,34.2,134.7,33.8,134.2,33.3,133.2,33.4,132.9,32.8,132.4,33.4,132,33.3,132.1,33.8],
  [130.9,34,131.6,34.7,132.6,35.5,133.3,35.6,134.3,35.6,135.2,35.7,135.9,35.6,136,36,136.7,36.9,136.9,37.4,137.3,36.8,138.5,37.4,139.4,38.2,139.9,39,140,40,139.9,40.6,140.3,41.3,141.2,41.3,141.5,40.5,141.9,39.5,141.6,38.5,141,38.2,140.9,37.2,140.6,36.5,140.8,35.7,140.3,35.1,139.8,34.9,139.9,35.6,139.6,35.1,139.1,35.2,138.8,34.7,138.3,34.6,137.5,34.7,137,34.6,136.9,34.3,136.5,34.2,136.1,33.5,135.8,33.4,135.3,33.8,135.1,34.3,135.4,34.7,134.7,34.8,133.9,34.5,133,34.4,132.2,33.9,131.6,34],
  [139.9,41.6,140.5,41.7,141.2,41.8,141.6,42.6,143.3,42,144.5,42.9,145.5,43.3,145,44,141.5,45.5,140,43,140.3,42.2],
];
const hongKong=at(114.2,22.31);
const airports={haneda:{name:'Tokyo Haneda',code:'HND',city:'TOKYO',spot:at(139.78,35.55),lights:[[140.4,36],[139,35.2]]},kansai:{name:'Kansai',code:'KIX',city:'OSAKA',spot:at(135.24,34.43),lights:[[139.7,35.7],[136.9,35.2]]}};
// What shines on the map by night, [lon, lat].
const cities=[[121.5,31.2],[120.2,30.3],[118.8,32],[126.9,37.5],[129,35.2],[116.4,39.9],[113.3,23.1],[121.5,25],[120.3,22.7],[130.4,33.6],[135.5,34.7],[132.5,34.4]];

/** A cloud, puffs lit from above with a shaded foot. */
function puff(seed:number,size:number,night:boolean){
  const rand=random(seed),w=size*3,h=Math.round(size*1.5),[c,g]=sheet(w,h),blobs=Array.from({length:7},(_,k)=>[size*.5+(w-size)*k/6,h*.62-Math.sin(k/6*Math.PI)*size*.28+(rand()-.5)*size*.3,(.22+.3*Math.sin(k/6*Math.PI)+rand()*.1)*size]);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const inside=blobs.some(([bx,by,r])=>(x-bx)**2+((y-by)*1.3)**2<r*r);if(!inside)continue;
    const under=!blobs.some(([bx,by,r])=>(x-bx)**2+((y+2.5-by)*1.3)**2<r*r);
    g.fillStyle=under?night?'#4d5a86':'#c6d6e2':night?'#7584ad':'#fffef2';g.fillRect(x,y,1,1);
  }
  return c;
}
/** The map, drawn once: the sea shoaling towards the coasts, the land by its relief with a pale shore, the names and the two airports. */
function chart(airport:typeof airports[keyof typeof airports],night:boolean){
  const [c,g]=sheet(W,H);g.fillStyle='#000';for(const run of coasts){g.beginPath();for(let i=0;i<run.length;i+=2)g.lineTo(...at(run[i],run[i+1]));g.fill()}
  // The coasts, straight runs between their points, are shaken up a little.
  const mask=g.getImageData(0,0,W,H).data,land=(x:number,y:number)=>{const px=Math.round(x+Math.sin(y*.43+x*.11)*1.3+Math.sin(y*1.1)*.7),py=Math.round(y+Math.sin(x*.37-y*.17)*1.3);return px>=0&&py>=0&&px<W&&py<H&&mask[(py*W+px)*4+3]>127};
  const reach=new Int16Array(W*H).fill(-1);let front:number[]=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(land(x,y)!==land(x+1,y)||land(x,y)!==land(x,y+1)){reach[y*W+x]=0;front.push(y*W+x)}
  for(let d=1;front.length;d++){const next:number[]=[];for(const i of front)for(const j of [i-1,i+1,i-W,i+W])if(j>=0&&j<W*H&&reach[j]<0&&Math.abs((j%W)-(i%W))<2){reach[j]=d;next.push(j)}front=next}
  const relief=(x:number,y:number)=>Math.sin(x*.09+y*.05)+Math.sin(x*.041-y*.083+2)+Math.sin(x*.21+y*.17)*.5+Math.sin(x*.47-y*.39)*.25;
  const greens=['#b5c98a','#a4bf78','#90b168','#7a9f5c','#8f9a68','#a7a488'],blues=['#86cdd0','#5fadc4','#4c94b8','#4286ac','#3b79a0'];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const d=reach[y*W+x],dot=bayer[(y&3)*4+(x&3)]/16;
    if(land(x,y)){const v=d<1?-1:Math.min(5,Math.max(0,(relief(x,y)+2)/4.6*5+Math.min(d,12)*.08+dot-.5));g.fillStyle=v<0?'#e0d8a4':greens[Math.floor(v)]}
    else{const v=d<2?0:Math.min(4,Math.log2(d)*1.15+dot*.9-.6);g.fillStyle=blues[Math.floor(v)]}
    g.fillRect(x,y,1,1);
  }
  if(night){g.globalCompositeOperation='multiply';g.fillStyle='#39487f';g.fillRect(0,0,W,H);g.globalCompositeOperation='source-over';const rand=random(7);for(const [lon,lat] of [...cities,...airport.lights]){const [x,y]=at(lon,lat);for(let k=0;k<9;k++){g.fillStyle=k%3?'#ffd98a':'#fff6d0';g.fillRect(Math.round(x+(rand()-.5)*6),Math.round(y+(rand()-.5)*5),1,1)}}}
  g.font='10px "Yorimichi Bitmap"';
  for(const [text,[x,y],color] of [['CHINA',at(113,31),night?'#5d6c83':'#44653c'],['KOREA',at(127.8,36.6),night?'#5d6c83':'#44653c'],['JAPAN',at(142.6,37.2),night?'#7e96bd':'#d5ecf0'],['EAST CHINA SEA',at(125.8,27.4),night?'#7e96bd':'#d5ecf0']] as const)crispText(g,text,x-g.measureText(text).width/2,y-5,color);
  for(const [x,y] of [hongKong,airport.spot]){g.fillStyle='#fffef2';g.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);g.fillStyle='#d6402e';g.fillRect(Math.round(x)-1,Math.round(y)-1,3,3)}
  return c;
}
/** The plane seen from above, nose along `angle`, `size` px from the middle to the nose: every pixel tested against the shape turned back, as a turned sprite loses its lines. */
function topPlane(g:CanvasRenderingContext2D,cx:number,cy:number,angle:number,size:number,shadow=false){
  const cos=Math.cos(angle),sin=Math.sin(angle),r=Math.ceil(size)+2;
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    const u=(x*cos+y*sin)/size,v=(y*cos-x*sin)/size,a=Math.abs(v);
    const body=a<.17&&u>-.98&&u<1-a*a*14,wing=a<.92&&u<.3-a*.62&&u>-.08-a*.62,tail=a<.4&&u<-.68-a*.3&&u>-.92-a*.3;
    if(!body&&!wing&&!tail)continue;
    g.fillStyle=shadow?'#14303a66':body?u>.72?'#c8313a':'#fffef2':tail?'#d6402e':v*cos+u*sin>0?'#b4c0c8':'#dbe3e6';g.fillRect(cx+x,cy+y,1,1);
  }
}
/** The airliner from the side, nose right, in pixels, wheels down or up. */
function airliner(gear:boolean,night:boolean){
  const w=80,h=26,[c,g]=sheet(w,h);
  polygon(g,[[3,0],[11,0],[24,11],[8,11]],'#d6402e',w,h);polygon(g,[[7,3],[12,3],[15,6],[9,6]],'#fffef2',w,h);
  for(let x=2;x<w;x++){
    const n=Math.max(0,(x-68)/11),top=Math.round(x<8?11-x*.1+2-(8-x)*-.1:10+n*n*5),end=Math.round(x<24?17-(24-x)*.3:18-n*n*2);
    for(let y=top;y<end;y++){g.fillStyle=y===top?'#fffef2':y<end-3?'#f1f4f2':y===end-3?'#d6402e':y===end-1?'#8e9ca6':'#c3ced4';g.fillRect(x,y,1,1)}
  }
  g.fillStyle=night?'#ffd98a':'#35506a';for(let x=25;x<66;x+=x%12===0?4:2)g.fillRect(x,12,1,1);
  g.fillStyle='#35506a';g.fillRect(72,12,4,2);g.fillRect(64,12,1,3);
  polygon(g,[[1,12],[12,11],[17,13],[6,14]],'#aeb9c0',w,h);
  if(gear){g.fillStyle='#4a5560';g.fillRect(36,18,1,5);g.fillRect(66,17,1,6);g.fillStyle='#1d2622';g.fillRect(34,22,5,3);g.fillRect(65,22,3,3)}
  polygon(g,[[28,17],[52,16],[36,23],[28,23]],'#a2aeb6',w,h);polygon(g,[[28,22],[36,22],[34,23],[28,23]],'#7f8c96',w,h);
  g.fillStyle='#d3dade';g.fillRect(42,19,10,4);g.fillStyle='#8e9ca6';g.fillRect(42,22,10,1);g.fillStyle='#35404a';g.fillRect(51,19,2,4);
  if(night){g.globalCompositeOperation='source-atop';g.fillStyle='#1a245070';g.fillRect(0,0,w,h)}
  return c;
}
/** A sprite climbing or coming down: its columns slid up or down rather than turned, which keeps its lines clean. */
function pitched(g:CanvasRenderingContext2D,sprite:HTMLCanvasElement,x:number,y:number,slope:number){for(let k=0;k<sprite.width;k++)g.drawImage(sprite,k,0,1,sprite.height,Math.round(x)+k,Math.round(y-(k-sprite.width/2)*slope),1,sprite.height)}

type Place='hongkong'|'haneda'|'kansai';
/** An airport seen from beyond its runway, drawn once: the sky banded through the dither, the hills, the city, the water, then the runway the plane uses. */
function airfield(place:Place,night:boolean){
  const [c,g]=sheet(W,H),rand=random(place==='hongkong'?11:place==='haneda'?23:37);
  const sky=night?['#0c1430','#141f46','#1f2c5a','#2f3a6c','#4c4a7c']:['#3f8fcb','#62aad9','#8cc4e4','#b6dcea','#e4efe2'];
  for(let y=0;y<horizon;y++)for(let x=0;x<W;x++){const v=y/horizon*(sky.length-1),i=Math.floor(v);g.fillStyle=sky[Math.min(sky.length-1,i+(v-i>(bayer[(y&3)*4+(x&3)]+.5)/16?1:0))];g.fillRect(x,y,1,1)}
  if(night){for(let k=0;k<70;k++){g.fillStyle=k%5?'#8d9ac8':'#fffef2';g.fillRect(Math.floor(rand()*W),Math.floor(rand()*(horizon-40)),1,1)}g.fillStyle='#f4efd2';for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++)if(x*x+y*y<52&&(x-3)**2+y*y>=40)g.fillRect(262+x,30+y,1,1)}
  else{g.fillStyle='#fff6d0';for(let y=-9;y<=9;y++)for(let x=-9;x<=9;x++)if(x*x+y*y<76)g.fillRect(262+x,30+y,1,1)}
  const hills=(height:(x:number)=>number,lit:string,shade:string)=>{for(let x=0;x<W;x++){const top=Math.round(horizon-height(x)),rim=4+Math.sin(x*.31)*2+Math.sin(x*.83);for(let y=top;y<horizon;y++){g.fillStyle=y-top<rim+bayer[(y&3)*4+(x&3)]/5?lit:shade;g.fillRect(x,y,1,1)}}};
  const far=night?['#27335f','#212c54']:['#a4c1d8','#92b3cd'],near=night?['#1a2547','#141d3a']:['#6f9a8a','#5a8678'];
  if(place==='haneda'){
    const fuji=(x:number)=>Math.max(0,82-Math.abs(x-206)*.62-((x-206)/28)**2*1.6);const slope=night?'#2c3866':'#7f9fc6',shaded=night?'#232e58':'#6c8db8';for(let x=0;x<W;x++){const top=Math.round(horizon-Math.max(fuji(x),9+Math.sin(x*.05)*4));for(let y=top;y<horizon;y++){g.fillStyle=x-206>(y-(horizon-82))*.16-3+bayer[(y&3)*4+(x&3)]/3?shaded:slope;g.fillRect(x,y,1,1)}}
    for(let x=150;x<262;x++){const top=horizon-fuji(x),end=top+11+Math.sin(x*.9)*3+Math.sin(x*.37)*3;for(let y=Math.round(top);y<end&&top<horizon-44;y++){g.fillStyle=night?x-206>(y-(horizon-82))*.16-3?'#8590b8':'#a9b3d6':x-206>(y-(horizon-82))*.16-3?'#d3e2f0':'#fffef2';g.fillRect(x,y,1,1)}}
  }else hills(x=>(place==='hongkong'?44:30)+Math.sin(x*.021+1)*14+Math.sin(x*.057)*8+Math.sin(x*.13+2)*3,far[0],far[1]);
  hills(x=>(place==='hongkong'?22:12)+Math.sin(x*.033+3)*(place==='hongkong'?11:5)+Math.sin(x*.09)*4+Math.sin(x*.21+1)*2,near[0],near[1]);
  // The city along the water, its towers rising towards `peak`, windows lit by night.
  const city=(from:number,to:number,peak:number,base:string,side:string)=>{for(let x=from;x<to;){const w=5+Math.floor(rand()*7),h=Math.round(peak*(.35+.65*rand())*Math.sin((x-from)/(to-from)*Math.PI)+6);g.fillStyle=base;g.fillRect(x,horizon-h,w,h);g.fillStyle=side;g.fillRect(x+w-2,horizon-h,2,h);g.fillStyle=night?'#ffd98a':'#dcebf0';for(let y=horizon-h+2;y<horizon-1;y+=3)for(let k=x+1;k<x+w-2;k+=2)if(rand()<(night?.45:.3))g.fillRect(k,y,1,1);x+=w+Math.floor(rand()*3)}};
  const stone=night?'#252c4e':'#8a9db2',dark=night?'#1b2140':'#73889f';
  if(place==='hongkong'){city(96,270,58,stone,dark);g.fillStyle=stone;g.fillRect(186,horizon-74,9,74);g.fillRect(188,horizon-81,5,7);g.fillRect(190,horizon-87,1,6);g.fillStyle=dark;g.fillRect(193,horizon-74,2,74)}
  if(place==='haneda'){city(8,140,30,stone,dark);const tower=[60,horizon];for(let y=0;y<48;y++){const half=Math.round(9*(1-y/48)**2.2);g.fillStyle=y%6<3?'#d6502e':'#f1efe6';g.fillRect(tower[0]-half,tower[1]-y,half*2+1,1);if(half>1&&y%3){g.fillStyle=y%6<3?'#a93b24':'#c4c2b8';g.fillRect(tower[0]-half+1,tower[1]-y,1,1)}}g.fillStyle='#f1efe6';g.fillRect(55,horizon-30,11,3);g.fillRect(60,horizon-58,1,12)}
  if(place==='kansai')city(30,210,26,stone,dark);
  // The water, in long streaks.
  g.fillStyle=night?'#111c3e':'#4c94b8';g.fillRect(0,horizon,W,seaEnd-horizon);
  for(let k=0;k<150;k++){const y=horizon+Math.floor(rand()**1.4*(seaEnd-horizon)),x=Math.floor(rand()*W),w=4+Math.floor(rand()*16);g.fillStyle=k%3?night?'#1b2a54':'#5fadc4':night?'#27366a':'#86cdd0';g.fillRect(x,y,w,1)}
  // The airfield: grass, the tarmac and its markings, the tower and the lamps.
  g.fillStyle=night?'#17281f':'#7fa35c';g.fillRect(0,seaEnd,W,H-seaEnd);for(let k=0;k<420;k++){g.fillStyle=k%2?night?'#1f3429':'#90b168':night?'#122019':'#6c9150';g.fillRect(Math.floor(rand()*W),seaEnd+Math.floor(rand()*(H-seaEnd)),2,1)}
  g.fillStyle=night?'#2a2e36':'#6a6f76';g.fillRect(0,seaEnd+8,W,23);g.fillStyle=night?'#22252c':'#5c6168';g.fillRect(0,seaEnd+8,W,2);g.fillRect(0,seaEnd+29,W,2);
  g.fillStyle=night?'#a9acb2':'#eef0ea';for(let x=-8;x<W;x+=30)g.fillRect(x,seaEnd+19,16,1);g.fillRect(0,seaEnd+10,W,1);g.fillRect(0,seaEnd+28,W,1);
  g.fillStyle=night?'#39435e':'#e6e4d8';g.fillRect(24,seaEnd-26,7,34);g.fillStyle=night?'#2a3350':'#c9c7ba';g.fillRect(29,seaEnd-26,2,34);g.fillStyle=night?'#ffd98a':'#3f6f8f';g.fillRect(21,seaEnd-34,13,6);g.fillStyle=night?'#39435e':'#e6e4d8';g.fillRect(20,seaEnd-36,15,2);g.fillRect(20,seaEnd-28,15,2);
  for(let x=4;x<W;x+=20){g.fillStyle=night?'#ffe9a0':'#d6402e';g.fillRect(x,seaEnd+6,1,1);if(night){g.fillStyle='#ffe9a044';g.fillRect(x-1,seaEnd+5,3,3)}}
  return c;
}

const takeoffLength=3600,mapLength=5400,landingLength=4300,fadeLength=420;
/** Lorenzo's flight, over everything: he takes off from Hong Kong, crosses the map of East Asia and lands `to`. A click or a key skips it. */
export function playFlight(to:keyof typeof airports,done:()=>void){
  const airport=airports[to],night=darkness()>.5,[x0,y0]=hongKong,[x2,y2]=airport.spot,x1=(x0+x2)/2+(y2-y0)*.2,y1=(y0+y2)/2-(x2-x0)*.2;
  const overlay=document.createElement('div');overlay.className='flight-overlay';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label',`Lorenzo’s flight from Hong Kong to ${airport.name}`);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;overlay.append(canvas);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;g.font='10px "Yorimichi Bitmap"';const fit=()=>fitPicture(canvas,overlay,W,H);fit();const watcher=new ResizeObserver(fit);watcher.observe(overlay);
  const base=chart(airport,night),departure=airfield('hongkong',night),arrival=airfield(to,night),down=airliner(true,night),up=airliner(false,night);
  const clouds=Array.from({length:7},(_,k)=>{const image=puff(k*97+5,6+k%3*3,night),[shade,s]=sheet(image.width,image.height);s.drawImage(image,0,0);s.globalCompositeOperation='source-in';s.fillStyle='#14303a55';s.fillRect(0,0,W,H);return {image,shade,x:k*83%W,y:10+k*67%(H-40),speed:(3+k%3*2)/1000}});
  const sparkles=(()=>{const rand=random(5);return Array.from({length:60},()=>[Math.floor(rand()*W),horizon+Math.floor(rand()*(seaEnd-horizon)),rand()*6.3] as const)})();
  const point=(p:number):[number,number]=>[(1-p)**2*x0+2*(1-p)*p*x1+p*p*x2,(1-p)**2*y0+2*(1-p)*p*y1+p*p*y2];
  const start=performance.now(),total=takeoffLength+mapLength+landingLength;
  let frame=0,over=false;
  const caption=(text:string)=>{const w=Math.ceil(g.measureText(text).width);box(g,5,5,w+8,13,'#0b1614c8');crispText(g,text,9,6,'#fffef2')};
  const water=(t:number)=>{g.fillStyle=night?'#8d9ac8':'#fffef2';for(const [x,y,phase] of sparkles)if(Math.sin(t/260+phase)>.8)g.fillRect(x,y,2,1)};
  const drift=(t:number,top:number,bottom:number)=>{for(const {image,x,y,speed} of clouds){const cy=top+y%(bottom-top),cx=(x+t*speed)%(W+image.width)-image.width;g.drawImage(image,Math.round(cx),Math.round(cy))}};
  const shadowUnder=(x:number,height:number)=>{const w=Math.round(62-height*.3);if(w<8)return;g.fillStyle='#14202a55';g.fillRect(Math.round(x+40-w/2),wheels+3,w,2)};
  // The tyres' smoke, a few round puffs that grow and thin out through the dither.
  const smoke=(x:number,age:number)=>{const thin=Math.floor(age/70);if(thin>=14)return;g.fillStyle=night?'#8f98b4':'#eeeee6';for(let k=0;k<4;k++){const cx=Math.round(x-k*5-age*.01),r=2+k*.8+age*.006;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r&&bayer[((Math.round(wheels-r+dy+1))&3)*4+((cx+Math.round(dx))&3)]>=thin)g.fillRect(cx+Math.round(dx),Math.round(wheels-r+dy+1),1,1)}};
  /** He rolls down the runway faster and faster, lifts off and climbs away. */
  const takeoff=(t:number)=>{
    const s=t/takeoffLength,lift=.56,climb=Math.max(0,(s-lift)/(1-lift)),x=-82+470*s**2,height=climb**1.7*170,slope=Math.min(.3,climb*1.6);
    g.drawImage(departure,0,0);water(t);drift(t,6,70);shadowUnder(x,height);
    pitched(g,climb>.3?up:down,x,wheels-24-height,slope);caption('Hong Kong HKG');
  };
  const cruise=(t:number)=>{
    const q=t/mapLength,p=q*q*(3-2*q),alt=Math.max(0,Math.min(1,p/.16,(1-p)/.16)),[x,y]=point(p),[ax,ay]=point(Math.min(1,p+.01)),[bx,by]=point(Math.max(0,p-.01)),angle=Math.atan2(ay-by,ax-bx);
    g.drawImage(base,0,0);
    // The way ahead, dotted, and the way flown as a trail fading behind him.
    g.fillStyle='#fffef2';for(let k=p+.04;k<1;k+=.03){const [dx,dy]=point(k);g.fillRect(Math.round(dx),Math.round(dy),1,1)}
    for(let k=0;k<p;k+=.003){if(p-k>.22&&Math.round(k/.003)%3)continue;const [dx,dy]=point(k);g.fillRect(Math.round(dx),Math.round(dy),1,1)}
    const size=6+alt*4,px=Math.round(x),py=Math.round(y);
    topPlane(g,px+1+Math.round(alt*7),py+1+Math.round(alt*7),angle,size,true);
    for(const {image,shade,x:cx,y:cy,speed} of clouds){const sx=Math.round((cx+t*speed)%(W+image.width)-image.width),sy=Math.round(cy);g.drawImage(shade,sx+5,sy+6);g.drawImage(image,sx,sy)}
    topPlane(g,px,py,angle,size);
    if(p>=.97&&Math.floor(t/180)%2){const [ex,ey]=airport.spot;g.fillStyle='#fff6d0';g.fillRect(Math.round(ex)-3,Math.round(ey)-3,7,7);g.fillStyle='#d6402e';g.fillRect(Math.round(ex)-1,Math.round(ey)-1,3,3)}
    for(const [text,[lx,ly]] of [['HONG KONG',hongKong],[airport.city,airport.spot]] as const){const w=Math.ceil(g.measureText(text).width),left=Math.max(6,Math.round(lx-w/2));box(g,left-3,Math.round(ly)+5,w+6,11,'#0b1614c8');crispText(g,text,left,Math.round(ly)+5,'#fffef2')}
    caption(`HKG → ${airport.code}`);
  };
  /** He comes down over the bay, touches down in a puff of smoke and brakes along the runway. */
  const landing=(t:number)=>{
    const s=t/landingLength,touch=.52,x=-92+(1-(1-Math.min(1,s/.92))**2)*330,height=s<touch?(1-s/touch)*150:0;
    g.drawImage(arrival,0,0);water(t);drift(t,6,70);shadowUnder(x,height);
    const slope=s<touch?-.1+Math.min(.16,(s/touch)**5*.2):Math.max(0,.06-(s-touch)*.5);pitched(g,down,x,wheels-24-height,slope);
    if(s>=touch)smoke(x+38,(s-touch)*landingLength);caption(`${airport.name} ${airport.code}`);
  };
  const draw=()=>{
    const t=performance.now()-start;if(t>=total){finish();return}
    if(t<takeoffLength)takeoff(t);else if(t<takeoffLength+mapLength)cruise(t-takeoffLength);else landing(t-takeoffLength-mapLength);
    const edges=[0,takeoffLength,takeoffLength+mapLength,total],near=Math.min(...edges.map(e=>Math.abs(t-e)));
    fade(g,Math.round((1-Math.min(1,near/fadeLength))*16));
    if(t<2600){const hint='Click, Space or A to skip',w=Math.ceil(g.measureText(hint).width);box(g,W-w-12,H-16,w+8,12,'#0b1614a0');crispText(g,hint,W-w-8,H-16,'#d8e0dc')}
    frame=requestAnimationFrame(draw);
  };
  const finish=()=>{if(over)return;over=true;cancelAnimationFrame(frame);watcher.disconnect();overlay.remove();done()};
  overlay.addEventListener('pointerdown',finish);overlay.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();finish()});overlay.addEventListener('keyup',event=>event.stopPropagation());
  draw();
  return {skip:finish};
}
