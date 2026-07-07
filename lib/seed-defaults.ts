/**
 * Seed Defaults — Run on first startup to populate the database
 *
 * Creates the Database Agent team, File Manager team, and registers
 * all default skills. Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx ts-node lib/seed-defaults.ts
 *   or via prisma: npx prisma db seed
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SKILLS, DB_AGENT_TEAM, FILE_AGENT_TEAM } from "@/lib/default-skills";

export async function seedDefaults() {
  console.log("🌱 Seeding defaults...");

  // ── 1. Create Database Agent team ──────────────
  const existingDbTeam = await prisma.agentTeam.findFirst({
    where: { name: DB_AGENT_TEAM.name },
  });

  let dbTeam;
  if (!existingDbTeam) {
    dbTeam = await prisma.agentTeam.create({
      data: {
        ...DB_AGENT_TEAM,
        isSystemTeam: true,
        config: DB_AGENT_TEAM.config as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  ✓ Created team: ${dbTeam.name}`);

    // Create the DB Agent itself
    await prisma.agent.create({
      data: {
        name: "DB Guardian",
        description: "Master database agent — enforces access control and manages all data operations",
        model: "claude-sonnet-4-6",
        capabilities: ["database", "access-control", "query", "migration"],
        systemPrompt:
          "You are the Database Guardian. You manage all database access for the platform. When other agents request data, verify their permissions before returning results. You have full read/write access to all tables.",
        teamId: dbTeam.id,
      },
    });
    console.log("  ✓ Created agent: DB Guardian");
  } else {
    dbTeam = existingDbTeam;
    if (!dbTeam.isSystemTeam) {
      await prisma.agentTeam.update({ where: { id: dbTeam.id }, data: { isSystemTeam: true } });
    }
    console.log(`  ○ Team already exists: ${dbTeam.name}`);
  }

  // ── 2. Create File Manager team ────────────────
  const existingFileTeam = await prisma.agentTeam.findFirst({
    where: { name: FILE_AGENT_TEAM.name },
  });

  let fileTeam;
  if (!existingFileTeam) {
    fileTeam = await prisma.agentTeam.create({
      data: {
        ...FILE_AGENT_TEAM,
        isSystemTeam: true,
        config: FILE_AGENT_TEAM.config as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`  ✓ Created team: ${fileTeam.name}`);

    await prisma.agent.create({
      data: {
        name: "File Organizer",
        description: "Manages and organizes all project files through FileBrowser",
        model: "claude-sonnet-4-6",
        capabilities: ["files", "organization", "search", "backup"],
        systemPrompt:
          "You are the File Organizer. You manage all files in the platform through FileBrowser. Keep files organized in clear directory structures. Help users find, create, and manage their files.",
        teamId: fileTeam.id,
      },
    });
    console.log("  ✓ Created agent: File Organizer");
  } else {
    fileTeam = existingFileTeam;
    if (!fileTeam.isSystemTeam) {
      await prisma.agentTeam.update({ where: { id: fileTeam.id }, data: { isSystemTeam: true } });
    }
    console.log(`  ○ Team already exists: ${fileTeam.name}`);
  }

  // ── 3. Register default skills ─────────────────
  for (const skill of DEFAULT_SKILLS) {
    const existing = await prisma.skill.findFirst({
      where: { name: skill.name, teamId: dbTeam.id },
    });

    if (!existing) {
      await prisma.skill.create({
        data: {
          ...skill,
          teamId: dbTeam.id, // Default skills belong to the DB Agent team
        },
      });
      console.log(`  ✓ Registered skill: ${skill.name}`);
    } else {
      console.log(`  ○ Skill already exists: ${skill.name}`);
    }
  }

  // ── 4. Log the seed activity ───────────────────
  await prisma.activityLog.create({
    data: {
      action: "Platform initialized with default teams and skills",
      type: "deploy",
      teamName: "System",
    },
  });

  console.log("✅ Seed complete!");
}

// Run directly if called as script
if (require.main === module) {
  seedDefaults()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
