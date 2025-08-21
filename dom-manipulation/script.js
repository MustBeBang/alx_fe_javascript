// Dynamic Quote Generator with Enhanced Server Sync and Conflict Resolution
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
        this.serverUrl = 'https://jsonplaceholder.typicode.com/posts';
        this.userId = this.getUserId();
        this.syncInProgress = false;
        this.conflictData = null;

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

        // Perform initial sync
        this.syncWithServer();
    }

    getUserId() {
        // Get or create a unique user ID for this browser
        let userId = localStorage.getItem('userId');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userId', userId);
        }
        return userId;
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
            dateAdded: new Date().toISOString(),
            id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            lastModified: new Date().toISOString()
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

        // Trigger sync if auto-sync is enabled
        if (this.isAutoSyncEnabled) {
            this.syncWithServer();
        }
    }

    saveCustomQuotes() {
        const customQuotes = this.quotes.filter(quote => quote.isCustom);
        localStorage.setItem('customQuotes', JSON.stringify(customQuotes));
        localStorage.setItem('lastLocalUpdate', new Date().toISOString());
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
        const exportData = {
            quotes: customQuotes,
            exportDate: new Date().toISOString(),
            userId: this.userId,
            version: '2.0'
        };
        const dataStr = JSON.stringify(exportData, null, 2);
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
                const importData = JSON.parse(e.target.result);
                let importedQuotes = [];

                // Handle both old and new format
                if (Array.isArray(importData)) {
                    importedQuotes = importData;
                } else if (importData.quotes && Array.isArray(importData.quotes)) {
                    importedQuotes = importData.quotes;
                } else {
                    throw new Error('Invalid file format');
                }
                
                // Validate quote structure
                const validQuotes = importedQuotes.filter(quote => 
                    quote.text && quote.category
                );

                if (validQuotes.length === 0) {
                    throw new Error('No valid quotes found');
                }

                // Mark as custom and add metadata
                validQuotes.forEach(quote => {
                    quote.isCustom = true;
                    quote.dateAdded = quote.dateAdded || new Date().toISOString();
                    quote.lastModified = new Date().toISOString();
                    if (!quote.id) {
                        quote.id = 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                    }
                });

                // Add to existing quotes
                this.quotes.push(...validQuotes);

                // Save to localStorage
                this.saveCustomQuotes();

                // Update UI
                this.populateCategories();
                this.updateStats();

                this.showNotification(`Imported ${validQuotes.length} quotes successfully`, 'success');

                // Trigger sync if auto-sync is enabled
                if (this.isAutoSyncEnabled) {
                    this.syncWithServer();
                }

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
        this.userId = this.getUserId(); // Generate new user ID

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

    // Enhanced Sync functionality with real server interaction
    async syncWithServer() {
        if (this.syncInProgress) {
            this.showNotification('Sync already in progress', 'warning');
            return;
        }

        this.syncInProgress = true;
        this.updateSyncStatus('syncing', 'Syncing...');
        
        try {
            // Fetch server data
            const serverData = await this.fetchServerData();
            
            // Check for conflicts
            const conflicts = this.detectConflicts(serverData);
            
            if (conflicts.hasConflicts) {
                // Show conflict resolution modal
                this.showConflictModal(conflicts);
            } else {
                // No conflicts, merge data
                await this.mergeServerData(serverData);
                
                // Upload local changes
                await this.uploadLocalChanges();
                
                this.lastSyncTime = new Date().toISOString();
                localStorage.setItem('lastSyncTime', this.lastSyncTime);
                
                this.updateSyncStatus('online', 'Online');
                this.updateStats();
                this.showNotification('Sync completed successfully', 'success');
            }
            
        } catch (error) {
            this.updateSyncStatus('offline', 'Sync Failed');
            this.showNotification('Sync failed: ' + error.message, 'error');
        } finally {
            this.syncInProgress = false;
        }
    }

    async fetchServerData() {
        try {
            // Fetch posts from JSONPlaceholder (simulating quotes)
            const response = await fetch(`${this.serverUrl}?userId=1`);
            if (!response.ok) {
                throw new Error('Failed to fetch server data');
            }
            
            const posts = await response.json();
            
            // Transform posts to quotes format
            const serverQuotes = posts.slice(0, 5).map(post => ({
                id: 'server_' + post.id,
                text: post.title,
                category: 'server',
                author: 'Server User ' + post.userId,
                isCustom: true,
                dateAdded: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                lastModified: new Date().toISOString(),
                serverId: post.id
            }));
            
            return serverQuotes;
        } catch (error) {
            console.error('Error fetching server data:', error);
            throw error;
        }
    }

    detectConflicts(serverData) {
        const localQuotes = this.quotes.filter(q => q.isCustom);
        const lastLocalUpdate = localStorage.getItem('lastLocalUpdate');
        const lastServerSync = this.lastSyncTime;
        
        // Check if there are both local and server changes since last sync
        const hasLocalChanges = lastLocalUpdate && (!lastServerSync || new Date(lastLocalUpdate) > new Date(lastServerSync));
        const hasServerChanges = serverData.length > 0;
        
        const conflicts = {
            hasConflicts: hasLocalChanges && hasServerChanges,
            localQuotes: localQuotes,
            serverQuotes: serverData,
            localCount: localQuotes.length,
            serverCount: serverData.length,
            lastLocalUpdate: lastLocalUpdate,
            lastServerSync: lastServerSync
        };
        
        return conflicts;
    }

    showConflictModal(conflicts) {
        this.conflictData = conflicts;
        const modal = document.getElementById('conflictModal');
        const details = document.getElementById('conflictDetails');
        
        const localTime = conflicts.lastLocalUpdate ? new Date(conflicts.lastLocalUpdate).toLocaleString() : 'Unknown';
        const serverTime = conflicts.lastServerSync ? new Date(conflicts.lastServerSync).toLocaleString() : 'Never';
        
        details.innerHTML = `
            <h4>Conflict Details:</h4>
            <p><strong>Local quotes:</strong> ${conflicts.localCount} quotes</p>
            <p><strong>Server quotes:</strong> ${conflicts.serverCount} quotes</p>
            <p><strong>Last local update:</strong> ${localTime}</p>
            <p><strong>Last server sync:</strong> ${serverTime}</p>
            <p class="conflict-warning">⚠️ Both local and server have changes. Choose how to resolve:</p>
        `;
        
        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('conflictModal').style.display = 'none';
        this.conflictData = null;
        this.syncInProgress = false;
    }

    async resolveConflict(action) {
        if (!this.conflictData) return;
        
        switch (action) {
            case 'local':
                // Keep local data, ignore server changes
                this.showNotification('Kept local data, server changes ignored', 'info');
                await this.uploadLocalChanges();
                break;
                
            case 'server':
                // Replace local with server data
                const customQuotes = this.quotes.filter(q => q.isCustom);
                this.quotes = this.quotes.filter(q => !q.isCustom);
                this.quotes.push(...this.conflictData.serverQuotes);
                this.saveCustomQuotes();
                this.populateCategories();
                this.updateStats();
                this.showNotification('Updated with server data, local changes discarded', 'info');
                break;
                
            case 'merge':
                // Merge both datasets intelligently
                await this.mergeConflictData();
                break;
        }
        
        this.lastSyncTime = new Date().toISOString();
        localStorage.setItem('lastSyncTime', this.lastSyncTime);
        this.updateSyncStatus('online', 'Online');
        this.updateStats();
        
        this.closeModal();
    }

    async mergeConflictData() {
        if (!this.conflictData) return;
        
        // Get existing custom quotes
        const localQuotes = this.quotes.filter(q => q.isCustom);
        const serverQuotes = this.conflictData.serverQuotes;
        
        // Create a map for deduplication based on text similarity
        const mergedMap = new Map();
        
        // Add local quotes first (giving them priority in case of duplicates)
        localQuotes.forEach(quote => {
            const key = this.generateQuoteKey(quote);
            mergedMap.set(key, quote);
        });
        
        // Add server quotes, checking for duplicates
        let newQuotesCount = 0;
        serverQuotes.forEach(quote => {
            const key = this.generateQuoteKey(quote);
            if (!mergedMap.has(key)) {
                mergedMap.set(key, quote);
                newQuotesCount++;
            }
        });
        
        // Update quotes array
        this.quotes = this.quotes.filter(q => !q.isCustom);
        this.quotes.push(...Array.from(mergedMap.values()));
        
        // Save and update UI
        this.saveCustomQuotes();
        this.populateCategories();
        this.updateStats();
        
        this.showNotification(`Merge complete: ${newQuotesCount} new quotes from server, ${localQuotes.length} local quotes preserved`, 'success');
    }

    generateQuoteKey(quote) {
        // Generate a key for deduplication based on text similarity
        return quote.text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    }

    async mergeServerData(serverData) {
        // Simple merge when there are no conflicts
        const existingIds = new Set(this.quotes.filter(q => q.serverId).map(q => q.serverId));
        
        const newQuotes = serverData.filter(quote => !existingIds.has(quote.serverId));
        
        if (newQuotes.length > 0) {
            this.quotes.push(...newQuotes);
            this.saveCustomQuotes();
            this.populateCategories();
            this.updateStats();
            this.showNotification(`Added ${newQuotes.length} new quotes from server`, 'info');
        }
    }

    async uploadLocalChanges() {
        const localQuotes = this.quotes.filter(q => q.isCustom && !q.serverId);
        
        if (localQuotes.length === 0) return;
        
        try {
            // Upload each local quote to the server
            for (const quote of localQuotes) {
                const response = await fetch(this.serverUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        title: quote.text,
                        body: `Category: ${quote.category}, Author: ${quote.author}`,
                        userId: 1
                    }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                });
                
                if (response.ok) {
                    const result = await response.json();
                    quote.serverId = result.id;
                }
            }
            
            // Save updated quotes with server IDs
            this.saveCustomQuotes();
            this.showNotification(`Uploaded ${localQuotes.length} quotes to server`, 'success');
            
        } catch (error) {
            console.error('Error uploading quotes:', error);
            this.showNotification('Failed to upload some quotes', 'warning');
        }
    }

    toggleAutoSync() {
        this.isAutoSyncEnabled = !this.isAutoSyncEnabled;
        localStorage.setItem('autoSyncEnabled', this.isAutoSyncEnabled.toString());

        const button = document.getElementById('toggleAutoSync');
        if (this.isAutoSyncEnabled) {
            button.textContent = '⏰ Auto-Sync: ON';
            button.className = 'auto-sync-on';
            this.startAutoSync();
            this.showNotification('Auto-sync enabled (every 30 seconds)', 'info');
            // Perform immediate sync
            this.syncWithServer();
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
        
        // Sync every 30 seconds for demonstration (in production, this would be longer)
        this.syncInterval = setInterval(() => {
            this.syncWithServer();
        }, 30 * 1000);
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
        
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Add close functionality
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        container.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': '✓',
            'error': '✗',
            'warning': '⚠',
            'info': 'ℹ'
        };
        return icons[type] || icons['info'];
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