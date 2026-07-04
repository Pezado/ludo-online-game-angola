import React, { useEffect, useState, Component, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Splash from './pages/Splash';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import { useRenewStore } from './store/useStore';
import { useProfitSync } from './hooks/useProfitSync';
import { db } from './firebase';
import { ref, onValue, update } from 'firebase/database';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, errorInfo: null };
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center text-foreground">
          <div className="glass p-8 rounded-3xl max-w-md border-danger/10">
            <h2 className="text-xl font-black text-danger mb-4 uppercase tracking-widest">Algo correu mal</h2>
            <p className="text-sm opacity-60 mb-6 leading-relaxed">
              Ocorreu um erro inesperado na Arena LUDO. Por favor, recarregue a página ou contacte o suporte oficial.
            </p>
            <pre className="text-[10px] bg-black/30 p-4 rounded-xl overflow-auto text-left mb-6 opacity-50">
              {this.state.errorInfo}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-primary text-background rounded-xl font-black uppercase tracking-widest text-xs"
            >
              Recarregar Plataforma
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { user, setUser } = useRenewStore();
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Sync user presence heartbeat
  useProfitSync();

  useEffect(() => {
    const storedUsername = localStorage.getItem('ludo_logged_username');
    
    if (storedUsername) {
      const userRef = ref(db, `ludo/usuarios/${storedUsername.toLowerCase()}`);
      
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUser({ id: snapshot.key!, ...userData });
        } else {
          localStorage.removeItem('ludo_logged_username');
          setUser(null);
        }
        setIsAuthReady(true);
      }, (error) => {
        console.error('User RTDB sync error:', error);
        setIsAuthReady(true);
      });

      return () => {
        unsubscribeUser();
      };
    } else {
      setUser(null);
      setIsAuthReady(true);
    }
  }, [setUser]);

  // Set user offline when leaving or closing tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      const storedUsername = localStorage.getItem('ludo_logged_username');
      if (storedUsername) {
        // Set active state to false (synchronous-like, or best effort)
        const userRef = ref(db, `ludo/usuarios/${storedUsername.toLowerCase()}`);
        update(userRef, { active: false }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/splash" element={<Splash />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Splash />} />

          {/* Protected Routes inside Mobile Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/splash" />} />
            <Route path="/deposit" element={user ? <Deposit /> : <Navigate to="/splash" />} />
            <Route path="/withdraw" element={user ? <Withdraw /> : <Navigate to="/splash" />} />
            <Route path="/chat" element={user ? <Chat /> : <Navigate to="/splash" />} />
            <Route path="/profile" element={user ? <Profile /> : <Navigate to="/splash" />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
