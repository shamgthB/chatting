import React, { useState, useEffect } from 'react';
import { Search, X, MessageSquarePlus, RefreshCw, UserCheck, Sparkles } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { UserProfile } from '../../types';
import { Avatar } from '../common/Avatar';
import { useToast } from '../common/Toast';

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser?: (user: UserProfile) => void;
}

export function UserSearchModal({ isOpen, onClose, onSelectUser }: UserSearchModalProps) {
  const { searchUsers, startConversationWithUser } = useChat();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    // Fetch active users when opening
    setSearching(true);
    searchUsers('')
      .then((users) => setResults(users))
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [isOpen]);

  // Live search debounce
  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const users = await searchUsers(query);
        setResults(users);
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleStartChat = async (targetUser: UserProfile) => {
    try {
      setStartingChat(targetUser.uid);
      if (onSelectUser) {
        onSelectUser(targetUser);
      } else {
        await startConversationWithUser(targetUser);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start conversation';
      showToast(msg, 'error');
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Conversation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Search users by name, username, or email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by @username, name, email..."
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
          {searching ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="text-xs">Finding registered users...</span>
            </div>
          ) : results.length > 0 ? (
            results.map((targetUser) => (
              <div
                key={targetUser.uid}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    src={targetUser.photoURL}
                    name={targetUser.displayName}
                    size="lg"
                    isOnline={targetUser.isOnline}
                    showStatus={true}
                  />
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {targetUser.displayName}
                    </h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate">
                      @{targetUser.username}
                    </p>
                    {targetUser.bio && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                        {targetUser.bio}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={startingChat === targetUser.uid}
                  onClick={() => handleStartChat(targetUser)}
                  className="shrink-0 ml-3 py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {startingChat === targetUser.uid ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </>
                  )}
                </button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {query ? 'No matching users found' : 'Start typing to find users'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                {query
                  ? 'Try searching with their exact @username, full name or email address.'
                  : 'Search for any friend on PulseChat to begin a real-time conversation.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
