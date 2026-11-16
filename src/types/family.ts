export type Gender = 'male' | 'female' | 'other';
export type LineageRole = 'founder' | 'descendant' | 'spouse';
export type RegistrationType = 'new_branch' | 'join_branch';
export type RegistrationStatus = 'pending' | 'approved' | 'rejected';
export type RelationType = 'father' | 'mother' | 'spouse';
export type LanguagePreference = 'en' | 'ur' | 'roman_ur';
export type ThemePreference = 'light' | 'dark';

export const FIELD_LIMITS = {
  ID_MAX: 128,
  NAME_MAX: 120,
  EMAIL_MAX: 160,
  PHONE_MAX: 40,
  BIO_MAX: 2000,
  PHOTO_MAX: 250000,
  GALLERY_PHOTO_MAX: 350000,
  STORY_MAX: 4000,
  NOTE_MAX: 600,
} as const;

export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface UserProfile {
  uid: string;
  displayName: string;
  role: 'member' | 'admin';
  linkedMemberId: string;
  themePreference: ThemePreference;
  preferredLanguage: LanguagePreference;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface UserPrivateContact {
  uid: string;
  email: string;
  phone: string;
  updatedAt?: unknown;
}

export interface BranchAdminAssignment {
  uid: string;
  email: string;
  branchId: string;
  branchName: string;
  grantedByUid: string;
  createdAt?: unknown;
}

export interface FamilyBranch {
  id: string;
  name: string;
  description: string;
  originLocation: string;
  founderPairLabel: string;
  visibility: 'family';
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FamilyMember {
  id: string;
  uid: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: string;
  isDeceased: boolean;
  deathDate: string;
  generation: number;
  branchId: string;
  branchName: string;
  fatherId: string;
  motherId: string;
  spouseId: string;
  fatherNameText: string;
  motherNameText: string;
  roleInLineage: LineageRole;
  isFamilyHead?: boolean;
  biography: string;
  photoUrl: string;
  visibility: 'family';
  isVerified: boolean;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MemberInvite {
  id: string;
  memberId: string;
  memberName: string;
  branchId: string;
  invitedEmail: string;
  status: 'pending' | 'claimed';
  claimedByUid: string;
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PublicStats {
  id: 'showcase';
  totalMembers: number;
  totalGenerations: number;
  totalBranches: number;
  familyHeadMemberId: string;
  familyHeadName: string;
  familyHeadTitle: string;
  familyHeadBranch: string;
  familyHeadOrigin: string;
  familyHeadBio: string;
  familyHeadPhotoUrl: string;
  updatedAt?: unknown;
}

export interface RegistrationRequest {
  id: string;
  applicantUid: string;
  fullName: string;
  email: string;
  phone: string;
  gender: Gender;
  dateOfBirth: string;
  fatherNameText: string;
  motherNameText: string;
  requestedFatherId: string;
  requestedMotherId: string;
  requestedSpouseId: string;
  registrationType: RegistrationType;
  branchId: string;
  newBranchName: string;
  photoUrl: string;
  biography: string;
  status: RegistrationStatus;
  reviewNote: string;
  duplicateMatchIds: string[];
  reviewedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RelationshipProposal {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  relationType: RelationType;
  notes: string;
  proposedByUid: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FamilyStory {
  id: string;
  title: string;
  eraYear: string;
  branchId: string;
  content: string;
  coverImageUrl: string;
  visibility: 'family';
  authorUid: string;
  authorName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FamilyPhoto {
  id: string;
  title: string;
  caption: string;
  yearTaken: string;
  branchId: string;
  imageUrl: string;
  visibility: 'family';
  uploadedByUid: string;
  uploadedByName: string;
  createdAt?: unknown;
}

export interface FamilyEvent {
  id: string;
  title: string;
  eventType: 'announcement' | 'reunion' | 'milestone' | 'memorial';
  eventDate: string;
  location: string;
  description: string;
  branchId: string;
  visibility: 'family';
  authorUid: string;
  authorName: string;
  createdAt?: unknown;
}

export interface AdminActivityLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt?: unknown;
}

export interface SupportEscalation {
  id: string;
  userUid: string;
  userName: string;
  topic: string;
  conversationSummary: string;
  status: 'open' | 'resolved';
  adminResponse: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
