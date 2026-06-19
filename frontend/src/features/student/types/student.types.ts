export interface StudentProfile {
  xp: number;
  racha: number;
  nivel: number;
  titulo: string;
  paralelo?: {
    id: string;
    nombre: string;
    grado: number;
  } | null;
}

export interface StudentGame {
  id: string;
  title: string;
  description: string;
  /** Legacy classification tag, kept for backwards compatibility. */
  categoryCode: string;
  /** Human-readable label for `categoryCode`. */
  category: string;
  tipo: 'BASE' | 'CAMBIANTE';
  imageUrl?: string;
  route: string;
  locked?: boolean;
  /**
   * Total questions in the student's teacher's bank. Same number for
   * every game because the bank is global (not segmented by tema).
   * Surfaced on each card so the student knows whether questions exist.
   */
  questionsCount: number;
}
