import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  where, 
  Timestamp,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit,
  db
} from '../../configurazione/firebase';
import { useAuth } from '../autenticazione/AuthContext';
import { RegolamentiSezione, RegolamentiRevisione } from '../../tipi/regolamento';
import { v4 as uuidv4 } from 'uuid';

interface RegolamentiContextType {
  sezioni: RegolamentiSezione[];
  loading: boolean;
  error: string | null;
  creaNuovaSezione: (titolo: string, contenuto: string, parentId: string | null) => Promise<string>;
  modificaSezione: (id: string, titolo: string, contenuto: string, note?: string) => Promise<void>;
  eliminaSezione: (id: string) => Promise<void>;
  cambiaOrdineSezione: (id: string, nuovoOrdine: number) => Promise<void>;
  cambiaParentSezione: (id: string, nuovoParentId: string | null) => Promise<void>;
  cambiaStatoPubblicazione: (id: string, pubblicato: boolean) => Promise<void>;
  getSezioniByParent: (parentId: string | null) => RegolamentiSezione[];
  getPercorsoSezione: (id: string) => Promise<RegolamentiSezione[]>;
  getSezioniFiglie: (parentId: string) => RegolamentiSezione[];
}

const RegolamentiContext = createContext<RegolamentiContextType | undefined>(undefined);

export function RegolamentiProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [sezioni, setSezioni] = useState<RegolamentiSezione[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    try {
      const q = query(
        collection(db, 'regolamenti'),
        orderBy('ordine', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const sezioniData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          } as RegolamentiSezione;
        });

        setSezioni(sezioniData);
        setLoading(false);
      }, (err) => {
        console.error("Errore durante il caricamento dei regolamenti:", err);
        setError("Errore durante il caricamento dei regolamenti");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error("Errore durante la configurazione dell'observer:", err);
      setError("Errore durante la configurazione");
      setLoading(false);
    }
  }, [currentUser]);

  // Trova il massimo ordine tra le sezioni con lo stesso parent
  const trovaOrdineMax = (parentId: string | null) => {
    const sezioniStessoParent = sezioni.filter(s => s.parentId === parentId);
    if (sezioniStessoParent.length === 0) return 0;
    return Math.max(...sezioniStessoParent.map(s => s.ordine)) + 1;
  };

  // Crea una nuova sezione
  const creaNuovaSezione = async (titolo: string, contenuto: string, parentId: string | null) => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    try {
      const nuovoId = uuidv4();
      const nuovaSezione: Omit<RegolamentiSezione, 'id'> = {
        titolo,
        contenuto,
        ordine: trovaOrdineMax(parentId),
        parentId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: currentUser.id,
        updatedBy: currentUser.id,
        pubblicato: false
      };
      
      await setDocWithRateLimit(doc(db, 'regolamenti', nuovoId), nuovaSezione);
      
      // Crea anche la prima revisione
      const revisioneId = uuidv4();
      const revisione: Omit<RegolamentiRevisione, 'id'> = {
        sezioneId: nuovoId,
        titolo,
        contenuto,
        createdAt: Timestamp.now(),
        createdBy: currentUser.id,
        note: "Creazione iniziale"
      };
      
      await setDocWithRateLimit(doc(db, 'regolamenti_revisioni', revisioneId), revisione);
      
      return nuovoId;
    } catch (err) {
      console.error("Errore durante la creazione della sezione:", err);
      throw new Error("Impossibile creare la sezione");
    }
  };

  // Modifica una sezione esistente
  const modificaSezione = async (id: string, titolo: string, contenuto: string, note: string = "Aggiornamento") => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    try {
      const sezioneRef = doc(db, 'regolamenti', id);
      await updateDocWithRateLimit(sezioneRef, {
        titolo,
        contenuto,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.id
      });
      
      // Crea una nuova revisione
      const revisioneId = uuidv4();
      const revisione: Omit<RegolamentiRevisione, 'id'> = {
        sezioneId: id,
        titolo,
        contenuto,
        createdAt: Timestamp.now(),
        createdBy: currentUser.id,
        note
      };
      
      await setDocWithRateLimit(doc(db, 'regolamenti_revisioni', revisioneId), revisione);
    } catch (err) {
      console.error("Errore durante la modifica della sezione:", err);
      throw new Error("Impossibile modificare la sezione");
    }
  };

  // Elimina una sezione
  const eliminaSezione = async (id: string) => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    try {
      // Verifica se ci sono sottosezioni
      const sottosezioni = sezioni.filter(s => s.parentId === id);
      if (sottosezioni.length > 0) {
        throw new Error("Impossibile eliminare una sezione con sottosezioni");
      }
      
      // Elimina la sezione
      await deleteDocWithRateLimit(doc(db, 'regolamenti', id));
      
      // Non eliminiamo le revisioni per mantenere lo storico
    } catch (err) {
      console.error("Errore durante l'eliminazione della sezione:", err);
      throw err;
    }
  };

  // Cambia l'ordine di una sezione
  const cambiaOrdineSezione = async (id: string, nuovoOrdine: number) => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    try {
      const sezioneRef = doc(db, 'regolamenti', id);
      await updateDocWithRateLimit(sezioneRef, {
        ordine: nuovoOrdine,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.id
      });
    } catch (err) {
      console.error("Errore durante il cambio di ordine della sezione:", err);
      throw new Error("Impossibile cambiare l'ordine della sezione");
    }
  };

  // Cambia il parent di una sezione
  const cambiaParentSezione = async (id: string, nuovoParentId: string | null) => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    // Verifica che non si stia creando un ciclo
    if (nuovoParentId !== null) {
      let currentParent = nuovoParentId;
      const visitati = new Set<string>();
      
      while (currentParent !== null) {
        if (visitati.has(currentParent)) {
          throw new Error("Operazione non valida: creerebbe un ciclo");
        }
        
        if (currentParent === id) {
          throw new Error("Operazione non valida: una sezione non può essere genitore di se stessa");
        }
        
        visitati.add(currentParent);
        const sezioneParent = sezioni.find(s => s.id === currentParent);
        if (!sezioneParent) break;
        currentParent = sezioneParent.parentId || null;
      }
    }
    
    try {
      const sezioneRef = doc(db, 'regolamenti', id);
      await updateDocWithRateLimit(sezioneRef, {
        parentId: nuovoParentId,
        ordine: trovaOrdineMax(nuovoParentId), // Posiziona alla fine del nuovo parent
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.id
      });
    } catch (err) {
      console.error("Errore durante il cambio di parent della sezione:", err);
      throw new Error("Impossibile cambiare il parent della sezione");
    }
  };

  // Cambia lo stato di pubblicazione di una sezione
  const cambiaStatoPubblicazione = async (id: string, pubblicato: boolean) => {
    if (!currentUser) throw new Error("Utente non autenticato");
    
    try {
      const sezioneRef = doc(db, 'regolamenti', id);
      await updateDocWithRateLimit(sezioneRef, {
        pubblicato,
        updatedAt: Timestamp.now(),
        updatedBy: currentUser.id
      });
    } catch (err) {
      console.error("Errore durante il cambio di stato di pubblicazione:", err);
      throw new Error("Impossibile cambiare lo stato di pubblicazione");
    }
  };

  // Ottieni le sezioni figlie di un determinato parent
  const getSezioniByParent = (parentId: string | null) => {
    return sezioni
      .filter(s => s.parentId === parentId)
      .sort((a, b) => a.ordine - b.ordine);
  };

  // Ottieni il percorso completo di una sezione (breadcrumb)
  const getPercorsoSezione = async (id: string) => {
    const result: RegolamentiSezione[] = [];
    let currentId = id;
    
    while (currentId) {
      const sezione = sezioni.find(s => s.id === currentId);
      if (!sezione) break;
      
      result.unshift(sezione); // Aggiungi all'inizio dell'array
      
      if (!sezione.parentId) break;
      currentId = sezione.parentId;
    }
    
    return result;
  };

  // Ottieni tutte le sezioni figlie dirette di un parent
  const getSezioniFiglie = (parentId: string) => {
    return sezioni.filter(s => s.parentId === parentId);
  };

  return (
    <RegolamentiContext.Provider value={{
      sezioni,
      loading,
      error,
      creaNuovaSezione,
      modificaSezione,
      eliminaSezione,
      cambiaOrdineSezione,
      cambiaParentSezione,
      cambiaStatoPubblicazione,
      getSezioniByParent,
      getPercorsoSezione,
      getSezioniFiglie
    }}>
      {children}
    </RegolamentiContext.Provider>
  );
}

export function useRegolamenti() {
  const context = useContext(RegolamentiContext);
  if (context === undefined) {
    throw new Error('useRegolamenti must be used within a RegolamentiProvider');
  }
  return context;
} 