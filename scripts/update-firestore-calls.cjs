/**
 * Script per aggiornare le chiamate dirette a Firestore con i wrapper per il rate limiting
 */
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Elenco delle funzioni Firestore che vogliamo sostituire
const functionMappings = {
  'getDoc(': 'getDocWithRateLimit(',
  'getDocs(': 'getDocsWithRateLimit(',
  'setDoc(': 'setDocWithRateLimit(',
  'updateDoc(': 'updateDocWithRateLimit(',
  'deleteDoc(': 'deleteDocWithRateLimit(',
  'addDoc(': 'addDocWithRateLimit('
};

// Percorsi da ignorare
const ignorePaths = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'functions',
  'temp',
  'scripts',
  'src/configurazione/firebase.ts' // Ignora il file che contiene i wrapper stessi
];

/**
 * Controlla se un file contiene chiamate dirette a Firestore
 */
async function containsFirestoreCalls(filePath) {
  try {
    const content = await readFile(filePath, 'utf8');
    return Object.keys(functionMappings).some(func => content.includes(func));
  } catch (error) {
    console.error(`Errore nella lettura del file ${filePath}:`, error);
    return false;
  }
}

/**
 * Aggiorna le chiamate Firestore in un file
 */
async function updateFirestoreCalls(filePath) {
  try {
    let content = await readFile(filePath, 'utf8');
    let originalContent = content;
    let hasChanged = false;
    
    // Verifica se è necessario aggiungere l'import
    const needsImport = Object.keys(functionMappings).some(func => content.includes(func));
    
    if (needsImport && !content.includes('import {') && 
        !content.includes('getDocWithRateLimit') && 
        !content.includes('getDocsWithRateLimit')) {
      
      // Cerca la posizione dell'import di firebase/firestore
      const firestoreImportRegex = /import\s+\{([^}]*)\}\s+from\s+['"]firebase\/firestore['"]/;
      const importMatch = content.match(firestoreImportRegex);
      
      if (importMatch) {
        // Aggiungi l'import dei wrapper
        const wrapperImport = `import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../configurazione/firebase';`;
        
        // Calcola il percorso relativo corretto
        const relativeDepth = path.relative(path.dirname(filePath), path.resolve('src/configurazione')).replace(/\\/g, '/');
        const correctedImport = wrapperImport.replace('../configurazione/firebase', 
          relativeDepth.startsWith('..') ? relativeDepth + '/firebase' : './' + relativeDepth + '/firebase');
        
        // Inserisci l'import dopo l'import di firebase/firestore
        content = content.replace(importMatch[0], `${importMatch[0]}\n${correctedImport}`);
        hasChanged = true;
      }
    }
    
    // Sostituisci le chiamate dirette con i wrapper
    Object.entries(functionMappings).forEach(([original, replacement]) => {
      if (content.includes(original)) {
        content = content.replace(new RegExp(original, 'g'), replacement);
        hasChanged = true;
      }
    });
    
    // Scrivi il file solo se è stato modificato
    if (hasChanged) {
      await writeFile(filePath, content, 'utf8');
      console.log(`✅ Aggiornato: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️ Nessun aggiornamento necessario: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Errore nell'aggiornamento del file ${filePath}:`, error);
    return false;
  }
}

/**
 * Attraversa ricorsivamente una directory e applica le modifiche
 */
async function traverseDirectory(directory) {
  try {
    const entries = await readdir(directory);
    let updatedCount = 0;
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry);
      
      // Salta i percorsi da ignorare
      if (ignorePaths.some(ignorePath => fullPath.includes(ignorePath))) {
        continue;
      }
      
      const entryStat = await stat(fullPath);
      
      if (entryStat.isDirectory()) {
        // Attraversa ricorsivamente le sottodirectory
        updatedCount += await traverseDirectory(fullPath);
      } else if (entryStat.isFile() && 
                (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) && 
                await containsFirestoreCalls(fullPath)) {
        // Aggiorna le chiamate Firestore nei file TypeScript/JavaScript
        const updated = await updateFirestoreCalls(fullPath);
        if (updated) updatedCount++;
      }
    }
    
    return updatedCount;
  } catch (error) {
    console.error(`Errore nell'attraversamento della directory ${directory}:`, error);
    return 0;
  }
}

/**
 * Funzione principale
 */
async function main() {
  console.log('🔍 Inizio aggiornamento chiamate Firestore...');
  const startTime = Date.now();
  
  // Inizia dall'directory src
  const srcDirectory = path.resolve('src');
  const updatedCount = await traverseDirectory(srcDirectory);
  
  const endTime = Date.now();
  const executionTime = (endTime - startTime) / 1000;
  
  console.log(`\n✅ Completato in ${executionTime.toFixed(2)} secondi!`);
  console.log(`📊 File aggiornati: ${updatedCount}`);
}

// Esegui lo script
main().catch(error => {
  console.error('Errore nell\'esecuzione dello script:', error);
  process.exit(1);
}); 