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

// S38 — meeting type & link UI elements
const meetingLinkField = document.getElementById('meetingLinkField');
const meetingLinkInput = document.getElementById('meetingLink');
const meetingLinkRequired = document.getElementById('meetingLinkRequired');

// S41/S42 — edit mode UI elements
const formModeTitle = document.getElementById('formModeTitle');
const formSubmitBtn = document.getElementById('formSubmitBtn');
const editMeetingIdInput = document.getElementById('editMeetingId');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Stores the last-fetched reminder list so editMeeting() can look up data by meeting_id
let allReminders = [];

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

// Admins get the participant checklist loaded and the toggles wired up
if (isAdmin) {
  loadMembersForChecklist();
  setupParticipantToggle();
  setupMeetingTypeToggle();
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

// ─── Meeting type toggle ──────────────────────────────────────────────────────

function setupMeetingTypeToggle() {
  const radios = document.querySelectorAll('input[name="meetingType"]');
  if (!radios.length || !meetingLinkField) return;

  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      applyMeetingTypeToggle(radio.value);
    });
  });
}

function applyMeetingTypeToggle(type) {
  if (!meetingLinkField) return;

  if (type === 'physical') {
    meetingLinkField.style.display = 'none';
    if (meetingLinkInput) meetingLinkInput.value = '';
  } else {
    meetingLinkField.style.display = '';
    if (meetingLinkRequired) {
      meetingLinkRequired.textContent = type === 'online' ? '(Required)' : '(Optional)';
    }
  }
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

    // S38 — collect meeting type and link
    const meetingTypeEl = document.querySelector('input[name="meetingType"]:checked');
    const meeting_type = meetingTypeEl ? meetingTypeEl.value : 'physical';
    const online_link = meetingLinkInput ? meetingLinkInput.value.trim() : '';

    if (meeting_type === 'online' && !online_link) {
      showStatusMessage('Please enter a meeting link for online meetings.', 'error');
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

    // S41 — if editMeetingId has a value we are in edit mode, otherwise create mode
    const editId = editMeetingIdInput ? editMeetingIdInput.value : '';
    const apiUrl = editId ? `/api/meetings/${editId}` : '/api/meetings';
    const apiMethod = editId ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiUrl, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, time, location, description, participant_type, participant_ids, meeting_type, online_link })
      });

      const data = await response.json();

      if (!response.ok) {
        showStatusMessage(data.error || (editId ? 'Could not update meeting.' : 'Could not schedule meeting.'), 'error');
        return;
      }

      if (editId) {
        // Edit mode: exit edit mode then refresh
        exitEditMode();
        showStatusMessage('Meeting updated successfully!', 'success');
      } else {
        // Create mode: reset form manually
        meetingForm.reset();

        // Reset participant section back to "All Members"
        if (participantAllRadio) participantAllRadio.checked = true;
        if (participantChecklist) participantChecklist.style.display = 'none';
        if (checklistItems) {
          checklistItems.querySelectorAll('.participant-checkbox').forEach(cb => {
            cb.checked = false;
          });
        }

        // S38 — reset meeting type back to Physical and hide link field
        const physicalRadio = document.getElementById('meetingTypePhysical');
        if (physicalRadio) physicalRadio.checked = true;
        if (meetingLinkField) meetingLinkField.style.display = 'none';
        if (meetingLinkInput) meetingLinkInput.value = '';

        showStatusMessage('Meeting scheduled and reminder created!', 'success');
      }

      loadReminders();
    } catch (error) {
      console.error('Schedule/update meeting error:', error);
      showStatusMessage('Unable to save meeting. Please try again.', 'error');
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
    allReminders = reminders;
    const now = new Date();

    // Upcoming: future date AND not cancelled
    const upcoming = reminders.filter(r => r.status !== 'Cancelled' && reminderDateTime(r) >= now);
    // Past/history: past date OR cancelled (regardless of date)
    const expired = reminders.filter(r => r.status === 'Cancelled' || reminderDateTime(r) < now);

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

    let statusBadge;
    if (reminder.status === 'Cancelled') {
      statusBadge = '<span class="meetings-badge meetings-badge-cancelled">Cancelled</span>';
    } else if (isExpired) {
      statusBadge = '<span class="meetings-badge meetings-badge-expired">Expired</span>';
    } else {
      statusBadge = '<span class="meetings-badge meetings-badge-upcoming">Upcoming</span>';
    }

    // S38 — meeting type badge
    const typeBadgeClass = {
      online: 'meetings-type-badge-online',
      hybrid: 'meetings-type-badge-hybrid',
      physical: 'meetings-type-badge-physical'
    }[reminder.meeting_type] || 'meetings-type-badge-physical';
    const typeLabel = reminder.meeting_type
      ? reminder.meeting_type.charAt(0).toUpperCase() + reminder.meeting_type.slice(1)
      : 'Physical';
    const typeBadgeHtml = `<span class="meetings-type-badge ${typeBadgeClass}">${typeLabel}</span>`;

    // S38 — clickable online link (shown to all users when a link exists)
    const onlineLinkHtml = reminder.online_link
      ? `<div class="meetings-online-link-row">
           <a href="${escapeHtml(reminder.online_link)}" target="_blank" rel="noopener noreferrer" class="meetings-online-link">
             Join Meeting
           </a>
         </div>`
      : '';

    // Edit and Cancel Meeting buttons — admin only, upcoming (not cancelled) meetings only
    const isScheduledUpcoming = !isExpired && reminder.status !== 'Cancelled';
    const editBtn = isAdmin && isScheduledUpcoming
      ? `<button class="meetings-edit-btn" onclick="editMeeting(${reminder.meeting_id})">Edit</button>`
      : '';
    const cancelMeetingBtn = isAdmin && isScheduledUpcoming
      ? `<button class="meetings-cancel-meeting-btn" onclick="cancelMeeting(${reminder.meeting_id})">Cancel Meeting</button>`
      : '';
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
        ${typeBadgeHtml}
      </div>
      <div class="meetings-reminder-datetime">
        <span>${formattedDate}</span>
        <span class="meetings-reminder-sep">·</span>
        <span>${formattedTime}</span>
        ${locationHtml}
      </div>
      ${reminder.description ? `<p class="meetings-reminder-desc">${escapeHtml(reminder.description)}</p>` : ''}
      ${onlineLinkHtml}
      ${participantHtml}
      <div class="meetings-reminder-footer">
        <div class="meetings-reminder-actions">
          ${editBtn}
          ${cancelMeetingBtn}
        </div>
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

// ─── Edit meeting ─────────────────────────────────────────────────────────────

async function editMeeting(meetingId) {
  // Look up the reminder data we already have in memory
  const reminder = allReminders.find(r => r.meeting_id === meetingId);
  if (!reminder) return;

  // Switch form to edit mode
  if (editMeetingIdInput) editMeetingIdInput.value = meetingId;
  if (formModeTitle) formModeTitle.textContent = 'Edit Meeting';
  if (formSubmitBtn) formSubmitBtn.textContent = 'Save Changes';
  if (cancelEditBtn) cancelEditBtn.style.display = '';

  // Populate all form fields with the existing meeting data
  document.getElementById('meetingTitle').value = reminder.title || '';
  document.getElementById('meetingDate').value = reminder.date || '';
  document.getElementById('meetingTime').value = reminder.time || '';
  document.getElementById('meetingLocation').value = reminder.location || '';
  document.getElementById('meetingDescription').value = reminder.description || '';

  // Restore meeting type radio and the link field
  const meetingType = reminder.meeting_type || 'physical';
  const typeRadio = document.querySelector(`input[name="meetingType"][value="${meetingType}"]`);
  if (typeRadio) typeRadio.checked = true;
  applyMeetingTypeToggle(meetingType);
  if (meetingLinkInput) meetingLinkInput.value = reminder.online_link || '';

  // Restore participant selection
  if (reminder.participant_type === 'selected') {
    if (participantSelectedRadio) participantSelectedRadio.checked = true;
    if (participantChecklist) participantChecklist.style.display = 'block';

    // Fetch the actual participant list and pre-check the right checkboxes
    try {
      const response = await fetch(`/api/meetings/${meetingId}/participants`);
      const data = await response.json();
      if (response.ok && data.participants) {
        const selectedIds = data.participants.map(p => p.id);
        document.querySelectorAll('.participant-checkbox').forEach(cb => {
          cb.checked = selectedIds.includes(parseInt(cb.value));
        });
      }
    } catch (e) {
      console.error('Load participants for edit error:', e);
    }
  } else {
    if (participantAllRadio) participantAllRadio.checked = true;
    if (participantChecklist) participantChecklist.style.display = 'none';
  }

  // Scroll the form card into view so the admin can see it
  const formCard = document.querySelector('.meetings-form-card');
  if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Resets the form back to "Schedule a meeting" (create) mode
function exitEditMode() {
  if (editMeetingIdInput) editMeetingIdInput.value = '';
  if (formModeTitle) formModeTitle.textContent = 'Schedule a meeting';
  if (formSubmitBtn) formSubmitBtn.textContent = 'Schedule Meeting';
  if (cancelEditBtn) cancelEditBtn.style.display = 'none';

  if (meetingForm) meetingForm.reset();

  if (participantAllRadio) participantAllRadio.checked = true;
  if (participantChecklist) participantChecklist.style.display = 'none';
  if (checklistItems) {
    checklistItems.querySelectorAll('.participant-checkbox').forEach(cb => { cb.checked = false; });
  }

  const physicalRadio = document.getElementById('meetingTypePhysical');
  if (physicalRadio) physicalRadio.checked = true;
  if (meetingLinkField) meetingLinkField.style.display = 'none';
  if (meetingLinkInput) meetingLinkInput.value = '';
}

// ─── Cancel meeting ───────────────────────────────────────────────────────────

async function cancelMeeting(meetingId) {
  if (!confirm('Cancel this meeting? It will be marked as cancelled and all members will be notified.')) {
    return;
  }

  try {
    const response = await fetch(`/api/meetings/${meetingId}/cancel`, {
      method: 'PATCH'
    });

    const data = await response.json();

    if (!response.ok) {
      showStatusMessage(data.error || 'Could not cancel meeting.', 'error');
      return;
    }

    showStatusMessage('Meeting cancelled. Members have been notified.', 'success');
    loadReminders();
  } catch (error) {
    console.error('Cancel meeting error:', error);
    showStatusMessage('Unable to cancel meeting. Please try again.', 'error');
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
