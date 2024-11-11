// transactionService.js
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/bankingApp', { useNewUrlParser: true, useUnifiedTopology: true });

// Account schema
const accountSchema = new mongoose.Schema({
    userId: String,
    balance: Number,
});
const Account = mongoose.model('Account', accountSchema);

// Transaction schema
const transactionSchema = new mongoose.Schema({
    fromUserId: String,
    toUserId: String,
    amount: Number,
    date: { type: Date, default: Date.now },
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'].split(" ")[1];
    if (!token) return res.status(403).json({ message: 'Access denied - No JWT token' });

    jwt.verify(token, 'secretKey', (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Endpoint to perform a transaction
app.post('/transfer', authenticateToken, async (req, res) => {
    const { fromUserId, toUserId, amount } = req.body;

    // Only allow transactions initiated by the authenticated user
    if (req.user.userId !== fromUserId) {
        return res.status(403).json({ message: 'Unauthorized transaction' });
    }

    const fromAccount = await Account.findOne({ userId: fromUserId });
    const toAccount = await Account.findOne({ userId: toUserId });

    if (fromAccount && toAccount && fromAccount.balance >= amount) {
        // Update balances
        fromAccount.balance -= amount;
        toAccount.balance += amount;
        
        await fromAccount.save();
        await toAccount.save();

        // Record transaction
        const transaction = new Transaction({ fromUserId, toUserId, amount });
        await transaction.save();

        res.json({ status: 'Success', message: 'Transaction completed' });
    } else {
        res.status(400).json({ status: 'Failure', message: 'Insufficient funds or invalid accounts' });
    }
});

app.listen(3003, () => console.log('Transaction Service running on port 3003'));
