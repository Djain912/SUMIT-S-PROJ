"use client";

import { Editor } from '@tinymce/tinymce-react';
import { useRef, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const initPlugins = [
  'lists', 'link', 'image', 'table', 'wordcount',
];

const toolbar = 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | link image table | removeformat';

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
          height: 300,
          menubar: false,
          plugins: initPlugins,
          toolbar,
          placeholder: placeholder || 'Start typing...',
          content_style: 'body { font-family: system-ui, sans-serif; font-size: 14px; }',
          branding: false,
          resize: true,
          statusbar: true,
          elementpath: false,
          images_upload_handler: imageUploadHandler,
        }}
      />
    </div>
  );
}
