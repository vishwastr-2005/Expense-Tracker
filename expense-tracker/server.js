const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection
// IMPORTANT: Update 'root' and 'password' below with your MySQL Workbench credentials!
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password', // <--- Change to your MySQL password
    database: 'expensetracker' 
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: Make sure MySQL is running and credentials are correct!', err);
        return;
    }
    console.log('Connected natively to MySQL Database!');
});

// API Routes
app.get('/api/transactions', (req, res) => {
    db.query('SELECT * FROM transactions ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/transactions', (req, res) => {
    const { text, amount, icon } = req.body;
    const query = 'INSERT INTO transactions (text, amount, icon) VALUES (?, ?, ?)';
    db.query(query, [text, amount, icon], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: result.insertId, text, amount, icon });
    });
});

app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM transactions WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Transaction deleted' });
    });
});

app.listen(port, () => {
    console.log(`Backend Server running smoothly on http://localhost:${port}`);
});
