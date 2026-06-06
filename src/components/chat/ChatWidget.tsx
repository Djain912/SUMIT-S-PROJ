'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, ChevronDown, Sparkles } from 'lucide-react';
import { FeedbackButtons } from '@/components/chat/FeedbackButtons';

// ── Inline renderer: handles **bold**, *italic*, `code` ──────────────────────
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="rounded bg-zinc-200 px-1 text-xs font-mono">{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Matches a markdown image: ![caption](https://...)
const IMAGE_RE = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

// ── Block renderer: headings, bullet lists, numbered lists, paragraphs ───────
function MarkdownMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') { i++; continue; }

    // Image line — render any ![caption](url) found, plus surrounding text
    IMAGE_RE.lastIndex = 0;
    if (IMAGE_RE.test(line)) {
      IMAGE_RE.lastIndex = 0;
      let lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = IMAGE_RE.exec(line)) !== null) {
        const before = line.slice(lastIndex, m.index).trim();
        if (before) {
          elements.push(
            <p key={key++} className="text-[13px] leading-relaxed">{renderInline(before)}</p>,
          );
        }
        const caption = m[1];
        const url = m[2];
        elements.push(
          <figure key={key++} className="my-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || 'Diagram from notes'}
              loading="lazy"
              className="w-full rounded-lg border border-zinc-200"
            />
            {caption && (
              <figcaption className="mt-1 text-center text-[11px] text-zinc-500">{caption}</figcaption>
            )}
          </figure>,
        );
        lastIndex = m.index + m[0].length;
      }
      const after = line.slice(lastIndex).trim();
      if (after) {
        elements.push(
          <p key={key++} className="text-[13px] leading-relaxed">{renderInline(after)}</p>,
        );
      }
      i++; continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<p key={key++} className="font-bold text-[13px] mt-3 mb-0.5 text-zinc-900">{renderInline(line.slice(4))}</p>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<p key={key++} className="font-bold text-[13px] mt-3 mb-0.5 text-zinc-900">{renderInline(line.slice(3))}</p>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<p key={key++} className="font-bold text-sm mt-3 mb-1 text-zinc-900">{renderInline(line.slice(2))}</p>);
      i++; continue;
    }

    // Numbered list — collect items + sub-bullets, skip blank lines between points
    if (/^\d+\.\s/.test(line)) {
      type NumberedItem = { text: string; subs: string[] };
      const items: NumberedItem[] = [];
      while (i < lines.length) {
        const l = lines[i];
        if (/^\d+\.\s/.test(l)) {
          items.push({ text: l.replace(/^\d+\.\s+/, ''), subs: [] });
          i++;
        } else if (/^\s+[-•]\s/.test(l) && items.length > 0) {
          items[items.length - 1].subs.push(l.replace(/^\s+[-•]\s+/, ''));
          i++;
        } else if (l.trim() === '') {
          // peek ahead — if next non-empty line is another numbered item, keep going
          const next = lines.slice(i + 1).find((x) => x.trim() !== '');
          if (next && /^\d+\.\s/.test(next)) { i++; continue; }
          break;
        } else {
          break;
        }
      }
      // Use explicit numbers so each item always shows the right number
      elements.push(
        <div key={key++} className="space-y-2.5 my-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2.5">
              <span className="shrink-0 font-bold text-[13px] text-zinc-900 w-5 text-right">
                {idx + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] leading-relaxed">{renderInline(item.text)}</span>
                {item.subs.length > 0 && (
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    {item.subs.map((sub, si) => (
                      <li key={si} className="text-[12px] leading-relaxed text-zinc-600">
                        {renderInline(sub)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>,
      );
      continue;
    }

    // Bullet list
    if (/^[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-•]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc ml-4 space-y-1.5 my-1.5">
          {items.map((item, idx) => (
            <li key={idx} className="text-[13px] leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key++} className="text-[13px] leading-relaxed">{renderInline(line)}</p>,
    );
    i++;
  }

  return <div className="space-y-1">{elements}</div>;
}

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
};

type Props = {
  level?: string | null;
};

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'CMT Level I',
  LEVEL_2: 'CMT Level II',
  LEVEL_3: 'CMT Level III',
};

const SUGGESTIONS = [
  'Explain Dow Theory',
  'What is a Head & Shoulders pattern?',
  'How is RSI calculated?',
  'Explain support and resistance',
  'What is the Elliott Wave principle?',
];

export function ChatWidget({ level }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showCallout, setShowCallout] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setShowCallout(false);
    }
  }, [isOpen]);

  // Auto-hide callout after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowCallout(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const userText = text.trim();
      if (!userText || isLoading) return;

      setShowSuggestions(false);
      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: userText };
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);
      setInput('');
      setIsLoading(true);

      const history = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }));

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userText, level: level ?? null, history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const errMsg = data?.error?.message ?? 'Something went wrong. Please try again.';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: errMsg, isStreaming: false } : m,
            ),
          );
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const snapshot = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: snapshot, isStreaming: true } : m,
            ),
          );
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, isStreaming: false } : m,
          ),
        );
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Connection error. Please try again.', isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, level, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const levelLabel = level ? LEVEL_LABELS[level] : null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {isOpen && (
        <div className="flex h-[680px] w-[460px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-emerald-900 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Chartix AI</p>
                {levelLabel && (
                  <p className="text-[10px] text-zinc-400">{levelLabel} tutor</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center pb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                  <Bot className="h-7 w-7 text-zinc-400" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-900">Ask me anything about CMT</p>
                <p className="mt-1 text-xs text-zinc-500 max-w-[260px]">
                  I can explain concepts, chart patterns, indicators, and exam topics from your study notes.
                </p>

                {showSuggestions && (
                  <div className="mt-5 flex flex-col gap-2 w-full">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-left text-xs text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg, idx) => {
                // Find the preceding user message to use as "question" for feedback
                const prevUserMsg = idx > 0
                  ? [...messages].slice(0, idx).reverse().find((m) => m.role === 'user')
                  : null;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-900 text-white'
                          : 'bg-zinc-100 text-zinc-900'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <span className="text-[13px]">{msg.content}</span>
                      ) : msg.content ? (
                        <>
                          <MarkdownMessage content={msg.content} />
                          {msg.isStreaming && (
                            <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-zinc-500 align-middle" />
                          )}
                        </>
                      ) : msg.isStreaming ? (
                        <ThinkingDots />
                      ) : null}
                    </div>
                    {/* Feedback buttons — only on complete assistant messages */}
                    {msg.role === 'assistant' && !msg.isStreaming && msg.content && prevUserMsg && (
                      <div className="max-w-[88%] px-1">
                        <FeedbackButtons
                          botType="study"
                          question={prevUserMsg.content}
                          answer={msg.content}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-100 px-3 py-3">
            <div className="flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 focus-within:border-zinc-400 focus-within:bg-white transition">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about CMT concepts..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                style={{ maxHeight: '100px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-zinc-400">
              AI can make mistakes — verify important facts
            </p>
          </div>
        </div>
      )}

      {/* Callout bubble — shows when chat is closed */}
      {!isOpen && showCallout && (
        <div className="flex items-center gap-2 mb-1">
          <div className="relative rounded-2xl rounded-br-sm bg-emerald-900 px-4 py-2.5 shadow-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
              <p className="text-sm font-semibold text-white whitespace-nowrap">
                Got a CMT doubt? Ask me!
              </p>
              <button
                onClick={() => setShowCallout(false)}
                className="ml-1 rounded-full p-0.5 text-emerald-400 hover:text-white transition"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {/* Triangle tail pointing down-right */}
            <div className="absolute -bottom-2 right-5 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-900" />
          </div>
        </div>
      )}

      {/* Ping ring — only when closed */}
      {!isOpen && (
        <div className="absolute bottom-0 right-0 h-16 w-16 rounded-full bg-emerald-500 opacity-20 animate-ping pointer-events-none" />
      )}

      {/* Toggle button — bigger */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-800 text-white shadow-xl transition hover:bg-emerald-700 hover:scale-105 active:scale-95"
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
      >
        {isOpen ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-7 w-7" />
        )}
      </button>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-bounce" />
    </span>
  );
}
