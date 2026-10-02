export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  photoURL?: string;
  phoneNumber?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt?: string;
}

export type MessageType = 'text' | 'image' | 'file' | 'audio';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

export interface MessageReplyInfo {
  id: string;
  text: string;
  senderName: string;
  type?: MessageType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  senderName?: string;
  senderPhotoURL?: string;
  text?: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: MessageReplyInfo | null;
  status: MessageStatus;
  readBy: string[]; // List of UIDs who read it
  isDeleted?: boolean;
  createdAt: any; // Firestore Timestamp, string or number
  createdAtMs?: number;
  updatedAt?: any;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // UIDs [uid1, uid2]
  participantDetails: Record<string, {
    displayName: string;
    username: string;
    photoURL?: string;
  }>;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageTime?: any;
  lastMessageType?: MessageType;
  unreadCount?: Record<string, number>;
  createdAt: any;
  updatedAt: any;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  soundEnabled: boolean;
  browserNotifications: boolean;
  readReceipts: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
}
