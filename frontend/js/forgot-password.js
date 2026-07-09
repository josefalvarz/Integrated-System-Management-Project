async function requestReset() {
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('msg');
  const resetLinkBox = document.getElementById('reset-link-box');
  const resetLinkAnchor = document.getElementById('reset-link-anchor');

  msg.className = 'msg';
  msg.textContent = '';
  resetLinkBox.style.display = 'none';

  if (!email) {
    msg.textContent = 'Please enter your email address.';
    return;
  }

  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();

    if (!response.ok) {
      msg.textContent = data.error || 'Something went wrong. Please try again.';
      return;
    }

    msg.className = 'msg success';
    msg.textContent = data.message;

    // Show the reset link directly in the UI (simulation — no real email service)
    if (data.resetLink) {
      resetLinkAnchor.href = data.resetLink;
      resetLinkAnchor.textContent = window.location.origin + data.resetLink;
      resetLinkBox.style.display = 'block';
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    msg.textContent = 'Unable to connect to the server. Please try again.';
  }
}
