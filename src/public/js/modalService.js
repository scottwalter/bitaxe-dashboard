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

    // Configuration for the application configuration form structure and fields.
    const configFormConfig = [
        {
            category: 'Application Settings',
            fields: [
                { key: 'title', label: 'Dashboard Title', type: 'text' },
                { key: 'web_server_port', label: 'Web Server Port', type: 'number', min: 1, max: 65535 },
                { key: 'disable_authentication', label: 'Disable Authentication', type: 'checkbox' },
                { key: 'cookie_max_age', label: 'Cookie Max Age (seconds)', type: 'number', min: 300 },
                { key: 'disable_settings', label: 'Disable Device Settings', type: 'checkbox' },
                { key: 'demo_mode', label: 'Demo Mode', type: 'checkbox' },
            ]
        },
        {
            category: 'Mining Core Integration',
            fields: [
                { key: 'mining_core_enabled', label: 'Enable Mining Core', type: 'checkbox' },
                { key: 'mining_core_url', label: 'Mining Core URL', type: 'text', placeholder: 'http://192.168.1.100:4000' },
            ]
        },
        {
            category: 'Display Fields Configuration',
            fields: [
                { 
                    key: 'display_fields', 
                    label: 'Bitaxe Display Fields', 
                    type: 'display_fields_editor'
                },
                { 
                    key: 'mining_core_display_fields', 
                    label: 'Mining Core Display Fields', 
                    type: 'display_fields_editor'
                },
            ]
        },
        {
            category: 'Bitaxe Instances',
            fields: [
                { 
                    key: 'bitaxe_instances', 
                    label: 'Device Instances', 
                    type: 'bitaxe_instances_table'
                },
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
                    case 'textarea':
                        const rows = field.rows || 4;
                        const textareaValue = Array.isArray(currentValue) ? JSON.stringify(currentValue, null, 2) : currentValue;
                        fieldHtml = `<textarea id="${field.key}" name="${field.key}" rows="${rows}" placeholder="${field.placeholder || ''}">${textareaValue}</textarea>`;
                        break;
                    case 'bitaxe_instances_table':
                        fieldHtml = generateBitaxeInstancesTable(currentValue);
                        break;
                    case 'display_fields_editor':
                        fieldHtml = generateDisplayFieldsEditor(currentValue, field.key);
                        break;
                    default: // text, number
                        const maxAttr = field.max ? `max="${field.max}"` : '';
                        const minAttr = field.min ? `min="${field.min}"` : '';
                        const placeholderAttr = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                        fieldHtml = `<input type="${field.type}" id="${field.key}" name="${field.key}" value="${currentValue}" ${maxAttr} ${minAttr} ${placeholderAttr}>`;
                }
                let noteHtml = field.note ? ` <small>(${field.note})</small>` : '';
                if (field.type === 'bitaxe_instances_table' || field.type === 'display_fields_editor') {
                    // For complex editors, span the full width
                    formHtml += `<div class="full-width-field">${fieldHtml}${noteHtml}</div>`;
                } else {
                    formHtml += `<div>${fieldHtml}${noteHtml}</div>`;
                }
            });
            formHtml += '</div>';
        });
        return formHtml;
    }

    /**
     * Generates HTML for the Bitaxe instances table with add/remove functionality.
     * @param {Array} instances - Array of instance objects from the configuration.
     * @returns {string} The HTML string for the instances table.
     */
    function generateBitaxeInstancesTable(instances) {
        const instancesArray = Array.isArray(instances) ? instances : [];
        
        let tableHtml = `
            <div id="bitaxe-instances-container">
                <div class="instances-table-header">
                    <span>Device Name</span>
                    <span>Device URL</span>
                    <span>Actions</span>
                </div>
                <div id="bitaxe-instances-rows">`;
        
        // Add existing instances
        instancesArray.forEach((instance, index) => {
            const deviceName = Object.keys(instance)[0] || '';
            const deviceUrl = instance[deviceName] || '';
            tableHtml += generateInstanceRow(deviceName, deviceUrl, index);
        });
        
        // Add at least one empty row if no instances exist
        if (instancesArray.length === 0) {
            tableHtml += generateInstanceRow('', '', 0);
        }
        
        tableHtml += `
                </div>
                <button type="button" class="animated-button add-instance-btn" onclick="addBitaxeInstance()">
                    + Add Device
                </button>
            </div>`;
        
        return tableHtml;
    }

    /**
     * Generates HTML for a single Bitaxe instance row.
     * @param {string} name - The device name.
     * @param {string} url - The device URL.
     * @param {number} index - The row index.
     * @returns {string} The HTML string for the instance row.
     */
    function generateInstanceRow(name, url, index) {
        return `
            <div class="instance-row" data-index="${index}">
                <input type="text" class="instance-name" placeholder="Device Name" value="${name}">
                <input type="text" class="instance-url" placeholder="http://192.168.1.100" value="${url}">
                <button type="button" class="animated-button remove-instance-btn" onclick="removeBitaxeInstance(${index})">
                    Remove
                </button>
            </div>`;
    }

    /**
     * Adds a new empty Bitaxe instance row.
     */
    function addBitaxeInstance() {
        const container = document.getElementById('bitaxe-instances-rows');
        const newIndex = container.children.length;
        const newRow = document.createElement('div');
        newRow.innerHTML = generateInstanceRow('', '', newIndex);
        container.appendChild(newRow.firstElementChild);
        
        // Update indices for all rows
        updateInstanceIndices();
    }

    /**
     * Removes a Bitaxe instance row.
     * @param {number} index - The index of the row to remove.
     */
    function removeBitaxeInstance(index) {
        const container = document.getElementById('bitaxe-instances-rows');
        const rows = container.querySelectorAll('.instance-row');
        
        // Don't allow removing the last row
        if (rows.length <= 1) {
            alert('At least one device instance is required.');
            return;
        }
        
        const rowToRemove = container.querySelector(`[data-index="${index}"]`);
        if (rowToRemove) {
            rowToRemove.remove();
            updateInstanceIndices();
        }
    }

    /**
     * Updates the data-index attributes and onclick handlers for all instance rows.
     */
    function updateInstanceIndices() {
        const container = document.getElementById('bitaxe-instances-rows');
        const rows = container.querySelectorAll('.instance-row');
        
        rows.forEach((row, index) => {
            row.setAttribute('data-index', index);
            const removeBtn = row.querySelector('.remove-instance-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `removeBitaxeInstance(${index})`);
            }
        });
    }

    /**
     * Collects data from all Bitaxe instance rows.
     * @returns {Array} Array of instance objects.
     */
    function collectBitaxeInstancesData() {
        const container = document.getElementById('bitaxe-instances-rows');
        if (!container) {
            console.error('Bitaxe instances container not found');
            return [];
        }
        
        const rows = container.querySelectorAll('.instance-row');
        const instances = [];
        
        console.log(`Found ${rows.length} instance rows`);
        
        rows.forEach((row, index) => {
            const nameInput = row.querySelector('.instance-name');
            const urlInput = row.querySelector('.instance-url');
            const name = nameInput ? nameInput.value.trim() : '';
            const url = urlInput ? urlInput.value.trim() : '';
            
            console.log(`Row ${index}: name="${name}", url="${url}"`);
            
            if (name && url) {
                const instance = {};
                instance[name] = url;
                instances.push(instance);
            }
        });
        
        console.log('Collected instances:', instances);
        return instances;
    }

    /**
     * Generates HTML for the Display Fields editor with add/remove functionality for sections and fields.
     * @param {Array} displayFields - Array of display field section objects from the configuration.
     * @param {string} fieldKey - The field key (display_fields or mining_core_display_fields).
     * @returns {string} The HTML string for the display fields editor.
     */
    function generateDisplayFieldsEditor(displayFields, fieldKey) {
        const fieldsArray = Array.isArray(displayFields) ? displayFields : [];
        const editorId = `${fieldKey}-editor`;
        const sectionsId = `${fieldKey}-sections`;
        
        let editorHtml = `
            <div id="${editorId}" class="display-fields-editor">
                <div class="editor-header">
                    <h4>Sections and Fields</h4>
                    <button type="button" class="animated-button add-section-btn" onclick="addDisplayFieldSection('${fieldKey}')">
                        + Add Section
                    </button>
                </div>
                <div id="${sectionsId}" class="display-sections">`;
        
        // Add existing sections
        fieldsArray.forEach((sectionObj, sectionIndex) => {
            const sectionName = Object.keys(sectionObj)[0] || '';
            const sectionFields = sectionObj[sectionName] || [];
            editorHtml += generateDisplayFieldSection(sectionName, sectionFields, fieldKey, sectionIndex);
        });
        
        // Add at least one empty section if no sections exist
        if (fieldsArray.length === 0) {
            editorHtml += generateDisplayFieldSection('', [], fieldKey, 0);
        }
        
        editorHtml += `
                </div>
            </div>`;
        
        return editorHtml;
    }

    /**
     * Generates HTML for a single display field section.
     * @param {string} sectionName - The name of the section.
     * @param {Array} fields - Array of field objects in this section.
     * @param {string} fieldKey - The field key (display_fields or mining_core_display_fields).
     * @param {number} sectionIndex - The section index.
     * @returns {string} The HTML string for the section.
     */
    function generateDisplayFieldSection(sectionName, fields, fieldKey, sectionIndex) {
        let sectionHtml = `
            <div class="display-section" data-field-key="${fieldKey}" data-section-index="${sectionIndex}">
                <div class="section-header">
                    <input type="text" class="section-name-input" placeholder="Section Name" value="${sectionName}">
                    <button type="button" class="animated-button remove-section-btn" onclick="removeDisplayFieldSection('${fieldKey}', ${sectionIndex})">
                        Remove Section
                    </button>
                </div>
                <div class="section-fields">
                    <div class="fields-header">
                        <span>Field Key</span>
                        <span>Display Name</span>
                        <span>Actions</span>
                    </div>
                    <div class="fields-rows">`;
        
        // Add existing fields
        fields.forEach((fieldObj, fieldIndex) => {
            const fieldKey = Object.keys(fieldObj)[0] || '';
            const displayName = fieldObj[fieldKey] || '';
            sectionHtml += generateDisplayFieldRow(fieldKey, displayName, sectionIndex, fieldIndex);
        });
        
        // Add at least one empty field if no fields exist
        if (fields.length === 0) {
            sectionHtml += generateDisplayFieldRow('', '', sectionIndex, 0);
        }
        
        sectionHtml += `
                    </div>
                    <button type="button" class="animated-button add-field-btn" onclick="addDisplayField('${fieldKey}', ${sectionIndex})">
                        + Add Field
                    </button>
                </div>
            </div>`;
        
        return sectionHtml;
    }

    /**
     * Generates HTML for a single display field row.
     * @param {string} fieldKey - The field key.
     * @param {string} displayName - The display name.
     * @param {number} sectionIndex - The section index.
     * @param {number} fieldIndex - The field index.
     * @returns {string} The HTML string for the field row.
     */
    function generateDisplayFieldRow(fieldKey, displayName, sectionIndex, fieldIndex) {
        return `
            <div class="field-row" data-section-index="${sectionIndex}" data-field-index="${fieldIndex}">
                <input type="text" class="field-key-input" placeholder="fieldKey" value="${fieldKey}">
                <input type="text" class="field-display-input" placeholder="Display Name" value="${displayName}">
                <button type="button" class="animated-button remove-field-btn" onclick="removeDisplayField('${fieldKey}', ${sectionIndex}, ${fieldIndex})">
                    Remove
                </button>
            </div>`;
    }

    /**
     * Adds a new empty display field section.
     * @param {string} fieldKey - The field key (display_fields or mining_core_display_fields).
     */
    function addDisplayFieldSection(fieldKey) {
        const container = document.getElementById(`${fieldKey}-sections`);
        const newIndex = container.children.length;
        const newSection = document.createElement('div');
        newSection.innerHTML = generateDisplayFieldSection('', [], fieldKey, newIndex);
        container.appendChild(newSection.firstElementChild);
        
        // Update indices for all sections
        updateDisplayFieldIndices(fieldKey);
    }

    /**
     * Removes a display field section.
     * @param {string} fieldKey - The field key.
     * @param {number} sectionIndex - The index of the section to remove.
     */
    function removeDisplayFieldSection(fieldKey, sectionIndex) {
        const container = document.getElementById(`${fieldKey}-sections`);
        const sections = container.querySelectorAll('.display-section');
        
        // Don't allow removing the last section
        if (sections.length <= 1) {
            alert('At least one display field section is required.');
            return;
        }
        
        const sectionToRemove = container.querySelector(`[data-section-index="${sectionIndex}"]`);
        if (sectionToRemove) {
            sectionToRemove.remove();
            updateDisplayFieldIndices(fieldKey);
        }
    }

    /**
     * Adds a new empty field to a section.
     * @param {string} fieldKey - The field key.
     * @param {number} sectionIndex - The section index.
     */
    function addDisplayField(fieldKey, sectionIndex) {
        const section = document.querySelector(`[data-field-key="${fieldKey}"][data-section-index="${sectionIndex}"]`);
        const fieldsContainer = section.querySelector('.fields-rows');
        const newFieldIndex = fieldsContainer.children.length;
        
        const newRow = document.createElement('div');
        newRow.innerHTML = generateDisplayFieldRow('', '', sectionIndex, newFieldIndex);
        fieldsContainer.appendChild(newRow.firstElementChild);
        
        // Update indices for all fields in this section
        updateDisplayFieldIndices(fieldKey);
    }

    /**
     * Removes a field from a section.
     * @param {string} fieldKey - The field key.
     * @param {number} sectionIndex - The section index.
     * @param {number} fieldIndex - The field index.
     */
    function removeDisplayField(fieldKey, sectionIndex, fieldIndex) {
        const section = document.querySelector(`[data-field-key="${fieldKey}"][data-section-index="${sectionIndex}"]`);
        const fieldsContainer = section.querySelector('.fields-rows');
        const fieldRows = fieldsContainer.querySelectorAll('.field-row');
        
        // Don't allow removing the last field
        if (fieldRows.length <= 1) {
            alert('At least one field is required per section.');
            return;
        }
        
        const fieldToRemove = fieldsContainer.querySelector(`[data-field-index="${fieldIndex}"]`);
        if (fieldToRemove) {
            fieldToRemove.remove();
            updateDisplayFieldIndices(fieldKey);
        }
    }

    /**
     * Updates the data-index attributes and onclick handlers for all display field elements.
     * @param {string} fieldKey - The field key.
     */
    function updateDisplayFieldIndices(fieldKey) {
        const container = document.getElementById(`${fieldKey}-sections`);
        const sections = container.querySelectorAll('.display-section');
        
        sections.forEach((section, sectionIndex) => {
            section.setAttribute('data-section-index', sectionIndex);
            
            // Update remove section button
            const removeSectionBtn = section.querySelector('.remove-section-btn');
            if (removeSectionBtn) {
                removeSectionBtn.setAttribute('onclick', `removeDisplayFieldSection('${fieldKey}', ${sectionIndex})`);
            }
            
            // Update add field button
            const addFieldBtn = section.querySelector('.add-field-btn');
            if (addFieldBtn) {
                addFieldBtn.setAttribute('onclick', `addDisplayField('${fieldKey}', ${sectionIndex})`);
            }
            
            // Update field rows
            const fieldRows = section.querySelectorAll('.field-row');
            fieldRows.forEach((row, fieldIndex) => {
                row.setAttribute('data-section-index', sectionIndex);
                row.setAttribute('data-field-index', fieldIndex);
                
                const removeFieldBtn = row.querySelector('.remove-field-btn');
                if (removeFieldBtn) {
                    removeFieldBtn.setAttribute('onclick', `removeDisplayField('${fieldKey}', ${sectionIndex}, ${fieldIndex})`);
                }
            });
        });
    }

    /**
     * Collects data from all display field sections and fields.
     * @param {string} fieldKey - The field key.
     * @returns {Array} Array of display field section objects.
     */
    function collectDisplayFieldsData(fieldKey) {
        const container = document.getElementById(`${fieldKey}-sections`);
        if (!container) {
            console.error(`Display fields container not found for ${fieldKey}`);
            return [];
        }
        
        const sections = container.querySelectorAll('.display-section');
        const displayFields = [];
        
        console.log(`Found ${sections.length} display field sections for ${fieldKey}`);
        
        sections.forEach((section, sectionIndex) => {
            const sectionNameInput = section.querySelector('.section-name-input');
            const sectionName = sectionNameInput ? sectionNameInput.value.trim() : '';
            
            if (!sectionName) return; // Skip sections without names
            
            const fieldRows = section.querySelectorAll('.field-row');
            const fields = [];
            
            fieldRows.forEach((row, fieldIndex) => {
                const fieldKeyInput = row.querySelector('.field-key-input');
                const fieldDisplayInput = row.querySelector('.field-display-input');
                const fieldKey = fieldKeyInput ? fieldKeyInput.value.trim() : '';
                const displayName = fieldDisplayInput ? fieldDisplayInput.value.trim() : '';
                
                console.log(`Section "${sectionName}" Field ${fieldIndex}: key="${fieldKey}", display="${displayName}"`);
                
                if (fieldKey && displayName) {
                    const fieldObj = {};
                    fieldObj[fieldKey] = displayName;
                    fields.push(fieldObj);
                }
            });
            
            if (fields.length > 0) {
                const sectionObj = {};
                sectionObj[sectionName] = fields;
                displayFields.push(sectionObj);
            }
        });
        
        console.log(`Collected ${displayFields.length} display field sections for ${fieldKey}:`, displayFields);
        return displayFields;
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
     * Handles the submission of the configuration form, sending data to the backend.
     * @param {Event} e - The form submission event.
     * @param {Function} closeModal - A function to close the modal on success.
     */
    async function handleConfigFormSubmit(e, closeModal) {
        e.preventDefault();
        const form = e.target;

        // Validate port range
        const portInput = form.querySelector('[name="web_server_port"]');
        if (portInput && (Number(portInput.value) < 1 || Number(portInput.value) > 65535)) {
            alert('Web server port must be between 1 and 65535.');
            return;
        }

        // Validate cookie age
        const cookieAgeInput = form.querySelector('[name="cookie_max_age"]');
        if (cookieAgeInput && Number(cookieAgeInput.value) < 300) {
            alert('Cookie max age must be at least 300 seconds (5 minutes).');
            return;
        }

        const payload = {};

        configFormConfig.forEach(category => {
            category.fields.forEach(field => {
                let value;
                
                if (field.type === 'bitaxe_instances_table') {
                    // Handle bitaxe instances specially - no DOM element with name attribute
                    value = collectBitaxeInstancesData();
                    if (value.length === 0) {
                        alert('At least one Bitaxe device instance is required.');
                        return;
                    }
                    payload[field.key] = value;
                } else if (field.type === 'display_fields_editor') {
                    // Handle display fields specially - no DOM element with name attribute
                    value = collectDisplayFieldsData(field.key);
                    if (value.length === 0) {
                        alert(`At least one section is required for ${field.label}.`);
                        return;
                    }
                    payload[field.key] = value;
                } else {
                    // Handle all other field types normally
                    const element = form.querySelector(`[name="${field.key}"]`);
                    if (!element) return;

                    if (field.type === 'checkbox') {
                        value = element.checked;
                    } else if (field.type === 'number') {
                        value = Number(element.value);
                    } else {
                        value = element.value;
                    }

                    payload[field.key] = value;
                }
            });
        });

        console.log('Configuration payload being sent:', payload);
        
        try {
            const response = await fetch('/api/configuration', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (response.ok) {
                alert('Configuration saved successfully! Changes have been applied immediately - no restart needed.');
                closeModal();
            } else {
                alert(`Error saving configuration: ${result.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Failed to save configuration:', error);
            alert('Failed to send configuration to the server. See console for details.');
        }
    }

    /**
     * Creates and displays the configuration modal.
     */
    async function openConfigModal() {
        const existingModal = document.getElementById('config-modal');
        if (existingModal) existingModal.remove();

        try {
            // Fetch current configuration
            const response = await fetch('/api/configuration');
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'Failed to load configuration');
            }

            const configData = result.data;
            const formHtml = generateSettingsFormHtml(configData, configFormConfig);
            const modalHtml = `
                <div id="config-modal" class="modal">
                    <div class="modal-content">
                        <span class="close-button">&times;</span>
                        <h2>Application Configuration</h2>
                        <form id="config-form" novalidate>
                            ${formHtml}
                            <div class="modal-actions">
                                <button type="button" class="animated-button cancel-button">Cancel</button>
                                <button type="submit" class="animated-button">Save Configuration</button>
                            </div>
                        </form>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            const modal = document.getElementById('config-modal');
            const form = document.getElementById('config-form');
            const closeModal = () => modal.remove();

            modal.querySelector('.close-button').addEventListener('click', closeModal);
            modal.querySelector('.cancel-button').addEventListener('click', closeModal);
            window.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
            form.addEventListener('submit', (e) => handleConfigFormSubmit(e, closeModal));

        } catch (error) {
            console.error('Failed to open configuration modal:', error);
            alert('Failed to load configuration. See console for details.');
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

    // Make instance management functions globally accessible for onclick handlers
    window.addBitaxeInstance = addBitaxeInstance;
    window.removeBitaxeInstance = removeBitaxeInstance;
    
    // Make display field management functions globally accessible for onclick handlers
    window.addDisplayFieldSection = addDisplayFieldSection;
    window.removeDisplayFieldSection = removeDisplayFieldSection;
    window.addDisplayField = addDisplayField;
    window.removeDisplayField = removeDisplayField;

    // Expose public functions
    return {
        openSettingsModal,
        openConfirmModal,
        openConfigModal,
        addBitaxeInstance,
        removeBitaxeInstance,
        collectBitaxeInstancesData
    };
})();