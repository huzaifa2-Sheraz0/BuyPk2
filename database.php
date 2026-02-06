<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 3600');

error_reporting(E_ALL);
ini_set('display_errors', 1);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$DB_HOST = 'localhost';
$DB_USER = 'root';
$DB_PASS = '';
$DB_NAME = 'buy_db';
$DB_PORT = 3306;

function dbConnect() {
    global $DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT;
    $conn = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME, $DB_PORT);
    if ($conn->connect_error) {
        echo json_encode(['success' => false, 'message' => 'Database connection failed']);
        exit();
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function getRequestData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') !== false) {
        return json_decode(file_get_contents('php://input'), true);
    }
    return $_POST;
}

function sanitizeUser($user) {
    unset($user['password_hash']);
    return $user;
}

function normalizeProduct($row) {
    if (isset($row['colors']) && is_string($row['colors'])) {
        $decoded = json_decode($row['colors'], true);
        $row['colors'] = is_array($decoded) ? $decoded : [];
    }
    if (isset($row['specs']) && is_string($row['specs'])) {
        $decoded = json_decode($row['specs'], true);
        $row['specs'] = is_array($decoded) ? $decoded : [];
    }
    $row['price'] = floatval($row['price']);
    $row['old_price'] = $row['old_price'] !== null ? floatval($row['old_price']) : 0;
    $row['rating'] = floatval($row['rating']);
    $row['reviews'] = intval($row['reviews']);
    $row['stock'] = intval($row['stock']);
    return $row;
}

function generateToken($userId, $role) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $userId,
        'role' => $role,
        'exp' => time() + (7 * 24 * 60 * 60),
        'iat' => time(),
        'iss' => 'buypk-api'
    ]);
    $base64Header = base64_encode($header);
    $base64Payload = base64_encode($payload);
    return $base64Header . '.' . $base64Payload . '.demo_signature_' . md5($userId . $role);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

switch ($action) {
    case 'getProducts':
        getProducts();
        break;
    case 'addProduct':
        addProduct();
        break;
    case 'updateProduct':
        updateProduct();
        break;
    case 'deleteProduct':
        deleteProduct();
        break;
    case 'getProduct':
        getProduct();
        break;
    case 'searchProducts':
        searchProducts();
        break;
    case 'getCategories':
        getCategories();
        break;
    case 'login':
        loginUser();
        break;
    case 'register':
        registerUser();
        break;
    case 'contact':
        saveContact();
        break;
    case 'checkout':
        processCheckout();
        break;
    case 'trackOrder':
        trackOrder();
        break;
    case 'getOrderHistory':
        getOrderHistory();
        break;
    case 'getUsers':
        getUsers();
        break;
    case 'getOrders':
        getOrders();
        break;
    case 'getAdminData':
        getAdminData();
        break;
    case 'getCompanyData':
        getCompanyData();
        break;
    case 'uploadImage':
        uploadImage();
        break;
    case 'test':
        testConnection();
        break;
    default:
        echo json_encode([
            'success' => true,
            'message' => 'BuyPK API',
            'timestamp' => date('Y-m-d H:i:s'),
            'available_actions' => ['getProducts','addProduct','updateProduct','deleteProduct','getProduct','searchProducts','getCategories','login','register','contact','checkout','trackOrder','getOrderHistory','getUsers','getOrders','getAdminData','getCompanyData','uploadImage','test']
        ]);
}

function getProducts() {
    $conn = dbConnect();
    $category = $_GET['category'] ?? '';
    $limit = min(max(intval($_GET['limit'] ?? 50), 1), 100);
    $offset = max(intval($_GET['offset'] ?? 0), 0);
    $sort = $_GET['sort'] ?? 'newest';
    $featured = $_GET['featured'] ?? false;

    $where = [];
    $params = [];
    $types = '';

    if ($featured) {
        $where[] = "badge IN ('hot','new','trending')";
    }
    if ($category && $category !== 'all') {
        $where[] = "category = ?";
        $types .= 's';
        $params[] = $category;
    }

    $orderBy = "created_at DESC";
    if ($sort === 'price_low') $orderBy = "price ASC";
    if ($sort === 'price_high') $orderBy = "price DESC";
    if ($sort === 'rating') $orderBy = "rating DESC";
    if ($sort === 'popular') $orderBy = "reviews DESC";

    $whereSql = count($where) ? ('WHERE ' . implode(' AND ', $where)) : '';
    $sql = "SELECT * FROM products $whereSql ORDER BY $orderBy LIMIT ? OFFSET ?";
    $types .= 'ii';
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $conn->prepare($sql);
    if ($types) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $products = [];
    while ($row = $res->fetch_assoc()) {
        $products[] = normalizeProduct($row);
    }

    $countSql = "SELECT COUNT(*) as total FROM products " . $whereSql;
    $countStmt = $conn->prepare($countSql);
    if ($whereSql) {
        $countTypes = substr($types, 0, strlen($types) - 2);
        $countParams = array_slice($params, 0, count($params) - 2);
        if ($countTypes) {
            $countStmt->bind_param($countTypes, ...$countParams);
        }
    }
    $countStmt->execute();
    $totalRow = $countStmt->get_result()->fetch_assoc();

    echo json_encode([
        'success' => true,
        'products' => $products,
        'total' => intval($totalRow['total'] ?? 0),
        'count' => count($products),
        'category' => $category,
        'sort' => $sort,
        'featured' => $featured ? true : false
    ]);
}

function getProduct() {
    $conn = dbConnect();
    $productId = intval($_GET['id'] ?? 0);
    if (!$productId) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    $stmt = $conn->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $productId);
    $stmt->execute();
    $res = $stmt->get_result();
    $product = $res->fetch_assoc();
    if (!$product) {
        echo json_encode(['success' => false, 'message' => 'Product not found']);
        return;
    }
    $product = normalizeProduct($product);

    $relatedStmt = $conn->prepare("SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4");
    $relatedStmt->bind_param('si', $product['category'], $productId);
    $relatedStmt->execute();
    $relatedRes = $relatedStmt->get_result();
    $related = [];
    while ($row = $relatedRes->fetch_assoc()) {
        $related[] = normalizeProduct($row);
    }

    echo json_encode([
        'success' => true,
        'product' => $product,
        'related_products' => $related
    ]);
}

function searchProducts() {
    $conn = dbConnect();
    $query = $_GET['query'] ?? '';
    $category = $_GET['category'] ?? '';
    if (!$query) {
        echo json_encode(['success' => false, 'message' => 'Search query is required']);
        return;
    }
    $like = '%' . $query . '%';
    if ($category) {
        $stmt = $conn->prepare("SELECT * FROM products WHERE category = ? AND (name LIKE ? OR description LIKE ? OR brand LIKE ?)");
        $stmt->bind_param('ssss', $category, $like, $like, $like);
    } else {
        $stmt = $conn->prepare("SELECT * FROM products WHERE name LIKE ? OR description LIKE ? OR brand LIKE ?");
        $stmt->bind_param('sss', $like, $like, $like);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $products = [];
    while ($row = $res->fetch_assoc()) {
        $products[] = normalizeProduct($row);
    }
    echo json_encode([
        'success' => true,
        'products' => $products,
        'count' => count($products),
        'query' => $query,
        'category' => $category
    ]);
}

function getCategories() {
    $conn = dbConnect();
    $res = $conn->query("SELECT category, COUNT(*) as product_count FROM products GROUP BY category");
    $categories = [];
    while ($row = $res->fetch_assoc()) {
        $categories[] = [
            'id' => $row['category'],
            'name' => ucwords(str_replace('-', ' ', $row['category'])),
            'description' => '',
            'product_count' => intval($row['product_count'])
        ];
    }
    echo json_encode([
        'success' => true,
        'categories' => $categories,
        'count' => count($categories)
    ]);
}

function addProduct() {
    $conn = dbConnect();
    $data = getRequestData();
    $name = $data['name'] ?? '';
    $category = $data['category'] ?? 'uncategorized';
    if (!$name) {
        echo json_encode(['success' => false, 'message' => 'Product name is required']);
        return;
    }
    $stmt = $conn->prepare("INSERT INTO products (name, price, old_price, category, image, image2, image3, rating, reviews, badge, description, colors, stock, created_at, brand, specs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $colors = isset($data['colors']) ? json_encode($data['colors']) : null;
    $specs = isset($data['specs']) ? json_encode($data['specs']) : null;
    $createdAt = $data['created_at'] ?? date('Y-m-d');
    $oldPrice = isset($data['old_price']) ? floatval($data['old_price']) : 0;
    $price = floatval($data['price'] ?? 0);
    $rating = floatval($data['rating'] ?? 0);
    $reviews = intval($data['reviews'] ?? 0);
    $stock = intval($data['stock'] ?? 0);
    $badge = $data['badge'] ?? '';
    $description = $data['description'] ?? '';
    $image = $data['image'] ?? '';
    $image2 = $data['image2'] ?? $image;
    $image3 = $data['image3'] ?? $image;
    $brand = $data['brand'] ?? '';
    $stmt->bind_param(
        'sddssssdisssisss',
        $name,
        $price,
        $oldPrice,
        $category,
        $image,
        $image2,
        $image3,
        $rating,
        $reviews,
        $badge,
        $description,
        $colors,
        $stock,
        $createdAt,
        $brand,
        $specs
    );
    $stmt->execute();
    echo json_encode(['success' => true, 'product_id' => $conn->insert_id]);
}

function updateProduct() {
    $conn = dbConnect();
    $data = getRequestData();
    $id = intval($data['id'] ?? 0);
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    $fields = [];
    $params = [];
    $types = '';
    foreach ($data as $key => $value) {
        if ($key === 'id') continue;
        if ($key === 'colors' || $key === 'specs') {
            $value = json_encode($value);
        }
        $fields[] = "$key = ?";
        $params[] = $value;
        $types .= is_int($value) ? 'i' : (is_float($value) ? 'd' : 's');
    }
    if (!count($fields)) {
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        return;
    }
    $types .= 'i';
    $params[] = $id;
    $sql = "UPDATE products SET " . implode(',', $fields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    echo json_encode(['success' => true, 'message' => 'Product updated']);
}

function deleteProduct() {
    $conn = dbConnect();
    $data = getRequestData();
    $id = intval($data['id'] ?? ($_GET['id'] ?? 0));
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'Product ID is required']);
        return;
    }
    $stmt = $conn->prepare("DELETE FROM products WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    echo json_encode(['success' => true, 'message' => 'Product deleted']);
}

function loginUser() {
    $conn = dbConnect();
    $data = getRequestData();
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $role = $data['role'] ?? '';
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Account not found. Please register first.']);
        return;
    }
    if ($user['status'] !== 'active') {
        echo json_encode(['success' => false, 'message' => 'Account disabled']);
        return;
    }
    if (!password_verify($password, $user['password_hash'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        return;
    }
    if ($role && $user['role'] !== $role) {
        echo json_encode(['success' => false, 'message' => 'Account role mismatch']);
        return;
    }
    $safeUser = sanitizeUser($user);
    echo json_encode([
        'success' => true,
        'user' => $safeUser,
        'token' => generateToken($safeUser['id'], $safeUser['role'])
    ]);
}

function registerUser() {
    $conn = dbConnect();
    $data = getRequestData();
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    $phone = $data['phone'] ?? '';
    $address = $data['address'] ?? '';
    $role = $data['role'] ?? 'customer';

    if (!$name || !$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Name, email, and password are required']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        return;
    }
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    if ($stmt->get_result()->fetch_assoc()) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        return;
    }
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $joined = date('Y-m-d');
    $avatar = 'https://ui-avatars.com/api/?name=' . urlencode($name) . '&background=4a6cf7&color=fff';
    $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, phone, address, role, avatar, joined_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')");
    $stmt->bind_param('ssssssss', $name, $email, $hash, $phone, $address, $role, $avatar, $joined);
    $stmt->execute();
    $userId = $conn->insert_id;
    $user = [
        'id' => $userId,
        'name' => $name,
        'email' => $email,
        'phone' => $phone,
        'address' => $address,
        'role' => $role,
        'avatar' => $avatar,
        'joined_date' => $joined,
        'status' => 'active'
    ];
    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user' => $user,
        'token' => generateToken($userId, $role)
    ]);
}

function saveContact() {
    $conn = dbConnect();
    $data = getRequestData();
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $subject = $data['subject'] ?? '';
    $message = $data['message'] ?? '';
    if (!$name || !$email || !$subject || !$message) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email address']);
        return;
    }
    $ticket = 'TKT-' . date('Ymd') . '-' . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
    $created = date('Y-m-d H:i:s');
    $stmt = $conn->prepare("INSERT INTO contacts (name, email, subject, message, status, ticket_number, created_at) VALUES (?, ?, ?, ?, 'received', ?, ?)");
    $stmt->bind_param('ssssss', $name, $email, $subject, $message, $ticket, $created);
    $stmt->execute();
    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message. We will contact you soon.',
        'contact' => ['ticket_number' => $ticket]
    ]);
}

function processCheckout() {
    $conn = dbConnect();
    $data = getRequestData();
    $cart = $data['cart'] ?? [];
    $user = $data['user'] ?? [];
    $shipping = $data['shipping'] ?? [];
    $payment = $data['payment'] ?? [];

    if (empty($cart)) {
        echo json_encode(['success' => false, 'message' => 'Cart is empty']);
        return;
    }
    $required = ['name','email','address','city','country'];
    foreach ($required as $field) {
        if (empty($user[$field])) {
            echo json_encode(['success' => false, 'message' => "Missing required field: $field"]);
            return;
        }
    }
    $subtotal = 0;
    foreach ($cart as $item) {
        $subtotal += floatval($item['price']) * intval($item['quantity']);
    }
    $shipMethod = $shipping['method'] ?? 'standard';
    $payMethod = $payment['method'] ?? 'cod';
    $shippingCost = $shipMethod === 'express' ? 9.99 : 5.99;
    $tax = $subtotal * 0.08;
    $total = $subtotal + $shippingCost + $tax;

    $orderCode = 'BPK-' . date('Ymd') . '-' . strtoupper(uniqid());
    $trackingNumber = 'TRK' . date('Ymd') . str_pad(rand(0, 9999), 6, '0', STR_PAD_LEFT) . 'PK';
    $estimated = date('Y-m-d', strtotime('+3 days'));
    $orderedAt = date('Y-m-d H:i:s');
    $userId = isset($user['id']) ? intval($user['id']) : null;

    $conn->begin_transaction();
    $stmt = $conn->prepare("INSERT INTO orders (order_code, tracking_number, user_id, user_name, user_email, user_phone, user_address, user_city, user_country, shipping_method, payment_method, status, subtotal, shipping, tax, total, estimated_delivery, ordered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param(
        'ssissssssssddddss',
        $orderCode,
        $trackingNumber,
        $userId,
        $user['name'],
        $user['email'],
        $user['phone'],
        $user['address'],
        $user['city'],
        $user['country'],
        $shipMethod,
        $payMethod,
        $subtotal,
        $shippingCost,
        $tax,
        $total,
        $estimated,
        $orderedAt
    );
    if (!$stmt->execute()) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Order creation failed']);
        return;
    }
    $orderId = $conn->insert_id;

    $itemStmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, name, quantity, price) VALUES (?, ?, ?, ?, ?)");
    foreach ($cart as $item) {
        $productId = isset($item['id']) ? intval($item['id']) : null;
        $name = $item['name'] ?? '';
        $qty = intval($item['quantity'] ?? 1);
        $price = floatval($item['price'] ?? 0);
        $itemStmt->bind_param('iisid', $orderId, $productId, $name, $qty, $price);
        if (!$itemStmt->execute()) {
            $conn->rollback();
            echo json_encode(['success' => false, 'message' => 'Order item creation failed']);
            return;
        }
    }
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Order placed successfully',
        'order' => [
            'id' => $orderCode,
            'tracking_number' => $trackingNumber,
            'summary' => [
                'subtotal' => round($subtotal, 2),
                'shipping' => round($shippingCost, 2),
                'tax' => round($tax, 2),
                'total' => round($total, 2)
            ],
            'status' => 'processing',
            'estimated_delivery' => $estimated,
            'ordered_at' => $orderedAt
        ]
    ]);
}

function trackOrder() {
    $conn = dbConnect();
    $data = getRequestData();
    $orderId = $data['orderId'] ?? ($_GET['orderId'] ?? '');
    $email = $data['email'] ?? ($_GET['email'] ?? '');
    if (!$orderId) {
        echo json_encode(['success' => false, 'message' => 'Order ID is required']);
        return;
    }
    $stmt = $conn->prepare("SELECT * FROM orders WHERE order_code = ? OR tracking_number = ? LIMIT 1");
    $stmt->bind_param('ss', $orderId, $orderId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    if (!$order) {
        echo json_encode(['success' => false, 'message' => 'Order not found. Please check your order ID or tracking number.']);
        return;
    }
    if ($email && strtolower($order['user_email']) !== strtolower($email)) {
        echo json_encode(['success' => false, 'message' => 'Order ID and email do not match']);
        return;
    }
    $items = [];
    $itemStmt = $conn->prepare("SELECT name, quantity, price FROM order_items WHERE order_id = ?");
    $itemStmt->bind_param('i', $order['id']);
    $itemStmt->execute();
    $res = $itemStmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $items[] = [
            'name' => $row['name'],
            'quantity' => intval($row['quantity']),
            'price' => floatval($row['price'])
        ];
    }
    $status = $order['status'];
    $timeline = [
        ['status' => 'Order Placed', 'date' => $order['ordered_at'], 'description' => 'Your order has been placed.', 'completed' => true],
        ['status' => 'Processing', 'date' => '', 'description' => 'Your order is being processed.', 'completed' => $status !== 'processing', 'current' => $status === 'processing'],
        ['status' => 'Shipped', 'date' => '', 'description' => 'Your order has been shipped.', 'completed' => in_array($status, ['shipped','delivered']), 'current' => $status === 'shipped'],
        ['status' => 'Delivered', 'date' => $order['delivered_at'], 'description' => 'Your order has been delivered.', 'completed' => $status === 'delivered', 'current' => $status === 'delivered']
    ];
    echo json_encode([
        'success' => true,
        'order' => [
            'orderId' => $order['order_code'],
            'status' => $status,
            'statusText' => ucfirst($status),
            'deliveryDate' => $order['estimated_delivery'],
            'carrier' => $order['shipping_method'],
            'trackingNumber' => $order['tracking_number'],
            'subtotal' => floatval($order['subtotal']),
            'shipping' => floatval($order['shipping']),
            'tax' => floatval($order['tax']),
            'total' => floatval($order['total']),
            'items' => $items,
            'timeline' => $timeline
        ]
    ]);
}

function getOrderHistory() {
    $conn = dbConnect();
    $data = getRequestData();
    $userId = $data['userId'] ?? ($_GET['userId'] ?? '');
    $email = $data['email'] ?? ($_GET['email'] ?? '');
    if (!$userId && !$email) {
        echo json_encode(['success' => false, 'message' => 'User ID or email is required']);
        return;
    }
    if ($email) {
        $stmt = $conn->prepare("SELECT order_code, ordered_at, total, status, tracking_number FROM orders WHERE user_email = ? ORDER BY ordered_at DESC");
        $stmt->bind_param('s', $email);
    } else {
        $stmt = $conn->prepare("SELECT order_code, ordered_at, total, status, tracking_number FROM orders WHERE user_id = ? ORDER BY ordered_at DESC");
        $stmt->bind_param('i', $userId);
    }
    $stmt->execute();
    $res = $stmt->get_result();
    $orders = [];
    while ($row = $res->fetch_assoc()) {
        $orders[] = [
            'order_id' => $row['order_code'],
            'date' => $row['ordered_at'],
            'items' => 0,
            'total' => floatval($row['total']),
            'status' => $row['status'],
            'status_text' => ucfirst($row['status']),
            'tracking_number' => $row['tracking_number']
        ];
    }
    echo json_encode([
        'success' => true,
        'orders' => $orders,
        'total_orders' => count($orders),
        'total_spent' => count($orders) ? array_sum(array_column($orders, 'total')) : 0,
        'average_order' => count($orders) ? array_sum(array_column($orders, 'total')) / count($orders) : 0,
        'user_id' => $userId
    ]);
}

function getUsers() {
    $conn = dbConnect();
    $res = $conn->query("SELECT id, name, email, phone, address, role, avatar, joined_date, status FROM users");
    $users = [];
    while ($row = $res->fetch_assoc()) {
        $users[] = $row;
    }
    echo json_encode(['success' => true, 'users' => $users, 'count' => count($users)]);
}

function getOrders() {
    $conn = dbConnect();
    $res = $conn->query("SELECT * FROM orders ORDER BY ordered_at DESC");
    $orders = [];
    while ($row = $res->fetch_assoc()) {
        $orders[] = [
            'id' => $row['order_code'],
            'status' => $row['status'],
            'ordered_at' => $row['ordered_at'],
            'summary' => [
                'total' => floatval($row['total'])
            ],
            'user' => [
                'name' => $row['user_name'],
                'email' => $row['user_email']
            ]
        ];
    }
    echo json_encode(['success' => true, 'orders' => $orders, 'count' => count($orders)]);
}

function getAdminData() {
    $conn = dbConnect();
    $totalOrders = $conn->query("SELECT COUNT(*) as c FROM orders")->fetch_assoc()['c'] ?? 0;
    $totalProducts = $conn->query("SELECT COUNT(*) as c FROM products")->fetch_assoc()['c'] ?? 0;
    $totalUsers = $conn->query("SELECT COUNT(*) as c FROM users")->fetch_assoc()['c'] ?? 0;
    $revenueRow = $conn->query("SELECT COALESCE(SUM(total),0) as r FROM orders")->fetch_assoc();
    $totalRevenue = floatval($revenueRow['r'] ?? 0);

    $productsRes = $conn->query("SELECT * FROM products");
    $products = [];
    while ($row = $productsRes->fetch_assoc()) {
        $products[] = normalizeProduct($row);
    }
    $usersRes = $conn->query("SELECT id, name, email, phone, address, role, avatar, joined_date, status FROM users");
    $users = [];
    while ($row = $usersRes->fetch_assoc()) {
        $users[] = $row;
    }
    $ordersRes = $conn->query("SELECT * FROM orders ORDER BY ordered_at DESC");
    $orders = [];
    while ($row = $ordersRes->fetch_assoc()) {
        $orders[] = [
            'id' => $row['order_code'],
            'status' => $row['status'],
            'ordered_at' => $row['ordered_at'],
            'summary' => [
                'total' => floatval($row['total'])
            ],
            'user' => [
                'name' => $row['user_name'],
                'email' => $row['user_email']
            ]
        ];
    }
    echo json_encode([
        'success' => true,
        'summary' => [
            'totalOrders' => intval($totalOrders),
            'totalProducts' => intval($totalProducts),
            'totalUsers' => intval($totalUsers),
            'totalRevenue' => $totalRevenue
        ],
        'products' => $products,
        'users' => $users,
        'orders' => $orders
    ]);
}

function getCompanyData() {
    $conn = dbConnect();
    $totalOrders = $conn->query("SELECT COUNT(*) as c FROM orders")->fetch_assoc()['c'] ?? 0;
    $totalProducts = $conn->query("SELECT COUNT(*) as c FROM products")->fetch_assoc()['c'] ?? 0;
    $revenueRow = $conn->query("SELECT COALESCE(SUM(total),0) as r FROM orders")->fetch_assoc();
    $totalRevenue = floatval($revenueRow['r'] ?? 0);
    $productsRes = $conn->query("SELECT * FROM products");
    $products = [];
    while ($row = $productsRes->fetch_assoc()) {
        $products[] = normalizeProduct($row);
    }
    $ordersRes = $conn->query("SELECT * FROM orders ORDER BY ordered_at DESC");
    $orders = [];
    while ($row = $ordersRes->fetch_assoc()) {
        $orders[] = [
            'id' => $row['order_code'],
            'status' => $row['status'],
            'ordered_at' => $row['ordered_at'],
            'summary' => [
                'total' => floatval($row['total'])
            ],
            'user' => [
                'name' => $row['user_name'],
                'email' => $row['user_email']
            ]
        ];
    }
    echo json_encode([
        'success' => true,
        'summary' => [
            'totalProducts' => intval($totalProducts),
            'totalOrders' => intval($totalOrders),
            'totalRevenue' => $totalRevenue,
            'avgRating' => 0
        ],
        'products' => $products,
        'orders' => $orders
    ]);
}

function uploadImage() {
    if (!isset($_FILES['image'])) {
        echo json_encode(['success' => false, 'message' => 'No file uploaded']);
        return;
    }
    $uploadDir = realpath(__DIR__ . '/../Images');
    if (!$uploadDir) {
        $created = mkdir(__DIR__ . '/../Images', 0755, true);
        if ($created) {
            $uploadDir = realpath(__DIR__ . '/../Images');
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to access Images directory']);
            return;
        }
    }
    $file = $_FILES['image'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Upload error code: ' . $file['error']]);
        return;
    }
    $originalName = basename($file['name']);
    $ext = pathinfo($originalName, PATHINFO_EXTENSION);
    $safeName = preg_replace('/[^a-zA-Z0-9-_\.]/', '_', pathinfo($originalName, PATHINFO_FILENAME));
    $unique = $safeName . '_' . time() . '_' . rand(1000,9999) . '.' . $ext;
    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $unique;
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        $urlPath = 'Images/' . $unique;
        echo json_encode(['success' => true, 'url' => $urlPath, 'message' => 'Uploaded successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file']);
    }
}

function testConnection() {
    $conn = dbConnect();
    echo json_encode([
        'success' => true,
        'message' => 'BuyPK API Connection Test',
        'status' => 'connected',
        'server' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
        'php_version' => PHP_VERSION,
        'timestamp' => date('Y-m-d H:i:s'),
        'database' => 'active'
    ]);
}
?>
