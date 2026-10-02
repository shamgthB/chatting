# Security Specification: PulseChat Firestore Rules

## 1. Data Invariants
1. A user can only create or update their own profile document (`users/{userId}` where `request.auth.uid == userId`).
2. A username reservation (`usernames/{username}`) can only be claimed if not already taken, and can only be set or deleted by the owning user (`request.auth.uid == incoming().uid`).
3. A conversation (`conversations/{conversationId}`) can only be read, created, or updated by users who are listed in `participants`.
4. A message in `conversations/{conversationId}/messages/{messageId}` can only be read by participants of that conversation, can only be created by an authenticated participant whose `senderId == request.auth.uid`, and can only be edited or soft-deleted by its original sender.
5. All IDs must be sanitized with regex `^[a-zA-Z0-9_\-]+$`.
6. Timestamps and size boundaries must be strictly constrained to prevent injection and Denial-of-Wallet attacks.

## 2. Dirty Dozen Payloads (Designed to Fail)
1. **User Profile Impersonation**: Attacker tries to write to `/users/{victimUid}` with attacker's auth token -> `PERMISSION_DENIED`.
2. **Ghost Fields Injection**: User attempts to update profile with ghost admin field `isAdmin: true` -> `PERMISSION_DENIED`.
3. **Huge String Injection**: Attacker sends a 5MB string for `displayName` or `text` -> `PERMISSION_DENIED`.
4. **Username Squatting Without Claim**: User attempts to claim `/usernames/{target}` with mismatched `uid` -> `PERMISSION_DENIED`.
5. **Unauthorized Conversation Snoop**: User A attempts to read `/conversations/{convId}` where User A is not in `participants` -> `PERMISSION_DENIED`.
6. **Eavesdropping on Messages**: User A queries messages of a conversation they do not participate in -> `PERMISSION_DENIED`.
7. **Message Spoofing**: User A sends a message setting `senderId: victimUid` -> `PERMISSION_DENIED`.
8. **Malicious Message Delete**: User B attempts to delete User A's message -> `PERMISSION_DENIED`.
9. **Unbounded Array Injection**: Attacker injects a 10,000-element array into `participants` -> `PERMISSION_DENIED`.
10. **Unauthenticated Read**: Anonymous/unauthenticated user tries to read `/users` or `/conversations` -> `PERMISSION_DENIED`.
11. **ID Poisoning Attack**: Attacker uses path `/users/%00evil_path` -> `PERMISSION_DENIED`.
12. **Foreign Message Update**: Attacker attempts to change another user's message body -> `PERMISSION_DENIED`.
