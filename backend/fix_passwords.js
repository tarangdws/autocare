const db = require('./db');
const bcrypt = require('bcryptjs');

async function main() {
    const users = [
        {
            username: 'john_doe',
            email: 'john@example.com',
            password: 'userpass',
            first_name: 'John',
            last_name: 'Doe',
            is_staff: false,
            is_superuser: false,
        },
        {
            username: 'autocare_main',
            email: 'shop@autofusion.com',
            password: 'shoppass',
            first_name: 'AutoFusion',
            last_name: 'Main',
            is_staff: true,
            is_superuser: false,
        },
        {
            username: 'superadmin',
            email: 'admin@autofusion.com',
            password: 'adminpass',
            first_name: 'Super',
            last_name: 'Admin',
            is_staff: false,
            is_superuser: true,
        }
    ];

    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const existing = await db.query('SELECT id FROM users WHERE username = $1', [user.username]);
        if (existing.rows.length > 0) {
            await db.query(
                `UPDATE users 
                 SET password = $1, email = $2, is_staff = $3, is_superuser = $4, first_name = $5, last_name = $6
                 WHERE username = $7`,
                [hashedPassword, user.email, user.is_staff, user.is_superuser, user.first_name, user.last_name, user.username]
            );
            console.log(`Updated user: ${user.username}`);
        } else {
            await db.query(
                `INSERT INTO users (username, email, password, first_name, last_name, is_staff, is_superuser)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [user.username, user.email, hashedPassword, user.first_name, user.last_name, user.is_staff, user.is_superuser]
            );
            console.log(`Created user: ${user.username}`);
        }
    }

    console.log('Demo accounts setup successfully!');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
