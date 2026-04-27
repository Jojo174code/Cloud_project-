# LeasePilot AWS Deployment

## Region
- us-east-1

## Resources
- Frontend S3 bucket: `leasepilot-frontend-327946675532-us-east-1`
- Backend EC2 instance reused: `leasepilot-api-ec2`
- API security group: `leasepilot-sg-api`
- RDS instance: `leasepilot-rds`
- RDS security group: `leasepilot-sg-rds`
- RDS subnet group: `leasepilot-rds-subnet`

## URLs
- Frontend S3 website: `http://leasepilot-frontend-327946675532-us-east-1.s3-website-us-east-1.amazonaws.com`
- Backend API: `http://3.86.35.198:4000`
- Backend health: `http://3.86.35.198:4000/api/health`

## RDS
- Engine: PostgreSQL 17.4
- Class: db.t3.micro
- Public access: disabled
- Endpoint: `leasepilot-rds.crbhdpff8iua.us-east-1.rds.amazonaws.com` (do not expose credentials)

## Frontend redeploy
```bash
cd client
NEXT_PUBLIC_API_URL=http://3.86.35.198:4000 npm run build
cd ..
aws s3 sync client/out/ s3://leasepilot-frontend-327946675532-us-east-1 --delete
```

## Backend restart
```bash
cd /home/ubuntu/.openclaw/workspace/server
npm run build
pm2 restart leasepilot-api
pm2 status leasepilot-api
pm2 logs leasepilot-api --lines 100
```

## Prisma production schema push
Use the explicit environment export to avoid Prisma env resolution issues:
```bash
cd /home/ubuntu/.openclaw/workspace/server
DBURL=$(python3 - <<'PY'
from pathlib import Path
for line in Path('.env').read_text().splitlines():
    if line.startswith('DATABASE_URL='):
        print(line.split('=',1)[1])
        break
PY
)
export DATABASE_URL="$DBURL"
npx prisma db push --schema=../prisma/schema.postgres.prisma
```

## Cleanup
Delete resources when finished to avoid charges:
```bash
aws s3 rm s3://leasepilot-frontend-327946675532-us-east-1 --recursive
aws s3api delete-bucket --bucket leasepilot-frontend-327946675532-us-east-1
aws rds delete-db-instance --region us-east-1 --db-instance-identifier leasepilot-rds --skip-final-snapshot
aws ec2 delete-security-group --region us-east-1 --group-id sg-09d28936aa4c286c9
aws ec2 delete-security-group --region us-east-1 --group-id sg-03cb94d9b3775ec52
aws rds delete-db-subnet-group --region us-east-1 --db-subnet-group-name leasepilot-rds-subnet
```

## Notes
- `server/.env` exists only on this EC2 host and is not committed.
- `NEXT_PUBLIC_API_URL` is compiled into the static frontend at build time.
- Request detail routing was changed from dynamic `/requests/[id]` to static-export-safe `/requests/view?id=...` for S3 hosting.
