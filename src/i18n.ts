import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  // Carica le traduzioni da /public/locales/{lingua}/common.json
  .use(Backend)
  // Rileva la lingua del browser (opzionale)
  .use(LanguageDetector)
  // Passa i18n a react-i18next
  .use(initReactI18next)
  // Inizializza i18next
  .init({
    fallbackLng: "it", // Lingua di fallback se la traduzione non è disponibile
    debug: false, // Disattivo il debug per non vedere messaggi di errore nella console
    
    // Specifico che i file di traduzione sono in common.json
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Lingue supportate
    supportedLngs: ["it", "en", "es", "fr"],

    // Namespace predefinito
    defaultNS: "common",

    // Opzioni di rilevamento della lingua
    detection: {
      order: ["localStorage", "querystring", "navigator"],
      caches: ["localStorage"],
      lookupQuerystring: "lng", // Permette di forzare la lingua con ?lng=fr nell'URL
    },

    interpolation: {
      escapeValue: false, // Non necessario per React
    },

    // Imposta a true per caricare tutte le traduzioni all'avvio
    preload: ["it", "en", "es", "fr"],
    
    // Carica le traduzioni immediatamente
    partialBundledLanguages: false,
    
    react: {
      useSuspense: false, // Disabilita Suspense per evitare problemi di caricamento
    }
  });

// Esponi una funzione per cambiare lingua e forzare un ricaricamento
export const changeLanguage = (lang: string) => {
  return i18n.changeLanguage(lang).then(() => {
    console.log(`Lingua cambiata in: ${lang}`);
    // Forza un ricaricamento delle traduzioni
    i18n.reloadResources(lang, "common");
  });
};

export default i18n;
