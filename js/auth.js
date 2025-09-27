// js/auth.js

class AuthSystem {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.init();
  }

  async init() {
    try {
      const { createClient } = supabase;
      this.supabase = createClient(Config.SUPABASE_CONFIG.url, Config.SUPABASE_CONFIG.anonKey);

      await this.checkCurrentUser();
    } catch (error) {
      console.error('Eroare inițializare Supabase:', error);
    }
  }

  // Autentificare diriginte (email + parolă)
  async loginDiriginte(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      const diriginte = await this.getDiriginteByEmail(email);
      if (!diriginte) {
        throw new Error('Nu sunteți înregistrat ca diriginte');
      }

      this.currentUser = {
        id: data.user.id,
        email: data.user.email,
        role: 'diriginte',
        nume: diriginte.nume,
        prenume: diriginte.prenume,
        clasa: diriginte.clasa,
      };

      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Autentificare elev/părinte (nume + cod personal - SIMPLIFICAT)
  async loginUtilizator(nume, codPersonal, role) {
    try {
      let userData;

      if (role === 'elev') {
        userData = await this.getElevByCredentials(nume, codPersonal);
      } else {
        userData = await this.getParinteByCredentials(nume, codPersonal);
      }

      if (!userData) {
        throw new Error('Nume sau cod incorect');
      }

      this.currentUser = {
        id: userData.id,
        role: role,
        nume: userData.nume,
        prenume: userData.prenume,
        clasa: role === 'elev' ? userData.clasa : userData.elev.clasa,
        elevId: role === 'parinte' ? userData.elev_id : userData.id,
      };

      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      return { success: true, user: this.currentUser };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      return this.currentUser;
    }
    return null;
  }

  async logout() {
    if (this.currentUser?.role === 'diriginte') {
      await this.supabase.auth.signOut();
    }

    this.currentUser = null;
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }

  // Helper methods - ACTUALIZATE pentru nume + cod simplu
  async getDiriginteByEmail(email) {
    const { data, error } = await this.supabase
      .from('diriginti')
      .select('*')
      .eq('email', email)
      .single();

    return error ? null : data;
  }

  async getElevByCredentials(nume, codPersonal) {
    const { data, error } = await this.supabase
      .from('elevi')
      .select('*')
      .eq('nume', nume)
      .eq('cod_personal', codPersonal)
      .single();

    return error ? null : data;
  }

  async getParinteByCredentials(nume, codPersonal) {
    const { data, error } = await this.supabase
      .from('parinti')
      .select(
        `
                *,
                elev:elevi(id, nume, prenume, clasa)
            `
      )
      .eq('nume', nume)
      .eq('cod_personal', codPersonal)
      .single();

    return error ? null : data;
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

window.auth = new AuthSystem();
