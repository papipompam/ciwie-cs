#!/bin/sh
set -eu
umask 077

case "${RESTORE_FILE:-}" in
  /backups/*.sql.gz.enc) ;;
  *) echo "RESTORE_FILE must be an explicit /backups/*.sql.gz.enc path" >&2; exit 2 ;;
esac

test -f "$RESTORE_FILE"
test -f "$RESTORE_FILE.sha256"
(cd /backups && sha256sum -c "$(basename "$RESTORE_FILE").sha256")
backup_stamp=$(basename "$RESTORE_FILE" | sed -e 's/^ciwie-//' -e 's/\.sql\.gz\.enc$//')
object_file="/backups/objects-$backup_stamp.tar.gz.enc"
object_checksum="$object_file.sha256"
restore_work_dir=$(mktemp -d /tmp/ciwie-restore.XXXXXX)
trap 'rm -rf "$restore_work_dir"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
object_dir="$restore_work_dir/objects-$backup_stamp"
test -f "$object_file"
test -f "$object_checksum"
(cd /backups && sha256sum -c "$(basename "$object_checksum")")
object_plain="$restore_work_dir/objects-$backup_stamp.tar.gz"
openssl enc -d -aes-256-cbc -pbkdf2 -in "$object_file" -out "$object_plain" -pass env:BACKUP_ENCRYPTION_PASSWORD
tar -C "$restore_work_dir" -xzf "$object_plain"
rm "$object_plain"
OBJECT_EXPORT_DIR="$object_dir" node /app/scripts/object-restore.mjs
database_gzip="$restore_work_dir/database.sql.gz"
database_sql="$restore_work_dir/database.sql"
openssl enc -d -aes-256-cbc -pbkdf2 -in "$RESTORE_FILE" -out "$database_gzip" -pass env:BACKUP_ENCRYPTION_PASSWORD
gzip -t "$database_gzip"
gzip -dc "$database_gzip" > "$database_sql"
# Debian's default MySQL client is MariaDB. Its dump format puts the final
# trigger semicolon inside a MySQL executable comment, which MySQL 8 rejects.
# Remove only that terminal semicolon; the following custom delimiter remains.
sed -z -i 's/;[[:space:]]*\n\*\/;;/\n*\/;;/g' "$database_sql"
mysql --host=db --user="${MYSQL_USER:-root}" "${MYSQL_DATABASE:-ciwie}" < "$database_sql"
echo "Restore completed from $RESTORE_FILE"
