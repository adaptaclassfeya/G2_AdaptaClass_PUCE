import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthRedirect, ProtectedRoute } from './ProtectedRoute';
import { routePaths } from './routePaths';
import { LandingPage } from '../../features/landing/LandingPage';
import { CreditsPage } from '../../features/landing/CreditsPage';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { RegisterPage } from '../../features/auth/pages/RegisterPage';
import { StudentDashboardPage } from '../../features/student/pages/StudentDashboardPage';
import { StudentGameCatalogPage } from '../../features/student/pages/StudentGameCatalogPage';
import { StudentTasksPage } from '../../features/student/pages/StudentTasksPage';
import { StudentLeaderboardPage } from '../../features/student/pages/StudentLeaderboardPage';
import { StudentResultPage } from '../../features/student/pages/StudentResultPage';
import { TeacherDashboardPage } from '../../features/teacher/pages/TeacherDashboardPage';
import { TeacherClassroomPage } from '../../features/teacher/pages/TeacherClassroomPage';
import { TeacherQuestionGeneratorPage } from '../../features/teacher/pages/TeacherQuestionGeneratorPage';
import { TeacherBankPage } from '../../features/teacher/pages/TeacherBankPage';

const AdminDashboardPage = lazy(() =>
  import('../../features/admin/pages/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
);

const TeacherDataPage = lazy(() =>
  import('../../features/teacher/pages/TeacherDataPage').then((module) => ({
    default: module.TeacherDataPage,
  })),
);

const TeacherAdaptaGSetupPage = lazy(() =>
  import('../../features/teacher/pages/TeacherAdaptaGSetupPage').then((module) => ({
    default: module.TeacherAdaptaGSetupPage,
  })),
);
const TeacherAdaptaGHostPage = lazy(() =>
  import('../../features/teacher/pages/TeacherAdaptaGHostPage').then((module) => ({
    default: module.TeacherAdaptaGHostPage,
  })),
);
const StudentAdaptaGJoinPage = lazy(() =>
  import('../../features/student/pages/StudentAdaptaGJoinPage').then((module) => ({
    default: module.StudentAdaptaGJoinPage,
  })),
);
const StudentAdaptaGPlayPage = lazy(() =>
  import('../../features/student/pages/StudentAdaptaGPlayPage').then((module) => ({
    default: module.StudentAdaptaGPlayPage,
  })),
);

const BombGamePage = lazy(() =>
  import('../../features/games/bomb-game/BombGamePage').then((module) => ({
    default: module.BombGamePage,
  })),
);
const AvoidGermsGamePage = lazy(() =>
  import('../../features/games/avoid-germs-game/AvoidGermsGamePage').then((module) => ({
    default: module.AvoidGermsGamePage,
  })),
);
const BankPanicGamePage = lazy(() =>
  import('../../features/games/bank-panic-game/BankPanicGamePage').then((module) => ({
    default: module.BankPanicGamePage,
  })),
);
const BreakoutGamePage = lazy(() =>
  import('../../features/games/breakout-game/BreakoutGamePage').then((module) => ({
    default: module.BreakoutGamePage,
  })),
);
const CardMemoryGamePage = lazy(() =>
  import('../../features/games/card-memory-game/CardMemoryGamePage').then((module) => ({
    default: module.CardMemoryGamePage,
  })),
);
const EmojiMatchGamePage = lazy(() =>
  import('../../features/games/emoji-match-game/EmojiMatchGamePage').then((module) => ({
    default: module.EmojiMatchGamePage,
  })),
);
const SlidingPuzzleGamePage = lazy(() =>
  import('../../features/games/sliding-puzzle-game/SlidingPuzzleGamePage').then((module) => ({
    default: module.SlidingPuzzleGamePage,
  })),
);
const SnowmenAttackGamePage = lazy(() =>
  import('../../features/games/snowmen-attack-game/SnowmenAttackGamePage').then((module) => ({
    default: module.SnowmenAttackGamePage,
  })),
);
const StackerGamePage = lazy(() =>
  import('../../features/games/stacker-game/StackerGamePage').then((module) => ({
    default: module.StackerGamePage,
  })),
);
const TomGamePage = lazy(() =>
  import('../../features/games/tom-game/TomGamePage').then((module) => ({
    default: module.TomGamePage,
  })),
);
const PirateSurvivalGamePage = lazy(() =>
  import('../../features/games/pirate-survival-game/PirateSurvivalGamePage').then((module) => ({
    default: module.PirateSurvivalGamePage,
  })),
);

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
          <p className="font-headline text-xl font-bold uppercase text-primary">Cargando...</p>
        </div>
      }
    >
      <Routes>
      <Route path={routePaths.home} element={<LandingPage />} />
      <Route path={routePaths.credits} element={<CreditsPage />} />
      <Route
        path={routePaths.login}
        element={
          <AuthRedirect>
            <LoginPage />
          </AuthRedirect>
        }
      />
      <Route
        path={routePaths.register}
        element={
          <AuthRedirect>
            <RegisterPage />
          </AuthRedirect>
        }
      />
      <Route
        path={routePaths.studentDashboard}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentGames}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentGameCatalogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentTasks}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentTasksPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentLeaderboard}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentLeaderboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentResult}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherDashboard}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherQuestions}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherQuestionGeneratorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherBank}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherBankPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.adminDashboard}
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherData}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherDataPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherClassroom}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherClassroomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherAdaptaGSetup}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherAdaptaGSetupPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.teacherAdaptaGHost}
        element={
          <ProtectedRoute allowedRole="TEACHER">
            <TeacherAdaptaGHostPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentAdaptaGJoin}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentAdaptaGJoinPage />
          </ProtectedRoute>
        }
      />
      <Route
        path={routePaths.studentAdaptaGPlay}
        element={
          <ProtectedRoute allowedRole="STUDENT">
            <StudentAdaptaGPlayPage />
          </ProtectedRoute>
        }
      />
      <Route path={routePaths.bombGame} element={<ProtectedRoute><BombGamePage /></ProtectedRoute>} />
      <Route path={routePaths.avoidGermsGame} element={<ProtectedRoute><AvoidGermsGamePage /></ProtectedRoute>} />
      <Route path={routePaths.bankPanicGame} element={<ProtectedRoute><BankPanicGamePage /></ProtectedRoute>} />
      <Route path={routePaths.breakoutGame} element={<ProtectedRoute><BreakoutGamePage /></ProtectedRoute>} />
      <Route path={routePaths.cardMemoryGame} element={<ProtectedRoute><CardMemoryGamePage /></ProtectedRoute>} />
      <Route path={routePaths.emojiMatchGame} element={<ProtectedRoute><EmojiMatchGamePage /></ProtectedRoute>} />
      <Route path={routePaths.slidingPuzzleGame} element={<ProtectedRoute><SlidingPuzzleGamePage /></ProtectedRoute>} />
      <Route path={routePaths.snowmenAttackGame} element={<ProtectedRoute><SnowmenAttackGamePage /></ProtectedRoute>} />
      <Route path={routePaths.stackerGame} element={<ProtectedRoute><StackerGamePage /></ProtectedRoute>} />
      <Route path={routePaths.tomGame} element={<ProtectedRoute><TomGamePage /></ProtectedRoute>} />
      <Route path={routePaths.pirateSurvivalGame} element={<ProtectedRoute><PirateSurvivalGamePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={routePaths.login} replace />} />
      </Routes>
    </Suspense>
  );
}
