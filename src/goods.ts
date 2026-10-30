/** What the konbini sells: its aisles and products, each drawn twice: a small facing for the shelf (`paintItem`), a close-up with its name on the package for the basket (`paintCloseUp`). */
import { crispText } from './ticket-gate';

export type Kind='melon'|'bun'|'donut'|'long'|'croissant'|'sando'|'pack'|'pouch'|'bag'|'bigbag'|'tube'|'cup'|'can'|'pet'|'pet2'|'carton'|'onigiri'|'bare'|'maki'|'tall'|'bottle'|'bottlecan'|'ramune';
// Each kind's facing, width × height in cm.
export const dims:Record<Kind,[number,number]>={melon:[16,12],bun:[15,11],donut:[14,11],long:[21,10],croissant:[18,10],sando:[14,14],pack:[24,13],bag:[21,27],bigbag:[28,32],pouch:[13,18],tube:[8,23],cup:[9,15],can:[6.6,12],pet:[7,22],pet2:[10.5,31],carton:[7,19],onigiri:[17,14],bare:[17,14],maki:[9,17],tall:[6.6,16],bottle:[8.5,29],bottlecan:[6.6,17],ramune:[6.6,21]};
/** A product on the shelf: its name, price, shape and colours (the package's, then its label's). */
export type Item=[ja:string,en:string,price:number,kind:Kind,main:string,label:string,adult?:boolean];
export interface Aisle {ja:string;en:string;fridge?:boolean;tax?:number;adult?:boolean;rows:Item[][]}
// The shelves, bottom row first. Generic konbini goods at konbini prices, written before tax, mostly ending in 8 as they do: the bread shelf's sweet buns and pastries, then its savoury breads and sandwiches (a sandwich's colours are its two fillings).
const shelfPrices:Aisle[]=[
  {ja:'あまいパン',en:'SWEET BREADS',rows:[
    [['ミニクロワッサン','Mini croissants',178,'pack','#d89a48','#e8c440'],['ちぎりパン','Pull-apart milk bread',168,'pack','#e8c890','#3a78c2'],['バターロール','Butter rolls',158,'pack','#c8803a','#d2402e'],['蒸しパン','Steamed cake',128,'pack','#f2e2a0','#3c9a5c']],
    [['メロンパン','Melon pan',138,'melon','#e8c870','#3c9a5c'],['チョコチップメロンパン','Chocolate chip melon pan',148,'melon','#c8955a','#5a3324'],['クリームパン','Custard cream bun',128,'bun','#d9a050','#e8c440'],['あんぱん','Anpan, red bean bun',118,'bun','#a8602a','#d2402e']],
    [['チョココロネ','Chocolate cornet',138,'croissant','#c07a3a','#5a3324'],['クロワッサン','Croissant',128,'croissant','#d0904a','#3a78c2'],['シナモンロール','Cinnamon roll',158,'bun','#c88a50','#7a4a22'],['ジャムパン','Strawberry jam bun',118,'bun','#d9a050','#d2607a']],
    [['コッペパン ジャム＆マーガリン','Koppe bread, jam and margarine',128,'long','#d9a050','#d2402e'],['あんバターサンド','Red bean and butter roll',148,'long','#c8803a','#7a3a22'],['ドーナツ','Sugar doughnut',118,'donut','#c07a3a','#f4f0e0'],['チョコドーナツ','Chocolate doughnut',128,'donut','#c07a3a','#5a3324']],
    [['どら焼き','Dorayaki',128,'pouch','#e9dcc0','#7a4a22'],['バウムクーヘン','Baumkuchen',138,'pouch','#f2e2b4','#a5622a'],['カステラ','Castella sponge cake',178,'pack','#e8b040','#7a4a22'],['マフィン','Muffin',138,'bun','#a8683a','#e8c440']],
  ]},
  {ja:'サンド・パン',en:'SANDWICHES',rows:[
    [['ハムチーズサンド','Ham and cheese sandwich',278,'sando','#e9a6ad','#f2d230'],['たまごサンド','Egg sandwich',248,'sando','#f2d860','#f6e890'],['ミックスサンド','Mixed sandwich',298,'sando','#e9a6ad','#86b84a'],['ツナサンド','Tuna sandwich',258,'sando','#d8c8a0','#86b84a']],
    [['BLTサンド','BLT sandwich',318,'sando','#c8503a','#86b84a'],['カツサンド','Pork cutlet sandwich',368,'sando','#a8602a','#7a3a22'],['ハムレタスサンド','Ham and lettuce sandwich',278,'sando','#e9a6ad','#86b84a'],['てりやきチキンサンド','Teriyaki chicken sandwich',308,'sando','#a86a3a','#86b84a']],
    [['カレーパン','Curry bread',148,'bun','#9a5a2a','#e8853a'],['ソーセージパン','Sausage roll',148,'long','#d9a050','#b8402e'],['焼きそばパン','Yakisoba bread',158,'long','#d9a050','#8a4a22'],['コロッケパン','Croquette bun',168,'long','#d9a050','#a8702a']],
    [['ピザパン','Pizza bread',158,'bun','#d9a050','#d2402e'],['ツナマヨパン','Tuna mayo bun',138,'bun','#d9a050','#f4f0d8'],['チーズパン','Cheese bread',128,'bun','#e0b050','#f2d230'],['ちくわパン','Chikuwa bread',148,'long','#d9a050','#e9dcc0']],
    [['ハムチーズクロワッサン','Ham and cheese croissant',178,'croissant','#d0904a','#e9a6ad'],['ハム＆チーズロール','Ham and cheese roll',168,'long','#d9a050','#e9a6ad'],['ベーコンエピ','Bacon épi',178,'long','#c8803a','#d2607a'],['てりやきチキンパン','Teriyaki chicken bun',178,'bun','#d9a050','#7a3a22']],
  ]},
  {ja:'おにぎり',en:'ONIGIRI',rows:[
    [['いなり寿司','Inari sushi',298,'pack','#c8843a','#d2402e'],['太巻き','Thick sushi roll',368,'pack','#283e40','#f2d860'],['助六寿司','Sushi roll and inari box',398,'pack','#a8682a','#3c9a5c'],['赤飯おこわ','Red bean sticky rice',158,'pouch','#b8606a','#f4f0e4']],
    [['手巻 ツナマヨ','Hand roll, tuna mayo',148,'maki','#f4f0e4','#e8c440'],['手巻 サーモン','Hand roll, salmon',168,'maki','#f4f0e4','#e8853a'],['手巻 ねぎとろ','Hand roll, minced tuna',198,'maki','#f4f0e4','#d2607a'],['手巻 えびマヨ','Hand roll, shrimp mayo',178,'maki','#f4f0e4','#e8a090']],
    [['鮭','Salmon onigiri',158,'onigiri','#f4f0e4','#e8853a'],['ツナマヨ','Tuna mayo onigiri',128,'onigiri','#f4f0e4','#e8c440'],['梅','Pickled plum onigiri',118,'onigiri','#f4f0e4','#d2402e'],['昆布','Kelp onigiri',118,'onigiri','#f4f0e4','#2c5a3e']],
    [['明太子','Spicy cod roe onigiri',168,'onigiri','#f4f0e4','#d2607a'],['高菜','Pickled mustard greens onigiri',128,'onigiri','#f4f0e4','#6a8a3a'],['わさび醤油漬けサーモン','Wasabi Soy Sauce Marinated Atlantic Salmon',198,'bare','#f4f0e4','#e8855a'],['いくら','Salmon roe onigiri',248,'onigiri','#f4f0e4','#e04020']],
    [['焼鮭ハラミ','Grilled salmon belly onigiri',188,'onigiri','#f4f0e4','#c86a3a'],['肉そぼろ','Seasoned minced meat onigiri',158,'onigiri','#e8d8b0','#7a4a22'],['五目おこわ','Mixed sticky rice onigiri',148,'onigiri','#d8b878','#7a4a22'],['わかめごはん','Wakame rice onigiri',118,'onigiri','#c8d8a0','#2c5a3e']],
  ]},
  {ja:'ポテトチップス',en:'CRISPS',rows:[
    [['ポテトチップス パーティーサイズ','Crisps, party size',278,'bigbag','#e8c440','#d2402e'],['のりしお パーティーサイズ','Seaweed salt crisps, party size',278,'bigbag','#2c8a4a','#e8c440']],
    [['コーンスナック','Corn puffs',128,'bag','#e8853a','#e8c440'],['じゃがスティック','Potato sticks',158,'cup','#d2402e','#e8c440'],['じゃがスティック サラダ','Potato sticks, salad',158,'cup','#3c9a5c','#e8c440']],
    [['堅あげポテト','Hard-fried crisps',168,'bag','#5a3324','#e8c440'],['ギザギザポテト','Crinkle-cut crisps',168,'bag','#1f5fbf','#e8c440'],['わさび味','Wasabi crisps',168,'bag','#86b84a','#f4f4ee']],
    [['うすしお味','Lightly salted crisps',158,'bag','#3a78c2','#e8c440'],['のりしお','Seaweed salt crisps',158,'bag','#2c8a4a','#e8c440'],['コンソメ','Consommé crisps',158,'bag','#d2402e','#e8c440']],
    [['チップス うすしお','Stacked crisps, salted',218,'tube','#d2402e','#f4f4ee'],['チップス サワークリーム','Stacked crisps, sour cream',218,'tube','#3c9a5c','#f4f4ee'],['チップス のりしお','Stacked crisps, seaweed',218,'tube','#283e40','#e8c440'],['チップス チーズ','Stacked crisps, cheese',218,'tube','#e8c440','#d2402e']],
  ]},
  {ja:'ドリンク',en:'COLD DRINKS',fridge:true,rows:[
    [['緑茶 2L','Green tea, 2 l',228,'pet2','#a8c060','#2c7a3e'],['天然水 2L','Mineral water, 2 l',138,'pet2','#dceef4','#3a8fd0'],['麦茶 2L','Barley tea, 2 l',208,'pet2','#c8892f','#7a4a22'],['スポーツドリンク 2L','Sports drink, 2 l',278,'pet2','#e4eef4','#1f5fbf']],
    [['コーラ','Cola',168,'pet','#3b1f14','#d2402e'],['サイダー','Cider',158,'pet','#e4f2f4','#2c8a4a'],['オレンジジュース','Orange juice',158,'pet','#f2a030','#f4f4ee'],['乳酸菌飲料','Lactic soft drink',158,'pet','#f4f4ee','#3a78c2']],
    [['天然水','Mineral water',108,'pet','#dceef4','#3a8fd0'],['スポーツドリンク','Sports drink',158,'pet','#e4eef4','#1f5fbf'],['炭酸水','Sparkling water',108,'pet','#e4f2f4','#9aa29a'],['レモンティー','Lemon tea',148,'pet','#d8a040','#e8c440']],
    [['緑茶','Green tea',148,'pet','#a8c060','#2c7a3e'],['ほうじ茶','Roasted green tea',148,'pet','#a5622a','#5a3324'],['麦茶','Barley tea',138,'pet','#c8892f','#7a4a22'],['ジャスミン茶','Jasmine tea',148,'pet','#d8d08a','#3c9a5c']],
    [['缶コーヒー','Canned coffee',128,'can','#5a3324','#e8c440'],['微糖コーヒー','Coffee, a little sugar',128,'can','#283e40','#c8892f'],['カフェオレ','Café au lait',138,'carton','#f4e8d0','#7a4a22'],['いちごミルク','Strawberry milk',138,'carton','#f4e4e8','#d2607a']],
  ]},
  // Alcohol pays the full 10%, and the till asks for the buyer's age.
  {ja:'お酒',en:'ALCOHOL',fridge:true,tax:10,adult:true,rows:[
    [['清酒 720ml','Sake, 720 ml',798,'bottle','#2c5a3e','#f4f0e4'],['梅酒 720ml','Umeshu, 720 ml',898,'bottle','#8a5a22','#e8c440'],['芋焼酎 720ml','Sweet potato shochu, 720 ml',998,'bottle','#283e40','#d2402e'],['赤ワイン','Red wine',598,'bottle','#4a1a2a','#f4f0e4']],
    [['ビール 500ml','Beer, 500 ml',278,'tall','#d8a830','#f4f4ee'],['黒ビール 500ml','Dark beer, 500 ml',298,'tall','#3b1f14','#e8c440'],['プレミアムビール 500ml','Premium beer, 500 ml',318,'tall','#283e60','#e8c440'],['発泡酒 500ml','Low-malt beer, 500 ml',198,'tall','#3a78c2','#f4f4ee']],
    [['ビール','Beer, 350 ml',218,'can','#d8a830','#f4f4ee'],['黒ビール','Dark beer, 350 ml',228,'can','#3b1f14','#e8c440'],['糖質ゼロビール','Zero-carb beer, 350 ml',198,'can','#9aa8b0','#1f5fbf'],['ハイボール','Whisky highball',178,'can','#c8892f','#283e40']],
    [['レモンサワー','Lemon sour',158,'can','#e8d840','#2c7a3e'],['チューハイ もも','Peach chūhai',138,'can','#f0b0a8','#f4f4ee'],['チューハイ ぶどう','Grape chūhai',138,'can','#7a4a9a','#f4f4ee'],['梅酒ソーダ','Umeshu soda',158,'can','#c8a040','#7a4a22']],
    [['カップ酒','One-cup sake',228,'cup','#f4f0e4','#2c5a3e'],['生貯蔵酒 300ml','Fresh sake, 300 ml',388,'bottle','#7ab0c0','#f4f0e4'],['梅酒 カップ','Umeshu cup',258,'cup','#e8d8a0','#8a5a22'],['にごり酒 300ml','Cloudy sake, 300 ml',428,'bottle','#e8e8e0','#3a78c2']],
  ]},
];
export type VendorId='red'|'blue'|'white';
/** A street vending machine: its colours and its 15 drinks, five to a row, top row first; the last `hot` of them are served hot. */
export interface Vendor {ja:string;en:string;body:string;trim:string;hot:number;rows:Item[][]}
// Round prices, tax included, as the machines charge: no ¥1 or ¥5 ever needed. The makers are made up, but for the classics C.C. Lemon and Calpis.
export const vendors:Record<VendorId,Vendor>={
  red:{ja:'ソーダ',en:'SODA',body:'#d2342e',trim:'#f0806e',hot:2,rows:[
    [['スーパーコーラ','Super Cola',130,'can','#b01c20','#f4f4ee'],['ゼロブラックコーラ','Zero Black Cola',130,'can','#1d2622','#d2402e'],['メロンソーダ','Melon soda',130,'can','#38b44a','#e8f060'],['ドクターチェリー','Doctor Cherry',130,'can','#6a1830','#e8c440'],['クリームソーダ','Cream soda',140,'can','#7ac8a0','#fff4d8']],
    [['ラムネ','Ramune, marble soda',170,'ramune','#a8e0e8','#3a78c2'],['ぶどうスカッシュ','Grape squash',130,'can','#6a3a9a','#f4f4ee'],['激辛ジンジャーエール','Fiery ginger ale',150,'can','#c8a030','#d2402e'],['C.C.レモン','C.C. Lemon',170,'pet','#f6d820','#d2402e'],['エナジーブースト','Energy Boost',210,'tall','#1d2622','#b8f030']],
    [['強炭酸サイダー','Extra-fizzy cider',170,'pet','#dff2f6','#2c8a4a'],['白桃ウォーター','White peach water',170,'pet','#f6e6e0','#e88a8a'],['ゴールドコーラ','Gold Cola',170,'pet','#3b1f14','#e8c440'],['コーンポタージュ','Corn potage soup',130,'can','#f2c830','#7a4a22'],['おしるこ','Oshiruko, sweet red bean soup',130,'can','#7a2a34','#f4e8c8']],
  ]},
  blue:{ja:'コーヒーの時間',en:'COFFEE',body:'#2a62b0',trim:'#7aa6e0',hot:5,rows:[
    [['ノラ猫ブラック','Stray Cat black',150,'bottlecan','#1d2622','#e8c440'],['朝の微糖','Morning, a little sugar',130,'can','#283e60','#c8892f'],['宇宙カフェオレ','Space café au lait',130,'can','#c89a68','#283e60'],['キャラメルラテ','Caramel latte',150,'bottlecan','#b8742a','#f4e8d0'],['抹茶ラテ缶','Matcha latte',150,'bottlecan','#6a9a3a','#f4f4ee']],
    [['ジャスミンティー','Jasmine tea',160,'pet','#d8d08a','#3c9a5c'],['烏龍茶','Oolong tea',160,'pet','#9a5a22','#d2402e'],['甘いミルクティー','Sweet milk tea',160,'pet','#d8b890','#7a4a22'],['缶ゼリー ぶどう','Shake-it grape jelly',130,'can','#7a3a9a','#e8c440'],['スーパーカフェイン','Super Caffeine',220,'tall','#d2402e','#1d2622']],
    [['深煎りブラック','Dark roast black',130,'can','#1d2622','#c9cdd0'],['ホットカフェオレ','Hot café au lait',130,'can','#a86a3a','#f4e8d0'],['ほっとココア','Hot cocoa',130,'can','#5a3324','#f4e8d0'],['ホットレモン','Hot lemon',150,'pet','#f2d860','#e8853a'],['あまざけ','Amazake, sweet rice drink',150,'bottlecan','#f4f0e0','#d2402e']],
  ]},
  white:{ja:'お茶とお水',en:'TEA & WATER',body:'#e8ecec',trim:'#ffffff',hot:3,rows:[
    [['山の水','Mountain water',120,'pet','#dceef4','#1f8fc0'],['峠の緑茶','Mountain pass green tea',160,'pet','#a8c060','#2c7a3e'],['濃い抹茶','Strong matcha tea',170,'pet','#5a8a30','#1d2622'],['玄米茶','Brown rice tea',160,'pet','#b8a050','#7a4a22'],['そば茶','Buckwheat tea',160,'pet','#b88a50','#2c5a3e']],
    [['カルピスウォーター','Calpis Water',160,'pet','#f4f4ee','#3a78c2'],['イオンウォーター','Ion water',170,'pet','#e4eef4','#1f5fbf'],['ゆずはちみつ','Yuzu and honey',160,'pet','#f2d860','#3c9a5c'],['アセロラドリンク','Acerola drink',160,'pet','#e8506a','#f4f4ee'],['ミニ乳酸菌','Mini probiotic drink',100,'carton','#f4e4c8','#d2402e']],
    [['バナナオレ','Banana milk',130,'can','#f2e080','#3a78c2'],['いちごオレ缶','Strawberry milk',130,'can','#f4c4cc','#d2607a'],['ホット緑茶','Hot green tea',160,'pet','#8aa848','#d2402e'],['ホットほうじ茶','Hot roasted tea',160,'pet','#8a5a2a','#d2402e'],['梅こぶ茶','Plum and kelp tea',130,'can','#b8505a','#2c5a3e']],
  ]},
};
/** A colour darkened (f < 1) or lightened towards white (f > 1). */
/** A product by its Japanese name, for what the save keeps of it; undefined once it has left the shelves and the machines. */
export const goodNamed=(ja:string)=>[...shelfPrices,...Object.values(vendors)].flatMap(aisle=>aisle.rows.flat()).find(item=>item[0]===ja);
// Food and drink to take away pay the reduced 8% (alcohol the full 10%, `tax`), the yen below dropped: what makes konbini totals so rarely round. Eating in, at 10%, is not a thing here.
export const taxed=(price:number,tax=8)=>Math.floor(price*(100+tax)/100);
// Each chain prices a product its own way, the same in all its shops: up to ¥20 either side before tax, so the base still ends in 8. Picked from the chain and the product's name, so it never changes.
const nudge=(chain:string,name:string)=>{let h=7;for(const c of chain+name)h=(h*31+c.charCodeAt(0))>>>0;return [-20,-10,0,0,10,20][(h>>>3)%6]};
/** The shelves as a chain sells them: an item's price is what the tag says and the till charges, tax included. */
export const stockOf=(chain:string):Aisle[]=>shelfPrices.map(aisle=>({...aisle,rows:aisle.rows.map(row=>row.map((item):Item=>{const sold=[...item] as Item;sold[2]=taxed(item[2]+nudge(chain,item[0]),aisle.tax);sold[6]=aisle.adult;return sold}))}));
export const shade=(hex:string,f:number)=>{const n=parseInt(hex.slice(1),16);return '#'+[n>>16,n>>8&255,n&255].map(v=>Math.round(f<1?v*f:v+(255-v)*(f-1)).toString(16).padStart(2,'0')).join('')};
/** One facing of a product, in picture pixels: bread in its bag, a sandwich, a stand-up pouch, a pillow bag of crisps, a tube, a cup, a can, a PET bottle, a paper pack. */
export function paintItem(g:CanvasRenderingContext2D,kind:Kind,l:number,t:number,w:number,h:number,a:string,b:string){
  const px=(x:number,y:number,pw:number,ph:number,c:string)=>{if(pw>0&&ph>0){g.fillStyle=c;g.fillRect(x,y,pw,ph)}},edge=shade(a,.7),light=shade(a,1.35),cx=l+(w>>1),wrap=()=>{px(l+1,t,w-2,1,'#e8eef0');for(let y=1;y<h-1;y+=2)px(l+1+Math.round((y/h)*(w>>2)),t+y,1,1,'#ffffffb0')};
  switch(kind){
    // The bakery's buns, each in its clear bag (its crimp and a glint over the bread, a sticker in the label's colour): a melon pan's crust scored in a grid, a plain bun, a doughnut and its icing, a split-top roll with its filling.
    case 'melon':case 'bun':case 'donut':{
      const r=w/2,ry=h-1;
      for(let y=0;y<ry;y++){const half=Math.round(r*Math.sqrt(1-((ry-y)/ry)**2)),x0=cx-half;px(x0,t+1+y,half*2,1,y<2?light:y>ry-2?edge:a);if(kind==='melon')for(let x=x0+1;x<x0+half*2-1;x++)if(y>1&&((x+y)%3===0||(x-y+99)%3===0))px(x,t+1+y,1,1,shade(a,1.2))}
      if(kind==='donut'){px(l+2,t+2,w-4,Math.max(2,h>>2),b);px(cx-1,t+(h>>1),2,2,'#3b4341')}else px(l+1,t+h-3,Math.max(2,w>>2),2,b);wrap();break;
    }
    case 'long':px(l+1,t+2,w-2,h-2,a);px(l+2,t+1,w-4,1,light);px(l,t+3,1,h-4,edge);px(l+w-1,t+3,1,h-4,edge);px(l+3,t+2,w-6,Math.max(2,h>>2),b);px(l+1,t+h-1,w-2,1,edge);wrap();break;
    case 'croissant':{
      // Its ridges, tallest in the middle, the filling at its open end.
      const n=4,sw=(w-2)/n;for(let k=0;k<n;k++){const rise=Math.round((h-3)*(k===1||k===2?1:.7)),x0=Math.round(l+1+k*sw);px(x0,t+h-1-rise,Math.round(sw),rise,a);px(x0,t+h-1-rise,1,rise,edge);px(x0+1,t+h-1-rise,Math.round(sw)-1,1,light)}
      px(l+w-3,t+h-4,2,2,b);wrap();break;
    }
    case 'sando':{
      // A sandwich wedge in its pack, the cut face out: bread, the two fillings, bread, under the crust's slope.
      px(l,t,w,h,'#dfe9ec');px(l+w-1,t,1,h,'#b8c4c8');
      for(let y=1;y<h-1;y++){const f=y/(h-1),wide=Math.round((w-2)*f);px(l+1,t+y,wide,1,f<.4?'#f6eed8':f<.6?a:f<.78?b:'#f6eed8');px(l+wide,t+y,1,1,'#c8904a')}
      px(l+w-4,t+1,3,2,'#d2402e');break;
    }
    case 'pack':px(l,t,w,h,'#e4ecee');px(l+w-1,t,1,h,'#b8c4c8');for(let k=0;k<3;k++){const bx=Math.round(l+1+k*(w-2)/3),bw=Math.round((w-2)/3)-1;px(bx+1,t+4,bw-1,h-5,a);px(bx,t+5,bw+1,h-7,a);px(bx+1,t+4,bw-1,1,light)}px(l+1,t+1,w-2,2,b);break;
    case 'bag':case 'bigbag':{
      // Crimped seals, the body, the window on the crisps (or whatever is inside) and the name band.
      px(l,t+1,w,h-2,a);for(let x=l;x<l+w;x+=2){px(x,t,1,1,edge);px(x+1,t+h-1,1,1,edge)}px(l+w-1,t+1,1,h-2,edge);px(l+1,t+2,1,h-4,light);
      const r=Math.max(1,Math.min(w,h)>>2),cy=t+(h*.58|0);for(let y=-r;y<=r;y++){const half=Math.round(Math.sqrt(r*r-y*y)*1.2);px(cx-half,cy+y,half*2,1,b)}
      px(l+2,t+3,w-4,Math.max(1,h>>3),'#f4f4ee');px(l+3,t+3+Math.max(1,h>>3),w-6,1,shade(a,.85));break;
    }
    case 'pouch':px(l+1,t,w-2,h,a);px(l,t+2,w,h-2,a);px(l+1,t,w-2,1,edge);px(l+w-1,t+2,1,h-2,edge);px(l+2,t+(h>>1),w-4,Math.max(1,h>>2),b);px(l+3,t+(h>>1)+1,1,1,'#f4f4ee');px(l+2,t+2,w-4,Math.max(1,h>>3),shade(a,1.25));break;
    case 'tube':px(l,t,w,2,shade(a,.6));px(l,t+2,w,h-2,a);px(l+1,t+2,1,h-2,light);px(l+w-1,t+2,1,h-2,edge);px(l+1,t+(h*.35|0),w-2,Math.max(2,h>>2),'#f4f4ee');px(l+2,t+(h*.35|0)+1,w-4,Math.max(1,h>>3),b);break;
    // A paper cup narrowing to its foot under a foil lid, its label round the middle.
    case 'cup':px(l,t,w,2,'#c9cdd0');px(l,t+1,w,1,'#9aa0a4');for(let y=2;y<h;y++){const inset=Math.round((y-2)/(h-2)*1.5);px(l+inset,t+y,w-2*inset,1,y>h*.35&&y<h*.7?b:a);px(l+w-1-inset,t+y,1,1,edge)}px(cx-1,t+(h>>1),2,2,'#f4f4ee');break;
    // A triangle of rice, its lower half wrapped in nori, the filling's colour on the wrapper's tab.
    // `bare`: no nori at all, the filling showing through the rice's middle.
    case 'onigiri':case 'bare':{const fold=kind==='bare'?h:h*.45|0;for(let y=0;y<h;y++){const half=Math.max(1,Math.round((y+1)/h*w/2)),nori=y>=fold;px(cx-half,t+y,half*2,1,nori?'#283e40':a);if(!nori){px(cx-half,t+y,1,1,shade(a,.62));px(cx+half-1,t+y,1,1,shade(a,.62))}}if(kind==='bare')px(cx-2,t+(h>>1),4,Math.max(2,h>>2),b);else px(cx-1,t+fold,2,h-fold,b);break}
    case 'maki':px(l,t,w,h,'#283e40');px(l+1,t,w-2,2,a);px(l+1,t+1,w-2,1,b);px(cx-1,t+(h>>1),2,2,b);px(l+w-1,t+2,1,h-2,'#1d2622');break;
    case 'bottle':{const neck=Math.max(2,h*.35|0),cap=Math.max(2,w>>1);px(cx-(cap>>1),t,cap,2,b);px(cx-(cap>>1),t+2,cap,neck-2,a);px(l+1,t+neck,w-2,1,a);px(l,t+neck+1,w,h-neck-1,a);px(l+1,t+neck+1,1,h-neck-2,light);px(l,t+(h*.6|0),w,Math.max(2,h/4|0),b);break}
    case 'tall':case 'can':px(l,t,w,1,'#c9cdd0');px(l,t+1,w,h-2,a);px(l,t+(h>>1)-1,w,Math.max(2,h>>3),b);px(l+1,t+1,1,h-2,light);px(l,t+h-1,w,1,'#9aa0a4');break;
    // An aluminium bottle can: its screw cap, the long sloping shoulders, the can below.
    case 'bottlecan':{
      const cap=Math.max(2,w>>1),neck=Math.max(4,h*.32|0);px(cx-(cap>>1),t,cap,2,b);px(cx-(cap>>1),t+2,cap,1,'#c9cdd0');
      for(let y=3;y<neck;y++){const inset=Math.round((neck-y)/(neck-3)*(w-cap)/2);px(l+inset,t+y,w-2*inset,1,a)}
      px(l,t+neck,w,h-neck,a);px(l+1,t+neck,1,h-neck-1,light);px(l+w-1,t+neck,1,h-neck,edge);px(l,t+(h*.55|0),w,Math.max(2,h/5|0),b);px(l,t+h-1,w,1,'#9aa0a4');break;
    }
    // A ramune bottle: the blue cap, the pinched neck with its glass marble, the pale glass body.
    case 'ramune':{
      const cap=Math.max(2,w>>1),neck=Math.max(5,h*.4|0);px(cx-(cap>>1),t,cap,2,b);px(cx-(cap>>1),t+2,cap,neck-2,a);px(cx-1,t+(neck>>1),2,2,'#ffffff');px(l+1,t+neck-1,w-2,2,a);
      px(l,t+neck+1,w,h-neck-1,a);px(l+1,t+neck+1,1,h-neck-2,'#ffffffa0');px(l+w-1,t+neck+1,1,h-neck-1,shade(a,.8));px(l,t+(h*.65|0),w,Math.max(2,h/6|0),b);break;
    }
    case 'pet':case 'pet2':{
      // Cap, neck, shoulders, then the clear body (the drink's own colour) round its label.
      const cap=Math.max(2,w>>1),neck=Math.max(2,h/5|0);px(cx-(cap>>1),t,cap,2,b==='#f4f4ee'?'#d2402e':b);px(cx-(cap>>1),t+2,cap,neck-2,shade(a,1.1));
      px(l+1,t+neck,w-2,1,a);px(l,t+neck+1,w,h-neck-1,a);px(l+1,t+neck+1,1,h-neck-2,'#ffffffa0');px(l+w-1,t+neck+1,1,h-neck-1,shade(a,.8));
      px(l,t+(h*.45|0),w,Math.max(2,h/4|0),b);px(l,t+(h*.45|0)+1,w,1,'#f4f4ee');break;
    }
    case 'carton':px(l,t,w,2,shade(a,1.2));px(l+(w>>1),t,1,2,edge);px(l,t+2,w,h-2,a);px(l,t+(h>>1),w,Math.max(2,h>>2),b);px(l+w-1,t+2,1,h-2,edge);break;
  }
}
/** A product up close, filling l,t,w,h as far as its proportions let it, its name printed on the package: the drawing the basket shows, so nothing is taken by mistake. */
export function paintCloseUp(g:CanvasRenderingContext2D,item:Item,l0:number,t0:number,boxW:number,boxH:number){
  const [ja,,,kind,a,b]=item,[dw,dh]=dims[kind],s=Math.min(boxW/dw,boxH/dh),w=Math.round(dw*s),h=Math.round(dh*s),l=l0+((boxW-w)>>1),t=t0+((boxH-h)>>1),cx=l+(w>>1),cy=t+(h>>1),edge=shade(a,.7),light=shade(a,1.35);
  const px=(x:number,y:number,pw:number,ph:number,c:string)=>{if(pw>0&&ph>0){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(pw),Math.round(ph))}};
  const oval=(x:number,y:number,rx:number,ry:number,c:string)=>{for(let dy=-ry;dy<=ry;dy++){const half=Math.round(rx*Math.sqrt(Math.max(0,1-(dy/ry)**2)));px(x-half,y+dy,half*2,1,c)}};
  // The name, on as many lines as it takes, on a plate of its own.
  const plate=(x:number,y:number,pw:number,ph:number,bg='#f8f6ec',ink='#1d2622')=>{
    px(x,y,pw,ph,bg);px(x,y,pw,1,shade(bg,.75));px(x,y+ph-1,pw,1,shade(bg,.75));g.font='10px "Yorimichi Bitmap"';
    const lines:string[]=[];let line='';for(const c of ja){if(g.measureText(line+c).width>pw-4&&line){lines.push(line);line=c.trim()}else line+=c}lines.push(line);
    const top=Math.round(y+(ph-Math.min(lines.length,ph/11|0||1)*11)/2);lines.slice(0,ph/11|0||1).forEach((text,i)=>crispText(g,text,x+(pw-g.measureText(text).width)/2,top+i*11,ink));
  };
  // A clear bag: its film, the crimped ends and a long glint over the bread.
  const film=()=>{px(l,t+5,w,h-10,'#e6eef0');for(let x=l;x<l+w;x+=3){px(x,t,2,5,'#d2dde0');px(x,t+h-5,2,5,'#d2dde0')}};
  const glint=()=>{for(let k=0;k<h-14;k+=2)px(l+6+k/3,t+8+k,2,1,'#ffffffb0')};
  switch(kind){
    case 'melon':case 'bun':case 'donut':{
      film();const rx=(w>>1)-6,ry=(h>>1)-9,y=cy-1;oval(cx,y,rx,ry,edge);oval(cx,y-2,rx-2,ry-2,a);oval(cx-3,y-(ry>>1),rx>>1,ry>>2,light);
      if(kind==='melon')for(let d=-rx;d<rx;d+=6)for(let e=-ry;e<ry;e++){if(Math.abs(d+e)<rx&&(d/rx)**2+(e/ry)**2<.85){px(cx+d+e,y+e,1,1,edge);px(cx+d-e,y+e,1,1,edge)}}
      if(kind==='donut'){oval(cx,y-2,rx-3,ry-3,b);oval(cx,y-1,rx>>2,ry>>2,'#e6eef0')}else if(kind==='bun'){oval(cx,y-1,rx>>2,ry>>2,b);oval(cx,y-2,rx>>3,ry>>3,shade(b,1.3))}
      glint();plate(cx-34,t+h-29,68,24);break;
    }
    case 'long':{film();px(l+6,t+8,w-12,h-30,edge);px(l+8,t+7,w-16,h-30,a);px(l+10,t+8,w-20,3,light);px(l+12,t+15,w-24,h-44,b);px(l+12,t+15,w-24,2,shade(b,.75));glint();plate(l+10,t+h-22,w-20,18);break}
    case 'croissant':{
      film();const n=5,sw=(w-16)/n;for(let k=0;k<n;k++){const rise=Math.round((h-36)*[.6,.85,1,.85,.6][k]),x0=l+8+k*sw;px(x0,t+h-26-rise,sw,rise,a);px(x0,t+h-26-rise,2,rise,edge);px(x0+3,t+h-26-rise,sw-4,2,light)}
      px(l+w-16,t+h-34,6,6,b);glint();plate(l+10,t+h-22,w-20,18);break;
    }
    case 'sando':{
      // The cut face in its film: bread, fillings, bread, the crust down the slope.
      px(l,t,w,h,'#dfe9ec');px(l,t,w,2,'#b8c4c8');px(l+w-2,t,2,h,'#b8c4c8');
      const top=t+4,tall=h-8;for(let y=0;y<tall;y++){const f=y/tall,wide=Math.round((w-8)*f);px(l+4,top+y,wide,1,f<.42?'#f6eed8':f<.62?a:f<.8?b:'#f6eed8');px(l+3+wide,top+y,3,1,'#c8904a')}
      px(l+w-30,t+6,26,12,'#d2402e');plate(l+6,t+h-24,w-12,20);break;
    }
    case 'pack':{
      px(l,t,w,h,'#e4ecee');px(l,t,w,1,'#b8c4c8');px(l+w-2,t,2,h,'#b8c4c8');const n=3,bw=(w-10)/n;
      for(let k=0;k<n;k++){const x0=l+5+k*bw;px(x0+2,t+16,bw-4,h-18,a);px(x0,t+20,bw,h-26,a);px(x0,t+h-8,bw,2,edge);px(x0+4,t+18,bw-8,3,light)}
      plate(l+4,t+2,w-8,14,b,'#fffef2');break;
    }
    case 'bag':case 'bigbag':{
      px(l,t+5,w,h-10,a);for(let x=l;x<l+w;x+=3){px(x,t,2,5,edge);px(x+1,t+h-5,2,5,edge)}px(l+w-3,t+5,3,h-10,edge);px(l+3,t+5,3,h-10,light);
      const r=Math.min(w,h)*.3|0,y=t+(h*.66|0);oval(cx,y,r,r,b);for(let k=0;k<7;k++)oval(cx-r/2+(k*13)%r,y-r/3+(k*7)%(r>>1),4,3,shade(b,k&1?1.3:.85));
      plate(l+6,t+10,w-12,Math.max(24,h>>2));break;
    }
    case 'pouch':px(l+2,t,w-4,h,a);px(l,t+4,w,h-4,a);px(l+2,t,w-4,3,edge);px(l+w-3,t+4,3,h-4,edge);px(l+4,t+6,w-8,4,light);oval(cx,t+h-22,w>>2,14,b);plate(l+5,t+14,w-10,36);break;
    case 'tube':px(l,t+6,w,h-6,a);px(l,t,w,6,shade(a,.6));px(l+1,t+1,w-2,1,light);px(l+3,t+6,3,h-6,light);px(l+w-4,t+6,4,h-6,edge);plate(l+1,t+(h*.3|0),w-2,h*.45|0);px(l,t+h-5,w,5,b);break;
    case 'cup':{
      px(l,t,w,6,'#c9cdd0');px(l,t+4,w,2,'#9aa0a4');for(let y=6;y<h;y++){const inset=Math.round((y-6)/(h-6)*5);px(l+inset,t+y,w-2*inset,1,a);px(l+w-3-inset,t+y,3,1,edge);px(l+inset+2,t+y,2,1,light)}
      px(l+3,t+(h*.25|0),w-6,4,b);plate(l+4,t+(h*.35|0),w-8,h*.4|0);break;
    }
    case 'onigiri':case 'bare':{
      const fold=kind==='bare'?h:h*.42|0;for(let y=0;y<h;y++){const half=Math.max(2,Math.round((y+2)/h*w/2)),nori=y>=fold;px(cx-half,t+y,half*2,1,nori?'#283e40':a);if(!nori){px(cx-half,t+y,2,1,shade(a,.62));px(cx+half-2,t+y,2,1,shade(a,.62))}else px(cx-half,t+y,3,1,'#3f5a5c')}
      if(kind==='bare')oval(cx,t+(h*.5|0),w>>3,h>>3,b);else px(cx-5,t+fold-3,10,h-fold+3,b);plate(cx-30,t+h-30,60,24);break;
    }
    case 'maki':px(l,t,w,h,'#283e40');px(l+2,t,w-4,6,a);px(l+3,t+2,w-6,3,b);px(l+3,t+8,3,h-12,'#3f5a5c');plate(l+1,t+(h*.3|0),w-2,h*.5|0);break;
    case 'bottle':{
      const neck=h*.34|0,cap=w>>1;px(cx-(cap>>1),t,cap,10,b);px(cx-(cap>>1)+1,t+10,cap-2,neck-10,a);for(let y=0;y<10;y++){const inset=Math.round((10-y)/10*(w/2-cap/2));px(l+inset,t+neck+y,w-2*inset,1,a)}
      px(l,t+neck+10,w,h-neck-10,a);px(l+3,t+neck+10,3,h-neck-12,shade(a,1.4));px(l+w-3,t+neck+10,3,h-neck-10,edge);plate(l+1,t+(h*.56|0),w-2,h*.32|0);break;
    }
    case 'tall':case 'can':px(l+3,t,w-6,4,'#c9cdd0');px(l,t+4,w,h-8,a);px(l+3,t+h-4,w-6,4,'#9aa0a4');px(l+3,t+4,3,h-8,light);px(l+w-4,t+4,4,h-8,edge);px(l,t+(h*.22|0),w,4,b);plate(l,t+(h*.32|0),w,h*.46|0);break;
    case 'bottlecan':{
      const cap=w>>1,neck=h*.3|0;px(cx-(cap>>1),t,cap,8,b);px(cx-(cap>>1),t+8,cap,2,'#c9cdd0');
      for(let y=10;y<neck;y++){const inset=Math.round((neck-y)/(neck-10)*(w/2-cap/2));px(l+inset,t+y,w-2*inset,1,a)}
      px(l,t+neck,w,h-neck-3,a);px(l+3,t+h-3,w-6,3,'#9aa0a4');px(l+3,t+neck,3,h-neck-3,light);px(l+w-4,t+neck,4,h-neck-3,edge);px(l,t+(h*.38|0),w,4,b);plate(l,t+(h*.44|0),w,h*.4|0);break;
    }
    case 'ramune':{
      const cap=w>>1,neck=h*.38|0;px(cx-(cap>>1),t,cap,8,b);px(cx-(cap>>1)+2,t+8,cap-4,neck-14,a);oval(cx,t+neck-10,5,5,'#ffffff');oval(cx-1,t+neck-11,2,2,a);for(let y=0;y<10;y++){const inset=Math.round((10-y)/10*(w/2-cap/2));px(l+inset,t+neck-4+y,w-2*inset,1,a)}
      px(l,t+neck+6,w,h-neck-6,a);px(l+3,t+neck+6,3,h-neck-8,'#ffffffa0');px(l+w-3,t+neck+6,3,h-neck-6,shade(a,.8));plate(l,t+(h*.56|0),w,h*.34|0,b,'#fffef2');break;
    }
    case 'pet':case 'pet2':{
      const cap=w>>1,neck=h*.16|0;px(cx-(cap>>1),t,cap,6,b==='#f4f4ee'?'#d2402e':b);px(cx-(cap>>1),t+6,cap,1,'#ffffff80');px(cx-(cap>>1)+2,t+7,cap-4,neck-7,shade(a,1.15));
      for(let y=0;y<8;y++){const inset=Math.round((8-y)/8*(w/2-cap/2));px(l+inset,t+neck+y,w-2*inset,1,a)}
      px(l,t+neck+8,w,h-neck-8,a);px(l+3,t+neck+8,3,h-neck-10,'#ffffffa0');px(l+w-3,t+neck+8,3,h-neck-8,shade(a,.8));for(let y=t+h-10;y<t+h;y+=4)px(l,y,w,1,shade(a,.88));
      px(l,t+(h*.36|0),w,h*.4|0,b);plate(l,t+(h*.4|0),w,h*.32|0);break;
    }
    case 'carton':px(l,t+10,w,h-10,a);for(let y=0;y<10;y++)px(l+y/2,t+y,w-y+0,1,y<3?shade(a,1.2):a);px(cx-1,t,2,10,edge);px(l+w-3,t+10,3,h-10,edge);px(l,t+(h*.28|0),w,4,b);plate(l,t+(h*.36|0),w,h*.44|0);break;
  }
}
