const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

let allMembers = [];

if (!loggedInUser) {
  window.location.href = 'login.html';
} else {
  initializeDashboard();
}

function initializeDashboard() {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  const welcomeMessage = document.getElementById('welcomeMessage');
  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const userInitials = document.getElementById('userInitials');
  const sessionChip = document.getElementById('sessionChip');

  if (welcomeMessage) {
    welcomeMessage.innerHTML = `Welcome, <em>${name}</em>`;
  }

  if (userName) {
    userName.textContent = name;
  }

  if (userRole) {
    userRole.textContent = role === 'admin' ? 'Administrator' : 'Member';
  }

  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  if (userInitials) {
    userInitials.textContent = initials || 'U';
  }

  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(element => {
      element.style.display = 'none';
    });
  }

  const sessionStart = new Date();

  setInterval(() => {
    if (!sessionChip) return;
    const diff = Math.floor((Date.now() - sessionStart) / 60000);
    sessionChip.textContent = diff === 0 ? 'Session Active' : `Active ${diff}m`;
  }, 30000);

  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page');

  if (page === 'members') {
    showMemberManagementPage();
  }

  setupMemberSearchInput();
}

/* PAGE SWITCHING */

function showDashboardPage() {
  const dashboardPage = document.getElementById('dashboardPage');
  const memberManagementPage = document.getElementById('memberManagementPage');

  if (memberManagementPage) {
    memberManagementPage.classList.add('hidden');
  }

  if (dashboardPage) {
    dashboardPage.classList.remove('hidden');
  }

  setActiveNavLink('Dashboard');
}

function showMemberManagementPage() {
  if (!loggedInUser || loggedInUser.role !== 'admin') {
    alert('Admin access required.');
    return;
  }

  const dashboardPage = document.getElementById('dashboardPage');
  const memberManagementPage = document.getElementById('memberManagementPage');

  if (dashboardPage) {
    dashboardPage.classList.add('hidden');
  }

  if (memberManagementPage) {
    memberManagementPage.classList.remove('hidden');
  }

  setActiveNavLink('Member Management');
  loadMembers();
}

function setActiveNavLink(label) {
  document.querySelectorAll('.ims-nav-link').forEach(link => {
    link.classList.remove('active');

    if (link.textContent.trim() === label) {
      link.classList.add('active');
    }
  });
}

/* MEMBER MANAGEMENT */

function formatStatus(isActive) {
  return Number(isActive) === 1 ? 'Active' : 'Deactivated';
}

function showRoleMessage(message, type = 'success') {
  const roleMessage = document.getElementById('roleMessage');

  if (!roleMessage) return;

  roleMessage.textContent = message;
  roleMessage.className = `role-message ${type}`;

  setTimeout(() => {
    roleMessage.className = 'role-message hidden';
  }, 2500);
}

async function loadMembers() {
  const membersTableBody = document.getElementById('membersTableBody');

  if (!membersTableBody) return;

  try {
    const response = await fetch('/api/users');
    const data = await response.json();

    if (!response.ok) {
      showRoleMessage(data.error || 'Could not load members.', 'error');
      return;
    }

    allMembers = data.users || [];

    renderMembers(allMembers);
    applyMemberSearch();
  } catch (error) {
    console.error('Load members error:', error);
    showRoleMessage('Unable to load members.', 'error');
  }
}

function renderMembers(users) {
  const membersTableBody = document.getElementById('membersTableBody');
  const memberSearchMessage = document.getElementById('memberSearchMessage');

  if (!membersTableBody) return;

  membersTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    if (memberSearchMessage) {
      memberSearchMessage.classList.remove('hidden');
      memberSearchMessage.textContent = 'No members found.';
    }
    return;
  }

  if (memberSearchMessage) {
    memberSearchMessage.classList.add('hidden');
    memberSearchMessage.textContent = '';
  }

  users.forEach(user => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${user.name || 'N/A'}</td>
      <td>${user.email || 'N/A'}</td>
      <td>
        <select class="role-select" data-user-id="${user.id}">
          <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>
        <span class="status-pill ${Number(user.is_active) === 1 ? 'active' : 'inactive'}">
          ${formatStatus(user.is_active)}
        </span>
      </td>
      <td>
        <button
          class="table-action-btn"
          data-user-id="${user.id}"
          data-status="${Number(user.is_active) === 1 ? 0 : 1}"
        >
          ${Number(user.is_active) === 1 ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    `;

    membersTableBody.appendChild(row);
  });

  attachMemberActionEvents();
}

function attachMemberActionEvents() {
  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', updateUserRole);
  });

  document.querySelectorAll('.table-action-btn').forEach(button => {
    button.addEventListener('click', updateUserStatus);
  });
}

/* MEMBER SEARCH INSIDE MEMBER MANAGEMENT */

function setupMemberSearchInput() {
  const memberSearchInput = document.getElementById('memberSearchInput');

  if (!memberSearchInput) return;

  memberSearchInput.addEventListener('input', applyMemberSearch);
}

function applyMemberSearch() {
  const memberSearchInput = document.getElementById('memberSearchInput');

  if (!memberSearchInput) return;

  const searchValue = memberSearchInput.value.toLowerCase().trim();

  const filteredMembers = allMembers.filter(user => {
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const role = (user.role || '').toLowerCase();

    return (
      name.includes(searchValue) ||
      email.includes(searchValue) ||
      role.includes(searchValue)
    );
  });

  renderMembers(filteredMembers);
}

/* USER ACTIONS */

async function updateUserRole(event) {
  const userId = event.target.dataset.userId;
  const newRole = event.target.value;

  try {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });

    const data = await response.json();

    if (!response.ok) {
      showRoleMessage(data.error || 'Could not update role.', 'error');
      await loadMembers();
      return;
    }

    showRoleMessage(data.message || 'Role updated.');

    if (Number(loggedInUser.id) === Number(userId)) {
      loggedInUser.role = newRole;
      sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

      if (newRole !== 'admin') {
        showRoleMessage('Your role changed. Admin access removed.', 'error');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    }

    await loadMembers();
  } catch (error) {
    console.error('Update role error:', error);
    showRoleMessage('Unable to update role.', 'error');
    await loadMembers();
  }
}

async function updateUserStatus(event) {
  const userId = event.target.dataset.userId;
  const newStatus = Number(event.target.dataset.status);

  try {
    const response = await fetch(`/api/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus })
    });

    const data = await response.json();

    if (!response.ok) {
      showRoleMessage(data.error || 'Could not update status.', 'error');
      return;
    }

    showRoleMessage(data.message || 'Status updated.');
    await loadMembers();
  } catch (error) {
    console.error('Update status error:', error);
    showRoleMessage('Unable to update status.', 'error');
  }
}

/* LOGOUT */

function logout() {
  window.location.href = 'logout.html';
}