import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, HelpCircle, Upload, UserPlus, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Gender, RegistrationType } from '../types/family';
import { compressImageToDataUrl } from '../lib/imageUtils';
import { detectPotentialDuplicates } from '../lib/genealogyUtils';

interface RegistrationWizardProps {
  onOpenGuide: () => void;
}

export const RegistrationWizard: React.FC<RegistrationWizardProps> = ({ onOpenGuide }) => {
  const { user, branches, members, registrations, submitRegistration } = useAuth();

  const [registrationType, setRegistrationType] = useState<RegistrationType>(
    branches.length > 0 ? 'join_branch' : 'new_branch',
  );
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [passphraseNote, setPassphraseNote] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fatherNameText, setFatherNameText] = useState('');
  const [motherNameText, setMotherNameText] = useState('');
  const [requestedFatherId, setRequestedFatherId] = useState('');
  const [requestedMotherId, setRequestedMotherId] = useState('');
  const [requestedSpouseId, setRequestedSpouseId] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id || '');
  const [newBranchName, setNewBranchName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [biography, setBiography] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const potentialDuplicates = useMemo(
    () => detectPotentialDuplicates({ fullName, dateOfBirth, fatherNameText }, members),
    [fullName, dateOfBirth, fatherNameText, members],
  );

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressImageToDataUrl(file, 360, 180000);
      setPhotoUrl(compressed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!fullName.trim() || !email.trim() || !phone.trim() || !dateOfBirth) {
      setError('Please complete Full Name, Email Address, Phone Number, and Date of Birth.');
      return;
    }
    if (registrationType === 'join_branch' && !branchId) {
      setError('Please select an existing family branch or switch to Start New Family Branch.');
      return;
    }
    if (registrationType === 'new_branch' && !newBranchName.trim()) {
      setError('Please provide a name for the new family branch.');
      return;
    }

    setSubmitting(true);
    try {
      await submitRegistration({
        fullName,
        email,
        phone,
        gender,
        dateOfBirth,
        fatherNameText,
        motherNameText,
        requestedFatherId,
        requestedMotherId,
        requestedSpouseId,
        registrationType,
        branchId: registrationType === 'join_branch' ? branchId : '',
        newBranchName: registrationType === 'new_branch' ? newBranchName : '',
        photoUrl,
        biography,
        duplicateMatchIds: potentialDuplicates.map((m) => m.id),
      });
      setSuccessMsg(
        'Your registration has been submitted for administrator verification. No relationship is added automatically until reviewed.',
      );
      setPassphraseNote('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const myRegistrations = registrations.filter((r) => r.applicantUid === user?.uid);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5 dark:border-[#1E3252]">
        <div>
          <p className="text-xs font-medium text-[#9A7214] dark:text-[#D4AF37]">
            Verified Lineage Enrollment
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
            Family Member Registration
          </h1>
          <p className="mt-1 text-sm text-[#475569] dark:text-[#94A3B8]">
            Submit your registration request to the Main Family Head &amp; Branch Administrators. Ordinary members cannot create unverified family connections directly.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenGuide}
          className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-white px-4 py-2 text-xs font-semibold text-[#0F2342] hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#D4AF37] cursor-pointer"
        >
          <HelpCircle className="h-4 w-4" />
          Need help? Ask FamilyGuide AI
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Registration Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-6 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85 lg:col-span-8"
        >
          {/* Mode Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
              Registration Type
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRegistrationType('join_branch')}
                className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  registrationType === 'join_branch'
                    ? 'border-[#C99A2E] bg-[#FFFBF0] dark:border-[#D4AF37] dark:bg-[#132542]'
                    : 'border-[#E2E8F0] dark:border-[#1E3252]'
                }`}
              >
                <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                  Join Existing Family Branch
                </p>
                <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Connect under verified grandparents, parents, or spouse.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRegistrationType('new_branch')}
                className={`rounded-lg border p-3.5 text-left transition-colors cursor-pointer ${
                  registrationType === 'new_branch'
                    ? 'border-[#C99A2E] bg-[#FFFBF0] dark:border-[#D4AF37] dark:bg-[#132542]'
                    : 'border-[#E2E8F0] dark:border-[#1E3252]'
                }`}
              >
                <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                  New Family Member / New Branch
                </p>
                <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  Propose a new family branch for administrator approval.
                </p>
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {successMsg}
            </div>
          )}

          {potentialDuplicates.length > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">Potential Existing Member Match Detected</p>
                <p className="mt-0.5">
                  A similar record already exists ({potentialDuplicates.map((d) => d.fullName).join(', ')}). You may still submit; an administrator will review this flag to prevent duplicate entries.
                </p>
              </div>
            </div>
          )}

          {/* Core Identity Fields */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">Full Name *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Tariq Mahmood Khan"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Account Security Passphrase (Optional)</label>
              <input
                type="password"
                value={passphraseNote}
                onChange={(e) => setPassphraseNote(e.target.value)}
                placeholder="Verified via Firebase Auth"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Date of Birth *</label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>
          </div>

          {/* Family Branch */}
          <div className="border-t border-[#E2E8F0] pt-5 dark:border-[#1E3252]">
            {registrationType === 'join_branch' ? (
              <div>
                <label className="mb-1 block text-xs font-medium">Select Existing Family Branch *</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select a branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.founderPairLabel ? `(${b.founderPairLabel})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs font-medium">Proposed New Family Branch Name *</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Lahore Elder Lineage"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>
            )}
          </div>

          {/* Parent Names & Explicit Relationship Links */}
          <div className="space-y-4 border-t border-[#E2E8F0] pt-5 dark:border-[#1E3252]">
            <div>
              <p className="text-xs font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Parental &amp; Marital Connections (Explicitly Selected — Never Auto-Guessed)
              </p>
              <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Enter your father&apos;s and mother&apos;s names, and optionally select their verified tree nodes below if they are already registered.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Father&apos;s Full Name *</label>
                <input
                  type="text"
                  required
                  value={fatherNameText}
                  onChange={(e) => setFatherNameText(e.target.value)}
                  placeholder="Father's full name"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Mother&apos;s Full Name *</label>
                <input
                  type="text"
                  required
                  value={motherNameText}
                  onChange={(e) => setMotherNameText(e.target.value)}
                  placeholder="Mother's full name"
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Link Verified Father Node (Optional)</label>
                <select
                  value={requestedFatherId}
                  onChange={(e) => setRequestedFatherId(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Not yet listed / Admin will link</option>
                  {members
                    .filter((m) => m.gender === 'male')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (Gen {m.generation} · {m.branchName})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium">Link Verified Mother Node (Optional)</label>
                <select
                  value={requestedMotherId}
                  onChange={(e) => setRequestedMotherId(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Not yet listed / Admin will link</option>
                  {members
                    .filter((m) => m.gender === 'female')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (Gen {m.generation} · {m.branchName})
                      </option>
                    ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium">Link Verified Spouse Node (Optional)</label>
                <select
                  value={requestedSpouseId}
                  onChange={(e) => setRequestedSpouseId(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">None / Not applicable</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} (Gen {m.generation} · {m.branchName})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Photo & Biography */}
          <div className="space-y-4 border-t border-[#E2E8F0] pt-5 dark:border-[#1E3252]">
            <div className="flex flex-wrap items-center gap-4">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Profile preview"
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full border border-[#C99A2E] object-cover"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#CBD5E1] px-3.5 py-2 text-xs font-medium hover:bg-[#F1F4F9] dark:border-[#1E3252] dark:hover:bg-[#162742]">
                <Upload className="h-3.5 w-3.5 text-[#C99A2E]" />
                <span>{photoUrl ? 'Change Profile Photograph' : 'Upload Profile Photograph'}</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Short Biography / Family Notes</label>
              <textarea
                rows={3}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                placeholder="Share your birthplace, profession, or family memories..."
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2342] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#193561] disabled:opacity-60 dark:bg-[#D4AF37] dark:text-[#081120] transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              {submitting ? 'Submitting Application...' : 'Submit Registration for Verification'}
            </button>
          </div>
        </form>

        {/* Right Column: Registration Status Tracker */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
            <h2 className="font-display text-lg font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
              Your Registration Requests
            </h2>
            <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
              Track approval progress and administrator review notes.
            </p>

            {myRegistrations.length === 0 ? (
              <p className="mt-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
                You have not submitted a registration application yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {myRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="rounded-lg border border-[#E2E8F0] bg-[#FAF9F6] p-3.5 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{reg.fullName}</span>
                      <span className="inline-flex items-center gap-1 font-medium capitalize">
                        {reg.status === 'pending' && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        {reg.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {reg.status === 'rejected' && <XCircle className="h-3.5 w-3.5 text-red-600" />}
                        {reg.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[#64748B] dark:text-[#94A3B8]">
                      {reg.registrationType === 'new_branch'
                        ? `New Branch: ${reg.newBranchName}`
                        : `Joining existing branch`}
                    </p>
                    {reg.reviewNote && (
                      <p className="mt-2 border-t border-[#E2E8F0] pt-2 text-[#475569] dark:border-[#1E3252] dark:text-[#CBD5E1]">
                        Note: {reg.reviewNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
