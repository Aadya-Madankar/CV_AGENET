/**
 * Log Panel Component
 * Displays system logs and status
 */

import React from 'react';
import { LogEntry, LiveStatus } from '../../backend/models/types';

interface LogPanelProps {
    logs: LogEntry[];
    showLogPanel: boolean;
    liveStatus: LiveStatus;
    fileCount: number;
    onClose: () => void;
    onClear: () => void;
    logEndRef: React.RefObject<HTMLDivElement>;
}

export const LogPanel: React.FC<LogPanelProps> = ({
    logs,
    showLogPanel,
    liveStatus,
    fileCount,
    onClose,
    onClear,
    logEndRef
}) => {
    const getLogTypeStyle = (type: LogEntry['type']) => {
        switch (type) {
            case 'ERROR':
                return 'bg-red-900/40 text-red-400';
            case 'TOOL':
                return 'bg-purple-900/40 text-purple-400';
            case 'AUDIO':
                return 'bg-blue-900/40 text-blue-400';
            case 'SUCCESS':
                return 'bg-emerald-900/40 text-emerald-400';
            default:
                return 'bg-slate-800 text-slate-400';
        }
    };

    return (
        <div className={`log-panel ${showLogPanel ? 'open' : ''} w-full lg:w-[420px] flex flex-col bg-[#0f172a] text-slate-300 font-mono text-[11px] border-l border-slate-800 shadow-2xl relative z-50`}>
            {/* Close button for mobile */}
            <button
                onClick={onClose}
                className="lg:hidden absolute top-3 right-3 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white z-10"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Header */}
            <div className="px-4 py-3 bg-[#1e293b] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                    <span className="font-bold text-slate-100 uppercase tracking-tighter">
                        Career Logic Stream
                    </span>
                </div>
                <button
                    onClick={onClear}
                    className="text-[10px] text-slate-500 hover:text-white transition-colors"
                >
                    Clear stream
                </button>
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-[#020617]/50">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-center opacity-40">
                        <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Awaiting career insights...
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="flex gap-2 animate-in fade-in duration-200">
                            <span className="text-slate-600 shrink-0">
                                [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                            </span>
                            <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded-[3px] text-[9px] ${getLogTypeStyle(log.type)}`}>
                                {log.type}
                            </span>
                            <span className="break-all text-slate-200 leading-relaxed">
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
                <div ref={logEndRef} />
            </div>

            {/* Footer Status */}
            <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${liveStatus === LiveStatus.ACTIVE
                            ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                            : 'bg-slate-700'
                        }`} />
                    <span>Core: {liveStatus === LiveStatus.ACTIVE ? 'LIVE' : 'STANDBY'}</span>
                </div>
                <span>{fileCount} Analysis Targets Active</span>
            </div>
        </div>
    );
};

export default LogPanel;
