// The station's commuters, shared by the first-person hall and the top-down concourse so the same people appear in both.
/** A commuter's outfit. `legs` is trousers, or tights under a skirt; `length` lets the coat reach the knees or, as a kimono, the feet. */
export interface Look {coat:string;legs:string;hair:string;style:'short'|'bob'|'long'|'bun'|'ponytail';skin?:string;skirt?:string;length?:'knee'|'robe';sash?:string;tie?:boolean;mask?:boolean;bag?:string;backpack?:boolean;cane?:boolean;height?:number;pace?:number}
/** A commuter as the concourse simulation (main.ts) has them, in top-down scene pixels; the first-person hall shows the same figures where they are. */
export interface Figure {look:number;x:number;y:number;alpha:number;face:'up'|'down'|'left'|'right';moving:boolean}
// The first people of a place each get their own look; only a big crowd sees one twice (Journey.gather).
export const looks:Look[]=[
  {coat:'#2d3a4a',legs:'#262f3a',hair:'#1f1c1a',style:'short',tie:true,bag:'#3b2f28'},
  {coat:'#c9b38a',legs:'#3a3f48',hair:'#4a3426',style:'long',length:'knee',bag:'#8a3b3b',height:.95},
  {coat:'#27324f',legs:'#27324f',hair:'#141414',style:'short',height:.96},
  {coat:'#c25b4a',legs:'#5a6b86',hair:'#2b2420',style:'short',bag:'#d9c06a',backpack:true},
  {coat:'#7c8580',legs:'#3d4441',hair:'#b5b5ae',style:'short',cane:true,height:.95,pace:.7},
  {coat:'#283e5a',legs:'#3a3436',hair:'#151515',style:'bob',skirt:'#5b6470',bag:'#c9b38a',height:.94},
  {coat:'#2b3550',legs:'#e0b896',hair:'#1a1614',style:'ponytail',skirt:'#4f5f86',bag:'#5a3b2a',height:.92},
  {coat:'#d98fa0',legs:'#2d2d33',hair:'#7a5236',style:'long',length:'knee',mask:true,bag:'#f4f1e4',height:.95},
  {coat:'#6f8a5a',legs:'#4a5a78',hair:'#3a2a20',style:'ponytail',bag:'#7c8580',backpack:true,height:.96},
  {coat:'#8d8f94',legs:'#2e3440',hair:'#24201c',style:'short',mask:true,bag:'#2e3440',backpack:true},
  {coat:'#e8c440',legs:'#2b3550',hair:'#1a1614',style:'short',bag:'#b8503e',backpack:true,height:.62,pace:1.1},
  {coat:'#b8503e',legs:'#f4f4ee',hair:'#141414',style:'bun',length:'robe',sash:'#e2c234',height:.93,pace:.8},
  {coat:'#e8e2cf',legs:'#6b5a44',hair:'#1a1614',style:'short',skin:'#9c6b4a',bag:'#3a78c2',backpack:true,height:1.04},
  {coat:'#3d4441',legs:'#3d4441',hair:'#141414',style:'long',mask:true,bag:'#283e40',height:.96},
  {coat:'#7d6a8f',legs:'#8c7f76',hair:'#c9c9c2',style:'bun',skirt:'#5a5048',bag:'#4a3f3a',height:.9,pace:.75},
];
