/**
 * Voice Overlay Component
 * Handles voice call UI (full screen and PiP modes)
 */

import React from 'react';
import { LiveStatus } from '../../backend/models/types';

interface VoiceOverlayProps {
    liveStatus: LiveStatus;
    isMinimized: boolean;
    isSpeaking: boolean;
    isMuted: boolean;
    pipPos: { x: number; y: number };
    onMuteToggle: () => void;
    onEndCall: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onDragStart: (e: React.MouseEvent | React.TouchEvent) => void;
    onDrag: (e: React.MouseEvent | React.TouchEvent) => void;
    onDragEnd: (e: React.MouseEvent | React.TouchEvent) => void;
}

export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
    liveStatus,
    isMinimized,
    isSpeaking,
    isMuted,
    pipPos,
    onMuteToggle,
    onEndCall,
    onMinimize,
    onMaximize,
    onDragStart,
    onDrag,
    onDragEnd
}) => {
    if (liveStatus === LiveStatus.IDLE) return null;

    const getStatusText = () => {
        if (liveStatus === LiveStatus.CONNECTING) return 'Connecting to Career Logic...';
        if (isSpeaking) return 'Strategist is Speaking';
        if (isMuted) return 'Mic Muted';
        return 'High-Fidelity Audio Audit Active';
    };

    return (
        <div
            className={`call-overlay absolute z-[100] ${isMinimized
                    ? 'pip-window'
                    : 'inset-0 bg-white flex flex-col items-center justify-between py-12 sm:py-24 animate-in fade-in duration-300'
                }`}
            style={isMinimized ? { left: pipPos.x, top: pipPos.y, position: 'fixed' } : {}}
            onMouseMove={onDrag}
            onTouchMove={onDrag}
            onMouseDown={onDragStart}
            onMouseUp={onDragEnd}
            onTouchStart={onDragStart}
            onTouchEnd={onDragEnd}
        >
            {isMinimized ? (
                // PiP Mode
                <div className="w-full h-full flex flex-col items-center justify-center p-3 relative cursor-grab active:cursor-grabbing">
                    <button
                        onClick={(e) => { e.stopPropagation(); onMaximize(); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white pointer-events-auto"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                    <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg mb-2 pointer-events-none">
                        <img
                            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh"
                            alt="Devansh"
                            className="w-full h-full"
                        />
                    </div>
                    <p className="text-[10px] text-white font-bold tracking-tight pointer-events-none">
                        Strategist Active
                    </p>
                    {isSpeaking && (
                        <div className="dot-pulse mt-1">
                            <span></span><span></span><span></span>
                        </div>
                    )}
                </div>
            ) : (
                // Full Screen Mode
                <>
                    <div className="flex flex-col items-center text-center px-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 sm:mb-8">
                            Devansh Mehta
                        </h2>
                        <div className="relative mb-8 sm:mb-12">
                            {isSpeaking && (
                                <div
                                    className="pulse-ring"
                                    style={{ width: '120px', height: '120px', top: '-10px', left: '-10px' }}
                                />
                            )}
                            <div className="avatar-large w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-emerald-500 bg-slate-100 shadow-2xl">
                                <img
                                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh"
                                    alt="Devansh"
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                        <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">
                            {getStatusText()}
                        </p>
                    </div>

                    <div className="call-buttons flex items-center gap-6 sm:gap-10">
                        {/* Mute Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className={`p-3 sm:p-4 rounded-full transition-all ${isMuted
                                    ? 'bg-red-100 text-red-500'
                                    : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                                }`}>
                                <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {isMuted ? 'Unmute' : 'Mute'}
                            </span>
                        </button>

                        {/* End Call Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onEndCall(); }}
                            className="flex flex-col items-center gap-2"
                        >
                            <div className="p-4 sm:p-6 rounded-full btn-call-active text-white shadow-2xl hover:scale-105 transition-transform">
                                <svg className="w-6 sm:w-8 h-6 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.284 4.184A1 1 0 008.334 3H5z" />
                                </svg>
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                End Session
                            </span>
                        </button>

                        {/* Minimize Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onMinimize(); }}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="p-3 sm:p-4 rounded-full bg-slate-100 text-slate-700 group-hover:bg-slate-200">
                                <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                </svg>
                            </div>
                            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Minimize
                            </span>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default VoiceOverlay;
