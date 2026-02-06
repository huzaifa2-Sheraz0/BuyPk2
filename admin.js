// Admin Panel JavaScript
const API_BASE = 'database/database.php';
let adminData = {
    totalOrders: 125,
    totalProducts: 48,
    totalUsers: 89,
    totalRevenue: 12540.75,
    recentOrders: [],
    orders: [],
    products: [],
    users: [],
    categories: []
};

// Load admin data
function loadAdminData() {
    fetch(`${API_BASE}?action=getAdminData`)
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Failed to load admin data');
            adminData.totalOrders = data.summary.totalOrders || 0;
            adminData.totalProducts = data.summary.totalProducts || 0;
            adminData.totalUsers = data.summary.totalUsers || 0;
            adminData.totalRevenue = data.summary.totalRevenue || 0;
            adminData.orders = data.orders || [];
            adminData.products = data.products || [];
            adminData.users = data.users || [];
            adminData.recentOrders = [];
            adminData.categories = [];

            updateDashboard();
            loadRecentOrders();
            loadProducts();
            loadUsers();
            loadCategories();
        })
        .catch((error) => {
            console.error('Error loading admin data:', error);
            adminData.totalOrders = 0;
            adminData.totalProducts = 0;
            adminData.totalUsers = 0;
            adminData.totalRevenue = 0;
            adminData.orders = [];
            adminData.products = [];
            adminData.users = [];
            adminData.recentOrders = [];
            adminData.categories = [];
            updateDashboard();
            loadRecentOrders();
            loadProducts();
            loadUsers();
            loadCategories();
        });
    
    // Update admin info
    const currentUser = JSON.parse(localStorage.getItem('buyPKUser') || '{}');
    if (currentUser) {
        document.getElementById('adminName').textContent = currentUser.name || 'Admin User';
        document.getElementById('adminEmail').textContent = currentUser.email || 'admin@buypk.com';
        document.getElementById('adminAvatar').textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A';
    }
}

// Update dashboard stats
function updateDashboard() {
    document.getElementById('totalOrders').textContent = adminData.totalOrders;
    document.getElementById('totalProducts').textContent = adminData.totalProducts;
    document.getElementById('totalUsers').textContent = adminData.totalUsers;
    document.getElementById('totalRevenue').textContent = '$' + adminData.totalRevenue.toFixed(2);
}

// Load recent orders
function loadRecentOrders() {
    const tableBody = document.getElementById('recentOrdersTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';

    const sourceOrders = adminData.recentOrders.length ? adminData.recentOrders : (adminData.orders || []);
    sourceOrders.slice(0, 6).forEach(order => {
        const orderId = order.id || order.order_id || order.orderId;
        const customer = order.customer || (order.user ? order.user.name : '') || (order.user ? order.user.email : '') || 'Customer';
        const date = order.date || order.ordered_at || '';
        const amount = order.amount || (order.summary ? order.summary.total : 0) || 0;
        const status = order.status || 'processing';
        const items = order.items ? (Array.isArray(order.items) ? order.items.length : order.items) : 0;
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
                <button class="btn-icon edit-order" data-id="${orderId}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Load products
function loadProducts() {
    const tableBody = document.getElementById('productsTable');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    adminData.products.forEach(product => {
        const category = product.category || 'uncategorized';
        const status = product.status || 'active';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${category.charAt(0).toUpperCase() + category.slice(1)}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.stock}</td>
            <td><span class="status-badge status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
            <td>
                <button class="btn-icon edit-product" data-id="${product.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-product" data-id="${product.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Open edit product modal
function openEditProductModal(productId) {
    const product = adminData.products.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('editProductId').value = product.id;
    document.getElementById('editProductName').value = product.name;
    document.getElementById('editProductCategory').value = product.category;
    document.getElementById('editProductPrice').value = product.price;
    document.getElementById('editProductStock').value = product.stock;
    document.getElementById('editProductDescription').value = product.description || '';

    openModal('editProductModal');
}

// Delete product function
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    fetch(`${API_BASE}?action=deleteProduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: productId })
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showToast(data.message || 'Delete failed', 'error');
                return;
            }
            showToast('Product deleted', 'success');
            loadAdminData();
        })
        .catch(() => {
            showToast('Delete failed', 'error');
        });
}

// Delete user function - UPDATED
function deleteUser(userId) {
    console.log('deleteUser called with ID:', userId, typeof userId);
    
    if (!userId || userId === 'undefined' || userId === 'null') {
        console.error('Invalid user ID:', userId);
        showToast('Invalid user ID', 'error');
        return;
    }
    
    // Ensure userId is a number
    userId = parseInt(userId);
    if (isNaN(userId)) {
        console.error('User ID is not a number:', userId);
        showToast('Invalid user ID format', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        console.log('User cancelled deletion');
        return;
    }
    
    console.log('Sending delete request for user ID:', userId);
    
    fetch(`${API_BASE}?action=deleteUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
    })
    .then(res => {
        console.log('Delete response status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('Delete response data:', data);
        if (!data.success) {
            showToast(data.message || 'Failed to delete user', 'error');
            return;
        }
        showToast('User deleted successfully', 'success');
        // Reload the data
        loadAdminData();
    })
    .catch((error) => {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user. Please try again.', 'error');
    });
}

// Open edit user modal - UPDATED
function openEditUserModal(userId) {
    console.log('openEditUserModal called with ID:', userId, typeof userId);
    
    // Ensure userId is a number
    userId = parseInt(userId);
    if (isNaN(userId)) {
        console.error('Invalid user ID in openEditUserModal:', userId);
        showToast('Invalid user ID', 'error');
        return;
    }
    
    const user = adminData.users.find(u => u.id === userId);
    if (!user) {
        console.error('User not found with ID:', userId);
        showToast('User not found', 'error');
        return;
    }
    
    console.log('Found user:', user);
    
    // Fill in the edit user form fields
    const userIdInput = document.getElementById('editUserId');
    const userNameInput = document.getElementById('editUserName');
    const userEmailInput = document.getElementById('editUserEmail');
    const userRoleInput = document.getElementById('editUserRole');
    const userStatusInput = document.getElementById('editUserStatus');
    
    if (userIdInput) userIdInput.value = user.id;
    if (userNameInput) userNameInput.value = user.name || '';
    if (userEmailInput) userEmailInput.value = user.email || '';
    if (userRoleInput) userRoleInput.value = user.role || 'customer';
    if (userStatusInput) userStatusInput.value = user.status || 'active';
    
    openModal('editUserModal');
}

// Load users - SIMPLIFIED VERSION
function loadUsers() {
    console.log('=== loadUsers() called ===');
    const tableBody = document.getElementById('usersTable');
    if (!tableBody) {
        console.error('Users table body not found!');
        return;
    }
    
    tableBody.innerHTML = '';
    
    console.log('Number of users to display:', adminData.users.length);
    console.log('Users data:', adminData.users);
    
    if (adminData.users.length === 0) {
        console.log('No users to display');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" style="text-align: center; padding: 20px;">
                No users found
            </td>
        `;
        tableBody.appendChild(row);
        return;
    }
    
    adminData.users.forEach(user => {
        const status = user.status || 'active';
        const joined = user.joined || user.joined_date || '';
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name || 'Unknown'}</td>
            <td>${user.email || 'No email'}</td>
            <td>${user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Customer'}</td>
            <td>${joined}</td>
            <td>
                <span class="status-badge status-${status}">
                    ${status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </td>
            <td>
                <button class="btn-icon btn-edit-user" data-id="${user.id}" title="Edit User">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete-user" data-id="${user.id}" title="Delete User" style="color: #ef4444;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners after a short delay to ensure DOM is ready
    setTimeout(() => {
        setupUserTableListeners();
    }, 100);
}

// SIMPLE event listener setup for user table
function setupUserTableListeners() {
    console.log('=== setupUserTableListeners() called ===');
    
    const tableBody = document.getElementById('usersTable');
    if (!tableBody) {
        console.error('Table body not found for setting up listeners');
        return;
    }
    
    // Check if buttons exist
    const editButtons = tableBody.querySelectorAll('.btn-edit-user');
    const deleteButtons = tableBody.querySelectorAll('.btn-delete-user');
    
    console.log(`Found ${editButtons.length} edit buttons and ${deleteButtons.length} delete buttons`);
    
    // Remove old event listeners first
    editButtons.forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    deleteButtons.forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // Get fresh references after cloning
    const freshEditButtons = tableBody.querySelectorAll('.btn-edit-user');
    const freshDeleteButtons = tableBody.querySelectorAll('.btn-delete-user');
    
    // Add event listeners to edit buttons
    freshEditButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Edit button clicked!');
            const userId = this.getAttribute('data-id');
            console.log('User ID from edit button:', userId, typeof userId);
            openEditUserModal(userId);
        });
    });
    
    // Add event listeners to delete buttons
    freshDeleteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Delete button clicked!');
            const userId = this.getAttribute('data-id');
            console.log('User ID from delete button:', userId, typeof userId);
            deleteUser(userId);
        });
    });
    
    console.log('Event listeners attached successfully');
}

// Load categories
function loadCategories() {
    const grid = document.getElementById('categoriesGridAdmin');
    if (!grid) return;
    
    grid.innerHTML = '';

    let categories = adminData.categories;
    if (!categories || categories.length === 0) {
        const map = {};
        (adminData.products || []).forEach(product => {
            const key = product.category || 'uncategorized';
            if (!map[key]) {
                map[key] = { id: key, name: key.charAt(0).toUpperCase() + key.slice(1), products: 0, status: 'active' };
            }
            map[key].products += 1;
        });
        categories = Object.values(map);
    }

    categories.forEach(category => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card';
        categoryCard.innerHTML = `
            <div class="category-header">
                <h3>${category.name}</h3>
                <span class="status-badge status-${category.status}">${category.status.charAt(0).toUpperCase() + category.status.slice(1)}</span>
            </div>
            <div class="category-info">
                <p><i class="fas fa-box"></i> ${category.products} Products</p>
            </div>
            <div class="category-actions">
                <button class="btn-icon edit-category" data-id="${category.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete-category" data-id="${category.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        grid.appendChild(categoryCard);
    });
}

// Navigation functionality - UPDATED to re-attach listeners when section is shown
function setupNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    const sections = document.querySelectorAll('.admin-section');
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
                
                // If showing users section, ensure event listeners are attached
                if (section === 'users') {
                    console.log('Users section shown, setting up listeners...');
                    setTimeout(() => {
                        setupUserTableListeners();
                    }, 50);
                }
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
    console.log('Setting up event listeners...');
    
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
            document.querySelector('.admin-nav-item[data-section="orders"]').click();
        });
    }
    
    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', function() {
            openModal('addProductModal');
        });
    }
    
    // Add user button
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function() {
            openModal('addUserModal');
        });
    }
    
    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function() {
            alert('Add category functionality would go here');
        });
    }
    
    // Generate report button
    const generateReport = document.getElementById('generateReport');
    if (generateReport) {
        generateReport.addEventListener('click', function() {
            alert('Report generation would go here');
        });
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        });
    });

    // Product table delegation
    const productsTable = document.getElementById('productsTable');
    if (productsTable) {
        productsTable.addEventListener('click', function(e) {
            const editBtn = e.target.closest('.edit-product');
            const deleteBtn = e.target.closest('.delete-product');
            
            if (editBtn) {
                const id = parseInt(editBtn.getAttribute('data-id'));
                openEditProductModal(id);
                return;
            }
            
            if (deleteBtn) {
                const id = parseInt(deleteBtn.getAttribute('data-id'));
                deleteProduct(id);
                return;
            }
        });
    }
    
    // Form submissions
    const addProductForm = document.getElementById('addProductForm');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const nameEl = document.getElementById('addProductName');
            const categoryEl = document.getElementById('addProductCategory');
            const priceEl = document.getElementById('addProductPrice');
            const stockEl = document.getElementById('addProductStock');
            const descEl = document.getElementById('addProductDescription');
            const imagesEl = document.getElementById('addProductImages');

            const name = nameEl ? nameEl.value.trim() : '';
            const category = categoryEl ? categoryEl.value : '';
            const price = priceEl ? parseFloat(priceEl.value) : 0;
            const stock = stockEl ? parseInt(stockEl.value) : 0;
            const description = descEl ? descEl.value.trim() : '';

            if (!name || !category || isNaN(price) || isNaN(stock)) {
                showToast('Please fill in all required product fields', 'error');
                return;
            }

            const newProduct = {
                name: name,
                category: category,
                price: price,
                stock: stock,
                status: 'active',
                description: description,
                image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
            };

            // If images provided, upload them to server and use first returned URL
            let uploadedUrls = [];
            if (imagesEl && imagesEl.files && imagesEl.files.length > 0) {
                try {
                    uploadedUrls = await uploadImages(imagesEl.files);
                } catch (err) {
                    console.error('Image upload failed', err);
                    showToast('Image upload failed; product added with placeholder image', 'error');
                }
            }

            if (uploadedUrls.length > 0) {
                newProduct.image = uploadedUrls[0];
                newProduct.images = uploadedUrls;
            }

            fetch(`${API_BASE}?action=addProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProduct)
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        showToast(data.message || 'Product add failed', 'error');
                        return;
                    }
                    showToast('Product added successfully!', 'success');
                    closeModalFunc('addProductModal');
                    addProductForm.reset();
                    loadAdminData();
                })
                .catch(() => {
                    showToast('Product add failed', 'error');
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

            if (!name || !category || isNaN(price) || isNaN(stock)) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            // Upload new images if provided
            let uploaded = [];
            if (imagesEl && imagesEl.files && imagesEl.files.length > 0) {
                try {
                    uploaded = await uploadImages(imagesEl.files);
                } catch (err) {
                    console.error('Image upload failed', err);
                    showToast('Image upload failed; product updated without new images', 'error');
                }
            }

            const updatePayload = {
                id,
                name,
                category,
                price,
                stock,
                description
            };
            if (uploaded.length > 0) {
                updatePayload.image = uploaded[0];
                updatePayload.images = uploaded;
            }

            fetch(`${API_BASE}?action=updateProduct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        showToast(data.message || 'Product update failed', 'error');
                        return;
                    }
                    showToast('Product updated successfully', 'success');
                    closeModalFunc('editProductModal');
                    editProductForm.reset();
                    loadAdminData();
                })
                .catch(() => {
                    showToast('Product update failed', 'error');
                });
        });
    }
    
    // Add user form
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('addUserName').value.trim();
            const email = document.getElementById('addUserEmail').value.trim();
            const password = document.getElementById('addUserPassword').value;
            const role = document.getElementById('addUserRole').value;
            
            if (!name || !email || !password) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const newUser = {
                name: name,
                email: email,
                password: password,
                role: role,
                status: 'active'
            };
            
            fetch(`${API_BASE}?action=addUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    showToast(data.message || 'Failed to add user', 'error');
                    return;
                }
                showToast('User added successfully', 'success');
                closeModalFunc('addUserModal');
                addUserForm.reset();
                loadAdminData();
            })
            .catch((error) => {
                console.error('Error adding user:', error);
                showToast('Failed to add user', 'error');
            });
        });
    }
    
    // Edit user form
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const id = parseInt(document.getElementById('editUserId').value);
            const name = document.getElementById('editUserName').value.trim();
            const email = document.getElementById('editUserEmail').value.trim();
            const role = document.getElementById('editUserRole').value;
            const status = document.getElementById('editUserStatus').value;
            
            if (!name || !email) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            const updatePayload = {
                id: id,
                name: name,
                email: email,
                role: role,
                status: status
            };
            
            // Only include password if provided
            const password = document.getElementById('editUserPassword').value;
            if (password) {
                updatePayload.password = password;
            }
            
            fetch(`${API_BASE}?action=updateUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    showToast(data.message || 'Failed to update user', 'error');
                    return;
                }
                showToast('User updated successfully', 'success');
                closeModalFunc('editUserModal');
                editUserForm.reset();
                loadAdminData();
            })
            .catch((error) => {
                console.error('Error updating user:', error);
                showToast('Failed to update user', 'error');
            });
        });
    }
    
    // Order filter
    const orderFilter = document.getElementById('orderFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', function() {
            alert('Filtering orders by: ' + this.value);
        });
    }
}

// Modal helper functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModalFunc(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// Simple toast helper for admin (small non-blocking message)
function showToast(message, type = 'info', timeout = 2200) {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.position = 'fixed';
        toast.style.right = '20px';
        toast.style.bottom = '20px';
        toast.style.padding = '12px 18px';
        toast.style.borderRadius = '8px';
        toast.style.color = 'white';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        toast.style.zIndex = '9999';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    if (type === 'success') {
        toast.style.background = 'linear-gradient(90deg,#13c39a,#0ea5e9)';
    } else if (type === 'error') {
        toast.style.background = 'linear-gradient(90deg,#ef4444,#f97316)';
    } else {
        toast.style.background = 'rgba(0,0,0,0.8)';
    }

    toast.style.opacity = '0';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.transition = 'opacity 220ms'; toast.style.opacity = '1'; }, 10);

    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 240);
    }, timeout);
}

// Initialize admin panel
function initAdminPanel() {
    console.log('Admin Panel Initializing...');
    
    // Check if user is admin
    const currentUser = JSON.parse(localStorage.getItem('buyPKUser') || '{}');
    if (currentUser.role !== 'admin') {
        alert('Access denied! Admin privileges required.');
        window.location.href = 'index.html';
        return;
    }
    
    loadAdminData();
    setupNavigation();
    setupEventListeners();
    
    console.log('Admin panel initialized successfully!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminPanel);
} else {
    initAdminPanel();
}

// Upload images to server via database.php?action=uploadImage
async function uploadImages(fileList) {
    const urls = [];
    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const formData = new FormData();
        formData.append('action', 'uploadImage');
        formData.append('image', file);

        const res = await fetch(API_BASE, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed with status ' + res.status);
        const data = await res.json();
        if (data.success && data.url) {
            urls.push(data.url);
        } else {
            throw new Error(data.message || 'Upload error');
        }
    }
    return urls;
}