/**
 * @file This module provides services for creating and managing modals.
 * It handles the generation of HTML for settings and confirmation modals,
 * attaches event listeners, and manages their lifecycle (opening, closing, form submission).
 */

const modalService = (() => {
    // Configuration for the settings form structure and fields.
    const settingsFormConfig = [
        {
            category: 'Device',
            fields: [
                { key: 'hostname', label: 'Hostname', type: 'text' },
                { key: 'invertscreen', label: 'Invert Screen', type: 'checkbox' },
                { key: 'rotation', label: 'Screen Rotation', type: 'select', options: [{value: 0, text: '0°'}, {value: 1, text: '180°'}] },
                { key: 'displayTimeout', label: 'Display Timeout (mins)', type: 'number', note: '-1=on, 0=off' },
            ]
        },
        {
            category: 'WiFi',
            fields: [
                { key: 'ssid', label: 'SSID', type: 'text' },
                { key: 'wifiPass', label: 'Password', type: 'password', placeholder: 'Leave blank to keep current' },
            ]
        },
        {
            category: 'Mining',
            fields: [
                { key: 'statsFrequency', label: 'Stats Frequency (s)', type: 'number', note: '0=disabled' },
            ]
        },
        {
            category: 'Primary Pool',
            fields: [
                { key: 'stratumURL', label: 'URL', type: 'text' },
                { key: 'stratumPort', label: 'Port', type: 'number' },
                { key: 'stratumUser', label: 'Username', type: 'text' },
                { key: 'stratumPassword', label: 'Password', type: 'password', placeholder: 'Leave blank to keep current' },
                { key: 'stratumSuggestedDifficulty', label: 'Suggested Difficulty', type: 'number'},
                { key: 'stratumExtranonceSubscribe', label: 'Extranonce Subscribe', type: 'checkbox'},
            ]
        },
        {
            category: 'Fallback Pool',
            fields: [
                { key: 'fallbackStratumURL', label: 'URL', type: 'text' },
                { key: 'fallbackStratumPort', label: 'Port', type: 'number' },
                { key: 'fallbackStratumUser', label: 'Username', type: 'text' },
                { key: 'fallbackStratumPassword', label: 'Password', type: 'password', placeholder: 'Leave blank to keep current' },
                { key: 'fallbackStratumSuggestedDifficulty', label: 'Suggested Difficulty', type: 'number'},
                { key: 'fallbackStratumExtranonceSubscribe', label: 'Extranonce Subscribe', type: 'checkbox'},
            ]
        },
        {
            category: 'Performance',
            fields: [
                { key: 'overclockEnabled', label: 'Enable Overclock', type: 'checkbox' },
                { key: 'frequency', label: 'Frequency (MHz)', type: 'number', max: 1000 },
                { key: 'coreVoltage', label: 'Core Voltage (mV)', type: 'number', max: 1300 },
                { key: 'autofanspeed', label: 'Auto Fan Speed', type: 'checkbox' },
                { key: 'fanspeed', label: 'Manual Fan Speed (%)', type: 'number', note: 'Used if auto is off' },
                { key: 'minFanSpeed', label: 'Minimum Fan Speed (%)', type: 'number', note: 'Used if auto is on' },
                { key: 'temptarget', label: 'Target Temp (°C)', type: 'number', note: 'Used if auto is on' },
                
            ]
        }
    ];

    /**
     * Generates the inner HTML for the settings form based on device data and configuration.
     * @param {object} deviceData - The data for the specific device.
     * @param {Array<object>} config - The form configuration array.
     * @returns {string} The HTML string for the form's content.
     */
    function generateSettingsFormHtml(deviceData, config) {
        let formHtml = '';
        config.forEach(category => {
            formHtml += `<h3>${category.category}</h3>`;
            formHtml += '<div class="form-grid">';
            category.fields.forEach(field => {
                const currentValue = deviceData[field.key] !== undefined ? deviceData[field.key] : '';
                formHtml += `<label for="${field.key}">${field.label}:</label>`;
                let fieldHtml = '';
                switch (field.type) {
                    case 'checkbox':
                        fieldHtml = `<input type="checkbox" id="${field.key}" name="${field.key}" ${currentValue ? 'checked' : ''}>`;
                        break;
                    case 'select':
                        fieldHtml = `<select id="${field.key}" name="${field.key}">`;
                        field.options.forEach(opt => {
                            fieldHtml += `<option value="${opt.value}" ${currentValue == opt.value ? 'selected' : ''}>${opt.text}</option>`;
                        });
                        fieldHtml += `</select>`;
                        break;
                    case 'password':
                        fieldHtml = `<input type="password" id="${field.key}" name="${field.key}" placeholder="${field.placeholder || ''}">`;
                        break;
                    default: // text, number
                        const maxAttr = field.max ? `max="${field.max}"` : '';
                        fieldHtml = `<input type="${field.type}" id="${field.key}" name="${field.key}" value="${currentValue}" ${maxAttr}>`;
                }
                let noteHtml = field.note ? ` <small>(${field.note})</small>` : '';
                formHtml += `<div>${fieldHtml}${noteHtml}</div>`;
            });
            formHtml += '</div>';
        });
        return formHtml;
    }

    /**
     * Handles the submission of the settings form, sending data to the backend.
     * @param {Event} e - The form submission event.
     * @param {Function} closeModal - A function to close the modal on success.
     */
    async function handleSettingsFormSubmit(e, closeModal) {
        e.preventDefault();
        const form = e.target;

        const frequencyInput = form.querySelector('[name="frequency"]');
        if (frequencyInput && Number(frequencyInput.value) > 1000) {
            alert('Frequency cannot be greater than 1000 MHz.');
            return;
        }

        const coreVoltageInput = form.querySelector('[name="coreVoltage"]');
        if (coreVoltageInput && Number(coreVoltageInput.value) > 1300) {
            alert('Core Voltage cannot be greater than 1300 mV.');
            return;
        }

        const payload = {};
        const instanceId = form.dataset.instanceId;

        settingsFormConfig.forEach(category => {
            category.fields.forEach(field => {
                const element = form.querySelector(`[name="${field.key}"]`);
                if (!element) return;

                let value = (field.type === 'checkbox') ? (element.checked ? 1 : 0) : element.value;

                if (field.type === 'password' && value === '') {
                    return; // Do not send empty passwords
                }

                payload[field.key] = (field.type === 'number') ? Number(value) : value;
            });
        });

        try {
            const response = await fetch(`/api/instance/service/settings?instanceId=${instanceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                alert('Settings saved successfully! The device will now apply them.');
                closeModal();
                setTimeout(() => location.reload(), 1000);
            } else {
                alert(`Error saving settings: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to send settings to the server. See console for details.');
        }
    }

    /**
     * Creates and displays the settings modal for a given device.
     * @param {object} deviceData - The data for the specific device.
     */
    function openSettingsModal(deviceData) {
        const existingModal = document.getElementById('settings-modal');
        if (existingModal) existingModal.remove();

        const formHtml = generateSettingsFormHtml(deviceData, settingsFormConfig);
        const modalHtml = `
            <div id="settings-modal" class="modal">
                <div class="modal-content">
                    <span class="close-button">&times;</span>
                    <h2>Settings for ${deviceData.id}</h2>
                    <form id="settings-form" data-instance-id="${deviceData.id}" novalidate>
                        ${formHtml}
                        <div class="modal-actions">
                            <button type="button" class="animated-button cancel-button">Cancel</button>
                            <button type="submit" class="animated-button">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('settings-modal');
        const form = document.getElementById('settings-form');
        const closeModal = () => modal.remove();

        modal.querySelector('.close-button').addEventListener('click', closeModal);
        modal.querySelector('.cancel-button').addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
        form.addEventListener('submit', (e) => handleSettingsFormSubmit(e, closeModal));
    }

    /**
     * Creates and displays a generic confirmation modal.
     * @param {string} title - The title of the modal.
     * @param {string} message - The confirmation message to display.
     * @param {Function} onConfirm - The callback function to execute when the user confirms.
     */
    function openConfirmModal(title, message, onConfirm) {
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) existingModal.remove();
    
        const modalHtml = `
            <div id="confirm-modal" class="modal">
                <div class="modal-content">
                    <span class="close-button">&times;</span>
                    <h2>${title}</h2>
                    <p class="confirm-message">${message}</p>
                    <div class="modal-actions">
                        <button type="button" class="animated-button cancel-button">Cancel</button>
                        <button type="button" class="animated-button confirm-button">Confirm</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    
        const modal = document.getElementById('confirm-modal');
        const closeModal = () => modal.remove();
    
        modal.querySelector('.close-button').addEventListener('click', closeModal);
        modal.querySelector('.cancel-button').addEventListener('click', closeModal);
        modal.querySelector('.confirm-button').addEventListener('click', () => { onConfirm(); closeModal(); });
        window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    }

    // Expose public functions
    return {
        openSettingsModal,
        openConfirmModal
    };
})();