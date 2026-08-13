const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const baseConnectionString = process.env.PG_BASE_URL || 'postgresql://postgres@localhost:5434/postgres';
const targetDbName = process.env.DB_NAME || 'autocare_db';
const dbConnectionString = process.env.DATABASE_URL || `postgresql://postgres@localhost:5434/${targetDbName}`;

async function initDatabase() {
    console.log('Connecting to PostgreSQL server...');
    const baseClient = new Client({ connectionString: baseConnectionString });
    try {
        await baseClient.connect();
        const res = await baseClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDbName]);
        if (res.rowCount === 0) {
            console.log(`Creating database ${targetDbName}...`);
            await baseClient.query(`CREATE DATABASE "${targetDbName}"`);
        }
    } catch (err) {
        console.error('Error creating database:', err);
    } finally {
        await baseClient.end();
    }

    console.log(`Connecting to ${targetDbName}...`);
    const client = new Client({ connectionString: dbConnectionString });
    await client.connect();

    try {
        const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        console.log('Applying database schema...');
        await client.query(schemaSql);

        // Check if users already exist
        const usersCheck = await client.query('SELECT COUNT(*) FROM users');
        if (parseInt(usersCheck.rows[0].count, 10) === 0) {
            console.log('Seeding initial database records...');

            const hashedSuperPass = await bcrypt.hash('adminpass', 10);
            const hashedShopPass = await bcrypt.hash('shoppass', 10);
            const hashedUserPass = await bcrypt.hash('userpass', 10);

            // 1. Super Admin
            const superUserRes = await client.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
                 VALUES ($1, $2, $3, $4, $5, true, true) RETURNING id`,
                ['superadmin', 'admin@autofusion.com', hashedSuperPass, 'Super', 'Admin']
            );

            // 2. Shop 1 Provider (AutoFusion Main Hub)
            const shopUser1Res = await client.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
                 VALUES ($1, $2, $3, $4, $5, true, false) RETURNING id`,
                ['autocare_main', 'mainhub@autofusion.com', hashedShopPass, 'Alex', 'Rover']
            );

            const shop1Profile = await client.query(
                `INSERT INTO admin_profiles (user_id, full_name, shop_name, phone_number, city, shop_address)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser1Res.rows[0].id, 'Alex Rover', 'AutoFusion Main Hub', '9876543210', 'Ahmedabad', '125 Central Ave, SG Highway']
            );

            // 3. Shop 2 Provider (Elite Motors)
            const shopUser2Res = await client.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
                 VALUES ($1, $2, $3, $4, $5, true, false) RETURNING id`,
                ['elite_motors', 'info@elitemotors.com', hashedShopPass, 'David', 'Miller']
            );

            const shop2Profile = await client.query(
                `INSERT INTO admin_profiles (user_id, full_name, shop_name, phone_number, city, shop_address)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser2Res.rows[0].id, 'David Miller', 'Elite Motors & Towing', '9123456789', 'Ahmedabad', '45 Ring Road, Drive In']
            );

            // 4. Regular Client User
            const clientUserRes = await client.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
                 VALUES ($1, $2, $3, $4, $5, false, false) RETURNING id`,
                ['john_doe', 'john@example.com', hashedUserPass, 'John', 'Doe']
            );

            // Select Shop for John Doe
            await client.query(
                `INSERT INTO select_shops (user_id, select_shop_id) VALUES ($1, $2)`,
                [clientUserRes.rows[0].id, shop1Profile.rows[0].id]
            );

            // Services for Shop 1
            const service1 = await client.query(
                `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser1Res.rows[0].id, shop1Profile.rows[0].id, 'Full Engine Oil & Filter Change', 'Premium synthetic oil change with full 21-point safety inspection and fluid top-off.', 'fas fa-oil-can', 1499.00]
            );

            const service2 = await client.query(
                `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser1Res.rows[0].id, shop1Profile.rows[0].id, 'Brake Pad & Rotor Replacement', 'Complete front and rear brake pads check, cleaning, and rotor re-surfacing.', 'fas fa-compact-disc', 2999.00]
            );

            const service3 = await client.query(
                `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser1Res.rows[0].id, shop1Profile.rows[0].id, 'Wheel Alignment & Tire Balancing', 'Laser 4-wheel computerized alignment and high-speed tire balancing.', 'fas fa-dharmachakra', 999.00]
            );

            const service4 = await client.query(
                `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [shopUser1Res.rows[0].id, shop1Profile.rows[0].id, 'Car AC Servicing & Gas Refill', 'AC condenser cleaning, leak detection test, and eco-refrigerant refill.', 'fas fa-snowflake', 1850.00]
            );

            // Services for Shop 2
            await client.query(
                `INSERT INTO service_offerings (user_id, shop_id, title, description, icon_class, price_starts_at)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [shopUser2Res.rows[0].id, shop2Profile.rows[0].id, 'Heavy Towing & Flatbed Assistance', 'Flatbed truck towing for luxury, classic, and heavy vehicles with zero ground contact.', 'fas fa-truck-pickup', 2500.00]
            );

            // Blog Posts
            await client.query(
                `INSERT INTO blog_posts (user_id, title, slug, content, image_url, author)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    shopUser1Res.rows[0].id,
                    '5 Essential Summer Car Maintenance Tips',
                    '5-essential-summer-car-maintenance-tips',
                    'Summer heat can take a heavy toll on your car engine, battery, and tire pressure. Inspecting coolant levels and checking tire inflation regularly prevents unexpected highway breakdowns.',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
                    'AutoFusion Technical Team'
                ]
            );

            await client.query(
                `INSERT INTO blog_posts (user_id, title, slug, content, image_url, author)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    shopUser1Res.rows[0].id,
                    'When Should You Replace Your Vehicle Brakes?',
                    'when-should-you-replace-your-vehicle-brakes',
                    'Squealing noises, spongy pedal response, or steering wheel vibrations during deceleration are key warning signs that your brake pads need immediate inspection.',
                    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
                    'Senior Mechanic'
                ]
            );

            // Sample Booking for John Doe
            const sampleBooking = await client.query(
                `INSERT INTO service_bookings (user_id, shop_id, customer_name, customer_phone, customer_email, vehicle_info, preferred_date, preferred_time, additional_notes, status, otp, otp_verified, payment_method, is_paid)
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE + INTERVAL '1 day', '10:30:00', 'Regular maintenance requested', 'confirmed', '784920', false, 'cash', false) RETURNING id`,
                [clientUserRes.rows[0].id, shop1Profile.rows[0].id, 'John Doe', '9876543210', 'john@example.com', 'Honda City (2022) - Silver']
            );

            await client.query(
                `INSERT INTO service_booking_items (booking_id, service_id) VALUES ($1, $2), ($1, $3)`,
                [sampleBooking.rows[0].id, service1.rows[0].id, service3.rows[0].id]
            );

            // Sample Towing Request for John Doe
            await client.query(
                `INSERT INTO towing_requests (user_id, shop_id, full_name, phone_number, vehicle_details, pickup_address, latitude, longitude, status, otp, otp_verified)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)`,
                [clientUserRes.rows[0].id, shop1Profile.rows[0].id, 'John Doe', '9876543210', 'Honda City (2022) - Silver', 'SG Highway near Iscon Temple, Ahmedabad', 23.0225, 72.5714, 'processing', '439102']
            );

            console.log('Database initialization & seeding completed successfully!');
        } else {
            console.log('Database already initialized with records.');
        }

    } catch (err) {
        console.error('Error during schema/seed execution:', err);
    } finally {
        await client.end();
    }
}

initDatabase();
