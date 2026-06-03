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
  },
  getOpenOnly() {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT * FROM elections WHERE status = 'Open' ORDER BY created_at DESC",
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  closeExpiredElections() {
    return new Promise((resolve, reject) => {
      const today = new Date().toISOString().split("T")[0];

      db.run(
        "UPDATE elections SET status = 'Closed' WHERE end_date < ? AND status != 'Closed'",
        [today],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },
hasUserVoted(electionId, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM votes WHERE election_id = ? AND user_id = ?",
      [electionId, userId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
},

castVote(electionId, candidateId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO votes (election_id, candidate_id, user_id) VALUES (?, ?, ?)",
      [electionId, candidateId, userId],
      function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
},

  deleteElection(id) {
  return new Promise((resolve, reject) => {
    db.run("DELETE FROM votes WHERE election_id = ?", [id], (voteErr) => {
      if (voteErr) return reject(voteErr);

      db.run("DELETE FROM candidates WHERE election_id = ?", [id], (candidateErr) => {
        if (candidateErr) return reject(candidateErr);

        db.run("DELETE FROM elections WHERE id = ?", [id], function (electionErr) {
          if (electionErr) return reject(electionErr);

          resolve({ changes: this.changes });
        });
      });
    });
  });
}
};

module.exports = Election;