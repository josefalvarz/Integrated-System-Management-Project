window.addEventListener('DOMContentLoaded', async () => {
    try {
        const res  = await fetch('/profile');
        if (!res.ok) return window.location.href = '/pages/login.html';

        const user = await res.json();

        document.getElementById('viewName').textContent    = user.name    || '—';
        document.getElementById('viewEmail').textContent   = user.email   || '—';
        document.getElementById('viewPhone').textContent   = user.phone   || 'Not provided';
        document.getElementById('viewAddress').textContent = user.address || 'Not provided';
        document.getElementById('viewRole').textContent    = user.role    || '—';

    } catch {
        window.location.href = '/pages/login.html';
    }
});