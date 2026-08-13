-- AutoFusion PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) DEFAULT '',
    last_name VARCHAR(100) DEFAULT '',
    is_staff BOOLEAN DEFAULT FALSE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(100) DEFAULT '',
    shop_name VARCHAR(200) NOT NULL,
    phone_number VARCHAR(20) DEFAULT '',
    city VARCHAR(100) DEFAULT '',
    shop_address TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS select_shops (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    select_shop_id INTEGER REFERENCES admin_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_offerings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES admin_profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon_class VARCHAR(100) DEFAULT 'fas fa-wrench',
    price_starts_at NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    author VARCHAR(100) DEFAULT 'Admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES admin_profiles(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS towing_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES admin_profiles(id) ON DELETE SET NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    vehicle_details VARCHAR(200) NOT NULL,
    pickup_address TEXT NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    status VARCHAR(20) DEFAULT 'pending',
    otp VARCHAR(10) DEFAULT '',
    otp_verified BOOLEAN DEFAULT FALSE,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_bookings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    shop_id INTEGER REFERENCES admin_profiles(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    vehicle_info VARCHAR(200) NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    additional_notes TEXT DEFAULT '',
    status VARCHAR(20) DEFAULT 'pending',
    otp VARCHAR(10) DEFAULT '',
    otp_verified BOOLEAN DEFAULT FALSE,
    payment_method VARCHAR(20) DEFAULT 'cash',
    is_paid BOOLEAN DEFAULT FALSE,
    stripe_payment_intent_id VARCHAR(200) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_booking_items (
    booking_id INTEGER REFERENCES service_bookings(id) ON DELETE CASCADE,
    service_id INTEGER REFERENCES service_offerings(id) ON DELETE CASCADE,
    PRIMARY KEY (booking_id, service_id)
);
