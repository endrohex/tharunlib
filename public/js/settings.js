/**
 * Library & Payment Settings Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('settings-form');
  const upiToggle = document.getElementById('upi-enabled-toggle');
  const upiFieldsContainer = document.getElementById('upi-fields-container');
  const upiQrInput = document.getElementById('upi-qr-input');
  const upiQrPreviewBox = document.getElementById('upi-qr-preview-box');
  const upiQrPreviewImg = document.getElementById('upi-qr-preview-img');
  const removeUpiQrBtn = document.getElementById('remove-upi-qr-btn');

  let upiQrBase64 = '';

  // Load current settings
  async function loadSettings() {
    try {
      const res = await api.get('/api/settings');
      if (!res.success) return;

      const s = res.settings;
      document.getElementById('library-name').value = s.libraryName || '';
      document.getElementById('library-address').value = s.libraryAddress || '';
      document.getElementById('library-phone').value = s.libraryPhone || '';
      document.getElementById('library-email').value = s.libraryEmail || '';

      document.getElementById('default-duration').value = s.defaultRentalDuration || 7;
      document.getElementById('max-duration').value = s.maximumRentalDuration || 30;
      document.getElementById('grace-period').value = s.gracePeriod || 2;
      document.getElementById('qr-expiry').value = s.qrExpirationMinutes || 15;

      upiToggle.checked = Boolean(s.upiEnabled);
      upiFieldsContainer.style.display = s.upiEnabled ? 'block' : 'none';

      document.getElementById('upi-id').value = s.upiId || '';
      document.getElementById('upi-name').value = s.upiName || '';

      if (s.upiQrImage) {
        upiQrBase64 = s.upiQrImage;
        upiQrPreviewImg.src = s.upiQrImage;
        upiQrPreviewBox.style.display = 'block';
      }
    } catch (err) {
      showToast('Failed to load settings', 'error');
    }
  }

  // Toggle UPI fields visibility
  if (upiToggle) {
    upiToggle.addEventListener('change', () => {
      upiFieldsContainer.style.display = upiToggle.checked ? 'block' : 'none';
    });
  }

  // UPI QR file selection
  if (upiQrInput) {
    upiQrInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image file too large (max 5MB)', 'warning');
          return;
        }
        upiQrBase64 = await fileToBase64(file);
        upiQrPreviewImg.src = upiQrBase64;
        upiQrPreviewBox.style.display = 'block';
      }
    });
  }

  if (removeUpiQrBtn) {
    removeUpiQrBtn.addEventListener('click', () => {
      upiQrBase64 = '';
      upiQrInput.value = '';
      upiQrPreviewImg.src = '';
      upiQrPreviewBox.style.display = 'none';
    });
  }

  // Save Settings
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('save-settings-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Settings...';

      try {
        let finalUpiQr = upiQrBase64;

        // If new base64 image uploaded, save via upload endpoint
        if (upiQrBase64 && upiQrBase64.startsWith('data:image/')) {
          try {
            const uploadRes = await api.post('/api/uploads/upi-qr', { image: upiQrBase64 });
            if (uploadRes.success && uploadRes.url) {
              finalUpiQr = uploadRes.url;
            }
          } catch (uploadErr) {
            console.warn('Fallback to data url:', uploadErr.message);
          }
        }

        const payload = {
          libraryName: document.getElementById('library-name').value.trim(),
          libraryAddress: document.getElementById('library-address').value.trim(),
          libraryPhone: document.getElementById('library-phone').value.trim(),
          libraryEmail: document.getElementById('library-email').value.trim(),
          defaultRentalDuration: parseInt(document.getElementById('default-duration').value, 10),
          maximumRentalDuration: parseInt(document.getElementById('max-duration').value, 10),
          gracePeriod: parseInt(document.getElementById('grace-period').value, 10),
          qrExpirationMinutes: parseInt(document.getElementById('qr-expiry').value, 10),
          upiEnabled: upiToggle.checked,
          upiId: document.getElementById('upi-id').value.trim(),
          upiName: document.getElementById('upi-name').value.trim(),
          upiQrImage: finalUpiQr,
        };

        const res = await api.put('/api/settings', payload);
        if (!res.success) throw new Error(res.error);

        showToast('Settings saved successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'error', 'Save Failed');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save All Settings';
      }
    });
  }

  loadSettings();
});
