import React, { useState } from 'react';
import { 
  X, 
  User, 
  Moon, 
  Sun, 
  Monitor, 
  Bell, 
  Volume2, 
  VolumeX, 
  Shield, 
  LogOut, 
  Camera, 
  Check, 
  RefreshCw, 
  Phone, 
  FileText,
  AtSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../common/Toast';
import { compressImage } from '../../utils/file';
import { Avatar } from '../common/Avatar';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { profile, updateUserProfile, checkUsernameAvailable, settings, updateSettings, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'privacy'>('profile');

  // Profile edit fields
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast('Compressing photo...', 'info');
      const dataUrl = await compressImage(file, 400, 400, 0.85);
      setPhotoURL(dataUrl);
      showToast('Photo selected! Click Save to apply.', 'success');
    } catch {
      showToast('Failed to load image', 'error');
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      await updateUserProfile({
        displayName,
        username: username !== profile.username ? username : undefined,
        phoneNumber,
        bio,
        photoURL,
      });
      showToast('Profile updated successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating profile';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Request browser notification permission
  const handleToggleBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser', 'error');
      return;
    }

    if (!settings.browserNotifications) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ browserNotifications: true });
        showToast('Desktop notifications enabled!', 'success');
      } else {
        showToast('Notification permission was denied', 'error');
        updateSettings({ browserNotifications: false });
      }
    } else {
      updateSettings({ browserNotifications: false });
      showToast('Desktop notifications disabled', 'info');
    }
  };

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
      showToast('Logged out securely', 'info');
    } catch {
      showToast('Error logging out', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-56 bg-slate-50 dark:bg-slate-950/60 p-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Settings</h3>
              <button
                onClick={onClose}
                className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'profile'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('appearance')}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'appearance'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 shrink-0" />
                <span>Appearance</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'notifications'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>Notifications</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                  activeTab === 'privacy'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Privacy</span>
              </button>
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          <div className="hidden md:flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB 1: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Profile Information</h4>

              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar
                    src={photoURL}
                    name={displayName || 'User'}
                    size="xl"
                    className="ring-2 ring-indigo-500/30"
                  />
                  <label className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer shadow">
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-white">{displayName}</h5>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">@{profile?.username}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Click the camera icon to upload a photo</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username (@)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    maxLength={25}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bio / About
                  </label>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Theme & Appearance</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how PulseChat looks on your device.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    theme === 'light'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-6 h-6 text-amber-500" />
                  <span className="text-xs font-semibold">Light</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    theme === 'dark'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-400 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Moon className="w-6 h-6 text-indigo-400" />
                  <span className="text-xs font-semibold">Dark</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                    theme === 'system'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-500 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Monitor className="w-6 h-6 text-sky-400" />
                  <span className="text-xs font-semibold">System</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Notification Preferences</h4>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                      {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Message Sounds</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Play chime audio when sending or receiving messages
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Desktop Notifications</h5>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive browser alerts when app is in background
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBrowserNotifications}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                      settings.browserNotifications
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {settings.browserNotifications ? 'Enabled' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Privacy Controls</h4>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Read Receipts</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Let contacts see when you have read their messages
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.readReceipts}
                    onChange={(e) => updateSettings({ readReceipts: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Show Online Status</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Display active status indicator when you are in the app
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.showOnlineStatus}
                    onChange={(e) => updateSettings({ showOnlineStatus: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
