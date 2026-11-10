const express = require("express");
const Submission = require("./models/Submission");
const HourlyCount = require("./models/HourlyCount");

const app = express();

app.use(express.json());

app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    next();
});

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_SIZE = 10;

function validateSubmission(req, res, next) {
    const { form_id, email, idempotency_key } = req.body || {};

    if (!form_id) {
        return res.status(400).json({
            "message": "form_id is required"
        });
    }

    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({
            "message": "Invalid email"
        });
    }

    if (!idempotency_key) {
        return res.status(400).json({
            "message": "idempotency_key is required"
        });
    }

    next();
}

//getRequests

app.get("/forms/:form_id/submissions", async (req, res) => {
    const form_id = req.params.form_id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    const submissions = await Submission.find({ form_id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE);

    const total = await Submission.countDocuments({ form_id });

    res.status(200).json({
        "message": "Submissions fetched successfully",
        "page": page,
        "total": total,
        "total_pages": Math.ceil(total / PAGE_SIZE),
        "submissions": submissions
    });
});

app.get("/forms/:form_id/stats", async (req, res) => {
    const form_id = req.params.form_id;

    const hours = await HourlyCount.find({ form_id })
        .select({ _id: 0, submission_hour: 1, submission_count: 1 })
        .sort({ submission_hour: -1 })
        .lean();

    const total = hours.reduce((sum, item) => sum + item.submission_count, 0);

    res.status(200).json({
        "message": "Hourly counts fetched successfully",
        "form_id": form_id,
        "total": total,
        "hours": hours
    });
});

//postRequests

app.post("/submissions", validateSubmission, async (req, res) => {
    const { form_id, idempotency_key, email, data } = req.body;

    try {
        const submission = await Submission.create({ form_id, idempotency_key, email, data });

        res.status(201).json({
            "message": "Submission created successfully",
            "submission": submission
        });
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }

        const existing = await Submission.findOne({ idempotency_key });

        res.status(200).json({
            "message": "Duplicate submission, returning existing record",
            "submission": existing
        });
    }
});

//central error handling middleware

app.use((err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        "message": err.status ? err.message : "Internal Server Error"
    });
});

module.exports = app;
