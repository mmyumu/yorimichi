import { railLines, stopNames } from './rail';

/** The phone's maps: real places in real longitude and latitude (rounded by hand), projected on a 192×240 picture shown at 2×, its land, rivers and hills drawn by `paintArea`, the lines from rail.ts.
 * `spots` holds the stops the maps show: a line is drawn along those of its stops listed here, so one listed off the edge just carries it out of the picture. */
export type LonLat=[number,number];
export const mapWidth=192,mapHeight=240;
const spots:Record<string,LonLat>={
  // Tokyo.
  汐留:[139.760,35.663],竹芝:[139.762,35.654],日の出:[139.759,35.649],芝浦ふ頭:[139.758,35.642],お台場海浜公園:[139.779,35.630],台場:[139.776,35.626],
  東京:[139.767,35.681],有楽町:[139.763,35.675],新橋:[139.758,35.666],浜松町:[139.757,35.655],田町:[139.748,35.646],高輪ゲートウェイ:[139.741,35.636],品川:[139.739,35.629],神田:[139.771,35.692],秋葉原:[139.774,35.698],御徒町:[139.775,35.707],上野:[139.777,35.714],鶯谷:[139.779,35.721],日暮里:[139.771,35.728],西日暮里:[139.767,35.732],田端:[139.761,35.738],駒込:[139.747,35.736],巣鴨:[139.739,35.733],大塚:[139.729,35.732],池袋:[139.711,35.730],目白:[139.706,35.721],高田馬場:[139.704,35.712],新大久保:[139.700,35.701],新宿:[139.700,35.690],代々木:[139.702,35.683],原宿:[139.703,35.670],渋谷:[139.702,35.658],恵比寿:[139.710,35.646],目黒:[139.716,35.634],五反田:[139.724,35.626],大崎:[139.728,35.620],
  御茶ノ水:[139.765,35.700],四ツ谷:[139.730,35.686],東中野:[139.683,35.706],中野:[139.666,35.707],板橋:[139.719,35.745],十条:[139.722,35.760],赤羽:[139.721,35.778],尾久:[139.753,35.747],八丁堀:[139.778,35.675],越中島:[139.793,35.668],潮見:[139.817,35.659],新木場:[139.827,35.645],馬喰町:[139.782,35.693],新日本橋:[139.774,35.689],錦糸町:[139.815,35.697],川崎:[139.697,35.531],横浜:[139.622,35.466],北千住:[139.805,35.750],
  高円寺:[139.649,35.705],阿佐ケ谷:[139.636,35.705],荻窪:[139.620,35.704],
  // Nikko.
  日光:[139.620,36.749],今市:[139.700,36.725],
  // Kyoto.
  京都:[135.758,34.985],東福寺:[135.774,34.980],稲荷:[135.770,34.967],七条:[135.768,34.990],清水五条:[135.769,34.996],祇園四条:[135.772,35.004],三条:[135.772,35.009],神宮丸太町:[135.772,35.018],出町柳:[135.773,35.030],鳥羽街道:[135.771,34.973],伏見稲荷:[135.772,34.966],龍谷大前深草:[135.770,34.953],藤森:[135.770,34.944],墨染:[135.770,34.936],丹波橋:[135.768,34.931],JR藤森:[135.772,34.950],桃山:[135.775,34.936],
  竹田:[135.759,34.958],くいな橋:[135.757,34.966],'十条​':[135.758,34.973],九条:[135.758,34.979],五条:[135.759,34.996],四条:[135.760,35.003],烏丸御池:[135.760,35.011],丸太町:[135.760,35.017],今出川:[135.760,35.030],鞍馬口:[135.761,35.038],北大路:[135.758,35.044],北山:[135.761,35.056],松ヶ崎:[135.774,35.067],国際会館:[135.786,35.064],
  梅小路京都西:[135.744,34.988],丹波口:[135.742,34.996],二条:[135.741,35.011],円町:[135.733,35.017],花園:[135.720,35.018],太秦:[135.707,35.016],嵯峨嵐山:[135.681,35.018],保津峡:[135.643,35.019],西大路:[135.733,34.980],桂川:[135.701,34.966],向日町:[135.705,34.950],長岡京:[135.698,34.925],山崎:[135.680,34.895],山科:[135.814,34.993],六地蔵:[135.800,34.933],
  // Lake Biwa.
  大津:[135.864,35.003],膳所:[135.883,34.997],石山:[135.906,34.961],南草津:[135.945,34.998],草津:[135.961,35.023],大津京:[135.861,35.026],堅田:[135.909,35.114],志賀:[135.9248,35.2024],近江今津:[136.031,35.413],
  // Osaka.
  大阪:[135.496,34.702],新大阪:[135.500,34.733],高槻:[135.620,34.852],
};
export const spotOf=(station:string):LonLat|null=>spots[station]??null;
const kmPerLat=111;
const kmPerLon=(lat:number)=>kmPerLat*Math.cos(lat*Math.PI/180);
/** How far apart two points are, in a straight line. */
export const kmApart=(a:LonLat,b:LonLat)=>Math.hypot((a[0]-b[0])*kmPerLon(a[1]),(a[1]-b[1])*kmPerLat);
type Shape=['water'|'green'|'land',...LonLat[]]|['river',...LonLat[]];
/** A map: its centre, the km it is wide, the stations named on it (all of them are drawn), and what lies under the lines, painted in order. */
export interface Area {id:string;en:string;centre:LonLat;km:number;names:string[];shapes:Shape[]}
export const areas:Area[]=[
  {id:'tokyo',en:'Tokyo',centre:[139.745,35.685],km:13,names:['東京','新宿','渋谷','上野','池袋','品川','秋葉原'],shapes:[
    ['water',[139.762,35.654],[139.752,35.640],[139.745,35.620],[139.74,35.590],[139.9,35.590],[139.9,35.664],[139.80,35.665],[139.788,35.660],[139.775,35.662]],
    ['land',[139.770,35.636],[139.782,35.634],[139.788,35.622],[139.778,35.616],[139.765,35.622]],
    ['land',[139.778,35.660],[139.795,35.658],[139.815,35.645],[139.805,35.630],[139.788,35.640]],
    ['river',[139.815,35.76],[139.802,35.74],[139.803,35.715],[139.795,35.695],[139.790,35.678],[139.784,35.660]],
    ['green',[139.746,35.690],[139.758,35.691],[139.761,35.682],[139.757,35.674],[139.746,35.676]],
    ['green',[139.692,35.680],[139.703,35.680],[139.702,35.664],[139.692,35.664]],
    ['green',[139.769,35.721],[139.776,35.720],[139.775,35.711],[139.769,35.712]],
  ]},
  {id:'nikko',en:'Nikko',centre:[139.605,36.75],km:5,names:['日光'],shapes:[
    ['green',[139.57,36.70],[139.60,36.70],[139.60,36.745],[139.597,36.752],[139.606,36.758],[139.62,36.762],[139.64,36.765],[139.64,36.80],[139.57,36.80]],
    ['green',[139.59,36.70],[139.64,36.70],[139.64,36.734],[139.61,36.738],[139.59,36.738]],
    ['river',[139.57,36.738],[139.586,36.744],[139.597,36.750],[139.604,36.753],[139.615,36.752],[139.64,36.746]],
  ]},
  {id:'kyoto',en:'Kyoto',centre:[135.74,35.0],km:14.5,names:['京都','四条','北大路','三条','円町','桂川','嵯峨嵐山'],shapes:[
    ['green',[135.80,35.10],[135.79,35.05],[135.788,35.02],[135.782,34.99],[135.785,34.96],[135.80,34.93],[135.85,34.93],[135.85,35.10]],
    ['green',[135.64,35.10],[135.85,35.10],[135.83,35.070],[135.78,35.075],[135.74,35.058],[135.70,35.052],[135.68,35.03],[135.64,35.03]],
    ['green',[135.64,34.90],[135.672,34.90],[135.668,34.96],[135.670,35.0],[135.64,35.03]],
    ['green',[135.758,35.031],[135.766,35.031],[135.766,35.018],[135.758,35.018]],
    ['river',[135.758,35.08],[135.766,35.04],[135.772,35.03],[135.771,35.0],[135.766,34.98],[135.76,34.96],[135.75,34.93],[135.73,34.90]],
    ['river',[135.668,35.02],[135.69,34.99],[135.71,34.965],[135.72,34.94],[135.73,34.90]],
  ]},
  {id:'osaka',en:'Osaka',centre:[135.50,34.69],km:9,names:['大阪','新大阪'],shapes:[
    ['river',[135.57,34.722],[135.52,34.718],[135.48,34.712],[135.44,34.695]],
    ['river',[135.53,34.692],[135.50,34.692],[135.47,34.688],[135.45,34.670]],
    ['green',[135.516,34.690],[135.530,34.690],[135.530,34.680],[135.516,34.680]],
    ['green',[135.508,34.655],[135.519,34.655],[135.519,34.646],[135.508,34.646]],
  ]},
  {id:'biwa',en:'Lake Biwa',centre:[135.925,35.105],km:22,names:['大津','堅田','志賀','草津'],shapes:[
    ['water',[135.870,35.012],[135.890,35.04],[135.905,35.08],[135.925,35.11],[135.935,35.14],[135.965,35.19],[135.99,35.24],[136.06,35.24],[136.06,35.16],[136.0,35.135],[135.95,35.10],[135.93,35.06],[135.915,35.03],[135.895,35.0]],
    ['green',[135.79,35.25],[135.905,35.25],[135.925,35.17],[135.885,35.10],[135.85,35.05],[135.79,35.04]],
  ]},
];
/** Where a point falls on an area's picture, in picture pixels. */
export function place(area:Area,[lon,lat]:LonLat):LonLat{
  const px=mapWidth/area.km,[x0,y0]=area.centre;
  return [mapWidth/2+(lon-x0)*kmPerLon(y0)*px,mapHeight/2-(lat-y0)*kmPerLat*px];
}
/** Whether a point is on the picture, with a margin for what is drawn around it. */
export function onMap(area:Area,at:LonLat,margin=0){const [x,y]=place(area,at);return x>=margin&&y>=margin&&x<=mapWidth-margin&&y<=mapHeight-margin}
/** The map of where a point is: the one showing it, else the nearest with it less than a map's width from its centre (a station just off the edge); none out in the country: nothing is a walk away there. */
export function areaAround(at:LonLat){
  const near=areas.filter(area=>kmApart(area.centre,at)<area.km).sort((a,b)=>kmApart(a.centre,at)-kmApart(b.centre,at));
  return areas.find(area=>onMap(area,at))??near[0]??null;
}
const colors={ground:'#ece5d2',water:'#8cc4dc',green:'#bcd8a2',land:'#ece5d2',river:'#8cc4dc'};
/** The picture, redrawn at each zoom so that lines and stops keep their size: no anti-aliasing, whole pixels, as the rest of the game. `to` turns a picture point (`place`) into one of the view. */
export function paintArea(canvas:HTMLCanvasElement,area:Area,to:(x:number,y:number)=>number[]){
  canvas.width=mapWidth;canvas.height=mapHeight;const g=canvas.getContext('2d')!,at=(p:LonLat)=>{const [x,y]=place(area,p);return to(x,y) as LonLat};
  const dot=(x:number,y:number,size:number)=>g.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size);
  const stroke=(points:LonLat[],size:number)=>{for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i],steps=Math.ceil(Math.max(Math.abs(bx-ax),Math.abs(by-ay)));for(let k=0;k<=steps;k++)dot(ax+(bx-ax)*k/Math.max(steps,1),ay+(by-ay)*k/Math.max(steps,1),size)}};
  const fill=(points:LonLat[])=>{
    for(let y=0;y<mapHeight;y++){
      const cuts=points.flatMap(([ax,ay],i)=>{const [bx,by]=points[(i+1)%points.length];return (ay<=y+.5)!==(by<=y+.5)?[ax+(y+.5-ay)/(by-ay)*(bx-ax)]:[]}).sort((a,b)=>a-b);
      for(let i=0;i+1<cuts.length;i+=2)g.fillRect(Math.round(cuts[i]),y,Math.round(cuts[i+1])-Math.round(cuts[i]),1);
    }
  };
  g.fillStyle=colors.ground;g.fillRect(0,0,mapWidth,mapHeight);
  for(const [kind,...spot] of area.shapes){const points=(spot as LonLat[]).map(at);g.fillStyle=colors[kind];if(kind==='river')stroke(points,3);else fill(points)}
  // The lines, then every stop on them.
  const known=railLines.filter(line=>line.service==='local').map(line=>({color:line.color,stops:[...line.stops,...(line.loop?[line.stops[0]]:[])].filter(stop=>spots[stop])}));
  for(const {color,stops} of known){g.fillStyle=color;stroke(stops.map(stop=>at(spots[stop])),2)}
  for(const stop of new Set(known.flatMap(line=>line.stops))){const [x,y]=at(spots[stop]);g.fillStyle='#3a4a48';dot(x,y,4);g.fillStyle='#fffef2';dot(x,y,2)}
}
export const stationLabel=(station:string)=>stopNames[station]??station;
/** Lays out a map's labels, each beside its point and clear of those before it and of every point: `box`, null where none fits. */
export function labelled<T>(points:{x:number;y:number;text:string;item:T}[]){
  const width=(text:string)=>text.length*3.1+2,height=7,taken:[number,number,number,number][]=points.map(({x,y})=>[x-4,y-4,x+4,y+4]);
  return points.map(point=>{
    const {x,y,text}=point,w=width(text);const across=Math.min(Math.max(x-w/2,1),mapWidth-1-w);
    for(const side of ['right','left','up','down'] as const){
      const box:[number,number,number,number]=side==='right'?[x+6,y-height/2,x+6+w,y+height/2]:side==='left'?[x-6-w,y-height/2,x-6,y+height/2]:side==='up'?[across,y-6-height,across+w,y-6]:[across,y+6,across+w,y+6+height];
      if(box[0]<1||box[1]<1||box[2]>mapWidth-1||box[3]>mapHeight-1)continue;
      if(taken.some(other=>box[0]<other[2]&&box[2]>other[0]&&box[1]<other[3]&&box[3]>other[1]&&!(other[0]===x-4&&other[1]===y-4)))continue;
      taken.push(box);return {...point,box};
    }
    return {...point,box:null};
  });
}
