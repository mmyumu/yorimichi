// Subsets a pixel font to the characters the game uses: node scripts/subset-pixel-font.mjs <DotGothic16-Regular.ttf | PixelMplus10-Regular.ttf>
// Source fonts: https://github.com/google/fonts/tree/main/ofl/dotgothic16 (SIL OFL 1.1, the kiosk) and https://github.com/itouhiro/PixelMplus (M+ font license, the map signs). Re-run after adding new Japanese text.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import subsetFont from 'subset-font';
const source=process.argv[2];
if(!source)throw Error('Usage: node scripts/subset-pixel-font.mjs <DotGothic16-Regular.ttf | PixelMplus10-Regular.ttf>');
const chars=new Set();
const range=(from,to)=>{for(let c=from;c<=to;c++)chars.add(String.fromCodePoint(c))};
range(0x20,0x7e);range(0xa0,0xff);range(0x3000,0x303f);range(0x3041,0x309f);range(0x30a0,0x30ff);range(0xff01,0xff5e);
for(const c of '¥←→↑↓▼▲◉▰━・…“”‘’–—')chars.add(c);
// Every character written in the sources, so kanji used by the kiosk and hall are kept.
const walk=async dir=>{for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(ts|html|css)$/.test(entry.name))for(const c of await readFile(path,'utf8'))chars.add(c)}};
await walk(resolve('src'));
const font=await subsetFont(await readFile(source),[...chars].join(''),{targetFormat:'woff2'});
const target=resolve(`src/fonts/${basename(source,'.ttf').replace('-Regular','')}-subset.woff2`);
await writeFile(target,font);
console.log(`${chars.size} characters → ${target} (${Math.round(font.length/1024)} KB)`);
