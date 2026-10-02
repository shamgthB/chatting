// Utilities for file and image processing
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function parseTimestampMs(ts: any): number {
  if (!ts) return Date.now();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') {
    const parsed = new Date(ts).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  }
  if (typeof ts.toMillis === 'function') {
    return ts.toMillis();
  }
  if (typeof ts.toDate === 'function') {
    return ts.toDate().getTime();
  }
  if (ts.seconds !== undefined) {
    return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
  }
  return Date.now();
}

export function formatTimestamp(rawTimestamp?: any): string {
  if (!rawTimestamp) return '';
  const timeMs = parseTimestampMs(rawTimestamp);
  const date = new Date(timeMs);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return timeString;
  }
  if (isYesterday) {
    return `Yesterday, ${timeString}`;
  }
  if (now.getFullYear() === date.getFullYear()) {
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeString}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function formatLastSeen(isoOrTs?: any, isOnline?: boolean): string {
  if (isOnline) return 'Active now';
  if (!isoOrTs) return 'Offline';

  const timeMs = parseTimestampMs(isoOrTs);
  const now = Date.now();
  const diffMinutes = Math.floor((now - timeMs) / (1000 * 60));

  if (diffMinutes < 1) return 'Active just now';
  if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `Last seen ${Math.floor(diffMinutes / 60)}h ago`;
  return `Last seen ${formatTimestamp(timeMs)}`;
}

// Generate deterministic 1-to-1 conversation ID
export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

// Compresses and scales down an image file to a lightweight data URL
export function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/webp', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// Convert any generic file to base64 data URL
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Upload file to Firebase Storage with fallback
export function uploadFileToStorage(
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; fileName: string; fileSize: number; fileType: string }> {
  return new Promise((resolve, reject) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${folder}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        }
      },
      async (error) => {
        console.warn('Firebase Storage upload failed, using client data URL fallback:', error);
        try {
          if (file.type.startsWith('image/')) {
            const dataUrl = await compressImage(file, 1200, 1200, 0.85);
            resolve({
              url: dataUrl,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            });
          } else {
            const dataUrl = await readFileAsDataURL(file);
            resolve({
              url: dataUrl,
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
            });
          }
        } catch (fallbackError) {
          reject(error);
        }
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
        } catch (urlError) {
          // If URL retrieval fails, fallback
          const dataUrl = await readFileAsDataURL(file);
          resolve({
            url: dataUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
          });
        }
      }
    );
  });
}

// Preset avatars for profile setup
export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80',
];
