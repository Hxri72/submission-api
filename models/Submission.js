const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        form_id: { type: String, required: true, index: true },
        idempotency_key: { type: String, required: true, unique: true },
        email: { type: String, required: true },
        data: { type: Object, default: {} }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);
