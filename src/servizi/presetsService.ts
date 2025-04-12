import { PresetAssegnazioni, PresetAssegnazioniRequest } from '../tipi/preset';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, Timestamp, getDoc } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../configurazione/firebase';;
import { db } from '../configurazione/firebase';

const COLLECTION_NAME = 'presets_assegnazioni';
const CACHE_KEY = 'derby_manager_presets_assegnazioni';
const CACHE_TIMESTAMP_KEY = 'derby_manager_presets_assegnazioni_timestamp';

/**
 * Carica tutti i preset da Firebase con supporto alla cache
 * @returns Array di preset assegnazioni
 */
export const caricaPresets = async (forzaAggiornamento: boolean = false): Promise<PresetAssegnazioni[]> => {
  try {
    // Carica sempre i preset da Firebase, senza usare la cache locale
    // Questo garantisce che tutti gli utenti vedano gli stessi preset
    const presetsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocsWithRateLimit(presetsRef);
    
    const presets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PresetAssegnazioni[];
    
    // Aggiorna la cache solo per ottimizzazioni di performance
    localStorage.setItem(CACHE_KEY, JSON.stringify(presets));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return presets;
  } catch (error) {
    console.error('Errore nel caricamento dei preset:', error);
    
    // In caso di errore, prova a usare la cache se disponibile
    const presetsCache = localStorage.getItem(CACHE_KEY);
    if (presetsCache) {
      return JSON.parse(presetsCache);
    }
    
    return [];
  }
};

/**
 * Salva un nuovo preset su Firebase
 * @param preset Dati del nuovo preset da creare
 * @returns Il preset creato con ID e timestamp
 */
export const creaPreset = async (presetData: PresetAssegnazioniRequest): Promise<PresetAssegnazioni> => {
  try {
    const nuovoPreset = {
      nome: presetData.nome,
      descrizione: presetData.descrizione || '',
      incarichi: [...presetData.incarichi],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ultimoUtilizzo: null
    };
    
    // Salva il preset su Firebase
    const docRef = await addDocWithRateLimit(collection(db, COLLECTION_NAME), nuovoPreset);
    
    const presetCreato = {
      id: docRef.id,
      ...nuovoPreset
    } as PresetAssegnazioni;
    
    // Aggiorna la cache locale
    const presetsCache = await caricaPresets();
    presetsCache.push(presetCreato);
    localStorage.setItem(CACHE_KEY, JSON.stringify(presetsCache));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return presetCreato;
  } catch (error) {
    console.error('Errore nella creazione del preset:', error);
    throw new Error('Impossibile creare il preset');
  }
};

/**
 * Aggiorna un preset esistente su Firebase
 * @param id ID del preset da aggiornare
 * @param presetData Nuovi dati del preset
 * @returns Il preset aggiornato o null se non trovato
 */
export const aggiornaPreset = async (id: string, presetData: PresetAssegnazioniRequest): Promise<PresetAssegnazioni | null> => {
  try {
    console.log("Inizio aggiornaPreset:", { id, presetData });
    
    const presetRef = doc(db, COLLECTION_NAME, id);
    const presetDoc = await getDocWithRateLimit(presetRef);
    
    if (!presetDoc.exists()) {
      console.error("Preset non trovato:", id);
      return null;
    }
    
    const presetEsistente = presetDoc.data();
    console.log("Preset esistente:", presetEsistente);
    
    const presetAggiornato = {
      nome: presetData.nome,
      descrizione: presetData.descrizione || '',
      incarichi: [...presetData.incarichi],
      updatedAt: Timestamp.now()
    };
    
    console.log("Dati da aggiornare:", presetAggiornato);
    
    // Aggiorna il documento su Firebase
    await updateDocWithRateLimit(presetRef, presetAggiornato);
    
    // Costruisci l'oggetto completo con i dati esistenti e quelli aggiornati
    const presetCompleto = {
      id,
      ...presetEsistente,
      ...presetAggiornato
    } as PresetAssegnazioni;
    
    console.log("Preset completo dopo aggiornamento:", presetCompleto);
    
    // Forza un refresh della cache
    const presetsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocsWithRateLimit(presetsRef);
    
    const presets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PresetAssegnazioni[];
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(presets));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return presetCompleto;
  } catch (error) {
    console.error('Errore nell\'aggiornamento del preset:', error);
    throw new Error('Impossibile aggiornare il preset');
  }
};

/**
 * Elimina un preset per ID da Firebase
 * @param id ID del preset da eliminare
 * @returns true se l'eliminazione è riuscita, false altrimenti
 */
export const eliminaPreset = async (id: string): Promise<boolean> => {
  try {
    const presetRef = doc(db, COLLECTION_NAME, id);
    await deleteDocWithRateLimit(presetRef);
    
    // Aggiorna la cache locale
    const presetsCache = await caricaPresets();
    const nuoviPresets = presetsCache.filter(p => p.id !== id);
    localStorage.setItem(CACHE_KEY, JSON.stringify(nuoviPresets));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    return true;
  } catch (error) {
    console.error('Errore nell\'eliminazione del preset:', error);
    return false;
  }
};

/**
 * Ottiene un preset per ID da Firebase
 * @param id ID del preset da recuperare
 * @returns Il preset trovato o null se non esiste
 */
export const getPresetById = async (id: string): Promise<PresetAssegnazioni | null> => {
  try {
    // Prima cerca nella cache
    const presetsCache = await caricaPresets();
    const presetCache = presetsCache.find(p => p.id === id);
    if (presetCache) return presetCache;
    
    // Se non trovato in cache, cerca su Firebase
    const presetRef = doc(db, COLLECTION_NAME, id);
    const presetDoc = await getDocWithRateLimit(presetRef);
    
    if (!presetDoc.exists()) return null;
    
    return {
      id: presetDoc.id,
      ...presetDoc.data()
    } as PresetAssegnazioni;
  } catch (error) {
    console.error('Errore nel recupero del preset:', error);
    return null;
  }
};

/**
 * Aggiorna il timestamp di ultimo utilizzo del preset su Firebase
 * @param id ID del preset utilizzato
 */
export const aggiornaUltimoUtilizzo = async (id: string): Promise<void> => {
  try {
    const presetRef = doc(db, COLLECTION_NAME, id);
    await updateDocWithRateLimit(presetRef, {
      ultimoUtilizzo: Timestamp.now()
    });
    
    // Aggiorna la cache locale
    const presetsCache = await caricaPresets();
    const presetIndex = presetsCache.findIndex(p => p.id === id);
    if (presetIndex !== -1) {
      presetsCache[presetIndex].ultimoUtilizzo = Timestamp.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(presetsCache));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch (error) {
    console.error('Errore nell\'aggiornamento dell\'ultimo utilizzo del preset:', error);
  }
}; 