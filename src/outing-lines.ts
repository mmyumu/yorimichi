/** Everything said during Namiko's outing (outing.ts, run by main.ts), in the order it happens, to rewrite freely.
 * Face to face, each entry is one speaker's turn: a list of pages, each shown in the talk box at the foot of the screen (a page holds about two lines; a click goes on to the next).
 * The texts sent on the phone are a single message each. The `${…}` bits are filled in by the game (a time, a day…); keep them, or drop them where the line no longer needs them.
 * A turn can be split into more pages, or one page added or removed, without touching anything else; a new turn (another speaker in between) needs a line in main.ts. */

/** On the phone. */
export const phoneLines={
  /** What the traveller sends (the suggestion bubble in Namiko's conversation). */
  ask:'Hi Namiko! Are you free one of these days?',
  /** Her answer: `when` is "today" or "tomorrow", `time` like "13:30", `exit` the exit's name (西口). */
  answer:(when:string,time:string,exit:string)=>`Yes! Lilly and I would love to. Let’s eat together in Tachikawa: meet us in front of the station, ${exit}, ${when} from ${time}. We’ll wait for you there until the evening, so take your time! It’s on the Chuo Line, past Kichijoji.`,
  /** The traveller never came (21:00 that day); they can ask again. */
  missed:'We waited for you in front of Tachikawa Station all day, but Lilly got tired… Another time! Just send me a message.',
  /** A while after the goodbye at the restaurant (no ice cream). */
  afterLunch:'Thank you for lunch! Lilly keeps talking about the cat robot.',
  /** A while after the concert. */
  afterConcert:'Lilly fell asleep on the train, humming the waltz. Thank you for today!',
};

/** In front of Tachikawa Station. */
export const meeting={
  /** `late`: true when the traveller comes more than ten minutes after the time she gave. */
  namiko:(late:boolean)=>[`There you are!${late?' You made it!':''} Welcome to Tachikawa.`,'This is Lilly, my daughter. Say hello, Lilly!'],
  lilly:['Hello! I’m six. Are you really from the other side of the world?'],
  /** Then they lead the way. */
  namikoThen:['We’re starving. There’s a shabu-shabu place just round the corner: all you can eat, and a robot brings the plates!','Follow us, it’s this way.'],
};

/** In the shabu-shabu restaurant. */
export const restaurant={
  /** As they come in, before the traveller sits down. */
  arrive:['Here we are! This is our table.','Have a seat: I’ll order on the tablet.'],
  /** Sat down (Namiko). */
  order:['Ninety minutes, all you can eat! Beef, pork, and the vegetables from the bar.','I’ve ordered on the tablet. Look, here it comes!'],
  /** The robot brings the plates (Lilly, then Namiko). */
  robotLilly:['Nyaa! It’s a cat! Thank you, robot!'],
  robotNamiko:['You take a slice and swish it in the broth: shabu, shabu. That’s where the name comes from.','The red side is spicy. Lilly sticks to the other one!'],
  /** Shown on the screen during the time skip. */
  later:'An hour and a quarter later…',
  /** After the meal: Namiko, Lilly, Namiko, Lilly. */
  full:['Ahh… I can’t eat another bite.'],
  wish:['Mama! Ice cream! There’s a machine, I saw it!'],
  sigh:['Lilly… you’ve eaten so much already.'],
  please:['Pleeease?'],
  /** Talking to Namiko, or heading for the door, before the ice cream: `atTable` while the meal has not started. The two choices follow. */
  leaving:(atTable:boolean)=>[atTable?'Oh, you’re leaving already?':'Lilly, we’ll see… Shall we go?'],
  leaveChoices:['Time to go','Not yet'] as const,
};

/** The cone given to Lilly (Lilly, then Namiko asking the traveller along); `evening` is true from 17:00. */
export const iceCream={
  lilly:['Yaaay! Thank you! It’s the best one ever!'],
  namiko:(evening:boolean)=>['You spoil her… Thank you, really.',`Say, there’s a vineyard just up the road. ${evening?'This evening':'This afternoon'} there’s a little concert under the vines. Come with us!`],
};

/** No ice cream: the goodbye at the restaurant (Namiko, then Lilly). */
export const goodbye={
  namiko:['Today is my treat! Thank you for coming all the way to Tachikawa.','Lilly, say goodbye!'],
  lilly:['Bye bye!'],
};

/** Under the vines. */
export const vineyard={
  /** Arriving, just before the music (Namiko, then Lilly). */
  namiko:['Just in time: it’s about to start!'],
  lilly:['Look, grapes! Grapes everywhere, over our heads!'],
  /** After the concert; `late` is true from 18:00. */
  namikoAfter:(late:boolean)=>['That was lovely…',`Thank you for today, and for the ice cream. ${late?'It’s getting late: ':''}Lilly and I should head home now.`,'See you soon! Have a wonderful trip.'],
  lillyAfter:['Bye bye! Come back to Tachikawa!'],
};
