// At the top of the file, create a global promise that will resolve when scanner is ready
window.scannerReady = new Promise(resolve => {
    window.scannerReadyResolver = resolve;
});

// SPEED OPTIMIZATION: Start loading the QR library immediately when the script loads
(async function preloadQRLibrary() {
    if (typeof Html5Qrcode === 'undefined') {
        console.log('Preloading HTML5 QR Code library...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        document.head.appendChild(script);
    }
})();

// Check if HTML5 QR code library is loaded
const isHtml5QrcodeLoaded = () => {
    return typeof Html5Qrcode !== 'undefined' && 
           typeof Html5QrcodeSupportedFormats !== 'undefined';
};

// Function to dynamically load the HTML5 QR code library if it's not available
const loadHtml5QrcodeLibrary = () => {
    return new Promise((resolve, reject) => {
        if (isHtml5QrcodeLoaded()) {
            console.log('HTML5 QR Code library already loaded');
            return resolve(true);
        }
        
        console.log('Attempting to dynamically load HTML5 QR Code library');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.async = true;
        script.onload = () => {
            console.log('HTML5 QR Code library loaded successfully via dynamic loading');
            resolve(true);
        };
        script.onerror = (err) => {
            console.error('Failed to load HTML5 QR Code library dynamically:', err);
            reject(err);
        };
        
        document.head.appendChild(script);
    });
};

// Define fallback barcode formats in case the library is not yet loaded
const BARCODE_FORMATS = {
    EAN_13: 0,
    EAN_8: 1,
    UPC_A: 2,
    UPC_E: 3,
    CODE_128: 4,
    CODE_39: 5
};

// Function to get supported formats safely
function getSupportedFormats() {
    if (isHtml5QrcodeLoaded()) {
        return Html5QrcodeSupportedFormats;
    } else {
        console.warn('HTML5 QR Code library not loaded yet, using fallback formats');
        return BARCODE_FORMATS;
    }
}

// Add this browser detection function at the top of the file
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = "Unknown";
    let isFirefox = false;
    let isMobile = false;
    
    if (ua.match(/firefox|fxios/i)) {
        browserName = "Firefox";
        isFirefox = true;
    } else if (ua.match(/chrome|chromium|crios/i)) {
        browserName = "Chrome";
    } else if (ua.match(/safari/i)) {
        browserName = "Safari";
    } else if (ua.match(/opr\//i)) {
        browserName = "Opera";
    } else if (ua.match(/edg/i)) {
        browserName = "Edge";
    }
    
    if (/Mobi|Android/i.test(ua)) {
        isMobile = true;
    }
    
    return { browserName, isFirefox, isMobile };
}

// SPEED OPTIMIZATION: Cache browser info at script load time
const BROWSER_INFO = getBrowserInfo();

// SPEED OPTIMIZATION: Pre-request camera permission if possible
(async function tryEarlyPermissionRequest() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            console.log('Attempting early camera permission request...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }
            });
            if (stream) {
                console.log('Early camera permission granted!');
                window.CAMERA_PERMISSION_GRANTED = true;
                // Stop tracks immediately
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (err) {
            console.log('Early permission request failed (this is normal):', err.name);
        }
    }
})();

class OptimizedScanner {
    constructor() {
        console.log('Initializing BarcodeScanner...');
        
        // SPEED OPTIMIZATION: Start loading the library immediately
        if (!isHtml5QrcodeLoaded()) {
            loadHtml5QrcodeLibrary()
                .then(() => {
                    this.completeInitialization();
                })
                .catch(err => {
                    console.error('QR library load error:', err);
                    // Still try to initialize in case the library loads later
                    setTimeout(() => this.completeInitialization(), 1000);
                });
        } else {
            this.completeInitialization();
        }
    }
    
    completeInitialization() {
        // Wait for billing system to be ready
        if (!window.billingSystem) {
            console.warn('BillingSystem not ready, will retry initialization');
            setTimeout(() => this.completeInitialization(), 500);
            return;
        }

        this.html5QrCode = null;
        this.scannerBillItems = [];
        this.currentBillTotal = 0;
        this.beepSound = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHgU2jdXzzn0vBSF1xe/glEILElyx6OyrWBUIQ5zd8sFuJAUuhM/z1YU2Bhxqvu7mnEYODlOq5O+zYBoGPJPY88p2KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8GM4nU8tGAMQYfcsLu45ZFDBFYr+ftrVoXCECY3PLEcSYE");
        this.currentCamera = null;
        this.cameras = [];
        this.scannerRunning = false;
        this.lastScannedCode = '';
        this.scanCooldown = false;
        this.resolvedProducts = new Map(); // Cache for already resolved products
        
        // SPEED OPTIMIZATION: Use cached browser info
        this.browserInfo = BROWSER_INFO;
        
        // SPEED OPTIMIZATION: Check for cached permission
        this.permissionRequested = !!window.CAMERA_PERMISSION_GRANTED;

        this._bindMethods();
        this.setupEventListeners();
        
        // Resolve the scanner ready promise
        if (window.scannerReadyResolver) {
            window.scannerReadyResolver(this);
        }
    }

    _bindMethods() {
        this.startScanning = this.startScanning.bind(this);
        this.stopScanner = this.stopScanner.bind(this);
        this.onScanSuccess = this.onScanSuccess.bind(this);
        this.onScanFailure = this.onScanFailure.bind(this);
        this.addItemToScannerBill = this.addItemToScannerBill.bind(this);
        this.updateScannerBillDisplay = this.updateScannerBillDisplay.bind(this);
        this.removeItem = this.removeItem.bind(this);
        this.addItemsToMainBill = this.addItemsToMainBill.bind(this);
        this.setupResizeHandler = this.setupResizeHandler.bind(this);
        this.restartScanner = this.restartScanner.bind(this);
        this.setupCamera = this.setupCamera.bind(this);
        this.resetScannerContainerStyles = this.resetScannerContainerStyles.bind(this);
        this.fixFirefoxContainerStyles = this.fixFirefoxContainerStyles.bind(this);
        this.addZoomControl = this.addZoomControl.bind(this);
        this.applyDigitalZoom = this.applyDigitalZoom.bind(this);
        this.enableVideoPanning = this.enableVideoPanning.bind(this);
        this.disableVideoPanning = this.disableVideoPanning.bind(this);
    }

    setupEventListeners() {
        document.querySelectorAll('.scan-barcode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                console.log('Scan button clicked');
                this.startScanning();
            });
        });

        document.querySelectorAll('#scannerModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.stopScanner());
        });

        // Complete bill button
        const completeBillBtn = document.getElementById('completeBill');
        if (completeBillBtn) {
            console.log('Found complete bill button');
            completeBillBtn.addEventListener('click', () => {
                console.log('Complete bill button clicked');
                this.addItemsToMainBill();
            });
        } else {
            console.error('Complete bill button not found');
        }
    }

    // Add a function to ensure the library is available when needed
    async ensureLibraryLoaded() {
        if (isHtml5QrcodeLoaded()) {
            return true;
        }
        
        console.log('Library not loaded when needed, attempting dynamic load');
        try {
            await loadHtml5QrcodeLibrary();
            console.log('Successfully loaded library when needed');
            return true;
        } catch (err) {
            console.error('Failed to load library when needed:', err);
            return false;
        }
    }

    async startScanning() {
        console.log('Starting lightning-fast scanner...');
        const modal = document.getElementById('scannerModal');
        if (!modal) {
            console.error('Scanner modal not found');
            return;
        }
        modal.classList.remove('hidden');

        // Clear previous scan results and show loading message
        document.getElementById('interactive').innerHTML = 
            '<div class="w-full h-full flex flex-col items-center justify-center">' +
            '<div class="text-xl text-center mb-4">Starting camera...</div>' +
            '<div class="text-sm text-center">If prompted, please allow camera access</div>' +
            '</div>';
        
        // SPEED OPTIMIZATION: Use Promise.race to try both paths simultaneously
        const libraryPromise = this.ensureLibraryLoaded();
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 2000));
        
        const libraryLoaded = await Promise.race([libraryPromise, timeoutPromise]);
        if (!libraryLoaded) {
            document.getElementById('interactive').innerHTML = 
                '<div class="w-full h-full flex flex-col items-center justify-center">' +
                '<div class="text-xl text-center text-red-500 mb-2">Scanner is taking too long to load</div>' +
                '<button onClick="window.location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                'Reload Page</button>' +
                '</div>';
            return;
        }

        try {
            console.log("Fast-initializing scanner");
            if (this.html5QrCode) {
                await this.html5QrCode.stop();
                this.html5QrCode = null;
                this.scannerRunning = false;
            }

            // Make sure HTML5 QR Code library is loaded
            if (!isHtml5QrcodeLoaded()) {
                throw new Error('HTML5 QR Code library not loaded yet. Please refresh the page and try again.');
            }

            // Use cached browser info
            const { browserName, isFirefox, isMobile } = this.browserInfo;
            
            // Get supported formats safely
            const formats = getSupportedFormats();
            
            // SPEED OPTIMIZATION: Use a minimal subset of barcode formats
            const scannerConfig = {
                formatsToSupport: [
                    formats.EAN_13,
                    formats.EAN_8,
                    formats.UPC_A,
                    formats.CODE_128
                ]
            };
            
            console.log("Creating Html5Qrcode instance");
            this.html5QrCode = new Html5Qrcode("interactive", scannerConfig);

            // SPEED OPTIMIZATION: Use a simpler configuration
            // Create a simplified config for faster camera startup
            let config = {
                fps: 15, // Lower FPS for faster startup
                qrbox: { width: 250, height: 100 },
                aspectRatio: 1.0,
                disableFlip: true, // Disable flip for faster startup
                videoConstraints: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            console.log('Starting camera with fast config:', JSON.stringify(config));
            
            // Start scanner with enhanced error handling
            this.scannerRunning = true;
            
            await this.html5QrCode.start(
                { facingMode: "environment" }, // Always use environment camera first for speed
                config,
                this.onScanSuccess,
                (errorMessage) => {
                    console.log("Scanner error:", errorMessage);
                    
                    if (errorMessage.includes("Permission denied") || 
                        errorMessage.includes("Permission dismissed") ||
                        errorMessage.includes("NotAllowedError")) {
                        
                        console.error('Camera permission error:', errorMessage);
                        document.getElementById('interactive').innerHTML = 
                            '<div class="w-full h-full flex flex-col items-center justify-center">' +
                            '<div class="text-xl text-center text-red-500 mb-2">Camera access denied</div>' +
                            '<div class="text-sm text-center mb-4">Please enable camera access in your browser settings</div>' +
                            '<button id="retryCamera" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                            'Try Again</button>' +
                            '</div>';
                        
                        document.getElementById('retryCamera')?.addEventListener('click', () => {
                            this.restartScanner();
                        });
                        this.scannerRunning = false;
                    }
                }
            );
            
            console.log('Enhanced scanner started successfully');
            
            // Add minimal visual guides
            this.addMinimalScannerGuides();
            
            // Setup controls only after scanner is working
            setTimeout(() => {
                if (this.scannerRunning) {
                    this.setupOptimizedControls();
                }
            }, 500);
        } catch (err) {
            console.error("Error starting scanner:", err);
            
            // Try a simpler fallback approach
            try {
                console.log("Trying ultra-simple fallback configuration");
                
                const fallbackConfig = {
                    fps: 10,
                    qrbox: { width: 250, height: 100 },
                    videoConstraints: {
                        facingMode: "environment",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }
                };
                
                await this.html5QrCode.start(
                    { facingMode: "environment" },
                    fallbackConfig,
                    this.onScanSuccess,
                    (errorMessage) => console.log("Fallback scanner error:", errorMessage)
                );
                
                console.log("Fallback scanner started successfully");
                
                // Add minimal guides
                this.addMinimalScannerGuides();
            } catch (fallbackErr) {
                console.error("Fallback approach also failed:", fallbackErr);
                
                document.getElementById('interactive').innerHTML = 
                    '<div class="w-full h-full flex flex-col items-center justify-center">' +
                    '<div class="text-xl text-center text-red-500 mb-2">Failed to start scanner</div>' +
                    '<button id="retryScanner" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">' +
                    'Try Again</button>' +
                    '</div>';
                
                document.getElementById('retryScanner')?.addEventListener('click', () => {
                    this.startScanning();
                });
                
                this.scannerRunning = false;
            }
        }
    }

    async stopScanner() {
        if (this.html5QrCode) {
            try {
                await this.html5QrCode.stop();
                this.html5QrCode = null;
                this.scannerRunning = false;
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
        
        // Clean up panning handlers if they exist
        const container = document.getElementById('interactive');
        if (container) {
            const video = container.querySelector('video');
            if (video && this.panningEnabled) {
                this.disableVideoPanning(video);
            }
        }
        
        // Remove event listeners when stopping scanner
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            window.removeEventListener('orientationchange', this.resizeHandler);
        }
        
        // Get the scanner modal
        const scannerModal = document.getElementById('scannerModal');
        if (scannerModal) {
            // Check if we're in product mode
            const isProductMode = scannerModal.getAttribute('data-scanner-mode') === 'product';
            
            // Clear scanner bill items only if we're not in product mode
            if (!isProductMode) {
                this.scannerBillItems = [];
                this.currentBillTotal = 0;
                document.getElementById('scannerBillItems').innerHTML = '';
                document.getElementById('scannerBillTotal').textContent = '0';
            }
            
            // Reset the scanner mode
            scannerModal.removeAttribute('data-scanner-mode');
            
            // Show the scanner bill section again (might have been hidden in product mode)
            const billSection = document.getElementById('scannerBillSection');
            if (billSection) billSection.classList.remove('hidden');
            
            // Reset the modal title
            const modalTitle = scannerModal.querySelector('h2');
            if (modalTitle) modalTitle.textContent = 'Scan Products';
            
            // Hide scanner modal
            scannerModal.classList.add('hidden');
            
            // If we were in product mode, show the product modal again
            if (isProductMode) {
                const productModal = document.getElementById('productModal');
                if (productModal && productModal.classList.contains('temp-hidden')) {
                    productModal.classList.remove('temp-hidden');
                    productModal.classList.remove('hidden'); // Ensure it's visible
                }
            } else {
                // Make sure billing modal is visible if we're not in product mode
                const billingModal = document.getElementById('billingModal');
                if (billingModal && billingModal.classList.contains('hidden')) {
                    billingModal.classList.remove('hidden');
                }
                
                // Update the billing display
                if (window.billingSystem) {
                    window.billingSystem.updateBillDisplay();
                }
            }
        }
    }

    onScanSuccess(decodedText) {
        // SPEED OPTIMIZATION: Use timestamp comparison instead of full string comparison
        const now = Date.now();
        if (this.lastScannedTime && now - this.lastScannedTime < 800) {
            return; // Reject rapid scans faster with simpler check
        }
        
        // Save the original barcode before processing
        const originalBarcode = decodedText;
        
        // Process barcode (keep this fast path optimization)
        let processedBarcode;
        if (/^\d{6,14}$/.test(decodedText)) {
            processedBarcode = decodedText;
        } else {
            processedBarcode = this.extractBarcodeFromDamagedText(decodedText);
        }
        
        this.lastScanned = decodedText;
        this.lastScannedTime = now;

        console.log('Processed barcode:', processedBarcode);
        console.log('Original barcode:', originalBarcode);
        const resultDiv = document.getElementById('scanResult');
        resultDiv.textContent = `Scanned: ${processedBarcode}`;

        // Check if we're scanning in a specific context (like product form)
        if (window.scannerContext) {
            if (window.scannerContext.type === 'product') {
                // We're scanning for a product barcode in the product form
                const barcodeInput = document.getElementById(window.scannerContext.inputField);
                if (barcodeInput) {
                    // IMPORTANT: For product scanning, use the original barcode
                    // This prevents issues with barcode processing that might be intended
                    // for product lookup but not for product entry
                    barcodeInput.value = originalBarcode;
                    
                    console.log('Setting product barcode input to:', originalBarcode);
                    
                    // Play success sound
                    this.playSuccessBeep();
                    
                    // Show success feedback
                    if (resultDiv) {
                        resultDiv.textContent = `Added barcode: ${originalBarcode}`;
                        resultDiv.className = 'mt-1 text-center text-green-700 font-bold min-h-[24px] bg-green-100 p-1 rounded';
                    }
                    
                    // Close the scanner modal after a short delay
                    setTimeout(() => {
                        this.stopScanner();
                        
                        // Reset the context
                        window.scannerContext = null;
                    }, 1000);
                    
                    return; // Skip normal bill processing
                }
            }
        }

        try {
            // Normal bill processing for non-context scanning
            // Find product using optimized lookup
            let product = window.productManager.getProductByBarcode(processedBarcode);
            
            // Try original barcode if processed one didn't match
            if (!product && processedBarcode !== decodedText) {
                product = window.productManager.getProductByBarcode(decodedText);
            }
            
            // Try partial barcode matching as fallback
            if (!product) {
                product = this.findProductByPartialBarcode(processedBarcode);
            }
            
            if (product) {
                // Play success sound
                this.playSuccessBeep();
                
                // CRITICAL FIX: Add product to bill (this was missing)
                this.addItemToScannerBill(product);
                
                // Show success feedback
                resultDiv.textContent = `Added: ${product.name}`;
                resultDiv.className = 'mt-1 text-center text-green-700 font-bold min-h-[24px] bg-green-100 p-1 rounded';
                
                // Brief pause to prevent duplicate scans
                if (this.html5QrCode) {
                    this.html5QrCode.pause(true);
                    setTimeout(() => {
                        if (this.html5QrCode && this.scannerRunning) {
                            this.html5QrCode.resume();
                        }
                    }, 300);
                }
                
                // Reset UI in background
                setTimeout(() => {
                    if (resultDiv) resultDiv.className = 'mt-1 text-center text-gray-700 font-bold min-h-[24px]';
                }, 800);
            } else {
                // Product not found handling
                this.playErrorBeep();
                resultDiv.textContent = `Not found: ${processedBarcode}`;
                resultDiv.className = 'mt-1 text-center text-red-700 font-bold min-h-[24px] bg-red-100 p-1 rounded';
                setTimeout(() => {
                    resultDiv.className = 'mt-1 text-center text-gray-700 font-bold min-h-[24px]';
                }, 800);
            }
        } catch (error) {
            console.error('Error processing scan:', error);
            this.playErrorBeep();
            resultDiv.textContent = `Error: ${error.message}`;
        }
    }

    // SPEED OPTIMIZATION: Ultra-fast product lookup
    findProductFast(barcode) {
        // Skip processing if we don't have products
        if (!this.allProducts) return null;
        
        // SPEED OPTIMIZATION: Direct lookup first (fastest path)
        for (let i = 0; i < this.allProducts.length; i++) {
            const product = this.allProducts[i];
            if (product && product.barcode === barcode) {
                return product;
            }
        }
        
        // For partial barcodes, use optimized matching
        if (barcode.length >= 4) {
            // SPEED OPTIMIZATION: Process once and store results
            if (!this.barcodeIndexMap) {
                // Build index of partial barcodes for faster lookup
                this.barcodeIndexMap = new Map();
                
                for (let i = 0; i < this.allProducts.length; i++) {
                    const product = this.allProducts[i];
                    if (!product || !product.barcode) continue;
                    
                    // Index by prefix and suffix for fast matching
                    for (let j = 4; j <= Math.min(product.barcode.length, 8); j++) {
                        const prefix = product.barcode.substring(0, j);
                        const suffix = product.barcode.substring(product.barcode.length - j);
                        
                        if (!this.barcodeIndexMap.has(prefix)) {
                            this.barcodeIndexMap.set(prefix, []);
                        }
                        if (!this.barcodeIndexMap.has(suffix)) {
                            this.barcodeIndexMap.set(suffix, []);
                        }
                        
                        this.barcodeIndexMap.get(prefix).push(product);
                        if (prefix !== suffix) {
                            this.barcodeIndexMap.get(suffix).push(product);
                        }
                    }
                }
            }
            
            // Fast lookup for partial matches
            const productsToCheck = this.barcodeIndexMap.get(barcode) || [];
            
            // Check for substring matches
            for (let i = 0; i < productsToCheck.length; i++) {
                if (productsToCheck[i].barcode.includes(barcode)) {
                    return productsToCheck[i];
                }
            }
            
            // Check for partial start/end matches
            for (let i = 0; i < this.allProducts.length; i++) {
                const product = this.allProducts[i];
                if (!product || !product.barcode) continue;
                
                if (product.barcode.startsWith(barcode) || 
                    product.barcode.endsWith(barcode)) {
                    return product;
                }
            }
        }
        
        return null;
    }

    // SPEED OPTIMIZATION: Optimized barcode extraction
    extractBarcodeFromDamagedText(text) {
        // SPEED OPTIMIZATION: Use regular expressions more efficiently
        
        // Quick digit-only test
        const digitsOnly = /^\d+$/.test(text);
        if (digitsOnly && text.length >= 6 && text.length <= 14) {
            return text; // Already a valid barcode
        }
        
        // Extract all digits - faster approach
        const extractedDigits = text.replace(/\D/g, '');
        
        // Find first valid sequence
        const patterns = [
            /\d{13}/,  // EAN-13
            /\d{12}/,  // UPC-A
            /\d{8}/,   // EAN-8
            /0\d{7}/,  // UPC-E
            /\d{6,}/   // Any 6+ digit sequence
        ];
        
        // Try each pattern until we find a match
        for (let i = 0; i < patterns.length; i++) {
            const match = text.match(patterns[i]);
            if (match) {
                return match[0];
            }
        }
        
        // If no pattern matches but we have digits, use them
        if (extractedDigits.length >= 6) {
            return extractedDigits;
        }
        
        // Last resort
        return text;
    }

    onScanFailure(error) {
        // Silent failure - don't need to show every failed scan attempt
        console.debug("Scanner error:", error);
    }

    addItemToScannerBill(product) {
        try {
            console.log('Adding item to scanner bill:', product);
            if (!product || !product.id) {
                console.error('Invalid product:', product);
                return;
            }

            // Check if item already exists in scanner bill
            const existingItem = this.scannerBillItems.find(item => item.id === product.id);
            
            if (existingItem) {
                console.log('Updating existing item quantity');
                existingItem.quantity += 1;
                existingItem.total = existingItem.quantity * existingItem.rate;
                console.log('Updated item:', existingItem);
            } else {
                console.log('Adding new item to bill');
                const discountedPrice = window.productManager.calculateDiscountedPrice(product);
                console.log('Calculated discounted price:', discountedPrice);
                
                const newItem = {
                    id: product.id,
                    name: product.name,
                    productName: product.name,
                    barcode: product.barcode,
                    mrp: parseFloat(product.mrp),
                    rate: parseFloat(discountedPrice),
                    quantity: 1,
                    total: parseFloat(discountedPrice),
                    isWeighted: product.isWeighted || false,
                    gstRate: product.gstRate || 0,
                    discount: product.discount || 0,
                    discountType: product.discountType || 'percentage'
                };
                
                console.log('New item to add:', newItem);
                this.scannerBillItems.push(newItem);
            }

            console.log('Current scanner bill items:', this.scannerBillItems);
            this.updateScannerBillDisplay();
        } catch (error) {
            console.error('Error adding item to scanner bill:', error);
        }
    }

    updateScannerBillDisplay() {
        try {
            console.log('Updating scanner bill display');
            const tbody = document.getElementById('scannerBillItems');
            if (!tbody) {
                console.error('Scanner bill items tbody not found');
                return;
            }

            tbody.innerHTML = '';
            this.currentBillTotal = 0;

            this.scannerBillItems.forEach((item, index) => {
                this.currentBillTotal += parseFloat(item.total) || 0;
                
                const tr = document.createElement('tr');
                tr.className = 'border-b';
                tr.innerHTML = `
                    <td class="text-left p-2">${item.name || 'Unknown Item'}</td>
                    <td class="text-right p-2">₹${(parseFloat(item.mrp) || 0).toFixed(2)}</td>
                    <td class="text-right p-2">₹${(parseFloat(item.rate) || 0).toFixed(2)}</td>
                    <td class="text-center p-2">${item.quantity || 0}</td>
                    <td class="text-right p-2">₹${(parseFloat(item.total) || 0).toFixed(2)}</td>
                    <td class="text-center p-2">
                        <button onclick="window.optimizedScanner.removeItem(${index})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            const totalSpan = document.getElementById('scannerBillTotal');
            if (totalSpan) {
                totalSpan.textContent = this.currentBillTotal.toFixed(2);
            }
            console.log('Scanner bill display updated, total:', this.currentBillTotal);
        } catch (error) {
            console.error('Error updating scanner bill display:', error);
        }
    }

    removeItem(index) {
        this.scannerBillItems.splice(index, 1);
        this.updateScannerBillDisplay();
    }

    addItemsToMainBill() {
        try {
            console.log('Starting addItemsToMainBill...');
            if (this.scannerBillItems.length === 0) {
                console.log('No items to add');
                alert('No items to add to bill!');
                return;
            }

            if (!window.billingSystem) {
                throw new Error('Billing system not found');
            }

            // Show the billing modal if it's hidden
            const billingModal = document.getElementById('billingModal');
            if (billingModal && billingModal.classList.contains('hidden')) {
                billingModal.classList.remove('hidden');
            }

            console.log('Adding scanned items to main bill:', this.scannerBillItems);
            
            // Add items to main billing system
            this.scannerBillItems.forEach(item => {
                console.log('Processing item:', item);
                try {
                    // Create a complete product object with all necessary properties
                    const productToAdd = {
                        id: item.id,
                        name: item.name,
                        price: parseFloat(item.mrp),
                        mrp: parseFloat(item.mrp),
                        rate: parseFloat(item.rate),
                        discountedPrice: parseFloat(item.rate),
                        barcode: item.barcode,
                        isWeighted: item.isWeighted || false,
                        gstRate: parseFloat(item.gstRate) || 0,
                        discount: parseFloat(item.discount) || 0,
                        discountType: item.discountType || 'percentage',
                        quantity: parseInt(item.quantity)
                    };

                    console.log('Adding to billing system:', productToAdd);
                    window.billingSystem.addItemToBill(productToAdd, item.quantity);
                    
                } catch (err) {
                    console.error('Error adding item to bill:', err);
                    alert(`Error adding item: ${item.name}`);
                }
            });

            // Clear scanner items and close scanner modal
            this.stopScanner();
            
            console.log('Items added successfully');
            
        } catch (error) {
            console.error('Error in addItemsToMainBill:', error);
            alert('Error adding items to bill. Please try again.');
        }
    }

    playSuccessBeep() {
        try {
            // Reset and play the beep sound
            this.beepSound.currentTime = 0;
            this.beepSound.play().catch(e => console.log('Beep playback failed:', e));
        } catch (error) {
            console.log('Beep sound not supported');
        }
    }

    playErrorBeep() {
        try {
            // Create error beep (lower frequency)
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(200, context.currentTime); // Lower frequency for error
            
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            
            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + 0.5);
        } catch (error) {
            console.log('Error beep not supported');
        }
    }

    getOptimalScannerConfig() {
        const resolution = document.getElementById('scannerResolution').value;
        const isMobile = window.innerWidth < 768;
        const isPortrait = window.innerHeight > window.innerWidth;
        
        // Get supported formats safely
        const formats = getSupportedFormats();
        
        // Base configuration optimized for barcode scanning
        let config = {
            fps: isMobile ? 30 : 60,  // Increased FPS for better detection
            qrbox: undefined,
            aspectRatio: isPortrait ? 0.75 : 1.33,
            disableFlip: false,       // Enable flipping to help with difficult angles
            formatsToSupport: [
                formats.EAN_13,
                formats.EAN_8,
                formats.UPC_A,
                formats.UPC_E,
                formats.CODE_39,
                formats.CODE_128
            ],
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            },
            verbose: false,           // Disable verbose logging
            videoConstraints: {       // Add specific video constraints
                focusMode: "continuous", // Enable continuous autofocus
                zoom: 1.5             // Slight zoom to help with small barcodes
            }
        };

        // Get container dimensions
        const containerWidth = document.getElementById('interactive').clientWidth;
        const containerHeight = document.getElementById('interactive').clientHeight;

        // Calculate optimal scan area based on resolution setting
        switch(resolution) {
            case 'hd':
                config.fps = isMobile ? 20 : 30;
                config.qrbox = {
                    width: Math.min(containerWidth * 0.9, 400),
                    height: Math.min(containerWidth * 0.25, 100)
                };
                config.videoConstraints = {
                    ...config.videoConstraints,
                    width: { min: 1280, ideal: 1920, max: 1920 },
                    height: { min: 720, ideal: 1080, max: 1080 },
                    facingMode: "environment",
                    focusMode: "continuous"
                };
                break;
                
            case 'vga':
                config.fps = isMobile ? 25 : 40;
                config.qrbox = {
                    width: Math.min(containerWidth * 0.85, 350),
                    height: Math.min(containerWidth * 0.2, 80)
                };
                config.videoConstraints = {
                    ...config.videoConstraints,
                    width: { min: 640, ideal: 640, max: 1280 },
                    height: { min: 480, ideal: 480, max: 720 },
                    facingMode: "environment",
                    focusMode: "continuous"
                };
                break;
                
            case 'qvga':
                config.fps = isMobile ? 30 : 60;
                config.qrbox = {
                    width: Math.min(containerWidth * 0.8, 300),
                    height: Math.min(containerWidth * 0.15, 60)
                };
                config.videoConstraints = {
                    ...config.videoConstraints,
                    width: { min: 320, ideal: 320, max: 640 },
                    height: { min: 240, ideal: 240, max: 480 },
                    facingMode: "environment",
                    focusMode: "continuous"
                };
                break;
        }

        // Adjust scan area for very small screens
        if (containerWidth < 300) {
            config.qrbox.width = containerWidth * 0.9;
            config.qrbox.height = config.qrbox.width * 0.2;
        }

        // Optimize for orientation
        if (!isPortrait) {
            config.qrbox.width = Math.min(containerWidth * 0.8, 400);
            config.qrbox.height = config.qrbox.width * 0.15;
        }

        return config;
    }

    // Add event listener for orientation changes and resize
    setupResizeHandler() {
        // Store reference to handler for cleanup
        this.resizeHandler = () => {
            if (this.html5QrCode && this.scannerRunning) {
                // Restart scanner with optimized config when size changes
                this.restartScanner();
            }
        };
        
        // Handle orientation and size changes
        window.addEventListener('resize', this.resizeHandler);
        
        // Also handle orientation change explicitly for older devices
        window.addEventListener('orientationchange', this.resizeHandler);
    }

    // Method to restart scanner with new config
    async restartScanner() {
        if (!this.html5QrCode) {
            console.log('Creating new scanner instance');
            
            // Check if HTML5 QR Code library is loaded
            if (!isHtml5QrcodeLoaded()) {
                console.error('HTML5 QR Code library not loaded yet');
                document.getElementById('interactive').innerHTML = 
                    '<div class="w-full h-full flex flex-col items-center justify-center">' +
                    '<div class="text-xl text-center text-red-500 mb-2">Scanner Error</div>' +
                    '<div class="text-sm text-center mb-4">Scanner library not loaded. Please refresh the page.</div>' +
                    '<button onClick="window.location.reload()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                    'Refresh Page</button>' +
                    '</div>';
                return;
            }
            
            // Get supported formats safely
            const formats = getSupportedFormats();
            
            this.html5QrCode = new Html5Qrcode("interactive", {
                formatsToSupport: [
                    formats.EAN_13,
                    formats.EAN_8,
                    formats.UPC_A,
                    formats.UPC_E,
                    formats.CODE_128
                ],
                verbose: false
            });
        }
        
        try {
            // Show loading message
            document.getElementById('interactive').innerHTML = 
                '<div class="w-full h-full flex items-center justify-center">' +
                '<div class="text-xl text-center">Restarting camera...<br/>' +
                '<span class="text-sm">Please wait</span></div></div>';
            
            // Stop previous scanner if it was running
            if (this.scannerRunning) {
            await this.html5QrCode.stop();
            this.scannerRunning = false;
            }
            
            // Explicitly request camera permission if we haven't already
            if (!this.permissionRequested) {
                try {
                    console.log('Explicitly requesting camera permission');
                    // This will trigger the permission prompt
                    const stream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode: "environment" } 
                    });
                    // Stop the stream right away
                    stream.getTracks().forEach(track => track.stop());
                    this.permissionRequested = true;
                    console.log('Camera permission granted');
                } catch (err) {
                    console.error('Camera permission denied or error:', err);
                    // Show error message with retry button
                    document.getElementById('interactive').innerHTML = 
                        '<div class="w-full h-full flex flex-col items-center justify-center">' +
                        '<div class="text-xl text-center text-red-500 mb-2">Camera access denied</div>' +
                        '<div class="text-sm text-center mb-4">Please enable camera access in your browser settings</div>' +
                        '<button id="retryPermissionBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                        'Try Again</button>' +
                        '</div>';
                    
                    document.getElementById('retryPermissionBtn')?.addEventListener('click', () => {
                        this.permissionRequested = false; // Reset permission flag
                        this.restartScanner();
                    });
                    return;
                }
            }
            
            // Short delay to ensure camera is fully stopped
            setTimeout(async () => {
                const { browserName, isFirefox, isMobile } = getBrowserInfo();
                const isChrome = browserName === "Chrome";
                
                // Chrome configuration optimized for damaged barcodes
                let config;
                
                if (isChrome) {
                    config = {
                        fps: 10, // Lower FPS for more processing time per frame
                        qrbox: { width: 300, height: 100 }, // Wider scanning area for damaged codes
                        aspectRatio: window.innerWidth > window.innerHeight ? 1.33 : 0.75,
                        disableFlip: false,
                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: true
                        },
                        videoConstraints: {
                            width: { min: 1280, ideal: 1920, max: 1920 },
                            height: { min: 720, ideal: 1080, max: 1080 },
                            facingMode: "environment",
                            advanced: [
                                {
                                    focusMode: "continuous",
                                    zoom: 1.0,
                                    exposureMode: "continuous"
                                }
                            ]
                        }
                    };
                } else {
                    // Use appropriate config for other browsers
                    config = {
                        fps: 15,
                        qrbox: { width: 250, height: 100 },
                        aspectRatio: isFirefox ? 1.0 : (window.innerWidth > window.innerHeight ? 1.33 : 0.75),
                        disableFlip: false,
                        experimentalFeatures: {
                            useBarCodeDetectorIfSupported: !isFirefox
                        },
                        videoConstraints: {
                            facingMode: "environment"
                        }
                    };
                }
                
                try {
                await this.html5QrCode.start(
                        this.currentCamera || { facingMode: "environment" },
                    config,
                    this.onScanSuccess,
                        (errorMessage) => {
                            // Handle permission errors in error callback
                            if (errorMessage.includes("Permission denied") || 
                                errorMessage.includes("Permission dismissed") ||
                                errorMessage.includes("NotAllowedError")) {
                                
                                console.error('Camera permission error during restart:', errorMessage);
                                document.getElementById('interactive').innerHTML = 
                                    '<div class="w-full h-full flex flex-col items-center justify-center">' +
                                    '<div class="text-xl text-center text-red-500 mb-2">Camera access denied</div>' +
                                    '<div class="text-sm text-center mb-4">Please enable camera access in your browser settings</div>' +
                                    '<button id="retryPermissionBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                                    'Try Again</button>' +
                                    '</div>';
                                
                                document.getElementById('retryPermissionBtn')?.addEventListener('click', () => {
                                    this.permissionRequested = false; // Reset permission flag
                                    this.restartScanner();
                                });
                                this.scannerRunning = false;
                            }
                        }
                );
                
                this.scannerRunning = true;
                
                // Re-add guides
                this.addScannerGuides();
                } catch (startErr) {
                    console.error("Error starting scanner:", startErr);
                    // Handle start errors
                    document.getElementById('interactive').innerHTML = 
                        '<div class="w-full h-full flex flex-col items-center justify-center">' +
                        '<div class="text-xl text-center text-red-500 mb-2">Camera error</div>' +
                        '<div class="text-sm text-center mb-4">' + startErr.toString() + '</div>' +
                        '<button id="retryStartBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                        'Try Again</button>' +
                        '</div>';
                    
                    document.getElementById('retryStartBtn')?.addEventListener('click', () => {
                        this.restartScanner();
                    });
                }
            }, 300);
        } catch (err) {
            console.error("Error restarting scanner:", err);
            // Show generic error message
            document.getElementById('interactive').innerHTML = 
                '<div class="w-full h-full flex flex-col items-center justify-center">' +
                '<div class="text-xl text-center text-red-500 mb-2">Error</div>' +
                '<div class="text-sm text-center mb-4">' + err.toString() + '</div>' +
                '<button id="retryErrorBtn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">' +
                'Try Again</button>' +
                '</div>';
            
            document.getElementById('retryErrorBtn')?.addEventListener('click', () => {
                this.restartScanner();
            });
        }
    }

    // Add method to handle camera capabilities
    async setupCamera() {
        try {
            const { browserName, isFirefox, isMobile } = getBrowserInfo();
            const isChrome = browserName === "Chrome";
            
            // For Chrome mobile, we need to explicitly request the best camera quality
            if (isChrome && isMobile) {
                const constraints = {
                    video: {
                        facingMode: { ideal: "environment" },
                        width: { min: 1280, ideal: 1920, max: 1920 },
                        height: { min: 720, ideal: 1080, max: 1080 },
                        focusMode: ["continuous", "auto"],
                        exposureMode: ["continuous", "auto"]
                    }
                };
                
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                const track = stream.getVideoTracks()[0];
                
                // Try to get and apply advanced camera capabilities
                if (track && typeof track.getCapabilities === 'function') {
                    const capabilities = track.getCapabilities();
                    
                    if (capabilities) {
                        const settings = {};
                        
                        // Enable continuous focus if available
                        if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
                            settings.focusMode = "continuous";
                        }
                        
                        // Enable auto exposure if available
                        if (capabilities.exposureMode && capabilities.exposureMode.includes("continuous")) {
                            settings.exposureMode = "continuous";
                        }
                        
                        // Apply these settings
                        if (Object.keys(settings).length > 0) {
                            await track.applyConstraints({ advanced: [settings] });
                        }
                    }
                }
                
                // Store the track for later use
                this.currentVideoTrack = track;
                
                return stream;
            }
        } catch (error) {
            console.error('Error setting up camera:', error);
            // Continue with default settings if advanced setup fails
        }
        
        return null;
    }

    // Add visual guides to help with positioning small barcodes
    addScannerGuides() {
        const container = document.getElementById('interactive');
        if (!container) return;
        
        // Remove any existing guides
        const existingGuide = document.getElementById('barcode-guide');
        if (existingGuide) existingGuide.remove();
        
        // Get browser info for browser-specific adjustments
        const { browserName, isFirefox, isMobile } = getBrowserInfo();
        const isFirefoxMobile = isFirefox && isMobile;
        
        // Create guide container with Firefox adjustments
        const guideContainer = document.createElement('div');
        guideContainer.id = 'barcode-guide';
        guideContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: ${isFirefoxMobile ? '30' : '10'};
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;
        
        // Create guide frame - make it more visible for damaged barcodes
        const guide = document.createElement('div');
        guide.style.cssText = `
            width: 85%;
            height: ${isFirefoxMobile ? '60px' : '100px'};
            border: 2px dashed rgba(255, 255, 255, 0.8);
            border-radius: 4px;
            box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.4);
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            position: relative;
        `;
        
        // Add corner markers to make alignment easier
        const createCorner = (position) => {
            const corner = document.createElement('div');
            corner.style.cssText = `
                position: absolute;
                width: 14px;
                height: 14px;
                border: 3px solid rgba(255, 255, 255, 0.9);
                ${position.includes('top') ? 'top: -2px;' : 'bottom: -2px;'}
                ${position.includes('left') ? 'left: -2px;' : 'right: -2px;'}
                ${position.includes('top-left') ? 'border-right: none; border-bottom: none;' : ''}
                ${position.includes('top-right') ? 'border-left: none; border-bottom: none;' : ''}
                ${position.includes('bottom-left') ? 'border-right: none; border-top: none;' : ''}
                ${position.includes('bottom-right') ? 'border-left: none; border-top: none;' : ''}
            `;
            return corner;
        };
        
        // Add corners to guide
        guide.appendChild(createCorner('top-left'));
        guide.appendChild(createCorner('top-right'));
        guide.appendChild(createCorner('bottom-left'));
        guide.appendChild(createCorner('bottom-right'));
        
        // Help text - enhanced for damaged barcodes
        const helpText = document.createElement('div');
        helpText.innerHTML = isFirefoxMobile ? 
            'Position barcode here - try different angles' : 
            'Align barcode here - works with partial codes';
        helpText.style.cssText = `
            background: rgba(0,0,0,0.6);
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        `;
        
        guide.appendChild(helpText);
        
        // Add a tip about damaged barcodes
        const tipText = document.createElement('div');
        tipText.innerHTML = 'Try rotating damaged barcodes slowly';
        tipText.style.cssText = `
            margin-top: 8px;
            background: rgba(255,255,255,0.2);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
            color: white;
        `;
        
        guideContainer.appendChild(guide);
        guideContainer.appendChild(tipText);
        container.appendChild(guideContainer);
    }

    // SPEED OPTIMIZATION: Minimal scanner guides for speed
    addMinimalScannerGuides() {
        const container = document.getElementById('interactive');
        if (!container) return;
        
        // Remove existing guides
        const existingGuide = document.getElementById('barcode-guide');
        if (existingGuide) existingGuide.remove();
        
        // Create lightweight guide that doesn't impact performance
        const guideContainer = document.createElement('div');
        guideContainer.id = 'barcode-guide';
        guideContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 10;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create minimal guide frame - optimized for performance
        const guide = document.createElement('div');
        guide.style.cssText = `
            width: 85%;
            height: 100px;
            border: 2px dashed rgba(255, 255, 255, 0.7);
            box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.25);
        `;
        
        guideContainer.appendChild(guide);
        container.appendChild(guideContainer);
    }

    // SPEED OPTIMIZATION: Optimized controls for performance
    setupOptimizedControls() {
        // Add essential controls only
        this.addZoomControl();
        
        // SPEED OPTIMIZATION: More efficient resolution control with presets
        const resolution = document.getElementById('scannerResolution');
        if (resolution) {
            resolution.addEventListener('change', () => {
                // SPEED OPTIMIZATION: Store selected value for quick restart
                this.selectedResolution = resolution.value;
                this.restartScannerOptimized();
            });
        }
        
        // Toggle flash
        const toggleFlash = document.getElementById('toggleFlash');
        if (toggleFlash) {
            toggleFlash.addEventListener('click', async () => {
                if (!this.html5QrCode) return;
                
                try {
                    await this.html5QrCode.applyVideoConstraints({
                        advanced: [{
                            torch: !this.flashOn
                        }]
                    });
                    this.flashOn = !this.flashOn;
                    toggleFlash.classList.toggle('bg-yellow-400');
                } catch (err) {
                    console.log("Flash not supported on this device");
                }
            });
        }
        
        // Add camera switching functionality
        const switchCameraBtn = document.getElementById('switchCamera');
        if (switchCameraBtn) {
            switchCameraBtn.addEventListener('click', async () => {
                console.log('Switch camera button clicked');
                
                try {
                    // Stop current scanner
                    if (this.html5QrCode && this.scannerRunning) {
                        console.log('Stopping current camera');
                        await this.html5QrCode.stop();
                        this.scannerRunning = false;
                    }
                    
                    // Show loading message
                    document.getElementById('interactive').innerHTML = 
                        '<div class="w-full h-full flex items-center justify-center">' +
                        '<div class="text-xl text-center">Switching camera...<br/>' +
                        '<span class="text-sm">Please wait</span></div></div>';
                    
                    // Get all available cameras
                    console.log('Getting camera list');
                    const cameras = await Html5Qrcode.getCameras();
                    
                    if (!cameras || cameras.length === 0) {
                        console.error('No cameras found');
                        alert('No cameras available on this device');
                        this.restartScanner();
                        return;
                    }
                    
                    if (cameras.length === 1) {
                        console.log('Only one camera available, cannot switch');
                        alert('Only one camera is available on this device');
                        this.restartScanner();
                        return;
                    }
                    
                    console.log(`Found ${cameras.length} cameras`);
                    
                    // Find the index of the current camera
                    let currentCameraIndex = -1;
                    if (typeof this.currentCamera === 'string') {
                        currentCameraIndex = cameras.findIndex(camera => camera.id === this.currentCamera);
                    }
                    
                    // Get the next camera in the list
                    let nextCameraIndex = 0;
                    if (currentCameraIndex >= 0) {
                        nextCameraIndex = (currentCameraIndex + 1) % cameras.length;
                    }
                    
                    // Save the new camera ID
                    this.currentCamera = cameras[nextCameraIndex].id;
                    console.log(`Switching to camera: ${cameras[nextCameraIndex].label}`);
                    
                    // Restart scanner with new camera
                    this.restartScanner();
                } catch (error) {
                    console.error('Error switching camera:', error);
                    
                    // Try a more generic approach for Netlify and other environments
                    try {
                        console.log('Trying generic camera switch approach');
                        
                        // If current camera is environment, switch to user facing
                        if (!this.isFrontCamera) {
                            this.isFrontCamera = true;
                            this.currentCamera = { facingMode: "user" };
                            console.log('Switching to front camera');
                        } else {
                            this.isFrontCamera = false;
                            this.currentCamera = { facingMode: "environment" };
                            console.log('Switching to back camera');
                        }
                        
                        // Restart with new facing mode
                        this.restartScanner();
                    } catch (fallbackError) {
                        console.error('Fallback camera switch also failed:', fallbackError);
                        alert('Failed to switch camera. Try restarting the scanner.');
                        this.restartScanner();
                    }
                }
            });
        }
    }

    // SPEED OPTIMIZATION: Faster scanner restart
    async restartScannerOptimized() {
        if (!this.html5QrCode) return;
        
        try {
            // SPEED OPTIMIZATION: Stop only scanning, not camera
            this.html5QrCode.pause(true);
            
            // Get optimized camera config based on resolution setting
            const { browserName, isFirefox, isMobile } = this.browserInfo;
            const resolution = this.selectedResolution || 'qvga';
            
            // Apply new settings without full restart
            setTimeout(async () => {
                try {
                    // SPEED OPTIMIZATION: Just update video settings
                    const newConfig = {};
                    
                    if (resolution === 'hd') {
                        newConfig.width = { min: 1280, ideal: 1920, max: 1920 };
                        newConfig.height = { min: 720, ideal: 1080, max: 1080 };
                    } else if (resolution === 'vga') {
                        newConfig.width = { min: 640, ideal: 640, max: 1280 };
                        newConfig.height = { min: 480, ideal: 480, max: 720 };
                    } else { // qvga
                        newConfig.width = { min: 320, ideal: 320, max: 640 };
                        newConfig.height = { min: 240, ideal: 240, max: 480 };
                    }
                    
                    // Apply camera constraints without restarting
                    await this.html5QrCode.applyVideoConstraints({
                        ...newConfig,
                        facingMode: "environment"
                    });
                    
                    // Resume scanning
                    this.html5QrCode.resume();
                } catch (error) {
                    console.error("Error applying settings:", error);
                    // Fall back to full restart if needed
                    this.restartScanner();
                }
            }, 200);
        } catch (err) {
            console.error("Error pausing scanner:", err);
        }
    }

    // Add zoom control slider for better small barcode detection
    addZoomControl() {
        const controlsContainer = document.getElementById('scannerControls');
        if (!controlsContainer) return;
        
        // Remove existing zoom control if any
        const existingZoom = document.getElementById('zoomControl');
        if (existingZoom) existingZoom.remove();
        
        // Get browser info
        const { browserName, isFirefox, isMobile } = getBrowserInfo();
        
        const zoomContainer = document.createElement('div');
        zoomContainer.id = 'zoomControl';
        zoomContainer.className = 'flex items-center gap-2 mt-2 w-full';
        
        // Show appropriate zoom control based on browser
        if (isFirefox) {
            // For Firefox, use digital zoom since native zoom might not be supported
            zoomContainer.innerHTML = `
                <span class="text-xs">Zoom:</span>
                <div class="flex gap-2 flex-1 justify-center">
                    <button id="zoomOut" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded touch-manipulation">
                        <i class="fas fa-search-minus"></i>
                    </button>
                    <button id="zoomIn" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded touch-manipulation">
                        <i class="fas fa-search-plus"></i>
                    </button>
                </div>
                <span class="text-xs" id="zoomLevel">1x</span>
            `;
        } else {
            // For Chrome and others, use the slider approach
            zoomContainer.innerHTML = `
                <span class="text-xs"><i class="fas fa-search-minus"></i></span>
                <input type="range" id="zoomSlider" min="100" max="300" value="100" 
                       class="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-300">
                <span class="text-xs"><i class="fas fa-search-plus"></i></span>
            `;
        }
        
        controlsContainer.parentNode.insertBefore(zoomContainer, controlsContainer.nextSibling);
        
        // Set up appropriate event listeners
        if (isFirefox) {
            // Firefox digital zoom implementation
            this.currentZoom = 1.0;
            const zoomLevel = document.getElementById('zoomLevel');
            
            document.getElementById('zoomIn').addEventListener('click', () => {
                if (this.currentZoom < 3.0) {
                    this.currentZoom += 0.25;
                    this.applyDigitalZoom(this.currentZoom);
                    zoomLevel.textContent = `${this.currentZoom.toFixed(1)}x`;
                }
            });
            
            document.getElementById('zoomOut').addEventListener('click', () => {
                if (this.currentZoom > 1.0) {
                    this.currentZoom -= 0.25;
                    this.applyDigitalZoom(this.currentZoom);
                    zoomLevel.textContent = `${this.currentZoom.toFixed(1)}x`;
                }
            });
        } else {
            // Regular zoom slider for Chrome and others
            const zoomSlider = document.getElementById('zoomSlider');
            if (zoomSlider) {
                zoomSlider.addEventListener('input', async (e) => {
                    if (!this.html5QrCode || !this.scannerRunning) return;
                    
                    try {
                        const zoomValue = parseInt(e.target.value) / 100;
                        await this.html5QrCode.applyVideoConstraints({
                            advanced: [{zoom: zoomValue}]
                        });
                    } catch (error) {
                        console.log("Zoom not supported or error:", error);
                    }
                });
            }
        }
    }

    // Add digital zoom function for Firefox
    applyDigitalZoom(zoomLevel) {
        const container = document.getElementById('interactive');
        if (!container) return;
        
        const video = container.querySelector('video');
        if (!video) return;
        
        const { isFirefox, isMobile } = getBrowserInfo();
        const isFirefoxMobile = isFirefox && isMobile;
        
        if (isFirefoxMobile) {
            // Firefox mobile needs different approach to zooming
            // Scale from center with adjusted transform-origin
            video.style.transformOrigin = '50% 50%';
            video.style.transform = `scale(${zoomLevel})`;
            
            // Apply special Firefox mobile container adjustments
            container.style.overflow = 'hidden';
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
        } else {
            // Regular digital zoom for other browsers
            video.style.transform = `scale(${zoomLevel})`;
            video.style.transformOrigin = 'center center';
        }
        
        // When zoomed in, enable panning by dragging (except Firefox Mobile)
        if (zoomLevel > 1.0 && !isFirefoxMobile) {
            this.enableVideoPanning(container, video);
        } else {
            this.disableVideoPanning(video);
        }
    }

    // Enable dragging/panning the zoomed video
    enableVideoPanning(container, video) {
        if (this.panningEnabled) return;
        this.panningEnabled = true;
        
        let isDragging = false;
        let startX, startY;
        let translateX = 0, translateY = 0;
        
        const startDrag = (e) => {
            if (this.currentZoom <= 1.0) return;
            
            const touchEvent = e.touches ? e.touches[0] : e;
            isDragging = true;
            startX = touchEvent.clientX - translateX;
            startY = touchEvent.clientY - translateY;
            
            // Prevent scanner interactions during drag
            if (this.html5QrCode) {
                this.html5QrCode.pause(true);
            }
        };
        
        const doDrag = (e) => {
            if (!isDragging || this.currentZoom <= 1.0) return;
            e.preventDefault();
            
            const touchEvent = e.touches ? e.touches[0] : e;
            translateX = touchEvent.clientX - startX;
            translateY = touchEvent.clientY - startY;
            
            // Limit panning to reasonable bounds based on zoom level
            const maxOffset = (this.currentZoom - 1) * 100;
            translateX = Math.max(-maxOffset, Math.min(translateX, maxOffset));
            translateY = Math.max(-maxOffset, Math.min(translateY, maxOffset));
            
            video.style.transform = `scale(${this.currentZoom}) translate(${translateX/this.currentZoom}px, ${translateY/this.currentZoom}px)`;
        };
        
        const endDrag = () => {
            isDragging = false;
            
            // Resume scanner after drag ends
            if (this.html5QrCode && this.scannerRunning) {
                setTimeout(() => {
                    this.html5QrCode.resume();
                }, 100);
            }
        };
        
        // Add event listeners for both mouse and touch
        video.addEventListener('mousedown', startDrag);
        video.addEventListener('touchstart', startDrag);
        
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('touchmove', doDrag, { passive: false });
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        
        // Store references to remove later
        this.panHandlers = {
            startDrag, doDrag, endDrag
        };
    }

    disableVideoPanning(video) {
        if (!this.panningEnabled) return;
        
        video.removeEventListener('mousedown', this.panHandlers.startDrag);
        video.removeEventListener('touchstart', this.panHandlers.startDrag);
        
        document.removeEventListener('mousemove', this.panHandlers.doDrag);
        document.removeEventListener('touchmove', this.panHandlers.doDrag);
        
        document.removeEventListener('mouseup', this.panHandlers.endDrag);
        document.removeEventListener('touchend', this.panHandlers.endDrag);
        
        // Reset transform
        video.style.transform = `scale(1)`;
        this.panningEnabled = false;
    }

    // Add these new methods for browser-specific styling
    resetScannerContainerStyles() {
        const container = document.getElementById('interactive');
        if (!container) return;
        
        // Reset to default styling
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        
        // Remove any dynamically added video styles
        const videos = container.querySelectorAll('video');
        videos.forEach(video => {
            video.style.cssText = '';
        });
    }

    fixFirefoxContainerStyles() {
        const container = document.getElementById('interactive');
        if (!container) return;
        
        // Find any videos created by the scanner
        const videos = container.querySelectorAll('video');
        videos.forEach(video => {
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.maxWidth = '100%';
            video.style.position = 'absolute';
            video.style.top = '0';
            video.style.left = '0';
        });
        
        // Ensure container has appropriate size
        container.style.minHeight = '300px';
    }

    // Advanced barcode extraction from damaged, partial or blurry text
    extractBarcodeFromDamagedText(text) {
        // Method 0: If text is already a clean barcode (6-14 digits), return it
        if (/^\d{6,14}$/.test(text)) {
            return text;
        }
        
        console.log('Attempting to extract barcode from damaged text:', text);
        
        // Method 1: Extract all digits from the text
        const extractedDigits = text.replace(/[^0-9]/g, '');
        
        // Method 2: Look for common barcode patterns
        // EAN-13, UPC-A (12 digits), EAN-8, UPC-E (8 digits), etc.
        const standardPatterns = [
            // Find any pattern that looks like a standard barcode format
            text.match(/(?<!\d)\d{13}(?!\d)/),      // EAN-13
            text.match(/(?<!\d)\d{12}(?!\d)/),      // UPC-A
            text.match(/(?<!\d)\d{8}(?!\d)/),       // EAN-8
            text.match(/(?<!\d)0\d{7}(?!\d)/),      // UPC-E
            // Also find partial patterns with some tolerance
            text.match(/(?<!\d)\d{11,13}(?!\d)/),   // Almost EAN/UPC
            text.match(/(?<!\d)\d{7,9}(?!\d)/)      // Almost EAN-8/UPC-E
        ].filter(Boolean)[0];
        
        // Method 3: Find any sequence of at least 6 digits (minimum viable barcode)
        const digitSequence = text.match(/\d{6,}/);
        
        // Method 4: For very damaged codes, try partial matching with at least 4 digits
        const partialDigits = text.match(/\d{4,}/);
        
        // Choose the best extraction based on priority
        if (standardPatterns) {
            console.log('Found standard barcode pattern:', standardPatterns[0]);
            return standardPatterns[0];
        } else if (digitSequence) {
            console.log('Found digit sequence:', digitSequence[0]);
            return digitSequence[0];
        } else if (extractedDigits.length >= 6) {
            console.log('Extracted digits:', extractedDigits);
            return extractedDigits;
        } else if (partialDigits) {
            console.log('Found partial digits:', partialDigits[0]);
            return partialDigits[0];
        }
        
        // Last resort: just return cleaned numeric part or the original
        return extractedDigits.length > 0 ? extractedDigits : text;
    }

    // Add fuzzy/partial barcode matching function
    findProductByPartialBarcode(partialCode) {
        // Skip if too short to be meaningful
        if (!partialCode || partialCode.length < 4) return null;
        
        const products = window.productManager.getAllProducts();
        if (!products || !Array.isArray(products)) {
            console.error('Product list unavailable or invalid');
            return null;
        }
        
        for (const product of products) {
            if (!product || !product.barcode) continue;
            
            // Check for full barcode as substring
            if (product.barcode.includes(partialCode)) {
                console.log('Found product with partial barcode match:', product.barcode);
                return product;
            }
            
            // Check if partial code is at beginning or end of barcode
            if (product.barcode.startsWith(partialCode) || 
                product.barcode.endsWith(partialCode)) {
                console.log('Found product with partial prefix/suffix match:', product.barcode);
                return product;
            }
            
            // For longer partial codes (>6 digits), check for substantial overlap
            if (partialCode.length > 6) {
                // Check if at least 80% of digits match in sequence
                let matches = 0;
                for (let i = 0; i <= product.barcode.length - partialCode.length; i++) {
                    const substr = product.barcode.substring(i, i + partialCode.length);
                    let matchCount = 0;
                    for (let j = 0; j < partialCode.length; j++) {
                        if (substr[j] === partialCode[j]) matchCount++;
                    }
                    if (matchCount / partialCode.length > 0.8) {
                        matches = matchCount;
                        break;
                    }
                }
                
                if (matches / partialCode.length > 0.8) {
                    console.log('Found product with fuzzy barcode match:', product.barcode);
                    return product;
                }
            }
        }
        
        return null;
    }
}

// Initialize scanner after DOM is fully loaded and billing system is ready
window.addEventListener('DOMContentLoaded', () => {
    // Check for camera support
    const checkCameraSupport = () => {
        console.log('Checking camera support...');
        // Check if MediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Browser does not support MediaDevices API. Scanner functionality will be limited.');
            return false;
        }
        return true;
    };

    // Check if running on a secure context
    const isSecureContext = () => {
        // Check if we're in a secure context
        if (window.isSecureContext === true) {
            console.log('Running in secure context, camera should work');
            return true;
        }
        
        // HTTPS check
        if (window.location.protocol === 'https:') {
            console.log('Running on HTTPS, camera should work');
            return true;
        }
        
        // Special case for localhost (which is considered secure)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Running on localhost, camera should work');
            return true;
        }
        
        // Check for Netlify hostnames
        if (window.location.hostname.endsWith('netlify.app') || 
            document.referrer.includes('netlify.app')) {
            console.log('Detected Netlify hosting, camera should work if permissions are granted');
            return true;
        }
        
        console.warn('Not running in a secure context. Camera access may be blocked.');
        return false;
    };

    // Check if the HTML5 QR Code library is loaded
    const waitForLibrary = (callback, maxAttempts = 10) => {
        let attempts = 0;
        
        const checkLibrary = () => {
            if (isHtml5QrcodeLoaded()) {
                console.log('HTML5 QR Code library loaded successfully');
                callback();
                return;
            }
            
            attempts++;
            if (attempts >= maxAttempts) {
                console.log('Library not loaded after multiple attempts, trying dynamic loading...');
                
                // Try to load the library dynamically
                loadHtml5QrcodeLibrary()
                    .then(() => {
                        console.log('Dynamic loading successful, proceeding with scanner initialization');
                        callback();
                    })
                    .catch(err => {
                        console.error('Dynamic loading also failed:', err);
                        alert('Scanner library could not be loaded. Please refresh the page and try again.');
                    });
                return;
            }
            
            console.log(`Waiting for HTML5 QR Code library to load (attempt ${attempts}/${maxAttempts})...`);
            setTimeout(checkLibrary, 500);
        };
        
        checkLibrary();
    };

    // Wait for billing system to be initialized
    const initScanner = () => {
        if (window.billingSystem) {
            console.log('Billing system found, checking scanner prerequisites...');
            
            // Check if we're running in a secure context (required for camera access)
            const secureContext = isSecureContext();
            if (!secureContext) {
                console.warn('Camera access requires HTTPS. Current protocol: ' + window.location.protocol);
                
                // Add warning to buttons
                const buttons = document.querySelectorAll('.scan-barcode-btn');
                buttons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        // Show warning message
                        alert('Camera access requires HTTPS. Your site is currently running on ' + 
                              window.location.protocol + ' which may not support camera access.\n\n' +
                              'Please use a secure connection (https://) to use the scanner.');
                    });
                });
            }
            
            // Check camera support regardless of secure context
            const cameraSupported = checkCameraSupport();
            if (!cameraSupported) {
                // Make scan buttons show a warning instead
                const buttons = document.querySelectorAll('.scan-barcode-btn');
                buttons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        alert('Your browser does not support camera access. Please try a different browser like Chrome or Firefox.');
                    });
                });
            }
            
            // Wait for the HTML5 QR code library to load before creating scanner instance
            waitForLibrary(() => {
                try {
                    // Create scanner instance
                    console.log('Creating OptimizedScanner instance');
                window.optimizedScanner = new OptimizedScanner();
                    
                    // Pre-request camera permission for better user experience
                    if (cameraSupported && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                        console.log('Pre-requesting camera permission...');
                        
                        // Use more specific camera constraints for better compatibility
                        const constraints = {
                            video: {
                                facingMode: 'environment',
                                width: { ideal: 1280 },
                                height: { ideal: 720 }
                            }
                        };
                        
                        navigator.mediaDevices.getUserMedia(constraints)
                            .then(stream => {
                                console.log('Camera permission granted preemptively');
                                
                                // Get camera capabilities
                                const videoTrack = stream.getVideoTracks()[0];
                                if (videoTrack) {
                                    console.log('Camera label:', videoTrack.label);
                                    
                                    try {
                                        const capabilities = videoTrack.getCapabilities();
                                        console.log('Camera capabilities:', capabilities);
                                    } catch (e) {
                                        console.log('Could not get camera capabilities:', e);
                                    }
                                }
                                
                                // Stop the stream immediately
                                stream.getTracks().forEach(track => track.stop());
                                
                                // Set permission flag
                                if (window.optimizedScanner) {
                                    window.optimizedScanner.permissionRequested = true;
                                }
                            })
                            .catch(err => {
                                console.log('Preemptive camera permission check failed:', err);
                                console.log('Will try again when scanner is opened');
                            });
                    }
            } catch (error) {
                console.error('Error initializing scanner:', error);
                    
                    // Try a delayed initialization
                    console.log('Trying delayed initialization in 1 second...');
                    setTimeout(() => {
                        try {
                            if (isHtml5QrcodeLoaded()) {
                                window.optimizedScanner = new OptimizedScanner();
                                console.log('Delayed initialization succeeded');
                            } else {
                                console.error('HTML5 QR Code library still not available');
                                alert('Scanner libraries could not be loaded. Please try refreshing the page.');
                            }
                        } catch (retryError) {
                            console.error('Delayed initialization also failed:', retryError);
                        }
                    }, 1000);
                }
            });
        } else {
            console.log('Waiting for billing system...');
            setTimeout(initScanner, 100);
        }
    };

    initScanner();
});

// Add this function to handle the scanned result based on context
function handleScanResult(decodedText) {
    // Show the result text
    const resultElement = document.getElementById('scanResult');
    if (resultElement) {
        resultElement.textContent = decodedText;
    }
    
    // Check if we're scanning in a specific context
    if (window.scannerContext) {
        if (window.scannerContext.type === 'product') {
            // We're scanning for a product barcode in the product form
            const barcodeInput = document.getElementById(window.scannerContext.inputField);
            if (barcodeInput) {
                barcodeInput.value = decodedText;
                
                // Close the scanner modal
                const scannerModal = document.getElementById('scannerModal');
                if (scannerModal) {
                    scannerModal.classList.add('hidden');
                }
                
                // Stop the scanner
                if (window.scanner && typeof window.scanner.stop === 'function') {
                    window.scanner.stop();
                }
                
                // Reset the context
                window.scannerContext = null;
            }
        }
        // Other contexts can be handled here (billing, inventory, etc.)
    } else {
        // Default behavior for billing or other general scanning
        // ... your existing code for handling scanned products in bills ...
    }
}