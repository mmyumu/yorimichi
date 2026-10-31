import type { Layout } from './tokyo-fares';

/** The fare board of the Kyoto side, for every station with a local fare from Kyoto: same drawing as Tokyo's (tokyo-fares.ts), its own layout. Lake Biwa to the north-east,
 * the Sagano Line to Arashiyama and on north-west, the JR Kyoto Line to Osaka south-west, the Nara Line south, and through the city the Karasuma subway and, east of the Kamo, the Keihan. Its fares are those of fares.ts (`fare` left out: there is no transcribed board to check against).
 * `sights` are the places worth a detour, with no stop of their own (Kinkaku-ji is the bus's). */
export const kyotoLayout:Layout={
  centre:'京都',at:[1040,600],brand:'#0072bc',title:'京都 近距離きっぷ運賃表',scope:'JR・地下鉄・京阪 · 一部の駅',
  stations:[
    {id:'osaka',ja:'大阪',en:'Osaka',x:290,y:900},{id:'shin-osaka',ja:'新大阪',en:'Shin-Osaka',x:430,y:900},{id:'takatsuki',ja:'高槻',en:'Takatsuki',x:590,y:900},{id:'nagaokakyo',ja:'長岡京',en:'Nagaokakyo',x:700,y:840},{id:'katsuragawa',ja:'桂川',en:'Katsuragawa',x:810,y:750},
    {id:'nijo',ja:'二条',en:'Nijo',x:860,y:430},{id:'saga-arashiyama',ja:'嵯峨嵐山',en:'Saga-Arashiyama',x:570,y:430},{id:'kameoka',ja:'亀岡',en:'Kameoka',x:400,y:300},{id:'sonobe',ja:'園部',en:'Sonobe',x:290,y:170},
    {id:'inari',ja:'稲荷',en:'Inari',x:1040,y:735},{id:'uji',ja:'宇治',en:'Uji',x:1040,y:905},{id:'nara',ja:'奈良',en:'Nara',x:1040,y:1015},
    {id:'yamashina',ja:'山科',en:'Yamashina',x:1230,y:600},{id:'otsu',ja:'大津',en:'Otsu',x:1320,y:700},{id:'kusatsu',ja:'草津',en:'Kusatsu',x:1640,y:700},{id:'hikone',ja:'彦根',en:'Hikone',x:1790,y:390},{id:'maibara',ja:'米原',en:'Maibara',x:1810,y:190},
    {id:'kokusaikaikan',ja:'国際会館',en:'Kokusaikaikan',x:1040,y:160},{id:'takeda',ja:'竹田',en:'Takeda',x:880,y:850},{id:'demachiyanagi',ja:'出町柳',en:'Demachiyanagi',x:1165,y:210},{id:'chushojima',ja:'中書島',en:'Chushojima',x:1190,y:900},{id:'otsukyo',ja:'大津京',en:'Otsukyo',x:1330,y:470},{id:'katata',ja:'堅田',en:'Katata',x:1390,y:340},{id:'omi-imazu',ja:'近江今津',en:'Omi-Imazu',x:1430,y:190},
  ],
  pins:{京都:[1040,600],七条:[1165,520]},pinSides:{七条:'right'},
  runs:[
    ['京都','桂川','西大路','up'],['桂川','長岡京','向日町','down'],['長岡京','高槻','山崎','down'],['高槻','新大阪','','down'],['新大阪','大阪','','down'],
    ['京都','二条','梅小路京都西 丹波口','left'],['二条','嵯峨嵐山','円町 花園 太秦','up'],['嵯峨嵐山','亀岡','保津峡 馬堀','up'],['亀岡','園部','','left'],
    ['京都','稲荷','東福寺','right'],['稲荷','宇治','JR藤森 桃山 六地蔵 黄檗','left'],['宇治','奈良','','right'],
    ['京都','山科','','up'],['山科','大津','','down'],['大津','草津','膳所 石山 南草津','down'],['草津','彦根','','right'],['彦根','米原','','right'],
    ['京都','国際会館','五条 四条 烏丸御池 丸太町 今出川 鞍馬口 北大路 北山 松ヶ崎','right'],['京都','竹田','九条 十条\u200b くいな橋','left'],['東福寺','七条','','right'],['七条','出町柳','清水五条 祇園四条 三条 神宮丸太町','right'],['東福寺','中書島','鳥羽街道 伏見稲荷 龍谷大前深草 藤森 墨染 丹波橋','right'],
    ['山科','大津京','','left'],['大津京','堅田','','left'],['堅田','近江今津','','left'],
  ],
  drawnVia:{},
  lineLabels:{'biwako-kyoto':[[1700,640,'琵琶湖線'],[235,945,'JR京都線']],kosei:[[1430,280,'湖西線']],nara:[[1060,950,'奈良線']],sagano:[[640,350,'嵯峨野線']],karasuma:[[930,190,'烏丸線']],keihan:[[1230,240,'京阪線']]},
  legendNames:{'biwako-kyoto':'琵琶湖線・JR京都線',keihan:'京阪線'},
  cartouche:{osaka:'up',['shin-osaka']:'down',takatsuki:'up',nagaokakyo:'up-left',katsuragawa:'up-left',nijo:'up',['saga-arashiyama']:'down',kameoka:'left',sonobe:'right',inari:'left',uji:'left',nara:'left',yamashina:'down-right',otsu:'left',kusatsu:'down',hikone:'left',maibara:'left',otsukyo:'right',katata:'left',['omi-imazu']:'left',kokusaikaikan:'left',takeda:'down',demachiyanagi:'up',chushojima:'right'},
  water:[
    {d:'M1560 150 Q1660 130 1700 210 Q1740 300 1690 420 Q1640 540 1540 600 Q1470 640 1450 590 Q1470 500 1500 420 Q1490 260 1560 150Z'},
    // The Katsura, from Arashiyama past its station down to the Yodo; the Kamo through the city to join it.
    {d:'M470 300 Q560 360 610 470 Q690 620 810 700 Q850 790 760 890 Q700 960 640 1060',river:true},{d:'M1150 150 Q1130 400 1135 560 Q1130 720 980 810 Q880 860 790 860',river:true},
  ],
  waterNames:[[1560,430,'琵琶湖'],[668,560,'桂川'],[1090,138,'鴨川']],
  sights:[[440,470,'竹林の小径'],[640,235,'金閣寺'],[896,392,'二条城'],[1180,480,'清水寺'],[800,640,'東寺'],[1235,736,'伏見稲荷大社'],[1060,905,'平等院'],[1100,1040,'東大寺']],
};
