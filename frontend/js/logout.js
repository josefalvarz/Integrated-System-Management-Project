async function logout() {
  const msg = document.getElementById('msg');

  const res = await fetch('/auth/logout', { method: 'POST' });

  if (res.ok) {
  sessionStorage.removeItem('loggedInUser');

  msg.className = 'msg success';
  msg.textContent = 'Logged out successfully. Redirecting...';

  setTimeout(() => {
    window.location.href = './pages/login.html';
  }, 1000);
} else {
    msg.textContent = 'Something went wrong. Please try again.';
  }
}