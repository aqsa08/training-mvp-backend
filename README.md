# Training MVP Backend (Starter)

This starter implements the **core MVP backend + Postgres schema** described in your docs:
- Postgres tables: users, cohorts, cohort_users, lessons, sent_messages, reflections
- Daily send job (mock SMS by default)
- Twilio inbound webhook route
- Dashboard APIs: cohort summary + learner progress

## Quick start (Docker Postgres)

1) Copy env file:
```bash
cp .env.example .env
```

2) Install deps:
```bash
npm install
```

3) Start Postgres:
```bash
npm run db:up
```

4) Create tables:
```bash
npm run db:schema
```

5) Seed sample cohort/user/lesson:
```bash
npm run db:seed:sample
```

6) Run the API:
```bash
npm run dev
```

7) Hit health check:
```bash
curl http://localhost:4000/health
```

8) Run the daily send job (mock SMS prints to console):
```bash
npm run job:daily-send
```

## Switching to real Twilio

Edit `.env`:
- `SMS_PROVIDER=twilio`
- set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`

Then rerun:
```bash
npm run job:daily-send
```

## Twilio inbound webhook (local)

Run your API, then expose it with a tunnel tool (e.g., ngrok) so Twilio can reach:
`POST https://<your-public-url>/twilio/inbound`
