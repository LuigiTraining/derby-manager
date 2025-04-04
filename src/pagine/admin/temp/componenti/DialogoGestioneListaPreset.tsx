import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { PresetAssegnazioni } from '../../../../tipi/preset';

interface DialogoGestioneListaPresetProps {
  open: boolean;
  onClose: () => void;
  presets: PresetAssegnazioni[];
  onNuovoPreset: () => void;
  onModificaPreset: (preset: PresetAssegnazioni) => void;
  onEliminaPreset: (presetId: string) => Promise<void>;
  onSelezionaPreset: (preset: PresetAssegnazioni) => Promise<void>;
}

const DialogoGestioneListaPreset: React.FC<DialogoGestioneListaPresetProps> = ({
  open,
  onClose,
  presets,
  onNuovoPreset,
  onModificaPreset,
  onEliminaPreset,
  onSelezionaPreset
}) => {
  const [filtro, setFiltro] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [presetSelezionato, setPresetSelezionato] = useState<PresetAssegnazioni | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, preset: PresetAssegnazioni) => {
    setMenuAnchorEl(event.currentTarget);
    setPresetSelezionato(preset);
  };
  
  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
  };
  
  const handleModificaPreset = () => {
    if (presetSelezionato) {
      onModificaPreset(presetSelezionato);
      handleCloseMenu();
    }
  };
  
  const handleEliminaPreset = async () => {
    if (presetSelezionato) {
      setLoading(true);
      try {
        await onEliminaPreset(presetSelezionato.id);
      } finally {
        setLoading(false);
        handleCloseMenu();
      }
    }
  };
  
  const handleSelezionaPreset = async () => {
    if (presetSelezionato) {
      setLoading(true);
      try {
        await onSelezionaPreset(presetSelezionato);
      } finally {
        setLoading(false);
        handleCloseMenu();
        onClose();
      }
    }
  };
  
  // Filtra i preset per nome
  const presetsFiltrati = presets.filter(preset => 
    preset.nome.toLowerCase().includes(filtro.toLowerCase()) ||
    (preset.descrizione && preset.descrizione.toLowerCase().includes(filtro.toLowerCase()))
  );
  
  // Ordina i preset: prima per ultimo utilizzo (più recenti in cima), poi per data di aggiornamento
  const presetsOrdinati = [...presetsFiltrati].sort((a, b) => {
    if (a.ultimoUtilizzo && b.ultimoUtilizzo) {
      return b.ultimoUtilizzo.seconds - a.ultimoUtilizzo.seconds;
    } else if (a.ultimoUtilizzo) {
      return -1;
    } else if (b.ultimoUtilizzo) {
      return 1;
    } else {
      return b.updatedAt.seconds - a.updatedAt.seconds;
    }
  });
  
  // Formatta la data di ultimo utilizzo
  const formatUltimoUtilizzo = (timestamp: any) => {
    if (!timestamp) return 'Mai utilizzato';
    
    const data = new Date(timestamp.seconds * 1000);
    return `${data.toLocaleDateString()} ${data.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Gestione Preset Assegnazioni</Typography>
          <Tooltip title="Crea nuovo preset">
            <IconButton onClick={onNuovoPreset} color="primary" disabled={loading}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          placeholder="Cerca preset..."
          fullWidth
          variant="outlined"
          size="small"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        
        {presets.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Non hai ancora creato nessun preset.
            </Typography>
            <Button 
              onClick={onNuovoPreset} 
              startIcon={<AddIcon />} 
              variant="contained" 
              sx={{ mt: 2 }}
              disabled={loading}
            >
              Crea il tuo primo preset
            </Button>
          </Box>
        ) : presetsFiltrati.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            Nessun preset corrisponde alla ricerca
          </Typography>
        ) : (
          <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
            {presetsOrdinati.map((preset) => (
              <React.Fragment key={preset.id}>
                <Box 
                  sx={{ 
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Button
                    fullWidth
                    onClick={async () => {
                      setLoading(true);
                      try {
                        await onSelezionaPreset(preset);
                        onClose();
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    sx={{ 
                      textAlign: 'left',
                      py: 1,
                      px: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start'
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">{preset.nome}</Typography>
                      {preset.descrizione && (
                        <Typography variant="body2" color="text.secondary">
                          {preset.descrizione}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <AccessTimeIcon fontSize="inherit" sx={{ opacity: 0.6, mr: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {formatUltimoUtilizzo(preset.ultimoUtilizzo || preset.updatedAt)}
                        </Typography>
                        <Typography variant="caption" color="primary" sx={{ ml: 1 }}>
                          {preset.incarichi.length} incarichi
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton
                      edge="end"
                      aria-label="options"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenMenu(e, preset);
                      }}
                      size="small"
                      disabled={loading}
                      sx={{ ml: 1 }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Button>
                </Box>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Chiudi</Button>
      </DialogActions>
      
      {/* Menu contestuale */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleSelezionaPreset} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} /> : <PlaylistAddCheckIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Seleziona e applica</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleModificaPreset} disabled={loading}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Modifica</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleEliminaPreset} disabled={loading}>
          <ListItemIcon>
            {loading ? <CircularProgress size={20} color="error" /> : <DeleteIcon fontSize="small" color="error" />}
          </ListItemIcon>
          <ListItemText>Elimina</ListItemText>
        </MenuItem>
      </Menu>
    </Dialog>
  );
};

export default DialogoGestioneListaPreset; 