const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, getDoc, doc } = require("firebase/firestore");

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA5pyoxzvnuOMFUu3ir3o4mRXKF49xBfHU",
  authDomain: "derby-manager-perche-no.firebaseapp.com",
  projectId: "derby-manager-perche-no",
  storageBucket: "derby-manager-perche-no.firebasestorage.app",
  messagingSenderId: "616230781662",
  appId: "1:616230781662:web:4c7eff4825cdaea9a4f84f",
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function leggiUtenti() {
  try {
    console.log("Lettura collezione: utenti");
    const utentiRef = collection(db, "utenti");
    const snapshot = await getDocs(utentiRef);
    
    if (snapshot.empty) {
      console.log("Nessun utente trovato nella collezione 'utenti'");
      return;
    }
    
    console.log(`Trovati ${snapshot.docs.length} utenti`);
    
    // Per ogni utente, estrai le sue farm
    const utentiConFarms = snapshot.docs.map(doc => {
      const utente = {
        id: doc.id,
        ...doc.data()
      };
      
      console.log(`Utente: ${utente.nome || "Senza nome"} (ID: ${doc.id})`);
      console.log(`  - Ruolo: ${utente.ruolo || "non specificato"}`);
      
      // Verifica se l'utente ha farms direttamente nel documento
      if (utente.farms && Array.isArray(utente.farms)) {
        console.log(`  - Trovate ${utente.farms.length} farm direttamente nell'utente`);
      } else {
        console.log(`  - Nessuna farm trovata direttamente nell'utente`);
      }
      
      return utente;
    });
    
    // Stampa i risultati
    console.log(JSON.stringify(utentiConFarms, null, 2));
    
    // Stampa il numero totale di farm
    const totaleFarms = utentiConFarms.reduce((total, utente) => {
      if (utente.farms && Array.isArray(utente.farms)) {
        return total + utente.farms.length;
      }
      return total;
    }, 0);
    
    console.log(`Totale farm in tutti gli utenti: ${totaleFarms}`);
    
    // Verifica anche nella collezione farms
    console.log("\nVerifica collezione: farms");
    const farmsRef = collection(db, "farms");
    const farmsSnapshot = await getDocs(farmsRef);
    
    if (farmsSnapshot.empty) {
      console.log("Nessuna farm trovata nella collezione 'farms'");
    } else {
      console.log(`Trovate ${farmsSnapshot.docs.length} farm nella collezione 'farms'`);
      
      const farms = farmsSnapshot.docs.map(farmDoc => ({
        id: farmDoc.id,
        ...farmDoc.data()
      }));
      
      console.log("Prime 3 farm (se disponibili):");
      const primeFarms = farms.slice(0, 3);
      console.log(JSON.stringify(primeFarms, null, 2));
    }
    
    // Elenco delle collezioni nel database
    console.log("\nVerifica presenza di sottocollezioni 'farms' negli utenti");
    for (const utente of utentiConFarms) {
      try {
        const farmsDiUtente = collection(db, "utenti", utente.id, "farms");
        const farmsUtenteSnapshot = await getDocs(farmsDiUtente);
        
        if (!farmsUtenteSnapshot.empty) {
          console.log(`Utente ${utente.nome || utente.id} ha ${farmsUtenteSnapshot.docs.length} farm nella sottocollezione`);
        }
      } catch (error) {
        console.error(`Errore nel leggere le farms dell'utente ${utente.id}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("Errore nella lettura degli utenti:", error);
  }
}

// Esegui la funzione
leggiUtenti(); 