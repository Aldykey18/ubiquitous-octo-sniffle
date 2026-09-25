# ValueBet Radar

Prototype d'interface 3D pour filtrer les meilleurs pronostics du jour et séparer les sélections **pré-match** du futur coupon **live**.

## Lancer localement

Le projet est volontairement sans dépendance :

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Puis ouvrir `http://localhost:4173`.

## Fonctionnalités

- dashboard sombre avec visualisation 3D en CSS, score global et statistiques du snapshot ;
- shortlist pré-match multi-sports (MLB, WNBA, football, tennis) ;
- filtre premium `score ≥ 78`, filtre par sport et tri par score, EV ou cote ;
- calcul automatique de la probabilité implicite, de l'EV, de la cote combinée et de la probabilité indépendante ;
- coupon maître interactif : ajout/retrait de jambes, retrait des 3 jambes fragiles et copie du coupon ;
- fiche d'analyse détaillée pour chaque sélection ;
- espace `Live radar` séparé avec coupon conditionnel et avertissement explicite de mode démo tant qu'aucun fournisseur de scores/cotes vérifié n'est connecté ;
- responsive desktop, tablette et mobile.

Les données de `app.js` reprennent le snapshot du 25 septembre 2026 fourni dans le brief. Les cotes, compositions, statuts, horaires et marchés doivent être revalidés avant toute utilisation. L'application ne place aucun pari et ne garantit aucun résultat.
