import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../src/service-account-key.json.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const adminUser = {
  nome: 'Admin',
  ruolo: 'admin',
  vicinati: ['principale'],
  pin: 123456
};

async function addAdmin() {
  try {
    await db.collection('utenti').doc('123456').set(adminUser);
    console.log('Utente admin creato con successo!');
    process.exit(0);
  } catch (error) {
    console.error('Errore durante la creazione dell\'utente admin:', error);
    process.exit(1);
  }
}

addAdmin(); 