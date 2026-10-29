import { receiptDate } from './clock';
import type { Konbini } from './network';
import { coinCount, coins, machineSound, notes, pieceArt, saveWallet, walletTotal, type Wallet } from './wallet';

/** The konbini ATM, re-drawn after the Seven Bank machines that take cards issued abroad (see REFERENCES.md): pick the transaction, insert the card,
 * enter the PIN, choose the amount (preset keys, or 万 / 千円 on the keypad), confirm the ¥110 fee, say whether a receipt is wanted, then take the card and the cash.
 * A foreign card only withdraws and shows the balance: deposits and transfers are refused and the card handed back. */
type Step='home'|'card'|'pin'|'amount'|'other'|'confirm'|'receipt'|'busy'|'balance'|'refused'|'take';
type Deal='withdraw'|'deposit'|'balance'|'transfer';
type Lang='ja'|'en';
// What waits in the outlets: the card, the receipt, or the bundle of notes.
type Out={kind:'card'}|{kind:'receipt';lines:string[]}|{kind:'cash';notes:number[]};
// The traveller's bank account at home, kept between sessions; the PIN is on the memo in the wallet.
const bankKey='yorimichi-bank',pinCode='0815',fee=110,limit=100000;
export const loadBalance=()=>{try{const raw=localStorage.getItem(bankKey),v=Number(raw);if(raw!==null&&Number.isFinite(v)&&v>=0)return v}catch{}return 300000};
const saveBalance=(v:number)=>{try{localStorage.setItem(bankKey,JSON.stringify(v))}catch{}};
// The bank running each chain's machines, named on the plate over the screen.
const banks:Record<Konbini,[string,string,string]>={seven:['セブン銀行','Seven Bank','#d6402e'],family:['イーネット','E-net','#2c8a4a'],lawson:['ローソン銀行','Lawson Bank','#1f5fbf']};
const yen=(v:number)=>'¥'+v.toLocaleString('en-US');
let cardImage='';
/** The traveller's debit card as pixel art (30 × 19, shown at 3×). */
function cardArt(){
  if(cardImage)return cardImage;
  const canvas=document.createElement('canvas'),g=canvas.getContext('2d')!;canvas.width=30;canvas.height=19;
  const r=(x:number,y:number,w:number,h:number,c:string)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
  r(1,0,28,19,'#1d3f7a');r(0,1,30,17,'#1d3f7a');r(1,1,28,6,'#2c5aa3');r(1,13,28,3,'#e2b23a');r(4,6,6,5,'#e8c440');r(5,7,4,1,'#b38a1f');r(5,9,4,1,'#b38a1f');
  for(let k=0;k<4;k++)r(13+k*3,8,2,1,'#c9d6ea');for(let k=0;k<4;k++)r(13+k*3,10,2,1,'#c9d6ea');r(22,2,3,3,'#d6402e');r(24,2,3,3,'#f2a13a');
  return cardImage=canvas.toDataURL();
}

export class Atm {
  private overlay=document.createElement('div');
  private panel=document.createElement('div');
  private design=document.createElement('div');
  private observer:ResizeObserver;
  private step:Step='home';
  private history:Step[]=[];
  private lang:Lang='ja';
  private deal:Deal='withdraw';
  private pin='';
  private tries=0;
  private amount=0;
  // The amount typed on the keypad: tens of thousands (万) then thousands (千円).
  private man:number|null=null;
  private typed='';
  // Set once the cash is paid out: taking everything then ends the visit.
  private paid=false;
  // Whether the card is inside the machine (it comes back through the card outlet).
  private cardIn=false;
  private out:Out[]=[];
  // Outlet items already drawn, so a re-render does not drop them out again.
  private shown=new WeakSet<Out>();
  private balance=loadBalance();
  private notice:[string,string]|null=null;
  private flash='';
  private timer=0;
  private disposed=false;
  private padFrame=0;
  private padPrevious:boolean[]=[];
  private lastNavigation=0;
  private previousFocus=document.activeElement as HTMLElement|null;
  constructor(private konbini:Konbini,private wallet:Wallet,private onWallet:()=>void,private dismiss:()=>void){
    this.overlay.className='machine-overlay atm-overlay';this.overlay.setAttribute('role','dialog');this.overlay.setAttribute('aria-modal','true');this.overlay.setAttribute('aria-label','ATM');
    this.panel.className='machine-viewport';this.design.className='machine-design atm-design';this.panel.append(this.design);this.overlay.append(this.panel);document.body.append(this.overlay);
    this.observer=new ResizeObserver(()=>this.design.style.transform=`scale(${this.panel.clientWidth/960})`);this.observer.observe(this.panel);
    this.overlay.addEventListener('pointerdown',()=>this.overlay.classList.remove('pad-nav'));
    this.overlay.addEventListener('keydown',this.onKey);this.padPrevious=this.currentPad()?.buttons.map(b=>b.pressed)??[];this.render();this.padFrame=requestAnimationFrame(this.pollPad);
  }
  /** Leaving: the card is the traveller's and goes back to the wallet; cash left in the outlet is drawn back in and credited again, as real ATMs do. */
  destroy(){
    if(this.disposed)return;this.disposed=true;clearTimeout(this.timer);
    for(const item of this.out)if(item.kind==='cash'){this.balance+=item.notes.reduce((a,b)=>a+b,0)+fee;saveBalance(this.balance)}
    cancelAnimationFrame(this.padFrame);this.observer.disconnect();this.overlay.remove();this.previousFocus?.focus();
  }
  private close(){this.destroy();this.dismiss();}
  private tr(ja:string,en:string){return this.lang==='ja'?ja:en;}
  private currentPad(){return Array.from(navigator.getGamepads?.()??[]).find(pad=>pad?.connected);}
  private pollPad=(time:number)=>{
    if(this.disposed)return;
    const pad=this.currentPad();
    if(pad){
      const pressed=pad.buttons.map(b=>b.pressed),edge=(i:number)=>pressed[i]&&!this.padPrevious[i];
      const dx=(pressed[15]?1:0)-(pressed[14]?1:0)+(Math.abs(pad.axes[0]??0)>.5?Math.sign(pad.axes[0]):0),dy=(pressed[13]?1:0)-(pressed[12]?1:0)+(Math.abs(pad.axes[1]??0)>.5?Math.sign(pad.axes[1]):0);
      if(dx||dy||pressed.some((_,i)=>edge(i)))this.overlay.classList.add('pad-nav');
      if((dx||dy)&&time-this.lastNavigation>180){this.moveFocus(dx,dy);this.lastNavigation=time}
      if(edge(0)){const active=document.activeElement as HTMLElement;if(this.overlay.contains(active))active.click()}
      // B is とりけし, or leaves from the first screen.
      if(edge(1)){this.padPrevious=pressed;this.cancel();if(this.disposed)return}
      this.padPrevious=pressed;
    }
    this.padFrame=requestAnimationFrame(this.pollPad);
  };
  /** The nearest live button in the stick's direction. */
  private moveFocus(dx:number,dy:number){
    const buttons=Array.from(this.overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')).filter(b=>b.getClientRects().length),active=document.activeElement as HTMLButtonElement;
    if(!buttons.includes(active)){buttons[0]?.focus();return}
    const a=active.getBoundingClientRect(),x=a.x+a.width/2,y=a.y+a.height/2,sideways=Math.abs(dx)>=Math.abs(dy);
    let best:HTMLButtonElement|undefined,score=Infinity;
    for(const button of buttons){
      if(button===active)continue;
      const b=button.getBoundingClientRect(),nx=b.x+b.width/2-x,ny=b.y+b.height/2-y,ahead=sideways?nx*Math.sign(dx):ny*Math.sign(dy),total=ahead+(sideways?Math.abs(ny):Math.abs(nx))*2;
      if(ahead>2&&total<score){best=button;score=total}
    }
    best?.focus();
  }
  private onKey=(event:KeyboardEvent)=>{
    event.stopPropagation();
    if(event.key==='Escape'){event.preventDefault();this.close();return}
    // The keypad from the keyboard: digits, Backspace to correct, Enter to confirm.
    if(this.step==='pin'||this.step==='other'){
      if(/^\d$/.test(event.key)){event.preventDefault();this.key(event.key)}
      else if(event.key==='Backspace'){event.preventDefault();this.key('訂正')}
      else if(event.key==='Enter'&&this.step==='pin'){event.preventDefault();this.key('確認')}
    }
    if(event.key==='Tab'){
      const focusable=Array.from(this.overlay.querySelectorAll<HTMLElement>('button:not(:disabled)')),first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    }
  };
  private go(step:Step,remember=true){if(remember)this.history.push(this.step);this.step=step;this.render();}
  private back(){this.step=this.history.pop()??'home';this.render();}
  /** The machine works for a moment (お取引中), then moves on. */
  private work(then:()=>void,ms=1300){this.history=[];this.go('busy',false);this.timer=window.setTimeout(()=>{if(!this.disposed)then()},ms);}
  private say(notice:[string,string]){this.notice=notice;this.render();}
  /** とりけし: the card comes back if it was in, else the machine is left. */
  private cancel(){
    if(['busy','take','refused'].includes(this.step))return;
    if(this.cardIn){this.eject();this.go('take',false);return}
    if(this.step==='home'||this.step==='card')this.close();else{this.history=[];this.go('home',false)}
  }
  private eject(){this.cardIn=false;this.out.push({kind:'card'});machineSound('drop');}
  private choose(deal:Deal){this.deal=deal;this.pin='';this.tries=0;this.go('card');}
  /** The card pushed into its slot: only when the screen asks for it. */
  private insertCard(){
    if(this.step!=='card'||this.cardIn||this.out.some(o=>o.kind==='card')){machineSound('reject');this.flash='shake';this.render();return}
    this.cardIn=true;machineSound('note');
    this.work(()=>{if(this.deal==='deposit'||this.deal==='transfer'){this.eject();this.history=[];this.go('refused',false)}else{this.history=[];this.go('pin',false)}},900);
  }
  /** A key of the on-screen keypad, for the PIN or the amount. */
  private key(k:string){
    if(this.step==='pin'){
      if(/^\d$/.test(k)&&this.pin.length<4)this.pin+=k;
      else if(k==='訂正')this.pin='';
      else if(k==='確認'&&this.pin.length===4){
        if(this.pin===pinCode){this.pin='';if(this.deal==='balance')this.work(()=>this.go('balance',false));else{this.history=[];this.go('amount',false)}return}
        this.pin='';this.tries++;machineSound('reject');
        if(this.tries>=3){this.eject();this.go('refused',false);return}
        this.notice=['暗証番号が違います。もう一度入力してください。','Incorrect PIN. Please enter it again.'];
      }
      machineSound('coin');this.render();return;
    }
    if(this.step==='other'){
      if(/^\d$/.test(k)){if(this.typed.length<(this.man===null?2:1)&&!(this.typed===''&&k==='0'))this.typed+=k}
      else if(k==='万'){if(this.man===null&&this.typed){this.man=Number(this.typed);this.typed=''}}
      else if(k==='訂正'){this.man=null;this.typed=''}
      else if(k==='千円'){const amount=(this.man??0)*10000+Number(this.typed||0)*1000;if(amount)this.pick(amount);else machineSound('reject');return}
      machineSound('coin');this.render();
    }
  }
  private pick(amount:number){
    if(amount>limit){this.say(['1回のお引出しは10万円までです。','The limit is ¥100,000 per withdrawal.']);return}
    if(amount+fee>this.balance){this.say(['残高が不足しています。','Insufficient balance for this amount.']);return}
    this.amount=amount;this.go('confirm');
  }
  /** Confirmed: the account is debited, the card comes out first, then the notes (as few as possible, 10,000 and 1,000 yen) and the receipt. */
  private withdraw(receipt:boolean){
    this.work(()=>{
      this.paid=true;
      this.balance-=this.amount+fee;saveBalance(this.balance);
      const bundle=[...Array(Math.floor(this.amount/10000)).fill(10000),...Array(this.amount%10000/1000).fill(1000)];
      this.eject();this.out.push({kind:'cash',notes:bundle});
      if(receipt)this.out.push({kind:'receipt',lines:[receiptDate(),'お引出し '+yen(this.amount),'手数料 '+yen(fee),'残高 '+yen(this.balance)]});
      this.go('take',false);
    },1800);
  }
  /** Taken from an outlet: the card first (the cash waits behind the shutter until then). */
  private take(item:Out){
    if(item.kind!=='card'&&this.out.some(o=>o.kind==='card'))return;
    this.out=this.out.filter(o=>o!==item);machineSound('drop');
    if(item.kind==='cash'){for(const v of item.notes)this.wallet[v]=(this.wallet[v]??0)+1;saveWallet(this.wallet);this.onWallet()}
    if(!this.out.length&&(this.step==='take'||this.step==='refused')){
      // A withdrawal ends the visit; after a refusal, a cancel or a balance check, back to the first screen.
      if(this.paid){this.step='take';this.render();this.timer=window.setTimeout(()=>{if(!this.disposed)this.close()},900);return}
      this.history=[];this.step='home';
    }
    this.render();
  }

  private button(parent:HTMLElement,label:string,action:()=>void,cls='',disabled=false){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.disabled=disabled;b.addEventListener('click',action);parent.append(b);return b;}
  private element(parent:HTMLElement,tag:string,text='',cls=''){const e=document.createElement(tag);e.className=cls;e.textContent=text;parent.append(e);return e;}
  private render(){
    const focusKey=(document.activeElement as HTMLElement|null)?.dataset?.key,[bankJa,bankEn,color]=banks[this.konbini];
    this.design.replaceChildren();this.design.style.setProperty('--bank',color);
    const shell=this.element(this.design,'div','','atm-shell');
    const plate=this.element(shell,'div','','atm-plate');this.element(plate,'strong','ATM');this.element(plate,'span',bankJa+'  '+bankEn);
    // The upper display: cards issued abroad welcome, with the networks' marks.
    const upper=this.element(shell,'div','','atm-upper');this.element(upper,'p','海外発行カード対応 · International cards accepted · 24h');
    const marks=this.element(upper,'div','','atm-marks');for(const [mark,c] of [['VISA','#1a1f71'],['PLUS','#0b6cb5'],['Mastercard','#eb001b'],['Maestro','#0099df'],['Cirrus','#00427a'],['JCB','#0e6b3a'],['UnionPay','#c8102e'],['AMEX','#2e77bb'],['Discover','#e57b23']])this.element(marks,'span',mark).style.background=c;
    // The touch screen.
    const screen=this.element(shell,'div','','atm-screen');screen.lang=this.lang;
    const top=this.element(screen,'div','','atm-top');
    const titles:Record<Step,[string,string]>={home:['お取引を選択してください','Please select a transaction'],card:['カードを入れてください','Please insert your card'],pin:['暗証番号を入力してください','Please enter your PIN'],amount:['金額を選択してください','Please select the amount'],other:['金額を入力してください','Please enter the amount'],confirm:['お取引内容をご確認ください','Please confirm the transaction'],receipt:['ご利用明細票は必要ですか','Do you need a receipt?'],busy:['お取引中です','Processing'],balance:['残高照会','Balance inquiry'],refused:['このカードはお取扱いできません','This card cannot be used'],take:this.out.some(o=>o.kind==='card')?['カードをお取りください','Please take your card']:this.out.some(o=>o.kind==='cash')?['お金をお取りください','Please take your cash']:this.out.length?['明細票をお取りください','Please take your receipt']:['ありがとうございました','Thank you']};
    this.element(top,'h2',this.tr(...titles[this.step]));
    const language=this.button(top,this.lang==='ja'?'English':'日本語',()=>{this.lang=this.lang==='ja'?'en':'ja';this.render()},'atm-language',this.step==='busy');language.dataset.key='language';
    const body=this.element(screen,'div','','atm-body step-'+this.step);this.content(body);
    const bottom=this.element(screen,'div','','atm-bottom');
    this.button(bottom,this.tr('とりけし','Cancel'),()=>this.cancel(),'atm-cancel',['busy','take','refused'].includes(this.step)).dataset.key='cancel';
    if(this.history.length&&['card','other','confirm','receipt'].includes(this.step))this.button(bottom,this.tr('もどる','Back'),()=>this.back(),'atm-back').dataset.key='back';
    this.element(bottom,'span',this.tr('手数料 '+yen(fee)+'（海外発行カード）','Fee '+yen(fee)+' (cards issued abroad)'),'atm-fee');
    if(this.notice)this.element(screen,'p',this.tr(...this.notice),'atm-notice');
    // Under the screen: the card slot (and its outlet), the receipt slot, the cash outlet behind its shutter.
    const front=this.element(shell,'div','','atm-front');
    const card=this.element(front,'div','','atm-slot atm-card'+(this.step==='card'?' ready':'')+(this.flash?' '+this.flash:''));card.dataset.slot='card';
    this.element(card,'span','カード Card','atm-label');this.element(card,'span','','atm-opening');
    const receipt=this.element(front,'div','','atm-slot atm-receipt');this.element(receipt,'span','明細票 Receipt','atm-label');this.element(receipt,'span','','atm-opening');
    const cash=this.element(front,'div','','atm-slot atm-cash');this.element(cash,'span','お札 Cash','atm-label');const tray=this.element(cash,'div','','atm-tray');
    for(const item of this.out){
      const parent=item.kind==='card'?card:item.kind==='receipt'?receipt:tray,b=this.button(parent,'',()=>this.take(item),'atm-out atm-out-'+item.kind+(this.shown.has(item)?'':' fresh'),item.kind!=='card'&&this.out.some(o=>o.kind==='card'));b.dataset.key='out-'+item.kind;this.shown.add(item);
      if(item.kind==='card'){const img=this.element(b,'img') as HTMLImageElement;img.src=cardArt();img.alt='';b.title=this.tr('カードを取る','Take the card')}
      else if(item.kind==='cash'){for(const v of item.notes.slice(0,6)){const img=this.element(b,'img') as HTMLImageElement;img.src=pieceArt(v);img.alt=''}b.title=this.tr('お金を取る','Take the cash')+' '+yen(item.notes.reduce((a,c)=>a+c,0))}
      else{this.element(b,'span',item.lines.join('\n'));b.title=this.tr('明細票を取る','Take the receipt')}
      parent.classList.add('lit');
    }
    const keys=this.element(front,'div','','atm-keys');for(const k of '123456789*0#')this.element(keys,'span',k);
    // Beside the machine: the wallet, the card to push into the slot, the PIN memo.
    const purse=this.element(this.design,'div','','machine-wallet atm-wallet');
    this.element(purse,'div',`財布 / WALLET   ${yen(walletTotal(this.wallet))}\n◉ ${coinCount(this.wallet)} ${this.tr('枚','coins')}`,'wallet-head');
    const inHand=!this.cardIn&&!this.out.some(o=>o.kind==='card'),own=this.button(purse,'',()=>this.insertCard(),'atm-own-card',!inHand);own.dataset.key='own-card';
    if(inHand){const img=this.element(own,'img') as HTMLImageElement;img.src=cardArt();img.alt='';img.draggable=false;this.drag(own,img)}
    this.element(own,'span',inHand?this.tr('デビットカード\nカード口へ','Debit card\ninto the card slot'):this.cardIn?this.tr('カードは機械の中','The card is in the machine'):this.tr('カードはカード口に','The card waits in the card slot'));
    this.element(purse,'p',this.tr('メモ：暗証番号 ','Memo: PIN ')+pinCode,'atm-memo');
    const list=this.element(purse,'div','','atm-pieces');
    for(const v of [...notes,...coins].reverse()){const row=this.element(list,'div','','atm-piece'+((this.wallet[v]??0)?'':' none'));const img=this.element(row,'img') as HTMLImageElement;img.src=pieceArt(v);img.alt='';this.element(row,'span',yen(v)+'  ×'+(this.wallet[v]??0))}
    this.notice=null;this.flash='';
    const keep=focusKey&&this.design.querySelector<HTMLButtonElement>(`[data-key="${focusKey}"]:not(:disabled)`);
    (keep||['.atm-out:not(:disabled)','.atm-body .main:not(:disabled)','.atm-body button:not(:disabled)','.atm-own-card:not(:disabled)','.atm-language'].map(q=>this.design.querySelector<HTMLButtonElement>(q)).find(Boolean))?.focus({preventScroll:true});
  }
  /** The card dragged from the wallet onto the card slot (a click inserts it too). */
  private drag(button:HTMLButtonElement,image:HTMLImageElement){
    button.addEventListener('pointerdown',down=>{
      if(down.button!==0)return;let ghost:HTMLImageElement|null=null;
      const slotAt=(e:PointerEvent)=>document.elementsFromPoint(e.clientX,e.clientY).some(el=>el.closest('[data-slot="card"]'));
      const move=(e:PointerEvent)=>{
        if(!ghost&&Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)>6){const r=image.getBoundingClientRect();ghost=image.cloneNode() as HTMLImageElement;ghost.className='piece-ghost';ghost.style.width=r.width+'px';ghost.style.height=r.height+'px';this.overlay.append(ghost)}
        if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';this.overlay.querySelector('[data-slot="card"]')?.classList.toggle('hover',slotAt(e))}
      };
      const end=(e:PointerEvent)=>{
        button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',end);button.removeEventListener('pointercancel',end);if(!ghost)return;
        ghost.remove();button.dataset.dragged='1';setTimeout(()=>delete button.dataset.dragged,150);if(e.type==='pointerup'&&slotAt(e))this.insertCard();else this.render();
      };
      button.setPointerCapture(down.pointerId);button.addEventListener('pointermove',move);button.addEventListener('pointerup',end);button.addEventListener('pointercancel',end);
    });
    button.addEventListener('click',e=>{if(button.dataset.dragged)e.stopImmediatePropagation()},true);
  }
  private content(body:HTMLElement){
    const tr=(ja:string,en:string)=>this.tr(ja,en);
    if(this.step==='home'){
      const grid=this.element(body,'div','','atm-menu');
      this.button(grid,tr('お引出し','Withdrawal'),()=>this.choose('withdraw'),'main withdraw');
      this.button(grid,tr('お預入れ','Deposit'),()=>this.choose('deposit'));
      this.button(grid,tr('残高照会','Balance inquiry'),()=>this.choose('balance'));
      this.button(grid,tr('お振込み','Transfer'),()=>this.choose('transfer'));
      this.button(grid,tr('スマホATM','Smartphone ATM'),()=>{},'',true);
      this.element(body,'p',tr('海外発行のカードは、お引出しと残高照会がご利用いただけます。','Cards issued abroad: withdrawal and balance inquiry.'),'atm-note');
    }else if(this.step==='card'){
      const prompt=this.element(body,'div','','atm-prompt');const img=this.element(prompt,'img') as HTMLImageElement;img.src=cardArt();img.alt='';
      this.element(prompt,'p',tr('キャッシュカード・クレジットカードを\n下のカード挿入口にお入れください。','Insert your cash card or credit card\ninto the card slot below.'));
      this.element(body,'p',tr('財布のカードをカード口へドラッグ、またはクリック。','Drag the card from your wallet onto the card slot, or click it.'),'atm-note');
    }else if(this.step==='pin'||this.step==='other'){
      const pin=this.step==='pin',layout=this.element(body,'div','','atm-entry');
      this.element(layout,'div',pin?'●'.repeat(this.pin.length).padEnd(4,'○'):(this.man!==null?this.man+'万':'')+(this.typed||(this.man===null?'0':''))+' 円',pin?'atm-display pin':'atm-display');
      if(!pin)this.element(layout,'p',tr('例：2万5千円 → 2 万 5 千円','e.g. ¥25,000 → 2 万 5 千円'),'atm-note');
      const pad=this.element(layout,'div','','atm-pad');
      for(const k of ['1','2','3','4','5','6','7','8','9',pin?'訂正':'万','0',pin?'確認':'千円'])this.button(pad,k,()=>this.key(k),k==='確認'||k==='千円'?'main ok':k==='訂正'?'fix':'',k==='確認'&&this.pin.length<4).dataset.key='k'+k;
      if(!pin)this.button(layout,tr('訂正','Correct'),()=>this.key('訂正'),'fix wide').dataset.key='k訂正';
      if(pin)this.element(layout,'p',tr('お手元を隠してご入力ください。','Shield the keypad while entering your PIN.'),'atm-note');
    }else if(this.step==='amount'){
      const grid=this.element(body,'div','','atm-amounts');
      for(const v of [10000,20000,30000,40000,50000,100000])this.button(grid,(v/10000)+tr('万円',' × ¥10,000'),()=>this.pick(v)).dataset.key='a'+v;
      this.button(grid,tr('その他の金額','Other amount'),()=>{this.man=null;this.typed='';this.go('other')},'other').dataset.key='other';
      this.element(body,'p',tr('1回のお引出しは10万円まで。','Up to ¥100,000 per withdrawal.'),'atm-note');
    }else if(this.step==='confirm'){
      const table=this.element(body,'dl','','atm-details');
      for(const [label,value] of [[tr('お取引','Transaction'),tr('お引出し','Withdrawal')],[tr('お引出し金額','Amount'),yen(this.amount)],[tr('ATM利用手数料','ATM fee'),yen(fee)],[tr('お引落し合計','Total debited'),yen(this.amount+fee)]]){this.element(table,'dt',label);this.element(table,'dd',value)}
      this.element(body,'p',tr('カード発行会社の手数料がかかる場合があります。','Your card issuer may charge its own fees.'),'atm-note');
      this.button(body,tr('確認','Confirm'),()=>this.go('receipt'),'main ok atm-confirm').dataset.key='confirm';
    }else if(this.step==='receipt'){
      const grid=this.element(body,'div','','atm-choice');
      this.button(grid,tr('必要','Yes'),()=>this.withdraw(true),'main').dataset.key='yes';this.button(grid,tr('不要','No'),()=>this.withdraw(false)).dataset.key='no';
    }else if(this.step==='busy'){
      this.element(body,'div','','atm-wait');this.element(body,'p',tr('しばらくお待ちください','Please wait a moment'),'atm-note centre');
    }else if(this.step==='balance'){
      const table=this.element(body,'dl','','atm-details');this.element(table,'dt',tr('お支払可能残高','Available balance'));this.element(table,'dd',yen(this.balance));
      this.button(body,tr('終了','Finish'),()=>{this.eject();this.go('take',false)},'main ok atm-confirm').dataset.key='finish';
    }else if(this.step==='refused'){
      this.element(body,'p',this.tries>=3?tr('暗証番号の誤りが続いたため、お取扱いできません。\nカードをお取りください。','The PIN was wrong too many times.\nPlease take your card.'):tr('海外発行のカードでは、お預入れ・お振込みはご利用いただけません。\nカードをお取りください。','Deposits and transfers are not available\nwith cards issued abroad. Please take your card.'),'atm-message');
    }else if(this.step==='take'){
      this.element(body,'p',this.out.length?tr('取り忘れにご注意ください。','Do not forget your card and cash.'):tr('またのご利用をお待ちしております。','We look forward to seeing you again.'),'atm-message');
    }
  }
}
