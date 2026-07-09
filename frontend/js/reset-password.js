async function resetPassword() {
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;
  const msg = document.getElementById('msg');

  msg.className = 'msg';
  msg.textContent = '';

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    msg.textContent = 'Invalid reset link. Please request a new one.';
    return;
  }

  if (!password || !passwordConfirm) {
    msg.textContent = 'Please fill in both fields.';
    return;
  }

  if (password.length < 8) {
    msg.textContent = 'Password must be at least 8 characters.';
    return;
  }

  if (password !== passwordConfirm) {
    msg.textContent = 'Passwords do not match.';
    return;
  }

  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    const data = await response.json();

    if (!response.ok) {
      msg.textContent = data.error || 'Something went wrong. Please try again.';
      return;
    }

    msg.className = 'msg success';
    msg.textContent = data.message + ' Redirecting to sign in...';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  } catch (error) {
    console.error('Reset password error:', error);
    msg.textContent = 'Unable to connect to the server. Please try again.';
  }
}
