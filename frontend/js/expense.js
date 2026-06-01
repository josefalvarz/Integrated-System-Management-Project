const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

if (loggedInUser && loggedInUser.role !== 'admin') {
  alert('Admin access required.');
  window.location.href = 'dashboard.html';
}

const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const expenseMessage = document.getElementById('expenseMessage');

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

let expenseTransactions = JSON.parse(localStorage.getItem('expenseTransactions')) || [];

expenseForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const amount = Number(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  const category = document.getElementById('expenseCategory').value;
  const description = document.getElementById('expenseDescription').value.trim();

  if (!amount || amount <= 0 || !date || !category || !description) {
    showExpenseMessage('Please fill in all fields correctly.', 'error');
    return;
  }

  const expenseRecord = {
    amount,
    date,
    category,
    description,
    type: 'expense'
  };

  expenseTransactions.push(expenseRecord);
  localStorage.setItem('expenseTransactions', JSON.stringify(expenseTransactions));

  expenseForm.reset();
  showExpenseMessage('Expense transaction saved successfully.', 'success');
  renderExpenseTransactions();
});

function renderExpenseTransactions() {
  expenseTableBody.innerHTML = '';

  if (expenseTransactions.length === 0) {
    expenseTableBody.innerHTML = `
      <tr>
        <td colspan="4">No expense transactions recorded yet.</td>
      </tr>
    `;
    return;
  }

  expenseTransactions.forEach(transaction => {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>€${Number(transaction.amount).toFixed(2)}</td>
      <td>${transaction.date}</td>
      <td>${transaction.category}</td>
      <td>${transaction.description}</td>
    `;

    expenseTableBody.appendChild(row);
  });
}

function showExpenseMessage(message, type) {
  expenseMessage.textContent = message;
  expenseMessage.className = `role-message ${type}`;

  setTimeout(() => {
    expenseMessage.className = 'role-message hidden';
  }, 2500);
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('loggedInUser');
  window.location.href = 'login.html';
}

renderExpenseTransactions();