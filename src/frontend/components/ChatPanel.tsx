/**
 * Chat Panel Component
 * Displays chat messages and handles message rendering
 */

import React from 'react';
import { Message, GroundingLink } from '../../backend/models/types';

interface ChatPanelProps {
    messages: Message[];
    isTyping: boolean;
    showUrlInputBox: boolean;
    pastedUrl: string;
    isProcessingUrl: boolean;
    onPastedUrlChange: (url: string) => void;
    onSubmitUrl: () => void;
    onCancelUrl: () => void;
    onChatClick: () => void;
    chatEndRef: React.RefObject<HTMLDivElement>;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    messages,
    isTyping,
    showUrlInputBox,
    pastedUrl,
    isProcessingUrl,
    onPastedUrlChange,
    onSubmitUrl,
    onCancelUrl,
    onChatClick,
    chatEndRef
}) => {
    return (
        <div
            className="flex-1 overflow-y-auto chat-container p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10"
            onClick={onChatClick}
        >
            {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`message-bubble ${m.role === 'user' ? 'msg-user' : 'msg-assistant'} max-w-[90%] sm:max-w-[85%] p-3 shadow-sm`}>
                        {m.content && (
                            <p className="text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                                {m.content}
                            </p>
                        )}

                        {/* Grounding Links */}
                        {m.groundingLinks && m.groundingLinks.length > 0 && (
                            <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                    Verified Sources:
                                </p>
                                {m.groundingLinks.map((link, idx) => (
                                    <a
                                        key={idx}
                                        href={link.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-[11px] text-blue-600 hover:underline truncate py-0.5"
                                    >
                                        • {link.title || link.uri}
                                    </a>
                                ))}
                            </div>
                        )}

                        {/* Attachments (PDFs) */}
                        {m.attachments?.map((url, i) => (
                            <div
                                key={i}
                                className="mt-3"
                                onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                            >
                                <div className="pdf-card">
                                    <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <p className="text-[11px] font-bold truncate">Elite Professional Doc</p>
                                        <p className="text-[9px] opacity-70">Click to Download PDF</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <p className="text-[9px] text-right mt-1 opacity-50">
                            {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            ))}

            {/* URL Input Box */}
            {showUrlInputBox && (
                <div className="flex justify-end">
                    <div className="msg-user p-4 w-full max-w-[320px] shadow-xl border border-emerald-200 animate-in slide-in-from-right-4">
                        <h3 className="text-xs font-bold text-slate-700 mb-2">Connect Career Target</h3>
                        <input
                            type="text"
                            autoFocus
                            value={pastedUrl}
                            onChange={(e) => onPastedUrlChange(e.target.value)}
                            placeholder="Paste URL (LinkedIn/Resume)..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 mb-3 focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={onCancelUrl}
                                className="px-3 py-1.5 text-[10px] font-bold text-slate-500"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSubmitUrl}
                                disabled={!pastedUrl.trim() || isProcessingUrl}
                                className="px-4 py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-md shadow-sm"
                            >
                                {isProcessingUrl ? 'Scanning...' : 'Start Audit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="msg-assistant p-3 animate-pulse text-[11px] text-slate-400">
                        Strategist is executing audit...
                    </div>
                </div>
            )}

            <div ref={chatEndRef} />
        </div>
    );
};

export default ChatPanel;
