import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";

i18n
  // Carica le traduzioni da /public/locales/{lingua}/translation.json
  .use(Backend)
  // Rileva la lingua del browser (opzionale)
  .use(LanguageDetector)
  // Passa i18n a react-i18next
  .use(initReactI18next)
  // Inizializza i18next
  .init({
    fallbackLng: "it", // Lingua di fallback se la traduzione non è disponibile
    debug: process.env.NODE_ENV === "development", // Debug solo in sviluppo

    // Lingue supportate
    supportedLngs: ["it", "en", "es", "fr"],

    // Namespace predefinito
    defaultNS: "common",

    // Opzioni di rilevamento della lingua
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },

    interpolation: {
      escapeValue: false, // Non necessario per React
    },

    // Carica le traduzioni solo quando necessario
    partialBundledLanguages: true,

    // Ritardo prima di cambiare lingua (ms)
    load: "languageOnly",
  });

export default i18n;
