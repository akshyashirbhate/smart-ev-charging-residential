const User = require("../models/User");
const ChargingSession = require("../models/ChargingSession");
const express = require("express");
const router = express.Router();

router.get("/users", async (req, res) => {
    try {
        console.log("Fetching all users...");
        const users = await User.find({}, "name email role");

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const startDate = new Date(currentYear, currentMonth, 1);
        const endDate = new Date(currentYear, currentMonth + 1, 1);

        const billData = await ChargingSession.aggregate([
            {
                $match: {
                    status: { $in: ["completed", "fault_stopped"] },
                    startTime: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: "$userId",
                    totalBill: { $sum: "$cost" }
                }
            }
        ]);

        const billMap = {};
        billData.forEach(item => {
            billMap[item._id.toString()] = item.totalBill;
        });

        const usersWithDynamicBill = users.map(user => {
            return {
                ...user.toObject(),
                monthlyBill: billMap[user._id.toString()] || 0
            };
        });

        res.status(200).json(usersWithDynamicBill);
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;