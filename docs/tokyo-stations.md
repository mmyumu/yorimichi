# Tokyo fare board: stations by line

Developer cheat sheet for the wall map in the ticket hall (`src/tokyo-fares.ts`). Fares are adult paper fares from Tokyo station, as printed on the board. Stations in **bold** are the 30 destinations you can travel to (`tokyoStations`); the others are drawn with their fare but cannot be chosen after purchase. km is the shortest operating distance from Tokyo (`stopKm`); the fare comes from the 2026 JR East 幹線 table (see `REFERENCES.md`). Stations on several lines are repeated in each. The sections follow the lines of `src/rail.ts`, the source of truth; regenerate them when it changes.

## Fares at a glance

| Fare | Stations |
|---:|---|
| ¥160 | 神田 Kanda, 秋葉原 Akihabara, 御徒町 Okachimachi, **新橋 Shimbashi**, 有楽町 Yurakucho, 御茶ノ水 Ochanomizu, 新日本橋 Shin-Nihombashi, 馬喰町 Bakurocho, 八丁堀 Hatchobori, 越中島 Etchujima |
| ¥200 | **上野 Ueno**, 鶯谷 Uguisudani, 日暮里 Nippori, 高輪ゲートウェイ Takanawa Gateway, 田町 Tamachi, 浜松町 Hamamatsucho, 錦糸町 Kinshicho, 潮見 Shiomi |
| ¥210 | 西日暮里 Nishi-Nippori, 田端 Tabata, 駒込 Komagome, 巣鴨 Sugamo, 代々木 Yoyogi, 五反田 Gotanda, 大崎 Osaki, **品川 Shinagawa**, 四ツ谷 Yotsuya, 尾久 Oku, **新小岩 Shin-Koiwa**, 新木場 Shin-Kiba |
| ¥260 | 大塚 Otsuka, **池袋 Ikebukuro**, 目白 Mejiro, 高田馬場 Takadanobaba, 新大久保 Shin-Okubo, **新宿 Shinjuku**, 原宿 Harajuku, **渋谷 Shibuya**, 恵比寿 Ebisu, 目黒 Meguro, 中野 Nakano, **赤羽 Akabane**, 板橋 Itabashi, 北千住 Kita-Senju, 小岩 Koiwa, 葛西臨海公園 Kasai-Rinkai-Koen, 舞浜 Maihama |
| ¥350 | 高円寺 Koenji, 阿佐ケ谷 Asagaya, 荻窪 Ogikubo, 蕨 Warabi, 西川口 Nishi-Kawaguchi, 川口 Kawaguchi, 十条 Jujo, 市川 Ichikawa, 本八幡 Motoyawata, 下総中山 Shimosa-Nakayama, 新浦安 Shin-Urayasu, 市川塩浜 Ichikawashiohama, **川崎 Kawasaki** |
| ¥440 | 西荻窪 Nishi-Ogikubo, **吉祥寺 Kichijoji**, 三鷹 Mitaka, **浦和 Urawa**, 南浦和 Minami-Urawa, 松戸 Matsudo, 西船橋 Nishi-Funabashi, **船橋 Funabashi**, 東船橋 Higashi-Funabashi |
| ¥530 | 武蔵境 Musashi-Sakai, 東小金井 Higashi-Koganei, 武蔵小金井 Musashi-Koganei, さいたま新都心 Saitama-Shintoshin, 与野 Yono, 北浦和 Kita-Urawa, 津田沼 Tsudanuma, 幕張本郷 Makuharihongo, 南船橋 Minami-Funabashi, 新習志野 Shin-Narashino, **横浜 Yokohama** |
| ¥620 | 国分寺 Kokubunji, 西国分寺 Nishi-Kokubunji, 国立 Kunitachi, **大宮 Omiya**, 土呂 Toro, 宮原 Miyahara, **柏 Kashiwa**, 北柏 Kita-Kashiwa, 幕張 Makuhari, 新検見川 Shin-Kemigawa, 海浜幕張 Kaihimmakuhari, 検見川浜 Kemigawahama |
| ¥720 | **立川 Tachikawa**, 東大宮 Higashi-Omiya, 蓮田 Hasuda, **上尾 Ageo**, 我孫子 Abiko, 天王台 Tennodai, 稲毛 Inage, 西千葉 Nishi-Chiba, **千葉 Chiba**, 稲毛海岸 Inagekaigan, 千葉みなと Chiba-Minato |
| ¥810 | 日野 Hino, 豊田 Toyoda, 白岡 Shiraoka, 北上尾 Kita-Ageo, 桶川 Okegawa, **取手 Toride**, 本千葉 Hon-Chiba, **蘇我 Soga**, 戸塚 Totsuka |
| ¥910 | **八王子 Hachioji**, 西八王子 Nishi-Hachioji, 新白岡 Shin-Shiraoka, **久喜 Kuki**, 北本 Kitamoto, 藤代 Fujishiro, **大船 Ofuna** |
| ¥1,040 | **高尾 Takao**, 東鷲宮 Higashi-Washinomiya, 栗橋 Kurihashi, 鴻巣 Konosu, 北鴻巣 Kita-Konosu, 吹上 Fukiage, 行田 Gyoda, 龍ケ崎市 Ryugasakishi, 牛久 Ushiku, 藤沢 Fujisawa, 辻堂 Tsujido, 茅ケ崎 Chigasaki |
| ¥1,230 | 相模湖 Sagamiko, 藤野 Fujino, 上野原 Uenohara, 古河 Koga, 野木 Nogi, **熊谷 Kumagaya**, ひたち野うしく Hitachino-Ushiku, 荒川沖 Arakawaoki, **土浦 Tsuchiura**, 平塚 Hiratsuka, 大磯 Oiso |
| ¥1,410 | 四方津 Shiotsu, 梁川 Yanagawa, 間々田 Mamada, 二宮 Ninomiya, 国府津 Kozu |
| ¥1,600 | 鳥沢 Torisawa, 猿橋 Saruhashi, **大月 Otsuki**, **小山 Oyama**, 鴨宮 Kamonomiya, 小田原 Odawara, 早川 Hayakawa |
| ¥1,790 | 初狩 Hatsukari, 根府川 Nebukawa, 真鶴 Manazuru, 湯河原 Yugawara |
| ¥2,090 | 笹子 Sasago, 甲斐大和 Kai-Yamato, 勝沼ぶどう郷 Katsunuma-budokyo, 塩山 Enzan, **熱海 Atami** |
| ¥2,420 | 東山梨 Higashi-Yamanashi, 山梨市 Yamanashishi, 春日居町 Kasugaicho, 石和温泉 Isawa-onsen, 酒折 Sakaori, **甲府 Kofu** |

## 山手線 · Yamanote Line

Loop, from Tokyo the way the board runs (north first).

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| 神田 | Kanda | 1.3 | ¥160 |
| 秋葉原 | Akihabara | 2 | ¥160 |
| 御徒町 | Okachimachi | 3 | ¥160 |
| **上野** | **Ueno** | 3.6 | **¥200** |
| 鶯谷 | Uguisudani | 4.7 | ¥200 |
| 日暮里 | Nippori | 5.8 | ¥200 |
| 西日暮里 | Nishi-Nippori | 6.3 | ¥210 |
| 田端 | Tabata | 7.1 | ¥210 |
| 駒込 | Komagome | 8.7 | ¥210 |
| 巣鴨 | Sugamo | 9.4 | ¥210 |
| 大塚 | Otsuka | 10.5 | ¥260 |
| **池袋** | **Ikebukuro** | 12.3 | **¥260** |
| 目白 | Mejiro | 13.5 | ¥260 |
| 高田馬場 | Takadanobaba | 13 | ¥260 |
| 新大久保 | Shin-Okubo | 11.6 | ¥260 |
| **新宿** | **Shinjuku** | 10.3 | **¥260** |
| 代々木 | Yoyogi | 9.6 | ¥210 |
| 原宿 | Harajuku | 11.1 | ¥260 |
| **渋谷** | **Shibuya** | 12.3 | **¥260** |
| 恵比寿 | Ebisu | 12.4 | ¥260 |
| 目黒 | Meguro | 10.9 | ¥260 |
| 五反田 | Gotanda | 9.7 | ¥210 |
| 大崎 | Osaki | 8.8 | ¥210 |
| **品川** | **Shinagawa** | 6.8 | **¥210** |
| 高輪ゲートウェイ | Takanawa Gateway | 5.9 | ¥200 |
| 田町 | Tamachi | 4.6 | ¥200 |
| 浜松町 | Hamamatsucho | 3.1 | ¥200 |
| **新橋** | **Shimbashi** | 1.9 | **¥160** |
| 有楽町 | Yurakucho | 0.8 | ¥160 |

## 中央線快速 · Chuo Line (Rapid)

Tokyo → Takao, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| 神田 | Kanda | 1.3 | ¥160 |
| 御茶ノ水 | Ochanomizu | 2.6 | ¥160 |
| 四ツ谷 | Yotsuya | 6.6 | ¥210 |
| **新宿** | **Shinjuku** | 10.3 | **¥260** |
| 中野 | Nakano | 14.7 | ¥260 |
| 高円寺 | Koenji | 16.1 | ¥350 |
| 阿佐ケ谷 | Asagaya | 17.3 | ¥350 |
| 荻窪 | Ogikubo | 18.7 | ¥350 |
| 西荻窪 | Nishi-Ogikubo | 20.6 | ¥440 |
| **吉祥寺** | **Kichijoji** | 22.5 | **¥440** |
| 三鷹 | Mitaka | 24.1 | ¥440 |
| 武蔵境 | Musashi-Sakai | 25.7 | ¥530 |
| 東小金井 | Higashi-Koganei | 27.4 | ¥530 |
| 武蔵小金井 | Musashi-Koganei | 29.1 | ¥530 |
| 国分寺 | Kokubunji | 31.4 | ¥620 |
| 西国分寺 | Nishi-Kokubunji | 32.8 | ¥620 |
| 国立 | Kunitachi | 34.5 | ¥620 |
| **立川** | **Tachikawa** | 37.5 | **¥720** |
| 日野 | Hino | 40.8 | ¥810 |
| 豊田 | Toyoda | 43.1 | ¥810 |
| **八王子** | **Hachioji** | 47.4 | **¥910** |
| 西八王子 | Nishi-Hachioji | 49.8 | ¥910 |
| **高尾** | **Takao** | 53.1 | **¥1,040** |

## 埼京線 · Saikyo Line

Osaki → Omiya, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 大崎 | Osaki | 8.8 | ¥210 |
| 恵比寿 | Ebisu | 12.4 | ¥260 |
| **渋谷** | **Shibuya** | 12.3 | **¥260** |
| **新宿** | **Shinjuku** | 10.3 | **¥260** |
| **池袋** | **Ikebukuro** | 12.3 | **¥260** |
| 板橋 | Itabashi | 14.1 | ¥260 |
| 十条 | Jujo | 15.2 | ¥350 |
| **赤羽** | **Akabane** | 13.2 | **¥260** |
| **大宮** | **Omiya** | 30.3 | **¥620** |

## 京浜東北線 · Keihin-Tohoku Line

Omiya → Ofuna, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| **大宮** | **Omiya** | 30.3 | **¥620** |
| さいたま新都心 | Saitama-Shintoshin | 28.7 | ¥530 |
| 与野 | Yono | 27.6 | ¥530 |
| 北浦和 | Kita-Urawa | 26 | ¥530 |
| **浦和** | **Urawa** | 24.2 | **¥440** |
| 南浦和 | Minami-Urawa | 22.5 | ¥440 |
| 蕨 | Warabi | 19.7 | ¥350 |
| 西川口 | Nishi-Kawaguchi | 17.8 | ¥350 |
| 川口 | Kawaguchi | 15.8 | ¥350 |
| **赤羽** | **Akabane** | 13.2 | **¥260** |
| 田端 | Tabata | 7.1 | ¥210 |
| 西日暮里 | Nishi-Nippori | 6.3 | ¥210 |
| 日暮里 | Nippori | 5.8 | ¥200 |
| 鶯谷 | Uguisudani | 4.7 | ¥200 |
| **上野** | **Ueno** | 3.6 | **¥200** |
| 御徒町 | Okachimachi | 3 | ¥160 |
| 秋葉原 | Akihabara | 2 | ¥160 |
| 神田 | Kanda | 1.3 | ¥160 |
| 東京 | Tokyo | 0 | start |
| 有楽町 | Yurakucho | 0.8 | ¥160 |
| **新橋** | **Shimbashi** | 1.9 | **¥160** |
| 浜松町 | Hamamatsucho | 3.1 | ¥200 |
| 田町 | Tamachi | 4.6 | ¥200 |
| 高輪ゲートウェイ | Takanawa Gateway | 5.9 | ¥200 |
| **品川** | **Shinagawa** | 6.8 | **¥210** |
| **川崎** | **Kawasaki** | 18.2 | **¥350** |
| **横浜** | **Yokohama** | 28.8 | **¥530** |
| **大船** | **Ofuna** | 46.5 | **¥910** |

## 宇都宮線 · Utsunomiya Line

Tokyo → Oyama, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| **上野** | **Ueno** | 3.6 | **¥200** |
| 尾久 | Oku | 8.4 | ¥210 |
| **赤羽** | **Akabane** | 13.2 | **¥260** |
| **浦和** | **Urawa** | 24.2 | **¥440** |
| さいたま新都心 | Saitama-Shintoshin | 28.7 | ¥530 |
| **大宮** | **Omiya** | 30.3 | **¥620** |
| 土呂 | Toro | 33.3 | ¥620 |
| 東大宮 | Higashi-Omiya | 35.4 | ¥720 |
| 蓮田 | Hasuda | 39.2 | ¥720 |
| 白岡 | Shiraoka | 43.5 | ¥810 |
| 新白岡 | Shin-Shiraoka | 45.9 | ¥910 |
| **久喜** | **Kuki** | 48.9 | **¥910** |
| 東鷲宮 | Higashi-Washinomiya | 51.6 | ¥1,040 |
| 栗橋 | Kurihashi | 57.2 | ¥1,040 |
| 古河 | Koga | 64.7 | ¥1,230 |
| 野木 | Nogi | 69.4 | ¥1,230 |
| 間々田 | Mamada | 73.3 | ¥1,410 |
| **小山** | **Oyama** | 80.6 | **¥1,600** |

## 高崎線 · Takasaki Line

Tokyo → Kumagaya, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| **上野** | **Ueno** | 3.6 | **¥200** |
| 尾久 | Oku | 8.4 | ¥210 |
| **赤羽** | **Akabane** | 13.2 | **¥260** |
| **浦和** | **Urawa** | 24.2 | **¥440** |
| さいたま新都心 | Saitama-Shintoshin | 28.7 | ¥530 |
| **大宮** | **Omiya** | 30.3 | **¥620** |
| 宮原 | Miyahara | 34.3 | ¥620 |
| **上尾** | **Ageo** | 38.5 | **¥720** |
| 北上尾 | Kita-Ageo | 40.2 | ¥810 |
| 桶川 | Okegawa | 42.1 | ¥810 |
| 北本 | Kitamoto | 46.7 | ¥910 |
| 鴻巣 | Konosu | 50.3 | ¥1,040 |
| 北鴻巣 | Kita-Konosu | 54.6 | ¥1,040 |
| 吹上 | Fukiage | 57.6 | ¥1,040 |
| 行田 | Gyoda | 59.9 | ¥1,040 |
| **熊谷** | **Kumagaya** | 64.7 | **¥1,230** |

## 常磐線 · Joban Line

Tokyo → Tsuchiura, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| **上野** | **Ueno** | 3.6 | **¥200** |
| 日暮里 | Nippori | 5.8 | ¥200 |
| 北千住 | Kita-Senju | 11 | ¥260 |
| 松戸 | Matsudo | 21.5 | ¥440 |
| **柏** | **Kashiwa** | 32.7 | **¥620** |
| 我孫子 | Abiko | 37.1 | ¥720 |
| 天王台 | Tennodai | 39.8 | ¥720 |
| **取手** | **Toride** | 43.2 | **¥810** |
| 藤代 | Fujishiro | 49.2 | ¥910 |
| 龍ケ崎市 | Ryugasakishi | 51.3 | ¥1,040 |
| 牛久 | Ushiku | 56.4 | ¥1,040 |
| ひたち野うしく | Hitachino-Ushiku | 60.3 | ¥1,230 |
| 荒川沖 | Arakawaoki | 63 | ¥1,230 |
| **土浦** | **Tsuchiura** | 69.6 | **¥1,230** |

## 東海道線 · Tokaido Line

Tokyo → Atami, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| **新橋** | **Shimbashi** | 1.9 | **¥160** |
| **品川** | **Shinagawa** | 6.8 | **¥210** |
| **川崎** | **Kawasaki** | 18.2 | **¥350** |
| **横浜** | **Yokohama** | 28.8 | **¥530** |
| 戸塚 | Totsuka | 40.9 | ¥810 |
| **大船** | **Ofuna** | 46.5 | **¥910** |
| 藤沢 | Fujisawa | 51.1 | ¥1,040 |
| 辻堂 | Tsujido | 54.8 | ¥1,040 |
| 茅ケ崎 | Chigasaki | 58.6 | ¥1,040 |
| 平塚 | Hiratsuka | 63.8 | ¥1,230 |
| 大磯 | Oiso | 67.8 | ¥1,230 |
| 二宮 | Ninomiya | 73.1 | ¥1,410 |
| 国府津 | Kozu | 77.7 | ¥1,410 |
| 鴨宮 | Kamonomiya | 80.8 | ¥1,600 |
| 小田原 | Odawara | 83.9 | ¥1,600 |
| 早川 | Hayakawa | 86 | ¥1,600 |
| 根府川 | Nebukawa | 90.4 | ¥1,790 |
| 真鶴 | Manazuru | 95.8 | ¥1,790 |
| 湯河原 | Yugawara | 99.1 | ¥1,790 |
| **熱海** | **Atami** | 104.6 | **¥2,090** |

## 横須賀・総武快速線 · Yokosuka · Sobu Rapid

Chiba → Kurihama, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| **千葉** | **Chiba** | 39.2 | **¥720** |
| 稲毛 | Inage | 35.9 | ¥720 |
| 津田沼 | Tsudanuma | 26.7 | ¥530 |
| **船橋** | **Funabashi** | 23.2 | **¥440** |
| 市川 | Ichikawa | 15.4 | ¥350 |
| **新小岩** | **Shin-Koiwa** | 10 | **¥210** |
| 錦糸町 | Kinshicho | 4.8 | ¥200 |
| 馬喰町 | Bakurocho | 2.3 | ¥160 |
| 新日本橋 | Shin-Nihombashi | 1.2 | ¥160 |
| 東京 | Tokyo | 0 | start |
| **新橋** | **Shimbashi** | 1.9 | **¥160** |
| **品川** | **Shinagawa** | 6.8 | **¥210** |
| **横浜** | **Yokohama** | 28.8 | **¥530** |
| 戸塚 | Totsuka | 40.9 | ¥810 |
| **大船** | **Ofuna** | 46.5 | **¥910** |
| 北鎌倉 | Kita-Kamakura | 48.8 | ¥910 |
| **鎌倉** | **Kamakura** | 51 | **¥1,040** |
| 逗子 | Zushi | 54.9 | ¥1,040 |
| 東逗子 | Higashi-Zushi | 56.9 | ¥1,040 |
| 田浦 | Taura | 60.3 | ¥1,230 |
| 横須賀 | Yokosuka | 62.4 | ¥1,230 |
| 衣笠 | Kinugasa | 64.8 | ¥1,230 |
| 久里浜 | Kurihama | 70.4 | ¥1,410 |

## 中央本線 · Chuo Main Line

Takao → Kofu, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| **高尾** | **Takao** | 53.1 | **¥1,040** |
| 相模湖 | Sagamiko | 62.6 | ¥1,230 |
| 藤野 | Fujino | 66.3 | ¥1,230 |
| 上野原 | Uenohara | 69.8 | ¥1,230 |
| 四方津 | Shiotsu | 74 | ¥1,410 |
| 梁川 | Yanagawa | 77.6 | ¥1,410 |
| 鳥沢 | Torisawa | 81.2 | ¥1,600 |
| 猿橋 | Saruhashi | 85.3 | ¥1,600 |
| **大月** | **Otsuki** | 87.8 | **¥1,600** |
| 初狩 | Hatsukari | 93.9 | ¥1,790 |
| 笹子 | Sasago | 100.4 | ¥2,090 |
| 甲斐大和 | Kai-Yamato | 106.5 | ¥2,090 |
| 勝沼ぶどう郷 | Katsunuma-budokyo | 112.5 | ¥2,090 |
| 塩山 | Enzan | 116.9 | ¥2,090 |
| 東山梨 | Higashi-Yamanashi | 120.1 | ¥2,420 |
| 山梨市 | Yamanashishi | 122.2 | ¥2,420 |
| 春日居町 | Kasugaicho | 125 | ¥2,420 |
| 石和温泉 | Isawa-onsen | 127.8 | ¥2,420 |
| 酒折 | Sakaori | 131.2 | ¥2,420 |
| **甲府** | **Kofu** | 134.1 | **¥2,420** |

## 中央・総武線各駅停車 · Chuo-Sobu Line (Local)

Mitaka → Chiba, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 三鷹 | Mitaka | 24.1 | ¥440 |
| **吉祥寺** | **Kichijoji** | 22.5 | **¥440** |
| 西荻窪 | Nishi-Ogikubo | 20.6 | ¥440 |
| 荻窪 | Ogikubo | 18.7 | ¥350 |
| 阿佐ケ谷 | Asagaya | 17.3 | ¥350 |
| 高円寺 | Koenji | 16.1 | ¥350 |
| 中野 | Nakano | 14.7 | ¥260 |
| **新宿** | **Shinjuku** | 10.3 | **¥260** |
| 代々木 | Yoyogi | 9.6 | ¥210 |
| 四ツ谷 | Yotsuya | 6.6 | ¥210 |
| 御茶ノ水 | Ochanomizu | 2.6 | ¥160 |
| 秋葉原 | Akihabara | 2 | ¥160 |
| 錦糸町 | Kinshicho | 4.8 | ¥200 |
| **新小岩** | **Shin-Koiwa** | 10 | **¥210** |
| 小岩 | Koiwa | 12.8 | ¥260 |
| 市川 | Ichikawa | 15.4 | ¥350 |
| 本八幡 | Motoyawata | 17.4 | ¥350 |
| 下総中山 | Shimosa-Nakayama | 19 | ¥350 |
| 西船橋 | Nishi-Funabashi | 20.6 | ¥440 |
| **船橋** | **Funabashi** | 23.2 | **¥440** |
| 東船橋 | Higashi-Funabashi | 25 | ¥440 |
| 津田沼 | Tsudanuma | 26.7 | ¥530 |
| 幕張本郷 | Makuharihongo | 29.6 | ¥530 |
| 幕張 | Makuhari | 31.6 | ¥620 |
| 新検見川 | Shin-Kemigawa | 33.2 | ¥620 |
| 稲毛 | Inage | 35.9 | ¥720 |
| 西千葉 | Nishi-Chiba | 37.8 | ¥720 |
| **千葉** | **Chiba** | 39.2 | **¥720** |

## 京葉線 · Keiyo Line

Tokyo → Soga, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 東京 | Tokyo | 0 | start |
| 八丁堀 | Hatchobori | 1.2 | ¥160 |
| 越中島 | Etchujima | 2.8 | ¥160 |
| 潮見 | Shiomi | 5.4 | ¥200 |
| 新木場 | Shin-Kiba | 7.4 | ¥210 |
| 葛西臨海公園 | Kasai-Rinkai-Koen | 10.6 | ¥260 |
| 舞浜 | Maihama | 12.7 | ¥260 |
| 新浦安 | Shin-Urayasu | 16.1 | ¥350 |
| 市川塩浜 | Ichikawashiohama | 18.2 | ¥350 |
| 南船橋 | Minami-Funabashi | 26 | ¥530 |
| 新習志野 | Shin-Narashino | 28.3 | ¥530 |
| 海浜幕張 | Kaihimmakuhari | 31.7 | ¥620 |
| 検見川浜 | Kemigawahama | 33.7 | ¥620 |
| 稲毛海岸 | Inagekaigan | 35.3 | ¥720 |
| 千葉みなと | Chiba-Minato | 39 | ¥720 |
| **蘇我** | **Soga** | 43 | **¥810** |

## 常磐線各駅停車 · Joban Line (Local)

Kita-Senju → Toride, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| 北千住 | Kita-Senju | 11 | ¥260 |
| 松戸 | Matsudo | 21.5 | ¥440 |
| **柏** | **Kashiwa** | 32.7 | **¥620** |
| 北柏 | Kita-Kashiwa | 35 | ¥620 |
| 我孫子 | Abiko | 37.1 | ¥720 |
| 天王台 | Tennodai | 39.8 | ¥720 |
| **取手** | **Toride** | 43.2 | **¥810** |

## 外房線 · Sotobo Line

Chiba → Soga, stopping where rail.ts says.

| 日本語 | English | km | Fare |
|---|---|---:|---:|
| **千葉** | **Chiba** | 39.2 | **¥720** |
| 本千葉 | Hon-Chiba | 40.6 | ¥810 |
| **蘇我** | **Soga** | 43 | **¥810** |
