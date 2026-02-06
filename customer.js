// Enhanced Shopping Cart with Modern Features
let cart = [];
let wishlist = [];
let currentUser = null;
let currentSlide = 0;
let slideInterval;
const API_BASE = 'database/database.php';

// Order Tracking Data
let orderHistory = [];

// Categories Data - REMOVED COUNTS
const categories = [
    { id: 1, name: "Electronics", icon: "fas fa-laptop", color: "#4a6cf7" },
    { id: 2, name: "Fashion", icon: "fas fa-tshirt", color: "#ff6b8b" },
    { id: 3, name: "Home & Kitchen", icon: "fas fa-home", color: "#13c39a" },
    { id: 4, name: "Beauty & Health", icon: "fas fa-spa", color: "#9d4edd" },
    { id: 5, name: "Sports & Fitness", icon: "fas fa-dumbbell", color: "#f59e0b" },
    { id: 6, name: "Books & Stationery", icon: "fas fa-book", color: "#0ea5e9" }
];

// Global products array
window.allProducts = [];

// Initialize the application
function initApp() {
    console.log('BuyPK Customer Initializing...');
    
    // Load user data
    loadUserData();
    
    // Load cart and wishlist from localStorage
    loadCartFromStorage();
    loadWishlistFromStorage();
    loadOrderHistoryFromStorage();
    
    // Initialize slider
    initSlider();
    
    // Load products
    loadProducts();
    
    // Render categories
    renderCategories();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup order tracking
    setupOrderTracking();
    
    // Update UI
    updateCartDisplay();
    updateWishlistDisplay();
    
    // Initialize animations
    initAnimations();
    
    // Update flash sale timer
    updateFlashSaleTimer();
    
    console.log('Customer application initialized successfully!');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Initialize hero slider
function initSlider() {
    const slides = document.querySelectorAll('.slide');
    const sliderDots = document.querySelectorAll('.slider-dot');
    const heroSlider = document.querySelector('.hero-slider');
    
    if (!slides || slides.length === 0) return;
    
    // Show first slide
    slides[0].classList.add('active');
    sliderDots[0].classList.add('active');
    
    // Auto slide every 6 seconds
    slideInterval = setInterval(nextSlide, 6000);
    
    // Pause on hover
    if (heroSlider) {
        heroSlider.addEventListener('mouseenter', () => clearInterval(slideInterval));
        heroSlider.addEventListener('mouseleave', () => slideInterval = setInterval(nextSlide, 6000));
    }
}

function nextSlide() {
    const slides = document.querySelectorAll('.slide');
    const sliderDots = document.querySelectorAll('.slider-dot');
    
    if (!slides || slides.length === 0) return;
    
    slides[currentSlide].classList.remove('active');
    sliderDots[currentSlide].classList.remove('active');
    
    currentSlide = (currentSlide + 1) % slides.length;
    
    slides[currentSlide].classList.add('active');
    sliderDots[currentSlide].classList.add('active');
}

// Load products from PHP or use local data
function loadProducts() {
    console.log('Loading products...');
    
    showLoading(true);
    
    // Try to fetch from database first
    fetch(`${API_BASE}?action=getProducts`)
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            if (data.success && data.products) {
                console.log('Loaded ' + data.products.length + ' products from API');
                window.allProducts = data.products;
                const sortedByNew = [...data.products].sort((a, b) => {
                    const aDate = new Date(a.created_at || 0).getTime();
                    const bDate = new Date(b.created_at || 0).getTime();
                    return bDate - aDate;
                });
                let trending = data.products.filter(p => {
                    const badge = (p.badge || '').toLowerCase();
                    return badge === 'trending' || badge === 'hot';
                });
                if (trending.length === 0) {
                    trending = [...data.products].sort((a, b) => {
                        const aScore = (a.reviews || 0) + (a.rating || 0) * 100;
                        const bScore = (b.reviews || 0) + (b.rating || 0) * 100;
                        return bScore - aScore;
                    });
                }

                renderFeaturedProducts(data.products.slice(0, 8));
                renderNewArrivals(sortedByNew.slice(0, 6));
                renderTrendingProducts(trending.slice(0, 6));
                renderCategoryProducts('all', data.products);
                
                showToast('Products loaded successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to load products');
            }
        })
        .catch(error => {
            console.log('Error loading products from API:', error);
            showToast('Unable to load products. Please try again later.', 'error');
        })
        .finally(() => {
            showLoading(false);
        });
}

// Render categories - UPDATED WITHOUT COUNTS
function renderCategories() {
    const categoriesGrid = document.getElementById('categoriesGrid');
    if (!categoriesGrid) return;
    
    categoriesGrid.innerHTML = '';
    
    categories.forEach((category, index) => {
        const categoryCard = document.createElement('div');
        categoryCard.className = 'category-card floating';
        categoryCard.style.animationDelay = (index * 0.1) + 's';
        const categorySlug = category.name.toLowerCase().replace(/[^a-z]+/g, '-');
        categoryCard.setAttribute('data-category', categorySlug);
        
        categoryCard.innerHTML = `
            <div class="category-icon" style="color: ${category.color}">
                <i class="${category.icon}"></i>
            </div>
            <h3>${category.name}</h3>
            <p>Premium Products</p>
            <div class="category-arrow">
                <i class="fas fa-arrow-right"></i>
            </div>
        `;
        
        categoryCard.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            filterProductsByCategory(category);
            
            // Smooth scroll to products
            const element = document.querySelector('#category-search');
            if (element) {
                const offset = 100;
                const elementPosition = element.offsetTop - offset;
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });
            }
        });
        
        categoriesGrid.appendChild(categoryCard);
    });
}

// Create product card element
function createProductCard(product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card floating';
    productCard.setAttribute('data-category', product.category);
    productCard.setAttribute('data-id', product.id);
    
    const stars = generateStars(product.rating);
    const isInWishlist = wishlist.some(item => item.id === product.id);
    const wishlistIconClass = isInWishlist ? 'fas fa-heart' : 'far fa-heart';
    
    productCard.innerHTML = `
        <div class="product-badge badge-${product.badge || 'new'}">${(product.badge || 'new').toUpperCase()}</div>
        <div class="product-img">
            <img src="${product.image}" alt="${product.name}" loading="lazy" 
                 onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
        </div>
        <div class="product-actions">
            <button class="action-btn view-product" data-id="${product.id}" title="View Product">
                <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn add-to-wishlist" data-id="${product.id}" title="${isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}">
                <i class="${wishlistIconClass}"></i>
            </button>
        </div>
        <div class="product-info">
            <span class="product-category">${product.category.toUpperCase()}</span>
            <h3 class="product-title"><a href="#" class="product-link" data-id="${product.id}">${product.name}</a></h3>
            <div class="product-rating">
                <div class="stars">${stars}</div>
                <div class="rating-count">(${product.reviews.toLocaleString()})</div>
            </div>
            <div class="product-price">
                <div>
                    <span class="price">$${product.price.toFixed(2)}</span>
                    ${product.old_price ? `<span class="old-price">$${product.old_price.toFixed(2)}</span>` : ''}
                </div>
                <button class="add-to-cart" data-id="${product.id}" title="Add to Cart">
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners to buttons
    const addToCartBtn = productCard.querySelector('.add-to-cart');
    const addToWishlistBtn = productCard.querySelector('.add-to-wishlist');
    const viewProductBtn = productCard.querySelector('.view-product');
    const productLink = productCard.querySelector('.product-link');
    
    addToCartBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = parseInt(addToCartBtn.getAttribute('data-id'));
        addToCartWithAnimation(productId, addToCartBtn);
    });
    
    addToWishlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = parseInt(addToWishlistBtn.getAttribute('data-id'));
        toggleWishlistWithAnimation(productId, addToWishlistBtn);
    });
    
    viewProductBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const productId = parseInt(viewProductBtn.getAttribute('data-id'));
        openProductView(productId);
    });
    
    productLink.addEventListener('click', (e) => {
        e.preventDefault();
        const productId = parseInt(productLink.getAttribute('data-id'));
        openProductView(productId);
    });
    
    return productCard;
}

// Setup all event listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Login modal
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('loginRoleModal');
        });
    }
    
    // Register modal
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('registerModal');
        });
    }
    
    // Cart modal
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('cartModal');
            renderCartItems();
        });
    }
    
    // Wishlist modal
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('wishlistModal');
            renderWishlistItems();
        });
    }
    
    // Close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.closest('.modal').id;
            closeModalFunc(modalId);
        });
    });
    
    // Switch between login and register
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            closeModalFunc('loginModal');
            setTimeout(() => openModal('registerModal'), 300);
        });
    }
    
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModalFunc('registerModal');
            setTimeout(() => openModal('loginModal'), 300);
        });
    }

    // Role selection buttons (Login As Customer/Admin/Company)
    const roleBtns = document.querySelectorAll('.role-btn');
    if (roleBtns && roleBtns.length > 0) {
        roleBtns.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const role = this.getAttribute('data-role') || 'customer';

                // Close role modal and open login modal with role set
                closeModalFunc('loginRoleModal');
                const loginRoleInput = document.getElementById('loginRole');
                if (loginRoleInput) loginRoleInput.value = role;

                const loginHeader = document.getElementById('loginModalHeader');
                if (loginHeader) loginHeader.textContent = 'Login as ' + (role.charAt(0).toUpperCase() + role.slice(1));

                setTimeout(() => openModal('loginModal'), 250);
            });
        });
    }
    
    // Search functionality
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    // Support button smooth scroll
    document.querySelectorAll('a[href="#contact"]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            smoothScrollTo('#contact');
        });
    });
    
    // Category search buttons
    const searchOptionBtns = document.querySelectorAll('.search-option-btn');
    if (searchOptionBtns) {
        searchOptionBtns.forEach(button => {
            button.addEventListener('click', function() {
                searchOptionBtns.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                const category = this.getAttribute('data-category');
                if (window.allProducts) {
                    renderCategoryProducts(category, window.allProducts);
                }
            });
        });
    }
    
    // Category dropdown links
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href') || '';
            const category = this.getAttribute('data-category');
            const isAnchorLink = href === '' || href === '#' || href.startsWith('#');

            if (category && isAnchorLink) {
                e.preventDefault();
                filterProductsByCategory(category);
                smoothScrollTo('#category-search');
            }
        });
    });

    
    // Checkout and continue shopping
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function() {
            if (cart.length === 0) {
                showToast('Your cart is empty!', 'error');
                return;
            }
            
            // Calculate totals for preview
            updateShipmentPreview();
            
            // Close cart modal and open shipment modal
            closeModalFunc('cartModal');
            setTimeout(() => {
                openModal('shipmentModal');
            }, 300);
        });
    }
    
    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function() {
            closeModalFunc('cartModal');
            smoothScrollTo('#category-search');
        });
    }
    
    // Shipment form
    const shipmentForm = document.getElementById('shipmentForm');
    if (shipmentForm) {
        shipmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('shipName').value.trim();
            const email = document.getElementById('shipEmail').value.trim();
            const phone = document.getElementById('shipPhone').value.trim();
            const city = document.getElementById('shipCity').value;
            const address = document.getElementById('shipAddress').value.trim();
            const postal = document.getElementById('shipPostal').value.trim();
            const area = document.getElementById('shipArea') ? document.getElementById('shipArea').value.trim() : '';
            const notes = document.getElementById('shipNotes') ? document.getElementById('shipNotes').value.trim() : '';
            const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
            
            // Validation
            if (!name || !email || !phone || !city || !address) {
                showToast('Please fill in all required fields marked with *', 'error');
                return;
            }
            
            // Process order
            processOrder({
                name,
                email,
                phone: '+92' + phone,
                city,
                address,
                postal,
                area,
                notes,
                paymentMethod
            });
        });
    }
    
    const backToCartBtn = document.getElementById('backToCartBtn');
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', function() {
            closeModalFunc('shipmentModal');
            openModal('cartModal');
        });
    }
    
    // Order confirmation
    const trackOrderBtn = document.getElementById('trackOrderBtn');
    if (trackOrderBtn) {
        trackOrderBtn.addEventListener('click', function() {
            const orderId = document.getElementById('orderId').textContent;
            openTrackingModal(orderId);
        });
    }
    
    const continueShoppingConfirmationBtn = document.getElementById('continueShoppingConfirmationBtn');
    if (continueShoppingConfirmationBtn) {
        continueShoppingConfirmationBtn.addEventListener('click', function() {
            closeModalFunc('orderConfirmationModal');
            smoothScrollTo('#category-search');
        });
    }
    
    // Subscribe button
    const subscribeBtn = document.getElementById('subscribeBtn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', function() {
            const emailInput = document.getElementById('newsletterEmail');
            const email = emailInput ? emailInput.value : '';
            if (email && isValidEmail(email)) {
                showToast('Thank you for subscribing to our newsletter!', 'success');
                if (emailInput) emailInput.value = '';
            } else {
                showToast('Please enter a valid email address', 'error');
            }
        });
    }
    
    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };

            fetch(`${API_BASE}?action=contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        showToast('Message sent successfully! We\'ll contact you soon.', 'success');
                        contactForm.reset();
                    } else {
                        showToast(data.message || 'Unable to send message', 'error');
                    }
                })
                .catch(() => {
                    showToast('Unable to send message. Please try again later.', 'error');
                });
        });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail') ? document.getElementById('loginEmail').value : '';
            const password = document.getElementById('loginPassword') ? document.getElementById('loginPassword').value : '';
            
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }

            const selectedRoleInput = document.getElementById('loginRole');
            const roleValue = selectedRoleInput ? selectedRoleInput.value : 'customer';

            fetch(`${API_BASE}?action=login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role: roleValue })
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        showToast(data.message || 'Login failed', 'error');
                        return;
                    }
                    currentUser = data.user;
                    saveUserData();
                    showToast('Login successful!', 'success');
                    closeModalFunc('loginModal');

                    setTimeout(() => {
                        if (roleValue === 'admin') {
                            window.location.href = 'admin.html';
                        } else if (roleValue === 'company') {
                            window.location.href = 'company.html';
                        }
                    }, 700);
                })
                .catch(() => {
                    showToast('Login failed. Please try again.', 'error');
                });
        });
    }
    
    // Register form with role selection
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('regName') ? document.getElementById('regName').value : '';
            const email = document.getElementById('regEmail') ? document.getElementById('regEmail').value : '';
            const password = document.getElementById('regPassword') ? document.getElementById('regPassword').value : '';
            const role = document.getElementById('regRole') ? document.getElementById('regRole').value : '';
            const phone = document.getElementById('regPhone') ? document.getElementById('regPhone').value : '';
            
            if (!name || !email || !password || !role) {
                showToast('Please fill in all required fields', 'error');
                return;
            }

            fetch(`${API_BASE}?action=register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role, phone })
            })
                .then(res => res.json())
                .then(data => {
                    if (!data.success) {
                        showToast(data.message || 'Registration failed', 'error');
                        return;
                    }
                    currentUser = data.user;
                    saveUserData();
                    showToast('Registration successful!', 'success');
                    closeModalFunc('registerModal');

                    setTimeout(() => {
                        if (role === 'admin') {
                            window.location.href = 'admin.html';
                        } else if (role === 'company') {
                            window.location.href = 'company.html';
                        }
                    }, 1000);
                })
                .catch(() => {
                    showToast('Registration failed. Please try again.', 'error');
                });
        });
    }
    
    // Close modals on outside click
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModalFunc(e.target.id);
        }
    });
    
    // Update flash sale timer
    setInterval(updateFlashSaleTimer, 1000);
}

// Order Tracking Functions
function setupOrderTracking() {
    console.log('Setting up order tracking...');
    
    // Open tracking modal
    const trackOrderTopBtn = document.getElementById('trackOrderTopBtn');
    const trackOrderFooterBtn = document.getElementById('trackOrderFooterBtn');
    
    if (trackOrderTopBtn) {
        trackOrderTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openTrackingModal();
        });
    }
    
    if (trackOrderFooterBtn) {
        trackOrderFooterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openTrackingModal();
        });
    }
    
    const closeTrackingModal = document.getElementById('closeTrackingModal');
    if (closeTrackingModal) {
        closeTrackingModal.addEventListener('click', () => {
            closeModalFunc('orderTrackingModal');
        });
    }
    
    const trackOrderBtnLookup = document.getElementById('trackOrderBtnLookup');
    if (trackOrderBtnLookup) {
        trackOrderBtnLookup.addEventListener('click', (e) => {
            e.preventDefault();
            trackOrder();
        });
    }
    
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLookupForm();
        });
    }
    
    const trackAnotherBtn = document.getElementById('trackAnotherBtn');
    if (trackAnotherBtn) {
        trackAnotherBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLookupForm();
        });
    }
    
    // Allow Enter key to trigger tracking
    const trackOrderIdInput = document.getElementById('trackOrderIdInput');
    if (trackOrderIdInput) {
        trackOrderIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                trackOrder();
            }
        });
    }
    
    // Close modal when clicking outside
    const orderTrackingModal = document.getElementById('orderTrackingModal');
    if (orderTrackingModal) {
        orderTrackingModal.addEventListener('click', (e) => {
            if (e.target === orderTrackingModal) {
                closeModalFunc('orderTrackingModal');
            }
        });
    }
    
    // Initialize with empty state
    showLookupForm();
}

// Open tracking modal
function openTrackingModal(orderId = '') {
    const orderTrackingModal = document.getElementById('orderTrackingModal');
    const trackOrderIdInput = document.getElementById('trackOrderIdInput');
    
    if (!orderTrackingModal) return;
    
    openModal('orderTrackingModal');
    
    if (orderId && trackOrderIdInput) {
        trackOrderIdInput.value = orderId;
        trackOrder();
    } else {
        showLookupForm();
    }
}

// Show lookup form
function showLookupForm() {
    const trackingLookup = document.getElementById('trackingLookup');
    const trackingResults = document.getElementById('trackingResults');
    const trackingLoading = document.getElementById('trackingLoading');
    const trackingError = document.getElementById('trackingError');
    const trackOrderIdInput = document.getElementById('trackOrderIdInput');
    
    if (!trackingLookup || !trackingResults || !trackingLoading || !trackingError) return;
    
    trackingLookup.style.display = 'block';
    trackingResults.style.display = 'none';
    trackingLoading.style.display = 'none';
    trackingError.style.display = 'none';
    
    if (trackOrderIdInput) {
        trackOrderIdInput.value = '';
        trackOrderIdInput.focus();
    }
}

// Track order function
function trackOrder() {
    const trackOrderIdInput = document.getElementById('trackOrderIdInput');
    const trackingLookup = document.getElementById('trackingLookup');
    const trackingResults = document.getElementById('trackingResults');
    const trackingLoading = document.getElementById('trackingLoading');
    const trackingError = document.getElementById('trackingError');
    
    if (!trackOrderIdInput) return;
    
    const orderId = trackOrderIdInput.value.trim().toUpperCase();
    
    if (!orderId) {
        showToast('Please enter an Order ID', 'error');
        trackOrderIdInput.focus();
        return;
    }

    // Show loading
    trackingLookup.style.display = 'none';
    trackingResults.style.display = 'none';
    trackingLoading.style.display = 'flex';
    trackingError.style.display = 'none';

    fetch(`${API_BASE}?action=trackOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.order) {
                displayTrackingResults(data.order);
                trackingLookup.style.display = 'none';
                trackingResults.style.display = 'block';
                trackingLoading.style.display = 'none';
                trackingError.style.display = 'none';
            } else {
                trackingLookup.style.display = 'none';
                trackingResults.style.display = 'none';
                trackingLoading.style.display = 'none';
                trackingError.style.display = 'block';
                if (document.getElementById('trackingErrorMessage')) {
                    document.getElementById('trackingErrorMessage').textContent = data.message || `No order found with ID: ${orderId}. Please check and try again.`;
                }
            }
        })
        .catch(() => {
            trackingLookup.style.display = 'none';
            trackingResults.style.display = 'none';
            trackingLoading.style.display = 'none';
            trackingError.style.display = 'block';
            if (document.getElementById('trackingErrorMessage')) {
                document.getElementById('trackingErrorMessage').textContent = 'Unable to fetch tracking info right now.';
            }
        });
}

// Display tracking results
function displayTrackingResults(order) {
    if (!order) return;
    
    // Update order ID
    if (document.getElementById('trackingOrderId')) {
        document.getElementById('trackingOrderId').textContent = order.orderId;
    }
    
    // Update status badge
    const statusBadge = document.getElementById('trackingStatusBadge');
    if (statusBadge) {
        statusBadge.innerHTML = `<span>${order.statusText}</span>`;
        statusBadge.className = 'status-badge ' + order.status;
    }
    
    // Update delivery date
    if (document.getElementById('trackingDeliveryDate')) {
        document.getElementById('trackingDeliveryDate').textContent = order.deliveryDate;
    }
    
    // Update carrier and tracking number
    if (document.getElementById('trackingCarrier')) {
        document.getElementById('trackingCarrier').textContent = order.carrier;
    }
    
    if (document.getElementById('trackingNumber')) {
        document.getElementById('trackingNumber').textContent = order.trackingNumber;
    }
    
    // Update timeline
    const timelineContainer = document.getElementById('trackingTimeline');
    if (timelineContainer) {
        timelineContainer.innerHTML = '';
        
        order.timeline.forEach((item, index) => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            if (item.completed) timelineItem.classList.add('completed');
            if (item.current) timelineItem.classList.add('current');
            
            timelineItem.innerHTML = `
                <div class="timeline-marker">
                    <i class="fas ${item.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
                </div>
                <div class="timeline-content">
                    <h6>${item.status}</h6>
                    <p class="timeline-date">${item.date}</p>
                    <p class="timeline-desc">${item.description}</p>
                </div>
            `;
            timelineContainer.appendChild(timelineItem);
        });
    }
    
    // Update order items
    const itemsContainer = document.getElementById('trackingItems');
    if (itemsContainer) {
        itemsContainer.innerHTML = '<h5>Order Items</h5>';
        
        order.items.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'tracking-item';
            itemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-quantity">Qty: ${item.quantity}</span>
                </div>
                <div class="item-price">$${item.price.toFixed(2)}</div>
            `;
            itemsContainer.appendChild(itemElement);
        });
    }
    
    // Update summary
    if (document.getElementById('trackingSubtotal')) {
        document.getElementById('trackingSubtotal').textContent = `$${order.subtotal.toFixed(2)}`;
    }
    
    if (document.getElementById('trackingShipping')) {
        document.getElementById('trackingShipping').textContent = `$${order.shipping.toFixed(2)}`;
    }
    
    if (document.getElementById('trackingTax')) {
        document.getElementById('trackingTax').textContent = `$${order.tax.toFixed(2)}`;
    }
    
    if (document.getElementById('trackingTotal')) {
        document.getElementById('trackingTotal').textContent = `$${order.total.toFixed(2)}`;
    }
}

// All other functions (addToCart, updateCartDisplay, etc.) remain the same as your original code
// ... [Rest of your functions from the original script] ...

// Initialize animations
function initAnimations() {
    // Add floating animation to elements
    const elements = document.querySelectorAll('.category-card, .product-card, .delivery-card');
    elements.forEach((el, index) => {
        el.style.animationDelay = (index * 0.1) + 's';
        el.classList.add('animate-on-scroll');
    });
    
    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe all animatable elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

// Show loading indicator
function showLoading(show) {
    let loadingElement = document.getElementById('loadingSpinner');
    if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.id = 'loadingSpinner';
        loadingElement.className = 'loading-spinner';
        loadingElement.innerHTML = `
            <div class="spinner"></div>
            <div style="margin-top: 20px; font-size: 18px; color: var(--dark); font-weight: 500;">Loading...</div>
        `;
        document.body.appendChild(loadingElement);
    }
    
    if (show) {
        loadingElement.style.display = 'flex';
        setTimeout(() => loadingElement.classList.add('active'), 10);
    } else {
        loadingElement.classList.remove('active');
        setTimeout(() => loadingElement.style.display = 'none', 300);
    }
}

// Render featured products
function renderFeaturedProducts(products) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = '';
    
    if (products.length === 0) {
        productsGrid.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 60px; color: var(--gray);">
                <i class="fas fa-box-open" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3>No featured products available</h3>
                <p>Check back soon for amazing products!</p>
            </div>
        `;
        return;
    }
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = (index * 0.1) + 's';
        productsGrid.appendChild(productCard);
    });
}

// Render new arrivals
function renderNewArrivals(products) {
    const newArrivalsGrid = document.getElementById('newArrivalsGrid');
    if (!newArrivalsGrid) return;
    
    newArrivalsGrid.innerHTML = '';
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = (index * 0.1) + 's';
        newArrivalsGrid.appendChild(productCard);
    });
}

// Render trending products
function renderTrendingProducts(products) {
    const trendingGrid = document.getElementById('trendingGrid');
    if (!trendingGrid) return;
    
    trendingGrid.innerHTML = '';
    
    if (!products || products.length === 0) {
        trendingGrid.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 60px; color: var(--gray);">
                <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3>No trending products yet</h3>
                <p>Check back soon for popular picks.</p>
            </div>
        `;
        return;
    }
    
    products.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = (index * 0.1) + 's';
        trendingGrid.appendChild(productCard);
    });
}

// Render category products
function renderCategoryProducts(category, products) {
    const categoryProductsGrid = document.getElementById('categoryProductsGrid');
    if (!categoryProductsGrid) return;
    
    categoryProductsGrid.innerHTML = '';
    
    let filteredProducts = products;
    
    if (category !== 'all') {
        filteredProducts = products.filter(product => 
            product.category.toLowerCase() === category.toLowerCase() ||
            product.category.toLowerCase().includes(category.toLowerCase())
        );
    }
    
    if (filteredProducts.length === 0) {
        categoryProductsGrid.innerHTML = `
            <div style="text-align: center; grid-column: 1/-1; padding: 60px; color: var(--gray);">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <h3>No products found</h3>
                <p>Try selecting a different category</p>
            </div>
        `;
        return;
    }
    
    filteredProducts.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = (index * 0.1) + 's';
        categoryProductsGrid.appendChild(productCard);
    });
}

// Generate star rating HTML
function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '<i class="fas fa-star"></i>';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    
    return stars;
}

// Open product view modal
function openProductView(productId) {
    console.log('Opening product view for ID:', productId);
    
    if (!window.allProducts || !Array.isArray(window.allProducts) || window.allProducts.length === 0) {
        console.error('Products not loaded yet');
        showToast('Products are still loading. Please try again.', 'error');
        return;
    }
    
    const id = Number(productId);
    const product = window.allProducts.find(p => p.id === id);
    
    if (!product) {
        console.error('Product not found with ID:', id);
        showToast('Product not found!', 'error');
        return;
    }
    
    console.log('Found product:', product.name);
    
    try {
        const stars = generateStars(product.rating);
        const colors = product.colors || ['Black', 'White', 'Gray', 'Blue'];
        
        // Create color options HTML
        let colorOptionsHTML = '';
        colors.forEach((color, index) => {
            const activeClass = index === 0 ? 'active' : '';
            colorOptionsHTML += `
                <div class="color-option ${activeClass}" data-color="${color}" style="background-color: ${getColorCode(color)}" title="${color}"></div>
            `;
        });
        
        // Use fallback images if needed
        const image1 = product.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
        const image2 = product.image2 || image1;
        const image3 = product.image3 || image1;
        
        // Create product view content
        const productViewContent = document.getElementById('productViewContent');
        productViewContent.innerHTML = `
            <div class="product-view-images">
                <div class="product-main-image">
                    <img src="${image1}" alt="${product.name}" id="productMainImage" 
                         onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">
                </div>
                <div class="product-thumbnails">
                    <div class="product-thumbnail active" data-image="${image1}">
                        <img src="${image1}" alt="${product.name}" 
                             onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
                    </div>
                    <div class="product-thumbnail" data-image="${image2}">
                        <img src="${image2}" alt="${product.name}" 
                             onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
                    </div>
                    <div class="product-thumbnail" data-image="${image3}">
                        <img src="${image3}" alt="${product.name}" 
                             onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
                    </div>
                </div>
            </div>
            <div class="product-view-details">
                <h3>${product.name}</h3>
                <div class="product-view-rating">
                    <div class="stars">${stars}</div>
                    <div class="rating-count">(${product.reviews.toLocaleString()} reviews)</div>
                </div>
                <div class="product-view-price">
                    <span class="price">$${product.price.toFixed(2)}</span>
                    ${product.old_price ? `<span class="old-price">$${product.old_price.toFixed(2)}</span>` : ''}
                </div>
                <p class="product-view-description">${product.description}</p>
                
                <div class="product-colors">
                    <h4>Available Colors</h4>
                    <div class="color-options">
                        ${colorOptionsHTML}
                    </div>
                </div>
                
                <div class="product-view-actions">
                    <button class="btn btn-primary" id="addToCartFromView" data-id="${product.id}">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-outline" id="addToWishlistFromView" data-id="${product.id}">
                        <i class="far fa-heart"></i> Add to Wishlist
                    </button>
                </div>
                
                <div class="product-specs">
                    <h4>Product Details</h4>
                    <div class="specs-grid">
                        <div class="spec-item">
                            <span class="spec-label">Category:</span>
                            <span class="spec-value">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Availability:</span>
                            <span class="spec-value" style="color: ${product.stock > 0 ? 'var(--success)' : 'var(--danger)'}">
                                ${product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}
                            </span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Rating:</span>
                            <span class="spec-value">${product.rating}/5 (${product.reviews} reviews)</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Color Options:</span>
                            <span class="spec-value">${colors.length} colors</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Setup thumbnail click events
        setTimeout(() => {
            document.querySelectorAll('.product-thumbnail').forEach(thumbnail => {
                thumbnail.addEventListener('click', function() {
                    document.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    const imageUrl = this.getAttribute('data-image');
                    document.getElementById('productMainImage').src = imageUrl;
                });
            });
            
            // Setup color option click events
            document.querySelectorAll('.color-option').forEach(colorOption => {
                colorOption.addEventListener('click', function() {
                    document.querySelectorAll('.color-option').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                });
            });
            
            // Setup action buttons
            const addToCartFromView = document.getElementById('addToCartFromView');
            const addToWishlistFromView = document.getElementById('addToWishlistFromView');
            
            if (addToCartFromView) {
                addToCartFromView.addEventListener('click', () => {
                    addToCartWithAnimation(product.id, addToCartFromView);
                });
            }
            
            if (addToWishlistFromView) {
                addToWishlistFromView.addEventListener('click', () => {
                    toggleWishlistWithAnimation(product.id, addToWishlistFromView);
                });
            }
        }, 100);
        
        openModal('productViewModal');
        
    } catch (error) {
        console.error('Error in product view:', error);
        showToast('Error loading product details', 'error');
    }
}

// Helper function to get color code
function getColorCode(colorName) {
    const colorMap = {
        'Black': '#000000',
        'Brown': '#8B4513',
        'Dark Brown': '#654321',
        'Camel': '#C19A6B',
        'Space Black': '#1a1a1a',
        'Natural Titanium': '#D8D5D0',
        'White Titanium': '#F0F0F0',
        'Blue Titanium': '#5D8AA8',
        'Stainless Steel': '#A8A9AD',
        'White': '#FFFFFF',
        'Red': '#FF0000',
        'Original': '#F5F5F5',
        'Rose Gold Edition': '#B76E79',
        'Platinum Edition': '#E5E4E2',
        'Purple': '#800080',
        'Blue': '#0000FF',
        'Green': '#008000',
        'Pink': '#FFC0CB',
        'Grey': '#808080',
        'Navy Blue': '#000080',
        'Silver': '#C0C0C0',
        'Phantom Black': '#2D2D2D',
        'Cream': '#FFFDD0',
        'Violet': '#8F00FF',
        'Gold': '#FFD700',
        'Rose Gold': '#B76E79',
        'Blue Denim': '#1560BD',
        'Red Velvet': '#800020'
    };
    
    return colorMap[colorName] || '#CCCCCC';
}

// Search functionality
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (!query) {
        showToast('Please enter a search term', 'error');
        return;
    }
    
    if (!window.allProducts) {
        showToast('Products not loaded yet', 'error');
        return;
    }
    
    const searchResults = window.allProducts.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
    );
    
    if (searchResults.length === 0) {
        showToast('No products found for "' + query + '"', 'error');
        return;
    }
    
    // Show search results
    const categoryProductsGrid = document.getElementById('categoryProductsGrid');
    if (!categoryProductsGrid) return;
    
    categoryProductsGrid.innerHTML = '';
    
    // Update search option buttons
    const searchOptionBtns = document.querySelectorAll('.search-option-btn');
    if (searchOptionBtns) {
        searchOptionBtns.forEach(btn => btn.classList.remove('active'));
    }
    
    // Add search results title
    const resultsTitle = document.createElement('div');
    resultsTitle.style.gridColumn = '1 / -1';
    resultsTitle.style.textAlign = 'center';
    resultsTitle.style.marginBottom = '30px';
    resultsTitle.innerHTML = '<h3 style="color: var(--dark);">Search Results for "' + query + '" (' + searchResults.length + ' found)</h3>';
    categoryProductsGrid.appendChild(resultsTitle);
    
    // Display results
    searchResults.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = (index * 0.1) + 's';
        categoryProductsGrid.appendChild(productCard);
    });
    
    // Scroll to results
    smoothScrollTo('#category-search');
    showToast('Found ' + searchResults.length + ' products for "' + query + '"', 'success');
}

// Product filtering
function filterProductsByCategory(category) {
    // Update search option buttons
    const searchOptionBtns = document.querySelectorAll('.search-option-btn');
    if (searchOptionBtns) {
        searchOptionBtns.forEach(btn => {
            if (btn.getAttribute('data-category') === category) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    // Render products
    if (window.allProducts) {
        renderCategoryProducts(category, window.allProducts);
    }
}

// Cart functionality
function addToCartWithAnimation(productId, button) {
    const product = window.allProducts ? window.allProducts.find(p => p.id === productId) : null;
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    // Button animation
    if (button) {
        button.style.transform = 'scale(0.8)';
        setTimeout(() => {
            button.style.transform = 'scale(1.1) rotate(15deg)';
        }, 150);
        setTimeout(() => {
            button.style.transform = '';
        }, 300);
    }
    
    addToCart(productId);
    showToast(product.name + ' added to cart!', 'success');
    
    // Create flying animation
    const cartBtn = document.getElementById('cartBtn');
    if (button && cartBtn) {
        createFlyingAnimation(button, cartBtn);
    }
}

function addToCart(productId) {
    const product = window.allProducts ? window.allProducts.find(p => p.id === productId) : null;
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            quantity: 1
        });
    }
    
    updateCartDisplay();
    saveCartToStorage();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartDisplay();
    saveCartToStorage();
    const cartContainer = document.getElementById('cartContainer');
    if (cartContainer) renderCartItems();
    showToast('Product removed from cart', 'error');
}

function updateCartQuantity(productId, quantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity < 1) {
            removeFromCart(productId);
        } else {
            item.quantity = quantity;
            updateCartDisplay();
            saveCartToStorage();
            const cartContainer = document.getElementById('cartContainer');
            if (cartContainer) renderCartItems();
        }
    }
}

// Wishlist functionality
function toggleWishlistWithAnimation(productId, button) {
    const product = window.allProducts ? window.allProducts.find(p => p.id === productId) : null;
    if (!product) return;
    
    const icon = button ? button.querySelector('i') : null;
    const wasInWishlist = icon ? icon.classList.contains('fas') : false;
    
    // Heart beat animation
    if (button) {
        button.style.transform = 'scale(1.3)';
        setTimeout(() => {
            button.style.transform = '';
        }, 300);
    }
    
    toggleWishlist(productId);
    
    if (icon) {
        if (wasInWishlist) {
            icon.className = 'far fa-heart';
            if (button) button.style.color = '';
            showToast(product.name + ' removed from wishlist', 'error');
        } else {
            icon.className = 'fas fa-heart';
            if (button) button.style.color = 'var(--accent)';
            showToast(product.name + ' added to wishlist!', 'success');
        }
    }
}

function toggleWishlist(productId) {
    const product = window.allProducts ? window.allProducts.find(p => p.id === productId) : null;
    if (!product) return;
    
    const existingIndex = wishlist.findIndex(item => item.id === productId);
    
    if (existingIndex > -1) {
        wishlist.splice(existingIndex, 1);
    } else {
        wishlist.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category
        });
    }
    
    updateWishlistDisplay();
    saveWishlistToStorage();
}

// Render cart items
function renderCartItems() {
    const cartContainer = document.getElementById('cartContainer');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartShipping = document.getElementById('cartShipping');
    const cartDiscount = document.getElementById('cartDiscount');
    const cartTotal = document.getElementById('cartTotal');
    
    if (!cartContainer) return;
    
    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartSummary) cartSummary.style.display = 'none';
        return;
    }
    
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartSummary) cartSummary.style.display = 'block';
    
    let subtotal = 0;
    
    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.style.animationDelay = (index * 0.1) + 's';
        cartItem.innerHTML = `
            <div class="cart-item-img">
                <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-category">${item.category.toUpperCase()}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn minus" data-id="${item.id}">-</button>
                    <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}">
                    <button class="quantity-btn plus" data-id="${item.id}">+</button>
                </div>
                <button class="remove-btn" data-id="${item.id}">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
        
        cartContainer.appendChild(cartItem);
        subtotal += item.price * item.quantity;
    });
    
    // Calculate totals
    const shipping = subtotal > 100 ? 0 : 5.99;
    const discount = subtotal > 200 ? subtotal * 0.1 : 0;
    const total = subtotal + shipping - discount;
    
    // Update summary
    if (cartSubtotal) cartSubtotal.textContent = '$' + subtotal.toFixed(2);
    if (cartShipping) cartShipping.textContent = shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2);
    if (cartDiscount) cartDiscount.textContent = discount > 0 ? '-$' + discount.toFixed(2) : '$0.00';
    if (cartTotal) cartTotal.textContent = '$' + total.toFixed(2);
    
    // Add event listeners
    setupCartItemListeners();
}

// Setup cart item listeners
function setupCartItemListeners() {
    document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const item = cart.find(item => item.id === productId);
            if (item && item.quantity > 1) {
                updateCartQuantity(productId, item.quantity - 1);
            } else {
                removeFromCart(productId);
            }
        });
    });
    
    document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const item = cart.find(item => item.id === productId);
            if (item) {
                updateCartQuantity(productId, item.quantity + 1);
            }
        });
    });
    
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            const quantity = parseInt(this.value) || 1;
            updateCartQuantity(productId, quantity);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            removeFromCart(productId);
        });
    });
}

// Render wishlist items
function renderWishlistItems() {
    const wishlistContainer = document.getElementById('wishlistContainer');
    const emptyWishlist = document.getElementById('emptyWishlist');
    
    if (!wishlistContainer) return;
    
    wishlistContainer.innerHTML = '';
    
    if (wishlist.length === 0) {
        if (emptyWishlist) emptyWishlist.style.display = 'block';
        return;
    }
    
    if (emptyWishlist) emptyWishlist.style.display = 'none';
    
    wishlist.forEach((item, index) => {
        const wishlistItem = document.createElement('div');
        wishlistItem.className = 'wishlist-item';
        wishlistItem.style.animationDelay = (index * 0.1) + 's';
        wishlistItem.innerHTML = `
            <div class="wishlist-item-img">
                <img src="${item.image}" alt="${item.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80'">
            </div>
            <div class="wishlist-item-details">
                <div class="wishlist-item-title">${item.name}</div>
                <div class="wishlist-item-category">${item.category.toUpperCase()}</div>
                <div class="wishlist-item-price">$${item.price.toFixed(2)}</div>
                <div class="wishlist-item-actions">
                    <button class="btn btn-primary" data-id="${item.id}" id="wishlistAddToCart">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-outline" data-id="${item.id}" id="wishlistRemove">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        
        wishlistContainer.appendChild(wishlistItem);
    });
    
    // Add event listeners to wishlist items
    document.querySelectorAll('#wishlistAddToCart').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            addToCart(productId);
            showToast('Product added to cart from wishlist!', 'success');
        });
    });
    
    document.querySelectorAll('#wishlistRemove').forEach(btn => {
        btn.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            toggleWishlist(productId);
            renderWishlistItems();
        });
    });
}

// Update cart display
function updateCartDisplay() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = totalItems;
        if (totalItems > 0) {
            cartCount.classList.add('pulse');
            setTimeout(() => cartCount.classList.remove('pulse'), 600);
        }
    }
}

// Update wishlist display
function updateWishlistDisplay() {
    const wishlistCount = document.getElementById('wishlistCount');
    if (wishlistCount) {
        wishlistCount.textContent = wishlist.length;
        if (wishlist.length > 0) {
            wishlistCount.classList.add('pulse');
            setTimeout(() => wishlistCount.classList.remove('pulse'), 600);
        }
    }
}

// Update shipment preview
function updateShipmentPreview() {
    if (cart.length === 0) return;
    
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    
    const shipping = subtotal > 100 ? 0 : 5.99;
    const discount = subtotal > 200 ? subtotal * 0.1 : 0;
    const total = subtotal + shipping - discount;
    
    const previewItems = document.getElementById('previewItems');
    const previewSubtotal = document.getElementById('previewSubtotal');
    const previewShipping = document.getElementById('previewShipping');
    const previewTotal = document.getElementById('previewTotal');
    
    if (previewItems) previewItems.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (previewSubtotal) previewSubtotal.textContent = '$' + subtotal.toFixed(2);
    if (previewShipping) previewShipping.textContent = shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2);
    if (previewTotal) previewTotal.textContent = '$' + total.toFixed(2);
}

// Process order
function processOrder(formData) {
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    const payload = {
        cart: cart.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price
        })),
        user: {
            id: currentUser ? currentUser.id : null,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            country: 'Pakistan'
        },
        shipping: {
            method: 'standard'
        },
        payment: {
            method: formData.paymentMethod
        }
    };

    fetch(`${API_BASE}?action=checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) {
                showToast(data.message || 'Order failed', 'error');
                return;
            }

            const order = data.order;
            if (document.getElementById('orderId')) document.getElementById('orderId').textContent = order.id;
            if (document.getElementById('orderTotal')) document.getElementById('orderTotal').textContent = '$' + Number(order.summary.total).toFixed(2);
            if (document.getElementById('orderDelivery')) document.getElementById('orderDelivery').textContent = order.estimated_delivery;

            localStorage.setItem('lastOrder', JSON.stringify(order));

            closeModalFunc('shipmentModal');
            setTimeout(() => {
                openModal('orderConfirmationModal');
                cart = [];
                updateCartDisplay();
                saveCartToStorage();
                const shipmentForm = document.getElementById('shipmentForm');
                if (shipmentForm) shipmentForm.reset();
                showToast('Order placed successfully!', 'success');
            }, 300);
        })
        .catch(() => {
            showToast('Order failed. Please try again.', 'error');
        });
}

// Save order to history
function saveOrderToHistory(order) {
    orderHistory.push(order);
    saveOrderHistoryToStorage();
}

// Create flying animation
function createFlyingAnimation(startElement, endElement) {
    if (!startElement || !endElement) return;
    
    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();
    
    const flyingItem = document.createElement('div');
    flyingItem.style.cssText = `
        position: fixed;
        width: 20px;
        height: 20px;
        background: var(--primary);
        border-radius: 50%;
        z-index: 9999;
        pointer-events: none;
        top: ${startRect.top + startRect.height/2}px;
        left: ${startRect.left + startRect.width/2}px;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 10px rgba(74, 108, 247, 0.5);
    `;
    
    document.body.appendChild(flyingItem);
    
    // Animate to cart
    const animation = flyingItem.animate([
        {
            top: (startRect.top + startRect.height/2) + 'px',
            left: (startRect.left + startRect.width/2) + 'px',
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: 1
        },
        {
            top: (endRect.top + endRect.height/2) + 'px',
            left: (endRect.left + endRect.width/2) + 'px',
            transform: 'translate(-50%, -50%) scale(0.5)',
            opacity: 0.5
        }
    ], {
        duration: 600,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    });
    
    animation.onfinish = () => {
        if (flyingItem.parentNode) {
            document.body.removeChild(flyingItem);
        }
        
        // Pulse cart button
        const cartBtn = document.getElementById('cartBtn');
        if (cartBtn) {
            cartBtn.classList.add('pulse');
            setTimeout(() => cartBtn.classList.remove('pulse'), 600);
        }
    };
}

// Modal helper functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    document.body.style.overflow = 'hidden';
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModalFunc(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 300);
}

function smoothScrollTo(selector) {
    const element = document.querySelector(selector);
    if (element) {
        const offset = 100;
        const elementPosition = element.offsetTop - offset;
        window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
        });
    }
}


// Show toast notification
function showToast(message, type = 'success') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : type === 'warning' ? 'exclamation-triangle' : 'info'}"></i>
        </div>
        <div class="toast-content">
            <h4>${type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : type === 'warning' ? 'Warning!' : 'Info!'}</h4>
            <p>${message}</p>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove existing toasts if too many
    const existingToasts = document.querySelectorAll('.toast');
    if (existingToasts.length > 3) {
        existingToasts[0].remove();
    }
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    });
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 5000);
}

// Update flash sale timer
function updateFlashSaleTimer() {
    const timerElement = document.querySelector('.hot-deal .timer');
    if (!timerElement) return;
    
    // Set end time to 24 hours from now
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 24);
    
    const now = new Date();
    const timeLeft = endTime - now;
    
    if (timeLeft <= 0) {
        timerElement.textContent = '00:00:00';
        return;
    }
    
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    timerElement.textContent = hours.toString().padStart(2, '0') + ':' + 
                               minutes.toString().padStart(2, '0') + ':' + 
                               seconds.toString().padStart(2, '0');
}

// User data functions
function loadUserData() {
    const userData = localStorage.getItem('buyPKUser');
    if (userData) {
        try {
            currentUser = JSON.parse(userData);
        } catch (e) {
            console.log('Error parsing user data:', e);
        }
    }
}

function saveUserData() {
    if (currentUser) {
        localStorage.setItem('buyPKUser', JSON.stringify(currentUser));
    }
}

// Local storage functions
function saveCartToStorage() {
    localStorage.setItem('buyPKCart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('buyPKCart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
        } catch (e) {
            console.log('Error parsing cart data:', e);
            cart = [];
        }
    }
}

function saveWishlistToStorage() {
    localStorage.setItem('buyPKWishlist', JSON.stringify(wishlist));
}

function loadWishlistFromStorage() {
    const savedWishlist = localStorage.getItem('buyPKWishlist');
    if (savedWishlist) {
        try {
            wishlist = JSON.parse(savedWishlist);
        } catch (e) {
            console.log('Error parsing wishlist data:', e);
            wishlist = [];
        }
    }
}

function saveOrderHistoryToStorage() {
    localStorage.setItem('buyPKOrderHistory', JSON.stringify(orderHistory));
}

function loadOrderHistoryFromStorage() {
    const savedHistory = localStorage.getItem('buyPKOrderHistory');
    if (savedHistory) {
        try {
            orderHistory = JSON.parse(savedHistory);
        } catch (e) {
            console.log('Error parsing order history:', e);
            orderHistory = [];
        }
    }
}

// Utility functions
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Initialize on page load
window.addEventListener('load', () => {
    console.log('BuyPK Customer Ready!');
    // Test if everything is working
    setTimeout(() => {
        if (cart.length > 0) updateCartDisplay();
        if (wishlist.length > 0) updateWishlistDisplay();
        console.log('Initial product count:', window.allProducts ? window.allProducts.length : 0);
    }, 1000);
});
