import { FamilyBranch, FamilyMember, RegistrationRequest } from '../types/family';

export function makeSafeId(prefix: string): string {
  const randomPart = Math.random().toString(36).slice(2, 8);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function detectPotentialDuplicates(
  candidate: { fullName: string; dateOfBirth: string; fatherNameText?: string },
  existingMembers: FamilyMember[],
): FamilyMember[] {
  const normCandidate = normalizeName(candidate.fullName);
  if (!normCandidate) return [];

  return existingMembers.filter((m) => {
    const normMember = normalizeName(m.fullName);
    const exactName = normMember === normCandidate;
    const partialMatch =
      normCandidate.length >= 4 &&
      (normMember.includes(normCandidate) || normCandidate.includes(normMember));
    const sameDob =
      Boolean(candidate.dateOfBirth) &&
      Boolean(m.dateOfBirth) &&
      candidate.dateOfBirth === m.dateOfBirth;
    const sameFather =
      Boolean(candidate.fatherNameText) &&
      Boolean(m.fatherNameText) &&
      normalizeName(candidate.fatherNameText || '') === normalizeName(m.fatherNameText);

    return exactName || (partialMatch && (sameDob || sameFather));
  });
}

export function getChildrenOf(memberId: string, members: FamilyMember[]): FamilyMember[] {
  return members.filter((m) => m.fatherId === memberId || m.motherId === memberId);
}

export function getAncestorsSet(memberId: string, members: FamilyMember[]): Set<string> {
  const visited = new Set<string>();
  const map = new Map(members.map((m) => [m.id, m]));
  const queue = [memberId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const m = map.get(id);
    if (!m) continue;
    if (m.fatherId && !visited.has(m.fatherId)) {
      visited.add(m.fatherId);
      queue.push(m.fatherId);
    }
    if (m.motherId && !visited.has(m.motherId)) {
      visited.add(m.motherId);
      queue.push(m.motherId);
    }
  }
  return visited;
}

export function getDescendantsSet(memberId: string, members: FamilyMember[]): Set<string> {
  const visited = new Set<string>();
  const queue = [memberId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const children = getChildrenOf(id, members);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return visited;
}

export interface UpcomingBirthday {
  member: FamilyMember;
  daysUntil: number;
  turningAge: number | null;
  displayDate: string;
}

export function getUpcomingBirthdays(members: FamilyMember[], withinDays = 45): UpcomingBirthday[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const results: UpcomingBirthday[] = [];

  for (const member of members) {
    if (!member.dateOfBirth || member.isDeceased) continue;
    const parts = member.dateOfBirth.split('-').map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) continue;
    const [birthYear, month, day] = parts;
    let nextBday = new Date(today.getFullYear(), month - 1, day);
    if (nextBday < today) {
      nextBday = new Date(today.getFullYear() + 1, month - 1, day);
    }
    const diffMs = nextBday.getTime() - today.getTime();
    const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= withinDays) {
      const turningAge = birthYear > 1800 ? nextBday.getFullYear() - birthYear : null;
      results.push({
        member,
        daysUntil,
        turningAge,
        displayDate: nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      });
    }
  }

  return results.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function computeFamilyStats(
  members: FamilyMember[],
  branches: FamilyBranch[],
  registrations: RegistrationRequest[],
) {
  const maxGen = members.length > 0 ? Math.max(...members.map((m) => m.generation)) + 1 : 0;
  const maleCount = members.filter((m) => m.gender === 'male').length;
  const femaleCount = members.filter((m) => m.gender === 'female').length;
  const otherCount = members.filter((m) => m.gender === 'other').length;
  const pendingRegs = registrations.filter((r) => r.status === 'pending').length;
  const approvedRegs = registrations.filter((r) => r.status === 'approved').length;
  const rejectedRegs = registrations.filter((r) => r.status === 'rejected').length;

  return {
    totalMembers: members.length,
    totalGenerations: maxGen,
    totalBranches: branches.length,
    maleCount,
    femaleCount,
    otherCount,
    pendingRegs,
    approvedRegs,
    rejectedRegs,
  };
}

export function generationLabel(gen: number): string {
  if (gen === 0) return 'Gen 0 · Founding Grandparents';
  if (gen === 1) return 'Gen 1 · Sons & Daughters';
  if (gen === 2) return 'Gen 2 · Grandchildren';
  if (gen === 3) return 'Gen 3 · Great-Grandchildren';
  return `Gen ${gen} · Descendants`;
}
