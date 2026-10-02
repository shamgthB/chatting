import React, { useState } from 'react';
import { Smile, Heart, ThumbsUp, Sparkles, Coffee } from 'lucide-react';

interface EmojiPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onClose?: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    icon: Smile,
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐']
  },
  {
    name: 'Gestures',
    icon: ThumbsUp,
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫸', '🫷', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾']
  },
  {
    name: 'Hearts & Love',
    icon: Heart,
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💐', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻']
  },
  {
    name: 'Fun & Sparkles',
    icon: Sparkles,
    emojis: ['✨', '🔥', '🎉', '🎊', '🎈', '⭐', '🌟', '💫', '💥', '🚀', '🎯', '💯', '🏆', '🥇', '⚡', '🌈', '☀️', '🌙', '🪄', '💎', '💡', '🎵', '🎶', '🎤', '🎧', '🎸']
  },
  {
    name: 'Food & Vibes',
    icon: Coffee,
    emojis: ['☕', '🍵', '🧋', '🍺', '🍻', '🍷', '🥂', '🍾', '🍕', '🍔', '🍟', '🌮', '🌯', '🥗', '🍿', '🍩', '🍪', '🎂', '🍰', '🍫', '🍦', '🍧']
  }
];

export function EmojiPicker({ onSelectEmoji }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-2">
      {/* Category Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 px-1">
        {EMOJI_CATEGORIES.map((cat, idx) => {
          const Icon = cat.icon;
          const isActive = activeCategory === idx;
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(idx)}
              className={`p-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 scale-105'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title={cat.name}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-7 gap-1 p-2 max-h-52 overflow-y-auto custom-scrollbar">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelectEmoji(emoji)}
            className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-transform active:scale-90 hover:scale-110"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
