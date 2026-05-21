async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');

  msg.className = 'msg';
  msg.textContent = '';

  if (!email || !password) {
    msg.textContent = 'Please fill in both fields.';
    return;
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      msg.textContent = data.error || 'Login failed. Please try again.';
      return;
    }

    const loggedInUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      role: data.user.role || 'member'
    };

    sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

    msg.className = 'msg success';
    msg.textContent = 'Login successful! Redirecting...';

    setTimeout(() => {
      window.location.href = '/pages/dashboard.html';
    }, 800);
  } catch (error) {
    console.error('Login error:', error);
    msg.textContent = 'Unable to connect to the server. Please try again.';
  }
}