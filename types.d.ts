export type Niveau = 'Débutant' | 'Intermédiaire' | 'Avancé';
export interface Atelier {
    id: number;
    titre: string;
    description: string;
    niveau: Niveau;
}
export interface Inscription {
    nom: string;
    email: string;
    atelier: Atelier;
}
//# sourceMappingURL=types.d.ts.map