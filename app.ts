// src/app.ts
import { chargerAteliers, ErreurChargement, type Atelier } from './api';
import { Store, type EtatApp } from './etat';

const store = new Store();
let controller: AbortController | null = null;

// ----- DOM (récupérés une seule fois) -----
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const champRecherche = $<HTMLInputElement>('#recherche');
const selectNiveau   = $<HTMLSelectElement>('#niveau');
const selectTri      = $<HTMLSelectElement>('#tri');
const compteur       = $<HTMLParagraphElement>('#compteur');   // <p aria-live="polite" aria-atomic="true">
const zoneEtat       = $<HTMLDivElement>('#zone-etat');         // conteneur erreur/vide
const liste          = $<HTMLUListElement>('#liste-ateliers');  // <ul aria-busy="true">

// ----- Chargement initial + "Réessayer" -----
async function recharger(): Promise<void> {
  controller?.abort();
  controller = new AbortController();

  store.modifier({ vue: 'chargement', messageErreur: null, ficheOuverteId: null });

  try {
    const ateliers = await chargerAteliers(controller.signal);
    store.modifier({
      ateliers,
      vue: ateliers.length === 0 ? 'vide' : 'succes',
    });
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') return; // annulation, on ne touche à rien
    const message = err instanceof ErreurChargement ? err.message : 'Erreur inattendue.';
    store.modifier({ vue: 'erreur', messageErreur: message });
  }
}

// ----- Filtrage + tri (dérivés, jamais stockés en double) -----
function appliquer(ateliers: Atelier[], f: EtatApp['filtres']): Atelier[] {
  const q = f.recherche.trim().toLowerCase();
  let vus = ateliers.filter((a) => {
    if (f.niveau !== 'tous' && a.niveau !== f.niveau) return false;
    if (!q) return true;
    return (
      a.titre.toLowerCase().includes(q) ||
      a.formateur.toLowerCase().includes(q)
    );
  });
  if (f.tri === 'prix-asc')  vus = [...vus].sort((a, b) => a.prix - b.prix);
  if (f.tri === 'prix-desc') vus = [...vus].sort((a, b) => b.prix - a.prix);
  return vus;
}

// ----- Rendu -----
const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const euros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

const carteAtelier = (a: Atelier) => `
  <li class="carte" data-id="${a.id}">
    <button type="button" class="carte-btn" data-action="ouvrir" aria-haspopup="dialog">
      <h2 class="titre">${echapper(a.titre)}</h2>
      <p class="meta"><span class="badge">${a.niveau}</span> · ${euros.format(a.prix)} · ${a.places} places</p>
      <p class="formateur">Animé par ${echapper(a.formateur)}</p>
    </button>
  </li>`;

const carteSquelette = `
  <li class="carte squelette" aria-hidden="true">
    <div class="ligne s-titre"></div>
    <div class="ligne s-meta"></div>
    <div class="ligne s-meta court"></div>
  </li>`;

function rendre(): void {
  const { vue, ateliers, messageErreur, filtres } = store.lire();
  const resultats = appliquer(ateliers, filtres);

  liste.setAttribute('aria-busy', vue === 'chargement' ? 'true' : 'false');

  switch (vue) {
    case 'chargement':
      zoneEtat.innerHTML = '';
      liste.innerHTML = carteSquelette.repeat(3);
      compteur.textContent = 'Chargement des ateliers…';
      return;

    case 'erreur':
      liste.innerHTML = '';
      zoneEtat.innerHTML = `
        <div class="etat-erreur" role="alert">
          <p><strong>Impossible de charger les ateliers.</strong> ${echapper(messageErreur ?? '')}</p>
          <button type="button" data-action="reessayer">Réessayer</button>
        </div>`;
      compteur.textContent = '';
      return;

    case 'vide':
    case 'succes': {
      if (resultats.length === 0) {
        liste.innerHTML = '';
        zoneEtat.innerHTML = ateliers.length === 0
          ? `<div class="etat-vide" role="status">
               <p>Aucun atelier n’est programmé pour l’instant.</p>
             </div>`
          : `<div class="etat-vide" role="status">
               <p>Aucun atelier ne correspond à ces filtres. Essayez d’élargir votre recherche ou de changer de niveau.</p>
               <button type="button" data-action="reinitialiser">Réinitialiser les filtres</button>
             </div>`;
        compteur.textContent = `0 atelier affiché sur ${ateliers.length}`;
      } else {
        zoneEtat.innerHTML = '';
        liste.innerHTML = resultats.map(carteAtelier).join('');
        compteur.textContent =
          `${resultats.length} atelier${resultats.length > 1 ? 's' : ''} affiché${resultats.length > 1 ? 's' : ''}` +
          ` sur ${ateliers.length}`;
      }
      return;
    }
  }
}

// ----- Câblage des entrées vers l'unique point d'entrée -----
champRecherche.addEventListener('input', () =>
  store.modifierFiltres({ recherche: champRecherche.value }));
selectNiveau.addEventListener('change', () =>
  store.modifierFiltres({ niveau: selectNiveau.value as EtatApp['filtres']['niveau'] }));
selectTri.addEventListener('change', () =>
  store.modifierFiltres({ tri: selectTri.value as EtatApp['filtres']['tri'] }));

document.addEventListener('click', (ev) => {
  const cible = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!cible) return;
  const action = cible.dataset.action;

  if (action === 'reessayer') { void recharger(); return; }
  if (action === 'reinitialiser') {
    champRecherche.value = ''; selectNiveau.value = 'tous'; selectTri.value = 'defaut';
    store.modifierFiltres({ recherche: '', niveau: 'tous', tri: 'defaut' });
    champRecherche.focus();
    return;
  }
  if (action === 'ouvrir') {
    const id = Number(cible.closest<HTMLElement>('.carte')?.dataset.id);
    store.modifier({ ficheOuverteId: id });
    ouvrirFiche(id);
  }
});

store.souscrire(rendre);
rendre();      // état initial = chargement
void recharger();