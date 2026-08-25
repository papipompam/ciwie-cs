#!/bin/sh
set -eu
umask 077

backup_dir=/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
work_dir=$(mktemp -d /work/ciwie-backup.XXXXXX)
dump="$work_dir/ciwie-$stamp.sql"
plain="$dump.gz"
target="$backup_dir/ciwie-$stamp.sql.gz.enc"
target_partial="$target.partial"
object_dir="$work_dir/objects-$stamp"
object_plain="$work_dir/objects-$stamp.tar.gz"
object_target="$backup_dir/objects-$stamp.tar.gz.enc"
object_target_partial="$object_target.partial"
cleanup() {
  rm -rf "$work_dir"
  rm -f "$target_partial" "$object_target_partial"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
mkdir -p "$backup_dir"
test ! -e "$target" && test ! -e "$object_target"
mysqldump --host=db --user="${MYSQL_USER:-root}" --single-transaction --no-tablespaces --routines --triggers "${MYSQL_DATABASE:-ciwie}" > "$dump"
gzip -9 "$dump"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$plain" -out "$target_partial" -pass env:BACKUP_ENCRYPTION_PASSWORD
mv "$target_partial" "$target"
rm "$plain"
BACKUP_STAMP="$stamp" OBJECT_EXPORT_DIR="$object_dir" node /app/scripts/object-export.mjs
tar -C "$work_dir" -czf "$object_plain" "objects-$stamp"
openssl enc -aes-256-cbc -pbkdf2 -salt -in "$object_plain" -out "$object_target_partial" -pass env:BACKUP_ENCRYPTION_PASSWORD
mv "$object_target_partial" "$object_target"
sha256sum "$target" > "$target.sha256"
sha256sum "$object_target" > "$object_target.sha256"
node /app/scripts/offsite-copy.mjs "$target" "$target.sha256" "$object_target" "$object_target.sha256"
echo "Backup written to $target and $object_target"
