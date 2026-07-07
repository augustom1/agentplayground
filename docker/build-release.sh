#!/bin/bash
# Image: augustojmd/agentplayground
VERSION="0.1.0"
FOLDER="agentplayground-v${VERSION}"
mkdir -p "$FOLDER"
cp docker/docker-compose.yml "$FOLDER/"
cp docker/docker-compose.ollama.yml "$FOLDER/"
cp docker/.env.example "$FOLDER/"
cp docker/start.bat "$FOLDER/"
cp docker/start.sh "$FOLDER/"
cp docker/stop.bat "$FOLDER/"
cp docker/stop.sh "$FOLDER/"
cp INSTALL.md "$FOLDER/"
chmod +x "$FOLDER/start.sh" "$FOLDER/stop.sh"
rm -f "${FOLDER}.zip"
if command -v zip >/dev/null 2>&1; then
  zip -r "${FOLDER}.zip" "$FOLDER"
elif [ -x "/c/Windows/System32/tar.exe" ]; then
  # Windows bsdtar creates real zip archives via -a; Git Bash has no zip binary
  /c/Windows/System32/tar.exe -a -cf "${FOLDER}.zip" "$FOLDER"
else
  echo "ERROR: neither zip nor bsdtar available — no archive created" >&2
  rm -rf "$FOLDER"
  exit 1
fi
rm -rf "$FOLDER"
echo "Created ${FOLDER}.zip"
