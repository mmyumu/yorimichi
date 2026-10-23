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

Touchez/cliquez la carte pour marcher en contournant les bâtiments, ou utilisez les flèches du clavier. **AGIR**, **E** ou **Espace** permet d'interagir. Téléphone conseillé en paysage. **Billet** permet de consulter le billet détenu ; **Carnet** affiche les trois souvenirs photo collectables dans les excursions.

## Plan et billets JR Tokyo

Le jeu commence dans le hall de Tokyo. Agir près de la borne centrale ouvre une **vue de face devant les distributeurs** ; le joueur commence devant une borne de billets locaux. Utiliser la borne sélectionnée ouvre son écran. Celui-ci reprend l'apparence bleue des machines ordinaires documentées par JR West, avec le japonais par défaut et le bouton **English**.

1. Choisir **Purchase Ticket → Cash · IC Card**.
2. Lever les yeux vers le **grand plan mural**, qui contient 30 gares JR et leurs montants au départ de Tokyo. **Regarder le plan mural**, depuis l’écran de la borne, suspend l’achat pour consulter le panneau au-dessus des machines. Glisser pour tourner la tête, se décaler pour lire une autre partie et utiliser **+ / −** pour approcher/reculer.
3. Lire le prix de sa gare, puis **Regarder les bornes → Utiliser cette borne**. Revenir à la même machine conserve la sélection et l’étape d’achat. Les **16 montants du plan** sont tous achetables, de ¥160 à ¥2,420.
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

Une scène en perspective, redessinée avec un mur carrelé, éclairage, grand panneau tarifaire et cinq machines physiques : billets locaux, recharge IC, billets locaux, recharge IC, Shinkansen. Les photos de référence fournies servent à l’agencement ; elles ne sont pas intégrées au jeu. Le plan mural est une nouvelle mise en page large des mêmes 30 gares et montants, sans ajouter de données tarifaires.

- **Téléphone** : glisser sur le décor pour tourner la tête ; maintenir **Se décaler ← / →** pour marcher latéralement. **Regarder le plan / Regarder les bornes** recentre le regard ; **+ / −** rapproche ou éloigne du mur.
- **Souris et clavier** : cliquer-glisser pour regarder, flèches gauche/droite ou A/D pour se décaler, haut/bas ou W/S pour lever/baisser le regard. Molette : distance ; Maj + molette ou défilement horizontal : déplacement latéral. E/Espace devant la scène utilise la borne sélectionnée ; Échap revient au hall.
- **Manette standard** : stick gauche horizontal pour se décaler, vertical pour la distance ; stick droit pour tourner la tête. A utilise la machine, B revient en arrière. Dans l’écran d’achat, croix/stick gauche déplace le focus, A valide le bouton et B revient devant les machines. Ces commandes ont été vérifiées par entrées simulées dans Chromium, sans validation d’une manette physique.

Les deux machines roses **チャージ専用** demandent une carte IC. Le joueur n’en possède pas : aucun rechargement, débit ou achat de carte n’est possible. L’achat éventuel d’une carte est indiqué comme futur et désactivé.

L’achat reste suspendu quand on regarde le plan et reprend à la même borne. Choisir une autre machine recommence son propre écran ; un billet déjà émis reste conservé. Annuler ou prendre le billet ramène devant les distributeurs ; **Retour au hall** restaure l’exploration en vue du dessus. À Kyoto, cette vue montre une signalétique locale simple et non le plan tarifaire de Tokyo.
