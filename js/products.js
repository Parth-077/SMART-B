class ProductManager {
    constructor() {
        console.log('ProductManager initializing...');
        this.products = this.loadProducts() || [];
        this.cleanupProducts();
        console.log('Loaded products:', this.products);
        this.setupEventListeners();
        console.log('ProductManager initialization complete');
    }

    loadProducts() {
        try {
            const savedProducts = localStorage.getItem('products');
            console.log('Loading from localStorage:', savedProducts);
            return savedProducts ? JSON.parse(savedProducts) : [];
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    }

    saveProducts() {
        try {
            localStorage.setItem('products', JSON.stringify(this.products));
            console.log('Saved to localStorage:', this.products);
        } catch (error) {
            console.error('Error saving products:', error);
        }
    }

    setupEventListeners() {
        // Add Product button - using a more reliable selector
        const addProductBtn = Array.from(document.querySelectorAll('button')).find(
            button => button.querySelector('div')?.textContent.trim() === 'Add Product'
        );
        addProductBtn?.addEventListener('click', () => {
            const form = document.getElementById('productForm');
            if (form) {
                form.reset();
                form.dataset.editId = '';  // Clear any existing edit ID
            }
            this.showProductModal();
        });

        // Product form submission
        const productForm = document.getElementById('productForm');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProductSubmit(e);
            });
        }

        // Save button click handler
        const saveButton = document.getElementById('saveProduct');
        if (saveButton) {
            saveButton.addEventListener('click', (e) => {
                e.preventDefault();
                const form = document.getElementById('productForm');
                if (form) {
                    const submitEvent = new Event('submit', {
                        bubbles: true,
                        cancelable: true,
                    });
                    form.dispatchEvent(submitEvent);
                }
            });
        }

        // Product List button - using a more reliable selector
        const productListBtn = Array.from(document.querySelectorAll('button')).find(
            button => button.querySelector('div')?.textContent.trim() === 'Product List'
        );
        productListBtn?.addEventListener('click', () => this.showProductList());

        // Add modal close functionality
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                if (modal) modal.classList.add('hidden');
            });
        });

        // Product search functionality
        const searchInput = document.getElementById('productSearch');
        searchInput?.addEventListener('input', (e) => this.handleProductSearch(e.target.value));

        // Add discount type change handler
        const discountTypeSelect = document.getElementById('discountType');
        const discountInput = document.getElementById('discount');
        const discountSymbol = document.getElementById('discountSymbol');
        const discountError = document.getElementById('discountError');
        const mrpInput = document.getElementById('mrp');
        
        if (discountTypeSelect && discountInput && mrpInput && discountSymbol && discountError) {
            const showError = (message) => {
                discountError.textContent = message;
                discountError.classList.remove('hidden');
            };

            const hideError = () => {
                discountError.classList.add('hidden');
            };

            const formatDiscount = (value, type, mrp) => {
                // Remove any non-numeric characters except decimal point
                value = value.replace(/[^\d.]/g, '');
                
                // Handle empty or invalid input
                if (!value || value === '' || value === '.') {
                    return '0';
                }
                
                // Parse the value
                let numValue = parseFloat(value);
                if (isNaN(numValue)) {
                    return '0';
                }
                
                // Apply limits based on type
                if (type === 'percentage') {
                    if (numValue > 100) {
                        showError('Discount percentage cannot exceed 100%');
                        numValue = 100;
                    } else {
                        hideError();
                    }
                } else {
                    if (numValue > mrp) {
                        showError('Discount amount cannot exceed MRP');
                        numValue = mrp;
                    } else {
                        hideError();
                    }
                }
                
                // Format number: keep integers as is, format decimals to 2 places
                return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(2);
            };

            // Handle discount type change
            discountTypeSelect.addEventListener('change', (e) => {
                const type = e.target.value;
                const currentValue = discountInput.value;
                const mrp = parseFloat(mrpInput.value) || 0;
                
                discountSymbol.textContent = type === 'percentage' ? '%' : '₹';
                
                if (currentValue && currentValue !== '0') {
                    const value = parseFloat(currentValue);
                    if (!isNaN(value)) {
                        if (type === 'percentage') {
                            // Convert amount to percentage
                            const percentage = (value / mrp) * 100;
                            discountInput.value = formatDiscount(percentage.toString(), type, mrp);
                        } else {
                            // Convert percentage to amount
                            const amount = (value / 100) * mrp;
                            discountInput.value = formatDiscount(amount.toString(), type, mrp);
                        }
                    }
                }
            });

            // Handle MRP changes
            mrpInput.addEventListener('input', () => {
                const type = discountTypeSelect.value;
                const currentValue = discountInput.value;
                const mrp = parseFloat(mrpInput.value) || 0;
                
                if (currentValue && currentValue !== '0') {
                    discountInput.value = formatDiscount(currentValue, type, mrp);
                }
            });

            // Handle discount input
            let typingTimer;
            discountInput.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Allow empty input and single decimal point while typing
                if (value === '' || value === '.') {
                    return;
                }
                
                // Clear any existing timer
                clearTimeout(typingTimer);
                
                // Set a new timer to format after user stops typing
                typingTimer = setTimeout(() => {
                    const type = discountTypeSelect.value;
                    const mrp = parseFloat(mrpInput.value) || 0;
                    e.target.value = formatDiscount(value, type, mrp);
                }, 500);
            });

            // Handle discount input blur
            discountInput.addEventListener('blur', (e) => {
                clearTimeout(typingTimer);
                const type = discountTypeSelect.value;
                const mrp = parseFloat(mrpInput.value) || 0;
                e.target.value = formatDiscount(e.target.value, type, mrp);
            });
        }

        // Add form reset handler
        document.getElementById('productForm')?.addEventListener('reset', () => {
            setTimeout(() => {
                if (discountInput) discountInput.value = '0';
                if (discountTypeSelect) discountTypeSelect.value = 'percentage';
                if (discountSymbol) discountSymbol.textContent = '%';
                if (discountError) discountError.classList.add('hidden');
            }, 0);
        });

        // Add product type change handler
        const productTypeSelect = document.getElementById('productType');
        const stockInput = document.getElementById('stock');
        const mrpLabel = document.querySelector('label[for="mrp"]');
        const stockLabel = document.querySelector('label[for="stock"]');

        if (productTypeSelect) {
            productTypeSelect.addEventListener('change', (e) => {
                const isWeighted = e.target.value === 'weight';
                if (isWeighted) {
                    mrpLabel.textContent = 'MRP (per kg)';
                    stockLabel.textContent = 'Stock (in kg)';
                    stockInput.step = '0.001';
                } else {
                    mrpLabel.textContent = 'MRP';
                    stockLabel.textContent = 'Stock Quantity';
                    stockInput.step = '1';
                }
            });
        }
    }

    showProductModal() {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        
        if (form) {
            // Reset form completely
            form.reset();
            form.dataset.editId = '';  // Clear any existing edit ID
            
            // Reset all form fields to default values
            form.elements['productName'].value = '';
            const barcodeInput = document.getElementById('productBarcode');
            if (barcodeInput) barcodeInput.value = '';
            form.elements['mrp'].value = '0';
            form.elements['stock'].value = '0';
            form.elements['productType'].value = 'unit';
            form.elements['category'].value = '';
            
            // Reset discount related fields
            const discountInput = form.querySelector('#discount');
            const discountTypeSelect = form.querySelector('#discountType');
            const discountSymbol = form.querySelector('#discountSymbol');
            
            if (discountInput) discountInput.value = '0';
            if (discountTypeSelect) discountTypeSelect.value = 'percentage';
            if (discountSymbol) discountSymbol.textContent = '%';
            
            // Reset stock input step
            form.elements['stock'].step = '1';
        }
        
        modal.classList.remove('hidden');
    }

    handleProductSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        // Check if we're editing or creating new
        const isEditing = form.hasAttribute('data-editing');
        const editId = form.getAttribute('data-edit-id');

        // Get barcode from new input ID
        const barcodeInput = document.getElementById('productBarcode');
        const barcode = barcodeInput ? barcodeInput.value : '';

        const productData = {
            id: isEditing ? editId : Date.now().toString(),
            name: form.elements['productName'].value,
            barcode: barcode,
            mrp: parseFloat(form.elements['mrp'].value) || 0,
            stock: parseFloat(form.elements['stock'].value) || 0,
            productType: form.elements['productType'].value,
            isWeighted: form.elements['productType'].value === 'weight',
            stockUnit: form.elements['stockUnit'].value,
            discountType: form.elements['discountType'].value,
            discount: parseFloat(form.elements['discount'].value) || 0,
            category: form.elements['category'].value,
            gstRate: parseFloat(form.elements['gstRate'].value) || 0
        };

        if (isEditing) {
            // Update existing product
            const index = this.products.findIndex(p => p.id.toString() === editId.toString());
            if (index !== -1) {
                this.products[index] = productData;
            }
        } else {
            // Add new product
            this.products.push(productData);
        }

        // Save changes
        this.saveProducts();

        // Update displays
        this.updateProductList();
        if (window.inventoryManager) {
            window.inventoryManager.updateInventoryDisplay();
        }

        // Reset form and close modal
        form.removeAttribute('data-editing');
        form.removeAttribute('data-edit-id');
        form.reset();
        document.getElementById('productModal').style.display = 'none';

        // Show success message
        alert(isEditing ? 'Product updated successfully!' : 'Product added successfully!');
    }

    parseDiscountValue(value) {
        if (!value || value === '') return 0;
        // Remove any non-numeric characters except decimal point
        value = value.replace(/[^\d.]/g, '');
        // Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    }

    handleProductEdit(e, editId) {
        console.log('Handling product edit for ID:', editId);
        e.preventDefault();
        
        const form = e.target;
        console.log('Form data:', {
            editId,
            formEditId: form.dataset.editId,
            name: form.elements['productName']?.value
        });
        
        // Get form values directly from elements
        const updatedProduct = {
            id: editId.toString(),
            name: form.elements['productName']?.value || '',
            barcode: form.elements['barcode']?.value || '',
            mrp: parseFloat(form.elements['mrp']?.value) || 0,
            stock: parseFloat(form.elements['stock']?.value) || 0,
            productType: form.elements['productType']?.value || 'unit',
            isWeighted: form.elements['productType']?.value === 'weight',
            stockUnit: form.elements['productType']?.value === 'weight' ? 'kg' : 'unit',
            discountType: form.elements['discountType']?.value || 'percentage',
            discount: this.parseDiscountValue(form.elements['discount']?.value),
            category: form.elements['category']?.value || '',
            gstRate: parseFloat(form.elements['gstRate']?.value) || 0
        };

        console.log('Updated product data:', updatedProduct);

        // Find and update the existing product
        const index = this.products.findIndex(p => p.id.toString() === editId.toString());
        console.log('Found product at index:', index);
        
        if (index !== -1) {
            this.products[index] = updatedProduct;
            this.saveProducts();
            
            // Reset form and close modal
            form.reset();
            form.dataset.editId = '';
            
            document.getElementById('productModal').classList.add('hidden');
            document.getElementById('productListModal').classList.remove('hidden');
            
            // Update displays
            this.updateProductList();
            if (window.inventoryManager) {
                window.inventoryManager.updateInventoryDisplay();
            }
            
            alert('Product updated successfully!');
        } else {
            console.error('Product not found for editing:', editId);
            alert('Error updating product. Product not found!');
        }
    }

    showProductList() {
        const modal = document.getElementById('productListModal');
        modal.classList.remove('hidden');
        this.updateProductList();
    }

    updateProductList(searchTerm = '') {
        console.log('Updating product list, current products:', this.products);
        const tbody = document.getElementById('productListItems');
        if (!tbody) {
            console.error('Product list table body not found');
            return;
        }
        
        tbody.innerHTML = '';
        
        // Add null check for products array
        if (!Array.isArray(this.products)) {
            console.error('Products is not an array:', this.products);
            this.products = [];
            return;
        }
        
        // Filter products without modifying the original array
        const filteredProducts = this.products.filter(product => {
            if (!product || (!product.name && !product.productName)) {
                console.error('Invalid product:', product);
                return false;
            }
            const searchLower = (searchTerm || '').toLowerCase();
            const nameLower = (product.name || product.productName || '').toLowerCase();
            const barcodeLower = (product.barcode || '').toLowerCase();
            return nameLower.includes(searchLower) || barcodeLower.includes(searchLower);
        });

        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-4 text-center text-gray-500">
                        No products found
                    </td>
                </tr>
            `;
            return;
        }

        filteredProducts.forEach(product => {
            const formattedStock = this.formatStock(product);
            const row = document.createElement('tr');
            row.className = 'border-b hover:bg-gray-50';
            
            // Add low-stock class if stock is low
            if (this.checkLowStock(product)) {
                row.classList.add('low-stock');
            }
            
            row.innerHTML = `
                <td class="p-2">${product.name || product.productName}</td>
                <td class="p-2 text-center">${product.barcode || '-'}</td>
                <td class="p-2 text-right">₹${(product.mrp || 0).toFixed(2)}${product.isWeighted ? '/kg' : ''}</td>
                <td class="p-2 text-center ${this.checkLowStock(product) ? 'text-red-600 font-bold' : ''}">${formattedStock}</td>
                <td class="p-2 text-center">
                    <button class="edit-product text-blue-500 hover:text-blue-700 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-product text-red-500 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            // Add event listeners to buttons
            const editBtn = row.querySelector('.edit-product');
            const deleteBtn = row.querySelector('.delete-product');
            
            editBtn.addEventListener('click', () => this.editProduct(product));
            deleteBtn.addEventListener('click', () => this.deleteProduct(product.id));
            
            tbody.appendChild(row);
        });
    }

    handleProductSearch(searchTerm) {
        this.updateProductList(searchTerm);
    }

    editProduct(product) {
        const form = document.getElementById('productForm');
        if (form) {
            // Set edit mode and store product ID
            form.setAttribute('data-editing', 'true');
            form.setAttribute('data-edit-id', product.id);
            
            // Fill form with product data
            form.elements['productName'].value = product.name || product.productName || '';
            
            // Fix: Set barcode value using the new ID
            const barcodeInput = document.getElementById('productBarcode');
            if (barcodeInput) barcodeInput.value = product.barcode || '';
            
            // Rest of the fields...
            form.elements['mrp'].value = product.mrp || 0;
            form.elements['discountType'].value = product.discountType || 'percentage';
            form.elements['discount'].value = product.discount || 0;
            form.elements['stock'].value = product.stock || 0;
            form.elements['stockUnit'].value = product.stockUnit || 'unit';
            form.elements['productType'].value = product.productType || 'unit';
            form.elements['category'].value = product.category || '';
            form.elements['gstRate'].value = product.gstRate || 0;

            // Special handling for discount symbol
            const discountSymbol = document.getElementById('discountSymbol');
            if (discountSymbol) {
                discountSymbol.textContent = product.discountType === 'percentage' ? '%' : '₹';
            }

            // Show the product modal
            const productModal = document.getElementById('productModal');
            if (productModal) {
                productModal.classList.remove('hidden');
            }
        }
    }

    deleteProduct(productId) {
        if (confirm('Are you sure you want to delete this product?')) {
            const index = this.products.findIndex(p => p.id.toString() === productId.toString());
            if (index !== -1) {
                this.products.splice(index, 1);
                this.saveProducts();
                this.updateProductList();
                if (window.inventoryManager) {
                    window.inventoryManager.showLowStockAlert(this.products[index]);
                }
                console.log('Product deleted successfully');
                return true;
            }
            console.error('Product not found for deletion:', productId);
        }
        return false;
    }

    calculateDiscountedPrice(product) {
        if (!product) return 0;
        
        // Get base price
        const basePrice = parseFloat(product.price || product.mrp || 0);
        
        // Get discount
        const discount = parseFloat(product.discount || 0);
        
        // Apply discount to base price
        const discountedPrice = Math.max(basePrice - discount, 0.01);
        
        return discountedPrice;
    }

    updateStock(productId, newStock) {
        const product = this.products.find(p => p.id.toString() === productId.toString());
        if (product) {
            product.stock = product.isWeighted ? parseFloat(newStock) : parseInt(newStock);
            this.saveProducts();
            
            // Get the current threshold from localStorage and settings
            const settings = window.settingsManager?.settings || {};
            const threshold = settings.lowStockThreshold || localStorage.getItem('lowStockThreshold') || 10;
            const lowStockThreshold = product.isWeighted ? 5 : parseFloat(threshold);
            
            // Check if stock is below threshold
            if (product.stock < lowStockThreshold) {
                // Show alert
                const alertMessage = `Low stock alert: ${product.name} has only ${this.formatStock(product)} remaining!`;
                alert(alertMessage);
                
                // Also notify inventory manager if it exists
                if (window.inventoryManager) {
                    window.inventoryManager.showLowStockAlert(product);
                }
            }
            
            this.updateProductList();
            if (window.inventoryManager) {
                window.inventoryManager.updateInventoryDisplay();
            }
            return true;
        }
        return false;
    }

    // Update checkLowStock method
    checkLowStock(product) {
        if (!product) return false;
        
        // Get threshold from settings or localStorage
        const settings = window.settingsManager?.settings || {};
        const threshold = settings.lowStockThreshold || localStorage.getItem('lowStockThreshold') || 10;
        const lowStockThreshold = product.isWeighted ? 5 : parseFloat(threshold);
        
        return product.stock < lowStockThreshold;
    }

    // Add these new helper methods
    convertToBaseUnit(value, unit) {
        switch (unit) {
            case 'g':
                return value / 1000; // Convert grams to kg
            case 'lb':
                return value * 0.45359237; // Convert pounds to kg
            case 'kg':
                return value;
            default:
                return value;
        }
    }

    convertFromBaseUnit(value, toUnit) {
        switch (toUnit) {
            case 'g':
                return value * 1000; // Convert kg to grams
            case 'lb':
                return value / 0.45359237; // Convert kg to pounds
            case 'kg':
                return value;
            default:
                return value;
        }
    }

    formatStock(product) {
        if (!product.isWeighted) {
            return Math.round(product.stock);
        }
        
        // Format weight based on the magnitude
        if (product.stock >= 1) {
            return `${product.stock.toFixed(3)} kg`;
        } else {
            return `${(product.stock * 1000).toFixed(1)} g`;
        }
    }

    addProduct(product) {
        this.products.push(product);
        this.saveProducts();
        return product;
    }

    updateProduct(productId, updatedProduct) {
        const index = this.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            this.products[index] = { ...this.products[index], ...updatedProduct };
            this.saveProducts();
            return true;
        }
        return false;
    }

    cleanupProducts() {
        // Load the threshold value
        const threshold = localStorage.getItem('lowStockThreshold') || 10;
        
        // Clean up and standardize the products array
        this.products = this.products
            .filter(p => p && (p.name || p.productName)) // Remove invalid products
            .map(p => ({
                id: p.id || Date.now().toString(),
                name: p.name || p.productName || '',
                barcode: p.barcode || '',
                mrp: parseFloat(p.mrp) || 0,
                stock: parseFloat(p.stock) || 0,
                productType: p.productType || 'unit',
                isWeighted: p.productType === 'weight',
                stockUnit: p.productType === 'weight' ? 'kg' : 'unit',
                discountType: p.discountType || 'percentage',
                discount: parseFloat(p.discount) || 0,
                category: p.category || '',
                lowStockThreshold: parseFloat(p.lowStockThreshold) || parseFloat(threshold),
                gstRate: parseFloat(p.gstRate) || 0
            }));
        this.saveProducts(); // Save the cleaned up products
    }

    handleDiscountTypeChange(select) {
        const symbol = select.value === 'percentage' ? '%' : '₹';
        document.getElementById('discountSymbol').textContent = symbol;
    }

    getProductByBarcode(barcode) {
        console.log('Searching for product with barcode:', barcode);
        console.log('Available products:', this.products);
        
        // Convert barcode to string for comparison
        const searchBarcode = barcode.toString().trim();
        
        // Find product with matching barcode
        const product = this.products.find(p => {
            const productBarcode = (p.barcode || '').toString().trim();
            return productBarcode === searchBarcode;
        });
        
        console.log('Found product:', product);
        return product;
    }

    getProductById(id) {
        return this.products.find(p => p.id === id);
    }

    initBarcodeScannerButton() {
        // Get the scan button from the product form
        const scanButton = document.getElementById('scanProductBarcode');
        
        if (scanButton) {
            scanButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.showProductBarcodeScanner();
            });
        }
    }

    showProductBarcodeScanner() {
        console.log("Opening scanner for product barcode");
        
        // Store the current context to know where to return the scanned barcode
        window.scannerContext = {
            type: 'product',
            inputField: 'productBarcode'
        };
        
        // Get the scanner modal
        const scannerModal = document.getElementById('scannerModal');
        if (!scannerModal) {
            console.error("Scanner modal not found");
                return;
            }
            
        // Set a special data attribute to identify product scanning mode
        scannerModal.setAttribute('data-scanner-mode', 'product');
        
        // Hide the scanner bill section - not needed for product scanning
        const billSection = document.getElementById('scannerBillSection');
        if (billSection) billSection.classList.add('hidden');
        
        // Change the title to match our purpose
        const modalTitle = scannerModal.querySelector('h2');
        if (modalTitle) modalTitle.textContent = 'Scan Product Barcode';
        
        // Show the scanner modal
        scannerModal.classList.remove('hidden');
        
        // Hide the product modal temporarily
        const productModal = document.getElementById('productModal');
        if (productModal) {
            productModal.classList.add('temp-hidden');
            // Don't actually hide it with 'hidden' class to avoid losing state
            // We'll restore it when scanner is closed
        }
        
        // Initialize scanner if available
        if (window.optimizedScanner) {
            window.optimizedScanner.startScanning();
        } else if (typeof window.initScanner === 'function') {
            window.initScanner();
        }
    }
}

// Initialize product manager
let productManager;

function initializeProductManager() {
    if (!productManager) {
        console.log('Initializing ProductManager...');
        productManager = new ProductManager();
        window.productManager = productManager;
    }
}

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeProductManager();
    
    // Remove reference to old scanner function to avoid conflicts
    window.showProductScanner = null;
    
    // Remove the direct event listener setup
        setTimeout(() => {
        const scanButton = document.getElementById('scanProductBarcode');
        if (scanButton) {
            // Make sure button uses the new method
            scanButton.onclick = function(e) {
                e.preventDefault();
                window.productManager.showProductBarcodeScanner();
                return false;
            };
        }
    }, 1000);
});

// Export for other modules
window.initializeProductManager = initializeProductManager;