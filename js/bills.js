class BillManager {
    constructor() {
        console.log('Initializing BillManager...');
        // Clear any existing initialization
        this.bills = [];
        
        // Direct load from localStorage on startup
        this._loadBillsFromStorage();
        this.setupEventListeners();
        
        // Ensure past bills table is properly initialized
        setTimeout(() => {
            // Verify loaded bills
            console.log(`BillManager initialized with ${this.bills.length} bills`);
            this.updatePastBillsDisplay();
        }, 500);
    }

    // Private method to load bills directly from localStorage
    _loadBillsFromStorage() {
        try {
            const storedBills = localStorage.getItem('bills');
            console.log('Raw bills from localStorage:', storedBills);
            
            this.bills = storedBills ? JSON.parse(storedBills) : [];
            
            // Validate and fix any corrupted bills
            this.bills = this.bills.filter(bill => {
                if (!bill || typeof bill !== 'object') return false;
                if (!bill.id) bill.id = Date.now() + Math.random().toString(36).substring(2, 9);
                if (!bill.items || !Array.isArray(bill.items)) bill.items = [];
                if (isNaN(bill.total)) bill.total = 0;
                return true;
            });
            
        } catch (error) {
            console.error('Error loading bills from localStorage:', error);
            this.bills = [];
        }
    }

    // Save bills directly to localStorage
    _saveBillsToStorage() {
        try {
            localStorage.setItem('bills', JSON.stringify(this.bills));
            console.log(`Saved ${this.bills.length} bills to localStorage`);
            return true;
        } catch (error) {
            console.error('Error saving bills to localStorage:', error);
            return false;
        }
    }

    // Update existing method to use direct storage methods
    loadBills() {
        this._loadBillsFromStorage();
        this.updatePastBillsDisplay();
        console.log(`Reloaded ${this.bills.length} bills from storage`);
    }

    // Update existing method to use direct storage methods
    saveBills() {
        if (this._saveBillsToStorage()) {
            console.log('Bills saved successfully');
            // Update reports if available
            if (window.reportManager && typeof window.reportManager.updateReports === 'function') {
                window.reportManager.updateReports();
            }
        } else {
            console.error('Failed to save bills');
            alert('Warning: Failed to save bill data. Storage may be full or unavailable.');
        }
    }

    addBill(bill) {
        console.log('Adding new bill:', bill);
        
        // Generate unique ID if not provided
        if (!bill.id) {
            bill.id = Date.now().toString();
        }
        
        // Ensure timestamp exists
        if (!bill.timestamp) {
            bill.timestamp = new Date().toISOString();
        }
        
        // Add bill to array
        this.bills.push(bill);
        
        // Save to storage
        this.saveBills();
        
        console.log(`Bill added. Total bills: ${this.bills.length}`);
        return bill.id;
    }

    setupEventListeners() {
        // Past Bills button
        const pastBillsBtn = Array.from(document.querySelectorAll('button')).find(
            button => button.querySelector('div')?.textContent.trim() === 'Past Bills'
        );
        pastBillsBtn?.addEventListener('click', () => this.showPastBills());

        // Add diagnostic button functionality
        document.addEventListener('click', e => {
            if (e.target.id === 'runStorageDiagnostic' || e.target.closest('#runStorageDiagnostic')) {
                const result = this.checkStorageSystem();
                console.log('Storage diagnostic result:', result);
                
                // Show result in UI
                alert(`Storage Diagnostic Results:\n
- Status: ${result.status || 'Unknown'}
- localStorage: ${result.localStorage ? 'Available' : 'Not available'}
- Est. Capacity: ${result.estimatedCapacity || 'Unknown'}
- Current Usage: ${result.currentUsage || 'Unknown'}
- Bill Count: ${result.billCount || 0}
- Test Save: ${result.testSaveSuccessful ? 'Success' : 'Failed'}`);
                
                // Reload bills after diagnostic
                this.loadBills();
            }
        });
    }

    showPastBills() {
        const modal = document.getElementById('pastBillsModal');
        modal.classList.remove('hidden');
        this.updatePastBillsDisplay();
    }

    updatePastBillsDisplay() {
        console.log('Updating past bills display...');
        
        // Check for the correct DOM element - in this case, pastBillsList
        const tbody = document.getElementById('pastBillsList');
        
        if (!tbody) {
            console.error('pastBillsList element not found in DOM');
            return;
        }
        
        // Clear the table body
        tbody.innerHTML = '';

        if (!this.bills || this.bills.length === 0) {
            console.log('No bills to display');
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-4 text-center text-gray-500">
                        No bills found. Create your first bill to see it here.
                    </td>
                </tr>
            `;
            return;
        }
        
        console.log(`Found ${this.bills.length} bills to display:`, this.bills);
        
        // Sort bills by timestamp (newest first)
        const sortedBills = [...this.bills].sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
            const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
            return dateB - dateA;
        });
        
        // Build the table HTML
        sortedBills.forEach((bill, index) => {
            try {
                // Format date safely
                const dateText = bill.timestamp 
                    ? new Date(bill.timestamp).toLocaleString() 
                    : 'Unknown date';
                
                // Ensure consistent bill number format
                const billNumber = bill.billNumber || bill.id || `BILL-${index+1}`;
                
                // Ensure amount is properly calculated and formatted
                const total = typeof bill.total === 'number' 
                    ? bill.total 
                    : (parseFloat(bill.total) || 0);
                const totalText = '₹' + total.toFixed(2);
                
                // Format payment mode safely
                const paymentMode = bill.paymentMode || 'Cash';
                
                // Create row
                const row = document.createElement('tr');
                row.className = 'border-b hover:bg-gray-50';
                row.innerHTML = `
                    <td class="p-2">${billNumber}</td>
                    <td class="p-2">${dateText}</td>
                    <td class="p-2 text-right">${totalText}</td>
                    <td class="p-2 text-center">${paymentMode}</td>
                    <td class="p-2 text-center">
                        <button class="view-bill-btn text-blue-500 hover:text-blue-700 mr-2" data-bill-id="${bill.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="print-bill-btn text-green-500 hover:text-green-700" data-bill-id="${bill.id}">
                            <i class="fas fa-print"></i>
                        </button>
                    </td>
                `;
                
                tbody.appendChild(row);
            } catch (err) {
                console.error(`Error rendering bill ${index}:`, err);
            }
        });
        
        // Add event listeners to the new buttons
        document.querySelectorAll('.view-bill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                try {
                    const billId = e.currentTarget.getAttribute('data-bill-id');
                    console.log(`View button clicked for bill: ${billId}`);
                    this.showBillDetails(billId);
                } catch (err) {
                    console.error('Error handling view bill click:', err);
                    alert('Error displaying bill details. Please try again.');
                }
            });
        });
        
        document.querySelectorAll('.print-bill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                try {
                    const billId = e.currentTarget.getAttribute('data-bill-id');
                    this.printBill(billId);
                } catch (err) {
                    console.error('Error handling print bill click:', err);
                    alert('Error printing bill. Please try again.');
                }
            });
        });
    }

    showBillDetails(billId) {
        console.log('Showing details for bill with ID:', billId);
        
        try {
            // Convert billId to string for consistent comparison
            const billIdStr = String(billId);
            
            // Find the bill in the bills array
            let bill = this.bills.find(b => String(b.id) === billIdStr);
            
            if (!bill) {
                console.error('Bill not found with ID:', billId);
                alert('Sorry, could not find this bill. Please try again.');
                return;
            }
            
            console.log('Found bill data:', bill);
            
            // Create a new modal element each time (don't reuse)
            let oldModal = document.getElementById('billDetailsModal');
            if (oldModal) {
                document.body.removeChild(oldModal);
            }
            
            const detailsModal = document.createElement('div');
            detailsModal.id = 'billDetailsModal';
            detailsModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 z-50 overflow-y-auto';
            document.body.appendChild(detailsModal);
            
            // Format the date
            const billDate = bill.timestamp ? new Date(bill.timestamp) : 
                            bill.date ? new Date(bill.date) : 
                            new Date();
            const formattedDate = billDate.toLocaleDateString() + ' ' + billDate.toLocaleTimeString();
            
            // Ensure bill items exists and log them
            const items = Array.isArray(bill.items) ? bill.items : [];
            console.log(`Bill has ${items.length} items:`, items);
            
            // Ensure bill number is displayed correctly
            const billNumber = bill.billNumber || bill.id;
            
            // Ensure total is calculated correctly
            const total = typeof bill.total === 'number' 
                ? bill.total 
                : (parseFloat(bill.total) || 0);
            
            // Create detailed bill content with clearer structure
            detailsModal.innerHTML = `
                <div class="min-h-screen px-4 py-6 flex items-center justify-center">
                    <div class="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-2xl font-bold">Bill Details</h2>
                            <button class="bill-details-close text-gray-600 hover:text-gray-800">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <p><strong>Bill ID:</strong> ${bill.id}</p>
                                <p><strong>Bill Number:</strong> ${billNumber}</p>
                                <p><strong>Date:</strong> ${formattedDate}</p>
                            </div>
                            <div class="text-right">
                                <p><strong>Total Amount:</strong> ₹${total.toFixed(2)}</p>
                                <p><strong>Payment Mode:</strong> ${bill.paymentMode || 'Cash'}</p>
                                <p><strong>Items Count:</strong> ${items.length}</p>
                            </div>
                        </div>
                        
                        <div class="overflow-x-auto border rounded my-4">
                            <table class="w-full table-auto">
                                <thead class="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th class="p-2 text-left">#</th>
                                        <th class="p-2 text-left">Item</th>
                                        <th class="p-2 text-right">Price</th>
                                        <th class="p-2 text-right">Qty</th>
                                        <th class="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody id="billDetailsItems">
                                    ${items.length > 0 ? items.map((item, index) => {
                                        // Calculate item values safely
                                        const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
                                        const quantity = typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 0);
                                        const itemTotal = price * quantity;
                                        
                                        return `
                                            <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">
                                                <td class="p-2 text-left">${index + 1}</td>
                                                <td class="p-2 text-left">${item.name || 'Unknown Item'}</td>
                                                <td class="p-2 text-right">₹${price.toFixed(2)}</td>
                                                <td class="p-2 text-right">${quantity} ${item.isWeighted ? 'kg' : ''}</td>
                                                <td class="p-2 text-right">₹${itemTotal.toFixed(2)}</td>
                                            </tr>
                                        `;
                                    }).join('') : `
                                        <tr>
                                            <td colspan="5" class="p-4 text-center text-gray-500">No items found in this bill</td>
                                        </tr>
                                    `}
                                </tbody>
                                <tfoot class="bg-gray-100">
                                    <tr>
                                        <td colspan="4" class="p-2 text-right font-bold">Total:</td>
                                        <td class="p-2 text-right font-bold">₹${total.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        
                        <div class="flex justify-end mt-4">
                            <button class="print-bill-details px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" data-bill-id="${bill.id}">
                                <i class="fas fa-print mr-2"></i>Print
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Show the modal
            detailsModal.classList.remove('hidden');
            
            // After adding to DOM, verify items are displayed
            setTimeout(() => {
                const itemRows = document.querySelectorAll('#billDetailsItems tr');
                console.log(`Displayed ${itemRows.length} item rows out of ${items.length} items`);
            }, 100);
            
            // Add event listeners
            detailsModal.querySelector('.bill-details-close').addEventListener('click', () => {
                detailsModal.classList.add('hidden');
                document.body.removeChild(detailsModal);
            });
            
            const printButton = detailsModal.querySelector('.print-bill-details');
            if (printButton) {
                printButton.addEventListener('click', () => {
                    try {
                        this.fastPrintBill(bill.id);
                    } catch (err) {
                        console.error('Error printing bill:', err);
                        alert('Error printing bill. Please try again.');
                    }
                });
            }
        } catch (error) {
            console.error('Error showing bill details:', error);
            alert('Error displaying bill details. Please try again.');
        }
    }

    getTodaySales() {
        const today = new Date().toDateString();
        return this.bills
            .filter(bill => new Date(bill.timestamp).toDateString() === today)
            .reduce((total, bill) => total + bill.total, 0);
    }

    getReportData() {
        const today = new Date().toLocaleDateString();
        const todayBills = this.bills.filter(bill => {
            const billDate = new Date(bill.timestamp).toLocaleDateString();
            return billDate === today;
        });

        // Calculate items sold with better tracking
        const itemsSold = {};
        todayBills.forEach(bill => {
            bill.items.forEach(item => {
                const itemId = item.id.toString();
                if (!itemsSold[itemId]) {
                    itemsSold[itemId] = {
                        quantity: 0,
                        total: 0,
                        name: item.name
                    };
                }
                itemsSold[itemId].quantity += item.quantity;
                itemsSold[itemId].total += item.total;
            });
        });

        const totalItems = Object.values(itemsSold).reduce((sum, item) => sum + item.quantity, 0);
        const totalSales = todayBills.reduce((sum, bill) => sum + bill.total, 0);

        return {
            todaySales: totalSales,
            totalBills: todayBills.length,
            totalItems: totalItems,
            averageBillValue: todayBills.length ? totalSales / todayBills.length : 0,
            itemsSold: itemsSold
        };
    }

    getSalesDataForPeriod(startDate, endDate) {
        const bills = this.bills;
        let salesData = {
            totalSales: 0,
            totalBills: 0,
            totalItems: 0,
            avgItemsPerBill: 0,
            highestDay: {
                date: null,
                sales: 0
            },
            timeDistribution: {
                morning: 0,    // 6AM-12PM
                afternoon: 0,  // 12PM-5PM
                evening: 0,    // 5PM-9PM
                night: 0       // 9PM-6AM
            },
            dates: [],
            dailySales: [],
            details: []
        };

        // Create a map to store daily totals
        let dailyTotals = new Map();
        let dailyItemCounts = new Map();

        // Process each bill
        bills.forEach(bill => {
            const billDate = new Date(bill.timestamp);
            
            // Check if bill is within date range
            if (billDate >= startDate && billDate <= endDate) {
                // Increment total counters
                salesData.totalSales += bill.total;
                salesData.totalBills++;
                
                // Count items in the bill
                const itemCount = bill.items.reduce((sum, item) => sum + item.quantity, 0);
                salesData.totalItems += itemCount;

                // Track time distribution
                const hour = billDate.getHours();
                if (hour >= 6 && hour < 12) {
                    salesData.timeDistribution.morning += bill.total;
                } else if (hour >= 12 && hour < 17) {
                    salesData.timeDistribution.afternoon += bill.total;
                } else if (hour >= 17 && hour < 21) {
                    salesData.timeDistribution.evening += bill.total;
                } else {
                    salesData.timeDistribution.night += bill.total;
                }

                // Format date for grouping
                const dateStr = billDate.toISOString().split('T')[0];

                // Update or create daily total
                if (!dailyTotals.has(dateStr)) {
                    dailyTotals.set(dateStr, {
                        sales: 0,
                        bills: 0,
                        items: 0
                    });
                }
                
                const dayData = dailyTotals.get(dateStr);
                dayData.sales += bill.total;
                dayData.bills++;
                dayData.items += itemCount;
                
                // Track highest selling day
                if (dayData.sales > salesData.highestDay.sales) {
                    salesData.highestDay = {
                        date: new Date(dateStr).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        }),
                        sales: dayData.sales
                    };
                }
            }
        });

        // Calculate average items per bill
        salesData.avgItemsPerBill = salesData.totalBills > 0 
            ? (salesData.totalItems / salesData.totalBills).toFixed(1) 
            : 0;

        // Convert daily totals to arrays for the response
        const sortedDates = Array.from(dailyTotals.keys()).sort();
        
        // Format dates for display
        salesData.dates = sortedDates.map(date => {
            return new Date(date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
            });
        });
        
        salesData.dailySales = sortedDates.map(date => dailyTotals.get(date).sales);
        
        // Create detailed daily records
        salesData.details = sortedDates.map(date => {
            const dayData = dailyTotals.get(date);
            const avgBill = dayData.bills > 0 ? dayData.sales / dayData.bills : 0;
            const avgItems = dayData.bills > 0 ? dayData.items / dayData.bills : 0;
            
            return {
                date: new Date(date).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                }),
                sales: dayData.sales,
                bills: dayData.bills,
                items: dayData.items,
                avgBill: avgBill,
                avgItems: avgItems.toFixed(1)
            };
        });

        return salesData;
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    getBills() {
        return JSON.parse(localStorage.getItem('bills') || '[]');
    }

    printBill(billId) {
        console.log('Printing bill with ID:', billId);
        
        try {
            // Find the bill by ID
            const bill = this.bills.find(b => b.id === billId);
            
            if (!bill) {
                console.error('Bill not found:', billId);
                alert('Bill not found.');
                return;
            }
            
            // Get settings
            const settings = window.settingsManager ? window.settingsManager.settings : {};
            
            // Get the bill HTML based on the receipt format setting
            let billHtml;
            const receiptFormat = settings.receiptFormat || 'standard';
            
            switch (receiptFormat) {
                case 'gst':
                    billHtml = this._getDMartReceiptHtml(bill, settings);
                    break;
                case 'detailed':
                    billHtml = this._getDetailedReceiptHtml(bill, settings);
                    break;
                default:
                    billHtml = this._getStandardReceiptHtml(bill, settings);
            }
            
            // Create a modal to show the bill in the current page
            this._showBillInModal(billHtml);
            
            return true;
        } catch (error) {
            console.error('Error printing bill:', error);
            alert('Error printing bill. Please try again.');
            return false;
        }
    }

    // Helper method to show bill in modal instead of new tab
    _showBillInModal(billHtml) {
        // Create a modal container if it doesn't exist
        let billModal = document.getElementById('billPreviewModal');
        
        if (!billModal) {
            billModal = document.createElement('div');
            billModal.id = 'billPreviewModal';
            billModal.className = 'fixed inset-0 bg-gray-600 bg-opacity-75 z-50 flex items-center justify-center';
            document.body.appendChild(billModal);
        }
        
        // Set the modal content
        billModal.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg max-w-4xl mx-auto p-4 flex flex-col h-5/6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-xl font-bold">Bill Preview</h2>
                    <div>
                        <button id="printCurrentBill" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">
                            <i class="fas fa-print mr-2"></i>Print
                        </button>
                        <button id="closeBillPreview" class="text-gray-600 hover:text-gray-800">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                <div class="flex-grow overflow-auto">
                    <iframe id="billPreviewFrame" style="width:100%; height:100%; border:none;"></iframe>
                </div>
            </div>
        `;
        
        // Show the modal
        billModal.style.display = 'flex';
        
        // Add event listeners
        document.getElementById('closeBillPreview').addEventListener('click', () => {
            billModal.style.display = 'none';
        });
        
        document.getElementById('printCurrentBill').addEventListener('click', () => {
            const frame = document.getElementById('billPreviewFrame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.print();
            }
        });
        
        // Load the bill HTML into the iframe
        const frame = document.getElementById('billPreviewFrame');
        if (frame) {
            const frameDoc = frame.contentDocument || frame.contentWindow.document;
            frameDoc.open();
            frameDoc.write(billHtml);
            frameDoc.close();
            
            // Remove automatic print script if it exists
            frame.onload = () => {
                try {
                    const scripts = frameDoc.querySelectorAll('script');
                    scripts.forEach(script => {
                        if (script.textContent.includes('window.print()')) {
                            script.remove();
                        }
                    });
                } catch (e) {
                    console.error('Error removing auto-print script:', e);
                }
            };
        }
    }

    // Add a simple fallback print method
    simplePrintBill(bill) {
        try {
            // Create a printable representation of the bill
            const printWindow = window.open('', 'PRINT', 'height=600,width=800');
            
            if (!printWindow) {
                alert('Please allow pop-ups to print bills');
                return;
            }
            
            const formattedDate = bill.timestamp 
                ? new Date(bill.timestamp).toLocaleString() 
                : 'Unknown date';
                
            // Create the HTML content for printing
            printWindow.document.write(`
                <html>
                <head>
                    <title>Bill #${bill.billNumber || bill.id}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                        h1 { text-align: center; font-size: 24px; margin-bottom: 10px; }
                        .info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background-color: #f2f2f2; }
                        .amount { text-align: right; }
                        .total { font-weight: bold; border-top: 2px solid #000; }
                        .footer { margin-top: 30px; text-align: center; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>Invoice</h1>
                    <div class="info">
                        <div>
                            <p><strong>Bill Number:</strong> ${bill.billNumber || bill.id}</p>
                            <p><strong>Date:</strong> ${formattedDate}</p>
                        </div>
                        <div>
                            <p><strong>Payment Method:</strong> ${bill.paymentMode || 'Cash'}</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item</th>
                                <th class="amount">Price</th>
                                <th class="amount">Qty</th>
                                <th class="amount">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${bill.items.map((item, index) => {
                                const price = typeof item.price === 'number' ? item.price : (parseFloat(item.price) || 0);
                                const quantity = typeof item.quantity === 'number' ? item.quantity : (parseFloat(item.quantity) || 0);
                                const itemTotal = price * quantity;
                                
                                return `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${item.name || 'Unknown Item'}</td>
                                        <td class="amount">₹${price.toFixed(2)}</td>
                                        <td class="amount">${quantity} ${item.isWeighted ? 'kg' : ''}</td>
                                        <td class="amount">₹${itemTotal.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="total">
                                <td colspan="4" class="amount">Total:</td>
                                <td class="amount">₹${bill.total.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                    </div>
                </body>
                </html>
            `);
            
            printWindow.document.close();
            printWindow.focus();
            
            // Use setTimeout to ensure the content is loaded before printing
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
            
        } catch (error) {
            console.error('Error in simple print bill:', error);
            alert('Error printing bill. Please try again.');
        }
    }

    // Add this diagnostic function to BillManager
    checkStorageSystem() {
        console.log('Running storage diagnostic...');
        
        // Check if localStorage is available
        if (!window.localStorage) {
            console.error('localStorage is not available in this browser');
            return 'localStorage not available';
        }
        
        try {
            // Test storage capacity
            const testKey = '_storage_test';
            let testData = '';
            let testSize = 0;
            
            try {
                // Try to store increasingly large data until it fails
                for (let i = 0; i < 10; i++) {
                    testData += new Array(1024 * 1024).join('a'); // Add ~1MB
                    localStorage.setItem(testKey, testData);
                    testSize = testData.length / (1024 * 1024);
                    console.log(`Storage test: ${testSize.toFixed(2)}MB successful`);
                }
            } catch (e) {
                console.log(`Storage limit reached at ~${testSize.toFixed(2)}MB`);
            } finally {
                localStorage.removeItem(testKey);
            }
            
            // Check existing bills
            const existingBills = this.bills;
            const billCount = existingBills.length;
            const billsSize = JSON.stringify(existingBills).length / 1024;
            
            console.log(`Current bills: ${billCount} bills, using ~${billsSize.toFixed(2)}KB`);
            
            // Test saving and loading a sample bill
            const testBill = {
                id: 'test-' + Date.now(),
                billNumber: 'TEST-123',
                timestamp: new Date().toISOString(),
                items: [
                    {name: 'Test Item', price: 100, quantity: 1}
                ],
                total: 100,
                paymentMode: 'Cash'
            };
            
            // Save the test bill
            this.bills.push(testBill);
            const saveResult = this._saveBillsToStorage();
            
            // Remove test bill and restore original
            this.bills = existingBills;
            this._saveBillsToStorage();
            
            return {
                status: 'diagnostic complete',
                localStorage: true,
                estimatedCapacity: `~${testSize.toFixed(2)}MB`,
                currentUsage: `${billsSize.toFixed(2)}KB`,
                billCount: billCount,
                testSaveSuccessful: saveResult
            };
        } catch (error) {
            console.error('Error during storage diagnostic:', error);
            return {
                status: 'diagnostic failed',
                error: error.message
            };
        }
    }

    // Completely rewrite the printing method to be super fast and reliable
    fastPrintBill(billId) {
        console.log('Fast printing bill with ID:', billId);
        
        try {
            // First check if we have a valid ID
            if (!billId) {
                console.error('Cannot print bill: No bill ID provided');
                alert('Error: Cannot print bill because no bill ID was provided');
                return false;
            }
            
            // Force reload bills from storage to ensure we have the latest data
            this._loadBillsFromStorage();
            
            // Find the bill by ID
            const bill = this.bills.find(b => b.id === billId);
            
            if (!bill) {
                console.error('Cannot print bill: Bill not found with ID', billId);
                alert('Error: Bill not found');
                return false;
            }

            // Create a fresh copy to avoid reference issues
            const billCopy = JSON.parse(JSON.stringify(bill));
            console.log('Printing fresh copy of bill:', billCopy.id);
            
            // Get receipt format from settings
            const settings = window.settingsManager?.settings || this._getDefaultSettings();
            const receiptFormat = settings.receiptFormat || 'standard';
            
            // Generate HTML based on format
            let receiptHtml = '';
            
            if (receiptFormat === 'gst') {
                receiptHtml = this._getDMartReceiptHtml(billCopy, settings);
            } else if (receiptFormat === 'detailed') {
                receiptHtml = this._getDetailedReceiptHtml(billCopy, settings);
            } else {
                receiptHtml = this._getStandardReceiptHtml(billCopy, settings);
            }
            
            // Use a unique name for the window to prevent reuse
            const windowName = `print_${billId}_${Date.now()}`;
            
            // Open the receipt in a new window with unique name
            const printWindow = window.open('', windowName, 'width=400,height=600');
            if (!printWindow) {
                alert('Please enable pop-ups to print receipts');
                return false;
            }
            
            // Clear any existing content
            printWindow.document.open();
            
            // Write the HTML to the window
            printWindow.document.write(receiptHtml);
            printWindow.document.close();
            
            // Store reference to the window
            this._lastPrintWindow = printWindow;
            
            console.log('Bill printed successfully');
            return true;
            
        } catch (error) {
            console.error('Error in fastPrintBill:', error);
            alert('Error printing bill. Please try again.');
            return false;
        }
    }

    // Add a helper method to properly retrieve bills by ID
    getBillById(billId) {
        // Ensure we reload the latest bills from storage
        this._loadBillsFromStorage();
        
        // Find the bill with the matching ID
        const bill = this.bills.find(b => b.id === billId);
        
        if (!bill) {
            console.error(`Bill with ID ${billId} not found`);
        } else {
            console.log(`Found bill with ID ${billId}:`, bill);
        }
        
        return bill;
    }

    // Complete rewrite of the _getDMartReceiptHtml method for perfect D-Mart receipt replica
    _getDMartReceiptHtml(bill, settings) {
        // Create a unique receipt id
        const uniqueId = `receipt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();
        
        // Copy bill to avoid modifying the original
        const freshBill = JSON.parse(JSON.stringify(bill));
        
        // Ensure settings object exists
        settings = settings || {};
        
        // Check both MRP and HSN column settings
        const rawMrpSetting = settings.showMrpColumn;
        const rawHsnSetting = settings.showHsnColumn;
        
        console.log('Raw MRP setting value:', rawMrpSetting, 'Type:', typeof rawMrpSetting);
        console.log('Raw HSN setting value:', rawHsnSetting, 'Type:', typeof rawHsnSetting);
        
        // Convert to boolean for consistent checks
        const showMrpColumn = Boolean(rawMrpSetting);
        const showHsnColumn = Boolean(rawHsnSetting);
        
        console.log('Final showMrpColumn value:', showMrpColumn);
        console.log('Final showHsnColumn value:', showHsnColumn);
        
        // Format date and time
        const date = new Date(freshBill.timestamp);
        const dateStr = date.toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit', year: 'numeric'});
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const dateTimeStr = `${dateStr}(${timeStr})`;
        
        // Use cashier name from the bill with fallback to settings
        const cashierPrefix = bill.cashierName || settings.cashierPrefix || 'MJA';
        const employeeId = settings.employeeId || '076175';
        const cashier = `${cashierPrefix}/${employeeId}`;
        
        // Generate voucher number (internal reference)
        const voucherPrefix = 'S';
        const voucherNumber = freshBill.voucherNumber || `${voucherPrefix}${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`;
        
        // Store details from settings - ensure we use the correct settings
        const storeName = settings.storeName || 'D-MART';
        const storeTagline = settings.storeTagline || 'AVENUE SUPERMARTS LTD';
        const storeCIN = settings.storeCIN || 'L51900MH2000PLC126473';
        const storeGSTIN = settings.storeGSTIN || '24AACCA8432H1ZW';
        const storeFSSAI = settings.storeFSSAI || '10715029000439';
        const branchName = settings.branchName || 'DMART MOTERA';
        
        // Use the store address from settings - FIX for issue #6
        const storeAddressRaw = settings.storeAddress || '';
        const storeAddressLines = storeAddressRaw.split('\n');
        const storeAddress1 = storeAddressLines[0] || 'City Gold Multiplex Compound,';
        const storeAddress2 = storeAddressLines[1] || 'Motera Stadium Road, Sabarmati, Motera';
        const storeCity = settings.storeCity || 'Ahmedabad - 380005';
        const storePhone = settings.storePhone || 'Phone: 079-30936500';
        
        // Style for the receipt
        const styles = `
            @page { size: 80mm auto; margin: 0; }
            body {
                font-family: 'Courier New', monospace;
                font-size: 10px;
                line-height: 1.2;
                margin: 0;
                padding: 8px;
                width: 80mm;
                letter-spacing: -0.3px; /* Reduce spacing between characters */
            }
            .header {
                text-align: center;
                margin-bottom: 5px;
            }
            h1 {
                font-size: 18px;
                font-weight: bold;
                text-align: center;
                margin: 5px 0;
            }
            .tagline {
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                margin: 3px 0;
            }
            .branch-name {
                font-size: 12px;
                font-weight: bold;
                text-align: center;
                margin: 3px 0;
            }
            .divider {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            .store-info {
                text-align: center;
                margin-bottom: 5px;
                font-size: 9px;
            }
            .legal-info {
                text-align: center;
                font-size: 9px;
                margin: 3px 0;
            }
            .bill-header {
                font-size: 9px;
                margin: 5px 0;
            }
            .invoice-title {
                text-align: center;
                font-weight: bold;
                font-size: 12px;
                margin: 5px 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 9px;
                table-layout: fixed;
            }
            th, td {
                padding: 2px 3px;
                /* Remove properties that cause truncation */
                white-space: normal; 
                overflow: visible;
                text-overflow: clip;
            }
            th {
                text-align: left;
                font-weight: bold;
                border-bottom: 1px solid #000;
                font-size: 9px;
            }
            .right {
                text-align: right;
            }
            .left {
                text-align: left;
            }
            .center {
                text-align: center;
            }
            .total {
                font-weight: bold;
                border-top: 1px solid #000;
            }
            .items-header {
                font-size: 9px;
                font-weight: bold;
            }
            .gst-group-header {
                font-weight: normal;
                font-size: 9px;
                letter-spacing: -0.4px; /* Compress the GST header text */
            }
            .gst-summary {
                margin-top: 5px;
                border-top: 1px dashed #000;
                padding-top: 5px;
                font-size: 9px;
            }
            .footer {
                margin-top: 10px;
                font-size: 9px;
                text-align: center;
            }
            .savings {
                text-align: center;
                font-weight: bold;
                margin: 5px 0;
            }
            .totals-summary {
                font-weight: bold;
                font-size: 12px;
                text-align: center;
                margin: 5px 0;
            }
            .hsn-column {
                width: 10%;
                text-align: left;
                padding-right: 3px;
            }
            .item-column {
                width: 45%;
                text-align: left;
                padding-right: 3px;
            }
            .qty-column {
                width: 10%;
                text-align: right;
                padding-right: 3px;
            }
            .mrp-column {
                width: 12%;
                text-align: right;
                padding-right: 3px;
            }
            .rate-column {
                width: 12%;
                text-align: right;
                padding-right: 3px;
            }
            .value-column {
                width: 12%;
                text-align: right;
            }
        `;
        
        // Initialize totals and groups
        let itemsHtml = '';
        let gstBreakdownHtml = '';
        let gstSummaryRows = '';
        let totalAmount = 0;
        let totalMrp = 0;
        let totalSavings = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let totalItems = 0;
        let totalQuantity = 0;
        
        // Group items by GST rate for display
        const gstGroups = {};
        let gstGroupCount = 0;
        
        // Process items into GST groups
        if (freshBill.items && Array.isArray(freshBill.items)) {
            freshBill.items.forEach(item => {
                const gstRate = parseFloat(item.gstRate || 0);
                const gstKey = gstRate.toFixed(1);
                
                if (!gstGroups[gstKey]) {
                    gstGroups[gstKey] = {
                        items: [],
                        taxableAmount: 0,
                        gstAmount: 0,
                        totalAmount: 0
                    };
                }
                
                // Add item to appropriate group
                gstGroups[gstKey].items.push(item);
                
                // Count items and quantities
                totalItems++;
                totalQuantity += item.isWeighted ? parseFloat(item.weight || 0) : parseInt(item.quantity || 1);
            });
        }
        
        // Process all GST groups
        Object.keys(gstGroups).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(gstRate => {
            const group = gstGroups[gstRate];
            gstGroupCount++;
            
            // When generating GST group headers, adjust colspan based on visible columns
            let totalColumns = 4; // Base columns: Item, Qty, Rate, Value
            if (showMrpColumn) totalColumns++;
            if (showHsnColumn) totalColumns++;
            
            // Add GST group header with proper colspan
            itemsHtml += `<tr>
                <td colspan="${totalColumns - 1}" class="gst-group-header">
                    ${gstGroupCount}) CGST@${(parseFloat(gstRate)/2).toFixed(1)}%,SGST@${(parseFloat(gstRate)/2).toFixed(1)}%
                </td>
            </tr>`;
            
            // Process items in this group
            group.items.forEach(item => {
                // Calculate values
                const price = parseFloat(item.price || 0);  // MRP
                const rate = parseFloat(item.rate || 0);    // Selling price
                const qty = item.isWeighted ? parseFloat(item.weight || 0) : parseInt(item.quantity || 0);
                const amount = parseFloat(item.total || 0);
                const unitLabel = item.isWeighted ? 'KG' : 'PC';
                const discount = price > rate ? price - rate : 0;
                const itemSavings = discount * qty;
                
                // Accumulate totals
                group.taxableAmount += (rate * qty) / (1 + parseFloat(gstRate) / 100);
                group.gstAmount += (rate * qty) - ((rate * qty) / (1 + parseFloat(gstRate) / 100));
                group.totalAmount += amount;
                
                totalAmount += amount;
                totalMrp += price * qty;
                totalSavings += itemSavings;
                
                // Format quantities with proper display
                const qtyDisplay = item.isWeighted 
                    ? (qty >= 1 ? qty.toFixed(3) : (qty * 1000).toFixed(1) + 'g') 
                    : qty.toString();
                
                // Generate random HSN code if not available
                const hsnCode = item.hsn || Math.floor(Math.random() * 9000 + 1000).toString();
                
                // When adding item rows, conditionally include HSN column
                itemsHtml += `<tr>
                    ${showHsnColumn ? `<td class="hsn-column">${hsnCode}</td>` : ''}
                    <td class="item-column">${item.name}</td>
                    <td class="qty-column right">${qtyDisplay}</td>
                    ${showMrpColumn ? `<td class="mrp-column right">${price.toFixed(2)}</td>` : ''}
                    <td class="rate-column right">${rate.toFixed(2)}</td>
                    <td class="value-column right">${amount.toFixed(2)}</td>
                </tr>`;
            });
            
            // Add to GST summary
            const cgst = group.gstAmount / 2;
            const sgst = group.gstAmount / 2;
            cgstTotal += cgst;
            sgstTotal += sgst;
            
            // Add row to GST breakdown table - without rupee symbol
            gstSummaryRows += `<tr>
                <td>${gstGroupCount}</td>
                <td class="right">${group.taxableAmount.toFixed(2)}</td>
                <td class="right">${cgst.toFixed(2)}</td>
                <td class="right">${sgst.toFixed(2)}</td>
                <td class="right">...</td>
                <td class="right">${group.totalAmount.toFixed(2)}</td>
            </tr>`;
        });
        
        // Add total row to GST breakdown - without rupee symbol
        gstSummaryRows += `<tr class="total">
            <td>T:</td>
            <td class="right">${(totalAmount - cgstTotal - sgstTotal).toFixed(2)}</td>
            <td class="right">${cgstTotal.toFixed(2)}</td>
            <td class="right">${sgstTotal.toFixed(2)}</td>
            <td class="right">...</td>
            <td class="right">${totalAmount.toFixed(2)}</td>
        </tr>`;
        
        // Create GST breakdown section if enabled
        if (settings.showGSTBreakdown !== false) {
            gstBreakdownHtml = `
            <div class="gst-summary">
                <div class="center" style="margin-bottom:5px;">
                    <---- GST Breakup Details ----> (Amount INR)
                </div>
                <table>
                    <tr>
                        <th>GST</th>
                        <th class="right">Taxable</th>
                        <th class="right">CGST</th>
                        <th class="right">SGST</th>
                        <th class="right">CESS</th>
                        <th class="right">Total</th>
                    </tr>
                    ${gstSummaryRows}
                </table>
                <div class="divider"></div>
                <div class="center">
                    <---- Amount Received From Customer ---->
                </div>
                <div class="center">
                    <strong>${freshBill.paymentMode || 'Cash'} Payment: ${totalAmount.toFixed(2)}</strong>
                </div>
            </div>`;
        }
        
        // Show savings if enabled - without rupee symbol
        const savingsHtml = settings.showSavings && totalSavings > 0 ? 
            `<div class="savings">
                <strong>YOU SAVED: ${totalSavings.toFixed(2)}</strong>
            </div>` : '';
        
        // Generate the complete HTML
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>D-Mart Receipt ${dateStr}</title>
            <meta name="receipt-id" content="${uniqueId}">
            <style>${styles}</style>
        </head>
        <body data-receipt-id="${uniqueId}" data-timestamp="${timestamp}">
            <div class="header">
                <h1>${storeName}</h1>
                <div class="tagline">${storeTagline}</div>
                
                <div class="legal-info">
                    CIN :- ${storeCIN}<br>
                    GSTIN : ${storeGSTIN}<br>
                    FSSAI NO.${storeFSSAI}
                </div>
                
                <div class="divider"></div>
                
                <div class="store-info">
                    <div class="branch-name">${branchName}</div>
                    ${storeAddress1}<br>
                    ${storeAddress2}<br>
                    ${storeCity}<br>
                    ${storePhone}
                </div>
                
                <div class="divider"></div>
                
                <div class="invoice-title">TAX INVOICE</div>
            </div>
            
            <div class="bill-header">
                <table>
                    <tr>
                        <td>Bill No : ${freshBill.billNumber || freshBill.id}</td>
                        <td>Bill Dt : ${dateTimeStr}</td>
                    </tr>
                    <tr>
                        <td>Vou. No : ${voucherNumber}</td>
                        <td>Cashier : ${cashier}</td>
                    </tr>
                </table>
            </div>
            
            <div class="divider"></div>
            
            <div class="items-header">
                HSN Particulars
            </div>
            
            <table>
                <tr>
                    ${showHsnColumn ? '<th class="hsn-column">HSN</th>' : ''}
                    <th class="item-column">Item</th>
                    <th class="qty-column right">Qty</th>
                    ${showMrpColumn ? '<th class="mrp-column right">MRP</th>' : ''}
                    <th class="rate-column right">Rate</th>
                    <th class="value-column right">Value</th>
                </tr>
                ${itemsHtml}
            </table>
            
            <div class="divider"></div>
            
            <div class="totals-summary">
                Items: ${totalItems} &nbsp;&nbsp; Qty: ${totalQuantity.toFixed(freshBill.items.some(i => i.isWeighted) ? 3 : 0)}
            </div>
            
            ${gstBreakdownHtml}
            ${savingsHtml}
            
            <div class="footer">
                Thank you for shopping with us!
            </div>
            
            <script>
                console.log('Receipt ${uniqueId} loaded at ${timestamp}');
                document.body.setAttribute('data-loaded', '${timestamp}');
                
                // Add a manual print button to avoid automatic printing that interferes with PDF generation
                const printBtn = document.createElement('button');
                printBtn.innerText = 'Print Receipt';
                printBtn.style.position = 'fixed';
                printBtn.style.bottom = '20px';
                printBtn.style.right = '20px';
                printBtn.style.padding = '10px 15px';
                printBtn.style.backgroundColor = '#4CAF50';
                printBtn.style.color = 'white';
                printBtn.style.border = 'none';
                printBtn.style.borderRadius = '5px';
                printBtn.style.cursor = 'pointer';
                printBtn.style.zIndex = '9999';
                
                printBtn.addEventListener('click', function() {
                    // Hide the button before printing
                    this.style.display = 'none';
                    
                    // Wait a moment and then print
                    setTimeout(function() {
                        window.print();
                    }, 100);
                });
                
                document.body.appendChild(printBtn);
                
                // Print automatically after a delay only if auto-print is enabled
                const autoPrint = ${settings.autoPrint !== false};
                if (autoPrint) {
                    setTimeout(function() {
                        console.log('Auto-printing receipt...');
                        printBtn.style.display = 'none';
                        window.print();
                    }, 1000);
                }
            </script>
        </body>
        </html>`;
    }

    // Helper for detailed receipt
    _getDetailedReceiptHtml(bill, settings) {
        // Implementation of detailed receipt
        // This is a simplified version focused on reliability
        const storeName = settings.storeName || "Your Store";
        
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Detailed Receipt</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 10px; }
                h1, h2 { text-align: center; margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { padding: 5px; text-align: left; border-bottom: 1px solid #ddd; }
                .right { text-align: right; }
                .total { font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>${storeName}</h1>
            <h2>Detailed Receipt</h2>
            
            <p><strong>Bill #:</strong> ${bill.billNumber || bill.id}</p>
            <p><strong>Date:</strong> ${new Date(bill.timestamp).toLocaleString()}</p>
            <p><strong>Payment:</strong> ${bill.paymentMode || 'Cash'}</p>
            
            <table>
                <tr>
                    <th>Item</th>
                    <th class="right">Price</th>
                    <th class="right">Qty</th>
                    <th class="right">Total</th>
                </tr>
                ${bill.items.map(item => `
                <tr>
                    <td>${item.name || ''}</td>
                    <td class="right">${(item.price || 0).toFixed(2)}</td>
                    <td class="right">${item.quantity || 1}</td>
                    <td class="right">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
                </tr>`).join('')}
                <tr class="total">
                    <td colspan="3" class="right">Total:</td>
                    <td class="right">₹${bill.total.toFixed(2)}</td>
                </tr>
            </table>
            
            <script>
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window.print();
                    }, 300);
                });
            </script>
        </body>
        </html>`;
    }

    // Add the missing _getStandardReceiptHtml function
    _getStandardReceiptHtml(bill, settings) {
        // Force reload the bill data from scratch to ensure fresh content
        const freshBill = JSON.parse(JSON.stringify(bill)); // Deep clone
        console.log('Generating standard receipt for bill:', freshBill.id);
        
        // Add timestamp to prevent caching
        const timestamp = Date.now();
        const uniqueId = `std-receipt-${freshBill.id}-${timestamp}`;
        
        // Store details
        const storeName = settings.storeName || "Your Store";
        const storeAddress = settings.storeAddress || "";
        const storePhone = settings.storePhone || "";
        
        // Format date
        const date = freshBill.timestamp ? new Date(freshBill.timestamp) : new Date();
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        // Process items
        const items = Array.isArray(freshBill.items) ? freshBill.items : [];
        let totalItems = 0;
        let totalQuantity = 0;
        let totalAmount = 0;
        
        // Generate items HTML
        const itemsHtml = items.map((item, index) => {
            const qty = item.isWeighted ? item.weight : (item.quantity || 0);
            const price = parseFloat(item.price) || 0;
            const rate = parseFloat(item.rate) || 0;
            const total = item.isWeighted ? (rate * qty) : (rate * qty);
            
            totalItems++;
            totalQuantity += qty;
            totalAmount += total;
            
            return `
            <tr>
                <td>${index + 1}</td>
                <td>${item.name}</td>
                <td class="right">${rate.toFixed(2)}</td>
                <td class="right">${item.isWeighted ? qty.toFixed(3) + ' kg' : qty}</td>
                <td class="right">₹${total.toFixed(2)}</td>
            </tr>`;
        }).join('');
        
        // Simplified payment details - only show payment mode
        let paymentDetails = `
        <div class="divider"></div>
        <div class="center payment-mode">
            <strong>Payment Mode:</strong> ${freshBill.paymentMode || 'Cash'}
        </div>`;
        
        // Simple receipt styling
        const styles = `
            @page { size: 80mm auto; margin: 0; }
            body { 
                font-family: Arial, sans-serif; 
                font-size: 12px; 
                width: 80mm; 
                margin: 0; 
                padding: 10px; 
            }
            h1, h2 { 
                text-align: center; 
                margin: 5px 0; 
                font-size: 14px;
            }
            .store-info {
                text-align: center;
                margin-bottom: 10px;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 10px 0; 
            }
            th, td { 
                padding: 5px; 
                text-align: left; 
            }
            th {
                border-bottom: 1px solid #000;
                font-weight: bold;
            }
            .right { 
                text-align: right; 
            }
            .center { 
                text-align: center; 
            }
            .total { 
                font-weight: bold; 
                border-top: 1px solid #000;
            }
            .divider {
                border-top: 1px dashed #000;
                margin: 10px 0;
            }
            .payment-section {
                margin: 10px 0;
                padding: 8px;
                border: 1px solid #000;
                border-radius: 5px;
            }
            .payment-table {
                width: 100%;
            }
            .label {
                font-weight: bold;
            }
            .change-row {
                font-weight: bold;
            }
            .footer {
                text-align: center;
                margin-top: 15px;
                font-size: 10px;
            }
        `;
        
        // Generate the complete HTML
        return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Receipt ${timestamp}</title>
            <meta name="receipt-id" content="${uniqueId}">
            <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
            <meta http-equiv="Pragma" content="no-cache">
            <meta http-equiv="Expires" content="0">
            <style>
                ${styles}
            </style>
        </head>
        <body data-receipt-id="${uniqueId}" data-timestamp="${timestamp}">
            <h1>${storeName}</h1>
            <div class="store-info">
                ${storeAddress ? `<div>${storeAddress}</div>` : ''}
                ${storePhone ? `<div>Tel: ${storePhone}</div>` : ''}
            </div>

            <div class="divider"></div>
            
            <div>
                <table>
                    <tr>
                        <td><strong>Bill #:</strong></td>
                        <td>${freshBill.billNumber || freshBill.id}</td>
                        <td class="right"><strong>Date:</strong></td>
                        <td class="right">${dateStr}</td>
                    </tr>
                    <tr>
                        <td><strong>Time:</strong></td>
                        <td>${timeStr}</td>
                        <td class="right"><strong>Payment:</strong></td>
                        <td class="right">${freshBill.paymentMode || 'Cash'}</td>
                    </tr>
                </table>
            </div>
            
            <div class="divider"></div>
            
            <table>
                <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th class="right">Rate</th>
                    <th class="right">Qty</th>
                    <th class="right">Total</th>
                </tr>
                ${itemsHtml}
                <tr class="total">
                    <td colspan="4" class="right">Total:</td>
                    <td class="right">₹${totalAmount.toFixed(2)}</td>
                </tr>
            </table>
            
            ${paymentDetails}
            
            <div class="footer">
                Thank you for shopping with us!
            </div>
            
            <script>
                console.log('Receipt ${uniqueId} loaded at ${timestamp}');
                document.body.setAttribute('data-loaded', '${timestamp}');
                
                setTimeout(function() {
                    console.log('Sending to printer...');
                    window.print();
                    
                    setTimeout(function() {
                        console.log('Closing print window...');
                        try { 
                            window.close(); 
                        } catch(e) { 
                            console.log('Could not close window automatically'); 
                        }
                    }, 1000);
                }, 500);
            </script>
        </body>
        </html>`;
    }
}

// Initialize bill manager
const billManager = new BillManager(); 

// Ensure bills are loaded after the page is fully loaded
window.addEventListener('load', () => {
    console.log('Window loaded - checking bills...');
    setTimeout(() => {
        if (billManager.bills.length === 0) {
            console.log('No bills loaded on startup - attempting to reload from storage');
            billManager._loadBillsFromStorage();
            billManager.updatePastBillsDisplay();
        }
    }, 1000);
}); 