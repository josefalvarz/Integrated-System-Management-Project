const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all meetings — any logged-in user
router.get('/', requireLogin, (req, res) => {
  db.all(
    `SELECT m.id, m.title, m.date, m.time, m.location, m.description, m.created_at,
            u.name AS created_by_name
     FROM meetings m
     LEFT JOIN users u ON m.created_by = u.id
     ORDER BY m.date ASC, m.time ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Get meetings error:', err);
        return res.status(500).json({ error: 'Could not load meetings.' });
      }
      return res.status(200).json({ meetings: rows });
    }
  );
});

// GET all reminders — any logged-in user
router.get('/reminders', requireLogin, (req, res) => {
  db.all(
    `SELECT r.id, r.meeting_id, r.title, r.date, r.time, r.description, r.created_at,
            m.location
     FROM reminders r
     LEFT JOIN meetings m ON r.meeting_id = m.id
     ORDER BY r.date ASC, r.time ASC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Get reminders error:', err);
        return res.status(500).json({ error: 'Could not load reminders.' });
      }
      return res.status(200).json({ reminders: rows });
    }
  );
});

// POST create meeting — admin only; auto-creates a reminder
router.post('/', requireLogin, requireAdmin, (req, res) => {
  const { title, date, time, location, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }
  if (!time) {
    return res.status(400).json({ error: 'Time is required.' });
  }

  const createdBy = req.session.user.id;
  const cleanTitle = title.trim();
  const cleanLocation = (location || '').trim();
  const cleanDescription = (description || '').trim();

  db.run(
    `INSERT INTO meetings (title, date, time, location, description, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cleanTitle, date, time, cleanLocation, cleanDescription, createdBy],
    function (err) {
      if (err) {
        console.error('Create meeting error:', err);
        return res.status(500).json({ error: 'Could not save meeting.' });
      }

      const meetingId = this.lastID;

      db.run(
        `INSERT INTO reminders (meeting_id, title, date, time, description)
         VALUES (?, ?, ?, ?, ?)`,
        [meetingId, cleanTitle, date, time, cleanDescription],
        function (reminderErr) {
          if (reminderErr) {
            console.error('Reminder creation error:', reminderErr);
          }
          return res.status(201).json({
            message: 'Meeting scheduled and reminder created.',
            id: meetingId
          });
        }
      );
    }
  );
});

// DELETE meeting — admin only; also removes its reminder
router.delete('/:id', requireLogin, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM reminders WHERE meeting_id = ?', [id], (err) => {
    if (err) {
      console.error('Delete reminder error:', err);
      return res.status(500).json({ error: 'Could not delete reminder.' });
    }

    db.run('DELETE FROM meetings WHERE id = ?', [id], function (err2) {
      if (err2) {
        console.error('Delete meeting error:', err2);
        return res.status(500).json({ error: 'Could not delete meeting.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Meeting not found.' });
      }

      return res.status(200).json({ message: 'Meeting and reminder deleted.' });
    });
  });
});

module.exports = router;
