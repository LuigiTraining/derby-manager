import React from 'react';
import { Tooltip, TooltipProps } from '@mui/material';

interface TooltipWrapperProps extends Omit<TooltipProps, 'children'> {
  children: React.ReactElement;
}

/**
 * Un wrapper per il componente Tooltip di MUI che gestisce correttamente
 * i bottoni disabilitati e altri elementi che non generano eventi.
 * 
 * Risolve l'errore: "You are providing a disabled button child to the Tooltip component"
 */
const TooltipWrapper: React.FC<TooltipWrapperProps> = ({ children, ...props }) => {
  // Controlla se il child è disabilitato (funziona con Button, IconButton, ecc.)
  const isDisabled = children.props.disabled;

  // Se non è disabilitato, usa il Tooltip normalmente
  if (!isDisabled) {
    return <Tooltip {...props}>{children}</Tooltip>;
  }

  // Se è disabilitato, avvolgi il bottone in uno span per catturare gli eventi
  return (
    <Tooltip {...props}>
      <span style={{ display: 'inline-block' }}>
        {React.cloneElement(children, {
          // Mantieni tutti gli altri props, ma rimuovi gli handler di eventi
          // che potrebbero generare errori
          onClick: undefined,
          onMouseDown: undefined,
          onMouseUp: undefined,
          onMouseEnter: undefined,
          onMouseLeave: undefined
        })}
      </span>
    </Tooltip>
  );
};

export default TooltipWrapper; 