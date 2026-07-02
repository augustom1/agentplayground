#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# backup-db.sh — Dump all databases from the shared Postgres instance
#
# Usage:
#   ./backup-db.sh                  # backs up all databases
#   ./backup-db.sh agent_dashboard  # backs up a specific database
#
# Schedule daily at 3am:
#   (crontab -l 2>/dev/null; echo "0 3 * * * /opt/vps/backup-db.sh >> /var/log/vps-backup.log 2>&1") | crontab -
# ─────────────────────────────────────────────────────────────────
set -e

BACKUP_DIR="${BACKUP_DIR:-/opt/backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SPECIFIC_DB="$1"

mkdir -p "$BACKUP_DIR"

dump_db() {
  local DB="$1"
  local FILE="${BACKUP_DIR}/${DB}_${TIMESTAMP}.sql.gz"
  docker exec vps-postgres pg_dump -U postgres "$DB" | gzip > "$FILE"
  echo "[backup] $DB → $(du -sh "$FILE" | cut -f1)  ($FILE)"
}

if [[ -n "$SPECIFIC_DB" ]]; then
  dump_db "$SPECIFIC_DB"
else
  # Dump all non-system databases
  DATABASES=$(docker exec vps-postgres psql -U postgres -t -c \
    "SELECT datname FROM pg_database WHERE datistemplate = false AND datname NOT IN ('postgres') ORDER BY datname;" \
    | tr -d ' ' | grep -v '^$')

  for DB in $DATABASES; do
    dump_db "$DB"
  done
fi

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
echo "[backup] Cleaned up backups older than ${KEEP_DAYS} days."
echo "[backup] Done. Backups stored in: $BACKUP_DIR"
