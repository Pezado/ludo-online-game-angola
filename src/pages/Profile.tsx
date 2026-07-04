import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, LogOut, Trophy, History, Shield, MapPin, Phone, TrendingUp, TrendingDown, RefreshCw, Circle, Award } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, get, update } from 'firebase/database';
import { useRenewStore } from '../store/useStore';
import { User, Transaction, ActivityLog } from '../types';

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser } = useRenewStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'history' | 'ranking'>('profile');

  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [userMovements, setUserMovements] = useState<Transaction[]>([]);
  const [userActivities, setUserActivities] = useState<ActivityLog[]>([]);
  const [loadingRank, setLoadingRank] = useState(false);

  // Sync movements and activities from RTDB
  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `ludo/usuarios/${user.id}`);
    
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Sync movements
        const movs: Transaction[] = [];
        if (data.movimentos) {
          Object.keys(data.movimentos).forEach(key => {
            movs.push({ id: key, ...data.movimentos[key] });
          });
        }
        movs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setUserMovements(movs);

        // Sync activities
        const acts: ActivityLog[] = [];
        if (data.atividades) {
          Object.keys(data.atividades).forEach(key => {
            acts.push({ id: key, ...data.atividades[key] });
          });
        }
        acts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setUserActivities(acts);
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Sync Leaderboard rankings
  useEffect(() => {
    if (activeTab !== 'ranking') return;
    setLoadingRank(true);
    
    const usersRef = ref(db, 'ludo/usuarios');
    const unsubscribeRank = onValue(usersRef, (snapshot) => {
      const allUsers: User[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          allUsers.push({ id: child.key!, ...child.val() } as User);
        });
      }
      // Rank by wins first, then win ratio, then balance
      allUsers.sort((a, b) => {
        if ((b.wins || 0) !== (a.wins || 0)) {
          return (b.wins || 0) - (a.wins || 0);
        }
        return (b.saldoProfissional || 0) - (a.saldoProfissional || 0);
      });
      setLeaderboard(allUsers);
      setLoadingRank(false);
    });

    return () => unsubscribeRank();
  }, [activeTab]);

  const handleLogout = async () => {
    if (!user) return;
    try {
      // Mark user offline in database
      const userRef = ref(db, `ludo/usuarios/${user.id}`);
      await update(userRef, { active: false });

      // Save logout activity
      const activityId = `act_${Date.now()}`;
      await update(ref(db), {
        [`ludo/usuarios/${user.id}/atividades/${activityId}`]: {
          id: activityId,
          type: 'logout',
          description: 'Terminou sessão na plataforma LUDO.',
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      console.error('Logout sync error:', e);
    } finally {
      // Clear local session
      localStorage.removeItem('ludo_logged_username');
      setUser(null);
      navigate('/splash');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-6 pb-28 min-h-screen text-foreground"
    >
      {/* Header Profile Name */}
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/20 border border-primary/40 rounded-full flex items-center justify-center text-primary font-black uppercase text-lg">
            {user?.username?.substring(0, 2)}
          </div>
          <div>
            <h1 className="text-md font-black uppercase tracking-widest text-primary">{user?.username}</h1>
            <p className="text-[9px] opacity-50 uppercase font-bold tracking-wider flex items-center gap-1">
              <MapPin size={10} className="text-secondary" /> {user?.province} • Angola
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-10 h-10 glass hover:bg-danger/10 hover:border-danger/30 rounded-full flex items-center justify-center text-danger transition-colors"
          title="Terminar Sessão"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Selector Tabs */}
      <nav className="grid grid-cols-3 gap-2 bg-white/5 p-1 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'profile' ? 'bg-primary text-background font-black' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <UserIcon size={12} /> Perfil
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-primary text-background font-black' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <History size={12} /> Histórico
        </button>
        <button
          onClick={() => setActiveTab('ranking')}
          className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ranking' ? 'bg-primary text-background font-black' : 'opacity-60 hover:opacity-100'
          }`}
        >
          <Trophy size={12} /> Ranking
        </button>
      </nav>

      {/* Render Active Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Main Stat Card Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass p-4 rounded-2xl border-adaptive text-center">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-40">Jogos</p>
              <p className="text-lg font-black text-white mt-1">{user?.totalGames || 0}</p>
            </div>
            <div className="glass p-4 rounded-2xl border-primary/10 bg-primary/5 text-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-primary">Vitórias</p>
              <p className="text-lg font-black text-primary mt-1">{user?.wins || 0}</p>
            </div>
            <div className="glass p-4 rounded-2xl border-danger/10 bg-danger/5 text-center">
              <p className="text-[8px] font-black uppercase tracking-widest text-danger">Derrotas</p>
              <p className="text-lg font-black text-danger mt-1">{user?.losses || 0}</p>
            </div>
          </div>

          {/* Wallets */}
          <div className="glass p-5 rounded-3xl border-adaptive space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Minhas Carteiras</p>
            
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-primary">Modo Profissional</p>
                <p className="text-[8px] opacity-40 uppercase font-bold">Moedas Reais de Angola</p>
              </div>
              <p className="text-lg font-black text-primary">{(user?.saldoProfissional || 0).toLocaleString()} Kz</p>
            </div>

            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl">
              <div>
                <p className="text-[10px] font-black uppercase text-secondary">Modo Normal</p>
                <p className="text-[8px] opacity-40 uppercase font-bold">Fichas de Treino Grátis</p>
              </div>
              <p className="text-lg font-black text-secondary">{(user?.saldoNormal || 0).toLocaleString()} Kz Grátis</p>
            </div>
          </div>

          {/* Account Details */}
          <div className="glass p-5 rounded-3xl border-adaptive space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Detalhes da Conta P2P</p>
            
            <div className="flex items-center gap-3 text-xs">
              <Phone size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-[8px] opacity-40 uppercase font-bold">Telemóvel Registado</p>
                <p className="font-bold">{user?.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <MapPin size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-[8px] opacity-40 uppercase font-bold">Província de Angola</p>
                <p className="font-bold">{user?.province}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <Shield size={14} className="text-primary shrink-0" />
              <div>
                <p className="text-[8px] opacity-40 uppercase font-bold">Membro Desde</p>
                <p className="font-bold">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-PT') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Transactions / Movimentos */}
          <div className="glass p-5 rounded-3xl border-adaptive">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Movimentos Financeiros</h3>
            {userMovements.length > 0 ? (
              <div className="space-y-4">
                {userMovements.map((mov) => (
                  <div key={mov.id} className="flex justify-between items-center border-b border-adaptive pb-3 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        mov.type === 'deposito' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {mov.type === 'deposito' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">
                          {mov.type === 'deposito' ? 'Depósito Voucher' : 'Saque Bancário'}
                        </p>
                        <p className="text-[8px] opacity-40 font-bold">{new Date(mov.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-black ${mov.type === 'deposito' ? 'text-success' : 'text-danger'}`}>
                        {mov.type === 'deposito' ? '+' : '-'}{mov.amount.toLocaleString()} Kz
                      </p>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        mov.status === 'aprovado' ? 'bg-success/10 text-success' : 'bg-white/10 text-white/50 animate-pulse'
                      }`}>
                        {mov.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] opacity-40 text-center py-4 font-bold uppercase">Sem movimentos registados.</p>
            )}
          </div>

          {/* Activity logs */}
          <div className="glass p-5 rounded-3xl border-adaptive">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Atividades Recentes</h3>
            {userActivities.length > 0 ? (
              <div className="space-y-3.5 max-h-72 overflow-y-auto scrollbar-hide">
                {userActivities.slice(0, 20).map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs border-l-2 border-primary/20 pl-3">
                    <div>
                      <p className="font-bold opacity-80 leading-relaxed">{act.description}</p>
                      <span className="text-[8px] opacity-40 font-bold block mt-1">
                        {new Date(act.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] opacity-40 text-center py-4 font-bold uppercase">Sem logs de atividade.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ranking' && (
        <div className="glass p-4 rounded-3xl border-adaptive">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Award size={16} /> Rankings Globais Angola
          </h3>
          
          {loadingRank ? (
            <div className="py-12 flex justify-center">
              <RefreshCw className="animate-spin text-primary" size={24} />
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-3">
              {leaderboard.map((player, idx) => (
                <div 
                  key={player.id} 
                  className={`p-3 rounded-2xl flex justify-between items-center bg-white/5 border border-transparent ${
                    player.id === user?.id ? 'border-primary/20 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-black w-5 text-center ${
                      idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'opacity-40'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-xs text-white uppercase">
                        {player.username?.substring(0, 2)}
                      </div>
                      {player.active && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border border-background flex items-center justify-center" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{player.username}</p>
                      <p className="text-[8px] opacity-40 uppercase font-bold flex items-center gap-0.5">
                        <MapPin size={8} /> {player.province}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-primary uppercase">{player.wins || 0} Vitórias</p>
                    <p className="text-[8px] opacity-40 font-bold uppercase">
                      {(player.saldoProfissional || 0).toLocaleString()} Kz
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] opacity-40 text-center py-4 font-bold uppercase">Sem rankings disponíveis.</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
