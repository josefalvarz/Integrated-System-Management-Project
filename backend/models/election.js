const db = require('../db');

const Election = {
  create({ title, description, startDate, endDate }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO elections (title, description, start_date, end_date, status)
         VALUES (?, ?, ?, ?, 'Draft')`,
        [title, description, startDate, endDate],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getAll() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM elections ORDER BY created_at DESC', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },

  getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM elections WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  addCandidate(electionId, name) {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO candidates (election_id, name) VALUES (?, ?)',
        [electionId, name],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  },

  getCandidates(electionId) {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM candidates WHERE election_id = ?',
        [electionId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  removeCandidate(candidateId) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM candidates WHERE id = ?', [candidateId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  },
  updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE elections SET status = ? WHERE id = ?',
        [status, id],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
};

module.exports = Election;