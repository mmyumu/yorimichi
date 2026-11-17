import { box } from './hall-scene';
import { write } from './konbini-till';
import { charms, charmH, charmW, earnCharm, ownedCharms, paintCharm } from './omamori';
import { connectedPad } from './pad';
import { veil } from './pause-menu';
import { crispText, fitPicture } from './ticket-gate';
import { debugAllowed } from './teleport';
import { coins, debugMoney, machineSound, pieceArt, saveWallet, type Wallet } from './wallet';

// The offering bowl of a temple or shrine (the `bowl` hotspot of its screen, sight-scenes.ts): a bronze bowl on its stone, or on a rock in the pond at Kinkaku-ji, a few steps away.
// Coins from the purse are tossed at it, gone wherever they land, as offerings are; one that lands inside rings the bowl, and the first to do so at a place earns its charm (omamori.ts).
// A toss is a direction and a strength: the direction is chosen (the pointer, ← → or A / D, the stick), shown as a dotted line along the ground, the strength taken from a gauge that rises and falls while the button is held,
// at a pace that changes with every sweep, and let go to toss: how far the coin goes. Never quite the same twice, so landing it is a knack, not a setting.
// One 480 × 320 picture laid over the paused scene, as Mike's card game is (card-game.ts), with its own keyboard, pad and pointer.
const W=480,H=320,ink='#3a2a20',paper='#f4ead0',edge='#5a3f2c',red='#c0463a';
type Rect=[number,number,number,number];
const inside=([x,y,w,h]:Rect,px:number,py:number)=>px>=x&&px<x+w&&py>=y&&py<y+h;
/** Where the ground starts, the bowl's mouth (centre, inner and outer radii across and down), the foot of what it stands on. */
const horizon=96,bx=240,by=150,mouth:[number,number]=[17,5],rim:[number,number]=[22,7],foot=204;
/** Where the pointer aims, and the coins' tray along the foot; the gauge beside the field. */
const field:Rect=[0,56,W,212],tray:Rect=[96,270,288,32],gauge:Rect=[448,150,12,110];
/** The hand, on the ground at the foot of the picture; how far round it may turn either way; where a toss of strength `f` (0 to 1) along `angle` comes down, the farther the more foreshortened. */
const hand=318,turn=.6,reach=7;
const landing=(angle:number,f:number):[number,number]=>{const y=horizon+(hand-horizon)/(1+reach*f);return [bx+Math.tan(angle)*(hand-y),y]};
/** A coin's size on the ground at `y`: the farther, the smaller. */
const scale=(y:number)=>.35+.65*(y-horizon)/(H-horizon);
export type Setting='gravel'|'moss'|'pond';

/** Opens the bowl of `place` (a sight id with a charm); once its charm is earned, each coin in calls `bless` (the minutes of blessing then left; `blessed` reads them), before its hall (`hall`: its walls' and roof's colours) or, by the pond, its pavilion; `spent` follows each coin out of the purse, `done` once the traveller steps away. */
export function tossCoins(place:string,name:[string,string],setting:Setting,hall:[string,string],wallet:Wallet,spent:()=>void,bless:(value:number)=>number,blessed:()=>number,done:()=>void){
  const overlay=document.createElement('div');overlay.className='pause-screen';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Offering bowl');
  const stage=document.createElement('div'),canvas=document.createElement('canvas'),shade=veil();canvas.width=W;canvas.height=H;stage.append(shade,canvas);overlay.append(stage);document.body.append(overlay);overlay.focus();
  const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
  const fit=()=>{const game=document.querySelector<HTMLCanvasElement>('#game canvas')?.getBoundingClientRect();Object.assign(stage.style,game?{left:game.left+'px',top:game.top+'px',width:game.width+'px',height:game.height+'px'}:{left:'0',top:'0',width:'100%',height:'100%'});fitPicture(canvas,stage,W,H)},watcher=new ResizeObserver(fit);watcher.observe(overlay);fit();
  const art=Object.fromEntries(coins.map(v=>{const image=new Image();image.src=pieceArt(v);return [v,image]}));
  const backdrop=paintBackdrop(setting,hall),charm=charms[place],sheet=document.createElement('canvas');sheet.width=charmW;sheet.height=charmH;
  const drawSheet=()=>{const s=sheet.getContext('2d')!;s.clearRect(0,0,charmW,charmH);paintCharm(s,0,0,charm)};drawSheet();void document.fonts.load('10px "Yorimichi Bitmap"').then(drawSheet);

  /** The coin in the air (from, to, when it left, how long), those lying about, those in the bowl, the rings on the water and the bowl's shimmer. */
  interface Flight {value:number;from:[number,number];to:[number,number];at:number;ms:number;arc:number;then:()=>void;bowl?:true}
  let flight:Flight|null=null,angle=0,value=coins.find(v=>(wallet[v]??0)>0&&v===5)??coins.find(v=>(wallet[v]??0)>0)??5,frame=0,closed=false,rung=0;
  const lying:{x:number;y:number;value:number}[]=[],kept:{x:number;y:number;value:number}[]=[],rings:{x:number;y:number;at:number}[]=[],held=new Set<string>();
  let found=ownedCharms().includes(place),reveal=0,boon:{text:string;at:number}|null=null;
  /** The gauge while held: its level, its way, its pace this sweep (a new one at each end); where it stopped last, marked a moment. */
  let charge:{level:number;dir:number;pace:number;at:number}|null=null,stopped:{level:number;at:number}|null=null;
  const sweepPace=()=>1.2+Math.random()*1.1;
  const start=()=>{if(flight||reveal||charge||!(wallet[value]>0))return;charge={level:0,dir:1,pace:sweepPace(),at:performance.now()}};
  const run=(t:number)=>{if(!charge)return;let level=charge.level+charge.dir*charge.pace*(t-charge.at)/1000;charge.at=t;if(level>=1){level=2-level;charge.dir=-1;charge.pace=sweepPace()}else if(level<=0){level=-level;charge.dir=1;charge.pace=sweepPace()}charge.level=Math.max(0,Math.min(1,level))};
  const release=()=>{if(!charge)return;run(performance.now());const f=charge.level;charge=null;stopped={level:f,at:performance.now()};toss(f)};
  const usable=()=>coins.filter(v=>(wallet[v]??0)>0);
  const pick=(d:number)=>{const list=usable();if(!list.length)return;const at=list.indexOf(value);value=list[((at<0?0:at+d)+list.length)%list.length]};
  /** A coin landing: on the water (rings, then gone below), or on the ground where it stays. */
  const land=(x:number,y:number,v:number)=>{if(setting==='pond'){rings.push({x,y,at:performance.now()});machineSound('splash')}else{lying.push({x,y,value:v});machineSound('stamp')}};
  const fly=(f:Omit<Flight,'at'>)=>{flight={...f,at:performance.now()}};
  function toss(f:number){
    if(flight||reveal||!(wallet[value]>0))return;
    // The hand is never quite steady: a hair off in direction and strength.
    const v=value,[tx,ty]=landing(angle+(Math.random()-.5)*.03,Math.max(0,f+(Math.random()-.5)*.03));
    wallet[v]--;if(!wallet[v])delete wallet[v];saveWallet(wallet);spent();if(!(wallet[v]>0))pick(1);
    const d=((tx-bx)/mouth[0])**2+((ty-by)/mouth[1])**2,r=((tx-bx)/rim[0])**2+((ty-by)/rim[1])**2;
    // Into the mouth, or onto the rim, where it may yet drop in; else past the bowl, down to the ground (behind or before its stone).
    const into=()=>{kept.push({x:bx+(Math.random()-.5)*mouth[0]*1.2,y:by+(Math.random()-.5)*mouth[1]*.8,value:v});rung=performance.now();machineSound('coin');machineSound('ring');if(found){bless(v);boon={text:`ご利益 +${v===5?2:1}h`,at:performance.now()}}else if(earnCharm(place)){found=true;setTimeout(()=>{if(!closed)reveal=performance.now()},900)}};
    const off=(x:number,y:number)=>{const side=x<bx?-1:1,to:[number,number]=[bx+side*(rim[0]+10+Math.random()*24),foot+2+Math.random()*24];fly({value:v,from:[x,y],to,ms:420,arc:18,bowl:true,then:()=>land(...to,v)})};
    const ground=(x:number,y:number):[number,number]=>Math.abs(x-bx)<rim[0]+2&&y<foot?[x,y<by?Math.min(foot-6,y+ (foot-by)*.4):foot+3]:[x,y+(y<foot?6:10)];
    if(d<1)fly({value:v,from:[bx,H+10],to:[tx,ty],ms:700,arc:110,bowl:true,then:into});
    else if(r<1)fly({value:v,from:[bx,H+10],to:[tx,ty],ms:700,arc:110,bowl:true,then:()=>{machineSound('coin');if(Math.random()<.3)into();else off(tx,ty)}});
    else{const end=ground(tx,ty);fly({value:v,from:[bx,H+10],to:end,ms:740,arc:110+(ty-end[1]),then:()=>land(...end,v)})}
  }

  const coinAt=(x:number,y:number,v:number,turn=1)=>{const image=art[v],s=Math.max(.25,scale(y))*.9,w=Math.max(1,Math.round(14*s*Math.abs(turn))),h=Math.max(1,Math.round(14*s));if(image.complete)g.drawImage(image,Math.round(x-w/2),Math.round(y-h/2),w,h)};
  const flat=(x:number,y:number,v:number)=>{const s=scale(y),w=Math.max(3,Math.round(12*s)),h=Math.max(1,Math.round(4*s)),[face,shine]=v===5||v===500?['#d6b450','#f6e08a']:v===10?['#b8683a','#e59a68']:['#c8cccc','#f4f6f6'];box(g,Math.round(x-w/2),Math.round(y-h/2),w,h,face);box(g,Math.round(x-w/2),Math.round(y-h/2),Math.max(1,w>>1),1,shine)};
  const pedestal=(t:number)=>{
    if(setting==='pond'){
      // A rock rising from the water, the bowl held up on it.
      box(g,bx-34,foot-6,68,8,'#2c4a52');for(const [x,w,y,c] of [[-30,60,182,'#6c6a60'],[-26,52,174,'#7c786c'],[-20,40,166,'#8a8678'],[-14,28,160,'#9a9686']] as const)box(g,bx+x,y,w,foot-2-y,c);
      box(g,bx-30,foot-4,60,2,'#ffffff40');box(g,bx-12,160,6,2,'#b4b0a2');box(g,bx+10,170,4,20,'#5c5a52');
    }else{
      // A stone pillar on its plinth, its cap under the bowl.
      box(g,bx-26,foot-10,52,10,'#8f8a7c');box(g,bx-26,foot-10,52,2,'#b4ae9e');box(g,bx-16,162,32,foot-172,'#a29c8c');box(g,bx-16,162,4,foot-172,'#b8b2a2');box(g,bx+12,162,4,foot-172,'#837e70');
      box(g,bx-20,158,40,6,'#b4ae9e');box(g,bx-20,163,40,1,'#837e70');box(g,bx-30,foot,60,3,'#00000030');
    }
    // The bronze bowl: its body below the rim, the dark mouth with the coins in it, the shimmer once it rings.
    for(let i=0;i<10;i++){const w=Math.round(rim[0]-i*i*.16);box(g,bx-w,by+2+i,w*2,1,i<3?'#8a6436':i<7?'#74522a':'#5e4222')}
    for(let y=-rim[1];y<=rim[1];y++){const w=Math.round(rim[0]*Math.sqrt(1-(y/rim[1])**2));box(g,bx-w,by+y,w*2,1,'#b08848')}
    for(let y=-mouth[1];y<=mouth[1];y++){const w=Math.round(mouth[0]*Math.sqrt(1-(y/mouth[1])**2));box(g,bx-w,by+y,w*2,1,y<0?'#2a1c10':'#3a2a18')}
    box(g,bx-rim[0]+3,by-rim[1]+1,8,1,'#e0c080');
    for(const c of kept)flat(c.x,c.y,c.value);
    const ring=(t-rung)/1400;if(rung&&ring<1)for(let i=0;i<3;i++){const a=Math.round(rim[0]+4+i*7+ring*10),alpha=Math.round((1-ring)*(1-i*.3)*140).toString(16).padStart(2,'0');for(const s of [-1,1])box(g,bx+s*a-(s>0?1:0),by-2-i*2,1,6,'#fff6c8'+alpha)}
  };
  const paint=(t:number)=>{
    g.drawImage(backdrop,0,0);
    // Whatever lies farther than the stone's foot is behind it.
    const behind=(c:{x:number;y:number})=>c.y<foot;
    for(const c of lying)if(behind(c))flat(c.x,c.y,c.value);
    const f=flight,p=f?Math.min(1,(t-f.at)/f.ms):0,fy=f?f.from[1]+(f.to[1]-f.from[1])*p-f.arc*4*p*(1-p):0,fx=f?f.from[0]+(f.to[0]-f.from[0])*p:0;
    // The direction: dots along the ground from the hand, nothing saying how far; where the stone and bowl hide them, they show through faintly (`ghost`, drawn again over them).
    const aimDots=(ghost:boolean)=>{if(f||reveal)return;for(let y=tray[1]-6;y>horizon+8;y-=Math.max(3,Math.round(9*scale(y)))){const x=bx+Math.tan(angle)*(hand-y);if(ghost&&!(y<foot&&y>by-rim[1]-2&&Math.abs(x-bx)<34))continue;const w=scale(y)>.5?2:1;box(g,Math.round(x),Math.round(y)+1,w,1,ghost?'#3a2a2020':'#3a2a2090');box(g,Math.round(x),Math.round(y),w,1,ghost?'#fffbe848':'#fffbe8')}};
    aimDots(false);
    // A coin going farther than the stone passes behind it (and the bowl) once it is beyond its foot, unless it is coming down onto the bowl itself.
    const late=!!f&&!f.bowl&&f.from[1]+(f.to[1]-f.from[1])*p<foot;
    if(late)coinAt(fx,fy,f!.value,Math.cos(p*22));
    /** The rings where a coin went into the water, those farther than the rock's foot first, so that it hides them. */
    const ripple=(ring:{x:number;y:number;at:number})=>{const a=(t-ring.at)/1200;if(a>1)return;for(let i=0;i<2;i++){const rx=Math.round((3+a*16+i*5)*scale(ring.y)),ry=Math.max(1,Math.round(rx/3)),alpha=Math.round((1-a)*170).toString(16).padStart(2,'0');for(let k=0;k<24;k++){const an=k/24*Math.PI*2;box(g,Math.round(ring.x+Math.cos(an)*rx),Math.round(ring.y+Math.sin(an)*ry),1,1,'#e8f4f4'+alpha)}}};
    for(const ring of rings)if(ring.y<foot)ripple(ring);
    pedestal(t);aimDots(true);
    for(const c of lying)if(!behind(c))flat(c.x,c.y,c.value);
    for(const ring of rings)if(ring.y>=foot)ripple(ring);
    if(f&&!late)coinAt(fx,fy,f.value,Math.cos(p*22));
    if(f&&p>=1){flight=null;f.then()}
    // The strength's gauge: its level while held, a tick where it last stopped.
    run(t);const [gx,gy,gw,gh]=gauge;box(g,gx-2,gy-2,gw+4,gh+4,'#3a2c20d8','#8a7558');
    if(charge){const h=Math.round(charge.level*gh);for(let y=0;y<h;y++){const k=y/gh;box(g,gx,gy+gh-1-y,gw,1,k<.5?'#7ab05a':k<.8?'#e0b040':'#d0503a')}box(g,gx,gy+gh-h,gw,1,'#fff8e0')}
    if(stopped&&t-stopped.at<1500){const y=gy+gh-Math.round(stopped.level*gh);box(g,gx-4,y,gw+8,1,'#fff8e0')}
    write(g,'力',gx+gw/2,gy+gh+5,paper,'center');
    // The blessing just earned rising from the bowl, and what is left of it under the plate.
    if(boon){const a=(t-boon.at)/1400;if(a>1)boon=null;else{g.globalAlpha=Math.min(1,2-a*2);write(g,boon.text,bx,by-24-Math.round(a*18),'#fff2b0','center');g.globalAlpha=1}}
    const left=blessed();if(left>0){const text=`ご利益 · ${Math.floor(left/60)}h${String(Math.floor(left%60)).padStart(2,'0')}`;box(g,6,38,96,14,'#f4ead0e8',edge);write(g,text,12,40,'#a07a20')}
    // The place's plate, top left; its charm, top right, an outline until it is found.
    box(g,6,6,150,30,'#f4ead0e8',edge);g.font='10px "Yorimichi Bitmap"';crispText(g,name[0],12,9,red);write(g,name[1],12,22,ink);write(g,'賽銭 · OFFERING',150,9,'#8a7558','right');
    box(g,W-50,6,44,46,'#f4ead0e8',edge);if(found)g.drawImage(sheet,W-38,10);else paintCharm(g,W-38,10,charm,true);write(g,`${ownedCharms().length}/${Object.keys(charms).length}`,W-28,40,'#8a7558','center');
    // The coins in the purse, the chosen one raised.
    box(g,...tray,'#3a2c20d8','#8a7558');
    coins.forEach((v,i)=>{const x=tray[0]+8+i*47,n=wallet[v]??0,on=v===value&&n>0;if(on)box(g,x-3,tray[1]+2,44,tray[3]-4,'#6a4f38');const image=art[v];g.globalAlpha=n?1:.3;if(image.complete)g.drawImage(image,x,tray[1]+(on?3:5),24,24);g.globalAlpha=1;write(g,`×${n}`,x+27,tray[1]+11,n?(on?'#ffe0a0':paper):'#8a7558')});
    const hint='←→ aim · hold Space or A, let go to toss · Tab coin · Esc or B leave';g.font='10px "Yorimichi Bitmap"';const hw=Math.ceil(g.measureText(hint).width)+20;box(g,(W-hw)/2,H-15,hw,13,'#0b0a16d0','#3a3466');write(g,hint,W/2,H-13,'#f0d0a8','center');
    if(reveal)paintReveal(t);
  };
  /** The charm earned, held up in the middle, three times over. */
  const paintReveal=(t:number)=>{
    const a=Math.min(1,(t-reveal)/300);g.globalAlpha=a;box(g,140,60,200,170,paper,edge);box(g,142,62,196,1,'#ffffff');
    write(g,'お守り · A CHARM',W/2,68,red,'center');g.drawImage(sheet,W/2-30,84,charmW*3,charmH*3);
    write(g,`${charm.ja} · ${charm.en}`,W/2,192,ink,'center');write(g,'Kept in your bag',W/2,206,'#8a7558','center');write(g,'Enter or A',W/2,218,'#b09a78','center');g.globalAlpha=1;
  };
  const loop=()=>{const now=performance.now();move();paint(now);pad();if(!closed)frame=requestAnimationFrame(loop)};
  function move(){steer(((held.has('ArrowRight')||held.has('KeyD')?1:0)-(held.has('ArrowLeft')||held.has('KeyA')?1:0))*.008)}
  const steer=(d:number)=>{angle=Math.max(-turn,Math.min(turn,angle+d))};
  const pointAt=(x:number,y:number)=>{angle=Math.max(-turn,Math.min(turn,Math.atan2(x-bx,hand-Math.min(y,hand-20))))};
  function close(){if(closed)return;closed=true;cancelAnimationFrame(frame);watcher.disconnect();document.removeEventListener('keydown',key,true);document.removeEventListener('keyup',up,true);window.removeEventListener('pointerup',let_);overlay.remove();done()}
  const dismiss=()=>{if(reveal&&performance.now()-reveal>400){reveal=0;return true}return !!reveal};
  const act=()=>{if(!dismiss())start()};
  /** Esc, B or the right button: away from the bowl at once, whatever is under way (a charm shown is kept already). */
  const back=()=>close();
  function key(event:KeyboardEvent){
    event.preventDefault();event.stopPropagation();held.add(event.code);if(event.repeat)return;
    if(event.code==='Space'||event.code==='Enter'||event.code==='KeyE')act();else if(event.code==='Escape'||event.code==='Backspace')back();else if(event.code==='Tab')pick(event.shiftKey?-1:1);
    else if(event.code==='KeyM'&&debugAllowed){debugMoney(wallet);machineSound('coin');spent()}
    else if(/^Digit[1-6]$/.test(event.code)&&(wallet[coins[+event.code[5]-1]]??0)>0)value=coins[+event.code[5]-1];
  }
  function up(event:KeyboardEvent){held.delete(event.code);if(event.code==='Space'||event.code==='Enter'||event.code==='KeyE')release()}
  document.addEventListener('keydown',key,true);document.addEventListener('keyup',up,true);
  let was:boolean[]=connectedPad()?.buttons.map(b=>b.pressed)??[],padHeld=false;
  function pad(){
    const p=connectedPad();if(!p)return;const pressed=p.buttons.map(b=>b.pressed),before=was,edge=(i:number)=>pressed[i]&&!before[i];was=pressed;
    const ax=p.axes[0]??0;steer((Math.abs(ax)>.2?ax:0)*.01+(pressed[15]?.008:0)-(pressed[14]?.008:0));
    if(padHeld&&!pressed[0]){padHeld=false;release()}
    if(edge(0)){act();padHeld=!!charge}else if(edge(1)||edge(9))back();else if(edge(4))pick(-1);else if(edge(5))pick(1);
  }
  const at=(event:PointerEvent):[number,number]=>{const r=canvas.getBoundingClientRect();return [(event.clientX-r.left)/r.width*W,(event.clientY-r.top)/r.height*H]};
  const coinUnder=(x:number,y:number)=>inside(tray,x,y)?coins[Math.floor((x-tray[0]-4)/47)]:undefined;
  // The pointer turns the direction over the ground; pressed there, it holds the gauge until let go, anywhere.
  canvas.addEventListener('pointermove',event=>{const [x,y]=at(event);if(inside(field,x,y)&&!charge)pointAt(x,y);canvas.style.cursor=inside(field,x,y)?'crosshair':coinUnder(x,y)&&wallet[coinUnder(x,y)!]>0?'pointer':'default'});
  overlay.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();if(dismiss())return;const [x,y]=at(event),v=coinUnder(x,y);if(v!==undefined){if(wallet[v]>0)value=v;return}if(inside(field,x,y)){pointAt(x,y);start();pointing=!!charge}});
  let pointing=false;function let_(event:PointerEvent){if(event.button===0&&pointing){pointing=false;release()}}
  window.addEventListener('pointerup',let_);
  loop();
}

/** What lies behind the bowl, painted once: the precinct's trees, the hall's front (its posts and walls, under its eaves) and its low stone fence, then the ground (raked gravel, moss), or the pond with its far shore and the golden pavilion across it. */
function paintBackdrop(setting:Setting,[wall,roof]:[string,string]){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,r=(x:number,y:number,w:number,h:number,col:string)=>{g.fillStyle=col;g.fillRect(x,y,w,h)};
  let seed=7;const rand=(n:number)=>{seed=(seed*1103515245+12345)>>>0;return (seed>>>8)%n};
  r(0,0,W,horizon,'#2e5a3a');
  for(let i=0;i<70;i++){const x=rand(W),y=rand(horizon-10),s=10+rand(18),col=['#3b6c44','#4a7d4c','#2f5e3c','#5a8d56'][rand(4)];for(let yy=-s;yy<s;yy+=2){const w=Math.round(Math.sqrt(s*s-yy*yy));r(x-w,y+yy,w*2,2,col)}}
  for(let y=0;y<horizon;y+=2)for(let x=(y/2%2)*2;x<W;x+=4)if(rand(5)===0)r(x,y,2,2,'#6c9c60');
  if(setting==='pond'){
    // The far shore's grass and stones, then the water, lighter towards us, its ripples.
    // The pavilion on the far shore, small: its gold storeys and dark roofs, the plain ground floor, its reflection.
    const pv=(x:number,y:number,w:number,h:number,c:string)=>{r(x,y,w,h,c);r(x,2*horizon+4-y-h,w,h,c+'60')};
    pv(64,74,52,16,'#e4ded0');for(let x=66;x<114;x+=6)pv(x,76,2,14,'#5a4a34');pv(58,68,64,6,'#3e3428');pv(68,54,44,14,'#d8a832');pv(70,56,2,10,'#f0c860');pv(60,48,60,6,'#3e3428');pv(72,36,36,12,'#e0b43c');pv(64,30,52,6,'#3e3428');pv(86,24,8,6,'#d8a832');
    r(0,horizon-8,W,10,'#5d8a4e');for(let x=0;x<W;x+=9+rand(14))r(x,horizon-2,6+rand(8),4,['#9a968a','#86847a'][rand(2)]);
    for(let y=horizon+2;y<H;y++){const t=(y-horizon)/(H-horizon);r(0,y,W,1,`rgb(${Math.round(52+t*30)},${Math.round(98+t*36)},${Math.round(104+t*30)})`)}
    for(let i=0;i<160;i++){const y=horizon+4+rand(H-horizon-4),w=Math.round((4+rand(10))*scale(y));r(rand(W),y,w,1,rand(2)?'#ffffff20':'#00000018')}
    for(let i=0;i<14;i++){const y=horizon+20+rand(H-horizon-60),x=rand(W),s=scale(y);if(Math.abs(x-bx)<60)continue;r(x,y,Math.round(14*s),Math.round(5*s),'#4f8a4c');r(x+1,y,Math.round(6*s),1,'#7ab06a')}
    return c;
  }
  // The hall, its eaves across the top, its posts, the walls between them and the dark doorways.
  r(0,0,W,16,roof);r(0,16,W,3,'#00000040');for(let x=0;x<W;x+=6)r(x,4,4,10,'#ffffff12');r(0,20,W,horizon-34,wall);
  for(let x=10;x<W;x+=60){r(x,20,8,horizon-34,'#5a3a2a');r(x+1,20,2,horizon-34,'#ffffff20');if((x-10)/60%2)r(x+16,30,28,horizon-44,'#2a1e18')}
  r(0,horizon-16,W,4,'#8a8274');r(0,horizon-12,W,12,'#a8a294');for(let x=0;x<W;x+=12)r(x,horizon-12,1,12,'#948e80');
  // The fence of stone posts and rails.
  r(0,horizon-14,W,3,'#a49e8e');r(0,horizon-6,W,3,'#a49e8e');for(let x=4;x<W;x+=28){r(x,horizon-18,6,20,'#b4ae9e');r(x+4,horizon-18,2,20,'#8f8a7c')}
  const [base,deep,light]=setting==='moss'?['#5c8a48','#4a7a3c','#76a25a']:['#d6d0c0','#c4bdab','#e6e1d4'];
  r(0,horizon,W,H-horizon,base);
  for(let y=horizon;y<H;y+=2){const t=scale(y);for(let x=(y/2%2)*2;x<W;x+=4)if(rand(3)===0)r(x,y,2,1,rand(2)?deep:light);if(setting==='gravel'&&y%Math.max(4,Math.round(10*t))===0)for(let x=0;x<W;x+=2)if(rand(4))r(x,y,2,1,deep)}
  if(setting==='moss')for(let i=0;i<20;i++){const y=horizon+10+rand(H-horizon-20),s=scale(y),x=rand(W);if(Math.abs(x-bx)<50&&y<foot+20)continue;r(x,y,Math.round(12*s),Math.round(6*s),'#8a8678');r(x+1,y,Math.round(8*s),1,'#a8a494')}
  return c;
}
