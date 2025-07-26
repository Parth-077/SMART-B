class ReportManager {
    constructor() {
        this.setupEventListeners();
        this.updateTodaySale();
        // Update today's sale every minute
        setInterval(() => this.updateTodaySale(), 60000);
    }

    setupEventListeners() {
        // Reports button for bottom nav
        document.querySelector('.nav-button:last-child')?.addEventListener('click', () => this.showReports());

        // Update the total items card click handler
        document.addEventListener('click', (e) => {
            const totalItemsCard = e.target.closest('#totalItemsCard');
            if (totalItemsCard) {
                this.showTotalItemsDetail();
            }
        });

        // Modal close handlers
        document.querySelectorAll('#reportsModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('reportsModal').classList.add('hidden');
                // Hide items detail when closing modal
                document.getElementById('itemsDetailSection').classList.add('hidden');
            });
        });

        // Update the click handler for total sales card
        document.addEventListener('click', (e) => {
            const totalSalesCard = e.target.closest('.report-card');
            if (totalSalesCard && 
                totalSalesCard.querySelector('.text-blue-600') && // Check if it's the sales card
                totalSalesCard.closest('#reportsModal')) {
                this.showTotalSalesDetail();
            }
        });
    }

    showReports() {
        const modal = document.getElementById('reportsModal');
        modal.classList.remove('hidden');
        this.updateReports();
    }

    updateReports() {
        const data = billManager.getReportData();
        
        // Update the reports modal HTML with beautiful cards
        document.getElementById('reportsModal').querySelector('.grid').innerHTML = `
            <div class="report-card bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-blue-600 text-lg font-semibold mb-1">Total Sales</div>
                        <div class="text-3xl font-bold text-gray-800">₹${data.todaySales.toFixed(2)}</div>
                    </div>
                    <div class="bg-blue-100 p-3 rounded-full">
                        <i class="fas fa-chart-line text-2xl text-blue-600"></i>
                    </div>
                </div>
                <div class="text-sm text-blue-600 mt-4">(Click to see details)</div>
            </div>

            <div class="report-card bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-green-600 text-lg font-semibold mb-1">Total Bills</div>
                        <div class="text-3xl font-bold text-gray-800">${data.totalBills}</div>
                    </div>
                    <div class="bg-green-100 p-3 rounded-full">
                        <i class="fas fa-receipt text-2xl text-green-600"></i>
                    </div>
                </div>
                <div class="text-sm text-green-600 mt-4">Today's transactions</div>
            </div>

            <div id="totalItemsCard" class="report-card bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl transform hover:scale-105 transition-all duration-300 cursor-pointer shadow-md hover:shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-yellow-600 text-lg font-semibold mb-1">Total Items</div>
                        <div class="text-3xl font-bold text-gray-800">${data.totalItems}</div>
                    </div>
                    <div class="bg-yellow-100 p-3 rounded-full">
                        <i class="fas fa-box text-2xl text-yellow-600"></i>
                    </div>
                </div>
                <div class="text-sm text-yellow-600 mt-4">(Click to see details)</div>
            </div>

            <div class="report-card bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg">
                <div class="flex items-center justify-between">
                    <div>
                        <div class="text-purple-600 text-lg font-semibold mb-1">Average Bill</div>
                        <div class="text-3xl font-bold text-gray-800">₹${data.averageBillValue.toFixed(2)}</div>
                    </div>
                    <div class="bg-purple-100 p-3 rounded-full">
                        <i class="fas fa-calculator text-2xl text-purple-600"></i>
                    </div>
                </div>
                <div class="text-sm text-purple-600 mt-4">Per transaction</div>
            </div>
        `;

        // Update items list
        this.updateItemsList(data.itemsSold);
    }

    updateItemsList(itemsSold) {
        const itemsList = document.getElementById('itemsSoldList');
        if (!itemsList) return;

        itemsList.innerHTML = '';
        let totalQuantity = 0;
        let totalValue = 0;

        // Convert object to array and sort by quantity
        const sortedItems = Object.entries(itemsSold)
            .map(([id, data]) => ({
                id,
                ...data
            }))
            .sort((a, b) => b.quantity - a.quantity);

        if (sortedItems.length > 0) {
            sortedItems.forEach(item => {
                totalQuantity += item.quantity;
                totalValue += item.total;
                itemsList.innerHTML += `
                    <tr class="hover:bg-gray-50">
                        <td class="p-2 border-b">${item.name}</td>
                        <td class="p-2 border-b text-center">${item.quantity}</td>
                        <td class="p-2 border-b text-right">₹${item.total.toFixed(2)}</td>
                    </tr>
                `;
            });

            // Add total row
            itemsList.innerHTML += `
                <tr class="font-bold bg-gray-50">
                    <td class="p-2 border-b">Total</td>
                    <td class="p-2 border-b text-center">${totalQuantity}</td>
                    <td class="p-2 border-b text-right">₹${totalValue.toFixed(2)}</td>
                </tr>
            `;
        } else {
            itemsList.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-center text-gray-500">No items sold today</td>
                </tr>
            `;
        }

        // Update total items count in the card
        document.getElementById('totalItems').textContent = totalQuantity;
    }

    showTotalItemsDetail() {
        const data = billManager.getReportData();
        const totalItemsSold = data.itemsSold;
        
        let productSales = [];
        for (let product in totalItemsSold) {
            productSales.push({
                name: totalItemsSold[product].name,
                quantity: totalItemsSold[product].quantity
            });
        }
        
        productSales.sort((a, b) => b.quantity - a.quantity);
        
        let detailHTML = `
            <div class="detail-container bg-white rounded-lg shadow-lg p-6 mx-auto max-w-3xl">
                <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center">Products Ranking by Sales</h3>
                <table class="detail-table w-full">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Rank</th>
                            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">Product Name</th>
                            <th class="px-6 py-3 text-right text-sm font-semibold text-gray-600 uppercase tracking-wider">Quantity Sold</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        productSales.forEach((product, index) => {
            const rankClass = index < 3 ? `rank-${index + 1}` : '';
            detailHTML += `
                <tr class="hover:bg-gray-50 transition-colors ${rankClass}">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="rank-badge">${index + 1}</span>
                    </td>
                    <td class="px-6 py-4 text-gray-800">${product.name}</td>
                    <td class="px-6 py-4 text-right text-gray-800 font-medium">${product.quantity}</td>
                </tr>
            `;
        });
        
        detailHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        const itemsSection = document.getElementById('itemsDetailSection');
        if (itemsSection) {
            itemsSection.innerHTML = detailHTML;
            itemsSection.classList.remove('hidden');
            itemsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    updateTodaySale() {
        const todaySale = billManager.getTodaySales();
        document.getElementById('todaySaleAmount').textContent = todaySale.toFixed(2);
    }

    showTotalSalesDetail() {
        const detailHTML = `
            <div class="detail-container bg-white rounded-lg shadow-lg p-6 mx-auto max-w-4xl overflow-y-auto max-h-[80vh]">
                <h3 class="text-2xl font-bold text-gray-800 mb-6 text-center sticky top-0 bg-white pb-4">Sales Analysis</h3>
                
                <!-- Time Period Selector -->
                <div class="flex flex-wrap gap-4 mb-6 justify-center sticky top-14 bg-white pb-4 z-10">
                    <button onclick="reportManager.updateSalesData('week')" 
                            class="period-btn active" data-period="week">
                        This Week
                    </button>
                    <button onclick="reportManager.updateSalesData('month')" 
                            class="period-btn" data-period="month">
                        This Month
                    </button>
                    <button onclick="reportManager.updateSalesData('year')" 
                            class="period-btn" data-period="year">
                        This Year
                    </button>
                    <button onclick="reportManager.showCustomDatePicker()" 
                            class="period-btn" data-period="custom">
                        Custom Range
                    </button>
                </div>

                <!-- View Toggle Buttons -->
                <div class="flex justify-end mb-4 sticky top-32 bg-white z-10">
                    <button onclick="reportManager.printSalesReport()" 
                            class="flex items-center gap-2 text-sm bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg transition-colors mr-2">
                        <i class="fas fa-print"></i>
                        <span>Print</span>
                    </button>
                    <button onclick="reportManager.exportSalesData()" 
                            class="flex items-center gap-2 text-sm bg-green-100 hover:bg-green-200 px-3 py-2 rounded-lg transition-colors mr-2">
                        <i class="fas fa-file-export"></i>
                        <span>Export CSV</span>
                    </button>
                    <button onclick="reportManager.toggleGraph()" 
                            class="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                        <i class="fas fa-chart-line"></i>
                        <span id="graphToggleText">Show Graph</span>
                    </button>
                </div>

                <!-- Custom Date Range Picker (hidden by default) -->
                <div id="customDatePicker" class="hidden mb-6 p-4 bg-gray-50 rounded-lg sticky top-44 z-10">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Start Date</label>
                            <input type="date" id="startDate" class="mt-1 date-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">End Date</label>
                            <input type="date" id="endDate" class="mt-1 date-input">
                        </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                        <button onclick="reportManager.setDatePreset('yesterday')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                            Yesterday
                        </button>
                        <button onclick="reportManager.setDatePreset('last7')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                            Last 7 Days
                        </button>
                        <button onclick="reportManager.setDatePreset('last30')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                            Last 30 Days
                        </button>
                        <button onclick="reportManager.setDatePreset('monthToDate')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                            Month To Date
                        </button>
                        <button onclick="reportManager.setDatePreset('yearToDate')" class="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded transition-colors">
                            Year To Date
                        </button>
                    </div>
                    <button onclick="reportManager.updateSalesData('custom')" 
                            class="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Apply Range
                    </button>
                </div>

                <!-- Sales Data Display -->
                <div id="salesDataContainer" class="mt-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sticky top-44 bg-white z-10 pb-4">
                        <div class="stat-card">
                            <h4>Total Sales</h4>
                            <p id="periodTotalSales">₹0.00</p>
                        </div>
                        <div class="stat-card">
                            <h4>Total Bills</h4>
                            <p id="periodTotalBills">0</p>
                        </div>
                        <div class="stat-card">
                            <h4>Average Bill Value</h4>
                            <p id="periodAvgBill">₹0.00</p>
                        </div>
                    </div>
                    
                    <!-- Additional Insights -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div class="stat-card">
                            <h4>Total Items Sold</h4>
                            <p id="periodTotalItems">0</p>
                        </div>
                        <div class="stat-card">
                            <h4>Avg Items Per Bill</h4>
                            <p id="periodAvgItems">0</p>
                        </div>
                    </div>
                    
                    <!-- Best Day -->
                    <div id="bestDayContainer" class="mt-4 hidden">
                        <div class="bg-green-50 p-4 rounded-lg border border-green-100">
                            <div class="flex items-center">
                                <div class="bg-green-100 p-2 rounded-full mr-3">
                                    <i class="fas fa-trophy text-green-600"></i>
                                </div>
                                <div>
                                    <h4 class="font-medium text-green-800">Highest Sales Day</h4>
                                    <p id="highestSalesDay" class="text-green-700"></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Time Distribution -->
                    <div class="mt-6" id="timeDistributionContainer">
                        <h3 class="text-lg font-semibold mb-3">Sales by Time of Day</h3>
                        <div class="bg-white p-4 rounded-lg shadow-sm">
                            <div class="grid grid-cols-4 gap-2">
                                <div class="time-block morning">
                                    <h5 class="text-sm font-medium">Morning</h5>
                                    <p id="morningDistribution">₹0.00</p>
                                    <p id="morningPercent" class="text-xs text-gray-500">0%</p>
                                </div>
                                <div class="time-block afternoon">
                                    <h5 class="text-sm font-medium">Afternoon</h5>
                                    <p id="afternoonDistribution">₹0.00</p>
                                    <p id="afternoonPercent" class="text-xs text-gray-500">0%</p>
                                </div>
                                <div class="time-block evening">
                                    <h5 class="text-sm font-medium">Evening</h5>
                                    <p id="eveningDistribution">₹0.00</p>
                                    <p id="eveningPercent" class="text-xs text-gray-500">0%</p>
                                </div>
                                <div class="time-block night">
                                    <h5 class="text-sm font-medium">Night</h5>
                                    <p id="nightDistribution">₹0.00</p>
                                    <p id="nightPercent" class="text-xs text-gray-500">0%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Sales Chart (hidden by default) -->
                    <div id="salesChartContainer" class="mt-6 bg-white p-4 rounded-lg shadow hidden">
                        <canvas id="salesChart" style="height: 300px;"></canvas>
                    </div>

                    <!-- Detailed Sales Table -->
                    <div class="mt-6 overflow-x-auto">
                        <table class="detail-table">
                            <thead class="sticky top-0 bg-white">
                                <tr>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('date')">
                                        Date <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('sales')">
                                        Total Sales <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('bills')">
                                        Bills <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('items')">
                                        Items <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('avgBill')">
                                        Avg. Bill <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                    <th class="bg-gray-100 cursor-pointer hover:bg-gray-200" onclick="reportManager.sortSalesTable('avgItems')">
                                        Items/Bill <i class="fas fa-sort text-gray-400 ml-1"></i>
                                    </th>
                                </tr>
                            </thead>
                            <tbody id="salesDetailBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        const itemsSection = document.getElementById('itemsDetailSection');
        if (itemsSection) {
            itemsSection.innerHTML = detailHTML;
            itemsSection.classList.remove('hidden');
            itemsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            this.updateSalesData('week');
        }
    }

    updateSalesData(period) {
        // Update active button state
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.period === period) {
                btn.classList.add('active');
            }
        });

        // Hide custom date picker if not custom period
        document.getElementById('customDatePicker').classList.toggle('hidden', period !== 'custom');

        // Get date range based on period
        const { startDate, endDate } = this.getDateRange(period);
        
        // Validate date range
        if (startDate > endDate) {
            alert('Start date cannot be after end date. Please select valid dates.');
            return;
        }
        
        try {
            // Get sales data from billManager
            const salesData = billManager.getSalesDataForPeriod(startDate, endDate);
            
            // Store the current sales data
            this.currentSalesData = salesData;
            
            // Update UI with the data
            this.updateSalesUI(salesData);
            
            // Only update chart if it's visible
            const chartContainer = document.getElementById('salesChartContainer');
            if (!chartContainer.classList.contains('hidden')) {
                this.updateSalesChart(salesData);
            }
            
            this.updateSalesTable(salesData);
            
            // Add product category analysis
            this.updateProductCategoryAnalysis(startDate, endDate);
        } catch (error) {
            console.error('Error updating sales data:', error);
            alert('An error occurred while updating sales data. Please try again.');
        }
    }

    getDateRange(period) {
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch(period) {
            case 'week':
                // Current week (Sunday to today)
                startDate = new Date(now);
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                // Current month (1st to today)
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                // Current year (Jan 1 to today)
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'yesterday':
                // Just yesterday
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'last7':
                // Last 7 days
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'last30':
                // Last 30 days
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'monthToDate':
                // Month to date (1st of current month to today)
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'yearToDate':
                // Year to date (Jan 1 to today)
                startDate = new Date(now.getFullYear(), 0, 1);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'custom':
                // Custom date range from date picker
                startDate = new Date(document.getElementById('startDate').value);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(document.getElementById('endDate').value);
                endDate.setHours(23, 59, 59, 999);
                break;
        }

        return { startDate, endDate };
    }

    updateSalesUI(salesData) {
        // Update basic stats
        document.getElementById('periodTotalSales').textContent = 
            `₹${salesData.totalSales.toFixed(2)}`;
        document.getElementById('periodTotalBills').textContent = 
            salesData.totalBills;
        
        const avgBill = salesData.totalBills > 0 ? 
            salesData.totalSales / salesData.totalBills : 0;
        
        document.getElementById('periodAvgBill').textContent = 
            `₹${avgBill.toFixed(2)}`;
            
        // Update additional insights
        if (document.getElementById('periodTotalItems')) {
            document.getElementById('periodTotalItems').textContent = 
                salesData.totalItems;
        }
        
        if (document.getElementById('periodAvgItems')) {
            document.getElementById('periodAvgItems').textContent = 
                salesData.avgItemsPerBill;
        }
        
        // Update highest day
        const bestDayContainer = document.getElementById('bestDayContainer');
        if (bestDayContainer && salesData.highestDay.date) {
            bestDayContainer.classList.remove('hidden');
            document.getElementById('highestSalesDay').textContent = 
                `${salesData.highestDay.date}: ₹${salesData.highestDay.sales.toFixed(2)}`;
        } else if (bestDayContainer) {
            bestDayContainer.classList.add('hidden');
        }
        
        // Update time distribution
        this.updateTimeDistribution(salesData);
    }

    updateSalesChart(salesData) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;
        
        const context = ctx.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        // Check if Chart is defined
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded. Please include Chart.js in your project.');
            const chartContainer = document.getElementById('salesChartContainer');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                        <p>Chart could not be displayed. Please ensure Chart.js is properly loaded.</p>
                    </div>
                `;
            }
            return;
        }

        try {
            // Create datasets for sales and bills
            const salesDataset = {
                label: 'Daily Sales',
                data: salesData.dailySales,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                yAxisID: 'y'
            };
            
            // Calculate average bill value for each day
            const avgBillValues = [];
            for (let i = 0; i < salesData.dailySales.length; i++) {
                const bills = salesData.details[i]?.bills || 0;
                avgBillValues.push(bills > 0 ? salesData.dailySales[i] / bills : 0);
            }
            
            const avgBillDataset = {
                label: 'Avg. Bill Value',
                data: avgBillValues,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                yAxisID: 'y',
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            };
            
            // Create a gradient for the background
            const gradient = context.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
            salesDataset.backgroundColor = gradient;
            
            this.salesChart = new Chart(context, {
                type: 'line',
                data: {
                    labels: salesData.dates,
                    datasets: [salesDataset, avgBillDataset]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            titleColor: '#1f2937',
                            bodyColor: '#4b5563',
                            borderColor: '#e5e7eb',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true,
                            usePointStyle: true,
                            callbacks: {
                                title: function(tooltipItems) {
                                    const index = tooltipItems[0].dataIndex;
                                    const date = salesData.details[index]?.date || tooltipItems[0].label;
                                    return date;
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += '₹' + context.parsed.y.toFixed(2);
                                    }
                                    return label;
                                },
                                afterBody: function(tooltipItems) {
                                    const index = tooltipItems[0].dataIndex;
                                    const detail = salesData.details[index];
                                    if (detail) {
                                        return [
                                            '',
                                            `Bills: ${detail.bills}`,
                                            `Items: ${detail.items}`,
                                            `Items/Bill: ${detail.avgItems}`
                                        ];
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return '₹' + value.toFixed(0);
                                },
                                font: {
                                    size: 11
                                }
                            }
                        }
                    },
                    animations: {
                        tension: {
                            duration: 1000,
                            easing: 'linear'
                        }
                    }
                }
            });
            
            // Show the chart container
            const chartContainer = document.getElementById('salesChartContainer');
            if (chartContainer) {
                chartContainer.classList.remove('hidden');
                document.getElementById('graphToggleText').textContent = 'Hide Graph';
            }
        } catch (error) {
            console.error('Error creating chart:', error);
            // Create a fallback message
            const chartContainer = document.getElementById('salesChartContainer');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <div class="p-4 bg-yellow-50 text-yellow-700 rounded-lg">
                        <p>Chart could not be displayed. Error: ${error.message}</p>
                    </div>
                `;
            }
        }
    }

    updateSalesTable(salesData) {
        const tbody = document.getElementById('salesDetailBody');
        tbody.innerHTML = '';

        if (salesData.details.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-gray-500">
                        <div class="flex flex-col items-center justify-center p-4">
                            <i class="fas fa-chart-bar text-gray-300 text-4xl mb-2"></i>
                            <p>No sales data available for this period</p>
                            <p class="text-sm text-gray-400 mt-1">Try selecting a different date range</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Calculate trends for visual indicators
        const details = [...salesData.details].reverse(); // Most recent first
        
        details.forEach((day, index) => {
            // Calculate trend (compare with previous day if available)
            let trendIcon = '';
            let trendClass = '';
            
            if (index < details.length - 1) {
                const prevDay = details[index + 1];
                if (day.sales > prevDay.sales) {
                    trendIcon = '<i class="fas fa-arrow-up text-green-500 ml-1"></i>';
                    trendClass = 'text-green-600';
                } else if (day.sales < prevDay.sales) {
                    trendIcon = '<i class="fas fa-arrow-down text-red-500 ml-1"></i>';
                    trendClass = 'text-red-600';
                } else {
                    trendIcon = '<i class="fas fa-minus text-gray-500 ml-1"></i>';
                    trendClass = 'text-gray-600';
                }
            }
            
            // Calculate percentage of items per bill for visual bar
            const maxItemsPerBill = 10; // Assuming 10 is a good benchmark
            const itemsPercentage = Math.min((day.avgItems / maxItemsPerBill) * 100, 100);
            
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                    <td class="py-3 px-4 font-medium">
                        ${day.date}
                        <div class="text-xs text-gray-500">${new Date(day.date).toLocaleDateString('en-IN', {weekday: 'short'})}</div>
                    </td>
                    <td class="py-3 px-4 ${trendClass} font-semibold">
                        ₹${day.sales.toFixed(2)}
                        ${trendIcon}
                    </td>
                    <td class="py-3 px-4 text-center">${day.bills}</td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center">
                            <span class="mr-2">${day.items}</span>
                            <div class="w-16 bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${itemsPercentage}%"></div>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4 text-right">₹${day.avgBill.toFixed(2)}</td>
                    <td class="py-3 px-4 text-center text-sm">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${day.avgItems} items/bill</span>
                    </td>
                </tr>
            `;
        });
        
        // Add a table footer with totals
        const totalSales = details.reduce((sum, day) => sum + day.sales, 0);
        const totalBills = details.reduce((sum, day) => sum + day.bills, 0);
        const totalItems = details.reduce((sum, day) => sum + day.items, 0);
        const avgBill = totalBills > 0 ? totalSales / totalBills : 0;
        const avgItems = totalBills > 0 ? (totalItems / totalBills).toFixed(1) : 0;
        
        tbody.innerHTML += `
            <tr class="bg-gray-50 font-semibold border-t-2 border-gray-300">
                <td class="py-3 px-4">TOTAL</td>
                <td class="py-3 px-4">₹${totalSales.toFixed(2)}</td>
                <td class="py-3 px-4 text-center">${totalBills}</td>
                <td class="py-3 px-4 text-center">${totalItems}</td>
                <td class="py-3 px-4 text-right">₹${avgBill.toFixed(2)}</td>
                <td class="py-3 px-4 text-center">${avgItems} avg</td>
            </tr>
        `;
    }

    showCustomDatePicker() {
        document.getElementById('customDatePicker').classList.remove('hidden');
    }

    toggleGraph() {
        const chartContainer = document.getElementById('salesChartContainer');
        const toggleText = document.getElementById('graphToggleText');
        
        if (chartContainer.classList.contains('hidden')) {
            chartContainer.classList.remove('hidden');
            toggleText.textContent = 'Hide Graph';
            // Update chart if it exists
            if (this.currentSalesData) {
                this.updateSalesChart(this.currentSalesData);
            }
        } else {
            chartContainer.classList.add('hidden');
            toggleText.textContent = 'Show Graph';
        }
    }

    updateProductCategoryAnalysis(startDate, endDate) {
        // Get bills within the date range
        const bills = this.getBillsInDateRange(startDate, endDate);
        
        // Create category map
        const categoryData = {};
        let totalSales = 0;
        
        // Process each bill
        bills.forEach(bill => {
            bill.items.forEach(item => {
                // Use product category or "Uncategorized" if not available
                const category = this.getProductCategory(item.id) || 'Uncategorized';
                
                if (!categoryData[category]) {
                    categoryData[category] = {
                        sales: 0,
                        count: 0
                    };
                }
                
                categoryData[category].sales += item.total;
                categoryData[category].count += item.quantity;
                totalSales += item.total;
            });
        });
        
        // Create the category analysis HTML if there's relevant data
        if (totalSales > 0) {
            this.displayCategoryAnalysis(categoryData, totalSales);
        }
    }
    
    getBillsInDateRange(startDate, endDate) {
        return billManager.bills.filter(bill => {
            const billDate = new Date(bill.timestamp);
            return billDate >= startDate && billDate <= endDate;
        });
    }
    
    getProductCategory(productId) {
        // Get the product from product manager
        const product = window.productManager?.products.find(p => p.id.toString() === productId.toString());
        return product?.category || 'Uncategorized';
    }
    
    displayCategoryAnalysis(categoryData, totalSales) {
        // Check if container exists, if not create it
        let container = document.getElementById('categorySalesContainer');
        if (!container) {
            const salesDataContainer = document.getElementById('salesDataContainer');
            if (!salesDataContainer) return;
            
            container = document.createElement('div');
            container.id = 'categorySalesContainer';
            container.className = 'mt-8';
            salesDataContainer.appendChild(container);
        }
        
        // Sort categories by sales amount
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].sales - a[1].sales)
            .slice(0, 5); // Top 5 categories
        
        // Create HTML
        let html = `
            <h3 class="text-lg font-semibold mb-4">Top Categories</h3>
            <div class="grid grid-cols-1 gap-4 mb-6">
        `;
        
        sortedCategories.forEach(([category, data]) => {
            const percentage = ((data.sales / totalSales) * 100).toFixed(1);
            html += `
                <div class="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center">
                        <div>
                            <h4 class="font-medium text-gray-700">${category}</h4>
                            <p class="text-sm text-gray-500">Items sold: ${data.count}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-lg font-bold">₹${data.sales.toFixed(2)}</p>
                            <p class="text-sm text-gray-500">${percentage}% of sales</p>
                        </div>
                    </div>
                    <div class="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        
        // Add the HTML to the container
        container.innerHTML = html;
    }

    updateTimeDistribution(salesData) {
        if (!salesData.timeDistribution) return;
        
        const { morning, afternoon, evening, night } = salesData.timeDistribution;
        const total = morning + afternoon + evening + night;
        
        if (total === 0) return;
        
        document.getElementById('morningDistribution').textContent = `₹${morning.toFixed(2)}`;
        document.getElementById('afternoonDistribution').textContent = `₹${afternoon.toFixed(2)}`;
        document.getElementById('eveningDistribution').textContent = `₹${evening.toFixed(2)}`;
        document.getElementById('nightDistribution').textContent = `₹${night.toFixed(2)}`;
        
        document.getElementById('morningPercent').textContent = `${Math.round((morning / total) * 100)}%`;
        document.getElementById('afternoonPercent').textContent = `${Math.round((afternoon / total) * 100)}%`;
        document.getElementById('eveningPercent').textContent = `${Math.round((evening / total) * 100)}%`;
        document.getElementById('nightPercent').textContent = `${Math.round((night / total) * 100)}%`;
    }

    sortSalesTable(column) {
        // Initialize sort properties if they don't exist
        if (!this.currentSortColumn) {
            this.currentSortColumn = 'date';
            this.currentSortDirection = true; // true = ascending, false = descending
        }
        
        // Toggle sort direction if clicking the same column
        if (this.currentSortColumn === column) {
            this.currentSortDirection = !this.currentSortDirection;
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = true; // Default to ascending for new column
        }
        
        // Update sort icons
        document.querySelectorAll('.detail-table th i').forEach(icon => {
            icon.className = 'fas fa-sort text-gray-400 ml-1';
        });
        
        // Find the clicked header and update its icon
        const headers = document.querySelectorAll('.detail-table th');
        let headerIndex = 0;
        
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].textContent.toLowerCase().includes(this.getColumnName(column))) {
                headerIndex = i;
                const icon = headers[i].querySelector('i');
                icon.className = this.currentSortDirection 
                    ? 'fas fa-sort-up text-blue-500 ml-1' 
                    : 'fas fa-sort-down text-blue-500 ml-1';
                break;
            }
        }
        
        // Get all rows except the total row (last row)
        const table = document.querySelector('.detail-table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        
        // Find and remove the total row if it exists
        let totalRow = null;
        if (rows.length > 0 && rows[rows.length - 1].querySelector('td:first-child')?.textContent.trim() === 'TOTAL') {
            totalRow = rows.pop();
        }
        
        // Sort the rows
        rows.sort((a, b) => {
            const aCell = a.querySelector(`td:nth-child(${headerIndex + 1})`);
            const bCell = b.querySelector(`td:nth-child(${headerIndex + 1})`);
            
            if (!aCell || !bCell) return 0;
            
            let aValue = aCell.textContent.trim();
            let bValue = bCell.textContent.trim();
            
            // Handle different data types
            if (column === 'date') {
                // Parse dates - extract just the date part before any newlines
                const aDate = new Date(aValue.split('\n')[0]);
                const bDate = new Date(bValue.split('\n')[0]);
                return this.currentSortDirection ? aDate - bDate : bDate - aDate;
            } else if (column === 'sales' || column === 'avgBill') {
                // Parse currency values
                const aNum = parseFloat(aValue.replace(/[₹,]/g, ''));
                const bNum = parseFloat(bValue.replace(/[₹,]/g, ''));
                return this.currentSortDirection ? aNum - bNum : bNum - aNum;
            } else if (column === 'bills' || column === 'items') {
                // Parse integers
                const aNum = parseInt(aValue.replace(/,/g, ''));
                const bNum = parseInt(bValue.replace(/,/g, ''));
                return this.currentSortDirection ? aNum - bNum : bNum - aNum;
            } else if (column === 'avgItems') {
                // Parse from the badge text
                const aMatch = aValue.match(/[\d.]+/);
                const bMatch = bValue.match(/[\d.]+/);
                const aNum = aMatch ? parseFloat(aMatch[0]) : 0;
                const bNum = bMatch ? parseFloat(bMatch[0]) : 0;
                return this.currentSortDirection ? aNum - bNum : bNum - aNum;
            } else {
                // Default string comparison
                return this.currentSortDirection ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
        });
        
        // Clear the tbody and append sorted rows
        tbody.innerHTML = '';
        rows.forEach(row => tbody.appendChild(row));
        
        // Append the total row at the end if it exists
        if (totalRow) {
            tbody.appendChild(totalRow);
        }
    }
    
    getColumnName(column) {
        switch(column) {
            case 'date': return 'date';
            case 'sales': return 'total sales';
            case 'bills': return 'bills';
            case 'items': return 'items';
            case 'avgBill': return 'avg. bill';
            case 'avgItems': return 'items/bill';
            default: return column;
        }
    }

    isDate(text) {
        const date = new Date(text);
        return !isNaN(date.getTime());
    }

    exportSalesData() {
        // Check if we have sales data
        if (!this.currentSalesData || !this.currentSalesData.details || this.currentSalesData.details.length === 0) {
            alert('No sales data available to export');
            return;
        }
        
        // Create CSV header
        let csvContent = 'Date,Day,Total Sales,Bills,Items,Avg. Bill Value,Avg. Items/Bill\n';
        
        // Add data rows
        this.currentSalesData.details.forEach(day => {
            const dayOfWeek = new Date(day.date).toLocaleDateString('en-IN', {weekday: 'short'});
            csvContent += `${day.date},${dayOfWeek},${day.sales.toFixed(2)},${day.bills},${day.items},${day.avgBill.toFixed(2)},${day.avgItems}\n`;
        });
        
        // Add total row
        const totalSales = this.currentSalesData.details.reduce((sum, day) => sum + day.sales, 0);
        const totalBills = this.currentSalesData.details.reduce((sum, day) => sum + day.bills, 0);
        const totalItems = this.currentSalesData.details.reduce((sum, day) => sum + day.items, 0);
        const avgBill = totalBills > 0 ? totalSales / totalBills : 0;
        const avgItems = totalBills > 0 ? (totalItems / totalBills).toFixed(1) : 0;
        
        csvContent += `TOTAL,,${totalSales.toFixed(2)},${totalBills},${totalItems},${avgBill.toFixed(2)},${avgItems}\n`;
        
        // Create a downloadable link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set link properties
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        // Append to document, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    setDatePreset(preset) {
        const customDatePicker = document.getElementById('customDatePicker');
        if (customDatePicker) {
            const { startDate, endDate } = this.getDateRange(preset);
            document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
        }
    }
    
    printSalesReport() {
        // Check if we have sales data
        if (!this.currentSalesData || !this.currentSalesData.details || this.currentSalesData.details.length === 0) {
            alert('No sales data available to print');
            return;
        }
        
        // Create a new window for the printable report
        const printWindow = window.open('', '_blank');
        
        // Get shop details from settings
        const settings = window.settingsManager?.settings || {};
        const shopName = settings.shopName || 'Retail Store';
        const address = settings.address || '';
        
        // Get date range info
        let dateRangeText = 'All Time';
        if (this.currentPeriod === 'week') {
            dateRangeText = 'Last 7 Days';
        } else if (this.currentPeriod === 'month') {
            dateRangeText = 'Last 30 Days';
        } else if (this.currentPeriod === 'year') {
            dateRangeText = 'Last Year';
        } else if (this.currentPeriod === 'custom') {
            const startDateStr = document.getElementById('startDate').value;
            const endDateStr = document.getElementById('endDate').value;
            dateRangeText = `${startDateStr} to ${endDateStr}`;
        }
        
        // Build the HTML content for printing
        const totalSales = this.currentSalesData.details.reduce((sum, day) => sum + day.sales, 0);
        const totalBills = this.currentSalesData.details.reduce((sum, day) => sum + day.bills, 0);
        const totalItems = this.currentSalesData.details.reduce((sum, day) => sum + day.items, 0);
        
        let printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sales Report - ${dateRangeText}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                    h1, h2 { text-align: center; margin: 5px 0; }
                    .shop-details { text-align: center; margin-bottom: 20px; }
                    .report-header { text-align: center; margin-bottom: 20px; }
                    .summary { display: flex; justify-content: space-around; margin: 20px 0; text-align: center; }
                    .summary-item { padding: 10px; }
                    .summary-item h3 { margin: 0; font-size: 14px; color: #666; }
                    .summary-item p { margin: 5px 0; font-size: 18px; font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #f2f2f2; }
                    .total-row { font-weight: bold; background-color: #f5f5f5; }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="shop-details">
                    <h1>${shopName}</h1>
                    <p>${address}</p>
                </div>
                
                <div class="report-header">
                    <h2>Sales Report</h2>
                    <p>Period: ${dateRangeText}</p>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-item">
                        <h3>Total Sales</h3>
                        <p>₹${totalSales.toFixed(2)}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Total Bills</h3>
                        <p>${totalBills}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Total Items</h3>
                        <p>${totalItems}</p>
                    </div>
                    <div class="summary-item">
                        <h3>Avg. Bill Value</h3>
                        <p>₹${(totalSales / totalBills).toFixed(2)}</p>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Total Sales</th>
                            <th>Bills</th>
                            <th>Items</th>
                            <th>Avg. Bill</th>
                            <th>Items/Bill</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        // Add rows for each day
        this.currentSalesData.details.forEach(day => {
            printContent += `
                <tr>
                    <td>${day.date}</td>
                    <td>₹${day.sales.toFixed(2)}</td>
                    <td>${day.bills}</td>
                    <td>${day.items}</td>
                    <td>₹${day.avgBill.toFixed(2)}</td>
                    <td>${day.avgItems}</td>
                </tr>
            `;
        });
        
        // Add total row
        const avgBill = totalBills > 0 ? totalSales / totalBills : 0;
        const avgItems = totalBills > 0 ? (totalItems / totalBills).toFixed(1) : 0;
        
        printContent += `
                        <tr class="total-row">
                            <td>TOTAL</td>
                            <td>₹${totalSales.toFixed(2)}</td>
                            <td>${totalBills}</td>
                            <td>${totalItems}</td>
                            <td>₹${avgBill.toFixed(2)}</td>
                            <td>${avgItems}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Print Report
                    </button>
                </div>
            </body>
            </html>
        `;
        
        // Write to the new window and open print dialog
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.onload = function() {
            // Automatically open print dialog when content is loaded
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    }

    /**
     * Generate refund report
     * @param {Date} startDate - Start date for report
     * @param {Date} endDate - End date for report
     * @returns {Object} Refund report data
     */
    generateRefundReport(startDate, endDate) {
        console.log('Generating refund report:', startDate, endDate);
        
        try {
            // Get refunds from refundManager
            let refunds = [];
            if (window.refundManager && Array.isArray(window.refundManager.refunds)) {
                refunds = window.refundManager.refunds;
            } else {
                refunds = JSON.parse(localStorage.getItem('refunds') || '[]');
            }
            
            // Filter refunds by date range
            const filteredRefunds = refunds.filter(refund => {
                const refundDate = new Date(refund.date);
                return refundDate >= startDate && refundDate <= endDate;
            });
            
            // Calculate total refund amount
            const totalRefundAmount = filteredRefunds.reduce((total, refund) => total + (refund.amount || 0), 0);
            
            // Count refunds by type
            const refundCount = filteredRefunds.filter(r => r.type === 'refund').length;
            const exchangeCount = filteredRefunds.filter(r => r.type === 'exchange').length;
            
            // Count refunds by reason
            const reasonCounts = {};
            filteredRefunds.forEach(refund => {
                const reason = refund.reason || 'unknown';
                reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
            });
            
            // Get most frequently returned products
            const returnedProducts = {};
            filteredRefunds.forEach(refund => {
                if (refund.items && Array.isArray(refund.items)) {
                    refund.items.forEach(item => {
                        const productName = item.name || 'Unknown Product';
                        const barcode = item.barcode || 'N/A';
                        const key = `${productName}|${barcode}`;
                        
                        returnedProducts[key] = returnedProducts[key] || {
                            name: productName,
                            barcode: barcode,
                            count: 0,
                            quantity: 0,
                            amount: 0
                        };
                        
                        returnedProducts[key].count++;
                        returnedProducts[key].quantity += item.quantity || 1;
                        returnedProducts[key].amount += (item.price || 0) * (item.quantity || 1);
                    });
                }
            });
            
            // Convert to array and sort by count
            const topReturnedProducts = Object.values(returnedProducts)
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10);
            
            // Format as report
            return {
                startDate,
                endDate,
                totalRefunds: filteredRefunds.length,
                totalRefundAmount,
                refundCount,
                exchangeCount,
                reasonCounts,
                topReturnedProducts,
                refunds: filteredRefunds
            };
        } catch (error) {
            console.error('Error generating refund report:', error);
            return {
                startDate,
                endDate,
                totalRefunds: 0,
                totalRefundAmount: 0,
                refundCount: 0,
                exchangeCount: 0,
                reasonCounts: {},
                topReturnedProducts: [],
                refunds: [],
                error: error.message
            };
        }
    }

    /**
     * Display refund report in UI
     */
    displayRefundReport(reportData) {
        console.log('Displaying refund report');
        
        const reportContainer = document.getElementById('refundReportContainer');
        if (!reportContainer) {
            console.error('Refund report container not found');
            return;
        }
        
        // Format date range
        const startDateStr = reportData.startDate.toLocaleDateString();
        const endDateStr = reportData.endDate.toLocaleDateString();
        
        // HTML for report
        reportContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md">
                <h2 class="text-xl font-bold mb-4">Refund Report (${startDateStr} - ${endDateStr})</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-red-50 p-4 rounded-lg border border-red-100">
                        <div class="text-sm text-red-600 mb-1">Total Refund Amount</div>
                        <div class="text-2xl font-bold">₹${reportData.totalRefundAmount.toFixed(2)}</div>
                    </div>
                    
                    <div class="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div class="text-sm text-blue-600 mb-1">Refunds</div>
                        <div class="text-2xl font-bold">${reportData.refundCount}</div>
                    </div>
                    
                    <div class="bg-green-50 p-4 rounded-lg border border-green-100">
                        <div class="text-sm text-green-600 mb-1">Exchanges</div>
                        <div class="text-2xl font-bold">${reportData.exchangeCount}</div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h3 class="text-lg font-medium mb-3">Refund Reasons</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full bg-white border border-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-2 px-4 border-b text-left text-sm font-medium text-gray-500">Reason</th>
                                    <th class="py-2 px-4 border-b text-center text-sm font-medium text-gray-500">Count</th>
                                    <th class="py-2 px-4 border-b text-center text-sm font-medium text-gray-500">Percentage</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${this.generateReasonRows(reportData.reasonCounts, reportData.totalRefunds)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                ${this.generateTopReturnedProductsHTML(reportData.topReturnedProducts)}
            </div>
        `;
    }

    /**
     * Generate HTML rows for refund reasons
     */
    generateReasonRows(reasonCounts, totalRefunds) {
        if (!reasonCounts || !Object.keys(reasonCounts).length) {
            return '<tr><td colspan="3" class="py-3 px-4 text-center text-gray-500">No data available</td></tr>';
        }
        
        // Convert to array and sort by count
        const reasons = Object.entries(reasonCounts)
            .map(([reason, count]) => ({ reason, count }))
            .sort((a, b) => b.count - a.count);
        
        return reasons.map(item => {
            const percentage = totalRefunds > 0 ? (item.count / totalRefunds * 100).toFixed(1) : 0;
            return `
                <tr>
                    <td class="py-2 px-4 text-sm">${this.formatReasonText(item.reason)}</td>
                    <td class="py-2 px-4 text-sm text-center">${item.count}</td>
                    <td class="py-2 px-4 text-sm text-center">
                        <div class="flex items-center">
                            <div class="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                            </div>
                            <span>${percentage}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
     * Generate HTML for top returned products
     */
    generateTopReturnedProductsHTML(products) {
        if (!products || products.length === 0) {
            return '';
        }
        
        return `
            <div>
                <h3 class="text-lg font-medium mb-3">Most Returned Products</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white border border-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="py-2 px-4 border-b text-left text-sm font-medium text-gray-500">Product</th>
                                <th class="py-2 px-4 border-b text-center text-sm font-medium text-gray-500">Quantity</th>
                                <th class="py-2 px-4 border-b text-right text-sm font-medium text-gray-500">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">
                            ${products.map(product => `
                                <tr>
                                    <td class="py-2 px-4 text-sm">
                                        ${product.name}
                                        <div class="text-xs text-gray-500">${product.barcode}</div>
                                    </td>
                                    <td class="py-2 px-4 text-sm text-center">${product.quantity}</td>
                                    <td class="py-2 px-4 text-sm text-right">₹${product.amount.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

// Initialize report manager
const reportManager = new ReportManager(); 