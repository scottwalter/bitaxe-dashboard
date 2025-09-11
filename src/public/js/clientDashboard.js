/**
 * @file Bitaxe Dashboard Client-Side Application Logic.
 * 
 * This module provides the complete client-side functionality for the Bitaxe
 * Dashboard application. It manages the dynamic dashboard interface, device
 * data polling, user interactions, and real-time updates.
 * 
 * Core Features:
 * - Real-time device data fetching and display
 * - Dynamic navigation menu generation
 * - Interactive device detail panels
 * - Responsive data visualization with progress bars
 * - Modal-based configuration management
 * - Mining pool integration display
 * - Authentication and session management
 * - Auto-refresh with configurable intervals
 * - Error handling and user feedback
 * 
 * Data Flow:
 * 1. Initial load fetches all device and configuration data
 * 2. Navigation menu populated with discovered devices
 * 3. Summary view displays aggregated statistics
 * 4. Device selection shows detailed information
 * 5. Periodic polling keeps data current
 * 6. User actions trigger API calls and UI updates
 * 
 * @author Scott Walter
 * @version 2.0.0
 * @since 1.0.0
 */

document.addEventListener('DOMContentLoaded', () => {
    const deviceMenu = document.getElementById('device-menu');
    const detailsPane = document.getElementById('details-pane');
    const timestampSpan = document.getElementById('timestamp');
    const summaryMenuItem = document.getElementById('summary-menu-item');
    const miningCoreDetailsDiv = document.getElementById('mining-core-details');
    const refreshIcon = document.getElementById('refresh-icon');


    let minerData = [];
    let displayFieldsConfig = []; // Stores the display_fields from config.json for miners.
    let miningCoreData = null; // Stores the data for the Mining Core instance.
    let miningCoreDisplayFields = []; // Stores the display_fields from config.json for Mining Core.
    let disableSettings=true;
    let disableConfigurations=true;
    let disableAuthentication=false;
    // Define the ASIC Temp, VR Temp and Fan Speed progress bar color limits (green, yellow, red)
    let ASICTempMap = {
        green: 65,
        yellow: 70,
        red: 75,
     }
     let VRTempMap = {
        green: 70,
        yellow: 85,
        red: 100,
     }
     let FanSpeedMap = {
        green: 80,
        yellow: 95,
        red: 100,
     }



    if (refreshIcon) {
        refreshIcon.addEventListener('click', () => {
            location.reload();
        });
    }

    // Configuration button will be added after data is loaded and we know the disable_configurations setting

    // --- Retrieve and Parse Data via Fetch ---
    fetch('/api/systems/info')
        .then(response => {
            if (!response.ok) {
                // If the response is not OK (e.g., 404, 500), throw an error.
                const errorMessage = `HTTP error! Status: ${response.status} - ${response.statusText}`;
                console.error(errorMessage);
                detailsPane.innerHTML = `<p style="color: red;">Error loading device data: ${errorMessage}. Please check the server and refresh.</p>`;
                throw new Error(errorMessage); // Propagate error to the catch block
            }
            return response.json(); // Parse the response body as JSON.
        })
        .then(embedded => {
            minerData = embedded.minerData || [];
            displayFieldsConfig = embedded.displayFields || [];
            miningCoreData = embedded.miningCoreData;
            miningCoreDisplayFields = embedded.miningCoreDisplayFields || [];
            disableSettings = embedded.disable_settings;
            disableConfigurations = embedded.disable_configurations;
            disableAuthentication = embedded.disable_authentication;

            // Sort data by hostname for a consistent and predictable menu order.
            minerData.sort((a, b) => (a.hostname || a.id).localeCompare(b.hostname || b.id));

            // Update the "Last updated" timestamp on the client side to reflect when the data was fetched.
            if (timestampSpan) {
                timestampSpan.textContent = new Date().toLocaleString();
            }

            // Add logout button based on disable_authentication setting
            addLogoutButton();
            
            // Add configuration button based on disable_configurations setting
            addConfigurationButton();

            // Initialize the dashboard after data is successfully fetched
            populateMenu();
        })
        .catch(error => {
            console.error('Error fetching or parsing embedded data:', error);
            // Display a user-friendly error message if fetch fails or JSON parsing fails.
            if (!detailsPane.innerHTML.includes('Error loading device data')) { // Avoid duplicate error messages
                detailsPane.innerHTML = `<p style="color: red;">Failed to load device data: ${error.message}. Please refresh the page.</p>`;
            }
        });

    // --- Helper Functions ---

    /**
     * Attaches event listeners to Chart buttons in the summary view
     */
    function attachChartButtonEventListeners() {
        const chartButtons = document.querySelectorAll('.chart-button');
        chartButtons.forEach(buttonElement => {
            buttonElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const instanceId = buttonElement.getAttribute('data-instance-id');
                if (instanceId && window.statisticsModal) {
                    window.statisticsModal.openStatisticsModal(instanceId);
                }
            });
        });
    }

    /**
     * Safely retrieves a value from the nested structure of the mining core pool data.
     * It checks networkStats, poolStats, and the top-level of the pool object.
     * @param {string} fieldKey The key of the value to retrieve.
     * @param {object} pool The pool data object.
     * @returns {*} The found value, or undefined if not found.
     */
    function getNestedMiningCoreValue(fieldKey, pool) {
        if (pool.networkStats && pool.networkStats.hasOwnProperty(fieldKey)) {
            return pool.networkStats[fieldKey];
        }
        if (pool.poolStats && pool.poolStats.hasOwnProperty(fieldKey)) {
            return pool.poolStats[fieldKey];
        }
        if (pool.hasOwnProperty(fieldKey)) {
            return pool[fieldKey];
        }
        return undefined; // Return undefined to be handled by the formatting function.
    }


    /**
     * Safely formats a number to a specified number of decimal places, or returns 'N/A'.
     * @param {number|string} value The value to format.
     * @param {number} [digits=2] The number of decimal places.
     * @returns {string}
     */
    function safeToFixed(value, digits = 2) {
        return typeof value === 'number' && !isNaN(value) ? value.toFixed(digits) : 'N/A';
    }

    /**
     * Formats uptime from seconds to human-readable string.
     * @param {number} seconds The total uptime in seconds.
     * @returns {string}
     */
    function formatUptime(seconds) {
        if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
            return 'N/A';
        }
        const days = Math.floor(seconds / (3600 * 24));
        seconds %= (3600 * 24);
        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);

        let parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`); // Ensure at least seconds are shown, even for 0s uptime.

        return parts.join(' ');
    }

    /**
     * Converts a raw hashrate (in H/s) into a human-readable format with appropriate units.
     * @param {number} hashrate - The hashrate in H/s.
     * @returns {string} The formatted hashrate string (e.g., "10.5 TH/s").
     */
    function formatHashrate(hashrate) {
        if (typeof hashrate !== 'number' || isNaN(hashrate) || hashrate < 0) {
            return 'N/A';
        }

        const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s', 'ZH/s'];
        let i = 0;
        while (hashrate >= 1000 && i < units.length - 1) {
            hashrate /= 1000;
            i++;
        }
        return `${hashrate.toFixed(2)} ${units[i]}`;
    }

    /**
     * Converts a device hashrate (assumed to be in GH/s) into a human-readable format.
     * @param {number} hashrate - The hashrate in GH/s.
     * @returns {string} The formatted hashrate string (e.g., "500.00 MH/s", "1.63 TH/s").
     */
    function formatDeviceHashrate(hashrate) {
        if (typeof hashrate !== 'number' || isNaN(hashrate) || hashrate < 0) {
            return 'N/A';
        }

        if (hashrate < 1) { // Less than 1 GH/s, show as MH/s
            return `${(hashrate * 1000).toFixed(2)} MH/s`;
        }

        const units = ['GH/s', 'TH/s', 'PH/s', 'EH/s', 'ZH/s'];
        let i = 0;
        while (hashrate >= 1000 && i < units.length - 1) {
            hashrate /= 1000;
            i++;
        }
        return `${hashrate.toFixed(2)} ${units[i]}`;
    }

    /**
     * Converts a large number (like difficulty) into a human-readable format with metric prefixes.
     * @param {number} value - The number to format.
     * @returns {string} The formatted number string (e.g., "10.5 T").
     */
    function formatLargeNumber(value) {
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
            return 'N/A';
        }

        const units = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
        let i = 0;
        while (value >= 1000 && i < units.length - 1) {
            value /= 1000;
            i++;
        }
        return `${value.toFixed(2)} ${units[i]}`.trim();
    }

    /**
     * Generates HTML for a horizontal progress bar.
     * @param {number} value - The current value.
     * @param {number} maxValue - The maximum value for the scale.
     * @param {string} fillColor - The color of the filled part of the bar.
     * @returns {string} The HTML string for the progress bar.
     */
    function generateProgressBarHtml(value, maxValue, fillColor) {
        if (typeof value !== 'number' || isNaN(value)) {
            return 'N/A';
        }
        const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
        return `
            <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                <div style="width: ${percentage}%; height: 100%; background-color: ${fillColor};"></div>
            </div>
            <span style="margin-left: 5px;">${value.toFixed(1)} / ${maxValue}</span>
        `;
    }


    /**
     * Applies specific formatting based on the field key.
     * @param {string} fieldKey - The key of the field (e.g., 'hashRate', 'uptimeSeconds').
     * @param {*} value - The raw value of the field.
     * @returns {string} The formatted value.
     */
    function formatFieldValue(fieldKey, value) {
        if (value === undefined || value === null || value === '') {
            return 'N/A';
        }

        switch (fieldKey) {
            case 'uptimeSeconds':
                return formatUptime(value);
            case 'hashRate':
            case 'expectedHashrate':
                return formatDeviceHashrate(value);
            case 'current':
            case 'temptarget':
            case 'poolDifficulty':
                return typeof value === 'number' && !isNaN(value) ? Math.round(value).toString() : 'N/A';
            case 'power':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'N/A';
                }
                // Max power is assumed to be 40W for progress bar scaling.
                const powerPercentage = Math.min(100, Math.max(0, (value / 40) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${powerPercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${value.toFixed(3)} / 40</span>
                `;
            case 'voltage':
                const voltageInVolts = value / 1000; // Convert millivolts to volts
                if (typeof voltageInVolts !== 'number' || isNaN(voltageInVolts)) {
                    return 'N/A';
                }
                // Max voltage is assumed to be 6V for progress bar scaling.
                const voltagePercentage = Math.min(100, Math.max(0, (voltageInVolts / 6) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${voltagePercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${voltageInVolts.toFixed(3)} / 6</span>
                `;
            case 'fanspeed':
                // Color-code the fan speed bar to indicate potential stress.
                let fanSpeedFillColor;
                if (value <= FanSpeedMap.green) {
                    fanSpeedFillColor = 'green';
                } else if (value >= FanSpeedMap.green && value <= FanSpeedMap.yellow) {
                    fanSpeedFillColor = 'yellow';
                } else { // 96 to 100
                    fanSpeedFillColor = 'red';
                }
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'N/A';
                }
                const fanSpeedPercentage = Math.min(100, Math.max(0, (value / 100) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${fanSpeedPercentage}%; height: 100%; background-color: ${fanSpeedFillColor};"></div>
                    </div>
                    <span style="margin-left: 5px;">${Math.round(value)} / 100</span>
                `;
            case 'coreVoltageActual':
                const coreVoltageActualInVolts = value / 1000; // Convert millivolts to volts
                if (typeof coreVoltageActualInVolts !== 'number' || isNaN(coreVoltageActualInVolts)) {
                    return 'N/A';
                }
                // Max core voltage is assumed to be 1.5V for progress bar scaling.
                const coreVoltageActualPercentage = Math.min(100, Math.max(0, (coreVoltageActualInVolts / 1.5) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${coreVoltageActualPercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${coreVoltageActualInVolts.toFixed(3)} / 1.5</span>
                `;
            case 'frequency':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'N/A';
                }
                // Max frequency is assumed to be 1000MHz for progress bar scaling.
                const frequencyPercentage = Math.min(100, Math.max(0, (value / 1000) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${frequencyPercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${Math.round(value)} / 1000</span>
                `;
            case 'temp':
                // Color-code the temperature bar to indicate potential overheating.
                let tempFillColor;
                if (value <= ASICTempMap.green) {
                    tempFillColor = 'green';
                } else if (value > ASICTempMap.green && value <= ASICTempMap.yellow) {
                    tempFillColor = 'yellow';
                } else { // 71 to 75
                    tempFillColor = 'red';
                }
                return generateProgressBarHtml(value, 75, tempFillColor); // Max temp is assumed to be 75°C for scaling.
            case 'vrTemp':
                // Color-code the VRM temperature bar to indicate potential overheating.
                let vrTempFillColor;
                if (value <= VRTempMap.green) {
                    vrTempFillColor = 'green';
                } else if (value >= VRTempMap.green && value <= VRTempMap.yellow) {
                    vrTempFillColor = 'yellow';
                } else { // 86 to 100
                    vrTempFillColor = 'red';
                }
                return generateProgressBarHtml(value, 100, vrTempFillColor); // Max VRM temp is assumed to be 100°C for scaling.
            case 'blockReward': // Keep blockReward here if it's a number needing fixed-point
                return safeToFixed(Number(value));
            case 'networkHashrate':
                return formatHashrate(Number(value));
            case 'poolHashrate':
                return formatHashrate(Number(value));
            case 'networkDifficulty':
                return formatLargeNumber(Number(value));
            case 'totalPaid':
                return safeToFixed(Number(value), 3);
            case 'totalBlocks':
            case 'totalConfirmedBlocks':
            case 'totalPendingBlocks':
            case 'connectedMiners':
            case 'blockHeight':
            case 'connectedPeers':
            case 'nodeVersion':
                // Return as a string to avoid potential precision issues with very large numbers.
                return String(value);
            case 'wifiRSSI':
                return `${value} dBm`;
            case 'overheat_mode':
                const overheatStatus = value ? 'Enabled' : 'Disabled';
                const overheatColor = value ? 'red' : 'green';
                return `<span style="color: ${overheatColor}; font-weight: bold;">${overheatStatus}</span>`;
            case 'isUsingFallbackStratum':
                const fallbackStatus = value ? 'Enabled' : 'Disabled';
                const fallbackColor = value ? 'red' : 'green';
                return `<span style="color: ${fallbackColor}; font-weight: bold;">${fallbackStatus}</span>`;

            case 'lastNetworkBlockTime':
            case 'lastPoolBlockTime':
                // Directly parse ISO 8601 string, no need to multiply by 1000
                const date = new Date(value); // The server provides a standard ISO 8601 string.
                // Check if the date is valid before attempting to format it.
                return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
            case 'sharesRejectedReasons':
                if (Array.isArray(value) && value.length > 0) {
                    return value.map(reason => `${reason.message}: ${reason.count}`).join(', ');
                }
                return 'N/A';
            default:
                return String(value);
        }
    }
    /**
     * Generate the color for a field that has a limits map (green, yellow, red)
     * 
     */
    function getLimitColor(value, limits) {
        if (value <= limits.green) {
            return 'green';
        } else if (value >= limits.green && value <= limits.yellow) {
            return 'yellow';
        } else { 
            return 'red';
        }
    }
    /**
     * Generates the detailed HTML for mining core summary in the right pane.
     * @param {object} data - The mining core data object (now an array of pools).
     * @param {Array<object>} displayFields - The display_fields configuration for mining core.
     * @returns {string} The HTML string for the mining core details.
     */
    function generateMiningCoreDetailsHtml(data, displayFields) {
        // If we have no miners at all, show an appropriate message
        if (!minerData || minerData.length === 0) {
            return '<p>No miner data available. Please check your configuration.</p>';
        }

        // Set appropriate title based on whether mining core data is available
        let allPoolsHtml = data && data.length > 0 
            ? '<h2>Mining Summary</h2>' 
            : '<h2>Miners Summary</h2>'; // Overall heading
        //Show date / time of last update
         allPoolsHtml += `<div class="mining-pool-summary-card">`; 
        allPoolsHtml += '<h3>Status Timestamp</h3>';
        allPoolsHtml += `<div class="details-grid">`; 
        allPoolsHtml += `<strong>Last Updated:</strong> <span>${new Date().toLocaleString()}</span>`;
        allPoolsHtml += `</div>`; // Close details-grid for timestamp  
        allPoolsHtml += `</div>`; // Close mining-pool-summary-card for timestamp


        // Show each individual miner's status, regardless of whether they are part of a pool.
        allPoolsHtml += `<div class="mining-pool-summary-card">`; // Container for individual miner status
        allPoolsHtml += '<h3>Individual Miner Status</h3>';
        //allPoolsHtml += `<div class="details-grid">`; // Grid for individual miner status
        // Loop through each miner's data and generate HTML.
            if ( minerData && minerData.length > 0) {
                minerData.forEach(miner => {
                    if (miner.status === 'Error') {
                        // Display the miner's name and its error status.
                        allPoolsHtml += `<h4>${miner.id}: <span style="color: #dc3545; font-weight: bold;">Error</span></h4>`;
                    } else {
                        const formattedHashrate = formatDeviceHashrate(miner.hashRate); // Use the specific device hashrate formatter.
                        const formattedExpected = formatDeviceHashrate(miner.expectedHashrate);
                        const bestDiff = miner.bestSessionDiff || 'N/A';
                        const AsicTemp = safeToFixed(Number(miner.temp),2);
                        const VRTemp = safeToFixed(Number(miner.vrTemp),2);
                        const displayAsicTemp = `<font color="${getLimitColor(AsicTemp, ASICTempMap)}"><b>${AsicTemp}</b></font>`;
                        const displayVRTemp = `<font color="${getLimitColor(VRTemp, VRTempMap)}"><b>${VRTemp}</b></font>`;
                        const displayFanSpeed = `<font color="${getLimitColor(miner.fanspeed, FanSpeedMap)}"><b>${miner.fanspeed}</b></font>`;
                        // Create one row for each miner with the second column delimited with | for each value.
                        allPoolsHtml += `<h4>${miner.id} <div class="line-graph-icon chart-button" data-instance-id="${miner.id}" title="View ${miner.id} Statistics"></div></h4><div class="details-grid">`;
                        allPoolsHtml += `<strong>Hash (Expected | Current): </strong><span>${formattedExpected} | ${formattedHashrate}</span>`;
                        allPoolsHtml += `<strong>Difficulty (Best | Session): </strong><span>${miner.bestDiff} | ${miner.bestSessionDiff}</span>`;
                        allPoolsHtml += `<strong>Pool (Diff | Shares): </strong><span>${miner.poolDifficulty} | ${miner.sharesAccepted}</span>`;
                        allPoolsHtml += `<strong>Temp (ASIC | VR): </strong><span>${displayAsicTemp} | ${displayVRTemp}</span>`;
                        allPoolsHtml += `<strong>Fan (Speed | RPM): </strong><span>${displayFanSpeed} | ${miner.fanrpm}</span>`;
                        allPoolsHtml += `</div>`; // Close details-grid for individual miner status
                    }
                });
            }
       
        allPoolsHtml += `</div>`; // Close individual miner status card
        
        // Only show pool data if mining core data is available    
        if (data && data.length > 0) {
            data.forEach(poolData => { // Loop through each pool
            allPoolsHtml += `<div class="mining-pool-summary-card">`; // Container for each pool's details
            allPoolsHtml += `<h3>Pool: ${poolData.id.toUpperCase()} (${poolData.coin.symbol} - ${poolData.paymentProcessing.payoutScheme})</h3>`; // Pool specific heading

            displayFields.forEach(categoryObj => {
                const categoryName = Object.keys(categoryObj)[0];
                const fieldsArray = categoryObj[categoryName];

                allPoolsHtml += `<h4>${categoryName}</h4><div class="details-grid">`;
                fieldsArray.forEach(fieldObj => {
                    let fieldKey = Object.keys(fieldObj)[0];
                    const fieldLabel = fieldObj[fieldKey];

                    // Correct the typo from the config file for 'lasNetworkBlockTime'.
                    if (fieldKey === 'lasNetworkBlockTime') {
                        fieldKey = 'lastNetworkBlockTime';
                    }

                    const displayValue = getNestedMiningCoreValue(fieldKey, poolData);
                    const formattedValue = formatFieldValue(fieldKey, displayValue);

                    allPoolsHtml += `<strong>${fieldLabel}:</strong> <span>${formattedValue}</span>`;
                });

                

                allPoolsHtml += `</div>`;
            });
            allPoolsHtml += `</div>`; // Close mining-pool-summary-card
            });
        }
        return allPoolsHtml;
    }

    /**
     * Generates the detailed HTML for a single device in the right pane using display_fields.
     * @param {object} data - The device data object.
     * @returns {string} The HTML string for the device details.
     */
    function generateDeviceDetailsHtml(data) {
        // Display a detailed error message if data fetching failed for this instance.
        if (data.status === 'Error') {
            return `
                <h2 style="color: #d8000c;">Device: ${data.hostname || 'Unknown Device'} - Error</h2>
                <div class="details-grid">
                    <strong>Status:</strong> <span style="font-weight: bold; color: #d8000c;">Error</span>
                    <strong>Message:</strong> <span>${data.message || 'Could not retrieve data for this device.'}</span>
                    <strong>Suggestion:</strong> <span>Please check the device's network connection and API status, then refresh the dashboard.</span>
                </div>
            `;
        }

        let html = `<h2>${ data.id || 'Unknown Device'}`;
        //Decide is restart icon should show up based on disable_settings config.
        if(!disableSettings){
            html += ` <img src="/public/icon/icons8-rotate-right-64-white.png" class="restart-button restart-icon-hover" data-instance-id="${data.id}" title="Restart Instance" style="width: 35px; height: 35px; margin-left: 8px; vertical-align: middle; cursor: pointer;">`;
            html += ` <img src="/public/icon/icons8-audio-65-white.png" class="settings-button settings-icon-hover" data-instance-id="${data.id}" title="Edit Settings" style="width: 40px; height: 40px; margin-left: 8px; vertical-align: middle; cursor: pointer;">`;
        }
        html += `</h2>`;

        displayFieldsConfig.forEach(categoryObj => {
            const categoryName = Object.keys(categoryObj)[0];
            const fieldsArray = categoryObj[categoryName];

            html += `<h3>${categoryName}</h3><div class="details-grid">`;
            fieldsArray.forEach(fieldObj => {
                const fieldKey = Object.keys(fieldObj)[0];
                const fieldLabel = fieldObj[fieldKey];
                const displayValue = data[fieldKey];
                const formattedValue = formatFieldValue(fieldKey, displayValue);

                html += `<strong>${fieldLabel}:</strong> <span>${formattedValue}</span>`;
            });
            html += `</div>`;
        });

        return html;
    }

    // --- UI Population and Event Handling ---

    /**
     * Adds the logout button to the header if authentication is enabled.
     */
    function addLogoutButton() {
        // Only add the logout button if authentication is enabled
        if (!disableAuthentication) {
            const header = document.querySelector('header');
            
            if (header) {
                // Check if button already exists to avoid duplicates
                const existingButton = document.getElementById('logout-button');
                if (!existingButton) {
                    const logoutButton = document.createElement('div');
                    logoutButton.id = 'logout-button';
                    logoutButton.title = 'Logout from dashboard';
                    header.appendChild(logoutButton);

                    logoutButton.addEventListener('click', async () => {
                        try {
                            const response = await fetch('/api/logout', {
                                method: 'POST'
                            });
                            if (response.ok) {
                                // On successful logout, the server clears the session cookie.
                                // Redirect the user to the login page.
                                window.location.href = '/login';
                            } else {
                                const result = await response.json();
                                alert(`Logout failed: ${result.message || 'Unknown error'}`);
                            }
                        } catch (error) {
                            console.error('Logout request failed:', error);
                            alert('Failed to send logout command. See console for details.');
                        }
                    });
                }
            }
        }
    }

    /**
     * Adds the configuration button to the menu header if configurations are enabled.
     */
    function addConfigurationButton() {
        // Only add the configuration button if configurations are enabled
        if (!disableConfigurations) {
            const menuHeader = document.querySelector('.menu-header');
            const refreshIcon = document.getElementById('refresh-icon');
            
            if (menuHeader && refreshIcon) {
                // Check if button already exists to avoid duplicates
                const existingButton = document.getElementById('config-button');
                if (!existingButton) {
                    const configButton = document.createElement('span');
                    configButton.id = 'config-button';
                    configButton.className = 'config-icon';
                    configButton.innerHTML = ''; // Background image provides the icon
                    configButton.title = 'Application Configuration';
                    
                    // Insert before the refresh icon
                    menuHeader.insertBefore(configButton, refreshIcon);

                    configButton.addEventListener('click', () => {
                        modalService.openConfigModal();
                    });
                }
            }
        }
    }

    /**
     * Populates the left-hand device menu, dynamically adjusting its width
     * to fit the content, and attaches click handlers.
     */
    function populateMenu() {
        deviceMenu.innerHTML = ''; // Clear existing menu items

        let maxMenuWidth = 0; // To store the maximum calculated width for dynamic resizing.

        /**
         * Measures the pixel width of a given text string using a canvas.
         * Caches the canvas element for performance.
         * @param {string} text The text to measure.
         * @param {string} font The CSS font string to use for measurement.
         * @returns {number} The width of the text in pixels.
         */
        function measureTextWidth(text, font) {
            // Use a static canvas to avoid creating a new one on each call.
            const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
            const context = canvas.getContext("2d");
            context.font = font || '0.95em \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif'; // Match .menu-pane li font.
            return context.measureText(text).width;
        }

        // Get current computed style for menu items to ensure accurate width measurement.
        const tempListItem = document.createElement('li');
        tempListItem.style.visibility = 'hidden';
        tempListItem.style.position = 'absolute';
        tempListItem.style.whiteSpace = 'nowrap';
        document.body.appendChild(tempListItem);
        const computedStyle = window.getComputedStyle(tempListItem);
        const listItemFont = computedStyle.font;
        const listItemPaddingHorizontal = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
        document.body.removeChild(tempListItem);

        const indicatorWidth = 18; // Approx. width of status indicator (10px) + margin (8px).

        // First, add and measure the "Summary" menu item if it exists.
        if (summaryMenuItem) {
            const summaryText = summaryMenuItem.textContent;
            summaryMenuItem.innerHTML = ''; // Clear existing text to rebuild

            const statusIndicator = document.createElement('span');
            statusIndicator.classList.add('status-indicator', 'status-online');
            statusIndicator.title = 'Summary';

            const textNode = document.createTextNode(' ' + summaryText);

            summaryMenuItem.appendChild(statusIndicator);
            summaryMenuItem.appendChild(textNode);

            maxMenuWidth = Math.max(maxMenuWidth, measureTextWidth(summaryText, listItemFont) + listItemPaddingHorizontal + indicatorWidth);
            deviceMenu.appendChild(summaryMenuItem);
            summaryMenuItem.addEventListener('click', () => {
                // Deactivate all other menu items.
                document.querySelectorAll('#device-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                // Activate the clicked item.
                summaryMenuItem.classList.add('active');

                // Display the mining core summary in the details pane.
                detailsPane.innerHTML = generateMiningCoreDetailsHtml(miningCoreData, miningCoreDisplayFields);
                
                // Add event listeners to Chart buttons
                attachChartButtonEventListeners();
            });
        }

        if (minerData.length === 0) {
            // If no devices, and summary is not present or enabled, show message
            if (!summaryMenuItem) {
                deviceMenu.innerHTML = '<li>No devices configured or found.</li>';
            }
            // If summary is present, it will already be there.
            // Apply initial width if only summary is present or no devices are found.
            const menuPane = document.querySelector('.menu-pane');
            if (menuPane && window.innerWidth > 768) { // Only apply on larger screens.
                menuPane.style.flexBasis = `${maxMenuWidth + 40}px`; // Add buffer for padding/margin
                menuPane.style.width = `${maxMenuWidth + 40}px`;
            }
            return;
        }

        minerData.forEach(data => {
            const listItem = document.createElement('li');
            listItem.dataset.deviceId = data.id; // Store unique ID for lookup

            // Create a status indicator (green for online, red for error).
            const statusIndicator = document.createElement('span');
            statusIndicator.classList.add('status-indicator');
            if (data.status === 'Error') {
                statusIndicator.classList.add('status-error');
                listItem.title = `Error: ${data.message || 'Unknown error'}`; // Add a tooltip for the error details.
            } else {
                statusIndicator.classList.add('status-online');
                listItem.title = 'Online';
            }

            // Display the device's name (ID from config) and attach the status indicator.
            const deviceName = data.id || 'Unnamed Device';
            listItem.appendChild(statusIndicator);
            listItem.appendChild(document.createTextNode(' ' + deviceName));
            deviceMenu.appendChild(listItem);

            // Update the max width based on this item's content.
            maxMenuWidth = Math.max(maxMenuWidth, measureTextWidth(deviceName, listItemFont) + listItemPaddingHorizontal + indicatorWidth);

            listItem.addEventListener('click', () => {
                // Deactivate all other menu items.
                document.querySelectorAll('#device-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                // Activate the clicked item.
                listItem.classList.add('active');

                // Hide mining core details, show device details
                miningCoreDetailsDiv.style.display = 'none';
                detailsPane.style.display = 'block';

                // Find the corresponding data and display it in the details pane
                const selectedData = minerData.find(m => m.id === listItem.dataset.deviceId);
                if (selectedData) {
                    detailsPane.innerHTML = generateDeviceDetailsHtml(selectedData);

                    // --- Attach Event Listeners to Dynamically Created Buttons ---
                    const restartButton = detailsPane.querySelector('.restart-button');
                    if (restartButton) {
                        restartButton.addEventListener('click', (e) => {
                            const instanceId = e.target.dataset.instanceId;
                            modalService.openConfirmModal(
                                'Confirm Restart',
                                `Are you sure you want to restart instance "${instanceId}"?`,
                                async () => {
                                    try {
                                        const response = await fetch(`/api/instance/service/restart?instanceId=${instanceId}`, {
                                            method: 'POST'
                                        });
                                        const result = await response.json();
                                        if (response.ok) {
                                            alert(`Instance "${instanceId}" is restarting.`);
                                            setTimeout(() => location.reload(), 2000); // Refresh to see updated status
                                        } else {
                                            alert(`Error restarting instance: ${result.message || 'Unknown error'}`);
                                        }
                                    } catch (error) {
                                        console.error('Restart request failed:', error);
                                        alert('Failed to send restart command. See console for details.');
                                    }
                                }
                            );
                        });
                    }

                    const settingsButton = detailsPane.querySelector('.settings-button');
                    if (settingsButton) {
                        settingsButton.addEventListener('click', (e) => {
                            modalService.openSettingsModal(selectedData);
                        });
                    }
                } else {
                    detailsPane.innerHTML = '<p style="color: red;">Error: Data for this device not found.</p>';
                }
            });
        });

        // After all items are measured, apply the calculated max width to the menu pane.
        const menuPane = document.querySelector('.menu-pane');
        if (menuPane && window.innerWidth > 768) { // Only apply on larger screens.
            menuPane.style.flexBasis = `${maxMenuWidth + 40}px`; // Add buffer for padding, margin, and active border.
            menuPane.style.width = `${maxMenuWidth + 40}px`;
        }

        // Automatically select and display details for the first item on page load.
        if (summaryMenuItem && minerData.length > 0) {
            summaryMenuItem.click(); // Prioritize the summary view if miners are available.
        } else if (minerData.length > 0) { // Check if minerData exists before trying to click first element
            // If there are devices, click the first one
            const firstDeviceListItem = deviceMenu.querySelector('li[data-device-id]');
            if (firstDeviceListItem) {
                firstDeviceListItem.click();
            }
        } else {
            detailsPane.innerHTML = '<p>No devices or summary data to display. Check your configuration.</p>';
        }
    }

    // Initialize the dashboard
    populateMenu();

});
