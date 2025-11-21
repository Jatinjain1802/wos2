const API_URL = '/api';

// State
let products = [];
let cart = [];
let orders = [];
let analyticsData = null;
let salesChart = null;
let productsChart = null;

// DOM Elements
const views = {
    inventory: document.getElementById('inventory-view'),
    pos: document.getElementById('pos-view'),
    orders: document.getElementById('orders-view'),
    analytics: document.getElementById('analytics-view')
};
const navLinks = document.querySelectorAll('.nav-links li');
const inventoryTableBody = document.querySelector('#inventory-table tbody');
const posProductsGrid = document.getElementById('pos-products');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const ordersTableBody = document.querySelector('#orders-table tbody');
const productModal = document.getElementById('product-modal');
const productForm = document.getElementById('product-form');
const addProductBtn = document.getElementById('add-product-btn');
const closeModalBtn = document.querySelector('.close-modal');
const checkoutBtn = document.getElementById('checkout-btn');
const posSearchInput = document.getElementById('pos-search');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupEventListeners();
});

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const viewName = link.dataset.view;
            switchView(viewName);
        });
    });

    // Modal
    addProductBtn.addEventListener('click', () => openModal());
    closeModalBtn.addEventListener('click', () => closeModal());
    window.addEventListener('click', (e) => {
        if (e.target === productModal) closeModal();
    });

    // Form Submit
    productForm.addEventListener('submit', handleProductSubmit);

    // POS Search
    posSearchInput.addEventListener('input', (e) => {
        renderPosGrid(e.target.value);
    });

    // Checkout
    checkoutBtn.addEventListener('click', handleCheckout);
}

function switchView(viewName) {
    // Update Nav
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.view === viewName);
    });

    // Update View
    Object.values(views).forEach(view => {
        if (view) {
            view.classList.remove('active');
            view.classList.add('hidden');
        }
    });

    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
        views[viewName].classList.add('active');
    }

    // Refresh Data
    if (viewName === 'inventory') loadProducts();
    if (viewName === 'pos') loadProducts();
    if (viewName === 'orders') loadOrders();
    if (viewName === 'analytics') loadAnalytics();
}

// API Calls
async function loadProducts() {
    try {
        const res = await fetch(`${API_URL}/products`);
        products = await res.json();
        renderInventoryTable();
        renderPosGrid();
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

async function loadOrders() {
    try {
        console.log('Fetching orders...');
        const res = await fetch(`${API_URL}/orders`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        orders = await res.json();
        console.log('Orders loaded:', orders);
        renderOrdersTable();
    } catch (err) {
        console.error('Error loading orders:', err);
        alert('Failed to load orders. Check console for details.');
    }
}

async function loadAnalytics() {
    try {
        const res = await fetch(`${API_URL}/analytics`);
        if (!res.ok) throw new Error('Failed to fetch analytics');
        analyticsData = await res.json();
        renderAnalytics();
    } catch (err) {
        console.error('Error loading analytics:', err);
    }
}

async function createProduct(productData) {
    try {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        if (!res.ok) throw new Error('Failed to create product');
        loadProducts();
        closeModal();
    } catch (err) {
        alert(err.message);
    }
}

async function updateProduct(id, productData) {
    try {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });
        if (!res.ok) throw new Error('Failed to update product');
        loadProducts();
        closeModal();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete product');
        loadProducts();
    } catch (err) {
        alert(err.message);
    }
}

// Old createOrder removed.

// Rendering
function renderInventoryTable() {
    inventoryTableBody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image_url || 'https://via.placeholder.com/40'}" class="product-thumb" alt="${p.name}"></td>
            <td>${p.name}</td>
            <td>${p.sku}</td>
            <td>₹${p.price.toFixed(2)}</td>
            <td>${p.quantity}</td>
            <td>${p.category}</td>
            <td>
                <button class="btn-primary btn-sm" onclick="editProduct('${p._id}')">Edit</button>
                <button class="btn-danger btn-sm" onclick="deleteProduct('${p._id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderPosGrid(searchTerm = '') {
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    posProductsGrid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="addToCart('${p._id}')">
            <img src="${p.image_url || 'https://via.placeholder.com/100'}" alt="${p.name}">
            <h4>${p.name}</h4>
            <div class="price">₹${p.price.toFixed(2)}</div>
            <div class="stock">Stock: ${p.quantity}</div>
        </div>
    `).join('');
}

function renderCart() {
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="price">₹${item.price.toFixed(2)} x ${item.quantity}</div>
            </div>
            <div class="cart-controls">
                <button class="qty-btn" onclick="updateCartQty('${item.product_id}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQty('${item.product_id}', 1)">+</button>
            </div>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotalElement.textContent = `₹${total.toFixed(2)}`;
}

const invoiceModal = document.getElementById('invoice-modal');

// ... (existing code)

function renderOrdersTable() {
    if (!orders || orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No orders found</td></tr>';
        return;
    }
    ordersTableBody.innerHTML = orders.map(o => `
        <tr>
            <td>${o._id.slice(-6).toUpperCase()}</td>
            <td>${new Date(o.created_at).toLocaleDateString()} ${new Date(o.created_at).toLocaleTimeString()}</td>
            <td>${o.customer_name || 'Walk-in'}</td>
            <td>${o.items.map(i => `${i.name} (${i.quantity})`).join(', ')}</td>
            <td>₹${o.total_price.toFixed(2)}</td>
            <td>${o.payment_method}</td>
            <td>
                <button class="btn-primary btn-sm" onclick="showInvoice('${o._id}')">View Invoice</button>
            </td>
        </tr>
    `).join('');
}

// Invoice Logic
async function showInvoice(orderId) {
    try {
        const res = await fetch(`${API_URL}/orders/${orderId}`);
        if (!res.ok) throw new Error('Failed to fetch order details');
        const order = await res.json();

        document.getElementById('inv-date').textContent = new Date(order.created_at).toLocaleDateString();
        document.getElementById('inv-id').textContent = order._id.slice(-6).toUpperCase();
        document.getElementById('inv-customer').textContent = order.customer_name || 'Walk-in Customer';
        document.getElementById('inv-payment').textContent = order.payment_method;
        document.getElementById('inv-total').textContent = `₹${order.total_price.toFixed(2)}`;

        const itemsHtml = order.items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>₹${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');
        document.getElementById('inv-items').innerHTML = itemsHtml;

        invoiceModal.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        alert('Error loading invoice');
    }
}

function closeInvoice() {
    invoiceModal.classList.add('hidden');
}

function printInvoice() {
    window.print();
}

window.showInvoice = showInvoice;
window.closeInvoice = closeInvoice;
window.printInvoice = printInvoice;

// ... (existing code)

async function createOrder(orderData) {
    try {
        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to create order');
        }
        const newOrder = await res.json();

        cart = [];
        renderCart();
        loadProducts(); // Refresh stock

        // Show invoice immediately
        showInvoice(newOrder._id);

    } catch (err) {
        alert(err.message);
    }
}

function renderAnalytics() {
    if (!analyticsData) return;

    document.getElementById('total-revenue').textContent = `₹${analyticsData.revenue.toFixed(2)}`;
    document.getElementById('total-orders').textContent = analyticsData.orders;
    document.getElementById('total-products').textContent = analyticsData.products;

    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    if (salesChart) salesChart.destroy();

    salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: analyticsData.salesTrend.map(d => d._id),
            datasets: [{
                label: 'Daily Revenue (₹)',
                data: analyticsData.salesTrend.map(d => d.dailyRevenue),
                borderColor: '#4f46e5',
                tension: 0.1
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Products Chart
    const productsCtx = document.getElementById('productsChart').getContext('2d');
    if (productsChart) productsChart.destroy();

    productsChart = new Chart(productsCtx, {
        type: 'bar',
        data: {
            labels: analyticsData.topProducts.map(p => p._id),
            datasets: [{
                label: 'Units Sold',
                data: analyticsData.topProducts.map(p => p.totalSold),
                backgroundColor: '#10b981'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Logic
function openModal(product = null) {
    productModal.classList.remove('hidden');
    if (product) {
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-id').value = product._id;
        document.getElementById('p-name').value = product.name;
        document.getElementById('p-sku').value = product.sku;
        document.getElementById('p-price').value = product.price;
        document.getElementById('p-quantity').value = product.quantity;
        document.getElementById('p-category').value = product.category;
        document.getElementById('p-image').value = product.image_url;
    } else {
        document.getElementById('modal-title').textContent = 'Add New Product';
        productForm.reset();
        document.getElementById('product-id').value = '';
    }
}

function closeModal() {
    productModal.classList.add('hidden');
}

function handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const data = {
        name: document.getElementById('p-name').value,
        sku: document.getElementById('p-sku').value,
        price: parseFloat(document.getElementById('p-price').value),
        quantity: parseInt(document.getElementById('p-quantity').value),
        category: document.getElementById('p-category').value,
        image_url: document.getElementById('p-image').value
    };

    if (id) {
        updateProduct(id, data);
    } else {
        createProduct(data);
    }
}

// Global functions for onclick handlers
window.editProduct = (id) => {
    const product = products.find(p => p._id === id);
    if (product) openModal(product);
};

window.deleteProduct = deleteProduct;

window.addToCart = (id) => {
    const product = products.find(p => p._id === id);
    if (!product) return;
    if (product.quantity <= 0) {
        alert('Out of stock!');
        return;
    }

    const existing = cart.find(item => item.product_id === id);
    if (existing) {
        if (existing.quantity < product.quantity) {
            existing.quantity++;
        } else {
            alert('Not enough stock!');
        }
    } else {
        cart.push({
            product_id: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            max_stock: product.quantity
        });
    }
    renderCart();
};

window.updateCartQty = (id, change) => {
    const itemIndex = cart.findIndex(item => item.product_id === id);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    const newQty = item.quantity + change;

    if (newQty <= 0) {
        cart.splice(itemIndex, 1);
    } else if (newQty <= item.max_stock) {
        item.quantity = newQty;
    } else {
        alert('Max stock reached!');
    }
    renderCart();
};

function handleCheckout() {
    if (cart.length === 0) {
        alert('Cart is empty!');
        return;
    }

    const orderData = {
        items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })),
        payment_method: 'Cash' // Default for now
    };

    createOrder(orderData);
}
