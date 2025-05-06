const db = require('./db');
const fs = require('fs-extra');
const path = require('path');

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(15),
        address TEXT,
        password_hash VARCHAR(100) NOT NULL
      )
    `);
    
    // Create accounts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id SERIAL PRIMARY KEY,
        account_type VARCHAR(50) NOT NULL,
        balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        name VARCHAR(100) NOT NULL,
        user_id INTEGER REFERENCES users(user_id)
      )
    `);
    
    // Create transactions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id SERIAL PRIMARY KEY,
        transaction_type VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        receiver_account INTEGER NULL,
        account_id INTEGER NOT NULL REFERENCES accounts(account_id)
      )
    `);
    
    // Check if we need to import initial data from JSON files
    const { rows: userCount } = await db.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount[0].count) === 0 && fs.existsSync(USERS_FILE)) {
      console.log('Importing initial data from JSON files...');
      
      // Import users
      const users = fs.readJsonSync(USERS_FILE);
      for (const user of users) {
        await db.query(
          'INSERT INTO users (user_id, name, email, phone, address, password_hash) VALUES ($1, $2, $3, $4, $5, $6)',
          [user.user_id, user.name, user.email, user.phone, user.address, user.password_hash]
        );
      }
      
      // Import accounts
      const accounts = fs.readJsonSync(ACCOUNTS_FILE);
      for (const account of accounts) {
        // Find user_id by name
        const { rows } = await db.query('SELECT user_id FROM users WHERE name = $1', [account.name]);
        if (rows.length > 0) {
          await db.query(
            'INSERT INTO accounts (account_id, account_type, balance, name, user_id) VALUES ($1, $2, $3, $4, $5)',
            [account.account_id, account.account_type, account.balance, account.name, rows[0].user_id]
          );
        }
      }
      
      // Import transactions
      const transactions = fs.readJsonSync(TRANSACTIONS_FILE);
      for (const transaction of transactions) {
        await db.query(
          'INSERT INTO transactions (transaction_id, transaction_type, amount, transaction_date, receiver_account, account_id) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            transaction.transaction_id, 
            transaction.transaction_type, 
            transaction.amount, 
            transaction.transaction_date, 
            transaction.receiver_account, 
            transaction.account_id
          ]
        );
      }
      
      console.log('Data import complete.');
    }
    
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Database setup error:', error);
  } finally {
    // Close the pool
    db.pool.end();
  }
}

setupDatabase();