import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, ShieldAlert, Send, ArrowLeft, User, HelpCircle, MapPin } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, push, set, update } from 'firebase/database';
import { useRenewStore } from '../store/useStore';
import { GlobalChatMessage, PrivateMessage } from '../types';

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useRenewStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Read initial tab if passed from state (e.g. Deposit page clicking Support)
  const initialTab = (location.state as any)?.activeTab || 'community';
  const [activeTab, setActiveTab] = useState<'community' | 'support'>(initialTab);

  const [communityMessages, setCommunityMessages] = useState<GlobalChatMessage[]>([]);
  const [supportMessages, setSupportMessages] = useState<PrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [communityMessages, supportMessages, activeTab]);

  // Listen to Global Community Chat
  useEffect(() => {
    const communityRef = ref(db, 'ludo/chat_geral');
    const unsubscribeComm = onValue(communityRef, (snapshot) => {
      const msgs: GlobalChatMessage[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          msgs.push({ id: child.key!, ...child.val() } as GlobalChatMessage);
        });
      }
      // Sort by timestamp
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setCommunityMessages(msgs);
    });

    return () => unsubscribeComm();
  }, []);

  // Listen to Support Chat (Private under ludo/usuarios/username/chat_suporte)
  useEffect(() => {
    if (!user) return;
    const supportRef = ref(db, `ludo/usuarios/${user.id}/chat_suporte`);
    const unsubscribeSup = onValue(supportRef, (snapshot) => {
      const msgs: PrivateMessage[] = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          msgs.push({ id: child.key!, ...child.val() } as PrivateMessage);
        });
      }
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setSupportMessages(msgs);
    });

    return () => unsubscribeSup();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim()) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      const timestamp = new Date().toISOString();

      if (activeTab === 'community') {
        const commRef = ref(db, 'ludo/chat_geral');
        const newMessageRef = push(commRef);
        await set(newMessageRef, {
          senderName: user.username,
          province: user.province,
          text: textToSend,
          timestamp
        });

        // Activity log
        const activityId = `act_${Date.now()}`;
        await set(ref(db, `ludo/usuarios/${user.id}/atividades/${activityId}`), {
          id: activityId,
          type: 'chat_geral',
          description: `Enviou mensagem no chat público: "${textToSend.substring(0, 20)}..."`,
          timestamp
        });

      } else {
        // Support Chat
        const supportRef = ref(db, `ludo/usuarios/${user.id}/chat_suporte`);
        const newMessageRef = push(supportRef);
        await set(newMessageRef, {
          sender: 'user',
          text: textToSend,
          timestamp
        });

        // Trigger presence
        await update(ref(db, `ludo/usuarios/${user.id}`), { active: true });

        // Activity log
        const activityId = `act_${Date.now()}`;
        await set(ref(db, `ludo/usuarios/${user.id}/atividades/${activityId}`), {
          id: activityId,
          type: 'chat_suporte',
          description: `Contactou o Suporte Oficial.`,
          timestamp
        });

        // Smart Support Automatic Response
        setTimeout(async () => {
          const autoResponseRef = push(supportRef);
          let replyText = 'Olá! Recebemos a sua mensagem no Suporte Oficial. ';
          
          if (textToSend.toLowerCase().includes('voucher') || textToSend.toLowerCase().includes('carreg') || textToSend.toLowerCase().includes('saldo')) {
            replyText += 'Para adquirir vouchers de aposta personalizados, efectue transferência para o IBAN oficial BAI (AO06 0040 0000 8943 2811 1019 4) e envie o comprovativo aqui. O seu saldo será creditado de imediato!';
          } else if (textToSend.toLowerCase().includes('saque') || textToSend.toLowerCase().includes('levant') || textToSend.toLowerCase().includes('pagamento')) {
            replyText += 'Os pedidos de levantamento via IBAN são analisados pela nossa auditoria P2P e creditados no prazo de 2 a 12 horas. Verifique o estado em "Histórico" no seu Perfil.';
          } else {
            replyText += 'Um assistente oficial da arena LUDO Angola está a analisar o seu caso. Responderemos em breve. Obrigado pela paciência!';
          }

          await set(autoResponseRef, {
            sender: 'support',
            text: replyText,
            timestamp: new Date().toISOString()
          });
        }, 1500);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto text-foreground relative pb-16"
    >
      {/* Header */}
      <header className="p-4 border-b border-adaptive bg-background flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 glass rounded-full flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-primary">Canais de Conversa</h1>
            <p className="text-[9px] opacity-40 uppercase font-bold tracking-wider">LUDO P2P Arena</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('community')}
            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'community' ? 'bg-primary text-background' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Comunidade
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'support' ? 'bg-primary text-background' : 'opacity-60 hover:opacity-100'
            }`}
          >
            Suporte Oficial
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {activeTab === 'community' ? (
          communityMessages.length > 0 ? (
            communityMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.senderName === user?.username ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="text-[9px] font-black uppercase text-primary tracking-wider">{msg.senderName}</span>
                  <span className="text-[8px] opacity-40 font-bold flex items-center gap-0.5">
                    <MapPin size={8} /> {msg.province}
                  </span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                    msg.senderName === user?.username
                      ? 'bg-primary text-background rounded-tr-none'
                      : 'glass border-adaptive rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[7px] opacity-35 mt-0.5 px-1 font-bold">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 p-6">
              <MessageSquare size={48} className="text-primary mb-2" />
              <p className="text-xs font-black uppercase tracking-widest">Sem mensagens públicas</p>
              <p className="text-[9px] font-bold mt-1">Sê o primeiro a saudar os outros jogadores de Angola!</p>
            </div>
          )
        ) : (
          supportMessages.length > 0 ? (
            supportMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div className="flex items-center gap-1 mb-1 px-1">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-wider">
                    {msg.sender === 'user' ? 'Tu' : 'Apoio Oficial 🛡️'}
                  </span>
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-secondary text-white rounded-tr-none shadow-md shadow-secondary/10'
                      : 'bg-white/10 border border-white/10 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[7px] opacity-35 mt-0.5 px-1 font-bold">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-3xl border border-adaptive my-4">
              <ShieldAlert size={48} className="text-secondary mb-3 animate-pulse" />
              <p className="text-xs font-black uppercase tracking-widest text-secondary">Chat Privado e Encriptado</p>
              <p className="text-[9px] font-bold opacity-60 mt-1 max-w-[240px] leading-relaxed mx-auto">
                Fale aqui directamente com o agente de suporte oficial para depositar, tirar dúvidas de apostas, saques lentos ou denunciar comportamentos abusivos.
              </p>
            </div>
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-adaptive bg-background flex gap-2">
        <input
          required
          type="text"
          placeholder={activeTab === 'community' ? "Falar na Comunidade..." : "Conversar com o Suporte..."}
          className="flex-1 h-12 glass rounded-2xl px-4 text-xs font-semibold outline-none focus:border-primary transition-colors"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="w-12 h-12 bg-primary text-background rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </motion.div>
  );
}
