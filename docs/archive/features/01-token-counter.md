# Feature 01 — Token Counter in Chat

> Status: ⬜ Not started
> Effort: 2-3 hours
> Dependencies: none

---

## Goal

Show users how many tokens each message uses and the running session cost, directly in the chat UI. This helps users understand Claude API costs and is a standard feature in any AI chat product.

---

## What It Looks Like (UX)

**In the message area:**
- Each assistant message shows a small faded label on hover: `↑ 1,240 · ↓ 892 tokens`
- The input box shows a live character-to-token estimate as you type: `~45 tokens` in the bottom-right corner of the textarea

**Persistent session bar** (below the message list, above the input):
```
↑ 3,420 in  ↓ 2,180 out  ·  ~$0.021  ·  Session total: 5,600 tokens
```

**Model shown:** The model name (e.g., `claude-sonnet-4-6`) shown next to the cost so users know what rate applies.

---

## Backend Changes

### `app/api/chat/route.ts`

After the final stream chunk is sent, append a usage sentinel line:

```typescript
// After the streaming loop ends, append usage data
const usagePayload = JSON.stringify({
  input: response.usage.input_tokens,
  output: response.usage.output_tokens,
  model: modelId,
});
controller.enqueue(encoder.encode(`\n[USAGE:${usagePayload}]`));
```

The Anthropic SDK's streaming response exposes usage via:
```typescript
// For non-streaming (tool loop iterations):
response.usage.input_tokens
response.usage.output_tokens

// For streaming:
// Accumulate usage from stream events or use finalMessage.usage after stream.finalMessage()
```

**Important:** The tool loop in chat/route.ts runs multiple Anthropic calls per user message. Accumulate tokens across all iterations:
```typescript
let totalInputTokens = 0;
let totalOutputTokens = 0;

// Inside the tool loop, after each client.messages.create():
totalInputTokens += response.usage.input_tokens;
totalOutputTokens += response.usage.output_tokens;

// After loop ends, append sentinel:
controller.enqueue(encoder.encode(`\n[USAGE:${JSON.stringify({ input: totalInputTokens, output: totalOutputTokens, model: modelId })}]`));
```

---

## Frontend Changes

### `app/(app)/chat/page.tsx`

**1. Parse the usage sentinel from the stream:**

```typescript
// In the stream reading loop, check for the sentinel:
if (accumulated.includes('[USAGE:')) {
  const usageMatch = accumulated.match(/\[USAGE:({.*?})\]/);
  if (usageMatch) {
    const usage = JSON.parse(usageMatch[1]);
    setLastMessageUsage(usage);
    setSessionUsage(prev => ({
      input: prev.input + usage.input,
      output: prev.output + usage.output,
    }));
    // Strip the sentinel from the displayed text
    accumulated = accumulated.replace(/\n?\[USAGE:{.*?}\]/, '');
  }
}
```

**2. State to add:**
```typescript
const [lastMessageUsage, setLastMessageUsage] = useState<{ input: number; output: number; model: string } | null>(null);
const [sessionUsage, setSessionUsage] = useState({ input: 0, output: 0 });
```

**3. Cost calculation helper:**
```typescript
function calcCost(input: number, output: number, model: string): string {
  // Prices per 1k tokens (as of 2026)
  const rates: Record<string, { in: number; out: number }> = {
    'claude-sonnet-4-6': { in: 0.003, out: 0.015 },
    'claude-opus-4-6':   { in: 0.015, out: 0.075 },
    'claude-haiku-4-5':  { in: 0.00025, out: 0.00125 },
  };
  const rate = rates[model] ?? rates['claude-sonnet-4-6'];
  const cost = (input / 1000) * rate.in + (output / 1000) * rate.out;
  return cost < 0.001 ? '<$0.001' : `$${cost.toFixed(3)}`;
}
```

**4. Live typing estimate** (in textarea onChange):
```typescript
// Rough estimate: 1 token ≈ 4 characters
const estimatedTokens = Math.ceil(inputText.length / 4);
```

**5. Session bar component** (render below messages, above input area):
```tsx
{sessionUsage.input > 0 && (
  <div className="px-4 py-1.5 flex items-center gap-3 text-[11px]"
    style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-muted)' }}>
    <span>↑ {sessionUsage.input.toLocaleString()} in</span>
    <span>·</span>
    <span>↓ {sessionUsage.output.toLocaleString()} out</span>
    <span>·</span>
    <span style={{ color: 'var(--color-text-secondary)' }}>
      {calcCost(sessionUsage.input, sessionUsage.output, lastMessageUsage?.model ?? 'claude-sonnet-4-6')}
    </span>
    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
      {lastMessageUsage?.model ?? 'claude-sonnet-4-6'}
    </span>
  </div>
)}
```

**6. Per-message hover label** (on assistant message bubbles):
```tsx
// Wrap message bubble in a div with group class, show usage on hover
<div className="group relative">
  {/* message bubble */}
  {msg.usage && (
    <div className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity
                    text-[10px] whitespace-nowrap"
      style={{ color: 'var(--color-muted)' }}>
      ↑{msg.usage.input} · ↓{msg.usage.output}
    </div>
  )}
</div>
```

---

## Store Usage Per Message

Add `usage` field to the `ChatMessage` type in the chat page:
```typescript
type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  usage?: { input: number; output: number; model: string };
};
```

After parsing the sentinel, attach it to the current assistant message.

---

## Notes

- Ollama calls have 0 token cost — show "local model · free" instead of a cost
- OpenAI calls use different pricing — add OpenAI rates to `calcCost` if needed
- Reset session total when user starts a new conversation (clear messages button)
- Do NOT save token usage to the chat_messages DB table — it's display-only for now
  (ApiUsage table already tracks real usage via `lib/usage-tracker.ts`)
