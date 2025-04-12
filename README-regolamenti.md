# Sistema di Gestione dei Regolamenti

Questo documento descrive il sistema di gestione dei regolamenti implementato in Derby Manager. Il sistema permette la creazione e gestione di sezioni e sottosezioni di regolamenti in una struttura ad albero, simile a una wiki.

## Funzionalità

- **Struttura ad albero**: Supporta sezioni e sottosezioni nidificate
- **Editor WYSIWYG**: Editor visuale per la creazione di contenuti ricchi
- **Revisioni**: Tracciamento automatico delle modifiche
- **Controllo di pubblicazione**: Le sezioni possono essere pubblicate o nascoste
- **Navigazione breadcrumb**: Per facilitare la navigazione tra le sezioni
- **Upload di immagini**: Supporto per l'inserimento di immagini
- **Collegamenti tra sezioni**: Possibilità di creare link tra sezioni
- **Testo copiabile**: Possibilità di creare elementi di testo copiabili con un click

## Architettura

Il sistema è composto da diversi componenti:

### Modelli di dati

- `RegolamentiSezione`: Rappresenta una sezione del regolamento
- `RegolamentiRevisione`: Rappresenta una revisione di una sezione

### Componenti React

- `RegolamentiContext`: Context per l'accesso ai dati e alle operazioni sui regolamenti
- `RegolamentiEditor`: Editor WYSIWYG basato su TinyMCE
- `GestioneRegolamenti`: Pagina principale per la gestione dei regolamenti

### Firebase

- Collezione `regolamenti`: Archivia le sezioni dei regolamenti
- Collezione `regolamenti_revisioni`: Archivia le revisioni
- Storage `regolamenti_images`: Archivia le immagini caricate

## Come usarlo

1. **Accesso**: Naviga a `/regolamento` nell'applicazione
2. **Visualizzazione**: Sfoglia le sezioni esistenti tramite l'interfaccia
3. **Creazione**: Usa i pulsanti "Nuova sezione principale" o "Nuova sottosezione"
4. **Modifica**: Clicca sull'icona di modifica per modificare una sezione
5. **Pubblicazione**: Usa l'icona pubblica/nascondi per controllare la visibilità

## Controllo degli accessi

- Tutti gli utenti possono visualizzare le sezioni pubblicate
- Solo gli admin, coordinatori e moderatori possono:
  - Creare nuove sezioni
  - Modificare sezioni esistenti
  - Eliminare sezioni
  - Controllare lo stato di pubblicazione

## Dettagli tecnici

### Struttura delle collezioni

#### Collezione `regolamenti`

Ogni documento rappresenta una sezione e contiene:

```typescript
{
  id: string;
  titolo: string;
  contenuto: string;
  ordine: number;
  parentId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  updatedBy: string;
  pubblicato: boolean;
}
```

#### Collezione `regolamenti_revisioni`

Ogni documento rappresenta una revisione e contiene:

```typescript
{
  id: string;
  sezioneId: string;
  titolo: string;
  contenuto: string;
  createdAt: Timestamp;
  createdBy: string;
  note: string;
}
```

### Caricamento delle immagini

Le immagini vengono caricate su Firebase Storage nel percorso `regolamenti_images/{sectionId}/{timestamp}_{filename}` e vengono inserite direttamente nel contenuto HTML.

## Sviluppi futuri

Possibili miglioramenti:

- Ripristino delle revisioni precedenti
- Ricerca full-text nei regolamenti
- Esportazione in PDF
- Modalità confronto tra revisioni
- Sistema di commenti/discussione per le sezioni 