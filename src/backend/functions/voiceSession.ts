/**
 * Voice Session Service
 * Handles Gemini Live API connection and audio processing
 */

import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import {
    LiveStatus,
    VoiceSessionConfig,
    VoiceSessionContext,
    VoiceSessionRefs,
    LogType
} from '../models/types';
import { MASTER_SYSTEM_PROMPT } from '../models/prompts';
import {
    VOICE_MODEL_NAME,
    AUDIO_CONFIG,
    getCloseReason,
    DEFAULT_VOICE
} from '../models/voiceModel';
import { TOOL_DECLARATIONS } from '../tools/toolDefinitions';
import { handleToolCall } from '../tools/toolHandlers';
import { generateDateContext } from '../tools/dateUtils';
import { decode, createBlob, decodeAudioData } from '../../utils/audioUtils';

/**
 * Initialize audio contexts for input/output
 */
export function initializeAudioContexts(refs: VoiceSessionRefs): void {
    if (!refs.audioContextIn) {
        refs.audioContextIn = new AudioContext({ sampleRate: AUDIO_CONFIG.INPUT_SAMPLE_RATE });
    }
    if (!refs.audioContextOut) {
        refs.audioContextOut = new AudioContext({ sampleRate: AUDIO_CONFIG.OUTPUT_SAMPLE_RATE });
    }
}

/**
 * Resume audio contexts if suspended
 */
export async function resumeAudioContexts(refs: VoiceSessionRefs): Promise<void> {
    await refs.audioContextIn?.resume();
    await refs.audioContextOut?.resume();
}

/**
 * Start heartbeat to keep audio contexts alive
 */
export function startHeartbeat(refs: VoiceSessionRefs): void {
    refs.heartbeatInterval = window.setInterval(() => {
        if (refs.audioContextIn?.state === 'suspended') refs.audioContextIn.resume();
        if (refs.audioContextOut?.state === 'suspended') refs.audioContextOut.resume();
    }, 500);
}

/**
 * Stop heartbeat
 */
export function stopHeartbeat(refs: VoiceSessionRefs): void {
    if (refs.heartbeatInterval) {
        clearInterval(refs.heartbeatInterval);
        refs.heartbeatInterval = null;
    }
}

/**
 * Get microphone stream and set up audio processing
 */
export async function setupMicrophone(
    refs: VoiceSessionRefs
): Promise<{ source: MediaStreamAudioSourceNode; processor: ScriptProcessorNode }> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = refs.audioContextIn!.createMediaStreamSource(stream);
    const processor = refs.audioContextIn!.createScriptProcessor(4096, 1, 1);

    refs.micSource = source;
    refs.processor = processor;

    return { source, processor };
}

/**
 * Connect audio processing chain
 */
export function connectAudioChain(
    source: MediaStreamAudioSourceNode,
    processor: ScriptProcessorNode,
    audioContextIn: AudioContext
): void {
    source.connect(processor);
    const silent = audioContextIn.createGain();
    silent.gain.value = 0;
    processor.connect(silent);
    silent.connect(audioContextIn.destination);
}

/**
 * Handle incoming audio from AI
 */
export async function handleIncomingAudio(
    data: string,
    refs: VoiceSessionRefs,
    setIsSpeaking: (v: boolean) => void
): Promise<void> {
    if (!refs.audioContextOut) return;

    setIsSpeaking(true);
    const bytes = decode(data);
    const buffer = await decodeAudioData(bytes, refs.audioContextOut, 24000, 1);
    const source = refs.audioContextOut.createBufferSource();
    source.buffer = buffer;
    source.connect(refs.audioContextOut.destination);

    refs.nextStartTime = Math.max(refs.nextStartTime, refs.audioContextOut.currentTime);
    source.start(refs.nextStartTime);
    refs.nextStartTime += buffer.duration;
    refs.audioSources.add(source);

    source.onended = () => {
        refs.audioSources.delete(source);
        if (refs.audioSources.size === 0) setIsSpeaking(false);
    };
}

/**
 * Create voice session with Gemini Live API
 */
export async function createVoiceSession(
    config: VoiceSessionConfig,
    context: VoiceSessionContext,
    refs: VoiceSessionRefs,
    onSessionReady: (sessionPromise: Promise<any>) => void
): Promise<void> {
    const { apiKey, voiceName = DEFAULT_VOICE } = config;
    const { setLiveStatus, addLog, addMessage, onTranscription } = context;

    addLog('INFO', 'Synchronizing with Voice Audit Core...');
    setLiveStatus(LiveStatus.CONNECTING);

    const ai = new GoogleGenAI({ apiKey });

    // Initialize audio
    initializeAudioContexts(refs);
    await resumeAudioContexts(refs);
    startHeartbeat(refs);

    // Setup microphone
    const { source, processor } = await setupMicrophone(refs);

    // Generate system instruction with current date/time
    const systemInstruction = MASTER_SYSTEM_PROMPT + generateDateContext();

    // Transcription buffer
    let transcriptionBuffer = { user: '', agent: '' };

    // Create session using VOICE_MODEL_NAME from voiceModel.ts
    const sessionPromise = ai.live.connect({
        model: VOICE_MODEL_NAME,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName }
                }
            },
            systemInstruction,
            tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
            inputAudioTranscription: {},
            outputAudioTranscription: {}
        },
        callbacks: {
            onopen: () => {
                addLog('SUCCESS', 'Voice Core: Audio link stable.');
                setLiveStatus(LiveStatus.ACTIVE);
                connectAudioChain(source, processor, refs.audioContextIn!);
            },

            onmessage: async (msg: LiveServerMessage) => {
                // Handle audio output
                const parts = msg.serverContent?.modelTurn?.parts || [];
                for (const part of parts) {
                    if (part.inlineData?.data && refs.audioContextOut) {
                        await handleIncomingAudio(part.inlineData.data, refs, context.setIsSpeaking);
                    }
                }

                // Handle tool calls
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        addLog('TOOL', `Executing Architect Tool: ${fc.name}`);

                        const res = await handleToolCall(fc.name, fc.args as Record<string, any>, {
                            files: context.files,
                            vectorStore: context.vectorStore,
                            renderPDF: context.renderPDF,
                            setIsMinimized: context.setIsMinimized
                        });

                        if (fc.name === 'get_current_datetime') {
                            addLog('INFO', `Current DateTime: ${res.date}, ${res.time} IST`);
                        }

                        sessionPromise.then(s =>
                            s.sendToolResponse({
                                functionResponses: { id: fc.id, name: fc.name, response: res as Record<string, unknown> }
                            })
                        );
                    }
                }

                // Handle transcriptions
                if (msg.serverContent?.turnComplete) {
                    if (transcriptionBuffer.user) addMessage('user', transcriptionBuffer.user);
                    if (transcriptionBuffer.agent) addMessage('assistant', transcriptionBuffer.agent);
                    onTranscription(transcriptionBuffer.user, transcriptionBuffer.agent);
                    transcriptionBuffer = { user: '', agent: '' };
                }

                if (msg.serverContent?.inputTranscription) {
                    transcriptionBuffer.user += msg.serverContent.inputTranscription.text;
                }
                if (msg.serverContent?.outputTranscription) {
                    transcriptionBuffer.agent += msg.serverContent.outputTranscription.text;
                }
            },

            onclose: (c) => {
                const reason = getCloseReason(c.code);
                addLog('INFO', `Voice Session closed. Code: ${c.code} - ${reason}`);
                if (c.code === 1008) {
                    addLog('ERROR', 'Live API access may be restricted. Verify your API key has Live API permissions at https://aistudio.google.com/apikey');
                }
            },

            onerror: (e) => {
                console.error('Voice session error:', e);
                addLog('ERROR', 'Voice connection error. Check console for details.');
            }
        }
    });

    onSessionReady(sessionPromise);
}

/**
 * Stop voice call and cleanup resources
 */
export function stopVoiceSession(refs: VoiceSessionRefs): void {
    stopHeartbeat(refs);

    // Stop all playing audio
    refs.audioSources.forEach(s => {
        try { s.stop(); } catch (e) { /* ignore */ }
    });
    refs.audioSources.clear();

    // Disconnect audio nodes
    if (refs.processor) {
        refs.processor.disconnect();
        refs.processor = null;
    }

    if (refs.micSource) {
        refs.micSource.disconnect();
        // Stop microphone stream
        const tracks = (refs.micSource as any).mediaStream?.getTracks?.();
        tracks?.forEach((t: MediaStreamTrack) => t.stop());
        refs.micSource = null;
    }

    // Close audio contexts
    refs.audioContextIn?.close().catch(() => { });
    refs.audioContextOut?.close().catch(() => { });
    refs.audioContextIn = null;
    refs.audioContextOut = null;
}

/**
 * Send realtime audio input to session (synchronous for real-time streaming)
 */
export function sendAudioInput(
    data: Float32Array,
    sessionPromise: Promise<any> | null,
    isMuted: boolean,
    liveStatus: LiveStatus
): void {
    if (isMuted || liveStatus !== LiveStatus.ACTIVE || !sessionPromise) return;

    const audioBlob = createBlob(data);
    sessionPromise.then(s => {
        try {
            s.sendRealtimeInput({ media: audioBlob });
        } catch (err) {
            /* ignore send errors */
        }
    });
}
