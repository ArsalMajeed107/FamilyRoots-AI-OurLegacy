import React, { useState } from 'react';
import {
  ArrowRight,
  Crown,
  GitBranch,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  Trees,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getInitials } from '../lib/imageUtils';
import { LiveHeritageBackground } from './LiveHeritageBackground';
import { FloatingFamilyGuide } from './FloatingFamilyGuide';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, registerWithEmail, theme, toggleTheme, publicStats } = useAuth();
  const [authMode, setAuthMode] = useState<'google' | 'email_signin' | 'email_signup'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const focusAccessPortal = (hint?: string) => {
    if (hint) setInfoMsg(hint);
    const el = document.getElementById('access');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim() || password.length < 6) {
      setErrorMsg('Please enter a valid email address and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (authMode === 'email_signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password);
        setInfoMsg(
          'Account created. Check your inbox for the verification link so you can submit registrations or claim your member profile.',
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed.';
      if (msg.includes('operation-not-allowed')) {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in Firebase Console (Authentication -> Sign-in method -> Email/Password). Please use Continue with Google below for instant verified access.',
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const totalMembers = publicStats?.totalMembers ?? 0;
  const totalGenerations = publicStats?.totalGenerations ?? 0;
  const totalBranches = publicStats?.totalBranches ?? 0;

  return (
    <div className="relative min-h-screen text-[#0F2342] dark:text-[#F8FAFC]">
      <LiveHeritageBackground intense />

      {/* Glassmorphic 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0]/70 bg-[#FAF9F6]/75 backdrop-blur-md dark:border-[#1E3252]/80 dark:bg-[#081120]/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          <a
            href="#top"
            className="font-display text-xl font-semibold tracking-tight text-[#0F2342] dark:text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            OurLegacy
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155] dark:text-[#CBD5E1]">
            <a href="#family-head" className="hover:text-[#0F2342] dark:hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0">
              Family Head
            </a>
            <a href="#lineage" className="hover:text-[#0F2342] dark:hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0">
              Stewardship
            </a>
            <a href="#heritage-gallery" className="hover:text-[#0F2342] dark:hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0">
              Heritage Gallery
            </a>
            <a href="#access" className="hover:text-[#0F2342] dark:hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0">
              Member Portal
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#CBD5E1]/70 bg-white/70 text-[#0F2342] backdrop-blur-sm hover:bg-white dark:border-[#1E3252] dark:bg-[#0F1D33]/80 dark:text-[#F8FAFC] cursor-pointer"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-[#D4AF37]" />}
            </button>
            <button
              type="button"
              onClick={() => focusAccessPortal()}
              className="inline-flex items-center justify-center rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193561] dark:bg-[#D4AF37] dark:text-[#081120] dark:hover:bg-[#E2C052] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        {/* Hero Visual Experience */}
        <section id="top" className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            {/* Left: Main Headline, Live Counters & Primary Actions */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div>
                <p className="text-xs font-semibold tracking-wide text-[#9A7214] dark:text-[#D4AF37]">
                  FamilyRoots AI · One Family, One History, Countless Generations
                </p>

                <h1
                  className="font-display mt-4 font-semibold leading-[1.12] tracking-tight text-[#0F2342] dark:text-[#F8FAFC]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.65rem)', textWrap: 'balance' }}
                >
                  Every Family Has a Story. Preserve Yours Forever.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#334155] dark:text-[#CBD5E1] sm:text-lg">
                  Connect generations, preserve family heritage, and bring your entire family together in one digital platform.
                </p>

                {/* Primary Actions */}
                <div className="mt-7 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() =>
                      focusAccessPortal(
                        'Sign in with your Google account or invited family email to explore the live 2D & 3D Family Tree.',
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0F2342] px-6 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#193561] dark:bg-[#D4AF37] dark:text-[#081120] dark:hover:bg-[#E2C052] whitespace-nowrap cursor-pointer"
                  >
                    <Trees className="h-4 w-4" />
                    Explore Family Tree
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      focusAccessPortal(
                        'Sign in to submit your family registration to the Main Family Head or claim your pre-registered member profile.',
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-[#C99A2E] bg-white/80 px-6 py-3 text-sm font-semibold text-[#0F2342] backdrop-blur-md transition-colors hover:bg-white dark:border-[#D4AF37] dark:bg-[#0F1D33]/80 dark:text-[#D4AF37] dark:hover:bg-[#162742] whitespace-nowrap cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Family Registration
                  </button>
                </div>
              </div>

              {/* Real Live Database Counters */}
              <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-4 backdrop-blur-md dark:border-[#1E3252]/90 dark:bg-[#0F1D33]/80">
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <Users className="h-3.5 w-3.5 text-[#C99A2E]" />
                    <span>Total Family Members</span>
                  </div>
                  <p className="font-mono mt-2 text-2xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC] sm:text-3xl">
                    {totalMembers}
                  </p>
                </div>

                <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-4 backdrop-blur-md dark:border-[#1E3252]/90 dark:bg-[#0F1D33]/80">
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <Trees className="h-3.5 w-3.5 text-[#C99A2E]" />
                    <span>Generations</span>
                  </div>
                  <p className="font-mono mt-2 text-2xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC] sm:text-3xl">
                    {totalGenerations}
                  </p>
                </div>

                <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-4 backdrop-blur-md dark:border-[#1E3252]/90 dark:bg-[#0F1D33]/80">
                  <div className="flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    <GitBranch className="h-3.5 w-3.5 text-[#C99A2E]" />
                    <span>Family Branches</span>
                  </div>
                  <p className="font-mono mt-2 text-2xl font-semibold tabular-nums text-[#9A7214] dark:text-[#D4AF37] sm:text-3xl">
                    {totalBranches}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Member Access & Registration Portal */}
            <div className="flex flex-col justify-between lg:col-span-5">
              <div
                id="access"
                className="flex h-full flex-col justify-between rounded-2xl border border-[#C99A2E]/35 bg-white/85 p-6 shadow-xl backdrop-blur-md dark:border-[#D4AF37]/30 dark:bg-[#0F1D33]/85"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                        Member Access Portal
                      </h2>
                      <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                        Sign in to access your profile, tree, or Family Head console
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F9]/90 p-1 dark:bg-[#081120]/90">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('google');
                          setErrorMsg('');
                        }}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          authMode === 'google'
                            ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#F8FAFC]'
                            : 'text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        Google
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('email_signin');
                          setErrorMsg('');
                        }}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          authMode === 'email_signin'
                            ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#F8FAFC]'
                            : 'text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        Email Login
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('email_signup');
                          setErrorMsg('');
                        }}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          authMode === 'email_signup'
                            ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#F8FAFC]'
                            : 'text-[#64748B] dark:text-[#94A3B8]'
                        }`}
                      >
                        New Account
                      </button>
                    </div>
                  </div>

                  {infoMsg && (
                    <div className="mt-4 rounded-lg border border-[#C99A2E]/40 bg-[#FFFBF0] px-3.5 py-2.5 text-xs text-[#7A590C] dark:bg-[#132542] dark:text-[#D4AF37]">
                      {infoMsg}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                      {errorMsg}
                    </div>
                  )}

                  {authMode === 'google' ? (
                    <div className="mt-6 space-y-4">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void handleGoogleSignIn()}
                        className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#0F2342] px-5 py-3 text-sm font-semibold text-white hover:bg-[#193561] disabled:opacity-60 dark:bg-[#D4AF37] dark:text-[#081120] dark:hover:bg-[#E2C052] transition-colors cursor-pointer"
                      >
                        <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                      <p className="text-xs leading-relaxed text-[#475569] dark:text-[#CBD5E1]">
                        If the Main Family Head already added you to the tree using your email address, signing in with
                        that verified email will automatically link your personal login account to your profile.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailAuth} className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="member@family.org"
                            className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-sm text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#F8FAFC]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-9 pr-3 text-sm text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#F8FAFC]"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 rounded-lg bg-[#0F2342] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#193561] disabled:opacity-60 dark:bg-[#D4AF37] dark:text-[#081120] transition-colors cursor-pointer"
                        >
                          {loading ? 'Processing...' : authMode === 'email_signin' ? 'Sign In' : 'Create Account'}
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void handleGoogleSignIn()}
                          className="rounded-lg border border-[#CBD5E1] px-4 py-2.5 text-xs font-semibold text-[#0F2342] hover:bg-[#F1F4F9] dark:border-[#1E3252] dark:text-[#F8FAFC] dark:hover:bg-[#162742] transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Or Google
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Heritage Crest Signpost */}
                <div className="mt-6 flex items-center gap-3.5 border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252]">
                  <img
                    src="/src/assets/images/crest_ourlegacy_emblem_1794849068401.jpg"
                    alt="OurLegacy family heritage emblem"
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 shrink-0 rounded-lg border border-[#C99A2E]/60 object-cover"
                  />
                  <p className="text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                    Every relationship is verified by the Main Family Head or an authorized Branch Administrator—never guessed automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Family Head Profile Section */}
          <div
            id="family-head"
            className="mt-10 rounded-2xl border border-[#C99A2E]/40 bg-white/80 p-6 backdrop-blur-md dark:border-[#D4AF37]/30 dark:bg-[#0F1D33]/80 sm:p-8"
          >
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="flex items-center gap-5 lg:col-span-5">
                {publicStats?.familyHeadPhotoUrl ? (
                  <img
                    src={publicStats.familyHeadPhotoUrl}
                    alt={publicStats.familyHeadName || 'Main Family Head'}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 shrink-0 rounded-2xl border-2 border-[#C99A2E] object-cover shadow-md sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-2 border-[#C99A2E] bg-[#0F2342] font-display text-2xl font-semibold text-[#D4AF37] shadow-md sm:h-28 sm:w-28">
                    {publicStats?.familyHeadName ? (
                      getInitials(publicStats.familyHeadName)
                    ) : (
                      <Crown className="h-9 w-9 text-[#D4AF37]" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                    <Crown className="h-3.5 w-3.5" />
                    <span>Main Family Head</span>
                  </div>
                  <h2 className="font-display mt-1 text-2xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                    {publicStats?.familyHeadName || 'Founding Patriarch / Family Head'}
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
                    {publicStats?.familyHeadName
                      ? `${publicStats.familyHeadTitle || 'Generation 0'} · ${publicStats.familyHeadBranch || 'Founding Lineage'}${
                          publicStats.familyHeadOrigin ? ` · ${publicStats.familyHeadOrigin}` : ''
                        }`
                      : 'Sign in as Administrator to establish the Founding Grandfather & Grandmother'}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252] lg:col-span-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <p className="text-sm leading-relaxed text-[#334155] dark:text-[#CBD5E1]">
                  {publicStats?.familyHeadBio ||
                    'OurLegacy follows a verified Family Head governance model. One designated Main Family Head anchors the lineage, creates branches, adds sons, daughters, spouses, and grandchildren, and issues verified login accounts to family members.'}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  <span>Verified Parent-Child Links</span>
                  <span aria-hidden="true">·</span>
                  <span>Branch Administrator Controls</span>
                  <span aria-hidden="true">·</span>
                  <span>Individual Member Accounts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full-Width 4-Column Capability Strip */}
          <div id="lineage" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/80">
              <p className="font-mono text-xs text-[#9A7214] dark:text-[#D4AF37]">01 · Family Head</p>
              <h3 className="mt-2 text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Head-Guided Lineage
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                The designated Main Family Head and Branch Admins add sons, daughters, spouses, and grandchildren accurately.
              </p>
            </div>
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/80">
              <p className="font-mono text-xs text-[#9A7214] dark:text-[#D4AF37]">02 · Member Accounts</p>
              <h3 className="mt-2 text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Invited Login Access
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                Added family members receive individual login invitations to claim and manage their own permitted profile.
              </p>
            </div>
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/80">
              <p className="font-mono text-xs text-[#9A7214] dark:text-[#D4AF37]">03 · Live Family Tree</p>
              <h3 className="mt-2 text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Auto-Updating 2D &amp; 3D Tree
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                Every newly added member updates the interactive 2D chart, 3D heritage constellation, and PDF exports live.
              </p>
            </div>
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/80 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/80">
              <p className="font-mono text-xs text-[#9A7214] dark:text-[#D4AF37]">04 · FamilyGuide AI</p>
              <h3 className="mt-2 text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Multilingual Assistant
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#475569] dark:text-[#94A3B8]">
                Always-available floating guidance in English, Urdu (اردو), and Roman Urdu with Admin escalation.
              </p>
            </div>
          </div>
        </section>

        {/* Heritage Photographs & Stewardship Editorial Section */}
        <section
          id="heritage-gallery"
          className="border-t border-[#E2E8F0]/70 bg-white/70 py-14 backdrop-blur-md dark:border-[#1E3252]/80 dark:bg-[#0B1629]/75"
        >
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
            <div className="flex flex-col justify-center lg:col-span-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                <ShieldCheck className="h-4 w-4" />
                <span>Verified Family Stewardship</span>
              </div>
              <h2 className="font-display mt-3 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Designed to honor elders and connect future generations.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#334155] dark:text-[#CBD5E1]">
                Ordinary members cannot invent unverified relationships or alter family branches on their own. Every
                lineage link is confirmed by the Main Family Head or an appointed Branch Administrator, safeguarding
                family history for decades to come.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
              <div className="group relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0F2342] dark:border-[#1E3252]">
                <img
                  src="/src/assets/images/hero_heritage_estate_1794849066720.jpg"
                  alt="Ancestral heritage archive study"
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081120]/85 via-[#081120]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-[11px] font-medium text-[#D4AF37]">Ancestral Archive</p>
                  <p className="mt-0.5 text-sm font-semibold">Founding Records</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0F2342] dark:border-[#1E3252]">
                <img
                  src="/src/assets/images/story_founding_archive_1794849067579.jpg"
                  alt="Heirloom family chronicle book and photographs"
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081120]/85 via-[#081120]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-[11px] font-medium text-[#D4AF37]">Chronicles</p>
                  <p className="mt-0.5 text-sm font-semibold">Generational Stories</p>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#0F2342] dark:border-[#1E3252]">
                <img
                  src="/src/assets/images/gallery_reunion_courtyard_1794849068426.jpg"
                  alt="Multi-generational family reunion gathering"
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#081120]/85 via-[#081120]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-[11px] font-medium text-[#D4AF37]">Milestones</p>
                  <p className="mt-0.5 text-sm font-semibold">Reunions &amp; Gallery</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-[#E2E8F0]/70 bg-[#FAF9F6]/80 py-8 backdrop-blur-md dark:border-[#1E3252]/80 dark:bg-[#081120]/80">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-[#64748B] sm:flex-row sm:px-6 lg:px-8 dark:text-[#94A3B8]">
            <div className="flex items-center gap-2 font-medium text-[#0F2342] dark:text-[#F8FAFC]">
              <Trees className="h-4 w-4 text-[#C99A2E]" />
              <span>FamilyRoots AI — OurLegacy</span>
            </div>
            <p>One family, one history, countless generations.</p>
          </div>
        </footer>
      </div>

      {/* Floating FamilyGuide AI Assistant on Homepage */}
      <FloatingFamilyGuide onPromptSignIn={() => focusAccessPortal('Sign in to escalate complex lineage cases directly to the Main Family Head & Administrators.')} />
    </div>
  );
};
