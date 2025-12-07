# 🛒 Inventory Management System

A modern, full-stack inventory management system with Point of Sale (POS), analytics dashboard, and invoice generation capabilities. Built with Node.js, Express, MongoDB, and vanilla JavaScript.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/mongodb-%3E%3D4.0-green.svg)

## ✨ Features

### 📦 Inventory Management
- **CRUD Operations**: Add, edit, delete, and view products
- **Product Details**: Track SKU, price, quantity, category, and images
- **Real-time Updates**: Instant inventory updates across the system

### 💰 Point of Sale (POS)
- **Product Search**: Quick search functionality
- **Shopping Cart**: Add/remove items with quantity controls
- **Real-time Calculations**: Automatic total calculation
- **Customer Checkout**: Capture customer details and payment method

### 📊 Analytics Dashboard
- **Revenue Tracking**: Total revenue visualization
- **Order Statistics**: Track total orders and products
- **Charts**: Interactive sales and product distribution charts (Chart.js)
- **Real-time Data**: Live analytics updates

### 🧾 Invoice Generation
- **Professional Layout**: Clean, print-ready invoice design
- **Customer Details**: Complete order and customer information
- **Print Support**: Optimized print styles
- **Order History**: Generate invoices for past orders

### 📱 Responsive Design
- **Mobile-First**: Optimized for all screen sizes
- **Hamburger Menu**: Collapsible sidebar for mobile
- **Touch-Friendly**: Large tap targets and smooth interactions
- **Modern UI**: Gradients, shadows, and smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.0 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/inventory-management-system.git
   cd inventory-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/inventory_db
   PORT=3000
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   npm start
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
inventory-management-system/
├── public/                 # Frontend files
│   ├── index.html         # Main HTML file
│   ├── style.css          # Styles and responsive design
│   └── script.js          # Client-side JavaScript
├── server.js              # Express server and API routes
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in repo)
└── README.md             # This file
```

## 🛠️ Tech Stack

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **dotenv**: Environment variable management

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks, pure JS
- **Chart.js**: Data visualization library

## 📡 API Endpoints

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get single order

### Analytics
- `GET /api/analytics` - Get business analytics

## 🎨 Design Features

### Visual Enhancements
- **Gradient Buttons**: Modern gradient backgrounds
- **Smooth Animations**: Fade-in, slide, and hover effects
- **Shadow System**: Layered shadows (sm, md, lg)
- **Typography**: Optimized font weights and spacing

### Mobile Experience
- **Overlay Backdrop**: Dark overlay when sidebar opens
- **Smooth Transitions**: 300ms ease-in-out animations
- **Auto-Close**: Sidebar closes on navigation
- **Touch-Friendly**: Larger buttons and spacing

## 📱 Responsive Breakpoints

- **Desktop**: > 768px (Full sidebar, multi-column layout)
- **Tablet**: ≤ 768px (Hamburger menu, stacked layout)
- **Mobile**: ≤ 480px (2-column grid, compact spacing)

## 🔧 Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/inventory_db  # MongoDB connection string
PORT=3000                                           # Server port
```

### Database Schema

**Product Schema**
```javascript
{
  name: String,
  sku: String,
  price: Number,
  quantity: Number,
  category: String,
  image: String
}
```

**Order Schema**
```javascript
{
  items: [{ product, quantity, price }],
  total: Number,
  customer: String,
  paymentMethod: String,
  date: Date
}
```

## 🧪 Testing

1. **Add Products**: Navigate to Inventory → Add Product
2. **Process Sale**: Go to POS → Add items → Checkout
3. **View Analytics**: Check Analytics tab for charts
4. **Generate Invoice**: Orders → View Invoice

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👤 Author

**Your Name**
- GitHub: [@Jatinjain1802](https://github.com/Jatinjain1802)
- Email: jjain0740@gmail.com

## 🙏 Acknowledgments

- Chart.js for beautiful charts
- MongoDB for flexible database
- Express.js for robust backend
- Inter font family for clean typography

## 📸 Screenshots

### Desktop View
![Desktop Dashboard](screenshots/desktop-dashboard.png)

### Mobile View
![Mobile POS](screenshots/mobile-pos.png)

### Analytics
![Analytics Dashboard](screenshots/analytics.png)

---

⭐ Star this repo if you find it helpful!
