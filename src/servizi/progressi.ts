import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc, 
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../configurazione/firebase';;
import { db } from '../configurazione/firebase';
import { ProgressoIncarico, ProgressoCesto } from '../tipi/progresso';

/**
 * Servizio per gestire i progressi degli incarichi e dei cesti
 * Tutte le operazioni su Firebase vengono gestite qui
 */
export const ProgressiService = {
  
  /**
   * Ottiene tutti i progressi per una specifica farm
   * @param farm_id - ID della farm
   */
  getProgressiFarm: async (farm_id: string) => {
    // Query alla collezione progressi_incarichi
    const progressiQuery = query(
      collection(db, 'progressi_incarichi'),
      where('farm_id', '==', farm_id)
    );
    
    const snapshot = await getDocsWithRateLimit(progressiQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressoIncarico));
  },

  /**
   * Aggiorna la quantità prodotta per un incarico
   * @param progresso_id - ID del progresso da aggiornare
   * @param nuova_quantita - Nuova quantità prodotta
   */
  aggiornaQuantita: async (progresso_id: string, nuova_quantita: number) => {
    const progressoRef = doc(db, 'progressi_incarichi', progresso_id);
    await updateDocWithRateLimit(progressoRef, {
      quantita_prodotta: nuova_quantita,
      ultimo_aggiornamento: Timestamp.now()
    });
  },

  /**
   * Crea un nuovo progresso per un incarico
   * @param farm_id - ID della farm
   * @param incarico_id - ID dell'incarico
   * @param is_assegnato - Se l'incarico è stato assegnato dall'admin
   */
  creaProgresso: async (farm_id: string, incarico_id: string, is_assegnato: boolean = false) => {
    const nuovoProgresso: Omit<ProgressoIncarico, 'id'> = {
      farm_id,
      incarico_id,
      quantita_prodotta: 0,
      ultimo_aggiornamento: Timestamp.now(),
      is_assegnato
    };

    const docRef = await addDocWithRateLimit(collection(db, 'progressi_incarichi'), nuovoProgresso);
    return {
      id: docRef.id,
      ...nuovoProgresso
    };
  },

  /**
   * Segna un incarico come assegnato
   * @param progresso_id - ID del progresso
   * @param is_assegnato - Nuovo stato di assegnazione
   */
  segnaAssegnato: async (progresso_id: string, is_assegnato: boolean) => {
    const progressoRef = doc(db, 'progressi_incarichi', progresso_id);
    await updateDocWithRateLimit(progressoRef, {
      is_assegnato,
      ultimo_aggiornamento: Timestamp.now()
    });
  },

  /**
   * Reset del progresso di un incarico
   * @param progresso_id - ID del progresso da resettare
   */
  resetProgresso: async (progresso_id: string) => {
    const progressoRef = doc(db, 'progressi_incarichi', progresso_id);
    await updateDocWithRateLimit(progressoRef, {
      quantita_prodotta: 0,
      ultimo_aggiornamento: Timestamp.now()
    });
  }
};
