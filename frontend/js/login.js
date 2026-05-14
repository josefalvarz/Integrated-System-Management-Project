async function login() {
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg      = document.getElementById('msg');

  if (!email || !password) {
    msg.textContent = 'Please fill in both fields.';
    return;
  }

  const res  = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error;
  } else {
    msg.className   = 'msg success';
    msg.textContent = 'Login successful! Redirecting…';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  }
}