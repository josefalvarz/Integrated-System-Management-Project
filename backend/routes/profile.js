const express = require('express');
const User    = require('../models/user');
const router  = express.Router();

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
            phone:   user.phone   || '',
            address: user.address || '',
            role:    user.role,
        });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// S7 — Edit Profile
router.put('/', requireLogin, async (req, res) => {
    const { name, phone, address } = req.body;

    if (!name)
        return res.status(400).json({ error: 'Name is required.' });

    try {
        await User.updateProfile(req.session.user.id, { name, phone, address });
        req.session.user.name = name;
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

module.exports = router;