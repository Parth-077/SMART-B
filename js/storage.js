/**
 * StorageManager class
 * Handles all data storage operations including backup and restore
 */
class StorageManager {
    constructor() {
        console.log('Initializing StorageManager...');
        this.storageKeys = [
            'bills',
            'products',
            'inventory',
            'settings',
            'users'
        ];
        this.loadInitialData();
    }

    loadInitialData() {
        // Load initial data if storage is empty
        if (!localStorage.getItem('products')) {
            localStorage.setItem('products', '[]');
        }
        if (!localStorage.getItem('bills')) {
            localStorage.setItem('bills', '[]');
        }
        if (!localStorage.getItem('lastBackup')) {
            localStorage.setItem('lastBackup', new Date().toISOString());
        }
    }

    // Products
    saveProducts(products) {
        localStorage.setItem('products', JSON.stringify(products));
        this.backupData();
    }

    getProducts() {
        return JSON.parse(localStorage.getItem('products') || '[]');
    }

    // Bills
    saveBills(bills) {
        localStorage.setItem('bills', JSON.stringify(bills));
        this.backupData();
    }

    getBills() {
        return JSON.parse(localStorage.getItem('bills') || '[]');
    }

    // Backup all data
    backupData() {
        try {
            console.log('Starting backup process...');
            
            // Safely get products data
            let products = [];
            try {
                if (window.productManager && Array.isArray(window.productManager.products)) {
                    console.log('Getting products from productManager');
                    products = window.productManager.products;
                } else {
                    console.log('Getting products from localStorage');
                    products = JSON.parse(localStorage.getItem('products') || '[]');
                }
            } catch (err) {
                console.error('Error getting products:', err);
                products = [];
            }
            
            // Safely get bills data
            let bills = [];
            try {
                if (window.billManager && Array.isArray(window.billManager.bills)) {
                    console.log('Getting bills from billManager');
                    bills = window.billManager.bills;
                } else {
                    console.log('Getting bills from localStorage');
                    bills = JSON.parse(localStorage.getItem('bills') || '[]');
                }
            } catch (err) {
                console.error('Error getting bills:', err);
                bills = [];
            }
            
            // Safely get settings
            let settings = {};
            try {
                if (window.settingsManager && window.settingsManager.settings) {
                    console.log('Getting settings from settingsManager');
                    settings = window.settingsManager.settings;
                } else {
                    console.log('Getting settings from localStorage');
                    settings = JSON.parse(localStorage.getItem('settings') || '{}');
                }
            } catch (err) {
                console.error('Error getting settings:', err);
                settings = {};
            }
            
            // Create backup object
            const backupData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                products: products,
                bills: bills,
                settings: settings
            };
            
            console.log('Backup data prepared:', 
                `Products: ${products.length}, ` +
                `Bills: ${bills.length}, ` +
                `Settings: ${Object.keys(settings).length}`);
            
            // Convert to JSON string
            const jsonData = JSON.stringify(backupData, null, 2);
            
            // Create and trigger download
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pos_backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Backup file created and download triggered');
            alert('Backup created successfully');
            return true;
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Error creating backup: ' + error.message);
            return false;
        }
    }

    // Restore from backup
    restoreFromBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    localStorage.setItem('products', JSON.stringify(data.products));
                    localStorage.setItem('bills', JSON.stringify(data.bills));
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Clear all data
    clearAllData() {
        try {
            // Double-confirm before proceeding
            if (!confirm('WARNING: All data will be permanently deleted. This cannot be undone!\n\nType DELETE to confirm:')) {
                return;
            }
            
            const confirmation = prompt('Type DELETE to confirm data deletion:');
            if (confirmation !== 'DELETE') {
                alert('Deletion cancelled.');
                return;
            }
            
            // Clear all data from localStorage
            localStorage.clear();
            
            // Reset data in memory
            if (window.productManager) window.productManager.products = [];
            if (window.billManager) window.billManager.bills = [];
            if (window.settingsManager) window.settingsManager.resetToDefaults();
            
            alert('All data has been deleted. The application will now reload.');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Error clearing data: ' + error.message);
        }
    }

    // Add method to check if backup is needed
    checkBackupNeeded() {
        const lastBackup = localStorage.getItem('lastBackup');
        if (!lastBackup) return true;

        const daysSinceBackup = (new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > 1) { // Backup if more than 1 day old
            this.backupData();
            localStorage.setItem('lastBackup', new Date().toISOString());
        }
    }

    /**
     * Create a complete backup of all application data
     * @returns {Object} Backup data object
     */
    createBackup() {
        try {
            console.log('Creating backup of all data...');
            const backup = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                data: {}
            };
            
            // Back up all storage keys
            this.storageKeys.forEach(key => {
                try {
                    const data = localStorage.getItem(key);
                    backup.data[key] = data; // Store raw data string
                } catch (error) {
                    console.error(`Error backing up ${key}:`, error);
                    backup.data[key] = null;
                }
            });
            
            console.log('Backup created successfully:', backup);
            return backup;
        } catch (error) {
            console.error('Error creating backup:', error);
            alert('Failed to create backup. Please try again.');
            return null;
        }
    }
    
    /**
     * Download backup as JSON file
     */
    downloadBackup() {
        try {
            const backup = this.createBackup();
            if (!backup) return false;
            
            // Convert to JSON string
            const backupJson = JSON.stringify(backup, null, 2);
            
            // Create a Blob and download link
            const blob = new Blob([backupJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create filename with date
            const date = new Date();
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const filename = `pos-backup-${dateStr}.json`;
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('Backup downloaded successfully');
            alert('Backup created successfully!');
            return true;
        } catch (error) {
            console.error('Error downloading backup:', error);
            alert('Failed to download backup. Please try again.');
            return false;
        }
    }
    
    /**
     * Restore data from backup
     * @param {Object|String} backup Backup data object or JSON string
     */
    restoreData(data) {
        try {
            if (!data) {
                throw new Error('No data provided');
            }
            
            console.log('Starting data restore process...');
            
            // Confirm before proceeding
            if (!confirm('This will replace all your current data. Continue?')) {
                return;
            }
            
            // Restore products
            if (data.products && Array.isArray(data.products)) {
                console.log(`Restoring ${data.products.length} products...`);
                localStorage.setItem('products', JSON.stringify(data.products));
                if (window.productManager) {
                    try {
                        window.productManager.products = data.products;
                        console.log('Updated productManager.products in memory');
                    } catch (err) {
                        console.error('Error updating productManager:', err);
                    }
                }
            }
            
            // Restore bills
            if (data.bills && Array.isArray(data.bills)) {
                console.log(`Restoring ${data.bills.length} bills...`);
                localStorage.setItem('bills', JSON.stringify(data.bills));
                if (window.billManager) {
                    try {
                        window.billManager.bills = data.bills;
                        console.log('Updated billManager.bills in memory');
                    } catch (err) {
                        console.error('Error updating billManager:', err);
                    }
                }
            }
            
            // Restore settings
            if (data.settings) {
                console.log('Restoring settings...');
                localStorage.setItem('settings', JSON.stringify(data.settings));
                
                // Handle settings manager with more care
                if (window.settingsManager) {
                    try {
                        window.settingsManager.settings = data.settings;
                        console.log('Updated settingsManager.settings in memory');
                        
                        // Try to reload/apply settings using whatever method is available
                        if (typeof window.settingsManager.loadSettings === 'function') {
                            window.settingsManager.loadSettings();
                            console.log('Called settingsManager.loadSettings()');
                        } else if (typeof window.settingsManager._loadSettings === 'function') {
                            window.settingsManager._loadSettings();
                            console.log('Called settingsManager._loadSettings()');
                        } else if (typeof window.settingsManager.populateSettingsForm === 'function') {
                            window.settingsManager.populateSettingsForm();
                            console.log('Called settingsManager.populateSettingsForm()');
                        } else {
                            console.log('No suitable method found to refresh settings in memory');
                        }
                    } catch (err) {
                        console.error('Error updating settingsManager:', err);
                    }
                }
            }
            
            console.log('Data restore completed successfully');
            alert('Data restored successfully. The page will now reload to apply all changes.');
            
            // Reload page to ensure all components are properly reset
            setTimeout(() => {
                location.reload();
            }, 1000);
            
            return true;
        } catch (error) {
            console.error('Error restoring data:', error);
            alert('Error restoring data: ' + error.message);
            return false;
        }
    }
    
    /**
     * Handle file upload for backup restore
     * @param {File} file Uploaded backup file
     */
    handleBackupFileUpload(file) {
        try {
            console.log('Processing backup file:', file.name);
            
            // Check file type
            if (!file.name.endsWith('.json')) {
                alert('Please upload a valid JSON backup file.');
                return false;
            }
            
            // Read file
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    this.restoreData(backupData);
                } catch (error) {
                    console.error('Error parsing backup file:', error);
                    alert('Invalid backup file format. Please upload a valid backup file.');
                }
            };
            reader.readAsText(file);
            
            return true;
        } catch (error) {
            console.error('Error handling backup file upload:', error);
            alert('Failed to process backup file. Please try again.');
            return false;
        }
    }
}

// Initialize storage manager and attach to window object
console.log('Creating global storageManager instance...');
window.storageManager = new StorageManager(); 