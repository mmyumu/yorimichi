import { labelled, mapHeight, mapWidth, onMap, paintArea, place, spotOf, stationLabel, type Area, type LonLat } from './city-maps';
import { dayLabel, hhmm, minutes } from './clock';
import { askNamiko, type NamikoPlan } from './outing';
import { portraitUrl } from './portraits';
import { entries, enOf, lookUp, plain, tripBetween, waysFrom, type Entry, type Trip } from './transit';

export type Contact='jennifer'|'namiko'|'lorenzo';
/** A message, the traveller's own (`me`) or the contact's, sent at `at` on the journey's clock (none: before the journey began). */
export interface Message {me?:boolean;text:string;at?:number}
/** The phone kept in the save: the conversations, what is still unread, and Lorenzo's trip: in Hong Kong (`home`), asked to come (his OK on its way), flying,
 * then waiting with his Uber at the station nearest the traveller when he landed, or the street outside the sight they were at (`at`); called again from there (`called`, his answer on its way), then on his way (`driving`). */
export interface PhoneState {chats:Record<Contact,Message[]>;unread:Record<Contact,number>;lorenzo:{state:'home'|'asked'|'flying'|'here'|'called'|'driving';at?:string};namiko:NamikoPlan}
export const contacts:Record<Contact,{name:string;color:string}>={jennifer:{name:'Jennifer',color:'#c45a82'},namiko:{name:'Namiko',color:'#3f8f7a'},lorenzo:{name:'Lorenzo',color:'#c97b2e'}};
/** What the traveller can send Lorenzo while he is still in Hong Kong. */
export const askLorenzo='Hey Lorenzo! I’m in Japan. Can you come and join me?';
/** And once he is in Japan, to have him come over by Uber to the station nearest the traveller. */
export const callLorenzo='Can you come and pick me up?';
export const newPhone=():PhoneState=>({chats:{jennifer:[{text:'Have a wonderful trip! Don’t forget to send me photos.'}],namiko:[{text:'Welcome to Japan! If the trains get confusing, just ask me.'}],
  lorenzo:[{text:'Ciao! How is Japan? I’m stuck in Hong Kong for work this week.'}]},unread:{jennifer:1,namiko:1,lorenzo:1},lorenzo:{state:'home'},namiko:{state:'none'}});
const ids=Object.keys(contacts) as Contact[];
/** A saved phone if it still reads (Lorenzo's station still `known`), else a new one. */
export function readPhone(raw:unknown,known:(hub:string)=>boolean):PhoneState{
  const p=raw as PhoneState|undefined;
  // Namiko's outing, kept since a later version: none in an older save.
  if(p&&!(['none','asked','meet','done'].includes(p.namiko?.state)&&(p.namiko.state!=='meet'||Number.isFinite(p.namiko.at))))p.namiko={state:'none'};
  return p&&ids.every(id=>Array.isArray(p.chats?.[id])&&Number.isFinite(p.unread?.[id]))&&['home','asked','flying','here','called','driving'].includes(p.lorenzo?.state)&&(!['here','called'].includes(p.lorenzo.state)||known(p.lorenzo.at??''))?p:newPhone();
}
/** A pixel glyph from rows of '#', as an image URL. */
const glyph=(rows:string[],color='#ffffff')=>{const c=document.createElement('canvas');c.width=rows[0].length;c.height=rows.length;const g=c.getContext('2d')!;g.fillStyle=color;rows.forEach((row,y)=>[...row].forEach((d,x)=>{if(d==='#')g.fillRect(x,y,1,1)}));return c.toDataURL()};
const apps:[string,string,string[]][]=[
  ['Messages','#3b8a6e',['..........','.########.','##########','##.##.##.#','##########','.########.','..##......','..#.......']],
  ['Maps','#4f7fc0',['...####...','..######..','.###..###.','.###..###.','..######..','...####...','....##....','....#.....']],
  ['Trains','#c4553a',['.########.','.#......#.','.#......#.','.########.','.#.####.#.','.########.','..#....#..','.#......#.']],
  ['Camera','#55606a',['...###....','.########.','##......##','#..####..#','#..#..#..#','#..####..#','##......##','.########.']],
  ['Photos','#c9873e',['##########','#........#','#.....##.#','#...#.##.#','#..###...#','#.#####..#','##########','..........']],
];
// Where the phone was left: it opens there again.
let last:'home'|'list'|'maps'|'trains'|Contact='home';
// What the Trains app was looking up, the place picked and which of its ways in, for as long as the game runs.
let query='',sought:string|null=null,wayIn=0;
// The place picked on the map and what the map shows: its zoom and the picture's point at its centre, for as long as the phone is out.
let picked:string|null=null,view={z:1,x:mapWidth/2,y:mapHeight/2};
const zooms=[1,1.5,2,3];
const clampView=()=>{const x=mapWidth/2/view.z,y=mapHeight/2/view.z;view.x=Math.min(Math.max(view.x,x),mapWidth-x);view.y=Math.min(Math.max(view.y,y),mapHeight-y)};
const inView=(px:number,py:number)=>[mapWidth/2+(px-view.x)*view.z,mapHeight/2+(py-view.y)*view.z];
const resetMap=()=>{picked=null;view={z:1,x:mapWidth/2,y:mapHeight/2}};
/** A place or station the Maps app can walk to, with the walk's length in minutes. */
export interface Walk {id:string;ja:string;en:string;at:LonLat;minutes:number;station?:boolean}
/** What Maps knows here: where the traveller is, if the maps show it, the map of that area (none out in the country) and the walks on it, nearest first. */
export interface Walks {here:LonLat|null;area:Area|null;list:Walk[]}
export const walkTime=(m:number)=>m<60?`${m} min`:`${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`;
/** The traveller's phone, taken out over the paused scene: an Android-like home screen, the messaging app (conversations, then one of them) and Maps.
 * `send` is the traveller sending a contact the suggested reply; `changed` follows any change to the state (a conversation read); `walks` lists what can be walked to from here, null without a signal, and `walk` sets off, the phone put away. */
export class Phone {
  private layout:(()=>void)|null=null;private stage:HTMLElement|null=null;private overlay:HTMLElement;private screen:HTMLElement;private clock:HTMLElement;private timer:number;private previous=document.activeElement as HTMLElement|null;
  constructor(private state:PhoneState,private on:{send:(contact:Contact)=>void;changed:()=>void;close:()=>void;walks:()=>Walks|null;walk:(id:string)=>void;here:()=>string}){
    const el=this.el;this.overlay=el(document.body,'div','phone-overlay');this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','Phone');this.overlay.tabIndex=-1;
    const phone=el(this.overlay,'div','phone'),status=el(phone,'div','phone-status');this.clock=el(status,'span');el(status,'span','phone-signal','▂▄▆ 4G ').append(el(status,'i','phone-battery'));
    this.screen=el(phone,'div','phone-screen');
    const nav=el(phone,'nav','phone-nav');for(const [text,label,fn] of [['◁','Back',()=>this.back()],['○','Home',()=>this.go('home')],['□','Close',()=>this.close()]] as const){const b=this.button(nav,'',fn,text);b.setAttribute('aria-label',label)}
    this.overlay.addEventListener('pointerdown',event=>{if(event.target===this.overlay)this.close()});
    this.overlay.addEventListener('keydown',event=>{
      event.stopPropagation();
      if(event.target instanceof HTMLInputElement&&!['Escape','Tab','ArrowUp','ArrowDown','Enter'].includes(event.key))return;
      if(event.target instanceof HTMLInputElement&&event.key==='Enter'){event.preventDefault();this.screen.querySelector<HTMLButtonElement>('.phone-entry')?.click();return}
      if(event.key==='Escape'||event.code==='KeyP'){event.preventDefault();this.close()}else if(event.key==='+'||event.key==='='||event.key==='-'){event.preventDefault();this.zoom(event.key==='-'?-1:1)}else if(event.key==='Backspace'){event.preventDefault();this.back()}
      else if(event.key==='Tab'||event.key.startsWith('Arrow')){event.preventDefault();this.step(event.key==='ArrowUp'||event.key==='ArrowLeft'||event.key==='Tab'&&event.shiftKey?-1:1)}
    });
    this.overlay.addEventListener('keyup',event=>event.stopPropagation());
    resetMap();this.timer=window.setInterval(()=>this.tick(),500);this.render();
  }
  private el(parent:HTMLElement,tag:string,cls='',text=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e}
  private button(parent:HTMLElement,cls:string,fn:()=>void,text=''){const b=this.el(parent,'button',cls,text) as HTMLButtonElement;b.type='button';b.onclick=fn;return b}
  private tile(parent:HTMLElement,color:string,rows:string[]){const tile=this.el(parent,'span','phone-tile');tile.style.background=color;const img=this.el(tile,'img') as HTMLImageElement;img.src=glyph(rows);img.alt='';return tile}
  /** An app's header: its icon, then its title. */
  private bar(box:HTMLElement,name:string,title=name){const bar=this.el(box,'header','phone-bar'),[,color,rows]=apps.find(app=>app[0]===name)!;this.tile(bar,color,rows);this.el(bar,'span','',title)}
  private tick(){this.clock.textContent=hhmm(minutes());const big=this.screen.querySelector('.phone-clock');if(big)big.textContent=this.clock.textContent}
  private go(screen:typeof last){last=screen;this.render()}
  /** Redrawn whole on every change; a conversation shown is read. */
  refresh(){this.render()}
  private render(){
    const s=last,el=this.el,box=this.screen;box.replaceChildren();this.layout=this.stage=null;box.className='phone-screen phone-'+(s==='home'||s==='list'||s==='maps'||s==='trains'?s:'chat');
    if(s==='home'){
      el(box,'div','phone-clock');el(box,'div','phone-date',dayLabel());const grid=el(box,'div','phone-apps'),unread=ids.reduce((n,id)=>n+this.state.unread[id],0);
      for(const [name,color,rows] of apps){
        const to=({Messages:'list',Maps:'maps',Trains:'trains'} as Record<string,'list'|'maps'|'trains'>)[name],b=this.button(grid,'phone-app',()=>{resetMap();this.go(to)});b.disabled=!to;if(b.disabled)b.title='Coming in a later version';
        const tile=this.tile(b,color,rows);el(b,'span','',name);
        if(name==='Messages'&&unread)el(tile,'b','phone-badge',String(unread));
      }
    }else if(s==='list'){
      this.bar(box,'Messages');const list=el(box,'div','phone-list');
      for(const id of ids){
        const chat=this.state.chats[id],message=chat[chat.length-1],row=this.button(list,'phone-row'+(this.state.unread[id]?' unread':''),()=>this.go(id));this.avatar(row,id);
        const text=el(row,'span','phone-row-text');el(text,'strong','',contacts[id].name);el(text,'span','',(message?.me?'You: ':'')+(message?.text??''));
        const side=el(row,'span','phone-row-side');el(side,'small','',this.when(message));if(this.state.unread[id])el(side,'b','phone-badge',String(this.state.unread[id]));
      }
    }else if(s==='maps'){
      this.maps(box);
    }else if(s==='trains'){
      this.trains(box);
    }else{
      if(this.state.unread[s]){this.state.unread[s]=0;this.on.changed()}
      const bar=el(box,'header','phone-bar');this.button(bar,'phone-back',()=>this.back(),'←').setAttribute('aria-label','Back');this.avatar(bar,s);el(bar,'span','',contacts[s].name);
      const log=el(box,'div','phone-log');
      const said=()=>{const row=el(log,'div','phone-said');this.avatar(row,s);return row};
      for(const message of this.state.chats[s]){const b=el(message.me?log:said(),'div','phone-bubble'+(message.me?' me':''),message.text);el(b,'small','',this.when(message))}
      if(s==='lorenzo'&&(this.state.lorenzo.state==='asked'||this.state.lorenzo.state==='called')||s==='namiko'&&this.state.namiko.state==='asked')el(said(),'div','phone-bubble typing','•••');
      const compose=el(box,'div','phone-compose');
      const suggested=s==='lorenzo'?{home:askLorenzo,here:callLorenzo}[this.state.lorenzo.state as string]:s==='namiko'&&this.state.namiko.state==='none'?askNamiko:undefined;
      if(suggested)this.button(compose,'phone-chip',()=>this.on.send(s),suggested);else el(compose,'div','phone-field','Text message');
      log.scrollTop=log.scrollHeight;
    }
    this.tick();(box.querySelector<HTMLElement>(s==='trains'?'.phone-search,.phone-way.on,.phone-entry':s==='maps'?'.phone-go,.phone-pin,.phone-zoom button':s==='home'||s==='list'?'button:not(:disabled)':'.phone-chip')??box.querySelector('button')??this.overlay.querySelector('button'))?.focus();
  }
  /** Maps: the map of the area the traveller is in; a place picked on it shows the walk there in the card below. */
  private maps(box:HTMLElement){
    const el=this.el,walks=this.on.walks(),area=walks?.area;
    this.bar(box,'Maps',area?`Maps · ${area.en}`:'Maps');
    if(!walks||!area){el(box,'div','phone-field phone-nomap',walks?'No places nearby.':'No GPS signal here.');return}
    const stage=el(box,'div','phone-map');this.stage=stage;
    const canvas=document.createElement('canvas');stage.append(canvas);
    this.pins(stage,canvas,area,walks);this.drag(stage);
    const controls=el(stage,'div','phone-zoom');for(const [text,by,label] of [['+',1,'Zoom in'],['−',-1,'Zoom out']] as const)this.button(controls,'',()=>this.zoom(by),text).setAttribute('aria-label',label);
    const card=el(box,'div','phone-card'),walk=walks.list.find(walk=>walk.id===picked);
    if(!walk){el(card,'p','phone-hint','Tap a place or a station to see the way there.');return}
    el(card,'strong','',walk.station?`${walk.en} Station`:walk.en);el(card,'span','',walk.station?`${walk.ja.replace('\u200b','')}駅`:walk.ja);
    this.button(card,'phone-go',()=>{this.close();this.on.walk(walk.id)},`Walk · ${walkTime(walk.minutes)}`);
  }
  /** Trains: a station or place looked up by name, in English or Japanese (everything listed for nothing typed), then, once picked, its Japanese name and the trains
   * there from the station the traveller is at: each line, which way, from which track, where to change and get off, then the tickets and the time. */
  private trains(box:HTMLElement){
    const el=this.el,from=this.on.here(),entry=entries.find(entry=>entry.id===sought);
    this.bar(box,'Trains');
    const top=el(box,'div','phone-from');el(top,'small','','From');el(top,'b','',plain(from)+'駅');el(top,'span','',enOf(from));
    if(!entry){
      const input=el(box,'input','phone-search') as HTMLInputElement;input.type='search';input.placeholder='Station or place, in English or 日本語';input.value=query;input.setAttribute('aria-label','Look up a station or place');
      const list=el(box,'div','phone-list phone-entries');
      const fill=()=>{list.replaceChildren();const hits=lookUp(query);if(!hits.length)el(list,'p','phone-hint phone-none','Nothing by that name.');for(const hit of hits.slice(0,80))this.entryRow(list,hit)};
      input.oninput=()=>{query=input.value;fill()};fill();return;
    }
    const card=el(box,'div','phone-trip');
    const head=el(card,'div','phone-dest');this.button(head,'phone-back',()=>this.back(),'←').setAttribute('aria-label','Back');
    const name=el(head,'div','phone-dest-name');el(name,'b','',entry.kind==='station'?plain(entry.ja)+'駅':entry.ja);el(name,'span','',entry.kind==='station'?`${entry.en} Station · ${entry.region}`:`${entry.en} · ${entry.region}`);
    if(entry.kind==='station'){const lines=el(card,'div','phone-lines');for(const line of entry.lines)this.lineTag(lines,line)}
    let trip:Trip|null,last:{text:string}|null=null;
    if(entry.kind==='place'){
      const ways=waysFrom(from,entry);if(!ways.length){el(card,'p','phone-hint','No train goes there from here.');return}
      wayIn=Math.min(wayIn,ways.length-1);
      const pick=el(card,'div','phone-ways');ways.forEach(({way,minutes},k)=>{const b=this.button(pick,'phone-way'+(k===wayIn?' on':''),()=>{wayIn=k;this.render()});el(b,'b','',plain(way.station));el(b,'small','',`${enOf(way.station)} · ${way.how==='bus'?'Bus '+way.bus:way.how==='exit'?way.exit:'on foot'} · ${walkTime(minutes)} in all`)});
      const {way}=ways[wayIn];trip=ways[wayIn].trip;
      last={text:way.how==='bus'?`Bus ${way.bus} from the stop outside ${enOf(way.station)} Station, to ${entry.en} · about ${way.minutes} min`:way.how==='exit'?`Out of the ${way.exit} (${enOf(way.station)}): ${entry.en}`:`Walk from ${enOf(way.station)} Station · about ${way.minutes} min`};
    }else trip=tripBetween(from,entry.ja);
    if(!trip){el(card,'p','phone-hint','No train goes there from here.');return}
    const steps=el(card,'ol','phone-steps');
    if(!trip.legs.length&&entry.kind==='station')el(steps,'li','phone-hint','You are at this station.');
    trip.legs.forEach((leg,k)=>{
      if(k)el(steps,'li','phone-change',`Change at ${plain(leg.from)} · ${enOf(leg.from)}`);
      const li=el(steps,'li','phone-leg');li.style.borderColor=leg.line.color;
      const line=el(li,'div','phone-leg-line');this.lineTag(line,leg.line);
      el(li,'span','',`Towards ${leg.toward.replace('\u200b','')} · ${leg.towardEn}`);
      if(leg.tracks.length)el(li,'span','phone-track',`Track ${leg.tracks.join(' or ')} · ${leg.stops} stop${leg.stops>1?'s':''} · ${leg.minutes} min`);
      el(li,'span','phone-off',`Get off at ${plain(leg.to)} · ${enOf(leg.to)}`);
    });
    if(last)el(steps,'li','phone-last',last.text);
    if(trip.fares.length){const sum=el(card,'div','phone-fares');for(const fare of trip.fares)el(sum,'span','',`${fare.shinkansen?'Shinkansen ticket':'Fare ticket'} ${enOf(fare.from)} → ${enOf(fare.to)} · ¥${fare.fare.toLocaleString('en')}`);el(sum,'b','',`About ${walkTime(trip.minutes)} by train`)}
  }
  /** A line's colour and names. */
  private lineTag(parent:HTMLElement,line:Entry['lines'][number]){const tag=this.el(parent,'span','phone-line');this.el(tag,'i').style.background=line.color;this.el(tag,'b','',line.ja);this.el(tag,'small','',line.en)}
  /** A result of the lookup: its Japanese name, its English one and, for a station, its lines' colours. */
  private entryRow(list:HTMLElement,entry:Entry){
    const row=this.button(list,'phone-row phone-entry',()=>{sought=entry.id;wayIn=0;this.render()});
    const text=this.el(row,'span','phone-row-text');this.el(text,'strong','',entry.kind==='station'?plain(entry.ja)+'駅':entry.ja);this.el(text,'span','',entry.kind==='station'?`${entry.en} · ${entry.region}`:`${entry.en} · place · ${entry.region}`);
    const dots=this.el(row,'span','phone-dots');for(const line of entry.lines)this.el(dots,'i').style.background=line.color;
  }
  /** The places over the picture, each a button that keeps its size as the map zooms, labelled where there is room (more of them closer in), the stations after them (all of them closer in); the red dot is where the traveller is. */
  private pins(stage:HTMLElement,canvas:HTMLCanvasElement,area:Area,walks:Walks){
    const percent=(x:number,y:number,e:HTMLElement)=>{e.style.left=x/mapWidth*100+'%';e.style.top=y/mapHeight*100+'%'};
    const pins=walks.list.map(walk=>{
      const [x,y]=place(area,walk.at),pin=this.button(stage,'phone-pin'+(walk.station?' stop':'')+(walk.id===picked?' on':''),()=>{picked=walk.id;this.render()});
      pin.setAttribute('aria-label',`${walk.en}, ${walkTime(walk.minutes)} on foot`);pin.title=walk.en;
      pin.onfocus=()=>{stage.scrollTo(0,0);const [vx,vy]=inView(x,y);if(vx<8||vy<8||vx>mapWidth-8||vy>mapHeight-8){view.x=x;view.y=y;clampView();this.layout?.()}};
      return {x,y,text:walk.en,pin,station:!!walk.station,named:area.names.includes(walk.ja)};
    });
    const names=area.names.filter(ja=>!walks.list.some(walk=>walk.ja===ja)).map(ja=>{const [x,y]=place(area,spotOf(ja)!);return {x,y,text:stationLabel(ja)}});
    const dot=walks.here&&onMap(area,walks.here)?this.el(stage,'i','phone-here'):null,here=walks.here&&place(area,walks.here),labels=this.el(stage,'div','phone-labels');
    this.layout=()=>{
      paintArea(canvas,area,inView);
      for(const {x,y,pin} of pins){const [vx,vy]=inView(x,y);percent(vx,vy,pin)}
      if(dot&&here){const [vx,vy]=inView(here[0],here[1]);percent(vx,vy,dot)}
      labels.replaceChildren();
      const seen=[...pins.filter(pin=>!pin.station),...pins.filter(pin=>pin.named),...names,...view.z>=2?pins.filter(pin=>pin.station&&!pin.named):[]].map(({x,y,text})=>{const [vx,vy]=inView(x,y);return {x:vx,y:vy,text,item:null}}).filter(({x,y})=>x>=0&&y>=0&&x<=mapWidth&&y<=mapHeight);
      labelled(seen).forEach(({text,box})=>{if(box)percent(box[0],box[1],this.el(labels,'span','phone-label'+(pins.some(pin=>pin.text===text&&!pin.station)?'':' station'),text))});
    };
    this.layout();
  }
  /** Dragging moves a zoomed map, once it has moved a little, so that a tap stays a tap, wherever it lands near a place or station. */
  private drag(stage:HTMLElement){
    let start:{x:number;y:number;at:[number,number];id:number}|null=null,moved=false;
    stage.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY,at:[view.x,view.y],id:event.pointerId};moved=false});
    stage.addEventListener('pointermove',event=>{
      if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;
      if(!moved&&(view.z===1||Math.hypot(dx,dy)<6))return;if(!moved){moved=true;stage.setPointerCapture(start.id)}
      const scale=mapWidth/stage.clientWidth/view.z;view.x=start.at[0]-dx*scale;view.y=start.at[1]-dy*scale;clampView();this.layout?.();
    });
    stage.addEventListener('pointerup',event=>{
      const tap=start&&!moved&&event.button===0&&!(event.target as HTMLElement).closest('.phone-zoom');start=null;if(!tap)return;
      // The stations are close together and the mouse moves as it clicks: a tap picks what is nearest it, if near enough.
      const reach=stage.clientWidth*.08,near=Array.from(stage.querySelectorAll<HTMLElement>('.phone-pin')).map(pin=>{const box=pin.getBoundingClientRect();return {pin,away:Math.hypot(box.x+box.width/2-event.clientX,box.y+box.height/2-event.clientY)}}).sort((a,b)=>a.away-b.away)[0];
      if(near&&near.away<reach){event.preventDefault();near.pin.click()}
    });
    stage.addEventListener('pointercancel',()=>{start=null});
    stage.addEventListener('wheel',event=>{event.preventDefault();const box=stage.getBoundingClientRect();this.zoom(event.deltaY<0?1:-1,(event.clientX-box.left)/box.width*mapWidth,(event.clientY-box.top)/box.height*mapHeight)},{passive:false});
  }
  /** A step in or out on the map, the point under the mouse staying where it is, or the place in focus or picked, or the middle. */
  zoom(by:number,x?:number,y?:number){
    if(!this.layout||!this.stage)return;
    const next=zooms[Math.min(Math.max(zooms.indexOf(view.z)+by,0),zooms.length-1)],focus=document.activeElement as HTMLElement|null;
    if(next===view.z)return;
    if(x===undefined||y===undefined){const inner=focus?.classList.contains('phone-pin')?focus:this.stage.querySelector<HTMLElement>('.phone-pin.on');x=inner?parseFloat(inner.style.left)/100*mapWidth:mapWidth/2;y=inner?parseFloat(inner.style.top)/100*mapHeight:mapHeight/2}
    const ax=view.x+(x-mapWidth/2)/view.z,ay=view.y+(y-mapHeight/2)/view.z;
    view.z=next;view.x=ax-(x-mapWidth/2)/next;view.y=ay-(y-mapHeight/2)/next;clampView();this.layout();
  }
  private avatar(parent:HTMLElement,id:Contact){const a=this.el(parent,'span','phone-avatar');a.style.background=`${contacts[id].color} url(${portraitUrl(id)}) center/100% no-repeat`}
  private when(message?:Message){return message?.at===undefined?'Yesterday':hhmm(message.at/60000)}
  /** Up a level: the conversation to the list, a place picked in Trains back to the lookup, the list, Maps or Trains to the home screen, the home screen puts the phone away. */
  back(){if(last==='home')this.close();else if(last==='trains'&&sought){sought=null;this.render()}else this.go(last==='list'||last==='maps'||last==='trains'?'home':'list')}
  private step(by:number){const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')),i=buttons.indexOf(document.activeElement as HTMLButtonElement);buttons[(i+by+buttons.length)%buttons.length]?.focus()}
  /** The gamepad, read by the scene: d-pad / stick to move between buttons, A to press, B to go back. */
  pad(step:number,press:boolean,back:boolean){if(step)this.step(step);if(press)(document.activeElement as HTMLElement|null)?.click();else if(back)this.back()}
  close(){this.destroy();this.on.close()}
  destroy(){clearInterval(this.timer);this.overlay.remove();this.previous?.focus()}
}
