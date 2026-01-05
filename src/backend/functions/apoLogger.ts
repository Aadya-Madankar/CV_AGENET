/**
 * APO Auto-Logger Service
 * Automatically logs interactions to the Prompt Optimizer
 * 
 * This runs in the background and sends each completed conversation
 * to the APO server for analysis.
 */

const APO_SERVER_URL = 'http://localhost:8000';

interface InteractionData {
    user_input: string;
    agent_response: string;
    tools_used: string[];
    user_feedback?: string;
    context?: Record<string, any>;
}

/**
 * Send an interaction to the APO server
 */
export async function logInteractionToAPO(
    userInput: string,
    agentResponse: string,
    toolsUsed: string[] = [],
    feedback?: 'good' | 'bad',
    context?: Record<string, any>
): Promise<{ success: boolean; interaction_id?: string; error?: string }> {
    try {
        const response = await fetch(`${APO_SERVER_URL}/interaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_input: userInput,
                agent_response: agentResponse,
                tools_used: toolsUsed,
                user_feedback: feedback || null,
                context: context || {}
            })
        });

        if (!response.ok) {
            console.log('[APO] Server not running or error:', response.status);
            return { success: false, error: `HTTP ${response.status}` };
        }

        const result = await response.json();
        console.log('[APO] Interaction logged:', result.interaction_id);
        return { success: true, interaction_id: result.interaction_id };
    } catch (err) {
        // APO server not running - silently ignore
        console.log('[APO] Server not available (this is fine if not optimizing)');
        return { success: false, error: 'Server not available' };
    }
}

/**
 * Check APO server status
 */
export async function getAPOStatus(): Promise<{
    available: boolean;
    total_interactions?: number;
    ready_to_optimize?: boolean;
    current_version?: string;
}> {
    try {
        const response = await fetch(`${APO_SERVER_URL}/status`);
        if (!response.ok) {
            return { available: false };
        }
        const data = await response.json();
        return {
            available: true,
            total_interactions: data.total_interactions,
            ready_to_optimize: data.ready_to_optimize,
            current_version: data.current_prompt_version
        };
    } catch {
        return { available: false };
    }
}

/**
 * Trigger optimization (returns analysis, does NOT auto-apply)
 */
export async function triggerOptimization(): Promise<{
    success: boolean;
    analysis?: any;
    new_version?: string;
    error?: string;
}> {
    try {
        const response = await fetch(`${APO_SERVER_URL}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.detail };
        }

        const result = await response.json();
        return {
            success: true,
            analysis: result.analysis,
            new_version: result.new_version
        };
    } catch (err) {
        return { success: false, error: 'Server not available' };
    }
}

/**
 * Get the current optimized prompt (for manual review before applying)
 */
export async function getCurrentOptimizedPrompt(): Promise<{
    success: boolean;
    version?: string;
    prompt?: string;
    error?: string;
}> {
    try {
        const response = await fetch(`${APO_SERVER_URL}/current_prompt`);
        if (!response.ok) {
            return { success: false, error: 'No prompt available' };
        }
        const data = await response.json();
        return {
            success: true,
            version: data.version,
            prompt: data.prompt
        };
    } catch {
        return { success: false, error: 'Server not available' };
    }
}

export default {
    logInteractionToAPO,
    getAPOStatus,
    triggerOptimization,
    getCurrentOptimizedPrompt
};
