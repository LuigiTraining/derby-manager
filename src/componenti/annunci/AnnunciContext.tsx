import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import { db } from '../../configurazione/firebase';
import { useAuth } from '../autenticazione/AuthContext';
import { inviaNotifica } from '../../servizi/notificheService';

interface Annuncio {
  id: string;
  numero: number;
  contenuto: string;
  data: Date;
  lastModified: Date;
  modifiedBy: string;
  lettoDa: { [userId: string]: Date };
  bozza: boolean;
  visibileLettori?: string[];
}

interface AnnunciContextType {
  annunci: Annuncio[];
  nuoviAnnunci: string[];
  annunciDaLeggere: string[];
  setAnnunci: React.Dispatch<React.SetStateAction<Annuncio[]>>;
  setNuoviAnnunci: React.Dispatch<React.SetStateAction<string[]>>;
  setAnnunciDaLeggere: React.Dispatch<React.SetStateAction<string[]>>;
  creaAnnuncio: (contenuto: string, visibileLettori?: string[]) => Promise<void>;
  modificaAnnuncio: (id: string, contenuto: string, visibileLettori?: string[]) => Promise<void>;
}

const AnnunciContext = createContext<AnnunciContextType | undefined>(undefined);

export function AnnunciProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [annunci, setAnnunci] = useState<Annuncio[]>([]);
  const [nuoviAnnunci, setNuoviAnnunci] = useState<string[]>([]);
  const [annunciDaLeggere, setAnnunciDaLeggere] = useState<string[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'annunci'),
      orderBy('numero', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const annunciData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data.toDate(),
        lastModified: doc.data().lastModified?.toDate() || doc.data().data.toDate()
      })) as Annuncio[];

      // Filtra gli annunci in base alla visibilità
      const annunciFiltrati = annunciData.filter(annuncio => {
        // Se l'annuncio ha visibileLettori, mostralo solo a quegli utenti
        if (annuncio.visibileLettori?.length > 0) {
          return annuncio.visibileLettori.includes(currentUser.id);
        }
        return true; // Se non ha visibileLettori, è visibile a tutti
      });

      // Identifica i nuovi annunci (escludi le bozze)
      const nuovi = annunciFiltrati
        .filter(annuncio => {
          // Ignora SEMPRE gli annunci in bozza
          if (annuncio.bozza === true) {
            return false;
          }
          
          // Se l'annuncio non è mai stato letto dall'utente
          if (!annuncio.lettoDa?.[currentUser.id]) {
            return true;
          }
          
          // Se l'annuncio è stato modificato dopo l'ultima lettura
          const ultimaLettura = new Date(annuncio.lettoDa[currentUser.id]);
          return annuncio.lastModified > ultimaLettura;
        })
        .map(a => a.id);

      setNuoviAnnunci(nuovi);
      setAnnunciDaLeggere(nuovi);
      setAnnunci(annunciFiltrati);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const creaAnnuncio = async (contenuto: string, visibileLettori?: string[]) => {
    if (!currentUser) return;

    const nuovoAnnuncio = {
      contenuto,
      data: new Date(),
      lastModified: new Date(),
      modifiedBy: currentUser.uid,
      lettoDa: {},
      bozza: false,
      visibileLettori,
      numero: annunci.length > 0 ? Math.max(...annunci.map(a => a.numero)) + 1 : 1
    };

    const docRef = await addDocWithRateLimit(collection(db, 'annunci'), nuovoAnnuncio);

    // Invia notifica a tutti o solo agli utenti specificati
    const titolo = 'Nuovo Annuncio';
    const messaggio = contenuto.length > 100 ? contenuto.substring(0, 97) + '...' : contenuto;
    
    if (visibileLettori && visibileLettori.length > 0) {
      await inviaNotifica(titolo, messaggio, visibileLettori, {
        tipo: 'annuncio',
        annuncioId: docRef.id
      });
    } else {
      await inviaNotifica(titolo, messaggio, undefined, {
        tipo: 'annuncio',
        annuncioId: docRef.id
      });
    }
  };

  const modificaAnnuncio = async (id: string, contenuto: string, visibileLettori?: string[]) => {
    if (!currentUser) return;

    const annuncioRef = doc(db, 'annunci', id);
    await updateDocWithRateLimit(annuncioRef, {
      contenuto,
      lastModified: new Date(),
      modifiedBy: currentUser.uid,
      visibileLettori
    });

    // Invia notifica di modifica
    const titolo = 'Annuncio Modificato';
    const messaggio = contenuto.length > 100 ? contenuto.substring(0, 97) + '...' : contenuto;
    
    if (visibileLettori && visibileLettori.length > 0) {
      await inviaNotifica(titolo, messaggio, visibileLettori, {
        tipo: 'annuncio_modificato',
        annuncioId: id
      });
    } else {
      await inviaNotifica(titolo, messaggio, undefined, {
        tipo: 'annuncio_modificato',
        annuncioId: id
      });
    }
  };

  return (
    <AnnunciContext.Provider value={{
      annunci,
      nuoviAnnunci,
      annunciDaLeggere,
      setAnnunci,
      setNuoviAnnunci,
      setAnnunciDaLeggere,
      creaAnnuncio,
      modificaAnnuncio
    }}>
      {children}
    </AnnunciContext.Provider>
  );
}

export function useAnnunci() {
  const context = useContext(AnnunciContext);
  if (context === undefined) {
    throw new Error('useAnnunci must be used within an AnnunciProvider');
  }
  return context;
} 