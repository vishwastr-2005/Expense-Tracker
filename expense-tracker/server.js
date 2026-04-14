require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' folder

// Optional: CSP header
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; connect-src 'self' http://localhost:3000; img-src 'self' data:;"
    );
    next();
});

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'expensetracker',
    connectTimeout: 10000
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to MySQL Database!');
});

// ==================== AUTH ROUTES ====================
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username already taken' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = results[0];
        try {
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) return res.status(401).json({ error: 'Invalid credentials' });
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ token });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
});

// ==================== AUTH MIDDLEWARE ====================
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ==================== TRANSACTION ROUTES ====================
// GET all transactions for logged-in user
app.get('/api/transactions', authenticate, (req, res) => {
    const sql = 'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC';
    db.query(sql, [req.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST new transaction
app.post('/api/transactions', authenticate, (req, res) => {
    const { text, amount, category, icon } = req.body;
    if (!text || amount === undefined) {
        return res.status(400).json({ error: "Description and Amount are required" });
    }
    const sql = 'INSERT INTO transactions (user_id, text, amount, category, icon) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [req.userId, text, amount, category || 'Other', icon], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: result.insertId, text, amount, category, icon });
    });
});

// DELETE transaction
app.delete('/api/transactions/:id', authenticate, (req, res) => {
    const { id } = req.params;
    // Ensure user owns the transaction
    const sql = 'DELETE FROM transactions WHERE id = ? AND user_id = ?';
    db.query(sql, [id, req.userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Transaction not found' });
        res.json({ message: 'Transaction deleted successfully' });
    });
});

// ==================== AI ADVICE ENDPOINT ====================
app.post('/api/ai-advice', authenticate, async (req, res) => {
    const { transactions } = req.body;
    if (!transactions || transactions.length === 0) {
        return res.json({ advice: "Add some transactions to get personalized financial advice." });
    }

    // If you have a valid Gemini API key, uncomment the fetch block
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_API_KEY) {
        try {
            const summary = transactions.map(t => `${t.text} (${t.category}): ₹${t.amount}`).join('\n');
            const prompt = `You are a financial advisor. Based on these transactions, give a concise, friendly tip (max 2 sentences):\n${summary}`;
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });
            const data = await response.json();
            const advice = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
            if (advice) return res.json({ advice });
        } catch (err) {
            console.error('AI API error:', err);
        }
    }
    
    // Fallback to rule-based advice
    const total = transactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + parseFloat(t.amount), 0) * -1;

    let advice = '';
    if (total < 0) {
        advice = "⚠️ You're spending more than you earn. Consider reducing non-essential expenses.";
    } else if (expense > income * 0.8) {
        advice = "💡 You're saving less than 20% of your income. Try to increase your savings rate.";
    } else {
        advice = "✅ Great job! Your finances look healthy. Keep tracking and stay consistent.";
    }
    res.json({ advice });
});

// ==================== START SERVER ====================
app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});