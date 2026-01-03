/**
 * Document Model Configuration
 * 
 * Model: Gemini 2.5 Flash
 * Purpose: Resume extraction, PDF generation, URL reading
 * 
 * NOTE: Chat is handled by N8N, not this model
 */

/**
 * Document Model Name - The ONLY model used for document processing
 */
export const DEFAULT_DOCUMENT_MODEL = 'gemini-2.5-flash';

/**
 * Supported File Types
 */
export const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
] as const;

/**
 * Check if file type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
    return SUPPORTED_MIME_TYPES.includes(mimeType as any);
}
