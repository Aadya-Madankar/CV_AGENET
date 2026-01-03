# CV Voice Agent - Career Architect

A voice-enabled AI career assistant powered by Gemini Live API. Get real-time resume feedback, career advice, and professional document generation through natural voice conversations.

## 🏗️ Project Structure

```
cv_voice_agent/
├── src/
│   ├── backend/              # Backend Logic
│   │   ├── models/           # Types & Prompts
│   │   │   ├── types.ts      # All TypeScript types
│   │   │   ├── prompts.ts    # AI system prompts
│   │   │   └── index.ts
│   │   ├── tools/            # Tool Definitions & Handlers
│   │   │   ├── toolDefinitions.ts  # Gemini tool schemas
│   │   │   ├── toolHandlers.ts     # Tool execution logic
│   │   │   ├── dateUtils.ts        # Date/time utilities
│   │   │   └── index.ts
│   │   ├── functions/        # Core Services
│   │   │   ├── pdfGenerator.ts     # PDF synthesis
│   │   │   ├── documentProcessor.ts # Resume extraction
│   │   │   ├── voiceSession.ts     # Gemini Live API
│   │   │   ├── n8nService.ts       # N8N webhook chat
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── frontend/             # Frontend UI
│   │   ├── components/       # React Components
│   │   │   ├── Header.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── VoiceOverlay.tsx
│   │   │   ├── LogPanel.tsx
│   │   │   └── index.ts
│   │   └── App.tsx           # Main App Component
│   │
│   ├── utils/                # Utilities
│   │   ├── audioUtils.ts     # Audio encoding/decoding
│   │   └── index.ts
│   │
│   ├── styles/               # Stylesheets
│   │   └── index.css
│   │
│   └── index.tsx             # Entry Point
│
├── index.html                # HTML Template
├── vite.config.ts            # Vite Configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript Config
└── .env                      # Environment Variables
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Gemini API Key with Live API access

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd cv_voice_agent
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Create .env file
echo "VITE_GEMINI_API_KEY=your_api_key_here" > .env
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open in browser**
```
http://localhost:3000
```

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Your Gemini API key with Live API access |

### Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Ensure it has Live API access enabled

## 🎯 Features

### Voice Conversation
- Real-time voice chat with AI career advisor
- Natural Hinglish (Hindi + English) communication
- Time-aware greetings and responses

### Resume Analysis
- Upload PDF or image resumes
- AI-powered ATS compatibility analysis
- Structured content extraction

### PDF Generation
- Professional resume templates
- ATS-optimized formatting
- One-click PDF download

### Chat Interface
- Text-based chat option
- N8N webhook integration
- File attachment support

## 🏛️ Architecture

### Backend Layer (`src/backend/`)

**Models** - Type definitions and AI prompts
- `types.ts` - All TypeScript interfaces
- `prompts.ts` - System prompts for AI behavior

**Tools** - Gemini function calling
- `toolDefinitions.ts` - Tool schemas for Gemini
- `toolHandlers.ts` - Tool execution logic
- `dateUtils.ts` - Date/time formatting

**Functions** - Core business logic
- `pdfGenerator.ts` - HTML to PDF conversion
- `documentProcessor.ts` - Resume extraction via Gemini
- `voiceSession.ts` - Gemini Live API management
- `n8nService.ts` - Webhook communication

### Frontend Layer (`src/frontend/`)

**Components** - React UI components
- `Header.tsx` - App header with call button
- `ChatPanel.tsx` - Message display
- `InputArea.tsx` - Chat input with attachments
- `VoiceOverlay.tsx` - Voice call UI
- `LogPanel.tsx` - System logs

**App.tsx** - Main orchestration component

## 🔌 API Integration

### Gemini Live API
- Real-time audio streaming
- Function calling for tools
- Transcription support

### N8N Webhook
- Text chat fallback
- External service integration
- Customizable workflows

## 📱 Responsive Design

- Desktop: Full layout with log panel
- Tablet: Collapsible log panel
- Mobile: Optimized touch interface, PiP voice window

## 🛡️ Security

- API keys stored in environment variables
- No sensitive data in client code
- Secure WebSocket connections

## 📄 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ using React, Vite, and Gemini AI
