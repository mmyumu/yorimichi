import { goodNamed, paintCloseUp } from './goods';
import { stations } from './network';
import { paintTicket } from './ticket-gate';
import type { TravelTicket } from './ticket-machine';
import { coinCount, coins, isCoin, notes, pieceArt, walkFactor, walletTotal, type Wallet } from './wallet';

/** The traveller's bag, opened from the top band: the tickets carried, drawn as at the gates (punched ones with their hole), what was bought at the konbini, and the wallet. */
export function openInventory(tickets:TravelTicket[],groceries:[string,string][],wallet:Wallet,close:()=>void){
  const el=(parent:HTMLElement,tag:string,text='',cls='')=>{const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e};
  const previous=document.activeElement as HTMLElement|null;
  const overlay=el(document.body,'div','','bag-overlay');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Inventory');
  const panel=el(overlay,'aside','','bag-panel'),head=el(panel,'div','','bag-head');el(head,'h2','持ち物 / INVENTORY');
  const shut=el(head,'button','Close','bag-close') as HTMLButtonElement;shut.type='button';
  const pocket=el(panel,'section','','gate-pocket');el(pocket,'span',`きっぷ / TICKETS  ${tickets.length}`,'gate-label');
  const list=el(pocket,'div','','gate-tickets');
  for(const ticket of tickets){
    const image=el(list,'img','','bag-ticket') as HTMLImageElement;image.draggable=false;
    // Painted again once the Japanese font is in, like the signs.
    const paint=()=>{const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;paintTicket(canvas.getContext('2d')!,128,64,ticket);image.src=canvas.toDataURL()};
    paint();document.fonts?.load('16px "Yorimichi JP"').then(paint).catch(()=>{});
    image.alt=image.title=(ticket.kind==='route'?`${stations[ticket.from].en} → ${stations[ticket.to].en}, ${ticket.line}, ¥${ticket.fare}`:ticket.kind==='adjust'?`Fare adjustment ticket, ${stations[ticket.from].en} → ${ticket.toEn}, ¥${ticket.fare} paid`:`Fare ticket from ${stations[ticket.from].en}, ¥${ticket.fare}`)+(ticket.punched?', punched':'');
  }
  if(!tickets.length)el(list,'p','No ticket','gate-empty');
  if(groceries.length){
    const goods=el(panel,'section','','gate-pocket');el(goods,'span',`買い物 / GROCERIES  ${groceries.length}`,'gate-label');
    const shelf=el(goods,'div','','bag-goods'),counts=new Map<string,{en:string;n:number}>();
    for(const [ja,en] of groceries){const count=counts.get(ja);if(count)count.n++;else counts.set(ja,{en,n:1})}
    for(const [ja,{en,n}] of counts){
      const cell=el(shelf,'figure','','bag-good'),item=goodNamed(ja);cell.title=`${ja} · ${en}`;
      // The drawing the basket shows, painted again once the bitmap font is in; something no longer sold keeps its name only.
      if(item){const canvas=el(cell,'canvas') as HTMLCanvasElement;canvas.width=120;canvas.height=94;const paint=()=>{const g=canvas.getContext('2d')!;g.clearRect(0,0,120,94);paintCloseUp(g,item,0,0,120,94)};paint();document.fonts?.load('10px "Yorimichi Bitmap"').then(paint).catch(()=>{})}
      el(cell,'figcaption',n>1?`${ja} ×${n}`:ja);
    }
  }
  const purse=el(panel,'section','','gate-purse'),factor=walkFactor(wallet);
  el(purse,'span',`財布 / WALLET  ¥${walletTotal(wallet).toLocaleString('en-US')} · ${coinCount(wallet)} coins${factor<1?` · walking at ${Math.round(factor*100)}%`:''}`,'gate-label');
  const pieces=el(purse,'div','','gate-pieces');
  for(const value of [...notes,...coins])if(wallet[value]){const piece=el(pieces,'span','','gate-piece'+(isCoin(value)?' coin':''));piece.title='¥'+value.toLocaleString('en-US');const image=el(piece,'img') as HTMLImageElement;image.src=pieceArt(value);image.alt='¥'+value;el(piece,'span','×'+wallet[value])}
  const destroy=()=>{overlay.remove();previous?.focus()};
  const done=()=>{destroy();close()};
  shut.onclick=done;overlay.addEventListener('pointerdown',event=>{if(event.target===overlay)done()});
  overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'||event.key==='Tab'){event.preventDefault();if(event.key==='Escape')done()}});
  overlay.addEventListener('keyup',event=>event.stopPropagation());
  shut.focus();
  return {destroy,close:done};
}
