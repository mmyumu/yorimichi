import { goodNamed, isDrink, type Item, type Kind } from './goods';

/** The traveller's body, each from 100 (full) to 0: hunger and thirst fall as the journey's clock runs (`spend`, faster on foot through the phone's Maps), and what was bought puts them back (`filling`). Below half, the emptier of the two slows the walk (`needFactor`), down to 40% at nothing. */
export interface Needs {hunger:number;thirst:number}
export const freshNeeds=():Needs=>({hunger:100,thirst:100});
/** The game hours from full to empty. */
const lasts={hunger:14,thirst:10};
export const spend=(needs:Needs,minutes:number)=>{needs.hunger=Math.max(0,needs.hunger-minutes*100/(lasts.hunger*60));needs.thirst=Math.max(0,needs.thirst-minutes*100/(lasts.thirst*60))};
export const needFactor=(needs:Needs)=>.4+.6*Math.min(1,Math.min(needs.hunger,needs.thirst)/50);
const eats:Partial<Record<Kind,number>>={sando:35,pack:35,bigbag:30,melon:25,bun:25,long:25,croissant:25,onigiri:25,bare:25,maki:25,donut:20,pouch:20,tube:20,cup:15,bag:15};
const drinks:Partial<Record<Kind,number>>={pet2:80,pet:45,tall:35,bottle:40,can:30,bottlecan:30,carton:30,ramune:30,cup:20};
/** What a product puts back: a drink's thirst or a food's hunger (a name no longer sold, a snack's worth). */
export const filling=(item:Item|undefined):Partial<Needs>=>!item?{hunger:15}:isDrink(item)?{thirst:drinks[item[3]]??30}:{hunger:eats[item[3]]??20};
export const feed=(needs:Needs,{hunger=0,thirst=0}:Partial<Needs>)=>{needs.hunger=Math.min(100,needs.hunger+hunger);needs.thirst=Math.min(100,needs.thirst+thirst)};
const heft:Partial<Record<Kind,number>>={pet2:6,bottle:4,pet:2,tall:2,can:1.5,bottlecan:1.5,carton:1.5,ramune:1.5};
/** How many products the backpack takes, the heaviest of them, each then a tenth of its weight. */
const backpack=4;
/** What the bag weighs besides the purse, a coin being 1 (wallet.ts `walkFactor`): tickets next to nothing, a product what its `heft` says (a 2 l bottle, six coins), hardly anything for those in the backpack. */
export const carried=(tickets:unknown[],groceries:[string,string][])=>tickets.length*.2+groceries.map(([ja])=>heft[goodNamed(ja)?.[3] as Kind]??1).sort((a,b)=>b-a).reduce((sum,weight,i)=>sum+weight*(i<backpack?.1:1),0);
