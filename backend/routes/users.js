const express = require('express');
const User = require('../models/user');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const allowedRoles = ['member', 'admin'];

// S30 — Get user activity based on WhatsApp message count
router.get('/activity', async (req, res) => {
  const db = require('../db');

  db.all(`
    SELECT
      sender                  AS name,
      COUNT(*)                AS message_count
    FROM messages
    GROUP BY sender
    ORDER BY message_count DESC
  `, [], (err, rows) => {
    if (err) {
      console.error('Activity query error:', err);
      return res.status(500).json({ error: 'Could not load activity data.' });
    }

    if (!rows || rows.length === 0) {
      return res.status(200).json({
        mostActive:  [],
        leastActive: [],
        all:         [],
        isEmpty:     true
      });
    }

    const mostActive  = rows.slice(0, 5);
    const leastActive = [...rows].reverse().slice(0, 5).reverse();

    return res.status(200).json({
      mostActive,
      leastActive,
      all:     rows,
      isEmpty: false
    });
  });
});

// GET ALL USERS
router.get('/', requireLogin, requireAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    return res.status(200).json({ users });
  } catch (err) {
    console.error('Get users error:', err);
    return res.status(500).json({ error: 'Could not load users.' });
  }
});

// UPDATE USER ROLE
router.patch('/:id/role', requireLogin, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Role must be either member or admin.' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await User.setRole(id, role);
    const updatedUser = await User.findById(id);

    if (Number(req.session.user.id) === Number(id)) {
      req.session.user.role = role;
    }

    return res.status(200).json({
      message: `Role updated to ${role}.`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      }
    });
  } catch (err) {
    console.error('Update role error:', err);
    return res.status(500).json({ error: 'Could not update role.' });
  }
});

// UPDATE USER ACTIVE STATUS
router.patch('/:id/status', requireLogin, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active !== 0 && is_active !== 1) {
    return res.status(400).json({ error: 'Invalid status. Use 1 for active or 0 for deactivated.' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await User.setActive(id, is_active);
    const updatedUser = await User.findById(id);

    return res.status(200).json({
      message: is_active === 1 ? 'User activated.' : 'User deactivated.',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        is_active: updatedUser.is_active
      }
    });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Could not update user status.' });
  }
});

module.exports = router;