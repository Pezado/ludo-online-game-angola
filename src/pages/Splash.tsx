import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ArrowRight, User, Lock, ArrowLeft, Dices } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { useRenewStore } from '../store/useStore';

export default function Splash() {
  const navigate = useNavigate();
  const { setUser } = useRenewStore();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-login if local session exists
  useEffect(() => {
    const storedUsername = localStorage.getItem('ludo_logged_username');
    if (storedUsername) {
      const checkUserSession = async () => {
        try {
          const userRef = ref(db, `ludo/usuarios/${storedUsername.toLowerCase()}`);
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const userData = snapshot.val();
            // Mark online
            await update(userRef, { active: true });
            setUser(userData);
            navigate('/');
          } else {
            localStorage.removeItem('ludo_logged_username');
          }
        } catch (e) {
          console.error('Session sync error:', e);
        }
      };
      checkUserSession();
    }
  }, [navigate, setUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || !password) {
      setError('Por favor preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      const userRef = ref(db, `ludo/usuarios/${cleanUsername}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        setError('Nome de Usuário não encontrado.');
        setLoading(false);
        return;
      }

      const userData = snapshot.val();
      if (userData.password !== password) {
        setError('Senha incorreta.');
        setLoading(false);
        return;
      }

      // Mark user online
      await update(userRef, { active: true });

      // Save session
      localStorage.setItem('ludo_logged_username', cleanUsername);
      localStorage.setItem('ludo_show_welcome', 'true');
      
      setUser(userData);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro de ligação. Verifique a sua internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between px-6 pt-20 pb-12 bg-background text-foreground overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[40%] bg-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!showLogin ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col items-center text-center w-full flex-1 justify-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-24 h-24 bg-primary text-background rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 mb-8"
            >
              <Dices size={54} strokeWidth={2} />
            </motion.div>
            
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-4xl font-black mb-2 tracking-tight uppercase"
            >
              LUDO <span className="text-primary">ANGOLA</span>
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs font-black text-secondary tracking-widest uppercase leading-relaxed max-w-[300px] mb-8"
            >
              Apostas P2P em Tempo Real • Corrida de Dados Premium
            </motion.p>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="glass p-5 rounded-3xl w-full mb-10 text-left border-primary/10 bg-primary/5"
            >
              <h2 className="text-xs font-black uppercase text-primary tracking-wider mb-2 flex items-center gap-2">
                <Trophy size={14} /> Lucros Reais e Conectividade
              </h2>
              <p className="text-[10px] opacity-75 font-semibold leading-relaxed">
                Desafie jogadores de Luanda, Benguela, Huambo e mais 18 províncias. Combine o valor da aposta em tempo real, jogue de acordo com as regras tradicionais angolanas e saque instantaneamente.
              </p>
            </motion.div>

            <div className="w-full space-y-4">
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => navigate('/register')}
                className="w-full h-16 bg-primary text-background rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
              >
                Criar Conta P2P
                <ArrowRight size={18} />
              </motion.button>
              
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                onClick={() => setShowLogin(true)}
                className="w-full h-16 glass rounded-2xl font-black text-sm uppercase tracking-widest opacity-80 active:scale-95 transition-all text-foreground"
              >
                Já tenho conta
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="login"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex flex-col w-full flex-1 relative z-10"
          >
            <header className="flex items-center gap-4 mb-10">
              <button onClick={() => setShowLogin(false)} className="w-10 h-10 glass rounded-full flex items-center justify-center">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-black uppercase tracking-widest">Entrar na Arena</h1>
                <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">LUDO PRO</p>
              </div>
            </header>

            <form onSubmit={handleLogin} className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Nome de Usuário</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-primary" size={18} />
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: joao"
                      className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors uppercase tracking-wider"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-primary" size={18} />
                    <input 
                      required
                      type="password" 
                      placeholder="••••"
                      className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-danger uppercase tracking-widest">{error}</p>
                  </div>
                )}
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-primary text-background rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-background border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Aceder à Plataforma
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center gap-6 pt-10 border-t border-adaptive w-full mt-8 relative z-10">
        <div className="flex items-center gap-1 opacity-40">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          <span className="text-[8px] font-black uppercase tracking-widest">Apostas Seguras</span>
        </div>
        <div className="flex items-center gap-1 opacity-40">
          <div className="w-1.5 h-1.5 bg-secondary rounded-full" />
          <span className="text-[8px] font-black uppercase tracking-widest">P2P Angola</span>
        </div>
      </div>
    </div>
  );
}
