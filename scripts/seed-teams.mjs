// Pure JS seed — no TypeScript, runs with Node.js directly.
// Creates 5 core agent teams. Idempotent — skips existing teams.

import { PrismaClient } from "/app/node_modules/@prisma/client/default.js";
import { PrismaPg } from "/app/node_modules/@prisma/adapter-pg/dist/index.js";
import pg from "/app/node_modules/pg/lib/index.js";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEAMS = [
  {
    name: "Dev Core",
    port: 3100,
    language: "TypeScript / Next.js",
    description: "Full-stack development team for the Agent Dashboard platform. Owns all application code: Next.js pages, API routes, Prisma schema, React components, and TypeScript.",
    agents: [
      { name: "Alex", description: "Lead Full-Stack Developer — architectural decisions, code review, and cross-cutting concerns.", model: "claude-sonnet-4-6", temperature: 0.4, maxTokens: 8192 },
      { name: "Sofia", description: "React & Frontend Specialist — components, Tailwind, React 19 patterns, and client-side UX.", model: "claude-sonnet-4-6", temperature: 0.5, maxTokens: 4096 },
    ],
    skills: [
      { name: "Code Review", category: "development", description: "Review code for correctness, security, performance, and adherence to project patterns." },
      { name: "API Design", category: "development", description: "Design and implement RESTful API routes following project conventions." },
    ]
  },
  {
    name: "DevOps",
    port: 3101,
    language: "Bash / Python",
    description: "Infrastructure, deployment, Docker, CI/CD, and server management for agentplayground.net.",
    agents: [
      { name: "Marcus", description: "DevOps Lead — Docker, Traefik, VPS management, and deployment pipelines.", model: "claude-sonnet-4-6", temperature: 0.3, maxTokens: 4096 },
    ],
    skills: [
      { name: "Docker Management", category: "infrastructure", description: "Build, deploy, and manage Docker containers and compose stacks." },
      { name: "SSL & DNS", category: "infrastructure", description: "Configure Traefik routing, Let's Encrypt SSL, and DNS records." },
    ]
  },
  {
    name: "Product",
    port: 3102,
    language: "Markdown / Figma",
    description: "Product strategy, UX, roadmap planning, and user research for Agent Playground.",
    agents: [
      { name: "Elena", description: "Product Manager — roadmap, user stories, prioritization, and feature specifications.", model: "claude-sonnet-4-6", temperature: 0.7, maxTokens: 4096 },
    ],
    skills: [
      { name: "Feature Specification", category: "product", description: "Write clear feature specs with user stories, acceptance criteria, and edge cases." },
      { name: "Roadmap Planning", category: "product", description: "Prioritize features and create quarterly roadmap based on user feedback and business goals." },
    ]
  },
  {
    name: "Business",
    port: 3103,
    language: "English",
    description: "Business development, content creation, marketing, and growth strategy.",
    agents: [
      { name: "Jordan", description: "Business & Growth Lead — content strategy, partnerships, and revenue growth.", model: "claude-sonnet-4-6", temperature: 0.8, maxTokens: 4096 },
    ],
    skills: [
      { name: "Content Creation", category: "marketing", description: "Write blog posts, documentation, social media content, and marketing copy." },
      { name: "Growth Strategy", category: "business", description: "Identify and execute growth opportunities, partnerships, and user acquisition channels." },
    ]
  },
  {
    name: "Command Center",
    port: 3104,
    language: "Multi",
    description: "Coordinator team — routes complex requests across all teams and manages multi-team projects.",
    isSystemTeam: true,
    agents: [
      { name: "Director", description: "Coordinator — analyzes incoming requests, delegates to appropriate specialist teams, and synthesizes results.", model: "claude-sonnet-4-6", temperature: 0.5, maxTokens: 8192 },
    ],
    skills: [
      { name: "Task Routing", category: "coordination", description: "Analyze a request and route it to the right team or agent, with clear context." },
      { name: "Multi-Team Synthesis", category: "coordination", description: "Collect outputs from multiple teams and synthesize into a unified response or plan." },
    ]
  }
];

async function seed() {
  console.log("Seeding agent teams...\n");
  let created = 0, skipped = 0;

  for (const teamDef of TEAMS) {
    const existing = await prisma.agentTeam.findFirst({ where: { name: teamDef.name } });
    if (existing) {
      console.log(`  SKIP   ${teamDef.name} (already exists)`);
      skipped++;
      continue;
    }

    const team = await prisma.agentTeam.create({
      data: {
        name: teamDef.name,
        description: teamDef.description,
        port: teamDef.port,
        language: teamDef.language,
        status: "active",
        isSystemTeam: teamDef.isSystemTeam ?? false,
        permissions: ["read:teams", "write:tasks"],
      }
    });

    for (const a of teamDef.agents) {
      await prisma.agent.create({
        data: {
          teamId: team.id,
          name: a.name,
          description: a.description,
          model: a.model,
          temperature: a.temperature,
          maxTokens: a.maxTokens,
        }
      });
    }

    for (const s of teamDef.skills) {
      await prisma.skill.create({
        data: {
          teamId: team.id,
          name: s.name,
          category: s.category,
          description: s.description,
          instructions: s.description,
        }
      });
    }

    console.log(`  CREATE ${teamDef.name} — ${teamDef.agents.length} agent(s), ${teamDef.skills.length} skill(s)`);
    created++;
  }

  console.log(`\nDone. Created: ${created}  Skipped: ${skipped}`);
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
