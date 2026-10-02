import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Smile, 
  Paperclip, 
  Mic, 
  Play, 
  Pause, 
  Check, 
  CheckCheck, 
  MoreVertical, 
  Copy, 
  Reply, 
  Trash2, 
  X, 
  FileText, 
  Download, 
  Sparkles, 
  Info,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Avatar } from '../common/Avatar';
import { EmojiPicker } from '../common/EmojiPicker';
import { useToast } from '../common/Toast';
import { Message, MessageType } from '../../types';
import { formatFileSize, formatLastSeen, formatTimestamp, uploadFileToStorage } from '../../utils/file';
import { VoiceRecorder } from '../../utils/audio';

interface ChatAreaProps {
  onOpenFriendProfile: () => void;
}

export function ChatArea({ onOpenFriendProfile }: ChatAreaProps) {
  const { profile } = useAuth();
  const { 
    activeConversationId,
    activeConversation, 
    activeFriend, 
    messages, 
    loadingMessages, 
    isSending,
    setActiveConversationId, 
    sendMessage, 
    deleteMessage,
    replyingTo,
    setReplyingTo
  } = useChat();
  const { showToast } = useToast();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Media preview lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const voiceRecorderRef = useRef<VoiceRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Adjust textarea height dynamically
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    setSendError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // SEND MESSAGE: Only clear input AFTER write succeeds
  const handleSend = async () => {
    const textToSend = inputText.trim();
    if (!textToSend || isSending) return;

    setSendError(null);

    try {
      await sendMessage({ text: textToSend, type: 'text' });
      // Only clear input after successful write!
      setInputText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setShowEmojiPicker(false);
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setSendError(msg);
      showToast(msg, 'error');
    }
  };

  // Keyboard shortcut: Enter sends, Shift+Enter newlines
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // File upload handler with Storage progress & fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    // Reset input
    e.target.value = '';
    setSendError(null);
    setUploading(true);
    setUploadProgress(0);

    const isImg = file.type.startsWith('image/');
    showToast(`Uploading ${file.name}...`, 'info');

    try {
      const uploadResult = await uploadFileToStorage(
        file,
        `conversations/${activeConversationId}`,
        (percent) => setUploadProgress(percent)
      );

      await sendMessage({
        type: isImg ? 'image' : 'file',
        mediaUrl: uploadResult.url,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      });

      showToast(isImg ? 'Photo sent!' : 'File sent!', 'success');
    } catch (err: unknown) {
      console.error('File upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Error uploading file';
      setSendError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const recorder = new VoiceRecorder();
      await recorder.start();
      voiceRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Voice recording error:', err);
      showToast('Microphone access is required to record voice notes', 'error');
    }
  };

  const stopAndSendRecording = async () => {
    if (!voiceRecorderRef.current) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    try {
      const { dataUrl } = await voiceRecorderRef.current.stop();
      setIsRecording(false);
      const duration = recordingSeconds;
      setRecordingSeconds(0);

      await sendMessage({
        type: 'audio',
        mediaUrl: dataUrl,
        fileName: `Voice Note (${duration}s)`,
      });
      showToast('Voice note sent!', 'success');
    } catch (err: unknown) {
      console.error('Voice send error:', err);
      showToast('Could not record voice note', 'error');
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    voiceRecorderRef.current?.cancel();
    setIsRecording(false);
    setRecordingSeconds(0);
    showToast('Recording cancelled', 'info');
  };

  // Audio playback handler
  const togglePlayAudio = (messageId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingAudioId === messageId) {
      audioElementRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      setPlayingAudioId(messageId);

      audio.play().catch((err) => {
        console.error('Audio play error:', err);
        showToast('Cannot play audio file', 'error');
        setPlayingAudioId(null);
      });

      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  // Copy message text
  const handleCopyMessage = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Message copied to clipboard', 'info');
    setActiveMenuMessageId(null);
  };

  // Reply to message
  const handleReplyMessage = (msg: Message) => {
    setReplyingTo({
      id: msg.id,
      text: msg.text || (msg.type === 'image' ? 'Photo' : msg.type === 'audio' ? 'Voice note' : 'Attachment'),
      senderName: msg.senderName || 'Contact',
      type: msg.type,
    });
    setActiveMenuMessageId(null);
    textareaRef.current?.focus();
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      showToast('Message deleted', 'info');
      setActiveMenuMessageId(null);
    } catch (err) {
      console.error('Delete message error:', err);
      showToast('Could not delete message', 'error');
    }
  };

  // If no conversation is active, show clean placeholder on desktop
  if (!activeConversationId) {
    return (
      <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mb-4 shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          PulseChat Real-Time Messenger
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
          Select a chat from the sidebar or click <strong className="text-indigo-500 font-semibold">+ New Chat</strong> to start talking with friends in real time.
        </p>
      </div>
    );
  }

  // Format friend info
  const friendName = activeFriend?.displayName || activeConversation?.participantDetails?.[activeFriend?.uid || '']?.displayName || 'Friend';
  const friendUsername = activeFriend?.username || activeConversation?.participantDetails?.[activeFriend?.uid || '']?.username;
  const friendPhoto = activeFriend?.photoURL || activeConversation?.participantDetails?.[activeFriend?.uid || '']?.photoURL;
  const isFriendOnline = activeFriend?.isOnline;
  const friendLastSeen = activeFriend?.lastSeen;

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/70 dark:bg-slate-950 relative overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          <button
            type="button"
            onClick={() => setActiveConversationId(null)}
            className="md:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl"
            title="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Friend Profile Header Trigger */}
          <div
            onClick={onOpenFriendProfile}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <Avatar
              src={friendPhoto}
              name={friendName}
              size="md"
              isOnline={isFriendOnline}
              showStatus={true}
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {friendName}
              </h3>
              <p className="text-[11px] font-medium truncate flex items-center gap-1.5">
                {friendUsername && <span className="text-indigo-600 dark:text-indigo-400">@{friendUsername} •</span>}
                <span className={isFriendOnline ? 'text-emerald-500' : 'text-slate-400'}>
                  {formatLastSeen(friendLastSeen, isFriendOnline)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenFriendProfile}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="View Contact Details"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        onClick={() => {
          setActiveMenuMessageId(null);
          setShowEmojiPicker(false);
        }}
        className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3"
      >
        {loadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-500 mr-2" />
            <span className="text-xs text-slate-400">Connecting to real-time chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Avatar src={friendPhoto} name={friendName} size="xl" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-3">
              Say hello to {friendName}! 👋
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Messages you send will appear in real time on {friendName}&apos;s device without refreshing.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === profile?.uid;
            const isMenuOpen = activeMenuMessageId === msg.id;

            // Date divider calculation
            const prevMsg = messages[index - 1];
            const msgDate = new Date(msg.createdAtMs || Date.now()).toDateString();
            const prevDate = prevMsg ? new Date(prevMsg.createdAtMs || Date.now()).toDateString() : null;
            const showDateHeader = msgDate !== prevDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateHeader && (
                  <div className="flex justify-center my-3">
                    <span className="px-3 py-1 bg-slate-200/80 dark:bg-slate-800/80 rounded-full text-[10px] font-semibold text-slate-600 dark:text-slate-400 shadow-xs">
                      {formatTimestamp(msg.createdAtMs || msg.createdAt).split(',')[0]}
                    </span>
                  </div>
                )}

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                  <div className={`flex items-end gap-1.5 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Message Bubble */}
                    <div
                      className={`relative rounded-2xl p-3 shadow-xs transition-all ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-xs border border-slate-200/70 dark:border-slate-700/60'
                      } ${msg.isDeleted ? 'opacity-60 italic' : ''}`}
                    >
                      {/* Replied quote snippet */}
                      {msg.replyTo && (
                        <div
                          className={`mb-2 p-2 rounded-xl text-xs border-l-3 ${
                            isMe
                              ? 'bg-indigo-700/60 border-white/60 text-indigo-100'
                              : 'bg-slate-100 dark:bg-slate-700/60 border-indigo-500 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-semibold block text-[10px]">
                            {msg.replyTo.senderName}
                          </span>
                          <span className="truncate block opacity-85">
                            {msg.replyTo.text}
                          </span>
                        </div>
                      )}

                      {/* Content based on type */}
                      {msg.isDeleted ? (
                        <p className="text-xs">This message was deleted</p>
                      ) : (
                        <>
                          {/* Photo message */}
                          {msg.type === 'image' && msg.mediaUrl && (
                            <div className="mb-1 rounded-xl overflow-hidden cursor-pointer relative group/img">
                              <img
                                src={msg.mediaUrl}
                                alt="Shared attachment"
                                className="max-h-64 sm:max-h-80 w-auto object-cover rounded-xl"
                                onClick={() => setLightboxImage(msg.mediaUrl || null)}
                              />
                              <button
                                onClick={() => setLightboxImage(msg.mediaUrl || null)}
                                className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Voice note message */}
                          {msg.type === 'audio' && (
                            <div className="flex items-center gap-3 py-1 min-w-[200px]">
                              <button
                                type="button"
                                onClick={() => togglePlayAudio(msg.id, msg.mediaUrl)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all ${
                                  isMe
                                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                                }`}
                              >
                                {playingAudioId === msg.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-1 h-4">
                                  {[12, 24, 16, 28, 8, 20, 14, 26, 18, 10, 22].map((height, i) => (
                                    <div
                                      key={i}
                                      style={{ height: `${height}px` }}
                                      className={`w-1 rounded-full transition-all ${
                                        isMe ? 'bg-indigo-300' : 'bg-indigo-500/70'
                                      } ${playingAudioId === msg.id ? 'animate-pulse' : ''}`}
                                    />
                                  ))}
                                </div>
                                <span className={`text-[10px] mt-1 block ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  {msg.fileName || 'Voice Note'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Generic file message */}
                          {msg.type === 'file' && (
                            <div
                              className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                                isMe
                                  ? 'bg-indigo-700/60 border-indigo-400/40 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white'
                              }`}
                            >
                              <FileText className="w-6 h-6 shrink-0 text-indigo-400" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold truncate">{msg.fileName || 'Attachment'}</p>
                                <p className="text-[10px] opacity-75">{formatFileSize(msg.fileSize)}</p>
                              </div>
                              {msg.mediaUrl && (
                                <a
                                  href={msg.mediaUrl}
                                  download={msg.fileName || 'download'}
                                  className={`p-1.5 rounded-lg hover:opacity-80 transition-opacity ${
                                    isMe ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200'
                                  }`}
                                  title="Download"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text Content */}
                          {msg.text && (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}
                        </>
                      )}

                      {/* Timestamp & Status checks */}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                          isMe ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        <span>{formatTimestamp(msg.createdAtMs || msg.createdAt)}</span>
                        {isMe && !msg.isDeleted && (
                          <span>
                            {msg.status === 'read' || (msg.readBy && msg.readBy.length > 1) ? (
                              <span title="Read">
                                <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span title="Delivered">
                                <CheckCheck className="w-3.5 h-3.5 opacity-70" />
                              </span>
                            ) : msg.status === 'sending' ? (
                              <span title="Sending...">
                                <Clock className="w-3 h-3 opacity-60 animate-spin" />
                              </span>
                            ) : (
                              <span title="Sent to cloud">
                                <Check className="w-3.5 h-3.5 opacity-70" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Trigger */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuMessageId(isMenuOpen ? null : msg.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-opacity cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className={`absolute bottom-6 z-30 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs select-none animate-in fade-in ${
                            isMe ? 'right-0' : 'left-0'
                          }`}
                        >
                          {msg.text && (
                            <button
                              type="button"
                              onClick={() => handleCopyMessage(msg.text)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReplyMessage(msg)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                          {isMe && !msg.isDeleted && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/60 border-t border-indigo-100 dark:border-indigo-900/60 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-indigo-700 dark:text-indigo-300 mb-1">
              <span>Uploading attachment...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-indigo-200 dark:bg-indigo-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Banner with Retry */}
      {sendError && (
        <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/80 border-t border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Sending failed: {sendError}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSend}
              className="font-bold underline hover:opacity-80 cursor-pointer"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setSendError(null)}
              className="p-1 hover:opacity-80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-indigo-50 dark:bg-slate-900 border-t border-indigo-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                Replying to {replyingTo.senderName}:
              </span>{' '}
              <span className="text-slate-500 dark:text-slate-400 truncate">{replyingTo.text}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input / Voice Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative z-20 shrink-0">
        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div className="absolute bottom-18 left-4 z-40 animate-in fade-in slide-in-from-bottom-2">
            <EmojiPicker
              onSelectEmoji={(emoji) => {
                setInputText((prev) => prev + emoji);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}

        {isRecording ? (
          /* Live Voice Recording Controls */
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-2.5 px-4 animate-pulse">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span>Recording Voice Note...</span>
              <span className="font-mono text-sm ml-2">
                0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="py-1 px-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={stopAndSendRecording}
                className="py-1.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        ) : (
          /* Standard Message Input Bar */
          <div className="flex items-end gap-2">
            {/* Attachment Button */}
            <label className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors shrink-0">
              <Paperclip className="w-5 h-5" />
              <input
                type="file"
                disabled={uploading || isSending}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </label>

            {/* Emoji Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                showEmojiPicker
                  ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Expanding Textarea */}
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              placeholder="Type a message (Enter to send, Shift+Enter for newline)..."
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500/50 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none max-h-32 transition-all disabled:opacity-60"
            />

            {/* Send / Voice Record Button */}
            {inputText.trim() ? (
              <button
                type="button"
                disabled={isSending}
                onClick={handleSend}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-all active:scale-95 shrink-0 cursor-pointer"
                title="Send message"
              >
                {isSending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="p-2.5 text-slate-400 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/40 rounded-xl transition-colors shrink-0 cursor-pointer"
                title="Hold or click to record voice note"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal for Full Image View */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
