/** The JR lines as ordered lists of the stations they stop at (Japanese names): the single source of the network. The Tokyo fare board draws its lines from it
 * (tokyo-fares.ts, which only adds where things go on the board), and each hub's corridor behind the gates has a staircase for every line through the station (network.ts).
 * Real lines and real stopping orders, but only the stations the game knows: those on the Tokyo board, and the hubs' neighbours. Stations a line skips or that are not
 * in the game are left out, so a rapid service simply omits stations its local counterpart lists. The order of `railLines` is also the order lines take side by side on the board. */
export interface RailLine {id:string;ja:string;en:string;color:string;service:'local'|'shinkansen';stops:string[];loop?:boolean}
/** The Yamanote Line, from Tokyo the way the board's loop runs (north first). */
export const yamanoteStops=['東京','神田','秋葉原','御徒町','上野','鶯谷','日暮里','西日暮里','田端','駒込','巣鴨','大塚','池袋','目白','高田馬場','新大久保','新宿','代々木','原宿','渋谷','恵比寿','目黒','五反田','大崎','品川','高輪ゲートウェイ','田町','浜松町','新橋','有楽町'];
const local=(id:string,ja:string,en:string,color:string,stops:string,loop=false):RailLine=>({id,ja,en,color,service:'local',stops:stops.split(' '),loop});
export const railLines:RailLine[]=[
  local('yamanote','山手線','Yamanote Line','#80c241',yamanoteStops.join(' '),true),
  local('chuo-rapid','中央線快速','Chuo Line (Rapid)','#f15a22','東京 神田 御茶ノ水 四ツ谷 新宿 中野 高円寺 阿佐ケ谷 荻窪 西荻窪 吉祥寺 三鷹 武蔵境 東小金井 武蔵小金井 国分寺 西国分寺 国立 立川 日野 豊田 八王子 西八王子 高尾'),
  local('saikyo','埼京線','Saikyo Line','#00ac9a','大崎 恵比寿 渋谷 新宿 池袋 板橋 十条 赤羽 大宮'),
  local('keihin-tohoku','京浜東北線','Keihin-Tohoku Line','#00b2e5','大宮 さいたま新都心 与野 北浦和 浦和 南浦和 蕨 西川口 川口 赤羽 田端 西日暮里 日暮里 鶯谷 上野 御徒町 秋葉原 神田 東京 有楽町 新橋 浜松町 田町 高輪ゲートウェイ 品川 川崎 横浜 大船'),
  local('utsunomiya','宇都宮線','Utsunomiya Line','#f68b1f','東京 上野 尾久 赤羽 浦和 さいたま新都心 大宮 土呂 東大宮 蓮田 白岡 新白岡 久喜 東鷲宮 栗橋 古河 野木 間々田 小山'),
  local('takasaki','高崎線','Takasaki Line','#f68b1f','東京 上野 尾久 赤羽 浦和 さいたま新都心 大宮 宮原 上尾 北上尾 桶川 北本 鴻巣 北鴻巣 吹上 行田 熊谷'),
  local('joban','常磐線','Joban Line','#00a07a','東京 上野 日暮里 北千住 松戸 柏 我孫子 天王台 取手 藤代 龍ケ崎市 牛久 ひたち野うしく 荒川沖 土浦'),
  local('tokaido','東海道線','Tokaido Line','#f39a2d','東京 新橋 品川 川崎 横浜 戸塚 大船 藤沢 辻堂 茅ケ崎 平塚 大磯 二宮 国府津 鴨宮 小田原 早川 根府川 真鶴 湯河原 熱海'),
  local('yokosuka-sobu','横須賀・総武快速線','Yokosuka · Sobu Rapid','#0067c0','千葉 稲毛 津田沼 船橋 市川 新小岩 錦糸町 馬喰町 新日本橋 東京 新橋 品川 横浜 戸塚 大船 北鎌倉 鎌倉 逗子 東逗子 田浦 横須賀 衣笠 久里浜'),
  local('chuo-main','中央本線','Chuo Main Line','#f15a22','高尾 相模湖 藤野 上野原 四方津 梁川 鳥沢 猿橋 大月 初狩 笹子 甲斐大和 勝沼ぶどう郷 塩山 東山梨 山梨市 春日居町 石和温泉 酒折 甲府'),
  local('chuo-sobu','中央・総武線各駅停車','Chuo-Sobu Line (Local)','#ffd400','三鷹 吉祥寺 西荻窪 荻窪 阿佐ケ谷 高円寺 中野 新宿 代々木 四ツ谷 御茶ノ水 秋葉原 錦糸町 新小岩 小岩 市川 本八幡 下総中山 西船橋 船橋 東船橋 津田沼 幕張本郷 幕張 新検見川 稲毛 西千葉 千葉'),
  local('keiyo','京葉線','Keiyo Line','#d01827','東京 八丁堀 越中島 潮見 新木場 葛西臨海公園 舞浜 新浦安 市川塩浜 南船橋 新習志野 海浜幕張 検見川浜 稲毛海岸 千葉みなと 蘇我'),
  local('joban-local','常磐線各駅停車','Joban Line (Local)','#868e93','北千住 松戸 柏 北柏 我孫子 天王台 取手'),
  local('sotobo','外房線','Sotobo Line','#cf3e5c','千葉 本千葉 蘇我'),
  // Around Kyoto, in JR West's line colours (the Sagano Line keeps the game's own).
  local('biwako-kyoto','琵琶湖線・JR京都線','Biwako · JR Kyoto Line','#0072bc','米原 彦根 草津 山科 京都 高槻 新大阪 大阪'),
  local('kosei','湖西線','Kosei Line','#00a3d9','近江今津 堅田 大津京 山科 京都'),
  local('nara','奈良線','Nara Line','#a8743c','京都 東福寺 稲荷 宇治 奈良'),
  local('sagano','嵯峨野線','Sagano Line','#b45843','京都 丹波口 二条 嵯峨嵐山 亀岡 園部'),
  {id:'tokaido-shinkansen',ja:'東海道新幹線',en:'Tokaido Shinkansen',color:'#2a6fb3',service:'shinkansen',stops:['東京','品川','新横浜','名古屋','京都','新大阪']},
  {id:'tohoku-shinkansen',ja:'東北新幹線',en:'Tohoku Shinkansen',color:'#3c9a5c',service:'shinkansen',stops:['東京','上野','大宮','宇都宮','仙台']},
];
/** Every stop's English name, as the signs and boards give it. */
export const stopNames:Record<string,string>={東京:'Tokyo', 神田:'Kanda', 御茶ノ水:'Ochanomizu', 四ツ谷:'Yotsuya', 新宿:'Shinjuku', 中野:'Nakano', 高円寺:'Koenji', 阿佐ケ谷:'Asagaya', 荻窪:'Ogikubo', 西荻窪:'Nishi-Ogikubo', 吉祥寺:'Kichijoji', 三鷹:'Mitaka', 武蔵境:'Musashi-Sakai', 東小金井:'Higashi-Koganei', 武蔵小金井:'Musashi-Koganei', 国分寺:'Kokubunji', 西国分寺:'Nishi-Kokubunji', 国立:'Kunitachi', 立川:'Tachikawa', 日野:'Hino', 豊田:'Toyoda', 八王子:'Hachioji', 西八王子:'Nishi-Hachioji', 高尾:'Takao', 大崎:'Osaki', 恵比寿:'Ebisu', 渋谷:'Shibuya', 池袋:'Ikebukuro', 板橋:'Itabashi', 十条:'Jujo', 赤羽:'Akabane', 大宮:'Omiya', さいたま新都心:'Saitama-Shintoshin', 与野:'Yono', 北浦和:'Kita-Urawa', 浦和:'Urawa', 南浦和:'Minami-Urawa', 蕨:'Warabi', 西川口:'Nishi-Kawaguchi', 川口:'Kawaguchi', 田端:'Tabata', 西日暮里:'Nishi-Nippori', 日暮里:'Nippori', 鶯谷:'Uguisudani', 上野:'Ueno', 御徒町:'Okachimachi', 秋葉原:'Akihabara', 有楽町:'Yurakucho', 新橋:'Shimbashi', 浜松町:'Hamamatsucho', 田町:'Tamachi', 高輪ゲートウェイ:'Takanawa Gateway', 品川:'Shinagawa', 川崎:'Kawasaki', 横浜:'Yokohama', 大船:'Ofuna', 尾久:'Oku', 土呂:'Toro', 東大宮:'Higashi-Omiya', 蓮田:'Hasuda', 白岡:'Shiraoka', 新白岡:'Shin-Shiraoka', 久喜:'Kuki', 東鷲宮:'Higashi-Washinomiya', 栗橋:'Kurihashi', 古河:'Koga', 野木:'Nogi', 間々田:'Mamada', 小山:'Oyama', 宮原:'Miyahara', 上尾:'Ageo', 北上尾:'Kita-Ageo', 桶川:'Okegawa', 北本:'Kitamoto', 鴻巣:'Konosu', 北鴻巣:'Kita-Konosu', 吹上:'Fukiage', 行田:'Gyoda', 熊谷:'Kumagaya', 北千住:'Kita-Senju', 松戸:'Matsudo', 柏:'Kashiwa', 我孫子:'Abiko', 天王台:'Tennodai', 取手:'Toride', 藤代:'Fujishiro', 龍ケ崎市:'Ryugasakishi', 牛久:'Ushiku', ひたち野うしく:'Hitachino-Ushiku', 荒川沖:'Arakawaoki', 土浦:'Tsuchiura', 戸塚:'Totsuka', 藤沢:'Fujisawa', 辻堂:'Tsujido', 茅ケ崎:'Chigasaki', 平塚:'Hiratsuka', 大磯:'Oiso', 二宮:'Ninomiya', 国府津:'Kozu', 鴨宮:'Kamonomiya', 小田原:'Odawara', 早川:'Hayakawa', 根府川:'Nebukawa', 真鶴:'Manazuru', 湯河原:'Yugawara', 熱海:'Atami', 千葉:'Chiba', 稲毛:'Inage', 津田沼:'Tsudanuma', 船橋:'Funabashi', 市川:'Ichikawa', 新小岩:'Shin-Koiwa', 錦糸町:'Kinshicho', 馬喰町:'Bakurocho', 新日本橋:'Shin-Nihombashi', 北鎌倉:'Kita-Kamakura', 鎌倉:'Kamakura', 逗子:'Zushi', 東逗子:'Higashi-Zushi', 田浦:'Taura', 横須賀:'Yokosuka', 衣笠:'Kinugasa', 久里浜:'Kurihama', 相模湖:'Sagamiko', 藤野:'Fujino', 上野原:'Uenohara', 四方津:'Shiotsu', 梁川:'Yanagawa', 鳥沢:'Torisawa', 猿橋:'Saruhashi', 大月:'Otsuki', 初狩:'Hatsukari', 笹子:'Sasago', 甲斐大和:'Kai-Yamato', 勝沼ぶどう郷:'Katsunuma-budokyo', 塩山:'Enzan', 東山梨:'Higashi-Yamanashi', 山梨市:'Yamanashishi', 春日居町:'Kasugaicho', 石和温泉:'Isawa-onsen', 酒折:'Sakaori', 甲府:'Kofu', 代々木:'Yoyogi', 小岩:'Koiwa', 本八幡:'Motoyawata', 下総中山:'Shimosa-Nakayama', 西船橋:'Nishi-Funabashi', 東船橋:'Higashi-Funabashi', 幕張本郷:'Makuharihongo', 幕張:'Makuhari', 新検見川:'Shin-Kemigawa', 西千葉:'Nishi-Chiba', 八丁堀:'Hatchobori', 越中島:'Etchujima', 潮見:'Shiomi', 新木場:'Shin-Kiba', 葛西臨海公園:'Kasai-Rinkai-Koen', 舞浜:'Maihama', 新浦安:'Shin-Urayasu', 市川塩浜:'Ichikawashiohama', 南船橋:'Minami-Funabashi', 新習志野:'Shin-Narashino', 海浜幕張:'Kaihimmakuhari', 検見川浜:'Kemigawahama', 稲毛海岸:'Inagekaigan', 千葉みなと:'Chiba-Minato', 蘇我:'Soga', 北柏:'Kita-Kashiwa', 本千葉:'Hon-Chiba', 米原:'Maibara', 彦根:'Hikone', 草津:'Kusatsu', 山科:'Yamashina', 京都:'Kyoto', 高槻:'Takatsuki', 新大阪:'Shin-Osaka', 大阪:'Osaka', 近江今津:'Omi-Imazu', 堅田:'Katata', 大津京:'Otsukyo', 東福寺:'Tofukuji', 稲荷:'Inari', 宇治:'Uji', 奈良:'Nara', 丹波口:'Tambaguchi', 二条:'Nijo', 嵯峨嵐山:'Saga-Arashiyama', 亀岡:'Kameoka', 園部:'Sonobe', 駒込:'Komagome', 巣鴨:'Sugamo', 大塚:'Otsuka', 目白:'Mejiro', 高田馬場:'Takadanobaba', 新大久保:'Shin-Okubo', 原宿:'Harajuku', 目黒:'Meguro', 五反田:'Gotanda', 新横浜:'Shin-Yokohama', 名古屋:'Nagoya', 宇都宮:'Utsunomiya', 仙台:'Sendai'};
// Every stop of every line has its English name.
for(const line of railLines)for(const stop of line.stops)if(!stopNames[stop])throw Error(`No English name for ${stop} (${line.en})`);
export const railLine=(id:string)=>{const line=railLines.find(line=>line.id===id);if(!line)throw Error(`Unknown line ${id}`);return line};
/** The lines stopping at a station, in board order. */
export const linesAt=(station:string,service?:RailLine['service'])=>railLines.filter(line=>line.stops.includes(station)&&(!service||line.service===service));
/** The lines a traveller can start on at `from` to reach `to` with the fewest changes (local lines only): the platforms a fare ticket can sensibly be used from. */
export function firstLegs(from:string,to:string){
  // Breadth first over lines: each level is one more change; every line remembers which first lines reach it at its level.
  let level=new Map(linesAt(from,'local').map(line=>[line.id,new Set([line.id])]));const seen=new Set(level.keys());
  while(level.size){
    const found=[...level].filter(([id])=>railLine(id).stops.includes(to));
    if(found.length)return new Set(found.flatMap(([,firsts])=>[...firsts]));
    const next=new Map<string,Set<string>>();
    for(const [id,firsts] of level)for(const station of railLine(id).stops)for(const line of linesAt(station,'local'))if(!seen.has(line.id)){const set=next.get(line.id)??new Set();firsts.forEach(first=>set.add(first));next.set(line.id,set)}
    next.forEach((_,id)=>seen.add(id));level=next;
  }
  return new Set<string>();
}
