// Draws the home-screen icons (public/icon-192.png, public/icon-512.png): a red torii on the night teal, 16×16 pixel art scaled up whole,
// kept within the middle 80% so that a launcher's round or squircle mask never cuts it. PNG written by hand (zlib), no dependency.
import { writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
const art=[
  '................',
  '................',
  '................',
  '..RRRRRRRRRRRR..',
  '...rrrrrrrrrr...',
  '.....R....R.....',
  '...RRRRRRRRRR...',
  '.....R....R.....',
  '.....R....R.....',
  '.....R....R.....',
  '.....R....R.....',
  '.....R....R.....',
  '....dRd..dRd....',
  '..cccccccccccc..',
  '................',
  '................',
];
const colours={'.':[0x17,0x2f,0x36],R:[0xc8,0x47,0x3a],r:[0x8c,0x2e,0x26],d:[0x0b,0x16,0x14],c:[0xe8,0xd9,0xb5]};
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0};
const chunk=(type,data)=>{const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);out.write(type,4,'ascii');data.copy(out,8);out.writeUInt32BE(crc(out.subarray(4,8+data.length)),8+data.length);return out};
for(const size of [192,512]){
  const raw=Buffer.alloc(size*(size*3+1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const [r,g,b]=colours[art[Math.floor(y*16/size)][Math.floor(x*16/size)]],at=y*(size*3+1)+1+x*3;raw[at]=r;raw[at+1]=g;raw[at+2]=b}
  const head=Buffer.alloc(13);head.writeUInt32BE(size,0);head.writeUInt32BE(size,4);head[8]=8;head[9]=2;
  const png=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),chunk('IHDR',head),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
  await writeFile(`public/icon-${size}.png`,png);console.log(`public/icon-${size}.png`);
}
