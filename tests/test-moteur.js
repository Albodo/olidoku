// Tests du moteur : node tests/test-moteur.js
const assert = require('assert');
const M = require('../js/moteur.js');

let ok = 0;
function test(nom, fn) { fn(); ok++; console.log('✓', nom); }

function verifierGrille(g) {
  const { n, regions, solution } = g;
  assert.strictEqual(regions.length, n * n);
  // n régions, chacune connexe
  for (let id = 0; id < n; id++) {
    const cases = regions.map((x, i) => (x === id ? i : -1)).filter(i => i >= 0);
    assert(cases.length > 0, 'région vide ' + id);
    const vu = new Set([cases[0]]), pile = [cases[0]];
    while (pile.length) {
      for (const j of M.voisins4(n, pile.pop())) {
        if (regions[j] === id && !vu.has(j)) { vu.add(j); pile.push(j); }
      }
    }
    assert.strictEqual(vu.size, cases.length, 'région non connexe ' + id);
  }
  // Solution valide et unique
  const grille = new Array(n * n).fill(M.VIDE);
  solution.forEach((c, r) => { grille[r * n + c] = M.OLI; });
  assert(M.estResolu(n, regions, grille));
  assert.strictEqual(M.resoudre(n, regions, 5).compte, 1);
}

test('génération 5 à 9 : régions connexes, solution valide et unique', () => {
  for (let n = M.TAILLE_MIN; n <= M.TAILLE_MAX; n++) {
    for (let s = 0; s < (n < 9 ? 5 : 2); s++) verifierGrille(M.genererGrille(n, 1000 * n + s));
  }
});

test('génération reproductible (même graine = même grille)', () => {
  const a = M.genererGrille(7, 42), b = M.genererGrille(7, 42);
  assert.deepStrictEqual(a.regions, b.regions);
  assert.deepStrictEqual(a.solution, b.solution);
});

test('défi du jour : taille selon le jour de la semaine', () => {
  assert.strictEqual(M.tailleDuJour('2026-09-21'), 5); // lundi
  assert.strictEqual(M.tailleDuJour('2026-09-27'), 9); // dimanche
  const g = M.grilleDuJour('2026-09-23');
  assert.strictEqual(g.n, 6); // mercredi
  verifierGrille(g);
});

test('conflits : rangée, colonne, région, contact diagonal', () => {
  const n = 5, regions = [
    0, 0, 1, 1, 1,
    0, 2, 2, 1, 1,
    3, 2, 2, 4, 4,
    3, 3, 2, 4, 4,
    3, 3, 3, 4, 4,
  ];
  const g = () => new Array(n * n).fill(M.VIDE);
  let x = g(); x[0] = x[4] = M.OLI;             // même rangée
  assert.strictEqual(M.conflits(n, regions, x).size, 2);
  x = g(); x[0] = x[6] = M.OLI;                 // diagonale
  assert.strictEqual(M.conflits(n, regions, x).size, 2);
  x = g(); x[7] = x[17] = M.OLI;                // même région (2) et même colonne
  assert.strictEqual(M.conflits(n, regions, x).size, 2);
  x = g(); x[0] = x[7] = M.OLI;                 // aucun conflit
  assert.strictEqual(M.conflits(n, regions, x).size, 0);
});

test('indice : retirer une erreur, puis placer', () => {
  const g = M.genererGrille(6, 7);
  const grille = new Array(36).fill(M.VIDE);
  const faux = g.solution[0] === 0 ? 1 : 0;
  grille[faux] = M.OLI;
  assert.deepStrictEqual(M.indice(g, grille), { type: 'retirer', i: faux });
  grille[faux] = M.VIDE;
  assert.strictEqual(M.indice(g, grille).type, 'placer');
});

test('cases bloquées autour d\'un Olivier', () => {
  const n = 5, regions = new Array(25).fill(0).map((_, i) => i % 5);
  const b = M.casesBloquees(n, regions, 12); // centre
  assert(!b.includes(12));
  assert(b.includes(6) && b.includes(18) && b.includes(10) && b.includes(2));
});

console.log(`\n${ok} tests réussis.`);
