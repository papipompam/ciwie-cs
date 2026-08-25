# CIWIE-CS

ระบบจัดการการนิเทศสหกิจศึกษาแบบ Nuxt 4 Modular Monolith ดู Requirement และ Architecture ที่ [docs/MASTER_SYSTEM_PLAN.md](docs/MASTER_SYSTEM_PLAN.md)

## Requirements

- Node.js 22+
- pnpm 11+
- Docker และ Docker Compose

## Development

```bash
cp .env.example .env
pnpm install
docker compose up -d db storage mailpit
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

ห้ามใช้ค่าตัวอย่างจาก `.env.example` ใน production และต้องเปลี่ยน initial admin password เมื่อเข้าสู่ระบบครั้งแรก

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm prisma:validate
pnpm build
docker build -t ciwie-cs .
docker compose --env-file .env.example config
docker compose --env-file .env.example -f compose.yaml -f compose.production.yaml config
```

## Backup and restore

```bash
docker compose --profile backup run --rm backup
RESTORE_FILE=/backups/ciwie-YYYYMMDDTHHMMSSZ.sql.gz.enc docker compose --profile restore run --rm restore
```

แต่ละรอบจะสร้าง archive ที่เข้ารหัสและ checksum แยกสำหรับ MySQL และ object storage โดย restore จะตรวจและกู้ไฟล์ก่อนนำฐานข้อมูลกลับมา การ restore เป็น destructive operation ต่อฐานข้อมูลเป้าหมาย ต้องใช้ environment แยกและผ่าน restore drill ก่อน production

Production ต้องแยก credential ของ app/backup ออกจาก MinIO root โดย app เข้าถึง object ได้เฉพาะ `uploads/`, `imports/`, `exports/`; production Compose บังคับ encrypted off-site copy และต้องทำตาม release/restore gate ใน [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)
