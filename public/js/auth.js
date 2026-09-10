/**
 * Authentication Logic for login.html
 */
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const submitBtn = document.getElementById('submit-btn');
  const errorBox = document.getElementById('auth-error');

  // Check if already authenticated
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || '/dashboard.html';
        window.location.href = redirect;
      }
    });
  }

  // Password Visibility Toggle
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.textContent = type === 'password' ? '👁️' : '🔒';
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!errorBox || !submitBtn) return;

      errorBox.classList.remove('active');
      errorBox.textContent = '';

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
        showError('Please enter both email and password.');
        return;
      }

      // Show Loading State
      submitBtn.disabled = true;
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Signing in...';

      try {
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const token = await userCredential.user.getIdToken();
        localStorage.setItem('firebase_id_token', token);

        // Notify backend / verify setup
        try {
          await api.post('/api/auth/setup-admin', { name: email.split('@')[0] });
        } catch (setupErr) {
          console.log('Admin setup call note:', setupErr.message);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get('redirect') || '/dashboard.html';
        window.location.href = redirect;
      } catch (error) {
        console.error('Firebase Auth Error:', error);
        let msg = 'Failed to sign in. Please check your credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          msg = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Too many failed login attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = 'Network connection issue. Please check your internet.';
        }
        showError(msg);
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    });
  }

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.classList.add('active');
    }
  }
});
