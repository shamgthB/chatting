/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { ProfileSetupScreen } from './components/auth/ProfileSetupScreen';
import { Sidebar } from './components/chat/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { UserSearchModal } from './components/chat/UserSearchModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { UserProfileModal } from './components/profile/UserProfileModal';

function MessengerApp() {
  const { user, profile, loading, needsProfileSetup } = useAuth();
  const { activeConversation, activeFriend } = useChat();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFriendProfile, setShowFriendProfile] = useState(false);
  const [showSelfProfile, setShowSelfProfile] = useState(false);

  // 1. Initial Loading Splash
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center text-white select-none">
        <div className="relative mb-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-600/30">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full animate-ping" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-white mb-2">PulseChat</h2>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          <span>Connecting to real-time network...</span>
        </div>
      </div>
    );
  }

  // 2. Authentication Screen
  if (!user) {
    return <AuthScreen />;
  }

  // 3. First-Time Profile Setup Screen
  if (needsProfileSetup || !profile) {
    return <ProfileSetupScreen />;
  }

  // 4. Main Responsive Messenger Dashboard
  return (
    <div className="h-screen w-screen overflow-hidden flex bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* Sidebar: Full on desktop; on mobile only when no active conversation */}
      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 h-full shrink-0`}
      >
        <Sidebar
          onOpenNewChat={() => setShowSearchModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenSelfProfile={() => setShowSelfProfile(true)}
        />
      </div>

      {/* Main Chat Area: Full on desktop; on mobile only when active conversation is selected */}
      <div
        className={`${
          !activeConversation ? 'hidden md:flex' : 'flex'
        } flex-1 h-full min-w-0`}
      >
        <ChatArea onOpenFriendProfile={() => setShowFriendProfile(true)} />
      </div>

      {/* User Search & New Chat Modal */}
      <UserSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Friend Profile Modal */}
      <UserProfileModal
        isOpen={showFriendProfile}
        user={activeFriend}
        onClose={() => setShowFriendProfile(false)}
        isSelf={false}
      />

      {/* Self Profile Modal */}
      <UserProfileModal
        isOpen={showSelfProfile}
        user={profile}
        onClose={() => setShowSelfProfile(false)}
        isSelf={true}
        onOpenSettings={() => setShowSettingsModal(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <MessengerApp />
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
