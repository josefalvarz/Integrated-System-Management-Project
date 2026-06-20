const db = require('../db');

const PasswordReset = {
  create({ email, token, expiresAt }) {
    return new Promise((resolve, reject) => {
      // Remove any existing tokens for this email before creating a new one
      db.run('DELETE FROM password_resets WHERE email = ?', [email], (err) => {
        if (err) return reject(err);
        db.run(
          'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
          [email, token, expiresAt],
          function (err2) {
            if (err2) reject(err2);
            else resolve({ id: this.lastID });
          }
        );
      });
    });
  },

  findByToken(token) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM password_resets WHERE token = ?',
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  deleteByToken(token) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM password_resets WHERE token = ?',
        [token],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
};

module.exports = PasswordReset;
