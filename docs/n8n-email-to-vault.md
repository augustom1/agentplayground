# n8n: Email → Vault Pipeline

Routes emails (Gmail or IMAP) into the vault automatically via n8n.

## Prerequisites

- n8n running at `https://n8n.agentplayground.net`
- Gmail or IMAP credentials configured in n8n
- `BRAIN_SECRET` set in `.env.local`

---

## Workflow: Gmail Trigger → Vault Ingest

### Nodes

**1. Gmail Trigger**
- Resource: Message
- Event: Message Received
- Poll every: 5 minutes
- Filters: (optional) Label = INBOX, not spam

**2. Function (parse body)**
```javascript
const subject = $json.subject || "(no subject)";
const from = $json.from || "";
const body = $json.text || $json.snippet || "";

// Strip quoted reply chains (everything after "On ... wrote:")
const cleaned = body.replace(/^On .+wrote:[\s\S]*/m, "").trim();

return [{
  json: {
    title: subject,
    text: `From: ${from}\nSubject: ${subject}\n\n${cleaned}`,
    tags: ["#email", "#inbox"]
  }
}];
```

**3. HTTP Request**
- Method: POST
- URL: `https://app.agentplayground.net/api/brain/ingest`
- Headers:
  - `Content-Type: application/json`
  - `x-brain-secret: {{ $env.BRAIN_SECRET }}`
- Body (JSON):
```json
{
  "text": "{{ $json.text }}",
  "title": "{{ $json.title }}",
  "tags": {{ $json.tags }}
}
```

---

## Workflow: IMAP Trigger → Vault Ingest

Same as above but use the **IMAP Email** trigger node instead of Gmail.

**IMAP settings:**
- Host: your mail server
- Port: 993 (SSL) or 143 (STARTTLS)
- User/Password: your email credentials

---

## Import JSON

Paste this into n8n → Import Workflow:

```json
{
  "name": "Email to Vault",
  "nodes": [
    {
      "parameters": {
        "pollTimes": { "item": [{ "mode": "everyX", "value": 5, "unit": "minutes" }] },
        "filters": {}
      },
      "name": "Gmail Trigger",
      "type": "n8n-nodes-base.gmailTrigger",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const subject = $json.subject || '(no subject)';\nconst from = $json.from || '';\nconst body = $json.text || $json.snippet || '';\nconst cleaned = body.replace(/^On .+wrote:[\\s\\S]*/m, '').trim();\nreturn [{ json: { title: subject, text: `From: ${from}\\nSubject: ${subject}\\n\\n${cleaned}`, tags: ['#email', '#inbox'] } }];"
      },
      "name": "Parse Email",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://app.agentplayground.net/api/brain/ingest",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "x-brain-secret", "value": "={{ $env.BRAIN_SECRET }}" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "text", "value": "={{ $json.text }}" },
            { "name": "title", "value": "={{ $json.title }}" },
            { "name": "tags", "value": "={{ $json.tags }}" }
          ]
        }
      },
      "name": "Save to Brain",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Gmail Trigger": { "main": [[{ "node": "Parse Email", "type": "main", "index": 0 }]] },
    "Parse Email": { "main": [[{ "node": "Save to Brain", "type": "main", "index": 0 }]] }
  }
}
```

---

## Notes

- Emails are saved to `inbox/YYYY-MM-DD-HH-MM-<slug>.md` with `#email` and `#inbox` tags
- The vault indexer (separate n8n workflow from `n8n-vault-indexer.md`) will embed the note for semantic search
- For large threads, only the latest message body is captured (quoted replies stripped)
- To filter specific senders or subjects, add a **Filter** node between Gmail Trigger and Parse Email
