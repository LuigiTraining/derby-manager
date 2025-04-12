# Derby Manager - Perché No

Questo progetto è un gestionale per le produzioni di un videogioco, creato con React, TypeScript e Firebase.

## Misure di Sicurezza

Il sito implementa diverse misure di sicurezza per proteggere l'app da abusi e costi inaspettati:

### Firestore Security Rules

Le regole di sicurezza di Firestore sono state configurate per:
- Limitare le operazioni di lettura con rate limiting (100 richieste ogni 10 minuti per IP)
- Limitare le dimensioni dei documenti creati/aggiornati
- Disabilitare le operazioni di eliminazione per la maggior parte delle collezioni
- Impedire la creazione di documenti amministrativi da utenti non autorizzati

### Rate Limiting

Il sistema di rate limiting è implementato su due livelli:
1. **Client-side**: Tutte le operazioni su Firestore passano attraverso wrapper che registrano le richieste
2. **Server-side**: Una Cloud Function registra le richieste per IP e le regole Firestore verificano che non superino i limiti

### Protezione Documenti

Ogni collezione ha limiti specifici sulla dimensione massima dei documenti per prevenire abusi di storage.

## Autenticazione

Il sistema utilizza un'autenticazione basata su PIN:
- PIN a 6 cifre per utenti normali
- PIN a 10 cifre per amministratori

## Sviluppo

### Prerequisiti
- Node.js 18 o superiore
- npm o yarn

### Installazione

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build
```

### Deploy

```bash
# Deploy su Firebase
firebase deploy
```

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

- Replace `tseslint.configs.recommended` to `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from 'eslint-plugin-react'

export default tseslint.config({
  // Set the react version
  settings: { react: { version: '18.3' } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
  },
})
```
