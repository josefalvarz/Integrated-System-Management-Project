const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
} else {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  document.getElementById('welcomeMessage').innerHTML = `Welcome, <em>${name}</em>`;
  document.getElementById('userName').textContent = name;
  document.getElementById('userRole').textContent = role === 'admin' ? 'Administrator' : 'Member';

  const initials = name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
  document.getElementById('userInitials').textContent = initials || 'U';

  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }

  const sessionStart = new Date();
  setInterval(() => {
    const diff = Math.floor((Date.now() - sessionStart) / 60000);
    document.getElementById('sessionChip').textContent =
      diff === 0 ? 'Session Active' : `Active ${diff}m`;
  }, 30000);
}

async function logout() {
  const msg = document.getElementById('msg');
  try {
    await fetch('/auth/logout', { method: 'POST' });
    sessionStorage.removeItem('loggedInUser');
    if (msg) {
      msg.className = 'msg success';
      msg.textContent = 'Signed out successfully. Redirecting…';
    }
    setTimeout(() => { window.location.href = 'login.html'; }, 800);
  } catch {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  }
}