/**
 * @file Statistics Modal Service
 * Handles real-time statistics visualization for individual BitAxe miners
 * Features Chart.js integration with dual Y-axis charts
 */

const statisticsModal = (() => {
    let currentChart = null;
    let pollInterval = null;
    let currentInstanceId = null;

    /**
     * Formats hashrate with appropriate units (MH/s, GH/s, TH/s)
     * @param {number} hashrate - Hashrate in GH/s
     * @returns {string} Formatted hashrate string
     */
    function formatHashrate(hashrate) {
        if (typeof hashrate !== 'number' || isNaN(hashrate) || hashrate < 0) {
            return 'N/A';
        }

        if (hashrate < 1) {
            return `${(hashrate * 1000).toFixed(1)} Mh/s`;
        } else if (hashrate < 1000) {
            return `${hashrate.toFixed(1)} Gh/s`;
        } else {
            return `${(hashrate / 1000).toFixed(2)} Th/s`;
        }
    }

    /**
     * Creates and displays the statistics modal for a specific miner instance
     * @param {string} instanceId - The ID of the miner instance to show statistics for
     */
    function openStatisticsModal(instanceId) {
        const existingModal = document.getElementById('statistics-modal');
        if (existingModal) existingModal.remove();

        currentInstanceId = instanceId;

        const modalHtml = generateModalHtml(instanceId);
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('statistics-modal');
        const closeModal = () => {
            stopPolling();
            if (currentChart) {
                currentChart.destroy();
                currentChart = null;
            }
            modal.remove();
        };

        // Event listeners
        modal.querySelector('.close-button').addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { 
            if (event.target === modal) closeModal(); 
        });

        // Initialize chart and start data polling
        initializeChart();
        startPolling();
    }

    /**
     * Generates the HTML structure for the statistics modal
     * @param {string} instanceId - The miner instance ID
     * @returns {string} The complete HTML for the modal
     */
    function generateModalHtml(instanceId) {
        return `
            <div id="statistics-modal" class="modal">
                <div class="modal-content">
                    <div class="statistics-modal-header">
                        <h2>${instanceId} - Real-time Statistics</h2>
                        <span class="close-button">&times;</span>
                    </div>
                    <div class="statistics-modal-body">
                        <div class="stats-status-info">
                            <div class="stats-status-left">
                                <div class="stats-status-item">
                                    <span id="stats-status-indicator" class="stats-status-indicator"></span>
                                    <span id="stats-status-text">Connecting...</span>
                                </div>
                                <div class="stats-status-item">
                                    <span>Update interval: 25s</span>
                                </div>
                            </div>
                            <div class="stats-last-update" id="stats-last-update">
                                Initializing...
                            </div>
                        </div>
                        <div class="stats-chart-legend">
                            <div class="stats-legend-item">
                                <div class="stats-legend-color hashrate"></div>
                                <span>Hashrate</span>
                            </div>
                            <div class="stats-legend-item">
                                <div class="stats-legend-color temperature"></div>
                                <span>ASIC Temp</span>
                            </div>
                        </div>
                        <div class="stats-chart-container">
                            <div id="stats-loading" class="stats-loading">
                                <div class="stats-loading-spinner"></div>
                                <span>Loading statistics data...</span>
                            </div>
                            <div id="stats-error" class="stats-error" style="display: none;">
                                <div class="stats-error-icon">⚠</div>
                                <div>Failed to load statistics data</div>
                                <div style="font-size: 0.9em; margin-top: 5px;" id="error-message"></div>
                            </div>
                            <div class="stats-chart-wrapper" style="display: none;">
                                <canvas id="statistics-chart" class="stats-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Initializes the Chart.js chart with dual Y-axis configuration
     */
    function initializeChart() {
        const canvas = document.getElementById('statistics-chart');
        const ctx = canvas.getContext('2d');

        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Hashrate',
                        data: [],
                        backgroundColor: 'rgba(255, 23, 68, 0.2)',
                        borderColor: '#FF1744',
                        borderWidth: 1.5,
                        fill: true,
                        pointRadius: 2,
                        pointBackgroundColor: 'transparent',
                        pointBorderColor: '#FF1744',
                        pointBorderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y'
                    },
                    {
                        label: 'ASIC Temperature',
                        data: [],
                        backgroundColor: 'transparent',
                        borderColor: '#f5f5f5',
                        borderWidth: 2,
                        fill: false,
                        pointRadius: 2,
                        pointBackgroundColor: 'transparent',
                        pointBorderColor: '#f5f5f5',
                        pointBorderWidth: 2,
                        tension: 0.1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // Disable animations for real-time feel
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false // We have custom legend
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    // Hashrate
                                    label += formatHashrate(context.parsed.y);
                                } else {
                                    // Temperature
                                    label += parseFloat(context.parsed.y).toFixed(1) + ' °C';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                            displayFormats: {
                                hour: 'HH:mm'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time',
                            color: '#666'
                        },
                        grid: {
                            color: 'rgba(200, 200, 200, 0.3)'
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Hashrate',
                            color: '#FF1744'
                        },
                        ticks: {
                            color: '#FF1744',
                            callback: function(value) {
                                return formatHashrate(value);
                            }
                        },
                        grid: {
                            color: 'rgba(255, 23, 68, 0.1)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'ASIC Temp',
                            color: '#f5f5f5'
                        },
                        ticks: {
                            color: '#f5f5f5',
                            callback: function(value) {
                                return parseFloat(value).toFixed(1) + '°C';
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                            color: 'rgba(245, 245, 245, 0.3)'
                        },
                        suggestedMin: 50,
                        suggestedMax: 80
                    }
                }
            }
        });
    }

    /**
     * Fetches statistics data from the backend API
     * @returns {Promise<Object>} The statistics data
     */
    async function fetchStatisticsData() {
        try {
            const response = await fetch(`/api/statistics?instanceId=${encodeURIComponent(currentInstanceId)}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'API request failed');
            }

            return result.data;
        } catch (error) {
            console.error('Failed to fetch statistics:', error);
            throw error;
        }
    }

    /**
     * Processes and adds new data points to the chart
     * @param {Object} statisticsData - The raw statistics data from the API
     */
    function updateChart(statisticsData) {
        if (!currentChart || !statisticsData || !statisticsData.statistics) {
            return;
        }

        const statistics = statisticsData.statistics;
        const currentTimestamp = statisticsData.currentTimestamp;

        // Clear existing data and rebuild from scratch for consistency
        currentChart.data.labels = [];
        currentChart.data.datasets[0].data = [];
        currentChart.data.datasets[1].data = [];

        // Process each data point
        statistics.forEach(dataPoint => {
            if (dataPoint && dataPoint.length >= 4) {
                const hashrate = dataPoint[0]; // GH/s
                const temperature = dataPoint[1]; // °C  
                const power = dataPoint[2]; // Watts (unused for now)
                const timeOffset = dataPoint[3]; // milliseconds offset

                // Calculate actual timestamp
                const actualTimestamp = new Date().getTime() - currentTimestamp + timeOffset;
                
                currentChart.data.labels.push(actualTimestamp);
                currentChart.data.datasets[0].data.push(hashrate);
                currentChart.data.datasets[1].data.push(temperature);
            }
        });

        // Limit data points to prevent performance issues (keep last 500 points)
        const maxPoints = 500;
        if (currentChart.data.labels.length > maxPoints) {
            const excess = currentChart.data.labels.length - maxPoints;
            currentChart.data.labels.splice(0, excess);
            currentChart.data.datasets[0].data.splice(0, excess);
            currentChart.data.datasets[1].data.splice(0, excess);
        }

        currentChart.update('none'); // Update without animation
        updateStatusIndicators(true);
    }

    /**
     * Updates the status indicators and timestamps
     * @param {boolean} success - Whether the last update was successful
     * @param {string} errorMessage - Error message if applicable
     */
    function updateStatusIndicators(success, errorMessage = null) {
        const statusIndicator = document.getElementById('stats-status-indicator');
        const statusText = document.getElementById('stats-status-text');
        const lastUpdate = document.getElementById('stats-last-update');

        if (success) {
            statusIndicator.className = 'stats-status-indicator';
            statusText.textContent = 'Live';
            lastUpdate.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
        } else {
            statusIndicator.className = 'stats-status-indicator error';
            statusText.textContent = 'Error';
            lastUpdate.textContent = errorMessage || 'Connection failed';
        }
    }

    /**
     * Shows error state in the modal
     * @param {string} message - Error message to display
     */
    function showError(message) {
        const loading = document.getElementById('stats-loading');
        const error = document.getElementById('stats-error');
        const chartWrapper = document.querySelector('.stats-chart-wrapper');
        const errorMessage = document.getElementById('error-message');

        loading.style.display = 'none';
        chartWrapper.style.display = 'none';
        error.style.display = 'flex';
        errorMessage.textContent = message;

        updateStatusIndicators(false, message);
    }

    /**
     * Shows the chart and hides loading/error states
     */
    function showChart() {
        const loading = document.getElementById('stats-loading');
        const error = document.getElementById('stats-error');
        const chartWrapper = document.querySelector('.stats-chart-wrapper');

        loading.style.display = 'none';
        error.style.display = 'none';
        chartWrapper.style.display = 'block';
    }

    /**
     * Starts polling for statistics data
     */
    function startPolling() {
        // Initial fetch
        fetchAndUpdate();

        // Set up polling every 25 seconds
        pollInterval = setInterval(fetchAndUpdate, 25000);
    }

    /**
     * Stops polling for statistics data
     */
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    /**
     * Fetches data and updates the chart
     */
    async function fetchAndUpdate() {
        try {
            const data = await fetchStatisticsData();
            showChart();
            updateChart(data);
        } catch (error) {
            console.error('Error updating statistics:', error);
            showError(error.message);
        }
    }

    // Public API
    return {
        openStatisticsModal
    };
})();

// Make it globally available
window.statisticsModal = statisticsModal;