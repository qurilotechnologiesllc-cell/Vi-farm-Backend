const Product = require("../models/Product");
const Category = require("../models/Category");

exports.getVendorCategoriesForUser = async (req, res) => {
  try {
    const { vendorId } = req.params;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: "Vendor ID is required",
      });
    }

    // 1️⃣ Get distinct category IDs from vendor's products
    const categoryIds = await Product.distinct("category", {
      vendor: vendorId,
    });

    // 2️⃣ Fetch categories
    const categories = await Category.find({
      _id: { $in: categoryIds },
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch vendor categories",
    });
  }
};



const getCategories = async (req, res) => {
  try {
    // 1️⃣ Get category IDs that have at least one product
    const usedCategoryIds = await Product.distinct("category", {
      status: "In Stock", // optional but recommended
    });

    if (!usedCategoryIds.length) {
      return res.json({
        success: true,
        categories: [],
      });
    }

    // 2️⃣ Fetch only those categories
    const categories = await Category.find(
      { _id: { $in: usedCategoryIds } },
      { name: 1, image: 1 },
    ).sort({ name: 1 });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("❌ getCategories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};
exports.getCategories = getCategories;