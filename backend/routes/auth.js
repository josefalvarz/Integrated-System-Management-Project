const express = require('express');
const bcrypt  = require('bcrypt');
const User    = require('../models/user');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: 'All fields are required.' });

  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const existing = await User.findByEmail(email);
  if (existing)
    return res.status(409).json({ error: 'An account with that email already exists.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, email, password: hashedPassword });
    return res.status(201).json({ message: 'Account created! Please log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  const user = await User.findByEmail(email);
  if (!user)
    return res.status(401).json({ error: 'Incorrect email or password.' });

  if (!user.is_active)
    return res.status(403).json({ error: 'Your account has been deactivated.' });

  try {
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Incorrect email or password.' });

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return res.status(200).json({ message: 'Login successful.', role: user.role });
  } catch (err) {
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Could not log out.' });
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logged out successfully.' });
  });
});

module.exports = router;