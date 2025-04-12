import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Divider,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  Paper,
  Collapse,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import { Incarico } from "../../../../tipi/incarico";
import { Assegnazione } from "../../../../tipi/assegnazione";
import { Edificio } from "../../../../tipi/edificio";
import { Cesto } from "../../../../tipi/cesto";
import IncaricoGiocatoreCard from "./IncaricoGiocatoreCard";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";

interface ListaIncarichiProps {
  incarichi: Incarico[];
  assegnazioni: Assegnazione[];
  edifici: Edificio[];
  progressi: Map<string, number>;
  searchQuery: string;
  visualizzazioneGlobale: boolean;
  mostraSoloAssegnati: boolean;
  expandedEdifici: string[];
  ordinamentoLivello: boolean;
  ordinamentoAlfabetico: boolean;
  ordinamentoCompletamento: boolean;
  ordinamentoInverso: boolean;
  elementoEvidenziato: { tipo: 'incarico' | 'incaricoCitta' | 'cesto'; id: string } | null;
  onToggleCompletamento: (incaricoId: string, completato: boolean) => void;
  onUpdateQuantita: (incaricoId: string, quantita: number) => void;
  onEdificioToggle: (edificioId: string) => void;
  onEvidenziazioneFine: () => void;
  getQuantitaIncarico?: (incarico: Incarico) => number;
  trovaCestoPerIncarico?: (incaricoId: string) => Cesto | undefined;
  getQuantitaIncaricoCesto?: (cestoId: string, incaricoId: string) => number;
  onNavigateToCesto?: (cestoId: string) => void;
  livelloFarmSelezionata?: number;
  expandedIncarichi?: string[];
  onIncaricoExpand?: (incaricoId: string, isExpanded: boolean) => void;
  getProgressoCorrente?: (incaricoId: string) => number;
}

export default function ListaIncarichi({
  incarichi,
  assegnazioni,
  edifici,
  progressi,
  searchQuery,
  visualizzazioneGlobale,
  mostraSoloAssegnati,
  expandedEdifici,
  ordinamentoLivello,
  ordinamentoAlfabetico,
  ordinamentoCompletamento,
  ordinamentoInverso,
  elementoEvidenziato,
  onToggleCompletamento,
  onUpdateQuantita,
  onEdificioToggle,
  onEvidenziazioneFine,
  getQuantitaIncarico,
  trovaCestoPerIncarico,
  getQuantitaIncaricoCesto,
  onNavigateToCesto,
  livelloFarmSelezionata = 0,
  expandedIncarichi,
  onIncaricoExpand,
  getProgressoCorrente = (incaricoId: string) => progressi.get(incaricoId) || 0,
}: ListaIncarichiProps) {
  const { t } = useTranslation();

  // Funzione per trovare l'assegnazione di un incarico
  const trovaAssegnazione = (incaricoId: string) => {
    const assegnazione = assegnazioni.find(a => a.riferimento_id === incaricoId);
    return assegnazione;
  };

  // Funzione per trovare il progresso di un incarico
  const trovaProgresso = (incaricoId: string) => {
    return getProgressoCorrente(incaricoId);
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

  // Filtraggio degli incarichi in base alla ricerca e alle opzioni selezionate
  const incarichiFiltratiEOrdinati = useMemo(() => {
    // Verifica se ci sono assegnazioni di tipo "incarico"
    const assegnazioniIncarichi = assegnazioni.filter(a => a.tipo === "incarico");
    
    if (assegnazioniIncarichi.length > 0) {
      // Verifica se gli ID degli incarichi nelle assegnazioni corrispondono agli ID degli incarichi
      const incarichiAssegnati = incarichi.filter(incarico => 
        assegnazioniIncarichi.some(assegnazione => assegnazione.riferimento_id === incarico.id)
      );
    }
    
    // Filtraggio
    let incarichiFiltratiTemp = incarichi.filter(incarico => {
      // Filtraggio per ricerca
      if (searchQuery && !incarico.nome.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Filtraggio per incarichi assegnati
      if (mostraSoloAssegnati) {
        const assegnazione = trovaAssegnazione(incarico.id);
        const risultato = !!assegnazione;
        return risultato;
      }
      
      return true;
    });
    
    // Ordinamento
    return incarichiFiltratiTemp.sort((a, b) => {
      let comparison = 0;
      
      if (ordinamentoLivello) {
        comparison = a.livello_minimo - b.livello_minimo;
      } else if (ordinamentoAlfabetico) {
        comparison = a.nome.localeCompare(b.nome);
      } else if (ordinamentoCompletamento) {
        const assegnazioneA = trovaAssegnazione(a.id);
        const assegnazioneB = trovaAssegnazione(b.id);
        
        const completatoA = assegnazioneA?.completato || false;
        const completatoB = assegnazioneB?.completato || false;
        
        if (completatoA === completatoB) {
          const progressoA = trovaProgresso(a.id);
          const progressoB = trovaProgresso(b.id);
          comparison = progressoB - progressoA;
        } else {
          comparison = completatoB ? 1 : -1;
        }
      }
      
      return ordinamentoInverso ? -comparison : comparison;
    });
  }, [
    incarichi, 
    searchQuery, 
    mostraSoloAssegnati, 
    ordinamentoLivello, 
    ordinamentoAlfabetico, 
    ordinamentoCompletamento, 
    ordinamentoInverso,
    assegnazioni,
    progressi
  ]);

  // Ordinamento e raggruppamento degli incarichi per edificio
  const incarichiPerEdificio = useMemo(() => {
    const result: Record<string, Incarico[]> = {};
    
    // Inizializza un array vuoto per ogni edificio
    edifici.forEach(edificio => {
      result[edificio.id] = [];
    });
    
    // Aggiungi un gruppo per gli incarichi senza edificio
    result["senza_edificio"] = [];
    
    // Raggruppa gli incarichi per edificio
    incarichiFiltratiEOrdinati.forEach(incarico => {
      if (incarico.edificio_id && result[incarico.edificio_id]) {
        result[incarico.edificio_id].push(incarico);
      } else {
        result["senza_edificio"].push(incarico);
      }
    });
    
    return result;
  }, [incarichiFiltratiEOrdinati, edifici]);

  // Ordina edifici in base ai criteri di ordinamento selezionati
  const edificiOrdinati = useMemo(() => {
    // Crea una copia dell'array dei soli edifici con incarichi
    const edificiConIncarichi = edifici
      .filter(edificio => 
        incarichiPerEdificio[edificio.id] && 
        incarichiPerEdificio[edificio.id].length > 0
      );
    
    // Aggiungi l'edificio "senza_edificio" se ha incarichi
    if (incarichiPerEdificio["senza_edificio"]?.length > 0) {
      edificiConIncarichi.push({
        id: "senza_edificio",
        nome: "Altri Incarichi",
        livello: 0,
        immagine: ""
      });
    }
    
    // Ordina gli edifici
    return edificiConIncarichi.sort((a, b) => {
      let comparison = 0;
      
      if (ordinamentoLivello) {
        comparison = a.livello - b.livello;
      } else if (ordinamentoAlfabetico) {
        comparison = a.nome.localeCompare(b.nome);
      } else if (ordinamentoCompletamento) {
        // Calcola la percentuale di completamento per ogni edificio
        const incarichiA = incarichiPerEdificio[a.id] || [];
        const incarichiB = incarichiPerEdificio[b.id] || [];
        
        const completatiA = incarichiA.filter(incarico => {
          const assegnazione = assegnazioni.find(a => a.riferimento_id === incarico.id);
          return assegnazione?.completato || false;
        }).length;
        
        const completatiB = incarichiB.filter(incarico => {
          const assegnazione = assegnazioni.find(a => a.riferimento_id === incarico.id);
          return assegnazione?.completato || false;
        }).length;
        
        const percentualeA = incarichiA.length > 0 ? completatiA / incarichiA.length : 0;
        const percentualeB = incarichiB.length > 0 ? completatiB / incarichiB.length : 0;
        
        comparison = percentualeB - percentualeA; // Ordina per percentuale decrescente
      }
      
      return ordinamentoInverso ? -comparison : comparison;
    });
  }, [edifici, incarichiPerEdificio, ordinamentoLivello, ordinamentoAlfabetico, ordinamentoCompletamento, ordinamentoInverso, assegnazioni]);

  // Funzione per ordinare gli incarichi all'interno di ogni edificio
  const ordinaIncarichiInEdificio = (incarichi: Incarico[]): Incarico[] => {
    return [...incarichi].sort((a, b) => {
      let comparison = 0;
      
      if (ordinamentoLivello) {
        comparison = a.livello_minimo - b.livello_minimo;
      } else if (ordinamentoAlfabetico) {
        comparison = a.nome.localeCompare(b.nome);
      } else if (ordinamentoCompletamento) {
        const assegnazioneA = trovaAssegnazione(a.id);
        const assegnazioneB = trovaAssegnazione(b.id);
        
        const completatoA = assegnazioneA?.completato || false;
        const completatoB = assegnazioneB?.completato || false;
        
        if (completatoA === completatoB) {
          const progressoA = trovaProgresso(a.id);
          const progressoB = trovaProgresso(b.id);
          comparison = progressoB - progressoA;
        } else {
          comparison = completatoB ? 1 : -1;
        }
      }
      
      return ordinamentoInverso ? -comparison : comparison;
    });
  };

  // Funzione per trovare il nome dell'edificio
  const trovaEdificio = (edificioId: string) => {
    return edifici.find(e => e.id === edificioId);
  };

  // Funzione per verificare se un incarico è disponibile in base al livello della farm
  const isIncaricoDisponibile = (incarico: Incarico): boolean => {
    return livelloFarmSelezionata >= (incarico.livello_minimo || 0);
  };

  // Rendering della lista per edificio
  const renderListaPerEdificio = () => {
    return (
      <Box>
        {edificiOrdinati.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: "center", my: 4 }}>
            Nessun incarico trovato.
          </Typography>
        ) : (
          <>
            {edificiOrdinati.map((edificio) => {
              // Ottieni gli incarichi per questo edificio
              const incarichiEdificio = incarichiPerEdificio[edificio.id] || [];
              
              // Salta gli edifici senza incarichi
              if (incarichiEdificio.length === 0) {
                return null;
              }
              
              // Ordina gli incarichi all'interno dell'edificio
              const incarichiOrdinati = ordinaIncarichiInEdificio(incarichiEdificio);
              
              const isExpanded = expandedEdifici.includes(edificio.id);
              
              // Calcola il numero di incarichi completati per questo edificio
              const incarichiCompletati = incarichiOrdinati.filter(incarico => {
                const assegnazione = trovaAssegnazione(incarico.id);
                return assegnazione?.completato || false;
              }).length;
              
              // Calcola il numero di incarichi assegnati per questo edificio
              const incarichiAssegnati = incarichiOrdinati.filter(incarico => {
                return !!trovaAssegnazione(incarico.id);
              }).length;
              
              // Verifica se tutti gli incarichi assegnati sono completati
              const tuttiIncarichiAssegnatiCompletati = incarichiAssegnati > 0 && incarichiCompletati === incarichiAssegnati;
              
              return (
                <Paper
                  key={edificio.id}
                  elevation={0}
                  onClick={() => onEdificioToggle(edificio.id)}
                  sx={{ 
                    mb: 0,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                  }}
                >
                  {/* Intestazione edificio */}
                  <Box 
                    sx={{ 
                      p: 1.5,
                      position: 'relative',
                      backgroundColor: tuttiIncarichiAssegnatiCompletati 
                        ? 'rgba(76, 175, 80, 0.2)'   // Verde più intenso per l'intestazione
                        : 'transparent',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '24px',
                        bgcolor: 'rgb(33, 150, 243, 0.1)', // Torniamo al colore originale blu per la strisciolina del livello
                        zIndex: 1
                      },
                      '&::after': incarichiAssegnati > 0 ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '4px',
                        bgcolor: 'rgb(33, 150, 243)',  // Torniamo al colore originale blu per l'indicatore
                        zIndex: 2
                      } : {}
                    }}
                  >
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 1, 
                      pl: 3,
                      width: '100%',
                      overflow: 'hidden'
                    }}>
                      {/* Livello in corsivo */}
                      {edificio?.livello > 0 && (
                        <Typography 
                          sx={{ 
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                            color: 'rgb(33, 150, 243)',  // Torniamo al colore originale blu per il livello
                            position: 'absolute',
                            left: 0,
                            width: '24px',
                            textAlign: 'center',
                            zIndex: 2
                          }}
                        >
                          {edificio.livello}
                        </Typography>
                      )}
                      
                      {/* Immagine dell'edificio */}
                      {edificio.id !== "senza_edificio" && (
                        <Box
                          component="img"
                          src={edificio?.immagine || '/icone/edifici/generic_building.png'}
                          alt={edificio?.nome || "Edificio"}
                          sx={{
                            width: 28, 
                            height: 28, 
                            flexShrink: 0,
                            objectFit: 'contain'
                          }}
                        />
                      )}
                      
                      <Typography 
                        sx={{ 
                          flexGrow: 1, 
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.2,
                          wordBreak: 'break-word'
                        }}
                      >
                        {edificio.id === "senza_edificio" ? "Altri Incarichi" : edificio?.nome || "Edificio Sconosciuto"}
                        {tuttiIncarichiAssegnatiCompletati && (
                          <CheckCircleIcon 
                            sx={{ 
                              ml: 0.5, 
                              fontSize: '1rem',
                              color: 'rgb(76, 175, 80)',
                              verticalAlign: 'middle'
                            }} 
                          />
                        )}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ ml: 1, flexShrink: 0 }}
                      >
                        ({incarichiOrdinati.length})
                      </Typography>
                    </Box>
                  </Box>

                  {/* Contenuto espandibile */}
                  <Collapse in={isExpanded}>
                    <Box sx={{ p: 1 }}>
                      <Grid container spacing={0} sx={{ mx: 0, width: '100%' }}>
                        {incarichiOrdinati.map(incarico => {
                          const assegnazione = trovaAssegnazione(incarico.id);
                          const progresso = trovaProgresso(incarico.id);
                          const isEvidenziato = elementoEvidenziato?.tipo === 'incarico' && elementoEvidenziato.id === incarico.id;
                          const isExpanded = expandedIncarichi?.includes(incarico.id) || false;
                          
                          return (
                            <Grid item xs={12} key={incarico.id} sx={{ pb: 0 }}>
                              <IncaricoGiocatoreCard
                                incarico={incarico}
                                assegnazione={assegnazione}
                                progresso={progresso}
                                onToggleCompletamento={onToggleCompletamento}
                                onUpdateQuantita={onUpdateQuantita}
                                evidenziato={isEvidenziato}
                                onEvidenziazioneFine={onEvidenziazioneFine}
                                getQuantitaIncarico={getQuantitaIncarico}
                                trovaCestoPerIncarico={trovaCestoPerIncarico}
                                getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                                onNavigateToCesto={onNavigateToCesto}
                                livelloFarmSelezionata={livelloFarmSelezionata}
                                expanded={isExpanded}
                                onIncaricoExpand={onIncaricoExpand}
                              />
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  </Collapse>
                </Paper>
              );
            })}
          </>
        )}
      </Box>
    );
  };

  // Rendering della lista globale
  const renderListaGlobale = () => {
    // Se mostraSoloAssegnati è true e non ci sono incarichi filtrati, ma ci sono assegnazioni,
    // potrebbe esserci un problema di corrispondenza tra gli ID
    if (mostraSoloAssegnati && incarichiFiltratiEOrdinati.length === 0 && assegnazioni.length > 0) {
      // Verifica se ci sono assegnazioni di tipo "incarico"
      const assegnazioniIncarichi = assegnazioni.filter(a => a.tipo === "incarico");
      
      // Verifica se gli ID degli incarichi nelle assegnazioni corrispondono agli ID degli incarichi
      const incarichiAssegnati = incarichi.filter(incarico => 
        assegnazioniIncarichi.some(assegnazione => assegnazione.riferimento_id === incarico.id)
      );
      
      if (assegnazioniIncarichi.length > 0 && incarichiAssegnati.length === 0) {
        return (
          <Box>
            <Typography variant="body1" sx={{ textAlign: "center", my: 4 }}>
              Ci sono {assegnazioniIncarichi.length} assegnazioni, ma nessun incarico corrispondente è stato trovato.
              Potrebbe esserci un problema di corrispondenza tra gli ID.
            </Typography>
            <Typography variant="body2" sx={{ textAlign: "center", my: 2 }}>
              Prova a ricaricare la pagina o a selezionare un'altra farm.
            </Typography>
          </Box>
        );
      }
    }
    
    return (
      <Box sx={{ width: '100%', maxWidth: '100%' }}>
        {incarichiFiltratiEOrdinati.length === 0 ? (
          <Typography variant="body1" sx={{ textAlign: "center", my: 4 }}>
            {mostraSoloAssegnati 
              ? "Nessun incarico assegnato trovato."
              : "Nessun incarico trovato."}
          </Typography>
        ) : (
          <Grid container spacing={0} sx={{ width: '100%', ml: 0, mr: 0 }}>
            {incarichiFiltratiEOrdinati.map(incarico => {
              const assegnazione = trovaAssegnazione(incarico.id);
              const progresso = trovaProgresso(incarico.id);
              const isEvidenziato = elementoEvidenziato?.tipo === 'incarico' && elementoEvidenziato.id === incarico.id;
              const isExpanded = expandedIncarichi?.includes(incarico.id) || false;
              
              return (
                <Grid item xs={12} key={incarico.id} sx={{ pb: 0 }}>
                  <IncaricoGiocatoreCard
                    incarico={incarico}
                    assegnazione={assegnazione}
                    progresso={progresso}
                    onToggleCompletamento={onToggleCompletamento}
                    onUpdateQuantita={onUpdateQuantita}
                    evidenziato={isEvidenziato}
                    onEvidenziazioneFine={onEvidenziazioneFine}
                    getQuantitaIncarico={getQuantitaIncarico}
                    trovaCestoPerIncarico={trovaCestoPerIncarico}
                    getQuantitaIncaricoCesto={getQuantitaIncaricoCesto}
                    onNavigateToCesto={onNavigateToCesto}
                    livelloFarmSelezionata={livelloFarmSelezionata}
                    expanded={isExpanded}
                    onIncaricoExpand={onIncaricoExpand}
                  />
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {visualizzazioneGlobale ? renderListaGlobale() : renderListaPerEdificio()}
    </Box>
  );
} 