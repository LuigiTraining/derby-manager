import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from "@mui/material";
import { Language as LanguageIcon } from "@mui/icons-material";
import { IT, GB, ES, FR } from "country-flag-icons/react/3x2";
import { changeLanguage } from "../../i18n";

// Mappa delle lingue con le relative bandiere
const languageFlags = {
  it: <IT width={24} />,
  en: <GB width={24} />,
  es: <ES width={24} />,
  fr: <FR width={24} />,
};

// Mappa dei nomi delle lingue
const languageNames = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
};

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Gestisce l'apertura del menu
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Gestisce la chiusura del menu
  const handleClose = () => {
    setAnchorEl(null);
  };

  // Cambia la lingua usando la funzione esportata da i18n.ts
  const handleChangeLanguage = (language: string) => {
    changeLanguage(language).then(() => {
      console.log(`Lingua cambiata in: ${language} nel componente LanguageSwitcher`);
      // Forza il refresh dell'interfaccia ricaricando la pagina
      window.location.reload();
    });
    handleClose();
  };

  // Ottiene la lingua corrente
  const currentLanguage = i18n.language || "it";

  return (
    <Box>
      <Tooltip title={t("lingua.seleziona")}>
        <IconButton
          onClick={handleClick}
          size="small"
          aria-controls={open ? "language-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          color="inherit"
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {languageFlags[currentLanguage as keyof typeof languageFlags]}
          </Box>
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "language-button",
        }}
      >
        {Object.keys(languageFlags).map((lang) => (
          <MenuItem
            key={lang}
            onClick={() => handleChangeLanguage(lang)}
            selected={currentLanguage === lang}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {languageFlags[lang as keyof typeof languageFlags]}
            <Typography variant="body2">
              {languageNames[lang as keyof typeof languageNames]}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
