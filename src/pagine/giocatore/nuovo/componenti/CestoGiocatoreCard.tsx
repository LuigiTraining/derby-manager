import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Checkbox,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Collapse,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Avatar,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import { styled } from "@mui/material/styles";
import { Cesto, IncaricoInCesto } from "../../../../tipi/cesto";
import { Incarico } from "../../../../tipi/incarico";
import { useTranslation } from "react-i18next";

// Estensione dell'interfaccia IncaricoInCesto per aggiungere la proprietà completato
interface IncaricoInCestoConCompletamento extends IncaricoInCesto {
  completato?: boolean;
}

// Interfaccia per le props del componente
interface CestoGiocatoreCardProps {
  cesto: Cesto;
  incarichi: Incarico[];
  progresso: number;
  onToggleCompletamento: (incaricoId: string, completato: boolean) => void;
  onNavigateToIncarico?: (incaricoId: string) => void;
  evidenziato?: boolean;
  onEvidenziazioneFine?: () => void;
}

export default function CestoGiocatoreCard({
  cesto,
  incarichi,
  progresso,
  onToggleCompletamento,
  onNavigateToIncarico,
  evidenziato = false,
  onEvidenziazioneFine,
}: CestoGiocatoreCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  
  // Effetto per gestire l'evidenziazione temporanea
  React.useEffect(() => {
    if (evidenziato) {
      const timer = setTimeout(() => {
        if (onEvidenziazioneFine) {
          onEvidenziazioneFine();
        }
      }, 3000); // Durata dell'evidenziazione: 3 secondi
      
      return () => clearTimeout(timer);
    }
  }, [evidenziato, onEvidenziazioneFine]);

  // Gestione dell'espansione della card
  const handleCardClick = () => {
    setExpanded(!expanded);
  };

  // Funzione per tradurre i nomi degli incarichi
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
    });
    return traduzione;
  };

  // Calcolo del colore della card in base al progresso
  const getCardColor = () => {
    if (evidenziato) {
      return "rgba(255, 215, 0, 0.2)"; // Colore evidenziazione: oro chiaro
    }
    
    if (progresso === 100) {
      return "rgba(76, 175, 80, 0.1)"; // Verde chiaro per completati
    }
    
    if (progresso > 0) {
      return "rgba(33, 150, 243, 0.1)"; // Blu chiaro per in progresso
    }
    
    return "rgba(25, 118, 210, 0.05)"; // Blu molto chiaro per assegnati ma non iniziati
  };

  // Funzione per trovare l'incarico corrispondente a un IncaricoInCesto
  const trovaIncarico = (incaricoInCesto: IncaricoInCesto) => {
    return incarichi.find(inc => inc.id === incaricoInCesto.incarico_id);
  };

  // Gestione del click su un incarico nel cesto
  const handleIncaricoClick = (incaricoId: string) => {
    if (onNavigateToIncarico) {
      onNavigateToIncarico(incaricoId);
    }
  };

  // Funzione per determinare se un incarico nel cesto è completato
  // Questa è una simulazione, in un'implementazione reale dovresti ottenere questa informazione dalle assegnazioni
  const isIncaricoCompletato = (incaricoId: string): boolean => {
    // Qui dovresti verificare se l'incarico è completato in base alle assegnazioni
    // Per ora restituiamo false come valore di default
    return false;
  };

  return (
    <Card 
      sx={{ 
        mb: 2, 
        backgroundColor: getCardColor(),
        transition: "background-color 0.3s ease",
        border: evidenziato ? "2px solid gold" : "1px solid rgba(25, 118, 210, 0.5)",
        boxShadow: "0 2px 4px rgba(25, 118, 210, 0.2)",
        position: "relative",
        cursor: "pointer",
        width: "100%",
        "&::before": {
          content: '""',
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: "primary.main",
        },
      }}
      elevation={evidenziato ? 8 : 2}
      onClick={handleCardClick}
    >
      <CardContent sx={{ pb: 1, "&:last-child": { pb: 1 } }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {/* Checkbox per completamento */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mr: 1 }}>
            <Checkbox
              checked={progresso === 100}
              onChange={(e) => {
                e.stopPropagation();
                // Qui dovresti implementare la logica per completare tutti gli incarichi nel cesto
              }}
              icon={<RadioButtonUncheckedIcon />}
              checkedIcon={<CheckCircleIcon />}
              onClick={(e) => e.stopPropagation()}
              sx={{ p: 0.5 }}
            />
          </Box>
          
          {/* Icona e quantità */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mr: 2 }}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40,
                backgroundColor: "primary.light",
                border: "2px solid rgba(25, 118, 210, 0.5)",
              }}
            >
              <ShoppingBasketIcon />
            </Avatar>
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: "medium",
                color: "text.primary",
                bgcolor: "white",
                px: 0.75,
                py: 0.25,
                mt: 0.5,
                borderRadius: 1,
                border: "1px solid rgba(0, 0, 0, 0.12)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                lineHeight: 1,
              }}
            >
              {cesto.incarichi.length}
            </Typography>
          </Box>
          
          {/* Nome del cesto */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1" component="div" sx={{ fontWeight: "medium" }}>
              {cesto.nome}
            </Typography>
            
            {/* Barra di progresso */}
            <Box sx={{ mt: 1, mb: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Progresso
                </Typography>
                <Typography variant="caption" sx={{ 
                  fontWeight: "medium", 
                  color: progresso === 100 ? "#2196f3" : "text.secondary"
                }}>
                  {Math.min(100, progresso)}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, progresso)} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: progresso === 100 ? "#2196f3" : undefined,
                  }
                }}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Divider />
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Incarichi nel cesto:
          </Typography>
          
          <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
            <List dense>
              {cesto.incarichi.map((incaricoInCesto) => {
                const incarico = trovaIncarico(incaricoInCesto);
                if (!incarico) return null;
                
                // Determina se l'incarico è completato
                const completato = isIncaricoCompletato(incaricoInCesto.incarico_id);
                
                return (
                  <ListItem 
                    key={incaricoInCesto.incarico_id}
                    sx={{ 
                      backgroundColor: completato 
                        ? "rgba(76, 175, 80, 0.1)" 
                        : "inherit",
                      cursor: "pointer",
                      borderLeft: completato 
                        ? "4px solid rgba(76, 175, 80, 0.8)" 
                        : "4px solid transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: completato 
                          ? "rgba(76, 175, 80, 0.2)" 
                          : "rgba(0, 0, 0, 0.04)",
                      }
                    }}
                    onClick={() => handleIncaricoClick(incaricoInCesto.incarico_id)}
                  >
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={completato}
                        onChange={() => onToggleCompletamento(
                          incaricoInCesto.incarico_id, 
                          !completato
                        )}
                        icon={<RadioButtonUncheckedIcon />}
                        checkedIcon={<CheckCircleIcon />}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </ListItemIcon>
                    
                    <ListItemText 
                      primary={getTranslatedName(incarico.nome)}
                      secondary={
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                          <Chip 
                            size="small" 
                            label={`Liv. ${incarico.livello_minimo}`} 
                            color="primary" 
                            variant="outlined" 
                          />
                          
                          {incarico.edificio_id && (
                            <Chip 
                              size="small" 
                              label={`Edificio: ${incarico.edificio_id}`} 
                              color="secondary" 
                              variant="outlined" 
                            />
                          )}
                          
                          {incaricoInCesto.quantita > 1 && (
                            <Chip 
                              size="small" 
                              label={`Quantità: ${incaricoInCesto.quantita}`} 
                              color="info" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </CardContent>
      </Collapse>
    </Card>
  );
} 