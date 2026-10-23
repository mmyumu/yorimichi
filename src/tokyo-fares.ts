/** Paper adult fares transcribed from JR East, 2024-12-06, Fig. 2-1 p.12.
 * These are the proposed 2026 values in that document, not a live fare feed.
 * Metro/private rail and IC fares are deliberately excluded. */
export interface FareStation {id:string;ja:string;en:string;fare:number;x:number;y:number;line:string}
export const tokyoStations:FareStation[]=[
{id:'kumagaya',ja:'熊谷',en:'Kumagaya',fare:1230,x:300,y:75,line:'Takasaki'},
{id:'ageo',ja:'上尾',en:'Ageo',fare:720,x:470,y:75,line:'Takasaki'},
{id:'omiya',ja:'大宮',en:'Omiya',fare:620,x:650,y:75,line:'Utsunomiya / Takasaki'},
{id:'kuki',ja:'久喜',en:'Kuki',fare:910,x:820,y:75,line:'Utsunomiya'},
{id:'oyama',ja:'小山',en:'Oyama',fare:1600,x:990,y:75,line:'Utsunomiya'},
{id:'tsuchiura',ja:'土浦',en:'Tsuchiura',fare:1230,x:1135,y:145,line:'Joban'},
{id:'urawa',ja:'浦和',en:'Urawa',fare:440,x:650,y:185,line:'Utsunomiya / Takasaki'},
{id:'akabane',ja:'赤羽',en:'Akabane',fare:260,x:650,y:285,line:'Utsunomiya / Takasaki'},
{id:'toride',ja:'取手',en:'Toride',fare:810,x:1040,y:255,line:'Joban'},
{id:'kashiwa',ja:'柏',en:'Kashiwa',fare:620,x:935,y:360,line:'Joban'},
{id:'ikebukuro',ja:'池袋',en:'Ikebukuro',fare:260,x:555,y:385,line:'Yamanote'},
{id:'ueno',ja:'上野',en:'Ueno',fare:200,x:765,y:385,line:'Yamanote / Ueno-Tokyo'},
{id:'shinjuku',ja:'新宿',en:'Shinjuku',fare:260,x:535,y:490,line:'Chuo / Yamanote'},
{id:'shibuya',ja:'渋谷',en:'Shibuya',fare:260,x:555,y:590,line:'Yamanote'},
{id:'shimbashi',ja:'新橋',en:'Shimbashi',fare:160,x:765,y:590,line:'Yamanote / Tokaido'},
{id:'shinagawa',ja:'品川',en:'Shinagawa',fare:210,x:665,y:690,line:'Yamanote / Tokaido'},
{id:'kawasaki',ja:'川崎',en:'Kawasaki',fare:350,x:500,y:780,line:'Tokaido'},
{id:'yokohama',ja:'横浜',en:'Yokohama',fare:530,x:335,y:780,line:'Tokaido'},
{id:'ofuna',ja:'大船',en:'Ofuna',fare:910,x:170,y:780,line:'Tokaido'},
{id:'atami',ja:'熱海',en:'Atami',fare:2090,x:30,y:780,line:'Tokaido'},
{id:'kichijoji',ja:'吉祥寺',en:'Kichijoji',fare:440,x:370,y:490,line:'Chuo'},
{id:'tachikawa',ja:'立川',en:'Tachikawa',fare:720,x:205,y:490,line:'Chuo'},
{id:'hachioji',ja:'八王子',en:'Hachioji',fare:910,x:40,y:490,line:'Chuo'},
{id:'takao',ja:'高尾',en:'Takao',fare:1040,x:40,y:365,line:'Chuo'},
{id:'otsuki',ja:'大月',en:'Otsuki',fare:1600,x:40,y:240,line:'Chuo'},
{id:'kofu',ja:'甲府',en:'Kofu',fare:2420,x:40,y:115,line:'Chuo'},
{id:'shinkoiwa',ja:'新小岩',en:'Shin-Koiwa',fare:210,x:945,y:490,line:'Sobu'},
{id:'funabashi',ja:'船橋',en:'Funabashi',fare:440,x:1110,y:490,line:'Sobu'},
{id:'chiba',ja:'千葉',en:'Chiba',fare:720,x:1110,y:625,line:'Sobu'},
{id:'soga',ja:'蘇我',en:'Soga',fare:810,x:1110,y:780,line:'Sobu / Sotobo'},
];
export const tokyoFareAmounts=[...new Set(tokyoStations.map(station=>station.fare))].sort((a,b)=>a-b);
const svgNS='http://www.w3.org/2000/svg';
export function renderTokyoFareMap():SVGSVGElement{
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','-42 0 1275 855');svg.setAttribute('role','img');svg.setAttribute('aria-label','Plan tarifaire JR au départ de Tokyo, montants adultes papier.');
  const el=(name:string,attrs:Record<string,string|number>,text?:string)=>{const e=document.createElementNS(svgNS,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;svg.append(e);return e};
  el('rect',{x:-42,y:0,width:1275,height:855,fill:'#fffef2'});
  const line=(points:string,color:string)=>el('polyline',{points,fill:'none',stroke:color,'stroke-width':12,'stroke-linejoin':'round','stroke-linecap':'round'});
  line('300,75 990,75','#ef8b26');line('650,75 650,285 555,385','#00a6a0');line('650,285 765,385','#20a2b4');
  line('555,385 765,385 800,490 765,590 665,690 555,590 535,490 555,385','#7fb829');
  line('800,490 40,490 40,115','#fa6226');line('800,490 1110,490 1110,780','#ecc700');
  line('800,490 935,360 1040,255 1135,145','#0678b4');line('665,690 500,780 30,780','#ed8d21');
  for(const station of tokyoStations){
    el('circle',{cx:station.x,cy:station.y,r:7,fill:'#fff',stroke:'#36473b','stroke-width':2});
    el('rect',{x:station.x-52,y:station.y-35,width:108,height:31,rx:3,fill:'#fffef2',stroke:'#b1b6a6'});
    el('text',{x:station.x+2,y:station.y-20,'text-anchor':'middle',fill:'#203c35','font-size':17,'font-family':'Arial,sans-serif','font-weight':'bold'},station.ja);
    el('text',{x:station.x+2,y:station.y-7,'text-anchor':'middle',fill:'#536455','font-size':10,'font-family':'Arial,sans-serif'},station.en);
    el('rect',{x:station.x-42,y:station.y+10,width:88,height:27,rx:2,fill:'#f1f4e7',stroke:'#aeb89f'});
    el('text',{x:station.x+2,y:station.y+30,'text-anchor':'middle',fill:'#1e3154','font-size':21,'font-family':'Arial,sans-serif','font-weight':'bold'},'¥'+station.fare.toLocaleString('en-US'));
  }
  el('rect',{x:750,y:451,width:100,height:65,fill:'#15944c',stroke:'#d94c37','stroke-width':5});
  el('text',{x:800,y:480,'text-anchor':'middle',fill:'#fff','font-size':25,'font-family':'Arial,sans-serif','font-weight':'bold'},'東京');
  el('text',{x:800,y:503,'text-anchor':'middle',fill:'#fff','font-size':15,'font-family':'Arial,sans-serif'},'TOKYO · ここ');
  el('text',{x:240,y:225,fill:'#465345','font-size':20,'font-family':'Arial,sans-serif'},'JR 東京駅からの運賃');
  el('text',{x:240,y:253,fill:'#465345','font-size':16,'font-family':'Arial,sans-serif'},'Paper tickets · Adult · Yen');
  el('text',{x:240,y:280,fill:'#687261','font-size':13,'font-family':'Arial,sans-serif'},'JR only / Metro・私鉄は含みません');
  return svg;
}

/** A departures board, not a fare lookup: choosing a station happens after purchase. */
export function openTokyoDepartures(select:(station:FareStation)=>void,close:()=>void,hint=false){
  const overlay=document.createElement('div');overlay.className='jr-departure-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Tokyo JR destinations');
  const board=document.createElement('section');board.className='jr-departure-board';overlay.append(board);
  const heading=document.createElement('h2');heading.textContent=hint?'駅員 / Un indice de tarif':'在来線 / JR Tokyo · Choisir son trajet';board.append(heading);
  const description=document.createElement('p');description.textContent=hint?'Demandez le tarif d’une gare. Ce conseil ne choisit ni n’achète votre billet.':'Votre billet porte un montant, pas une destination. Où souhaitez-vous descendre ?';board.append(description);
  const cancel=document.createElement('button');cancel.textContent='Retour au hall';cancel.className='departure-close';cancel.onclick=close;board.append(cancel);
  const list=document.createElement('div');list.className='jr-destination-list';board.append(list);
  for(const station of tokyoStations){const button=document.createElement('button');button.textContent=station.ja+' / '+station.en;const line=document.createElement('small');line.textContent=station.line;button.append(line);button.onclick=()=>select(station);list.append(button)}
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();close()}if(event.key==='Tab'){const buttons=Array.from(overlay.querySelectorAll('button')),last=buttons.at(-1);if(event.shiftKey&&document.activeElement===cancel){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();cancel.focus()}}});
  document.body.append(overlay);cancel.focus();return{destroy:()=>overlay.remove()};
}

/** The same fare data, re-laid out for a wide physical board above the machines. */
export function renderWallFareMap():SVGSVGElement{
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','-110 0 3100 805');svg.setAttribute('role','img');svg.setAttribute('aria-label','Grand plan mural JR au départ de Tokyo');
  const el=(name:string,attrs:Record<string,string|number>,text?:string)=>{const e=document.createElementNS(svgNS,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text)e.textContent=text;svg.append(e);return e};
  el('rect',{x:-110,y:0,width:3100,height:805,fill:'#fffef2'});
  const original=renderTokyoFareMap();
  original.querySelectorAll('polyline').forEach(path=>{
    const points=path.getAttribute('points')!.split(' ').map(pair=>{const[x,y]=pair.split(',').map(Number);return`${x*2.4},${y*.9}`}).join(' ');
    el('polyline',{points,fill:'none',stroke:path.getAttribute('stroke')!,'stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round'});
  });
  for(const station of tokyoStations){
    const x=station.x*2.4,y=station.y*.9;
    el('circle',{cx:x,cy:y,r:7,fill:'#fff',stroke:'#3e4941','stroke-width':2});
    el('rect',{x:x-112,y:y-45,width:224,height:41,fill:'#fffef2',stroke:'#d3d3bf'});
    el('text',{x,y:y-24,'text-anchor':'middle',fill:'#233932','font-size':22,'font-weight':'bold','font-family':'Arial,sans-serif'},station.ja);
    el('text',{x,y:y-9,'text-anchor':'middle',fill:'#455744','font-size':13,'font-family':'Arial,sans-serif'},station.en);
    el('text',{x,y:y+34,'text-anchor':'middle',fill:'#223450','font-size':27,'font-weight':'bold','font-family':'Arial,sans-serif'},'¥'+station.fare.toLocaleString('en-US'));
  }
  el('rect',{x:1810,y:400,width:220,height:75,fill:'#16874c',stroke:'#d04e33','stroke-width':4});
  el('text',{x:1920,y:436,'text-anchor':'middle',fill:'#fff','font-size':30,'font-weight':'bold','font-family':'Arial,sans-serif'},'東京 TOKYO');
  el('text',{x:1920,y:461,'text-anchor':'middle',fill:'#fff','font-size':19,'font-family':'Arial,sans-serif'},'現在地 / You are here');
  el('text',{x:600,y:210,fill:'#2f4f3d','font-size':36,'font-weight':'bold','font-family':'Arial,sans-serif'},'東京駅からの運賃');
  el('text',{x:600,y:250,fill:'#56634c','font-size':22,'font-family':'Arial,sans-serif'},'JR LINE TICKET FARE · Adult paper tickets');
  el('text',{x:600,y:283,fill:'#647056','font-size':18,'font-family':'Arial,sans-serif'},'Plan simplifié du jeu · JR uniquement · 30 gares');
  return svg;
}
