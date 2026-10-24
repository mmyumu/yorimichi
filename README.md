# Yorimichi · 寄り道

Prototype original de carnet de voyage jouable au Japon, en vue du dessus. Phaser 3, TypeScript et Vite. Décors et personnages dessinés par le code, sans asset externe. Cartes en 480 × 320 pixels agrandies sans lissage ; voyageur animé dans quatre directions.

## Développement

Node.js 22.12+ (validé avec Node 24).

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

`npm run build` vérifie TypeScript puis produit `dist/`. `npm run preview` sert la compilation. Aucun serveur applicatif, compte ou secret requis.

## Commandes

Touchez/cliquez la carte pour marcher en contournant les bâtiments ; touchez/cliquez un élément (borne, agent, portiques, sorties, panneau de retour, appareil photo) pour vous y rendre et l’utiliser. Au clavier, les flèches ou **ZQSD** (les touches à la même place sur tous les claviers : WASD en QWERTY ou en japonais) déplacent le personnage et **E**, **Espace** ou **Entrée** interagit. À la manette, stick gauche ou croix pour marcher, **A** pour interagir, **X** pour le billet, **Y** pour le carnet ; dans les dialogues et le tableau des départs, la croix choisit, **A** valide et **B** ferme. Ce qui est à portée s’entoure d’un cadre jaune. Téléphone conseillé en paysage. **Billet** permet de consulter le billet détenu ; **Carnet** affiche les trois souvenirs photo collectables dans les excursions.

## Plan et billets JR Tokyo

Le jeu commence dans le hall de Tokyo. Agir près de la borne centrale ouvre une **vue de face devant les distributeurs** ; le joueur commence devant une borne de billets locaux. Utiliser la borne sélectionnée ouvre son écran. Celui-ci reprend l'apparence bleue des machines ordinaires documentées par JR West, avec le japonais par défaut et le bouton **English**.

1. Choisir **Purchase Ticket → Cash · IC Card**.
2. Lever les yeux vers le **grand plan mural**, qui contient 30 gares JR et leurs montants au départ de Tokyo. **Regarder le plan mural**, depuis l’écran de la borne, suspend l’achat pour consulter le panneau au-dessus des machines. Glisser pour tourner la tête, se décaler pour lire une autre partie, molette ou haut/bas pour approcher/reculer. Quand on lève les yeux vers lui, le plan s’entoure de jaune : un clic, **E** ou **A** l’ouvre en grand (« lire les gares »).
3. Lire le prix de sa gare, puis baisser les yeux et cliquer (ou toucher) la machine : elle s’illumine au survol, s’ouvre si l’on se tient devant, et sinon on se déplace jusqu’à elle. **E** ou **A** font de même avec la machine en face, entourée de jaune. Revenir à la même machine conserve la sélection et l’étape d’achat. Les **16 montants du plan** sont tous achetables, de ¥160 à ¥2,420.
4. Confirmer le montant et insérer de la monnaie simulée. Un dépôt insuffisant n'émet pas de billet ; le surplus est rendu.
5. Récupérer le ticket imprimé, par exemple **TOKYO → ¥260**. Il n'a pas de destination présélectionnée.
6. Aux portiques locaux à gauche, choisir la gare de descente. Si le prix est insuffisant, le trajet est refusé et le billet conservé. Un billet suffisant est accepté ; un trop-payé ne sera pas remboursé.

La recherche par nom a été retirée de la borne pour faire de la lecture du plan une partie du jeu. L'agent **駅員**, au comptoir central, propose un **indice de tarif** facultatif sur demande. Cet indice n'achète ni ne remplit de billet.

Les 30 gares du schéma sont représentées à l'arrivée par un même décor de quai, portant le nom de la gare. Le panneau **TOKYO** permet un retour gratuit pour faciliter l'exploration dans ce prototype. Ces quais ne sont pas encore des quartiers explorables ou de nouveaux souvenirs photo.

Le plan est **JR uniquement**, sans métro ni réseau privé. Il reproduit les 30 gares d'un schéma officiel JR East, pas l'intégralité des gares de Tokyo. Les montants de référence sont ceux proposés pour 2026 dans un document publié en décembre 2024 : leur validité en temps réel n'est pas vérifiée. Voir [REFERENCES.md](REFERENCES.md) pour la source et les adaptations.

## Shinkansen et excursions

Se décaler à droite dans la rangée permet de rejoindre la machine verte **Shinkansen** : destination → date → 1 adulte → train → préférence de siège → confirmation → monnaie simulée → billet. La réservation conserve les choix sur le billet. Les fonctions IC, QR, recharge, cartes bancaires et réception de réservations sont visibles mais désactivées.

Le menu **Prototype excursions**, à l'accueil de la borne locale Tokyo, conserve les anciennes excursions Kamakura/Fuji avec leurs tarifs fictifs et leurs billets liés à une destination. Le Fuji n'est pas intégré au plan JR : il implique un parcours avec correspondances et une compagnie privée.

| Départ | Destination | Billet | Quai fictif |
| --- | --- | --- | --- |
| Tokyo | 30 gares du plan JR | Montant au choix, sans destination | 3, à gauche |
| Tokyo | Kyoto | Shinkansen, aller simple | 19, à droite |
| Kyoto | Tokyo | Shinkansen, aller simple | 11, à droite |
| Tokyo | Kamakura / Kawaguchiko | Excursion du prototype | 3, à gauche |
| Kyoto | Arashiyama | Excursion Sagano | 33, à gauche |

Pour les billets Shinkansen et excursion, le mauvais quai ou une mauvaise rame ne consomme pas le billet. Chaque excursion inclut un retour à son hub d'origine via le panneau **GARE**. Les quais, horaires, réservations et tarifs de ces trajets restent fictifs ou simplifiés pour le jeu ; aucune transaction réelle.

## Se repérer et garder des souvenirs

Les hubs ont halls, trains, portiques, panneaux de départ, borne, kiosque et consignes. Panneaux majoritairement japonais, annonces visuelles et foule animée créent un sentiment de confusion. Les sorties latérales décrivent le quartier et ne téléportent pas le joueur. Le métro représenté par la signalétique est décoratif et n'est pas jouable. Pas de limite de temps, de pénalité ou d'audio.

À Kamakura, Kawaguchiko et Arashiyama, approcher l'appareil photo et agir pour collecter un souvenir. Ils persistent en localStorage sur cet appareil. Les images sont des emplacements temporaires ; l'import de photos personnelles n'est pas implémenté.

## Export téléphone

`npm run build:mobile` produit `dist/yorimichi-mobile.html`, un fichier autonome contenant le jeu, ses scripts, son plan SVG et ses styles. Il n'a pas besoin de charger de fichiers externes. Ouvrir en paysage sur téléphone pour lire confortablement la borne.

Pour choisir un autre chemin d'export après compilation : `node scripts/export-mobile.mjs /chemin/yorimichi-mobile.html`.

## Vue devant les machines

Une scène en vue subjective, rendue en 3D avec three.js en basse résolution puis agrandie sans lissage pour garder les pixels du reste du jeu : un morceau de gare autour d’un mur carrelé, grand panneau tarifaire et cinq machines encastrées dans une façade claire (grand panneau lumineux japonais/anglais au-dessus de chacune, écran incliné, bloc de paiement avec fentes carte/Suica, billets de banque, tickets et monnaie rendue, monnayeur, pavé numérique, lecteur QR et bac, rebord métallique), toutes les textures étant dessinées en code avec la palette du jeu. Le plan tarifaire et les panneaux des machines restent nets ; les blocs de paiement sont en pixel art à double densité, affichés hors du rendu basse résolution pour rester lisibles. Autour, la gare continue pour qu’on ne voie jamais le décor finir : piliers carrelés, plafond sombre à néons, bande podotactile jaune, panneaux suspendus (きっぷうりば, 中央改札, みどりの窓口), affiches de voyage pour Kamakura, Kawaguchiko et Arashiyama, tourniquets d’accès à gauche, guichet みどりの窓口 à droite, passants qui vont et viennent ; une brume légère efface le fond. On peut s’approcher davantage des bornes, et reculer seulement de quelques pas. Les écrans des bornes et l’avis de recharge IC utilisent un habillage pixel (police DotGothic16, bords francs, biseaux) : billets locaux, recharge IC, billets locaux, recharge IC, Shinkansen. Les photos de référence fournies servent à l’agencement ; elles ne sont pas intégrées au jeu. Le plan mural présente les mêmes 30 gares tarifées sous forme de réseau coloré, avec les noms de gares en japonais uniquement, composé comme les panneaux JR East au-dessus des machines : boucle Yamanote au centre, flèche rouge sur Tokyo, légende et liste des montants à gauche. Une police japonaise est embarquée pour que le plan reste lisible hors ligne ; aucun nouveau tarif n’a été ajouté.
La Yamanote forme une boucle fermée avec ses 30 arrêts. Le plan affiche aussi les noms des arrêts intermédiaires des lignes autour de Tokyo, relevés sur le plan officiel JR East. Le panneau se parcourt de près pour les lire. Les montants restent limités aux 30 gares tarifées de la référence JR East.

- **Téléphone** : glisser sur le décor pour tourner la tête ; toucher une machine pour s’y rendre puis l’utiliser, toucher le plan pour le lire. Il n’y a plus de boutons sous la vue.
- **Lecture du plan** : cliquer le plan (ou E / A en le regardant) ouvre le SVG en grand avec tous les noms visibles. Le menu permet de n’afficher les petits noms que d’une ligne pour faciliter la lecture. Touchez un repère pour lire son nom et, lorsqu’il est documenté, son tarif. Faites glisser le plan et utilisez **+ / −** pour zoomer ; **Fermer** ou Échap ramène devant les machines.
- **Souris et clavier** : cliquer-glisser pour regarder, flèches gauche/droite ou Q/D pour se décaler, haut/bas ou Z/S pour s’approcher/s’éloigner, R/F ou Page précédente/suivante pour lever/baisser les yeux (touches lues par position : WASD sur un clavier QWERTY ou japonais). Molette : distance ; Maj + molette ou défilement horizontal : déplacement latéral. E/Espace utilise la borne en face, ou ouvre le plan si on le regarde ; Échap revient au hall.
- **Manette standard** : stick gauche horizontal pour se décaler, vertical pour la distance ; stick droit pour tourner la tête. A utilise la machine en face, ou ouvre le plan si on le regarde ; B revient en arrière. Dans l’écran d’achat, croix/stick gauche déplace le focus, A valide le bouton et B revient devant les machines. Ces commandes ont été vérifiées par entrées simulées dans Chromium, sans validation d’une manette physique.

Les deux machines roses **チャージ専用** demandent une carte IC. Le joueur n’en possède pas : aucun rechargement, débit ou achat de carte n’est possible. L’achat éventuel d’une carte est indiqué comme futur et désactivé.

L’achat reste suspendu quand on regarde le plan et reprend à la même borne. Choisir une autre machine recommence son propre écran ; un billet déjà émis reste conservé. Annuler ou prendre le billet ramène devant les distributeurs ; **Retour au hall** restaure l’exploration en vue du dessus. À Kyoto, cette vue montre une signalétique locale simple et non le plan tarifaire de Tokyo.
