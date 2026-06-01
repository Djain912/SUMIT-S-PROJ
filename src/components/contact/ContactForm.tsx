'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

type QueryType = 'GENERAL' | 'COURSE_INFO' | 'TECHNICAL_SUPPORT' | 'BILLING' | 'PARTNERSHIP' | 'OTHER';

const QUERY_OPTIONS: { value: QueryType; label: string }[] = [
  { value: 'GENERAL', label: 'General Enquiry' },
  { value: 'COURSE_INFO', label: 'Course Information' },
  { value: 'TECHNICAL_SUPPORT', label: 'Technical Support' },
  { value: 'BILLING', label: 'Billing / Payment' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'OTHER', label: 'Other' },
];

const INITIAL = {
  fullName: '',
  email: '',
  mobile: '',
  subject: '',
  queryType: '' as QueryType | '',
  message: '',
  website: '', // honeypot
};

type FieldErrors = Partial<Record<keyof typeof INITIAL, string>>;

export function ContactForm() {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  }

  function validate(): boolean {
    const newErrors: FieldErrors = {};

    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      newErrors.fullName = 'Please enter your full name (at least 2 characters)';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRegex.test(form.email.trim()))
      newErrors.email = 'Please enter a valid email address';

    if (!form.queryType)
      newErrors.queryType = 'Please select a query type';

    if (!form.subject.trim() || form.subject.trim().length < 3)
      newErrors.subject = 'Please enter a subject (at least 3 characters)';

    if (!form.message.trim() || form.message.trim().length < 10)
      newErrors.message = 'Please write a message (at least 10 characters)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          mobile: form.mobile.trim() || null,
          subject: form.subject.trim(),
          queryType: form.queryType,
          message: form.message.trim(),
          website: form.website, // honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setServerError(data?.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-zinc-950">Message sent!</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Thanks for reaching out. We&apos;ll get back to you within 1–2 business days. Check your inbox for a confirmation email.
          </p>
        </div>
        <button
          onClick={() => { setForm(INITIAL); setSubmitted(false); }}
          className="mt-2 rounded-full border border-zinc-200 px-5 py-2 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h2 className="text-xl font-bold text-zinc-950">Send us a message</h2>
      <p className="mt-1 text-sm text-zinc-500">We reply within 1–2 business days.</p>

      {/* Honeypot — hidden from humans */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={handleChange}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] opacity-0"
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {/* Full Name */}
        <div className="sm:col-span-2 sm:grid sm:grid-cols-2 sm:gap-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Sumit Jain"
              className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition ${
                errors.fullName ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-white'
              }`}
            />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="sumit@example.com"
              className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition ${
                errors.email ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-white'
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>
        </div>

        {/* Mobile (optional) */}
        <div>
          <label htmlFor="mobile" className="block text-sm font-medium text-zinc-700">
            Mobile <span className="text-zinc-400 text-xs font-normal">(optional)</span>
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            value={form.mobile}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
          />
        </div>

        {/* Query Type */}
        <div>
          <label htmlFor="queryType" className="block text-sm font-medium text-zinc-700">
            Query Type <span className="text-red-500">*</span>
          </label>
          <select
            id="queryType"
            name="queryType"
            value={form.queryType}
            onChange={handleChange}
            className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition ${
              errors.queryType ? 'border-red-400 bg-red-50 text-zinc-900' : 'border-zinc-200 bg-white text-zinc-900'
            } ${!form.queryType ? 'text-zinc-400' : ''}`}
          >
            <option value="" disabled>Select a type...</option>
            {QUERY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {errors.queryType && <p className="mt-1 text-xs text-red-600">{errors.queryType}</p>}
        </div>

        {/* Subject */}
        <div className="sm:col-span-2">
          <label htmlFor="subject" className="block text-sm font-medium text-zinc-700">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            value={form.subject}
            onChange={handleChange}
            placeholder="What's this about?"
            className={`mt-1.5 w-full rounded-xl border px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition ${
              errors.subject ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-white'
            }`}
          />
          {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject}</p>}
        </div>

        {/* Message */}
        <div className="sm:col-span-2">
          <label htmlFor="message" className="block text-sm font-medium text-zinc-700">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={form.message}
            onChange={handleChange}
            placeholder="Tell us more..."
            className={`mt-1.5 w-full resize-none rounded-xl border px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition ${
              errors.message ? 'border-red-400 bg-red-50' : 'border-zinc-200 bg-white'
            }`}
          />
          <div className="mt-1 flex items-start justify-between">
            {errors.message ? (
              <p className="text-xs text-red-600">{errors.message}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-zinc-400">{form.message.length}/3000</p>
          </div>
        </div>
      </div>

      {serverError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send Message
          </>
        )}
      </button>

      <p className="mt-3 text-center text-xs text-zinc-400">
        We&apos;ll never share your information with third parties.
      </p>
    </form>
  );
}
