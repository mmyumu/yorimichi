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
