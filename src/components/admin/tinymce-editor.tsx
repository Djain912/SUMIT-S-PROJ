"use client";

import { Editor } from '@tinymce/tinymce-react';
import { useRef, useCallback } from 'react';

interface RichTextEditorProps {
  initialValue?: string; // use initialValue (not value) to avoid TinyMCE controlled-mode resets
  onChange: (value: string) => void;
  placeholder?: string;
}

const initPlugins = [
  'lists', 'link', 'image', 'table', 'wordcount', 'code', 'fullscreen',
];

const toolbar =
  'customformatpainter | undo redo | blocks fontsize | bold italic underline | forecolor backcolor | alignleft aligncenter alignright | bullist numlist | link image table | insertsectiondivider | removeformat';

interface BlobInfo {
  blob: () => File;
  filename: () => string;
}

export function TinyMceEditor({ initialValue = '', onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<unknown>(null);

  const imageUploadHandler = useCallback(async (blobInfo: BlobInfo): Promise<string> => {
    const file = blobInfo.blob();
    console.log('Starting upload - file:', file.name, file.size, file.type);

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = 'ml_default'; // Your unsigned preset

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    console.log('Uploading to Cloudinary, cloudName:', cloudName, 'preset:', uploadPreset);

    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error('Cloudinary error:', errText);
      throw new Error('Upload failed: ' + errText);
    }

    const result = await uploadResponse.json();
    console.log('Upload success! URL:', result.secure_url);
    
    // Validate secure_url presence
    if (!result.secure_url) {
      throw new Error('Upload response missing secure_url');
    }
    
    // Validate HTTPS protocol
    if (!result.secure_url.startsWith('https://')) {
      throw new Error('Invalid URL protocol, expected HTTPS');
    }
    
    return result.secure_url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, []) as any;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <Editor
        apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
        onInit={(_evt, editor) => {
          editorRef.current = editor;
        }}
        initialValue={initialValue}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height: 560,
          menubar: false,
          plugins: initPlugins,
          toolbar,
          toolbar_sticky: true,
          placeholder: placeholder || 'Start typing your notes here...',
          // Block format configuration
          block_formats: 'Normal=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4',
          font_size_formats: '10pt 11pt 12pt 14pt 16pt 18pt 20pt 24pt 28pt 32pt',
          // Every Enter keystroke creates a new <p> — headings apply per paragraph
          forced_root_block: 'p',
          forced_root_block_attrs: {},
          // Prevent format bleeding to next paragraph
          keep_styles: false,
          end_container_on_empty_block: true,
          content_style: `
            body {
              font-family: system-ui, sans-serif;
              font-size: 14px;
            }
            hr {
              border: none;
              border-top: 2px solid #d4d4d8;
              margin: 1.5rem 0;
              height: 0;
            }
            img {
              max-width: 100%;
              height: auto;
              display: block;
              margin: 1rem auto;
            }
            table { 
              border-collapse: collapse; 
              width: 100%; 
              margin: 1rem 0;
            }
            table th, table td { 
              border: 1px solid #d4d4d8; 
              padding: 0.5rem; 
            }
            table th { 
              background-color: #f4f4f5; 
              font-weight: 600; 
            }
          `,
          branding: false,
          resize: true,
          statusbar: true,
          elementpath: false,
          images_upload_handler: imageUploadHandler,
          // Image settings for better control
          image_advtab: true,
          image_caption: true,
          image_title: true,
          image_description: false,
          // Default image dimensions when inserted (responsive but reasonable)
          image_dimensions: true,
          // Allow image resizing in editor
          object_resizing: true,
          // Default width for pasted/inserted images (in pixels, but will be responsive)
          images_reuse_filename: true,
          // Automatically resize large images to max 800px width
          automatic_uploads: true,
          images_file_types: 'jpg,jpeg,png,gif,webp',
          // Table settings
          table_default_attributes: {
            border: '1'
          },
          table_default_styles: {
            'border-collapse': 'collapse',
            'width': '100%'
          },
          table_responsive_width: true,
          table_use_colgroups: false,
          table_class_list: [
            { title: 'Default', value: '' },
            { title: 'Bordered', value: 'table-bordered' }
          ],
          table_cell_class_list: [
            { title: 'Default', value: '' }
          ],
          table_row_class_list: [
            { title: 'Default', value: '' }
          ],
          // Setup callback
          setup: (editor) => {

            // ── Section Divider button with style picker ───────────────────
            editor.ui.registry.addButton('insertsectiondivider', {
              tooltip: 'Insert section divider',
              text: '─ Divider',
              onAction: () => {
                editor.windowManager.open({
                  title: 'Insert Section Divider',
                  body: {
                    type: 'panel',
                    items: [
                      {
                        type: 'selectbox',
                        name: 'style',
                        label: 'Line Style',
                        items: [
                          { value: 'solid',  text: 'Solid  ───────' },
                          { value: 'dashed', text: 'Dashed  – – – –' },
                          { value: 'dotted', text: 'Dotted  · · · ·' },
                          { value: 'double', text: 'Double  ═══════' },
                        ],
                      },
                      {
                        type: 'selectbox',
                        name: 'thickness',
                        label: 'Thickness',
                        items: [
                          { value: '1', text: 'Thin (1px)' },
                          { value: '2', text: 'Medium (2px)' },
                          { value: '4', text: 'Thick (4px)' },
                          { value: '6', text: 'Extra Thick (6px)' },
                        ],
                      },
                      {
                        type: 'selectbox',
                        name: 'color',
                        label: 'Color',
                        items: [
                          { value: '#d4d4d8', text: 'Light Grey (default)' },
                          { value: '#a1a1aa', text: 'Grey' },
                          { value: '#52525b', text: 'Dark Grey' },
                          { value: '#18181b', text: 'Black' },
                          { value: '#3b82f6', text: 'Blue' },
                          { value: '#8b5cf6', text: 'Purple' },
                          { value: '#22c55e', text: 'Green' },
                          { value: '#ef4444', text: 'Red' },
                          { value: '#f59e0b', text: 'Amber / Gold' },
                        ],
                      },
                    ],
                  },
                  initialData: { style: 'solid', thickness: '2', color: '#d4d4d8' },
                  buttons: [
                    { type: 'cancel', text: 'Cancel' },
                    { type: 'submit', text: 'Insert Divider', primary: true },
                  ],
                  onSubmit: (api) => {
                    const data = api.getData() as { style: string; thickness: string; color: string };
                    // CSS "double" needs ≥3px to visibly show two lines
                    const px = data.style === 'double'
                      ? Math.max(3, parseInt(data.thickness) * 2)
                      : parseInt(data.thickness);
                    const html = `<hr style="border:none;border-top:${px}px ${data.style} ${data.color};margin:1.5rem 0;" />`;
                    editor.insertContent(html);
                    api.close();
                  },
                });
              },
            });

            // ── Shift+Enter → new paragraph (not <br>) ─────────────────────
            // This ensures every line is its own block so headings/formats
            // only apply to the selected line, not everything below it.
            editor.on('keydown', (e: KeyboardEvent) => {
              if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                editor.execCommand('InsertParagraph');
              }
            });

            // ── Custom Format Painter ──────────────────────────────────────
            let paintData: Record<string, unknown> | null = null;
            let isPainting = false;

            function captureFormats() {
              return {
                bold:          editor.formatter.match('bold'),
                italic:        editor.formatter.match('italic'),
                underline:     editor.formatter.match('underline'),
                strikethrough: editor.formatter.match('strikethrough'),
                h1:            editor.formatter.match('h1'),
                h2:            editor.formatter.match('h2'),
                h3:            editor.formatter.match('h3'),
                h4:            editor.formatter.match('h4'),
                forecolor:     editor.queryCommandValue('ForeColor'),
                hilitecolor:   editor.queryCommandValue('HiliteColor'),
                fontsize:      editor.queryCommandValue('FontSize'),
              };
            }

            function applyFormats(fmt: Record<string, unknown>) {
              const inlines = ['bold', 'italic', 'underline', 'strikethrough'] as const;
              inlines.forEach((f) => {
                if (fmt[f]) editor.formatter.apply(f);
                else editor.formatter.remove(f);
              });
              const blocks = ['h1', 'h2', 'h3', 'h4'] as const;
              blocks.forEach((f) => { if (fmt[f]) editor.formatter.apply(f); });
              if (fmt.forecolor && typeof fmt.forecolor === 'string' && fmt.forecolor !== '' && fmt.forecolor !== 'rgb(0, 0, 0)') {
                editor.execCommand('ForeColor', false, fmt.forecolor as string);
              }
              if (fmt.hilitecolor && typeof fmt.hilitecolor === 'string' && fmt.hilitecolor !== '' && fmt.hilitecolor !== 'rgb(255, 255, 255)') {
                editor.execCommand('HiliteColor', false, fmt.hilitecolor as string);
              }
            }

            editor.ui.registry.addToggleButton('customformatpainter', {
              tooltip: 'Format Painter — select formatted text, click, then select target text',
              icon:    'paste-text',
              onAction(api) {
                if (!isPainting) {
                  paintData  = captureFormats();
                  isPainting = true;
                  api.setActive(true);
                  editor.getBody().style.cursor = 'copy';
                  editor.notificationManager.open({
                    text:    '🖌️ Format Painter active — now select the text you want to format',
                    type:    'info',
                    timeout: 4000,
                  });
                } else {
                  isPainting = false;
                  paintData  = null;
                  api.setActive(false);
                  editor.getBody().style.cursor = '';
                }
              },
            });

            editor.on('MouseUp', () => {
              if (isPainting && paintData && !editor.selection.isCollapsed()) {
                applyFormats(paintData);
                isPainting = false;
                paintData  = null;
                editor.getBody().style.cursor = '';
              }
            });
            // ── End Format Painter ─────────────────────────────────────────

            // Fix table styles on insertion
            editor.on('NewTable', () => {
              setTimeout(() => {
                const tables = editor.getBody().querySelectorAll('table');
                tables.forEach((table: Element) => {
                  const htmlTable = table as HTMLTableElement;
                  htmlTable.style.borderCollapse = 'collapse';
                  htmlTable.style.width = '100%';
                  htmlTable.style.border = '1px solid #d4d4d8';
                  const cells = htmlTable.querySelectorAll('td, th');
                  cells.forEach((cell: Element) => {
                    const htmlCell = cell as HTMLTableCellElement;
                    htmlCell.style.border = '1px solid #d4d4d8';
                    htmlCell.style.padding = '0.75rem';
                    if (htmlCell.tagName === 'TH') {
                      htmlCell.style.backgroundColor = '#f4f4f5';
                      htmlCell.style.fontWeight = '600';
                    }
                  });
                });
              }, 50);
            });
          },
          // Content filtering
          paste_data_images: true,
          paste_as_text: false,
          paste_webkit_styles: 'all',
          paste_merge_formats: true,
          // Smart paste
          smart_paste: true,
          // Allow all HTML elements
          valid_elements: '*[*]',
          extended_valid_elements: '*[*]',
          // Clean up table styles on paste/save
          paste_preprocess: (plugin, args) => {
            // For tables: keep border styles but remove fixed widths/heights
            args.content = args.content.replace(
              /<table([^>]*)>/gi,
              (_match: string, attrs: string) => {
                // Ensure table has proper styles
                if (!attrs.includes('style=')) {
                  return `<table${attrs} style="border-collapse: collapse; width: 100%; border: 1px solid #d4d4d8;">`;
                }
                // If has style, ensure it has the right properties
                const newAttrs = attrs.replace(
                  /style="([^"]*)"/gi,
                  (_styleMatch: string, styleContent: string) => {
                    // Remove fixed widths but keep other styles
                    let newStyle = styleContent
                      .replace(/width:\s*[\d.]+px;?/gi, '')
                      .replace(/height:\s*[\d.]+px;?/gi, '');
                    
                    // Ensure essential styles are present
                    if (!newStyle.includes('border-collapse')) {
                      newStyle += ' border-collapse: collapse;';
                    }
                    if (!newStyle.includes('width')) {
                      newStyle += ' width: 100%;';
                    }
                    if (!newStyle.includes('border:') && !newStyle.includes('border-color')) {
                      newStyle += ' border: 1px solid #d4d4d8;';
                    }
                    
                    return `style="${newStyle.trim()}"`;
                  }
                );
                return `<table${newAttrs}>`;
              }
            );
            
            // For table cells: ensure they have borders
            args.content = args.content.replace(
              /<(td|th)([^>]*)>/gi,
              (_match: string, tag: string, attrs: string) => {
                // Remove fixed widths from cells
                let newAttrs = attrs.replace(/width:\s*[\d.]+px;?/gi, '');
                
                // Ensure cells have border and padding
                if (!newAttrs.includes('style=')) {
                  return `<${tag}${newAttrs} style="border: 1px solid #d4d4d8; padding: 0.75rem;">`;
                } else {
                  newAttrs = newAttrs.replace(
                    /style="([^"]*)"/gi,
                    (_styleMatch: string, styleContent: string) => {
                      let newStyle = styleContent.replace(/width:\s*[\d.]+px;?/gi, '');
                      
                      // Ensure border and padding
                      if (!newStyle.includes('border')) {
                        newStyle += ' border: 1px solid #d4d4d8;';
                      }
                      if (!newStyle.includes('padding')) {
                        newStyle += ' padding: 0.75rem;';
                      }
                      
                      return `style="${newStyle.trim()}"`;
                    }
                  );
                }
                return `<${tag}${newAttrs}>`;
              }
            );
            
            // For table rows: remove fixed heights
            args.content = args.content.replace(
              /<tr([^>]*)>/gi,
              (_match: string, attrs: string) => {
                const newAttrs = attrs.replace(/height:\s*[\d.]+px;?/gi, '');
                return `<tr${newAttrs}>`;
              }
            );
          },
          // Image upload callback to set default size
          init_instance_callback: (editor) => {
            editor.on('NodeChange', (e) => {
              if (e.element.nodeName === 'IMG') {
                const img = e.element as HTMLImageElement;
                // If image doesn't have explicit width, set a reasonable default
                if (!img.style.width && !img.width) {
                  // Set to 600px or 100% of container, whichever is smaller
                  img.style.maxWidth = '100%';
                  img.style.width = '600px';
                  img.style.height = 'auto';
                }
              }
            });
          },
        }}
      />
    </div>
  );
}
