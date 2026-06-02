// S27 - Upload WhatsApp Chat Export

const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
} else {
  initializeWhatsApp();
}

function initializeWhatsApp() {
  const name = loggedInUser.name || loggedInUser.email || 'User';
  const role = loggedInUser.role || 'member';

  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  document.getElementById('userName').textContent = name;
  document.getElementById('userRole').textContent = role === 'admin' ? 'Administrator' : 'Member';
  document.getElementById('userInitials').textContent = initials || 'U';

  // Hide admin-only sidebar elements if not admin
  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });

    // Block access to upload section
    document.getElementById('uploadSection').innerHTML =
      "<p style='color:red;'>Access denied. Admins only.</p>";
  }
}

// Upload and read chat file
function uploadChat() {
  const fileInput = document.getElementById('chatFileInput');
  const uploadMessage = document.getElementById('uploadMessage');

  // Validate: file selected
  if (!fileInput.files || fileInput.files.length === 0) {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Please select a file before uploading.';
    return;
  }

  const file = fileInput.files[0];

  // Validate: file type must be .txt
  if (!file.name.endsWith('.txt')) {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Invalid file type. Please upload a .txt file.';
    return;
  }

  // Read file content
  const reader = new FileReader();

  reader.onload = function (e) {
    const chatContent = e.target.result;

    // Store chat content temporarily in sessionStorage
    sessionStorage.setItem('whatsappChatData', chatContent);

    uploadMessage.style.color = 'green';
    uploadMessage.textContent = 'Chat uploaded successfully! Ready for analysis.';
  };

  reader.onerror = function () {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Failed to read file. Please try again.';
  };

  reader.readAsText(file);
}

// Logout
function logout() {
  window.location.href = 'logout.html';
}