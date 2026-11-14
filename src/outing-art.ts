/** Namiko's outing (outing.ts): its people, the serving robot and the musicians as sprites, and its two places, the shabu-shabu restaurant near Tachikawa Station and the vineyard up the road,
 * painted with the sights' painters (sight-scenes.ts `paintScene`), 480 × 320 art px each, in the street's three-quarter view. Art px × 2 = scene px. */
import Phaser from 'phaser';
import { paintCommuter } from './art';
import type { Look } from './people';
import { gradient, greens, paintScene, type Box, type Kit } from './sight-scenes';

/** Namiko and her daughter, dressed as the commuters are (people.ts), in their portraits' colours. */
export const friendLooks:Record<'namiko'|'lilly',Look>={
  namiko:{coat:'#2f3f6e',legs:'#2a2a33',hair:'#1e1b26',style:'long',skirt:'#e8e2cf',bag:'#c9873e',height:.95},
  lilly:{coat:'#e88aa8',legs:'#f4f1ea',hair:'#1e1b26',style:'ponytail',skirt:'#f0c040',height:.6,pace:1.1},
};
/** The musicians under the vines: a guitarist, a violinist and a singer at her microphone. */
const players:Look[]=[
  {coat:'#3a5a7a',legs:'#2a2a30',hair:'#2a2420',style:'short'},
  {coat:'#7a2e3a',legs:'#2a2a30',hair:'#1a1614',style:'bun',skirt:'#2a2a30'},
  {coat:'#e8d8a8',legs:'#5a4a3a',hair:'#6a3e22',style:'long',skirt:'#6a8a5a'},
];

/** The restaurant's tables, centre and top edge of each (art px): two rows of three, booths of four. Ours is the middle one of the far row, clear of the talk box along the screen's foot. */
export const shabuTables:[number,number][]=[[150,140],[250,140],[350,140],[150,220],[250,220],[350,220]];
export const ourTable=shabuTables[1];
/** The soft-serve machine at the end of the vegetable bar, and the door in the left wall (art px). */
export const softServe:Box=[446,66,24,40];
export const shabuDoor:Box=[0,248,8,44];
export const shabuSolids:Box[]=[[0,0,480,100],[0,0,8,248],[0,292,8,28],[472,0,8,320],[0,314,480,6],[18,96,96,8],[372,96,108,32],...shabuTables.map(([cx,top]):Box=>[cx-38,top-12,76,44])];
/** Where the robot waits by the kitchen's hatch, and the aisles it keeps to (art px). */
export const robotDock:[number,number]=[66,116];

/** The vineyard: the pergola's posts, the stage under it, the mats on the grass (ours first) and the juice stand (art px). */
export const vineStage:Box=[216,128,168,32];
export const vineMats:Box[]=[[216,174,68,20],[146,180,60,18],[304,178,64,18],[176,214,64,20],[300,216,60,20]];
export const vineTent:Box=[398,164,74,46];
export const vineSign:[number,number]=[16,262];
export const vineSolids:Box[]=[[0,0,128,134],[128,0,352,138],vineStage,vineTent];
export const musicians:[number,number][]=[[262,150],[300,148],[338,150]];
/** The bulbs strung along the pergola's front, lit at dusk (art px). */
export const vineBulbs:[number,number][]=Array.from({length:22},(_,i):[number,number]=>[136+i*16,121+Math.round(Math.sin(i*Math.PI/2.5)**2*3)]);

/** The sprites, once: Namiko and Lilly walking (`namiko-<face>-<frame>`), the robot (`robot-<frame>`, its eyes blinking), each musician playing (`musician-<k>-<frame>`), a soft-serve cone, and the plates on the table. */
export function makeOutingSprites(scene:Phaser.Scene){
  if(scene.textures.exists('robot-0'))return;
  const canvas=(key:string,w:number,h:number)=>{const t=scene.textures.createCanvas(key,w,h)!;const g=t.context;return {g,t,r:(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)}}};
  for(const [who,look] of Object.entries(friendLooks))for(const face of ['down','up','left','right'])for(let frame=0;frame<3;frame++){const {g,t}=canvas(`${who}-${face}-${frame}`,20,28);paintCommuter(g,look,face,frame);t.refresh()}
  // The robot, after the cat-faced ones that bring the plates in Japan's chain restaurants: three trays, a round head with ears, its face a screen.
  for(let frame=0;frame<2;frame++){
    const {r,t}=canvas(`robot-${frame}`,24,36);
    r(3,33,18,3,'#00000040');r(5,30,14,4,'#3a3e44');r(4,12,16,19,'#f2f2ee');r(4,12,1,19,'#ffffff');r(18,12,2,19,'#c8ccd0');
    for(const y of [14,20,26]){r(2,y,20,2,'#9aa0a6');r(2,y,20,1,'#c8ccd0');r(6,y-2,5,2,'#e8e4dc');r(6,y-2,5,1,'#c84a4a');r(13,y-2,5,2,'#e8e4dc');r(13,y-1,4,1,'#5f9a4a')}
    r(5,2,14,10,'#f2f2ee');r(5,0,3,3,'#f2f2ee');r(16,0,3,3,'#f2f2ee');r(6,1,1,1,'#f0a0b0');r(17,1,1,1,'#f0a0b0');r(6,4,12,7,'#1a1c22');
    if(frame){r(8,7,3,1,'#5ad8f0');r(13,7,3,1,'#5ad8f0')}else{r(8,6,3,3,'#5ad8f0');r(13,6,3,3,'#5ad8f0');r(9,6,1,1,'#ffffff');r(14,6,1,1,'#ffffff')}
    r(11,9,2,1,'#f0a0b0');t.refresh();
  }
  // The musicians, two frames each: the strum, the bow, the singer's breath.
  players.forEach((look,k)=>{for(let frame=0;frame<2;frame++){
    const {g,r,t}=canvas(`musician-${k}-${frame}`,20,28);paintCommuter(g,look,'down',0);
    if(k===0){r(5,15,9,6,'#a0602e');r(6,16,7,4,'#c07a3a');r(8,17,3,2,'#3a2418');r(13,13,6,2,'#5a3a22');r(18,12,2,2,'#3a2418');r(9,frame?14:17,3,2,'#e9c4a0')}
    else if(k===1){r(3,11,5,4,'#8a3e1e');r(4,11,3,1,'#b0602e');const y=frame?9:14;for(let i=0;i<10;i++)r(5+i,y+Math.round(i*(frame?.6:-.3)),1,1,'#d8c8a0');r(15,frame?14:11,2,2,'#e9c4a0')}
    else{r(10,14,1,13,'#4a4a50');r(8,26,5,1,'#4a4a50');r(9,10,3,4,'#2a2a30');r(9,10,3,1,'#8a8a90');if(frame)r(10,11,1,1,'#7a2a2a');r(frame?14:13,frame?9:14,2,2,'#e9c4a0')}
    t.refresh();
  }});
  {const {r,t}=canvas('cone',6,10);r(1,0,4,2,'#fbf6ea');r(0,2,6,2,'#f4ecd8');r(1,1,1,1,'#ffffff');r(1,4,4,2,'#d8a258');r(2,6,2,2,'#c88e48');r(2,8,1,1,'#b07a3a');for(const [x,y] of [[1,4],[3,5],[2,6]])r(x,y,1,1,'#a8703a');t.refresh()}
  {const {r,t}=canvas('plate-meat',14,8);r(0,2,14,5,'#1e1e22');r(1,1,12,1,'#2e2e34');for(let i=0;i<4;i++){r(2+i*3,2,3,4,i%2?'#e07a8a':'#c8505e');r(2+i*3,2,3,1,'#f4c0c8')}r(1,7,12,1,'#00000040');t.refresh()}
  {const {r,t}=canvas('plate-veg',14,8);r(0,2,14,5,'#c8a868');r(1,1,12,1,'#e0c888');r(2,2,4,3,'#8ac060');r(6,2,3,3,'#f08a3a');r(9,2,3,3,'#f4f0e0');r(3,4,8,2,'#5a9a4a');r(1,7,12,1,'#00000040');t.refresh()}
  {const {r,t}=canvas('plate-empty',14,8);r(0,2,14,5,'#1e1e22');r(1,1,12,1,'#2e2e34');r(3,3,8,2,'#2a2a30');r(5,3,2,1,'#c8505e60');r(1,7,12,1,'#00000040');t.refresh()}
  {const {r,t}=canvas('note',6,8);r(3,0,1,6,'#2a2420');r(4,0,2,1,'#2a2420');r(5,1,1,2,'#2a2420');r(0,5,4,3,'#2a2420');r(1,5,2,1,'#5a5048');t.refresh()}
}

/** A diner at another table, painted: facing us from the far side (their head and shoulders over the table), or their back to us on the near stools. */
const diner=(k:Kit,x:number,y:number,far:boolean,coat:string,hair:string,skin='#e9c4a0')=>{
  if(far){k.r(x-5,y-10,11,10,coat);k.r(x-6,y-8,1,6,coat);k.r(x+5,y-8,1,6,coat);k.r(x-3,y-18,8,8,skin);k.r(x-4,y-20,10,4,hair);k.r(x-4,y-17,1,3,hair);k.r(x+5,y-17,1,3,hair);k.r(x-1,y-14,1,1,'#283e40');k.r(x+2,y-14,1,1,'#283e40')}
  else{k.r(x-6,y-12,12,12,coat);k.r(x-6,y-12,1,12,'#ffffff20');k.r(x-4,y-21,9,9,hair);k.r(x-4,y-13,9,1,skin)}
};

/** The shabu-shabu restaurant, all you can eat for ninety minutes: the kitchen's hatch where the robot loads its trays at the back on the left, the dark wood wall and its banner,
 * the vegetable bar and the soft-serve machine on the right, six tables with their split pots (a plain broth and a red one), the door in the left wall. */
export function makeShabu(scene:Phaser.Scene){
  paintScene(scene,'shabu',480,320,k=>{
    const {r,text,ell,shade}=k;
    // The floor's boards, the walls.
    r(0,96,480,224,'#a9825a');for(let y=100;y<320;y+=8){r(0,y,480,1,'#8e6a46');for(let x=(y*7)%40;x<480;x+=40+k.int(30))r(x,y,1,8,'#8e6a46')}for(let i=0;i<260;i++)r(k.int(480),100+k.int(220),3,1,'#b8926a');
    r(0,0,480,98,'#5e4232');for(let x=0;x<480;x+=12){r(x,30,1,66,'#4e3426');r(x+1,30,1,66,'#6e5040')}r(0,54,480,3,'#3e2a1e');r(0,92,480,6,'#3a2a20');r(0,92,480,1,'#7a5a46');
    r(0,96,8,224,'#5e4232');r(472,96,8,224,'#5e4232');r(7,96,1,224,'#3a2a20');r(472,96,1,224,'#3a2a20');
    // The banner: しゃぶしゃぶ, all you can eat for 90 minutes.
    r(186,36,108,30,'#2a1a14');r(188,38,104,26,'#b8322a');r(188,38,104,2,'#d8524a');text(210,40,'しゃぶしゃぶ','#fbf3e0');text(214,56,'食べ放題 90分','#f8d878',false);
    // The menu's pictures either side of it: marbled beef, pork, the vegetables.
    for(const [x,c] of [[130,'#c8505e'],[304,'#e88a96'],[350,'#8ac060']] as const){r(x,40,36,26,'#efe4c8');r(x+2,42,32,16,'#1e1e22');for(let i=0;i<5;i++)r(x+4+i*6,44,5,11,i%2?c:'#f4c0c8');r(x+4,60,28,3,'#b8322a')}
    // The kitchen's hatch: its noren, the steel counter the robot is loaded from, the cooks beyond.
    r(18,36,96,58,'#2a2220');r(22,44,88,40,'#3e3430');diner(k,46,80,true,'#f4f4ee','#f4f4ee');diner(k,86,80,true,'#f4f4ee','#1a1614');
    r(18,36,96,16,'#2c3c6a');for(let x=18;x<114;x+=24)r(x+23,36,1,16,'#1e2a4a');text(52,40,'厨房','#f4f1ea');r(16,88,100,8,'#b8bcbc');r(16,88,100,1,'#e0e4e4');r(16,95,100,1,'#7a7e80');
    r(robotDock[0]-12,robotDock[1]+6,24,3,'#e0c050');r(robotDock[0]-12,robotDock[1]+6,24,1,'#f8e070');
    // The vegetable bar, under its sneeze guard, and the soft-serve machine at its end with its cones.
    r(372,74,72,24,'#c8ccd0');r(372,74,72,1,'#ffffff');r(374,62,68,2,'#a8c8d8');r(374,64,1,12,'#a8c8d8');r(441,64,1,12,'#a8c8d8');text(392,56,'野菜バー','#f8e8c8',false);
    for(const [i,c,d] of [[0,'#a8d070','#7aa848'],[1,'#f08a3a','#c86a28'],[2,'#f4f0e0','#d8d0bc'],[3,'#c8a070','#a07a50'],[4,'#5a9a4a','#3a7a3a'],[5,'#f0d878','#c8b058']] as const){r(376+i*11,78,10,8,'#ffffff');r(377+i*11,79,8,6,c);for(let n=0;n<5;n++)r(377+i*11+k.int(7),79+k.int(5),1,1,d)}
    r(372,98,72,30,'#8a6a50');r(372,98,72,2,'#a8886a');for(let x=380;x<440;x+=16)r(x,102,12,22,'#7a5a42');
    {const [x,y,w,h]=softServe;shade(x-2,y+h,w+4,3);r(x,y+20,w,h-20,'#b8bcc0');r(x,y,w,22,'#d8dcdc');r(x,y,w,1,'#ffffff');r(x+2,y+3,w-4,8,'#e86a8a');text(x+4,y+4,'ソフト','#ffffff',false);r(x+9,y+14,6,4,'#8a8e92');r(x+11,y+18,2,3,'#6a6e72');r(x+4,y+24,w-8,1,'#8a8e92');
      for(let i=0;i<3;i++){r(x+3+i*6,y+30,4,6,'#d8a258');r(x+4+i*6,y+36,2,2,'#c88e48')}r(x+w-3,y+22,2,14,'#9a9ea2')}
    // The tables: two cushioned stools a side, the dark wood top, its split pot in the middle (the plain broth and the red), the dishes of sauce and the chopsticks.
    const coats=['#3a5a7a','#c25b4a','#6f8a5a','#e8e2cf','#7d6a8f','#2d3a4a','#c9b38a','#d98fa0'],hairs=['#1f1c1a','#4a3426','#b5b5ae','#7a5236','#141414'];
    shabuTables.forEach(([cx,top],i)=>{
      for(const dx of [-22,10]){r(cx+dx,top-10,12,8,'#3a2c26');r(cx+dx,top-10,12,3,'#a8392e')}
      // Who is already eating: none at ours.
      if(i!==1)for(const [dx,far] of [[-16,true],[16,true],[-16,false],[16,false]] as const)if(k.int(10)<(far?7:5)&&(far||i<3||k.int(2)))if(far)diner(k,cx+dx,top+1,true,coats[k.int(coats.length)],hairs[k.int(hairs.length)]);
      shade(cx-34,top+22,72,4);r(cx-36,top,72,18,'#6a4a34');r(cx-36,top,72,1,'#8a6448');r(cx-36,top+18,72,4,'#4a3224');
      ell(cx,top+9,12,6,'#c8c8c8');ell(cx,top+9,10,5,'#d8b070');k.g.save();k.g.beginPath();k.g.rect(cx,top,12,18);k.g.clip();ell(cx,top+9,10,5,'#c8503a');k.g.restore();r(cx,top+4,1,10,'#a8a8a8');
      for(const dx of [-30,-24,20,26])r(cx+dx,top+12,4,3,'#f4f0e0');for(const dx of [-28,22]){r(cx+dx,top+4,1,6,'#c8a06a');r(cx+dx+2,top+4,1,6,'#c8a06a')}
      if(i!==1)for(let n=0;n<2;n++)if(k.int(3))r(cx-28+k.int(20)+n*30,top+4,8,4,k.int(2)?'#c8505e':'#8ac060');
      for(const dx of [-22,10]){r(cx+dx,top+24,12,6,'#3a2c26');r(cx+dx,top+24,12,2,'#a8392e')}
      if(i!==1&&i>=3)for(const dx of [-16,16])if(k.int(10)<5)diner(k,cx+dx,top+30,false,coats[k.int(coats.length)],hairs[k.int(hairs.length)]);
    });
    // The door in the left wall, its noren, and a pot plant by it.
    {const [,y,,h]=shabuDoor;r(0,y-4,10,h+6,'#3a2a20');r(0,y,8,h,'#d8c8a0');for(let yy=y+4;yy<y+h;yy+=6)r(0,yy,8,1,'#a8987a');r(0,y,8,10,'#2c3c6a');r(8,y-4,2,h+6,'#2a1e16')}
    shade(14,232,14,3);r(15,222,12,10,'#8a5a3a');k.tree(21,206,greens[1],8,7);
  });
}

/** The vineyard up the road: a winery's shed on the left, its vines on a high pergola as Japanese vineyards grow them, the bunches hanging under the leaves, a little stage beneath and bulbs strung along its front,
 * the lawn with the audience's mats, the juice and wine stand on the right, and the sign back to the station by the path in. */
export function makeVineyard(scene:Phaser.Scene){
  paintScene(scene,'vineyard',480,320,k=>{
    const {r,text,shade,ell}=k;
    gradient(r,0,0,480,80,'#8ec0de','#d8ecf0',6);
    k.ridge(84,[[60,24,70],[200,14,60],[330,30,90],[460,18,60]],'#7a9a78','#6a8a68');k.ridge(96,[[120,10,60],[280,8,80],[420,12,60]],'#5f8a5a','#4f7a4a',2);
    k.lawn(0,96,480,224,'#8ab05e');
    // The path in from the road, past the sign.
    for(let i=0;i<40;i++){const t=i/39,x=t*150,y=318-t*70;k.ground(x-14,y-6,30,14,'#c8b898','#b0a080',8)}
    // The winery's shed: dark weatherboards, its roof, the sign, its door open on barrels.
    shade(12,128,112,4);r(14,72,104,56,'#6a4a32');for(let y=74;y<128;y+=5)r(14,y,104,1,'#5a3e2a');r(10,62,112,12,'#3e4446');for(let x=12;x<122;x+=5)r(x,64,1,9,'#2e3436');r(8,72,116,2,'#2a2e30');
    r(30,78,46,14,'#efe2c0');r(30,78,46,1,'#ffffff');text(38,80,'ぶどう園','#5a2a5a');r(84,92,24,36,'#2a2018');for(const x of [87,97]){r(x,112,9,14,'#8a5a32');r(x,115,9,1,'#5a3a22');r(x,122,9,1,'#5a3a22')}
    k.night(()=>{r(84,92,24,36,'#f2cf7c')});
    for(const [x,y] of [[22,118],[40,120]] as const){r(x,y,12,10,'#8a5a32');r(x,y+3,12,1,'#5a3a22');r(x,y+7,12,1,'#5a3a22');ell(x+6,y,6,2,'#a07040')}
    // The pergola: its posts, the shade under it, the canopy of leaves, wires, and the bunches hanging below.
    r(128,110,352,30,'#5f7a48');for(let i=0;i<300;i++)r(128+k.int(352),110+k.int(30),2,1,k.int(2)?'#6e8a54':'#506a3e');
    for(const x of [136,196,256,316,376,436])for(const y of [100,138]){shade(x-2,y+2,8,2);r(x,y-36,4,36,'#8a6a4a');r(x,y-36,1,36,'#a8886a')}
    for(let y=48;y<118;y+=4)for(let x=124;x<480;x+=4){const t=k.int(10);r(x,y+k.int(3),5,4,t<3?'#3e6a3a':t<6?'#4f7d44':t<8?'#67954e':'#86b060')}
    for(let i=0;i<120;i++)r(128+k.int(350),50+k.int(64),3,2,'#a8c87040');r(124,116,356,2,'#3a5a32');
    for(let x=132;x<476;x+=9+k.int(8)){const y=116+k.int(4),c=k.int(5)?['#4a2a5a','#6a3a7a','#8a5a9a']:['#7a9a40','#9ab850','#c0d878'];for(let row=0;row<5;row++)for(let n=0;n<4-Math.floor(row*.8);n++)r(x+n*2-row*.5+(row%2),y+row*2,2,2,c[(n+row)%3]);r(x+2,y-2,1,2,'#5a4a2a')}
    // The bulbs strung along its front, drawn lit at night.
    for(let i=0;i<vineBulbs.length-1;i++)k.line(...vineBulbs[i],...vineBulbs[i+1],'#2a2a2a');for(const [x,y] of vineBulbs){r(x,y+1,2,3,'#e8e0c0');k.night(()=>r(x-1,y,4,5,'#fff2b0'))}
    // The stage under it: boards, the speakers either side, the banner on its front.
    {const [x,y,w,h]=vineStage;shade(x+2,y+h+4,w,4);r(x,y,w,h,'#a0784e');for(let yy=y+3;yy<y+h;yy+=4)r(x,yy,w,1,'#8a6440');r(x,y+h,w,6,'#7a5638');r(x,y,w,1,'#c09a6a');
      for(const sx of [x+4,x+w-16]){r(sx,y-12,12,18,'#2a2a2e');ell(sx+6,y-6,4,4,'#4a4a50');ell(sx+6,y+1,3,2,'#4a4a50')}
      r(x+44,y+h+1,80,5,'#efe2c0');text(x+50,y+h+1,'ぶどう棚コンサート','#7a2a5a',false)}
    // The juice and wine stand: its striped awning, the bottles, the glasses.
    {const [x,y,w,h]=vineTent;shade(x+2,y+h,w,4);r(x+2,y+14,w-4,h-14,'#e8dcc0');r(x+2,y+30,w-4,h-30,'#c8b898');for(let i=0;i<w;i+=8){r(x+i,y,4,14,'#c8303a');r(x+i+4,y,4,14,'#f4f1ea')}r(x,y+14,w,2,'#8a1e2a');
      for(let i=0;i<7;i++){r(x+8+i*8,y+20,3,9,i%2?'#4a1a3a':'#6a3a7a');r(x+9+i*8,y+18,1,2,'#2a2a2a')}text(x+10,y+32,'ジュース・ワイン','#5a2a2a',false);k.night(()=>r(x+4,y+16,w-8,14,'#ffe8a8'))}
    // The mats on the lawn.
    for(const [x,y,w,h] of vineMats){r(x,y,w,h,'#3a78c2');r(x,y,w,1,'#6a9ae0');for(let xx=x+6;xx<x+w;xx+=12)r(xx,y,1,h,'#2a62a8');shade(x,y+h,w,2)}
    // A few rows of vines out in the sun beyond the lawn, at the bottom edge, and trees.
    for(const x of [446,470])k.tree(x,262,greens[k.int(3)],14,11);
    // The sign by the path, back to the station.
    {const [x,y]=vineSign;shade(x+6,y+23,10,2);r(x+8,y+14,3,10,'#5b4a38');r(x,y,42,14,'#3d2e24');r(x+1,y+1,40,12,'#efe2c0');text(x+3,y+2,'立川駅','#3d2e24',false);text(x+3,y+7,'STATION','#3d2e24',false)}
  },[[84,92,24,36],[398,178,74,16],...vineBulbs.map(([x,y]):Box=>[x-1,y,4,5])]);
}
