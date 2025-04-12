import React, { useState, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Typography,
  Divider,
  Badge,
  CircularProgress
} from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DialogoGestionePreset from './DialogoGestionePreset';
import DialogoGestioneListaPreset from './DialogoGestioneListaPreset';
import { PresetAssegnazioni } from '../../../../tipi/preset';
import * as presetsService from '../../../../servizi/presetsService';
import { Incarico } from '../../../../tipi/incarico';
import { IncaricoCitta } from '../../../../tipi/incaricoCitta';
import { Cesto } from '../../../../tipi/cesto';
import { Edificio } from '../../../../tipi/edificio';

interface PresetsAssegnazioniDropdownProps {
  presetAttivo: PresetAssegnazioni | null;
  onSelezionaPreset: (preset: PresetAssegnazioni | null) => void;
  disabilitato?: boolean;
  incarichiDisponibili?: Incarico[];
  incarichiCittaDisponibili?: IncaricoCitta[];
  cestiDisponibili?: Cesto[];
  edifici?: Edificio[];
}

const PresetsAssegnazioniDropdown: React.FC<PresetsAssegnazioniDropdownProps> = ({
  presetAttivo,
  onSelezionaPreset,
  disabilitato = false,
  incarichiDisponibili = [],
  incarichiCittaDisponibili = [],
  cestiDisponibili = [],
  edifici = []
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogoNuovoPresetAperto, setDialogoNuovoPresetAperto] = useState(false);
  const [dialogoGestionePresetsAperto, setDialogoGestionePresetsAperto] = useState(false);
  const [presetDaModificare, setPresetDaModificare] = useState<PresetAssegnazioni | null>(null);
  const [presets, setPresets] = useState<PresetAssegnazioni[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Carica i preset all'avvio
  useEffect(() => {
    caricaPresets();
  }, []);
  
  const caricaPresets = async () => {
    setLoading(true);
    try {
      const presetsCaricati = await presetsService.caricaPresets();
      // Ordino i preset alfabeticamente per nome
      const presetsOrdinati = [...presetsCaricati].sort((a, b) => a.nome.localeCompare(b.nome));
      setPresets(presetsOrdinati);
    } catch (error) {
      console.error('Errore nel caricamento dei preset:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!disabilitato) {
      setAnchorEl(event.currentTarget);
      // Forza l'aggiornamento dei preset da Firebase ogni volta che si apre il menu
      caricaPresets();
    }
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleNuovoPreset = () => {
    setPresetDaModificare(null);
    setDialogoNuovoPresetAperto(true);
    handleClose();
  };
  
  const handleGestionePresets = () => {
    setDialogoGestionePresetsAperto(true);
    handleClose();
  };
  
  const handleSelezionaPreset = async (preset: PresetAssegnazioni) => {
    // Se il preset è già attivo, lo disattiva
    if (presetAttivo && presetAttivo.id === preset.id) {
      onSelezionaPreset(null);
    } else {
      try {
        // Aggiorna il timestamp di ultimo utilizzo
        await presetsService.aggiornaUltimoUtilizzo(preset.id);
        onSelezionaPreset(preset);
      } catch (error) {
        console.error('Errore nell\'aggiornamento dell\'ultimo utilizzo:', error);
        // Continua comunque con la selezione del preset
        onSelezionaPreset(preset);
      }
    }
    handleClose();
  };
  
  const handleSalvaPreset = async (nome: string, descrizione: string, incarichi: string[]) => {
    setLoading(true);
    try {
      if (presetDaModificare) {
        console.log("Aggiornamento preset esistente:", {
          id: presetDaModificare.id,
          nome,
          descrizione,
          incarichi: incarichi.length
        });
        
        // Aggiorna il preset esistente
        const presetAggiornato = await presetsService.aggiornaPreset(presetDaModificare.id, {
          nome,
          descrizione,
          incarichi
        });
        
        if (presetAggiornato) {
          console.log("Preset aggiornato con successo:", presetAggiornato);
          
          // Aggiorna la lista dei preset
          await caricaPresets();
          
          // Se il preset modificato era quello attivo, aggiorna anche quello
          if (presetAttivo && presetAttivo.id === presetDaModificare.id) {
            onSelezionaPreset(presetAggiornato);
          }
        } else {
          console.error("Errore nell'aggiornamento del preset: risposta nulla");
        }
      } else {
        console.log("Creazione nuovo preset:", {
          nome,
          descrizione,
          incarichi: incarichi.length
        });
        
        // Crea un nuovo preset
        const nuovoPreset = await presetsService.creaPreset({
          nome,
          descrizione,
          incarichi
        });
        
        console.log("Nuovo preset creato:", nuovoPreset);
        
        // Aggiorna la lista dei preset
        await caricaPresets();
      }
      
      setDialogoNuovoPresetAperto(false);
      setPresetDaModificare(null);
    } catch (error) {
      console.error('Errore nel salvataggio del preset:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleModificaPreset = (preset: PresetAssegnazioni) => {
    setPresetDaModificare(preset);
    setDialogoNuovoPresetAperto(true);
  };
  
  const handleEliminaPreset = async (presetId: string) => {
    setLoading(true);
    try {
      const success = await presetsService.eliminaPreset(presetId);
      if (success) {
        // Se il preset eliminato era quello attivo, disattivalo
        if (presetAttivo && presetAttivo.id === presetId) {
          onSelezionaPreset(null);
        }
        
        // Aggiorna la lista dei preset
        await caricaPresets();
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione del preset:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        disabled={disabilitato || loading}
        startIcon={loading ? <CircularProgress size={20} /> : <PlaylistPlayIcon />}
        endIcon={<ExpandMoreIcon />}
        sx={{ fontSize: '0.75rem', py: 0.5, minWidth: 0 }}
      >
        {presetAttivo ? (
          <Badge color="primary" variant="dot">
            Preset
          </Badge>
        ) : (
          'Preset'
        )}
      </Button>
      
      <Menu
        id="preset-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 300,
            minWidth: 200
          }
        }}
      >
        {loading ? (
          <MenuItem disabled>
            <ListItemIcon>
              <CircularProgress size={20} />
            </ListItemIcon>
            <ListItemText primary="Caricamento..." />
          </MenuItem>
        ) : (
          <>
            {presets.length > 0 && (
              <>
                {presets.map((preset) => (
                  <MenuItem 
                    key={preset.id} 
                    onClick={() => handleSelezionaPreset(preset)}
                    selected={presetAttivo?.id === preset.id}
                  >
                    <ListItemIcon>
                      <PlaylistPlayIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={preset.nome} 
                      primaryTypographyProps={{ noWrap: true }}
                      secondary={`${preset.incarichi.length} incarichi`}
                    />
                  </MenuItem>
                ))}
                <Divider />
              </>
            )}
            
            <MenuItem onClick={handleNuovoPreset}>
              <ListItemIcon>
                <PlaylistAddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Crea nuovo preset" />
            </MenuItem>
            
            <MenuItem onClick={handleGestionePresets}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Gestisci preset" />
            </MenuItem>
          </>
        )}
      </Menu>
      
      {/* Dialogo per creare/modificare preset */}
      <DialogoGestionePreset
        open={dialogoNuovoPresetAperto}
        onClose={() => setDialogoNuovoPresetAperto(false)}
        onSalva={handleSalvaPreset}
        preset={presetDaModificare}
        incarichiDisponibili={incarichiDisponibili}
        incarichiCittaDisponibili={incarichiCittaDisponibili}
        cestiDisponibili={cestiDisponibili}
        edifici={edifici}
      />
      
      {/* Dialogo per gestire la lista dei preset */}
      <DialogoGestioneListaPreset
        open={dialogoGestionePresetsAperto}
        onClose={() => setDialogoGestionePresetsAperto(false)}
        presets={presets}
        onNuovoPreset={handleNuovoPreset}
        onModificaPreset={handleModificaPreset}
        onEliminaPreset={handleEliminaPreset}
        onSelezionaPreset={handleSelezionaPreset}
      />
    </>
  );
};

export default PresetsAssegnazioniDropdown; 