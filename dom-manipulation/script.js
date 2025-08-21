// Dynamic Quote Generator with Enhanced Filtering System
class QuoteGenerator {
    constructor() {
        // Default quotes with categories
        this.defaultQuotes = [
            { text: "The only way to do great work is to love what you do.", category: "motivation", author: "Steve Jobs" },
            { text: "Life is what happens to you while you're busy making other plans.", category: "life", author: "John Lennon" },
            { text: "The future belongs to those who believe in the beauty of their dreams.", category: "dreams", author: "Eleanor Roosevelt" },
            { text: "It is during our darkest moments that we must focus to see the light.", category: "inspiration", author: "Aristotle" },
            { text: "The way to get started is to quit talking and begin doing.", category: "motivation", author: "Walt Disney" },
            { text: "Don't let yesterday take up too much of today.", category: "life", author: "Will Rogers" },
            { text: "You learn more from failure than from success.", category: "learning", author: "Unknown" },
            { text: "If you are working on something exciting that you really care about, you don't have to be pushed.", category: "passion", author: "Steve Jobs" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "success", author: "Winston Churchill" },
            { text: "The only impossible journey is the one you never begin.", category: "inspiration", author: "Tony Robbins" }
        ];

        // Application state
        this.quotes = [];
        this.sessionViews = 0;
        this.currentFilter = 'all';
        this.isAutoSyncEnabled = false;
        this.lastSyncTime = null;
        this.syncInterval = null;

        // Initialize the application
        this.init();
    }

    init() {
        this.loadQuotes();
        this.loadUserPreferences();
        this.populateCategories();
        this.setupEventListeners();
        this.updateStats();
        this.restoreLastFilter();
        
        // Show initial quote
        this.showRandomQuote();
        
        // Setup auto-sync if enabled
        if (this.isAutoSyncEnabled) {
            this.startAutoSync();
        }
    }

    setupEventListeners() {
        // Main controls
        document.getElementById('newQuote').addEventListener('click', () => this.showRandomQuote());
        document.getElementById('toggleAddForm').addEventListener('click', () => this.toggleAddForm());
        document.getElementById('clearQuotes').addEventListener('click', () => this.clearCustomQuotes());

        // Storage controls
        document.getElementById('exportJson').addEventListener('click', () => this.exportQuotes());
        document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importQuotes(e));
        document.getElementById('clearStorage').addEventListener('click', () => this.clearAllData());

        // Sync controls
        document.getElementById('syncNow').addEventListener('click', () => this.syncWithServer());
        document.getElementById('toggleAutoSync').addEventListener('click', () => this.toggleAutoSync());

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('keepLocal').addEventListener('click', () => this.resolveConflict('local'));
        document.getElementById('useServer').addEventListener('click', () => this.resolveConflict('server'));
        document.getElementById('mergeData').addEventListener('click', () => this.resolveConflict('merge'));

        // Close modal when clicking outside
        document.getElementById('conflictModal').addEventListener('click', (e) => {
            if (e.target.id === 'conflictModal') {
                this.closeModal();
            }
        });
    }

    loadQuotes() {
        // Load custom quotes from storage
        const customQuotes = JSON.parse(localStorage.getItem('customQuotes') || '[]');
        
        // Combine default and custom quotes
        this.quotes = [...this.defaultQuotes, ...customQuotes];
        
        // Mark custom quotes
        this.quotes.forEach((quote, index) => {
            if (index >= this.defaultQuotes.length) {
                quote.isCustom = true;
            }
        });
    }

    loadUserPreferences() {
        // Load user preferences
        this.currentFilter = localStorage.getItem('selectedCategory') || 'all';
        this.isAutoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
        this.lastSyncTime = localStorage.getItem('lastSyncTime');
        this.sessionViews = 0; // Reset session views on page load
    }

    populateCategories() {
        // Extract unique categories from quotes
        const categories = new Set();
        this.quotes.forEach(quote => {
            if (quote.category) {
                categories.add(quote.category);
            }
        });

        // Sort categories alphabetically
        const sortedCategories = Array.from(categories).sort();

        // Update category filter buttons
        const categoryFilters = document.getElementById('categoryFilters');
        categoryFilters.innerHTML = '<button class="category-btn active" data-category="all">All Categories</button>';

        sortedCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.setAttribute('data-category', category);
            button.textContent = this.capitalizeFirst(category);
            button.addEventListener('click', () => this.filterQuotes(category));
            categoryFilters.appendChild(button);
        });

        // Update the select dropdown if it exists
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="all">All Categories</option>';
            sortedCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = this.capitalizeFirst(category);
                categorySelect.appendChild(option);
            });
        }
    }

    filterQuotes(category = null) {
        // If no category provided, get from event or current filter
        if (category === null) {
            const select = document.getElementById('categoryFilter');
            category = select ? select.value : this.currentFilter;
        }

        this.currentFilter = category;
        
        // Save selected filter to localStorage
        localStorage.setItem('selectedCategory', category);

        // Update active button state
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-category') === category) {
                btn.classList.add('active');
            }
        });

        // Update select dropdown if it exists
        const categorySelect = document.getElementById('categoryFilter');
        if (categorySelect) {
            categorySelect.value = category;
        }

        // Show a quote from the filtered category
        this.showRandomQuote();
        
        // Show notification
        this.showNotification(`Filtered by: ${category === 'all' ? 'All Categories' : this.capitalizeFirst(category)}`, 'info');
    }

    restoreLastFilter() {
        // Restore the last selected filter
        if (this.currentFilter && this.currentFilter !== 'all') {
            this.filterQuotes(this.currentFilter);
        }
    }

    getFilteredQuotes() {
        if (this.currentFilter === 'all') {
            return this.quotes;
        }
        return this.quotes.filter(quote => quote.category === this.currentFilter);
    }

    showRandomQuote() {
        const filteredQuotes = this.getFilteredQuotes();
        
        if (filteredQuotes.length === 0) {
            this.displayQuote({
                text: "No quotes available in this category. Try adding some!",
                category: "Notice",
                author: ""
            });
            return;
        }

        const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
        const quote = filteredQuotes[randomIndex];
        
        this.displayQuote(quote);
        this.sessionViews++;
        this.updateStats();
    }

    displayQuote(quote) {
        const quoteDisplay = document.getElementById('quoteDisplay');
        const quoteText = quoteDisplay.querySelector('.quote-text');
        const quoteCategory = quoteDisplay.querySelector('.quote-category');

        // Add fade out effect
        quoteDisplay.style.opacity = '0.5';
        
        setTimeout(() => {
            quoteText.textContent = `"${quote.text}"`;
            const categoryText = quote.author ? 
                `${this.capitalizeFirst(quote.category)} - ${quote.author}` : 
                this.capitalizeFirst(quote.category);
            quoteCategory.textContent = categoryText;

            // Add fade in effect
            quoteDisplay.style.opacity = '1';
            quoteDisplay.classList.add('fade-in');
            
            // Remove animation class after animation completes
            setTimeout(() => {
                quoteDisplay.classList.remove('fade-in');
            }, 600);
        }, 150);
    }

    toggleAddForm() {
        const form = document.getElementById('addQuoteForm');
        const button = document.getElementById('toggleAddForm');
        
        if (form.classList.contains('active')) {
            form.classList.remove('active');
            button.textContent = 'Add New Quote';
        } else {
            form.classList.add('active');
            button.textContent = 'Hide Form';
            // Focus on first input
            document.getElementById('newQuoteText').focus();
        }
    }

    addQuote() {
        const quoteText = document.getElementById('newQuoteText').value.trim();
        const category = document.getElementById('newQuoteCategory').value.trim().toLowerCase();
        const author = document.getElementById('quoteAuthor').value.trim();

        if (!quoteText) {
            this.showNotification('Please enter a quote text', 'warning');
            return;
        }

        if (!category) {
            this.showNotification('Please enter a category', 'warning');
            return;
        }

        const newQuote = {
            text: quoteText,
            category: category,
            author: author || 'Anonymous',
            isCustom: true,
            dateAdded: new Date().toISOString()
        };

        // Add to quotes array
        this.quotes.push(newQuote);

        // Save custom quotes to localStorage
        this.saveCustomQuotes();

        // Update categories dropdown
        this.populateCategories();

        // Clear form
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteCategory').value = '';
        document.getElementById('quoteAuthor').value = '';

        // Show success message
        const successMsg = document.getElementById('successMessage');
        successMsg.textContent = 'Quote added successfully!';
        successMsg.classList.add('show');
        
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 3000);

        // Update stats
        this.updateStats();

        // Show notification
        this.showNotification(`New quote added to ${this.capitalizeFirst(category)}`, 'success');

        // If current filter matches new category, might show the new quote
        if (this.currentFilter === category || this.currentFilter === 'all') {
            // Small chance to show the newly added quote
            if (Math.random() < 0.3) {
                this.displayQuote(newQuote);
            }
        }
    }

    saveCustomQuotes() {
        const customQuotes = this.quotes.filter(quote => quote.isCustom);
        localStorage.setItem('customQuotes', JSON.stringify(customQuotes));
    }

    clearCustomQuotes() {
        if (!confirm('Are you sure you want to clear all custom quotes? This action cannot be undone.')) {
            return;
        }

        // Remove custom quotes
        this.quotes = this.quotes.filter(quote => !quote.isCustom);
        
        // Clear from localStorage
        localStorage.removeItem('customQuotes');

        // Update categories
        this.populateCategories();

        // Update stats
        this.updateStats();

        // Show notification
        this.showNotification('Custom quotes cleared successfully', 'info');

        // Show a new quote
        this.showRandomQuote();
    }

    updateStats() {
        document.getElementById('totalQuotes').textContent = this.quotes.length;
        
        const categories = new Set(this.quotes.map(q => q.category));
        document.getElementById('totalCategories').textContent = categories.size;
        
        const customCount = this.quotes.filter(q => q.isCustom).length;
        document.getElementById('customQuotes').textContent = customCount;
        
        document.getElementById('sessionQuotes').textContent = this.sessionViews;
        
        const lastSync = this.lastSyncTime ? 
            new Date(this.lastSyncTime).toLocaleTimeString() : 'Never';
        document.getElementById('lastSyncTime').textContent = lastSync;
    }

    // Export/Import functionality
    exportQuotes() {
        const customQuotes = this.quotes.filter(quote => quote.isCustom);
        const dataStr = JSON.stringify(customQuotes, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const exportFileDefaultName = `quotes-export-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        this.showNotification('Quotes exported successfully', 'success');
    }

    importQuotes(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedQuotes = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedQuotes)) {
                    throw new Error('Invalid file format');
                }

                // Validate quote structure
                const validQuotes = importedQuotes.filter(quote => 
                    quote.text && quote.category
                );

                if (validQuotes.length === 0) {
                    throw new Error('No valid quotes found');
                }

                // Mark as custom and add timestamp
                validQuotes.forEach(quote => {
                    quote.isCustom = true;
                    quote.dateAdded = quote.dateAdded || new Date().toISOString();
                });

                // Add to existing quotes
                this.quotes.push(...validQuotes);

                // Save to localStorage
                this.saveCustomQuotes();

                // Update UI
                this.populateCategories();
                this.updateStats();

                this.showNotification(`Imported ${validQuotes.length} quotes successfully`, 'success');

            } catch (error) {
                this.showNotification('Error importing quotes: ' + error.message, 'error');
            }
        };

        reader.readAsText(file);
        
        // Clear the file input
        event.target.value = '';
    }

    clearAllData() {
        if (!confirm('This will clear ALL data including custom quotes and preferences. Are you sure?')) {
            return;
        }

        // Clear all localStorage data
        localStorage.clear();

        // Reset to default state
        this.quotes = [...this.defaultQuotes];
        this.currentFilter = 'all';
        this.sessionViews = 0;
        this.isAutoSyncEnabled = false;
        this.lastSyncTime = null;

        // Update UI
        this.populateCategories();
        this.updateStats();
        this.restoreLastFilter();

        // Stop auto sync
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // Update sync button
        const syncBtn = document.getElementById('toggleAutoSync');
        syncBtn.textContent = '⏰ Auto-Sync: OFF';
        syncBtn.className = 'auto-sync-off';

        this.showNotification('All data cleared successfully', 'info');
        this.showRandomQuote();
    }

    // Sync functionality (simulated)
    async syncWithServer() {
        this.updateSyncStatus('syncing', 'Syncing...');
        
        try {
            // Simulate server communication
            await this.simulateServerSync();
            
            this.lastSyncTime = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSyncTime);
            
            this.updateSyncStatus('online', 'Online');
            this.updateStats();
            this.showNotification('Sync completed successfully', 'success');
            
        } catch (error) {
            this.updateSyncStatus('offline', 'Sync Failed');
            this.showNotification('Sync failed: ' + error.message, 'error');
        }
    }

    async simulateServerSync() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate occasional sync conflicts or failures
                const random = Math.random();
                if (random < 0.1) {
                    reject(new Error('Network error'));
                } else if (random < 0.2) {
                    this.showConflictModal();
                    resolve();
                } else {
                    resolve();
                }
            }, 2000);
        });
    }

    showConflictModal() {
        const modal = document.getElementById('conflictModal');
        const details = document.getElementById('conflictDetails');
        
        details.innerHTML = `
            <h4>Conflict Details:</h4>
            <p><strong>Local quotes:</strong> ${this.quotes.filter(q => q.isCustom).length}</p>
            <p><strong>Server quotes:</strong> ${Math.floor(Math.random() * 10) + 5}</p>
            <p><strong>Last sync:</strong> ${this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString() : 'Never'}</p>
        `;
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('conflictModal').style.display = 'none';
    }

    resolveConflict(action) {
        switch (action) {
            case 'local':
                this.showNotification('Kept local data', 'info');
                break;
            case 'server':
                // Simulate server data
                const serverQuotes = [
                    { text: "Server quote 1", category: "server", author: "Server", isCustom: true },
                    { text: "Server quote 2", category: "sync", author: "Auto", isCustom: true }
                ];
                this.quotes = [...this.defaultQuotes, ...serverQuotes];
                this.saveCustomQuotes();
                this.populateCategories();
                this.updateStats();
                this.showNotification('Updated with server data', 'info');
                break;
            case 'merge':
                // Add some simulated server quotes
                const mergeQuotes = [
                    { text: "Merged quote from server", category: "collaboration", author: "Sync", isCustom: true }
                ];
                this.quotes.push(...mergeQuotes);
                this.saveCustomQuotes();
                this.populateCategories();
                this.updateStats();
                this.showNotification('Data merged successfully', 'success');
                break;
        }
        this.closeModal();
    }

    toggleAutoSync() {
        this.isAutoSyncEnabled = !this.isAutoSyncEnabled;
        localStorage.setItem('autoSyncEnabled', this.isAutoSyncEnabled.toString());

        const button = document.getElementById('toggleAutoSync');
        if (this.isAutoSyncEnabled) {
            button.textContent = '⏰ Auto-Sync: ON';
            button.className = 'auto-sync-on';
            this.startAutoSync();
            this.showNotification('Auto-sync enabled', 'info');
        } else {
            button.textContent = '⏰ Auto-Sync: OFF';
            button.className = 'auto-sync-off';
            this.stopAutoSync();
            this.showNotification('Auto-sync disabled', 'info');
        }
    }

    startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        // Sync every 5 minutes
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 5 * 60 * 1000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    updateSyncStatus(status, text) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.status-text');
        
        indicator.className = `status-indicator ${status}`;
        statusText.textContent = text;
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            ${message}
            <button class="notification-close">&times;</button>
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Global functions for HTML onclick handlers
function addQuote() {
    window.quoteApp.addQuote();
}

function filterQuotes() {
    window.quoteApp.filterQuotes();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quoteApp = new QuoteGenerator();
});