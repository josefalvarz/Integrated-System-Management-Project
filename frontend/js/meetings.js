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

loadReminders();

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

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, location, description })
      });

      const data = await response.json();

      if (!response.ok) {
        showStatusMessage(data.error || 'Could not schedule meeting.', 'error');
        return;
      }

      meetingForm.reset();
      showStatusMessage('Meeting scheduled and reminder created!', 'success');
      loadReminders();
    } catch (error) {
      console.error('Schedule meeting error:', error);
      showStatusMessage('Unable to schedule meeting. Please try again.', 'error');
    }
  });
}

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
      <div class="meetings-reminder-footer">
        ${deleteBtn}
      </div>
    `;

    container.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

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

function showStatusMessage(message, type) {
  if (!meetingsStatusMsg) return;

  meetingsStatusMsg.textContent = message;
  meetingsStatusMsg.className = `role-message ${type}`;

  setTimeout(() => {
    meetingsStatusMsg.className = 'role-message hidden';
  }, 3000);
}
