import { StudentShell } from '../components/StudentShell';
import { JoinParaleloCard } from '../components/JoinParaleloCard';
import { Leaderboard } from '../components/Leaderboard';
import { useAuthStore } from '../../auth/store/authStore';

export function StudentLeaderboardPage() {
  const { user } = useAuthStore();

  return (
    <StudentShell title="Clasificación">
      {user?.paralelo_id ? (
        <>
          <p className="mb-md font-mono text-sm text-on-surface-variant">
            Así va tu paralelo. ¡Gana XP completando misiones para escalar posiciones!
          </p>
          <Leaderboard paraleloId={user.paralelo_id} currentUserId={user.id} />
        </>
      ) : (
        <>
          <section className="mb-lg border-4 border-on-background bg-surface-container-lowest p-md text-on-surface shadow-[4px_4px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17]">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">leaderboard</span>
              <div>
                <h3 className="font-headline text-lg font-bold uppercase">
                  Únete a un paralelo para competir
                </h3>
                <p className="text-sm text-on-surface-variant">
                  La clasificación compara tu XP con el de tus compañeros de paralelo.
                </p>
              </div>
            </div>
          </section>
          <JoinParaleloCard />
        </>
      )}
    </StudentShell>
  );
}
