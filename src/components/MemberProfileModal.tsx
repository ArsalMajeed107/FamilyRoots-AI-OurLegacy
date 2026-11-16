import React, { useState } from 'react';
import { Check, Crown, Edit3, GitCommitHorizontal, Link2, Save, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { FamilyMember, LineageRole, RelationType } from '../types/family';
import { compressImageToDataUrl, getInitials } from '../lib/imageUtils';
import { generationLabel, getChildrenOf } from '../lib/genealogyUtils';

interface MemberProfileModalProps {
  member: FamilyMember;
  onClose: () => void;
  onSelectMember: (member: FamilyMember) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  member,
  onClose,
  onSelectMember,
}) => {
  const {
    user,
    isAdmin,
    branchAdminAssignment,
    members,
    branches,
    privateContact,
    updateOwnMemberProfile,
    adminUpdateMember,
    proposeRelationship,
  } = useAuth();

  const isOwner = Boolean(user && member.uid && member.uid === user.uid);
  const canStewardEdit =
    isAdmin || Boolean(branchAdminAssignment && branchAdminAssignment.branchId === member.branchId);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(member.fullName);
  const [dateOfBirth, setDateOfBirth] = useState(member.dateOfBirth);
  const [biography, setBiography] = useState(member.biography);
  const [photoUrl, setPhotoUrl] = useState(member.photoUrl);
  const [fatherNameText, setFatherNameText] = useState(member.fatherNameText);
  const [motherNameText, setMotherNameText] = useState(member.motherNameText);

  // Steward-only relationship fields
  const [fatherId, setFatherId] = useState(member.fatherId);
  const [motherId, setMotherId] = useState(member.motherId);
  const [spouseId, setSpouseId] = useState(member.spouseId);
  const [generation, setGeneration] = useState(member.generation);
  const [branchId, setBranchId] = useState(member.branchId);
  const [roleInLineage, setRoleInLineage] = useState<LineageRole>(member.roleInLineage);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Relationship proposal form for non-admin members (requires Family Head / Admin verification)
  const [proposeOpen, setProposeOpen] = useState(false);
  const [relType, setRelType] = useState<RelationType>('father');
  const [targetMemberId, setTargetMemberId] = useState('');
  const [relNotes, setRelNotes] = useState('');

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const father = member.fatherId ? memberMap.get(member.fatherId) : undefined;
  const mother = member.motherId ? memberMap.get(member.motherId) : undefined;
  const spouse = member.spouseId ? memberMap.get(member.spouseId) : undefined;
  const children = getChildrenOf(member.id, members);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 360, 180000);
      setPhotoUrl(dataUrl);
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Image upload failed.');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      if (canStewardEdit) {
        const selectedBranch = branches.find((b) => b.id === branchId);
        await adminUpdateMember(member.id, {
          fullName: fullName.trim(),
          dateOfBirth,
          biography: biography.trim(),
          photoUrl,
          fatherId,
          motherId,
          spouseId,
          generation: Math.max(0, Math.min(50, Math.floor(generation))),
          branchId: isAdmin ? branchId : member.branchId,
          branchName: isAdmin ? selectedBranch?.name || member.branchName : member.branchName,
          roleInLineage,
        });
      } else {
        await updateOwnMemberProfile(member.id, {
          fullName,
          dateOfBirth,
          biography,
          photoUrl,
          fatherNameText,
          motherNameText,
        });
      }
      setEditing(false);
      setFeedback('Profile updated.');
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleProposeRelationship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMemberId) return;
    setSaving(true);
    setFeedback('');
    try {
      await proposeRelationship({
        fromMemberId: member.id,
        toMemberId: targetMemberId,
        relationType: relType,
        notes: relNotes,
      });
      setProposeOpen(false);
      setTargetMemberId('');
      setRelNotes('');
      setFeedback('Verification request submitted to the Main Family Head & Administrators.');
    } catch (err: unknown) {
      setFeedback(err instanceof Error ? err.message : 'Failed to submit verification request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#CBD5E1] bg-white/95 p-6 text-[#0F2342] shadow-2xl dark:border-[#1E3252] dark:bg-[#0F1D33]/95 dark:text-[#F8FAFC]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
          <div className="flex items-center gap-4">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.fullName}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full border-2 border-[#C99A2E] object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#C99A2E] bg-[#0F2342] font-display text-xl font-semibold text-[#D4AF37]">
                {getInitials(member.fullName)}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold">{member.fullName}</h2>
                {member.isFamilyHead && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                    <Crown className="h-3.5 w-3.5" />
                    Main Family Head
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {generationLabel(member.generation)} · {member.branchName} ·{' '}
                {member.isVerified ? 'Verified Record' : 'Unverified'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className="rounded-lg p-2 text-[#64748B] hover:bg-[#F1F4F9] hover:text-[#0F2342] dark:text-[#94A3B8] dark:hover:bg-[#162742] dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback && (
          <div className="mt-4 rounded-lg border border-[#C99A2E]/40 bg-[#FFFBF0] px-3.5 py-2 text-xs text-[#7A590C] dark:bg-[#1A2D4A] dark:text-[#D4AF37]">
            {feedback}
          </div>
        )}

        {editing ? (
          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>

              {!canStewardEdit ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Father&apos;s Name Reference</label>
                    <input
                      type="text"
                      value={fatherNameText}
                      onChange={(e) => setFatherNameText(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Mother&apos;s Name Reference</label>
                    <input
                      type="text"
                      value={motherNameText}
                      onChange={(e) => setMotherNameText(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Father Node (Steward)</label>
                    <select
                      value={fatherId}
                      onChange={(e) => setFatherId(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    >
                      <option value="">None / Unlinked</option>
                      {members
                        .filter((m) => m.id !== member.id && m.gender === 'male')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} (Gen {m.generation})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Mother Node (Steward)</label>
                    <select
                      value={motherId}
                      onChange={(e) => setMotherId(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    >
                      <option value="">None / Unlinked</option>
                      {members
                        .filter((m) => m.id !== member.id && m.gender === 'female')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} (Gen {m.generation})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Spouse Node (Steward)</label>
                    <select
                      value={spouseId}
                      onChange={(e) => setSpouseId(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    >
                      <option value="">None</option>
                      {members
                        .filter((m) => m.id !== member.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} (Gen {m.generation})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium">Generation</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={generation}
                      onChange={(e) => setGeneration(Number(e.target.value))}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                  </div>
                  {isAdmin && (
                    <div>
                      <label className="mb-1 block text-xs font-medium">Family Branch</label>
                      <select
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium">Lineage Role</label>
                    <select
                      value={roleInLineage}
                      onChange={(e) => setRoleInLineage(e.target.value as LineageRole)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    >
                      <option value="descendant">Descendant</option>
                      <option value="spouse">Spouse</option>
                      <option value="founder">Founder</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Update Portrait Photo</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium">Biography</label>
              <textarea
                rows={3}
                value={biography}
                onChange={(e) => setBiography(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-sm dark:border-[#1E3252] dark:bg-[#081120]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-semibold dark:border-[#1E3252] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-5">
            {/* Personal Metadata */}
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#E2E8F0] bg-[#FAF9F6] p-4 text-xs dark:border-[#1E3252] dark:bg-[#081120] sm:grid-cols-3">
              <div>
                <p className="text-[#64748B] dark:text-[#94A3B8]">Gender</p>
                <p className="mt-0.5 font-medium capitalize">{member.gender}</p>
              </div>
              <div>
                <p className="text-[#64748B] dark:text-[#94A3B8]">Date of Birth</p>
                <p className="mt-0.5 font-mono font-medium">{member.dateOfBirth || 'Not recorded'}</p>
              </div>
              <div>
                <p className="text-[#64748B] dark:text-[#94A3B8]">Login Account</p>
                <p className="mt-0.5 font-medium">{member.uid ? 'Active Member Account' : 'Not Claimed Yet'}</p>
              </div>
            </div>

            {isOwner && privateContact && (
              <div className="rounded-lg border border-[#E2E8F0] p-4 text-xs dark:border-[#1E3252]">
                <p className="font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                  Private Contact Details (Visible only to you &amp; Admins)
                </p>
                <div className="mt-2 flex flex-wrap gap-6">
                  <span>Email: {privateContact.email || 'Not set'}</span>
                  <span>Phone: {privateContact.phone || 'Not set'}</span>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                Biography &amp; Notes
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#334155] dark:text-[#CBD5E1]">
                {member.biography || 'No biography recorded yet.'}
              </p>
            </div>

            <div className="space-y-3 border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                  Verified Family Connections
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C99A2E]" />
                  Managed by Family Head / Branch Admin
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#E2E8F0] p-3 text-xs dark:border-[#1E3252]">
                  <p className="text-[#64748B] dark:text-[#94A3B8]">Father</p>
                  {father ? (
                    <button
                      type="button"
                      onClick={() => onSelectMember(father)}
                      className="mt-1 font-semibold text-[#0F2342] hover:text-[#C99A2E] dark:text-[#D4AF37] cursor-pointer"
                    >
                      {father.fullName}
                    </button>
                  ) : (
                    <p className="mt-1 text-[#475569] dark:text-[#CBD5E1]">
                      {member.fatherNameText ? `${member.fatherNameText} (Unlinked)` : 'Not linked'}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-[#E2E8F0] p-3 text-xs dark:border-[#1E3252]">
                  <p className="text-[#64748B] dark:text-[#94A3B8]">Mother</p>
                  {mother ? (
                    <button
                      type="button"
                      onClick={() => onSelectMember(mother)}
                      className="mt-1 font-semibold text-[#0F2342] hover:text-[#C99A2E] dark:text-[#D4AF37] cursor-pointer"
                    >
                      {mother.fullName}
                    </button>
                  ) : (
                    <p className="mt-1 text-[#475569] dark:text-[#CBD5E1]">
                      {member.motherNameText ? `${member.motherNameText} (Unlinked)` : 'Not linked'}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-[#E2E8F0] p-3 text-xs dark:border-[#1E3252]">
                  <p className="text-[#64748B] dark:text-[#94A3B8]">Spouse</p>
                  {spouse ? (
                    <button
                      type="button"
                      onClick={() => onSelectMember(spouse)}
                      className="mt-1 font-semibold text-[#0F2342] hover:text-[#C99A2E] dark:text-[#D4AF37] cursor-pointer"
                    >
                      {spouse.fullName}
                    </button>
                  ) : (
                    <p className="mt-1 text-[#475569] dark:text-[#CBD5E1]">Not linked</p>
                  )}
                </div>
              </div>

              {children.length > 0 && (
                <div>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Children ({children.length})</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => onSelectMember(child)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-medium hover:border-[#C99A2E] dark:border-[#1E3252] dark:hover:border-[#D4AF37] cursor-pointer"
                      >
                        <GitCommitHorizontal className="h-3.5 w-3.5 text-[#C99A2E]" />
                        {child.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252]">
              {!canStewardEdit && (
                <button
                  type="button"
                  onClick={() => setProposeOpen((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3.5 py-2 text-xs font-semibold text-[#0F2342] hover:bg-[#F1F4F9] dark:border-[#1E3252] dark:text-[#F8FAFC] dark:hover:bg-[#162742] cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5 text-[#C99A2E]" />
                  Request Link Review from Family Head
                </button>
              )}

              {(isOwner || canStewardEdit) && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  {canStewardEdit ? 'Edit Member & Lineage' : 'Edit Permitted Info'}
                </button>
              )}
            </div>

            {/* Propose Relationship Verification Form (strictly queued for Admin approval) */}
            {proposeOpen && !canStewardEdit && (
              <form
                onSubmit={handleProposeRelationship}
                className="rounded-lg border border-[#E2E8F0] bg-[#FAF9F6] p-4 dark:border-[#1E3252] dark:bg-[#081120]"
              >
                <p className="text-xs font-semibold">
                  Request Relationship Verification (Does not change the tree until approved by the Family Head)
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium">Relationship Type</label>
                    <select
                      value={relType}
                      onChange={(e) => setRelType(e.target.value as RelationType)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#0F1D33]"
                    >
                      <option value="father">Father of {member.fullName}</option>
                      <option value="mother">Mother of {member.fullName}</option>
                      <option value="spouse">Spouse of {member.fullName}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium">Select Family Member</label>
                    <select
                      required
                      value={targetMemberId}
                      onChange={(e) => setTargetMemberId(e.target.value)}
                      className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#0F1D33]"
                    >
                      <option value="">Choose verified member...</option>
                      {members
                        .filter((m) => m.id !== member.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName} (Gen {m.generation} · {m.branchName})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="mb-1 block text-[11px] font-medium">Verification Notes</label>
                  <input
                    type="text"
                    value={relNotes}
                    onChange={(e) => setRelNotes(e.target.value)}
                    placeholder="Provide context for the Main Family Head..."
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#0F1D33]"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Send to Family Head
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
