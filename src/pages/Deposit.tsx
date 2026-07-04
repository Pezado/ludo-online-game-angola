import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Send, CheckCircle2, Ticket, MessageSquare } from 'lucide-react';
import { db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';
import { useRenewStore } from '../store/useStore';

export default function Deposit() {
  const navigate = useNavigate();
  const { user, setUser } = useRenewStore();
  const [voucherCode, setVoucherCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quick Voucher Seeder for testing
  const handleCreateTestVoucher = async (amount: number) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const code = `LUDO-${amount}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      const voucherRef = ref(db, `ludo/vouchers/${code}`);
      await set(voucherRef, {
        code,
        amount,
        used: false,
        createdAt: new Date().toISOString()
      });
      setVoucherCode(code);
      setSuccess(`Voucher de teste gerado: ${code}. Clique em 'Resgatar' para carregar.`);
    } catch (err) {
      setError('Erro ao gerar voucher de teste.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setError('Por favor introduza o código do Voucher.');
      setLoading(false);
      return;
    }

    try {
      const voucherRef = ref(db, `ludo/vouchers/${code}`);
      const snapshot = await get(voucherRef);

      if (!snapshot.exists()) {
        setError('Voucher inválido ou inexistente na plataforma.');
        setLoading(false);
        return;
      }

      const voucherData = snapshot.val();
      if (voucherData.used) {
        setError('Este voucher já foi utilizado por outro jogador.');
        setLoading(false);
        return;
      }

      const amount = Number(voucherData.amount);
      const newSaldoProfissional = (user.saldoProfissional || 0) + amount;

      // Update User balance and mark voucher as used in a single atomic transaction or updates
      const updates: any = {};
      updates[`ludo/vouchers/${code}/used`] = true;
      updates[`ludo/vouchers/${code}/usedBy`] = user.id;
      updates[`ludo/vouchers/${code}/usedAt`] = new Date().toISOString();
      updates[`ludo/usuarios/${user.id}/saldoProfissional`] = newSaldoProfissional;

      // Add movement log
      const movementId = `mov_${Date.now()}`;
      updates[`ludo/usuarios/${user.id}/movimentos/${movementId}`] = {
        id: movementId,
        type: 'deposito',
        amount,
        status: 'aprovado',
        method: 'Voucher',
        voucherCode: code,
        date: new Date().toISOString()
      };

      // Add activity log
      const activityId = `act_${Date.now()}`;
      updates[`ludo/usuarios/${user.id}/atividades/${activityId}`] = {
        id: activityId,
        type: 'deposito_voucher',
        description: `Carregou ${amount.toLocaleString()} Kz via voucher ${code}.`,
        timestamp: new Date().toISOString(),
        amount
      };

      await update(ref(db), updates);

      // Trigger presence / active status update
      await update(ref(db, `ludo/usuarios/${user.id}`), { active: true });

      setSuccess(`Sucesso! Carregou ${amount.toLocaleString()} Kz na sua carteira de apostas.`);
      setVoucherCode('');
      setUser({ ...user, saldoProfissional: newSaldoProfissional });
    } catch (err: any) {
      console.error('Voucher redeem error:', err);
      setError('Erro ao processar resgate. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-6 pb-24 min-h-screen text-foreground"
    >
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-md font-black uppercase tracking-widest text-primary">Carregar Carteira</h1>
          <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Voucher P2P Angola</p>
        </div>
      </header>

      {/* Wallet Balance Card */}
      <section className="mb-6">
        <div className="glass p-5 rounded-3xl bg-primary/5 border-primary/20 text-center">
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Saldo de Apostas Actual</p>
          <p className="text-3xl font-black text-primary mt-1">{(user?.saldoProfissional || 0).toLocaleString()} Kz</p>
          <p className="text-[9px] opacity-40 font-bold mt-1 uppercase">MODO PROFISSIONAL (REAL)</p>
        </div>
      </section>

      {/* Main Form */}
      <section className="space-y-6">
        <div className="glass p-5 rounded-3xl border-adaptive">
          <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
            <Ticket size={16} /> Resgatar Voucher
          </h3>
          
          <form onSubmit={handleRedeemVoucher} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Código do Voucher</label>
              <input 
                type="text" 
                placeholder="LUDO-XXXX-XXX"
                className="w-full h-14 glass rounded-2xl px-4 text-center font-mono font-black text-lg outline-none focus:border-primary transition-colors uppercase tracking-widest"
                value={voucherCode}
                onChange={e => setVoucherCode(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-danger uppercase tracking-widest text-center">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} /> {success}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Resgatar Voucher <Send size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Quick Testing Voucher Creator */}
        <div className="glass p-5 rounded-3xl border-dashed border-primary/30 bg-primary/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">🛠️ Teste de Depósito (Simulador)</p>
          <p className="text-[9px] opacity-60 mb-4 leading-relaxed font-semibold">
            Como não há gateways bancários reais neste ambiente, use o simulador abaixo para gerar vouchers válidos instantaneamente e testar o carregamento da carteira de apostas.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[500, 1000, 5000].map(amount => (
              <button
                key={amount}
                onClick={() => handleCreateTestVoucher(amount)}
                className="h-10 bg-white/5 border border-white/10 hover:border-primary rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-95"
              >
                +{amount} Kz
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Info Card */}
        <div className="glass p-5 rounded-3xl border-adaptive flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-secondary mb-2 flex items-center gap-2">
              <MessageSquare size={16} /> Comprar Voucher Oficial
            </h3>
            <p className="text-[10px] opacity-60 leading-relaxed font-semibold mb-4">
              Para obter vouchers de recarga personalizados, fale directamente com o nosso suporte oficial na plataforma de chat privado e seguro. O suporte funciona 24/7 para Angola.
            </p>
          </div>
          <button
            onClick={() => navigate('/chat', { state: { activeTab: 'support' } })}
            className="w-full h-12 bg-secondary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors active:scale-95"
          >
            Falar com o Suporte Oficial
          </button>
        </div>
      </section>
    </motion.div>
  );
}
