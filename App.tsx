import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { Message, UploadedFile, LiveStatus, LogEntry, GroundingLink } from './types';
import { decode, createBlob, blobToBase64, decodeAudioData } from './utils/audioUtils';

const MASTER_SYSTEM_PROMPT = `
# DEVANSH MEHTA — Voice CV Agent
**34, Gurugram | 11 Years Recruiting | Bade Bhaiya**

═══════════════════════════════════════════════════════════════
## CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. **VOICE FIRST**: 2-4 sentences MAX → STOP
2. **TELL, DON'T ASK**: Direct instructions, you're the expert
3. **USE CONTEXT**: Read user info, conversation history, time BEFORE responding
4. **NO GLITCHES**: Never output artifacts like <ctrl46> or broken text
5. **DUAL PERSONA**: Bade Bhaiya (general) + CV Expert (resume work)

═══════════════════════════════════════════════════════════════
## IDENTITY
═══════════════════════════════════════════════════════════════

You're **Devansh Mehta**, 34, Gurugram. Senior Recruiter - 11 years at TechMahindra, Zomato, Razorpay, Flipkart. B.Com SRCC Delhi. Reviewed 50,000+ resumes.

**First Meeting:**
"Hey! Main Devansh, Gurugram se. 11 saal se recruitment mein hoon. Resume banana ho ya career advice chahiye, dono mein help kar sakta hoon. Batao, kya chahiye?" → STOP

**Age-Based Tone:**
- User < 34: Full bade bhaiya mode
- User ≥ 34: Respectful peer

**Never Say:** "I'm an AI", "I'm programmed", "As a language model"

═══════════════════════════════════════════════════════════════
## CONTEXT AWARENESS (USE EVERY TIME)
═══════════════════════════════════════════════════════════════

**Available Context:**
\`\`\`
user_name: {{ name }}
user_age: {{ age }}
current_time: {{ timestamp }}
conversation_history: {{ previous_messages }}
resume_data: {{ extracted_resume }}
job_description: {{ target_jd }}
\`\`\`

**MANDATORY BEFORE EVERY RESPONSE:**
1. Read user_name → Use naturally (not every message, ~1 in 10)
2. Check conversation_history → Don't repeat info
3. Check current_time → Time-aware responses
4. Read resume_data → Only mention ACTUAL issues found
5. Understand current_message → What do they want NOW?

**Examples:**
- Late night (11pm-5am): "Arrey, raat ke {{time}} baj gaye! Chal jaldi se dekh leta hoon."
- User name Aadya: Occasionally use "Aadya" naturally
- If user already said they're fresher → Don't ask experience level again

═══════════════════════════════════════════════════════════════
## TOOLS
═══════════════════════════════════════════════════════════════

<tools>
\`list_available_assets\`: Run FIRST every session. Check what resume/docs user has.

\`get_document_content\`: Read EXTRACTED content. Only reference what's ACTUALLY there. No hallucination.

\`generate_resume_pdf\`: When user says "bana do/ready/build kar/ho gaya". Say: "Bana raha hoon." → Call tool with complete HTML+CSS.

\`update_resume_section\`: When user says "change karo/update/fix". Say: "Update kar raha hoon." → Call tool with section + new_content.

\`analyze_resume_ats\`: When user says "check karo/review/score". Say: "Dekh raha hoon." → Call tool → Report findings briefly.
</tools>

**⚠️ NO HALLUCINATION:**
- If extracted content says "Has Photo: NO" → DO NOT say "photo hatao"
- If something is "NOT FOUND" → DO NOT pretend it exists
- If unsure → Ask user, don't assume

═══════════════════════════════════════════════════════════════
## PRODUCTION HTML+CSS TEMPLATES
═══════════════════════════════════════════════════════════════

### TEMPLATE 1: IIT MODERN (Default - Works for ALL roles)

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{FULL_NAME}} - Resume</title>
<style>
  @page { size: A4; margin: 0.75in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    background: #fff;
  }
  
  /* Header */
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
  }
  .name {
    font-size: 24pt;
    font-weight: 700;
    margin-bottom: 5px;
  }
  .contact {
    font-size: 10pt;
    color: #333;
  }
  .contact-item {
    display: inline;
    margin: 0 8px;
  }
  
  /* Sections */
  .section {
    margin-top: 18px;
  }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1.5px solid #000;
    padding-bottom: 3px;
    margin-bottom: 8px;
  }
  
  /* Summary */
  .summary {
    text-align: justify;
    line-height: 1.5;
  }
  
  /* Skills */
  .skills {
    line-height: 1.8;
  }
  
  /* Experience/Projects */
  .entry {
    margin-bottom: 12px;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 3px;
  }
  .entry-title {
    font-size: 11pt;
  }
  .entry-date {
    font-size: 10pt;
    font-style: italic;
    color: #333;
  }
  .entry-subtitle {
    font-size: 10pt;
    margin-bottom: 4px;
  }
  
  /* Bullets */
  ul {
    list-style: disc;
    padding-left: 20px;
    margin-top: 4px;
  }
  ul li {
    margin: 3px 0;
    line-height: 1.4;
  }
  
  /* Education */
  .education-entry {
    margin-bottom: 10px;
  }
  .degree {
    font-weight: 700;
  }
  
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">{{FULL_NAME}}</div>
    <div class="contact">
      {{CONTACT_LINE}}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Professional Summary</div>
    <p class="summary">{{SUMMARY}}</p>
  </div>

  <div class="section">
    <div class="section-title">{{EXPERIENCE_OR_PROJECTS_TITLE}}</div>
    {{EXPERIENCE_ENTRIES}}
  </div>

  <div class="section">
    <div class="section-title">Skills</div>
    <p class="skills">{{SKILLS_INLINE}}</p>
  </div>

  <div class="section">
    <div class="section-title">Education</div>
    {{EDUCATION_ENTRIES}}
  </div>

  {{CERTIFICATIONS_SECTION}}
</body>
</html>
\`\`\`

### TEMPLATE 2: CORPORATE CLASSIC (Finance, Banking, Consulting)

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{{FULL_NAME}} - Resume</title>
<style>
  @page { size: A4; margin: 1in 0.8in; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
  }
  
  .header {
    text-align: center;
    margin-bottom: 20px;
    border-bottom: 2.5px solid #000;
    padding-bottom: 12px;
  }
  .name {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .contact {
    font-size: 10.5pt;
  }
  
  .section {
    margin-top: 16px;
  }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    text-transform: uppercase;
    border-bottom: 1.5px solid #000;
    padding-bottom: 3px;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
  }
  
  .entry {
    margin-bottom: 12px;
  }
  .entry-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
  }
  
  ul {
    list-style: disc;
    padding-left: 22px;
    margin-top: 4px;
  }
  ul li {
    margin: 4px 0;
  }
  
  @media print {
    body { -webkit-print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <!-- Same structure as IIT template -->
</body>
</html>
\`\`\`

**Template Selection:**
- Default: IIT MODERN (clean, works for 95% of cases)
- Corporate roles: CORPORATE CLASSIC
- User can request: "corporate style", "traditional", "modern"

**You fill in:**
- {{FULL_NAME}}: User's name
- {{CONTACT_LINE}}: Email | Phone | Location | LinkedIn | Github (separated by |)
- {{SUMMARY}}: 3-4 line professional summary
- {{EXPERIENCE_ENTRIES}}: Complete experience/project entries with bullets
- {{SKILLS_INLINE}}: Comma-separated skills
- {{EDUCATION_ENTRIES}}: Degree, institution, year, CGPA

═══════════════════════════════════════════════════════════════
## CONVERSATION FLOW
═══════════════════════════════════════════════════════════════

**Session Start:**
1. Run \`list_available_assets\`
2. If resume found: Run \`get_document_content\`
3. Greet naturally (time-aware)
4. Give feedback based on ACTUAL content

**Example:**
\`\`\`
→ \`list_available_assets\`
→ \`get_document_content\`

[Late night scenario, user is Aadya]
"Arrey Aadya, raat ke 3 baj gaye! Chal dekh leta hoon tera resume."
→ STOP

[After analyzing]
"Dekh, professional summary strong hai. Bas LinkedIn aur Github URLs missing hain. Woh add kar de."
→ STOP
\`\`\`

**Building Resume:**
\`\`\`
User: "bana do"
You: "Bana raha hoon."
→ Call \`generate_resume_pdf\` with COMPLETE HTML+CSS
→ STOP

[After PDF generated]
"Ho gaya. Check kar chat mein."
→ STOP
\`\`\`

**Updating Resume:**
\`\`\`
User: "Skills update karna hai"
You: "Kya add karna?"
→ STOP

[User responds with skills]
You: "Update kar raha hoon."
→ Call \`update_resume_section\`
"Done. Naya version bhej diya."
→ STOP
\`\`\`

═══════════════════════════════════════════════════════════════
## CV EXPERT MODE
═══════════════════════════════════════════════════════════════

**Direct Instructions (Tell, Don't Ask):**
"LinkedIn URL missing hai. Woh add kar."
"Action verbs se shuru kar bullets - Led, Built, Developed."
"Metrics daal - kitna percentage improve hua?"
"Single column layout rakh. ATS ke liye."

**Priority Fixes:**
1. **ATS blockers**: Photo, columns, graphics, tables
2. **Missing info**: Contact URLs, dates, metrics
3. **Weak content**: Vague bullets, no action verbs
4. **Formatting**: Only if critical

**Multi-Issue Strategy:**
Pick ONE highest priority → Instruct → STOP → Wait → Next

**Scoring:**
\`\`\`
User: "Check karo"
You: "Dekh raha hoon."
→ \`analyze_resume_ats\`
"ATS score 70%. Top 3 fixes: LinkedIn URL add kar, metrics daal bullets mein, action verbs use kar."
→ STOP
\`\`\`

═══════════════════════════════════════════════════════════════
## BADE BHAIYA MODE (Career/Life)
═══════════════════════════════════════════════════════════════

**Warm & Real:**
"Dekh {{name}}, rejection normal hai. 50 applications mein 5 response aate hain industry mein."
"Job switch kar raha? Pehle 6 months ka backup dekh le."
"Interview nervous? Bol ke practice kar. Mirror ke saamne."

**Keep Brief:**
- Empathize: 5 seconds
- Give advice: Practical, actionable
- No lectures

═══════════════════════════════════════════════════════════════
## LANGUAGE
═══════════════════════════════════════════════════════════════

**Indian English + Hinglish:**
- Indian users: 60% English, 40% Hindi
- Non-Indian: 100% English
- Technical terms: Always English
- Accent: "Data" = daa-ta, "Resume" = re-zoo-may

**Natural Mix:**
"{{name}}, LinkedIn URL missing hai. Add kar de, ATS systems check karte hain."
"Perfect. Ab metrics daal - revenue kitna increase hua?"
"Bhai, tension mat le. Ye fix easy hai."

═══════════════════════════════════════════════════════════════
## QUALITY CONTROL
═══════════════════════════════════════════════════════════════

**Before EVERY response:**
✅ Did I read user_name, time, conversation_history?
✅ Did I run necessary tools?
✅ Am I using ACTUAL data (not assumptions)?
✅ Is response 2-4 sentences MAX?
✅ Am I telling, not asking?
✅ Will I STOP after this?
✅ No glitches like <ctrl46>?
✅ Right persona (Bhaiya vs Expert)?

**PDF Generation Checklist:**
✅ Complete HTML with inline CSS?
✅ All user data filled in correctly?
✅ ATS-safe (single column, standard fonts)?
✅ Professional appearance?
✅ No missing sections?

═══════════════════════════════════════════════════════════════
## SAMPLES
═══════════════════════════════════════════════════════════════

**First Meeting (3:27 AM, user is Aadya):**
"Hey Aadya! Raat ke saade teen baj gaye! Chal main dekh leta hoon. Resume upload kiya hai?" → STOP

**After Document Analysis:**
→ \`get_document_content\`
"Dekha. Fresher AI Engineer profile strong hai. Bas LinkedIn aur Github ke URLs missing hain contact mein." → STOP

**User asks to build:**
User: "Theek hai, bana do"
You: "Bana raha hoon." → \`generate_resume_pdf\` with complete HTML+CSS
"Ho gaya. Check kar chat mein." → STOP

**User asks to update:**
User: "Skills mein Python aur TensorFlow add karna hai"
You: "Update kar raha hoon." → \`update_resume_section\`
"Done. Updated resume bhej diya." → STOP

**Career Advice:**
User: "Interview se nervous ho raha hoon"
You: "Dekh bhai, normal hai. Main tip: Bol ke practice kar answers. Mirror ke saamne ya friend ke saath." → STOP

═══════════════════════════════════════════════════════════════

**Be Devansh. Read context. Use tools. Quality output. Keep it short. Go.**
`;

const App: React.FC = () => {
  // --- States ---
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('v15_chat_history');
    return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
  });
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(LiveStatus.IDLE);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pipPos, setPipPos] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [inputMessage, setInputMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showUrlInputBox, setShowUrlInputBox] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);
  const [showLogPanel, setShowLogPanel] = useState(false);

  // --- Refs ---
  const liveStatusRef = useRef<LiveStatus>(LiveStatus.IDLE);
  const filesRef = useRef<UploadedFile[]>([]);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef<{ user: string; agent: string }>({ user: '', agent: '' });
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const vectorStore = useRef<Record<string, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);

  // State sync
  useEffect(() => { liveStatusRef.current = liveStatus; }, [liveStatus]);

  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-99), {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message
    }]);
  }, []);

  useEffect(() => {
    localStorage.setItem('v15_chat_history', JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showUrlInputBox]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, attachments?: string[], groundingLinks?: GroundingLink[]) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      role, content,
      timestamp: new Date(),
      attachments,
      groundingLinks
    }]);
  }, []);

  // --- PDF Synthesis Engine ---
  const renderPDF = async (html: string, filename: string): Promise<string> => {
    addLog('INFO', `Synthesis Engine: Designing high-fidelity document...`);
    const jsPDFLib = (window as any).jspdf;
    const html2canvas = (window as any).html2canvas;

    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.left = '-10000px';
    div.style.width = '800px';
    div.style.backgroundColor = 'white';
    div.innerHTML = `
      <style>
        .resume-container { padding: 50px; font-family: 'Helvetica', 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .resume-header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 20px; }
        .resume-name { font-size: 32px; font-weight: bold; margin: 0; color: #1e293b; text-transform: uppercase; letter-spacing: 1px; }
        .resume-contact { font-size: 14px; color: #64748b; margin-top: 5px; }
        .resume-section-title { font-size: 18px; font-weight: bold; color: #10b981; border-bottom: 1px solid #e2e8f0; margin-top: 30px; margin-bottom: 15px; padding-bottom: 5px; text-transform: uppercase; }
        .resume-item { margin-bottom: 20px; }
        .resume-item-title { font-weight: bold; font-size: 16px; color: #1e293b; }
        .resume-item-subtitle { font-style: italic; color: #475569; }
        .resume-item-date { float: right; color: #94a3b8; font-size: 14px; }
        .resume-content { margin-top: 8px; font-size: 14px; }
        ul { margin: 8px 0; padding-left: 20px; }
        li { margin-bottom: 5px; list-style-type: disc; }
        .skills-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
      </style>
      <div class="resume-container">${html}</div>
    `;
    document.body.appendChild(div);

    try {
      const canvas = await html2canvas(div, { scale: 2, useCORS: true });
      const doc = new jsPDFLib.jsPDF({ orientation: 'p', unit: 'px', format: [canvas.width, canvas.height] });
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
      const url = URL.createObjectURL(doc.output('blob'));

      addMessage('assistant', `तैयार है! Your executive resume is ready.`);
      addMessage('assistant', `Audit complete: Integrated current industry keywords, optimized visual structure, and refined your professional narrative.`, [url]);

      div.remove();
      return url;
    } catch (e) {
      addLog('ERROR', `PDF Synthesis error: ${e}`);
      div.remove();
      return "";
    }
  };

  // --- Chat via N8N Webhook ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    const query = inputMessage;
    setInputMessage('');
    addMessage('user', query);
    setIsTyping(true);

    const N8N_WEBHOOK_URL = 'https://n8n-0.nudgit.ai/webhook/b2599ee9-6730-49d0-a58f-ac4a67e265ed';
    addLog('INFO', `Connecting to Career Architect via N8N...`);

    try {
      const assetContext = filesRef.current.map(f => `DOCUMENT [${f.name}]: ${vectorStore.current[f.url]}`).join('\n\n');

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: query,
          context: assetContext,
          sessionId: 'cv_voice_agent_' + Date.now(),
          currentDateTime: new Date().toISOString(),
          currentDate: new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
        }),
      });

      if (!response.ok) {
        throw new Error(`N8N request failed: ${response.status}`);
      }

      const data = await response.json();

      // Parse response - handle different response formats from n8n
      let text = '';
      if (typeof data === 'string') {
        text = data;
      } else if (data.output) {
        text = data.output;
      } else if (data.message) {
        text = data.message;
      } else if (data.response) {
        text = data.response;
      } else if (data.text) {
        text = data.text;
      } else {
        text = JSON.stringify(data);
      }

      addMessage('assistant', text || "I am analyzing that for you now...");
      addLog('SUCCESS', `N8N response received successfully.`);
    } catch (err: any) {
      addLog('ERROR', `N8N request failed: ${err?.message || err}`);
      addMessage('assistant', "Pardon me, had a minor glitch connecting to the server. What were we saying about your career?");
    } finally {
      setIsTyping(false);
    }
  };

  // --- Asset Processing ---
  const processFileForVectorStore = async (fileData: string, mimeType: string, fileName: string) => {
    addLog('INFO', `Deep Audit starting: ${fileName}`);
    addLog('INFO', `File type: ${mimeType}, Size: ${Math.round(fileData.length / 1024)}KB`);

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });

    // Dedicated extraction prompt - DO NOT use system prompt here
    const extractionPrompt = `
You are **ResumeGatekeeper_Extractor**, a strict “resume/CV gatekeeper + content extractor” agent.

Your role has two responsibilities:
1) **Gatekeeper**: Decide whether the provided URL/file is actually a resume/CV.  
2) **Extractor** (ONLY if it is a resume): Extract structured content so downstream agents can reliably understand what is in the resume.

You will be used as a mandatory pre-check for any workflow that requires a resume.  
If the file is not a resume, you must stop and clearly report that it is not the correct file.

INPUTS YOU WILL RECEIVE
- file_url: URL to a document (PDF/DOC/DOCX/image).
- (optional) expected_doc_type: usually "resume" (default).
- (optional) notes: user context.

NON-NEGOTIABLE RULES (ZERO HALLUCINATION)
1) Do not invent any resume content. Extract only what is actually in the file.
2) If a field is missing, output exactly: "NOT FOUND".
3) If text exists but is unreadable/ambiguous, output: "UNCLEAR" and explain in \`extraction_notes\`.
4) Return **JSON ONLY**. No markdown, no extra text.
5) If the URL cannot be accessed / file is corrupted / unsupported, set status = "ERROR" and populate errors.

DOCUMENT HANDLING
- Fetch the file from file_url.
- Detect file_type: PDF | DOC | DOCX | IMAGE | UNKNOWN
- Process all pages.
- PDF: extract selectable text + visually assess layout (columns, icons, tables, photo, text-as-image).
- DOC/DOCX: extract headings, paragraphs, tables, hyperlinks.
- IMAGE: read all visible text; note unreadable areas.

GATEKEEPER LOGIC (CRITICAL)
Classify the document into one of:
- "RESUME" (resume/CV clearly)
- "NOT_RESUME" (clearly not a resume/CV)
- "UNCLEAR" (insufficient evidence; poor quality; too little content)

Use evidence-based signals only:
Typical RESUME signals include: name/contact header, professional summary, work experience entries, education, skills, projects, certifications, LinkedIn, job titles with companies and dates.
Typical NOT_RESUME signals include: invoices, bank statements, forms, legal agreements, academic papers, marketing brochures, ID cards, offer letters without resume structure, screenshots of chats, random notes, presentations.

If classification is NOT_RESUME:
- Set status="REJECTED"
- Provide short reason + supporting evidence snippets (no guessing)
- Do NOT extract resume sections beyond minimal evidence.

If classification is UNCLEAR:
- Set status="REJECTED"
- Reason: insufficient evidence / unreadable / partial
- Provide what prevented classification.

If classification is RESUME:
- Set status="ACCEPTED"
- Perform full extraction per schema below.

OUTPUT SCHEMA (VALID JSON ONLY)
{
  "status": "ACCEPTED | REJECTED | ERROR",
  "classification": "RESUME | NOT_RESUME | UNCLEAR",
  "source": {
    "file_url": "<echo input>",
    "file_type": "PDF | DOC | DOCX | IMAGE | UNKNOWN",
    "pages_detected": "<number or UNCLEAR>",
    "errors": []
  },
  "gatekeeper": {
    "decision_reason": "<one concise sentence>",
    "evidence": [
      {
        "type": "positive_signal | negative_signal",
        "snippet": "<verbatim text snippet or visual observation>",
        "page": "<page number or UNCLEAR>"
      }
    ]
  },
  "document_analysis": {
    "has_photo": "YES | NO | UNCLEAR",
    "layout": "Single column | Two column | Multi column | Table-based | Other | UNCLEAR",
    "has_graphics_or_icons": "YES | NO | UNCLEAR",
    "uses_tables": "YES | NO | UNCLEAR",
    "text_is_mostly_selectable": "YES | NO | UNCLEAR",
    "ats_risk_level": "LOW | MEDIUM | HIGH | UNCLEAR",
    "analysis_notes": []
  },
  "extracted_content": {
    "personal_info": {
      "name": "NOT FOUND",
      "email": "NOT FOUND",
      "phone": "NOT FOUND",
      "location": "NOT FOUND",
      "linkedin": "NOT FOUND",
      "portfolio_or_website": "NOT FOUND",
      "other_links": []
    },
    "headline_or_title": "NOT FOUND",
    "professional_summary_or_objective": "NOT FOUND",
    "work_experience": [
      {
        "company_name": "NOT FOUND",
        "role_or_title": "NOT FOUND",
        "location": "NOT FOUND",
        "duration": "NOT FOUND",
        "employment_type": "NOT FOUND",
        "bullets": [],
        "raw_block_text": "NOT FOUND",
        "evidence": { "page": "UNCLEAR", "section_label_seen": "UNCLEAR" }
      }
    ],
    "education": [
      {
        "institution": "NOT FOUND",
        "degree": "NOT FOUND",
        "field_of_study": "NOT FOUND",
        "duration_or_year": "NOT FOUND",
        "grade_or_gpa": "NOT FOUND",
        "details": "NOT FOUND",
        "evidence": { "page": "UNCLEAR" }
      }
    ],
    "skills": {
      "skills_as_listed_verbatim": [],
      "grouped_if_grouping_exists": [
        { "group_name": "NOT FOUND", "items": [] }
      ]
    },
    "projects": [
      {
        "project_name": "NOT FOUND",
        "duration": "NOT FOUND",
        "description": "NOT FOUND",
        "tech_or_tools": [],
        "links": [],
        "bullets": [],
        "evidence": { "page": "UNCLEAR" }
      }
    ],
    "certifications": [
      {
        "name": "NOT FOUND",
        "issuer": "NOT FOUND",
        "date": "NOT FOUND",
        "credential_id": "NOT FOUND",
        "link": "NOT FOUND",
        "evidence": { "page": "UNCLEAR" }
      }
    ],
    "awards_or_achievements": "NOT FOUND",
    "publications": "NOT FOUND",
    "languages": "NOT FOUND",
    "volunteering": "NOT FOUND",
    "additional_sections": [
      {
        "section_heading": "NOT FOUND",
        "content_verbatim": "NOT FOUND",
        "evidence": { "page": "UNCLEAR" }
      }
    ]
  },
  "ats_issues_found": [],
  "recommended_fixes": [],
  "extraction_notes": []
}

CONDITIONAL OUTPUT RULES
- If status="REJECTED":
  - You MUST still return \`source\` and \`gatekeeper\`.
  - You MUST set \`document_analysis\` and \`extracted_content\` to minimal safe defaults:
    - document_analysis fields can be "UNCLEAR" unless directly observed.
    - extracted_content should remain with "NOT FOUND" defaults and empty arrays.
  - Do NOT generate ATS issues or recommended fixes (leave empty arrays).
- If status="ERROR":
  - Populate source.errors with clear, factual error strings.
  - classification must be "UNCLEAR".
- If status="ACCEPTED":
  - Populate all extracted sections you can find.
  - ATS issues and fixes must be tied to observed evidence only (no generic advice).

ATS ISSUES GUIDANCE (ONLY WHEN ACCEPTED)
Flag issues only if you actually observe them, e.g.:
- Two-column layout that may confuse parsers
- Icons used instead of text labels
- Contact details embedded in header graphics
- Heavy tables with merged cells
- Text appears to be an image (scanned) with poor clarity
Each issue must include evidence.

RECOMMENDED FIXES (ONLY WHEN ACCEPTED)
Provide fixes that directly address the observed ATS issues (no generic resume coaching).

FINAL CHECK
Before returning:
- Ensure JSON is valid.
- Ensure no fabricated content.
- Ensure REJECTED files explicitly say not correct file for resume-required tasks.
`;

    try {
      // Use gemini-2.5-flash model for document processing
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: extractionPrompt }, { inlineData: { mimeType, data: fileData } }] }
      });
      const content = result.text || "";
      const url = `res://asset-${Date.now()}`;
      vectorStore.current[url] = content;

      const newFile = { name: fileName, url, type: mimeType, content };
      filesRef.current = [...filesRef.current, newFile];
      setFiles([...filesRef.current]);

      addLog('SUCCESS', `Deep Audit Complete: ${fileName}`);
      addMessage('assistant', `"${fileName}" ka audit ho gaya. Content extract ho gaya hai.`);
      addMessage('user', `Audit Target: ${fileName}`, [url]);

      if (liveStatusRef.current === LiveStatus.ACTIVE) {
        sessionPromiseRef.current?.then(s => {
          s.sendRealtimeInput({ text: `[SYSTEM: Resume "${fileName}" uploaded and analyzed. Here is the extracted content:\n\n${content}\n\nUse this ACTUAL extracted content to give feedback. DO NOT make up content that is not in the extraction above.]` });
        });
      }
      return { url, content };
    } catch (err: any) {
      const errorMsg = err?.message || err?.toString() || 'Unknown error';
      console.error('Asset audit error:', err);
      addLog('ERROR', `Asset audit failed: ${errorMsg}`);
      throw err;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setShowPlusMenu(false);
    try {
      const base64Data = await blobToBase64(file);
      await processFileForVectorStore(base64Data, file.type, file.name);
    } catch (err) { addMessage('assistant', "Audit failed to initialize."); }
  };

  const submitPastedUrl = async () => {
    if (!pastedUrl.trim() || isProcessingUrl) return;
    setIsProcessingUrl(true);
    addLog('INFO', `Connecting to remote career asset...`);
    try {
      const res = await fetch(pastedUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const base64 = await blobToBase64(blob);
      const name = pastedUrl.split('/').pop()?.split('?')[0] || "Remote Asset";
      await processFileForVectorStore(base64, blob.type, name);
      setShowUrlInputBox(false);
      setPastedUrl('');
    } catch (err) { addLog('ERROR', `Remote asset unreachable.`); } finally { setIsProcessingUrl(false); }
  };

  // --- Live Voice Core ---
  const startCall = async () => {
    try {
      addLog('INFO', 'Synchronizing with Voice Audit Core...');
      setLiveStatus(LiveStatus.CONNECTING);
      setIsMinimized(false);

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });
      if (!audioContextInRef.current) audioContextInRef.current = new AudioContext({ sampleRate: 16000 });
      if (!audioContextOutRef.current) audioContextOutRef.current = new AudioContext({ sampleRate: 24000 });

      await audioContextInRef.current.resume();
      await audioContextOutRef.current.resume();

      heartbeatIntervalRef.current = window.setInterval(() => {
        if (audioContextInRef.current?.state === 'suspended') audioContextInRef.current.resume();
        if (audioContextOutRef.current?.state === 'suspended') audioContextOutRef.current.resume();
      }, 500);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContextInRef.current.createMediaStreamSource(stream);
      const scriptProcessor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);

      micSourceRef.current = source;
      processorRef.current = scriptProcessor;

      // Generate dynamic date context
      const currentDate = new Date();
      const dateContext = `
[CURRENT CONTEXT - IMPORTANT]
TODAY'S DATE: ${currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
CURRENT TIME: ${currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
Use this to accurately judge if resume dates are past, present, or future.
`;
      const systemInstruction = MASTER_SYSTEM_PROMPT + dateContext;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Achird' } } },
          systemInstruction,
          tools: [{
            functionDeclarations: [
              { name: 'list_available_assets', description: 'Lists filenames/URLs in the current session.' },
              { name: 'get_document_content', description: 'Extracts deep text from a resume URL.', parameters: { type: Type.OBJECT, properties: { url: { type: Type.STRING } }, required: ['url'] } },
              { name: 'generate_resume_pdf', description: 'Converts career data HTML into a PDF document.', parameters: { type: Type.OBJECT, properties: { html: { type: Type.STRING }, filename: { type: Type.STRING } }, required: ['html'] } }
            ]
          }],
          inputAudioTranscription: {}, outputAudioTranscription: {}
        },
        callbacks: {
          onopen: () => {
            addLog('SUCCESS', 'Voice Core: Audio link stable.');
            setLiveStatus(LiveStatus.ACTIVE);
            source.connect(scriptProcessor);
            const silent = audioContextInRef.current!.createGain();
            silent.gain.value = 0;
            scriptProcessor.connect(silent);
            silent.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const parts = msg.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data && audioContextOutRef.current) {
                setIsSpeaking(true);
                const bytes = decode(part.inlineData.data);
                const buffer = await decodeAudioData(bytes, audioContextOutRef.current, 24000, 1);
                const s = audioContextOutRef.current.createBufferSource();
                s.buffer = buffer;
                s.connect(audioContextOutRef.current.destination);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current.currentTime);
                s.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                audioSourcesRef.current.add(s);
                s.onended = () => {
                  audioSourcesRef.current.delete(s);
                  if (audioSourcesRef.current.size === 0) setIsSpeaking(false);
                };
              }
            }

            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                addLog('TOOL', `Executing Architect Tool: ${fc.name}`);
                let res: any = { status: "ok" };
                if (fc.name === 'list_available_assets') {
                  res = { assets: filesRef.current.map(f => ({ name: f.name, url: f.url })) };
                } else if (fc.name === 'get_document_content') {
                  res = { content: vectorStore.current[(fc.args as any).url] || "No content found." };
                } else if (fc.name === 'generate_resume_pdf') {
                  setIsMinimized(true);
                  const url = await renderPDF((fc.args as any).html, (fc.args as any).filename || "Resume.pdf");
                  res = { status: "success", pdf_url: url };
                }
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: res } }));
              }
            }

            if (msg.serverContent?.turnComplete) {
              if (transcriptionRef.current.user) addMessage('user', transcriptionRef.current.user);
              if (transcriptionRef.current.agent) addMessage('assistant', transcriptionRef.current.agent);
              transcriptionRef.current = { user: '', agent: '' };
            }
            if (msg.serverContent?.inputTranscription) transcriptionRef.current.user += msg.serverContent.inputTranscription.text;
            if (msg.serverContent?.outputTranscription) transcriptionRef.current.agent += msg.serverContent.outputTranscription.text;
          },
          onclose: (c) => {
            const closeReasons: Record<number, string> = {
              1000: 'Normal closure',
              1001: 'Going away',
              1002: 'Protocol error',
              1003: 'Unsupported data',
              1006: 'Abnormal closure (network issue)',
              1007: 'Invalid frame payload',
              1008: 'Policy violation - Check if your API key has Live API access',
              1009: 'Message too big',
              1010: 'Missing extension',
              1011: 'Internal error',
              1015: 'TLS handshake failure'
            };
            const reason = closeReasons[c.code] || 'Unknown reason';
            addLog('INFO', `Voice Session closed. Code: ${c.code} - ${reason}`);
            if (c.code === 1008) {
              addLog('ERROR', 'Live API access may be restricted. Verify your API key has Live API permissions at https://aistudio.google.com/apikey');
            }
            stopCall();
          },
          onerror: (e) => {
            console.error('Voice session error:', e);
            addLog('ERROR', `Voice connection error. Check console for details.`);
            stopCall();
          }
        }
      });

      scriptProcessor.onaudioprocess = (e) => {
        if (!isMuted && liveStatusRef.current === LiveStatus.ACTIVE) {
          const data = e.inputBuffer.getChannelData(0);
          sessionPromise.then(s => { try { s.sendRealtimeInput({ media: createBlob(data) }); } catch (err) { } });
        }
      };
      sessionPromiseRef.current = sessionPromise;
    } catch (err) {
      addLog('ERROR', `Voice Engine initialization failed: ${err}`);
      setLiveStatus(LiveStatus.ERROR);
    }
  };

  const stopCall = () => {
    addLog('INFO', 'Deactivating Voice Core...');
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    sessionPromiseRef.current?.then(s => { try { s.close(); } catch (e) { } });
    audioSourcesRef.current.forEach(s => { try { s.stop(); } catch (e) { } });
    audioSourcesRef.current.clear();
    setLiveStatus(LiveStatus.IDLE);
    setIsMinimized(false);
  };

  // --- PiP and UI Helpers ---
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStartPos({ x: clientX, y: clientY });
  };
  const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isMinimized) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPipPos({ x: clientX - 70, y: clientY - 90 });
  };
  const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const clientX = 'touches' in e ? (e as React.TouchEvent).changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).changedTouches[0].clientY : (e as React.MouseEvent).clientY;
    const dist = Math.hypot(clientX - dragStartPos.x, clientY - dragStartPos.y);
    if (dist < 5 && isMinimized) setIsMinimized(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full bg-[#0f172a] overflow-hidden">

      {/* Main Chat Panel */}
      <div className="chat-main flex-1 flex flex-col bg-[#f0f2f5] relative border-r border-slate-700 overflow-hidden">
        <div className="chat-bg" />

        {/* Header */}
        <header className="mobile-header bg-white px-4 py-3 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-emerald-500/20">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh" alt="Devansh" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Devansh Mehta</h1>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Elite Career Architect</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Log Panel Toggle (Mobile) */}
            <button
              onClick={() => setShowLogPanel(!showLogPanel)}
              className="log-panel-toggle lg:hidden p-2 rounded-full bg-slate-100 text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <button
              onClick={liveStatus === LiveStatus.IDLE ? startCall : () => setIsMinimized(!isMinimized)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-xs shadow-lg transition-all ${liveStatus === LiveStatus.ACTIVE ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span className="hidden sm:inline">{liveStatus === LiveStatus.IDLE ? 'Consult Architect' : 'Return to Call'}</span>
            </button>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto chat-container p-3 sm:p-4 space-y-3 sm:space-y-4 relative z-10" onClick={() => { if (liveStatus !== LiveStatus.IDLE) setIsMinimized(true); setShowPlusMenu(false); }}>
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`message-bubble ${m.role === 'user' ? 'msg-user' : 'msg-assistant'} max-w-[90%] sm:max-w-[85%] p-3 shadow-sm`}>
                {m.content && <p className="text-[13px] leading-relaxed text-slate-800 whitespace-pre-wrap">{m.content}</p>}

                {m.groundingLinks && m.groundingLinks.length > 0 && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>
                      Verified Sources:
                    </p>
                    {m.groundingLinks.map((link, idx) => (
                      <a key={idx} href={link.uri} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-blue-600 hover:underline truncate py-0.5">
                        • {link.title || link.uri}
                      </a>
                    ))}
                  </div>
                )}

                {m.attachments?.map((url, i) => (
                  <div key={i} className="mt-3" onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}>
                    <div className="pdf-card">
                      <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"></path></svg></div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[11px] font-bold truncate">Elite Professional Doc</p>
                        <p className="text-[9px] opacity-70">Click to Download PDF</p>
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-[9px] text-right mt-1 opacity-50">{m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}

          {showUrlInputBox && (
            <div className="flex justify-end">
              <div className="msg-user p-4 w-full max-w-[320px] shadow-xl border border-emerald-200 animate-in slide-in-from-right-4">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Connect Career Target</h3>
                <input
                  type="text" autoFocus value={pastedUrl} onChange={(e) => setPastedUrl(e.target.value)}
                  placeholder="Paste URL (LinkedIn/Resume)..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 mb-3 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowUrlInputBox(false)} className="px-3 py-1.5 text-[10px] font-bold text-slate-500">Cancel</button>
                  <button onClick={submitPastedUrl} disabled={!pastedUrl.trim() || isProcessingUrl} className="px-4 py-1.5 text-[10px] font-bold bg-emerald-600 text-white rounded-md shadow-sm">
                    {isProcessingUrl ? 'Scanning...' : 'Start Audit'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex justify-start">
              <div className="msg-assistant p-3 animate-pulse text-[11px] text-slate-400">Strategist is executing audit...</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area p-3 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20 flex items-center gap-2 sm:gap-3 relative">
          <div className="relative">
            <button onClick={() => setShowPlusMenu(!showPlusMenu)} className={`p-2 transition-colors ${showPlusMenu ? 'text-emerald-500' : 'text-slate-400'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
            </button>
            {showPlusMenu && (
              <div className="absolute bottom-12 left-0 bg-white border border-slate-200 rounded-xl shadow-xl p-2 min-w-[160px] flex flex-col gap-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
                <button onClick={() => { setShowPlusMenu(false); setShowUrlInputBox(true); }} className="flex items-center gap-3 p-2.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 105.656 5.656l-1.1 1.1"></path></svg></div>
                  <span>Paste Profile Link</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-2.5 text-xs text-slate-700 hover:bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg></div>
                  <span>Audit Resume</span>
                </button>
              </div>
            )}
          </div>
          <input
            type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Search industry trends or audit my career..."
            className="flex-1 bg-white border border-slate-200 rounded-full px-3 sm:px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
          />
          <button onClick={handleSendMessage} className="bg-emerald-500 text-white p-2 sm:p-2.5 rounded-full shadow-lg disabled:opacity-50" disabled={!inputMessage.trim() || isTyping}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>

        {/* Voice Call Overlay */}
        {liveStatus !== LiveStatus.IDLE && (
          <div
            className={`call-overlay absolute z-[100] ${isMinimized ? 'pip-window' : 'inset-0 bg-white flex flex-col items-center justify-between py-12 sm:py-24 animate-in fade-in duration-300'}`}
            style={isMinimized ? { left: pipPos.x, top: pipPos.y, position: 'fixed' } : {}}
            onMouseMove={handleDrag} onTouchMove={handleDrag}
            onMouseDown={handleDragStart} onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}
          >
            {isMinimized ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 relative cursor-grab active:cursor-grabbing">
                <button onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} className="absolute top-2 right-2 p-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white pointer-events-auto">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                </button>
                <div className="w-12 sm:w-16 h-12 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-500 shadow-lg mb-2 pointer-events-none">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh" alt="Devansh" className="w-full h-full" />
                </div>
                <p className="text-[10px] text-white font-bold tracking-tight pointer-events-none">Strategist Active</p>
                {isSpeaking && <div className="dot-pulse mt-1"><span></span><span></span><span></span></div>}
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center text-center px-6">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 sm:mb-8">Devansh Mehta</h2>
                  <div className="relative mb-8 sm:mb-12">
                    {isSpeaking && <div className="pulse-ring" style={{ width: '120px', height: '120px', top: '-10px', left: '-10px' }}></div>}
                    <div className="avatar-large w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-emerald-500 bg-slate-100 shadow-2xl">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Devansh" alt="Devansh" className="w-full h-full" />
                    </div>
                  </div>
                  <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px]">
                    {liveStatus === LiveStatus.CONNECTING ? 'Connecting to Career Logic...' : isSpeaking ? 'Strategist is Speaking' : isMuted ? 'Mic Muted' : 'High-Fidelity Audio Audit Active'}
                  </p>
                </div>
                <div className="call-buttons flex items-center gap-6 sm:gap-10">
                  <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="flex flex-col items-center gap-2 group">
                    <div className={`p-3 sm:p-4 rounded-full transition-all ${isMuted ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'}`}>
                      <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); stopCall(); }} className="flex flex-col items-center gap-2">
                    <div className="p-4 sm:p-6 rounded-full btn-call-active text-white shadow-2xl hover:scale-105 transition-transform">
                      <svg className="w-6 sm:w-8 h-6 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.284 4.184A1 1 0 008.334 3H5z"></path></svg>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">End Session</span>
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className="flex flex-col items-center gap-2 group">
                    <div className="p-3 sm:p-4 rounded-full bg-slate-100 text-slate-700 group-hover:bg-slate-200">
                      <svg className="w-5 sm:w-6 h-5 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimize</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Log Panel - Hidden on mobile by default */}
      <div className={`log-panel ${showLogPanel ? 'open' : ''} w-full lg:w-[420px] flex flex-col bg-[#0f172a] text-slate-300 font-mono text-[11px] border-l border-slate-800 shadow-2xl relative z-50`}>
        {/* Close button for mobile */}
        <button
          onClick={() => setShowLogPanel(false)}
          className="lg:hidden absolute top-3 right-3 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white z-10"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-4 py-3 bg-[#1e293b] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <span className="font-bold text-slate-100 uppercase tracking-tighter">Career Logic Stream</span>
          </div>
          <button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-white transition-colors">Clear stream</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar bg-[#020617]/50">
          {logs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-center opacity-40">
              <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Awaiting career insights...
            </div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex gap-2 animate-in fade-in duration-200">
              <span className="text-slate-600 shrink-0">[{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <span className={`shrink-0 font-bold px-1.5 py-0.5 rounded-[3px] text-[9px] ${log.type === 'ERROR' ? 'bg-red-900/40 text-red-400' :
                log.type === 'TOOL' ? 'bg-purple-900/40 text-purple-400' :
                  log.type === 'AUDIO' ? 'bg-blue-900/40 text-blue-400' :
                    log.type === 'SUCCESS' ? 'bg-emerald-900/40 text-emerald-400' :
                      'bg-slate-800 text-slate-400'
                }`}>{log.type}</span>
              <span className="break-all text-slate-200 leading-relaxed">{log.message}</span>
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
        <div className="p-2.5 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center text-[9px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${liveStatus === LiveStatus.ACTIVE ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-slate-700'}`} />
            <span>Core: {liveStatus === LiveStatus.ACTIVE ? 'LIVE' : 'STANDBY'}</span>
          </div>
          <span>{files.length} Analysis Targets Active</span>
        </div>
      </div>

      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
    </div>
  );
};

export default App;
