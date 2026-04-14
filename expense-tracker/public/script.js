// ==================== DOM ELEMENTS ====================
const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const analyzeBtn = document.getElementById('analyze-btn');
const aiAdviceText = document.getElementById('ai-advice-text');

// Login / Reset elements
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const resetContainer = document.getElementById('reset-container');
const loginContainer = document.getElementById('login-container');
const forgotLink = document.getElementById('forgot-pwd-link');
const backToLoginLink = document.getElementById('back-to-login-link');
const resetForm = document.getElementById('reset-form');

// Filter elements
const monthFilter = document.getElementById('month-filter');
const yearFilter = document.getElementById('year-filter');

const API_URL = 'http://localhost:3000/api/transactions';
let transactions = [];
let allTransactions = []; // store full list for filtering
let expenseChart = null;

// Auth token
const token = localStorage.getItem('token');

// ==================== HELPER FUNCTIONS ====================
function getIconForCategory(category) {
    const icons = {
        'Food': 'fa-solid fa-burger',
        'Salary': 'fa-solid fa-money-bill-wave',
        'Rent': 'fa-solid fa-house',
        'Transport': 'fa-solid fa-car',
        'Shopping': 'fa-solid fa-bag-shopping',
        'Entertainment': 'fa-solid fa-film',
        'Utilities': 'fa-solid fa-bolt',
        'Other': 'fa-solid fa-circle-dollar-to-slot'
    };
    return icons[category] || 'fa-solid fa-tag';
}

function formatMoney(number) {
    return number.toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    });
}

// ==================== DATABASE OPERATIONS ====================
async function getTransactions() {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    try {
        const res = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return;
        }
        const data = await res.json();
        allTransactions = data;
        transactions = [...allTransactions];
        populateFilterDropdowns();
        applyFilters();
        init();
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

async function addTransaction(e) {
    e.preventDefault();

    if (text.value.trim() === '' || amount.value.trim() === '') {
        alert('Please add text and amount');
        return;
    }

    const newTransaction = {
        text: text.value,
        amount: +amount.value,
        category: categorySelect.value,
        icon: getIconForCategory(categorySelect.value)
    };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newTransaction)
        });

        if (res.ok) {
            await getTransactions(); // Refresh list
            text.value = '';
            amount.value = '';
        }
    } catch (err) {
        console.error('Error adding transaction:', err);
    }
}

async function removeTransaction(id, element) {
    const listItem = element.parentElement;
    listItem.classList.add('animate-delete');

    setTimeout(async () => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) await getTransactions();
        } catch (err) {
            console.error('Error deleting transaction:', err);
        }
    }, 400);
}

// ==================== FILTERING ====================
function populateFilterDropdowns() {
    if (!monthFilter || !yearFilter) return;
    
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const years = [...new Set(allTransactions.map(t => new Date(t.created_at).getFullYear()))];
    
    monthFilter.innerHTML = '<option value="all">All Months</option>';
    months.forEach((m, i) => {
        monthFilter.innerHTML += `<option value="${i+1}">${m}</option>`;
    });
    
    yearFilter.innerHTML = '<option value="all">All Years</option>';
    years.sort().forEach(y => {
        yearFilter.innerHTML += `<option value="${y}">${y}</option>`;
    });
}

function applyFilters() {
    if (!monthFilter || !yearFilter) return;
    
    const month = monthFilter.value;
    const year = yearFilter.value;
    
    let filtered = allTransactions;
    if (month !== 'all') {
        filtered = filtered.filter(t => new Date(t.created_at).getMonth()+1 == month);
    }
    if (year !== 'all') {
        filtered = filtered.filter(t => new Date(t.created_at).getFullYear() == year);
    }
    
    transactions = filtered;
    if (list) {
        list.innerHTML = '';
        transactions.forEach(tx => addTransactionDOM(tx));
    }
    updateValues();
}

// ==================== UI RENDERING ====================
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
            <i class="${transaction.icon || getIconForCategory(transaction.category)}"></i>
            <div style="display:flex; flex-direction:column;">
                <span>${transaction.text}</span>
                <small style="color:var(--text-muted); font-size:12px;">${transaction.category || 'Other'}</small>
            </div>
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

    if (balance) balance.innerText = `₹${formatMoney(total)}`;
    if (money_plus) money_plus.innerText = `+₹${formatMoney(income)}`;
    if (money_minus) money_minus.innerText = `-₹${formatMoney(expense)}`;

    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx) return;

    const expensesByCategory = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
        const cat = t.category || 'Other';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Math.abs(t.amount);
    });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    if (expenseChart) expenseChart.destroy();
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#ef4444','#f97316','#eab308','#10b981','#3b82f6','#8b5cf6','#ec4899'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#f0f2f8' } }
            }
        }
    });
}

// ==================== AI ADVISOR ====================
async function generateAIAdvice() {
    if (!aiAdviceText) return;
    aiAdviceText.textContent = 'Thinking...';

    // Use rule-based as fallback if AI endpoint fails
    const ruleBasedAdvice = () => {
        const total = transactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
        const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + parseFloat(t.amount), 0);
        const expense = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + parseFloat(t.amount), 0) * -1;

        if (transactions.length === 0) return "Add some transactions to get personalized financial advice.";
        if (total < 0) return "⚠️ You're spending more than you earn. Consider reducing non-essential expenses.";
        if (expense > income * 0.8) return "💡 You're saving less than 20% of your income. Try to increase your savings rate.";
        return "✅ Great job! Your finances look healthy. Keep tracking and stay consistent.";
    };

    try {
        const res = await fetch('http://localhost:3000/api/ai-advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ transactions })
        });
        const data = await res.json();
        aiAdviceText.textContent = data.advice || ruleBasedAdvice();
    } catch (err) {
        aiAdviceText.textContent = ruleBasedAdvice();
    }
    aiAdviceText.classList.add('typing-effect');
    setTimeout(() => aiAdviceText.classList.remove('typing-effect'), 2000);
}

// ==================== EVENT LISTENERS ====================
if (form) form.addEventListener('submit', addTransaction);
if (analyzeBtn) analyzeBtn.addEventListener('click', generateAIAdvice);
if (monthFilter) monthFilter.addEventListener('change', applyFilters);
if (yearFilter) yearFilter.addEventListener('change', applyFilters);

// Login simulation (replace with real API calls if desired)
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        // For demo, accept any non-empty and store dummy token
        if (username && password) {
            // In a real app, you'd call /api/login here
            localStorage.setItem('token', 'demo-token');
            window.location.href = 'dashboard.html';
        } else {
            loginError.style.display = 'block';
        }
    });
}

if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.style.display = 'none';
        resetContainer.style.display = 'block';
    });
}

if (backToLoginLink) {
    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        resetContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });
}

if (resetForm) {
    resetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Password reset simulated. You can now login with any password.');
        resetContainer.style.display = 'none';
        loginContainer.style.display = 'block';
    });
}

// Navigation
const navDashboard = document.getElementById('nav-dashboard');
const navHistory = document.getElementById('nav-history');
const navLogout = document.getElementById('nav-logout');

if (navDashboard) navDashboard.addEventListener('click', () => window.location.href = 'dashboard.html');
if (navHistory) navHistory.addEventListener('click', () => window.location.href = 'history.html');
if (navLogout) {
    navLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'index.html';
    });
}

// Initial load
if (token || window.location.pathname.includes('index.html')) {
    // Only fetch if not on login page
    if (!window.location.pathname.includes('index.html')) {
        getTransactions();
    }
} else {
    // Redirect to login if no token and not already there
    if (!window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
    }
}