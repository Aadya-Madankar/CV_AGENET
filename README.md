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

---

## 🏗️ Architecture

```
src/
├── backend/
│   ├── functions/
│   │   ├── documentProcessor.ts   # Resume extraction (Gemini Flash)
│   │   ├── n8nService.ts          # Chat via N8N webhook
│   │   ├── pdfGenerator.ts        # PDF creation
│   │   └── voiceSession.ts        # Gemini Live API voice
│   ├── models/
│   │   ├── voiceModel.ts          # Voice model config
│   │   ├── documentModel.ts       # Document model config
│   │   ├── prompts.ts             # AI system prompts
│   │   └── types.ts               # TypeScript interfaces
│   └── tools/
│       ├── toolDefinitions.ts     # Voice agent tools
│       └── toolHandlers.ts        # Tool execution logic
├── frontend/
│   └── components/
│       ├── ChatPanel.tsx          # Message display
│       ├── Header.tsx             # App header
│       ├── InputArea.tsx          # Input controls
│       ├── LogPanel.tsx           # Real-time logs
│       └── VoiceOverlay.tsx       # Voice call UI
├── styles/
│   └── index.css                  # Global styles
└── utils/
    └── audioUtils.ts              # Audio processing helpers
```

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript |
| **Voice AI** | Gemini 2.5 Flash Native Audio Preview |
| **Document AI** | Gemini 2.5 Flash |
| **Chat Backend** | N8N Webhook |
| **Build** | Vite |
| **Styling** | Vanilla CSS |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Google AI API Key with Gemini Live API access
- (Optional) N8N webhook URL for chat

### Installation

```bash
# Clone the repository
git clone https://github.com/Aadya-Madankar/CV_AGENET.git
cd CV_AGENET

# Install dependencies
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
| `gemini-2.5-flash-native-audio-preview-12-2025` | Real-time voice | `voiceModel.ts` |
| `gemini-2.5-flash` | Document processing | `documentModel.ts` |

---

## 📝 System Prompts

### Voice Agent (Devansh Mehta)
- Senior Recruiter persona with 11 years experience
- Hindi-English mixed language support
- Direct, actionable career advice
- Time-aware greetings

### Document Extractor
- Zero hallucination extraction
- Resume vs non-resume classification
- ATS compatibility analysis
- Structured JSON output

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google AI API key with Gemini access | Yes |
| `VITE_N8N_WEBHOOK_URL` | N8N webhook for chat (optional) | No |

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
