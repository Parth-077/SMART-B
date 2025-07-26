class AuthManager {
    constructor() {
        this.isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (username === 'admin' && password === 'admin') {
            this.isLoggedIn = true;
            localStorage.setItem('isLoggedIn', 'true');
            this.showMainContent();
        } else {
            alert('Invalid credentials');
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        localStorage.setItem('isLoggedIn', 'false');
        // Don't clear other data on logout
        window.location.reload();
    }

    checkAuth() {
        if (this.isLoggedIn) {
            this.showMainContent();
        } else {
            this.showLoginForm();
        }
    }

    showMainContent() {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
        // Load saved data
        productManager.loadProducts();
        billManager.loadBills();
    }

    showLoginForm() {
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
    }
}

// Initialize auth manager
const authManager = new AuthManager(); 