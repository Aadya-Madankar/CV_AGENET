/**
 * Document Processor Service
 * Handles resume extraction and vector store management
 */

import { GoogleGenAI } from '@google/genai';
import {
    UploadedFile,
    LiveStatus,
    DocumentProcessResult,
    DocumentProcessorContext
} from '../models/types';
import { RESUME_EXTRACTION_PROMPT } from '../models/prompts';
import { DEFAULT_DOCUMENT_MODEL } from '../models/documentModel';

/**
 * Process a file and extract resume content using Gemini
 */
export async function processDocument(
    fileData: string,
    mimeType: string,
    fileName: string,
    context: DocumentProcessorContext
): Promise<DocumentProcessResult> {
    const {
        apiKey,
        vectorStore,
        filesRef,
        liveStatus,
        sessionPromise,
        onLog,
        onAddMessage,
        onFilesUpdate
    } = context;

    onLog('INFO', `Deep Audit starting: ${fileName}`);
    onLog('INFO', `File type: ${mimeType}, Size: ${Math.round(fileData.length / 1024)}KB`);

    const ai = new GoogleGenAI({ apiKey });

    try {
        // Use document model from chatModel.ts for processing
        const result = await ai.models.generateContent({
            model: DEFAULT_DOCUMENT_MODEL,
            contents: {
                parts: [
                    { text: RESUME_EXTRACTION_PROMPT },
                    { inlineData: { mimeType, data: fileData } }
                ]
            }
        });

        const content = result.text || "";
        const url = `res://asset-${Date.now()}`;
        vectorStore[url] = content;

        const newFile: UploadedFile = { name: fileName, url, type: mimeType, content };
        const updatedFiles = [...filesRef, newFile];
        onFilesUpdate(updatedFiles);

        onLog('SUCCESS', `Deep Audit Complete: ${fileName}`);
        onAddMessage('assistant', `"${fileName}" ka audit ho gaya. Content extract ho gaya hai.`);
        onAddMessage('user', `Audit Target: ${fileName}`, [url]);

        // Notify live session if active
        if (liveStatus === LiveStatus.ACTIVE && sessionPromise) {
            sessionPromise.then(s => {
                s.sendRealtimeInput({
                    text: `[SYSTEM: Resume "${fileName}" uploaded and analyzed. Here is the extracted content:\n\n${content}\n\nUse this ACTUAL extracted content to give feedback. DO NOT make up content that is not in the extraction above.]`
                });
            });
        }

        return { url, content, fileName, success: true };
    } catch (err: any) {
        const errorMsg = err?.message || err?.toString() || 'Unknown error';
        console.error('Asset audit error:', err);
        onLog('ERROR', `Asset audit failed: ${errorMsg}`);
        return { url: '', content: '', fileName, success: false, error: errorMsg };
    }
}

/**
 * Fetch and process a remote document from URL
 */
export async function processRemoteDocument(
    remoteUrl: string,
    context: DocumentProcessorContext,
    blobToBase64: (blob: Blob) => Promise<string>
): Promise<DocumentProcessResult> {
    context.onLog('INFO', `Connecting to remote career asset...`);

    try {
        const res = await fetch(remoteUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const base64 = await blobToBase64(blob);
        const name = remoteUrl.split('/').pop()?.split('?')[0] || "Remote Asset";

        return await processDocument(base64, blob.type, name, context);
    } catch (err: any) {
        context.onLog('ERROR', `Remote asset unreachable: ${err?.message}`);
        return {
            url: '',
            content: '',
            fileName: 'Remote Asset',
            success: false,
            error: err?.message
        };
    }
}
