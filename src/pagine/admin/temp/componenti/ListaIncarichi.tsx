import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Collapse,
  Avatar,
  Fab,
  Zoom,
  Badge,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import BusinessIcon from "@mui/icons-material/Business";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Edificio } from "../../../../tipi/edificio";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";
import { IncaricoCard } from "./IncaricoCard";
import DialogoSelezioneFarm from "./DialogoSelezioneFarmNuovo";
import { Cesto } from "../../../../tipi/cesto";

interface ListaIncarichiProps {
  edifici: Edificio[];
  incarichi: Incarico[];
  getTranslatedName: (nome: string) => string;
  getQuantitaIncarico: (incarico: Incarico | IncaricoCitta) => number;
  calcolaConteggi: (incaricoId: string) => Promise<ConteggioAssegnazioni>;
  onAssegnaIncarico: (incaricoId: string, farmId: string) => void;
  expandedEdifici: string[];
  handleEdificioToggle: (edificioId: string | null) => void;
  searchQuery: string;
  mostraCompletati?: boolean;
  assegnazioni: { tipo: string; riferimento_id: string; farm_id: string; id: string; completato: boolean }[];
  onToggleCompletamento?: (assegnazioneId: string, completato: boolean) => void;
  onRimuoviAssegnazione?: (assegnazioneId: string) => void;
  visualizzazioneGlobale?: boolean;
  ordinaIncarichi?: (incarichi: Incarico[]) => Incarico[];
  trovaCestoPerIncarico?: (incaricoId: string) => Cesto | undefined;
  onNavigaACesto?: (cestoId: string) => void;
  elementoEvidenziato?: {
    tipo: 'incarico' | 'incaricoCitta' | 'cesto';
    id: string;
  } | null;
  derbySelezionatoId?: string;
  incarichiInPreset?: string[];
}

/**
 * Componente per visualizzare la lista degli incarichi raggruppati per edificio
 */
export const ListaIncarichi: React.FC<ListaIncarichiProps> = ({
  edifici,
  incarichi,
  getTranslatedName,
  getQuantitaIncarico,
  calcolaConteggi,
  onAssegnaIncarico,
  expandedEdifici,
  handleEdificioToggle,
  searchQuery,
  mostraCompletati = false,
  assegnazioni,
  onToggleCompletamento,
  onRimuoviAssegnazione,
  visualizzazioneGlobale = false,
  ordinaIncarichi = (inc) => inc,
  trovaCestoPerIncarico,
  onNavigaACesto,
  elementoEvidenziato,
  derbySelezionatoId = "",
  incarichiInPreset = [],
}) => {
  // Stato per i conteggi degli incarichi
  const [conteggiIncarichi, setConteggiIncarichi] = useState<Record<string, ConteggioAssegnazioni>>({});
  // Stato per il dialogo di selezione della farm
  const [dialogoAperto, setDialogoAperto] = useState(false);
  const [incaricoSelezionato, setIncaricoSelezionato] = useState<{ id: string; nome: string; livelloMinimo: number } | null>(null);
  // Stato per il pulsante "torna in alto"
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Funzione per ottenere i conteggi di un incarico
  const getConteggiIncarico = async (incaricoId: string) => {
    if (conteggiIncarichi[incaricoId]) {
      return conteggiIncarichi[incaricoId];
    }

    try {
      const conteggi = await calcolaConteggi(incaricoId);
      setConteggiIncarichi((prev) => ({
        ...prev,
        [incaricoId]: conteggi,
      }));
      return conteggi;
    } catch (error) {
      console.error("Errore nel calcolo dei conteggi:", error);
      return {
        totaleAttive: 0,
        totaleInattive: 0,
        completateAttive: 0,
        completateInattive: 0,
        completateSenzaAssegnazioneAttive: 0,
        completateSenzaAssegnazioneInattive: 0,
      };
    }
  };

  // Funzione per aprire il dialogo di selezione della farm
  const handleApriDialogo = (incaricoId: string, nome: string, livelloMinimo: number) => {
    // Trova le farm già assegnate a questo incarico
    const farmIdsGiaAssegnate = assegnazioni
      .filter(a => a.tipo === "incarico" && a.riferimento_id === incaricoId)
      .map(a => a.farm_id);
    
    setIncaricoSelezionato({ 
      id: incaricoId, 
      nome,
      livelloMinimo
    });
    setDialogoAperto(true);
  };

  // Funzione per chiudere il dialogo di selezione della farm
  const handleChiudiDialogo = () => {
    setDialogoAperto(false);
    setIncaricoSelezionato(null);
  };

  // Funzione per gestire l'assegnazione dell'incarico
  const handleAssegna = (farmIds: string[]) => {
    if (incaricoSelezionato && farmIds.length > 0) {
      // Ora farmIds è un array di ID individuali, chiama onAssegnaIncarico per ogni ID
      for (const farmId of farmIds) {
        onAssegnaIncarico(incaricoSelezionato.id, farmId);
      }
      
      setDialogoAperto(false);
      setIncaricoSelezionato(null);
    }
  };

  // Funzione per gestire la rimozione di un'assegnazione
  const handleRimuoviAssegnazione = (assegnazioneId: string) => {
    // Chiudi il dialogo se è aperto
    if (dialogoAperto) {
      setDialogoAperto(false);
      setIncaricoSelezionato(null);
    }
    
    // Chiama la funzione di rimozione passata come prop
    if (onRimuoviAssegnazione) {
      onRimuoviAssegnazione(assegnazioneId);
    }
  };

  // Filtra gli incarichi in base alla query di ricerca
  const filteredIncarichi = incarichi.filter((incarico) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    
    // Cerca nel nome dell'incarico
    if (getTranslatedName(incarico.nome).toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Cerca nel nome dell'edificio
    const edificio = edifici.find(e => e.id === incarico.edificio_id);
    if (edificio && edificio.nome.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    return false;
  });

  // Ordina gli incarichi
  const incarichiOrdinati = ordinaIncarichi(filteredIncarichi);

  // Raggruppa gli incarichi per edificio
  const incarichiPerEdificio = edifici
    // Non ordiniamo qui gli edifici, perché l'ordinamento è già gestito dal componente padre
    .map((edificio) => {
      const incarichiEdificio = incarichiOrdinati.filter(
        (incarico) => incarico.edificio_id === edificio.id
      );
      return {
        edificio,
        incarichi: incarichiEdificio,
      };
    }).filter(gruppo => gruppo.incarichi.length > 0);

  // Effect per gestire la visibilità del pulsante "torna in alto"
  useEffect(() => {
    const handleScroll = () => {
      // Mostra il pulsante quando si scorre oltre i 300px
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Funzione per scorrere in cima alla lista
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Renderizza la lista degli incarichi in base alla modalità di visualizzazione
  if (visualizzazioneGlobale) {
    // Visualizzazione lista normale (tutti gli incarichi in un'unica lista)
    return (
      <Box>
        {/* Lista degli incarichi */}
        {incarichiOrdinati.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nessun incarico trovato
          </Typography>
        ) : (
          <Box>
            {incarichiOrdinati.map((incarico) => {
              // Trova il cesto che contiene questo incarico
              const cestoContenente = trovaCestoPerIncarico ? trovaCestoPerIncarico(incarico.id) : null;
              
              // Calcola la quantità dell'incarico nel cesto, se presente
              let quantitaNelCesto = undefined;
              if (cestoContenente) {
                const incaricoInCesto = cestoContenente.incarichi.find(i => i.incarico_id === incarico.id);
                if (incaricoInCesto) {
                  quantitaNelCesto = incaricoInCesto.quantita;
                }
              }
              
              // Verifica se l'incarico è evidenziato
              const isEvidenziato = elementoEvidenziato?.tipo === 'incarico' && elementoEvidenziato.id === incarico.id;
              
              // Verifica se l'incarico è incluso nel preset attivo
              const isInPreset = incarichiInPreset.includes(incarico.id);
              
              return (
                <IncaricoCard
                  key={incarico.id}
                  incarico={incarico}
                  conteggi={conteggiIncarichi[incarico.id] || {
                    totaleAttive: 0,
                    totaleInattive: 0,
                    completateAttive: 0,
                    completateInattive: 0,
                    completateSenzaAssegnazioneAttive: 0,
                    completateSenzaAssegnazioneInattive: 0,
                  }}
                  getTranslatedName={getTranslatedName}
                  getQuantitaIncarico={getQuantitaIncarico}
                  onAssegna={handleApriDialogo}
                  mostraCompletati={mostraCompletati}
                  assegnazioni={assegnazioni}
                  onToggleCompletamento={onToggleCompletamento}
                  onRimuoviAssegnazione={handleRimuoviAssegnazione}
                  cestoContenente={cestoContenente}
                  onNavigaACesto={onNavigaACesto}
                  evidenziato={isEvidenziato}
                  quantitaNelCesto={quantitaNelCesto}
                  isInPreset={isInPreset}
                />
              );
            })}
          </Box>
        )}

        {/* Dialogo di selezione della farm */}
        {incaricoSelezionato && (
          <DialogoSelezioneFarm
            open={dialogoAperto}
            onClose={handleChiudiDialogo}
            onConfirm={handleAssegna}
            tipoAssegnazione="incarico"
            riferimentoId={incaricoSelezionato.id}
            riferimentoNome={incaricoSelezionato.nome}
            livelloMinimo={incaricoSelezionato.livelloMinimo}
            farmIdsGiaAssegnate={assegnazioni
              .filter(a => 
                a.tipo === "incarico" && 
                a.riferimento_id === incaricoSelezionato.id &&
                // Assicurati che l'assegnazione non sia stata rimossa localmente
                !a.id.startsWith('delete_')
              )
              .map(a => a.farm_id)
            }
            derbySelezionatoId={derbySelezionatoId}
          />
        )}

        {/* Pulsante per tornare in cima */}
        <Zoom in={showScrollTop}>
          <Fab 
            color="primary" 
            size="small" 
            onClick={scrollToTop}
            sx={{ 
              position: 'fixed', 
              bottom: 16, 
              right: 16,
              zIndex: 1000
            }}
            aria-label="torna in alto"
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Zoom>
      </Box>
    );
  } else {
    // Visualizzazione per edificio
    return (
      <Box>
        {/* Incarichi raggruppati per edificio */}
        {incarichiPerEdificio.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Nessun incarico trovato
          </Typography>
        ) : (
          <>
            {/* Incarichi raggruppati per edificio */}
            {incarichiPerEdificio.map(({ edificio, incarichi }) => (
              <Paper
                key={edificio.id}
                elevation={0}
                onClick={() => handleEdificioToggle(edificio.id)}
                sx={{ 
                  mb: 0,
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: 0,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer'
                }}
              >
                {/* Intestazione edificio */}
                <Box 
                  sx={{ 
                    p: 1.5,
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: '24px',
                      bgcolor: 'rgb(33, 150, 243, 0.1)',
                      zIndex: 1
                    }
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
                    <Typography 
                      sx={{ 
                        fontSize: '0.75rem',
                        fontStyle: 'italic',
                        color: 'rgb(33, 150, 243)',
                        position: 'absolute',
                        left: 0,
                        width: '24px',
                        textAlign: 'center',
                        zIndex: 2
                      }}
                    >
                      {edificio.livello}
                    </Typography>
                    
                    {/* Immagine dell'edificio */}
                    {edificio.immagine ? (
                      <Avatar
                        src={edificio.immagine}
                        alt={edificio.nome}
                        variant="rounded"
                        sx={{ width: 28, height: 28, flexShrink: 0 }}
                      />
                    ) : (
                      <Avatar
                        variant="rounded"
                        sx={{ width: 28, height: 28, bgcolor: 'grey.300', flexShrink: 0 }}
                      >
                        <BusinessIcon sx={{ fontSize: 16 }} />
                      </Avatar>
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
                      {edificio.nome}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 1, flexShrink: 0 }}
                    >
                      ({incarichi.length})
                    </Typography>
                  </Box>
                </Box>

                {/* Contenuto espandibile */}
                <Collapse in={expandedEdifici.includes(edificio.id)}>
                  <Box sx={{ p: 1 }}>
                    {incarichi.map((incarico) => {
                      // Trova il cesto che contiene questo incarico
                      const cestoContenente = trovaCestoPerIncarico ? trovaCestoPerIncarico(incarico.id) : null;
                      
                      // Calcola la quantità dell'incarico nel cesto, se presente
                      let quantitaNelCesto = undefined;
                      if (cestoContenente) {
                        const incaricoInCesto = cestoContenente.incarichi.find(i => i.incarico_id === incarico.id);
                        if (incaricoInCesto) {
                          quantitaNelCesto = incaricoInCesto.quantita;
                        }
                      }
                      
                      // Verifica se l'incarico è evidenziato
                      const isEvidenziato = elementoEvidenziato?.tipo === 'incarico' && elementoEvidenziato.id === incarico.id;
                      
                      // Verifica se l'incarico è incluso nel preset attivo
                      const isInPreset = incarichiInPreset.includes(incarico.id);
                      
                      return (
                        <IncaricoCard
                          key={incarico.id}
                          incarico={incarico}
                          conteggi={conteggiIncarichi[incarico.id] || {
                            totaleAttive: 0,
                            totaleInattive: 0,
                            completateAttive: 0,
                            completateInattive: 0,
                            completateSenzaAssegnazioneAttive: 0,
                            completateSenzaAssegnazioneInattive: 0,
                          }}
                          getTranslatedName={getTranslatedName}
                          getQuantitaIncarico={getQuantitaIncarico}
                          onAssegna={handleApriDialogo}
                          mostraCompletati={mostraCompletati}
                          assegnazioni={assegnazioni}
                          onToggleCompletamento={onToggleCompletamento}
                          onRimuoviAssegnazione={handleRimuoviAssegnazione}
                          cestoContenente={cestoContenente}
                          onNavigaACesto={onNavigaACesto}
                          evidenziato={isEvidenziato}
                          quantitaNelCesto={quantitaNelCesto}
                          isInPreset={isInPreset}
                        />
                      );
                    })}
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </>
        )}

        {/* Dialogo di selezione della farm */}
        {incaricoSelezionato && (
          <DialogoSelezioneFarm
            open={dialogoAperto}
            onClose={handleChiudiDialogo}
            onConfirm={handleAssegna}
            tipoAssegnazione="incarico"
            riferimentoId={incaricoSelezionato.id}
            riferimentoNome={incaricoSelezionato.nome}
            livelloMinimo={incaricoSelezionato.livelloMinimo}
            farmIdsGiaAssegnate={assegnazioni
              .filter(a => 
                a.tipo === "incarico" && 
                a.riferimento_id === incaricoSelezionato.id &&
                // Assicurati che l'assegnazione non sia stata rimossa localmente
                !a.id.startsWith('delete_')
              )
              .map(a => a.farm_id)
            }
            derbySelezionatoId={derbySelezionatoId}
          />
        )}

        {/* Pulsante per tornare in cima */}
        <Zoom in={showScrollTop}>
          <Fab 
            color="primary" 
            size="small" 
            onClick={scrollToTop}
            sx={{ 
              position: 'fixed', 
              bottom: 16, 
              right: 16,
              zIndex: 1000
            }}
            aria-label="torna in alto"
          >
            <KeyboardArrowUpIcon />
          </Fab>
        </Zoom>
      </Box>
    );
  }
}; 