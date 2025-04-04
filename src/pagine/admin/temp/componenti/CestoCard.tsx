import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Paper,
  Chip,
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Badge,
  Divider,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { Cesto, IncaricoInCesto } from "../../../../tipi/cesto";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";
import { ContatoriAssegnazioni } from "./ContatoriAssegnazioni";

interface CestoCardProps {
  cesto: Cesto;
  incarichi: Incarico[];
  incarichiCitta?: IncaricoCitta[];
  conteggi: ConteggioAssegnazioni;
  getTranslatedName: (nome: string) => string;
  getQuantitaIncaricoCesto: (cestoId: string, incaricoId: string) => number;
  onAssegna: (cestoId: string) => void;
  mostraCompletati?: boolean;
  assegnazioni?: { 
    id: string; 
    farm_id: string; 
    tipo: string; 
    riferimento_id: string; 
    completato: boolean;
    farm_nome?: string;
    giocatore_nome?: string;
    livello_farm?: number;
    quantita?: number;
  }[];
  onToggleCompletamento?: (assegnazioneId: string, completato: boolean) => void;
  onRimuoviAssegnazione?: (assegnazioneId: string) => void;
  onNavigaAIncarico?: (incaricoId: string) => void;
  onNavigaAIncaricoCitta?: (incaricoId: string) => void;
  evidenziato?: boolean;
  elementoEvidenziato?: { tipo: string; id: string };
}

/**
 * Componente per visualizzare un cesto
 */
export const CestoCard: React.FC<CestoCardProps> = ({
  cesto,
  incarichi,
  incarichiCitta = [],
  conteggi,
  getTranslatedName,
  getQuantitaIncaricoCesto,
  onAssegna,
  mostraCompletati = false,
  assegnazioni = [],
  onToggleCompletamento,
  onRimuoviAssegnazione,
  onNavigaAIncarico,
  onNavigaAIncaricoCitta,
  evidenziato = false,
  elementoEvidenziato,
}) => {
  // Stato per l'espansione delle farm assegnate
  const [farmExpanded, setFarmExpanded] = useState(() => {
    try {
      const expandedFarmsCesti = localStorage.getItem("expandedFarmsCesti");
      if (expandedFarmsCesti) {
        const expandedIds = JSON.parse(expandedFarmsCesti);
        return expandedIds.includes(cesto.id);
      }
      return false;
    } catch {
      return false;
    }
  });

  // Salva lo stato di espansione delle farm del cesto nel localStorage
  useEffect(() => {
    try {
      const expandedFarmsCesti = localStorage.getItem("expandedFarmsCesti");
      let expandedIds = expandedFarmsCesti ? JSON.parse(expandedFarmsCesti) : [];
      
      if (farmExpanded && !expandedIds.includes(cesto.id)) {
        expandedIds.push(cesto.id);
      } else if (!farmExpanded && expandedIds.includes(cesto.id)) {
        expandedIds = expandedIds.filter((id: string) => id !== cesto.id);
      }
      
      localStorage.setItem("expandedFarmsCesti", JSON.stringify(expandedIds));
    } catch (error) {
      console.error("Errore nel salvataggio delle farm espanse dei cesti:", error);
    }
  }, [farmExpanded, cesto.id]);

  // Filtra le assegnazioni per questo cesto
  const cestoAssegnazioni = assegnazioni.filter(
    (a) => a.tipo === "cesto" && a.riferimento_id === cesto.id
  );

  // Funzione per gestire l'assegnazione del cesto
  const handleAssegna = (event: React.MouseEvent) => {
    event.stopPropagation();
    onAssegna(cesto.id);
  };
  
  // Funzione per gestire l'espansione/compressione delle farm assegnate
  const handleToggleFarmExpanded = () => {
    setFarmExpanded(!farmExpanded);
  };
  
  // Funzione per gestire la rimozione di un'assegnazione
  const handleRimuoviAssegnazione = (assegnazioneId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onRimuoviAssegnazione) {
      onRimuoviAssegnazione(assegnazioneId);
    }
  };

  // Calcola il livello massimo degli incarichi nel cesto
  const livelloMassimo = cesto.incarichi.reduce((max: number, incaricoInCesto: IncaricoInCesto) => {
    // Cerca prima negli incarichi normali
    let incarico: Incarico | IncaricoCitta | undefined = incarichi.find(i => i.id === incaricoInCesto.incarico_id);
    
    // Se non trovato, cerca negli incarichi città
    if (!incarico && incarichiCitta) {
      incarico = incarichiCitta.find(i => i.id === incaricoInCesto.incarico_id);
    }
    
    return incarico && incarico.livello_minimo > max ? incarico.livello_minimo : max;
  }, 0);

  // Raggruppa le assegnazioni per giocatore
  const assegnazioniPerGiocatore = cestoAssegnazioni.reduce((acc, assegnazione) => {
    const giocatoreId = assegnazione.farm_id.split('_')[0];
    const giocatoreNome = assegnazione.giocatore_nome || `Giocatore ${giocatoreId}`;
    
    if (!acc[giocatoreNome]) {
      acc[giocatoreNome] = [];
    }
    
    acc[giocatoreNome].push(assegnazione);
    return acc;
  }, {} as Record<string, typeof cestoAssegnazioni>);

  // Calcola il minimo delle quantità degli incarichi per una farm
  const calcolaQuantitaCesto = (farmId: string) => {
    // Trova tutte le assegnazioni di incarichi per questa farm
    const assegnazioniIncarichi = assegnazioni.filter(a => 
      a.tipo === "incarico" && 
      a.farm_id === farmId
    );
    
    // Mappa per tenere traccia delle volte che ogni incarico può essere completato
    const completamentiPerIncarico: number[] = [];
    
    // Per ogni incarico nel cesto
    for (const incaricoInCesto of cesto.incarichi) {
      // Trova l'assegnazione di questo incarico per questa farm
      const assegnazioneIncarico = assegnazioniIncarichi.find(a => 
        a.riferimento_id === incaricoInCesto.incarico_id
      );
      
      // Se l'incarico è assegnato e ha una quantità
      if (assegnazioneIncarico?.quantita !== undefined && assegnazioneIncarico.quantita > 0) {
        // Calcola quante volte questo incarico può essere completato
        // dividendo la quantità disponibile per la quantità richiesta
        const quantitaRichiesta = incaricoInCesto.quantita || 1;
        const quantitaDisponibile = assegnazioneIncarico.quantita;
        const completamenti = Math.floor(quantitaDisponibile / quantitaRichiesta);
        
        // Aggiungi il numero di completamenti possibili alla lista
        completamentiPerIncarico.push(completamenti);
      } else {
        // Se un incarico non è assegnato o ha quantità 0, il cesto non può essere completato
        return 0;
      }
    }
    
    // Se non tutti gli incarichi sono stati considerati, restituisci 0
    if (completamentiPerIncarico.length < cesto.incarichi.length) {
      return 0;
    }
    
    // Il numero di volte che il cesto può essere completato è il minimo
    // di quante volte ogni singolo incarico può essere completato
    return Math.min(...completamentiPerIncarico);
  };

  return (
    <Paper
      elevation={1}
      sx={{
        mb: 1,
        borderRadius: 1,
        bgcolor: evidenziato || (elementoEvidenziato?.tipo === 'cesto' && elementoEvidenziato.id === cesto.id) 
          ? 'rgba(255, 235, 59, 0.2)' 
          : 'inherit',
        transition: 'background-color 0.3s ease',
        p: 0,
        overflow: 'hidden'
      }}
      id={`cesto-${cesto.id}`}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center',
          position: 'relative',
          pl: 3,
          minHeight: 48,
          cursor: 'pointer',
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)'
          }
        }}
        onClick={handleToggleFarmExpanded}
      >
        {/* Strisciolina del livello */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '24px',
            bgcolor: 'rgb(33, 150, 243, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography 
            sx={{ 
              fontSize: '0.75rem',
              fontStyle: 'italic',
              color: 'rgb(33, 150, 243)',
              width: '3ch',
              textAlign: 'center'
            }}
          >
            {livelloMassimo}
          </Typography>
        </Box>

        {/* Contenuto principale */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          p: 1
        }}>
          {/* Immagini incarichi con quantità */}
          <Box sx={{ display: 'flex', gap: 0.5, mr: 2 }}>
            {cesto.incarichi.map(({ incarico_id, quantita }) => {
              // Cerca prima negli incarichi normali
              let incarico: Incarico | IncaricoCitta | undefined = incarichi.find(i => i.id === incarico_id);
              let isIncaricoCitta = false;
              
              // Se non trovato, cerca negli incarichi città
              if (!incarico && incarichiCitta) {
                const incaricoCity = incarichiCitta.find(i => i.id === incarico_id);
                if (incaricoCity) {
                  incarico = incaricoCity;
                  isIncaricoCitta = true;
                }
              }
              
              if (!incarico) return null;
              
              const quantitaEffettiva = getQuantitaIncaricoCesto(cesto.id, incarico_id);
              
              return (
                <Box key={incarico_id} sx={{ position: 'relative' }}>
                  <Avatar
                    src={incarico.immagine}
                    variant="rounded"
                    sx={{ 
                      width: 32, 
                      height: 32,
                      cursor: 'pointer' 
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isIncaricoCitta && onNavigaAIncaricoCitta) {
                        onNavigaAIncaricoCitta(incarico_id);
                      } else if (!isIncaricoCitta && onNavigaAIncarico) {
                        onNavigaAIncarico(incarico_id);
                      }
                    }}
                  >
                    {incarico.nome.charAt(0)}
                  </Avatar>
                  <Typography
                    variant="caption"
                    sx={{ 
                      position: 'absolute',
                      bottom: -8,
                      right: -8,
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    x{quantitaEffettiva}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          {/* Nome cesto */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexGrow: 1
          }}>
            <Typography
              variant="body2"
              sx={{ 
                wordBreak: 'break-word',
                lineHeight: 1.1,
                fontSize: '0.875rem'
              }}
            >
              {cesto.nome}
            </Typography>

            {/* Badge con contatore assegnazioni (nella riga con il nome) */}
            {cestoAssegnazioni.length > 0 && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 1 }}>
                <Badge
                  badgeContent={cestoAssegnazioni.length}
                  color="primary"
                  sx={{ transform: 'scale(1.1)' }}
                >
                  <Box sx={{ width: 16, height: 16 }} />
                </Badge>
              </Box>
            )}
            
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>              
              {/* Contatori */}
              <ContatoriAssegnazioni
                conteggi={conteggi}
                mostraCompletati={mostraCompletati}
              />

              {/* Pulsante Assegna diretto */}
              <Tooltip title="Assegna">
                <IconButton
                  size="small"
                  onClick={handleAssegna}
                  color="primary"
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Lista delle farm assegnate (espandibile) */}
      <Collapse in={farmExpanded} timeout="auto" unmountOnExit>
        <Box sx={{ bgcolor: '#f5f5f5', py: 1 }}>
          {Object.entries(assegnazioniPerGiocatore).map(([giocatoreNome, assegnazioniGiocatore]) => (
            <Box key={giocatoreNome} sx={{ mb: 1 }}>
              {/* Nome giocatore */}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold', 
                  px: 2,
                  mb: 0.5
                }}
              >
                {giocatoreNome}
              </Typography>
              
              {/* Farm del giocatore */}
              {assegnazioniGiocatore.map(assegnazione => {
                // Calcola la quantità per questa farm
                const quantitaCesto = calcolaQuantitaCesto(assegnazione.farm_id);
                
                return (
                  <Box 
                    key={assegnazione.id}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      px: 2,
                      py: 0.5,
                      position: 'relative',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    {/* Chip livello farm */}
                    <Box 
                      sx={{ 
                        width: 30, 
                        height: 20, 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        mr: 1,
                        bgcolor: 'rgb(33, 150, 243, 0.1)',
                        color: 'rgb(33, 150, 243)',
                        borderRadius: '16px',
                        fontSize: '0.75rem',
                        fontStyle: 'italic'
                      }}
                    >
                      {assegnazione.livello_farm !== undefined && assegnazione.livello_farm !== null ? assegnazione.livello_farm : '?'}
                    </Box>
                    
                    {/* Nome farm */}
                    <Typography variant="body2">
                      {assegnazione.farm_nome || `Farm ${assegnazione.farm_id.split('_')[1] || ''}`}
                    </Typography>
                    
                    {/* Conteggio produzioni */}
                    {quantitaCesto > 0 && (
                      <Typography
                        variant="caption"
                        sx={{ 
                          ml: 1,
                          color: 'success.main',
                          fontWeight: 'bold'
                        }}
                      >
                        x{quantitaCesto}
                      </Typography>
                    )}
                    
                    {/* Pulsante per rimuovere l'assegnazione */}
                    {onRimuoviAssegnazione && (
                      <IconButton
                        size="small"
                        sx={{ 
                          position: 'absolute',
                          right: 8,
                          p: 0.5,
                          color: 'error.main'
                        }}
                        onClick={(e) => handleRimuoviAssegnazione(assegnazione.id, e)}
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
          
          {/* Messaggio se non ci sono assegnazioni */}
          {cestoAssegnazioni.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
              Nessuna farm assegnata
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}; 