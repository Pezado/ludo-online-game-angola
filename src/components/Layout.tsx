import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useRenewStore } from '../store/useStore';
import { useEffect } from 'react';

export default function Layout() {
  const { theme } = useRenewStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen max-w-md mx-auto relative pb-24">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>
      
      <main className="relative z-10">
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  );
}
