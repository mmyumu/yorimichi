import { dims, goodNamed, isDrink, paintItem } from './goods';
import { stations } from './network';
import { paintTicket } from './ticket-gate';
import type { TravelTicket } from './ticket-machine';
import { coinCount, coins, isCoin, notes, pieceArt, walletTotal, type Wallet } from './wallet';

/** What the bag can do with what is in it: a click on a product eats or drinks it (`consume`, its Japanese name), and at a bin (`bin`) a click on a product or a ticket throws it away instead (`toss`). Money stays. `pace` is the walk's speed with all of it carried, 1 at full speed. */
export interface BagActions {bin:boolean;pace:()=>number;consume:(ja:string)=>void;toss:(thing:TravelTicket|string)=>void}
/** The traveller's bag, opened from the top band or at a bin: the tickets carried, drawn as at the gates (punched ones with their hole), what was bought at the konbini, and the wallet. */
export function openInventory(tickets:TravelTicket[],groceries:[string,string][],wallet:Wallet,actions:BagActions,close:()=>void){
  const el=(parent:HTMLElement,tag:string,text='',cls='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e};
  const previous=document.activeElement as HTMLElement|null;
  const overlay=el(document.body,'div','','bag-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label',actions.bin?'Bin':'Inventory');
  const panel=el(overlay,'aside','','bag-panel');
  const stops=()=>Array.from(panel.querySelectorAll('button'));
  const act=(b:HTMLButtonElement,fn:()=>void)=>{b.type='button';b.onclick=()=>{const i=stops().indexOf(b),top=panel.scrollTop;fn();paint();panel.scrollTop=top;stops()[Math.min(i,stops().length-1)]?.focus()}};
  const paint=()=>{
    panel.replaceChildren();
    const head=el(panel,'div','','bag-head');el(head,'h2',actions.bin?'ごみ箱 / BIN':'持ち物 / INVENTORY');
    const shut=el(head,'button','Close','bag-close') as HTMLButtonElement;shut.type='button';shut.onclick=done;
    const pocket=el(panel,'section','','gate-pocket');el(pocket,'span',`きっぷ / TICKETS  ${tickets.length}${actions.bin&&tickets.length?' · click to throw away':''}`,'gate-label');
    const list=el(pocket,'div','','gate-tickets');
    for(const ticket of tickets){
      const frame=el(list,actions.bin?'button':'div','','bag-item'),image=el(frame,'img','','bag-ticket') as HTMLImageElement;image.draggable=false;
      // Painted again once the Japanese font is in, like the signs.
      const draw=()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;paintTicket(canvas.getContext('2d')!,128,64,ticket);image.src=canvas.toDataURL()};
      draw();document.fonts?.load('16px "Yorimichi JP"').then(draw).catch(()=>{});
      image.alt=image.title=(ticket.kind==='route'?`${stations[ticket.from].en} → ${stations[ticket.to].en}, ${ticket.line}, ¥${ticket.fare}`:ticket.kind==='adjust'?`Fare adjustment ticket, ${stations[ticket.from].en} → ${ticket.toEn}, ¥${ticket.fare} paid`:`Fare ticket from ${stations[ticket.from].en}, ¥${ticket.fare}`)+(ticket.punched?', punched':'');
      if(actions.bin)act(frame as HTMLButtonElement,()=>actions.toss(ticket));
    }
    if(!tickets.length)el(list,'p','No ticket','gate-empty');
    if(groceries.length){
      const goods=el(panel,'section','','gate-pocket');panel.insertBefore(goods,pocket);el(goods,'span',`買い物 / GROCERIES  ${groceries.length} · click to ${actions.bin?'throw away':'eat or drink'}`,'gate-label');
      const shelf=el(goods,'div','','bag-goods'),counts=new Map<string,{en:string;n:number}>();
      for(const [ja,en] of groceries){const count=counts.get(ja);if(count)count.n++;else counts.set(ja,{en,n:1})}
      for(const [ja,{en,n}] of counts){
        const cell=el(shelf,'button','','bag-good bag-item') as HTMLButtonElement,item=goodNamed(ja);cell.title=`${ja} · ${en}`;
        // The shelf's own drawing, three times over as the game's pixels are; something no longer sold keeps its name only.
        if(item){const [w,h]=dims[item[3]].map(Math.ceil),canvas=el(cell,'canvas') as HTMLCanvasElement;canvas.width=w;canvas.height=h;canvas.style.width=`${w*3}px`;canvas.style.height=`${h*3}px`;paintItem(canvas.getContext('2d')!,item[3],0,0,w,h,item[4],item[5])}
        el(cell,'span',n>1?`${ja} ×${n}`:ja,'bag-name');
        act(cell,()=>actions.bin?actions.toss(ja):actions.consume(ja));
      }
    }
    const purse=el(panel,'section','','gate-purse'),pace=actions.pace();
    el(purse,'span',`財布 / WALLET  ¥${walletTotal(wallet).toLocaleString('en-US')} · ${coinCount(wallet)} coins${pace<1?` · walking at ${Math.round(pace*100)}%`:''}`,'gate-label');
    const pieces=el(purse,'div','','gate-pieces');
    for(const value of [...notes,...coins])if(wallet[value]){const piece=el(pieces,'span','','gate-piece'+(isCoin(value)?' coin':''));piece.title='¥'+value.toLocaleString('en-US');const image=el(piece,'img') as HTMLImageElement;image.src=pieceArt(value);image.alt='¥'+value;el(piece,'span','×'+wallet[value])}
  };
  const destroy=()=>{overlay.remove();previous?.focus()};
  const done=()=>{destroy();close()};
  /** The next button along, for the arrows, Tab and the pad. */
  const step=(by:number)=>{const all=stops(),i=all.indexOf(document.activeElement as HTMLButtonElement);all[(i+by+all.length)%all.length]?.focus()};
  overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)done()});
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape')done();else if(event.key==='Tab'){event.preventDefault();step(event.shiftKey?-1:1)}else if(event.key==='ArrowDown'||event.key==='ArrowRight'){event.preventDefault();step(1)}else if(event.key==='ArrowUp'||event.key==='ArrowLeft'){event.preventDefault();step(-1)}});
  overlay.addEventListener('keyup',event=>event.stopPropagation());
  paint();stops()[0]?.focus();
  return {destroy,close:done,step,press:()=>(document.activeElement as HTMLElement|null)?.click()};
}
