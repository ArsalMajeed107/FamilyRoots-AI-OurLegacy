import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Download,
  GitBranch,
  Printer,
  Search,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FamilyBranch, FamilyMember } from '../types/family';
import { generationLabel, getAncestorsSet, getChildrenOf, getDescendantsSet } from '../lib/genealogyUtils';
import { getInitials } from '../lib/imageUtils';
import { exportFamilyTreePdf } from '../lib/pdfExport';

interface Tree2DViewProps {
  members: FamilyMember[];
  branches: FamilyBranch[];
  selectedMemberId: string | null;
  onSelectMember: (member: FamilyMember) => void;
  selectedBranchId: string;
  onChangeBranch: (branchId: string) => void;
}

type SpotlightMode = 'none' | 'ancestors' | 'descendants';

export const Tree2DView: React.FC<Tree2DViewProps> = ({
  members,
  branches,
  selectedMemberId,
  onSelectMember,
  selectedBranchId,
  onChangeBranch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(1);
  const [collapsedGens, setCollapsedGens] = useState<Record<number, boolean>>({});
  const [spotlightMode, setSpotlightMode] = useState<SpotlightMode>('none');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (selectedBranchId && m.branchId !== selectedBranchId) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          m.fullName.toLowerCase().includes(q) ||
          m.branchName.toLowerCase().includes(q) ||
          m.fatherNameText.toLowerCase().includes(q) ||
          m.motherNameText.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [members, selectedBranchId, searchTerm]);

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const spotlightSet = useMemo(() => {
    if (!selectedMemberId || spotlightMode === 'none') return null;
    const set =
      spotlightMode === 'ancestors'
        ? getAncestorsSet(selectedMemberId, members)
        : getDescendantsSet(selectedMemberId, members);
    set.add(selectedMemberId);
    return set;
  }, [selectedMemberId, spotlightMode, members]);

  const generations = useMemo(() => {
    const map = new Map<number, FamilyMember[]>();
    filteredMembers.forEach((m) => {
      const arr = map.get(m.generation) || [];
      arr.push(m);
      map.set(m.generation, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filteredMembers]);

  // Pair spouses side by side within each generation tier
  const groupPairs = (tierMembers: FamilyMember[]) => {
    const seen = new Set<string>();
    const units: Array<{ primary: FamilyMember; spouse?: FamilyMember }> = [];

    tierMembers.forEach((m) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      const spouse = m.spouseId ? tierMembers.find((s) => s.id === m.spouseId && !seen.has(s.id)) : undefined;
      if (spouse) seen.add(spouse.id);
      units.push({ primary: m, spouse });
    });
    return units;
  };

  const toggleGen = (gen: number) => {
    setCollapsedGens((prev) => ({ ...prev, [gen]: !prev[gen] }));
  };

  const renderMemberCard = (member: FamilyMember) => {
    const isSelected = member.id === selectedMemberId;
    const dimmed = spotlightSet ? !spotlightSet.has(member.id) : false;
    const father = member.fatherId ? memberMap.get(member.fatherId) : undefined;
    const mother = member.motherId ? memberMap.get(member.motherId) : undefined;
    const childrenCount = getChildrenOf(member.id, members).length;

    return (
      <button
        key={member.id}
        type="button"
        onClick={() => onSelectMember(member)}
        className={`group flex w-60 flex-col rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
          isSelected
            ? 'border-[#C99A2E] bg-[#FFFBF0] ring-2 ring-[#C99A2E]/35 dark:border-[#D4AF37] dark:bg-[#132542]'
            : 'border-[#E2E8F0] bg-white hover:border-[#C99A2E]/70 dark:border-[#1E3252] dark:bg-[#0F1D33] dark:hover:border-[#D4AF37]/60'
        } ${dimmed ? 'opacity-35' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.fullName}
              referrerPolicy="no-referrer"
              className="h-11 w-11 shrink-0 rounded-full border border-[#C99A2E]/60 object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C99A2E]/50 bg-[#0F2342] font-display text-sm font-semibold text-[#D4AF37]">
              {getInitials(member.fullName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
              {member.fullName}
            </p>
            <p className="truncate text-[11px] text-[#64748B] dark:text-[#94A3B8]">
              {member.roleInLineage === 'founder' ? 'Founder' : member.roleInLineage === 'spouse' ? 'Spouse' : 'Descendant'} ·{' '}
              {member.dateOfBirth ? member.dateOfBirth.slice(0, 4) : 'Year N/A'}
            </p>
          </div>
        </div>

        <div className="mt-2.5 border-t border-[#E2E8F0] pt-2 text-[11px] text-[#475569] dark:border-[#1E3252] dark:text-[#94A3B8]">
          {father || mother ? (
            <p className="truncate">
              Parents: {[father?.fullName, mother?.fullName].filter(Boolean).join(' & ')}
            </p>
          ) : (
            <p className="truncate">
              {member.generation === 0 ? 'Founding Ancestor Pair' : 'Parent links awaiting assignment'}
            </p>
          )}
          <p className="mt-0.5 font-mono text-[10px] text-[#9A7214] dark:text-[#D4AF37]">
            {member.branchName} · {childrenCount} {childrenCount === 1 ? 'child' : 'children'}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3.5 dark:border-[#1E3252] dark:bg-[#0F1D33]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member or parent..."
              className="w-56 rounded-lg border border-[#CBD5E1] bg-[#FAF9F6] py-1.5 pl-9 pr-3 text-xs text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#F8FAFC]"
            />
          </div>

          <select
            value={selectedBranchId}
            onChange={(e) => onChangeBranch(e.target.value)}
            className="rounded-lg border border-[#CBD5E1] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#0F2342] focus:border-[#C99A2E] focus:outline-none dark:border-[#1E3252] dark:bg-[#081120] dark:text-[#F8FAFC]"
          >
            <option value="">All Family Branches ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {selectedMemberId && (
            <div className="flex items-center gap-1 rounded-lg bg-[#F1F4F9] p-1 dark:bg-[#081120]">
              <button
                type="button"
                onClick={() => setSpotlightMode('none')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  spotlightMode === 'none'
                    ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-white'
                    : 'text-[#64748B]'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSpotlightMode('ancestors')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  spotlightMode === 'ancestors'
                    ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#D4AF37]'
                    : 'text-[#64748B]'
                }`}
              >
                Ancestors
              </button>
              <button
                type="button"
                onClick={() => setSpotlightMode('descendants')}
                className={`rounded px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  spotlightMode === 'descendants'
                    ? 'bg-white text-[#0F2342] shadow-sm dark:bg-[#1E3252] dark:text-[#D4AF37]'
                    : 'text-[#64748B]'
                }`}
              >
                Descendants
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-[#E2E8F0] dark:border-[#1E3252]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.1).toFixed(2))))}
              aria-label="Zoom out"
              className="p-1.5 text-[#475569] hover:text-[#0F2342] dark:text-[#94A3B8] dark:hover:text-white cursor-pointer"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-xs text-[#0F2342] dark:text-[#F8FAFC]">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.35, Number((z + 0.1).toFixed(2))))}
              aria-label="Zoom in"
              className="p-1.5 text-[#475569] hover:text-[#0F2342] dark:text-[#94A3B8] dark:hover:text-white cursor-pointer"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => exportFamilyTreePdf(members, branches, selectedBranchId || undefined)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5E1] px-3 py-1.5 text-xs font-semibold text-[#0F2342] hover:bg-[#F1F4F9] dark:border-[#1E3252] dark:text-[#F8FAFC] dark:hover:bg-[#162742] whitespace-nowrap cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#C99A2E]" />
            Export PDF
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F2342] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#193561] dark:bg-[#D4AF37] dark:text-[#081120] whitespace-nowrap cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Tree
          </button>
        </div>
      </div>

      {/* Generational Tree Canvas */}
      {generations.length === 0 ? (
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-12 text-center dark:border-[#1E3252] dark:bg-[#0F1D33]">
          <GitBranch className="mx-auto h-10 w-10 text-[#C99A2E]" />
          <h3 className="font-display mt-3 text-xl font-semibold text-[#0F2342] dark:text-[#F8FAFC]">
            No Verified Generations Found
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B] dark:text-[#94A3B8]">
            {members.length === 0
              ? 'An administrator can establish the Founding Grandfather and Grandmother (Generation 0) from the Admin panel, or approve pending member registrations.'
              : 'No verified family members match your current branch or search filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 dark:border-[#1E3252] dark:bg-[#081120]">
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            className="mx-auto flex min-w-max flex-col items-center gap-8 transition-transform duration-150"
          >
            {generations.map(([gen, tierMembers], tierIndex) => {
              const isCollapsed = Boolean(collapsedGens[gen]);
              const pairs = groupPairs(tierMembers);
              return (
                <div key={gen} className="flex w-full flex-col items-center">
                  {tierIndex > 0 && (
                    <div className="mb-3 h-6 w-px bg-[#C99A2E]/60" aria-hidden="true" />
                  )}

                  {/* Generation Header */}
                  <button
                    type="button"
                    onClick={() => toggleGen(gen)}
                    className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-1.5 text-xs font-semibold text-[#0F2342] hover:border-[#C99A2E] dark:border-[#1E3252] dark:bg-[#0F1D33] dark:text-[#D4AF37] cursor-pointer"
                  >
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>{generationLabel(gen)}</span>
                    <span className="font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                      ({tierMembers.length})
                    </span>
                  </button>

                  {!isCollapsed && (
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {pairs.map(({ primary, spouse }) => (
                        <div
                          key={primary.id}
                          className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white/50 p-2.5 dark:border-[#1E3252] dark:bg-[#0B1629]/60"
                        >
                          {renderMemberCard(primary)}
                          {spouse && (
                            <>
                              <div className="flex flex-col items-center px-1" title="Verified Marriage">
                                <span className="h-0.5 w-5 bg-[#C99A2E]" />
                                <span className="mt-0.5 h-0.5 w-5 bg-[#C99A2E]" />
                              </div>
                              {renderMemberCard(spouse)}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
