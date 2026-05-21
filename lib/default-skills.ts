/**
 * Default Skills — Built-in skills that ship with the platform
 *
 * These are registered on first startup and cannot be deleted.
 */

export interface DefaultSkill {
  name: string;
  description: string;
  category: string;
  instructions: string;
}

export const DEFAULT_SKILLS: DefaultSkill[] = [
  // ─── Small Business Skills ────────────────────────────────────────────────
  {
    name: "Invoice Generator",
    description:
      "Create professional invoices from project data, time logs, or plain-language descriptions. Outputs Markdown invoice ready to send or save.",
    category: "business",
    instructions:
      "When asked to create an invoice: 1) Extract client name, items, quantities, rates, and due date from the user's input. 2) Calculate line totals and grand total. 3) Format as a clean Markdown invoice with your logo placeholder, itemized table, subtotal, tax line (if applicable), and payment instructions. 4) Optionally save to vault with vault_write using path 'Invoices/<ClientName>-<Date>.md'. Always confirm totals before finalizing.",
  },
  {
    name: "CRM Contact Manager",
    description:
      "Track client contacts, interactions, and deal stages. Log calls, emails, and notes. Query and update the vault-based CRM.",
    category: "business",
    instructions:
      "Manage contacts and deals via the Brain vault. Schema: 'CRM/Contacts/<Name>.md' with fields: email, phone, company, deal_stage (lead/prospect/proposal/won/lost), last_contact, notes[]. Operations: 1) ADD — create or update the note. 2) LOG — append a timestamped interaction entry. 3) SEARCH — use vault_search with terms. 4) REPORT — list all contacts in a given stage. Always include ISO 8601 timestamps on log entries.",
  },
  {
    name: "Proposal Writer",
    description:
      "Draft client proposals from a requirements brief. Includes executive summary, scope, timeline, pricing, and next steps.",
    category: "business",
    instructions:
      "When asked to write a proposal: 1) Ask for (or extract from context): client name, problem statement, proposed solution, deliverables, timeline, and price. 2) Draft a structured proposal: Executive Summary → Problem → Solution → Deliverables → Timeline (table) → Investment → Next Steps → Signature block. 3) Write in professional but warm tone. 4) Save to vault at 'Proposals/<ClientName>-<Date>.md'. Offer to revise any section.",
  },
  {
    name: "Client Onboarding",
    description:
      "Guide new clients through onboarding: collect info, set up project in Brain, create welcome materials, and schedule kickoff.",
    category: "business",
    instructions:
      "Run the onboarding flow: 1) Collect: client name, email, project name, goals, timeline, budget, and primary contact. 2) Create a project note in vault at 'Clients/<ClientName>/Project.md' with all collected info. 3) Create a welcome message summarizing what happens next. 4) Use schedule_task to book a kickoff meeting in 48-72 hours. 5) Log the onboarding start in CRM. Report back with a summary of what was set up.",
  },
  {
    name: "Project Status Reporter",
    description:
      "Generate status reports from tasks, plans, and vault notes. Summarizes progress, blockers, and upcoming milestones.",
    category: "business",
    instructions:
      "To generate a status report: 1) Search vault for project notes and outputs (vault_search). 2) List any open tasks or plans via the data tools. 3) Synthesize into a report with sections: Overall Status (RAG: 🟢/🟡/🔴), Completed This Week, In Progress, Blockers, Next Milestones, Decisions Needed. 4) Save to vault at 'Reports/<ProjectName>-<Date>.md'. Keep it concise — a reader should understand the state in under 2 minutes.",
  },
  {
    name: "Meeting Summarizer",
    description:
      "Turn meeting transcripts, notes, or recordings into structured summaries with decisions, action items, and owners.",
    category: "business",
    instructions:
      "When given meeting content (transcript, notes, or recording text): 1) Identify: meeting date, attendees, agenda/topic. 2) Extract: key decisions (numbered list), action items (table: item | owner | due date), open questions, and next meeting date if mentioned. 3) Write a 2-3 sentence executive summary. 4) Save to vault at 'Meetings/<Date>-<Topic>.md'. Return the structured summary in the chat. If given audio, first transcribe using available tools.",
  },
  {
    name: "Sales Email Writer",
    description:
      "Craft personalized sales emails, follow-ups, and outreach sequences. Adapts tone to prospect stage and context.",
    category: "business",
    instructions:
      "Write sales emails based on context: 1) Ask for (or infer): prospect name, company, their pain point, your solution, and the desired CTA. 2) Choose tone based on stage: cold outreach = curiosity + brief; follow-up = value + urgency; proposal follow-up = confident + clear next step. 3) Structure: hook (1 sentence) → problem acknowledgment → value prop → social proof (if available) → CTA. 4) Keep under 150 words for cold, under 200 for warm. 5) Offer 2-3 subject line options. Never use generic openers like 'I hope this email finds you well'.",
  },
  {
    name: "Support Ticket Handler",
    description:
      "Triage and draft responses to support requests. Classifies by severity, looks up relevant docs from Brain, and drafts a reply.",
    category: "business",
    instructions:
      "Handle support tickets: 1) Classify severity: P1 (down/data loss) / P2 (broken feature) / P3 (UX issue) / P4 (question). 2) Search vault for relevant docs, past resolutions, or known issues (vault_search). 3) Draft a response: acknowledge the issue, provide solution or workaround, include ETA for P1/P2, and close with next steps. 4) Log the ticket to vault at 'Support/<Date>-<TicketID>.md'. For P1 issues, flag immediately and recommend escalation.",
  },
  // ─── Design & UX ─────────────────────────────────────────────────────────
  {
    name: "UI/UX Pro Max",
    description:
      "Activates expert UI/UX mode. Analyses interfaces, proposes improvements, writes copy, specifies components, and generates Tailwind/CSS code following design system tokens.",
    category: "design",
    instructions: `You are a senior UI/UX designer and frontend engineer with 15+ years of experience. When this skill is active:

ANALYSIS: Before suggesting changes, diagnose: visual hierarchy, whitespace rhythm, contrast ratios (WCAG AA minimum), interaction affordances, and mobile-first layout.

DESIGN PRINCIPLES you always enforce:
- Information density: show only what the user needs right now — progressive disclosure for the rest.
- Touch targets: minimum 44×44px on mobile. Never place destructive actions adjacent to primary CTAs.
- Feedback: every interactive element must have a visible hover, focus, and active state.
- Typography: max 75 chars per line. Use size + weight for hierarchy, not color alone.
- Color: use design system tokens (var(--color-*)) exclusively. Never hardcode hex values.
- Spacing: use 4px grid (Tailwind: gap-1 to gap-16 multiples only).

OUTPUT FORMAT for UI tasks:
1. Problem summary (2-3 bullets of what's broken/suboptimal)
2. Proposed solution with rationale
3. Code snippet (Tailwind classes + JSX, matching current codebase patterns)
4. Accessibility checklist (aria labels, keyboard nav, color contrast)

For copy: write in active voice, plain language, under 10 words for labels, under 25 for descriptions.`,
  },
  // ─── System Skills ────────────────────────────────────────────────────────
  {
    name: "Build Agent Team",
    description:
      "Create and configure new agent teams from natural language descriptions. Understands requirements and builds teams with appropriate agents, skills, and permissions.",
    category: "system",
    instructions:
      "When a user describes a need, analyze the requirements and create a team with: 1) Appropriate name and description, 2) Individual agents with specific roles, 3) Relevant skills, 4) CLI functions if needed. Use the create_team, create_agent, and add_skill tools.",
  },
  {
    name: "MCP Server",
    description:
      "Connect to and manage Model Context Protocol (MCP) servers. Enables agents to access external tools, APIs, and data sources through the MCP standard.",
    category: "system",
    instructions:
      "Use MCP to connect agents to external services. Supports: 1) Connecting to MCP servers via stdio or HTTP, 2) Listing available tools from connected servers, 3) Routing tool calls to the correct server. Configure via the team's config JSON.",
  },
  {
    name: "CLI Execute",
    description:
      "Execute CLI commands safely with confirmation for dangerous operations. Supports templated commands with argument substitution.",
    category: "system",
    instructions:
      "Execute registered CLI functions. Rules: 1) Only run commands registered via add_cli_function, 2) Commands marked 'dangerous' require explicit user confirmation, 3) Capture and return stdout/stderr, 4) Time out after 60 seconds.",
  },
  {
    name: "File Management",
    description:
      "Read, write, and organize files through the FileBrowser integration. Keeps project files structured and accessible.",
    category: "system",
    instructions:
      "Manage files through the FileBrowser API. Capabilities: 1) List directory contents, 2) Read file contents, 3) Create/update files, 4) Organize files into folders, 5) Search for files. All operations go through the FileBrowser REST API.",
  },
  {
    name: "Database Query",
    description:
      "Query the platform database through the Database Agent. Returns scoped data based on the requesting team's permissions.",
    category: "data",
    instructions:
      "Use the query_data tool to read from the database. Available tables: agent_teams, agents, tasks, skills, scheduled_jobs, activity_logs, improvements. Results are filtered by the requesting team's permissions.",
  },
  {
    name: "Schedule Task",
    description:
      "Schedule tasks on the calendar for future execution. Supports one-time and recurring schedules (daily, weekly, monthly).",
    category: "system",
    instructions:
      "Use the schedule_task tool to create calendar entries. Specify: 1) Which team handles the task, 2) Title and description, 3) Date/time (ISO 8601), 4) Recurrence pattern. Tasks appear on the Schedule calendar page.",
  },
  {
    name: "Import/Export Teams",
    description:
      "Export agent team configurations as JSON for backup or sharing. Import team configs from files or URLs to quickly set up new environments.",
    category: "system",
    instructions:
      "Export: GET /api/export-team/:id returns full team config JSON. Import: POST /api/import-team with team config JSON creates the team, agents, skills, and CLI functions.",
  },
];

/** The default Database Agent team definition */
export const DB_AGENT_TEAM = {
  name: "Database Agent",
  description:
    "System agent that manages all database access. Other agents request data through this team, which enforces permission scopes.",
  port: 9000,
  language: "TypeScript / Internal",
  config: {
    permissions: ["db:read:all", "db:write:all", "files:read", "files:write", "teams:create", "teams:delete", "skills:manage"],
    isSystemTeam: true,
  },
};

/** The default File Manager team definition */
export const FILE_AGENT_TEAM = {
  name: "File Manager",
  description:
    "System agent that organizes and manages files through FileBrowser. Keeps project files structured and accessible.",
  port: 9001,
  language: "TypeScript / Internal",
  config: {
    permissions: ["db:read:own_team", "db:write:own_team", "files:read", "files:write"],
    isSystemTeam: true,
  },
};
