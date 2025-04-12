import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Tooltip,
  Stack,
} from "@mui/material";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import { Cesto } from "../../../../tipi/cesto";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { Assegnazione } from "../../../../tipi/assegnazione";
import { useTranslation } from "react-i18next";
import { styled } from "@mui/material/styles";

// Stile per il badge del livello
const LevelBadge = styled(Box)(({ theme }) => ({
  position: "absolute",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  left: 4, // Sposto il badge a destra per fare spazio all'indicatore di assegnazione
  top: 0,
  bottom: 0,
  backgroundColor: "#e3f2fd", // Sfondo blu chiaro
  color: "#2196f3", // Testo blu
  fontSize: "0.6rem", // Riduco la dimensione del testo
  fontStyle: "italic",
  fontWeight: "bold",
  zIndex: 1, // Ripristino lo z-index originale
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
}));

// Stile per il bordo sinistro degli incarichi assegnati
const AssignmentIndicator = styled(Box)(({ theme }) => ({
  position: "absolute",
  width: 4,
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: "rgba(25, 118, 210, 0.8)", // Blu per gli incarichi assegnati
  zIndex: 2, // Sopra il LevelBadge
}));

interface ListaCestiProps {
  cesti: Cesto[];
  incarichi: (Incarico | IncaricoCitta)[];
  incarichiCitta?: IncaricoCitta[];
  assegnazioni: Assegnazione[];
  progressi: Map<string, number>;
  searchQuery: string;
  mostraSoloAssegnati: boolean;
  elementoEvidenziato: { tipo: 'incarico' | 'incaricoCitta' | 'cesto'; id: string } | null;
  onToggleCompletamento: (incaricoId: string, completato: boolean) => void;
  onToggleCompletamentoInCesto: (cestoId: string, incaricoId: string) => void;
  onToggleCestoCompletamento: (cestoId: string, completato: boolean) => void;
  onNavigateToIncarico: (incaricoId: string) => void;
  onNavigateToIncaricoCitta?: (incaricoId: string) => void;
  onEvidenziazioneFine: () => void;
  getQuantitaIncarico?: (incarico: Incarico | IncaricoCitta) => number;
  getQuantitaIncaricoCesto?: (cestoId: string, incaricoId: string) => number;
  farmSelezionata?: string;
  giocatoreSelezionato?: string | null;
  expandedIncarichi?: string[];
  onIncaricoExpand?: (incaricoId: string, isExpanded: boolean) => void;
  getProgressoCorrente?: (incaricoId: string) => number;
}

export default function ListaCesti({
  cesti,
  incarichi,
  incarichiCitta,
  assegnazioni,
  progressi,
  searchQuery,
  mostraSoloAssegnati,
  elementoEvidenziato,
  onToggleCompletamento,
  onToggleCompletamentoInCesto,
  onToggleCestoCompletamento,
  onNavigateToIncarico,
  onNavigateToIncaricoCitta,
  onEvidenziazioneFine,
  getQuantitaIncarico,
  getQuantitaIncaricoCesto,
  farmSelezionata,
  giocatoreSelezionato,
  expandedIncarichi,
  onIncaricoExpand,
  getProgressoCorrente = (incaricoId: string) => progressi.get(incaricoId) || 0,
}: ListaCestiProps) {
  const { t } = useTranslation();

  // Verifica se è possibile completare un cesto (deve esserci un giocatore e una farm selezionata)
  const canCompleteCesto = !!farmSelezionata && (farmSelezionata !== "") && (giocatoreSelezionato !== null && giocatoreSelezionato !== undefined);

  // Funzione per calcolare il progresso di un cesto
  const calcolaProgressoCesto = (cesto: Cesto) => {
    let totaleQuantita = 0;
    let totaleProgresso = 0;

    cesto.incarichi.forEach(incarico => {
      const incaricoCompleto = incarichi.find(i => i.id === incarico.incarico_id);
      if (incaricoCompleto) {
        const quantitaRichiesta = getQuantitaIncaricoCesto 
          ? getQuantitaIncaricoCesto(cesto.id, incarico.incarico_id)
          : (incarico.quantita || incaricoCompleto.quantita || 0);
        
        totaleQuantita += quantitaRichiesta;
        
        // Utilizziamo getProgressoCorrente invece di progressi.get
        const progresso = getProgressoCorrente(incarico.incarico_id);
        totaleProgresso += Math.min(progresso, quantitaRichiesta);
      }
    });

    return totaleQuantita > 0 ? (totaleProgresso / totaleQuantita) * 100 : 0;
  };

  // Funzione per calcolare il livello massimo degli incarichi in un cesto
  const calcolaLivelloCesto = (cesto: Cesto): number => {
    let livelloMax = 0;
    let contieneVisitatori = false;
    
    // Prima passata: verifica se contiene visitatori e trova livello massimo
    cesto.incarichi.forEach(incaricoInCesto => {
      const incarico = incarichi.find(inc => inc.id === incaricoInCesto.incarico_id);
      if (incarico) {
        // Verifica se è un visitatore usando la funzione isIncaricoCitta
        if (isIncaricoCitta(incarico)) {
          contieneVisitatori = true;
        }
        
        // Aggiorna il livello massimo
        if (incarico.livello_minimo > livelloMax) {
          livelloMax = incarico.livello_minimo;
        }
      }
    });
    
    // Se contiene visitatori e non ha altri incarichi di livello maggiore di 0, imposta livello a 34
    if (contieneVisitatori && livelloMax === 0) {
      return 34;
    }
    
    return livelloMax;
  };

  // Funzione per tradurre i nomi degli incarichi
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
      ns: "common"
    });
    return traduzione;
  };

  // Funzione per verificare se tutti gli incarichi di un cesto sono completati
  const isCestoCompletato = (cesto: Cesto): boolean => {
    if (cesto.incarichi.length === 0) return false;
    
    return cesto.incarichi.every(incaricoInCesto => {
      const incarico = incarichi.find(inc => inc.id === incaricoInCesto.incarico_id);
      if (!incarico) return false;
      
      // Ottieni la quantità richiesta per questo incarico nel cesto
      const quantitaRichiestaNelCesto = getQuantitaIncaricoCesto 
        ? getQuantitaIncaricoCesto(cesto.id, incaricoInCesto.incarico_id)
        : incaricoInCesto.quantita;
      
      // Ottieni il progresso attuale dell'incarico
      const progressoAttuale = getProgressoCorrente(incaricoInCesto.incarico_id);
      
      // Un incarico nel cesto è considerato completato se il progresso è >= alla quantità richiesta nel cesto
      return progressoAttuale >= quantitaRichiestaNelCesto;
    });
  };

  // Calcola il numero di completamenti possibili per un cesto
  const calcolaCompletamentiCesto = (cesto: Cesto): number => {
    if (cesto.incarichi.length === 0) return 0;
    
    // Calcola quante volte ogni incarico può essere completato
    const completamentiPerIncarico = cesto.incarichi.map(incaricoInCesto => {
      const quantitaRichiestaNelCesto = getQuantitaIncaricoCesto 
        ? getQuantitaIncaricoCesto(cesto.id, incaricoInCesto.incarico_id)
        : incaricoInCesto.quantita;
      
      const progressoAttuale = getProgressoCorrente(incaricoInCesto.incarico_id);
      
      // Se la quantità richiesta è 0, considera l'incarico come non completabile
      if (quantitaRichiestaNelCesto <= 0) return 0;
      
      // Calcola quante volte questo incarico può essere completato
      return Math.floor(progressoAttuale / quantitaRichiestaNelCesto);
    });
    
    // Il numero di completamenti del cesto è il minimo tra i completamenti di tutti gli incarichi
    return Math.min(...completamentiPerIncarico);
  };

  // Funzione per verificare se un cesto è stato assegnato direttamente
  const isCestoAssegnato = (cestoId: string): boolean => {
    // Verifica se esiste un'assegnazione di tipo 'cesto' con riferimento_id uguale a cestoId
    return assegnazioni.some(a => a.tipo === 'cesto' && a.riferimento_id === cestoId);
  };

  // Funzione per verificare se un incarico è di tipo città
  const isIncaricoCitta = (incarico: Incarico | IncaricoCitta): boolean => {
    // Verifica se l'incarico è presente nell'array incarichiCitta
    if (incarichiCitta && incarichiCitta.some(inc => inc.id === incarico.id)) {
      return true;
    }
    
    // Verifica se l'incarico ha la proprietà 'tipo' (presente solo in IncaricoCitta)
    if ('tipo' in incarico) {
      return true;
    }
    
    // Verifica se l'incarico ha la proprietà 'edificio_id' (presente solo in Incarico)
    // Se ha edificio_id, non è un incarico città
    if ('edificio_id' in incarico) {
      return false;
    }
    
    // Verifica se il nome dell'incarico contiene 'cittadin'
    if (incarico.nome && incarico.nome.toLowerCase().includes('cittadin')) {
      return true;
    }
    
    return false;
  };

  // Filtraggio dei cesti in base alla ricerca e alle opzioni selezionate
  const cestiFiltrati = useMemo(() => {
    return cesti.filter(cesto => {
      // Filtraggio per ricerca
      if (searchQuery && !cesto.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
        // Verifica anche se la ricerca corrisponde a uno degli incarichi nel cesto
        const incarichiCorrispondenti = cesto.incarichi.some(incaricoInCesto => {
          // Cerca prima negli incarichi normali
          let incarico = incarichi.find(inc => inc.id === incaricoInCesto.incarico_id);
          
          // Se non trovato, cerca negli incarichi città
          if (!incarico && incarichiCitta) {
            incarico = incarichiCitta.find(inc => inc.id === incaricoInCesto.incarico_id);
          }
          
          return incarico && incarico.nome.toLowerCase().includes(searchQuery.toLowerCase());
        });
        
        if (!incarichiCorrispondenti) {
          return false;
        }
      }
      
      // Filtraggio per cesti assegnati direttamente
      if (mostraSoloAssegnati) {
        return isCestoAssegnato(cesto.id);
      }
      
      return true;
    });
  }, [cesti, incarichi, incarichiCitta, assegnazioni, searchQuery, mostraSoloAssegnati]);

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {cestiFiltrati.length === 0 ? (
        <Typography variant="body1" sx={{ textAlign: "center", my: 4 }}>
          {t('derby.nessun_cesto_trovato')}
        </Typography>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          mt: 0,
          width: '100%',
          // Rimuovo qualsiasi padding o margin che potrebbe causare spazi
          '& > *': { 
            mb: 0, 
            borderRadius: 0,
            width: '100%'
          }
        }}>
          {cestiFiltrati.map(cesto => (
            <CestoItem
              key={cesto.id}
              cesto={cesto}
              incarichi={incarichi}
              incarichiCitta={incarichiCitta}
              assegnazioni={assegnazioni}
              elementoEvidenziato={elementoEvidenziato}
              onEvidenziazioneFine={onEvidenziazioneFine}
              getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
              getProgressoCorrente={getProgressoCorrente}
              onNavigateToIncarico={onNavigateToIncarico}
              onNavigateToIncaricoCitta={onNavigateToIncaricoCitta}
              getTranslatedName={getTranslatedName}
              isIncaricoCitta={isIncaricoCitta}
              isCestoAssegnato={isCestoAssegnato}
              calcolaProgressoCesto={calcolaProgressoCesto}
              calcolaLivelloCesto={calcolaLivelloCesto}
              isCestoCompletato={isCestoCompletato}
              calcolaCompletamentiCesto={calcolaCompletamentiCesto}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

// Componente separato per ogni cesto
interface CestoItemProps {
  cesto: Cesto;
  incarichi: (Incarico | IncaricoCitta)[];
  incarichiCitta?: IncaricoCitta[];
  assegnazioni: Assegnazione[];
  elementoEvidenziato: { tipo: 'incarico' | 'incaricoCitta' | 'cesto'; id: string } | null;
  onEvidenziazioneFine: () => void;
  getQuantitaIncaricoCesto?: (cestoId: string, incaricoId: string) => number;
  getProgressoCorrente: (incaricoId: string) => number;
  onNavigateToIncarico: (incaricoId: string) => void;
  onNavigateToIncaricoCitta?: (incaricoId: string) => void;
  getTranslatedName: (nome: string) => string;
  isIncaricoCitta: (incarico: Incarico | IncaricoCitta) => boolean;
  isCestoAssegnato: (cestoId: string) => boolean;
  calcolaProgressoCesto: (cesto: Cesto) => number;
  calcolaLivelloCesto: (cesto: Cesto) => number;
  isCestoCompletato: (cesto: Cesto) => boolean;
  calcolaCompletamentiCesto: (cesto: Cesto) => number;
}

const CestoItem: React.FC<CestoItemProps> = ({
  cesto,
  incarichi,
  incarichiCitta,
  assegnazioni,
  elementoEvidenziato,
  onEvidenziazioneFine,
  getQuantitaIncaricoCesto,
  getProgressoCorrente,
  onNavigateToIncarico,
  onNavigateToIncaricoCitta,
  getTranslatedName,
  isIncaricoCitta,
  isCestoAssegnato,
  calcolaProgressoCesto,
  calcolaLivelloCesto,
  isCestoCompletato,
  calcolaCompletamentiCesto
}) => {
  const progresso = calcolaProgressoCesto(cesto);
  const livelloCesto = calcolaLivelloCesto(cesto);
  const completato = isCestoCompletato(cesto);
  const completamenti = calcolaCompletamentiCesto(cesto);
  const isEvidenziato = elementoEvidenziato?.tipo === 'cesto' && elementoEvidenziato.id === cesto.id;
  
  // Effetto per gestire l'evidenziazione temporanea
  React.useEffect(() => {
    if (isEvidenziato) {
      const timer = setTimeout(() => {
        onEvidenziazioneFine();
      }, 3000); // Durata dell'evidenziazione: 3 secondi
      
      return () => clearTimeout(timer);
    }
  }, [isEvidenziato, onEvidenziazioneFine]);
  
  return (
    <Card 
      id={`cesto-${cesto.id}`}
      sx={{ 
        mb: 0, // Rimuovo il margin per evitare spazi
        mt: 0, // Rimuovo il margin per evitare spazi
        width: '100%', // Assicura che il cesto occupi tutta la larghezza
        mx: 0, // Rimuove i margini laterali
        backgroundColor: isEvidenziato 
          ? "rgba(255, 215, 0, 0.2)" 
          : completato 
            ? "rgba(76, 175, 80, 0.1)" 
            : "inherit",
        transition: "background-color 0.3s ease",
        borderTop: isEvidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
        borderBottom: isEvidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
        borderRight: isEvidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
        borderLeft: "none", // Rimuovo il bordo sinistro perché ora uso AssignmentIndicator
        borderRadius: 0, // Nessun bordo arrotondato per permettere alle card di unirsi perfettamente
        boxShadow: "none", // Nessuna ombra per evitare spazi visivi
        position: "relative",
      }}
      elevation={0}
    >
      {/* Indicatore di assegnazione - posizionato all'esterno */}
      {isCestoAssegnato(cesto.id) && <AssignmentIndicator />}
      
      {/* Livello del cesto - posizionato al bordo sinistro */}
      <LevelBadge>
        {livelloCesto}
      </LevelBadge>
      
      <CardContent sx={{ py: 0.5, "&:last-child": { pb: 0.5 }, pl: 3.5, pt: 0.5, pb: 0.5 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Contatore di completamenti (spostato qui, tra il livello e la prima immagine) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "24px",
              mr: 1.5,
              height: "100%",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: completamenti > 0 ? "success.main" : "text.secondary",
                fontWeight: completamenti > 0 ? "bold" : "medium",
                fontSize: "0.8rem",
              }}
            >
              x{completamenti}
            </Typography>
          </Box>
          
          {/* Incarichi nel cesto */}
          <Box sx={{ width: 140, mr: 2 }}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-start' }}>
              {cesto.incarichi.map(incaricoInCesto => {
                // Cerca prima negli incarichi normali
                let incarico = incarichi.find(inc => inc.id === incaricoInCesto.incarico_id);
                
                // Se non trovato, cerca negli incarichi città
                if (!incarico && incarichiCitta) {
                  incarico = incarichiCitta.find(inc => inc.id === incaricoInCesto.incarico_id);
                }
                
                if (!incarico) return null;
                
                const assegnazione = assegnazioni.find(a => a.riferimento_id === incaricoInCesto.incarico_id);
                const quantita = getQuantitaIncaricoCesto 
                  ? getQuantitaIncaricoCesto(cesto.id, incaricoInCesto.incarico_id)
                  : incaricoInCesto.quantita;
                const progresso = getProgressoCorrente(incaricoInCesto.incarico_id);
                const incaricoCompletato = progresso >= quantita;
                
                return (
                  <Tooltip 
                    key={incaricoInCesto.incarico_id} 
                    title={getTranslatedName(incarico.nome)}
                    arrow
                  >
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        width: 40, // Larghezza fissa per ogni incarico
                      }}
                      onClick={() => {
                        console.log("Click su incarico:", incarico);
                        
                        // Naviga all'incarico corrispondente
                        if (isIncaricoCitta(incarico) && onNavigateToIncaricoCitta) {
                          onNavigateToIncaricoCitta(incarico.id);
                        } else {
                          onNavigateToIncarico(incarico.id);
                        }
                      }}
                    >
                      <Avatar 
                        src={incarico.immagine} 
                        alt={incarico.nome}
                        variant="rounded"
                        sx={{ 
                          width: 32, 
                          height: 32,
                          border: "none", // Rimuovo il bordo dalle icone
                          backgroundColor: isIncaricoCitta(incarico) ? "rgba(0, 0, 0, 0.04)" : undefined,
                        }}
                      >
                        {isIncaricoCitta(incarico) && <LocationCityIcon fontSize="small" />}
                      </Avatar>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: incaricoCompletato ? "bold" : "medium",
                          color: incaricoCompletato ? "success.main" : "text.primary",
                          bgcolor: "white",
                          px: 0.5,
                          py: 0.1,
                          mt: 0.5,
                          borderRadius: 1,
                          border: "none", // Rimuovo il bordo
                          boxShadow: "none", // Rimuovo l'ombra
                          lineHeight: 1,
                          width: '100%',
                          textAlign: 'center',
                        }}
                      >
                        {progresso}/{quantita}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Stack>
          </Box>
          
          {/* Nome del cesto */}
          <Typography variant="body1" component="div" sx={{ fontWeight: "medium" }}>
            {cesto.nome}
          </Typography>
          
          {/* Spazio flessibile */}
          <Box sx={{ flexGrow: 1 }} />
        </Box>
      </CardContent>
    </Card>
  );
}; 