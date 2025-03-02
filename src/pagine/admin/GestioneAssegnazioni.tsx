import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Button,
  Stack,
  ListSubheader,
  Menu,
  Divider,
  AvatarGroup,
  Collapse,
  TextField,
  InputAdornment,
  Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import SortIcon from "@mui/icons-material/Sort";
import ViewListIcon from "@mui/icons-material/ViewList";
import SortByAlphaIcon from "@mui/icons-material/SortByAlpha";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import NumbersIcon from "@mui/icons-material/Numbers";
import SearchIcon from "@mui/icons-material/Search";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import FilterListIcon from "@mui/icons-material/FilterList";
import Layout from "../../componenti/layout/Layout";
import { useTranslation } from "react-i18next";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  orderBy,
  Timestamp,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import { Edificio } from "../../tipi/edificio";
import { Incarico, IncaricoCitta } from "../../tipi/incarico";
import { Farm } from "../../tipi/giocatore";
import {
  Assegnazione,
  IncarichiPerEdificio,
  ConteggioAssegnazioni,
} from "../../tipi/assegnazione";
import { Cesto, IncaricoInCesto } from "../../tipi/cesto";
import { Derby } from "../../tipi/derby";
import { SelectChangeEvent } from "@mui/material/Select";

export default function GestioneAssegnazioni() {
  // Aggiungo l'hook useTranslation
  const { t } = useTranslation();

  // Funzione per tradurre il nome dell'incarico
  const getTranslatedName = useCallback(
    (nome: string) => {
      // Verifica se esiste una traduzione per questo incarico
      const traduzione = t(`incarichi.${nome}`, {
        defaultValue: nome,
      });
      return traduzione;
    },
    [t]
  );

  // Stati per i dati
  const [edifici, setEdifici] = useState<Edificio[]>([]);
  const [incarichi, setIncarichi] = useState<Incarico[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [assegnazioni, setAssegnazioni] = useState<Assegnazione[]>([]);
  const [cesti, setCesti] = useState<Cesto[]>([]);
  const [cestiIncarichi, setCestiIncarichi] = useState<
    Map<string, IncaricoInCesto[]>
  >(new Map());
  const [incarichiCitta, setIncarichiCitta] = useState<IncaricoCitta[]>([]);
  const [derbySelezionato, setDerbySelezionato] = useState<Derby | null>(null);
  const [derby, setDerby] = useState<Derby[]>([]);
  const [filtroDerby, setFiltroDerby] = useState<string | null>(null); // Aggiungo questo stato
  const [filtroDerbyIncarichi, setFiltroDerbyIncarichi] = useState<
    string | null
  >(null); // Aggiungo questo stato

  // Stati di ordinamento con inizializzazione da localStorage
  const [ordinamentoLivelloInverso, setOrdinamentoLivelloInverso] = useState(
    () => {
      try {
        return localStorage.getItem("ordinamentoLivelloInverso") === "true";
      } catch {
        return false;
      }
    }
  );

  const [ordinamentoAlfabetico, setOrdinamentoAlfabetico] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoAlfabetico") === "true";
    } catch {
      return false;
    }
  });

  const [ordinamentoAlfabeticoInverso, setOrdinamentoAlfabeticoInverso] =
    useState(() => {
      try {
        return localStorage.getItem("ordinamentoAlfabeticoInverso") === "true";
      } catch {
        return false;
      }
    });

  const [ordinamentoContatori, setOrdinamentoContatori] = useState(() => {
    try {
      return localStorage.getItem("ordinamentoContatori") === "true";
    } catch {
      return false;
    }
  });

  const [ordinamentoContatoriInverso, setOrdinamentoContatoriInverso] =
    useState(() => {
      try {
        return localStorage.getItem("ordinamentoContatoriInverso") === "true";
      } catch {
        return false;
      }
    });

  // Effetti per salvare gli stati di ordinamento
  useEffect(() => {
    localStorage.setItem(
      "ordinamentoLivelloInverso",
      String(ordinamentoLivelloInverso)
    );
  }, [ordinamentoLivelloInverso]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoAlfabetico",
      String(ordinamentoAlfabetico)
    );
  }, [ordinamentoAlfabetico]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoAlfabeticoInverso",
      String(ordinamentoAlfabeticoInverso)
    );
  }, [ordinamentoAlfabeticoInverso]);

  useEffect(() => {
    localStorage.setItem("ordinamentoContatori", String(ordinamentoContatori));
  }, [ordinamentoContatori]);

  useEffect(() => {
    localStorage.setItem(
      "ordinamentoContatoriInverso",
      String(ordinamentoContatoriInverso)
    );
  }, [ordinamentoContatoriInverso]);

  // Inizializza gli stati di espansione dal localStorage
  const [expandedEdifici, setExpandedEdifici] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedEdifici");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [expandedIncarichi, setExpandedIncarichi] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedIncarichi");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cestiExpanded, setCestiExpanded] = useState<boolean>(false);
  const [cittaExpanded, setCittaExpanded] = useState<boolean>(false);
  const [incarichiExpanded, setIncarichiExpanded] = useState<boolean>(false);
  // Forza sempre a false all'avvio, ignorando eventuali valori salvati
  const [filtriDerbyExpanded, setFiltriDerbyExpanded] =
    useState<boolean>(false);

  // Aggiungiamo un effetto per salvare lo stato nel localStorage
  useEffect(() => {
    localStorage.removeItem("filtriDerbyExpanded"); // Rimuoviamo qualsiasi valore salvato
  }, []); // Esegui solo all'avvio

  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<{
    id: string;
    element: HTMLElement;
  } | null>(null);
  const [progressi, setProgressi] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState("");

  // All'inizio del componente, dopo gli altri stati
  const [visualizzazioneGlobale, setVisualizzazioneGlobale] = useState(() => {
    try {
      return localStorage.getItem("visualizzazioneGlobale") === "true";
    } catch {
      return false;
    }
  });

  // Aggiungo uno stato per gestire la transizione tra le visualizzazioni
  const [inTransizione, setInTransizione] = useState(false);

  // Stato per memorizzare i gruppi di incarichi
  const [gruppiIncarichi, setGruppiIncarichi] = useState<
    IncarichiPerEdificio[]
  >([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Funzione helper per la ricerca case-insensitive e gestione caratteri speciali
  const matchSearch = useCallback(
    (text: string | undefined | null) => {
      if (!searchQuery) return true;
      if (!text) return false;
      const normalizedText = getTranslatedName(text)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const normalizedQuery = searchQuery
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return normalizedText.includes(normalizedQuery);
    },
    [searchQuery, getTranslatedName]
  );

  // Funzione per verificare se un incarico corrisponde alla ricerca
  const matchesSearch = useCallback(
    (incarico: Incarico) => {
      return matchSearch(incarico.nome);
    },
    [matchSearch]
  );

  // Filtra i cesti in base alla ricerca
  const cestiFiltrati = useMemo(() => {
    if (!searchQuery) return cesti;

    return cesti.filter((cesto) => {
      // Controlla se il nome del cesto corrisponde alla ricerca
      if (matchSearch(cesto.nome)) return true;

      // Controlla se uno degli incarichi nel cesto corrisponde alla ricerca
      return cesto.incarichi.some((inc) => {
        const incarico = incarichi.find((i) => i.id === inc.incarico_id);
        return incarico && matchSearch(incarico.nome);
      });
    });
  }, [cesti, searchQuery, incarichi, matchSearch]);

  // Filtra gli incarichi città in base alla ricerca
  const incarichiCittaFiltrati = useMemo(() => {
    if (!searchQuery) return incarichiCitta;
    return incarichiCitta.filter((incarico) => matchSearch(incarico.nome));
  }, [incarichiCitta, searchQuery, matchSearch]);

  // Effetto per gestire l'espansione automatica durante la ricerca
  useEffect(() => {
    if (searchQuery) {
      // Espande i cesti se contengono risultati
      const hasMatchingCesti = cestiFiltrati.length > 0;
      if (hasMatchingCesti) {
        setCestiExpanded(true);
      }

      // Espande la sezione città se contiene risultati
      const hasMatchingCitta = incarichiCittaFiltrati.length > 0;
      if (hasMatchingCitta) {
        setCittaExpanded(true);
      }

      // Espande gli edifici che contengono risultati o che corrispondono alla ricerca
      const edificiDaEspandere = new Set<string>();

      // Aggiungi edifici che contengono incarichi corrispondenti
      gruppiIncarichi
        .filter((gruppo) =>
          gruppo.incarichi.some(({ incarico }) => matchSearch(incarico.nome))
        )
        .forEach((gruppo) => {
          if (gruppo.edificio_id) {
            edificiDaEspandere.add(gruppo.edificio_id);
          }
        });

      // Aggiungi edifici che corrispondono direttamente alla ricerca
      edifici
        .filter((edificio) => matchSearch(edificio.nome))
        .forEach((edificio) => {
          edificiDaEspandere.add(edificio.id);
        });

      setExpandedEdifici(Array.from(edificiDaEspandere));
    }
  }, [
    searchQuery,
    cestiFiltrati,
    incarichiCittaFiltrati,
    gruppiIncarichi,
    edifici,
    matchSearch,
  ]);

  // Funzione per gestire l'espansione dei giocatori
  const handleToggleGiocatori = (
    incaricoId: string,
    tipo: "attivi" | "inattivi" | "completati_attivi" | "completati_inattivi"
  ) => {
    const key = `${incaricoId}_${tipo}`;
    setExpandedIncarichi((prev) => {
      const isExpanded = prev.includes(key);
      if (isExpanded) {
        return prev.filter((item) => item !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  // Carica i dati iniziali
  useEffect(() => {
    const caricaDati = async () => {
      setLoading(true);
      try {
        // Carica gli edifici
        const edificiQuery = query(collection(db, "edifici"));
        const edificiSnapshot = await getDocs(edificiQuery);
        setEdifici(
          edificiSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Edificio)
          )
        );

        // Carica gli incarichi
        const incarichiQuery = query(collection(db, "incarichi"));
        const incarichiSnapshot = await getDocs(incarichiQuery);
        setIncarichi(
          incarichiSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as Incarico)
          )
        );

        // Carica gli incarichi città
        const incarichiCittaQuery = query(collection(db, "incarichi_citta"));
        const incarichiCittaSnapshot = await getDocs(incarichiCittaQuery);
        setIncarichiCitta(
          incarichiCittaSnapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() } as IncaricoCitta)
          )
        );

        // Carica i derby
        const derbyQuery = query(collection(db, "derby"));
        const derbySnapshot = await getDocs(derbyQuery);
        const derbyData = derbySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Derby[];
        setDerby(derbyData);

        // Imposta il derby attivo come selezionato
        const derbyAttivo = derbyData.find((d) => d.attivo);
        if (derbyAttivo) {
          setDerbySelezionato(derbyAttivo);
        }

        // Carica giocatori e le loro farm
        const giocatoriQuery = query(collection(db, "utenti"));
        const giocatoriSnapshot = await getDocs(giocatoriQuery);
        const farmsData: Farm[] = [];

        giocatoriSnapshot.docs.forEach((doc) => {
          const giocatore = doc.data();
          // Verifica che sia un giocatore o un moderatore e non un admin
          if (giocatore.ruolo !== "admin" && giocatore.farms) {
            giocatore.farms.forEach((farm: any, index: number) => {
              const farmId = `${doc.id}_${index}`;
              farmsData.push({
                id: farmId,
                farmId: farmId,
                nome: farm.nome || "Farm senza nome",
                livello: farm.livello || 1,
                isAttiva: farm.stato === "attivo",
                diamanti: farm.diamanti || 0,
                immagine: farm.immagine || "",
                giocatore_id: doc.id,
                giocatore_nome: giocatore.nome || "Giocatore senza nome",
                stato: farm.stato || "attivo",
                principale: index === 0, // La prima farm è considerata principale
                derby_tags: farm.derby_tags || [],
              });
            });
          }
        });

        // Ordina le farm per nome del giocatore
        farmsData.sort((a, b) => {
          const nomeA = a.giocatore_nome || "";
          const nomeB = b.giocatore_nome || "";
          return nomeA.localeCompare(nomeB);
        });
        setFarms(farmsData);

        // Carica cesti
        const cestiQuery = query(collection(db, "cesti"));
        const cestiSnapshot = await getDocs(cestiQuery);
        const cestiData = cestiSnapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              data_creazione: doc.data().data_creazione?.toDate() || new Date(),
            } as Cesto)
        );
        setCesti(cestiData);

        // Carica assegnazioni
        await caricaAssegnazioni();

        // Carica progressi
        const progressiQuery = query(collection(db, "progressi_incarichi"));
        const progressiSnapshot = await getDocs(progressiQuery);
        const progressiData: { [key: string]: number } = {};
        progressiSnapshot.docs.forEach((doc) => {
          const progresso = doc.data();
          progressiData[`${progresso.farm_id}_${progresso.riferimento_id}`] =
            progresso.quantita || 0;
        });
        setProgressi(progressiData);
      } catch (error) {
        console.error("Errore nel caricamento dei dati:", error);
      } finally {
        setLoading(false);
      }
    };

    caricaDati();
  }, []);

  // Salva gli stati di espansione nel localStorage quando cambiano
  useEffect(() => {
    try {
      localStorage.setItem(
        "expandedEdifici",
        JSON.stringify(Array.from(expandedEdifici))
      );
    } catch (error) {
      console.error("Errore nel salvataggio degli edifici espansi:", error);
    }
  }, [expandedEdifici]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "expandedIncarichi",
        JSON.stringify(Array.from(expandedIncarichi))
      );
    } catch (error) {
      console.error("Errore nel salvataggio degli incarichi espansi:", error);
    }
  }, [expandedIncarichi]);

  useEffect(() => {
    localStorage.setItem("cestiExpanded", String(cestiExpanded));
  }, [cestiExpanded]);

  useEffect(() => {
    localStorage.setItem("cittaExpanded", String(cittaExpanded));
  }, [cittaExpanded]);

  useEffect(() => {
    localStorage.setItem("incarichiExpanded", String(incarichiExpanded));
  }, [incarichiExpanded]);

  // Salva la modalità di visualizzazione quando cambia
  useEffect(() => {
    try {
      // Imposta lo stato di transizione a true
      setInTransizione(true);

      localStorage.setItem(
        "visualizzazioneGlobale",
        String(visualizzazioneGlobale)
      );

      // Se passiamo alla modalità globale, salviamo lo stato precedente degli edifici
      if (visualizzazioneGlobale) {
        localStorage.setItem(
          "expandedEdificiPreGlobale",
          JSON.stringify(expandedEdifici)
        );
        // Ripristina le espansioni globali precedenti se esistono
        const savedGlobalExpanded = localStorage.getItem(
          "expandedEdificiGlobale"
        );
        if (savedGlobalExpanded) {
          setExpandedEdifici(JSON.parse(savedGlobalExpanded));
        }
      } else {
        // Se torniamo alla modalità per edificio, salviamo lo stato globale
        localStorage.setItem(
          "expandedEdificiGlobale",
          JSON.stringify(expandedEdifici)
        );
        // Ripristina le espansioni per edificio precedenti
        const savedPreGlobale = localStorage.getItem(
          "expandedEdificiPreGlobale"
        );
        if (savedPreGlobale) {
          setExpandedEdifici(JSON.parse(savedPreGlobale));
        }
      }

      // Dopo un breve ritardo, imposta lo stato di transizione a false
      setTimeout(() => {
        setInTransizione(false);
      }, 300);
    } catch (error) {
      console.error(
        "Errore nel salvataggio della modalità di visualizzazione:",
        error
      );
      setInTransizione(false);
    }
  }, [visualizzazioneGlobale]);

  // Funzione per ottenere il progresso di un incarico per una farm
  const getProgressoIncarico = (incaricoId: string, farmId: string): number => {
    return progressi[`${farmId}_${incaricoId}`] || 0;
  };

  // Funzione per calcolare quante volte un incarico è stato completato
  const getCompletamentiIncarico = (
    progresso: number,
    quantita: number
  ): number => {
    return quantita > 0 ? Math.floor(progresso / quantita) : 0;
  };

  // Funzione per calcolare i progressi di un incarico per una farm
  const getProgressoIncaricoFarm = async (
    incaricoId: string,
    farmId: string
  ): Promise<number> => {
    try {
      const progressiQuery = query(
        collection(db, "progressi_incarichi"),
        where("farm_id", "==", farmId),
        where("riferimento_id", "==", incaricoId),
        where("tipo", "==", "incarico")
      );

      const progressiSnapshot = await getDocs(progressiQuery);
      if (!progressiSnapshot.empty) {
        return progressiSnapshot.docs[0].data().quantita || 0;
      }
      return 0;
    } catch (error) {
      console.error("Errore nel recupero del progresso:", error);
      return 0;
    }
  };

  // Calcola i conteggi per un incarico considerando i completamenti multipli
  const calcolaConteggi = async (
    incaricoId: string
  ): Promise<ConteggioAssegnazioni> => {
    const incarico = incarichi.find((i) => i.id === incaricoId);
    if (!incarico)
      return {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };

    // Conta le assegnazioni
    const assegnazioniIncarico = assegnazioni.filter(
      (a) => a.tipo === "incarico" && a.riferimento_id === incaricoId
    );

    const conteggi = {
      totaleAttive: 0,
      totaleInattive: 0,
      completateAttive: 0,
      completateInattive: 0,
      completateSenzaAssegnazioneAttive: 0,
      completateSenzaAssegnazioneInattive: 0,
    };

    // Conta le assegnazioni per farm attive/inattive
    assegnazioniIncarico.forEach((ass) => {
      const farm = farms.find((f) => f.id === ass.farm_id);
      if (farm) {
        if (farm.isAttiva) {
          conteggi.totaleAttive++;
        } else {
          conteggi.totaleInattive++;
        }
      }
    });

    // Conta i completamenti per tutte le farm
    await Promise.all(
      farms.map(async (farm) => {
        const progresso = await getProgressoIncaricoFarm(incaricoId, farm.id);
        const completamenti = getCompletamentiIncarico(
          progresso,
          getQuantitaIncarico(incarico)
        );

        if (completamenti > 0) {
          const haAssegnazione = assegnazioniIncarico.some(
            (a) => a.farm_id === farm.id
          );

          if (farm.isAttiva) {
            if (haAssegnazione) {
              conteggi.completateAttive += completamenti;
            } else {
              conteggi.completateSenzaAssegnazioneAttive += completamenti;
            }
          } else {
            if (haAssegnazione) {
              conteggi.completateInattive += completamenti;
            } else {
              conteggi.completateSenzaAssegnazioneInattive += completamenti;
            }
          }
        }
      })
    );

    return conteggi;
  };

  // Modifica la funzione incarichiPerEdificio per supportare la visualizzazione globale
  const incarichiPerEdificio = useMemo(async (): Promise<
    IncarichiPerEdificio[]
  > => {
    const gruppi: { [key: string]: IncarichiPerEdificio } = {};

    // Filtra gli incarichi in base alla ricerca e al derby selezionato
    const incarichiFiltrati = incarichi.filter((inc) => {
      // Applica il filtro di ricerca
      const matchesSearch = !searchQuery || matchSearch(inc.nome);

      // Applica il filtro per derby
      const matchesDerby =
        !filtroDerbyIncarichi ||
        (inc.derby_tags && inc.derby_tags.includes(filtroDerbyIncarichi));

      return matchesSearch && matchesDerby;
    });

    if (visualizzazioneGlobale) {
      gruppi["tutti"] = {
        edificio_id: "tutti",
        nome_edificio: "Tutti gli incarichi",
        livello_edificio: 0,
        incarichi: [],
      };
    } else {
      // Filtra gli edifici in base alla ricerca o che contengono incarichi che corrispondono alla ricerca
      const edificiConIncarichiFiltrati = edifici.filter(
        (e) =>
          !searchQuery ||
          matchSearch(e.nome) ||
          incarichiFiltrati.some((inc) => inc.edificio_id === e.id)
      );

      edificiConIncarichiFiltrati.forEach((edificio) => {
        gruppi[edificio.id] = {
          edificio_id: edificio.id,
          nome_edificio: edificio.nome,
          livello_edificio: edificio.livello,
          incarichi: [],
        };
      });
    }

    const incarichiConConteggi = await Promise.all(
      incarichiFiltrati.map(async (incarico) => {
        const conteggi = await calcolaConteggi(incarico.id);
        const giocatoriAssegnati = assegnazioni
          .filter(
            (a) => a.tipo === "incarico" && a.riferimento_id === incarico.id
          )
          .map((ass) => {
            const farm = farms.find((f) => f.id === ass.farm_id);
            if (!farm || !farm.giocatore_id || !farm.giocatore_nome)
              return null;
            return {
              giocatore_id: farm.giocatore_id,
              nome_giocatore: farm.giocatore_nome,
              farm_id: farm.id,
              nome_farm: farm.nome,
              isAttiva: farm.isAttiva,
              completato: ass.completato,
            };
          })
          .filter((g): g is NonNullable<typeof g> => g !== null);

        return {
          incarico, // Usa l'oggetto incarico completo invece di crearne uno nuovo
          conteggi,
          giocatori_assegnati: giocatoriAssegnati,
        };
      })
    );

    if (visualizzazioneGlobale) {
      gruppi["tutti"].incarichi = incarichiConConteggi;
      gruppi["tutti"].incarichi.sort((a, b) => {
        if (ordinamentoContatori) {
          // Ordina per numero totale di assegnazioni e completamenti
          const totaleA = a.conteggi.totaleAttive + a.conteggi.totaleInattive;
          const totaleB = b.conteggi.totaleAttive + b.conteggi.totaleInattive;
          const completamentiA =
            a.conteggi.completateAttive + a.conteggi.completateInattive;
          const completamentiB =
            b.conteggi.completateAttive + b.conteggi.completateInattive;

          const confronto = ordinamentoContatoriInverso
            ? totaleB - totaleA || completamentiB - completamentiA
            : totaleA - totaleB || completamentiA - completamentiB;

          return (
            confronto ||
            getTranslatedName(a.incarico.nome).localeCompare(
              getTranslatedName(b.incarico.nome)
            )
          );
        } else if (ordinamentoAlfabetico) {
          return ordinamentoAlfabeticoInverso
            ? getTranslatedName(b.incarico.nome).localeCompare(
                getTranslatedName(a.incarico.nome)
              )
            : getTranslatedName(a.incarico.nome).localeCompare(
                getTranslatedName(b.incarico.nome)
              );
        } else {
          const compareLivello = ordinamentoLivelloInverso
            ? b.incarico.livello_minimo - a.incarico.livello_minimo
            : a.incarico.livello_minimo - b.incarico.livello_minimo;
          return (
            compareLivello ||
            getTranslatedName(a.incarico.nome).localeCompare(
              getTranslatedName(b.incarico.nome)
            )
          );
        }
      });
    } else {
      // Distribuisci gli incarichi filtrati nei rispettivi edifici
      for (const incarico of incarichiConConteggi) {
        if (
          incarico.incarico.edificio_id &&
          gruppi[incarico.incarico.edificio_id]
        ) {
          gruppi[incarico.incarico.edificio_id].incarichi.push(incarico);
        }
      }

      // Ordina gli incarichi in ogni edificio
      Object.values(gruppi).forEach((gruppo) => {
        gruppo.incarichi.sort((a, b) => {
          if (ordinamentoContatori) {
            // Ordina per numero totale di assegnazioni e completamenti
            const totaleA = a.conteggi.totaleAttive + a.conteggi.totaleInattive;
            const totaleB = b.conteggi.totaleAttive + b.conteggi.totaleInattive;
            const completamentiA =
              a.conteggi.completateAttive + a.conteggi.completateInattive;
            const completamentiB =
              b.conteggi.completateAttive + b.conteggi.completateInattive;

            const confronto = ordinamentoContatoriInverso
              ? totaleB - totaleA || completamentiB - completamentiA
              : totaleA - totaleB || completamentiA - completamentiB;

            return (
              confronto ||
              getTranslatedName(a.incarico.nome).localeCompare(
                getTranslatedName(b.incarico.nome)
              )
            );
          } else if (ordinamentoAlfabetico) {
            return ordinamentoAlfabeticoInverso
              ? getTranslatedName(b.incarico.nome).localeCompare(
                  getTranslatedName(a.incarico.nome)
                )
              : getTranslatedName(a.incarico.nome).localeCompare(
                  getTranslatedName(b.incarico.nome)
                );
          } else {
            const compareLivello = ordinamentoLivelloInverso
              ? b.incarico.livello_minimo - a.incarico.livello_minimo
              : a.incarico.livello_minimo - b.incarico.livello_minimo;
            return (
              compareLivello || a.incarico.nome.localeCompare(b.incarico.nome)
            );
          }
        });
      });

      // Rimuovi gli edifici che non hanno incarichi dopo il filtraggio
      Object.keys(gruppi).forEach((key) => {
        if (gruppi[key].incarichi.length === 0) {
          delete gruppi[key];
        }
      });
    }

    return Object.values(gruppi).sort(
      (a, b) => a.livello_edificio - b.livello_edificio
    );
  }, [
    edifici,
    incarichi,
    assegnazioni,
    farms,
    ordinamentoAlfabetico,
    ordinamentoLivelloInverso,
    ordinamentoAlfabeticoInverso,
    visualizzazioneGlobale,
    ordinamentoContatori,
    ordinamentoContatoriInverso,
    searchQuery,
    matchSearch,
    filtroDerbyIncarichi,
  ]);

  // Effetto per caricare i gruppi di incarichi
  useEffect(() => {
    const caricaGruppi = async () => {
      const gruppi = await incarichiPerEdificio;
      setGruppiIncarichi(gruppi);
    };
    caricaGruppi();
  }, [incarichiPerEdificio]);

  // Calcolo del livello del cesto in base agli incarichi contenuti
  const getLivelloCesto = (cesto: Cesto) => {
    const livelliIncarichi = cesto.incarichi
      .map((i) => incarichi.find((inc) => inc.id === i.incarico_id))
      .filter((i): i is Incarico => i !== undefined)
      .map((i) => i.livello_minimo);

    return Math.max(...livelliIncarichi);
  };

  // Funzione per ottenere i conteggi di un cesto
  const getConteggiCesto = (cesto: Cesto) => {
    const assegnazioniCesto = assegnazioni.filter(
      (a) => a.tipo === "cesto" && a.riferimento_id === cesto.id
    );

    const conteggi = {
      attive: 0,
      inattive: 0,
      completateAttive: 0,
      completateInattive: 0,
      completateSenzaAssegnazioneAttive: 0,
      completateSenzaAssegnazioneInattive: 0,
    };

    assegnazioniCesto.forEach((assegnazione) => {
      const farm = farms.find((f) => f.farmId === assegnazione.farm_id);
      if (farm) {
        // Calcola quante volte ogni incarico nel cesto può essere completato
        const completamentiIncarichi = cesto.incarichi.map(
          (incaricoInCesto) => {
            const incarico = incarichi.find(
              (i) => i.id === incaricoInCesto.incarico_id
            );
            if (!incarico) return 0;
            const progresso = getProgressoIncarico(incarico.id, farm.id);
            return getCompletamentiIncarico(
              progresso,
              getQuantitaIncaricoCesto(cesto.id, incarico.id)
            );
          }
        );

        // Il cesto è completato il numero minimo di volte che ogni incarico può essere completato
        const completamenti = Math.min(...completamentiIncarichi);

        if (farm.isAttiva) {
          conteggi.attive++;
          if (completamenti > 0) {
            conteggi.completateAttive += completamenti;
          }
        } else {
          conteggi.inattive++;
          if (completamenti > 0) {
            conteggi.completateInattive += completamenti;
          }
        }
      }
    });

    return conteggi;
  };

  // Funzione per caricare le assegnazioni
  const caricaAssegnazioni = async () => {
    try {
      let assegnazioniQuery = query(collection(db, "assegnazioni"));

      // Se è selezionato un derby, filtra le farm in base ai derby_tags
      const assegnazioniSnapshot = await getDocs(assegnazioniQuery);
      let assegnazioniData = assegnazioniSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as Assegnazione)
      );

      // Filtra le assegnazioni se è selezionato un derby
      if (filtroDerby) {
        assegnazioniData = assegnazioniData.filter((assegnazione) => {
          const farm = farms.find((f) => f.id === assegnazione.farm_id);
          return (
            farm && farm.derby_tags && farm.derby_tags.includes(filtroDerby)
          );
        });
      }

      setAssegnazioni(assegnazioniData);
    } catch (error) {
      console.error("Errore nel caricamento delle assegnazioni:", error);
    }
  };

  // Gestisce l'espansione/collasso degli edifici
  const handleEdificioToggle = (edificioId: string | null) => {
    if (!edificioId) return;
    setExpandedEdifici((prev) =>
      prev.includes(edificioId)
        ? prev.filter((e) => e !== edificioId)
        : [...prev, edificioId]
    );
  };

  // Gestisce l'espansione/collasso di tutti gli edifici
  const handleToggleAll = () => {
    if (expandedEdifici.length === gruppiIncarichi.length) {
      setExpandedEdifici([]);
    } else {
      const edificiIds = gruppiIncarichi
        .map((e) => e.edificio_id)
        .filter((id): id is string => id !== null);
      setExpandedEdifici(edificiIds);
    }
  };

  // Funzione per rimuovere un'assegnazione
  const handleRimuoviAssegnazione = async (
    assegnazioneId: string,
    tipo: "cesto" | "incarico"
  ) => {
    try {
      const assegnazione = assegnazioni.find((a) => a.id === assegnazioneId);
      if (!assegnazione) return;

      const batch = writeBatch(db);
      const assegnazioniDaRimuovere = new Set<string>();

      if (tipo === "incarico") {
        // Aggiungi l'assegnazione dell'incarico da rimuovere
        assegnazioniDaRimuovere.add(assegnazioneId);

        // Trova tutti i cesti che contengono questo incarico
        const cestiCorrelati = cesti.filter((cesto) =>
          cesto.incarichi.some(
            (inc) => inc.incarico_id === assegnazione.riferimento_id
          )
        );

        // Per ogni cesto correlato, se è assegnato alla stessa farm, rimuovilo
        for (const cesto of cestiCorrelati) {
          const assegnazioneCesto = assegnazioni.find(
            (a) =>
              a.tipo === "cesto" &&
              a.riferimento_id === cesto.id &&
              a.farm_id === assegnazione.farm_id
          );

          if (assegnazioneCesto) {
            assegnazioniDaRimuovere.add(assegnazioneCesto.id);
          }
        }
      } else {
        // Se stiamo rimuovendo un cesto, prima rimuoviamo gli incarichi
        const cesto = cesti.find((c) => c.id === assegnazione.riferimento_id);
        if (cesto) {
          // Trova tutte le assegnazioni degli incarichi correlati
          const assegnazioniIncarichi = assegnazioni.filter(
            (a) =>
              a.tipo === "incarico" &&
              a.farm_id === assegnazione.farm_id &&
              cesto.incarichi.some((i) => i.incarico_id === a.riferimento_id)
          );

          // Prima aggiungi gli incarichi da rimuovere
          assegnazioniIncarichi.forEach((a) =>
            assegnazioniDaRimuovere.add(a.id)
          );
        }

        // Poi aggiungi l'assegnazione del cesto
        assegnazioniDaRimuovere.add(assegnazioneId);
      }

      // Rimuovi prima gli incarichi e poi il cesto
      const assegnazioniOrdinate = Array.from(assegnazioniDaRimuovere).sort(
        (a, b) => {
          const assA = assegnazioni.find((ass) => ass.id === a);
          const assB = assegnazioni.find((ass) => ass.id === b);
          // Gli incarichi vengono prima dei cesti
          return (
            (assA?.tipo === "incarico" ? 0 : 1) -
            (assB?.tipo === "incarico" ? 0 : 1)
          );
        }
      );

      // Rimuovi tutte le assegnazioni in batch nell'ordine corretto
      assegnazioniOrdinate.forEach((id) => {
        batch.delete(doc(db, "assegnazioni", id));
      });

      await batch.commit();

      // Aggiorna lo stato locale nell'ordine corretto
      setAssegnazioni((prev) => {
        const newAssegnazioni = [...prev];
        assegnazioniOrdinate.forEach((id) => {
          const index = newAssegnazioni.findIndex((a) => a.id === id);
          if (index !== -1) {
            newAssegnazioni.splice(index, 1);
          }
        });
        return newAssegnazioni;
      });
    } catch (error) {
      console.error("Errore nella rimozione dell'assegnazione:", error);
      // In caso di errore, ricarica tutte le assegnazioni
      await caricaAssegnazioni();
    }
  };

  // Funzione per ottenere le farm disponibili per un incarico
  const getFarmDisponibili = (incarico: Incarico) => {
    const farmAssegnate = assegnazioni
      .filter((a) => a.tipo === "incarico" && a.riferimento_id === incarico.id)
      .map((a) => a.farm_id);

    return farms.filter(
      (farm) =>
        !farmAssegnate.includes(farm.farmId) &&
        farm.livello >= incarico.livello_minimo
    );
  };

  // Funzione per assegnare un incarico
  const handleAssegnaIncarico = async (incaricoId: string, farmId: string) => {
    try {
      // Verifica se l'incarico è già stato assegnato a questa farm
      const assegnazioneEsistente = assegnazioni.find(
        (a) =>
          a.tipo === "incarico" &&
          a.riferimento_id === incaricoId &&
          a.farm_id === farmId
      );

      if (assegnazioneEsistente) {
        console.error("Incarico già assegnato a questa farm");
        return;
      }

      const nuovaAssegnazione: Omit<Assegnazione, "id"> = {
        farm_id: farmId,
        tipo: "incarico",
        riferimento_id: incaricoId,
        completato: false,
        data_assegnazione: Timestamp.now(),
      };

      const docRef = await addDoc(
        collection(db, "assegnazioni"),
        nuovaAssegnazione
      );
      setAssegnazioni((prev) => [
        ...prev,
        { id: docRef.id, ...nuovaAssegnazione },
      ]);
    } catch (error) {
      console.error("Errore nell'assegnazione dell'incarico:", error);
    }
  };

  // Funzione per completare un incarico
  const handleToggleCompletamento = async (
    assegnazioneId: string,
    completato: boolean
  ) => {
    try {
      await updateDoc(doc(db, "assegnazioni", assegnazioneId), {
        completato: !completato,
      });

      setAssegnazioni((prev) =>
        prev.map((ass) =>
          ass.id === assegnazioneId ? { ...ass, completato: !completato } : ass
        )
      );
    } catch (error) {
      console.error("Errore nel toggle del completamento:", error);
    }
  };

  // Funzione per assegnare un cesto
  const handleAssegnaCesto = async (cestoId: string, farmId: string) => {
    try {
      const cesto = cesti.find((c) => c.id === cestoId);
      if (!cesto) return;

      // Verifica se il cesto è già stato assegnato a questa farm
      const assegnazioniCesto = assegnazioni.filter(
        (a) =>
          a.tipo === "cesto" &&
          a.riferimento_id === cestoId &&
          a.farm_id === farmId
      );

      if (assegnazioniCesto.length > 0) {
        console.error("Cesto già assegnato a questa farm");
        return;
      }

      // Crea l'assegnazione del cesto
      const nuovaAssegnazioneCesto: Omit<Assegnazione, "id"> = {
        farm_id: farmId,
        tipo: "cesto",
        riferimento_id: cestoId,
        completato: false,
        data_assegnazione: Timestamp.now(),
      };

      // Crea le assegnazioni per ogni incarico nel cesto che non è già assegnato
      const nuoveAssegnazioniIncarichi: Omit<Assegnazione, "id">[] = [];
      for (const inc of cesto.incarichi) {
        const esisteAssegnazione = assegnazioni.some(
          (a) =>
            a.tipo === "incarico" &&
            a.riferimento_id === inc.incarico_id &&
            a.farm_id === farmId
        );

        if (!esisteAssegnazione) {
          nuoveAssegnazioniIncarichi.push({
            farm_id: farmId,
            tipo: "incarico",
            riferimento_id: inc.incarico_id,
            completato: false,
            data_assegnazione: Timestamp.now(),
          });
        }
      }

      // Salva tutte le assegnazioni in una batch
      const batch = writeBatch(db);

      // Aggiungi l'assegnazione del cesto
      const cestoRef = doc(collection(db, "assegnazioni"));
      batch.set(cestoRef, nuovaAssegnazioneCesto);

      // Aggiungi solo le nuove assegnazioni degli incarichi
      const nuoveAssegnazioniRefs = nuoveAssegnazioniIncarichi.map(() =>
        doc(collection(db, "assegnazioni"))
      );
      nuoveAssegnazioniIncarichi.forEach((assegnazione, index) => {
        batch.set(nuoveAssegnazioniRefs[index], assegnazione);
      });

      await batch.commit();

      // Aggiorna lo stato locale
      setAssegnazioni((prev) => [
        ...prev,
        { id: cestoRef.id, ...nuovaAssegnazioneCesto },
        ...nuoveAssegnazioniIncarichi.map((a, i) => ({
          id: nuoveAssegnazioniRefs[i].id,
          ...a,
        })),
      ]);
    } catch (error) {
      console.error("Errore nell'assegnazione del cesto:", error);
    }
  };

  // Funzione per rimuovere un cesto
  const handleRimuoviCesto = async (assegnazioneId: string) => {
    try {
      const assegnazioneCesto = assegnazioni.find(
        (a) => a.id === assegnazioneId
      );
      if (!assegnazioneCesto || assegnazioneCesto.tipo !== "cesto") return;

      const cesto = cesti.find(
        (c) => c.id === assegnazioneCesto.riferimento_id
      );
      if (!cesto) return;

      // Trova tutte le assegnazioni degli incarichi correlate
      const assegnazioniCorrelate = assegnazioni.filter(
        (a) =>
          a.tipo === "incarico" &&
          a.farm_id === assegnazioneCesto.farm_id &&
          cesto.incarichi.some((i) => i.incarico_id === a.riferimento_id)
      );

      // Rimuovi tutte le assegnazioni in batch
      const batch = writeBatch(db);

      // Rimuovi l'assegnazione del cesto
      batch.delete(doc(db, "assegnazioni", assegnazioneId));

      // Rimuovi le assegnazioni degli incarichi
      for (const assegnazione of assegnazioniCorrelate) {
        batch.delete(doc(db, "assegnazioni", assegnazione.id));
      }

      await batch.commit();

      // Aggiorna lo stato locale
      setAssegnazioni((prev) =>
        prev.filter(
          (a) =>
            a.id !== assegnazioneId &&
            !assegnazioniCorrelate.some((ac) => ac.id === a.id)
        )
      );
    } catch (error) {
      console.error("Errore nella rimozione del cesto:", error);
    }
  };

  // Verifica se tutti gli incarichi di un cesto sono stati assegnati a una farm
  const verificaCestoCompleto = (cesto: Cesto, farmId: string) => {
    // Verifica se il cesto è già assegnato
    const cestoAssegnato = assegnazioni.some(
      (a) =>
        a.tipo === "cesto" &&
        a.riferimento_id === cesto.id &&
        a.farm_id === farmId
    );

    // Se il cesto è già assegnato, non considerarlo completo
    if (cestoAssegnato) return false;

    // Verifica che tutti gli incarichi del cesto siano assegnati
    const incarichiAssegnati = cesto.incarichi.every((inc) =>
      assegnazioni.some(
        (a) =>
          a.tipo === "incarico" &&
          a.riferimento_id === inc.incarico_id &&
          a.farm_id === farmId
      )
    );

    return incarichiAssegnati;
  };

  // Gestisce l'assegnazione automatica del cesto quando tutti i suoi incarichi sono stati assegnati
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const gestisciAutoAssegnazioneCesti = async () => {
      // Aspetta un momento più breve per assicurarsi che lo stato sia stabile
      timeoutId = setTimeout(async () => {
        const batch = writeBatch(db);
        let nuoveAssegnazioni: Assegnazione[] = [];

        for (const cesto of cesti) {
          const farmConIncarichiCompleti = farms.filter((farm) =>
            verificaCestoCompleto(cesto, farm.farmId)
          );

          // Assegna automaticamente il cesto a tutte le farm che hanno tutti gli incarichi
          for (const farm of farmConIncarichiCompleti) {
            const nuovaAssegnazioneCesto: Omit<Assegnazione, "id"> = {
              farm_id: farm.farmId,
              tipo: "cesto",
              riferimento_id: cesto.id,
              completato: false,
              data_assegnazione: Timestamp.now(),
            };

            const cestoRef = doc(collection(db, "assegnazioni"));
            batch.set(cestoRef, nuovaAssegnazioneCesto);

            nuoveAssegnazioni.push({
              id: cestoRef.id,
              ...nuovaAssegnazioneCesto,
            });
          }
        }

        if (nuoveAssegnazioni.length > 0) {
          await batch.commit();
          setAssegnazioni((prev) => [...prev, ...nuoveAssegnazioni]);
        }
      }, 100); // Ridotto a 100ms per una risposta più veloce
    };

    gestisciAutoAssegnazioneCesti();

    // Cleanup del timeout quando il componente si smonta o l'effetto viene ri-eseguito
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [assegnazioni, cesti]); // Ora reagisce a qualsiasi cambiamento nelle assegnazioni o nei cesti

  // Funzione per ottenere i giocatori assegnati a un cesto
  const getGiocatoriAssegnatiCesto = (cestoId: string) => {
    return assegnazioni
      .filter((a) => a.tipo === "cesto" && a.riferimento_id === cestoId)
      .map((ass) => {
        const farm = farms.find((f) => f.farmId === ass.farm_id);
        if (!farm) return null;

        return {
          giocatore_id: farm.giocatore_id,
          nome_giocatore: farm.giocatore_nome,
          farm_id: farm.farmId,
          nome_farm: farm.nome,
          isAttiva: farm.isAttiva,
          completato: ass.completato,
          assegnazione_id: ass.id,
        };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  };

  // Funzione per scrollare e evidenziare un incarico
  const scrollToIncarico = (incaricoId: string) => {
    // Cerca l'incarico
    const incarico = incarichi.find((i) => i.id === incaricoId);
    const incaricoInCitta = incarichiCitta.find((inc) => inc.id === incaricoId);

    if (visualizzazioneGlobale) {
      // Se siamo in visualizzazione globale, espandi l'header "Tutti gli incarichi"
      if (!expandedEdifici.includes("tutti")) {
        setExpandedEdifici((prev) => [...prev, "tutti"]);
      }
    } else if (incarico?.edificio_id) {
      // Se l'incarico appartiene a un edificio, espandi l'edificio
      setExpandedEdifici((prev) =>
        prev.includes(incarico.edificio_id!)
          ? prev
          : [...prev, incarico.edificio_id!]
      );
    } else if (incaricoInCitta) {
      // Se è un incarico città, espandi la sezione città
      setCittaExpanded(true);
    }

    // Aspetta che il DOM si aggiorni dopo l'espansione
    setTimeout(() => {
      const elementId = incaricoInCitta
        ? `citta_${incaricoId}`
        : `incarico-${incaricoId}`;
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });

        // Applica l'highlight
        element.style.transition = "background-color 0.5s";
        element.style.backgroundColor = "#ffeb3b";

        // Rimuovi l'highlight dopo 3 secondi
        setTimeout(() => {
          element.style.backgroundColor = "";
        }, 3000);
      }
    }, 100);
  };

  // Funzione per scrollare e evidenziare un cesto
  const scrollToCesto = (cestoId: string) => {
    // Espandi la sezione cesti se è chiusa
    if (!cestiExpanded) {
      setCestiExpanded(true);
    }

    // Aspetta che il DOM si aggiorni dopo l'espansione
    setTimeout(
      () => {
        const element = document.getElementById(`cesto-${cestoId}`);
        if (element) {
          // Scroll all'elemento
          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Aggiungi effetto flash direttamente al Box
          element.style.backgroundColor = "#fff176";

          // Rimuovi l'effetto dopo 1 secondo
          setTimeout(() => {
            element.style.backgroundColor = "";
          }, 3000);
        }
      },
      cestiExpanded ? 100 : 300
    ); // Aumentiamo il timeout se i cesti erano chiusi
  };

  // Funzione per trovare il cesto che contiene un incarico
  const trovaCestoPerIncarico = (incaricoId: string): Cesto | undefined => {
    return cesti.find((cesto) =>
      cesto.incarichi.some((inc) => inc.incarico_id === incaricoId)
    );
  };

  // Funzione per ottenere la quantità dell'incarico in base al derby selezionato
  const getQuantitaIncarico = (incarico: {
    id: string;
    quantita: number;
    quantita_derby?: Record<string, number>;
  }): number => {
    if (!derbySelezionato || !incarico.quantita_derby) {
      return incarico.quantita;
    }

    // Se c'è una quantità specifica per questo derby, usala
    const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incarico.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per ottenere la quantità dell'incarico città in base al derby selezionato
  const getQuantitaIncaricoCitta = (incarico: IncaricoCitta): number => {
    if (!derbySelezionato || !incarico.quantita_derby) {
      return incarico.quantita;
    }

    // Se c'è una quantità specifica per questo derby, usala
    const quantitaDerby = incarico.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incarico.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per ottenere la quantità dell'incarico nel cesto in base al derby selezionato
  const getQuantitaIncaricoCesto = (
    cestoId: string,
    incaricoId: string
  ): number => {
    const cesto = cesti.find((c) => c.id === cestoId);
    if (!cesto) return 0;

    const incaricoInCesto = cesto.incarichi.find(
      (i) => i.incarico_id === incaricoId
    );
    if (!incaricoInCesto) return 0;

    if (!derbySelezionato || !incaricoInCesto.quantita_derby) {
      return incaricoInCesto.quantita;
    }

    // Se c'è una quantità specifica per questo derby nel cesto, usala
    const quantitaDerby = incaricoInCesto.quantita_derby[derbySelezionato.id];
    if (typeof quantitaDerby === "undefined" || quantitaDerby === null) {
      return incaricoInCesto.quantita;
    }

    return quantitaDerby;
  };

  // Funzione per gestire il cambio del derby selezionato
  const handleChangeDerby = (event: SelectChangeEvent) => {
    const derbyId = event.target.value;
    const selectedDerby = derby.find((d) => d.id === derbyId);
    setDerbySelezionato(selectedDerby || null);
  };

  // Funzione per ottenere i conteggi di un incarico città
  const getConteggiCitta = (incarico: IncaricoCitta) => {
    const assegnazioniIncarico = assegnazioni.filter(
      (a) => a.tipo === "incarico" && a.riferimento_id === incarico.id
    );

    const conteggi = {
      attive: 0,
      inattive: 0,
      completateAttive: 0,
      completateInattive: 0,
      completateSenzaAssegnazioneAttive: 0,
      completateSenzaAssegnazioneInattive: 0,
    };

    // Conta le assegnazioni
    assegnazioniIncarico.forEach((assegnazione) => {
      const farm = farms.find((f) => f.farmId === assegnazione.farm_id);
      if (farm) {
        const progresso = getProgressoIncarico(incarico.id, farm.id);
        const completamenti = getCompletamentiIncarico(
          progresso,
          getQuantitaIncaricoCitta(incarico)
        );

        if (farm.isAttiva) {
          conteggi.attive++;
          if (completamenti > 0) {
            conteggi.completateAttive += completamenti;
          }
        } else {
          conteggi.inattive++;
          if (completamenti > 0) {
            conteggi.completateInattive += completamenti;
          }
        }
      }
    });

    // Conta i completamenti per farm non assegnate
    farms.forEach((farm) => {
      const haAssegnazione = assegnazioniIncarico.some(
        (a) => a.farm_id === farm.id
      );
      if (!haAssegnazione) {
        const progresso = getProgressoIncarico(incarico.id, farm.id);
        const completamenti = getCompletamentiIncarico(
          progresso,
          getQuantitaIncaricoCitta(incarico)
        );

        if (completamenti > 0) {
          if (farm.isAttiva) {
            conteggi.completateSenzaAssegnazioneAttive += completamenti;
          } else {
            conteggi.completateSenzaAssegnazioneInattive += completamenti;
          }
        }
      }
    });

    return conteggi;
  };

  const getIncaricoById = (id: string) => {
    // Prima cerca tra gli incarichi standard
    const incarico = incarichi.find((i) => i.id === id);
    if (incarico) return incarico;

    // Se non è un incarico standard, cerca tra gli incarichi città
    const incaricoInCitta = incarichiCitta.find((i) => i.id === id);
    if (incaricoInCitta) {
      return {
        id: incaricoInCitta.id,
        nome: incaricoInCitta.nome,
        quantita: incaricoInCitta.quantita,
        livello_minimo: incaricoInCitta.livello_minimo,
        immagine: incaricoInCitta.immagine,
        edificio_id: null,
        is_obbligatorio: false,
        quantita_derby: incaricoInCitta.quantita_derby,
        tipo: incaricoInCitta.tipo, // Aggiungo il campo tipo
      };
    }

    return undefined;
  };

  // Funzione per caricare i derby
  const caricaDerby = async () => {
    try {
      const derbyRef = collection(db, "derby");
      const derbySnapshot = await getDocs(derbyRef);
      const derbyData = derbySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Derby[];
      setDerby(derbyData);
    } catch (error) {
      console.error("Errore nel caricamento dei derby:", error);
    }
  };

  // Effetto per caricare i derby all'avvio
  useEffect(() => {
    caricaDerby();
  }, []);

  // Effetto per ricaricare le assegnazioni quando cambia il filtro derby
  useEffect(() => {
    caricaAssegnazioni();
  }, [filtroDerby]);

  // Calcola il livello del cesto
  const calcolaLivelloCesto = (incarichiIds: { incarico_id: string }[]) => {
    if (!incarichiIds || incarichiIds.length === 0) return 1;

    const livelli = incarichiIds.map((inc) => {
      // Prima cerca tra gli incarichi standard
      const incaricoStandard = incarichi.find((i) => i.id === inc.incarico_id);
      if (incaricoStandard) {
        return incaricoStandard.livello_minimo;
      }

      // Se non è un incarico standard, cerca tra gli incarichi città
      const incaricoInCitta = incarichiCitta.find(
        (i) => i.id === inc.incarico_id
      );
      if (incaricoInCitta) {
        return incaricoInCitta.livello_minimo;
      }

      return 1;
    });

    return Math.max(...livelli);
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Typography>Caricamento...</Typography>
        </Box>
      </Layout>
    );
  }

  // Modifica la funzione che gestisce il cambio di visualizzazione
  const handleToggleVisualizzazione = () => {
    if (!inTransizione) {
      setVisualizzazioneGlobale(!visualizzazioneGlobale);
    }
  };

  return (
    <Layout>
      {/* Barra di ricerca con filtri derby */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          gap: 1,
          alignItems: "flex-start",
        }}
      >
        {/* Pulsante Filtri Derby */}
        <Box>
          <Tooltip title="Filtri Derby">
            <IconButton
              onClick={() => setFiltriDerbyExpanded(!filtriDerbyExpanded)}
              color={filtriDerbyExpanded ? "primary" : "default"}
              size="small"
              sx={{
                border: 1,
                borderColor: filtriDerbyExpanded ? "primary.main" : "divider",
                bgcolor: filtriDerbyExpanded
                  ? "primary.lighter"
                  : "background.paper",
              }}
            >
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Collapse in={filtriDerbyExpanded}>
            <Paper
              sx={{
                mt: 1,
                p: 2,
                position: "absolute",
                zIndex: 1000,
                width: "max-content",
                maxWidth: "90vw",
                boxShadow: 3,
              }}
            >
              <Grid container spacing={2} sx={{ minWidth: { sm: 600 } }}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Visualizza Assegnazioni</InputLabel>
                    <Select
                      value={filtroDerby || ""}
                      label="Visualizza Assegnazioni"
                      onChange={(e) => setFiltroDerby(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Tutti i Derby</em>
                      </MenuItem>
                      {derby.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Mostra gli incarichi fatti ai giocatori per il tipo di derby
                    che selezionerai
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filtra Incarichi</InputLabel>
                    <Select
                      value={filtroDerbyIncarichi || ""}
                      label="Filtra Incarichi"
                      onChange={(e) => setFiltroDerbyIncarichi(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Tutti gli Incarichi</em>
                      </MenuItem>
                      {derby.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Questo filtro mostrerà solo gli incarichi di appartenenza
                    per il derby che selezionerai
                  </Box>
                </Grid>

                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Quantità Derby</InputLabel>
                    <Select
                      value={derbySelezionato?.id || ""}
                      label="Quantità Derby"
                      onChange={handleChangeDerby}
                    >
                      <MenuItem value="">
                        <em>Quantità Standard</em>
                      </MenuItem>
                      {derby.map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.nome}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Aggiorna le quantità degli incarichi in base al derby
                    selezionato
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Collapse>
        </Box>

        {/* Barra di ricerca */}
        <TextField
          fullWidth
          placeholder="Cerca incarichi..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                  edge="end"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: {
              bgcolor: "background.paper",
              "&:hover": {
                bgcolor: "background.paper",
              },
            },
          }}
        />
      </Box>

      <Box
        sx={{
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          px: { xs: 1, sm: 2, md: 3 },
          display: "flex",
          flexDirection: "column",
          gap: 0, // Cambiato da { xs: 1, sm: 2 } a 0 per rimuovere lo spazio tra le sezioni
        }}
      >
        {/* Sezione Cesti */}
        <Box
          sx={{
            width: "100%",
            mb: 0,
            minWidth: 0,
            display: "block",
          }}
        >
          {/* Header dei cesti con stile uniforme agli edifici */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0,
            }}
          >
            <Box
              onClick={() => setCestiExpanded(!cestiExpanded)}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 0.5, // Aumentato da 0.25 a 0.5
                cursor: "pointer",
                bgcolor: cestiExpanded ? "action.selected" : "action.hover",
                "&:hover": {
                  bgcolor: "action.selected",
                },
                flexGrow: 1,
                borderRadius: 1,
                height: 36, // Aumentato da 32 a 36
              }}
            >
              <Avatar
                src="/images/cesto.png"
                alt="Cesti"
                variant="rounded"
                sx={{
                  width: 28, // Aumentato da 24 a 28
                  height: 28, // Aumentato da 24 a 28
                  bgcolor: "transparent",
                  mr: 0.75, // Aumentato da 0.5 a 0.75
                  "& img": {
                    objectFit: "contain",
                  },
                }}
              />
              <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {" "}
                  {/* Cambiato da subtitle2 a caption */}
                  Cesti
                </Typography>
                <Typography
                  variant="caption" // Cambiato da body2 a caption
                  color="text.secondary"
                  sx={{ ml: "auto" }}
                >
                  {cestiFiltrati.length}{" "}
                  {cestiFiltrati.length === 1 ? "cesto" : "cesti"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                sx={{
                  transform: cestiExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                  width: 20, // Ridotto
                  height: 20, // Ridotto
                  p: 0, // Rimuove il padding
                }}
              >
                <ExpandMoreIcon sx={{ fontSize: 16 }} />{" "}
                {/* Ridotto ulteriormente */}
              </IconButton>
            </Box>
          </Box>

          {/* Lista dei cesti */}
          <Paper
            elevation={0}
            sx={{
              mb: 0, // Cambiato da 1 a 0 per rimuovere lo spazio tra le sezioni
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Collapse in={cestiExpanded}>
              {cestiFiltrati.map((cesto) => {
                const conteggi = getConteggiCesto(cesto);
                const giocatoriAssegnati = getGiocatoriAssegnatiCesto(cesto.id);
                const incarichiByCesto = incarichi.filter((inc) =>
                  cesto.incarichi.some((ci) => ci.incarico_id === inc.id)
                );

                return (
                  <Box
                    key={cesto.id}
                    id={`cesto-${cesto.id}`}
                    sx={{
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      "&:last-child": {
                        borderBottom: 0,
                      },
                      transition: "background-color 0.5s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {/* Contatori cliccabili */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0,
                          mr: 0,
                        }}
                      >
                        <Tooltip title="Farm attive/completate">
                          <Chip
                            label={`${conteggi.attive}/${conteggi.completateAttive}`}
                            size="small"
                            sx={{
                              height: 16,
                              minWidth: "auto",
                              bgcolor:
                                conteggi.attive === 0
                                  ? "rgb(0, 0, 0, 0.03)"
                                  : "rgb(33, 150, 243, 0.1)",
                              color:
                                conteggi.attive === 0
                                  ? "rgb(0, 0, 0, 0.6)"
                                  : "rgb(33, 150, 243)",
                              "& .MuiChip-label": {
                                px: 1,
                                fontSize: "0.65rem", // Font size fisso
                                lineHeight: 1, // Aggiungo line-height fisso
                                fontWeight: 400, // Aggiungo font-weight fisso
                              },
                            }}
                            onClick={() => {
                              if (conteggi.attive > 0) {
                                handleToggleGiocatori(cesto.id, "attivi");
                              } else if (conteggi.completateAttive > 0) {
                                handleToggleGiocatori(
                                  cesto.id,
                                  "completati_attivi"
                                );
                              }
                            }}
                          />
                        </Tooltip>
                        <Tooltip title="Farm inattive/completate">
                          <Chip
                            label={`${conteggi.inattive}/${conteggi.completateInattive}`}
                            size="small"
                            sx={{
                              height: 16, // Riduco l'altezza da 20 a 16
                              minWidth: "auto",
                              bgcolor: "rgb(0, 0, 0, 0.03)",
                              color: "rgb(0, 0, 0, 0.6)",
                              "& .MuiChip-label": {
                                px: 1,
                                fontSize: "0.65rem", // Font size fisso
                                lineHeight: 1, // Aggiungo line-height fisso
                                fontWeight: 400, // Aggiungo font-weight fisso
                              },
                            }}
                            onClick={() => {
                              if (conteggi.inattive > 0) {
                                handleToggleGiocatori(cesto.id, "inattivi");
                              } else if (conteggi.completateInattive > 0) {
                                handleToggleGiocatori(
                                  cesto.id,
                                  "completati_inattivi"
                                );
                              }
                            }}
                          />
                        </Tooltip>
                      </Box>

                      {/* Area cliccabile per assegnare il cesto */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexGrow: 1,
                          p: 1,
                          position: "relative",
                        }}
                      >
                        {/* Strisciolina del livello */}
                        <Box
                          sx={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: "24px",
                            bgcolor: "rgb(33, 150, 243, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.55rem",
                              fontStyle: "italic",
                              color: "rgb(33, 150, 243)",
                              width: "3ch",
                              textAlign: "center",
                            }}
                          >
                            {calcolaLivelloCesto(cesto.incarichi)}
                          </Typography>
                        </Box>

                        {/* Contenuto principale */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                            pl: 3,
                          }}
                        >
                          {/* Immagini incarichi */}
                          <Box sx={{ display: "flex", gap: 0.5, mr: 1.5 }}>
                            {cesto.incarichi.map((incaricoInCesto) => {
                              // Cerca prima tra gli incarichi standard
                              let incarico = incarichi.find(
                                (i) => i.id === incaricoInCesto.incarico_id
                              );
                              // Se non lo trova, cerca tra gli incarichi città
                              if (!incarico) {
                                const incaricoInCitta = incarichiCitta.find(
                                  (i) => i.id === incaricoInCesto.incarico_id
                                );
                                if (incaricoInCitta) {
                                  incarico = {
                                    id: incaricoInCitta.id,
                                    nome: incaricoInCitta.nome,
                                    quantita: incaricoInCitta.quantita,
                                    livello_minimo:
                                      incaricoInCitta.livello_minimo,
                                    immagine: incaricoInCitta.immagine,
                                    edificio_id: null,
                                    is_obbligatorio: false,
                                    quantita_derby:
                                      incaricoInCitta.quantita_derby,
                                  };
                                }
                              }
                              if (!incarico) return null;

                              return (
                                <Box
                                  key={incarico.id}
                                  sx={{ position: "relative" }}
                                >
                                  <Avatar
                                    src={incarico.immagine}
                                    variant="rounded"
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      cursor: "pointer",
                                      "&:hover": {
                                        opacity: 0.8,
                                      },
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToIncarico(incarico.id);
                                    }}
                                  >
                                    {incarico.nome[0]}
                                  </Avatar>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      position: "absolute",
                                      bottom: -5,
                                      right: -8,
                                      bgcolor: "background.paper",
                                      border: 1,
                                      borderColor: "divider",
                                      borderRadius: 1,
                                      px: 0.5,
                                      fontSize: "0.55rem",
                                    }}
                                  >
                                    x
                                    {getQuantitaIncaricoCesto(
                                      cesto.id,
                                      incarico.id
                                    )}
                                  </Typography>
                                </Box>
                              );
                            })}
                          </Box>

                          {/* Nome cesto */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              flexGrow: 1,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                wordBreak: "break-word",
                                lineHeight: 1.1,
                                fontSize: "0.75rem",
                              }}
                            >
                              {cesto.nome}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={(event) => {
                                event.stopPropagation();
                                setAnchorEl({
                                  id: `cesto_${cesto.id}`,
                                  element: event.currentTarget,
                                });
                              }}
                              sx={{
                                ml: "auto",
                                width: 28,
                                height: 28,
                                color: "text.secondary",
                              }}
                            >
                              <MoreVertIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    </Box>

                    {/* Area espandibile per i giocatori assegnati */}
                    <Collapse
                      in={[
                        "attivi",
                        "inattivi",
                        "completati_attivi",
                        "completati_inattivi",
                      ].some((tipo) =>
                        expandedIncarichi.includes(`${cesto.id}_${tipo}`)
                      )}
                    >
                      <Box sx={{ pl: 5, pr: 2, py: 0.5 }}>
                        {/* Lista farm attive e inattive */}
                        {(giocatoriAssegnati.some((g) => g.isAttiva) ||
                          giocatoriAssegnati.some((g) => !g.isAttiva)) && (
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                            }}
                          >
                            {/* Sezione farm attive */}
                            {giocatoriAssegnati.some((g) => g.isAttiva) && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "rgb(33, 150, 243)",
                                    fontWeight: 500,
                                    display: "block",
                                    mb: 0.5,
                                  }}
                                >
                                  ATTIVE
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                  }}
                                >
                                  {giocatoriAssegnati
                                    .filter((g) => g.isAttiva)
                                    .sort((a, b) => {
                                      // Ordina solo per nome del giocatore se definito, altrimenti metti in fondo
                                      if (
                                        !a.nome_giocatore ||
                                        !b.nome_giocatore
                                      )
                                        return 0;
                                      return a.nome_giocatore.localeCompare(
                                        b.nome_giocatore
                                      );
                                    })
                                    .map((giocatore) => (
                                      <Box
                                        key={giocatore.farm_id}
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            ...(giocatore.completato
                                              ? { bgcolor: "rgb(33, 150, 243)" }
                                              : {
                                                  border:
                                                    "2px solid rgb(33, 150, 243)",
                                                }),
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        />
                                        <Typography
                                          sx={{ fontSize: "0.875rem" }}
                                        >
                                          {`${giocatore.nome_giocatore} - ${giocatore.nome_farm}`}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleRimuoviAssegnazione(
                                              giocatore.assegnazione_id,
                                              "cesto"
                                            );
                                          }}
                                          sx={{
                                            ml: "auto",
                                            width: 20,
                                            height: 20,
                                            color: "text.secondary",
                                          }}
                                        >
                                          <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}

                            {/* Sezione farm inattive */}
                            {giocatoriAssegnati.some((g) => !g.isAttiva) && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.secondary",
                                    fontWeight: 500,
                                    display: "block",
                                    mb: 0.5,
                                  }}
                                >
                                  INATTIVE
                                </Typography>
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 0.5,
                                  }}
                                >
                                  {giocatoriAssegnati
                                    .filter((g) => !g.isAttiva)
                                    .sort((a, b) => {
                                      // Ordina solo per nome del giocatore se definito, altrimenti metti in fondo
                                      if (
                                        !a.nome_giocatore ||
                                        !b.nome_giocatore
                                      )
                                        return 0;
                                      return a.nome_giocatore.localeCompare(
                                        b.nome_giocatore
                                      );
                                    })
                                    .map((giocatore) => (
                                      <Box
                                        key={giocatore.farm_id}
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 1,
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            ...(giocatore.completato
                                              ? {
                                                  bgcolor: "rgba(0, 0, 0, 0.2)",
                                                }
                                              : {
                                                  border:
                                                    "2px solid rgba(0, 0, 0, 0.2)",
                                                }),
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                          }}
                                        />
                                        <Typography
                                          sx={{
                                            fontSize: "0.875rem",
                                            color: "text.secondary",
                                          }}
                                        >
                                          {`${giocatore.nome_giocatore} - ${giocatore.nome_farm}`}
                                        </Typography>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleRimuoviAssegnazione(
                                              giocatore.assegnazione_id,
                                              "cesto"
                                            );
                                          }}
                                          sx={{
                                            ml: "auto",
                                            width: 20,
                                            height: 20,
                                            color: "text.secondary",
                                          }}
                                        >
                                          <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </Box>
                );
              })}
            </Collapse>
          </Paper>
        </Box>

        {/* Sezione Città */}
        <Box
          sx={{
            width: "100%",
            mb: 0,
            mt: 0, // Aggiungiamo margin-top: 0 esplicitamente
            minWidth: 0,
            display: "block",
          }}
        >
          {/* Header della città con stile uniforme agli altri */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 0,
            }}
          >
            <Box
              onClick={() => setCittaExpanded(!cittaExpanded)}
              sx={{
                display: "flex",
                alignItems: "center",
                p: 0.5, // Aumentato da 0.25 a 0.5
                cursor: "pointer",
                bgcolor: cittaExpanded ? "action.selected" : "action.hover",
                "&:hover": {
                  bgcolor: "action.selected",
                },
                flexGrow: 1,
                borderRadius: 1,
                height: 36, // Aumentato da 32 a 36
              }}
            >
              <Avatar
                src="/images/citta.png"
                alt="Città"
                variant="rounded"
                sx={{
                  width: 28, // Aumentato da 24 a 28
                  height: 28, // Aumentato da 24 a 28
                  bgcolor: "transparent",
                  mr: 0.75, // Aumentato da 0.5 a 0.75
                  "& img": {
                    objectFit: "contain",
                  },
                }}
              />
              <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center" }}>
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {" "}
                  {/* Cambiato da subtitle2 a caption */}
                  Città
                </Typography>
                <Typography
                  variant="caption" // Cambiato da body2 a caption
                  color="text.secondary"
                  sx={{ ml: "auto" }}
                >
                  {incarichiCittaFiltrati.length}{" "}
                  {incarichiCittaFiltrati.length === 1
                    ? "incarico"
                    : "incarichi"}
                </Typography>
              </Box>
              <IconButton
                size="small"
                sx={{
                  transform: cittaExpanded ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                  width: 20, // Ridotto
                  height: 20, // Ridotto
                  p: 0, // Rimuove il padding
                }}
              >
                <ExpandMoreIcon sx={{ fontSize: 16 }} />{" "}
                {/* Ridotto ulteriormente */}
              </IconButton>
            </Box>
          </Box>

          {/* Lista degli incarichi città */}
          <Paper
            elevation={0}
            sx={{
              mb: 0, // Cambiato da 1 a 0 per rimuovere lo spazio
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Collapse in={cittaExpanded}>
              {incarichiCittaFiltrati
                .sort((a, b) => {
                  if (a.tipo === "edificio" && b.tipo === "visitatore")
                    return 1;
                  if (a.tipo === "visitatore" && b.tipo === "edificio")
                    return -1;
                  return a.nome.localeCompare(b.nome);
                })
                .map((incarico) => {
                  const conteggi = getConteggiCitta(incarico);
                  return (
                    <Box
                      key={incarico.id}
                      sx={{
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        "&:last-child": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 0.25, // Ridotto da 0.5 a 0.25
                        }}
                        role="row"
                      >
                        {/* Contatori */}
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5, // Ridotto da 0.5 a 0
                            mr: 1, // Ridotto da 2 a 1
                          }}
                        >
                          <Tooltip title="Farm attive/completate">
                            <Chip
                              label={`${conteggi.attive}/${conteggi.completateAttive}`}
                              size="small"
                              sx={{
                                height: 14, // Ridotto da 16 a 14
                                minWidth: "auto",
                                bgcolor:
                                  conteggi.attive === 0
                                    ? "rgb(0, 0, 0, 0.03)"
                                    : "rgb(33, 150, 243, 0.1)",
                                color:
                                  conteggi.attive === 0
                                    ? "rgb(0, 0, 0, 0.6)"
                                    : "rgb(33, 150, 243)",
                                "& .MuiChip-label": {
                                  px: 0.5,
                                  fontSize: "0.6rem", // Ridotto da 0.65rem a 0.6rem
                                  lineHeight: 1,
                                  fontWeight: 400,
                                },
                              }}
                              onClick={() => {
                                if (conteggi.attive > 0) {
                                  handleToggleGiocatori(incarico.id, "attivi");
                                } else if (conteggi.completateAttive > 0) {
                                  handleToggleGiocatori(
                                    incarico.id,
                                    "completati_attivi"
                                  );
                                }
                              }}
                            />
                          </Tooltip>
                          <Tooltip title="Farm inattive/completate">
                            <Chip
                              label={`${conteggi.inattive}/${conteggi.completateInattive}`}
                              size="small"
                              sx={{
                                height: 14, // Ridotto da 16 a 14
                                minWidth: "auto",
                                bgcolor: "rgb(0, 0, 0, 0.03)",
                                color: "rgb(0, 0, 0, 0.6)",
                                "& .MuiChip-label": {
                                  px: 0.5,
                                  fontSize: "0.6rem", // Ridotto da 0.65rem a 0.6rem
                                  lineHeight: 1,
                                  fontWeight: 400,
                                },
                              }}
                              onClick={() => {
                                if (conteggi.inattive > 0) {
                                  handleToggleGiocatori(
                                    incarico.id,
                                    "inattivi"
                                  );
                                } else if (conteggi.completateInattive > 0) {
                                  handleToggleGiocatori(
                                    incarico.id,
                                    "completati_inattivi"
                                  );
                                }
                              }}
                            />
                          </Tooltip>
                        </Box>

                        {/* Strisciolina del livello */}
                        <Box
                          sx={{
                            width: "18px", // Ridotto da 24px a 18px
                            bgcolor: "rgb(33, 150, 243, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            alignSelf: "stretch",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.6rem", // Mantenuto a 0.6rem
                              fontStyle: "italic",
                              color: "rgb(33, 150, 243)",
                              width: "100%", // Cambiato da 2ch a 100% per adattarsi meglio
                              textAlign: "center", // Mantenuto centrato
                              lineHeight: 1, // Aggiunto per migliorare l'allineamento verticale
                              padding: "0 1px", // Aggiunto padding orizzontale minimo
                            }}
                          >
                            {incarico.livello_minimo}
                          </Typography>
                        </Box>

                        {/* Icona e nome - area cliccabile */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            flexGrow: 1,
                            borderRadius: 1,
                            p: 0.25, // Ridotto da 1 a 0.25
                          }}
                          id={`citta_${incarico.id}`}
                        >
                          <Avatar
                            src={incarico.immagine}
                            variant="rounded"
                            sx={{
                              width: 24, // Ridotto da 32 a 24
                              height: 24, // Ridotto da 32 a 24
                              mr: 0.5, // Ridotto da 1 a 0.5
                            }}
                          >
                            {incarico.nome.charAt(0)}
                          </Avatar>
                          <Typography
                            variant="body2"
                            sx={{
                              border: 1,
                              borderColor: "divider",
                              borderRadius: 1,
                              px: 0.25, // Ridotto da 0.5 a 0.25
                              py: 0, // Ridotto da 0.25 a 0
                              fontSize: "0.65rem", // Ridotto da 0.75rem a 0.65rem
                              minWidth: "24px", // Ridotto da 32px a 24px
                              textAlign: "center",
                              mr: 1, // Ridotto da 2 a 1
                            }}
                          >
                            x{getQuantitaIncaricoCitta(incarico)}
                          </Typography>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.75rem", lineHeight: 1.1 }}
                            >
                              {getTranslatedName(incarico.nome)}
                            </Typography>
                            <Box sx={{ display: "flex", gap: 0.25, mt: 0.25 }}>
                              {(() => {
                                const cestoContenitore = trovaCestoPerIncarico(
                                  incarico.id
                                );
                                if (!cestoContenitore) return null;

                                return (
                                  <Chip
                                    label={cestoContenitore.nome}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      scrollToCesto(cestoContenitore.id);
                                    }}
                                    sx={{
                                      height: 16,
                                      width: "fit-content",
                                      display: "inline-flex",
                                      bgcolor: "#d4a76a",
                                      color: "white",
                                      cursor: "pointer",
                                      "& .MuiChip-label": {
                                        px: 0.5,
                                        fontSize: "0.65rem",
                                        display: "block",
                                        whiteSpace: "nowrap",
                                        lineHeight: 1,
                                      },
                                      "&:hover": {
                                        bgcolor: "#c39355",
                                      },
                                    }}
                                  />
                                );
                              })()}
                            </Box>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAnchorEl({
                                id: `citta_${incarico.id}`,
                                element: event.currentTarget,
                              });
                            }}
                            sx={{
                              ml: "auto",
                              width: 20, // Ridotto da 28 a 20
                              height: 20, // Ridotto da 28 a 20
                              color: "text.secondary",
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />{" "}
                            {/* Ridotto da 20 a 16 */}
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Area espandibile per i giocatori assegnati */}
                      <Collapse
                        in={[
                          "attivi",
                          "inattivi",
                          "completati_attivi",
                          "completati_inattivi",
                        ].some((tipo) =>
                          expandedIncarichi.includes(`${incarico.id}_${tipo}`)
                        )}
                      >
                        <Box
                          sx={{
                            pl: 5,
                            pr: 2,
                            py: 1,
                            position: "relative", // Aggiunto per creare un nuovo contesto di posizionamento
                            zIndex: 1, // Assicura che sia sotto il pulsante del menu
                            marginRight: "20px", // Aggiunto per lasciare spazio al pulsante del menu
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {/* Sezione Assegnati */}
                            <Box>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "text.primary",
                                  fontWeight: 700,
                                  display: "block",
                                  mb: 1,
                                }}
                              >
                                ASSEGNATI
                              </Typography>

                              {/* Farm attive assegnate */}
                              {assegnazioni
                                .filter(
                                  (a) =>
                                    a.tipo === "incarico" &&
                                    a.riferimento_id === incarico.id
                                )
                                .map((ass) => {
                                  const farm = farms.find(
                                    (f) => f.farmId === ass.farm_id
                                  );
                                  if (!farm || !farm.isAttiva) return null;

                                  const progresso = getProgressoIncarico(
                                    incarico.id,
                                    farm.id
                                  );
                                  const completamenti =
                                    getCompletamentiIncarico(
                                      progresso,
                                      incarico.quantita
                                    );
                                  const isCompletato = completamenti > 0;

                                  return (
                                    <Box
                                      key={farm.id}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: "50%",
                                          ...(isCompletato
                                            ? { bgcolor: "rgb(33, 150, 243)" }
                                            : {
                                                border:
                                                  "2px solid rgb(33, 150, 243)",
                                              }),
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      />
                                      <Typography sx={{ fontSize: "0.875rem" }}>
                                        {`${farm.giocatore_nome} - ${farm.nome}`}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleRimuoviAssegnazione(
                                            ass.id,
                                            "incarico"
                                          );
                                        }}
                                        sx={{
                                          ml: "auto",
                                          width: 20,
                                          height: 20,
                                          color: "text.secondary",
                                        }}
                                      >
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Box>
                                  );
                                })}

                              {/* Farm inattive assegnate */}
                              {assegnazioni
                                .filter(
                                  (a) =>
                                    a.tipo === "incarico" &&
                                    a.riferimento_id === incarico.id
                                )
                                .map((ass) => {
                                  const farm = farms.find(
                                    (f) => f.farmId === ass.farm_id
                                  );
                                  if (!farm || farm.isAttiva) return null;

                                  const progresso = getProgressoIncarico(
                                    incarico.id,
                                    farm.id
                                  );
                                  const completamenti =
                                    getCompletamentiIncarico(
                                      progresso,
                                      incarico.quantita
                                    );
                                  const isCompletato = completamenti > 0;

                                  return (
                                    <Box
                                      key={farm.id}
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: 20,
                                          height: 20,
                                          borderRadius: "50%",
                                          ...(isCompletato
                                            ? { bgcolor: "rgba(0, 0, 0, 0.2)" }
                                            : {
                                                border:
                                                  "2px solid rgba(0, 0, 0, 0.2)",
                                              }),
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                        }}
                                      />
                                      <Typography
                                        sx={{
                                          fontSize: "0.875rem",
                                          color: "text.secondary",
                                        }}
                                      >
                                        {`${farm.giocatore_nome} - ${farm.nome}`}
                                      </Typography>
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          handleRimuoviAssegnazione(
                                            ass.id,
                                            "incarico"
                                          );
                                        }}
                                        sx={{
                                          ml: "auto",
                                          width: 20,
                                          height: 20,
                                          color: "text.secondary",
                                        }}
                                      >
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Box>
                                  );
                                })}
                            </Box>

                            {/* Sezione Completati non assegnati */}
                            {(conteggi.completateSenzaAssegnazioneAttive > 0 ||
                              conteggi.completateSenzaAssegnazioneInattive >
                                0) && (
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "text.primary",
                                    fontWeight: 700,
                                    display: "block",
                                    mb: 1,
                                  }}
                                >
                                  COMPLETATI (NON ASSEGNATI)
                                </Typography>

                                {/* Farm attive con completamenti */}
                                {conteggi.completateSenzaAssegnazioneAttive >
                                  0 && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "rgb(33, 150, 243)",
                                        fontWeight: 500,
                                        display: "block",
                                        mb: 0.5,
                                      }}
                                    >
                                      ATTIVI
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 0.5,
                                      }}
                                    >
                                      {farms
                                        .filter((farm) => {
                                          if (!farm.isAttiva) return false;
                                          const progresso =
                                            getProgressoIncarico(
                                              incarico.id,
                                              farm.id
                                            );
                                          const completamenti =
                                            getCompletamentiIncarico(
                                              progresso,
                                              incarico.quantita
                                            );
                                          const haAssegnazione =
                                            assegnazioni.some(
                                              (a) =>
                                                a.tipo === "incarico" &&
                                                a.riferimento_id ===
                                                  incarico.id &&
                                                a.farm_id === farm.id
                                            );
                                          return (
                                            completamenti > 0 && !haAssegnazione
                                          );
                                        })
                                        .sort((a, b) => {
                                          const nomeA = a.giocatore_nome || "";
                                          const nomeB = b.giocatore_nome || "";
                                          return nomeA.localeCompare(nomeB);
                                        })
                                        .map((farm) => (
                                          <Box
                                            key={farm.id}
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                bgcolor: "#ffc107",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                              }}
                                            />
                                            <Typography
                                              sx={{ fontSize: "0.875rem" }}
                                            >
                                              {`${farm.giocatore_nome} - ${farm.nome}`}
                                            </Typography>
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                handleAssegnaIncarico(
                                                  incarico.id,
                                                  farm.id
                                                );
                                              }}
                                              sx={{
                                                ml: "auto",
                                                width: 20,
                                                height: 20,
                                                color: "primary.main",
                                              }}
                                            >
                                              <AddIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Box>
                                        ))}
                                    </Box>
                                  </Box>
                                )}

                                {/* Farm inattive con completamenti */}
                                {conteggi.completateSenzaAssegnazioneInattive >
                                  0 && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "text.secondary",
                                        fontWeight: 500,
                                        display: "block",
                                        mb: 0.5,
                                      }}
                                    >
                                      INATTIVI
                                    </Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 0.5,
                                      }}
                                    >
                                      {farms
                                        .filter((farm) => {
                                          if (farm.isAttiva) return false;
                                          const progresso =
                                            getProgressoIncarico(
                                              incarico.id,
                                              farm.id
                                            );
                                          const completamenti =
                                            getCompletamentiIncarico(
                                              progresso,
                                              incarico.quantita
                                            );
                                          const haAssegnazione =
                                            assegnazioni.some(
                                              (a) =>
                                                a.tipo === "incarico" &&
                                                a.riferimento_id ===
                                                  incarico.id &&
                                                a.farm_id === farm.id
                                            );
                                          return (
                                            completamenti > 0 && !haAssegnazione
                                          );
                                        })
                                        .sort((a, b) => {
                                          const nomeA = a.giocatore_nome || "";
                                          const nomeB = b.giocatore_nome || "";
                                          return nomeA.localeCompare(nomeB);
                                        })
                                        .map((farm) => (
                                          <Box
                                            key={farm.id}
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: "50%",
                                                bgcolor: "#8d6e63",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                              }}
                                            />
                                            <Typography
                                              sx={{
                                                fontSize: "0.875rem",
                                                color: "text.secondary",
                                              }}
                                            >
                                              {`${farm.giocatore_nome} - ${farm.nome}`}
                                            </Typography>
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                handleAssegnaIncarico(
                                                  incarico.id,
                                                  farm.id
                                                );
                                              }}
                                              sx={{
                                                ml: "auto",
                                                width: 20,
                                                height: 20,
                                                color: "primary.main",
                                              }}
                                            >
                                              <AddIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Box>
                                        ))}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
            </Collapse>
          </Paper>
        </Box>

        {/* Barra di visualizzazione */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 2,
            py: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "rgba(0, 0, 0, 0.02)",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Vista:
          </Typography>
          <Tooltip
            title={
              visualizzazioneGlobale
                ? "Visualizza per edificio"
                : "Visualizza tutti gli incarichi"
            }
          >
            <IconButton
              onClick={handleToggleVisualizzazione}
              color={visualizzazioneGlobale ? "primary" : "default"}
              size="small"
              disabled={inTransizione}
            >
              <ViewListIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

          <Tooltip
            title={
              ordinamentoContatori
                ? ordinamentoContatoriInverso
                  ? "Ordina per meno assegnazioni"
                  : "Ordina per più assegnazioni"
                : "Ordina per assegnazioni"
            }
          >
            <IconButton
              onClick={() => {
                if (!ordinamentoContatori) {
                  setOrdinamentoContatori(true);
                  setOrdinamentoContatoriInverso(false);
                  setOrdinamentoAlfabetico(false);
                  setOrdinamentoLivelloInverso(false);
                } else {
                  setOrdinamentoContatoriInverso(!ordinamentoContatoriInverso);
                }
              }}
              color={ordinamentoContatori ? "primary" : "default"}
              size="small"
            >
              <PeopleAltIcon
                sx={{
                  transform: ordinamentoContatoriInverso
                    ? "rotate(180deg)"
                    : "none",
                  transition: "transform 0.2s",
                }}
              />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              ordinamentoLivelloInverso
                ? "Ordina per livello crescente"
                : "Ordina per livello decrescente"
            }
          >
            <IconButton
              onClick={() => {
                setOrdinamentoLivelloInverso(!ordinamentoLivelloInverso);
                if (!ordinamentoLivelloInverso) {
                  setOrdinamentoAlfabetico(false);
                  setOrdinamentoContatori(false);
                }
              }}
              color={ordinamentoLivelloInverso ? "primary" : "default"}
              size="small"
            >
              <SortIcon
                sx={{
                  transform: ordinamentoLivelloInverso
                    ? "rotate(180deg)"
                    : "none",
                  transition: "transform 0.2s",
                }}
              />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              ordinamentoAlfabetico
                ? ordinamentoAlfabeticoInverso
                  ? "Ordina dalla A alla Z"
                  : "Ordina dalla Z alla A"
                : "Ordina alfabeticamente"
            }
          >
            <IconButton
              onClick={() => {
                if (!ordinamentoAlfabetico) {
                  setOrdinamentoAlfabetico(true);
                  setOrdinamentoAlfabeticoInverso(false);
                  setOrdinamentoContatori(false);
                  setOrdinamentoLivelloInverso(false);
                } else {
                  setOrdinamentoAlfabeticoInverso(
                    !ordinamentoAlfabeticoInverso
                  );
                }
              }}
              color={ordinamentoAlfabetico ? "primary" : "default"}
              size="small"
            >
              <SortByAlphaIcon
                sx={{
                  transform: ordinamentoAlfabeticoInverso
                    ? "rotate(180deg)"
                    : "none",
                  transition: "transform 0.2s",
                }}
              />
            </IconButton>
          </Tooltip>

          {!visualizzazioneGlobale && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Tooltip
                title={
                  expandedEdifici.length === gruppiIncarichi.length
                    ? "Comprimi tutti gli edifici"
                    : "Espandi tutti gli edifici"
                }
              >
                <IconButton onClick={handleToggleAll} size="small">
                  {expandedEdifici.length === gruppiIncarichi.length ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Sezione Edifici e Incarichi */}
        <Box
          sx={{
            mt: 2,
            display: "block",
          }}
        >
          {/* Rimuovo l'header degli incarichi che conteneva il pulsante */}
          {!inTransizione &&
            gruppiIncarichi.map((gruppo) => {
              const edificio = edifici.find((e) => e.id === gruppo.edificio_id);
              const numIncarichi = gruppo.incarichi.length;

              return (
                <Paper
                  key={gruppo.edificio_id}
                  elevation={0}
                  sx={{
                    mb: 0, // Cambiato da 1 a 0 per rimuovere lo spazio tra gli edifici
                    border: 0, // Rimosso il bordo completo
                    borderBottom: 1, // Aggiunto solo il bordo inferiore
                    borderColor: "divider",
                    borderRadius: 0, // Rimossi gli angoli smussati
                    overflow: "hidden",
                  }}
                >
                  {/* Header edificio con immagine */}
                  <Box
                    onClick={() => handleEdificioToggle(gruppo.edificio_id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 0.5, // Ridotto da 1 a 0.5
                      cursor: "pointer",
                      bgcolor:
                        gruppo.edificio_id &&
                        expandedEdifici.includes(gruppo.edificio_id)
                          ? "action.selected"
                          : "rgba(0, 0, 0, 0.02)", // Cambiato da "background.paper" a "rgba(0, 0, 0, 0.02)"
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                      minHeight: 48, // Aggiunto per fissare l'altezza minima
                    }}
                  >
                    {/* Immagine edificio */}
                    <Avatar
                      src={
                        visualizzazioneGlobale
                          ? "/images/incarichiglobali.png"
                          : edificio?.immagine
                      }
                      variant="rounded"
                      sx={{
                        width: 36, // Ridotto da 48 a 36
                        height: 36, // Ridotto da 48 a 36
                        mr: 1.5, // Ridotto da 2 a 1.5
                        bgcolor: visualizzazioneGlobale
                          ? "transparent"
                          : undefined,
                      }}
                    >
                      {!visualizzazioneGlobale && (edificio?.nome?.[0] || "?")}
                    </Avatar>

                    {/* Informazioni edificio */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 0 }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 500,
                            fontSize: "0.95rem",
                            lineHeight: 1.2,
                          }}
                        >
                          {visualizzazioneGlobale
                            ? "Tutti gli incarichi"
                            : edificio?.nome || "Senza edificio"}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: "auto" }}
                        >
                          {numIncarichi}{" "}
                          {numIncarichi === 1 ? "incarico" : "incarichi"}
                        </Typography>
                      </Box>
                      {!visualizzazioneGlobale && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgb(33, 150, 243)",
                            fontStyle: "italic",
                            fontSize: "0.75rem",
                          }}
                        >
                          {edificio?.livello || 0}{" "}
                          {/* Rimosso il testo "Liv." */}
                        </Typography>
                      )}
                    </Box>

                    {/* Icona espansione */}
                    <IconButton
                      size="small"
                      sx={{
                        transform:
                          gruppo.edificio_id &&
                          expandedEdifici.includes(gruppo.edificio_id)
                            ? "rotate(180deg)"
                            : "none",
                        transition: "transform 0.2s",
                        width: 28,
                        height: 28,
                      }}
                    >
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  {/* Contenuto edificio */}
                  <Collapse
                    in={
                      gruppo.edificio_id
                        ? expandedEdifici.includes(gruppo.edificio_id)
                        : false
                    }
                  >
                    {gruppo.incarichi.map(
                      ({ incarico, conteggi, giocatori_assegnati }) => (
                        <Box
                          id={`incarico-${incarico.id}`}
                          key={incarico.id}
                          sx={{
                            position: "relative",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            "&:last-child": {
                              borderBottom: 0,
                            },
                            transition: "background-color 0.5s ease",
                            overflow: "visible", // Aggiunto per assicurare che il pulsante del menu rimanga visibile
                          }}
                        >
                          {/* Riga principale dell'incarico */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                              pr: 6, // Spazio per il menu
                              py: 0.25, // Ridotto da default a 0.25
                            }}
                          >
                            {/* Contatori cliccabili */}
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 0.25, // Ridotto da 0.5 a 0.25
                                p: 0.5, // Ridotto da 1 a 0.5
                              }}
                            >
                              <Tooltip title="Farm attive/completate">
                                <Chip
                                  label={`${conteggi.totaleAttive}/${conteggi.completateAttive}`}
                                  size="small"
                                  sx={{
                                    height: 14, // Ridotto da 16 a 14
                                    minWidth: "auto",
                                    bgcolor:
                                      conteggi.totaleAttive === 0
                                        ? "rgb(0, 0, 0, 0.03)"
                                        : "rgb(33, 150, 243, 0.1)",
                                    color:
                                      conteggi.totaleAttive === 0
                                        ? "rgb(0, 0, 0, 0.6)"
                                        : "rgb(33, 150, 243)",
                                    "& .MuiChip-label": {
                                      px: 0.75, // Ridotto da 1 a 0.75
                                      fontSize: "0.6rem", // Ridotto da 0.65rem a 0.6rem
                                      lineHeight: 1,
                                      fontWeight: 400,
                                    },
                                  }}
                                  onClick={() => {
                                    if (conteggi.totaleAttive > 0) {
                                      handleToggleGiocatori(
                                        incarico.id,
                                        "attivi"
                                      );
                                    } else if (conteggi.completateAttive > 0) {
                                      handleToggleGiocatori(
                                        incarico.id,
                                        "completati_attivi"
                                      );
                                    }
                                  }}
                                />
                              </Tooltip>

                              <Tooltip title="Farm inattive/completate">
                                <Chip
                                  label={`${conteggi.totaleInattive}/${conteggi.completateInattive}`}
                                  size="small"
                                  sx={{
                                    height: 14, // Ridotto da 16 a 14
                                    minWidth: "auto",
                                    bgcolor: "rgb(0, 0, 0, 0.03)",
                                    color: "rgb(0, 0, 0, 0.6)",
                                    "& .MuiChip-label": {
                                      px: 0.75, // Ridotto da 1 a 0.75
                                      fontSize: "0.6rem", // Ridotto da 0.65rem a 0.6rem
                                      lineHeight: 1,
                                    },
                                  }}
                                  onClick={() => {
                                    if (conteggi.totaleInattive > 0) {
                                      handleToggleGiocatori(
                                        incarico.id,
                                        "inattivi"
                                      );
                                    } else if (
                                      conteggi.completateInattive > 0
                                    ) {
                                      handleToggleGiocatori(
                                        incarico.id,
                                        "completati_inattivi"
                                      );
                                    }
                                  }}
                                />
                              </Tooltip>
                            </Box>

                            {/* Strisciolina del livello */}
                            <Box
                              sx={{
                                width: "18px", // Ridotto da 24px a 18px
                                bgcolor: "rgb(33, 150, 243, 0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                alignSelf: "stretch",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: "0.6rem", // Mantenuto a 0.6rem
                                  fontStyle: "italic",
                                  color: "rgb(33, 150, 243)",
                                  width: "100%", // Cambiato da 2ch a 100% per adattarsi meglio
                                  textAlign: "center", // Mantenuto centrato
                                  lineHeight: 1, // Aggiunto per migliorare l'allineamento verticale
                                  padding: "0 1px", // Aggiunto padding orizzontale minimo
                                }}
                              >
                                {incarico.livello_minimo}
                              </Typography>
                            </Box>

                            {/* Box per immagine e quantità */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                p: 0.5, // Ridotto da 1 a 0.5
                                width: { xs: "70px", sm: "80px" }, // Ridotto da 80px/100px a 70px/80px
                                flexShrink: 0,
                                mr: 0, // Rimosso il margine destro per avvicinare alla sezione successiva
                              }}
                            >
                              <Avatar
                                src={incarico.immagine}
                                variant="rounded"
                                sx={{ width: 24, height: 24, mr: 0.5 }} // Ridotto da 32x32 a 24x24 e margine da 1 a 0.5
                              >
                                {incarico.nome[0]}
                              </Avatar>
                              <Typography
                                variant="body2"
                                sx={{
                                  border: 1,
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  px: 0.25, // Ridotto da 0.5 a 0.25
                                  py: 0, // Ridotto da 0.25 a 0
                                  fontSize: "0.65rem", // Ridotto da 0.75rem a 0.65rem
                                  minWidth: "24px", // Ridotto da 32px a 24px
                                  textAlign: "center",
                                }}
                              >
                                x{getQuantitaIncarico(incarico)}
                              </Typography>
                            </Box>

                            {/* Box per il nome e i tag */}
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                py: 0.25, // Ridotto da 1 a 0.25
                                px: 0.25, // Ridotto da 0.5 a 0.25 per avvicinare al box precedente
                                flexGrow: 1,
                                minWidth: 0,
                                ml: 0, // Rimosso il margine sinistro per avvicinare alla sezione precedente
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  fontSize: "0.75rem", // Ridotto da 0.875rem a 0.75rem
                                  lineHeight: 1.1, // Ridotto da 1.2 a 1.1
                                  maxWidth: "100%",
                                  wordBreak: "break-word",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  fontWeight: "normal",
                                }}
                              >
                                {getTranslatedName(incarico.nome)}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "row",
                                  gap: 0.25, // Ridotto da 0.5 a 0.25
                                  mt: 0.25, // Ridotto da 0.5 a 0.25
                                  flexWrap: "wrap",
                                }}
                              >
                                {incarico.is_obbligatorio && (
                                  <Chip
                                    label="Obbligatorio"
                                    size="small"
                                    sx={{
                                      height: 14, // Ridotto da 16 a 14
                                      width: "fit-content",
                                      bgcolor: "#ff8c00",
                                      color: "white",
                                      "& .MuiChip-label": {
                                        px: 0.25, // Ridotto da 0.5 a 0.25
                                        fontSize: "0.6rem", // Ridotto da 0.625rem a 0.6rem
                                      },
                                    }}
                                  />
                                )}
                                {(() => {
                                  const cestoContenitore =
                                    trovaCestoPerIncarico(incarico.id);
                                  if (!cestoContenitore) return null;

                                  return (
                                    <Chip
                                      label={cestoContenitore.nome}
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        scrollToCesto(cestoContenitore.id);
                                      }}
                                      sx={{
                                        height: 14, // Ridotto da 16 a 14
                                        width: "fit-content",
                                        display: "inline-flex",
                                        bgcolor: "#d4a76a",
                                        color: "white",
                                        cursor: "pointer",
                                        "& .MuiChip-label": {
                                          px: 0.25, // Ridotto da 0.5 a 0.25
                                          fontSize: "0.6rem", // Ridotto da 0.65rem a 0.6rem
                                          display: "block",
                                          whiteSpace: "nowrap",
                                          lineHeight: 1,
                                        },
                                        "&:hover": {
                                          bgcolor: "#c39355",
                                        },
                                      }}
                                    />
                                  );
                                })()}
                              </Box>
                            </Box>
                          </Box>

                          {/* Pulsante menu */}
                          <IconButton
                            size="small"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAnchorEl({
                                id: incarico.id,
                                element: event.currentTarget,
                              });
                            }}
                            sx={{
                              position: "absolute",
                              right: 4, // Ridotto da 8 a 4
                              top: 12, // Posizione fissa dall'alto invece di 50%
                              transform: "none", // Rimuovo il transform
                              width: 20, // Ridotto da 28 a 20
                              height: 20, // Ridotto da 28 a 20
                              color: "text.secondary",
                              zIndex: 10, // Aumentato per assicurarsi che sia sopra tutto
                            }}
                          >
                            <MoreVertIcon sx={{ fontSize: 16 }} />
                          </IconButton>

                          {/* Area espandibile per i giocatori assegnati */}
                          <Collapse
                            in={[
                              "attivi",
                              "inattivi",
                              "completati_attivi",
                              "completati_inattivi",
                            ].some((tipo) =>
                              expandedIncarichi.includes(
                                `${incarico.id}_${tipo}`
                              )
                            )}
                          >
                            <Box
                              sx={{
                                pl: 5,
                                pr: 2,
                                py: 1,
                                position: "relative", // Aggiunto per creare un nuovo contesto di posizionamento
                                zIndex: 1, // Assicura che sia sotto il pulsante del menu
                                marginRight: "20px", // Aggiunto per lasciare spazio al pulsante del menu
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 2,
                                }}
                              >
                                {/* Sezione Assegnati */}
                                <Box>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: "text.primary",
                                      fontWeight: 700,
                                      display: "block",
                                      mb: 1,
                                    }}
                                  >
                                    ASSEGNATI
                                  </Typography>

                                  {/* Farm attive assegnate */}
                                  {assegnazioni
                                    .filter(
                                      (a) =>
                                        a.tipo === "incarico" &&
                                        a.riferimento_id === incarico.id
                                    )
                                    .map((ass) => {
                                      const farm = farms.find(
                                        (f) => f.farmId === ass.farm_id
                                      );
                                      if (!farm || !farm.isAttiva) return null;

                                      const progresso = getProgressoIncarico(
                                        incarico.id,
                                        farm.id
                                      );
                                      const completamenti =
                                        getCompletamentiIncarico(
                                          progresso,
                                          incarico.quantita
                                        );
                                      const isCompletato = completamenti > 0;

                                      return (
                                        <Box
                                          key={farm.id}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: 20,
                                              height: 20,
                                              borderRadius: "50%",
                                              ...(isCompletato
                                                ? {
                                                    bgcolor:
                                                      "rgb(33, 150, 243)",
                                                  }
                                                : {
                                                    border:
                                                      "2px solid rgb(33, 150, 243)",
                                                  }),
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          />
                                          <Typography
                                            sx={{ fontSize: "0.875rem" }}
                                          >
                                            {`${farm.giocatore_nome} - ${farm.nome}`}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleRimuoviAssegnazione(
                                                ass.id,
                                                "cesto"
                                              );
                                            }}
                                            sx={{
                                              ml: "auto",
                                              width: 20,
                                              height: 20,
                                              color: "text.secondary",
                                            }}
                                          >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Box>
                                      );
                                    })}

                                  {/* Farm inattive assegnate */}
                                  {assegnazioni
                                    .filter(
                                      (a) =>
                                        a.tipo === "incarico" &&
                                        a.riferimento_id === incarico.id
                                    )
                                    .map((ass) => {
                                      const farm = farms.find(
                                        (f) => f.farmId === ass.farm_id
                                      );
                                      if (!farm || farm.isAttiva) return null;

                                      const progresso = getProgressoIncarico(
                                        incarico.id,
                                        farm.id
                                      );
                                      const completamenti =
                                        getCompletamentiIncarico(
                                          progresso,
                                          incarico.quantita
                                        );
                                      const isCompletato = completamenti > 0;

                                      return (
                                        <Box
                                          key={farm.id}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: 20,
                                              height: 20,
                                              borderRadius: "50%",
                                              ...(isCompletato
                                                ? {
                                                    bgcolor:
                                                      "rgba(0, 0, 0, 0.2)",
                                                  }
                                                : {
                                                    border:
                                                      "2px solid rgba(0, 0, 0, 0.2)",
                                                  }),
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          />
                                          <Typography
                                            sx={{
                                              fontSize: "0.875rem",
                                              color: "text.secondary",
                                            }}
                                          >
                                            {`${farm.giocatore_nome} - ${farm.nome}`}
                                          </Typography>
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              e.preventDefault();
                                              handleRimuoviAssegnazione(
                                                ass.id,
                                                "cesto"
                                              );
                                            }}
                                            sx={{
                                              ml: "auto",
                                              width: 20,
                                              height: 20,
                                              color: "text.secondary",
                                            }}
                                          >
                                            <CloseIcon sx={{ fontSize: 16 }} />
                                          </IconButton>
                                        </Box>
                                      );
                                    })}
                                </Box>

                                {/* Sezione Completati non assegnati */}
                                {(conteggi.completateSenzaAssegnazioneAttive >
                                  0 ||
                                  conteggi.completateSenzaAssegnazioneInattive >
                                    0) && (
                                  <Box>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: "text.primary",
                                        fontWeight: 700,
                                        display: "block",
                                        mb: 1,
                                      }}
                                    >
                                      COMPLETATI (NON ASSEGNATI)
                                    </Typography>

                                    {/* Farm attive con completamenti */}
                                    {conteggi.completateSenzaAssegnazioneAttive >
                                      0 && (
                                      <Box sx={{ mb: 2 }}>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: "rgb(33, 150, 243)",
                                            fontWeight: 500,
                                            display: "block",
                                            mb: 0.5,
                                          }}
                                        >
                                          ATTIVI
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.5,
                                          }}
                                        >
                                          {farms
                                            .filter((farm) => {
                                              if (!farm.isAttiva) return false;
                                              const progresso =
                                                getProgressoIncarico(
                                                  incarico.id,
                                                  farm.id
                                                );
                                              const completamenti =
                                                getCompletamentiIncarico(
                                                  progresso,
                                                  incarico.quantita
                                                );
                                              const haAssegnazione =
                                                assegnazioni.some(
                                                  (a) =>
                                                    a.tipo === "incarico" &&
                                                    a.riferimento_id ===
                                                      incarico.id &&
                                                    a.farm_id === farm.id
                                                );
                                              return (
                                                completamenti > 0 &&
                                                !haAssegnazione
                                              );
                                            })
                                            .sort((a, b) => {
                                              const nomeA =
                                                a.giocatore_nome || "";
                                              const nomeB =
                                                b.giocatore_nome || "";
                                              return nomeA.localeCompare(nomeB);
                                            })
                                            .map((farm) => (
                                              <Box
                                                key={farm.id}
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 1,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                    bgcolor: "#ffc107",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                  }}
                                                />
                                                <Typography
                                                  sx={{ fontSize: "0.875rem" }}
                                                >
                                                  {`${farm.giocatore_nome} - ${farm.nome}`}
                                                </Typography>
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleAssegnaIncarico(
                                                      incarico.id,
                                                      farm.id
                                                    );
                                                  }}
                                                  sx={{
                                                    ml: "auto",
                                                    width: 20,
                                                    height: 20,
                                                    color: "primary.main",
                                                  }}
                                                >
                                                  <AddIcon
                                                    sx={{ fontSize: 16 }}
                                                  />
                                                </IconButton>
                                              </Box>
                                            ))}
                                        </Box>
                                      </Box>
                                    )}

                                    {/* Farm inattive con completamenti */}
                                    {conteggi.completateSenzaAssegnazioneInattive >
                                      0 && (
                                      <Box>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            color: "text.secondary",
                                            fontWeight: 500,
                                            display: "block",
                                            mb: 0.5,
                                          }}
                                        >
                                          INATTIVI
                                        </Typography>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.5,
                                          }}
                                        >
                                          {farms
                                            .filter((farm) => {
                                              if (farm.isAttiva) return false;
                                              const progresso =
                                                getProgressoIncarico(
                                                  incarico.id,
                                                  farm.id
                                                );
                                              const completamenti =
                                                getCompletamentiIncarico(
                                                  progresso,
                                                  incarico.quantita
                                                );
                                              const haAssegnazione =
                                                assegnazioni.some(
                                                  (a) =>
                                                    a.tipo === "incarico" &&
                                                    a.riferimento_id ===
                                                      incarico.id &&
                                                    a.farm_id === farm.id
                                                );
                                              return (
                                                completamenti > 0 &&
                                                !haAssegnazione
                                              );
                                            })
                                            .sort((a, b) => {
                                              const nomeA =
                                                a.giocatore_nome || "";
                                              const nomeB =
                                                b.giocatore_nome || "";
                                              return nomeA.localeCompare(nomeB);
                                            })
                                            .map((farm) => (
                                              <Box
                                                key={farm.id}
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 1,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                    bgcolor: "#8d6e63",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                  }}
                                                />
                                                <Typography
                                                  sx={{
                                                    fontSize: "0.875rem",
                                                    color: "text.secondary",
                                                  }}
                                                >
                                                  {`${farm.giocatore_nome} - ${farm.nome}`}
                                                </Typography>
                                                <IconButton
                                                  size="small"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleAssegnaIncarico(
                                                      incarico.id,
                                                      farm.id
                                                    );
                                                  }}
                                                  sx={{
                                                    ml: "auto",
                                                    width: 20,
                                                    height: 20,
                                                    color: "primary.main",
                                                  }}
                                                >
                                                  <AddIcon
                                                    sx={{ fontSize: 16 }}
                                                  />
                                                </IconButton>
                                              </Box>
                                            ))}
                                        </Box>
                                      </Box>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          </Collapse>
                        </Box>
                      )
                    )}
                  </Collapse>
                </Paper>
              );
            })}
        </Box>

        {/* Menu per assegnare gli incarichi e i cesti */}
        <Menu
          anchorEl={anchorEl?.element}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          disablePortal // Previene l'errore aria-hidden
          slotProps={{
            paper: {
              sx: {
                maxHeight: "70vh",
                width: 250,
              },
            },
          }}
        >
          {(() => {
            if (!anchorEl?.id) return null;

            const isCesto = anchorEl.id.startsWith("cesto_");
            const isCitta = anchorEl.id.startsWith("citta_");
            const id =
              isCesto || isCitta ? anchorEl.id.split("_")[1] : anchorEl.id;

            const item = isCesto
              ? cesti.find((c) => c.id === id)
              : isCitta
              ? incarichiCitta.find((i) => i.id === id)
              : incarichi.find((i) => i.id === id);

            if (!item) return null;

            // Calcolo del livello minimo in base al tipo
            let livelloMinimo = 0;
            if (isCesto) {
              const cestoItem = item as Cesto;
              const livelliIncarichi = cestoItem.incarichi
                .map((i) => incarichi.find((inc) => inc.id === i.incarico_id))
                .filter((i): i is Incarico => i !== undefined)
                .map((i) => i.livello_minimo);

              livelloMinimo = Math.max(...livelliIncarichi);
            } else if (isCitta) {
              livelloMinimo = (item as IncaricoCitta).livello_minimo;
            } else {
              livelloMinimo = (item as Incarico).livello_minimo;
            }

            // Funzione per ottenere le farm disponibili
            const getFarmDisponibili = () => {
              const farmAssegnate = assegnazioni
                .filter((a) => {
                  if (isCesto)
                    return a.tipo === "cesto" && a.riferimento_id === id;
                  if (isCitta)
                    return a.tipo === "incarico" && a.riferimento_id === id;
                  return a.tipo === "incarico" && a.riferimento_id === id;
                })
                .map((a) => a.farm_id);

              return farms.filter(
                (farm) =>
                  !farmAssegnate.includes(farm.farmId) &&
                  farm.livello >= livelloMinimo
              );
            };

            const farmDisponibili = getFarmDisponibili();
            const farmAttive = farmDisponibili.filter((farm) => farm.isAttiva);
            const farmInattive = farmDisponibili.filter(
              (farm) => !farm.isAttiva
            );

            const handleAssegnazione = (farmId: string) => {
              if (isCesto) {
                handleAssegnaCesto(id, farmId);
              } else {
                handleAssegnaIncarico(id, farmId);
              }
              setAnchorEl(null);
            };

            return (
              <>
                <ListSubheader
                  sx={{
                    py: 0.5,
                    lineHeight: "24px",
                    fontSize: "0.75rem",
                    color: "rgb(33, 150, 243)", // Aggiungo il colore blu
                  }}
                >
                  Farm Attive
                </ListSubheader>
                {farmAttive.map((farm) => (
                  <MenuItem
                    key={farm.id}
                    onClick={() => handleAssegnazione(farm.farmId)}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      py: 0.5,
                      minHeight: "unset",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: "0.8rem" }}>
                        {farm.giocatore_nome} - {farm.nome}
                      </Typography>
                      <Typography
                        sx={{
                          color: "rgb(33, 150, 243)",
                          fontSize: "0.7rem",
                          fontStyle: "italic",
                        }}
                      >
                        {farm.livello}
                      </Typography>
                    </Box>
                    {farm.derby_tags && farm.derby_tags.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.25,
                          mt: 0.25,
                          flexWrap: "wrap",
                        }}
                      >
                        {farm.derby_tags.map((tagId) => {
                          const derbyInfo = derby.find((d) => d.id === tagId);
                          if (!derbyInfo) return null;
                          return (
                            <Chip
                              key={tagId}
                              label={derbyInfo.nome}
                              size="small"
                              sx={{
                                height: 14,
                                fontSize: "0.6rem",
                                bgcolor: derbyInfo.colore || "#666",
                                color: "white",
                                "& .MuiChip-label": { px: 0.5 },
                              }}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </MenuItem>
                ))}

                {farmInattive.length > 0 && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <ListSubheader
                      sx={{ py: 0.5, lineHeight: "24px", fontSize: "0.75rem" }}
                    >
                      Farm Inattive
                    </ListSubheader>
                    {farmInattive.map((farm) => (
                      <MenuItem
                        key={farm.id}
                        onClick={() => handleAssegnazione(farm.farmId)}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          py: 0.5,
                          minHeight: "unset",
                          color: "text.secondary",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography sx={{ fontSize: "0.8rem" }}>
                            {farm.giocatore_nome} - {farm.nome}
                          </Typography>
                          <Typography
                            sx={{
                              color: "text.secondary",
                              fontSize: "0.7rem",
                              fontStyle: "italic",
                            }}
                          >
                            {farm.livello}
                          </Typography>
                        </Box>
                        {farm.derby_tags && farm.derby_tags.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.25,
                              mt: 0.25,
                              flexWrap: "wrap",
                            }}
                          >
                            {farm.derby_tags.map((tagId) => {
                              const derbyInfo = derby.find(
                                (d) => d.id === tagId
                              );
                              if (!derbyInfo) return null;
                              return (
                                <Chip
                                  key={tagId}
                                  label={derbyInfo.nome}
                                  size="small"
                                  sx={{
                                    height: 14,
                                    fontSize: "0.6rem",
                                    bgcolor: derbyInfo.colore || "#666",
                                    color: "white",
                                    opacity: 0.7,
                                    "& .MuiChip-label": { px: 0.5 },
                                  }}
                                />
                              );
                            })}
                          </Box>
                        )}
                      </MenuItem>
                    ))}
                  </>
                )}
              </>
            );
          })()}
        </Menu>
      </Box>
    </Layout>
  );
}
