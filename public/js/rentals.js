/**
 * Rentals Tracker & Return Management Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentSearch = '';
  let currentStatus = 'ALL';

  const searchInput = document.getElementById('rental-search');
  const statusFilter = document.getElementById('rental-status-filter');
  const tbody = document.getElementById('rentals-tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');

  async function loadRentals() {
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem;">
          <div class="skeleton" style="height: 40px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 40px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 40px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await api.get('/api/rentals', {
        search: currentSearch,
        status: currentStatus !== 'ALL' ? currentStatus : undefined,
        page: currentPage,
        limit: 15,
      });

      if (!res.success) throw new Error(res.error);

      renderRentalsTable(res.rentals);
      updatePagination(res.total, res.page, res.totalPages);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Failed to load rentals</div>
            <p class="empty-state-text">${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  function renderRentalsTable(rentals) {
    if (!rentals || rentals.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">📖</div>
            <div class="empty-state-title">No rentals found</div>
            <p class="empty-state-text">No book rentals match the current criteria.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rentals
      .map((r) => {
        let statusBadge = '';
        let daysBadge = '';

        if (r.rentalStatus === 'RETURNED') {
          statusBadge = '<span class="badge badge-neutral">Returned</span>';
          daysBadge = `<span style="color: var(--text-muted);">Returned on ${formatDate(r.returnedAt)}</span>`;
        } else if (r.rentalStatus === 'OVERDUE') {
          statusBadge = '<span class="badge badge-danger">OVERDUE</span>';
          daysBadge = `<span class="badge badge-danger">${Math.abs(r.daysRemaining)} days late</span>`;
        } else if (r.rentalStatus === 'DUE_SOON') {
          statusBadge = '<span class="badge badge-warning">Due Soon</span>';
          daysBadge = `<span class="badge badge-warning">${r.daysRemaining} days left</span>`;
        } else {
          statusBadge = '<span class="badge badge-primary">Active</span>';
          daysBadge = `<span>${r.daysRemaining} days left</span>`;
        }

        return `
        <tr>
          <td>
            <div style="font-weight: 600;">${escapeHtml(r.memberName)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(r.memberPhone)}</div>
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(r.bookName)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${escapeHtml(r.transactionId)}</div>
          </td>
          <td>${formatDate(r.rentalStartDate)}</td>
          <td><strong>${formatDate(r.rentalDueDate)}</strong></td>
          <td>${daysBadge}</td>
          <td>${statusBadge}</td>
          <td>
            ${
              !r.returned
                ? `<button class="btn btn-sm btn-primary return-book-btn" data-id="${r._id}" data-book="${escapeHtml(r.bookName)}">
                    Mark Returned
                   </button>`
                : `<span style="font-size: 0.75rem; color: var(--success); font-weight: 600;">✓ Completed</span>`
            }
          </td>
        </tr>
      `;
      })
      .join('');

    document.querySelectorAll('.return-book-btn').forEach((btn) => {
      btn.addEventListener('click', () => handleReturnBook(btn.dataset.id, btn.dataset.book));
    });
  }

  function updatePagination(total, page, totalPages) {
    if (!paginationInfo) return;
    paginationInfo.textContent = `Showing page ${page} of ${totalPages} (${total} total records)`;
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  // Handle Mark Returned
  async function handleReturnBook(transactionId, bookName) {
    if (!confirm(`Confirm return of "${bookName}"? This will return 1 copy back to library inventory.`)) {
      return;
    }

    try {
      const res = await api.post(`/api/rentals/${transactionId}/return`);
      if (!res.success) throw new Error(res.error);

      showToast(`"${bookName}" successfully returned! Stock replenished.`, 'success', 'Book Returned');
      loadRentals();
    } catch (err) {
      showToast(err.message, 'error', 'Return Failed');
    }
  }

  // Filters
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadRentals();
      }, 300)
    );
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatus = e.target.value;
      currentPage = 1;
      loadRentals();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadRentals();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadRentals();
    });
  }

  // Initial Load
  loadRentals();
});
