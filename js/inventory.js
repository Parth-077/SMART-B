class InventoryManager {
    constructor() {
        this.setupEventListeners();
        // Initialize with empty data
        this.updateInventoryDisplay();
    }

    setupEventListeners() {
        // Inventory button
        const inventoryBtn = Array.from(document.querySelectorAll('button')).find(
            button => button.querySelector('div')?.textContent.trim() === 'Inventory'
        );
        inventoryBtn?.addEventListener('click', () => this.showInventoryModal());

        // Modal close functionality
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                if (modal) modal.classList.add('hidden');
            });
        });
    }

    showInventoryModal() {
        const modal = document.getElementById('inventoryModal');
        modal.classList.remove('hidden');
        this.updateInventoryDisplay();
    }

    updateInventoryDisplay() {
        const tbody = document.getElementById('inventoryItems');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const products = window.productManager?.products || [];
        products.forEach(product => {
            const row = document.createElement('tr');
            const isLowStock = window.productManager?.checkLowStock(product);
            
            row.className = `${isLowStock ? 'bg-red-100' : 'hover:bg-gray-50'} transition-colors`;
            
            const formattedStock = window.productManager?.formatStock(product);
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${product.name}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${product.barcode || '-'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm text-gray-900">₹${product.mrp.toFixed(2)}${product.isWeighted ? '/kg' : ''}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end space-x-2">
                        <span class="text-sm ${isLowStock ? 'text-red-600 font-bold' : 'text-gray-900'}">${formattedStock}</span>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <button onclick="inventoryManager.adjustStock('${product.id}')" 
                        class="text-blue-500 hover:text-blue-700 p-1">
                        <i class="fas fa-edit"></i> Adjust
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners for stock updates
        this.setupStockUpdateListeners();
    }

    getStockStatus(stock, isWeighted) {
        const lowStockThreshold = isWeighted ? 5 : 10;
        if (stock <= 0) {
            return {
                text: 'Out of Stock',
                class: 'bg-red-100 text-red-800'
            };
        } else if (stock < lowStockThreshold) {
            return {
                text: 'Low Stock',
                class: 'bg-yellow-100 text-yellow-800'
            };
        } else {
            return {
                text: 'In Stock',
                class: 'bg-green-100 text-green-800'
            };
        }
    }

    showLowStockAlert(product) {
        if (!product) return;
        
        const settings = window.settingsManager?.settings || {};
        const threshold = settings.lowStockThreshold || localStorage.getItem('lowStockThreshold') || 10;
        const formattedStock = window.productManager?.formatStock(product);
        
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg';
        alertDiv.innerHTML = `
            <div class="flex items-center">
                <div class="py-1"><svg class="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg></div>
                <div>
                    <p class="font-bold">Low Stock Alert</p>
                    <p>${product.name} has only ${formattedStock} remaining!</p>
                    <p class="text-sm">Threshold: ${product.isWeighted ? '5 kg' : threshold + ' units'}</p>
                </div>
            </div>
            <button onclick="this.parentElement.remove()" class="absolute top-0 right-0 p-2 text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    setupStockUpdateListeners() {
        // Add event listeners for stock updates
        document.querySelectorAll('.stock-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const productId = e.target.getAttribute('data-product-id');
                const newStock = parseFloat(e.target.value);
                productManager.updateStock(productId, newStock);
            });
        });
    }

    filterProducts(searchTerm) {
        // Get all rows in the inventory table
        const rows = document.querySelectorAll('#inventoryItems tr');
        
        // Convert search term to lowercase for case-insensitive comparison
        searchTerm = searchTerm.toLowerCase().trim();
        
        rows.forEach(row => {
            // Get the product name and barcode from the row
            const productName = row.querySelector('td:first-child')?.textContent?.toLowerCase() || '';
            const barcode = row.querySelector('td:nth-child(2)')?.textContent?.toLowerCase() || '';
            
            // Check if either product name or barcode contains the search term
            if (productName.includes(searchTerm) || barcode.includes(searchTerm)) {
                row.style.display = ''; // Show the row
            } else {
                row.style.display = 'none'; // Hide the row
            }
        });
    }

    adjustStock(productId) {
        // Find the product by ID
        const product = window.productManager?.products.find(p => p.id.toString() === productId.toString());
        if (!product) {
            alert('Product not found!');
            return;
        }

        // Format the current stock for display
        const formattedStock = window.productManager?.formatStock(product);
        const isWeighted = product.isWeighted;
        
        // Create and show stock adjustment dialog
        const dialog = document.createElement('div');
        dialog.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        dialog.id = 'stockAdjustmentDialog';
        dialog.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg w-96">
                <h3 class="text-lg font-bold mb-4">Adjust Stock: ${product.name}</h3>
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">Current Stock: ${formattedStock}</p>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        New Stock ${isWeighted ? '(in kg)' : ''}
                    </label>
                    <input type="number" id="newStockValue" 
                        class="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                        min="0" step="${isWeighted ? '0.001' : '1'}"
                        value="${product.stock}">
                </div>
                <div class="flex justify-end gap-2">
                    <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="document.getElementById('stockAdjustmentDialog').remove()">
                        Cancel
                    </button>
                    <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onclick="inventoryManager.updateStockValue('${productId}')">
                        Update Stock
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Focus on the input
        setTimeout(() => {
            document.getElementById('newStockValue')?.focus();
        }, 100);
    }

    updateStockValue(productId) {
        const newStockInput = document.getElementById('newStockValue');
        if (!newStockInput) return;

        const newStock = parseFloat(newStockInput.value);
        if (isNaN(newStock) || newStock < 0) {
            alert('Please enter a valid stock value');
            return;
        }

        // Update the stock using the ProductManager
        const success = window.productManager?.updateStock(productId, newStock);
        if (success) {
            // Close the dialog
            document.getElementById('stockAdjustmentDialog')?.remove();
            // Update the inventory display
            this.updateInventoryDisplay();
        }
    }
}

// Request notification permission on page load
if ('Notification' in window) {
    Notification.requestPermission();
}

// Initialize inventory manager and make it globally available
const inventoryManager = new InventoryManager();
window.inventoryManager = inventoryManager; 