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
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import { styled } from "@mui/material/styles";
import { Incarico } from "../../../../tipi/incarico";
import { Assegnazione } from "../../../../tipi/assegnazione";
import { Cesto } from "../../../../tipi/cesto";
import { useTranslation } from "react-i18next";

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

// Estensione dell'interfaccia Assegnazione per aggiungere la proprietà quantita
interface AssegnazioneEstesa extends Assegnazione {
  quantita?: number;
}

// Estensione dell'interfaccia Incarico per aggiungere le proprietà mancanti
interface IncaricoEsteso extends Incarico {
  livello?: number;
  edificio?: string;
  categoria?: string;
  descrizione?: string;
  requisiti?: string;
  ricompense?: string;
}

// Interfaccia per le props del componente
interface IncaricoGiocatoreCardProps {
  incarico: IncaricoEsteso;
  assegnazione?: AssegnazioneEstesa;
  progresso: number;
  onToggleCompletamento: (incaricoId: string, completato: boolean) => void;
  onUpdateQuantita: (incaricoId: string, quantita: number) => void;
  evidenziato?: boolean;
  onEvidenziazioneFine?: () => void;
  getQuantitaIncarico?: (incarico: IncaricoEsteso) => number;
  trovaCestoPerIncarico?: (incaricoId: string) => Cesto | undefined;
  getQuantitaIncaricoCesto?: (cestoId: string, incaricoId: string) => number;
  onNavigateToCesto?: (cestoId: string) => void;
  livelloFarmSelezionata?: number;
  expanded?: boolean;
  onIncaricoExpand?: (incaricoId: string, isExpanded: boolean) => void;
}

export default function IncaricoGiocatoreCard({
  incarico,
  assegnazione,
  progresso,
  onToggleCompletamento,
  onUpdateQuantita,
  evidenziato = false,
  onEvidenziazioneFine,
  getQuantitaIncarico,
  trovaCestoPerIncarico,
  getQuantitaIncaricoCesto,
  onNavigateToCesto,
  livelloFarmSelezionata = 0,
  expanded: externalExpanded,
  onIncaricoExpand,
}: IncaricoGiocatoreCardProps) {
  const { t } = useTranslation();
  
  // Creo uno stato iniziale basato sul progresso all'inizio
  const [valoreMostrato, setValoreMostrato] = useState<number>(progresso);
  const [valoreModificatoLocalmente, setValoreModificatoLocalmente] = useState<boolean>(false);
  const [popupAperto, setPopupAperto] = useState(false);
  const [valoreTemporaneo, setValoreTemporaneo] = useState<string>("");
  
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

  // Effetto per aggiornare il valore mostrato solo quando il progresso cambia significativamente
  // o quando il componente viene montato per la prima volta
  React.useEffect(() => {
    // Se il valore non è stato modificato localmente, seguiamo il progresso
    if (!valoreModificatoLocalmente) {
      setValoreMostrato(progresso);
    } 
    // Altrimenti, se c'è una grande differenza tra i valori, aggiorniamo comunque
    else if (Math.abs(valoreMostrato - progresso) > 10) {
      setValoreMostrato(progresso);
      setValoreModificatoLocalmente(false);
    }
  }, [incarico.id, progresso]);

  // Gestione del toggle di completamento
  const handleToggleCompletamento = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    // Se il progresso è inferiore alla quantità richiesta, lo portiamo alla quantità richiesta
    if (valoreMostrato < quantitaIncarico) {
      const nuovoValore = quantitaIncarico;
      setValoreMostrato(nuovoValore);
      setValoreModificatoLocalmente(true);
      onUpdateQuantita(incarico.id, nuovoValore);
      onToggleCompletamento(incarico.id, true);
      return;
    }
    
    // Se il progresso è uguale o maggiore alla quantità richiesta, lo portiamo a zero
    if (valoreMostrato >= quantitaIncarico) {
      setValoreMostrato(0);
      setValoreModificatoLocalmente(true);
      onUpdateQuantita(incarico.id, 0);
      onToggleCompletamento(incarico.id, false);
      return;
    }
  };

  // Gestione dell'apertura del popup
  const handleApriPopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValoreTemporaneo(valoreMostrato.toString());
    setPopupAperto(true);
  };

  // Gestione della chiusura del popup
  const handleChiudiPopup = () => {
    setPopupAperto(false);
  };

  // Gestione del salvataggio del valore
  const handleSalvaValore = () => {
    const nuovaQuantita = valoreTemporaneo === "" ? 0 : parseInt(valoreTemporaneo);
    setValoreMostrato(nuovaQuantita);
    setValoreModificatoLocalmente(true);
    onUpdateQuantita(incarico.id, nuovaQuantita);
    setPopupAperto(false);
  };

  // Gestione dell'aggiornamento del valore temporaneo
  const handleValoreChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValoreTemporaneo(event.target.value);
  };

  // Gestione dell'incremento e decremento della quantità
  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nuovaQuantita = valoreMostrato + 1;
    setValoreMostrato(nuovaQuantita);
    setValoreModificatoLocalmente(true);
    onUpdateQuantita(incarico.id, nuovaQuantita);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nuovaQuantita = Math.max(0, valoreMostrato - 1);
    setValoreMostrato(nuovaQuantita);
    setValoreModificatoLocalmente(true);
    onUpdateQuantita(incarico.id, nuovaQuantita);
  };

  // Funzione per impostare la quantità al massimo (50)
  const handleSetFull = (e: React.MouseEvent) => {
    e.stopPropagation();
    setValoreMostrato(50);
    setValoreModificatoLocalmente(true);
    onUpdateQuantita(incarico.id, 50);
  };

  // Funzione per tradurre i nomi degli incarichi
  const getTranslatedName = (nome: string) => {
    // Verifica se esiste una traduzione per questo incarico
    const traduzione = t(`incarichi.${nome}`, {
      defaultValue: nome,
      // Rimuovo le opzioni che potrebbero interferire con la traduzione
      ns: "common"
    });
    return traduzione;
  };

  // Verifica se l'incarico è disponibile in base al livello della farm
  const isIncaricoDisponibile = livelloFarmSelezionata >= (incarico.livello_minimo || 0);

  // Ottieni la quantità dell'incarico
  const quantitaIncarico = getQuantitaIncarico ? getQuantitaIncarico(incarico) : (incarico.quantita || 0);

  // Ottieni il livello dell'incarico
  const livello = incarico.livello || incarico.livello_minimo || 0;

  // Calcola il numero di completamenti possibili
  const completamenti = Math.floor(progresso / quantitaIncarico);
  
  // Determina se l'incarico è completato in base al progresso
  // Se il progresso è zero, l'incarico non è completato indipendentemente dallo stato dell'assegnazione
  const isCompletato = progresso > 0 && (assegnazione?.completato || (progresso >= quantitaIncarico));

  // Calcola il colore della card in base al progresso e alla disponibilità
  const getCardColor = () => {
    if (!isIncaricoDisponibile) {
      return "rgba(0, 0, 0, 0.05)"; // Grigio chiaro per incarichi non disponibili
    }

    if (evidenziato) {
      return "rgba(255, 215, 0, 0.2)"; // Colore evidenziazione: oro chiaro
    }
    
    if (isCompletato) {
      return "rgba(76, 175, 80, 0.1)"; // Verde chiaro per completati
    }
    
    if (progresso > 0) {
      return "rgba(33, 150, 243, 0.1)"; // Blu chiaro per in progresso
    }
    
    if (assegnazione) {
      return "rgba(25, 118, 210, 0.05)"; // Blu molto chiaro per assegnati ma non iniziati
    }
    
    return "inherit"; // Colore default per incarichi non assegnati
  };

  // Calcolo delle informazioni sul cesto fuori dal JSX
  const cestoInfo = React.useMemo(() => {
    if (!trovaCestoPerIncarico || !getQuantitaIncaricoCesto) return null;
    
    const cesto = trovaCestoPerIncarico(incarico.id);
    if (!cesto) return null;
    
    const quantitaInCesto = getQuantitaIncaricoCesto(cesto.id, incarico.id);
    
    return {
      cesto,
      quantitaInCesto
    };
  }, [incarico.id, trovaCestoPerIncarico, getQuantitaIncaricoCesto]);

  return (
    <>
      <Card 
        id={`incarico-${incarico.id}`}
        sx={{ 
          mb: 0, // Rimuovo il margin negativo e uso 0 per evitare spazi
          mt: 0, // Rimuovo il margin negativo e uso 0 per evitare spazi
          backgroundColor: getCardColor(),
          transition: "background-color 0.3s ease",
          borderTop: evidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
          borderBottom: evidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
          borderRight: evidenziato ? "2px solid gold" : "1px solid rgba(0, 0, 0, 0.12)",
          borderLeft: "none", // Rimuovo il bordo sinistro perché ora uso AssignmentIndicator
          borderRadius: 0, // Nessun bordo arrotondato per permettere alle card di unirsi perfettamente
          boxShadow: "none", // Nessuna ombra per evitare spazi visivi
          position: "relative",
          cursor: "default",
          // Rimuovo qualsiasi padding o margin che potrebbe causare spazi
          p: 0,
          ...(isIncaricoDisponibile ? {} : {
            filter: "grayscale(1)",
            opacity: 0.7,
            pointerEvents: "none"
          })
        }}
        elevation={0}
        onClick={(e) => e.preventDefault()}
      >
        {/* Indicatore di assegnazione - posizionato all'esterno */}
        {assegnazione && <AssignmentIndicator />}
        
        {/* Livello dell'incarico - posizionato al bordo sinistro */}
        <LevelBadge>
          {livello}
        </LevelBadge>
        
        <CardContent sx={{ py: 0.5, "&:last-child": { pb: 0.5 }, pl: 3.5, pt: 0.5, pb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {/* Checkbox per completamento */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mr: 1 }}>
              <Checkbox
                checked={isCompletato}
                onChange={handleToggleCompletamento}
                icon={<RadioButtonUncheckedIcon />}
                checkedIcon={<CheckCircleIcon />}
                onClick={(e) => e.stopPropagation()}
                sx={{ p: 0.5 }}
              />
              {completamenti > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "success.main",
                    fontWeight: "medium",
                    fontSize: "0.75rem",
                  }}
                >
                  x{completamenti}
                </Typography>
              )}
            </Box>
            
            {/* Immagine */}
            <Box sx={{ mr: 1.5 }}>
              <Avatar 
                src={incarico.immagine} 
                alt={incarico.nome}
                variant="rounded"
                sx={{ 
                  width: 36, 
                  height: 36,
                  border: "none",
                }}
              />
              <Box 
                onClick={handleApriPopup}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mt: 0.5,
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                  borderRadius: "4px",
                  padding: "1px 3px",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                  }
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: "medium",
                    textAlign: "center",
                  }}
                >
                  {valoreMostrato}/{quantitaIncarico}
                </Typography>
              </Box>
            </Box>
            
            {/* Nome dell'incarico */}
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1" component="div" sx={{ fontWeight: "medium" }}>
                  {getTranslatedName(incarico.nome)}
                </Typography>
                
                {/* Percentuale di completamento */}
                <Typography variant="caption" sx={{ 
                  fontWeight: "medium", 
                  color: isCompletato ? "#4caf50" : (valoreMostrato > 0 ? "#2196f3" : "text.secondary"),
                  mr: 1
                }}>
                  {Math.min(100, Math.round((valoreMostrato / quantitaIncarico) * 100))}%
                </Typography>
              </Box>
              
              {/* Barra di progresso con pulsanti + e - */}
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.25 }}>
                <IconButton 
                  size="small" 
                  onClick={handleDecrement}
                  disabled={valoreMostrato <= 0}
                  sx={{ p: 0.25, mr: 0.25 }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                
                <Box sx={{ flexGrow: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, (valoreMostrato / quantitaIncarico) * 100)} 
                    sx={{ 
                      height: 4, 
                      borderRadius: 2,
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: isCompletato ? "#4caf50" : (valoreMostrato > 0 ? "#2196f3" : undefined),
                      }
                    }}
                  />
                </Box>
                
                <IconButton 
                  size="small" 
                  onClick={handleIncrement}
                  sx={{ p: 0.25, ml: 0.25 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                
                <Button 
                  size="small" 
                  onClick={handleSetFull}
                  variant="outlined"
                  color="secondary"
                  sx={{ ml: 0.25, minWidth: 'auto', height: '20px', fontSize: '0.6rem', p: '1px 3px', lineHeight: 1 }}
                >
                  FULL
                </Button>
              </Box>
              
              {/* Informazioni sui cesti */}
              {cestoInfo && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <Chip 
                    size="small" 
                    label={`${cestoInfo.cesto.nome} (${Math.min(valoreMostrato, cestoInfo.quantitaInCesto)}/${cestoInfo.quantitaInCesto})`}
                    color="warning"
                    variant="outlined"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigateToCesto) {
                        onNavigateToCesto(cestoInfo.cesto.id);
                      }
                    }}
                    sx={{
                      borderColor: 'rgba(237, 108, 2, 0.5)',
                      fontSize: '0.75rem',
                    }}
                  />
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Dialog per l'inserimento del valore manuale */}
      <Dialog 
        open={popupAperto} 
        onClose={handleChiudiPopup}
        PaperProps={{
          sx: {
            width: '250px',
            maxWidth: '90vw',
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Valore manuale
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <TextField
            autoFocus
            margin="dense"
            type="number"
            fullWidth
            variant="outlined"
            value={valoreTemporaneo}
            onChange={handleValoreChange}
            inputProps={{ 
              min: 0,
              style: { textAlign: 'center', fontSize: '1.2rem' },
              inputMode: 'numeric',
              pattern: '[0-9]*'
            }}
            sx={{
              "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                display: "none",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleChiudiPopup} color="primary">
            Annulla
          </Button>
          <Button onClick={handleSalvaValore} color="primary" variant="contained">
            Salva
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}