import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../../configurazione/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { richiediPermessoNotifiche } from '../../servizi/notificheService';

// Tipo per l'utente
export interface User {
  id: string;
  nome: string;
  ruolo: 'admin' | 'coordinatore' | 'moderatore' | 'giocatore';
  vicinati: string[];
  pin: number;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (pin: number) => Promise<string>;
  logout: () => Promise<void>;
  getInitialRoute: () => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato all\'interno di AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Funzione per ottenere la route iniziale in base al ruolo
  const getInitialRoute = (user: User | null): string => {
    if (!user) return '/login';
    // Tutti gli utenti vengono reindirizzati alla pagina degli annunci
    return '/welcome';
  };

  // Funzione per il login con PIN
  const login = useCallback(async (pin: number) => {
    try {
      const pinString = pin.toString();
      // Verifica la lunghezza del PIN prima di fare la query
      if (pinString.length !== 6 && pinString.length !== 10) {
        throw new Error('PIN non valido');
      }

      const q = query(collection(db, 'utenti'), where('pin', '==', pin));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('PIN non valido');
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data() as Omit<User, 'id'>;
      
      // Verifica che il ruolo corrisponda alla lunghezza del PIN
      if ((userData.ruolo === 'admin' && pinString.length !== 10) ||
          (userData.ruolo !== 'admin' && pinString.length !== 6)) {
        throw new Error('PIN non valido');
      }
      
      const user: User = {
        id: userDoc.id,
        nome: userData.nome,
        ruolo: userData.ruolo,
        vicinati: userData.vicinati,
        pin: userData.pin
      };
      
      setCurrentUser(user);

      // Richiedi il permesso per le notifiche usando l'ID utente
      await richiediPermessoNotifiche(user.id);

      // Salva il PIN in localStorage invece che sessionStorage
      localStorage.setItem('userPin', pin.toString());
      
      return getInitialRoute(user);
    } catch (error) {
      console.error('Errore durante il login:', error);
      throw error;
    }
  }, []);

  // Funzione per il logout
  const logout = useCallback(async () => {
    setCurrentUser(null);
    localStorage.removeItem('userPin');
  }, []);

  // Effetto per ripristinare la sessione
  useEffect(() => {
    const checkSession = async () => {
      const savedPin = localStorage.getItem('userPin');
      if (savedPin) {
        try {
          await login(parseInt(savedPin));
        } catch (error) {
          console.error('Errore nel ripristino della sessione:', error);
          localStorage.removeItem('userPin');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, [login]);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    getInitialRoute: () => getInitialRoute(currentUser)
  };

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
