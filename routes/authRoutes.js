const express = require("express");
const router = express.Router();
const User = require("../models/User");
const twilio = require("twilio");
// connection check
console.log("SID:", process.env.TWILIO_ACCOUNT_SID);

// Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generating  OTP
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();


// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { name, phone } = req.body;

    let user = await User.findOne({ phone });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    if (!user) {
      user = new User({ name, phone });
    }

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Send SMS
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });

    res.json({ message: "OTP sent to phone 📱" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Invalid or expired OTP " });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;

    await user.save();

    res.json({ message: "Phone verified successfully " });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Protected route
router.get("/protected", async (req, res) => {
  const { phone } = req.query;

  const user = await User.findOne({ phone });

  if (!user || !user.isVerified) {
    return res.status(403).json({ message: "Access denied " });
  }

  res.json({ message: "Welcome! You are verifie" });
});

module.exports = router;