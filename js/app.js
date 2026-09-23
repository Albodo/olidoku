/*
 * Interface — Olidoku
 * Rendu de la grille, toucher / glisser, annuler, indices, chrono,
 * sauvegarde et statistiques (localStorage).
 */
(function () {
  'use strict';
  const M = window.Moteur;
  const { VIDE, CROIX, OLI } = M;

  /* ---------- Visage d'Olivier ---------- */
  // Pour chaque usage, le premier fichier trouvé est utilisé (voir docs/IMAGES.md).
  //  - case : tête recadrée serré, affichée en petit dans la grille
  //  - grand : photo complète, fenêtre « Bravo! »
  const SOURCES = {
    case: ['img/olivier-case.webp', 'img/olivier.webp', 'img/olivier.png', 'img/olivier.svg'],
    grand: ['img/olivier.webp', 'img/olivier.png', 'img/olivier.svg'],
  };
  let visage = SOURCES.case[SOURCES.case.length - 1];
  let visageGrand = SOURCES.grand[SOURCES.grand.length - 1];
  function trouver(liste, i, fini) {
    if (i >= liste.length - 1) return fini(liste[liste.length - 1]);
    const im = new Image();
    im.onload = () => fini(liste[i]);
    im.onerror = () => trouver(liste, i + 1, fini);
    im.src = liste[i];
  }
  function chargerVisage() {
    trouver(SOURCES.case, 0, src => { visage = src; document.querySelectorAll('.oli').forEach(e => { e.src = src; }); });
    trouver(SOURCES.grand, 0, src => { visageGrand = src; });
  }

  /* ---------- Stockage (tolérant aux erreurs) ---------- */
  const CLE = 'olidoku.v1';
  function lire() {
    try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; }
  }
  function ecrire() {
    try { localStorage.setItem(CLE, JSON.stringify(sauve)); } catch (e) { /* navigation privée */ }
  }
  const sauve = Object.assign({ parties: {}, stats: {}, options: {}, tailleLibre: 7 }, lire());

  /* ---------- État ---------- */
  let mode = 'jour';         // 'jour' | 'libre'
  let partie = null;         // { cle, g, grille, historique, ecoule, termine, indices }
  let debutChrono = null;
  let minuteur = null;

  const $ = id => document.getElementById(id);
  const plateau = $('plateau');

  function aujourdhui() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dateLisible(iso) {
    const [a, m, j] = iso.split('-').map(Number);
    return new Date(a, m - 1, j).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function formaterTemps(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /* ---------- Démarrer une partie ---------- */

  function demarrer(nouveau = false) {
    arreterChrono();
    $('chargement').hidden = false;
    // Laisser le navigateur afficher « Génération… » avant le calcul
    setTimeout(() => {
      let cle, g;
      if (mode === 'jour') {
        const date = aujourdhui();
        cle = 'jour:' + date;
        g = M.grilleDuJour(date);
        $('info-titre').textContent = `${g.n} × ${g.n} · ${dateLisible(date)}`;
      } else {
        const n = sauve.tailleLibre;
        const ancienne = sauve.parties['libre'];
        const graine = !nouveau && ancienne && ancienne.n === n ? ancienne.graine : (Math.random() * 2 ** 32) >>> 0;
        cle = 'libre';
        g = M.genererGrille(n, graine);
        $('info-titre').textContent = `${n} × ${n} · partie libre`;
      }
      const s = sauve.parties[cle];
      const reprise = s && s.graine === g.graine && s.n === g.n;
      partie = {
        cle, g,
        grille: reprise ? s.grille.slice() : new Array(g.n * g.n).fill(VIDE),
        historique: [],
        ecoule: reprise ? s.ecoule : 0,
        termine: reprise ? !!s.termine : false,
        indices: reprise ? s.indices || 0 : 0,
      };
      $('chargement').hidden = true;
      construirePlateau();
      afficher();
      if (!partie.termine) demarrerChrono();
      else plateau.classList.add('gagne');
      afficherChrono();
      memoriser();
    }, 20);
  }

  function memoriser() {
    if (!partie) return;
    const { g, grille, termine, indices } = partie;
    sauve.parties[partie.cle] = { n: g.n, graine: g.graine, grille, ecoule: tempsEcoule(), termine, indices };
    // Ne garder que les 7 derniers défis du jour
    const jours = Object.keys(sauve.parties).filter(k => k.startsWith('jour:')).sort();
    jours.slice(0, -7).forEach(k => delete sauve.parties[k]);
    ecrire();
  }

  /* ---------- Chrono ---------- */

  function tempsEcoule() {
    return partie.ecoule + (debutChrono ? Date.now() - debutChrono : 0);
  }
  function demarrerChrono() {
    if (debutChrono || partie.termine) return;
    debutChrono = Date.now();
    minuteur = setInterval(afficherChrono, 500);
  }
  function arreterChrono() {
    if (partie && debutChrono) partie.ecoule += Date.now() - debutChrono;
    debutChrono = null;
    clearInterval(minuteur);
  }
  function afficherChrono() { if (partie) $('chrono').textContent = formaterTemps(tempsEcoule()); }

  document.addEventListener('visibilitychange', () => {
    if (!partie) return;
    if (document.hidden) { arreterChrono(); memoriser(); } else demarrerChrono();
  });

  /* ---------- Rendu ---------- */

  function construirePlateau() {
    const { n, regions } = partie.g;
    plateau.style.setProperty('--n', n);
    plateau.classList.remove('gagne');
    plateau.innerHTML = '';
    for (let i = 0; i < n * n; i++) {
      const r = Math.floor(i / n), c = i % n;
      const d = document.createElement('div');
      d.className = 'case';
      d.dataset.i = i;
      d.style.background = `var(--r${regions[i]})`;
      if (c === n - 1) d.classList.add('derniere-col');
      else if (regions[i + 1] !== regions[i]) d.classList.add('fd');
      if (r === n - 1) d.classList.add('derniere-rang');
      else if (regions[i + n] !== regions[i]) d.classList.add('fb');
      plateau.appendChild(d);
    }
    ajusterTaille();
  }

  function ajusterTaille() {
    if (!partie) return;
    plateau.style.setProperty('--taille-case', plateau.clientWidth / partie.g.n + 'px');
  }
  window.addEventListener('resize', ajusterTaille);

  function afficher() {
    const { n, regions } = partie.g;
    const mauvais = M.conflits(n, regions, partie.grille);
    for (let i = 0; i < n * n; i++) {
      const d = plateau.children[i];
      const v = partie.grille[i];
      const actuel = d.dataset.v | 0;
      if (actuel !== v) {
        d.dataset.v = v;
        d.innerHTML = v === CROIX ? '<span class="croix">✕</span>'
          : v === OLI ? `<img class="oli" src="${visage}" alt="Olivier" draggable="false">` : '';
      }
      d.classList.toggle('conflit', mauvais.has(i));
    }
  }

  /* ---------- Modifier la grille ---------- */

  // changements : [[i, nouvelleValeur], …] — un seul pas d'annulation
  function appliquer(changements, auto = true) {
    if (partie.termine) return;
    const pas = [];
    const poser = (i, v) => {
      if (partie.grille[i] === v) return;
      pas.push([i, partie.grille[i]]);
      partie.grille[i] = v;
    };
    for (const [i, v] of changements) {
      poser(i, v);
      if (v === OLI && auto && sauve.options.auto) {
        for (const j of M.casesBloquees(partie.g.n, partie.g.regions, i)) {
          if (partie.grille[j] === VIDE) poser(j, CROIX);
        }
      }
    }
    if (!pas.length) return;
    partie.historique.push(pas);
    demarrerChrono();
    afficher();
    verifierVictoire();
    memoriser();
  }

  function annuler() {
    if (partie.termine) return;
    const pas = partie.historique.pop();
    if (!pas) return;
    for (let k = pas.length - 1; k >= 0; k--) partie.grille[pas[k][0]] = pas[k][1];
    afficher();
    memoriser();
  }

  function effacer() {
    if (partie.termine) return;
    appliquer(partie.grille.map((v, i) => [i, VIDE]), false);
  }

  function donnerIndice() {
    if (partie.termine) return;
    const ind = M.indice(partie.g, partie.grille);
    if (!ind) return;
    partie.indices++;
    const v = ind.type === 'placer' ? OLI : VIDE;
    toast(ind.type === 'retirer' ? 'Cet Olivier n\'est pas à sa place.'
      : ind.type === 'decroiser' ? 'Cette case ne devrait pas être barrée.' : 'Olivier va ici!');
    const d = plateau.children[ind.i];
    d.classList.remove('indice'); void d.offsetWidth; d.classList.add('indice');
    appliquer([[ind.i, v]], false);
  }

  function verifierVictoire() {
    const { n, regions } = partie.g;
    if (!M.estResolu(n, regions, partie.grille)) return;
    arreterChrono();
    partie.termine = true;
    // Retirer les croix pour ne laisser que les Olivier
    partie.grille = partie.grille.map(v => (v === OLI ? OLI : VIDE));
    afficher();
    plateau.classList.add('gagne');
    enregistrerStats();
    memoriser();
    setTimeout(montrerVictoire, 700);
  }

  /* ---------- Toucher / glisser ---------- */

  let geste = null; // { depart, valeurDepart, peinture, glisse, vus }

  function caseSous(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const c = el && el.closest('.case');
    return c && plateau.contains(c) ? Number(c.dataset.i) : null;
  }

  plateau.addEventListener('pointerdown', e => {
    if (!partie || partie.termine) return;
    const i = caseSous(e);
    if (i === null) return;
    e.preventDefault();
    const v = partie.grille[i];
    geste = { depart: i, valeurDepart: v, peinture: v === CROIX ? VIDE : CROIX, glisse: false, vus: new Set([i]), changements: [] };
  });

  plateau.addEventListener('pointermove', e => {
    if (!geste) return;
    const i = caseSous(e);
    if (i === null || geste.vus.has(i)) return;
    if (!geste.glisse) {
      geste.glisse = true;
      peindre(geste.depart);
    }
    geste.vus.add(i);
    peindre(i);
  });

  // Pendant un glissé, on modifie l'affichage tout de suite ; l'annulation regroupe tout.
  function peindre(i) {
    const v = partie.grille[i];
    if (v === OLI) return;
    if (geste.peinture === CROIX && v !== VIDE) return;
    if (geste.peinture === VIDE && v !== CROIX) return;
    geste.changements.push([i, v]);
    partie.grille[i] = geste.peinture;
    afficher();
  }

  function finGeste() {
    if (!geste) return;
    const g = geste;
    geste = null;
    if (g.glisse) {
      if (!g.changements.length) return;
      // Remettre l'état d'avant puis appliquer en un seul pas d'annulation
      const finals = g.changements.map(([i]) => [i, partie.grille[i]]);
      for (let k = g.changements.length - 1; k >= 0; k--) partie.grille[g.changements[k][0]] = g.changements[k][1];
      appliquer(finals);
    } else {
      const suivant = g.valeurDepart === VIDE ? CROIX : g.valeurDepart === CROIX ? OLI : VIDE;
      appliquer([[g.depart, suivant]]);
    }
  }
  plateau.addEventListener('pointerup', finGeste);
  plateau.addEventListener('pointercancel', finGeste);
  plateau.addEventListener('pointerleave', finGeste);

  /* ---------- Statistiques ---------- */

  function enregistrerStats() {
    const st = sauve.stats;
    const n = partie.g.n, t = tempsEcoule();
    st.gagnees = (st.gagnees || 0) + 1;
    st.meilleurs = st.meilleurs || {};
    if (!partie.indices && (!st.meilleurs[n] || t < st.meilleurs[n])) st.meilleurs[n] = t;
    if (mode === 'jour') {
      const date = aujourdhui();
      const hier = new Date(); hier.setDate(hier.getDate() - 1);
      const hierIso = `${hier.getFullYear()}-${String(hier.getMonth() + 1).padStart(2, '0')}-${String(hier.getDate()).padStart(2, '0')}`;
      if (st.dernierJour !== date) {
        st.serie = st.dernierJour === hierIso ? (st.serie || 0) + 1 : 1;
        st.meilleureSerie = Math.max(st.meilleureSerie || 0, st.serie);
        st.jours = (st.jours || 0) + 1;
        st.dernierJour = date;
      }
    }
  }

  function montrerStats() {
    const st = sauve.stats;
    const lignes = [];
    for (let n = M.TAILLE_MIN; n <= M.TAILLE_MAX; n++) {
      const m = st.meilleurs && st.meilleurs[n];
      lignes.push(`<tr><td>${n} × ${n}</td><td>${m ? formaterTemps(m) : '—'}</td></tr>`);
    }
    $('stats-contenu').innerHTML = `
      <div class="stat"><b>${st.gagnees || 0}</b><small>grilles réussies</small></div>
      <div class="stat"><b>${st.jours || 0}</b><small>défis du jour</small></div>
      <div class="stat"><b>${st.serie || 0}</b><small>série actuelle</small></div>
      <div class="stat"><b>${st.meilleureSerie || 0}</b><small>meilleure série</small></div>
      <table><tr><th>Taille</th><th>Meilleur temps (sans indice)</th></tr>${lignes.join('')}</table>`;
    $('dlg-stats').showModal();
  }

  /* ---------- Victoire et partage ---------- */

  function texteResultat() {
    const t = formaterTemps(tempsEcoule());
    const ind = partie.indices ? ` · ${partie.indices} indice${partie.indices > 1 ? 's' : ''}` : ' · sans indice';
    const quoi = mode === 'jour' ? `Défi du ${dateLisible(aujourdhui())}` : 'Partie libre';
    return `Olidoku — ${quoi}\n${partie.g.n} × ${partie.g.n} en ${t}${ind}`;
  }

  function montrerVictoire() {
    $('victoire-visage').src = visageGrand;
    $('victoire-texte').textContent = texteResultat().split('\n')[1];
    $('btn-rejouer').textContent = mode === 'jour' ? 'Jouer une partie libre' : 'Nouvelle grille';
    $('dlg-victoire').showModal();
  }

  async function partager() {
    const texte = texteResultat() + '\n' + location.href.split('#')[0];
    try {
      if (navigator.share) { await navigator.share({ text: texte }); return; }
      await navigator.clipboard.writeText(texte);
      toast('Résultat copié!');
    } catch (e) { /* partage annulé */ }
  }

  let minuteurToast = null;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(() => { t.hidden = true; }, 2000);
  }

  /* ---------- Modes et tailles ---------- */

  function choisirMode(m) {
    if (m === mode && partie) return;
    arreterChrono();
    memoriser();
    mode = m;
    $('onglet-jour').classList.toggle('actif', m === 'jour');
    $('onglet-libre').classList.toggle('actif', m === 'libre');
    $('onglet-jour').setAttribute('aria-selected', m === 'jour');
    $('onglet-libre').setAttribute('aria-selected', m === 'libre');
    $('tailles').hidden = m !== 'libre';
    demarrer();
  }

  function construireTailles() {
    const box = $('tailles');
    for (let n = M.TAILLE_MIN; n <= M.TAILLE_MAX; n++) {
      const b = document.createElement('button');
      b.textContent = `${n}×${n}`;
      b.classList.toggle('actif', n === sauve.tailleLibre);
      b.addEventListener('click', () => {
        sauve.tailleLibre = n;
        box.querySelectorAll('button').forEach(x => x.classList.toggle('actif', x === b));
        arreterChrono();
        demarrer(true);
      });
      box.appendChild(b);
    }
  }

  /* ---------- Branchements ---------- */

  $('onglet-jour').addEventListener('click', () => choisirMode('jour'));
  $('onglet-libre').addEventListener('click', () => choisirMode('libre'));
  $('btn-annuler').addEventListener('click', annuler);
  $('btn-effacer').addEventListener('click', effacer);
  $('btn-indice').addEventListener('click', donnerIndice);
  $('btn-regles').addEventListener('click', () => $('dlg-regles').showModal());
  $('btn-stats').addEventListener('click', montrerStats);
  $('btn-partager').addEventListener('click', partager);
  $('btn-rejouer').addEventListener('click', () => {
    $('dlg-victoire').close();
    if (mode === 'jour') choisirMode('libre'); else demarrer(true);
  });
  document.querySelectorAll('[data-fermer]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

  const optAuto = $('opt-auto');
  optAuto.checked = !!sauve.options.auto;
  optAuto.addEventListener('change', () => { sauve.options.auto = optAuto.checked; ecrire(); });

  chargerVisage();
  construireTailles();
  demarrer();
  if (!sauve.dejaVu) { sauve.dejaVu = true; ecrire(); $('dlg-regles').showModal(); }
})();
