/**
 * Header Component
 * App header with branding and call button
 */

import React from 'react';
import { LiveStatus } from '../../backend/models/types';

interface HeaderProps {
    liveStatus: LiveStatus;
    showLogPanel: boolean;
    onToggleLogPanel: () => void;
    onCallClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    liveStatus,
    showLogPanel,
    onToggleLogPanel,
    onCallClick
}) => {
    return (
        <header className="mobile-header bg-white px-4 py-3 flex items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-emerald-500/20">
                    <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh"
                        alt="Devansh"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-slate-800">Devansh Mehta</h1>
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                        Elite Career Architect
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Log Panel Toggle (Mobile) */}
                <button
                    onClick={onToggleLogPanel}
                    className="log-panel-toggle lg:hidden p-2 rounded-full bg-slate-100 text-slate-600"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </button>

                {/* Call Button */}
                <button
                    onClick={onCallClick}
                    className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs shadow-lg transition-all ${liveStatus === LiveStatus.ACTIVE
                            ? 'bg-emerald-500 text-white animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="hidden sm:inline">
                        {liveStatus === LiveStatus.IDLE ? 'Consult Architect' : 'Return to Call'}
                    </span>
                </button>
            </div>
        </header>
    );
};

export default Header;
