import React, { useState } from 'react';
import { 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TransferWithinAStationIcon from "@mui/icons-material/TransferWithinAStation";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

interface GestioneAssegnazioniDropdownProps {
  onCopia: () => void;
  onTrasferisci: () => void;
  onElimina: () => void;
  disabilitato?: boolean;
}

export const GestioneAssegnazioniDropdown: React.FC<GestioneAssegnazioniDropdownProps> = ({
  onCopia,
  onTrasferisci,
  onElimina,
  disabilitato = false
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };
  
  return (
    <>
      <Button
        variant="contained"
        color="info"
        size="small"
        onClick={handleClick}
        startIcon={<SwapHorizIcon fontSize="small" />}
        disabled={disabilitato}
        sx={{ 
          fontSize: '0.75rem', 
          py: 0.4, 
          px: 1.5,
          minWidth: 0,
          fontWeight: 'bold',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          borderRadius: '4px',
          textTransform: 'none',
          '&:hover': {
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            background: theme => theme.palette.info.dark
          },
          '&:active': {
            transform: 'scale(0.98)',
            transition: 'transform 0.1s',
          }
        }}
      >
        Assegnazioni
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'gestione-assegnazioni-button',
        }}
      >
        <MenuItem onClick={() => handleAction(onCopia)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copia assegnazioni</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onTrasferisci)}>
          <ListItemIcon>
            <TransferWithinAStationIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Trasferisci assegnazioni</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onElimina)}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Elimina assegnazioni</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}; 