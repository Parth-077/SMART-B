class BillingSystem {
    constructor() {
        this.currentBill = [];
        this.selectedPaymentMode = 'Cash'; // Default payment mode
        this.cashDetails = null;
        this.currentBillId = null; // Initialize currentBillId
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    async setupEventListeners() {
        // Wait for scanner to be ready
        await window.scannerReady;
        
        // Now it's safe to reference scanner
        document.getElementById('scanBarcodeBtn')?.addEventListener('click', () => {
            window.scanner.startScanning();
        });

        // Billing button - update this section
        const billingButtons = document.querySelectorAll('.menu-button');
        billingButtons.forEach(btn => {
            if (btn.querySelector('.menu-text')?.textContent.trim() === 'Billing') {
                // Remove any existing click handlers
                btn.removeAttribute('onclick');
                // Add new event listener
                btn.addEventListener('click', () => this.showBillingModal());
            }
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.fixed')));
        });

        // Add event listeners for payment mode buttons
        // First, remove any existing event listeners (to prevent duplicates)
        const cashBtn = document.getElementById('cashPaymentBtn');
        const upiBtn = document.getElementById('upiPaymentBtn');
        const cardBtn = document.getElementById('cardPaymentBtn');
        
        // Clone and replace to remove all event listeners
        if (cashBtn) {
            const newCashBtn = cashBtn.cloneNode(true);
            cashBtn.parentNode.replaceChild(newCashBtn, cashBtn);
            newCashBtn.addEventListener('click', () => {
                this.selectPaymentMode('Cash');
                this.showCashPaymentDialog();
            });
        }
        
        if (upiBtn) {
            const newUpiBtn = upiBtn.cloneNode(true);
            upiBtn.parentNode.replaceChild(newUpiBtn, upiBtn);
            newUpiBtn.addEventListener('click', () => {
                this.selectPaymentMode('UPI');
            });
        }
        
        if (cardBtn) {
            const newCardBtn = cardBtn.cloneNode(true);
            cardBtn.parentNode.replaceChild(newCardBtn, cardBtn);
            newCardBtn.addEventListener('click', () => {
                this.selectPaymentMode('Card');
            });
        }
        
        console.log('Payment mode buttons initialized');

        // Add Manual Item button
        document.getElementById('addManualItem')?.addEventListener('click', () => {
            const product = this.getSelectedProduct();
            if (product) {
                this.addItemToBill(product);
            }
        });

        // Barcode input with search suggestions
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            // Create suggestions container if it doesn't exist
            let suggestionsDiv = document.getElementById('searchSuggestions');
            if (!suggestionsDiv) {
                suggestionsDiv = document.createElement('div');
                suggestionsDiv.id = 'searchSuggestions';
                suggestionsDiv.className = 'absolute z-10 w-full bg-white border rounded-b shadow-lg max-h-60 overflow-auto hidden';
                barcodeInput.parentElement.appendChild(suggestionsDiv);
            }

            // Handle input changes for search
            barcodeInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.trim();
                this.showSearchSuggestions(searchTerm);
            });
            
            // Handle enter key for direct barcode
            barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const searchTerm = e.target.value.trim();
                    if (searchTerm) {
                        const product = productManager.products.find(p => 
                            p.barcode === searchTerm || 
                            p.name.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (product) {
                            this.addItemToBill(product);
                            e.target.value = '';
                            document.getElementById('searchSuggestions')?.classList.add('hidden');
                        } else {
                            alert('Product not found. Please add the product first.');
                        }
                    }
                }
            });

            // Focus handling
            barcodeInput.addEventListener('focus', () => {
                const searchTerm = barcodeInput.value.trim();
                if (searchTerm) {
                    this.showSearchSuggestions(searchTerm);
                }
            });
        }

        // Generate and Print bill buttons
        document.getElementById('generateBill')?.addEventListener('click', () => this.generateBill());
        document.getElementById('printBill')?.addEventListener('click', () => this.printBill());

        // Keep the debug button handler but don't make it visible
        document.getElementById('debugBillButton')?.addEventListener('click', () => {
            this.debugBillId();
            
            // Try to recover from any missing bill ID
            if (!this.currentBillId && this.currentBill.length > 0) {
                console.log('Attempting bill recovery...');
                // Force regenerate bill ID
                this.generateBill();
            }
        });
    }

    showBillingModal() {
        // Show the modal without clearing the bill
        const modal = document.getElementById('billingModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Update the display to show current items
            this.updateBillDisplay();
            
            // Initialize payment mode buttons with proper capitalization
            this.updatePaymentModeButtons(this.selectedPaymentMode || 'Cash');
        }
        
        // Focus on barcode input
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            barcodeInput.value = '';
            barcodeInput.focus();
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            // Only clear items when explicitly requested, not on every close
            if (modal.id === 'billingModal' && this.shouldClearOnClose) {
                this.clearBill();
                this.shouldClearOnClose = false;
            }
        }
    }

    clearBill() {
        // Clear the bill array
        this.currentBill = [];
        
        // Reset payment mode
        this.selectedPaymentMode = 'Cash';
        this.cashDetails = null;
        
        // Reset payment mode buttons
        this.updatePaymentModeButtons('Cash');

        // Clear barcode input
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            barcodeInput.value = '';
        }

        // Hide search suggestions
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) {
            suggestions.classList.add('hidden');
        }

        // Update the display
        this.updateBillDisplay();
    }

    addItemToBill(product, quantity = 1, weight = null) {
        // Check if the product exists
        if (!product) return false;
        
        console.log('Adding product to bill:', product);
        
        // Get price values correctly
        const price = parseFloat(product.price || product.mrp || 0);
        const discount = parseFloat(product.discount || 0);
        
        // Ensure we have valid positive values
        if (price <= 0) {
            console.error('Invalid product price:', price);
            alert('This product has an invalid price. Please update the product details.');
            return false;
        }
        
        // Rate is MRP minus discount (but still includes GST)
        // Ensure rate is not negative
        const rate = Math.max(price - discount, 0.01);
        
        // Determine GST rate
        const gstRate = parseFloat(product.gstRate || 0);
        
        // Calculate pre-tax value and GST amount (reverse calculation since MRP includes GST)
        const preTaxValue = rate / (1 + (gstRate / 100));
        const gstAmount = rate - preTaxValue;
        
        // Check if this product already exists in the bill
        const existingItemIndex = this.currentBill.findIndex(item => 
            item.id === product.id && 
            item.barcode === product.barcode &&
            item.isWeighted === (product.type === 'weight')
        );
        
        // If product already exists, update quantity rather than adding a new line
        if (existingItemIndex !== -1) {
            console.log('Product already in bill, updating quantity', existingItemIndex);
            const existingItem = this.currentBill[existingItemIndex];
            
            if (existingItem.isWeighted) {
                // For weighted items, add the new weight
                const newWeight = parseFloat(existingItem.weight) + parseFloat(weight || 0);
                existingItem.weight = newWeight;
                existingItem.total = newWeight * rate;
            } else {
                // For quantity items, increment the quantity
                existingItem.quantity += quantity;
                existingItem.total = existingItem.quantity * rate;
            }
            
            // Update the item in the current bill
            this.currentBill[existingItemIndex] = existingItem;
        } else {
            // Create a new item if not found in bill
                const newItem = {
                    id: product.id,
                    name: product.name,
                barcode: product.barcode,
                isWeighted: product.type === 'weight',
                price: price, // MRP
                rate: rate,   // Selling price (MRP - discount)
                gstRate: gstRate,
                gstAmount: gstAmount,
                pretaxValue: preTaxValue
            };
            
            // Set quantity or weight based on product type
            if (newItem.isWeighted) {
                newItem.weight = parseFloat(weight || 0);
                newItem.total = newItem.weight * rate;
            } else {
                newItem.quantity = quantity;
                newItem.total = quantity * rate;
            }
            
            // Add to current bill
                this.currentBill.push(newItem);
            }

        // Update the bill display
            this.updateBillDisplay();
            
        // Clear barcode input
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) {
            barcodeInput.value = '';
            barcodeInput.focus();
        }
        
        return true;
    }

    addWeightedItemToBill(item) {
        const product = productManager.products.find(p => p.name === item.name);
        if (!product) return;

        const weightInKg = item.weightUnit === 'g' ? item.weight / 1000 : item.weight;
        const discountedPrice = productManager.calculateDiscountedPrice(product);

        const billItem = {
            id: product.id,
            name: `${product.name} (${item.weight}${item.weightUnit})`,
            price: product.mrp,
            discountedPrice: discountedPrice,
            quantity: 1,
            weight: weightInKg,
            total: weightInKg * discountedPrice,
            isWeighted: true
        };

        this.currentBill.push(billItem);
        this.updateBillDisplay();
    }

    removeItem(index) {
        this.currentBill.splice(index, 1);
        this.updateBillDisplay();
    }

    updateQuantity(index, newQuantity) {
        if (newQuantity <= 0) {
            this.removeItem(index);
            return;
        }

        const item = this.currentBill[index];
        if (item && this.checkStockAvailability(item.id, newQuantity)) {
            item.quantity = newQuantity;
            item.total = Number((item.discountedPrice * newQuantity).toFixed(2));
            this.updateBillDisplay();
        }
    }

    updateBillDisplay() {
        const billItemsContainer = document.getElementById('billItems');
        const billTotalElement = document.getElementById('billTotal');
        
        if (!billItemsContainer || !billTotalElement) {
            console.error('Required bill display elements not found');
            return;
        }
        
        // Clear the container
        billItemsContainer.innerHTML = '';
        
        // Total counter
        let total = 0;
        
        // Add each item to the display
        this.currentBill.forEach((item, index) => {
            const itemTotal = parseFloat(item.total) || 0;
            total += itemTotal;
            
            // Ensure we have valid display values
            const price = parseFloat(item.price) || 0;
            const rate = parseFloat(item.rate) || 0;
            const qty = item.isWeighted ? (item.weight || 0) : (item.quantity || 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-2 text-center">${index + 1}</td>
                <td class="p-2">${item.name}</td>
                <td class="p-2 text-right">₹${price.toFixed(2)}</td>
                <td class="p-2 text-right">₹${rate.toFixed(2)}</td>
                <td class="p-2 text-center">
                    <div class="flex items-center justify-center">
                        <button class="px-2 bg-blue-500 text-white rounded-l hover:bg-blue-700" onclick="billingSystem.decrementQuantity(${index})">-</button>
                        <span class="px-3 border-t border-b min-w-[40px] text-center">${item.isWeighted ? `${item.weight} kg` : item.quantity}</span>
                        <button class="px-2 bg-blue-500 text-white rounded-r hover:bg-blue-700" onclick="billingSystem.incrementQuantity(${index})">+</button>
                    </div>
                </td>
                <td class="p-2 text-right">₹${itemTotal.toFixed(2)}</td>
                <td class="p-2 text-center">
                    <button class="text-red-500 hover:text-red-700" onclick="billingSystem.removeItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            billItemsContainer.appendChild(row);
        });
        
        // Update the total
        billTotalElement.textContent = `₹${total.toFixed(2)}`;
    }

    incrementQuantity(index) {
        if (index < 0 || index >= this.currentBill.length) return;
        
        const item = this.currentBill[index];
        if (!item) return;

        // Handle weighted items differently
        if (item.isWeighted) {
            // For weighted items, increment by 0.1 kg
            const newWeight = parseFloat((item.weight + 0.1).toFixed(3));
            item.weight = newWeight;
            item.total = newWeight * item.rate;
        } else {
            // For regular items, increment quantity by 1
            const newQuantity = item.quantity + 1;
            item.quantity = newQuantity;
            item.total = newQuantity * item.rate;
        }
        
        // Update the display
        this.updateBillDisplay();
    }

    decrementQuantity(index) {
        if (index < 0 || index >= this.currentBill.length) return;
        
        const item = this.currentBill[index];
        if (!item) return;

        // Handle weighted items differently
        if (item.isWeighted) {
            // For weighted items, decrement by 0.1 kg but don't go below 0.1
            const newWeight = Math.max(0.1, parseFloat((item.weight - 0.1).toFixed(3)));
            item.weight = newWeight;
            item.total = newWeight * item.rate;
        } else {
            // For regular items, decrement by 1 but don't go below 1
            if (item.quantity > 1) {
                const newQuantity = item.quantity - 1;
                item.quantity = newQuantity;
                item.total = newQuantity * item.rate;
            } else {
                // If quantity would be 0, remove the item instead
                return this.removeItem(index);
            }
        }

        // Update the display
        this.updateBillDisplay();
    }

    generateBill() {
        console.log('Generating bill...');
        console.log('Current payment mode:', this.selectedPaymentMode);
        
        if (this.currentBill.length === 0) {
            alert('Cannot generate empty bill. Please add items first.');
            return;
        }
        
        // Mark the modal as generating a bill to prevent double-generation
        const modal = document.getElementById('billingModal');
        if (modal) {
            if (modal.getAttribute('data-generating-bill') === 'true') {
                console.log('Bill generation already in progress. Ignoring repeated request.');
                return;
            }
            modal.setAttribute('data-generating-bill', 'true');
        }
        
        try {
            // Calculate bill total
            const total = this.currentBill.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
            
            // Create unique bill number
            const billNumber = this._generateBillNumber();
            
            // Generate bill ID (will be used as the database key)
            const billId = 'bill_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
            
            // Create bill data object, including payment mode
            const billData = {
                id: billId,
                billNumber: billNumber,
                timestamp: new Date().toISOString(),
                items: [...this.currentBill],
                total: total,
                paymentMode: this.selectedPaymentMode, // Include the selected payment mode
                cashDetails: this.cashDetails // Include cash details if applicable
            };
            
            console.log('Generated bill:', billData);
            
            // Store the bill ID before saving (important for printing)
            this.currentBillId = billId;
            
            // Get reference to billManager from window if not directly accessible
            const billManagerRef = typeof billManager !== 'undefined' ? billManager : window.billManager;
            
            // Reference billManager directly, not through window
            if (billManagerRef && typeof billManagerRef.addBill === 'function') {
                console.log('Adding bill to bill manager...');
                const newBillId = billManagerRef.addBill(billData);
                console.log('Bill added with ID:', newBillId);
            } else {
                console.error('billManager not available or missing addBill method');
            }
            
            // Alert success
            alert('Bill generated successfully!');
            return billId;
        } catch (error) {
            console.error('Error generating bill:', error);
            alert('Error generating bill. Please try again.');
            return null;
        } finally {
            // Reset the generating flag regardless of outcome
            if (modal) {
                modal.setAttribute('data-generating-bill', 'false');
            }
        }
    }

    checkStockAvailability(productId, requestedQuantity) {
        const product = productManager.products.find(p => p.id == productId);
        if (!product) return false;

        if (product.stock < requestedQuantity) {
            alert(`Insufficient stock! Only ${product.stock} units available.`);
            return false;
        }
        return true;
    }

    updateStockLevels() {
        try {
            this.currentBill.forEach(item => {
                const productIndex = productManager.products.findIndex(p => p.id === item.id);
                if (productIndex !== -1) {
                    productManager.products[productIndex].stock -= item.quantity;
                }
            });

            // Save updated products
            productManager.saveProducts();
            
            // Update inventory display if visible
            inventoryManager?.updateInventoryDisplay();

            return true;
        } catch (error) {
            console.error('Error updating stock levels:', error);
            alert('Error updating stock levels. Please try again.');
            return false;
        }
    }

    handleBarcodeInput(barcode) {
        const product = productManager.products.find(p => 
            p.barcode === barcode || 
            p.name.toLowerCase().includes(barcode.toLowerCase())
        );

        if (product) {
            this.addItemToBill(product);
        } else {
            alert('Product not found. Please add the product first.');
        }
    }

    showSearchSuggestions(searchTerm) {
        const suggestionsDiv = document.getElementById('searchSuggestions');
        if (!suggestionsDiv || !searchTerm) {
            suggestionsDiv?.classList.add('hidden');
            return;
        }

        const products = productManager.products.filter(product => 
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        if (products.length > 0) {
            suggestionsDiv.innerHTML = products.map(product => {
                const discountedPrice = productManager.calculateDiscountedPrice(product);
                return `
                    <div class="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                         onclick="billingSystem.addItemFromSearch('${product.id}')">
                        <span>${product.name}</span>
                        <span class="text-gray-500">
                            ${product.discount > 0 ? 
                                `<span class="line-through mr-2">₹${product.mrp}</span>` : 
                                ''}
                            ₹${discountedPrice.toFixed(2)}
                        </span>
                    </div>
                `;
            }).join('');
            suggestionsDiv.classList.remove('hidden');
        } else {
            suggestionsDiv.innerHTML = `
                <div class="p-2 text-gray-500">No products found</div>
            `;
            suggestionsDiv.classList.remove('hidden');
        }

        // Add click outside handler
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#barcodeInput') && !e.target.closest('#searchSuggestions')) {
                suggestionsDiv.classList.add('hidden');
            }
        });
    }

    addItemFromSearch(productId) {
        const product = productManager.products.find(p => p.id == productId);
        if (product) {
            this.addItemToBill(product);
            document.getElementById('barcodeInput').value = '';
            document.getElementById('searchSuggestions')?.classList.add('hidden');
        }
    }

    printBill() {
        try {
            console.log('Attempting to print bill...');
            
            // Get reference to billManager from window if not directly accessible
            const billManagerRef = typeof billManager !== 'undefined' ? billManager : window.billManager;
            
            if (!billManagerRef) {
                throw new Error('Bill manager not available. Please refresh the page and try again.');
            }
            
            // First, check if there's a current bill ID
            if (this.currentBillId) {
                console.log('Found existing bill ID to print:', this.currentBillId);
                
                // Print the bill
                console.log('Calling billManager.printBill with ID:', this.currentBillId);
                billManagerRef.printBill(this.currentBillId);
                
                // Auto-clear the bill after successful print
                setTimeout(() => {
                    console.log('Auto-clearing bill after print');
                    this.clearBill();
                    
                    // Also reset billing modal
                    this.resetBillingModal();
                }, 500);
                
                return true;
            } 
            // No current bill ID but we have items - generate and print
            else if (this.currentBill.length > 0) {
                console.log('Generating new bill before printing...');
                
                // Generate the bill first
                const newBillId = this.generateBill();
                
                // Check if generation succeeded
                if (newBillId) {
                    console.log('Bill generated with ID:', newBillId);
                    console.log('Will attempt printing after short delay...');
                    
                    // Use a delay to ensure bill is saved before printing
                    setTimeout(() => {
                        const currentBillManagerRef = typeof billManager !== 'undefined' ? billManager : window.billManager;
                        if (currentBillManagerRef && typeof currentBillManagerRef.printBill === 'function') {
                            currentBillManagerRef.printBill(newBillId);
                            
                            // Auto-clear the bill after successful print
                            setTimeout(() => {
                                console.log('Auto-clearing bill after print');
                                this.clearBill();
                                
                                // Also reset billing modal
                                this.resetBillingModal();
                            }, 500);
                        } else {
                            console.error('Bill manager not available for printing after delay');
                            alert('Error: Could not print bill. Please try again.');
                        }
                    }, 300);
                    
                    return true;
                } else {
                    throw new Error('Failed to generate bill before printing');
                }
            }
            // No items to print
            else {
                alert('No bill to print. Please add items first.');
                return false;
            }
        } catch (error) {
            console.error('Error printing bill:', error);
            alert('Unable to print bill. Please try again.');
            return false;
        }
    }

    // Add a more thorough reset method
    clearCompleteData() {
        console.log('Performing complete data reset...');
        
        // Clear current data
        this.currentBill = [];
        this.currentBillId = null;
        this.selectedPaymentMode = 'Cash';
        this.cashDetails = null;
        
        // Update the display
        this.updateBillDisplay();
        
        // Reset form elements
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.value = '';
        
        // Reset payment mode buttons
        this.updatePaymentModeButtons('Cash');
        
        console.log('Complete data reset finished');
    }

    // Replace the existing _resetPrintState with this enhanced version
    _resetPrintState() {
        console.log('Resetting print state...');
        
        // Clear any cached data
        this._lastPrintedBillId = null;
        
        // Reset the print counter to force a fresh print
        this._printCounter = (this._printCounter || 0) + 1;
        
        // Close any existing print windows
        if (this._printWindow && !this._printWindow.closed) {
            try {
                this._printWindow.close();
            } catch (e) {
                console.log('Could not close previous print window');
            }
        }
        
        // Clear reference to previous print window
        this._printWindow = null;
    }

    selectPaymentMode(mode) {
        // Standardize the payment mode capitalization
        const standardizedMode = mode === 'cash' || mode === 'CASH' ? 'Cash' : 
                                mode === 'upi' || mode === 'UPI' ? 'UPI' : 
                                mode === 'card' || mode === 'CARD' ? 'Card' : mode;
        
        // Update the payment mode
        this.selectedPaymentMode = standardizedMode;
        
        // Update the UI
        this.updatePaymentModeButtons(standardizedMode);
        
        // If Cash is selected, show the cash payment dialog
        if (standardizedMode === 'Cash') {
            // Clear any cash details
            this.cashDetails = null;
        }
        
        // If UPI is selected, show the UPI QR code modal
        if (standardizedMode === 'UPI') {
            this.showUpiQrModal();
        }
        
        console.log('Payment mode updated to:', this.selectedPaymentMode);
    }

    // Add an inline QR code generator using the included library
    generateInlineQrCode(upiId, amount) {
        console.log('Using inline QR code generator');
        const qrContainer = document.getElementById('upiQrCodeContainer');
        if (!qrContainer) {
            console.error('QR container not found in inline generator');
            return false;
        }
        
        try {
            // Check if QR code library is available
            if (typeof qrcode === 'undefined') {
                console.error('QR code library not loaded');
                return false;
            }
            
            // Create UPI payment URL
            const payeeName = encodeURIComponent(
                window.settingsManager?.settings?.storeName || 'My Store'
            );
            const transactionNote = encodeURIComponent(`Bill Payment`);
            const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
            
            // Generate QR code using the included library
            const qr = qrcode(0, 'M');
            qr.addData(upiUrl);
            qr.make();
            
            // Get QR code as HTML - increase the size parameter for better visibility
            const qrHtml = qr.createImgTag(8);
            
            // Update the container with the inline QR code
            qrContainer.innerHTML = `
                <div class="flex flex-col items-center">
                    ${qrHtml.replace('img', 'img class="mx-auto block rounded shadow-md"')}
                    <div class="mt-2 text-sm text-gray-600">
                        <p>Amount: ₹${amount.toFixed(2)}</p>
                        <p>UPI ID: ${upiId}</p>
                    </div>
                    <div class="mt-1 text-xs text-gray-400">(Secure Payment)</div>
                </div>
            `;
            
            console.log('Inline QR code generated successfully');
            return true;
        } catch (error) {
            console.error('Error generating inline QR code:', error);
            return false;
        }
    }

    // Add a new method to show the UPI QR code modal
    showUpiQrModal() {
        console.log('showUpiQrModal method called');
        
        // Calculate bill total
        const total = this.currentBill.reduce((sum, item) => sum + parseFloat(item.total || 0), 0);
        console.log('UPI Payment initiated for total amount:', total);
        
        // First make sure modal is visible before manipulating its contents
        const modal = document.getElementById('upiQrModal');
        if (modal) {
            console.log('UPI modal found, showing it');
            modal.classList.remove('hidden');
            } else {
            console.error('UPI Modal not found in DOM!');
            return;
        }
        
        // Update the UPI payment amount display
        const upiPaymentAmount = document.getElementById('upiPaymentAmount');
        if (upiPaymentAmount) {
            upiPaymentAmount.textContent = total.toFixed(2);
            console.log('Updated payment amount display:', total.toFixed(2));
        } else {
            console.error('UPI payment amount element not found!');
        }
        
        // Get UPI ID from settings
        let upiId = '';
        try {
            if (window.settingsManager && window.settingsManager.settings && window.settingsManager.settings.upiAddress) {
                upiId = window.settingsManager.settings.upiAddress;
                console.log('Found UPI ID in settings:', upiId);
            } else {
                console.warn('UPI ID not found in settings. Please configure it in Settings > Receipt Settings.');
            }
        } catch (err) {
            console.error('Error getting UPI ID from settings:', err);
        }
        
        // Display UPI ID
        const upiIdSpan = document.querySelector('#upiIdDisplay span');
        if (upiIdSpan) {
            upiIdSpan.textContent = upiId || 'Not configured';
            console.log('Updated UPI ID display:', upiId || 'Not configured');
        } else {
            console.error('UPI ID display span not found!');
        }
        
        // Get reference to QR container and clear previous contents
        const qrContainer = document.getElementById('upiQrCodeContainer');
        if (qrContainer) {
            console.log('QR container found, clearing previous content');
            qrContainer.innerHTML = `
                <div class="flex items-center justify-center">
                    <div class="text-center p-4">
                        <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-2"></i>
                        <p>Generating QR code...</p>
                    </div>
                </div>
            `;
            
            // Remove any previously added status divs
            const existingStatus = document.querySelector('.qr-status-indicator');
            if (existingStatus) {
                existingStatus.remove();
                console.log('Removed previous status indicator');
            }
        } else {
            console.error('QR code container not found in DOM!');
        }
        
        // Generate QR code if UPI ID is available - try all methods
        if (upiId) {
            console.log('UPI ID available, generating QR code');
            
            // Try to generate the QR code using prioritized methods
            try {
                // First try inline generator (most reliable)
                if (typeof qrcode !== 'undefined') {
                    console.log('Using inline QR code generator (first choice)');
                    const inlineSuccess = this.generateInlineQrCode(upiId, total);
                    
                    if (inlineSuccess) {
                        console.log('Inline QR code generation successful');
                    } else {
                        console.log('Inline QR code generation failed, trying labnol method');
                        this.generateUpiQrCode(upiId, total); // Will fallback to API method if needed
                    }
                } else {
                    console.log('QR library not available, using labnol method directly');
                    this.generateUpiQrCode(upiId, total); // Will fallback to API method if needed
                }
            } catch (error) {
                console.error('Error during QR code generation sequence:', error);
                
                // Final fallback - direct API method
                this.generateFallbackQrCode(upiId, total);
            }
            
            // Add a refreshing indicator to help users understand the status
            const statusDiv = document.createElement('div');
            statusDiv.className = 'mt-2 text-center text-sm qr-status-indicator';
            statusDiv.innerHTML = '<span class="text-green-600">✓</span> QR Code generated successfully';
            
            // Append status message after the QR code container
            if (qrContainer && qrContainer.parentNode) {
                qrContainer.parentNode.insertBefore(statusDiv, qrContainer.nextSibling);
                console.log('Added status indicator after QR container');
            } else {
                console.error('Could not append status indicator - missing parent node');
            }
        } else {
            // Show message if UPI ID is not configured
            if (qrContainer) {
                console.log('No UPI ID - showing configuration message');
                qrContainer.innerHTML = `
                    <div class="text-center p-4 border border-red-200 rounded-lg bg-red-50">
                        <p class="text-red-500 font-medium mb-2">UPI ID not configured</p>
                        <p class="text-sm text-gray-600 mb-3">Please set your UPI ID in Settings > Receipt Settings > UPI Address</p>
                        <button onclick="window.settingsManager.showSettingsModal()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                            Go to Settings
                        </button>
                    </div>
                `;
                console.warn('UPI QR code not generated: UPI ID not configured');
            }
        }
        
        // Set up event listeners for the modal buttons
        const closeBtn = document.getElementById('closeUpiModal');
        if (closeBtn) {
            console.log('Setting up close button handler');
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                // Reset to cash payment if canceled
                this.selectPaymentMode('Cash');
            };
        } else {
            console.error('Close UPI modal button not found!');
        }
        
        const confirmBtn = document.getElementById('confirmUpiPayment');
        if (confirmBtn) {
            console.log('Setting up confirm button handler');
            // Disable the confirm button initially if UPI ID is not configured
            if (!upiId) {
                confirmBtn.disabled = true;
                confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
                console.log('Disabled confirm button due to missing UPI ID');
            } else {
                confirmBtn.disabled = false;
                confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                console.log('Enabled confirm button');
            }
            
            confirmBtn.onclick = () => {
                modal.classList.add('hidden');
                
                // Generate and print the bill with UPI payment mode
                alert('UPI payment confirmed. Generating bill with UPI payment mode.');
                
                // Generate the bill
                const billId = this.generateBill();
                
                // Print the bill if generation was successful
                if (billId) {
                    console.log('Bill generated with UPI payment, now printing bill:', billId);
                    setTimeout(() => this.printBill(billId), 300);
                }
            };
        } else {
            console.error('Confirm UPI payment button not found!');
        }
        
        // Also close modal when clicking the X button
        const closeXBtn = modal.querySelector('.modal-close');
        if (closeXBtn) {
            console.log('Setting up X button handler');
            closeXBtn.onclick = () => {
                modal.classList.add('hidden');
                // Reset to cash payment if modal is closed
                this.selectPaymentMode('Cash');
            };
        } else {
            console.error('Modal close X button not found!');
        }
        
        console.log('UPI QR modal setup complete');
    }
    
    // Generate UPI QR code using labnol API
    generateUpiQrCode(upiId, amount) {
        console.log('generateUpiQrCode called with ID:', upiId, 'amount:', amount);
        const qrContainer = document.getElementById('upiQrCodeContainer');
        console.log('QR container found:', !!qrContainer);
        
        if (!qrContainer) {
            console.error('QR code container not found!');
            return;
        }
        
        try {
            // Create UPI payment URL with parameters
            // Format: upi://pay?pa=UPI_ID&pn=PAYEE_NAME&am=AMOUNT&cu=CURRENCY&tn=TRANSACTION_NOTE
            const payeeName = encodeURIComponent(
                window.settingsManager?.settings?.storeName || 'My Store'
            );
            const transactionNote = encodeURIComponent(`Bill Payment`);
            
            console.log('Payee name:', payeeName);
            
            // Construct UPI deep link
            const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
            console.log('Generated UPI URL:', upiUrl);
            
            // Using Labnol's approach for QR code generation with Google Chart API
            // This is more reliable and works across all devices
            const qrCodeUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(upiUrl)}`;
            console.log('QR Code URL:', qrCodeUrl);
            
            // Test the QR code URL directly
            console.log('Testing direct image URL:', qrCodeUrl);
            const testImg = new Image();
            let imageLoadSuccessful = false;
            
            testImg.onload = () => {
                console.log('QR code image loaded successfully');
                imageLoadSuccessful = true;
                
                // Add fallback options and enhanced display
                const htmlContent = `
                    <div class="flex flex-col items-center">
                        <img src="${qrCodeUrl}" alt="UPI QR Code" class="mx-auto block rounded shadow-lg" />
                        <div class="mt-3 text-sm text-center">
                            <div class="font-medium text-gray-700">₹${amount.toFixed(2)}</div>
                            <div class="text-xs text-gray-500 mt-1">Scan to pay securely</div>
                        </div>
                    </div>
                `;
                
                qrContainer.innerHTML = htmlContent;
                console.log('QR code HTML updated successfully');
            };
            
            testImg.onerror = () => {
                console.error('QR code image failed to load, falling back to alternative method');
                this.generateFallbackQrCode(upiId, amount);
            };
            
            // Set a timeout to detect slow loading or hanging requests
            const timeoutId = setTimeout(() => {
                if (!imageLoadSuccessful) {
                    console.warn('QR code image load timed out, falling back to alternative method');
                    this.generateFallbackQrCode(upiId, amount);
                }
            }, 3000);
            
            // Start loading test
            testImg.src = qrCodeUrl;
            
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.generateFallbackQrCode(upiId, amount);
        }
    }

    // Add a fallback QR code generator using QR Server
    generateFallbackQrCode(upiId, amount) {
        console.log('Using fallback QR code generator');
        const qrContainer = document.getElementById('upiQrCodeContainer');
        if (!qrContainer) {
            console.error('QR container not found in fallback generator');
            return;
        }
        
        try {
            // Create UPI payment URL
            const payeeName = encodeURIComponent(
                window.settingsManager?.settings?.storeName || 'My Store'
            );
            const transactionNote = encodeURIComponent(`Bill Payment`);
            const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amount.toFixed(2)}&cu=INR&tn=${transactionNote}`;
            
            // Use QR Server API as fallback
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUrl)}`;
            
            // Update the container with the fallback QR code
            qrContainer.innerHTML = `
                <div class="flex flex-col items-center">
                    <img src="${qrImageUrl}" alt="UPI QR Code" class="mx-auto block rounded shadow-lg" />
                    <div class="mt-3 text-sm text-center">
                        <div class="font-medium text-gray-700">₹${amount.toFixed(2)}</div>
                        <div class="text-xs text-gray-500 mt-1">Scan to pay securely</div>
                    </div>
                </div>
            `;
            
            console.log('Fallback QR code generated successfully');
        } catch (error) {
            console.error('Error generating fallback QR code:', error);
            qrContainer.innerHTML = `
                <div class="text-center p-4 border border-red-200 rounded-lg bg-red-50">
                    <p class="text-red-500 font-medium mb-2">QR code generation failed</p>
                    <p class="text-sm text-gray-600">Please try again or use a different payment method.</p>
                </div>
            `;
        }
    }

    showCashPaymentDialog() {
        try {
            // Get the bill total
            const billTotal = this.calculateTotal();
            
            // Round to the nearest integer
            const roundedTotal = Math.round(billTotal);
            
            console.log('Opening cash dialog with total:', roundedTotal);
            
            // Create a stylish dialog element
            const dialog = document.createElement('div');
            dialog.id = 'cashPaymentDialog';
            dialog.className = 'fixed inset-0 flex items-center justify-center z-50';
            dialog.innerHTML = `
                <div class="fixed inset-0 bg-black opacity-50"></div>
                <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative z-10 transform transition-all">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-800">💰 Cash Payment</h3>
                        <button type="button" id="closeCashDialog" class="text-gray-400 hover:text-gray-500">
                            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="mb-6">
                        <div class="bg-blue-50 p-4 rounded-lg mb-4">
                            <div class="text-sm text-blue-600 mb-1">Bill Total:</div>
                            <div class="text-3xl font-bold text-blue-800">₹${roundedTotal.toFixed(2)}</div>
                        </div>
                        
                        <div class="mb-4">
                            <label class="block text-gray-700 text-sm font-bold mb-2" for="cashReceived">
                                Amount Received:
                            </label>
                            <input type="number" id="cashReceived" 
                                class="appearance-none border-2 border-blue-300 rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:border-blue-500 text-xl"
                                value="${roundedTotal.toFixed(2)}" min="${roundedTotal}" step="1">
                        </div>
                        
                        <div id="changeContainer" class="bg-green-50 p-4 rounded-lg mb-4">
                            <div class="text-sm text-green-600 mb-1">Change:</div>
                            <div id="changeAmount" class="text-3xl font-bold text-green-700" style="min-height: 2.5rem;">₹0.00</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-end">
                        <button type="button" id="cancelCashPayment" 
                            class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg mr-2 hover:bg-gray-300 transition-colors">
                            Cancel
                        </button>
                        <button type="button" id="confirmCashPayment" 
                            class="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Confirm Payment
                        </button>
                    </div>
                </div>
            `;

            // Add to the document
            document.body.appendChild(dialog);

            // Set up event listeners
            document.getElementById('closeCashDialog').addEventListener('click', () => this.closeCashDialog());
            document.getElementById('cancelCashPayment').addEventListener('click', () => this.closeCashDialog());
            
            const cashReceived = document.getElementById('cashReceived');
            const changeContainer = document.getElementById('changeContainer');
            const changeAmount = document.getElementById('changeAmount');
            
            // Make sure these elements exist
            if (!cashReceived || !changeContainer || !changeAmount) {
                console.error('Cash dialog elements not found!');
                return false;
            }
            
            // Function to update change display
            const updateChangeDisplay = () => {
                const receivedValue = cashReceived.value;
                const received = parseFloat(receivedValue) || 0;
                const change = received - roundedTotal;
                
                console.log('Updating change display:', {
                    receivedValue,
                    received,
                    roundedTotal,
                    change
                });
                
                // Display change (force to zero if negative)
                const displayChange = change >= 0 ? change : 0;
                
                // DIRECT DOM UPDATE: Force change amount display with multiple methods
                try {
                    // Try every possible way to update the text
                    const formattedChange = `₹${displayChange.toFixed(2)}`;
                    console.log('Setting change display to:', formattedChange);
                    
                    // Method 1: Direct textContent
                    changeAmount.textContent = formattedChange;
                    
                    // Method 2: innerHTML as backup
                    changeAmount.innerHTML = formattedChange;
                    
                    // Method 3: Add a timestamp to bypass any caching
                    setTimeout(() => {
                        console.log('Refreshing change display after delay');
                        changeAmount.innerHTML = formattedChange;
                        
                        // Verify the update worked
                        console.log('Current DOM value:', changeAmount.textContent);
                    }, 50);
                } catch (e) {
                    console.error('Error updating change amount:', e);
                }
                
                // Change colors based on value
                if (change > 0) {
                    changeContainer.className = 'bg-green-50 p-4 rounded-lg mb-4';
                    changeAmount.className = 'text-3xl font-bold text-green-700';
                } else if (change === 0) {
                    changeContainer.className = 'bg-blue-50 p-4 rounded-lg mb-4';
                    changeAmount.className = 'text-3xl font-bold text-blue-700';
                } else {
                    changeContainer.className = 'bg-red-50 p-4 rounded-lg mb-4';
                    changeAmount.className = 'text-3xl font-bold text-red-700';
                }
            };
            
            // Add event listeners for input changes
            cashReceived.addEventListener('input', updateChangeDisplay);
            cashReceived.addEventListener('change', updateChangeDisplay);
            
            // Focus and select the input field
            cashReceived.focus();
            cashReceived.select();
            
            // Initial update
            setTimeout(updateChangeDisplay, 100);
            
            // Add a radical approach to add/replace the change container
            setTimeout(() => {
                try {
                    // Replace the original change container completely
                    const backupContainer = document.createElement('div');
                    backupContainer.id = 'newChangeContainer';
                    backupContainer.className = 'bg-green-50 p-4 rounded-lg mb-4 mt-2 border border-green-200';
                    backupContainer.innerHTML = `
                        <div class="text-sm text-green-600 mb-1">Change Amount:</div>
                        <div id="backupChangeAmount" class="text-3xl font-bold text-green-700">₹0.00</div>
                    `;
                    
                    // Replace the original container
                    if (changeContainer && changeContainer.parentElement) {
                        changeContainer.parentElement.replaceChild(backupContainer, changeContainer);
                        
                        // Create a clean function to update the display
                        const updateChangeAmount = () => {
                            const received = parseFloat(cashReceived.value) || 0;
                            const change = received - roundedTotal;
                            const displayChange = change >= 0 ? change : 0;
                            const formattedChange = `₹${displayChange.toFixed(2)}`;
                            
                            // Update the display
                            const displayEl = document.getElementById('backupChangeAmount');
                            if (displayEl) {
                                displayEl.textContent = formattedChange;
                                
                                // Style based on amount
                                const containerEl = document.getElementById('newChangeContainer');
                                if (containerEl) {
                                    if (change > 0) {
                                        containerEl.className = 'bg-green-50 p-4 rounded-lg mb-4 mt-2 border border-green-200';
                                        displayEl.className = 'text-3xl font-bold text-green-700';
                                    } else if (change === 0) {
                                        containerEl.className = 'bg-blue-50 p-4 rounded-lg mb-4 mt-2 border border-blue-200';
                                        displayEl.className = 'text-3xl font-bold text-blue-700';
                                    } else {
                                        containerEl.className = 'bg-red-50 p-4 rounded-lg mb-4 mt-2 border border-red-200';
                                        displayEl.className = 'text-3xl font-bold text-red-700';
                                    }
                                }
                            }
                        };
                        
                        // Add multiple event listeners for maximum reliability
                        cashReceived.oninput = updateChangeAmount;
                        cashReceived.onchange = updateChangeAmount;
                        cashReceived.onkeyup = updateChangeAmount;
                        
                        // Initial update
                        updateChangeAmount();
                        
                        // Also update periodically just to be safe
                        const updateInterval = setInterval(updateChangeAmount, 500);
                        
                        // Clear interval when dialog is closed
                        document.getElementById('closeCashDialog').addEventListener('click', () => {
                            clearInterval(updateInterval);
                        });
                        document.getElementById('cancelCashPayment').addEventListener('click', () => {
                            clearInterval(updateInterval);
                        });
                        document.getElementById('confirmCashPayment').addEventListener('click', () => {
                            clearInterval(updateInterval);
                        });
                    }
                } catch (e) {
                    console.error('Error setting up new change display:', e);
                }
            }, 100);
            
            // Handle the confirm button
            document.getElementById('confirmCashPayment').addEventListener('click', () => {
                const received = parseFloat(cashReceived.value) || 0;
                
                if (received < roundedTotal) {
                    alert('Amount received must be at least equal to the bill total.');
                    return;
                }

                const change = received - roundedTotal;
                
                // Log payment details for verification
                console.log('Payment details:', {
                    billTotal: billTotal,
                    roundedTotal: roundedTotal,
                    received: received,
                    change: change
                });
                
                // Store payment details
                this.cashDetails = {
                    originalAmount: billTotal,
                    roundedAmount: roundedTotal,
                    received: received,
                    change: change
                };
                
                console.log('Cash payment details stored:', this.cashDetails);

                // Close the dialog
                this.closeCashDialog();
                
                // Generate the bill and get the bill ID
                const billId = this.generateBill();
                
                // Print the bill if generation was successful
                if (billId) {
                    console.log('Bill generated, now printing bill:', billId);
                    setTimeout(() => this.printBill(billId), 300);
                } else {
                    console.error('Failed to generate bill, cannot print');
                }
            });
            
            return true;
        } catch (error) {
            console.error('Error showing cash payment dialog:', error);
            alert('An error occurred. Please try again.');
            return false;
        }
    }

    // Method to close the dialog
    closeCashDialog() {
        const dialog = document.getElementById('cashPaymentDialog');
        if (dialog) {
            dialog.classList.add('opacity-0');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        }
    }

    // Helper method to calculate the total
    calculateTotal() {
        return this.currentBill.reduce((total, item) => {
            const itemTotal = parseFloat(item.total) || 0;
            return total + itemTotal;
        }, 0);
    }

    showPastBills() {
        const modal = document.getElementById('pastBillsModal');
        const tbody = document.getElementById('pastBillsList');
        
        if (!modal || !tbody) {
            console.error('Past bills modal elements not found');
            return;
        }
        
        modal.classList.remove('hidden');
        
        try {
        // Get bills from localStorage
        const bills = JSON.parse(localStorage.getItem('bills') || '[]');
        
        // Sort bills by date (newest first)
        bills.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Get current GST settings
            const applyGST = window.settingsManager?.settings?.applyGST ?? true;
            
            if (bills.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="p-4 text-center text-gray-500">No bills found</td>
                    </tr>
                `;
                return;
            }
        
        tbody.innerHTML = bills.map(bill => {
            const date = new Date(bill.timestamp).toLocaleString();
                
                // Update hasGST property based on current settings for viewing
                if (bill.gst) {
                    bill.gst.hasGST = (bill.gst.totalCGST > 0 || bill.gst.totalSGST > 0) && applyGST;
                }
                
            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-2">${bill.billNumber}</td>
                    <td class="p-2">${date}</td>
                        <td class="p-2 text-right">₹${bill.gst?.totalWithGST?.toFixed(2) || bill.total.toFixed(2)}</td>
                    <td class="p-2 text-center">${bill.paymentMode}</td>
                    <td class="p-2 text-center">
                        <button onclick="billingSystem.reprintBill('${bill.billNumber}')" 
                            class="text-blue-500 hover:text-blue-700 mr-2">
                            <i class="fas fa-print"></i>
                        </button>
                        <button onclick="billingSystem.viewBillDetails('${bill.billNumber}')"
                            class="text-green-500 hover:text-green-700">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
            }).join('');
        } catch (error) {
            console.error('Error displaying past bills:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-4 text-center text-red-500">Error loading bills. Please try again.</td>
                </tr>
            `;
        }
    }

    reprintBill(billNumber) {
        try {
            console.log('Reprinting bill number:', billNumber);
            
            // Find the bill with this number
            const bill = billManager.bills.find(b => b.billNumber === billNumber);
            
            if (!bill) {
                console.error('Bill not found for reprinting:', billNumber);
                alert('Bill not found');
                return;
            }
            
            console.log('Found bill for reprinting:', bill.id);
            
            // Print the bill directly
            billManager.fastPrintBill(bill.id);
        } catch (error) {
            console.error('Error reprinting bill:', error);
            alert('Error reprinting bill. Please try again.');
        }
    }

    viewBillDetails(billNumber) {
        try {
            console.log('Viewing details for bill:', billNumber);
            
            // Find the bill by bill number
            const bill = billManager.bills.find(b => b.billNumber === billNumber || b.id === billNumber);
        
        if (!bill) {
                console.error('Bill not found:', billNumber);
            alert('Bill not found');
            return;
        }
        
            // Get current settings
            const settings = window.settingsManager?.settings || {};
            
            // Create a more structured display for better readability with many items
            let detailsHtml = `
            <div style="font-family: monospace; white-space: pre-wrap; max-height: 70vh; overflow-y: auto; padding: 10px;">
                <h3 style="text-align: center; margin: 0; padding: 5px; background: #f0f0f0;">BILL DETAILS</h3>
                <div style="margin: 10px 0; padding: 5px; border-bottom: 1px solid #ccc;">
                    <strong>Bill Number:</strong> ${bill.billNumber || bill.id}<br>
                    <strong>Date:</strong> ${new Date(bill.timestamp).toLocaleString()}<br>
                    <strong>Cashier:</strong> ${bill.cashierName || 'Unknown'}<br>
                    <strong>Payment Mode:</strong> ${bill.paymentMode || 'Cash'}
                </div>
                
                <h3 style="margin: 5px 0;">ITEMS</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr style="background: #f0f0f0;">
                        <th style="text-align: left; padding: 5px; border-bottom: 1px solid #ccc;">#</th>
                        <th style="text-align: left; padding: 5px; border-bottom: 1px solid #ccc;">Item</th>
                        <th style="text-align: right; padding: 5px; border-bottom: 1px solid #ccc;">Rate</th>
                        <th style="text-align: right; padding: 5px; border-bottom: 1px solid #ccc;">Qty</th>
                        <th style="text-align: right; padding: 5px; border-bottom: 1px solid #ccc;">Total</th>
                    </tr>`;
            
            // Loop through all items and add them to the table
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach((item, index) => {
                    // Format quantity/weight display
                    const qtyDisplay = item.isWeighted ? 
                        (item.weight >= 1 ? item.weight.toFixed(3) + ' kg' : (item.weight * 1000).toFixed(1) + ' g') : 
                        item.quantity;
                    
                    // Rate format
                    const rateDisplay = `₹${item.rate?.toFixed(2) || '0.00'}${item.isWeighted ? '/kg' : ''}`;
                    
                    detailsHtml += `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 5px;">${index + 1}</td>
                        <td style="padding: 5px;">${item.name}</td>
                        <td style="padding: 5px; text-align: right;">${rateDisplay}</td>
                        <td style="padding: 5px; text-align: right;">${qtyDisplay}</td>
                        <td style="padding: 5px; text-align: right;">₹${item.total?.toFixed(2) || '0.00'}</td>
                    </tr>`;
                });
            } else {
                detailsHtml += `
                <tr>
                    <td colspan="5" style="padding: 10px; text-align: center; color: #999;">No items found in this bill</td>
                </tr>`;
            }
            
            // Close the items table
            detailsHtml += `</table>`;
            
            // Add payment details if available
            if (bill.paymentMode === 'Cash' && bill.cashDetails) {
                detailsHtml += `
                <div style="margin: 10px 0; padding: 10px; background: #f9f9f9; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc;">
                    <h3 style="margin: 0 0 5px 0;">PAYMENT DETAILS</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td>Original Amount:</td>
                            <td style="text-align: right;">₹${bill.cashDetails.originalAmount?.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr>
                            <td>Rounded Amount:</td>
                            <td style="text-align: right;">₹${bill.cashDetails.roundedAmount?.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr>
                            <td>Amount Received:</td>
                            <td style="text-align: right;">₹${bill.cashDetails.received?.toFixed(2) || '0.00'}</td>
                        </tr>
                        <tr>
                            <td>Change Given:</td>
                            <td style="text-align: right;">₹${bill.cashDetails.change?.toFixed(2) || '0.00'}</td>
                        </tr>
                    </table>
                </div>`;
            }
            
            // Add bill total
            detailsHtml += `
            <div style="margin: 10px 0; padding: 10px; background: #f0f0f0; font-weight: bold; text-align: right;">
                Total Amount: ₹${(bill.total || 0).toFixed(2)}
            </div>`;
            
            // Close the main container
            detailsHtml += `</div>`;
            
            // Show the formatted details in a div with basic styling
            const detailsContainer = document.createElement('div');
            detailsContainer.style.position = 'fixed';
            detailsContainer.style.top = '0';
            detailsContainer.style.left = '0';
            detailsContainer.style.right = '0';
            detailsContainer.style.bottom = '0';
            detailsContainer.style.background = 'rgba(0,0,0,0.5)';
            detailsContainer.style.zIndex = '9999';
            detailsContainer.style.display = 'flex';
            detailsContainer.style.justifyContent = 'center';
            detailsContainer.style.alignItems = 'center';
            
            const detailsContent = document.createElement('div');
            detailsContent.style.background = 'white';
            detailsContent.style.borderRadius = '5px';
            detailsContent.style.maxWidth = '800px';
            detailsContent.style.width = '90%';
            detailsContent.style.maxHeight = '90vh';
            detailsContent.style.overflow = 'auto';
            detailsContent.style.position = 'relative';
            detailsContent.innerHTML = detailsHtml;
            
            // Add a close button
            const closeButton = document.createElement('button');
            closeButton.innerText = '×';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '10px';
            closeButton.style.right = '10px';
            closeButton.style.background = '#f44336';
            closeButton.style.color = 'white';
            closeButton.style.border = 'none';
            closeButton.style.borderRadius = '50%';
            closeButton.style.width = '30px';
            closeButton.style.height = '30px';
            closeButton.style.fontSize = '20px';
            closeButton.style.cursor = 'pointer';
            closeButton.onclick = () => document.body.removeChild(detailsContainer);
            
            detailsContent.appendChild(closeButton);
            detailsContainer.appendChild(detailsContent);
            document.body.appendChild(detailsContainer);
            
        } catch (error) {
            console.error('Error displaying bill details:', error);
            alert('Error displaying bill details. Please try again.');
        }
    }

    // Add a new method to handle new bill creation
    startNewBill() {
        this.clearBill();
        this.showBillingModal();
    }

    // Add this debugging function
    debugBillId() {
        console.log('Current Bill ID:', this.currentBillId);
        console.log('Has bill items:', this.currentBill.length > 0);
        
        if (this.currentBillId) {
            const bill = billManager.bills.find(b => b.id === this.currentBillId);
            console.log('Bill found in billManager:', !!bill);
        } else {
            console.log('No current bill ID set');
        }
    }

    // Add this new method to ensure complete clearing of bill data
    clearCurrentBillData() {
        console.log('Clearing current bill data...');
        
        // Reset all bill-related data
        this.currentBill = [];
        this.currentBillId = null;
        this.selectedPaymentMode = 'Cash';
        this.cashDetails = null;
        
        // Update the display
        this.updateBillDisplay();
        
        // Reset form elements
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.value = '';
        
        // Reset payment mode buttons
        this.updatePaymentModeButtons('Cash');
        
        console.log('Bill data cleared successfully');
    }

    // Add the missing _generateBillNumber function to BillingSystem class
    _generateBillNumber() {
        // Get the current date in YYYYMMDD format
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Get reference to billManager from window if not directly accessible
        const billManagerRef = typeof billManager !== 'undefined' ? billManager : window.billManager;
        
        if (!billManagerRef) {
            console.error('Bill manager not found, using fallback sequence');
            // Fallback to random sequence if billManager isn't available
            const randomSequence = Math.floor(Math.random() * 999).toString().padStart(3, '0');
            return `${dateStr}-${randomSequence}`;
        }
        
        // Count how many bills we have today to create a sequence number
        const todayBills = billManagerRef.bills.filter(bill => {
            if (!bill.timestamp) return false;
            const billDate = new Date(bill.timestamp);
            return billDate.toDateString() === now.toDateString();
        });
        
        // Create a sequence number, starting with 1 for the first bill of the day
        const sequence = (todayBills.length + 1).toString().padStart(3, '0');
        
        // Create the bill number in format YYYYMMDD-001, YYYYMMDD-002, etc.
        return `${dateStr}-${sequence}`;
    }

    // Helper method to update payment mode buttons
    updatePaymentModeButtons(selectedMode) {
        // Update the UI to reflect the selected payment mode
        const paymentBtns = document.querySelectorAll('.payment-mode-btn');
        paymentBtns.forEach(btn => {
            const btnMode = btn.getAttribute('data-mode');
            if (btnMode && btnMode.toLowerCase() === selectedMode.toLowerCase()) {
                // Selected button - add blue background and white text
                btn.classList.add('bg-blue-500', 'text-white');
                btn.classList.remove('hover:bg-gray-100');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
                } else {
                // Unselected buttons - restore original styling
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('hover:bg-gray-100');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
            }
        });
    }

    // Add a new method to clear bill items but preserve the currentBillId
    clearBillItemsOnly() {
        console.log('Clearing bill items but preserving bill ID...');
        
        // Clear items array but NOT currentBillId
        this.currentBill = [];
        
        // Reset payment mode
        this.selectedPaymentMode = 'Cash';
        this.cashDetails = null;
        
        // Update the display
        this.updateBillDisplay();
        
        // Reset barcode input
        const barcodeInput = document.getElementById('barcodeInput');
        if (barcodeInput) barcodeInput.value = '';
        
        // Reset payment mode buttons
        this.updatePaymentModeButtons('Cash');
        
        console.log('Bill items cleared successfully, preserved billId:', this.currentBillId);
    }

    resetBillingModal() {
        console.log("Resetting billing modal - BEGIN");
        
        try {
            // Clear bill items
            const billItems = document.getElementById('billItems');
            if (billItems) {
                billItems.innerHTML = '';
                console.log("Bill items cleared");
            }
            
            // Reset bill total
            const billTotal = document.getElementById('billTotal');
            if (billTotal) {
                billTotal.textContent = '₹0.00';
                console.log("Bill total reset");
            }
            
            // Clear barcode input
            const barcodeInput = document.getElementById('barcodeInput');
            if (barcodeInput) {
                barcodeInput.value = '';
                console.log("Barcode input cleared");
            }
            
            // Reset payment mode selection
            const paymentBtns = document.querySelectorAll('.payment-mode-btn');
            paymentBtns.forEach(btn => {
                btn.classList.remove('bg-blue-500', 'text-white');
                btn.classList.add('hover:bg-gray-100');
                console.log("Payment buttons reset");
            });
            
            // Reset cash button as default
            const cashBtn = document.querySelector('[data-mode="cash"]');
            if (cashBtn) {
                cashBtn.classList.add('bg-blue-500', 'text-white');
                cashBtn.classList.remove('hover:bg-gray-100');
            }
            
            // Clear current bill data
            this.currentBill = [];
            this.currentBillId = null;
            this.selectedPaymentMode = 'Cash';
            this.cashDetails = null;
            
            console.log("Current bill data reset");
            
            // Force billing modal to hide again just to be sure
            const billingModal = document.getElementById('billingModal');
            if (billingModal) {
                billingModal.classList.add('hidden');
                console.log("Billing modal hidden");
            }
            
        } catch (error) {
            console.error("Error in resetBillingModal:", error);
        }
        
        console.log("Resetting billing modal - COMPLETE");
    }
}

// Keep only this initialization
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing billing system...');
    window.billingSystem = new BillingSystem();
}); 