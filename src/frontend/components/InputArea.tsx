/**
 * Input Area Component
 * Chat input with attachment options
 */

import React from 'react';

interface InputAreaProps {
    inputMessage: string;
    isTyping: boolean;
    showPlusMenu: boolean;
    isVoiceActive?: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onTogglePlusMenu: () => void;
    onPasteUrl: () => void;
    onUploadFile: () => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
    inputMessage,
    isTyping,
    showPlusMenu,
    isVoiceActive = false,
    onInputChange,
    onSend,
    onTogglePlusMenu,
    onPasteUrl,
    onUploadFile
}) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') onSend();
    };

    const placeholder = isVoiceActive
        ? "Type here to chat with Devansh (Voice Model)..."
        : "Search industry trends or audit my career (N8N)...";


    return (
        <div className="input-area p-3 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20 flex items-center gap-2 sm:gap-3 relative">
            {/* Plus Menu */}
            <div className="relative">
                <button
                    onClick={onTogglePlusMenu}
                    className={`p-2 transition-colors ${showPlusMenu ? 'text-emerald-500' : 'text-slate-400'}`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {showPlusMenu && (
                    <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[160px] flex flex-col gap-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
                        <button
                            onClick={onPasteUrl}
                            className="flex items-center gap-3 p-2.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 105.656 5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <span>Paste Profile Link</span>
                        </button>
                        <button
                            onClick={onUploadFile}
                            className="flex items-center gap-3 p-2.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg"
                        >
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span>Audit Resume</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Text Input */}
            <input
                type="text"
                value={inputMessage}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`flex-1 bg-white border rounded-full px-3 sm:px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${isVoiceActive
                        ? 'border-emerald-400 focus:ring-emerald-500/20'
                        : 'border-slate-200 focus:ring-emerald-500/10'
                    }`}
            />

            {/* Send Button */}
            <button
                onClick={onSend}
                className="bg-emerald-500 text-white p-2 sm:p-2.5 rounded-full shadow-lg disabled:opacity-50"
                disabled={!inputMessage.trim() || isTyping}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
            </button>
        </div>
    );
};

export default InputArea;
