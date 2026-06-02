const express  = require('express');
const Election = require('../models/election');
const router   = express.Router();

function requireLogin(req, res, next) {
  if (!req.session.user)
    return res.status(401).json({ error: 'Not logged in.' });
  next();
}

function requireAdmin(req, res, next) {
  if (req.session.user.role !== 'admin')
    return res.status(403).json({ error: 'Admin access required.' });
  next();
}

// S20 — Get all elections
router.get('/', requireLogin, async (req, res) => {
  try {
    const elections = await Election.getAll();
    res.json(elections);
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// S20 — Get single election with candidates
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const election   = await Election.getById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found.' });
    const candidates = await Election.getCandidates(req.params.id);
    res.json({ ...election, candidates });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// S20 — Create election
router.post('/', requireLogin, requireAdmin, async (req, res) => {
  const { title, description, startDate, endDate } = req.body;

  if (!title || !startDate || !endDate)
    return res.status(400).json({ error: 'Title, start date and end date are required.' });

  try {
    const election = await Election.create({ title, description, startDate, endDate });
    res.status(201).json({ message: 'Election created successfully.', id: election.id });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// S21 — Add candidate
router.post('/:id/candidates', requireLogin, requireAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name)
    return res.status(400).json({ error: 'Candidate name is required.' });

  try {
    const candidates = await Election.getCandidates(req.params.id);
    await Election.addCandidate(req.params.id, name);
    res.status(201).json({ message: 'Candidate added successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

// S21 — Remove candidate
router.delete('/:id/candidates/:candidateId', requireLogin, requireAdmin, async (req, res) => {
  try {
    await Election.removeCandidate(req.params.candidateId);
    res.json({ message: 'Candidate removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

module.exports = router;
// S22 — Open voting session
router.patch('/:id/open', requireLogin, requireAdmin, async (req, res) => {
  try {
    const election = await Election.getById(req.params.id);

    if (!election) {
      return res.status(404).json({ error: 'Election not found.' });
    }

    if (election.status !== 'Draft') {
      return res.status(400).json({
        error: 'Only draft elections can be opened.'
      });
    }

    const candidates = await Election.getCandidates(req.params.id);

    if (candidates.length < 2) {
      return res.status(400).json({
        error: 'Election must have at least 2 candidates before opening.'
      });
    }

    await Election.updateStatus(req.params.id, 'Open');

    res.json({
      message: 'Election opened successfully.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong.' });
  }
});