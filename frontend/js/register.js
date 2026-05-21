async function register() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');

  msg.className = 'msg';
  msg.textContent = '';

  if (!name || !email || !password) {
    msg.textContent = 'Please fill in all fields.';
    return;
  }

  if (password.length < 8) {
    msg.textContent = 'Password must be at least 8 characters.';
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      msg.textContent = data.error || 'Registration failed. Please try again.';
      return;
    }

    msg.className = 'msg success';
    msg.textContent = 'Account created successfully! Redirecting to login...';

    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1000);
  } catch (error) {
    console.error('Register error:', error);
    msg.textContent = 'Unable to connect to the server. Please try again.';
  }
}