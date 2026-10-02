import React, { useState } from 'react';
import { 
  X, 
  AtSign, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  Copy, 
  Check, 
  MessageSquare,
  ShieldCheck,
  Circle
} from 'lucide-react';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { formatLastSeen, formatTimestamp } from '../../utils/file';
import { useChat } from '../../context/ChatContext';

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  isSelf?: boolean;
  onOpenSettings?: () => void;
}

export function UserProfileModal({ user, isOpen, onClose, isSelf = false, onOpenSettings }: UserProfileModalProps) {
  const { startConversationWithUser } = useChat();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const copyUsername = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartChat = async () => {
    if (!isSelf) {
      await startConversationWithUser(user);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative">
        {/* Cover banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar overlay */}
          <div className="flex justify-between items-end -mt-12 mb-4">
            <Avatar
              src={user.photoURL}
              name={user.displayName}
              size="2xl"
              isOnline={user.isOnline}
              showStatus={true}
              className="ring-4 ring-white dark:ring-slate-900 shadow-xl"
            />
            {isSelf ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                className="py-1.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all"
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartChat}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            )}
          </div>

          {/* User Details */}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {user.displayName}
              </h3>
              <span title="Verified Member">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                @{user.username}
              </span>
              <button
                type="button"
                onClick={copyUsername}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                title="Copy handle"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Online Status */}
            <div className="flex items-center gap-2 mt-2 text-xs font-medium">
              <Circle
                className={`w-2.5 h-2.5 fill-current ${
                  user.isOnline ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'
                }`}
              />
              <span className={user.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                {formatLastSeen(user.lastSeen, user.isOnline)}
              </span>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                  About
                </p>
                {user.bio}
              </div>
            )}

            {/* Contact & Meta Info */}
            <div className="mt-4 space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>

              {user.phoneNumber && (
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{user.phoneNumber}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Joined {formatTimestamp(user.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
