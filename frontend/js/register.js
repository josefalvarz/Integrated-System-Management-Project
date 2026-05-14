async function register() {
  const name     = document.getElementById('name').value.trim();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const msg      = document.getElementById('msg');

  if (!name || !email || !password) {
    msg.textContent = 'Please fill in all the fields.';
    return;
  }

  if (password.length < 8) {
    msg.textContent = 'Password must be at least 8 characters.';
    return;
  }

  const res  = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  const data = await res.json();

  if (!res.ok) {
    msg.textContent = data.error;
  } else {
    msg.className   = 'msg success';
    msg.textContent = 'Account created! Taking you to login…';
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
  }
}