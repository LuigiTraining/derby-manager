import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
} from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';
import { db, storage } from '../../configurazione/firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SaveIcon from '@mui/icons-material/Save';
import LinkIcon from '@mui/icons-material/Link';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import { config } from '../../configurazione/config';

interface WikiEditorProps {
  initialContent: string;
  pagePath: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export default function WikiEditor({
  initialContent,
  pagePath,
  onSave,
  readOnly = false
}: WikiEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [selectedLink, setSelectedLink] = useState('');
  const [linkText, setLinkText] = useState('');
  const [editorInstance, setEditorInstance] = useState<any>(null);

  // Carica le pagine disponibili per i link interni
  useEffect(() => {
    const loadAvailablePages = async () => {
      const pagesSnapshot = await getDocs(collection(db, 'wiki_pages'));
      const pages = pagesSnapshot.docs.map(doc => doc.id);
      setAvailablePages(pages);
    };

    loadAvailablePages();
  }, []);

  // Configurazione avanzata dell'editor
  const editorConfig = {
    height: 500,
    menubar: true,
    language: 'it',
    language_url: '/tinymce/langs/it.js',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'preview', 'help', 'wordcount',
      'emoticons', 'codesample', 'pagebreak',
      'nonbreaking', 'visualchars', 'quickbars'
    ],
    toolbar: [
      'undo redo | styles fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify |',
      'forecolor backcolor | bullist numlist outdent indent | removeformat | help',
      'table link image media emoticons | fullscreen code | copiabile'
    ],
    font_size_formats: '8pt 10pt 12pt 14pt 16pt 18pt 24pt 36pt 48pt',
    font_family_formats: 'Andale Mono=andale mono,times; Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Book Antiqua=book antiqua,palatino; Comic Sans MS=comic sans ms,sans-serif; Courier New=courier new,courier; Georgia=georgia,palatino; Helvetica=helvetica; Impact=impact,chicago; Symbol=symbol; Tahoma=tahoma,arial,helvetica,sans-serif; Terminal=terminal,monaco; Times New Roman=times new roman,times; Trebuchet MS=trebuchet ms,geneva; Verdana=verdana,geneva; Webdings=webdings; Wingdings=wingdings,zapf dingbats',
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        padding: 1rem;
        font-size: 14pt;
      }
      :root { color-scheme: light; }
      :first-of-type { margin-top: 0; }
      .img-fluid { max-width: 100%; height: auto; }
      .rounded { border-radius: 8px; }
      .img-with-border { border: 1px solid #ddd; padding: 4px; }
      .clickable-text { 
        background-color: #f5f5f5;
        padding: 2px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
        transition: background-color 0.2s;
        display: inline-block;
        margin: 0 2px;
      }
      .clickable-text:hover { 
        background-color: #e0e0e0;
      }
      .clickable-text:active { 
        background-color: #d5d5d5;
      }
    `,
    branding: false,
    promotion: false,
    browser_spellcheck: true,
    resize: true,
    statusbar: true,
    quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote',
    quickbars_insert_toolbar: 'quickimage quicktable',
    contextmenu: 'link image table',
    toolbar_mode: 'sliding',
    style_formats: [
      { title: 'Titoli', items: [
        { title: 'Titolo 1', format: 'h1' },
        { title: 'Titolo 2', format: 'h2' },
        { title: 'Titolo 3', format: 'h3' },
        { title: 'Titolo 4', format: 'h4' },
        { title: 'Titolo 5', format: 'h5' },
        { title: 'Titolo 6', format: 'h6' }
      ]},
      { title: 'Blocchi', items: [
        { title: 'Paragrafo', format: 'p' },
        { title: 'Citazione', format: 'blockquote' },
        { title: 'Codice', format: 'pre' }
      ]},
      { title: 'Contenitori', items: [
        { title: 'Sezione', block: 'section', wrapper: true },
        { title: 'Articolo', block: 'article', wrapper: true },
        { title: 'Div', block: 'div', wrapper: true }
      ]}
    ],
    domain: config.tinymce.domain,
    setup: (editor: any) => {
      setEditorInstance(editor);
      
      // Aggiungi il pulsante personalizzato
      editor.ui.registry.addButton('copiabile', {
        text: 'Testo Copiabile',
        tooltip: 'Rendi il testo selezionato copiabile con un tap',
        onAction: () => {
          const selectedText = editor.selection.getContent({ format: 'text' });
          if (selectedText) {
            // Genera un ID unico per questo elemento copiabile
            const uniqueId = `copyable-${Date.now()}`;
            const wrappedText = `<span class="clickable-text" data-copyable="${selectedText}" id="${uniqueId}">${selectedText}</span>`;
            editor.selection.setContent(wrappedText);

            // Aggiungi il gestore di eventi dopo che il contenuto è stato renderizzato
            setTimeout(() => {
              const script = `
                document.getElementById('${uniqueId}').addEventListener('click', function() {
                  const textToCopy = this.getAttribute('data-copyable');
                  navigator.clipboard.writeText(textToCopy).then(() => {
                    const msg = document.createElement('div');
                    msg.textContent = 'Copiato!';
                    msg.style.position = 'fixed';
                    msg.style.bottom = '20px';
                    msg.style.left = '50%';
                    msg.style.transform = 'translateX(-50%)';
                    msg.style.background = '#333';
                    msg.style.color = 'white';
                    msg.style.padding = '10px 20px';
                    msg.style.borderRadius = '4px';
                    msg.style.zIndex = '9999';
                    document.body.appendChild(msg);
                    setTimeout(() => msg.remove(), 2000);
                  });
                });
              `;
              editor.dom.doc.head.appendChild(editor.dom.create('script', {
                type: 'text/javascript',
                text: script
              }));
            }, 100);
          } else {
            editor.windowManager.alert('Seleziona prima il testo da rendere copiabile');
          }
        }
      });

      editor.on('Change', () => {
        const newContent = editor.getContent();
        setContent(newContent);
      });

      // Aggiungi il gestore di eventi globale per gli elementi copiabili
      editor.on('init', () => {
        const script = `
          document.addEventListener('click', function(e) {
            if (e.target.classList.contains('clickable-text')) {
              const textToCopy = e.target.getAttribute('data-copyable');
              if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                  const msg = document.createElement('div');
                  msg.textContent = 'Copiato!';
                  msg.style.position = 'fixed';
                  msg.style.bottom = '20px';
                  msg.style.left = '50%';
                  msg.style.transform = 'translateX(-50%)';
                  msg.style.background = '#333';
                  msg.style.color = 'white';
                  msg.style.padding = '10px 20px';
                  msg.style.borderRadius = '4px';
                  msg.style.zIndex = '9999';
                  document.body.appendChild(msg);
                  setTimeout(() => msg.remove(), 2000);
                });
              }
            }
          });
        `;
        editor.dom.doc.head.appendChild(editor.dom.create('script', {
          type: 'text/javascript',
          text: script
        }));
      });
    },
    images_upload_handler: async (blobInfo: any) => {
      try {
        const file = blobInfo.blob();
        const fileName = `${pagePath}/${Date.now()}_${blobInfo.filename()}`;
        const storageRef = ref(storage, `wiki_images/${fileName}`);
        
        // Upload del file
        await uploadBytes(storageRef, file);
        
        // Ottieni l'URL del file
        const downloadURL = await getDownloadURL(storageRef);
        
        return downloadURL;
      } catch (error) {
        console.error('Errore durante l\'upload dell\'immagine:', error);
        throw new Error('Errore durante l\'upload dell\'immagine');
      }
    },
    image_advtab: true,
    image_dimensions: true,
    image_class_list: [
      { title: 'Responsive', value: 'img-fluid' },
      { title: 'Arrotondata', value: 'rounded' },
      { title: 'Con bordo', value: 'img-with-border' }
    ],
    automatic_uploads: true,
    images_reuse_filename: true,
    images_upload_credentials: true,
  };

  const handleInsertInternalLink = () => {
    if (!selectedLink || !linkText || !editorInstance) return;

    const linkHtml = `<a href="/wiki/${selectedLink}" class="internal-link">${linkText}</a>`;
    editorInstance.insertContent(linkHtml);
    setIsLinkDialogOpen(false);
    setSelectedLink('');
    setLinkText('');
  };

  return (
    <Box>
      <Box sx={{ 
        border: 1, 
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <Editor
          apiKey={config.tinymce.apiKey}
          value={content}
          onEditorChange={(newContent) => setContent(newContent)}
          init={editorConfig}
          disabled={readOnly}
        />
      </Box>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => onSave(content)}
          startIcon={<SaveIcon />}
        >
          Salva
        </Button>
      </Box>

      {/* Dialog per i link interni */}
      <Dialog open={isLinkDialogOpen} onClose={() => setIsLinkDialogOpen(false)}>
        <DialogTitle>Inserisci Link Interno</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Testo del link"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Autocomplete
              fullWidth
              value={selectedLink}
              onChange={(_, newValue) => setSelectedLink(newValue || '')}
              options={availablePages}
              renderInput={(params) => (
                <TextField {...params} label="Pagina di destinazione" />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsLinkDialogOpen(false)}>Annulla</Button>
          <Button onClick={handleInsertInternalLink} variant="contained">
            Inserisci
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 