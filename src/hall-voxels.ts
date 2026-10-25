import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { renderWallFareMap } from './tokyo-fares';
import { hasShinkansen, routes, stations, type Hub } from './network';
import { looks, type Figure, type Look } from './people';
import { C, accents, anchors, backZ, centralGates, centralL, eastX, facadeD, facadeTop, floorY, frontZ, fromConcourse, gateZ, housings, machineW, officeL, officeZ, paintPerson, paintPoster, recessBottom, recessTop, shopDoor, shopL, shopR, transferGates, transferR, wallL, wallR, westX, type HallDevice } from './hall-scene';

type Block=[number,number,number,number,number,number,string];
// The hall's own units and layout (hall-scene.ts); here y is given as there, down from the ceiling, and z out of the wall.
const eyeY=-1120,payTop=recessTop+180,unit=new THREE.BoxGeometry(1,1,1);
const font='10px "Yorimichi Bitmap"';
const shade=(hex:string,k:number)=>'#'+new THREE.Color(hex).multiplyScalar(k).getHexString();
// Signs too narrow for the hall's full titles.
const signs:Record<string,[string,string]>={local:['きっぷ','Tickets'],charge:['チャージ','IC Charge'],shinkansen:['新幹線','Shinkansen']};
/** A line of the bitmap font on a small canvas, to be raised into voxels. */
function glyphs(text:string){const c=document.createElement('canvas'),g=c.getContext('2d')!;g.font=font;c.width=Math.max(1,Math.ceil(g.measureText(text).width));c.height=12;g.font=font;g.textBaseline='top';g.fillStyle='#fff';g.fillText(text,0,0);return c}
/** A painter drawn at full size, then sampled down without smoothing so each voxel is one of its pixels. */
function painted(w:number,h:number,down:number,paint:(g:CanvasRenderingContext2D,w:number,h:number)=>void){
  const full=document.createElement('canvas');full.width=w;full.height=h;paint(full.getContext('2d')!,w,h);if(down===1)return full;
  const small=document.createElement('canvas');small.width=Math.round(w/down);small.height=Math.round(h/down);const g=small.getContext('2d')!;g.imageSmoothingEnabled=false;g.drawImage(full,0,0,small.width,small.height);return small;
}

/** Boxes gathered into one instanced mesh of unit cubes, each scaled and coloured, its shade jittered a little so neighbouring voxels read apart. */
class Blocks {
  list:Block[]=[];
  add(x0:number,x1:number,y0:number,y1:number,z0:number,z1:number,color:string){this.list.push([x0,x1,y0,y1,z0,z1,color]);return this}
  /** A canvas raised into voxels, `size` units each, `depth` deep from z (or from z(row), for a sloping face); runs of one colour merged. */
  image(canvas:HTMLCanvasElement,x0:number,y0:number,size:number,z:number|((row:number)=>number),depth:number,color?:string){
    const {width:w,height:h}=canvas,data=canvas.getContext('2d')!.getImageData(0,0,w,h).data,rgb=(i:number)=>`rgb(${data[i]},${data[i+1]},${data[i+2]})`;
    for(let y=0;y<h;y++){
      const zr=typeof z==='number'?z:z(y);
      for(let x=0;x<w;){
        const i=(y*w+x)*4;if(data[i+3]<128){x++;continue}
        let e=x+1;while(e<w&&data[(y*w+e)*4+3]>=128&&(color||rgb((y*w+e)*4)===rgb(i)))e++;
        this.add(x0+x*size,x0+e*size,y0+y*size,y0+(y+1)*size,zr,zr+depth,color??rgb(i));x=e;
      }
    }
    return this;
  }
  /** Bitmap lettering as raised voxels, one per lit pixel of the 10 px font. */
  text(text:string,x:number,cy:number,z:number,size:number,color:string,depth=size,align:'left'|'center'|'right'='center'){
    const c=glyphs(text),w=c.width*size;return this.image(c,align==='center'?x-w/2:align==='right'?x-w:x,cy-5*size,size,z,depth,color);
  }
  mesh(material:THREE.Material,jitter=.05,shadows=true){
    const mesh=new THREE.InstancedMesh(unit,material,Math.max(1,this.list.length)),m=new THREE.Matrix4(),c=new THREE.Color();
    let seed=this.list.length*7919+17;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647;
    this.list.forEach(([x0,x1,y0,y1,z0,z1,color],i)=>{m.makeScale(Math.abs(x1-x0)||1,Math.abs(y1-y0)||1,Math.abs(z1-z0)||1);m.setPosition((x0+x1)/2,-(y0+y1)/2,(z0+z1)/2);mesh.setMatrixAt(i,m);mesh.setColorAt(i,c.set(color).offsetHSL(0,0,(rand()-.5)*jitter))});
    if(!this.list.length)mesh.count=0;
    mesh.castShadow=mesh.receiveShadow=shadows;mesh.computeBoundingSphere();return mesh;
  }
}

/** A commuter carved from their sprite sheet: a voxel stands where both the front (or back) and the profile show something, coloured by the view that faces out there. Feet at the origin, facing +z. */
function personBlocks(look:Look,step:number){
  const c=document.createElement('canvas');c.width=160;c.height=48;const g=c.getContext('2d')!;paintPerson(g,look);const data=g.getImageData(0,0,160,48).data;
  const px=(frame:number,x:number,y:number)=>{if(x<0||x>19||y<0||y>47)return null;const i=(y*160+frame*20+x)*4;return data[i+3]>0?`rgb(${data[i]},${data[i+1]},${data[i+2]})`:null};
  const [front,back,left,right]=[step,2+step,4+step,6+step];
  // The right profile is seen from the commuter's right (world -x), forward to its right; the left one mirrors it.
  const filled=(i:number,j:number,d:number)=>!!(px(front,i,j)||px(back,19-i,j))&&!!(px(right,d,j)||px(left,19-d,j));
  const s=16*(look.height??1),blocks=new Blocks();
  for(let j=0;j<48;j++)for(let i=0;i<20;i++)for(let d=0;d<20;d++){
    if(!filled(i,j,d))continue;
    if(filled(i-1,j,d)&&filled(i+1,j,d)&&filled(i,j-1,d)&&filled(i,j+1,d)&&filled(i,j,d-1)&&filled(i,j,d+1))continue;
    const side=i<10?px(right,d,j)??px(left,19-d,j):px(left,19-d,j)??px(right,d,j);
    const color=!filled(i,j,d+1)?px(front,i,j)??side:!filled(i,j,d-1)?px(back,19-i,j)??side:side;
    blocks.add((i-10)*s,(i-9)*s,-(48-j)*s,-(47-j)*s,(d-10)*s,(d-9)*s,color??look.coat);
  }
  return blocks;
}

/** The ticket hall built of voxels, lit and shadowed, with the first-person camera of HallScene: same interface, so MachineHall drives either. */
export class HallVoxels {
  private renderer:THREE.WebGLRenderer|null=null;
  // The Tokyo fare map stays the crisp SVG, behind a hole in the WebGL image as in HallScene.
  private css=new CSS3DRenderer();
  private cssScene=new THREE.Scene();
  private scene=new THREE.Scene();
  private camera=new THREE.PerspectiveCamera(26,1.5,10,12000);
  private material=new THREE.MeshLambertMaterial();
  private hole=new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:0,blending:THREE.NoBlending,fog:false});
  private raycaster=new THREE.Raycaster();
  private resize=new ResizeObserver(()=>this.fit());
  // What a click can hit (machines and the Tokyo map) and the rims that light up around them.
  private pickable:THREE.Object3D[]=[];
  private rims=new Map<string,THREE.InstancedMesh>();
  private hovered:string|null=null;
  private near:string|null=null;
  // Each commuter standing and in mid-step.
  private crowd:THREE.InstancedMesh[][]=[];
  private shinkansen:boolean;
  private xAnchors:number[][];
  private disposed=false;
  constructor(private host:HTMLElement,private hub:Hub,devices:HallDevice[],private figures:()=>Figure[]=()=>[]){
    this.shinkansen=hasShinkansen(hub);this.xAnchors=anchors(this.shinkansen);
    try{this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'})}
    catch{const message=document.createElement('p');message.className='hall-no-webgl';message.textContent='WebGL is unavailable: use the buttons below to choose a machine.';host.append(message);return}
    this.css.domElement.className='hall-css3d';host.append(this.css.domElement);
    this.renderer.setPixelRatio(1);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;host.append(this.renderer.domElement);
    this.camera.rotation.order='YXZ';this.scene.background=new THREE.Color(C.haze);this.scene.fog=new THREE.Fog(C.haze,3600,9000);
    // Warm light from the ceiling and the front left, so every voxel face has its own shade and the bank throws soft shadows.
    this.scene.add(new THREE.HemisphereLight('#fff6e4','#7d8a6c',1.25));
    const sun=new THREE.DirectionalLight('#fffaf0',1.5);sun.position.set(400,1600,3400);sun.target.position.set(1900,-floorY,300);this.scene.add(sun,sun.target);
    sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);Object.assign(sun.shadow.camera,{left:-5200,right:5200,top:4000,bottom:-4000,near:100,far:9000});sun.shadow.bias=-.0005;sun.shadow.normalBias=6;
    const statics=new Blocks();
    this.buildRoom(statics);this.buildConcourse(statics);this.buildBoard(statics);this.buildBank(statics,devices);
    this.scene.add(statics.mesh(this.material));
    this.crowd=looks.map(look=>[0,1].map(step=>{const mesh=personBlocks(look,step).mesh(this.material,.02);mesh.visible=false;this.scene.add(mesh);return mesh}));
    this.resize.observe(host);this.fit();
  }
  private buildRoom(b:Blocks){
    // Tiles 300 × 176 standing proud of their grout; set-back walls a little darker, behind the office and shop and at the back of the gate openings.
    const tiles=(x0:number,x1:number,z:number,k:number)=>{
      b.add(x0,x1,0,floorY,z-40,z-6,shade(C.grout,k));
      for(let x=x0;x<x1;x+=300)for(let y=0;y<floorY;y+=176)b.add(x+5,Math.min(x+295,x1),y+5,Math.min(y+171,floorY),z-6,z,shade(C.tile,k));
    };
    const sideWall=(x:number)=>b.add(x-20,x+20,0,floorY,backZ,officeZ,shade(C.tile,.75));
    tiles(wallL,wallR,0,1);tiles(westX,centralL,officeZ,.88);tiles(centralL,wallL,backZ,.82);sideWall(centralL);
    if(this.shinkansen){tiles(wallR,transferR,backZ,.82);sideWall(transferR);tiles(transferR,eastX,officeZ,.88)}else tiles(wallR,eastX,officeZ,.88);
    // Floor in 240-unit checks; the yellow tactile strip along the machines, its studs in rows.
    for(let x=westX;x<eastX;x+=240)for(let z=backZ;z<frontZ;z+=240)b.add(x,x+240,floorY,floorY+30,z,z+240,((x-westX+z-backZ)/240&1)?C.floorB:C.floorA);
    b.add(wallL+300,wallR-300,floorY-4,floorY,528,592,'#e8c440');
    for(let x=wallL+316;x<wallR-300;x+=32)for(const z of [536,560,584])b.add(x-6,x+6,floorY-12,floorY-4,z-6,z+6,'#d9b02c');
    // Square tiled pillars: at both ends of the machine wall, out in the concourse (the exit pillars among them), behind the gates.
    const exits=[fromConcourse(this.xAnchors,254,380),fromConcourse(this.xAnchors,690,380)],exitZ=exits[0].z;
    for(const [x,z] of [[wallL,0],[wallR,0],...exits.map(p=>[p.x,p.z]),[-5100,exitZ],[8900,exitZ],[-1840,-2100],...(this.shinkansen?[[5720,-2100]]:[])]){
      b.add(x-146,x+146,0,floorY,z-146,z+146,C.grout);
      for(let y=0;y<floorY-110;y+=176)b.add(x-150,x+150,y+5,Math.min(y+171,floorY-110),z-150,z+150,C.tile);
      b.add(x-158,x+158,floorY-110,floorY,z-158,z+158,C.steel);
    }
    // The yellow exit signs wrapped round the two pillars beside the bank.
    exits.forEach(({x,z},i)=>{
      const west=i===0;b.add(x-160,x+160,752,1008,z-160,z+160,'#f2c230');b.add(x-161,x+161,990,1008,z-161,z+161,'#c9a020');
      b.add(x-60,x+60,770,890,z+160,z+164,'#1d2622').text('出',x,830,z+164,10,'#f2c230',4);
      b.text(west?'← 西口':'東口 →',x,925,z+160,6,'#1d2622',6).text(west?'West Exit':'East Exit',x,968,z+160,4,'#1d2622',4);
    });
  }
  /** A sign hung from the ceiling on two rods: pictogram square, Japanese over English, all in raised voxels. */
  private hanging(b:Blocks,x:number,z:number,top:number,w:number,h:number,o:{ja:string;en:string;mark:string;markBg:string;markInk?:string;arrow?:boolean}){
    const l=x-w/2,s=h-60;
    b.add(l,x+w/2,top,top+h,z-12,z+12,C.signBoard);b.add(l,x+w/2,top+h-8,top+h,z-13,z+13,'#77817c');
    for(const dx of [-w*.35,w*.35])b.add(x+dx-6,x+dx+6,0,top,z-6,z+6,C.steel);
    let tx=l+30;if(o.arrow){b.text('←',tx,top+h/2,z+12,s/10,'#ffffff',8,'left');tx+=s+20}
    b.add(tx,tx+s,top+30,top+30+s,z+12,z+18,o.markBg).text(o.mark,tx+s/2,top+30+s/2,z+18,s/12,o.markInk??'#1d2622',6);
    b.text(o.ja,tx+s+30,top+h*.38,z+12,h*.034,'#ffffff',8,'left').text(o.en,tx+s+30,top+h*.78,z+12,h*.02,'#d7ddd6',6,'left');
  }
  private buildConcourse(b:Blocks){
    // Light-box posters, a voxel per pixel of their picture.
    // Their lettering uses the bundled Japanese font: they are built once it is ready.
    const posters:[number,number,'kamakura'|'nikko'|'arashiyama'][]=[[-280,0,'kamakura'],[4080,0,'nikko'],[9300,officeZ,'arashiyama']];
    for(const [x,z] of posters)b.add(x-300,x+300,590,1430,z,z+24,C.steel);
    const pictures=()=>{if(this.disposed)return;const p=new Blocks();for(const [x,z,place] of posters)p.image(painted(140,200,1,(g,w,h)=>paintPoster(g,w,h,place)),x-280,610,4,z+24,4);this.scene.add(p.mesh(this.material))};
    document.fonts?document.fonts.load('16px "Yorimichi JP"').then(pictures,pictures):pictures();
    // Automatic gates: grey cabinets with a blue stripe and a dark top, the green go arrow on their ends, a blue IC reader.
    for(const x of [...centralGates,...(this.shinkansen?transferGates:[])]){
      const z0=gateZ-350,z1=gateZ+350,top=floorY-480;
      b.add(x-55,x+55,top,floorY-10,z0,z1,C.gate).add(x-55,x+55,floorY-10,floorY,z0,z1,'#9aa29a').add(x-57,x+57,top-12,top,z0-4,z1+4,C.gateTop);
      b.add(x-56,x+56,top+40,top+52,z0,z1,'#3a78c2').add(x-40,x+40,top+60,top+110,z1,z1+4,'#1d2622').text('↑',x,top+85,z1+4,4,'#57c26a',4);
      b.add(x-40,x+40,top-20,top-12,gateZ+185,gateZ+295,'#5aa9d8');
    }
    this.hanging(b,-1840,gateZ,420,1500,220,{ja:'中央改札',en:'Central Gate',mark:'改',markBg:'#f2c230'});
    this.hanging(b,-3600,300,560,1300,200,{ja:'みどりの窓口',en:'JR Ticket Office',mark:'み',markBg:'#2c8a4a',markInk:'#fff',arrow:true});
    this.hanging(b,1900,900,200,1500,200,{ja:'きっぷうりば',en:'Tickets',mark:'券',markBg:'#fff'});
    if(this.shinkansen)this.hanging(b,5720,gateZ,420,1100,200,{ja:'新幹線のりかえ',en:'Shinkansen Transfer',mark:'新',markBg:'#2a5ea8',markInk:'#fff'});
    else this.shop(b);
    this.office(b);
  }
  /** The みどりの窓口 front: green band, glazed bays with a clerk at each counter, the door in the first bay. */
  private office(b:Blocks){
    const z=officeZ;
    b.add(officeL,centralL,300,540,z,z+30,'#2c8a4a').add(officeL,centralL,300,312,z+30,z+32,'#7fc495').text('みどりの窓口',officeL+80,410,z+30,13,'#ffffff',8,'left').text('JR Ticket Office',officeL+80,505,z+30,5,'#d6efd9',6,'left');
    b.add(officeL,centralL,540,576,z,z+40,'#3b4541').add(officeL,centralL,1602,floorY,z,z+40,'#3b4541');
    for(let i=0,x=officeL;x<centralL;i++,x+=450){
      if(i===0){b.add(x,x+450,576,1602,z-60,z,'#4c5f5c');continue}
      b.add(x,x+450,576,1200,z,z+6,'#9fc3c2').add(x+60,x+300,640,700,z+6,z+8,'#c3dddb');
      const cx=x+225;b.add(cx-54,cx+54,1116,1200,z+6,z+40,'#2f4f7a').add(cx-30,cx+30,1050,1116,z+6,z+40,'#e9c4a0').add(cx-32,cx+32,1040,1066,z+6,z+42,'#2b2420');
      b.add(x,x+450,1200,1248,z,z+70,'#d9d3bf').add(x,x+450,1248,1602,z,z+40,'#c3c8b8').text(String(i),cx,1340,z+40,6,'#283e40',4);
    }
    for(let x=officeL;x<=centralL;x+=450)b.add(x-9,x+9,576,1602,z,z+18,'#8f9e8b');
  }
  /** The NewDays front where a station has no Shinkansen: white band with its stripes, the drinks fridge, shelves, the till, the automatic door. */
  private shop(b:Blocks){
    const z=officeZ,dw=540;
    b.add(shopL,shopR,300,540,z,z+30,'#fbfbf6').add(shopL,shopR,480,504,z+30,z+32,'#3c9a5c').add(shopL,shopR,504,522,z+30,z+32,'#e8853a');
    b.text('New',shopL+80,400,z+30,13,'#d2402e',8,'left').text('Days',shopL+80+glyphs('New').width*13,400,z+30,13,'#2f8a4a',8,'left');
    b.add(shopL,shopR,540,576,z,z+40,'#3b4541').add(shopL,shopR,1602,floorY,z,z+40,'#3b4541').add(shopL,shopR,576,1602,z-4,z,'#9fc3c2');
    const fx=shopL+48;b.add(fx,fx+576,624,1580,z-80,z-4,'#dfe9ec');
    for(let k=0;k<6;k++){const y=648+k*144;for(let i=0;i<12;i++)b.add(fx+24+i*48,fx+54+i*48,y,y+96,z-60,z-30,['#d2402e','#3c9a5c','#e8c440','#3a78c2','#f4f4ee','#e8853a'][(i+k)%6]);b.add(fx,fx+576,y+102,y+114,z-80,z-10,'#9aa29a')}
    for(let k=0;k<5;k++){const y=696+k*156,sx=shopL+684;b.add(sx,sx+540,y+84,y+102,z-80,z-10,'#7d8a84');for(let i=0;i<11;i++)b.add(sx+12+i*48,sx+48+i*48,y+24+(i%2)*12,y+84,z-60,z-30,['#e9a6ad','#f2c230','#86a367','#f4f4ee','#b66c51'][(i*3+k)%5])}
    const tx=shopL+1284,ty=1200;b.add(tx,tx+132,ty-96,ty,z-70,z-20,'#3c9a5c').add(tx+30,tx+102,ty-174,ty-96,z-70,z-20,'#e9c4a0').add(tx+28,tx+104,ty-186,ty-150,z-72,z-18,'#2b2420');
    b.add(tx-48,tx+336,ty,ty+60,z-60,z+10,'#efe9d4').add(tx-48,tx+336,ty+60,1602,z-60,z,'#d9d3bf');
    b.add(shopDoor-dw/2,shopDoor+dw/2,576,floorY,z,z+6,'#4c5f5c').add(shopDoor-9,shopDoor+9,576,floorY,z+6,z+16,'#8f9e8b').text('自動ドア',shopDoor,940,z+6,6,'#e7f1e4',4);
    for(const x of [shopL,shopL+636,shopL+1236,shopL+1620,shopDoor-dw/2,shopDoor+dw/2])b.add(x-9,x+9,576,1602,z,z+18,'#8f9e8b');
  }
  /** The station's name over the fare map: Tokyo's is the SVG (through a hole), the others list their routes with the station in red. */
  private buildBoard(b:Blocks){
    const cx=1950,top=220,bw=1216,bh=684,border=18,station=stations[this.hub],l=cx-bw/2,r=cx+bw/2,t=top+border;
    b.add(cx-430,cx+430,50,190,0,14,C.ink).add(cx-430,cx+430,176,190,14,16,station.accent).text(`${station.ja}  ${station.en.toUpperCase()}`,cx,115,14,9,'#fffef2',8);
    const frame=new Blocks().add(l-border,r+border,top,t+bh+border,0,14,C.frame).mesh(this.material);this.scene.add(frame);
    if(this.hub==='tokyo'){
      const holder=document.createElement('div');holder.className='hall-board';holder.style.width='1387px';holder.style.height='780px';
      const svg=renderWallFareMap(station.ja);svg.setAttribute('width','1387');svg.setAttribute('height','780');holder.append(svg);
      const board=new CSS3DObject(holder);board.scale.setScalar(.877);board.position.set(cx,-(t+bh/2),14.5);this.cssScene.add(board);
      const hole=new THREE.Mesh(new THREE.PlaneGeometry(bw,bh),this.hole);hole.position.copy(board.position);this.scene.add(hole);
      frame.userData.device=hole.userData.device='map';this.pickable.push(frame,hole);this.rim('map',l-border,r+border,top,t+bh+border,16);
    }else{
      b.add(l,r,t,t+bh,14,18,'#fffef2').text(`${station.ja}駅 のりば案内`,r-40,t+60,18,6,'#2d563e',4,'right');
      routes.filter(route=>route.from===this.hub).forEach((route,i)=>{
        const y=t+230+i*170;
        b.text(station.ja,l+40,y,18,8,'#d6402e',6,'left').add(l+220,l+260,y-20,y+20,18,26,'#d6402e').add(l+260,r-300,y-10,y+10,18,24,route.color).add(r-300,r-260,y-20,y+20,18,26,'#ffffff');
        b.text(route.ja,(l+r-40)/2,y-60,18,6,route.color,4).text(route.name.split(' / ')[1],r-230,y,18,8,C.ink,6,'left');
      });
    }
  }
  /** A highlight rim of white voxels just proud of the face, shown around the machine in front (tinted yellow) or the one hovered. */
  private rim(id:string,x0:number,x1:number,y0:number,y1:number,z:number){
    const t=12,mesh=new Blocks().add(x0-t,x1+t,y0-t,y0,z,z+6,'#ffffff').add(x0-t,x1+t,y1,y1+t,z,z+6,'#ffffff').add(x0-t,x0,y0,y1,z,z+6,'#ffffff').add(x1,x1+t,y0,y1,z,z+6,'#ffffff').mesh(new THREE.MeshBasicMaterial({color:'#ffffff'}),0,false);
    mesh.visible=false;this.scene.add(mesh);this.rims.set(id,mesh);
  }
  /** The bank: a pale facade of panels standing out of the wall around the recesses, the steel ledge, and each machine. */
  private buildBank(b:Blocks,devices:HallDevice[]){
    const left=Math.min(...devices.map(d=>d.x))-120,right=Math.max(...devices.map(d=>d.x))+machineW+120;
    const panels=(x0:number,x1:number,y0:number,y1:number)=>{for(let x=x0;x<x1;x+=300)b.add(x,Math.min(x+300,x1),y0,y1,0,facadeD,C.facade)};
    panels(left,right,facadeTop,recessTop);panels(left,right,recessBottom,floorY);
    const edges=[left,...devices.flatMap(d=>[d.x,d.x+machineW]),right];
    for(let i=0;i<edges.length;i+=2)b.add(edges[i],edges[i+1],recessTop,recessBottom,0,facadeD,C.facade);
    b.add(left-20,right+20,recessBottom-1,recessBottom+15,0,facadeD+40,C.steel);
    for(const device of devices)this.machine(device);
  }
  private machine(d:HallDevice){
    const b=new Blocks(),x=d.x,kind=d.kind,housing=housings[kind]??housings.local;
    b.add(x,x+machineW,recessTop,recessBottom,40,60,housing);
    // Screen leaning back in its bezel, a step of voxels per row; its picture one voxel per pixel.
    const zAt=(row:number)=>60+(row+1)*2.25;
    for(let r=0;r<16;r++)b.add(x+40,x+machineW-40,recessTop+18+r*10,recessTop+28+r*10,60,zAt(r),C.bezel);
    const screen=painted(40,14,1,(g,w,h)=>{
      const box=(x:number,y:number,bw:number,bh:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,bw,bh)};
      if(kind==='charge'){box(0,0,w,h,'#faf9eb');box(15,2,10,6,'#7dba71');box(17,4,6,2,'#ffffff');box(8,10,24,1,'#526c5a')}
      else if(kind==='shinkansen'){box(0,0,w,h,'#eef0e0');box(14,1,12,2,'#41613b');for(let i=0;i<4;i++)box(2+(i%2)*19,4+Math.floor(i/2)*5,17,4,'#697268')}
      else{box(0,0,w,h,'#0960bc');for(let y=0;y<7;y++)for(let x=y%2;x<w;x+=2)box(x,y,1,1,'#4dcae3');box(12,1,16,2,'#f3fbef');for(let i=0;i<6;i++)box(2+(i%3)*12+(i%3>1?1:0),4+Math.floor(i/3)*5,11,4,'#deedf0')}
    });
    b.image(screen,x+50,recessTop+28,10,row=>zAt(row+1),2);
    // Payment block after the Tokyo Station machines: yellow-rimmed slots, the coin bowl, keypad and QR reader, the tray.
    const Y='#e2c234',D='#1d2622',W='#f6f6f0',c1=x+24,c2=x+184,c3=x+312,r2=payTop+44,r3=payTop+108;
    b.add(x+12,x+machineW-12,payTop,recessBottom,60,100,'#e9eae2').add(x+12,x+machineW-12,payTop,payTop+12,60,102,'#c3c7bf');
    for(const [lx,lw] of [[c1,150],[c2,118],[c3,164]])b.add(lx,lx+lw,payTop+16,payTop+38,100,102,'#4c565a');
    const slot=(sx:number,sy:number,w:number,h=56)=>{b.add(sx,sx+w,sy,sy+h,100,104,W).add(sx+w*.18,sx+w*.82,sy+16,sy+32,104,107,Y).add(sx+w*.25,sx+w*.75,sy+20,sy+28,107,108,D)};
    if(kind==='charge'){
      b.add(c1,c1+150,r2,r2+120,100,104,W);
      for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){const r=Math.hypot(dx,dy);if(r<=5.4)b.add(c1+75+dx*8-4,c1+75+dx*8+4,r2+56+dy*8-4,r2+56+dy*8+4,104,r>=4?110:106,r>=4?'#7dba71':'#e7f1e4')}
      slot(c2,r2,118);slot(c3,r2,164,120);
    }else{
      slot(c1,r2,150);slot(c2,r2,118);b.add(c3,c3+164,r2,r2+56,100,106,Y).add(c3+8,c3+156,r2+8,r2+48,106,107,D);
      slot(c1,r3,150);slot(c2,r3,118);
      b.add(c3,c3+92,r3,r3+56,100,104,Y);for(let i=0;i<12;i++)b.add(c3+8+(i%3)*26,c3+30+(i%3)*26,r3+6+Math.floor(i/3)*12,r3+14+Math.floor(i/3)*12,104,108,i===9?'#d9534f':i===11?'#4f9a59':'#ffffff');
      b.add(c3+100,c3+164,r3,r3+56,100,104,W).add(c3+112,c3+152,r3+22,r3+48,104,106,'#2b3d44');
    }
    b.add(c1,c2+118,recessBottom-40,recessBottom-10,100,101,'#262f2c').add(c3,c3+24,recessBottom-36,recessBottom-12,100,104,Y);
    // The lit sign over the recess: its colour, a white rim, the name raised in voxels.
    const cx=x+machineW/2,[ja,en]=signs[kind]??['',''];
    b.add(cx-200,cx+200,963,1097,facadeD,facadeD+12,accents[kind]??accents.local);
    for(const [x0,x1,y0,y1] of [[cx-200,cx+200,963,971],[cx-200,cx+200,1089,1097],[cx-200,cx-192,963,1097],[cx+192,cx+200,963,1097]])b.add(x0,x1,y0,y1,facadeD+12,facadeD+16,'#ffffff');
    b.text(ja,cx,1012,facadeD+12,9,'#ffffff',8).text(en,cx,1067,facadeD+12,4,'#f2f5ee',4);
    const mesh=b.mesh(this.material,.03);mesh.userData.device=d.id;this.scene.add(mesh);this.pickable.push(mesh);
    this.rim(d.id,x-10,x+machineW+10,facadeTop+6,recessBottom,facadeD+2);
  }
  private fit(){
    if(!this.renderer)return;
    const w=Math.max(1,this.host.clientWidth),h=Math.max(1,this.host.clientHeight);
    // As HallScene: rendered at about 640 px wide and scaled up whole, with the same framing.
    const scale=Math.max(1,Math.round(w/640));
    this.renderer.setSize(Math.ceil(w/scale),Math.ceil(h/scale),false);this.css.setSize(w,h);
    this.camera.fov=2*Math.atan(Math.max(h,560)/2/1000)*180/Math.PI;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();
  }
  setHover(id:string|null){this.hovered=id;this.refresh()}
  private refresh(){for(const [id,rim] of this.rims){rim.visible=id===this.near||id===this.hovered;(rim.material as THREE.MeshBasicMaterial).color.set(id===this.near?'#f3d76b':'#ffffff')}}
  render(x:number,yaw:number,pitch:number,distance:number,near:string|null){
    if(!this.renderer)return;
    if(near!==this.near){this.near=near;this.refresh()}
    this.camera.rotation.set(pitch*Math.PI/180,-yaw*Math.PI/180,0);this.camera.position.set(x,eyeY,distance+1000);
    // Each commuter where the concourse has them, turned the way they face there, stepping while they walk; hidden once within a few steps of the eye or faded out at the gates.
    const t=performance.now()/1000;
    for(const pair of this.crowd)for(const mesh of pair)mesh.visible=false;
    for(const f of this.figures()){
      const {x:fx,z}=fromConcourse(this.xAnchors,f.x,f.y),pair=this.crowd[f.look];if(!pair||f.alpha<.5||this.camera.position.z-z<500)continue;
      const mesh=pair[f.moving?Math.floor(t*4+f.look)%2:0];mesh.visible=true;mesh.position.set(fx,-floorY,z);mesh.rotation.y={down:0,up:Math.PI,left:-Math.PI/2,right:Math.PI/2}[f.face];
    }
    this.renderer.render(this.scene,this.camera);this.css.render(this.cssScene,this.camera);
  }
  /** The machine (or the Tokyo map) under a viewport point. */
  pick(clientX:number,clientY:number){
    if(!this.renderer)return null;
    const rect=this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-((clientY-rect.top)/rect.height)*2+1),this.camera);
    return (this.raycaster.intersectObjects(this.pickable,false)[0]?.object.userData.device as string|undefined)??null;
  }
  dispose(){
    this.disposed=true;this.resize.disconnect();
    this.scene.traverse(object=>{const mesh=object as THREE.Mesh;if(mesh.geometry!==unit)mesh.geometry?.dispose();for(const m of [mesh.material??[]].flat())(m as THREE.Material).dispose()});
    this.renderer?.dispose();this.renderer?.domElement.remove();this.css.domElement.remove();
  }
}
