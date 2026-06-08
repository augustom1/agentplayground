// Edit the SensorGuard demo HTML file in-place (search/replace).
// The file is mounted at /data/sensorguard/index.html inside the dashboard container
// via docker-compose volume: ./webroot/sensorguard:/data/sensorguard

import { readFile, writeFile } from "fs/promises";
import path from "path";

const DEMO_PATH = process.env.SENSORGUARD_DEMO_PATH ?? "/data/sensorguard/index.html";

export async function editDemoFile(search: string, replace: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const filePath = path.resolve(DEMO_PATH);
    const content = await readFile(filePath, "utf-8");

    if (!content.includes(search)) {
      return { ok: false, error: `Text not found: "${search.slice(0, 80)}"` };
    }

    const updated = content.split(search).join(replace);
    await writeFile(filePath, updated, "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function readDemoFile(): Promise<string> {
  const filePath = path.resolve(DEMO_PATH);
  return readFile(filePath, "utf-8");
}
