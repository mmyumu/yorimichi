import Phaser from 'phaser';
import { hasShinkansen, machineKinds, platformFor, routes, stations, type Hub } from './network';
import { looks } from './people';

// Original pixel tiles painted on a 480 × 320 canvas, displayed at integer 2× scale.
/** A map canvas at twice the art's density, drawn in art coordinates: the art keeps its 2-px blocks while the lettering gets one screen pixel per dot. */
function mapCanvas(scene:Phaser.Scene,key:string,w:number,h:number){const texture=scene.textures.createCanvas(key,w*2,h*2)!;texture.context.scale(2,2);return texture}
/** Lettering in the PixelMplus10 bitmap font, whose outlines are whole pixels: 10px for small print (a dot per pixel of the canvas's full density, half an art px)
 * or `big` at 20px (a dot per art px, like the rest of the art). (x, y) is the top left of the text's cell, 5 art px high (10 if big), or its top centre or right with `g.textAlign`;
 * kanji and kana are as wide as the cell is high, Latin half that. */
function letter(g:CanvasRenderingContext2D,x:number,y:number,text:string,color:string,big=false){
  const px=big?20:10,font=`${px}px "Yorimichi Bitmap", "Yorimichi JP", monospace`,scratch=document.createElement('canvas'),c=scratch.getContext('2d')!;c.font=font;
  const w=Math.round(c.measureText(text).width);scratch.width=w;scratch.height=px;
  c.font=font;c.fillStyle=color;c.fillText(text,0,px*.9);
  // Keeps any anti-aliasing the fallback fonts bring out of the pixel art.
  const data=c.getImageData(0,0,w,px);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>110?255:0;c.putImageData(data,0,0);
  g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(scratch,Math.round(x*2-(g.textAlign==='center'?w/2:g.textAlign==='right'?w:0)),Math.round(y*2));g.restore();
}
const C={grass:'#92ad70',dark:'#344c42',leaf:'#497452',light:'#86a466',cream:'#efdbac',wood:'#806049',shadow:'#657756'};
export function makeArt(scene:Phaser.Scene){
  makeHubs(scene);
  makeCommuters(scene);
  makeJrStop(scene);
  for(const place of ['kamakura-trail','arashiyama']){
    const texture=mapCanvas(scene,'map-'+place,480,320);
    const g=texture.context;
    const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
    const text=(x:number,y:number,t:string,c='#f4e4b8')=>letter(g,x,y,t,c,true);
    let seed=173;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    const shadow=(x:number,y:number,w:number)=>{r(x+3,y,w,5,'#74855e');r(x+7,y+5,w-8,2,'#74855e')};
    const paving=(x:number,y:number,w:number,h:number)=>{
      r(x,y,w,h,'#c2b994');for(let yy=y;yy<y+h;yy+=8)for(let xx=x;xx<x+w;xx+=16){r(xx+(yy%16?0:4),yy,14,6,rand()>.6?'#d8cfad':'#cec5a4');r(xx,yy+7,16,1,'#b7ae8f')}
    };
    const tree=(x:number,y:number,pink=false)=>{
      shadow(x-17,y+18,40);r(x-3,y+6,7,21,'#69533f');r(x,y+7,2,18,'#ab8160');
      const palettes=pink?['#a86e7c','#c98596','#e9a6ad','#f6c7bb','#ffe0c8']:['#345d48','#487951','#63905b','#86a367','#afbc7b'];
      for(const [dx,dy,w,h,k] of [[-18,-10,36,23,0],[-23,-5,45,16,0],[-16,-21,33,35,1],[-8,-27,19,30,1],[-20,-9,21,17,2],[-10,-22,20,25,2],[2,-12,15,19,2],[-12,-20,11,8,3],[-19,-5,8,7,3],[3,-10,9,5,3],[-8,-21,5,3,4]])r(x+dx,y+dy,w,h,palettes[k]);
      for(let i=0;i<19;i++)r(x-17+Math.floor(rand()*34),y-18+Math.floor(rand()*27),2,2,palettes[Math.floor(rand()*4)]);
    };
    const roof=(x:number,y:number,w:number,h:number,color='#566f73')=>{
      r(x+5,y+h,w-2,6,'#3d4c4b');r(x,y+5,w,h,color);r(x+6,y,w-12,5,'#8ca09a');
      for(let yy=y+6;yy<y+h;yy+=5){r(x+2,yy,w-4,1,'#879991');for(let xx=x+4;xx<x+w-4;xx+=9)r(xx,yy-3,1,3,'#3f575b')}
      r(x-4,y+h-2,w+8,3,'#344c50');r(x,y+h+1,w,2,'#a2aaa0');
    };
    const window=(x:number,y:number,w=22,h=20)=>{r(x-2,y-2,w+4,h+4,'#8e7960');r(x,y,w,h,'#476e79');r(x+2,y+2,w-4,6,'#9ebcb4');r(x+3,y+8,2,h-10,'#6f9a9e');r(x+w/2,y,2,h,'#dac9a2');r(x,y+h/2,w,2,'#dac9a2')};
    const lantern=(x:number,y:number)=>{r(x+4,y-7,1,8,'#675342');r(x+1,y,8,12,'#a75144');r(x,y+2,10,8,'#dc8061');r(x+3,y+2,1,8,'#efb481');r(x+2,y-1,6,2,'#58493f');r(x+2,y+11,6,2,'#58493f')};
    const fence=(x:number,y:number,w:number)=>{r(x,y+5,w,3,'#aa9b75');r(x,y+13,w,2,'#ad9c73');for(let xx=x;xx<x+w;xx+=12){r(xx,y,3,21,'#796d53');r(xx,y,3,2,'#d8c393')}};
    const flowers=(x:number,y:number)=>{r(x,y+8,28,7,'#805d4a');r(x+1,y+8,26,2,'#ba8861');for(let i=0;i<6;i++){r(x+3+i*4,y+3,1,6,'#506e49');r(x+2+i*4,y+(i%2)*2,3,3,i%2?'#e9b5a4':'#edcf8f')}};
    const bench=(x:number,y:number)=>{shadow(x,y+12,43);r(x+3,y+7,3,12,'#4e5c51');r(x+35,y+7,3,12,'#4e5c51');for(let i=0;i<3;i++)r(x,y+i*3,43,2,'#ac8058');r(x-1,y+9,45,4,'#c19563');r(x,y+13,43,2,'#6c5843')};
    const lamp=(x:number,y:number)=>{r(x-3,y+39,8,3,'#5b6558');r(x,y,2,41,'#4c6156');r(x-5,y,12,3,'#45574f');r(x-4,y-7,10,7,'#ead5a0');r(x-5,y-9,12,2,'#4c6156');r(x,y-12,2,4,'#4c6156')};
    const camera=(x:number,y:number)=>{r(x+7,y+7,3,15,'#665c49');r(x,y,20,14,'#f1dfb6');r(x+3,y-3,7,3,'#e5c997');r(x+9,y+3,8,8,'#3e6871');r(x+11,y+5,4,4,'#9ec8c0');r(x+2,y+3,3,2,'#b66a51');r(x,y+13,20,2,'#a7916a')};
    r(0,0,480,320,C.grass);
    for(let i=0;i<2300;i++){const x=Math.floor(rand()*480),y=35+Math.floor(rand()*265);r(x,y,rand()>.7?2:1,1,['#86a36b','#9eb77a','#adc183'][i%3])}
    for(let i=0;i<85;i++){const x=Math.floor(rand()*480),y=40+Math.floor(rand()*240);r(x,y,1,3,'#6e925a');r(x-1,y-1,1,2,'#79975d')}
    paving(210,130,47,156);paving(56,192,338,32);
    for(let y=156;y<274;y+=15){r(218,y,30,10,'#b7b79a');r(221,y+1,24,7,'#d3cfac')}
    shadow(173,131,119);r(179,77,105,55,'#a3815b');r(185,83,93,45,'#d5bb87');for(let x=187;x<281;x+=14)r(x,86,3,44,'#785a44');
    roof(166,57,132,26);roof(180,47,105,10);r(219,100,28,31,'#514d3c');r(224,102,2,28,'#aa8560');r(239,102,2,28,'#aa8560');r(215,130,36,4,'#b9a780');lantern(196,93);lantern(266,93);
    for(let y=136;y<150;y+=4)r(173-(y-136)/2,y,122+(y-136),3,'#b1ac92');
    // Curved torii silhouette and stone lanterns.
    r(131,136,9,53,'#b45843');r(320,136,9,53,'#b45843');r(128,134,205,7,'#bb6349');r(123,130,215,5,'#48554b');r(126,128,13,3,'#48554b');r(322,128,13,3,'#48554b');r(137,147,187,4,'#b45843');r(225,136,7,17,'#9c4939');r(222,139,13,11,'#d4ba78');
    for(const x of [187,278]){r(x,174,5,18,'#8d9780');r(x-4,190,13,4,'#a9ad90');r(x-5,166,15,3,'#677b6c');r(x-2,169,9,6,'#d8c69a');r(x,171,5,3,'#6e7a62');r(x-1,160,7,5,'#a6ad8e')}
    for(const [x,y] of [[34,87],[89,118],[53,180],[380,100],[437,151],[415,250],[57,266],[142,281]])tree(x,y,place==='kamakura-trail');
    if(place==='arashiyama'){
      for(const base of [4,60,370,425])for(let i=0;i<8;i++){const x=base+i*5,y=95+(i%3)*12;r(x,y,3,95,'#59805a');r(x+1,y,1,95,'#a2b073');for(let yy=y+7;yy<y+90;yy+=13){r(x,yy,3,1,'#344f42');r(x-5,yy-4,7,2,'#668b59');r(x+2,yy+2,6,2,'#71965f')}}
      text(205,87,'嵐山','#edd7a4');
    }
    fence(18,229,134);fence(330,229,132);bench(272,248);flowers(302,238);lamp(98,225);
    for(let i=0;i<65;i++)r(105+Math.floor(rand()*270),180+Math.floor(rand()*101),2,1,'#efd1b3');
    r(328,107,30,47,'#807454');roof(324,101,38,7);text(333,112,'絵馬','#f2dfb5');for(let i=0;i<9;i++)r(332+(i%3)*7,124+Math.floor(i/3)*8,5,6,'#d2b17b');
    if(place!=='station'){
      r(58,172,3,23,'#786b4f');r(49,171,58,16,'#455e50');r(51,173,54,12,'#e1d0a1');text(53,174,'← STATION','#4b6152');camera(345,195);
      for(const [x,y] of [[8,309],[64,311],[182,311],[305,310],[380,312],[467,310]])tree(x,y,place==='kamakura-trail');
    }
    texture.refresh();
  }
  // 16×24 traveller sprite, four facings and three animation frames.
  for(const face of ['down','up','left','right'])for(let frame=0;frame<3;frame++){
    const t=scene.textures.createCanvas(`traveller-${face}-${frame}`,20,28)!;const g=t.context;
    const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
    const bob=frame===1?1:0;
    r(4,25,12,2,'#526952');
    r(6,20+bob,3,5-(frame===1?1:0),'#384d59');r(12,20+bob,3,5-(frame===2?1:0),'#384d59');r(5,24,4,2,'#594c44');r(12,24,4,2,'#594c44');
    r(5,12+bob,11,9,'#a65f4a');r(6,12+bob,9,7,'#d58b5c');r(4,14+bob,2,6,'#efc08b');r(16,14+bob,2,6,'#efc08b');r(7,8+bob,8,6,'#eac08d');r(6,6+bob,10,4,'#634d3e');
    if(face==='up'){r(7,10+bob,8,3,'#634d3e');r(7,14+bob,7,7,'#677e67');r(8,15+bob,5,3,'#9eab7c');r(8,19+bob,5,1,'#384f48')}
    else{r(face==='left'?7:face==='right'?14:8,10+bob,1,1,'#3b4541');if(face==='down')r(13,10+bob,1,1,'#3b4541');r(6,13+bob,1,7,'#785b42');r(14,13+bob,1,7,'#785b42')}
    r(5,4+bob,12,4,'#d6b77a');r(7,2+bob,8,4,'#f1d8a0');r(4,7+bob,14,2,'#efd4a0');r(7,6+bob,8,1,'#a47b52');
    t.refresh();
  }
}

/** A tiled concourse pillar cut by the ceiling, with the yellow 出口 sign of a Japanese station on its face; origin at its foot. */
function exitPillar(scene:Phaser.Scene,hub:Hub,side:'west'|'east'){
  const texture=mapCanvas(scene,`exit-pillar-${hub}-${side}`,30,64);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  r(0,0,30,64,'#e6e3cc');for(let y=7;y<64;y+=8)r(0,y,30,1,'#c9c4a6');for(let x=7;x<30;x+=8)r(x,0,1,64,'#c9c4a6');r(0,0,1,64,'#aeab94');r(29,0,1,64,'#aeab94');
  r(0,0,30,3,'#4c5852');r(0,58,30,6,'#aeb4b0');r(0,63,30,1,'#8b918d');
  const west=side==='west';r(1,9,28,34,'#f2c230');r(1,43,28,1,'#c9a020');
  r(west?15:3,11,12,12,'#1d2622');t(west?16:4,12,'出','#f2c230',true);t(west?3:17,12,west?'←':'→','#1d2622',true);
  g.textAlign='center';t(15,25,west?'西口':'東口','#1d2622',true);t(15,36,west?'West Exit':'East Exit','#1d2622');
  texture.refresh();
}
/** The concourse seen from above, laid out like the first-person ticket hall: the tiled wall with the fare map and the five machines at the back,
 * on the left the ticket office beside the central gates (local lines), set back; on the right the Shinkansen transfer gates, or a NewDays where the station has no Shinkansen.
 * In art px: office 0–62, central gates 62–130 (lanes at 79, 101, 123), machine wall 130–362, right block 362–480 (transfer lanes at 385, 407, 429, 451; shop door at 453).
 * main.ts (solids, hotspots, commuters) and hall-scene.ts (xAnchors) rely on these. */
function makeHubs(scene:Phaser.Scene){
  for(const hub of Object.keys(stations) as Hub[]){
    const station=stations[hub],texture=mapCanvas(scene,'map-'+hub,480,320);const g=texture.context;
    const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
    const t=(x:number,y:number,text:string,c='#e9dfbb',big=false)=>letter(g,x,y,text,c,big);
    const dither=(x:number,y:number,w:number,h:number,c:string)=>{for(let j=0;j<h;j++)for(let i=(j+x+y)%2;i<w;i+=2)r(x+i,y+j,1,1,c)};
    const tiles=(x:number,y:number,w:number,h:number,shade=false)=>{r(x,y,w,h,shade?'#c9c7b2':'#e6e3cc');for(let yy=y+7;yy<y+h;yy+=8)r(x,yy,w,1,shade?'#aeab94':'#c9c4a6');for(let xx=x+11;xx<x+w;xx+=12)r(xx,y,1,h,shade?'#aeab94':'#c9c4a6')};
    // Floor: the hall's olive checkerboard, and the ceiling edge with its fluorescent lights.
    r(0,35,480,285,'#74855e');for(let y=35;y<320;y+=16)for(let x=0;x<480;x+=16){r(x,y,8,8,'#6e7d5a');r(x+8,y+8,8,8,'#6e7d5a');r(x,y,16,1,'#66734f');r(x,y,1,16,'#66734f')}
    // Past the gates: the paid side's corridor running on towards the platforms, fading into the distance.
    const paid=(x:number,w:number)=>{
      tiles(x,23,w,23,true);r(x,44,w,26,'#74855e');for(let y=44;y<70;y+=8)for(let xx=x;xx<x+w;xx+=16)r(xx+(y/8%2?8:0),y,8,8,'#6e7d5a');
      for(let k=0;k<5;k++)dither(x,44+k*2,w,2,['#1d2622','#2b3431','#3d4846','#55625b','#68745b'][k]);r(x,44,w,3,'#1d2622');
    };
    // Automatic gates, 22 px apart: grey cabinets with a coloured stripe, a blue IC reader and the green arrow at the end facing the hall.
    const gates=(x0:number,count:number,stripe:string)=>{for(let i=0;i<count;i++){const x=x0+i*22;r(x+1,112,8,3,'#4f5a48');r(x,70,8,42,'#d5d8d0');r(x,70,8,3,'#3d4846');r(x+7,73,1,39,'#9aa29a');r(x,86,8,2,stripe);r(x+1,100,6,4,'#5aa9d8');r(x,106,8,6,'#9aa29a');r(x+2,107,4,3,'#1d2622');r(x+3,108,2,1,'#57c26a')}};
    // Hung high over gates: a pictogram square, Japanese over English.
    const sign=(x:number,w:number,mark:string,markBg:string,markInk:string,ja:string,en:string,bg='#2f3638')=>{r(x,31,w,19,bg);r(x,50,w,1,'#77817c');r(x+2,33,12,12,markBg);t(x+3,34,mark,markInk,true);t(x+18,32,ja,'#ffffff',true);t(x+18,43,en,'#d8d8cc')};
    // Left: the ticket office, set back less than the gates beside it: green sign band, three glazed counters with clerks.
    tiles(0,23,62,35,true);
    r(0,56,62,11,'#2c8a4a');r(0,56,62,1,'#7fc495');g.textAlign='center';t(31,57,'みどりの窓口','#ffffff',true);g.textAlign='left';
    for(let i=0;i<3;i++){
      const x=1+i*20;
      r(x,67,20,26,'#9fc3c2');for(let d=0;d<10;d++)r(x+2+d,77-d,1,1,'#c3dddb');
      r(x+6,84,7,6,'#2f4f7a');r(x+7,79,5,5,'#e9c4a0');r(x+7,79,5,2,'#2b2420');r(x+14,84,4,4,'#283e40');
      r(x,90,20,3,'#d9d3bf');r(x,93,20,7,'#c3c8b8');r(x,67,1,33,'#8f9e8b');t(x+8,94,String(i+1),'#283e40');
    }
    r(61,67,1,33,'#8f9e8b');r(0,100,62,6,'#3b4541');r(0,106,62,2,'#5a6650');
    // Then the central gates, the pillar of the machine wall closing the last lane, under the sign of their local platform.
    paid(62,68);gates(64,3,'#3a78c2');
    sign(30,98,'改','#f2c230','#1d2622','中央改札 '+platformFor(hub,'local').replace('TRACK ','')+'番','Central Gate · Local');
    // The machine wall between two tiled pillars.
    tiles(130,23,232,101);
    for(const x of [130,350]){tiles(x,23,12,101);r(x,23,1,101,'#aeab94');r(x+11,23,1,101,'#aeab94');r(x-1,118,14,6,'#aeb4b0')}
    // Right: the Shinkansen transfer gates and their corridor, or a NewDays.
    if(hasShinkansen(hub)){
      paid(362,118);gates(370,5,'#2a6fb3');
      sign(372,96,'新','#ffffff','#2a5ea8','新幹線のりかえ','Shinkansen · '+platformFor(hub,'shinkansen').replace('TRACK ','Track '),'#2a5ea8');
      t(396,127,platformFor(hub,'shinkansen'),'#e6e3cc',true);t(400,139,'新幹線','#e6e3cc',true);
    }else{
      // The shop front: white sign band, then the glazing with a drinks fridge, shelves, the till and its clerk, and the automatic door on the right.
      tiles(362,23,118,29,true);
      r(362,52,118,14,'#fbfbf6');r(362,52,118,1,'#ffffff');r(362,63,118,2,'#3c9a5c');r(362,65,118,1,'#e8853a');
      t(368,53,'New','#d2402e',true);t(383,53,'Days','#2f8a4a',true);t(409,56,'ニューデイズ','#56605a');
      r(362,66,118,34,'#9fc3c2');
      r(364,68,24,30,'#dfe9ec');for(let k=0;k<4;k++){r(364,68+k*7+6,24,1,'#9aa29a');for(let b=0;b<6;b++)r(365+b*4,69+k*7+1,2,5,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#f4f4ee','#e8853a'][(b+k)%6])}
      for(let k=0;k<3;k++){r(392,74+k*8,24,2,'#7d8a84');for(let b=0;b<7;b++)r(393+b*3+(k%2),70+k*8,2,4,['#e9a6ad','#f2c230','#86a367','#c3dddb','#b66c51'][(b*3+k)%5])}
      r(420,90,18,10,'#d9d3bf');r(420,90,18,2,'#efe9d4');r(425,82,7,8,'#3c9a5c');r(426,77,5,5,'#e9c4a0');r(426,77,5,2,'#2b2420');r(432,86,4,4,'#283e40');
      for(const x of [362,390,418,439])r(x,66,1,34,'#8f9e8b');
      r(440,66,26,40,'#4c5f5c');dither(440,66,26,40,'#5b706c');r(452,66,2,40,'#8f9e8b');r(440,66,26,2,'#8f9e8b');r(466,66,14,34,'#9fc3c2');r(466,66,1,34,'#8f9e8b');
      r(362,100,78,6,'#3b4541');r(466,100,14,6,'#3b4541');r(362,106,118,2,'#5a6650');r(438,106,30,3,'#55625b');
    }
    r(0,23,480,9,'#5d6a62');dither(0,30,480,2,'#4c5852');for(let x=10;x<480;x+=40)r(x,26,22,2,'#fffbe0');
    // The station's name on the wall over the fare board.
    r(196,33,88,12,'#283e40');r(196,44,88,1,station.accent);g.textAlign='center';t(240,34,`${station.ja}  ${station.en.toUpperCase()}`,'#fffef2',true);g.textAlign='left';
    // Light-box posters of the game's destinations, as on the hall's wall: Kamakura on the left, Nikko on the right.
    const poster=(x:number,place:'kamakura'|'nikko',y=74)=>{
      r(x-1,y-1,22,32,'#aeb4b0');r(x,y,20,22,place==='kamakura'?'#f7ead2':place==='nikko'?'#dfe8e0':'#6fa863');r(x,y+22,20,8,'#fbfbf6');r(x,y+22,20,1,'#c9c4a6');
      if(place==='kamakura'){r(x,y+16,20,6,'#7c9a6a');r(x+5,y+8,10,2,'#4a4a52');r(x+6,y+10,8,6,'#b8503e');for(const [dx,dy] of [[1,2],[14,1],[3,6],[16,7],[0,10]])r(x+dx,y+dy,3,3,'#f2a7c0')}
      else{for(const dx of [1,16])r(x+dx,y+3,3,17,'#2f5a3c');r(x+5,y+6,10,2,'#2f3a36');r(x+6,y+8,8,9,'#f4f0e4');r(x+9,y+11,2,6,'#2a2a2e');r(x+6,y+8,8,1,'#d8b04a');r(x+4,y+17,12,3,'#a29d90')}
      t(x+5,y+24,place==='kamakura'?'鎌倉':'日光','#283e40');
    };
    poster(146,'kamakura');poster(314,'nikko');
    // Fare board above the machines, with the station the player stands in marked in red.
    r(176,45,128,30,'#8f9e8b');r(178,47,124,26,'#fffef2');
    if(hub==='tokyo'){
      r(217,52,26,16,'#7ab648');r(219,54,22,12,'#fffef2');r(184,60,33,1,'#e8853a');r(243,59,50,1,'#e8853a');r(232,66,1,6,'#3a78c2');r(241,55,40,1,'#d24a3a');r(281,55,1,14,'#d24a3a');r(192,52,25,1,'#e8c440');
      for(const [x,y] of [[186,60],[198,60],[210,60],[250,59],[262,59],[274,59],[290,59],[232,70],[265,55],[281,62],[281,68],[200,52]])r(x-1,y-1,3,3,'#283e40');
      r(239,57,5,5,'#d6402e');r(244,58,6,2,'#d6402e');
    }else{
      // Elsewhere, one line per route from the station, which is the red square on their left.
      const lines=routes.filter(route=>route.from===hub),top=60-(lines.length-1)*5;
      lines.forEach((route,i)=>{const y=top+i*10;r(196,y,96,2,route.color);for(const x of [196,290])r(x-1,y-1,4,4,'#283e40')});
      r(194,top+(lines.length-1)*5-2,6,6,'#d6402e');
    }
    // Its title on a plate beside the station's name: the board itself is full.
    r(176,38,19,7,'#fffef2');t(178,39,hub==='tokyo'?'運賃表':'のりば','#2d563e');
    // Five machines in a pale facade, each under its lit sign: local tickets, IC charge, local tickets, IC charge, Shinkansen (or local tickets again).
    r(170,76,140,44,'#e4e6df');dither(170,117,140,3,'#d4d7ce');
    machineKinds(hub).forEach((kind,i)=>{
      const x=172+i*28,sign={local:'#2c754e',charge:'#c5487e',shinkansen:'#6c78b8'}[kind];
      r(x,77,24,7,sign);r(x,77,24,1,'#ffffff55');r(x+5,79,14,1,'#ffffff');r(x+8,81,8,1,'#ffffffaa');
      r(x,85,24,27,'#9ea69c');r(x+1,85,22,27,kind==='shinkansen'?'#3d9a4c':'#d9dcd6');
      r(x+3,86,18,10,'#86967e');
      if(kind==='local'){r(x+4,87,16,8,'#0960bc');dither(x+4,87,16,4,'#4dcae3');for(let k=0;k<6;k++)r(x+5+(k%3)*5,90+Math.floor(k/3)*3,4,2,'#deedf0')}
      else if(kind==='charge'){r(x+4,87,16,8,'#faf9eb');r(x+10,88,4,3,'#7dba71');r(x+7,93,10,1,'#526c5a')}
      else{r(x+4,87,16,8,'#eef0e0');for(let k=0;k<4;k++)r(x+5+(k%2)*7,89+Math.floor(k/2)*3,6,2,'#697268')}
      r(x+2,97,20,14,'#e9eae2');r(x+3,99,7,3,'#e2c234');r(x+4,100,5,1,'#1d2622');r(x+12,99,5,3,'#e2c234');r(x+13,100,3,1,'#1d2622');
      if(kind==='charge'){r(x+18,98,3,9,'#f6f6f0');r(x+4,103,5,5,'#7dba71');r(x+5,104,3,3,'#e7f1e4')}else{r(x+18,98,3,4,'#e2c234');r(x+19,99,1,2,'#1d2622');r(x+3,104,7,2,'#f6f6f0');r(x+12,104,5,2,'#f6f6f0');r(x+18,103,3,3,'#e2c234')}
      r(x+3,108,15,3,'#262f2c');
    });
    r(166,112,148,3,'#aeb4b0');r(166,115,148,1,'#8b918d');
    // きっぷうりば on the wall beside the station's name, clear of the fare board.
    r(291,34,52,9,'#2f3638');r(293,35,7,7,'#ffffff');t(294,36,'券','#1d2622');t(303,36,'きっぷうりば','#ffffff');
    r(130,122,232,3,'#5a6650');
    // Tactile paving along the machines.
    r(150,128,190,5,'#e8c440');for(let x=151;x<339;x+=4)r(x,129+(x%8<4?0:2),2,1,'#cfa72c');
    // Floor markings: the local platform past the central gates, yellow guidance lines to the exits.
    t(8,127,platformFor(hub,'local')+' / 在来線','#e6e3cc',true);
    r(0,226,480,3,'#d1b86f');
    // Exits painted on the floor; the yellow 出口 signs are on the concourse pillars (exitPillar, placed by main.ts).
    t(12,234,'← 西口 EXIT','#e6e3cc',true);t(12,246,station.west[0],'#cfd3b8');
    t(394,234,'東口 EXIT →','#e6e3cc',true);t(394,246,station.east[0],'#cfd3b8');
    texture.refresh();
    exitPillar(scene,hub,'west');exitPillar(scene,hub,'east');
  }
}

/** The hall's commuters seen from above: the same outfits as in the first-person hall, in the traveller's 20 × 28 frames. */
function makeCommuters(scene:Phaser.Scene){
  looks.forEach((look,index)=>{
    const skin=look.skin??'#e9c4a0',hair=look.hair,ink='#283e40';
    for(const face of ['down','up','left','right'])for(let frame=0;frame<3;frame++){
      const texture=scene.textures.createCanvas(`commuter-${index}-${face}-${frame}`,20,28)!;const g=texture.context;
      const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
      const bob=frame===1?1:0,side=face==='left'||face==='right',back=face==='up',flip=(x:number,w=1)=>face==='left'?20-x-w:x;
      r(4,25,12,2,'#4f5a48');
      // Legs and shoes; a kimono covers them down to the feet.
      if(look.length==='robe'){r(6,20+bob,9,5-bob,look.coat);r(6,24,4,2,'#f4f4ee');r(11,24,4,2,'#f4f4ee')}
      else if(side){const a=frame===1?2:frame===2?-2:0;r(8+a,20+bob,3,5-bob,look.legs);r(10-a,20+bob,3,5-bob,look.legs);r(flip(8+a,4),24,4,2,'#2a2a2a');r(flip(10-a,4),24,4,2,'#2a2a2a')}
      else{r(6,20+bob,3,5-(frame===1?1:0),look.legs);r(12,20+bob,3,5-(frame===2?1:0),look.legs);r(5,24,4,2,'#2a2a2a');r(12,24,4,2,'#2a2a2a')}
      if(look.backpack&&!back&&side)r(flip(3,3),13+bob,3,7,look.bag!);
      // Coat, arms and hands, then what hangs below the waist.
      if(side){r(7,12+bob,7,9,look.coat);r(flip(9,3),13+bob,3,6,look.coat);r(flip(9,3),19+bob,3,1,skin)}
      else{r(5,12+bob,11,9,look.coat);r(4,13+bob,2,6,look.coat);r(15,13+bob,2,6,look.coat);r(4,19+bob,2,1,skin);r(15,19+bob,2,1,skin)}
      if(look.skirt){r(side?6:4,19+bob,side?9:13,2,look.skirt);r(side?5:3,21+bob,side?11:15,2,look.skirt)}
      if(look.length==='knee')r(side?7:5,20+bob,side?7:11,3,look.coat);
      if(look.length==='robe'){r(side?7:5,16+bob,side?7:11,2,look.sash??look.coat);if(face==='down')r(9,12+bob,3,2,'#f4f4ee')}
      else if(face==='down'&&look.tie){r(9,12+bob,3,1,'#f4f4ee');r(10,13+bob,1,4,'#6c3b3b')}
      if(look.backpack){if(back){r(6,13+bob,9,7,look.bag!);r(7,14+bob,7,1,'#ffffff33')}else if(!side){r(6,12+bob,1,6,look.bag!);r(14,12+bob,1,6,look.bag!)}}
      else if(look.bag){if(side)r(flip(12,3),16+bob,3,4,look.bag);else r(back?2:16,16+bob,3,4,look.bag)}
      if(look.cane&&!back)r(side?flip(14):17,15+bob,1,10,'#6b4a2e');
      // Head and hair.
      r(7,5+bob,8,8,skin);
      if(back)r(6,3+bob,10,9,hair);else if(side){r(6,3+bob,10,4,hair);r(flip(6,4),5+bob,4,5,hair)}else{r(6,3+bob,10,4,hair);r(6,5+bob,1,3,hair);r(15,5+bob,1,3,hair)}
      if(look.style==='bob'){if(back)r(6,3+bob,10,10,hair);else if(side)r(flip(6,5),5+bob,5,7,hair);else{r(6,5+bob,2,7,hair);r(14,5+bob,2,7,hair)}}
      else if(look.style==='long'){if(back)r(6,3+bob,10,14,hair);else if(side)r(flip(5,5),5+bob,5,11,hair);else{r(5,5+bob,2,11,hair);r(15,5+bob,2,11,hair)}}
      else if(look.style==='bun')r(side?flip(5,4):9,side?3+bob:1+bob,4,3,hair);
      else if(look.style==='ponytail'){if(back)r(10,11+bob,2,6,hair);else if(side)r(flip(4,2),7+bob,2,7,hair)}
      if(face==='down'){r(9,9+bob,1,1,ink);r(12,9+bob,1,1,ink);if(look.mask)r(8,10+bob,6,3,'#f4f4ee')}
      else if(side){r(flip(13),9+bob,1,1,ink);if(look.mask)r(flip(10,5),10+bob,5,3,'#f4f4ee')}
      texture.refresh();
    }
  });
}

function makeJrStop(scene:Phaser.Scene){
  const texture=mapCanvas(scene,'map-jr-stop',480,320);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const t=(x:number,y:number,text:string,c='#e9dbaf',big=false)=>letter(g,x,y,text,c,big);
  r(0,35,480,285,'#9dae8b');
  for(let x=0;x<480;x+=24){r(x,45,20,24,'#748a78');r(x+2,48,5,4,'#b7c4a4');r(x+10,55,6,5,'#b7c4a4')}
  r(0,70,480,42,'#64736c');for(let x=0;x<480;x+=14)r(x,72,4,37,'#40534c');for(const y of[77,100]){r(0,y,480,3,'#acb6a1');r(0,y+3,480,2,'#354e47')}
  r(0,114,480,170,'#c4c3a8');for(let y=118;y<284;y+=12)for(let x=0;x<480;x+=20){r(x,y,19,11,'#d5d0b4');r(x,y,19,1,'#eee3c1')}
  r(0,116,480,5,'#d0b56b');for(let x=0;x<480;x+=7)r(x,117,3,1,'#8b8758');
  r(160,77,164,44,'#344f48');r(166,81,152,35,'#355b4e');r(160,75,164,4,'#bbd0a2');r(172,121,5,17,'#718573');r(306,121,5,17,'#718573');
  for(const x of[15,439]){r(x,129,8,126,'#8b9d86');r(x-3,252,14,5,'#617b68')}
  for(const x of[165,270]){r(x,235,52,4,'#9e8259');r(x,242,52,4,'#b99d6c');r(x+4,246,4,12,'#68745b');r(x+44,246,4,12,'#68745b')}
  r(53,168,97,23,'#385d4c');t(59,174,'← TOKYO 東京','#e9dbaf',true);r(66,191,4,22,'#7d896b');r(133,191,4,22,'#7d896b');
  r(356,161,58,46,'#dde0c4');r(360,165,50,25,'#57776b');for(let x=365;x<405;x+=10)r(x,170,6,12,'#b9c9a6');r(360,194,50,4,'#aab48d');t(363,199,'JR','#456b54');
  r(0,280,480,40,'#587b58');for(let x=0;x<480;x+=16){r(x,277,14,12,'#799762');r(x+2,275,8,5,'#a9b97b')}
  t(202,262,'JR / LOCAL','#6e7e63',true);texture.refresh();
}
