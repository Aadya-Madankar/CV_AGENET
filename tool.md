# 🛠️ Career Architect: Tool Implementation Documentation

This document explains the technical implementation of the AI tools used in the Devansh Mehta | Career Architect application. Use this as a reference or blueprint for building similar agentic capabilities in other applications.

---

## 1. Gemini Live API: Function Calling (Tool Calls)

Tool calls allow the Gemini model to interact with your local Javascript logic. In this app, we use them for resume auditing and PDF generation.

### **A. Declaration (The Definition)**
Tools must be declared when establishing the Live API connection. This tells the AI what functions it can "call".

```typescript
tools: [{
  functionDeclarations: [
    { 
      name: 'list_available_assets', 
      description: 'Lists all uploaded documents/resumes.' 
    },
    { 
      name: 'get_document_content', 
      description: 'Reads the extracted text of a specific resume.', 
      parameters: { 
        type: Type.OBJECT, 
        properties: { url: { type: Type.STRING } }, 
        required: ['url'] 
      } 
    },
    { 
      name: 'generate_resume_pdf', 
      description: 'Converts generated HTML code into a downloadable PDF.', 
      parameters: { 
        type: Type.OBJECT, 
        properties: { 
          html: { type: Type.STRING }, 
          filename: { type: Type.STRING } 
        }, 
        required: ['html'] 
      } 
    }
  ]
}]
```

### **B. Execution (The Response Loop)**
When the AI triggers a tool, your `onmessage` listener receives a `toolCall`. You must execute the logic and **send the response back** so the AI knows the result.

```typescript
// Inside onmessage callback
if (msg.toolCall) {
  for (const fc of msg.toolCall.functionCalls) {
    let res = { status: "ok" }; 
    
    // Logic for each tool
    if (fc.name === 'get_document_content') {
       res = { content: vectorStore.current[fc.args.url] };
    }
    
    // IMPORTANT: Send back the response
    sessionPromise.then(s => s.sendToolResponse({ 
      functionResponses: { id: fc.id, name: fc.name, response: res } 
    }));
  }
}
```

---

## 2. Document Extraction & "URL Reading"

The application uses a **Simulated Vector Store** to allow the AI to "read" documents without complex database overhead.

### **The Workflow:**
1.  **Conversion**: The user uploads a PDF/Image. The app converts it to a Base64 string.
2.  **Extraction**: The Base64 data is sent to `gemini-2.5-flash` with an extraction prompt.
3.  **Storage**: The plain text returned by Gemini is saved in a local React Reference (`vectorStore.current`) mapped to a unique resource ID (`res://asset-123`).
4.  **Retrieval**: When the voice assistant needs context, it simply queries the `vectorStore` using that ID.

**Why this matters:** This separates the "heavy" job of OCR/parsing from the "light" job of conversation, making the voice assistant much faster.

---

## 3. PDF Synthesis Engine (HTML to PDF)

The app generates professional PDFs using a **Snapshot Synthesis** approach. This ensures that modern CSS (Flexbox, Grid, sophisticated typography) is preserved perfectly.

### **Required Libraries (CDN or npm):**
- **`html2canvas`**: Converts DOM elements into a canvas image.
- **`jsPDF`**: Orchestrates the PDF document creation.

### **Implementation Logic (`renderPDF`):**
1.  **Off-screen Rendering**: Create a hidden DOM element (`display: block; position: fixed; left: -10000px`).
2.  **CSS Injection**: Inject a `<style>` block containing the resume design tokens.
3.  **HTML Injection**: Inject the AI-generated resume content.
4.  **Rasterization**: Use `html2canvas` to take a "screenshot" of the rendered element.
5.  **Assembly**: Add the screenshot to a `jsPDF` instance and generate a Blob URL.

```typescript
const canvas = await html2canvas(element, { scale: 2 });
const doc = new jspdf.jsPDF();
doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
const pdfUrl = URL.createObjectURL(doc.output('blob'));
```

---

## 🛠️ Summary table

| Tool Name | Technology | Inputs | Output |
|-----------|------------|--------|--------|
| **Live Audio** | WebRTC Websockets | Raw Audio | Synthesized Audio |
| **Extraction** | Gemini 2.5 Flash | Base64 File | Plan Text |
| **Synthesis** | Browser DOM + Canvas | HTML/CSS | Binary PDF Blob |
| **Grounding** | Google Search Core | User Query | Search Links + Text |

---

## 💡 Best Practices for Porting
- **Always use `scale: 2`** in `html2canvas` for high-quality, non-blurry text in PDFs.
- **Set a fixed width** (e.g., `800px`) for the hidden rendering container to ensure consistent "A4" proportions.
- **Encapsulate Tool Logic**: Keep your `renderPDF` and `processFile` functions pure so they can be easily moved to new files or projects.
