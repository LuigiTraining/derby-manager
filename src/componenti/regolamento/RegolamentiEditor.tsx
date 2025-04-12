import React from 'react';
import { Editor } from '@tinymce/tinymce-react';
import { Box, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../autenticazione/AuthContext';
import { collection, getDocs } from 'firebase/firestore'
import { 
  getDocsWithRateLimit, 
  db, 
  storage 
} from '../../configurazione/firebase';
import { config } from '../../configurazione/config';

interface RegolamentiEditorProps {
  initialContent: string;
  sectionId: string;
  onSave: (content: string) => Promise<void>;
  readOnly?: boolean;
}

export default function RegolamentiEditor({
  initialContent,
  sectionId,
  onSave,
  readOnly = false
}: RegolamentiEditorProps) {
  const [content, setContent] = React.useState(initialContent);
  const [editorInstance, setEditorInstance] = React.useState<any>(null);
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  // Configurazione dell'editor
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
      /* Stili specifici per i regolamenti */
      .regolamento-articolo {
        margin-bottom: 1rem;
        padding: 0.5rem;
        border-left: 3px solid #2196f3;
        background-color: #f5f5f5;
      }
      .regolamento-sezione {
        margin-bottom: 0.5rem;
        font-weight: bold;
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
      { title: 'Regolamento', items: [
        { title: 'Articolo', block: 'div', classes: 'regolamento-articolo', wrapper: true },
        { title: 'Sezione', block: 'div', classes: 'regolamento-sezione', wrapper: true }
      ]}
    ],
    domain: config.tinymce.domain,
    setup: (editor: any) => {
      setEditorInstance(editor);
      
      // Aggiungi il pulsante per testo copiabile
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
    },
    images_upload_handler: async (blobInfo: any) => {
      try {
        const file = blobInfo.blob();
        const fileName = `${sectionId}/${Date.now()}_${blobInfo.filename()}`;
        const storageRef = ref(storage, `regolamenti_images/${fileName}`);
        
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
    readonly: readOnly
  };

  const handleSave = async () => {
    if (readOnly) return;
    
    setIsLoading(true);
    try {
      await onSave(content);
    } catch (error) {
      console.error('Errore durante il salvataggio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <Editor
        apiKey={config.tinymce.apiKey}
        init={editorConfig}
        initialValue={initialContent}
        disabled={readOnly || isLoading}
      />
      
      {!readOnly && (
        <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
          <Tooltip title="Salva">
            <IconButton 
              onClick={handleSave}
              disabled={isLoading}
              size="large"
              sx={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
} 