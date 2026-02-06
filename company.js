// Company Panel JavaScript
const API_BASE = 'database/database.php';
let companyData = {
    companyName: '',
    companyEmail: '',
    totalProducts: 12,
    totalOrders: 45,
    totalRevenue: 5678.90,
    avgRating: 4.5,
    products: [],
    orders: []
};

// Load company data
function loadCompanyData() {
    fetch(`${API_BASE}?action=getCompanyData`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Failed to load company data');
            companyData.totalProducts = data.summary.totalProducts || 0;
            companyData.totalOrders = data.summary.totalOrders || 0;
            companyData.totalRevenue = data.summary.totalRevenue || 0;
            companyData.avgRating = data.summary.avgRating || 0;
            companyData.products = data.products || [];
            companyData.orders = data.orders || [];

            updateDashboard();
            loadRecentOrders();
            loadProducts();
            loadCompanyProfile();
        })
        .catch(() => {
            companyData.totalProducts = 0;
            companyData.totalOrders = 0;
            companyData.totalRevenue = 0;
            companyData.avgRating = 0;
            companyData.products = [];
            companyData.orders = [];
            updateDashboard();
            loadRecentOrders();
            loadProducts();
            loadCompanyProfile();
        });
    
    // Update company info
    const currentUser = JSON.parse(localStorage.getItem('buyPKUser') || '{}');
    if (currentUser) {
        document.getElementById('companyName').textContent = currentUser.name || 'Company Name';
        document.getElementById('companyEmail').textContent = currentUser.email || 'company@example.com';
        document.getElementById('companyAvatar').textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'C';
    }
}

// Update dashboard stats
function updateDashboard() {
    document.getElementById('totalProducts').textContent = companyData.totalProducts;
    document.getElementById('totalOrders').textContent = companyData.totalOrders;
    document.getElementById('totalRevenue').textContent = '$' + companyData.totalRevenue.toFixed(2);
    document.getElementById('avgRating').textContent = companyData.avgRating.toFixed(1);
}

// Load recent orders
function loadRecentOrders() {
    const tableBody = document.getElementById('recentOrdersTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    (companyData.orders || []).slice(0, 6).forEach(order => {
        const orderId = order.id || order.order_id || order.orderId;
        const customer = order.customer || (order.user ? order.user.name : '') || (order.user ? order.user.email : '') || 'Customer';
        const date = order.date || order.ordered_at || '';
        const amount = order.amount || (order.summary ? order.summary.total : 0) || 0;
        const status = order.status || 'processing';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${orderId || ''}</td>
            <td>${customer}</td>
            <td>${date}</td>
            <td>$${Number(amount).toFixed(2)}</td>
            <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>
                <button class="btn-icon view-order" data-id="${orderId}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon update-status" data-id="${orderId}">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Load products
function loadProducts() {
    const grid = document.getElementById('productsGridCompany');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    companyData.products.forEach(product => {
        const category = product.category || 'uncategorized';
        const rating = product.rating || 0;
        const sales = product.sales || 0;
        const productCard = document.createElement('div');
        productCard.className = 'product-card-company';
        productCard.innerHTML = `
            <div class="product-header">
                <h3>${product.name}</h3>
                <span class="status-badge status-${(product.status || 'active')}">${(product.status || 'active').charAt(0).toUpperCase() + (product.status || 'active').slice(1)}</span>
            </div>
            <div class="product-info">
                <p><i class="fas fa-tag"></i> ${category.charAt(0).toUpperCase() + category.slice(1)}</p>
                <p><i class="fas fa-dollar-sign"></i> $${product.price.toFixed(2)}</p>
                <p><i class="fas fa-box"></i> ${product.stock} in stock</p>
                <p><i class="fas fa-star"></i> ${rating}/5 (${sales} sales)</p>
            </div>
            <div class="product-actions">
                <button class="btn btn-primary btn-sm edit-product" data-id="${product.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-outline btn-sm view-analytics" data-id="${product.id}">
                    <i class="fas fa-chart-line"></i> Analytics
                </button>
            </div>
        `;
        grid.appendChild(productCard);
    });
}

// Load company profile
function loadCompanyProfile() {
    const currentUser = JSON.parse(localStorage.getItem('buyPKUser') || '{}');
    document.getElementById('companyNameInput').value = companyData.companyName || currentUser.name || '';
    document.getElementById('companyEmailInput').value = companyData.companyEmail || currentUser.email || '';
    document.getElementById('companyPhoneInput').value = '+92 (300) 123-4567';
    document.getElementById('companyWebsiteInput').value = 'www.example.com';
    document.getElementById('companyDescription').value = 'Leading provider of quality products with excellent customer service.';
    document.getElementById('companyAddress').value = '123 Business Street, Karachi, Pakistan';
}

// Navigation functionality
function setupNavigation() {
    const navItems = document.querySelectorAll('.company-nav-item');
    const sections = document.querySelectorAll('.company-section');
    const sectionTitle = document.getElementById('sectionTitle');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get section to show
            const section = this.getAttribute('data-section');
            
            // Hide all sections
            sections.forEach(sec => {
                sec.style.display = 'none';
            });
            
            // Show selected section
            const targetSection = document.getElementById(section + 'Section');
            if (targetSection) {
                targetSection.style.display = 'block';
            }
            
            // Update section title
            if (sectionTitle) {
                sectionTitle.textContent = this.textContent.trim();
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('buyPKUser');
            window.location.href = 'index.html';
        });
    }
    
    // View all orders button
    const viewAllOrders = document.getElementById('viewAllOrders');
    if (viewAllOrders) {
        viewAllOrders.addEventListener('click', function() {
            // Switch to orders section
            document.querySelector('.company-nav-item[data-section="orders"]').click();
        });
    }
    
    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            openModal('addProductModal');
        });
    }
    
    // Order filter
    const orderFilter = document.getElementById('orderFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', function() {
            alert('Filtering orders by: ' + this.value);
        });
    }
    
    // Time period filter
    const timePeriod = document.getElementById('timePeriod');
    if (timePeriod) {
        timePeriod.addEventListener('change', function() {
            alert('Updating analytics for: ' + this.value);
        });
    }
    
    // Company profile form
    const companyProfileForm = document.getElementById('companyProfileForm');
    if (companyProfileForm) {
        companyProfileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Company profile updated successfully!');
        });
    }

    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) closeModalFunc(modal.id);
        });
    });

    // Add product form handling
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('addProductName').value.trim();
            const category = document.getElementById('addProductCategory').value;
            const price = parseFloat(document.getElementById('addProductPrice').value);
            const stock = parseInt(document.getElementById('addProductStock').value);
            const description = document.getElementById('addProductDescription').value.trim();
            const imagesEl = document.getElementById('addProductImages');

            if (!name || !category || isNaN(price) || isNaN(stock)) {
                alert('Please fill required fields');
                return;
            }

            const newProduct = { name, category, price, stock, rating:0, sales:0, status:'active', description };

            // upload images if any
            if (imagesEl && imagesEl.files && imagesEl.files.length > 0) {
                try {
                    const urls = await uploadImages(imagesEl.files);
                    if (urls.length>0) { newProduct.image = urls[0]; newProduct.images = urls; }
                } catch (err) {
                    console.error(err);
                }
            }

            fetch(`${API_BASE}?action=addProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        alert(data.message || 'Product add failed');
                        return;
                    }
                    loadCompanyData();
                    alert('Product added');
                    closeModalFunc('addProductModal');
                    addProductForm.reset();
                })
                .catch(() => {
                    alert('Product add failed');
                });
        });
    }

    // Edit product form
    const editProductForm = document.getElementById('editProductForm');
    if (editProductForm) {
        editProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = parseInt(document.getElementById('editProductId').value);
            const name = document.getElementById('editProductName').value.trim();
            const category = document.getElementById('editProductCategory').value;
            const price = parseFloat(document.getElementById('editProductPrice').value);
            const stock = parseInt(document.getElementById('editProductStock').value);
            const description = document.getElementById('editProductDescription').value.trim();
            const imagesEl = document.getElementById('editProductImages');

            if (imagesEl && imagesEl.files && imagesEl.files.length>0) {
                try {
                    const urls = await uploadImages(imagesEl.files);
                    if (urls.length>0) { 
                        var image = urls[0]; 
                        var images = urls; 
                    }
                } catch (err) { console.error(err); }
            }

            const updatePayload = { id, name, category, price, stock, description };
            if (typeof image !== 'undefined') updatePayload.image = image;
            if (typeof images !== 'undefined') updatePayload.images = images;

            fetch(`${API_BASE}?action=updateProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        alert(data.message || 'Product update failed');
                        return;
                    }
                    loadCompanyData();
                    alert('Product updated');
                    closeModalFunc('editProductModal');
                    editProductForm.reset();
                })
                .catch(() => {
                    alert('Product update failed');
                });
        });
    }
    
    // Edit product buttons
    document.addEventListener('click', function(e) {
        const editBtn = e.target.closest('.edit-product');
        const analyticsBtn = e.target.closest('.view-analytics');
        const viewOrderBtn = e.target.closest('.view-order');
        const updateStatusBtn = e.target.closest('.update-status');

        if (editBtn) {
            const id = parseInt(editBtn.getAttribute('data-id'));
            openEditProductModal(id);
            return;
        }

        if (analyticsBtn) {
            const id = parseInt(analyticsBtn.getAttribute('data-id'));
            alert('Viewing analytics for product ID: ' + id);
            return;
        }

        if (viewOrderBtn) {
            const orderId = viewOrderBtn.getAttribute('data-id');
            alert('Viewing order ID: ' + orderId);
            return;
        }

        if (updateStatusBtn) {
            const orderId = updateStatusBtn.getAttribute('data-id');
            alert('Updating status for order ID: ' + orderId);
            return;
        }
    });
}

// Initialize company panel
function initCompanyPanel() {
    console.log('Company Panel Initializing...');
    
    // Check if user is company
    const currentUser = JSON.parse(localStorage.getItem('buyPKUser') || '{}');
    if (currentUser.role !== 'company') {
        alert('Access denied! Company privileges required.');
        window.location.href = 'index.html';
        return;
    }
    
    loadCompanyData();
    setupNavigation();
    setupEventListeners();
    
    console.log('Company panel initialized successfully!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompanyPanel);
} else {
    initCompanyPanel();
}

// Open edit modal
function openEditProductModal(productId) {
    const product = companyData.products.find(p=>p.id===productId);
    if (!product) return;
    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductDescription').value = product.description || '';
    openModal('editProductModal');
}

// Open view modal
function openViewProductModal(productId) {
    const product = companyData.products.find(p=>p.id===productId);
    if (!product) return;
    const container = document.getElementById('viewProductContent');
    container.innerHTML = `
        <h3>${product.name}</h3>
        <p><strong>Category:</strong> ${product.category}</p>
        <p><strong>Price:</strong> $${product.price.toFixed(2)}</p>
        <p><strong>Stock:</strong> ${product.stock}</p>
        <p>${product.description || ''}</p>
    `;
    if (product.image) {
        const img = document.createElement('img');
        img.src = product.image;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '8px';
        img.style.marginTop = '12px';
        container.appendChild(img);
    }
    openModal('viewProductModal');
}

// Delete product
function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return;
    fetch(`${API_BASE}?action=deleteProduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                alert(data.message || 'Delete failed');
                return;
            }
            loadCompanyData();
        })
        .catch(() => {
            alert('Delete failed');
        });
}

// Upload images helper (reused logic)
async function uploadImages(fileList) {
    const urls = [];
    for (let i=0;i<fileList.length;i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('action','uploadImage');
        formData.append('image', file);
        const res = await fetch(API_BASE, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        if (data.success && data.url) urls.push(data.url);
    }
    return urls;
}
