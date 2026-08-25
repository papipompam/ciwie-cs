# Production Operations Runbook

เอกสารนี้กำหนด release gate สำหรับ deployment, credential, backup และ restore ของระบบ CIWIE-CS โดยค่าจริงทั้งหมดต้องอยู่ใน secret manager ของสภาพแวดล้อม ห้าม commit ลง repository

## Production release gate

1. ตรวจ merged configuration ด้วย `docker compose --env-file .env -f compose.yaml -f compose.production.yaml config --quiet`
2. เปลี่ยน sample secret ทุกค่า และใช้ credential แยกระหว่าง MySQL migration/runtime, MinIO root/app/backup และ off-site backup
3. ตรวจว่า image references และ GitHub Actions ยัง pin ด้วย immutable digest/commit SHA ห้ามใช้ `latest`; การเลื่อน digest ต้องผ่าน CI และ security review
4. รัน migration และ seed ผ่าน `init` เพียงครั้งเดียว จากนั้นตรวจว่า runtime database user มีเฉพาะ `SELECT, INSERT, UPDATE, DELETE`
5. ตรวจ `/api/health` (liveness) และ `/api/ready` (DB, object storage และ antivirus readiness) แยกกันหลัง deploy

## Object storage credentials

`storage-init` ใช้ MinIO root credential เฉพาะ bootstrap และสร้าง bucket กับสอง policy:

- App credential: `ListBucket` สำหรับ readiness และ `GetObject`, `PutObject`, `DeleteObject` เฉพาะ prefix `uploads/`, `imports/`, `exports/` ที่ application เป็นเจ้าของเท่านั้น
- Backup credential: `ListBucket`, `GetObject`, `PutObject` เฉพาะ bucket ของระบบ

ห้ามส่ง MinIO root credential เข้า `app`, `worker`, `backup` หรือ `restore`. การ rotate secret ให้แก้ secret manager แล้วรัน `storage-init` ซ้ำก่อน restart consumer ที่เกี่ยวข้อง

## Backup

```bash
docker compose --env-file .env --profile backup run --rm backup
```

MySQL dump และ object export ที่ยังไม่เข้ารหัสอยู่ใน container tmpfs `/work` เท่านั้น และถูกลบด้วย trap เมื่อจบหรือถูก interrupt ส่วน bind mount `/backups` รับเฉพาะ `.enc` และ `.sha256`

ตั้ง `BACKUP_OFFSITE_BUCKET` พร้อม region/access key/secret เพื่อคัดลอก encrypted artifacts ไป S3-compatible off-site storage. `compose.production.yaml` บังคับ `BACKUP_OFFSITE_REQUIRED=true` โดยไม่รับค่าปิดจาก environment และ backup job จะหยุดด้วย non-zero exit หาก bucket, region หรือ credential ไม่ครบ/ปลายทางไม่พร้อม ค่า endpoint เว้นว่างได้เมื่อใช้ AWS S3 และกำหนด prefix แยกได้ด้วย `BACKUP_OFFSITE_PREFIX`

## Restore drill

Restore เป็น destructive operation และต้องทำใน isolated database/bucket ก่อนเสมอ:

```bash
docker compose --env-file .env exec -T db mysql -uroot -p"$MYSQL_ROOT_PASSWORD" \
  -e "CREATE DATABASE ciwie_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
S3_BUCKET=ciwie-restore \
S3_APP_ACCESS_KEY_ID="$RESTORE_APP_ACCESS_KEY_ID" \
S3_APP_SECRET_ACCESS_KEY="$RESTORE_APP_SECRET_ACCESS_KEY" \
S3_APP_POLICY_NAME=ciwie-restore-app \
S3_BACKUP_ACCESS_KEY_ID="$RESTORE_BACKUP_ACCESS_KEY_ID" \
S3_BACKUP_SECRET_ACCESS_KEY="$RESTORE_BACKUP_SECRET_ACCESS_KEY" \
S3_BACKUP_POLICY_NAME=ciwie-restore-backup \
  docker compose --env-file .env run --rm --no-deps storage-init
MYSQL_DATABASE=ciwie_restore \
S3_BUCKET=ciwie-restore \
RESTORE_SOURCE_BUCKET=ciwie-private \
S3_BACKUP_ACCESS_KEY_ID="$RESTORE_BACKUP_ACCESS_KEY_ID" \
S3_BACKUP_SECRET_ACCESS_KEY="$RESTORE_BACKUP_SECRET_ACCESS_KEY" \
RESTORE_FILE=/backups/ciwie-YYYYMMDDTHHMMSSZ.sql.gz.enc \
  docker compose --env-file .env --profile restore run --rm restore
```

ค่า `RESTORE_*_ACCESS_KEY_ID` และ `RESTORE_*_SECRET_ACCESS_KEY` ต้องเป็น restore-only identities จาก secret manager และห้ามซ้ำกับ app/backup identities ของ source bucket. ชื่อ policy สำหรับ drill ต้องไม่ซ้ำกับ production เพื่อให้ bootstrap, restore หรือ assertion ที่ล้มเหลวไม่เปลี่ยนสิทธิ์ของระบบต้นทาง

Drill ต้องตรวจ checksum, migration table/FK, representative login/workflow และ object checksumใน target bucket รวมทั้งยืนยันด้วย source app และ source backup credentials ว่า marker ใน source bucketยังอ่านได้ทั้งก่อนและหลัง restore. CI สร้าง markerจริง สำรองทั้ง MySQL/object archive แล้วกู้เข้า database และ bucket ว่างแยกกันทุกครั้งโดยไม่เขียนทับ source policy ส่วน production operatorต้องใช้ชื่อ database/bucket/user/policy ที่สร้างเฉพาะ drill และบันทึกวันเวลา, artifact ID, RPO/RTO ที่วัดได้ และผู้อนุมัติ

## Supply-chain update policy

Dockerfile/Compose pin multi-architecture manifest digest และ GitHub Actions pin commit SHA โดยคง tag/major ไว้เป็นคำอธิบาย. Organization policy ต้องจำกัด Actions ที่อนุญาต การอัปเดต Node, MySQL, MinIO, ClamAV, Caddy หรือ Actions ต้อง resolve digest/SHA ใหม่และผ่าน build, merged Compose validation, vulnerability review และ backup/restore drill ก่อนใช้งานจริง
