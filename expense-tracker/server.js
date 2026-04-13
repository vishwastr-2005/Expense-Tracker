require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// 1. MIDDLEWARE (Crucial for frontend-backend communication)
app.use(cors());
app.use(express.json());

// 2. MYSQL CONNECTION
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'expensetracker',
    // Helps prevent connection timeout issues
    connectTimeout: 10000 
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        console.log('TIP: Check if your .env password matches MySQL Workbench.');
        return;
    }
    console.log('Connected to MySQL Database!');
});

// 3. API ROUTES

// GET all transactions from database
// This MUST match the URL the browser is calling
app.get('/api/transactions', (req, res) => {
    const sql = 'SELECT * FROM transactions ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// POST a new transaction to database
app.post('/api/transactions', (req, res) => {
    const { text, amount, icon } = req.body;
    
    if (!text || amount === undefined) {
        return res.status(400).json({ error: "Description and Amount are required" });
    }

    const sql = 'INSERT INTO transactions (text, amount, icon) VALUES (?, ?, ?)';
    db.query(sql, [text, amount, icon], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: result.insertId, text, amount, icon });
    });
});

// DELETE a transaction by ID
app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM transactions WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaction deleted successfully' });
    });
});

// 4. START SERVER
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});