async function logout() {
  const msg = document.getElementById('msg');

  try {
    await fetch('/api/auth/logout', { method: 'POST' });

    sessionStorage.removeItem('loggedInUser');

    if (msg) {
      msg.style.color = '#4ade9a';
      msg.textContent = 'Signed out successfully. Redirecting...';
    }

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  } catch {
    sessionStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
  }
}