const express = require('express');
const User    = require('../models/user');
const router  = express.Router();

// Auth check middleware
function requireLogin(req, res, next) {
    if (!req.session.user)
        return res.status(401).json({ error: 'Not logged in.' });
    next();
}

// S6 — View Profile
router.get('/', requireLogin, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        res.json({
            name:    user.name,
            email:   user.email,
            phone:   user.phone    || '',
            address: user.address  || '',
            role:    user.role,
        });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

module.exports = router;