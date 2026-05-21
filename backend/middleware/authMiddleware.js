const User = require('../models/user');

function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'You must be logged in to access this page.'
    });
  }

  next();
}

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      error: 'You must be logged in to access this page.'
    });
  }

  try {
    const currentUser = await User.findById(req.session.user.id);

    if (!currentUser) {
      req.session.destroy(() => {});

      return res.status(401).json({
        error: 'Session expired. Please log in again.'
      });
    }

    if (!currentUser.is_active) {
      req.session.destroy(() => {});

      return res.status(403).json({
        error: 'Your account has been deactivated.'
      });
    }

    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Admin access required.'
      });
    }

    req.session.user.role = currentUser.role;

    next();
  } catch (err) {
    console.error('Admin middleware error:', err);

    return res.status(500).json({
      error: 'Could not verify permissions.'
    });
  }
}

module.exports = {
  requireLogin,
  requireAdmin
};