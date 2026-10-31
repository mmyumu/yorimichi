import Phaser from 'phaser';
import { darkness, hhmm, minuteMs, minuteOfDay, minutes } from './clock';
import { crispText } from './ticket-gate';

// The bedside alarm: a 24-hour wheel turning under a fixed notch, its ring the sky of each hour through the ordered dither, the sun at noon, the moon at midnight, the sleep ahead in gold from now to the notch.
// Later hours lie clockwise. One 172 × 172 canvas texture shown at 2×, like the art.
const size=172,mid=86,rim=82,inner=56,hub=38,band=47,ringMiddle=69,turnStep=15,day=1440;
const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const rgb=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
// From the depth of night through dawn to full day.
const sky=['#141c48','#27336f','#6a4f8f','#d9785a','#f3c27a','#9adcf0','#6fc3e8'].map(rgb);
const outline=rgb('#0b1432'),face=rgb('#efe4c6'),dial=rgb('#101a3a'),gold=rgb('#ffd65c');
// The night's stars, [minute of the day, radius].
const stars=Array.from({length:26},(_,k)=>[(1140+k*137)%660+1140,60+(k*53)%19]);
const sunRows=['......#......','..#...#...#..','...#.....#...','.....###.....','....#####....','...#######...','#..#######..#','...#######...','....#####....','.....###.....','...#.....#...','..#...#...#..','......#......'];
const moonRows=['....####.....','..######.....','.######......','.#####.......','######.......','#####........','#####........','######......#','.######....##','.##########..','..#########..','....#####....'];
const sprite=(g:CanvasRenderingContext2D,rows:string[],x:number,y:number,color:string)=>{g.fillStyle=color;rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(c==='#')g.fillRect(x+i,y+j,1,1)}))};
/** Screen position of the minute `m` of the day, the wheel set to `value`, at `r` px from the middle. */
const onWheel=(m:number,value:number,r:number):[number,number]=>{const a=(m-value)/day*Math.PI*2;return [Math.round(mid+Math.sin(a)*r),Math.round(mid-Math.cos(a)*r)]};

export interface WakeWheel {at():number;turn(dir:number):void}
/** The wheel, centred at scene px (`x`, `y`) in `parent`, set to `start` (minute of the day), snapping to 15 minutes. Dragged round, spun by the mouse wheel, or a click on an hour brings it to the notch; `turn`, called every frame with a held direction, steps it and repeats. `changed` hears each new time and each passing game minute. */
export function wakeWheel(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,x:number,y:number,start:number,changed:(at:number)=>void):WakeWheel{
  const texture=(scene.textures.exists('wake-wheel')?scene.textures.get('wake-wheel'):scene.textures.createCanvas('wake-wheel',size,size)) as Phaser.Textures.CanvasTexture,g=texture.context;
  const image=scene.add.image(x,y,'wake-wheel').setScale(2).setInteractive({useHandCursor:true});parent.add(image);
  let value=start,grabbed=false,last=0,moved=0,held=0,spin:Phaser.Tweens.Tween|null=null;
  const at=()=>minuteOfDay(Math.round(value/turnStep)*turnStep);
  const paint=()=>{
    const now=minuteOfDay(),span=minuteOfDay(value-now),shot=g.createImageData(size,size);
    for(let py=0;py<size;py++)for(let px=0;px<size;px++){
      const dx=px+.5-mid,dy=py+.5-mid,r=Math.hypot(dx,dy);if(r>rim)continue;
      const m=value+Math.atan2(dx,-dy)/(Math.PI*2)*day;let color=outline;
      if(r<hub-1)color=dial;
      else if(r>=hub&&r<inner-1)color=face;
      else if(r>=inner+1&&r<inner+4&&minuteOfDay(m-now)<=span)color=gold;
      else if(r>=inner&&r<rim-1)color=sky[Math.floor((1-darkness(m))*(sky.length-1)+bayer[(py&3)*4+(px&3)]/16)];
      shot.data.set([...color,255],(py*size+px)*4);
    }
    g.clearRect(0,0,size,size);g.putImageData(shot,0,0);
    for(const [m,r] of stars){const [sx,sy]=onWheel(m,value,r);g.fillStyle=m%3?'#c9d4ff':'#fffef2';g.fillRect(sx,sy,1,1)}
    {const [sx,sy]=onWheel(720,value,ringMiddle);sprite(g,sunRows,sx-6,sy-6,'#ffc53d')}
    {const [sx,sy]=onWheel(0,value,ringMiddle);sprite(g,moonRows,sx-6,sy-6,'#f4eeb8')}
    // The time now, a yellow bar across the ring, where the gold arc starts.
    g.fillStyle='#ffd65c';for(let r=inner;r<rim-2;r++){const [sx,sy]=onWheel(now,value,r);g.fillRect(sx,sy,2,2)}
    g.font='10px "Yorimichi Bitmap"';
    for(let h=0;h<24;h++){
      const [tx,ty]=onWheel(h*60,value,inner-3);g.fillStyle='#5c5a52';g.fillRect(tx,ty,1,1);if(h%3)continue;
      const [lx,ly]=onWheel(h*60,value,band-2);crispText(g,String(h),lx-g.measureText(String(h)).width/2,ly-5,'#294a48');
    }
    // The notch, over the ring.
    g.fillStyle='#0b1432';for(let k=0;k<9;k++)g.fillRect(mid-6+Math.ceil(k/2),k+1,12-k,1);g.fillStyle='#d6402e';for(let k=0;k<7;k++)g.fillRect(mid-4+Math.ceil(k/2),k+1,8-k,1);
    crispText(g,'WAKE',mid-g.measureText('WAKE').width/2,mid-21,'#9fb0d8');
    g.font='20px "Yorimichi Bitmap"';const time=hhmm(at());crispText(g,time,mid-g.measureText(time).width/2,mid-9,'#fff0d4');
    texture.refresh();
  };
  const set=(v:number)=>{value=v;paint();changed(at())};
  const angle=(pointer:Phaser.Input.Pointer)=>Math.atan2(pointer.x-x,y-pointer.y);
  const glide=(to:number)=>{spin=scene.tweens.addCounter({from:value,to:Math.round(to/turnStep)*turnStep,duration:260,ease:'Cubic.easeOut',onUpdate:tween=>set(tween.getValue()!)})};
  const stop=()=>{spin?.stop();spin=null};
  const down=(pointer:Phaser.Input.Pointer)=>{stop();grabbed=true;moved=0;last=angle(pointer)};
  const move=(pointer:Phaser.Input.Pointer)=>{if(!grabbed)return;const a=angle(pointer),d=Phaser.Math.Angle.Wrap(a-last);last=a;moved+=Math.abs(d);set(value-d/(Math.PI*2)*day)};
  const up=(pointer:Phaser.Input.Pointer)=>{
    if(!grabbed)return;grabbed=false;
    const onRing=Math.hypot(pointer.x-x,pointer.y-y)>hub*2;glide(moved<.05&&onRing?value+angle(pointer)/(Math.PI*2)*day:value);
  };
  const scroll=(_pointer:Phaser.Input.Pointer,_over:unknown,_dx:number,dy:number)=>{stop();set(at()+Math.sign(dy)*turnStep)};
  const timer=scene.time.addEvent({delay:minuteMs,loop:true,callback:()=>{paint();changed(at())}});
  image.on('pointerdown',down);scene.input.on('pointermove',move);scene.input.on('pointerup',up);scene.input.on('wheel',scroll);
  image.once('destroy',()=>{stop();timer.remove();scene.input.off('pointermove',move);scene.input.off('pointerup',up);scene.input.off('wheel',scroll)});
  paint();changed(at());
  return {at,turn(dir){
    if(!dir){held=0;return}
    const t=performance.now();if(t<held)return;
    stop();held=t+(held?70:280);set(at()+dir*turnStep);
  }};
}
