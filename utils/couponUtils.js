const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");

const getVendorIdsFromCart = (cart) => {
  if (!cart || !Array.isArray(cart.items)) return [];

  return [
    ...new Set(
      cart.items
        .filter((i) => i.vendor && mongoose.Types.ObjectId.isValid(i.vendor))
        .map((i) => new mongoose.Types.ObjectId(i.vendor)),
    ),
  ];
};

const getVisibleCouponsForVendors = async (vendorIds, now = new Date()) => {
  return Coupon.find({
    status: "Active",
    startDate: { $lte: now },
    expiryDate: { $gte: now },
    $or: [
      { vendor: null }, // ✅ ADMIN COUPONS
      { vendor: { $in: vendorIds } }, // ✅ VENDOR COUPONS
    ],
  }).lean();
};

module.exports = {
  getVendorIdsFromCart,
  getVisibleCouponsForVendors,
};
