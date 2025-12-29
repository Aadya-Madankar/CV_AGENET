# Devansh Mehta | AI Career Architect

A premium voice-enabled career consulting application powered by Google's Gemini AI. Get real-time resume audits, career advice, and ATS-optimized resume generation through natural conversation.

![Career Architect](https://img.shields.io/badge/Gemini-Powered-blue) ![Voice Enabled](https://img.shields.io/badge/Voice-Enabled-green) ![ATS Optimized](https://img.shields.io/badge/ATS-Optimized-orange)

## ✨ Features

- **🎙️ Voice Consultation** - Real-time voice conversations with AI career consultant
- **📄 Resume Audit** - Upload your resume for instant ATS analysis and scoring
- **🔍 Google Search Grounding** - Get advice backed by real-time industry data
- **📝 PDF Generation** - Generate polished, ATS-optimized resumes
- **💬 Smart Chat** - Text-based career advice with search-backed insights
- **📱 Fully Responsive** - Works seamlessly on desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- A Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/career-architect.git
cd career-architect

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Add your API key to .env
# VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Deploy to Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/career-architect&env=VITE_GEMINI_API_KEY)

### Manual Deployment

1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Add environment variable:
   - `VITE_GEMINI_API_KEY` = Your Gemini API key
4. Deploy!

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI**: Google Gemini 2.0 Flash, Gemini Live API
- **Build Tool**: Vite
- **PDF Generation**: jsPDF, html2canvas
- **Deployment**: Vercel

## 📁 Project Structure

```
├── App.tsx              # Main application component
├── index.tsx            # React entry point
├── index.html           # HTML template with CDN imports
├── index.css            # Responsive CSS utilities
├── types.ts             # TypeScript interfaces
├── vite.config.ts       # Vite configuration
├── vite-env.d.ts        # TypeScript environment types
├── utils/
│   └── audioUtils.ts    # Audio processing utilities
├── .env.example         # Environment template
└── package.json         # Dependencies
```

## 🎯 Key Features Explained

### Voice Consultation
Click "Consult Architect" to start a voice session. The AI consultant (Devansh) will:
- Check for any uploaded resumes
- Provide real-time feedback
- Gather career information through natural conversation
- Generate a polished resume when ready

### Search Grounding
Text queries use Google Search grounding to provide:
- Current industry salary trends
- In-demand skills for specific roles
- ATS best practices
- Company-specific hiring insights

### Resume Generation
Resumes are generated with:
- ATS-optimized single-column layout
- Standard section headers
- Action-verb based impact bullets
- Integrated keywords from job descriptions

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GEMINI_API_KEY` | Google Gemini API Key | Yes |

## 🔒 Security

- API keys are never exposed in client bundle
- All API calls use server-side environment variables
- HTTPS enforced in production

## 📝 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

- Built with [Google Gemini AI](https://ai.google.dev/)
- Powered by [Vite](https://vitejs.dev/)
- Deployed on [Vercel](https://vercel.com/)

---

**Built with ❤️ for career seekers everywhere**
