import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleAuthProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import { computeFamilyStats, makeSafeId } from '../lib/genealogyUtils';
import {
  AdminActivityLog,
  BranchAdminAssignment,
  FamilyBranch,
  FamilyEvent,
  FamilyMember,
  FamilyPhoto,
  FamilyStory,
  Gender,
  LanguagePreference,
  LineageRole,
  MemberInvite,
  PublicStats,
  RegistrationRequest,
  RegistrationType,
  RelationType,
  RelationshipProposal,
  SupportEscalation,
  ThemePreference,
  UserPrivateContact,
  UserProfile,
} from '../types/family';

const BOOTSTRAP_ADMIN_EMAIL = 'arsalmajeed287@gmail.com';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  userProfile: UserProfile | null;
  privateContact: UserPrivateContact | null;
  isAdmin: boolean;
  branchAdminAssignment: BranchAdminAssignment | null;
  hasStewardAccess: boolean;
  branchAdmins: BranchAdminAssignment[];
  theme: ThemePreference;
  toggleTheme: () => void;
  language: LanguagePreference;
  setLanguage: (lang: LanguagePreference) => void;
  publicStats: PublicStats | null;
  branches: FamilyBranch[];
  members: FamilyMember[];
  memberInvites: MemberInvite[];
  myPendingInvite: MemberInvite | null;
  registrations: RegistrationRequest[];
  relationships: RelationshipProposal[];
  stories: FamilyStory[];
  gallery: FamilyPhoto[];
  events: FamilyEvent[];
  adminLogs: AdminActivityLog[];
  escalations: SupportEscalation[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<void>;
  signOut: () => Promise<void>;
  claimMemberInvite: (invite: MemberInvite) => Promise<void>;
  createMemberInvite: (member: FamilyMember, invitedEmail: string) => Promise<void>;
  revokeMemberInvite: (memberId: string) => Promise<void>;
  designateFamilyHead: (memberId: string) => Promise<void>;
  assignBranchAdmin: (input: { uid: string; email: string; branchId: string }) => Promise<void>;
  revokeBranchAdmin: (uid: string) => Promise<void>;
  submitRegistration: (input: {
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
    duplicateMatchIds: string[];
  }) => Promise<void>;
  approveRegistration: (
    reg: RegistrationRequest,
    overrides: {
      fatherId: string;
      motherId: string;
      spouseId: string;
      branchId: string;
      newBranchName: string;
      generation: number;
      roleInLineage: LineageRole;
      reviewNote: string;
    },
  ) => Promise<void>;
  rejectRegistration: (reg: RegistrationRequest, reviewNote: string) => Promise<void>;
  bootstrapFoundingLineage: (input: {
    branchName: string;
    originLocation: string;
    description: string;
    grandfatherName: string;
    grandfatherDob: string;
    grandfatherBio: string;
    grandfatherPhotoUrl?: string;
    grandfatherEmail?: string;
    grandmotherName: string;
    grandmotherDob: string;
    grandmotherBio: string;
    grandmotherPhotoUrl?: string;
  }) => Promise<void>;
  createBranch: (input: {
    name: string;
    originLocation: string;
    description: string;
    founderPairLabel: string;
  }) => Promise<string>;
  addMemberDirect: (input: {
    fullName: string;
    gender: Gender;
    dateOfBirth: string;
    isDeceased: boolean;
    deathDate: string;
    generation: number;
    branchId: string;
    fatherId: string;
    motherId: string;
    spouseId: string;
    fatherNameText: string;
    motherNameText: string;
    roleInLineage: LineageRole;
    isFamilyHead?: boolean;
    biography: string;
    photoUrl: string;
    invitedEmail?: string;
    uid?: string;
  }) => Promise<void>;
  updateOwnMemberProfile: (
    memberId: string,
    updates: {
      fullName: string;
      dateOfBirth: string;
      biography: string;
      photoUrl: string;
      fatherNameText: string;
      motherNameText: string;
    },
  ) => Promise<void>;
  adminUpdateMember: (
    memberId: string,
    updates: Partial<
      Pick<
        FamilyMember,
        | 'fullName'
        | 'gender'
        | 'dateOfBirth'
        | 'isDeceased'
        | 'deathDate'
        | 'generation'
        | 'branchId'
        | 'branchName'
        | 'fatherId'
        | 'motherId'
        | 'spouseId'
        | 'roleInLineage'
        | 'isFamilyHead'
        | 'biography'
        | 'photoUrl'
      >
    >,
  ) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  proposeRelationship: (input: {
    fromMemberId: string;
    toMemberId: string;
    relationType: RelationType;
    notes: string;
  }) => Promise<void>;
  verifyRelationshipProposal: (proposal: RelationshipProposal, approve: boolean) => Promise<void>;
  addStory: (input: {
    title: string;
    eraYear: string;
    branchId: string;
    content: string;
    coverImageUrl: string;
  }) => Promise<void>;
  addPhoto: (input: {
    title: string;
    caption: string;
    yearTaken: string;
    branchId: string;
    imageUrl: string;
  }) => Promise<void>;
  addEvent: (input: {
    title: string;
    eventType: 'announcement' | 'reunion' | 'milestone' | 'memorial';
    eventDate: string;
    location: string;
    description: string;
    branchId: string;
  }) => Promise<void>;
  deleteArchiveItem: (collectionName: 'stories' | 'gallery' | 'events', id: string) => Promise<void>;
  submitEscalation: (input: { topic: string; conversationSummary: string }) => Promise<void>;
  resolveEscalation: (escalation: SupportEscalation, adminResponse: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [privateContact, setPrivateContact] = useState<UserPrivateContact | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [branchAdminAssignment, setBranchAdminAssignment] = useState<BranchAdminAssignment | null>(null);
  const [branchAdmins, setBranchAdmins] = useState<BranchAdminAssignment[]>([]);

  const [theme, setTheme] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('ourlegacy_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });
  const [language, setLanguageState] = useState<LanguagePreference>('en');

  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [branches, setBranches] = useState<FamilyBranch[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [memberInvites, setMemberInvites] = useState<MemberInvite[]>([]);
  const [myPendingInvite, setMyPendingInvite] = useState<MemberInvite | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [relationships, setRelationships] = useState<RelationshipProposal[]>([]);
  const [stories, setStories] = useState<FamilyStory[]>([]);
  const [gallery, setGallery] = useState<FamilyPhoto[]>([]);
  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>([]);
  const [escalations, setEscalations] = useState<SupportEscalation[]>([]);

  const autoClaimingRef = useRef<string | null>(null);
  const hasStewardAccess = isAdmin || Boolean(branchAdminAssignment);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('ourlegacy_theme', theme);
  }, [theme]);

  // Listen to non-PII public showcase summary even before sign-in
  useEffect(() => {
    const unsubShowcase = onSnapshot(
      doc(db, 'publicStats', 'showcase'),
      (snap) => {
        if (snap.exists()) {
          setPublicStats(snap.data() as PublicStats);
        } else {
          setPublicStats(null);
        }
      },
      (err) => {
        console.warn('Public showcase listener warning:', err);
      },
    );
    return () => unsubShowcase();
  }, []);

  const toggleTheme = () => {
    const next: ThemePreference = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (user && userProfile) {
      updateDoc(doc(db, 'users', user.uid), {
        themePreference: next,
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Theme sync skipped:', err));
    }
  };

  const setLanguage = (lang: LanguagePreference) => {
    setLanguageState(lang);
    if (user && userProfile) {
      updateDoc(doc(db, 'users', user.uid), {
        preferredLanguage: lang,
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Language sync skipped:', err));
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setPrivateContact(null);
        setIsAdmin(false);
        setBranchAdminAssignment(null);
        setBranchAdmins([]);
        setBranches([]);
        setMembers([]);
        setMemberInvites([]);
        setMyPendingInvite(null);
        setRegistrations([]);
        setRelationships([]);
        setStories([]);
        setGallery([]);
        setEvents([]);
        setAdminLogs([]);
        setEscalations([]);
        autoClaimingRef.current = null;
        setAuthReady(true);
        return;
      }

      try {
        const isBootAdmin =
          Boolean(firebaseUser.emailVerified) && firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL;
        let adminDocExists = false;
        try {
          const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
          adminDocExists = adminSnap.exists();
        } catch {
          adminDocExists = false;
        }
        const resolvedAdmin = isBootAdmin || adminDocExists;
        setIsAdmin(resolvedAdmin);

        let branchAssign: BranchAdminAssignment | null = null;
        try {
          const branchAdminSnap = await getDoc(doc(db, 'branchAdmins', firebaseUser.uid));
          if (branchAdminSnap.exists()) {
            branchAssign = branchAdminSnap.data() as BranchAdminAssignment;
          }
        } catch {
          branchAssign = null;
        }
        setBranchAdminAssignment(branchAssign);

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists() && firebaseUser.emailVerified) {
          const initialProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: (firebaseUser.displayName || firebaseUser.email || 'Family Member').slice(0, 120),
            role: resolvedAdmin ? 'admin' : 'member',
            linkedMemberId: '',
            themePreference: theme,
            preferredLanguage: 'en',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, initialProfile);
          if (firebaseUser.email) {
            await setDoc(doc(db, 'users', firebaseUser.uid, 'private', 'contact'), {
              uid: firebaseUser.uid,
              email: firebaseUser.email.slice(0, 160),
              phone: '',
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          setUserProfile(data);
          if (data.preferredLanguage) setLanguageState(data.preferredLanguage);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`),
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users', user.uid, 'private', 'contact'),
      (snap) => {
        if (snap.exists()) setPrivateContact(snap.data() as UserPrivateContact);
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/private/contact`),
    );

    const unsubBranches = onSnapshot(
      query(collection(db, 'branches'), where('visibility', '==', 'family')),
      (snap) => {
        setBranches(snap.docs.map((d) => d.data() as FamilyBranch));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'branches'),
    );

    const unsubMembers = onSnapshot(
      query(collection(db, 'members'), where('visibility', '==', 'family')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as FamilyMember);
        list.sort((a, b) => a.generation - b.generation || a.fullName.localeCompare(b.fullName));
        setMembers(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'members'),
    );

    const regQuery = isAdmin
      ? query(collection(db, 'registrations'))
      : query(collection(db, 'registrations'), where('applicantUid', '==', user.uid));

    const unsubRegs = onSnapshot(
      regQuery,
      (snap) => {
        setRegistrations(snap.docs.map((d) => d.data() as RegistrationRequest));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'registrations'),
    );

    const relQuery = isAdmin
      ? query(collection(db, 'relationships'))
      : query(collection(db, 'relationships'), where('proposedByUid', '==', user.uid));

    const unsubRels = onSnapshot(
      relQuery,
      (snap) => {
        setRelationships(snap.docs.map((d) => d.data() as RelationshipProposal));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'relationships'),
    );

    const unsubStories = onSnapshot(
      query(collection(db, 'stories'), where('visibility', '==', 'family')),
      (snap) => {
        setStories(snap.docs.map((d) => d.data() as FamilyStory));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'stories'),
    );

    const unsubGallery = onSnapshot(
      query(collection(db, 'gallery'), where('visibility', '==', 'family')),
      (snap) => {
        setGallery(snap.docs.map((d) => d.data() as FamilyPhoto));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'gallery'),
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'events'), where('visibility', '==', 'family')),
      (snap) => {
        setEvents(snap.docs.map((d) => d.data() as FamilyEvent));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events'),
    );

    const escQuery = isAdmin
      ? query(collection(db, 'escalations'))
      : query(collection(db, 'escalations'), where('userUid', '==', user.uid));

    const unsubEsc = onSnapshot(
      escQuery,
      (snap) => {
        setEscalations(snap.docs.map((d) => d.data() as SupportEscalation));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'escalations'),
    );

    // Pending invite listener for the signed-in user's verified email
    let unsubMyInvite = () => {};
    if (user.email && user.emailVerified) {
      const normalizedEmail = user.email.trim().toLowerCase();
      unsubMyInvite = onSnapshot(
        query(collection(db, 'memberInvites'), where('invitedEmail', '==', normalizedEmail)),
        (snap) => {
          const pending = snap.docs
            .map((d) => d.data() as MemberInvite)
            .find((inv) => inv.status === 'pending');
          setMyPendingInvite(pending || null);
        },
        (err) => console.warn('Invite lookup warning:', err),
      );
    }

    // Steward/Admin invite list
    let unsubInvites = () => {};
    if (isAdmin) {
      unsubInvites = onSnapshot(
        collection(db, 'memberInvites'),
        (snap) => {
          setMemberInvites(snap.docs.map((d) => d.data() as MemberInvite));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'memberInvites'),
      );
    } else if (branchAdminAssignment) {
      unsubInvites = onSnapshot(
        query(collection(db, 'memberInvites'), where('createdByUid', '==', user.uid)),
        (snap) => {
          setMemberInvites(snap.docs.map((d) => d.data() as MemberInvite));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'memberInvites'),
      );
    }

    let unsubBranchAdmins = () => {};
    let unsubLogs = () => {};
    if (isAdmin) {
      unsubLogs = onSnapshot(
        collection(db, 'adminLogs'),
        (snap) => {
          setAdminLogs(snap.docs.map((d) => d.data() as AdminActivityLog));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'adminLogs'),
      );
      unsubBranchAdmins = onSnapshot(
        collection(db, 'branchAdmins'),
        (snap) => {
          setBranchAdmins(snap.docs.map((d) => d.data() as BranchAdminAssignment));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'branchAdmins'),
      );
    }

    return () => {
      unsubProfile();
      unsubPrivate();
      unsubBranches();
      unsubMembers();
      unsubRegs();
      unsubRels();
      unsubStories();
      unsubGallery();
      unsubEvents();
      unsubEsc();
      unsubMyInvite();
      unsubInvites();
      unsubLogs();
      unsubBranchAdmins();
    };
  }, [authReady, user, isAdmin, branchAdminAssignment]);

  const syncPublicStatsSnapshot = async (nextMembers: FamilyMember[], nextBranches: FamilyBranch[]) => {
    if (!user || !hasStewardAccess) return;
    const stats = computeFamilyStats(nextMembers, nextBranches, []);
    const headMember =
      nextMembers.find((m) => m.isFamilyHead) ||
      nextMembers.find((m) => m.roleInLineage === 'founder' && m.gender === 'male') ||
      nextMembers.find((m) => m.generation === 0) ||
      nextMembers[0];

    const headBranch = headMember
      ? nextBranches.find((b) => b.id === headMember.branchId)
      : nextBranches[0];

    const payload: PublicStats = {
      id: 'showcase',
      totalMembers: stats.totalMembers,
      totalGenerations: stats.totalGenerations,
      totalBranches: stats.totalBranches,
      familyHeadMemberId: headMember?.id || '',
      familyHeadName: headMember?.fullName || '',
      familyHeadTitle: headMember
        ? headMember.isFamilyHead
          ? `Main Family Head · Gen ${headMember.generation}`
          : `Founding Steward · Gen ${headMember.generation}`
        : '',
      familyHeadBranch: headMember?.branchName || headBranch?.name || '',
      familyHeadOrigin: headBranch?.originLocation || '',
      familyHeadBio: (headMember?.biography || headBranch?.description || '').slice(0, 600),
      familyHeadPhotoUrl: (headMember?.photoUrl || '').slice(0, 250000),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'publicStats', 'showcase'), payload);
    } catch (err) {
      console.warn('Public stats sync skipped:', err);
    }
  };

  // Keep publicStats/showcase automatically synced when steward views workspace
  useEffect(() => {
    if (!authReady || !user || !hasStewardAccess) return;
    if (members.length === 0 && branches.length === 0 && !publicStats) return;
    const stats = computeFamilyStats(members, branches, []);
    const head =
      members.find((m) => m.isFamilyHead) ||
      members.find((m) => m.roleInLineage === 'founder' && m.gender === 'male') ||
      members.find((m) => m.generation === 0) ||
      members[0];

    const needsSync =
      !publicStats ||
      publicStats.totalMembers !== stats.totalMembers ||
      publicStats.totalGenerations !== stats.totalGenerations ||
      publicStats.totalBranches !== stats.totalBranches ||
      publicStats.familyHeadMemberId !== (head?.id || '') ||
      publicStats.familyHeadName !== (head?.fullName || '');

    if (needsSync) {
      void syncPublicStatsSnapshot(members, branches);
    }
  }, [authReady, user, hasStewardAccess, members, branches, publicStats]);

  const claimMemberInvite = async (invite: MemberInvite) => {
    if (!user || !user.emailVerified) {
      throw new Error('Please sign in with a verified email to claim your family member profile.');
    }
    const batch = writeBatch(db);
    batch.update(doc(db, 'memberInvites', invite.memberId), {
      status: 'claimed',
      claimedByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'members', invite.memberId), {
      uid: user.uid,
      updatedAt: serverTimestamp(),
    });
    if (userProfile && !userProfile.linkedMemberId) {
      batch.update(doc(db, 'users', user.uid), {
        linkedMemberId: invite.memberId,
        updatedAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      setMyPendingInvite(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `memberInvites/${invite.memberId}`);
    }
  };

  // Automatically claim pending invite once user profile exists and isn't linked yet
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified || !userProfile || !myPendingInvite) return;
    if (userProfile.linkedMemberId) return;
    if (autoClaimingRef.current === myPendingInvite.memberId) return;
    autoClaimingRef.current = myPendingInvite.memberId;
    claimMemberInvite(myPendingInvite).catch((err) => {
      console.warn('Auto-claim invite deferred:', err);
      autoClaimingRef.current = null;
    });
  }, [authReady, user, userProfile, myPendingInvite]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleAuthProvider);
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (cred.user && !cred.user.emailVerified) {
      await sendEmailVerification(cred.user);
    }
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('No authenticated user found.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshAuthUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    setUser({ ...auth.currentUser } as User);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const writeAdminLog = async (action: string, targetType: string, targetId: string, summary: string) => {
    if (!user || !hasStewardAccess) return;
    const logId = makeSafeId('log');
    try {
      await setDoc(doc(db, 'adminLogs', logId), {
        id: logId,
        adminUid: user.uid,
        adminEmail: (user.email || 'steward').slice(0, 160),
        action: action.slice(0, 100),
        targetType: targetType.slice(0, 60),
        targetId: targetId.slice(0, 128),
        summary: summary.slice(0, 500),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `adminLogs/${logId}`);
    }
  };

  const createMemberInvite: AuthContextValue['createMemberInvite'] = async (member, invitedEmail) => {
    if (!user || !hasStewardAccess) throw new Error('Only the Family Head or Branch Admin can issue login accounts.');
    const cleanEmail = invitedEmail.trim().toLowerCase().slice(0, 160);
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address for the family member.');
    }
    try {
      await setDoc(doc(db, 'memberInvites', member.id), {
        id: member.id,
        memberId: member.id,
        memberName: member.fullName.slice(0, 120),
        branchId: member.branchId,
        invitedEmail: cleanEmail,
        status: 'pending',
        claimedByUid: '',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAdminLog(
        'INVITE_MEMBER_ACCOUNT',
        'member',
        member.id,
        `Provisioned login invite for ${member.fullName} (${cleanEmail})`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `memberInvites/${member.id}`);
    }
  };

  const revokeMemberInvite: AuthContextValue['revokeMemberInvite'] = async (memberId) => {
    if (!user || !hasStewardAccess) throw new Error('Steward access required.');
    try {
      await deleteDoc(doc(db, 'memberInvites', memberId));
      await writeAdminLog('REVOKE_INVITE', 'member', memberId, `Revoked pending login invite for ${memberId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `memberInvites/${memberId}`);
    }
  };

  const designateFamilyHead: AuthContextValue['designateFamilyHead'] = async (memberId) => {
    if (!user || !isAdmin) throw new Error('Only Super Administrators can designate the Main Family Head.');
    const target = members.find((m) => m.id === memberId);
    if (!target) throw new Error('Selected member was not found.');

    const batch = writeBatch(db);
    members.forEach((m) => {
      if (m.id === memberId) {
        batch.update(doc(db, 'members', m.id), {
          isFamilyHead: true,
          updatedAt: serverTimestamp(),
        });
      } else if (m.isFamilyHead) {
        batch.update(doc(db, 'members', m.id), {
          isFamilyHead: false,
          updatedAt: serverTimestamp(),
        });
      }
    });

    try {
      await batch.commit();
      await writeAdminLog(
        'DESIGNATE_FAMILY_HEAD',
        'member',
        memberId,
        `Designated ${target.fullName} as Main Family Head`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const assignBranchAdmin: AuthContextValue['assignBranchAdmin'] = async (input) => {
    if (!user || !isAdmin) throw new Error('Only Super Administrators can assign Branch Administrators.');
    const branch = branches.find((b) => b.id === input.branchId);
    if (!branch) throw new Error('Selected branch does not exist.');
    const cleanUid = input.uid.trim();
    if (!cleanUid) throw new Error('Member User UID is required (the member must have signed in at least once).');

    try {
      await setDoc(doc(db, 'branchAdmins', cleanUid), {
        uid: cleanUid,
        email: input.email.trim().toLowerCase().slice(0, 160),
        branchId: branch.id,
        branchName: branch.name.slice(0, 120),
        grantedByUid: user.uid,
        createdAt: serverTimestamp(),
      });
      await writeAdminLog(
        'ASSIGN_BRANCH_ADMIN',
        'branch',
        branch.id,
        `Assigned ${input.email || cleanUid} as Branch Administrator for "${branch.name}"`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `branchAdmins/${cleanUid}`);
    }
  };

  const revokeBranchAdmin: AuthContextValue['revokeBranchAdmin'] = async (uid) => {
    if (!user || !isAdmin) throw new Error('Only Super Administrators can revoke Branch Administrators.');
    try {
      await deleteDoc(doc(db, 'branchAdmins', uid));
      await writeAdminLog('REVOKE_BRANCH_ADMIN', 'branchAdmin', uid, `Revoked Branch Administrator access for ${uid}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `branchAdmins/${uid}`);
    }
  };

  const submitRegistration: AuthContextValue['submitRegistration'] = async (input) => {
    if (!user) throw new Error('You must be signed in to submit a registration.');
    const regId = makeSafeId('reg');
    try {
      await setDoc(doc(db, 'registrations', regId), {
        id: regId,
        applicantUid: user.uid,
        fullName: input.fullName.trim().slice(0, 120),
        email: input.email.trim().slice(0, 160),
        phone: input.phone.trim().slice(0, 40),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth.slice(0, 32),
        fatherNameText: input.fatherNameText.trim().slice(0, 120),
        motherNameText: input.motherNameText.trim().slice(0, 120),
        requestedFatherId: input.requestedFatherId.slice(0, 128),
        requestedMotherId: input.requestedMotherId.slice(0, 128),
        requestedSpouseId: input.requestedSpouseId.slice(0, 128),
        registrationType: input.registrationType,
        branchId: input.branchId.slice(0, 128),
        newBranchName: input.newBranchName.trim().slice(0, 120),
        photoUrl: input.photoUrl.slice(0, 250000),
        biography: input.biography.trim().slice(0, 2000),
        status: 'pending',
        reviewNote: '',
        duplicateMatchIds: input.duplicateMatchIds.slice(0, 10),
        reviewedByUid: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'users', user.uid, 'private', 'contact'), {
        uid: user.uid,
        email: input.email.trim().slice(0, 160),
        phone: input.phone.trim().slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `registrations/${regId}`);
    }
  };

  const createBranch: AuthContextValue['createBranch'] = async (input) => {
    if (!user || !isAdmin) throw new Error('Only administrators can create family branches.');
    const branchId = makeSafeId('branch');
    try {
      await setDoc(doc(db, 'branches', branchId), {
        id: branchId,
        name: input.name.trim().slice(0, 120),
        description: input.description.trim().slice(0, 600),
        originLocation: input.originLocation.trim().slice(0, 160),
        founderPairLabel: input.founderPairLabel.trim().slice(0, 200),
        visibility: 'family',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await writeAdminLog('CREATE_BRANCH', 'branch', branchId, `Created branch "${input.name}"`);
      return branchId;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `branches/${branchId}`);
    }
  };

  const bootstrapFoundingLineage: AuthContextValue['bootstrapFoundingLineage'] = async (input) => {
    if (!user || !isAdmin) throw new Error('Only administrators can establish the founding generation.');
    const branchId = makeSafeId('branch');
    const gfId = makeSafeId('mem');
    const gmId = makeSafeId('mem');
    const batch = writeBatch(db);

    const hasExistingHead = members.some((m) => m.isFamilyHead);

    batch.set(doc(db, 'branches', branchId), {
      id: branchId,
      name: input.branchName.trim().slice(0, 120),
      description: input.description.trim().slice(0, 600),
      originLocation: input.originLocation.trim().slice(0, 160),
      founderPairLabel: `${input.grandfatherName.trim()} & ${input.grandmotherName.trim()}`.slice(0, 200),
      visibility: 'family',
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'members', gfId), {
      id: gfId,
      uid: '',
      fullName: input.grandfatherName.trim().slice(0, 120),
      gender: 'male',
      dateOfBirth: input.grandfatherDob.slice(0, 32),
      isDeceased: false,
      deathDate: '',
      generation: 0,
      branchId,
      branchName: input.branchName.trim().slice(0, 120),
      fatherId: '',
      motherId: '',
      spouseId: gmId,
      fatherNameText: '',
      motherNameText: '',
      roleInLineage: 'founder',
      isFamilyHead: !hasExistingHead,
      biography: input.grandfatherBio.trim().slice(0, 2000),
      photoUrl: (input.grandfatherPhotoUrl || '').slice(0, 250000),
      visibility: 'family',
      isVerified: true,
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(doc(db, 'members', gmId), {
      id: gmId,
      uid: '',
      fullName: input.grandmotherName.trim().slice(0, 120),
      gender: 'female',
      dateOfBirth: input.grandmotherDob.slice(0, 32),
      isDeceased: false,
      deathDate: '',
      generation: 0,
      branchId,
      branchName: input.branchName.trim().slice(0, 120),
      fatherId: '',
      motherId: '',
      spouseId: gfId,
      fatherNameText: '',
      motherNameText: '',
      roleInLineage: 'founder',
      isFamilyHead: false,
      biography: input.grandmotherBio.trim().slice(0, 2000),
      photoUrl: (input.grandmotherPhotoUrl || '').slice(0, 250000),
      visibility: 'family',
      isVerified: true,
      createdByUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (input.grandfatherEmail?.trim()) {
      batch.set(doc(db, 'memberInvites', gfId), {
        id: gfId,
        memberId: gfId,
        memberName: input.grandfatherName.trim().slice(0, 120),
        branchId,
        invitedEmail: input.grandfatherEmail.trim().toLowerCase().slice(0, 160),
        status: 'pending',
        claimedByUid: '',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
      await writeAdminLog(
        'BOOTSTRAP_FOUNDERS',
        'branch',
        branchId,
        `Established founding grandparents ${input.grandfatherName} & ${input.grandmotherName} in "${input.branchName}"`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'members/founders');
    }
  };

  const approveRegistration: AuthContextValue['approveRegistration'] = async (reg, overrides) => {
    if (!user || !isAdmin) throw new Error('Only administrators can approve registrations.');

    let resolvedBranchId = overrides.branchId;
    let resolvedBranchName =
      branches.find((b) => b.id === overrides.branchId)?.name || overrides.newBranchName || 'Founding Lineage';

    if (reg.registrationType === 'new_branch' && !resolvedBranchId) {
      resolvedBranchId = makeSafeId('branch');
      resolvedBranchName = (overrides.newBranchName || reg.newBranchName || `${reg.fullName} Branch`).slice(0, 120);
      await setDoc(doc(db, 'branches', resolvedBranchId), {
        id: resolvedBranchId,
        name: resolvedBranchName,
        description: `Branch established through verified registration of ${reg.fullName}.`.slice(0, 600),
        originLocation: '',
        founderPairLabel: reg.fullName.slice(0, 200),
        visibility: 'family',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const memberId = makeSafeId('mem');
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'members', memberId), {
        id: memberId,
        uid: reg.applicantUid,
        fullName: reg.fullName.slice(0, 120),
        gender: reg.gender,
        dateOfBirth: reg.dateOfBirth.slice(0, 32),
        isDeceased: false,
        deathDate: '',
        generation: Math.max(0, Math.min(50, Math.floor(overrides.generation))),
        branchId: resolvedBranchId,
        branchName: resolvedBranchName.slice(0, 120),
        fatherId: overrides.fatherId,
        motherId: overrides.motherId,
        spouseId: overrides.spouseId,
        fatherNameText: reg.fatherNameText.slice(0, 120),
        motherNameText: reg.motherNameText.slice(0, 120),
        roleInLineage: overrides.roleInLineage,
        isFamilyHead: false,
        biography: reg.biography.slice(0, 2000),
        photoUrl: reg.photoUrl.slice(0, 250000),
        visibility: 'family',
        isVerified: true,
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (overrides.spouseId) {
        batch.update(doc(db, 'members', overrides.spouseId), {
          spouseId: memberId,
          updatedAt: serverTimestamp(),
        });
      }

      batch.update(doc(db, 'registrations', reg.id), {
        status: 'approved',
        branchId: resolvedBranchId,
        reviewNote: overrides.reviewNote.slice(0, 600),
        reviewedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });

      const userSnap = await getDoc(doc(db, 'users', reg.applicantUid));
      if (userSnap.exists()) {
        batch.update(doc(db, 'users', reg.applicantUid), {
          linkedMemberId: memberId,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await writeAdminLog(
        'APPROVE_REGISTRATION',
        'registration',
        reg.id,
        `Approved ${reg.fullName} (Gen ${overrides.generation}) into "${resolvedBranchName}"`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `registrations/${reg.id}`);
    }
  };

  const rejectRegistration: AuthContextValue['rejectRegistration'] = async (reg, reviewNote) => {
    if (!user || !isAdmin) throw new Error('Only administrators can reject registrations.');
    try {
      await updateDoc(doc(db, 'registrations', reg.id), {
        status: 'rejected',
        reviewNote: reviewNote.trim().slice(0, 600),
        reviewedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
      await writeAdminLog(
        'REJECT_REGISTRATION',
        'registration',
        reg.id,
        `Rejected ${reg.fullName}: ${reviewNote.slice(0, 200)}`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `registrations/${reg.id}`);
    }
  };

  const addMemberDirect: AuthContextValue['addMemberDirect'] = async (input) => {
    if (!user || !hasStewardAccess) {
      throw new Error('Only the Family Head or authorized Branch Administrators can add family members.');
    }
    if (!isAdmin && branchAdminAssignment && branchAdminAssignment.branchId !== input.branchId) {
      throw new Error(`You can only add members to your assigned branch (${branchAdminAssignment.branchName}).`);
    }
    const memberId = makeSafeId('mem');
    const branchName = branches.find((b) => b.id === input.branchId)?.name || 'Founding Lineage';
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'members', memberId), {
        id: memberId,
        uid: input.uid || '',
        fullName: input.fullName.trim().slice(0, 120),
        gender: input.gender,
        dateOfBirth: input.dateOfBirth.slice(0, 32),
        isDeceased: input.isDeceased,
        deathDate: input.deathDate.slice(0, 32),
        generation: Math.max(0, Math.min(50, Math.floor(input.generation))),
        branchId: input.branchId,
        branchName: branchName.slice(0, 120),
        fatherId: input.fatherId,
        motherId: input.motherId,
        spouseId: input.spouseId,
        fatherNameText: input.fatherNameText.trim().slice(0, 120),
        motherNameText: input.motherNameText.trim().slice(0, 120),
        roleInLineage: input.roleInLineage,
        isFamilyHead: Boolean(isAdmin && input.isFamilyHead),
        biography: input.biography.trim().slice(0, 2000),
        photoUrl: input.photoUrl.slice(0, 250000),
        visibility: 'family',
        isVerified: true,
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (input.spouseId) {
        batch.update(doc(db, 'members', input.spouseId), {
          spouseId: memberId,
          updatedAt: serverTimestamp(),
        });
      }

      if (input.invitedEmail?.trim()) {
        batch.set(doc(db, 'memberInvites', memberId), {
          id: memberId,
          memberId,
          memberName: input.fullName.trim().slice(0, 120),
          branchId: input.branchId,
          invitedEmail: input.invitedEmail.trim().toLowerCase().slice(0, 160),
          status: 'pending',
          claimedByUid: '',
          createdByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await writeAdminLog(
        'ADD_MEMBER',
        'member',
        memberId,
        `Added verified member "${input.fullName}" (Gen ${input.generation})${
          input.invitedEmail?.trim() ? ` with login invite (${input.invitedEmail.trim().toLowerCase()})` : ''
        }`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `members/${memberId}`);
    }
  };

  const updateOwnMemberProfile: AuthContextValue['updateOwnMemberProfile'] = async (memberId, updates) => {
    if (!user) throw new Error('Sign in required.');
    try {
      await updateDoc(doc(db, 'members', memberId), {
        fullName: updates.fullName.trim().slice(0, 120),
        dateOfBirth: updates.dateOfBirth.slice(0, 32),
        biography: updates.biography.trim().slice(0, 2000),
        photoUrl: updates.photoUrl.slice(0, 250000),
        fatherNameText: updates.fatherNameText.trim().slice(0, 120),
        motherNameText: updates.motherNameText.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const adminUpdateMember: AuthContextValue['adminUpdateMember'] = async (memberId, updates) => {
    if (!user || !hasStewardAccess) throw new Error('Administrator privileges required.');
    const target = members.find((m) => m.id === memberId);
    if (!isAdmin && branchAdminAssignment && target && target.branchId !== branchAdminAssignment.branchId) {
      throw new Error('You may only update members belonging to your assigned branch.');
    }
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'members', memberId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      if (updates.spouseId && target && updates.spouseId !== target.spouseId) {
        if (target.spouseId && target.spouseId !== updates.spouseId) {
          batch.update(doc(db, 'members', target.spouseId), {
            spouseId: '',
            updatedAt: serverTimestamp(),
          });
        }
        batch.update(doc(db, 'members', updates.spouseId), {
          spouseId: memberId,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      await writeAdminLog(
        'UPDATE_MEMBER',
        'member',
        memberId,
        `Updated profile & verified relationships for ${target?.fullName || memberId}`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `members/${memberId}`);
    }
  };

  const deleteMember: AuthContextValue['deleteMember'] = async (memberId) => {
    if (!user || !hasStewardAccess) throw new Error('Administrator privileges required.');
    const target = members.find((m) => m.id === memberId);
    if (!target) throw new Error('Member not found.');
    if (!isAdmin && branchAdminAssignment && target.branchId !== branchAdminAssignment.branchId) {
      throw new Error('You may only remove members belonging to your assigned branch.');
    }

    const batch = writeBatch(db);
    // Clear reciprocal links so no broken edges remain in the tree
    members.forEach((m) => {
      if (m.id === memberId) return;
      const patch: Record<string, unknown> = {};
      if (m.spouseId === memberId) patch.spouseId = '';
      if (m.fatherId === memberId) patch.fatherId = '';
      if (m.motherId === memberId) patch.motherId = '';
      if (Object.keys(patch).length > 0) {
        patch.updatedAt = serverTimestamp();
        batch.update(doc(db, 'members', m.id), patch);
      }
    });

    if (memberInvites.some((inv) => inv.memberId === memberId)) {
      batch.delete(doc(db, 'memberInvites', memberId));
    }
    batch.delete(doc(db, 'members', memberId));

    try {
      await batch.commit();
      await writeAdminLog('DELETE_MEMBER', 'member', memberId, `Removed member "${target.fullName}" from the family tree`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `members/${memberId}`);
    }
  };

  const proposeRelationship: AuthContextValue['proposeRelationship'] = async (input) => {
    if (!user) throw new Error('Sign in required.');
    const relId = makeSafeId('rel');
    try {
      await setDoc(doc(db, 'relationships', relId), {
        id: relId,
        fromMemberId: input.fromMemberId,
        toMemberId: input.toMemberId,
        relationType: input.relationType,
        notes: input.notes.trim().slice(0, 400),
        proposedByUid: user.uid,
        status: 'pending',
        verifiedByUid: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `relationships/${relId}`);
    }
  };

  const verifyRelationshipProposal: AuthContextValue['verifyRelationshipProposal'] = async (proposal, approve) => {
    if (!user || !isAdmin) throw new Error('Admin privileges required.');
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'relationships', proposal.id), {
        status: approve ? 'verified' : 'rejected',
        verifiedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });

      if (approve) {
        if (proposal.relationType === 'father') {
          batch.update(doc(db, 'members', proposal.fromMemberId), {
            fatherId: proposal.toMemberId,
            updatedAt: serverTimestamp(),
          });
        } else if (proposal.relationType === 'mother') {
          batch.update(doc(db, 'members', proposal.fromMemberId), {
            motherId: proposal.toMemberId,
            updatedAt: serverTimestamp(),
          });
        } else if (proposal.relationType === 'spouse') {
          batch.update(doc(db, 'members', proposal.fromMemberId), {
            spouseId: proposal.toMemberId,
            updatedAt: serverTimestamp(),
          });
          batch.update(doc(db, 'members', proposal.toMemberId), {
            spouseId: proposal.fromMemberId,
            updatedAt: serverTimestamp(),
          });
        }
      }
      await batch.commit();
      await writeAdminLog(
        approve ? 'VERIFY_RELATIONSHIP' : 'REJECT_RELATIONSHIP',
        'relationship',
        proposal.id,
        `${approve ? 'Verified' : 'Rejected'} ${proposal.relationType} link between ${proposal.fromMemberId} and ${proposal.toMemberId}`,
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `relationships/${proposal.id}`);
    }
  };

  const addStory: AuthContextValue['addStory'] = async (input) => {
    if (!user) throw new Error('Sign in required.');
    const storyId = makeSafeId('story');
    try {
      await setDoc(doc(db, 'stories', storyId), {
        id: storyId,
        title: input.title.trim().slice(0, 160),
        eraYear: input.eraYear.trim().slice(0, 32),
        branchId: input.branchId,
        content: input.content.trim().slice(0, 4000),
        coverImageUrl: input.coverImageUrl.slice(0, 250000),
        visibility: 'family',
        authorUid: user.uid,
        authorName: (userProfile?.displayName || user.displayName || 'Family Member').slice(0, 120),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
    }
  };

  const addPhoto: AuthContextValue['addPhoto'] = async (input) => {
    if (!user) throw new Error('Sign in required.');
    const photoId = makeSafeId('photo');
    try {
      await setDoc(doc(db, 'gallery', photoId), {
        id: photoId,
        title: input.title.trim().slice(0, 140),
        caption: input.caption.trim().slice(0, 500),
        yearTaken: input.yearTaken.trim().slice(0, 16),
        branchId: input.branchId,
        imageUrl: input.imageUrl.slice(0, 350000),
        visibility: 'family',
        uploadedByUid: user.uid,
        uploadedByName: (userProfile?.displayName || user.displayName || 'Family Member').slice(0, 120),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `gallery/${photoId}`);
    }
  };

  const addEvent: AuthContextValue['addEvent'] = async (input) => {
    if (!user) throw new Error('Sign in required.');
    const eventId = makeSafeId('event');
    try {
      await setDoc(doc(db, 'events', eventId), {
        id: eventId,
        title: input.title.trim().slice(0, 160),
        eventType: input.eventType,
        eventDate: input.eventDate.slice(0, 32),
        location: input.location.trim().slice(0, 160),
        description: input.description.trim().slice(0, 1000),
        branchId: input.branchId,
        visibility: 'family',
        authorUid: user.uid,
        authorName: (userProfile?.displayName || user.displayName || 'Family Member').slice(0, 120),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `events/${eventId}`);
    }
  };

  const deleteArchiveItem: AuthContextValue['deleteArchiveItem'] = async (collectionName, id) => {
    if (!user) throw new Error('Sign in required.');
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
  };

  const submitEscalation: AuthContextValue['submitEscalation'] = async (input) => {
    if (!user) throw new Error('Sign in required.');
    const escId = makeSafeId('esc');
    try {
      await setDoc(doc(db, 'escalations', escId), {
        id: escId,
        userUid: user.uid,
        userName: (userProfile?.displayName || user.displayName || user.email || 'Family Member').slice(0, 120),
        topic: input.topic.trim().slice(0, 160),
        conversationSummary: input.conversationSummary.trim().slice(0, 2000),
        status: 'open',
        adminResponse: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `escalations/${escId}`);
    }
  };

  const resolveEscalation: AuthContextValue['resolveEscalation'] = async (escalation, adminResponse) => {
    if (!user || !isAdmin) throw new Error('Admin privileges required.');
    try {
      await updateDoc(doc(db, 'escalations', escalation.id), {
        status: 'resolved',
        adminResponse: adminResponse.trim().slice(0, 1000),
        updatedAt: serverTimestamp(),
      });
      await writeAdminLog('RESOLVE_ESCALATION', 'escalation', escalation.id, `Resolved escalation "${escalation.topic}"`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `escalations/${escalation.id}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        userProfile,
        privateContact,
        isAdmin,
        branchAdminAssignment,
        hasStewardAccess,
        branchAdmins,
        theme,
        toggleTheme,
        language,
        setLanguage,
        publicStats,
        branches,
        members,
        memberInvites,
        myPendingInvite,
        registrations,
        relationships,
        stories,
        gallery,
        events,
        adminLogs,
        escalations,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resendVerificationEmail,
        refreshAuthUser,
        signOut,
        claimMemberInvite,
        createMemberInvite,
        revokeMemberInvite,
        designateFamilyHead,
        assignBranchAdmin,
        revokeBranchAdmin,
        submitRegistration,
        approveRegistration,
        rejectRegistration,
        bootstrapFoundingLineage,
        createBranch,
        addMemberDirect,
        updateOwnMemberProfile,
        adminUpdateMember,
        deleteMember,
        proposeRelationship,
        verifyRelationshipProposal,
        addStory,
        addPhoto,
        addEvent,
        deleteArchiveItem,
        submitEscalation,
        resolveEscalation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
