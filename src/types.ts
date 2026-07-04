export type Currency = 'AOA';

export interface User {
  id: string; // The username in lowercase (primary key used in RTDB path "ludo/usuarios/<username>")
  username: string; // Original username (display name)
  phone: string; // e.g. "+2449XXXXXXXX" (Angola exclusive, 9 digits after +244)
  province: string; // Angola province
  saldoNormal: number; // Free chips (Modo Normal)
  saldoProfissional: number; // Real Kwanza (Modo Profissional)
  active: boolean; // Tracking online state
  wins: number;
  losses: number;
  totalGames: number;
  createdAt: string;
  isAdmin?: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'registro' | 'login' | 'logout' | 'deposito_voucher' | 'solicitacao_saque' | 'partida_criada' | 'partida_vitoria' | 'partida_derrota' | 'chat_geral' | 'chat_suporte';
  description: string;
  timestamp: string;
  amount?: number;
  mode?: 'normal' | 'profissional';
}

export interface Transaction {
  id: string;
  type: 'deposito' | 'saque';
  amount: number;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  date: string;
  method: string; // e.g. "Voucher" or "IBAN"
  voucherCode?: string;
  iban?: string;
  bankName?: string;
  holderName?: string;
}

export interface PrivateMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface GlobalChatMessage {
  id: string;
  senderName: string;
  province: string;
  text: string;
  timestamp: string;
  isSupport?: boolean;
}

export interface LudoMatch {
  id: string; // unique ID
  hostUsername: string;
  guestUsername: string | null;
  hostPhone: string;
  guestPhone: string | null;
  hostProvince: string;
  guestProvince: string | null;
  status: 'waiting' | 'confirming' | 'playing' | 'finished';
  mode: 'normal' | 'profissional';
  betAmount: number;
  hostConfirmed: boolean;
  guestConfirmed: boolean;
  
  // Game Play State
  pieces: {
    host: number[]; // positions of 4 pieces (0 to 3), -1 = base, 0 = entry tile, 1..50 = main track, 51..55 = home stretch, 56 = goal
    guest: number[]; // same for guest
  };
  passedPenalties: {
    host: boolean; // if host has been captured, they enter 1 piece at a time
    guest: boolean; // same for guest
  };
  turn: 'host' | 'guest';
  dice: number[] | null; // values e.g. [3, 5]
  diceUsed: boolean[]; // tracks if dice[0] and dice[1] are used (e.g. [false, false])
  rolledDoubleCount: number; // tracks consecutive doubles
  rerollDieOnly: boolean; // if they rolled a single 6 and repeat, they roll ONLY 1 die
  
  // Timers and metadata
  turnStartedAt: number; // timestamp
  winner: string | null;
  createdAt: string;
  
  // Private chat
  chat?: Record<string, PrivateMessage>;
}

export interface AppState {
  user: User | null;
  theme: 'light' | 'dark';
  currentMatch: LudoMatch | null;
}
