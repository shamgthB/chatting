import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  UserPlus, 
  Settings, 
  LogOut, 
  Sparkles, 
  Image as ImageIcon, 
  Mic, 
  FileText, 
  CheckCheck,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { Conversation } from '../../types';
import { formatTimestamp } from '../../utils/file';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenSettings: () => void;
  onOpenSelfProfile: () => void;
}

export function Sidebar({ onOpenNewChat, onOpenSettings, onOpenSelfProfile }: SidebarProps) {
  const { profile, logout } = useAuth();
  const { 
    conversations, 
    activeConversation, 
    setActiveConversationId, 
    loadingConversations, 
    totalUnreadCount 
  } = useChat();

  const [filterQuery, setFilterQuery] = useState('');

  // Filter conversations by contact name or username
  const filteredConversations = conversations.filter((conv) => {
    if (!filterQuery.trim()) return true;
    const query = filterQuery.toLowerCase();
    
    // Check friend name in participantDetails
    return Object.entries(conv.participantDetails || {}).some(([uid, details]) => {
      if (uid === profile?.uid) return false;
      return (
        details.displayName?.toLowerCase().includes(query) ||
        details.username?.toLowerCase().includes(query)
      );
    });
  });

  return (
    <aside className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        {/* User Mini Card */}
        <div 
          onClick={onOpenSelfProfile}
          className="flex items-center gap-3 cursor-pointer p-1.5 -m-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
          title="View your profile"
        >
          <Avatar
            src={profile?.photoURL}
            name={profile?.displayName || 'User'}
            size="md"
            isOnline={profile?.isOnline}
            showStatus={true}
          />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {profile?.displayName || 'User'}
            </h2>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
              @{profile?.username}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenNewChat}
            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-all"
            title="New Conversation"
          >
            <UserPlus className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500/50 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 divide-y divide-slate-100 dark:divide-slate-800/40">
        {loadingConversations ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            
            // Find other participant details
            const otherUid = conv.participants.find((p) => p !== profile?.uid);
            const otherDetails = otherUid ? conv.participantDetails?.[otherUid] : null;
            const friendName = otherDetails?.displayName || 'Friend';
            const friendUsername = otherDetails?.username || 'user';
            const friendPhoto = otherDetails?.photoURL;

            const unread = profile ? conv.unreadCount?.[profile.uid] || 0 : 0;
            const isLastSenderSelf = conv.lastMessageSenderId === profile?.uid;

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                {/* Friend Avatar */}
                <Avatar
                  src={friendPhoto}
                  name={friendName}
                  size="md"
                  showStatus={false}
                />

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold truncate text-slate-900 dark:text-white">
                      {friendName}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {formatTimestamp(conv.lastMessageTime || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isLastSenderSelf && <span className="font-medium text-indigo-500 shrink-0">You: </span>}
                      {conv.lastMessageType === 'image' && (
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      )}
                      {conv.lastMessageType === 'audio' && (
                        <Mic className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      )}
                      {conv.lastMessageType === 'file' && (
                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="truncate">
                        {conv.lastMessageText || 'No messages yet'}
                      </span>
                    </div>

                    {/* Unread badge */}
                    {unread > 0 && (
                      <span className="shrink-0 ml-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-4 h-4 shadow-sm">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {filterQuery ? 'No chats match filter' : 'No conversations yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              {filterQuery
                ? 'Try a different search query or start a new conversation.'
                : 'Click the button below to find registered friends and start chatting in real time.'}
            </p>
            {!filterQuery && (
              <button
                type="button"
                onClick={onOpenNewChat}
                className="mt-4 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>PulseChat Cloud</span>
        <span className="flex items-center gap-1 text-emerald-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Real-time synced
        </span>
      </div>
    </aside>
  );
}
