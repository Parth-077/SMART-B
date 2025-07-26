class POS {
    constructor() {
        this.todaySale = 0;
        this.initializeApp();
    }

    initializeApp() {
        this.updateTodaySale();
        this.setupEventListeners();
    }

    updateTodaySale() {
        // In production, fetch this from backend
        const todaySaleElement = document.getElementById('todaySale');
        todaySaleElement.textContent = this.formatCurrency(this.todaySale);
    }

    setupEventListeners() {
        // Add event listeners for various buttons
        document.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => this.handleButtonClick(e));
        });
    }

    handleButtonClick(e) {
        const button = e.currentTarget;
        const text = button.textContent.trim();

        switch(text) {
            case 'Billing':
                this.showBillingSection();
                break;
            case 'Past Bills':
                this.showPastBills();
                break;
            case 'Add Product':
                this.showAddProduct();
                break;
            case 'Product List':
                this.showProductList();
                break;
            case 'View Reports':
                this.showReports();
                break;
        }
    }

    formatCurrency(amount) {
        return amount.toLocaleString('en-IN');
    }

    // Placeholder methods for different sections
    showBillingSection() {
        console.log('Showing billing section');
        // Implement billing section UI
    }

    showPastBills() {
        console.log('Showing past bills');
        // Implement past bills UI
    }

    showAddProduct() {
        console.log('Showing add product form');
        // Implement add product UI
    }

    showProductList() {
        console.log('Showing product list');
        // Implement product list UI
    }

    showReports() {
        console.log('Showing reports');
        // Implement reports UI
    }
}

// Initialize POS system
const pos = new POS();

// Add this to the end of your main.js file
document.addEventListener('keydown', function(e) {
    // Ctrl+Shift+D to run bill ID debug
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        console.log('Running bill debug...');
        window.billingSystem.debugBillId();
    }
});

// Add event listeners for data management
document.addEventListener('DOMContentLoaded', function() {
    // Backup button
    document.getElementById('createBackup')?.addEventListener('click', function() {
        storageManager.downloadBackup();
    });
    
    // Restore file input
    document.getElementById('backupFileInput')?.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            storageManager.handleBackupFileUpload(e.target.files[0]);
        }
    });
    
    // Reset all data button
    document.getElementById('resetAllData')?.addEventListener('click', function() {
        storageManager.clearAllData();
    });
}); 