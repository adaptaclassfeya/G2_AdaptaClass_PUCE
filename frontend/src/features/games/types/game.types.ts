export interface TeacherGame {
  id: string;
  title: string;
  description: string;
  category: string;
  progress?: number;
  imageUrl?: string;
  route?: string;
  status?: 'draft' | 'published' | 'archived';
  questionsCount?: number;
  updatedAt?: string;
  aceitaIA?: boolean;
}

export interface TeacherGameSummary {
  activeStudents: number;
  questionsCreated: number;
  aiAssistedPercentage: number;
}
