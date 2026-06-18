// Populate sidebar from sessionStorage
const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
if (loggedInUser) {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  const sidebarName = document.getElementById('sidebarName');
  const sidebarRole = document.getElementById('sidebarRole');
  const sidebarInitials = document.getElementById('sidebarInitials');
  const profileInitials = document.getElementById('profileInitials');

  if (sidebarName) sidebarName.textContent = name;
  if (sidebarRole) sidebarRole.textContent = role === 'admin' ? 'Administrator' : 'Member';

  const initials = name.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
  if (sidebarInitials) sidebarInitials.textContent = initials || 'U';
  if (profileInitials) profileInitials.textContent = initials || 'U';

  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

// S6 — Load and display profile
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('/api/profile');
    if (!res.ok) return window.location.href = '/pages/login.html';

    const user = await res.json();

    document.getElementById('viewName').textContent         = user.name          || '—';
    document.getElementById('viewEmail').textContent        = user.email         || '—';
    document.getElementById('viewPhone').textContent        = user.phone         || 'Not provided';
    document.getElementById('viewAddress').textContent      = user.address       || 'Not provided';
    document.getElementById('viewRole').textContent         = user.role          || '—';
    document.getElementById('viewGender').textContent       = user.gender        || 'Not provided';
    document.getElementById('viewCnic').textContent         = user.cnic          || 'Not provided';
    document.getElementById('viewQualification').textContent= user.qualification || 'Not provided';
    document.getElementById('viewDegreeDate').textContent   = user.degree_date   || 'Not provided';
    document.getElementById('viewProvince').textContent     = user.province      || 'Not provided';
    document.getElementById('viewUniversity').textContent   = user.university    || 'Not provided';
    document.getElementById('viewDepartment').textContent   = user.department    || 'Not provided';
    document.getElementById('viewDesignation').textContent  = user.designation   || 'Not provided';

    // Update avatar initials from actual name
    const initials = (user.name || '').split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
    const profileInitials = document.getElementById('profileInitials');
    const sidebarInitials = document.getElementById('sidebarInitials');
    if (profileInitials) profileInitials.textContent = initials || 'U';
    if (sidebarInitials)  sidebarInitials.textContent = initials || 'U';

    const sidebarName = document.getElementById('sidebarName');
    if (sidebarName) sidebarName.textContent = user.name || '—';

    // Pre-fill edit form
    document.getElementById('editName').value          = user.name          || '';
    document.getElementById('editPhone').value         = user.phone         || '';
    document.getElementById('editAddress').value       = user.address       || '';
    document.getElementById('editEmail').textContent   = user.email         || '—';
    document.getElementById('editGender').value        = user.gender        || '';
    document.getElementById('editCnic').value          = user.cnic          || '';
    document.getElementById('editQualification').value = user.qualification || '';
    document.getElementById('editDegreeDate').value    = user.degree_date   || '';
    document.getElementById('editProvince').value      = user.province      || '';
    document.getElementById('editUniversity').value    = user.university    || '';
    document.getElementById('editDepartment').value    = user.department    || '';
    document.getElementById('editDesignation').value   = user.designation   || '';

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
  const name          = document.getElementById('editName').value.trim();
  const phone         = document.getElementById('editPhone').value.trim();
  const address       = document.getElementById('editAddress').value.trim();
  const gender        = document.getElementById('editGender').value;
  const cnic          = document.getElementById('editCnic').value.trim();
  const qualification = document.getElementById('editQualification').value.trim();
  const degree_date   = document.getElementById('editDegreeDate').value;
  const province      = document.getElementById('editProvince').value.trim();
  const university    = document.getElementById('editUniversity').value.trim();
  const department    = document.getElementById('editDepartment').value.trim();
  const designation   = document.getElementById('editDesignation').value.trim();
  const msg           = document.getElementById('message');

  if (!name) return showMessage(msg, 'Name is required', 'error');

  try {
    const res  = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, address, gender, cnic, qualification, degree_date, province, university, department, designation })
    });
    const data = await res.json();

    if (res.ok) {
      document.getElementById('viewName').textContent          = name;
      document.getElementById('viewPhone').textContent         = phone         || 'Not provided';
      document.getElementById('viewAddress').textContent       = address       || 'Not provided';
      document.getElementById('viewGender').textContent        = gender        || 'Not provided';
      document.getElementById('viewCnic').textContent          = cnic          || 'Not provided';
      document.getElementById('viewQualification').textContent = qualification || 'Not provided';
      document.getElementById('viewDegreeDate').textContent    = degree_date   || 'Not provided';
      document.getElementById('viewProvince').textContent      = province      || 'Not provided';
      document.getElementById('viewUniversity').textContent    = university    || 'Not provided';
      document.getElementById('viewDepartment').textContent    = department    || 'Not provided';
      document.getElementById('viewDesignation').textContent   = designation   || 'Not provided';

      // Update avatar initials live
      const initials = name.split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase();
      const profileInitials = document.getElementById('profileInitials');
      const sidebarInitials = document.getElementById('sidebarInitials');
      const sidebarName     = document.getElementById('sidebarName');
      if (profileInitials) profileInitials.textContent = initials || 'U';
      if (sidebarInitials)  sidebarInitials.textContent = initials || 'U';
      if (sidebarName)      sidebarName.textContent = name;

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
  el.style.color = type === 'error' ? '#f87171' : '#4ade9a';
}