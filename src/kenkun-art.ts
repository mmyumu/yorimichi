/** The old photographer at Kenkun-jinja (main.ts `elder`), after the photo taken there: a thin man of seventy, his hair white and grey, a white T-shirt with grey-blue stripes, grey shorts, a black backpack, a big black camera on its strap round his neck.
 * A commuter's 20 × 28 frames (`elder-<face>-<frame>`); a drawing of them dropped in src/sprites/elder.png replaces the painted ones, as for Chappy (daimonji-art.ts). */
import Phaser from 'phaser';
import { paintCommuter } from './art';
import type { Look } from './people';

const elder:Look={coat:'#eeeeea',legs:'#7a776c',hair:'#d6d4ce',style:'short',skin:'#d8a47e',backpack:true,bag:'#1e1e22',height:.94};
const faces=['down','up','left','right'];
const sheets=import.meta.glob<string>('./sprites/*.png',{eager:true,query:'?url',import:'default'});
export const elderHeight=elder.height!;

export function makeElderSprites(scene:Phaser.Scene){
  if(scene.textures.exists('elder-down-0'))return;
  for(const face of faces)for(let frame=0;frame<3;frame++){
    const t=scene.textures.createCanvas(`elder-${face}-${frame}`,20,28)!,g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
    const bob=frame===1?1:0,side=face==='left'||face==='right',flip=(x:number,w=1)=>face==='left'?20-x-w:x,skin=elder.skin!,stripe='#8a98aa';
    paintCommuter(g,elder,face,frame);
    // Bare shins below the shorts, white socks; the stripes across the T-shirt, short sleeves, thin arms.
    if(side){const a=frame===1?2:frame===2?-2:0;r(8+a,23,3,1,skin);r(10-a,23,3,1,skin)}else{r(6,23,3,1,skin);r(12,23,3,1,skin)}
    if(face==='up')for(const y of [14,16,18])r(5,y+bob,11,1,stripe);
    else if(side){for(const y of [13,15,17,19])r(7,y+bob,7,1,stripe);r(flip(9,3),17+bob,3,2,skin)}
    else{for(const y of [13,15,17,19]){r(7,y+bob,7,1,stripe)}r(4,17+bob,2,2,skin);r(15,17+bob,2,2,skin)}
    // The camera on its strap: from the front the body and its lens, side on the lens poking forward; the backpack's straps over the shoulders.
    if(face==='down'){r(8,12+bob,1,3,'#1a1a1e');r(13,12+bob,1,3,'#1a1a1e');r(8,15+bob,6,3,'#1a1a1e');r(10,16+bob,2,2,'#4a5260');r(10,16+bob,1,1,'#9aa4b4');r(9,10+bob,1,1,'#a87a60');r(12,10+bob,1,1,'#a87a60')}
    else if(side){r(flip(11),12+bob,1,3,'#1a1a1e');r(flip(12,3),15+bob,3,3,'#1a1a1e');r(flip(15),16+bob,1,2,'#3a404c');r(flip(8),12+bob,1,6,'#1e1e22')}
    // Thin grey hair, the scalp showing on top; a few darker strands.
    r(9,3+bob,4,1,'#b8b4ac');if(face!=='up')r(8,4+bob,1,1,'#9a968e');
    t.refresh();
  }
  const url=sheets['./sprites/elder.png'];if(url){const sheet=new Image();sheet.onload=()=>faces.forEach((face,row)=>{for(let frame=0;frame<3;frame++){const t=scene.textures.get(`elder-${face}-${frame}`) as Phaser.Textures.CanvasTexture;t.context.clearRect(0,0,20,28);t.context.drawImage(sheet,frame*20,row*28,20,28,0,0,20,28);t.refresh()}});sheet.src=url}
}
