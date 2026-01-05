"""
═══════════════════════════════════════════════════════════════════════════════
Agent Lightning - Automatic Prompt Optimization (APO) Server
═══════════════════════════════════════════════════════════════════════════════

A lightweight, Windows-compatible prompt optimization system that uses Gemini AI
to automatically improve your agent's system prompts based on real interactions.

Features:
- Real-time interaction logging
- AI-powered prompt optimization (Smart Split)
- Version control for prompts
- One-click apply to production
- Safe rollback to any version

Usage:
    python prompt_optimizer.py

API Docs:
    http://localhost:8000/docs

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import re
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict, field

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from google import genai
from google.genai import types

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

load_dotenv()

# API Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
OPTIMIZATION_MODEL = os.getenv("OPTIMIZATION_MODEL", "gemini-2.5-flash")
MIN_INTERACTIONS_DEFAULT = int(os.getenv("MIN_INTERACTIONS", "3"))

# Initialize Gemini client
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Storage paths
DATA_DIR = Path(__file__).parent / "apo_data"
DATA_DIR.mkdir(exist_ok=True)
INTERACTIONS_FILE = DATA_DIR / "interactions.json"
PROMPTS_FILE = DATA_DIR / "prompts.json"

# Path to prompts.ts (relative to this file)
PROMPTS_TS_PATH = Path(__file__).parent.parent / "src" / "backend" / "models" / "prompts.ts"

# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="Agent Lightning",
    description="Automatic Prompt Optimization for AI Voice Agents",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Interaction:
    """A single user-agent interaction for analysis."""
    id: str
    timestamp: str
    user_input: str
    agent_response: str
    tools_used: List[str] = field(default_factory=list)
    user_feedback: Optional[str] = None  # "good", "bad", or None
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptVersion:
    """A version of the system prompt."""
    version: str
    prompt: str
    created_at: str
    source: str  # "original", "optimized", "manual"
    parent_version: Optional[str] = None
    metrics: Dict[str, float] = field(default_factory=dict)


# Pydantic models for API requests
class InteractionRequest(BaseModel):
    user_input: str
    agent_response: str
    tools_used: List[str] = []
    user_feedback: Optional[str] = None
    context: dict = {}


class FeedbackRequest(BaseModel):
    feedback: str  # "good" or "bad"


class OptimizeRequest(BaseModel):
    min_interactions: int = MIN_INTERACTIONS_DEFAULT


class SetPromptRequest(BaseModel):
    prompt: str


# ═══════════════════════════════════════════════════════════════════════════════
# STORAGE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def load_interactions() -> List[Interaction]:
    """Load all stored interactions from disk."""
    if not INTERACTIONS_FILE.exists():
        return []
    with open(INTERACTIONS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [Interaction(**item) for item in data]


def save_interactions(interactions: List[Interaction]) -> None:
    """Save interactions to disk."""
    with open(INTERACTIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump([asdict(i) for i in interactions], f, indent=2, ensure_ascii=False)


def load_prompts() -> List[PromptVersion]:
    """Load all prompt versions from disk."""
    if not PROMPTS_FILE.exists():
        return []
    with open(PROMPTS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return [PromptVersion(**item) for item in data]


def save_prompts(prompts: List[PromptVersion]) -> None:
    """Save prompts to disk."""
    with open(PROMPTS_FILE, 'w', encoding='utf-8') as f:
        json.dump([asdict(p) for p in prompts], f, indent=2, ensure_ascii=False)


def get_current_prompt() -> Optional[PromptVersion]:
    """Get the latest/active prompt version."""
    prompts = load_prompts()
    if not prompts:
        return None
    # Prefer latest optimized, fallback to latest overall
    optimized = [p for p in prompts if p.source == "optimized"]
    return optimized[-1] if optimized else prompts[-1]


# ═══════════════════════════════════════════════════════════════════════════════
# PROMPT FILE UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

def update_prompts_ts(prompt: str, version: str, source: str) -> None:
    """
    Write a prompt version to prompts.ts file.
    Updates both the version header and the MASTER_SYSTEM_PROMPT content.
    """
    if not PROMPTS_TS_PATH.exists():
        raise FileNotFoundError(f"prompts.ts not found at {PROMPTS_TS_PATH}")
    
    with open(PROMPTS_TS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Update version header
    version_label = f"{version} (Original)" if source == "original" else f"{version} (Optimized)"
    timestamp = datetime.now().isoformat()
    
    content = re.sub(r'\* PROMPT VERSION: .*', f'* PROMPT VERSION: {version_label}', content)
    content = re.sub(r'\* LAST UPDATED: .*', f'* LAST UPDATED: {timestamp}', content)
    content = re.sub(r'\* SOURCE: .*', f'* SOURCE: {source}', content)
    
    # Find and replace MASTER_SYSTEM_PROMPT
    start_marker = "export const MASTER_SYSTEM_PROMPT = `"
    end_marker = "`;\n\n/**\n * Resume Extraction"
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError("Could not find MASTER_SYSTEM_PROMPT in prompts.ts")
    
    # Escape for template literal
    escaped = prompt.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    
    # Build new content
    new_content = (
        content[:start_idx] +
        f"export const MASTER_SYSTEM_PROMPT = `{escaped}`;\n\n/**\n * Resume Extraction" +
        content[end_idx + len(end_marker):]
    )
    
    with open(PROMPTS_TS_PATH, 'w', encoding='utf-8') as f:
        f.write(new_content)


# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION ENGINE (Smart Split)
# ═══════════════════════════════════════════════════════════════════════════════

async def optimize_prompt(current_prompt: str, interactions: List[Interaction]) -> Dict[str, Any]:
    """
    Optimize the prompt using Gemini AI with Smart Split technology.
    
    Smart Split:
    - Separates prompt into "logic" (rules, identity) and "static" (templates, tools)
    - Only optimizes the logic part
    - Preserves static parts (HTML templates, tool definitions)
    - Merges back together
    """
    if not client:
        raise RuntimeError("Gemini API key not configured")
    
    # SMART SPLIT: Separate logic from static content
    split_marker = "## TOOLS"
    if split_marker in current_prompt:
        parts = current_prompt.split(split_marker)
        logic_part = parts[0]
        static_part = split_marker + "".join(parts[1:])
    else:
        logic_part = current_prompt
        static_part = ""
    
    # Gather examples
    good_examples = [i for i in interactions if i.user_feedback == "good"][-5:]
    bad_examples = [i for i in interactions if i.user_feedback == "bad"][-5:]
    
    # Build optimization prompt
    optimization_prompt = f"""You are an expert prompt engineer. Analyze these interactions and optimize the RULES/LOGIC section of a voice agent prompt.

## CURRENT RULES & IDENTITY:
{logic_part}

## GOOD INTERACTIONS (what worked):
{json.dumps([{"user": i.user_input, "agent": i.agent_response[:200]} for i in good_examples], indent=2)}

## BAD INTERACTIONS (what failed):
{json.dumps([{"user": i.user_input, "agent": i.agent_response[:200]} for i in bad_examples], indent=2)}

## YOUR TASK:
1. Optimize the "CRITICAL RULES", "IDENTITY", and "CONTEXT" sections
2. Fix patterns that led to bad interactions
3. Reinforce patterns that led to good interactions
4. Keep the same structure and formatting style
5. DO NOT include any HTML templates or Tool definitions (they are handled separately)

Output JSON:
{{
    "analysis": {{
        "improvements": ["list of improvements made"],
        "good_patterns": ["patterns that worked well"],
        "bad_patterns": ["patterns that were fixed"]
    }},
    "optimized_logic": "THE OPTIMIZED TOP SECTION OF THE PROMPT"
}}"""

    # Call Gemini
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=OPTIMIZATION_MODEL,
        contents=optimization_prompt,
        config=types.GenerateContentConfig(response_mime_type="application/json")
    )
    
    result = json.loads(response.text)
    new_logic = result["optimized_logic"]
    
    # MERGE: Combine optimized logic with preserved static content
    final_prompt = f"{new_logic.strip()}\n\n{static_part.strip()}"
    
    return {
        "analysis": result["analysis"],
        "optimized_prompt": final_prompt
    }


# ═══════════════════════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """Health check and API information."""
    return {
        "service": "Agent Lightning",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/stats")
async def get_stats():
    """Get dashboard statistics."""
    interactions = load_interactions()
    prompts = load_prompts()
    current = get_current_prompt()
    
    good_count = sum(1 for i in interactions if i.user_feedback == "good")
    bad_count = sum(1 for i in interactions if i.user_feedback == "bad")
    
    return {
        "total_interactions": len(interactions),
        "good_count": good_count,
        "bad_count": bad_count,
        "neutral_count": len(interactions) - good_count - bad_count,
        "prompt_versions": len(prompts),
        "current_version": current.version if current else "none"
    }


@app.post("/interaction")
async def log_interaction(request: InteractionRequest):
    """Log a new user-agent interaction."""
    interactions = load_interactions()
    
    interaction = Interaction(
        id=f"int_{len(interactions)+1}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        timestamp=datetime.now().isoformat(),
        user_input=request.user_input,
        agent_response=request.agent_response,
        tools_used=request.tools_used,
        user_feedback=request.user_feedback,
        context=request.context
    )
    
    interactions.append(interaction)
    save_interactions(interactions)
    
    return {
        "success": True,
        "interaction_id": interaction.id,
        "total_interactions": len(interactions)
    }


@app.post("/rate/{interaction_id}")
async def rate_interaction(interaction_id: str, request: FeedbackRequest):
    """Rate a specific interaction as good or bad."""
    if request.feedback not in ["good", "bad"]:
        raise HTTPException(400, "Feedback must be 'good' or 'bad'")
    
    interactions = load_interactions()
    
    for i in interactions:
        if i.id == interaction_id:
            i.user_feedback = request.feedback
            save_interactions(interactions)
            return {"success": True, "updated": interaction_id}
    
    raise HTTPException(404, f"Interaction {interaction_id} not found")


@app.post("/optimize")
async def run_optimization(request: OptimizeRequest = OptimizeRequest()):
    """Generate an optimized prompt version using Smart Split."""
    if not client:
        raise HTTPException(500, "Gemini API key not configured")
    
    interactions = load_interactions()
    
    if len(interactions) < request.min_interactions:
        raise HTTPException(
            400,
            f"Need at least {request.min_interactions} interactions. Current: {len(interactions)}"
        )
    
    current = get_current_prompt()
    if not current:
        raise HTTPException(404, "No base prompt found. Set original prompt first.")
    
    try:
        result = await optimize_prompt(current.prompt, interactions)
        
        # Save new version
        prompts = load_prompts()
        new_version = PromptVersion(
            version=f"v{len(prompts)}",
            prompt=result["optimized_prompt"],
            created_at=datetime.now().isoformat(),
            source="optimized",
            parent_version=current.version,
            metrics={"interactions_analyzed": len(interactions)}
        )
        prompts.append(new_version)
        save_prompts(prompts)
        
        return {
            "success": True,
            "analysis": result["analysis"],
            "new_version": new_version.version,
            "prompt_preview": result["optimized_prompt"][:500] + "..."
        }
        
    except Exception as e:
        raise HTTPException(500, f"Optimization failed: {str(e)}")


@app.get("/prompts")
async def list_prompts():
    """Get all prompt versions."""
    prompts = load_prompts()
    return {
        "total": len(prompts),
        "prompts": [
            {
                "version": p.version,
                "source": p.source,
                "created_at": p.created_at,
                "preview": p.prompt[:200] + "..." if len(p.prompt) > 200 else p.prompt
            }
            for p in prompts
        ]
    }


@app.get("/current_prompt")
async def get_current():
    """Get the currently active prompt."""
    current = get_current_prompt()
    if not current:
        raise HTTPException(404, "No prompts stored yet")
    
    return {
        "version": current.version,
        "source": current.source,
        "created_at": current.created_at,
        "prompt": current.prompt
    }


@app.post("/set_original_prompt")
async def set_original(request: SetPromptRequest):
    """Set the original/base prompt (v0)."""
    prompts = load_prompts()
    
    if any(p.source == "original" for p in prompts):
        raise HTTPException(400, "Original prompt already set")
    
    original = PromptVersion(
        version="v0",
        prompt=request.prompt,
        created_at=datetime.now().isoformat(),
        source="original"
    )
    prompts.insert(0, original)
    save_prompts(prompts)
    
    return {"success": True, "version": "v0"}


@app.post("/apply_version/{version}")
async def apply_version(version: str):
    """Apply a specific prompt version to prompts.ts."""
    prompts = load_prompts()
    
    target = next((p for p in prompts if p.version == version), None)
    if not target:
        raise HTTPException(404, f"Version {version} not found")
    
    try:
        update_prompts_ts(target.prompt, version, target.source)
        
        return {
            "success": True,
            "message": f"Applied prompt version {version}",
            "version_applied": version,
            "source": target.source
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to apply version: {str(e)}")


@app.get("/interactions")
async def list_interactions():
    """Get all logged interactions."""
    interactions = load_interactions()
    return {
        "total": len(interactions),
        "interactions": [
            {
                "id": i.id,
                "timestamp": i.timestamp,
                "user_input": i.user_input[:100] + "..." if len(i.user_input) > 100 else i.user_input,
                "tools_used": i.tools_used,
                "feedback": i.user_feedback
            }
            for i in interactions
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("Agent Lightning - Automatic Prompt Optimization")
    print("=" * 60)
    print(f"Data directory: {DATA_DIR}")
    print(f"Target file: {PROMPTS_TS_PATH}")
    print(f"Model: {OPTIMIZATION_MODEL}")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)

