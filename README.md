# Yorimichi · 寄り道

Prototype original de carnet de voyage jouable au Japon, en vue du dessus. Phaser 3, TypeScript et Vite. Décors et personnages dessinés par le code, sans asset externe. Cartes en 480 × 320 pixels agrandies sans lissage ; voyageur animé dans quatre directions.

## Développement

Node.js 22.12+ (validé avec Node 24).

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

`npm run build` vérifie TypeScript puis produit `dist/`. `npm run preview` sert la compilation.

## Jouer

Touchez/cliquez un endroit de la carte pour y marcher, ou utilisez les flèches du clavier. **AGIR**, **E** ou **Espace** permet d'interagir. Téléphone conseillé en paysage.

Le jeu commence dans la gare de **Tokyo**. La borne centrale permet de choisir entre deux machines redessinées depuis les photos officielles JR West : bleue pour les trajets locaux, verte pour le Shinkansen. Appuyez sur **English** si nécessaire. Local : **Purchase Ticket → Cash · IC Card → tarif**, ou recherche par nom de gare. Shinkansen : destination → date → 1 adulte → train → préférence de siège. Vérifiez, confirmez, puis utilisez les touches de monnaie pour simuler le paiement et récupérez le billet. Rejoignez ensuite le quai indiqué, lisez le panneau des départs et choisissez la rame qui dessert votre destination avant de confirmer l’embarquement.

| Départ | Destination | Service | Quai |
| --- | --- | --- | --- |
| Tokyo | Kyoto | Shinkansen Tokaido | 19, à droite |
| Kyoto | Tokyo | Shinkansen Tokaido | 11, à droite |
| Tokyo | Kamakura | Yokosuka | 3, à gauche |
| Tokyo | Kawaguchiko | Excursion Fuji avec correspondances | 3, à gauche |
| Kyoto | Arashiyama | Sagano | 33, à gauche |

Les deux hubs ont leur propre hall, trains, portiques, panneaux de départ, borne, kiosque et consignes. Le mauvais quai ne permet pas d'utiliser le billet. Un nouvel achat remplace le billet actif uniquement après confirmation ; annuler le conserve. Le Shinkansen est un aller simple, et chaque excursion locale inclut le retour vers son hub d'origine via le panneau **GARE**.

Les itinéraires sont simplifiés, les tarifs fictifs et les horaires décoratifs : aucun paiement réel ni simulation d'horaires. L'excursion Fuji représente un trajet avec correspondances et non une ligne locale directe depuis Tokyo.

Approchez un appareil photo et utilisez AGIR pour collecter l'un des trois souvenirs. **Carnet** affiche les souvenirs conservés en localStorage sur cet appareil. Les images sont des emplacements temporaires ; l'import de photos personnelles n'est pas implémenté. Aucun serveur, compte ou secret requis.

## Se repérer dans les gares

Panneaux majoritairement japonais, annonces visuelles tournantes, foule animée, indications de sortie et de correspondance se superposent. Les numéros de quai sont fictifs mais cohérents entre la borne, le billet et la signalétique : Tokyo 3/19, Kyoto 33/11. Les panneaux métro/transfert représentent des indications d’ambiance ; le métro n’est pas encore jouable.

Le bouton **Billet** permet de relire destination, ligne et quai. L’agent **駅員**, devant le tableau central, explique le chemin selon le billet détenu. Les sorties latérales ouvrent une description du quartier et ne téléportent pas le joueur. Les mauvaises rames (hors service, terminus avant destination ou direction inverse) donnent un message puis permettent de relire le panneau sans consommer le billet. Aucune limite de temps ni pénalité. Les annonces sont visuelles, sans audio.

## Borne documentée et export téléphone

Voir [REFERENCES.md](REFERENCES.md) pour les sources officielles et les adaptations du prototype. Les photos servent de références ; elles ne sont pas chargées par le jeu. La borne fonctionne hors ligne avec ses écrans redessinés en HTML/CSS. Les réservations Shinkansen conservent la date, le train et la préférence de siège sur le billet consultable. Le rendu de monnaie est calculé ; une insertion insuffisante n’émet pas de ticket. Annuler conserve le billet précédent. **Échap** ferme la borne ; les contrôles du jeu restent suspendus pendant l’achat.

`npm run build:mobile` produit `dist/yorimichi-mobile.html`, un fichier autonome contenant le jeu, ses scripts et son style. Ouvrir en paysage sur téléphone pour lire confortablement la borne. Pour choisir un autre chemin d’export après compilation : `node scripts/export-mobile.mjs /chemin/yorimichi-mobile.html`.
