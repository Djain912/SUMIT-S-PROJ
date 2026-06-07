"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, MessageCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { FeedbackButtons } from '@/components/chat/FeedbackButtons';
import { cleanLatex } from '@/lib/clean-latex';

type Message = { role: 'user' | 'assistant'; content: string };

// ── Markdown renderer (handles bold, bullets, numbered lists, line breaks) ──
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function MarkdownMessage({ text }: { text: string }) {
  const blocks = cleanLatex(text).split(/\n\n+/);
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');

        const isBulletList = lines.length > 0 && lines.every((l) => /^[-•*]\s/.test(l.trim()));
        if (isBulletList) {
          return (
            <ul key={bi} className="space-y-1 pl-1">
              {lines.map((line, li) => (
                <li key={li} className="flex items-start gap-2">
                  <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                  <span>{renderInline(line.replace(/^[-•*]\s+/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        const isNumberedList = lines.length > 0 && lines.every((l) => /^\d+\.\s/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={bi} className="space-y-1 pl-1">
              {lines.map((line, li) => {
                const match = line.match(/^(\d+)\.\s+(.*)/);
                return (
                  <li key={li} className="flex items-start gap-2">
                    <span className="shrink-0 font-semibold text-zinc-500 text-xs mt-[2px]">{match?.[1]}.</span>
                    <span>{renderInline(match?.[2] ?? line)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        if (lines.length > 1) {
          return (
            <div key={bi} className="space-y-1">
              {lines.map((line, li) => {
                if (/^[-•*]\s/.test(line.trim())) {
                  return (
                    <div key={li} className="flex items-start gap-2">
                      <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                      <span>{renderInline(line.replace(/^[-•*]\s+/, ''))}</span>
                    </div>
                  );
                }
                if (/^\d+\.\s/.test(line.trim())) {
                  const match = line.match(/^(\d+)\.\s+(.*)/);
                  return (
                    <div key={li} className="flex items-start gap-2">
                      <span className="shrink-0 font-semibold text-zinc-500 text-xs mt-[2px]">{match?.[1]}.</span>
                      <span>{renderInline(match?.[2] ?? line)}</span>
                    </div>
                  );
                }
                return <p key={li}>{renderInline(line)}</p>;
              })}
            </div>
          );
        }

        return <p key={bi}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! 👋 I'm the Chartix CMT Exam Bot — trained on official CMT content. Ask me about exam structure, fees, eligibility, career opportunities, or what each level covers!",
};

const QUICK_QUESTIONS = [
  'How many levels in CMT?',
  'What topics does CMT Level 1 cover?',
  'What are the exam fees?',
  'Career opportunities after CMT?',
];

export function HomepageChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showCallout, setShowCallout] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when panel opens; hide callout once user opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setHasNewMessage(false);
      setShowCallout(false);
    }
  }, [isOpen]);

  // Auto-hide callout after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowCallout(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || isLoading) return;

    setInput('');
    const history = messages.slice(-6);

    setMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: err.error?.message ?? 'Something went wrong. Please try again.' },
        ]);
        return;
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk };
          return updated;
        });
      }

      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, isOpen]);

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showQuickQuestions = messages.length === 1;

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-4 sm:right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-900/15 transition-all duration-200 ease-out ${
          isOpen
            ? 'pointer-events-auto w-[340px] sm:w-[400px] h-[540px] opacity-100 translate-y-0'
            : 'pointer-events-none w-[340px] sm:w-[400px] h-[540px] opacity-0 translate-y-4'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 bg-emerald-800 px-4 py-3.5 text-white">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600/60 ring-1 ring-white/20">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold leading-tight">Chartix CMT Exam Bot</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[11px] text-emerald-300">CMT-trained · Exam info only</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="shrink-0 rounded-lg p-1.5 text-emerald-300 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((msg, i) => {
            const prevUserMsg = i > 0
              ? [...messages].slice(0, i).reverse().find((m) => m.role === 'user')
              : null;
            const isLastStreaming = msg.content === '' && isLoading && i === messages.length - 1;
            const isComplete = msg.role === 'assistant' && !isLoading && msg.content && i === messages.length - 1;

            return (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                  {msg.role === 'assistant' && (
                    <div className="mr-2 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <TrendingUp className="h-3 w-3 text-emerald-700" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-emerald-700 text-white rounded-br-sm'
                        : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                    }`}
                  >
                    {isLastStreaming ? (
                      <span className="inline-flex items-center gap-1 py-0.5">
                        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                      </span>
                    ) : msg.role === 'assistant' ? (
                      <MarkdownMessage text={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
                {isComplete && prevUserMsg && (
                  <div className="ml-8 mt-0.5">
                    <FeedbackButtons
                      botType="public"
                      question={prevUserMsg.content}
                      answer={msg.content}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick question chips */}
        {showQuickQuestions && !isLoading && (
          <div className="shrink-0 px-4 pb-3 flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-900"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-zinc-100 px-3 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about CMT exam…"
              maxLength={500}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:opacity-50 transition"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white transition hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-zinc-400">
            Chartix CMT Bot · Powered by AI · Exam info only
          </p>
        </div>
      </div>

      {/* ── Callout label (shows when chat is closed) ── */}
      {!isOpen && showCallout && (
        <div className="fixed bottom-[5.5rem] right-[4.5rem] sm:right-[5rem] z-50">
          <div className="relative flex items-center gap-2 rounded-2xl rounded-br-sm bg-emerald-800 px-4 py-2.5 shadow-lg">
            <span className="text-sm font-semibold text-white whitespace-nowrap">
              👋 Here to help!
            </span>
            <button
              onClick={() => setShowCallout(false)}
              className="ml-1 rounded-full p-0.5 text-emerald-300 hover:text-white transition"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 right-4 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-emerald-800" />
          </div>
        </div>
      )}

      {/* ── Floating bubble (bigger) ── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-5 right-4 sm:right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-emerald-800 shadow-emerald-800/20'
            : 'bg-emerald-700 shadow-emerald-700/40 hover:bg-emerald-600'
        }`}
        aria-label={isOpen ? 'Close CMT Exam Bot' : 'Open CMT Exam Bot'}
      >
        {isOpen ? (
          <X className="h-7 w-7 text-white" />
        ) : (
          <>
            <MessageCircle className="h-7 w-7 text-white" />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                1
              </span>
            )}
          </>
        )}
      </button>

      {/* Pulse ring */}
      {!isOpen && (
        <div className="fixed bottom-5 right-4 sm:right-6 z-40 h-16 w-16 rounded-full bg-emerald-500 opacity-20 animate-ping pointer-events-none" />
      )}
    </>
  );
}
