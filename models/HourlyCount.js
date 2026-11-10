const mongoose = require("mongoose");

const hourlyCountSchema = new mongoose.Schema(
    {
        form_id: String,
        submission_hour: String,
        submission_count: Number
    },
    { collection: "form_hourly_counts" }
);

module.exports = mongoose.model("HourlyCount", hourlyCountSchema);
