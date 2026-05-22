// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const { createAndSendNotification } = require("../utils/notificationUtils");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  sendNotification,
  getNotifications,
  markAsRead,
  deleteNotification,
  deleteAllNotifications
} = require("../controllers/notificationController");
const User = require("../models/User");

// ✅ Send new notification
router.post("/", authMiddleware, sendNotification);

// ✅ Fetch all
router.get("/", authMiddleware, getNotifications);

// ✅ Mark as read
router.put("/:id/read", authMiddleware, markAsRead);

// ✅ Delete all
router.delete("/delete-all", authMiddleware, deleteAllNotifications);

// ✅ Delete single
router.delete("/:id", authMiddleware, deleteNotification);

// ✅ Save Expo Push Token
router.put("/save-push-token", authMiddleware, async (req, res) => {
  try {
    console.log("\n==============================");
    console.log("📨 SAVE EXPO PUSH TOKEN API HIT");
    console.log("👤 Logged-in User:", req.user?._id);
    console.log("📥 Incoming Body:", req.body);
    console.log("==============================\n");

    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      console.log("❌ No expoPushToken received!");
      return res.status(400).json({
        success: false,
        message: "Expo push token missing",
      });
    }

    // 🔍 Check if token already assigned to another user
    const existingUser = await User.findOne({ expoPushToken });

    if (
      existingUser &&
      existingUser._id.toString() !== req.user._id.toString()
    ) {
      console.log(
        `⚠️ Token already assigned to another user (${existingUser._id}). Removing from old user...`
      );

      await User.updateOne(
        { _id: existingUser._id },
        { $unset: { expoPushToken: "" } }
      );
    }

    // 💾 Save the token
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { expoPushToken },
      { new: true }
    );

    console.log("✅ Token saved to user:", user._id);
    console.log("📲 Saved token:", user.expoPushToken);

    res.json({
      success: true,
      message: "Expo push token saved",
      token: user.expoPushToken,
    });
  } catch (error) {
    console.error("❌ Expo token save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save expo push token",
    });
  }
});


// ✅ Test push route (Admin only)
router.post("/test-push", authMiddleware, async (req, res) => {
  try {
    const { title, message, userId } = req.body;

    console.log("\n==============================");
    console.log("🔥 TEST PUSH NOTIFICATION API HIT");
    console.log("👤 Sender:", req.user._id);
    console.log("🎯 Target User:", userId);
    console.log("==============================\n");

    const targetUser = await User.findById(userId).select("expoPushToken");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!targetUser.expoPushToken) {
      return res.status(400).json({
        success: false,
        message: "User does not have an Expo push token saved",
      });
    }

    // Direct SEND via Expo SDK
    const messages = [
      {
        to: targetUser.expoPushToken,
        sound: "default",
        title: title || "🚀 Test Notification",
        body: message || "Your push notification system is working perfectly!",
        data: {
          test: true,
          sentAt: new Date(),
        },
      },
    ];

    console.log("📲 Sending Notification To:", targetUser.expoPushToken);

    // Expo SDK logic
    const expo = req.app.get("expo") || global.expo;
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      console.log("🎟 Expo Ticket Response:", tickets);
    }

    return res.json({
      success: true,
      message: "Test push sent successfully!",
    });
  } catch (error) {
    console.error("🔥 TEST PUSH ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test push",
      error: error.message,
    });
  }
});


module.exports = router;
