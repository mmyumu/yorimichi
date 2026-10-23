import Phaser from 'phaser';
import { platformFor, type Hub } from './network';

// Original pixel tiles painted on a 480 × 320 canvas, displayed at integer 2× scale.
const C={grass:'#92ad70',dark:'#344c42',leaf:'#497452',light:'#86a466',cream:'#efdbac',wood:'#806049',shadow:'#657756'};
export function makeArt(scene:Phaser.Scene){
  makeHubs(scene);
  makeJrStop(scene);
  for(const place of ['kamakura','kawaguchiko','arashiyama']){
    const texture=scene.textures.createCanvas('map-'+place,480,320)!;
    const g=texture.context;
    const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
    const text=(x:number,y:number,t:string,c='#f4e4b8',size=7)=>{g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(t,x,y)};
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
    if(place==='kamakura'||place==='arashiyama'){
      paving(210,130,47,156);paving(56,192,338,32);
      for(let y=156;y<274;y+=15){r(218,y,30,10,'#b7b79a');r(221,y+1,24,7,'#d3cfac')}
      shadow(173,131,119);r(179,77,105,55,'#a3815b');r(185,83,93,45,'#d5bb87');for(let x=187;x<281;x+=14)r(x,86,3,44,'#785a44');
      roof(166,57,132,26);roof(180,47,105,10);r(219,100,28,31,'#514d3c');r(224,102,2,28,'#aa8560');r(239,102,2,28,'#aa8560');r(215,130,36,4,'#b9a780');lantern(196,93);lantern(266,93);
      for(let y=136;y<150;y+=4)r(173-(y-136)/2,y,122+(y-136),3,'#b1ac92');
      // Curved torii silhouette and stone lanterns.
      r(131,136,9,53,'#b45843');r(320,136,9,53,'#b45843');r(128,134,205,7,'#bb6349');r(123,130,215,5,'#48554b');r(126,128,13,3,'#48554b');r(322,128,13,3,'#48554b');r(137,147,187,4,'#b45843');r(225,136,7,17,'#9c4939');r(222,139,13,11,'#d4ba78');
      for(const x of [187,278]){r(x,174,5,18,'#8d9780');r(x-4,190,13,4,'#a9ad90');r(x-5,166,15,3,'#677b6c');r(x-2,169,9,6,'#d8c69a');r(x,171,5,3,'#6e7a62');r(x-1,160,7,5,'#a6ad8e')}
      for(const [x,y] of [[34,87],[89,118],[53,180],[380,100],[437,151],[415,250],[57,266],[142,281]])tree(x,y,place==='kamakura');
      if(place==='arashiyama'){
        for(const base of [4,60,370,425])for(let i=0;i<8;i++){const x=base+i*5,y=95+(i%3)*12;r(x,y,3,95,'#59805a');r(x+1,y,1,95,'#a2b073');for(let yy=y+7;yy<y+90;yy+=13){r(x,yy,3,1,'#344f42');r(x-5,yy-4,7,2,'#668b59');r(x+2,yy+2,6,2,'#71965f')}}
        text(204,91,'嵐山','#edd7a4',10);
      }
      fence(18,229,134);fence(330,229,132);bench(272,248);flowers(302,238);lamp(98,225);
      for(let i=0;i<65;i++)r(105+Math.floor(rand()*270),180+Math.floor(rand()*101),2,1,'#efd1b3');
      r(328,107,30,47,'#807454');roof(324,101,38,7);text(334,118,'絵馬','#f2dfb5',7);for(let i=0;i<9;i++)r(332+(i%3)*7,124+Math.floor(i/3)*8,5,6,'#d2b17b');
    }else{
      r(0,35,480,112,'#c3d6ce');r(0,35,480,33,'#b3cbca');
      // Distant hills and stepped mountain, deliberately raster silhouettes.
      for(let x=0;x<480;x+=4){const h=15+Math.sin(x/33)*9+Math.sin(x/17)*4;r(x,133-h,4,h+14,'#8eaaa0')}
      for(let y=48;y<143;y+=2){const spread=(y-48)*1.14;r(242-spread,y,spread*2+4,2,y<76?'#ece8cf':y<105?'#9baeb0':'#8b9fa5');if(y>68&&y<83)for(let j=0;j<3;j++)r(225+j*15+(y%6),y,6,2,'#b7c3be')}
      r(0,141,480,48,'#6f9c9b');r(0,141,480,2,'#bacab6');for(let i=0;i<210;i++){const y=145+Math.floor(rand()*43),x=Math.floor(rand()*480);r(x,y,3+Math.floor(rand()*15),1,i%3?'#88b0a7':'#b5c6b0')}
      for(let y=147;y<184;y+=3){const w=35+(y-147)*.7;r(241-w/2,y,w,1,'#a6beb2')}
      r(0,187,480,6,'#b4bc94');paving(0,196,480,26);paving(213,220,41,64);
      r(269,171,57,33,'#9c8058');for(let y=173;y<203;y+=4)r(269,y,57,1,'#d0aa74');for(let x=270;x<328;x+=53){r(x,165,3,40,'#6b6850');r(x-1,164,5,2,'#d3c39a')}r(271,178,54,2,'#6b6850');r(274,202,3,6,'#6b6850');r(320,202,3,6,'#6b6850');
      for(const [x,y] of [[27,250],[74,280],[145,275],[394,269],[452,242],[473,291]])tree(x,y);
      bench(285,247);flowers(240,264);lamp(188,245);fence(0,185,249);fence(338,185,142);
      r(414,161,25,9,'#c3b58a');r(418,158,18,5,'#e5d4a2');r(426,153,1,8,'#657c70');r(411,170,32,1,'#b3c9b6');
    }
    if(place!=='station'){
      r(58,172,3,23,'#786b4f');r(51,171,52,16,'#455e50');r(53,173,48,12,'#e1d0a1');text(58,182,'← GARE','#4b6152',7);camera(345,195);
      for(const [x,y] of [[8,309],[64,311],[182,311],[305,310],[380,312],[467,310]])tree(x,y,place==='kamakura');
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

function makeHubs(scene:Phaser.Scene){
  for(const hub of ['tokyo','kyoto'] as Hub[]){
    const texture=scene.textures.createCanvas('map-'+hub,480,320)!;const g=texture.context;
    const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
    const t=(x:number,y:number,text:string,size=7,c='#e9dfbb')=>{g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(text,x,y)};
    const accent=hub==='tokyo'?'#b66c51':'#608776',floor=hub==='tokyo'?'#c9b79b':'#b6bcb0';
    r(0,35,480,250,floor);
    // Concourse floor: square stone tiles with small inlaid diamonds.
    for(let y=127;y<285;y+=12)for(let x=0;x<480;x+=16){r(x,y,15,11,(x/16+y)%3===0?'#c7c2ad':floor);r(x,y,15,1,'#d8cfb5');if(x%64===0&&y%24===7)r(x+7,y+5,2,2,'#9c9e89')}
    // Overhead structure and two tracks.
    r(0,35,480,24,'#4e6462');for(let x=0;x<480;x+=32){r(x,37,2,20,'#83958b');r(x,43,30,2,'#6c817a')}r(0,56,480,4,'#293f43');
    r(0,63,480,35,'#616e6d');for(let x=0;x<480;x+=10){r(x,68,4,27,'#46534f');r(x,70,4,2,'#899386')}for(const y of [70,90]){r(0,y,480,2,'#adb3a2');r(0,y+2,480,2,'#354746')}
    // Local commuter train to the left.
    r(5,67,205,27,'#d5d8c6');r(10,63,195,4,'#879c96');r(5,84,205,5,hub==='tokyo'?'#507f9a':'#698a67');r(5,92,205,3,'#5c706c');
    for(let x=13;x<205;x+=23){r(x,70,16,12,'#355965');r(x+1,71,14,3,'#93b5b5');r(x+10,74,2,6,'#628b99')}
    for(const x of [52,121,181]){r(x,67,2,26,'#83988d');r(x+3,72,7,14,'#90a5a0')}
    t(76,88,hub==='tokyo'?'YOKOSUKA':'SAGANO',5);for(const x of [20,69,139,185])r(x,95,9,3,'#314849');
    // White/blue Shinkansen, with a stepped aerodynamic nose.
    r(272,67,204,25,'#eee9d4');r(280,63,196,4,'#f7f0d9');r(266,71,10,20,'#e6e3cc');r(258,77,12,13,'#e6e3cc');r(250,84,12,6,'#d4dbc9');
    r(267,84,209,4,'#447ca0');r(257,88,219,3,'#a5bebd');for(let x=297;x<467;x+=19){r(x,70,12,8,'#34586b');r(x+1,71,10,2,'#96b7be')}
    r(275,70,13,7,'#35586b');r(283,64,2,6,'#34586b');t(375,87,'SHINKANSEN',5,'#e3eddf');
    // Platform edges and tactile paving.
    r(0,101,480,20,'#b0b39e');r(0,101,480,2,'#e6dec2');r(0,108,480,4,'#d8ba65');for(let x=0;x<480;x+=5)r(x,109,2,1,'#8c8755');r(0,120,480,4,'#7d8c80');
    for(const x of [28,148,328,450]){r(x+2,51,6,70,'#344b4c');r(x,51,7,68,'#96a798');r(x,99,7,4,accent);r(x+1,54,1,41,'#d0d1b5');r(x-3,116,14,5,'#677c72')}
    // Hanging destination displays.
    for(const [x,title,line] of [[45,(hub==='tokyo'?'3':'33')+'  在来線 / Local',hub==='tokyo'?'横須賀線・中央線':'嵯峨野線 / SAGANO'],[295,(hub==='tokyo'?'19':'11')+'  新幹線',hub==='tokyo'?'のぞみ 京都方面':'のぞみ 東京方面']] as const){
      r(x+8,49,1,10,'#283e40');r(x+110,49,1,10,'#283e40');r(x,58,129,27,'#233c3e');r(x+2,60,125,23,'#2e4845');r(x+3,62,123,1,accent);t(x+7,71,title,7,'#f4d58c');t(x+7,80,line,5,'#b6d9aa');
    }
    // Ticket gate lanes; entry is handled from the front of each lane.
    for(const x of [63,107,336,380]){r(x,133,14,28,'#607f76');r(x+1,131,12,23,'#a9b8a7');r(x+3,133,8,7,'#294e52');r(x+4,134,6,3,'#7cbaaa');r(x,155,14,4,hub==='tokyo'?'#6089a1':'#758e64');r(x+2,160,12,3,'#7c8a78')}
    r(72,129,50,4,'#678695');r(345,129,48,4,'#597e9a');t(79,144,'↑',10,'#5f7d58');t(352,144,'↑',10,'#5f7d58');
    t(70,176,platformFor(hub,'local')+' / 在来線',7,'#435e55');t(325,176,platformFor(hub,'shinkansen')+' / 新幹線',7,'#435e55');
    // Central information and ticket office: departure board + staffed counter.
    r(177,121,125,36,'#6e7f70');r(175,124,130,7,accent);r(181,133,118,17,'#263e3d');t(185,140,'DEPARTS / 発車案内',5,'#e7cd86');t(185,147,hub==='tokyo'?'19 京都 14:20 / 3 品川 14:25':'11 東京 14:20 / 33 園部 14:25',5,'#9bc29a');
    r(193,152,94,4,'#a9b29a');r(198,155,5,3,'#506e65');r(279,155,5,3,'#506e65');
    // Ticket machine island.
    r(223,219,38,5,'#a1a38a');r(227,187,26,31,'#835e4d');r(228,187,23,29,'#bb7054');r(230,190,19,4,'#e9d4a4');t(231,193,'きっぷ',4,'#77553e');r(231,197,16,10,'#294d51');r(233,199,12,5,'#9fbd9e');r(231,210,9,2,'#f1d88c');r(244,210,3,4,'#554e40');r(234,215,10,2,'#3e5047');
    t(207,235,'TICKETS / きっぷ',7,'#465e51');
    // Side kiosks, seating, lockers and vending machines.
    r(6,184,48,42,'#7b7762');r(7,184,46,7,accent);t(11,189,'EKIBEN',6);r(11,195,37,19,'#3f5e58');for(let x=14;x<45;x+=9){r(x,198,6,5,'#c3ad73');r(x,207,6,4,'#d5996c')}r(8,215,44,4,'#a99775');
    r(428,184,44,45,'#8a9a88');for(let y=188;y<225;y+=12)for(let x=432;x<469;x+=12){r(x,y,10,10,'#c3c7ab');r(x+7,y+4,1,3,'#586e60')}t(432,181,'LOCKERS',5,'#476156');
    for(const x of [150,298]){r(x,247,40,3,'#b19c70');r(x,252,40,3,'#c5ac7b');r(x+3,255,3,7,'#526b60');r(x+34,255,3,7,'#526b60')}
    for(const [x,y] of [[26,251],[414,251]]){r(x,y+9,14,13,'#8f7153');r(x-3,y,20,12,'#4f7959');r(x+1,y-5,12,11,'#7f9a69');r(x+4,y-4,5,4,'#acb579')}
    // Floor guidance stripes and station-name inlay.
    r(93,168,3,97,'#d1b86f');r(372,168,3,97,'#d1b86f');r(93,263,282,3,'#d1b86f');
    r(185,269,110,12,accent);t(195,278,hub==='tokyo'?'東京  TOKYO STATION':'京都  KYOTO STATION',7);
    // Small travellers with luggage.
    for(const [x,y,c] of [[132,199,'#748b99'],[337,221,'#a47660'],[399,149,'#8e9161']] as const){r(x,y+8,8,2,'#87967d');r(x+1,y,6,7,c);r(x+1,y-5,6,5,'#d8b88b');r(x,y-7,8,3,'#555747');r(x+1,y+7,2,4,'#445b57');r(x+5,y+7,2,4,'#445b57');r(x+10,y+1,6,8,'#77654f');r(x+12,y-2,2,4,'#4b5a50')}
    // Overlapping wayfinding systems: exits, transfers, operators and numbered gates.
    const sign=(x:number,y:number,w:number,top:string,bottom:string,yellow=false)=>{
      r(x+5,y-7,1,7,'#3e5651');r(x+w-6,y-7,1,7,'#3e5651');r(x,y,w,23,yellow?'#d7ba70':'#304b49');
      t(x+4,y+9,top,7,yellow?'#3d4d43':'#e4e1be');t(x+4,y+19,bottom,5,yellow?'#5c6048':'#b1c0a3');
    };
    sign(10,230,75,'← 西口 Exit',hub==='tokyo'?'Marunouchi / Bus':'Hachijo / Bus',true);
    sign(392,230,78,'東口 Exit →',hub==='tokyo'?'Yaesu / Taxi':'Karasuma / Taxi',true);
    sign(119,186,67,'↓ 地下鉄 Metro','丸ノ内 / M',false);
    sign(291,191,70,'↑ のりかえ','Transfer / JR',false);
    sign(178,174,121,'← 在来線   新幹線 →','Local                 Shinkansen',false);
    // Information agent with peaked cap, beside the central departures counter.
    r(236,166,9,2,'#8a947d');r(238,157,6,9,'#55727a');r(237,152,8,5,'#d2b58a');r(236,150,10,3,'#304c58');r(239,149,4,1,'#d1bd79');r(238,165,2,3,'#314c51');r(242,165,2,3,'#314c51');
    t(251,164,'? 駅員',6,'#425b51');
    // Distinctive architecture hints: Tokyo brick cornice; Kyoto steel lattice.
    if(hub==='tokyo'){for(let x=0;x<480;x+=12){r(x,36,11,5,'#a57055');r(x+5,42,11,5,'#926048')}r(0,48,480,2,'#d3bb8c')}
    else{for(let x=0;x<480;x+=24){r(x,36,2,17,'#a3b3a6');for(let k=0;k<15;k++)r(x+k,36+k,2,1,'#7e978e')}r(0,53,480,2,'#c0c6b0')}
    texture.refresh();
  }
}

function makeJrStop(scene:Phaser.Scene){
  const texture=scene.textures.createCanvas('map-jr-stop',480,320)!;const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const t=(x:number,y:number,text:string,size=8,c='#e9dbaf')=>{g.fillStyle=c;g.font=`bold ${size}px monospace`;g.fillText(text,x,y)};
  r(0,35,480,285,'#9dae8b');
  for(let x=0;x<480;x+=24){r(x,45,20,24,'#748a78');r(x+2,48,5,4,'#b7c4a4');r(x+10,55,6,5,'#b7c4a4')}
  r(0,70,480,42,'#64736c');for(let x=0;x<480;x+=14)r(x,72,4,37,'#40534c');for(const y of[77,100]){r(0,y,480,3,'#acb6a1');r(0,y+3,480,2,'#354e47')}
  r(0,114,480,170,'#c4c3a8');for(let y=118;y<284;y+=12)for(let x=0;x<480;x+=20){r(x,y,19,11,'#d5d0b4');r(x,y,19,1,'#eee3c1')}
  r(0,116,480,5,'#d0b56b');for(let x=0;x<480;x+=7)r(x,117,3,1,'#8b8758');
  r(160,77,164,44,'#344f48');r(166,81,152,35,'#355b4e');r(160,75,164,4,'#bbd0a2');r(172,121,5,17,'#718573');r(306,121,5,17,'#718573');
  for(const x of[15,439]){r(x,129,8,126,'#8b9d86');r(x-3,252,14,5,'#617b68')}
  for(const x of[165,270]){r(x,235,52,4,'#9e8259');r(x,242,52,4,'#b99d6c');r(x+4,246,4,12,'#68745b');r(x+44,246,4,12,'#68745b')}
  r(53,168,97,23,'#385d4c');t(59,183,'← TOKYO 東京',10);r(66,191,4,22,'#7d896b');r(133,191,4,22,'#7d896b');
  r(356,161,58,46,'#dde0c4');r(360,165,50,25,'#57776b');for(let x=365;x<405;x+=10)r(x,170,6,12,'#b9c9a6');r(360,194,50,4,'#aab48d');t(363,205,'JR',6,'#456b54');
  r(0,280,480,40,'#587b58');for(let x=0;x<480;x+=16){r(x,277,14,12,'#799762');r(x+2,275,8,5,'#a9b97b')}
  t(202,270,'JR / LOCAL',8,'#6e7e63');texture.refresh();
}
