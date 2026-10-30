import { fareBetween } from './fares';
import { linesAt, railLines, yamanoteStops } from './rail';

/** Paper adult fares transcribed from JR East, 2024-12-06, Fig. 2-1 p.12.
 * These are the proposed 2026 values in that document, not a live fare feed.
 * Metro/private rail and IC fares are deliberately excluded.
 * x/y are positions on the 1920×1080 wall board drawn below; the lines through each come from rail.ts. */
export interface FareStation {id:string;ja:string;en:string;fare:number;x:number;y:number}
export const tokyoStations:FareStation[]=[
{id:'kumagaya',ja:'熊谷',en:'Kumagaya',fare:1230,x:560,y:130},
{id:'ageo',ja:'上尾',en:'Ageo',fare:720,x:830,y:130},
{id:'omiya',ja:'大宮',en:'Omiya',fare:620,x:1010,y:130},
{id:'kuki',ja:'久喜',en:'Kuki',fare:910,x:1210,y:130},
{id:'oyama',ja:'小山',en:'Oyama',fare:1600,x:1430,y:130},
{id:'tsuchiura',ja:'土浦',en:'Tsuchiura',fare:1230,x:1760,y:200},
{id:'urawa',ja:'浦和',en:'Urawa',fare:440,x:1010,y:215},
{id:'akabane',ja:'赤羽',en:'Akabane',fare:260,x:1010,y:316},
{id:'toride',ja:'取手',en:'Toride',fare:810,x:1580,y:365},
{id:'kashiwa',ja:'柏',en:'Kashiwa',fare:620,x:1440,y:365},
{id:'ikebukuro',ja:'池袋',en:'Ikebukuro',fare:260,x:862,y:452},
{id:'ueno',ja:'上野',en:'Ueno',fare:200,x:1158,y:452},
{id:'shinjuku',ja:'新宿',en:'Shinjuku',fare:260,x:800,y:600},
{id:'shibuya',ja:'渋谷',en:'Shibuya',fare:260,x:846,y:731},
{id:'shimbashi',ja:'新橋',en:'Shimbashi',fare:160,x:1199,y:691},
{id:'shinagawa',ja:'品川',en:'Shinagawa',fare:210,x:1057,y:805},
{id:'kawasaki',ja:'川崎',en:'Kawasaki',fare:350,x:1057,y:860},
{id:'yokohama',ja:'横浜',en:'Yokohama',fare:530,x:930,y:940},
{id:'ofuna',ja:'大船',en:'Ofuna',fare:910,x:800,y:940},
{id:'atami',ja:'熱海',en:'Atami',fare:2090,x:380,y:940},
{id:'kichijoji',ja:'吉祥寺',en:'Kichijoji',fare:440,x:630,y:600},
{id:'tachikawa',ja:'立川',en:'Tachikawa',fare:720,x:436,y:600},
{id:'hachioji',ja:'八王子',en:'Hachioji',fare:910,x:365,y:600},
{id:'takao',ja:'高尾',en:'Takao',fare:1040,x:340,y:520},
{id:'otsuki',ja:'大月',en:'Otsuki',fare:1600,x:340,y:360},
{id:'kofu',ja:'甲府',en:'Kofu',fare:2420,x:340,y:120},
{id:'shinkoiwa',ja:'新小岩',en:'Shin-Koiwa',fare:210,x:1430,y:600},
{id:'funabashi',ja:'船橋',en:'Funabashi',fare:440,x:1680,y:600},
{id:'chiba',ja:'千葉',en:'Chiba',fare:720,x:1680,y:810},
{id:'soga',ja:'蘇我',en:'Soga',fare:810,x:1680,y:900},
// Not in the JR East figure: 51.0 km via Ofuna (Tokaido 46.5 + Yokosuka 4.5), priced with the same 2026 bands (fares.ts).
{id:'kamakura',ja:'鎌倉',en:'Kamakura',fare:1040,x:860,y:1000},
];
/** Whether a station is on this board: every station the local lines reach from Tokyo. */
export const onTokyoBoard=(ja:string)=>fareBetween('東京',ja)!==null;
// The fares worked out from the km (fares.ts) are the transcribed ones from Tokyo.
for(const station of tokyoStations)if(fareBetween('東京',station.ja)!==station.fare)throw Error(`Tokyo → ${station.en}: ¥${fareBetween('東京',station.ja)}, not the board's ¥${station.fare}`);
const svgNS='http://www.w3.org/2000/svg';
export const fareMapWidth=1920,fareMapHeight=1080;
const font='Yorimichi JP, sans-serif';
type Side='up'|'down'|'left'|'right';
type Point=[number,number];
/** x0, y0, x1, y1. */
type Box=[number,number,number,number];
const tokyo:Point=[1220,600];
const ring={x:1010,y:600,r:210};
/** The Yamanote loop as the board draws it, from Tokyo; the north half spans 16 steps, the south half 14. */
const ringAngle=(index:number)=>index<=16?-index*180/16:-180-(index-16)*180/14;
const onRing=(angle:number,r=ring.r):Point=>[ring.x+r*Math.cos(angle*Math.PI/180),ring.y+r*Math.sin(angle*Math.PI/180)];
/** The board's layout, which only says where things go: the lines themselves and their stops come from rail.ts.
 * Points are the fare stations (`tokyoStations`), the loop's stations, and `pins`: stations off the fare list where lines meet, and bends (named ↱…, never drawn). */
const pins:Record<string,Point>={東京:tokyo,御茶ノ水:[1090,525],錦糸町:[1365,600],久里浜:[1125,1000],
  '↱赤羽西':[862,420],'↱赤羽東':[1158,420],'↱新宿':[1010,600],'↱秋葉原':[1250,490],'↱錦糸町':[1365,490],'↱日暮里':[1160,365],'↱川崎':[1057,880],'↱横浜':[997,940],'↱京葉1':[1320,725],'↱京葉2':[1320,900]};
/** Which side the names of pinned stations go. */
const pinSides:Record<string,Side>={御茶ノ水:'left',錦糸町:'down',久里浜:'down'};
/** Runs from one point to another, the stations between them spread evenly, their names on `side`. A run may start or end at a station spread on an earlier one. */
const runs:[string,string,string,Side][]=[
  ['熊谷','上尾','行田 吹上 北鴻巣 鴻巣 北本 桶川 北上尾','up'],['上尾','大宮','宮原','up'],['大宮','久喜','土呂 東大宮 蓮田 白岡 新白岡','up'],['久喜','小山','東鷲宮 栗橋 古河 野木 間々田','up'],
  ['大宮','浦和','さいたま新都心 与野 北浦和','right'],['浦和','赤羽','南浦和 蕨 西川口 川口','right'],['赤羽','田端','','right'],
  ['赤羽','↱赤羽東','尾久','right'],['↱赤羽東','上野','','right'],['赤羽','↱赤羽西','十条 板橋','left'],['↱赤羽西','池袋','','left'],
  ['甲府','大月','酒折 石和温泉 春日居町 山梨市 東山梨 塩山 勝沼ぶどう郷 甲斐大和 笹子 初狩','left'],['大月','高尾','猿橋 鳥沢 梁川 四方津 上野原 藤野 相模湖','left'],['高尾','八王子','西八王子','left'],
  ['八王子','立川','豊田 日野','up'],['立川','吉祥寺','国立 西国分寺 国分寺 武蔵小金井 東小金井 武蔵境 三鷹','up'],['吉祥寺','新宿','西荻窪 荻窪 阿佐ケ谷 高円寺 中野 東中野','up'],
  ['新宿','↱新宿','四ツ谷','down'],['↱新宿','御茶ノ水','','up'],['御茶ノ水','神田','','up'],['御茶ノ水','秋葉原','','up'],['代々木','四ツ谷','','up'],
  ['日暮里','↱日暮里','','up'],['↱日暮里','柏','北千住 松戸','up'],['柏','取手','北柏 我孫子 天王台','up'],['取手','土浦','藤代 龍ケ崎市 牛久 ひたち野うしく 荒川沖','right'],
  ['東京','錦糸町','新日本橋 馬喰町','up'],['秋葉原','↱秋葉原','','up'],['↱秋葉原','↱錦糸町','','up'],['↱錦糸町','錦糸町','','up'],['錦糸町','新小岩','','up'],['新小岩','船橋','小岩 市川 本八幡 下総中山 西船橋','up'],
  ['船橋','千葉','東船橋 津田沼 幕張本郷 幕張 新検見川 稲毛 西千葉','right'],['千葉','蘇我','本千葉','right'],
  ['東京','↱京葉1','八丁堀 越中島 潮見','right'],['↱京葉1','↱京葉2','新木場 葛西臨海公園 舞浜','right'],['↱京葉2','蘇我','新浦安 市川塩浜 南船橋 新習志野 海浜幕張 検見川浜 稲毛海岸 千葉みなと','down'],
  ['品川','川崎','','right'],['川崎','↱川崎','','right'],['↱川崎','↱横浜','','down'],['↱横浜','横浜','','down'],['横浜','大船','戸塚','up'],
  ['大船','熱海','藤沢 辻堂 茅ケ崎 平塚 大磯 二宮 国府津 鴨宮 小田原 早川 根府川 真鶴 湯河原','down'],['大船','鎌倉','北鎌倉','right'],['鎌倉','久里浜','逗子 東逗子 田浦 横須賀 衣笠','down'],
];
/** Bends a line is drawn through between two of its stops, where the shortest way along the drawn track is not where it runs (the Chuo-Sobu local does not pass Tokyo). */
const drawnVia:Record<string,string[]>={'chuo-sobu 秋葉原 錦糸町':['↱秋葉原']};
/** Where each line's name is written on the board, and the shorter name the legend gives it (its own name otherwise). */
const lineLabels:Record<string,[number,number,string][]>={yamanote:[[975,660,'山手線']],saikyo:[[780,400,'埼京線']],'keihin-tohoku':[[880,262,'京浜東北線']],utsunomiya:[[1454,119,'宇都宮線']],takasaki:[[440,119,'高崎線']],
  joban:[[1640,400,'常磐線']],'joban-local':[[1250,395,'常磐線各停']],tokaido:[[560,890,'東海道線']],'yokosuka-sobu':[[1140,915,'横須賀線'],[1530,668,'総武快速線']],'chuo-rapid':[[520,630,'中央線']],
  'chuo-main':[[360,250,'中央本線']],'chuo-sobu':[[1530,638,'総武線']],keiyo:[[1410,855,'京葉線']],sotobo:[[1520,850,'外房線']]};
const legendNames:Record<string,string>={'chuo-rapid':'中央線','chuo-sobu':'中央・総武線','joban-local':'常磐線各停'};
/** A stretch of drawn track between two neighbouring points, in the direction it was laid out; `colors` are its lines' colours side by side, in rail.ts order
 * (lines of one colour share a stroke), centred on it, or growing away from `away` (the loop keeps the Yamanote Line on the circle and the others outside). */
interface Link {a:string;b:string;pts:Point[];away?:Point;colors:string[]}
const gap=9;
const plus=(p:Point,q:Point,k=1):Point=>[p[0]+q[0]*k,p[1]+q[1]*k],minus=(p:Point,q:Point):Point=>[p[0]-q[0],p[1]-q[1]],cross=(p:Point,q:Point)=>p[0]*q[1]-p[1]*q[0],dot=(p:Point,q:Point)=>p[0]*q[0]+p[1]*q[1];
const unit=(p:Point):Point=>{const l=Math.hypot(...p)||1;return [p[0]/l,p[1]/l]};
/** Where two consecutive offset segments meet: their crossing, or halfway across the gap where they run (nearly) parallel or would meet too far out. */
function join([p,p1]:[Point,Point],[q,q1]:[Point,Point]):Point{
  const r=minus(p1,p),s=minus(q1,q),d=cross(r,s),mid:Point=[(p1[0]+q[0])/2,(p1[1]+q[1])/2];
  if(Math.abs(d)<.03*Math.hypot(...r)*Math.hypot(...s))return mid;
  const x=plus(p,r,cross(minus(q,p),s)/d);return Math.hypot(...minus(x,p1))>3*gap?mid:x;
}
/** The board worked out from rail.ts and the layout: where every station sits and which side its name goes, the strokes of every local line all of whose stops are placed,
 * each offset into its place among the lines it shares track with, and where each line passes each station it stops at. */
const board=(()=>{
  let cached:ReturnType<typeof build>|null=null;return ()=>cached??=build();
  function build(){
    const place=new Map<string,Point>(),side=new Map<string,Side>(),links:Link[]=[];
    yamanoteStops.forEach((name,i)=>{
      place.set(name,onRing(ringAngle(i)));
      const a0=ringAngle(i),a1=ringAngle(i+1);links.push({a:name,b:yamanoteStops[(i+1)%yamanoteStops.length],pts:[0,1,2,3,4].map(k=>onRing(a0+(a1-a0)*k/4)),away:[ring.x,ring.y],colors:[]});
    });
    for(const [name,point] of Object.entries(pins))place.set(name,point);
    for(const station of tokyoStations)if(!place.has(station.ja))place.set(station.ja,[station.x,station.y]);
    for(const [from,to,names,s] of runs){
      const p=place.get(from)!,q=place.get(to)!,list=names?names.split(' '):[],chain=[from,...list,to];
      if(!p||!q)throw Error(`Fare board: no place for ${p?to:from}`);
      list.forEach((name,i)=>{place.set(name,plus(p,minus(q,p),(i+1)/(list.length+1)));side.set(name,s)});
      for(let i=0;i<chain.length-1;i++)links.push({a:chain[i],b:chain[i+1],pts:[place.get(chain[i])!,place.get(chain[i+1])!],colors:[]});
    }
    const steps=new Map<string,{link:Link;forward:boolean}[]>();
    for(const link of links)for(const [end,forward] of [[link.a,true],[link.b,false]] as const)steps.set(end,[...steps.get(end)??[],{link,forward}]);
    const length=(link:Link)=>link.pts.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...minus(p,link.pts[i])),0);
    // The shortest way along the drawn track between two stops, through any stations a line passes without stopping.
    const route=(from:string,to:string)=>{
      const dist=new Map([[from,0]]),back=new Map<string,{link:Link;forward:boolean}>(),open=new Set([from]);
      while(open.size){
        const here=[...open].reduce((a,b)=>dist.get(a)!<=dist.get(b)!?a:b);open.delete(here);if(here===to)break;
        for(const step of steps.get(here)??[]){const next=step.forward?step.link.b:step.link.a,d=dist.get(here)!+length(step.link);if(d<(dist.get(next)??Infinity)){dist.set(next,d);back.set(next,step);open.add(next)}}
      }
      const out:{link:Link;forward:boolean}[]=[];for(let at=to;at!==from;){const step=back.get(at);if(!step)throw Error(`Fare board: no track from ${from} to ${to}`);out.unshift(step);at=step.forward?step.link.a:step.link.b}
      return out;
    };
    const drawn=railLines.filter(line=>line.service==='local'&&line.stops.every(stop=>place.has(stop)));
    const ways=drawn.map(line=>{
      const stops=line.loop?[...line.stops,line.stops[0]]:line.stops,way=stops.slice(1).flatMap((stop,i)=>{const points=[stops[i],...drawnVia[`${line.id} ${stops[i]} ${stop}`]??[],stop];return points.slice(1).flatMap((point,k)=>route(points[k],point))});
      for(const {link} of way)if(!link.colors.includes(line.color))link.colors.push(line.color);
      return way;
    });
    // Each line's stroke: every piece of track shifted into its colour's place, consecutive pieces joined where their offsets cross.
    const offset=(link:Link,color:string)=>{
      const i=link.colors.indexOf(color),n=link.colors.length;if(!link.away)return (i-(n-1)/2)*gap;
      const [p,q]=link.pts,d=unit(minus(q,p));return i*gap*Math.sign(dot([d[1],-d[0]],minus(p,link.away))||1);
    };
    const strokes=drawn.map((line,k)=>{
      const segments:[Point,Point][]=[],at=new Map<string,number>([[line.stops[0],0]]);
      for(const {link,forward} of ways[k]){
        const pts=forward?link.pts:[...link.pts].reverse(),o=offset(link,line.color)*(forward?1:-1);
        for(let i=0;i<pts.length-1;i++){const d=unit(minus(pts[i+1],pts[i])),n:Point=[d[1],-d[0]];segments.push([plus(pts[i],n,o),plus(pts[i+1],n,o)])}
        at.set(forward?link.b:link.a,segments.length);
      }
      const last=segments.length-1,points=[line.loop?join(segments[last],segments[0]):segments[0][0],...segments.slice(1).map((s,i)=>join(segments[i],s)),...line.loop?[]:[segments[last][1]]];
      const pass=new Map(line.stops.map(stop=>[stop,points[at.get(stop)!%points.length]]));
      return {line,points,pass};
    });
    // At each station, the points of the lines that stop there (one per colour).
    const stops=new Map<string,Map<string,Point>>();
    for(const {line,pass} of strokes)for(const [stop,point] of pass){const here=stops.get(stop)??new Map();if(!here.has(line.color))here.set(line.color,point);stops.set(stop,here)}
    return {place,side,strokes,stops};
  }
})();
/** Which side of its anchor each fare cartouche sits, away from the small names. */
const cartouche:Record<string,Side|'up-left'|'down-left'|'down-right'>={kumagaya:'down',ageo:'down',omiya:'up-left',kuki:'down',oyama:'down',tsuchiura:'up',urawa:'left',akabane:'left',toride:'down',kashiwa:'down',ikebukuro:'left',ueno:'right',shinjuku:'down-left',shibuya:'left',shimbashi:'down-right',shinagawa:'down-right',kawasaki:'left',yokohama:'up',ofuna:'up',atami:'up',kichijoji:'down',tachikawa:'down',hachioji:'down',takao:'right',otsuki:'right',kofu:'right',shinkoiwa:'down-right',funabashi:'up',chiba:'left',soga:'right',kamakura:'down'};

/** An original wall board in the manner of the JR East 近距離きっぷ運賃表 above ticket machines. */
function makeTokyoFareMap(label:string,here='東京'):SVGSVGElement{
  // Every fare on the board is from the station it hangs in; its own has none.
  const fareOf=(name:string)=>{const fare=fareBetween(here,name);return fare?fare.toLocaleString('en-US'):''};
  const svg=document.createElementNS(svgNS,'svg');
  svg.setAttribute('viewBox',`0 0 ${fareMapWidth} ${fareMapHeight}`);
  svg.setAttribute('role','img');svg.setAttribute('aria-label',label);
  const el=(name:string,attrs:Record<string,string|number>,text?:string)=>{
    const node=document.createElementNS(svgNS,name);
    for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));
    if(text)node.textContent=text;
    svg.append(node);return node;
  };
  const titled=(node:Element,name:string)=>{const title=document.createElementNS(svgNS,'title');title.textContent=name;node.append(title)};
  // What is already on the board, for the 現在地 marker to keep clear of (`of`: the station it names, which its own pointer may reach).
  const taken:{r:Box;of?:string}[]=[{r:[24,24,214,1056]},{r:[1440,24,1850,104]}];
  const claim=(x0:number,y0:number,x1:number,y1:number,of?:string)=>taken.push({r:[x0,y0,x1,y1],of});
  // A stop's name and fare, away from the line: a vertical name carries its fare above or below it, a horizontal one on the same line. Small fares go without their comma to fit between neighbours.
  const small=(name:string)=>fareOf(name).replace(',','');
  const inline=(node:Element,fare:string)=>{const span=document.createElementNS(svgNS,'tspan');span.setAttribute('dx','4');span.setAttribute('fill','#123f8c');span.setAttribute('font-size','12');span.setAttribute('font-family','Arial,sans-serif');span.setAttribute('font-weight','bold');span.textContent=fare;node.append(span)};
  const stopName=(x:number,y:number,name:string,side:Side)=>{
    const vertical=side==='up'||side==='down',tall=name.length*14,fare=small(name),top=side==='up'?y-11-tall:y+11;
    const node=el('text',{
      'data-name':name,
      x:x+(side==='left'?-10:side==='right'?10:0),
      y:vertical?top:y+5,
      'text-anchor':side==='left'?'end':'start',
      'writing-mode':vertical?'vertical-rl':'horizontal-tb',
      fill:'#222','font-size':14,'font-family':font
    },name);
    if(!vertical){if(fare)inline(node,fare);const w=tall+(fare?fare.length*7+4:0);claim(side==='left'?x-10-w:x+10,y-8,side==='left'?x-10:x+10+w,y+8,name);return}
    if(fare)el('text',{x,y:side==='up'?top-3:top+tall+10,'text-anchor':'middle',fill:'#123f8c','font-size':10,'font-family':'Arial,sans-serif','font-weight':'bold'},fare);
    claim(x-(fare?fare.length*3:7),side==='up'&&fare?top-12:top,x+(fare?fare.length*3:7),side==='down'&&fare?top+tall+12:top+tall,name);
  };
  const away:Record<string,Point>={up:[0,1],down:[0,-1],left:[1,0],right:[-1,0],'up-left':[0,1],'down-left':[0,-1],'down-right':[0,-1]};

  el('rect',{x:0,y:0,width:fareMapWidth,height:fareMapHeight,fill:'#fff'});
  el('path',{d:'M1110 1080 L1110 955 Q1150 900 1225 905 L1290 960 Q1330 1000 1420 990 Q1500 975 1560 1010 L1620 1080Z',fill:'#cfe8f3'});
  el('text',{x:1185,y:1060,fill:'#8bb8cc','font-size':18,'font-family':font,'letter-spacing':6},'東京湾');
  const {place,side:sideOf,strokes,stops}=board();
  const polyline=(points:Point[],closed:boolean)=>points.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ')+(closed?` ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`:'');
  for(const casing of [true,false])for(const {line,points} of strokes)el('polyline',{points:polyline(points,!!line.loop),fill:'none',stroke:casing?'#fff':line.color,'stroke-width':casing?12:7,'stroke-linejoin':'round'});
  // A station's mark spans the lines that stop there: a dot on a single line, a pill across several (a square-ended box for the fare stations), its name once beside it.
  const mark=(name:string,points:Point[],color:string,fare:boolean)=>{
    claim(Math.min(...points.map(p=>p[0]))-6,Math.min(...points.map(p=>p[1]))-6,Math.max(...points.map(p=>p[0]))+6,Math.max(...points.map(p=>p[1]))+6,name);
    if(points.length===1){const [x,y]=points[0];titled(fare?el('rect',{x:x-6,y:y-6,width:12,height:12,fill:'#fff',stroke:'#1d1d1d','stroke-width':2.5,'data-name':name}):el('circle',{cx:x,cy:y,r:4,fill:'#fff',stroke:color,'stroke-width':2,'data-name':name}),name);return}
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),pad=fare?6:4,x=Math.min(...xs)-pad,y=Math.min(...ys)-pad;
    titled(el('rect',{x,y,width:Math.max(...xs)+pad-x,height:Math.max(...ys)+pad-y,rx:fare?1:pad,fill:'#fff',stroke:fare?'#1d1d1d':'#333','stroke-width':fare?2.5:1.5,'data-name':name}),name);
  };
  // How far the lines spread from a station's place towards where its name goes, so the name clears them.
  const spread=(base:Point,points:Point[],towards:Point)=>Math.max(0,...points.map(p=>dot(minus(p,base),unit(towards))));
  const ringIndex=new Map(yamanoteStops.map((name,i)=>[name,i]));
  // All the marks first, then the names, which go over the lines and marks they reach.
  for(const [name,here] of stops)if(name!=='東京')mark(name,[...here.values()],[...here.keys()][0],tokyoStations.some(station=>station.ja===name));
  for(const [name,here] of stops){
    if(name==='東京')continue;
    const base=place.get(name)!,points=[...here.values()],fare=tokyoStations.find(station=>station.ja===name);
    if(fare){
      const s=cartouche[fare.id],[x,y]=plus(base,away[s],-spread(base,points,minus([0,0],away[s]))),w=Math.max(54,name.length*19+14),h=24;
      const bx=s==='left'?x-12-w:s==='right'?x+12:s==='up-left'?x+12-w:s==='down-left'?x-10-w:s==='down-right'?x+6:x-w/2;
      const by=s==='up'||s==='up-left'?y-12-h*2:s==='down'||s==='down-left'||s==='down-right'?y+12:y-h;
      const data={'data-name':name};claim(bx,by,bx+w,by+h*2,name);
      el('rect',{x:bx,y:by,width:w,height:h,fill:'#1d2b3a',...data});
      el('text',{x:bx+w/2,y:by+18,'text-anchor':'middle',fill:'#fff','font-size':17,'font-family':font,...data},name);
      el('rect',{x:bx,y:by+h,width:w,height:h,fill:'#fff',stroke:'#1d2b3a','stroke-width':1.5,...data});
      el('text',{x:bx+w/2,y:by+h+19,'text-anchor':'middle',fill:'#123f8c','font-size':18,'font-family':'Arial,sans-serif','font-weight':'bold',...data},fareOf(name));
    }else if(ringIndex.has(name)){
      const angle=ringAngle(ringIndex.get(name)!),c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
      // Names sit inside the loop, written vertically near its top and bottom so neighbours do not collide; the fare past the end of a vertical name, on the line of a level one.
      const [lx,ly]=onRing(angle,ring.r-13-spread(base,points,[-c,-s])),vertical=Math.abs(s)>.6,tall=name.length*14,fare=small(name),top=vertical&&s>0?ly-tall:ly;
      const node=el('text',{'data-name':name,x:lx,y:vertical?top:ly+5,'text-anchor':vertical||c<0?'start':'end','writing-mode':vertical?'vertical-rl':'horizontal-tb',fill:'#222','font-size':14,'font-family':font},name);
      if(vertical){if(fare)el('text',{x:lx,y:s<0?ly+tall+10:top-3,'text-anchor':'middle',fill:'#123f8c','font-size':10,'font-family':'Arial,sans-serif','font-weight':'bold'},fare);claim(lx-(fare?fare.length*3:7),top-(s>0&&fare?12:0),lx+(fare?fare.length*3:7),top+tall+(s<0&&fare?12:0),name)}
      else{if(fare)inline(node,fare);const w=tall+(fare?fare.length*7+4:0);claim(c<0?lx:lx-w,ly-8,c<0?lx+w:lx,ly+8,name)}
    }else{
      const s=sideOf.get(name)??pinSides[name]??'up',[x,y]=plus(base,away[s],-spread(base,points,minus([0,0],away[s])));
      stopName(x,y,name,s);
    }
  }
  // The current station is red, like the 現在地 box of the real boards; Tokyo keeps its big name box either way.
  const atTokyo=here==='東京';const tall=atTokyo?44:56;claim(tokyo[0]-36,tokyo[1]-24,tokyo[0]+36,tokyo[1]-22+tall+2,'東京');
  el('rect',{x:tokyo[0]-34,y:tokyo[1]-22,width:68,height:tall,fill:atTokyo?'#c8102e':'#fff',stroke:atTokyo?'#fff':'#1d1d1d','stroke-width':3,'data-name':'東京'});
  el('text',{x:tokyo[0],y:tokyo[1]+(atTokyo?9:6),'text-anchor':'middle',fill:atTokyo?'#fff':'#1d1d1d','font-size':atTokyo?25:23,'font-family':font,'font-weight':'bold','data-name':'東京'},'東京');
  if(!atTokyo)el('text',{x:tokyo[0],y:tokyo[1]+29,'text-anchor':'middle',fill:'#123f8c','font-size':16,'font-family':'Arial,sans-serif','font-weight':'bold'},fareOf('東京'));
  if(!atTokyo)svg.querySelectorAll(`[data-name="${here}"]`).forEach(node=>{
    const fill=node.getAttribute('fill');
    if(node.tagName==='text'){if(fill==='#222'){node.setAttribute('fill','#e60012');node.setAttribute('font-weight','bold')}return}
    if(fill==='#1d2b3a')node.setAttribute('fill','#c8102e');else if(node.getAttribute('stroke')==='#1d2b3a')node.setAttribute('stroke','#c8102e');else{node.setAttribute('fill','#e60012');if(node.tagName==='circle')node.setAttribute('r','6')}
  });
  // Each line's name on a plate of its colour, and the legend: one row per colour drawn, naming its lines.
  const dark=(color:string)=>parseInt(color.slice(1,3),16)*.3+parseInt(color.slice(3,5),16)*.59+parseInt(color.slice(5,7),16)*.11<170;
  for(const {line} of strokes)for(const [x,y,name] of lineLabels[line.id]??[]){
    el('rect',{x,y,width:name.length*15+16,height:22,fill:line.color,rx:3});
    el('text',{x:x+8,y:y+16,fill:dark(line.color)?'#fff':'#222','font-size':14,'font-family':font,'font-weight':'bold'},name);
    claim(x,y,x+name.length*15+16,y+22);
  }
  // 現在地: a red tag, its pointer reaching the station's mark or name, in the free spot nearest to it. Going far is cheap next to covering a name, and crossing a line next to either.
  const base=place.get(here);
  if(base){
    const inside=(p:Point,[x0,y0,x1,y1]:Box,m=0)=>p[0]>x0-m&&p[0]<x1+m&&p[1]>y0-m&&p[1]<y1+m;
    const track=strokes.flatMap(({points})=>points.slice(1).flatMap((p,i)=>{const n=Math.ceil(Math.hypot(...minus(p,points[i]))/8);return Array.from({length:n},(_,k):Point=>plus(points[i],minus(p,points[i]),k/n))}));
    const own=taken.filter(t=>t.of===here).map(t=>t.r),tw=62,th=26;
    // The pointer stops at the edge of what names the station; its head, wider than its shaft, must find room there too.
    const cost=(d:Point,dist:number)=>{
      const c=plus(base,d,dist+Math.abs(d[0])*tw/2+Math.abs(d[1])*th/2),box:Box=[c[0]-tw/2,c[1]-th/2,c[0]+tw/2,c[1]+th/2],n:Point=[-d[1],d[0]];
      if(box[0]<218||box[1]<4||box[2]>1916||box[3]>1076)return null;
      let tip=0,sum=dist*.2;for(let t=0;t<dist;t+=2)if(own.some(r=>inside(plus(base,d,t),r,2)))tip=t+2;
      for(const {r} of taken)if(Math.min(box[2],r[2])>Math.max(box[0],r[0])-4&&Math.min(box[3],r[3])>Math.max(box[1],r[1])-4)sum+=5000;
      for(const p of track)if(inside(p,box,5))sum+=12;
      for(let t=tip;t<dist;t+=4)for(const side of t<tip+16?[-8,0,8]:[0]){const p=plus(plus(base,d,t),n,side);if(taken.some(({r})=>inside(p,r,1)))sum+=200}
      return {c,tip,sum};
    };
    let best:{c:Point;d:Point;tip:number;sum:number}|null=null;
    for(const dist of [26,40,56,76,100,130,165,205])for(let k=0;k<16;k++){const d:Point=[Math.cos(k*Math.PI/8),Math.sin(k*Math.PI/8)],found=cost(d,dist);if(found&&(!best||found.sum<best.sum))best={...found,d}}
    if(best){
      const {c,d}=best,tip=plus(base,d,best.tip),n:Point=[-d[1],d[0]],neck=plus(tip,d,14),wing=(k:number)=>plus(neck,n,k).map(v=>v.toFixed(1)).join(' ');
      el('line',{x1:neck[0],y1:neck[1],x2:c[0],y2:c[1],stroke:'#fff','stroke-width':9});
      el('line',{x1:neck[0],y1:neck[1],x2:c[0],y2:c[1],stroke:'#e60012','stroke-width':5});
      el('path',{d:`M${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L${wing(9)} L${wing(-9)}Z`,fill:'#e60012',stroke:'#fff','stroke-width':1.5});
      el('rect',{x:c[0]-tw/2,y:c[1]-th/2,width:tw,height:th,rx:3,fill:'#e60012',stroke:'#fff','stroke-width':2});
      el('text',{x:c[0],y:c[1]+6,'text-anchor':'middle',fill:'#fff','font-size':17,'font-family':font,'font-weight':'bold'},'現在地');
    }
  }
  // Header and side panel, after the wall boards: white board, green JR band, legend column.
  el('rect',{x:1440,y:24,width:22,height:22,fill:'#008a3e'});
  el('text',{x:1472,y:46,fill:'#111','font-size':30,'font-family':font,'font-weight':'bold'},'JR線 近距離きっぷ運賃表');
  el('rect',{x:1822,y:24,width:22,height:22,fill:'#008a3e'});
  el('text',{x:1472,y:76,fill:'#333','font-size':15,'font-family':font},`${here}駅から · おとな片道（単位：円） こどもは半額`);
  el('text',{x:1472,y:98,fill:'#d0021b','font-size':13,'font-family':font},'ICカードの運賃は異なります。この表はきっぷの運賃です。');
  el('rect',{x:24,y:24,width:190,height:1032,fill:'#fff',stroke:'#008a3e','stroke-width':5});
  el('rect',{x:24,y:24,width:190,height:44,fill:'#008a3e'});
  el('text',{x:119,y:53,'text-anchor':'middle',fill:'#fff','font-size':19,'font-family':font,'font-weight':'bold'},'運賃のみかた');
  el('rect',{x:46,y:92,width:70,height:24,fill:'#1d2b3a'});el('text',{x:81,y:110,'text-anchor':'middle',fill:'#fff','font-size':17,'font-family':font},'駅名');
  el('rect',{x:46,y:116,width:70,height:24,fill:'#fff',stroke:'#1d2b3a','stroke-width':1.5});el('text',{x:81,y:135,'text-anchor':'middle',fill:'#123f8c','font-size':18,'font-family':'Arial','font-weight':'bold'},'260');
  el('text',{x:126,y:110,fill:'#333','font-size':13,'font-family':font},'駅名');el('text',{x:126,y:135,fill:'#333','font-size':13,'font-family':font},'運賃（円）');
  el('circle',{cx:52,cy:168,r:4,fill:'#fff',stroke:'#333','stroke-width':2});el('text',{x:64,y:173,fill:'#333','font-size':13,'font-family':font},'駅名');el('text',{x:94,y:173,fill:'#123f8c','font-size':12,'font-family':'Arial,sans-serif','font-weight':'bold'},'210');el('text',{x:46,y:194,fill:'#333','font-size':13,'font-family':font},'その他の駅と運賃');
  el('text',{x:46,y:236,fill:'#008a3e','font-size':16,'font-family':font,'font-weight':'bold'},'路線');
  const legend=new Map<string,string[]>();for(const {line} of strokes){const names=legend.get(line.color)??[];names.push(legendNames[line.id]??line.ja);legend.set(line.color,names)}
  [...legend].forEach(([color,names],index)=>{el('rect',{x:46,y:252+index*24,width:34,height:8,fill:color});el('text',{x:88,y:261+index*24,fill:'#222','font-size':13,'font-family':font},names.join('・'))});
  el('text',{x:46,y:560,fill:'#008a3e','font-size':16,'font-family':font,'font-weight':'bold'},'運賃一覧');
  [...new Set([...stops.keys()].map(name=>fareBetween(here,name)??0).filter(fare=>fare>0))].sort((a,b)=>a-b).forEach((fare,index)=>{const x=46+(index%2)*86,y=580+Math.floor(index/2)*30;el('rect',{x,y,width:76,height:24,fill:'#fff',stroke:'#9aa5b1'});el('text',{x:x+38,y:y+18,'text-anchor':'middle',fill:'#123f8c','font-size':16,'font-family':'Arial','font-weight':'bold'},fare.toLocaleString('en-US'))});
  el('text',{x:46,y:1000,fill:'#666','font-size':12,'font-family':font},'JR線のみ · 一部の駅を掲載');
  el('text',{x:46,y:1020,fill:'#666','font-size':12,'font-family':font},'ゲーム用参考図');
  return svg;
}

export function renderTokyoFareMap(here?:string):SVGSVGElement{
  return makeTokyoFareMap(`${here??'東京'}駅からのJR運賃表。主な駅の大人きっぷ運賃。`,here);
}

/** The station staff's fare hint: the stations to ask about (`destinations`), each with the local lines through it; choosing one says its fare (`select`). Not a fare lookup at the machines. */
export function openDepartures(destinations:{ja:string;en:string}[],select:(station:{ja:string;en:string})=>void,close:()=>void){
  const overlay=document.createElement('div');overlay.className='jr-departure-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','JR destinations');
  const board=document.createElement('section');board.className='jr-departure-board';overlay.append(board);
  const heading=document.createElement('h2');heading.textContent='駅員 / A fare hint';board.append(heading);
  const description=document.createElement('p');description.textContent='Ask for a station’s fare. This hint neither chooses nor buys your ticket.';board.append(description);
  const cancel=document.createElement('button');cancel.textContent='Back to the hall';cancel.className='departure-close';cancel.onclick=close;board.append(cancel);
  const list=document.createElement('div');list.className='jr-destination-list';board.append(list);
  for(const station of destinations){const button=document.createElement('button');button.textContent=station.ja+' / '+station.en;const line=document.createElement('small');line.textContent=linesAt(station.ja,'local').map(line=>line.en).join(' / ');button.append(line);button.onclick=()=>select(station);list.append(button)}
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close()}if(event.key==='Tab'){const buttons=Array.from(overlay.querySelectorAll('button')),last=buttons.at(-1);if(event.shiftKey&&document.activeElement===cancel){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();cancel.focus()}}});
  overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)close()});
  document.body.append(overlay);cancel.focus();return{destroy:()=>overlay.remove()};
}

/** The same fare data, re-laid out for a wide physical board above the machines. */
export function renderWallFareMap(here?:string):SVGSVGElement{
  return makeTokyoFareMap(`${here??'東京'}駅からのJR運賃表。主な駅の大人きっぷ運賃。`,here);
}
