import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { renderWallFareMap } from './tokyo-fares';
import { hasShinkansen, routes, stations, type Hub } from './network';
import { looks, type Figure, type Look } from './people';

/** Machines as the hall knows them; x is the left edge in wall pixels. */
export interface HallDevice {id:string;kind:string;x:number}
type Painter=(g:CanvasRenderingContext2D,w:number,h:number)=>void;

// World units are the old CSS wall pixels: x to the right, y up (CSS y negated), z out of the wall towards the player.
const eyeY=-1120,machineW=500,floorY=1760;
// Machine bank, in CSS-style y down from the ceiling: facade under the fare map, sign band, recesses down to the ledge, cabinet below.
const facadeTop=950,recessTop=1110,recessBottom=1500,facadeD=110,recessD=50,signW=400,signH=134;
// Concourse around the bank: the machine wall runs between two pillars; on the left the central gates stand set back in an opening (centralL to the wall), the ticket office past them;
// on the right the Shinkansen transfer gates in their own opening (the wall to transferR), or a NewDays front where the station has no Shinkansen. Haze hides where the station ends.
const wallL=-900,wallR=4700,gateZ=-1100,backZ=-2800,officeZ=-700,westX=-8000,eastX=10000,frontZ=4500,centralL=-2700,transferR=6700;
// Gates 360 apart, from the machine wall outwards; the office's door bay and three counters (450 each) end at the central opening; the shop front starts at the right pillar.
const centralGates=[-1300,-1660,-2020,-2380],transferGates=[5000,5360,5720,6080,6440],officeL=-4500,shopL=4850,shopR=7400,shopDoor=6800;
// The top-down concourse (main.ts, art.ts, in scene pixels) laid onto the hall: x by the landmarks both show (the office counters, the lanes between the central gates,
// the bank's pillars and machines, then the transfer gate lanes or the shop door), y to z by the gates, the machine wall and the spot before a machine. Keep these in step with either layout.
const anchors=(shinkansen:boolean)=>[[22,-3825],[102,-2925],[158,-2200],[246,-1480],[272,-900],[368,700],[592,3100],[712,4700],...(shinkansen?[[770,5180],[902,6260]]:[[906,shopDoor]])];
const zAnchors=[[182,gateZ],[244,0],[262,250],[600,2700]];
const piecewise=(anchors:number[][],v:number)=>{let i=1;while(i<anchors.length-1&&v>anchors[i][0])i++;const [[a,p],[b,q]]=[anchors[i-1],anchors[i]];return p+(v-a)*(q-p)/(b-a)};
/** A point of the top-down concourse in hall units, on the floor. */
const fromConcourse=(xAnchors:number[][],x:number,y:number)=>({x:piecewise(xAnchors,x),z:piecewise(zAnchors,y)});
// One texel covers ~4 world px, about one pixel of the low-resolution render at the default distance.
const texel=4;
// Muted palette shared with art.ts so the hall reads as the same game.
const C={ink:'#283e40',dark:'#314c51',tile:'#e6e3cc',grout:'#c9c4a6',tileShade:'#d8d3b8',floorA:'#74855e',floorB:'#68745b',floorLine:'#5a6650',ceiling:'#5d6a62',ceilingSeam:'#4c5852',haze:'#55625b',signBoard:'#2f3638',gate:'#d5d8d0',gateTop:'#3d4846',light:'#fffbe0',body:'#dfe1d6',bodyShade:'#c3c8b8',bodyEdge:'#9aa69a',side:'#9aa69a',sideDark:'#7d897e',plinth:'#3b4541',bezel:'#86967e',panel:'#b7c4a4',tray:'#2d4133',frame:'#8f9e8b',facade:'#e4e6df',facadeShade:'#d4d7ce',facadeSeam:'#b9bdb3',reveal:'#9ea69c',steel:'#aeb4b0'};
const accents:Record<string,string>={local:'#2c754e',charge:'#c5487e',shinkansen:'#6c78b8'};
const housings:Record<string,string>={local:'#d9dcd6',charge:'#d9dcd6',shinkansen:'#3d9a4c'};
// Signs as at JR East stations: Japanese over English.
const titles:Record<string,[string,string]>={local:['きっぷ','Tickets'],charge:['チャージ専用','IC Charge'],shinkansen:['新幹線・特急','Shinkansen & Limited Express']};

/** Canvas text snapped to whole texels: anti-aliasing is thresholded away so glyphs read as pixel art. */
function pixelText(g:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,color:string,align:'left'|'center'|'right'='center',bold=false){
  const scratch=document.createElement('canvas'),c=scratch.getContext('2d')!,font=`${bold?'bold ':''}${size}px "Yorimichi JP", sans-serif`;
  c.font=font;const w=Math.ceil(c.measureText(text).width)+2,h=Math.ceil(size*1.5);scratch.width=w;scratch.height=h;
  c.font=font;c.fillStyle=color;c.textBaseline='middle';c.fillText(text,1,h/2);
  const data=c.getImageData(0,0,w,h);for(let i=3;i<data.data.length;i+=4)data.data[i]=data.data[i]>100?255:0;c.putImageData(data,0,0);
  g.drawImage(scratch,Math.round(align==='center'?x-w/2:align==='right'?x-w:x),Math.round(y-h/2));
}
/** 50% checkerboard, the pixel-art way to shade without gradients. */
function dither(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string){g.fillStyle=color;for(let j=0;j<h;j++)for(let i=(j+x+y)%2;i<w;i+=2)g.fillRect(x+i,y+j,1,1)}
function box(g:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,fill:string,line?:string){g.fillStyle=fill;g.fillRect(x,y,w,h);if(line){g.fillStyle=line;g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);g.fillRect(x,y,1,h);g.fillRect(x+w-1,y,1,h)}}
/** Payment face after the Tokyo Station machines, in 2-px texels (244 × 111): labels, yellow-rimmed slots, coin funnel, keypad, QR reader, tray. The outer 3 texels sit under the hole's edge. */
function paintPayment(g:CanvasRenderingContext2D,w:number,h:number,kind:string){
  const Y='#e2c234',D='#1d2622',unit='#f6f6f0',edge='#b9bdb3',ink='#3f4a48',c1=6,c1w=76,c2=86,c2w=60,c3=150,c3w=w-6-c3,r2=22,r3=54,rh=28;
  box(g,0,0,w,h,'#e9eae2');box(g,0,0,w,5,'#c3c7bf');box(g,0,5,w,1,'#fbfbf6');
  const label=(x:number,lw:number,text:string)=>{box(g,x,8,lw,11,'#4c565a');pixelText(g,text,x+lw/2,13.5,9,'#fff')};
  const slot=(x:number,y:number,sw:number,sh:number,text='')=>{box(g,x,y,sw,sh,unit,edge);box(g,x+1,y+sh-3,sw-2,2,'#dfe1d8');const lw=Math.round(sw*.62),lx=x+Math.round((sw-lw)/2),ly=y+(text?6:Math.round(sh/2)-2);box(g,lx-2,ly-2,lw+4,8,Y);box(g,lx,ly,lw,4,D);if(text)pixelText(g,text,x+sw/2,y+sh-9,8,ink)};
  if(kind==='charge'){
    label(c1,c1w,'IC カード');label(c2,c2w,'紙幣 Bills');label(c3,c3w,'おつり Change');
    box(g,c1,r2,c1w,rh*2+4,unit,edge);const cx=c1+c1w/2,cy=r2+25;
    for(let dy=-16;dy<=16;dy++)for(let dx=-16;dx<=16;dx++){const d=Math.hypot(dx,dy);if(d<=16)box(g,cx+dx,cy+dy,1,1,d>=13?'#7dba71':'#e7f1e4')}
    pixelText(g,'Suica · PASMO',cx,r2+rh*2-4,8,ink);slot(c2,r2,c2w,rh);slot(c3,r2,c3w,rh*2+4);
  }else{
    label(c1,c1w,'カード Card');label(c2,c2w,'紙幣 Bills');label(c3,c3w,'硬貨 Coins');
    slot(c1,r2,c1w,rh);slot(c2,r2,c2w,rh);
    // Coin funnel: dark bowl ringed in yellow, corners cut.
    box(g,c3,r2,c3w,rh,Y);box(g,c3+3,r2+3,c3w-6,rh-6,D);dither(g,c3+3,r2+3,c3w-6,6,'#3c4a44');box(g,c3+c3w/2-8,r2+rh-9,16,2,'#c9a54a');
    for(const [x,y] of [[c3,r2],[c3+c3w-2,r2],[c3,r2+rh-2],[c3+c3w-2,r2+rh-2]])box(g,x,y,2,2,'#e9eae2');
    slot(c1,r3,c1w,rh,'きっぷ Ticket');slot(c2,r3,c2w,rh,'おつり Change');
    // Keypad (red cancel, green confirm) and QR reader.
    const kw=46,qx=c3+kw+4,qw=c3+c3w-qx;box(g,c3,r3,kw,rh,Y);box(g,c3+2,r3+2,kw-4,rh-4,'#f2e9b8');
    for(let i=0;i<12;i++)box(g,c3+4+(i%3)*13,r3+4+Math.floor(i/3)*6,11,4,i===9?'#d9534f':i===11?'#4f9a59':'#ffffff',i===9||i===11?undefined:'#c9c3a0');
    box(g,qx,r3,qw,rh,unit,edge);pixelText(g,'QR',qx+qw/2,r3+6,8,ink);box(g,qx+6,r3+11,qw-12,rh-15,'#2b3d44');box(g,qx+7,r3+12,qw-14,2,'#4f6a73');
  }
  // Tray for tickets and change, with its caution sticker.
  const ty=86,th=h-6-ty;box(g,c1,ty,c2+c2w-c1,th,'#262f2c');dither(g,c1+1,ty+1,c2+c2w-c1-2,5,'#111a17');box(g,c3,ty+3,12,12,Y);pixelText(g,'!',c3+6,ty+9,10,D,'center',true);
}

/** Overhead concourse sign: a pictogram square, Japanese over English, and an optional arrow. */
function paintHanging(g:CanvasRenderingContext2D,w:number,h:number,o:{ja:string;en:string;mark:string;markBg:string;markInk?:string;arrow?:'←'|'→';bg?:string;ink?:string}){
  const ink=o.ink??'#fff',s=h-14;let x=8;
  box(g,0,0,w,h,o.bg??C.signBoard,'#77817c');box(g,1,h-3,w-2,2,'#00000033');
  if(o.arrow==='←'){pixelText(g,'←',x+s/2,h/2,s,ink,'center',true);x+=s+4}
  box(g,x,7,s,s,o.markBg);pixelText(g,o.mark,x+s/2,7+s/2,Math.round(s*.72),o.markInk??'#1d2622','center',true);x+=s+10;
  pixelText(g,o.ja,x,h*.36,Math.round(h*.4),ink,'left',true);pixelText(g,o.en,x,h*.78,Math.round(h*.25),ink,'left',true);
  if(o.arrow==='→')pixelText(g,'→',w-8-s/2,h/2,s,ink,'center',true);
}
/** Light-box travel posters for the game's own destinations. */
function paintPoster(g:CanvasRenderingContext2D,w:number,h:number,place:'kamakura'|'nikko'|'arashiyama'){
  let seed=place.length*977;const rand=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const ih=h-36;
  if(place==='kamakura'){
    box(g,0,0,w,ih,'#f7ead2');dither(g,0,0,w,Math.round(ih*.35),'#f2d9c4');
    const ground=Math.round(ih*.78);box(g,0,ground-18,w,18,'#7c9a6a');box(g,0,ground,w,ih-ground,'#d9c9a3');
    // Temple hall: dark roof over red pillars.
    const cx=Math.round(w/2);for(let i=0;i<16;i++)box(g,cx-30-i,ground-60+i,60+2*i,1,'#4a4a52');
    box(g,cx-34,ground-44,68,44,'#b8503e');for(let x=cx-30;x<cx+30;x+=12)box(g,x,ground-44,3,44,'#8c3a2e');box(g,cx-38,ground-2,76,3,'#6b6258');
    for(let i=0;i<70;i++){const x=rand()<.5?rand()*w*.35:w-rand()*w*.35,y=rand()*ih*.7,r=3+rand()*6;for(let dy=-r;dy<=r;dy++){const half=Math.round(Math.sqrt(r*r-dy*dy));box(g,Math.round(x-half),Math.round(y+dy),half*2,1,rand()<.6?'#f2a7c0':'#f8c9d8')}}
  }else if(place==='nikko'){
    // Tōshō-gū's Yōmei-mon: a white and gold gate under green-black roofs, among tall cedars.
    box(g,0,0,w,ih,'#dfe8e0');dither(g,0,0,w,Math.round(ih*.3),'#cddcd2');
    for(const [x,top] of [[6,18],[24,8],[112,10],[130,22],[-4,40],[142,44]]){box(g,x-1,top+20,3,ih-top,'#5a3f2e');for(let y=top;y<ih-20;y+=3){const half=3+Math.round(((y-top)%24)/3);box(g,x-half,y,half*2+1,2,(y>>2)%2?'#2f5a3c':'#24482f')}}
    const cx=Math.round(w/2),ground=Math.round(ih*.86);
    for(let i=0;i<4;i++)box(g,cx-46-i*4,ground+i*5,92+i*8,5,i%2?'#b5b0a2':'#a29d90');box(g,0,ground+20,w,ih-ground-20,'#8f8a7e');
    box(g,cx-36,ground-46,72,46,'#f4f0e4');box(g,cx-10,ground-36,20,36,'#2a2a2e');box(g,cx-12,ground-38,24,2,'#d8b04a');
    for(const x of [cx-34,cx-22,cx+18,cx+30])box(g,x,ground-46,4,46,'#e8e1cf');
    for(let x=cx-36;x<cx+36;x+=2)box(g,x,ground-50,2,4,['#c8463a','#3f8f6a','#3e6db0','#d8b04a'][(x>>1)%4]);
    for(let i=0;i<8;i++)box(g,cx-44-i,ground-58+i,88+2*i,1,'#2f3a36');box(g,cx-52,ground-51,104,1,'#d8b04a');
    box(g,cx-28,ground-82,56,24,'#f4f0e4');for(let x=cx-28;x<cx+28;x+=2)box(g,x,ground-86,2,4,['#d8b04a','#c8463a','#3f8f6a','#3e6db0'][(x>>1)%4]);
    for(let x=cx-24;x<cx+24;x+=8)box(g,x,ground-78,4,16,'#d8b04a');
    for(let i=0;i<12;i++)box(g,cx-30-i*2,ground-98+i,60+i*4,1,'#2f3a36');box(g,cx-54,ground-87,108,1,'#d8b04a');
    box(g,cx-30,ground-100,60,2,'#2f3a36');box(g,cx-33,ground-102,3,4,'#d8b04a');box(g,cx+30,ground-102,3,4,'#d8b04a');
  }else{
    box(g,0,0,w,ih,'#b9d8a0');
    for(let x=0;x<w;){const sw=3+Math.round(rand()*2),color=['#4f8a4a','#6fa863','#3f6f3e'][Math.floor(rand()*3)];box(g,x,0,sw,ih,color);for(let y=Math.round(rand()*18);y<ih;y+=18)box(g,x,y,sw,1,'#a9cf8f');x+=sw+2+Math.round(rand()*5)}
    for(let y=Math.round(ih*.72);y<ih;y++){const half=Math.round((y-ih*.72)*1.1+4);box(g,Math.round(w/2-half),y,half*2,1,'#d8cfa8')}
  }
  pixelText(g,'寄り道しよう。',8,12,11,'#283e40','left',true);
  box(g,0,ih,w,h-ih,'#fbfbf6');box(g,0,ih,w,2,'#c9c4a6');
  const [ja,en]={kamakura:['鎌倉','Kamakura'],nikko:['日光','Nikko'],arashiyama:['嵐山','Arashiyama']}[place];
  pixelText(g,ja,8,ih+13,16,C.ink,'left',true);pixelText(g,en,8,ih+28,9,'#65735a','left');pixelText(g,'JR線でどうぞ',w-6,ih+28,8,'#65735a','right');
}
/** The ticket office front: green sign band, glazed counters with clerks, an open door (the `door`th bay). */
function paintOffice(g:CanvasRenderingContext2D,w:number,h:number,door:number){
  box(g,0,0,w,40,'#2c8a4a');box(g,0,2,w,1,'#7fc495');box(g,0,37,w,1,'#1f6636');
  pixelText(g,'みどりの窓口',16,20,26,'#fff','left',true);pixelText(g,'JR Ticket Office',190,24,12,'#fff','left');if(w>=420)pixelText(g,'営業時間 5:30 – 23:00',w-12,20,9,'#d6efd9','right');
  box(g,0,40,w,6,'#3b4541');const bay=75,glassTop=46,counter=150,plinth=h-26;
  for(let i=0;i*bay<w;i++){
    const x=i*bay;
    if(i===door){box(g,x,glassTop,bay,plinth-glassTop,'#4c5f5c');dither(g,x,glassTop,bay,plinth-glassTop,'#5b706c');continue}
    box(g,x,glassTop,bay,plinth-glassTop,'#9fc3c2');
    for(let d=0;d<40;d+=1)box(g,x+8+d,glassTop+40-d,2,1,'#c3dddb');
    // Clerk behind the counter, a screen beside.
    const cx=x+bay/2;box(g,cx-9,counter-14,18,14,'#2f4f7a');box(g,cx-5,counter-25,10,11,'#e9c4a0');box(g,cx-5,counter-26,10,4,'#2b2420');box(g,cx+14,counter-16,12,10,'#283e40');
    box(g,x,counter,bay,8,'#d9d3bf');box(g,x,counter+8,bay,plinth-counter-8,'#c3c8b8');pixelText(g,String(i<door?i+1:i),cx,counter+24,10,'#283e40','center',true);
  }
  for(let x=0;x<w;x+=bay)box(g,x,glassTop,3,plinth-glassTop,'#8f9e8b');
  box(g,0,plinth,w,h-plinth,'#3b4541');
}
/** The NewDays front: white sign band with its green and orange stripes, then the glazing, a drinks fridge, shelves, the till with its clerk, and the automatic door centred on `door`. */
function paintShop(g:CanvasRenderingContext2D,w:number,h:number,door:number){
  const top=46,plinth=h-26,dw=90,font='bold 26px "Yorimichi JP", sans-serif',m=document.createElement('canvas').getContext('2d')!;m.font=font;
  box(g,0,0,w,40,'#fbfbf6');box(g,0,30,w,4,'#3c9a5c');box(g,0,34,w,3,'#e8853a');box(g,0,40,w,6,'#3b4541');
  pixelText(g,'New',14,16,26,'#d2402e','left',true);pixelText(g,'Days',14+Math.round(m.measureText('New').width),16,26,'#2f8a4a','left',true);pixelText(g,'ニューデイズ',w-12,16,10,'#56605a','right');
  box(g,0,top,w,plinth-top,'#9fc3c2');for(let x=20;x<w;x+=110)for(let d=0;d<40;d++)box(g,x+d,top+44-d,2,1,'#c3dddb');
  // Drinks fridge: rows of bottles behind its own glass.
  box(g,8,top+8,96,plinth-top-12,'#dfe9ec');
  for(let k=0;k<6;k++){const y=top+12+k*24;for(let b=0;b<12;b++)box(g,12+b*8,y,5,16,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#f4f4ee','#e8853a'][(b+k)%6]);box(g,8,y+17,96,2,'#9aa29a')}
  // Shelves of onigiri, sweets and snacks.
  for(let k=0;k<5;k++){const y=top+20+k*26;box(g,114,y+14,90,3,'#7d8a84');for(let b=0;b<11;b++)box(g,116+b*8,y+4+(b%2)*2,6,10-(b%2)*2,['#e9a6ad','#f2c230','#86a367','#f4f4ee','#b66c51'][(b*3+k)%5])}
  // The till, its clerk in the shop's green.
  const counter=top+104;box(g,214,counter-16,22,16,'#3c9a5c');box(g,219,counter-29,12,13,'#e9c4a0');box(g,219,counter-30,12,4,'#2b2420');box(g,242,counter-14,12,10,'#283e40');
  box(g,206,counter,64,10,'#efe9d4');box(g,206,counter+10,64,plinth-counter-10,'#d9d3bf');
  for(const x of [0,106,206,270])box(g,x,top,3,plinth-top,'#8f9e8b');
  box(g,0,plinth,w,h-plinth,'#3b4541');
  // Automatic door, down to the floor: two glass leaves.
  box(g,door-dw/2,top,dw,h-top,'#4c5f5c');dither(g,door-dw/2,top,dw,h-top,'#5b706c');box(g,door-dw/2,top,dw,3,'#8f9e8b');box(g,door-1,top,3,h-top,'#8f9e8b');for(const x of [door-dw/2,door+dw/2-3])box(g,x,top,3,h-top,'#8f9e8b');
  pixelText(g,'自動ドア',door,top+60,9,'#e7f1e4');
}
/** A commuter in eight 20 × 48 frames: front step A/B, back step A/B, left step A/B, right step A/B. */
function paintPerson(g:CanvasRenderingContext2D,look:Look){
  const skin=look.skin??'#e9c4a0',hair=look.hair;
  for(let f=0;f<4;f++){
    const o=f*20,back=f>1,step=f%2===1;
    box(g,o+(step?6:7),30,3,step?15:16,look.legs);box(g,o+(step?11:10),30,3,16,look.legs);box(g,o+(step?5:6),45,4,2,'#2a2a2a');box(g,o+(step?11:10),46,4,2,'#2a2a2a');
    box(g,o+5,14,10,17,look.coat);box(g,o+3,15,2,12,look.coat);box(g,o+15,15,2,12,look.coat);box(g,o+3,27,2,2,skin);box(g,o+15,27,2,2,skin);
    // Below the waist: a flared skirt, a coat down to the knees, or a kimono to the feet with its obi.
    if(look.skirt)for(let y=30;y<38;y++){const k=Math.floor((y-30)/4);box(g,o+5-k,y,10+2*k,1,look.skirt)}
    if(look.length==='knee')box(g,o+5,30,10,8,look.coat);
    if(look.length==='robe'){box(g,o+5,30,10,15,look.coat);box(g,o+5,24,10,4,look.sash??look.coat);if(!back)box(g,o+8,14,4,3,'#f4f4ee')}
    else if(!back&&look.tie){box(g,o+8,14,4,4,'#f4f4ee');box(g,o+9,15,2,5,'#6c3b3b')}else if(!back)box(g,o+8,14,4,2,skin);
    if(look.backpack){if(back){box(g,o+5,15,10,12,look.bag!);box(g,o+6,16,8,1,'#ffffff33')}else{box(g,o+6,14,1,9,look.bag!);box(g,o+13,14,1,9,look.bag!)}}
    else if(look.bag)box(g,back?o+1:o+16,22,4,7,look.bag);
    if(look.cane)box(g,back?o+2:o+17,28,1,19,'#6b4a2e');
    // Head and hair.
    box(g,o+7,4,6,9,skin);
    if(back)box(g,o+7,3,6,9,hair);else box(g,o+7,3,6,3,hair);
    if(look.style==='bob'){if(back)box(g,o+6,3,8,10,hair);else{box(g,o+6,3,1,9,hair);box(g,o+13,3,1,9,hair)}}
    else if(look.style==='long'){if(back)box(g,o+5,3,10,16,hair);else{box(g,o+5,4,2,13,hair);box(g,o+13,4,2,13,hair)}}
    else{if(!back){box(g,o+6,4,1,4,hair);box(g,o+13,4,1,4,hair)}if(look.style==='bun')box(g,o+8,0,4,3,hair);if(look.style==='ponytail'&&back)box(g,o+9,10,2,9,hair)}
    if(!back){box(g,o+8,8,1,1,'#283e40');box(g,o+11,8,1,1,'#283e40');if(look.mask)box(g,o+8,10,4,3,'#f4f4ee')}
  }
  // In profile, drawn facing right and mirrored for the left: legs together or in stride, one arm, the hair falling at the back.
  for(let f=4;f<8;f++){
    const o=f*20,left=f<6,step=f%2===1,at=(x:number,w=1)=>o+(left?20-x-w:x),r=(x:number,y:number,w:number,h:number,c:string)=>box(g,at(x,w),y,w,h,c);
    if(step){r(5,30,3,15,look.legs);r(4,44,4,2,'#2a2a2a');r(11,30,3,16,look.legs);r(11,46,5,2,'#2a2a2a')}else{r(8,30,4,16,look.legs);r(8,46,5,2,'#2a2a2a')}
    if(look.backpack)r(3,15,4,12,look.bag!);
    r(7,14,7,17,look.coat);
    if(look.skirt)for(let y=30;y<38;y++){const k=Math.floor((y-30)/4);r(7-k,y,7+2*k,1,look.skirt)}
    if(look.length==='knee')r(7,30,7,8,look.coat);
    if(look.length==='robe'){r(7,30,7,15,look.coat);r(7,24,7,4,look.sash??look.coat);r(11,14,2,3,'#f4f4ee')}
    if(look.bag&&!look.backpack)r(7,22,4,7,look.bag);
    r(9,15,3,12,look.coat);r(9,27,3,2,skin);
    if(look.cane)r(16,28,1,19,'#6b4a2e');
    r(9,13,3,2,skin);r(8,4,6,9,skin);r(14,8,1,1,skin);r(7,3,7,3,hair);r(7,3,3,7,hair);
    if(look.style==='bob')r(6,3,4,10,hair);else if(look.style==='long')r(5,3,4,16,hair);else if(look.style==='bun')r(5,2,3,3,hair);else if(look.style==='ponytail')r(5,7,2,9,hair);
    r(12,8,1,1,'#283e40');if(look.mask)r(11,10,3,3,'#f4f4ee');
  }
}

/** The ticket hall rendered with three.js into a small canvas, scaled up without smoothing. */
export class HallScene {
  private renderer:THREE.WebGLRenderer|null=null;
  // Crisp DOM layer behind the canvas: the fare map stays vector-sharp, seen through a hole punched in the WebGL image.
  private css=new CSS3DRenderer();
  private cssScene=new THREE.Scene();
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(26,1.5,10,12000);
  private painted:{texture:THREE.CanvasTexture;paint:Painter}[]=[];
  // Pixel-art canvases shown in the crisp DOM layer, repainted like the textures once the font is ready.
  private crisp:(()=>void)[]=[];
  private machines=new Map<string,{group:THREE.Group;outline:THREE.Group;materials:THREE.MeshBasicMaterial[];sign:HTMLElement}>();
  // Clears the WebGL pixels so the crisp DOM layer behind shows through; depth still lets nearer meshes cover it.
  private hole=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0,blending:THREE.NoBlending,fog:false});
  private raycaster=new THREE.Raycaster();
  private resize=new ResizeObserver(()=>this.fit());
  private hovered:string|null=null;
  // Fare map frame (yellow when it is looked at or hovered) and the meshes a click on the map hits.
  private boardFrame:THREE.Mesh<THREE.BoxGeometry,THREE.MeshBasicMaterial>|null=null;
  private boardMeshes:THREE.Mesh[]=[];
  private near:string|null=null;
  // One sprite per look, each with its own texture to step through the frames, placed every frame where the top-down concourse has that commuter.
  private crowd:THREE.Sprite[]=[];
  // The far right of this station: Shinkansen transfer gates, or a shop. It sets the walls, what stands there and how the top-down concourse maps onto the hall.
  private shinkansen:boolean;
  private xAnchors:number[][];
  // The two pillars with the yellow exit signs, where main.ts stands them on the top-down map.
  private exitPillars:{x:number;z:number}[];
  constructor(private host:HTMLElement,private hub:Hub,devices:HallDevice[],private figures:()=>Figure[]=()=>[]){
    this.shinkansen=hasShinkansen(hub);this.xAnchors=anchors(this.shinkansen);this.exitPillars=[fromConcourse(this.xAnchors,254,380),fromConcourse(this.xAnchors,690,380)];
    try{this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'})}
    catch{const message=document.createElement('p');message.className='hall-no-webgl';message.textContent='WebGL is unavailable: use the buttons below to choose a machine.';host.append(message);return}
    this.css.domElement.className='hall-css3d';host.append(this.css.domElement);
    this.renderer.setPixelRatio(1);host.append(this.renderer.domElement);
    this.camera.rotation.order='YXZ';this.scene.background=new THREE.Color(C.haze);this.scene.fog=new THREE.Fog(C.haze,3200,8500);
    this.buildRoom();this.buildConcourse();this.buildBoard();this.buildBank(devices);
    this.resize.observe(host);this.fit();
    // Signs are painted with the bundled Japanese font once it is ready; until then the fallback font is used.
    document.fonts?.load('16px "Yorimichi JP"').then(()=>{for(const {texture,paint} of this.painted){const canvas=texture.image as HTMLCanvasElement;paint(canvas.getContext('2d')!,canvas.width,canvas.height);texture.needsUpdate=true}for(const paint of this.crisp)paint()}).catch(()=>{});
  }
  private texture(w:number,h:number,paint:Painter,repeat?:[number,number]){
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w));canvas.height=Math.max(1,Math.round(h));
    const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;paint(g,canvas.width,canvas.height);
    const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.colorSpace=THREE.SRGBColorSpace;
    if(repeat){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(...repeat)}
    this.painted.push({texture,paint});return texture;
  }
  private material(source:THREE.Texture|string){return new THREE.MeshBasicMaterial(typeof source==='string'?{color:source}:{map:source})}
  /** A plane placed by its CSS-style top-left corner on the wall (z sets how far it stands out). */
  private plane(w:number,h:number,material:THREE.Material,parent:THREE.Object3D=this.scene){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);parent.add(mesh);return mesh}
  private buildRoom(){
    const tiles:Painter=(g,w,h)=>{box(g,0,0,w,h,C.tile);dither(g,0,h-6,w,6,C.tileShade);g.fillStyle=C.grout;g.fillRect(0,h-1,w,1);g.fillRect(w-1,0,1,h)};
    const tiled=(w:number,shade=1)=>{const m=this.material(this.texture(75,44,tiles,[w/300,floorY/176]));m.color.setScalar(shade);return m};
    const wall=this.plane(wallR-wallL,floorY,tiled(wallR-wallL));wall.position.set((wallL+wallR)/2,-floorY/2,0);
    // Set-back walls, a little darker: behind the ticket office and the shop, and deeper at the back of the gates' openings, with their side walls.
    const back=(x0:number,x1:number,z:number,shade:number)=>this.plane(x1-x0,floorY,tiled(x1-x0,shade)).position.set((x0+x1)/2,-floorY/2,z);
    const side=(x:number,facing:1|-1)=>{const plane=this.plane(officeZ-backZ,floorY,tiled(officeZ-backZ,.75));plane.rotation.y=facing*Math.PI/2;plane.position.set(x,-floorY/2,(officeZ+backZ)/2)};
    back(westX,centralL,officeZ,.85);back(centralL,wallL,backZ,.8);side(centralL,1);
    if(this.shinkansen){back(wallR,transferR,backZ,.8);side(transferR,-1);back(transferR,eastX,officeZ,.85)}else back(wallR,eastX,officeZ,.85);
    const floorW=eastX-westX,floorD=frontZ-backZ;
    const floorTexture=this.texture(30,30,(g,w,h)=>{box(g,0,0,w,h,C.floorA);box(g,0,0,w/2,h/2,C.floorB);box(g,w/2,h/2,w/2,h/2,C.floorB);g.fillStyle=C.floorLine;g.fillRect(0,0,w,1);g.fillRect(0,0,1,h)},[floorW/240,floorD/240]);
    const floor=this.plane(floorW,floorD,this.material(floorTexture));floor.rotation.x=-Math.PI/2;floor.position.set((westX+eastX)/2,-floorY,(backZ+frontZ)/2);
    // A darker band along the wall stands in for the machines' contact shadow.
    const shadow=this.plane(wallR-wallL,60,new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.18}));shadow.rotation.x=-Math.PI/2;shadow.position.set((wallL+wallR)/2,-floorY+1,facadeD+30);
    // Tactile paving along the machines, as in every Japanese concourse.
    const paving=this.plane(wallR-wallL-600,64,this.material(this.texture(8,8,(g,w,h)=>{box(g,0,0,w,h,'#e8c440');for(const [x,y] of [[1,1],[5,1],[3,5],[7,5]])box(g,x,y,2,2,'#cfa72c')},[(wallR-wallL-600)/64,1])));
    paving.rotation.x=-Math.PI/2;paving.position.set((wallL+wallR)/2,-floorY+1,560);
    const ceiling=this.plane(floorW,floorD,this.material(this.texture(162,40,(g,w,h)=>{box(g,0,0,w,h,C.ceiling);dither(g,0,0,w,4,C.ceilingSeam);box(g,20,18,110,4,C.light);g.fillStyle=C.ceilingSeam;g.fillRect(w-1,0,1,h)},[floorW/650,floorD/160])));
    ceiling.rotation.x=Math.PI/2;ceiling.position.set((westX+eastX)/2,0,(backZ+frontZ)/2);
    // Square tiled pillars: at both ends of the machine wall, out in the concourse (the exit pillars among them) and behind the gates.
    const pillarTiles=tiled(300),base=this.material(C.steel);
    const exitZ=this.exitPillars[0].z;
    for(const [x,z] of [[wallL,0],[wallR,0],...this.exitPillars.map(p=>[p.x,p.z]),[-5100,exitZ],[8900,exitZ],[-1840,-2100],...(this.shinkansen?[[5720,-2100]]:[])]){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(300,floorY,300),pillarTiles);pillar.position.set(x,-floorY/2,z);this.scene.add(pillar);
      const skirt=new THREE.Mesh(new THREE.BoxGeometry(316,110,316),base);skirt.position.set(x,-floorY+55,z);this.scene.add(skirt);
    }
  }
  /** A sign hung from the ceiling on two rods, its top edge `top` below the ceiling. */
  private hanging(x:number,z:number,top:number,w:number,h:number,paint:Painter){
    this.plane(w,h,this.material(this.texture(w/texel,h/texel,paint))).position.set(x,-(top+h/2),z);
    const rod=this.material(C.steel);for(const dx of [-w*.35,w*.35]){const r=new THREE.Mesh(new THREE.BoxGeometry(8,top,8),rod);r.position.set(x+dx,-top/2,z);this.scene.add(r)}
  }
  /** What surrounds the bank: posters beside it, the ticket office and the central gates on the left, the transfer gates or the shop on the right, overhead signs and commuters. */
  private buildConcourse(){
    const poster=(x:number,z:number,place:'kamakura'|'nikko'|'arashiyama')=>{
      const frame=new THREE.Mesh(new THREE.BoxGeometry(600,840,24),this.material(C.steel));frame.position.set(x,-1010,z+12);this.scene.add(frame);
      this.plane(560,800,this.material(this.texture(140,200,(g,w,h)=>paintPoster(g,w,h,place)))).position.set(x,-1010,z+25);
    };
    poster(-280,0,'kamakura');poster(4080,0,'nikko');poster(9300,officeZ,'arashiyama');
    // Automatic ticket gates: grey cabinets with a blue stripe, their ends showing the green go arrow; the central gates on the left, the Shinkansen transfer gates on the right.
    const gateFront=this.material(this.texture(28,120,(g,w,h)=>{box(g,0,0,w,h,C.gate);box(g,0,0,w,10,C.gateTop);box(g,4,14,w-8,12,'#1d2622');pixelText(g,'↑',w/2,20,10,'#57c26a','center',true);box(g,0,h-10,w,10,'#9aa29a')}));
    const gateSide=this.material(this.texture(175,120,(g,w,h)=>{box(g,0,0,w,h,C.gate);dither(g,0,h-14,w,4,C.bodyShade);box(g,0,0,w,10,C.gateTop);box(g,0,26,w,3,'#3a78c2');box(g,0,h-10,w,10,'#9aa29a');box(g,w/2-14,40,28,30,'#c9cdc4',C.bodyEdge)}));
    const gateTop=this.material(C.gateTop),reader=this.material('#5aa9d8');
    for(const x of [...centralGates,...(this.shinkansen?transferGates:[])]){
      const gate=new THREE.Mesh(new THREE.BoxGeometry(110,480,700),[gateSide,gateSide,gateTop,gateTop,gateFront,gateFront]);gate.position.set(x,-floorY+240,gateZ);this.scene.add(gate);
      const ic=new THREE.Mesh(new THREE.BoxGeometry(80,8,110),reader);ic.position.set(x,-floorY+484,gateZ+240);this.scene.add(ic);
    }
    this.hanging(-1840,gateZ,420,1500,220,(g,w,h)=>paintHanging(g,w,h,{ja:'中央改札',en:'Central Gate',mark:'改',markBg:'#f2c230'}));
    // The yellow exit signs wrap the concourse pillars on either side of the bank, as on the top-down map.
    for(const [{x,z},west] of [[this.exitPillars[0],true],[this.exitPillars[1],false]] as const){
      const sign=this.material(this.texture(80,64,(g,w,h)=>{box(g,0,0,w,h,'#f2c230');box(g,0,h-3,w,3,'#c9a020');box(g,west?38:10,4,30,30,'#1d2622');pixelText(g,'出',west?53:25,19,24,'#f2c230','center',true);pixelText(g,west?'←':'→',west?20:62,19,24,'#1d2622','center',true);pixelText(g,west?'西口':'東口',w/2,44,14,'#1d2622','center',true);pixelText(g,west?'West Exit':'East Exit',w/2,57,9,'#1d2622','center',true)})),steel=this.material(C.steel);
      const band=new THREE.Mesh(new THREE.BoxGeometry(320,256,320),[sign,sign,steel,steel,sign,sign]);band.position.set(x,-880,z);this.scene.add(band);
    }
    this.hanging(-3600,300,560,1300,200,(g,w,h)=>paintHanging(g,w,h,{ja:'みどりの窓口',en:'JR Ticket Office',mark:'み',markBg:'#2c8a4a',markInk:'#fff',arrow:'←'}));
    // Over the Shinkansen transfer gates past the right pillar (the far right of the top-down concourse); a station without them has the NewDays there.
    if(this.shinkansen)this.hanging(5720,gateZ,420,1100,200,(g,w,h)=>paintHanging(g,w,h,{ja:'新幹線のりかえ',en:'Shinkansen Transfer',mark:'新',markBg:'#2a5ea8',markInk:'#fff'}));
    else this.plane(shopR-shopL,floorY-300,this.material(this.texture((shopR-shopL)/6,(floorY-300)/6,(g,w,h)=>paintShop(g,w,h,(shopDoor-shopL)/6)))).position.set((shopL+shopR)/2,-(300+floorY)/2,officeZ+2);
    // Over the bank, high enough to clear the fare map from every standing distance.
    this.hanging(1900,900,200,1500,200,(g,w,h)=>paintHanging(g,w,h,{ja:'きっぷうりば',en:'Tickets',mark:'券',markBg:'#fff'}));
    this.plane(centralL-officeL,floorY-300,this.material(this.texture((centralL-officeL)/6,(floorY-300)/6,(g,w,h)=>paintOffice(g,w,h,0)))).position.set((officeL+centralL)/2,-(300+floorY)/2,officeZ+2);
    // Commuters: the concourse's own, shown by render() where the top-down simulation has them.
    this.crowd=looks.map(look=>{
      const map=this.texture(160,48,(g)=>{g.clearRect(0,0,160,48);paintPerson(g,look)},[.125,1]).clone(),height=look.height??1;map.repeat.set(.125,1);
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map,alphaTest:.05,transparent:true}));sprite.center.set(.5,0);sprite.scale.set(320*height,768*height,1);sprite.visible=false;this.scene.add(sprite);return sprite;
    });
  }
  private buildBoard(){
    // Drawn at 1387 × 780 and scaled down on the wall to leave room above it for the station's name, as on the top-down map.
    const cx=1950,top=220,w=1387,h=780,scale=.877,bw=w*scale,bh=h*scale,border=18,cy=-(top+border+bh/2);
    const frame=new THREE.Mesh(new THREE.BoxGeometry(bw+border*2,bh+border*2,14),this.material(C.frame));frame.position.set(cx,cy,7);this.scene.add(frame);
    const nameW=860,nameH=140;
    const station=stations[this.hub];
    this.plane(nameW,nameH,this.material(this.texture(nameW/texel,nameH/texel,(g,cw,ch)=>{box(g,0,0,cw,ch,C.ink);box(g,0,ch-3,cw,3,station.accent);pixelText(g,`${station.ja}  ${station.en.toUpperCase()}`,cw/2,(ch-3)/2,22,'#fffef2','center',true)}))).position.set(cx,-(50+nameH/2),2);
    // Only the Tokyo map opens in detail, so only it can be highlighted and clicked.
    if(this.hub==='tokyo'){this.boardFrame=frame;frame.userData.device='map';this.boardMeshes.push(frame)}
    if(this.hub==='tokyo'){
      // The fare map is the vector SVG itself, kept sharp to be readable; the WebGL plane only clears its pixels to transparent.
      const holder=document.createElement('div');holder.className='hall-board';holder.style.width=w+'px';holder.style.height=h+'px';
      const svg=renderWallFareMap();svg.setAttribute('width',String(w));svg.setAttribute('height',String(h));holder.append(svg);
      const board=new CSS3DObject(holder);board.scale.setScalar(scale);board.position.set(cx,cy,14.5);this.cssScene.add(board);
      const hole=this.plane(bw,bh,this.hole);hole.position.copy(board.position);hole.userData.device='map';this.boardMeshes.push(hole);
    }else{
      const texture=this.texture(w/texel,h/texel,(g,cw,ch)=>{
        // One line per route from the station, which is marked in red at their left end.
        box(g,0,0,cw,ch,'#fffef2');pixelText(g,station.ja+'駅 · のりば案内',cw-12,14,14,'#2d563e','right',true);
        const row=(y:number,line:string,color:string,destination:string)=>{g.fillStyle=color;g.fillRect(70,y,cw-180,4);box(g,58,y-4,12,12,'#d6402e','#fff');box(g,cw-110,y-4,12,12,'#fff',C.ink);pixelText(g,station.ja,40,y+2,13,'#d6402e','center',true);pixelText(g,line,(cw-40)/2,y-12,12,color,'center',true);pixelText(g,destination,cw-92,y+2,13,C.ink,'left')};
        routes.filter(route=>route.from===this.hub).forEach((route,i)=>row(70+i*60,`${route.ja} ${route.line.replace(/ Line$/,'').toUpperCase()}`,route.color,route.name.split(' / ')[1]+(route.service==='local'?' ¥'+route.fare.toLocaleString('en-US'):'')));
        pixelText(g,`Detailed ${station.en} fare map coming soon.`,12,ch-14,12,'#65735a','left');
      });
      const board=this.plane(bw,bh,this.material(texture));board.position.set(cx,cy,14.5);
    }
  }
  /** The machine bank: a pale facade standing out from the wall, a lit sign over each machine, the machines set back in their recesses, a steel ledge and a plain cabinet below. */
  private buildBank(devices:HallDevice[]){
    const left=Math.min(...devices.map(d=>d.x))-120,right=Math.max(...devices.map(d=>d.x))+machineW+120;
    const panels:Painter=(g,w,h)=>{box(g,0,0,w,h,C.facade);dither(g,0,h-2,w,2,C.facadeShade);g.fillStyle=C.facadeSeam;g.fillRect(w-1,0,1,h)};
    const reveal=this.material(C.reveal);
    // Box faces: the sides and underside are the recess reveals (separate planes there would z-fight with them).
    const facade=(x0:number,x1:number,y0:number,y1:number)=>{const m=this.material(this.texture(75,(y1-y0)/texel,panels,[(x1-x0)/300,1]));const b=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,y1-y0,facadeD),[reveal,reveal,m,reveal,m,m]);b.position.set((x0+x1)/2,-(y0+y1)/2,facadeD/2);this.scene.add(b)};
    facade(left,right,facadeTop,recessTop);facade(left,right,recessBottom,floorY);
    const edges=[left,...devices.flatMap(d=>[d.x,d.x+machineW]),right];
    for(let i=0;i<edges.length;i+=2)facade(edges[i],edges[i+1],recessTop,recessBottom);
    const ledge=new THREE.Mesh(new THREE.BoxGeometry(right-left+40,16,facadeD+40),this.material(C.steel));ledge.position.set((left+right)/2,-recessBottom-7,(facadeD+40)/2);this.scene.add(ledge);
    for(const device of devices)this.buildMachine(device);
  }
  private buildMachine(device:HallDevice){
    const housing=housings[device.kind]??housings.local,group=new THREE.Group(),materials:THREE.MeshBasicMaterial[]=[];
    group.position.set(device.x,0,0);group.userData.device=device.id;this.scene.add(group);
    const mat=(source:THREE.Texture|string)=>{const m=this.material(source);materials.push(m);return m};
    const add=(mesh:THREE.Mesh)=>{mesh.userData.device=device.id;group.add(mesh);return mesh};
    const back=facadeD-recessD,recessH=recessBottom-recessTop;
    // Recess: housing face at the back; the facade boxes around it provide the reveals.
    add(new THREE.Mesh(new THREE.PlaneGeometry(machineW,recessH),mat(housing))).position.set(machineW/2,-(recessTop+recessBottom)/2,back);
    // Sign over the recess: crisp DOM text (like the fare map), seen through a hole in the facade.
    const sign=document.createElement('div');sign.className='hall-sign';sign.style.background=accents[device.kind]??accents.local;
    const [ja,en]=titles[device.kind]??['',''];sign.innerHTML=`<b></b><small></small><i>${device.id.slice(-2)}</i>`;sign.querySelector('b')!.textContent=ja;sign.querySelector('small')!.textContent=en;
    const signY=-(facadeTop+recessTop)/2;
    const signObject=new CSS3DObject(sign);signObject.position.set(device.x+machineW/2,signY,facadeD+.5);this.cssScene.add(signObject);
    add(new THREE.Mesh(new THREE.PlaneGeometry(signW-8,signH-8),this.hole)).position.set(machineW/2,signY,facadeD+.5);
    // Screen tilted back in a dark bezel, its bottom edge just over the payment face; cheeks close the sides.
    const screenX=40,screenW=machineW-80,screenTop=recessTop+18,payTop=recessTop+180,slope=payTop-screenTop-4,run=recessD-14,tilt=Math.asin(run/slope),drop=slope*Math.cos(tilt);
    const screen=this.texture(screenW/texel,slope/texel,(g,w,h)=>{
      box(g,0,0,w,h,C.bezel);const sx=4,sy=4,sw=w-8,sh=h-8;
      if(device.kind==='charge'){box(g,sx,sy,sw,sh,'#faf9eb');box(g,w/2-9,sy+10,18,12,'#7dba71');pixelText(g,'IC',w/2,sy+16,11,'#fff','center',true);g.fillStyle='#526c5a';g.fillRect(sx+18,sy+30,sw-36,2);g.fillRect(sx+28,sy+35,sw-56,1)}
      else if(device.kind==='shinkansen'){box(g,sx,sy,sw,sh,'#eef0e0');pixelText(g,'指定席',w/2,sy+6,10,'#41613b','center',true);['新幹線','指定席','予約','受取'].forEach((label,i)=>{const kw=(sw-12)/2,kh=Math.floor((sh-16)/2),kx=sx+4+(i%2)*(kw+4),ky=sy+13+Math.floor(i/2)*(kh+2);box(g,kx,ky,kw,kh,'#697268');pixelText(g,label,kx+kw/2,ky+kh/2,9,'#fff')})}
      else{box(g,sx,sy,sw,sh,'#0960bc');dither(g,sx,sy,sw,sh/2,'#4dcae3');pixelText(g,'きっぷ購入',w/2,sy+6,10,'#f3fbef','center',true);['160','200','210','260','350','440'].forEach((fare,i)=>{const kw=(sw-12)/3,kh=Math.floor((sh-16)/2),kx=sx+3+(i%3)*(kw+3),ky=sy+13+Math.floor(i/3)*(kh+2);box(g,kx,ky,kw,kh,'#deedf0','#b9d8d8');pixelText(g,fare,kx+kw/2,ky+kh/2,9,'#345769','center',true)})}
    });
    const panel=add(new THREE.Mesh(new THREE.PlaneGeometry(screenW,slope),mat(screen)));
    panel.rotation.x=-tilt;panel.position.set(screenX+screenW/2,-screenTop-drop/2,back+run/2);
    const cheekMaterial=mat(housing);cheekMaterial.side=THREE.DoubleSide;cheekMaterial.color.multiplyScalar(.85);
    const cheekShape=new THREE.Shape([new THREE.Vector2(0,0),new THREE.Vector2(run,-drop),new THREE.Vector2(0,-drop)]);
    for(const x of [screenX,screenX+screenW]){const cheek=add(new THREE.Mesh(new THREE.ShapeGeometry(cheekShape),cheekMaterial));cheek.rotation.y=-Math.PI/2;cheek.position.set(x,-screenTop,back)}
    // Payment block (after the Tokyo Station machines): crisp DOM face on a shallow box.
    const payH=recessBottom-payTop,payZ=facadeD-6;
    const top=mat(housing);top.color.multiplyScalar(.9);
    add(new THREE.Mesh(new THREE.BoxGeometry(machineW-24,payH,payZ-back),[top,top,top,top,this.hole,top])).position.set(machineW/2,-payTop-payH/2,(back+payZ)/2);
    const pay=document.createElement('canvas');pay.className='hall-pay';pay.width=(machineW-12)/2;pay.height=(payH+12)/2;pay.style.width=machineW-12+'px';pay.style.height=payH+12+'px';
    const paint=()=>paintPayment(pay.getContext('2d')!,pay.width,pay.height,device.kind);paint();this.crisp.push(paint);
    const payObject=new CSS3DObject(pay);payObject.position.set(device.x+machineW/2,-payTop-payH/2,payZ+.5);this.cssScene.add(payObject);
    // Hover outline: a frame around the recess and sign.
    const outline=new THREE.Group();outline.visible=false;group.add(outline);
    const rim=new THREE.MeshBasicMaterial({color:'#fff'}),t=10,frameTop=facadeTop+6,frameH=recessBottom-frameTop;
    for(const [w,h,x,y] of [[machineW+2*t,t,machineW/2,frameTop-t/2],[machineW+2*t,t,machineW/2,recessBottom-t/2],[t,frameH,-t/2,frameTop+frameH/2],[t,frameH,machineW+t/2,frameTop+frameH/2]]){const bar=new THREE.Mesh(new THREE.PlaneGeometry(w,h),rim);bar.position.set(x,-y,facadeD+1);outline.add(bar)}
    this.machines.set(device.id,{group,outline,materials,sign});
  }
  private fit(){
    if(!this.renderer)return;
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    // Same framing as the former CSS scene (perspective: 1000px), at about the game's 480px art width.
    // A short viewport (phone in landscape) widens the view as if it were 560px tall, so a whole machine and the map's foot still fit.
    const scale=Math.max(1,Math.round(w/640));
    this.renderer.setSize(Math.ceil(w/scale),Math.ceil(h/scale),false);this.css.setSize(w,h);
    this.camera.fov=2*Math.atan(Math.max(h,560)/2/1000)*180/Math.PI;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  /** Highlights: yellow rim on the machine in front or the map looked at (A / E or a click uses it), white rim on another hovered machine. */
  setHover(id:string|null){this.hovered=id;this.refresh()}
  private refresh(){
    this.boardFrame?.material.color.set(this.near==='map'||this.hovered==='map'?'#f3d76b':C.frame);
    for(const [id,machine] of this.machines){
      const hovered=id===this.hovered||id===this.near;machine.outline.visible=hovered;
      ((machine.outline.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.set(id===this.near?'#f3d76b':'#ffffff');
      for(const m of machine.materials)m.userData.base??=m.color.clone(),m.color.copy(m.userData.base).multiplyScalar(hovered?1.12:1);
      machine.sign.classList.toggle('is-hover',hovered);
    }
  }
  render(x:number,yaw:number,pitch:number,distance:number,near:string|null){
    if(!this.renderer)return;
    if(near!==this.near){this.near=near;this.refresh()}
    // The eye stays 1000px behind the former CSS pivot (perspective: 1000px) and the head turns in place, like a first-person look.
    this.camera.rotation.set(pitch*Math.PI/180,-yaw*Math.PI/180,0);
    this.camera.position.set(x,eyeY,distance+1000);
    const t=performance.now()/1000;
    // Each commuter where the concourse has them, fading through the gates as they do there, and out as they come within a few steps of the eye (the top-down map is denser than the hall).
    for(const sprite of this.crowd)sprite.visible=false;
    for(const f of this.figures()){
      const sprite=this.crowd[f.look],{x:fx,z}=fromConcourse(this.xAnchors,f.x,f.y),opacity=f.alpha*Math.min(1,(this.camera.position.z-z-450)/450);if(!sprite||opacity<.05)continue;
      sprite.visible=true;sprite.position.set(fx,-floorY,z);sprite.material.opacity=opacity;
      (sprite.material.map as THREE.Texture).offset.x=({down:0,up:2,left:4,right:6}[f.face]+(f.moving?Math.floor(t*4+f.look)%2:0))*.125;
    }
    this.renderer.render(this.scene,this.camera);this.css.render(this.cssScene,this.camera);
  }
  /** The machine under a viewport point, from the same camera as the last frame. */
  pick(clientX:number,clientY:number){
    if(!this.renderer)return null;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1),this.camera);
    const hit=this.raycaster.intersectObjects([...[...this.machines.values()].map(m=>m.group as THREE.Object3D),...this.boardMeshes],true).find(h=>h.object.userData.device);
    return (hit?.object.userData.device as string|undefined)??null;
  }
  dispose(){
    this.resize.disconnect();
    this.scene.traverse(object=>{const mesh=object as THREE.Mesh;mesh.geometry?.dispose();for(const m of [mesh.material??[]].flat())(m as THREE.Material).dispose()});
    for(const {texture} of this.painted)texture.dispose();for(const sprite of this.crowd)sprite.material.map?.dispose();
    this.renderer?.dispose();this.renderer?.domElement.remove();this.css.domElement.remove();
  }
}
