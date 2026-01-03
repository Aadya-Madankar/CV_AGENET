/**
 * N8N Webhook Service
 * Handles chat communication with N8N backend
 */

import { N8NChatRequest, N8NChatResponse, UploadedFile } from '../models/types';
import { formatCurrentDate } from '../tools/dateUtils';

/**
 * Default N8N webhook URL
 */
export const N8N_WEBHOOK_URL = 'https://n8n-0.nudgit.ai/webhook/b2599ee9-6730-49d0-a58f-ac4a67e265ed';

/**
 * Build asset context string from files
 */
export function buildAssetContext(
    files: UploadedFile[],
    vectorStore: Record<string, string>
): string {
    return files
        .map(f => `DOCUMENT [${f.name}]: ${vectorStore[f.url] || ''}`)
        .join('\n\n');
}

/**
 * Parse N8N response - handles different response formats
 */
export function parseN8NResponse(data: any): string {
    if (typeof data === 'string') return data;
    if (data.output) return data.output;
    if (data.message) return data.message;
    if (data.response) return data.response;
    if (data.text) return data.text;
    return JSON.stringify(data);
}

/**
 * Send chat message to N8N webhook
 */
export async function sendChatMessage(
    message: string,
    files: UploadedFile[],
    vectorStore: Record<string, string>,
    webhookUrl: string = N8N_WEBHOOK_URL
): Promise<N8NChatResponse> {
    const assetContext = buildAssetContext(files, vectorStore);

    const request: N8NChatRequest = {
        message,
        context: assetContext,
        sessionId: 'cv_voice_agent_' + Date.now(),
        currentDateTime: new Date().toISOString(),
        currentDate: formatCurrentDate()
    };

    try {
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            throw new Error(`N8N request failed: ${response.status}`);
        }

        const data = await response.json();
        const text = parseN8NResponse(data);

        return { text, success: true };
    } catch (err: any) {
        return {
            text: "Pardon me, had a minor glitch connecting to the server. What were we saying about your career?",
            success: false,
            error: err?.message || 'Unknown error'
        };
    }
}
