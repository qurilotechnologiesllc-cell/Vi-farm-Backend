const mongoose = require("mongoose");
const { addressToCoords } = require("../utils/geocode");

const vendorAddressSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // ek vendor = ek primary address
      index: true,
    },

    // ---------- BASIC ADDRESS ----------
    pinCode: { type: String, trim: true },
    houseNumber: { type: String, trim: true },
    locality: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    state: { type: String, trim: true },

    fullAddress: { type: String },

    // ---------- DELIVERY CONFIG ----------
    deliveryType: {
      type: String,
      enum: ["Pickup", "Delivery", "Both"],
      default: "Pickup", // 🔥 default
    },

    deliveryRadius: {
      type: Number, // km
      default: 0,
    },

    // ---------- GEO LOCATION ----------
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0],
      },
    },
  },
  { timestamps: true },
);

/* =====================================
   📍 AUTO GEO FROM ADDRESS
   (NO LAT/LNG FROM FRONTEND)
===================================== */
vendorAddressSchema.pre("save", async function (next) {
  try {
    const fields = [
      "houseNumber",
      "locality",
      "city",
      "district",
      "state",
      "pinCode",
    ];

    const addressChanged = fields.some((f) => this.isModified(f));
    if (!addressChanged) return next();

    const addressObj = {
      houseNumber: this.houseNumber,
      locality: this.locality,
      city: this.city,
      district: this.district,
      state: this.state,
      pinCode: this.pinCode,
    };

    const coords = await addressToCoords(addressObj); // ✅ OBJECT PASS

    if (coords) {
      this.location.coordinates = coords;
      this.fullAddress = Object.values(addressObj).filter(Boolean).join(", ");
    } else {
      // 🔥 IMPORTANT: reset to avoid stale data
      this.location.coordinates = [0, 0];
      this.fullAddress = "";
    }

    next();
  } catch (err) {
    console.error("❌ VendorAddress pre-save error:", err);
    next(err);
  }
});

/* =====================================
   📌 INDEXES
===================================== */
vendorAddressSchema.index({ location: "2dsphere" });
vendorAddressSchema.index({ vendor: 1 });

module.exports = mongoose.model("VendorAddress", vendorAddressSchema);
