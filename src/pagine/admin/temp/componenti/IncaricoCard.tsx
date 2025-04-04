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
  Collapse,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Chip,
  Badge,
  Divider,
  Card,
  useTheme,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import { Incarico, IncaricoCitta } from "../../../../tipi/incarico";
import { ConteggioAssegnazioni } from "../../../../tipi/assegnazione";
import { ContatoriAssegnazioni } from "./ContatoriAssegnazioni";

interface IncaricoCardProps {
  incarico: Incarico | IncaricoCitta;
  conteggi: ConteggioAssegnazioni;
  getTranslatedName: (nome: string) => string;
  getQuantitaIncarico: (incarico: Incarico | IncaricoCitta) => number;
  onAssegna: (incaricoId: string, nome: string, livelloMinimo: number) => void;
  mostraCompletati?: boolean;
  isCittaIncarico?: boolean;
  assegnazioni?: { 
    id: string; 
    farm_id: string; 
    tipo: string; 
    riferimento_id: string; 
    completato: boolean;
    quantita?: number;
    farm_nome?: string;
    giocatore_nome?: string;
    livello_farm?: number;
    stato?: string;
  }[];
  onToggleCompletamento?: (assegnazioneId: string, completato: boolean) => void;
  onRimuoviAssegnazione?: (assegnazioneId: string) => void;
  cestoContenente?: { id: string; nome: string } | null;
  onNavigaACesto?: (cestoId: string) => void;
  evidenziato?: boolean;
  quantitaNelCesto?: number;
  isInPreset?: boolean;
}

/**
 * Componente per visualizzare un incarico (standard o città)
 */
export const IncaricoCard: React.FC<IncaricoCardProps> = ({
  incarico,
  conteggi,
  getTranslatedName,
  getQuantitaIncarico,
  onAssegna,
  mostraCompletati = false,
  isCittaIncarico = false,
  assegnazioni = [],
  onToggleCompletamento,
  onRimuoviAssegnazione,
  cestoContenente,
  onNavigaACesto,
  evidenziato = false,
  quantitaNelCesto,
  isInPreset = false,
}) => {
  const theme = useTheme();

  // Stato per il menu contestuale
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Stato per l'espansione delle farm assegnate
  const [farmExpanded, setFarmExpanded] = useState(() => {
    try {
      // Recupera lo stato di espansione dal localStorage
      const expandedIncarichi = localStorage.getItem("expandedIncarichi");
      if (expandedIncarichi) {
        const expandedIds = JSON.parse(expandedIncarichi);
        return expandedIds.includes(incarico.id);
      }
      return false;
    } catch {
      return false;
    }
  });

  // Salva lo stato di espansione nel localStorage
  useEffect(() => {
    try {
      // Recupera lo stato attuale dal localStorage
      const expandedIncarichi = localStorage.getItem("expandedIncarichi");
      let expandedIds = expandedIncarichi ? JSON.parse(expandedIncarichi) : [];
      
      // Aggiorna l'array in base allo stato corrente
      if (farmExpanded && !expandedIds.includes(incarico.id)) {
        expandedIds.push(incarico.id);
      } else if (!farmExpanded && expandedIds.includes(incarico.id)) {
        expandedIds = expandedIds.filter((id: string) => id !== incarico.id);
      }
      
      // Salva l'array aggiornato
      localStorage.setItem("expandedIncarichi", JSON.stringify(expandedIds));
    } catch (error) {
      console.error("Errore nel salvataggio degli incarichi espansi:", error);
    }
  }, [farmExpanded, incarico.id]);

  // Filtra le assegnazioni per questo incarico
  const incaricoAssegnazioni = assegnazioni.filter(
    (a) => a.tipo === "incarico" && a.riferimento_id === incarico.id
  );

  // Funzione per aprire il menu contestuale
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Funzione per chiudere il menu contestuale
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Funzione per gestire l'assegnazione dell'incarico
  const handleAssegna = () => {
    const nomeIncarico = getTranslatedName(incarico.nome);
    const livelloMinimo = incarico.livello_minimo || 0;
    onAssegna(incarico.id, nomeIncarico, livelloMinimo);
    handleClose();
  };

  // Funzione per gestire l'espansione/compressione delle farm assegnate
  const handleToggleFarmExpanded = (event: React.MouseEvent) => {
    event.stopPropagation(); // Impedisce che il click si propaghi alla sezione genitore
    setFarmExpanded(!farmExpanded);
  };

  // Funzione per gestire il toggle del completamento
  const handleToggleCompletamento = (assegnazioneId: string, completato: boolean) => {
    if (onToggleCompletamento) {
      onToggleCompletamento(assegnazioneId, completato);
    }
  };

  // Funzione per gestire la rimozione di un'assegnazione
  const handleRimuoviAssegnazione = (assegnazioneId: string) => {
    if (onRimuoviAssegnazione) {
      onRimuoviAssegnazione(assegnazioneId);
    }
  };

  // Calcola la quantità dell'incarico
  const quantita = getQuantitaIncarico(incarico);

  return (
    <Card 
      sx={{ 
        mb: 1, 
        borderRadius: 1, 
        overflow: 'visible',
        border: evidenziato ? `2px solid ${theme.palette.warning.main}` : (isInPreset ? `2px solid ${theme.palette.primary.main}` : 'none'),
        boxShadow: evidenziato ? '0 0 8px rgba(255, 152, 0, 0.6)' : (isInPreset ? '0 0 4px rgba(25, 118, 210, 0.4)' : theme.shadows[1]),
        position: 'relative',
      }}
    >
      {isInPreset && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '0.75rem',
            zIndex: 1,
          }}
        >
          <PlaylistPlayIcon fontSize="small" />
        </Box>
      )}

      {/* Riga principale dell'incarico con la strisciolina */}
      <Box 
        sx={{ 
          p: 1,
          position: 'relative',
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          width: '100%', 
          overflow: 'hidden',
          minHeight: '60px',
          cursor: 'pointer', // Aggiunto cursore pointer per indicare che è cliccabile
          '&:hover': {
            bgcolor: 'rgba(0, 0, 0, 0.04)', // Effetto hover
          },
        }}
        onClick={handleToggleFarmExpanded} // Rende l'intera riga cliccabile
      >
        {/* Strisciolina azzurra con livello */}
        <Box 
          sx={{ 
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '24px',
            bgcolor: 'rgb(33, 150, 243, 0.1)',
            zIndex: 1,
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
              textAlign: 'center',
              zIndex: 2
            }}
          >
            {incarico.livello_minimo || 0}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, overflow: 'hidden', flexGrow: 1, pl: 3 }}>
          {/* Immagine dell'incarico e quantità */}
          <Box sx={{ display: "flex", alignItems: "center", position: "relative", flexShrink: 0, mr: 1 }}>
            {incarico.immagine ? (
              <Box
                component="img"
                src={incarico.immagine}
                alt={incarico.nome}
                sx={{ width: 40, height: 40, borderRadius: 1 }}
              />
            ) : (
              <Box
                sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 1,
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.25rem'
                }}
              >
                {getTranslatedName(incarico.nome).charAt(0).toUpperCase()}
              </Box>
            )}
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: -5,
                right: -5,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
                px: 0.5,
                py: 0.1,
                fontSize: "0.75rem",
                zIndex: 2
              }}
            >
              x{quantita}
            </Typography>
          </Box>

          {/* Informazioni sull'incarico */}
          <Box sx={{ minWidth: 0, overflow: 'hidden', flexGrow: 1 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 0.5, 
              overflow: 'hidden',
              minHeight: '44px',
              height: '100%'
            }}>
              <Typography variant="body1" sx={{ 
                fontWeight: "medium", 
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.2,
                wordBreak: 'break-word'
              }}>
                {getTranslatedName(incarico.nome)}
              </Typography>
              
              {/* Chip per il cesto contenente */}
              {cestoContenente && onNavigaACesto && (
                <Chip
                  size="small"
                  label={`${cestoContenente.nome} x${typeof quantitaNelCesto === 'number' ? quantitaNelCesto : quantita}`}
                  onClick={(e) => {
                    e.stopPropagation(); // Evita che il click sul chip espanda l'incarico
                    onNavigaACesto(cestoContenente.id);
                  }}
                  sx={{ 
                    height: 20, 
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(121, 85, 72, 0.1)', // Colore marrone chiaro per ricordare il cesto in vimini
                    color: '#795548', // Marrone
                    borderColor: '#795548',
                    border: '1px solid',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'rgba(121, 85, 72, 0.2)',
                    },
                    alignSelf: 'flex-start',
                    flexShrink: 0,
                    mt: 0
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Contatori e menu */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, ml: 1 }}>
          {/* Badge per le farm assegnate - ora come IconButton */}
          {incaricoAssegnazioni.length > 0 && (
            <Tooltip title={farmExpanded ? "Nascondi farm assegnate" : "Mostra farm assegnate"}>
              <IconButton
                size="small"
                sx={{ position: 'relative' }}
              >
                <div style={{ width: 20, height: 20 }} />
                <Box
                  sx={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}
                >
                  {incaricoAssegnazioni.length}
                </Box>
              </IconButton>
            </Tooltip>
          )}

          {/* Contatori */}
          <ContatoriAssegnazioni
            conteggi={conteggi}
            mostraCompletati={mostraCompletati}
          />

          {/* Pulsante Assegna diretto */}
          <Tooltip title="Assegna">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Previene che il click si propaghi alla riga
                handleAssegna();
              }}
              color="primary"
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Lista delle farm assegnate (espandibile) - ora separata dalla riga principale */}
      <Collapse in={farmExpanded} timeout="auto" unmountOnExit>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ p: 1, pl: 3 }}>
          {incaricoAssegnazioni.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Nessuna farm assegnata
            </Typography>
          ) : (
            <>
              {/* Raggruppa le assegnazioni per giocatore */}
              {(() => {
                // Raggruppa le assegnazioni per giocatore_id
                const assegnazioniPerGiocatore: Record<string, typeof incaricoAssegnazioni> = {};
                
                incaricoAssegnazioni.forEach(assegnazione => {
                  const giocatoreId = assegnazione.farm_id.split('_')[0];
                  if (!assegnazioniPerGiocatore[giocatoreId]) {
                    assegnazioniPerGiocatore[giocatoreId] = [];
                  }
                  assegnazioniPerGiocatore[giocatoreId].push(assegnazione);
                });
                
                return Object.entries(assegnazioniPerGiocatore).map(([giocatoreId, assegnazioniGiocatore]) => {
                  // Ordina le assegnazioni: prima per stato (attive prima delle inattive), poi per livello (dal più alto al più basso)
                  const assegnazioniOrdinate = [...assegnazioniGiocatore].sort((a, b) => {
                    // Prima ordina per stato (attive prima delle inattive)
                    const statoA = a.stato === "attivo" ? 0 : 1;
                    const statoB = b.stato === "attivo" ? 0 : 1;
                    
                    if (statoA !== statoB) {
                      return statoA - statoB;
                    }
                    
                    // Poi ordina per livello (dal più alto al più basso)
                    const livelloA = a.livello_farm !== undefined && a.livello_farm !== null ? a.livello_farm : 0;
                    const livelloB = b.livello_farm !== undefined && b.livello_farm !== null ? b.livello_farm : 0;
                    return livelloB - livelloA; // Ordine decrescente (dal più alto al più basso)
                  });
                  
                  // Prendi il nome del giocatore dalla prima assegnazione
                  const giocatoreNome = assegnazioniGiocatore[0].giocatore_nome || `Giocatore ${giocatoreId}`;
                  
                  return (
                    <Box key={giocatoreId} sx={{ mb: 2 }}>
                      {/* Nome del giocatore */}
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          mb: 0.5,
                          pb: 0.5,
                          borderBottom: '1px dashed rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {giocatoreNome}
                      </Typography>
                      
                      {/* Lista delle farm del giocatore */}
                      <List dense disablePadding>
                        {assegnazioniOrdinate.map((assegnazione) => (
                          <ListItem
                            key={assegnazione.id}
                            sx={{
                              bgcolor: "background.paper",
                              borderRadius: 1,
                              mb: 0.5,
                              py: 0.5,
                              pl: 1, // Ridotto il padding a sinistra
                              pr: 8, // Aggiungo padding a destra per dare spazio alle azioni
                              height: '36px', // Altezza fissa per garantire allineamento
                              position: 'relative' // Necessario per posizionamento assoluto dei figli
                            }}
                            secondaryAction={null} // Rimuovo l'azione secondaria standard
                          >
                            <ListItemText
                              sx={{ m: 0 }} // Rimuovo margini per controllo preciso
                              primary={
                                <Box sx={{ 
                                  fontWeight: assegnazione.completato ? 'bold' : 'normal', 
                                  display: 'flex', 
                                  alignItems: 'center',
                                  height: '100%', // Occupa tutta l'altezza disponibile
                                  fontSize: '0.875rem', // Mantengo la dimensione del carattere di body2
                                  lineHeight: 1.43 // Mantengo il line-height di body2
                                }}>
                                  <Avatar 
                                    sx={{ 
                                      width: 24, 
                                      height: 24, 
                                      fontSize: '0.75rem',
                                      mr: 1,
                                      bgcolor: assegnazione.stato === "inattivo" ? 'rgba(158, 158, 158, 0.1)' : 'rgb(33, 150, 243, 0.1)',
                                      color: assegnazione.stato === "inattivo" ? 'rgb(158, 158, 158)' : 'rgb(33, 150, 243)',
                                      fontWeight: 'normal',
                                      fontStyle: 'italic',
                                      opacity: assegnazione.stato === "inattivo" ? 0.7 : 1
                                    }}
                                  >
                                    {assegnazione.livello_farm !== undefined && assegnazione.livello_farm !== null ? assegnazione.livello_farm : '50'}
                                  </Avatar>
                                  <Box 
                                    component="span" 
                                    sx={{ 
                                      color: assegnazione.stato === "inattivo" ? 'text.disabled' : 'inherit',
                                      textDecoration: assegnazione.stato === "inattivo" ? 'none' : 'inherit'
                                    }}
                                  >
                                    {assegnazione.farm_nome || `Farm ${assegnazione.farm_id.split('_')[1] || ''}`}
                                  </Box>
                                </Box>
                              }
                            />
                            
                            {/* Azioni secondarie posizionate in modo assoluto */}
                            <Box 
                              sx={{ 
                                display: "flex", 
                                gap: 0.5, 
                                alignItems: 'center', 
                                position: 'absolute', 
                                right: 8,
                                top: '50%',
                                transform: 'translateY(-50%)' // Centra verticalmente
                              }}
                            >
                              {/* Mostro il quantitativo al posto del pulsante di completamento */}
                              {assegnazione.quantita !== undefined && assegnazione.quantita > 0 && (
                                <Tooltip title={`Quantità prodotta: ${assegnazione.quantita}`}>
                                  <Box 
                                    component="span"
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      fontWeight: 'bold',
                                      color: assegnazione.completato ? 'success.main' : 'primary.main',
                                      display: 'inline-block',
                                      width: '40px',
                                      textAlign: 'right'
                                    }}
                                  >
                                    x{assegnazione.quantita}
                                  </Box>
                                </Tooltip>
                              )}
                              {onRimuoviAssegnazione && (
                                <Tooltip title="Rimuovi assegnazione">
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => handleRimuoviAssegnazione(assegnazione.id)}
                                    sx={{ 
                                      ml: 1,
                                      p: 0.5 // Padding ridotto per allineamento migliore
                                    }}
                                  >
                                    <CancelIcon fontSize="small" color="error" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  );
                });
              })()}
            </>
          )}
        </Box>
      </Collapse>
    </Card>
  );
}; 