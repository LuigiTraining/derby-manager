import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Paper,
  Collapse,
  Chip,
  Divider,
  Fab,
  Zoom,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import PeopleIcon from "@mui/icons-material/People";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { IncaricoCitta } from "../../../../tipi/incarico";
import { Incarico } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";
import { IncaricoCard } from "./IncaricoCard";
import DialogoSelezioneFarm from "./DialogoSelezioneFarmNuovo";
import { Cesto } from "../../../../tipi/cesto";

interface ListaIncarichiCittaProps {
  incarichiCitta: IncaricoCitta[];
  getTranslatedName: (nome: string) => string;
  getQuantitaIncaricoCitta: (incarico: Incarico | IncaricoCitta) => number;
  calcolaConteggiCitta: (incaricoId: string) => Promise<ConteggioAssegnazioni>;
  onAssegnaIncarico: (incaricoId: string, farmId: string) => void;
  searchQuery: string;
  mostraCompletati?: boolean;
  assegnazioni: { tipo: string; riferimento_id: string; farm_id: string; id: string; completato: boolean }[];
  onToggleCompletamento?: (assegnazioneId: string, completato: boolean) => void;
  onRimuoviAssegnazione?: (assegnazioneId: string) => void;
  trovaCestoPerIncarico?: (incaricoId: string) => Cesto | undefined;
  onNavigaACesto?: (cestoId: string) => void;
  elementoEvidenziato?: {
    tipo: 'incarico' | 'incaricoCitta' | 'cesto';
    id: string;
  } | null;
  derbySelezionatoId?: string;
  ordinamentoLivello?: boolean;
  ordinamentoAlfabetico?: boolean;
  ordinamentoInverso?: boolean;
}

/**
 * Componente per visualizzare la lista degli incarichi città
 */
export const ListaIncarichiCitta: React.FC<ListaIncarichiCittaProps> = ({
  incarichiCitta,
  getTranslatedName,
  getQuantitaIncaricoCitta,
  calcolaConteggiCitta,
  onAssegnaIncarico,
  searchQuery,
  mostraCompletati = true,
  assegnazioni,
  onToggleCompletamento,
  onRimuoviAssegnazione,
  trovaCestoPerIncarico,
  onNavigaACesto,
  elementoEvidenziato,
  derbySelezionatoId = "",
  ordinamentoLivello = true,
  ordinamentoAlfabetico = false,
  ordinamentoInverso = false,
}) => {
  // Stato per i conteggi degli incarichi città
  const [conteggiIncarichi, setConteggiIncarichi] = useState<Record<string, ConteggioAssegnazioni>>({});
  // Stato per l'espansione delle sezioni
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedSectionsCitta");
      return saved ? JSON.parse(saved) : ['edificio', 'visitatore'];
    } catch {
      return ['edificio', 'visitatore'];
    }
  });

  // Salva lo stato di espansione delle sezioni nel localStorage
  useEffect(() => {
    localStorage.setItem("expandedSectionsCitta", JSON.stringify(expandedSections));
  }, [expandedSections]);

  // Stato per il dialogo di selezione della farm
  const [dialogoAperto, setDialogoAperto] = useState(false);
  const [incaricoSelezionato, setIncaricoSelezionato] = useState<{ id: string; nome: string; livelloMinimo: number } | null>(null);

  // Stato per il pulsante "torna in alto"
  const [showScrollTop, setShowScrollTop] = useState(false);
  
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

  // Funzione per gestire l'espansione/compressione delle sezioni
  const handleSectionToggle = (section: string) => {
    setExpandedSections((prev) => {
      if (prev.includes(section)) {
        return prev.filter((s) => s !== section);
      } else {
        return [...prev, section];
      }
    });
  };

  // Funzione per ottenere i conteggi di un incarico città
  const getConteggiIncarico = async (incaricoId: string) => {
    if (conteggiIncarichi[incaricoId]) {
      return conteggiIncarichi[incaricoId];
    }

    try {
      const conteggi = await calcolaConteggiCitta(incaricoId);
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

  // Filtra gli incarichi città in base alla query di ricerca
  const filteredIncarichiCitta = incarichiCitta.filter((incarico) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      incarico.nome.toLowerCase().includes(searchLower) ||
      getTranslatedName(incarico.nome).toLowerCase().includes(searchLower)
    );
  });

  // Ordina gli incarichi città in base ai criteri di ordinamento
  const ordinaIncarichiCitta = (incarichiDaOrdinare: IncaricoCitta[]) => {
    return [...incarichiDaOrdinare].sort((a, b) => {
      let comparazione = 0;
      
      if (ordinamentoLivello) {
        // Ordina per livello
        comparazione = a.livello_minimo - b.livello_minimo;
      } else if (ordinamentoAlfabetico) {
        // Ordina alfabeticamente
        comparazione = getTranslatedName(a.nome).localeCompare(getTranslatedName(b.nome));
      }
      
      // Inverti l'ordine se necessario
      return ordinamentoInverso ? -comparazione : comparazione;
    });
  };

  // Applica l'ordinamento agli incarichi città filtrati
  const incarichiCittaOrdinati = ordinaIncarichiCitta(filteredIncarichiCitta);

  // Raggruppa gli incarichi città per tipo (edificio o visitatore)
  const incarichiCittaPerTipo = {
    edificio: incarichiCittaOrdinati.filter(
      (incarico) => incarico.tipo === "edificio"
    ),
    visitatore: incarichiCittaOrdinati.filter(
      (incarico) => incarico.tipo === "visitatore"
    ),
  };

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Intestazione */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          maxWidth: '100%',
          overflow: 'hidden'
        }}
      >
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>Incarichi Città</Typography>
      </Box>

      {/* Sezioni di incarichi città */}
      {incarichiCittaPerTipo.edificio.length === 0 && incarichiCittaPerTipo.visitatore.length === 0 ? (
        <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nessun incarico città trovato
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Controlla la connessione al database o ricarica la pagina.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
          {/* Sezione Edifici */}
          {incarichiCittaPerTipo.edificio.length > 0 && (
            <Paper
              elevation={0}
              sx={{ 
                mb: 0,
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: 0,
                overflow: 'hidden',
                maxWidth: '100%'
              }}
            >
              {/* Intestazione sezione */}
              <Box 
                sx={{ p: 1.5, cursor: 'pointer' }}
                onClick={() => handleSectionToggle("edificio")}
              >
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 1,
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  <LocationCityIcon sx={{ flexShrink: 0 }} />
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
                    Edifici
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1, flexShrink: 0 }}
                  >
                    ({incarichiCittaPerTipo.edificio.length})
                  </Typography>
                </Box>
              </Box>

              {/* Contenuto espandibile */}
              <Collapse in={expandedSections.includes("edificio")}>
                <Box sx={{ p: 1, maxWidth: '100%', overflow: 'hidden' }}>
                  {incarichiCittaPerTipo.edificio.map((incarico) => {
                    // Trova il cesto che contiene questo incarico
                    const cestoContenente = trovaCestoPerIncarico ? trovaCestoPerIncarico(incarico.id) : null;
                    
                    // Verifica se l'incarico è evidenziato
                    const isEvidenziato = elementoEvidenziato?.tipo === 'incaricoCitta' && elementoEvidenziato.id === incarico.id;
                    
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
                        getQuantitaIncarico={getQuantitaIncaricoCitta}
                        onAssegna={handleApriDialogo}
                        mostraCompletati={mostraCompletati}
                        isCittaIncarico={true}
                        assegnazioni={assegnazioni}
                        onToggleCompletamento={onToggleCompletamento}
                        onRimuoviAssegnazione={handleRimuoviAssegnazione}
                        cestoContenente={cestoContenente ? { id: cestoContenente.id, nome: cestoContenente.nome } : null}
                        onNavigaACesto={onNavigaACesto}
                        evidenziato={isEvidenziato}
                      />
                    );
                  })}
                </Box>
              </Collapse>
            </Paper>
          )}

          {/* Sezione Visitatori */}
          {incarichiCittaPerTipo.visitatore.length > 0 && (
            <Paper
              elevation={0}
              sx={{ 
                mb: 0,
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: 0,
                overflow: 'hidden',
                maxWidth: '100%'
              }}
            >
              {/* Intestazione sezione */}
              <Box 
                sx={{ p: 1.5, cursor: 'pointer' }}
                onClick={() => handleSectionToggle("visitatore")}
              >
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 1,
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  <PeopleIcon sx={{ flexShrink: 0 }} />
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
                    Visitatori
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ ml: 1, flexShrink: 0 }}
                  >
                    ({incarichiCittaPerTipo.visitatore.length})
                  </Typography>
                </Box>
              </Box>

              {/* Contenuto espandibile */}
              <Collapse in={expandedSections.includes("visitatore")}>
                <Box sx={{ p: 1, maxWidth: '100%', overflow: 'hidden' }}>
                  {incarichiCittaPerTipo.visitatore.map((incarico) => {
                    // Trova il cesto che contiene questo incarico
                    const cestoContenente = trovaCestoPerIncarico ? trovaCestoPerIncarico(incarico.id) : null;
                    
                    // Verifica se l'incarico è evidenziato
                    const isEvidenziato = elementoEvidenziato?.tipo === 'incaricoCitta' && elementoEvidenziato.id === incarico.id;
                    
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
                        getQuantitaIncarico={getQuantitaIncaricoCitta}
                        onAssegna={handleApriDialogo}
                        mostraCompletati={mostraCompletati}
                        isCittaIncarico={true}
                        assegnazioni={assegnazioni}
                        onToggleCompletamento={onToggleCompletamento}
                        onRimuoviAssegnazione={handleRimuoviAssegnazione}
                        cestoContenente={cestoContenente ? { id: cestoContenente.id, nome: cestoContenente.nome } : null}
                        onNavigaACesto={onNavigaACesto}
                        evidenziato={isEvidenziato}
                      />
                    );
                  })}
                </Box>
              </Collapse>
            </Paper>
          )}
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
}; 