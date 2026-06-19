export interface Paralelo {
  id: string;
  nombre: string;
  grado: number;
  codigo_acceso: string;
  activo: boolean;
  created_at: string;
  _count?: { students: number };
}
