"use client";

import { useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { Bold, Heading2, ImagePlus, List, ListOrdered, Quote, RotateCcw, Strikethrough, Italic } from 'lucide-react';

type RichTextEditorProps = {
  value: Record<string, unknown>;
  onChange: (payload: { json: Record<string, unknown>; html: string }) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
};

const defaultContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function RichTextEditor({ value, onChange, placeholder, onUploadImage }: RichTextEditorProps) {
  const serializedValue = JSON.stringify(value ?? defaultContent);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content: value && Object.keys(value).length > 0 ? value : defaultContent,
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-7 outline-none focus:border-zinc-950',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange({ json: currentEditor.getJSON() as Record<string, unknown>, html: currentEditor.getHTML() });
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentSerializedValue = JSON.stringify(editor.getJSON());
    if (currentSerializedValue === serializedValue) {
      return;
    }

    editor.commands.setContent(value && Object.keys(value).length > 0 ? value : defaultContent, false);
  }, [editor, serializedValue, value]);

  const toolbarButtonClass = (active?: boolean) =>
    [
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
      active
        ? 'border-zinc-950 bg-zinc-950 text-white'
        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:text-zinc-950',
    ].join(' ');

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={toolbarButtonClass(editor?.isActive('bold'))}
            aria-pressed={editor?.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={toolbarButtonClass(editor?.isActive('italic'))}
            aria-pressed={editor?.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={toolbarButtonClass(editor?.isActive('strike'))}
            aria-pressed={editor?.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
            Strike
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={toolbarButtonClass(editor?.isActive('heading', { level: 2 }))}
            aria-pressed={editor?.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
            Heading
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={toolbarButtonClass(editor?.isActive('bulletList'))}
            aria-pressed={editor?.isActive('bulletList')}
            title="Bulleted list"
          >
            <List className="h-3.5 w-3.5" />
            Bullets
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            className={toolbarButtonClass(editor?.isActive('orderedList'))}
            aria-pressed={editor?.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            Numbered
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={toolbarButtonClass(editor?.isActive('blockquote'))}
            aria-pressed={editor?.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-3.5 w-3.5" />
            Quote
          </button>
          {onUploadImage ? (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className={toolbarButtonClass(false)}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {isUploadingImage ? 'Uploading...' : 'Image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];

                  if (!file || !onUploadImage) {
                    return;
                  }

                  try {
                    setIsUploadingImage(true);
                    const imageUrl = await onUploadImage(file);
                    editor?.chain().focus().setImage({ src: imageUrl }).run();
                  } finally {
                    setIsUploadingImage(false);
                    event.target.value = '';
                  }
                }}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                const imageUrl = window.prompt('Image URL');
                if (imageUrl) {
                  editor?.chain().focus().setImage({ src: imageUrl }).run();
                }
              }}
              className={toolbarButtonClass(false)}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Image URL
            </button>
          )}
          <button
            type="button"
            onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
            className={toolbarButtonClass(false)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>
        {placeholder ? <p className="mt-3 text-xs leading-5 text-zinc-500">{placeholder}</p> : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
