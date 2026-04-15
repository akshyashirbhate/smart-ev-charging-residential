// backend/server.js
require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']); // Workaround for ISP blocking MongoDB SRV records
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const chargingRoutes = require("./routes/charging");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {})
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log('DB Connection Error:', err));

// Prevent MongoDB network drops from crashing the Node.js process!
mongoose.connection.on('error', err => {
    console.log('⚠️ MongoDB Connection Issue (Not Crashing):', err.message);
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
app.use("/api/charging", chargingRoutes);
app.use("/api/charging", require("./routes/charging"));
app.use("/api/admin", require("./routes/admin"));



app.get('/', (req, res) => {
    res.send('Smart EV Charging Backend is Running...');
});

const PORT = process.env.PORT || 3000;
app.listen(5000, '0.0.0.0', () => {
    console.log("Server running on port 5000");
});