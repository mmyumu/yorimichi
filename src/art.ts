import Phaser from 'phaser';
import { boardLines, hasShinkansen, machineKinds, stations, tracksFor, type Hub, type Konbini, type Platform, type Service } from './network';
import { looks } from './people';
import { onTokyoBoard } from './tokyo-fares';

// Original pixel tiles painted on a 480 × 320 canvas, displayed at integer 2× scale.
/** A map canvas at twice the art's density, drawn in art coordinates: the art keeps its 2-px blocks while the lettering gets one screen pixel per dot. */
function mapCanvas(scene:Phaser.Scene,key:string,w:number,h:number){const texture=scene.textures.createCanvas(key,w*2,h*2)!;texture.context.scale(2,2);return texture}
/** Lettering in the PixelMplus10 bitmap font, whose outlines are whole pixels: 10px for small print (a dot per pixel of the canvas's full density, half an art px)
 * or `big` at 20px (a dot per art px, like the rest of the art). (x, y) is the top left of the text's cell, 5 art px high (10 if big), or its top centre or right with `g.textAlign`;
 * kanji and kana are as wide as the cell is high, Latin half that. */
function letter(g:CanvasRenderingContext2D,x:number,y:number,text:string,color:string,big=false){
  // Nothing to draw (a terminus has no stop on one side): a canvas of no width cannot be read back.
  if(!text)return;
  const px=big?20:10,font=`${px}px "Yorimichi Bitmap", "Yorimichi JP", monospace`,scratch=document.createElement('canvas'),c=scratch.getContext('2d')!;c.font=font;
  const w=Math.round(c.measureText(text).width);scratch.width=w;scratch.height=px;
  c.font=font;c.fillStyle=color;c.fillText(text,0,px*.9);
  // Keeps any anti-aliasing the fallback fonts bring out of the pixel art.
  const data=c.getImageData(0,0,w,px);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>110?255:0;c.putImageData(data,0,0);
  g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(scratch,Math.round(x*2-(g.textAlign==='center'?w/2:g.textAlign==='right'?w:0)),Math.round(y*2));g.restore();
}
const C={grass:'#92ad70',dark:'#344c42',leaf:'#497452',light:'#86a466',cream:'#efdbac',wood:'#806049',shadow:'#657756'};
export function makeArt(scene:Phaser.Scene){
  makeCommuters(scene);makePhone(scene);makeCar(scene);
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
 * main.ts (solids, hotspots, commuters) and hall-scene.ts (xAnchors) rely on these. Drawn the first time the station is visited (`map-<hub>`, with its exit pillars). */
export function makeHub(scene:Phaser.Scene,hub:Hub){
  if(scene.textures.exists('map-'+hub))return;
  {
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
    ticketOffice(g,0,56);
    // Then the central gates, the pillar of the machine wall closing the last lane, under the sign of their local platform.
    paid(62,68);gates(64,3,'#3a78c2');
    sign(30,98,'改','#f2c230','#1d2622','中央改札 在来線','Central Gate · Tracks '+tracksFor(hub,'local','–'));
    // The machine wall between two tiled pillars.
    tiles(130,23,232,101);
    for(const x of [130,350]){tiles(x,23,12,101);r(x,23,1,101,'#aeab94');r(x+11,23,1,101,'#aeab94');r(x-1,118,14,6,'#aeb4b0')}
    // Right: the Shinkansen transfer gates and their corridor, or a NewDays.
    if(hasShinkansen(hub)){
      paid(362,118);gates(370,5,'#2a6fb3');
      sign(372,96,'新','#ffffff','#2a5ea8','新幹線のりかえ','Shinkansen · Tracks '+tracksFor(hub,'shinkansen','–'),'#2a5ea8');
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
    // The station's name on the wall over the fare board, in the big lettering; a long one has its English in small print. The plate grows to hold it, pushing the signs beside it out.
    const wide=(text:string,big:boolean)=>[...text].reduce((w,c)=>w+(c.charCodeAt(0)<128?.5:1)*(big?10:5),0),full=`${station.ja}  ${station.en.toUpperCase()}`,fits=wide(full,true)<=82;
    const nameW=Math.max(88,Math.ceil(fits?wide(full,true):wide(station.ja,true)+4+wide(station.en.toUpperCase(),false))+8),nameL=240-Math.ceil(nameW/2);
    r(nameL,33,nameW,12,'#283e40');r(nameL,44,nameW,1,station.accent);
    if(fits){g.textAlign='center';t(240,34,full,'#fffef2',true);g.textAlign='left'}else{t(nameL+4,34,station.ja,'#fffef2',true);t(nameL+8+wide(station.ja,true),37,station.en.toUpperCase(),'#fffef2')}
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
    const board=onTokyoBoard(station.ja);
    if(board){
      r(217,52,26,16,'#7ab648');r(219,54,22,12,'#fffef2');r(184,60,33,1,'#e8853a');r(243,59,50,1,'#e8853a');r(232,66,1,6,'#3a78c2');r(241,55,40,1,'#d24a3a');r(281,55,1,14,'#d24a3a');r(192,52,25,1,'#e8c440');
      for(const [x,y] of [[186,60],[198,60],[210,60],[250,59],[262,59],[274,59],[290,59],[232,70],[265,55],[281,62],[281,68],[200,52]])r(x-1,y-1,3,3,'#283e40');
      r(239,57,5,5,'#d6402e');r(244,58,6,2,'#d6402e');
    }else{
      // Elsewhere, one line per line through the station, which is the red square on their left; closer together when there are many.
      const lines=boardLines(hub),step=Math.min(10,Math.floor(20/Math.max(1,lines.length-1))),top=60-Math.round((lines.length-1)*step/2);
      lines.forEach((route,i)=>{const y=top+i*step;r(196,y,96,2,route.color);for(const x of [196,290])r(x-1,y-1,4,4,'#283e40')});
      r(194,58,6,6,'#d6402e');
    }
    // Its title on a plate beside the station's name: the board itself is full.
    r(Math.min(176,nameL-20),38,19,7,'#fffef2');t(Math.min(178,nameL-18),39,board?'運賃表':'のりば','#2d563e');
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
    {const x=Math.max(291,nameL+nameW+3);r(x,34,52,9,'#2f3638');r(x+2,35,7,7,'#ffffff');t(x+3,36,'券','#1d2622');t(x+12,36,'きっぷうりば','#ffffff')}
    r(130,122,232,3,'#5a6650');
    // Tactile paving along the machines.
    r(150,128,190,5,'#e8c440');for(let x=151;x<339;x+=4)r(x,129+(x%8<4?0:2),2,1,'#cfa72c');
    // Floor markings: yellow guidance lines to the exits.
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
      if(look.cane&&!back){if(side){r(flip(10),19+bob,1,7-bob,'#6b4a2e');r(flip(10,2),19+bob,2,1,'#6b4a2e')}else{r(17,15+bob,1,10,'#6b4a2e');r(17,15+bob,2,1,'#6b4a2e')}}
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

/** The area map's picture window in the street (art px, x y w h), left of its legend: read up close, it shows the street itself there again (areaMapView in main.ts). */
export const areaMapFace=[120,116,24,18] as const;
/** The area map's window read up close (art px in makeAreaMap's board, x y w h): the street's picture goes there (areaMapView in main.ts). */
export const areaMapWindow=[4,36,120,80] as const;
/** The area map read up close, 180 × 120 art px (shown at 4× by areaMapView in main.ts), dressed after the guide maps by Tokyo's stations: in its dark frame, two white panels
 * ringed in blue (the station behind, `ja`/`en`, and the bus stop to the right, each with its pictogram, arrow and distance), the window for the street's picture (`areaMapWindow`),
 * and the legend down the right, its symbols what the picture shows: 現在地, the station, the konbini (in its chain's colour), its ATM, the bus stop, the vending machines. */
export function makeAreaMap(scene:Phaser.Scene,key:string,ja:string,en:string,konbini:Konbini){
  const texture=mapCanvas(scene,key,180,120),g=texture.context,blue='#1d5fae',ink='#2b2b2b',faint='#6d6650',red='#d6402e',white='#fbfbf6';
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  const kon={seven:'#008061',family:'#00a040',lawson:'#1f5fbf'}[konbini];
  // A rounded rectangle, its corners cut row by row to the half art px.
  const round=(x:number,y:number,w:number,h:number,rad:number,c:string)=>{for(let dy=0;dy<h;dy+=.5){const d=Math.min(dy,h-dy-.5),i=d<rad?Math.round((rad-Math.sqrt(rad*rad-(rad-d-.25)**2))*2)/2:0;r(x+i,y+dy,w-i*2,.5,c)}};
  // The legend's symbols, 4 art px square.
  const icon:Record<string,(x:number,y:number)=>void>={
    here:(x,y)=>{round(x,y,4,4,2,red);r(x+1.5,y+1.5,1,1,white)},
    station:(x,y)=>{r(x,y,4,4,'#2c8a4a');r(x+.5,y+1.5,3,1,white);for(let k=0;k<3;k++)r(x+.75+k,y+1,.5,2,white)},
    konbini:(x,y)=>{r(x,y,4,4,kon);r(x+1,y+1,2,2,white);r(x+1.5,y+1.5,1,1,kon)},
    atm:(x,y)=>{r(x,y,4,4,red);r(x+.5,y+1,3,1.5,white);r(x+1,y+3,2,.5,white)},
    bus:(x,y)=>{r(x,y,4,4,blue);r(x+.5,y+.5,3,2.5,white);r(x+1,y+1,2,.5,blue);r(x+.5,y+3,1,.5,white);r(x+2.5,y+3,1,.5,white)},
    vending:(x,y)=>{r(x,y,2,4,'#d24a3a');r(x+2,y,2,4,'#3a78c2');r(x+.5,y+.5,1,1.5,white);r(x+2.5,y+.5,1,1.5,white)},
  };
  r(0,0,180,120,'#3a2e27');r(0,0,180,.5,'#5a4a3e');
  // The two panels: the pictogram, the name in big blue lettering, its English after it, then the arrow and the distance.
  const panel=(y:number,pict:(x:number,y:number)=>void,name:string,english:string,up:boolean,metres:string)=>{
    r(4,y,172,14,'#f1f0e8');round(5,y+1,170,12,5,blue);round(5.5,y+1.5,169,11,4.5,white);
    r(12,y+2.5,9,9,blue);pict(12,y+2.5);t(24,y+2.5,name,blue,true);t(27+name.length*10,y+6,english,blue);
    if(up){r(153,y+5,2,6.5,blue);for(let k=0;k<4;k++)r(154-k-.5,y+2.5+k,1+k*2,1,blue)}else{r(144,y+6.5,9,2,blue);for(let k=0;k<4;k++)r(153+k,y+3.5+k,1,7-k*2,blue)}
    t(160,y+5,metres,blue);
  };
  panel(3,(x,y)=>{round(x+2,y+1,5,6,1.5,white);r(x+2.5,y+2,4,2,blue);r(x+2.5,y+5,1,.5,blue);r(x+5.5,y+5,1,.5,blue);for(let k=0;k<2;k++){r(x+2.5-k,y+7+k,1,1,white);r(x+5.5+k,y+7+k,1,1,white)}},`${ja}駅`,`JR ${en} Sta.`,true,'30m');
  panel(19,(x,y)=>{r(x+1.5,y+1.5,6,5,white);r(x+2,y+2,5,2,blue);r(x+2,y+6.5,1.5,1.5,white);r(x+5.5,y+6.5,1.5,1.5,white)},'バスのりば','Bus stop',false,'120m');
  // The window's dark rule (the picture fills it), and the legend beside it with the north arrow and the map's date.
  const [wx,wy,ww,wh]=areaMapWindow;r(wx-.5,wy-.5,ww+1,wh+1,'#7d7666');
  r(125.5,35.5,50.5,81,'#7d7666');r(126,36,50,80,white);t(128,38,'凡例','#2b2b2b');t(139,38,'Legend',faint);r(128,43.5,46,.5,'#9a9380');
  ([['here','現在地','Here'],['station','駅','Station'],['konbini','コンビニ','Konbini'],['atm','ATM',''],['bus','バス停','Bus stop'],['vending','自販機','Drinks']] as const).forEach(([k,jp,eng],i)=>{
    const y=46+i*8;icon[k](128,y+.5);t(133.5,y,jp,ink);if(eng)t(135+jp.length*5,y,eng,faint);
  });
  round(128,98,6,6,3,ink);for(let k=0;k<3;k++)r(131-k*.5,99+k,k+.5,1,white);t(136,98.5,'N',ink);t(128,109,'2026.10',faint);
  texture.refresh();
}
/** The street outside a station, shared by every exit without a map of its own: the station front with its entrance under the sign (`title` over `subtitle`, underlined in `accent`),
 * a konbini beside it (the same shop for every chain, under the sign of `konbini`), a plaza with vending machines, planters, the area map and a bus stop, the road and its crossing, and the shops across it. Drawn once per station and exit, when first needed.
 * In art px: front 0–112 (entrance 196–284; konbini 334–480, sign 58–80, door 338–364), area map 118–152 × 108–144, planters at 76 and 376 (150–160), vending machines 20–64, konbini bins 410–430 × 112–122,
 * bus stop at 455, road 199–247, shops from 262. main.ts (solids, hotspots) relies on these. */
export function makeTown(scene:Phaser.Scene,key:string,title:string,subtitle:string,accent:string,konbini:Konbini){
  const texture=mapCanvas(scene,key,480,320);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  let seed=91;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  // The station front: two rows of windows, the canopy over the glazed entrance, and the sign above it.
  r(0,35,480,77,'#cfc8ad');r(0,35,480,4,'#5d6a62');r(0,39,480,2,'#e6e3cc');
  for(const y of [46,66])for(let x=4;x<320;x+=24)if(y===46||x<150||x>320){r(x,y,16,12,'#476e79');r(x+2,y+2,12,3,'#9ebcb4');r(x,y+12,16,2,'#aeab94')}
  r(166,64,148,26,'#aeab94');r(168,66,144,22,'#283e40');r(168,87,144,1,accent);r(172,69,16,16,'#2c8a4a');t(175,72,'JR','#ffffff',true);
  g.textAlign='center';t(250,68,title,'#fffef2',true);t(250,80,subtitle,'#d8d8cc');g.textAlign='left';
  r(190,96,100,16,'#9fc3c2');for(let x=190;x<=290;x+=25)r(x,96,1,16,'#8f9e8b');r(238,96,4,16,'#8f9e8b');r(190,110,100,2,'#3b4541');
  r(176,90,128,6,'#5d6a62');r(176,96,128,1,'#3b4541');for(let x=180;x<304;x+=20)r(x,91,10,1,'#fffbe0');
  // The konbini beside the station: its own lower front, the chain's sign band, then the glazing with the automatic door, the magazine rack along the window, shelves, the drinks fridge, the ATM, the till and its clerk.
  r(332,35,148,77,'#e8e6dc');r(332,35,148,4,'#5d6a62');r(332,35,2,77,'#aeab94');for(let x=340;x<480;x+=12)r(x,43,8,11,'#c9c7b2');
  // The signs as on the real fronts (half art px allowed: the canvas is at twice the art's density; lettering drawn twice half an art px apart is bold).
  if(konbini==='seven'){
    // White fascia with the thick orange, green and red stripes, broken in the middle by the logo on white: the orange bar and red stem of the 7, ELEVEn in green across it.
    r(334,58,146,22,'#fbfbf6');for(const [y,c] of [[60,'#f58220'],[65,'#008061'],[70,'#ee2526']] as const){r(334,y,54,4,c);r(416,y,64,4,c)}
    r(395,60,15,3,'#f58220');for(let k=0;k<15;k++)r(407-k*.5,63+k,3,1,'#ee2526');r(394.5,68.5,16,5,'#fbfbf6');t(395,68.5,'ELEVEn','#008061');
  }else if(konbini==='family'){
    // White fascia between the green band on top and the blue rule below, the logo square (green over blue) before FamilyMart in blue.
    r(334,58,146,22,'#fbfbf6');r(334,58,146,5,'#00a040');r(334,76,146,2,'#0068b7');
    r(378,65,9,4,'#00a040');r(378,70,9,5,'#0068b7');for(const dx of [0,.5])t(390+dx,65,'FamilyMart','#0068b7',true);
  }else{
    // A white light box in three panels: the blue band with LAWSON in white, and the blue and red rules under it.
    r(334,58,146,22,'#fbfbf6');r(334,60,146,13,'#1f5fbf');r(334,75,146,.5,'#1f5fbf');r(334,75.5,146,1,'#d0313c');
    for(const x of [382,432])r(x,58,1.5,22,'#c9ccd0');for(const dx of [0,.5])t(392.5+dx,61.5,'LAWSON','#ffffff',true);
  }
  r(334,80,146,30,'#9fc3c2');for(let d=0;d<12;d++)r(372+d*2,108-d*2,2,1,'#c3dddb');
  r(338,80,26,30,'#4c5f5c');r(338,80,26,2,'#8f9e8b');r(350,80,2,30,'#8f9e8b');r(340,84,9,24,'#5b706c');r(353,84,9,24,'#5b706c');
  r(368,100,40,8,'#d9d3bf');for(let k=0;k<13;k++)r(369+k*3,96,2,5,['#d2402e','#e8c440','#3a78c2','#e9a6ad','#3c9a5c'][k%5]);
  for(let k=0;k<3;k++){r(370,84+k*5,36,1,'#7d8a84');for(let b=0;b<9;b++)r(371+b*4,81+k*5,3,3,['#f4f4ee','#e8853a','#86a367','#c3dddb','#b66c51'][(b+k)%5])}
  r(412,82,24,20,'#dfe9ec');for(let k=0;k<3;k++){r(412,82+k*7+6,24,1,'#9aa29a');for(let b=0;b<6;b++)r(413+b*4,83+k*7,2,5,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#f4f4ee','#e8853a'][(b+k)%6])}
  r(456,98,23,10,'#d9d3bf');r(456,98,23,2,'#efe9d4');r(462,90,7,8,'#3a78c2');r(463,85,5,5,'#e9c4a0');r(463,85,5,2,'#2b2420');r(472,94,6,4,'#283e40');
  // The ATM under its red sign: a pale grey cabinet with a red rim on top, the upper screen and the tilted touch screen, card slot and keypad, the cash tray, and a red base.
  r(438,81,17,5.5,'#d6402e');t(441,81.5,'ATM','#ffffff');t(441.5,81.5,'ATM','#ffffff');
  r(440,88,13,20,'#c9cdd0');r(440,88,13,1.5,'#d6402e');r(452,89,1,19,'#9aa0a4');r(441.5,90.5,10,4.5,'#3a78c2');r(442.5,91.5,4,2.5,'#9fd0e8');r(447,91.5,3.5,2.5,'#f4f4ee');
  r(441.5,96,8,4,'#2f3e46');r(442,96.5,7,3,'#9fd0e8');r(450,96,2,4,'#e8eef0');r(450.5,96.5,1,.5,'#283e40');r(450.5,98,1,1.5,'#7d8a84');
  r(441,101,11,2,'#8f969a');r(442,101.5,9,1,'#5b6265');r(440,104,13,4,'#d6402e');r(440,104,13,.5,'#a52f22');
  for(const x of [364,410,437,455,479])r(x,80,1,30,'#8f9e8b');r(334,110,146,2,'#3b4541');r(338,110,26,2,'#55625b');
  // On the glass: the 7-Eleven stripes across a door pane, the Lawson blue band low along the window.
  if(konbini==='seven')for(const [y,c] of [[97,'#f58220'],[100,'#008061'],[103,'#ee2526']] as const)r(353,y,9,2,c);
  if(konbini==='lawson')r(364,104,115,2,'#1f5fbf');
  // The plaza, its tiles, and the tactile strip from the doors to the crossing.
  r(0,112,480,87,'#c9c2a4');for(let y=112;y<199;y+=12){r(0,y,480,1,'#b5ae90');for(let x=(y/12%2)*12;x<480;x+=24)r(x,y,1,12,'#b5ae90')}
  r(237,112,6,87,'#e8c440');for(let y=113;y<199;y+=4)r(238+(y%8<4?0:2),y,2,1,'#cfa72c');
  // Two vending machines against the front, on the left.
  for(const [x,c] of [[20,'#d24a3a'],[44,'#3a78c2']] as const){r(x,112,20,24,c);r(x+2,114,16,10,'#e8eef0');for(let k=0;k<8;k++)r(x+3+(k%4)*4,115+Math.floor(k/4)*5,2,4,['#d2402e','#3c9a5c','#e8c440','#f4f4ee'][k%4]);r(x+13,127,4,5,'#283e40');r(x+3,132,10,2,'#283e40');r(x+1,136,20,2,'#74855e')}
  // The area map (makeAreaMap, small): its dark frame on two posts, the two white panels ringed in blue, the map with its streets, the railway, the river, a park (its picture window, areaMapFace), the legend, the current spot in red.
  r(118,108,2,36,'#3a2e27');r(150,108,2,36,'#3a2e27');r(118,108,34,28,'#3a2e27');r(118,108,34,.5,'#5a4a3e');r(119,144,4,1,'#00000030');r(151,144,4,1,'#00000030');
  for(const y of [109,112.5]){r(120,y,30,3,'#fbfbf6');r(120.5,y+.5,29,2,'#1d5fae');r(121,y+1,28,1,'#fbfbf6');r(121.5,y+1,1.5,1,'#1d5fae');r(124,y+1,10,.5,'#1d5fae');r(124,y+1.5,5,.5,'#6f93c4');r(143,y+1,3,.5,'#1d5fae')}
  r(120,116,30,18,'#d9cfa3');r(144,116,6,18,'#fbfbf6');for(let y=117;y<133;y+=2)r(145,y,1,1,['#d6402e','#2b2b2b','#1d5fae','#00a040'][y%4/2|0]),r(146.5,y+.25,3,.5,'#9a9380');
  r(120,118,24,1,'#2b2b2b');r(126,117,12,3,'#b4b9bc');r(120,122,24,1,'#f7f5ec');for(const x of [124,130.5,137])r(x,123,.5,11,'#f7f5ec');r(120,128,24,.5,'#f7f5ec');
  r(131,124.5,5,3,'#9cc76f');for(let x=120;x<144;x+=.5)r(x,Math.round((130.5+Math.sin(x/3))*2)/2,.5,1,'#5b9bd5');r(127.5,120.5,1.5,1.5,'#d6402e');
  // The konbini's bins by its window.
  for(const [x,c] of [[410,'#3a78c2'],[421,'#2c8a4a']] as const){r(x,112,9,10,'#aeb4b0');r(x+1,112,7,2,c);r(x+3,115,3,1,'#283e40');r(x,122,9,1,'#8e9476')}
  // Planters with trees, and the bus stop on the right.
  for(const x of [76,376]){r(x+2,160,28,3,'#8e9476');r(x,150,28,10,'#8b7d63');r(x,150,28,2,'#ab9b78');r(x+12,138,4,12,'#69533f');for(const [dx,dy,w,h,c] of [[-2,122,32,18,'#345d48'],[2,118,24,24,'#487951'],[6,120,12,10,'#63905b'],[16,126,8,6,'#86a367']] as const)r(x+dx,dy,w,h,c)}
  r(455,142,2,42,'#4c6156');r(448,132,16,12,'#3a78c2');r(450,134,12,8,'#fffef2');r(454,136,4,4,'#3a78c2');r(451,184,10,3,'#5b6558');
  // The kerb, the road with its centre line and the crossing straight ahead, the far pavement.
  r(0,196,480,3,'#e0dccb');r(0,199,480,48,'#5d625c');for(let i=0;i<300;i++)r(Math.floor(rand()*480),199+Math.floor(rand()*48),1,1,'#6b706a');
  for(let x=0;x<480;x+=32)if(x<196||x>276)r(x,222,16,2,'#e6e3cc');for(let x=206;x<274;x+=8)r(x,202,5,42,'#e6e3cc');
  r(0,247,480,3,'#e0dccb');r(0,250,480,12,'#bdb59a');for(let x=0;x<480;x+=16)r(x,250,1,12,'#a9a187');
  // The shops across the road, seen from above: roofs, awnings and a lit sign each.
  let x=0;for(const [w,roof,awning] of [[70,'#7a6a5c','#b45843'],[56,'#5d6a62','#3a78c2'],[84,'#8a7f6a','#2c8a4a'],[62,'#6e5a52','#e8c440'],[90,'#5f6e6a','#d24a3a'],[64,'#7d7262','#6c78b8'],[54,'#66705f','#e8853a']] as const){
    r(x,262,w,58,roof);for(let y=270;y<320;y+=6)r(x,y,w,1,'#00000022');r(x,262,w,5,awning);for(let k=x;k<x+w;k+=8)r(k,262,4,5,'#fffef2aa');r(x+w-1,262,1,58,'#3b4541');r(x+8,268,w-16,4,'#fffbe0');x+=w;
  }
  texture.refresh();
}

/** The phone in the corner of the screen, 18 × 32 px shown at 2×: a dark handset, a conversation on its screen. */
function makePhone(scene:Phaser.Scene){
  const t=scene.textures.createCanvas('phone-mini',18,32)!,g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(1,0,16,32,'#1b2226');r(0,1,18,30,'#1b2226');r(1,1,1,30,'#3d4b52');r(1,1,16,1,'#3d4b52');r(8,1,2,1,'#55646b');
  r(2,3,14,25,'#f3f1ea');r(2,3,14,3,'#2f6f62');r(3,8,8,3,'#cfcbbd');r(7,12,8,3,'#3b8a6e');r(3,16,9,3,'#cfcbbd');r(8,20,7,3,'#3b8a6e');r(3,25,12,2,'#e2ded2');r(6,29,6,1,'#55646b');
  t.refresh();
}
/** Lorenzo's Uber, 62 × 31 art px, in the street's three-quarter view, facing right (east, along the station's side of the road): seen from above the roof,
 * the windscreen and rear window, the bonnet and boot; below, its near flank with the side windows, the door lettered and the wheels, and its shadow on the road. */
function makeCar(scene:Phaser.Scene){
  const t=mapCanvas(scene,'uber-car',62,31),g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(3,28,58,3,'#0000003a');
  // From above: the boot and bonnet, the roof between the sloping rear window and windscreen.
  r(2,7,14,6,'#2e353a');r(1,8,1,5,'#2e353a');r(2,7,14,1,'#4f5960');r(48,7,12,6,'#2e353a');r(60,8,1,5,'#2e353a');r(48,7,12,1,'#4f5960');r(52,9,6,1,'#394147');
  r(19,0,23,7,'#30373c');r(20,0,21,1,'#4f5960');r(22,3,16,1,'#394147');
  for(let y=0;y<7;y++){r(18-y,y,y+1,1,'#55798a');r(42,y,y+2,1,'#7fa8b8');r(43+y,y,1,1,'#b8d4dc')}
  // The near flank: side windows between the pillars, the body, door lines, handles at the doors' back edges, the lettering high on the rear door (clear of the wheel arch), lights at both ends.
  r(16,7,32,5,'#6f97a8');r(17,7,14,1,'#a9c8d3');r(33,7,14,1,'#a9c8d3');for(const x of [16,31,32,47])r(x,7,1,5,'#1f2427');r(16,12,32,1,'#1f2427');
  r(1,13,60,10,'#1f2427');r(0,14,62,8,'#1f2427');r(1,13,60,1,'#3a4248');r(1,22,60,1,'#15191b');r(31,13,1,9,'#15191b');r(47,12,3,1,'#15191b');
  r(17,14.5,3,1,'#5b6265');r(33,14.5,3,1,'#5b6265');r(59,14,3,3,'#fff4c0');r(60,18,2,2,'#5b6265');r(0,14,2,3,'#c8352b');letter(g,20.5,13.5,'Uber','#ffffff');
  for(const cx of [13,48]){r(cx-7,18,15,4,'#0c0e10');for(let y=18;y<30;y++)for(let x=cx-6;x<=cx+6;x++){const d=Math.hypot(x-cx,y-24);if(d<=5.4)r(x,y,1,1,d<=1.3?'#5b6265':d<=3?'#9aa0a4':'#14171a')}}
  t.refresh();
}
/** The ticket office (みどりの窓口) from its band at (x, y), 62 × 52 art px: the green sign band, three glazed counters with their clerks, numbered, and the base.
 * The concourse's office beside the central gates, and the same office seen from the corridor behind them, where it is the staffed window. */
function ticketOffice(g:CanvasRenderingContext2D,x0:number,y0:number){
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x0+x,y0-56+y,w,h)},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x0+x,y0-56+y,text,c,big);
  r(0,56,62,11,'#2c8a4a');r(0,56,62,1,'#7fc495');const align=g.textAlign;g.textAlign='center';t(31,57,'みどりの窓口','#ffffff',true);g.textAlign=align;
  for(let i=0;i<3;i++){
    const x=1+i*20;
    r(x,67,20,26,'#9fc3c2');for(let d=0;d<10;d++)r(x+2+d,77-d,1,1,'#c3dddb');
    r(x+6,84,7,6,'#2f4f7a');r(x+7,79,5,5,'#e9c4a0');r(x+7,79,5,2,'#2b2420');r(x+14,84,4,4,'#283e40');
    r(x,90,20,3,'#d9d3bf');r(x,93,20,7,'#c3c8b8');r(x,67,1,33,'#8f9e8b');t(x+8,94,String(i+1),'#283e40');
  }
  r(61,67,1,33,'#8f9e8b');r(0,100,62,6,'#3b4541');r(0,106,62,2,'#5a6650');
}
/** The corridor behind a hub's gates, in art px, for `count` lines: the floor runs between x 176 and 304 from its end wall at `top` (52) down to the gates' backs at `gates`; each line has
 * a section 72 px high, the first (nearest the gates) 40 px above them, with its stairs (left 96–176, right 304–384) from `stair(i)` for 30 px, under their signs. Never shorter than the screen.
 * In the 40 px before the gates, the fare adjustment machine (`adjustMachine`) against the right wall; the ticket office (`ticketOffice`) set into the left one beside the gates. main.ts (solids, hotspots, scrolling) relies on these. */
export const corridorLayout=(count:number)=>{const gates=Math.max(260,92+count*72);return {top:52,gates,height:gates+60,stair:(i:number)=>gates-40-(i+1)*72+34}};
/** A fare adjustment machine (のりこし精算機) seen from the front, its body at (x, y) 16 × 30 art px under its yellow 精算 sign 7 px above. */
function adjustMachine(g:CanvasRenderingContext2D,x:number,y:number){
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(x-2,y-7,20,7,'#f2c230');letter(g,x+3,y-7,'精算','#1d2622');
  r(x,y,16,30,'#d8dcd6');r(x,y,16,2,'#3a78c2');r(x+15,y,1,30,'#9aa29a');r(x+2,y+4,12,8,'#173a57');r(x+3,y+5,5,2,'#4dcae3');
  r(x+4,y+16,8,1,'#1d2622');r(x+4,y+15,8,1,'#e2c234');r(x+2,y+23,12,3,'#59625e');r(x-1,y+30,18,2,'#617b68');
}
/** The paid side behind the gates, from above: a long corridor under the tracks, and for each platform a staircase up to it on either side, each under a small sign
 * in its line's colour with its track (the left stairs to the first track, the right ones to the second), the line's name in Japanese and English (all of them, and a stripe
 * of each other colour, where lines share the platform). Drawn once per hub and gates. */
export function makeCorridor(scene:Phaser.Scene,key:string,platforms:Platform[],title:string,accent:string){
  const {top,gates,height,stair}=corridorLayout(platforms.length),texture=mapCanvas(scene,key,480,height);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
  const t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  const dither=(x:number,y:number,w:number,h:number,c:string)=>{for(let j=0;j<h;j++)for(let i=(j+x+y)%2;i<w;i+=2)r(x+i,y+j,1,1,c)};
  // The concrete around the corridor, then the end wall with the station's name, and the floor: pale tiles, a fluorescent light every section, the yellow tactile strip down the middle.
  r(0,0,480,height,'#3d4846');for(let y=0;y<height;y+=12)for(let x=(y/12%2)*20;x<480;x+=40)r(x,y,20,1,'#46524f');
  r(176,top-17,128,17,'#e6e3cc');for(let y=top-10;y<top;y+=8)r(176,y,128,1,'#c9c4a6');for(let x=187;x<304;x+=12)r(x,top-17,1,17,'#c9c4a6');
  r(182,top-15,116,11,'#283e40');r(182,top-5,116,1,accent);g.textAlign='center';t(240,top-14,title,'#fffef2',true);g.textAlign='left';
  r(176,top,128,gates-top,'#d3cfbd');for(let y=top;y<gates;y+=16)for(let x=176;x<304;x+=16){r(x+(y/16%2?8:0),y,8,8,'#cac5b1');r(x,y,16,1,'#bdb8a3')}
  dither(176,top,128,3,'#9a9583');r(175,top,1,gates-top,'#6d7772');r(304,top,1,gates-top,'#6d7772');
  for(let y=gates-94;y>top;y-=72){r(212,y,56,3,'#fffbe0');r(212,y+3,56,1,'#d8d3bd')}
  r(236,top+4,8,gates-top,'#e8c440');for(let y=top+4;y<gates;y+=4)r(237+(y%8<4?0:3),y+1,3,1,'#cfa72c');
  platforms.forEach((platform,i)=>{
    const [line]=platform.lines,colors=[...new Set(platform.lines.map(line=>line.color))],y=stair(i),ink=parseInt(line.color.slice(1,3),16)*.3+parseInt(line.color.slice(3,5),16)*.59+parseInt(line.color.slice(5,7),16)*.11>170?'#1d2622':'#ffffff';
    const ja=platform.lines.map(line=>line.ja).join('・'),en=platform.lines.length>1?platform.lines.map(line=>line.en.replace(/ Line$/,'')).join(' · '):line.en;
    // The tactile strip branches off to each staircase.
    r(176,y+13,60,4,'#e8c440');r(244,y+13,60,4,'#e8c440');for(let x=177;x<304;x+=4)if(x<236||x>=244)r(x+(x%8<4?0:1),y+14,1,2,'#cfa72c');
    for(const left of [true,false]){
      const x0=left?96:304,mouth=left?176:304,out=left?-1:1;
      // Steps rising away from the corridor, lighter towards the platform at the top, a handrail along each side and one down the middle.
      for(let k=0;k<16;k++){const x=mouth+out*(k*5)+(left?-5:0);r(x,y,5,30,['#a9ad9f','#b3b6a8','#bcbfb1','#c6c8ba','#d0d1c3','#d9dacc','#e2e2d5','#ebeade'][k>>1]);r(left?x:x+4,y,1,30,'#7d8279')}
      r(x0,y-1,80,2,'#9aa29a');r(x0,y+29,80,2,'#9aa29a');r(x0,y+14,80,2,'#c9cdc5');r(x0,y+16,80,1,'#7d8279');
      r(left?x0:x0+76,y,4,30,'#fbf8ea');dither(left?x0+4:x0+70,y,6,30,'#fbf8ea');
      // The sign over the stairs: the track in a white square, the line's name beside it.
      const sx=left?104:306;r(sx,y-17,70,15,line.color);colors.slice(1).forEach((color,k)=>r(sx+67-k*3,y-17,3,15,color));r(sx,y-3,70,1,'#1d2622');r(sx+2,y-15,11,11,'#ffffff');
      g.textAlign='center';t(sx+7.5,y-15,String(platform.tracks[left?0:1]),'#1d2622',true);g.textAlign='left';
      t(sx+16,y-16,ja,ink);t(sx+16,y-9,en,ink);
    }
  });
  // The gates seen from the paid side: the cabinets' backs with their green arrows, the concourse beyond, darker.
  r(176,gates,128,60,'#74855e');for(let y=gates;y<height;y+=16)for(let x=176;x<304;x+=16){r(x,y,8,8,'#6e7d5a');r(x+8,y+8,8,8,'#6e7d5a')}
  r(176,gates,128,8,'#d3cfbd');
  for(let x=180;x<304;x+=22){r(x+1,gates+40,8,3,'#4f5a48');r(x,gates+8,8,32,'#d5d8d0');r(x,gates+8,8,3,'#3d4846');r(x+7,gates+11,1,29,'#9aa29a');r(x,gates+22,8,2,'#3a78c2');r(x+2,gates+12,4,3,'#1d2622');r(x+3,gates+13,2,1,'#57c26a')}
  for(let k=0;k<6;k++)dither(176,gates+44+k*3,128,3,['#68745b','#55625b','#3d4846','#2b3431','#1d2622','#1d2622'][k]);
  r(232,gates+2,16,5,'#f2c230');t(234,gates+2,'出口','#1d2622');
  adjustMachine(g,288,gates-36);
  // The ticket office, set into the left wall level with the gates (114–176 × gates-8 to gates+44), as in the concourse beside the central gates: its counters are the staffed window.
  ticketOffice(g,114,gates-8);
  texture.refresh();
}

/** The platform's length in art px: two screens, a staircase at each end (makePlatform). */
export const platformWidth=960;
/** A train from above (makeTrain): `cars` cars of `car` art px with doors at `doors` along each, standing at the platform with its first car's start at `origin`,
 * off the left edge, so that its doors line up with the marks on the platform (doorMarks) and it runs past both ends. */
export const trainLayout=(service:Service)=>service==='shinkansen'?{car:160,doors:[24,136],cars:16,origin:-400}:{car:120,doors:[30,90],cars:12,origin:-240};
/** Where a standing train's doors are along the platform, left to right (art px): the 乗車位置 marks the queues form at. */
export const doorMarks=(service:Service)=>{const {car,doors,cars,origin}=trainLayout(service);return Array.from({length:cars},(_,c)=>doors.map(d=>origin+c*car+d)).flat().filter(x=>x>=10&&x<=platformWidth-10)};
/** A train in `color` (its line's), from above at art scale, its platform side at the bottom (flipped on the far track): grey cars with the line's stripe and their roof units,
 * or the Shinkansen's white cars with a long nose at each end. The doors are pale notches in each side; main.ts opens them over the picture. */
export function makeTrain(scene:Phaser.Scene,key:string,color:string,service:Service){
  const {car,doors,cars}=trainLayout(service),w=car*cars,texture=scene.textures.createCanvas(key,w,30)!,g=texture.context,shinkansen=service==='shinkansen';
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  for(let c=0;c<cars;c++){
    const x=c*car;
    if(shinkansen){r(x+1,1,car-2,28,'#f1f2ec');r(x+1,1,car-2,1,'#b9bcb4');r(x+1,28,car-2,1,'#9aa29a');r(x+1,23,car-2,3,color);r(x+1,4,car-2,1,color);r(x+8,10,car-16,8,'#e1e3dc');for(let k=x+12;k<x+car-12;k+=6)r(k,11,1,6,'#cfd2ca')}
    else{r(x+1,1,car-2,28,'#c9ccc6');r(x+1,0,car-2,1,'#7d8279');r(x+1,29,car-2,1,'#7d8279');r(x+1,25,car-2,2,color);r(x+1,3,car-2,2,color);r(x+6,8,car-12,14,'#b6b9b1');r(x+car/2-11,10,22,10,'#9aa29a');for(let k=x+car/2-9;k<x+car/2+10;k+=3)r(k,11,1,8,'#7d8279')}
    r(x+car-1,7,2,16,'#2b3431');
    for(const d of doors){r(x+d-4,26,8,4,'#e6e8e2');r(x+d,26,1,4,'#9aa29a');r(x+d-4,0,8,3,'#e6e8e2')}
  }
  if(shinkansen)for(let k=0;k<40;k++){const inset=Math.round((40-k)**2/140);for(const x of [k,w-1-k]){g.clearRect(x,0,1,inset);g.clearRect(x,30-inset,1,inset)}}
  else{r(1,4,3,22,'#2b3431');r(w-4,4,3,22,'#2b3431')}
  texture.refresh();
}
/** The station sign (駅名標) in the middle of the platform, posts included (art px): drawn by makePlatform on its own texture, sorted with the people at its posts' feet. */
export const stationSign={x:platformWidth/2-74,y:128,w:148,h:60};
/** The route map board (路線図) standing on the platform, right of the station sign (art px): each face shows the line as seen from the track on that side. */
export const routeBoard={x:platformWidth/2+120,y:152,w:60};
/** The departure boards hanging over the platform (art px, top left of the board itself): near each stairwell, one over each edge, for its track. */
export const platformBoards=[180,platformWidth-180].flatMap(cx=>[{x:cx-42,y:104,track:0 as const},{x:cx-42,y:196,track:1 as const}]);
/** A departure board hanging over the platform, 84 × 18 art px, with its track's number and an arrow to that track above it (`up`) or below; the departures are the scene's text.
 * At twice the art's density, like the maps, for the number's lettering; drawn with 7 px of arrow above the board when `up`. */
export function makeBoard(scene:Phaser.Scene,key:string,track:number,up:boolean){
  const texture=mapCanvas(scene,key,84,25),g=texture.context,a=up?7:0,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(0,a,84,18,'#59625e');r(1,a+1,82,16,'#1b1f1e');r(3,a+3,12,12,'#ffffff');g.textAlign='center';letter(g,9,a+4,String(track),'#1d2622',true);
  for(let k=0;k<6;k++)r(42-k,up?k+1:24-k,1+2*k,1,'#f2c230');
  texture.refresh();
}
/** An island platform from above, `platformWidth` long between its two tracks (the first at the top, 44–88; the second at the bottom, 232–276): each edge with its white line
 * and yellow tactile strip, the 乗車位置 marks where the doors stop (doorMarks: a lane either side of each door, x ±4–18, 98–125 and 196–223), a stairwell down at each end (0–80 and 880–960 × 128–192, open towards the middle), the station
 * sign in the middle (駅名標: the station, the stops either side on `color`, its line's, and their English; 406–554 × 128–188 with its posts), and the shadows of the departure
 * boards hanging over each edge near the stairwells (platformBoards). In art px; main.ts (solids, hotspots, queues) relies on these. */
export function makePlatform(scene:Phaser.Scene,key:string,o:{ja:string;en:string;tracks:[number,number];color:string;prev:string;next:string;prevEn:string;nextEn:string;service:Service}){
  const W=platformWidth,texture=mapCanvas(scene,key,W,320),g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  const dither=(x:number,y:number,w:number,h:number,c:string)=>{for(let j=0;j<h;j++)for(let i=(j+x+y)%2;i<w;i+=2)r(x+i,y+j,1,1,c)};
  // The walls beyond both tracks, then the tracks: ballast, sleepers, rails.
  r(0,0,W,320,'#3d4846');r(0,35,W,9,'#59625e');r(0,276,W,44,'#59625e');for(let x=4;x<W;x+=24){r(x,36,2,8,'#46524f');r(x,277,2,10,'#46524f')}
  for(const top of [44,232]){r(0,top,W,44,'#6f6a5f');dither(0,top,W,44,'#5e5a50');for(let x=0;x<W;x+=8)r(x,top+6,4,32,'#4a4038');for(const y of [top+12,top+30]){r(0,y,W,2,'#b8bcb4');r(0,y+2,W,1,'#2b3431')}}
  // The floor, its edges (white line, then the yellow tactile strip) and the door marks behind them.
  r(0,88,W,144,'#cfcab4');for(let y=88;y<232;y+=16)for(let x=0;x<W;x+=16){r(x,y,16,1,'#c2bda6');r(x,y,1,16,'#c2bda6')}
  r(0,86,W,2,'#8d8a7a');r(0,88,W,3,'#efeee4');r(0,229,W,3,'#efeee4');r(0,232,W,2,'#8d8a7a');
  for(const y of [94,223]){r(0,y,W,3,'#e8c440');for(let x=1;x<W;x+=3)r(x,y+1,1,1,'#cfa72c')}
  // At each door, as on Japanese platforms, two lanes running back from the edge either side of it (the queues' two lines, main.ts slot: door ±11, three rows), the middle kept clear
  // for those getting off; a pale green, quiet beside the tactile strip and clear of the yellow highlights. In each lane a pair of footprints per row, toes to the track.
  for(const x of doorMarks(o.service))for(const top of [true,false]){
    for(const dx of [-18,-4,3,17])r(x+dx,top?98:196,1,27,'#8fc078');
    for(const row of [0,1,2])for(const lane of [-13,8]){const y=top?99+row*9:217-row*9;for(const foot of [0,3]){r(x+lane+foot,top?y:y+2,2,3,'#8fc078');r(x+lane+foot,top?y+4:y,2,1,'#8fc078')}}
  }
  // A stairwell at each end: steps going down towards the end, darker as they go, railed on three sides, the yellow sign over the mouth.
  for(const left of [true,false]){
    const mouth=left?80:W-80;
    for(let k=0;k<16;k++)r(left?mouth-5-k*5:mouth+k*5,128,5,64,['#bdb9a6','#b0ac99','#a39f8d','#969281','#898575','#7c7869','#6f6b5e','#625f53'][k>>1]);
    r(left?0:mouth-2,126,82,2,'#9aa29a');r(left?0:mouth-2,192,82,2,'#9aa29a');r(left?0:W-2,126,2,68,'#9aa29a');
    r(left?24:mouth,118,56,8,'#f2c230');g.textAlign='center';t(left?52:mouth+28,119.5,'↓ 出口・のりかえ','#1d2622');g.textAlign='left';
  }
  // The station sign stands on its own texture (`<key>-sign`, stationSign), so that people pass behind it; its posts' shadow on the floor.
  r(stationSign.x+6,186,140,3,'#bdb8a3');
  {const sign=mapCanvas(scene,key+'-sign',stationSign.w,stationSign.h),g=sign.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y-128,w,h)},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y-128,text,c,big);
  // The station sign (駅名標) on its posts: the name over its romaji, then the stops either side on the line's colour, in the big lettering when they fit, their English under it.
  const ink=parseInt(o.color.slice(1,3),16)*.3+parseInt(o.color.slice(3,5),16)*.59+parseInt(o.color.slice(5,7),16)*.11>170?'#1d2622':'#ffffff';
  const width=(text:string,big:boolean)=>[...text].reduce((w,c)=>w+(c.charCodeAt(0)<128?.5:1)*(big?10:5),0),prev=o.prev&&'← '+o.prev,next=o.next&&o.next+' →',big=width(prev+next,true)<=136;
  const sx=0,W=stationSign.w;
  r(sx+8,174,3,14,'#7d8279');r(sx+137,174,3,14,'#7d8279');r(sx,128,148,46,'#fbfaf2');r(sx,128,148,1,'#9aa29a');r(sx,173,148,1,'#9aa29a');r(sx,151,148,12,o.color);
  g.textAlign='center';t(W/2,130,o.ja,'#1d2622',true);t(W/2,142,o.en.toUpperCase(),'#59625e');
  g.textAlign='left';t(sx+3,big?152:155,prev,ink,big);t(sx+3,165.5,o.prevEn,'#59625e');g.textAlign='right';t(sx+145,big?152:155,next,ink,big);t(sx+145,165.5,o.nextEn,'#59625e');g.textAlign='left';
  sign.refresh()}
  // The route map (路線図), a low board standing on the platform, read from either side (routeBoard).
  {const {x,y,w}=routeBoard;r(x+2,y+12,w,3,'#bdb8a3');r(x,y,w,12,'#283e40');r(x+2,y+2,w-4,8,'#efeee4');r(x+4,y+8,w-8,1,o.color);for(let k=x+6;k<x+w-4;k+=8)r(k,y+7,2,3,o.color);g.textAlign='center';t(x+w/2,y+2,'路線図','#1d2622');g.textAlign='left'}
  // The shadows of the departure boards hanging over each edge (platformBoards; the boards themselves hang over the people, drawn by makeBoard).
  for(const {x,y} of platformBoards)r(x+4,y+20,84,4,'#bdb8a3');
  texture.refresh();
}
