/**
 * Book Management Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let currentSearch = '';
  let currentCategory = 'All';
  let currentStatus = 'All';
  let editingBookId = null;
  let coverBase64 = '';

  const searchInput = document.getElementById('book-search');
  const categoryFilter = document.getElementById('book-category-filter');
  const statusFilter = document.getElementById('book-status-filter');
  const tbody = document.getElementById('books-tbody');
  const paginationInfo = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');
  const pageIndicator = document.getElementById('page-indicator');

  const addBookBtn = document.getElementById('add-book-btn');
  const bookModal = document.getElementById('book-modal');
  const bookForm = document.getElementById('book-form');
  const modalTitle = document.getElementById('book-modal-title');
  const coverFileInput = document.getElementById('cover-file-input');
  const coverPreviewBox = document.getElementById('cover-preview-box');
  const coverPreviewImg = document.getElementById('cover-preview-img');
  const removeCoverBtn = document.getElementById('remove-cover-btn');

  // Load books
  async function loadBooks() {
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
      const res = await api.get('/api/books', {
        search: currentSearch,
        category: currentCategory,
        status: currentStatus,
        page: currentPage,
        limit: 15,
      });

      if (!res.success) throw new Error(res.error);

      renderBooksTable(res.books);
      updatePagination(res.total, res.page, res.totalPages);
    } catch (err) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-title">Failed to load books</div>
            <p class="empty-state-text">${escapeHtml(err.message)}</p>
          </td>
        </tr>
      `;
    }
  }

  function renderBooksTable(books) {
    if (!books || books.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">📚</div>
            <div class="empty-state-title">No books found</div>
            <p class="empty-state-text">Try adjusting your search or add a new book to the library.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = books
      .map((b) => {
        let statusBadge = '<span class="badge badge-success">Available</span>';
        if (b.status === 'out_of_stock' || b.availableCopies <= 0) {
          statusBadge = '<span class="badge badge-danger">Out of stock</span>';
        } else if (b.status === 'disabled') {
          statusBadge = '<span class="badge badge-neutral">Disabled</span>';
        }

        const fallbackCover = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=120';
        const coverSrc = b.coverImage || fallbackCover;

        return `
        <tr>
          <td>
            <div class="cell-book-title">
              <img src="${coverSrc}" class="table-book-cover" alt="cover" />
              <div class="book-meta">
                <span class="book-title-text">${escapeHtml(b.title)}</span>
                <span class="book-author-text">${escapeHtml(b.author)}</span>
              </div>
            </div>
          </td>
          <td><span class="badge badge-neutral">${escapeHtml(b.category || 'General')}</span></td>
          <td>
            <strong>${b.availableCopies}</strong> / ${b.totalCopies}
          </td>
          <td>${formatCurrency(b.rentalPrice)}</td>
          <td>${formatCurrency(b.purchasePrice)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="cell-actions">
              <a href="/qr.html?bookId=${b._id}" class="btn btn-sm btn-outline" title="Generate QR">
                QR
              </a>
              <button class="btn btn-sm btn-secondary edit-book-btn" data-id="${b._id}">
                Edit
              </button>
              <button class="btn btn-sm btn-danger delete-book-btn" data-id="${b._id}">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join('');

    // Attach row events
    document.querySelectorAll('.edit-book-btn').forEach((btn) => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    document.querySelectorAll('.delete-book-btn').forEach((btn) => {
      btn.addEventListener('click', () => confirmDeleteBook(btn.dataset.id));
    });
  }

  function updatePagination(total, page, totalPages) {
    if (!paginationInfo) return;
    paginationInfo.textContent = `Showing page ${page} of ${totalPages} (${total} total books)`;
    pageIndicator.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;
  }

  // Cover Image Preview Handler
  if (coverFileInput) {
    coverFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image file too large (max 5MB)', 'warning');
          return;
        }
        coverBase64 = await fileToBase64(file);
        coverPreviewImg.src = coverBase64;
        coverPreviewBox.style.display = 'block';
      }
    });
  }

  if (removeCoverBtn) {
    removeCoverBtn.addEventListener('click', () => {
      coverBase64 = '';
      coverFileInput.value = '';
      coverPreviewImg.src = '';
      coverPreviewBox.style.display = 'none';
    });
  }

  // Add Book Modal Open
  if (addBookBtn) {
    addBookBtn.addEventListener('click', () => {
      editingBookId = null;
      modalTitle.textContent = 'Add New Book';
      bookForm.reset();
      coverBase64 = '';
      coverPreviewBox.style.display = 'none';
      openModal('book-modal');
    });
  }

  // Edit Book Modal Open
  async function openEditModal(bookId) {
    editingBookId = bookId;
    modalTitle.textContent = 'Edit Book';
    try {
      const res = await api.get(`/api/books/${bookId}`);
      if (!res.success) throw new Error(res.error);

      const b = res.book;
      document.getElementById('book-title-input').value = b.title;
      document.getElementById('book-author-input').value = b.author;
      document.getElementById('book-isbn-input').value = b.isbn || '';
      document.getElementById('book-category-input').value = b.category || 'General';
      document.getElementById('book-description-input').value = b.description || '';
      document.getElementById('book-total-input').value = b.totalCopies;
      document.getElementById('book-avail-input').value = b.availableCopies;
      document.getElementById('book-rental-input').value = b.rentalPrice;
      document.getElementById('book-purchase-input').value = b.purchasePrice;

      if (b.coverImage) {
        coverBase64 = b.coverImage;
        coverPreviewImg.src = b.coverImage;
        coverPreviewBox.style.display = 'block';
      } else {
        coverBase64 = '';
        coverPreviewBox.style.display = 'none';
      }

      openModal('book-modal');
    } catch (err) {
      showToast(err.message, 'error', 'Error');
    }
  }

  // Save Book Form (Create / Update)
  if (bookForm) {
    bookForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-book-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        let finalCoverUrl = coverBase64;

        // If a new base64 image was uploaded, optionally upload to backend
        if (coverBase64 && coverBase64.startsWith('data:image/')) {
          try {
            const uploadRes = await api.post('/api/uploads/book-cover', { image: coverBase64 });
            if (uploadRes.success && uploadRes.url) {
              finalCoverUrl = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn('Upload fallback to data url:', uploadErr.message);
          }
        }

        const payload = {
          title: document.getElementById('book-title-input').value.trim(),
          author: document.getElementById('book-author-input').value.trim(),
          isbn: document.getElementById('book-isbn-input').value.trim(),
          category: document.getElementById('book-category-input').value.trim(),
          description: document.getElementById('book-description-input').value.trim(),
          totalCopies: parseInt(document.getElementById('book-total-input').value, 10),
          rentalPrice: parseFloat(document.getElementById('book-rental-input').value) || 0,
          purchasePrice: parseFloat(document.getElementById('book-purchase-input').value) || 0,
          coverImage: finalCoverUrl,
        };

        if (editingBookId) {
          payload.availableCopies = parseInt(document.getElementById('book-avail-input').value, 10);
          const res = await api.put(`/api/books/${editingBookId}`, payload);
          if (!res.success) throw new Error(res.error);
          showToast('Book updated successfully!', 'success');
        } else {
          const res = await api.post('/api/books', payload);
          if (!res.success) throw new Error(res.error);
          showToast('Book added successfully!', 'success');
        }

        closeModal('book-modal');
        loadBooks();
      } catch (err) {
        showToast(err.message, 'error', 'Failed to save');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Book';
      }
    });
  }

  // Delete Book
  async function confirmDeleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book? This cannot be undone.')) {
      return;
    }
    try {
      const res = await api.delete(`/api/books/${bookId}`);
      if (!res.success) throw new Error(res.error);
      showToast('Book deleted successfully', 'success');
      loadBooks();
    } catch (err) {
      showToast(err.message, 'error', 'Cannot Delete');
    }
  }

  // Search & Filters Listeners
  if (searchInput) {
    searchInput.addEventListener(
      'input',
      debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        loadBooks();
      }, 300)
    );
  }

  if (categoryFilter) {
    categoryFilter.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      currentPage = 1;
      loadBooks();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentStatus = e.target.value;
      currentPage = 1;
      loadBooks();
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        loadBooks();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      loadBooks();
    });
  }

  // Initial Load
  loadBooks();
});
