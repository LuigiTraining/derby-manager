# Guida al Sistema di Traduzione

Questo documento spiega come utilizzare il sistema di traduzione implementato nel progetto Derby Manager.

## Struttura delle Traduzioni

Le traduzioni sono organizzate in file JSON nella cartella `public/locales/[lingua]/common.json`. Ogni lingua ha il suo file di traduzione.

Lingue supportate:

- Italiano (it) - Lingua predefinita
- Inglese (en)
- Spagnolo (es)
- Francese (fr)

## Come Aggiungere Nuove Traduzioni

1. Aggiungi una nuova chiave e valore nei file di traduzione per ogni lingua supportata.
2. Organizza le traduzioni in namespace (sezioni) per mantenere il codice pulito.

Esempio:

```json
{
  "sezione": {
    "chiave": "Valore tradotto"
  }
}
```

## Come Utilizzare le Traduzioni nei Componenti

### Metodo 1: Hook useTranslation

```tsx
import { useTranslation } from "react-i18next";

const MioComponente = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("sezione.chiave")}</h1>
    </div>
  );
};
```

### Metodo 2: Higher-Order Component (HOC)

```tsx
import withTranslation from "../utils/withTranslation";

const MioComponente = ({ t }) => {
  return (
    <div>
      <h1>{t("sezione.chiave")}</h1>
    </div>
  );
};

export default withTranslation(MioComponente);
```

## Cambio della Lingua

Il cambio della lingua avviene tramite il componente `LanguageSwitcher` che è stato aggiunto nella barra di navigazione. Gli utenti possono selezionare la lingua desiderata dal menu a tendina.

Per cambiare la lingua programmaticamente:

```tsx
import { useTranslation } from "react-i18next";

const { i18n } = useTranslation();

// Cambia la lingua in inglese
i18n.changeLanguage("en");
```

## Interpolazione di Variabili

È possibile inserire variabili nelle traduzioni:

Nel file di traduzione:

```json
{
  "benvenuto": "Benvenuto, {{nome}}!"
}
```

Nel componente:

```tsx
t("benvenuto", { nome: "Mario" }); // Risultato: "Benvenuto, Mario!"
```

## Pluralizzazione

Per gestire il plurale:

Nel file di traduzione:

```json
{
  "elementi": "{{count}} elemento",
  "elementi_plural": "{{count}} elementi"
}
```

Nel componente:

```tsx
t("elementi", { count: 1 }); // Risultato: "1 elemento"
t("elementi", { count: 5 }); // Risultato: "5 elementi"
```

## Esempio Pratico: Tradurre "Espandi"

Per tradurre il testo "Espandi" in diverse lingue:

1. Aggiungi le traduzioni nei file delle lingue:

```json
// public/locales/it/common.json
{
  "azioni": {
    "espandi": "Espandi"
  }
}

// public/locales/en/common.json
{
  "azioni": {
    "espandi": "Expand"
  }
}

// public/locales/es/common.json
{
  "azioni": {
    "espandi": "Expandir"
  }
}

// public/locales/fr/common.json
{
  "azioni": {
    "espandi": "Développer"
  }
}
```

2. Nel componente dove appare "Espandi":

```tsx
import { useTranslation } from "react-i18next";

function MioComponente() {
  const { t } = useTranslation();

  return <button>{t("azioni.espandi")}</button>;
}
```

## Best Practices

1. Usa chiavi semantiche e organizzate in namespace (es. `app.titolo`, `comune.salva`).
2. Mantieni coerenza tra i file di traduzione delle diverse lingue.
3. Evita di concatenare stringhe tradotte, usa l'interpolazione.
4. Aggiungi nuove traduzioni man mano che aggiungi nuovo testo all'interfaccia.
5. Usa il componente `TranslationExample` come riferimento per l'implementazione.
