/** The story mode: chosen on the title screen after the traveller's looks (`Mode`, kept under `yorimichi-mode`), the journey plays itself, faster than walking, from memory to memory in the order of the trip,
 * and each memory opens the album on its page as a slideshow (photo-book.ts, `Tour`), the words written here shown under the photos. The director is `Journey.storyNext` in main.ts.
 * Editing the story: `chapters` is the trip in order, one album page each (sights.ts, `memoryPages`, or `road`, the last). For each:
 * - `time`: 'HH:MM', the clock moved on to that time before setting off (the next day if it has already passed); without it, a chapter starting after 17:00 or before 8:00 waits for 9:00 the next morning.
 * - `text`: shown on the page's spread before its photos.
 * - `photos`: shown under a photo, by its place on the page (0 the first, as in the album: the photos of a page are in the order of their file names in the selection folder).
 * Any language does; the pixel font holds Latin-1 (French accents included); new kanji need `node scripts/subset-pixel-font.mjs` again. */
import { memoryPages, roadPage } from './sights';

export type Mode='explore'|'story';
const modeKey='yorimichi-mode';
export const loadMode=():Mode=>{try{return localStorage.getItem(modeKey)==='story'?'story':'explore'}catch{return 'explore'}};
export const saveMode=(mode:Mode)=>{try{localStorage.setItem(modeKey,mode)}catch{}};

/** How the story goes: the game's `speed` (the traveller's walk, the rides, the buses; the album keeps its own pace) and the album turned `auto`matically or by hand (Enter, A, a click), chosen on the top band (main.ts, `storyPace`), kept under `yorimichi-story-pace`. */
export interface Pace {speed:number;auto:boolean}
export const speeds=[1,2,5];
const paceKey='yorimichi-story-pace';
export const loadPace=():Pace=>{try{const pace=JSON.parse(localStorage.getItem(paceKey)??'{}');return {speed:speeds.includes(pace.speed)?pace.speed:2,auto:pace.auto!==false}}catch{return {speed:2,auto:true}}};
export const savePace=(pace:Pace)=>{try{localStorage.setItem(paceKey,JSON.stringify(pace))}catch{}};

/** What the album shows of a page in the story: `text` on its spread, then each photo, its words under it. */
export interface Tour {text?:string;photos?:Record<number,string>}
export interface Chapter extends Tour {page:string;time?:string}

/** Shown on arriving at Tokyo Station, before the traveller sets off. */
export const storyIntro={title:'The journey',text:'Sit back: the traveller goes from memory to memory, in the order of the trip.\nAt each one, the album opens on its photos.\n\nEnter, Space, A or a click: the next photo.\nEsc or B: on to the next place.\n\nThe story waits for you: press PLAY on the top band (or Space, Enter, A) to set off, and again to pause.\nThe band also sets the speed, and whether the album turns its pages by itself.'};
/** Shown once the last page has been seen. */
export const storyEnd={title:'The end of the journey',text:'Every memory of the trip is in the album now.\nYou can take over and wander about, or look through the album again from the menu.'};

export const chapters:Chapter[]=[
  {page:'asakusa'},
  {page:'shibuya-crossing'},
  {page:'meiji'},
  {page:'kinkaku'},
  {page:'kenkun'},
  {page:'daitoku'},
  {page:'yasaka'},
  {page:'higashiyama'},
  {page:'heian-road'},
  {page:'heian'},
  {page:'heian-garden'},
  {page:'ginkaku'},
  {page:'lanterns'},
  {page:'kyoto-tower'},
  {page:'rakusai'},
  {page:'dotonbori'},
  {page:'shinsekai'},
  {page:'biwako'},
  {page:'biwako-bridge'},
  {page:'biwako-horai'},
  {page:'otsu-shore'},
  {page:'toshogu'},
  {page:'kanmangafuchi'},
  {page:'shinkyo'},
  {page:'kamakura-trail'},
  {page:'odaiba'},
  {page:'ginza'},
  {page:roadPage.id},
];
for(const {page,time} of chapters){
  if(page!==roadPage.id&&!memoryPages.some(p=>p.id===page))throw Error(`Story: no album page ${page}`);
  if(time!==undefined&&!/^\d{1,2}:\d\d$/.test(time))throw Error(`Story: ${page}: time ${time} is not HH:MM`);
}
