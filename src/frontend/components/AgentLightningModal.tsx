/**
 * Agent Lightning Modal Component
 * Shows optimization dashboard on localhost, instructions on production
 */

import React, { useState, useEffect } from 'react';
import {
    getAPOStats,
    triggerOptimization,
    applyVersion,
    getPromptVersions,
    APOStats,
    OptimizationResult,
    PromptVersion
} from '../../backend/functions/apoService';

interface AgentLightningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLog: (type: string, message: string) => void;
}

// Check if running on localhost
const isLocalhost = () => {
    return window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
};

export const AgentLightningModal: React.FC<AgentLightningModalProps> = ({
    isOpen,
    onClose,
    onLog
}) => {
    const [stats, setStats] = useState<APOStats | null>(null);
    const [versions, setVersions] = useState<PromptVersion[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string>('');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isLocal, setIsLocal] = useState(true);

    // Check environment and load data
    useEffect(() => {
        if (isOpen) {
            setIsLocal(isLocalhost());
            if (isLocalhost()) {
                loadData();
            }
        }
    }, [isOpen]);

    const loadData = async () => {
        const [statsData, versionsData] = await Promise.all([
            getAPOStats(),
            getPromptVersions()
        ]);
        setStats(statsData);
        setVersions(versionsData);
        if (statsData) {
            setSelectedVersion(statsData.current_version);
        }
    };

    const handleOptimize = async () => {
        setIsOptimizing(true);
        setError(null);
        setOptimizationResult(null);
        setSuccessMessage(null);
        onLog('INFO', '⚡ Agent Lightning: Starting prompt optimization...');

        const result = await triggerOptimization(3);

        if (result.success) {
            setOptimizationResult(result);
            onLog('SUCCESS', `⚡ Optimization complete! New version: ${result.new_version}`);
            await loadData();
        } else {
            setError(result.error || 'Optimization failed');
            onLog('ERROR', `⚡ Optimization failed: ${result.error}`);
        }

        setIsOptimizing(false);
    };

    const handleApplyVersion = async () => {
        if (!selectedVersion) return;

        setIsApplying(true);
        setError(null);
        setSuccessMessage(null);
        onLog('INFO', `⚡ Applying prompt version ${selectedVersion}...`);

        const result = await applyVersion(selectedVersion);

        if (result.success) {
            setSuccessMessage(result.message);
            onLog('SUCCESS', `⚡ ${result.message}`);
            await loadData();
        } else {
            setError(result.message);
            onLog('ERROR', `⚡ Failed to apply: ${result.message}`);
        }

        setIsApplying(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl border border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Agent Lightning</h2>
                                <p className="text-xs text-white/70">Real-time Prompt Optimization</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!isLocal ? (
                        /* Production Mode - Show Instructions */
                        <div className="space-y-6">
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                                <div className="flex items-start gap-3">
                                    <svg className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <div>
                                        <h3 className="font-bold text-amber-400 mb-2">Local Development Required</h3>
                                        <p className="text-slate-300 text-sm mb-4">
                                            Agent Lightning requires a local Python server to optimize prompts.
                                            This feature is not available in production.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-800 rounded-xl p-5">
                                <h4 className="font-semibold text-white mb-3">To use Agent Lightning:</h4>
                                <ol className="text-slate-300 text-sm space-y-3">
                                    <li className="flex items-start gap-2">
                                        <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                                        <span>Clone the project locally</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                                        <div>
                                            <span>Start the Agent Lightning server:</span>
                                            <code className="block mt-1 bg-slate-900 px-3 py-2 rounded text-xs text-amber-400">
                                                cd agent-lightning-backend && python prompt_optimizer.py
                                            </code>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                                        <div>
                                            <span>Start the frontend:</span>
                                            <code className="block mt-1 bg-slate-900 px-3 py-2 rounded text-xs text-amber-400">
                                                npm run dev
                                            </code>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="bg-amber-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">4</span>
                                        <span>Open <strong>http://localhost:3000</strong> and click Improve</span>
                                    </li>
                                </ol>
                            </div>

                            <a
                                href="https://github.com/Aadya-Madankar/CV_AGENET"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-3 px-4 rounded-xl font-bold text-sm text-center bg-slate-700 text-white hover:bg-slate-600 transition-all"
                            >
                                View on GitHub
                            </a>
                        </div>
                    ) : (
                        /* Local Mode - Show Full Dashboard */
                        <div className="space-y-5">
                            {/* Stats Grid */}
                            {stats && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-amber-400">{stats.total_interactions}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">Total Logs</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-emerald-400">{stats.good_count}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">Good</div>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-red-400">{stats.bad_count}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">Bad</div>
                                    </div>
                                </div>
                            )}

                            {/* Version Selector */}
                            <div className="bg-slate-800/50 rounded-xl p-4">
                                <label className="text-xs text-slate-400 block mb-2">Select Prompt Version</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedVersion}
                                        onChange={(e) => setSelectedVersion(e.target.value)}
                                        className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        {versions.map((v) => (
                                            <option key={v.version} value={v.version}>
                                                {v.version} {v.source === 'original' ? '(Original)' : v.source === 'optimized' ? '(Optimized)' : ''}
                                                {stats?.current_version === v.version ? ' ✓ Active' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleApplyVersion}
                                        disabled={isApplying || selectedVersion === stats?.current_version}
                                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${isApplying || selectedVersion === stats?.current_version
                                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                                : 'bg-slate-600 text-white hover:bg-slate-500'
                                            }`}
                                    >
                                        {isApplying ? '...' : 'Apply'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    v0 = Original • Higher versions = Optimized
                                </p>
                            </div>

                            {/* Optimization Result */}
                            {optimizationResult && optimizationResult.success && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-semibold text-emerald-400">New Version: {optimizationResult.new_version}</span>
                                    </div>
                                    {optimizationResult.analysis?.improvements && (
                                        <ul className="text-xs text-slate-300 space-y-1 ml-7">
                                            {optimizationResult.analysis.improvements.slice(0, 3).map((imp, idx) => (
                                                <li key={idx}>• {imp}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {/* Success Message */}
                            {successMessage && (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {successMessage}
                                </div>
                            )}

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Generate New Version Button */}
                            <button
                                onClick={handleOptimize}
                                disabled={isOptimizing || !stats || stats.total_interactions < 3}
                                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isOptimizing || !stats || stats.total_interactions < 3
                                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25'
                                    }`}
                            >
                                {isOptimizing ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Optimizing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate New Optimized Version
                                    </>
                                )}
                            </button>

                            {/* Help Text */}
                            {stats && stats.total_interactions < 3 && (
                                <p className="text-xs text-slate-500 text-center">
                                    Need at least 3 logged interactions to optimize. Currently: {stats.total_interactions}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgentLightningModal;
