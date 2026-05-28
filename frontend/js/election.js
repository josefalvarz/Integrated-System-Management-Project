let currentUser  = null;
let currentElectionId = null;

// Load user and elections on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch('/api/profile');
        if (!res.ok) return window.location.href = '/pages/login.html';
        currentUser = await res.json();

        // Show create form for admin only
        if (currentUser.role === 'admin') {
            document.getElementById('createSection').style.display = 'block';
            document.getElementById('addCandidateSection').style.display = 'block';
        }

        loadElections();
    } catch {
        window.location.href = '/pages/login.html';
    }
});

// S20 — Load all elections
async function loadElections() {
    try {
        const res       = await fetch('/api/elections');
        const elections = await res.json();
        const list      = document.getElementById('electionList');

        if (elections.length === 0) {
            list.innerHTML = '<p>No elections found.</p>';
            return;
        }

        list.innerHTML = elections.map(e => `
            <div class="info-row" style="cursor:pointer" onclick="viewElection(${e.id})">
                <span class="info-label">${e.title}</span>
                <span class="info-value">${e.status} | ${e.start_date} → ${e.end_date}</span>
            </div>
        `).join('');
    } catch {
        document.getElementById('electionList').innerHTML = '<p>Error loading elections.</p>';
    }
}

// S20 — Create election
document.getElementById('createElectionBtn').addEventListener('click', async () => {
    const title       = document.getElementById('electionTitle').value.trim();
    const description = document.getElementById('electionDesc').value.trim();
    const startDate   = document.getElementById('electionStart').value;
    const endDate     = document.getElementById('electionEnd').value;
    const msg         = document.getElementById('createMessage');

    if (!title || !startDate || !endDate)
        return showMessage(msg, 'Title, start date and end date are required.', 'error');

    if (endDate <= startDate)
        return showMessage(msg, 'End date must be after start date.', 'error');

    try {
        const res  = await fetch('/api/elections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, startDate, endDate })
        });
        const data = await res.json();

        if (res.ok) {
            showMessage(msg, data.message, 'success');
            document.getElementById('electionTitle').value = '';
            document.getElementById('electionDesc').value  = '';
            document.getElementById('electionStart').value = '';
            document.getElementById('electionEnd').value   = '';
            loadElections();
        } else {
            showMessage(msg, data.error, 'error');
        }
    } catch {
        showMessage(msg, 'Server error. Please try again.', 'error');
    }
});

// S21 — View election detail with candidates
async function viewElection(id) {
    currentElectionId = id;
    try {
        const res      = await fetch(`/api/elections/${id}`);
        const election = await res.json();

        document.getElementById('detailTitle').textContent  = election.title;
        document.getElementById('detailDesc').textContent   = election.description || 'No description';
        document.getElementById('detailDates').textContent  = `${election.start_date} → ${election.end_date}`;
        document.getElementById('detailStatus').textContent = `Status: ${election.status}`;

        loadCandidates(election.candidates);

        document.getElementById('electionList').parentElement.style.display = 'none';
        document.getElementById('detailSection').style.display = 'block';
    } catch {
        alert('Error loading election details.');
    }
}

// S21 — Load candidates
function loadCandidates(candidates) {
    const list = document.getElementById('candidateList');

    if (!candidates || candidates.length === 0) {
        list.innerHTML = '<p>No candidates yet. Add at least 2 candidates before opening the election.</p>';
        return;
    }

    const warning = candidates.length < 2
        ? '<p style="color:orange">⚠️ Add at least 2 candidates before opening the election.</p>'
        : '';

    list.innerHTML = warning + candidates.map(c => `
        <div class="info-row">
            <span class="info-value">• ${c.name}</span>
            ${currentUser.role === 'admin' ?
                `<button onclick="removeCandidate(${c.id})" style="color:red">Remove</button>` : ''}
        </div>
    `).join('');
}

// S21 — Add candidate
document.getElementById('addCandidateBtn').addEventListener('click', async () => {
    const name = document.getElementById('candidateName').value.trim();
    const msg  = document.getElementById('candidateMessage');

    if (!name)
        return showMessage(msg, 'Candidate name is required.', 'error');

    try {
        const res  = await fetch(`/api/elections/${currentElectionId}/candidates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('candidateName').value = '';
            if (data.warning) {
                showMessage(msg, data.message + ' ⚠️ ' + data.warning, 'error');
            } else {
                showMessage(msg, data.message, 'success');
            }
            viewElection(currentElectionId);
        } else {
            showMessage(msg, data.error, 'error');
        }
    } catch {
        showMessage(msg, 'Server error. Please try again.', 'error');
    }
});

// S21 — Remove candidate
async function removeCandidate(candidateId) {
    try {
        const res  = await fetch(`/api/elections/${currentElectionId}/candidates/${candidateId}`, {
            method: 'DELETE'
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error);
            return;
        }
        viewElection(currentElectionId);
    } catch {
        alert('Error removing candidate.');
    }
}

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
    document.getElementById('detailSection').style.display = 'none';
    document.getElementById('electionList').parentElement.style.display = 'block';
    currentElectionId = null;
});

function showMessage(el, text, type) {
    el.textContent = text;
    el.style.color = type === 'error' ? 'red' : 'green';
}