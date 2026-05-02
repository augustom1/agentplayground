# Feature 04 — Auto-Install CLI Tools, npm Packages, and MCP Servers

> Status: ⬜ Not started
> Effort: 2-3 days
> Dependencies: SSH access to VPS (env vars: VPS_SSH_HOST, VPS_SSH_USER, VPS_SSH_KEY)

---

## Goal

Claude can propose and install tools on the VPS server directly from the chat interface. User says "I need a team that can scrape LinkedIn" and Claude finds `puppeteer`, checks its safety score, installs it on the VPS via SSH, and registers it as a CLI function the team can use.

**Safety is the core constraint.** Nothing installs without passing the safety checker.

---

## Architecture Overview

```
User: "Install puppeteer for web scraping"
  → Claude calls: search_tools({ query: "puppeteer", type: "npm" })
  → Returns: safety score 9.2/10, 22M weekly downloads, MIT license
  → Claude calls: install_tool({ package: "puppeteer", type: "npm", purpose: "web scraping" })
  → Safety checker re-validates
  → SSH to VPS → cd /opt/agent-tools && npm install puppeteer
  → Register in cli_functions table
  → Claude responds: "Installed! puppeteer is now available as a CLI function."
```

---

## Safety Checker

### `lib/tool-installer/safety-checker.ts`

```typescript
export interface SafetyResult {
  approved: boolean;
  score: number;         // 0-10
  reason: string;
  requiresConfirmation: boolean;  // true = ask user first
  metadata: {
    weeklyDownloads?: number;
    license?: string;
    lastPublished?: string;
    maintainers?: number;
    version?: string;
  };
}

export async function checkSafety(
  packageName: string, 
  type: 'npm' | 'pip' | 'mcp' | 'github'
): Promise<SafetyResult> {
  switch (type) {
    case 'npm': return checkNpm(packageName);
    case 'pip': return checkPyPI(packageName);
    case 'mcp': return checkMCP(packageName);
    case 'github': return checkGitHub(packageName);
    default: return { approved: false, score: 0, reason: 'Unknown package type', requiresConfirmation: false, metadata: {} };
  }
}
```

### npm Safety Check

```typescript
async function checkNpm(packageName: string): Promise<SafetyResult> {
  // Blocklist — known malicious or unsafe packages
  const BLOCKLIST = ['node-serialize', 'grunt-fancy-log', 'crossenv'];
  if (BLOCKLIST.includes(packageName)) {
    return { approved: false, score: 0, reason: 'Package is on the security blocklist', requiresConfirmation: false, metadata: {} };
  }

  // Query npm registry
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
  if (!res.ok) {
    return { approved: false, score: 0, reason: `Package "${packageName}" not found on npm`, requiresConfirmation: false, metadata: {} };
  }
  const data = await res.json();

  // Query npm download stats
  const statsRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`);
  const stats = statsRes.ok ? await statsRes.json() : { downloads: 0 };
  const weeklyDownloads = stats.downloads ?? 0;

  const latestVersion = data['dist-tags']?.latest;
  const versionData = data.versions?.[latestVersion] ?? {};
  const license = versionData.license ?? data.license ?? 'unknown';
  const maintainerCount = data.maintainers?.length ?? 0;

  // Check for deprecation
  if (data.deprecated) {
    return { approved: false, score: 1, reason: `Package is deprecated: ${data.deprecated}`, requiresConfirmation: false, metadata: { weeklyDownloads, license } };
  }

  // Score calculation
  let score = 0;
  if (weeklyDownloads > 10_000_000) score += 4;
  else if (weeklyDownloads > 1_000_000) score += 3;
  else if (weeklyDownloads > 100_000) score += 2;
  else if (weeklyDownloads > 10_000) score += 1;
  else if (weeklyDownloads > 1_000) score += 0.5;
  // Below 1000 = 0 points from downloads

  const openLicenses = ['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'Unlicense'];
  if (openLicenses.some(l => license?.includes(l))) score += 2;
  else if (license === 'unknown') score += 0;
  else score += 1; // Other known license

  if (maintainerCount > 1) score += 1;
  if (maintainerCount > 5) score += 1;

  // Check publish recency
  const modified = data.time?.modified;
  if (modified) {
    const daysSince = (Date.now() - new Date(modified).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 365) score += 1;
    else if (daysSince > 365 * 3) score -= 1;
  }

  // Decisions
  if (weeklyDownloads < 1000) {
    return { approved: false, score, reason: `Too few downloads (${weeklyDownloads}/week). Minimum 1,000 required.`, requiresConfirmation: false, metadata: { weeklyDownloads, license } };
  }
  if (weeklyDownloads < 10_000) {
    return { approved: true, score, reason: `Low download count (${weeklyDownloads}/week). Proceeding with caution.`, requiresConfirmation: true, metadata: { weeklyDownloads, license, version: latestVersion } };
  }

  return {
    approved: true,
    score: Math.min(score, 10),
    reason: `Safe: ${weeklyDownloads.toLocaleString()} weekly downloads, ${license} license`,
    requiresConfirmation: false,
    metadata: { weeklyDownloads, license, version: latestVersion, maintainers: maintainerCount },
  };
}
```

### PyPI Safety Check

```typescript
async function checkPyPI(packageName: string): Promise<SafetyResult> {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
  if (!res.ok) {
    return { approved: false, score: 0, reason: `Package "${packageName}" not found on PyPI`, requiresConfirmation: false, metadata: {} };
  }
  const data = await res.json();
  
  const info = data.info;
  const license = info.license ?? 'unknown';
  const version = info.version;
  
  // PyPI doesn't have a direct download stats API in the public registry JSON
  // Use pypistats.org API for download counts
  const statsRes = await fetch(`https://pypistats.org/api/packages/${encodeURIComponent(packageName)}/recent`);
  const weeklyDownloads = statsRes.ok ? ((await statsRes.json()).data?.last_week ?? 0) : 0;
  
  if (weeklyDownloads > 0 && weeklyDownloads < 1000) {
    return { approved: false, score: 1, reason: `Too few downloads (${weeklyDownloads}/week)`, requiresConfirmation: false, metadata: { weeklyDownloads, license, version } };
  }
  
  return {
    approved: true,
    score: weeklyDownloads > 100_000 ? 8 : weeklyDownloads > 10_000 ? 6 : 4,
    reason: `Found on PyPI, ${license} license`,
    requiresConfirmation: weeklyDownloads < 10_000,
    metadata: { weeklyDownloads, license, version },
  };
}
```

### MCP Safety Check

```typescript
// Official MCP servers list — from Anthropic's modelcontextprotocol GitHub org
const OFFICIAL_MCP_SERVERS = [
  '@modelcontextprotocol/server-filesystem',
  '@modelcontextprotocol/server-github',
  '@modelcontextprotocol/server-google-maps',
  '@modelcontextprotocol/server-postgres',
  '@modelcontextprotocol/server-puppeteer',
  '@modelcontextprotocol/server-brave-search',
  '@modelcontextprotocol/server-slack',
  '@modelcontextprotocol/server-memory',
  '@modelcontextprotocol/server-sequential-thinking',
  // Add more as they're published
];

async function checkMCP(serverName: string): Promise<SafetyResult> {
  // Official Anthropic MCP servers — always approved
  if (OFFICIAL_MCP_SERVERS.includes(serverName)) {
    return { approved: true, score: 10, reason: 'Official Anthropic MCP server', requiresConfirmation: false, metadata: {} };
  }
  
  // Community MCP servers — treat as npm packages
  if (serverName.startsWith('@') || serverName.includes('/')) {
    return checkNpm(serverName);
  }
  
  return { approved: false, score: 0, reason: 'Unknown MCP server. Use official @modelcontextprotocol/* servers.', requiresConfirmation: false, metadata: {} };
}
```

---

## SSH Installer

### `lib/tool-installer/installer.ts`

```typescript
import { Client } from 'ssh2';

export interface InstallResult {
  success: boolean;
  output: string;
  error?: string;
}

function getSSHConfig() {
  const keyBase64 = process.env.VPS_SSH_KEY;
  if (!keyBase64) throw new Error('VPS_SSH_KEY not set');
  
  return {
    host: process.env.VPS_SSH_HOST ?? '95.217.163.247',
    port: 22,
    username: process.env.VPS_SSH_USER ?? 'root',
    privateKey: Buffer.from(keyBase64, 'base64').toString('utf-8'),
  };
}

async function runSSHCommand(command: string): Promise<InstallResult> {
  return new Promise((resolve) => {
    const client = new Client();
    let output = '';
    let error = '';
    
    client.on('ready', () => {
      client.exec(command, (err, stream) => {
        if (err) {
          client.end();
          resolve({ success: false, output: '', error: err.message });
          return;
        }
        
        stream.on('data', (data: Buffer) => { output += data.toString(); });
        stream.stderr.on('data', (data: Buffer) => { error += data.toString(); });
        stream.on('close', (code: number) => {
          client.end();
          resolve({ success: code === 0, output, error });
        });
      });
    });
    
    client.on('error', (err) => {
      resolve({ success: false, output: '', error: err.message });
    });
    
    client.connect(getSSHConfig());
  });
}

export async function installNpmPackage(packageName: string, version?: string): Promise<InstallResult> {
  const pkg = version ? `${packageName}@${version}` : packageName;
  // Install to isolated directory, not system-wide
  const cmd = `mkdir -p /opt/agent-tools && cd /opt/agent-tools && npm install ${pkg} 2>&1`;
  return runSSHCommand(cmd);
}

export async function installPipPackage(packageName: string): Promise<InstallResult> {
  const cmd = `pip3 install --user ${packageName} 2>&1`;
  return runSSHCommand(cmd);
}

export async function installMCPServer(serverName: string): Promise<InstallResult> {
  const cmd = `npm install -g ${serverName} 2>&1`;
  return runSSHCommand(cmd);
}

export async function runArbitraryCommand(command: string): Promise<InstallResult> {
  // Extra safety: reject commands that look dangerous
  const DANGEROUS_PATTERNS = [
    /rm\s+-rf\s+\//,   // rm -rf /
    />\s*\/etc/,        // write to /etc
    /chmod\s+777/,      // world-writable permissions
    /curl.*\|\s*bash/,  // curl pipe to bash
    /wget.*\|\s*bash/,  // wget pipe to bash
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { success: false, output: '', error: 'Command blocked: matches dangerous pattern' };
    }
  }
  
  return runSSHCommand(command);
}
```

**Install required:**
```bash
npm install ssh2
npm install @types/ssh2 -D
```

**SSH Key setup:**
```bash
# On local machine, encode your private key:
base64 -i ~/.ssh/id_rsa | tr -d '\n'
# Copy the output → VPS_SSH_KEY env var

# Make sure the VPS allows this key:
# The public key should already be in /root/.ssh/authorized_keys if you SSH to the VPS normally
```

---

## New Chat Tools

### Add to `lib/chat-tools.ts`

```typescript
{
  name: 'search_tools',
  description: 'Search for safe npm packages, Python packages, or MCP servers to add to a team. Returns packages with safety scores before installing anything.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What you need (e.g., "web scraping", "image processing", "database")' },
      type: { type: 'string', enum: ['npm', 'pip', 'mcp', 'any'], description: 'Package type to search' },
    },
    required: ['query'],
  },
},
{
  name: 'install_tool',
  description: 'Install a verified safe package on the VPS server and register it as a CLI function for an agent team. Only installs packages that pass the safety checker.',
  input_schema: {
    type: 'object',
    properties: {
      package: { type: 'string', description: 'Package name (e.g., "puppeteer", "requests", "@modelcontextprotocol/server-github")' },
      type: { type: 'string', enum: ['npm', 'pip', 'mcp'], description: 'Package type' },
      teamId: { type: 'string', description: 'Team ID to register the tool with' },
      purpose: { type: 'string', description: 'What this tool will be used for' },
      version: { type: 'string', description: 'Specific version to install (optional, defaults to latest)' },
    },
    required: ['package', 'type', 'teamId', 'purpose'],
  },
},
```

### Add to `executeTool` switch:

```typescript
case 'search_tools': return await toolSearchTools(input);
case 'install_tool': return await toolInstallTool(input);
```

### Implement the handlers:

```typescript
async function toolSearchTools(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;
  const type = (input.type as string) ?? 'npm';
  
  // For now: return curated suggestions based on query keywords
  // Full implementation would query npm search API
  const suggestions = await searchNpmRegistry(query, type);
  
  return JSON.stringify({
    success: true,
    query,
    results: suggestions,
    note: 'Call install_tool with the package name to install after reviewing safety scores.',
  });
}

async function toolInstallTool(input: Record<string, unknown>): Promise<string> {
  const packageName = input.package as string;
  const type = input.type as 'npm' | 'pip' | 'mcp';
  const teamId = input.teamId as string;
  const purpose = input.purpose as string;

  // 1. Safety check
  const { checkSafety } = await import('@/lib/tool-installer/safety-checker');
  const safety = await checkSafety(packageName, type);
  
  if (!safety.approved) {
    return JSON.stringify({
      success: false,
      blocked: true,
      reason: safety.reason,
      score: safety.score,
      message: `Installation blocked: ${safety.reason}`,
    });
  }
  
  if (safety.requiresConfirmation) {
    return JSON.stringify({
      success: false,
      requiresConfirmation: true,
      safety,
      message: `This package has a low safety score (${safety.score}/10): ${safety.reason}. Are you sure you want to install it? Reply "yes, install ${packageName}" to proceed.`,
    });
  }

  // 2. Check SSH configured
  if (!process.env.VPS_SSH_KEY || !process.env.VPS_SSH_HOST) {
    return JSON.stringify({
      success: false,
      error: 'SSH not configured. Set VPS_SSH_HOST, VPS_SSH_USER, VPS_SSH_KEY in .env.local to enable remote tool installation.',
    });
  }

  // 3. Install
  const { installNpmPackage, installPipPackage, installMCPServer } = await import('@/lib/tool-installer/installer');
  
  let installResult;
  if (type === 'npm') installResult = await installNpmPackage(packageName);
  else if (type === 'pip') installResult = await installPipPackage(packageName);
  else installResult = await installMCPServer(packageName);

  if (!installResult.success) {
    return JSON.stringify({
      success: false,
      error: `Installation failed: ${installResult.error}`,
      output: installResult.output,
    });
  }

  // 4. Register as CLI function in DB
  const commandMap: Record<string, string> = {
    npm: `node /opt/agent-tools/node_modules/.bin/${packageName.split('/').pop()}`,
    pip: `python3 -m ${packageName.replace(/-/g, '_')}`,
    mcp: `npx ${packageName}`,
  };

  const fn = await prisma.cliFunction.create({
    data: {
      name: packageName,
      command: commandMap[type] ?? packageName,
      description: `${purpose} — installed ${new Date().toISOString().split('T')[0]}`,
      dangerous: false,
      teamId,
    },
  });

  // 5. Log activity
  await prisma.activityLog.create({
    data: {
      action: `Installed tool "${packageName}" (${type}) for team`,
      type: 'deploy',
      teamId,
    },
  });

  return JSON.stringify({
    success: true,
    package: packageName,
    version: safety.metadata.version,
    safetyScore: safety.score,
    cliFunction: { id: fn.id, name: fn.name, command: fn.command },
    message: `✅ Installed "${packageName}" (safety score: ${safety.score}/10). Registered as CLI function "${fn.name}" for this team.`,
  });
}
```

---

## API Endpoint (optional — for UI use)

### `app/api/tools/install/route.ts`

```typescript
// POST /api/tools/install
// Body: { package, type, teamId, purpose }
// Returns: InstallResult with safety score
```

---

## VPS Setup (one-time)

```bash
# SSH to VPS and run these once:
mkdir -p /opt/agent-tools
cd /opt/agent-tools
npm init -y
echo "node_modules/" > .gitignore

# Verify Node and pip are available
node --version   # should be v18+
pip3 --version   # should exist
```

---

## Security Notes

1. SSH key should be a **dedicated deploy key** (not your personal key). Generate one:
   ```bash
   ssh-keygen -t ed25519 -C "agentplayground-installer" -f ~/.ssh/ap_installer
   # Add ~/.ssh/ap_installer.pub to VPS authorized_keys
   # Encode ~/.ssh/ap_installer as VPS_SSH_KEY
   ```

2. Consider running installs as a **non-root user** (e.g., `deploy` user) to limit blast radius

3. The dangerous pattern check in `runArbitraryCommand` is a basic safeguard — Claude should only call `install_tool`, not arbitrary commands

4. All installs go to `/opt/agent-tools/` — not system paths — so they can be easily removed

5. Log all installations to `activity_logs` for audit trail
