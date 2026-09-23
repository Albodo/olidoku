/*
 * Moteur de jeu — Olidoku
 * -----------------------
 * Logique pure (aucun accès au DOM) : génération de grilles à solution
 * unique, solveur, détection des conflits, indices. Fonctionne dans le
 * navigateur (window.Moteur) et dans Node (require) pour les tests.
 *
 * Règles : grille n × n découpée en n régions de couleur. Placer n Olivier :
 * un seul par rangée, par colonne et par région, et deux Olivier ne se
 * touchent jamais, même en diagonale.
 *
 * Représentation :
 *   regions : tableau de n*n entiers (0..n-1), index = rangée * n + colonne
 *   solution : tableau de n entiers, solution[rangée] = colonne
 *   grille (joueur) : tableau de n*n valeurs VIDE | CROIX | OLI
 */
(function (racine, fabrique) {
  if (typeof module === 'object' && module.exports) module.exports = fabrique();
  else racine.Moteur = fabrique();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VIDE = 0, CROIX = 1, OLI = 2;
  const TAILLE_MIN = 5, TAILLE_MAX = 9;

  /* ---------- Hasard reproductible ---------- */

  function mulberry32(graine) {
    let a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hacher(texte) {
    let h = 2166136261 >>> 0;
    for (const c of String(texte)) {
      h ^= c.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function melanger(tab, rng) {
    for (let i = tab.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = tab[i]; tab[i] = tab[j]; tab[j] = t;
    }
    return tab;
  }

  /* ---------- Placement valide (une solution) ---------- */

  // Une permutation où deux rangées consécutives ne sont jamais en colonnes voisines.
  function placementAleatoire(n, rng) {
    const pos = new Array(n);
    const prise = new Array(n).fill(false);
    (function bt(r) {
      if (r === n) return true;
      for (const c of melanger([...Array(n).keys()], rng)) {
        if (prise[c] || (r > 0 && Math.abs(pos[r - 1] - c) <= 1)) continue;
        pos[r] = c; prise[c] = true;
        if (bt(r + 1)) return true;
        prise[c] = false;
      }
      return false;
    })(0);
    return pos;
  }

  /* ---------- Régions : croissance aléatoire depuis chaque Olivier ---------- */

  function voisins4(n, i) {
    const r = Math.floor(i / n), c = i % n, v = [];
    if (r > 0) v.push(i - n);
    if (r < n - 1) v.push(i + n);
    if (c > 0) v.push(i - 1);
    if (c < n - 1) v.push(i + 1);
    return v;
  }

  function voisins8(n, i) {
    const r = Math.floor(i / n), c = i % n, v = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n) v.push(rr * n + cc);
      }
    }
    return v;
  }

  function croitreRegions(n, solution, rng) {
    const regions = new Array(n * n).fill(-1);
    // Ordre des couleurs mélangé pour que la région 0 ne soit pas toujours en haut
    const ids = melanger([...Array(n).keys()], rng);
    solution.forEach((c, r) => { regions[r * n + c] = ids[r]; });
    // Poids par région : certaines grandissent plus vite (formes variées)
    const poids = ids.map(() => 0.3 + rng() * 1.7);
    let restantes = n * n - n;
    while (restantes > 0) {
      // Cases libres adjacentes à une région, choisies selon le poids de la région
      const candidats = [];
      let total = 0;
      for (let i = 0; i < n * n; i++) {
        if (regions[i] !== -1) continue;
        for (const j of voisins4(n, i)) {
          const g = regions[j];
          if (g !== -1) { candidats.push([i, g]); total += poids[g]; }
        }
      }
      let x = rng() * total, choix = candidats[candidats.length - 1];
      for (const cand of candidats) {
        x -= poids[cand[1]];
        if (x <= 0) { choix = cand; break; }
      }
      regions[choix[0]] = choix[1];
      restantes--;
    }
    return regions;
  }

  /* ---------- Solveur ---------- */

  // Compte les solutions (s'arrête à `limite`). Renvoie { compte, solution }.
  function resoudre(n, regions, limite = 2) {
    let compte = 0, premiere = null;
    const pos = new Array(n);
    const colPrise = new Array(n).fill(false);
    const regPrise = new Array(n).fill(false);
    (function bt(r) {
      if (r === n) {
        compte++;
        if (!premiere) premiere = pos.slice();
        return compte >= limite;
      }
      for (let c = 0; c < n; c++) {
        if (colPrise[c]) continue;
        if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
        const g = regions[r * n + c];
        if (regPrise[g]) continue;
        pos[r] = c; colPrise[c] = true; regPrise[g] = true;
        if (bt(r + 1)) return true;
        colPrise[c] = false; regPrise[g] = false;
      }
      return false;
    })(0);
    return { compte, solution: premiere };
  }

  /* ---------- Génération ---------- */

  function genererGrille(n, graine) {
    if (!(n >= TAILLE_MIN && n <= TAILLE_MAX)) throw new Error('Taille invalide : ' + n);
    const rng = mulberry32(graine);
    for (let essai = 1; essai <= 20000; essai++) {
      const solution = placementAleatoire(n, rng);
      const regions = croitreRegions(n, solution, rng);
      if (resoudre(n, regions, 2).compte === 1) {
        return { n, graine: graine >>> 0, regions, solution, essais: essai };
      }
    }
    throw new Error('Aucune grille unique trouvée');
  }

  // Défi du jour : même grille pour tout le monde. Taille selon le jour de la semaine
  // (dimanche = 9 × 9, lundi = 5 × 5, puis de plus en plus gros).
  const TAILLE_PAR_JOUR = [9, 5, 6, 6, 7, 7, 8]; // dim, lun, mar, mer, jeu, ven, sam

  function tailleDuJour(dateISO) {
    const [a, m, j] = dateISO.split('-').map(Number);
    return TAILLE_PAR_JOUR[new Date(Date.UTC(a, m - 1, j)).getUTCDay()];
  }

  function grilleDuJour(dateISO) {
    return genererGrille(tailleDuJour(dateISO), hacher('olidoku-' + dateISO));
  }

  /* ---------- Vérification du jeu ---------- */

  // Ensemble des cases d'Olivier en conflit (rangée, colonne, région ou contact).
  function conflits(n, regions, grille) {
    const mauvais = new Set();
    const oli = [];
    for (let i = 0; i < n * n; i++) if (grille[i] === OLI) oli.push(i);
    for (let a = 0; a < oli.length; a++) {
      for (let b = a + 1; b < oli.length; b++) {
        const i = oli[a], j = oli[b];
        const ri = Math.floor(i / n), ci = i % n, rj = Math.floor(j / n), cj = j % n;
        if (ri === rj || ci === cj || regions[i] === regions[j] ||
            (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)) {
          mauvais.add(i); mauvais.add(j);
        }
      }
    }
    return mauvais;
  }

  function estResolu(n, regions, grille) {
    let nb = 0;
    for (let i = 0; i < n * n; i++) if (grille[i] === OLI) nb++;
    return nb === n && conflits(n, regions, grille).size === 0;
  }

  // Cases qu'on peut barrer automatiquement quand on pose un Olivier en i.
  function casesBloquees(n, regions, i) {
    const r = Math.floor(i / n), c = i % n, res = new Set(voisins8(n, i));
    for (let k = 0; k < n; k++) { res.add(r * n + k); res.add(k * n + c); }
    for (let k = 0; k < n * n; k++) if (regions[k] === regions[i]) res.add(k);
    res.delete(i);
    return [...res];
  }

  // Indice : corrige d'abord une erreur, sinon révèle un Olivier manquant.
  function indice(grilleJeu, grille) {
    const { n, solution } = grilleJeu;
    const bonne = new Set(solution.map((c, r) => r * n + c));
    for (let i = 0; i < n * n; i++) {
      if (grille[i] === OLI && !bonne.has(i)) return { type: 'retirer', i };
    }
    for (let i = 0; i < n * n; i++) {
      if (bonne.has(i) && grille[i] === CROIX) return { type: 'decroiser', i };
    }
    for (const i of bonne) if (grille[i] !== OLI) return { type: 'placer', i };
    return null;
  }

  return {
    VIDE, CROIX, OLI, TAILLE_MIN, TAILLE_MAX,
    mulberry32, hacher, melanger, voisins4, voisins8,
    placementAleatoire, croitreRegions, resoudre, genererGrille,
    tailleDuJour, grilleDuJour, conflits, estResolu, casesBloquees, indice,
  };
});
