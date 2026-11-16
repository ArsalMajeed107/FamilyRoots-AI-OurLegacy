import React, { useState } from 'react';
import {
  ArrowRight,
  Cake,
  Calendar,
  Crown,
  MailCheck,
  MessageSquare,
  ShieldCheck,
  Trees,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { computeFamilyStats, generationLabel, getUpcomingBirthdays } from '../lib/genealogyUtils';
import { getInitials } from '../lib/imageUtils';
import { FamilyMember } from '../types/family';
import { AppView } from './Navbar';

interface DashboardViewProps {
  onNavigate: (view: AppView) => void;
  onSelectMember: (member: FamilyMember) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onSelectMember }) => {
  const {
    user,
    userProfile,
    isAdmin,
    branchAdminAssignment,
    hasStewardAccess,
    members,
    branches,
    registrations,
    events,
    myPendingInvite,
    claimMemberInvite,
    resendVerificationEmail,
    refreshAuthUser,
  } = useAuth();

  const [claiming, setClaiming] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const stats = computeFamilyStats(members, branches, registrations);
  const linkedMember = userProfile?.linkedMemberId
    ? members.find((m) => m.id === userProfile.linkedMemberId)
    : undefined;
  const familyHeadMember =
    members.find((m) => m.isFamilyHead) ||
    members.find((m) => m.roleInLineage === 'founder' && m.gender === 'male') ||
    members[0];

  const myPendingRegs = registrations.filter((r) => r.applicantUid === user?.uid && r.status === 'pending');
  const upcomingBirthdays = getUpcomingBirthdays(members, 60).slice(0, 5);
  const recentMembers = members.slice(-5).reverse();
  const latestEvents = events.slice(-4).reverse();

  const handleClaim = async () => {
    if (!myPendingInvite) return;
    setClaiming(true);
    try {
      await claimMemberInvite(myPendingInvite);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Email Verification Alert if needed */}
      {user && !user.emailVerified && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950 backdrop-blur-md dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200">
          <div>
            <p className="font-semibold">Email Verification Pending</p>
            <p className="mt-0.5">
              Please verify {user.email} to claim invited family profiles, submit registrations, or post to the archive.
              {verifyMsg ? ` (${verifyMsg})` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await resendVerificationEmail();
                setVerifyMsg('Verification link resent');
              }}
              className="rounded-lg border border-amber-500 px-3 py-1.5 font-semibold cursor-pointer"
            >
              Resend Email
            </button>
            <button
              type="button"
              onClick={() => void refreshAuthUser()}
              className="rounded-lg bg-[#0F2342] px-3 py-1.5 font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              I Have Verified
            </button>
          </div>
        </div>
      )}

      {/* Pending Family Member Login Invitation Banner */}
      {myPendingInvite && !linkedMember && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#C99A2E] bg-[#FFFBF0]/90 p-5 backdrop-blur-md dark:border-[#D4AF37]/60 dark:bg-[#132542]/90">
          <div className="flex items-center gap-3">
            <MailCheck className="h-6 w-6 text-[#9A7214] dark:text-[#D4AF37]" />
            <div>
              <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                Your Family Profile Is Ready: {myPendingInvite.memberName}
              </p>
              <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                The Family Head has registered you in the family tree. Claim your personal account link now.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={claiming}
            onClick={() => void handleClaim()}
            className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
          >
            {claiming ? 'Linking Account...' : 'Claim My Member Profile'}
          </button>
        </div>
      )}

      {/* Welcome Banner + Crest */}
      <div className="grid grid-cols-1 gap-6 rounded-2xl border border-[#CBD5E1]/70 bg-white/85 p-6 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85 lg:grid-cols-12">
        <div className="flex flex-col justify-between lg:col-span-8">
          <div>
            <p className="text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
              FamilyRoots AI ·{' '}
              {isAdmin
                ? 'Main Family Head & Administrator Console'
                : branchAdminAssignment
                  ? `Branch Administrator · ${branchAdminAssignment.branchName}`
                  : 'Verified Family Member Portal'}
            </p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
              Welcome, {linkedMember?.fullName || userProfile?.displayName || user?.displayName || 'Family Member'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#475569] dark:text-[#CBD5E1]">
              {linkedMember
                ? `Connected to ${linkedMember.branchName} · ${generationLabel(linkedMember.generation)}.`
                : 'Explore the family tree or submit a verified registration request to the Main Family Head.'}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('tree')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193561] dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
            >
              <Trees className="h-4 w-4" />
              Explore Family Tree
            </button>
            {hasStewardAccess && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#C99A2E] px-4 py-2 text-xs font-semibold text-[#0F2342] hover:bg-[#FFFBF0] dark:border-[#D4AF37] dark:text-[#D4AF37] dark:hover:bg-[#162742] cursor-pointer"
              >
                <Crown className="h-3.5 w-3.5" />
                {isAdmin ? 'Manage Family & Members' : 'Manage Branch Members'}
              </button>
            )}
            {!linkedMember && (
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#C99A2E] px-4 py-2 text-xs font-semibold text-[#0F2342] hover:bg-[#FFFBF0] dark:border-[#D4AF37] dark:text-[#D4AF37] dark:hover:bg-[#162742] cursor-pointer"
              >
                Register Profile
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate('guide')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-semibold text-[#0F2342] hover:bg-[#F1F4F9] dark:border-[#1E3252] dark:text-[#F8FAFC] dark:hover:bg-[#162742] cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-[#C99A2E]" />
              Ask FamilyGuide AI
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-[#E2E8F0] pt-4 dark:border-[#1E3252] lg:col-span-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <img
            src="/src/assets/images/crest_ourlegacy_emblem_1794849068401.jpg"
            alt="OurLegacy family crest medallion"
            referrerPolicy="no-referrer"
            className="h-24 w-24 shrink-0 rounded-xl border border-[#C99A2E]/50 object-cover"
          />
          <div className="min-w-0 text-xs">
            <p className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">Your Lineage Status</p>
            <p className="mt-1 text-[#64748B] dark:text-[#94A3B8]">
              {linkedMember
                ? 'Verified in Genealogy Tree'
                : myPendingRegs.length > 0
                  ? `${myPendingRegs.length} registration awaiting review`
                  : 'Not yet linked to a tree node'}
            </p>
            {linkedMember && (
              <button
                type="button"
                onClick={() => onSelectMember(linkedMember)}
                className="mt-2 font-semibold text-[#9A7214] underline dark:text-[#D4AF37] cursor-pointer"
              >
                View My Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Family Head Spotlight */}
      {familyHeadMember && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#C99A2E]/40 bg-white/85 p-5 backdrop-blur-md dark:border-[#D4AF37]/30 dark:bg-[#0F1D33]/85">
          <div className="flex items-center gap-4">
            {familyHeadMember.photoUrl ? (
              <img
                src={familyHeadMember.photoUrl}
                alt={familyHeadMember.fullName}
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-xl border-2 border-[#C99A2E] object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-[#C99A2E] bg-[#0F2342] font-display text-lg font-semibold text-[#D4AF37]">
                {getInitials(familyHeadMember.fullName)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9A7214] dark:text-[#D4AF37]">
                <Crown className="h-3.5 w-3.5" />
                <span>Main Family Head</span>
              </div>
              <h2 className="font-display text-xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                {familyHeadMember.fullName}
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {generationLabel(familyHeadMember.generation)} · {familyHeadMember.branchName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMember(familyHeadMember)}
            className="rounded-lg border border-[#C99A2E]/60 px-4 py-2 text-xs font-semibold text-[#0F2342] hover:bg-[#FFFBF0] dark:border-[#D4AF37]/50 dark:text-[#D4AF37] dark:hover:bg-[#162742] cursor-pointer"
          >
            Inspect Family Head Profile
          </button>
        </div>
      )}

      {/* Real Database KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Total Family Members</p>
          <p className="font-mono mt-2 text-3xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC]">
            {stats.totalMembers}
          </p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Generations Recorded</p>
          <p className="font-mono mt-2 text-3xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC]">
            {stats.totalGenerations}
          </p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Family Branches</p>
          <p className="font-mono mt-2 text-3xl font-semibold tabular-nums text-[#0F2342] dark:text-[#F8FAFC]">
            {stats.totalBranches}
          </p>
        </div>
        <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {isAdmin ? 'Pending Approvals' : 'Your Pending Requests'}
          </p>
          <p className="font-mono mt-2 text-3xl font-semibold tabular-nums text-[#9A7214] dark:text-[#D4AF37]">
            {isAdmin ? stats.pendingRegs : myPendingRegs.length}
          </p>
        </div>
      </div>

      {/* Main Content Split: Tree Preview + Announcements + Birthdays */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
              <h2 className="font-display text-lg font-semibold">Lineage Preview</h2>
              <button
                type="button"
                onClick={() => onNavigate('tree')}
                className="text-xs font-semibold text-[#9A7214] hover:underline dark:text-[#D4AF37] cursor-pointer"
              >
                Open 2D &amp; 3D Tree
              </button>
            </div>

            {members.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                {isAdmin
                  ? 'No verified members yet. Visit Family Head Stewardship to initialize the Founding Grandfather & Grandmother.'
                  : 'The family tree is awaiting initial setup by the Main Family Head.'}
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recentMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMember(m)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#FAF9F6]/90 px-3.5 py-2.5 text-left hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#081120]/90 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {m.photoUrl ? (
                        <img
                          src={m.photoUrl}
                          alt={m.fullName}
                          referrerPolicy="no-referrer"
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F2342] font-display text-xs font-semibold text-[#D4AF37]">
                          {getInitials(m.fullName)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                          {m.fullName}
                          {m.isFamilyHead ? ' · Main Family Head' : ''}
                        </p>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                          Gen {m.generation} · {m.branchName}
                        </p>
                      </div>
                    </div>
                    <UserCheck className="h-4 w-4 text-[#C99A2E]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasStewardAccess && (
            <div className="flex items-center justify-between rounded-xl border border-[#C99A2E]/40 bg-[#FFFBF0]/90 p-5 backdrop-blur-md dark:border-[#D4AF37]/40 dark:bg-[#132542]/90">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#9A7214] dark:text-[#D4AF37]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
                    {isAdmin ? 'Family Head Verification Queue' : 'Branch Administrator Console'}
                  </p>
                  <p className="text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {isAdmin
                      ? `${stats.pendingRegs} pending registrations awaiting review · Add members & issue login invites.`
                      : `Manage members and login invitations for ${branchAdminAssignment?.branchName}.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className="rounded-lg bg-[#0F2342] px-4 py-2 text-xs font-semibold text-white dark:bg-[#D4AF37] dark:text-[#081120] cursor-pointer"
              >
                Open Console
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Announcements & Birthdays */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
              <h2 className="font-display text-lg font-semibold">Family Announcements</h2>
              <button
                type="button"
                onClick={() => onNavigate('archive')}
                className="text-xs font-semibold text-[#9A7214] hover:underline dark:text-[#D4AF37] cursor-pointer"
              >
                View Archive
              </button>
            </div>

            {latestEvents.length === 0 ? (
              <p className="py-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
                No announcements or reunions posted yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {latestEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-[#E2E8F0] bg-[#FAF9F6]/90 p-3.5 text-xs dark:border-[#1E3252] dark:bg-[#081120]/90"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{ev.title}</span>
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#9A7214] dark:text-[#D4AF37]">
                        <Calendar className="h-3 w-3" />
                        {ev.eventDate}
                      </span>
                    </div>
                    <p className="mt-1 text-[#475569] dark:text-[#94A3B8]">{ev.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#CBD5E1]/70 bg-white/85 p-5 backdrop-blur-md dark:border-[#1E3252] dark:bg-[#0F1D33]/85">
            <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3 dark:border-[#1E3252]">
              <Cake className="h-4 w-4 text-[#C99A2E]" />
              <h2 className="font-display text-lg font-semibold">Upcoming Birthdays</h2>
            </div>

            {upcomingBirthdays.length === 0 ? (
              <p className="py-6 text-xs text-[#64748B] dark:text-[#94A3B8]">
                No upcoming family birthdays in the next 60 days.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#E2E8F0] dark:divide-[#1E3252]">
                {upcomingBirthdays.map((item) => (
                  <div key={item.member.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-[#0F2342] dark:text-[#F8FAFC]">{item.member.fullName}</p>
                      <p className="text-[#64748B] dark:text-[#94A3B8]">
                        {item.displayDate}
                        {item.turningAge !== null ? ` · Turning ${item.turningAge}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[#9A7214] dark:text-[#D4AF37]">
                      {item.daysUntil === 0 ? 'Today' : `In ${item.daysUntil}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
