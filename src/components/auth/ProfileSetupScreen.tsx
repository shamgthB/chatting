import React, { useState, useEffect } from 'react';
import { 
  User, 
  AtSign, 
  Phone, 
  FileText, 
  Camera, 
  Check, 
  X, 
  RefreshCw, 
  Sparkles, 
  ArrowRight,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { compressImage, PRESET_AVATARS } from '../../utils/file';
import { Avatar } from '../common/Avatar';

export function ProfileSetupScreen() {
  const { user, completeProfileSetup, checkUsernameAvailable } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [bio, setBio] = useState('Hey there! I am using PulseChat.');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || PRESET_AVATARS[0]);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounced username availability checker
  useEffect(() => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean) {
      setUsernameStatus('idle');
      setStatusMessage('');
      return;
    }

    if (clean.length < 3) {
      setUsernameStatus('invalid');
      setStatusMessage('Must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setUsernameStatus('invalid');
      setStatusMessage('Letters, numbers & underscores only');
      return;
    }

    setUsernameStatus('checking');
    setStatusMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const isFree = await checkUsernameAvailable(clean);
        if (isFree) {
          setUsernameStatus('available');
          setStatusMessage(`@${clean} is available!`);
        } else {
          setUsernameStatus('taken');
          setStatusMessage(`@${clean} is already registered`);
        }
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, checkUsernameAvailable]);

  // Custom photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please upload a valid image file (JPEG, PNG, WebP)', 'error');
      return;
    }

    try {
      showToast('Processing photo...', 'info');
      const compressedDataUrl = await compressImage(file, 400, 400, 0.85);
      setPhotoURL(compressedDataUrl);
      showToast('Profile photo updated!', 'success');
    } catch {
      showToast('Failed to process image', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      showToast('Please provide your display name', 'error');
      return;
    }

    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    if (usernameStatus !== 'available' && cleanUsername.length < 3) {
      showToast('Please pick a valid, available username', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await completeProfileSetup({
        displayName: displayName.trim(),
        username: cleanUsername,
        photoURL,
        phoneNumber: phoneNumber.trim(),
        bio: bio.trim(),
      });
      showToast('Profile created! Welcome to PulseChat', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error setting up profile';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Set Up Your Profile</h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your unique username and profile details so friends can recognize you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <Avatar
                src={photoURL}
                name={displayName || 'User'}
                size="2xl"
                className="ring-4 ring-indigo-500/30 shadow-xl"
              />
              <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg cursor-pointer transition-transform active:scale-95 group-hover:scale-105">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Presets selector */}
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Or pick an avatar style:</span>
              <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
                {PRESET_AVATARS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoURL(preset)}
                    className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                      photoURL === preset
                        ? 'border-indigo-500 scale-110 ring-2 ring-indigo-500/40'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={preset} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Display Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Unique Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Unique @Username *
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. shivam123"
                  className={`w-full bg-slate-800/80 border rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-all ${
                    usernameStatus === 'available'
                      ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-700 focus:ring-2 focus:ring-indigo-500'
                  }`}
                />
                <div className="absolute right-3 top-3">
                  {usernameStatus === 'checking' && (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                  )}
                  {usernameStatus === 'available' && (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <X className="w-4 h-4 text-rose-400" />
                  )}
                </div>
              </div>
              {statusMessage && (
                <p
                  className={`text-[11px] mt-1 ${
                    usernameStatus === 'available'
                      ? 'text-emerald-400'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {statusMessage}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Phone Number (optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="tel"
                  maxLength={25}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 000-1234"
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Bio / About */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Short Bio / About
                </label>
                <span className="text-[10px] text-slate-500">{bio.length}/200</span>
              </div>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <textarea
                  rows={3}
                  maxLength={200}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell friends about yourself, interests, status..."
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || (usernameStatus !== 'available' && username.length > 0)}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
          >
            {submitting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Complete Setup & Start Messaging</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
