/** The traveller's purse: real yen pieces, kept between sessions. Coins weigh the player down. */
export const coins=[1,5,10,50,100,500],notes=[1000,5000,10000];
// What JR machines take: no 1 and 5 yen coins (they fall straight into the tray), and no 2,000 yen notes in this game.
export const accepted=(value:number)=>value>=10;
export const isCoin=(value:number)=>value<1000;
export type Wallet=Record<number,number>;
const key='yorimichi-wallet';
const starting:Wallet={1:3,5:2,10:4,50:1,100:3,500:1,1000:4,5000:1,10000:2};
export function loadWallet():Wallet{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved)return {...Object.fromEntries([...coins,...notes].map(v=>[v,0])),...saved};}catch{}
  return {...starting};
}
export const saveWallet=(wallet:Wallet)=>{try{localStorage.setItem(key,JSON.stringify(wallet))}catch{}};
export const coinCount=(wallet:Wallet)=>coins.reduce((sum,v)=>sum+(wallet[v]??0),0);
export const walletTotal=(wallet:Wallet)=>[...coins,...notes].reduce((sum,v)=>sum+v*(wallet[v]??0),0);
// Eight coins are free; each one more slows the walk by 2.5%, down to 55%.
export const walkFactor=(wallet:Wallet)=>Math.max(.55,1-Math.max(0,coinCount(wallet)-8)*.025);
/** Change as a machine gives it: as few pieces as possible. */
export function makeChange(amount:number){
  const pieces:number[]=[];
  for(const value of [5000,1000,500,100,50,10,5,1])while(amount>=value){pieces.push(value);amount-=value;}
  return pieces;
}

const coinStyle:Record<number,[string,string,string,boolean]>={1:['#e3e6e8','#a8b0b5','#fff',false],5:['#d8b444','#9c7a22','#f6e08a',true],10:['#bd6c3c','#7c4122','#e59a68',false],50:['#e1e3e1','#9da2a0','#fff',true],100:['#d0d4d3','#8f9696','#f4f6f6',false],500:['#d6c27a','#9a8746','#f1e3a8',false]};
const noteStyle:Record<number,[string,string]>={1000:['#86a6cc','#4a6c96'],5000:['#b69bc9','#76598d'],10000:['#c9a679','#8a6a42']};
const art=new Map<number,string>();
/** A piece as pixel art (coins 14×14, notes 28×14), shown at 3× with image-rendering: pixelated. */
export function pieceArt(value:number){
  if(art.has(value))return art.get(value)!;
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d')!,coin=isCoin(value);
  canvas.width=coin?14:28;canvas.height=14;
  const px=(x:number,y:number,color:string)=>{g.fillStyle=color;g.fillRect(x,y,1,1)};
  if(coin){
    const [face,rim,shine,hole]=coinStyle[value];
    for(let y=0;y<14;y++)for(let x=0;x<14;x++){
      const d=Math.hypot(x-6.5,y-6.5);
      if(d>6.6||(hole&&d<1.8))continue;
      px(x,y,d>5.6||(d>4.2&&d<4.9&&value===500)?rim:x+y<9&&d>3.4?shine:face);
    }
  }else{
    const [face,ink]=noteStyle[value];
    g.fillStyle=ink;g.fillRect(0,1,28,12);g.fillStyle=face;g.fillRect(1,2,26,10);
    g.fillStyle='#f4efe0';g.fillRect(17,4,7,6);g.fillStyle=ink;g.fillRect(19,5,3,3);g.fillRect(18,8,5,1);
    g.fillRect(3,4,9,1);g.fillRect(3,6,6,1);g.fillRect(3,9,10,2);
  }
  art.set(value,canvas.toDataURL());return art.get(value)!;
}

let audio:AudioContext|null=null;
/** Tiny synthesized machine sounds: a coin clink, a note being pulled in, a refusal buzz, the gates' beep beep. */
export function machineSound(kind:'coin'|'note'|'reject'|'drop'|'beep'){
  try{
    audio??=new AudioContext();const now=audio.currentTime,gain=audio.createGain();gain.connect(audio.destination);
    const tone=(freq:number,start:number,length:number,type:OscillatorType='sine',volume=.08)=>{
      const osc=audio!.createOscillator(),env=audio!.createGain();osc.type=type;osc.frequency.value=freq;osc.connect(env);env.connect(gain);
      env.gain.setValueAtTime(volume,now+start);env.gain.exponentialRampToValueAtTime(.0001,now+start+length);osc.start(now+start);osc.stop(now+start+length);
    };
    if(kind==='coin'){tone(2350,0,.18);tone(3520,.03,.14);tone(1880,.12,.2,'sine',.05);}
    else if(kind==='drop'){tone(1700,0,.12);tone(2600,.09,.12,'sine',.05);tone(1500,.2,.15,'sine',.04);}
    // The gates' refusal: two short high beeps.
    else if(kind==='beep'){tone(2300,0,.09,'square',.04);tone(2300,.16,.09,'square',.04);}
    else if(kind==='note'){for(let i=0;i<6;i++)tone(140+i*12,i*.05,.06,'square',.025);}
    else tone(110,0,.25,'sawtooth',.05);
  }catch{}
}
