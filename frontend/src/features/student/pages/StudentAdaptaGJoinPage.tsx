import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { adaptaGService } from '../../games/services/adapta-g.service';
import { routePaths } from '../../../app/router/routePaths';
import { getApiErrorMessage } from '../../../lib/httpErrors';

export function StudentAdaptaGJoinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== 6) {
      setError('El PIN debe tener 6 dígitos');
      return;
    }
    
    setJoining(true);
    setError(null);
    try {
      await adaptaGService.joinRoom(pin.trim());
      navigate(routePaths.studentAdaptaGPlay.replace(':pin', pin.trim()));
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo unir a la sala. Verifica el PIN.'));
      setJoining(false);
    }
  };

  return (
    <StudentShell title="Adapta - G">
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="w-full max-w-[28rem] border-4 border-on-background bg-surface-container-lowest p-xl shadow-[8px_8px_0_0_#1d1c17]">
          <h2 className="mb-lg text-center font-headline text-3xl font-bold uppercase text-primary">Unirse al Juego</h2>
          
          <form onSubmit={handleJoin} className="flex flex-col gap-md">
            <div>
              <input
                type="text"
                placeholder="PIN DEL JUEGO"
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full border-4 border-on-background p-md text-center font-mono text-4xl font-bold uppercase outline-none focus:border-primary"
              />
            </div>
            
            {error && <p className="text-center font-bold text-error">{error}</p>}
            
            <button
              type="submit"
              disabled={joining || pin.trim().length === 0}
              className="border-4 border-on-background bg-primary p-md font-headline text-2xl font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50"
            >
              {joining ? 'Entrando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </StudentShell>
  );
}
