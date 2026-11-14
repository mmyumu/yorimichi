import type { Contact } from './phone';
/** Whoever speaks face to face: the phone's contacts, and Namiko's daughter Lilly (outing.ts). */
export type Speaker=Contact|'lilly';

/** The friends' faces: a drawing dropped in src/portraits/<contact>.png (any size, square, pixel art; 64×64 suggested) replaces the placeholder,
 * in the phone (its avatars, shrunk) and in the talk box (`Journey.talk`, 144 px across). */
const drawn=import.meta.glob<string>('./portraits/*.png',{eager:true,query:'?url',import:'default'});
/** Placeholder faces, 16×16, until the real portraits: hair (h), skin (s), eyes (e), blush (r), mouth (m), beard (b), clothes (c), white (w). */
const faces:Record<Speaker,{rows:string[];ink:Record<string,string>}>={
  jennifer:{rows:['................','.....hhhhhh.....','...hhhhhhhhhh...','..hhhhhhhhhhhh..','..hhhhhhsssshh..','..hhhssssssssh..','..hhssessesshh..','..hhrssssssrhh..','..hhsssmmssshh..','.hhhhssssssshhh.','.hhhhhssssshhhh.','.hhhhcsssschhhh.','hhhcccccccccchhh','hhcccccccccccchh','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#9a4a26',s:'#f4cfae',e:'#3a2a30',r:'#ec9c90',m:'#c0505a',c:'#f2e6c8'}},
  namiko:{rows:['................','....hhhhhhhh....','...hhhhhhhhhh...','..hhhhhhhhhhhh..','..hhhhhhhhhhhh..','..hhsssssssshh..','..hhssessesshh..','..hhrssssssrhh..','..hhsssmmssshh..','..hhhsssssshhh..','..hhhhsssshhhh..','......ssss......','....cccwwccc....','..cccccwwccccc..','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#1e1b26',s:'#f6d6b6',e:'#241e28',r:'#efa0a0',m:'#c4565a',c:'#2f3f6e',w:'#f4f1ea'}},
  lorenzo:{rows:['................','................','.....hhhhhh.....','....hhhhhhhh....','...hhhhhhhhhh...','...hsssssssssh..','...sssessesss...','....ssssssss....','....bssssssb....','....bbbmmbbb....','.....bbbbbb.....','......ssss......','....cccssccc....','..cccccccccccc..','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#33241a',s:'#dba77e',e:'#2a1f1a',m:'#a8524a',b:'#4a3424',c:'#5f8cc4'}},
  lilly:{rows:['................','................','.......hh.......','....hhhhhhhh....','...hhhhhhhhhh...','..hhhhhhhhhhhhp.','..hhssssssssshpp','..hsseesseessh.p','..hssssssssssh..','..hrrssmmssrrh..','...hssssssssh...','....ssssssss....','......ssss......','....cccwwccc....','..cccccccccccc..','.cccccccccccccc.'],
    ink:{h:'#1e1b26',s:'#f8dcc0',e:'#241e28',r:'#f4a8a8',m:'#d0505a',c:'#e88aa8',w:'#f4f1ea',p:'#f0c040'}}};
const placeholders:Partial<Record<Speaker,HTMLCanvasElement>>={};
const placeholder=(id:Speaker)=>placeholders[id]??=(()=>{const {rows,ink}=faces[id],c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d')!;rows.forEach((row,y)=>[...row].forEach((d,x)=>{if(ink[d]){g.fillStyle=ink[d];g.fillRect(x,y,1,1)}}));return c})();
const own=(id:Speaker)=>drawn[`./portraits/${id}.png`];
/** The face's image URL, for the DOM. */
export const portraitUrl=(id:Speaker)=>own(id)??placeholder(id).toDataURL();
/** The face as a Phaser texture key, made on first use (`then` once it is ready: a drawing loads from its URL). */
export function portraitTexture(scene:Phaser.Scene,id:Speaker,then:(key:string)=>void){
  const key=`portrait-${id}`;if(scene.textures.exists(key)){then(key);return}
  const url=own(id);if(!url){scene.textures.addCanvas(key,placeholder(id));then(key);return}
  const img=new Image();img.onload=()=>{if(!scene.textures.exists(key))scene.textures.addImage(key,img);then(key)};img.src=url;
}
