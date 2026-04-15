// const express = require("express");
// const router = express.Router();
// const ChargingSession = require("../models/ChargingSession");
// const User = require("../models/User");
// const mongoose = require("mongoose");
// const ObjectId = mongoose.Types.ObjectId;

// // const COST_PER_KWH = 0.20; // Cost per kWh
// // const CHARGING_POWER = 7; // Assume charger delivers 7kW

// // Start Charging
// // Start Charging
// router.post("/start", async (req, res) => {
//     try {
//         const { userId } = req.body;
//         if (!userId) {
//             return res.status(400).json({ message: "User ID is required" });
//         }

//         console.log("Received Start Charging Request:", { userId });

//         const userObjectId = new ObjectId(userId);

//         // Stop any previously active session
//         await ChargingSession.updateMany(
//             { userId: userObjectId, status: "active" },
//             { $set: { status: "completed", endTime: new Date() } }
//         );

//         // Create new charging session
//         const newSession = new ChargingSession({
//             userId: userObjectId,
//             startTime: new Date(),
//             energyConsumed: 0,
//             cost: 0,
//             status: "active",
//         });

//         await newSession.save();

//         console.log("🚀 Charging session created:", newSession);
//         res.status(201).json({ 
//             message: "Charging started",
//             sessionId: newSession._id  // ✅ Send sessionId explicitly
//         });
//     } catch (error) {
//         console.error("Start Charging Error:", error);
//         res.status(500).json({ message: "Internal Server Error" });
//     }
// });






//   router.post("/stop", async (req, res) => {
//     try {
//       const { userId } = req.body;

//       if (!userId) {
//         return res.status(400).json({ message: "User ID is required" });
//       }

//       console.log("🔹 Received Stop Charging Request:", { userId });

//       // 🔹 Force userId to be an ObjectId
//       let userObjectId;
//       try {
//         userObjectId = new mongoose.Types.ObjectId(userId);
//       } catch (error) {
//         console.error("❌ Invalid UserID format:", userId);
//         return res.status(400).json({ message: "Invalid User ID format" });
//       }
//       console.log("🔎 Searching for active session with userId:", userObjectId);

//       // ✅ Ensure active session is found
//       const activeSession = await ChargingSession.findOne({
//         userId: userObjectId, 
//         status: "active"
//       }).sort({ startTime: -1 });

//       if (!activeSession) {
//         console.log("❌ No active charging session found!");
//         return res.status(400).json({ message: "No active charging session found" });
//       }

//       console.log("✅ Found Active Charging Session:", activeSession);

//       // ✅ Stop session
//       activeSession.status = "completed";
//       activeSession.endTime = new Date();

//       // ✅ Calculate cost
//     //   const durationMinutes = (activeSession.endTime - activeSession.startTime) / 60000;
//     //   activeSession.cost = durationMinutes * 0.15;
//     const INR_COST_PER_KWH = 13; // Updated cost in INR
//     const CHARGING_POWER_KW = 7;

//     const durationMinutes = (activeSession.endTime - activeSession.startTime) / 60000;
//     activeSession.cost = (CHARGING_POWER_KW * durationMinutes * INR_COST_PER_KWH) / 60; 

//     await activeSession.save();



//       await activeSession.save();

//       const user = await User.findById(userId);
//       if(user){
//         user.monthlyBill += activeSession.cost;
//         await user.save();
//       }

//       console.log("✅ Monthly bill updated in database for user:", userId);

//       console.log("✅ Charging session stopped successfully:", activeSession);
//       res.status(200).json(activeSession);
//     } catch (error) {
//       console.error("❌ Stop Charging Error:", error);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   });




// // Get User Bill
// router.get("/:userId/bill", async (req, res) => {
//     try {
//       const { userId } = req.params;

//       // Ensure userId is valid
//       if (!mongoose.Types.ObjectId.isValid(userId)) {
//         return res.status(400).json({ message: "Invalid User ID format" });
//       }

//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({ message: "User not found" });
//       }

//       res.json({ monthlyBill: user.monthlyBill || 0 });
//     } catch (error) {
//       console.error("❌ Error fetching bill:", error);
//       res.status(500).json({ message: "Internal Server Error" });
//     }
//   });

// module.exports = router;




const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const ChargingSession = require("../models/ChargingSession");
const User = require("../models/User");

const ESP32_URL = "http://10.187.18.226"; // ⚡ Update with your ESP32 IP

// Start Charging
router.post("/start", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        console.log("🚀 Received Start Charging Request:", { userId });

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Stop any previously active session that was abandoned (failed stop etc)
        // Set to "failed" instead of "completed" so it does not appear in history
        await ChargingSession.updateMany(
            { userId: userObjectId, status: "active" },
            { $set: { status: "failed", endTime: new Date() } }
        );

        // Fetch User to denormalize name into session
        const user = await User.findById(userObjectId);
        const userName = user ? user.name : "Unknown User";

        // Create new charging session
        const newSession = new ChargingSession({
            userId: userObjectId,
            userName: userName,
            startTime: new Date(),
            energyConsumed: 0,
            cost: 0,
            status: "active",
        });

        await newSession.save();
        console.log("✅ Charging session created:", newSession);

        // 🔹 Send request to ESP32 to turn ON relay
        try {
            await axios.get(`${ESP32_URL}/start`, { timeout: 3000 });
            console.log("✅ Relay turned ON via ESP32");
        } catch (espError) {
            console.error("❌ Failed to turn on relay:", espError.message);
        }

        res.status(201).json({
            message: "Charging started",
            sessionId: newSession._id
        });
    } catch (error) {
        console.error("❌ Start Charging Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Stop Charging
router.post("/stop", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        console.log("🛑 Received Stop Charging Request:", { userId });

        let userObjectId;
        try {
            userObjectId = new mongoose.Types.ObjectId(userId);
        } catch (error) {
            console.error("❌ Invalid UserID format:", userId);
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const activeSession = await ChargingSession.findOne({
            userId: userObjectId,
            status: "active"
        }).sort({ startTime: -1 });

        if (!activeSession) {
            console.log("❌ No active charging session found!");
            return res.status(400).json({ message: "No active charging session found" });
        }

        console.log("✅ Found Active Charging Session:", activeSession);

        activeSession.status = "completed";
        activeSession.endTime = new Date();

        // 🔹 1. Send request to ESP32 to turn OFF relay & Get Final Data
        let finalEnergyConsumed = 0;
        try {
            const espResponse = await axios.get(`${ESP32_URL}/stop`, { timeout: 5000 });
            console.log("✅ Charging Stopped via ESP32");

            // Expected ESP32 Response: { "message": "Stopped", "energyConsumed_kWh": 1.25 }
            if (espResponse.data && espResponse.data.energyConsumed_kWh !== undefined) {
                finalEnergyConsumed = parseFloat(espResponse.data.energyConsumed_kWh);
                console.log(`⚡ Final Energy Consumed from STM32: ${finalEnergyConsumed} kWh`);
            } else {
                return res.status(502).json({ error: "Invalid response from ESP hardware missing energyConsumed_kWh" });
            }
        } catch (espError) {
            console.error("❌ Failed to reach ESP hardware:", espError.message);
            return res.status(502).json({ error: "Failed to connect to ESP hardware to stop session" });
        }

        // 🔹 2. Calculate true cost in INR based on ACTUAL metered energy
        const INR_COST_PER_KWH = 13;
        activeSession.energyConsumed = finalEnergyConsumed;
        activeSession.cost = finalEnergyConsumed * INR_COST_PER_KWH;

        await activeSession.save();

        // 🔹 3. Update user’s monthly bill
        const user = await User.findById(userId);
        if (user) {
            user.monthlyBill += activeSession.cost;
            await user.save();
        }

        console.log("✅ Monthly bill updated for user:", userId);
        console.log("✅ Charging session stopped successfully:", activeSession);

        res.status(200).json(activeSession);
    } catch (error) {
        console.error("❌ Stop Charging Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get User Bill
router.get("/:userId/bill", async (req, res) => {
    try {
        const { userId } = req.params;
        let { month, year } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        month = month !== undefined ? parseInt(month) : currentMonth;
        year = year !== undefined ? parseInt(year) : currentYear;

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        const billData = await ChargingSession.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(userId),
                    status: { $in: ["completed", "fault_stopped"] },
                    startTime: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBill: { $sum: "$cost" }
                }
            }
        ]);

        const monthlyBill = billData.length > 0 ? billData[0].totalBill : 0;

        res.json({
            monthlyBill: monthlyBill,
            wingName: user.wingName || "N/A",
            flatNumber: user.flatNumber || "N/A"
        });
    } catch (error) {
        console.error("❌ Error fetching bill:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/test-esp", async (req, res) => {
    try {
        const response = await axios.get(`${ESP32_URL}/start`);
        res.json({ message: "ESP32 Response", data: response.data });
    } catch (error) {
        res.status(500).json({ error: "ESP32 not responding", details: error.message });
    }
});

// Get Live Data from ESP32 for Active Session
router.get("/status/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        // Verify active session exists
        const activeSession = await ChargingSession.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            status: "active"
        });

        if (!activeSession) {
            return res.status(400).json({ message: "No active charging session found" });
        }

        // Fetch live telemetry from the ESP32
        let espResponse;
        try {
            espResponse = await axios.get(`${ESP32_URL}/live-data`, { timeout: 2500 });
        } catch (hwError) {
            console.error("❌ ESP32 offline, hardware error:", hwError.message);
            return res.status(502).json({ error: "ESP Hardware Unreachable" });
        }

        // Expected Data from STM32 via ESP32: 
        // { "power_kW": 6.8, "voltage": 235, "current": 29, "energyConsumed_kWh": 1.2 }

        // Calculate the LIVE cost metric
        const INR_COST_PER_KWH = 13;
        const liveCost = (espResponse.data.energyConsumed_kWh || 0) * INR_COST_PER_KWH;

        // EMERGENCY FAULT SHUTDOWN LOGIC
        if (espResponse.data.fault) {
            console.log(`❌🚨 HARDWARE FAULT DETECTED: ${espResponse.data.fault}. FORCE STOPPING SESSION for User: ${userId}`);

            activeSession.status = "fault_stopped";
            activeSession.endTime = new Date();
            activeSession.energyConsumed = espResponse.data.energyConsumed_kWh || 0;
            activeSession.cost = liveCost;
            await activeSession.save();

            // Note: Since this forces a stop, we update the user's monthly bill silently
            const user = await User.findById(userId);
            if (user) {
                user.monthlyBill += activeSession.cost;
                await user.save();
            }

            // Immediately send back the fault to frontend
            return res.status(200).json({
                ...espResponse.data,
                liveCost: liveCost,
                sessionEndedViaFault: true
            });
        }


        res.status(200).json({
            ...espResponse.data,
            liveCost: liveCost
        });

    } catch (error) {
        console.error("❌ Error fetching live telemetry:", error.message);
        res.status(502).json({ error: "Failed to fetch live telemetry" });
    }
});

// GET Predictive Analytics Forecast
router.get("/:userId/forecast", async (req, res) => {
    try {
        const { userId } = req.params;
        let { month, year } = req.query;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        month = month !== undefined ? parseInt(month) : currentMonth;
        year = year !== undefined ? parseInt(year) : currentYear;

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 1);

        const dailyUsage = await ChargingSession.aggregate([
            {
                $match: {
                    userId: userObjectId,
                    status: { $in: ["completed", "fault_stopped"] },
                    startTime: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$startTime" } },
                    totalEnergy: { $sum: "$energyConsumed" },
                    totalCost: { $sum: "$cost" }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);

        // Transform for charts
        let historicalData = dailyUsage.map(day => ({
            date: day._id,
            actualUsage: day.totalEnergy || 0
        }));

        // Calculate average daily usage in this month
        let averageDaily = 0;
        if (historicalData.length > 0) {
            const sum = historicalData.reduce((acc, curr) => acc + curr.actualUsage, 0);
            averageDaily = sum / historicalData.length;
        }

        let predictedData = [];
        let lastDate = historicalData.length > 0
            ? new Date(historicalData[historicalData.length - 1].date)
            : new Date(year, month, 1); // fallback to start of selected month

        for (let i = 1; i <= 7; i++) {
            let nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);
            predictedData.push({
                date: nextDate.toISOString().split("T")[0],
                predictedUsage: averageDaily
            });
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const predicted30DayTotal = averageDaily * daysInMonth;

        res.status(200).json({
            historicalData,
            predictedData,
            predicted30DayTotal,
            averageDaily
        });
    } catch (error) {
        console.error("❌ Error fetching forecast data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get User Charging History (Day-wise)
router.get("/:userId/history", async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Invalid User ID format" });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Fetch all completed sessions for this user, sorted newest first
        const history = await ChargingSession.find({
            userId: userObjectId,
            status: { $in: ["completed", "fault_stopped"] }
        }).sort({ startTime: -1 });

        res.status(200).json(history);
    } catch (error) {
        console.error("❌ Error fetching history data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

module.exports = router;
