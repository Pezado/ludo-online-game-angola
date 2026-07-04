import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle2, Wallet, CreditCard, Landmark, Smartphone, PhoneCall, Gift } from 'lucide-react';
import { db } from '../firebase';
import { ref, update } from 'firebase/database';
import { useRenewStore } from '../store/useStore';

const ANGOLAN_BANKS = [
  'BAI - Banco Angolano de Investimentos',
  'BFA - Banco de Fomento Angola',
  'BIC - Banco BIC',
  'BMA - Banco Millennium Angola',
  'SOL - Banco Sol',
  'SBA - Standard Bank Angola',
  'KEVE - Banco Keve',
  'ATL - Banco Caixa Geral Angola',
  'BCI - Banco de Comércio e Indústria',
  'YETU - Banco de Investimento Rural (BIR)',
  'BCH - Banco de Crédito do Sul'
];

const BETTING_HOUSES = [
  'BANTU BET',
  'ELEPHANT BET',
  'KWANZA BET',
  'PREMIER BET'
];

type WithdrawMethod = 'iban' | 'express' | 'paypal' | 'unitel' | 'voucher';

export default function Withdraw() {
  const navigate = useNavigate();
  const { user, setUser } = useRenewStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [activeMethod, setActiveMethod] = useState<WithdrawMethod>('iban');

  const [formData, setFormData] = useState({
    amount: '',
    // IBAN specific fields
    iban: 'AO06',
    bankName: '',
    holderName: '',
    // Multicaixa Express specific fields
    expressPhone: '',
    // PayPal Ao specific fields
    paypalPhone: '',
    paypalFullName: '',
    // Unitel Money specific fields
    unitelPhone: '',
    unitelFullName: '',
    // Voucher specific fields
    voucherPhone: '',
    bettingHouse: ''
  });

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    const withdrawAmt = Number(formData.amount);
    if (!withdrawAmt || withdrawAmt <= 0) {
      setError('Por favor introduza um valor de saque válido.');
      setLoading(false);
      return;
    }

    if (withdrawAmt > (user.saldoProfissional || 0)) {
      setError('Saldo insuficiente para efetuar este saque.');
      setLoading(false);
      return;
    }

    // Prepare transaction payload based on selected method
    let transactionDetails: any = {
      id: `tx_saque_${Date.now()}`,
      userId: user.id,
      username: user.username,
      phone: user.phone,
      amount: withdrawAmt,
      status: 'pendente',
      date: new Date().toISOString()
    };

    if (activeMethod === 'iban') {
      const cleanIban = formData.iban.trim().replace(/\s+/g, '');
      if (cleanIban.length !== 25 || !/^AO06\d{21}$/i.test(cleanIban)) {
        setError('IBAN inválido. Deve começar com AO06 e conter mais 21 dígitos (25 caracteres).');
        setLoading(false);
        return;
      }
      if (!formData.bankName) {
        setError('Por favor selecione o seu banco.');
        setLoading(false);
        return;
      }
      if (!formData.holderName.trim()) {
        setError('Por favor introduza o nome do titular da conta.');
        setLoading(false);
        return;
      }
      transactionDetails = {
        ...transactionDetails,
        method: 'IBAN',
        iban: cleanIban,
        bankName: formData.bankName,
        holderName: formData.holderName
      };
    } else if (activeMethod === 'express') {
      const phone = formData.expressPhone.trim();
      if (!phone || phone.length < 9) {
        setError('Por favor introduza o número de telemóvel registado no Multicaixa Express.');
        setLoading(false);
        return;
      }
      transactionDetails = {
        ...transactionDetails,
        method: 'Multicaixa Express',
        expressPhone: phone
      };
    } else if (activeMethod === 'paypal') {
      const phone = formData.paypalPhone.trim();
      const name = formData.paypalFullName.trim();
      if (!phone || !name) {
        setError('Por favor preencha o número de telemóvel e nome completo do PayPal Ao.');
        setLoading(false);
        return;
      }
      transactionDetails = {
        ...transactionDetails,
        method: 'PayPal Ao',
        paypalPhone: phone,
        paypalFullName: name
      };
    } else if (activeMethod === 'unitel') {
      const phone = formData.unitelPhone.trim();
      const name = formData.unitelFullName.trim();
      if (!phone || !name) {
        setError('Por favor preencha o número de telemóvel e nome completo do Unitel Money.');
        setLoading(false);
        return;
      }
      transactionDetails = {
        ...transactionDetails,
        method: 'Unitel Money',
        unitelPhone: phone,
        unitelFullName: name
      };
    } else if (activeMethod === 'voucher') {
      const phone = formData.voucherPhone.trim();
      const house = formData.bettingHouse;
      if (!phone || !house) {
        setError('Por favor preencha o número de telemóvel e selecione a casa de apostas para o Voucher.');
        setLoading(false);
        return;
      }
      transactionDetails = {
        ...transactionDetails,
        method: 'Voucher',
        voucherPhone: phone,
        bettingHouse: house
      };
    }

    try {
      const newSaldo = (user.saldoProfissional || 0) - withdrawAmt;
      const updates: any = {};
      const txId = transactionDetails.id;

      // Update user balance
      updates[`ludo/usuarios/${user.id}/saldoProfissional`] = newSaldo;

      // Log in user's movements
      updates[`ludo/usuarios/${user.id}/movimentos/${txId}`] = transactionDetails;

      // Log in global pending list
      updates[`ludo/saques_pendentes/${txId}`] = transactionDetails;

      // Activity log description
      let actDesc = `Solicitou levantamento de ${withdrawAmt.toLocaleString()} Kz via ${transactionDetails.method}.`;
      if (activeMethod === 'voucher') {
        actDesc = `Solicitou Voucher de ${withdrawAmt.toLocaleString()} Kz para ${transactionDetails.bettingHouse}.`;
      }

      const activityId = `act_${Date.now()}`;
      updates[`ludo/usuarios/${user.id}/atividades/${activityId}`] = {
        id: activityId,
        type: 'solicitacao_saque',
        description: actDesc,
        timestamp: new Date().toISOString(),
        amount: withdrawAmt
      };

      await update(ref(db), updates);

      // Trigger user active update
      await update(ref(db, `ludo/usuarios/${user.id}`), { active: true });

      setSuccess(`Solicitação de saque enviada! O valor de ${withdrawAmt.toLocaleString()} Kz foi retido e está em aprovação. Prazo: 2 a 12 horas.`);
      
      // Reset form amounts
      setFormData(prev => ({
        ...prev,
        amount: '',
        expressPhone: '',
        paypalPhone: '',
        paypalFullName: '',
        unitelPhone: '',
        unitelFullName: '',
        voucherPhone: '',
        bettingHouse: ''
      }));

      setUser({ ...user, saldoProfissional: newSaldo });
    } catch (err: any) {
      console.error('Saque error:', err);
      setError('Erro ao processar solicitação. Tente novamente.');
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
          <h1 className="text-md font-black uppercase tracking-widest text-primary">Efetuar Levantamento</h1>
          <p className="text-[10px] opacity-50 uppercase font-bold tracking-wider">Canais Angolanos Suportados</p>
        </div>
      </header>

      {/* Balance display */}
      <section className="mb-6">
        <div className="glass p-5 rounded-3xl bg-primary/5 border-primary/20 text-center">
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Saldo Disponível para Saque</p>
          <p className="text-3xl font-black text-primary mt-1">{(user?.saldoProfissional || 0).toLocaleString()} Kz</p>
          <p className="text-[9px] opacity-40 font-bold mt-1 uppercase">Processamento Seguro P2P</p>
        </div>
      </section>

      {/* Multi-method visual tabs */}
      <section className="mb-6 overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2 min-w-max pb-2">
          {[
            { id: 'iban', label: 'IBAN', icon: Landmark },
            { id: 'express', label: 'MC Express', icon: CreditCard },
            { id: 'paypal', label: 'PayPal Ao', icon: Wallet },
            { id: 'unitel', label: 'Unitel Money', icon: Smartphone },
            { id: 'voucher', label: 'Voucher', icon: Gift }
          ].map(m => {
            const Icon = m.icon;
            const isSelected = activeMethod === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMethod(m.id as WithdrawMethod);
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  isSelected 
                    ? 'bg-primary border-primary text-background shadow-lg shadow-primary/20' 
                    : 'bg-white/5 border-white/10 text-white opacity-60 hover:opacity-100'
                }`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Form Area */}
      <section className="space-y-6">
        <div className="glass p-5 rounded-3xl border-adaptive">
          <form onSubmit={handleWithdrawSubmit} className="space-y-5">
            {/* Amount Field (common for all channels) */}
            <div className="space-y-2">
              <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Valor a Retirar (Kz)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-primary">Kz</span>
                <input 
                  required
                  type="number" 
                  placeholder="Introduza o valor"
                  className="w-full h-14 glass rounded-2xl pl-12 pr-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            {/* IBAN fields */}
            {activeMethod === 'iban' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">IBAN de Destino (Começa com AO06)</label>
                  <input 
                    required
                    type="text" 
                    maxLength={25}
                    placeholder="AO06 0000 0000 0000 0000 0000 0"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-mono font-bold outline-none focus:border-primary transition-colors"
                    value={formData.iban}
                    onChange={e => setFormData({...formData, iban: e.target.value.replace(/\s+/g, '').toUpperCase()})}
                  />
                  <p className="text-[8px] opacity-40 ml-1 font-semibold uppercase">Exatamente 25 caracteres iniciando com AO06.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Banco Angolano</label>
                  <select 
                    required
                    className="w-full h-14 glass rounded-2xl px-4 text-xs font-bold outline-none focus:border-primary transition-colors bg-background text-foreground"
                    value={formData.bankName}
                    onChange={e => setFormData({...formData, bankName: e.target.value})}
                  >
                    <option value="" disabled className="text-muted-foreground bg-background">Selecionar Banco</option>
                    {ANGOLAN_BANKS.map(b => (
                      <option key={b} value={b} className="bg-background text-foreground font-bold">{b}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Nome do Titular</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Manuel Francisco"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                    value={formData.holderName}
                    onChange={e => setFormData({...formData, holderName: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Multicaixa Express Fields */}
            {activeMethod === 'express' && (
              <div className="space-y-2">
                <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Número de Telemóvel registado no Express</label>
                <input 
                  required
                  type="tel" 
                  maxLength={15}
                  placeholder="Ex: 9XXXXXXXX"
                  className="w-full h-14 glass rounded-2xl px-4 text-sm font-mono font-bold outline-none focus:border-primary transition-colors"
                  value={formData.expressPhone}
                  onChange={e => setFormData({...formData, expressPhone: e.target.value})}
                />
                <p className="text-[8px] opacity-40 ml-1 font-semibold uppercase">O número associado ao seu cartão no Multicaixa Express.</p>
              </div>
            )}

            {/* PayPal Ao Fields */}
            {activeMethod === 'paypal' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Número de Telemóvel PayPal Ao</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="Ex: 923 000 000"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-mono font-bold outline-none focus:border-primary transition-colors"
                    value={formData.paypalPhone}
                    onChange={e => setFormData({...formData, paypalPhone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Manuel Francisco Santos"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                    value={formData.paypalFullName}
                    onChange={e => setFormData({...formData, paypalFullName: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Unitel Money Fields */}
            {activeMethod === 'unitel' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Número de Telemóvel Unitel</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="Ex: 923 000 000"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-mono font-bold outline-none focus:border-primary transition-colors"
                    value={formData.unitelPhone}
                    onChange={e => setFormData({...formData, unitelPhone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Nome Completo do Titular</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Manuel Francisco Santos"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-bold outline-none focus:border-primary transition-colors"
                    value={formData.unitelFullName}
                    onChange={e => setFormData({...formData, unitelFullName: e.target.value})}
                  />
                </div>
              </>
            )}

            {/* Voucher Fields */}
            {activeMethod === 'voucher' && (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Número de Telemóvel</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="Ex: 923 000 000"
                    className="w-full h-14 glass rounded-2xl px-4 text-sm font-mono font-bold outline-none focus:border-primary transition-colors"
                    value={formData.voucherPhone}
                    onChange={e => setFormData({...formData, voucherPhone: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold opacity-40 uppercase tracking-widest ml-1">Casa de Apostas para Receber</label>
                  <select 
                    required
                    className="w-full h-14 glass rounded-2xl px-4 text-xs font-bold outline-none focus:border-primary transition-colors bg-background text-foreground"
                    value={formData.bettingHouse}
                    onChange={e => setFormData({...formData, bettingHouse: e.target.value})}
                  >
                    <option value="" disabled className="text-muted-foreground bg-background">Selecionar Casa de Apostas</option>
                    {BETTING_HOUSES.map(h => (
                      <option key={h} value={h} className="bg-background text-foreground font-bold">{h}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Message prompts */}
            {error && (
              <div className="bg-danger/10 border border-danger/20 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-danger uppercase tracking-widest">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-relaxed flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" /> {success}
                </p>
              </div>
            )}

            {/* Action button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-primary text-background rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Solicitar Levantamento <Send size={14} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Alert */}
        <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-semibold opacity-60 leading-relaxed">
          <p className="uppercase font-bold text-primary mb-1">🚨 Termos e Condições de Levantamentos em Angola</p>
          <p>
            O levantamento será processado estritamente para os dados fornecidos. Certifique-se de que os números de telemóvel e nomes correspondem aos seus registos oficiais. Qualquer fraude resultará no banimento permanente da arena.
          </p>
        </div>
      </section>
    </motion.div>
  );
}
