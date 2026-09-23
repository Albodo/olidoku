# Règles d'Olidoku

## Le but

La grille (de 5 × 5 à 9 × 9) est découpée en autant de **régions de couleur** qu'elle a de
rangées. Il faut y placer autant d'Olivier qu'il y a de rangées, en respectant trois règles :

1. **Un seul Olivier par rangée.**
2. **Un seul Olivier par colonne.**
3. **Un seul Olivier par région de couleur.**

Et une contrainte de plus : **deux Olivier ne se touchent jamais**, ni côte à côte,
ni en diagonale.

Chaque grille a une seule solution : on peut toujours la trouver par déduction.

## Commandes

| Geste                     | Effet                                     |
|---------------------------|-------------------------------------------|
| Toucher une case          | Vide → ✕ → Olivier → vide                 |
| Glisser sur des cases     | Barre (✕) toutes les cases vides touchées; si on part d'un ✕, efface les ✕ |
| **Annuler**               | Défait le dernier geste                   |
| **Effacer**               | Vide la grille (annulable)                |
| **Indice**                | Signale une erreur ou révèle un Olivier   |
| Croix automatiques        | En posant un Olivier, barre sa rangée, sa colonne, sa région et ses voisines |

Les Olivier en conflit sont hachurés en rouge.

## Défi du jour

Même grille pour tout le monde, générée à partir de la date. La taille grossit pendant la
semaine :

| Lun | Mar | Mer | Jeu | Ven | Sam | Dim |
|-----|-----|-----|-----|-----|-----|-----|
| 5×5 | 6×6 | 6×6 | 7×7 | 7×7 | 8×8 | 9×9 |

Réussir le défi plusieurs jours de suite fait grimper ta **série**. Les meilleurs temps sont
comptés seulement pour les grilles réussies sans indice.

## Astuces de déduction

- Une région coincée dans une seule rangée (ou colonne) « réserve » cette rangée :
  barre le reste de la rangée.
- Si deux régions tiennent entièrement dans deux rangées, ces deux rangées leur
  appartiennent.
- Une case qui toucherait toutes les cases possibles d'une région ne peut pas
  contenir d'Olivier.
