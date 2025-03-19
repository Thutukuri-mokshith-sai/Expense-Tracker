const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection (NeonDB)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Create a transaction
app.post('/transactions', async (req, res) => {
    const { type, details, amount } = req.body;
    if (!type || !details || !amount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO transactions (type, details, amount) VALUES ($1, $2, $3) RETURNING *',
            [type, details, amount]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read all transactions
app.get('/transactions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get total balance (Capital - Expenses)
app.get('/balance', async (req, res) => {
    try {
        const capitalResult = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_capital FROM transactions WHERE type = 'Capital'");
        const expenseResult = await pool.query("SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM transactions WHERE type = 'Expense'");
        
        const totalCapital = parseFloat(capitalResult.rows[0].total_capital) || 0;
        const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses) || 0;
        const remainingBalance = totalCapital - totalExpenses;

        res.json({ totalCapital, totalExpenses, remainingBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Read a single transaction
app.get('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Transaction not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a transaction
app.put('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const { type, details, amount } = req.body;
    if (!type || !details || !amount) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const result = await pool.query(
            'UPDATE transactions SET type = $1, details = $2, amount = $3 WHERE id = $4 RETURNING *',
            [type, details, amount, id]
        );
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Transaction not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a transaction
app.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length > 0) res.json({ message: 'Transaction deleted' });
        else res.status(404).json({ error: 'Transaction not found' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
