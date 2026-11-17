/** Everything said during Jennifer's dinner (dinner.ts, run by main.ts), in the order it happens, to rewrite freely: as outing-lines.ts for Namiko's outing.
 * Face to face, each entry is one speaker's turn: a list of pages, each shown in the talk box at the foot of the screen (a page holds about two lines; a click goes on to the next).
 * The texts sent on the phone are a single message each. The `${…}` bits are filled in by the game; keep them, or drop them where the line no longer needs them.
 * A turn can be split into more pages, or one page added or removed, without touching anything else; a new turn (another speaker in between) needs a line in main.ts. */

/** On the phone. */
export const phoneLines={
  /** What the traveller sends (the suggestion bubble in Jennifer's conversation). */
  ask:'Hi Jenn! Want to meet up while I’m in Japan?',
  /** Her answer: `when` is "today" or "tomorrow", `time` like "18:30", `exit` the exit's name (North Exit). */
  answer:(when:string,time:string,exit:string)=>`YES! Mike and I know the best all-you-can-eat yakiniku place. Miyamaedaira, ${exit}, ${when} at ${time}! It’s on the Den-en-toshi Line from Shibuya. We’ll wait for you until 22:30, no rush.`,
  /** The traveller never came (22:30 that day); they can ask again. */
  missed:'We waited at Miyamaedaira but Mike got too hungry and ate a whole konbini. Rain check? Text me anytime!',
  /** A while after the goodbye, with no game played. */
  afterDinner:'That was so fun!! Mike says next time you HAVE to play his card game.',
  /** A while after the game: `won` is true if the traveller won (or shared the win). */
  afterGame:(won:boolean)=>won?'Mike is still talking about how you beat him at his own game. Rematch soon!':'Mike says thank you for “donating” your points. He’s unbearable now. Come back soon!',
};

/** In front of Miyamaedaira Station. */
export const meeting={
  /** `late`: true when the traveller comes more than ten minutes after the time she gave. */
  jennifer:(late:boolean)=>[`${late?'There you are! We were about to send a search party! ':'Hey, you made it! '}Welcome to the suburbs!`,'This is Mike. Mike, this is the friend I told you about!'],
  mike:['Nice to meet you! Hope you came hungry, because I definitely did.'],
  /** Then they lead the way. */
  jenniferThen:['The place is right around the corner. Ninety minutes, all you can eat. We take this very seriously.','Come on, follow us!'],
};

/** In the yakiniku. */
export const restaurant={
  /** As they come in, before the traveller sits down. */
  arrive:['This is our table! Grab a seat.'],
  /** Sat down (Jennifer, then Mike). */
  order:['I’m ordering on the tablet: kalbi, skirt steak, pork jowl, tongue… and veggies, Mike.'],
  orderMike:['Veggies are a waste of grill space. But okay, for you.'],
  /** The waiter brings the plates and the drinks. */
  waiter:['お待たせしました! Enjoy!'],
  /** The meat on the grill (Mike, then Jennifer). */
  grillMike:['Okay, rule number one: don’t walk away from the grill. Rule number two: these tongs are for raw meat only.','In the Philippines we grill outside, with a fan and a lot of smoke. Here the table eats the smoke. Amazing.'],
  grillJennifer:['Ninety minutes go by fast. Eat now, talk later!'],
  /** Shown on the screen during the time skip. */
  later:'An hour and a half later…',
  /** After the meal: Jennifer, then Mike, who takes out his game; the two choices follow Jennifer's question. */
  full:['I can’t move. I’m going to live here now.'],
  game:['Okay, nobody leaves yet. *unzips backpack* I brought 焦がすな!, “Don’t burn it!”','It’s a little card game I got at Game Market. Yakiniku card game after yakiniku. Perfect, right?'],
  ask:['He’s been waiting all dinner to bring it out. Play a round with us?'],
  askChoices:['Let’s play!','Maybe next time'] as const,
  /** Talking to them, or heading for the door, before or after the meal: `atTable` while the meal has not started. The two choices follow. */
  leaving:(atTable:boolean)=>[atTable?'Wait, you’re leaving before the meat? Are you sure?':'Heading out already?'],
  leaveChoices:['Time to go','Not yet'] as const,
};

/** The card game (card-game.ts), before and after. */
export const cardGame={
  /** Before the cards come out (Mike). */
  rules:['Easy: flip cards onto the grill. Same cut twice and it all burns. Stop before that and you eat it.','Tongs save you once. Sauce is a bonus. First past 35 wins.'],
  /** After: who won. `you`: the traveller (alone or tied), else Jennifer's or Mike's win. */
  you:['Beginner’s luck. Definitely beginner’s luck.'],
  youJennifer:['Ha! Somebody finally beat Mike at his own game!'],
  jennifer:['Careful wins it again! Slow and steady, baby.'],
  jenniferMike:['She always does that. She stops at like eight points and still wins.'],
  mike:['YES! The grill master remains undefeated!'],
  mikeJennifer:['He’s going to be like this all week. Thanks a lot.'],
  /** Left the game before the end (Jennifer). */
  quit:['Haha, fair, it’s getting late. We’ll finish it next time!'],
};

/** The goodbye at the table (Jennifer, then Mike), after the game or without it; `late` is true from 22:00. */
export const goodbye={
  jennifer:(late:boolean)=>[`${late?'Oh wow, it’s late! ':''}Dinner’s on us tonight: you’re the guest!`,'Thanks for coming all the way out to Miyamaedaira. Have the best trip!'],
  mike:['Next time, rematch. And I bring the bigger game.'],
};
