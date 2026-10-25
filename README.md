# Yorimichi · 寄り道

An original prototype of a playable top-down travel journal set in Japan. Phaser 3, TypeScript and Vite. Scenery and characters are drawn in code, with no external assets. Maps are 480 × 320 pixels, scaled up without smoothing; the traveller is animated in four directions.

## Development

Node.js 22.12+ (tested with Node 24).

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

`npm run build` checks TypeScript and then produces `dist/`. `npm run preview` serves the build. No application server, account or secret is needed.

## Controls

Tap/click the map to walk around buildings; tap/click an element (ticket machine, staff, gates, exits, return sign, camera) to walk to it and use it. On the keyboard, the arrows or **WASD** (keys read by physical position: ZQSD on AZERTY) move the character, and **E**, **Space** or **Enter** interact. On a gamepad, the left stick or D-pad walks, **A** interacts, **X** shows the ticket and **Y** the journal; in dialogs and on the departures board, the D-pad chooses, **A** confirms and **B** closes. Whatever is within reach gets a yellow frame. On a phone, landscape is recommended. **Ticket** shows the ticket you hold; **Journal** shows the three photo memories you can collect on excursions.

## Tokyo JR map and tickets

The game starts in the Tokyo concourse. Interacting near the central machine opens a **front view of the ticket machines**; the player starts in front of a local ticket machine. Using the selected machine opens its screen. It follows the blue look of the ordinary machines documented by JR West, in Japanese by default with an **English** button.

1. Choose **Purchase Ticket → Cash · IC Card**.
2. Look up at the **large wall map**, which holds 31 JR stations and their fares from Tokyo. **Look at the wall map**, above the machine (or **Y** on a gamepad), pauses the purchase and opens the board above the machines full size. Drag to look around, move sideways to read another part, wheel or up/down to step closer/back. When you look up at it, the map gets a yellow frame: a click, **E** or **A** opens it full size ("read the stations").
3. Read your station's fare, then look down and click (or tap) the machine: it lights up on hover, opens if you stand in front of it, and otherwise you walk up to it. **E** or **A** do the same with the machine in front of you, framed in yellow. Coming back to the same machine keeps the selection and the purchase step. All **16 fares on the map** can be bought, from ¥160 to ¥2,420.
4. Choosing an amount goes straight to payment (**Back** returns to the amounts). Pay with the coins and notes of your **wallet** (see below). The screen shows the amount due, the amount inserted and what is still to pay.
5. Take the printed ticket from the きっぷ outlet (the screen only thanks you and shows the change), for example **TOKYO → ¥260**, and your change from the おつり outlet. The ticket has no preselected destination.
6. At the local gates on the left, choose the station to get off at. If the fare is too low, the trip is refused and you keep the ticket. A sufficient ticket is accepted; any overpayment is not refunded.

Search by name was removed from the machine to make reading the map part of the game. The **駅員** station staff, at the central counter, offer an optional **fare hint** on request. The hint neither buys nor fills in a ticket.

On arrival, the stations on the map share the same platform scene, bearing the station's name, except **Kamakura** (¥1,040, Tokaido Line then Yokosuka Line from Ofuna), which leads to the temple trail and its memory. The **TOKYO** sign gives a free return to make exploring easier in this prototype. These platforms are not yet explorable neighbourhoods or new photo memories.

The map is **JR only**, with no subway or private railways. It reproduces the 30 stations of an official JR East diagram, not every station in Tokyo, plus Kamakura on the Yokosuka Line. The reference fares are those proposed for 2026 in a document published in December 2024: whether they are currently in effect has not been checked. See [REFERENCES.md](REFERENCES.md) for the source and the adaptations.

## Wallet and physical payment

The traveller carries a purse of real yen pieces: ¥1, ¥5, ¥10, ¥50, ¥100 and ¥500 coins, ¥1,000, ¥5,000 and ¥10,000 notes. It is kept on the device (`localStorage['yorimichi-wallet']`) and shown at the top of the screen; a click opens it, with a temporary **ATM** that withdraws ¥10,000.

At a machine, the screen and the payment block stay visible together, laid out like a JR East machine at Tokyo Station: card/Suica slot, banknote slot and coin bowl under the screen, then the ticket outlet, the change outlet and a keypad. The wallet stands beside the machine. Drag a piece onto a slot, or click it (or **A** on a gamepad) to put it in its own slot. Notes do not fit the coin bowl, coins do not fit the banknote slot, and **¥1 and ¥5 coins are refused**: they drop straight into the change outlet. Change is given in as few pieces as possible. Cancelling, going back or leaving the machine returns the pieces inserted to the change outlet. Each machine keeps whatever is left in its outlets (ticket, change, refunds), even after you leave the hall or reload the page: come back to the same machine to pick it up. In the hall, a machine with something left in its outlets says so in the status line. Small synthesized sounds accompany each coin, note and refusal.

Every coin beyond eight **slows the walk** by 2.5%, down to 55%. Paying with small coins and getting a big one back lightens the purse; ¥1 and ¥5 coins will have to be spent at a konbini, in a future version.

## Shinkansen and excursions

Moving right along the row leads to the green **Shinkansen** machine: destination → date → 1 adult → train → seat preference → confirmation → payment from the wallet → ticket. The reservation keeps these choices on the ticket. IC, QR, charging, bank cards and reservation pickup are visible but disabled.

Kamakura is reached with a value ticket from the JR map, like any other station. Kawaguchiko was removed.

| From | Destination | Ticket | Fictional track |
| --- | --- | --- | --- |
| Tokyo | 31 stations on the JR map, Kamakura included | Chosen amount, no destination | 3, on the left |
| Tokyo | Kyoto | Shinkansen, one way | 19, on the right |
| Kyoto | Tokyo | Shinkansen, one way | 11, on the right |
| Kyoto | Arashiyama | Sagano excursion | 33, on the left |

For Shinkansen and excursion tickets, the wrong platform or the wrong train does not use up the ticket. Each excursion includes a return to its home hub through the **STATION** sign. Platforms, timetables, reservations and fares for these trips remain fictional or simplified for the game; there is no real transaction.

## Finding your way and keeping memories

The hubs have concourses, trains, gates, departure boards, a ticket machine, a kiosk and lockers. Mostly Japanese signage, visual announcements and an animated crowd create a sense of confusion. The side exits describe the neighbourhood and do not teleport the player. The subway shown on the signs is decorative and not playable. There is no time limit; the only penalty is the weight of your coins, and the only audio comes from the ticket machines.

In Kamakura and Arashiyama, walk up to the camera and interact to collect a memory. Memories persist in localStorage on this device. The images are placeholders; importing personal photos is not implemented.

## Phone export

`npm run build:mobile` produces `dist/yorimichi-mobile.html`, a standalone file containing the game, its scripts, its SVG map and its styles. It does not need to load any external file. Open it in landscape on a phone to read the machine comfortably.

To choose another export path after building: `node scripts/export-mobile.mjs /path/yorimichi-mobile.html`.

## In front of the machines

A first-person scene, rendered in 3D with three.js at low resolution and scaled up without smoothing to keep the pixels of the rest of the game: a piece of station around a tiled wall, a large fare board and five machines set into a pale façade (a large Japanese/English light sign above each, a tilted screen, a payment block with card/Suica slots, banknotes, ticket and change outlets, coin slot, keypad, QR reader and tray, metal ledge), with every texture drawn in code using the game's palette. The fare map and machine signs stay crisp; the payment blocks are double-density pixel art, shown outside the low-resolution render to stay legible. Around them, the station carries on so the scenery never seems to end: tiled pillars, a dark ceiling with fluorescent lights, a yellow tactile strip, hanging signs (きっぷうりば, 中央改札, みどりの窓口), travel posters for Kamakura, Nikko (the Yōmei-mon gate of Tōshō-gū) and Arashiyama, entry gates on the left, a みどりの窓口 counter on the right, and passers-by who are all different (women and men, schoolchildren, elderly people, kimono, masks) coming and going; a light haze fades out the background. You can step closer to the machines, and back only a few steps. The machine screens and the IC charge notice use a pixel skin (DotGothic16 font, hard edges, bevels): local tickets, IC charge, local tickets, IC charge, Shinkansen. The reference photos provided guide the layout; they are not included in the game. The wall map shows the same 30 stations with fares as a coloured network, with station names in Japanese only, laid out like the JR East boards above the machines: Yamanote loop in the centre, red arrow on Tokyo, legend and fare list on the left. A Japanese font is embedded so the map stays legible offline; no new fares were added.
The Yamanote forms a closed loop with its 30 stops. The map also shows the names of the intermediate stops on the lines around Tokyo, taken from the official JR East map. You read the board up close. Fares remain limited to the 30 stations with fares in the JR East reference, plus Kamakura.

- **Phone**: drag on the scenery to look around; tap a machine to walk to it and then use it, tap the map to read it. There are no longer buttons under the view. In landscape, the header and status bars shrink and the view widens on short screens, so a whole machine still fits.
- **Reading the map**: clicking the map (or E / A while looking at it) opens the SVG full size: every station shows its name and its fare from Tokyo. Drag the map and zoom with the wheel (towards the cursor) or by pinching with two fingers, down to the whole map fitting the screen; on a gamepad, the sticks pan and **LT / RT** zoom out / in; **Close**, Esc or **B** goes back to where you came from: the machine screen if you opened the map from it, otherwise in front of the machines.
- **Mouse and keyboard**: click and drag to look, left/right arrows or A/D to move sideways, up/down or W/S to step closer/back, R/F or Page Up/Down to look up/down (keys read by position: ZQSD on an AZERTY keyboard). Wheel: distance; Shift + wheel or horizontal scroll: sideways movement. E/Space uses the machine in front of you, or opens the map if you are looking at it; Esc goes back to the concourse.
- **Standard gamepad**: left stick horizontal to move sideways, vertical for distance; right stick to look around. A uses the machine in front of you, or opens the map if you are looking at it; B goes back. On the purchase screen, the D-pad/left stick moves focus between the machine's buttons, its outlets and the wallet, A presses the button, Y opens the wall map full size (the button shows a round **Y** badge) and B steps back like the machine's **Back** button, returning any money inserted; on the home screen, or once the ticket is issued, B leaves the machine. These controls were checked with simulated input in Chromium, not with a physical gamepad.

The two pink **チャージ専用** machines require an IC card. The player has none: no charging, payment or card purchase is possible. Buying a card is shown as a future feature and disabled.

The purchase stays paused while you look at the map and resumes at the same machine. Choosing another machine restarts its own screen; a ticket already issued is kept. Cancelling or taking the ticket brings you back to the machines; **Back to the hall** returns to top-down exploration. In Kyoto, this view shows simple local signage rather than the Tokyo fare map.
