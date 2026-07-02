# Feature 02 — File / Image / Audio / Video in Chat

> Status: ⬜ Not started
> Effort: 1-2 days
> Dependencies: none (but audio transcription also unlocks Feature 03 Telegram voice notes)

---

## Goal

Users can attach files directly in the chat window — photos, voice recordings, PDFs, documents. The AI sees and processes them. This brings the chat experience in line with ChatGPT, Claude.ai, and other modern AI products.

---

## Attachment Types & How Each Works

| Type | Extensions | How processed |
|---|---|---|
| Image | jpg, png, gif, webp | Base64 → Claude vision (sees image directly) |
| Audio / Voice | mp3, ogg, wav, m4a, webm | Upload → Whisper transcription → text injected as message |
| PDF | .pdf | Upload → text extraction via `pdf-parse` → injected as context |
| Text/code | txt, md, csv, json, py, ts, etc. | Read directly as text, injected as context |
| Video | mp4, mov, webm | Extract audio track → transcribe (frames are too expensive for now) |
| Other | any | Stored in Files, referenced by name in message |

---

## Backend — New Endpoints

### `app/api/transcribe/route.ts` — NEW

```typescript
// POST /api/transcribe
// Body: FormData with file field
// Returns: { transcript: string, duration_seconds: number }

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  // Option A: OpenAI Whisper API (needs OPENAI_API_KEY)
  if (process.env.OPENAI_API_KEY) {
    const openaiForm = new FormData();
    openaiForm.append('file', file);
    openaiForm.append('model', 'whisper-1');
    openaiForm.append('language', 'es');  // default Spanish, user can override
    
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: openaiForm,
    });
    const data = await res.json();
    return NextResponse.json({ transcript: data.text });
  }

  // Option B: Local Whisper via Ollama (if OPENAI_API_KEY not set)
  // Ollama doesn't support audio yet — use whisper.cpp separately
  // For now return error suggesting API key
  return NextResponse.json({ 
    error: 'Set OPENAI_API_KEY for audio transcription, or use Whisper locally.',
    hint: 'OPENAI_API_KEY costs ~$0.006/min of audio'
  }, { status: 503 });
}
```

**Cost note:** Whisper API is $0.006 per minute of audio. A 30-second voice note = $0.003. Very cheap.

**Language detection:** Whisper auto-detects language. Setting `language: 'es'` speeds it up for Spanish. Can make this configurable per-user in Settings.

---

### `app/api/files/extract/route.ts` — NEW

```typescript
// POST /api/files/extract
// Body: FormData with file field
// Returns: { text: string, pages?: number, filename: string }

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // PDF
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return NextResponse.json({ 
      text: data.text.slice(0, 50000),  // cap at 50k chars
      pages: data.numpages,
      filename: file.name 
    });
  }

  // Plain text files
  const textTypes = ['text/', 'application/json', 'application/javascript'];
  if (textTypes.some(t => file.type.startsWith(t)) || 
      /\.(txt|md|csv|json|ts|tsx|js|jsx|py|sh|yaml|yml|toml|xml|html|css)$/.test(file.name)) {
    const text = buffer.toString('utf-8');
    return NextResponse.json({ text: text.slice(0, 50000), filename: file.name });
  }

  return NextResponse.json({ error: 'Unsupported file type for extraction' }, { status: 415 });
}
```

**Install required:**
```bash
npm install pdf-parse
npm install @types/pdf-parse -D
```

---

### `app/api/chat/route.ts` — Modify to handle image content blocks

The Anthropic API supports multi-modal messages. When a user attaches an image, the message content becomes an array instead of a string:

```typescript
// Current message format:
{ role: 'user', content: 'What is this?' }

// With image:
{ role: 'user', content: [
  { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: '...' } },
  { type: 'text', text: 'What is this?' }
]}
```

The chat API needs to accept an optional `attachments` array in the request body:

```typescript
// In route.ts, extend the request parsing:
const { messages, teamId, provider, model, attachments } = await req.json();

// When building the last user message, inject attachments:
if (attachments && attachments.length > 0 && messages.length > 0) {
  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === 'user') {
    const contentBlocks: Array<{ type: string; [key: string]: unknown }> = [];
    
    for (const att of attachments) {
      if (att.type === 'image') {
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: att.mimeType, data: att.base64 }
        });
      } else if (att.type === 'text') {
        contentBlocks.push({
          type: 'text',
          text: `[Attached file: ${att.filename}]\n\n${att.content}`
        });
      }
    }
    
    contentBlocks.push({ type: 'text', text: lastMsg.content });
    lastMsg.content = contentBlocks;
  }
}
```

---

## Frontend — Chat UI Changes

### `app/(app)/chat/page.tsx`

**1. Add state for pending attachments:**
```typescript
type PendingAttachment = {
  id: string;
  filename: string;
  type: 'image' | 'audio' | 'text' | 'other';
  // For images: base64 data to send to Claude
  base64?: string;
  mimeType?: string;
  // For audio: transcript after processing
  transcript?: string;
  // For text/PDF: extracted text
  content?: string;
  // Display
  previewUrl?: string;  // for images
  status: 'processing' | 'ready' | 'error';
};

const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
```

**2. File input (hidden) + attachment button:**
```tsx
<input
  ref={fileInputRef}
  type="file"
  multiple
  className="hidden"
  accept="image/*,audio/*,.pdf,.txt,.md,.csv,.json,.py,.ts,.tsx,.js"
  onChange={handleFileSelect}
/>

{/* Add this button next to the send button in the input area */}
<button
  type="button"
  onClick={() => fileInputRef.current?.click()}
  className="btn-ghost p-2.5 shrink-0"
  title="Attach file"
>
  <Paperclip size={16} />
</button>
```

**3. `handleFileSelect` function:**
```typescript
async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  
  for (const file of files) {
    const id = Date.now().toString() + Math.random();
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/') || file.name.endsWith('.ogg');
    const isPDF = file.type === 'application/pdf';
    
    // Add as "processing" immediately so user sees it
    setPendingAttachments(prev => [...prev, {
      id, filename: file.name, status: 'processing',
      type: isImage ? 'image' : isAudio ? 'audio' : 'text',
    }]);

    if (isImage) {
      // Convert to base64 for Claude vision
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setPendingAttachments(prev => prev.map(a => a.id === id ? {
          ...a, base64, mimeType: file.type,
          previewUrl: ev.target?.result as string,
          status: 'ready'
        } : a));
      };
      reader.readAsDataURL(file);
      
    } else if (isAudio) {
      // Upload to transcribe endpoint
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
        const data = await res.json();
        setPendingAttachments(prev => prev.map(a => a.id === id ? {
          ...a, transcript: data.transcript, status: 'ready'
        } : a));
      } catch {
        setPendingAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error' } : a));
      }
      
    } else {
      // PDF or text — extract content
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/api/files/extract', { method: 'POST', body: formData });
        const data = await res.json();
        setPendingAttachments(prev => prev.map(a => a.id === id ? {
          ...a, content: data.text, status: 'ready'
        } : a));
      } catch {
        setPendingAttachments(prev => prev.map(a => a.id === id ? { ...a, status: 'error' } : a));
      }
    }
  }
  
  // Reset file input
  e.target.value = '';
}
```

**4. Attachment preview chips** (shown above the textarea when files are pending):
```tsx
{pendingAttachments.length > 0 && (
  <div className="flex flex-wrap gap-2 px-4 py-2" style={{ borderTop: '1px solid var(--color-border)' }}>
    {pendingAttachments.map(att => (
      <div key={att.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
        style={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}>
        {att.status === 'processing' && <Loader2 size={11} className="animate-spin" />}
        {att.type === 'image' && att.previewUrl && (
          <img src={att.previewUrl} alt="" className="w-6 h-6 rounded object-cover" />
        )}
        {att.type === 'audio' && <Mic size={11} />}
        {att.type === 'text' && <FileText size={11} />}
        <span className="max-w-[120px] truncate">{att.filename}</span>
        {att.status === 'ready' && att.type === 'audio' && (
          <span style={{ color: 'var(--color-green)', fontSize: '10px' }}>✓ transcribed</span>
        )}
        <button onClick={() => setPendingAttachments(prev => prev.filter(a => a.id !== att.id))}>
          <X size={10} />
        </button>
      </div>
    ))}
  </div>
)}
```

**5. Modify `sendMessage` to include attachments:**
```typescript
// Build attachments array for API
const attachmentsPayload = pendingAttachments
  .filter(a => a.status === 'ready')
  .map(a => {
    if (a.type === 'image') return { type: 'image', base64: a.base64, mimeType: a.mimeType };
    if (a.type === 'audio') return { type: 'text', content: a.transcript, filename: a.filename };
    return { type: 'text', content: a.content, filename: a.filename };
  });

// Inject audio transcripts into the user's message text:
const audioTranscripts = pendingAttachments
  .filter(a => a.type === 'audio' && a.transcript)
  .map(a => `[Voice note transcript]: "${a.transcript}"`)
  .join('\n');

const fullMessage = audioTranscripts 
  ? `${audioTranscripts}\n\n${userText}` 
  : userText;

// Clear attachments after sending
setPendingAttachments([]);
```

---

## Limits & Safety

- Max file size: 10MB (enforce in frontend before upload)
- Max image size to send to Claude: 5MB (Anthropic limit is 5MB per image)
- Max text extracted from PDF: 50,000 chars (~12,500 tokens) — cap enforced in extract endpoint
- No executable files (.exe, .sh, .bat) — check mime type and extension in frontend
- Images are NOT uploaded to Files storage — they're base64 encoded and sent inline
- Audio IS uploaded briefly to /api/transcribe then discarded (not stored unless user wants)

---

## Optional: Store attachments in Files

If user explicitly attaches a PDF or document, also save it to the Files system:
```typescript
// After extraction, also upload to /api/files/upload
// So it appears in the Files page and can be searched/embedded later
// Only do this for PDFs and documents, not images or audio
```

This is optional — leave it for a future iteration.

---

## New Icons Needed (lucide-react — already installed)
```typescript
import { Paperclip, Mic, FileText, Image } from 'lucide-react';
```

---

## Testing

1. Upload a screenshot → ask "what's in this image?" → Claude should describe it
2. Record a voice note on phone → send as .ogg → should get transcript
3. Upload a PDF → ask "summarize this" → should summarize content
4. Upload a CSV → ask "what are the columns?" → should list them
