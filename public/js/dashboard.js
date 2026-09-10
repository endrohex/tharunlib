/**
 * Dashboard Overview & Live Polling Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  let lastSeenTxTimestamp = null;
  let pollTimer = null;
  let isInitialLoad = true;

  // Request browser notification permission if supported
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }

  // Load Dashboard Summary
  async function loadDashboardData() {
    try {
      const res = await api.get('/api/dashboard/summary');
      if (!res.success) return;

      const { stats, recentTransactions, lowStockBooks, overdueList, latestTransactionTimestamp } = res;

      // Check for live new transactions
      if (latestTransactionTimestamp && lastSeenTxTimestamp && latestTransactionTimestamp !== lastSeenTxTimestamp) {
        // Detect newest transaction
        const newest = recentTransactions[0];
        if (newest) {
          const actionText = newest.type === 'RENT' ? 'rented' : 'purchased';
          const notificationTitle = 'New Transaction Received!';
          const notificationMsg = `${newest.memberName} ${actionText} "${newest.bookName}" (${formatCurrency(newest.amount)})`;

          showToast(notificationMsg, 'success', notificationTitle);

          // Browser Push Notification if page hidden
          if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notificationTitle, {
              body: notificationMsg,
              icon: '/assets/icon.png',
            });
          }
        }
      }

      lastSeenTxTimestamp = latestTransactionTimestamp;

      // Update Metric Cards
      document.getElementById('stat-total-books').textContent = stats.totalBooks.toLocaleString();
      document.getElementById('stat-available-copies').textContent = stats.availableCopies.toLocaleString();
      document.getElementById('stat-total-members').textContent = stats.totalMembers.toLocaleString();
      document.getElementById('stat-active-rentals').textContent = stats.activeRentals.toLocaleString();
      document.getElementById('stat-overdue-rentals').textContent = stats.overdueRentals.toLocaleString();
      document.getElementById('stat-today-tx').textContent = stats.todayTransactions.toLocaleString();
      document.getElementById('stat-total-revenue').textContent = formatCurrency(stats.totalRevenue);

      // Render Recent Transactions
      renderRecentTransactions(recentTransactions);

      // Render Low Stock Books
      renderLowStockBooks(lowStockBooks);

      // Render Overdue Rentals Widget
      renderOverdueRentals(overdueList);

      isInitialLoad = false;
    } catch (err) {
      console.warn('Dashboard data fetch note:', err.message);
    }
  }

  function renderRecentTransactions(transactions) {
    const tbody = document.getElementById('recent-tx-tbody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state" style="padding: 2rem;">
            <p>No transactions recorded yet.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions
      .map(
        (tx) => `
      <tr>
        <td>
          <div style="font-weight: 600;">${escapeHtml(tx.memberName)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(tx.memberPhone)}</div>
        </td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(tx.bookName)}</div>
        </td>
        <td>
          <span class="badge ${tx.type === 'RENT' ? 'badge-primary' : 'badge-success'}">
            ${tx.type}
          </span>
        </td>
        <td>
          <strong>${formatCurrency(tx.amount)}</strong>
        </td>
        <td style="font-size: 0.8125rem; color: var(--text-secondary);">
          ${formatDateTime(tx.createdAt)}
        </td>
      </tr>
    `
      )
      .join('');
  }

  function renderLowStockBooks(books) {
    const container = document.getElementById('low-stock-list');
    if (!container) return;

    if (!books || books.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
          ✓ All book titles have healthy inventory!
        </div>
      `;
      return;
    }

    container.innerHTML = books
      .map(
        (b) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <img src="${b.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120'}" 
               style="width: 32px; height: 44px; border-radius: 4px; object-fit: cover;" alt="cover" />
          <div>
            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(b.title)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(b.author)}</div>
          </div>
        </div>
        <span class="badge ${b.availableCopies === 0 ? 'badge-danger' : 'badge-warning'}">
          ${b.availableCopies} left
        </span>
      </div>
    `
      )
      .join('');
  }

  function renderOverdueRentals(rentals) {
    const container = document.getElementById('overdue-list-widget');
    if (!container) return;

    if (!rentals || rentals.length === 0) {
      container.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
          ✓ No rentals are currently overdue!
        </div>
      `;
      return;
    }

    container.innerHTML = rentals
      .map((r) => {
        const diffDays = Math.ceil((new Date() - new Date(r.rentalDueDate)) / (1000 * 60 * 60 * 24));
        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle);">
          <div>
            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(r.bookName)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(r.memberName)} (${r.memberPhone})</div>
          </div>
          <span class="badge badge-danger">
            ${diffDays} day${diffDays === 1 ? '' : 's'} overdue
          </span>
        </div>
      `;
      })
      .join('');
  }

  // Initial Load
  loadDashboardData();

  // Setup 5-Second Real-Time Live Sync Polling
  pollTimer = setInterval(loadDashboardData, 5000);

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (pollTimer) clearInterval(pollTimer);
  });
});
