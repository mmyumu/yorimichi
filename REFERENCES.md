# Références de la borne

Consultées le 22 octobre 2026.

Source officielle : [JR West — How to use a ticket vending machine](https://www.westjr.co.jp/global/en/howto/ticket-vending-machine/).

## Billets locaux

La section « Purchasing tickets » montre les machines ordinaires bleues. La disposition redessinée reprend le fond bleu/cyan, les touches claires en relief, le changement de langue en haut, l’annulation rouge en bas, le retour jaune et les touches de tarifs.

- `img_vending_machines_03.webp` : choix de langue, japonais par défaut.
- `img_vending_machines_04.webp` : achat de tickets, cartes IC, recharge/historique et billet de quai.
- `img_vending_machines_05.webp` : choix du mode de paiement.
- `img_vending_machines_06.webp` : recherche de gare et grille de tarifs.
- `img_vending_machines_07.webp` et `08` : recherche et choix de la gare, décrits dans le guide.
- `img_vending_machines_09.webp` : insertion de monnaie.

Les photos sont accessibles sous `https://www.westjr.co.jp/travel-information/assets/img/train-usage-guide/howto/ticket-vending-machine/`.

## Shinkansen et express

La section « Shinkansen / limited express tickets » montre les machines vertes : écran blanc, bandeau gris, catégories de billets sur touches grises/violettes et confirmation verte. L’exemple du guide réserve un express HARUKA ; le jeu adapte ce parcours documenté à ses trajets Tokyo–Kyoto.

- `img_shinkansen_03.webp` et `04` : langue et catégories de billets.
- `img_shinkansen_05.webp` : choix de la gare d’arrivée.
- Étapes 06–10 décrites dans le guide : date, passagers, train/classe et siège.
- `img_shinkansen_11.webp` : confirmation avec trajet à gauche et tableau à droite.
- `img_shinkansen_12.webp` : espèces ou carte ; seul le paiement simulé en espèces est jouable.

## Adaptations explicites

Les écrans sont redessinés en HTML/CSS, sans incorporer de photos ou de logos JR. Ils reprennent ces modèles documentés de JR West, également utilisés dans le hub Tokyo du jeu : ce n’est pas une reproduction de toutes les variantes JR East ou JR Central. Les gares, tarifs, quais, trains et horaires restent ceux du prototype. Les fonctions IC, QR, recharge et réception de réservations sont visibles mais désactivées. Une personne, classe ordinaire ; choix de préférence de siège sans plan de voiture. Le jeu utilise un billet unique et un total simplifié, plutôt que les différents titres et suppléments ferroviaires réels. Le Shinkansen conserve la date, le train et la préférence de siège dans le billet. Aucune réservation ni transaction réelle, aucun horaire réel.

## Plan tarifaire JR au départ de Tokyo

Source officielle consultée le 23 octobre 2026 : [JR East, 6 décembre 2024 — demande de révision des tarifs](https://www.jreast.co.jp/press/2024/20241206_ho02.pdf), page 12, figure 2-1 « 東京駅起点の普通旅客運賃（現改比較） ».

Le schéma de jeu est redessiné en SVG à partir des 30 gares de cette figure. Les montants retenus sont ceux de la **ligne supérieure proposée pour 2026**, billets papier adultes (les montants IC entre parenthèses sont exclus). Les 16 montants distincts sont 160, 200, 210, 260, 350, 440, 530, 620, 720, 810, 910, 1040, 1230, 1600, 2090 et 2420 yens.

Il s’agit d’un **plan JR simplifié de référence pour le prototype**, pas du réseau JR complet ni d’une vérification des tarifs effectivement en vigueur en octobre 2026 : la source consultée reste une demande publiée en 2024. Le plan comporte exclusivement les gares JR représentées dans ce document. Aucun métro, réseau privé ou Shinkansen n’y est ajouté. Les positions et les tracés sont schématiques, et ne constituent pas un calculateur d’itinéraires.

Le billet JR Tokyo est désormais un montant, sans destination attribuée. La destination est choisie après achat ; un montant insuffisant conserve le billet et refuse le trajet, un montant suffisant permet l’arrivée sur un quai générique de la gare choisie. Le surplus éventuel n’est pas remboursé. Un retour gratuit vers Tokyo est prévu uniquement pour faciliter l’exploration dans ce prototype. La recherche par nom a été retirée de la borne ; l’agent de gare peut donner un indice de tarif sur demande.

Les anciennes excursions Kamakura/Fuji et leurs tarifs fictifs restent dans un menu séparé **Prototype excursions**. Elles ne sont pas présentées comme des tarifs du plan JR ; en particulier la portion Fujikyu n’appartient pas au réseau JR.

## Rangée de machines et plan mural

Les trois photos fournies par l’utilisateur le 23 octobre 2026 ont servi de référence pour la disposition physique : panneau tarifaire large au-dessus des distributeurs, enseignes vertes de billets et roses **チャージ専用**, plusieurs machines voisines. Les photos et leurs filigranes ne sont pas intégrés au jeu. La scène est dessinée en HTML/CSS avec une perspective et des mouvements séparés du corps et du regard. Le plan SVG panoramique réutilise uniquement les 30 gares et tarifs de référence déjà documentés ci-dessus ; son grand format n’ajoute pas de gares ni de nouveaux tarifs.
