/**
 * Members Management & Profile Viewer
 */
document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentSearch = '';

  const searchInput = document.getElementById('member-search');
  const tbody = document.getElementById('members-tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');

  async function loadMembers() {
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
      const res = await api.get('/api/members', {
        search: currentSearch,
        page: currentPage,
        limit: 15,
      });

      if (!res.success) throw new Error(res.error);

      renderMembersTable(res.members);
      updatePagination(res.total, res.page, res.totalPages);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Failed to load members</div>
            <p class="empty-state-text">${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  function renderMembersTable(members) {
    if (!members || members.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">👥</div>
            <div class="empty-state-title">No members found</div>
            <p class="empty-state-text">Customers who register via QR code will automatically appear here.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = members
      .map(
        (m) => `
      <tr>
        <td><strong>${escapeHtml(m.memberId)}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(m.name)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(m.address || '')}</div>
        </td>
        <td>${escapeHtml(m.phone)}</td>
        <td>${escapeHtml(m.email || '—')}</td>
        <td>
          <span class="badge ${m.activeRentals > 0 ? 'badge-primary' : 'badge-neutral'}">
            ${m.activeRentals} active
          </span>
        </td>
        <td>${m.totalTransactions} transactions</td>
        <td>
          <button class="btn btn-sm btn-outline view-profile-btn" data-id="${m._id}">
            View Profile
          </button>
        </td>
      </tr>
    `
      )
      .join('');

    document.querySelectorAll('.view-profile-btn').forEach((btn) => {
      btn.addEventListener('click', () => openMemberProfile(btn.dataset.id));
    });
  }

  function updatePagination(total, page, totalPages) {
    if (!paginationInfo) return;
    paginationInfo.textContent = `Showing page ${page} of ${totalPages} (${total} total members)`;
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  // View Member Profile Modal
  async function openMemberProfile(memberId) {
    try {
      const res = await api.get(`/api/members/${memberId}`);
      if (!res.success) throw new Error(res.error);

      const { member, stats, transactions } = res;

      document.getElementById('prof-name').textContent = member.name;
      document.getElementById('prof-id').textContent = member.memberId;
      document.getElementById('prof-phone').textContent = member.phone;
      document.getElementById('prof-email').textContent = member.email || 'Not provided';
      document.getElementById('prof-address').textContent = member.address || 'Not provided';
      document.getElementById('prof-joined').textContent = formatDate(member.createdAt);

      // Stats
      document.getElementById('prof-stat-total-tx').textContent = stats.totalTransactions;
      document.getElementById('prof-stat-bought').textContent = stats.booksBought;
      document.getElementById('prof-stat-rented').textContent = stats.booksRented;
      document.getElementById('prof-stat-active').textContent = stats.activeRentals;
      document.getElementById('prof-stat-returned').textContent = stats.returnedBooks;
      document.getElementById('prof-stat-overdue').textContent = stats.overdueBooks;
      document.getElementById('prof-stat-spent').textContent = formatCurrency(stats.totalAmountSpent);

      // Render Transaction History Table
      const histTbody = document.getElementById('prof-tx-tbody');
      if (histTbody) {
        if (!transactions || transactions.length === 0) {
          histTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem;">No transactions yet.</td></tr>`;
        } else {
          histTbody.innerHTML = transactions
            .map(
              (t) => `
            <tr>
              <td><strong>${escapeHtml(t.transactionId)}</strong></td>
              <td>${escapeHtml(t.bookName)}</td>
              <td><span class="badge ${t.type === 'RENT' ? 'badge-primary' : 'badge-success'}">${t.type}</span></td>
              <td>${formatCurrency(t.amount)}</td>
              <td>${formatDate(t.createdAt)}</td>
            </tr>
          `
            )
            .join('');
        }
      }

      openModal('member-profile-modal');
    } catch (err) {
      showToast(err.message, 'error', 'Error loading profile');
    }
  }

  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadMembers();
      }, 300)
    );
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadMembers();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadMembers();
    });
  }

  // Initial Load
  loadMembers();
});
