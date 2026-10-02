import React, { useState } from 'react';
import { 
  MessageSquare, 
  ShieldCheck, 
  Zap, 
  Lock, 
  Mail, 
  ArrowRight, 
  KeyRound, 
  Sparkles,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export function AuthScreen() {
  const { loginWithGoogle, loginWithEmailOtp, sendEmailOtp } = useAuth();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedCodePreview, setGeneratedCodePreview] = useState<string | null>(null);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      showToast('Signed in successfully!', 'success');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Google sign-in was cancelled or failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      setLoading(true);
      const code = await sendEmailOtp(email);
      setOtpSent(true);
      setGeneratedCodePreview(code);
      showToast(`Verification code: ${code}`, 'info', 10000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send verification code';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }

    try {
      setLoading(true);
      await loginWithEmailOtp(email, otp, displayName);
      showToast('Email verified! Welcome to PulseChat', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background ambient decorative blurs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">
              PulseChat
            </h1>
            <p className="text-xs text-indigo-300/70 font-medium">Real-Time Messaging Network</p>
          </div>
        </div>

        {/* Card */}
        <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-xs text-slate-400 mt-1">
              Sign in to connect, chat, and share with your friends in real time.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-800/60 rounded-xl mb-6 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setAuthMode('google');
                setOtpSent(false);
              }}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'google'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Google Account
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'email'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email OTP
            </button>
          </div>

          {/* Google Sign In Area */}
          {authMode === 'google' ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-2xl shadow-lg hover:shadow-indigo-500/10 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>No password required • Instant email verification</span>
              </div>
            </div>
          ) : (
            /* Email OTP Verification Flow */
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-3 text-xs text-indigo-200">
                    <p>We generated a 6-digit verification code for <strong>{email}</strong>.</p>
                    {generatedCodePreview && (
                      <div className="mt-2 flex items-center justify-between bg-indigo-900/60 rounded-lg p-2 font-mono text-sm tracking-wider text-indigo-300">
                        <span>Code: <strong>{generatedCodePreview}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtp(generatedCodePreview)}
                          className="text-xs text-indigo-400 hover:text-white underline"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Enter Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full font-mono text-center tracking-widest bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-1/3 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-2/3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Enter'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Quick Features List */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Instant Real-Time</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Private 1:1 Chats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>Media & Audio Notes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Read Receipts</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-500">
          PulseChat secure cloud communications • Built with Firebase
        </p>
      </div>
    </div>
  );
}
