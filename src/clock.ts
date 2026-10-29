/** The journey's own clock: a date and time in ms (Japan time, read through the UTC fields), running `speed` times faster than real time while the page is open (even in the background) and kept
 * in the save. Whatever keeps time reads it: the clock in the scene's top band and the overlays' headers, the trains and their boards, nightfall, the stations' opening hours. */
/** Game minutes per real minute: one every two seconds, a day in 48 minutes. */
export const speed=30;
/** Real ms per game minute. */
export const minuteMs=60000/speed;
/** As at JR East's stations, minutes of the day: the shutters go up at 4:30 and down at 1:00, the first trains are due from 4:40 and the last ones by 0:45
 * (the Yamanote Line's run from about 4:26 to about 1:04). */
export const opens=270,closes=60,firstTrain=280,lastTrain=45;
/** After a night in bed (Journey.sleep in main.ts) the traveller gets up at 9:00, the time a new journey starts. */
export const wake=540;
let now=0,shown='',last=performance.now();
/** The clock in minutes from the epoch (a day is 1440): the trains' times are counted in these. */
export const minutes=()=>now/60000;
export const minuteOfDay=(m=minutes())=>(m%1440+1440)%1440;
export const clockMs=()=>now;
/** A new journey starts at 9:00 today; `?time=23:40` sets the clock to that time of its day (to try the night and the last trains). */
export function startClock(saved?:number){
  const today=new Date(),ms=saved??Date.UTC(today.getFullYear(),today.getMonth(),today.getDate(),wake/60),m=/^(\d{1,2}):(\d\d)$/.exec(new URLSearchParams(location.search).get('time')??'');
  now=ms;last=performance.now();if(m)setTimeOfDay(m[0]);else refresh();
}
/** Debug: the clock set to `time` ("H:MM") on its day (earlier or later); false if it does not read as a time. */
export function setTimeOfDay(time:string){
  const m=/^\s*(\d{1,2})[:h](\d\d)\s*$/.exec(time);if(!m||+m[1]>23||+m[2]>59)return false;
  now=Math.floor(now/864e5)*864e5+(+m[1]*60+ +m[2])*60000;last=performance.now();refresh();return true;
}
/** On by the real time gone by since the last tick, read from the browser's clock rather than the scene's frame time: Phaser stops in a hidden tab and caps its steps
 * in a throttled one, but the journey's clock keeps going (the trains catch up with it when the scene runs again). */
export function tick(){const t=performance.now();now+=(t-last)*speed;last=t;refresh()}
export function addMinutes(m:number){now+=m*60000;refresh()}
/** On to the next `at` (minute of the day). */
export const skipTo=(at:number)=>addMinutes((at-minuteOfDay()+1440)%1440);
export const hhmm=(m:number)=>{const d=Math.floor(minuteOfDay(m));return `${Math.floor(d/60)}:${String(d%60).padStart(2,'0')}`};
export const stationOpen=(m=minutes())=>{const d=minuteOfDay(m);return d>=opens||d<closes};
export const trainsRun=(m=minutes())=>{const d=minuteOfDay(m);return d>=firstTrain||d<lastTrain};
/** `m` if trains run then, else the first train's time after it. */
export const inService=(m:number)=>trainsRun(m)?m:m-minuteOfDay(m)+firstTrain;
/** How dark it is out of doors, from 0 by day to 1 at night: dusk from 18:00 to 19:00, dawn from 5:00 to 6:00. */
export function darkness(m=minutes()){const h=minuteOfDay(m)/60;return h<5?1:h<6?6-h:h<18?0:h<19?h-18:1}
const weekdays=['日 Sun','月 Mon','火 Tue','水 Wed','木 Thu','金 Fri','土 Sat'],months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
/** The weekday and date, as the scene's top band shows them over the time. */
export const dayLabel=()=>{const date=new Date(now);return `${weekdays[date.getUTCDay()]} ${date.getUTCDate()} ${months[date.getUTCMonth()]}`};
/** The clock in an overlay's header: the weekday and date, then the time. Every one shown follows the clock (refresh). */
export function clockBadge(){const el=document.createElement('time');el.className='game-clock';el.innerHTML=shown;return el}
function refresh(){
  const html=`<span class="clock-day">${dayLabel()}</span> ${hhmm(minutes())}`;
  if(html!==shown){shown=html;document.querySelectorAll('.game-clock').forEach(el=>el.innerHTML=html)}
}
/** The date as the ATM prints it on its receipt. */
export const receiptDate=()=>new Date(now).toLocaleDateString('ja-JP',{timeZone:'UTC'});
