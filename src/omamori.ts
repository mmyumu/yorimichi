import { crispText } from './ticket-gate';

/** The charms (お守り) of the temples and shrines, one each, earned the first time a coin lands in its offering bowl (coin-toss.ts) and kept in the bag, a collection:
 * by sight id, the two characters of its wish written down its front, the wish in English, the brocade's colour, its pattern's, the lettering's and its label's. */
export interface Charm {ja:string;en:string;cloth:string;trim:string;ink:string;label:string}
export const charms:Record<string,Charm>={
  asakusa:{ja:'開運',en:'Good fortune',cloth:'#c8402e',trim:'#e8b84a',ink:'#fff4dc',label:'#8e2a1e'},
  meiji:{ja:'良縁',en:'Good ties',cloth:'#f4ecd8',trim:'#4f8a5c',ink:'#3a5a40',label:'#ffffff'},
  kinkaku:{ja:'金運',en:'Wealth',cloth:'#d8a832',trim:'#fff0a8',ink:'#5a3a10',label:'#f4e2a0'},
  ginkaku:{ja:'招福',en:'Happiness',cloth:'#a9adb0',trim:'#e6e8ea',ink:'#2e3236',label:'#f4f4f2'},
  daitoku:{ja:'学業',en:'Studies',cloth:'#2f4a7a',trim:'#9ab8e0',ink:'#f2ead2',label:'#1e3258'},
  kenkun:{ja:'必勝',en:'Victory',cloth:'#2a2420',trim:'#d4502e',ink:'#f0c860',label:'#4a3c34'},
  yasaka:{ja:'厄除',en:'Warding off evil',cloth:'#e05a3a',trim:'#ffffff',ink:'#ffffff',label:'#b03a22'},
  heian:{ja:'健康',en:'Health',cloth:'#3d8a5e',trim:'#e0c060',ink:'#fff6dc',label:'#2a6a46'},
  lanterns:{ja:'安全',en:'Safe travels',cloth:'#f0e2b8',trim:'#c8452e',ink:'#3a2c20',label:'#ffffff'},
  toshogu:{ja:'出世',en:'Success',cloth:'#5e3a82',trim:'#e0c070',ink:'#f6e6b0',label:'#3e2460'},
};
const key='yorimichi-omamori';
const read=():string[]=>{try{const list=JSON.parse(localStorage.getItem(key)??'[]');return Array.isArray(list)?list.filter(id=>id in charms):[]}catch{return []}};
/** The charms kept, by sight id, in the order they were earned. */
export const ownedCharms=()=>read();
/** Keeps a place's charm; true if it is new. */
export const earnCharm=(place:string)=>{const owned=read();if(owned.includes(place)||!(place in charms))return false;owned.push(place);try{localStorage.setItem(key,JSON.stringify(owned))}catch{}return true};
export const charmW=20,charmH=34;
/** A charm, `charmW`×`charmH` px from (x, y): the brocade pouch with its rounded shoulders, the cord tied in a knot on top, the woven pattern, the label and its two characters down it.
 * `faint` draws only its outline, for one not yet found. */
export function paintCharm(g:CanvasRenderingContext2D,x:number,y:number,charm:Charm,faint=false){
  const r=(px:number,py:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x+px,y+py,w,h)};
  if(faint){r(3,8,14,1,'#00000030');r(2,10,1,23,'#00000030');r(17,10,1,23,'#00000030');r(3,33,14,1,'#00000030');r(3,9,1,1,'#00000030');r(16,9,1,1,'#00000030');r(8,2,4,4,'#00000020');return}
  // The cord's loop and knot.
  r(8,0,4,1,charm.trim);r(7,1,1,4,charm.trim);r(12,1,1,4,charm.trim);r(8,4,4,3,charm.trim);r(9,5,2,1,'#00000030');r(7,7,2,2,charm.trim);r(11,7,2,2,charm.trim);
  // The pouch, its shoulders rounded, a shadow down its right side.
  r(3,8,14,1,charm.cloth);r(2,9,16,25,charm.cloth);r(16,33,2,1,'#00000040');r(17,9,1,25,'#00000030');r(2,9,1,25,'#ffffff30');
  for(let py=11;py<33;py+=4)for(let px=3+(py%8?2:0);px<17;px+=4)r(px,py,1,1,charm.trim);
  // The label down the middle, the wish on it.
  r(5,11,10,21,charm.label);
  g.font='10px "Yorimichi Bitmap"';for(let i=0;i<2;i++)crispText(g,charm.ja[i],x+5,y+11+i*10,charm.ink);
  r(2,33,16,1,'#00000030');
}
