import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Lock, ArrowRight } from 'lucide-react';
import { db } from '../firebase';
import { useRenewStore } from '../store/useStore';
import { ref, get, set } from 'firebase/database';

export const PROVINCES = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando Cubango',
  'Cuando Cubango Oeste',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cunene',
  'Huambo',
  'Huíla',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Malanje Leste',
  'Moxico',
  'Moxico Leste',
  'Namibe',
  'Uíge',
  'Zaire'
];

export default function Register() {
  const navigate = useNavigate();
  const { setUser } = useRenewStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    province: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Username validation: single word, no spaces, letters/numbers only
    const cleanUsername = formData.username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Por favor introduza um nome de usuário.');
      setLoading(false);
      return;
    }
    if (cleanUsername.includes(' ') || !/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError('O Nome de Usuário deve ter apenas 1 palavra (sem espaços ou caracteres especiais).');
      setLoading(false);
      return;
    }

    // 2. Phone validation: exactly 9 digits
    const cleanPhone = formData.phone.trim().replace(/\s+/g, '');
    if (!/^\d{9}$/.test(cleanPhone)) {
      setError('O Número de Telefone deve ter exatamente 9 dígitos (exclusivo de Angola).');
      setLoading(false);
      return;
    }

    // 3. Province validation
    if (!formData.province) {
      setError('Por favor selecione a sua província.');
      setLoading(false);
      return;
    }

    // 4. Password validation
    if (formData.password.length < 4) {
      setError('A senha deve ter pelo menos 4 caracteres.');
      setLoading(false);
      return;
    }

    try {
      // Check if user already exists
      const userRef = ref(db, `ludo/usuarios/${cleanUsername}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        setError('Este Nome de Usuário já está registado. Escolha outro.');
        setLoading(false);
        return;
      }

      // Create new user in DB
      const newUser = {
        id: cleanUsername,
        username: formData.username.trim(), // original casing for display
        phone: `+244${cleanPhone}`,
        province: formData.province,
        password: formData.password,
        saldoNormal: 10000, // 10k free Kz Grátis to start
        saldoProfissional: 0, // starts at 0 Real AOA
        active: true,
        wins: 0,
        losses: 0,
        totalGames: 0,
        createdAt: new Date().toISOString()
      };

      await set(userRef, newUser);

      // Save to local activities
      const activityId = `act_${Date.now()}`;
      await set(ref(db, `ludo/usuarios/${cleanUsername}/atividades/${activityId}`), {
        id: activityId,
        type: 'registro',
        description: 'Criou conta na plataforma LUDO Angola.',
        timestamp: new Date().toISOString()
      });

      // Welcome pop-up triggered by login
      localStorage.setItem('ludo_show_welcome', 'true');
      localStorage.setItem('ludo_logged_username', cleanUsername);
      
      setUser(newUser);
      navigate('/');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError('Erro ao criar conta. Verifique a sua ligação à internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="px-6 pt-8 pb-12 min-h-screen flex flex-col justify-between"
    >
      <div>
        <header className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/splash')} className="w-10 h-10 glass rounded-full flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-primary">Registo P2P</h1>
            <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">LUDO PROFISSIONAL ANGOLA</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Nome de Usuário (Apenas 1 nome)</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-primary" size={18} />
              <input 
                required
                type="text" 
                placeholder="Ex: joao, dany, ludo_pro"
                className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors uppercase tracking-wider"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Número de Telefone (Angola)</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-black text-primary">+244</span>
              <input 
                required
                type="tel" 
                maxLength={9}
                placeholder="9xxxxxxxx"
                className="w-full h-14 glass rounded-2xl pl-16 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
              />
            </div>
            <p className="text-[9px] opacity-45 ml-1 font-semibold">Introduza exatamente os 9 dígitos exclusivos de Angola.</p>
          </div>

          {/* Province */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Província (Angola)</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-primary" size={18} />
              <select 
                required
                className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors appearance-none bg-background/50 text-foreground"
                value={formData.province}
                onChange={e => setFormData({...formData, province: e.target.value})}
              >
                <option value="" disabled className="text-muted-foreground bg-background">Selecionar Província</option>
                {PROVINCES.map(p => (
                  <option key={p} value={p} className="bg-background text-foreground font-bold">{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest ml-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-primary" size={18} />
              <input 
                required
                type="password" 
                placeholder="••••"
                className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl">
              <p className="text-[10px] font-bold text-danger uppercase tracking-widest text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary text-background rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Confirmar Registo
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center space-y-4">
        <Link to="/splash" className="text-[11px] font-black uppercase text-primary tracking-widest hover:underline">
          Já tenho uma conta? Entrar
        </Link>
        <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest leading-relaxed">
          Ao registar-se, declara ter mais de 18 anos e aceita as directrizes de apostas P2P de Angola.
        </p>
      </div>
    </motion.div>
  );
}
