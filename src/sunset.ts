import { box } from './hall-scene';
import { fade } from './flight';
import { crispText, fitPicture } from './ticket-gate';

// The sun going down over Kyoto from the fire bed of Mt Daimonji, one 320 × 200 picture scaled up whole, after the traveller's photos: the sky from gold to orange to the blue of the evening, the sun sinking behind the western hills
// (Arashiyama and Atago on the skyline), the city below in its haze, its lights coming on one by one; in front, the treetops, the pampas grass, and on the hearth's stones the traveller, Chappy and Louis from behind (their sprites, `people`).
// `late`: already night, only the lights of the city. The clock it shows runs from `from` (minutes of the day) for `minutes`.
const W=320,H=200,horizon=104,cityFoot=158;
const random=(seed:number)=>()=>(seed=seed*16807%2147483647)/2147483647;
type Paint=(x:number,y:number,w:number,h:number,c:string)=>void;
const sheet=(w:number,h:number):[HTMLCanvasElement,CanvasRenderingContext2D,Paint]=>{const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d')!;return [c,g,(x,y,bw,bh,color)=>{g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(bw),Math.round(bh))}]};
const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
/** A colour along stops [t, colour], t from 0 to 1. */
const along=(stops:[number,string][],t:number)=>{for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){const [a,ca]=stops[i-1],[b,cb]=stops[i];return mix(ca,cb,(t-a)/(b-a||1))}return stops[stops.length-1][1]};
/** The sky's top and its horizon as the evening goes on. */
const zenith:[number,string][]=[[0,'#6c9cd0'],[.45,'#5a7cb8'],[.75,'#3a4c88'],[1,'#1a2350']],low:[number,string][]=[[0,'#f6d8a0'],[.35,'#f8b060'],[.6,'#f07a3a'],[.8,'#a84a5a'],[1,'#3a3460']];
/** The western hills' skyline, two ridges. */
const ridge=(x:number,far:boolean)=>far?horizon-6-Math.exp(-(((x-70)/40)**2))*9-Math.exp(-(((x-250)/34)**2))*14-Math.sin(x/17)*1.5:horizon-2-Math.exp(-(((x-140)/60)**2))*5-Math.sin(x/11+2);

/** The city in its plain, drawn once: blocks and roofs smaller and paler towards the hills, the parks, the river; and where its lights are, each with the moment it comes on. */
function city(){
  const [c,,r]=sheet(W,cityFoot-horizon),rand=random(7),h=cityFoot-horizon;
  r(0,0,W,h,'#a8a6a0');
  for(let i=0;i<5200;i++){const y=rand()*h,d=y/h;r(rand()*W,y,1+Math.floor(rand()*(1+d*3)),1,['#c8c6be','#8e8c88','#b8b4a8','#d8d6ce','#7a7a78','#ac9e8c'][Math.floor(rand()*6)])}
  for(const [x,y,w,hh] of [[96,8,34,7],[170,3,12,5],[224,24,50,14],[40,14,10,4],[290,6,18,4]] as const)for(let i=0;i<w*hh/3;i++){const t=rand()*Math.PI*2,d=Math.sqrt(rand());r(x+w/2+Math.cos(t)*d*w/2,y+hh/2+Math.sin(t)*d*hh/2,2,1,['#4e6c46','#3e5a3a','#5e7a50'][Math.floor(rand()*3)])}
  for(let y=0;y<h;y++)r(200-y*.3+Math.sin(y/7)*2,y,1+Math.floor(y/18),1,'#8eaab4');
  for(let y=0;y<10;y++)r(0,y,W,1,`rgba(246,216,176,${(.5-y*.05).toFixed(2)})`);
  const lights=Array.from({length:900},()=>{const y=rand()*h;return {x:Math.floor(rand()*W),y:Math.floor(y),on:.55+rand()*.4,c:['#ffe8a0','#fff4d0','#f8c870','#e8f0ff','#ffd890'][Math.floor(rand()*5)]}});
  // The main streets, lit in lines.
  for(const [x0,y0,x1,y1] of [[0,30,W,22],[60,0,40,h],[150,0,140,h],[0,44,W,40]] as const)for(let i=0;i<60;i++){const t=i/60;lights.push({x:Math.round(x0+(x1-x0)*t),y:Math.round(y0+(y1-y0)*t),on:.5+rand()*.15,c:'#ffd888'})}
  return {image:c,lights};
}

export function playSunset(late:boolean,from:number,minutes:number,people:HTMLCanvasElement[],done:()=>void){
  const length=late?8000:15000,fadeLength=500;
  const overlay=document.createElement('div');overlay.className='flight-overlay';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Sunset over Kyoto from Mt Daimonji');
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;overlay.append(canvas);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;g.font='10px "Yorimichi Bitmap"';const fit=()=>fitPicture(canvas,overlay,W,H);fit();const watcher=new ResizeObserver(fit);watcher.observe(overlay);
  const town=city(),rand=random(31),stars=Array.from({length:40},()=>[rand()*W,rand()*60,rand()] as const),grass=Array.from({length:46},(_,i)=>[i*7+rand()*5,8+rand()*10,rand()*6.3] as const),start=performance.now();
  const shades=people.map(image=>{const [c,s]=sheet(image.width,image.height);return [c,s] as const});
  const r:Paint=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  let frame=0,over=false;
  const plate=(text:string,right:boolean)=>{const w=Math.ceil(g.measureText(text).width),x=right?W-w-13:5;box(g,x,5,w+8,13,'#0b1614c8');crispText(g,text,x+4,6,'#fffef2')};
  const draw=()=>{
    const t=performance.now()-start;if(t>=length){finish();return}
    const n=late?1:Math.min(1,t/length*1.15),dark=Math.max(0,(n-.55)/.45);
    // The sky in bands, top to horizon, each edge broken by a row of dither.
    const top=along(zenith,n),bottom=along(low,n);for(let i=0;i<14;i++){const c=mix(top,bottom,(i/13)**1.6),y=Math.round(i*horizon/14);r(0,y,W,Math.ceil(horizon/14)+1,c);if(i)for(let x=i%2*2;x<W;x+=4)r(x,y-1,2,1,c)}
    if(dark>.3)for(const [x,y,p] of stars)if(p<dark-.3&&Math.sin(t/400+p*40)>-.6)r(x,y,1,1,'#f4f0e0');
    // A streak or two of cloud, lit from below.
    for(const [x,y,w] of [[30,58,70],[200,46,90],[120,76,50]] as const){r(x+t/900,y,w,2,mix(along(low,Math.min(1,n+.1)),'#5a4a6a',dark*.7));r(x+8+t/900,y+2,w-20,1,mix('#f8c890','#6a4a6a',n))}
    // The sun: a glow round it, then the disc, low and red, sinking behind the hills.
    if(!late&&n<.8){const sy=62+n/.72*46,sx=176,sun=mix('#fff4c8','#f05a2a',Math.min(1,n/.7));for(const [rr,a] of [[20,.12],[13,.2],[9,.35]] as const){g.globalAlpha=a*(1-dark);g.fillStyle=sun;g.beginPath();g.arc(sx,sy,rr,0,7);g.fill()}g.globalAlpha=1;for(let y=-6;y<=6;y++){const w=Math.round(Math.sqrt(36-y*y)*2);r(sx-w/2,sy+y,w,1,sun)}}
    // The hills, darker as the light goes, the far ridge first.
    for(const far of [true,false]){const c=mix(far?'#8a8ab0':'#6a6a90',far?'#2a2a48':'#1c1c34',n);for(let x=0;x<W;x+=2){const y=ridge(x,far);r(x,y,2,horizon+4-y,c)}}
    // The city, dimming, its lights coming on.
    g.drawImage(town.image,0,horizon);r(0,horizon,W,cityFoot-horizon,`rgba(26,30,64,${(n*.78).toFixed(2)})`);r(0,horizon,W,4,`rgba(240,150,90,${(.4*(1-dark)*n).toFixed(2)})`);
    for(const light of town.lights)if(n>=light.on&&(Math.sin(t/260+light.x*13)>-.95))r(light.x,horizon+light.y,1,1,light.c);
    // In front: the treetops below the fire bed, the pampas swaying, the hearth's stones.
    const leaf=mix('#3a5a3a','#141a24',n),pampas=mix('#e8dcb0','#3a3448',n);for(let x=0;x<W;x+=3){const y=cityFoot-4+Math.sin(x/9)*3+Math.sin(x/4)*1.5;r(x,y,3,H-y,leaf)}
    for(const [x,h,p] of grass){const sway=Math.round(Math.sin(t/700+p)*2);for(let i=0;i<h;i++)r(x+Math.round(sway*i/h),176-i,1,1,pampas);r(x+sway,176-h-4,1,4,pampas);r(x+sway+1,176-h-2,1,3,pampas)}
    r(0,178,W,22,mix('#8e8a7e','#2a2832',n));for(let x=0;x<W;x+=19)r(x,178,18,2,mix('#b0ac9e','#3a3844',n));r(0,190,W,10,mix('#6e6a60','#1e1c26',n));
    // The three of them, from behind, sitting on the stones: their sprites at their own size, darkening with the evening.
    shades.forEach(([c,s],i)=>{s.globalCompositeOperation='copy';s.drawImage(people[i],0,0);s.globalCompositeOperation='source-atop';s.fillStyle=`rgba(14,16,36,${(n*.8).toFixed(2)})`;s.fillRect(0,0,c.width,c.height);g.drawImage(c,[134,160,184][i]??150,[152,152,164][i]??152)});
    plate('大文字山 · Mt Daimonji',false);const at=Math.floor(from+minutes*Math.min(1,t/length)),hh=Math.floor(at/60)%24;plate(`${hh}:${String(at%60).padStart(2,'0')}`,true);
    fade(g,Math.round((1-Math.min(1,Math.min(t,length-t)/fadeLength))*16));
    if(t<2600){const hint='Click, Space or A to skip',s=Math.ceil(g.measureText(hint).width);box(g,W-s-12,H-16,s+8,12,'#0b1614a0');crispText(g,hint,W-s-8,H-16,'#d8e0dc')}
    frame=requestAnimationFrame(draw);
  };
  const finish=()=>{if(over)return;over=true;cancelAnimationFrame(frame);watcher.disconnect();overlay.remove();done()};
  overlay.addEventListener('pointerdown',finish);overlay.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();finish()});overlay.addEventListener('keyup',event=>event.stopPropagation());
  draw();
  return {skip:finish};
}
