import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs/promises";
import path from "path";

const VAULT_PATH = process.env.VAULT_PATH || "/var/syncthing/vault";

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

async function buildTree(dirPath: string, relativePath = ""): Promise<FolderNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const folders = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const result: FolderNode[] = [];
    for (const folder of folders) {
      const childRel = relativePath ? `${relativePath}/${folder.name}` : folder.name;
      const children = await buildTree(path.join(dirPath, folder.name), childRel);
      result.push({ name: folder.name, path: childRel, children });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tree = await buildTree(VAULT_PATH);
  return NextResponse.json({ tree });
}
