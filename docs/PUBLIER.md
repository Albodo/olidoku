# Publier le jeu

Le jeu est un site statique : il suffit de publier le dossier tel quel.

## GitHub Pages

1. Crée un dépôt vide sur GitHub nommé `olidoku` (sans README ni .gitignore).
2. Dans ce dossier (le dépôt git est déjà initialisé sur la branche `main`) :
   ```bash
   git add .
   git commit -m "Version initiale"
   git remote add origin https://github.com/TON-COMPTE/olidoku.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**,
   branche `main`, dossier `/ (root)`.
4. Le jeu sera en ligne à `https://TON-COMPTE.github.io/olidoku/`.

Le fichier `.nojekyll` empêche GitHub de retraiter le site.

## itch.io

1. Fais une archive .zip du **contenu** du dossier (`index.html` doit être à la racine du zip).
   Sous Windows (PowerShell), depuis le dossier du projet :
   ```powershell
   Compress-Archive -Path index.html,manifest.webmanifest,css,js,img -DestinationPath olidoku.zip -Force
   ```
2. Sur itch.io : **Upload new project**, type **HTML**, téléverse le zip et coche
   « This file will be played in the browser ».
3. Réglages conseillés : *Mobile friendly* coché, orientation *Portrait*,
   taille de fenêtre 400 × 800, et « Fullscreen button » activé.
