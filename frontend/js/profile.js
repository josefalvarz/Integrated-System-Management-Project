// S6 — Load and display profile
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/profile');
        if (!res.ok) return window.location.href = '/pages/login.html';

        const user = await res.json();

        document.getElementById('viewName').textContent    = user.name    || '—';
        document.getElementById('viewEmail').textContent   = user.email   || '—';
        document.getElementById('viewPhone').textContent   = user.phone   || 'Not provided';
        document.getElementById('viewAddress').textContent = user.address || 'Not provided';
        document.getElementById('viewRole').textContent    = user.role    || '—';

        // Pre-fill edit form
        document.getElementById('editName').value    = user.name    || '';
        document.getElementById('editPhone').value   = user.phone   || '';
        document.getElementById('editAddress').value = user.address || '';
        document.getElementById('editEmail').textContent = user.email || '—';

    } catch {
        window.location.href = '/pages/login.html';
    }
});

// S7 — Show edit form
document.getElementById('editBtn').addEventListener('click', () => {
    document.getElementById('viewSection').style.display = 'none';
    document.getElementById('editSection').style.display = 'block';
    document.getElementById('message').textContent = '';
});

// S7 — Cancel edit
document.getElementById('cancelBtn').addEventListener('click', () => {
    document.getElementById('editSection').style.display = 'none';
    document.getElementById('viewSection').style.display = 'block';
    document.getElementById('message').textContent = '';
});

// S7 — Save profile changes
document.getElementById('saveBtn').addEventListener('click', async () => {
    const name    = document.getElementById('editName').value.trim();
    const phone   = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const msg     = document.getElementById('message');

    if (!name)
        return showMessage(msg, 'Name is required', 'error');

    try {
        const res  = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, address })
        });
        const data = await res.json();

        if (res.ok) {
            // Update view section immediately
            document.getElementById('viewName').textContent    = name;
            document.getElementById('viewPhone').textContent   = phone   || 'Not provided';
            document.getElementById('viewAddress').textContent = address || 'Not provided';

            // Switch back to view section
            document.getElementById('editSection').style.display = 'none';
            document.getElementById('viewSection').style.display = 'block';

            showMessage(msg, data.message, 'success');
        } else {
            showMessage(msg, data.error, 'error');
        }
    } catch {
        showMessage(msg, 'Server error. Please try again.', 'error');
    }
});

function showMessage(el, text, type) {
    el.textContent = text;
    el.style.color = type === 'error' ? 'red' : 'green';
}