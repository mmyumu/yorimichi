# Ticket machine references

Consulted on 22 October 2026.

Official source: [JR West — How to use a ticket vending machine](https://www.westjr.co.jp/global/en/howto/ticket-vending-machine/).

## Local tickets

The "Purchasing tickets" section shows the ordinary blue machines. The redrawn layout keeps the blue/cyan background, the light raised keys, the language switch at the top, the red cancel key at the bottom, the yellow back key and the fare keys.

- `img_vending_machines_03.webp`: language choice, Japanese by default.
- `img_vending_machines_04.webp`: ticket purchase, IC cards, charge/history and platform ticket.
- `img_vending_machines_05.webp`: payment method choice.
- `img_vending_machines_06.webp`: station search and fare grid.
- `img_vending_machines_07.webp` and `08`: station search and choice, described in the guide.
- `img_vending_machines_09.webp`: inserting money.

The photos are available under `https://www.westjr.co.jp/travel-information/assets/img/train-usage-guide/howto/ticket-vending-machine/`.

## Shinkansen and limited express

The "Shinkansen / limited express tickets" section shows the green machines: white screen, grey banner, ticket categories on grey/purple keys and green confirmation. The guide's example books a HARUKA limited express; the game adapts this documented flow to its Tokyo–Kyoto trips.

- `img_shinkansen_03.webp` and `04`: language and ticket categories.
- `img_shinkansen_05.webp`: arrival station choice.
- Steps 06–10 described in the guide: date, passengers, train/class and seat.
- `img_shinkansen_11.webp`: confirmation with the trip on the left and a table on the right.
- `img_shinkansen_12.webp`: cash or card; only simulated cash payment is playable, with the coins and notes of the player's wallet.

## Explicit adaptations

The screens are redrawn in HTML/CSS, without embedding JR photos or logos. They follow these documented JR West models, also used in the game's Tokyo hub: they do not reproduce every JR East or JR Central variant. Stations, fares, platforms, trains and timetables are the prototype's own. IC, QR, charging and reservation pickup are visible but disabled. One passenger, ordinary class; seat preference without a car seat map. The game uses a single ticket and a simplified total instead of the various real fare tickets and surcharges. The Shinkansen ticket keeps the date, train and seat preference. No real reservation or transaction, no real timetable.

## JR fare map from Tokyo

Official source consulted on 23 October 2026: [JR East, 6 December 2024 — fare revision application](https://www.jreast.co.jp/press/2024/20241206_ho02.pdf), page 12, figure 2-1 "東京駅起点の普通旅客運賃（現改比較）".

The in-game diagram is redrawn in SVG from the 30 stations of this figure. The fares used are those on the **upper line proposed for 2026**, adult paper tickets (the IC fares in parentheses are excluded). The 16 distinct amounts are 160, 200, 210, 260, 350, 440, 530, 620, 720, 810, 910, 1040, 1230, 1600, 2090 and 2420 yen. Kamakura, absent from the figure, is added on a blue Yokosuka Line branch from Ofuna: 51.0 operating km (Tokaido 46.5 km to Ofuna, then 4.5 km), hence ¥1,040 in the same 2026 bands; the branch runs on to its Kurihama terminus, its other stops priced by operating km from Ofuna (Kita-Kamakura 2.3, Zushi 8.4, Higashi-Zushi 10.4, Taura 13.8, Yokosuka 15.9, Kinugasa 18.3, Kurihama 23.9 km). The Tokyo–Ofuna part of the Yokosuka Line, on its own tracks via Musashi-Kosugi, is merged into the Tokaido line on the board, as its fares are the same.

This is a **simplified JR reference map for the prototype**, not the full JR network nor a check of the fares actually in effect in October 2026: the source consulted is an application published in 2024. The map contains only the JR stations shown in that document. No subway, private railway or Shinkansen is added. Positions and routes are schematic and do not form a route planner.

The Tokyo JR ticket is now an amount, with no assigned destination. The destination is chosen after purchase; an insufficient amount keeps the ticket and refuses the trip, a sufficient amount leads to a generic platform at the chosen station. Any surplus is not refunded. A free return to Tokyo exists only to make exploring easier in this prototype, except from Kamakura, whose station sells the ticket back. Search by name was removed from the machine; the station staff can give a fare hint on request.

The older fictional Kamakura and Kawaguchiko excursions were removed: Kamakura is now a JR map fare, and Kawaguchiko, reached over the private Fujikyu line, left the game. Kamakura's JR station (Yokosuka Line, no Shinkansen) reuses the hubs' concourse; its exits follow the real station's sides (the east exit towards Komachi-dori and the temples, the west exit towards Onari-dori and the Enoden), and the right-hand side holds a NewDays, JR East's station convenience store chain, drawn in code with its name as plain lettering rather than its logo. Its platform number and the layout of its concourse are the game's.

## Machine row and wall map

The three photos provided by the user on 23 October 2026 served as the reference for the physical layout: a wide fare board above the machines, green ticket signs and pink **チャージ専用** signs, several neighbouring machines. The photos and their watermarks are not included in the game. The scene is rendered with three.js, with body and gaze movements kept separate. The machines are simple volumes (façade with recesses, sign, tilted screen, payment block) whose pixel-art textures are drawn in code, with no external model or image. The wall map and signs remain crisp text, and the payment blocks double-density pixel art, inserted into the scene to stay legible. The machine screens use the [DotGothic16](https://github.com/google/fonts/tree/main/ofl/dotgothic16) pixel font (SIL Open Font License, [licence](src/fonts/OFL-DotGothic16.txt)), reduced to the game's characters by `scripts/subset-pixel-font.mjs`. The signs on the top-down maps use the [PixelMplus10](https://github.com/itouhiro/PixelMplus) bitmap font (M+ font license, [licence](src/fonts/LICENSE-PixelMplus.txt)), reduced the same way. The wall SVG map is the same drawing as the enlarged map described below.

The payment block follows a [photo of a Tokyo Station machine](https://ittekuru.com/wp-content/uploads/2022/12/08nov22-001-tokyo-station-ticket-machine-japan-railways-group-japan-rail-pass-jr-pass-seat-reservation-procedure.jpg?w=640) (card/Suica slot, banknotes, coin slot with a yellow rim, ticket outlet, change, keypad, QR reader, tray), simplified into pixel art drawn in code (1 pixel = 2 scene units) to stay legible. The same photo sets the payment block under each machine screen during a purchase, where it is playable: card/Suica slot, banknote slot (紙幣, ¥10,000/5,000/1,000), wide coin bowl with a yellow rim (硬貨, ¥500/100/50/10), ticket outlet, change outlet (おつり) and keypad. As on real JR machines, ¥1 and ¥5 coins are not accepted; the ¥2,000 note is left out of the game. The machines set into a façade and the signs above each follow a [row of JR East machines](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcStFKYwahfm5nWXezHQvom_iAmjSpfgxNq7R_IdkYtEq-qsmtvNIZwc3Q&s=10): large Japanese then English (the Chinese and Korean lines are omitted), pink for charging, green for tickets, lavender for the Shinkansen.

The photographs [of the board above the machines](https://i0.wp.com/fun-tt.com/wp-content/uploads/2019/01/railroad-map.jpg?resize=768%2C492&ssl=1) and [of JR machines](https://c8.alamy.com/comp/FBAB45/japan-honshu-tokyo-train-station-automatic-ticket-machine-and-map-FBAB45.jpg), provided later as style references, inspire the visual density, the coloured lines and the fare labels. The SVG drawing is original; it reproduces neither the photographs nor their full map. English station names are removed from the map. The Noto Sans JP font is embedded for Japanese under the [SIL Open Font License](src/fonts/OFL.txt).

The Yamanote loop follows the order of the [30 stations in the JR East list](https://www.jreast.co.jp/estation/facility_result.aspx?SearchCategoryCd=7&mode=2&rosen=66%3D1%3D%E5%B1%B1%E6%89%8B%E7%B7%9A), including 高輪ゲートウェイ. The names of the small stations are shown on the board and in the enlarged view. Their fares are computed rather than transcribed. Each stop's shortest operating distance from Tokyo was taken from the station tables (営業キロ) of the Japanese Wikipedia articles on the [Yamanote](https://ja.wikipedia.org/wiki/山手線), [Chūō rapid](https://ja.wikipedia.org/wiki/中央線快速), [Chūō main](https://ja.wikipedia.org/wiki/中央本線), [Chūō–Sōbu local](https://ja.wikipedia.org/wiki/中央・総武緩行線), [Utsunomiya](https://ja.wikipedia.org/wiki/宇都宮線), [Keihin-Tōhoku](https://ja.wikipedia.org/wiki/京浜東北線), [Takasaki](https://ja.wikipedia.org/wiki/高崎線), [Akabane](https://ja.wikipedia.org/wiki/赤羽線), [Jōban](https://ja.wikipedia.org/wiki/常磐線), [Yokosuka–Sōbu rapid](https://ja.wikipedia.org/wiki/横須賀・総武快速線), [Sotobō](https://ja.wikipedia.org/wiki/外房線), [Keiyō](https://ja.wikipedia.org/wiki/京葉線) and [Tōkaidō](https://ja.wikipedia.org/wiki/東海道線_(JR東日本)) lines, consulted on 24 October 2026; the fare is then read from the JR East 幹線 table of the March 2026 revision, which merges the former 電車特定区間 and 山手線内 fares (kilometres rounded up; table as listed by [jr-group.jp](https://jr-group.jp/higashinihon-fare/)). This calculation reproduces all 30 fares of the JR East figure, so the two sources agree. It ignores the special routing rules (選択乗車 and the like), which do not apply to these trips from Tokyo. The calculation adds 1,410 and 1,790 yen to the board's fare list; the machine keeps the 16 amounts of the 30 destination stations.

The [new board photograph](https://ourlocalworld.com/wp-content/uploads/2024/10/Route-Map-e1728296991341.jpg) provided by the user serves as the composition reference: a white 16:9 board, the Yamanote loop in the centre, lines drawn at 0°, 45° and 90°, vertical stop names along horizontal lines, Tokyo marked by a red **現在地** arrow, Tokyo Bay at the bottom, a title with green squares at the top right and an explanatory column on the left (line legend and list of the fares, without the original's IC conversion table). The drawing is original, with no JR logo; the 30 destination stations carry a name/fare label, the others their name followed by their fare in smaller type (side by side for three digits, stacked for four, as in vertical Japanese typesetting). Its resolution is too low to transcribe these names. The SVG's intermediate stops were taken from the [official JR East map of Tokyo and its region](https://www.jreast.co.jp/map/pdf/map_tokyo.pdf). No fare was taken from the photo.
