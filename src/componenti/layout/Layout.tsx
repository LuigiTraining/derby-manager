import React, { useState, useEffect, createContext, useContext } from "react";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
  Badge,
  Collapse,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import TaskIcon from "@mui/icons-material/Task";
import ShoppingBasketIcon from "@mui/icons-material/ShoppingBasket";
import HomeWorkIcon from "@mui/icons-material/HomeWork";
import HomeIcon from "@mui/icons-material/Home";
import LocationCityIcon from "@mui/icons-material/LocationCity";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import BuildIcon from "@mui/icons-material/Build";
import AnnouncementIcon from "@mui/icons-material/Announcement";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import GavelIcon from "@mui/icons-material/Gavel";
import BarChartIcon from "@mui/icons-material/BarChart";
import BlockIcon from "@mui/icons-material/Block";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../autenticazione/AuthContext";
import { useAnnunci } from "../annunci/AnnunciContext";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs
} from "firebase/firestore";
import { db } from "../../configurazione/firebase";
import DerbyChips from "../derby/DerbyChips";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const drawerWidth = 240;

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  chip?: React.ReactNode;
  sx?: React.CSSProperties;
}

interface Props {
  children: React.ReactNode;
}

interface RichiesteContextType {
  nuoveRichieste: number;
  setNuoveRichieste: React.Dispatch<React.SetStateAction<number>>;
  aggiornaRichieste: () => Promise<void>;
}

const RichiesteContext = createContext<RichiesteContextType | undefined>(undefined);

export const useRichieste = () => {
  const context = useContext(RichiesteContext);
  if (context === undefined) {
    throw new Error('useRichieste deve essere usato all\'interno di un RichiesteProvider');
  }
  return context;
};

// Funzione per ottenere il conteggio delle richieste in attesa
export async function getConteggiRichieste() {
  try {
    const q = query(
      collection(db, "richieste_registrazione"),
      where("stato", "==", "in_attesa")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.length;
  } catch (error) {
    console.error("Errore nel controllo delle richieste:", error);
    return 0;
  }
}

export default function Layout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("expandedMenus");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const { currentUser, logout } = useAuth();
  const { nuoviAnnunci } = useAnnunci();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [nuoveRichieste, setNuoveRichieste] = useState(0);
  const { t } = useTranslation();

  // Aggiungo l'effetto per resettare lo stato quando l'utente si scollega
  useEffect(() => {
    if (!currentUser) {
      setExpandedMenus([]);
      localStorage.removeItem("expandedMenus");
    }
  }, [currentUser]);

  // Salva lo stato delle espansioni in localStorage quando cambia
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("expandedMenus", JSON.stringify(expandedMenus));
    }
  }, [expandedMenus, currentUser]);

  // Ascolta le richieste di registrazione in attesa
  useEffect(() => {
    if (["admin", "coordinatore"].includes(currentUser?.ruolo || "")) {
      // Funzione per controllare le richieste in attesa
      const checkRichieste = async () => {
        const conteggio = await getConteggiRichieste();
        setNuoveRichieste(conteggio);
      };

      // Controlla all'avvio
      checkRichieste();
      
      // Controlla ogni ora invece che in tempo reale
      const intervalId = setInterval(checkRichieste, 60 * 60 * 1000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [currentUser]);

  // Funzione per aggiornare manualmente il conteggio delle richieste
  const aggiornaRichieste = async (): Promise<void> => {
    const conteggio = await getConteggiRichieste();
    setNuoveRichieste(conteggio);
  };

  const getMenuItems = () => {
    if (!currentUser) return [];

    const gestioneItems = [
      { text: "Edifici", icon: <HomeWorkIcon />, path: "/edifici" },
      { text: "Città", icon: <LocationCityIcon />, path: "/citta" },
      { text: "Incarichi", icon: <AssignmentIcon />, path: "/incarichi" },
      { text: "Cesti", icon: <ShoppingBasketIcon />, path: "/cesti" },
    ];

    // Menu items per admin e coordinatori
    if (["admin", "coordinatore"].includes(currentUser.ruolo)) {
      const items: MenuItem[] = [
        {
          text: t("barraLaterale.home"),
          icon: (
            <Badge
              badgeContent={nuoviAnnunci.length}
              color="error"
              variant="dot"
            >
              <HomeIcon />
            </Badge>
          ),
          children: [
            {
              text: t("barraLaterale.annunci"),
              icon: <AnnouncementIcon />,
              path: "/welcome",
            },
            {
              text: t("barraLaterale.wiki"),
              icon: <MenuBookIcon />,
              path: "/wiki/home",
            },
            {
              text: t("barraLaterale.tutorial"),
              icon: <SchoolIcon />,
              path: "/tutorial/home",
            },
            {
              text: t("barraLaterale.regolamenti"),
              icon: <GavelIcon />,
              path: "/regolamento/home",
            },
          ],
        },
        {
          text: t("barraLaterale.dashboard"),
          icon: <DashboardIcon />,
          path: "/dashboard",
        },
        {
          text: "Assegnazioni",
          icon: <AssignmentIcon />,
          path: "/test-assegnazioni",
          sx: { backgroundColor: 'rgba(255, 0, 0, 0.05)' }
        },
        {
          text: t("barraLaterale.listaGlobale"),
          icon: <TaskIcon />,
          path: "/giocatore/nuovo/miei-incarichi",
          sx: { backgroundColor: 'rgba(255, 0, 0, 0.05)' }
        },
        {
          text: t("barraLaterale.blocchi"),
          icon: <BlockIcon />,
          path: "/admin/blocchi",
        },
        {
          text: t("barraLaterale.giocatori"),
          icon: <PeopleIcon />,
          path: "/giocatori",
        },
        {
          text: t("barraLaterale.gestione"),
          icon: <BuildIcon />,
          children: gestioneItems,
        },
        {
          text: t("barraLaterale.derby"),
          icon: <EmojiEventsIcon />,
          path: "/admin/derby",
        },
        {
          text: t("barraLaterale.statistiche"),
          icon: <BarChartIcon />,
          path: "/admin/statistiche",
        },
      ];

      // Aggiungi impostazioni solo per admin
      if (currentUser.ruolo === "admin") {
        items.push({
          text: t("barraLaterale.impostazioni"),
          icon: (
            <Badge badgeContent={nuoveRichieste} color="error" invisible={nuoveRichieste === 0}>
              <SettingsIcon />
            </Badge>
          ),
          path: "/admin/impostazioni",
        });
      }

      return items;
    }

    // Menu items per moderatori
    if (currentUser.ruolo === "moderatore") {
      return [
        {
          text: t("barraLaterale.home"),
          icon: <HomeIcon />,
          children: [
            {
              text: t("barraLaterale.annunci"),
              icon: <AnnouncementIcon />,
              path: "/welcome",
            },
            {
              text: t("barraLaterale.wiki"),
              icon: <MenuBookIcon />,
              path: "/wiki/home",
            },
            {
              text: t("barraLaterale.tutorial"),
              icon: <SchoolIcon />,
              path: "/tutorial/home",
            },
            {
              text: t("barraLaterale.regolamenti"),
              icon: <GavelIcon />,
              path: "/regolamento/home",
            },
          ],
        },
        {
          text: t("barraLaterale.dashboard"),
          icon: <DashboardIcon />,
          path: "/dashboard",
        },
        {
          text: t("barraLaterale.listaGlobale"),
          icon: <TaskIcon />,
          path: "/giocatore/nuovo/miei-incarichi",
          sx: { backgroundColor: 'rgba(255, 0, 0, 0.05)' }
        },
        {
          text: t("barraLaterale.blocchi"),
          icon: <BlockIcon />,
          path: "/admin/blocchi",
        },
        {
          text: t("barraLaterale.giocatori"),
          icon: <PeopleIcon />,
          path: "/giocatori",
        },
        {
          text: t("barraLaterale.gestione"),
          icon: <BuildIcon />,
          children: gestioneItems,
        },
      ];
    }

    // Menu items per giocatori normali
    return [
      {
        text: t("barraLaterale.home"),
        icon: <HomeIcon />,
        children: [
          {
            text: t("barraLaterale.annunci"),
            icon: <AnnouncementIcon />,
            path: "/welcome",
          },
          {
            text: t("barraLaterale.wiki"),
            icon: <MenuBookIcon />,
            path: "/wiki/home",
          },
          {
            text: t("barraLaterale.tutorial"),
            icon: <SchoolIcon />,
            path: "/tutorial/home",
          },
          {
            text: t("barraLaterale.regolamenti"),
            icon: <GavelIcon />,
            path: "/regolamento/home",
          },
        ],
      },
      {
        text: "Lista",
        icon: <TaskIcon />,
        path: "/giocatore/nuovo/miei-incarichi",
        sx: { backgroundColor: 'rgba(255, 0, 0, 0.05)' }
      },
      {
        text: t("barraLaterale.giocatori"),
        icon: <PeopleIcon />,
        path: "/giocatori",
      },
    ];
  };

  const menuItems = getMenuItems();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuClick = (item: MenuItem) => {
    if (item.children) {
      // Se clicchiamo sul menu Gestione, lo espandiamo/comprimiamo
      setExpandedMenus((prev) =>
        prev.includes(item.text)
          ? prev.filter((text) => text !== item.text)
          : [...prev, item.text]
      );
    } else if (item.path) {
      // Se clicchiamo su una sottoscheda, navighiamo senza modificare lo stato di espansione
      handleNavigation(item.path);
    }
  };

  const renderMenuItem = (item: MenuItem) => {
    const isExpanded = expandedMenus.includes(item.text);
    const isSelected = item.path === location.pathname;

    return (
      <React.Fragment key={item.text}>
        <ListItem disablePadding>
          <ListItemButton
            selected={isSelected}
            onClick={() => handleMenuClick(item)}
            sx={item.sx}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
            {item.chip && item.chip}
            {item.children && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        {item.children && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map((child: MenuItem) => (
                <ListItem key={child.text} disablePadding>
                  <ListItemButton
                    sx={{ pl: 4 }}
                    selected={child.path === location.pathname}
                    onClick={() => handleMenuClick(child)}
                  >
                    <ListItemIcon>{child.icon}</ListItemIcon>
                    <ListItemText primary={child.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("expandedMenus"); // Rimuovi le espansioni al logout
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  };

  const drawer = (
    <div>
      <Toolbar sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box
          component="img"
          src="/images/logo_percheno_vicinato.png"
          alt="Logo Perché No"
          sx={{
            height: 32,
            width: "auto",
          }}
        />
        <Badge badgeContent={nuoveRichieste} color="error" invisible={nuoveRichieste === 0}>
          <Typography variant="h6" noWrap component="div">
            Perché No
          </Typography>
        </Badge>
      </Toolbar>
      <Divider />
      <DerbyChips />
      <Divider />
      <List>{menuItems.map(renderMenuItem)}</List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <RichiesteContext.Provider value={{ nuoveRichieste, setNuoveRichieste, aggiornaRichieste }}>
      <Box sx={{ display: "flex" }}>
        <CssBaseline />
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {menuItems.reduce((title, item) => {
                // Caso speciale per il percorso "/admin/test-assegnazioni"
                if (location.pathname === "/admin/test-assegnazioni") return "Assegnazioni";
                
                // Caso speciale per il percorso "/giocatore/nuovo/miei-incarichi"
                if (location.pathname === "/giocatore/nuovo/miei-incarichi") {
                  // Mostra "Lista globale" per admin e moderatori, "Lista" per i giocatori
                  if (["admin", "coordinatore", "moderatore"].includes(currentUser?.ruolo || "")) {
                    return t("barraLaterale.listaGlobale");
                  } else {
                    return "Lista";
                  }
                }
                
                if (item.path === location.pathname) return item.text;
                if (item.children) {
                  const child = item.children.find(
                    (child) => child.path === location.pathname
                  );
                  if (child) return child.text;
                }
                return title;
              }, "Derby Manager")}
            </Typography>
            <Badge badgeContent={nuoveRichieste} color="error" invisible={nuoveRichieste === 0} sx={{ mr: 1 }}>
              <IconButton
                color="inherit"
                onClick={() => navigate("/welcome")}
                sx={{ mr: 1 }}
                aria-label="vai alla home"
              >
                <HomeIcon />
              </IconButton>
            </Badge>
            <LanguageSwitcher />
            <Box sx={{ textAlign: "right", ml: 2 }}>
              <Typography variant="body1">{currentUser?.nome}</Typography>
              {currentUser &&
                ["moderatore", "coordinatore"].includes(currentUser.ruolo) && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "white",
                      fontStyle: "italic",
                      fontSize: "0.7rem",
                      display: "block",
                      lineHeight: 1,
                      mt: -0.5,
                    }}
                  >
                    {currentUser.ruolo === "coordinatore" 
                      ? "Co-Leader" 
                      : currentUser.ruolo === "moderatore" 
                        ? "Gestore" 
                        : currentUser.ruolo.charAt(0).toUpperCase() + currentUser.ruolo.slice(1)}
                  </Typography>
                )}
            </Box>
          </Toolbar>
        </AppBar>
        <Box
          component="nav"
          sx={{
            width: { sm: drawerWidth },
            flexShrink: { sm: 0 },
            borderRight: "1px solid",
            borderColor: "divider",
          }}
        >
          <Drawer
            variant={isMobile ? "temporary" : "permanent"}
            open={isMobile ? mobileOpen : true}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              "& .MuiDrawer-paper": {
                boxSizing: "border-box",
                width: drawerWidth,
                borderRight: "none",
                "&::-webkit-scrollbar": {
                  width: "4px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "rgba(0, 0, 0, 0.1)",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "rgba(0, 0, 0, 0.2)",
                },
              },
            }}
          >
            {drawer}
          </Drawer>
        </Box>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 1, sm: 2 },
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: "64px", // Altezza della AppBar
          }}
        >
          {children}
        </Box>
      </Box>
    </RichiesteContext.Provider>
  );
}
