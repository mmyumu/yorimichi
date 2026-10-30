import Phaser from 'phaser';
import { darkness } from './clock';

type Doing='rest'|'peck'|'walk'|'fly';
interface Pigeon {image:Phaser.GameObjects.Image;doing:Doing;until:number;x:number;y:number;step:number}
// Where they stand at first, and the stretch of pavement before the station they keep to, in scene px.
const spots=[[396,304],[408,316],[584,340]],bounds={left:340,right:596,top:300,bottom:352};
// In px per ms; a pigeon walks in little jerks, a step every `stride` ms, its head going with it. Taking off when the traveller comes within `shy` px.
const walking=.03,flying=.2,stride=130,shy=56;
const between=(a:number,b:number)=>a+Math.random()*(b-a);

/** The street's pigeons (`pigeon-<frame>` from art.ts): they stand about, peck and walk a little in front of the station, flap off when the traveller comes near, and are gone to roost at night. */
export class Pigeons {
  private birds:Pigeon[];
  constructor(scene:Phaser.Scene,world:Phaser.GameObjects.Container){
    this.birds=spots.map(([x,y])=>{const image=scene.add.image(x,y,'pigeon-stand').setOrigin(.5,1);world.add(image);return {image,doing:'rest',until:between(0,2000),x,y,step:0}});
  }
  /** What it does next, once it has done with the last thing. */
  private next(bird:Pigeon){
    const roll=Math.random();
    if(roll<.45){bird.doing='peck';bird.until=between(500,1300)}
    else if(roll<.8){bird.doing='rest';bird.until=between(700,2500)}
    else{this.head(bird,between(-46,46),between(-16,16));bird.doing='walk'}
  }
  private head(bird:Pigeon,dx:number,dy:number){bird.x=Phaser.Math.Clamp(bird.image.x+dx,bounds.left,bounds.right);bird.y=Phaser.Math.Clamp(bird.image.y+dy,bounds.top,bounds.bottom);bird.image.setFlipX(bird.x<bird.image.x)}
  update(delta:number,playerX:number,playerY:number){
    const asleep=darkness()>.6;
    for(const bird of this.birds){
      const {image}=bird;image.setVisible(!asleep);if(asleep)continue;
      const away=Math.hypot(image.x-playerX,image.y-playerY);
      if(away<shy&&bird.doing!=='fly'){const k=between(70,110)/(away||1);this.head(bird,(image.x-playerX)*k+between(-20,20),(image.y-playerY)*k);bird.doing='fly'}
      const moving=bird.doing==='walk'||bird.doing==='fly';
      if(moving){
        const speed=bird.doing==='fly'?flying:walking,dx=bird.x-image.x,dy=bird.y-image.y,left=Math.hypot(dx,dy),go=Math.min(left,speed*delta);
        if(left>.5)image.setPosition(image.x+dx/left*go,image.y+dy/left*go);else{bird.doing='rest';bird.until=between(400,1500)}
      }else if((bird.until-=delta)<=0)this.next(bird);
      bird.step+=delta;const beat=Math.floor(bird.step/stride)%2;
      image.setTexture(`pigeon-${bird.doing==='fly'?(Math.floor(bird.step/70)%2?'up':'down'):bird.doing==='peck'?(beat?'peck':'stand'):bird.doing==='walk'&&beat?'step':'stand'}`);
    }
  }
}
