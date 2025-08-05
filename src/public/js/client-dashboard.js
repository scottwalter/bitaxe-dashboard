// File Path: /Users/scottwalter/VSC-Projects/bitaxe-dashboard/src/public/js/client-dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const deviceMenu = document.getElementById('device-menu');
    const detailsPane = document.getElementById('details-pane');
    const embeddedDataScript = document.getElementById('embedded-data');
    const timestampSpan = document.getElementById('timestamp');
    const summaryMenuItem = document.getElementById('summary-menu-item');
    const miningCoreDetailsDiv = document.getElementById('mining-core-details');
    const deviceDetailsParagraph = detailsPane.querySelector('p'); // The initial "Select a device..." paragraph

    let minerData = [];
    let displayFieldsConfig = []; // To store the display_fields from config.json
    let miningCoreData = null; // Declare miningCoreData at a higher scope
    let miningCoreDisplayFields = []; // Declare miningCoreDisplayFields at a higher scope

    // --- Retrieve and Parse Embedded Data ---
    if (embeddedDataScript && embeddedDataScript.textContent.trim()) {
        try {
            const embedded = JSON.parse(embeddedDataScript.textContent);
            minerData = embedded.minerData || [];
            displayFieldsConfig = embedded.displayFields || [];
            miningCoreData = embedded.miningCoreData;
            miningCoreDisplayFields = embedded.miningCoreDisplayFields || [];

            // Sort data by hostname for consistent menu order (optional)
            minerData.sort((a, b) => (a.hostname || a.id).localeCompare(b.hostname || b.id));
        } catch (e) {
            console.error('Error parsing embedded miner data:', e);
            detailsPane.innerHTML = '<p style="color: red;">Error loading device data. Please refresh the page.</p>';
            return; // Stop execution if data is unrecoverable
        }
    } else {
        console.warn('No embedded miner data found.');
        detailsPane.innerHTML = '<p>No device data available from the server.</p>';
        return;
    }

    // Update the "Last updated" timestamp on the client side
    if (timestampSpan) {
        timestampSpan.textContent = new Date().toLocaleString();
    }

    // --- Helper Functions ---

    /**
     * Safely formats a number to two decimal places, or returns 'N/A'.
     * @param {number|string} value
     * @returns {string}
     */
    function safeToFixed(value) {
        return typeof value === 'number' && !isNaN(value) ? value.toFixed(2) : 'N/A';
    }

    /**
     * Formats uptime from seconds to human-readable string.
     * @param {number} seconds
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
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`); // Ensure at least seconds are shown

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
            case 'current':
            case 'temptarget':
            case 'poolDifficulty':
                return typeof value === 'number' && !isNaN(value) ? Math.round(value).toString() : 'N/A';
            case 'power':
                if (typeof value !== 'number' || isNaN(value)) {
                    return 'N/A';
                }
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
                const voltagePercentage = Math.min(100, Math.max(0, (voltageInVolts / 6) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${voltagePercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${voltageInVolts.toFixed(3)} / 6</span>
                `;
            case 'fanspeed':
                let fanSpeedFillColor;
                if (value <= 80) {
                    fanSpeedFillColor = 'green';
                } else if (value >= 81 && value <= 95) {
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
                const frequencyPercentage = Math.min(100, Math.max(0, (value / 1000) * 100));
                return `
                    <div style="width: 100px; height: 10px; background-color: #e0e0e0; border: 1px solid #ccc; border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle;">
                        <div style="width: ${frequencyPercentage}%; height: 100%; background-color: green;"></div>
                    </div>
                    <span style="margin-left: 5px;">${Math.round(value)} / 1000</span>
                `;
            case 'temp':
                let tempFillColor;
                if (value <= 60) {
                    tempFillColor = 'green';
                } else if (value >= 61 && value <= 65) {
                    tempFillColor = 'yellow';
                } else { // 66 to 75
                    tempFillColor = 'red';
                }
                return generateProgressBarHtml(value, 75, tempFillColor);
            case 'vrTemp':
                let vrTempFillColor;
                if (value <= 70) {
                    vrTempFillColor = 'green';
                } else if (value >= 71 && value <= 85) {
                    vrTempFillColor = 'yellow';
                } else { // 86 to 100
                    vrTempFillColor = 'red';
                }
                return generateProgressBarHtml(value, 100, vrTempFillColor);
            case 'blockReward': // Keep blockReward here if it's a number needing fixed-point
                return safeToFixed(Number(value));
            case 'networkHashrate':
                return formatHashrate(Number(value));
            case 'poolHashrate':
                return formatHashrate(Number(value));
            case 'networkDifficulty':
                // Format with locale string for better readability of large numbers
                return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
            case 'totalPaid':
            case 'totalBlocks':
            case 'totalConfirmedBlocks':
            case 'totalPendingBlocks':
            case 'connectedMiners':
            case 'blockHeight':
            case 'connectedPeers':
            case 'nodeVersion':
                // For these, just return the value as a string to avoid precision issues with very large numbers
                return String(value);
            case 'wifiRSSI':
                return `${value} dBm`;
            case 'overheat_mode':
                const overheatStatus = value ? 'Enabled' : 'Disabled';
                const overheatColor = value ? 'red' : 'green';
                return `<span style="color: ${overheatColor}; font-weight: bold;">${overheatStatus}</span>`;
            case 'lastNetworkBlockTime':
            case 'lastPoolBlockTime':
                // Directly parse ISO 8601 string, no need to multiply by 1000
                const date = new Date(value);
                // Check if date is valid before calling toLocaleString
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
     * Generates the detailed HTML for mining core summary in the right pane.
     * @param {object} data - The mining core data object.
     * @param {Array<object>} displayFields - The display_fields configuration for mining core.
     * @returns {string} The HTML string for the mining core details.
     */
    function generateMiningCoreDetailsHtml(data, displayFields) {
        if (!data || !data.pools || data.pools.length === 0) {
            return '<p>No mining core data available. Please check your config. Perhaps you have Mining Core Data disabled?</p>';
        }

        const poolData = data.pools[0]; // Assuming only one pool for now

        let html = '';

        // Helper to get nested value
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
            return undefined; // Or null, to be handled by safeToFixed/formatFieldValue
        }

        displayFields.forEach(categoryObj => {
            const categoryName = Object.keys(categoryObj)[0];
            const fieldsArray = categoryObj[categoryName];

            html += `<h3>${categoryName}</h3><div class="details-grid">`;
            fieldsArray.forEach(fieldObj => {
                let fieldKey = Object.keys(fieldObj)[0];
                const fieldLabel = fieldObj[fieldKey];

                // Correcting the typo for lastNetworkBlockTime
                if (fieldKey === 'lasNetworkBlockTime') {
                    fieldKey = 'lastNetworkBlockTime';
                }

                const displayValue = getNestedMiningCoreValue(fieldKey, poolData);
                const formattedValue = formatFieldValue(fieldKey, displayValue);

                html += `<strong>${fieldLabel}:</strong> <span>${formattedValue}</span>`;
            });
            html += `</div>`;
        });
        return html;
    }

    /**
     * Generates the detailed HTML for a single device in the right pane using display_fields.
     * @param {object} data - The device data object.
     * @returns {string} The HTML string for the device details.
     */
    function generateDeviceDetailsHtml(data) {
        // If there was an error fetching data for this specific instance
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

        let html = `<h2>Device: ${ data.id || 'Unknown Device'}</h2>`;

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

        // Hash Board Details Section (remains dynamic, not part of display_fields)
        if (data.boards && Array.isArray(data.boards) && data.boards.length > 0) {
            html += `<h3>Hash Board Details</h3>`;
            data.boards.forEach((board, index) => {
                html += `<h4>Board ${index + 1}</h4>`;
                html += `<div class="details-grid">`;
                for (const key in board) {
                    if (Object.hasOwnProperty.call(board, key)) {
                        let value = board[key];
                        // Specific formatting for board temps
                        if (['chipTemp', 'pcbTemp'].includes(key) && typeof value === 'number') {
                            value = value.toFixed(1);
                        }
                        html += `<strong>${key}:</strong> <span>${value}</span>`;
                    }
                }
                html += `</div>`;
            });
        }

        return html;
    }

    // --- Main Logic to Populate Menu and Handle Clicks ---

    /**
     * Populates the left-hand device menu.
     */
    function populateMenu() {
        deviceMenu.innerHTML = ''; // Clear existing menu items

        let maxMenuWidth = 0; // To store the maximum calculated width

        // Helper to measure text width
        function measureTextWidth(text, font) {
            const canvas = measureTextWidth.canvas || (measureTextWidth.canvas = document.createElement("canvas"));
            const context = canvas.getContext("2d");
            context.font = font || '0.95em \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif'; // Match .menu-pane li font
            return context.measureText(text).width;
        }

        // Get current computed style for menu items to ensure accurate measurement
        const tempListItem = document.createElement('li');
        tempListItem.style.visibility = 'hidden';
        tempListItem.style.position = 'absolute';
        tempListItem.style.whiteSpace = 'nowrap';
        document.body.appendChild(tempListItem);
        const computedStyle = window.getComputedStyle(tempListItem);
        const listItemFont = computedStyle.font;
        const listItemPaddingHorizontal = parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);
        document.body.removeChild(tempListItem);

        // Measure Summary item
        if (summaryMenuItem) {
            const summaryText = summaryMenuItem.textContent;
            maxMenuWidth = Math.max(maxMenuWidth, measureTextWidth(summaryText, listItemFont) + listItemPaddingHorizontal);
            deviceMenu.appendChild(summaryMenuItem);
            summaryMenuItem.addEventListener('click', () => {
                // Remove 'active' class from all list items
                document.querySelectorAll('#device-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                // Add 'active' class to the clicked item
                summaryMenuItem.classList.add('active');

                // Show mining core details, hide device details
                detailsPane.innerHTML = generateMiningCoreDetailsHtml(miningCoreData, miningCoreDisplayFields);
            });
        }

        if (minerData.length === 0) {
            // If no devices, and summary is not present or enabled, show message
            if (!summaryMenuItem) {
                deviceMenu.innerHTML = '<li>No devices configured or found.</li>';
            }
            // If summary is present, it will already be there
            // Apply initial width if only summary is present or no devices
            const menuPane = document.querySelector('.menu-pane');
            if (menuPane && window.innerWidth > 768) { // Apply only on larger screens
                menuPane.style.flexBasis = `${maxMenuWidth + 40}px`; // Add buffer for padding/margin
                menuPane.style.width = `${maxMenuWidth + 40}px`;
            }
            return;
        }

        minerData.forEach(data => {
            const listItem = document.createElement('li');
            listItem.dataset.deviceId = data.id; // Store unique ID for lookup
            // Display hostname, fallback to ID if hostname is missing
            const deviceName = data.id || 'Unnamed Device';
            listItem.textContent = deviceName;
            deviceMenu.appendChild(listItem);

            // Measure this device name
            maxMenuWidth = Math.max(maxMenuWidth, measureTextWidth(deviceName, listItemFont) + listItemPaddingHorizontal);

            listItem.addEventListener('click', () => {
                // Remove 'active' class from all list items
                document.querySelectorAll('#device-menu li').forEach(item => {
                    item.classList.remove('active');
                });
                // Add 'active' class to the clicked item
                listItem.classList.add('active');

                // Hide mining core details, show device details
                miningCoreDetailsDiv.style.display = 'none';
                detailsPane.style.display = 'block';

                // Find the corresponding data and display it in the details pane
                const selectedData = minerData.find(m => m.id === data.id);
                if (selectedData) {
                    detailsPane.innerHTML = generateDeviceDetailsHtml(selectedData);
                } else {
                    detailsPane.innerHTML = '<p style="color: red;">Error: Data for this device not found.</p>';
                }
            });
        });

        // Apply the calculated max width to the menu pane after all items are measured
        const menuPane = document.querySelector('.menu-pane');
        if (menuPane && window.innerWidth > 768) { // Apply only on larger screens
            menuPane.style.flexBasis = `${maxMenuWidth + 40}px`; // Add buffer for padding/margin and active border
            menuPane.style.width = `${maxMenuWidth + 40}px`;
        }

        // Automatically select and display details for the first device or summary on page load
        if (summaryMenuItem && miningCoreData) {
            summaryMenuItem.click(); // Simulate a click on the Summary item if data is available
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


