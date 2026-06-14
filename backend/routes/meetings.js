const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all meetings — admin sees all, members only see meetings they are invited to
router.get('/', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const role = req.session.user.role;

  let query, params;

  if (role === 'admin') {
    query = `
      SELECT m.id, m.title, m.date, m.time, m.location, m.description,
             m.participant_type, m.meeting_type, m.online_link, m.created_at,
             u.name AS created_by_name
      FROM meetings m
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.date ASC, m.time ASC`;
    params = [];
  } else {
    query = `
      SELECT m.id, m.title, m.date, m.time, m.location, m.description,
             m.participant_type, m.meeting_type, m.online_link, m.created_at
      FROM meetings m
      WHERE m.participant_type = 'all'
         OR EXISTS (
           SELECT 1 FROM meeting_participants mp
           WHERE mp.meeting_id = m.id AND mp.user_id = ?
         )
      ORDER BY m.date ASC, m.time ASC`;
    params = [userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Get meetings error:', err);
      return res.status(500).json({ error: 'Could not load meetings.' });
    }
    return res.status(200).json({ meetings: rows });
  });
});

// GET all reminders — members only see reminders for meetings they are invited to
router.get('/reminders', requireLogin, (req, res) => {
  const userId = req.session.user.id;
  const role = req.session.user.role;

  let query, params;

  if (role === 'admin') {
    query = `
      SELECT r.id, r.meeting_id, r.title, r.date, r.time, r.description, r.created_at,
             m.location, m.participant_type, m.meeting_type, m.online_link,
             (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id) AS participant_count
      FROM reminders r
      LEFT JOIN meetings m ON r.meeting_id = m.id
      ORDER BY r.date ASC, r.time ASC`;
    params = [];
  } else {
    query = `
      SELECT r.id, r.meeting_id, r.title, r.date, r.time, r.description, r.created_at,
             m.location, m.participant_type, m.meeting_type, m.online_link,
             (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id) AS participant_count
      FROM reminders r
      LEFT JOIN meetings m ON r.meeting_id = m.id
      WHERE m.participant_type = 'all'
         OR EXISTS (
           SELECT 1 FROM meeting_participants mp
           WHERE mp.meeting_id = r.meeting_id AND mp.user_id = ?
         )
      ORDER BY r.date ASC, r.time ASC`;
    params = [userId];
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Get reminders error:', err);
      return res.status(500).json({ error: 'Could not load reminders.' });
    }
    return res.status(200).json({ reminders: rows });
  });
});

// GET participants for a specific meeting — admin only
router.get('/:id/participants', requireLogin, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.all(
    `SELECT u.id, u.name, u.email, u.role
     FROM meeting_participants mp
     JOIN users u ON mp.user_id = u.id
     WHERE mp.meeting_id = ?
     ORDER BY u.name ASC`,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Get participants error:', err);
        return res.status(500).json({ error: 'Could not load participants.' });
      }
      return res.status(200).json({ participants: rows });
    }
  );
});

// POST create meeting — admin only; saves participants and auto-creates a reminder
router.post('/', requireLogin, requireAdmin, (req, res) => {
  const { title, date, time, location, description, participant_type, participant_ids, meeting_type, online_link } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }
  if (!time) {
    return res.status(400).json({ error: 'Time is required.' });
  }

  const cleanMeetingType = ['online', 'hybrid', 'physical'].includes(meeting_type) ? meeting_type : 'physical';
  const cleanOnlineLink = (online_link || '').trim();

  if (cleanMeetingType === 'online' && !cleanOnlineLink) {
    return res.status(400).json({ error: 'A meeting link is required for online meetings.' });
  }

  const createdBy = req.session.user.id;
  const cleanTitle = title.trim();
  const cleanLocation = (location || '').trim();
  const cleanDescription = (description || '').trim();

  const selectedIds = Array.isArray(participant_ids)
    ? participant_ids.map(Number).filter(n => !isNaN(n) && n > 0)
    : [];
  const partType = (participant_type === 'selected' && selectedIds.length > 0) ? 'selected' : 'all';

  db.run(
    `INSERT INTO meetings (title, date, time, location, description, participant_type, meeting_type, online_link, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cleanTitle, date, time, cleanLocation, cleanDescription, partType, cleanMeetingType, cleanOnlineLink || null, createdBy],
    function (err) {
      if (err) {
        console.error('Create meeting error:', err);
        return res.status(500).json({ error: 'Could not save meeting.' });
      }

      const meetingId = this.lastID;

      const insertParticipants = (callback) => {
        if (partType !== 'selected' || selectedIds.length === 0) {
          return callback(null);
        }
        const stmt = db.prepare(
          `INSERT OR IGNORE INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)`
        );
        selectedIds.forEach(uid => stmt.run([meetingId, uid]));
        stmt.finalize(callback);
      };

      insertParticipants((participantErr) => {
        if (participantErr) {
          console.error('Save participants error:', participantErr);
        }

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
      });
    }
  );
});

// DELETE meeting — admin only; also removes its participants and reminder
router.delete('/:id', requireLogin, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM meeting_participants WHERE meeting_id = ?', [id], (err) => {
    if (err) {
      console.error('Delete participants error:', err);
      return res.status(500).json({ error: 'Could not delete participants.' });
    }

    db.run('DELETE FROM reminders WHERE meeting_id = ?', [id], (err2) => {
      if (err2) {
        console.error('Delete reminder error:', err2);
        return res.status(500).json({ error: 'Could not delete reminder.' });
      }

      db.run('DELETE FROM meetings WHERE id = ?', [id], function (err3) {
        if (err3) {
          console.error('Delete meeting error:', err3);
          return res.status(500).json({ error: 'Could not delete meeting.' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Meeting not found.' });
        }

        return res.status(200).json({ message: 'Meeting and reminder deleted.' });
      });
    });
  });
});

module.exports = router;
