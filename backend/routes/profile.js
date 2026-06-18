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
            name:          user.name,
            email:         user.email,
            phone:         user.phone         || '',
            address:       user.address       || '',
            role:          user.role,
            gender:        user.gender        || '',
            qualification: user.qualification || '',
            degree_date:   user.degree_date   || '',
            cnic:          user.cnic          || '',
            province:      user.province      || '',
            university:    user.university    || '',
            department:    user.department    || '',
            designation:   user.designation   || '',
        });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

// S7 — Edit Profile
router.put('/', requireLogin, async (req, res) => {
    const { name, phone, address, gender, qualification, degree_date, cnic, province, university, department, designation } = req.body;

    if (!name)
        return res.status(400).json({ error: 'Name is required.' });

    try {
        await User.updateProfile(req.session.user.id, { name, phone, address, gender, qualification, degree_date, cnic, province, university, department, designation });
        req.session.user.name = name;
        res.json({ message: 'Profile updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

module.exports = router;