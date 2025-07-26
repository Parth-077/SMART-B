/**
 * RefundManager class
 * Handles refunds and exchanges for the POS system
 */
class RefundManager {
    constructor() {
        console.log('Initializing RefundManager...');
        
        // Initialize properties
        this.refunds = this.loadRefunds();
        this.currentBill = null;
        this.selectedItems = [];
        this.refundType = 'refund'; // 'refund' or 'exchange'
        
        // Pagination properties for refund records
        this.recordsPage = 1;
        this.recordsPerPage = 10;
        this.filteredRecords = [];
        
        // Setup event listeners when DOM is ready
        if (document.readyState !== 'loading') {
            this.setupEventListeners();
        } else {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        }
        
        // Add special handler for modal clicks to prevent event bubbling issues
        document.addEventListener('click', (e) => {
            if (e.target.id === 'refundRecordDetailModal') {
                document.getElementById('refundRecordDetailModal').classList.add('hidden');
            }
        });
        
        // Handle window resize to update modal dimensions
        window.addEventListener('resize', () => {
            const modal = document.getElementById('refundRecordDetailModal');
            if (!modal.classList.contains('hidden')) {
                const content = document.getElementById('refundRecordDetailContent');
                if (content) {
                    void content.offsetHeight; // Force reflow
                }
            }
        });
    }
    
    /**
     * Load refunds from localStorage
     */
    loadRefunds() {
        try {
            const refunds = localStorage.getItem('refunds');
            return refunds ? JSON.parse(refunds) : [];
        } catch (error) {
            console.error('Error loading refunds:', error);
            return [];
        }
    }
    
    /**
     * Save refunds to localStorage
     */
    saveRefunds() {
        try {
            localStorage.setItem('refunds', JSON.stringify(this.refunds));
            return true;
        } catch (error) {
            console.error('Error saving refunds:', error);
            return false;
        }
    }
    
    /**
     * Setup event listeners for the refund manager
     */
    setupEventListeners() {
        console.log('Setting up RefundManager event listeners');
        
        // Close modal button
        const closeModalBtns = document.querySelectorAll('#refundModal .modal-close');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.hideRefundModal());
        });
        
        // Tab navigation
        document.getElementById('findBillTab').addEventListener('click', () => this.showTab('findBill'));
        document.getElementById('selectItemsTab').addEventListener('click', () => {
            if (!this.currentBill) return;
            this.showTab('selectItems');
        });
        document.getElementById('processRefundTab').addEventListener('click', () => {
            if (this.selectedItems.length === 0) return;
            this.showTab('processRefund');
        });
        
        // Search bill button
        document.getElementById('searchBillBtn').addEventListener('click', () => this.searchBills());
        
        // Enter key in search field
        document.getElementById('refundBillSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchBills();
        });
        
        // Back/forward navigation
        document.getElementById('backToBillsBtn').addEventListener('click', () => this.showTab('findBill'));
        document.getElementById('continueToRefundBtn').addEventListener('click', () => {
            if (this.selectedItems.length === 0) {
                alert('Please select at least one item for refund/exchange');
                return;
            }
            this.showTab('processRefund');
        });
        document.getElementById('backToItemsBtn').addEventListener('click', () => this.showTab('selectItems'));
        
        // Select all items checkbox
        document.getElementById('selectAllItems').addEventListener('change', (e) => {
            this.toggleSelectAllItems(e.target.checked);
        });
        
        // Toggle between refund and exchange
        const transactionTypeRadios = document.querySelectorAll('input[name="transactionType"]');
        transactionTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.refundType = e.target.value;
                this.toggleExchangeItemsSection();
            });
        });
        
        // Process refund button
        document.getElementById('processRefundBtn').addEventListener('click', () => this.processRefund());
        
        // Add exchange items button
        document.getElementById('addExchangeItems').addEventListener('click', () => {
            this.showProductSelectionForExchange();
        });
        
        // Handle refund records tab functionality
        this.setupRefundRecordsTab();
    }
    
    /**
     * Show the refund modal
     */
    showRefundModal() {
        console.log('Showing refund modal');
        const modal = document.getElementById('refundModal');
        if (modal) {
            // Apply scrolling styles first for mobile optimization
            this.setupScrollingStyles();
            
            modal.classList.remove('hidden');
            this.resetRefundModal();
            this.showTab('findBill');
            
            // Mobile optimization: Prevent body scrolling when modal is open
            document.body.classList.add('overflow-hidden');
        }
    }
    
    /**
     * Hide the refund modal
     */
    hideRefundModal() {
        console.log('Hiding refund modal');
        const modal = document.getElementById('refundModal');
        if (modal) {
            modal.classList.add('hidden');
            
            // Mobile optimization: Restore body scrolling
            document.body.classList.remove('overflow-hidden');
        }
    }
    
    /**
     * Reset refund modal to initial state
     */
    resetRefundModal() {
        console.log('Resetting refund modal');
        
        // Reset properties
        this.currentBill = null;
        this.selectedItems = [];
        
        // Reset UI elements
        document.getElementById('refundBillSearch').value = '';
        document.getElementById('billSearchResults').classList.add('hidden');
        document.getElementById('refundBillList').innerHTML = '';
        document.getElementById('refundItemsList').innerHTML = '';
        document.getElementById('refundAmount').value = '';
        document.getElementById('refundReason').value = '';
        document.getElementById('refundNotes').value = '';
        document.getElementById('selectAllItems').checked = false;
        
        // Reset radio buttons
        document.querySelector('input[name="transactionType"][value="refund"]').checked = true;
        this.refundType = 'refund';
        this.toggleExchangeItemsSection();
        
        // Enable/disable tabs
        document.getElementById('selectItemsTab').disabled = true;
        document.getElementById('processRefundTab').disabled = true;
    }
    
    /**
     * Show a specific tab in the refund modal
     * @param {string} tabName - Name of tab to show ('findBill', 'selectItems', 'processRefund')
     */
    showTab(tabName) {
        console.log(`Showing tab: ${tabName}`);
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.refund-tab-content');
        tabContents.forEach(tab => tab.classList.add('hidden'));
        
        // Reset tab highlighting
        const tabs = document.querySelectorAll('#refundModal [id$="Tab"]');
        tabs.forEach(tab => {
            tab.classList.remove('border-b-2', 'border-blue-500', 'text-blue-500');
            tab.classList.add('text-gray-500');
        });
        
        // Show selected tab
        let contentId;
        let tabId;
        
        switch (tabName) {
            case 'findBill':
                contentId = 'findBillSection';
                tabId = 'findBillTab';
                break;
            case 'selectItems':
                contentId = 'selectItemsSection';
                tabId = 'selectItemsTab';
                // Populate items table if we have a bill
                if (this.currentBill) {
                    this.populateItemsTable();
                }
                break;
            case 'processRefund':
                contentId = 'processRefundSection';
                tabId = 'processRefundTab';
                // Update exchange items section visibility
                this.toggleExchangeItemsSection();
                break;
            case 'refundRecords':
                contentId = 'refundRecordsSection';
                tabId = 'refundRecordsTab';
                break;
            default:
                console.error('Invalid tab name:', tabName);
                return;
        }
        
        // Show the tab content
        const content = document.getElementById(contentId);
        if (content) {
            content.classList.remove('hidden');
        }
        
        // Set active tab
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.classList.remove('text-gray-500');
            tab.classList.add('border-b-2', 'border-blue-500', 'text-blue-500');
        }
    }
    
    /**
     * Search for bills by number or customer phone
     */
    searchBills() {
        console.log('Searching for bills');
        
        const searchInput = document.getElementById('refundBillSearch').value.trim();
        if (!searchInput) {
            alert('Please enter a bill number or customer phone number');
            return;
        }
        
        // Get bills from bill manager
        let bills = [];
        try {
            if (window.billManager && Array.isArray(window.billManager.bills)) {
                bills = window.billManager.bills;
            } else {
                bills = JSON.parse(localStorage.getItem('bills') || '[]');
            }
        } catch (error) {
            console.error('Error loading bills:', error);
            bills = [];
        }
        
        // Filter bills by search input
        const filteredBills = bills.filter(bill => {
            // Search by bill number
            if (bill.billNumber && bill.billNumber.toString().includes(searchInput)) {
                return true;
            }
            
            // Search by customer phone
            if (bill.customer && bill.customer.phone && bill.customer.phone.includes(searchInput)) {
                return true;
            }
            
            return false;
        });
        
        // Sort bills by date (newest first)
        filteredBills.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
        });
        
        // Display results
        this.displaySearchResults(filteredBills);
    }
    
    /**
     * Display bill search results
     * @param {Array} bills - Filtered bills to display
     */
    displaySearchResults(bills) {
        console.log('Displaying search results:', bills.length, 'bills found');
        
        const resultsContainer = document.getElementById('billSearchResults');
        const billsList = document.getElementById('refundBillList');
        
        // Clear previous results
        billsList.innerHTML = '';
        resultsContainer.classList.remove('hidden');
        
        if (bills.length === 0) {
            // No results
            billsList.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-6 text-center text-gray-500">
                        No bills found matching your search.
                    </td>
                </tr>
            `;
        } else {
            // Display each bill
            bills.forEach(bill => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50 cursor-pointer';
                
                // Format date with improved handling
                let billDate = 'Unknown';
                if (bill.date) {
                    try {
                        // Try parsing the date
                        const date = new Date(bill.date);
                        // Check if date is valid before formatting
                        if (!isNaN(date.getTime())) {
                            billDate = date.toLocaleDateString();
                        }
                    } catch (e) {
                        console.error('Error formatting date:', e);
                    }
                } else if (bill.dateTime) {
                    // Try alternative date field
                    try {
                        const date = new Date(bill.dateTime);
                        if (!isNaN(date.getTime())) {
                            billDate = date.toLocaleDateString();
                        }
                    } catch (e) {
                        console.error('Error formatting dateTime:', e);
                    }
                } else if (bill.timestamp) {
                    // Try another alternative date field
                    try {
                        const date = new Date(bill.timestamp);
                        if (!isNaN(date.getTime())) {
                            billDate = date.toLocaleDateString();
                        }
                    } catch (e) {
                        console.error('Error formatting timestamp:', e);
                    }
                }
                
                // Format customer
                let customerInfo = 'Walk-in Customer';
                if (bill.customer && bill.customer.name) {
                    customerInfo = bill.customer.name;
                    if (bill.customer.phone) {
                        customerInfo += `<br><span class="text-xs text-gray-500">${bill.customer.phone}</span>`;
                    }
                }
                
                // Format amount
                const amount = typeof bill.total === 'number' ? `₹${bill.total.toFixed(2)}` : 'N/A';
                
                row.innerHTML = `
                    <td class="px-4 py-3 font-medium">${bill.billNumber || 'Unknown'}</td>
                    <td class="px-4 py-3">${billDate}</td>
                    <td class="px-4 py-3">${customerInfo}</td>
                    <td class="px-4 py-3 text-right">${amount}</td>
                    <td class="px-4 py-3 text-center">
                        <button class="select-bill-btn px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                            Select
                        </button>
                    </td>
                `;
                
                // Add event listener to select button
                const selectBtn = row.querySelector('.select-bill-btn');
                selectBtn.addEventListener('click', () => this.selectBill(bill));
                
                billsList.appendChild(row);
            });
        }
    }
    
    /**
     * Select a bill for refund/exchange
     * @param {Object} bill - Selected bill object
     */
    selectBill(bill) {
        console.log('Bill selected for refund:', bill);
        
        this.currentBill = bill;
        
        // Enable items tab
        document.getElementById('selectItemsTab').disabled = false;
        
        // Format bill details for display
        const billNumber = bill.billNumber || 'Unknown';
        
        // Improved date formatting with multiple fallbacks
        let billDate = 'Unknown';
        if (bill.date) {
            try {
                const date = new Date(bill.date);
                if (!isNaN(date.getTime())) {
                    billDate = date.toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting date in selectBill:', e);
            }
        } else if (bill.dateTime) {
            try {
                const date = new Date(bill.dateTime);
                if (!isNaN(date.getTime())) {
                    billDate = date.toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting dateTime in selectBill:', e);
            }
        } else if (bill.timestamp) {
            try {
                const date = new Date(bill.timestamp);
                if (!isNaN(date.getTime())) {
                    billDate = date.toLocaleDateString();
                }
            } catch (e) {
                console.error('Error formatting timestamp in selectBill:', e);
            }
        }
        
        const billAmount = typeof bill.total === 'number' ? `₹${bill.total.toFixed(2)}` : 'N/A';
        
        // Update bill details in UI
        document.getElementById('selectedBillNumber').textContent = billNumber;
        document.getElementById('selectedBillDate').textContent = billDate;
        document.getElementById('selectedBillAmount').textContent = billAmount;
        
        // Reset selected items
        this.selectedItems = [];
        document.getElementById('selectAllItems').checked = false;
        
        // Show items tab
        this.showTab('selectItems');
    }
    
    /**
     * Populate items table for the selected bill
     */
    populateItemsTable() {
        console.log('Populating items table for selected bill');
        
        if (!this.currentBill || !this.currentBill.items || !Array.isArray(this.currentBill.items)) {
            console.error('Invalid bill or items array');
            return;
        }
        
        const itemsList = document.getElementById('refundItemsList');
        itemsList.innerHTML = '';
        
        this.currentBill.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            
            const name = item.name || 'Unknown';
            const qty = item.quantity || 0;
            const price = typeof item.price === 'number' ? `₹${item.price.toFixed(2)}` : 'Unknown';
            const total = typeof item.total === 'number' ? `₹${item.total.toFixed(2)}` : 
                          (typeof item.price === 'number' && typeof qty === 'number' ? `₹${(item.price * qty).toFixed(2)}` : 'Unknown');
            
            row.innerHTML = `
                <td class="px-4 py-3">
                    <input type="checkbox" class="item-checkbox form-checkbox h-4 w-4 text-blue-600" data-index="${index}">
                </td>
                <td class="px-4 py-3">${name}</td>
                <td class="px-4 py-3 text-center">
                    <select class="refund-qty border rounded p-1 w-16 text-center" data-index="${index}" data-max="${qty}">
                        ${this.generateQuantityOptions(qty)}
                    </select>
                </td>
                <td class="px-4 py-3 text-right">${price}</td>
                <td class="px-4 py-3 text-right">${total}</td>
            `;
            
            // Add event listener to checkbox
            const checkbox = row.querySelector('.item-checkbox');
            checkbox.addEventListener('change', (e) => {
                this.toggleItemSelection(index, e.target.checked);
            });
            
            // Add event listener to quantity select
            const qtySelect = row.querySelector('.refund-qty');
            qtySelect.addEventListener('change', () => {
                this.updateSelectedItems();
            });
            
            itemsList.appendChild(row);
        });
    }
    
    /**
     * Generate options for quantity dropdown
     * @param {number} maxQty - Maximum available quantity
     * @returns {string} HTML options string
     */
    generateQuantityOptions(maxQty) {
        let options = '';
        for (let i = 1; i <= maxQty; i++) {
            options += `<option value="${i}">${i}</option>`;
        }
        return options;
    }
    
    /**
     * Toggle selection of a specific item
     * @param {number} index - Index of the item in the bill's items array
     * @param {boolean} checked - Whether the item is selected
     */
    toggleItemSelection(index, checked) {
        console.log('Toggle item selection:', index, checked);
        
        if (checked) {
            // Add to selected items if not already there
            if (!this.selectedItems.includes(index)) {
                this.selectedItems.push(index);
            }
        } else {
            // Remove from selected items
            this.selectedItems = this.selectedItems.filter(i => i !== index);
        }
        
        // Update the select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllItems');
        const allCheckboxes = document.querySelectorAll('#refundItemsList .item-checkbox');
        const checkedCheckboxes = document.querySelectorAll('#refundItemsList .item-checkbox:checked');
        
        if (allCheckboxes.length > 0) {
            selectAllCheckbox.checked = allCheckboxes.length === checkedCheckboxes.length;
        }
        
        // Update refund amount
        this.updateRefundAmount();
        
        // Enable/disable continue button
        document.getElementById('processRefundTab').disabled = this.selectedItems.length === 0;
    }
    
    /**
     * Toggle all items selection
     * @param {boolean} checked - Whether to select or deselect all items
     */
    toggleSelectAllItems(checked) {
        console.log('Toggle select all items:', checked);
        
        const checkboxes = document.querySelectorAll('#refundItemsList .item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        
        // Update the selected items
        this.updateSelectedItems();
    }
    
    /**
     * Update selected items based on checkboxes and quantities
     */
    updateSelectedItems() {
        console.log('Updating selected items');
        
        this.selectedItems = [];
        let totalRefundAmount = 0;
        
        const checkboxes = document.querySelectorAll('.item-checkbox:checked');
        console.log('Selected checkboxes:', checkboxes.length);
        
        checkboxes.forEach(checkbox => {
            const index = parseInt(checkbox.dataset.index);
            const qtyInput = document.getElementById(`refund-qty-${index}`);
            const quantity = parseInt(qtyInput.value);
            
            // Get the original item from the bill
            const originalItem = this.currentBill.items[index];
            if (!originalItem) {
                console.warn(`Original item at index ${index} not found`);
                return;
            }
            
            // Use rate value for refund (prioritize rate over price over mrp)
            let itemPrice = 0;
            if (originalItem.rate && !isNaN(parseFloat(originalItem.rate))) {
                itemPrice = parseFloat(originalItem.rate);
                console.log(`Using rate (${itemPrice}) for item ${originalItem.name || index}`);
            } else if (originalItem.price && !isNaN(parseFloat(originalItem.price))) {
                itemPrice = parseFloat(originalItem.price);
                console.log(`Using price (${itemPrice}) for item ${originalItem.name || index}`);
            } else if (originalItem.mrp && !isNaN(parseFloat(originalItem.mrp))) {
                itemPrice = parseFloat(originalItem.mrp);
                console.log(`Using MRP (${itemPrice}) for item ${originalItem.name || index}`);
            }
            
            // Validate quantity
            const maxQuantity = parseInt(originalItem.quantity || 1);
            const validQty = quantity > 0 && quantity <= maxQuantity ? quantity : 1;
            
            // Calculate item total
            const itemTotal = itemPrice * validQty;
            console.log(`Item ${originalItem.name || index}: ${itemPrice} × ${validQty} = ${itemTotal}`);
            
            if (!isNaN(itemTotal)) {
                totalRefundAmount += itemTotal;
                
                // Add to selected items
                this.selectedItems.push({
                    index: index,
                    name: originalItem.name,
                    code: originalItem.code,
                    price: itemPrice,
                    quantity: validQty,
                    maxQuantity: maxQuantity,
                    total: itemTotal,
                    rate: originalItem.rate || originalItem.price,
                });
            }
        });
        
        console.log('Selected items:', this.selectedItems);
        console.log('Total refund amount:', totalRefundAmount);
        
        // Update refund amount in the process tab
        const refundAmountField = document.getElementById('refundAmount');
        if (refundAmountField) {
            refundAmountField.value = totalRefundAmount.toFixed(2);
            console.log('Set refund amount field to:', refundAmountField.value);
            
            // Add color indication
            refundAmountField.style.color = this.selectedItems.length > 0 ? 'green' : '';
            refundAmountField.style.fontWeight = this.selectedItems.length > 0 ? 'bold' : '';
        }
        
        // Rate indicator removed as per user request
        // const amountLabel = document.querySelector('label[for="refundAmount"]');
        // if (amountLabel && !amountLabel.querySelector('.rate-indicator')) {
        //     const indicator = document.createElement('span');
        //     indicator.className = 'text-xs text-green-600 ml-1 rate-indicator';
        //     indicator.textContent = '(selling price)';
        //     amountLabel.appendChild(indicator);
        // }
        
        // Enable/disable continue button based on selection
        const continueButton = document.getElementById('continueToRefundBtn');
        if (continueButton) {
            continueButton.disabled = this.selectedItems.length === 0;
        }
    }
    
    /**
     * Update refund amount based on selected items
     */
    updateRefundAmount() {
        console.log('Updating refund amount');
        
        if (!this.currentBill || !this.currentBill.items || this.selectedItems.length === 0) {
            document.getElementById('refundAmount').value = '0.00';
            return;
        }
        
        console.log('Selected items:', JSON.stringify(this.selectedItems));
        console.log('Current bill items:', JSON.stringify(this.currentBill.items));
        
        let totalRefund = 0;
        let itemDetails = []; // For debugging
        
        this.selectedItems.forEach(index => {
            const item = this.currentBill.items[index];
            if (!item) {
                console.warn(`Item at index ${index} not found in current bill`);
                return;
            }
            
            // Get selected quantity for this item
            const qtySelect = document.querySelector(`.refund-qty[data-index="${index}"]`);
            const qty = qtySelect ? parseInt(qtySelect.value) : 1;
            
            // Ensure we have valid quantity
            const validQty = isNaN(qty) ? 1 : qty;
            
            // Calculate item refund amount (prioritize rate for refunds)
            let itemPrice = 0;
            let priceSource = 'none';
            
            // First try to use rate (actual selling price)
            if (item.rate && !isNaN(parseFloat(item.rate))) {
                itemPrice = parseFloat(item.rate);
                priceSource = 'rate';
                console.log(`Using rate for item ${item.name || index}: ${itemPrice}`);
            } 
            // Fallback to price
            else if (item.price && !isNaN(parseFloat(item.price))) {
                itemPrice = parseFloat(item.price);
                priceSource = 'price';
                console.log(`Using price for item ${item.name || index}: ${itemPrice}`);
            } 
            // Last resort use MRP
            else if (item.mrp && !isNaN(parseFloat(item.mrp))) {
                itemPrice = parseFloat(item.mrp);
                priceSource = 'mrp';
                console.log(`Using MRP for item ${item.name || index}: ${itemPrice}`);
            } else {
                console.warn(`No valid price found for item ${item.name || index}, using 0`);
            }
            
            // Calculate and add to total (with validation)
            const itemTotal = itemPrice * validQty;
            if (!isNaN(itemTotal)) {
                totalRefund += itemTotal;
                
                // Store debug info
                itemDetails.push({
                    name: item.name || `Item ${index}`,
                    price: itemPrice,
                    priceSource: priceSource,
                    qty: validQty,
                    total: itemTotal
                });
            } else {
                console.error(`Invalid total calculated for item ${item.name || index}: ${itemPrice} × ${validQty}`);
            }
        });
        
        console.log('Item details for refund calculation:', itemDetails);
        console.log('Total refund amount calculated:', totalRefund);
        
        // Validate total to ensure it's not NaN
        if (isNaN(totalRefund)) {
            console.error('NaN detected in refund total, setting to 0');
            totalRefund = 0;
        }
        
        // Update refund amount with validation
        const refundInput = document.getElementById('refundAmount');
        if (refundInput) {
            refundInput.value = totalRefund.toFixed(2);
            console.log('Refund amount set to:', refundInput.value);
        } else {
            console.error('Refund amount input element not found');
        }
    }
    
    /**
     * Toggle visibility of exchange items section
     */
    toggleExchangeItemsSection() {
        const exchangeSection = document.getElementById('exchangeItemsSection');
        const exchangeItemsList = document.getElementById('exchangeItemsList');
        
        if (this.refundType === 'exchange') {
            exchangeSection.classList.remove('hidden');
        } else {
            exchangeSection.classList.add('hidden');
            // Clear exchange items when switching to refund
            if (exchangeItemsList) {
                exchangeItemsList.innerHTML = '';
                exchangeItemsList.classList.add('hidden');
            }
            
            // Remove any exchange data
            const dataInput = document.getElementById('exchangeItemsData');
            if (dataInput) {
                dataInput.value = '';
            }
            
            // Remove balance display
            const balanceDiv = document.getElementById('exchangeBalance');
            if (balanceDiv) {
                balanceDiv.remove();
            }
        }
    }
    
    /**
     * Show product selection for exchange
     */
    showProductSelectionForExchange() {
        console.log('Showing product selection for exchange');
        
        // Make sure we access products from the product manager
        if (!window.productManager || !window.productManager.products) {
            alert('Product manager not available');
            return;
        }
        
        const products = window.productManager.products;
        
        // Create and show the product selection modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.id = 'exchangeProductModal';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div class="bg-gray-100 px-4 py-3 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
                    <h3 class="text-lg font-medium">Select Products for Exchange</h3>
                    <button id="closeExchangeProductBtn" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="p-4 flex-grow overflow-auto">
                    <div class="mb-3">
                        <input type="text" id="exchangeProductSearch" placeholder="Search products..." 
                               class="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50">
                    </div>
                    
                    <div id="exchangeProductsList" class="border rounded-lg overflow-hidden">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${products.map((product, index) => {
                                    // Use rate/price instead of MRP
                                    const price = parseFloat(product.rate || product.price || 0);
                                    return `
                                        <tr class="hover:bg-gray-50">
                                            <td class="px-3 py-2">
                                                <div class="font-medium">${product.name}</div>
                                                <div class="text-xs text-gray-500">${product.code || 'No code'}</div>
                                            </td>
                                            <td class="px-3 py-2 text-right">₹${price.toFixed(2)}</td>
                                            <td class="px-3 py-2 text-center">
                                                <input type="number" min="0" value="0" 
                                                       class="exchange-product-qty w-16 text-center border rounded py-1 px-2"
                                                       data-index="${index}" data-price="${price}">
                                            </td>
                                            <td class="px-3 py-2 text-right exchange-product-total">₹0.00</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="bg-gray-50 px-4 py-3 border-t border-gray-200 rounded-b-lg flex justify-between items-center">
                    <div>
                        <span class="font-medium">Total:</span>
                        <span id="exchangeProductsTotal" class="ml-2 font-bold">₹0.00</span>
                    </div>
                    <div>
                        <button id="cancelExchangeProductBtn" class="px-4 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 mr-2">
                            Cancel
                        </button>
                        <button id="addExchangeProductBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                            Add Selected
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        // ... (implement the existing event listeners)
        
        // Example of updating the exchange items:
        document.getElementById('addExchangeProductBtn').addEventListener('click', () => {
            // Get selected products
            const selectedProducts = [];
            const qtyInputs = document.querySelectorAll('.exchange-product-qty');
            let totalExchangeValue = 0;
            
            qtyInputs.forEach(input => {
                const quantity = parseInt(input.value);
                if (quantity > 0) {
                    const index = parseInt(input.dataset.index);
                    const price = parseFloat(input.dataset.price);
                    const product = products[index];
                    const total = quantity * price;
                    
                    totalExchangeValue += total;
                    
                    selectedProducts.push({
                        name: product.name,
                        code: product.code,
                        price: price, // Use rate/price, not MRP
                        quantity: quantity,
                        total: total,
                        // Store both for reference, but use rate for calculations
                        rate: product.rate || product.price,
                        mrp: product.mrp
                    });
                }
            });
            
            // Add exchange items and update UI
            this.updateExchangeItems(selectedProducts, totalExchangeValue);
            
            // Remove the modal
            document.getElementById('exchangeProductModal').remove();
        });
    }
    
    /**
     * Generate HTML for product rows in exchange selection modal
     */
    generateProductRows(products) {
        if (!products || products.length === 0) {
            return `
                <tr>
                    <td colspan="5" class="px-4 py-4 text-center text-gray-500">
                        No products available for exchange
                    </td>
                </tr>
            `;
        }
        
        return products.map(product => {
            // Enhanced price extraction to check multiple possible fields
            // Try to find price in any of these common fields
            let price = 0;
            
            // Log the product to see what price fields it has
            console.log('Product for price extraction:', product);
            
            if (typeof product.sellingPrice === 'number') price = product.sellingPrice;
            else if (typeof product.price === 'number') price = product.price;
            else if (typeof product.mrp === 'number') price = product.mrp;
            else if (typeof product.retailPrice === 'number') price = product.retailPrice;
            else if (typeof product.salePrice === 'number') price = product.salePrice;
            
            // Try string conversions if still zero
            if (price === 0) {
                if (product.sellingPrice) price = parseFloat(product.sellingPrice);
                else if (product.price) price = parseFloat(product.price);
                else if (product.mrp) price = parseFloat(product.mrp);
                else if (product.retailPrice) price = parseFloat(product.retailPrice);
                else if (product.salePrice) price = parseFloat(product.salePrice);
            }
            
            console.log(`Extracted price for ${product.name}: ${price}`);
            
            return `
                <tr class="exchange-product-row" data-product-id="${product.id || ''}" data-barcode="${product.barcode || ''}">
                    <td class="px-3 py-2">
                        <div class="font-medium">${product.name || 'Unnamed Product'}</div>
                        <div class="text-xs text-gray-500">${product.barcode || 'No barcode'}</div>
                    </td>
                    <td class="px-3 py-2 text-center">₹${price.toFixed(2)}</td>
                    <td class="px-3 py-2 text-center">${product.stock || 0}</td>
                    <td class="px-3 py-2 text-center">
                        <input type="number" 
                            class="exchange-qty-input border rounded w-16 px-2 py-1 text-center" 
                            min="0" 
                            max="${product.stock || 0}" 
                            value="0" 
                            data-price="${price.toFixed(2)}"
                            data-product='${JSON.stringify({
                                id: product.id || '',
                                barcode: product.barcode || '',
                                name: product.name || 'Unnamed Product',
                                price: price
                            }).replace(/'/g, "&#39;")}'>
                    </td>
                    <td class="px-3 py-2 text-center">
                        <button class="add-exchange-item px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Attach event listeners to quantity inputs in exchange modal
     */
    attachExchangeQuantityListeners() {
        console.log('Attaching exchange quantity listeners');
        
        // Add event listeners to quantity inputs
        const qtyInputs = document.querySelectorAll('.exchange-qty-input');
        qtyInputs.forEach(input => {
            // Remove any existing event listeners
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // Add new event listener
            newInput.addEventListener('input', () => {
                this.updateExchangeSelectionTotal();
            });
        });
        
        // Add event listeners to add buttons
        const addButtons = document.querySelectorAll('.add-exchange-item');
        addButtons.forEach(button => {
            // Remove any existing event listeners
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add new event listener
            newButton.addEventListener('click', (e) => {
                const row = e.target.closest('.exchange-product-row');
                const input = row.querySelector('.exchange-qty-input');
                
                // Set quantity to 1 if it's currently 0
                if (parseInt(input.value) === 0) {
                    input.value = 1;
                }
                
                this.updateExchangeSelectionTotal();
            });
        });
        
        // Initialize the counter display
        this.updateExchangeSelectionTotal();
    }
    
    /**
     * Update the selected count and total in exchange modal
     */
    updateExchangeSelectionTotal() {
        console.log('Updating exchange selection total');
        
        const inputs = document.querySelectorAll('.exchange-qty-input');
        let selectedCount = 0;
        let total = 0;
        
        inputs.forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                selectedCount++;
                const price = parseFloat(input.dataset.price) || 0;
                total += price * qty;
            }
        });
        
        // Update the UI
        document.getElementById('exchangeSelectedCount').textContent = selectedCount;
        document.getElementById('exchangeSelectedTotal').textContent = total.toFixed(2);
        
        // Enable/disable confirm button based on selection
        const confirmButton = document.getElementById('confirmExchangeSelection');
        if (selectedCount > 0) {
            confirmButton.disabled = false;
            confirmButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
            confirmButton.classList.add('bg-green-500', 'hover:bg-green-600');
        } else {
            confirmButton.disabled = true;
            confirmButton.classList.remove('bg-green-500', 'hover:bg-green-600');
            confirmButton.classList.add('bg-gray-300', 'cursor-not-allowed');
        }
    }
    
    /**
     * Collect selected items from the exchange product modal
     */
    collectSelectedExchangeItems() {
        console.log('Collecting selected exchange items');
        
        const selectedProducts = [];
        const inputs = document.querySelectorAll('.exchange-qty-input');
        
        inputs.forEach(input => {
            const qty = parseInt(input.value) || 0;
            if (qty > 0) {
                try {
                    // Parse the product data from the input
                    const productData = JSON.parse(input.dataset.product);
                    
                    // Add quantity and calculate total
                    const product = {
                        ...productData,
                        quantity: qty,
                        total: (parseFloat(productData.price) || 0) * qty
                    };
                    
                    selectedProducts.push(product);
                } catch (error) {
                    console.error('Error parsing product data:', error);
                }
            }
        });
        
        console.log('Selected products:', selectedProducts);
        return selectedProducts;
    }
    
    /**
     * Add the selected exchange items to the form
     */
    addExchangeItemsToForm(selectedProducts) {
        console.log('Adding exchange items to form:', selectedProducts);
        
        if (!selectedProducts || selectedProducts.length === 0) {
            alert('No products selected for exchange');
            return;
        }
        
        // Show the exchange items list
        const exchangeItemsList = document.getElementById('exchangeItemsList');
        exchangeItemsList.classList.remove('hidden');
        
        // Generate HTML for selected products
        const html = `
            <input type="hidden" id="exchangeItemsData" value='${JSON.stringify(selectedProducts)}'>
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-2 py-1 text-left text-xs font-medium text-gray-500">Product</th>
                        <th class="px-2 py-1 text-center text-xs font-medium text-gray-500">Qty</th>
                        <th class="px-2 py-1 text-right text-xs font-medium text-gray-500">Price</th>
                        <th class="px-2 py-1 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${selectedProducts.map(product => `
                        <tr>
                            <td class="px-2 py-1 text-sm">
                                ${product.name}
                                <div class="text-xs text-gray-500">${product.barcode || 'No barcode'}</div>
                            </td>
                            <td class="px-2 py-1 text-sm text-center">${product.quantity}</td>
                            <td class="px-2 py-1 text-sm text-right">₹${parseFloat(product.price).toFixed(2)}</td>
                            <td class="px-2 py-1 text-sm text-right">₹${product.total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="font-medium bg-gray-50">
                        <td colspan="3" class="px-2 py-1 text-right">Total:</td>
                        <td class="px-2 py-1 text-right">₹${selectedProducts.reduce((sum, p) => sum + p.total, 0).toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
            <div class="mt-2 flex justify-end">
                <button id="clearExchangeItems" class="px-2 py-1 text-xs text-red-500 hover:text-red-700">
                    <i class="fas fa-times"></i> Clear Items
                </button>
            </div>
        `;
        
        // Update the DOM
        exchangeItemsList.innerHTML = html;
        
        // Add event listener to clear button
        document.getElementById('clearExchangeItems').addEventListener('click', () => {
            exchangeItemsList.innerHTML = '';
            exchangeItemsList.classList.add('hidden');
            
            // Update balance display
            this.updateRefundExchangeBalance();
        });
        
        // Update balance display
        this.updateRefundExchangeBalance();
    }
    
    /**
     * Calculate and display the balance between refund and exchange items
     */
    updateRefundExchangeBalance() {
        console.log('Updating refund/exchange balance');
        
        // Only relevant for exchanges
        if (this.refundType !== 'exchange') return;
        
        try {
            // Get refund amount
            const refundAmount = parseFloat(document.getElementById('refundAmount').value) || 0;
            
            // Get exchange items value
            let exchangeValue = 0;
            const exchangeItemsData = document.getElementById('exchangeItemsData');
            if (exchangeItemsData && exchangeItemsData.value) {
                const exchangeItems = JSON.parse(exchangeItemsData.value);
                exchangeValue = exchangeItems.reduce((total, item) => total + (item.total || 0), 0);
            }
            
            // Calculate balance
            const balance = refundAmount - exchangeValue;
            
            // Remove existing balance display if exists
            const existingBalance = document.getElementById('exchangeBalance');
            if (existingBalance) {
                existingBalance.remove();
            }
            
            // Create balance display
            const balanceHTML = `
                <div id="exchangeBalance" class="mt-4 p-3 rounded ${balance >= 0 ? 'bg-green-50' : 'bg-red-50'}">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-sm font-medium">Refund Amount:</div>
                            <div class="text-sm font-medium">Exchange Value:</div>
                            <div class="text-lg font-bold mt-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">Balance:</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm">₹${refundAmount.toFixed(2)}</div>
                            <div class="text-sm">₹${exchangeValue.toFixed(2)}</div>
                            <div class="text-lg font-bold mt-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${balance >= 0 ? 
                                    `₹${balance.toFixed(2)} (Customer Receives)` : 
                                    `₹${Math.abs(balance).toFixed(2)} (Customer Pays)`}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add to DOM
            const formGroup = document.querySelector('#processRefundSection .grid');
            formGroup.insertAdjacentHTML('beforeend', balanceHTML);
            
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    }
    
    /**
     * Enhanced processRefund method to handle exchanges
     */
    processRefund() {
        console.log('Processing refund/exchange');
        
        try {
            // Validate input
            const reason = document.getElementById('refundReason').value;
            if (!reason) {
                alert('Please select a reason for the refund/exchange');
                return false;
            }
            
            // Debug the current state of selectedItems
            console.log('CRITICAL DEBUG - Selected Items:', JSON.stringify(this.selectedItems));
            
            // NEW! Use the helper method to ensure correct format
            const formattedItems = this.ensureSelectedItemsFormat();
            
            console.log('Formatted items for processing:', formattedItems);
            
            // Build refund items array using the formatted items
            const refundItems = formattedItems.map(item => {
                // Clone the item to avoid reference issues
                return {
                    name: item.name,
                    code: item.code,
                    price: item.price,
                    quantity: item.quantity,
                    total: item.total,
                    rate: item.rate
                };
            });
            
            console.log('Refund items prepared:', refundItems);
            
            // Get exchange items if applicable
            let exchangeItems = [];
            if (this.refundType === 'exchange') {
                const exchangeItemsData = document.getElementById('exchangeItemsData');
                if (exchangeItemsData && exchangeItemsData.value) {
                    exchangeItems = JSON.parse(exchangeItemsData.value);
                }
            }
            
            // Calculate total refund amount directly from the formatted items
            const totalRefundAmount = formattedItems.reduce((total, item) => total + item.total, 0);
            console.log('DIRECT calculated total:', totalRefundAmount);
            
            // For safety, also read from the field as fallback
            const refundAmountField = document.getElementById('refundAmount');
            const fieldAmount = refundAmountField ? parseFloat(refundAmountField.value) : 0;
            console.log('Field amount:', fieldAmount);
            
            // Super-robust determination of refund amount:
            let refundAmount = 0;
            
            // Try these approaches in order:
            if (!isNaN(totalRefundAmount) && totalRefundAmount > 0) {
                // 1. Use calculated total from formatted items (most reliable)
                refundAmount = totalRefundAmount;
                console.log('Using total from formatted items:', refundAmount);
            } else if (!isNaN(fieldAmount) && fieldAmount > 0) {
                // 2. Use field value if valid
                refundAmount = fieldAmount;
                console.log('Using field amount:', refundAmount);
            } else {
                // 3. Calculate manually as last resort
                let manualTotal = 0;
                this.currentBill.items.forEach((item, index) => {
                    if (this.selectedItems.includes(index)) {
                        const qtyEl = document.querySelector(`.refund-qty[data-index="${index}"]`);
                        const qty = qtyEl ? parseInt(qtyEl.value) : 1;
                        const validQty = isNaN(qty) ? 1 : qty;
                        const price = parseFloat(item.rate || item.price || 0);
                        manualTotal += price * validQty;
                    }
                });
                refundAmount = manualTotal;
                console.log('Using manual calculation:', refundAmount);
            }
            
            console.log('FINAL REFUND AMOUNT DETERMINED:', refundAmount.toFixed(2));
            
            const exchangeValue = exchangeItems.reduce((total, item) => total + (item.total || 0), 0);
            
            // Calculate final balance
            const finalBalance = this.refundType === 'exchange' ? refundAmount - exchangeValue : refundAmount;
            
            // Create refund record with verified data
            const refund = {
                id: this.generateRefundId(),
                originalBillId: this.currentBill.id || this.currentBill.billNumber,
                date: new Date().toISOString(),
                type: this.refundType,
                items: refundItems,
                exchangeItems: exchangeItems,
                refundAmount: refundAmount,
                exchangeValue: exchangeValue,
                finalBalance: finalBalance,
                reason: reason,
                notes: document.getElementById('refundNotes').value,
                status: 'completed',
                // Add extra verification data to help with debugging
                _verificationData: {
                    calculatedTotal: totalRefundAmount,
                    fieldValue: fieldAmount,
                    formattedItemsCount: formattedItems.length,
                    originalSelectedItems: JSON.stringify(this.selectedItems),
                    totalItems: refundItems.length
                }
            };
            
            // Add refund to refunds array
            this.refunds.push(refund);
            
            // Save refunds to localStorage
            this.saveRefunds();
            
            // Update inventory
            this.updateInventoryForRefund(refundItems, exchangeItems);
            
            // Show success message
            if (this.refundType === 'exchange') {
                let message = `Exchange processed successfully!`;
                if (finalBalance > 0) {
                    message += ` Customer receives ₹${finalBalance.toFixed(2)}`;
                } else if (finalBalance < 0) {
                    message += ` Customer pays ₹${Math.abs(finalBalance).toFixed(2)}`;
                } else {
                    message += ` Even exchange - no balance due.`;
                }
                alert(message);
            } else {
                // Final check - make 100% sure we have a reasonable amount
                if (refundAmount <= 0) {
                    console.error("Refund amount is zero or negative - last attempt to get a valid amount");
                    
                    // Check field value directly as absolute last resort
                    const fieldEl = document.getElementById('refundAmount');
                    if (fieldEl) {
                        const rawValue = fieldEl.value.trim();
                        console.log("Raw field value for final check:", rawValue);
                        
                        // Try to extract a number from the string
                        const match = rawValue.match(/\d+(\.\d+)?/);
                        if (match) {
                            const extractedAmount = parseFloat(match[0]);
                            if (!isNaN(extractedAmount) && extractedAmount > 0) {
                                refundAmount = extractedAmount;
                                console.log("Extracted amount from field:", refundAmount);
                            }
                        }
                    }
                }
                
                // Prepare the message
                let message = '';
                
                // If we have a valid amount, show it
                if (refundAmount > 0) {
                    message = `Refund of ₹${refundAmount.toFixed(2)} processed successfully!`;
                } else {
                    // Fallback message to avoid showing zero
                    message = `Refund processed successfully!`;
                }
                
                // Add debug info in development
                if (this.selectedItems && this.selectedItems.length > 0) {
                    message += `\n\nRefunded items: ${this.selectedItems.length}`;
                }
                
                // Show the message
                alert(message);
            }
            
            // Close modal
            this.hideRefundModal();
            
            return true;
        } catch (error) {
            console.error('Error processing refund/exchange:', error);
            alert(`Error processing ${this.refundType}. Please try again.`);
            return false;
        }
    }
    
    /**
     * Update inventory for both refunded and exchanged items
     */
    updateInventoryForRefund(refundItems, exchangeItems) {
        // First update inventory for refunded items (add back to inventory)
        if (refundItems && refundItems.length > 0) {
            this.updateInventory(refundItems); // This adds items back to inventory
        }
        
        // Then update inventory for exchange items (subtract from inventory)
        if (exchangeItems && exchangeItems.length > 0) {
            try {
                // Check if inventory manager exists
                if (window.inventoryManager && typeof window.inventoryManager.updateStock === 'function') {
                    // Update stock for each exchange item
                    exchangeItems.forEach(item => {
                        // For exchange items, we subtract from inventory
                        window.inventoryManager.updateStock(item.barcode, item.quantity, 'subtract');
                    });
                } else {
                    console.warn('Inventory manager not available for exchange items');
                    
                    // Fallback: update product stock directly
                    if (window.productManager && Array.isArray(window.productManager.products)) {
                        exchangeItems.forEach(item => {
                            if (!item.barcode) return;
                            
                            // Find product by barcode
                            const product = window.productManager.products.find(p => p.barcode === item.barcode);
                            if (product) {
                                // Update stock
                                product.stock = Math.max(0, (product.stock || 0) - item.quantity);
                                // Save products
                                window.productManager.saveProducts();
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Error updating inventory for exchange items:', error);
            }
        }
    }
    
    /**
     * Generate a unique refund ID
     * @returns {string} Unique refund ID
     */
    generateRefundId() {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        return `R${timestamp}${random}`;
    }
    
    /**
     * Update inventory after refund/exchange
     * @param {Array} items - Array of refunded items
     */
    updateInventory(items) {
        console.log('Updating inventory after refund/exchange');
        
        if (!items || !Array.isArray(items)) return;
        
        try {
            // Check if inventory manager exists
            if (window.inventoryManager && typeof window.inventoryManager.updateStock === 'function') {
                // Update stock for each refunded item
                items.forEach(item => {
                    // For refunds, we add the items back to inventory
                    window.inventoryManager.updateStock(item.barcode, item.quantity, 'add');
                });
            } else {
                console.warn('Inventory manager not available to update stock');
                
                // Fallback: update product stock directly
                if (window.productManager && Array.isArray(window.productManager.products)) {
                    items.forEach(item => {
                        if (!item.barcode) return;
                        
                        // Find product by barcode
                        const product = window.productManager.products.find(p => p.barcode === item.barcode);
                        if (product) {
                            // Update stock
                            product.stock = (product.stock || 0) + item.quantity;
                            // Save products
                            window.productManager.saveProducts();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
        }
    }
    
    /**
     * Get all refunds
     * @returns {Array} Array of refund records
     */
    getRefunds() {
        return this.refunds;
    }
    
    /**
     * Get refunds for a specific bill
     * @param {string} billId - ID of the bill
     * @returns {Array} Array of refund records for the bill
     */
    getRefundsForBill(billId) {
        return this.refunds.filter(refund => refund.originalBillId === billId);
    }
    
    /**
     * Handle refund records tab functionality
     */
    setupRefundRecordsTab() {
        // Tab click handler
        document.getElementById('refundRecordsTab').addEventListener('click', () => {
            this.showTab('refundRecords');
            this.loadRefundRecords();
        });
        
        // Filter change handler
        document.getElementById('refundRecordFilter').addEventListener('change', () => {
            this.loadRefundRecords();
        });
        
        // Search input handler
        document.getElementById('refundRecordSearch').addEventListener('input', () => {
            this.loadRefundRecords();
        });
        
        // Pagination handlers
        document.getElementById('refundRecordsPrevPage').addEventListener('click', () => {
            if (this.recordsPage > 1) {
                this.recordsPage--;
                this.loadRefundRecords();
            }
        });
        
        document.getElementById('refundRecordsNextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredRecords.length / this.recordsPerPage);
            if (this.recordsPage < totalPages) {
                this.recordsPage++;
                this.loadRefundRecords();
            }
        });
        
        // Close record detail modal
        document.getElementById('closeRecordDetailBtn').addEventListener('click', () => {
            document.getElementById('refundRecordDetailModal').classList.add('hidden');
        });
    }
    
    /**
     * Load and display refund records
     */
    loadRefundRecords() {
        console.log('Loading refund records');
        
        // Initialize pagination if not already set
        if (!this.recordsPage) this.recordsPage = 1;
        if (!this.recordsPerPage) this.recordsPerPage = 10;
        
        // Get filter and search values
        const filterType = document.getElementById('refundRecordFilter').value;
        const searchTerm = document.getElementById('refundRecordSearch').value.toLowerCase();
        
        // Filter records
        this.filteredRecords = this.refunds.filter(record => {
            // Filter by type
            if (filterType !== 'all' && record.type !== filterType) return false;
            
            // Filter by search term
            if (searchTerm) {
                const searchFields = [
                    record.id,
                    record.originalBillId,
                    record.reason,
                    record.notes,
                    new Date(record.date).toLocaleDateString()
                ];
                
                // Search in items if they exist
                if (record.items && Array.isArray(record.items)) {
                    record.items.forEach(item => {
                        if (item.name) searchFields.push(item.name);
                        if (item.barcode) searchFields.push(item.barcode);
                    });
                }
                
                return searchFields.some(field => 
                    field && field.toString().toLowerCase().includes(searchTerm)
                );
            }
            
            return true;
        });
        
        // Sort records by date (newest first)
        this.filteredRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate pagination
        const totalRecords = this.filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / this.recordsPerPage);
        const start = (this.recordsPage - 1) * this.recordsPerPage;
        const end = Math.min(start + this.recordsPerPage, totalRecords);
        const currentPageRecords = this.filteredRecords.slice(start, end);
        
        // Update pagination UI
        document.getElementById('refundRecordsShowing').textContent = totalRecords > 0 ? 
            `${start + 1}-${end}` : '0';
        document.getElementById('refundRecordsTotal').textContent = totalRecords;
        
        // Enable/disable pagination buttons
        document.getElementById('refundRecordsPrevPage').disabled = this.recordsPage <= 1;
        document.getElementById('refundRecordsNextPage').disabled = this.recordsPage >= totalPages;
        
        // Display records
        const recordsList = document.getElementById('refundRecordsList');
        
        if (currentPageRecords.length === 0) {
            recordsList.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-4 text-center text-gray-500">
                        No records found
                    </td>
                </tr>
            `;
        } else {
            recordsList.innerHTML = currentPageRecords.map(record => {
                // Format date
                let recordDate = 'Unknown';
                try {
                    const date = new Date(record.date);
                    if (!isNaN(date.getTime())) {
                        recordDate = date.toLocaleDateString();
                    }
                } catch (e) {
                    console.error('Error formatting record date:', e);
                }
                
                // Format type with badge
                const typeClass = record.type === 'refund' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
                const typeDisplay = record.type === 'refund' ? 'Refund' : 'Exchange';
                
                // Format amount
                const amount = record.refundAmount ? `₹${record.refundAmount.toFixed(2)}` : 'N/A';
                
                return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-4 py-2 text-sm font-medium">${record.id}</td>
                        <td class="px-4 py-2 text-sm">${recordDate}</td>
                        <td class="px-4 py-2">
                            <span class="px-2 py-1 text-xs font-medium ${typeClass} rounded-full">
                                ${typeDisplay}
                            </span>
                        </td>
                        <td class="px-4 py-2 text-sm">${record.originalBillId || 'Unknown'}</td>
                        <td class="px-4 py-2 text-sm text-right">${amount}</td>
                        <td class="px-4 py-2 text-center">
                            <button class="view-record-btn px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                data-record-id="${record.id}">
                                View Details
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
            
            // Add event listeners to view detail buttons
            recordsList.querySelectorAll('.view-record-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const recordId = e.target.dataset.recordId;
                    this.showRecordDetail(recordId);
                });
            });
        }
    }
    
    /**
     * Enhanced scrolling styles for refund detail modal - MOBILE OPTIMIZED
     */
    setupScrollingStyles() {
        if (document.getElementById('refundDetailScrollStyles')) {
            document.getElementById('refundDetailScrollStyles').remove();
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'refundDetailScrollStyles';
        styleElement.textContent = `
            /* Mobile responsive styles for refund/exchange UI */
            @media (max-width: 640px) {
                /* Modal core styles */
                #refundModal {
                    padding: 0 !important;
                }
                
                #refundModal .modal-content {
                    margin: 0;
                    height: 100vh;
                    max-height: 100vh;
                    width: 100%;
                    max-width: 100%;
                    border-radius: 0;
                    display: flex;
                    flex-direction: column;
                }
                
                /* Tab navigation for mobile */
                #refundModal .tab-navigation {
                    padding: 0.5rem !important;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    white-space: nowrap;
                    display: flex;
                    justify-content: flex-start;
                    background: #f9fafb;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                
                #refundModal .tab-navigation button {
                    padding: 0.5rem 0.75rem;
                    font-size: 0.875rem;
                    flex-shrink: 0;
                }
                
                /* Main content area */
                #refundModal .refund-tab-content {
                    padding: 1rem !important;
                    flex: 1;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                /* Form elements */
                #refundModal input, 
                #refundModal select, 
                #refundModal textarea {
                    font-size: 16px !important; /* Prevents iOS zoom */
                    padding: 0.75rem !important;
                    margin-bottom: 1rem;
                }
                
                #refundModal label {
                    margin-bottom: 0.25rem;
                    display: block;
                }
                
                /* Tables */
                #refundModal .table-responsive {
                    margin: 0 -1rem;
                    padding: 0 1rem;
                    width: calc(100% + 2rem);
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                
                /* Detail modal */
                #refundRecordDetailModal .bg-white {
                    height: 100vh !important;
                    max-height: 100vh !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                }
                
                /* Navigation buttons */
                .mobile-nav-buttons {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: white;
                    padding: 0.75rem 1rem;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    z-index: 20;
                    display: flex;
                    justify-content: space-between;
                }
                
                /* Fix padding for bottom fixed buttons */
                #refundModal .refund-tab-content {
                    padding-bottom: 5rem !important;
                }
                
                /* Make buttons easier to tap */
                #refundModal button,
                #refundRecordDetailModal button {
                    min-height: 44px;
                    min-width: 44px;
                    padding: 0.75rem 1rem !important;
                }
                
                /* Collapsible sections for mobile */
                .mobile-collapsible .collapse-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.3s ease-out;
                }
                
                .mobile-collapsible.expanded .collapse-content {
                    max-height: 1000px;
                }
                
                /* Adjust grid columns for mobile */
                .grid-cols-2,
                .grid-cols-3,
                .grid-cols-4 {
                    grid-template-columns: 1fr !important;
                }
                
                /* Item tables on mobile */
                .items-table-mobile td {
                    padding: 0.5rem !important;
                }
                
                .items-table-mobile th {
                    display: none;
                }
                
                .items-table-mobile tr {
                    display: block;
                    border: 1px solid #eee;
                    margin-bottom: 0.5rem;
                border-radius: 0.375rem;
                    padding: 0.5rem;
                }
                
                .items-table-mobile td:before {
                    content: attr(data-label);
                    font-weight: 600;
                    display: inline-block;
                    width: 40%;
                }
                
                /* Refund records table */
                #refundRecordsSection .border {
                    border: none !important;
                }
                
                #refundRecordsList tr {
                    display: flex;
                    flex-wrap: wrap;
                    border-bottom: 1px solid #eee;
                    padding: 0.5rem 0;
                }
                
                #refundRecordsList td:nth-child(1) {
                    flex: 1;
                    min-width: 60%;
                }
                
                #refundRecordsList td:nth-child(2) {
                    flex: 1;
                    min-width: 40%;
                    text-align: right;
                }
                
                #refundRecordsList th {
                    display: none;
                }
                
                /* Optimized action buttons for mobile */
                .mobile-action-buttons {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 0.5rem;
                }
                
                .mobile-action-buttons button {
                    background-color: #f3f4f6;
                    border-radius: 50%;
                    width: 2.5rem;
                    height: 2.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-left: 0.5rem;
                }
            }
        `;
        
        document.head.appendChild(styleElement);
        
        // Add mobile optimizations
        this.applyMobileOptimizations();
    }
    
    /**
     * Apply mobile-specific optimizations
     */
    applyMobileOptimizations() {
        // Check if mobile view
        const isMobile = window.innerWidth <= 640;
        if (!isMobile) return;
        
        // Get all the elements we need to modify
        const refundModal = document.getElementById('refundModal');
        if (!refundModal) return;
        
        // 1. Fix the refund records table for mobile
        this.optimizeRefundRecordsTable();
        
        // 2. Add mobile navigation buttons for tabs
        this.addMobileNavigationButtons();
        
        // 3. Make tables responsive for small screens
        this.makeTablesResponsive();
        
        // 4. Check for mobile-specific form issues
        this.fixMobileInputs();
        
        // 5. Add swipe navigation to tabs
        this.addSwipeNavigation();
    }
    
    /**
     * Optimize the refund records table for mobile view
     */
    optimizeRefundRecordsTable() {
        const recordsTable = document.querySelector('#refundRecordsList');
        if (!recordsTable) return;
        
        // Mark table for mobile styling
        recordsTable.classList.add('mobile-records-table');
        
        // Add mobile-specific container
        const tableContainer = recordsTable.closest('div');
        if (tableContainer) {
            tableContainer.classList.add('table-responsive');
        }
        
        // Adjust pagination for mobile
        const pagination = document.querySelector('.refund-records-pagination');
        if (pagination) {
            pagination.classList.add('flex', 'justify-between', 'items-center', 'mt-4');
        }
    }
    
    /**
     * Add mobile navigation buttons for tabs
     */
    addMobileNavigationButtons() {
        // Only on mobile
        const isMobile = window.innerWidth <= 640;
        if (!isMobile) return;
        
        // Add fixed navigation buttons at the bottom for each tab
        const findBillContent = document.getElementById('findBillContent');
        const selectItemsContent = document.getElementById('selectItemsContent');
        const processRefundContent = document.getElementById('processRefundContent');
        
        // Create navigation buttons for FindBill tab
        if (findBillContent) {
            let navButtons = findBillContent.querySelector('.mobile-nav-buttons');
            if (!navButtons) {
                navButtons = document.createElement('div');
                navButtons.className = 'mobile-nav-buttons';
                navButtons.innerHTML = `
                    <button class="btn-secondary px-4 py-2 rounded" onclick="refundManager.hideRefundModal()">
                        Cancel
                    </button>
                    <button id="mobileFindBillNextBtn" class="btn-primary px-4 py-2 rounded" disabled>
                        Next
                    </button>
                `;
                findBillContent.appendChild(navButtons);
                
                // Add logic to enable/disable the Next button
                const nextButton = navButtons.querySelector('#mobileFindBillNextBtn');
                nextButton.addEventListener('click', () => {
                    if (this.currentBill) {
                        this.showTab('selectItems');
                    }
                });
                
                // Update the button state when a bill is selected
                const observer = new MutationObserver(() => {
                    nextButton.disabled = !this.currentBill;
                });
                
                observer.observe(findBillContent, { 
                    childList: true, 
                    subtree: true 
                });
            }
        }
        
        // Create navigation buttons for SelectItems tab
        if (selectItemsContent) {
            let navButtons = selectItemsContent.querySelector('.mobile-nav-buttons');
            if (!navButtons) {
                navButtons = document.createElement('div');
                navButtons.className = 'mobile-nav-buttons';
                navButtons.innerHTML = `
                    <button class="btn-secondary px-4 py-2 rounded" onclick="refundManager.showTab('findBill')">
                        Back
                    </button>
                    <button id="mobileSelectItemsNextBtn" class="btn-primary px-4 py-2 rounded" disabled>
                        Next
                    </button>
                `;
                selectItemsContent.appendChild(navButtons);
                
                // Add logic for the Next button
                const nextButton = navButtons.querySelector('#mobileSelectItemsNextBtn');
                nextButton.addEventListener('click', () => {
                    if (this.selectedItems.length > 0) {
                        this.showTab('processRefund');
                    } else {
                        alert('Please select at least one item for refund/exchange');
                    }
                });
                
                // Update button state based on selected items
                const updateButtonState = () => {
                    nextButton.disabled = this.selectedItems.length === 0;
                };
                
                // Call initially
                updateButtonState();
                
                // Setup observer to detect changes
                const observer = new MutationObserver(() => {
                    updateButtonState();
                });
                
                observer.observe(selectItemsContent, {
                    childList: true,
                    subtree: true
                });
            }
        }
        
        // Create navigation buttons for ProcessRefund tab
        if (processRefundContent) {
            let navButtons = processRefundContent.querySelector('.mobile-nav-buttons');
            if (!navButtons) {
                navButtons = document.createElement('div');
                navButtons.className = 'mobile-nav-buttons';
                navButtons.innerHTML = `
                    <button class="btn-secondary px-4 py-2 rounded" onclick="refundManager.showTab('selectItems')">
                        Back
                    </button>
                    <button id="mobileProcessRefundBtn" class="btn-success px-4 py-2 rounded">
                        Complete
                    </button>
                `;
                processRefundContent.appendChild(navButtons);
                
                // Add event listener for the complete button
                navButtons.querySelector('#mobileProcessRefundBtn').addEventListener('click', () => {
                    this.processRefund();
                });
            }
        }
    }
    
    /**
     * Make tables responsive for mobile screens
     */
    makeTablesResponsive() {
        // Find all tables in the refund modal
        const tables = document.querySelectorAll('#refundModal table');
        tables.forEach(table => {
            const container = table.parentElement;
            if (!container.classList.contains('table-responsive')) {
                container.classList.add('table-responsive');
            }
            
            // For item selection tables, add special mobile handling
            if (table.classList.contains('items-table')) {
                table.classList.add('items-table-mobile');
                
                // Add data attributes for mobile labels
                const headerCells = table.querySelectorAll('thead th');
                const headerTexts = Array.from(headerCells).map(th => th.textContent.trim());
                
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    cells.forEach((cell, index) => {
                        if (index < headerTexts.length) {
                            cell.setAttribute('data-label', headerTexts[index]);
                        }
                    });
                });
            }
        });
    }
    
    /**
     * Fix mobile inputs to prevent zoom and improve usability
     */
    fixMobileInputs() {
        // Target all form inputs in the modal
        const inputs = document.querySelectorAll('#refundModal input, #refundModal select, #refundModal textarea');
        inputs.forEach(input => {
            // Set font-size to prevent iOS zoom
            input.style.fontSize = '16px';
            
            // Add better touch target padding
            input.classList.add('mobile-input');
            
            // For number inputs, use tel type on mobile which shows number keyboard without stepper
            if (input.type === 'number') {
                input.setAttribute('inputmode', 'decimal');
                
                // Add pattern to ensure only numbers can be entered
                input.setAttribute('pattern', '[0-9]*\\.?[0-9]*');
            }
        });
    }
    
    /**
     * Add swipe navigation between tabs
     */
    addSwipeNavigation() {
        const refundModal = document.getElementById('refundModal');
        if (!refundModal) return;
        
        let touchStartX = 0;
        let touchEndX = 0;
        
        const tabNames = ['findBill', 'selectItems', 'processRefund'];
        
        const handleSwipe = () => {
            const swipeDistance = touchEndX - touchStartX;
            if (Math.abs(swipeDistance) < 50) return; // Minimum swipe distance
            
            // Find current tab
            let currentTabIndex = -1;
            for (let i = 0; i < tabNames.length; i++) {
                const tabContent = document.getElementById(`${tabNames[i]}Content`);
                if (tabContent && !tabContent.classList.contains('hidden')) {
                    currentTabIndex = i;
                    break;
                }
            }
            
            if (currentTabIndex === -1) return;
            
            if (swipeDistance > 0) {
                // Swipe right - go to previous tab
                if (currentTabIndex > 0) {
                    this.showTab(tabNames[currentTabIndex - 1]);
                }
            } else {
                // Swipe left - go to next tab
                if (currentTabIndex < tabNames.length - 1) {
                    if (currentTabIndex === 0 && !this.currentBill) return;
                    if (currentTabIndex === 1 && this.selectedItems.length === 0) return;
                    
                    this.showTab(tabNames[currentTabIndex + 1]);
                }
            }
        };
        
        refundModal.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        refundModal.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }
    
    /**
     * Render the list of refund records with mobile-optimized layout
     */
    renderRefundRecords(records) {
        const container = document.getElementById('refundRecordsList');
        if (!container) return;
        
        // Clear existing records
        container.innerHTML = '';
        
        if (records.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="px-4 py-4 text-center text-gray-500">
                        No records found.
                    </td>
                </tr>
            `;
            return;
        }
        
        // Check if mobile view
        const isMobile = window.innerWidth <= 640;
        
        // Calculate pagination
        const start = (this.recordsPage - 1) * this.recordsPerPage;
        const end = Math.min(start + this.recordsPerPage, records.length);
        const pageRecords = records.slice(start, end);
        
        // Update records count display
        document.getElementById('refundRecordsShowing').textContent = `${start + 1}-${end}`;
        document.getElementById('refundRecordsTotal').textContent = records.length;
        
        // Update pagination buttons
        document.getElementById('refundRecordsPrevPage').disabled = this.recordsPage === 1;
        document.getElementById('refundRecordsNextPage').disabled = end >= records.length;
        
        // Render the records
        pageRecords.forEach(record => {
            const recordDate = new Date(record.date);
            const formattedDate = isNaN(recordDate.getTime()) ? 'Unknown' : recordDate.toLocaleDateString();
            
            const recordTypeClass = record.type === 'refund' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
            const recordTypeIcon = record.type === 'refund' ? 'fa-undo' : 'fa-exchange-alt';
            
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50';
            
            if (isMobile) {
                // Optimized mobile layout
                tr.innerHTML = `
                    <td class="px-3 py-3">
                        <div class="flex items-center">
                            <span class="w-7 h-7 flex items-center justify-center rounded-full ${recordTypeClass} mr-2">
                                <i class="fas ${recordTypeIcon} text-xs"></i>
                            </span>
                            <div>
                                <div class="font-medium">${record.id.substring(0, 8)}</div>
                                <div class="text-xs text-gray-500">
                                    ${formattedDate} · Bill: ${record.originalBillId ? record.originalBillId.substring(0, 6) : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="px-3 py-3">
                        <div class="text-right font-medium">₹${record.refundAmount ? record.refundAmount.toFixed(2) : '0.00'}</div>
                        <div class="mobile-action-buttons">
                            <button class="view-record-btn text-blue-600" data-record-id="${record.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="print-record-btn text-green-600" data-record-id="${record.id}">
                                <i class="fas fa-print"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                // Desktop layout
                tr.innerHTML = `
                    <td class="px-4 py-3">
                        <div class="flex items-center">
                            <span class="w-8 h-8 flex items-center justify-center rounded-full ${recordTypeClass} mr-2">
                                <i class="fas ${recordTypeIcon} text-xs"></i>
                            </span>
                            <div>
                                <div class="font-medium">${record.id.substring(0, 8)}</div>
                                <div class="text-xs text-gray-500">Original: ${record.originalBillId ? record.originalBillId.substring(0, 8) : 'N/A'}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600">${formattedDate}</td>
                    <td class="px-4 py-3 text-right font-medium">₹${record.refundAmount ? record.refundAmount.toFixed(2) : '0.00'}</td>
                    <td class="px-4 py-3 text-center">
                        <button class="view-record-btn text-blue-600 hover:text-blue-800 p-1" data-record-id="${record.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="print-record-btn text-green-600 hover:text-green-800 p-1 ml-2" data-record-id="${record.id}">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                `;
            }
            
            container.appendChild(tr);
            
            // Add event listeners for the buttons
            const viewButton = tr.querySelector('.view-record-btn');
            if (viewButton) {
                viewButton.addEventListener('click', () => {
                    this.showRecordDetail(record.id);
                });
            }
            
            const printButton = tr.querySelector('.print-record-btn');
            if (printButton) {
                printButton.addEventListener('click', () => {
                    this.printRecord(record.id);
                });
            }
        });
    }
    
    /**
     * Show detailed view of a refund/exchange record with mobile optimizations
     */
    showRecordDetail(recordId) {
        console.log('Showing record detail for ID:', recordId);
        
        // Setup enhanced scrolling styles for mobile support
        this.setupScrollingStyles();
        
        // Find record by ID
        const record = this.refunds.find(r => r.id === recordId);
        if (!record) {
            console.error('Record not found:', recordId);
            document.getElementById('refundRecordDetailContent').innerHTML = 
                '<div class="text-red-500 text-center">Record not found.</div>';
            return;
        }
        
        // Format date
        let recordDate = 'Unknown';
        try {
            const date = new Date(record.date);
            if (!isNaN(date.getTime())) {
                recordDate = date.toLocaleDateString();
            }
        } catch (e) {
            console.error('Error formatting record date:', e);
        }
        
        // Set title based on record type with icon
        document.getElementById('recordDetailTitle').innerHTML = 
            `<i class="fas fa-${record.type === 'refund' ? 'undo' : 'exchange-alt'} mr-2"></i>
             ${record.type === 'refund' ? 'Refund' : 'Exchange'} Details`;
        
        // Generate HTML for record details with improved mobile layout
        const detailContent = `
            <div class="bg-gray-50 rounded-lg mb-6 overflow-hidden shadow-sm">
                <div class="px-5 py-4 bg-gray-100 border-b border-gray-200">
                    <h4 class="font-medium text-gray-700">Transaction Information</h4>
                </div>
                <div class="p-5">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <div class="text-sm text-gray-500 mb-1">Date</div>
                            <div class="font-medium">${recordDate}</div>
                        </div>
                        
                        <div>
                            <div class="text-sm text-gray-500 mb-1">Type</div>
                            <div class="font-medium">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    record.type === 'refund' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-blue-100 text-blue-800'
                                }">
                                    <i class="fas fa-${record.type === 'refund' ? 'undo' : 'exchange-alt'} mr-1"></i>
                                    ${record.type === 'refund' ? 'Refund' : 'Exchange'}
                                </span>
                            </div>
                        </div>
                        
                        <div>
                            <div class="text-sm text-gray-500 mb-1">Amount</div>
                            <div class="font-medium">₹${record.refundAmount ? record.refundAmount.toFixed(2) : '0.00'}</div>
                        </div>
                    </div>
                    
                    <div class="border-t border-gray-200 mt-4 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <div class="text-sm text-gray-500 mb-1"><i class="fas fa-receipt mr-1"></i> Original Bill #</div>
                            <div class="font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">${record.originalBillId || 'Unknown'}</div>
                        </div>
                        
                        <div>
                            <div class="text-sm text-gray-500 mb-1"><i class="fas fa-file-invoice mr-1"></i> ${record.type === 'refund' ? 'Refund' : 'Exchange'} Receipt #</div>
                            <div class="font-medium text-green-700 bg-green-50 px-2 py-1 rounded inline-block">${record.id}</div>
                        </div>
                        
                        <div class="col-span-1 sm:col-span-2">
                            <div class="text-sm text-gray-500 mb-1">Reason</div>
                            <div class="font-medium">${this.formatReasonText(record.reason)}</div>
                        </div>
                    </div>
                    
                    ${record.notes ? `
                    <div class="mt-4 pt-4 border-t border-gray-200">
                        <div class="text-sm text-gray-500 mb-1">Notes</div>
                        <div class="bg-white p-3 rounded border border-gray-200 text-gray-700">${record.notes}</div>
                    </div>` : ''}
                </div>
            </div>
        `;
        
        // Update content and show modal
        document.getElementById('refundRecordDetailContent').innerHTML = detailContent;
        document.getElementById('refundRecordDetailModal').classList.remove('hidden');
        
        // Mobile optimization: Prevent body scrolling when modal is open
        document.body.classList.add('overflow-hidden');
        
        // Ensure modal scrolls to top
        setTimeout(() => {
            const modalContent = document.getElementById('refundRecordDetailContent');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
        }, 50);
        
        // Setup modal event handlers
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            document.getElementById('refundRecordDetailModal').classList.add('hidden');
            document.body.classList.remove('overflow-hidden'); // Restore body scrolling
        });
        
        document.getElementById('closeRecordDetailBtn').addEventListener('click', () => {
            document.getElementById('refundRecordDetailModal').classList.add('hidden');
            document.body.classList.remove('overflow-hidden'); // Restore body scrolling
        });
        
        // Fix print button in the modal
        const printBtn = document.getElementById('printModalRecordBtn');
        if (printBtn) {
            // Clone to remove existing event listeners
            const newPrintBtn = printBtn.cloneNode(true);
            printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
            
            newPrintBtn.addEventListener('click', () => {
                console.log('Print button clicked for record:', recordId);
                this.printRecord(recordId);
            });
        }
        
        // Add swipe to close for mobile
        this.setupMobileSwipeToClose('refundRecordDetailModal');
    }
    
    /**
     * Setup swipe down to close modal on mobile
     */
    setupMobileSwipeToClose(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        let touchStartY = 0;
        let touchEndY = 0;
        
        const handleSwipe = () => {
            const swipeThreshold = 100;
            const swipeDistance = touchEndY - touchStartY;
            
            if (swipeDistance > swipeThreshold) {
                // Swipe down detected, close modal
                modal.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            }
        };
        
        modal.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, {passive: true});
        
        modal.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        }, {passive: true});
    }
    
    /**
     * Format refund reason text for display
     */
    formatReasonText(reason) {
        if (!reason) return 'Unknown';
        
        // Convert kebab-case or snake_case to readable text
        let formatted = reason
            .replace(/-/g, ' ')
            .replace(/_/g, ' ');
        
        // Capitalize first letter of each word
        formatted = formatted.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        
        return formatted;
    }
    
    /**
     * Print a refund/exchange record
     */
    printRecord(recordId) {
        console.log('Printing record:', recordId);
        
        // Find record by ID
        const record = this.refunds.find(r => r.id === recordId);
        if (!record) {
            console.error('Record not found for printing:', recordId);
            alert('Error: Record not found for printing');
            return;
        }
        
        try {
            // Format date
            const recordDate = new Date(record.date);
            const formattedDate = isNaN(recordDate) ? 'Unknown Date' : 
                recordDate.toLocaleDateString() + ' ' + recordDate.toLocaleTimeString();
            
            // Get store info from settings
            const settings = window.settingsManager?.settings || {
                storeName: 'Store Name',
                storeAddress: 'Store Address',
                storePhone: 'Phone Number'
            };
            
            // Open print window
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Please allow pop-ups to print receipts');
                return;
            }
            
            // Generate receipt HTML with separate receipt numbers
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${record.type.toUpperCase()} RECEIPT #${record.id}</title>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                            font-size: 12px;
                        }
                        
                        .receipt {
                            max-width: 300px;
                            margin: 0 auto;
                            border: 1px solid #ddd;
                            padding: 10px;
                        }
                        
                        .header {
                            text-align: center;
                            margin-bottom: 10px;
                            border-bottom: 1px dashed #ddd;
                            padding-bottom: 10px;
                        }
                        
                        .store-name {
                            font-size: 16px;
                            font-weight: bold;
                        }
                        
                        .info-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 5px;
                        }
                        
                        .info-label {
                            font-weight: bold;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 10px 0;
                        }
                        
                        th, td {
                            border-bottom: 1px solid #ddd;
                            padding: 5px;
                            text-align: left;
                        }
                        
                        .total-section {
                            border-top: 1px dashed #ddd;
                            padding-top: 10px;
                            margin-top: 10px;
                        }
                        
                        .total-row {
                            font-weight: bold;
                        }
                        
                        .footer {
                            text-align: center;
                            margin-top: 15px;
                            font-size: 10px;
                            color: #666;
                        }
                        
                        @media print {
                            body {
                                padding: 0;
                            }
                            
                            .receipt {
                                border: none;
                            }
                            
                            .print-button {
                                display: none;
                            }
                        }
                        
                        /* Styles... */
                        .receipt-numbers {
                            margin: 15px 0;
                            border: 1px solid #eee;
                            border-radius: 4px;
                            padding: 5px;
                            background-color: #f9f9f9;
                        }
                        
                        .receipt-number {
                            padding: 4px 0;
                            border-bottom: 1px dashed #ddd;
                        }
                        
                        .receipt-number:last-child {
                            border-bottom: none;
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt">
                        <div class="header">
                            <div class="store-name">${settings.storeName}</div>
                            <div>${settings.storeAddress}</div>
                            <div>${settings.storePhone}</div>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">${record.type.toUpperCase()} RECEIPT</span>
                            <span>${formattedDate}</span>
                        </div>
                        
                        <div class="receipt-numbers">
                            <div class="receipt-number">
                                <span class="info-label">Original Bill #:</span>
                                <span>${record.originalBillId || 'N/A'}</span>
                            </div>
                            <div class="receipt-number">
                                <span class="info-label">${record.type.charAt(0).toUpperCase() + record.type.slice(1)} Receipt #:</span>
                                <span>${record.id}</span>
                            </div>
                        </div>
                        
                        <div class="info-row">
                            <span class="info-label">Reason:</span>
                            <span>${record.reason || 'N/A'}</span>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${record.items.map(item => `
                                    <tr>
                                        <td>${item.name || 'Unknown'}</td>
                                        <td>${item.quantity || 1}</td>
                                        <td>₹${(item.price || 0).toFixed(2)}</td>
                                        <td>₹${(item.total || 0).toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="total-section">
                            <div class="info-row total-row">
                                <span>Refund Amount:</span>
                                <span>₹${record.refundAmount.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        ${record.type === 'exchange' && record.exchangeItems && record.exchangeItems.length > 0 ? `
                            <h3>Exchange Items</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${record.exchangeItems.map(item => `
                                        <tr>
                                            <td>${item.name || 'Unknown'}</td>
                                            <td>${item.quantity || 1}</td>
                                            <td>₹${(item.price || 0).toFixed(2)}</td>
                                            <td>₹${(item.total || 0).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                            
                            <div class="total-section">
                                <div class="info-row">
                                    <span>Exchange Total:</span>
                                    <span>₹${(record.exchangeValue || 0).toFixed(2)}</span>
                                </div>
                                <div class="info-row total-row">
                                    <span>Final Balance:</span>
                                    <span>${record.finalBalance >= 0 ? 
                                        `Customer received ₹${record.finalBalance.toFixed(2)}` : 
                                        `Customer paid ₹${Math.abs(record.finalBalance).toFixed(2)}`}</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="footer">
                            Thank you for your business!
                        </div>
                    </div>
                    
                    <div class="print-button" style="text-align: center; margin-top: 20px;">
                        <button onclick="window.print()">Print Receipt</button>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            
            // Trigger print after content is loaded
            printWindow.onload = function() {
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            };
        } catch (error) {
            console.error('Error printing record:', error);
            alert('An error occurred while printing. Please try again.');
        }
    }

    /**
     * Display bill items for selection
     * @param {Object} bill - The bill to display items for
     */
    displayBillItems(bill) {
        console.log('Displaying bill items for selection');
        
        const itemsList = document.getElementById('refundItemsList');
        itemsList.innerHTML = '';
        
        if (!bill || !bill.items || bill.items.length === 0) {
            itemsList.innerHTML = '<div class="text-center py-4 text-gray-500">No items found in the bill</div>';
            return;
        }
        
        // Rate notice removed as per user request
        // const notice = document.createElement('div');
        // notice.className = 'bg-blue-50 text-blue-700 p-3 rounded-md mb-4 text-sm';
        // notice.innerHTML = '<i class="fas fa-info-circle mr-1"></i> Refunds are calculated based on the selling price (Rate), not MRP.';
        // itemsList.appendChild(notice);
        
        bill.items.forEach((item, index) => {
            // IMPORTANT: Use rate instead of MRP for price calculations
            const price = parseFloat(item.rate || item.price || 0);
            const quantity = parseInt(item.quantity || 1);
            const total = price * quantity;
            
            const row = document.createElement('div');
            row.className = 'item-row border-b border-gray-200 py-3';
            row.innerHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0 mr-3">
                        <input type="checkbox" id="item-${index}" class="item-checkbox" 
                               data-index="${index}" data-price="${price}" data-quantity="${quantity}">
                    </div>
                    <div class="flex-grow">
                        <div class="flex flex-wrap gap-2 justify-between">
                            <div class="font-medium">${item.name || 'Unknown Item'}</div>
                            <div class="text-gray-700">₹${price.toFixed(2)} × ${quantity}</div>
                        </div>
                        
                        <div class="mt-1 flex flex-wrap gap-2 items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <label for="refund-qty-${index}" class="text-sm text-gray-600">Qty to refund:</label>
                                <input type="number" id="refund-qty-${index}" class="refund-qty border rounded py-1 px-2 w-16 text-center"
                                       min="1" max="${quantity}" value="${quantity}" data-index="${index}">
                            </div>
                            <div class="text-green-600 font-medium">₹${total.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            `;
            
            itemsList.appendChild(row);
            
            // Add event listener to checkbox
            const checkbox = row.querySelector(`#item-${index}`);
            checkbox.addEventListener('change', () => this.updateSelectedItems());
            
            // Add event listener to quantity input
            const qtyInput = row.querySelector(`#refund-qty-${index}`);
            qtyInput.addEventListener('change', () => this.updateSelectedItems());
        });
    }

    /**
     * Generate product rows for exchange
     */
    generateProductRows(products) {
        if (!products || products.length === 0) {
            return '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No products available</td></tr>';
        }
        
        return products.map((product, index) => {
            // Use rate for exchange price calculations
            const price = parseFloat(product.rate || product.price || 0);
            const stock = parseInt(product.stock || 0);
            
            return `
                <tr class="hover:bg-gray-50">
                    <td class="px-3 py-2">
                        <div class="font-medium">${product.name || 'Unknown Product'}</div>
                        <div class="text-xs text-gray-500">${product.code || ''}</div>
                    </td>
                    <td class="px-3 py-2 text-center">₹${price.toFixed(2)}</td>
                    <td class="px-3 py-2 text-center">${stock}</td>
                    <td class="px-3 py-2 text-center">
                        <input type="number" min="0" max="${stock}" value="0" 
                            class="exchange-qty border rounded py-1 px-2 w-16 text-center"
                            data-index="${index}" data-price="${price}">
                    </td>
                    <td class="px-3 py-2 text-center">
                        <button class="add-exchange-item px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                            data-index="${index}" data-price="${price}">
                            <i class="fas fa-plus"></i> Add
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Add this helper method to the RefundManager class
    // This will handle both the old format (array of indices) and new format (array of objects)
    ensureSelectedItemsFormat() {
        console.log('Ensuring selected items are in correct format...');
        console.log('Current selected items:', JSON.stringify(this.selectedItems));
        
        // If we already have objects with 'total' property, we're good
        if (this.selectedItems.length > 0 && 
            typeof this.selectedItems[0] === 'object' && 
            'total' in this.selectedItems[0]) {
            console.log('Selected items are already in object format');
            return this.selectedItems;
        }
        
        // Otherwise, we need to convert from indices to objects
        console.log('Converting indices to item objects...');
        
        // Quick check to make sure we have a valid bill first
        if (!this.currentBill || !this.currentBill.items) {
            console.error('Cannot convert: No current bill or items found');
            return [];
        }
        
        // Convert indices to objects
        const convertedItems = [];
        this.selectedItems.forEach(index => {
            // Make sure index is valid
            if (typeof index !== 'number' || index < 0 || index >= this.currentBill.items.length) {
                console.warn(`Invalid item index: ${index}`);
                return;
            }
            
            const originalItem = this.currentBill.items[index];
            if (!originalItem) {
                console.warn(`Item at index ${index} not found in current bill`);
                return;
            }
            
            // Determine price (prefer rate over price over mrp)
            let itemPrice = 0;
            if (originalItem.rate && !isNaN(parseFloat(originalItem.rate))) {
                itemPrice = parseFloat(originalItem.rate);
                console.log(`Using rate (${itemPrice}) for item ${originalItem.name || index}`);
            } else if (originalItem.price && !isNaN(parseFloat(originalItem.price))) {
                itemPrice = parseFloat(originalItem.price);
                console.log(`Using price (${itemPrice}) for item ${originalItem.name || index}`);
            } else if (originalItem.mrp && !isNaN(parseFloat(originalItem.mrp))) {
                itemPrice = parseFloat(originalItem.mrp);
                console.log(`Using MRP (${itemPrice}) for item ${originalItem.name || index}`);
            }
            
            // Get quantity
            const qtySelect = document.querySelector(`.refund-qty[data-index="${index}"]`);
            const quantity = qtySelect ? parseInt(qtySelect.value) : 1;
            const validQty = isNaN(quantity) ? 1 : quantity;
            
            // Calculate total
            const total = itemPrice * validQty;
            
            // Add to converted items
            convertedItems.push({
                index: index,
                name: originalItem.name || `Item ${index}`,
                code: originalItem.code || '',
                price: itemPrice,
                quantity: validQty,
                maxQuantity: parseInt(originalItem.quantity || 1),
                total: total,
                rate: originalItem.rate || originalItem.price
            });
        });
        
        console.log('Converted selected items:', convertedItems);
        return convertedItems;
    }
}

// Initialize refund manager and attach to window
console.log('Creating global refundManager instance...');
window.refundManager = new RefundManager();

/**
 * Override key method implementations to enforce rate-based pricing
 */

// 1. Ensure rate is used when loading bills
const originalSelectBill = RefundManager.prototype.selectBill;
RefundManager.prototype.selectBill = function(bill) {
    console.log('RATE FIX: Ensuring rate values in selected bill');
    
    // Transform bill to use rate values explicitly
    if (bill && bill.items) {
        bill.items.forEach(item => {
            // Store the original MRP for reference if needed
            item._originalMrp = item.mrp;
            
            // If rate exists, make sure it becomes the primary price
            if (item.rate) {
                console.log(`Item ${item.name}: Using rate ${item.rate} instead of price ${item.price} or MRP ${item.mrp}`);
                item.price = parseFloat(item.rate);
            }
        });
    }
    
    return originalSelectBill.call(this, bill);
};

// 2. Override the process refund function to ensure it uses rate values
const originalProcessRefund = RefundManager.prototype.processRefund;
RefundManager.prototype.processRefund = function() {
    console.log('RATE FIX: Ensuring rate values in refund processing');
    
    // Verify selected items have correct rate-based pricing
    if (this.selectedItems && this.selectedItems.length > 0) {
        this.selectedItems.forEach(item => {
            // If the original bill has rate, make sure we're using it
            const originalItem = this.currentBill?.items?.[item.index];
            if (originalItem && originalItem.rate) {
                const ratePrice = parseFloat(originalItem.rate);
                if (item.price !== ratePrice) {
                    console.log(`Fixing item ${item.name}: Setting price from ${item.price} to rate ${ratePrice}`);
                    item.price = ratePrice;
                    item.total = item.price * item.quantity;
                }
            }
        });
        
        // Recalculate total refund amount
        let totalRefundAmount = 0;
        this.selectedItems.forEach(item => {
            totalRefundAmount += item.total;
        });
        
        // Update UI
        document.getElementById('refundAmount').value = totalRefundAmount.toFixed(2);
    }
    
    return originalProcessRefund.call(this);
};

// 3. Add code to highlight rate usage clearly in the UI
document.addEventListener('DOMContentLoaded', function() {
    // Add a price display fixer that runs periodically
    setInterval(function() {
        if (window.refundManager && window.refundManager.currentBill) {
            // Update the refund amount label
            const refundAmountLabel = document.querySelector('label[for="refundAmount"]');
            if (refundAmountLabel) {
                if (!refundAmountLabel.innerHTML.includes('(RATE)')) {
                    refundAmountLabel.innerHTML = 'Refund Amount <strong style="color:green">(RATE)</strong>:';
                }
            }
            
            // Make the price display more prominent
            const refundAmountInput = document.getElementById('refundAmount');
            if (refundAmountInput) {
                refundAmountInput.style.color = 'green';
                refundAmountInput.style.fontWeight = 'bold';
            }
        }
    }, 500);
});

// 4. Fix for exchange items as well
const originalCollectSelectedExchangeItems = RefundManager.prototype.collectSelectedExchangeItems;
RefundManager.prototype.collectSelectedExchangeItems = function() {
    console.log('RATE FIX: Ensuring rate values in exchange items');
    
    const selectedProducts = originalCollectSelectedExchangeItems.call(this);
    
    // Fix prices in the returned products
    if (selectedProducts && selectedProducts.length) {
        selectedProducts.forEach(product => {
            if (product.rate) {
                product.price = parseFloat(product.rate);
                product.total = product.price * product.quantity;
            }
        });
    }
    
    return selectedProducts;
};

// Rate notice has been removed as per user request
// const rateNotice = document.createElement('div');
// rateNotice.style.position = 'fixed';
// rateNotice.style.bottom = '10px';
// rateNotice.style.right = '10px';
// rateNotice.style.backgroundColor = 'green';
// rateNotice.style.color = 'white';
// rateNotice.style.padding = '8px 12px';
// rateNotice.style.borderRadius = '4px';
// rateNotice.style.zIndex = '10000';
// rateNotice.style.fontSize = '14px';
// rateNotice.textContent = 'Using RATE for refund calculations';
// document.body.appendChild(rateNotice);

console.log('RATE FIX: Applied targeted fixes to enforce rate-based pricing without notification');