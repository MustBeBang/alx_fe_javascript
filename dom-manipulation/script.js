    // Initialize quotes array with sample data
    let quotes = [];
    
    // Default quotes to load if no storage exists
    const defaultQuotes = [
      { text: "The only way to do great work is to love what you do.", category: "motivation", author: "Steve Jobs", isCustom: false },
      { text: "Innovation distinguishes between a leader and a follower.", category: "innovation", author: "Steve Jobs", isCustom: false },
      { text: "Life is what happens to you while you're busy making other plans.", category: "life", author: "John Lennon", isCustom: false },
      { text: "The future belongs to those who believe in the beauty of their dreams.", category: "dreams", author: "Eleanor Roosevelt", isCustom: false },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "success", author: "Winston Churchill", isCustom: false },
      { text: "The only impossible journey is the one you never begin.", category: "motivation", author: "Tony Robbins", isCustom: false },
      { text: "In the middle of difficulty lies opportunity.", category: "opportunity", author: "Albert Einstein", isCustom: false },
      { text: "Believe you can and you're halfway there.", category: "motivation", author: "Theodore Roosevelt", isCustom: false }
    ];

    let currentCategory = 'all';
    let currentQuoteIndex = -1;
    let sessionQuoteViews = 0;

    // Storage keys for localStorage and sessionStorage
    const STORAGE_KEYS = {
      quotes: 'dynamicQuoteGenerator_quotes',
      preferences: 'dynamicQuoteGenerator_preferences',
      sessionViews: 'dynamicQuoteGenerator_sessionViews',
      lastViewedQuote: 'dynamicQuoteGenerator_lastQuote',
      lastSyncTime: 'dynamicQuoteGenerator_lastSync',
      serverData: 'dynamicQuoteGenerator_serverData',
      localChanges: 'dynamicQuoteGenerator_localChanges'
    };

    // Server simulation configuration
    const SERVER_CONFIG = {
      baseUrl: 'https://jsonplaceholder.typicode.com',
      quotesEndpoint: '/posts', // We'll adapt this for quotes
      syncInterval: 30000, // 30 seconds
      maxRetries: 3,
      retryDelay: 2000
    };

    // Sync state management
    let syncState = {
      isAutoSyncEnabled: false,
      isSyncing: false,
      lastSyncTime: null,
      syncInterval: null,
      retryCount: 0,
      hasLocalChanges: false
    };

    // DOM elements
    const quoteDisplay = document.getElementById('quoteDisplay');
    const newQuoteBtn = document.getElementById('newQuote');
    const toggleFormBtn = document.getElementById('toggleAddForm');
    const clearQuotesBtn = document.getElementById('clearQuotes');
    const addQuoteForm = document.getElementById('addQuoteForm');
    const categoryFilters = document.getElementById('categoryFilters');
    const successMessage = document.getElementById('successMessage');
    const exportJsonBtn = document.getElementById('exportJson');
    const importJsonBtn = document.getElementById('importJsonBtn');
    const importFileInput = document.getElementById('importFile');
    const clearStorageBtn = document.getElementById('clearStorage');
    const syncNowBtn = document.getElementById('syncNow');
    const toggleAutoSyncBtn = document.getElementById('toggleAutoSync');
    const syncStatus = document.getElementById('syncStatus');
    const conflictModal = document.getElementById('conflictModal');
    const notificationContainer = document.getElementById('notificationContainer');

    // Event listeners
    newQuoteBtn.addEventListener('click', showRandomQuote);
    toggleFormBtn.addEventListener('click', toggleAddQuoteForm);
    clearQuotesBtn.addEventListener('click', clearCustomQuotes);
    exportJsonBtn.addEventListener('click', exportToJson);
    importJsonBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importFromJsonFile);
    clearStorageBtn.addEventListener('click', clearAllStorageData);
    syncNowBtn.addEventListener('click', performManualSync);
    toggleAutoSyncBtn.addEventListener('click', toggleAutoSync);
    
    // Modal event listeners
    document.getElementById('closeModal').addEventListener('click', closeConflictModal);
    document.getElementById('keepLocal').addEventListener('click', () => resolveConflict('local'));
    document.getElementById('useServer').addEventListener('click', () => resolveConflict('server'));
    document.getElementById('mergeData').addEventListener('click', () => resolveConflict('merge'));

    // Initialize the application
    function initializeApp() {
      loadQuotesFromStorage();
      loadUserPreferences();
      loadSessionData();
      loadSyncState();
      updateCategoryFilters();
      updateStats();
      updateSyncStatus();
      
      // Load last viewed quote if available
      const lastQuote = getSessionStorage(STORAGE_KEYS.lastViewedQuote);
      if (lastQuote) {
        displayQuote(JSON.parse(lastQuote));
      } else {
        showRandomQuote();
      }

      // Start auto-sync if enabled
      if (syncState.isAutoSyncEnabled) {
        startAutoSync();
      }

      // Initial server connection test
      testServerConnection();
    }

    // Show random quote function with enhanced DOM manipulation and session tracking
    function showRandomQuote() {
      const filteredQuotes = currentCategory === 'all' 
        ? quotes 
        : quotes.filter(quote => quote.category.toLowerCase() === currentCategory.toLowerCase());

      if (filteredQuotes.length === 0) {
        const emptyQuote = {
          text: "No quotes found in this category. Add some quotes!",
          category: "empty",
          author: ""
        };
        displayQuote(emptyQuote);
        return;
      }

      // Get random quote different from current
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * filteredQuotes.length);
      } while (randomIndex === currentQuoteIndex && filteredQuotes.length > 1);

      currentQuoteIndex = randomIndex;
      const selectedQuote = filteredQuotes[randomIndex];
      
      // Update session tracking
      sessionQuoteViews++;
      setSessionStorage(STORAGE_KEYS.sessionViews, sessionQuoteViews.toString());
      setSessionStorage(STORAGE_KEYS.lastViewedQuote, JSON.stringify(selectedQuote));
      
      displayQuote(selectedQuote);
      updateStats();
    }

    // Enhanced display quote function with animations
    function displayQuote(quote) {
      // Add fade out effect
      quoteDisplay.style.opacity = '0';
      quoteDisplay.style.transform = 'translateY(20px)';

      setTimeout(() => {
        // Clear existing content
        quoteDisplay.innerHTML = '';

        // Create and append quote text element
        const quoteText = document.createElement('div');
        quoteText.className = 'quote-text';
        quoteText.textContent = `"${quote.text}"`;
        quoteDisplay.appendChild(quoteText);

        // Create and append category element
        const quoteCategory = document.createElement('div');
        quoteCategory.className = 'quote-category';
        let categoryText = quote.category;
        if (quote.author) {
          categoryText += ` - ${quote.author}`;
        }
        quoteCategory.textContent = categoryText;
        quoteDisplay.appendChild(quoteCategory);

        // Add fade in effect
        quoteDisplay.style.opacity = '1';
        quoteDisplay.style.transform = 'translateY(0)';
        quoteDisplay.classList.add('fade-in');

        // Remove animation class after completion
        setTimeout(() => {
          quoteDisplay.classList.remove('fade-in');
        }, 600);
      }, 200);
    }

    // Create and manage add quote form
    function createAddQuoteForm() {
      const form = document.getElementById('addQuoteForm');
      if (form.classList.contains('active')) {
        form.classList.remove('active');
        toggleFormBtn.textContent = 'Add New Quote';
      } else {
        form.classList.add('active');
        toggleFormBtn.textContent = 'Hide Form';
      }
    }

    // Toggle add quote form visibility
    function toggleAddQuoteForm() {
      createAddQuoteForm();
    }

    // Add new quote function with validation, storage, and sync tracking
    function addQuote() {
      const newQuoteText = document.getElementById('newQuoteText').value.trim();
      const newQuoteCategory = document.getElementById('newQuoteCategory').value.trim();
      const quoteAuthor = document.getElementById('quoteAuthor').value.trim();

      // Validate input
      if (!newQuoteText) {
        showMessage('Please enter a quote text!', 'error');
        return;
      }

      if (!newQuoteCategory) {
        showMessage('Please enter a category!', 'error');
        return;
      }

      // Create new quote object with timestamp for better tracking
      const newQuote = {
        text: newQuoteText,
        category: newQuoteCategory.toLowerCase(),
        author: quoteAuthor || 'Anonymous',
        isCustom: true,
        dateAdded: new Date().toISOString(),
        id: generateUniqueId(),
        lastModified: new Date().toISOString(),
        syncStatus: 'pending' // Track sync status
      };

      // Add to quotes array using advanced array manipulation
      quotes.unshift(newQuote); // Add to beginning for recent first

      // Mark as having local changes
      syncState.hasLocalChanges = true;
      trackLocalChange('add', newQuote);

      // Save to localStorage
      saveQuotes();

      // Clear form fields
      document.getElementById('newQuoteText').value = '';
      document.getElementById('newQuoteCategory').value = '';
      document.getElementById('quoteAuthor').value = '';

      // Update UI dynamically
      updateCategoryFilters();
      updateStats();
      updateSyncStatus();
      
      // Show success message
      showMessage('Quote added and saved to storage!', 'success');
      showNotification('Quote added successfully! Will sync with server shortly.', 'info');

      // Auto-hide form after adding
      setTimeout(() => {
        createAddQuoteForm();
      }, 1500);

      // Display the newly added quote
      displayQuote(newQuote);

      // Trigger sync if auto-sync is enabled
      if (syncState.isAutoSyncEnabled && !syncState.isSyncing) {
        setTimeout(() => performBackgroundSync(), 2000);
      }
    }

    // Dynamic category filter creation and management
    function updateCategoryFilters() {
      // Get unique categories
      const categories = ['all', ...new Set(quotes.map(quote => quote.category.toLowerCase()))];
      
      // Clear existing filters except "All"
      categoryFilters.innerHTML = '<button class="category-btn active" data-category="all">All Categories</button>';

      // Create filter buttons for each category
      categories.slice(1).forEach(category => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'category-btn';
        filterBtn.setAttribute('data-category', category);
        filterBtn.textContent = capitalizeFirst(category);
        
        // Add click event listener
        filterBtn.addEventListener('click', function() {
          setActiveCategory(category);
        });

        categoryFilters.appendChild(filterBtn);
      });
    }

    // Set active category and update UI with preference storage
    function setActiveCategory(category) {
      currentCategory = category;
      
      // Save user preference to localStorage
      saveUserPreferences();
      
      // Update active button state
      const allFilterBtns = categoryFilters.querySelectorAll('.category-btn');
      allFilterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === category) {
          btn.classList.add('active');
        }
      });

      // Show new quote from selected category
      showRandomQuote();
    }

    // Update statistics with DOM manipulation including session data and sync info
    function updateStats() {
      const totalQuotesEl = document.getElementById('totalQuotes');
      const totalCategoriesEl = document.getElementById('totalCategories');
      const customQuotesEl = document.getElementById('customQuotes');
      const sessionQuotesEl = document.getElementById('sessionQuotes');
      const lastSyncEl = document.getElementById('lastSyncTime');

      // Animate number changes
      animateNumber(totalQuotesEl, quotes.length);
      animateNumber(totalCategoriesEl, new Set(quotes.map(q => q.category)).size);
      animateNumber(customQuotesEl, quotes.filter(q => q.isCustom).length);
      animateNumber(sessionQuotesEl, sessionQuoteViews);

      // Update last sync time
      if (syncState.lastSyncTime) {
        const timeAgo = getTimeAgo(new Date(syncState.lastSyncTime));
        lastSyncEl.textContent = timeAgo;
      } else {
        lastSyncEl.textContent = 'Never';
      }
    }

    // Animate number changes
    function animateNumber(element, targetNumber) {
      const currentNumber = parseInt(element.textContent) || 0;
      const increment = targetNumber > currentNumber ? 1 : -1;
      
      if (currentNumber !== targetNumber) {
        const timer = setInterval(() => {
          const current = parseInt(element.textContent);
          if (current === targetNumber) {
            clearInterval(timer);
          } else {
            element.textContent = current + increment;
          }
        }, 50);
      }
    }

    // Clear custom quotes function with storage update
    function clearCustomQuotes() {
      if (quotes.filter(q => q.isCustom).length === 0) {
        showMessage('No custom quotes to clear!', 'error');
        return;
      }

      if (confirm('Are you sure you want to clear all custom quotes?')) {
        quotes = quotes.filter(quote => !quote.isCustom);
        saveQuotes(); // Update localStorage
        updateCategoryFilters();
        updateStats();
        currentCategory = 'all';
        setActiveCategory('all');
        showMessage('Custom quotes cleared and storage updated!', 'success');
      }
    }

    // Show success/error messages
    function showMessage(message, type) {
      successMessage.textContent = message;
      successMessage.className = `success-message ${type === 'error' ? 'error' : 'success'} show`;
      
      if (type === 'error') {
        successMessage.style.background = '#e53e3e';
      } else {
        successMessage.style.background = '#48bb78';
      }

      setTimeout(() => {
        successMessage.classList.remove('show');
      }, 3000);
    }

    // Utility function to capitalize first letter
    function capitalizeFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // === WEB STORAGE FUNCTIONS ===

    // LocalStorage functions for persistent data
    function saveQuotes() {
      try {
        setLocalStorage(STORAGE_KEYS.quotes, JSON.stringify(quotes));
        console.log('Quotes saved to localStorage');
      } catch (error) {
        console.error('Error saving quotes to localStorage:', error);
        showMessage('Error saving quotes to storage', 'error');
      }
    }

    function loadQuotesFromStorage() {
      try {
        const storedQuotes = getLocalStorage(STORAGE_KEYS.quotes);
        if (storedQuotes) {
          quotes = JSON.parse(storedQuotes);
          console.log(`Loaded ${quotes.length} quotes from localStorage`);
        } else {
          // First time loading - use default quotes
          quotes = [...defaultQuotes];
          saveQuotes();
          console.log('Loaded default quotes for first time');
        }
      } catch (error) {
        console.error('Error loading quotes from localStorage:', error);
        quotes = [...defaultQuotes]; // Fallback to defaults
        showMessage('Error loading quotes from storage, using defaults', 'error');
      }
    }

    function saveUserPreferences() {
      try {
        const preferences = {
          currentCategory: currentCategory,
          lastUpdated: new Date().toISOString()
        };
        setLocalStorage(STORAGE_KEYS.preferences, JSON.stringify(preferences));
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
    }

    function loadUserPreferences() {
      try {
        const storedPrefs = getLocalStorage(STORAGE_KEYS.preferences);
        if (storedPrefs) {
          const preferences = JSON.parse(storedPrefs);
          currentCategory = preferences.currentCategory || 'all';
          console.log('Loaded user preferences');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
        currentCategory = 'all'; // Default fallback
      }
    }

    // SessionStorage functions for session-specific data
    function loadSessionData() {
      try {
        const storedViews = getSessionStorage(STORAGE_KEYS.sessionViews);
        sessionQuoteViews = storedViews ? parseInt(storedViews) : 0;
        console.log(`Loaded session data: ${sessionQuoteViews} views`);
      } catch (error) {
        console.error('Error loading session data:', error);
        sessionQuoteViews = 0;
      }
    }

    // Storage helper functions with error handling
    function setLocalStorage(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error(`LocalStorage setItem error for key ${key}:`, error);
        return false;
      }
    }

    function getLocalStorage(key) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error(`LocalStorage getItem error for key ${key}:`, error);
        return null;
      }
    }

    function setSessionStorage(key, value) {
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error(`SessionStorage setItem error for key ${key}:`, error);
        return false;
      }
    }

    function getSessionStorage(key) {
      try {
        return sessionStorage.getItem(key);
      } catch (error) {
        console.error(`SessionStorage getItem error for key ${key}:`, error);
        return null;
      }
    }

    // === JSON IMPORT/EXPORT FUNCTIONS ===

    // Export quotes to JSON file
    function exportToJson() {
      try {
        const exportData = {
          quotes: quotes,
          exportDate: new Date().toISOString(),
          version: "1.0",
          totalQuotes: quotes.length,
          categories: [...new Set(quotes.map(q => q.category))]
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `quotes-export-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up URL object
        URL.revokeObjectURL(url);
        
        showMessage(`Successfully exported ${quotes.length} quotes to JSON!`, 'success');
        console.log('Quotes exported successfully');
        
      } catch (error) {
        console.error('Error exporting quotes:', error);
        showMessage('Error exporting quotes to JSON', 'error');
      }
    }

    // Import quotes from JSON file
    function importFromJsonFile(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      if (!file.name.endsWith('.json')) {
        showMessage('Please select a valid JSON file', 'error');
        return;
      }

      const fileReader = new FileReader();
      
      fileReader.onload = function(e) {
        try {
          const fileContent = e.target.result;
          let importedData;
          
          try {
            importedData = JSON.parse(fileContent);
          } catch (parseError) {
            throw new Error('Invalid JSON format');
          }

          // Validate imported data structure
          let quotesToImport = [];
          
          // Handle different import formats
          if (Array.isArray(importedData)) {
            // Direct array of quotes
            quotesToImport = importedData;
          } else if (importedData.quotes && Array.isArray(importedData.quotes)) {
            // Object with quotes array
            quotesToImport = importedData.quotes;
          } else {
            throw new Error('Invalid quotes data structure');
          }

          // Validate each quote object
          const validQuotes = quotesToImport.filter(quote => {
            return quote && 
                   typeof quote.text === 'string' && 
                   typeof quote.category === 'string' && 
                   quote.text.trim() !== '' && 
                   quote.category.trim() !== '';
          });

          if (validQuotes.length === 0) {
            throw new Error('No valid quotes found in file');
          }

          // Process and add quotes
          const newQuotes = validQuotes.map(quote => ({
            text: quote.text.trim(),
            category: quote.category.toLowerCase().trim(),
            author: quote.author || 'Unknown',
            isCustom: true,
            dateAdded: new Date().toISOString(),
            id: Date.now() + Math.random() // Ensure unique IDs
          }));

          // Add to existing quotes
          const originalCount = quotes.length;
          quotes.push(...newQuotes);
          
          // Save to storage
          saveQuotes();
          
          // Update UI
          updateCategoryFilters();
          updateStats();
          
          const importedCount = newQuotes.length;
          const skippedCount = quotesToImport.length - validQuotes.length;
          
          let message = `Successfully imported ${importedCount} quotes!`;
          if (skippedCount > 0) {
            message += ` (${skippedCount} invalid quotes skipped)`;
          }
          
          showMessage(message, 'success');
          console.log(`Import successful: ${importedCount} quotes added`);
          
        } catch (error) {
          console.error('Import error:', error);
          showMessage(`Import failed: ${error.message}`, 'error');
        } finally {
          // Clear file input
          event.target.value = '';
        }
      };

      fileReader.onerror = function() {
        console.error('File reading error');
        showMessage('Error reading file', 'error');
        event.target.value = '';
      };

      fileReader.readAsText(file);
    }

    // Clear all storage data including sync state
    function clearAllStorageData() {
      if (confirm('⚠️ This will clear ALL quotes, preferences, and sync data. This action cannot be undone. Are you sure?')) {
        try {
          // Stop auto-sync
          if (syncState.syncInterval) {
            clearInterval(syncState.syncInterval);
          }

          // Clear localStorage
          localStorage.removeItem(STORAGE_KEYS.quotes);
          localStorage.removeItem(STORAGE_KEYS.preferences);
          localStorage.removeItem(STORAGE_KEYS.lastSyncTime);
          localStorage.removeItem(STORAGE_KEYS.serverData);
          localStorage.removeItem(STORAGE_KEYS.localChanges);
          
          // Clear sessionStorage
          sessionStorage.removeItem(STORAGE_KEYS.sessionViews);
          sessionStorage.removeItem(STORAGE_KEYS.lastViewedQuote);
          
          // Reset application state
          quotes = [...defaultQuotes];
          currentCategory = 'all';
          sessionQuoteViews = 0;
          syncState = {
            isAutoSyncEnabled: false,
            isSyncing: false,
            lastSyncTime: null,
            syncInterval: null,
            retryCount: 0,
            hasLocalChanges: false
          };
          
          // Save default quotes
          saveQuotes();
          
          // Update UI
          updateCategoryFilters();
          updateStats();
          updateSyncStatus();
          setActiveCategory('all');
          
          showMessage('All data cleared! Application reset to defaults.', 'success');
          showNotification('All data and sync settings have been reset.', 'info');
          console.log('All storage data cleared');
          
        } catch (error) {
          console.error('Error clearing storage:', error);
          showMessage('Error clearing storage data', 'error');
        }
      }
    }

    // Initialize the application when DOM is loaded
    document.addEventListener('DOMContentLoaded', initializeApp);

    // Save data before page unload
    window.addEventListener('beforeunload', function() {
      saveQuotes();
      saveUserPreferences();
      saveSyncState();
      
      // Stop auto-sync
      if (syncState.syncInterval) {
        clearInterval(syncState.syncInterval);
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      updateSyncStatus('online', 'Back online');
      showNotification('Connection restored. Resuming sync...', 'success');
      testServerConnection();
    });

    window.addEventListener('offline', () => {
      updateSyncStatus('offline', 'No connection');
      showNotification('Connection lost. Working offline...', 'warning');
    });

    // Keyboard shortcuts for better UX
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && event.ctrlKey) {
        showRandomQuote();
      } else if (event.key === 'Escape') {
        if (addQuoteForm.classList.contains('active')) {
          createAddQuoteForm();
        }
      }
    });
  