import { getFunctions, httpsCallable } from 'firebase/functions';

// Cache di timestamp per limitare ulteriormente le chiamate alla funzione di rate limiting
let lastRateLimitCall = 0;
const RATE_LIMIT_CALL_INTERVAL = 5000; // 5 secondi tra le chiamate

// Memorizza il Project ID per evitare dipendenze circolari
let projectId = "derby-manager-perche-no";

/**
 * Imposta il Project ID per le chiamate di rate limiting
 */
export const setRateLimitProjectId = (id: string): void => {
  projectId = id;
};

/**
 * Registra una richiesta per il rate limiting.
 * Questa funzione chiama la Cloud Function che traccia le richieste per IP.
 * Per evitare troppe chiamate, utilizza un intervallo minimo tra le chiamate.
 */
export const registerRateLimitRequest = async (): Promise<void> => {
  const now = Date.now();
  
  // Se l'ultima chiamata è stata fatta meno di 5 secondi fa, salta
  if (now - lastRateLimitCall < RATE_LIMIT_CALL_INTERVAL) {
    return;
  }
  
  lastRateLimitCall = now;
  
  try {
    // Usa fetch in modalità no-cors per evitare errori CORS
    // Questo non restituirà una risposta leggibile, ma eviterà errori
    const response = await fetch(
      `https://us-central1-${projectId}.cloudfunctions.net/recordRateLimitRequest`,
      { 
        method: 'GET',
        mode: 'no-cors', // Imposta la modalità no-cors
        cache: 'no-cache',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Con no-cors, non possiamo controllare response.ok, quindi semplicemente registriamo il successo
    console.log('Richiesta rate limit inviata');
  } catch (error) {
    // Ignora errori per non bloccare le operazioni dell'utente
    console.error('Errore nel rate limiting:', error);
  }
}; 