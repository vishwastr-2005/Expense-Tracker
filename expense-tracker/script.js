const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const analyzeBtn = document.getElementById('analyze-btn');
const aiAdviceText = document.getElementById('ai-advice-text');

// Get transactions from local storage
const localStorageTransactions = JSON.parse(
  localStorage.getItem('transactions')
);

let transactions =
  localStorage.getItem('transactions') !== null ? localStorageTransactions : [];

// Automatically select an icon based on the description text
function getIconForText(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('food') || lowerText.includes('lunch') || lowerText.includes('dinner') || lowerText.includes('breakfast') || lowerText.includes('restaurant') || lowerText.includes('burger')) {
    return 'fa-solid fa-burger';
  } else if (lowerText.includes('salary') || lowerText.includes('income') || lowerText.includes('earn')) {
    return 'fa-solid fa-money-bill-wave';
  } else if (lowerText.includes('grocer') || lowerText.includes('market')) {
    return 'fa-solid fa-basket-shopping';
  } else if (lowerText.includes('rent') || lowerText.includes('house') || lowerText.includes('home')) {
    return 'fa-solid fa-house';
  } else if (lowerText.includes('car') || lowerText.includes('petrol') || lowerText.includes('fuel') || lowerText.includes('transport')) {
    return 'fa-solid fa-car';
  } else if (lowerText.includes('health') || lowerText.includes('doctor') || lowerText.includes('pharmacy') || lowerText.includes('hospital')) {
    return 'fa-solid fa-kit-medical';
  } else if (lowerText.includes('cloth') || lowerText.includes('shoes') || lowerText.includes('shopping')) {
    return 'fa-solid fa-shirt';
  } else if (lowerText.includes('movie') || lowerText.includes('entertainment') || lowerText.includes('game') || lowerText.includes('subscription')) {
    return 'fa-solid fa-film';
  } else if (lowerText.includes('bill') || lowerText.includes('electric') || lowerText.includes('water') || lowerText.includes('internet')) {
    return 'fa-solid fa-file-invoice-dollar';
  } else {
    // Default icons
    return 'fa-solid fa-circle-dollar-to-slot';
  }
}

// Add transaction
function addTransaction(e) {
  e.preventDefault();

  if (text.value.trim() === '' || amount.value.trim() === '') {
    alert('Please add a text and amount');
    return;
  }

  const transaction = {
    id: generateID(),
    text: text.value,
    amount: +amount.value,
    icon: getIconForText(text.value)
  };

  transactions.unshift(transaction);

  if (list) {
      list.innerHTML = '';
      transactions.forEach(tx => addTransactionDOM(tx));
  }

  updateValues();
  updateLocalStorage();

  text.value = '';
  amount.value = '';
}

// Generate random ID
function generateID() {
  return Math.floor(Math.random() * 100000000);
}

// Format numbers as currency
function formatMoney(number) {
  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

// Add transactions to DOM list
function addTransactionDOM(transaction, isNew = false) {
  if (!list) return;
  // Get sign
  const sign = transaction.amount < 0 ? '-' : '+';

  const item = document.createElement('li');

  // Add class based on value
  item.classList.add(transaction.amount < 0 ? 'minus' : 'plus');
  
  if (isNew) {
    item.classList.add('animate-add');
  }

  item.innerHTML = `
    <div class="details">
        <i class="${transaction.icon || getIconForText(transaction.text)}"></i>
        <span>${transaction.text}</span>
    </div>
    <span class="amount">${sign}₹${formatMoney(Math.abs(transaction.amount))}</span>
    <button class="delete-btn" onclick="removeTransaction(${transaction.id}, this)"><i class="fa-solid fa-trash"></i></button>
  `;

  list.appendChild(item);
  
  // Remove animation class after it completes
  if (isNew) {
    setTimeout(() => {
      item.classList.remove('animate-add');
    }, 400);
  }
}

// Update the balance, income and expense
function updateValues() {
  const amounts = transactions.map(transaction => transaction.amount);

  const total = amounts.reduce((acc, item) => (acc += item), 0);

  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0);

  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) *
    -1
  );

  if(balance) balance.innerText = `₹${formatMoney(total)}`;
  if(money_plus) money_plus.innerText = `+₹${formatMoney(income)}`;
  if(money_minus) money_minus.innerText = `-₹${formatMoney(expense)}`;
}

// Remove transaction by ID
function removeTransaction(id, element) {
  // Add animation class before removing
  const listItem = element.parentElement;
  listItem.classList.add('animate-delete');
  
  setTimeout(() => {
    transactions = transactions.filter(transaction => transaction.id !== id);
    updateLocalStorage();
    init();
  }, 400); // Wait for animation to finish
}

// Update local storage transactions
function updateLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Init app
function init() {
  if (list) {
    list.innerHTML = '';
    transactions.forEach(tx => addTransactionDOM(tx));
  }
  updateValues();
}

// Fetch only on authorized pages
if (document.getElementById('list') || document.getElementById('balance')) {
    init();
}

if (form) {
  form.addEventListener('submit', addTransaction);
}

// AI Analysis Logic
function analyzeTransactions() {
  if (transactions.length === 0) {
    aiAdviceText.innerText = "Please add some transactions first so I can analyze them.";
    return;
  }

  aiAdviceText.innerHTML = '<span class="typing-effect">Analyzing your spending patterns...</span>';
  
  setTimeout(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0);
    const totalExpense = expenses.reduce((acc, t) => acc + Math.abs(t.amount), 0);
    
    if (totalExpense === 0 && income === 0) {
       aiAdviceText.innerText = "Add real amounts to get started.";
       return;
    }

    let advice = "";

    // General & Budgeting analysis
    if (income > 0) {
      const savingsRate = ((income - totalExpense) / income) * 100;
      if (savingsRate > 20) {
        advice += `Great job! You are saving ${savingsRate.toFixed(1)}% of your income. Consider investing this surplus in mutual funds, stocks, or a high-yield savings account rather than leaving it idle.\n\n`;
      } else if (savingsRate > 0) {
        advice += `You are saving ${savingsRate.toFixed(1)}% of your income. Try to reduce discretionary spending to reach an ideal 20% savings goal.\n\n`;
      } else {
        advice += "Warning: You are spending more than you earn! You need to closely monitor your expenses to avoid falling into debt.\n\n";
      }
      
      // 50/30/20 Rule Idea
      advice += `💡 Ideal 50/30/20 Budget for your Income:\n`;
      advice += `• Needs (50%): ₹${formatMoney(income * 0.5)}\n`;
      advice += `• Wants (30%): ₹${formatMoney(income * 0.3)}\n`;
      advice += `• Savings (20%): ₹${formatMoney(income * 0.2)}\n\n`;
      
    } else if (totalExpense > 0) {
       advice += "You have expenses but no recorded income. Make sure you are tracking your income sources to get an accurate financial picture.\n\n";
    }

    // Category analysis
    let categories = { Food: 0, Transportation: 0, Housing: 0, Entertainment: 0, Health: 0, Utilities: 0, Other: 0 };
    expenses.forEach(t => {
      const lowerText = t.text.toLowerCase();
      if (lowerText.includes('food') || lowerText.includes('lunch') || lowerText.includes('dinner') || lowerText.includes('restaurant') || lowerText.includes('burger')) {
        categories.Food += Math.abs(t.amount);
      } else if (lowerText.includes('car') || lowerText.includes('petrol') || lowerText.includes('fuel')) {
        categories.Transportation += Math.abs(t.amount);
      } else if (lowerText.includes('rent') || lowerText.includes('house')) {
        categories.Housing += Math.abs(t.amount);
      } else if (lowerText.includes('movie') || lowerText.includes('entertainment') || lowerText.includes('game')) {
        categories.Entertainment += Math.abs(t.amount);
      } else if (lowerText.includes('health') || lowerText.includes('doctor') || lowerText.includes('pharmacy') || lowerText.includes('hospital')) {
        categories.Health += Math.abs(t.amount);
      } else if (lowerText.includes('bill') || lowerText.includes('electric') || lowerText.includes('water') || lowerText.includes('internet')) {
        categories.Utilities += Math.abs(t.amount);
      } else {
        categories.Other += Math.abs(t.amount);
      }
    });

    let highestCategory = 'Other';
    let highestAmount = 0;
    for (const [cat, amt] of Object.entries(categories)) {
      if (amt > highestAmount && cat !== 'Other') {
        highestAmount = amt;
        highestCategory = cat;
      }
    }

    if (highestAmount > 0) {
      advice += `📈 Your highest tracked expense is ${highestCategory} (₹${formatMoney(highestAmount)}).\n`;
      if (highestCategory === 'Food') {
        advice += "👉 Consider cooking meals at home or meal prepping to reduce food expenses.";
      } else if (highestCategory === 'Entertainment') {
        advice += "👉 Review your subscriptions and entertainment to see where you can trim costs without losing fun.";
      } else if (highestCategory === 'Transportation') {
        advice += "👉 Look into public transit, carpooling, or better trip planning to save on fuel.";
      } else if (highestCategory === 'Housing') {
        advice += "👉 Housing is typically a fixed cost, but ensure your energy usage and maintenance are optimal.";
      } else if (highestCategory === 'Health') {
        advice += "👉 Health comes first! Keep an eye out for preventative care which can save long-term costs.";
      } else if (highestCategory === 'Utilities') {
        advice += "👉 Unplug idle appliances and check for leaks to save on electricity and utility bills.";
      }
    }

    if (advice === "") {
        advice = "Your finances look stable, but keep adding more detailed transactions for better insights!";
    }

    aiAdviceText.innerHTML = '';
    
    // Typewriter effect
    let i = 0;
    aiAdviceText.classList.add('typing-effect');
    aiAdviceText.style.animation = 'none'; // stop blinking cursor during type
    
    const speed = 15; // ms per char
    function typeWriter() {
      if (i < advice.length) {
        aiAdviceText.innerHTML += advice.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
      } else {
        aiAdviceText.style.animation = ''; // restore blink
      }
    }
    typeWriter();

  }, 1200); // Simulate AI thinking time
}

if (analyzeBtn) {
  analyzeBtn.addEventListener('click', analyzeTransactions);
}

// Auth & Login Logic
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

if (loginForm) {
  // Use "admin" and "password123" as defaults if none is set in local storage
  if (!localStorage.getItem('appUsername')) {
    localStorage.setItem('appUsername', 'admin');
  }
  if (!localStorage.getItem('appPassword')) {
    localStorage.setItem('appPassword', 'password123');
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    
    const currentU = localStorage.getItem('appUsername');
    const currentP = localStorage.getItem('appPassword');
    
    if (u === currentU && p === currentP) {
      window.location.href = 'dashboard.html';
    } else {
      loginError.style.display = 'block';
    }
  });

  const forgotPwdLink = document.getElementById('forgot-pwd-link');
  const loginContainer = document.getElementById('login-container');
  const resetContainer = document.getElementById('reset-container');
  const backToLoginLink = document.getElementById('back-to-login-link');
  const resetForm = document.getElementById('reset-form');
  const resetError = document.getElementById('reset-error');
  
  if (forgotPwdLink && resetContainer) {
    forgotPwdLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginContainer.style.display = 'none';
      resetContainer.style.display = 'block';
      loginError.style.display = 'none';
    });
    
    backToLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetContainer.style.display = 'none';
      loginContainer.style.display = 'block';
      resetError.style.display = 'none';
    });
    
    resetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const ru = document.getElementById('reset-username').value;
      const np = document.getElementById('new-password').value;
      
      const currentU = localStorage.getItem('appUsername');
      
      if (ru === currentU) {
        localStorage.setItem('appPassword', np);
        alert('Password updated successfully!');
        resetContainer.style.display = 'none';
        loginContainer.style.display = 'block';
        resetError.style.display = 'none';
        resetForm.reset();
      } else {
        resetError.style.display = 'block';
      }
    });
  }
}

// Navigation Logic
const navDashboard = document.getElementById('nav-dashboard');
const navHistory = document.getElementById('nav-history');
const navLogout = document.getElementById('nav-logout');

if (navDashboard) {
  navDashboard.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });
}

if (navHistory) {
  navHistory.addEventListener('click', () => {
    window.location.href = 'history.html';
  });
}

if (navLogout) {
  navLogout.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
}
