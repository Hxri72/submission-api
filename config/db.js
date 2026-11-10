const mongoose = require("mongoose");

async function connectDB() {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error("MONGO_URI is not defined in .env");
    }

    await mongoose.connect(uri);
    console.log("MongoDB connected:", mongoose.connection.name);
}

mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected");
});

module.exports = connectDB;
