#!/bin/sh
set -eu

for name in S3_ENDPOINT S3_BUCKET MINIO_ROOT_USER MINIO_ROOT_PASSWORD S3_APP_ACCESS_KEY_ID S3_APP_SECRET_ACCESS_KEY S3_BACKUP_ACCESS_KEY_ID S3_BACKUP_SECRET_ACCESS_KEY; do
  eval "value=\${$name:-}"
  test -n "$value" || { echo "$name is required" >&2; exit 2; }
done

app_policy_name=${S3_APP_POLICY_NAME:-ciwie-app}
backup_policy_name=${S3_BACKUP_POLICY_NAME:-ciwie-backup}

for policy_name in "$app_policy_name" "$backup_policy_name"; do
  case "$policy_name" in
    *[!a-zA-Z0-9_-]*|'')
      echo "Object storage policy names may contain only letters, numbers, underscores, and hyphens" >&2
      exit 2
      ;;
  esac
done

mc alias set local "$S3_ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "local/$S3_BUCKET"

cat > /tmp/app-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:ListBucket"],"Resource":["arn:aws:s3:::$S3_BUCKET"]},{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::$S3_BUCKET/uploads/*","arn:aws:s3:::$S3_BUCKET/imports/*","arn:aws:s3:::$S3_BUCKET/exports/*"]}]}
EOF
cat > /tmp/backup-policy.json <<EOF
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:ListBucket"],"Resource":["arn:aws:s3:::$S3_BUCKET"]},{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject"],"Resource":["arn:aws:s3:::$S3_BUCKET/*"]}]}
EOF

mc admin policy create local "$app_policy_name" /tmp/app-policy.json
mc admin policy create local "$backup_policy_name" /tmp/backup-policy.json
mc admin user add local "$S3_APP_ACCESS_KEY_ID" "$S3_APP_SECRET_ACCESS_KEY"
mc admin user add local "$S3_BACKUP_ACCESS_KEY_ID" "$S3_BACKUP_SECRET_ACCESS_KEY"
mc admin policy attach local "$app_policy_name" --user "$S3_APP_ACCESS_KEY_ID"
mc admin policy attach local "$backup_policy_name" --user "$S3_BACKUP_ACCESS_KEY_ID"

rm -f /tmp/app-policy.json /tmp/backup-policy.json
echo "Object storage bucket and least-privilege users initialized."
