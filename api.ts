export type Niveau = 'débutant' | 'intermédiaire' | 'avancé';

export interface Atelier {
  id: number;
  titre: string;
  niveau: Niveau;
  prix: number;
  places: number;
  formateur: string;
}

export class ErreurChargement extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ErreurChargement';
  }
}

export async function chargerAteliers(signal?: AbortSignal): Promise<Atelier[]> {
  let response: Response;

  // 1. Erreur réseau (hors-ligne, DNS, CORS, abort…)
  try {
    response = await fetch('/data/ateliers.json', {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') throw err; // on laisse remonter
    throw new ErreurChargement('Réseau indisponible — vérifiez votre connexion.', err);
  }

  // 2. Erreur HTTP (404, 500…)
  if (!response.ok) {
    throw new ErreurChargement(
      `Le serveur a répondu ${response.status} ${response.statusText || ''}`.trim()
    );
  }

  // 3. Erreur de parsing
  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    if ((err as DOMException)?.name === 'AbortError') throw err;
    throw new ErreurChargement('Réponse illisible (JSON invalide).', err);
  }

  // 4. Erreur de forme
  if (!Array.isArray(data)) {
    throw new ErreurChargement('Format invalide : un tableau était attendu.');
  }

  const ateliers = data.filter(estAtelier);
  if (ateliers.length !== data.length) {
    console.warn(`${data.length - ateliers.length} entrée(s) ignorée(s) : schéma invalide.`);
  }
  return ateliers;
}

function estAtelier(x: unknown): x is Atelier {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'number' &&
    typeof o.titre === 'string' &&
    (o.niveau === 'débutant' || o.niveau === 'intermédiaire' || o.niveau === 'avancé') &&
    typeof o.prix === 'number' &&
    typeof o.places === 'number' &&
    typeof o.formateur === 'string'
  );
}