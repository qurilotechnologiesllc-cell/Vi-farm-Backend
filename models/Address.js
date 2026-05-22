const mongoose = require("mongoose");
const { addressToCoords, coordsToAddress } = require("../utils/geocode");
const User = require("./User"); // path adjust agar alag ho

const AddressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ---- Address Fields ----
    pinCode: { type: String, trim: true },
    houseNumber: { type: String, trim: true },
    street: { type: String, trim: true },
    locality: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true, default: "Delhi" },

    isDefault: { type: Boolean, default: false },

    // ---- GeoJSON Location ----
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  { timestamps: true }
);

/* =====================================================
   📍 PRE-SAVE: ONLY REVERSE GEO (NO AUTO GEO)
===================================================== */
AddressSchema.pre("save", async function (next) {
  try {
    const address = this;

    const hasCoords =
      Array.isArray(address.location?.coordinates) &&
      address.location.coordinates.length === 2 &&
      address.location.coordinates[0] !== 0;

    // ✅ ONLY reverse geo if coords already exist
    if (hasCoords && (!address.city || !address.pinCode)) {
      const [lng, lat] = address.location.coordinates;
      const addrData = await coordsToAddress(lat, lng);

      if (addrData) {
        address.city = address.city || addrData.city;
        address.state = address.state || addrData.state;
        address.district = address.district || addrData.district;
        address.pinCode = address.pinCode || addrData.pinCode;
      }
    }

    next();
  } catch (err) {
    console.error("❌ Address pre-save error:", err);
    next();
  }
});



/* =====================================================
   📌 INDEXES (VERY IMPORTANT)
===================================================== */
AddressSchema.index({ user: 1, isDefault: 1 });
AddressSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Address", AddressSchema);
