// js/auth.js

class AuthSystem {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    this.checkCurrentUser();
  }

  // Autentificare diriginte
  async loginDiriginte(email, password) {
    try {
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'diriginte',
          credentials: { email, password },
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Eroare de conectare' };
    }
  }

  // Autentificare elev/părinte
  async loginUtilizator(nume, cod, role) {
    try {
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: role,
          credentials: { nume, cod },
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.currentUser = result.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        return { success: true, user: this.currentUser };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'Eroare de conectare' };
    }
  }

  checkCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      return this.currentUser;
    }
    return null;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }

  isAuthenticated() {
    return this.currentUser !== null;
  }

  redirectAfterLogin() {
    if (!this.currentUser) return;

    if (this.currentUser.role === 'diriginte') {
      window.location.href = 'diriginte.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }
}

// Inițializare globală
window.auth = new AuthSystem();
