import React, { ReactNode } from 'react';
import { Home, ArrowDownLeft, MessageCircle, User, CreditCard } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useRenewStore } from '../store/useStore';

export default function BottomNav() {
  const navigate = useNavigate();
  const { currentMatch } = useRenewStore();

  // If in active playing game, hide bottom navigation to prevent leaving/fraud and maximize screen space
  if (currentMatch && currentMatch.status === 'playing') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
      <div className="max-w-md mx-auto relative pointer-events-auto">
        {/* FAB for Deposit */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/deposit')}
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-14 h-14 bg-primary text-background rounded-full shadow-lg shadow-primary/30 flex items-center justify-center z-20"
          title="Depositar por Voucher"
        >
          <CreditCard size={28} strokeWidth={2.5} />
        </motion.button>

        {/* Nav Bar */}
        <nav className="glass rounded-3xl h-16 flex items-center justify-around px-2 shadow-2xl">
          <NavItem to="/" icon={<Home size={22} />} label="Início" />
          <NavItem to="/withdraw" icon={<ArrowDownLeft size={22} />} label="Sacar" />
          <div className="w-12" /> {/* Spacer for FAB */}
          <NavItem to="/chat" icon={<MessageCircle size={22} />} label="Chat" />
          <NavItem to="/profile" icon={<User size={22} />} label="Perfil" />
        </nav>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-all duration-300 ${
          isActive ? 'text-primary' : 'opacity-40'
        }`
      }
    >
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
    </NavLink>
  );
}
