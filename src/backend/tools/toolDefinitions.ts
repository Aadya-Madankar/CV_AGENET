/**
 * Tool Definitions for Gemini Live API
 * Contains function declarations for AI tools
 */

import { Type } from '@google/genai';

/**
 * Tool function declarations for Gemini Live API
 */
export const TOOL_DECLARATIONS = [
    {
        name: 'list_available_assets',
        description: 'Lists filenames/URLs in the current session. Run this FIRST to see what documents the user has uploaded.'
    },
    {
        name: 'get_document_content',
        description: 'Extracts deep text from a resume URL. Use this to read the actual content of an uploaded resume.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: {
                    type: Type.STRING,
                    description: 'The URL of the document to extract content from'
                }
            },
            required: ['url']
        }
    },
    {
        name: 'generate_resume_pdf',
        description: 'Converts career data HTML into a PDF document. Use when user says "bana do", "ready", "build kar", etc.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                html: {
                    type: Type.STRING,
                    description: 'Complete HTML with inline CSS for the resume'
                },
                filename: {
                    type: Type.STRING,
                    description: 'Optional filename for the PDF'
                }
            },
            required: ['html']
        }
    },
    {
        name: 'get_current_datetime',
        description: 'Gets the current date and time in IST. Use this to know what time it is right now for time-aware responses and greetings.'
    }
];
