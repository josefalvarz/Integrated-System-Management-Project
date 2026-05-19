async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg = document.getElementById('msg');

  if (!email || !password) {
    msg.className = 'msg';
    msg.textContent = 'Please fill in both fields.';
    return;
  }

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      msg.className = 'msg';
      msg.textContent = data.error || 'Login failed. Please try again.';
      return;
    }

    msg.className = 'msg success';
    msg.textContent = 'Login successful! Redirecting...';

    const loggedInUser = {
      name: data.user?.name || email.split('@')[0],
      email: data.user?.email || email,
      role: data.user?.role || data.role || getUserRole(email)
    };

    sessionStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));

    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 800);

  } catch (error) {
    msg.className = 'msg';
    msg.textContent = 'Unable to connect to the server. Please try again.';
  }
}

function getUserRole(email) {
  const adminEmails = [
    'admin@organizationx.com',
    'admin@ims.com',
    'sofia@organizationx.com'
  ];

  if (adminEmails.includes(email.toLowerCase())) {
    return 'admin';
  }

  return 'member';
}