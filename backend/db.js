const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "database", "app.db");

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Database error:", err.message);
  } else {
    console.log("✅ Database ready");
  }
});

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    phone       TEXT,
    address     TEXT,
    role        TEXT    NOT NULL DEFAULT 'member',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// S8 — Role-Based Access
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error("Error checking users table:", err.message);
    return;
  }

  const hasRoleColumn = columns.some((column) => column.name === "role");

  if (!hasRoleColumn) {
    db.run(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'",
      (alterErr) => {
        if (alterErr) {
          console.error("Error adding role column:", alterErr.message);
        } else {
          console.log("✅ Role column added to users table");
        }
      }
    );
  }
});

// S10 — List & Deactivate
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error("Error checking users table:", err.message);
    return;
  }

  const hasIsActiveColumn = columns.some((column) => column.name === "is_active");

  if (!hasIsActiveColumn) {
    db.run(
      "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1",
      (alterErr) => {
        if (alterErr) {
          console.error("Error adding is_active column:", alterErr.message);
        } else {
          console.log("✅ is_active column added to users table");
        }
      }
    );
  }
});

// S20 — Create Election Ballot
db.run(`
  CREATE TABLE IF NOT EXISTS elections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT,
    start_date  TEXT    NOT NULL,
    end_date    TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'Draft',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// S21 — Add Candidates
db.run(`
  CREATE TABLE IF NOT EXISTS candidates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id INTEGER NOT NULL,
    name        TEXT    NOT NULL,
    FOREIGN KEY (election_id) REFERENCES elections(id)
  )
`);

module.exports = db;