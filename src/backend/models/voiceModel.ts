/**
 * Voice Model Configuration
 * 
 * Model: Gemini 2.5 Flash Native Audio Preview
 * Purpose: Real-time voice conversations
 */

import { Modality } from '@google/genai';

/**
 * Voice Model Name - The ONLY model used for voice
 */
export const VOICE_MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

/**
 * Default Voice Name
 */
export const DEFAULT_VOICE = 'Achird';

/**
 * Audio Configuration
 */
export const AUDIO_CONFIG = {
    INPUT_SAMPLE_RATE: 16000,   // Microphone input
    OUTPUT_SAMPLE_RATE: 24000,  // AI audio output
    BUFFER_SIZE: 4096,
    CHANNELS: 1
} as const;

/**
 * WebSocket Close Codes
 */
const CLOSE_REASONS: Record<number, string> = {
    1000: 'Normal closure',
    1006: 'Network issue',
    1008: 'API key does not have Live API access'
};

export function getCloseReason(code: number): string {
    return CLOSE_REASONS[code] || 'Unknown';
}
