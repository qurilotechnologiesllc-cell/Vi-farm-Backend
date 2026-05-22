const SpecialCategory = require("../models/SpecialCategory");
const { cloudinaryDestroy } = require("../services/cloudinaryService");
const User = require("../models/User");
const Product = require("../models/Product");
const VendorAddress = require("../models/VendorAddress");


exports.createSpecialCategory = async (req, res) => {
  try {
    const { name, products } = req.body;

    if (!name || !products || !req.file) {
      return res.status(400).json({
        success: false,
        message: "Name, products and image are required",
      });
    }

    const parsedProducts =
      typeof products === "string" ? JSON.parse(products) : products;

    const category = await SpecialCategory.create({
      name,
      products: parsedProducts,
      image: {
        url: req.file.path,
        publicId: req.file.filename,
      },
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Create Special Category Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create special category",
    });
  }
};


exports.updateSpecialCategory = async (req, res) => {
  const { name, products } = req.body;

  const category = await SpecialCategory.findById(req.params.id);
  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Special category not found",
    });
  }

  if (name) category.name = name;
  if (products) {
    category.products =
      typeof products === "string" ? JSON.parse(products) : products;
  }

  await category.save();

  res.json({
    success: true,
    data: category,
  });
};


exports.deleteSpecialCategory = async (req, res) => {
  const category = await SpecialCategory.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Special category not found",
    });
  }

  // 🔥 delete image from Cloudinary
  if (category.image?.publicId) {
    await cloudinaryDestroy(category.image.publicId);
  }

  await category.deleteOne();

  res.json({
    success: true,
    message: "Special category deleted",
  });
};


exports.getSpecialCategories = async (req, res) => {
  const categories = await SpecialCategory.find({ isActive: true })
    .select("name image")
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: categories,
  });
};
/*
exports.getSpecialCategoryProducts = async (req, res) => {
  const category = await SpecialCategory.findById(req.params.id)
    .populate({
      path: "products",
      select: "name price images unit rating vendor",
      populate: { path: "vendor", select: "name" },
    })
    .lean();

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Special category not found",
    });
  }

  res.json({
    success: true,
    category: {
      id: category._id,
      name: category.name,
      image: category.image.url,
    },
    products: category.products,
  });
};
*/

exports.getSpecialCategoryProducts = async (req, res) => {
  // ---------------- FETCH SPECIAL CATEGORY ----------------
  const specialCategory = await SpecialCategory.findById(req.params.id)
    .select("name image products")
    .lean();

  if (!specialCategory) {
    return res.status(404).json({
      success: false,
      message: "Special category not found",
    });
  }

  if (!specialCategory.products?.length) {
    return res.json({
      success: true,
      category: {
        id: specialCategory._id,
        name: specialCategory.name,
        image: specialCategory.image.url,
      },
      count: 0,
      data: [],
    });
  }

  // ---------------- BUYER LOCATION ----------------
  const buyer = await User.findById(req.user._id).select("location").lean();

  const buyerLocation = buyer?.location?.coordinates;

  // ---------------- DISTANCE HELPER (SAME AS CATEGORY API) ----------------
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ---------------- ACTIVE VENDORS ----------------
  const activeVendorIds = (
    await User.find({ role: "Vendor", status: "Active" }).select("_id").lean()
  ).map((v) => v._id);

  // ---------------- FETCH PRODUCTS (SAME FILTERS) ----------------
  const products = await Product.find({
    _id: { $in: specialCategory.products },
    status: "In Stock",
    vendor: { $in: activeVendorIds },
  })
    .populate("category", "name")
    .populate("vendor", "name location")
    .sort({ rating: -1, createdAt: -1 })
    .lean();

  // ---------------- FETCH VENDOR ADDRESSES (ONLY SOURCE OF TRUTH) ----------------
  const vendorIds = products.map((p) => p.vendor?._id).filter(Boolean);

  const vendorAddresses = await VendorAddress.find({
    vendor: { $in: vendorIds },
  }).lean();

  const vendorAddressMap = {};
  vendorAddresses.forEach((va) => {
    vendorAddressMap[va.vendor.toString()] = va;
  });

  // ---------------- ENRICH WITH DISTANCE ----------------
  const enriched = products.map((p) => {
    let distanceText = "N/A";

    if (
      p.vendor?.location?.coordinates?.length === 2 &&
      buyerLocation?.length === 2 &&
      p.vendor.location.coordinates[0] !== 0
    ) {
      const [vendorLng, vendorLat] = p.vendor.location.coordinates;
      const [buyerLng, buyerLat] = buyerLocation;

      const distance = getDistanceKm(buyerLat, buyerLng, vendorLat, vendorLng);

      if (!isNaN(distance)) {
        distanceText = `${distance.toFixed(2)} km away`;
      }
    }
        // 🚚 DELIVERY / PICKUP — ONLY VendorAddress
    let deliveryAllowed = false;
    let deliveryModes = ["Pickup"];

    const vendorAddr = vendorAddressMap[p.vendor?._id?.toString()];

    if (
      vendorAddr &&
      (vendorAddr.deliveryType === "Delivery" ||
        vendorAddr.deliveryType === "Both")
    ) {
      deliveryAllowed = true;
      deliveryModes = ["Pickup", "Delivery"];
    }

    return {
      ...p,
      category: p.category?.name || null, // ✅ SAME AS CATEGORY API
      distance: distanceText, // ✅ SAME KEY

      // ⭐ ADD-ON ONLY
      deliveryAllowed,
      deliveryModes,
    };
  });

  // ---------------- RESPONSE ----------------
  res.json({
    success: true,
    category: {
      id: specialCategory._id,
      name: specialCategory.name,
      image: specialCategory.image.url,
    },
    count: enriched.length,
    data: enriched, // 🔥 SAME RESPONSE AS getProductsByCategory
  });
};;



exports.getSpecialCategoriesWithProducts = async (req, res) => {
  try {
    const categories = await SpecialCategory.find({
      isActive: true,
      "products.0": { $exists: true }, // ⭐ ONLY non-empty
    })
      .select("name image products")
      .sort({ createdAt: -1 })
      .lean();
      

    res.json({
      success: true,
      count: categories.length,
      data: categories.map((c) => ({
        id: c._id,
        name: c.name,
        image: c.image.url,
        productCount: c.products.length,
      })),
    });
  } catch (error) {
    console.error("Get Special Categories With Products Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch special categories",
    });
  }
};
