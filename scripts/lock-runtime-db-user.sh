#!/bin/sh
set -eu

case "${MYSQL_USER:-}" in (*[!A-Za-z0-9_]*|'') echo "MYSQL_USER contains unsupported characters" >&2; exit 2;; esac
case "${MYSQL_DATABASE:-}" in (*[!A-Za-z0-9_]*|'') echo "MYSQL_DATABASE contains unsupported characters" >&2; exit 2;; esac

MYSQL_PWD="$MYSQL_ROOT_PASSWORD" "${MYSQL_CLIENT:-mysql}" --host="${MYSQL_HOST:-db}" --port="${MYSQL_PORT:-3306}" --protocol=TCP --user=root <<SQL
REVOKE ALL PRIVILEGES, GRANT OPTION FROM '${MYSQL_USER}'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL

echo "Runtime database user privileges restricted to DML."
