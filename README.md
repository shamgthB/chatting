# PulseChat - Real-Time Messaging Web App

PulseChat is a modern, responsive real-time messaging application built with React 19, TypeScript, Tailwind CSS, and Firebase (Authentication, Firestore, and Storage).

## 🚀 Key Features

* **Authentication**:
  * One-click Google Sign-In (`signInWithPopup`).
  * Email OTP verification (6-digit code verification system).
  * Persistent sessions across device reboots and browser refreshes.
  * Verified email enforcement before profile creation.
* **First-Time Profile Setup**:
  * Unique `@username` validation with live availability check.
  * Custom profile photo upload (with automatic client-side canvas compression) or preset avatar picker.
  * Display name, phone number, and customizable bio.
* **Real-Time Messaging**:
  * One-to-one private chats with sub-millisecond updates via Firestore snapshots.
  * Text messages with multi-line support (`Shift+Enter` for newline, `Enter` to send).
  * Photo/image attachments with a full-screen lightbox modal.
  * File attachments (PDF, documents) with size display and download button.
  * Voice notes: live microphone recording with timer, waveform visualization, and audio player.
  * Quoted replies to previous messages.
  * Message delivery receipts (Sent: single check, Delivered: double check, Read: blue double check).
  * Soft-deletion of messages ("This message was deleted") and one-click copy.
* **User Search & Discovery**:
  * Live search by `@username`, full display name, or email.
  * Profile preview card with online status dot and bio.
  * Direct 1:1 conversation initiation without duplicates.
* **Presence & Notifications**:
  * Real-time online/offline presence tracking with visibility and unload handlers.
  * "Active now" or formatted "Last seen" counters.
  * Web Audio API synthesized notification chimes (incoming message chime, outgoing message pop).
  * Desktop/browser notification integration with explicit user permission request.
* **Customization & Settings**:
  * Profile editor (display name, username with uniqueness checks, photo, phone, bio).
  * Theme switcher: Light mode, Dark mode, and System default (persisted locally).
  * Privacy controls: toggle read receipts and online visibility.
* **Responsive Architecture**:
  * Desktop: Split-screen sidebar and full chat view.
  * Mobile: Fluid list-first view with full-screen conversation view and back button navigation.

---

## 📁 Project Structure

```text
/
├── firebase-applet-config.json    # Auto-configured Firebase credentials
├── firebase-blueprint.json        # Intermediate Representation (IR) schema
├── firestore.rules                # Hardened Firestore ABAC security rules
├── security_spec.md               # Security test specification
├── package.json                   # Dependencies and scripts
├── vite.config.ts                 # Vite bundler configuration
├── src/
│   ├── firebase/
│   │   ├── config.ts              # Firebase app, auth, db & storage initialization
│   │   └── errors.ts              # Structured Firestore error handler
│   ├── types/
│   │   └── index.ts               # Core TypeScript models (UserProfile, Conversation, Message)
│   ├── utils/
│   │   ├── audio.ts               # Web Audio API chime sounds & MediaRecorder voice recorder
│   │   └── file.ts                # Image compression, data URL conversion, avatars
│   ├── context/
│   │   ├── AuthContext.tsx        # Firebase auth, presence heartbeat, username reservation
│   │   ├── ChatContext.tsx        # Real-time conversations & messages subscriptions
│   │   └── ThemeContext.tsx       # Light/Dark/System theme engine
│   ├── components/
│   │   ├── common/
│   │   │   ├── Avatar.tsx         # Responsive avatar with initials & presence indicator
│   │   │   ├── Toast.tsx          # Non-blocking notification toasts
│   │   │   └── EmojiPicker.tsx    # Categorized clean emoji picker drawer
│   │   ├── auth/
│   │   │   ├── AuthScreen.tsx     # Google sign-in & email OTP verification
│   │   │   └── ProfileSetupScreen.tsx # First-time profile & unique @handle creator
│   │   ├── chat/
│   │   │   ├── Sidebar.tsx        # Conversation list, search, presence & quick actions
│   │   │   ├── ChatArea.tsx       # Message list, voice recorder, file attachments, replies
│   │   │   └── UserSearchModal.tsx # Live registered user search
│   │   ├── profile/
│   │   │   └── UserProfileModal.tsx # Full contact profile card
│   │   └── settings/
│   │       └── SettingsModal.tsx  # Profile editor, theme, sounds, notifications
│   ├── App.tsx                    # Root coordinator and responsive layouts
│   ├── main.tsx                   # React 19 entrypoint
│   └── index.css                  # Tailwind CSS import & custom scrollbar
```

---

## 🗄️ Firestore Database Structure

### 1. `users/{userId}`
Contains the user's public profile and live presence:
* `uid`: string (matches `request.auth.uid`)
* `email`: string
* `displayName`: string (1-50 chars)
* `username`: string (3-30 chars, alphanumeric + underscores)
* `photoURL`: string (URL or base64 compressed data)
* `phoneNumber`: string
* `bio`: string
* `isOnline`: boolean
* `lastSeen`: ISO string timestamp
* `createdAt`: ISO string timestamp
* `updatedAt`: ISO string timestamp

### 2. `usernames/{username}`
Ensures atomic username uniqueness across the entire system:
* Document ID: lowercase username (e.g. `shivam123`)
* `uid`: string of the owner
* `username`: string
* `createdAt`: ISO string timestamp

### 3. `conversations/{conversationId}`
Stores metadata for 1:1 and group conversations:
* `participants`: `[uid1, uid2]`
* `participantDetails`: map of `uid -> { displayName, username, photoURL }`
* `lastMessageText`: string
* `lastMessageSenderId`: string
* `lastMessageTime`: ISO string timestamp
* `lastMessageType`: `'text' | 'image' | 'file' | 'audio'`
* `unreadCount`: map of `uid -> count`
* `createdAt`: ISO string
* `updatedAt`: ISO string

### 4. `conversations/{conversationId}/messages/{messageId}`
Subcollection containing real-time messages:
* `id`: string (unique document ID)
* `conversationId`: string (`sort([userAUid, userBUid]).join('_')`)
* `senderId`: string (Firebase Auth UID of author)
* `receiverId`: string (Firebase Auth UID of recipient)
* `senderName`: string
* `senderPhotoURL`: string
* `text`: string
* `type`: `'text' | 'image' | 'file' | 'audio'`
* `mediaUrl`: string (remote Firebase Storage URL or data URL)
* `fileName`: string
* `fileSize`: number
* `replyTo`: `{ id, text, senderName, type }`
* `status`: `'sending' | 'sent' | 'delivered' | 'read'`
* `readBy`: array of `uid`s who have opened the message
* `isDeleted`: boolean
* `createdAt`: Firestore `serverTimestamp()`
* `updatedAt`: Firestore `serverTimestamp()`

---

## 🛡️ Security Rules

### Firestore Security Rules (`firestore.rules`)
1. **User Profile Protection**: Users can only create or update their own profile document (`request.auth.uid == userId`).
2. **Username Squatting Prevention**: Only the owning UID can claim or release a username reservation.
3. **Conversation Isolation**: Only users included in `conversation.participants` can read conversations or update them.
4. **Message Integrity**:
   * `senderId` is strictly validated: `request.resource.data.senderId == request.auth.uid`. A user cannot forge messages from someone else.
   * `read` allowed if user is the sender, receiver, or a conversation participant.
   * Updates allowed only for the author, or for the recipient updating `status` and `readBy` (read receipts).
   * Deletion allowed only for the original sender.

### Firebase Storage Rules (`storage.rules`)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /conversations/{conversationId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🛠️ Local Development & Running

### 1. Installation
```bash
npm install
```

### 2. Firebase Configuration
The app automatically reads its configuration from `firebase-applet-config.json` in the root folder, or alternatively from environment variables in `.env`:
```env
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="gen-lang-client-0895277867.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="gen-lang-client-0895277867"
VITE_FIREBASE_STORAGE_BUCKET="gen-lang-client-0895277867.firebasestorage.app"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="ai-studio-0dab7434-2fc3-4ea9-ae7c-1de09f601c9e"
```

### 3. Run Dev Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
```
Outputs static assets ready for deployment into the `dist/` directory.
