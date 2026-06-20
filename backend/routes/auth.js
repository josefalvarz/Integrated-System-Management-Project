const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const PasswordReset = require('../models/passwordReset');

const router = express.Router();

// REGISTER USER
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const existing = await User.findByEmail(email);

  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'member'
    });

    return res.status(201).json({
      message: 'Account created. Please log in.'
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// LOGIN USER
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await User.findByEmail(email);

  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ error: 'Your account has been deactivated.' });
  }

  try {
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'member'
    };

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role || 'member'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// LOGOUT USER
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out.' });
    }

    res.clearCookie('connect.sid');

    return res.status(200).json({
      message: 'Logged out successfully.'
    });
  });
});

// CHECK CURRENT SESSION
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }

  return res.status(200).json({
    user: req.session.user
  });
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const user = await User.findByEmail(email);

    // Always respond with success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    await PasswordReset.create({ email, token, expiresAt });

    const resetLink = `/pages/reset-password.html?token=${token}`;

    // Simulate email delivery — in production this would be sent via nodemailer or similar
    console.log(`[PASSWORD RESET] Reset link for ${email}: http://localhost:5500${resetLink}`);

    return res.status(200).json({
      message: 'If that email is registered, a reset link has been sent.',
      resetLink // returned for simulation purposes only
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    const resetRecord = await PasswordReset.findByToken(token);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset link.' });
    }

    if (new Date() > new Date(resetRecord.expires_at)) {
      await PasswordReset.deleteByToken(token);
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });
    }

    const user = await User.findByEmail(resetRecord.email);
    if (!user) {
      return res.status(400).json({ error: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updatePassword(resetRecord.email, hashedPassword);
    await PasswordReset.deleteByToken(token);

    return res.status(200).json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;