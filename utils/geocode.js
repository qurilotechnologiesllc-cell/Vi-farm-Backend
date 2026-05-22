// const axios = require("axios");

// /**
//  * 🔍 Convert a full address string into geographic coordinates [longitude, latitude]
//  */
// exports.addressToCoords = async (address) => {
//   try {
//     if (!address || typeof address !== "string" || !address.trim()) {
//       console.warn("⚠️ addressToCoords: Invalid or empty address input.");
//       return null;
//     }

//     const { data } = await axios.get(
//       "https://nominatim.openstreetmap.org/search",
//       {
//         params: {
//           q: address,
//           format: "json",
//           limit: 1,
//           countrycodes: "in", // 🔥 IMPORTANT
//           addressdetails: 1,
//         },
//         headers: {
//           "User-Agent": "viafarm-app/1.0 (viafarm.in)",
//         },
//         timeout: 8000,
//       },
//     );

//     if (!data || !data.length) return null;

//     const lat = parseFloat(data[0].lat);
//     const lng = parseFloat(data[0].lon);

//     if (isNaN(lat) || isNaN(lng)) return null;

//     return [lng, lat]; // ✅ GeoJSON order
//   } catch (err) {
//     console.error("❌ addressToCoords error:", err.message);
//     return null;
//   }
// };

// /**
//  * 📍 Convert coordinates into structured address
//  */
// exports.coordsToAddress = async (lat, lon) => {
//   try {
//     if (
//       lat === undefined ||
//       lon === undefined ||
//       isNaN(lat) ||
//       isNaN(lon)
//     ) {
//       console.warn("⚠️ coordsToAddress: Invalid coordinates provided.");
//       return null;
//     }

//     const { data } = await axios.get(
//       "https://nominatim.openstreetmap.org/reverse",
//       {
//         params: {
//           lat,
//           lon,
//           format: "json",
//           addressdetails: 1,
//         },
//         headers: {
//           "User-Agent": "viafarm-app/1.0 (viafarm.in)",
//         },
//         timeout: 8000,
//       }
//     );

//     if (!data || !data.address) return null;

//     const addr = data.address;

//     return {
//       fullAddress: data.display_name || "",
//       pinCode: addr.postcode || "",
//       city: addr.city || addr.town || addr.village || addr.hamlet || "",
//       district: addr.state_district || addr.county || "",
//       state: addr.state || "",
//       country: addr.country || "",
//       locality: addr.suburb || addr.neighbourhood || addr.road || "",
//     };
//   } catch (err) {
//     console.error("❌ coordsToAddress error:", err.message);
//     return null;
//   }
// };

const axios = require("axios");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

exports.addressToCoords = async (addressObj) => {
  try {
    let data = [];

    /* ===============================
       1️⃣ TRY STRUCTURED SEARCH
    =============================== */
    const structuredParams = {
      format: "json",
      limit: 1,
      country: "India",
      countrycodes: "in",
      addressdetails: 1,
      street: [addressObj.houseNumber, addressObj.locality]
        .filter(Boolean)
        .join(" "),
      city: addressObj.city,
      state: addressObj.state,
      postalcode: addressObj.pinCode,
    };

    const structuredRes = await axios.get(`${NOMINATIM_URL}/search`, {
      params: structuredParams,
      headers: {
        "User-Agent": "viafarm-app/1.0 (viafarm.in)",
      },
      timeout: 8000,
    });

    data = structuredRes.data;

    /* ===============================
       2️⃣ FALLBACK: FREE TEXT SEARCH
    =============================== */
    if (!Array.isArray(data) || data.length === 0) {
      const fallbackAddress = [
        addressObj.houseNumber,
        addressObj.locality,
        addressObj.city,
        addressObj.district,
        addressObj.state,
        addressObj.pinCode,
      ]
        .filter(Boolean)
        .join(", ");

      console.warn(
        "⚠️ Structured geocode failed, falling back to text search:",
        fallbackAddress,
      );

      const fallbackRes = await axios.get(`${NOMINATIM_URL}/search`, {
        params: {
          q: fallbackAddress,
          format: "json",
          limit: 1,
          countrycodes: "in",
        },
        headers: {
          "User-Agent": "viafarm-app/1.0 (viafarm.in)",
        },
        timeout: 8000,
      });

      data = fallbackRes.data;
    }

    /* ===============================
       3️⃣ FINAL VALIDATION
    =============================== */
    if (!Array.isArray(data) || data.length === 0) {
      console.error("❌ Geocoding failed for address:", addressObj);
      return null;
    }

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.error("❌ Invalid lat/lng from Nominatim:", data[0]);
      return null;
    }

    return [lng, lat]; // GeoJSON order
  } catch (err) {
    console.error("❌ addressToCoords error:", err.message);
    return null;
  }
};

/**
 * 📍 Convert coordinates into structured address
 * (Used only when reverse geo is explicitly needed)
 */
exports.coordsToAddress = async (lat, lon) => {
  try {
    if (
      lat === undefined ||
      lon === undefined ||
      Number.isNaN(Number(lat)) ||
      Number.isNaN(Number(lon))
    ) {
      console.warn("⚠️ coordsToAddress: Invalid coordinates");
      return null;
    }

    const { data } = await axios.get(`${NOMINATIM_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: "json",
        addressdetails: 1,
      },
      headers: {
        "User-Agent": "viafarm-app/1.0 (viafarm.in)",
      },
      timeout: 8000,
    });

    if (!data || !data.address) return null;

    const addr = data.address;

    return {
      fullAddress: data.display_name || "",
      pinCode: addr.postcode || "",
      city: addr.city || addr.town || addr.village || addr.hamlet || "",
      district: addr.state_district || addr.county || "",
      state: addr.state || "",
      country: addr.country || "",
      locality: addr.suburb || addr.neighbourhood || addr.road || "",
    };
  } catch (err) {
    console.error("❌ coordsToAddress error:", err.message);
    return null;
  }
};

/*
const axios = require("axios");

exports.addressToCoords = async (addressObj) => {
  try {
    const address = [
      addressObj.houseNumber,
      addressObj.locality,
      addressObj.city,
      addressObj.state,
      addressObj.pinCode,
      "India",
    ]
      .filter(Boolean)
      .join(", ");

    const { data } = await axios.get(
      "https://maps.googleapis.com/maps/api/geocode/json",
      {
        params: {
          address,
          key: process.env.GOOGLE_MAPS_KEY,
        },
        timeout: 8000,
      }
    );

    if (!data.results || !data.results.length) return null;

    const loc = data.results[0].geometry.location;
    return [loc.lng, loc.lat];
  } catch (err) {
    console.error("❌ Google Geocoding error:", err.message);
    return null;
  }
};
*/
