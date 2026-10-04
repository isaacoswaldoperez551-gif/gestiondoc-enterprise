import React, { useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { AdminDashboard } from './views/AdminDashboard';
import { UserDashboard } from './views/UserDashboard';
import { MustChangePasswordModal } from './components/MustChangePasswordModal';
import { seedFirestoreDatabaseIfEmpty } from './services/firestoreService';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('docu_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false; // Default to clean light mode
  });

  useEffect(() => {
    // Seed initial collections to user Firestore if empty
    seedFirestoreDatabaseIfEmpty();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Direct Firestore Presence Updater - Works instantly without login/logout required!
    const updatePresenceOnline = async () => {
      try {
        const nowIso = new Date().toISOString();
        await setDoc(
          doc(db, 'sesiones_activas', user.id),
          {
            id: user.id,
            usuarioId: user.id,
            nombreUsuario: user.name,
            correoUsuario: user.email,
            rolUsuario: user.role,
            departamento: user.department || 'General',
            estaEnLinea: true,
            fechaInicio: nowIso,
            ultimaActividad: nowIso,
          },
          { merge: true }
        );

        await setDoc(
          doc(db, 'usuarios', user.id),
          {
            id: user.id,
            nombre: user.name,
            correo: user.email,
            rol: user.role,
            estado: 'activo',
            estaEnLinea: true,
            ultimaConexion: nowIso,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('Error updating online presence in Firestore:', err);
      }
    };

    const updatePresenceOffline = async () => {
      try {
        await setDoc(
          doc(db, 'sesiones_activas', user.id),
          {
            estaEnLinea: false,
            ultimaActividad: new Date().toISOString(),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'usuarios', user.id),
          {
            estaEnLinea: false,
            estado: 'inactivo',
            ultimaConexion: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        // Ignore unload errors
      }
    };

    // Mark online immediately on page load / session restore
    updatePresenceOnline();

    // Heartbeat ping every 10 seconds to keep online status fresh
    const heartbeatInterval = setInterval(() => {
      updatePresenceOnline();
    }, 10000);

    // Tab visibility changes: refresh presence when coming back
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresenceOnline();
      }
    };

    // Unload (window/tab closing): Send reliable beacon
    const handleUnload = () => {
      try {
        navigator.sendBeacon('/api/auth/logout');
      } catch (e) {
        // Ignore
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('docu_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('docu_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm animate-pulse shadow-md shadow-indigo-500/20">
            GD
          </div>
          <p className="text-xs font-medium text-slate-500">Cargando GestiónDoc...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  return (
    <>
      {user.mustChangePassword && <MustChangePasswordModal />}
      {user.role === 'admin' ? (
        <AdminDashboard darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      ) : (
        <UserDashboard darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      )}
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
