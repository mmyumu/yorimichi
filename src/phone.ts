import { dayLabel, hhmm, minutes } from './clock';

export type Contact='jennifer'|'namiko'|'lorenzo';
/** A message, the traveller's own (`me`) or the contact's, sent at `at` on the journey's clock (none: before the journey began). */
export interface Message {me?:boolean;text:string;at?:number}
/** The phone kept in the save: the conversations, what is still unread, and Lorenzo's trip: in Hong Kong (`home`), asked to come (his OK on its way), flying,
 * then waiting with his Uber at the station (`at`) nearest the traveller when he landed; called again from there (`called`, his answer on its way), then on his way (`driving`). */
export interface PhoneState {chats:Record<Contact,Message[]>;unread:Record<Contact,number>;lorenzo:{state:'home'|'asked'|'flying'|'here'|'called'|'driving';at?:string}}
export const contacts:Record<Contact,{name:string;color:string}>={jennifer:{name:'Jennifer',color:'#c45a82'},namiko:{name:'Namiko',color:'#3f8f7a'},lorenzo:{name:'Lorenzo',color:'#c97b2e'}};
/** What the traveller can send Lorenzo while he is still in Hong Kong. */
export const askLorenzo='Hey Lorenzo! I’m in Japan. Can you come and join me?';
/** And once he is in Japan, to have him come over by Uber to the station nearest the traveller. */
export const callLorenzo='Can you come and pick me up?';
export const newPhone=():PhoneState=>({chats:{jennifer:[{text:'Have a wonderful trip! Don’t forget to send me photos.'}],namiko:[{text:'Welcome to Japan! If the trains get confusing, just ask me.'}],
  lorenzo:[{text:'Ciao! How is Japan? I’m stuck in Hong Kong for work this week.'}]},unread:{jennifer:1,namiko:1,lorenzo:1},lorenzo:{state:'home'}});
const ids=Object.keys(contacts) as Contact[];
/** A saved phone if it still reads (Lorenzo's station still `known`), else a new one. */
export function readPhone(raw:unknown,known:(hub:string)=>boolean):PhoneState{
  const p=raw as PhoneState|undefined;
  return p&&ids.every(id=>Array.isArray(p.chats?.[id])&&Number.isFinite(p.unread?.[id]))&&['home','asked','flying','here','called','driving'].includes(p.lorenzo?.state)&&(!['here','called'].includes(p.lorenzo.state)||known(p.lorenzo.at??''))?p:newPhone();
}
/** A pixel glyph from rows of '#', as an image URL. */
const glyph=(rows:string[],color='#ffffff')=>{const c=document.createElement('canvas');c.width=rows[0].length;c.height=rows.length;const g=c.getContext('2d')!;g.fillStyle=color;rows.forEach((row,y)=>[...row].forEach((d,x)=>{if(d==='#')g.fillRect(x,y,1,1)}));return c.toDataURL()};
const apps:[string,string,string[]][]=[
  ['Messages','#3b8a6e',['..........','.########.','##########','##.##.##.#','##########','.########.','..##......','..#.......']],
  ['Maps','#4f7fc0',['...####...','..######..','.###..###.','.###..###.','..######..','...####...','....##....','....#.....']],
  ['Camera','#55606a',['...###....','.########.','##......##','#..####..#','#..#..#..#','#..####..#','##......##','.########.']],
  ['Photos','#c9873e',['##########','#........#','#.....##.#','#...#.##.#','#..###...#','#.#####..#','##########','..........']],
];
// Where the phone was left: it opens there again.
let last:'home'|'list'|Contact='home';
/** The traveller's phone, taken out over the paused scene: an Android-like home screen and the messaging app (conversations, then one of them).
 * `send` is the traveller sending a contact the suggested reply; `changed` follows any change to the state (a conversation read). */
export class Phone {
  private overlay:HTMLElement;private screen:HTMLElement;private clock:HTMLElement;private timer:number;private previous=document.activeElement as HTMLElement|null;
  constructor(private state:PhoneState,private on:{send:(contact:Contact)=>void;changed:()=>void;close:()=>void}){
    const el=this.el;this.overlay=el(document.body,'div','phone-overlay');this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Phone');
    const phone=el(this.overlay,'div','phone'),status=el(phone,'div','phone-status');this.clock=el(status,'span');el(status,'span','phone-signal','▂▄▆ 4G ').append(el(status,'i','phone-battery'));
    this.screen=el(phone,'div','phone-screen');
    const nav=el(phone,'nav','phone-nav');for(const [text,label,fn] of [['◁','Back',()=>this.back()],['○','Home',()=>this.go('home')],['□','Close',()=>this.close()]] as const){const b=this.button(nav,'',fn,text);b.setAttribute('aria-label',label)}
    this.overlay.addEventListener('pointerdown',event=>{if(event.target===this.overlay)this.close()});
    this.overlay.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.key==='Escape'||event.code==='KeyP'){event.preventDefault();this.close()}else if(event.key==='Backspace'){event.preventDefault();this.back()}
      else if(event.key==='Tab'||event.key.startsWith('Arrow')){event.preventDefault();this.step(event.key==='ArrowUp'||event.key==='ArrowLeft'||event.key==='Tab'&&event.shiftKey?-1:1)}
    });
    this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    this.timer=window.setInterval(()=>this.tick(),500);this.render();
  }
  private el(parent:HTMLElement,tag:string,cls='',text=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e}
  private button(parent:HTMLElement,cls:string,fn:()=>void,text=''){const b=this.el(parent,'button',cls,text) as HTMLButtonElement;b.type='button';b.onclick=fn;return b}
  private tick(){this.clock.textContent=hhmm(minutes());const big=this.screen.querySelector('.phone-clock');if(big)big.textContent=this.clock.textContent}
  private go(screen:typeof last){last=screen;this.render()}
  /** Redrawn whole on every change; a conversation shown is read. */
  refresh(){this.render()}
  private render(){
    const s=last,el=this.el,box=this.screen;box.replaceChildren();box.className='phone-screen phone-'+(s==='home'||s==='list'?s:'chat');
    if(s==='home'){
      el(box,'div','phone-clock');el(box,'div','phone-date',dayLabel());const grid=el(box,'div','phone-apps'),unread=ids.reduce((n,id)=>n+this.state.unread[id],0);
      for(const [name,color,rows] of apps){
        const b=this.button(grid,'phone-app',()=>this.go('list'));b.disabled=name!=='Messages';if(b.disabled)b.title='Coming in a later version';
        const tile=el(b,'span','phone-tile');tile.style.background=color;const img=el(tile,'img') as HTMLImageElement;img.src=glyph(rows);img.alt='';el(b,'span','',name);
        if(name==='Messages'&&unread)el(tile,'b','phone-badge',String(unread));
      }
    }else if(s==='list'){
      el(box,'header','phone-bar','Messages');const list=el(box,'div','phone-list');
      for(const id of ids){
        const chat=this.state.chats[id],message=chat[chat.length-1],row=this.button(list,'phone-row'+(this.state.unread[id]?' unread':''),()=>this.go(id));this.avatar(row,id);
        const text=el(row,'span','phone-row-text');el(text,'strong','',contacts[id].name);el(text,'span','',(message?.me?'You: ':'')+(message?.text??''));
        const side=el(row,'span','phone-row-side');el(side,'small','',this.when(message));if(this.state.unread[id])el(side,'b','phone-badge',String(this.state.unread[id]));
      }
    }else{
      if(this.state.unread[s]){this.state.unread[s]=0;this.on.changed()}
      const bar=el(box,'header','phone-bar');this.button(bar,'phone-back',()=>this.back(),'←').setAttribute('aria-label','Back');this.avatar(bar,s);el(bar,'span','',contacts[s].name);
      const log=el(box,'div','phone-log');
      for(const message of this.state.chats[s]){const b=el(log,'div','phone-bubble'+(message.me?' me':''),message.text);el(b,'small','',this.when(message))}
      if(s==='lorenzo'&&(this.state.lorenzo.state==='asked'||this.state.lorenzo.state==='called'))el(log,'div','phone-bubble typing','•••');
      const compose=el(box,'div','phone-compose');
      const suggested=s==='lorenzo'?{home:askLorenzo,here:callLorenzo}[this.state.lorenzo.state as string]:undefined;
      if(suggested)this.button(compose,'phone-chip',()=>this.on.send('lorenzo'),suggested);else el(compose,'div','phone-field','Text message');
      log.scrollTop=log.scrollHeight;
    }
    this.tick();(box.querySelector<HTMLButtonElement>(s==='home'||s==='list'?'button:not(:disabled)':'.phone-chip')??box.querySelector('button')??this.overlay.querySelector('button'))?.focus();
  }
  private avatar(parent:HTMLElement,id:Contact){const a=this.el(parent,'span','phone-avatar',contacts[id].name[0]);a.style.background=contacts[id].color}
  private when(message?:Message){return message?.at===undefined?'Yesterday':hhmm(message.at/60000)}
  /** Up a level: the conversation to the list, the list to the home screen, the home screen puts the phone away. */
  back(){if(last==='home')this.close();else this.go(last==='list'?'home':'list')}
  private step(by:number){const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(i+by+buttons.length)%buttons.length]?.focus()}
  /** The gamepad, read by the scene: d-pad / stick to move between buttons, A to press, B to go back. */
  pad(step:number,press:boolean,back:boolean){if(step)this.step(step);if(press)(document.activeElement as HTMLElement|null)?.click();else if(back)this.back()}
  close(){this.destroy();this.on.close()}
  destroy(){clearInterval(this.timer);this.overlay.remove();this.previous?.focus()}
}

// The flight's map, East Asia from Hainan to the Tsugaru Strait, in degrees: 240 × 160 px, longitude shrunk by the cosine of its middle latitude.
const W=240,H=160,west=109,east=147,north=41.5,south=20;
const at=(lon:number,lat:number):[number,number]=>[(lon-west)/(east-west)*W,(north-lat)/(north-south)*H];
// Coastlines, rough, as [lon, lat] runs: the mainland (closed off the map's top and left), then the islands.
const coasts:number[][]=[
  [100,45,100,21.6,109,21.6,110.2,20.3,111,21.5,112.5,21.8,113.6,22.2,114.2,22.3,115,22.7,116.5,23,117.5,23.8,118.5,24.5,119.5,25.5,119.8,26.5,120.5,27.5,121,28.3,121.9,29.5,121.5,30.6,121.9,31,121,32,120.8,33,120.3,34.3,119.3,35,120.3,36,121,36.8,122.5,37.2,121.5,37.5,120.5,37.6,119,37.2,118.8,38.5,118,39.2,119.5,39.8,121,40.8,122.2,40.5,121.2,38.8,122,39.5,124,40,125,39.5,125.5,38.8,124.8,38,126,37.6,126.5,37,126.2,36,126.5,35,126.3,34.5,127.5,34.6,128.6,34.9,129.3,35.3,129.5,36,129.4,37,128.6,38.5,127.5,39.6,128.5,40.3,129.8,41,130.6,42.4,133,43,135,44,100,45],
  [108.6,19.5,109.6,20.1,110.6,20.1,111,19.6,110.5,18.5,109,18.5],
  [121,25.3,122,25,121.6,24,121,22.5,120.7,22,120.2,22.8,120.1,23.7,120.7,24.6],
  [127.6,26.1,128,26.6,128.3,26.9,127.9,26.7],
  [129.9,33.6,130.9,34,131.7,33.6,131.9,32.9,131.5,31.6,131,31,130.7,31.1,130.2,31.3,130.3,32.2,129.8,32.7,129.6,33.3],
  [132.5,34.3,133.5,34.4,134.6,34.2,134.7,33.8,134.2,33.3,133.2,33.4,132.9,32.8,132.4,33.4,132,33.3,132.1,33.8],
  [130.9,34,131.6,34.7,132.6,35.5,133.3,35.6,134.3,35.6,135.2,35.7,135.9,35.6,136,36,136.7,36.9,136.9,37.4,137.3,36.8,138.5,37.4,139.4,38.2,139.9,39,140,40,139.9,40.6,140.3,41.3,141.2,41.3,141.5,40.5,141.9,39.5,141.6,38.5,141,38.2,140.9,37.2,140.6,36.5,140.8,35.7,140.3,35.1,139.8,34.9,139.9,35.6,139.6,35.1,139.1,35.2,138.8,34.7,138.3,34.6,137.5,34.7,137,34.6,136.9,34.3,136.5,34.2,136.1,33.5,135.8,33.4,135.3,33.8,135.1,34.3,135.4,34.7,134.7,34.8,133.9,34.5,133,34.4,132.2,33.9,131.6,34],
  [139.9,41.6,140.5,41.7,141.2,41.8,141.6,42.6,143.3,42,144.5,42.9,145.5,43.3,145,44,141.5,45.5,140,43,140.3,42.2],
];
const hongKong=at(114.2,22.31);
export const airports={haneda:{name:'Tokyo Haneda',code:'HND',city:'TOKYO',spot:at(139.78,35.55)},kansai:{name:'Kansai',code:'KIX',city:'OSAKA',spot:at(135.24,34.43)}};
const plane=['....#......','....##.....','.....##....','#.....##...','##########.','###########','##########.','#.....##...','.....##....','....##.....','....#......'];
/** The map, drawn once: the sea with its graticule, the land pixel-hard with a darker coast, and the two airports. */
function chart(to:[number,number]){
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
  g.fillStyle='#000';for(const run of coasts){g.beginPath();for(let i=0;i<run.length;i+=2)g.lineTo(...at(run[i],run[i+1]));g.fill()}
  const mask=g.getImageData(0,0,W,H).data,land=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&mask[(y*W+x)*4+3]>127;
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const shore=land(x,y)&&!(land(x-1,y)&&land(x+1,y)&&land(x,y-1)&&land(x,y+1)),near=!land(x,y)&&(land(x-1,y)||land(x+1,y)||land(x,y-1)||land(x,y+1));
    g.fillStyle=land(x,y)?shore?'#6f8f55':(x*7+y*3)%23===0?'#8faa69':'#9eb978':near?'#8fb6c4':(x+y*2)%9===0&&y%3===0?'#4c7d9c':'#3f6f8f';g.fillRect(x,y,1,1);
  }
  g.fillStyle='#4a7a99';for(let lon=110;lon<east;lon+=5)for(let y=0;y<H;y+=3){const [x]=at(lon,0);if(!land(Math.round(x),y))g.fillRect(Math.round(x),y,1,1)}
  for(let lat=25;lat<north;lat+=5)for(let x=0;x<W;x+=3){const [,y]=at(0,lat);if(!land(x,Math.round(y)))g.fillRect(x,Math.round(y),1,1)}
  for(const [x,y] of [hongKong,to]){g.fillStyle='#283e40';g.fillRect(Math.round(x)-2,Math.round(y)-2,5,5);g.fillStyle='#d6402e';g.fillRect(Math.round(x)-1,Math.round(y)-1,3,3)}
  return c;
}
/** Lorenzo's flight, over everything: a map of East Asia, his plane taking off from Hong Kong, crossing the East China Sea and landing `to`. A click or a key skips it. */
export function playFlight(to:keyof typeof airports,done:()=>void){
  const airport=airports[to],[x0,y0]=hongKong,[x2,y2]=airport.spot,x1=(x0+x2)/2+(y2-y0)*.22,y1=(y0+y2)/2-(x2-x0)*.22;
  const overlay=document.createElement('div');overlay.className='flight-overlay';overlay.tabIndex=-1;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label',`Lorenzo’s flight from Hong Kong to ${airport.name}`);
  overlay.innerHTML=`<div class="flight-card"><div class="flight-head"><strong>Lorenzo</strong><span>Hong Kong HKG ✈ ${airport.name} ${airport.code}</span></div><div class="flight-map"><canvas width="${W}" height="${H}"></canvas></div><div class="flight-foot">Click, Space or Ⓐ to skip</div></div>`;
  const map=overlay.querySelector<HTMLElement>('.flight-map')!,canvas=overlay.querySelector('canvas')!,g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;
  for(const [text,[x,y],cls] of [['HONG KONG',hongKong,'below'],[airport.city,airport.spot,'below'],['CHINA',at(113,31),'land'],['KOREA',at(127.7,36.4),'land'],['JAPAN',at(143,37),'sea'],['EAST CHINA SEA',at(125.5,29.5),'sea']] as const){
    const label=document.createElement('span');label.className='flight-label '+cls;label.textContent=text;label.style.left=`${x/W*100}%`;label.style.top=`${y/H*100}%`;map.append(label);
  }
  document.body.append(overlay);overlay.focus();
  const base=chart(airport.spot),sprite=(color:string)=>{const c=document.createElement('canvas');c.width=c.height=11;const s=c.getContext('2d')!;s.fillStyle=color;plane.forEach((row,y)=>[...row].forEach((d,x)=>{if(d==='#')s.fillRect(x,y,1,1)}));return c};
  const white=sprite('#fffef2'),shadow=sprite('#0f262e70'),start=performance.now(),takeoff=700,length=5600,total=takeoff+length+1100;
  const point=(p:number)=>[(1-p)**2*x0+2*(1-p)*p*x1+p*p*x2,(1-p)**2*y0+2*(1-p)*p*y1+p*p*y2];
  let frame=0,over=false;
  const draw=()=>{
    const t=performance.now()-start;if(t>=total){finish();return}
    const q=Math.min(1,Math.max(0,(t-takeoff)/length)),p=q*q*(3-2*q),alt=Math.max(0,Math.min(1,p/.16,(1-p)/.16)),[x,y]=point(p),[ax,ay]=point(Math.min(1,p+.01)),[bx,by]=point(Math.max(0,p-.01));
    g.drawImage(base,0,0);
    // The way flown, dotted, and a few clouds drifting under the plane.
    g.fillStyle='#fffef2';for(let k=0;k<p;k+=.012){const [dx,dy]=point(k);if(Math.round(k/.012)%2===0)g.fillRect(Math.round(dx),Math.round(dy),1,1)}
    g.fillStyle='#f4f4ee';for(let k=0;k<5;k++){const cx=((k*53+t/90)%(W+40))-20,cy=24+k*27;g.fillRect(Math.round(cx),cy,10,2);g.fillRect(Math.round(cx)+3,cy-1,5,1)}
    // Climbing and coming down, the plane's shadow on the ground draws away from it and back.
    const angle=Math.atan2(ay-by,ax-bx),blit=(image:HTMLCanvasElement,dx:number,dy:number)=>{g.save();g.translate(Math.round(dx),Math.round(dy));g.rotate(angle);g.drawImage(image,-5.5,-5.5);g.restore()};
    blit(shadow,x+1+alt*6,y+1+alt*6);blit(white,x,y);
    // Landed: the airport blinks.
    if(p>=1&&Math.floor(t/250)%2){g.fillStyle='#fff6d0';g.fillRect(Math.round(x2)-3,Math.round(y2)-3,7,7);g.fillStyle='#d6402e';g.fillRect(Math.round(x2)-1,Math.round(y2)-1,3,3)}
    frame=requestAnimationFrame(draw);
  };
  const finish=()=>{if(over)return;over=true;cancelAnimationFrame(frame);overlay.remove();done()};
  overlay.addEventListener('pointerdown',finish);overlay.addEventListener('keydown',event=>{event.stopPropagation();event.preventDefault();finish()});overlay.addEventListener('keyup',event=>event.stopPropagation());
  draw();
  return {skip:finish};
}
