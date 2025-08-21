
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Load credentials from .env
const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  MONGO_URI,
} = process.env;

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// ----------------------------------------------------
// MongoDB Connection and Schemas
// ----------------------------------------------------

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB!"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  image_url: String,
  product_retailer_id: String, // Store the product ID as a string for WhatsApp
});
const Product = mongoose.model("Product", productSchema);

const cartSchema = new mongoose.Schema({
  phone_number: { type: String, unique: true },
  items: [
    {
      product_id: String,
      quantity: { type: Number, default: 1 },
    },
  ],
});
const Cart = mongoose.model("Cart", cartSchema);

const orderSchema = new mongoose.Schema({
  phone_number: String,
  items: Array,
  total_price: Number,
  status: { type: String, default: "Pending" },
  payment_method: { type: String, default: "Cash on Delivery" },
  created_at: { type: Date, default: Date.now },
});
const Order = mongoose.model("Order", orderSchema);

// Helper function to send messages to WhatsApp
const sendMessage = async (to, messagePayload) => {
  try {
    await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: "whatsapp",
        to: to,
        ...messagePayload,
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`Message sent to ${to}`);
  } catch (error) {
    console.error(
      "Failed to send message:",
      error.response ? error.response.data : error.message
    );
  }
};

// ----------------------------------------------------
// Web Form Endpoints (for the admin panel)
// ----------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.post("/add-product", async (req, res) => {
  const { name, price, description, image_url } = req.body;
  try {
    const newProduct = new Product({
      name,
      price,
      description,
      image_url,
      product_retailer_id: new mongoose.Types.ObjectId().toString(),
    });
    await newProduct.save();
    console.log("Product added to database:", newProduct._id);
    res.status(200).send("Product added successfully!");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Error adding product.");
  }
});

// ----------------------------------------------------
// WhatsApp Webhook Endpoints
// ----------------------------------------------------

// Verification endpoint
app.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified!");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Main webhook listener
app.post("/", async (req, res) => {
  const changes = req.body.entry?.[0]?.changes?.[0];
  if (changes && changes.value.messages) {
    const message = changes.value.messages[0];
    const from = message.from;
    const type = message.type;
    let responseMessage = null;

    if (type === "text") {
      const receivedText = message.text.body.toLowerCase();
      if (receivedText.includes("hi")) {
        responseMessage = {
          type: "interactive",
          interactive: {
            type: "button",
            body: { text: "Hello! Welcome to our store. How can I help you?" },
            action: {
              buttons: [
                {
                  type: "reply",
                  reply: { id: "view_catalog", title: "View Catalog" },
                },
              ],
            },
          },
        };
      } else {
        responseMessage = {
          type: "text",
          text: {
            body: "Sorry, I didn't understand that. Please type 'hi' to start.",
          },
        };
      }
    } else if (
      type === "interactive" &&
      message.interactive.type === "button_reply"
    ) {
      const buttonId = message.interactive.button_reply.id;

      if (buttonId === "view_catalog") {
        const products = await Product.find({});
        if (products.length > 0) {
          const productItems = products.map((p) => ({
            product_retailer_id: p.product_retailer_id,
          }));

          responseMessage = {
            type: "interactive",
            interactive: {
              type: "product_list",
              header: { type: "text", text: "Our Delicious Menu" },
              body: { text: "Select your favorite items to add to cart." },
              footer: { text: "We offer Cash on Delivery." },
              action: {
                catalog_id: "YOUR_CATALOG_ID_HERE",
                sections: [{ title: "All Items", product_items: productItems }],
              },
            },
          };
        } else {
          responseMessage = {
            type: "text",
            text: {
              body: "Sorry, our catalog is empty right now. Please check back later.",
            },
          };
        }
      } else if (buttonId === "checkout") {
        const cart = await Cart.findOne({ phone_number: from });
        if (cart && cart.items.length > 0) {
          const productIds = cart.items.map((item) => item.product_id);
          const products = await Product.find({
            product_retailer_id: { $in: productIds },
          });

          let totalPrice = 0;
          const orderItems = cart.items.map((item) => {
            const product = products.find(
              (p) => p.product_retailer_id === item.product_id
            );
            const itemTotal = (product ? product.price : 0) * item.quantity;
            totalPrice += itemTotal;
            return {
              name: product.name,
              quantity: item.quantity,
              price: product.price,
            };
          });

          const newOrder = new Order({
            phone_number: from,
            items: orderItems,
            total_price: totalPrice,
          });
          await newOrder.save();
          await Cart.findOneAndDelete({ phone_number: from });

          responseMessage = {
            type: "text",
            text: {
              body: `Thank you for your order! Your total is ₹${totalPrice.toFixed(
                2
              )}. Your order will be delivered with Cash on Delivery.`,
            },
          };
        } else {
          responseMessage = {
            type: "text",
            text: { body: "Your cart is empty. Please add items to checkout." },
          };
        }
      }
    } else if (
      type === "interactive" &&
      message.interactive.type === "product_action"
    ) {
      const product_id = message.interactive.product_action.product_retailer_id;

      const existingCart = await Cart.findOne({ phone_number: from });
      if (existingCart) {
        const itemIndex = existingCart.items.findIndex(
          (item) => item.product_id === product_id
        );
        if (itemIndex > -1) {
          existingCart.items[itemIndex].quantity += 1;
        } else {
          existingCart.items.push({ product_id: product_id, quantity: 1 });
        }
        await existingCart.save();
      } else {
        const newCart = new Cart({
          phone_number: from,
          items: [{ product_id: product_id, quantity: 1 }],
        });
        await newCart.save();
      }

      responseMessage = {
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: "Item added to your cart. Ready to checkout?" },
          action: {
            buttons: [
              {
                type: "reply",
                reply: { id: "checkout", title: "Proceed to Checkout" },
              },
            ],
          },
          footer: { text: "We offer Cash on Delivery." },
        },
      };
    }

    if (responseMessage) {
      await sendMessage(from, responseMessage);
    }
  }
  res.status(200).send("OK");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser to add products.`);
});
