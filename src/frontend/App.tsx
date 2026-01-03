/**
 * CV Voice Agent - Main Application Component
 * 
 * Architecture:
 * - src/backend/models/   → Types and prompts
 * - src/backend/tools/    → Tool definitions and handlers
 * - src/backend/functions/→ PDF, Document, Voice, N8N services
 * - src/frontend/components/ → UI components
 * - src/utils/            → Audio utilities
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Backend imports
import {
    Message,
    UploadedFile,
    LiveStatus,
    LogEntry,
    GroundingLink,
    VoiceSessionRefs,
    LogType
} from '../backend/models/types';
import { generatePDF } from '../backend/functions/pdfGenerator';
import { processDocument, processRemoteDocument } from '../backend/functions/documentProcessor';
import { createVoiceSession, stopVoiceSession, sendAudioInput } from '../backend/functions/voiceSession';
import { sendChatMessage } from '../backend/functions/n8nService';

// Utils
import { blobToBase64 } from '../utils/audioUtils';

// Components
import { Header, ChatPanel, InputArea, VoiceOverlay, LogPanel } from './components';

const App: React.FC = () => {
    // ============================================
    // STATE
    // ============================================
    const [messages, setMessages] = useState<Message[]>(() => {
        const saved = localStorage.getItem('v15_chat_history');
        return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
    });
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>(LiveStatus.IDLE);
    const [isMinimized, setIsMinimized] = useState(false);
    const [pipPos, setPipPos] = useState({ x: 20, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [inputMessage, setInputMessage] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [showPlusMenu, setShowPlusMenu] = useState(false);
    const [showUrlInputBox, setShowUrlInputBox] = useState(false);
    const [pastedUrl, setPastedUrl] = useState('');
    const [isProcessingUrl, setIsProcessingUrl] = useState(false);
    const [showLogPanel, setShowLogPanel] = useState(false);

    // ============================================
    // REFS
    // ============================================
    const liveStatusRef = useRef<LiveStatus>(LiveStatus.IDLE);
    const filesRef = useRef<UploadedFile[]>([]);
    const vectorStore = useRef<Record<string, string>>({});
    const chatEndRef = useRef<HTMLDivElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);

    // Voice session refs
    const voiceRefs = useRef<VoiceSessionRefs>({
        audioContextIn: null,
        audioContextOut: null,
        micSource: null,
        processor: null,
        nextStartTime: 0,
        audioSources: new Set(),
        heartbeatInterval: null
    });

    // Muted ref for audio callback (avoids stale closure)
    const isMutedRef = useRef(false);

    // ============================================
    // SYNC EFFECTS
    // ============================================
    useEffect(() => { liveStatusRef.current = liveStatus; }, [liveStatus]);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    useEffect(() => {
        localStorage.setItem('v15_chat_history', JSON.stringify(messages));
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showUrlInputBox]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ============================================
    // HELPERS
    // ============================================
    const addLog = useCallback((type: LogType, message: string) => {
        setLogs(prev => [...prev.slice(-99), {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date(),
            type,
            message
        }]);
    }, []);

    const addMessage = useCallback((role: 'user' | 'assistant', content: string, attachments?: string[], groundingLinks?: GroundingLink[]) => {
        setMessages(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            role, content,
            timestamp: new Date(),
            attachments,
            groundingLinks
        }]);
    }, []);

    // ============================================
    // PDF GENERATION
    // ============================================
    const handleRenderPDF = async (html: string, filename: string): Promise<string> => {
        const result = await generatePDF(html, filename, addLog);
        if (result.success) {
            addMessage('assistant', `तैयार है! Your executive resume is ready.`);
            addMessage('assistant', `Audit complete: Integrated current industry keywords, optimized visual structure, and refined your professional narrative.`, [result.url]);
        }
        return result.url;
    };

    // ============================================
    // CHAT HANDLING
    // ============================================
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || isTyping) return;
        const query = inputMessage;
        setInputMessage('');
        addMessage('user', query);
        setIsTyping(true);
        addLog('INFO', `Connecting to Career Architect via N8N...`);

        const result = await sendChatMessage(query, filesRef.current, vectorStore.current);

        if (result.success) {
            addMessage('assistant', result.text || "I am analyzing that for you now...");
            addLog('SUCCESS', `N8N response received successfully.`);
        } else {
            addMessage('assistant', result.text);
            addLog('ERROR', `N8N request failed: ${result.error}`);
        }
        setIsTyping(false);
    };

    // ============================================
    // DOCUMENT PROCESSING
    // ============================================
    const getDocumentContext = () => ({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
        vectorStore: vectorStore.current,
        filesRef: filesRef.current,
        liveStatus: liveStatusRef.current,
        sessionPromise: sessionPromiseRef.current,
        onLog: addLog,
        onAddMessage: addMessage,
        onFilesUpdate: (updatedFiles: UploadedFile[]) => {
            filesRef.current = updatedFiles;
            setFiles([...updatedFiles]);
        }
    });

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setShowPlusMenu(false);
        try {
            const base64Data = await blobToBase64(file);
            await processDocument(base64Data, file.type, file.name, getDocumentContext());
        } catch (err) {
            addMessage('assistant', "Audit failed to initialize.");
        }
    };

    const submitPastedUrl = async () => {
        if (!pastedUrl.trim() || isProcessingUrl) return;
        setIsProcessingUrl(true);
        const result = await processRemoteDocument(pastedUrl, getDocumentContext(), blobToBase64);
        if (result.success) {
            setShowUrlInputBox(false);
            setPastedUrl('');
        }
        setIsProcessingUrl(false);
    };

    // ============================================
    // VOICE SESSION
    // ============================================
    const startCall = async () => {
        try {
            setIsMinimized(false);
            await createVoiceSession(
                {
                    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
                    voiceName: 'Achird'
                },
                {
                    files: filesRef.current,
                    vectorStore: vectorStore.current,
                    renderPDF: handleRenderPDF,
                    setIsMinimized,
                    setIsSpeaking,
                    setLiveStatus,
                    addLog,
                    addMessage,
                    onTranscription: () => { }
                },
                voiceRefs.current,
                (sessionPromise) => {
                    sessionPromiseRef.current = sessionPromise;
                    if (voiceRefs.current.processor) {
                        voiceRefs.current.processor.onaudioprocess = (e) => {
                            // Use refs to avoid stale closure
                            if (!isMutedRef.current && liveStatusRef.current === LiveStatus.ACTIVE) {
                                const data = e.inputBuffer.getChannelData(0);
                                sendAudioInput(data, sessionPromiseRef.current, isMutedRef.current, liveStatusRef.current);
                            }
                        };
                    }
                }
            );
        } catch (err: any) {
            console.error('Failed to start call:', err);
            addLog('ERROR', `Failed to start voice session: ${err?.message || err}`);
            setLiveStatus(LiveStatus.ERROR);
        }
    };

    const stopCall = () => {
        stopVoiceSession(voiceRefs.current);
        setLiveStatus(LiveStatus.IDLE);
        setIsSpeaking(false);
        sessionPromiseRef.current = null;
        voiceRefs.current = {
            audioContextIn: null,
            audioContextOut: null,
            micSource: null,
            processor: null,
            nextStartTime: 0,
            audioSources: new Set(),
            heartbeatInterval: null
        };
    };

    // ============================================
    // PIP DRAG HANDLERS
    // ============================================
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setDragStartPos({ x: clientX, y: clientY });
    };

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !isMinimized) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        setPipPos({ x: clientX - 70, y: clientY - 90 });
    };

    const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        const clientX = 'touches' in e ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY;
        const dist = Math.hypot(clientX - dragStartPos.x, clientY - dragStartPos.y);
        if (dist < 5 && isMinimized) setIsMinimized(false);
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0f172a] overflow-hidden">
            {/* Main Chat Panel */}
            <div className="chat-main flex-1 flex flex-col bg-[#f0f2f5] relative border-r border-slate-700 overflow-hidden">
                <div className="chat-bg" />

                <Header
                    liveStatus={liveStatus}
                    showLogPanel={showLogPanel}
                    onToggleLogPanel={() => setShowLogPanel(!showLogPanel)}
                    onCallClick={liveStatus === LiveStatus.IDLE ? startCall : () => setIsMinimized(!isMinimized)}
                />

                <ChatPanel
                    messages={messages}
                    isTyping={isTyping}
                    showUrlInputBox={showUrlInputBox}
                    pastedUrl={pastedUrl}
                    isProcessingUrl={isProcessingUrl}
                    onPastedUrlChange={setPastedUrl}
                    onSubmitUrl={submitPastedUrl}
                    onCancelUrl={() => setShowUrlInputBox(false)}
                    onChatClick={() => {
                        if (liveStatus !== LiveStatus.IDLE) setIsMinimized(true);
                        setShowPlusMenu(false);
                    }}
                    chatEndRef={chatEndRef as React.RefObject<HTMLDivElement>}
                />

                <InputArea
                    inputMessage={inputMessage}
                    isTyping={isTyping}
                    showPlusMenu={showPlusMenu}
                    onInputChange={setInputMessage}
                    onSend={handleSendMessage}
                    onTogglePlusMenu={() => setShowPlusMenu(!showPlusMenu)}
                    onPasteUrl={() => { setShowPlusMenu(false); setShowUrlInputBox(true); }}
                    onUploadFile={() => fileInputRef.current?.click()}
                />

                <VoiceOverlay
                    liveStatus={liveStatus}
                    isMinimized={isMinimized}
                    isSpeaking={isSpeaking}
                    isMuted={isMuted}
                    pipPos={pipPos}
                    onMuteToggle={() => setIsMuted(!isMuted)}
                    onEndCall={stopCall}
                    onMinimize={() => setIsMinimized(true)}
                    onMaximize={() => setIsMinimized(false)}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                />
            </div>

            <LogPanel
                logs={logs}
                showLogPanel={showLogPanel}
                liveStatus={liveStatus}
                fileCount={files.length}
                onClose={() => setShowLogPanel(false)}
                onClear={() => setLogs([])}
                logEndRef={logEndRef as React.RefObject<HTMLDivElement>}
            />

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,image/*"
            />
        </div>
    );
};

export default App;
