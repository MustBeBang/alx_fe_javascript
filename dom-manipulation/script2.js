// Simulated server data (initial)
let serverQuotes = [
  { id: 1, text: "Be yourself; everyone else is already taken.", category: "Motivation", author: "Oscar Wilde", updatedAt: 1692265200000 },
  { id: 2, text: "The only way to do great work is to love what you do.", category: "Success", author: "Steve Jobs", updatedAt: 1692351600000 }
];

// Simulate fetching data from server (returns a Promise)
function fetchServerQuotes() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(JSON.parse(JSON.stringify(serverQuotes))), 1000);
  });
}

// Simulate posting updated quote to server
function postQuoteToServer(newQuote) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const existingIndex = serverQuotes.findIndex(q => q.id === newQuote.id);
      if (existingIndex >= 0) {
        serverQuotes[existingIndex] = { ...newQuote, updatedAt: Date.now() };
      } else {
        serverQuotes.push({ ...newQuote, updatedAt: Date.now(), id: serverQuotes.length + 1 });
      }
      resolve(true);
    }, 1000);
  });
}

function getLocalQuotes() {
  const quotes = localStorage.getItem('quotes');
  return quotes ? JSON.parse(quotes) : [];
}

function saveLocalQuotes(quotes) {
  localStorage.setItem('quotes', JSON.stringify(quotes));
}

// Sync function, server takes precedence
async function syncQuotes() {
  const localQuotes = getLocalQuotes();
  const serverData = await fetchServerQuotes();

  let updated = false;

  // Create maps for simplicity
  const localMap = new Map(localQuotes.map(q => [q.id, q]));
  const serverMap = new Map(serverData.map(q => [q.id, q]));

  // Merge logic: keep server if updatedAt is newer or missing locally
  serverMap.forEach((serverQuote, id) => {
    const localQuote = localMap.get(id);
    if (!localQuote || serverQuote.updatedAt > localQuote.updatedAt) {
      localMap.set(id, serverQuote);
      updated = true;
    }
  });

  // Check for local quotes missing on server (could upload or keep)
  // For now, let's upload local-only quotes to server
  for (const [id, localQuote] of localMap.entries()) {
    if (!serverMap.has(id)) {
      await postQuoteToServer(localQuote);
      updated = true;
    }
  }

  const mergedQuotes = Array.from(localMap.values());

  if (updated) {
    saveLocalQuotes(mergedQuotes);
    notifyUser("Quotes updated from server. Data synchronized.");
  }
}

setInterval(syncQuotes, 60000); // sync every 60 sec

window.addEventListener('load', async () => {
  await syncQuotes();
  // Continue with rendering quotes, etc.
});

const syncNotification = document.getElementById('syncNotification');
const syncMessage = document.getElementById('syncMessage');
const resolveConflictBtn = document.getElementById('resolveConflictBtn');

function notifyUser(message) {
  syncMessage.textContent = message;
  syncNotification.style.display = 'block';
}

// Manual conflict resolution handler
resolveConflictBtn.addEventListener('click', () => {
  // Example strategy: Show list of conflicting quotes, let user choose which version to keep
  // Here we just hide notification for demo
  syncNotification.style.display = 'none';
  alert("Manual conflict resolution - implement as desired.");
});
