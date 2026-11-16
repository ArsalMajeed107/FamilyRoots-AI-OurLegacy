import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Crown,
  Edit3,
  GitBranch,
  History,
  KeyRound,
  Mail,
  MessageSquareWarning,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { computeFamilyStats, detectPotentialDuplicates } from '../lib/genealogyUtils';
import { compressImageToDataUrl, getInitials } from '../lib/imageUtils';
import { FamilyMember, Gender, LineageRole, RegistrationRequest } from '../types/family';

type AdminTab = 'tree_manage' | 'members_accounts' | 'registrations' | 'relationships' | 'escalations' | 'logs';

interface AdminDashboardProps {
  onSelectMember?: (member: FamilyMember) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSelectMember }) => {
  const {
    isAdmin,
    branchAdminAssignment,
    hasStewardAccess,
    branchAdmins,
    branches,
    members,
    memberInvites,
    registrations,
    relationships,
    adminLogs,
    escalations,
    bootstrapFoundingLineage,
    approveRegistration,
    rejectRegistration,
    verifyRelationshipProposal,
    createBranch,
    addMemberDirect,
    deleteMember,
    designateFamilyHead,
    createMemberInvite,
    revokeMemberInvite,
    assignBranchAdmin,
    revokeBranchAdmin,
    resolveEscalation,
  } = useAuth();

  const [tab, setTab] = useState<AdminTab>(isAdmin ? 'tree_manage' : 'members_accounts');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Main Family Head designation state
  const [selectedHeadId, setSelectedHeadId] = useState('');

  // Founding Grandparents bootstrap form
  const [branchName, setBranchName] = useState('Founding Lineage');
  const [originLocation, setOriginLocation] = useState('');
  const [branchDesc, setBranchDesc] = useState('');
  const [gfName, setGfName] = useState('');
  const [gfDob, setGfDob] = useState('');
  const [gfBio, setGfBio] = useState('');
  const [gfEmail, setGfEmail] = useState('');
  const [gfPhoto, setGfPhoto] = useState('');
  const [gmName, setGmName] = useState('');
  const [gmDob, setGmDob] = useState('');
  const [gmBio, setGmBio] = useState('');
  const [gmPhoto, setGmPhoto] = useState('');

  // Registration review modal state
  const [reviewingReg, setReviewingReg] = useState<RegistrationRequest | null>(null);
  const [revFatherId, setRevFatherId] = useState('');
  const [revMotherId, setRevMotherId] = useState('');
  const [revSpouseId, setRevSpouseId] = useState('');
  const [revBranchId, setRevBranchId] = useState('');
  const [revNewBranch, setRevNewBranch] = useState('');
  const [revGen, setRevGen] = useState(1);
  const [revRole, setRevRole] = useState<LineageRole>('descendant');
  const [revNote, setRevNote] = useState('');

  // Direct add member form (Family Head / Branch Admin)
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberGender, setNewMemberGender] = useState<Gender>('male');
  const [newMemberDob, setNewMemberDob] = useState('');
  const [newMemberGen, setNewMemberGen] = useState(1);
  const [newMemberBranchId, setNewMemberBranchId] = useState(branchAdminAssignment?.branchId || '');
  const [newMemberFatherId, setNewMemberFatherId] = useState('');
  const [newMemberMotherId, setNewMemberMotherId] = useState('');
  const [newMemberSpouseId, setNewMemberSpouseId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<LineageRole>('descendant');
  const [newMemberBio, setNewMemberBio] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPhoto, setNewMemberPhoto] = useState('');

  // Create branch form
  const [extraBranchName, setExtraBranchName] = useState('');
  const [extraBranchOrigin, setExtraBranchOrigin] = useState('');
  const [extraBranchFounders, setExtraBranchFounders] = useState('');

  // Member directory & invite states
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteInputs, setInviteInputs] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Branch admin assignment
  const [baMemberUid, setBaMemberUid] = useState('');
  const [baEmail, setBaEmail] = useState('');
  const [baBranchId, setBaBranchId] = useState('');

  // Escalation reply
  const [escReplies, setEscReplies] = useState<Record<string, string>>({});

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const inviteMap = useMemo(() => new Map(memberInvites.map((inv) => [inv.memberId, inv])), [memberInvites]);

  if (!hasStewardAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-[#CBD5E1]/70 bg-white/85 p-8 text-center backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
        <ShieldCheck className="mx-auto h-10 w-10 text-[#C99A2E]" />
        <h1 className="font-display mt-3 text-2xl font-semibold">Family Head or Branch Admin Access Required</h1>
        <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
          Only the designated Main Family Head or authorized Branch Administrators can add, edit, or verify family relationships.
        </p>
      </div>
    );
  }

  const stats = computeFamilyStats(members, branches, registrations);
  const malePct = stats.totalMembers > 0 ? Math.round((stats.maleCount / stats.totalMembers) * 100) : 0;
  const femalePct = stats.totalMembers > 0 ? Math.round((stats.femaleCount / stats.totalMembers) * 100) : 0;

  const currentFamilyHead =
    members.find((m) => m.isFamilyHead) ||
    members.find((m) => m.roleInLineage === 'founder' && m.gender === 'male') ||
    members[0];

  const manageableMembers = members.filter((m) => {
    const matchesScope = isAdmin || (branchAdminAssignment ? m.branchId === branchAdminAssignment.branchId : false);
    const q = memberSearch.trim().toLowerCase();
    const matchesSearch = !q || m.fullName.toLowerCase().includes(q) || m.branchName.toLowerCase().includes(q);
    return matchesScope && matchesSearch;
  });

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, 360, 180000);
      setter(dataUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process image.');
    }
  };

  const openReview = (reg: RegistrationRequest) => {
    setReviewingReg(reg);
    setRevFatherId(reg.requestedFatherId || '');
    setRevMotherId(reg.requestedMotherId || '');
    setRevSpouseId(reg.requestedSpouseId || '');
    setRevBranchId(reg.branchId || branches[0]?.id || '');
    setRevNewBranch(reg.newBranchName || '');

    const father = reg.requestedFatherId ? memberMap.get(reg.requestedFatherId) : undefined;
    const mother = reg.requestedMotherId ? memberMap.get(reg.requestedMotherId) : undefined;
    const parentGen = father?.generation ?? mother?.generation;
    setRevGen(parentGen !== undefined ? parentGen + 1 : 1);
    setRevRole(reg.requestedSpouseId && !father && !mother ? 'spouse' : 'descendant');
    setRevNote('');
  };

  const handleApprove = async () => {
    if (!reviewingReg) return;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await approveRegistration(reviewingReg, {
        fatherId: revFatherId,
        motherId: revMotherId,
        spouseId: revSpouseId,
        branchId: revBranchId,
        newBranchName: revNewBranch,
        generation: revGen,
        roleInLineage: revRole,
        reviewNote: revNote || 'Approved and linked to verified family tree.',
      });
      setFeedback(`Approved ${reviewingReg.fullName} into the verified tree.`);
      setReviewingReg(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (reg: RegistrationRequest, reason: string) => {
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await rejectRegistration(reg, reason || 'Insufficient lineage information; please contact the Family Head.');
      setFeedback(`Rejected registration for ${reg.fullName}.`);
      setReviewingReg(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleBootstrapFounders = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await bootstrapFoundingLineage({
        branchName,
        originLocation,
        description: branchDesc,
        grandfatherName: gfName,
        grandfatherDob: gfDob,
        grandfatherBio: gfBio,
        grandfatherPhotoUrl: gfPhoto,
        grandfatherEmail: gfEmail,
        grandmotherName: gmName,
        grandmotherDob: gmDob,
        grandmotherBio: gmBio,
        grandmotherPhotoUrl: gmPhoto,
      });
      setFeedback('Founding Grandfather (Main Family Head) & Grandmother (Generation 0) created and synced live.');
      setGfName('');
      setGmName('');
      setGfEmail('');
      setGfPhoto('');
      setGmPhoto('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to initialize founding pair.');
    } finally {
      setBusy(false);
    }
  };

  const handleParentChangeForNewMember = (type: 'father' | 'mother', parentId: string) => {
    if (type === 'father') setNewMemberFatherId(parentId);
    else setNewMemberMotherId(parentId);
    const parent = parentId ? memberMap.get(parentId) : undefined;
    if (parent) {
      setNewMemberGen(parent.generation + 1);
      if (isAdmin && parent.branchId) {
        setNewMemberBranchId(parent.branchId);
      }
    }
  };

  const handleAddMemberDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranch =
      (!isAdmin && branchAdminAssignment?.branchId) || newMemberBranchId || branches[0]?.id;
    if (!targetBranch) {
      setError('Create a family branch first before adding descendants.');
      return;
    }
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await addMemberDirect({
        fullName: newMemberName,
        gender: newMemberGender,
        dateOfBirth: newMemberDob,
        isDeceased: false,
        deathDate: '',
        generation: newMemberGen,
        branchId: targetBranch,
        fatherId: newMemberFatherId,
        motherId: newMemberMotherId,
        spouseId: newMemberSpouseId,
        fatherNameText: newMemberFatherId ? memberMap.get(newMemberFatherId)?.fullName || '' : '',
        motherNameText: newMemberMotherId ? memberMap.get(newMemberMotherId)?.fullName || '' : '',
        roleInLineage: newMemberRole,
        biography: newMemberBio,
        photoUrl: newMemberPhoto,
        invitedEmail: newMemberEmail,
      });
      setFeedback(
        `Added ${newMemberName} (Gen ${newMemberGen}) to the family tree${
          newMemberEmail.trim() ? ` and provisioned a login invitation for ${newMemberEmail.trim().toLowerCase()}` : ''
        }.`,
      );
      setNewMemberName('');
      setNewMemberBio('');
      setNewMemberEmail('');
      setNewMemberPhoto('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member.');
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: AdminTab; label: string }> = isAdmin
    ? [
        { id: 'tree_manage', label: 'Family Head & Tree' },
        { id: 'members_accounts', label: `Members & Logins (${members.length})` },
        { id: 'registrations', label: `Registrations (${stats.pendingRegs})` },
        { id: 'relationships', label: `Link Requests (${relationships.filter((r) => r.status === 'pending').length})` },
        { id: 'escalations', label: `AI Escalations (${escalations.filter((e) => e.status === 'open').length})` },
        { id: 'logs', label: 'Activity Logs' },
      ]
    : [
        { id: 'members_accounts', label: `Branch Members (${manageableMembers.length})` },
        { id: 'tree_manage', label: 'Add Branch Member' },
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
        <div>
          <p className="text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
            {isAdmin
              ? 'Main Family Head Governance & Verification'
              : `Branch Administrator · ${branchAdminAssignment?.branchName}`}
          </p>
          <h1 className="font-display mt-1 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
            {isAdmin ? 'Family Head Stewardship Console' : 'Branch Member Management'}
          </h1>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg bg-[#F1F4F9]/90 p-1 backdrop-blur-sm dark:bg-[#0F1D33]/90">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                tab === item.id
                  ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#D4AF37]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real Admin Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Total Members</p>
          <p className="font-mono mt-1 text-2xl font-semibold tabular-nums">{stats.totalMembers}</p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Generations</p>
          <p className="font-mono mt-1 text-2xl font-semibold tabular-nums">{stats.totalGenerations}</p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Branches</p>
          <p className="font-mono mt-1 text-2xl font-semibold tabular-nums">{stats.totalBranches}</p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Male / Female</p>
          <p className="font-mono mt-1 text-lg font-semibold tabular-nums">
            {stats.maleCount} / {stats.femaleCount}
          </p>
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#081120]">
            <div style={{ width: `${malePct}%` }} className="bg-[#0F2342] dark:bg-[#60A5FA]" />
            <div style={{ width: `${femalePct}%` }} className="bg-[#C99A2E]" />
          </div>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Active Logins</p>
          <p className="font-mono mt-1 text-2xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC]">
            {members.filter((m) => Boolean(m.uid)).length}
          </p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">Pending Requests</p>
          <p className="font-mono mt-1 text-2xl font-semibold tabular-nums text-[#9A7214] dark:text-[#D4AF37]">
            {stats.pendingRegs}
          </p>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50/90 px-4 py-3 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50/90 px-4 py-3 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200">
          {error}
        </div>
      )}

      {/* TAB: Family Head & Tree Management */}
      {tab === 'tree_manage' && (
        <div className="space-y-6">
          {/* Designate Main Family Head Card (Super Admin only) */}
          {isAdmin && members.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#C99A2E]/40 bg-white/85 p-5 backdrop-blur-md dark:border-[#D4AF37]/30 dark:bg-[#0F1D33]/85">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-[#C99A2E]" />
                <div>
                  <p className="text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                    Main Family Head Designation
                  </p>
                  <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                    Current: {currentFamilyHead?.fullName || 'Unassigned'} (Gen {currentFamilyHead?.generation ?? 0})
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedHeadId || currentFamilyHead?.id || ''}
                  onChange={(e) => setSelectedHeadId(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} (Gen {m.generation} · {m.branchName})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    const targetId = selectedHeadId || currentFamilyHead?.id;
                    if (!targetId) return;
                    setBusy(true);
                    setError('');
                    try {
                      await designateFamilyHead(targetId);
                      setFeedback('Main Family Head updated and reflected on the Homepage & Dashboard.');
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Unable to update Main Family Head.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                >
                  Set Main Family Head
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Add Verified Member Directly with Login Invitation */}
            <form
              onSubmit={handleAddMemberDirect}
              className="space-y-3 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-6 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85"
            >
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
                <UserCheck className="h-4 w-4 text-[#C99A2E]" />
                <h2 className="font-display text-lg font-semibold">
                  Add Family Member &amp; Issue Login Account
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="Full Name *"
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
                <select
                  value={newMemberGender}
                  onChange={(e) => setNewMemberGender(e.target.value as Gender)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <input
                  type="date"
                  value={newMemberDob}
                  onChange={(e) => setNewMemberDob(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={newMemberGen}
                  onChange={(e) => setNewMemberGen(Number(e.target.value))}
                  placeholder="Generation (0, 1, 2...)"
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
                <select
                  disabled={!isAdmin && Boolean(branchAdminAssignment)}
                  value={(!isAdmin && branchAdminAssignment?.branchId) || newMemberBranchId || branches[0]?.id || ''}
                  onChange={(e) => setNewMemberBranchId(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs disabled:opacity-70 dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select Branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as LineageRole)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="descendant">Descendant (Son / Daughter / Grandchild)</option>
                  <option value="spouse">Spouse</option>
                  <option value="founder">Founder</option>
                </select>
                <select
                  value={newMemberFatherId}
                  onChange={(e) => handleParentChangeForNewMember('father', e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select Father Node (Optional)</option>
                  {members
                    .filter((m) => m.gender === 'male')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (Gen {m.generation})
                      </option>
                    ))}
                </select>
                <select
                  value={newMemberMotherId}
                  onChange={(e) => handleParentChangeForNewMember('mother', e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select Mother Node (Optional)</option>
                  {members
                    .filter((m) => m.gender === 'female')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (Gen {m.generation})
                      </option>
                    ))}
                </select>
              </div>

              <select
                value={newMemberSpouseId}
                onChange={(e) => setNewMemberSpouseId(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
              >
                <option value="">Select Spouse Node (Optional)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} (Gen {m.generation})
                  </option>
                ))}
              </select>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-[#475569] dark:text-[#94A3B8]">
                  Member Login Account Email (Optional — enables automatic profile linking on sign-in)
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="member-email@gmail.com"
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-8 pr-3 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {newMemberPhoto && (
                  <img
                    src={newMemberPhoto}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full border border-[#C99A2E] object-cover"
                  />
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-medium dark:border-[#1E3252]">
                  <Upload className="h-3.5 w-3.5 text-[#C99A2E]" />
                  <span>{newMemberPhoto ? 'Change Portrait' : 'Upload Portrait Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoUpload(e, setNewMemberPhoto)}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="text"
                value={newMemberBio}
                onChange={(e) => setNewMemberBio(e.target.value)}
                placeholder="Biography note"
                className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
              />

              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Member &amp; Update Live Tree
              </button>
            </form>

            {/* Right Column: Founding Pair + Branches + Branch Admin */}
            {isAdmin && (
              <div className="space-y-6">
                <form
                  onSubmit={handleBootstrapFounders}
                  className="space-y-4 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-6 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85"
                >
                  <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
                    <GitBranch className="h-4 w-4 text-[#C99A2E]" />
                    <h2 className="font-display text-lg font-semibold">
                      Establish Founding Grandfather &amp; Grandmother (Gen 0)
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="Founding Branch Name"
                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                    <input
                      type="text"
                      value={originLocation}
                      onChange={(e) => setOriginLocation(e.target.value)}
                      placeholder="Ancestral City / Region"
                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                  </div>

                  <input
                    type="text"
                    value={branchDesc}
                    onChange={(e) => setBranchDesc(e.target.value)}
                    placeholder="Branch description"
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  />

                  <div className="grid grid-cols-1 gap-4 border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252] sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#0F2342] dark:text-[#D4AF37]">
                        Grandfather (Main Family Head · Gen 0)
                      </p>
                      <input
                        type="text"
                        required
                        value={gfName}
                        onChange={(e) => setGfName(e.target.value)}
                        placeholder="Grandfather's Full Name"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <input
                        type="date"
                        value={gfDob}
                        onChange={(e) => setGfDob(e.target.value)}
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <input
                        type="email"
                        value={gfEmail}
                        onChange={(e) => setGfEmail(e.target.value)}
                        placeholder="Login Email (Optional)"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <input
                        type="text"
                        value={gfBio}
                        onChange={(e) => setGfBio(e.target.value)}
                        placeholder="Short biography"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#9A7214] dark:text-[#D4AF37]">
                        <Upload className="h-3 w-3" />
                        <span>{gfPhoto ? 'Portrait Ready' : 'Upload Portrait'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handlePhotoUpload(e, setGfPhoto)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[#0F2342] dark:text-[#D4AF37]">Grandmother (Gen 0)</p>
                      <input
                        type="text"
                        required
                        value={gmName}
                        onChange={(e) => setGmName(e.target.value)}
                        placeholder="Grandmother's Full Name"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <input
                        type="date"
                        value={gmDob}
                        onChange={(e) => setGmDob(e.target.value)}
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <input
                        type="text"
                        value={gmBio}
                        onChange={(e) => setGmBio(e.target.value)}
                        placeholder="Short biography"
                        className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#9A7214] dark:text-[#D4AF37]">
                        <Upload className="h-3 w-3" />
                        <span>{gmPhoto ? 'Portrait Ready' : 'Upload Portrait'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => void handlePhotoUpload(e, setGmPhoto)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create Founding Pair &amp; Branch
                  </button>
                </form>

                {/* Quick Branch Creation */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!extraBranchName.trim()) return;
                    setBusy(true);
                    try {
                      await createBranch({
                        name: extraBranchName,
                        originLocation: extraBranchOrigin,
                        description: '',
                        founderPairLabel: extraBranchFounders,
                      });
                      setFeedback(`Created branch "${extraBranchName}".`);
                      setExtraBranchName('');
                      setExtraBranchOrigin('');
                      setExtraBranchFounders('');
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Failed to create branch.');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="space-y-3 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85"
                >
                  <h3 className="font-display text-base font-semibold">Create New Family Branch</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                      type="text"
                      required
                      value={extraBranchName}
                      onChange={(e) => setExtraBranchName(e.target.value)}
                      placeholder="Branch Name"
                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                    <input
                      type="text"
                      value={extraBranchOrigin}
                      onChange={(e) => setExtraBranchOrigin(e.target.value)}
                      placeholder="Origin City"
                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                    <input
                      type="text"
                      value={extraBranchFounders}
                      onChange={(e) => setExtraBranchFounders(e.target.value)}
                      placeholder="Founding Couple Label"
                      className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg border border-[#0F2342] px-4 py-1.5 text-xs font-semibold text-[#0F2342] dark:border-[#D4AF37] dark:text-[#D4AF37] cursor-pointer"
                  >
                    Create Branch
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Members & Individual Login Accounts + Branch Admins */}
      {tab === 'members_accounts' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4 dark:border-[#1E3252]">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#C99A2E]" />
                <h2 className="font-display text-lg font-semibold">
                  Member Management &amp; Individual Login Accounts
                </h2>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#94A3B8]" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search member or branch..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white py-2 pl-8 pr-3 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>
            </div>

            {manageableMembers.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                No members match the current filter.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E3252]">
                {manageableMembers.map((m) => {
                  const inv = inviteMap.get(m.id);
                  const father = m.fatherId ? memberMap.get(m.fatherId) : undefined;
                  const mother = m.motherId ? memberMap.get(m.motherId) : undefined;
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-3.5 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        {m.photoUrl ? (
                          <img
                            src={m.photoUrl}
                            alt={m.fullName}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F2342] font-display text-xs font-semibold text-[#D4AF37]">
                            {getInitials(m.fullName)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#0F2342] dark:text-[#F8FAFC]">
                              {m.fullName}
                            </span>
                            {m.isFamilyHead && (
                              <span className="inline-flex items-center gap-1 font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                                <Crown className="h-3 w-3" />
                                Main Family Head
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            Gen {m.generation} · {m.branchName}
                            {father || mother
                              ? ` · Parents: ${father?.fullName || '—'} & ${mother?.fullName || '—'}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      {/* Login Account Provisioning + Edit / Delete Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {m.uid ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300">
                            <KeyRound className="h-3.5 w-3.5" />
                            Account Linked
                          </span>
                        ) : inv && inv.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[#9A7214] dark:text-[#D4AF37]">
                              Invited: {inv.invitedEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => void revokeMemberInvite(m.id)}
                              className="text-[11px] text-red-600 hover:underline dark:text-red-400 cursor-pointer"
                            >
                              Revoke
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="email"
                              value={inviteInputs[m.id] || ''}
                              onChange={(e) =>
                                setInviteInputs((prev) => ({ ...prev, [m.id]: e.target.value }))
                              }
                              placeholder="Member email for login..."
                              className="w-44 rounded-lg border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[11px] dark:border-[#1E3252] dark:bg-[#081120]"
                            />
                            <button
                              type="button"
                              disabled={!inviteInputs[m.id]?.trim()}
                              onClick={async () => {
                                await createMemberInvite(m, inviteInputs[m.id]);
                                setFeedback(`Login invite issued for ${m.fullName} (${inviteInputs[m.id]}).`);
                                setInviteInputs((prev) => ({ ...prev, [m.id]: '' }));
                              }}
                              className="rounded-lg bg-[#0F2342] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                            >
                              Issue Login
                            </button>
                          </div>
                        )}

                        {onSelectMember && (
                          <button
                            type="button"
                            onClick={() => onSelectMember(m)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-[11px] font-medium hover:border-[#C99A2E] dark:border-[#1E3252] cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </button>
                        )}

                        {confirmDeleteId === m.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteMember(m.id);
                                setConfirmDeleteId(null);
                                setFeedback(`Removed ${m.fullName} and updated family connections.`);
                              }}
                              className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                            >
                              Confirm Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-[#CBD5E1] px-2 py-1.5 text-[11px] dark:border-[#1E3252] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(m.id)}
                            aria-label={`Remove ${m.fullName}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Appoint Branch Administrators (Super Admin only) */}
          {isAdmin && (
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
              <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
                <ShieldCheck className="h-4 w-4 text-[#C99A2E]" />
                <h3 className="font-display text-lg font-semibold">Branch Administrators</h3>
              </div>
              <p className="mt-2 text-xs text-[#64748B] dark:text-[#94A3B8]">
                Delegate branch stewardship to verified family members who have claimed their login account.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError('');
                  try {
                    await assignBranchAdmin({ uid: baMemberUid, email: baEmail, branchId: baBranchId });
                    setFeedback('Assigned Branch Administrator privileges.');
                    setBaMemberUid('');
                    setBaEmail('');
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Unable to assign Branch Administrator.');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4"
              >
                <select
                  required
                  value={baMemberUid}
                  onChange={(e) => {
                    setBaMemberUid(e.target.value);
                    const matched = members.find((m) => m.uid === e.target.value);
                    if (matched && matched.branchId) setBaBranchId(matched.branchId);
                  }}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select Linked Member...</option>
                  {members
                    .filter((m) => Boolean(m.uid))
                    .map((m) => (
                      <option key={m.id} value={m.uid}>
                        {m.fullName} ({m.branchName})
                      </option>
                    ))}
                </select>
                <input
                  type="email"
                  required
                  value={baEmail}
                  onChange={(e) => setBaEmail(e.target.value)}
                  placeholder="Member email label"
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
                <select
                  required
                  value={baBranchId}
                  onChange={(e) => setBaBranchId(e.target.value)}
                  className="rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                >
                  <option value="">Select Assigned Branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                >
                  Appoint Branch Admin
                </button>
              </form>

              {branchAdmins.length > 0 && (
                <div className="mt-4 divide-y divide-[#E2E8F0] dark:divide-[#1E3252]">
                  {branchAdmins.map((ba) => (
                    <div key={ba.uid} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <span className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{ba.email || ba.uid}</span>
                        <span className="ml-2 text-[#64748B] dark:text-[#94A3B8]">
                          · Assigned to {ba.branchName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void revokeBranchAdmin(ba.uid)}
                        className="text-red-600 hover:underline dark:text-red-400 cursor-pointer"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Registration Review Queue */}
      {tab === 'registrations' && isAdmin && (
        <div className="space-y-4">
          {registrations.length === 0 ? (
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-10 text-center text-sm text-[#64748B] backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85 dark:text-[#94A3B8]">
              No registration applications submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#CBD5E1]/70 bg-white/85 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#E2E8F0] bg-[#FAF9F6]/90 text-[#475569] dark:border-[#1E3252] dark:bg-[#081120]/90 dark:text-[#94A3B8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Applicant</th>
                    <th className="px-4 py-3 font-semibold">Parents Stated</th>
                    <th className="px-4 py-3 font-semibold">Branch Request</th>
                    <th className="px-4 py-3 font-semibold">Duplicate Check</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E3252]">
                  {registrations.map((reg) => {
                    const liveDupes = detectPotentialDuplicates(
                      { fullName: reg.fullName, dateOfBirth: reg.dateOfBirth, fatherNameText: reg.fatherNameText },
                      members,
                    );
                    return (
                      <tr key={reg.id} className="hover:bg-[#FAF9F6]/60 dark:hover:bg-[#0B1629]/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{reg.fullName}</p>
                          <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                            {reg.email} · {reg.phone} · DOB {reg.dateOfBirth}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[#475569] dark:text-[#CBD5E1]">
                          F: {reg.fatherNameText || '—'} / M: {reg.motherNameText || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {reg.registrationType === 'new_branch'
                            ? `New: ${reg.newBranchName}`
                            : branches.find((b) => b.id === reg.branchId)?.name || 'Existing Branch'}
                        </td>
                        <td className="px-4 py-3">
                          {reg.status === 'pending' && liveDupes.length > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {liveDupes.length} possible match
                            </span>
                          ) : (
                            <span className="text-[#64748B] dark:text-[#94A3B8]">Clear</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium capitalize">{reg.status}</td>
                        <td className="px-4 py-3 text-right">
                          {reg.status === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => openReview(reg)}
                              className="rounded-lg bg-[#0F2342] px-3 py-1.5 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                            >
                              Verify &amp; Review
                            </button>
                          ) : (
                            <span className="text-[#64748B] dark:text-[#94A3B8]">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Review Drawer */}
          {reviewingReg && (
            <div className="rounded-xl border border-[#C99A2E] bg-white/95 p-6 backdrop-blur-md dark:border-[#D4AF37] dark:bg-[#0F1D33]/95">
              <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    Verify &amp; Place: {reviewingReg.fullName}
                  </h2>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                    Confirm explicit parent, spouse, branch, and generation before approving into the tree.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingReg(null)}
                  className="p-1 text-[#64748B] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium">Father Node</label>
                  <select
                    value={revFatherId}
                    onChange={(e) => setRevFatherId(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <option value="">None / Unlinked</option>
                    {members
                      .filter((m) => m.gender === 'male')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} (Gen {m.generation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Mother Node</label>
                  <select
                    value={revMotherId}
                    onChange={(e) => setRevMotherId(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <option value="">None / Unlinked</option>
                    {members
                      .filter((m) => m.gender === 'female')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} (Gen {m.generation})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">Spouse Node</label>
                  <select
                    value={revSpouseId}
                    onChange={(e) => setRevSpouseId(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <option value="">None</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} (Gen {m.generation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Assign Branch</label>
                  <select
                    value={revBranchId}
                    onChange={(e) => setRevBranchId(e.target.value)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <option value="">Create New Branch ({revNewBranch || 'Proposed'})</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Generation Tier (0 = Founder)</label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={revGen}
                    onChange={(e) => setRevGen(Number(e.target.value))}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium">Role in Lineage</label>
                  <select
                    value={revRole}
                    onChange={(e) => setRevRole(e.target.value as LineageRole)}
                    className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                  >
                    <option value="descendant">Descendant</option>
                    <option value="spouse">Spouse</option>
                    <option value="founder">Founder</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium">Review Note (Visible to Applicant)</label>
                <input
                  type="text"
                  value={revNote}
                  onChange={(e) => setRevNote(e.target.value)}
                  placeholder="Optional approval or rejection explanation..."
                  className="w-full rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleReject(reviewingReg, revNote)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject Application
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleApprove()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve &amp; Add to Tree
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Relationship Proposals */}
      {tab === 'relationships' && isAdmin && (
        <div className="space-y-3">
          {relationships.length === 0 ? (
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-10 text-center text-sm text-[#64748B] backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85 dark:text-[#94A3B8]">
              No relationship verification requests pending.
            </div>
          ) : (
            relationships.map((prop) => {
              const fromM = memberMap.get(prop.fromMemberId);
              const toM = memberMap.get(prop.toMemberId);
              return (
                <div
                  key={prop.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-4 text-xs backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85"
                >
                  <div>
                    <p className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                      {toM?.fullName || prop.toMemberId} proposed as{' '}
                      <span className="uppercase text-[#9A7214] dark:text-[#D4AF37]">{prop.relationType}</span> of{' '}
                      {fromM?.fullName || prop.fromMemberId}
                    </p>
                    <p className="mt-1 text-[#64748B] dark:text-[#94A3B8]">
                      Status: <span className="capitalize font-medium">{prop.status}</span>
                      {prop.notes ? ` · "${prop.notes}"` : ''}
                    </p>
                  </div>

                  {prop.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void verifyRelationshipProposal(prop, false)}
                        className="rounded-lg border border-red-300 px-3 py-1.5 font-semibold text-red-700 dark:border-red-900/60 dark:text-red-300 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => void verifyRelationshipProposal(prop, true)}
                        className="rounded-lg bg-[#0F2342] px-3 py-1.5 font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                      >
                        Verify Link
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: AI Escalations */}
      {tab === 'escalations' && isAdmin && (
        <div className="space-y-4">
          {escalations.length === 0 ? (
            <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-10 text-center text-sm text-[#64748B] backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85 dark:text-[#94A3B8]">
              No escalated cases from FamilyGuide AI.
            </div>
          ) : (
            escalations.map((esc) => (
              <div
                key={esc.id}
                className="space-y-3 rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 text-xs backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4 text-[#C99A2E]" />
                    <span className="font-semibold text-sm">{esc.topic}</span>
                    <span className="text-[#64748B] dark:text-[#94A3B8]">· From {esc.userName}</span>
                  </div>
                  <span className="font-mono uppercase">{esc.status}</span>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-[#FAF9F6] p-3 text-[#475569] dark:bg-[#081120] dark:text-[#CBD5E1]">
                  {esc.conversationSummary}
                </p>
                {esc.status === 'open' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={escReplies[esc.id] || ''}
                      onChange={(e) => setEscReplies((prev) => ({ ...prev, [esc.id]: e.target.value }))}
                      placeholder="Write administrator resolution..."
                      className="flex-1 rounded-lg border border-[#CBD5E1] bg-white px-3 py-2 text-xs dark:border-[#1E3252] dark:bg-[#081120]"
                    />
                    <button
                      type="button"
                      onClick={() => void resolveEscalation(esc, escReplies[esc.id] || 'Resolved by administrator.')}
                      className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  </div>
                ) : (
                  <p className="text-emerald-700 dark:text-emerald-300">Resolution: {esc.adminResponse}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: Admin Activity Logs */}
      {tab === 'logs' && isAdmin && (
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
            <History className="h-4 w-4 text-[#C99A2E]" />
            <h2 className="font-display text-lg font-semibold">Immutable Administrator Activity Log</h2>
          </div>

          {adminLogs.length === 0 ? (
            <p className="py-6 text-xs text-[#64748B] dark:text-[#94A3B8]">No administrator actions recorded yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-[#E2E8F0] dark:divide-[#1E3252]">
              {adminLogs.map((log) => (
                <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                  <div>
                    <span className="font-mono font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                      {log.action}
                    </span>{' '}
                    <span className="text-[#0F2342] dark:text-[#F8FAFC]">{log.summary}</span>
                  </div>
                  <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">{log.adminEmail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
