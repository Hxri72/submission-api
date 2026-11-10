const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const UNIQUE = 80000;
const DUPLICATES = 20000;
const CONCURRENCY = 100;

const runId = Date.now();
const formId = `loadtest-${runId}`;

const keys = [];

for (let i = 0; i < UNIQUE; i++) {
    keys.push(`${runId}-key-${i}`);
}

for (let i = 0; i < DUPLICATES; i++) {
    keys.push(`${runId}-key-${i}`);
}

for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
}

let created = 0;
let duplicates = 0;
let errors = 0;
let next = 0;

async function sendRequest(key) {
    try {
        const res = await fetch(`${BASE_URL}/submissions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                form_id: formId,
                idempotency_key: key,
                email: "user@example.com",
                data: { name: "Load Test", message: "Hello" }
            })
        });

        await res.text();

        if (res.status === 201) {
            created++;
        } else if (res.status === 200) {
            duplicates++;
        } else {
            errors++;
        }
    } catch (error) {
        errors++;
    }
}

async function worker() {
    while (next < keys.length) {
        const key = keys[next];
        next++;
        await sendRequest(key);
    }
}

async function main() {
    console.log(`Sending ${keys.length} requests to ${BASE_URL} (form_id: ${formId}, concurrency: ${CONCURRENCY})...`);

    const start = Date.now();

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker());
    }
    await Promise.all(workers);

    const seconds = (Date.now() - start) / 1000;

    const res = await fetch(`${BASE_URL}/forms/${formId}/submissions`);
    const body = await res.json();

    console.log("\n===== Load Test Report =====");
    console.log("Total requests      :", keys.length);
    console.log("Created (201)       :", created);
    console.log("Duplicates (200)    :", duplicates);
    console.log("Errors              :", errors);
    console.log("Stored in DB        :", body.total);
    console.log("Time taken (s)      :", seconds.toFixed(2));
    console.log("Throughput (req/s)  :", Math.round(keys.length / seconds));
    console.log("============================");

    const passed = body.total === UNIQUE && duplicates === DUPLICATES && errors === 0;
    console.log(passed ? "PASS: 80000 stored, 20000 duplicates, 0 errors" : "FAIL: numbers do not match expected");
}

main();
