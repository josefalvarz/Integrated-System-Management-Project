const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

if (loggedInUser && loggedInUser.role !== 'admin') {
  alert('Admin access required.');
  window.location.href = 'dashboard.html';
}

const incomeForm = document.getElementById('incomeForm');
const incomeTableBody = document.getElementById('incomeTableBody');
const incomeMessage = document.getElementById('incomeMessage');

const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userInitials = document.getElementById('userInitials');

if (loggedInUser) {
  const name = loggedInUser.name || loggedInUser.email || 'User';

  userName.textContent = name;
  userRole.textContent = loggedInUser.role === 'admin' ? 'Administrator' : 'Member';

  userInitials.textContent = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

let incomeTransactions = JSON.parse(localStorage.getItem('incomeTransactions')) || [];

incomeForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const amount = Number(document.getElementById('incomeAmount').value);
  const date = document.getElementById('incomeDate').value;
  const category = document.getElementById('incomeCategory').value;
  const description = document.getElementById('incomeDescription').value.trim();

  if (!amount || amount <= 0 || !date || !category || !description) {
    showIncomeMessage('Please fill in all fields correctly.', 'error');
    return;
  }

  const incomeRecord = {
    amount,
    date,
    category,
    description
  };

  incomeTransactions.push(incomeRecord);
  localStorage.setItem('incomeTransactions', JSON.stringify(incomeTransactions));

  incomeForm.reset();
  showIncomeMessage('Income transaction saved successfully.', 'success');
  renderIncomeTransactions();
});

function renderIncomeTransactions() {
  incomeTableBody.innerHTML = '';

  incomeTransactions.forEach(transaction => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>€${transaction.amount.toFixed(2)}</td>
      <td>${transaction.date}</td>
      <td>${transaction.category}</td>
      <td>${transaction.description}</td>
    `;

    incomeTableBody.appendChild(row);
  });
}

function showIncomeMessage(message, type) {
  incomeMessage.textContent = message;
  incomeMessage.className = `role-message ${type}`;

  setTimeout(() => {
    incomeMessage.className = 'role-message hidden';
  }, 2500);
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('loggedInUser');
  window.location.href = 'login.html';
}

renderIncomeTransactions();