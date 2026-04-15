const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const router = express.Router(); 

// User Signup Route
// User Signup Route
router.post('/signup', async (req, res) => {
    try {
        console.log("Signup request received:", req.body);

        const { name, email, password, wingName, flatNumber } = req.body;
        if (!name || !email || !password || !wingName || !flatNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Assign "user" role by default (Admin must be manually assigned in DB)
        user = new User({ name, email, password: hashedPassword, wingName, flatNumber, role: "user" });
        await user.save();

        console.log("User registered successfully");
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: 'Server error', error });
    }
});

// User Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, userId: user._id, role: user.role, message: 'Login successful' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
