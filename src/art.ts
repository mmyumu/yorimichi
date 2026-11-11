import Phaser from 'phaser';
import { exitName, hasShinkansen, inKyoto, machineKinds, stations, tracksFor, type Hub, type Konbini, type Platform, type Service } from './network';
import { loadLook, paintTraveller } from './look';
import { looks } from './people';
import { onTokyoBoard } from './tokyo-fares';
import { stampInk } from './stamps';
import { type Piece, type Sight } from './sights';

// Original pixel tiles painted on a 480 × 320 canvas, displayed at integer 2× scale.
/** A map canvas at twice the art's density, drawn in art coordinates: the art keeps its 2-px blocks while the lettering gets one screen pixel per dot. */
export function mapCanvas(scene:Phaser.Scene,key:string,w:number,h:number){const texture=scene.textures.createCanvas(key,w*2,h*2)!;texture.context.scale(2,2);return texture}
/** Lettering in the PixelMplus10 bitmap font, whose outlines are whole pixels: 10px for small print (a dot per pixel of the canvas's full density, half an art px)
 * or `big` at 20px (a dot per art px, like the rest of the art). (x, y) is the top left of the text's cell, 5 art px high (10 if big), or its top centre or right with `g.textAlign`;
 * kanji and kana are as wide as the cell is high, Latin half that. */
export function letter(g:CanvasRenderingContext2D,x:number,y:number,text:string,color:string,big=false){
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
/** A round crown, its leaves dithered: the light from the top left with some noise, a ragged edge, the shade along its lower rim. `pal`: shade, body, mid, light. */
export function softCrown(r:(x:number,y:number,w:number,h:number,c:string)=>void,rand:()=>number,cx:number,cy:number,rx:number,ry:number,pal:readonly string[]){
  for(let yy=-Math.ceil(ry);yy<=Math.floor(ry);yy++)for(let xx=-Math.ceil(rx);xx<=Math.floor(rx);xx++){const d=Math.hypot(xx/rx,yy/ry),light=(-xx*.5-yy)/((rx+ry)/1.475)+(rand()-.5)*.35;if(d>1-rand()*.08)continue;
    r(cx+xx,cy+yy,1,1,d>.86&&yy>2?pal[0]:light>.45?pal[3]:light>.05?pal[2]:light>-.4?pal[1]:pal[0])}
}
const leafy=['#345d48','#487951','#63905b','#86a367'] as const;
/** Pot plants drawn to the half pixel, each on a spot 10 px wide with its pot's foot at y+14: a dot snapped to the half pixel; a pot, wider at the rim, its soil, lit from the left;
 * a stem bending under its own weight, called along its length. Shared by the Kyoto house, the apartment and the home street. */
function potPlants(r:Painter){
  const dot=(x:number,y:number,c:string,size=.5)=>r(Math.round(x*2)/2,Math.round(y*2)/2,size,size,c);
  const pot=(x:number,y:number,w:number,h:number,body:string,lit:string,dim:string)=>{r(x+1,y+h,w,1,'#00000030');for(let k=0;k<h;k+=.5){const inset=k/h*1.2;r(x+inset,y+k,w-inset*2,.5,body);r(x+inset+.5,y+k,1,.5,lit);r(x+w-inset-1.5,y+k,1.5,.5,dim)}r(x-.5,y-.5,w+1,1.5,lit);r(x+w-1,y-.5,1.5,1.5,dim);r(x+.5,y-.5,w-1,.5,'#3a2a20')};
  const bend=(x:number,y:number,dx:number,dy:number,sag:number,each:(px:number,py:number,t:number,i:number)=>void)=>{const n=Math.ceil(Math.hypot(dx,dy+sag)*2);for(let i=0;i<=n;i++){const t=i/n;each(x+dx*t,y+dy*t+sag*t*t,t,i)}};
  const terracotta=['#b66c51','#d89070','#8a4c3a'] as const,indigo=['#35506e','#5f83a4','#233850'] as const,glazed=['#e4e2da','#fbfaf4','#b8b4aa'] as const;
  // 観音竹, the lady palm of old houses: dark canes, each opening into a fan of long leaflets.
  const palm=(x:number,y:number)=>{for(const [cx,top] of [[3,3],[7,2],[5,-3]] as const){bend(x+5,y+8,cx-5,top-8,0,(px,py)=>dot(px,py,'#4a3a2a'));
      for(const [k,c] of [[-3,'#2f5a44'],[3,'#2f5a44'],[-2,'#3f7a52'],[2,'#3f7a52'],[-1,'#5a9a60'],[1,'#5a9a60'],[0,'#7fb26c']] as const)bend(x+cx,y+top,k*1.9,-4.5+Math.abs(k)*1.1,Math.abs(k)*.9,(px,py)=>dot(px,py,c))}
    pot(x+1,y+8,8,6,...indigo)};
  // A fern: fronds spilling over the rim all round, the outer ones the darkest, little leaflets either side.
  const fern=(x:number,y:number,tone:'#7fb26c'|'#9cc47a'='#7fb26c')=>{pot(x+1,y+8,8,6,...terracotta);
    for(const [dx,dy,sag,c] of [[-7,-1,5,'#2f5a44'],[7,-1,5,'#2f5a44'],[-6,-5,5,'#3f7a52'],[6,-5,5,'#3f7a52'],[-3,-7,3,'#4f8a58'],[3,-7,3,'#4f8a58'],[-4,-3,4,'#5a9a60'],[4,-3,4,'#5a9a60'],[0,-6,1,tone]] as const)
      bend(x+5,y+8,dx,dy,sag,(px,py,t,i)=>{dot(px,py,c);if(i%2&&t>.2&&t<.95){dot(px-.5,py-.5,c);dot(px+.5,py+.5,c)}})};
  // A moth orchid in glazed china on the cabinet: long dark leaves, a stem arching over them, its white flowers down the arch.
  const orchid=(x:number,y:number)=>{for(const [dx,dy,sag,c] of [[-4,-1,2,'#2f5a44'],[4,-1,2,'#3f7a52'],[-2,-2,3,'#3f7a52']] as const)bend(x+5,y+9,dx,dy,sag,(px,py)=>{dot(px,py,c,1)});pot(x+1.5,y+9,7,5,...glazed);
    bend(x+5,y+9,5,-13,9,(px,py,t,i)=>{dot(px,py,'#5a7a48');if(t>.4&&i%4===0){for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]] as const)dot(px+ox,py+oy,'#fbf6f2',1);dot(px+.25,py+.25,'#d8688a')}})};
  // A black pine in its shallow dish: a trunk twisting up, needles in flat pads, the top of each in the light.
  const bonsai=(x:number,y:number)=>{bend(x+3,y+11,4,-8,0,(px,py,t)=>{const swing=Math.sin(t*5)*1.6;dot(px+swing,py,'#4a3a2a',1);dot(px+swing+.5,py,'#6d5540')});
    for(const [cx,cy,w] of [[2,6,5],[8,4,5],[5,1,6]] as const){for(let k=-w/2;k<=w/2;k+=.5){const h=1-Math.abs(k/w)*2;r(x+cx+k,y+cy-h*1.5,.5,h*2.5+.5,'#2c5543')}for(let k=-w/2+1;k<w/2-1;k+=1)dot(x+cx+k,y+cy-1-(k&1?.5:0),'#6f9a5c')}
    pot(x-1,y+11,12,3,...indigo)};
  return {dot,pot,bend,terracotta,indigo,glazed,palm,fern,orchid,bonsai};
}
export function makeArt(scene:Phaser.Scene){
  makeBins(scene);makeNeedIcons(scene);makeCommuters(scene);makePhone(scene);makeCar(scene);makePigeons(scene);makeCat(scene);makeHomeStreet(scene);makeKyotoLane(scene);makeKyotoHouse(scene);makeApartment(scene);
  // 16×24 traveller sprite, four facings and three animation frames, as chosen on a new journey (look.ts).
  const look=loadLook();
  for(const face of ['down','up','left','right'])for(let frame=0;frame<3;frame++){const t=scene.textures.createCanvas(`traveller-${face}-${frame}`,20,28)!;paintTraveller(t.context,face,frame,look);t.refresh()}
}

/** The street outside a sight, on first use: its entrance in the middle of the back, on the layout of the street outside a station (makeTown, whose road, crossing, street lights and bus stop are here too, so that main.ts shares them, Lorenzo's Uber included):
 * what surrounds it 34–136, entrance 190–290 × 88–136, pavement to 199, road 199–247, far pavement to 262, the neighbours' hedge and roofs below. The sign to the station on its post (1–45 × 140–153), the stop only where a bus serves the sight (`bus`).
 * The surroundings follow the sight: a plastered temple wall with its gate, a hedge with a torii, shop fronts, or trees. */
export function makeSightRoad(scene:Phaser.Scene,place:string,sight:Sight,bus:boolean,avenue?:{height:number;dress:(g:CanvasRenderingContext2D)=>void;lifted:(picture:HTMLCanvasElement)=>void}){
  if(scene.textures.exists('map-'+place))return;
  const texture=mapCanvas(scene,'map-'+place,480,avenue?.height??320),g=texture.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
  let seed=[...sight.id].reduce((n,c)=>n*31+c.charCodeAt(0),7)>>>0;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const pieces=sight.pieces??[],kind=(name:Piece[0])=>pieces.find(piece=>piece[0]===name),city=sight.ground==='street',torii=kind('torii') as ['torii',string]|undefined;
  const built=(kind('temple')??kind('gate')??kind('pavilion')) as [string,string,string]|undefined,timber=kind('pavilion')?'#6e5138':built?.[1]??'#6e5138',tiles=built?.[2]??'#4d5a5c',greens=['#2f5a4e','#3f7558','#5a8c66','#7fa77a'] as const;
  const tileRoof=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,tiles);for(let xx=x+2;xx<x+w-1;xx+=5)r(xx,y+1,1,h-2,'#00000030');r(x-2,y+h-1,w+4,2,'#2c3638');r(x+3,y-1,w-6,1,'#ffffff30')};
  const treeline=(from:number,to:number,top:number,bottom:number)=>{r(from,top+10,to-from,bottom-top-10,greens[0]);for(let x=from;x<to;x+=12+rand()*16){const k=rand(),pal=k<.2?['#1f3f33','#2b5242','#3a6a50','#4e8060']:k<.3?['#6a7a38','#8d9a45','#b3b558','#d6cf78']:k<.65?greens:['#345d48','#487951','#63905b','#86a367'],rx=12+rand()*12;softCrown(r,rand,x,top+12+rand()*18,rx,rx*.75,pal)}};
  // The sky over it all, then the pavement, the road with its crossing, the far pavement and what lies across the road.
  // What shines through the night: `glows`, boxes of the finished picture, and `sparks`, lights that are only there after dark.
  const glows:[number,number,number,number][]=[],sparks:[number,number,number,number,string][]=[],glow=(x:number,y:number,w:number,h:number)=>{glows.push([Math.round(x),Math.round(y),Math.round(w),Math.round(h)])},spark=(x:number,y:number,w:number,h:number,c='#ffd890')=>{sparks.push([Math.round(x),Math.round(y),w,h,c])};
  const mix=(a:string,b:string,t:number)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
  for(let i=0;i<17;i++)r(0,i*8,480,8,mix('#8fbfdc','#d6e8e4',i/16));for(const [x,y,w] of [[36,50,56],[150,42,40],[290,46,70],[400,60,50]]){r(x,y,w,3,'#f4f8f6');r(x+6,y-2,w-18,2,'#ffffff');r(x+3,y+3,w-10,1,'#dce8ea')}
  r(0,136,480,63,city?'#a9aaa6':'#cfc6a8');for(let y=136;y<199;y+=8)for(let x=(y-136)%16?0:8;x<480;x+=16){r(x,y,1,8,city?'#9a9b97':'#bdb495')}for(let y=136;y<199;y+=8)r(0,y,480,1,city?'#9a9b97':'#bdb495');
  r(0,197,480,2,'#e0dccb');
  r(0,199,480,48,'#5d625c');for(let i=0;i<300;i++)r(rand()*480,199+rand()*48,1,1,'#6b706a');
  for(let x=0;x<480;x+=32)if(x<196||x>276)r(x,222,16,2,'#e6e3cc');for(let y=203;y<243;y+=6)r(206,y,68,3,'#e6e3cc');
  r(0,247,480,3,'#e0dccb');r(0,250,480,12,'#bdb59a');for(let x=0;x<480;x+=16)r(x,250,1,12,'#a9a187');
  for(const lx of townLights)streetLight(r,lx,false);
  if(bus)busPole(r,busStop);
  r(0,262,480,58,'#3f6a4c');for(let x=0;x<480;x+=9){r(x,262,8,5,'#4f7f58');r(x+2,263,3,1,'#74a070')}
  for(let x=-10;x<480;){const w=50+Math.floor(rand()*30),wall=['#d8cfb8','#e4dcc6','#c8bca4','#d0c8b8'][Math.floor(rand()*4)],win=rand()<.5;r(x,276,w-6,44,wall);r(x+w-8,276,2,44,'#00000020');if(win){r(x+6,288,14,16,'#5a4a3a');r(x+w-26,288,14,16,'#5a4a3a');r(x+6,288,14,2,'#00000030');if(rand()<.6)spark(x+7,290,12,13,'#f2cf7c');if(rand()<.4)spark(x+w-25,290,12,13,'#f2cf7c')}else{for(let wx=x+5;wx<x+w-14;wx+=12){r(wx,286,8,8,'#7a96a4'),r(wx,286,8,1,'#00000030');if(rand()<.45)spark(wx+1,287,6,6,'#f2cf7c')}r(x+w/2-6,300,12,20,'#6a4a34')}if(rand()<.4){r(x+w-18,306,8,6,'#6a5240');softCrown(r,rand,x+w-14,304,5,4,greens)}tileRoof(x-4,268,w+2,12);x+=w}
  // The approach to the entrance, across the pavement; the wall's shadow along its foot, the yellow studded slabs at the crossing, a manhole, the gutter's grates, the road worn where the wheels run.
  r(206,136,68,63,city?'#b9bab6':'#dcd4b8');for(let y=138;y<199;y+=10)r(206,y,68,1,city?'#a5a6a2':'#c6bd9f');
  r(0,136,480,2,'#00000026');for(const y of [193,251]){r(206,y,68,4,'#e0b83a');for(let x=207;x<274;x+=3)r(x,y+1,1,1,'#b08a22'),r(x+1,y+3,1,1,'#b08a22')}
  if(city){r(46,184,160,3,'#e0b83a');r(274,184,206,3,'#e0b83a');for(let x=46;x<480;x+=4)if(x<206||x>=274)r(x,185,2,1,'#b08a22');r(238,184,4,9,'#e0b83a')}
  for(const [x,y] of [[118,168],[330,160]]){r(x+1,y,8,7,'#8a8b84');r(x,y+1,10,5,'#8a8b84');r(x+2,y+1,6,5,'#9c9d96');for(let i=0;i<3;i++)r(x+2+i*2,y+2+i%2,1,3,'#74756e')}
  for(const x of [20,150,300,430])r(x,198,9,2,'#3a3e3a'),r(x,250,9,2,'#3a3e3a');r(0,206,480,6,'#0000000c');r(0,232,480,6,'#0000000c');r(92,226,26,14,'#565b55');r(318,204,40,10,'#646962');
  if(!city)for(let i=0;i<60;i++)r(rand()*480,138+rand()*rand()*40,2,1,['#b08a48','#c8a23a','#8a6a40','#a8b060'][Math.floor(rand()*4)]);
  // What stands along the pavement, its foot on the wall's line.
  const stoneLamp=(x:number,f:number)=>{r(x-5,f,12,2,'#00000030');r(x-4,f-3,10,3,'#8f9184');r(x-1,f-13,4,10,'#a3a598');r(x-4,f-19,10,6,'#b5b5a8');r(x-2,f-18,6,4,'#5b5a50');spark(x-2,f-18,6,4);r(x-6,f-22,14,3,'#83857a');r(x-6,f-22,14,1,'#a3a598');r(x-2,f-25,6,3,'#a3a598')};
  const nobori=(x:number,f:number,c:string)=>{r(x,f-36,1,36,'#d8d4c8');r(x+1,f-35,8,1,'#d8d4c8');r(x+1,f-34,8,25,c);r(x+1,f-34,1,25,'#ffffff40');for(let i=0;i<4;i++)r(x+3,f-32+i*6,4,4,'#fffffff0'),r(x+4,f-31+i*6,2,2,c);r(x-1,f-1,3,2,'#6a6a62')};
  const vending=(x:number,f:number,c:string)=>{r(x+1,f,15,2,'#00000030');r(x,f-27,14,27,c);r(x,f-27,14,1,'#ffffff60');r(x+13,f-27,1,27,'#00000030');r(x+1,f-25,12,12,'#e8f0ee');glow(x+1,f-25,12,12);for(let j=0;j<2;j++)for(let i=0;i<4;i++)r(x+2+i*3,f-24+j*6,2,4,['#c8452e','#3a78c2','#e0b040','#4a8a5a','#f4f4ec'][(i+j*2)%5]);r(x+1,f-19,12,1,'#b8c4c0');r(x+2,f-11,6,2,'#2a2e30');r(x+10,f-11,2,3,'#d8d4c8');r(x+2,f-6,10,3,'#2a2e30')};
  const bike=(x:number,f:number,c:string)=>{r(x,f,16,1,'#00000030');for(const wx of [x,x+10]){r(wx+1,f-7,4,1,'#2a2e30');r(wx+1,f-1,4,1,'#2a2e30');r(wx,f-6,1,5,'#2a2e30');r(wx+5,f-6,1,5,'#2a2e30')}r(x+3,f-8,9,1,c);r(x+5,f-8,1,5,c);r(x+12,f-11,1,7,c);r(x+11,f-12,4,1,'#2a2e30');r(x+3,f-10,4,1,'#3a2c20');r(x+12,f-10,4,3,'#8a7a5a')};
  const postbox=(x:number,f:number)=>{r(x,f,9,2,'#00000030');r(x+3,f-6,2,6,'#8a2a20');r(x,f-19,8,13,'#d0402c');r(x,f-19,8,1,'#f07058');r(x+7,f-19,1,13,'#a83020');r(x+1,f-16,6,1,'#2a2020');r(x+2,f-13,4,1,'#ffffff');r(x+3,f-11,2,3,'#ffffff');r(x+2,f-12,4,1,'#ffffff')};
  const notice=(x:number,f:number)=>{r(x,f,24,2,'#00000030');r(x+1,f-16,2,16,'#5a4232');r(x+19,f-16,2,16,'#5a4232');r(x,f-21,22,14,'#e8dcc0');for(let i=0;i<4;i++)r(x+2,f-19+i*3,18-(i*5)%7,1,'#3a2c20');r(x-2,f-24,26,3,'#4b5456');r(x-1,f-25,24,1,'#6e787a')};
  const planter=(x:number,f:number)=>{r(x,f-5,9,5,'#8a6a50');r(x,f-5,9,1,'#a88868');softCrown(r,rand,x+4,f-8,5,4,greens)};
  const bench=(x:number,f:number)=>{r(x,f,22,1,'#00000030');r(x,f-6,22,2,'#8a6a48');r(x,f-6,22,1,'#a88860');r(x+1,f-4,2,4,'#4a4a48');r(x+19,f-4,2,4,'#4a4a48');r(x,f-11,22,2,'#7a5c3e')};
  const pole=(x:number)=>{r(x-1,136,6,2,'#00000030');r(x,40,3,97,'#8e8a80');r(x,40,1,97,'#aaa69c');r(x-9,46,21,2,'#6e6a62');r(x-7,54,17,2,'#6e6a62');for(const dx of [-8,-3,5,10])r(x+dx,44,1,2,'#d8d4c8');r(x+4,62,6,10,'#7a7e80');r(x+4,62,6,1,'#9a9ea0');r(x,114,3,9,'#e0b83a');r(x,116,3,1,'#2a2e30');r(x,119,3,1,'#2a2e30')};
  const wire=(x0:number,y0:number,x1:number,y1:number,sag:number,c='#2a2e30a0')=>{for(let x=x0;x<=x1;x++){const t=(x-x0)/(x1-x0);r(x,y0+(y1-y0)*t+sag*4*t*(1-t),1,1,c)}};
  const wires=(a:number,b:number)=>{pole(a);pole(b);for(const [y,s] of [[46,5],[54,7]]){wire(0,y+4,a,y,s);wire(a,y,b,y,s+3);wire(b,y,480,y+3,s)}wire(a+7,66,b+7,66,6)};
  const pineOver=(x:number,y:number,flip=1)=>{for(let i=0;i<12;i++)r(x+flip*Math.round(i*.7),y-i,3,1,'#4a3628');for(const [dx,dy,w] of [[-6,-12,11],[9,-8,9],[3,-18,8]])softCrown(r,rand,x+flip*dx,y+dy,w,4,['#234a38','#2f6048','#44795a','#6a9a70'])};
  const cedar=(x:number,foot:number,h:number)=>{r(x-1,foot-h*.3,3,h*.3,'#4c3528');for(let i=0;i<5;i++)softCrown(r,rand,x,foot-h*.25-i*h*.16,12-i*2,5,['#1f3f33','#2b5242','#3a6a50','#4e8060'])};
  const jizo=(x:number,f:number)=>{r(x,f-8,7,8,'#8d8f84');r(x+1,f-13,5,5,'#a3a598');r(x+2,f-11,1,1,'#5c5c52');r(x+4,f-11,1,1,'#5c5c52');r(x,f-8,7,3,'#c8452e');r(x+1,f-15,5,2,'#c8452e')};
  const ledge=(x:number,w:number,moss=true)=>{r(x,120,w,16,'#8e8a7c');for(let xx=x;xx<x+w;xx+=11){r(xx+rand()*2,121,9,6,['#9a9688','#84806f','#a8a494'][Math.floor(rand()*3)]);r(xx+5+rand()*2,128,9,7,['#9a9688','#84806f','#a8a494'][Math.floor(rand()*3)])}r(x,134,w,2,'#00000030');if(moss)for(let xx=x;xx<x+w;xx+=2)r(xx,119+Math.floor(rand()*2),2,2+Math.floor(rand()*3),rand()<.5?'#5f8a4e':'#7aa05c')};
  if(city){
    // A city street: towers in the haze, the district's landmark over the roofs, then fronts each with its blade sign, its awning and what the shop puts out; the way in under an arch.
    const posh=sight.id==='ginza',hue=(kind('neon')?.[1] as string|undefined)??'#c8452e',names=['カラオケ','ラーメン','ドラッグ','居酒屋','串かつ','たこ焼'];
    for(let x=-8;x<480;){const w=22+Math.floor(rand()*26),h=36+rand()*46;r(x,96-h,w,h+40,mix('#b7d4dc','#7f97ac',.5+rand()*.3));for(let wy=100-h;wy<96;wy+=5)for(let wx=x+2;wx<x+w-2;wx+=4)if(rand()<.5)r(wx,wy,2,2,'#ffffff30');x+=w+Math.floor(rand()*6)}
    if(kind('kyotoTower')){const cx=118;r(cx-9,86,18,50,'#e8e4dc');for(let i=0;i<40;i++){const t=i/39,w=4+10*(1-t)**2+3*t**3;r(cx-w/2,84-i,w,1,'#f4f2ec');r(cx+w/2-1,84-i,1,1,'#c8c6c0')}glow(cx-13,36,26,15);spark(cx-1,22,2,2,'#ff5a40');r(cx-11,40,22,3,'#d8402c');r(cx-13,43,26,5,'#f4f2ec');for(let x=cx-12;x<cx+12;x+=3)r(x,44,2,2,'#5a7a8a');r(cx-11,48,22,3,'#e8562c');r(cx-6,36,12,4,'#f4f2ec');r(cx-1,22,2,14,'#d8402c')}
    if(kind('tsutenkaku')){const cx=372;for(let i=0;i<70;i++){const t=i/69,w=10+12*t**2.4;r(cx-w/2,50+i,2,1,'#c9ced2');r(cx+w/2-2,50+i,2,1,'#aab0b6');if(i%8===0)r(cx-w/2,50+i,w,1,'#b8bec4');if(i%8===4){wire(cx-w/2,50+i,cx+w/2,58+i,0,'#b8bec4');wire(cx-w/2,58+i,cx+w/2,50+i,0,'#b8bec4')}}glow(cx-12,34,24,16);glow(cx-4,56,8,32);r(cx-12,36,24,14,'#e4e8ea');r(cx-14,34,28,3,'#aab0b6');for(let x=cx-10;x<cx+10;x+=4)r(x,39,2,7,'#6a8494');r(cx-4,28,8,6,'#d0d6da');r(cx-1,16,2,12,'#c9ced2');r(cx-4,56,8,40,'#d8402c');g.textAlign='center';for(const [i,ch] of [...'通天閣'].entries())letter(g,cx,58+i*12,ch,'#ffffff',true);g.textAlign='left'}
    let x=-6,k=0;while(x<480){const w=56+(k*19)%22,mark=kind('kyotoTower')?118:kind('tsutenkaku')?372:-99,top=x<mark+18&&x+w>mark-18?88:44+(k*29)%34,sign=posh?['#2a2e34','#3a3028','#283440'][k%3]:[hue,'#e0483a','#34b6e0','#f0c030','#d060b0'][k%5],wall=posh?['#d8d2c4','#c4c0b6','#e2ded2'][k%3]:['#4a4e56','#5a565e','#44505a'][k%3];
      if(x+w>196&&x<284){x=284;k++;continue}
      r(x,top,w-2,136-top,wall);r(x+w-5,top,3,136-top,'#00000028');r(x,top,w-2,2,'#ffffff30');glow(x+3,111,w-8,25);
      // The roof's clutter: a tank, the air conditioning, a hoarding's frame.
      if(k%3===0){r(x+8,top-9,10,9,'#8a9094');r(x+8,top-9,10,2,'#a8aeb2');r(x+10,top-2,1,2,'#3a3e40');r(x+15,top-2,1,2,'#3a3e40')}else if(k%3===1){r(x+w-24,top-5,12,5,'#b8bcbc');r(x+w-22,top-4,3,3,'#6a7074')}else{glow(x+6,top-14,w-16,11);r(x+6,top-14,w-16,11,posh?'#e8e4d8':['#e8562c','#3a78c2','#e8c040'][k%3]);r(x+6,top-14,w-16,1,'#ffffff60');r(x+10,top-3,1,3,'#3a3e40');r(x+w-14,top-3,1,3,'#3a3e40')}
      for(let wy=top+24;wy<108;wy+=9)for(let wx=x+5;wx<x+w-16;wx+=8){r(wx,wy,5,posh?7:5,(wx+wy)%3?'#a8c4cc':'#e8d8a0');r(wx,wy,5,1,'#00000030');if(!((wx+wy)%3)||(wx*7+wy*3)%5<2)spark(wx,wy+1,5,posh?6:4,(wx+wy)%2?'#f2cf7c':'#e8e4c8')}
      if(top<80){glow(x+4,top+5,w-18,14);r(x+4,top+5,w-18,14,sign);r(x+4,top+5,w-18,1,'#ffffff60');r(x+4,top+18,w-18,1,'#00000040')}
      if(top<80&&posh)letter(g,x+8,top+9,['GINZA','TOKYO','SINCE 1904'][k%3],'#d8c48a');else if(top<80&&w-18>=42)letter(g,x+6,top+6,names[k%names.length],k%5===3?'#3a2c20':'#ffffff',true);
      // The blade sign down the corner, a letter to a line.
      if(!posh&&top<80){const bc=[hue,'#e0483a','#34b6e0','#f0c030','#d060b0'][(k+2)%5];r(x+w-13,top+8,9,46,'#23292e');glow(x+w-12,top+9,7,44);r(x+w-12,top+9,7,44,bc);for(const [i,ch] of [...['酒','居酒屋','ラーメン','カラオケ'][k%4]].entries())letter(g,x+w-11,top+11+i*10,ch,bc==='#f0c030'?'#3a2c20':'#ffffff',true)}
      // The ground floor: the awning, the window and its goods, the door, the stand on the pavement.
      r(x,112,w-2,24,'#2f3a40');r(x+3,119,w-22,15,'#c8dde0');r(x+3,119,w-22,2,'#ffffff60');for(let gx=x+5;gx<x+w-22;gx+=5)r(gx,128,3,5,['#e0483a','#f0c030','#34b6e0','#f4f4ec','#6a8a4a'][(gx+k)%5]);r(x+w-17,118,11,18,'#3a2c20');r(x+w-15,120,7,16,'#a8c4cc');r(x+w-12,120,1,16,'#3a2c20');
      r(x-1,111,w,5,posh?'#3a3028':sign);if(!posh)for(let ax=x+2;ax<x+w-2;ax+=8)r(ax,111,4,5,'#f4f4ec');r(x-1,116,w,1,'#00000040');
      if(k%2){r(x+6,128,7,9,'#3a2c20');r(x+7,129,5,6,'#e8dcc0');r(x+8,131,3,1,'#c8452e')}else if(!posh){for(let i=0;i<3;i++){r(x+5+i*7,117,5,7,'#d0402c');r(x+5+i*7,119,5,1,'#f4f4ec');r(x+6+i*7,116,3,1,'#2a2020')}}
      x+=w;k++}
    // The way in: an arch over the street beyond, its fronts running away under their lanterns.
    r(196,96,88,40,'#8fb4c8');r(206,112,68,24,'#b0b1ad');for(let i=0;i<5;i++){const d=i*5;r(206+d,100+i*2,6,36-i*2,['#4a4e56','#5a565e','#44505a'][i%3]);r(268-d,100+i*2,6,36-i*2,['#5a565e','#44505a','#4a4e56'][i%3]);r(207+d,108+i,4,3,[hue,'#e0483a','#f0c030','#34b6e0','#d060b0'][i]);r(269-d,110+i,4,3,['#34b6e0','#f0c030',hue,'#d060b0','#e0483a'][i])}r(232,112,16,24,'#c4c5c0');for(let y=114;y<136;y+=4)r(232,y,16,1,'#b0b1ad');
    r(196,84,10,52,'#3a4048');r(274,84,10,52,'#3a4048');r(198,84,2,52,'#565e68');r(276,84,2,52,'#565e68');glow(190,74,100,28);glow(206,100,68,36);r(190,74,100,18,'#23292e');r(190,74,100,2,hue);r(190,90,100,2,hue);if(!posh)for(let lx=210;lx<272;lx+=10){r(lx,94,5,6,'#d0402c');r(lx,96,5,1,'#f4f4ec')}
    vending(150,137,'#d0402c');vending(165,137,'#f4f4ec');bike(60,138,'#3a78c2');bike(78,138,'#6a6a62');planter(300,137);planter(430,137);if(!posh)nobori(318,138,hue);
  }else if(kind('ropeway')){
    // The ropeway's foot station across the road from the stop: the mountain straight up behind it, the cable out of its roof with a cabin on the way, the doors in the middle, the ticket windows beside them.
    treeline(0,480,30,136);for(let i=0;i<46;i++){const rx=7+rand()*9;softCrown(r,rand,rand()*480,36+rand()*92,rx,rx*.7,i%3?['#4a4a2c','#6e5a34','#8a6a40','#a88a58']:['#5a3a26','#7a4a30','#9a6038','#b88048'])}
    for(let i=0;i<200;i++){const x=240+i*1.2,y=74-i*.37;r(x,y,2,1,'#23292e')}r(350,20,4,18,'#4a3628');r(342,20,20,3,'#5a3e2a');r(330,8+24,1,8,'#23292e');r(322,40,20,13,'#efeee4');r(323,42,18,6,'#a8d4e8');r(322,49,20,2,'#1d5fae');
    r(150,74,180,62,'#d8d4c4');for(let x=154;x<330;x+=10)r(x,74,1,62,'#c6c2b2');r(142,64,196,11,'#54504a');r(142,74,196,2,'#3a3a38');r(226,50,28,14,'#3a4246');r(150,76,180,3,'#00000028');r(150,130,180,6,'#a8a498');
    glow(210,100,60,36);glow(160,98,32,16);glow(288,98,32,16);glow(322,40,20,13);r(206,96,68,40,'#2a3238');r(210,100,28,36,'#a8c4cc');r(242,100,28,36,'#a8c4cc');r(239,100,2,36,'#2a3238');r(158,96,36,20,'#2a3238');r(160,98,14,16,'#c8dde0');r(178,98,14,16,'#c8dde0');r(286,96,36,20,'#2a3238');r(288,98,32,16,'#c8dde0');r(211,101,8,34,'#ffffff40');r(243,101,8,34,'#ffffff40');
    // A stone wall holding the slope either side, the fare board, the machines, a bench for the wait.
    ledge(0,150);ledge(330,150);r(160,120,30,12,'#f4f0e0');for(let i=0;i<3;i++)r(162,122+i*3,26-(i*7)%9,1,'#3a2c20');vending(338,137,'#3a78c2');vending(353,137,'#f4f4ec');bench(112,138);bench(52,138);nobori(300,138,'#1d5fae');nobori(138,138,'#e8562c');planter(190,137);planter(282,137);
  }else if(built&&!torii){
    // A temple's plastered wall under its tiles, the five white lines of its rank, the gate in the middle; over the wall its trees, the great roof, the pagoda or the pavilion's top, and a pine leaning out.
    treeline(0,480,30,84);
    const pagoda=kind('pagoda') as ['pagoda',number,string,string]|undefined,pavilion=kind('pavilion') as ['pavilion',string,string]|undefined,red=parseInt(timber.slice(1,3),16)>parseInt(timber.slice(3,5),16)*1.5;
    if(kind('temple')){const cx=376;r(cx-40,70,80,14,built![1]);for(let x=cx-40;x<cx+40;x+=10)r(x,70,2,14,'#00000030');for(let i=0;i<24;i++){const w=64+50*(i/23)**1.8;r(cx-w/2,48+i,w,1,tiles);if(i%4===3)r(cx-w/2,48+i,w,1,'#00000028')}for(let x=cx-52;x<cx+52;x+=5)r(x,60,1,12,'#00000020');r(cx-34,46,68,3,'#2c3638');r(cx-58,71,116,2,'#2c3638');r(cx-37,44,4,4,'#2c3638');r(cx+33,44,4,4,'#2c3638')}
    if(pagoda){const cx=128,[,n,wall,tile]=pagoda;for(let i=0;i<n;i++){const w=36-i*3,y=84-i*10;r(cx-w/2+5,y-8,w-10,8,wall);r(cx-w/2+5,y-8,w-10,2,'#00000040');r(cx-w/2+5,y-8,1,8,'#ffffff30');r(cx-w/2,y-11,w,3,tile);r(cx-w/2-2,y-9,w+4,1,'#2c3032');r(cx-w/2+3,y-12,w-6,1,tile)}r(cx,84-n*10-12,1,11,'#c9a84a');r(cx-1,84-n*10-8,3,1,'#e0c060');r(cx-1,84-n*10-5,3,1,'#e0c060')}
    if(pavilion){const cx=110,[,c,roof]=pavilion;r(cx-15,62,30,16,c);for(let x=cx-13;x<cx+13;x+=5)r(x,64,1,14,'#00000030');r(cx-22,58,44,4,roof);r(cx-24,61,48,1,'#2c3032');r(cx-10,48,20,10,c);r(cx-6,51,12,5,'#00000030');r(cx-16,44,32,4,roof);r(cx-18,47,36,1,'#2c3032');r(cx-10,42,20,2,roof);r(cx-1,37,2,5,'#e0c060');r(cx-2,36,5,2,'#e0c060')}
    for(let i=0;i<9;i++){const x=20+i*56+rand()*20;if(x>180&&x<300)continue;const rx=9+rand()*7;softCrown(r,rand,x,78+rand()*4,rx,rx*.7,rand()<.3?['#6a7a38','#8d9a45','#b3b558','#d6cf78']:greens)}
    for(const [x,w] of [[0,196],[284,196]]){r(x,88,w,48,'#e6dcc2');for(let i=0;i<5;i++)r(x,96+i*7,w,2,'#f6efdd');r(x,88,w,3,'#00000028');for(let i=0;i<w/14;i++)r(x+rand()*w,91,1+rand()*2,6+rand()*16,'#5a4a3014');r(x,128,w,8,'#8a8370');for(let xx=x;xx<x+w;xx+=9)r(xx+rand()*3,129,7,3,['#9a9482','#7e786a','#a8a290'][Math.floor(rand()*3)]);for(let xx=x+4;xx<x+w;xx+=9)r(xx+rand()*3,132,7,3,['#9a9482','#7e786a','#a8a290'][Math.floor(rand()*3)]);for(let xx=x;xx<x+w;xx+=3)if(rand()<.3)r(xx,127,3,2,'#6a8a52');tileRoof(x,80,w,8)}
    pineOver(46,84,1);pineOver(318,84,-1);pineOver(452,84,1);
    // The gate: its leaves folded back, the court seen through it, a lantern under each eave.
    r(196,88,10,48,timber);r(274,88,10,48,timber);r(196,88,2,48,'#ffffff24');r(282,88,2,48,'#00000030');r(206,96,68,40,'#2a2320');r(218,104,44,32,'#5a7a58');r(218,104,44,10,'#3f5f48');r(230,112,20,24,'#d8d0b4');r(226,124,28,12,'#d8d0b4');for(let y=114;y<136;y+=5)r(228,y,24,1,'#bdb495');r(206,96,12,40,mix(timber,'#1a1410',.45));r(262,96,12,40,mix(timber,'#1a1410',.45));for(const dx of [208,264])for(let y=100;y<134;y+=8)r(dx+2,y,2,2,'#c9a84a'),r(dx+7,y,2,2,'#c9a84a');r(206,92,68,4,timber);r(206,96,68,2,'#00000050');r(202,134,76,3,'#a8a290');r(202,134,76,1,'#c4beae');tileRoof(186,74,108,14);tileRoof(202,60,76,12);r(200,57,6,4,'#2c3638');r(274,57,6,4,'#2c3638');
    for(const lx of [199,277]){glow(lx,98,5,8);r(lx,98,5,8,red?'#d0402c':'#f2e6c8');r(lx,97,5,1,'#2a2020');r(lx,106,5,1,'#2a2020');r(lx+1,100,3,1,red?'#f4f4ec':'#3a2c20')}
    if(!avenue){stoneLamp(180,139);stoneLamp(296,139);notice(142,138);wires(70,414);
    if(red){nobori(308,138,'#d0402c');nobori(320,138,'#f4f4ec');nobori(332,138,'#6a4a9a');r(346,126,28,11,'#6a5240');r(344,122,32,5,'#d0402c');for(let i=0;i<4;i++)r(346+i*8,122,4,5,'#f4f4ec');for(let i=0;i<5;i++)r(348+i*5,129,3,4,['#e8e0cc','#c8452e','#e0b040','#6a8a4a','#f4f4ec'][i])}else{bench(310,138);planter(338,137)}
    vending(436,137,'#f4f4ec');postbox(90,138);bike(24,138,'#6a8a9a')}
  }else if(torii){
    // A shrine's wood: the stone posts of its fence along the pavement, the name on its pillar, the torii under its rope, a lantern either side and the steps beyond.
    treeline(0,480,30,136);for(const x of [22,70,112,168,306,356,402,458])cedar(x+rand()*10,112,56+rand()*30);r(0,102,204,34,'#3a6a4c');r(276,102,204,34,'#3a6a4c');for(let x=0;x<480;x+=7)if(x<198||x>276){r(x,102,6,3,'#4f8058')}
    for(const [from,to] of [[0,200],[280,480]]){r(from,132,to-from,4,'#9a9c90');for(let x=from+1;x<to-3;x+=7){r(x,114,4,20,'#b5b5a8');r(x,114,1,20,'#d0d0c4');r(x+3,114,1,20,'#8f9184');r(x-1,112,6,2,'#a3a598')}r(from,119,to-from,2,'#a3a598');r(from,126,to-from,2,'#a3a598')}
    const c=torii[1];r(214,88,52,48,'#2c4f3c');r(226,96,28,40,'#c9c2ab');for(let y=100;y<136;y+=6)r(226,y,28,1,'#a39d8c');r(232,88,16,10,'#c9c2ab');r(206,74,8,62,c);r(266,74,8,62,c);r(206,74,2,62,'#ffffff30');r(272,74,2,62,'#00000030');r(204,132,12,4,'#b5b5a8');r(264,132,12,4,'#b5b5a8');r(196,70,88,6,c);r(192,66,96,4,'#48554b');r(190,64,5,3,'#48554b');r(285,64,5,3,'#48554b');r(204,84,72,4,c);r(236,76,8,8,c);
    for(let x=214;x<266;x++)r(x,90+Math.round(2*Math.sin((x-214)/52*Math.PI)),1,2,'#d8c890');for(const x of [222,236,250]){r(x,93,3,3,'#ffffff');r(x+1,96,3,3,'#ffffff')}
    stoneLamp(186,139);stoneLamp(290,139);r(160,100,9,38,'#a3a598');r(160,100,2,38,'#c4c4b8');r(167,100,2,38,'#83857a');r(158,97,13,3,'#8f9184');r(157,136,15,3,'#8f9184');for(const [i,ch] of [...sight.ja].slice(0,6).entries())letter(g,162,102+i*5.5,ch,'#3a3a34');
    wires(84,430);notice(318,138);bench(360,138);bike(40,138,'#8a4a3a');
  }else if(kind('lake')){
    // A shore: the far side under its hills, the water, the promenade's rail along the embankment; the great bridge where there is one, the steamer where there is none.
    const bay=kind('rainbow');r(0,60,480,6,'#8fae9c');for(let x=0;x<480;x+=2)r(x,56-Math.sin(x/37)*3-Math.sin(x/11)*1.5,2,8,'#9ab8aa');
    if(bay)for(let x=0;x<480;){const w=8+Math.floor(rand()*14),h=8+rand()*26;r(x,64-h,w,h,mix('#b7d4dc','#8496a8',rand()));for(let wy=66-h;wy<62;wy+=4)r(x+2,wy,w-4,1,'#ffffff30');x+=w+Math.floor(rand()*3)}
    for(let i=0;i<14;i++)r(0,64+i*4,480,4,mix('#7fb4cc','#3f7fa4',i/13));for(let i=0;i<120;i++){const y=66+rand()*52;r(rand()*480,y,3+rand()*8,1,y<84?'#ffffff50':'#ffffff28')}
    if(bay){r(40,70,400,3,'#eef0ee');r(40,73,400,1,'#b8c0c4');for(const x of [150,326]){r(x,38,5,62,'#f4f6f4');r(x+4,38,1,62,'#c0c8cc');r(x-1,52,7,2,'#f4f6f4')}for(const [a,b] of [[40,152],[152,328],[328,440]])wire(a,a===40?68:40,b,b===440?68:40,a===152?7:3,'#f4f6f4');for(let x=44;x<440;x+=6)r(x,74,1,3,'#c0c8cc');for(let x=44;x<440;x+=10)spark(x,70,1,1,'#fff6d0');for(const x of [150,326]){spark(x+1,37,3,2,'#ff5a40');spark(x+1,52,3,1,'#fff6d0')}for(let i=0;i<70;i++)spark(rand()*480,44+rand()*20,1,1,'#f2cf7c')}
    else{r(318,92,70,7,'#f4f4ec');r(318,98,70,2,'#c8452e');r(326,84,50,8,'#f4f4ec');for(let x=328;x<374;x+=5){r(x,86,3,4,'#4a7a94');spark(x,86,3,4,'#f2cf7c')}r(334,78,34,6,'#f4f4ec');r(344,68,4,10,'#3a3e40');r(356,68,4,10,'#3a3e40');r(388,88,8,12,'#d0402c');for(let y=89;y<100;y+=3)r(388,y,8,1,'#f4f4ec');for(let i=0;i<8;i++)r(300-i*6,100+i%2,5,1,'#ffffff80')}
    softCrown(r,rand,24,96,26,20,greens);softCrown(r,rand,58,104,18,14,['#345d48','#487951','#63905b','#86a367']);softCrown(r,rand,452,98,26,20,greens);softCrown(r,rand,418,106,16,12,['#345d48','#487951','#63905b','#86a367']);
    ledge(0,480,false);r(0,118,480,3,'#c4beae');for(let x=4;x<480;x+=14){if(x>196&&x<276)continue;r(x,104,3,16,'#e8e6dc');r(x+2,104,1,16,'#b8b6ac')}for(const y of [106,112])r(0,y,480,1,'#e8e6dc');
    r(198,98,8,38,'#6e5138');r(274,98,8,38,'#6e5138');r(206,104,68,32,mix('#7fb4cc','#3f7fa4',.6));for(let y=120;y<136;y+=4)r(206,y,68,4,y%8?'#dcd4b8':'#c6bd9f');r(196,94,88,5,'#5a4232');
    bench(120,138);bench(330,138);vending(424,137,'#3a78c2');planter(170,137);planter(300,137);bike(58,138,'#d0402c');
  }else if(kind('bamboo')){
    // A bamboo park: the culms close behind a brushwood fence, their leaves arching over; the Jizo of the park on their ledge.
    r(0,30,480,106,'#17301f');for(let x=0;x<480;x+=3+Math.floor(rand()*4)){const w=rand()<.3?3:2,c=mix('#5a9a4c',['#24462c','#a6d27a','#7aa858'][Math.floor(rand()*3)],rand()*.5),d=rand()*.5;if(x>200&&x<280)continue;r(x,34,w,100,mix(c,'#17301f',d));r(x,34,1,100,mix('#a6d27a','#17301f',d));for(let y=40+rand()*10;y<134;y+=11+rand()*4)r(x,y,w,1,'#24462c')}
    for(let x=-4;x<484;x+=9+rand()*8)softCrown(r,rand,x,38+rand()*14,10+rand()*6,5+rand()*3,['#3d6a34','#5a9a4c','#8cc060','#b8dc88']);
    for(const [from,to] of [[0,198],[282,480]]){r(from,116,to-from,20,'#6a5232');for(let x=from;x<to;x++)r(x,116+(x*7)%3,1,20-(x*7)%3,['#8c7044','#5a4428','#a08050','#74583a'][(x*13)%4]);for(const y of [121,129]){r(from,y,to-from,2,'#a8a060');r(from,y,to-from,1,'#ccc488')}for(let x=from;x<to;x+=33)r(x,113,2,23,'#4a3a26');r(from,134,to-from,2,'#00000030')}
    r(196,74,10,62,'#6e5138');r(274,74,10,62,'#6e5138');r(196,74,2,62,'#8a6a50');r(206,88,68,48,'#1f3a26');for(let x=208;x<272;x+=5)r(x,88,2,40,x%2?'#5a9a4c':'#3d6a34');r(226,112,28,24,'#c9bf9a');r(232,100,16,12,'#b8ae8a');r(190,70,100,6,'#5a4232');
    if(kind('jizo')){r(40,128,92,8,'#8e8a7c');r(40,128,92,1,'#b4b0a2');for(let i=0;i<8;i++)jizo(44+i*11,128)}
    wires(160,424);notice(300,138);bench(340,138);bike(380,138,'#4a8a5a');
  }else{
    // A valley's road: cedars over the wood, a mossy stone wall along the pavement; the vermilion bridge over its river, or the Jizo in their row.
    treeline(0,480,30,136);for(let x=10;x<480;x+=34+rand()*22)if(x<186||x>294)cedar(x,118,60+rand()*30);
    const bridge=kind('bridge') as ['bridge',string]|undefined;
    if(bridge?.[1]){for(let i=0;i<8;i++)r(300,96+i*3,170,3,mix('#5fb0b0','#2f7f88',i/7));for(let i=0;i<40;i++)r(300+rand()*166,98+rand()*20,3+rand()*6,1,'#ffffff70');for(const x of [318,372,430])r(x,112+rand()*4,8,4,'#6a6e68');
      const c=bridge[1],deck=(x:number)=>104-10*(1-((x-385)/75)**2);for(let x=310;x<460;x++){const y=deck(x);r(x,y,1,5,c);r(x,y+5,1,2,'#2a2020');r(x,y-5,1,1,c);if(x%10===0){r(x,y-8,2,8,c);r(x,y-9,2,1,'#2a2020')}}r(340,108,5,12,'#8f9184');r(424,108,5,12,'#8f9184')}
    ledge(0,196);ledge(284,196);if(kind('jizo')){for(let i=0;i<13;i++)jizo(12+i*14,120);for(let i=0;i<12;i++)jizo(300+i*14,120)}
    r(198,74,8,62,'#6e5138');r(274,74,8,62,'#6e5138');r(198,74,2,62,'#8a6a50');r(206,88,68,48,'#3f5f48');softCrown(r,rand,222,100,12,9,greens);softCrown(r,rand,258,98,12,9,['#6a7a38','#8d9a45','#b3b558','#d6cf78']);r(228,104,24,32,'#cfc6a8');for(let y=108;y<136;y+=6)r(228,y,24,1,'#b4ab8c');r(192,70,96,5,'#5a4232');
    wires(110,404);notice(150,138);if(!kind('jizo')){bench(310,138);vending(440,137,'#f4f4ec')}
  }
  avenue?.dress(g);
  // The name on its board by the way in.
  {const name=kind('ropeway')?'ロープウェイ':sight.ja,w=[...name].length*10+8,x=240-w/2,y=city?76:torii?72:built?88:kind('ropeway')?80:92;r(x-1,y-1,w+2,14,'#3d2e24');r(x,y,w,12,'#6b4a34');letter(g,x+4,y+1,name,'#f4e4b8',true)}
  // The way to the station, on its post.
  r(9,177,4,1,'#00000030');r(10,153,2,25,'#5b6558');r(1,140,44,13,'#fbfbf6');r(1.5,140.5,43,12,'#1d5fae');letter(g,3,141.5,'← 駅','#ffffff');letter(g,5,147,'STATION','#d8e4f4');
  texture.refresh();avenue?.lifted(texture.canvas);
  if(!avenue){const lit=mapCanvas(scene,`map-${place}-lit`,480,320),c=lit.context;c.imageSmoothingEnabled=false;for(const [x,y,w,h] of glows)c.drawImage(texture.canvas,x*2,y*2,w*2,h*2,x,y,w,h);for(const [x,y,w,h,color] of sparks){c.fillStyle=color;c.fillRect(x,y,w,h)}lit.refresh()}
}

/** A bus stop's timetable as it hangs on the pole, a sheet in the manner of the city buses' 時刻表: the line's number in its plate on a band of the operator's colour, the stop, where it goes, then the hours down the left and each hour's minutes on weekdays, Saturdays and holidays.
 * The minutes are made up but fixed for a line and stop (closer together at the rush hours, further apart at night), within the hours the buses run (`trainsRun` in clock.ts). */
export function makeTimetable(scene:Phaser.Scene,no:string,stop:string,to:string,color:string){
  const key=`timetable-${no}-${stop}`;if(scene.textures.exists(key))return key;
  const texture=mapCanvas(scene,key,200,270),g=texture.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},ink='#2b3230',seed=[...no+stop].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  r(0,0,200,270,'#8d9296');r(2,2,196,266,'#fbfaf2');r(2,2,196,30,color);r(6,6,32,22,'#fffef2');
  g.textAlign='center';letter(g,22,12,no,color,true);g.textAlign='left';letter(g,43,6,stop,'#ffffff',stop.length<16);letter(g,43,20,`${to} ゆき`,'#ffffff');g.textAlign='right';letter(g,194,20,'時刻表','#ffffff');
  const hours=[4,...Array.from({length:19},(_,i)=>i+5),0],columns=[['平日',0,18,'#dfe7e2'],['土曜',6,78,'#e4e2ee'],['日祝',10,138,'#f0dfdc']] as const,top=36;
  g.textAlign='center';r(2,top,16,8,'#d8d6c8');letter(g,10,top+1.5,'時',ink);for(const [name,,x,tint] of columns){r(x,top,x===138?60:60,8,tint);letter(g,x+30,top+1.5,name,ink)}
  hours.forEach((hour,i)=>{
    const y=top+8+i*10;if(i%2)r(2,y,196,10,'#f0efe4');r(2,y,16,10,'#e6e4d6');letter(g,10,y,String(hour),ink,true);
    for(const [,slower,x] of columns){
      const gap=(hour>=7&&hour<=9||hour>=17&&hour<=19?10:hour>=21||hour<=5?30:15)+slower,first=(seed+hour*7+slower)%gap,minutes:number[]=[];
      for(let m=first;m<60;m+=gap)if((hour!==4||m>=45)&&(hour!==0||m<=40))minutes.push(m);
      g.textAlign='left';minutes.slice(0,8).forEach((m,k)=>letter(g,x+3+k*7.25,y+2.5,String(m).padStart(2,'0'),ink));g.textAlign='center';
    }
  });
  for(const x of [18,78,138])r(x,top,.5,218,'#b5b3a4');g.textAlign='center';letter(g,100,257,'道路状況により遅れることがあります','#6c736e');g.textAlign='left';
  texture.refresh();return key;
}

/** A tiled concourse pillar cut by the ceiling, with the yellow 出口 sign of a Japanese station on its face; origin at its foot. */
function exitPillar(scene:Phaser.Scene,hub:Hub,side:'west'|'east'){
  const texture=mapCanvas(scene,`exit-pillar-${hub}-${side}`,30,64);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  r(0,0,30,64,'#e6e3cc');for(let y=7;y<64;y+=8)r(0,y,30,1,'#c9c4a6');for(let x=7;x<30;x+=8)r(x,0,1,64,'#c9c4a6');r(0,0,1,64,'#aeab94');r(29,0,1,64,'#aeab94');
  // Kyoto's are clad in dark timber.
  if(inKyoto(hub)){r(0,0,30,64,'#5a4030');for(let x=4;x<30;x+=5)r(x,0,1,64,'#4a3426');r(0,0,1,64,'#3a281d');r(29,0,1,64,'#3a281d')}
  r(0,0,30,3,'#4c5852');r(0,58,30,6,'#aeb4b0');r(0,63,30,1,'#8b918d');
  const west=side==='west';r(1,9,28,34,'#f2c230');r(1,43,28,1,'#c9a020');
  r(west?15:3,11,12,12,'#1d2622');t(west?16:4,12,'出','#f2c230',true);t(west?3:17,12,west?'←':'→','#1d2622',true);
  g.textAlign='center';t(15,25,exitName(hub,side)[0],'#1d2622',true);t(15,36,exitName(hub,side)[1].length>9?exitName(hub,side)[1].replace(' Exit',''):exitName(hub,side)[1],'#1d2622');
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
    const kyoto=inKyoto(hub);
    const tiles=(x:number,y:number,w:number,h:number,shade=false)=>{
      // At Kyoto, white plaster between dark timbers and a rail along the top third.
      if(kyoto){r(x,y,w,h,shade?'#d9d0bc':'#efe8d8');for(let xx=x+((48-x%48)%48);xx<x+w;xx+=48)r(xx,y,3,h,shade?'#46321f':'#5a4030');r(x,y+Math.min(h-3,30),w,2,shade?'#46321f':'#5a4030');return}
      r(x,y,w,h,shade?'#c9c7b2':'#e6e3cc');for(let yy=y+7;yy<y+h;yy+=8)r(x,yy,w,1,shade?'#aeab94':'#c9c4a6');for(let xx=x+11;xx<x+w;xx+=12)r(xx,y,1,h,shade?'#aeab94':'#c9c4a6')};
    // Floor: polished pale tiles in a checkerboard, each lit along its top and left edges, and the ceiling edge with its fluorescent lights. At Kyoto, stone flags in broken courses.
    if(kyoto)for(let y=35,k=0;y<320;y+=16,k++)for(let x=k%2?-12:0;x<480;x+=24){const c=(x*3+y*5)%7;r(x,y,24,16,c<2?'#b3aea2':c<5?'#bfbaae':'#c9c4b8');r(x,y,24,1,'#d6d1c6');r(x,y,1,16,'#d6d1c6');r(x,y+15,24,1,'#95907f');r(x+23,y,1,16,'#95907f')}
    else for(let y=35;y<320;y+=16)for(let x=0;x<480;x+=16){const dark=((x+y-35)/16)%2;r(x,y,16,16,dark?'#c8ccc3':'#d6d9d2');r(x+1,y+1,14,1,dark?'#d6d9d2':'#e6e8e2');r(x+1,y+1,1,14,dark?'#d6d9d2':'#e6e8e2');r(x,y,16,1,'#aeb2aa');r(x,y,1,16,'#aeb2aa')}
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
    // Over the gates' way through, Kyoto hangs a noren.
    const noren=(x:number,w:number)=>{r(x,51,w,8,'#27406b');for(let k=x+Math.floor(w/5);k<x+w-2;k+=Math.floor(w/5))r(k,53,1,6,'#efe8d8');r(x,51,w,1,'#3e5a8a')};
    if(kyoto)noren(64,66);
    // The machine wall between two tiled pillars.
    tiles(130,23,232,101);
    for(const x of [130,350]){tiles(x,23,12,101);r(x,23,1,101,'#aeab94');r(x+11,23,1,101,'#aeab94');r(x-1,118,14,6,'#aeb4b0')}
    // Right: the Shinkansen transfer gates and their corridor, or a NewDays.
    if(hasShinkansen(hub)){
      paid(362,118);gates(370,5,'#2a6fb3');
      sign(372,96,'新','#ffffff','#2a5ea8','新幹線のりかえ','Shinkansen · Tracks '+tracksFor(hub,'shinkansen','–'),'#2a5ea8');
      if(kyoto)noren(370,108);
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
    if(kyoto){
      // Dark beams, paper lanterns hanging from them.
      r(0,23,480,9,'#3e2c20');dither(0,30,480,2,'#2e2018');for(let x=0;x<480;x+=20)r(x,23,2,7,'#2e2018');
      for(let x=16;x<480;x+=40){r(x+3,24,1,2,'#1f1612');r(x,26,8,5,'#f2e6c8');r(x,26,8,1,'#3a281d');r(x,30,8,1,'#3a281d');r(x+1,28,6,1,'#c8452e')}
    }else{r(0,23,480,9,'#5d6a62');dither(0,30,480,2,'#4c5852');for(let x=10;x<480;x+=40)r(x,26,22,2,'#fffbe0')}
    // The station's name on the wall over the fare board, in the big lettering; a long one has its English in small print. The plate grows to hold it, pushing the signs beside it out.
    const wide=(text:string,big:boolean)=>[...text].reduce((w,c)=>w+(c.charCodeAt(0)<128?.5:1)*(big?10:5),0),full=`${station.ja}  ${station.en.toUpperCase()}`,fits=wide(full,true)<=82;
    const nameW=Math.max(88,Math.ceil(fits?wide(full,true):wide(station.ja,true)+4+wide(station.en.toUpperCase(),false))+8),nameL=240-Math.ceil(nameW/2);
    r(nameL,33,nameW,12,'#283e40');r(nameL,44,nameW,1,station.accent);
    if(fits){g.textAlign='center';t(240,34,full,'#fffef2',true);g.textAlign='left'}else{t(nameL+4,34,station.ja,'#fffef2',true);t(nameL+8+wide(station.ja,true),37,station.en.toUpperCase(),'#fffef2')}
    // Light-box posters of the game's destinations, as on the hall's wall: Kamakura on the left, Nikko on the right; at Kyoto, its own, Arashiyama and Fushimi Inari.
    const poster=(x:number,place:'kamakura'|'nikko'|'arashiyama'|'inari',y=74)=>{
      r(x-1,y-1,22,32,'#aeb4b0');r(x,y,20,22,place==='kamakura'?'#f7ead2':place==='nikko'?'#dfe8e0':place==='inari'?'#2c1a14':'#6fa863');r(x,y+22,20,8,'#fbfbf6');r(x,y+22,20,1,'#c9c4a6');
      if(place==='kamakura'){r(x,y+16,20,6,'#7c9a6a');r(x+5,y+8,10,2,'#4a4a52');r(x+6,y+10,8,6,'#b8503e');for(const [dx,dy] of [[1,2],[14,1],[3,6],[16,7],[0,10]])r(x+dx,y+dy,3,3,'#f2a7c0')}
      else if(place==='arashiyama'){for(let dx=1;dx<20;dx+=4)r(x+dx,y,2,22,dx%3?'#3f6f3e':'#8ab576');r(x+7,y+17,6,5,'#d8cfa8')}
      else if(place==='inari'){for(const k of [0,1,2]){const d=k*3;r(x+1+d,y+2+d,18-d*2,2,'#d2402e');r(x+2+d,y+2+d,2,20-d,'#c8352b');r(x+16-d,y+2+d,2,20-d,'#c8352b')}}
      else{for(const dx of [1,16])r(x+dx,y+3,3,17,'#2f5a3c');r(x+5,y+6,10,2,'#2f3a36');r(x+6,y+8,8,9,'#f4f0e4');r(x+9,y+11,2,6,'#2a2a2e');r(x+6,y+8,8,1,'#d8b04a');r(x+4,y+17,12,3,'#a29d90')}
      t(x+5,y+24,{kamakura:'鎌倉',nikko:'日光',arashiyama:'嵐山',inari:'稲荷'}[place],'#283e40');
    };
    poster(146,kyoto?'arashiyama':'kamakura');poster(314,kyoto?'inari':'nikko');
    // Fare board above the machines, with the station the player stands in marked in red.
    r(176,45,128,30,'#8f9e8b');r(178,47,124,26,'#fffef2');
    const board=onTokyoBoard(station.ja);
    if(board){
      r(217,52,26,16,'#7ab648');r(219,54,22,12,'#fffef2');r(184,60,33,1,'#e8853a');r(243,59,50,1,'#e8853a');r(232,66,1,6,'#3a78c2');r(241,55,40,1,'#d24a3a');r(281,55,1,14,'#d24a3a');r(192,52,25,1,'#e8c440');
      for(const [x,y] of [[186,60],[198,60],[210,60],[250,59],[262,59],[274,59],[290,59],[232,70],[265,55],[281,62],[281,68],[200,52]])r(x-1,y-1,3,3,'#283e40');
      r(239,57,5,5,'#d6402e');r(244,58,6,2,'#d6402e');
    }else{
      // The Kyoto side's: the lines fanning out of Kyoto, Lake Biwa on the right.
      r(258,50,24,12,'#cfe8f3');r(266,47,12,3,'#cfe8f3');const hubX=224,hubY=60;
      r(190,68,hubX-190,1,'#0072bc');r(hubX,60,36,1,'#0072bc');r(260,60,1,12,'#0072bc');r(260,71,38,1,'#0072bc');
      r(198,50,1,10,'#b45843');r(198,50,20,1,'#b45843');r(218,50,1,10,'#b45843');r(hubX,60,1,12,'#a8743c');r(246,50,1,10,'#00a3d9');r(246,50,10,1,'#00a3d9');
      for(const [x,y] of [[190,68],[198,50],[224,71],[246,60],[260,71],[296,71],[256,50]])r(x-1,y-1,3,3,'#283e40');
      r(hubX-3,57,6,6,'#d6402e');
    }
    // Its title on a plate beside the station's name: the board itself is full.
    r(Math.min(176,nameL-20),38,19,7,'#fffef2');t(Math.min(178,nameL-18),39,'運賃表','#2d563e');
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
    r(170,128,170,5,'#e8c440');for(let x=171;x<339;x+=4)r(x,129+(x%8<4?0:2),2,1,'#cfa72c');
    // Before the left poster, standing on the floor beside the paving, the commemorative stamp stand (main.ts: the 'stamp' hotspot, its solid): a little wooden desk under its sign, the stamp on its ink pad and the sample sheet.
    {const x=143,y=138,ink=stampInk(hub);
      r(x+4,y-28,1,4,'#3a281d');r(x+19,y-28,1,4,'#3a281d');r(x+1,y-36,22,9,'#283e40');r(x+1,y-28,22,1,stations[hub].accent);t(x+2,y-35,'スタンプ','#fffef2');
      dither(x,y-2,24,3,'#00000030');r(x+1,y-7,2,6,'#5a3a24');r(x+21,y-7,2,6,'#5a3a24');
      r(x,y-18,24,12,'#8a5a36');r(x,y-18,24,1,'#a8744a');r(x+2,y-12,20,1,'#6e4428');r(x+11,y-15,2,1,'#c08a58');
      r(x-1,y-24,26,6,'#c08a58');r(x-1,y-24,26,1,'#d8a470');r(x-1,y-19,26,1,'#7a4e2e');
      r(x+2,y-23,9,4,'#2b2b33');r(x+3,y-22,7,2,ink);r(x+4,y-26,5,3,'#a8744a');r(x+5,y-29,3,3,'#c08a58');r(x+5,y-29,3,1,'#e0b080');
      r(x+14,y-23,8,4,'#fbf6e8');r(x+17,y-22,2,2,ink)}
    // Floor markings: yellow guidance lines to the exits.
    r(0,226,480,3,'#d1b86f');
    // Exits painted on the floor; the yellow 出口 signs are on the concourse pillars (exitPillar, placed by main.ts).
    const paint=kyoto?'#4a3426':'#e6e3cc',faint=kyoto?'#5a4a3a':'#cfd3b8';t(12,234,`← ${exitName(hub,'west')[0]} EXIT`,paint,true);t(12,246,station.west[0],faint);
    t(394,234,`${exitName(hub,'east')[0]} EXIT →`,paint,true);t(394,246,station.east[0],faint);
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
      r(4,25,12,2,'#00000040');
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
 * ringed in blue (the station behind, `ja`/`en`, and the bus stop to the right where a bus calls, `bus`, each with its pictogram, arrow and distance), the window for the street's picture (`areaMapWindow`),
 * and the legend down the right, its symbols what the picture shows: 現在地, the station, the konbini (in its chain's colour), its ATM, the bus stop, the vending machines. */
export function makeAreaMap(scene:Phaser.Scene,key:string,ja:string,en:string,konbini:Konbini,bus=true){
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
  panel(bus?3:11,(x,y)=>{round(x+2,y+1,5,6,1.5,white);r(x+2.5,y+2,4,2,blue);r(x+2.5,y+5,1,.5,blue);r(x+5.5,y+5,1,.5,blue);for(let k=0;k<2;k++){r(x+2.5-k,y+7+k,1,1,white);r(x+5.5+k,y+7+k,1,1,white)}},`${ja}駅`,`JR ${en} Sta.`,true,'30m');
  if(bus)panel(19,(x,y)=>{r(x+1.5,y+1.5,6,5,white);r(x+2,y+2,5,2,blue);r(x+2,y+6.5,1.5,1.5,white);r(x+5.5,y+6.5,1.5,1.5,white)},'バスのりば','Bus stop',false,'120m');
  // The window's dark rule (the picture fills it), and the legend beside it with the north arrow and the map's date.
  const [wx,wy,ww,wh]=areaMapWindow;r(wx-.5,wy-.5,ww+1,wh+1,'#7d7666');
  r(125.5,35.5,50.5,81,'#7d7666');r(126,36,50,80,white);t(128,38,'凡例','#2b2b2b');t(139,38,'Legend',faint);r(128,43.5,46,.5,'#9a9380');
  ([['here','現在地','Here'],['station','駅','Station'],['konbini','コンビニ','Konbini'],['atm','ATM',''],['bus','バス停','Bus stop'],['vending','自販機','Drinks']] as const).filter(([k])=>bus||k!=='bus').forEach(([k,jp,eng],i)=>{
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
/** The bus stop's sign, its left edge in art px, between two street lights. */
export const busStop=400;
type Painter=(x:number,y:number,w:number,h:number,c:string)=>void;
const streetLight=(r:Painter,lx:number,kyoto:boolean)=>{r(lx-1,259,5,1,'#00000030');r(lx,214,2,45,'#9a9c94');r(lx+.5,214,.5,45,'#b8bab2');r(lx-1,256,4,3,'#7d7f78');r(lx+2,213,6,1.5,'#9a9c94');r(lx+6,212,8,3,'#5b6558');r(lx+7,215,6,1,'#fff6d0');if(kyoto){r(lx,214,2,45,'#4a3426');r(lx+2,213,6,1.5,'#4a3426');r(lx+7,214,1,1,'#1f1612');r(lx+5,215,10,8,'#f2e6c8');r(lx+5,215,10,1,'#3a281d');r(lx+5,222,10,1,'#3a281d');r(lx+6,218,8,2,'#c8452e')}};
const busPole=(r:Painter,x:number)=>{r(x+6,259,6,1,'#00000030');r(x+7,216,2,43,'#4c6156');r(x+5,257,6,2,'#5b6558');r(x,206,16,12,'#3a78c2');r(x+2,208,12,8,'#fffef2');r(x+6,210,4,4,'#3a78c2')};
/** The street's posts on their own, standing on the far pavement (foot at art y 260), sorted with the people in `town` and a sight's street so that those beyond pass behind them: `pole-light`, `pole-light-kyoto` (from 2 art px left of a light's x) and `pole-bus` (from busStop). */
export function makePoles(scene:Phaser.Scene){
  if(scene.textures.exists('pole-bus'))return;
  const pole=(key:string,w:number,paint:(r:Painter)=>void)=>{const texture=mapCanvas(scene,key,w,56),g=texture.context;g.translate(0,-204);paint((x,y,bw,h,c)=>{g.fillStyle=c;g.fillRect(x,y,bw,h)});texture.refresh()};
  pole('pole-light',18,r=>streetLight(r,2,false));pole('pole-light-kyoto',18,r=>streetLight(r,2,true));pole('pole-bus',18,r=>busPole(r,0));
}
/** The street outside a station, shared by every exit without a map of its own: the station front with its entrance under the sign (`title` over `subtitle`, underlined in `accent`),
 * a konbini beside it (the same shop for every chain, under the sign of `konbini`), a plaza with vending machines, planters, the area map and a bus stop, the road and its crossing, and the shops across it. Drawn once per station and exit, when first needed.
 * In art px: front 0–136 (entrance 190–290 × 120–136; konbini 334–480, sign 82–104, door 338–364), area map 118–152 × 108–144, planters at 76 and 300 (145–160), vending machines 390–432 × 133–162, bicycles 4–74 × 122–146, postbox 156–168 × 124–144, konbini bins 366–386 × 136–146,
 * road 199–247, street lights (townLights) and the bus stop (busStop) on the far pavement, shops from 262; with `kyoto` (network.ts `inKyoto`), the same layout in timber, tile and stone, with `tower` Kyoto Tower over the front; with `lane` (the street the traveller lives off, see `home` in network.ts), the blue 東中野一丁目 sign at the plaza's left edge
 * (1–45 × 140–153, its post to 178) pointing to the home street. main.ts (solids, hotspots) relies on these. */
export function makeTown(scene:Phaser.Scene,key:string,title:string,subtitle:string,accent:string,konbini:Konbini,lane:[string,string]|null=null,kyoto=false,tower=false,bus=true){
  const texture=mapCanvas(scene,key,480,320);const g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  // What stands against the front is drawn 24 px lower than it was first laid out (`lower`): the station grew a floor and the plaza got shallower. Lettering ignores the canvas's transform, hence `D`.
  let D=0;const t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y+D,text,c,big);
  const lower=(draw:()=>void)=>{g.save();g.translate(0,24);D=24;draw();g.restore();D=0};
  let seed=91;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  // The station front: three rows of windows, the canopy over the glazed entrance, and the sign above it.
  // The parapet and its lit coping; the upper floors in pale panels with their joints, a band in the station's colour between them; a stone base to head height, under its ledge.
  r(0,35,480,101,'#e4e2d8');r(0,35,480,4,'#7d8580');r(0,35,480,1,'#b8beb9');r(0,39,480,1,'#00000030');
  for(let x=16;x<480;x+=24)r(x,40,.5,70,'#cfccc0');for(const y of [62,84])r(0,y,480,.5,'#cfccc0');r(0,61,480,3,accent);r(0,61,480,.5,'#ffffff50');r(0,63.5,480,.5,'#00000030');
  r(0,110,480,26,'#9a948a');for(let y=112,k=0;y<136;y+=6,k++)for(let x=(k%2)*7;x<480;x+=14){r(x,y,13.5,5.5,(x*7+y)%3?'#a39d93':'#948e84');r(x,y,13.5,.5,'#b2ada4')}
  r(0,110,480,2,'#d6d3ca');r(0,112,480,1,'#00000030');
  // The windows: frames, the glass with a diagonal glint, their sills.
  if(!kyoto)for(const y of [46,66,88])for(let x=4;x<320;x+=24)if(y<88||x<150||x>320){r(x-1,y-1,18,14,'#6f7873');r(x,y,16,12,'#476e79');r(x,y,16,4,'#5f8a95');for(let k=0;k<5;k++)r(x+3+k,y+9-k*2,2,2,'#9ebcb4');r(x+8,y,.5,12,'#6f7873');r(x-1,y+13,18,1.5,'#f4f2ea')}
  // At Kyoto the front is timber and plaster under tiled roofs: the ridge roof, a pent roof above the entrance's height, lattices in place of windows, a bamboo fence along the stone.
  const tileRoof=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#4b4f55');for(let k=x;k<x+w;k+=3)r(k,y,1,h-2,'#5f646b');r(x,y,w,1,'#7b8087');r(x,y+h-2,w,2,'#2f3236');for(let k=x+1;k<x+w;k+=6)r(k,y+h-2,2,2,'#7b8087')};
  const lattice=(x:number,y:number,w:number,h:number)=>{r(x-1,y-1,w+2,h+2,'#3a281d');r(x,y,w,h,'#c9a772');for(let k=x;k<x+w;k+=2)r(k,y,1,h,'#5a4030');r(x,y+Math.floor(h/2),w,1,'#3a281d')};
  if(kyoto){
    r(0,48,480,62,'#efe8d8');for(let x=0;x<480;x+=48)r(x,48,3,62,'#4a3426');r(0,64,480,2,'#4a3426');r(0,64,480,.5,accent);
    tileRoof(0,35,480,13);tileRoof(0,84,480,10);r(0,94,480,16,'#5a4030');for(let x=0;x<480;x+=2)r(x,94,1,16,'#4a3426');
    for(let x=12;x<330;x+=48){lattice(x,51,28,10);lattice(x,69,28,12)}
    for(let x=0;x<160;x+=4){r(x,126,3,10,'#b89a5e');r(x,126,3,1,'#d6bc82')}r(0,129,160,1,'#3a281d');
  }
  // The konbini's building: an upper floor of offices over the shop, behind the same parapet.
  r(332,35,148,24,'#d8d4c8');r(332,35,148,4,'#7d8580');r(332,35,148,1,'#b8beb9');r(332,35,2,24,'#aeab94');
  for(let x=342;x<476;x+=22){r(x-1,45,16,14,'#6f7873');r(x,46,14,12,'#476e79');r(x,46,14,4,'#5f8a95');for(let k=0;k<5;k++)r(x+3+k,55-k*2,2,2,'#9ebcb4');r(x-1,59,16,1.5,'#f4f2ea')}
  if(kyoto){r(332,35,148,24,'#efe8d8');tileRoof(332,35,148,10);for(let x=344;x<476;x+=44)lattice(x,47,28,10)}
  // Kyoto Station's street looks past the low shop to Kyoto Tower: the white tube, the red-banded gallery, the spike.
  if(tower){r(332,35,148,24,'#bcd9e6');r(332,48,148,11,'#8fa7a0');const x=398;r(x+6,35,1,3,'#d6402e');r(x+3,38,7,1,'#f4f2ea');r(x,39,13,5,'#f4f2ea');r(x,41,13,1.5,'#d6402e');r(x+3,44,7,15,'#f4f2ea');r(x+8,44,2,15,'#c9c7bc');r(x-6,53,25,6,'#e4e2d8')}
  lower(()=>{
  r(166,64,148,26,kyoto?'#3a281d':'#aeab94');r(168,66,144,22,kyoto?'#21170f':'#283e40');r(168,87,144,1,accent);r(172,69,16,16,'#2c8a4a');t(175,72,'JR','#ffffff',true);
  g.textAlign='center';t(250,68,title,'#fffef2',true);t(250,80,subtitle,'#d8d8cc');g.textAlign='left';
  r(190,96,100,19,'#9fc3c2');for(let x=190;x<=290;x+=25)r(x,96,1,19,'#8f9e8b');r(238,96,4,19,'#8f9e8b');r(190,113,100,2,'#3b4541');
  r(176,90,128,6,'#5d6a62');r(176,96,128,1,'#3b4541');for(let x=180;x<304;x+=20)r(x,91,10,1,'#fffbe0');
  // The entrance's noren and a lantern either side of it.
  if(kyoto){r(176,90,128,6,'#3a281d');r(176,90,128,1,'#5a4030');r(190,96,100,7,'#27406b');r(190,96,100,.5,'#3e5a8a');for(let x=210;x<290;x+=20)r(x,97,1,6,'#efe8d8');for(const x of [174,298]){r(x+3,96,2,2,'#1f1612');r(x,98,8,11,'#f2e6c8');r(x,98,8,1,'#3a281d');r(x,108,8,1,'#3a281d');r(x+1,102,6,3,'#c8452e')}}
  // The konbini beside the station: its own lower front, the chain's sign band, then the glazing with the automatic door, the magazine rack along the window, shelves, the drinks fridge, the ATM, the till and its clerk.
  r(332,35,148,77,'#e8e6dc');r(332,35,148,4,'#5d6a62');r(332,35,2,77,'#aeab94');for(let x=340;x<480;x+=12)r(x,42,8,12,'#c9c7b2');
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
  // Kyoto's bylaws mute the signs, and give the shop a tiled eave.
  if(kyoto){r(334,58,146,22,'#5a463255');tileRoof(332,52,148,6)}
  r(334,80,146,35,'#9fc3c2');for(let d=0;d<12;d++)r(372+d*2,108-d*2,2,1,'#c3dddb');
  r(338,80,26,35,'#4c5f5c');r(338,80,26,2,'#8f9e8b');r(350,80,2,35,'#8f9e8b');r(340,84,9,29,'#5b706c');r(353,84,9,29,'#5b706c');
  r(368,100,40,8,'#d9d3bf');for(let k=0;k<13;k++)r(369+k*3,96,2,5,['#d2402e','#e8c440','#3a78c2','#e9a6ad','#3c9a5c'][k%5]);
  for(let k=0;k<3;k++){r(370,84+k*5,36,1,'#7d8a84');for(let b=0;b<9;b++)r(371+b*4,81+k*5,3,3,['#f4f4ee','#e8853a','#86a367','#c3dddb','#b66c51'][(b+k)%5])}
  r(412,82,24,20,'#dfe9ec');for(let k=0;k<3;k++){r(412,82+k*7+6,24,1,'#9aa29a');for(let b=0;b<6;b++)r(413+b*4,83+k*7,2,5,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#f4f4ee','#e8853a'][(b+k)%6])}
  r(456,98,23,10,'#d9d3bf');r(456,98,23,2,'#efe9d4');r(462,90,7,8,'#3a78c2');r(463,85,5,5,'#e9c4a0');r(463,85,5,2,'#2b2420');r(472,94,6,4,'#283e40');
  // The ATM under its red sign: a pale grey cabinet with a red rim on top, the upper screen and the tilted touch screen, card slot and keypad, the cash tray, and a red base.
  r(438,81,17,5.5,'#d6402e');t(441,81.5,'ATM','#ffffff');t(441.5,81.5,'ATM','#ffffff');
  r(440,88,13,20,'#c9cdd0');r(440,88,13,1.5,'#d6402e');r(452,89,1,19,'#9aa0a4');r(441.5,90.5,10,4.5,'#3a78c2');r(442.5,91.5,4,2.5,'#9fd0e8');r(447,91.5,3.5,2.5,'#f4f4ee');
  r(441.5,96,8,4,'#2f3e46');r(442,96.5,7,3,'#9fd0e8');r(450,96,2,4,'#e8eef0');r(450.5,96.5,1,.5,'#283e40');r(450.5,98,1,1.5,'#7d8a84');
  r(441,101,11,2,'#8f969a');r(442,101.5,9,1,'#5b6265');r(440,104,13,4,'#d6402e');r(440,104,13,.5,'#a52f22');
  for(const x of [364,410,437,455,479])r(x,80,1,35,'#8f9e8b');r(334,115,146,2,'#3b4541');r(338,115,26,2,'#55625b');
  // On the glass: the 7-Eleven stripes across a door pane, the Lawson blue band low along the window.
  if(konbini==='seven')for(const [y,c] of [[97,'#f58220'],[100,'#008061'],[103,'#ee2526']] as const)r(353,y,9,2,c);
  if(konbini==='lawson')r(364,104,115,2,'#1f5fbf');
  });
  // The plaza and its pavers.
  // Interlocking pavers in two tones, pink courses along the edges and a pink mat before the entrance, framed by granite kerbs along the front and the road; the building's shade at its foot.
  r(0,136,480,63,'#c8c3b8');
  for(let y=139,k=0;y<190;y+=3,k++)for(let x=(k%2)*4-4;x<480;x+=8){const pink=k<2||k>14,rug=x>=182&&x<298&&k<8,hem=rug&&(k===7||x<190||x>=290);
    r(x,y,8,3,kyoto?(rug?(hem?'#8f8a7e':(x+y)%3?'#a8a397':'#9f9a8e'):(x*3+k*5)%7<2?'#b3aea2':(x+y)%3?'#c3beb2':'#bab5a9'):hem?'#b8867a':pink||rug?((x+y)%3?'#cfa595':'#c89a8a'):(x+y)%3?'#cbc6bb':'#c1bcb0');r(x,y,8,.5,'#ffffff40');r(x+7.5,y,.5,2,'#00000014');r(x,y+2,8,1,'#0000002a')}
  // The granite strip along the front, and the kerb at the road: its top, then its face towards us, in shade, and the gutter at its foot.
  r(0,136,480,3,'#a9a69e');for(let x=0;x<480;x+=20){r(x,136,19.5,.5,'#c4c1b9');r(x+19.5,136,.5,3,'#8f8c85')}
  r(0,190,480,3,'#d6d3ca');r(0,190,480,.5,'#eceae4');for(let x=0;x<480;x+=20)r(x+19.5,190,.5,3,'#b5b2aa');
  r(0,193,480,6,'#8f8c85');r(0,193,480,.5,'#5f5d58');for(let x=0;x<480;x+=20)r(x+19.5,193,.5,6,'#76736d');r(0,198,480,1,'#4a4d48');
  r(0,136,480,3,'#00000022');
  // Bicycles parked against the front on the left, a red postbox by the entrance. The pigeons are sprites (makePigeons, pigeons.ts).
  lower(()=>{
  for(let k=0;k<5;k++){const bx=6+k*13,by=k%2?2:0,c=['#d24a3a','#3a78c2','#f4f4ee','#2c8a4a','#e8c440'][k];
    r(bx-1,119+by,16,1.5,'#00000025');
    for(const cx of [bx+2,bx+12])for(let y=-3;y<=3;y++)for(let xx=-3;xx<=3;xx++){const d=Math.hypot(xx,y);if(d>2.2&&d<=3.3)r(cx+xx,115+by+y,1,1,'#2b2b2b');else if(d<=.8)r(cx+xx,115+by+y,1,1,'#9aa0a4')}
    for(let i=0;i<8;i++){r(bx+3+i,114+by-i*.5,1,1,c);r(bx+5+i*.6,111+by+i*.5,1,1,c)}r(bx+4,109+by,4,1.5,'#2b2b2b');r(bx+11,108+by,1,6,c);r(bx+10,107+by,4,1,'#5b6558');r(bx+12,109+by,4,3,'#9aa0a4');r(bx+12,109+by,4,.5,'#c9cdd0')}
  r(156,118,12,2,'#00000025');r(158,102,8,17,'#c8352b');r(157,100,10,3,'#d6402e');r(157,100,10,.5,'#e47a6a');r(159,106,6,1.5,'#2b2b2b');r(158,102,1,17,'#e47a6a');t(159.5,110,'〒','#ffffff');
  });
  lower(()=>{
  // Two vending machines against the konbini's front, between its bins and the ATM.
  for(const [x,c,top] of [[390,'#d24a3a','#e47a6a'],[412,'#3a78c2','#6f9fd8']] as const){r(x,109,20,3,top);r(x,112,20,24,c);r(x,112,20,.5,'#00000040');r(x+2,114,16,10,'#e8eef0');for(let k=0;k<8;k++)r(x+3+(k%4)*4,115+Math.floor(k/4)*5,2,4,['#d2402e','#3c9a5c','#e8c440','#f4f4ee'][k%4]);r(x+13,127,4,5,'#283e40');r(x+3,132,10,2,'#283e40');r(x+1,136,20,2,'#74855e')}
  });
  // The area map (makeAreaMap, small): its dark frame on two posts, the two white panels ringed in blue, the map with its streets, the railway, the river, a park (its picture window, areaMapFace), the legend, the current spot in red.
  r(118,108,2,36,'#3a2e27');r(150,108,2,36,'#3a2e27');r(118,108,34,28,'#3a2e27');r(118,108,34,.5,'#5a4a3e');r(119,144,4,1,'#00000030');r(151,144,4,1,'#00000030');
  for(const y of bus?[109,112.5]:[110.75]){r(120,y,30,3,'#fbfbf6');r(120.5,y+.5,29,2,'#1d5fae');r(121,y+1,28,1,'#fbfbf6');r(121.5,y+1,1.5,1,'#1d5fae');r(124,y+1,10,.5,'#1d5fae');r(124,y+1.5,5,.5,'#6f93c4');r(143,y+1,3,.5,'#1d5fae')}
  r(120,116,30,18,'#d9cfa3');r(144,116,6,18,'#fbfbf6');for(let y=117;y<133;y+=2)r(145,y,1,1,['#d6402e','#2b2b2b','#1d5fae','#00a040'][y%4/2|0]),r(146.5,y+.25,3,.5,'#9a9380');
  r(120,118,24,1,'#2b2b2b');r(126,117,12,3,'#b4b9bc');r(120,122,24,1,'#f7f5ec');for(const x of [124,130.5,137])r(x,123,.5,11,'#f7f5ec');r(120,128,24,.5,'#f7f5ec');
  r(131,124.5,5,3,'#9cc76f');for(let x=120;x<144;x+=.5)r(x,Math.round((130.5+Math.sin(x/3))*2)/2,.5,1,'#5b9bd5');r(127.5,120.5,1.5,1.5,'#d6402e');
  lower(()=>{
  // The konbini's bins by its door.
  for(const [x,c] of [[366,'#3a78c2'],[377,'#2c8a4a']] as const){r(x,112,9,10,'#aeb4b0');r(x+1,112,7,2,c);r(x+3,115,3,1,'#283e40');r(x,122,9,1,'#8e9476')}
  });
  // Planters with trees.
  // In the three-quarter view: the planter's far rim, its soil with the trunk sunk into it, the near rim over its front; a round crown (softCrown).
  for(const x of [76,300]){
    r(x+2,160,28,3,'#00000030');r(x,151,28,9,'#8b7d63');r(x,151,28,1,'#776a53');r(x,145,28,2,'#ab9b78');r(x,145,2,6,'#ab9b78');r(x+26,145,2,6,'#9d8e6d');r(x+2,147,24,4,'#5a4636');
    for(let k=0;k<6;k++)r(x+3+Math.floor(rand()*22),147+Math.floor(rand()*3),1,1,'#6e5643');
    r(x+12,134,4,15,'#69533f');r(x+13,136,1,12,'#8a6c50');r(x+11,148,6,1,'#46362a');r(x,150,28,1.5,'#c2b08a');
    // Kyoto's: a maple on the left, a clipped pine on the right.
    if(kyoto&&x<150)softCrown(r,rand,x+14,130,16,13.5,['#7a2a20','#b23a26','#d8562f','#ee8a3c']);else if(kyoto)for(const [cx,cy,rx,ry] of [[x+14,122,12,6],[x+6,132,9,5],[x+21,134,9,5]])softCrown(r,rand,cx,cy,rx,ry,['#1f3d31','#2c5543','#3d6e50','#5d8a5e']);else softCrown(r,rand,x+14,130,16,13.5,leafy);
  }
  // The way home: the blue address sign (住居表示) on its post at the plaza's left edge, an arrow to the lane; the post's shadow here, the sign itself on its own texture (laneSign),
  // its board 140–153 over its post to 178 (art px), which main.ts puts in front of whoever walks behind its foot.
  if(lane){r(9,177,4,1,'#00000030');if(!scene.textures.exists(`lane-sign-${lane[1]}`)){const sign=mapCanvas(scene,`lane-sign-${lane[1]}`,46,38),s=sign.context,p=(x:number,y:number,w:number,h:number,c:string)=>{s.fillStyle=c;s.fillRect(x,y-140,w,h)};
    p(10,153,2,25,'#5b6558');p(1,140,44,13,'#fbfbf6');p(1.5,140.5,43,12,'#1d5fae');letter(s,3,1.5,lane[0],'#ffffff');letter(s,5,7,lane[1],'#d8e4f4');sign.refresh()}}
  // The kerb, the road with its centre line and the crossing straight ahead (its bars along the traffic, stepped over one after the other), the far pavement.
  r(0,199,480,48,'#5d625c');for(let i=0;i<300;i++)r(Math.floor(rand()*480),199+Math.floor(rand()*48),1,1,'#6b706a');
  for(let x=0;x<480;x+=32)if(x<196||x>276)r(x,222,16,2,'#e6e3cc');for(let y=203;y<243;y+=6)r(206,y,68,3,'#e6e3cc');
  r(0,247,480,3,'#e0dccb');r(0,247,480,.5,'#3f423d');r(0,250,480,12,'#bdb59a');for(let x=0;x<480;x+=16)r(x,250,1,12,'#a9a187');
  // The street lights on the far pavement (townLights): a grey post, the lamp at the end of its arm, the light falling on the pavement under it.
  for(const lx of townLights)streetLight(r,lx,kyoto);
  // The bus stop on the far pavement, right of the crossing, clear of Lorenzo's Uber: its post, its round-cornered blue sign (busStop, the `bus` hotspot in main.ts), where a bus calls (`bus`).
  if(bus)busPole(r,busStop);
  // The shops across the road, in the same three-quarter view as the rest, turned away from us: their awnings over the far pavement, the flat roofs behind their parapets
  // with the plant on them, and the backs of the buildings with their upper windows (townWindows, lit at night) and the outdoor units of their air conditioning.
  let x=0;for(const [w,roof,awning,wall] of townShops){
    if(kyoto){
      // Machiya with their backs to us: a noren along the pavement, the tiled roof, dark boards and lattices.
      r(x,262,w,5,x%3?'#27406b':'#6b2a22');for(let k=x+7;k<x+w;k+=8)r(k,263,1,4,'#efe8d8');r(x,267,w,1,'#00000040');tileRoof(x,268,w,16);
      r(x,284,w,36,'#5a4030');for(let k=x;k<x+w;k+=3)r(k,284,1,36,'#4a3426');r(x,284,w,3,'#00000044');
      for(const [wx,wy,ww,wh] of townWindows)if(wx>=x&&wx<x+w)lattice(wx,wy,ww,wh);
      r(x+w-1,262,1,58,'#2a1d14');x+=w;continue;
    }
    r(x,262,w,5,awning);for(let k=x;k<x+w;k+=8)r(k,262,4,5,'#fffef2aa');r(x,267,w,1,'#00000040');
    r(x,268,w,16,roof);r(x,268,w,1,'#ffffff30');r(x,282,w,2,'#ffffff40');
    if(w>60){r(x+w-22,270,12,8,'#c9cdd0');r(x+w-22,270,12,1,'#e8eef0');r(x+w-19,272,5,5,'#5b6265')}else{r(x+10,269,9,10,'#aeb4b0');r(x+10,269,9,2,'#c9cdd0');r(x+13,279,3,3,'#5b6558')}
    r(x,284,w,36,wall);r(x,284,w,3,'#00000033');r(x+3,287,1.5,33,'#9a9c94');
    for(const [wx,wy,ww,wh] of townWindows)if(wx>=x&&wx<x+w){r(wx-1,wy-1,ww+2,wh+2,'#8f8a7c');r(wx,wy,ww,wh,'#476e79');r(wx+1,wy+1,ww-2,2,'#9ebcb4');r(wx+ww/2,wy,.5,wh,'#cfc8ad');r(wx,wy+wh+5,ww,7,'#d8dcdc');r(wx,wy+wh+5,ww,1,'#eef0f0');r(wx+4,wy+wh+7,5,4,'#7d8a84')}
    r(x+w-1,262,1,58,'#3b4541');x+=w;
  }
  texture.refresh();
}

/** The Kyoto rental's lane by Jujo, 480 × 320 art px, after the house: white plaster and dark timbers under a tiled roof, charred-wood lattices, the sliding door under its owl noren, the plaque above it (drawn at .55 of the coordinates below, to the traveller's scale, its foot on the apron: the door 48–85 × 135–172 as shown), a neighbour's small house 244–344,
 * the meter and mailbox, the ground-floor lattice window, the row of outdoor units between two bins, the lantern, the concrete apron with its manhole and grates; the asphalt 182–262, its far edge lined with pots from 250 on the wall's coping, the neighbours' roofs and gardens beyond; behind everything the sky and the hills; at the right end the lane bends (laneInner, laneOuter) up to the back street 140–164, the way to the station, its sign 444–478 × 168–181 (post to 203) on the block wall past the bend; the Jizo shrine 290–310 before the neighbour; across the back street the FamilyMart behind it, its front 372–388 slantwise towards the car park 372–480 × 96–140, pole sign 390–408 × 54–68; the utility poles (234, 350, the street light's lamp at 337–345 × 88). main.ts (solids to 172 and from 250, hotspots, lamps) relies on these. */
/** The bend at the Kyoto lane's right end, the road's edges in art px for a given y: the inner corner (164–182), the outer one (164–262). main.ts's solids follow the outer one. */
export const laneInner=(y:number)=>400-44*Math.min(1,(y-164)/18)**1.5,laneOuter=(y:number)=>456-72*((y-164)/98)**1.4;
/** The windows of the Kyoto lane lit at night (art px, x y w h), gathered as makeKyotoLane draws them. */
export const laneWindows:[number,number,number,number][]=[];
function makeKyotoLane(scene:Phaser.Scene){
  const texture=mapCanvas(scene,'map-kyoto-lane',480,320),g=texture.context;let seed=47;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  // The house is laid out at full size, then drawn smaller, standing on the apron at its left corner: every edge snapped to the half art px, so that it stays sharp.
  let small=false;const k=.55,sx=(x:number)=>small?Math.round((36+k*(x-36))*2)/2:x,sy=(y:number)=>small?Math.round((172-k*(172-y))*2)/2:y;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(sx(x),sy(y),sx(x+w)-sx(x),sy(y+h)-sy(y))},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,sx(x),sy(y),text,c,big);
  const burnt=['#2a211b','#3a2c22','#4a3628','#6b4a32','#8a6444'];
  /** A tiled roof seen from the lane: the courses, the lit ridge, the eave's dark line with its round tile ends. */
  const tiles=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#54585e');for(let k=x;k<x+w;k+=3)r(k,y,1,h-2,'#6a6f76');r(x,y,w,1,'#83888e');r(x,y+h-2,w,2,'#2f3236');for(let k=x+1;k<x+w;k+=6)r(k,y+h-2,2,2,'#83888e')};
  // The sky, paler towards the hills, and its clouds in soft flat-bottomed heaps.
  const blue=['#a9cbe2','#b2d1e5','#bcd7e7','#c6dce9','#cfe1ea','#d7e5ea','#dde8ea'];for(let y=0;y<172;y+=4)r(0,y,480,4,blue[Math.min(6,Math.floor(y/14))]);
  // The bands dithered into one another.
  for(let y=0,band=0;y<92;y+=4){const next=Math.min(6,Math.floor((y+4)/14));if(next!==band){for(let x=0;x<480;x+=2)r(x,y+2,1,1,blue[next]);for(let x=1;x<480;x+=2)r(x,y+3,1,1,blue[next]);for(let x=1;x<480;x+=2)r(x,y+4,1,1,blue[band]);band=next}}
  for(const [cx,cy,w] of [[64,30,54],[196,14,38],[292,34,30],[404,22,60]]){for(let k=0;k<w/5;k++){const px=cx+rand()*w-w/2,ph=3+rand()*7*(1-Math.abs(px-cx)/(w/2));r(Math.floor(px),cy-Math.floor(ph),6,Math.floor(ph)+1,'#f6f9fa')}r(cx-w/2-5,cy,w+10,2,'#e8f0f3');r(cx-w/2,cy+2,w,1,'#dbe6ec')}
  // The hills that ring the city, two ridges in the haze.
  for(let x=0;x<480;x++){const far=72+Math.round(10*Math.sin(x/61)+5*Math.sin(x/23+1)),near=88+Math.round(9*Math.sin(x/47+2)+4*Math.sin(x/17));r(x,far,1,172-far,'#b1c4d1');r(x,near,1,172-near,'#8fab9f');if(rand()<.5)r(x,near+1+Math.floor(rand()*14),1,1,'#7f9d90')}
  // The town behind the house and the FamilyMart, two rows going back, paler with the distance: gables and hipped roofs in grey, brown and blue tiles, a tin roof here and there, a low block of flats with its water tank.
  for(const [row,walls,roofs] of [[66,['#c3c9cb','#c9c6bd'],[['#7d8996','#6f7b88','#97a2ac'],['#8d8079','#7d716b','#a39790'],['#6d8596','#5f7788','#8aa0ae'],['#94a0a6','#869298','#aab4b9']]],[78,['#d9d5ca','#c8bda8','#e0dcd2'],[['#656d76','#565e67','#858d95'],['#7a5548','#69473c','#946c5d'],['#4b6278','#3f5469','#6b8398'],['#8f9598','#7f8588','#adb2b4'],['#5a5f5a','#4c514c','#797e79']]]] as const)for(let x=-10+Math.floor(rand()*14);x<490;){
    const kind=rand(),w=kind<.14?40+Math.floor(rand()*16):26+Math.floor(rand()*46),top=row+Math.floor(rand()*12)-3,h=11+Math.floor(rand()*9),[tile,seam,ridge]=roofs[Math.floor(rand()*roofs.length)];r(x+2,top+h,w-4,70,walls[Math.floor(rand()*walls.length)]);
    if(kind<.14){const y=top+4;r(x+1,y,w-2,80,'#cfccc2');r(x,y,w,2,'#a9a79f');for(let k=y+5;k<y+30;k+=7)for(let wx=x+4;wx<x+w-7;wx+=8)r(wx,k,5,4,'#6f8690');r(x+6,y-6,10,6,'#9aa0a4');r(x+7,y-7,8,1,'#b4b9bc');r(x+8,y-3,1,3,'#7d8285')}
    else{for(let k=0;k<h;k++){const inset=(h-k)*(kind<.4?.25:kind<.75?.75:1.3);r(x+inset,top+k,w-inset*2,1,kind>.9?tile:k%3===2?seam:tile);if(kind>.9)for(let t=x+inset;t<x+w-inset;t+=4)r(t,top+k,1,1,seam)}const inset=h*(kind<.4?.25:kind<.75?.75:1.3);r(x+inset,top,w-inset*2,1,ridge);r(x-1,top+h,w+2,1,'#3f454c');if(rand()<.3)r(x+w/2,top-5,.5,5,'#5f6468'),r(x+w/2-3,top-4,6,.5,'#5f6468')}
    x+=w-3+Math.floor(rand()*5)-2}
  // The neighbour's grey siding on the left.
  r(0,94,36,78,'#c9cdd0');for(let x=0;x<36;x+=4)r(x,94,1,78,'#aeb2b5');r(0,94,36,2,'#5f6468');
  // Across the back street: the low houses behind the block wall, the wide car park with its bays, its cars, the pay machine and its P. On its left the FamilyMart, side on and mostly behind the neighbour:
  // its long wall with the striped band, and at its right end the shop front, facing the car park, seen slantwise (`d` along it, away from us): glass under the fascia, the sliding door just made out.
  tiles(388,62,92,10);r(388,72,92,18,'#ddd1b8');for(const x of [404,432,458])r(x,76,10,6,'#476e79');r(388,90,92,6,'#bdb7a6');r(388,90,92,1,'#d6d0bf');for(let x=388;x<480;x+=10)r(x,90,.5,6,'#a29c8c');
  r(372,96,108,44,'#6b6e6a');for(let k=0;k<420;k++)r(372+Math.floor(rand()*108),96+Math.floor(rand()*44),1,1,k%2?'#767975':'#60635f');r(372,96,108,2,'#00000030');
  for(let k=0;k<4;k++)r(400+k*26,98,1,27,'#e6e3cc');for(let k=0;k<3;k++){r(402+k*26,99,22,1.5,'#9e9784');r(409+k*26,120,8,2,'#c9c2b0')}
  const parked=(cx:number,body:string,side:string)=>{r(cx-1,120,20,3,'#00000035');r(cx+2,101,14,2,body);r(cx+2,103,14,2,'#55798a');r(cx+1,105,16,5,'#eef0f2');r(cx+1,105,16,1,'#ffffff');r(cx+1,110,16,4,'#3e5d6e');r(cx+2,111,6,1,'#9ebcb4');r(cx,114,18,2,body);r(cx,116,18,5,side);r(cx+1,117,3,2,'#d6402e');r(cx+14,117,3,2,'#d6402e');r(cx+6,118,6,2,'#fbfbf6');r(cx,121,18,1,'#6f767a');r(cx+1,122,3,2,'#2b2b2b');r(cx+14,122,3,2,'#2b2b2b')};
  parked(404,'#e2e5e8','#c4c9cd');parked(456,'#4f6f9c','#3f5a82');
  r(472,80,2,16,'#5b6558');r(466,64,14,16,'#fbfbf6');r(467,65,12,14,'#1d5fae');letter(g,470.5,67,'P','#ffffff',true);r(390,84,8,2,'#f2d46a');r(390,86,8,10,'#e8c440');r(391,88,6,3,'#283e40');
  r(398,68,2,28,'#6d7276');r(390,54,18,14,'#fbfbf6');r(390,54,18,4,'#00a040');r(390,64,18,2,'#0068b7');t(391,59,'Family','#0068b7');
  for(let d=0;d<16;d++){const x=372+d,foot=140-d*1.5,top=foot-40;r(330+d,100-d*1.5,42,2,'#c9cbc6');r(x,top,1,40,'#f2f3ee');r(x,top+2,1,3,'#00a040');r(x,top+5,1,3,'#fbfbf6');r(x,top+8,1,3,'#0068b7');r(x,top+12,1,27,d%5===4?'#7d8a8c':d>8&&d<14?'#b8d4d8':'#cfe6ea');if(d%3===0)r(x,top+24,1,1,'#d6402e');laneWindows.push([x,top+12,1,27])}
  r(330,100,42,40,'#eef0ea');r(330,102,42,3,'#00a040');r(330,105,42,3,'#fbfbf6');r(330,108,42,3,'#0068b7');r(371,100,1,40,'#c9cbc6');r(330,138,42,2,'#a9a79f');
  small=true;
  // The house: plaster, the tiled roof, the eaves and the grey drainpipes.
  r(36,44,356,128,'#ece9e2');r(36,92,356,1,'#d8d4cb');
  // The roof's long slope above its eave, running up to the ridge with its end tiles.
  for(let y=2;y<34;y+=2){const inset=(34-y)*.7;r(30+inset,y,368-inset*2,2,y%6===2?'#4b4f55':'#54585e');for(let x=30+inset+(y%4)*2;x<398-inset;x+=4)r(x,y,1,2,'#6a6f76')}r(52,0,324,3,'#83888e');r(52,3,324,1,'#3f4348');r(46,-2,10,6,'#6a6f76');r(372,-2,10,6,'#6a6f76');
  r(30,34,368,10,'#54585e');for(let x=30;x<398;x+=3)r(x,34,1,8,'#6a6f76');r(30,34,368,1,'#83888e');r(30,42,368,2,'#2f3236');for(let x=31;x<398;x+=6)r(x,42,2,2,'#83888e');r(36,44,356,1,'#00000030');
  // The timbers: posts, a brown rail, and the two high lattices of charred boards behind slats of uneven length.
  for(const x of [150,164,312,340])r(x,44,3,52,burnt[2]);r(40,84,110,3,burnt[3]);r(40,84,110,1,burnt[4]);r(150,90,190,2,burnt[1]);
  const lattice=(x0:number,x1:number,y0:number,y1:number,slat:number,shades=4)=>{
    for(let x=x0;x<x1;x+=8){r(x,y0+2,7,y1-y0-5,burnt[1+Math.floor(rand()*shades)]);r(x+7,y0+2,1,y1-y0-5,burnt[0]);for(let k=0;k<5;k++)r(x+Math.floor(rand()*6),y0+3+Math.floor(rand()*(y1-y0-8)),1,4,burnt[0])}
    r(x0-2,y0+6,x1-x0+4,2,burnt[0]);for(let x=x0;x<x1;x+=slat){const a=Math.floor(rand()*4),b=Math.floor(rand()*6);r(x,y0-a,3,y1-y0+a+b,burnt[Math.floor(rand()*3)]);r(x,y0-a,1,y1-y0+a+b,burnt[3])}};
  lattice(62,142,48,86,7);lattice(172,304,52,86,6);
  // The vent in its net; the black cable sagging across and down; the white pipe along the eave.
  r(52,70,10,10,'#5a5048');r(54,72,6,6,'#3a332c');for(let k=0;k<3;k++)r(54,73+k*2,6,.5,'#8a8074');
  for(let x=150;x<336;x+=2)r(x,92+Math.round(Math.sin((x-150)/58)*2),2,2,'#1d1d1f');r(336,92,2,14,'#1d1d1f');r(146,44,1.5,50,'#1d1d1f');r(344,98,20,1.5,'#f4f2ea');
  r(38,44,4,126,'#7f8a8c');r(39,44,1,126,'#a8b2b4');r(38,168,5,4,'#f4f2ea');
  // The ground floor's eaves: white boxes over the door and the window; the strip light; the door frame in old wood.
  r(38,95,90,5,'#f4f2ea');r(38,100,90,1,'#4a3628');r(38,101,88,1,'#00000030');r(126,97,214,4,'#f4f2ea');r(126,101,214,1,'#3a2c22');r(70,102,34,3,'#fbfbf6');r(70,105,34,.5,'#b8b3a8');
  // The dark board skirt from the door to the corner, its grain, the rail along its top.
  r(124,146,268,26,burnt[0]);for(let x=124;x<392;x+=2)r(x,146+Math.floor(rand()*8),1,18,x%4?burnt[1]:burnt[2]);r(124,145,268,2,burnt[2]);
  // The sliding door: its frame, two leaves of frosted panes behind slats, the rail, the handles.
  r(59,106,66,66,burnt[1]);r(59,106,3,66,burnt[3]);r(122,106,3,66,burnt[3]);r(62,106,60,3,burnt[3]);
  for(const [x,w] of [[63,29],[92,29]]){r(x,110,w,60,'#3d342c');r(x+1,111,w-2,58,'#5d564e');for(let k=0;k<30;k++)r(x+1+Math.floor(rand()*(w-2)),111+Math.floor(rand()*58),1,1,'#6c655c');for(let sx=x+4;sx<x+w-2;sx+=6)r(sx,110,1.5,60,'#3d342c');r(x,147,w,3,'#463c32')}
  r(91,110,2,60,'#2a211b');r(88,146,1.5,6,'#c4b482');r(96,146,1.5,6,'#c4b482');r(114,136,3,9,'#2f3236');r(115,137,1,1,'#7dba71');
  r(90,126,17,11,'#fbfbf6');for(let k=0;k<4;k++)r(92,128+k*2,13,.5,'#8f8f8f');
  // The wooden plaque and the owl noren, four panels on the charcoal cloth, a pair of owls on each.
  r(84,102,12,7,'#c9a772');r(84,102,12,.5,'#e0c594');t(85,103,'KK','#3a281d');r(92,105,3,3,'#6b4a32');
  for(let k=0;k<4;k++){const x=78+k*11;r(x,109,10.5,14,'#55514b');r(x,109,10.5,1,'#6b665f');for(const [dx,c] of [[1,'#a9b8a0'],[5.5,'#c9b7a8']] as const){r(x+dx,114,4,5,c);r(x+dx,115,4,2,'#f4f0e8');r(x+dx+.5,115.5,1,1,'#2a211b');r(x+dx+2.5,115.5,1,1,'#2a211b');r(x+dx+1.5,117,1,.5,'#d8843a')}}
  // The meter on its black board, the white notice and the grey mailbox.
  r(127,106,11,14,'#20211f');r(129,108,7,10,'#5f7078');r(130,109,5,3,'#a8c0b8');r(132,120,1,3,'#1d1d1f');r(126,124,10,5,'#fbfbf6');r(127,130,12,15,'#b4b9bc');r(127,130,12,2,'#d0d4d6');r(129,135,8,1,'#7d8285');
  // The ground-floor lattice: boards under slats that run past them, the lantern at its end.
  lattice(146,306,106,146,8,2);
  r(315,112,10,14,'#fbf6e6');r(315,112,10,1,'#1d1d1f');r(315,125,10,1,'#1d1d1f');r(315,112,1,14,'#1d1d1f');r(324,112,1,14,'#1d1d1f');r(320,112,.5,14,'#c9c4b4');
  // The water heater box and meter on the plaster past the lattice.
  r(352,130,16,14,'#4c565a');r(352,130,16,1,'#6d787c');r(355,133,10,5,'#c9cdd0');r(356,134,8,1,'#7d8285');
  // Bins either side of the five outdoor units, each on its white feet and red pads.
  const bin=(x:number)=>{r(x,150,12,20,'#47413c');r(x-1,149,14,3,'#5a534d');r(x+3,150,6,.5,'#f4f2ea');r(x-1,169.5,14,1,'#00000040')};
  bin(136);bin(292);
  for(const x of [150,178,206,234,262]){r(x+2,168,3,3,'#b4552f');r(x+18,168,3,3,'#b4552f');r(x+2,166,3,3,'#fbfbf6');r(x+18,166,3,3,'#fbfbf6');r(x,149,24,17,'#e4e2da');r(x,149,24,1.5,'#f4f2ea');r(x+23,149,1,17,'#bfbcb2');
    for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const d=Math.hypot(dx,dy);if(d<=6.2)r(x+9+dx,158+dy,1,1,d>5.2?'#b8b4aa':(dx+dy)%2?'#8f8c84':'#c9c7be')}r(x+18,152,4,2,'#3a78c2')}
  small=false;
  // The neighbour's: an upper floor, its lattice and frosted window under its own roof, then the ground floor under its pent roof, a timber post either end, a lattice and a door.
  r(250,88,88,28,'#e4dfd2');r(250,88,88,3,'#00000030');for(const x of [250,336])r(x,88,2,28,burnt[2]);r(264,95,34,15,burnt[1]);for(let x=264;x<298;x+=3)r(x,95,1,15,burnt[3]);r(262,110,38,1.5,burnt[3]);r(308,95,18,13,'#3a281d');r(309,96,16,11,'#c9c4b4');r(317,96,.5,11,'#3a281d');laneWindows.push([309,96,16,11]);
  for(let y=66;y<86;y+=2){const inset=(86-y)*.8;r(242+inset,y,104-inset*2,2,y%6===2?'#4b4f55':'#54585e');for(let x=242+inset+(y%4)*2;x<346-inset;x+=4)r(x,y,1,2,'#6a6f76')}r(258,65,72,2,'#83888e');r(240,86,108,2,'#2f3236');for(let x=241;x<348;x+=6)r(x,86,2,2,'#83888e');
  r(244,126,100,46,'#e4dfd2');r(238,114,112,12,'#54585e');for(let x=238;x<350;x+=3)r(x,114,1,10,'#6a6f76');r(238,114,112,1,'#83888e');r(238,124,112,2,'#2f3236');for(const x of [244,342])r(x,126,2,46,burnt[2]);
  r(258,134,44,18,burnt[1]);for(let x=258;x<302;x+=3)r(x,134,1,18,burnt[3]);r(316,136,16,36,burnt[1]);r(318,138,12,32,'#5d564e');r(323,138,1,32,burnt[1]);r(246,160,68,12,burnt[0]);
  // The apron, its joints and the manhole; the steel bollard; the kerb's edge.
  r(0,172,480,10,'#a9a79f');for(let x=0;x<480;x+=24){r(x,172,.5,10,'#8b897f');if(x%96===48){r(x+5,175,14,4,'#55565a');for(let k=0;k<7;k++)r(x+6+k*2,175.5,1,3,'#2f3033')}}r(0,172,480,1,'#00000030');r(0,181,480,1,'#6d6c66');
  r(76,174,18,6,'#6b4a32');r(77,175,16,4,'#4d3a2c');for(let x=78;x<92;x+=2)r(x,175,1,4,'#6b5442');
  r(20,158,5,18,'#b4b9bc');r(21,158,1,18,'#dfe2e4');r(20,158,5,1,'#8f9497');
  // The asphalt and a manhole on the far side.
  r(0,182,480,80,'#4f5155');for(let k=0;k<700;k++)r(Math.floor(rand()*480),182+Math.floor(rand()*80),1,1,rand()<.5?'#5b5d61':'#46484c');
  for(let y=-5;y<=5;y++)for(let x=-14;x<=14;x++){const d=Math.hypot(x/14,y/5);if(d<=1)r(318+x,226+y,1,1,d>.85?'#3a3c3f':(x+y)%3?'#6b6d70':'#5a5c60')}
  // The road's wear: a crack or two, the worn white edge lines.
  for(const [x0,y0,n] of [[238,204,34],[60,196,22]]){let y=y0;for(let k=0;k<n;k++){r(x0+k*2,y,2,.5,'#393b3e');y+=[-.5,0,.5][Math.floor(rand()*3)]}}
  // The edge lines stop at the bend, as at any junction.
  for(const [y,end] of [[186,340],[257,368]])for(let x=0;x<end;x+=4)if(rand()>.12)r(x,y,4,1,rand()<.2?'#b9b7a8':'#dedbc8');
  // At its end the lane bends up to the back street, close behind the houses, which runs parallel to it; the pavement goes round the inner corner.
  r(344,140,136,24,'#4f5155');for(let k=0;k<240;k++)r(344+Math.floor(rand()*136),140+Math.floor(rand()*24),1,1,k%2?'#5b5d61':'#46484c');r(344,140,136,1,'#c4c0b2');for(let x=344;x<480;x+=5)if(rand()>.12)r(x,144,4,1,'#dedbc8');
  for(let y=164;y<262;y++){const a=y<182?laneInner(y):344,b=laneOuter(y);if(y<182)r(344,y,a-344,1,'#a9a79f');r(a,y,b-a,1,'#4f5155');for(let k=0;k<(b-a)/8;k++)r(a+Math.floor(rand()*(b-a)),y,1,1,k%2?'#5b5d61':'#46484c');
    if(y<182)r(a-1,y,1,1,'#6d6c66')}
  r(344,164,56,1,'#6d6c66');for(const x of [360,376])for(let y=164;y<182&&x<laneInner(y);y++)r(x,y,.5,1,'#8b897f');
  // The road's life: the tracks polished by the tyres, the darker oil down the middle, the bend's stop line and its とまれ, read coming up the lane.
  for(let k=0;k<520;k++){const x=Math.floor(rand()*344),y=[202,214,232,244][k%4]+Math.floor(rand()*7);r(x,y,3,1,'#54565a')}for(let k=0;k<140;k++)r(Math.floor(rand()*344),219+Math.floor(rand()*8),3,1,'#4a4c50');
  r(Math.ceil(laneInner(169))+2,169,Math.floor(laneOuter(169)-laneInner(169))-6,2,'#dedbc8');letter(g,394,172,'とまれ','#dedbc8',true);for(let k=0;k<24;k++)r(394+Math.floor(rand()*30),172+Math.floor(rand()*10),1,1,'#4f5155');
  // The low morning sun, from the left: the shade along the foot of the houses, the poles' long shadows over the road.
  for(let x=0;x<344;x+=2){r(x,172,2,2,'#00000026');if(x%4===0)r(x,174,2,1,'#00000018')}
  for(const x of [240,356])for(let k=0;k<60;k++)r(x+k*.5,176+k,3,1,'#00000014');
  // Past the bend, town: a block wall along the road's edge under its coping, the yard behind it, a house's tiled roof and its back wall with the window and the outdoor unit.
  for(let y=164;y<262;y++){const b=laneOuter(y);r(b,y,480-b,1,'#8b8a82');for(let k=0;k<3;k++)r(b+Math.floor(rand()*(480-b)),y,1,1,k%2?'#979690':'#7f7e76');r(b,y,7,1,y%7?'#b5b0a4':'#8f8a7e');r(b,y,1.5,1,'#d6d0bf');r(b+6.5,y,.5,1,'#6d6b62')}
  softCrown(r,rand,430,238,11,8,['#1f3d31','#2c5543','#3d6e50','#5d8a5e']);
  tiles(442,206,38,28);for(let y=212;y<232;y+=4)r(442,y,38,1,'#00000024');r(442,234,38,28,'#e4dfd2');r(442,234,38,3,'#00000044');r(448,240,14,10,'#3a281d');r(449,241,12,8,'#c9a772');for(let x=449;x<461;x+=2)r(x,241,1,8,'#5a4030');r(466,246,12,10,'#e4e2da');r(466,246,12,1,'#f4f2ea');r(469,249,6,6,'#8f8c84');laneWindows.push([449,241,12,8]);
  // The far side of the road, seen over its wall: the coping the pots stand on, then the neighbours' tiled roofs, their back walls and, between them, small gardens.
  r(0,268,480,52,'#7b8a68');for(let k=0;k<420;k++)r(Math.floor(rand()*480),268+Math.floor(rand()*52),1,1,k%2?'#8c9b75':'#6c7b5c');
  for(const [x,w,walled] of [[0,92,true],[150,118,false],[316,92,true],[432,48,false]] as const){tiles(x,270,w,24);for(let y=274;y<290;y+=4)r(x,y,w,1,'#00000024');r(x,294,w,26,walled?'#e4dfd2':'#5a4030');if(!walled)for(let k=x;k<x+w;k+=3)r(k,294,1,26,'#4a3426');r(x,294,w,3,'#00000044');r(x+w-1,270,1,50,'#2a1d14')}
  for(const [x,y,w,h,lit] of [[14,300,16,11,true],[58,300,16,11,false],[170,300,20,11,true],[232,300,14,11,false],[332,300,16,11,false],[378,300,18,11,true],[444,300,14,11,true]] as const){r(x-1,y-1,w+2,h+2,'#3a281d');r(x,y,w,h,'#c9a772');for(let k=x;k<x+w;k+=2)r(k,y,1,h,'#5a4030');r(x,y+Math.floor(h/2),w,1,'#3a281d');if(lit)laneWindows.push([x,y,w,h])}
  r(36,303,14,12,'#e4e2da');r(36,303,14,1,'#f4f2ea');for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(Math.hypot(dx,dy)<3.4)r(43+dx,309+dy,1,1,(dx+dy)%2?'#8f8c84':'#c9c7be');
  // The gardens: a maple, a stone lantern and stepping stones in the one, a pine and a stone basin in the other.
  softCrown(r,rand,122,292,20,17,['#7a2a20','#b23a26','#d8562f','#ee8a3c']);r(120,304,4,16,'#5a4030');
  for(const [x,y] of [[98,312],[106,306],[140,314],[148,308]])r(x,y,6,3,'#b4b0a4');r(99,296,8,2,'#a8a498');r(101,298,4,4,'#c9c5b8');r(102,299,2,2,'#3a332c');r(102,302,2,8,'#a8a498');r(100,310,6,2,'#8f8b7e');
  softCrown(r,rand,292,290,14,8,['#1f3d31','#2c5543','#3d6e50','#5d8a5e']);softCrown(r,rand,284,302,10,6,['#1f3d31','#2c5543','#3d6e50','#5d8a5e']);r(290,296,4,24,'#4a3426');r(302,310,10,6,'#a8a498');r(304,311,6,3,'#5b86a0');
  // On the long roof, the wooden drying deck with the washing out.
  r(196,275,44,2,'#8a6444');r(196,289,44,2,'#6b4a32');for(let x=196;x<240;x+=4)r(x,277,2.5,12,'#8a6444');for(const x of [198,237])r(x,262,1.5,14,'#4a3426');r(198,264,40,.5,'#e4e2da');
  for(const [x,c] of [[204,'#fbfbf6'],[214,'#7fa3c7'],[224,'#e8b9a8']] as const){r(x,264,7,9,c);r(x-1,264,9,3,c);r(x+6,265,.5,8,'#00000020')}
  // In the gap between the last roofs, a clipped shrub and two pots.
  softCrown(r,rand,420,284,11,8,leafy);softCrown(r,rand,414,306,8,6,['#7a2a20','#b23a26','#d8562f','#ee8a3c']);r(424,306,6,8,'#b66c51');r(423,305,8,2,'#c98266');softCrown(r,rand,427,301,5,5,leafy);
  // The wall's coping, with the pots on it; the cat asleep along it is a sprite (makeCat, cat.ts).
  r(0,262,480,6,'#9a978c');r(0,262,480,1,'#b5b2a6');r(0,267,480,1,'#6d6b62');for(let x=0;x<480;x+=20)r(x,262,.5,6,'#7d7b73');
  for(const [x,pot] of [[92,'#b66c51'],[138,'#e4e2da'],[250,'#3a78c2'],[300,'#b66c51'],[350,'#e4e2da']] as const){r(x,254,16,12,pot);r(x-1,253,18,2,pot);r(x+1,264,14,1,'#00000030');softCrown(r,rand,x+8,246,10,9,leafy)}
  // Before the houses: small pots by the corner, a neighbour's bicycle, then the little Jizo shrine with its red bib and fresh flowers.
  for(const [x,c] of [[208,'#8a5a42'],[216,'#b66c51'],[224,'#5a6a6e']] as const){r(x,167,6,6,c);r(x-.5,166,7,1.5,'#00000030');softCrown(r,rand,x+3,163,4,4,leafy)}
  for(const cx of [264,280]){for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){const d=Math.hypot(x,y);if(d>4.8&&d<=6.2)r(cx+x,168+y,1,1,'#2b2b2b');else if(d<=.8)r(cx+x,168+y,1,1,'#9aa0a4')}r(cx,163,.5,10,'#9aa0a4');r(cx-5,168,10,.5,'#9aa0a4')}
  for(let k=0;k<10;k++){r(267+k*.8,160+k*.8,1,1,'#b23a26');r(267+k,160,1,1,'#b23a26');r(277-k*.4,160+k*.8,1,1,'#b23a26')}r(264,157,6,1.5,'#2b2b2b');r(267,158,1,3,'#2b2b2b');r(277,155,1,6,'#9aa0a4');r(274,154,7,1,'#9aa0a4');r(277,152,8,5,'#c9cdd0');for(let x=278;x<285;x+=2)r(x,152,.5,5,'#8f9497');r(261,173,24,1,'#00000030');
  r(292,163,16,8,burnt[2]);r(292,163,16,1.5,burnt[3]);r(293,149,14,14,'#2f2319');r(293,149,1.5,14,burnt[3]);r(305.5,149,1.5,14,burnt[3]);tiles(290,144,20,6);
  r(298,153,5,10,'#b4b9bc');r(298.5,150,4,4,'#c9cdd0');r(297.5,156,6,4,'#d6402e');r(297.5,156,6,1,'#ee7a60');r(294,158,2,5,'#e4e2da');r(305,158,2,5,'#e4e2da');r(294,155,2,3,'#3f8f45');r(305,155,2,3,'#3f8f45');r(294.5,154,1,1,'#f2d46a');r(305.5,154,1,1,'#e9a6ad');r(291,171,18,1,'#00000030');
  // Flower boxes on the neighbour's upper rail, stains under the eaves.
  r(264,108,34,2,'#6b4a32');for(let x=265;x<297;x+=3){r(x,105,2,3,'#3f8f45');r(x,104,1,1,['#e9a6ad','#f2d46a','#fbfbf6'][x%3])}for(let x=252;x<336;x+=7)r(x,91,1,3+(x%5),'#d0ccc0');
  // The utility poles at the lane's edge: their cross-arms and insulators, the steps up them, the transformer, the street light, the district's plate; the wires sagging from one to the next and down to the houses.
  for(const x of [234,350]){r(x,14,4,159,'#8d9092');r(x,14,1,159,'#aeb1b2');r(x+3,14,1,159,'#6f7274');for(let y=60;y<140;y+=9)r(x+(y%2)*3-1,y,6,.75,'#5b5f61');r(x-1,173,7,1,'#00000030');
    for(const y of [20,30]){r(x-9,y,22,2,'#5b5f61');for(const dx of [-8,1,11])r(x+dx,y-2,2,2,'#e4e2da')}r(x-1,118,6,18,'#fbfbf6');r(x-1,118,6,.5,'#c4c6c0');for(const [k,c] of ['東','九','条'].entries())t(x,120+k*5,c,'#283e40')}
  r(238,40,8,17,'#9aa0a4');r(238,40,8,1,'#c4c9cd');r(240,40,1,17,'#b4b9bc');r(238,44,3,1,'#5b5f61');r(344,86,7,1.5,'#5b5f61');r(336,85,10,3,'#5b6558');r(337,88,8,1,'#fff6d0');
  const wire=(x0:number,y0:number,x1:number,y1:number,sag:number,c='#2b2c2e')=>{const n=Math.ceil(Math.hypot(x1-x0,y1-y0)*2);for(let i=0;i<=n;i++){const k=i/n;r(Math.round((x0+(x1-x0)*k)*2)/2,Math.round((y0+(y1-y0)*k+sag*4*k*(1-k))*2)/2,1,.5,c)}};
  for(const y of [19,29]){wire(-8,y-5,236,y-1,9);wire(236,y-1,352,y-1,6);wire(352,y-1,488,y-5,8)}
  wire(-8,38,236,44,10);wire(236,44,352,44,7);wire(352,44,488,40,9);wire(236,46,97,101,10);wire(351,46,322,90,3);
  // On the wires: a crow, and sparrows further along.
  for(const [x,y] of [[118,50]]){r(x,y-5,8,4,'#1d1d22');r(x+7,y-7,3,3,'#1d1d22');r(x+10,y-6,2,1,'#2f2f36');r(x-3,y-3,4,2,'#1d1d22');r(x+3,y-1,.5,2,'#1d1d22')}
  for(const [x,y] of [[298,51],[304,51],[312,51]]){r(x,y-3,3,3,'#6b5442');r(x+2,y-4,2,2,'#4a3628')}
  // The way back to the station: the green sign on its post.
  r(460,181,2,22,'#5b6558');r(444,168,34,13,'#2c8a4a');r(444.5,168.5,33,12,'#fbfbf6');r(445,169,32,11,'#2c8a4a');letter(g,446,169.5,'十条駅→','#ffffff');letter(g,446,175,'To Jujo Sta.','#d8f0dc');r(458,203,6,1,'#00000030');
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
  /** Kawara tiles: rows with a shadow under each, the tiles staggered, each lit along its top. */
  const kawara=(x:number,y:number,w:number,h:number,roof:string)=>{r(x,y,w,h,roof);for(let yy=y,k=0;yy<y+h;yy+=4,k++){r(x,yy+3,w,1,'#00000030');for(let xx=x+(k%2)*3;xx<x+w;xx+=6){r(xx,yy,4,1,'#ffffff38');r(xx+5,yy,1,3,'#00000020')}}};
  /** The leaves' own dice, so that the plants leave the rest of the street as it was. */
  let sprigSeed=91;const sprig=()=>{sprigSeed=(sprigSeed*1664525+1013904223)>>>0;return sprigSeed/4294967296},{pot,terracotta}=potPlants(r);
  /** A clipped hedge: rounded clumps of dithered leaves side by side (softCrown), lit from the top left, over their shade. */
  const hedge=(x:number,y:number,w:number,h:number)=>{r(x,y+3,w,h-3,leafy[0]);for(let xx=x+5;xx<x+w+5;xx+=5+Math.floor(sprig()*3))softCrown(r,sprig,Math.min(xx,x+w-6),y+h/2,6,h/2,leafy);r(x,y+h-1,w,1,'#274a3a')};
  // The far side: houses, the coin park, the vending machines.
  const house=(x:number,w:number,wall:string,roof:string)=>{
    kawara(x,22,w,14,roof);r(x,35,w,2,'#3b4541');r(x+2,37,w-4,58,wall);r(x+2,37,1,58,'#ffffff40');
    glazing(x+10,44,18,12,rand()<.5);glazing(x+w-28,44,18,12,rand()<.5);glazing(x+8,70,16,12,rand()<.3);
    r(x+w/2-6,68,12,24,'#806049');r(x+w/2-5,69,10,22,'#94704f');r(x+w/2+3,80,1.5,1.5,'#e8c440');r(x+w/2-8,66,16,2,'#5d6a62');
    r(x+w-20,78,13,9,'#e8eef0');for(let k=0;k<4;k++)r(x+w-18+k*3,80,1,5,'#aeb4b8');
    blocks(x,92,w,22);const gx=x+w/2-9;r(gx,92,18,22,'#a39d8d');for(let y=94;y<114;y+=4)r(gx,y,18,.5,'#8e887a');
    for(let k=0;k<6;k++)r(gx+1+k*3,98,1,10,'#5b6558');r(gx,98,18,1,'#5b6558');r(gx,107,18,1,'#5b6558');r(gx+20,98,6,5,'#d6402e');r(gx+20,98,6,1,'#a52f22');
    softCrown(r,sprig,x+8,101,7,6,leafy);pot(x+4,106,8,7,...terracotta);
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
  for(const [w,kind,wall,roof] of [[92,'house','#efe9dc','#4f6f9a'],[78,'house','#e6dcc6','#a0523f'],[104,'house','#e8e4da','#4f7a5a'],[70,'park','',''],[86,'house','#f1ebde','#8a5a4a'],[60,'vending','',''],[96,'house','#e4dccb','#5a6a8a']] as const){
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
  // A bicycle by the foot of the stairs, side on: thin wheels, a blue frame, saddle, handlebar and a front basket.
  {const bx=a+21,by=108,c='#3a78c2',k='#2b2b2b';r(bx-3,by+3.5,17,.5,'#0000002a');
    for(const cx of [bx,bx+10]){for(let y=-3;y<=3;y++)for(let xx=-3;xx<=3;xx++){const d=Math.hypot(xx,y);if(d>2.5&&d<=3.2)r(cx+xx,by+y,1,1,k)}r(cx,by,1,1,'#9aa0a4')}
    r(bx+1,by,4,1,c);r(bx+1,by-1,1,1,c);r(bx+2,by-3,1,2,c);r(bx+3,by-5,1,5,c);r(bx+3,by-4,6,1,c);for(let i=0;i<4;i++)r(bx+8-i,by-3+i,1,1,c);
    r(bx+9,by-7,1,5,c);r(bx+10,by-2,1,2,c);r(bx+8,by-8,3,1,k);r(bx+7,by-8,1,1,'#6a6a62');r(bx+2,by-6,3,1,k);r(bx+4,by+1,2,1,k);
    r(bx+11,by-8,4,3,'#8a8f92');r(bx+11,by-8,4,.5,'#c9cdd0');r(bx+12,by-7,.5,2,'#5b6558');r(bx+13.5,by-7,.5,2,'#5b6558');r(bx+11,by-5,1,1,k)}
  r(a,112,128,3,'#b5ae90');
  // The lane: asphalt, its white edge lines, a manhole, and the side street crossing the near side with its stop line and とまれ.
  r(0,114,W,82,'#666a64');for(let i=0;i<650;i++)r(Math.floor(rand()*W),114+Math.floor(rand()*82),1,1,i%2?'#727670':'#5c605a');
  // Concrete gutters with their grates along both edges, and the green-painted walkway along the near side.
  for(const [x0,x1] of [[0,W]])for(let x=x0;x<x1;x+=12){r(x,114,12,3,'#a9a597');r(x,114,12,.5,'#c4c0b2');r(x+11,114,1,3,'#8f8b7e');if(x%48===0)for(let k=0;k<5;k++)r(x+2+k*2,114.5,1,2,'#5c605a')}
  for(const [x0,x1] of [[0,300],[340,W]]){r(x0,180,x1-x0,12,'#6b857d');r(x0,180,x1-x0,.5,'#86a097');for(let x=x0;x<x1;x+=1)if(rand()<.25)r(x,181+Math.floor(rand()*10),1,1,'#738d85');
    for(let x=x0;x<x1;x+=12){r(x,193,12,3,'#a9a597');r(x,193,12,.5,'#c4c0b2');r(x+11,193,1,3,'#8f8b7e')}}
  r(0,118,W,1,'#e6e3cc');for(const [x0,x1] of [[0,300],[340,W]])r(x0,179,x1-x0,1,'#e6e3cc');
  for(let y=-5;y<=5;y++)for(let xx=-5;xx<=5;xx++){const d=Math.hypot(xx,y);if(d<=5)r(222+xx,156+y,1,1,d>4.2?'#4a4e48':(xx+y)%2?'#7d817a':'#6b6f68')}
  r(300,192,40,128,'#666a64');for(let i=0;i<200;i++)r(300+Math.floor(rand()*40),196+Math.floor(rand()*124),1,1,'#727670');r(302,196,1,124,'#e6e3cc');r(337,196,1,124,'#e6e3cc');
  r(303,202,34,2,'#fbfbf6');g.textAlign='center';t(320,206,'とまれ','#fbfbf6',true);g.textAlign='left';
  // The near side: the block wall along the lane and its hedges, then the houses beyond, turned away from the lane, in the same three-quarter view: the far slope of their tiled roofs,
  // the ridge, the near slope down to the gutter, and their back walls with the upstairs windows (lit at night), an air conditioner's outdoor unit and a drainpipe.
  for(const [x0,w,roof,wall] of [[0,74,'#a0523f','#e8e4da'],[74,112,'#4f6f9a','#efe9dc'],[186,114,'#7a5a4a','#e6dcc6'],[340,92,'#4f7a5a','#f1ebde'],[432,98,'#8a5a4a','#e4dccb'],[530,92,'#5a6a8a','#ece6d8'],[622,98,'#9a4a4a','#e8e0cf']] as const){
    blocks(x0,196,w,8);hedge(x0,204,w,10);
    const hx=x0+3,hw=w-6;r(x0,214,w,106,'#3f4a44');
    r(hx,214,hw,12,roof);r(hx,214,hw,12,'#00000038');r(hx,226,hw,2,'#ffffff45');kawara(hx,228,hw,40,roof);r(hx,266,hw,3,'#3b4541');
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
  // Planks 8 px wide in three tones, lit along their left edge, the joints at their ends staggered, a little grain.
  const wood=(x:number,y:number,w:number,h:number,base:string,line:string)=>{r(x,y,w,h,base);for(let px=x,k=0;px<x+w;px+=8,k++){
    r(px,y,Math.min(8,x+w-px),h,['#00000000','#ffffff18','#00000012'][(k*7)%3]);r(px,y,.5,h,line);r(px+.5,y,.5,h,'#ffffff28');
    for(let py=y+(k%3)*14;py<y+h;py+=40)r(px,py,8,.5,line);for(let py=y+(k*13)%9;py<y+h;py+=11)if(px+6<x+w)r(px+2+(k*3+py)%4,py,2,.5,line)}};
  const tiles=(x:number,y:number,w:number,h:number,base:string,line:string,step=8)=>{r(x,y,w,h,base);for(let py=y;py<y+h;py+=step)r(x,py,w,.5,line);for(let px=x;px<x+w;px+=step)r(px,y,.5,h,line)};
  // A wall's face: the paper, a shadow under the ceiling, the skirting board.
  const face=(x:number,y:number,w:number,paper='#efe8d8')=>{r(x,y,w,28,paper);r(x,y,w,2,'#d6ccb8');r(x,y+25,w,3,'#a58766');r(x,y+25,w,.5,'#c4a682')};
  const top=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#4a4440');r(x,y,w,.5,'#655d56')};
  const shadow=(x:number,y:number,w:number,h=2)=>r(x,y,w,h,'#00000024'),{palm,fern,orchid}=potPlants(r);
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
  fern(75,216);
  // The LDK: a clock and a picture on the wall, the TV on its board, the rug and the low table with cushions, a plant by the window, the stools at the island.
  r(310,52,8,8,'#fbfbf6');r(310,52,8,1,'#2f3438');r(314,54,.5,3,'#2f3438');r(314,56,2,.5,'#2f3438');r(394,52,12,14,'#a07850');r(395,53,10,12,'#7fb0c8');r(395,60,10,5,'#63905b');
  r(338,50,44,20,'#2f3438');r(340,52,40,15,'#1c2a33');r(342,53,12,1,'#3e5664');r(357,70,6,2,'#2f3438');r(330,70,60,6,'#7d5e40');r(330,76,60,12,'#5a4a3e');for(const x of [350,370])r(x,77,.5,10,'#3e3329');r(345,81,2,1,'#c49a6c');r(373,81,2,1,'#c49a6c');shadow(330,88,60);
  r(316,96,88,72,'#c9b8a0');r(318,98,84,68,'#d8cbb2');for(let x=322;x<400;x+=8)r(x,164,2,4,'#b8a487');
  shadow(340,122,40);r(340,102,40,16,'#a07850');r(341,103,38,2,'#b8906a');r(340,118,40,4,'#7d5e40');r(346,106,10,7,'#e8eef0');r(347,107,8,1,'#7d8a84');r(364,107,4,4,'#fbfbf6');r(365,108,2,2,'#8a5a3c');
  r(326,106,10,10,'#d6402e');r(327,107,8,8,'#e86a52');r(384,106,10,10,'#3a78c2');r(385,107,8,8,'#5a94d8');
  palm(201,74);
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
  r(228,364,12,26,'#c49a6c');r(228,390,12,8,'#a07850');r(228,394,12,.5,'#7d5e40');shadow(228,398,12,1);orchid(228.5,353);
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
// The Kyoto house's slanted walls, its north-east corner following the plot: the triangular bath's two sides, the washroom's and the landing's (x at a given y), the balcony's top (y at a given x).
const bathLeft=(y:number)=>Math.round(326+(124-y)*.8),bathRight=(y:number)=>Math.round(430-(124-y)*1.28),washRight=(y:number)=>Math.min(468,Math.round(430+(y-124)*.576)),landingRight=(y:number)=>Math.min(364,322+y-40),balconyTop=(x:number)=>Math.round(82+(x-364)*.39);
const steps=(from:number,to:number,rect:(at:number)=>[number,number,number,number])=>Array.from({length:Math.ceil((to-from)/4)},(_,k)=>rect(from+k*4));
/** The Kyoto rental's two floors, each 480 × 340 art px, downstairs scrolling a little up and down, from its plan (46 art px a metre across, some 46 down, the 28 px faces of the back walls added): `kyoto-house` and `kyoto-upstairs`.
 * Downstairs (floors): the entrance hall (18–78 × 158–236) and the genkan a step down (to 323), its sliding front door in the bottom wall (30–66), through a doorway the kitchen along the back (18–190 × 74–124);
 * through the kitchen's door at its right end (137–190) 和室A with its sofas and TV (84–190 × 158–323, parted from the kitchen by nothing but thin fusuma, behind the sofas), from there by the door at the foot of their wall (282–323) 和室B (196–316 × 158–323, closet and tokonoma at the back), and by the same door on its far side the floor at the foot of the stairs (322–364 × 280–323), which climb north;
 * from it the washroom down the side (370–412) with the two toilets off it (418–468), up which lie the washing machine's lobby and the triangular bath behind its door (378–404).
 * Upstairs: the stairs arrive (322–364 × 150–232, a closet beyond) at the landing, the door to the balcony (370–410) on its right; the corridor runs left along the back (74–108) past the doors of 和室C (223–316) and 和室D (124–217), each 142–262 past a strip of boards, to the door at its end (78–104) in the side of 和室E (18–96 × 74–262), which takes the corridor's depth as well; each has its bed (spots `bedE`, `bedD`, `bedC`); closets between E and D. Under the bedrooms' windows the ground floor's roof. */
export const kyotoSolids:Record<'kyoto-house'|'kyoto-upstairs',[number,number,number,number][]>={
  'kyoto-house':[[0,0,480,74],[0,0,18,340],[0,323,480,17],[468,0,12,340],[190,0,132,130],[0,124,30,34],[70,124,14,34],[84,128,53,30],[190,124,6,158],[196,124,126,34],[322,124,56,34],[404,124,76,34],
    [78,158,6,171],[316,158,6,124],[322,200,48,80],[364,280,6,6],[364,320,6,9],[412,194,68,34],[412,228,6,4],[412,258,6,38],[412,262,68,34],[412,320,6,3],
    ...steps(74,124,y=>[322,y,bathLeft(y)-322,4] as [number,number,number,number]),...steps(74,124,y=>[bathRight(y+3),y,480-bathRight(y+3),4] as [number,number,number,number]),...steps(124,190,y=>[washRight(y),y,480-washRight(y),4] as [number,number,number,number]),
    // The kitchen's fridge and counter, the bath's tub, the washing machine, the vanity, the two toilets, the shoe cabinet, the low table, the sofas, the TV board, the paper lamps.
    [18,74,22,18],[40,74,150,18],[354,94,36,20],[324,158,38,18],[406,158,30,14],[438,228,16,18],[448,298,20,18],[18,250,12,50],[232,222,48,24],[84,158,53,25],[84,183,33,73],[158,195,32,61],[302,160,12,16],[90,296,12,16]],
  'kyoto-upstairs':[[0,0,480,74],[0,0,18,340],[0,262,480,78],[414,0,66,340],[96,74,6,4],[96,104,6,4],[96,108,28,154],[124,108,33,34],[183,108,74,34],[283,108,39,34],[217,142,6,120],[316,142,6,120],[322,150,42,112],[364,74,6,44],[364,146,6,116],
    ...steps(370,414,x=>[x,74,4,balconyTop(x+3)-74] as [number,number,number,number]),
    // The spare futons, the shelf, the three beds and their lamps, the chest, the suitcase, the desk.
    [24,74,32,20],[292,142,22,16],[24,196,30,60],[180,196,30,60],[280,196,30,60],[58,200,14,14],[160,200,14,14],[262,200,14,14],[84,222,12,34],[126,146,18,18],[225,142,24,18]]};
/** The house's windows (art px, x y w h): main.ts darkens them at night. Those of the bottom wall face the lane. */
export const kyotoWindows:Record<'kyoto-house'|'kyoto-upstairs',[number,number,number,number][]>={'kyoto-house':[[100,323,52,5],[240,323,52,5]],'kyoto-upstairs':[[180,50,52,18],[30,262,54,5],[145,262,50,5],[245,262,50,5]]};
function makeKyotoHouse(scene:Phaser.Scene){
  let g:CanvasRenderingContext2D,seed=11;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const r=(x:number,y:number,w:number,h:number,color:string)=>{g.fillStyle=color;g.fillRect(x,y,w,h)},dark='#231d19',timber='#5b3f2a',beam='#3b2a1e';
  const shadow=(x:number,y:number,w:number,h=2)=>r(x,y,w,h,'#00000026');
  // Old boards 7 px wide, each its own tone, the joints staggered, a little grain and the shine of years of socks.
  const wood=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#a3703f');for(let px=x,k=0;px<x+w;px+=7,k++){const bw=Math.min(7,x+w-px);r(px,y,bw,h,['#ffffff00','#ffffff12','#0000000f','#ffffff08','#00000018'][(k*3+Math.floor(x/7))%5]);r(px,y,.5,h,'#7f5429');for(let py=y+(k*17)%37;py<y+h;py+=46)r(px,py,bw,.5,'#7f5429');for(let py=y+(k*5)%13;py<y+h;py+=13)if(bw>5)r(px+2+(k+py)%3,py,3,.5,'#00000014')}};
  const tiles=(x:number,y:number,w:number,h:number,base:string,line:string,step=8)=>{r(x,y,w,h,base);for(let py=y;py<y+h;py+=step)r(x,py,w,.5,line);for(let px=x;px<x+w;px+=step)r(px,y,.5,h,line)};
  // Mats laid side by side down the room: the rush's fine weave, each mat its own age, their green borders with a paler thread, the joint where one meets the next.
  const tatami=(x:number,y:number,w:number,h:number,mats:number)=>{const m=w/mats;r(x,y,w,h,'#cfcf94');for(let k=0;k<mats;k++){const px=x+k*m,first=k%2?44:88;for(let py=y,n=0;py<y+h;py+=88,n++)r(px,py,m,Math.min(88,y+h-py),['#ffffff00','#00000009','#ffffff0c'][(k+n)%3]);for(let py=y;py<y+h;py+=1.5)r(px,py,m,.5,'#b9ba7d70');r(px,y,2,h,'#35503f');r(px+m-2,y,2,h,'#35503f');r(px+.5,y,.5,h,'#6d8c72');r(px+m-1,y,.5,h,'#6d8c72');r(px+2,y,.5,h,'#ecebbb');for(let py=y+first;py<y+h;py+=88)r(px+2,py,m-4,1,'#9fa168')}};
  // A wall's face: plaster with its faint trowel marks, the shadow of the ceiling, the lintel and the skirting in dark timber.
  const face=(x:number,y:number,w:number,paper='#ebe2cd')=>{r(x,y,w,28,paper);for(let k=0;k<w*3;k++)r(x+rand()*(w-1),y+7+rand()*18,1,.5,'#00000009');r(x,y,w,2,'#00000022');r(x,y+5,w,2,timber);r(x,y+7,w,.5,'#00000030');r(x,y+25,w,3,timber);r(x,y+25,w,.5,'#8a6644')};
  const post=(x:number,y:number)=>{r(x,y,3,28,timber);r(x,y,1,28,'#7d5a3c');r(x+3,y,.5,28,'#00000030')};
  // Fusuma: a slim lacquered frame, cream paper flecked with gold, blue hills fading up it in dots and a spray of pine, under a lattice transom.
  const fusuma=(x:number,y:number,w:number,n:number)=>{const m=w/n;r(x,y,w,28,beam);r(x,y+1,w,4,'#cdbf9f');for(let px=x+1;px<x+w;px+=3)r(px,y+1,.5,4,timber);for(let k=0;k<n;k++){const px=x+k*m;r(px+.5,y+5.5,m-1,22,'#efe6cf');for(let f=0;f<m;f++)r(px+1+rand()*(m-2),y+6+rand()*20,.5,.5,'#c9a84a');
    for(let dx=1;dx<m-1;dx+=.5){const hill=y+20+Math.round(3*Math.sin((dx+px)/5)+1.5*Math.sin((dx+px)/2.1));for(let py=hill;py<y+27.5;py+=.5)if(py>hill+2||(dx*2+py*2)%2===0)r(px+dx,py,.5,.5,py>y+24?'#8ba6ad':'#b6c9c8')}
    if(k%2===0)for(const [dx,dy,l] of [[3,9,5],[5,11,6],[2,12,3],[7,8,3]])r(px+dx,y+dy,l,.5,'#4f6e55');r(px+(k%2?2:m-4.5),y+14,2.5,2.5,'#b79a4e');r(px+(k%2?2.5:m-4),y+14.5,1.5,1.5,beam)}};
  const top=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#4a3a2e');r(x,y,w,.5,'#6d5642');r(x,y+h-.5,w,.5,'#2e241c')};
  // A closed closet from above: its ceiling boards in the shade. A room's depth: the shadow its walls lay along the floor's edges. Outside: pale raked gravel. Roof tiles, row on row, each its grey.
  const cap=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#352a22');for(let py=y;py<y+h;py+=9)r(x,py,w,.5,'#261e18');for(let k=0;k<h/9;k++)r(x+(k*13)%w,y+k*9,.5,9,'#261e18')};
  const room=(x:number,y:number,w:number,h:number)=>{r(x,y,3,h,'#00000018');r(x,y,1.5,h,'#00000018');r(x+w-2,y,2,h,'#0000000f');r(x,y,w,4,'#00000018');r(x,y,w,2,'#00000018')};
  const gravel=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#a29f93');for(let k=0;k<w*h/4;k++)r(x+rand()*w,y+rand()*h,1,1,['#8d8a7e','#b5b2a5','#969387','#c0bdb0'][k%4])};
  const kawara=(x:number,y:number,w:number,h:number)=>{for(let py=y;py<y+h;py++){const row=Math.floor(py/7),off=row%2?4:0,odd=py%7;for(let px=x;px<x+w;px++){const col=(px+off)%8;r(px,py,1,1,odd===6?'#3f4245':col<1?'#54585b':['#767b7f','#6c7175','#7f8488'][(Math.floor((px+off)/8)+row)%3])}}};
  // A round pool of lamplight or sun, row by row.
  const pool=(cx:number,cy:number,rx:number,ry:number,color='#fff1c408')=>{for(let k=0;k<3;k++)for(let y=-ry;y<ry;y++){const w=Math.round(rx*(1-k*.25)*Math.sqrt(1-y*y/(ry*ry)));r(cx-w,cy+y*(1-k*.2),w*2,1,color)}};
  const pane=([x,y,w,h]:readonly number[])=>{r(x,y,w,h,'#b7dcea');r(x,y+h-1,w,1,'#e6f2f0');for(let k=0;k<=4;k++)r(Math.min(x+k*w/4,x+w-1),y,1,h,timber)};
  // A window in the bottom wall, and its sun on the floor with the shadow of its bars.
  const low=(window:readonly number[])=>{pane(window);const [x,y,w]=window;r(x+3,y-30,w-6,30,'#fff3cc1c');for(let k=1;k<4;k++)r(x+3+k*(w-6)/4,y-30,1,30,'#00000012');r(x+3,y-15,w-6,1,'#00000012')};
  const sill=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,timber);h>w?r(x+w/2-.25,y,.5,h,'#2e241c'):r(x,y+h/2-.25,w,.5,'#2e241c')};
  const cushion=(x:number,y:number,color:string,light:string)=>{r(x-1,y-1,1.5,1.5,'#d9b44a');r(x+11.5,y-1,1.5,1.5,'#d9b44a');r(x-1,y+11.5,1.5,1.5,'#d9b44a');r(x+11.5,y+11.5,1.5,1.5,'#d9b44a');r(x,y,12,12,color);r(x+1,y+1,10,10,light);r(x+2,y+2,8,8,color);r(x+5,y+5,2,2,'#e8c440');shadow(x,y+12,12,1)};
  const {dot,pot,bend,terracotta,indigo,glazed,palm,fern,orchid,bonsai}=potPlants(r);
  const lantern=(x:number,y:number)=>{r(x,y+14,12,2,beam);r(x+1,y,10,14,'#f6e3b0');r(x+3,y+2,6,10,'#fff6d6');for(const k of [0,5.5,11])r(x+k,y-1,1,15,beam);r(x,y-1,12,1,beam);r(x,y+6,12,.5,beam)};
  // A bed against a wall, head to the north: frame, pillow, the sheet turned down over its quilt, a pattern repeated across.
  const bed=(x:number,quilt:string,turn:string,mark:(x:number,y:number)=>void)=>{r(x,196,30,60,timber);r(x+1,197,28,57,'#f4f2e8');r(x+4,199,22,10,'#ffffff');r(x+4,208,22,1,'#d8d8cc');r(x+1,214,28,40,quilt);r(x+1,214,28,3,turn);for(let y=220;y<252;y+=6)for(let px=x+3+((y/6|0)%2?3:0);px<x+25;px+=6)mark(px,y);r(x,254,30,2,'#3b2a1e');shadow(x,256,30,3)};
  const slippers=(x:number,y:number,c:string)=>{for(const k of [0,6]){r(x+k,y,5,8,c);r(x+k,y,5,3,'#ffffff30')}};
  // Downstairs.
  const down=mapCanvas(scene,'map-kyoto-house',480,340);g=down.context;
  gravel(0,0,480,340);
  wood(18,74,172,50);wood(84,124,53,6);wood(30,124,40,34);wood(137,124,53,34);wood(18,158,60,76);
  // The genkan: washed pebbles set in mortar, a stepping stone at the door, under the timber step.
  r(18,238,60,85,'#8d8b82');for(let k=0;k<520;k++)r(18+rand()*59,238+rand()*84,1,1,['#7a786f','#a3a196','#6d6b63','#b5b2a4'][k%4]);r(36,302,24,16,'#a9a79c');r(36,302,24,1,'#c4c2b6');r(36,316,24,2,'#6d6b63');
  r(18,232,60,6,timber);r(18,232,60,1,'#94704a');r(18,237,60,1,'#2e241c');shadow(18,238,60,3);
  tatami(84,158,106,165,3);tatami(196,158,120,165,3);wood(322,158,90,165);wood(412,158,58,36);
  tiles(418,228,50,34,'#dfe1da','#cbcdc5');tiles(418,296,50,27,'#dfe1da','#cbcdc5');
  tiles(326,74,104,50,'#a9c1c8','#90aab2',6);tiles(378,124,26,34,'#a9c1c8','#90aab2',6);
  for(let y=74;y<124;y++){gravel(320,y,bathLeft(y)-320,1);gravel(bathRight(y),y,110,1)}
  for(let y=158;y<194;y++)gravel(washRight(y),y,480-washRight(y),1);
  for(const [x,y,w,h] of [[18,74,172,50],[18,158,60,76],[84,158,106,165],[196,158,120,165],[322,158,42,42],[370,158,42,165],[418,228,50,34],[418,296,50,27]] as const)room(x,y,w,h);
  // The door sills: from the kitchen to 和室A, 和室A to 和室B, 和室B to the foot of the stairs, from there to the washroom, the toilets'.
  sill(137,156,53,2);sill(190,282,6,41);sill(316,282,6,41);r(364,286,6,34,'#a3703f');r(412,232,6,26,'#dfe1da');r(412,298,6,22,'#dfe1da');
  // The back walls. The kitchen's plaster behind its tiles, the hall's either side of its doorway, the fine fusuma between the kitchen and 和室A (a sheet of paper thick, behind the sofas), 和室B's closet and tokonoma, the lobby's and the washroom's, the toilets' above their wainscot.
  face(18,46,172);face(18,130,12);face(70,130,8);face(322,130,56);face(404,130,26);face(418,200,50,'#eaf0ee');face(418,268,50,'#eaf0ee');
  for(let y=130;y<158;y++)r(430,y,washRight(y)-430,1,y>=155?timber:y>=135&&y<137?timber:'#ebe2cd');
  for(const y of [212,280]){r(418,y,50,16,'#a78457');for(let x=418;x<468;x+=5)r(x,y,.5,16,'#7f5f3c');r(418,y,50,1,timber)}
  for(const x of [326,375,404])post(x>326?x:322,130);
  fusuma(84,130,53,2);r(84,128,53,2,beam);fusuma(196,130,66,2);
  // The doorway in those fusuma, drawn back: its frame, and the panels' edge at its side.
  r(137,130,53,5,'#cdbf9f');for(let x=138;x<190;x+=3)r(x,131,.5,4,timber);r(137,128,53,2,beam);r(137,135,53,1,beam);r(137,135,1.5,23,beam);r(188.5,135,1.5,23,beam);
  // The tokonoma: its natural post, the alcove's shade, a hanging scroll of ink mountains, the raised board with an incense burner, the ikebana.
  r(262,130,54,28,'#d8ccb0');r(262,130,54,5,'#b9ab8d');r(262,134,54,1.5,timber);r(262,130,3.5,28,'#6f4a2a');r(263,130,1,28,'#9a7044');r(264,140,1,3,'#3b2a1e');r(292,134,1.5,24,timber);
  r(271,135,14,19,'#a98e62');r(272,137,12,15,'#f4efe2');r(271,134,14,1.5,beam);r(271,154,14,1.5,beam);for(const [x,y,w,c] of [[273,146,10,'#b8bcb6'],[274,144,4,'#7d8280'],[278,142,3,'#4f5452'],[277,143,5,'#7d8280'],[273,148,10,'#8d9290'],[279,140,1,'#b5453a']] as const)r(x,y,w,x===279?1:2,c);
  r(266,152,26,6,'#3b2a1e');r(266,152,26,1.5,'#7a5636');r(275,149,5,3,'#6d6b63');r(276,148,3,1,'#a3a196');r(300,148,8,9,'#2f4a4a');r(301,149,6,1,'#5f8585');r(303,138,1,11,'#487951');r(301,134,1,10,'#487951');r(306,136,1,12,'#568a57');r(299,134,5,4,'#c9533e');r(305,133,4,4,'#e8c440');r(303,131,3,3,'#f2efe2');
  // The bath's door and the hall's doorway in the back wall.
  for(const [x,w] of [[377,27],[29,41]] as const){r(x,130,w,1.5,timber);r(x,130,1.5,28,timber);r(x+w-1.5,130,1.5,28,timber)}
  // A noren across the hall's doorway, indigo, its slits, the owl of the street's door.
  r(31,132,37,11,'#2f4a6e');for(const x of [43,55])r(x,132,.5,11,'#1f3350');r(31,132,37,1,'#1f3350');r(46,134,6,6,'#efe6cf');r(47,135,1.5,1.5,'#2f4a6e');r(49.5,135,1.5,1.5,'#2f4a6e');r(48.5,137,1,1,'#b79a4e');
  // The kitchen: hand-made tiles behind the counter, a shelf of jars, ladles on a rail, the fridge in its corner with a note on it; on the counter the sink and its tap, a dish rack, a board and knife, the hob and its red kettle, the rice cooker; cupboard doors below; a rag rug before them, a pendant's light.
  for(let y=50;y<70;y+=4)for(let x=40;x<190;x+=4)r(x,y,4,4,['#dfe8e4','#d2dfdc','#e8eeea','#c6d6d4','#dbe5e0'][Math.floor(rand()*5)]);for(let y=50;y<70;y+=4)r(40,y,150,.5,'#b7c4c0');for(let x=40;x<190;x+=4)r(x,50,.5,20,'#b7c4c0');
  r(100,55,64,1.5,timber);for(const [x,h,c] of [[104,7,'#c9a84a'],[110,6,'#8a5a3c'],[116,8,'#4f6e55'],[124,6,'#efe6cf'],[130,7,'#b66c51'],[140,5,'#efe6cf'],[147,7,'#4f6e55']] as const){r(x,55-h,5,h,c);r(x+1,55-h,1,h,'#ffffff30')}
  r(44,56,40,1,'#8a8f90');for(const [x,l] of [[48,8],[56,7],[64,9],[74,7]] as const){r(x,56,1.5,l,'#7d8486');r(x-1,56+l,3.5,2,'#7d8486')}
  r(18,46,22,48,'#e5e9ea');r(18,46,22,1,'#ffffff');r(18,64,22,.5,'#b8bec2');r(20,68,1,10,'#9aa0a4');r(20,54,1,6,'#9aa0a4');r(27,50,8,6,'#f2cf7c');r(30,49,2,1,'#c9533e');r(25,72,5,4,'#a7c4b0');shadow(18,94,22,3);
  r(40,70,150,12,'#c9b48c');r(40,70,150,1,'#efe4c8');r(40,82,150,10,'#7d5a3c');r(40,82,150,1,'#2e241c');for(let x=40;x<190;x+=25){r(x,83,.5,9,'#2e241c');r(x+22,86,1,3,'#c9a84a')}r(40,92,150,1,'#4a3a2e');shadow(40,93,150,3);
  r(68,72,30,9,'#8d979b');r(70,74,26,6,'#bfcdd1');r(84,65,2,8,'#8d979b');r(84,65,6,1.5,'#8d979b');r(100,71,18,8,'#c7cfd1');for(let x=102;x<116;x+=3)r(x,69,1,8,'#fbfbf6');r(120,74,12,6,'#d9b98a');r(122,75,7,.5,'#9a7a50');r(136,72,30,9,'#2f3438');for(const x of [138,152])r(x,73.5,12,6,'#4a5058'),r(x+3,75,6,3,'#2f3438');r(154,66,9,8,'#c9533e');r(155,66,7,1.5,'#e27a62');r(156,63,5,3.5,'#3b2a1e');r(170,70,14,11,'#e9e4d8');r(170,70,14,2,'#fbfbf6');r(175,74,4,3,'#2f3438');
  r(60,100,86,14,'#5f7f9a');for(let x=60;x<146;x+=6)r(x,100,3,14,['#7f9cb4','#c9b48c','#a85a4a','#efe6cf'][(x/6|0)%4]);for(const y of [99,114])r(60,y,86,1,'#efe6cf');
  // The hall: a pendant's light, the mat at the step, the shoe cabinet with a plant on it; the umbrella stand, shoes on the pebbles.
  pool(48,190,30,26);r(26,224,44,7,'#6f8291');r(28,226,40,3,'#8ea2b2');r(18,246,13,56,timber);r(18,246,13,2,'#94704a');r(31,246,.5,56,'#2e241c');for(const y of [264,283])r(18,y,13,.5,'#2e241c');for(const y of [254,272,292])r(26,y,3,1,'#c9a84a');shadow(18,302,13,3);orchid(20,232);
  r(38,296,5,9,'#3b4541');r(44,297,5,9,'#3b4541');r(55,282,5,9,'#c9533e');r(61,283,5,9,'#c9533e');r(66,300,9,12,'#6d7b86');r(67,300,7,2,'#2f3438');r(69,290,1,11,'#2f4a6e');r(72,292,1,9,'#a85a4a');
  // 和室A: a rug on the mats, the two sofas in their corner against the fine fusuma and the left wall, the TV on its board against the right wall, seen edge on, a fern at its foot, a palm and a paper lamp in the corners.
  for(const [x,y,w,h,c] of [[120,190,36,62,'#8a4b3e'],[122,192,32,58,'#c9a06a'],[125,195,26,52,'#8a4b3e'],[127,197,22,48,'#d9c29a']] as const)r(x,y,w,h,c);for(let y=200;y<243;y+=6)r(131,y,14,1.5,'#8a4b3e');
  r(84,146,53,37,'#3f5d6e');r(84,146,53,2,'#5b7a8c');r(89,159,44,20,'#7b9db0');r(89,159,44,1,'#a4c2d0');r(111,159,.5,20,'#5b7a8c');r(84,179,53,4,'#2f4552');r(84,150,5,33,'#4a6878');r(133,150,4,33,'#4a6878');r(95,150,14,9,'#d9b44a');r(114,151,13,8,'#c9533e');r(97,152,10,1,'#efd98a');
  r(84,179,33,77,'#3f5d6e');r(84,179,8,77,'#5b7a8c');r(92,183,21,67,'#7b9db0');r(92,183,1,67,'#a4c2d0');r(92,217,21,.5,'#5b7a8c');r(113,183,4,73,'#2f4552');r(84,250,33,6,'#2f4552');r(84,250,33,1,'#5b7a8c');r(96,224,11,12,'#e0b0a8');r(98,226,7,8,'#efc8c0');shadow(84,256,33,3);
  r(158,195,32,61,'#5a3d29');r(158,195,32,2,'#7f5a3e');r(158,254,32,2,'#2e241c');for(const y of [215,235])r(158,y,.5,20,'#2e241c');for(const y of [205,225,245])r(159.5,y,1,3,'#c9a84a');shadow(158,256,32,3);
  r(176,214,8,24,'#2f3438');r(170,199,6,52,'#23272a');r(170,199,1.5,52,'#3e5664');r(171.5,212,1,4,'#6a8ca0');shadow(165,200,5,50);fern(177,236);
  palm(176,300);lantern(90,296);pool(96,306,26,18);
  // 和室B: the low table, its tea set on a tray, four cushions; a paper lamp in the corner.
  r(226,216,60,4,'#00000020');r(232,216,48,26,'#4f3220');r(233,217,46,1.5,'#7a5636');for(let y=221;y<241;y+=4)r(234,y,44,.5,'#3f2718');r(232,242,48,4,'#2e241c');shadow(232,246,48,3);
  r(244,222,24,14,'#2f3438');r(245,223,22,12,'#3e4448');r(249,225,8,6,'#b66c51');r(249,225,8,1.5,'#d08a68');r(257,226,2,1.5,'#b66c51');r(247,223,5,1,'#f2efe2');for(const x of [260,263])r(x,227,2.5,3,'#efe6cf');
  cushion(250,204,'#6e3b57','#8d5574');cushion(250,250,'#6e3b57','#8d5574');cushion(218,224,'#6e3b57','#8d5574');cushion(282,224,'#6e3b57','#8d5574');lantern(302,160);pool(300,178,26,18);
  // The bath: its deep tub rimmed in cypress, a stool and pail on the tiles. The lobby: the washing machine, a basket. The vanity under its mirror, a towel on its rail, a mat.
  r(354,92,36,18,'#c79a5e');r(356,94,32,14,'#8fc8dc');r(358,96,20,1,'#c3e8ee');r(366,101,12,1,'#c3e8ee');r(354,110,36,4,'#a67c47');for(let x=358;x<390;x+=5)r(x,110,.5,4,'#7f5a30');shadow(354,114,36);r(394,114,10,7,'#c79a5e');r(395,115,8,3,'#8fc8dc');r(342,116,8,4,'#d9b98a');
  r(324,146,38,30,'#f0f0ea');r(324,146,38,1,'#ffffff');r(328,150,30,16,'#c9cdd0');r(331,152,24,12,'#a9c6c6');r(337,154,12,8,'#7fa8ac');r(324,172,38,4,'#c8ccce');shadow(324,176,38);r(349,136,10,10,'#d9b98a');r(350,136,8,1,'#a67c47');
  r(410,134,22,13,'#b79a6c');r(411,135,20,11,'#cfe6ee');r(413,136,6,1,'#ffffff');r(421,139,6,1,'#ffffff');r(406,148,30,24,'#efe4c8');r(406,148,30,1,'#ffffff');r(411,150,20,11,'#f8f8f2');r(413,152,16,7,'#cfe1e6');r(420,147,2,5,'#9aa0a4');r(406,162,30,10,'#7d5a3c');r(406,162,30,.5,'#2e241c');r(421,162,.5,10,'#2e241c');shadow(406,172,30);
  r(378,206,26,14,'#7f9cb4');r(380,208,22,10,'#a4bccc');r(370,250,8,20,'#d9b98a');r(371,250,6,3,'#efe6cf');
  // The stairs climbing north, darker as they rise under the floor above, each tread's nosing lit, a stringer down each side, the rail along the wall; a mat at their foot.
  for(let k=0;k<9;k++){const y=206+k*8.2;r(322,y,42,8.2,['#5f4128','#684830','#724f34','#7c5638','#865e3d','#8f6541','#996d46','#a2754b','#ab7d50'][k]);r(322,y,42,1,'#d0a678');r(322,y+6.5,42,1.7,'#00000038');r(337,y+2,12,1,'#ffffff0c')}
  r(322,206,3,74,beam);r(361,206,3,74,beam);r(326,206,1.5,74,'#9a7044');r(330,288,28,16,'#5f7f9a');r(332,290,24,12,'#8ea2b2');r(334,292,20,8,'#7f9cb4');
  // The toilets: a tank against the wall, the bowl, the paper, slippers, a sprig on a shelf.
  r(438,224,16,8,'#f2f2ec');r(438,224,16,1,'#ffffff');r(439,232,14,14,'#f2f2ec');r(441,234,10,10,'#cfe1e6');shadow(439,246,14);r(456,234,6,5,'#f2f2ec');r(456,234,6,1,'#c9cdd0');r(421,206,12,1.5,timber);r(424,201,5,5,'#8a5a3c');r(425,198,3,4,'#487951');slippers(424,246,'#3f6e48');
  r(462,296,6,22,'#f2f2ec');r(462,296,6,1,'#ffffff');r(449,300,13,14,'#f2f2ec');r(451,302,10,10,'#cfe1e6');shadow(449,316,19);r(452,274,12,1.5,timber);r(455,269,5,5,'#8a5a3c');slippers(424,304,'#a85a4a');
  // The walls from above, over everything, then the slanted ones row by row; the closets behind 和室B, their ceiling boards; the sliding front door in the bottom wall.
  cap(196,46,120,78);top(12,40,184,6);top(12,40,6,289);top(12,323,462,6);top(190,40,6,90);top(196,40,126,6);top(316,40,6,84);top(196,124,126,6);top(12,124,18,6);top(70,124,14,6);top(322,124,56,6);top(404,124,26,6);top(78,130,6,199);top(190,130,6,152);top(316,130,6,152);
  top(322,200,48,6);top(364,200,6,86);top(364,320,6,9);top(412,194,62,6);top(412,194,6,38);top(412,258,6,40);top(412,262,62,6);top(412,320,6,9);top(468,190,6,139);
  for(let y=74;y<124;y++){r(bathLeft(y)-5,y,5,1,'#4a3a2e');r(bathRight(y),y,5,1,'#4a3a2e')}r(360,70,12,4,'#4a3a2e');
  for(let y=124;y<190;y++)r(washRight(y),y,6,1,'#4a3a2e');
  // The plot round the bath: a stone lantern, moss, ferns; a stone at each corner.
  for(const [x,y,w,h] of [[440,86,22,14],[444,82,14,6],[334,84,14,10],[446,134,18,8]] as const)softCrown(r,rand,x+w/2,y+h/2,w/2,h/2,['#3a5f3c','#4f7a48','#6d9a5a','#8fb56c']);r(462,62,8,6,'#8d8a7e');r(464,68,4,14,'#7a786f');r(460,82,12,3,'#6d6b63');r(463,55,6,7,'#6d6b63');
  r(30,323,36,6,beam);r(32,324,15,4,'#e6dcc2');r(49,324,15,4,'#e6dcc2');r(47,323,2,6,beam);for(const x of [36,41,53,59])r(x,324,.5,4,timber);
  for(const window of kyotoWindows['kyoto-house'])low(window);
  down.refresh();
  // Upstairs.
  const up=mapCanvas(scene,'map-kyoto-upstairs',480,340);g=up.context;
  gravel(0,0,480,340);
  // Over the rooms below, the ground floor's grey tiled roof: south under the windows, east round the balcony, along its slanted corner; its eaves, their gutter.
  kawara(6,268,414,46);for(let y=108;y<268;y++){const right=Math.min(474,washRight(y)+6);if(right>414)kawara(414,y,right-414,1)}kawara(414,268,60,46);r(6,312,468,2,'#5d6062');r(6,314,468,2,'#00000030');
  wood(18,74,78,34);tatami(18,108,78,154,2);r(18,108,78,1.5,timber);room(18,74,78,188);wood(102,74,262,34);wood(322,108,42,42);sill(96,78,6,26);for(const [x,w] of [[157,26],[257,26]] as const)wood(x,108,w,34);
  for(const [x,w] of [[124,93],[223,93]] as const){wood(x,142,w,22);tatami(x,164,w,98,2);r(x,164,w,1.5,timber);room(x,142,w,120)}room(102,74,262,34);
  for(let y=74;y<82;y++)gravel(landingRight(y),y,8,1);
  // The balcony: grey boards open to the sky.
  for(let x=370;x<410;x++){const y=balconyTop(x);r(x,y,1,262-y,'#8f928d')}for(let x=370;x<410;x+=7)r(x,balconyTop(x),.5,262-balconyTop(x),'#74766f');for(let y=103;y<262;y+=46)r(370,y,40,.5,'#74766f');
  r(364,118,6,28,'#8f928d');
  // The back walls: 和室E's and the corridor's, with a print and a shelf, the two bedrooms' either side of their doorways, each doorway's frame and a noren of its own; the corridor's window and its light.
  face(18,46,304);for(const x of [18,62,138,178,226,275,319])post(x,46);for(const [x,w] of [[124,33],[183,34],[223,34],[283,33]] as const)face(x,114,w);for(const x of [124,214,223,313])post(x,114);
  {const [x,y,w,h]=kyotoWindows['kyoto-upstairs'][0];r(x-1,y-1,w+2,h+2,timber);pane([x,y,w,h]);for(let k=x;k<x+w;k+=3)r(k,y+h-6,1,6,timber);r(x,y+h-6,w,1,timber);r(x+4,y+1,12,3,'#ffffff40');pool(206,88,40,13,'#fff3cc10')}
  r(130,52,16,15,'#3b2a1e');r(131,53,14,13,'#f0e8d4');r(133,57,10,5,'#5f7f9a');r(136,55,4,3,'#c9533e');r(133,60,10,2,'#3f6e48');
  r(244,58,24,2,timber);r(246,50,5,8,'#b66c51');r(254,52,4,6,'#efe6cf');r(260,48,5,10,'#487951');shadow(244,60,24,1);
  for(const [x,c,dot] of [[156,'#2f4a6e','#8ea2b2'],[256,'#8a3f33','#d99a84']] as const){const w=27;r(x,114,w,1.5,timber);r(x,114,1.5,28,timber);r(x+w-1.5,114,1.5,28,timber);r(x+1.5,115.5,w-3,10,c);r(x+13,115.5,.5,10,'#00000040');for(const dx of [6,19])r(x+dx,119,2.5,2.5,dot)}
  // A long runner down the corridor, a plant at the top of the stairs.
  r(112,84,194,14,'#2f4a6e');r(114,86,190,10,'#a4bccc');r(115,87,188,8,'#2f4a6e');for(let x=120;x<300;x+=12)r(x,90,4,2,'#d9c29a');for(let y=85;y<97;y+=2)for(const x of [109,306])r(x,y,3,1,'#d9c29a');
  for(const [y,c] of [[64,'#e6dcc2'],[70,'#7f9cb4'],[76,'#efe6cf'],[82,'#a85a4a'],[88,'#e6dcc2']] as const){r(24,y,32,6,c);r(24,y,32,1,'#ffffff40');r(24,y+5,32,1,'#00000020')}shadow(24,94,32);fern(308,60);
  // The three bedrooms: each its bed against a wall, head to the north, its own quilt; a paper lamp on a stand. 和室E: spare futons on its boards, the old chest; 和室D: the traveller's suitcase; 和室C: a low desk and cushion, books.
  bed(24,'#3f5a46','#c7d6b8',(x,y)=>{r(x+1,y+1,4,.5,'#c7d6b8');r(x+1,y+3,4,.5,'#c7d6b8');r(x+1,y+1,.5,3,'#c7d6b8');r(x+4.5,y+1,.5,3,'#c7d6b8')});bed(180,'#2f4a6e','#efe6cf',(x,y)=>{r(x,y+2,4,.5,'#6d8fa8');r(x+.5,y+1,3,.5,'#6d8fa8');r(x+1,y,2,.5,'#6d8fa8')});bed(280,'#8a3f33','#efe6cf',(x,y)=>{r(x+1,y,2,2,'#d99a84');r(x+1.75,y+.75,.5,.5,'#efe6cf')});
  for(const x of [58,160,262]){r(x,200,14,14,timber);r(x,200,14,1,'#94704a');r(x,207,14,.5,'#2e241c');shadow(x,214,14);lantern(x+1,190);pool(x+7,222,24,16)}
  r(84,222,12,34,timber);r(84,222,12,2,'#94704a');for(const y of [233,244]){r(84,y,12,.5,'#2e241c');r(87,y-6,6,2,'#23272a')}shadow(84,256,12,3);
  r(126,146,18,18,'#a85a4a');r(126,146,18,2,'#c9794e');r(126,154,18,1,'#7a3e22');r(133,142,4,4,beam);for(const x of [129,140])r(x,146,1,18,'#c9a84a');shadow(126,164,18);
  r(225,142,24,15,'#6f4a2a');r(225,142,24,1.5,'#94704a');r(225,157,24,3,'#3b2a1e');r(228,145,9,6,'#f4efe2');r(232,145,.5,6,'#b8b2a6');r(241,145,4,6,'#2f4a6e');shadow(225,160,24);cushion(231,168,'#2f4a6e','#4f6e8c');
  r(292,144,22,14,timber);r(292,144,22,1,'#94704a');for(let x=294;x<312;x+=3)r(x,146,2,10,['#a85a4a','#3f5a7a','#c9a84a','#3f5a46'][(x/3|0)%4]);shadow(292,158,22);
  // The stairs going down south, darker as they sink, the stringers and rail.
  for(let k=0;k<9;k++){const y=150+k*9;r(322,y,42,9,['#ab7d50','#a2754b','#996d46','#8f6541','#865e3d','#7c5638','#724f34','#684830','#5f4128'][k]);r(322,y,42,1,'#d0a678');r(322,y+7,42,2,'#00000038')}r(322,150,3,82,beam);r(361,150,3,82,beam);r(326,150,1.5,82,'#9a7044');
  // The walls from above, the closets' ceiling boards between them; the balcony's rail and slats, the laundry on its pole, pots, its door.
  cap(102,114,16,148);cap(322,232,42,30);top(12,40,310,6);top(12,40,6,228);top(12,262,358,6);top(96,40,6,38);top(96,104,6,164);top(118,108,6,160);top(102,108,55,6);top(183,108,74,6);top(283,108,39,6);top(217,108,6,160);top(316,108,6,160);top(322,232,42,4);top(364,82,6,36);top(364,146,6,122);
  for(let y=40;y<82;y++)r(landingRight(y),y,6,1,'#4a3a2e');
  for(let x=370;x<414;x++)r(x,balconyTop(x)-3,1,3,'#6d6f6a');r(410,100,4,162,'#6d6f6a');r(370,259,44,3,'#6d6f6a');for(let y=106;y<259;y+=6)r(411,y,3,.5,'#3f413d');
  bonsai(374,240);fern(396,244,'#9cc47a');palm(375,104);r(388,104,2,130,'#c9cdd0');for(const [y,h,c] of [[132,20,'#efe6cf'],[156,14,'#7f9cb4'],[176,24,'#fbfbf6'],[204,16,'#a85a4a']] as const){r(380,y,18,h,c);r(380,y,18,1,'#ffffff40');r(380,y+h,18,1,'#00000024');r(388,y,2,1,'#3b2a1e')}
  r(365,119,4,26,'#bcd6de');r(365,119,4,1,timber);r(365,131,4,1,timber);r(365,144,4,1,timber);
  for(const window of kyotoWindows['kyoto-upstairs'].slice(1))low(window);
  up.refresh();
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
/** A pigeon facing right, 10 × 8 art px, its feet on the bottom row: standing, its head forward in mid-step, pecking, and in the air with its wings up and down (`pigeon-<frame>`). */
/** The Kyoto lane's cat, 36 × 20 art px, its shadow on the line y 15: asleep (two breaths), head up or sitting, its eyes to the left, to the right or shut, its tail down or flicked up. Shown by cat.ts. */
function makeCat(scene:Phaser.Scene){
  const orange='#d9974e',stripe='#b87232',light='#eab778';
  const frame=(key:string,draw:(r:(x:number,y:number,w:number,h:number,c:string)=>void)=>void)=>{const texture=mapCanvas(scene,`cat-${key}`,36,20),g=texture.context;draw((x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)});texture.refresh()};
  const head=(r:(x:number,y:number,w:number,h:number,c:string)=>void,x:number,y:number,eyes:string)=>{r(x,y,6,6,orange);r(x,y-1,1.5,2,stripe);r(x+4.5,y-1,1.5,2,stripe);r(x+2,y+4,2,1,'#fbfbf6');
    if(eyes==='shut'){r(x+1,y+2,1.5,.5,'#5a3a1e');r(x+3.5,y+2,1.5,.5,'#5a3a1e')}else{const dx=eyes==='l'?.5:2;r(x+dx,y+2,1,1,'#2a211b');r(x+dx+2.5,y+2,1,1,'#2a211b')}};
  const lying=(r:(x:number,y:number,w:number,h:number,c:string)=>void,sink:number,y:number,eyes:string,tail:number)=>{
    r(11,15,17,1,'#00000035');r(12,10+sink,14,5-sink,orange);r(14,9+sink,9,1,light);r(12,10+sink,14,1,light);for(const x of [15,19])r(x,11+sink,2,4-sink,stripe);
    if(tail){r(4,10,1.5,3,stripe);r(4,12.5,8,1.5,stripe)}else r(4,13,8,1.5,stripe);head(r,y>6?21:22,y,eyes)};
  frame('sleep-0',r=>lying(r,0,9,'shut',0));frame('sleep-1',r=>lying(r,.5,9,'shut',0));
  for(const eyes of ['l','r','shut'])for(const tail of [0,1]){
    frame(`up-${eyes}-${tail}`,r=>lying(r,0,5,eyes,tail));
    frame(`sit-${eyes}-${tail}`,r=>{r(14,15,17,1,'#00000035');for(const [y,from] of [[7,23],[8,21.5],[9,20.5],[10,19.5],[11,19],[12,18.5],[13,18.5],[14,19]] as const){r(from,y,28-from,1,orange);r(from,y,1,1,light)}for(const [x,y] of [[21.5,10],[24,9]] as const)r(x,y,1.5,4.5,stripe);r(23,5,6,10,orange);r(27,13,3,2,light);if(tail){r(12,10,1.5,4,stripe);r(12,13,7,1.5,stripe)}else r(11,13.5,8,1.5,stripe);head(r,24,1,eyes)});
  }
}

function makePigeons(scene:Phaser.Scene){
  for(const frame of ['stand','step','peck','up','down']){
    const t=mapCanvas(scene,`pigeon-${frame}`,10,8),g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},air=frame==='up'||frame==='down',lift=air?2:0;
    r(2,7,6,1,'#00000025');if(!air)r(4,6,2,1,'#c8604a');
    const bx=2,by=3-lift;r(bx,by+1,5,2.5,'#8f969a');r(bx-1,by+2,2,1,'#6f767a');
    if(frame==='peck'){r(bx+5,by+2,2,2,'#7d8a84');r(bx+6.5,by+3,1,1,'#e8853a');r(bx+1,by+.5,3,1,'#8f969a')}
    else{const head=frame==='step'?.5:0;r(bx+3.5+head,by-.5,2,2,'#7d8a84');r(bx+5+head,by+.5,1,1,'#e8853a')}
    if(frame==='up')r(bx,by-2,3,3,'#b0b6ba');else if(frame==='down')r(bx,by+2,3,3,'#b0b6ba');else r(bx+1,by+1.5,2.5,1,'#b0b6ba');
    t.refresh();
  }
}
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
/** The bins (`bin-street`, in a station or before it, foot centred; `bin-home`, a little one with a pedal), silhouettes `binShape`. */
export const binShape={'bin-street':[16,24],'bin-home':[11,15]} as const;
function makeBins(scene:Phaser.Scene){
  const t=mapCanvas(scene,'bin-street',16,24),g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(1,23,15,1,'#00000030');r(1,3,14,20,'#6f7f78');r(1,3,1,20,'#8c9c94');r(14,3,1,20,'#56655e');r(0,0,16,4,'#55655e');r(0,0,16,1,'#a4b4ac');r(4,1.5,8,1.5,'#14181a');
  r(3,7,10,9,'#e8e4d4');r(3,7,10,2,'#2f7ab0');for(const x of [5,9])r(x,11,2,4,'#2f7ab0');r(1,20,14,1,'#46544e');t.refresh();
  const h=mapCanvas(scene,'bin-home',11,15),c=h.context,q=(x:number,y:number,w:number,z:number,k:string)=>{c.fillStyle=k;c.fillRect(x,y,w,z)};
  q(1,14,10,1,'#00000030');q(1,3,9,11,'#e8e6dc');q(1,3,1,11,'#fbfaf2');q(9,3,1,11,'#b8b6aa');q(0,1,11,3,'#c9c7bb');q(0,1,11,1,'#f2f0e6');q(4,12,3,2,'#6f7572');h.refresh();
}
/** The top band's layout in art px (the band is 480 × 35, shown at 2×): the clock's card, the needs' inset (icon rows at `needRows`, bars from `needBar`), the purse's card and the three paper buttons. */
export const hudLayout={clock:[4,2,62,27],needs:[70,2,72,27],needRows:[6,17],needBar:86,purse:[146,2,82,27],buttons:[[252,3,70,25],[328,3,70,25],[404,3,70,25]]} as const;
export interface HudFacts {day:string;time:string;coins:number;yen:number;heavy:boolean;hover:number}
/** Paints the top band, in the pause menu's journal look: a dusk-blue strip with a gold rule, paper cards for the clock and purse, a dark inset for the needs' bars (drawn over it by main.ts), and paper buttons (the hovered one red). */
let cloth:HTMLCanvasElement|null=null;
/** The band's cloth, painted once: indigo with seigaiha waves woven in a shade lighter, deepening towards the foot, a paler selvedge along the top,
 * then a red and gold braid over a dark shadow along the bottom, little gold knots spaced along it. */
function hudCloth(){
  if(cloth)return cloth;
  const c=document.createElement('canvas');c.width=480;c.height=35;const g=c.getContext('2d')!,r=(x:number,y:number,w:number,h:number,k:string)=>{g.fillStyle=k;g.fillRect(x,y,w,h)},bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const R=12,rows=Math.ceil(30/(R/2))+2;
  for(let y=0;y<30;y++)for(let x=0;x<480;x++){
    // The wave whose fan lies on top here: the lowest row whose circle holds the pixel (rows overlap, each drawn over the one above).
    let ring=-1;for(let j=rows;j>=0&&ring<0;j--){const cy=j*R/2-2,cx0=(j&1)*R;if(y>cy)continue;const i=Math.round((x-cx0)/(2*R)),d=Math.hypot(x-(cx0+i*2*R),y-cy);if(d<R)ring=Math.floor(d)}
    const deep=bayer[(y&3)*4+(x&3)]<Math.floor(y/30*10);
    r(x,y,1,1,ring===R-1?'#3d4078':ring===R-4||ring===R-7?(deep?'#2c2e5e':'#32356c'):deep?'#1c1a3c':'#23264f');
  }
  r(0,0,480,1,'#3d4078');
  r(0,30,480,1,'#7a2a22');r(0,31,480,1,'#c0463a');r(0,32,480,1,'#e2a050');r(0,33,480,2,'#0b0a16');
  for(let x=12;x<480;x+=24){r(x-1,30,3,3,'#e2a050');r(x,31,1,1,'#f6dfa0')}
  return cloth=c;
}
let hudPainted='';
export function paintHud(scene:Phaser.Scene,facts:HudFacts){
  // Repainted only when something it shows has changed (the texture stays across places).
  const sign=JSON.stringify(facts);if(sign===hudPainted&&scene.textures.exists('hud-band'))return;hudPainted=sign;
  const t=(scene.textures.exists('hud-band')?scene.textures.get('hud-band'):mapCanvas(scene,'hud-band',480,35)) as Phaser.Textures.CanvasTexture,g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const ink='#3a2a20',paper='#efe3c2',edge='#5a3f2c',rule='#d6c49a',red='#c0463a',faint='#8a7558',bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  g.clearRect(0,0,480,35);g.textAlign='left';
  g.imageSmoothingEnabled=false;g.drawImage(hudCloth(),0,0);
  const card=([x,y,w,h]:readonly number[],fill=paper,line=edge)=>{r(x+1,y+1,w,h,'#0b0a16');r(x,y,w,h,line);r(x+1,y+1,w-2,h-2,fill)};
  {const [x,y,w,h]=hudLayout.clock;card(hudLayout.clock);r(x+2,y+2,w-4,1,rule);letter(g,x+5,y+3,facts.day,faint);letter(g,x+5,y+12,facts.time,ink,true);r(x+w-8,y+h-8,4,4,red);r(x+w-7,y+h-7,2,2,'#e2553f')}
  {card(hudLayout.needs,'#14132a','#3a3466');for(const ry of hudLayout.needRows){r(hudLayout.needBar-1,ry+1,54,6,'#3a3466');r(hudLayout.needBar,ry+2,52,4,'#0b0a16')}}
  {const [x,y]=hudLayout.purse;card(hudLayout.purse);
    // A ¥100 coin, then their count.
    r(x+5,y+4,5,7,'#a8a8a0');r(x+4,y+5,7,5,'#a8a8a0');r(x+5,y+5,5,5,'#d8d8cc');r(x+6,y+6,2,2,'#f4f4ea');
    letter(g,x+14,y+5,`${facts.coins} coins${facts.heavy?' · heavy':''}`,facts.heavy?red:faint);letter(g,x+5,y+14,`¥${facts.yen.toLocaleString('en-US')}`,ink,true)}
  const labels=[['メニュー','MENU'],['かばん','BAG'],['旅の日記','JOURNAL']];
  hudLayout.buttons.forEach(([x,y,w,h],i)=>{const on=facts.hover===i;r(x,y+2,w,h,'#0b0a16');r(x,y+1,w,h,'#7a5a40');r(x,y,w,h,on?'#7a2a22':edge);r(x+1,y+1,w-2,h-2,on?red:'#f8f0da');if(!on)r(x+1,y+h-3,w-2,2,'#e6d4a6');
    g.textAlign='center';letter(g,x+w/2,y+4,labels[i][0],on?'#f6dfa0':faint);letter(g,x+w/2,y+11,labels[i][1],on?'#fff6e0':ink,true);g.textAlign='left'});
  t.refresh();
}
/** The HUD's two icons, 8 × 8: an onigiri for hunger, a drop for thirst. */
function makeNeedIcons(scene:Phaser.Scene){
  const icon=(key:string,rows:string[],ink:Record<string,string>)=>{const t=scene.textures.createCanvas(key,8,8)!;rows.forEach((row,y)=>[...row].forEach((c,x)=>{if(ink[c]){t.context.fillStyle=ink[c];t.context.fillRect(x,y,1,1)}}));t.refresh()};
  icon('need-hunger',['...ww...','..wwww..','..wwww..','.wwwwww.','.wwwwww.','wwnnnnww','wwnnnnww','.wnnnnw.'],{w:'#f6f2e6',n:'#26342e'});
  icon('need-thirst',['...b....','...b....','..bbb...','..bbb...','.bbbbb..','.blbbb..','.bbbbb..','..bbb...'].map(row=>' '+row.slice(0,7)),{b:'#4aa8e0',l:'#d4eefa'});
}
/** The city bus at the stop, 132 × 50 art px, facing left along the near lane, so that its doors, on the left as in Japan, face us: in at the middle door (69), out at the front one, by the driver (15). `bus-<livery>-<k>`, its wheels turned as the car's (main.ts, `rollBus`), and `bus-<livery>-open`, stopped with its doors open. Kyoto's are green, the others cream and green. */
export function makeBus(scene:Phaser.Scene,livery:'kyoto'|'city'){
  if(scene.textures.exists(`bus-${livery}-open`))return;
  const [body,top,band,skirt]=livery==='kyoto'?['#a9d2a4','#c4e2bc','#2f7a55','#225c41']:['#ece6d2','#f8f4e6','#1f8a5c','#16684a'];
  for(const k of [0,1,2,3,4]){
    const open=k===4,t=mapCanvas(scene,`bus-${livery}-${open?'open':k}`,132,50),g=t.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},a=(open?0:k)*Math.PI/4;
    r(3,46,126,3,'#0000003a');
    // From above: the roof with its air conditioning units.
    r(4,0,124,8,top);r(3,2,1,6,top);r(128,2,1,6,top);r(5,7,122,1,'#00000022');for(const [x,w] of [[28,22],[80,16]] as const){r(x,1.5,w,5,'#8f979a');r(x,1.5,w,1,'#b4bbbd');for(let i=2;i<w-1;i+=3)r(x+i,3,1,3,'#6f777a')}
    // The near flank: the long window, its pillars, the amber destination strip, the coloured band and skirt, the lights.
    r(2,8,128,32,body);r(1,11,1,28,body);r(130,11,1,28,body);r(2,8,128,1,top);
    r(24,11,104,17,'#2b3a42');r(24,11,104,6,'#6f97a8');r(24,11,104,1,'#a9c8d3');for(let x=38;x<128;x+=14)if(x<61||x>77)r(x,11,1,17,'#1f2427');
    r(86,12,24,5,'#14181a');for(let x=87;x<109;x+=2)r(x,13,1,3,'#f0a030');
    r(2,29,128,4,band);r(2,33,128,7,skirt);r(2,39,128,1,'#14171a');
    r(1,12,7,18,'#7fa8b8');r(1,12,7,1,'#b8d4dc');r(3,13,1,15,'#b8d4dc');r(1,32,3,4,'#fff4c0');r(1,37,2,2,'#5b6265');r(128,29,3,6,'#c8352b');
    // The doors: two glazed leaves, folded away when open on the lit steps.
    for(const [x,w] of [[9,12],[62,14]] as const){r(x-1,10,w+2,30,'#1f2427');
      if(open){r(x,11,w,28,'#fff0c8');r(x,32,w,2,'#c9c5b5');r(x,36,w,2,'#a9a593');r(x,11,1,28,'#55798a');r(x+w-1,11,1,28,'#55798a')}
      else{r(x,11,w,28,'#6f97a8');r(x,11,w,1,'#a9c8d3');r(x+w/2-.5,11,1,28,'#1f2427');r(x+1,33,w-2,6,body)}}
    // The wheels, a bar across each hubcap.
    for(const cx of [36,104]){r(cx-9,32,19,8,'#0c0e10');for(let y=33;y<50;y++)for(let x=cx-8;x<=cx+8;x++){const d=Math.hypot(x-cx,y-41);if(d<=7.4)r(x,y,1,1,d<=1.5?'#5b6265':d<=4?'#9aa0a4':'#14171a')}
      for(let y=37;y<46;y+=.5)for(let x=cx-4;x<cx+5;x+=.5){const dx=x+.25-cx-.5,dy=y+.25-41.5;if(Math.hypot(Math.floor(x)-cx,Math.floor(y)-41)<=3.6&&Math.abs(dx*Math.sin(a)-dy*Math.cos(a))<=.55)r(x,y,.5,.5,'#4a5155')}}
    t.refresh();
  }
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
/** A train (makeTrain): `cars` cars of `car` art px with doors at `doors` along each, standing at the platform with its first car's start at `origin`,
 * off the left edge, so that its doors line up with the marks on the platform (doorMarks) and it runs past both ends. */
export const trainLayout=(service:Service)=>service==='shinkansen'?{car:160,doors:[24,136],cars:16,origin:-400}:{car:120,doors:[30,90],cars:12,origin:-240};
/** Where a standing train's doors are along the platform, left to right (art px): the 乗車位置 marks the queues form at. */
export const doorMarks=(service:Service)=>{const {car,doors,cars,origin}=trainLayout(service);return Array.from({length:cars},(_,c)=>doors.map(d=>origin+c*car+d)).flat().filter(x=>x>=10&&x<=platformWidth-10)};
/** A Shinkansen's car numbers run from 1 at its front, the end it leaves by (`dir`, as runOf gives it): the car whose doors are at x (art px, doorMarks). Cars 1 to 3 are non-reserved (自由席),
 * 8 to 10 the Green Car; `reservedCars` are the ordinary reserved cars standing along the platform, the ones a machine books a seat in. */
export const carAt=(x:number,dir:number)=>{const {car,cars,origin}=trainLayout('shinkansen'),c=Math.floor((x-origin)/car);return dir>0?cars-c:c+1};
export const reservedCars=(dir:number)=>[...new Set(doorMarks('shinkansen').map(x=>carAt(x,dir)))].filter(n=>n>3&&(n<8||n>10)).sort((a,b)=>a-b);
/** A train's picture in the three-quarter view, art px: its roof, `trainRoof` deep, over the side facing us, as tall as the rest of `trainHeight`; the doors are `doorSize` wide. */
export const trainHeight=54,trainRoof=16,doorSize=12;
/** Where a train's picture starts (art px, top), track by track: the far one's side stands at the platform's edge, its doors facing us; the near one's roof bites a little into the edge,
 * up to the white line, its side facing us the one away from the platform, so that it hides nobody but the feet of those right at the edge. */
export const trainTop=[32,228] as const;
/** A train in `color` (its line's) in the three-quarter view, the same on either track: grey cars with their roof units, windows and the line's stripe,
 * or the Shinkansen's white cars with a long nose at each end. main.ts opens the doors over the picture. */
export function makeTrain(scene:Phaser.Scene,key:string,color:string,service:Service){
  const {car,doors,cars}=trainLayout(service),w=car*cars,h=trainHeight,top=trainRoof,texture=scene.textures.createCanvas(key,w,h)!,g=texture.context,shinkansen=service==='shinkansen';
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  const glass=(x:number,y:number,w:number,h:number)=>{r(x,y,w,h,'#2f3f49');r(x,y,w,1,'#1f2a31');r(x+1,y+1,Math.min(3,w-1),h-2,'#587078')};
  for(let c=0;c<cars;c++){
    const x=c*car;
    if(shinkansen){
      r(x,0,car,top,'#d9dbd4');r(x,0,car,1,'#b9bcb4');r(x+8,4,car-16,7,'#c6c9c1');r(x,top-1,car,1,'#f8f8f2');r(x,top,car,h-top,'#f1f2ec');r(x,h-12,car,4,color);r(x,h-8,car,1,'#bfc2ba');r(x,h-3,car,3,'#9aa29a');
      for(let k=x+36;k<x+car-36;k+=7)r(k,top+12,5,9,'#2f3f49');
    }else{
      r(x,0,car,top,'#aeb2ab');r(x,0,car,1,'#7d8279');r(x,top-2,car,2,'#8c918a');r(x+8,3,car-16,8,'#9aa29a');r(x+car/2-13,2,26,10,'#7d8279');for(let k=x+car/2-11;k<x+car/2+12;k+=3)r(k,3,1,8,'#5e6660');
      r(x,top,car,h-top,'#d3d6d0');r(x,top,car,1,'#eceee8');r(x,top+29,car,3,color);r(x,h-5,car,2,'#7d8279');r(x,h-3,car,3,'#3d4846');
      for(const [from,to] of [[6,doors[0]-8],[doors[0]+8,doors[1]-8],[doors[1]+8,car-6]])for(let k=x+from;k+16<=x+to;k+=19)glass(k,top+8,16,14);
    }
    r(x+car-1,0,2,h,'#2b3431');
    for(const d of doors){const l=x+d-doorSize/2,y=top+3;r(l-1,y-1,doorSize+2,h-top-3,'#7d8279');r(l,y,doorSize,h-top-5,shinkansen?'#e6e8e2':'#e0e2dc');r(l+doorSize/2,y,1,h-top-5,'#7d8279');for(const k of [l+1,l+7])glass(k,y+3,4,11)}
  }
  if(shinkansen)for(let k=0;k<44;k++){
    const inset=Math.min(h-16,Math.round((44-k)**2/64)),under=Math.round((44-k)**2/640);
    for(const x of [k,w-1-k]){g.clearRect(x,0,1,inset);g.clearRect(x,h-under,1,under);if(k<36&&k>18)r(x,inset+top*.3,1,6,'#2f3f49')}
  }else for(const x of [0,w-14]){r(x,0,14,top,'#8c918a');glass(x+2,top+7,10,16)}
  texture.refresh();
}
/** The station sign (駅名標) in the middle of the platform, posts included (art px): drawn by makePlatform on its own texture, sorted with the people at its posts' feet. */
export const stationSign={x:platformWidth/2-74,y:128,w:148,h:60};
/** The route map board (路線図) standing on the platform, right of the station sign (art px; its foot at y + 12, its face `h` tall): each face shows the line as seen from the track on that side. */
export const routeBoard={x:platformWidth/2+120,y:152,w:60,h:36};
/** The departure gantries (art px, `x` the left of their boards, `foot` where their post stands): one by each stairwell, its two boards one over the other, a track's each, `y` the top of the upper one. */
export const platformBoards=[180,platformWidth-180].map(cx=>({x:cx-42,y:66,foot:141}));
/** A gantry's picture (makeBoard), art px: its boards `boardHeight` tall each with their arrow, the post down to the foot. */
export const boardHeight=25,gantryHeight=platformBoards[0].foot-platformBoards[0].y;
/** A departure gantry, 84 art px wide: the post, then two boards each with its track's number and an arrow to that track, up for the far one, down for the near one; the departures are the scene's text.
 * At twice the art's density, like the maps, for the numbers' lettering. */
export function makeBoard(scene:Phaser.Scene,key:string,tracks:[number,number]){
  const texture=mapCanvas(scene,key,84,gantryHeight),g=texture.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(40,0,4,gantryHeight,'#7d8279');r(40,0,1,gantryHeight,'#9aa29a');r(38,gantryHeight-3,8,3,'#59625e');
  tracks.forEach((track,k)=>{
    const a=(k?0:7)+k*boardHeight;
    r(0,a,84,18,'#59625e');r(1,a+1,82,16,'#1b1f1e');r(3,a+3,12,12,'#ffffff');g.textAlign='center';letter(g,9,a+4,String(track),'#1d2622',true);
    for(let j=0;j<6;j++)r(42-j,k?a+24-j:j+1,1+2*j,1,'#f2c230');
  });
  texture.refresh();
}
/** An island platform in the three-quarter view, `platformWidth` long, its floor 88–232 between its two tracks: the far one with the wall beyond it, the near one below the platform's
 * own side (232–246), its rails further from the edge than the far one's as a train there shows its roof from the edge on (trainTop). Each edge with its white line
 * and yellow tactile strip, the 乗車位置 marks where the doors stop (doorMarks: a lane either side of each door, x ±6–20, 98–125 and 196–223), a stairwell down at each end (0–80 and 880–960 × 128–192, open towards the middle), the station
 * sign in the middle (駅名標: the station, the stops either side on `color`, its line's, and their English; 406–554 × 128–188 with its posts) and the route map, each on its own texture, sorted with the people.
 * In art px; main.ts (solids, hotspots, queues) relies on these. */
export function makePlatform(scene:Phaser.Scene,key:string,o:{ja:string;en:string;tracks:[number,number];color:string;prev:string;next:string;prevEn:string;nextEn:string;service:Service;dirs?:[number,number]}){
  const W=platformWidth,texture=mapCanvas(scene,key,W,320),g=texture.context;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},t=(x:number,y:number,text:string,c:string,big=false)=>letter(g,x,y,text,c,big);
  const dither=(x:number,y:number,w:number,h:number,c:string)=>{for(let j=0;j<h;j++)for(let i=(j+x+y)%2;i<w;i+=2)r(x+i,y+j,1,1,c)};
  // The wall beyond the far track, its pillars and posters, its foot in shadow.
  r(0,0,W,50,'#7d8783');r(0,0,W,2,'#59625e');r(0,46,W,4,'#59625e');for(let x=0;x<W;x+=48)r(x,0,3,46,'#6c7773');
  ['#efe6c8','#c9dfe6','#f0cfc4','#d3e3bd'].forEach((paper,k)=>{for(let x=24+k*120;x<W;x+=480){r(x-1,23,62,20,'#46524f');r(x,24,60,18,paper);r(x+5,28,24,2,'#59625e');r(x+5,32,34,1,'#8d8a7a');r(x+5,35,28,1,'#8d8a7a');r(x+44,27,11,12,['#d07a5a','#5b8fa8','#c95f6e','#7fa35b'][k])}});
  // The tracks: ballast, sleepers, the two rails, a train's foot apart (trainTop).
  for(const [top,bottom,rail] of [[50,88,71],[246,292,266]]){r(0,top,W,bottom-top,'#6f6a5f');dither(0,top,W,bottom-top,'#5e5a50');for(let x=0;x<W;x+=8)r(x,rail-2,4,18,'#4a4038');for(const y of [rail+1,rail+12]){r(0,y,W,1,'#b8bcb4');r(0,y+1,W,1,'#2b3431')}}
  // The cable trough along the foot of the platform's side.
  r(0,249,W,7,'#8d8a7a');r(0,249,W,1,'#a39f8d');for(let x=0;x<W;x+=14)r(x,250,1,6,'#6f6b5e');
  // Beyond the near track, a low wall seen from above, its fence's posts.
  r(0,292,W,28,'#59625e');r(0,292,W,3,'#8d8a7a');r(0,295,W,2,'#46524f');for(let x=4;x<W;x+=24)r(x,297,2,23,'#46524f');
  // The platform's own side, facing the near track, its coping's shadow and the dark recess under it.
  r(0,232,W,14,'#a39f8d');r(0,232,W,1,'#efeee4');r(0,240,W,6,'#3d4846');for(let x=20;x<W;x+=80)r(x,240,6,6,'#8d8a7a');
  // The floor, its edges (white line, then the yellow tactile strip) and the door marks behind them.
  r(0,88,W,144,'#cfcab4');for(let y=88;y<232;y+=16)for(let x=0;x<W;x+=16){r(x,y,16,1,'#c2bda6');r(x,y,1,16,'#c2bda6')}
  r(0,86,W,2,'#8d8a7a');r(0,88,W,3,'#efeee4');r(0,229,W,3,'#efeee4');
  for(const y of [94,223]){r(0,y,W,3,'#e8c440');for(let x=1;x<W;x+=3)r(x,y+1,1,1,'#cfa72c')}
  // At each door, as on Japanese platforms, two lanes running back from the edge either side of it (the queues' two lines, main.ts slot: door ±13, three rows), the middle kept clear
  // for those getting off; a pale green, quiet beside the tactile strip and clear of the yellow highlights. In each lane a pair of footprints per row, toes to the track.
  for(const x of doorMarks(o.service))for(const top of [true,false]){
    for(const dx of [-20,-6,5,19])r(x+dx,top?98:196,1,27,'#8fc078');
    for(const row of [0,1,2])for(const lane of [-15,10]){const y=top?99+row*9:217-row*9;for(const foot of [0,3]){r(x+lane+foot,top?y:y+2,2,3,'#8fc078');r(x+lane+foot,top?y+4:y,2,1,'#8fc078')}}
    // On a Shinkansen platform, the car's number between the lanes, by the edge, as the train standing on that track will have it (carAt).
    if(o.dirs){g.textAlign='center';t(x,top?100:216,String(carAt(x,o.dirs[top?0:1])),'#41613b');g.textAlign='left'}
  }
  // A stairwell at each end, seen from the side like the rest: the steps drop away towards the end along the far wall, which rises behind them with its handrail; the near parapet stands in front of their foot, the yellow sign on the far one.
  for(const left of [true,false]){
    const mouth=left?80:W-80;
    r(left?0:mouth,128,80,64,'#59625e');
    for(let k=0;k<16;k++){
      const x=left?mouth-5-k*5:mouth+k*5,top=130+k*3;
      r(x,128,5,top-128,['#a8adb6','#9da2ab','#9297a0','#878c95','#7c818a','#71767f','#666b74','#5b6069'][k>>1]);r(x,128,5,1,'#59625e');
      r(x,top,5,190-top,['#c8c4c4','#bbb7b7','#aeaaaa','#a19d9e','#949091','#878385','#7a7679','#6d696d'][k>>1]);r(x,top,5,1,'#ecebee');r(left?x+4:x,top,1,190-top,'#59625e');
      r(x,top-10,5,1,'#e6e8e2');r(x,top-9,5,1,'#59625e');if(k%4===1)r(x+2,top-9,1,9,'#7d8279');
    }
    r(left?0:mouth-2,114,82,14,'#b9bcb4');r(left?0:mouth-2,114,82,3,'#e6e8e2');r(left?0:mouth-2,127,82,1,'#7d8279');
    r(left?0:mouth-2,184,82,14,'#b9bcb4');r(left?0:mouth-2,184,82,3,'#e6e8e2');r(left?0:mouth-2,197,82,2,'#a8a48f');r(left?0:W-3,114,3,84,'#9aa29a');
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
  // The route map (路線図), a board on two legs read from either side (routeBoard), on its own texture (`<key>-route`) like the station sign; its feet's shadow on the floor.
  r(routeBoard.x+2,routeBoard.y+10,routeBoard.w,3,'#bdb8a3');
  {const {w,h}=routeBoard,board=mapCanvas(scene,key+'-route',w,h),g=board.context,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(5,26,3,10,'#7d8279');r(w-8,26,3,10,'#7d8279');r(0,0,w,26,'#283e40');r(2,2,w-4,22,'#efeee4');r(4,17,w-8,1,o.color);for(let k=6;k<w-4;k+=8)r(k,15,2,5,o.color);g.textAlign='center';letter(g,w/2,4,'路線図','#1d2622');g.textAlign='left';board.refresh()}
  // The gantries' feet (platformBoards; the gantries themselves are sorted with the people, drawn by makeBoard).
  for(const {x,foot} of platformBoards)r(x+38,foot-1,12,2,'#bdb8a3');
  texture.refresh();
}
