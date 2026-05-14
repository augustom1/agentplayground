/**
 * Chat Tools — Tool definitions for Claude tool-use
 *
 * These tools are available to Claude during chat conversations.
 * When a user asks to create teams, agents, skills, etc., Claude
 * calls these tools to make it happen.
 */

import { prisma } from "@/lib/prisma";
import { PERMISSION_PRESETS } from "@/lib/agent-permissions";
import { saveTeamConfig, initTeamBrain } from "@/lib/brain";
import fs from "fs";
import path from "path";

const FILES_ROOT = process.env.FILES_ROOT || path.join(process.cwd(), "data", "files");
const MAX_READ_BYTES = 50 * 1024; // 50 KB cap on file reads

function safeFilePath(rel: string): string {
  if (!fs.existsSync(FILES_ROOT)) fs.mkdirSync(FILES_ROOT, { recursive: true });
  const resolved = path.resolve(FILES_ROOT, rel.replace(/^\/+/, ""));
  if (!resolved.startsWith(FILES_ROOT)) throw new Error("Path traversal not allowed");
  return resolved;
}

/** Anthropic tool definition format */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/** All tools available to Claude in chat */
export const CHAT_TOOLS: ToolDefinition[] = [
  {
    name: "create_team",
    description:
      "Create a new agent team. Use this when the user wants to set up a new team of agents for a specific purpose (e.g., marketing, data analysis, customer support). Returns the created team.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the team" },
        description: { type: "string", description: "What this team does" },
        port: { type: "number", description: "Port number (default: auto-assigned)" },
        language: { type: "string", description: "Runtime language (default: Python / FastAPI)" },
        permissionPreset: {
          type: "string",
          enum: ["admin", "standard", "builder", "readonly"],
          description: "Permission level (default: standard)",
        },
      },
      required: ["name", "description"],
    },
  },
  {
    name: "create_agent",
    description:
      "Create an individual agent within a team. Use this after creating a team to add agents with specific roles, models, and capabilities.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "ID of the team to add the agent to" },
        name: { type: "string", description: "Agent name" },
        description: { type: "string", description: "What the agent does" },
        model: { type: "string", description: "AI model (default: claude-sonnet-4-6)" },
        capabilities: {
          type: "array",
          items: { type: "string" },
          description: "List of capability tags",
        },
        systemPrompt: { type: "string", description: "System prompt for the agent" },
      },
      required: ["teamId", "name"],
    },
  },
  {
    name: "add_skill",
    description:
      "Register a skill that an agent team can use. Skills define capabilities like data analysis, file processing, API calls, etc.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        name: { type: "string", description: "Skill name" },
        description: { type: "string", description: "What the skill does" },
        category: {
          type: "string",
          enum: ["general", "data", "communication", "code", "research", "system"],
          description: "Skill category",
        },
        instructions: { type: "string", description: "How to use this skill" },
      },
      required: ["teamId", "name", "description"],
    },
  },
  {
    name: "add_cli_function",
    description:
      "Register a CLI command that agents can execute. Use for system operations, file management, deployments, etc.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        name: { type: "string", description: "Function name" },
        command: { type: "string", description: "CLI command template" },
        description: { type: "string", description: "What it does" },
        dangerous: { type: "boolean", description: "Requires confirmation? (default: false)" },
      },
      required: ["teamId", "name", "command"],
    },
  },
  {
    name: "schedule_task",
    description:
      "Schedule a task on the calendar for a specific date and time. Can be one-time or recurring.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID" },
        teamName: { type: "string", description: "Team name" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Task description" },
        scheduledFor: { type: "string", description: "ISO 8601 datetime" },
        recurring: {
          type: "string",
          enum: ["none", "daily", "weekly", "monthly"],
          description: "Recurrence (default: none)",
        },
      },
      required: ["teamId", "teamName", "title", "scheduledFor"],
    },
  },
  {
    name: "query_data",
    description:
      "Query the database for information. Use this to look up teams, agents, tasks, skills, activity logs, or scheduled jobs.",
    input_schema: {
      type: "object",
      properties: {
        table: {
          type: "string",
          enum: ["agent_teams", "agents", "tasks", "skills", "scheduled_jobs", "activity_logs", "improvements", "projects"],
          description: "Which table to query",
        },
        filters: {
          type: "object",
          description: "Optional filters (e.g., { status: 'active' })",
        },
      },
      required: ["table"],
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for current information, news, research data, market insights, or any factual queries. Use this whenever you need up-to-date information.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        num_results: {
          type: "number",
          description: "Number of results to return (default: 5, max: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "web_browse",
    description:
      "Fetch and read the content of a specific web page. Use for research, extracting data from URLs, reading documentation, monitoring pages, or gathering competitor intelligence.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to browse (must include https://)" },
      },
      required: ["url"],
    },
  },
  {
    name: "create_chatbot",
    description:
      "Create a chatbot agent with a specific persona and purpose. The chatbot is added to a team and can handle customer service, support, domain Q&A, or any conversational task.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to add this chatbot to" },
        name: { type: "string", description: "Chatbot name" },
        persona: {
          type: "string",
          description: "Chatbot personality, role, and behavior instructions",
        },
        welcomeMessage: {
          type: "string",
          description: "Opening message shown to users",
        },
        topics: {
          type: "array",
          items: { type: "string" },
          description: "Topics and domains this chatbot handles",
        },
      },
      required: ["teamId", "name", "persona"],
    },
  },
  {
    name: "delegate_to_team",
    description:
      "Delegate a task to a specific agent team. Use this as the Coordinator to assign work to the right team. Creates a tracked task record in the system.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to delegate to" },
        teamName: { type: "string", description: "Team name" },
        title: { type: "string", description: "Task title" },
        description: { type: "string", description: "Detailed task description" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Task priority (default: medium)",
        },
      },
      required: ["teamId", "teamName", "title", "description"],
    },
  },
  {
    name: "list_available_skills",
    description: "List all default and custom skills available in the system.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "list_team_details",
    description:
      "Get the full details of a specific agent team, including all its agents, skills, and CLI functions. Use this when the user wants to review or modify an existing team.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "The team ID to retrieve" },
      },
      required: ["teamId"],
    },
  },
  {
    name: "update_team",
    description:
      "Update an existing agent team's name, description, language, or status. Use this when the user wants to rename a team or change its configuration.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to update" },
        name: { type: "string", description: "New team name (optional)" },
        description: { type: "string", description: "New description (optional)" },
        language: { type: "string", description: "New runtime language (optional)" },
        status: {
          type: "string",
          enum: ["healthy", "idle", "error", "deploying"],
          description: "New status (optional)",
        },
      },
      required: ["teamId"],
    },
  },
  {
    name: "update_agent",
    description:
      "Update an existing agent's name, description, AI model, system prompt, or capabilities. Use this to refine how an agent behaves.",
    input_schema: {
      type: "object",
      properties: {
        agentId: { type: "string", description: "Agent ID to update" },
        name: { type: "string", description: "New name (optional)" },
        description: { type: "string", description: "New description (optional)" },
        model: { type: "string", description: "New AI model (optional)" },
        systemPrompt: { type: "string", description: "New system prompt (optional)" },
        capabilities: {
          type: "array",
          items: { type: "string" },
          description: "New capabilities list (optional)",
        },
      },
      required: ["agentId"],
    },
  },
  {
    name: "log_improvement",
    description:
      "Log an optimization opportunity, repeated pattern, or learning detected in the system. Use this proactively whenever you notice a task that could be automated, a workflow that repeats, or an inefficiency that could be reduced. These logs form the basis of the self-improvement flywheel.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for this improvement" },
        description: {
          type: "string",
          description: "Detailed description — what pattern was detected, what could be automated, how it would reduce cost or effort",
        },
        category: {
          type: "string",
          enum: ["performance", "accuracy", "efficiency", "automation", "cost", "general"],
          description: "Category of improvement (default: efficiency)",
        },
        impact: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Estimated impact level (default: medium)",
        },
        source: {
          type: "string",
          description: "What triggered this insight — e.g., 'repeated user request', 'task pattern', 'manual workflow'",
        },
      },
      required: ["title", "description"],
    },
  },
  {
    name: "generate_tool",
    description:
      "Convert a repeated workflow or manual process into a permanent, reusable skill in the tools catalog. Use this when you have identified a pattern that should become a tool — it creates a skill record so future tasks can use it instead of re-solving from scratch. This is the core of the local optimization loop.",
    input_schema: {
      type: "object",
      properties: {
        teamId: { type: "string", description: "Team ID to associate this skill with" },
        name: { type: "string", description: "Tool/skill name — should be action-oriented (e.g., 'Parse Invoice PDF', 'Send Weekly Report')" },
        description: {
          type: "string",
          description: "What this tool does and when to use it",
        },
        category: {
          type: "string",
          enum: ["general", "data", "communication", "code", "research", "system"],
          description: "Skill category",
        },
        instructions: {
          type: "string",
          description: "Step-by-step instructions for how to execute this tool — detailed enough that an agent can follow them without reasoning from scratch",
        },
        generatedFrom: {
          type: "string",
          description: "Describe the repeated pattern or manual process this tool was generated from",
        },
      },
      required: ["teamId", "name", "description", "instructions"],
    },
  },
  // ─── File System Tools ───────────────────────────────────────────────────────
  {
    name: "list_files",
    description:
      "List files and folders in the shared file storage. Use to browse what files are available before reading them.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to list (default: root)" },
      },
    },
  },
  {
    name: "read_file",
    description:
      "Read the text content of a file from shared storage. Use to inspect documents, configs, CSVs, code, etc. Only works on text files (not images or PDFs).",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to read" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Create or overwrite a text file in shared storage. Use to save reports, logs, generated code, analysis results, or any text content produced during a task.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path to write (e.g. 'reports/analysis.md')" },
        content: { type: "string", description: "Text content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "delete_file",
    description: "Delete a file or empty folder from shared storage.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File or folder path to delete" },
      },
      required: ["path"],
    },
  },
  {
    name: "search_files",
    description:
      "Semantically search across embedded files using natural language. Returns the most relevant file chunks. Only works on files that have been embedded (use the Embed button in the Files page, or the embed endpoint).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query" },
        limit: { type: "number", description: "Max results to return (default: 5)" },
      },
      required: ["query"],
    },
  },
  // ─── 2nd Brain / Vault Tools ─────────────────────────────────────────────────
  {
    name: "vault_search",
    description:
      "Semantically search the 2nd Brain vault. Use this before starting any research task to find relevant context the user has already saved. Returns notes ranked by relevance.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural language search query" },
        limit: { type: "number", description: "Max results to return (default: 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "vault_read",
    description: "Read the full content of a specific vault note by its path. Use after vault_search to get complete note content.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Note path returned by vault_search (e.g. 'inbox/2026-05-04-10-30-my-note.md')" },
      },
      required: ["path"],
    },
  },
  {
    name: "vault_write",
    description:
      "Save a note, finding, summary, or research result to the 2nd Brain vault. Use this to preserve any important information the user will need later. Content is indexed for semantic search.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Descriptive note title" },
        content: { type: "string", description: "Note content in markdown" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags for organization (e.g. ['#research', '#finance', '#agent'])",
        },
      },
      required: ["title", "content"],
    },
  },
  // ─── Memory Tools ─────────────────────────────────────────────────────────────
  {
    name: "save_memory",
    description:
      "Save an important fact, preference, or decision to long-term memory. Use this whenever the user tells you something they want you to remember, or when you make a significant routing decision. Memory persists across conversations.",
    input_schema: {
      type: "object",
      properties: {
        content: { type: "string", description: "The fact, preference, or decision to remember" },
        memoryType: {
          type: "string",
          enum: ["fact", "preference", "decision", "output"],
          description: "Type of memory (default: fact)",
        },
        importance: {
          type: "number",
          description: "Importance score 0.0–1.0 (default: 0.7). Higher = recalled first.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "recall_memories",
    description:
      "Recall stored memories from past conversations. Use this when the user references something from a previous session or you need context about their preferences.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of memories to recall (default: 15)" },
      },
    },
  },
  // ─── Project Tools ────────────────────────────────────────────────────────────
  {
    name: "create_project",
    description:
      "Create a new project to organize agent work around a goal. Projects group teams, tasks, and outputs. Use this whenever the user describes a goal that will involve multiple steps, agents, or recurring work.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Project name" },
        description: { type: "string", description: "What this project accomplishes" },
        type: {
          type: "string",
          enum: ["one-time", "recurring", "permanent"],
          description: "one-time = finite goal, recurring = repeating schedule, permanent = ongoing operation",
        },
        deliveryChannel: {
          type: "string",
          description: "Where to deliver outputs: 'chat', 'telegram', 'email' (optional)",
        },
      },
      required: ["name", "description"],
    },
  },
  {
    name: "list_projects",
    description: "List all projects with their status, type, and team assignments. Use when the user asks about ongoing work, active projects, or wants a status report.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["active", "paused", "completed", "archived"],
          description: "Filter by status (omit to list all active projects)",
        },
      },
    },
  },
  {
    name: "update_project",
    description: "Update a project's status, description, or type. Use to mark projects complete, pause them, or archive them.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        status: {
          type: "string",
          enum: ["active", "paused", "completed", "archived"],
          description: "New status",
        },
        description: { type: "string", description: "Updated description (optional)" },
        deliveryChannel: { type: "string", description: "Updated delivery channel (optional)" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "log_project_output",
    description: "Record an output produced by agents for a project — a report, decision, piece of content, or file. This builds the project's output history.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project ID" },
        agentId: { type: "string", description: "Agent ID that produced the output (use 'keeper' if unknown)" },
        type: {
          type: "string",
          enum: ["report", "content", "data", "file", "decision"],
          description: "Output type",
        },
        title: { type: "string", description: "Output title" },
        content: { type: "object", description: "Output content (any JSON)" },
      },
      required: ["projectId", "agentId", "type", "title"],
    },
  },
  {
    name: "search_tools",
    description:
      "Search for safe npm packages, Python packages, or MCP servers to install on the VPS. Returns packages with safety scores, download counts, and license info before installing anything.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What you need (e.g., 'web scraping', 'image processing', 'database client')" },
        type: { type: "string", enum: ["npm", "pip", "mcp", "any"], description: "Package ecosystem to search (default: npm)" },
        packageName: { type: "string", description: "Specific package name to look up safety info for (optional)" },
      },
      required: ["query"],
    },
  },
  {
    name: "install_tool",
    description:
      "Install a verified safe npm, pip, or MCP package on the VPS and register it as a CLI function for an agent team. Runs a safety check first — will not install dangerous or low-quality packages.",
    input_schema: {
      type: "object",
      properties: {
        package: { type: "string", description: "Package name (e.g., 'puppeteer', 'requests', '@modelcontextprotocol/server-github')" },
        type: { type: "string", enum: ["npm", "pip", "mcp"], description: "Package ecosystem" },
        teamId: { type: "string", description: "Team ID to register the installed tool with" },
        purpose: { type: "string", description: "What this tool will be used for" },
        version: { type: "string", description: "Specific version to install (optional, defaults to latest)" },
      },
      required: ["package", "type", "teamId", "purpose"],
    },
  },
  {
    name: "plan_task",
    description:
      "Generate a detailed step-by-step execution plan for a task and save it to the Brain (at plans/<taskId>.md). The plan includes objective, context from the vault, numbered steps with checkboxes, and expected output. Agent teams read this plan before starting work. Use this for any complex or multi-step task before delegating.",
    input_schema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "ID of an existing Task to generate a plan for" },
      },
      required: ["taskId"],
    },
  },
];

/**
 * Execute a tool call from Claude.
 * Returns the result as a string for Claude to interpret.
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case "create_team":
        return await toolCreateTeam(input);
      case "create_agent":
        return await toolCreateAgent(input);
      case "add_skill":
        return await toolAddSkill(input);
      case "add_cli_function":
        return await toolAddCliFunction(input);
      case "schedule_task":
        return await toolScheduleTask(input);
      case "query_data":
        return await toolQueryData(input);
      case "web_search":
        return await toolWebSearch(input);
      case "web_browse":
        return await toolWebBrowse(input);
      case "create_chatbot":
        return await toolCreateChatbot(input);
      case "delegate_to_team":
        return await toolDelegateToTeam(input);
      case "list_available_skills":
        return await toolListSkills();
      case "list_team_details":
        return await toolListTeamDetails(input);
      case "update_team":
        return await toolUpdateTeam(input);
      case "update_agent":
        return await toolUpdateAgent(input);
      case "log_improvement":
        return await toolLogImprovement(input);
      case "generate_tool":
        return await toolGenerateTool(input);
      case "list_files":
        return await toolListFiles(input);
      case "read_file":
        return await toolReadFile(input);
      case "write_file":
        return await toolWriteFile(input);
      case "delete_file":
        return await toolDeleteFile(input);
      case "search_files":
        return await toolSearchFiles(input);
      case "save_memory":
        return await toolSaveMemory(input);
      case "recall_memories":
        return await toolRecallMemories(input);
      case "create_project":
        return await toolCreateProject(input);
      case "list_projects":
        return await toolListProjects(input);
      case "update_project":
        return await toolUpdateProject(input);
      case "log_project_output":
        return await toolLogProjectOutput(input);
      case "search_tools":
        return await toolSearchTools(input);
      case "install_tool":
        return await toolInstallTool(input);
      case "vault_search":
        return await toolVaultSearch(input);
      case "vault_read":
        return await toolVaultRead(input);
      case "vault_write":
        return await toolVaultWrite(input);
      case "plan_task":
        return await toolPlanTask(input);
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

async function toolCreateTeam(input: Record<string, unknown>): Promise<string> {
  const preset = (input.permissionPreset as string) || "standard";
  const permissions = PERMISSION_PRESETS[preset] || PERMISSION_PRESETS.standard;

  const team = await prisma.agentTeam.create({
    data: {
      name: input.name as string,
      description: input.description as string,
      port: (input.port as number) || 8000 + Math.floor(Math.random() * 1000),
      language: (input.language as string) || "Python / FastAPI",
      config: { permissions },
    },
  });

  await prisma.activityLog.create({
    data: {
      action: `Created agent team "${team.name}"`,
      type: "deploy",
      teamName: team.name,
      teamId: team.id,
    },
  });

  initTeamBrain(team.id, team.name, team.description).catch(() => {});
  saveTeamConfig(team.id).catch(() => {});

  return JSON.stringify({
    success: true,
    team: { id: team.id, name: team.name, description: team.description, port: team.port },
    message: `Team "${team.name}" created successfully with ${preset} permissions.`,
  });
}

async function toolCreateAgent(input: Record<string, unknown>): Promise<string> {
  const agent = await prisma.agent.create({
    data: {
      name: input.name as string,
      description: (input.description as string) || null,
      model: (input.model as string) || "claude-sonnet-4-6",
      capabilities: (input.capabilities as string[]) || [],
      systemPrompt: (input.systemPrompt as string) || null,
      teamId: input.teamId as string,
    },
  });

  saveTeamConfig(agent.teamId).catch(() => {});

  return JSON.stringify({
    success: true,
    agent: { id: agent.id, name: agent.name, model: agent.model },
    message: `Agent "${agent.name}" added to the team.`,
  });
}

async function toolAddSkill(input: Record<string, unknown>): Promise<string> {
  const skill = await prisma.skill.create({
    data: {
      name: input.name as string,
      description: input.description as string,
      category: (input.category as string) || "general",
      instructions: (input.instructions as string) || null,
      teamId: input.teamId as string,
    },
  });

  saveTeamConfig(skill.teamId).catch(() => {});

  return JSON.stringify({
    success: true,
    skill: { id: skill.id, name: skill.name },
    message: `Skill "${skill.name}" registered.`,
  });
}

async function toolAddCliFunction(input: Record<string, unknown>): Promise<string> {
  const fn = await prisma.cliFunction.create({
    data: {
      name: input.name as string,
      command: input.command as string,
      description: (input.description as string) || null,
      dangerous: (input.dangerous as boolean) || false,
      teamId: input.teamId as string,
    },
  });

  saveTeamConfig(fn.teamId).catch(() => {});

  return JSON.stringify({
    success: true,
    function: { id: fn.id, name: fn.name },
    message: `CLI function "${fn.name}" registered.`,
  });
}

async function toolScheduleTask(input: Record<string, unknown>): Promise<string> {
  const job = await prisma.scheduledJob.create({
    data: {
      title: input.title as string,
      description: (input.description as string) || null,
      scheduledFor: new Date(input.scheduledFor as string),
      recurring: (input.recurring as string) || "none",
      teamId: input.teamId as string,
      teamName: input.teamName as string,
    },
  });

  return JSON.stringify({
    success: true,
    job: { id: job.id, title: job.title, scheduledFor: job.scheduledFor },
    message: `Task "${job.title}" scheduled.`,
  });
}

async function toolQueryData(input: Record<string, unknown>): Promise<string> {
  const table = input.table as string;
  const filters = (input.filters as Record<string, unknown>) || {};

  let data: unknown;
  switch (table) {
    case "agent_teams":
      data = await prisma.agentTeam.findMany({
        where: filters as never,
        include: { _count: { select: { agents: true, tasks: true, skills: true } } },
        take: 20,
      });
      break;
    case "agents":
      data = await prisma.agent.findMany({ where: filters as never, take: 20 });
      break;
    case "tasks":
      data = await prisma.task.findMany({ where: filters as never, take: 20, orderBy: { createdAt: "desc" } });
      break;
    case "skills":
      data = await prisma.skill.findMany({ where: filters as never, take: 50 });
      break;
    case "scheduled_jobs":
      data = await prisma.scheduledJob.findMany({ where: filters as never, take: 20, orderBy: { scheduledFor: "asc" } });
      break;
    case "activity_logs":
      data = await prisma.activityLog.findMany({ where: filters as never, take: 20, orderBy: { createdAt: "desc" } });
      break;
    case "improvements":
      data = await prisma.improvement.findMany({ where: filters as never, take: 20, orderBy: { createdAt: "desc" } });
      break;
    case "projects":
      data = await prisma.project.findMany({ where: { ...(filters as never), status: (filters as Record<string,string>).status ?? { not: "archived" } }, take: 20, orderBy: { createdAt: "desc" } });
      break;
    default:
      return JSON.stringify({ error: `Unknown table: ${table}` });
  }

  return JSON.stringify({ success: true, data, count: Array.isArray(data) ? data.length : 0 });
}

async function toolListSkills(): Promise<string> {
  const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
  return JSON.stringify({
    success: true,
    skills: skills.map((s: { name: string; description: string; category: string }) => ({ name: s.name, description: s.description, category: s.category })),
    count: skills.length,
  });
}

async function toolListTeamDetails(input: Record<string, unknown>): Promise<string> {
  const team = await prisma.agentTeam.findUnique({
    where: { id: input.teamId as string },
    include: {
      agents: true,
      skills: true,
      cliFunctions: true,
      _count: { select: { tasks: true } },
    },
  });
  if (!team) return JSON.stringify({ error: "Team not found" });
  return JSON.stringify({ success: true, team });
}

async function toolUpdateTeam(input: Record<string, unknown>): Promise<string> {
  const updateData: {
    name?: string;
    description?: string;
    language?: string;
    status?: string;
  } = {};
  if (input.name) updateData.name = input.name as string;
  if (input.description !== undefined) updateData.description = input.description as string;
  if (input.language) updateData.language = input.language as string;
  if (input.status) updateData.status = input.status as string;

  const team = await prisma.agentTeam.update({
    where: { id: input.teamId as string },
    data: updateData,
  });

  await prisma.activityLog.create({
    data: {
      action: `Updated agent team "${team.name}"`,
      type: "deploy",
      teamName: team.name,
      teamId: team.id,
    },
  });

  return JSON.stringify({
    success: true,
    team: { id: team.id, name: team.name },
    message: `Team "${team.name}" updated successfully.`,
  });
}

async function toolUpdateAgent(input: Record<string, unknown>): Promise<string> {
  const updateData: {
    name?: string;
    description?: string;
    model?: string;
    systemPrompt?: string;
    capabilities?: string[];
  } = {};
  if (input.name) updateData.name = input.name as string;
  if (input.description !== undefined) updateData.description = input.description as string;
  if (input.model) updateData.model = input.model as string;
  if (input.systemPrompt !== undefined) updateData.systemPrompt = input.systemPrompt as string;
  if (input.capabilities) updateData.capabilities = input.capabilities as string[];

  const agent = await prisma.agent.update({
    where: { id: input.agentId as string },
    data: updateData,
  });

  return JSON.stringify({
    success: true,
    agent: { id: agent.id, name: agent.name },
    message: `Agent "${agent.name}" updated successfully.`,
  });
}

async function toolWebSearch(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;
  const numResults = (input.num_results as number) || 5;

  try {
    // Use Brave Search if key is configured
    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    if (braveKey) {
      const res = await fetch(
        `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${numResults}`,
        { headers: { "X-Subscription-Token": braveKey, Accept: "application/json" } }
      );
      const data = await res.json();
      const results = (data.web?.results || []).map((r: Record<string, string>) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      }));
      return JSON.stringify({ success: true, query, results, source: "Brave Search" });
    }

    // Fallback: DuckDuckGo Instant Answer API
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "AgentDashboard/1.0" } }
    );
    const data = await res.json();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    if (data.Abstract) {
      results.push({ title: data.Heading, url: data.AbstractURL, snippet: data.Abstract });
    }
    for (const topic of (data.RelatedTopics || []).slice(0, numResults - 1)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.split(" - ")[0] || topic.Text,
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
    }

    return JSON.stringify({
      success: true,
      query,
      results,
      source: "DuckDuckGo",
      note: "For full web search results, set BRAVE_SEARCH_API_KEY in your environment.",
    });
  } catch (err) {
    return JSON.stringify({ error: `Web search failed: ${String(err)}` });
  }
}

async function toolWebBrowse(input: Record<string, unknown>): Promise<string> {
  const url = input.url as string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgentDashboard/1.0)" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      return JSON.stringify({ error: `HTTP ${res.status}: ${res.statusText}` });
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text")) {
      return JSON.stringify({ error: `Non-text content type: ${contentType}` });
    }

    const html = await res.text();
    // Extract readable text: strip scripts, styles, then tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);

    return JSON.stringify({ success: true, url, content: text, length: text.length });
  } catch (err) {
    return JSON.stringify({ error: `Browse failed: ${String(err)}` });
  }
}

async function toolCreateChatbot(input: Record<string, unknown>): Promise<string> {
  const systemPrompt = [
    input.persona as string,
    input.welcomeMessage ? `\nWelcome message: "${input.welcomeMessage as string}"` : "",
    input.topics
      ? `\nTopics you handle: ${(input.topics as string[]).join(", ")}`
      : "",
    "\nBe helpful, concise, and stay on-topic. Escalate to a human agent when the request is outside your scope.",
  ]
    .filter(Boolean)
    .join("");

  const agent = await prisma.agent.create({
    data: {
      name: input.name as string,
      description: `Chatbot: ${input.persona as string}`.slice(0, 200),
      model: "claude-sonnet-4-6",
      capabilities: ["chat", "customer-service", ...((input.topics as string[]) || [])],
      systemPrompt,
      teamId: input.teamId as string,
    },
  });

  return JSON.stringify({
    success: true,
    chatbot: { id: agent.id, name: agent.name },
    message: `Chatbot "${agent.name}" created and added to the team.`,
    embedNote:
      "To embed this chatbot, use the /api/chat endpoint with this agent's teamId in the system context.",
  });
}

async function toolLogImprovement(input: Record<string, unknown>): Promise<string> {
  const improvement = await prisma.improvement.create({
    data: {
      title: input.title as string,
      description: input.description as string,
      category: (input.category as string) || "efficiency",
      impact: (input.impact as string) || "medium",
      source: (input.source as string) || null,
      applied: false,
    },
  });

  return JSON.stringify({
    success: true,
    improvement: { id: improvement.id, title: improvement.title, impact: improvement.impact },
    message: `Improvement logged: "${improvement.title}". Visible in the Tools Catalog → Improvements tab.`,
  });
}

async function toolGenerateTool(input: Record<string, unknown>): Promise<string> {
  const instructions = input.generatedFrom
    ? `${input.instructions as string}\n\n---\nAuto-generated from: ${input.generatedFrom as string}`
    : (input.instructions as string);

  const skill = await prisma.skill.create({
    data: {
      name: input.name as string,
      description: input.description as string,
      category: (input.category as string) || "general",
      instructions,
      teamId: input.teamId as string,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: `Generated tool "${skill.name}" from repeated workflow`,
      type: "deploy",
      teamId: input.teamId as string,
    },
  });

  return JSON.stringify({
    success: true,
    skill: { id: skill.id, name: skill.name, category: skill.category },
    message: `Tool "${skill.name}" generated and added to the Tools Catalog. Future tasks can now use this skill instead of solving from scratch.`,
  });
}

async function toolDelegateToTeam(input: Record<string, unknown>): Promise<string> {
  const task = await prisma.task.create({
    data: {
      title: input.title as string,
      description: input.description as string,
      priority: (input.priority as string) || "medium",
      status: "pending",
      teamId: input.teamId as string,
    },
  });

  await prisma.activityLog.create({
    data: {
      action: `Coordinator delegated task "${task.title}" to ${input.teamName as string}`,
      type: "task",
      teamName: input.teamName as string,
      teamId: input.teamId as string,
    },
  });

  return JSON.stringify({
    success: true,
    task: { id: task.id, title: task.title, status: task.status },
    message: `Task "${task.title}" delegated to ${input.teamName as string} with ${task.priority} priority.`,
  });
}

// ─── File System Tool Handlers ────────────────────────────────────────────────

async function toolListFiles(input: Record<string, unknown>): Promise<string> {
  const rel = (input.path as string) || "";
  try {
    const abs = safeFilePath(rel);
    if (!fs.existsSync(abs)) {
      return JSON.stringify({ success: true, path: rel, entries: [], note: "Directory is empty or does not exist" });
    }
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) {
      return JSON.stringify({ error: "Path is a file, not a directory. Use read_file to read it." });
    }
    const names = fs.readdirSync(abs);
    const entries = names.map((name) => {
      const childAbs = path.join(abs, name);
      const s = fs.statSync(childAbs);
      return {
        name,
        path: rel ? `${rel}/${name}` : name,
        isDirectory: s.isDirectory(),
        size: s.isDirectory() ? 0 : s.size,
        modifiedAt: s.mtime.toISOString(),
      };
    }).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return JSON.stringify({ success: true, path: rel || "/", entries, count: entries.length });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

async function toolReadFile(input: Record<string, unknown>): Promise<string> {
  const rel = input.path as string;
  try {
    const abs = safeFilePath(rel);
    if (!fs.existsSync(abs)) return JSON.stringify({ error: "File not found" });
    if (fs.statSync(abs).isDirectory()) return JSON.stringify({ error: "Path is a directory. Use list_files." });

    const stat = fs.statSync(abs);
    if (stat.size > MAX_READ_BYTES) {
      return JSON.stringify({
        error: `File too large to read directly (${(stat.size / 1024).toFixed(1)} KB). Embed it first and use search_files.`,
      });
    }

    const content = fs.readFileSync(abs, "utf-8");
    return JSON.stringify({
      success: true,
      path: rel,
      content,
      size: stat.size,
      lines: content.split("\n").length,
    });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

async function toolWriteFile(input: Record<string, unknown>): Promise<string> {
  const rel = input.path as string;
  const content = input.content as string;
  try {
    const abs = safeFilePath(rel);
    const dir = path.dirname(abs);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(abs, content, "utf-8");
    return JSON.stringify({
      success: true,
      path: rel,
      size: Buffer.byteLength(content, "utf-8"),
      message: `File written: ${rel}`,
    });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

async function toolDeleteFile(input: Record<string, unknown>): Promise<string> {
  const rel = input.path as string;
  try {
    const abs = safeFilePath(rel);
    if (!fs.existsSync(abs)) return JSON.stringify({ error: "File not found" });
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      fs.rmSync(abs, { recursive: true, force: true });
    } else {
      fs.unlinkSync(abs);
    }
    return JSON.stringify({ success: true, path: rel, message: `Deleted: ${rel}` });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}

async function toolSearchFiles(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;
  const limit = (input.limit as number) || 5;

  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";

  try {
    // Get query embedding from Ollama
    const embedRes = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: query }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!embedRes.ok) {
      return JSON.stringify({
        error: "Could not reach Ollama for semantic search. Make sure nomic-embed-text is pulled.",
        hint: "Run: docker exec vps-ollama ollama pull nomic-embed-text",
      });
    }

    const { embedding } = await embedRes.json() as { embedding: number[] };

    // pgvector cosine similarity search
    const results = await prisma.$queryRaw<Array<{
      filePath: string;
      chunkIndex: number;
      content: string;
      similarity: number;
    }>>`
      SELECT "filePath", "chunkIndex", "content",
             1 - (vector <=> ${JSON.stringify(embedding)}::vector) AS similarity
      FROM file_embeddings
      ORDER BY vector <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `;

    if (!results.length) {
      return JSON.stringify({
        success: true,
        query,
        results: [],
        note: "No embedded files found. Use the Embed button in the Files page to index files first.",
      });
    }

    return JSON.stringify({
      success: true,
      query,
      results: results.map((r) => ({
        file: r.filePath,
        chunk: r.chunkIndex,
        similarity: Number(r.similarity).toFixed(3),
        excerpt: r.content.slice(0, 500),
      })),
    });
  } catch (err) {
    return JSON.stringify({ error: `File search failed: ${String(err)}` });
  }
}

// ─── Project Tool Handlers ────────────────────────────────────────────────────

async function toolCreateProject(input: Record<string, unknown>): Promise<string> {
  const project = await prisma.project.create({
    data: {
      name: input.name as string,
      description: (input.description as string) || null,
      type: (input.type as string) || "one-time",
      deliveryChannel: (input.deliveryChannel as string) || null,
      status: "active",
    },
  });

  return JSON.stringify({
    success: true,
    project: { id: project.id, name: project.name, type: project.type, status: project.status },
    message: `Project "${project.name}" created. ID: ${project.id}. Use this ID to assign teams and log outputs.`,
  });
}

async function toolListProjects(input: Record<string, unknown>): Promise<string> {
  const statusFilter = (input.status as string) || undefined;
  const projects = await prisma.project.findMany({
    where: { status: statusFilter ?? { not: "archived" } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (projects.length === 0) {
    return JSON.stringify({ success: true, projects: [], message: "No active projects. Create one with create_project." });
  }

  return JSON.stringify({
    success: true,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      type: p.type,
      deliveryChannel: p.deliveryChannel,
      createdAt: p.createdAt,
    })),
    count: projects.length,
  });
}

async function toolUpdateProject(input: Record<string, unknown>): Promise<string> {
  const project = await prisma.project.update({
    where: { id: input.projectId as string },
    data: {
      ...(input.status && { status: input.status as string }),
      ...(input.description !== undefined && { description: input.description as string }),
      ...(input.deliveryChannel !== undefined && { deliveryChannel: input.deliveryChannel as string }),
    },
  });

  return JSON.stringify({
    success: true,
    project: { id: project.id, name: project.name, status: project.status },
    message: `Project "${project.name}" updated to status: ${project.status}.`,
  });
}

async function toolLogProjectOutput(input: Record<string, unknown>): Promise<string> {
  const output = await prisma.projectOutput.create({
    data: {
      projectId: input.projectId as string,
      agentId: input.agentId as string,
      type: input.type as string,
      title: input.title as string,
      content: (input.content as Record<string, unknown>) ?? null,
    },
  });

  return JSON.stringify({
    success: true,
    output: { id: output.id, type: output.type, title: output.title },
    message: `Output "${output.title}" logged for project.`,
  });
}

// ─── Memory Tool Handlers ─────────────────────────────────────────────────────

async function toolSaveMemory(input: Record<string, unknown>): Promise<string> {
  const { storeMemory } = await import("@/lib/memory/store");
  await storeMemory({
    ownerType: "system",
    ownerId: "keeper",
    content: input.content as string,
    memoryType: (input.memoryType as "fact" | "preference" | "decision" | "output") || "fact",
    importance: (input.importance as number) || 0.7,
  });
  return JSON.stringify({ success: true, message: "Memory saved. I will remember this in future conversations." });
}

async function toolRecallMemories(input: Record<string, unknown>): Promise<string> {
  const { retrieveMemories } = await import("@/lib/memory/retrieve");
  const memories = await retrieveMemories("keeper", "system", (input.limit as number) || 15);
  return JSON.stringify({ success: true, memories: memories || "No memories stored yet." });
}

// ─── Tool Installer Handlers ───────────────────────────────────────────────────

async function toolSearchTools(input: Record<string, unknown>): Promise<string> {
  const { checkSafety } = await import("@/lib/tool-installer/safety-checker");
  const query = (input.query as string) ?? "";
  const type = (input.type as "npm" | "pip" | "mcp") ?? "npm";
  const specificPackage = input.packageName as string | undefined;

  // If a specific package name is given, just check that one
  if (specificPackage) {
    const safety = await checkSafety(specificPackage, type === "any" ? "npm" : type);
    return JSON.stringify({
      success: true,
      query,
      results: [{ package: specificPackage, type, ...safety }],
      note: safety.approved
        ? `"${specificPackage}" passed the safety check (score ${safety.score}/10). Call install_tool to install it.`
        : `"${specificPackage}" did not pass the safety check: ${safety.reason}`,
    });
  }

  // Without a specific package, return guidance based on query keywords
  const suggestions = getPackageSuggestions(query, type);
  return JSON.stringify({
    success: true,
    query,
    suggestions,
    note: "These are suggested packages for your use case. Call search_tools with a specific packageName to get the safety score, then install_tool to install.",
  });
}

function getPackageSuggestions(query: string, type: string): Array<{ package: string; type: string; description: string }> {
  const q = query.toLowerCase();
  const npm: Array<{ package: string; type: string; description: string }> = [];
  const pip: Array<{ package: string; type: string; description: string }> = [];

  if (q.includes("scrape") || q.includes("puppeteer") || q.includes("browser")) {
    npm.push({ package: "puppeteer", type: "npm", description: "Headless Chrome for web scraping" });
    npm.push({ package: "playwright", type: "npm", description: "Cross-browser automation" });
    pip.push({ package: "playwright", type: "pip", description: "Python browser automation" });
  }
  if (q.includes("pdf") || q.includes("document")) {
    npm.push({ package: "pdf-parse", type: "npm", description: "Parse PDF text content" });
    pip.push({ package: "pypdf2", type: "pip", description: "Python PDF manipulation" });
  }
  if (q.includes("image") || q.includes("vision") || q.includes("sharp")) {
    npm.push({ package: "sharp", type: "npm", description: "High-performance image processing" });
    pip.push({ package: "pillow", type: "pip", description: "Python image processing" });
  }
  if (q.includes("database") || q.includes("sql") || q.includes("postgres") || q.includes("mysql")) {
    npm.push({ package: "pg", type: "npm", description: "PostgreSQL client for Node.js" });
    pip.push({ package: "psycopg2-binary", type: "pip", description: "Python PostgreSQL driver" });
  }
  if (q.includes("email") || q.includes("mail")) {
    npm.push({ package: "nodemailer", type: "npm", description: "Send emails from Node.js" });
    pip.push({ package: "sendgrid", type: "pip", description: "SendGrid email SDK" });
  }
  if (q.includes("http") || q.includes("request") || q.includes("api")) {
    npm.push({ package: "axios", type: "npm", description: "HTTP client for Node.js" });
    pip.push({ package: "httpx", type: "pip", description: "Modern Python HTTP client" });
  }
  if (q.includes("mcp") || q.includes("model context")) {
    return [
      { package: "@modelcontextprotocol/server-filesystem", type: "mcp", description: "Official MCP: filesystem access" },
      { package: "@modelcontextprotocol/server-github", type: "mcp", description: "Official MCP: GitHub integration" },
      { package: "@modelcontextprotocol/server-postgres", type: "mcp", description: "Official MCP: PostgreSQL queries" },
      { package: "@modelcontextprotocol/server-brave-search", type: "mcp", description: "Official MCP: Brave search" },
    ];
  }

  const all = type === "pip" ? pip : type === "mcp" ? [] : [...npm, ...pip];
  return all.length > 0 ? all.slice(0, 5) : [
    { package: "axios", type: "npm", description: "Popular HTTP client" },
    { package: "lodash", type: "npm", description: "Utility functions" },
    { package: "dayjs", type: "npm", description: "Date/time manipulation" },
  ];
}

async function toolInstallTool(input: Record<string, unknown>): Promise<string> {
  const packageName = input.package as string;
  const type = input.type as "npm" | "pip" | "mcp";
  const teamId = input.teamId as string;
  const purpose = input.purpose as string;
  const version = input.version as string | undefined;

  // 1. Safety check
  const { checkSafety } = await import("@/lib/tool-installer/safety-checker");
  const safety = await checkSafety(packageName, type);

  if (!safety.approved) {
    return JSON.stringify({
      success: false,
      blocked: true,
      reason: safety.reason,
      score: safety.score,
      message: `❌ Installation blocked: ${safety.reason}`,
    });
  }

  if (safety.requiresConfirmation) {
    return JSON.stringify({
      success: false,
      requiresConfirmation: true,
      safety,
      message: `⚠️ This package has a low safety score (${safety.score}/10): ${safety.reason}. Confirm by calling install_tool again with confirmed: true if you still want to proceed.`,
    });
  }

  // 2. Check SSH configured
  if (!process.env.VPS_SSH_KEY || !process.env.VPS_SSH_HOST) {
    return JSON.stringify({
      success: false,
      error: "SSH not configured. Set VPS_SSH_HOST, VPS_SSH_USER, and VPS_SSH_KEY in .env.local to enable remote tool installation.",
      safetyScore: safety.score,
      safetyReason: safety.reason,
    });
  }

  // 3. Install via SSH
  const { installNpmPackage, installPipPackage, installMCPServer } = await import("@/lib/tool-installer/installer");

  let installResult;
  if (type === "npm") installResult = await installNpmPackage(packageName, version);
  else if (type === "pip") installResult = await installPipPackage(packageName);
  else installResult = await installMCPServer(packageName);

  if (!installResult.success) {
    return JSON.stringify({
      success: false,
      error: `Installation failed: ${installResult.error || "unknown error"}`,
      output: installResult.output,
    });
  }

  // 4. Register as CLI function in DB
  const shortName = packageName.split("/").pop() ?? packageName;
  const commandMap: Record<string, string> = {
    npm: `node /opt/agent-tools/node_modules/.bin/${shortName}`,
    pip: `python3 -m ${packageName.replace(/-/g, "_")}`,
    mcp: `npx ${packageName}`,
  };

  const fn = await prisma.cliFunction.create({
    data: {
      name: shortName,
      command: commandMap[type] ?? packageName,
      description: `${purpose} — installed ${new Date().toISOString().split("T")[0]}`,
      dangerous: false,
      teamId,
    },
  });

  // 5. Log to activity
  await prisma.activityLog.create({
    data: {
      action: `Installed tool "${packageName}" (${type}) — safety score ${safety.score}/10`,
      type: "deploy",
      teamId,
    },
  });

  return JSON.stringify({
    success: true,
    package: packageName,
    version: safety.metadata.version,
    safetyScore: safety.score,
    cliFunction: { id: fn.id, name: fn.name, command: fn.command },
    message: `✅ Installed "${packageName}" (safety score: ${safety.score}/10, ${safety.metadata.weeklyDownloads?.toLocaleString() ?? "?"} weekly downloads). Registered as CLI function "${fn.name}" for this team.`,
  });
}

// ─── Vault Tool Handlers ───────────────────────────────────────────────────────

async function toolVaultSearch(input: Record<string, unknown>): Promise<string> {
  const { searchVault } = await import("@/lib/brain");
  const results = await searchVault(input.query as string, (input.limit as number) || 5);
  if (!results.length) {
    return JSON.stringify({
      success: true,
      query: input.query,
      results: [],
      note: "No matching notes found. The vault may be empty or notes may not be indexed yet.",
    });
  }
  return JSON.stringify({ success: true, query: input.query, results });
}

async function toolVaultRead(input: Record<string, unknown>): Promise<string> {
  const { readVaultNote } = await import("@/lib/brain");
  const content = await readVaultNote(input.path as string);
  if (!content) return JSON.stringify({ error: `Note not found: ${input.path}` });
  return JSON.stringify({ success: true, path: input.path, content });
}

async function toolVaultWrite(input: Record<string, unknown>): Promise<string> {
  const { ingestToVault, indexVaultNote } = await import("@/lib/brain");
  const tags = (input.tags as string[]) || ["#agent"];
  const notePath = await ingestToVault(
    input.content as string,
    input.title as string,
    tags
  );
  indexVaultNote({
    path: notePath,
    title: input.title as string,
    content: input.content as string,
    tags,
  }).catch(() => {});
  return JSON.stringify({
    success: true,
    path: notePath,
    message: `Saved to vault: ${notePath}. It will be available for future searches.`,
  });
}

async function toolPlanTask(input: Record<string, unknown>): Promise<string> {
  const { generateTaskPlan } = await import("@/lib/executor");
  const taskId = input.taskId as string;
  if (!taskId) return JSON.stringify({ error: "taskId is required" });
  try {
    const result = await generateTaskPlan(taskId);
    return JSON.stringify({
      success: true,
      planPath: result.planPath,
      message: `✓ Execution plan generated and saved to Brain at ${result.planPath}. Agent teams can now read this plan before starting work.`,
    });
  } catch (err) {
    return JSON.stringify({ error: String(err) });
  }
}
