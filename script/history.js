// History management functionality
class HistoryManager {
    constructor() {
        this.storageKey = 'dart_converter_history';
        this.maxHistoryItems = 50;
    }

    getHistory() {
        try {
            const history = localStorage.getItem(this.storageKey);
            return JSON.parse(history || '{}');
        } catch (error) {
            console.error('Error parsing history:', error);
            return {};
        }
    }

    saveToHistory(className, jsonString) {
        try {
            const history = this.getHistory();
            const timestamp = new Date().toISOString();

            // Create history entry
            history[className] = {
                className,
                jsonString,
                timestamp,
                preview: this.generatePreview(jsonString)
            };

            // Limit history size
            const entries = Object.entries(history);
            if (entries.length > this.maxHistoryItems) {
                // Sort by timestamp and keep only the most recent items
                entries.sort((a, b) => new Date(b[1].timestamp) - new Date(a[1].timestamp));
                const limitedHistory = {};
                entries.slice(0, this.maxHistoryItems).forEach(([key, value]) => {
                    limitedHistory[key] = value;
                });
                localStorage.setItem(this.storageKey, JSON.stringify(limitedHistory));
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(history));
            }

            this.renderHistory();
        } catch (error) {
            console.error('Error saving to history:', error);
        }
    }

    generatePreview(jsonString) {
        try {
            const obj = JSON.parse(jsonString);
            const keys = Object.keys(obj).slice(0, 3);
            return keys.length > 0 ? keys.join(', ') + (Object.keys(obj).length > 3 ? '...' : '') : 'Empty';
        } catch {
            return 'Invalid JSON';
        }
    }

    renderHistory() {
        const historyContainer = document.getElementById('history');
        const history = this.getHistory();

        if (!historyContainer) return;

        // Sort history by timestamp (newest first)
        const sortedEntries = Object.entries(history).sort((a, b) =>
            new Date(b[1].timestamp) - new Date(a[1].timestamp)
        );

        if (sortedEntries.length === 0) {
            historyContainer.innerHTML = '<p class="text-muted">No history yet</p>';
            return;
        }

        historyContainer.innerHTML = sortedEntries.map(([key, entry]) => `
            <button type="button" 
                    class="list-group-item list-group-item-action" 
                    onclick="historyManager.selectHistory('${key}')"
                    title="${entry.preview}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <strong>${entry.className}</strong>
                        <br>
                        <small class="text-muted">${entry.preview}</small>
                    </div>
                    <button type="button" 
                            class="btn btn-sm btn-outline-danger ms-2" 
                            onclick="event.stopPropagation(); historyManager.deleteHistoryItem('${key}')"
                            title="Delete">
                        ×
                    </button>
                </div>
                <small class="text-muted d-block mt-1">
                    ${this.formatTimestamp(entry.timestamp)}
                </small>
            </button>
        `).join('');
    }

    selectHistory(className) {
        const history = this.getHistory();
        const entry = history[className];

        if (!entry) return;

        // Populate form fields
        const classNameInput = document.getElementById('class-name');
        const jsonInput = document.getElementById('json-input');

        if (classNameInput) classNameInput.value = entry.className;
        if (jsonInput) {
            jsonInput.value = entry.jsonString;
            // Format JSON for better readability
            try {
                const formatted = JSON.stringify(JSON.parse(entry.jsonString), null, 2);
                jsonInput.value = formatted;
            } catch (error) {
                jsonInput.value = entry.jsonString;
            }
        }

        // Clear output
        const dartOutput = document.getElementById('dart-output');
        if (dartOutput) dartOutput.value = '';

        // Show feedback
        this.showNotification(`Loaded: ${className}`, 'success');
    }

    deleteHistoryItem(className) {
        if (!confirm(`Delete "${className}" from history?`)) return;

        const history = this.getHistory();
        delete history[className];
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        this.renderHistory();
        this.showNotification(`Deleted: ${className}`, 'info');
    }

    clearHistory() {
        if (!confirm('Clear all history? This cannot be undone.')) return;

        localStorage.removeItem(this.storageKey);
        this.renderHistory();
        this.showNotification('History cleared', 'info');
    }

    formatTimestamp(timestamp) {
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;

            return date.toLocaleDateString();
        } catch {
            return 'Unknown';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 1050; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    exportHistory() {
        const history = this.getHistory();
        const dataStr = JSON.stringify(history, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'dart_converter_history.json';
        link.click();
    }

    importHistory(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedHistory = JSON.parse(e.target.result);
                const currentHistory = this.getHistory();
                const mergedHistory = { ...currentHistory, ...importedHistory };

                localStorage.setItem(this.storageKey, JSON.stringify(mergedHistory));
                this.renderHistory();
                this.showNotification('History imported successfully', 'success');
            } catch (error) {
                this.showNotification('Error importing history: Invalid file format', 'danger');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize history manager
const historyManager = new HistoryManager();

// Make it available globally
window.historyManager = historyManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    historyManager.renderHistory();
});