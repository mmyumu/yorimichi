import { box } from './hall-scene';
import { write } from './konbini-till';
import { connectedPad } from './pad';
import { veil } from './pause-menu';
import { crispText, fitPicture } from './ticket-gate';

// 焦がすな! (Don't burn it!), the little card game Mike carries in his backpack, played at the yakiniku table after the meal (Jennifer's dinner, main.ts):
// a push-your-luck game for three. In turn, each player flips cards from the pile onto the table's grill, one at a time: a cut not yet on it sizzles there,
// a cut already on it burns the whole grill (nothing scored that turn) unless tongs saved it. Stop whenever you like to eat what is grilled: the cuts' points, sauce added.
// All six cuts at once is a full grill, eaten at once with a bonus. The round in which someone reaches the target is played out; the highest score wins.
// One 480 × 320 picture laid over the paused scene, as the pause menu is (pause-menu.ts), with its own keyboard, pad and pointer.
const W=480,H=320,ink='#3a2a20',paper='#f4ead0',edge='#5a3f2c',red='#c0463a',faint='#8a7558';
type Rect=[number,number,number,number];
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;
export type Player='you'|'jennifer'|'mike';
const order:Player[]=['you','jennifer','mike'];
const names:Record<Player,string>={you:'You',jennifer:'Jenn',mike:'Mike'};
/** The cuts, each worth its points and as many times in the pile as it is worth plus one: the best ones burn the most often. */
const cuts:{id:string;ja:string;en:string;value:number;count:number}[]=[
  {id:'kalbi',ja:'カルビ',en:'Kalbi',value:6,count:7},
  {id:'harami',ja:'ハラミ',en:'Skirt',value:5,count:6},
  {id:'toro',ja:'豚トロ',en:'Pork jowl',value:4,count:5},
  {id:'tsukune',ja:'つくね',en:'Tsukune',value:3,count:4},
  {id:'horumon',ja:'ホルモン',en:'Offal',value:2,count:3},
  {id:'yasai',ja:'野菜',en:'Veggies',value:1,count:2},
];
const value=(card:string)=>cuts.find(c=>c.id===card)?.value??0;
const isCut=(card:string)=>value(card)>0;
export const target=35,sauceBonus=2,fullBonus=5;
const rules=[
  'Take turns flipping cards from the pile onto the grill.',
  'A new cut sizzles there. A cut already on the grill',
  'burns everything: nothing scored this turn.',
  'Tongs save you from one burn. Sauce adds +2.',
  'Stop whenever you like to eat what is grilled.',
  `All six cuts at once: a full grill, +${fullBonus}.`,
  `First past ${target} at the end of a round wins.`,
];
const shuffle=<T>(list:T[])=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}return list};

/** The cards' pictures, 36 × 22 at (x, y). */
function art(g:CanvasRenderingContext2D,card:string,x:number,y:number){
  const r=(dx:number,dy:number,w:number,h:number,c:string)=>box(g,x+dx,y+dy,w,h,c);
  if(card==='kalbi'){r(4,5,28,13,'#b8323a');r(4,5,28,1,'#d85058');for(const [dx,dy,w] of [[7,8,10],[14,11,12],[6,14,8],[20,7,8],[22,15,7]])r(dx,dy,w,1,'#f4d4cc');r(4,18,28,1,'#7a1e24')}
  else if(card==='harami'){r(2,7,32,9,'#8a2a2a');r(2,7,32,1,'#a83a3a');for(let i=4;i<32;i+=4)r(i,8,1,8,'#6a1e1e');r(2,16,32,1,'#5a1414')}
  else if(card==='toro'){r(5,5,26,13,'#f0b4b0');for(const dy of [7,10,13,16])r(5,dy,26,1,'#fbecec');r(5,5,26,1,'#f8d0cc');r(5,18,26,1,'#c88a88')}
  else if(card==='tsukune'){r(2,10,33,2,'#d8b878');for(const dx of [6,15,24]){r(dx,6,8,10,'#8a5a32');r(dx+1,7,3,2,'#c08a4a');r(dx,15,8,1,'#5a3a1e')}}
  else if(card==='horumon'){for(const [dx,dy] of [[4,6],[16,4],[12,12],[24,11]]){r(dx,dy,10,6,'#f4d8d0');r(dx+1,dy,8,1,'#fff0ea');r(dx,dy+5,10,1,'#d8a098');r(dx+3,dy+2,4,2,'#e8b8b0')}}
  else if(card==='yasai'){r(3,6,12,12,'#4a9a3a');r(5,8,8,8,'#f4f0dc');r(7,10,4,4,'#4a9a3a');r(17,8,9,9,'#f4f0dc');r(19,10,5,5,'#e8e0c0');r(27,6,6,12,'#f08a3a');r(28,7,4,10,'#f8a858')}
  else if(card==='tongs'){for(let i=0;i<16;i++){r(4+i,4+Math.floor(i*.6),2,2,'#c8ccd0');r(4+i,17-Math.floor(i*.6),2,2,'#a8acb0')}r(20,10,12,4,'#3a3a3e');r(20,10,12,1,'#5a5a60')}
  else if(card==='sauce'){r(6,9,24,9,'#e8e4dc');r(8,10,20,5,'#5a2a14');r(10,11,8,1,'#8a4a24');r(6,18,24,1,'#a8a49c');r(26,3,3,8,'#c8a06a')}
}
/** A card face up, 44 × 58: its value in the corner, its picture, its name; `burning` puts flames on it. */
function face(g:CanvasRenderingContext2D,card:string,x:number,y:number,dim=false){
  box(g,x+2,y+2,44,58,'#00000050');box(g,x,y,44,58,dim?'#6a5a4a':paper,edge);box(g,x+2,y+2,40,54,dim?'#5a4a3a':'#fbf4e2');
  const cut=cuts.find(c=>c.id===card);
  if(cut){g.font='20px "Yorimichi Bitmap"';crispText(g,String(cut.value),x+4,y+3,red);write(g,cut.ja,x+22,y+45,ink,'center')}
  else{write(g,card==='tongs'?'トング':'タレ',x+22,y+45,ink,'center');if(card==='sauce')write(g,'+2',x+5,y+4,red)}
  art(g,card,x+4,y+18);
}
function cardBack(g:CanvasRenderingContext2D,x:number,y:number){
  box(g,x+2,y+2,44,58,'#00000050');box(g,x,y,44,58,'#7a2a22','#3a1410');box(g,x+3,y+3,38,52,'#a8382c');
  for(let yy=6;yy<54;yy+=4)for(let xx=6+(yy%8?0:2);xx<40;xx+=4)box(g,x+xx,y+yy,1,1,'#c85a40');
  box(g,x+11,y+19,22,20,'#f4ead0','#3a1410');g.font='20px "Yorimichi Bitmap"';crispText(g,'焦',x+12,y+19,'#c0463a');
}
const flames=(g:CanvasRenderingContext2D,x:number,y:number,w:number,t:number)=>{for(let i=0;i<w;i+=3){const h=6+Math.round(8*Math.abs(Math.sin(t/90+i*1.7)));box(g,x+i,y-h,3,h,i%2?'#f0a030':'#e04a20');box(g,x+i+1,y-h+2,1,h-3,'#ffe070')}};

export interface Outcome {winners:Player[];scores:Record<Player,number>}
/** Opens the game; `done` gets the outcome, or null if the traveller left before the end. */
export function playCardGame(done:(outcome:Outcome|null)=>void){
  const overlay=document.createElement('div');overlay.className='pause-screen';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Card game');
  const stage=document.createElement('div'),canvas=document.createElement('canvas'),shade=veil();canvas.width=W;canvas.height=H;stage.append(shade,canvas);overlay.append(stage);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
  const fit=()=>{const game=document.querySelector<HTMLCanvasElement>('#game canvas')?.getBoundingClientRect();Object.assign(stage.style,game?{left:game.left+'px',top:game.top+'px',width:game.width+'px',height:game.height+'px'}:{left:'0',top:'0',width:'100%',height:'100%'});fitPicture(canvas,stage,W,H)},watcher=new ResizeObserver(fit);watcher.observe(overlay);fit();

  let draw=shuffle([...cuts.flatMap(c=>Array<string>(c.count).fill(c.id)),'tongs','tongs','sauce','sauce','sauce']),discard:string[]=[],grill:string[]=[];
  const scores:Record<Player,number>={you:0,jennifer:0,mike:0},last:Record<Player,string>={you:'',jennifer:'',mike:''};
  let phase:'rules'|'play'|'over'='rules',turn=0,round=1,busy=false,burning=0,saved=-1,message='',focus=0,frame=0,closed=false,leaving=0,items:{rect:Rect;act:()=>void;off?:boolean}[]=[];
  const queue:{at:number;fn:()=>void}[]=[];
  const later=(ms:number,fn:()=>void)=>queue.push({at:performance.now()+ms,fn});
  const who=()=>order[turn];
  const grillPoints=()=>grill.reduce((sum,card)=>sum+value(card)+(card==='sauce'?sauceBonus:0),0);
  const pile=()=>draw.length?draw:discard;

  function flip(){
    if(!draw.length){draw=shuffle(discard);discard=[];message='The pile is shuffled again.'}
    const card=draw.pop()!,p=who(),name=p==='you'?'You flip':`${names[p]} flips`;
    if(isCut(card)&&grill.includes(card)){
      const tongs=grill.indexOf('tongs');grill.push(card);busy=true;
      if(tongs>=0){saved=grill.length-1;message=`${name} a second ${cuts.find(c=>c.id===card)!.ja}… the tongs save it!`;later(1100,()=>{grill.splice(grill.length-1,1);grill.splice(tongs,1);discard.push(card,'tongs');saved=-1;busy=false;next()});return}
      burning=performance.now();message=`${name} a second ${cuts.find(c=>c.id===card)!.ja}: 焦げた! It all burns.`;
      later(1500,()=>{discard.push(...grill);grill=[];burning=0;last[p]='焦げた!';busy=false;pass()});return;
    }
    grill.push(card);
    message=card==='tongs'?`${name} the tongs: they will save one burn.`:card==='sauce'?`${name} the sauce: +${sauceBonus} if eaten.`:`${name} ${cuts.find(c=>c.id===card)!.ja}: ${value(card)} point${value(card)>1?'s':''}.`;
    if(cuts.every(c=>grill.includes(c.id))){busy=true;message='全部のせ! A full grill!';later(1200,()=>{busy=false;eat(fullBonus)});return}
    next();
  }
  /** After a flip: the traveller chooses; the others think a moment. */
  function next(){if(who()!=='you'){busy=true;later(900,()=>{busy=false;if(stops())eat();else flip()})}else focus=0}
  function eat(bonus=0){
    const p=who(),points=grillPoints()+bonus;scores[p]+=points;last[p]=`+${points}`;discard.push(...grill);grill=[];
    message=`${p==='you'?'You eat':`${names[p]} eats`} it all: +${points}.`;pass();
  }
  function pass(){
    busy=true;later(1300,()=>{
      busy=false;turn=(turn+1)%order.length;
      if(turn===0){if(order.some(p=>scores[p]>=target)){finish();return}round++}
      message=who()==='you'?'Your turn: flip a card.':`${names[who()]}'s turn.`;
      if(who()!=='you'){busy=true;later(800,()=>{busy=false;flip()})}else focus=0;
    });
  }
  function finish(){phase='over';const best=Math.max(...order.map(p=>scores[p]));message='';focus=0;outcome={winners:order.filter(p=>scores[p]===best),scores:{...scores}}}
  let outcome:Outcome|null=null;
  /** Whether the one playing stops now: Jenn is careful, Mike is bold; both count the cards, eat when that wins it, and push on when they are falling behind. */
  function stops(){
    const p=who(),points=grillPoints(),cards=pile(),on=new Set(grill.filter(isCut));let risk=cards.filter(c=>on.has(c)).length/Math.max(1,cards.length);
    if(grill.includes('tongs'))risk*=.35;
    const others=Math.max(...order.filter(o=>o!==p).map(o=>scores[o]));
    if(scores[p]+points>=target&&scores[p]+points>others)return true;
    const behind=others>=target-8&&scores[p]+points<others;
    const [careful,enough]=p==='jennifer'?[.3,15]:[.45,21];
    return behind?risk>.6:risk>careful||points>=enough;
  }

  const button=([x,y,w,h]:Rect,label:string,chosen:boolean,off=false)=>{box(g,x,y+1,w,h,'#2a1a10');box(g,x,y,w,h,off?'#8a7a68':chosen?red:'#f8f0da',off?'#5a4a3a':chosen?'#7a2a22':edge);write(g,label,x+w/2,y+Math.round((h-10)/2),off?'#c8b8a0':chosen?'#fff6e0':ink,'center')};
  const plate=(p:Player,[x,y,w,h]:Rect)=>{
    const on=phase==='play'&&who()===p;box(g,x+2,y+2,w,h,'#00000060');box(g,x,y,w,h,on?'#fbe8a8':paper,on?red:edge);
    write(g,names[p],x+8,y+6,on?red:ink);g.font='20px "Yorimichi Bitmap"';const s=String(scores[p]);crispText(g,s,x+w-10-Math.ceil(g.measureText(s).width),y+4,ink);
    write(g,last[p]?`Last turn: ${last[p]}`:'',x+8,y+h-15,last[p]==='焦げた!'?red:faint);
    if(on)for(let k=0;k<4;k++)box(g,x-8+k,y+h/2-3+k,1,7-k*2,red);
  };
  const table=()=>{
    box(g,0,0,W,H,'#5e4030');for(let y=0;y<H;y+=6){box(g,0,y,W,1,'#54382a');for(let x=(y*13)%50;x<W;x+=50+(y*7)%30)box(g,x,y,1,6,'#6a4a38')}
    // The table's own grill, switched off, the game laid over it.
    const cx=W/2,cy=128;for(let dy=-58;dy<=58;dy++){const w=Math.round(Math.sqrt(1-(dy/58)**2)*190);box(g,cx-w,cy+dy,w*2,1,Math.abs(dy)>52||w<12?'#2a2a2e':'#1a1a1e')}
    for(let x=cx-180;x<cx+180;x+=10)for(let dy=-50;dy<=50;dy+=2){const w=Math.sqrt(Math.max(0,1-(dy/58)**2))*190;if(Math.abs(x-cx)<w-6)box(g,x,cy+dy,1,2,'#3a3a40')}
  };
  const reference=([x,y,w,h]:Rect)=>{
    box(g,x+2,y+2,w,h,'#00000060');box(g,x,y,w,h,paper,edge);write(g,'In the pile',x+w/2,y+4,faint,'center');
    const cards=pile(),on=new Set(grill);
    cuts.forEach((c,i)=>{const yy=y+17+i*11,danger=on.has(c.id);write(g,`${c.value}`,x+8,yy,red);write(g,c.ja,x+20,yy,danger?red:ink);write(g,`×${cards.filter(k=>k===c.id).length}`,x+w-8,yy,danger?red:ink,'right')});
    write(g,`トング ×${cards.filter(k=>k==='tongs').length}  タレ ×${cards.filter(k=>k==='sauce').length}`,x+w/2,y+h-13,faint,'center');
  };
  const paint=(t:number)=>{
    g.clearRect(0,0,W,H);table();
    write(g,"焦がすな!  DON'T BURN IT!",W/2,8,'#f6dfa0','center');write(g,phase==='play'?`Round ${round} · first past ${target}`:'',W/2,22,'#e8c8a0','center');
    plate('jennifer',[16,10,128,40]);plate('mike',[336,10,128,40]);plate('you',[16,262,128,40]);
    // The grill's cards, spread across it.
    const n=grill.length,step=n?Math.min(48,340/n):0,left=Math.round(W/2-(step*(n-1)+44)/2);
    grill.forEach((card,i)=>face(g,card,Math.round(left+i*step),saved===i?92:100,!!burning));
    if(burning)flames(g,left-4,160,Math.round(step*(n-1)+52),t);
    if(!n&&phase==='play')write(g,'the grill',W/2,124,'#5a5a64','center');
    // The pile, its count, and the message strip.
    cardBack(g,180,204);write(g,`${pile().length}`,204,266,'#f4e4c8','center');
    if(message){box(g,16,180,312,16,'#1a1210d0','#7a5a40');write(g,message,24,183,'#f8ecd0')}
    reference([336,196,128,104]);
    items=[];
    if(phase==='rules'){
      const p:Rect=[70,60,340,200];box(g,p[0]+3,p[1]+3,p[2],p[3],'#00000080');box(g,...p,paper,edge);
      write(g,'焦がすな!  ·  How to play',W/2,p[1]+10,red,'center');box(g,p[0]+14,p[1]+24,p[2]-28,1,'#d6c49a');
      rules.forEach((line,i)=>write(g,line,p[0]+18,p[1]+34+i*16,ink));
      items=[{rect:[W/2-50,p[1]+p[3]-30,100,20],act:start}];button(items[0].rect,'Start',true);
    }else if(phase==='play'){
      const mine=who()==='you'&&!busy;
      items=[{rect:[236,214,84,20],act:flip,off:!mine},{rect:[236,240,84,20],act:()=>eat(),off:!mine||!grill.some(isCut)}];
      if(items[focus]?.off)focus=items.findIndex(i=>!i.off);
      button(items[0].rect,'Flip',mine&&focus===0,items[0].off);button(items[1].rect,'Stop & eat',mine&&focus===1,items[1].off);
      if(mine&&grill.some(isCut))write(g,`On the grill: ${grillPoints()}`,278,266,'#f4e4c8','center');
    }else if(outcome){
      const p:Rect=[110,70,260,150],won=outcome.winners.includes('you');box(g,p[0]+3,p[1]+3,p[2],p[3],'#00000080');box(g,...p,paper,edge);
      g.font='20px "Yorimichi Bitmap"';const title=outcome.winners.length>1?'A tie!':won?'You win!':`${names[outcome.winners[0]]} wins!`;crispText(g,title,W/2-Math.ceil(g.measureText(title).width)/2,p[1]+12,won?red:ink);
      [...order].sort((a,b)=>scores[b]-scores[a]).forEach((pl,i)=>{write(g,names[pl],p[0]+70,p[1]+48+i*16,ink);write(g,String(scores[pl]),p[0]+p[2]-70,p[1]+48+i*16,ink,'right')});
      items=[{rect:[W/2-50,p[1]+p[3]-30,100,20],act:()=>close(outcome)}];button(items[0].rect,'Done',true);
    }
    const hint=leaving>performance.now()?'Esc or B again to leave the game':'←→ choose · Enter or A · Esc or B leave';g.font='10px "Yorimichi Bitmap"';const hw=Math.ceil(g.measureText(hint).width)+20;box(g,(W-hw)/2,H-17,hw,15,'#0b0a16d0','#3a3466');write(g,hint,W/2,H-14,leaving>performance.now()?'#ffb27a':'#f0d0a8','center');
  };
  function start(){phase='play';message='Your turn: flip a card.';focus=0}
  const loop=()=>{const now=performance.now();for(const job of queue.filter(j=>j.at<=now)){queue.splice(queue.indexOf(job),1);if(!closed)job.fn()}paint(now);pad();if(!closed)frame=requestAnimationFrame(loop)};

  function close(result:Outcome|null){if(closed)return;closed=true;cancelAnimationFrame(frame);watcher.disconnect();document.removeEventListener('keydown',key,true);overlay.remove();done(result)}
  const usable=()=>items.map((item,i)=>item.off?-1:i).filter(i=>i>=0);
  const move=(d:number)=>{const list=usable();if(!list.length)return;const at=list.indexOf(focus);focus=list[((at<0?0:at+d)+list.length)%list.length]};
  const choose=()=>{const item=items[focus];if(item&&!item.off)item.act()};
  const back=()=>{if(phase==='over'){close(outcome);return}if(leaving>performance.now())close(null);else leaving=performance.now()+2500};
  function key(event:KeyboardEvent){
    const keys:Record<string,()=>void>={ArrowUp:()=>move(-1),ArrowDown:()=>move(1),ArrowLeft:()=>move(-1),ArrowRight:()=>move(1),KeyW:()=>move(-1),KeyS:()=>move(1),KeyA:()=>move(-1),KeyD:()=>move(1),Enter:choose,Space:choose,KeyE:choose,Escape:back,Backspace:back};
    const fn=keys[event.code];event.preventDefault();event.stopPropagation();if(fn&&!event.repeat)fn();
  }
  document.addEventListener('keydown',key,true);
  let held:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[],lastDir=0;
  function pad(){
    const p=connectedPad();if(!p)return;const pressed=p.buttons.map(b=>b.pressed),before=held,edge=(i:number)=>pressed[i]&&!before[i];held=pressed;
    const ax=p.axes[0]??0,ay=p.axes[1]??0,dir=pressed[12]||pressed[14]||ay<-.5||ax<-.5?-1:pressed[13]||pressed[15]||ay>.5||ax>.5?1:0;
    if(dir&&dir!==lastDir)move(dir);lastDir=dir;
    if(edge(0))choose();else if(edge(1)||edge(9))back();
  }
  const at=(event:PointerEvent):[number,number]=>{const r=canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H]};
  canvas.addEventListener('pointermove',event=>{const [x,y]=at(event),i=items.findIndex(item=>!item.off&&inside(item.rect,x,y));if(i>=0)focus=i;canvas.style.cursor=i>=0?'pointer':'default'});
  overlay.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();const [x,y]=at(event),i=items.findIndex(item=>!item.off&&inside(item.rect,x,y));if(i>=0){focus=i;items[i].act()}});
  void document.fonts.load('20px "Yorimichi Bitmap"');loop();
}
