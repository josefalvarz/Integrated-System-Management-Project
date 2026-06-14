const express = require('express');
const db = require('../db');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET all notifications — any logged-in user can view announcements
router.get('/', requireLogin, (req, res) => {
  db.all(
    `SELECT n.id, n.title, n.message, n.target_group, n.created_at,
            u.name AS sender_name
     FROM notifications n
     LEFT JOIN users u ON n.created_by = u.id
     ORDER BY n.created_at DESC`,
    [],
    (err, rows) => {
      if (err) {
        console.error('Get notifications error:', err);
        return res.status(500).json({ error: 'Could not load notifications.' });
      }

      return res.status(200).json({ notifications: rows });
    }
  );
});

// POST create notification — admin only
router.post('/', requireLogin, requireAdmin, (req, res) => {
  const { title, message, target_group } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const group = (target_group || 'all').trim();
  const createdBy = req.session.user.id;

  db.run(
    `INSERT INTO notifications (title, message, target_group, created_by)
     VALUES (?, ?, ?, ?)`,
    [title.trim(), message.trim(), group, createdBy],
    function (err) {
      if (err) {
        console.error('Create notification error:', err);
        return res.status(500).json({ error: 'Could not save notification.' });
      }

      return res.status(201).json({
        message: 'Broadcast notification sent successfully.',
        id: this.lastID
      });
    }
  );
});

// DELETE notification — admin only
router.delete('/:id', requireLogin, requireAdmin, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM notifications WHERE id = ?',
    [id],
    function (err) {
      if (err) {
        console.error('Delete notification error:', err);
        return res.status(500).json({ error: 'Could not delete notification.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Notification not found.' });
      }

      return res.status(200).json({ message: 'Notification deleted successfully.' });
    }
  );
});

module.exports = router;
