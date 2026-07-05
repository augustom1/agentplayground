/**
 * POST /api/admin/seed-skills
 * Upserts comprehensive skills to all existing teams.
 * Safe to re-run — skips skills that already exist by name+teamId.
 * Accepts admin session OR CRON_SECRET Bearer token.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

type SkillDef = {
  name: string;
  category: string;
  description: string;
  instructions: string;
};

type TeamSkillSeed = {
  teamName: string;
  skills: SkillDef[];
};

const SKILL_SEEDS: TeamSkillSeed[] = [
  {
    teamName: "Dev Core",
    skills: [
      {
        name: "Blog System Build",
        category: "code",
        description: "Build /blog/generate page and /blog/[slug] renderer end-to-end.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 1.
Steps:
1. Create data/blog/ directory for markdown post files.
2. Build /blog page: list all .md files in data/blog/ with title, date, excerpt.
3. Build /blog/[slug] page: read data/blog/<slug>.md, render markdown, no auth required.
4. Build /blog/generate page (auth required): topic input + optional outline + Generate button.
5. On submit: delegate_to_team("Business & Growth", "Write blog post: [topic] [outline]").
6. On completion: write_file to data/blog/<slug>.md + create_pending_action("Blog draft ready: [title]").
Use Next.js App Router. Read data/blog/*.md with fs.readdirSync in a server component.`,
      },
      {
        name: "CV Public Page Build",
        category: "code",
        description: "Build /public/cv/[username] route — public, no auth, reads from Brain.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 2.
Steps:
1. Create app/public/cv/[username]/page.tsx — no auth check (public route).
2. Read CV content from AgentMemory (key: cv_content) via prisma.agentMemory.findFirst.
3. Render as clean HTML — no app sidebar or nav, print-friendly layout.
4. Update middleware.ts to exclude /public/** from auth protection.
5. Add Traefik or Next.js redirect for cv.agentplayground.net → /public/cv/augusto.
No "use client". Server component only. Mobile responsive.`,
      },
      {
        name: "Jobs Page Build",
        category: "code",
        description: "Build /jobs page — paste job description, get AI analysis + cover letter.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 3.
Steps:
1. Create app/(app)/jobs/page.tsx with text area for job description + "Analyze" button.
2. On submit: POST to /api/jobs/analyze — delegate to Job Search team.
3. Show results card: fit %, matched skills, skill gaps, recommendation, cover letter draft.
4. "Save to Brain" button: POST to /api/jobs/save — vault_write with job details + analysis.
5. Jobs history: list past analyses from Brain (vault_search "job analysis").
Auth required. Use server actions or API route for delegation.`,
      },
      {
        name: "LLM Provider Settings UI",
        category: "code",
        description: "Build /settings/providers page — configure API keys and defaults per team.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 4.
Backend is already done in lib/providers/ and lib/providers/types.ts.
Steps:
1. Create a LLMProviderConfig DB model if not in schema: {id, userId, provider, apiKey (encrypted), isDefault, teamId?}.
2. Build app/(app)/settings/providers/page.tsx listing Anthropic, OpenAI, Ollama.
3. Per provider: masked API key input, "Test Connection" button, status badge (OK/Error/Not Set).
4. Ollama section: fetch http://ollama:11434/api/tags to list available models.
5. Save button POSTs to /api/settings/providers.
Check schema first — do not add model if it already exists.`,
      },
      {
        name: "Empty States",
        category: "code",
        description: "Add empty state UI components to all pages that show blank divs when no data.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 6.
Pages to fix: /plans, /agent-lab, /brain, /schedule.
Per page create an <EmptyState> component with:
- Large muted lucide-react icon
- Headline (what the page does)
- One-sentence description
- CTA button that opens the relevant create dialog or action

| Page | Icon | Headline | CTA |
|------|------|----------|-----|
| /plans | GitBranch | "No plans yet" | "Create a Plan" |
| /agent-lab | Bot | "No teams yet" | "Create a Team" |
| /brain | Brain | "Brain is empty" | "Index Docs" (POST /api/admin/index-docs) |
| /schedule | Calendar | "Nothing scheduled" | "Schedule an Event" |

Check if page renders empty — only show EmptyState when data array length === 0.`,
      },
      {
        name: "Admin Monitoring Panel",
        category: "code",
        description: "Build monitoring dashboard: DB size, Brain stats, Ollama status, API usage chart.",
        instructions: `Spec: docs/context/dev/05-feature-roadmap.md — Priority 5.
Build at app/admin/monitoring/page.tsx (or expand admin/system).
Sections to show:
1. DB size: SELECT pg_size_pretty(pg_database_size(current_database())) via prisma.$queryRaw.
2. Brain stats: COUNT BrainDocument, COUNT BrainChunk — prisma.brainDocument.count().
3. Ollama status: fetch http://ollama:11434/api/tags — show loaded models + "Healthy"/"Down".
4. Task volumes: COUNT tasks by status (pending/running/completed/failed) from last 7 days.
5. API usage chart: prisma.apiUsage.groupBy day+model, last 30 days. Render with recharts BarChart.
6. PendingAction count: unresolved items.
Auto-refresh every 60 seconds with a useEffect + setInterval in a Client Component.
Admin-only route.`,
      },
      {
        name: "Context Review & Dev Planning",
        category: "general",
        description: "Read all dev context files from Brain and produce a 30-day dev work plan.",
        instructions: `This skill is used for the team planning session. Run it with qwen2.5:7b.
Steps:
1. vault_search("dev platform build state feature roadmap") — retrieve current build state.
2. vault_search("code conventions tech stack") — retrieve standards.
3. Review your agents' capabilities (Alex: architecture, Sofia: frontend, Marcus: backend, Elena: DB).
4. Create a 30-day work plan with:
   - Week 1: [tasks that can be done with local LLM — template fills, docs, empty states]
   - Week 2: [tasks needing Claude — complex features like blog system, jobs page]
   - Week 3-4: [infrastructure and monitoring tasks]
5. For each task: estimate complexity (S/M/L), model needed (local/claude), owner agent.
6. vault_write("dev:work-plan-[date]", formatted plan).
Output a structured markdown plan.`,
      },
    ],
  },
  {
    teamName: "DevOps & Infrastructure",
    skills: [
      {
        name: "Standard Deploy",
        category: "code",
        description: "Deploy changed files to VPS and rebuild the dashboard container.",
        instructions: `Read docs/context/dev/06-infrastructure-ops.md before executing.
Steps:
1. vps_exec: verify which files changed (git diff or check timestamps).
2. SCP changed files: scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
3. vps_exec: "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
4. vps_exec: "docker logs dashboard --tail 50" — check for errors and unhandledRejection.
5. Report: container status, any errors found.
NEVER use git pull on VPS. NEVER use --no-verify. If directories were deleted, flag that --no-cache is needed.`,
      },
      {
        name: "No-Cache Rebuild",
        category: "code",
        description: "Force a full Docker rebuild — required after deleting directories.",
        instructions: `Use this when: directories were deleted, major structural changes, cache corruption suspected.
Steps:
1. vps_exec: "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache dashboard"
2. vps_exec: "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d dashboard"
3. vps_exec: "docker logs dashboard --tail 100" — verify startup, no unhandledRejection.
This takes longer (3-5 min). Only use when standard deploy is not sufficient.`,
      },
      {
        name: "VPS Health Check",
        category: "general",
        description: "Full health check of all VPS containers, disk, memory, and app logs.",
        instructions: `Run these checks via vps_exec and report status:
1. "docker compose -f docker-compose.yml -f docker-compose.prod.yml ps" — all containers Up?
2. "docker stats --no-stream" — CPU/memory per container. Flag if any >80% RAM.
3. "df -h" — disk usage. Flag if >80% used.
4. "docker logs dashboard --tail 200 | grep -i 'error\|unhandledRejection'" — app errors.
5. "curl -s http://localhost:11434/api/tags | head -c 200" — Ollama responsive?
Report per service: OK / WARNING / DOWN.
Critical: unhandledRejection in dashboard logs = app is broken even if container shows Up.`,
      },
      {
        name: "SensorGuard Cleanup",
        category: "code",
        description: "Remove all SensorGuard/GuardTech demo files after 2026-06-19.",
        instructions: `Context: docs/context/dev/03-build-state.md — Demo/Temp section.
DO NOT run before 2026-06-19. Confirm date before executing.
Steps:
1. vps_exec: "rm -rf /root/opt/vps/sites/guardtech.conf"
2. vps_exec: "rm -rf /root/opt/vps/webroot/guardtech/"
3. Edit docker-compose.prod.yml: remove the guardtech Traefik router labels block.
4. Rebuild with --no-cache (deleted directories): use "No-Cache Rebuild" skill.
5. Verify: curl https://guardtech.agentplayground.net should return 404.
After VPS cleanup: delete local branch feature/sensorguard-demo.`,
      },
      {
        name: "Telegram Env Setup",
        category: "code",
        description: "Add missing Telegram env vars to VPS and restart dashboard.",
        instructions: `Context: docs/context/dev/06-infrastructure-ops.md — Environment Variables.
Missing vars: TELEGRAM_GROUP_CHAT_ID, TELEGRAM_OWNER_CHAT_ID.
Steps:
1. Ask user for TELEGRAM_GROUP_CHAT_ID and TELEGRAM_OWNER_CHAT_ID values (request_human_input).
2. vps_exec: "echo 'TELEGRAM_GROUP_CHAT_ID=[value]' >> /root/opt/vps/.env.local"
3. vps_exec: "echo 'TELEGRAM_OWNER_CHAT_ID=[value]' >> /root/opt/vps/.env.local"
4. vps_exec: restart dashboard container (standard restart, no rebuild needed for env change).
5. Verify: send test message via Telegram bot.`,
      },
      {
        name: "Context Review & Infra Planning",
        category: "general",
        description: "Read infra context files and produce a 30-day infrastructure work plan.",
        instructions: `This skill is used for the team planning session. Run it with qwen2.5:7b.
Steps:
1. vault_search("infrastructure operations VPS deploy containers") — retrieve infra context.
2. vault_search("build state pending infrastructure work") — retrieve what's missing.
3. Review: what infrastructure tasks are pending (from docs/context/dev/06-infrastructure-ops.md)?
4. Create a 30-day infra plan:
   - Immediate (week 1): SensorGuard cleanup date, Telegram env setup
   - Week 2: monitoring panel deploy, disk usage audit
   - Week 3-4: capacity planning for first client, Stripe webhook setup
5. For each task: complexity (S/M/L), can it run with local tools (vps_exec)?
6. vault_write("infra:work-plan-[date]", formatted plan).`,
      },
    ],
  },
  {
    teamName: "Business & Growth",
    skills: [
      {
        name: "Blog Post Writer",
        category: "communication",
        description: "Write a full blog post following the content strategy in context docs.",
        instructions: `Context: docs/context/business/05-content-and-marketing.md.
Input: topic + optional outline.
Steps:
1. vault_search("content strategy blog") — retrieve brand voice and target post list.
2. Check if this topic matches any priority posts in 05-content-and-marketing.md.
3. Write a 1500-2200 word blog post:
   - Intro: hook (problem or surprising fact)
   - Body: technical walkthrough or personal story, broken into 3-4 sections with headers
   - Conclusion: what you learned / what to do next
   - CTA: one clear next step for the reader
4. Brand voice: direct, builder's perspective, no corporate buzzwords. Show real numbers.
5. vault_write("content:draft:[slug]", post content).
6. create_pending_action("Blog draft ready for review: [title]").
Output: the full post + suggested slug + SEO keywords.`,
      },
      {
        name: "Client Proposal Writer",
        category: "communication",
        description: "Draft a 1-page client proposal based on their needs and our service tiers.",
        instructions: `Context: docs/context/business/02-services-and-pricing.md and 03-client-delivery.md.
Input: client name, industry, what they need.
Steps:
1. vault_search("services pricing tiers") — retrieve current tiers and value props.
2. Match client needs to the most appropriate tier.
3. Write a 1-page proposal:
   - Who we are (1 sentence)
   - What we'll do for [Client] (bullet list, 4-6 specific deliverables)
   - Recommended tier + monthly price
   - What's included / not included
   - Next step (sign + send invoice)
4. Output in clean markdown.
Keep it under 400 words. Be concrete. No generic language.`,
      },
      {
        name: "Growth Phase Assessment",
        category: "research",
        description: "Assess which growth phase we're in and what's needed to reach the next one.",
        instructions: `Context: docs/context/business/06-growth-roadmap.md.
Steps:
1. vault_search("growth roadmap phases milestones") — retrieve growth context.
2. Assess current phase: Personal OS (Phase 1) is done. Are we at Phase 2 (first client) yet?
3. What's blocking the next phase? List concrete gaps.
4. List 3 immediate actions that would unlock the next phase.
5. Check: what risks exist (from 06-growth-roadmap.md Risk Watch section)?
6. vault_write("business:growth-assessment-[date]", assessment).
Output: current phase, blockers, 3 next actions, top risks. Keep to 1 page.`,
      },
      {
        name: "Social Media Posts",
        category: "communication",
        description: "Write 2-3 social media posts (LinkedIn + Twitter) for a given topic.",
        instructions: `Context: docs/context/business/05-content-and-marketing.md — Social Media section.
Input: topic or recent work to post about.
Steps:
1. vault_search("brand voice social media content strategy").
2. Write 1 LinkedIn post (200-300 words): builder's story format, numbers-first or lesson learned.
3. Write 2 Twitter/X posts (280 chars each): punchy, specific, no buzzwords.
4. Do NOT write: generic "AI is changing everything", vague predictions, competitor mentions.
5. Output all posts clearly labeled by platform.
Brand voice: direct, technical, unpretentious. POV: builder sharing real experience.`,
      },
      {
        name: "Client Onboarding Checklist",
        category: "general",
        description: "Run the full onboarding flow for a new client: project, brief, actions.",
        instructions: `Context: docs/context/business/03-client-delivery.md — Client Lifecycle.
Input: client name, service tier, contact email.
Steps:
1. create_project(name: "[ClientName] — [Service]", description: brief summary).
2. vault_write("client:[client-slug]/brief", "# Client Brief\n[collect: business name, industry, target audience, brand tone, existing accounts]").
3. save_memory(key: "client_[slug]_tier", value: tier name).
4. create_pending_action for each onboarding step:
   - "Collect brand brief from [client]"
   - "Deploy chatbot for [client]"
   - "Send welcome message to [client]"
5. Return: project ID + pending action IDs + next steps for coordinator.`,
      },
      {
        name: "Context Review & Business Planning",
        category: "general",
        description: "Read all business context files and produce a 30-day business work plan.",
        instructions: `This skill is used for the team planning session. Run it with qwen2.5:7b.
Steps:
1. vault_search("business company overview services pricing growth roadmap content strategy") — retrieve context.
2. vault_search("clients projects pending actions") — what business work is in flight?
3. Assess: where are we in the growth roadmap? What phase?
4. Create a 30-day business plan with:
   - Content: which blog posts to write (from priority list in context), cadence
   - Sales: target client profile, outreach approach, proposal template to prepare
   - Finance: billing setup tasks still needed, Monotributo monitoring
   - Growth: what milestone unlocks Phase 2?
5. Flag tasks that can run on local LLM (proposal drafts, social posts, blog research) vs Claude (strategy decisions).
6. vault_write("business:work-plan-[date]", plan).`,
      },
    ],
  },
  {
    teamName: "Product & Design",
    skills: [
      {
        name: "Feature Spec from Roadmap",
        category: "general",
        description: "Pick the next unbuilt feature from the roadmap and write a full spec.",
        instructions: `Context: docs/context/dev/05-feature-roadmap.md and 03-build-state.md.
Steps:
1. vault_search("feature roadmap build state") — retrieve what's built and what's next.
2. Pick the highest priority unbuilt feature.
3. Write a spec with:
   - Problem: what user need does this solve?
   - User stories (As a [role], I want to [action] so that [benefit])
   - Acceptance criteria (checkboxes)
   - Edge cases (empty state, error state, mobile view)
   - Teams needed (Dev Core for implementation, DevOps for deploy)
   - Estimated complexity: S / M / L
4. Use ICE scoring: Impact × Confidence / Effort (1-10 each).
5. Output in clean markdown.`,
      },
      {
        name: "UX Audit",
        category: "general",
        description: "Review a page or flow for usability, design system compliance, and gaps.",
        instructions: `Design system: docs/context/dev/02-tech-stack.md — Styling section.
Design System v4: charcoal #1a1a1a background (light mode: white/grey), blue-cyan #38BDF8 brand accent via --color-brand, lucide-react icons.
Review checklist:
- [ ] Dark theme consistent (bg-gray-900/950, text-gray-100/400)
- [ ] Status colors: green=healthy, yellow=idle, red=error, blue=deploying
- [ ] Cards: rounded-xl border border-gray-700 bg-gray-800/50 p-4/6
- [ ] Empty state exists when data is empty
- [ ] Loading state exists during fetch
- [ ] Error state exists if API fails
- [ ] Mobile: no horizontal scroll, tap targets ≥44px
- [ ] Keyboard navigable
Output: list of issues with severity (P0/P1/P2) and suggested fix.`,
      },
      {
        name: "Context Review & Product Planning",
        category: "general",
        description: "Read context docs and produce a 30-day product/design work plan.",
        instructions: `This skill is used for the team planning session. Run it with qwen2.5:7b.
Steps:
1. vault_search("feature roadmap build state product design") — retrieve context.
2. List all features in roadmap. For each: is a spec needed before Dev Core builds it?
3. Identify UX gaps: which existing pages have missing empty/error/loading states?
4. Create a 30-day product plan:
   - Week 1: write specs for Priority 1 + 2 features
   - Week 2: UX audit of /plans, /agent-lab, /brain, /schedule
   - Week 3: empty state designs + test plans
   - Week 4: QA checklist for deployed features
5. Flag: which tasks can James (local LLM) do vs Aria (Claude needed)?
6. vault_write("product:work-plan-[date]", plan).`,
      },
    ],
  },
  {
    teamName: "CV Advisory",
    skills: [
      {
        name: "CV Full Builder",
        category: "general",
        description: "Assemble a complete CV from Brain context and memory.",
        instructions: `Context: docs/context/personal/personal-profile.md.
Steps:
1. recall_memories(key: "cv_content") — get current CV draft if it exists.
2. vault_search("personal profile skills experience education") — get additional context.
3. Build a complete CV with:
   - Professional Summary (2-3 sentences: who, what you build, differentiator)
   - Technical Skills (grouped: Frontend, Backend, Infrastructure, AI/ML)
   - Work Experience (STAR format: Situation, Task, Action, Result with metrics)
   - Education
   - Notable Projects (with tech stack and outcome)
4. save_memory(key: "cv_content", value: formatted markdown CV).
5. If any section is missing, list the specific questions to ask the user.
Output: complete CV + list of missing info.`,
      },
      {
        name: "Interview Prep",
        category: "general",
        description: "Generate interview questions and coaching notes for a specific role/company.",
        instructions: `Input: job description or company + role.
Steps:
1. recall_memories(key: "cv_content") — know what's on the CV.
2. Generate 10 likely interview questions (mix of behavioral + technical).
3. For each question: suggested answer structure using CV facts.
4. Include: 3 questions to ask the interviewer that show initiative.
5. Red flags to watch for in this type of role/company.
Output in Q&A format. Use STAR format for behavioral answers.`,
      },
      {
        name: "Context Review & CV Planning",
        category: "general",
        description: "Identify CV gaps from profile context and create a fill-in plan.",
        instructions: `This skill is used for the team planning session. Run with qwen2.5:7b.
Steps:
1. vault_search("personal profile CV skills experience") — retrieve what's known.
2. recall_memories(key: "cv_content") — check current CV state.
3. Identify exactly what's missing: professional summary, experience dates, education, etc.
4. Create pending actions for each missing piece (create_pending_action for each).
5. Draft the CV sections you CAN fill from existing context.
6. vault_write("cv:gap-analysis-[date]", gap analysis).
Output: what's complete, what's missing, 3 highest priority gaps to fill.`,
      },
    ],
  },
  {
    teamName: "Education & Learning",
    skills: [
      {
        name: "Learning Path Creator",
        category: "general",
        description: "Create a structured 90-day learning path based on skill gaps and goals.",
        instructions: `Context: docs/context/personal/education-goals.md.
Steps:
1. vault_search("education goals learning skills gaps") — retrieve context.
2. Identify Tier 1 priorities (high-priority skill gaps for target roles).
3. Build a 90-day plan with weekly topics:
   - Week 1-4: [Tier 1 Topic A] — 2 resources + 1 practice project
   - Week 5-8: [Tier 1 Topic B] — 2 resources + 1 practice project
   - Week 9-12: [Tier 2 cert or project] — milestones
4. For each resource: name, URL (if known), format (video/text/interactive), estimated hours.
5. vault_write("learning:path-[date]", full plan).
Output: weekly plan with resources and practice projects.`,
      },
      {
        name: "Resource Finder",
        category: "research",
        description: "Find the 3 best learning resources for a given topic.",
        instructions: `Input: topic to learn.
Steps:
1. web_search("[topic] best course tutorial 2025 free")
2. web_search("[topic] documentation getting started guide")
3. Evaluate top results: prefer official docs, reputable platforms (MDN, freeCodeCamp, official GitHub).
4. Return 3 resources with: title, URL, format, estimated time, why it's good.
5. vault_write("learning:resources-[topic-slug]", formatted list).
Output: 3 resources clearly labeled with rationale.`,
      },
      {
        name: "Context Review & Learning Planning",
        category: "general",
        description: "Review education goals and create a concrete 30-day study plan.",
        instructions: `This skill is used for the team planning session. Run with qwen2.5:7b.
Steps:
1. vault_search("education learning goals skills tier") — retrieve context.
2. Identify Tier 1 gaps (highest priority skills not yet learned).
3. Create a 30-day study plan: 1 topic per week, resources + practice project.
4. Estimate time needed per topic (hours/week).
5. Identify certifications that would strengthen the CV in next 6 months.
6. vault_write("learning:month-plan-[date]", plan).
Output: 4-week plan with topics, resources, and practice projects.`,
      },
    ],
  },
  {
    teamName: "Job Search",
    skills: [
      {
        name: "Job Fit Analyzer",
        category: "research",
        description: "Analyze a job description and score fit against current CV.",
        instructions: `Input: job description text.
Steps:
1. recall_memories(key: "cv_content") — get CV.
2. Extract from job: required skills, nice-to-have skills, red flags, company culture signals.
3. Compare required skills vs CV skills:
   - Match: list skills the user has that are required
   - Gap: list required skills not on CV
4. Score: Fit % = matched required skills / total required skills × 100.
5. Output:
   - Fit %
   - Matched skills
   - Skill gaps (with time-to-learn estimate if possible)
   - Red flags
   - Recommendation: Apply / Skip / Apply with caveats
   - 3 things to highlight in cover letter`,
      },
      {
        name: "Cover Letter Writer",
        category: "communication",
        description: "Write a tailored cover letter for a job, using CV from Brain.",
        instructions: `Input: job description + company name + role.
Steps:
1. recall_memories(key: "cv_content") — get CV for facts and metrics.
2. Identify: what does this company value? What problem does this role solve for them?
3. Write a 3-paragraph cover letter (300 words max):
   - Paragraph 1: Hook — why this role at this company, specific to them (not generic)
   - Paragraph 2: Match — 2 specific past achievements (with metrics from CV) that directly address their need
   - Paragraph 3: Close — what you'd do in the first 30 days, ask for interview
4. Lead with action. No "I am writing to apply for..." opener.
5. Output the cover letter in clean markdown.`,
      },
      {
        name: "Context Review & Job Search Planning",
        category: "general",
        description: "Build a job search strategy from profile context.",
        instructions: `This skill is used for the team planning session. Run with qwen2.5:7b.
Steps:
1. vault_search("personal profile skills career goals job search") — retrieve context.
2. recall_memories(key: "cv_content") — check CV state.
3. Identify target role types based on current skills (full-stack, AI engineer, tech lead?).
4. Create job search strategy:
   - Target roles: [list based on skill profile]
   - Platforms to use: LinkedIn, AngelList, remote-specific boards
   - Keywords for job search: [list from skills]
   - Outreach approach: direct application vs. networking message
   - CV gaps to fill before applying: [from gap analysis]
5. vault_write("jobs:search-strategy-[date]", strategy).`,
      },
    ],
  },
];

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && process.env.CRON_SECRET) {
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }
  const session = await auth();
  return !!(session?.user && (session.user as { role?: string }).role === "admin");
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return apiError("Admin access required", 403);

  const results: Array<{ team: string; skill: string; status: "created" | "skipped" | "error"; error?: string }> = [];

  for (const seed of SKILL_SEEDS) {
    const team = await prisma.agentTeam.findFirst({
      where: { name: seed.teamName },
      select: { id: true, name: true },
    });

    if (!team) {
      for (const skill of seed.skills) {
        results.push({ team: seed.teamName, skill: skill.name, status: "error", error: "Team not found" });
      }
      continue;
    }

    for (const skill of seed.skills) {
      try {
        const existing = await prisma.skill.findFirst({
          where: { teamId: team.id, name: skill.name },
          select: { id: true },
        });

        if (existing) {
          results.push({ team: seed.teamName, skill: skill.name, status: "skipped" });
          continue;
        }

        await prisma.skill.create({
          data: { ...skill, teamId: team.id },
        });
        results.push({ team: seed.teamName, skill: skill.name, status: "created" });
      } catch (err) {
        results.push({ team: seed.teamName, skill: skill.name, status: "error", error: String(err) });
      }
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const errors = results.filter((r) => r.status === "error").length;

  return NextResponse.json({
    success: true,
    created,
    skipped,
    errors,
    results,
    message: `Skills seeded: ${created} created, ${skipped} already existed, ${errors} errors.`,
  });
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return apiError("Admin access required", 403);

  const preview = SKILL_SEEDS.map((s) => ({
    team: s.teamName,
    skills: s.skills.map((sk) => sk.name),
    count: s.skills.length,
  }));

  return NextResponse.json({
    total: SKILL_SEEDS.reduce((acc, s) => acc + s.skills.length, 0),
    teams: preview,
  });
}
