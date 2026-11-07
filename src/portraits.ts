import type { Contact } from './phone';

/** The friends' faces: a drawing dropped in src/portraits/<contact>.png (any size, square, pixel art; 64×64 suggested) replaces the placeholder,
 * in the phone (its avatars, shrunk) and in the talk box (`Journey.talk`, 144 px across). */
const drawn=import.meta.glob<string>('./portraits/*.png',{eager:true,query:'?url',import:'default'});
/** Placeholder faces, 16×16, until the real portraits: hair (h), skin (s), eyes (e), blush (r), mouth (m), beard (b), clothes (c), white (w). */
const faces:Record<Contact,{rows:string[];ink:Record<string,string>}>={
  jennifer:{rows:['................','.....hhhhhh.....','...hhhhhhhhhh...','..hhhhhhhhhhhh..','..hhhhhhsssshh..','..hhhssssssssh..','..hhssessesshh..','..hhrssssssrhh..','..hhsssmmssshh..','.hhhhssssssshhh.','.hhhhhssssshhhh.','.hhhhcsssschhhh.','hhhcccccccccchhh','hhcccccccccccchh','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#9a4a26',s:'#f4cfae',e:'#3a2a30',r:'#ec9c90',m:'#c0505a',c:'#f2e6c8'}},
  namiko:{rows:['................','....hhhhhhhh....','...hhhhhhhhhh...','..hhhhhhhhhhhh..','..hhhhhhhhhhhh..','..hhsssssssshh..','..hhssessesshh..','..hhrssssssrhh..','..hhsssmmssshh..','..hhhsssssshhh..','..hhhhsssshhhh..','......ssss......','....cccwwccc....','..cccccwwccccc..','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#1e1b26',s:'#f6d6b6',e:'#241e28',r:'#efa0a0',m:'#c4565a',c:'#2f3f6e',w:'#f4f1ea'}},
  lorenzo:{rows:['................','................','.....hhhhhh.....','....hhhhhhhh....','...hhhhhhhhhh...','...hsssssssssh..','...sssessesss...','....ssssssss....','....bssssssb....','....bbbmmbbb....','.....bbbbbb.....','......ssss......','....cccssccc....','..cccccccccccc..','.cccccccccccccc.','cccccccccccccccc'],
    ink:{h:'#33241a',s:'#dba77e',e:'#2a1f1a',m:'#a8524a',b:'#4a3424',c:'#5f8cc4'}}};
const placeholders:Partial<Record<Contact,HTMLCanvasElement>>={};
const placeholder=(id:Contact)=>placeholders[id]??=(()=>{const {rows,ink}=faces[id],c=document.createElement('canvas');c.width=c.height=16;const g=c.getContext('2d')!;rows.forEach((row,y)=>[...row].forEach((d,x)=>{if(ink[d]){g.fillStyle=ink[d];g.fillRect(x,y,1,1)}}));return c})();
const own=(id:Contact)=>drawn[`./portraits/${id}.png`];
/** The face's image URL, for the DOM. */
export const portraitUrl=(id:Contact)=>own(id)??placeholder(id).toDataURL();
/** The face as a Phaser texture key, made on first use (`then` once it is ready: a drawing loads from its URL). */
export function portraitTexture(scene:Phaser.Scene,id:Contact,then:(key:string)=>void){
  const key=`portrait-${id}`;if(scene.textures.exists(key)){then(key);return}
  const url=own(id);if(!url){scene.textures.addCanvas(key,placeholder(id));then(key);return}
  const img=new Image();img.onload=()=>{if(!scene.textures.exists(key))scene.textures.addImage(key,img);then(key)};img.src=url;
}
