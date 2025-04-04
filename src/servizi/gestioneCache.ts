import { collection, getDocs, query, where, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../configurazione/firebase";

// Interfaccia per i metadati della cache
interface MetadatiCache {
  timestamp: number;
}

// Funzione per caricare dati con cache
export const caricaDatiConCache = async (
  nomeCollezione: string,
  forzaAggiornamento: boolean = false
) => {
  try {
    // Se non è richiesto un aggiornamento forzato, usa sempre la cache se disponibile
    if (!forzaAggiornamento) {
      const datiCache = localStorage.getItem(`cache_${nomeCollezione}`);
      
      if (datiCache) {
        return JSON.parse(datiCache);
      }
    }
    
    // Se è richiesto un aggiornamento forzato o non c'è cache, scarica da Firebase
    const collectionRef = collection(db, nomeCollezione);
    const snapshot = await getDocs(collectionRef);
    const dati = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Salva i dati nella cache
    localStorage.setItem(`cache_${nomeCollezione}`, JSON.stringify(dati));
    localStorage.setItem(`timestamp_${nomeCollezione}`, Date.now().toString());
    
    return dati;
  } catch (error) {
    console.error(`Errore nel caricamento dei dati ${nomeCollezione}:`, error);
    
    // In caso di errore, prova a utilizzare la cache se disponibile
    const datiCache = localStorage.getItem(`cache_${nomeCollezione}`);
    if (datiCache) {
      return JSON.parse(datiCache);
    }
    
    // Se non c'è cache, restituisci un array vuoto
    return [];
  }
};

// Funzione per caricare le assegnazioni con cache
export const caricaAssegnazioniConCache = async (
  userId: string,
  forzaAggiornamento: boolean = false
) => {
  try {
    // Verifica se ci sono assegnazioni in cache
    if (!userId) return [];
    
    const cacheKey = `cache_assegnazioni_${userId}`;
    const timestampKey = `timestamp_assegnazioni_${userId}`;
    
    // Se non è richiesto un aggiornamento forzato, usa sempre la cache se disponibile
    if (!forzaAggiornamento) {
      const assegnazioniCache = localStorage.getItem(cacheKey);
      
      if (assegnazioniCache) {
        return JSON.parse(assegnazioniCache);
      }
    }
    
    // Se è richiesto un aggiornamento forzato o non c'è cache, scarica da Firebase
    const assegnazioniRef = collection(db, "assegnazioni");
    
    // Modifica: cerchiamo le assegnazioni in base al campo farm_id che inizia con userId_
    // Poiché Firestore non supporta direttamente le query con "startsWith", 
    // dobbiamo usare un range di valori
    const prefissoFarmId = `${userId}_`;
    const prefissoFarmIdEnd = `${userId}_\uf8ff`; // \uf8ff è un carattere Unicode alto che viene dopo qualsiasi carattere normale
    
    const q = query(
      assegnazioniRef, 
      where("farm_id", ">=", prefissoFarmId),
      where("farm_id", "<=", prefissoFarmIdEnd)
    );
    
    const snapshot = await getDocs(q);
    const assegnazioni = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Salva i dati nella cache
    localStorage.setItem(cacheKey, JSON.stringify(assegnazioni));
    localStorage.setItem(timestampKey, Date.now().toString());
    
    return assegnazioni;
  } catch (error) {
    console.error("Errore nel caricamento delle assegnazioni:", error);
    
    // In caso di errore, prova a utilizzare la cache se disponibile
    const cacheKey = `cache_assegnazioni_${userId}`;
    const assegnazioniCache = localStorage.getItem(cacheKey);
    if (assegnazioniCache) {
      return JSON.parse(assegnazioniCache);
    }
    
    // Se non c'è cache, restituisci un array vuoto
    return [];
  }
};

// Funzione per verificare se ci sono aggiornamenti disponibili
// Nota: questa funzione non viene più chiamata automaticamente
export const verificaAggiornamenti = async (forzaVerifica: boolean = false) => {
  try {
    return false;
  } catch (error) {
    console.error("Errore nella verifica degli aggiornamenti:", error);
    return false;
  }
};

// Funzione per aggiornare tutti i dati
export const aggiornaTuttiDati = async (userId: string) => {
  try {
    // Forza l'aggiornamento di tutte le collezioni necessarie
    // Nota: questo farà chiamate a Firebase, ma solo quando l'utente lo richiede esplicitamente
    await Promise.all([
      caricaDatiConCache("incarichi", true),
      caricaDatiConCache("incarichi_citta", true),
      caricaDatiConCache("cesti", true),
      caricaDatiConCache("edifici", true),
      caricaDatiConCache("derby", true)
    ]);
    
    // Aggiorna le assegnazioni dell'utente
    await caricaAssegnazioniConCache(userId, true);
    
    // Salva il timestamp dell'ultimo aggiornamento
    localStorage.setItem('ultimo_aggiornamento_dati', Date.now().toString());
    
    return true;
  } catch (error) {
    console.error("Errore nell'aggiornamento dei dati:", error);
    return false;
  }
};

// Funzione per creare il documento di metadati se non esiste
export const creaDocumentoMetadati = async () => {
  try {
    // Verifica se il documento esiste già
    const metadatiDoc = await getDoc(doc(db, "metadati", "collezioni"));
    
    if (!metadatiDoc.exists()) {
      // Crea il documento con i timestamp attuali
      const timestamp = Date.now();
      const metadati = {
        incarichi: timestamp,
        incarichi_citta: timestamp,
        cesti: timestamp,
        edifici: timestamp,
        derby: timestamp
      };
      
      // Crea il documento
      await setDoc(doc(db, "metadati", "collezioni"), metadati);
    }
    
    return true;
  } catch (error) {
    console.error("Errore nella creazione del documento metadati:", error);
    return false;
  }
};

// Funzione per aggiornare il timestamp di una collezione specifica
export const aggiornaTimestampCollezione = async (nomeCollezione: string) => {
  try {
    // Verifica se il documento esiste già
    const metadatiDoc = await getDoc(doc(db, "metadati", "collezioni"));
    
    if (metadatiDoc.exists()) {
      // Ottieni i dati attuali
      const metadati = metadatiDoc.data();
      
      // Aggiorna il timestamp della collezione specifica
      const nuoviMetadati = {
        ...metadati,
        [nomeCollezione]: Date.now()
      };
      
      // Aggiorna il documento
      await updateDoc(doc(db, "metadati", "collezioni"), nuoviMetadati);
    } else {
      // Se il documento non esiste, crealo
      await creaDocumentoMetadati();
      
      // Poi aggiorna il timestamp della collezione specifica
      const metadati = {
        [nomeCollezione]: Date.now()
      };
      
      // Aggiorna il documento
      await updateDoc(doc(db, "metadati", "collezioni"), metadati);
    }
    
    return true;
  } catch (error) {
    console.error(`Errore nell'aggiornamento del timestamp per la collezione ${nomeCollezione}:`, error);
    return false;
  }
};