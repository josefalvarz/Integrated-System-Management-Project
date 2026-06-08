// S30 — User Activity (WhatsApp Analytics)

// Step 1: Check that a user is logged in and is an admin
const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
} else {
  initActivityPage();
}

// Step 2: Set up the sidebar with the logged-in user's info
function setupSidebar() {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const sidebarInitials = document.getElementById('sidebarInitials');
  const sidebarName = document.getElementById('sidebarName');
  const sidebarRole = document.getElementById('sidebarRole');

  if (sidebarInitials) sidebarInitials.textContent = initials || 'U';
  if (sidebarName) sidebarName.textContent = name;
  if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Administrator' : 'Member';
}

// Step 3: Main function — fetch data and render everything
async function initActivityPage() {
  setupSidebar();

  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  const activityContent = document.getElementById('activityContent');

  try {
    const response = await fetch('/api/users/activity');

    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to load activity data.');
    }

    const data = await response.json();

    if (loadingState) loadingState.style.display = 'none';

    if (data.isEmpty) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (activityContent) activityContent.style.display = 'block';

    renderMostActive(data.mostActive);
    renderLeastActive(data.leastActive);
    renderFullTable(data.all);

  } catch (error) {
    console.error('Activity page error:', error);
    if (loadingState) {
      loadingState.textContent = 'Could not load activity data. Please try again.';
    }
  }
}

// Step 4: Render the Most Active list (top 5)
function renderMostActive(users) {
  const list = document.getElementById('mostActiveList');
  if (!list) return;

  list.innerHTML = '';

  users.forEach((user, index) => {
    const item = document.createElement('li');
    item.className = 'activity-list-item';
    item.innerHTML = `
      <span class="activity-rank">#${index + 1}</span>
      <span class="activity-name">${user.name}</span>
      <span class="activity-count">${user.message_count} msg</span>
    `;
    list.appendChild(item);
  });
}

// Step 5: Render the Least Active list (bottom 5)
function renderLeastActive(users) {
  const list = document.getElementById('leastActiveList');
  if (!list) return;

  list.innerHTML = '';

  users.forEach((user, index) => {
    const item = document.createElement('li');
    item.className = 'activity-list-item';
    item.innerHTML = `
      <span class="activity-rank">#${index + 1}</span>
      <span class="activity-name">${user.name}</span>
      <span class="activity-count">${user.message_count} msg</span>
    `;
    list.appendChild(item);
  });
}

// Step 6: Render the full activity summary table (all users)
function renderFullTable(users) {
  const tbody = document.getElementById('activityTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="rank-number">${index + 1}</td>
      <td>${user.name}</td>
      <td>${user.message_count}</td>
    `;
    tbody.appendChild(row);
  });
}

// Step 7: Logout function
function logout() {
  window.location.href = 'logout.html';
}