/** The walk up Mt Daimonji (main.ts `hike`): Chappy and his dog Louis as sprites, after the photo taken up there: a man of seventy who does not look it, glasses, his hair still dark, a blue-grey T-shirt, beige shorts, a pouch at his waist, trainers;
 * Louis a black Labrador of three, his red collar and its tag. Chappy is a commuter's 20 × 28 frames (`chappy-<face>-<frame>`), Louis 24 × 18 (`louis-<face>-<frame>`), both with their feet near the frame's foot; Chappy on his bicycle, side on, facing right (`chappy-bike-<frame>`).
 * A drawing of Chappy's frames dropped in src/sprites/chappy.png replaces the painted ones, as for the outings' friends (outing-art.ts). */
import Phaser from 'phaser';
import { paintCommuter } from './art';
import type { Look } from './people';

const chappy:Look={coat:'#7f93ad',legs:'#d6cbae',hair:'#3a3432',style:'short',skin:'#e0b48e',height:.95};
const faces=['down','up','left','right'];
const sheets=import.meta.glob<string>('./sprites/*.png',{eager:true,query:'?url',import:'default'});
export const chappyHeight=chappy.height!;

export function makeHikeSprites(scene:Phaser.Scene){
  if(scene.textures.exists('louis-down-0'))return;
  const canvas=(key:string,w:number,h:number)=>{const t=scene.textures.createCanvas(key,w,h)!;const g=t.context;return {g,t,r:(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)}}};
  // Chappy: the commuter's frames, then his shorts (bare legs below them), his glasses, the grey in his hair, the pouch across his front.
  for(const face of faces)for(let frame=0;frame<3;frame++){
    const {g,r,t}=canvas(`chappy-${face}-${frame}`,20,28),bob=frame===1?1:0,side=face==='left'||face==='right',flip=(x:number,w=1)=>face==='left'?20-x-w:x,skin=chappy.skin!;
    paintCommuter(g,chappy,face,frame);
    if(side){const a=frame===1?2:frame===2?-2:0;r(8+a,23,3,1,skin);r(10-a,23,3,1,skin)}else{r(6,23,3,1,skin);r(12,23,3,1,skin)}
    r(face==='left'?13:5,25,4,1,'#e8e8e4');
    if(face==='down'){for(const x of [8,10,11,13])r(x,9+bob,1,1,'#4a4a52');r(9,9+bob,1,1,'#1a1a1a');r(12,9+bob,1,1,'#1a1a1a');r(10,11+bob,2,1,'#b8705a');r(7,18+bob,7,3,'#2e2e36');r(9,19+bob,3,1,'#5a5a64')}
    else if(side){r(flip(12,3),9+bob,3,1,'#4a4a52');r(flip(13),9+bob,1,1,'#1a1a1a');r(flip(8,4),18+bob,4,3,'#2e2e36')}
    else r(6,18+bob,9,1,'#2e2e36');
    r(8,3+bob,2,1,'#8a8580');r(12,4+bob,2,1,'#8a8580');if(face==='up')r(9,6+bob,3,1,'#8a8580');
    t.refresh();
  }
  {const url=sheets['./sprites/chappy.png'];if(url){const sheet=new Image();sheet.onload=()=>faces.forEach((face,row)=>{for(let frame=0;frame<3;frame++){const t=scene.textures.get(`chappy-${face}-${frame}`) as Phaser.Textures.CanvasTexture;t.context.clearRect(0,0,20,28);t.context.drawImage(sheet,frame*20,row*28,20,28,0,0,20,28);t.refresh()}});sheet.src=url}}
  // Louis: side on, his legs in step, his tail going; from the front, his tongue out; from behind, his tail up.
  const coat='#1c1c22',sheen='#3a3a46',belly='#141418';
  for(const face of faces)for(let frame=0;frame<3;frame++){
    const {r,t}=canvas(`louis-${face}-${frame}`,24,18),step=frame===1?1:frame===2?-1:0,wag=frame%2?1:-1;
    r(4,16,16,2,'#00000040');
    if(face==='left'||face==='right'){
      const f=(x:number,w=1)=>face==='left'?24-x-w:x;
      for(const [x,s] of [[6,step],[9,-step],[14,-step],[17,step]] as const)r(f(x+s,2),12,2,4,x===9||x===17?belly:coat);
      r(f(5,13),7,13,6,coat);r(f(6,10),7,10,1,sheen);r(f(5,13),12,13,1,belly);
      r(f(16,6),3,6,6,coat);r(f(17,4),3,4,1,sheen);r(f(20,3),6,3,3,coat);r(f(22,1),6,1,1,'#000000');r(f(16,2),4,2,4,belly);r(f(19),5,1,1,'#8a6a3a');
      r(f(16,2),9,2,2,'#c8452e');r(f(17),11,1,1,'#e0c060');if(frame===1)r(f(21,1),9,1,2,'#e87a8a');
      r(f(2,4),7+wag,4,1,coat);r(f(1,2),6+wag*2,2,1,coat);
    }else if(face==='down'){
      r(8,12+Math.max(0,step),2,4-Math.max(0,step),coat);r(14,12+Math.max(0,-step),2,4-Math.max(0,-step),coat);r(8,8,8,6,coat);r(9,8,6,1,sheen);
      r(8,2,8,7,coat);r(9,2,6,1,sheen);r(6,3,2,5,belly);r(16,3,2,5,belly);r(10,5,1,1,'#8a6a3a');r(13,5,1,1,'#8a6a3a');r(10,6,4,3,'#24242c');r(11,6,2,1,'#000000');
      r(11,9,2,2,frame===1?'#f08a9a':'#e87a8a');r(9,10,6,1,'#c8452e');r(11,11,2,1,'#e0c060');
    }else{
      r(8,12+Math.max(0,step),2,4-Math.max(0,step),coat);r(14,12+Math.max(0,-step),2,4-Math.max(0,-step),coat);r(7,5,10,9,coat);r(8,5,8,1,sheen);
      r(8,1,8,6,coat);r(9,1,6,1,sheen);r(6,2,2,5,belly);r(16,2,2,5,belly);r(9,6,6,1,'#c8452e');r(11+wag,12,2,1,coat);r(11+wag*2,13,2,3,coat);
    }
    t.refresh();
  }
  // Chappy on his bicycle, side on: the wheels, the frame, a basket in front; himself on the saddle, a foot on each pedal turning.
  for(let frame=0;frame<2;frame++){
    const {r,t}=canvas(`chappy-bike-${frame}`,34,30),wheel=(cx:number)=>{for(let a=0;a<16;a++){const x=Math.round(cx+Math.cos(a/16*Math.PI*2)*5),y=Math.round(23+Math.sin(a/16*Math.PI*2)*5);r(x,y,1,1,'#2a2a2e')}r(cx,23,1,1,'#8a8a90');r(cx+(frame?-2:2),21+(frame?2:0),1,1,'#8a8a90')};
    r(3,28,28,2,'#00000040');wheel(7);wheel(27);
    for(const [x0,y0,x1,y1] of [[7,23,14,23],[14,23,12,15],[12,15,24,15],[14,23,24,15],[24,15,27,23],[24,15,25,11]] as const){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)r(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),1,1,'#7a8a96')}
    r(23,10,5,1,'#2a2a2e');r(25,12,6,4,'#c8b890');r(25,12,6,1,'#e0d4b0');r(11,14,4,1,'#2a2a2e');
    // Him: the shorts on the saddle, the legs down to the pedals, the T-shirt leaning to the bars, the head, the glasses.
    r(10,11,6,3,chappy.legs);const knee=frame?[15,17]:[13,19];r(knee[0],13,2,4,chappy.skin!);r(knee[0],17,3,1,'#e8e8e4');r(knee[1]-4,14,2,3,chappy.skin!);
    r(11,4,7,8,chappy.coat);r(12,4,5,1,'#9aaac0');r(17,6,6,2,chappy.coat);r(22,7,2,2,chappy.skin!);r(12,9,4,3,'#2e2e36');
    r(13,0,6,5,chappy.skin!);r(12,0,7,2,chappy.hair);r(12,0,2,4,chappy.hair);r(14,0,2,1,'#8a8580');r(17,2,2,1,'#4a4a52');r(18,2,1,1,'#1a1a1a');
    t.refresh();
  }
}
