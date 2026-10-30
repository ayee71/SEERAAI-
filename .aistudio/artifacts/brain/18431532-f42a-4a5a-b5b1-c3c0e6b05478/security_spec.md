# Security Specification for SEERAAI

## 1. Data Invariants
- **Users**: A user can only read/write their own profile (`/users/{userId}`).
- **Legal Content**: Public reads are allowed for repositories. Admin write access required.
- **User Content**: Objections/Sessions/Dossiers are strictly scoped to the `userId` in the document.
- **Payments**: Transactions must be created in 'pending' status by the user, and updated only by admins.
- **Shared Drafts**: Must not be public-accessible without a secure token-based check (Pillar 8).
- **Admin**: Admins have full access to logs and system configs.

## 2. The "Dirty Dozen" Payloads (Threat Model)
1. **Unauthorized User Access**: User A attempts to read User B's profile (`/users/userB`).
2. **Unauthorized User Modification**: User A attempts to update User B's profile (`/users/userB`).
3. **Ghost Field Injection**: User A creates a profile with `isAdmin: true`.
4. **ID Poisoning**: User A creates a document with a malicious ID (e.g., `../../../../...`).
5. **PII Leak**: Non-admin attempts to read `audit_logs` or `admin_activity_logs`.
6. **Payment Manipulation**: User attempts to update a transaction status from 'pending' to 'completed'.
7. **Resource Poisoning**: User attempts to inject a 2MB string into a `visitorName` field.
8. **Auth Spoofing**: Attempt to update a record while `request.auth` is null.
9. **Email Spoofing**: Payload claims to be an admin email but `email_verified` is `false`.
10. **Terminal State Lockdown**: User attempts to update a session document that is already marked as 'completed'.
11. **System Field Override**: User attempts to modify `system_generated_tips` on their legal query document.
12. **Broad List Query**: Client queries `/discussions` without filtering by `userId`.

## 3. Test Runner
We will implement `firestore.rules.test.ts` using the Firebase Rules Unit Testing library to verify these 12 cases.
