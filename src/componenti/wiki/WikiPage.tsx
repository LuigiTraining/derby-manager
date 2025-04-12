import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Breadcrumbs,
  Link,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Collapse,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../../configurazione/firebase';
import { collection, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore'
import { 
  getDocWithRateLimit, 
  getDocsWithRateLimit, 
  setDocWithRateLimit,
  updateDocWithRateLimit,
  deleteDocWithRateLimit,
  addDocWithRateLimit
} from '../../configurazione/firebase';;
import EditIcon from '@mui/icons-material/Edit';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuth } from '../autenticazione/AuthContext';
import WikiEditor from './WikiEditor';
import styled from '@emotion/styled';

interface WikiPageProps {
  pagePath: string;
}

interface WikiPage {
  id: string;
  title: string;
  content: string;
  parentPath: string | null;
  order: number;
  lastModified: Date;
  modifiedBy: string;
}

interface TreeItem {
  id: string;
  title: string;
  children: TreeItem[];
  path: string;
}

const StyledContent = styled('div')({
  '& > *:first-of-type': {
    marginTop: 0
  }
});

export default function WikiPage({ pagePath }: WikiPageProps) {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();

  const [page, setPage] = useState<WikiPage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [navigationTree, setNavigationTree] = useState<TreeItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ title: string; path: string }[]>([]);

  // Carica la pagina corrente
  useEffect(() => {
    const loadPage = async () => {
      const pageDoc = await getDocWithRateLimit(doc(db, 'wiki_pages', pagePath));
      if (pageDoc.exists()) {
        setPage({
          id: pageDoc.id,
          ...pageDoc.data()
        } as WikiPage);

        // Costruisci i breadcrumbs
        const parts = pagePath.split('/');
        const crumbs = [];
        let currentPath = '';
        
        for (const part of parts) {
          currentPath += (currentPath ? '/' : '') + part;
          const partDoc = await getDocWithRateLimit(doc(db, 'wiki_pages', currentPath));
          if (partDoc.exists()) {
            crumbs.push({
              title: partDoc.data().title,
              path: currentPath
            });
          }
        }
        
        setBreadcrumbs(crumbs);
      }
    };

    loadPage();
  }, [pagePath]);

  // Carica l'albero di navigazione
  useEffect(() => {
    const loadNavigationTree = async () => {
      const pagesSnapshot = await getDocsWithRateLimit(collection(db, 'wiki_pages'));
      const pages = pagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WikiPage[];

      // Costruisci l'albero
      const buildTree = (parentPath: string | null): TreeItem[] => {
        return pages
          .filter(p => p.parentPath === parentPath)
          .sort((a, b) => a.order - b.order)
          .map(p => ({
            id: p.id,
            title: p.title,
            path: p.id,
            children: buildTree(p.id)
          }));
      };

      setNavigationTree(buildTree(null));
    };

    loadNavigationTree();
  }, []);

  const handleSave = async (newContent: string) => {
    if (!page || !currentUser) return;

    await updateDocWithRateLimit(doc(db, 'wiki_pages', pagePath), {
      content: newContent,
      lastModified: new Date(),
      modifiedBy: currentUser.id
    });

    setPage({
      ...page,
      content: newContent,
      lastModified: new Date(),
      modifiedBy: currentUser.id
    });
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const renderNavigationTree = (items: TreeItem[], level = 0) => (
    <List sx={{ pl: level * 2 }}>
      {items.map((item) => (
        <React.Fragment key={item.id}>
          <ListItemButton
            selected={pagePath === item.path}
            onClick={() => {
              if (item.children.length > 0) {
                toggleExpand(item.id);
              } else {
                navigate(`/wiki/${item.path}`);
                if (isMobile) setDrawerOpen(false);
              }
            }}
            sx={{ pl: level * 2 }}
          >
            <ListItemText primary={item.title} />
            {item.children.length > 0 && (
              expandedItems.includes(item.id) ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
          {item.children.length > 0 && (
            <Collapse in={expandedItems.includes(item.id)} timeout="auto" unmountOnExit>
              {renderNavigationTree(item.children, level + 1)}
            </Collapse>
          )}
        </React.Fragment>
      ))}
    </List>
  );

  if (!page) return null;

  return (
    <Box sx={{ 
      width: '100%',
      overflowX: 'hidden'  // Previene lo scroll orizzontale
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 1, sm: 2 }
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontSize: { xs: '1.5rem', sm: '2rem' },
            wordBreak: 'break-word'
          }}
        >
          {page?.title}
        </Typography>
        {currentUser?.ruolo === 'admin' && (
          <IconButton 
            onClick={() => setIsEditing(!isEditing)}
            sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}
          >
            <EditIcon />
          </IconButton>
        )}
      </Box>
      
      {isEditing ? (
        <WikiEditor
          initialContent={page?.content || ''}
          pagePath={pagePath}
          onSave={handleSave}
        />
      ) : (
        <StyledContent>
          <Box 
            sx={{ 
              '& > *:first-of-type': { mt: 0 },
              '& > *:last-child': { mb: 0 },
              '& img': { 
                maxWidth: '100%', 
                height: 'auto' 
              },
              '& table': { 
                width: '100%',
                overflowX: 'auto',
                display: 'block'
              },
              '& p, & div': {
                maxWidth: '100%',
                wordBreak: 'break-word'
              },
              '& a': {
                wordBreak: 'break-word'
              }
            }}
            dangerouslySetInnerHTML={{ __html: page?.content || '' }} 
          />
        </StyledContent>
      )}

      {page && (
        <Box sx={{ 
          mt: 4, 
          pt: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          fontSize: { xs: '0.75rem', sm: '0.875rem' }
        }}>
          <Typography variant="caption" color="text.secondary">
            Ultima modifica: {page.lastModified?.toLocaleString()} da {page.modifiedBy}
          </Typography>
        </Box>
      )}
    </Box>
  );
} 