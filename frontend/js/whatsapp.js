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

  if (role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
    document.getElementById('uploadSection').innerHTML =
      "<p style='color:red;'>Access denied. Admins only.</p>";
  }
}

// Upload and read chat file
function uploadChat() {
  const fileInput = document.getElementById('chatFileInput');
  const uploadMessage = document.getElementById('uploadMessage');

  if (!fileInput.files || fileInput.files.length === 0) {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Please select a file before uploading.';
    return;
  }

  const file = fileInput.files[0];

  if (!file.name.endsWith('.txt')) {
    uploadMessage.style.color = 'red';
    uploadMessage.textContent = 'Invalid file type. Please upload a .txt file.';
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const chatContent = e.target.result;

    sessionStorage.setItem('whatsappChatData', chatContent);

    // S28 - Parse messages
    const messages = parseWhatsAppChat(chatContent);
    displayParseResult(messages);

    // S29 - Analyze frequency
    if (messages.length > 0) {
      displayFrequency(messages);
    }
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

  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?:\s?[AP]M)?)\s-\s([^:]+):\s(.+)$/;

  lines.forEach(line => {
    line = line.trim();
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

  sessionStorage.setItem('whatsappParsedMessages', JSON.stringify(messages));

  uploadMessage.style.color = 'green';
  uploadMessage.textContent = `Chat uploaded successfully! Total messages parsed: ${messages.length}`;
}

// S29 - Analyze Message Frequency

function analyzeFrequency(messages) {
  const frequencyMap = {};

  messages.forEach(msg => {
    const date = msg.date;
    if (!frequencyMap[date]) {
      frequencyMap[date] = 0;
    }
    frequencyMap[date]++;
  });

  return frequencyMap;
}

function displayFrequency(messages) {
  const frequencyMap = analyzeFrequency(messages);
  const dates = Object.keys(frequencyMap);
  const totalMessages = messages.length;
  const activeDays = dates.length;
  const avgMessages = (totalMessages / activeDays).toFixed(1);

  document.getElementById('totalMessages').textContent = totalMessages;
  document.getElementById('activeDays').textContent = activeDays;
  document.getElementById('avgMessages').textContent = avgMessages;

  const tableBody = document.getElementById('frequencyTableBody');
  tableBody.innerHTML = '';

  dates.forEach(date => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${date}</td>
      <td>${frequencyMap[date]}</td>
    `;
    tableBody.appendChild(row);
  });

  document.getElementById('frequencySection').style.display = 'block';
}

// Logout
function logout() {
  window.location.href = 'logout.html';
}