import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Zap, TrendingUp, HelpCircle, Lock, Info, Globe, CheckCircle2 } from 'lucide-react';

export default function About() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Como Funciona a Empresa",
      icon: <Globe className="text-primary" />,
      content: "A LUCRO EXPRESS é uma plataforma de investimento gerida pela comunidade Renew Invest (Sócios e Acionistas de energias renováveis), focada na transição energética de Angola. Financiamos projetos de energia solar, eólica e hídrica, permitindo que cidadãos comuns participem nos lucros da infraestrutura nacional."
    },
    {
      title: "Como Investir",
      icon: <Zap className="text-secondary" />,
      content: "Escolha um plano no mercado (Market), insira o valor desejado (respeitando o mínimo) e confirme. O seu capital será alocado a projetos reais e começará a render lucros diários imediatamente através da gestão da comunidade Renew Invest."
    },
    {
      title: "Depósitos e Levantamentos",
      icon: <TrendingUp className="text-success" />,
      content: "Depósitos são feitos via Vouchers adquiridos com agentes oficiais. Levantamentos podem ser solicitados via Multicaixa Express, IBAN, Unitel Money ou PayPal África após a conclusão de pelo menos um ciclo de investimento."
    },
    {
      title: "Processamento de Lucros",
      icon: <CheckCircle2 className="text-primary" />,
      content: "Os lucros são calculados e creditados na sua conta a cada 24 horas. Cada plano tem uma percentagem de rendimento fixo que é distribuída ao longo da duração do contrato. Os benefícios incluem rendimento passivo estável e a valorização do seu capital em projetos de infraestrutura essencial."
    },
    {
      title: "Importância da Plataforma",
      icon: <Info className="text-secondary" />,
      content: "A LUCRO EXPRESS é vital para a democratização do investimento em Angola. Ao investir, você não só ganha dinheiro, mas também ajuda a reduzir a dependência de combustíveis fósseis e a levar energia para comunidades remotas."
    },
    {
      title: "Segurança e Autenticação",
      icon: <Lock className="text-accent" />,
      content: "Utilizamos criptografia SSL de 256 bits e autenticação segura. Seus dados bancários e pessoais são protegidos por rigorosos protocolos de privacidade e nunca são partilhados com terceiros."
    },
    {
      title: "Política de Privacidade",
      icon: <Shield className="text-primary" />,
      content: "Respeitamos a Lei de Proteção de Dados. Coletamos apenas o necessário para processar seus investimentos e garantir a segurança das transações financeiras."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 pt-8 pb-24 min-h-screen"
    >
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="w-10 h-10 glass rounded-full flex items-center justify-center">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-black uppercase tracking-widest">Sobre a Plataforma</h1>
      </header>

      <div className="space-y-6">
        <div className="glass p-6 rounded-[2.5rem] solar-gradient text-center mb-8">
          <h2 className="text-2xl font-black mb-2 uppercase tracking-tight">LUCRO EXPRESS</h2>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Gerida pela Comunidade Renew Invest</p>
        </div>

        {sections.map((section, idx) => (
          <motion.section
            key={idx}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="glass p-6 rounded-3xl border-primary/5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                {section.icon}
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">{section.title}</h3>
            </div>
            <p className="text-xs font-bold opacity-60 leading-relaxed uppercase">
              {section.content}
            </p>
          </motion.section>
        ))}

        <section className="glass p-6 rounded-3xl border-primary/20 bg-primary/5">
          <div className="flex items-center gap-3 mb-4">
            <Info className="text-primary" />
            <h3 className="text-sm font-black uppercase tracking-widest">Direitos Autorais</h3>
          </div>
          <p className="text-[10px] font-bold opacity-40 uppercase leading-relaxed">
            © 2026 Angola Green Energy Group. Todos os direitos reservados. A marca LUCRO EXPRESS e seus logotipos são marcas registadas da comunidade Renew Invest. O uso não autorizado de qualquer conteúdo desta plataforma é estritamente proibido.
          </p>
        </section>

        <div className="p-8 text-center opacity-30">
          <HelpCircle size={48} className="mx-auto mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">Dúvidas? Contacte o suporte oficial via chat.</p>
        </div>
      </div>
    </motion.div>
  );
}
