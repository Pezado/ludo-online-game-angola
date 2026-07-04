import { useEffect } from 'react';
import { useRenewStore } from '../store/useStore';
import { db } from '../firebase';
import { ref, update } from 'firebase/database';

export function useProfitSync() {
  const { user } = useRenewStore();

  useEffect(() => {
    if (!user) return;

    // Keep active state true in DB while user is in the app
    const userRef = ref(db, `ludo/usuarios/${user.id}`);
    
    // Mark online
    update(userRef, { active: true }).catch((err) => {
      console.error('Error setting presence online:', err);
    });

    const interval = setInterval(() => {
      update(userRef, { active: true }).catch((err) => {
        console.error('Presence heartbeat error:', err);
      });
    }, 30000); // Heartbeat every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);
}
