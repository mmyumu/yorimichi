/** Paper adult fares transcribed from JR East, 2024-12-06, Fig. 2-1 p.12.
 * These are the proposed 2026 values in that document, not a live fare feed.
 * Metro/private rail and IC fares are deliberately excluded.
 * x/y are positions on the 1920×1080 wall board drawn below. */
export interface FareStation {id:string;ja:string;en:string;fare:number;x:number;y:number;line:string}
export const tokyoStations:FareStation[]=[
{id:'kumagaya',ja:'熊谷',en:'Kumagaya',fare:1230,x:750,y:150,line:'Takasaki'},
{id:'ageo',ja:'上尾',en:'Ageo',fare:720,x:900,y:150,line:'Takasaki'},
{id:'omiya',ja:'大宮',en:'Omiya',fare:620,x:1010,y:150,line:'Utsunomiya / Takasaki'},
{id:'kuki',ja:'久喜',en:'Kuki',fare:910,x:1166,y:150,line:'Utsunomiya'},
{id:'oyama',ja:'小山',en:'Oyama',fare:1600,x:1322,y:150,line:'Utsunomiya'},
{id:'tsuchiura',ja:'土浦',en:'Tsuchiura',fare:1230,x:1760,y:200,line:'Joban'},
{id:'urawa',ja:'浦和',en:'Urawa',fare:440,x:1010,y:235,line:'Utsunomiya / Takasaki'},
{id:'akabane',ja:'赤羽',en:'Akabane',fare:260,x:1010,y:330,line:'Utsunomiya / Takasaki'},
{id:'toride',ja:'取手',en:'Toride',fare:810,x:1580,y:380,line:'Joban'},
{id:'kashiwa',ja:'柏',en:'Kashiwa',fare:620,x:1440,y:380,line:'Joban'},
{id:'ikebukuro',ja:'池袋',en:'Ikebukuro',fare:260,x:886,y:486,line:'Yamanote'},
{id:'ueno',ja:'上野',en:'Ueno',fare:200,x:1134,y:486,line:'Yamanote / Ueno-Tokyo'},
{id:'shinjuku',ja:'新宿',en:'Shinjuku',fare:260,x:835,y:610,line:'Chuo / Yamanote'},
{id:'shibuya',ja:'渋谷',en:'Shibuya',fare:260,x:873,y:719,line:'Yamanote'},
{id:'shimbashi',ja:'新橋',en:'Shimbashi',fare:160,x:1168,y:686,line:'Yamanote / Tokaido'},
{id:'shinagawa',ja:'品川',en:'Shinagawa',fare:210,x:1049,y:781,line:'Yamanote / Tokaido'},
{id:'kawasaki',ja:'川崎',en:'Kawasaki',fare:350,x:1049,y:860,line:'Tokaido'},
{id:'yokohama',ja:'横浜',en:'Yokohama',fare:530,x:930,y:940,line:'Tokaido'},
{id:'ofuna',ja:'大船',en:'Ofuna',fare:910,x:800,y:940,line:'Tokaido'},
{id:'atami',ja:'熱海',en:'Atami',fare:2090,x:380,y:940,line:'Tokaido'},
{id:'kichijoji',ja:'吉祥寺',en:'Kichijoji',fare:440,x:653,y:610,line:'Chuo'},
{id:'tachikawa',ja:'立川',en:'Tachikawa',fare:720,x:445,y:610,line:'Chuo'},
{id:'hachioji',ja:'八王子',en:'Hachioji',fare:910,x:365,y:610,line:'Chuo'},
{id:'takao',ja:'高尾',en:'Takao',fare:1040,x:340,y:560,line:'Chuo'},
{id:'otsuki',ja:'大月',en:'Otsuki',fare:1600,x:340,y:380,line:'Chuo'},
{id:'kofu',ja:'甲府',en:'Kofu',fare:2420,x:340,y:130,line:'Chuo'},
{id:'shinkoiwa',ja:'新小岩',en:'Shin-Koiwa',fare:210,x:1345,y:610,line:'Sobu'},
{id:'funabashi',ja:'船橋',en:'Funabashi',fare:440,x:1600,y:610,line:'Sobu'},
{id:'chiba',ja:'千葉',en:'Chiba',fare:720,x:1600,y:810,line:'Sobu'},
{id:'soga',ja:'蘇我',en:'Soga',fare:810,x:1600,y:900,line:'Sobu / Sotobo'},
// Not in the JR East figure: 51.0 km via Ofuna (Tokaido 46.5 + Yokosuka 4.5), priced with the same 2026 bands below.
{id:'kamakura',ja:'鎌倉',en:'Kamakura',fare:1040,x:880,y:970,line:'Tokaido / Yokosuka'},
];
export const tokyoFareAmounts=[...new Set(tokyoStations.map(station=>station.fare))].sort((a,b)=>a-b);
/** JR East 幹線 adult paper fares from the March 2026 revision, by operating km rounded up; they reproduce the 30 transcribed fares above. */
const fareBands:[number,number][]=[[3,160],[6,200],[10,210],[15,260],[20,350],[25,440],[30,530],[35,620],[40,720],[45,810],[50,910],[60,1040],[70,1230],[80,1410],[90,1600],[100,1790],[120,2090],[140,2420]];
export const fareForKm=(km:number)=>fareBands.find(([max])=>Math.ceil(km)<=max)![1];
/** Shortest operating km from Tokyo for the other stops on the board, from the Wikipedia station tables (October 2026). */
export const stopKm:Record<string,number>={北鎌倉:48.8,逗子:54.9,東逗子:56.9,田浦:60.3,横須賀:62.4,衣笠:64.8,久里浜:70.4,神田:1.3,秋葉原:2,御徒町:3,鶯谷:4.7,日暮里:5.8,西日暮里:6.3,田端:7.1,駒込:8.7,巣鴨:9.4,大塚:10.5,目白:13.5,高田馬場:13,新大久保:11.6,代々木:9.6,原宿:11.1,恵比寿:12.4,目黒:10.9,五反田:9.7,大崎:8.8,高輪ゲートウェイ:5.9,田町:4.6,浜松町:3.1,有楽町:0.8,行田:59.9,吹上:57.6,北鴻巣:54.6,鴻巣:50.3,北本:46.7,桶川:42.1,北上尾:40.2,宮原:34.3,土呂:33.3,東大宮:35.4,蓮田:39.2,白岡:43.5,新白岡:45.9,東鷲宮:51.6,栗橋:57.2,古河:64.7,野木:69.4,間々田:73.3,さいたま新都心:28.7,与野:27.6,北浦和:26,南浦和:22.5,蕨:19.7,西川口:17.8,川口:15.8,十条:15.2,板橋:14.1,尾久:8.4,酒折:131.2,石和温泉:127.8,春日居町:125,山梨市:122.2,東山梨:120.1,塩山:116.9,勝沼ぶどう郷:112.5,甲斐大和:106.5,笹子:100.4,初狩:93.9,猿橋:85.3,鳥沢:81.2,梁川:77.6,四方津:74,上野原:69.8,藤野:66.3,相模湖:62.6,西八王子:49.8,豊田:43.1,日野:40.8,国立:34.5,西国分寺:32.8,国分寺:31.4,武蔵小金井:29.1,東小金井:27.4,武蔵境:25.7,三鷹:24.1,西荻窪:20.6,荻窪:18.7,阿佐ケ谷:17.3,高円寺:16.1,中野:14.7,四ツ谷:6.6,御茶ノ水:2.6,北千住:11,松戸:21.5,北柏:35,我孫子:37.1,天王台:39.8,藤代:49.2,龍ケ崎市:51.3,牛久:56.4,ひたち野うしく:60.3,荒川沖:63,新日本橋:1.2,馬喰町:2.3,錦糸町:4.8,小岩:12.8,市川:15.4,本八幡:17.4,下総中山:19,西船橋:20.6,東船橋:25,津田沼:26.7,幕張本郷:29.6,幕張:31.6,新検見川:33.2,稲毛:35.9,西千葉:37.8,本千葉:40.6,八丁堀:1.2,越中島:2.8,潮見:5.4,新木場:7.4,葛西臨海公園:10.6,舞浜:12.7,新浦安:16.1,市川塩浜:18.2,南船橋:26,新習志野:28.3,海浜幕張:31.7,検見川浜:33.7,稲毛海岸:35.3,千葉みなと:39,戸塚:40.9,藤沢:51.1,辻堂:54.8,茅ケ崎:58.6,平塚:63.8,大磯:67.8,二宮:73.1,国府津:77.7,鴨宮:80.8,小田原:83.9,早川:86,根府川:90.4,真鶴:95.8,湯河原:99.1};
const svgNS='http://www.w3.org/2000/svg';
export const fareMapWidth=1920,fareMapHeight=1080;
const font='Yorimichi JP, sans-serif';
type Side='up'|'down'|'left'|'right';
type Point=[number,number];
const at=(id:string):Point=>{const s=tokyoStations.find(station=>station.id===id)!;return[s.x,s.y]};
const tokyo:Point=[1185,610];
const ring={x:1010,y:610,r:175};
/** Yamanote stations clockwise from Tokyo; the north half spans 16 steps, the south half 14. */
const yamanote=['東京','神田','秋葉原','御徒町','上野','鶯谷','日暮里','西日暮里','田端','駒込','巣鴨','大塚','池袋','目白','高田馬場','新大久保','新宿','代々木','原宿','渋谷','恵比寿','目黒','五反田','大崎','品川','高輪ゲートウェイ','田町','浜松町','新橋','有楽町'];
const ringAngle=(index:number)=>index<=16?-index*180/16:-180-(index-16)*180/14;
const onRing=(angle:number,r=ring.r):Point=>[ring.x+r*Math.cos(angle*Math.PI/180),ring.y+r*Math.sin(angle*Math.PI/180)];
/** Line colours. */
export const fareLines={yamanote:'#80c241',chuo:'#f15a22',takasaki:'#f68b1f',keihin:'#00b2e5',joban:'#00a07a',sobu:'#ffd400',tokaido:'#f39a2d',keiyo:'#d01827',yokosuka:'#0067c0'};
const L=fareLines;
/** Segments between two anchors, with the intermediate stops and the side their names go on. */
const segments:[Point,Point,string[],Side,string][]=[
  [at('kumagaya'),at('ageo'),['行田','吹上','北鴻巣','鴻巣','北本','桶川','北上尾'],'up',L.takasaki],
  [at('ageo'),at('omiya'),['宮原'],'up',L.takasaki],
  [at('omiya'),at('kuki'),['土呂','東大宮','蓮田','白岡','新白岡'],'up',L.takasaki],
  [at('kuki'),at('oyama'),['東鷲宮','栗橋','古河','野木','間々田'],'up',L.takasaki],
  [at('omiya'),at('urawa'),['さいたま新都心','与野','北浦和'],'right',L.keihin],
  [at('urawa'),at('akabane'),['南浦和','蕨','西川口','川口'],'right',L.keihin],
  [[1010,330],[886,454],['十条','板橋'],'left',L.keihin],
  [[1010,330],[1134,454],['尾久'],'right',L.keihin],
  [at('kofu'),at('otsuki'),['酒折','石和温泉','春日居町','山梨市','東山梨','塩山','勝沼ぶどう郷','甲斐大和','笹子','初狩'],'left',L.chuo],
  [at('otsuki'),at('takao'),['猿橋','鳥沢','梁川','四方津','上野原','藤野','相模湖'],'left',L.chuo],
  [at('takao'),at('hachioji'),['西八王子'],'left',L.chuo],
  [at('hachioji'),at('tachikawa'),['豊田','日野'],'up',L.chuo],
  [at('tachikawa'),at('kichijoji'),['国立','西国分寺','国分寺','武蔵小金井','東小金井','武蔵境','三鷹'],'up',L.chuo],
  [at('kichijoji'),at('shinjuku'),['西荻窪','荻窪','阿佐ケ谷','高円寺','中野'],'up',L.chuo],
  [at('shinjuku'),tokyo,['四ツ谷','御茶ノ水'],'up',L.chuo],
  [[1214,380],at('kashiwa'),['日暮里','北千住','松戸'],'up',L.joban],
  [at('kashiwa'),at('toride'),['北柏','我孫子','天王台'],'up',L.joban],
  [at('toride'),at('tsuchiura'),['藤代','龍ケ崎市','牛久','ひたち野うしく','荒川沖'],'right',L.joban],
  [tokyo,at('shinkoiwa'),['新日本橋','馬喰町','錦糸町'],'up',L.sobu],
  [at('shinkoiwa'),at('funabashi'),['小岩','市川','本八幡','下総中山','西船橋'],'up',L.sobu],
  [at('funabashi'),at('chiba'),['東船橋','津田沼','幕張本郷','幕張','新検見川','稲毛','西千葉'],'right',L.sobu],
  [at('chiba'),at('soga'),['本千葉'],'right',L.sobu],
  [tokyo,[1300,725],['八丁堀','越中島','潮見'],'right',L.keiyo],
  [[1300,725],[1300,900],['新木場','葛西臨海公園','舞浜'],'left',L.keiyo],
  [[1300,900],at('soga'),['新浦安','市川塩浜','南船橋','新習志野','海浜幕張','検見川浜','稲毛海岸','千葉みなと'],'down',L.keiyo],
  [[989,940],at('yokohama'),[],'down',L.tokaido],
  [at('yokohama'),at('ofuna'),['戸塚'],'up',L.tokaido],
  [at('ofuna'),at('kamakura'),['北鎌倉'],'right',L.yokosuka],
  [at('kamakura'),[1125,970],['逗子','東逗子','田浦','横須賀','衣笠','久里浜'],'down',L.yokosuka],
  [at('ofuna'),at('atami'),['藤沢','辻堂','茅ケ崎','平塚','大磯','二宮','国府津','鴨宮','小田原','早川','根府川','真鶴','湯河原'],'down',L.tokaido],
];
/** Polylines drawn under the stops; corners follow the 45° grammar of station boards. */
const tracks:[Point[],string][]=[
  [[at('kumagaya'),at('oyama')],L.takasaki],
  [[at('omiya'),at('akabane'),[886,454],at('ikebukuro')],L.keihin],
  [[at('akabane'),[1134,454],at('ueno')],L.keihin],
  [[at('kofu'),at('takao'),at('hachioji'),tokyo],L.chuo],
  [[at('ueno'),[1214,406],[1214,380],at('toride'),at('tsuchiura')],L.joban],
  [[tokyo,at('funabashi'),at('soga')],L.sobu],
  [[tokyo,[1300,725],[1300,900],at('soga')],L.keiyo],
  [[...Array.from({length:8},(_,i)=>onRing(i*77.14/7,ring.r+13)),at('kawasaki'),[1049,880],[989,940],at('atami')],L.tokaido],
  [[at('ofuna'),at('kamakura'),[1090,970]],L.yokosuka],
];
/** Which side of its anchor each fare cartouche sits, away from the small names. */
const cartouche:Record<string,Side|'down-left'|'down-right'>={kumagaya:'down',ageo:'down',omiya:'down-left',kuki:'down',oyama:'down',tsuchiura:'right',urawa:'left',akabane:'left',toride:'down',kashiwa:'down',ikebukuro:'left',ueno:'right',shinjuku:'down-left',shibuya:'left',shimbashi:'right',shinagawa:'right',kawasaki:'right',yokohama:'up',ofuna:'up',atami:'up',kichijoji:'down',tachikawa:'down',hachioji:'down',takao:'right',otsuki:'right',kofu:'right',shinkoiwa:'down-right',funabashi:'up',chiba:'left',soga:'right',kamakura:'down'};

/** An original wall board in the manner of the JR East 近距離きっぷ運賃表 above ticket machines. */
function makeTokyoFareMap(label:string,here='東京'):SVGSVGElement{
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
  // The fare follows the name, away from the line. Vertical names take it as 縦中横 (three digits side by side) or as upright stacked digits; horizontal names inline.
  const fareLabel=(node:Element,x:number,y:number,name:string,vertical:boolean,after:boolean)=>{
    const fare=String(fareForKm(stopKm[name]));
    const style={fill:'#123f8c','font-size':11,'font-family':'Arial,sans-serif','font-weight':'bold'};
    if(vertical&&fare.length<=3){el('text',{x,y:after?y+name.length*13+12:y-3,'text-anchor':'middle',...style,'font-size':10},fare);return}
    if(vertical){el('text',{x,y:after?y+name.length*13+3:y-3-fare.length*11,'writing-mode':'vertical-rl',style:'text-orientation:upright',...style},fare);return}
    const span=document.createElementNS(svgNS,'tspan');span.setAttribute('dx','4');span.setAttribute('fill','#123f8c');span.setAttribute('font-size','12');span.setAttribute('font-family','Arial,sans-serif');span.setAttribute('font-weight','bold');span.textContent=fare;node.append(span);
  };
  const stopName=(x:number,y:number,name:string,side:Side)=>{
    const vertical=side==='up'||side==='down';
    const node=el('text',{
      'data-name':name,
      x:x+(side==='left'?-10:side==='right'?10:0),
      y:side==='up'?y-11-name.length*13:side==='down'?y+11:y+5,
      'text-anchor':side==='left'?'end':side==='right'||vertical?'start':'middle',
      'writing-mode':vertical?'vertical-rl':'horizontal-tb',
      fill:'#222','font-size':13,'font-family':font
    },name);
    fareLabel(node,x,side==='up'?y-11-name.length*13:y+11,name,vertical,side==='down');
  };
  // Where each station sits and the direction its labels leave free, for the 現在地 arrow.
  const spots=new Map<string,[number,number,number,number]>([['東京',[...tokyo,-1,0]]]);
  const away:Record<string,Point>={up:[0,1],down:[0,-1],left:[1,0],right:[-1,0],'down-left':[0,-1],'down-right':[0,-1]};
  const stop=(x:number,y:number,name:string,color:string,free:Point)=>{if(!spots.has(name))spots.set(name,[x,y,...free]);titled(el('circle',{cx:x,cy:y,r:4,fill:'#fff',stroke:color,'stroke-width':2,'data-name':name}),name)};

  el('rect',{x:0,y:0,width:fareMapWidth,height:fareMapHeight,fill:'#fff'});
  el('path',{d:'M1110 1080 L1110 955 Q1150 900 1225 905 L1290 960 Q1330 1000 1420 990 Q1500 975 1560 1010 L1620 1080Z',fill:'#cfe8f3'});
  el('text',{x:1185,y:1060,fill:'#8bb8cc','font-size':18,'font-family':font,'letter-spacing':6},'東京湾');
  for(const [points,color] of tracks){
    const d=points.map(([x,y])=>`${x},${y}`).join(' ');
    el('polyline',{points:d,fill:'none',stroke:'#fff','stroke-width':12,'stroke-linejoin':'round'});
    el('polyline',{points:d,fill:'none',stroke:color,'stroke-width':7,'stroke-linejoin':'round'});
  }
  el('circle',{cx:ring.x,cy:ring.y,r:ring.r,fill:'none',stroke:'#fff','stroke-width':16});
  el('circle',{cx:ring.x,cy:ring.y,r:ring.r,fill:'none',stroke:L.yamanote,'stroke-width':10});
  const priced=new Set(tokyoStations.map(station=>station.ja));
  yamanote.forEach((name,index)=>{
    if(index===0||priced.has(name))return;
    const angle=ringAngle(index),[x,y]=onRing(angle),c=Math.cos(angle*Math.PI/180),s=Math.sin(angle*Math.PI/180);
    stop(x,y,name,L.yamanote,[c,s]);
    // Names sit inside the loop, written vertically near its top and bottom so neighbours do not collide.
    const [lx,ly]=onRing(angle,ring.r-13),vertical=Math.abs(s)>.6;
    // Inside the loop there is no room for digit columns: the fare is a short line of its own, past the end of the name or, beside the loop, outward of it.
    const top=vertical&&s>0?ly-name.length*13:ly;
    el('text',{'data-name':name,x:lx,y:vertical?top:ly+5,'text-anchor':vertical||c<0?'start':'end','writing-mode':vertical?'vertical-rl':'horizontal-tb',fill:'#222','font-size':13,'font-family':font},name);
    el('text',{x:lx,y:!vertical?(s<0?ly-9:ly+18):s<0?ly+name.length*13+11:top-4,'text-anchor':vertical?'middle':c<0?'start':'end',fill:'#123f8c','font-size':11,'font-family':'Arial,sans-serif','font-weight':'bold'},String(fareForKm(stopKm[name])));
  });
  for(const [from,to,names,side,color] of segments){
    names.forEach((name,index)=>{
      const t=(index+1)/(names.length+1),x=from[0]+(to[0]-from[0])*t,y=from[1]+(to[1]-from[1])*t;
      stop(x,y,name,color,away[side]);stopName(x,y,name,side);
    });
  }
  for(const station of tokyoStations){
    const {x,y}=station,side=cartouche[station.id],w=Math.max(54,station.ja.length*19+14),h=24;
    spots.set(station.ja,[x,y,...away[side]]);
    const node=el('rect',{x:x-6,y:y-6,width:12,height:12,fill:'#fff',stroke:'#1d1d1d','stroke-width':2.5,'data-name':station.ja});titled(node,station.ja);
    const bx=side==='left'?x-12-w:side==='right'?x+12:side==='down-left'?x-6-w:side==='down-right'?x+6:x-w/2;
    const by=side==='up'?y-12-h*2:side==='down'||side==='down-left'||side==='down-right'?y+12:y-h;
    const data={'data-name':station.ja};
    el('rect',{x:bx,y:by,width:w,height:h,fill:'#1d2b3a',...data});
    el('text',{x:bx+w/2,y:by+18,'text-anchor':'middle',fill:'#fff','font-size':17,'font-family':font,...data},station.ja);
    el('rect',{x:bx,y:by+h,width:w,height:h,fill:'#fff',stroke:'#1d2b3a','stroke-width':1.5,...data});
    el('text',{x:bx+w/2,y:by+h+19,'text-anchor':'middle',fill:'#123f8c','font-size':18,'font-family':'Arial,sans-serif','font-weight':'bold',...data},station.fare.toLocaleString('en-US'));
  }
  // The current station is red, like the 現在地 box of the real boards; Tokyo keeps its big name box either way.
  const atTokyo=here==='東京';
  el('rect',{x:tokyo[0]-34,y:tokyo[1]-22,width:68,height:44,fill:atTokyo?'#c8102e':'#fff',stroke:atTokyo?'#fff':'#1d1d1d','stroke-width':3,'data-name':'東京'});
  el('text',{x:tokyo[0],y:tokyo[1]+9,'text-anchor':'middle',fill:atTokyo?'#fff':'#1d1d1d','font-size':25,'font-family':font,'font-weight':'bold','data-name':'東京'},'東京');
  if(!atTokyo)svg.querySelectorAll(`[data-name="${here}"]`).forEach(node=>{
    const fill=node.getAttribute('fill');
    if(node.tagName==='text'){if(fill==='#222'){node.setAttribute('fill','#e60012');node.setAttribute('font-weight','bold')}return}
    if(fill==='#1d2b3a')node.setAttribute('fill','#c8102e');else if(node.getAttribute('stroke')==='#1d2b3a')node.setAttribute('stroke','#c8102e');else{node.setAttribute('fill','#e60012');if(node.tagName==='circle')node.setAttribute('r','6')}
  });
  // The red arrow points at the station from the side its labels leave free, with 現在地 above it (or past its tail when it is vertical).
  const spot=spots.get(here);
  if(spot){
    const [hx,hy,ax,ay]=spot,gap=atTokyo?38:tokyoStations.some(station=>station.ja===here)?10:8;
    el('path',{d:`M${-gap-60} -11 h34 v-12 l26 23 l-26 23 v-12 h-34z`,fill:'#e60012',transform:`translate(${hx} ${hy}) rotate(${Math.atan2(ay,ax)*180/Math.PI+180})`});
    const level=Math.abs(ax)>=Math.abs(ay);
    el('text',{x:level?hx+ax*(gap+44):hx,y:level?hy-30:hy+ay*(gap+76)+5,'text-anchor':'middle',fill:'#e60012','font-size':14,'font-family':font,'font-weight':'bold'},'現在地');
  }
  const lineLabel=(x:number,y:number,name:string,color:string)=>{
    el('rect',{x,y,width:name.length*15+16,height:22,fill:color,rx:3});
    el('text',{x:x+8,y:y+16,fill:color===L.sobu?'#222':'#fff','font-size':14,'font-family':font,'font-weight':'bold'},name);
  };
  lineLabel(640,160,'高崎線',L.takasaki);lineLabel(1340,118,'宇都宮線',L.takasaki);lineLabel(905,268,'京浜東北線',L.keihin);
  lineLabel(370,330,'中央本線',L.chuo);lineLabel(520,630,'中央線',L.chuo);lineLabel(975,660,'山手線',L.yamanote);
  lineLabel(1555,290,'常磐線',L.joban);lineLabel(1440,640,'総武線',L.sobu);lineLabel(1330,760,'京葉線',L.keiyo);lineLabel(560,890,'東海道線',L.tokaido);lineLabel(1000,938,'横須賀線',L.yokosuka);
  // Header and side panel, after the wall boards: white board, green JR band, legend column.
  el('rect',{x:1440,y:24,width:22,height:22,fill:'#008a3e'});
  el('text',{x:1472,y:46,fill:'#111','font-size':30,'font-family':font,'font-weight':'bold'},'JR線 近距離きっぷ運賃表');
  el('rect',{x:1822,y:24,width:22,height:22,fill:'#008a3e'});
  el('text',{x:1472,y:76,fill:'#333','font-size':15,'font-family':font},'東京駅から · おとな片道（単位：円） こどもは半額');
  el('text',{x:1472,y:98,fill:'#d0021b','font-size':13,'font-family':font},'ICカードの運賃は異なります。この表はきっぷの運賃です。');
  el('rect',{x:24,y:24,width:190,height:1032,fill:'#fff',stroke:'#008a3e','stroke-width':5});
  el('rect',{x:24,y:24,width:190,height:44,fill:'#008a3e'});
  el('text',{x:119,y:53,'text-anchor':'middle',fill:'#fff','font-size':19,'font-family':font,'font-weight':'bold'},'運賃のみかた');
  el('rect',{x:46,y:92,width:70,height:24,fill:'#1d2b3a'});el('text',{x:81,y:110,'text-anchor':'middle',fill:'#fff','font-size':17,'font-family':font},'駅名');
  el('rect',{x:46,y:116,width:70,height:24,fill:'#fff',stroke:'#1d2b3a','stroke-width':1.5});el('text',{x:81,y:135,'text-anchor':'middle',fill:'#123f8c','font-size':18,'font-family':'Arial','font-weight':'bold'},'260');
  el('text',{x:126,y:110,fill:'#333','font-size':13,'font-family':font},'駅名');el('text',{x:126,y:135,fill:'#333','font-size':13,'font-family':font},'運賃（円）');
  el('circle',{cx:52,cy:168,r:4,fill:'#fff',stroke:'#333','stroke-width':2});el('text',{x:64,y:173,fill:'#333','font-size':13,'font-family':font},'駅名');el('text',{x:94,y:173,fill:'#123f8c','font-size':12,'font-family':'Arial,sans-serif','font-weight':'bold'},'210');el('text',{x:46,y:194,fill:'#333','font-size':13,'font-family':font},'その他の駅と運賃');
  el('text',{x:46,y:236,fill:'#008a3e','font-size':16,'font-family':font,'font-weight':'bold'},'路線');
  const legend:[string,string][]=[['山手線',L.yamanote],['中央線',L.chuo],['高崎・宇都宮線',L.takasaki],['京浜東北線',L.keihin],['常磐線',L.joban],['総武線',L.sobu],['京葉線',L.keiyo],['東海道線',L.tokaido],['横須賀線',L.yokosuka]];
  legend.forEach(([name,color],index)=>{el('rect',{x:46,y:254+index*34,width:34,height:8,fill:color});el('text',{x:90,y:263+index*34,fill:'#222','font-size':14,'font-family':font},name)});
  el('text',{x:46,y:560,fill:'#008a3e','font-size':16,'font-family':font,'font-weight':'bold'},'運賃一覧');
  [...new Set([...tokyoFareAmounts,...Object.values(stopKm).map(fareForKm)])].sort((a,b)=>a-b).forEach((fare,index)=>{const x=46+(index%2)*86,y=580+Math.floor(index/2)*30;el('rect',{x,y,width:76,height:24,fill:'#fff',stroke:'#9aa5b1'});el('text',{x:x+38,y:y+18,'text-anchor':'middle',fill:'#123f8c','font-size':16,'font-family':'Arial','font-weight':'bold'},fare.toLocaleString('en-US'))});
  el('text',{x:46,y:1000,fill:'#666','font-size':12,'font-family':font},'JR線のみ · 一部の駅を掲載');
  el('text',{x:46,y:1020,fill:'#666','font-size':12,'font-family':font},'ゲーム用参考図');
  return svg;
}

export function renderTokyoFareMap(here?:string):SVGSVGElement{
  return makeTokyoFareMap('東京駅からのJR運賃表。主な駅の大人きっぷ運賃。',here);
}

/** A departures board, not a fare lookup: choosing a station happens after purchase. */
export function openTokyoDepartures(select:(station:FareStation)=>void,close:()=>void,hint=false){
  const overlay=document.createElement('div');overlay.className='jr-departure-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Tokyo JR destinations');
  const board=document.createElement('section');board.className='jr-departure-board';overlay.append(board);
  const heading=document.createElement('h2');heading.textContent=hint?'駅員 / A fare hint':'在来線 / JR Tokyo · Choose your trip';board.append(heading);
  const description=document.createElement('p');description.textContent=hint?'Ask for a station’s fare. This hint neither chooses nor buys your ticket.':'Your ticket carries an amount, not a destination. Where do you want to get off?';board.append(description);
  const cancel=document.createElement('button');cancel.textContent='Back to the hall';cancel.className='departure-close';cancel.onclick=close;board.append(cancel);
  const list=document.createElement('div');list.className='jr-destination-list';board.append(list);
  for(const station of tokyoStations){const button=document.createElement('button');button.textContent=station.ja+' / '+station.en;const line=document.createElement('small');line.textContent=station.line;button.append(line);button.onclick=()=>select(station);list.append(button)}
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close()}if(event.key==='Tab'){const buttons=Array.from(overlay.querySelectorAll('button')),last=buttons.at(-1);if(event.shiftKey&&document.activeElement===cancel){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();cancel.focus()}}});
  document.body.append(overlay);cancel.focus();return{destroy:()=>overlay.remove()};
}

/** The same fare data, re-laid out for a wide physical board above the machines. */
export function renderWallFareMap(here?:string):SVGSVGElement{
  return makeTokyoFareMap('東京駅からのJR運賃表。主な駅の大人きっぷ運賃。',here);
}
