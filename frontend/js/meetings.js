const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

const isAdmin = loggedInUser &&
  (loggedInUser.role === 'admin' || loggedInUser.role === 'administrator');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const meetingForm = document.getElementById('meetingForm');
const upcomingList = document.getElementById('upcomingList');
const expiredList = document.getElementById('expiredList');
const meetingsStatusMsg = document.getElementById('meetingsStatusMsg');

// S37 — participant UI elements
const participantAllRadio = document.getElementById('participantAll');
const participantSelectedRadio = document.getElementById('participantSelected');
const participantChecklist = document.getElementById('participantChecklist');
const checklistStatus = document.getElementById('checklistStatus');
const checklistItems = document.getElementById('checklistItems');

if (loggedInUser) {
  const name = loggedInUser.name || loggedInUser.email || 'User';

  if (userName) userName.textContent = name;
  if (userRole) userRole.textContent = loggedInUser.role === 'admin' ? 'Administrator' : 'Member';

  if (userInitials) {
    userInitials.textContent = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}

// Admins get the participant checklist loaded and the toggle wired up
if (isAdmin) {
  loadMembersForChecklist();
  setupParticipantToggle();
}

loadReminders();

// ─── Participant toggle ────────────────────────────────────────────────────────

function setupParticipantToggle() {
  if (!participantAllRadio || !participantSelectedRadio || !participantChecklist) return;

  participantAllRadio.addEventListener('change', () => {
    participantChecklist.style.display = 'none';
  });

  participantSelectedRadio.addEventListener('change', () => {
    participantChecklist.style.display = 'block';
  });
}

// Fetch all users and populate the checklist
async function loadMembersForChecklist() {
  if (!checklistItems) return;

  try {
    const response = await fetch('/api/users');
    const data = await response.json();

    if (!response.ok || !data.users) {
      if (checklistStatus) checklistStatus.textContent = 'Could not load members.';
      return;
    }

    const members = data.users;

    if (members.length === 0) {
      if (checklistStatus) checklistStatus.textContent = 'No members found.';
      return;
    }

    if (checklistStatus) checklistStatus.style.display = 'none';

    checklistItems.innerHTML = '';
    members.forEach(member => {
      const label = document.createElement('label');
      label.className = 'meetings-checklist-item';
      label.innerHTML = `
        <input type="checkbox" class="participant-checkbox" value="${member.id}" />
        <span class="meetings-checklist-item-name">${escapeHtml(member.name)}</span>
        <span class="meetings-checklist-item-role">${escapeHtml(member.role)}</span>
      `;
      checklistItems.appendChild(label);
    });
  } catch (error) {
    console.error('Load members error:', error);
    if (checklistStatus) checklistStatus.textContent = 'Could not load members.';
  }
}

// ─── Meeting form submission ───────────────────────────────────────────────────

if (meetingForm) {
  meetingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = document.getElementById('meetingTitle').value.trim();
    const date = document.getElementById('meetingDate').value;
    const time = document.getElementById('meetingTime').value;
    const location = document.getElementById('meetingLocation').value.trim();
    const description = document.getElementById('meetingDescription').value.trim();

    if (!title) {
      showStatusMessage('Please enter a meeting title.', 'error');
      return;
    }
    if (!date) {
      showStatusMessage('Please select a date.', 'error');
      return;
    }
    if (!time) {
      showStatusMessage('Please select a time.', 'error');
      return;
    }

    // Collect participant data
    const participantTypeEl = document.querySelector('input[name="participantType"]:checked');
    const participant_type = participantTypeEl ? participantTypeEl.value : 'all';

    let participant_ids = [];
    if (participant_type === 'selected') {
      const checked = document.querySelectorAll('.participant-checkbox:checked');
      participant_ids = Array.from(checked).map(cb => parseInt(cb.value));

      if (participant_ids.length === 0) {
        showStatusMessage('Please select at least one member, or choose "All Members".', 'error');
        return;
      }
    }

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, location, description, participant_type, participant_ids })
      });

      const data = await response.json();

      if (!response.ok) {
        showStatusMessage(data.error || 'Could not schedule meeting.', 'error');
        return;
      }

      meetingForm.reset();

      // Reset participant section back to "All Members"
      if (participantAllRadio) participantAllRadio.checked = true;
      if (participantChecklist) participantChecklist.style.display = 'none';
      if (checklistItems) {
        checklistItems.querySelectorAll('.participant-checkbox').forEach(cb => {
          cb.checked = false;
        });
      }

      showStatusMessage('Meeting scheduled and reminder created!', 'success');
      loadReminders();
    } catch (error) {
      console.error('Schedule meeting error:', error);
      showStatusMessage('Unable to schedule meeting. Please try again.', 'error');
    }
  });
}

// ─── Load & render reminders ──────────────────────────────────────────────────

async function loadReminders() {
  if (!upcomingList || !expiredList) return;

  try {
    const response = await fetch('/api/meetings/reminders');
    const data = await response.json();

    if (!response.ok) {
      upcomingList.innerHTML = '<p class="meetings-empty">Could not load reminders.</p>';
      expiredList.innerHTML = '<p class="meetings-empty">Could not load reminders.</p>';
      return;
    }

    const reminders = data.reminders || [];
    const now = new Date();

    const upcoming = reminders.filter(r => reminderDateTime(r) >= now);
    const expired = reminders.filter(r => reminderDateTime(r) < now);

    renderReminderList(upcomingList, upcoming, false);
    renderReminderList(expiredList, expired, true);
  } catch (error) {
    console.error('Load reminders error:', error);
    upcomingList.innerHTML = '<p class="meetings-empty">Could not load reminders.</p>';
    expiredList.innerHTML = '<p class="meetings-empty">Could not load reminders.</p>';
  }
}

function reminderDateTime(reminder) {
  return new Date(`${reminder.date}T${reminder.time}`);
}

function renderReminderList(container, reminders, isExpired) {
  if (!container) return;

  if (!reminders || reminders.length === 0) {
    const label = isExpired ? 'No past reminders.' : 'No upcoming reminders.';
    container.innerHTML = `<p class="meetings-empty">${label}</p>`;
    return;
  }

  container.innerHTML = '';

  reminders.forEach(reminder => {
    const item = document.createElement('div');
    item.className = isExpired
      ? 'meetings-reminder-item meetings-reminder-expired'
      : 'meetings-reminder-item meetings-reminder-upcoming';

    const dt = reminderDateTime(reminder);
    const formattedDate = dt.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = dt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const locationHtml = reminder.location
      ? `<span class="meetings-reminder-location">${escapeHtml(reminder.location)}</span>`
      : '';

    const statusBadge = isExpired
      ? '<span class="meetings-badge meetings-badge-expired">Expired</span>'
      : '<span class="meetings-badge meetings-badge-upcoming">Upcoming</span>';

    const deleteBtn = isAdmin
      ? `<button class="notif-delete-btn" onclick="deleteMeeting(${reminder.meeting_id})">Delete</button>`
      : '';

    // S37 — participant info shown to admin in each card
    let participantHtml = '';
    if (isAdmin && reminder.participant_type) {
      if (reminder.participant_type === 'all') {
        participantHtml = `
          <div class="meetings-participant-badge">
            <span class="meetings-participant-count">All Members</span>
          </div>`;
      } else {
        const count = reminder.participant_count || 0;
        participantHtml = `
          <div class="meetings-participant-badge">
            <span class="meetings-participant-count">${count} member${count !== 1 ? 's' : ''} selected</span>
            <button class="meetings-participant-view-btn" onclick="toggleParticipantList(this, ${reminder.meeting_id})">View list</button>
            <div class="meetings-participant-list" style="display:none;"></div>
          </div>`;
      }
    }

    item.innerHTML = `
      <div class="meetings-reminder-header">
        <h3 class="meetings-reminder-title">${escapeHtml(reminder.title)}</h3>
        ${statusBadge}
      </div>
      <div class="meetings-reminder-datetime">
        <span>${formattedDate}</span>
        <span class="meetings-reminder-sep">·</span>
        <span>${formattedTime}</span>
        ${locationHtml}
      </div>
      ${reminder.description ? `<p class="meetings-reminder-desc">${escapeHtml(reminder.description)}</p>` : ''}
      ${participantHtml}
      <div class="meetings-reminder-footer">
        ${deleteBtn}
      </div>
    `;

    container.appendChild(item);
  });
}

// ─── View participant list inline ─────────────────────────────────────────────

async function toggleParticipantList(button, meetingId) {
  const badge = button.closest('.meetings-participant-badge');
  const list = badge.querySelector('.meetings-participant-list');

  if (!list) return;

  if (list.style.display === 'block') {
    list.style.display = 'none';
    button.textContent = 'View list';
    return;
  }

  list.style.display = 'block';
  button.textContent = 'Hide list';

  // Only fetch once; dataset.loaded prevents repeated requests
  if (list.dataset.loaded) return;

  list.innerHTML = '<p class="meetings-checklist-hint">Loading...</p>';

  try {
    const response = await fetch(`/api/meetings/${meetingId}/participants`);
    const data = await response.json();

    if (!response.ok || !data.participants) {
      list.innerHTML = '<p class="meetings-checklist-hint">Could not load participants.</p>';
      return;
    }

    if (data.participants.length === 0) {
      list.innerHTML = '<p class="meetings-checklist-hint">No participants found.</p>';
      return;
    }

    list.innerHTML = data.participants
      .map(p => `
        <div class="meetings-participant-list-item">
          ${escapeHtml(p.name)}
          <span class="meetings-participant-list-role">${escapeHtml(p.role)}</span>
        </div>`)
      .join('');

    list.dataset.loaded = 'true';
  } catch (error) {
    console.error('Load participants error:', error);
    list.innerHTML = '<p class="meetings-checklist-hint">Could not load participants.</p>';
  }
}

// ─── Delete meeting ───────────────────────────────────────────────────────────

async function deleteMeeting(meetingId) {
  if (!confirm('Delete this meeting and its reminder? This cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/meetings/${meetingId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      showStatusMessage(data.error || 'Could not delete meeting.', 'error');
      return;
    }

    showStatusMessage('Meeting and reminder deleted.', 'success');
    loadReminders();
  } catch (error) {
    console.error('Delete meeting error:', error);
    showStatusMessage('Unable to delete meeting.', 'error');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

function showStatusMessage(message, type) {
  if (!meetingsStatusMsg) return;

  meetingsStatusMsg.textContent = message;
  meetingsStatusMsg.className = `role-message ${type}`;

  setTimeout(() => {
    meetingsStatusMsg.className = 'role-message hidden';
  }, 3000);
}
