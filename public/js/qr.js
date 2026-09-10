/**
 * QR Code Generator & Live Session Monitor Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  let activeSessionToken = null;
  let countdownInterval = null;
  let sessionPollTimer = null;
  let qrCodeInstance = null;

  const bookSelect = document.getElementById('qr-book-select');
  const typeRadios = document.querySelectorAll('input[name="qr-type"]');
  const durationGroup = document.getElementById('rental-duration-group');
  const durationSelect = document.getElementById('rental-duration-select');
  const customDurationInput = document.getElementById('custom-duration-input');
  const generateBtn = document.getElementById('generate-qr-btn');

  const qrDisplayCard = document.getElementById('qr-display-card');
  const qrCodeCanvas = document.getElementById('qrcode-container');
  const qrBookTitle = document.getElementById('qr-book-title');
  const qrTypeBadge = document.getElementById('qr-type-badge');
  const qrDurationBadge = document.getElementById('qr-duration-badge');
  const qrStatusBadge = document.getElementById('qr-status-badge');
  const qrCountdown = document.getElementById('qr-countdown');
  const qrCompletedBox = document.getElementById('qr-completed-box');

  const copyLinkBtn = document.getElementById('copy-qr-link-btn');
  const downloadQrBtn = document.getElementById('download-qr-btn');
  const printQrBtn = document.getElementById('print-qr-btn');
  const cancelQrBtn = document.getElementById('cancel-qr-btn');

  // Load books for dropdown
  async function loadBooksDropdown() {
    try {
      const res = await api.get('/api/books', { limit: 100 });
      if (!res.success) return;

      const urlParams = new URLSearchParams(window.location.search);
      const preselectedBookId = urlParams.get('bookId');

      bookSelect.innerHTML = '<option value="">-- Choose a Book --</option>' +
        res.books
          .map(
            (b) => `
          <option value="${b._id}" 
                  data-avail="${b.availableCopies}" 
                  data-rent="${b.rentalPrice}" 
                  data-buy="${b.purchasePrice}"
                  ${b._id === preselectedBookId ? 'selected' : ''}
                  ${b.availableCopies <= 0 ? 'disabled' : ''}>
            ${escapeHtml(b.title)} by ${escapeHtml(b.author)} (${b.availableCopies > 0 ? `${b.availableCopies} available` : 'Out of stock'})
          </option>
        `
          )
          .join('');

      if (preselectedBookId) {
        updateBookMeta();
      }
    } catch (err) {
      console.warn('Could not load books for dropdown:', err);
    }
  }

  // Handle Type switch (BUY vs RENT)
  typeRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const isRent = document.querySelector('input[name="qr-type"]:checked').value === 'RENT';
      if (durationGroup) {
        durationGroup.style.display = isRent ? 'flex' : 'none';
      }
      updateBookMeta();
    });
  });

  // Handle Custom Duration
  if (durationSelect && customDurationInput) {
    durationSelect.addEventListener('change', () => {
      if (durationSelect.value === 'custom') {
        customDurationInput.style.display = 'block';
      } else {
        customDurationInput.style.display = 'none';
      }
    });
  }

  // Book change listener
  if (bookSelect) {
    bookSelect.addEventListener('change', updateBookMeta);
  }

  function updateBookMeta() {
    const selected = bookSelect.options[bookSelect.selectedIndex];
    const infoBox = document.getElementById('selected-book-info');
    if (!selected || !selected.value) {
      if (infoBox) infoBox.style.display = 'none';
      return;
    }

    const avail = selected.dataset.avail;
    const rentPrice = selected.dataset.rent;
    const buyPrice = selected.dataset.buy;
    const isRent = document.querySelector('input[name="qr-type"]:checked')?.value === 'RENT';

    if (infoBox) {
      infoBox.style.display = 'block';
      infoBox.innerHTML = `
        <div style="font-size: 0.8125rem; color: var(--text-secondary);">
          Available Copies: <strong>${avail}</strong> | 
          ${isRent ? `Rental Price: <strong>${formatCurrency(rentPrice)}</strong>` : `Purchase Price: <strong>${formatCurrency(buyPrice)}</strong>`}
        </div>
      `;
    }
  }

  // Generate QR Button Click
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const bookId = bookSelect.value;
      if (!bookId) {
        showToast('Please select a book first.', 'warning');
        return;
      }

      const transactionType = document.querySelector('input[name="qr-type"]:checked').value;
      let duration = 7;
      if (transactionType === 'RENT') {
        if (durationSelect.value === 'custom') {
          duration = parseInt(customDurationInput.value, 10) || 7;
        } else {
          duration = parseInt(durationSelect.value, 10) || 7;
        }
      }

      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';

      try {
        const res = await api.post('/api/qr/create', {
          bookId,
          transactionType,
          rentalDuration: duration,
        });

        if (!res.success) throw new Error(res.error);

        renderActiveQR(res);
      } catch (err) {
        showToast(err.message, 'error', 'Generation Failed');
      } finally {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate QR Code';
      }
    });
  }

  // Render QR in UI
  function renderActiveQR(data) {
    activeSessionToken = data.sessionToken;

    // Reset previous timers
    if (countdownInterval) clearInterval(countdownInterval);
    if (sessionPollTimer) clearInterval(sessionPollTimer);

    // Show Card
    qrDisplayCard.style.display = 'block';
    qrCompletedBox.style.display = 'none';
    qrCodeCanvas.style.display = 'flex';

    qrBookTitle.textContent = data.session.bookName;
    qrTypeBadge.textContent = data.session.transactionType;
    qrTypeBadge.className = `badge ${data.session.transactionType === 'RENT' ? 'badge-primary' : 'badge-success'}`;

    if (data.session.transactionType === 'RENT') {
      qrDurationBadge.style.display = 'inline-flex';
      qrDurationBadge.textContent = `${data.session.rentalDuration} Days`;
    } else {
      qrDurationBadge.style.display = 'none';
    }

    qrStatusBadge.className = 'badge badge-warning';
    qrStatusBadge.textContent = 'Waiting for customer...';

    // Generate QR using QRCode library
    qrCodeCanvas.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      qrCodeInstance = new QRCode(qrCodeCanvas, {
        text: data.registrationUrl,
        width: 240,
        height: 240,
        colorDark: '#0f172a',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H,
      });
    }

    // Scroll smoothly to QR code
    qrDisplayCard.scrollIntoView({ behavior: 'smooth' });

    // Setup Expiration Countdown
    const expiresAt = new Date(data.expiresAt).getTime();
    startCountdown(expiresAt);

    // Start Live Polling for Customer Completion (every 2 seconds)
    startSessionPolling(data.sessionToken);

    // Copy Link Action
    copyLinkBtn.onclick = () => {
      navigator.clipboard.writeText(data.registrationUrl).then(() => {
        showToast('Registration link copied to clipboard!', 'success');
      });
    };

    // Download QR Action
    downloadQrBtn.onclick = () => {
      const img = qrCodeCanvas.querySelector('img');
      const canvas = qrCodeCanvas.querySelector('canvas');
      const src = img ? img.src : canvas ? canvas.toDataURL('image/png') : null;

      if (src) {
        const a = document.createElement('a');
        a.href = src;
        a.download = `QR-${data.session.bookName.replace(/\s+/g, '-')}.png`;
        a.click();
      } else {
        showToast('QR Image not ready yet.', 'warning');
      }
    };

    // Print QR Action
    printQrBtn.onclick = () => {
      window.print();
    };

    // Cancel Session Action
    cancelQrBtn.onclick = async () => {
      if (confirm('Are you sure you want to cancel this registration session?')) {
        try {
          await api.post(`/api/qr/${activeSessionToken}`);
          stopMonitoring();
          qrStatusBadge.className = 'badge badge-danger';
          qrStatusBadge.textContent = 'Cancelled';
          showToast('Session cancelled', 'info');
        } catch (e) {
          showToast(e.message, 'error');
        }
      }
    };
  }

  function startCountdown(expiresAt) {
    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);

    function updateTimer() {
      const now = Date.now();
      const diff = Math.max(0, expiresAt - now);

      if (diff <= 0) {
        clearInterval(countdownInterval);
        qrCountdown.textContent = 'EXPIRED';
        qrStatusBadge.className = 'badge badge-danger';
        qrStatusBadge.textContent = 'Expired';
        stopMonitoring();
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      qrCountdown.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  function startSessionPolling(token) {
    sessionPollTimer = setInterval(async () => {
      try {
        const res = await api.get(`/api/qr/${token}`);

        if (res.status === 'COMPLETED') {
          stopMonitoring();

          // Live Transition to Completed State
          qrStatusBadge.className = 'badge badge-success';
          qrStatusBadge.textContent = '✓ Completed!';

          qrCodeCanvas.style.display = 'none';
          qrCompletedBox.style.display = 'block';

          document.getElementById('completed-customer-name').textContent = res.customerName || 'Customer';
          document.getElementById('completed-tx-id').textContent = res.transactionId || '—';

          showToast(`Transaction ${res.transactionId} registered by ${res.customerName}!`, 'success', 'Completed!');
        } else if (res.code === 'EXPIRED' || res.code === 'CANCELLED') {
          stopMonitoring();
          qrStatusBadge.className = 'badge badge-danger';
          qrStatusBadge.textContent = res.code;
        }
      } catch (err) {
        // Ignored or handle cancellation
      }
    }, 2000);
  }

  function stopMonitoring() {
    if (sessionPollTimer) clearInterval(sessionPollTimer);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  // Clean up
  window.addEventListener('beforeunload', stopMonitoring);

  // Initialize
  loadBooksDropdown();
});
