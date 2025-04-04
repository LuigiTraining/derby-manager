import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Fab,
  Zoom,
} from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SortIcon from "@mui/icons-material/Sort";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Cesto } from "../../../../tipi/cesto";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";
import DialogoSelezioneFarm from "./DialogoSelezioneFarmNuovo";
import { CestoCard } from "./CestoCard";

interface ListaCestiProps {
  cesti: Cesto[];
  incarichi: Incarico[];
  incarichiCitta?: IncaricoCitta[];
  getTranslatedName: (nome: string) => string;
  getQuantitaIncaricoCesto: (cestoId: string, incaricoId: string) => number;
  calcolaConteggiCesto: (cestoId: string) => Promise<ConteggioAssegnazioni>;
  onAssegnaCesto: (cestoId: string, farmId: string) => void;
  searchQuery: string;
  mostraCompletati?: boolean;
  assegnazioni: { tipo: string; riferimento_id: string; farm_id: string; id: string; completato: boolean }[];
  onToggleCompletamento?: (assegnazioneId: string, completato: boolean) => void;
  onRimuoviAssegnazione?: (assegnazioneId: string) => void;
  onNavigaAIncarico?: (incaricoId: string) => void;
  onNavigaAIncaricoCitta?: (incaricoId: string) => void;
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
 * Componente per visualizzare la lista dei cesti in formato compatto
 */
export const ListaCesti: React.FC<ListaCestiProps> = ({
  cesti,
  incarichi,
  incarichiCitta = [],
  getTranslatedName,
  getQuantitaIncaricoCesto,
  calcolaConteggiCesto,
  onAssegnaCesto,
  searchQuery,
  mostraCompletati = false,
  assegnazioni,
  onToggleCompletamento,
  onRimuoviAssegnazione,
  onNavigaAIncarico,
  onNavigaAIncaricoCitta,
  elementoEvidenziato,
  derbySelezionatoId = "",
  ordinamentoLivello = true,
  ordinamentoAlfabetico = false,
  ordinamentoInverso = false,
}) => {
  // Stato per i conteggi dei cesti
  const [conteggiCesti, setConteggiCesti] = useState<Record<string, ConteggioAssegnazioni>>({});
  // Stato per il menu contestuale
  const [menuAnchorEl, setMenuAnchorEl] = useState<{ el: HTMLElement | null; id: string | null }>({
    el: null,
    id: null,
  });
  // Stato per il dialogo di selezione della farm
  const [dialogoAperto, setDialogoAperto] = useState(false);
  const [cestoSelezionato, setCestoSelezionato] = useState<{ id: string; nome: string; livelloMinimo: number } | null>(null);
  // Stato per il pulsante "torna in alto"
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Effect per ripristinare la posizione del cesto evidenziato
  useEffect(() => {
    if (elementoEvidenziato && elementoEvidenziato.tipo === 'cesto') {
      const elementId = `cesto-${elementoEvidenziato.id}`;
      setTimeout(() => {
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Salva la posizione di scorrimento nel localStorage
          localStorage.setItem("cestiScrollPosition", String(window.scrollY));
        }
      }, 100);
    }
  }, [elementoEvidenziato]);
  
  // Effect per salvare la posizione di scorrimento quando si scorre nella lista cesti
  useEffect(() => {
    const handleScroll = () => {
      localStorage.setItem("cestiScrollPosition", String(window.scrollY));
      
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

  // Funzione per aprire il menu contestuale
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, cestoId: string) => {
    event.stopPropagation();
    setMenuAnchorEl({ el: event.currentTarget, id: cestoId });
  };

  // Funzione per chiudere il menu contestuale
  const handleMenuClose = () => {
    setMenuAnchorEl({ el: null, id: null });
  };

  // Funzione per aprire il dialogo di selezione della farm
  const handleApriDialogo = (cestoId: string) => {
    const cesto = cesti.find(c => c.id === cestoId);
    if (cesto) {
      // Trova le farm già assegnate a questo cesto
      const farmIdsGiaAssegnate = assegnazioni
        .filter(a => a.tipo === "cesto" && a.riferimento_id === cestoId)
        .map(a => a.farm_id);
      
      // Calcola il livello minimo del cesto (il livello più alto tra gli incarichi contenuti)
      let livelloMinimo = 0;
      cesto.incarichi.forEach(incaricoInCesto => {
        const incarico = incarichi.find(i => i.id === incaricoInCesto.incarico_id);
        if (incarico && incarico.livello_minimo > livelloMinimo) {
          livelloMinimo = incarico.livello_minimo;
        }
      });
      
      setCestoSelezionato({ 
        id: cesto.id, 
        nome: cesto.nome,
        livelloMinimo
      });
      setDialogoAperto(true);
    }
    handleMenuClose();
  };

  // Funzione per chiudere il dialogo di selezione della farm
  const handleChiudiDialogo = () => {
    setDialogoAperto(false);
    setCestoSelezionato(null);
  };

  // Funzione per gestire l'assegnazione del cesto
  const handleAssegna = (farmIds: string[]) => {
    if (cestoSelezionato && farmIds.length > 0) {
      // Ora farmIds è un array di ID individuali, chiama onAssegnaCesto per ogni ID
      for (const farmId of farmIds) {
        onAssegnaCesto(cestoSelezionato.id, farmId);
      }
      
      setDialogoAperto(false);
      setCestoSelezionato(null);
    }
  };

  // Funzione per gestire la rimozione di un'assegnazione
  const handleRimuoviAssegnazione = (assegnazioneId: string) => {
    // Chiudi il dialogo se è aperto
    if (dialogoAperto) {
      setDialogoAperto(false);
      setCestoSelezionato(null);
    }
    
    // Chiama la funzione di rimozione passata come prop
    if (onRimuoviAssegnazione) {
      onRimuoviAssegnazione(assegnazioneId);
    }
  };

  // Converti elementoEvidenziato in un formato compatibile con CestoCard
  const elementoEvidenziatoCompatibile = elementoEvidenziato ? {
    tipo: elementoEvidenziato.tipo,
    id: elementoEvidenziato.id
  } : undefined;

  // Funzione per ottenere i conteggi di un cesto
  const getConteggiCesto = async (cestoId: string) => {
    if (conteggiCesti[cestoId]) {
      return conteggiCesti[cestoId];
    }

    try {
      const conteggi = await calcolaConteggiCesto(cestoId);
      setConteggiCesti((prev) => ({
        ...prev,
        [cestoId]: conteggi,
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

  // Filtra i cesti in base alla query di ricerca
  const filteredCesti = cesti.filter((cesto) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      cesto.nome.toLowerCase().includes(searchLower) ||
      cesto.incarichi.some((inc) => {
        const incarico = incarichi.find((i) => i.id === inc.incarico_id) ||
          incarichiCitta.find((i) => i.id === inc.incarico_id);
        return incarico && getTranslatedName(incarico.nome).toLowerCase().includes(searchLower);
      })
    );
  });

  // Ordina i cesti in base ai criteri di ordinamento
  const cestiOrdinati = useMemo(() => {
    return [...filteredCesti].sort((a, b) => {
      let comparazione = 0;
      
      if (ordinamentoLivello) {
        // Trova il livello massimo tra gli incarichi del cesto
        const livelloA = a.incarichi.reduce((max, inc) => {
          const incarico = incarichi.find(i => i.id === inc.incarico_id) || 
                          incarichiCitta.find(i => i.id === inc.incarico_id);
          return incarico && incarico.livello_minimo > max ? incarico.livello_minimo : max;
        }, 0);
        
        const livelloB = b.incarichi.reduce((max, inc) => {
          const incarico = incarichi.find(i => i.id === inc.incarico_id) || 
                          incarichiCitta.find(i => i.id === inc.incarico_id);
          return incarico && incarico.livello_minimo > max ? incarico.livello_minimo : max;
        }, 0);
        
        comparazione = livelloA - livelloB;
      } else if (ordinamentoAlfabetico) {
        // Ordina alfabeticamente
        comparazione = a.nome.localeCompare(b.nome);
      }
      
      // Inverti l'ordine se necessario
      return ordinamentoInverso ? -comparazione : comparazione;
    });
  }, [filteredCesti, incarichi, incarichiCitta, ordinamentoLivello, ordinamentoAlfabetico, ordinamentoInverso]);

  // Funzione per scorrere in cima alla lista
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Intestazione */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>Cesti</Typography>
      </Box>

      {/* Lista dei cesti */}
      {cestiOrdinati.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Nessun cesto trovato
        </Typography>
      ) : (
        <Box sx={{ pb: 4 }}>
          {cestiOrdinati.map((cesto) => (
            <CestoCard
              key={cesto.id}
              cesto={cesto}
              incarichi={incarichi}
              incarichiCitta={incarichiCitta}
              conteggi={conteggiCesti[cesto.id] || {
                totaleAttive: 0,
                totaleInattive: 0,
                completateAttive: 0,
                completateInattive: 0,
                completateSenzaAssegnazioneAttive: 0,
                completateSenzaAssegnazioneInattive: 0,
              }}
              getTranslatedName={getTranslatedName}
              getQuantitaIncaricoCesto={(cestoId, incaricoId) => getQuantitaIncaricoCesto(cestoId, incaricoId)}
              onAssegna={handleApriDialogo}
              mostraCompletati={mostraCompletati}
              assegnazioni={assegnazioni}
              onToggleCompletamento={onToggleCompletamento}
              onRimuoviAssegnazione={handleRimuoviAssegnazione}
              onNavigaAIncarico={onNavigaAIncarico}
              onNavigaAIncaricoCitta={onNavigaAIncaricoCitta}
              elementoEvidenziato={elementoEvidenziatoCompatibile}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 'medium', 
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                  mb: 1
                }}
              >
                {cesto.nome}
              </Typography>
            </CestoCard>
          ))}
        </Box>
      )}
      
      {/* Menu contestuale per le azioni sui cesti */}
      <Menu
        id="cesto-menu"
        anchorEl={menuAnchorEl.el}
        open={Boolean(menuAnchorEl.el)}
        onClose={handleMenuClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <MenuItem onClick={() => menuAnchorEl.id && handleApriDialogo(menuAnchorEl.id)}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Assegna</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialogo di selezione della farm */}
      {cestoSelezionato && (
        <DialogoSelezioneFarm
          open={dialogoAperto}
          onClose={handleChiudiDialogo}
          onConfirm={handleAssegna}
          tipoAssegnazione="cesto"
          riferimentoId={cestoSelezionato.id}
          riferimentoNome={cestoSelezionato.nome}
          livelloMinimo={cestoSelezionato.livelloMinimo}
          farmIdsGiaAssegnate={assegnazioni
            .filter(a => 
              a.tipo === "cesto" && 
              a.riferimento_id === cestoSelezionato.id &&
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