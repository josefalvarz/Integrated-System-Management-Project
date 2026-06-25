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

// S23 — Cast Vote
db.run(`
  CREATE TABLE IF NOT EXISTS votes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id  INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(election_id, user_id),
    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// S35 — Broadcast Notifications
db.run(`
  CREATE TABLE IF NOT EXISTS notifications (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    title        TEXT    NOT NULL,
    message      TEXT    NOT NULL,
    target_group TEXT    NOT NULL DEFAULT 'all',
    created_by   INTEGER NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

// S36 — Send Event Reminders
db.run(`
  CREATE TABLE IF NOT EXISTS meetings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT    NOT NULL,
    location    TEXT,
    description TEXT,
    created_by  INTEGER NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reminders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id  INTEGER NOT NULL,
    title       TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT    NOT NULL,
    description TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
  )
`);

// S37 — Select Meeting Participants
// Add participant_type to meetings if the column does not exist yet
db.all("PRAGMA table_info(meetings)", (err, columns) => {
  if (err) return;
  const hasParticipantType = columns.some(c => c.name === 'participant_type');
  if (!hasParticipantType) {
    db.run("ALTER TABLE meetings ADD COLUMN participant_type TEXT NOT NULL DEFAULT 'all'");
  }
});

// S38 — Add Online Meeting Links
// Add meeting_type and online_link to meetings if they do not exist yet
db.all("PRAGMA table_info(meetings)", (err, columns) => {
  if (err) return;
  const hasMeetingType = columns.some(c => c.name === 'meeting_type');
  if (!hasMeetingType) {
    db.run("ALTER TABLE meetings ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'physical'");
  }
  const hasOnlineLink = columns.some(c => c.name === 'online_link');
  if (!hasOnlineLink) {
    db.run("ALTER TABLE meetings ADD COLUMN online_link TEXT");
  }
});

// S41/S42 — Edit Meeting Details / Cancel Meetings
// Add status column to meetings if it does not exist yet
db.all("PRAGMA table_info(meetings)", (err, columns) => {
  if (err) return;
  const hasStatus = columns.some(c => c.name === 'status');
  if (!hasStatus) {
    db.run("ALTER TABLE meetings ADD COLUMN status TEXT NOT NULL DEFAULT 'Scheduled'");
  }
});

// S40 — Record Meeting Minutes
// Add minutes columns to meetings if they do not exist yet
db.all("PRAGMA table_info(meetings)", (err, columns) => {
  if (err) return;
  const minutesColumns = [
    'minutes_summary',
    'minutes_decisions',
    'minutes_action_items',
    'minutes_author',
    'minutes_date'
  ];
  minutesColumns.forEach(columnName => {
    const hasColumn = columns.some(c => c.name === columnName);
    if (!hasColumn) {
      db.run(`ALTER TABLE meetings ADD COLUMN ${columnName} TEXT`);
    }
  });
});

// Join table: which users are invited to a specific meeting
db.run(`
  CREATE TABLE IF NOT EXISTS meeting_participants (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    meeting_id INTEGER NOT NULL,
    user_id    INTEGER NOT NULL,
    UNIQUE(meeting_id, user_id),
    FOREIGN KEY (meeting_id) REFERENCES meetings(id),
    FOREIGN KEY (user_id)    REFERENCES users(id)
  )
`);

// S43 — Member Attributes Fields
db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) return;
  const newCols = [
    { name: 'gender',        def: 'TEXT' },
    { name: 'qualification', def: 'TEXT' },
    { name: 'degree_date',   def: 'TEXT' },
    { name: 'cnic',          def: 'TEXT' },
    { name: 'province',      def: 'TEXT' },
    { name: 'university',    def: 'TEXT' },
    { name: 'department',    def: 'TEXT' },
    { name: 'designation',   def: 'TEXT' },
  ];
  newCols.forEach(({ name, def }) => {
    if (!columns.some(c => c.name === name)) {
      db.run(`ALTER TABLE users ADD COLUMN ${name} ${def}`, err2 => {
        if (err2) console.error(`Error adding ${name} column:`, err2.message);
        else console.log(`✅ ${name} column added to users table`);
      });
    }
  });
});

// S48 — Show imported members in member list
db.run(`
  CREATE TABLE IF NOT EXISTS imported_members (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    phone       TEXT,
    joined      TEXT,
    imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// S48 — Add is_active and role to imported_members
db.all("PRAGMA table_info(imported_members)", (err, columns) => {
  if (err) return;
  if (!columns.some(c => c.name === 'is_active')) {
    db.run("ALTER TABLE imported_members ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1", err2 => {
      if (err2) console.error("Error adding is_active to imported_members:", err2.message);
      else console.log("✅ is_active column added to imported_members table");
    });
  }
  if (!columns.some(c => c.name === 'role')) {
    db.run("ALTER TABLE imported_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member'", err2 => {
      if (err2) console.error("Error adding role to imported_members:", err2.message);
      else console.log("✅ role column added to imported_members table");
    });
  }
});

// S47 — Password Recovery
db.run(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    token      TEXT    NOT NULL UNIQUE,
    expires_at TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

module.exports = db;