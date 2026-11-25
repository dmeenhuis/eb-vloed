#!/usr/bin/env bash
set -euo pipefail

# Load environment variables
if [[ ! -f .env ]]; then
  echo "Error: .env file not found" >&2
  exit 1
fi
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  value="${value#\"}" ; value="${value%\"}"
  value="${value#\'}" ; value="${value%\'}"
  export "$key=$value"
done < .env

if [[ -z "${FTP_USER:-}" || -z "${FTP_PASS:-}" || -z "${FTP_HOST:-}" ]]; then
  echo "Error: FTP_USER, FTP_PASS, and FTP_HOST must be set in .env" >&2
  exit 1
fi

FTP_DIR="${FTP_DIR:-/}"

# Create a temporary .netrc file for curl authentication
NETRC_FILE=$(mktemp)
trap 'rm -f "$NETRC_FILE"' EXIT
printf 'machine %s login %s password %s\n' "$FTP_HOST" "$FTP_USER" "$FTP_PASS" > "$NETRC_FILE"
chmod 600 "$NETRC_FILE"

echo "Uploading dist/ to ${FTP_HOST}${FTP_DIR} ..."

find dist -type f | while read -r file; do
  remote_path="${FTP_DIR}${file#dist}"
  remote_dir="$(dirname "$remote_path")/"

  # Create remote directory
  curl -sSf --ftp-create-dirs --netrc-file "$NETRC_FILE" "ftp://${FTP_HOST}${remote_dir}" -Q "MKD ${remote_dir}" 2>/dev/null || true

  # Upload file
  echo "  ${file} -> ${remote_path}"
  curl -sS -T "$file" --netrc-file "$NETRC_FILE" "ftp://${FTP_HOST}${remote_path}"
done

echo "Deploy complete."
