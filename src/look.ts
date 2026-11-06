/** The traveller's looks, chosen on a new journey (title.ts) and kept under their own key: each part an index into its choices below. */
export interface Look {skin:number;eyes:number;hair:number;cut:number;face:number;hat:number;outfit:number;jacket:number;trousers:number;pack:number}
type Choice={name:string;colors:string[]};
const named=(...names:string[])=>names.map(name=>({name,colors:[]}));
// Skin: face, arms. Eyes, hair: one colour. Hat: its swatch. Jacket: shade, body. Trousers, then shoes. Backpack: body, flap, foot.
export const parts:{key:keyof Look;label:string;choices:Choice[]}[]=[
  {key:'skin',label:'Skin',choices:[{name:'Fair',colors:['#f5d3b3','#f8dcbf']},{name:'Light',colors:['#eac08d','#efc08b']},{name:'Tan',colors:['#c98e5e','#d09865']},{name:'Deep',colors:['#8d5a3b','#996443']},{name:'Undead',colors:['#c9d6c4','#d4dfcf']}]},
  {key:'eyes',label:'Eyes',choices:[{name:'Dark',colors:['#3b4541']},{name:'Brown',colors:['#6a3e22']},{name:'Blue',colors:['#2f6fc0']},{name:'Green',colors:['#2f8a46']},{name:'Grey',colors:['#7d8a92']},{name:'Red',colors:['#d0202a']},{name:'Gold',colors:['#e0a820']}]},
  {key:'hair',label:'Hair',choices:[{name:'Brown',colors:['#634d3e']},{name:'Black',colors:['#2a2522']},{name:'Chestnut',colors:['#8e4f2e']},{name:'Blond',colors:['#c99a4c']},{name:'Silver',colors:['#9a9ea4']},{name:'Pink',colors:['#d77a9a']},{name:'Punk green',colors:['#4ec23a']},{name:'Electric',colors:['#2f8ee8']},{name:'Purple',colors:['#7a3fb0']}]},
  {key:'cut',label:'Cut',choices:named('Short','Long','Bob','Mohawk','Bald','Afro','Ponytail','Spikes','Combover')},
  {key:'face',label:'Face',choices:named('Plain','Moustache','Beard','Glasses','Sunglasses','Clown nose','Fangs','Monocle')},
  {key:'hat',label:'Hat',choices:[{name:'Sun hat',colors:['#f1d8a0']},{name:'Cap',colors:['#c0463a']},{name:'Beanie',colors:['#3f6a8a']},{name:'None',colors:[]},{name:'Cowboy',colors:['#a0703a']},{name:'Top hat',colors:['#1c1c22']},{name:'Party',colors:['#e05a9a']},{name:'Crown',colors:['#e0b030']}]},
  {key:'outfit',label:'Outfit',choices:named('Casual','Salaryman','Cowboy','Yukata','Vampire','Astronaut','Dinosaur')},
  {key:'jacket',label:'Jacket',choices:[{name:'Rust',colors:['#a65f4a','#d58b5c']},{name:'Navy',colors:['#2f4a6e','#4a6d96']},{name:'Forest',colors:['#3d6248','#5b8a5f']},{name:'Mustard',colors:['#a8812e','#d6aa48']},{name:'Plum',colors:['#6a3f63','#93608a']},{name:'White',colors:['#a9aca4','#e2e2d8']}]},
  {key:'trousers',label:'Trousers',choices:[{name:'Denim',colors:['#384d59','#594c44']},{name:'Black',colors:['#2b2b30','#4a3c34']},{name:'Khaki',colors:['#a08a64','#594c44']},{name:'Brown',colors:['#6e5a4a','#3a302a']}]},
  {key:'pack',label:'Backpack',choices:[{name:'Olive',colors:['#677e67','#9eab7c','#384f48']},{name:'Red',colors:['#9c4038','#c86a58','#5a2622']},{name:'Blue',colors:['#3f5f86','#6f8fb4','#26384f']},{name:'Yellow',colors:['#c19a3a','#e2c060','#6e5520']}]},
];
/** What an outfit leaves to the other parts: the jacket and trousers only go with casual clothes. */
export const unused=(look:Look,part:keyof Look)=>(part==='jacket'||part==='trousers')&&look.outfit!==0;
/** The traveller of the first journeys. */
export const firstLook:Look={skin:1,eyes:0,hair:0,cut:0,face:0,hat:0,outfit:0,jacket:0,trousers:0,pack:0};
const key='yorimichi-look';
// A look saved before a part existed takes that part's first choice.
export function loadLook():Look{
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved==='object'){const look={...firstLook};for(const p of parts){const v=saved[p.key];if(Number.isInteger(v)&&v>=0&&v<p.choices.length)look[p.key]=v}return look}}catch{}
  return {...firstLook};
}
export const saveLook=(look:Look)=>{try{localStorage.setItem(key,JSON.stringify(look))}catch{}};
const colors=(look:Look,part:keyof Look)=>parts.find(p=>p.key===part)!.choices[look[part]].colors;

/** The traveller's frame, 20 × 28 px, facing `face`, walk frame 0–2 (1 and 2 a step each side), drawn at (0, 0). Every look keeps inside the frame, so the sprites' size and origin never change. */
export function paintTraveller(g:CanvasRenderingContext2D,face:string,frame:number,look:Look){
  const b=frame===1?1:0,r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)},u=(x:number,y:number,w:number,h:number,c:string)=>r(x,y+b,w,h,c);
  const [skin,arm]=colors(look,'skin'),[eye]=colors(look,'eyes'),[hair]=colors(look,'hair'),[pack,flap,foot]=colors(look,'pack');
  const back=face==='up',left=face==='left',right=face==='right',front=face==='down',outfit=look.outfit,cut=look.cut;
  // Mirrors an x for the right profile (drawn as the left one).
  const side=(x:number,w:number)=>right?20-x-w:x;
  let [shade,body]=colors(look,'jacket'),[legs,shoes]=colors(look,'trousers');
  if(outfit===1){shade='#2c3038';body='#3a3f4a';legs='#2c3038';shoes='#1a1a1e'}
  if(outfit===2){shade='#6a4426';body='#b23a3a';legs='#3e5f8a';shoes='#6a3e1e'}
  if(outfit===4){shade='#141018';body='#1c1c24';legs='#1c1c24';shoes='#0e0e12'}
  if(outfit===5){shade='#b8c0c8';body='#e8ecef';legs='#d8dee2';shoes='#7a848c'}
  if(outfit===6){shade='#3f7d34';body='#5aa04a';legs='#5aa04a';shoes='#3f7d34'}
  r(4,25,12,2,'#00000040');
  // Behind the body: the vampire's cape, the dinosaur's tail.
  if(outfit===4){if(back)r(4,12+b,12,12,'#141018');else{u(3,12,16,11,'#141018');u(3,13,1,10,'#9a1a2a');u(18,13,1,10,'#9a1a2a')}}
  if(outfit===6&&!front){if(back)u(9,19,3,4,'#5aa04a');else{u(side(15,4),19,4,2,'#5aa04a');u(side(18,1),18,1,1,'#e0802a')}}
  // Legs and feet; a yukata falls to the ankles over them.
  if(outfit===3){r(6,24,3,1,'#e8e2d0');r(12,24,3,1,'#e8e2d0');r(5,25,4,1,'#a07850');r(12,25,4,1,'#a07850')}
  else{r(6,20+b,3,5-(frame===1?1:0),legs);r(12,20+b,3,5-(frame===2?1:0),legs);r(5,24,4,2,shoes);r(12,24,4,2,shoes);if(outfit===2){r(5,23,1,1,shoes);r(12,23,1,1,shoes)}}
  // The body and arms.
  if(outfit===3){u(5,12,11,12,'#2c3e6a');for(let y=13;y<23;y+=3)for(let x=6+(y%2);x<15;x+=3)u(x,y,1,1,'#e8eef8');u(5,17,11,2,'#d0a040');u(3,13,3,6,'#2c3e6a');u(16,13,3,6,'#2c3e6a');u(3,18,2,2,arm);u(17,18,2,2,arm);if(!back){u(9,12,1,5,'#e8eef8');u(12,12,1,5,'#e8eef8')}}
  else{u(5,12,11,9,shade);u(6,12,9,7,body);u(4,14,2,6,outfit===5?'#e8ecef':outfit===4||outfit===1?shade:arm);u(16,14,2,6,outfit===5?'#e8ecef':outfit===4||outfit===1?shade:arm);if(outfit===1||outfit===4||outfit===5){u(4,19,2,1,outfit===5?'#7a848c':arm);u(16,19,2,1,outfit===5?'#7a848c':arm)}}
  if(!back){
    if(outfit===1){u(9,12,3,5,'#f0eee8');u(10,13,1,4,'#c0202a')}
    if(outfit===2){u(8,12,6,2,'#d0402e');u(5,19,11,1,'#3a2a1a');u(10,19,2,1,'#e0c040')}
    if(outfit===4){u(9,13,3,4,'#f0eee8');u(10,13,1,1,'#c0202a');u(5,10,2,4,'#141018');u(15,10,2,4,'#141018')}
    if(outfit===5){u(8,14,5,3,'#b8c0c8');u(9,15,1,1,'#d0402e');u(11,15,1,1,'#2f6fc0')}
    if(outfit===6)u(8,13,5,6,'#e8e0a0');
  }
  // The head.
  u(7,8,8,6,skin);
  const bald=cut===4,afro=cut===5;
  // Hair: its top (none when bald), what falls behind or beside the face, and what stands up.
  if(afro){u(4,3,14,8,hair);u(5,2,12,1,hair);u(5,11,12,1,hair);if(!back)u(7,8,8,1,skin)}
  else if(bald){u(7,6,8,2,skin);u(6,7,10,2,skin);if(!back){u(9,6,2,1,'#ffffffa0');u(6,9,1,2,hair);u(15,9,1,2,hair)}else u(7,10,8,3,skin)}
  else if(cut===3){u(7,6,8,3,skin);u(6,8,10,1,skin);if(left||right)for(let x=7;x<15;x++)u(side(x,1),1+(x%2),1,7-(x%2),hair);else u(10,0,2,9,hair);if(back)u(7,10,8,3,skin)}
  else{u(6,6,10,4,hair);u(7,5,8,1,hair);if(cut===8){u(5,6,11,2,hair);if(!back)u(6,8,3,1,hair)}}
  if(cut===0||cut===7||cut===8)if(back)u(7,10,8,3,hair);
  if(cut===1||cut===2){const h=cut===1?7:5;if(back)u(cut===1?7:6,10,cut===1?8:10,cut===1?6:3,hair);else{if(!left)u(6,8,right?4:2,h,hair);if(!right)u(left?12:14,8,left?4:2,h,hair)}}
  if(cut===6){if(back){u(7,10,8,2,hair);u(10,10,2,6,hair)}else if(!front)u(side(15,3),8,3,5,hair)}
  if(cut===7)for(const [x,h] of [[6,2],[8,3],[10,4],[12,3],[14,2]])u(x,6-h,1,h,hair);
  // The face: eyes, then whatever goes with it.
  if(!back){
    const eyes=front?[8,13]:[side(7,1)];for(const x of eyes)u(x,10,1,1,eye);
    const f=look.face;
    if(f===1){if(front)u(9,12,4,1,hair);else u(side(7,2),12,2,1,hair)}
    if(f===2){if(front){u(7,11,8,3,hair);u(8,14,6,1,hair);u(10,12,2,1,'#5a2a22')}else{u(side(7,4),11,4,3,hair);u(side(8,3),14,3,1,hair);u(side(7,1),10,1,1,eye)}}
    if(f===3){if(front){u(7,10,8,1,'#2a2a2a');for(const x of eyes)u(x,10,1,1,'#bfe4ff')}else{u(side(6,3),10,3,1,'#2a2a2a');u(side(7,1),10,1,1,'#bfe4ff')}}
    if(f===4){if(front){u(7,10,3,2,'#111');u(12,10,3,2,'#111');u(10,10,2,1,'#111');u(8,10,1,1,'#7a8a9a')}else{u(side(6,3),10,3,2,'#111')}}
    if(f===5){if(front)u(10,11,2,2,'#e02020');else u(side(6,2),11,2,2,'#e02020')}
    if(f===6){if(front){u(9,13,1,1,'#fff');u(12,13,1,1,'#fff')}else u(side(7,1),13,1,1,'#fff')}
    if(f===7){if(front){u(12,9,3,3,'#e0c040');u(13,10,1,1,eye);u(14,12,1,3,'#e0c040')}else if(right){u(13,9,3,3,'#e0c040');u(14,10,1,1,eye)}}
    // Backpack straps over the shoulders (a vampire's cape hides them, an astronaut's life support has its own).
    if(outfit!==4&&outfit!==3){const strap=outfit===5?'#7a848c':'#785b42';u(6,13,1,7,strap);u(14,13,1,7,strap)}
  }else if(outfit!==4){
    // The backpack; an astronaut carries the life-support pack instead.
    if(outfit===5){u(6,13,9,8,'#c8ced4');u(7,14,7,2,'#9aa2aa');u(8,17,2,2,'#d0402e');u(11,17,2,2,'#40a050')}else{u(7,14,7,7,pack);u(8,15,5,3,flap);u(8,19,5,1,foot)}
  }
  // Headgear: the dinosaur's hood and the astronaut's helmet take the hat's place, and hold in whatever hair stood up or out.
  if(outfit===5||outfit===6){g.clearRect(0,0,20,2+b);g.clearRect(0,0,7,4+b);g.clearRect(15,0,5,4+b);g.clearRect(4,0,1,12+b);g.clearRect(17,0,1,12+b)}
  if(outfit===6){u(5,4,12,4,'#5aa04a');u(5,8,2,6,'#5aa04a');u(15,8,2,6,'#5aa04a');if(back)u(7,8,8,6,'#5aa04a');if(left||right){u(side(11,6),4,6,10,'#5aa04a');u(side(11,1),8,1,6,'#3f7d34')}for(const x of [7,10,13])u(x,2,2,2,'#e0802a');if(!back){u(7,7,8,1,'#f4f4ec');for(let x=7;x<15;x+=2)u(x,7,1,1,'#5aa04a');if(front){u(6,5,2,2,'#fff');u(14,5,2,2,'#fff');u(7,5,1,1,'#222');u(14,5,1,1,'#222')}else{u(side(5,2),5,2,2,'#fff');u(side(5,1),5,1,1,'#222')}}return}
  if(outfit===5){const w='#e8ecef';u(7,2,8,2,w);u(5,4,12,2,w);u(5,4,2,11,w);u(15,4,2,11,w);u(6,14,10,1,'#b8c0c8');if(back)u(7,6,8,8,w);else if(front){u(8,6,2,1,'#ffffff');u(13,6,1,1,'#cfe6ff')}else{u(side(11,6),4,6,10,w);u(side(11,1),6,1,8,'#b8c0c8');u(side(7,2),6,2,1,'#ffffff')}
    const antenna=front?13:back?8:left?12:9;u(antenna,0,1,2,'#7a848c');u(antenna,0,1,1,'#d0402e');return}
  const hat=look.hat;
  if(hat===0){u(5,4,12,4,'#d6b77a');u(7,2,8,4,'#f1d8a0');u(4,7,14,2,'#efd4a0');u(7,6,8,1,'#a47b52')}
  else if(hat===1){u(6,4,10,4,'#c0463a');u(8,3,6,1,'#c0463a');u(7,7,8,1,'#9a3027');
    // The peak, out in front: ahead of the face, to its side in profile, hidden behind the head from behind.
    if(front)u(6,7,10,2,'#9a3027');if(left||right)u(side(3,5),6,5,2,'#9a3027')}
  else if(hat===2){u(6,3,10,5,'#3f6a8a');u(7,2,8,1,'#3f6a8a');u(6,7,10,1,'#5a86a6');u(10,1,2,1,'#5a86a6')}
  else if(hat===4){u(6,2,10,4,'#a0703a');u(10,2,2,1,'#7a4a24');u(6,5,10,1,'#4a2a14');u(3,6,14,2,'#8a5a30');u(2,5,1,2,'#8a5a30');u(17,5,1,2,'#8a5a30')}
  else if(hat===5){u(7,0,8,6,'#1c1c22');u(7,4,8,1,'#a02a2a');u(5,6,12,2,'#1c1c22');u(8,0,1,4,'#3a3a44')}
  else if(hat===6){for(let k=0;k<6;k++)u(11-Math.ceil(k/2),1+k,1+Math.ceil(k/2)*2,1,k%2?'#f0d040':'#e05a9a');u(10,0,2,1,'#fff6c0');u(9,7,6,1,'#e05a9a')}
  else if(hat===7){u(6,4,10,3,'#e0b030');for(const x of [6,10,14])u(x,2,2,2,'#e0b030');u(10,5,2,1,'#c02030');u(7,5,1,1,'#2f6fc0');u(14,5,1,1,'#40a050');u(6,6,10,1,'#b08020')}
}
