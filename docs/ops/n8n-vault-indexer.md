# n8n Vault Indexer Workflow

This workflow runs every 5 minutes, scans the vault for changed `.md` files, and POSTs each file to `/api/brain/index` to embed it into the VaultNote DB table for semantic search.

## Prerequisites

1. Syncthing is running and the vault directory is populated
2. Ollama has `nomic-embed-text` pulled: `ollama pull nomic-embed-text`
3. `BRAIN_SECRET` is set in `.env.local` (any random string)
4. The dashboard is running and healthy

## Workflow JSON (import into n8n)

```json
{
  "name": "Vault Indexer",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "minutes", "minutesInterval": 5 }] }
      },
      "position": [240, 300]
    },
    {
      "name": "Read Vault Files",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "find /var/syncthing/vault -name '*.md' -newer /tmp/.vault-last-index -type f 2>/dev/null; touch /tmp/.vault-last-index"
      },
      "position": [460, 300]
    },
    {
      "name": "Split File Paths",
      "type": "n8n-nodes-base.splitInBatches",
      "parameters": { "batchSize": 10 },
      "position": [680, 300]
    },
    {
      "name": "Read File Content",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cat '{{ $json.filePath }}'"
      },
      "position": [900, 300]
    },
    {
      "name": "POST to Brain Index",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "http://dashboard:3000/api/brain/index",
        "headers": {
          "X-Brain-Secret": "={{ $env.BRAIN_SECRET }}",
          "Content-Type": "application/json"
        },
        "body": {
          "path": "={{ $json.relativePath }}",
          "content": "={{ $json.content }}",
          "title": "={{ $json.title }}"
        },
        "options": { "timeout": 30000 }
      },
      "position": [1120, 300]
    }
  ],
  "connections": {
    "Schedule Trigger": { "main": [[{ "node": "Read Vault Files", "type": "main", "index": 0 }]] },
    "Read Vault Files": { "main": [[{ "node": "Split File Paths", "type": "main", "index": 0 }]] },
    "Split File Paths": { "main": [[{ "node": "Read File Content", "type": "main", "index": 0 }]] },
    "Read File Content": { "main": [[{ "node": "POST to Brain Index", "type": "main", "index": 0 }]] }
  }
}
```

## Simpler Alternative: Shell Script Indexer

If n8n filesystem access is limited, run this as a cron job on the VPS host:

```bash
#!/bin/bash
# /root/scripts/index-vault.sh — run every 5 min via crontab
VAULT=/var/lib/docker/volumes/vps_vaultdata/_data/vault
DASHBOARD=http://localhost:3000
SECRET=$BRAIN_SECRET

find "$VAULT" -name "*.md" -newer /tmp/.vault-index-marker -type f | while read file; do
  CONTENT=$(cat "$file")
  RELPATH="${file#$VAULT/}"
  TITLE=$(head -5 "$file" | grep -E '^title:' | sed 's/title: *//' | tr -d '"')
  [ -z "$TITLE" ] && TITLE=$(basename "$file" .md)

  curl -s -X POST "$DASHBOARD/api/brain/index" \
    -H "Content-Type: application/json" \
    -H "X-Brain-Secret: $SECRET" \
    -d "{\"path\":\"$RELPATH\",\"content\":$(echo "$CONTENT" | jq -Rs .),\"title\":\"$TITLE\"}" \
    > /dev/null
done

touch /tmp/.vault-index-marker
```

Add to crontab:
```
*/5 * * * * BRAIN_SECRET=your-secret /root/scripts/index-vault.sh >> /var/log/vault-index.log 2>&1
```

## n8n Setup Steps

1. Go to `https://n8n.agentplayground.net` → New Workflow → Import from JSON
2. Paste the JSON above
3. Set environment variable in n8n: `BRAIN_SECRET` (same value as in `.env.local`)
4. Update the vault path in "Read Vault Files" to match your actual vault location inside the n8n container:
   - If n8n and syncthing share the `vaultdata` volume: `/vault` or `/var/syncthing/vault`
   - Check with: `docker exec vps-n8n ls /var/syncthing/vault`
5. Activate the workflow

## Verifying Indexing

After the first run:
```bash
# Check how many notes are indexed
docker exec vps-postgres psql -U postgres agent_dashboard -c "SELECT COUNT(*), COUNT(embedding) FROM vault_notes;"

# Test search
curl -s "http://localhost:3000/api/brain/search?q=real+estate" \
  -H "Cookie: your-session-cookie" | jq .
```

## Environment Variables Required

```bash
VAULT_PATH=/var/syncthing/vault    # Path inside the dashboard container
BRAIN_SECRET=your-random-secret    # openssl rand -hex 32
VAULT_CONTEXT_ENABLED=true         # Enable vault injection in Keeper chat
```
