# 🔥 Agent Lightning - Real-time Prompt Optimization

**Automatic Prompt Optimization (APO) for AI Voice Agents**

Agent Lightning is a lightweight, Windows-compatible prompt optimization system that uses Gemini AI to automatically improve your agent's system prompts based on real user interactions.

---

## ✨ Features

- **Real-time Interaction Logging** - Automatically capture user-agent conversations
- **Smart Prompt Optimization** - AI-powered prompt improvements using Gemini 2.5 Flash
- **Version Control** - Track all prompt versions (v0, v1, v2, etc.)
- **One-Click Apply** - Apply any version to your production code instantly
- **Safe Rollback** - Revert to original prompt anytime
- **Template Preservation** - Smart split keeps HTML/CSS templates intact during optimization
- **Frontend Dashboard** - Visual metrics and version management

---

## 🏗️ Architecture

```
agent-lightning-backend/
├── prompt_optimizer.py    # Main FastAPI server (APO endpoints)
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variable template
├── .gitignore            # Git ignore rules
├── apo_data/             # Data storage (auto-created)
│   ├── interactions.json # Logged user-agent interactions
│   └── prompts.json      # All prompt versions
└── README.md             # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd agent-lightning-backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env
copy .env.example .env

# Edit .env and add your Gemini API key
GEMINI_API_KEY=your_api_key_here
```

### 3. Start the Server

```bash
python prompt_optimizer.py
```

Server runs at: `http://localhost:8000`

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check & API info |
| `/stats` | GET | Dashboard metrics (interactions, versions) |
| `/interaction` | POST | Log a new user-agent interaction |
| `/optimize` | POST | Generate optimized prompt version |
| `/prompts` | GET | List all prompt versions |
| `/current_prompt` | GET | Get currently active prompt |
| `/apply_version/{version}` | POST | Apply specific version to prompts.ts |
| `/set_original_prompt` | POST | Set the original/base prompt (v0) |

---

## 📊 Dashboard Metrics

The `/stats` endpoint returns:

```json
{
  "total_interactions": 12,
  "good_count": 8,
  "bad_count": 2,
  "neutral_count": 2,
  "prompt_versions": 3,
  "current_version": "v2"
}
```

---

## 🔄 Optimization Flow

```
1. User talks to AI agent
         ↓
2. Interaction logged to APO
         ↓
3. User rates (good/bad) or auto-analyzed
         ↓
4. Click "Improve Prompt" in UI
         ↓
5. Gemini analyzes patterns:
   - What worked well?
   - What needs fixing?
         ↓
6. New optimized version generated
         ↓
7. Apply to prompts.ts with one click
```

---

## 🛡️ Smart Split Technology

Agent Lightning uses **Smart Split** to preserve critical parts of your prompt:

**What gets optimized:**
- Critical Rules
- Identity section
- Context handling
- Conversation flow

**What stays untouched:**
- HTML/CSS templates
- Tool definitions
- Code examples
- Static formatting

This ensures your resume templates and tools never break during optimization.

---

## 🎨 Frontend Integration

### React Component (AgentLightningModal.tsx)

The frontend includes a modal component that:
- Shows real-time stats (interactions, good/bad counts)
- Displays all prompt versions in a dropdown
- Allows one-click version switching
- Triggers new optimization runs
- Shows optimization results and improvements

### Header Button

An "Improve" button in the app header opens the Agent Lightning modal.

---

## 📝 Version Tracking

Each prompt version includes:

```json
{
  "version": "v2",
  "prompt": "...",
  "created_at": "2026-01-05T14:00:00",
  "source": "optimized",
  "parent_version": "v0",
  "metrics": {
    "interactions_analyzed": 12
  }
}
```

**Source types:**
- `original` - The initial prompt (v0)
- `optimized` - AI-generated improvements
- `manual` - User-edited versions

---

## 🔐 Security

- CORS enabled for localhost:3000 (frontend)
- No external data transmission
- All data stored locally in `apo_data/`
- API key stored in environment variables

---

## 📁 Data Files

### interactions.json
Stores all logged conversations:
```json
[
  {
    "id": "int_1_20260105120000",
    "timestamp": "2026-01-05T12:00:00",
    "user_input": "Resume bana do",
    "agent_response": "Bana raha hoon...",
    "tools_used": ["generate_resume_pdf"],
    "user_feedback": "good"
  }
]
```

### prompts.json
Stores all prompt versions:
```json
[
  {
    "version": "v0",
    "prompt": "# Original prompt...",
    "source": "original"
  },
  {
    "version": "v1",
    "prompt": "# Optimized prompt...",
    "source": "optimized"
  }
]
```

---

## 🧪 Testing

```bash
# Check server status
curl http://localhost:8000/

# Get stats
curl http://localhost:8000/stats

# List versions
curl http://localhost:8000/prompts
```

---

## 📦 Requirements

- Python 3.10+
- Gemini API Key (with gemini-2.5-flash access)
- FastAPI & Uvicorn
- google-genai package

---

## 🤝 Integration with CV Voice Agent

Agent Lightning is designed to work with the CV Voice Agent project:

1. **Frontend** (`src/frontend/components/AgentLightningModal.tsx`)
2. **Service** (`src/backend/functions/apoService.ts`)
3. **Voice Session** (`src/backend/functions/voiceSession.ts`) - APO logging
4. **Prompts** (`src/backend/models/prompts.ts`) - Version tracking header

---

## 📄 License

Part of the CV Voice Agent project.

---

Built with ⚡ by Agent Lightning
