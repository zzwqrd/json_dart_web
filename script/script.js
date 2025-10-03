class JsonToDartConverter {
    constructor() {
        this.dartGenerator = new DartGenerator();
        this.modelNewGenerator = new ModelNewGenerator();
        this.history = this.loadHistory();
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.renderHistory();
    }

    initializeElements() {
        // Input elements
        this.classNameInput = document.getElementById('class-name');
        this.jsonInput = document.getElementById('json-input');
        this.dartOutput = document.getElementById('dart-output');

        // Buttons
        this.convertBtn = document.getElementById('convert-btn');
        this.copyBtn = document.getElementById('copy-btn');

        // Checkboxes
        this.checkboxes = {
            generateToJson: document.getElementById('gen-tojson'),
            generateCopyWith: document.getElementById('gen-copywith'),
            generateToString: document.getElementById('gen-tostring'),
            generateKeys: document.getElementById('gen-keys'),
            useNum: document.getElementById('use-num'),
            useSerializable: document.getElementById('use-serializable'),
            useEquatable: document.getElementById('use-equatable'),
            useDefaultValue: document.getElementById('use-default'),
            generateComment: document.getElementById('gen-comment'),
            modelNew: document.getElementById('model-new'),
            singletonPattern: document.getElementById('singleton-pattern'),
            localSave: document.getElementById('local-save'),
            localClear: document.getElementById('local-clear'),
            localGet: document.getElementById('local-get')
        };

        // History
        this.historyList = document.getElementById('history-list');
    }

    bindEvents() {
        // Convert button
        this.convertBtn.addEventListener('click', () => this.convert());

        // Copy button
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Checkbox changes
        Object.entries(this.checkboxes).forEach(([key, checkbox]) => {
            if (checkbox) {
                checkbox.addEventListener('change', () => this.saveSettings());
            }
        });

        // Auto-save inputs
        this.classNameInput.addEventListener('input', () => this.saveSettings());
        this.jsonInput.addEventListener('input', () => this.saveSettings());

        // Enter key in class name input
        this.classNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convert();
            }
        });

        // Ctrl+Enter in JSON input
        this.jsonInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                this.convert();
            }
        });
    }

    convert() {
        const className = this.classNameInput.value.trim();
        const jsonString = this.jsonInput.value.trim();

        // Validation
        if (!className) {
            this.showError('Please enter a class name');
            this.classNameInput.focus();
            return;
        }

        if (!jsonString) {
            this.showError('Please enter JSON data');
            this.jsonInput.focus();
            return;
        }

        try {
            // Format JSON
            const parsedJson = JSON.parse(jsonString);
            const formattedJson = JSON.stringify(parsedJson, null, 2);
            this.jsonInput.value = formattedJson;

            // Get current settings
            const settings = this.getCurrentSettings();

            // Generate Dart class
            let dartClass;
            if (settings.modelNew) {
                // Set current class name for the generator
                this.modelNewGenerator.setCurrentClassName(className);
                dartClass = this.modelNewGenerator.generate(className, parsedJson, settings);
            } else {
                // Update generator options
                this.dartGenerator.setOptions(settings);
                dartClass = this.dartGenerator.generateDartClass(className, formattedJson);
            }

            this.dartOutput.value = dartClass;

            // Save to history
            this.saveToHistory(className, formattedJson);

            // Save current state
            this.saveSettings();

            this.showSuccess('Dart class generated successfully!');

        } catch (error) {
            this.showError('Error: ' + error.message);
        }
    }

    getCurrentSettings() {
        const settings = {};
        Object.entries(this.checkboxes).forEach(([key, checkbox]) => {
            if (checkbox) {
                settings[key] = checkbox.checked;
            }
        });
        return settings;
    }

    copyToClipboard() {
        const dartCode = this.dartOutput.value;

        if (!dartCode.trim()) {
            this.showError('No code to copy');
            return;
        }

        navigator.clipboard.writeText(dartCode).then(() => {
            this.showSuccess('Code copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            this.dartOutput.select();
            document.execCommand('copy');
            this.showSuccess('Code copied to clipboard!');
        });
    }

    saveToHistory(className, jsonString) {
        const historyItem = {
            className,
            jsonString,
            timestamp: Date.now()
        };

        // Remove existing entry with same class name
        this.history = this.history.filter(item => item.className !== className);

        // Add to beginning
        this.history.unshift(historyItem);

        // Keep only last 20 items
        this.history = this.history.slice(0, 20);

        // Save and render
        localStorage.setItem('dart-converter-history', JSON.stringify(this.history));
        this.renderHistory();
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('dart-converter-history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    renderHistory() {
        this.historyList.innerHTML = '';

        if (this.history.length === 0) {
            this.historyList.innerHTML = '<div class="history-empty">No history yet</div>';
            return;
        }

        this.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.textContent = item.className;
            historyItem.title = `Click to load: ${item.className}`;

            historyItem.addEventListener('click', () => {
                this.loadFromHistory(item);
            });

            this.historyList.appendChild(historyItem);
        });
    }

    loadFromHistory(item) {
        this.classNameInput.value = item.className;
        this.jsonInput.value = item.jsonString;
        this.showSuccess(`Loaded: ${item.className}`);
    }

    saveSettings() {
        const settings = {
            className: this.classNameInput.value,
            jsonInput: this.jsonInput.value,
            checkboxes: {}
        };

        Object.entries(this.checkboxes).forEach(([key, checkbox]) => {
            if (checkbox) {
                settings.checkboxes[key] = checkbox.checked;
            }
        });

        localStorage.setItem('dart-converter-settings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('dart-converter-settings');
            if (!saved) return;

            const settings = JSON.parse(saved);

            if (settings.className) {
                this.classNameInput.value = settings.className;
            }

            if (settings.jsonInput) {
                this.jsonInput.value = settings.jsonInput;
            }

            if (settings.checkboxes) {
                Object.entries(settings.checkboxes).forEach(([key, value]) => {
                    if (this.checkboxes[key]) {
                        this.checkboxes[key].checked = value;
                    }
                });
            }
        } catch {
            // Ignore errors
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }

        // Create notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: '#ffffff',
            fontWeight: '500',
            zIndex: '10000',
            backgroundColor: type === 'error' ? '#da3633' : '#238636',
            border: `1px solid ${type === 'error' ? '#f85149' : '#2ea043'}`,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new JsonToDartConverter();

    // Add sample JSON if empty
    const jsonInput = document.getElementById('json-input');
    if (!jsonInput.value.trim()) {
        jsonInput.value = JSON.stringify({
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "age": 30,
            "isActive": true,
            "address": {
                "street": "123 Main St",
                "city": "New York",
                "zipCode": "10001"
            },
            "hobbies": ["reading", "swimming", "coding"]
        }, null, 2);
    }
});