// Script to reset user passwords in the database
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "user_service_db",
  user: "postgres",
  password: "postgres",
});

const RESET_PASSWORDS = [
  { email: "admin@ims.com", password: "admin123" },
  { email: "dilanshanuka999@gmail.com", password: "Dilan@789" },
  { email: "rasindu1995@gmail.com", password: "Password@123" },
  { email: "thisari@gmail.com", password: "Password@123" },
];

async function resetPasswords() {
  try {
    console.log("🔄 Resetting user passwords...\n");

    for (const user of RESET_PASSWORDS) {
      const password_hash = await bcrypt.hash(user.password, 10);

      const result = await pool.query(
        "UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING username, email",
        [password_hash, user.email]
      );

      if (result.rows.length > 0) {
        console.log(
          `✅ Reset password for: ${result.rows[0].username} (${result.rows[0].email})`
        );
        console.log(`   Password: ${user.password}\n`);
      } else {
        console.log(`⚠️  User not found: ${user.email}\n`);
      }
    }

    console.log("✅ All passwords reset successfully!");
    console.log("\n📋 Login Credentials:");
    console.log("=".repeat(60));
    RESET_PASSWORDS.forEach((u) => {
      console.log(`Email: ${u.email}`);
      console.log(`Password: ${u.password}`);
      console.log("-".repeat(60));
    });
  } catch (error) {
    console.error("❌ Error resetting passwords:", error);
  } finally {
    await pool.end();
  }
}

resetPasswords();
