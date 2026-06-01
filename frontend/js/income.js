const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

if (!loggedInUser) {
  window.location.href = 'login.html';
}

if (loggedInUser && loggedInUser.role !== 'admin') {
  alert('Admin access required.');
  window.location.href = 'dashboard.html';
}

const incomeForm = document.getElementById('incomeForm');
const expenseForm = document.getElementById('expenseForm');
const financialRecordsTableBody = document.getElementById('financialRecordsTableBody');
const financeMessage = document.getElementById('financeMessage');

const totalIncomeDisplay = document.getElementById('totalIncomeDisplay');
const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
const balanceDisplay = document.getElementById('balanceDisplay');
const balanceCard = document.getElementById('balanceCard');
const balanceWarning = document.getElementById('balanceWarning');

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
let expenseTransactions = JSON.parse(localStorage.getItem('expenseTransactions')) || [];

incomeForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const amount = Number(document.getElementById('incomeAmount').value);
  const date = document.getElementById('incomeDate').value;
  const category = document.getElementById('incomeCategory').value;
  const description = document.getElementById('incomeDescription').value.trim();

  if (!amount || amount <= 0 || !date || !category || !description) {
    showFinanceMessage('Please fill in all income fields correctly.', 'error');
    return;
  }

  const incomeRecord = {
    amount,
    date,
    category,
    description,
    type: 'income'
  };

  incomeTransactions.push(incomeRecord);
  localStorage.setItem('incomeTransactions', JSON.stringify(incomeTransactions));

  incomeForm.reset();
  showFinanceMessage('Income transaction saved successfully.', 'success');
  updateFinanceModule();
});

expenseForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const amount = Number(document.getElementById('expenseAmount').value);
  const date = document.getElementById('expenseDate').value;
  const category = document.getElementById('expenseCategory').value;
  const description = document.getElementById('expenseDescription').value.trim();

  if (!amount || amount <= 0 || !date || !category || !description) {
    showFinanceMessage('Please fill in all expense fields correctly.', 'error');
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
  showFinanceMessage('Expense transaction saved successfully.', 'success');
  updateFinanceModule();
});

function updateFinanceModule() {
  renderFinancialRecords();
  updateFinancialSummary();
}

function renderFinancialRecords() {
  financialRecordsTableBody.innerHTML = '';

  const allTransactions = [
    ...incomeTransactions.map(transaction => ({
      ...transaction,
      type: transaction.type || 'income'
    })),
    ...expenseTransactions.map(transaction => ({
      ...transaction,
      type: transaction.type || 'expense'
    }))
  ];

  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (allTransactions.length === 0) {
    financialRecordsTableBody.innerHTML = `
      <tr>
        <td colspan="5">No financial transactions recorded yet.</td>
      </tr>
    `;
    return;
  }

  allTransactions.forEach(transaction => {
    const row = document.createElement('tr');

    const transactionType = transaction.type === 'expense' ? 'Expense' : 'Income';
    const typeClass = transaction.type === 'expense' ? 'finance-type-expense' : 'finance-type-income';

    row.innerHTML = `
      <td><span class="${typeClass}">${transactionType}</span></td>
      <td>€${Number(transaction.amount).toFixed(2)}</td>
      <td>${transaction.date}</td>
      <td>${transaction.category}</td>
      <td>${transaction.description}</td>
    `;

    financialRecordsTableBody.appendChild(row);
  });
}

function updateFinancialSummary() {
  const totalIncome = incomeTransactions.reduce((sum, transaction) => {
    return sum + Number(transaction.amount);
  }, 0);

  const totalExpenses = expenseTransactions.reduce((sum, transaction) => {
    return sum + Number(transaction.amount);
  }, 0);

  const balance = totalIncome - totalExpenses;

  totalIncomeDisplay.textContent = `€${totalIncome.toFixed(2)}`;
  totalExpensesDisplay.textContent = `€${totalExpenses.toFixed(2)}`;
  balanceDisplay.textContent = `€${balance.toFixed(2)}`;

  if (balance < 0) {
    balanceCard.classList.add('negative-balance');
    balanceWarning.classList.remove('hidden');
  } else {
    balanceCard.classList.remove('negative-balance');
    balanceWarning.classList.add('hidden');
  }
}

function showFinanceMessage(message, type) {
  financeMessage.textContent = message;
  financeMessage.className = `role-message ${type}`;

  setTimeout(() => {
    financeMessage.className = 'role-message hidden';
  }, 2500);
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  sessionStorage.removeItem('loggedInUser');
  window.location.href = 'login.html';
}

updateFinanceModule();