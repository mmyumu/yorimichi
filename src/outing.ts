/** Namiko's outing: asked on the phone, she gives the traveller a time to meet her and her daughter Lilly in front of Tachikawa Station; they lead the way to a shabu-shabu restaurant,
 * all you can eat, a robot bringing the plates; at the end Lilly wants an ice cream, and if the traveller fetches her one from the soft-serve machine, they all walk up to a vineyard
 * where a little concert plays under the vines. Its places are drawn in outing-art.ts, its music in concert.ts; main.ts runs it (`Journey.outing`).
 * Only `NamikoPlan` is kept, in the phone's save: the outing itself starts again in front of the station after a reload. */
import Phaser from 'phaser';
import { minuteOfDay, minutes } from './clock';
import { phoneLines } from './outing-lines';

/** A friend's side of the phone's save (Namiko's, Jennifer's): not asked yet, asked (the answer on its way), a meeting at `at` (game minutes) in front of their station, or done. */
export interface NamikoPlan {state:'none'|'asked'|'meet'|'done';at?:number}
export type Plan=NamikoPlan;
export const askNamiko=phoneLines.ask;
/** An invitation's terms: the station whose west exit they wait at, the time of day they suggest (`first`, minutes), until when a time the same day is still offered (`latest`: an hour from now on the half hour),
 * and until when they wait (`until`). Namiko: lunch at noon, waiting until 21:00; Jennifer (dinner.ts): dinner at 18:30, waiting until 22:30. */
export interface Invite {meetAt:string;first:number;latest:number;until:number}
export const lunch:Invite={meetAt:'tachikawa',first:12*60,latest:15*60,until:21*60};
/** The station she meets the traveller at, outside its west exit. */
export const meetAt=lunch.meetAt;
/** The time suggested: `first` today while there is an hour to go before it, else an hour from now on the half hour until `latest`, else `first` the next day. */
export function meetingFrom(now=minutes(),invite=lunch){const day=now-minuteOfDay(now),d=minuteOfDay(now);if(d<invite.first-60)return day+invite.first;return d<invite.latest?day+Math.ceil((d+60)/30)*30:day+1440+invite.first}
/** Until when they wait that day. */
export const waitsUntil=(at:number,invite=lunch)=>at-minuteOfDay(at)+invite.until;
/** Whether they are waiting in front of the station: from half an hour before the time until `until`. */
export const waiting=(at:number,now=minutes(),invite=lunch)=>now>=at-30&&now<waitsUntil(at,invite);
export const missed=(at:number,now=minutes(),invite=lunch)=>now>=waitsUntil(at,invite);

type Face='up'|'down'|'left'|'right';
/** Someone of the outing walking where they are told (`go`, along points in scene px, ignoring the solids: they know the way), standing, sitting behind a table (only what shows above it),
 * or hopping on the spot (`dance`). Their frames are `<key>-<face>-<frame>`, 20 × 28 as the commuters'. */
export class Walker {
  image:Phaser.GameObjects.Image;private path:{x:number;y:number}[]=[];private then?:()=>void;private walk=0;private hop?:Phaser.Tweens.Tween;private base=0;
  constructor(private scene:Phaser.Scene,world:Phaser.GameObjects.Container,private key:string,x:number,y:number,private scale:number,public face:Face='down',private speed=.11){
    this.image=scene.add.image(x,y,`${key}-${face}-0`).setOrigin(.5,.85).setScale(scale);world.add(this.image);
  }
  get x(){return this.image.x}
  get y(){return this.image.y}
  get moving(){return this.path.length>0}
  go(points:[number,number][],then?:()=>void){this.stand();this.path=points.map(([x,y])=>({x,y}));this.then=then}
  turn(face:Face){this.face=face;this.image.setTexture(`${this.key}-${face}-0`)}
  /** Seated, facing `face`, the frame cut below its `rows` top rows, which end at `edge` (scene px): the table's edge or the stool. */
  sit(x:number,edge:number,face:Face,rows=19){this.path=[];this.turn(face);this.image.setCrop(0,0,20,rows).setPosition(x,edge-rows*this.scale+.85*28*this.scale)}
  stand(){this.image.setCrop();if(this.hop){this.hop.remove();this.hop=undefined;this.image.setY(this.base)}}
  dance(on:boolean){if(on===!!this.hop)return;if(!on){this.stand();return}this.base=this.image.y;this.hop=this.scene.tweens.add({targets:this.image,y:this.base-8,duration:220,yoyo:true,repeat:-1,onYoyo:()=>this.turn(this.face==='left'?'right':'left')})}
  update(delta:number){
    const to=this.path[0];if(!to)return;
    const dx=to.x-this.image.x,dy=to.y-this.image.y,d=Math.hypot(dx,dy),step=this.speed*delta;
    if(d<=step){this.image.setPosition(to.x,to.y);this.path.shift();if(!this.path.length){this.image.setTexture(`${this.key}-${this.face}-0`);const then=this.then;this.then=undefined;then?.()}return}
    this.face=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';this.walk+=delta;
    this.image.setPosition(this.image.x+dx/d*step,this.image.y+dy/d*step).setTexture(`${this.key}-${this.face}-${Math.floor(this.walk/90)%3}`);
  }
  destroy(){this.hop?.remove();this.image.destroy()}
}

/** The serving robot: from its spot by the kitchen's hatch (`dock`), along the lane beneath it (`lane`, its y), down the side aisle and along the middle one (`aisle`) to a table and back, waiting there a moment;
 * its eyes blink now and then. It serves the other tables (`stops`) by itself, and the one it is sent to (`deliver`) once back from its round, `arrived` running as it gets there. All in scene px. */
type Stop={x:number;y:number;wait?:number;arrive?:()=>void};
export class Robot {
  image:Phaser.GameObjects.Image;private path:Stop[]=[];private blink=0;private next:{at:[number,number];arrived:()=>void}|null=null;
  constructor(scene:Phaser.Scene,world:Phaser.GameObjects.Container,private dock:[number,number],private lane:number,private aisle:{x:number;y:number},private stops:[number,number][]){
    this.image=scene.add.image(dock[0],dock[1],'robot-0').setOrigin(.5,.92).setScale(2);world.add(this.image);this.path=[{x:dock[0],y:dock[1],wait:1500+Math.random()*3000}];
  }
  private trip([x,y]:[number,number],arrive?:()=>void):Stop[]{const [dx,dy]=this.dock,{x:ax,y:ay}=this.aisle,l=this.lane;return [{x:dx,y:l},{x:ax,y:l},{x:ax,y:ay},{x,y:ay},{x,y,wait:arrive?5000:2500,arrive},{x,y:ay},{x:ax,y:ay},{x:ax,y:l},{x:dx,y:l},{x:dx,y:dy,wait:1200}]}
  deliver(at:[number,number],arrived:()=>void){this.next={at,arrived}}
  update(delta:number){
    this.blink-=delta;if(this.blink<0){const shut=this.image.texture.key==='robot-0';this.image.setTexture(shut?'robot-1':'robot-0');this.blink=shut?140:2000+Math.random()*3000}
    if(!this.path.length){const next=this.next;this.next=null;this.path=next?this.trip(next.at,next.arrived):this.trip(this.stops[Math.floor(Math.random()*this.stops.length)]);return}
    const to=this.path[0],dx=to.x-this.image.x,dy=to.y-this.image.y,d=Math.hypot(dx,dy),step=.09*delta;
    if(d>step){this.image.setPosition(this.image.x+dx/d*step,this.image.y+dy/d*step);return}
    this.image.setPosition(to.x,to.y);if(to.arrive){const arrive=to.arrive;to.arrive=undefined;arrive()}
    if((to.wait??0)>0){to.wait!-=delta;return}
    this.path.shift();
  }
}
