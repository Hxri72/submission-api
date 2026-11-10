require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const Submission = require("./models/Submission");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectDB();
        await Submission.init();

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        const shutdown = async (signal) => {
            console.log(`${signal} received, shutting down...`);
            server.close(async () => {
                await mongoose.connection.close();
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (error) {
        console.error("Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();
