/* ============================================================
   whatsapp.js  —  S27 Upload, S28 Parse, S29 Frequency
   ============================================================ */

// ── Auth guard ──────────────────────────────────────────────
const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

// Block members from accessing WhatsApp Analytics directly
function isAdmin() {
  const role = (loggedInUser?.role || '').toLowerCase();
  return role === 'admin' || role === 'administrator';
}

if (!isAdmin()) {
  alert('Access denied. Only administrators can access WhatsApp Analytics.');
  window.location.href = 'dashboard.html';
}


function loadUserInfo() {
  const name = loggedInUser?.name || loggedInUser?.email || 'User';
  const role = loggedInUser?.role || 'member';

  const el = (id) => document.getElementById(id);

  if (el('userName'))     el('userName').textContent = name;
  if (el('userRole'))     el('userRole').textContent = role === 'admin' ? 'Administrator' : 'Member';
  if (el('userInitials')) {
    el('userInitials').textContent = name
      .split(' ')
      .map(w => w.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';
  }
}

loadUserInfo();

// ── State ────────────────────────────────────────────────────
const STORAGE_KEY = 'whatsappChatData';
let parsedMessages = [];

// ── DOM refs ─────────────────────────────────────────────────
const chatFileInput        = document.getElementById('chatFileInput');
const selectedFileName     = document.getElementById('selectedFileName');
const uploadMessage        = document.getElementById('uploadMessage');
const parseSummarySection  = document.getElementById('parseSummarySection');
const parseSummaryGrid     = document.getElementById('parseSummaryGrid');
const parseError           = document.getElementById('parseError');
const frequencySection     = document.getElementById('frequencySection');
const frequencySummaryGrid = document.getElementById('frequencySummaryGrid');
const frequencyTableBody   = document.getElementById('frequencyTableBody');

// ── File selection preview ────────────────────────────────────
chatFileInput?.addEventListener('change', () => {
  const file = chatFileInput.files[0];
  if (file) {
    selectedFileName.textContent = `Selected: ${file.name}`;
    showMessage(uploadMessage, '', '');
  }
});

// ────────────────────────────────────────────────────────────
// S27 — Handle Upload
// ────────────────────────────────────────────────────────────
function handleUpload() {
  if (!isAdmin()) {
    showMessage(uploadMessage, 'Only administrators can upload chat exports.', 'error');
    return;
  }

  const file = chatFileInput?.files[0];

  if (!file) {
    showMessage(uploadMessage, 'Please select a file before uploading.', 'error');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.txt')) {
    showMessage(uploadMessage, 'Unsupported file format. Please upload a .txt WhatsApp export.', 'error');
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {
    const rawText = e.target.result;

    try {
      localStorage.setItem(STORAGE_KEY, rawText);
    } catch {
      // storage quota — proceed in memory only
    }

    showMessage(uploadMessage, `✓ File "${file.name}" uploaded successfully. Analysing…`, 'success');
    parseChat(rawText);
  };

  reader.onerror = () => {
    showMessage(uploadMessage, 'Could not read the file. Please try again.', 'error');
  };

  reader.readAsText(file, 'UTF-8');
}

// ────────────────────────────────────────────────────────────
// S28 — Parse WhatsApp Messages
// ────────────────────────────────────────────────────────────
function parseChat(rawText) {
  parsedMessages = [];
  parseError.textContent = '';

  if (!rawText || rawText.trim() === '') {
    showParseError('The uploaded file is empty or cannot be read.');
    return;
  }

  const text  = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  let currentMsg = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(
      /^[\["]?(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap][Mm])?)[\]"]?\s[-–]\s(.+?):\s(.*)/
    );

    if (match) {
      if (currentMsg) parsedMessages.push(currentMsg);

      const [, date, time, sender, content] = match;

      if (isSystemMessage(sender, content)) {
        currentMsg = null;
        continue;
      }

      currentMsg = {
        date:    normaliseDate(date),
        time:    time.trim(),
        sender:  sender.trim(),
        content: content.trim(),
        isMedia: isMediaMessage(content),
      };
    } else if (currentMsg) {
      currentMsg.content += '\n' + trimmed;
    }
  }

  if (currentMsg) parsedMessages.push(currentMsg);

  if (parsedMessages.length === 0) {
    showParseError(
      'Could not read any messages from this file. Make sure it is an unmodified WhatsApp export (.txt).'
    );
    return;
  }

  renderParseSummary();
  analyseFrequency();
  analyseUserActivity();
}

function isSystemMessage(sender, content) {
  const systemPhrases = [
    'messages and calls are end-to-end encrypted',
    'changed the subject',
    'added',
    'removed',
    'left',
    'created group',
    'changed this group',
    'security code changed',
    'joined using this group',
  ];
  const combined = (sender + ' ' + content).toLowerCase();
  return systemPhrases.some(p => combined.includes(p));
}

function isMediaMessage(content) {
  return content.toLowerCase().includes('<media omitted>') ||
         content.toLowerCase().includes('image omitted') ||
         content.toLowerCase().includes('video omitted') ||
         content.toLowerCase().includes('audio omitted') ||
         content.toLowerCase().includes('sticker omitted') ||
         content.toLowerCase().includes('document omitted');
}

function normaliseDate(dateStr) {
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length !== 3) return dateStr;

  let [a, b, c] = parts;

  if (c.length <= 2 && a.length === 4) {
    return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
  }

  const year = c.length === 2 ? '20' + c : c;
  return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
}

function showParseError(msg) {
  parseSummarySection.classList.remove('hidden');
  parseSummaryGrid.innerHTML = '';
  parseError.textContent = msg;
  frequencySection.classList.add('hidden');
}

function renderParseSummary() {
  parseSummarySection.classList.remove('hidden');

  const uniqueSenders = new Set(parsedMessages.map(m => m.sender)).size;
  const uniqueDates   = new Set(parsedMessages.map(m => m.date)).size;
  const mediaCount    = parsedMessages.filter(m => m.isMedia).length;

  parseSummaryGrid.innerHTML = `
    ${statCard('Total Messages', parsedMessages.length)}
    ${statCard('Unique Senders', uniqueSenders)}
    ${statCard('Active Days',    uniqueDates)}
    ${statCard('Media Messages', mediaCount)}
  `;
}

// ────────────────────────────────────────────────────────────
// S30 — Analyse User Activity (Most / Least Active)
// ────────────────────────────────────────────────────────────
function analyseUserActivity() {
  const activitySection   = document.getElementById('activitySection');
  const mostActiveList    = document.getElementById('mostActiveList');
  const leastActiveList   = document.getElementById('leastActiveList');
  const activityTableBody = document.getElementById('activityTableBody');

  if (!activitySection) return;

  if (!parsedMessages || parsedMessages.length === 0) {
    activitySection.classList.remove('hidden');
    activityTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:2rem; color:#6b7280;">
          No chat data found. Upload a WhatsApp export to see user activity.
        </td>
      </tr>
    `;
    return;
  }

  // Count messages per sender
  const senderMap = {};
  for (const msg of parsedMessages) {
    senderMap[msg.sender] = (senderMap[msg.sender] || 0) + 1;
  }

  // Sort from highest to lowest
  const sorted = Object.entries(senderMap)
    .map(([name, count]) => ({ name, message_count: count }))
    .sort((a, b) => b.message_count - a.message_count);

  const maxCount = sorted[0]?.message_count || 1;

  // Top 5 most active
  const mostActive = sorted.slice(0, 5);

  // Bottom 5 least active
  const leastActive = sorted.length > 5
    ? [...sorted].reverse().slice(0, 5).reverse()
    : [...sorted].reverse();

  // Render most active list
  mostActiveList.innerHTML = '';
  mostActive.forEach((user, index) => {
    const li = document.createElement('li');
    li.className = 'wa-activity-item';
    li.innerHTML = `
      <span class="wa-activity-rank">#${index + 1}</span>
      <span class="wa-activity-name">${user.name}</span>
      <span class="wa-activity-count">${user.message_count} msg</span>
    `;
    mostActiveList.appendChild(li);
  });

  // Render least active list
  leastActiveList.innerHTML = '';
  leastActive.forEach((user, index) => {
    const li = document.createElement('li');
    li.className = 'wa-activity-item';
    li.innerHTML = `
      <span class="wa-activity-rank">#${index + 1}</span>
      <span class="wa-activity-name">${user.name}</span>
      <span class="wa-activity-count">${user.message_count} msg</span>
    `;
    leastActiveList.appendChild(li);
  });

  // Render full activity table
  activityTableBody.innerHTML = '';
  sorted.forEach((user, index) => {
    const pct = Math.round((user.message_count / maxCount) * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${user.name}</td>
      <td>${user.message_count}</td>
      <td>
        <div class="wa-bar-track">
          <div class="wa-bar-fill" style="width:${pct}%"></div>
        </div>
      </td>
    `;
    activityTableBody.appendChild(tr);
  });

  activitySection.classList.remove('hidden');
}
// ────────────────────────────────────────────────────────────
// S29 — Analyse Message Frequency
// ────────────────────────────────────────────────────────────
function analyseFrequency() {
  frequencySection.classList.remove('hidden');

  const frequencyMap = {};
  for (const msg of parsedMessages) {
    frequencyMap[msg.date] = (frequencyMap[msg.date] || 0) + 1;
  }

  const dates  = Object.keys(frequencyMap).sort();
  const counts = dates.map(d => frequencyMap[d]);

  if (dates.length === 0) return;

  const totalMsgs = counts.reduce((a, b) => a + b, 0);
  const avgPerDay = Math.round(totalMsgs / dates.length);
  const maxCount  = Math.max(...counts);
  const peakDate  = dates[counts.indexOf(maxCount)];

  frequencySummaryGrid.innerHTML = `
    ${statCard('Total Messages', totalMsgs)}
    ${statCard('Active Days',    dates.length)}
    ${statCard('Avg / Day',      avgPerDay)}
    ${statCard('Peak Day', formatDisplayDate(peakDate), maxCount + ' msgs')}
  `;

  const displayDates = [...dates].reverse().slice(0, 60);
  frequencyTableBody.innerHTML = '';

  for (const date of displayDates) {
    const count = frequencyMap[date];
    const pct   = Math.round((count / maxCount) * 100);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDisplayDate(date)}</td>
      <td>${count}</td>
      <td>
        <div class="wa-bar-track">
          <div class="wa-bar-fill" style="width:${pct}%"></div>
        </div>
      </td>
    `;
    frequencyTableBody.appendChild(tr);
  }

  if (dates.length > 60) {
    const info = document.createElement('tr');
    info.innerHTML = `
      <td colspan="3" class="wa-table-note">
        Showing 60 most recent days of ${dates.length} total active days.
      </td>
    `;
    frequencyTableBody.appendChild(info);
  }
}

// ── Utility: stat card HTML ──────────────────────────────────
function statCard(label, value, sub = '') {
  return `
    <div class="wa-stat-card">
      <p>${label}</p>
      <h2>${value}</h2>
      ${sub ? `<small>${sub}</small>` : ''}
    </div>
  `;
}

// ── Utility: format YYYY-MM-DD to readable ───────────────────
function formatDisplayDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── Utility: show message ────────────────────────────────────
function showMessage(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className   = 'wa-message' + (type ? ' ' + type : '');
}

// ── On load: restore previous upload if available ────────────
(function restorePreviousUpload() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isAdmin()) {
      parseChat(saved);
      showMessage(uploadMessage, '↩ Previous chat data restored from session.', 'success');
    }
  } catch {
    // storage not available — silent fail
  }
})();