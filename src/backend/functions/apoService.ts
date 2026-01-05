/**
 * Agent Lightning (APO) Service
 * Handles communication with the APO backend for prompt optimization
 */

const APO_BASE_URL = 'http://localhost:8000';

export interface OptimizationResult {
    success: boolean;
    analysis?: {
        improvements?: string[];
        good_patterns?: string[];
        bad_patterns?: string[];
    };
    new_version?: string;
    prompt_preview?: string;
    error?: string;
}

export interface APOStats {
    total_interactions: number;
    good_count: number;
    bad_count: number;
    neutral_count: number;
    prompt_versions: number;
    current_version: string;
}

export interface PromptVersion {
    version: string;
    prompt: string;
    created_at: string;
    source: string;
    parent_version?: string;
    metrics?: Record<string, any>;
}

/**
 * Get APO statistics
 */
export async function getAPOStats(): Promise<APOStats | null> {
    try {
        const response = await fetch(`${APO_BASE_URL}/stats`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error('Failed to get APO stats:', err);
        return null;
    }
}

/**
 * Get current prompt from APO
 */
export async function getCurrentPrompt(): Promise<PromptVersion | null> {
    try {
        const response = await fetch(`${APO_BASE_URL}/current_prompt`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error('Failed to get current prompt:', err);
        return null;
    }
}

/**
 * Trigger prompt optimization
 */
export async function triggerOptimization(minInteractions: number = 3): Promise<OptimizationResult> {
    try {
        const response = await fetch(`${APO_BASE_URL}/optimize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ min_interactions: minInteractions })
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, error: error.detail || 'Optimization failed' };
        }

        const result = await response.json();
        return {
            success: true,
            analysis: result.analysis,
            new_version: result.new_version,
            prompt_preview: result.prompt_preview
        };
    } catch (err: any) {
        console.error('Optimization error:', err);
        return { success: false, error: err.message || 'Failed to connect to APO server' };
    }
}

/**
 * Rate an interaction
 */
export async function rateInteraction(interactionId: string, feedback: 'good' | 'bad'): Promise<boolean> {
    try {
        const response = await fetch(`${APO_BASE_URL}/rate/${interactionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedback })
        });
        return response.ok;
    } catch (err) {
        console.error('Failed to rate interaction:', err);
        return false;
    }
}

/**
 * Get all prompt versions
 */
export async function getPromptVersions(): Promise<PromptVersion[]> {
    try {
        const response = await fetch(`${APO_BASE_URL}/prompts`);
        if (!response.ok) return [];
        const data = await response.json();
        // API returns { total, prompts: [...] }
        return data.prompts || [];
    } catch (err) {
        console.error('Failed to get prompt versions:', err);
        return [];
    }
}

/**
 * Apply optimized prompt to the system (writes to prompts.ts)
 */
export async function applyOptimizedPrompt(): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${APO_BASE_URL}/apply_prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, message: error.detail || 'Failed to apply prompt' };
        }

        const result = await response.json();
        return { success: true, message: result.message || 'Prompt applied successfully' };
    } catch (err: any) {
        console.error('Apply prompt error:', err);
        return { success: false, message: err.message || 'Failed to connect to APO server' };
    }
}

/**
 * Revert to original prompt (v0)
 */
export async function revertToOriginal(): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${APO_BASE_URL}/apply_version/v0`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, message: error.detail || 'Failed to revert' };
        }

        const result = await response.json();
        return { success: true, message: result.message || 'Reverted to original prompt' };
    } catch (err: any) {
        console.error('Revert error:', err);
        return { success: false, message: err.message || 'Failed to connect to APO server' };
    }
}

/**
 * Apply a specific prompt version
 */
export async function applyVersion(version: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await fetch(`${APO_BASE_URL}/apply_version/${version}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            return { success: false, message: error.detail || 'Failed to apply version' };
        }

        const result = await response.json();
        return { success: true, message: result.message || `Applied version ${version}` };
    } catch (err: any) {
        console.error('Apply version error:', err);
        return { success: false, message: err.message || 'Failed to connect to APO server' };
    }
}
