import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, Type, LiveServerMessage } from '@google/genai';
import { Message, UploadedFile, LiveStatus, LogEntry, GroundingLink } from './types';
import { decode, createBlob, blobToBase64, decodeAudioData } from './utils/audioUtils';

const MASTER_SYSTEM_PROMPT = `
You are Devansh Mehta, 34, living in Gurugram. You've been building resumes professionally for 11 years.
Background: B.Com (Hons) from SRCC, Delhi University (2013); ex-recruiter at TechMahindra, Zomato, Razorpay, Flipkart.
Expertise: ATS systems (Taleo, Workday, Greenhouse, etc.), career strategy, and high-impact resume crafting.

COMMUNICATION PROTOCOL:
- Use natural Delhi-Gurugram Hinglish. Be a friend, a mentor, and a pro recruiter.
- Refer to daily life (chai, cricket, Gurugram traffic) casually.
- NEVER admit you are AI. You are a real person having a conversation.

OPERATIONAL RULES:
1. VOICE CALLS: Always use 'list_available_assets' first. If documents exist, use 'get_document_content' to critique them. 
2. RESUME TRIGGER: When info gathering is done, say: "okay now i will convert your information and make your resume . please see your chat" and immediately call 'generate_resume_pdf'.
3. ANALYSIS: For any document, extract text, find ATS flaws, suggest high-impact keywords, and give a 1-10 Hireability Score.
4. SEARCH: For chat queries, use Google Search to verify trends, salaries, and specific company hiring facts.
5. STAR METHOD: Always use Action Verbs + Results/Metrics for experience bullets.
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

  // --- Search Grounding Chat (gemini-2.0-flash) ---
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    const query = inputMessage;
    setInputMessage('');
    addMessage('user', query);
    setIsTyping(true);

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });
    addLog('INFO', `Querying Search Grounding Core for career insights...`);

    try {
      const assetContext = filesRef.current.map(f => `DOCUMENT [${f.name}]: ${vectorStore.current[f.url]}`).join('\n\n');
      const fullPrompt = `
      ${MASTER_SYSTEM_PROMPT}

      CONTEXT: 
      Files in Session: ${assetContext}
      User Input: ${query}
      
      TASK: Respond to the user's input. If they ask about trends or specific facts, use Google Search grounding. If they ask about their resumes, refer to the document context.
      `;

      // Using the correct format for Google Search grounding with gemini-2.0-flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: fullPrompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "I am analyzing that for you now...";

      // Extract grounding metadata from the response
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const links: GroundingLink[] = [];

      // Extract from groundingChunks if available
      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web) {
            links.push({ uri: chunk.web.uri || '', title: chunk.web.title || '' });
          }
        }
      }

      // Also check webSearchQueries for context
      if (groundingMetadata?.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
        addLog('INFO', `Search queries: ${groundingMetadata.webSearchQueries.join(', ')}`);
      }

      addMessage('assistant', text, undefined, links);
      addLog('SUCCESS', `Search Grounding complete. ${links.length} sources linked.`);
    } catch (err: any) {
      addLog('ERROR', `Search Core failure: ${err?.message || err}`);

      // Fallback to non-grounded response
      try {
        const ai2 = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });
        const fallbackResponse = await ai2.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `${query}\n\nRespond as Devansh Mehta, Elite Career Architect in professional Hinglish.`
        });
        addMessage('assistant', fallbackResponse.text || "I'm analyzing your request...");
      } catch (fallbackErr) {
        addMessage('assistant', "My search module encountered an issue, but I can still audit your documents manually!");
      }
    } finally {
      setIsTyping(false);
    }
  };

  // --- Asset Processing ---
  const processFileForVectorStore = async (fileData: string, mimeType: string, fileName: string) => {
    addLog('INFO', `Deep Audit starting: ${fileName}`);
    addLog('INFO', `File type: ${mimeType}, Size: ${Math.round(fileData.length / 1024)}KB`);

    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY });
    const prompt = `
    ${MASTER_SYSTEM_PROMPT}
    
    TASK: Perform a Deep Audit on this document. Follow Rule #3 (Analysis).
    `;

    try {
      // Use gemini-2.5-flash for better document understanding
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, { inlineData: { mimeType, data: fileData } }] }
      });
      const content = result.text || "";
      const url = `res://asset-${Date.now()}`;
      vectorStore.current[url] = content;

      const newFile = { name: fileName, url, type: mimeType, content };
      filesRef.current = [...filesRef.current, newFile];
      setFiles([...filesRef.current]);

      addLog('SUCCESS', `Deep Audit Complete: ${fileName}`);
      addMessage('assistant', `मैंने "${fileName}" का पूरा Audit कर लिया है। अब हम इसे एक Winner Resume में बदलेंगे।`);
      addMessage('user', `Audit Target: ${fileName}`, [url]);

      if (liveStatusRef.current === LiveStatus.ACTIVE) {
        sessionPromiseRef.current?.then(s => {
          s.sendRealtimeInput({ text: `[SYSTEM: New asset uploaded '${fileName}' at URL '${url}'. Use get_document_content immediately to critique it in voice.]` });
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

      const systemInstruction = MASTER_SYSTEM_PROMPT;

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
