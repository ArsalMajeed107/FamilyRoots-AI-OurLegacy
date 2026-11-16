import React, { useRef, useState } from 'react';
import { AlertCircle, ArrowUpRight, Send, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguagePreference } from '../types/family';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestEscalation?: boolean;
}

const STARTER_PROMPTS: Record<LanguagePreference, string[]> = {
  en: [
    'Explain every field in the family registration form.',
    'How do I connect myself to my parents or grandparents without mistakes?',
    'Which family branches currently exist, and how do I join one?',
    'Why is my registration status pending or rejected?',
  ],
  ur: [
    'براہ کرم خاندانی رجسٹریشن فارم کے تمام خانوں کی وضاحت کریں۔',
    'میں اپنے والدین اور دادا دادی کے ساتھ رشتہ کیسے جوڑوں؟',
    'میری رجسٹریشن زیر التوا یا مسترد کیوں ہو سکتی ہے؟',
  ],
  roman_ur: [
    'Family registration form ke har field ki tafseel batayein.',
    'Main apne walidain aur dada dadi se rishta kaise link karoon?',
    'Meri registration pending ya reject kyun ho sakti hai?',
  ],
};

export const FamilyGuideChat: React.FC = () => {
  const { user, userProfile, language, setLanguage, branches, members, registrations, submitEscalation } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to FamilyGuide AI. I can explain registration fields, guide you in selecting your parents and family branch, and answer questions in English, اردو (Urdu), or Roman Urdu. For data integrity, I never invent relationships or approve applications—an administrator verifies every link.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateTopic, setEscalateTopic] = useState('');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalateSent, setEscalateSent] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const myLatestReg = registrations.find((r) => r.applicantUid === user?.uid);

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || loading) return;

    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    if (!textOverride) setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          context: {
            language,
            userName: userProfile?.displayName || user?.displayName || 'Family Member',
            registrationStatus: myLatestReg?.status || 'None submitted',
            reviewNote: myLatestReg?.reviewNote || '',
            branches: branches.map((b) => ({
              id: b.id,
              name: b.name,
              founderPairLabel: b.founderPairLabel,
            })),
            sampleFounders: members.slice(0, 12).map((m) => ({
              fullName: m.fullName,
              generation: m.generation,
              branchName: m.branchName,
            })),
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'FamilyGuide AI request failed.');
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          suggestEscalation: Boolean(data.suggestEscalation),
        },
      ]);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 50);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to connect to FamilyGuide AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateTopic.trim()) return;
    const summary =
      escalateNotes.trim() ||
      messages
        .slice(-4)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
        .slice(0, 1800);

    await submitEscalation({
      topic: escalateTopic,
      conversationSummary: summary,
    });
    setEscalateSent(true);
    setEscalateOpen(false);
    setEscalateTopic('');
    setEscalateNotes('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
        <div>
          <p className="text-xs font-medium text-[#9A7214] dark:text-[#D4AF37]">
            Multilingual Genealogy Assistant
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
            FamilyGuide AI
          </h1>
          <p className="mt-1 text-sm text-[#475569] dark:text-[#94A3B8]">
            Guided registration, branch discovery, and troubleshooting in English, Urdu, and Roman Urdu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F9] p-1 dark:bg-[#0F1D33]">
            {([
              { id: 'en', label: 'English' },
              { id: 'ur', label: 'اردو' },
              { id: 'roman_ur', label: 'Roman Urdu' },
            ] as const).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  language === lang.id
                    ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#D4AF37]'
                    : 'text-[#64748B] dark:text-[#94A3B8]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setEscalateSent(false);
              setEscalateOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#C99A2E]/60 px-3.5 py-2 text-xs font-semibold text-[#9A7214] hover:bg-[#FFFBF0] dark:border-[#D4AF37]/50 dark:text-[#D4AF37] dark:hover:bg-[#132542] cursor-pointer"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Escalate to Admin
          </button>
        </div>
      </div>

      {escalateSent && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          Your case has been escalated to the family administrators. You can review their reply in your Dashboard once resolved.
        </div>
      )}

      {escalateOpen && (
        <form
          onSubmit={handleEscalateSubmit}
          className="space-y-3 rounded-xl border border-[#C99A2E]/50 bg-white p-5 dark:border-[#D4AF37]/40 dark:bg-[#0F1D33]"
        >
          <h2 className="font-display text-base font-semibold">Escalate Complex Case to Administrator</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            Use this for disputed parentage, duplicate profile resolution, or merging historical branches.
          </p>
          <input
            type="text"
            required
            value={escalateTopic}
            onChange={(e) => setEscalateTopic(e.target.value)}
            placeholder="Brief subject (e.g., Missing great-grandfather record in Branch A)"
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
          />
          <textarea
            rows={3}
            value={escalateNotes}
            onChange={(e) => setEscalateNotes(e.target.value)}
            placeholder="Add details for the administrator..."
            className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEscalateOpen(false)}
              className="rounded-lg border border-[#CBD5E1] px-3.5 py-1.5 text-xs font-medium dark:border-[#1E3252] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#0F2342] px-4 py-1.5 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              Submit Escalation
            </button>
          </div>
        </form>
      )}

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS[language].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs text-[#334155] hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#CBD5E1] dark:hover:border-[#D4AF37] cursor-pointer"
          >
            <span dir={language === 'ur' ? 'rtl' : 'ltr'}>{prompt}</span>
            <ArrowUpRight className="h-3 w-3 text-[#C99A2E]" />
          </button>
        ))}
      </div>

      {/* Chat Viewport */}
      <div className="flex h-[480px] flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.map((msg, idx) => {
            const isUrdu = /[\u0600-\u06FF]/.test(msg.content);
            return (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  dir={isUrdu ? 'rtl' : 'ltr'}
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#0F2342] text-white dark:bg-[#D4AF37] dark:text-[#081120]'
                      : 'border border-[#E2E8F0] bg-[#FAF9F6] text-[#0F2342] dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#F8FAFC]'
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.suggestEscalation && (
                    <button
                      type="button"
                      onClick={() => setEscalateOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#9A7214] underline dark:text-[#D4AF37] cursor-pointer"
                    >
                      Escalate this case to an Administrator
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-xl border border-[#E2E8F0] bg-[#FAF9F6] px-4 py-2.5 text-xs text-[#64748B] dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#94A3B8]">
                FamilyGuide AI is composing guidance...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="flex items-center gap-3 border-t border-[#E2E8F0] bg-[#FAF9F6] p-3 dark:border-[#1E3252] dark:bg-[#081120]"
        >
          <input
            type="text"
            dir={language === 'ur' ? 'rtl' : 'ltr'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === 'ur'
                ? 'اپنا سوال اردو میں لکھیں...'
                : language === 'roman_ur'
                  ? 'Apna sawal Roman Urdu mein likhein...'
                  : 'Ask about registration fields, branches, or pending requests...'
            }
            className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#F8FAFC]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#193561] disabled:opacity-50 dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
