"use client";

import { Editor } from '@tinymce/tinymce-react';
import { useRef, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const initPlugins = [
  'lists', 'link', 'image', 'table', 'wordcount', 'code', 'fullscreen',
];

const toolbar = 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image table | code fullscreen | removeformat';

interface BlobInfo {
  blob: () => File;
  filename: () => string;
}

export function TinyMceEditor({ value, onChange, placeholder }: RichTextEditorProps) {
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
        value={value}
        onEditorChange={(newValue) => onChange(newValue)}
        init={{
          height: 500,
          menubar: false,
          plugins: initPlugins,
          toolbar,
          placeholder: placeholder || 'Start typing...',
          // Block format configuration
          block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6',
          // Force block-level formatting to apply only to current block
          forced_root_block: 'p',
          forced_root_block_attrs: {},
          // Prevent format inheritance
          keep_styles: false,
          content_style: `
            body { 
              font-family: system-ui, sans-serif; 
              font-size: 14px; 
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
          // Setup callback to handle table creation
          setup: (editor) => {
            // Intercept table insertion
            editor.on('NewTable', () => {
              setTimeout(() => {
                const tables = editor.getBody().querySelectorAll('table');
                tables.forEach((table: Element) => {
                  const htmlTable = table as HTMLTableElement;
                  
                  // Set table styles
                  htmlTable.style.borderCollapse = 'collapse';
                  htmlTable.style.width = '100%';
                  htmlTable.style.border = '1px solid #d4d4d8';
                  
                  // Set cell styles
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
