# Security Specification — FamilyRoots AI (OurLegacy)

## 1. Data Invariants
1. **No Self-Assigned Admin Roles**: Regular users cannot assign `role: 'admin'` on `/users/{uid}` or create `/admins/{uid}` or `/branchAdmins/{uid}` documents. Super-admin access is restricted to `arsalmajeed287@gmail.com` (verified email) or documents explicitly created in `/admins/{uid}` by an existing super-admin.
2. **Branch Administrator RBAC**: Branch administrators in `/branchAdmins/{uid}` are strictly scoped to their assigned `branchId`. They may manage `/members/{memberId}` and `/memberInvites/{memberId}` strictly within their assigned `branchId`, and cannot elevate themselves to super-admin or designate `isFamilyHead`.
3. **PII Isolation**: Emails and phone numbers are never stored in `/members/{memberId}`, `/users/{uid}`, or `/publicStats/showcase`. Contact PII resides strictly in `/users/{uid}/private/contact` and `/registrations/{registrationId}` (owner or super-admin only), and pending invitation emails reside strictly in `/memberInvites/{memberId}` (admin, branch-creator, or exact verified email recipient only).
4. **Registration Approval Integrity**: Applicants can only create registrations with `status == 'pending'`. Only a super-administrator can transition `status` to `'approved'` or `'rejected'`. Once approved or rejected, non-admins cannot mutate the registration.
5. **Relationship Integrity & Atomic Invite Claiming**: Ordinary members cannot create or modify verified relationship links (`fatherId`, `motherId`, `spouseId`, `generation`, `isVerified`, `isFamilyHead`) on `/members/{memberId}`. Linked members can only edit permitted personal fields (`fullName`, `dateOfBirth`, `biography`, `photoUrl`, `fatherNameText`, `motherNameText`, `updatedAt`). An unlinked member record with a pending `/memberInvites/{memberId}` can only be claimed atomically when `request.auth.token.email.lower() == invitedEmail` and `email_verified == true`.
6. **Public Showcase Isolation**: `/publicStats/showcase` supports single-document `get` only (`list` disabled), stores zero PII, and can only be updated by verified administrators.
7. **Immutable Audit Trail**: `/adminLogs/{logId}` records are append-only by admins and can never be updated or deleted.
8. **Temporal Integrity & Payload Bounds**: All `createdAt` and `updatedAt` timestamps must match `request.time`, `createdAt` is immutable on update, every document ID matches `^[a-zA-Z0-9_-]+$` (`<= 128` chars), and every string/list field enforces explicit size bounds.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Self-Admin Escalation**: `POST /users/{uid}` with `role: "admin"` by non-admin user.
2. **Admin / Branch Admin Marker Injection**: `POST /admins/{uid}` or `POST /branchAdmins/{uid}` by non-admin user.
3. **PII Snooping (`get`)**: `GET /users/{otherUid}/private/contact` by non-owner non-admin.
4. **Registration Snooping (`list`)**: `LIST /registrations` without `applicantUid == request.auth.uid` filter by non-admin.
5. **Registration Self-Approval**: `CREATE /registrations/{id}` with `status: "approved"` by applicant.
6. **Registration Shadow Update**: `UPDATE /registrations/{id}` by applicant modifying `status: "approved"` or adding `isVerified: true`.
7. **Post-Terminal Mutation**: `UPDATE /registrations/{id}` by applicant after `status == "rejected"`.
8. **Member Relationship Hijack**: `UPDATE /members/{id}` by linked member changing `fatherId`, `isVerified`, `isFamilyHead`, or `generation`.
9. **Cross-Branch Admin Write**: `UPDATE /members/{id}` by a Branch Admin targeting a member whose `branchId` differs from their assigned branch.
10. **Invite Claim Spoofing**: `UPDATE /members/{id}` attempting to set `uid` without matching verified `invitedEmail` and atomic `memberInvites/{id}` claim.
11. **Public Stats List Scraping**: `LIST /publicStats` or unauthenticated `WRITE /publicStats/showcase`.
12. **Audit Log Tampering & ID Poisoning**: `UPDATE`/`DELETE` on `/adminLogs/{id}`, backdated `createdAt`, or invalid path IDs (`../admin`).
