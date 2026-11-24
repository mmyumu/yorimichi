/** The man met in the village below the Rakusai bamboo park (main.ts `monsieur`): about sixty-five, his short hair grey with some black left in it, glasses, a pale blue polo shirt, dark grey trousers, a staff card on its strap from the primary school.
 * A commuter's 20 × 28 frames (`monsieur-<face>-<frame>`); a drawing of them dropped in src/sprites/monsieur.png replaces the painted ones, as for Chappy (daimonji-art.ts). */
import Phaser from 'phaser';
import { paintCommuter } from './art';
import type { Look } from './people';

const monsieur:Look={coat:'#a8bed4',legs:'#45464c',hair:'#8c8c88',style:'short',skin:'#d6a27a',height:.93};
const faces=['down','up','left','right'];
const sheets=import.meta.glob<string>('./sprites/*.png',{eager:true,query:'?url',import:'default'});
export const monsieurHeight=monsieur.height!;

export function makeMonsieurSprites(scene:Phaser.Scene){
  if(scene.textures.exists('monsieur-down-0'))return;
  for(const face of faces)for(let frame=0;frame<3;frame++){
    const t=scene.textures.createCanvas(`monsieur-${face}-${frame}`,20,28)!,g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
    const bob=frame===1?1:0,side=face==='left'||face==='right',flip=(x:number,w=1)=>face==='left'?20-x-w:x,ink='#283e40',rim='#4a4c54';
    paintCommuter(g,monsieur,face,frame);
    // The polo's collar, short sleeves and bare forearms; the staff card on its strap, front on.
    if(face==='down'){r(8,12+bob,2,1,'#e4eef6');r(12,12+bob,2,1,'#e4eef6');r(4,17+bob,2,2,monsieur.skin!);r(15,17+bob,2,2,monsieur.skin!);r(9,12+bob,1,4,'#2e5a8a');r(12,12+bob,1,4,'#2e5a8a');r(9,16+bob,4,3,'#f4f4ee');r(10,17+bob,2,1,'#6a8aa8')}
    else if(side){r(flip(9,3),17+bob,3,2,monsieur.skin!);r(flip(8),12+bob,1,4,'#2e5a8a')}
    else r(7,12+bob,7,1,'#e4eef6');
    // Black still in the grey, at the back and over the ears; the glasses, a thin dark rim round the eyes.
    if(face==='up')r(7,8+bob,8,3,'#4a4a48');else{r(side?flip(6,3):6,6+bob,side?3:1,2,'#4a4a48');if(!side)r(15,6+bob,1,2,'#4a4a48')}
    if(face==='down'){r(8,9+bob,6,1,rim);r(9,9+bob,1,1,ink);r(12,9+bob,1,1,ink)}
    else if(side){r(flip(12,3),9+bob,3,1,rim);r(flip(13),9+bob,1,1,ink);r(flip(9,3),8+bob,3,1,rim)}
    t.refresh();
  }
  const url=sheets['./sprites/monsieur.png'];if(url){const sheet=new Image();sheet.onload=()=>faces.forEach((face,row)=>{for(let frame=0;frame<3;frame++){const t=scene.textures.get(`monsieur-${face}-${frame}`) as Phaser.Textures.CanvasTexture;t.context.clearRect(0,0,20,28);t.context.drawImage(sheet,frame*20,row*28,20,28,0,0,20,28);t.refresh()}});sheet.src=url}
}
