/**
 * SSH-based tool installer for VPS.
 * Installs npm/pip packages and MCP servers to /opt/agent-tools on the remote VPS.
 *
 * Required env vars:
 *   VPS_SSH_HOST   — VPS IP (default: 95.217.163.247)
 *   VPS_SSH_USER   — SSH user (default: root)
 *   VPS_SSH_KEY    — base64-encoded private key (base64 < ~/.ssh/id_rsa)
 */

import { Client } from "ssh2";

export interface InstallResult {
  success: boolean;
  output: string;
  error?: string;
}

function getSSHConfig() {
  const keyBase64 = process.env.VPS_SSH_KEY;
  if (!keyBase64) throw new Error("VPS_SSH_KEY is not set in environment");

  return {
    host: process.env.VPS_SSH_HOST ?? "95.217.163.247",
    port: 22,
    username: process.env.VPS_SSH_USER ?? "root",
    privateKey: Buffer.from(keyBase64, "base64").toString("utf-8"),
    readyTimeout: 30000,
  };
}

async function runSSHCommand(command: string): Promise<InstallResult> {
  return new Promise((resolve) => {
    const client = new Client();
    let output = "";
    let errorOutput = "";

    client.on("ready", () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end();
          resolve({ success: false, output: "", error: err.message });
          return;
        }

        stream.on("data", (data: Buffer) => {
          output += data.toString();
        });
        stream.stderr.on("data", (data: Buffer) => {
          errorOutput += data.toString();
        });
        stream.on("close", (code: number) => {
          client.end();
          resolve({
            success: code === 0,
            output: output.trim(),
            error: errorOutput.trim() || undefined,
          });
        });
      });
    });

    client.on("error", (err) => {
      resolve({ success: false, output: "", error: `SSH connection error: ${err.message}` });
    });

    try {
      client.connect(getSSHConfig());
    } catch (err) {
      resolve({ success: false, output: "", error: String(err) });
    }
  });
}

// ─── Install functions ─────────────────────────────────────────────────────────

// npm package names: letters, digits, hyphen, underscore, dot, @, /
const NPM_NAME_RE = /^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/;
// pip package names: letters, digits, hyphen, underscore, dot
const PIP_NAME_RE = /^[a-z0-9_.-]+$/i;
// version strings: digits and dots only
const VERSION_RE = /^[0-9.]+$/;

function assertSafeName(name: string, re: RegExp, kind: string) {
  if (!re.test(name)) throw new Error(`Invalid ${kind} name: "${name}"`);
}

export async function installNpmPackage(packageName: string, version?: string): Promise<InstallResult> {
  assertSafeName(packageName, NPM_NAME_RE, "npm package");
  if (version) assertSafeName(version, VERSION_RE, "version");
  const pkg = version ? `${packageName}@${version}` : packageName;
  const cmd = `mkdir -p /opt/agent-tools && cd /opt/agent-tools && npm init -y > /dev/null 2>&1; npm install ${pkg} 2>&1`;
  return runSSHCommand(cmd);
}

export async function installPipPackage(packageName: string): Promise<InstallResult> {
  assertSafeName(packageName, PIP_NAME_RE, "pip package");
  const cmd = `pip3 install --user ${packageName} 2>&1`;
  return runSSHCommand(cmd);
}

export async function installMCPServer(serverName: string): Promise<InstallResult> {
  assertSafeName(serverName, NPM_NAME_RE, "MCP server");
  const cmd = `npm install -g ${serverName} 2>&1`;
  return runSSHCommand(cmd);
}

/** Check if SSH is configured and reachable */
export async function testSSHConnection(): Promise<{ ok: boolean; error?: string }> {
  if (!process.env.VPS_SSH_KEY || !process.env.VPS_SSH_HOST) {
    return { ok: false, error: "VPS_SSH_HOST and VPS_SSH_KEY are not configured" };
  }
  const result = await runSSHCommand("echo ok");
  return { ok: result.success && result.output === "ok", error: result.error };
}

// ─── Safety guard for arbitrary commands ──────────────────────────────────────

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//,
  />\s*\/etc/,
  /chmod\s+777\s+\//,
  /curl\s+.*\|\s*(ba)?sh/,
  /wget\s+.*\|\s*(ba)?sh/,
  /dd\s+if=.*of=\/dev/,
];

export async function runArbitraryCommand(command: string): Promise<InstallResult> {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { success: false, output: "", error: "Command blocked: matches dangerous pattern" };
    }
  }
  return runSSHCommand(command);
}
