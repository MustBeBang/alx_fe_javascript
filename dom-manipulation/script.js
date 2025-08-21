// script.js
class QuoteGenerator {
  constructor() {
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
    this.init();
  }

  init() {
    this.loadQuotes();
    this.loadUserPreferences();
    this.populateCategories();
    this.setupEventListeners();
    this.updateStats();
    this.restoreLastFilter();
    this.showRandomQuote();
    if (this.isAutoSyncEnabled) this.startAutoSync();
    this.syncWithServer();
  }

  getUserId() {
    let userId = localStorage.getItem('userId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', userId);
    }
    return userId;
  }

  setupEventListeners() {
    document.getElementById('newQuote').addEventListener('click', () => this.showRandomQuote());
    document.getElementById('toggleAddForm').addEventListener('click', () => this.toggleAddForm());
    document.getElementById('clearQuotes').addEventListener('click', () => this.clearCustomQuotes());
    document.getElementById('exportJson').addEventListener('click', () => this.exportQuotes());
    document.getElementById('importJsonBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => this.importQuotes(e));
    document.getElementById('clearStorage').addEventListener('click', () => this.clearAllData());
    document.getElementById('syncNow').addEventListener('click', () => this.syncWithServer());
    document.getElementById('toggleAutoSync').addEventListener('click', () => this.toggleAutoSync());
    // Conflict modal buttons
    document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
    document.getElementById('keepLocal').addEventListener('click', () => this.resolveConflict('local'));
    document.getElementById('useServer').addEventListener('click', () => this.resolveConflict('server'));
    document.getElementById('mergeData').addEventListener('click', () => this.resolveConflict('merge'));
    // Close modal on outside click
    document.getElementById('conflictModal').addEventListener('click', (e) => {
      if (e.target.id === 'conflictModal') this.closeModal();
    });
  }

  loadQuotes() {
    const customQuotes = JSON.parse(localStorage.getItem('customQuotes') || '[]');
    this.quotes = [...this.defaultQuotes, ...customQuotes];
    this.quotes.forEach((quote, index) => {
      if (index >= this.defaultQuotes.length) quote.isCustom = true;
    });
  }

  loadUserPreferences() {
    this.currentFilter = localStorage.getItem('selectedCategory') || 'all';
    this.isAutoSyncEnabled = localStorage.getItem('autoSyncEnabled') === 'true';
    this.lastSyncTime = localStorage.getItem('lastSyncTime');
    this.sessionViews = 0;
  }

  populateCategories() {
    const categories = new Set();
    this.quotes.forEach(q => { if (q.category) categories.add(q.category); });
    const sortedCategories = Array.from(categories).sort();

    const categoryFilters = document.getElementById('categoryFilters');
    if (categoryFilters) categoryFilters.innerHTML = '';
    sortedCategories.forEach(cat => {
      if (categoryFilters) {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = cat;
        btn.textContent = this.capitalizeFirst(cat);
        btn.addEventListener('click', () => this.filterQuotes(cat));
        categoryFilters.appendChild(btn);
      }
    });

    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
      categorySelect.innerHTML = '';
      sortedCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = this.capitalizeFirst(cat);
        categorySelect.appendChild(option);
      });
    }
  }

  filterQuotes(category = null) {
    if (category === null) {
      const select = document.getElementById('categoryFilter');
      category = select ? select.value : this.currentFilter;
    }
    this.currentFilter = category;
    localStorage.setItem('selectedCategory', category);

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.category === category) btn.classList.add('active');
    });

    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) categorySelect.value = category;

    this.showRandomQuote();
    this.showNotification(`Filtered by: ${category === 'all' ? 'All Categories' : this.capitalizeFirst(category)}`, 'info');
  }

  restoreLastFilter() {
    if (this.currentFilter && this.currentFilter !== 'all') this.filterQuotes(this.currentFilter);
  }

  getFilteredQuotes() {
    if (this.currentFilter === 'all') return this.quotes;
    return this.quotes.filter(q => q.category === this.currentFilter);
  }

  showRandomQuote() {
    const filteredQuotes = this.getFilteredQuotes();
    if (filteredQuotes.length === 0) {
      this.displayQuote({ text: "No quotes available in this category. Try adding some!", category: "Notice", author: "" });
      return;
    }
    const idx = Math.floor(Math.random() * filteredQuotes.length);
    const quote = filteredQuotes[idx];
    this.displayQuote(quote);
    this.sessionViews++;
    this.updateStats();
  }

  displayQuote(quote) {
    const display = document.getElementById('quoteDisplay');
    const textEl = display.querySelector('.quote-text');
    const catEl = display.querySelector('.quote-category');
    display.style.opacity = '0.5';
    setTimeout(() => {
      textEl.textContent = `"${quote.text}"`;
      const catText = quote.author ? `${this.capitalizeFirst(quote.category)} - ${quote.author}` : this.capitalizeFirst(quote.category);
      catEl.textContent = catText;
      display.style.opacity = '1';
      display.classList.add('fade-in');
      setTimeout(() => display.classList.remove('fade-in'), 600);
    }, 150);
  }

  toggleAddForm() {
    const form = document.getElementById('addQuoteForm');
    const btn = document.getElementById('toggleAddForm');
    if (form.classList.contains('active')) {
      form.classList.remove('active');
      btn.textContent = 'Add New Quote';
    } else {
      form.classList.add('active');
      btn.textContent = 'Hide Form';
      document.getElementById('newQuoteText').focus();
    }
  }

  addQuote() {
    const text = document.getElementById('newQuoteText').value.trim();
    const category = document.getElementById('newQuoteCategory').value.trim().toLowerCase();
    const author = document.getElementById('quoteAuthor').value.trim();
    if (!text) { this.showNotification('Please enter a quote text', 'warning'); return; }
    if (!category) { this.showNotification('Please enter a category', 'warning'); return; }

    const newQuote = {
      text,
      category,
      author: author || 'Anonymous',
      isCustom: true,
      dateAdded: new Date().toISOString(),
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      lastModified: new Date().toISOString()
    };

    this.quotes.push(newQuote);
    this.saveCustomQuotes();
    this.populateCategories();

    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';
    document.getElementById('quoteAuthor').value = '';

    const successMsg = document.getElementById('successMessage');
    successMsg.textContent = 'Quote added successfully!';
    successMsg.classList.add('show');
    setTimeout(() => successMsg.classList.remove('show'), 3000);

    this.updateStats();
    this.showNotification(`New quote added to ${this.capitalizeFirst(category)}`, 'success');
    if (this.currentFilter === category || this.currentFilter === 'all') {
      if (Math.random() < 0.3) this.displayQuote(newQuote);
    }
    if (this.isAutoSyncEnabled) this.syncWithServer();
  }

  saveCustomQuotes() {
    const customQuotes = this.quotes.filter(q => q.isCustom);
    localStorage.setItem('customQuotes', JSON.stringify(customQuotes));
    localStorage.setItem('lastLocalUpdate', new Date().toISOString());
  }

  clearCustomQuotes() {
    if (!confirm('Are you sure you want to clear all custom quotes? This action cannot be undone.')) return;
    this.quotes = this.quotes.filter(q => !q.isCustom);
    localStorage.removeItem('customQuotes');
    this.populateCategories();
    this.updateStats();
    this.showNotification('Custom quotes cleared successfully', 'info');
    this.showRandomQuote();
  }

  updateStats() {
    document.getElementById('totalQuotes').textContent = this.quotes.length;
    const cats = new Set(this.quotes.map(q => q.category));
    document.getElementById('totalCategories').textContent = cats.size;
    document.getElementById('customQuotes').textContent = this.quotes.filter(q => q.isCustom).length;
    document.getElementById('sessionQuotes').textContent = this.sessionViews;
    const lastSyncText = this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString() : 'Never';
    document.getElementById('lastSyncTime').textContent = lastSyncText;
  }

  exportQuotes() {
    const customQuotes = this.quotes.filter(q => q.isCustom);
    const exportData = {
      quotes: customQuotes,
      exportDate: new Date().toISOString(),
      userId: this.userId,
      version: '2.0'
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const fileName = `quotes-export-${new Date().toISOString().split('T')[0]}.json`;
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', fileName);
    link.click();
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
        if (Array.isArray(importData)) importedQuotes = importData;
        else if (importData.quotes && Array.isArray(importData.quotes)) importedQuotes = importData.quotes;
        else throw new Error('Invalid file format');
        const validQuotes = importedQuotes.filter(q => q.text && q.category);
        if (validQuotes.length === 0) throw new Error('No valid quotes found');
        validQuotes.forEach(q => {
          q.isCustom = true;
          q.dateAdded = q.dateAdded || new Date().toISOString();
          q.lastModified = new Date().toISOString();
          if (!q.id) q.id = 'imported_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        });
        this.quotes.push(...validQuotes);
        this.saveCustomQuotes();
        this.populateCategories();
        this.updateStats();
        this.showNotification(`Imported ${validQuotes.length} quotes successfully`, 'success');
        if (this.isAutoSyncEnabled) this.syncWithServer();
      } catch (err) {
        this.showNotification('Error importing quotes: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  clearAllData() {
    if (!confirm('This will clear ALL data including custom quotes and preferences. Are you sure?')) return;
    localStorage.clear();
    this.quotes = [...this.defaultQuotes];
    this.currentFilter = 'all';
    this.sessionViews = 0;
    this.isAutoSyncEnabled = false;
    this.lastSyncTime = null;
    this.userId = this.getUserId();
    this.populateCategories();
    this.updateStats();
    this.restoreLastFilter();
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    const syncBtn = document.getElementById('toggleAutoSync');
    syncBtn.textContent = '⏰ Auto-Sync: OFF';
    syncBtn.className = 'auto-sync-off';
    this.showNotification('All data cleared successfully', 'info');
    this.showRandomQuote();
  }

  async syncWithServer() {
    if (this.syncInProgress) {
      this.showNotification('Sync already in progress', 'warning');
      return;
    }
    this.syncInProgress = true;
    this.updateSyncStatus('syncing', 'Syncing...');
    try {
      const serverData = await this.fetchServerData();
      const conflicts = this.detectConflicts(serverData);
      if (conflicts.hasConflicts) {
        this.showConflictModal(conflicts);
      } else {
        await this.mergeServerData(serverData);
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
      const response = await fetch(`${this.serverUrl}?userId=1`);
      if (!response.ok) throw new Error('Failed to fetch server data');
      const posts = await response.json();
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
    const hasLocalChanges = lastLocalUpdate && (!lastServerSync || new Date(lastLocalUpdate) > new Date(lastServerSync));
    const hasServerChanges = serverData.length > 0;
    return {
      hasConflicts: hasLocalChanges && hasServerChanges,
      localQuotes,
      serverQuotes: serverData,
      localCount: localQuotes.length,
      serverCount: serverData.length,
      lastLocalUpdate,
      lastServerSync
    };
  }

  showConflictModal(conflicts) {
    this.conflictData = conflicts;
    const modal = document.getElementById('conflictModal');
    const details = document.getElementById('conflictDetails');
    const localTime = conflicts.lastLocalUpdate ? new Date(conflicts.lastLocalUpdate).toLocaleString() : 'Unknown';
    const serverTime = conflicts.lastServerSync ? new Date(conflicts.lastServerSync).toLocaleString() : 'Never';

    details.innerHTML = `
      <p><strong>Local quotes:</strong> ${conflicts.localCount} quotes</p>
      <p><strong>Server quotes:</strong> ${conflicts.serverCount} quotes</p>
      <p><strong>Last local update:</strong> ${localTime}</p>
      <p><strong>Last server sync:</strong> ${serverTime}</p>
      <p>⚠️ Both local and server have changes. Choose how to resolve:</p>
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
    switch(action) {
      case 'local':
        this.showNotification('Kept local data, server changes ignored', 'info');
        await this.uploadLocalChanges();
        break;
      case 'server':
        this.quotes = this.quotes.filter(q => !q.isCustom);
        this.quotes.push(...this.conflictData.serverQuotes);
        this.saveCustomQuotes();
        this.populateCategories();
        this.updateStats();
        this.showNotification('Updated with server data, local changes discarded', 'info');
        break;
      case 'merge':
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
    const localQuotes = this.quotes.filter(q => q.isCustom);
    const serverQuotes = this.conflictData.serverQuotes;
    const mergedMap = new Map();

    localQuotes.forEach(q => {
      mergedMap.set(this.generateQuoteKey(q), q);
    });
    let newQuotesCount = 0;
    serverQuotes.forEach(q => {
      const key = this.generateQuoteKey(q);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, q);
        newQuotesCount++;
      }
    });

    this.quotes = this.quotes.filter(q => !q.isCustom);
    this.quotes.push(...Array.from(mergedMap.values()));

    this.saveCustomQuotes();
    this.populateCategories();
    this.updateStats();
    this.showNotification(`Merge complete: ${newQuotesCount} new quotes from server, ${localQuotes.length} local quotes preserved`, 'success');
  }

  generateQuoteKey(q) {
    return q.text.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
  }

  async mergeServerData(serverData) {
    const existingIds = new Set(this.quotes.filter(q => q.serverId).map(q => q.serverId));
    const newQuotes = serverData.filter(q => !existingIds.has(q.serverId));
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
      for (const quote of localQuotes) {
        const response = await fetch(this.serverUrl, {
          method: 'POST',
          body: JSON.stringify({ title: quote.text, body: `Category: ${quote.category}, Author: ${quote.author}`, userId: 1 }),
          headers: { 'Content-type': 'application/json; charset=UTF-8' }
        });
        if (response.ok) {
          const result = await response.json();
          quote.serverId = result.id;
        }
      }
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
    const btn = document.getElementById('toggleAutoSync');
    if (this.isAutoSyncEnabled) {
      btn.textContent = '⏰ Auto-Sync: ON';
      btn.className = 'auto-sync-on';
      this.startAutoSync();
      this.showNotification('Auto-sync enabled (every 30 seconds)', 'info');
      this.syncWithServer();
    } else {
      btn.textContent = '⏰ Auto-Sync: OFF';
      btn.className = 'auto-sync-off';
      this.stopAutoSync();
      this.showNotification('Auto-sync disabled', 'info');
    }
  }

  startAutoSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => this.syncWithServer(), 30000);
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
    if (indicator) indicator.className = `status-indicator ${status}`;
    if (statusText) statusText.textContent = text;
  }

  showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icons = { 'success': '✓', 'error': '✗', 'warning': '⚠', 'info': 'ℹ' };
    const icon = icons[type] || 'ℹ';
    notification.innerHTML = `<span class="notification-icon">${icon}</span><div class="notification-message">${message}</div><button class="notification-close" title="Close">×</button>`;
    notification.querySelector('.notification-close').addEventListener('click', () => notification.remove());
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) notification.remove();
      }, 300);
    }, 5000);
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

function addQuote() { window.quoteApp.addQuote(); }
function filterQuotes() { window.quoteApp.filterQuotes(); }

document.addEventListener('DOMContentLoaded', () => {
  window.quoteApp = new QuoteGenerator();
});
