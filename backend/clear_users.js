const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const clearUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Connected to MongoDB");

        const result = await User.deleteMany({});
        console.log(`Successfully deleted ${result.deletedCount} users.`);

        mongoose.connection.close();
        console.log("Database connection closed.");
    } catch (error) {
        console.error("Error clearing users:", error);
        process.exit(1);
    }
};

clearUsers();
