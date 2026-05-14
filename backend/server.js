const express = require('express');
const session = require('express-session');
const path    = require('path');

require('./db');

const authRoutes = require('./routes/auth');
const app  = express();
const PORT = 5500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'ims-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/auth', authRoutes);

app.get('/me', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in.' });
  return res.json({ user: req.session.user });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));