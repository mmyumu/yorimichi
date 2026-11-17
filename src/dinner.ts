/** Jennifer's dinner: asked on the phone, she gives a time to meet her and Mike in front of Miyamaedaira Station, on the Den-en-toshi Line; they lead the way to a yakiniku,
 * all you can eat for ninety minutes, where a waiter brings the plates and the cuts sizzle on the table's grill; after the meal Mike takes out his card game, 焦がすな! (card-game.ts),
 * played at the table. Its place is drawn in dinner-art.ts, every line said is in dinner-lines.ts; main.ts runs it (`Journey.outing`, `who` 'jennifer'), as it runs Namiko's outing (outing.ts).
 * Only her `Plan` is kept, in the phone's save: the dinner itself starts again in front of the station after a reload. */
import type { Invite } from './outing';
import { phoneLines } from './dinner-lines';

export const askJennifer=phoneLines.ask;
/** Dinner at 18:30 in front of Miyamaedaira's north exit (its west side), or an hour from asking until 20:30; they wait until 22:30. */
export const dinner:Invite={meetAt:'miyamaedaira',first:18*60+30,latest:20*60+30,until:22*60+30};
