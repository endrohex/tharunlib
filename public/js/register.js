/**
 * Customer Mobile Registration Flow
 */
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('session');

  const loadingState = document.getElementById('reg-loading');
  const errorState = document.getElementById('reg-error');
  const errorMessage = document.getElementById('reg-error-message');
  const formContainer = document.getElementById('reg-form-container');
  const regForm = document.getElementById('registration-form');

  if (!sessionToken) {
    showError('No registration session token provided. Please scan a valid QR code.');
    return;
  }

  let sessionData = null;

  // Validate QR Session
  try {
    const res = await fetch(`/api/qr/${sessionToken}`);
    const data = await res.json();

    if (!data.success) {
      showError(data.error || 'This registration QR is invalid or has expired.');
      return;
    }

    if (data.status === 'COMPLETED') {
      showError('This registration has already been completed.');
      return;
    }

    sessionData = data.session;
    populateSessionDetails(sessionData);
  } catch (err) {
    showError('Unable to connect to the library system. Please try again.');
  }

  function showError(msg) {
    if (loadingState) loadingState.style.display = 'none';
    if (formContainer) formContainer.style.display = 'none';
    if (errorState) {
      errorState.style.display = 'block';
      if (errorMessage) errorMessage.textContent = msg;
    }
  }

  function populateSessionDetails(s) {
    if (loadingState) loadingState.style.display = 'none';
    if (formContainer) formContainer.style.display = 'block';

    // Library Info
    document.getElementById('library-name-display').textContent = s.library.name || 'Library';

    // Book Info
    document.getElementById('book-title-display').textContent = s.book.title;
    document.getElementById('book-author-display').textContent = s.book.author;
    const coverEl = document.getElementById('book-cover-img');
    if (coverEl) {
      coverEl.src = s.book.coverImage || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=160';
    }

    // Transaction & Pricing Badges
    const typeBadge = document.getElementById('trans-type-badge');
    typeBadge.textContent = s.transactionType;
    typeBadge.className = `badge ${s.transactionType === 'RENT' ? 'badge-primary' : 'badge-success'}`;

    const durationDisplay = document.getElementById('rental-duration-display');
    if (s.transactionType === 'RENT') {
      durationDisplay.style.display = 'block';
      durationDisplay.textContent = `Duration: ${s.rentalDuration} Days`;
    } else {
      durationDisplay.style.display = 'none';
    }

    document.getElementById('trans-amount-display').textContent = formatCurrency(s.amount);

    // Optional UPI Payment Section
    const paymentSection = document.getElementById('upi-payment-section');
    if (s.library.upiEnabled && s.amount > 0 && s.library.upiId) {
      paymentSection.style.display = 'block';
      document.getElementById('upi-amount-val').textContent = formatCurrency(s.amount);

      // Construct UPI Deep Link
      const pa = encodeURIComponent(s.library.upiId);
      const pn = encodeURIComponent(s.library.upiName || s.library.name || 'Library');
      const am = encodeURIComponent(s.amount);
      const cu = 'INR';
      const upiUrl = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${cu}&tn=Book-${encodeURIComponent(s.book.title.slice(0, 15))}`;

      const upiPayBtn = document.getElementById('upi-pay-deep-link');
      if (upiPayBtn) {
        upiPayBtn.href = upiUrl;
      }

      // Handle UPI QR view toggle
      const toggleQrBtn = document.getElementById('toggle-upi-qr-btn');
      const upiQrBox = document.getElementById('upi-qr-display-box');
      const upiQrImg = document.getElementById('upi-qr-img');

      if (toggleQrBtn && upiQrBox) {
        toggleQrBtn.addEventListener('click', () => {
          if (upiQrBox.style.display === 'none') {
            upiQrBox.style.display = 'block';
            toggleQrBtn.textContent = 'Hide UPI QR';
            if (s.library.upiQrImage) {
              upiQrImg.src = s.library.upiQrImage;
            } else if (typeof QRCode !== 'undefined') {
              // Generate dynamic QR from UPI URL
              upiQrBox.innerHTML = '';
              new QRCode(upiQrBox, {
                text: upiUrl,
                width: 180,
                height: 180,
              });
            }
          } else {
            upiQrBox.style.display = 'none';
            toggleQrBtn.textContent = 'Show UPI QR';
          }
        });
      }
    } else {
      if (paymentSection) paymentSection.style.display = 'none';
    }
  }

  // Handle Customer Form Submit
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById('submit-reg-btn');
      const name = document.getElementById('customer-name').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const address = document.getElementById('customer-address').value.trim();
      const ref = document.getElementById('customer-utr') ? document.getElementById('customer-utr').value.trim() : '';

      if (!name || !phone) {
        showToast('Please provide your name and phone number.', 'warning');
        return;
      }

      const confirmCheck = document.getElementById('confirm-checkbox');
      if (confirmCheck && !confirmCheck.checked) {
        showToast('Please confirm that the information provided is correct.', 'warning');
        return;
      }

      // Prevent duplicate double-clicks
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing Registration...';

      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionToken,
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            customerAddress: address,
            paymentReference: ref,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to submit registration');
        }

        // Redirect to success confirmation receipt
        window.location.href = `/success.html?txId=${result.transactionId}`;
      } catch (err) {
        showToast(err.message, 'error', 'Registration Error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Registration';
      }
    });
  }
});
