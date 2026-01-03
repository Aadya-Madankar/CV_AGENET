/**
 * Backend Type Definitions
 * All shared types for the CV Voice Agent
 */

// ============================================
// MESSAGE TYPES
// ============================================

export interface GroundingLink {
    uri: string;
    title: string;
}

export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    attachments?: string[];
    isVoice?: boolean;
    groundingLinks?: GroundingLink[];
}

// ============================================
// FILE TYPES
// ============================================

export interface UploadedFile {
    name: string;
    url: string;
    type: string;
    content?: string;
}

// ============================================
// LOG TYPES
// ============================================

export type LogType = 'INFO' | 'TOOL' | 'ERROR' | 'AUDIO' | 'SUCCESS';

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: LogType;
    message: string;
}

// ============================================
// SESSION TYPES
// ============================================

export enum LiveStatus {
    IDLE = 'IDLE',
    CONNECTING = 'CONNECTING',
    ACTIVE = 'ACTIVE',
    ERROR = 'ERROR'
}

// ============================================
// TOOL TYPES
// ============================================

export interface ToolResponse {
    status?: string;
    assets?: { name: string; url: string }[];
    content?: string;
    pdf_url?: string;
    date?: string;
    time?: string;
    timezone?: string;
    time_of_day?: string;
    iso?: string;
    friendly?: string;
}

export interface FunctionCall {
    id: string;
    name: string;
    args: Record<string, any>;
}

// ============================================
// SERVICE TYPES
// ============================================

export interface PDFGeneratorResult {
    url: string;
    success: boolean;
    error?: string;
}

export interface DocumentProcessResult {
    url: string;
    content: string;
    fileName: string;
    success: boolean;
    error?: string;
}

export interface N8NChatRequest {
    message: string;
    context: string;
    sessionId: string;
    currentDateTime: string;
    currentDate: string;
}

export interface N8NChatResponse {
    text: string;
    success: boolean;
    error?: string;
}

// ============================================
// VOICE SESSION TYPES
// ============================================

export interface VoiceSessionConfig {
    apiKey: string;
    voiceName?: string;
}

export interface VoiceSessionRefs {
    audioContextIn: AudioContext | null;
    audioContextOut: AudioContext | null;
    micSource: MediaStreamAudioSourceNode | null;
    processor: ScriptProcessorNode | null;
    nextStartTime: number;
    audioSources: Set<AudioBufferSourceNode>;
    heartbeatInterval: number | null;
}

export interface VoiceSessionContext {
    files: UploadedFile[];
    vectorStore: Record<string, string>;
    renderPDF: (html: string, filename: string) => Promise<string>;
    setIsMinimized: (v: boolean) => void;
    setIsSpeaking: (v: boolean) => void;
    setLiveStatus: (status: LiveStatus) => void;
    addLog: (type: LogType, message: string) => void;
    addMessage: (role: 'user' | 'assistant', content: string) => void;
    onTranscription: (user: string, agent: string) => void;
}

// ============================================
// DOCUMENT PROCESSOR TYPES
// ============================================

export interface DocumentProcessorContext {
    apiKey: string;
    vectorStore: Record<string, string>;
    filesRef: UploadedFile[];
    liveStatus: LiveStatus;
    sessionPromise: Promise<any> | null;
    onLog: (type: LogType, message: string) => void;
    onAddMessage: (role: 'user' | 'assistant', content: string, attachments?: string[]) => void;
    onFilesUpdate: (files: UploadedFile[]) => void;
}
