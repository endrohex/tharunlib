/**
 * Admin Route Guards & Shared Navigation Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // Check if we are on an admin page
  const isAdminPage = !window.location.pathname.includes('login.html') &&
                      !window.location.pathname.includes('register.html') &&
                      !window.location.pathname.includes('success.html');

  if (isAdminPage && typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        // Redirect to login if not authenticated
        const currentUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login.html?redirect=${currentUrl}`;
      } else {
        // Update admin display in topbar
        const emailEl = document.getElementById('admin-email-display');
        const avatarEl = document.getElementById('admin-avatar-initial');
        if (emailEl) emailEl.textContent = user.email || 'Admin';
        if (avatarEl) avatarEl.textContent = (user.email || 'A').charAt(0).toUpperCase();

        // Store token for fast access
        try {
          const token = await user.getIdToken();
          localStorage.setItem('firebase_id_token', token);
        } catch (e) {
          console.warn('Failed to cache token:', e);
        }
      }
    });
  }

  // Setup Logout Button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
          await firebase.auth().signOut();
        }
        localStorage.removeItem('firebase_id_token');
        window.location.href = '/login.html';
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }

  // Mobile Drawer Toggle
  const mobileToggle = document.getElementById('mobile-nav-toggle');
  const sidebar = document.querySelector('.sidebar');
  let backdrop = document.querySelector('.sidebar-backdrop');

  if (!backdrop && sidebar) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active');
    });
  }

  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }
});
