const db = require('../db');

const User = {
  findByEmail(email) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  findById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  create({ name, email, password, role = 'member' }) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, password, role],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getAll() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, email, role, is_active, created_at,
                phone, gender, qualification, degree_date, cnic,
                province, university, department, designation
         FROM users ORDER BY id ASC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  updateProfile(id, { name, phone, address, gender, qualification, degree_date, cnic, province, university, department, designation }) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET
           name = ?, phone = ?, address = ?,
           gender = ?, qualification = ?, degree_date = ?, cnic = ?,
           province = ?, university = ?, department = ?, designation = ?
         WHERE id = ?`,
        [name, phone, address, gender, qualification, degree_date, cnic, province, university, department, designation, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  setRole(id, role) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  setActive(id, isActive) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [isActive, id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  updatePassword(email, hashedPassword) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, email],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
};

module.exports = User;