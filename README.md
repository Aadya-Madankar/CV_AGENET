# 🎤 Career Architect - AI Voice Resume Agent

> **Real-time voice-powered CV consulting with Gemini Live API**

A production-ready voice AI application that provides career coaching and resume optimization through natural conversation. Built with React, TypeScript, and Google's Gemini AI.

---

## ✨ Features

### 🎙️ Voice Consultation
- **Real-time voice chat** powered by Gemini 2.5 Flash Native Audio
- Natural Hindi-English (Hinglish) conversation
- Persona: **Devansh Mehta** - 11 years recruiting experience

### 📄 Document Analysis
- Upload PDF/image resumes for instant ATS analysis
- Structured extraction with zero hallucination
- Identifies issues: photos, columns, missing info

### 💬 Text Chat
- Chat interface via N8N webhook integration
- Graceful fallback handling
- Real-time logging panel

### 📊 Resume Tools
- ATS compatibility scoring
- PDF resume generation from templates
- Section-by-section updates

### ⚡ Agent Lightning (Prompt Optimization)
- **Automatic Prompt Optimization (APO)** system
- Learning from user interactions
- Version control for prompts
- Developer tool for improving AI responses

---

## 🏗️ Architecture

```
cv_voice_agent/
├── src/
│   ├── backend/
│   │   ├── functions/
│   │   │   ├── documentProcessor.ts   # Resume extraction
│   │   │   ├── n8nService.ts          # Chat via N8N
│   │   │   ├── pdfGenerator.ts        # PDF creation
│   │   │   ├── voiceSession.ts        # Gemini Live API
│   │   │   ├── apoLogger.ts           # APO interaction logging
│   │   │   └── apoService.ts          # APO frontend service
│   │   ├── models/
│   │   │   ├── prompts.ts             # AI system prompts
│   │   │   └── types.ts               # TypeScript interfaces
│   │   └── tools/
│   │       ├── toolDefinitions.ts     # Voice agent tools
│   │       └── toolHandlers.ts        # Tool execution
│   ├── frontend/
│   │   └── components/
│   │       ├── ChatPanel.tsx
│   │       ├── Header.tsx
│   │       ├── InputArea.tsx
│   │       ├── LogPanel.tsx
│   │       ├── VoiceOverlay.tsx
│   │       └── AgentLightningModal.tsx  # APO UI
│   └── styles/
│       └── index.css
│
└── agent-lightning-backend/           # Prompt Optimization Server
    ├── prompt_optimizer.py            # FastAPI server
    ├── requirements.txt
    ├── .env.example
    └── README.md
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript |
| **Voice AI** | Gemini 2.5 Flash Native Audio |
| **Document AI** | Gemini 2.5 Flash |
| **Chat Backend** | N8N Webhook |
| **Prompt Optimization** | Python FastAPI + Gemini |
| **Build** | Vite |
| **Styling** | TailwindCSS |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+ (for Agent Lightning)
- Google AI API Key with Gemini access
- (Optional) N8N webhook URL for chat

### Installation

```bash
# Clone the repository
git clone https://github.com/Aadya-Madankar/CV_AGENET.git
cd CV_AGENET

# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ⚡ Agent Lightning (Optional)

Agent Lightning is a prompt optimization system for developers. It analyzes user interactions and generates improved prompts.

### Setup

```bash
# Navigate to Agent Lightning
cd agent-lightning-backend

# Install Python dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Start the server
python prompt_optimizer.py
```

### Usage

1. Start both servers (frontend + Agent Lightning)
2. Use the app normally - interactions are automatically logged
3. Click **"Improve"** button to open the optimization dashboard
4. Generate new prompt versions and apply them

> **Note:** Agent Lightning only works on localhost. On production (Vercel), it shows instructions to run locally.

See [agent-lightning-backend/README.md](agent-lightning-backend/README.md) for full documentation.

---

## 💡 Usage

### Voice Consultation
1. Click **"Consult Architect"** in the header
2. Allow microphone access when prompted
3. Speak naturally - the AI responds in voice
4. Click **"End Session"** to disconnect

### Document Upload
1. Click the **+** button in the input area
2. Select **"Upload Resume"** for PDF/image files
3. Wait for **"Deep Audit"** to complete
4. View extracted content and ATS analysis

### Text Chat
1. Type your message in the input field
2. Press Enter or click send
3. AI responds via N8N integration

---

## 🎯 AI Models Used

| Model | Purpose | File |
|-------|---------|------|
| `gemini-2.5-flash-native-audio-preview` | Real-time voice | `voiceModel.ts` |
| `gemini-2.5-flash` | Document processing & APO | `documentModel.ts` |

---

## 📝 System Prompts

### Voice Agent (Devansh Mehta)
- Senior Recruiter persona with 11 years experience
- Hindi-English mixed language support
- Direct, actionable career advice
- Time-aware greetings
- Version controlled via Agent Lightning

### Document Extractor
- Zero hallucination extraction
- Resume vs non-resume classification
- ATS compatibility analysis
- Structured JSON output

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google AI API key | Yes |
| `VITE_N8N_WEBHOOK_URL` | N8N webhook for chat | No |
| `GEMINI_API_KEY` | For Agent Lightning (in agent-lightning-backend/.env) | For APO |

---

## 📦 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👩‍💻 Author

**Aadya Madankar**

- GitHub: [@Aadya-Madankar](https://github.com/Aadya-Madankar)

---

## 🙏 Acknowledgments

- Google Gemini AI Team for the Live API
- N8N for workflow automation
- React & Vite communities
