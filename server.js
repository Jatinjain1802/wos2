require("dotenv").config();
const express = require("express");
const axios = require("axios");
const mysql = require("mysql2/promise"); // Use the promise-based version
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public")); // Serve the HTML file

// Load credentials from .env
const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

const WHATSAPP_API_URL = `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

// Database connection pool
const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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
    const [result] = await pool.execute(
      "INSERT INTO products (name, price, description, image_url) VALUES (?, ?, ?, ?)",
      [name, parseFloat(price), description, image_url]
    );
    console.log("Product added to database:", result.insertId);
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
app.get("/webhook", (req, res) => {
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
app.post("/webhook", async (req, res) => {
  const changes = req.body.entry?.[0]?.changes?.[0];
  if (changes && changes.value.messages) {
    const message = changes.value.messages[0];
    const from = message.from;
    const type = message.type;
    let responseMessage = null;

    if (type === "text") {
      const receivedText = message.text.body.toLowerCase();
      if (receivedText.includes("hi")) {
        // Send an interactive button to view the catalog
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
        // Fetch products from the database and send a multi-product message
        const [products] = await pool.execute("SELECT * FROM products");
        if (products.length > 0) {
          const productItems = products.map((p) => ({
            product_retailer_id: p.product_id.toString(),
          }));

          responseMessage = {
            type: "interactive",
            interactive: {
              type: "product_list",
              header: { type: "text", text: "Our Delicious Menu" },
              body: { text: "Select your favorite items to add to cart." },
              footer: { text: "We offer Cash on Delivery." },
              action: {
                catalog_id: "YOUR_CATALOG_ID_HERE", // Replace with your actual catalog ID
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
        // Handle checkout and save order
        const [cartItems] = await pool.execute(
          "SELECT p.price, c.quantity FROM carts c JOIN products p ON c.product_id = p.product_id WHERE c.phone_number = ?",
          [from]
        );
        if (cartItems.length > 0) {
          const totalPrice = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );
          await pool.execute(
            "INSERT INTO orders (phone_number, total_price) VALUES (?, ?)",
            [from, totalPrice]
          );
          await pool.execute("DELETE FROM carts WHERE phone_number = ?", [
            from,
          ]);

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
      // Handle "add to cart" action
      const action =
        message.interactive.product_action.section_id === "All Items"
          ? "add"
          : "none"; // Assuming 'add' for simplicity
      const product_id = message.interactive.product_action.product_retailer_id;

      if (action === "add") {
        await pool.execute(
          "INSERT INTO carts (phone_number, product_id, quantity) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
          [from, product_id]
        );
        responseMessage = {
          type: "text",
          text: {
            body: "Item added to your cart. To checkout, type 'checkout' or click the checkout button.",
          },
        };
      }
    }

    // Send the final response message
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
