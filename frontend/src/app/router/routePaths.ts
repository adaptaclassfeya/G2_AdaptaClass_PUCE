import type { UserRole } from '../../types/auth';

export const routePaths = {
  home: '/',
  credits: '/creditos',
  login: '/login',
  register: '/register',
  studentDashboard: '/student/dashboard',
  studentGames: '/student/games',
  studentTasks: '/student/tasks',
  studentLeaderboard: '/student/leaderboard',
  studentResult: '/student/result',
  teacherDashboard: '/teacher/dashboard',
  teacherData: '/teacher/datos',
  teacherClassroom: '/teacher/classroom',
  teacherQuestions: '/teacher/questions',
  teacherBank: '/teacher/banco',
  teacherAdaptaGSetup: '/teacher/adapta-g',
  adminDashboard: '/admin/dashboard',
  teacherAdaptaGHost: '/teacher/adapta-g/:pin/host',
  studentAdaptaGJoin: '/games/adapta-g',
  studentAdaptaGPlay: '/games/adapta-g/:pin/play',
  bombGame: '/games/bomb-game',
  avoidGermsGame: '/games/avoid-germs',
  bankPanicGame: '/games/bank-panic',
  breakoutGame: '/games/breakout',
  cardMemoryGame: '/games/card-memory',
  emojiMatchGame: '/games/emoji-match',
  slidingPuzzleGame: '/games/sliding-puzzle',
  snowmenAttackGame: '/games/snowmen-attack',
  stackerGame: '/games/stacker',
  tomGame: '/games/tom',
  pirateSurvivalGame: '/games/pirate-survival',
} as const;

/**
 * Where a logged-in user should land by default, and where games should send
 * them when the player quits. Teachers go to their dashboard (preview-mode);
 * students go to their games catalog so they can pick another one quickly.
 */
export function getHomeRoute(role: UserRole | undefined): string {
  if (role === 'ADMIN') return routePaths.adminDashboard;
  return role === 'TEACHER' ? routePaths.teacherDashboard : routePaths.studentGames;
}

/**
 * The "main" landing for a role — used by login/redirect flows where a
 * student should land on their dashboard (not the catalog).
 */
export function getDashboardRoute(role: UserRole | undefined): string {
  if (role === 'ADMIN') return routePaths.adminDashboard;
  return role === 'TEACHER' ? routePaths.teacherDashboard : routePaths.studentDashboard;
}
