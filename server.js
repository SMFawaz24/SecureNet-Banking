const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// API Routes

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [parseInt(req.params.id)]);
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, address, password_hash } = req.body;
    
    const { rows } = await db.query(
      'INSERT INTO users (name, email, phone, address, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, email, phone, address, password_hash]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, phone, address, password_hash } = req.body;
    
    const { rows } = await db.query(
      'UPDATE users SET name = $1, email = $2, phone = $3, address = $4, password_hash = $5 WHERE user_id = $6 RETURNING *',
      [name, email, phone, address, password_hash, userId]
    );
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // First check if the user exists
    const { rows } = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete the user
    await db.query('DELETE FROM users WHERE user_id = $1', [userId]);
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Accounts API
app.get('/api/accounts', async (req, res) => {
  try {
    if (req.query.name) {
      const { rows } = await db.query('SELECT * FROM accounts WHERE name = $1', [req.query.name]);
      res.json(rows);
    } else {
      const { rows } = await db.query('SELECT * FROM accounts');
      res.json(rows);
    }
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM accounts WHERE account_id = $1', [parseInt(req.params.id)]);
    
    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ error: 'Account not found' });
    }
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to retrieve account' });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { account_type, balance, name, user_id } = req.body;
    const parsedBalance = parseFloat(balance || 0);
    
    const { rows } = await db.query(
      'INSERT INTO accounts (account_type, balance, name, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [account_type, parsedBalance, name, user_id]
    );
    
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    const { account_type, balance, name, user_id } = req.body;
    
    // First check if the account exists
    const checkResult = await db.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const currentAccount = checkResult.rows[0];
    
    // Update the account
    const { rows } = await db.query(
      'UPDATE accounts SET account_type = $1, balance = $2, name = $3, user_id = $4 WHERE account_id = $5 RETURNING *',
      [
        account_type || currentAccount.account_type,
        balance !== undefined ? parseFloat(balance) : currentAccount.balance,
        name || currentAccount.name,
        user_id || currentAccount.user_id,
        accountId
      ]
    );
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    
    // First check if the account exists
    const { rows } = await db.query('SELECT * FROM accounts WHERE account_id = $1', [accountId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    // Delete the account
    await db.query('DELETE FROM accounts WHERE account_id = $1');
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Transactions API
app.get('/api/transactions', async (req, res) => {
  try {
    if (req.query.account_id) {
      const { rows } = await db.query(
        'SELECT * FROM transactions WHERE account_id = $1 ORDER BY transaction_date DESC',
        [parseInt(req.query.account_id)]
      );
      res.json(rows);
    } else {
      const { rows } = await db.query('SELECT * FROM transactions ORDER BY transaction_date DESC');
      res.json(rows);
    }
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { transaction_type, amount, account_id, receiver_account } = req.body;
  const parsedAmount = parseFloat(amount);
  const sourceAccountId = parseInt(account_id);
  const receiverAccountId = receiver_account ? parseInt(receiver_account) : null;

  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Invalid transaction amount' });
  }
  if (isNaN(sourceAccountId)) {
    return res.status(400).json({ error: 'Invalid source account ID' });
  }
  if (transaction_type === 'Transfer' && isNaN(receiverAccountId)) {
    return res.status(400).json({ error: 'Invalid receiver account ID for transfer' });
  }
  if (transaction_type === 'Transfer' && sourceAccountId === receiverAccountId) {
    return res.status(400).json({ error: 'Source and receiver accounts cannot be the same for transfer' });
  }

  const client = await db.pool.connect(); // Get a client from the pool

  try {
    await client.query('BEGIN'); // Start transaction

    // Check source account existence and balance (lock the row for update)
    const sourceAccountResult = await client.query(
      'SELECT * FROM accounts WHERE account_id = $1 FOR UPDATE', 
      [sourceAccountId]
    );
    if (sourceAccountResult.rows.length === 0) {
      throw new Error('Source account not found');
    }
    const sourceAccount = sourceAccountResult.rows[0];

    // Handle different transaction types
    if (transaction_type === 'Deposit') {
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
        [parsedAmount, sourceAccountId]
      );
    } 
    else if (transaction_type === 'Withdrawal') {
      if (parseFloat(sourceAccount.balance) < parsedAmount) {
        throw new Error('Insufficient funds in source account');
      }
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
        [parsedAmount, sourceAccountId]
      );
    } 
    else if (transaction_type === 'Transfer') {
      if (!receiverAccountId) {
        throw new Error('Receiver account is required for transfers');
      }
      if (parseFloat(sourceAccount.balance) < parsedAmount) {
        throw new Error('Insufficient funds in source account');
      }
      
      // Check receiver account existence (lock the row for update)
      const receiverAccountResult = await client.query(
        'SELECT * FROM accounts WHERE account_id = $1 FOR UPDATE',
        [receiverAccountId]
      );
      if (receiverAccountResult.rows.length === 0) {
        throw new Error('Receiver account not found');
      }
      
      // Subtract from source account
      await client.query(
        'UPDATE accounts SET balance = balance - $1 WHERE account_id = $2',
        [parsedAmount, sourceAccountId]
      );
      
      // Add to receiver account
      await client.query(
        'UPDATE accounts SET balance = balance + $1 WHERE account_id = $2',
        [parsedAmount, receiverAccountId]
      );
    } else {
      throw new Error('Invalid transaction type specified');
    }
    
    // Create new transaction record
    const transactionResult = await client.query(
      'INSERT INTO transactions (transaction_type, amount, receiver_account, account_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [transaction_type, parsedAmount, receiverAccountId, sourceAccountId]
    );
    
    await client.query('COMMIT'); // Commit transaction
    res.status(201).json(transactionResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback transaction on error
    console.error('Transaction error:', error.message); // Log the specific error
    // Send specific error messages back to the client
    if (error.message.includes('not found') || error.message.includes('Insufficient funds')) {
       res.status(400).json({ error: error.message });
    } else {
       res.status(500).json({ error: 'Failed to process transaction due to a server error.' });
    }
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Authentication route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Login attempt for email: ${email}`); // Add logging

    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (rows.length > 0) {
      const user = rows[0];
      console.log(`User found: ${user.email}, checking password.`); // Add logging
      // In a real app, you would use proper password hashing and verification
      // This is just for demo purposes
      const expectedPassword = user.password_hash.replace('hashed', ''); // Calculate expected password
      if (password === expectedPassword) {
        console.log(`Password match for ${user.email}. Login successful.`); // Add logging
        res.json({
          success: true,
          user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email
          }
        });
      } else {
        console.log(`Password mismatch for ${user.email}. Expected '${expectedPassword}', Received '${password}'.`); // Add logging
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      console.log(`User not found for email: ${email}`); // Add logging
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Total balance API
app.get('/api/users/:name/balance', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT SUM(balance) as total_balance FROM accounts WHERE name = $1',
      [req.params.name]
    );
    
    if (rows.length === 0 || rows[0].total_balance === null) {
      return res.status(404).json({ error: 'No accounts found for this user' });
    }
    
    res.json({ name: req.params.name, total_balance: parseFloat(rows[0].total_balance) });
  } catch (error) {
    console.error('Error retrieving total balance:', error);
    res.status(500).json({ error: 'Failed to retrieve total balance' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});