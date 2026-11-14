/** The little concert under the vines (outing.ts), synthesized: a waltz in G, the violin's tune over the guitar's chords and a soft bass, sixteen bars twice, then the applause;
 * and the robot's chime as it brings the plates. Nothing is recorded: every note is an oscillator through its envelope. */
const note=(name:string)=>{const m=/^([A-G])(#?)(\d)$/.exec(name)!,semis={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1] as 'C']+(m[2]?1:0)+(+m[3]+1)*12;return 440*2**((semis-69)/12)};
/** Each bar's chord (its notes from the root, low) and the tune over it: [note, beats], three beats a bar. */
const bars:[string[],[string,number][]][]=[
  [['G2','B3','D4','G4'],[['B4',1],['D5',1],['G5',1]]],[['G2','B3','D4','G4'],[['F#5',1.5],['E5',.5],['D5',1]]],[['C3','C4','E4','G4'],[['E5',1],['G5',1],['E5',1]]],[['D3','A3','D4','F#4'],[['D5',2],['A4',1]]],
  [['G2','B3','D4','G4'],[['B4',1],['D5',1],['G5',1]]],[['E2','B3','E4','G4'],[['B5',1.5],['A5',.5],['G5',1]]],[['C3','C4','E4','G4'],[['E5',1],['F#5',1],['G5',1]]],[['D3','A3','D4','F#4'],[['A5',3]]],
  [['E2','B3','E4','G4'],[['G5',1],['E5',1],['B4',1]]],[['C3','C4','E4','G4'],[['C5',1],['E5',1],['G5',1]]],[['G2','B3','D4','G4'],[['D5',1.5],['B4',.5],['G4',1]]],[['D3','A3','D4','F#4'],[['A4',1],['B4',1],['C5',1]]],
  [['C3','C4','E4','G4'],[['E5',1],['D5',1],['C5',1]]],[['D3','A3','D4','F#4'],[['B4',1],['A4',1],['F#4',1]]],[['G2','B3','D4','G4'],[['G4',1],['B4',1],['D5',1]]],[['G2','B3','D4','G4'],[['G5',3]]],
];
const beat=.5,barLength=beat*3;
/** How long the piece lasts, applause included (s). */
export const concertLength=bars.length*2*barLength+5;
let audio:AudioContext|null=null;
const context=()=>audio??=new AudioContext();
/** Plays the waltz from now; `stop` silences it at once (the place left). */
export function playConcert(){
  try{
    const a=context(),out=a.createGain(),start=a.currentTime+.2;out.gain.value=.5;out.connect(a.destination);
    const sources:AudioScheduledSourceNode[]=[];
    const voice=(freq:number,at:number,length:number,type:OscillatorType,volume:number,attack=.01,vibrato=0)=>{
      const osc=a.createOscillator(),env=a.createGain(),filter=a.createBiquadFilter();osc.type=type;osc.frequency.value=freq;filter.type='lowpass';filter.frequency.value=type==='sawtooth'?2400:3200;
      osc.connect(filter);filter.connect(env);env.connect(out);
      env.gain.setValueAtTime(.0001,at);env.gain.exponentialRampToValueAtTime(volume,at+attack);env.gain.exponentialRampToValueAtTime(volume*.6,at+length*.6);env.gain.exponentialRampToValueAtTime(.0001,at+length);
      if(vibrato){const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=5.5;depth.gain.value=freq*vibrato;lfo.connect(depth);depth.connect(osc.frequency);lfo.start(at+.15);lfo.stop(at+length);sources.push(lfo)}
      osc.start(at);osc.stop(at+length+.05);sources.push(osc);
    };
    for(let pass=0;pass<2;pass++)bars.forEach(([chord,tune],b)=>{
      const t0=start+(pass*bars.length+b)*barLength;
      // The bass on the bar's first beat, the guitar's chord on the two others, and its arpeggio on the second pass.
      voice(note(chord[0]),t0,barLength*.9,'sine',.22);
      for(let i=1;i<3;i++)chord.slice(1).forEach((n,k)=>voice(note(n),t0+i*beat+k*(pass?.06:.012),beat*.9,'triangle',.06));
      let at=t0;for(const [n,beats] of tune){voice(note(n),at,beats*beat*.95,'sawtooth',.05,.06,.006);if(pass)voice(note(n)/2,at,beats*beat*.95,'triangle',.03,.03);at+=beats*beat}
    });
    // The applause: bursts of noise, a crowd's hands, thinning out.
    const end=start+bars.length*2*barLength+.3,noise=a.createBuffer(1,a.sampleRate*.05,a.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    for(let i=0;i<140;i++){const at=end+Math.random()**1.4*4,src=a.createBufferSource(),env=a.createGain(),f=a.createBiquadFilter();src.buffer=noise;f.type='bandpass';f.frequency.value=1200+Math.random()*1800;env.gain.value=.12*(1-(at-end)/4.5);src.connect(f);f.connect(env);env.connect(out);src.start(at);sources.push(src)}
    return {stop:()=>{out.gain.cancelScheduledValues(a.currentTime);out.gain.setValueAtTime(out.gain.value,a.currentTime);out.gain.linearRampToValueAtTime(0,a.currentTime+.3);for(const s of sources)try{s.stop(a.currentTime+.35)}catch{}}};
  }catch{return {stop:()=>{}}}
}
/** The robot's little tune as it arrives with the plates. */
export function robotChime(){
  try{const a=context(),now=a.currentTime;[784,988,1175,1568].forEach((f,i)=>{const osc=a.createOscillator(),env=a.createGain();osc.type='sine';osc.frequency.value=f;osc.connect(env);env.connect(a.destination);env.gain.setValueAtTime(.07,now+i*.13);env.gain.exponentialRampToValueAtTime(.0001,now+i*.13+.3);osc.start(now+i*.13);osc.stop(now+i*.13+.32)})}catch{}
}
