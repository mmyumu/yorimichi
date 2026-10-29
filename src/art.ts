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
  makeCommuters(scene);makePhone(scene);makeCar(scene);makeHomeStreet(scene);makeApartment(scene);
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
    r(0,35,480,285,'#cfd2cb');for(let y=35;y<320;y+=16)for(let x=0;x<480;x+=16){r(x,y,8,8,'#c4c8c0');r(x+8,y+8,8,8,'#c4c8c0');r(x,y,16,1,'#b1b5ad');r(x,y,1,16,'#b1b5ad')}
    // Past the gates: the paid side's corridor running on towards the platforms, fading into the distance.
    const paid=(x:number,w:number)=>{
      tiles(x,23,w,23,true);r(x,44,w,26,'#cfd2cb');for(let y=44;y<70;y+=8)for(let xx=x;xx<x+w;xx+=16)r(xx+(y/8%2?8:0),y,8,8,'#c4c8c0');
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
/** The shops across the town's road (makeTown): width, roof, awning and back wall. */
const townShops=[[70,'#7a6a5c','#b45843','#cfc3ab'],[56,'#5d6a62','#3a78c2','#d8d3c4'],[84,'#8a7f6a','#2c8a4a','#c9bfa8'],[62,'#6e5a52','#e8c440','#ddd5c2'],[90,'#5f6e6a','#d24a3a','#cdc5b0'],[64,'#7d7262','#6c78b8','#d6cdb8'],[54,'#66705f','#e8853a','#c9c1ab']] as const;
/** The windows in the backs of those shops (art px, x y w h), some of which main.ts lights at night. */
export const townWindows:[number,number,number,number][]=[];
{let x=0;for(const [w] of townShops){for(let wx=x+9;wx+12<=x+w-6;wx+=22)townWindows.push([wx,291,12,9]);x+=w}}
/** The street lights on the town's far pavement (art px, their post's left edge; the post's foot at 259, its lamp at x + 6–14, y 212–216): main.ts lights them and keeps walkers off their feet. */
export const townLights=[60,160,370,446];
/** The street outside a station, shared by every exit without a map of its own: the station front with its entrance under the sign (`title` over `subtitle`, underlined in `accent`),
 * a konbini beside it (the same shop for every chain, under the sign of `konbini`), a plaza with vending machines, planters, the area map and a bus stop, the road and its crossing, and the shops across it. Drawn once per station and exit, when first needed.
 * In art px: front 0–112 (entrance 196–284; konbini 334–480, sign 58–80, door 338–364), area map 118–152 × 108–144, planters at 76 and 300 (145–160), vending machines 390–432 × 109–138, konbini bins 366–386 × 112–122,
 * bus stop at 455, road 199–247, street lights (townLights) on the far pavement, shops from 262; with `lane` (the street the traveller lives off, see `home` in network.ts), the blue 東中野一丁目 sign at the plaza's left edge
 * (1–45 × 140–153, its post to 178) pointing to the home street. main.ts (solids, hotspots) relies on these. */
export function makeTown(scene:Phaser.Scene,key:string,title:string,subtitle:string,accent:string,konbini:Konbini,lane=false){
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
  // Two vending machines against the konbini's front, between its bins and the ATM.
  for(const [x,c,top] of [[390,'#d24a3a','#e47a6a'],[412,'#3a78c2','#6f9fd8']] as const){r(x,109,20,3,top);r(x,112,20,24,c);r(x,112,20,.5,'#00000040');r(x+2,114,16,10,'#e8eef0');for(let k=0;k<8;k++)r(x+3+(k%4)*4,115+Math.floor(k/4)*5,2,4,['#d2402e','#3c9a5c','#e8c440','#f4f4ee'][k%4]);r(x+13,127,4,5,'#283e40');r(x+3,132,10,2,'#283e40');r(x+1,136,20,2,'#74855e')}
  // The area map (makeAreaMap, small): its dark frame on two posts, the two white panels ringed in blue, the map with its streets, the railway, the river, a park (its picture window, areaMapFace), the legend, the current spot in red.
  r(118,108,2,36,'#3a2e27');r(150,108,2,36,'#3a2e27');r(118,108,34,28,'#3a2e27');r(118,108,34,.5,'#5a4a3e');r(119,144,4,1,'#00000030');r(151,144,4,1,'#00000030');
  for(const y of [109,112.5]){r(120,y,30,3,'#fbfbf6');r(120.5,y+.5,29,2,'#1d5fae');r(121,y+1,28,1,'#fbfbf6');r(121.5,y+1,1.5,1,'#1d5fae');r(124,y+1,10,.5,'#1d5fae');r(124,y+1.5,5,.5,'#6f93c4');r(143,y+1,3,.5,'#1d5fae')}
  r(120,116,30,18,'#d9cfa3');r(144,116,6,18,'#fbfbf6');for(let y=117;y<133;y+=2)r(145,y,1,1,['#d6402e','#2b2b2b','#1d5fae','#00a040'][y%4/2|0]),r(146.5,y+.25,3,.5,'#9a9380');
  r(120,118,24,1,'#2b2b2b');r(126,117,12,3,'#b4b9bc');r(120,122,24,1,'#f7f5ec');for(const x of [124,130.5,137])r(x,123,.5,11,'#f7f5ec');r(120,128,24,.5,'#f7f5ec');
  r(131,124.5,5,3,'#9cc76f');for(let x=120;x<144;x+=.5)r(x,Math.round((130.5+Math.sin(x/3))*2)/2,.5,1,'#5b9bd5');r(127.5,120.5,1.5,1.5,'#d6402e');
  // The konbini's bins by its door.
  for(const [x,c] of [[366,'#3a78c2'],[377,'#2c8a4a']] as const){r(x,112,9,10,'#aeb4b0');r(x+1,112,7,2,c);r(x+3,115,3,1,'#283e40');r(x,122,9,1,'#8e9476')}
  // Planters with trees, and the bus stop on the right.
  // In the three-quarter view: the planter's far rim, its soil with the trunk sunk into it, the near rim over its front; a round crown lit from the top left.
  for(const x of [76,300]){
    r(x+2,160,28,3,'#00000030');r(x,151,28,9,'#8b7d63');r(x,151,28,1,'#776a53');r(x,145,28,2,'#ab9b78');r(x,145,2,6,'#ab9b78');r(x+26,145,2,6,'#9d8e6d');r(x+2,147,24,4,'#5a4636');
    for(let k=0;k<6;k++)r(x+3+Math.floor(rand()*22),147+Math.floor(rand()*3),1,1,'#6e5643');
    r(x+12,134,4,15,'#69533f');r(x+13,136,1,12,'#8a6c50');r(x+11,148,6,1,'#46362a');r(x,150,28,1.5,'#c2b08a');
    for(let yy=-14;yy<=13;yy++)for(let xx=-16;xx<=16;xx++){const d=Math.hypot(xx/16,yy/13.5),light=(-xx*.5-yy)/20+(rand()-.5)*.35;if(d>1-rand()*.08)continue;
      r(x+14+xx,130+yy,1,1,d>.86&&yy>2?'#345d48':light>.45?'#86a367':light>.05?'#63905b':light>-.4?'#487951':'#345d48')}
  }
  r(455,142,2,42,'#4c6156');r(448,132,16,12,'#3a78c2');
  // The way home: the blue address sign (住居表示) on its post at the plaza's left edge, an arrow to the lane; the post's shadow here, the sign itself on its own texture (laneSign),
  // its board 140–153 over its post to 178 (art px), which main.ts puts in front of whoever walks behind its foot.
  if(lane){r(9,177,4,1,'#00000030');if(!scene.textures.exists('lane-sign')){const sign=mapCanvas(scene,'lane-sign',46,38),s=sign.context,p=(x:number,y:number,w:number,h:number,c:string)=>{s.fillStyle=c;s.fillRect(x,y-140,w,h)};
    p(10,153,2,25,'#5b6558');p(1,140,44,13,'#fbfbf6');p(1.5,140.5,43,12,'#1d5fae');letter(s,3,1.5,'←東中野一丁目','#ffffff');letter(s,5,7,'HIGASHINAKANO 1','#d8e4f4');sign.refresh()}}
r(450,134,12,8,'#fffef2');r(454,136,4,4,'#3a78c2');r(451,184,10,3,'#5b6558');
  // The kerb, the road with its centre line and the crossing straight ahead, the far pavement.
  r(0,196,480,3,'#e0dccb');r(0,199,480,48,'#5d625c');for(let i=0;i<300;i++)r(Math.floor(rand()*480),199+Math.floor(rand()*48),1,1,'#6b706a');
  for(let x=0;x<480;x+=32)if(x<196||x>276)r(x,222,16,2,'#e6e3cc');for(let x=206;x<274;x+=8)r(x,202,5,42,'#e6e3cc');
  r(0,247,480,3,'#e0dccb');r(0,250,480,12,'#bdb59a');for(let x=0;x<480;x+=16)r(x,250,1,12,'#a9a187');
  // The street lights on the far pavement (townLights): a grey post, the lamp at the end of its arm, the light falling on the pavement under it.
  for(const lx of townLights){r(lx-1,259,5,1,'#00000030');r(lx,214,2,45,'#9a9c94');r(lx+.5,214,.5,45,'#b8bab2');r(lx-1,256,4,3,'#7d7f78');r(lx+2,213,6,1.5,'#9a9c94');r(lx+6,212,8,3,'#5b6558');r(lx+7,215,6,1,'#fff6d0')}
  // The shops across the road, in the same three-quarter view as the rest, turned away from us: their awnings over the far pavement, the flat roofs behind their parapets
  // with the plant on them, and the backs of the buildings with their upper windows (townWindows, lit at night) and the outdoor units of their air conditioning.
  let x=0;for(const [w,roof,awning,wall] of townShops){
    r(x,262,w,5,awning);for(let k=x;k<x+w;k+=8)r(k,262,4,5,'#fffef2aa');r(x,267,w,1,'#00000040');
    r(x,268,w,16,roof);r(x,268,w,1,'#ffffff30');r(x,282,w,2,'#ffffff40');
    if(w>60){r(x+w-22,270,12,8,'#c9cdd0');r(x+w-22,270,12,1,'#e8eef0');r(x+w-19,272,5,5,'#5b6265')}else{r(x+10,269,9,10,'#aeb4b0');r(x+10,269,9,2,'#c9cdd0');r(x+13,279,3,3,'#5b6558')}
    r(x,284,w,36,wall);r(x,284,w,3,'#00000033');r(x+3,287,1.5,33,'#9a9c94');
    for(const [wx,wy,ww,wh] of townWindows)if(wx>=x&&wx<x+w){r(wx-1,wy-1,ww+2,wh+2,'#8f8a7c');r(wx,wy,ww,wh,'#476e79');r(wx+1,wy+1,ww-2,2,'#9ebcb4');r(wx+ww/2,wy,.5,wh,'#cfc8ad');r(wx,wy+wh+5,ww,7,'#d8dcdc');r(wx,wy+wh+5,ww,1,'#eef0f0');r(wx+4,wy+wh+7,5,4,'#7d8a84')}
    r(x+w-1,262,1,58,'#3b4541');x+=w;
  }
  texture.refresh();
}

/** The home street's length in art px (shown at 2×, scrolling sideways like the platform): a screen and a half. */
export const homeStreetWidth=720;
/** The utility poles along the far side of the home street (art px, the pole's left edge, as makeHomeStreet lays them out before its mirror). */
const homePoles=[150,388,560];
/** Their street lights, in the street as shown (art px): main.ts lights the lane under them at night. */
export const homeLights=homePoles.map(x=>homeStreetWidth-x-14);
/** The windows of the home street lit at night (art px, x y w h), gathered as makeHomeStreet draws them. */
export const homeWindows:[number,number,number,number][]=[];
/** The lane from Higashi-Nakano's west exit to the traveller's home, 720 × 320 art px, in the street's three-quarter view. Out of the station's street by its left edge, the lane
 * comes in from the right: it is laid out below with the station's end on the left, then mirrored (x → 720 − x) but for its lettering. Along the far side, houses behind their block walls
 * (facades 35–92, walls 92–114), a coin park, a pair of vending machines, and at the right end the apartment block コーポ ヨリミチ (592–720: the outside stairs on its left, the
 * doors 101–103 at 632, 660 and 688, 14 × 30 from y 82, the traveller's 102 in the middle, the mailboxes at 706); the lane 114–196 with its white edge lines and the utility poles
 * (homePoles) on its far edge; the near side's block wall from 196 and the houses behind it (roofs 214–268, back walls from 269), broken by a side street (300–340) with its とまれ; at the left end, the green
 * 東中野駅 sign on the wall (2–50 × 100–113), the way back to the station. main.ts (solids, hotspots, lamps) relies on these, mirrored: door 102 at 46–60, the sign at 670–718. */
function makeHomeStreet(scene:Phaser.Scene){
  const W=homeStreetWidth,texture=mapCanvas(scene,'map-home-street',W,320),g=texture.context;
  // The lettering is kept for after the mirror, to be written the right way round where it ends up.
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},words:[number,number,string,string,boolean,CanvasTextAlign][]=[],t=(x:number,y:number,text:string,c:string,big=false)=>{words.push([x,y,text,c,big,g.textAlign])};
  let seed=57;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  // The roofs beyond, under the top band.
  r(0,0,W,24,'#6d7a72');for(let x=0;x<W;x+=30+Math.floor(rand()*30))r(x,0,1,24,'#58645d');
  // Block walls: grey concrete blocks with their mortar lines, a lighter coping on top.
  const blocks=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#bdb7a6');r(x,y,w,2,'#d6d0bf');for(let yy=y+2,k=0;yy<y+h;yy+=5,k++){r(x,yy+4.5,w,.5,'#a29c8c');for(let xx=x+(k%2)*5;xx<x+w;xx+=10)r(xx,yy,.5,5,'#a29c8c')}};
  const glazing=(x:number,y:number,w:number,h:number,lit:boolean)=>{r(x-1,y-1,w+2,h+2,'#8f8a7c');r(x,y,w,h,'#476e79');r(x+1,y+1,w-2,3,'#9ebcb4');r(x+w/2,y,.5,h,'#cfc8ad');if(lit)homeWindows.push([W-x-w,y,w,h])};
  // The far side: houses, the coin park, the vending machines.
  const house=(x:number,w:number,wall:string,roof:string)=>{
    r(x,22,w,14,roof);for(let y=24;y<36;y+=3)r(x,y,w,1,'#00000022');r(x,35,w,2,'#3b4541');r(x+2,37,w-4,58,wall);r(x+2,37,1,58,'#ffffff40');
    glazing(x+10,44,18,12,rand()<.5);glazing(x+w-28,44,18,12,rand()<.5);glazing(x+8,70,16,12,rand()<.3);
    r(x+w/2-6,68,12,24,'#806049');r(x+w/2-5,69,10,22,'#94704f');r(x+w/2+3,80,1.5,1.5,'#e8c440');r(x+w/2-8,66,16,2,'#5d6a62');
    r(x+w-20,78,13,9,'#e8eef0');for(let k=0;k<4;k++)r(x+w-18+k*3,80,1,5,'#aeb4b8');
    blocks(x,92,w,22);const gx=x+w/2-9;r(gx,92,18,22,'#a39d8d');for(let y=94;y<114;y+=4)r(gx,y,18,.5,'#8e887a');
    for(let k=0;k<6;k++)r(gx+1+k*3,98,1,10,'#5b6558');r(gx,98,18,1,'#5b6558');r(gx,107,18,1,'#5b6558');r(gx+20,98,6,5,'#d6402e');r(gx+20,98,6,1,'#a52f22');
    r(x+4,105,7,8,'#8b5a3c');r(x+3,99,9,7,'#487951');r(x+5,98,4,3,'#63905b');
  };
  const park=(x:number,w:number)=>{
    // The coin park in the street's three-quarter view, shallow: the building beyond and the block wall at the back, the asphalt with its bays, their wheel stops and lock flaps,
    // two cars parked nose in (seen from behind and above), the pay machine against the wall, the P sign on its post.
    r(x,22,w,14,'#7a6a5c');for(let y=24;y<36;y+=3)r(x,y,w,1,'#00000022');r(x,35,w,2,'#3b4541');r(x,37,w,35,'#d8d3c4');glazing(x+10,42,14,9,rand()<.5);glazing(x+44,42,14,9,rand()<.5);glazing(x+27,58,14,9,rand()<.3);
    blocks(x,70,w,10);r(x,80,w,32,'#74786f');for(let i=0;i<60;i++)r(x+Math.floor(rand()*w),80+Math.floor(rand()*32),1,1,i%2?'#7e8279':'#696d65');r(x,80,w,2,'#00000030');
    for(let k=0;k<4;k++)r(x+2+k*22,82,1,28,'#e6e3cc');
    for(let k=0;k<3;k++){const bx=x+3+k*22;r(bx+5,83,11,2,'#c9c2b0');r(bx+5,85,11,1,'#9e9784');r(bx+8,106,5,2,'#9aa0a4');r(bx+8,108,5,.5,'#5b6265')}
    const car=(cx:number,body:string,side:string)=>{
      r(cx-1,103,20,3,'#00000035');r(cx+2,76,14,2,body);r(cx+2,78,14,2,'#55798a');r(cx+1,80,16,6,'#eef0f2');r(cx+1,80,16,1,'#ffffff');r(cx-1,83,2,2,body);r(cx+17,83,2,2,body);
      r(cx+1,86,16,5,'#3e5d6e');r(cx+2,87,6,1,'#9ebcb4');r(cx,91,18,2,body);r(cx,93,18,7,side);r(cx,93,1,7,'#00000025');r(cx+17,93,1,7,'#00000025');
      r(cx+1,94,3,2,'#d6402e');r(cx+14,94,3,2,'#d6402e');r(cx+6,96,6,3,'#fbfbf6');r(cx+7,97,4,1,'#2c8a4a');r(cx,100,18,2,'#6f767a');r(cx+1,102,3,2,'#2b2b2b');r(cx+14,102,3,2,'#2b2b2b');
    };
    car(x+5,'#e2e5e8','#c4c9cd');car(x+49,'#4f6f9c','#3f5a82');
    r(x+30,78,8,2,'#f2d46a');r(x+30,80,8,11,'#e8c440');r(x+31,82,6,3,'#283e40');r(x+32,87,4,1,'#5b6558');r(x+30,91,8,1,'#00000035');
    r(x+66,62,2,20,'#5b6558');r(x+59,49,15,15,'#fbfbf6');r(x+60,50,13,13,'#1d5fae');t(x+64,51.5,'P','#ffffff',true);r(x+65,82,4,1,'#00000035');
    r(x,111,w,1,'#e8c440');
  };
  const vending=(x:number,w:number)=>{
    r(x,22,w,14,'#7d7262');r(x,35,w,2,'#3b4541');r(x+2,37,w-4,58,'#cfc8ad');glazing(x+20,46,20,12,true);blocks(x,92,4,22);blocks(x+w-4,92,4,22);r(x+4,92,w-8,22,'#a39d8d');
    for(const [vx,c] of [[x+8,'#d24a3a'],[x+31,'#f4f4ee']] as const){r(vx,79,21,3,vx<x+20?'#e47a6a':'#ffffff');r(vx,82,21,.5,'#00000040');r(vx,82,21,30,c);r(vx+2,84,17,12,'#e8eef0');for(let k=0;k<10;k++)r(vx+3+(k%5)*3,85+Math.floor(k/5)*6,2,5,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#e8853a'][k%5]);r(vx+14,99,4,6,'#283e40');r(vx+3,106,11,3,'#283e40');r(vx+1,112,21,2,'#74855e')}
    r(x+54,104,6,8,'#3a78c2');r(x+54,104,6,2,'#2c5a94');
  };
  let x=0;
  for(const [w,kind,wall,roof] of [[92,'house','#e3dccb','#5d6a62'],[78,'house','#cdbfa4','#7a5a4a'],[104,'house','#d8d3c4','#4f5f6e'],[70,'park','',''],[86,'house','#e8e0cf','#6e5a52'],[60,'vending','',''],[96,'house','#d4c8b0','#5a6658']] as const){
    if(kind==='house')house(x,w,wall,roof);else if(kind==='park')park(x,w);else vending(x,w);x+=w;
  }
  r(586,22,6,92,'#487951');r(587,30,4,80,'#63905b');
  // The apartment block: two floors of pale tiles under its flat roof, the name plate, the outside corridor upstairs behind its railing, the doors downstairs, the stairs on the left.
  const a=592;r(a,0,128,10,'#6f766f');r(a,10,128,104,'#e2d6c2');for(let y=12;y<112;y+=4)r(a,y,128,.5,'#d2c5ae');r(a,10,128,2,'#bfb29b');
  for(const wx of [632,660,688])glazing(wx+1,16,12,9,wx!==660);
  r(a+40,61,56,9,'#5a4a3e');r(a+40,61,56,.5,'#7d6a58');g.textAlign='center';t(a+68,63,'コーポ ヨリミチ','#fbf3dc');g.textAlign='left';
  for(const dx of [632,660,688]){r(dx,38,14,18,'#7d8a84');r(dx+11,47,1.5,1.5,'#e8c440')}
  r(a+24,54,104,3,'#aeab94');r(a+24,57,104,1,'#8f8a7c');r(a+24,46,104,1.5,'#5b6558');for(let bx=a+26;bx<a+128;bx+=4)r(bx,47,.5,7,'#5b6558');
  for(const [k,dx] of [632,660,688].entries()){
    r(dx-1,81,16,31,'#3b4541');r(dx,82,14,30,'#6f7d78');r(dx+1,83,12,28,'#7d8a84');r(dx+11,97,1.5,1.5,'#e8c440');
    r(dx+2,74,10,6,'#fbfbf6');r(dx+2,74,10,.5,'#9aa29a');g.textAlign='center';t(dx+7,74.5,`10${k+1}`,'#283e40');g.textAlign='left';r(dx-6,76,3,3,'#fff6d0');
  }
  for(let k=0;k<13;k++){const sx=a+3+k*1.6,sy=108-k*4.2;r(sx,sy,9,1.5,'#aeab94');r(sx,sy+1.5,9,.5,'#7d7f78')}r(a+2,52,1,60,'#5b6558');r(a+13,52,1,60,'#5b6558');for(let k=0;k<13;k++)r(a+3+k*1.6,104-k*4.2,.5,5,'#5b6558');
  r(706,84,12,16,'#c9cdd0');for(let k=0;k<6;k++)r(707+(k%2)*5.5,85+Math.floor(k/2)*5,4.5,4,'#9aa0a4');
  // Two bicycles under the stairs.
  for(const bx of [a+16,a+26])for(const cx of [bx,bx+8]){for(let y=-3;y<=3;y++)for(let xx=-3;xx<=3;xx++){const d=Math.hypot(xx,y);if(d>2.2&&d<=3.2)r(cx+xx,107+y,1,1,'#2b2b2b')}r(bx,105,8,.5,'#3a78c2');r(bx+6,102,1,3,'#2b2b2b')}
  r(a,112,128,3,'#b5ae90');
  // The lane: asphalt, its white edge lines, a manhole, and the side street crossing the near side with its stop line and とまれ.
  r(0,114,W,82,'#666a64');for(let i=0;i<650;i++)r(Math.floor(rand()*W),114+Math.floor(rand()*82),1,1,i%2?'#727670':'#5c605a');
  r(0,118,W,1,'#e6e3cc');for(const [x0,x1] of [[0,300],[340,W]])r(x0,192,x1-x0,1,'#e6e3cc');
  for(let y=-5;y<=5;y++)for(let xx=-5;xx<=5;xx++){const d=Math.hypot(xx,y);if(d<=5)r(222+xx,156+y,1,1,d>4.2?'#4a4e48':(xx+y)%2?'#7d817a':'#6b6f68')}
  r(300,192,40,128,'#666a64');for(let i=0;i<200;i++)r(300+Math.floor(rand()*40),196+Math.floor(rand()*124),1,1,'#727670');r(302,196,1,124,'#e6e3cc');r(337,196,1,124,'#e6e3cc');
  r(303,202,34,2,'#fbfbf6');g.textAlign='center';t(320,206,'とまれ','#fbfbf6',true);g.textAlign='left';
  // The near side: the block wall along the lane and its hedges, then the houses beyond, turned away from the lane, in the same three-quarter view: the far slope of their tiled roofs,
  // the ridge, the near slope down to the gutter, and their back walls with the upstairs windows (lit at night), an air conditioner's outdoor unit and a drainpipe.
  for(const [x0,w,roof,wall] of [[0,74,'#6e5a52','#d8d3c4'],[74,112,'#5d6a62','#e3dccb'],[186,114,'#7a6a5c','#cdbfa4'],[340,92,'#66705f','#e8e0cf'],[432,98,'#8a7f6a','#d4c8b0'],[530,92,'#5f6e6a','#ddd5c2'],[622,98,'#7d7262','#cfc3ab']] as const){
    blocks(x0,196,w,8);r(x0,204,w,10,'#487951');for(let k=0;k<w;k+=3)r(x0+k,204+(k*7)%8,2,2,'#63905b');
    const hx=x0+3,hw=w-6;r(x0,214,w,106,'#3f4a44');
    r(hx,214,hw,12,roof);r(hx,214,hw,12,'#00000038');r(hx,226,hw,2,'#ffffff45');r(hx,228,hw,40,roof);for(let y=232;y<268;y+=4)r(hx,y,hw,1,'#00000026');r(hx,266,hw,3,'#3b4541');
    r(hx,269,hw,51,wall);r(hx,269,hw,3,'#00000030');r(hx+hw-5,272,1.5,48,'#9a9c94');
    glazing(hx+8,280,16,11,rand()<.45);glazing(hx+hw-28,280,16,11,rand()<.45);if(hw>100)glazing(hx+hw/2-8,280,16,11,rand()<.45);
    r(hx+8,298,14,9,'#d8dcdc');r(hx+8,298,14,1,'#eef0f0');for(let y=-2;y<=2;y++)for(let xx=-2;xx<=2;xx++)if(Math.hypot(xx,y)<=2.4)r(hx+13+xx,302.5+y,1,1,'#7d8a84');
  }
  // The utility poles on the far edge, the wires between them, a street light on each.
  r(0,31,W,.5,'#2b2b2b');r(0,34,W,.5,'#2b2b2b');
  for(const px of homePoles){r(px-1,118,7,2,'#00000030');r(px,24,4,96,'#9a9c94');r(px+1,24,1,96,'#b8bab2');r(px-8,30,20,2,'#7d7f78');r(px+4,40,6,8,'#8e918a');for(let k=0;k<4;k++)r(px,100+k*2,4,1,k%2?'#2b2b2b':'#e8c440');r(px+4,62,10,1.5,'#5b6558');r(px+11,62,6,3,'#fff6d0')}
  // The way back: the green station sign on the wall at the left end.
  r(26,113,2,6,'#5b6558');r(2,100,48,13,'#fbfbf6');r(2.5,100.5,47,12,'#2c8a4a');t(4,101.5,'東中野駅→','#ffffff');t(5,107,'STATION','#d8f0de');
  // The mirror, then the lettering: a left edge becomes a right one.
  const copy=document.createElement('canvas');copy.width=g.canvas.width;copy.height=g.canvas.height;copy.getContext('2d')!.drawImage(g.canvas,0,0);
  g.save();g.setTransform(-1,0,0,1,g.canvas.width,0);g.drawImage(copy,0,0);g.restore();
  for(const [x,y,text,c,big,align] of words){g.textAlign=align==='center'?'center':'right';letter(g,W-x,y,text,c,big)}g.textAlign='left';
  texture.refresh();
}
/** The apartment's windows, in the faces of the bedroom's and the living room's back walls (art px, x y w h): main.ts darkens them at night. */
export const apartmentWindows=[[118,50,40,18],[214,48,86,26]] as const;
/** The apartment, 102 of コーポ ヨリミチ, a 1LDK in the street's three-quarter view (480 × 416 art px, scrolling up and down): walls 6 px thick seen from above, the back
 * wall of each room showing its 28 px face, the furniture sized to the traveller (16 × 24). Its rooms (floors, art px): the bedroom (70–192 × 74–232) and, through the sliding door
 * in their wall (192–198 × 192–228), the living room with its open kitchen (LDK, 198–410 × 74–272); out of the LDK's door (206–232) the entrance corridor (198–240 × 306–402),
 * the genkan at its foot (from 370) by the front door in the bottom wall (206–232); off the corridor on the left the washroom (134–192 × 266–346, door 306–340) and the
 * bath beyond its glass door (70–128, door 300–330), on the right the toilet (246–294 × 306–356, door 314–346). The sofa, the kitchen island and the fridge stand in the room
 * (apartmentProps, sorted with the traveller); apartmentSolids are what cannot be walked on. */
export const apartmentSolids:[number,number,number,number][]=[
  [0,0,480,74],[0,0,70,416],[410,0,70,416],[192,0,6,192],[192,228,6,78],[192,340,6,76],[70,232,122,34],[128,266,6,34],[128,330,6,16],[0,346,198,70],
  [198,272,8,34],[232,272,178,34],[300,272,110,144],[240,306,6,8],[240,346,6,70],[294,272,6,90],[246,356,54,60],[192,402,54,14],
  // The bed and its nightstand, the desk and its chair, a plant; the TV board, the low table, the sofa, a plant, the island, the bins, the fridge; the vanity, the washing machine, the tub; the toilet; the shoe cabinet.
  [78,74,26,42],[106,74,10,10],[70,140,28,40],[72,216,14,14],[330,74,60,14],[340,104,40,18],[326,136,68,16],[198,74,14,14],[280,208,100,12],[380,240,8,28],[392,256,18,16],[140,266,24,14],[168,266,22,22],[74,266,50,30],[262,300,16,24],[228,372,12,26]];
/** The furniture standing in the LDK, each on its own texture (`apartment-<name>`) whose foot is at `base` (art px): drawn in front of whoever stands behind it. */
export const apartmentProps=[{name:'sofa',x:326,top:120,w:68,base:152},{name:'island',x:280,top:194,w:100,base:220},{name:'fridge',x:392,top:224,w:18,base:272}] as const;
function makeApartment(scene:Phaser.Scene){
  const texture=mapCanvas(scene,'map-apartment',480,416),g=texture.context;let c=g;
  const r=(x:number,y:number,w:number,h:number,color:string)=>{c.fillStyle=color;c.fillRect(x,y,w,h)};
  const wood=(x:number,y:number,w:number,h:number,base:string,line:string)=>{r(x,y,w,h,base);for(let px=x,k=0;px<x+w;px+=8,k++){r(px,y,.5,h,line);for(let py=y+(k%3)*14;py<y+h;py+=40)r(px,py,8,.5,line)}};
  const tiles=(x:number,y:number,w:number,h:number,base:string,line:string,step=8)=>{r(x,y,w,h,base);for(let py=y;py<y+h;py+=step)r(x,py,w,.5,line);for(let px=x;px<x+w;px+=step)r(px,y,.5,h,line)};
  // A wall's face: the paper, a shadow under the ceiling, the skirting board.
  const face=(x:number,y:number,w:number,paper='#efe8d8')=>{r(x,y,w,28,paper);r(x,y,w,2,'#d6ccb8');r(x,y+25,w,3,'#a58766');r(x,y+25,w,.5,'#c4a682')};
  const top=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#4a4440');r(x,y,w,.5,'#655d56')};
  const shadow=(x:number,y:number,w:number,h=2)=>r(x,y,w,h,'#00000024');
  r(0,0,480,416,'#24211f');
  // The floors: oak in the rooms and the corridor (through the LDK's door), pale tiles in the wet rooms, grey stone in the genkan a step down.
  wood(70,74,122,158,'#d0a774','#bb925f');wood(198,74,212,198,'#c99a62','#b5874f');wood(198,272,42,98,'#c99a62','#b5874f');
  tiles(70,266,58,80,'#c9d6dc','#b4c3ca');tiles(134,266,58,80,'#e2e4df','#d0d3cc');tiles(246,306,48,50,'#e2e4df','#d0d3cc');
  tiles(198,370,42,32,'#8e918a','#7d807a',10);r(198,368,42,2,'#6f6a60');
  // The thresholds of the doors in the side walls: the bedroom's sliding door, the washroom's and the toilet's, the bath's glass door.
  r(192,192,6,36,'#c99a62');r(192,306,6,34,'#e2e4df');r(240,314,6,32,'#e2e4df');r(128,300,6,30,'#bcd6de');
  for(const [x,y,h] of [[192,192,36],[192,306,34],[240,314,32],[128,300,30]])r(x,y,6,1,'#7d5e40'),r(x,y+h-1,6,1,'#7d5e40');
  // The walls' faces: the bedroom's and the LDK's at the back, the bath's and the washroom's, the corridor's either side of the LDK's door, the toilet's.
  face(70,46,122);face(198,46,212);face(70,238,58,'#e4ecee');face(134,238,58);face(198,278,8);face(232,278,8);face(246,278,48);
  // The LDK's door seen from the corridor: its frame round the doorway.
  r(205,278,1.5,28,'#7d5e40');r(230.5,278,1.5,28,'#7d5e40');r(205,278,27,1.5,'#7d5e40');
  // The windows: the bedroom's between pale green curtains, the LDK's down to the floor onto the balcony and its railing, light falling on the floors.
  {const [x,y,w,h]=apartmentWindows[0];r(x-1,y-1,w+2,h+2,'#d8d2c4');r(x,y,w,h,'#9fd0e8');r(x,y+h-5,w,5,'#c3e2ee');r(x+w/2,y,1,h,'#d8d2c4');for(const cx of [x-6,x+w])r(cx,y-2,6,h+5,'#9cbf9a'),r(cx+2,y-2,1,h+5,'#86aa84');r(x+2,y+2,6,1,'#ffffff')}
  {const [x,y,w,h]=apartmentWindows[1];r(x-1,y-1,w+2,h+1,'#d8d2c4');r(x,y,w,h,'#9fd0e8');r(x,y+h-9,w,9,'#b9c2c4');for(let k=0;k<w;k+=4)r(x+k,y+h-12,1,10,'#7d8a8e');r(x,y+h-12,w,1,'#6f7c80');r(x+w/2,y,1,h,'#d8d2c4');r(x+3,y+3,10,1,'#ffffff');r(x+46,y+3,8,1,'#ffffff');
    for(const cx of [x-7,x+w])r(cx,y-2,7,h+2,'#c95f4a'),r(cx+3,y-2,1,h+2,'#a84a38');r(x-9,y-3,w+18,1.5,'#8a7a66')}
  r(120,74,36,14,'#ffffff1a');r(216,74,82,26,'#ffffff1f');r(222,100,70,10,'#ffffff12');
  // The bedroom: the bed, its headboard against the wall; the nightstand and its lamp; the closet's doors in the wall; the rug; the desk and its chair against the left wall; a plant.
  shadow(78,116,26);r(78,60,26,16,'#7d5e40');r(79,61,24,2,'#9a7856');r(78,74,26,38,'#8a6a4e');r(79,74,24,36,'#f4f4ee');r(82,76,18,8,'#ffffff');r(82,83,18,1,'#d8d8cc');
  r(79,88,24,22,'#7a9ec4');r(79,88,24,3,'#9ab8d8');for(let y=94;y<108;y+=6)for(let x=82+(y%12?3:0);x<101;x+=6)r(x,y,2,2,'#6a8cb2');r(78,110,26,6,'#6e5238');r(79,110,24,2,'#5a7aa0');
  r(106,68,10,6,'#b08560');r(106,74,10,10,'#8a6a4e');r(107,78,8,.5,'#6e5238');r(110,76,2,1,'#e8c440');shadow(106,84,10,1);r(108,58,6,6,'#f2cf7c');r(109,59,4,2,'#fff6d0');r(110,64,2,4,'#5a4a3e');
  r(160,47,30,27,'#d9c7a6');r(175,47,.5,27,'#a88f6c');r(160,47,30,1,'#a88f6c');r(172,58,1,5,'#8a7454');r(177,58,1,5,'#8a7454');
  r(112,146,58,44,'#c98f8a');r(114,148,54,40,'#e0b0a8');for(let y=152;y<186;y+=6)r(116,y,50,1,'#d29c94');
  shadow(70,180,16);r(70,136,16,40,'#b08560');r(70,176,16,4,'#8a6a4e');r(72,144,11,8,'#2f3438');r(73,145,9,5,'#9fc3c2');r(74,160,6,4,'#fbfbf6');r(72,166,8,6,'#e8c440');
  r(88,152,10,10,'#3b4541');r(89,153,8,6,'#4f5960');r(96,148,2,14,'#2f3438');shadow(88,162,10,1);
  r(75,222,10,8,'#b66c51');r(75,222,10,2,'#c98262');r(72,212,16,11,'#487951');r(75,208,10,6,'#63905b');r(78,214,5,4,'#86a367');
  // The LDK: a clock and a picture on the wall, the TV on its board, the rug and the low table with cushions, a plant by the window, the stools at the island.
  r(310,52,8,8,'#fbfbf6');r(310,52,8,1,'#2f3438');r(314,54,.5,3,'#2f3438');r(314,56,2,.5,'#2f3438');r(394,52,12,14,'#a07850');r(395,53,10,12,'#7fb0c8');r(395,60,10,5,'#63905b');
  r(338,50,44,20,'#2f3438');r(340,52,40,15,'#1c2a33');r(342,53,12,1,'#3e5664');r(357,70,6,2,'#2f3438');r(330,70,60,6,'#7d5e40');r(330,76,60,12,'#5a4a3e');for(const x of [350,370])r(x,77,.5,10,'#3e3329');r(345,81,2,1,'#c49a6c');r(373,81,2,1,'#c49a6c');shadow(330,88,60);
  r(316,96,88,72,'#c9b8a0');r(318,98,84,68,'#d8cbb2');for(let x=322;x<400;x+=8)r(x,164,2,4,'#b8a487');
  shadow(340,122,40);r(340,102,40,16,'#a07850');r(341,103,38,2,'#b8906a');r(340,118,40,4,'#7d5e40');r(346,106,10,7,'#e8eef0');r(347,107,8,1,'#7d8a84');r(364,107,4,4,'#fbfbf6');r(365,108,2,2,'#8a5a3c');
  r(326,106,10,10,'#d6402e');r(327,107,8,8,'#e86a52');r(384,106,10,10,'#3a78c2');r(385,107,8,8,'#5a94d8');
  r(201,80,10,8,'#b66c51');r(201,80,10,2,'#c98262');r(198,66,14,15,'#487951');r(201,62,8,6,'#63905b');r(203,70,5,5,'#86a367');shadow(201,88,10,1);
  for(const x of [298,326,354]){r(x,186,8,5,'#7d5e40');r(x+1,186,6,1,'#9a7856');r(x+1,191,1,8,'#5a4a3e');r(x+6,191,1,8,'#5a4a3e');shadow(x,199,8,1)}
  // The kitchen's side: a mat before the island, the rubbish bins by the fridge.
  r(292,228,72,10,'#9aa7a0');r(294,230,68,6,'#aab7b0');r(380,254,8,14,'#6f7c80');r(380,254,8,2,'#8a979b');r(380,240,8,12,'#3a78c2');r(380,240,8,2,'#5a94d8');
  // The bath: the tub against its wall, the shower, a frosted window, the mat; the washroom: the mirror and the vanity, the washing machine, a towel; the toilet and its window, paper, mat.
  r(100,243,20,10,'#dfe9ec');r(110,243,.5,10,'#c4d0d4');r(86,242,2,16,'#9aa0a4');r(84,242,6,3,'#c9cdd0');r(76,262,48,30,'#f4f4ee');r(79,265,42,22,'#9fd0e8');r(81,267,30,1,'#c3e2ee');r(74,292,50,4,'#d8dcdf');shadow(74,296,50);
  r(84,304,22,10,'#7a9ec4');r(86,306,18,6,'#9ab8d8');
  r(142,242,22,12,'#a7b4b8');r(143,243,20,10,'#cfe6ee');r(145,244,6,1,'#ffffff');r(140,256,24,10,'#f4f4ee');r(145,258,14,6,'#cfe1e6');r(151,255,2,3,'#9aa0a4');r(140,266,24,14,'#e8e4dc');r(152,267,.5,12,'#b8b2a6');shadow(140,280,24);
  r(168,252,22,20,'#f4f4ee');r(171,255,16,14,'#c9cdd0');r(173,257,12,10,'#c3dddb');r(168,272,22,16,'#e8eef0');r(170,274,6,2,'#9aa0a4');shadow(168,288,22);r(176,244,8,10,'#e86a52');r(176,244,8,1,'#c95f4a');
  r(262,282,16,8,'#dfe9ec');r(270,282,.5,8,'#c4d0d4');r(284,294,6,5,'#f4f4ee');r(284,294,6,1,'#c9cdd0');
  r(263,292,14,12,'#f4f4ee');r(263,292,14,2,'#ffffff');r(268,294,4,1,'#9aa0a4');r(264,304,12,16,'#e8eef0');r(265,305,10,13,'#f4f4ee');r(267,308,6,8,'#cfe1e6');shadow(264,320,12);r(258,328,24,12,'#a7c4b0');r(260,330,20,8,'#b8d4c0');
  // The genkan: the doormat at the step, the shoes left on the stone, the shoe cabinet with a little plant, the front door in the bottom wall.
  r(204,358,30,9,'#7a8e9e');r(206,360,26,5,'#8ea2b2');
  r(204,384,5,9,'#3b4541');r(210,385,5,9,'#3b4541');r(214,374,5,9,'#f4f4ee');r(220,375,5,9,'#f4f4ee');r(215,375,3,2,'#d6402e');r(221,376,3,2,'#d6402e');
  r(228,364,12,26,'#c49a6c');r(228,390,12,8,'#a07850');r(228,394,12,.5,'#7d5e40');r(232,358,5,6,'#487951');r(233,363,3,3,'#b66c51');shadow(228,398,12,1);
  // The walls, seen from above, over everything: round the flat, between the rooms, the doorways left open.
  top(64,40,352,6);top(64,40,6,312);top(410,40,6,238);top(192,40,6,152);top(192,228,6,78);top(192,340,6,68);top(64,232,134,6);top(128,232,6,68);top(128,330,6,22);top(64,346,134,6);
  top(192,272,14,6);top(232,272,184,6);top(240,272,6,42);top(240,346,6,62);top(294,272,6,90);top(240,356,60,6);top(192,402,54,6);
  // The bedroom's sliding door, open, its edge against the wall; the front door in the bottom wall.
  r(193,186,4,6,'#c49a6c');r(206,402,26,6,'#7d6a58');r(208,403,22,4,'#94806c');r(226,404,2,2,'#e8c440');
  texture.refresh();
  // The furniture in the room, each drawn in art px on its own canvas.
  const props:Record<string,()=>void>={
    // The sofa, seen from behind: its arms, the seat and cushions peeking over its back.
    sofa:()=>{r(334,120,52,10,'#6d8fa1');r(338,121,20,7,'#e8c440');r(362,121,20,7,'#e0b0a8');r(326,124,8,28,'#4a6878');r(386,124,8,28,'#4a6878');r(326,124,8,2,'#5b7a8c');r(386,124,8,2,'#5b7a8c');
      r(334,130,52,6,'#7b9db0');r(334,130,52,1,'#94b4c4');r(334,136,52,16,'#4a6878');r(360,136,.5,14,'#3e5a68');r(326,150,68,2,'#3a5260')},
    // The island: its counter with the sink and the hob, a kettle; the cupboard doors on the kitchen's side.
    island:()=>{r(280,194,100,14,'#e8e4dc');r(280,194,100,1,'#ffffff');r(292,197,22,9,'#9aa4a8');r(294,199,18,6,'#c3d0d4');r(302,195,2,4,'#7d8a84');r(338,197,30,9,'#2f3438');for(const x of [341,355])r(x,199,10,5,'#4a5058'),r(x+3,200.5,4,2,'#2f3438');r(356,195,7,5,'#d6402e');
      r(280,208,100,12,'#d9cdb6');for(const x of [305,330,355])r(x,208,.5,11,'#b8ab92');for(const x of [292,317,342,367])r(x,212,1,3,'#8a7a66');r(280,219,100,1,'#6f6a60')},
    // The fridge: its top, the two doors and their handles.
    fridge:()=>{r(392,224,18,16,'#dfe5e8');r(392,224,18,1,'#ffffff');r(392,240,18,32,'#eef2f3');r(392,252,18,.5,'#b8bec2');r(393,244,1,6,'#9aa0a4');r(393,256,1,8,'#9aa0a4');r(392,270,18,2,'#c9cdd0');r(398,244,6,4,'#f2cf7c')},
  };
  for(const {name,x,top,w,base} of apartmentProps){const prop=mapCanvas(scene,`apartment-${name}`,w,base-top);c=prop.context;c.translate(-x,-top);props[name]();prop.refresh()}
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
function makeCar(scene:Phaser.Scene){for(let k=0;k<4;k++)drawCar(scene,k)}
/** The car with its wheels turned `k` eighths of a turn clockwise (`uber-car-<k>`): a bar across each hubcap, drawn on the canvas's half art px, shows them roll (main.ts, `roll`). */
function drawCar(scene:Phaser.Scene,k:number){
  const t=mapCanvas(scene,`uber-car-${k}`,62,31),g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},a=k*Math.PI/4;
  r(3,28,58,3,'#0000003a');
  // From above: the boot and bonnet, the roof between the sloping rear window and windscreen.
  r(2,7,14,6,'#2e353a');r(1,8,1,5,'#2e353a');r(2,7,14,1,'#4f5960');r(48,7,12,6,'#2e353a');r(60,8,1,5,'#2e353a');r(48,7,12,1,'#4f5960');r(52,9,6,1,'#394147');
  r(19,0,23,7,'#30373c');r(20,0,21,1,'#4f5960');r(22,3,16,1,'#394147');
  for(let y=0;y<7;y++){r(18-y,y,y+1,1,'#55798a');r(42,y,y+2,1,'#7fa8b8');r(43+y,y,1,1,'#b8d4dc')}
  // The near flank: side windows between the pillars, the body, door lines, handles at the doors' back edges, the lettering high on the rear door (clear of the wheel arch), lights at both ends.
  r(16,7,32,5,'#6f97a8');r(17,7,14,1,'#a9c8d3');r(33,7,14,1,'#a9c8d3');for(const x of [16,31,32,47])r(x,7,1,5,'#1f2427');r(16,12,32,1,'#1f2427');
  r(1,13,60,10,'#1f2427');r(0,14,62,8,'#1f2427');r(1,13,60,1,'#3a4248');r(1,22,60,1,'#15191b');r(31,13,1,9,'#15191b');r(47,12,3,1,'#15191b');
  r(17,14.5,3,1,'#5b6265');r(33,14.5,3,1,'#5b6265');r(59,14,3,3,'#fff4c0');r(60,18,2,2,'#5b6265');r(0,14,2,3,'#c8352b');letter(g,20.5,13.5,'Uber','#ffffff');
  for(const cx of [13,48]){r(cx-7,18,15,4,'#0c0e10');for(let y=18;y<30;y++)for(let x=cx-6;x<=cx+6;x++){const d=Math.hypot(x-cx,y-24);if(d<=5.4)r(x,y,1,1,d<=1.3?'#5b6265':d<=3?'#9aa0a4':'#14171a')}
    for(let y=21;y<28;y+=.5)for(let x=cx-3;x<cx+4;x+=.5){const dx=x+.25-cx-.5,dy=y+.25-24.5;if(Math.hypot(Math.floor(x)-cx,Math.floor(y)-24)<=3&&Math.abs(dx*Math.sin(a)-dy*Math.cos(a))<=.55)r(x,y,.5,.5,'#4a5155')}}
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
  r(176,gates,128,60,'#cfd2cb');for(let y=gates;y<height;y+=16)for(let x=176;x<304;x+=16){r(x,y,8,8,'#c4c8c0');r(x+8,y+8,8,8,'#c4c8c0')}
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
