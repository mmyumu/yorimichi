import Phaser from 'phaser';

type Pose='sleep'|'up'|'sit';
// Where it lies on the lane's wall (the foot of its picture, scene px) and where its head is; the traveller wakes it within `near` px, and it sits up within `close`. Left alone for `calm` ms, it settles back one pose.
const x=320,y=542,headX=372,headY=522,near=150,close=84,calm=3500;
const between=(a:number,b:number)=>a+Math.random()*(b-a);

/** The neighbourhood's cat (`cat-<frame>` from art.ts), asleep on the Kyoto lane's wall: it lifts its head as the traveller comes by, sits up if they come close, watches them, flicks its tail and goes back to sleep. It never runs off. */
export class Cat {
  private image:Phaser.GameObjects.Image;
  private pose:Pose='sleep';
  private age=0;
  private left=0;
  private settle=0;
  private blink=between(1500,4000);
  private flick=between(1500,4000);
  constructor(scene:Phaser.Scene,world:Phaser.GameObjects.Container){this.image=scene.add.image(x,y,'cat-sleep-0').setOrigin(0,1);world.add(this.image)}
  update(delta:number,playerX:number,playerY:number){
    const away=Math.hypot(headX-playerX,headY-playerY),wanted:Pose=away<close?'sit':away<near?'up':'sleep',rank=['sleep','up','sit'];
    this.age+=delta;this.left=Math.max(0,this.left-delta);
    // Waking takes it a moment; settling takes it longer.
    if(rank.indexOf(wanted)>rank.indexOf(this.pose)){if((this.settle+=delta)>350){this.pose=rank[rank.indexOf(this.pose)+1] as Pose;this.settle=0;this.left=calm}}
    else if(rank.indexOf(wanted)<rank.indexOf(this.pose)){if(this.left<=0){this.pose=rank[rank.indexOf(this.pose)-1] as Pose;this.left=calm}}else{this.settle=0;this.left=calm}
    if(this.pose==='sleep'){this.image.setTexture(`cat-sleep-${Math.floor(this.age/1400)%2}`);return}
    if((this.blink-=delta)<-140)this.blink=between(1800,5000);
    if((this.flick-=delta)<-320)this.flick=between(1500,4500);
    this.image.setTexture(`cat-${this.pose}-${this.blink<0?'shut':playerX<headX?'l':'r'}-${this.flick<0?1:0}`);
  }
}
