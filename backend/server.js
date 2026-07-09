const express = require('express');
const session = require('express-session');
const path = require('path');

require('./db');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const dataMigrationRoutes = require('./routes/dataMigration');
const profileRoutes = require('./routes/profile');
const electionRoutes = require('./routes/election');
const notificationsRoutes = require('./routes/notifications');
const meetingsRoutes = require('./routes/meetings');

const app = express();
const PORT = 5500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: 'ims-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/data-migration', dataMigrationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/meetings', meetingsRoutes);

app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      error: 'Not logged in.'
    });
  }
  return res.status(200).json({
    user: req.session.user
  });
});

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/pages/dashboard.html');
  }
  res.redirect('/pages/register.html');
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});