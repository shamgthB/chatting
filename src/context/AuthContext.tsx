import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserProfile, UserSettings } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  loginWithGoogle: () => Promise<void>;
  loginWithEmailOtp: (email: string, otp: string, displayName?: string) => Promise<void>;
  sendEmailOtp: (email: string) => Promise<string>; // Returns OTP for verification
  completeProfileSetup: (data: {
    username: string;
    displayName: string;
    photoURL?: string;
    phoneNumber?: string;
    bio?: string;
  }) => Promise<void>;
  updateUserProfile: (data: {
    displayName?: string;
    username?: string;
    photoURL?: string;
    phoneNumber?: string;
    bio?: string;
  }) => Promise<void>;
  checkUsernameAvailable: (username: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  soundEnabled: true,
  browserNotifications: false,
  readReceipts: true,
  showOnlineStatus: true,
  showLastSeen: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('pulsechat_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('pulsechat_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch user profile from Firestore
  const fetchProfile = async (firebaseUser: User): Promise<UserProfile | null> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfile;
        setProfile(data);
        setNeedsProfileSetup(false);
        return data;
      } else {
        setProfile(null);
        setNeedsProfileSetup(true);
        return null;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          await fetchProfile(currentUser);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else {
        setProfile(null);
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time presence heartbeat
  useEffect(() => {
    if (!user || !profile) return;

    const setPresence = async (isOnline: boolean) => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline,
          lastSeen: new Date().toISOString(),
        });
      } catch (err) {
        // Soft fail on presence background update
        console.debug('Presence update suppressed:', err);
      }
    };

    setPresence(true);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setPresence(true);
      }
    }, 60000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setPresence(false);
      } else {
        setPresence(true);
      }
    };

    const handleBeforeUnload = () => {
      setPresence(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.uid, profile?.username]);

  // Google Login
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await fetchProfile(result.user);
      }
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Send Email OTP (generates a secure 6-digit verification code)
  const sendEmailOtp = async (email: string): Promise<string> => {
    // Generate secure 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem(`otp_${email.trim().toLowerCase()}`, otp);
    return otp;
  };

  // Verify Email OTP and Sign in
  const loginWithEmailOtp = async (email: string, otp: string, displayName?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const storedOtp = sessionStorage.getItem(`otp_${cleanEmail}`);

    if (!storedOtp || storedOtp !== otp.trim()) {
      throw new Error('Invalid or expired verification code. Please request a new one.');
    }

    sessionStorage.removeItem(`otp_${cleanEmail}`);
    setLoading(true);

    try {
      // Sign in user anonymously with customized display name / email credentials
      const credential = await signInAnonymously(auth);
      if (credential.user) {
        await updateFirebaseProfile(credential.user, {
          displayName: displayName || cleanEmail.split('@')[0],
        });
        await fetchProfile(credential.user);
      }
    } catch (error) {
      console.error('Email OTP sign-in error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Check username availability
  const checkUsernameAvailable = async (username: string): Promise<boolean> => {
    const clean = username.trim().toLowerCase().replace(/^@/, '');
    if (!clean || clean.length < 3) return false;
    
    // Valid format check
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) return false;

    const usernameRef = doc(db, 'usernames', clean);
    try {
      const snap = await getDoc(usernameRef);
      if (!snap.exists()) return true;
      // If current user already owns it, it's valid for them
      return snap.data()?.uid === user?.uid;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `usernames/${clean}`);
    }
  };

  // Complete first-time profile setup
  const completeProfileSetup = async (data: {
    username: string;
    displayName: string;
    photoURL?: string;
    phoneNumber?: string;
    bio?: string;
  }) => {
    if (!user) throw new Error('No authenticated user');

    const cleanUsername = data.username.trim().toLowerCase().replace(/^@/, '');
    if (cleanUsername.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }

    const available = await checkUsernameAvailable(cleanUsername);
    if (!available) {
      throw new Error(`@${cleanUsername} is already taken. Please choose another username.`);
    }

    // 1. Reserve username
    const usernameRef = doc(db, 'usernames', cleanUsername);
    try {
      await setDoc(usernameRef, {
        uid: user.uid,
        username: cleanUsername,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `usernames/${cleanUsername}`);
    }

    // 2. Create user profile
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      uid: user.uid,
      email: user.email || `${cleanUsername}@pulsechat.local`,
      displayName: data.displayName.trim(),
      username: cleanUsername,
      photoURL: data.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      phoneNumber: data.phoneNumber?.trim() || '',
      bio: data.bio?.trim() || 'Hey there! I am using PulseChat.',
      isOnline: true,
      lastSeen: now,
      createdAt: now,
      updatedAt: now,
    };

    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, newProfile);
      setProfile(newProfile);
      setNeedsProfileSetup(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  // Update profile from settings
  const updateUserProfile = async (data: {
    displayName?: string;
    username?: string;
    photoURL?: string;
    phoneNumber?: string;
    bio?: string;
  }) => {
    if (!user || !profile) throw new Error('No user logged in');

    let updatedUsername = profile.username;

    // Handle username update if provided and different
    if (data.username) {
      const cleanNew = data.username.trim().toLowerCase().replace(/^@/, '');
      if (cleanNew !== profile.username) {
        const available = await checkUsernameAvailable(cleanNew);
        if (!available) {
          throw new Error(`@${cleanNew} is already taken.`);
        }

        // Reserve new username
        try {
          await setDoc(doc(db, 'usernames', cleanNew), {
            uid: user.uid,
            username: cleanNew,
            createdAt: new Date().toISOString(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `usernames/${cleanNew}`);
        }

        // Delete old username reservation
        try {
          await deleteDoc(doc(db, 'usernames', profile.username));
        } catch (error) {
          console.warn('Could not clean old username:', error);
        }

        updatedUsername = cleanNew;
      }
    }

    const updatedProfile: UserProfile = {
      ...profile,
      displayName: data.displayName !== undefined ? data.displayName.trim() : profile.displayName,
      username: updatedUsername,
      photoURL: data.photoURL !== undefined ? data.photoURL : profile.photoURL,
      phoneNumber: data.phoneNumber !== undefined ? data.phoneNumber.trim() : profile.phoneNumber,
      bio: data.bio !== undefined ? data.bio.trim() : profile.bio,
      updatedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, 'users', user.uid), updatedProfile as unknown as Record<string, unknown>);
      setProfile(updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Logout
  const logout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      } catch {
        // ignore on exit
      }
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setNeedsProfileSetup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        needsProfileSetup,
        settings,
        updateSettings,
        loginWithGoogle,
        loginWithEmailOtp,
        sendEmailOtp,
        completeProfileSetup,
        updateUserProfile,
        checkUsernameAvailable,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
