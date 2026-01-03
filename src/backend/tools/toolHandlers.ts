/**
 * Tool Handlers
 * Processes tool calls from Gemini Live API
 */

import { UploadedFile, ToolResponse } from '../models/types';
import { getTimeOfDayHindi, DATE_OPTIONS, TIME_OPTIONS } from './dateUtils';

/**
 * Handle list_available_assets tool call
 */
export function handleListAvailableAssets(files: UploadedFile[]): ToolResponse {
    return {
        assets: files.map(f => ({ name: f.name, url: f.url }))
    };
}

/**
 * Handle get_document_content tool call
 */
export function handleGetDocumentContent(
    url: string,
    vectorStore: Record<string, string>
): ToolResponse {
    return {
        content: vectorStore[url] || "No content found."
    };
}

/**
 * Handle get_current_datetime tool call
 */
export function handleGetCurrentDatetime(): ToolResponse {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', DATE_OPTIONS);
    const timeStr = now.toLocaleTimeString('en-IN', TIME_OPTIONS);
    const hour = now.getHours();
    const timeOfDay = getTimeOfDayHindi(hour);

    return {
        date: dateStr,
        time: timeStr,
        timezone: 'IST (Asia/Kolkata)',
        time_of_day: timeOfDay,
        iso: now.toISOString(),
        friendly: `It is ${timeStr} on ${dateStr}. Time of day: ${timeOfDay}.`
    };
}

/**
 * Tool Handler Context
 */
export interface ToolHandlerContext {
    files: UploadedFile[];
    vectorStore: Record<string, string>;
    renderPDF: (html: string, filename: string) => Promise<string>;
    setIsMinimized: (v: boolean) => void;
}

/**
 * Main tool handler - routes to appropriate function
 */
export async function handleToolCall(
    toolName: string,
    args: Record<string, any>,
    context: ToolHandlerContext
): Promise<ToolResponse> {
    switch (toolName) {
        case 'list_available_assets':
            return handleListAvailableAssets(context.files);

        case 'get_document_content':
            return handleGetDocumentContent(args.url, context.vectorStore);

        case 'generate_resume_pdf':
            context.setIsMinimized(true);
            const pdfUrl = await context.renderPDF(
                args.html,
                args.filename || "Resume.pdf"
            );
            return { status: "success", pdf_url: pdfUrl };

        case 'get_current_datetime':
            return handleGetCurrentDatetime();

        default:
            return { status: "ok" };
    }
}
