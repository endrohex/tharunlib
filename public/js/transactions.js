/**
 * Transactions Ledger & Receipt Viewer
 */
document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentSearch = '';
  let currentType = 'All';
  let currentStatus = 'All';
  let currentPayment = 'All';

  const searchInput = document.getElementById('tx-search');
  const typeFilter = document.getElementById('tx-type-filter');
  const statusFilter = document.getElementById('tx-status-filter');
  const paymentFilter = document.getElementById('tx-payment-filter');
  const tbody = document.getElementById('transactions-tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');

  async function loadTransactions() {
    if (!tbody) return;
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 3rem;">
          <div class="skeleton" style="height: 40px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 40px; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="height: 40px;"></div>
        </td>
      </tr>
    `;

    try {
      const res = await api.get('/api/transactions', {
        search: currentSearch,
        type: currentType !== 'All' ? currentType : undefined,
        status: currentStatus !== 'All' ? currentStatus : undefined,
        paymentStatus: currentPayment !== 'All' ? currentPayment : undefined,
        page: currentPage,
        limit: 15,
      });

      if (!res.success) throw new Error(res.error);

      renderTransactionsTable(res.transactions);
      updatePagination(res.total, res.page, res.totalPages);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Failed to load transactions</div>
            <p class="empty-state-text">${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  function renderTransactionsTable(transactions) {
    if (!transactions || transactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">
            <div class="empty-state-icon">💳</div>
            <div class="empty-state-title">No transactions found</div>
            <p class="empty-state-text">No records match the current filters.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = transactions
      .map((t) => {
        let payBadge = '<span class="badge badge-neutral">Not Required</span>';
        if (t.paymentStatus === 'CUSTOMER_MARKED_PAID') {
          payBadge = '<span class="badge badge-warning" title="Customer submitted UTR">Marked Paid</span>';
        } else if (t.paymentStatus === 'VERIFIED') {
          payBadge = '<span class="badge badge-success">Verified</span>';
        } else if (t.paymentStatus === 'PENDING') {
          payBadge = '<span class="badge badge-danger">Pending</span>';
        }

        const isOverdue = t.type === 'RENT' && !t.returned && t.rentalDueDate && new Date(t.rentalDueDate) < new Date();
        let statusBadge = '<span class="badge badge-success">Completed</span>';
        if (t.type === 'RENT') {
          if (t.returned) {
            statusBadge = '<span class="badge badge-neutral">Returned</span>';
          } else if (isOverdue) {
            statusBadge = '<span class="badge badge-danger">Overdue</span>';
          } else {
            statusBadge = '<span class="badge badge-primary">Active</span>';
          }
        }

        return `
        <tr>
          <td><strong>${escapeHtml(t.transactionId)}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(t.memberName)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(t.memberPhone)}</div>
          </td>
          <td>${escapeHtml(t.bookName)}</td>
          <td><span class="badge ${t.type === 'RENT' ? 'badge-primary' : 'badge-success'}">${t.type}</span></td>
          <td>${formatDate(t.createdAt)}</td>
          <td>${t.type === 'RENT' ? (t.rentalDueDate ? formatDate(t.rentalDueDate) : '—') : '—'}</td>
          <td><strong>${formatCurrency(t.amount)}</strong></td>
          <td>
            ${payBadge}
            ${t.paymentReference ? `<div style="font-size: 0.7rem; color: var(--text-muted);">Ref: ${escapeHtml(t.paymentReference)}</div>` : ''}
          </td>
          <td>
            <div class="cell-actions">
              <button class="btn btn-sm btn-outline view-receipt-btn" data-id="${t.transactionId}">
                Receipt
              </button>
              ${
                t.paymentStatus === 'CUSTOMER_MARKED_PAID'
                  ? `<button class="btn btn-sm btn-primary verify-pay-btn" data-id="${t._id}">Verify</button>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    document.querySelectorAll('.view-receipt-btn').forEach((btn) => {
      btn.addEventListener('click', () => openReceiptModal(btn.dataset.id));
    });

    document.querySelectorAll('.verify-pay-btn').forEach((btn) => {
      btn.addEventListener('click', () => verifyPayment(btn.dataset.id));
    });
  }

  function updatePagination(total, page, totalPages) {
    if (!paginationInfo) return;
    paginationInfo.textContent = `Showing page ${page} of ${totalPages} (${total} total transactions)`;
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  // Open Receipt Modal
  async function openReceiptModal(transactionId) {
    try {
      const res = await api.get(`/api/transactions/${transactionId}`);
      if (!res.success) throw new Error(res.error);

      const { transaction: t, library } = res;

      document.getElementById('rec-library-name').textContent = library.name;
      document.getElementById('rec-library-contact').textContent = `${library.phone} | ${library.email}`;
      document.getElementById('rec-id').textContent = t.transactionId;
      document.getElementById('rec-date').textContent = formatDateTime(t.createdAt);
      document.getElementById('rec-customer').textContent = `${t.memberName} (${t.memberPhone})`;
      document.getElementById('rec-book').textContent = t.bookName;
      document.getElementById('rec-type').textContent = t.type;
      document.getElementById('rec-duration').textContent = t.type === 'RENT' ? `${t.rentalDuration} Days` : 'N/A';
      document.getElementById('rec-due').textContent = t.type === 'RENT' ? formatDate(t.rentalDueDate) : 'N/A';
      document.getElementById('rec-amount').textContent = formatCurrency(t.amount);
      document.getElementById('rec-payment-status').textContent = t.paymentStatus.replace('_', ' ');

      openModal('receipt-modal');
    } catch (err) {
      showToast(err.message, 'error', 'Error');
    }
  }

  // Verify Payment
  async function verifyPayment(id) {
    try {
      const res = await api.patch(`/api/transactions/${id}`, { paymentStatus: 'VERIFIED' });
      if (!res.success) throw new Error(res.error);
      showToast('Payment marked as VERIFIED!', 'success');
      loadTransactions();
    } catch (err) {
      showToast(err.message, 'error', 'Verification Failed');
    }
  }

  // Filters
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadTransactions();
      }, 300)
    );
  }

  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      currentType = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatus = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  if (paymentFilter) {
    paymentFilter.addEventListener('change', (e) => {
      currentPayment = e.target.value;
      currentPage = 1;
      loadTransactions();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadTransactions();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadTransactions();
    });
  }

  // Print button in receipt modal
  const printReceiptBtn = document.getElementById('print-receipt-btn');
  if (printReceiptBtn) {
    printReceiptBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Initial Load
  loadTransactions();
});
