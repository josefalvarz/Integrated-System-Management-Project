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
const peakHoursSection     = document.getElementById('peakHoursSection');
const peakHoursSummaryGrid = document.getElementById('peakHoursSummaryGrid');
const peakHoursTableBody   = document.getElementById('peakHoursTableBody');
const filterSection        = document.getElementById('filterSection');
const filterStatus         = document.getElementById('filterStatus');

// Active filter state — period is one of: 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'
let activeFilter = { period: 'all', value: '' };

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
  analysePeakHours();
  analyseMessageTypes();
  analyseSentiment();
  detectSpam();
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
  if (peakHoursSection) peakHoursSection.classList.add('hidden');
  if (filterSection)    filterSection.classList.add('hidden');
  const messageTypesSection = document.getElementById('messageTypesSection');
  if (messageTypesSection) messageTypesSection.classList.add('hidden');
  const sentimentSection = document.getElementById('sentimentSection');
  if (sentimentSection) sentimentSection.classList.add('hidden');
  const spamSection = document.getElementById('spamSection');
  if (spamSection) spamSection.classList.add('hidden');
}

function renderParseSummary() {
  parseSummarySection.classList.remove('hidden');
  if (filterSection) filterSection.classList.remove('hidden');

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

  const msgs = getMessages();
  if (!msgs || msgs.length === 0) {
    activitySection.classList.remove('hidden');
    mostActiveList.innerHTML  = '';
    leastActiveList.innerHTML = '';
    activityTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:2rem; color:#6b7280;">
          No messages found for the selected period.
        </td>
      </tr>
    `;
    return;
  }

  // Count messages per sender
  const senderMap = {};
  for (const msg of msgs) {
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

  const msgs = getMessages();
  const frequencyMap = {};
  for (const msg of msgs) {
    frequencyMap[msg.date] = (frequencyMap[msg.date] || 0) + 1;
  }

  const dates  = Object.keys(frequencyMap).sort();
  const counts = dates.map(d => frequencyMap[d]);

  if (dates.length === 0) {
    frequencySummaryGrid.innerHTML = '';
    frequencyTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:2rem; color:#6b7280;">
          No messages found for the selected period.
        </td>
      </tr>
    `;
    return;
  }

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

// ────────────────────────────────────────────────────────────
// DATE FILTER — shared by S29, S30, S31
// ────────────────────────────────────────────────────────────

// Returns the ISO Monday–Sunday range for a week-input value like "2024-W03"
function getWeekRange(weekValue) {
  const [yearStr, weekPart] = weekValue.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  // ISO week 1 is the week containing Jan 4
  const jan4    = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;          // Mon=1 … Sun=7
  const monday  = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1 + (week - 1) * 7);
  const sunday  = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to:   sunday.toISOString().slice(0, 10),
  };
}

// Returns the subset of parsedMessages that matches the active filter.
// Returns the full array when period is 'all' or no value is selected yet.
function getMessages() {
  if (activeFilter.period === 'all' || !activeFilter.value) return parsedMessages;

  const val = activeFilter.value;

  switch (activeFilter.period) {
    case 'daily':
      return parsedMessages.filter(m => m.date === val);
    case 'weekly': {
      const range = getWeekRange(val);
      return parsedMessages.filter(m => m.date >= range.from && m.date <= range.to);
    }
    case 'monthly':
      return parsedMessages.filter(m => m.date.startsWith(val));
    case 'yearly':
      return parsedMessages.filter(m => m.date.startsWith(val));
    default:
      return parsedMessages;
  }
}

// Called when the user clicks one of the period buttons (All Time / Daily / etc.)
function selectPeriod(period) {
  activeFilter.period = period;
  activeFilter.value  = '';

  // Highlight the active button
  ['all', 'daily', 'weekly', 'monthly', 'yearly'].forEach(p => {
    const btn = document.getElementById(`filterBtn-${p}`);
    if (btn) btn.classList.toggle('active', p === period);
  });

  const inputArea = document.getElementById('filterInputArea');
  const label     = document.getElementById('filterInputLabel');
  const input     = document.getElementById('filterDateInput');

  // "All Time" — hide the date picker and immediately re-run analyses
  if (period === 'all') {
    inputArea.classList.add('hidden');
    showMessage(filterStatus, '', '');
    analyseFrequency();
    analyseUserActivity();
    analysePeakHours();
    analyseMessageTypes();
    analyseSentiment();
    detectSpam();
    return;
  }

  // Show the date picker configured for the chosen period
  inputArea.classList.remove('hidden');
  input.value = '';

  switch (period) {
    case 'daily':
      label.textContent = 'Select a day:';
      input.type        = 'date';
      input.placeholder = '';
      break;
    case 'weekly':
      label.textContent = 'Select a week:';
      input.type        = 'week';
      input.placeholder = '';
      break;
    case 'monthly':
      label.textContent = 'Select a month:';
      input.type        = 'month';
      input.placeholder = '';
      break;
    case 'yearly':
      label.textContent = 'Enter a year:';
      input.type        = 'number';
      input.min         = '2000';
      input.max         = '2100';
      input.placeholder = 'e.g. 2024';
      break;
  }

  showMessage(filterStatus, '', '');
}

// Called automatically whenever the date input changes (oninput on the element)
function applyFilter() {
  const input = document.getElementById('filterDateInput');
  const val   = (input ? input.value : '').trim();

  if (!val) return;

  activeFilter.value = val;

  // Build a human-readable status label
  let label = '';
  switch (activeFilter.period) {
    case 'daily':
      label = `Showing data for ${formatDisplayDate(val)}`;
      break;
    case 'weekly': {
      const r = getWeekRange(val);
      label = `Showing week of ${formatDisplayDate(r.from)} – ${formatDisplayDate(r.to)}`;
      break;
    }
    case 'monthly': {
      const [y, m] = val.split('-');
      const months = ['Jan','Feb','Mar','Apr','May','Jun',
                      'Jul','Aug','Sep','Oct','Nov','Dec'];
      label = `Showing data for ${months[parseInt(m, 10) - 1]} ${y}`;
      break;
    }
    case 'yearly':
      label = `Showing data for year ${val}`;
      break;
  }

  showMessage(filterStatus, label, 'success');
  analyseFrequency();
  analyseUserActivity();
  analysePeakHours();
  analyseMessageTypes();
  analyseSentiment();
  detectSpam();
}

// ────────────────────────────────────────────────────────────
// S31 — Detect Peak Chat Hours
// ────────────────────────────────────────────────────────────

// Converts a time string like "10:30 AM", "14:30", "10:30:45 AM" to a
// 24-hour integer (0–23). Returns null if the string cannot be parsed.
function extractHour(timeStr) {
  const t = timeStr.trim();

  // 12-hour format with AM/PM  e.g. "10:30 AM" or "10:30:45 PM"
  const amPmMatch = t.match(/^(\d{1,2}):\d{2}(?::\d{2})?\s*([APap][Mm])$/);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const period = amPmMatch[2].toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return hour;
  }

  // 24-hour format  e.g. "14:30" or "14:30:45"
  const match24 = t.match(/^(\d{1,2}):/);
  if (match24) return parseInt(match24[1], 10);

  return null;
}

// Converts a 24-hour integer to a readable label  e.g. 14 → "2 PM"
function formatHour(hour) {
  if (hour === 0)  return '12 AM (Midnight)';
  if (hour === 12) return '12 PM (Noon)';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function analysePeakHours() {
  if (!peakHoursSection) return;

  peakHoursSection.classList.remove('hidden');

  const msgs = getMessages();
  if (!msgs || msgs.length === 0) {
    peakHoursSummaryGrid.innerHTML = '';
    peakHoursTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:2rem; color:#6b7280;">
          No messages found for the selected period.
        </td>
      </tr>
    `;
    return;
  }

  // Step 1: Initialise a slot for every hour of the day
  const hourMap = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;

  // Step 2: Extract hour from each message timestamp and count
  for (const msg of msgs) {
    const hour = extractHour(msg.time);
    if (hour !== null && hour >= 0 && hour <= 23) {
      hourMap[hour]++;
    }
  }

  // Step 3: Identify peak hour
  const allCounts  = Object.values(hourMap);
  const maxCount   = Math.max(...allCounts);
  const peakHour   = parseInt(Object.keys(hourMap).find(h => hourMap[h] === maxCount), 10);
  const totalMsgs  = allCounts.reduce((a, b) => a + b, 0);
  const activeHours = allCounts.filter(c => c > 0).length;
  const avgPerHour  = Math.round(totalMsgs / 24);

  // Step 4: Render summary cards (Peak Chat Hour card is primary)
  peakHoursSummaryGrid.innerHTML = `
    ${statCard('Peak Chat Hour',   maxCount > 0 ? formatHour(peakHour) : 'N/A', maxCount > 0 ? maxCount + ' messages' : 'No data')}
    ${statCard('Messages at Peak', maxCount)}
    ${statCard('Active Hours',     activeHours + ' / 24')}
    ${statCard('Avg / Hour',       avgPerHour)}
  `;

  // Step 5: Render hourly activity table (all 24 hours, 0 → 23)
  peakHoursTableBody.innerHTML = '';
  for (let h = 0; h < 24; h++) {
    const count  = hourMap[h];
    const pct    = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
    const isPeak = h === peakHour && maxCount > 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatHour(h)}${isPeak ? ' ★' : ''}</td>
      <td>${count}</td>
      <td>
        <div class="wa-bar-track">
          <div class="wa-bar-fill" style="width:${pct}%"></div>
        </div>
      </td>
    `;
    peakHoursTableBody.appendChild(tr);
  }
}

// ────────────────────────────────────────────────────────────
// S32 — Analyse Text vs Media Messages
// ────────────────────────────────────────────────────────────
function analyseMessageTypes() {
  const section     = document.getElementById('messageTypesSection');
  const summaryGrid = document.getElementById('messageTypesSummaryGrid');
  const splitBarWrap = document.getElementById('messageTypesSplitBar');

  if (!section) return;

  section.classList.remove('hidden');

  const msgs = getMessages();

  if (!msgs || msgs.length === 0) {
    summaryGrid.innerHTML = '';
    splitBarWrap.innerHTML = `
      <p style="text-align:center; padding:2rem; color:#6b7280;">
        No messages found for the selected period.
      </p>
    `;
    return;
  }

  const mediaCount = msgs.filter(m => m.isMedia).length;
  const textCount  = msgs.length - mediaCount;
  const total      = msgs.length;

  // Avoid division by zero
  const textPct  = total > 0 ? Math.round((textCount  / total) * 100) : 0;
  const mediaPct = total > 0 ? 100 - textPct : 0;

  const dominantLabel = textCount >= mediaCount ? 'Text' : 'Media';

  summaryGrid.innerHTML = `
    ${statCard('Text Messages',  textCount,  textPct  + '% of total')}
    ${statCard('Media Messages', mediaCount, mediaPct + '% of total')}
    ${statCard('Total Messages', total)}
    ${statCard('Dominant Type',  dominantLabel)}
  `;

  // Visual split bar showing the text/media proportion
  splitBarWrap.innerHTML = `
    <div class="wa-type-split">
      <div class="wa-type-bar-text"  style="width:${textPct}%"  title="Text: ${textPct}%"></div>
      <div class="wa-type-bar-media" style="width:${mediaPct}%" title="Media: ${mediaPct}%"></div>
    </div>
    <div class="wa-type-legend">
      <span class="wa-type-legend-item">
        <span class="wa-type-dot wa-type-dot-text"></span>
        Text — ${textCount} messages (${textPct}%)
      </span>
      <span class="wa-type-legend-item">
        <span class="wa-type-dot wa-type-dot-media"></span>
        Media — ${mediaCount} messages (${mediaPct}%)
      </span>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────
// S33 — Basic Sentiment Classification
// ────────────────────────────────────────────────────────────

const POSITIVE_KEYWORDS = [
  'good', 'great', 'thanks', 'thank you', 'awesome', 'excellent', 'amazing',
  'wonderful', 'love', 'happy', 'perfect', 'fantastic', 'nice', 'brilliant',
  'well done', 'congratulations', 'congrats', 'helpful', 'appreciate',
  'beautiful', 'enjoy', 'glad', 'pleased', 'support', 'welcome',
  'absolutely', 'positive', 'proud', 'blessing', 'blessed', 'excited',
];

const NEGATIVE_KEYWORDS = [
  'bad', 'problem', 'angry', 'hate', 'terrible', 'awful', 'horrible',
  'wrong', 'issue', 'error', 'fail', 'failed', 'failure', 'broken',
  'sad', 'upset', 'disappointed', 'frustrating', 'frustrated', 'annoying',
  'annoyed', 'worried', 'concern', 'confused', 'disagree', 'complaint',
  'complain', 'unfortunately', 'incorrect', 'mistake', 'cancel',
  'not working', "doesn't work", 'delayed', 'missing', 'absent',
];

// Returns 'positive', 'negative', or 'neutral' for a message string.
// Counts how many keywords from each list appear in the lowercased content.
// Whichever side scores higher wins; a tie or zero matches → neutral.
function classifyMessageSentiment(content) {
  const lower = content.toLowerCase();

  const posScore = POSITIVE_KEYWORDS.filter(kw => lower.includes(kw)).length;
  const negScore = NEGATIVE_KEYWORDS.filter(kw => lower.includes(kw)).length;

  if (posScore === 0 && negScore === 0) return 'neutral';
  if (posScore > negScore)              return 'positive';
  if (negScore > posScore)              return 'negative';
  return 'neutral';
}

function analyseSentiment() {
  const section      = document.getElementById('sentimentSection');
  const summaryGrid  = document.getElementById('sentimentSummaryGrid');
  const splitBarWrap = document.getElementById('sentimentSplitBar');

  if (!section) return;

  section.classList.remove('hidden');

  // Only text messages carry readable content worth classifying
  const msgs = getMessages().filter(m => !m.isMedia);

  if (!msgs || msgs.length === 0) {
    summaryGrid.innerHTML = '';
    splitBarWrap.innerHTML = `
      <p style="text-align:center; padding:2rem; color:#6b7280;">
        No text messages found for the selected period.
      </p>
    `;
    return;
  }

  let positive = 0;
  let negative = 0;
  let neutral  = 0;

  for (const msg of msgs) {
    const sentiment = classifyMessageSentiment(msg.content);
    if      (sentiment === 'positive') positive++;
    else if (sentiment === 'negative') negative++;
    else                               neutral++;
  }

  const total  = msgs.length;
  const posPct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negPct = total > 0 ? Math.round((negative / total) * 100) : 0;
  // Derive neutral % from remainder so the three values always sum to 100
  const neuPct = total > 0 ? 100 - posPct - negPct : 0;

  summaryGrid.innerHTML = `
    ${statCard('Positive Messages', positive, posPct + '% of text messages')}
    ${statCard('Negative Messages', negative, negPct + '% of text messages')}
    ${statCard('Neutral Messages',  neutral,  neuPct + '% of text messages')}
    ${statCard('Text Messages Analysed', total)}
  `;

  splitBarWrap.innerHTML = `
    <div class="wa-sentiment-split">
      <div class="wa-sentiment-bar-pos" style="width:${posPct}%" title="Positive: ${posPct}%"></div>
      <div class="wa-sentiment-bar-neg" style="width:${negPct}%" title="Negative: ${negPct}%"></div>
      <div class="wa-sentiment-bar-neu" style="width:${neuPct}%" title="Neutral: ${neuPct}%"></div>
    </div>
    <div class="wa-type-legend">
      <span class="wa-type-legend-item">
        <span class="wa-type-dot wa-sentiment-dot-pos"></span>
        Positive — ${positive} messages (${posPct}%)
      </span>
      <span class="wa-type-legend-item">
        <span class="wa-type-dot wa-sentiment-dot-neg"></span>
        Negative — ${negative} messages (${negPct}%)
      </span>
      <span class="wa-type-legend-item">
        <span class="wa-type-dot wa-sentiment-dot-neu"></span>
        Neutral — ${neutral} messages (${neuPct}%)
      </span>
    </div>
  `;
}

// ────────────────────────────────────────────────────────────
// S34 — Detect Spam or Promotional Messages
// ────────────────────────────────────────────────────────────

const SPAM_KEYWORDS = [
  'buy now', 'discount', 'promo', 'click link', 'offer',
  'free', 'win', 'winner', 'limited time', 'act now',
  'click here', 'special deal', 'earn money', 'make money',
  'cash prize', 'subscribe now', 'sign up now',
];

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function detectSpam() {
  const section     = document.getElementById('spamSection');
  const summaryGrid = document.getElementById('spamSummaryGrid');
  const tableBody   = document.getElementById('spamTableBody');

  if (!section) return;

  section.classList.remove('hidden');

  const msgs = getMessages().filter(m => !m.isMedia);

  if (!msgs || msgs.length === 0) {
    summaryGrid.innerHTML = '';
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:2rem; color:#6b7280;">
          No text messages found for the selected period.
        </td>
      </tr>
    `;
    return;
  }

  // Check each message against the spam keyword list
  const spamMessages = [];
  for (const msg of msgs) {
    const lower   = msg.content.toLowerCase();
    const matched = SPAM_KEYWORDS.filter(kw => lower.includes(kw));
    if (matched.length > 0) {
      spamMessages.push({ ...msg, matchedKeywords: matched });
    }
  }

  summaryGrid.innerHTML = `
    ${statCard('Suspected Spam',        spamMessages.length)}
    ${statCard('Text Messages Scanned', msgs.length)}
  `;

  if (spamMessages.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:2rem; color:#4ade9a; font-weight:500;">
          No spam detected.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = '';
  for (const msg of spamMessages) {
    const tr  = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    const td3 = document.createElement('td');
    const td4 = document.createElement('td');

    td1.textContent = msg.sender;
    // Truncate very long messages so the table stays readable
    td2.textContent = msg.content.length > 160
      ? msg.content.substring(0, 160) + '…'
      : msg.content;
    // Keywords come from our own constant — safe to render as HTML
    td3.innerHTML = msg.matchedKeywords
      .map(kw => `<span class="wa-spam-kw">${escapeHtml(kw)}</span>`)
      .join(' ');
    td4.textContent = formatDisplayDate(msg.date);

    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tableBody.appendChild(tr);
  }
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