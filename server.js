require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Load credentials from .env
const { MONGO_URI } = process.env;

// ----------------------------------------------------
// MongoDB Connection and Schemas
// ----------------------------------------------------

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB!"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  image_url: String,
  sku: { type: String, unique: true, required: true },
  quantity: { type: Number, default: 0 },
  category: { type: String, default: "General" },
  brand: { type: String, default: "Generic" },
  created_at: { type: Date, default: Date.now },
});
const Product = mongoose.model("Product", productSchema);

const orderSchema = new mongoose.Schema({
  customer_name: String,
  items: [
    {
      product_id: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      name: String,
      quantity: Number,
      price: Number,
    },
  ],
  total_price: Number,
  status: { type: String, default: "Completed" },
  payment_method: { type: String, default: "Cash" },
  created_at: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", orderSchema);

// ----------------------------------------------------
// API Endpoints
// ----------------------------------------------------

// Get all products
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error fetching products" });
  }
});

// Get single product
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error fetching product" });
  }
});

// Create product
app.post("/api/products", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ error: "Error creating product", details: error.message });
  }
});

// Update product
app.put("/api/products/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ error: "Error updating product" });
  }
});

// Delete product
app.delete("/api/products/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting product" });
  }
});

// Create Order (POS)
app.post("/api/orders", async (req, res) => {
  const { customer_name, items, payment_method } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items in order" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let total_price = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product_id).session(session);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      product.quantity -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product_id: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
      });
      total_price += product.price * item.quantity;
    }

    const newOrder = new Order({
      customer_name: customer_name || "Walk-in Customer",
      items: orderItems,
      total_price,
      payment_method: payment_method || "Cash",
    });

    await newOrder.save({ session });
    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newOrder);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Order error:", error);
    res.status(400).json({ error: error.message });
  }
});

// Get Orders
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ created_at: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// Get single order
app.get("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Error fetching order" });
  }
});

// Analytics Endpoint
app.get("/api/analytics", async (req, res) => {
  try {
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total_price" } } },
    ]);
    const totalOrders = await Order.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          totalSold: { $sum: "$items.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // Sales last 7 days
    const last7Days = await Order.aggregate([
      {
        $match: {
          created_at: {
            $gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$created_at" } },
          dailyRevenue: { $sum: "$total_price" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      revenue: totalRevenue[0]?.total || 0,
      orders: totalOrders,
      products: totalProducts,
      topProducts,
      salesTrend: last7Days,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Error fetching analytics" });
  }
});

// Serve Frontend
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
