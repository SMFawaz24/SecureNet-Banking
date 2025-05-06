document.addEventListener('DOMContentLoaded', function() {
    // API base URL
    const API_URL = 'http://localhost:3000/api';

    // Data storage variables
    let userData = [];
    let accountsData = [];
    let transactionsData = [];
    let totalBalanceData = [];

    // Current user
    let currentUser = null;

    // Fetch initial data
    async function fetchData() {
        try {
            console.log('Fetching data from API...');
            
            try {
                const usersResponse = await fetch(`${API_URL}/users`);
                if (!usersResponse.ok) {
                    throw new Error(`Failed to fetch users: ${usersResponse.status}`);
                }
                userData = await usersResponse.json();
                console.log('Users data loaded:', userData.length);
            } catch (error) {
                console.error('Error fetching users:', error);
            }

            try {
                const accountsResponse = await fetch(`${API_URL}/accounts`);
                if (!accountsResponse.ok) {
                    throw new Error(`Failed to fetch accounts: ${accountsResponse.status}`);
                }
                accountsData = await accountsResponse.json();
                console.log('Accounts data loaded:', accountsData.length);
            } catch (error) {
                console.error('Error fetching accounts:', error);
                throw new Error('Could not load accounts data. Is the server running?');
            }

            try {
                const transactionsResponse = await fetch(`${API_URL}/transactions`);
                if (!transactionsResponse.ok) {
                    throw new Error(`Failed to fetch transactions: ${transactionsResponse.status}`);
                }
                transactionsData = await transactionsResponse.json();
                console.log('Transactions data loaded:', transactionsData.length);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            }

            // We'll calculate total balances from accounts
            totalBalanceData = [];
            const userNames = [...new Set(accountsData.map(account => account.name))];
            
            for (const name of userNames) {
                try {
                    // Get total balance for each user from backend
                    const totalBalanceResponse = await fetch(`${API_URL}/users/${name}/balance`);
                    if (!totalBalanceResponse.ok) {
                        throw new Error(`Failed to fetch balance: ${totalBalanceResponse.status}`);
                    }
                    const totalBalance = await totalBalanceResponse.json();
                    totalBalanceData.push(totalBalance);
                } catch (error) {
                    console.error(`Error fetching balance for ${name}:`, error);
                    // Add a default balance entry to prevent errors
                    totalBalanceData.push({ name, total_balance: 0 });
                }
            }
            
            console.log('All data loaded successfully');
        } catch (error) {
            console.error('Error in fetchData:', error);
            throw error; // Re-throw to be caught by the caller
        }
    }

    // Login form
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                const user = userData.find(u => u.email === email);
                currentUser = user;
                document.getElementById('login-container').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                
                // Update UI with user info
                document.getElementById('user-name').textContent = user.name;
                
                // Load user data
                loadDashboard();
            } else {
                alert('Invalid credentials. Try using the demo credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', function() {
        currentUser = null;
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
        loginForm.reset();
    });

    // Navigation
    const navItems = document.querySelectorAll('.nav-menu li');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Show selected page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === pageId + '-page') {
                    page.classList.add('active');
                }
            });
            
            // Load page data
            if (pageId === 'dashboard') {
                loadDashboard();
            } else if (pageId === 'accounts') {
                loadAccounts();
            } else if (pageId === 'transactions') {
                loadTransactions();
            } else if (pageId === 'transfer') {
                loadTransferPage();
            }
        });
    });

    // View all transactions button
    document.getElementById('view-all-transactions').addEventListener('click', function() {
        // Navigate to transactions page
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector('[data-page="transactions"]').classList.add('active');
        
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === 'transactions-page') {
                page.classList.add('active');
            }
        });
        
        loadTransactions();
    });

    // Transaction modal
    const modal = document.getElementById('transaction-modal');
    const closeBtn = document.querySelector('.close');
    const depositBtn = document.querySelector('.deposit-btn');
    const withdrawBtn = document.querySelector('.withdraw-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalSubmit = document.getElementById('modal-submit');
    const transactionForm = document.getElementById('transaction-form');
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Open deposit modal
    depositBtn.addEventListener('click', function() {
        openTransactionModal('Deposit');
    });
    
    // Open withdraw modal
    withdrawBtn.addEventListener('click', function() {
        openTransactionModal('Withdraw');
    });
    
    function openTransactionModal(type) {
        modalTitle.textContent = type;
        modalSubmit.textContent = type;
        
        // Populate account dropdown
        const modalAccount = document.getElementById('modal-account');
        modalAccount.innerHTML = '<option value="">Select Account</option>';
        
        const userAccounts = accountsData.filter(a => a.name === currentUser.name);
        userAccounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.account_id;
            const balance = parseFloat(account.balance);
            option.textContent = `${account.account_type} (#${account.account_id}) - $${isNaN(balance) ? 'N/A' : balance.toFixed(2)}`;
            modalAccount.appendChild(option);
        });
        
        modal.style.display = 'flex';
    }
    
    // Handle transaction form submission
    transactionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const accountId = parseInt(document.getElementById('modal-account').value);
        const amount = parseFloat(document.getElementById('modal-amount').value);
        const type = modalTitle.textContent;
        
        if (isNaN(accountId) || isNaN(amount) || amount <= 0) {
            alert('Please enter valid information');
            return;
        }
        
        try {
            // Create the transaction via API
            const transactionData = {
                transaction_type: type === 'Withdraw' ? 'Withdrawal' : 'Deposit',
                amount: amount,
                account_id: accountId
            };
            
            const response = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transaction failed');
            }
            
            // Refresh data
            await fetchData();
            
            // Close modal and reset form
            modal.style.display = 'none';
            transactionForm.reset();
            
            // Reload dashboard
            loadDashboard();
        } catch (error) {
            console.error('Transaction error:', error);
            alert(error.message || 'Transaction failed. Please try again.');
        }
    });
    
    // Transfer form
    const transferForm = document.getElementById('transfer-form');
    transferForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fromAccountId = parseInt(document.getElementById('from-account').value);
        const toAccountId = parseInt(document.getElementById('to-account').value);
        const amount = parseFloat(document.getElementById('amount').value);
        
        if (isNaN(fromAccountId) || isNaN(toAccountId) || isNaN(amount) || amount <= 0) {
            alert('Please enter valid information');
            return;
        }
        
        if (fromAccountId === toAccountId) {
            alert('Cannot transfer to the same account');
            return;
        }
        
        try {
            // Create the transfer transaction via API
            const transactionData = {
                transaction_type: 'Transfer',
                amount: amount,
                account_id: fromAccountId,
                receiver_account: toAccountId
            };
            
            const response = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(transactionData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transfer failed');
            }
            
            // Refresh data
            await fetchData();
            
            // Reset form
            transferForm.reset();
            
            // Show success message
            alert('Transfer successful');
            
            // Reload transfer page
            loadTransferPage();
        } catch (error) {
            console.error('Transfer error:', error);
            alert(error.message || 'Transfer failed. Please try again.');
        }
    });
    
    // Apply filters
    document.getElementById('apply-filters').addEventListener('click', function() {
        loadTransactions();
    });
    
    // Load dashboard data
    async function loadDashboard() {
        if (!currentUser) return;
        
        try {
            console.log('Loading dashboard for user:', currentUser.name);
            
            // Refresh the data first to ensure we have the latest
            try {
                await fetchData();
                console.log('Data refreshed for dashboard');
            } catch (error) {
                console.error('Error refreshing data for dashboard:', error);
                // Continue with existing data rather than failing completely
            }
            
            // Get user's total balance
            let totalBalance = totalBalanceData.find(b => b.name === currentUser.name);
            
            // If total balance was not found, calculate from accounts directly as a fallback
            if (!totalBalance) {
                console.log('Total balance not found, calculating from accounts');
                const userAccounts = accountsData.filter(a => a.name === currentUser.name);
                const calculatedBalance = userAccounts.reduce((sum, account) => sum + account.balance, 0);
                totalBalance = { name: currentUser.name, total_balance: calculatedBalance };
                // Add to the totalBalanceData for future use
                totalBalanceData.push(totalBalance);
            }
            
            document.getElementById('total-balance-amount').textContent = 
                `$${totalBalance && !isNaN(totalBalance.total_balance) ? 
                totalBalance.total_balance.toFixed(2) : '0.00'}`;
            
            // Get user's accounts (with error handling)
            let userAccounts = [];
            try {
                userAccounts = accountsData.filter(a => a.name === currentUser.name);
                console.log(`Found ${userAccounts.length} accounts for user ${currentUser.name}`);
            } catch (error) {
                console.error('Error filtering user accounts:', error);
                userAccounts = []; // Ensure it's an array even if there was an error
            }
            
            document.getElementById('account-count').textContent = userAccounts.length;
            
            // Get user's last transaction
            let userTransactions = [];
            try {
                userTransactions = transactionsData.filter(t => {
                    const account = accountsData.find(a => a.account_id === t.account_id);
                    return account && account.name === currentUser.name;
                });
                console.log(`Found ${userTransactions.length} transactions for user ${currentUser.name}`);
            } catch (error) {
                console.error('Error filtering user transactions:', error);
                userTransactions = []; // Ensure it's an array even if there was an error
            }
            
            if (userTransactions.length > 0) {
                // Sort by date (newest first)
                userTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
                const lastTransaction = userTransactions[0];
                document.getElementById('last-transaction-date').textContent = formatDate(lastTransaction.transaction_date);
            } else {
                document.getElementById('last-transaction-date').textContent = 'None';
            }
            
            // Populate accounts
            const accountsContainer = document.getElementById('accounts-container');
            accountsContainer.innerHTML = '';
            
            if (userAccounts.length > 0) {
                userAccounts.forEach(account => {
                    const accountCard = document.createElement('div');
                    accountCard.className = 'account-card';
                    const balance = parseFloat(account.balance);
                    accountCard.innerHTML = `
                        <div class="account-type">
                            ${account.account_type}
                            <span>#${account.account_id}</span>
                        </div>
                        <div class="account-number">Owner: ${account.name}</div>
                        <div class="account-balance">$${isNaN(balance) ? 'N/A' : balance.toFixed(2)}</div>
                        <div class="account-actions">
                            <button class="btn btn-primary view-transactions" data-account="${account.account_id}">View Transactions</button>
                        </div>
                    `;
                    accountsContainer.appendChild(accountCard);
                });
            } else {
                accountsContainer.innerHTML = '<div class="account-card"><p>No accounts found</p></div>';
            }
            
            // Add event listeners to view transactions buttons
            document.querySelectorAll('.view-transactions').forEach(btn => {
                btn.addEventListener('click', function() {
                    const accountId = parseInt(this.getAttribute('data-account'));
                    
                    // Navigate to transactions page
                    navItems.forEach(i => i.classList.remove('active'));
                    document.querySelector('[data-page="transactions"]').classList.add('active');
                    
                    pages.forEach(page => {
                        page.classList.remove('active');
                        if (page.id === 'transactions-page') {
                            page.classList.add('active');
                        }
                    });
                    
                    // Set account filter
                    document.getElementById('account-filter').value = accountId;
                    
                    // Load transactions
                    loadTransactions();
                });
            });
            
            // Populate recent transactions
            const recentTransactions = document.getElementById('recent-transactions');
            recentTransactions.innerHTML = '';
            
            if (userTransactions.length > 0) {
                // Show only 5 most recent transactions
                const recentOnes = userTransactions.slice(0, 5);
                
                recentOnes.forEach(transaction => {
                    const account = accountsData.find(a => a.account_id === transaction.account_id);
                    
                    if (!account) {
                        console.error(`Account not found for transaction ${transaction.transaction_id}`);
                        return; // Skip this transaction
                    }
                    
                    const transactionItem = document.createElement('div');
                    transactionItem.className = `transaction-item ${transaction.transaction_type.toLowerCase()}`;
                    
                    let iconClass = '';
                    if (transaction.transaction_type === 'Deposit') {
                        iconClass = 'fa-arrow-down';
                    } else if (transaction.transaction_type === 'Withdrawal') {
                        iconClass = 'fa-arrow-up';
                    } else {
                        iconClass = 'fa-exchange-alt';
                    }
                    
                    let transactionTitle = transaction.transaction_type;
                    if (transaction.transaction_type === 'Transfer' && transaction.receiver_account) {
                        const receiverAccount = accountsData.find(a => a.account_id === transaction.receiver_account);
                        if (receiverAccount) {
                            transactionTitle += ` to ${receiverAccount.account_type} (#${transaction.receiver_account})`;
                        }
                    }
                    
                    const amount = parseFloat(transaction.amount);
                    transactionItem.innerHTML = `
                        <div class="transaction-info">
                            <div class="transaction-icon">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${transactionTitle}</h4>
                                <p>${formatDate(transaction.transaction_date)} • ${account.account_type} (#${transaction.account_id})</p>
                            </div>
                        </div>
                        <div class="transaction-amount">
                            ${transaction.transaction_type === 'Deposit' ? '+' : transaction.transaction_type === 'Withdrawal' ? '-' : ''}$${isNaN(amount) ? 'N/A' : amount.toFixed(2)}
                        </div>
                    `;
                    
                    recentTransactions.appendChild(transactionItem);
                });
            } else {
                recentTransactions.innerHTML = '<div class="transaction-item"><p class="text-center">No transactions found</p></div>';
            }
            console.log('Dashboard loaded successfully');
        } catch (error) {
            console.error('Dashboard error:', error);
            alert('Failed to load dashboard data. Please try again. Error: ' + error.message);
        }
    }
    
    // Load accounts page
    async function loadAccounts() {
        if (!currentUser) return;
        
        try {
            console.log('Loading accounts page for user:', currentUser.name);
            
            // Refresh data
            try {
                await fetchData();
                console.log('Data refreshed for accounts page');
            } catch (error) {
                console.error('Error refreshing data for accounts page:', error);
                // Continue with existing data rather than failing completely
            }
            
            // Get user's accounts with error handling
            let userAccounts = [];
            try {
                userAccounts = accountsData.filter(a => a.name === currentUser.name);
                console.log(`Found ${userAccounts.length} accounts for user ${currentUser.name}`);
            } catch (error) {
                console.error('Error filtering user accounts:', error);
                userAccounts = []; // Ensure it's an array even if there was an error
            }
            
            // Populate accounts list
            const accountsList = document.getElementById('full-accounts-list');
            accountsList.innerHTML = '';
            
            if (userAccounts.length > 0) {
                userAccounts.forEach(account => {
                    const accountCard = document.createElement('div');
                    accountCard.className = 'account-card';
                    const balance = parseFloat(account.balance);
                    accountCard.innerHTML = `
                        <div class="account-type">
                            ${account.account_type}
                            <span>#${account.account_id}</span>
                        </div>
                        <div class="account-number">Owner: ${account.name}</div>
                        <div class="account-balance">$${isNaN(balance) ? 'N/A' : balance.toFixed(2)}</div>
                        <div class="account-actions">
                            <button class="btn btn-primary view-transactions" data-account="${account.account_id}">View Transactions</button>
                        </div>
                    `;
                    accountsList.appendChild(accountCard);
                });
            } else {
                accountsList.innerHTML = '<div class="account-card"><p>No accounts found</p></div>';
            }
            
            // Add event listeners to view transactions buttons
            document.querySelectorAll('.view-transactions').forEach(btn => {
                btn.addEventListener('click', function() {
                    const accountId = parseInt(this.getAttribute('data-account'));
                    
                    // Navigate to transactions page
                    navItems.forEach(i => i.classList.remove('active'));
                    document.querySelector('[data-page="transactions"]').classList.add('active');
                    
                    pages.forEach(page => {
                        page.classList.remove('active');
                        if (page.id === 'transactions-page') {
                            page.classList.add('active');
                        }
                    });
                    
                    // Set account filter
                    document.getElementById('account-filter').value = accountId;
                    
                    // Load transactions
                    loadTransactions();
                });
            });
            console.log('Accounts page loaded successfully');
        } catch (error) {
            console.error('Accounts error:', error);
            alert('Failed to load accounts data. Please try again. Error: ' + error.message);
        }
    }
    
    // Load transactions page
    async function loadTransactions() {
        if (!currentUser) return;
        
        try {
            console.log('Loading transactions page for user:', currentUser.name);
            
            // Refresh data
            try {
                await fetchData();
                console.log('Data refreshed for transactions page');
            } catch (error) {
                console.error('Error refreshing data for transactions page:', error);
                // Continue with existing data rather than failing completely
            }
            
            // Get filter values
            const accountFilter = document.getElementById('account-filter').value;
            const typeFilter = document.getElementById('type-filter').value;
            
            // Populate account filter dropdown if empty
            if (document.getElementById('account-filter').options.length <= 1) {
                const userAccounts = accountsData.filter(a => a.name === currentUser.name);
                userAccounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.account_id;
                    option.textContent = `${account.account_type} (#${account.account_id})`;
                    document.getElementById('account-filter').appendChild(option);
                });
            }
            
            // Get user's transactions with error handling
            let filteredTransactions = [];
            try {
                filteredTransactions = transactionsData.filter(t => {
                    const account = accountsData.find(a => a.account_id === t.account_id);
                    return account && account.name === currentUser.name;
                });
                console.log(`Found ${filteredTransactions.length} transactions for user ${currentUser.name}`);
            } catch (error) {
                console.error('Error filtering transactions:', error);
                filteredTransactions = []; // Ensure it's an array even if there was an error
            }
            
            // Apply account filter
            if (accountFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.account_id === parseInt(accountFilter));
            }
            
            // Apply type filter
            if (typeFilter !== 'all') {
                filteredTransactions = filteredTransactions.filter(t => t.transaction_type === typeFilter);
            }
            
            // Sort by date (newest first)
            filteredTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            
            // Populate transactions list
            const transactionsList = document.getElementById('all-transactions');
            transactionsList.innerHTML = '';
            
            if (filteredTransactions.length > 0) {
                filteredTransactions.forEach(transaction => {
                    const account = accountsData.find(a => a.account_id === transaction.account_id);
                    
                    // Skip if account not found
                    if (!account) {
                        console.error(`Account not found for transaction ${transaction.transaction_id}`);
                        return;
                    }
                    
                    const transactionItem = document.createElement('div');
                    transactionItem.className = `transaction-item ${transaction.transaction_type.toLowerCase()}`;
                    
                    let iconClass = '';
                    if (transaction.transaction_type === 'Deposit') {
                        iconClass = 'fa-arrow-down';
                    } else if (transaction.transaction_type === 'Withdrawal') {
                        iconClass = 'fa-arrow-up';
                    } else {
                        iconClass = 'fa-exchange-alt';
                    }
                    
                    let transactionTitle = transaction.transaction_type;
                    if (transaction.transaction_type === 'Transfer' && transaction.receiver_account) {
                        const receiverAccount = accountsData.find(a => a.account_id === transaction.receiver_account);
                        if (receiverAccount) {
                            transactionTitle += ` to ${receiverAccount.account_type} (#${transaction.receiver_account})`;
                        }
                    }
                    
                    const amount = parseFloat(transaction.amount);
                    transactionItem.innerHTML = `
                        <div class="transaction-info">
                            <div class="transaction-icon">
                                <i class="fas ${iconClass}"></i>
                            </div>
                            <div class="transaction-details">
                                <h4>${transactionTitle}</h4>
                                <p>${formatDate(transaction.transaction_date)} • ${account.account_type} (#${transaction.account_id})</p>
                            </div>
                        </div>
                        <div class="transaction-amount">
                            ${transaction.transaction_type === 'Deposit' ? '+' : transaction.transaction_type === 'Withdrawal' ? '-' : ''}$${isNaN(amount) ? 'N/A' : amount.toFixed(2)}
                        </div>
                    `;
                    
                    transactionsList.appendChild(transactionItem);
                });
            } else {
                transactionsList.innerHTML = '<div class="transaction-item"><p class="text-center">No transactions found</p></div>';
            }
            console.log('Transactions page loaded successfully');
        } catch (error) {
            console.error('Transactions error:', error);
            alert('Failed to load transactions data. Please try again. Error: ' + error.message);
        }
    }
    
    // Load transfer page
    async function loadTransferPage() {
        if (!currentUser) return;
        
        try {
            console.log('Loading transfer page for user:', currentUser.name);
            
            // Refresh data
            try {
                await fetchData();
                console.log('Data refreshed for transfer page');
            } catch (error) {
                console.error('Error refreshing data for transfer page:', error);
                // Continue with existing data rather than failing completely
            }
            
            // Get user's accounts with error handling
            let userAccounts = [];
            try {
                userAccounts = accountsData.filter(a => a.name === currentUser.name);
                console.log(`Found ${userAccounts.length} accounts for user ${currentUser.name}`);
            } catch (error) {
                console.error('Error filtering user accounts:', error);
                userAccounts = []; // Ensure it's an array even if there was an error
            }
            
            // Populate from account dropdown
            const fromAccount = document.getElementById('from-account');
            fromAccount.innerHTML = '<option value="">Select Account</option>';
            
            userAccounts.forEach(account => {
                const option = document.createElement('option');
                option.value = account.account_id;
                const balance = parseFloat(account.balance);
                option.textContent = `${account.account_type} (#${account.account_id}) - $${isNaN(balance) ? 'N/A' : balance.toFixed(2)}`;
                fromAccount.appendChild(option);
            });
            
            // Populate to account dropdown
            const toAccount = document.getElementById('to-account');
            toAccount.innerHTML = '<option value="">Select Account</option>';
            
            try {
                // Add all accounts (including other users' accounts for demo)
                accountsData.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.account_id;
                    option.textContent = `${account.account_type} (#${account.account_id}) - ${account.name}`;
                    toAccount.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating to account dropdown:', error);
            }
            
            console.log('Transfer page loaded successfully');
        } catch (error) {
            console.error('Transfer page error:', error);
            alert('Failed to load transfer page data. Please try again. Error: ' + error.message);
        }
    }
    
    // Helper function to format date
    function formatDate(dateString) {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString('en-US', options);
    }

    // Initialize the app by fetching data
    fetchData().then(() => {
        console.log('Initial data loaded');
    }).catch(error => {
        console.error('Failed to load initial data:', error);
    });
});