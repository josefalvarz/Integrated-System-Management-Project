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

    // Store raw chat content
    sessionStorage.setItem('whatsappChatData', chatContent);

    // Parse messages - S28
    const messages = parseWhatsAppChat(chatContent);
    displayParseResult(messages);
  };

  reader.onerror = function () {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Failed to read file. Please try again.';
  };

  reader.readAsText(file);
}

// S28 - Parse WhatsApp Messages

function parseWhatsAppChat(chatContent) {
  const lines = chatContent.split('\n');
  const messages = [];

  // Regex to match WhatsApp export format
  // Example: 12/01/2024, 10:30 - John: Hello!
  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[AP]M)?)\s-\s([^:]+):\s(.+)$/;

  lines.forEach(line => {
    line = line.trim();

    // Skip empty lines
    if (!line) return;

    const match = line.match(messageRegex);

    if (match) {
      messages.push({
        date: match[1],
        time: match[2],
        sender: match[3].trim(),
        content: match[4].trim()
      });
    }
  });

  return messages;
}

function displayParseResult(messages) {
  const uploadMessage = document.getElementById('uploadMessage');

  if (!messages || messages.length === 0) {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Error: Could not read chat format. Please check the file.';
    return;
  }

  // Store parsed messages in sessionStorage
  sessionStorage.setItem('whatsappParsedMessages', JSON.stringify(messages));

  uploadMessage.style.color = 'green';
  uploadMessage.textContent = `Chat uploaded successfully! Total messages parsed: ${messages.length}`;
}

// Logout
function logout() {
  window.location.href = 'logout.html';
}