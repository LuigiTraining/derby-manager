import React from 'react';
import { Stack, ButtonGroup, Button, LinearProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface ContatoreProduzioneProps {
  valore: number;
  onChange: (nuovoValore: number) => void;
}

const ContatoreProduzione: React.FC<ContatoreProduzioneProps> = ({ valore, onChange }) => {
  const handleIncrementa = () => {
    onChange(valore + 1);
  };

  const handleDecrementa = () => {
    if (valore > 0) {
      onChange(valore - 1);
    }
  };

  return (
    <Stack spacing={1} alignItems="center">
      <ButtonGroup size="small" aria-label="contatore produzione">
        <Button onClick={handleDecrementa}>
          <RemoveIcon />
        </Button>
        <Button disabled>{valore}</Button>
        <Button onClick={handleIncrementa}>
          <AddIcon />
        </Button>
      </ButtonGroup>
    </Stack>
  );
};

export default ContatoreProduzione;
