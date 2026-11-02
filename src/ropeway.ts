import { darkness } from './clock';
import { softCrown } from './art';
import { box } from './hall-scene';
import { fade } from './flight';
import { crispText, fitPicture } from './ticket-gate';

// The Biwako Valley ropeway, one 320 × 200 picture scaled up whole, by day or night as the clock has it, after the traveller's photos: the camera rides with the cabin up the cable, the mountain and its rust-brown towers going by in front of Lake Biwa,
// the plain and the shore sinking out of sight as the lake opens up behind, Okishima on it, a wisp or two of cloud passing nearer than anything; from the foot station, about 300 m, to the summit's, about 1,100 m.
const W=320,H=200,length=9000,fadeLength=450,horizon=62;
const MW=880,MH=480,from:[number,number]=[170,350],to:[number,number]=[700,110],hold:[number,number]=[150,84];
const leaves=[['#2f4a2c','#46683a','#66884a','#8aa45e'],['#38502e','#587438','#7a9448','#a0b062'],['#4a4a2c','#6e5a34','#8a6a40','#a88a58'],['#5a3a26','#7a4a30','#9a6038','#b88048'],['#4e5a34','#6e7a44','#8a9654','#a8ae70']];
const random=(seed:number)=>()=>(seed=seed*16807%2147483647)/2147483647;
type Paint=(x:number,y:number,w:number,h:number,c:string)=>void;
const sheet=(w:number,h:number):[HTMLCanvasElement,CanvasRenderingContext2D,Paint]=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true})!;return [c,g,(x,y,bw,bh,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(bw),Math.round(bh))}]};
const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const bands=(r:Paint,y:number,h:number,top:string,bottom:string,n:number)=>{for(let i=0;i<n;i++){const c=mix(top,bottom,i/(n-1)),t=y+Math.round(i*h/n);r(0,t,W,Math.ceil(h/n)+1,c);if(i)for(let x=i%2*2;x<W;x+=4)r(x,t-1,2,1,c)}};
/** The cable's height at `x`, and the ground under it. */
const cable=(x:number)=>from[1]+(x-from[0])/(to[0]-from[0])*(to[1]-from[1]);
const ground=(x:number)=>x<from[0]?382:x>to[0]+10?cable(to[0])+26:cable(x)+34+Math.min(1,(x-from[0])/60)*(14+9*Math.sin(x/61)+5*Math.sin(x/23));
const towers=[.36,.7].map(p=>from[0]+(to[0]-from[0])*p);
/** A night's tint over what is painted on a layer. */
const dusk=(g:CanvasRenderingContext2D,w:number,h:number)=>{g.globalCompositeOperation='source-atop';g.fillStyle='#1a2548b8';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over'};
/** What does not move: the sky, the far shore in its haze, the lake and its islands. */
function backdrop(night:boolean){
  const [c,g,r]=sheet(W,H),rand=random(11);
  bands(r,0,horizon,'#4c84c6','#bcdaea',10);
  for(const [x,y,w] of [[22,20,110],[190,12,100],[120,34,80]] as const)for(let i=0;i<4;i++)r(x+i*8,y+i*2,w-i*15,1,i%2?'#d8e6f2':'#a8c6e2');
  for(let x=4;x<W;x+=14+rand()*24){const w=5+rand()*12;r(x,horizon-7+rand()*3,w,2,'#f4f6f4');r(x+2,horizon-8+rand()*3,w-4,1,'#ffffff')}
  for(let x=0;x<W;x+=2){const y=horizon-7-Math.sin(x/30)*2-Math.sin(x/9+1)-Math.exp(-(((x-230)/50)**2))*3;r(x,y,2,9,'#9ab4cc')}for(let x=0;x<W;x+=2){const y=horizon-3-Math.sin(x/21+2);r(x,y,2,5,'#84a4bc')}r(0,horizon+1,W,1,'#b4c2b4');for(let x=2;x<W;x+=5+rand()*7)r(x,horizon+1,2,1,'#e4e8dc');
  bands(r,horizon+2,H-horizon-2,'#74aacc','#2c6696',10);
  for(let i=0;i<150;i++){const y=horizon+3+rand()**1.4*(H-horizon-4),w=4+(y-horizon)*.3+rand()*12;r(rand()*W,y,w,1,y<105?'#9cc4dc':'#5a94bc')}
  for(const [cx,y,w,h] of [[96,76,30,6],[122,77,14,4],[62,76,9,2],[176,74,8,2]] as const){for(let x=-w;x<w;x++){const t=x/w,top=h*(1-t*t)*(.7+.3*Math.sin(x/3));r(cx+x,y-top,1,top+1,x<-w/3?'#6c8a7a':'#527466')}r(cx-w,y,w*2,1,'#3a5e70')}
  if(night)dusk(g,W,H);return c;
}
/** The plain below, sinking as the cabin climbs: the shore, the town along it, the fields. */
function plain(night:boolean){
  const [c,g,r]=sheet(W+80,110),rand=random(3),shore=(x:number)=>8+Math.sin(x/34)*4+Math.sin(x/11)*1.5;
  for(let x=0;x<W+80;x+=2){const y=shore(x);r(x,y,2,110-y,'#7c9a66');r(x,y-1,2,2,'#d8dccc')}
  for(let i=0;i<150;i++){const x=rand()*(W+80),y=shore(x)+10+rand()*96,w=8+rand()*18;r(x,y,w,3+y/30,['#b8ac64','#94aa62','#c8b878','#70925a'][Math.floor(rand()*4)]);r(x,y+3+y/30,w,1,'#5c7a4c')}
  // The town, unbroken along the water: streets and roofs from the quay back, thinning into the fields.
  for(let i=0;i<1300;i++){const x=rand()*(W+80),y=shore(x)+1+rand()**1.5*34;r(x,y,2+rand()*3,2,['#eae6dc','#c8cccc','#a8604c','#54666e','#d8d2c4','#6e7a80'][Math.floor(rand()*6)])}
  if(night){dusk(g,W+80,110);for(let i=0;i<260;i++){const x=rand()*(W+80);r(x,shore(x)+2+rand()*26,1,1,'#ffd99a')}}return c;
}
/** The mountain, in the world the camera rides through: the slope and its scrub, the towers, the cable, the two stations. */
function mountain(night:boolean){
  const [c,g,r]=sheet(MW,MH),rand=random(19);
  for(let x=0;x<MW;x++){const y=ground(x);r(x,y,1,MH-y,'#34482c')}
  // The scrub from the crest down, so that nearer crowns overlap those above.
  const crowns=Array.from({length:5200},()=>{const x=rand()*MW,y=ground(x)+rand()*(MH-ground(x));return {x,y}}).sort((a,b)=>a.y-b.y);
  // Stamped from a set of bushes painted once, each leaf colour at three sizes: thousands of them painted pixel by pixel would hold the page up for seconds.
  const stamps=leaves.flatMap(pal=>[5,7,9,11,13].flatMap(rx=>[0,1].map(()=>{const [c,,paint]=sheet(rx*2+6,Math.ceil(rx*1.4)+6);softCrown(paint,rand,rx+3,rx*.7+3,rx,rx*.7,pal);return c}))),sizes=5*2;
  for(const {x,y} of crowns){if(x<from[0]-20)continue;const near=Math.min(1,(y-ground(x))/120),pal=Math.floor(rand()**1.3*leaves.length),size=Math.min(4,Math.floor(rand()*3+near*2)),stamp=stamps[pal*sizes+size*2+Math.floor(rand()*2)];g.drawImage(stamp,Math.round(x-stamp.width/2),Math.round(y-stamp.height/2))}
  // The foot station on the flat, the car park and the road before it.
  // The neighbourhood round it, little houses in their rows with gardens between, the road through, the forecourt and a few cars before the doors.
  r(0,382,from[0]+56,MH-382,'#66745c');
  for(let y=382;y<MH;y+=9)for(let x=-4+(y%2)*5;x<from[0]+50;x+=11){if(y<406&&x>from[0]-44)continue;if(x>from[0]+10+(y-382)*.1)continue;const bx=x+rand()*2,by=y+rand()*2,v=rand();if(v<.14){softCrown(r,rand,bx+4,by+3,5,4,leaves[Math.floor(rand()*3)]);continue}const roof=['#54666e','#6e7a80','#a8604c','#8a4a3c','#4a5258','#c8c0b0'][Math.floor(rand()*6)];r(bx-1,by+6,10,1,'#00000040');r(bx,by,8,4,roof);r(bx,by,8,1,mix(roof,'#ffffff',.3));r(bx+4,by,1,4,mix(roof,'#000000',.2));r(bx,by+4,8,2,['#e8e2d4','#d8d2c4','#c8c4b8'][Math.floor(rand()*3)]);r(bx+2,by+4,2,1,'#3a4a54')}
  r(from[0]-44,382,100,24,'#a9aaa6');for(let x=from[0]-44;x<from[0]+56;x+=8)r(x,382,1,10,'#9a9b97');r(0,392,from[0]+56,12,'#5d625c');for(let x=0;x<from[0]+56;x+=18)r(x,397,9,1,'#e6e3cc');for(let i=0;i<5;i++)r(from[0]-40+i*13,384,8,4,['#d8d8d8','#3f6a8c','#a8483a','#efeee4','#3a3a38'][i]);
  r(from[0]-26,352,62,30,'#d8d4c4');for(let x=from[0]-24;x<from[0]+36;x+=7)r(x,352,1,30,'#c6c2b2');r(from[0]-32,345,74,8,'#54504a');r(from[0]-32,352,74,1,'#3a3a38');r(from[0]-16,362,42,20,'#2a3238');r(from[0]-14,364,18,18,'#a8c4cc');r(from[0]+6,364,18,18,'#a8c4cc');r(from[0]-6,338,24,8,'#3a4246');
  // The summit's grass and buildings: the top station in dark timber on its rust-brown steel, the frame the cable runs into.
  for(let x=to[0]-40;x<MW;x++){const y=ground(x);r(x,y-1,1,5+Math.max(0,x-to[0])*.2,'#7f9a58');if(x%3===0)r(x,y-2,1,1,'#b4bc80')}
  r(to[0]+18,74,92,62,'#3a302c');for(let x=to[0]+20;x<to[0]+110;x+=3)r(x,74,1,62,'#2a2220');r(to[0]+30,88,64,14,night?'#ffd99a':'#c8dce4');r(to[0]+12,68,104,6,'#23201e');
  for(let i=0;i<5;i++){const x=to[0]-6+i*8;r(x,64,2,72,'#7a4a30');r(x+1,64,1,72,'#a8643c')}r(to[0]-10,62,44,4,'#7a4a30');r(to[0]-10,100,44,3,'#5e3a26');r(to[0]-10,124,44,3,'#5e3a26');for(let i=0;i<22;i++){r(to[0]-8+i*2,66+i*2.6,2,1,'#a8643c');r(to[0]+34-i*2,66+i*2.6,2,1,'#6e4228')}
  // The towers, rust-brown lattice, a wide saddle splayed over the cable.
  for(const x of towers){const top=cable(x)-3,base=ground(x)+6,h=base-top;for(let y=top+6;y<base;y++){const w=3+(y-top)/h*11;r(x-w,y,2,1,'#5e3a26');r(x+w,y,2,1,'#7a4a30');if(Math.round(y)%7===0)r(x-w,y,w*2,1,'#6e4228');if(Math.round(y)%14<7)r(x-w+(Math.round(y)%14)/7*w*2,y,2,1,'#8a5a38');else r(x+w-(Math.round(y)%14-7)/7*w*2,y,2,1,'#5e3a26')}r(x-16,top,34,3,'#7a4a30');r(x-16,top,34,1,'#a8643c');r(x-13,top+3,28,2,'#5e3a26');for(const k of [-12,-4,4,12])r(x+k,top-2,3,2,'#3a2e28')}
  // The two cables.
  for(let x=from[0]-4;x<to[0]+10;x++){const y=cable(x);r(x,y,1,1,'#2a2e32');r(x,y+3,1,1,'#3a4048')}
  if(night)dusk(g,MW,MH);
  if(night){for(const x of towers)r(x-1,cable(x)-5,3,2,'#ff5a40');r(from[0]-14,366,38,2,'#ffd99a')}
  return c;
}
/** The cabin, large and round-cornered, glass all round as the real one, its hanger and the carriage's wheels on the cable, a few heads at the windows. */
function cabin(night:boolean){
  const [c,,r]=sheet(60,48);
  r(26,8,3,12,'#3a4246');r(22,18,11,2,'#3a4246');r(14,2,28,4,'#54606a');r(14,2,28,1,'#8a98a4');r(16,0,4,3,'#23292e');r(36,0,4,3,'#23292e');r(26,6,3,3,'#23292e');
  r(9,20,42,3,'#fbfaf2');r(6,22,48,2,'#efeee4');r(5,24,50,14,night?'#ffd99a':'#a8d4e8');r(5,24,3,14,'#efeee4');r(52,24,3,14,'#efeee4');for(const x of [15,24,33,42])r(x,24,1,14,'#fbfaf2');r(5,24,50,1,'#fbfaf2');
  if(!night)for(const [x,y] of [[11,27],[28,29],[46,26]])r(x,y,5,1,'#d4ecf4');for(const [x,col] of [[10,'#3a4a5c'],[19,'#8a4a3a'],[28,'#2f6a8c'],[37,'#54504a'],[45,'#a8843c']] as const){r(x,31,5,7,col);r(x+1,27,3,4,'#d8b090');r(x+1,27,3,1,'#2a2420')}
  r(5,38,50,3,'#1d5fae');r(5,38,50,1,'#4a8ad8');r(7,41,46,3,'#efeee4');r(10,44,40,1,'#c8c6ba');
  return c;
}
/** A small cloud, nearer than the cabin: round heads on a flat foot, shaded under. */
function wisp(seed:number,night:boolean){
  const [c,g,r]=sheet(84,28),rand=random(seed),puff=(cx:number,cy:number,rx:number,ry:number,color:string)=>{for(let y=-ry;y<ry;y++){const w=rx*Math.sqrt(1-((y+.5)/ry)**2);r(cx-w,cy+y,w*2,1,color)}};
  const heads=Array.from({length:6},(_,i)=>[12+i*12+rand()*4,20-rand()*5-(i>0&&i<5?4:0),8+rand()*5] as const);
  for(const [x,y,s] of heads)puff(x,y+2,s+1,s*.7+1,'#c8dae6');for(const [x,y,s] of heads)puff(x,y,s,s*.7,'#f8fafa');for(const [x,y,s] of heads)puff(x-2,y-2,s*.5,s*.3,'#ffffff');
  r(4,24,76,3,'#c8dae6');if(night)dusk(g,84,28);
  return c;
}
/** The pictures, painted once for day and once for night: the mountain's scrub takes a moment. */
const cache=new Map<boolean,{sky:HTMLCanvasElement;land:HTMLCanvasElement;hill:HTMLCanvasElement;car:HTMLCanvasElement}>();
const layers=(night:boolean)=>{let set=cache.get(night);if(!set){set={sky:backdrop(night),land:plain(night),hill:mountain(night),car:cabin(night)};cache.set(night,set)}return set};
/** The ride up (or down), `done` once it is over or skipped. */
export function playRopeway(up:boolean,done:()=>void){
  const night=darkness()>.5,overlay=document.createElement('div');overlay.className='flight-overlay';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label',`The ropeway ${up?'up':'down'}`);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;overlay.append(canvas);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;g.font='10px "Yorimichi Bitmap"';const fit=()=>fitPicture(canvas,overlay,W,H);fit();const watcher=new ResizeObserver(fit);watcher.observe(overlay);
  const {sky,land,hill,car}=layers(night),clouds=[[wisp(5,night),520,120],[wisp(13,night),250,250]] as const,start=performance.now(),rand=random(23);
  const sparkles=Array.from({length:50},()=>[rand()*W,horizon+6+rand()*(H-horizon-8),rand()*6.3] as const);
  let frame=0,over=false;
  const plate=(text:string,right:boolean)=>{const w=Math.ceil(g.measureText(text).width),x=right?W-w-13:5;box(g,x,5,w+8,13,'#0b1614c8');crispText(g,text,x+4,6,'#fffef2')};
  const draw=()=>{
    const t=performance.now()-start;if(t>=length){finish();return}
    const q=t/length,e=q<.14?q*q/(.14*2*.86):q>.86?1-(1-q)**2/(.14*2*.86):(q-.07)/.86,p=up?e:1-e,x=from[0]+(to[0]-from[0])*p,y=cable(x);
    const cx=Math.round(x-hold[0]),cy=Math.round(y-hold[1]),near=Math.min(...towers.map(tx=>Math.abs(tx-x))),sway=Math.sin(t/620)*.6+(near<40?Math.sin(t/110)*(1-near/40)*1.4:0);
    g.drawImage(sky,0,0);
    if(!night){g.fillStyle='#fffef2';for(const [sx,sy,phase] of sparkles)if(Math.sin(t/300+phase)>.86)g.fillRect(Math.round(sx),Math.round(sy),2,1)}
    g.drawImage(land,Math.round(-p*70),Math.round(118+p*p*130));
    g.drawImage(hill,-cx,-cy);
    g.drawImage(car,Math.round(hold[0]-28+sway),hold[1]-1);
    for(const [image,wx,wy] of clouds)g.drawImage(image,Math.round((wx-cx)*1.3-40+t/120),Math.round((wy-cy)*1.3-60));
    plate('Biwako Valley Ropeway',false);plate(`${(Math.round((300+800*p)/10)*10).toLocaleString('en')} m`,true);
    fade(g,Math.round((1-Math.min(1,Math.min(t,length-t)/fadeLength))*16));
    if(t<2600){const hint='Click, Space or A to skip',s=Math.ceil(g.measureText(hint).width);box(g,W-s-12,H-16,s+8,12,'#0b1614a0');crispText(g,hint,W-s-8,H-16,'#d8e0dc')}
    frame=requestAnimationFrame(draw);
  };
  const finish=()=>{if(over)return;over=true;cancelAnimationFrame(frame);watcher.disconnect();overlay.remove();done()};
  overlay.addEventListener('pointerdown',finish);overlay.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();finish()});overlay.addEventListener('keyup',event=>event.stopPropagation());
  draw();
  return {skip:finish};
}
