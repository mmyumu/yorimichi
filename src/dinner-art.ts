/** Jennifer's dinner (dinner.ts): the yakiniku near Miyamaedaira Station, 480 × 320 art px in the street's three-quarter view, painted with the sights' painters (sight-scenes.ts `paintScene`),
 * and its sprites: the cuts sizzling on the grill, a puff of smoke, the plates. Art px × 2 = scene px. Its tables stand where the shabu-shabu's do (outing-art.ts), so the same seating works. */
import Phaser from 'phaser';
import { diner } from './outing-art';
import { greens, paintScene, type Box } from './sight-scenes';

/** The tables, centre and top edge of each (art px): two rows of three, a round grill set in each. Ours is the middle one of the far row. */
export const yakiTables:[number,number][]=[[150,140],[250,140],[350,140],[150,220],[250,220],[350,220]];
export const yakiTable=yakiTables[1];
/** The door in the left wall, the kitchen's hatch the waiter comes out of, the drink bar on the right (art px). */
export const yakiDoor:Box=[0,248,8,44];
export const kitchen:[number,number]=[66,116];
export const drinkBar:Box=[384,70,88,30];
export const yakiSolids:Box[]=[[0,0,480,100],[0,0,8,248],[0,292,8,28],[472,0,8,320],[0,314,480,6],[18,96,96,8],[380,96,100,32],...yakiTables.map(([cx,top]):Box=>[cx-38,top-12,76,44])];

/** The sprites, once: each cut on the grill (`grill-<k>`, 10 × 6), a puff of smoke, the plates of raw meat and the empty one. */
export function makeDinnerSprites(scene:Phaser.Scene){
  if(scene.textures.exists('grill-0'))return;
  const canvas=(key:string,w:number,h:number)=>{const t=scene.textures.createCanvas(key,w,h)!;const g=t.context;return {t,r:(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)}}};
  // Kalbi, skirt, pork jowl, tongue, a pepper's slice: browned along their edges, the grate's lines across them.
  [['#b8323a','#7a2a1e','#f4d4cc'],['#8a2a2a','#5a1a14','#a83a3a'],['#f0b4b0','#b8804a','#fbecec'],['#d89a90','#a06a50','#f0c8c0'],['#4a9a3a','#2a6a2a','#8ad070']].forEach(([meat,brown,fat],k)=>{
    const {r,t}=canvas(`grill-${k}`,10,6);r(0,0,10,6,brown);r(1,1,8,4,meat);r(2,2,4,1,fat);r(0,2,10,1,'#2a1a14');r(0,4,10,1,'#3a2418');t.refresh();
  });
  {const {r,t}=canvas('smoke',8,8);r(2,0,4,8,'#e8e8e8a0');r(0,2,8,4,'#e8e8e8a0');r(1,1,6,6,'#f4f4f4c0');r(2,2,3,2,'#ffffffd0');t.refresh()}
  {const {r,t}=canvas('plate-yaki',16,9);r(0,2,16,6,'#e8e4dc');r(1,1,14,1,'#ffffff');for(let i=0;i<4;i++){r(2+i*3,2,3,4,i%2?'#b8323a':'#d84a52');r(2+i*3,3,3,1,'#f4d4cc')}r(12,2,3,4,'#8ad070');r(1,8,14,1,'#00000040');t.refresh()}
  {const {r,t}=canvas('plate-done',16,9);r(0,2,16,6,'#e8e4dc');r(1,1,14,1,'#ffffff');r(3,4,6,1,'#b8323a60');r(10,3,3,1,'#5a3a2060');r(1,8,14,1,'#00000040');t.refresh()}
  {const {r,t}=canvas('mug',6,9);r(0,1,5,8,'#f0c040');r(0,0,5,2,'#ffffff');r(5,3,1,4,'#e8e4dc');r(1,3,1,5,'#f8d870');t.refresh()}
}

/** The yakiniku, all you can eat for ninety minutes: its dark walls and red lanterns, the menu's boards, the kitchen's hatch at the back on the left, the drink bar on the right,
 * six tables with their round grill set in the middle and the tablet to order on, the door in the left wall. Smoke goes down into the grills: no hoods over the tables. */
export function makeYakiniku(scene:Phaser.Scene){
  paintScene(scene,'yakiniku',480,320,k=>{
    const {r,text,ell,shade}=k;
    // The floor's dark tiles, the walls.
    r(0,96,480,224,'#4a3e36');for(let y=96;y<320;y+=12){r(0,y,480,1,'#3a3028');for(let x=(y/12%2)*12;x<480;x+=24)r(x,y,1,12,'#3a3028')}for(let i=0;i<200;i++)r(k.int(480),100+k.int(220),2,1,'#56483e');
    r(0,0,480,98,'#2e2420');for(let x=0;x<480;x+=16){r(x,24,1,70,'#241c18');r(x+1,24,1,70,'#3a2e28')}r(0,20,480,4,'#1a1412');r(0,92,480,6,'#1e1612');r(0,92,480,1,'#5a4434');
    r(0,96,8,224,'#2e2420');r(472,96,8,224,'#2e2420');r(7,96,1,224,'#1a1412');r(472,96,1,224,'#1a1412');
    // Red lanterns along the top of the wall.
    for(let x=130;x<380;x+=40){r(x+5,6,1,6,'#1a1412');r(x,12,11,13,'#c8302a');r(x+1,13,9,11,'#e04a3a');r(x,15,11,1,'#a02020');r(x,21,11,1,'#a02020');r(x+2,10,7,2,'#1a1412');r(x+2,25,7,2,'#1a1412')}
    // The banner: 焼肉, all you can eat for 90 minutes; the menu's boards either side.
    r(180,32,120,32,'#120c0a');r(182,34,116,28,'#f4ead0');r(182,34,116,2,'#ffffff');text(220,36,'焼肉','#b8202a');text(208,52,'食べ放題 90分','#3a2a20',false);
    for(const [x,c] of [[124,'#b8323a'],[312,'#8a2a2a'],[350,'#f0b4b0']] as const){r(x,40,32,24,'#d8c8a0');r(x+2,42,28,14,'#1e1a18');for(let i=0;i<4;i++){r(x+4+i*6,45,5,8,c);r(x+4+i*6,47,5,1,'#f4d4cc')}r(x+4,58,24,3,'#3a2a20')}
    // The kitchen's hatch, its noren, the cooks beyond, the counter.
    r(18,36,96,58,'#1a1412');r(22,44,88,40,'#3a2c26');diner(k,46,80,true,'#f4f4ee','#141414');diner(k,86,80,true,'#1e1e22','#141414');
    r(18,36,96,16,'#b8202a');for(let x=18;x<114;x+=24)r(x+23,36,1,16,'#801818');text(52,40,'厨房','#f4f1ea');r(16,88,100,8,'#b8bcbc');r(16,88,100,1,'#e0e4e4');r(16,95,100,1,'#7a7e80');
    // The drink bar: the machine's lit panel, glasses, the jugs of oolong tea.
    {const [x,y,w,h]=drinkBar;r(x-4,y-14,w+8,h+14,'#3a2e28');r(x,y-10,40,24,'#d8dcdc');r(x+2,y-8,36,8,'#3a78c2');text(x+4,y-8,'ドリンク','#ffffff',false);for(let i=0;i<4;i++)r(x+4+i*9,y+4,6,6,['#c84a3a','#f0c040','#4a9a3a','#5a3a20'][i]);
      for(let i=0;i<5;i++){r(x+46+i*8,y,6,9,'#e8f0f4');r(x+47+i*8,y+4,4,4,'#c8a060')}r(x,y+18,w,h-18,'#5a4434');r(x,y+18,w,2,'#7a5a46');r(x,y+h,w,30,'#4a362a');for(let xx=x+6;xx<x+w;xx+=16)r(xx,y+h+4,12,22,'#3a2a20');shade(x-2,y+h+30,w+4,3)}
    // The tables: two cushioned stools a side, the dark top, the grill in the middle (its steel ring, the grate), the tablet, the sauce dishes, the tongs.
    const coats=['#3a5a7a','#c25b4a','#6f8a5a','#e8e2cf','#7d6a8f','#2d3a4a','#c9b38a','#d98fa0'],hairs=['#1f1c1a','#4a3426','#b5b5ae','#7a5236','#141414'];
    yakiTables.forEach(([cx,top],i)=>{
      for(const dx of [-22,10]){r(cx+dx,top-10,12,8,'#2a201c');r(cx+dx,top-10,12,3,'#8a2a22')}
      if(i!==1)for(const dx of [-16,16])if(k.int(10)<7)diner(k,cx+dx,top+1,true,coats[k.int(coats.length)],hairs[k.int(hairs.length)]);
      shade(cx-34,top+22,72,4);r(cx-36,top,72,18,'#3a2a22');r(cx-36,top,72,1,'#5a4434');r(cx-36,top+18,72,4,'#241a14');
      ell(cx,top+9,13,7,'#8a8e92');ell(cx,top+9,11,6,'#1a1a1e');for(let x=cx-10;x<=cx+10;x+=3)r(x,top+4,1,10,'#4a4a50');
      // Others' meat on their grills, the coals' glow under it.
      if(i!==1){for(let n=0;n<3;n++)r(cx-7+n*5+k.int(2),top+6+k.int(5),4,2,k.int(2)?'#a8323a':'#c87a5a');ell(cx,top+9,4,2,'#ff7a3a50')}
      r(cx+22,top+3,9,6,'#1e1e22');r(cx+23,top+4,7,4,'#5ab0e0');for(const dx of [-30,-24])r(cx+dx,top+11,5,4,'#e8e4dc');for(const dx of [-30,-24])r(cx+dx+1,top+12,3,2,'#5a2a14');r(cx-34,top+4,6,1,'#c8ccd0');r(cx-34,top+6,6,1,'#a8acb0');
      if(i!==1)r(cx+20,top+11,5,6,'#f0c040');
      for(const dx of [-22,10]){r(cx+dx,top+24,12,6,'#2a201c');r(cx+dx,top+24,12,2,'#8a2a22')}
      if(i>=3)for(const dx of [-16,16])if(k.int(10)<5)diner(k,cx+dx,top+30,false,coats[k.int(coats.length)],hairs[k.int(hairs.length)]);
    });
    // The door in the left wall, its noren, and a pot plant by it.
    {const [,y,,h]=yakiDoor;r(0,y-4,10,h+6,'#1a1412');r(0,y,8,h,'#c8b898');for(let yy=y+4;yy<y+h;yy+=6)r(0,yy,8,1,'#a8987a');r(0,y,8,10,'#b8202a');r(8,y-4,2,h+6,'#120c0a')}
    shade(14,232,14,3);r(15,222,12,10,'#6a4a3a');k.tree(21,206,greens[1],8,7);
  });
}
