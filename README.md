# Submission API with Live Aggregation

Node.js + Express + MongoDB API for form submissions, with a 100k-request load test and live per-form, per-hour counts computed by Apache Flink.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/submissions` | Store a submission. 400 if `form_id` / `idempotency_key` missing or email invalid. **201** = created, **200** = duplicate key, existing record returned |
| GET | `/forms/:form_id/submissions?page=1` | Submissions for a form, 10 per page, newest first |
| GET | `/forms/:form_id/stats` | Live hourly counts for a form (computed by Flink) |

## How to run

```bash
npm install
cp .env.example .env
docker compose up -d --build     # MongoDB replica set (27018) + Flink (UI: http://localhost:8081)
npm run dev                      # API on http://localhost:3000
# send one POST /submissions so the collection exists, then:
npm run flink:submit             # start the Flink job (once)
npm run loadtest                 # Part 2 load test
```

Postman collection: `postman/Submission-API.postman_collection.json`

## Load Test Report (Part 2)

100,000 `POST /submissions` requests: 80,000 unique `idempotency_key`s + 20,000 duplicates (reused keys), shuffled, 100 concurrent requests.

| Metric | Result |
|---|---|
| Total requests sent | 100,000 |
| **Submissions actually stored** | **80,000** |
| **Duplicates correctly rejected** | **20,000** |
| **Errors** | **0** |
| **Throughput** | **3,426 req/s** (100,000 requests in 29.18 s) |

Verification:
- Stored count checked through the API (`GET /forms/:form_id/submissions` → `total: 80000`) and directly in MongoDB (`countDocuments` = 80,000, distinct `idempotency_key` = 80,000 → no duplicate rows).
- Flink hourly count for the same form: **80,000**.

Throughput across runs (same machine, MacBook):

| Setup | Throughput |
|---|---|
| Final setup — MongoDB replica set in Docker, Flink running alongside | 3,426 – 5,236 req/s (4 runs) |
| Local standalone MongoDB, no Flink | 7,903 – 8,677 req/s (2 runs) |

All runs: exactly 80,000 stored, 20,000 duplicates, 0 errors.

**How duplicates are prevented:** a unique index on `idempotency_key`. The API inserts directly; if MongoDB rejects it with duplicate-key error `11000`, the existing record is returned with 200. No "check then insert", so concurrent duplicates cannot slip through.

## Live Aggregation with Flink (Part 3)

```
API ──insert──► MongoDB ──change stream (CDC)──► Flink SQL job ──upsert──► form_hourly_counts
```

- Flink reads new submissions from MongoDB's change stream and runs `COUNT(*) ... GROUP BY form_id, hour` continuously (`flink/hourly_counts.sql`).
- Results are upserted into `form_hourly_counts`, one document per (form, hour).

**Crash test:** Flink TaskManager killed with SIGKILL in the middle of a 100k load test, then restarted.

| Moment | Stored in MongoDB | Flink count |
|---|---|---|
| 8 s into load test | 41,627 | 40,396 (live) |
| TaskManager killed — 16 s | 74,419 | 42,062 (frozen) |
| Restarted, +15 s | 80,000 | **80,000** |

**Why nothing is lost or double-counted:** every 10 s Flink checkpoints the counts *and* its position in the change stream together. After a crash it restores both from the last checkpoint and replays the change stream from that position, so replayed events are counted onto counts that don't include them yet. The sink writes the full count as an upsert keyed by (form, hour), so rewriting a row is harmless.
