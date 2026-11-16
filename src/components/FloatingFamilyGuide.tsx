import React, { useRef, useState } from 'react';
import { MessageSquare, Send, ShieldAlert, X, Maximize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LanguagePreference } from '../types/family';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestEscalation?: boolean;
}

interface FloatingFamilyGuideProps {
  onOpenFullGuide?: () => void;
  onPromptSignIn?: () => void;
}

const QUICK_QUESTIONS: Record<LanguagePreference, string[]> = {
  en: [
    'How does Family Head registration work?',
    'Explain every registration form field.',
    'How do members receive login accounts?',
  ],
  ur: [
    'خاندان کے سربراہ (Family Head) کا نظام کیسے کام کرتا ہے؟',
    'رجسٹریشن فارم کے خانوں کی وضاحت کریں۔',
  ],
  roman_ur: [
    'Family Head registration system kaise kaam karta hai?',
    'Member login account kaise milta hai?',
  ],
};

export const FloatingFamilyGuide: React.FC<FloatingFamilyGuideProps> = ({
  onOpenFullGuide,
  onPromptSignIn,
}) => {
  const {
    user,
    userProfile,
    language,
    setLanguage,
    branches,
    members,
    registrations,
    publicStats,
    submitEscalation,
  } = useAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am FamilyGuide AI. Ask me about Family Head registration, connecting parents and branches, member login accounts, or registration status in English, اردو, or Roman Urdu.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [escalateDone, setEscalateDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const myLatestReg = user ? registrations.find((r) => r.applicantUid === user.uid) : undefined;

  const sendMessage = async (textOverride?: string) => {
    const content = (textOverride ?? input).trim();
    if (!content || loading) return;

    setError('');
    setEscalateDone(false);
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
            userName: userProfile?.displayName || user?.displayName || 'Visitor',
            registrationStatus: myLatestReg?.status || (user ? 'None submitted' : 'Not signed in'),
            reviewNote: myLatestReg?.reviewNote || '',
            branches: branches.map((b) => ({
              id: b.id,
              name: b.name,
              founderPairLabel: b.founderPairLabel,
            })),
            sampleFounders:
              members.length > 0
                ? members.slice(0, 10).map((m) => ({
                    fullName: m.fullName,
                    generation: m.generation,
                    branchName: m.branchName,
                  }))
                : publicStats?.familyHeadName
                  ? [
                      {
                        fullName: publicStats.familyHeadName,
                        generation: 0,
                        branchName: publicStats.familyHeadBranch || 'Founding Lineage',
                      },
                    ]
                  : [],
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'FamilyGuide AI request failed.');

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
      }, 40);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to reach FamilyGuide AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickEscalate = async () => {
    if (!user) {
      setOpen(false);
      onPromptSignIn?.();
      return;
    }
    const summary = messages
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n')
      .slice(0, 1800);
    await submitEscalation({
      topic: 'Floating FamilyGuide AI Escalation',
      conversationSummary: summary,
    });
    setEscalateDone(true);
  };

  return (
    <div className="no-print fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[480px] max-h-[75vh] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-[#C99A2E]/40 bg-white/95 shadow-2xl backdrop-blur-md dark:border-[#D4AF37]/35 dark:bg-[#0B172A]/95 sm:w-[390px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#0F2342] px-4 py-3 text-white dark:border-[#1E3252]">
            <div>
              <p className="font-display text-sm font-semibold text-[#F8FAFC]">FamilyGuide AI</p>
              <p className="text-[11px] text-[#D4AF37]">English · اردو · Roman Urdu</p>
            </div>
            <div className="flex items-center gap-1.5">
              {onOpenFullGuide && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onOpenFullGuide();
                  }}
                  aria-label="Open full FamilyGuide AI workspace"
                  className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close FamilyGuide AI assistant"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[#FAF9F6] px-3 py-2 dark:border-[#1E3252] dark:bg-[#081120]">
            <div className="flex items-center gap-1">
              {([
                { id: 'en', label: 'English' },
                { id: 'ur', label: 'اردو' },
                { id: 'roman_ur', label: 'Roman Urdu' },
              ] as const).map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setLanguage(lang.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                    language === lang.id
                      ? 'bg-[#0F2342] text-white dark:bg-[#D4AF37] dark:text-[#081120]'
                      : 'text-[#64748B] hover:text-[#0F2342] dark:text-[#94A3B8] dark:hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleQuickEscalate()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9A7214] hover:underline dark:text-[#D4AF37] cursor-pointer"
            >
              <ShieldAlert className="h-3 w-3" />
              {user ? 'Escalate' : 'Admin Help'}
            </button>
          </div>

          {escalateDone && (
            <div className="bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Escalated to the Family Head &amp; Administrators.
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3.5">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_QUESTIONS[language].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendMessage(q)}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FAF9F6] px-2.5 py-1 text-left text-[11px] text-[#334155] hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#CBD5E1] cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {messages.map((m, i) => {
              const isRtl = /[\u0600-\u06FF]/.test(m.content);
              return (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    dir={isRtl ? 'rtl' : 'ltr'}
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#0F2342] text-white dark:bg-[#D4AF37] dark:text-[#081120]'
                        : 'border border-[#E2E8F0] bg-[#FAF9F6] text-[#0F2342] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#F8FAFC]'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                FamilyGuide AI is responding...
              </div>
            )}
          </div>

          {error && (
            <div className="border-t border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex items-center gap-2 border-t border-[#E2E8F0] bg-[#FAF9F6] p-2.5 dark:border-[#1E3252] dark:bg-[#081120]"
          >
            <input
              type="text"
              dir={language === 'ur' ? 'rtl' : 'ltr'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === 'ur'
                  ? 'اپنا سوال لکھیں...'
                  : language === 'roman_ur'
                    ? 'Apna sawal likhein...'
                    : 'Ask FamilyGuide AI...'
              }
              className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#F8FAFC]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2342] text-white disabled:opacity-50 dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/60 bg-[#0F2342] px-4 py-3 text-xs font-semibold text-white shadow-xl transition-transform hover:scale-[1.02] dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
      >
        <MessageSquare className="h-4 w-4 text-[#D4AF37] dark:text-[#081120]" />
        <span className="whitespace-nowrap">{open ? 'Close Guide' : 'FamilyGuide AI'}</span>
      </button>
    </div>
  );
};
