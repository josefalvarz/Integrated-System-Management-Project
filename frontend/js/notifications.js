const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

const isAdmin = loggedInUser &&
  (loggedInUser.role === 'admin' || loggedInUser.role === 'administrator');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');
const notificationForm = document.getElementById('notificationForm');
const notificationsList = document.getElementById('notificationsList');
const notificationStatusMsg = document.getElementById('notificationStatusMsg');

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

// Load notifications when page loads
loadNotifications();

// Handle broadcast form submission
if (notificationForm) {
  notificationForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const target_group = document.getElementById('notifTarget').value;

    if (!title) {
      showStatusMessage('Please enter an announcement title.', 'error');
      return;
    }

    if (!message) {
      showStatusMessage('Please enter a message.', 'error');
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, target_group })
      });

      const data = await response.json();

      if (!response.ok) {
        showStatusMessage(data.error || 'Could not send notification.', 'error');
        return;
      }

      notificationForm.reset();
      showStatusMessage('Broadcast notification sent successfully!', 'success');
      loadNotifications();
    } catch (error) {
      console.error('Send notification error:', error);
      showStatusMessage('Unable to send notification. Please try again.', 'error');
    }
  });
}

async function loadNotifications() {
  if (!notificationsList) return;

  try {
    const response = await fetch('/api/notifications');
    const data = await response.json();

    if (!response.ok) {
      notificationsList.innerHTML = '<p class="notifications-empty">Could not load announcements.</p>';
      return;
    }

    renderNotifications(data.notifications || []);
  } catch (error) {
    console.error('Load notifications error:', error);
    notificationsList.innerHTML = '<p class="notifications-empty">Could not load announcements.</p>';
  }
}

function renderNotifications(notifications) {
  if (!notificationsList) return;

  if (!notifications || notifications.length === 0) {
    notificationsList.innerHTML = '<p class="notifications-empty">No announcements yet.</p>';
    return;
  }

  notificationsList.innerHTML = '';

  notifications.forEach(notification => {
    const item = document.createElement('div');
    item.className = 'notification-item';

    const date = new Date(notification.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const targetLabel = notification.target_group === 'all' ? 'All Members' : notification.target_group;

    item.innerHTML = `
      <h3 class="notification-item-title">${escapeHtml(notification.title)}</h3>
      <p class="notification-item-message">${escapeHtml(notification.message)}</p>
      <div class="notification-item-meta">
        <span>${formattedDate}</span>
        <span class="notification-badge">${escapeHtml(targetLabel)}</span>
        ${notification.sender_name ? `<span>By ${escapeHtml(notification.sender_name)}</span>` : ''}
        ${isAdmin ? `<button class="notif-delete-btn" onclick="deleteNotification(${notification.id})">Delete</button>` : ''}
      </div>
    `;

    notificationsList.appendChild(item);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

async function deleteNotification(id) {
  if (!confirm('Delete this announcement? Members will no longer see it.')) {
    return;
  }

  try {
    const response = await fetch(`/api/notifications/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      showStatusMessage(data.error || 'Could not delete announcement.', 'error');
      return;
    }

    showStatusMessage('Announcement deleted.', 'success');
    loadNotifications();
  } catch (error) {
    console.error('Delete notification error:', error);
    showStatusMessage('Unable to delete announcement.', 'error');
  }
}

function showStatusMessage(message, type) {
  if (!notificationStatusMsg) return;

  notificationStatusMsg.textContent = message;
  notificationStatusMsg.className = `role-message ${type}`;

  setTimeout(() => {
    notificationStatusMsg.className = 'role-message hidden';
  }, 3000);
}
