const express = require('express');
const User = require('../models/user');
const { requireLogin, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

const allowedRoles = ['member', 'admin'];

// GET ALL USERS
// Only admins can view the member management list.
router.get('/', requireLogin, requireAdmin, async (req, res) => {
  try {
    const users = await User.getAllWithImported();

    return res.status(200).json({
      users
    });
  } catch (err) {
    console.error('Get users error:', err);

    return res.status(500).json({
      error: 'Could not load users.'
    });
  }
});

// UPDATE IMPORTED MEMBER ROLE
router.patch('/imported/:id/role', requireLogin, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Role must be either member or admin.' });
  }

  try {
    const result = await User.setImportedRole(id, role);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Imported member not found.' });
    }

    return res.status(200).json({ message: `Role updated to ${role}.` });
  } catch (err) {
    console.error('Update imported role error:', err);
    return res.status(500).json({ error: 'Could not update role.' });
  }
});

// UPDATE USER ROLE
// Only admins can change user roles.
router.patch('/:id/role', requireLogin, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Role must be either member or admin.'
    });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

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

    return res.status(500).json({
      error: 'Could not update role.'
    });
  }
});

// UPDATE IMPORTED MEMBER ACTIVE STATUS
router.patch('/imported/:id/status', requireLogin, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { is_active } = req.body;

  if (is_active !== 0 && is_active !== 1) {
    return res.status(400).json({ error: 'Invalid status. Use 1 for active or 0 for deactivated.' });
  }

  try {
    const result = await User.setImportedActive(id, is_active);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Imported member not found.' });
    }

    return res.status(200).json({
      message: is_active === 1 ? 'Member activated.' : 'Member deactivated.'
    });
  } catch (err) {
    console.error('Update imported status error:', err);
    return res.status(500).json({ error: 'Could not update status.' });
  }
});

// UPDATE USER ACTIVE STATUS
// This supports the activate/deactivate button shown in your prototype.
router.patch('/:id/status', requireLogin, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active !== 0 && is_active !== 1) {
    return res.status(400).json({
      error: 'Invalid status. Use 1 for active or 0 for deactivated.'
    });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found.'
      });
    }

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

    return res.status(500).json({
      error: 'Could not update user status.'
    });
  }
});

// DELETE IMPORTED MEMBER — must be defined before /:id to avoid route collision
router.delete('/imported/:id', requireLogin, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  try {
    const result = await User.deleteImported(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Imported member not found.' });
    }

    return res.status(200).json({ message: 'Imported member deleted.' });
  } catch (err) {
    console.error('Delete imported member error:', err);
    return res.status(500).json({ error: 'Could not delete imported member.' });
  }
});

// DELETE REGISTERED USER
router.delete('/:id', requireLogin, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (id === Number(req.session.user.id)) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await User.delete(id);

    return res.status(200).json({ message: 'User deleted.' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Could not delete user.' });
  }
});

module.exports = router;