# Content Strategy & Marketing

> Used by Business & Growth team, blog agents, and coordinator when producing any outbound content.

---

## Brand Voice

- **Tone:** Direct, technical, unpretentious. No corporate buzzwords.
- **POV:** Builder's perspective. "Here's what I built and why it works."
- **Audience:** Spanish-speaking developers, freelancers, and small agency owners in Latin America who are curious about AI but haven't seen a real implementation.
- **Language:** Spanish for LatAm-facing content; English for developer/technical posts targeting global audience.

---

## Blog Strategy

### Platform
- Blog lives at `/blog` in the app (rendered from `data/blog/<slug>.md`)
- Auto-generated via `/blog/generate` page (not built yet — next feature)
- Each post: coordinator drafts → Augusto reviews → publishes to file

### Target Posts (Priority Order)

1. **"Cómo construí un coordinador de IA que gestiona toda mi empresa"**
   - Angle: personal story — replaced $1,500/mo of VA work with a $50/mo AI stack
   - Target: Spanish-speaking freelancers / small agency owners
   - SEO: "automatización con IA freelance", "agentes de IA para negocios"
   - Length: 1,800–2,200 words
   - Includes: architecture diagram, tool list, monthly cost breakdown

2. **"The Personal OS Stack: coordinators, agent teams, and local LLMs"**
   - Angle: technical flagship — how the whole system works
   - Target: English-speaking developers interested in AI agents
   - SEO: "ai agent coordinator", "personal AI OS", "local LLM production"
   - Length: 2,500 words
   - Includes: code snippets, architecture, cost comparison

3. **"Por qué uso Ollama para tareas nocturnas de IA (y cómo ahorro $X/mes)"**
   - Angle: practical cost optimization
   - Target: developers already using Claude/OpenAI who want to cut costs
   - SEO: "ollama producción", "local LLM costos", "qwen agentes"
   - Length: 1,200–1,500 words

4. **"Facturación crypto como monotributista: cómo lo automaticé con agentes IA"**
   - Angle: hyper-specific to Argentine freelancers
   - Target: Argentine devs who bill in USD/crypto
   - SEO: "monotributo crypto", "facturación dólares argentina freelance"
   - Publish after: crypto billing agents are built

5. **"Configurar un Monotributo como desarrollador freelance en Argentina"**
   - Angle: practical guide, not AI-focused
   - Target: Argentine devs starting freelance
   - SEO: "monotributo desarrollador", "freelance tecnología argentina"

---

## Content Calendar

| Cadence | Type | Who |
|---|---|---|
| Monthly | 1 blog post | Business team drafts, Augusto reviews |
| Weekly | 2–3 social posts | Content agents auto-generate from recent work |
| Per project | Case study | After completing a notable client project |
| Per feature | Dev blog | After shipping a significant platform feature |

---

## Social Media

### Platforms
- **LinkedIn**: professional audience, Spanish + English, longer posts OK
- **Twitter/X**: dev community, English, technical threads
- No Instagram, TikTok, or Facebook for now — add when clients need content for their own accounts

### Post Formats That Work
- "I built X in Y hours — here's how": builder thread
- "Cost breakdown: AI vs hiring a VA": numbers-first post
- "Lesson learned from [project]": authentic, short
- Avoid: generic "AI is changing everything" hot takes

---

## SEO Keywords (Seed List)

**Spanish (LatAm)**
- coordinador de IA, agentes de IA para negocios, automatización freelance
- monotributo tecnología, facturación crypto argentina
- plataforma IA argentina, asistente IA empresa

**English (Global)**
- ai agent coordinator, personal AI OS, self-hosted AI agents
- local LLM production, ollama deployment, ai team automation
- next.js ai agent platform, pgvector rag production

---

## Content Agent Workflow

When Business team or coordinator creates content:
1. Draft stored in Brain (`source: content:draft:[slug]`)
2. Coordinator surfaces to Augusto as PendingAction: "Draft ready for review: [title]"
3. Augusto approves/edits via chat
4. Coordinator writes final to `data/blog/<slug>.md` using `write_file`
5. Log output to project: `log_project_output`
6. Post teaser to social via scheduled task

---

## What NOT to Write

- Don't make specific revenue claims without real data
- Don't write about features that don't exist yet (wait until shipped)
- Don't compare negatively to specific competitors by name
- Don't promise timelines for the SaaS version without checking HANDOFF.md first
