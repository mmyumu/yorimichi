import Phaser from 'phaser';
import './style.css';
import { makeArt } from './art';
import { MachineHall } from './machine-hall';
import { TicketMachine, type TravelTicket, type FareTicket } from './ticket-machine';
import { openTokyoDepartures, type FareStation } from './tokyo-fares';

import { places, isHub, returnHub, platformFor, type Place, type Service } from './network';
class Journey extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private sprite!:Phaser.GameObjects.Image;
  private facing='down';
  private world!: Phaser.GameObjects.Container;
  private hud!: Phaser.GameObjects.Container;
  private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private place:Place='tokyo';
  private ticket:TravelTicket|null=null;
  private currentStation:FareStation|null=null;
  private departures:{destroy:()=>void}|null=null;
  private hall:MachineHall|null=null;
  private machineId:string|null=null;
  private machine:TicketMachine|null=null;
  private modal:Phaser.GameObjects.Container|null=null;
  private direction={x:0,y:0};
  private path: {x:number,y:number}[]=[];
  private marker!: Phaser.GameObjects.Arc;
  private solids:Phaser.Geom.Rectangle[]=[];
  private prompt!:Phaser.GameObjects.Text;
  private walk=0;
  private moving=false;
  private commuters:Phaser.GameObjects.Image[]=[];
  private announcement!:Phaser.GameObjects.Text;
  private collected=new Set<string>(JSON.parse(localStorage.getItem('yorimichi-memories')||'[]'));
  constructor(){super('Journey')}
  create(){
    makeArt(this);
    this.input.addPointer(3);
    this.keys=this.input.keyboard!.createCursorKeys();
    this.actionKey=this.input.keyboard!.addKey('E');
    this.input.keyboard!.on('keydown-SPACE',()=>this.interact());
    this.actionKey.on('down',()=>this.interact());
    this.loadPlace('tokyo');
    this.input.on('pointerdown',(pointer:Phaser.Input.Pointer, objects:Phaser.GameObjects.GameObject[])=>{
      if(!this.modal && objects.length===0 && pointer.y>70 && pointer.y<550)this.navigate(pointer.x,pointer.y);
    });
  }
  private rect(x:number,y:number,w:number,h:number,color:number,container=this.world){const r=this.add.rectangle(x,y,w,h,color).setOrigin(0);container.add(r);return r}
  private label(x:number,y:number,text:string,size=16,color='#283d3c',container=this.world){const t=this.add.text(x,y,text,{fontFamily:'monospace',fontSize:size,color,lineSpacing:5});container.add(t);return t}
  private loadPlace(place:Place){
    this.machine?.destroy();this.machine=null;this.hall?.destroy();this.hall=null;this.machineId=null;this.departures?.destroy();this.departures=null;
    if(place!=='jr-stop')this.currentStation=null;
    this.modal?.destroy();this.modal=null;this.world?.destroy(true);this.hud?.destroy(true);
    this.place=place;this.commuters=[];this.path=[];this.solids=[];this.direction={x:0,y:0};
    this.world=this.add.container(0,0);this.hud=this.add.container(0,0);
    this.world.add(this.add.image(0,0,'map-'+place).setOrigin(0).setScale(2));
    if(isHub(place))this.solids.push(new Phaser.Geom.Rectangle(0,70,960,177),new Phaser.Geom.Rectangle(350,250,260,65),new Phaser.Geom.Rectangle(451,375,58,62));
    if(place==='kamakura'||place==='arashiyama')this.solids.push(new Phaser.Geom.Rectangle(330,94,270,178));
    if(place==='jr-stop')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,185));
    if(place==='kawaguchiko')this.solids.push(new Phaser.Geom.Rectangle(0,70,960,265));
    if(isHub(place))for(let i=0;i<9;i++){
      const commuter=this.add.image(94+i*87,352+(i%3)*58,'traveller-'+(i%2?'left':'right')+'-0').setOrigin(.5,.85).setScale(1.7).setTint([0xb5c7c0,0xc7baa0,0x8facae][i%3]);
      this.world.add(commuter);this.commuters.push(commuter);
    }
    this.marker=this.add.circle(0,0,9,0xf3d28e,.35).setStrokeStyle(2,0xffedb9).setVisible(false);this.world.add(this.marker);
    this.player=this.add.container(480,isHub(place)?490:410);this.world.add(this.player);
    this.sprite=this.add.image(0,0,'traveller-down-0').setOrigin(.5,.85).setScale(2);this.player.add(this.sprite);
    this.rect(0,0,960,70,0x263d39,this.hud);
    this.rect(0,66,960,2,0xb8ad83,this.hud);
    this.label(24,12,'寄り道 / JOURNAL DE VOYAGE',11,'#b6bd98',this.hud);
    if(place==='jr-stop'&&this.currentStation){this.label(348,176,this.currentStation.ja,24,'#f1e5ba');this.label(348,210,this.currentStation.en.toUpperCase(),13,'#cbd6b1');}
    this.label(24,32,this.currentStation?this.currentStation.en+' · Gare JR':places[place],18,'#f3dfb1',this.hud);
    this.button(548,14,108,40,'Billet',()=>this.showTicket(),this.hud);
    this.label(676,26,`${this.collected.size}/3 souvenirs`,12,'#cfceaa',this.hud);
    this.button(833,14,104,40,'Carnet',()=>this.album(),this.hud);
    this.rect(0,564,960,76,0x263d39,this.hud);this.rect(0,564,960,2,0xb8ad83,this.hud);
    this.label(24,582,'TOUCHEZ POUR EXPLORER',11,'#e6ce98',this.hud);
    this.label(24,605,'ou utilisez les flèches du clavier',10,'#aab69b',this.hud);
    this.prompt=this.label(297,589,'',13,'#fff0d4',this.hud);
    this.announcement=this.label(300,614,'',10,'#96aa95',this.hud);
    this.controls();
  }
  private button(x:number,y:number,w:number,h:number,text:string,fn:()=>void,parent:Phaser.GameObjects.Container){
    this.rect(x-2,y-2,w+4,h+4,0x9b9e7d,parent);this.rect(x,y+3,w,h,0x182f2c,parent);const b=this.rect(x,y,w,h,0x415c4f,parent).setInteractive({useHandCursor:true});this.label(x+w/2,y+h/2,text,16,'#fff0d4',parent).setOrigin(.5);b.on('pointerdown',fn);return b;
  }
  private controls(){
    this.button(802,581,134,43,'AGIR  ◎',()=>this.interact(),this.hud);
  }
  private nearby(){
    const {x,y}=this.player;
    if(isHub(this.place)){
      if(Phaser.Math.Distance.Between(x,y,480,335)<46)return 'staff';
      if(x<115&&y>455)return 'westExit';
      if(x>845&&y>455)return 'eastExit';
      if(Phaser.Math.Distance.Between(x,y,480,439)<83)return 'ticket';
      if(Phaser.Math.Distance.Between(x,y,200,300)<95)return 'local';
      if(Phaser.Math.Distance.Between(x,y,750,300)<95)return 'shinkansen';
    }else{
      if(x<240&&y<453)return 'return';
      if(this.place!=='jr-stop'&&Phaser.Math.Distance.Between(x,y,710,409)<95)return 'photo';
    }
    return '';
  }
  private dialog(title:string,body:string,choices:[string,()=>void][]=[]){
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);const c=this.add.container(0,0).setDepth(20);this.modal=c;
    this.rect(0,70,960,570,0x142e35,c).setAlpha(.76).setInteractive();this.rect(200,145,560,365,0xf0e6cb,c);this.rect(200,145,560,7,0xba654c,c);
    this.label(228,173,title,22,'#294a48',c);this.label(228,220,body,16,'#475b50',c).setWordWrapWidth(500);
    choices.forEach(([label,fn],i)=>this.button(228,320+i*54,504,44,label,fn,c));
    this.button(650,461,82,32,'Fermer',()=>{c.destroy(true);this.modal=null;},c);
  }
  private interact(){
    if(this.modal)return;
    switch(this.nearby()){
      case 'ticket':this.ticketTerminal();break;
      case 'local':case 'shinkansen':{
        const service=this.nearby() as Service;
        if(service==='local'&&this.place==='tokyo'&&this.ticket?.kind==='fare'){this.tokyoDepartures(this.ticket);break;}
        if(!this.ticket||this.ticket.from!==this.place||this.ticket.service!==service){
          this.dialog(service==='local'?'在来線 改札 / Portiques locaux':'新幹線 改札 / Portiques Shinkansen',this.ticket?this.ticket.kind==='fare'?'Ce billet est réservé aux lignes JR locales de Tokyo.':`Votre billet est pour le ${this.ticket.platform.toLowerCase()}.\nChoisissez le quai correspondant ou un autre billet.`:'Achetez votre billet à la borne au centre du hall.',[[service==='local'?'Voir les lignes locales':'Voir le Shinkansen',()=>this.ticketTerminal(service)]]);
        }else{
          const ticket=this.ticket;
          if(ticket.kind==='fare')break;
          const correct=service==='shinkansen'?(this.place==='tokyo'?'のぞみ / NOZOMI → KYOTO':'のぞみ / NOZOMI → TOKYO'):(ticket.to==='kamakura'?'横須賀線 / YOKOSUKA → KAMAKURA':ticket.to==='arashiyama'?'嵯峨野線 / SAGANO → SAGA-ARASHIYAMA':'中央線 / CHUO → FUJI (correspondances)');
          const decoy=service==='shinkansen'?'回送 / HORS SERVICE':this.place==='tokyo'?'品川止まり / TERMINUS SHINAGAWA':'反対方向 / DIRECTION KYOTO';
          this.dialog(ticket.platform+' · 発車案内',`Deux rames sont annoncées.\nBillet : ${ticket.to.toUpperCase()} · ${ticket.line}\nVérifiez la destination avant de monter.`,[
            [decoy,()=>this.dialog('Ce train ne convient pas',service==='shinkansen'?'Cette rame est hors service.\nVotre billet reste valable.':'Ce départ ne dessert pas votre destination.\nVotre billet reste valable.',[['Relire le panneau',()=>{this.modal?.destroy(true);this.modal=null;this.interact();}]])],
            [correct,()=>this.dialog(ticket.line,`${places[ticket.from]} → ${places[ticket.to]}\n${ticket.platform} · Départ confirmé.`,[['Monter dans le train',()=>{this.ticket=null;this.loadPlace(ticket.to);}]])]
          ]);
        }
        break;
      }
      case 'staff':this.stationHelp();break;
      case 'westExit':case 'eastExit':{
        const west=this.nearby()==='westExit';
        this.dialog(west?'西口 / Sortie ouest':'東口 / Sortie est',`Ce passage mène vers ${this.place==='tokyo'?(west?'Marunouchi et les bus':'Yaesu et les taxis'):(west?'Hachijo et les bus':'Karasuma et les taxis')}.\nCe n’est pas un accès aux trains.`,[['Consulter mon billet',()=>this.showTicket()]]);break;
      }
      case 'return':{
        const hub=returnHub(this.place);
        this.dialog('Retour à '+(hub==='tokyo'?'Tokyo':'Kyoto'),this.place==='jr-stop'?'Retour libre vers Tokyo pour ce prototype.':'Le retour local est inclus dans le billet excursion.',[['Revenir à la gare',()=>this.loadPlace(hub)]]);break;
      }
      case 'photo':this.collected.add(this.place);localStorage.setItem('yorimichi-memories',JSON.stringify([...this.collected]));this.dialog('Un souvenir dans votre carnet',`${places[this.place]}\n\nEmplacement réservé à votre future photo de voyage.\nLe souvenir est conservé sur cet appareil.`);break;
      default:this.dialog('Bienvenue au Japon','Touchez la carte pour vous déplacer.\nLes flèches fonctionnent aussi au clavier.\nAGIR, E ou Espace : interagir.\n\nBorne au centre : choisissez votre billet.\nRepérez les panneaux ou demandez à l’agent.');
    }
  }
  private showTicket(){
    if(!this.ticket){this.dialog('Votre pochette à billets','Aucun billet.\nCherchez la borne きっぷ dans le hall.\nL’agent au comptoir peut vous renseigner.');return;}
    const ticket=this.ticket;
    if(ticket.kind==='fare'){this.dialog('普通乗車券 / Billet à montant',`TOKYO → ¥${ticket.fare.toLocaleString('fr-FR')}\nJR · 1 adulte · Aller simple\nAucune destination choisie à l’achat.\nCherchez son tarif sur le plan de la borne.`);return;}
    this.dialog('乗車券 / Votre billet',`${ticket.from.toUpperCase()} → ${ticket.to.toUpperCase()}\n${ticket.line}\n${ticket.platform} · 1 adulte · ¥${ticket.fare.toLocaleString('fr-FR')}\n${ticket.reservation?ticket.reservation.day+' · '+ticket.reservation.train+' · '+ticket.reservation.seat:ticket.service==='local'?'Retour au hub inclus':'Shinkansen · aller simple'}`);
  }
  private stationHelp(){
    const hub=isHub(this.place)?this.place:'tokyo';
    const body=this.ticket?.kind==='fare'?`Votre billet JR vaut ¥${this.ticket.fare.toLocaleString('fr-FR')}.\nLe plan à la borne indique le prix de chaque gare.\nChoisissez ensuite votre trajet aux portiques locaux,\nà gauche. Un billet trop faible sera refusé.`:this.ticket?`Pour ${this.ticket.to.toUpperCase()}, cherchez ${this.ticket.platform}.\n${this.ticket.service==='local'?'Portiques 在来線, à gauche.':'Portiques 新幹線, à droite.'}\nSur le panneau, vérifiez aussi le nom de la ligne.\nLes sorties 西口 et 東口 mènent hors de la gare.`:`きっぷ : billets à la borne centrale.\n在来線 : lignes locales, ${platformFor(hub,'local')}, à gauche.\n新幹線 : Shinkansen, ${platformFor(hub,'shinkansen')}, à droite.\nLes grandes flèches jaunes indiquent aussi des sorties.`;
    const choices:[string,()=>void][]=[['Merci, je vais chercher',()=>{this.modal?.destroy(true);this.modal=null;}]];
    if(hub==='tokyo')choices.push(['Demander un indice de tarif',()=>this.tokyoFareHint()]);
    this.dialog('駅員 / Agent de gare',body,choices);
  }
  private tokyoFareHint(){
    this.stopNavigation();this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.departures?.destroy();this.departures=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    this.departures=openTokyoDepartures(station=>{close();this.dialog('駅員 / Indice de tarif',`Pour ${station.en}, cherchez ¥${station.fare}\nsur le plan au départ de Tokyo.\nLigne : ${station.line}.\nÀ vous de sélectionner le montant à la borne.`)},close,true);
  }
  private tokyoDepartures(ticket:FareTicket){
    this.stopNavigation();this.modal?.destroy(true);this.modal=this.add.container(0,0).setDepth(20);
    const close=()=>{this.departures?.destroy();this.departures=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys()};
    this.departures=openTokyoDepartures(station=>{
      close();
      if(ticket.fare<station.fare){
        this.dialog('運賃不足 / Montant insuffisant',`Vers ${station.en} : ¥${station.fare}.\nVotre billet : ¥${ticket.fare}.\nLe billet est conservé. Choisissez un autre montant.`,[['Retour à la borne',()=>this.ticketTerminal('local')]]);return;
      }
      this.dialog(station.line,`TOKYO → ${station.en.toUpperCase()}\nTarif : ¥${station.fare} · Billet : ¥${ticket.fare}\n${ticket.fare>station.fare?'Billet accepté. Le trop-payé ne sera pas remboursé.':'Le montant correspond.'}`,[['Monter dans le train',()=>{this.ticket=null;this.currentStation=station;this.loadPlace('jr-stop');}]]);
    },close);
  }
  private ticketTerminal(service:Service='local'){
    if(!isHub(this.place))return;
    const hub=this.place;
    this.stopNavigation();this.direction={x:0,y:0};this.modal?.destroy(true);this.machine?.destroy();this.hall?.destroy();this.machine=null;this.machineId=null;
    this.modal=this.add.container(0,0).setDepth(20);
    this.hall=new MachineHall(hub,service,(kind,id)=>{
      if(this.machine&&this.machineId===id){this.machine.resume();return;}
      this.machine?.destroy();this.machineId=id;
      this.machine=new TicketMachine(hub,kind,ticket=>{this.ticket=ticket},()=>{
        this.machine=null;this.machineId=null;this.hall?.resume();this.input.keyboard?.resetKeys();
      },{fixedService:true,lookAtWall:()=>{this.machine?.suspend();this.hall?.resume(true);}});
    },()=>{
      this.machine?.destroy();this.machine=null;this.machineId=null;this.hall=null;this.modal?.destroy(true);this.modal=null;this.input.keyboard?.resetKeys();
    });
  }
  private album(){this.dialog('Mon carnet de voyage',`SOUVENIRS COLLECTÉS · ${this.collected.size}/3\n\n${this.collected.has('kamakura')?'●':'○'} Kamakura · Les cerisiers du temple\n${this.collected.has('kawaguchiko')?'●':'○'} Kawaguchiko · Le reflet du Fuji\n${this.collected.has('arashiyama')?'●':'○'} Arashiyama · Le chemin des bambous\n\nLes vraies photos seront ajoutées dans une prochaine version.`);}
  private canWalk(x:number,y:number){
    return x>18&&x<942&&y>88&&y<548&&!this.solids.some(r=>Phaser.Geom.Intersects.RectangleToRectangle(r,new Phaser.Geom.Rectangle(x-10,y-10,20,25)));
  }
  private stopNavigation(){this.path=[];this.marker?.setVisible(false);}
  private navigate(x:number,y:number){
    // Search reachable ground so a tap on scenery stops beside the obstacle.
    const cols=58,rows=28,step=16;
    const point=(id:number)=>({x:24+(id%cols)*step,y:104+Math.floor(id/cols)*step});
    const start=Phaser.Math.Clamp(Math.round((this.player.y-104)/step),0,rows-1)*cols+Phaser.Math.Clamp(Math.round((this.player.x-24)/step),0,cols-1);
    const queue=[start],parents=new Map<number,number>([[start,-1]]);
    let best=start,distance=Infinity;
    for(let i=0;i<queue.length;i++){
      const id=queue[i],p=point(id),d=Phaser.Math.Distance.Squared(p.x,p.y,x,y);
      if(d<distance){best=id;distance=d;}
      for(const next of [id-1,id+1,id-cols,id+cols]){
        if(next<0||next>=cols*rows||parents.has(next))continue;
        const n=point(next);
        if(Math.abs(n.x-p.x)>step||!this.canWalk(n.x,n.y))continue;
        parents.set(next,id);queue.push(next);
      }
    }
    this.path=[];
    for(let id=best;id!==-1;id=parents.get(id)!)this.path.unshift(point(id));
    if(distance<step*step&&this.canWalk(x,y))this.path.push({x,y});
    const last=this.path[this.path.length-1];this.marker.setPosition(last.x,last.y).setVisible(true);
  }
  update(_time:number,delta:number){
    if(!this.player)return;
    if(isHub(this.place)){
      this.commuters.forEach((person,i)=>{person.x=90+((this.time.now*.017*(i%2?-1:1)+i*87)%780+780)%780;person.setTexture(`traveller-${i%2?'left':'right'}-${Math.floor(this.time.now/180+i)%3}`)});
      const announcements=['まもなく電車がまいります…','出口 Exit / 乗換 Transfer / 改札 Gates','足元の黄色い線までお下がりください'];
      this.announcement.setText(announcements[Math.floor(this.time.now/6500)%announcements.length]);
    }else this.announcement.setText('');
    if(this.modal)return;
    let x=this.direction.x,y=this.direction.y;if(this.keys.left.isDown)x=-1;if(this.keys.right.isDown)x=1;if(this.keys.up.isDown)y=-1;if(this.keys.down.isDown)y=1;
    if(x||y)this.stopNavigation();
    const speed=150*Math.min(delta,40)/1000;
    if(this.path.length){
      let target=this.path[0];
      while(target&&Phaser.Math.Distance.Between(this.player.x,this.player.y,target.x,target.y)<=speed){
        this.player.setPosition(target.x,target.y);this.path.shift();target=this.path[0];
      }
      if(target){x=target.x-this.player.x;y=target.y-this.player.y;}else this.stopNavigation();
    }
    const length=Math.hypot(x,y)||1;

    const nx=this.player.x+x/length*speed,ny=this.player.y+y/length*speed;
    if(this.canWalk(nx,this.player.y))this.player.x=nx;if(this.canWalk(this.player.x,ny))this.player.y=ny;
    this.moving=!!(x||y);this.walk+=delta;
    if(this.moving)this.facing=Math.abs(x)>Math.abs(y)?(x<0?'left':'right'):(y<0?'up':'down');
    this.sprite.setTexture(`traveller-${this.facing}-${this.moving?Math.floor(this.walk/130)%3:0}`);
    const messages:Record<string,string>={ticket:'◎ AGIR · Acheter un billet',local:'◎ AGIR · 在来線 改札',shinkansen:'◎ AGIR · 新幹線 改札',staff:'◎ AGIR · 駅員 / Agent',westExit:'◎ AGIR · 西口',eastExit:'◎ AGIR · 東口',return:'◎ AGIR · Retour à la gare',photo:'◎ AGIR · Garder un souvenir'};
    this.prompt.setText(messages[this.nearby()]||'Un détour, un souvenir.');
  }
}
export const game = new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:640,backgroundColor:'#91ab78',pixelArt:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Journey});
