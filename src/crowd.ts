import { minuteOfDay, minutes } from './clock';
import { stopNames } from './rail';

/** Where people walk: a station's concourse, the corridor behind its gates, its platforms, the street outside it, and the lane to the traveller's home. */
export type Stage='concourse'|'corridor'|'platform'|'town'|'home-street';
/** How many people each stage holds at the busiest hour of the busiest station. */
const peaks:Record<Stage,number>={concourse:40,corridor:24,platform:56,town:30,'home-street':5};
const list=(names:string)=>names.split(' ');
/** Each station's share of those, roughly by its daily passengers; a station not listed is a suburban one (`usual`). */
const usual=.35;
const tiers:[number,string[]][]=[
  [1,list('新宿 池袋 東京 渋谷 横浜 品川 大阪')],
  [.8,list('新橋 大宮 秋葉原 川崎 上野 高田馬場 京都 北千住')],
  [.6,list('有楽町 浜松町 立川 吉祥寺 船橋 大崎 田町 恵比寿 五反田 西船橋 中野 錦糸町 千葉 赤羽 津田沼 新大阪 神田 目黒 御茶ノ水 四ツ谷 柏 松戸 大船 三鷹 八王子 藤沢 国分寺 戸塚 原宿 浦和 舞浜 鎌倉 代々木 海浜幕張 新木場')],
  [.2,list('鶯谷 尾久 越中島 潮見 市川塩浜 東逗子 田浦 衣笠 鴨宮 国府津 二宮 大磯 湯河原 北鎌倉 高尾 西八王子 東鷲宮 新白岡 北鴻巣 行田 吹上 藤代 龍ケ崎市 間々田 野木 栗橋 土呂 本千葉 丹波口 東福寺 稲荷 宇治 嵯峨嵐山 堅田 大津京 亀岡 園部 彦根 米原 石和温泉 塩山 大月 上野原 熱海 甲府')],
  [.07,list('早川 根府川 真鶴 相模湖 藤野 四方津 梁川 鳥沢 猿橋 初狩 笹子 甲斐大和 勝沼ぶどう郷 東山梨 山梨市 春日居町 酒折 近江今津')],
];
/** The day's shape, the share of a station's crowd out at each hour from midnight: `work`, the two rushes; `leisure`, sightseers from mid-morning to late afternoon;
 * `night`, the rushes and then the bars until the last train. */
const hours={
  work:[.1,.02,0,0,.02,.1,.3,.8,1,.6,.35,.35,.4,.35,.35,.4,.5,.75,.95,.75,.5,.4,.3,.2],
  leisure:[.01,0,0,0,0,.02,.05,.1,.25,.5,.8,.95,1,1,1,.95,.8,.6,.4,.3,.2,.12,.08,.04],
  night:[.35,.1,.05,.03,.05,.15,.25,.6,.8,.55,.4,.45,.5,.5,.5,.55,.65,.8,.95,1,.95,.9,.8,.6],
};
const days:[keyof typeof hours,string[]][]=[
  ['leisure',list('原宿 舞浜 鎌倉 北鎌倉 高尾 熱海 湯河原 葛西臨海公園 石和温泉 嵯峨嵐山 稲荷 宇治 奈良 東福寺')],
  ['night',list('新宿 渋谷 池袋 新橋 上野 有楽町 恵比寿 五反田 高田馬場 新大久保 中野 高円寺 吉祥寺 錦糸町 北千住 赤羽 横浜 川崎 大阪')],
];
// Every station named above is a stop of a line (a misspelt one would quietly stay suburban).
for(const [,names] of [...tiers,...days])for(const name of names)if(!stopNames[name])throw Error(`Crowd: no station ${name}`);
const share=(ja:string)=>tiers.find(([,names])=>names.includes(ja))?.[0]??usual;
/** How busy the station is `at` a minute of the day, from 0 to 1, read between the hours. */
const hourly=(ja:string,at:number)=>{const day=hours[days.find(([,names])=>names.includes(ja))?.[0]??'work'],h=Math.floor(at/60),k=at/60-h;return day[h]+(day[(h+1)%24]-day[h])*k};
/** The most people a stage ever holds at the station `ja`: how many are gathered there, the rest of them waiting out of sight. */
export const busiest=(stage:Stage,ja:string)=>Math.round(peaks[stage]*share(ja));
/** How many people are about on a stage at the station `ja` right now. */
export const crowdAt=(stage:Stage,ja:string)=>Math.round(peaks[stage]*share(ja)*hourly(ja,minuteOfDay(minutes())));
