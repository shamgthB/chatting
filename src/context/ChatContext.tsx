import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  getDocs,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Conversation, Message, MessageReplyInfo, MessageType, UserProfile } from '../types';
import { useAuth } from './AuthContext';
import { playMessageSound, playSentSound } from '../utils/audio';
import { getConversationId, parseTimestampMs } from '../utils/file';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  activeFriend: UserProfile | null;
  messages: Message[];
  loadingConversations: boolean;
  loadingMessages: boolean;
  isSending: boolean;
  totalUnreadCount: number;
  replyingTo: MessageReplyInfo | null;
  setActiveConversationId: (id: string | null) => void;
  setReplyingTo: (reply: MessageReplyInfo | null) => void;
  sendMessage: (payload: {
    text?: string;
    type?: MessageType;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startConversationWithUser: (targetUser: UserProfile) => Promise<Conversation>;
  searchUsers: (searchTerm: string) => Promise<UserProfile[]>;
  markConversationAsRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, settings } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationIdState] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeFriend, setActiveFriend] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageReplyInfo | null>(null);

  const prevMessagesLengthRef = useRef(0);
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  // Helper to switch active conversation ID
  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    if (!id) {
      setActiveConversation(null);
      setActiveFriend(null);
      setMessages([]);
    }
  }, []);

  // 1. Real-time conversations list subscription
  useEffect(() => {
    if (!user || !profile) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    setLoadingConversations(true);
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          convList.push({
            id: docSnap.id,
            ...data,
          } as Conversation);
        });

        // Sort descending by most recent activity
        convList.sort((a, b) => {
          const timeA = parseTimestampMs(a.updatedAt || a.lastMessageTime || a.createdAt);
          const timeB = parseTimestampMs(b.updatedAt || b.lastMessageTime || b.createdAt);
          return timeB - timeA;
        });

        setConversations(convList);
        setLoadingConversations(false);
      },
      (error) => {
        console.error('Error listening to conversations:', error);
        setLoadingConversations(false);
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    );

    return () => unsubscribe();
  }, [user?.uid, profile?.username]);

  // 2. Sync activeConversation object and activeFriend whenever conversations change
  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    const currentConv = conversations.find((c) => c.id === activeConversationId);
    if (currentConv) {
      setActiveConversation(currentConv);

      // Identify friend in 1-to-1 chat
      const friendUid = currentConv.participants.find((p) => p !== user?.uid);
      if (friendUid) {
        // Fetch or update friend profile
        const friendRef = doc(db, 'users', friendUid);
        getDoc(friendRef)
          .then((snap) => {
            if (snap.exists()) {
              setActiveFriend(snap.data() as UserProfile);
            }
          })
          .catch((err) => {
            console.error('Error fetching friend profile:', err);
          });
      }
    }
  }, [activeConversationId, conversations, user?.uid]);

  // 3. Mark conversation as read & update unread messages status
  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!user) return;
      try {
        const convRef = doc(db, 'conversations', conversationId);
        await updateDoc(convRef, {
          [`unreadCount.${user.uid}`]: 0,
        });
      } catch (err) {
        console.debug('Failed to reset unread count on conversation:', err);
      }
    },
    [user]
  );

  // 4. Real-time messages listener for active conversation
  useEffect(() => {
    if (!user || !activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const messagesRef = collection(db, 'conversations', activeConversationId, 'messages');

    // Subscribe to messages in active conversation
    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const msgs: Message[] = [];
        const unreadToMark: string[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAtMs = parseTimestampMs(data.createdAt);

          const msgItem: Message = {
            id: docSnap.id,
            conversationId: activeConversationId,
            senderId: data.senderId,
            receiverId: data.receiverId || '',
            senderName: data.senderName || '',
            senderPhotoURL: data.senderPhotoURL || '',
            text: data.text || '',
            type: data.type || 'text',
            mediaUrl: data.mediaUrl || '',
            fileName: data.fileName || '',
            fileSize: data.fileSize || 0,
            replyTo: data.replyTo || null,
            status: data.status || 'sent',
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            isDeleted: !!data.isDeleted,
            createdAt: data.createdAt,
            createdAtMs,
            updatedAt: data.updatedAt,
          };

          msgs.push(msgItem);

          // If incoming message for current user not yet marked as read
          if (data.senderId !== user.uid && (!data.readBy || !data.readBy.includes(user.uid))) {
            unreadToMark.push(docSnap.id);
          }
        });

        // Deterministically sort messages in chronological order
        msgs.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

        // Detect new incoming message to play chime and trigger notification
        if (msgs.length > prevMessagesLengthRef.current && prevMessagesLengthRef.current > 0) {
          const latestMsg = msgs[msgs.length - 1];
          if (latestMsg && latestMsg.senderId !== user.uid) {
            if (settings.soundEnabled) {
              playMessageSound();
            }

            if (settings.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
              if (document.visibilityState !== 'visible' || activeConversationIdRef.current !== activeConversationId) {
                new Notification(latestMsg.senderName || 'New Message', {
                  body: latestMsg.text || 'Sent an attachment',
                  icon: latestMsg.senderPhotoURL || '/favicon.ico',
                });
              }
            }
          }
        }

        prevMessagesLengthRef.current = msgs.length;
        setMessages(msgs);
        setLoadingMessages(false);

        // Reset unread count for current user
        markConversationAsRead(activeConversationId);

        // Mark incoming messages as read in Firestore
        if (unreadToMark.length > 0 && settings.readReceipts) {
          unreadToMark.forEach((msgId) => {
            const mRef = doc(db, 'conversations', activeConversationId, 'messages', msgId);
            updateDoc(mRef, {
              status: 'read',
              readBy: [user.uid],
            }).catch((e) => console.debug('Error updating read status:', e));
          });
        }
      },
      (error) => {
        console.error(`Error listening to messages in conversation ${activeConversationId}:`, error);
        setLoadingMessages(false);
        handleFirestoreError(error, OperationType.LIST, `conversations/${activeConversationId}/messages`);
      }
    );

    return () => {
      unsubscribe();
      prevMessagesLengthRef.current = 0;
    };
  }, [activeConversationId, user?.uid, settings.soundEnabled, settings.browserNotifications, settings.readReceipts, markConversationAsRead]);

  // 5. SEND MESSAGE: Full validated flow
  const sendMessage = async (payload: {
    text?: string;
    type?: MessageType;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
  }) => {
    if (!user) {
      throw new Error('You must be signed in to send messages.');
    }
    if (!activeConversationId) {
      throw new Error('Please select a conversation to send your message.');
    }

    // Determine receiver UID
    let receiverId = activeFriend?.uid;
    if (!receiverId && activeConversation) {
      receiverId = activeConversation.participants.find((p) => p !== user.uid);
    }
    if (!receiverId && activeConversationId.includes('_')) {
      const parts = activeConversationId.split('_');
      receiverId = parts.find((p) => p !== user.uid);
    }
    if (!receiverId) {
      throw new Error('Could not identify the recipient for this message.');
    }

    const trimmedText = payload.text ? payload.text.trim() : '';
    const messageType: MessageType = payload.type || 'text';

    if (!trimmedText && !payload.mediaUrl) {
      throw new Error('Message cannot be empty.');
    }

    // Guard against duplicate send requests
    if (isSending) {
      return;
    }

    setIsSending(true);

    try {
      console.log('Sending message to conversation:', activeConversationId, 'receiver:', receiverId);

      // 1. Ensure the parent conversation exists before writing message
      const convRef = doc(db, 'conversations', activeConversationId);
      let summaryText = trimmedText;
      if (messageType === 'image') summaryText = '📷 Photo';
      else if (messageType === 'audio') summaryText = '🎤 Voice note';
      else if (messageType === 'file') summaryText = `📎 ${payload.fileName || 'Attachment'}`;

      const convInitData = {
        id: activeConversationId,
        participants: [user.uid, receiverId],
        participantDetails: {
          [user.uid]: {
            displayName: profile?.displayName || user.displayName || 'User',
            username: profile?.username || 'user',
            photoURL: profile?.photoURL || user.photoURL || '',
          },
          [receiverId]: {
            displayName: activeFriend?.displayName || 'Friend',
            username: activeFriend?.username || 'user',
            photoURL: activeFriend?.photoURL || '',
          },
        },
        lastMessageText: summaryText,
        lastMessageSenderId: user.uid,
        lastMessageTime: serverTimestamp(),
        lastMessageType: messageType,
        updatedAt: serverTimestamp(),
      };

      // Set/merge conversation
      await setDoc(convRef, convInitData, { merge: true });

      // 2. Generate new message document reference with unique ID
      const messagesCol = collection(db, 'conversations', activeConversationId, 'messages');
      const msgDocRef = doc(messagesCol);

      const messageDocData = {
        id: msgDocRef.id,
        conversationId: activeConversationId,
        senderId: user.uid,
        receiverId: receiverId,
        senderName: profile?.displayName || user.displayName || 'User',
        senderPhotoURL: profile?.photoURL || user.photoURL || '',
        text: trimmedText,
        type: messageType,
        mediaUrl: payload.mediaUrl || '',
        fileName: payload.fileName || '',
        fileSize: payload.fileSize || 0,
        replyTo: replyingTo ? { ...replyingTo } : null,
        status: 'sent',
        readBy: [user.uid],
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Write the message to Firestore
      await setDoc(msgDocRef, messageDocData);
      console.log('Message written successfully with ID:', msgDocRef.id);

      // 3. Play audio feedback
      if (settings.soundEnabled) {
        playSentSound();
      }

      // Reset reply state
      setReplyingTo(null);
    } catch (error: unknown) {
      console.error('CRITICAL: Error in sendMessage write operation:', error);
      handleFirestoreError(error, OperationType.CREATE, `conversations/${activeConversationId}/messages`);
    } finally {
      setIsSending(false);
    }
  };

  // 6. Delete message (soft delete)
  const deleteMessage = async (messageId: string) => {
    if (!user || !activeConversationId) return;
    const msgRef = doc(db, 'conversations', activeConversationId, 'messages', messageId);
    try {
      await updateDoc(msgRef, {
        isDeleted: true,
        text: 'This message was deleted',
        mediaUrl: '',
        fileName: '',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${activeConversationId}/messages/${messageId}`);
    }
  };

  // 7. Start or open conversation with another user
  const startConversationWithUser = async (targetUser: UserProfile): Promise<Conversation> => {
    if (!user || !profile) throw new Error('Not logged in');
    if (targetUser.uid === user.uid) throw new Error('Cannot start chat with yourself');

    // Deterministic 1-to-1 conversation ID: sort([userA, userB]).join('_')
    const convId = getConversationId(user.uid, targetUser.uid);
    console.log('Starting conversation with ID:', convId, 'Target:', targetUser.username);

    const convRef = doc(db, 'conversations', convId);

    const convData: Partial<Conversation> = {
      id: convId,
      participants: [user.uid, targetUser.uid],
      participantDetails: {
        [user.uid]: {
          displayName: profile.displayName || profile.username,
          username: profile.username,
          photoURL: profile.photoURL || '',
        },
        [targetUser.uid]: {
          displayName: targetUser.displayName || targetUser.username,
          username: targetUser.username,
          photoURL: targetUser.photoURL || '',
        },
      },
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(convRef, convData, { merge: true });

      const fullConv: Conversation = {
        id: convId,
        participants: [user.uid, targetUser.uid],
        participantDetails: convData.participantDetails!,
        lastMessageText: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        unreadCount: { [user.uid]: 0, [targetUser.uid]: 0 },
      };

      // IMMEDIATELY set state so chat screen opens instantly
      setActiveConversationId(convId);
      setActiveConversation(fullConv);
      setActiveFriend(targetUser);

      return fullConv;
    } catch (error) {
      console.error('Error starting conversation:', error);
      handleFirestoreError(error, OperationType.CREATE, `conversations/${convId}`);
    }
  };

  // 8. Search users in Firestore
  const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
    const term = searchTerm ? searchTerm.trim().toLowerCase().replace(/^@/, '') : '';

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, limit(50));
      const snapshot = await getDocs(q);
      const results: UserProfile[] = [];

      snapshot.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.uid === user?.uid) return;

        if (!term) {
          results.push(u);
          return;
        }

        const matchUsername = u.username?.toLowerCase().includes(term);
        const matchName = u.displayName?.toLowerCase().includes(term);
        const matchEmail = u.email?.toLowerCase().includes(term);

        if (matchUsername || matchName || matchEmail) {
          results.push(u);
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  };

  // Compute total unread count for sidebar badge and page title
  const totalUnreadCount = conversations.reduce((acc, conv) => {
    if (!user) return acc;
    return acc + (conv.unreadCount?.[user.uid] || 0);
  }, 0);

  // Sync total unread count with browser document title
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) PulseChat - Real-Time Messaging`;
    } else {
      document.title = 'PulseChat - Real-Time Messaging';
    }
  }, [totalUnreadCount]);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        activeFriend,
        messages,
        loadingConversations,
        loadingMessages,
        isSending,
        totalUnreadCount,
        replyingTo,
        setActiveConversationId,
        setReplyingTo,
        sendMessage,
        deleteMessage,
        startConversationWithUser,
        searchUsers,
        markConversationAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
