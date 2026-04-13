const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const analyzeBtn = document.getElementById('analyze-btn');
const aiAdviceText = document.getElementById('ai-advice-text');

const API_URL = 'http://localhost:3000/api/transactions';
let transactions = [];

// 1. DATABASE OPERATIONS

// Fetch Transactions from Backend
async function getTransactions() {
  try {
    const res = await fetch(API_URL);
    transactions = await res.json();
    init();
  } catch (err) {
    console.error('Error fetching data:', err);
  }
}

// Add Transaction to Backend
async function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add text and amount');
    return;
  }

  const newTransaction = {
    text: text.value,
    amount: +amount.value,
    icon: getIconForText(text.value)
  };

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTransaction)
    });

    if (res.ok) {
      getTransactions(); // Refresh list from DB
      text.value = '';
      amount.value = '';
    }
  } catch (err) {
    console.error('Error adding transaction:', err);
  }
}

// Remove Transaction from Backend
async function removeTransaction(id, element) {
  const listItem = element.parentElement;
  listItem.classList.add('animate-delete');
  
  setTimeout(async () => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) getTransactions();
    } catch (err) {
      console.error('Error deleting transaction:', err);
    }
  }, 400);
}

// 2. UI RENDERING LOGIC

function init() {
  if (list) {
    list.innerHTML = '';
    transactions.forEach(tx => addTransactionDOM(tx));
  }
  updateValues();
}

function addTransactionDOM(transaction) {
  if (!list) return;
  const sign = transaction.amount < 0 ? '-' : '+';
  const item = document.createElement('li');

  item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
  
  item.innerHTML = `
    <div class="details">
        <i class="${transaction.icon || getIconForText(transaction.text)}"></i>
        <span>${transaction.text}</span>
    </div>
    <span class="amount">${sign}₹${formatMoney(Math.abs(transaction.amount))}</span>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id}, this)">
      <i class="fa-solid fa-trash"></i>
    </button>
  `;

  list.appendChild(item);
}

function updateValues() {
  const amounts = transactions.map(t => parseFloat(t.amount));
  const total = amounts.reduce((acc, item) => (acc += item), 0);
  const income = amounts.filter(item => item > 0).reduce((acc, item) => (acc += item), 0);
  const expense = amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1;

  if(balance) balance.innerText = `₹${formatMoney(total)}`;
  if(money_plus) money_plus.innerText = `+₹${formatMoney(income)}`;
  if(money_minus) money_minus.innerText = `-₹${formatMoney(expense)}`;
}

function formatMoney(number) {
  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

function getIconForText(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('food') || lowerText.includes('lunch')) return 'fa-solid fa-burger';
  if (lowerText.includes('salary') || lowerText.includes('earn')) return 'fa-solid fa-money-bill-wave';
  if (lowerText.includes('rent') || lowerText.includes('home')) return 'fa-solid fa-house';
  return 'fa-solid fa-circle-dollar-to-slot';
}

// 3. EVENT LISTENERS

if (form) form.addEventListener('submit', addTransaction);

// Initial Load
window.onload = getTransactions;

// Navigation Logic
const navDashboard = document.getElementById('nav-dashboard');
const navHistory = document.getElementById('nav-history');
const navLogout = document.getElementById('nav-logout');

if (navDashboard) navDashboard.addEventListener('click', () => window.location.href = 'dashboard.html');
if (navHistory) navHistory.addEventListener('click', () => window.location.href = 'history.html');
if (navLogout) navLogout.addEventListener('click', () => window.location.href = 'index.html');