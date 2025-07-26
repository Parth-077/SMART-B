/**
 * Settings Manager
 * Handles all store settings and preferences
 */
class SettingsManager {
    constructor() {
        console.log('Initializing SettingsManager...');
        
        // Default settings
        this.defaultSettings = {
            // Store details
            storeName: "Your Store Name",
            storeTagline: "Your Store Tagline",
            branchName: "DMART BRANCH",
            storeCity: "Ahmedabad - 380005",
            storeAddress: "Store Address Line 1\nStore Address Line 2",
            storePhone: "Phone: 1234567890",
            cashierPrefix: "MJA",
            employeeId: "076175",  // Default employee ID
            storeCIN: "",
            storeGSTIN: "",
            storeFSSAI: "",
            upiAddress: "",        // Add UPI Address field
            
            // Receipt settings
            receiptFormat: "standard", // standard, detailed, gst
            showSavings: true,
            showGSTBreakdown: true,
            showMrpColumn: true,     // New setting for MRP column
            showHsnColumn: true,     // New HSN column setting
            
            // Printing settings
            autoPrint: true,
            printTimeout: 250, // ms
            
            // Tax settings
            defaultGSTRate: 5, // percentage
            
            // Other settings
            currencySymbol: "₹",
            dateFormat: "DD/MM/YYYY",
            roundTotals: true,
        };
        
        // Load settings from localStorage
        this.settings = this._loadSettings();
        
        // Setup event listeners
        this._setupEventListeners();
    }
    
    /**
     * Load settings from localStorage
     */
    _loadSettings() {
        try {
            const savedSettings = localStorage.getItem('settings');
            const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
            // Merge with default settings to ensure all properties exist
            return { ...this.defaultSettings, ...parsedSettings };
        } catch (error) {
            console.error('Error loading settings:', error);
            return { ...this.defaultSettings };
        }
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings(newSettings = null) {
        try {
            // Use provided settings or current settings
            const settingsToSave = newSettings || this.settings;
            
            // Save to localStorage
            localStorage.setItem('settings', JSON.stringify(settingsToSave));
            
            // Update current settings
            if (newSettings) {
                this.settings = {...newSettings};
            }
            
            console.log('Settings saved to localStorage:', this.settings);
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        // Listen for settings form submission
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'settingsForm') {
                e.preventDefault();
                this._handleSettingsFormSubmit(e.target);
            }
        });
        
        // Listen for save settings button click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'saveSettings' || e.target.closest('#saveSettings')) {
                e.preventDefault();
                const form = document.getElementById('settingsForm');
                if (form) {
                    this._handleSettingsFormSubmit(form);
                } else {
                    console.error('Settings form not found');
                    this.saveSettings(); // Save current settings anyway
                }
            }
        });
        
        // Listen for reset settings button click
        document.addEventListener('click', (e) => {
            if (e.target.id === 'resetSettings' || e.target.closest('#resetSettings')) {
                e.preventDefault();
                this.resetSettings();
            }
        });
        
        // Listen for settings modal open - DISABLED as settings button has been removed from navigation
        /* 
        document.addEventListener('click', (e) => {
            if (e.target.id === 'openSettings' || e.target.closest('#openSettings')) {
                e.preventDefault();
                this.showSettingsModal();
            }
        });
        */
        
        // Listen for modal close button clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const modal = document.getElementById('settingsModal');
                if (modal) {
                    modal.classList.add('hidden');
                }
            }
        });
    }
    
    /**
     * Handle settings form submission
     * @param {HTMLFormElement} form - The settings form
     */
    _handleSettingsFormSubmit(form) {
        // Create a new settings object
        const newSettings = {...this.settings}; // Start with existing settings
        const formData = new FormData(form);
        
        // First, handle all checkboxes by setting them to false
        // This ensures unchecked boxes are properly recorded
        Array.from(form.elements).forEach(element => {
            if (element.type === 'checkbox') {
                newSettings[element.name] = false;
            }
        });
        
        // Then process the form data to update with actual values
        for (const [key, value] of formData.entries()) {
            const element = form.elements[key];
            
            if (element.type === 'checkbox') {
                newSettings[key] = element.checked;
            } else if (element.type === 'number') {
                newSettings[key] = parseFloat(value) || 0;
            } else {
                newSettings[key] = value;
            }
        }
        
        console.log('New settings to save:', newSettings);
        
        // Save the updated settings
        const saved = this.saveSettings(newSettings);
        
        if (saved) {
            console.log('Settings saved successfully');
            alert('Settings saved successfully!');
            
            // Close the modal if open
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.classList.add('hidden');
            }
        } else {
            console.error('Failed to save settings');
            alert('Error saving settings. Please try again.');
        }
    }
    
    /**
     * Reset settings to defaults
     */
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.settings = { ...this.defaultSettings };
            this.saveSettings();
            alert('Settings reset to defaults.');
            
            // Update form if open
            this.populateSettingsForm();
        }
    }
    
    /**
     * Get a specific setting
     * @param {string} key - Setting key
     * @param {*} defaultValue - Default value if setting doesn't exist
     */
    getSetting(key, defaultValue = null) {
        return key in this.settings ? this.settings[key] : 
               (key in this.defaultSettings ? this.defaultSettings[key] : defaultValue);
    }
    
    /**
     * Update a specific setting
     * @param {string} key - Setting key
     * @param {*} value - New value
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        return this.saveSettings();
    }
    
    /**
     * Show settings modal
     */
    showSettingsModal(tab = 'store') {
        // Show the settings modal
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            
            // If data tab is requested, scroll to the data management section
            if (tab === 'data') {
                const dataSection = document.querySelector('#settingsForm .data-management-section');
                if (dataSection) {
                    setTimeout(() => {
                        dataSection.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                }
            }
        }
    }
    
    /**
     * Populate settings form with current values
     */
    populateSettingsForm() {
        console.log('Populating settings form with current values:', this.settings);
        const form = document.getElementById('settingsForm');
        if (!form) {
            console.error('Settings form element not found');
            return;
        }

        // Populate text inputs, selects, and textareas
        for (const [key, value] of Object.entries(this.settings)) {
            const element = form.elements[key];
            if (!element) continue;
            
            if (element.type === 'checkbox') {
                element.checked = !!value;
                console.log(`Setting checkbox ${key} to ${!!value}`);
            } else {
                element.value = value || '';
            }
        }
    }
}

// Initialize settings manager
const settingsManager = new SettingsManager();

// Export for other modules
window.settingsManager = settingsManager;
