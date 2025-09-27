// js/dashboard.js

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.motivari = [];
    this.currentFilter = 'toate';
    this.selectedFile = null;
    this.init();
  }

  async init() {
    // Verifică autentificarea
    await this.checkAuth();

    // Inițializează interfața
    this.setupNavigation();
    this.setupEventListeners();

    // Încarcă datele
    await this.loadUserData();
    await this.loadMotivari();

    // Actualizează interfața
    this.updateUserInterface();
    this.updateStats();
  }

  async checkAuth() {
    this.currentUser = await auth.checkCurrentUser();

    if (!this.currentUser || this.currentUser.role === 'diriginte') {
      window.location.href = 'index.html';
      return;
    }
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.switchPage(page);

        // Actualizează nav active
        navItems.forEach((nav) => nav.classList.remove('active'));
        item.classList.add('active');
      });
    });
  }

  switchPage(page) {
    // Ascunde toate paginile
    document.querySelectorAll('.page-content').forEach((pageEl) => {
      pageEl.classList.remove('active');
    });

    // Afișează pagina selectată
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Logica specifică pentru fiecare pagină
    switch (page) {
      case 'stats':
        this.updateStats();
        this.loadRecentActivity();
        break;
      case 'upload':
        this.resetUploadForm();
        this.checkUploadPermissions();
        break;
      case 'motivari':
        this.loadMotivari();
        break;
      case 'profil':
        this.updateProfile();
        break;
    }
  }

  setupEventListeners() {
    // Form submit pentru motivare
    const motivareForm = document.getElementById('motivare-form');
    if (motivareForm) {
      motivareForm.addEventListener('submit', (e) => this.handleMotivareSubmit(e));
    }

    // Filtre motivări
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        this.updateFilterButtons();
        this.filterMotivari();
      });
    });

    // Upload file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  updateUserInterface() {
    if (!this.currentUser) return;

    // Actualizează header
    document.getElementById(
      'user-name'
    ).textContent = `${this.currentUser.nume} ${this.currentUser.prenume}`;

    const roleText = this.currentUser.role === 'elev' ? 'Elev' : 'Părinte';
    document.getElementById(
      'user-role'
    ).textContent = `${roleText} • Clasa ${this.currentUser.clasa}`;

    // Avatar
    const avatar = this.currentUser.nume.charAt(0).toUpperCase();
    document.querySelectorAll('#user-avatar, .profile-avatar').forEach((el) => {
      el.textContent = avatar;
    });

    // Ascunde butonul învoire lungă pentru elevi
    if (this.currentUser.role === 'elev') {
      const invoireLungaCard = document.getElementById('invoire-lunga-card');
      if (invoireLungaCard) {
        invoireLungaCard.style.display = 'none';
      }
    }
  }

  async loadUserData() {
    try {
      const elevId =
        this.currentUser.role === 'elev' ? this.currentUser.id : this.currentUser.elevId;

      const response = await fetch('/.netlify/functions/get-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elevId: elevId,
          action: 'get-user-data',
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.currentUser.orePersonaleFolosite = result.data.ore_personale_folosite || 0;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare date utilizator:', error);
    }
  }

  async loadMotivari() {
    try {
      const elevId =
        this.currentUser.role === 'elev' ? this.currentUser.id : this.currentUser.elevId;

      const response = await fetch('/.netlify/functions/get-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elevId: elevId,
          action: 'get-motivari',
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.motivari = result.data;
        this.displayMotivari();
        this.updateStats();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare motivări:', error);
      this.showError('Eroare la încărcarea motivărilor');
    }
  }

  updateStats() {
    const oreRamase =
      Config.APP_CONFIG.oreLimitaPersonale - (this.currentUser.orePersonaleFolosite || 0);

    const totalMotivari = this.motivari.length;
    const inAsteptare = this.motivari.filter((m) => m.status === 'in_asteptare').length;
    const absenteMotivate = this.motivari.filter((m) => m.status === 'finalizata').length;

    // Actualizează UI
    document.getElementById('ore-ramase').textContent = oreRamase;
    document.getElementById('total-motivari').textContent = totalMotivari;
    document.getElementById('in-asteptare').textContent = inAsteptare;
    document.getElementById('absente-motivate').textContent = absenteMotivate;

    // Profil
    const profileOre = document.getElementById('profile-ore-folosite');
    if (profileOre) {
      profileOre.textContent = `${this.currentUser.orePersonaleFolosite || 0}/${
        Config.APP_CONFIG.oreLimitaPersonale
      }`;
    }
  }

  // Selectare tip motivare (Pagina 2)
  selectMotivareType(tip) {
    // Resetează selecția anterioară
    document.querySelectorAll('.type-card').forEach((card) => {
      card.classList.remove('selected');
    });

    // Selectează noul tip
    event.target.closest('.type-card').classList.add('selected');

    // Afișează formularul
    const form = document.getElementById('motivare-form');
    form.style.display = 'block';

    // Configurează formularul
    this.configureFormForType(tip);

    // Scroll la formular
    form.scrollIntoView({ behavior: 'smooth' });
  }

  configureFormForType(tip) {
    const tipInput = document.getElementById('tip-motivare');
    const perioadaSfarsitGroup = document.getElementById('perioada-sfarsit-group');
    const oreGroup = document.getElementById('ore-group');
    const subtipGroup = document.getElementById('subtip-group');

    tipInput.value = tip;

    // Resetează toate grupurile
    perioadaSfarsitGroup.style.display = 'block';
    oreGroup.style.display = 'none';
    subtipGroup.style.display = 'none';

    switch (tip) {
      case 'medicala':
        // Pentru medicală, perioada sfârșit e opțională
        break;

      case 'invoire_scurta':
        // Pentru învoire scurtă, doar ore, nu zile
        perioadaSfarsitGroup.style.display = 'none';
        oreGroup.style.display = 'block';
        subtipGroup.style.display = 'block';
        break;

      case 'invoire_lunga':
        // Pentru învoire lungă, perioada completă
        break;
    }
  }

  async handleMotivareSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const motivareData = Object.fromEntries(formData.entries());

    // Validări
    if (!this.validateMotivareForm(motivareData)) return;

    this.showLoading(true);

    try {
      // Upload imagine dacă există
      let urlImagine = null;
      if (this.selectedFile) {
        urlImagine = await this.uploadImage(this.selectedFile);
      }

      // Calculează ore scăzute
      const oreScazute = this.calculateOreScazute(motivareData);

      // Pregătește datele pentru inserare
      const insertData = {
        elev_id: this.currentUser.role === 'elev' ? this.currentUser.id : this.currentUser.elevId,
        tip_motivare: motivareData.subtip || motivareData.tip_motivare,
        perioada_inceput: motivareData.perioada_inceput,
        perioada_sfarsit: motivareData.perioada_sfarsit || null,
        ore_solicitare: motivareData.ore_solicitare ? parseInt(motivareData.ore_solicitare) : null,
        motiv: motivareData.motiv || null,
        url_imagine: urlImagine,
        trimis_de: this.currentUser.role,
        trimis_de_id: this.currentUser.id,
        ore_scazute: oreScazute,
      };

      // Trimite prin Netlify Function
      const response = await fetch('/.netlify/functions/submit-motivare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insertData),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(result.message);
        this.resetUploadForm();
        await this.loadMotivari();
        this.switchPage('motivari');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare salvare motivare:', error);
      this.showError('Eroare la trimiterea motivării');
    } finally {
      this.showLoading(false);
    }
  }

  validateMotivareForm(data) {
    if (!data.tip_motivare) {
      this.showError('Selectează tipul motivării');
      return false;
    }

    if (!data.perioada_inceput) {
      this.showError('Selectează data de început');
      return false;
    }

    if (data.tip_motivare.includes('invoire_scurta') && !data.ore_solicitare) {
      this.showError('Introdu numărul de ore pentru învoire scurtă');
      return false;
    }

    if (data.tip_motivare.includes('invoire_scurta') && !data.subtip) {
      this.showError('Selectează tipul invoirii scurte');
      return false;
    }

    return true;
  }

  calculateOreScazute(data) {
    const tip = data.subtip || data.tip_motivare;

    if (tip === 'medicala' || tip === 'invoire_scurta_medical') {
      return 0; // Nu se scad ore pentru motivări medicale
    }

    if (tip === 'invoire_scurta_personal') {
      return parseInt(data.ore_solicitare) || 0;
    }

    if (tip === 'invoire_lunga') {
      // Calculează numărul de zile școlare
      const startDate = new Date(data.perioada_inceput);
      const endDate = new Date(data.perioada_sfarsit || data.perioada_inceput);

      let zileScolare = 0;
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const ziua = d.getDay();
        if (ziua >= 1 && ziua <= 5) {
          // Luni-Vineri
          zileScolare++;
        }
      }

      return zileScolare * Config.APP_CONFIG.oreLucruZi;
    }

    return 0;
  }

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', Config.CLOUDINARY_CONFIG.uploadPreset);
    formData.append('folder', 'motivari-scolare');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Eroare upload imagine');
    }

    return data.secure_url;
  }

  // File handling
  handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validare tip și mărime
    if (
      !Config.APP_CONFIG.allowedFormats.some((format) =>
        file.type.includes(format.replace('jpg', 'jpeg'))
      )
    ) {
      this.showError('Format neacceptat. Folosește JPG, PNG sau HEIC');
      return;
    }

    if (file.size > Config.APP_CONFIG.maxFileSize) {
      this.showError('Fișierul este prea mare. Maximum 5MB');
      return;
    }

    this.selectedFile = file;
    this.showImagePreview(file);
  }

  showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('image-preview');
      const img = document.getElementById('preview-img');

      img.src = e.target.result;
      preview.style.display = 'block';

      // Ascunde upload area
      document.getElementById('upload-area').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  openCamera() {
    const fileInput = document.getElementById('file-input');
    fileInput.setAttribute('capture', 'environment');
    fileInput.click();
  }

  openGallery() {
    const fileInput = document.getElementById('file-input');
    fileInput.removeAttribute('capture');
    fileInput.click();
  }

  removeImage() {
    this.selectedFile = null;
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('file-input').value = '';
  }

  resetUploadForm() {
    const form = document.getElementById('motivare-form');
    if (form) {
      form.reset();
      form.style.display = 'none';
    }

    // Resetează selecția tipului
    document.querySelectorAll('.type-card').forEach((card) => {
      card.classList.remove('selected');
    });

    this.removeImage();
  }

  checkUploadPermissions() {
    // Ascunde învoire lungă pentru elevi
    if (this.currentUser.role === 'elev') {
      const invoireLungaCard = document.getElementById('invoire-lunga-card');
      if (invoireLungaCard) {
        invoireLungaCard.style.display = 'none';
      }
    }
  }

  // Motivari display și filtering
  displayMotivari() {
    const container = document.getElementById('motivari-list');
    const emptyState = document.getElementById('motivari-empty');

    if (this.motivari.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const motivariHTML = this.motivari
      .map((motivare) => this.createMotivareCard(motivare))
      .join('');
    container.innerHTML = motivariHTML;
  }

  createMotivareCard(motivare) {
    const statusColors = {
      in_asteptare: '#D97706',
      aprobata: '#059669',
      respinsa: '#EF4444',
      finalizata: '#2563EB',
    };

    const statusTexts = {
      in_asteptare: 'În așteptare',
      aprobata: 'Aprobată',
      respinsa: 'Respinsă',
      finalizata: 'Motivată',
    };

    const tipTexts = {
      medicala: '🏥 Medicală',
      invoire_scurta_personal: '⏱️ Învoire Personal',
      invoire_scurta_medical: '⏱️ Învoire Medical',
      invoire_lunga: '📅 Învoire Lungă',
    };

    return `
            <div class="motivare-card">
                <div class="card-header">
                    <div class="motivare-tip">${
                      tipTexts[motivare.tip_motivare] || motivare.tip_motivare
                    }</div>
                    <div class="status-badge" style="background: ${statusColors[motivare.status]};">
                        ${statusTexts[motivare.status]}
                    </div>
                </div>

                <div class="card-content">
                    <div class="perioada">
                        <strong>Perioada:</strong>
                        ${this.formatDate(motivare.perioada_inceput)}
                        ${
                          motivare.perioada_sfarsit
                            ? ` - ${this.formatDate(motivare.perioada_sfarsit)}`
                            : ''
                        }
                        ${motivare.ore_solicitare ? ` (${motivare.ore_solicitare} ore)` : ''}
                    </div>

                    ${
                      motivare.motiv
                        ? `<div class="motiv"><strong>Motiv:</strong> ${motivare.motiv}</div>`
                        : ''
                    }

                    ${
                      motivare.ore_scazute > 0
                        ? `<div class="ore-scazute">Ore scăzute: ${motivare.ore_scazute}</div>`
                        : ''
                    }
                </div>

                <div class="card-footer">
                    <small>Trimis la: ${this.formatDateTime(motivare.created_at)}</small>
                    ${
                      motivare.url_imagine
                        ? `<button class="view-image-btn" onclick="dashboard.viewImage('${motivare.url_imagine}')">
                            📷 Vezi document
                        </button>`
                        : ''
                    }
                    ${
                      motivare.status === 'in_asteptare'
                        ? `<button class="delete-btn" onclick="dashboard.deleteMotivare(${motivare.id})">
                            🗑️ Șterge
                        </button>`
                        : ''
                    }
                </div>
            </div>
        `;
  }

  updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
    });
  }

  filterMotivari() {
    let filteredMotivari = this.motivari;

    if (this.currentFilter !== 'toate') {
      filteredMotivari = this.motivari.filter((m) => m.status === this.currentFilter);
    }

    // Afișează motivările filtrate
    const container = document.getElementById('motivari-list');
    const emptyState = document.getElementById('motivari-empty');

    if (filteredMotivari.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    const motivariHTML = filteredMotivari.map((m) => this.createMotivareCard(m)).join('');
    container.innerHTML = motivariHTML;
  }

  async deleteMotivare(id) {
    if (!confirm('Sigur vrei să ștergi această motivare?')) return;

    try {
      const response = await fetch('/.netlify/functions/get-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete-motivare',
          motivareId: id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess('Motivarea a fost ștearsă');
        await this.loadMotivari();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare ștergere motivare:', error);
      this.showError('Eroare la ștergerea motivării');
    }
  }

  viewImage(url) {
    window.open(url, '_blank');
  }

  updateProfile() {
    document.getElementById(
      'profile-name'
    ).textContent = `${this.currentUser.nume} ${this.currentUser.prenume}`;

    const roleText = this.currentUser.role === 'elev' ? 'Elev' : 'Părinte';
    document.getElementById(
      'profile-details'
    ).textContent = `${roleText} • Clasa ${this.currentUser.clasa}`;
  }

  async loadRecentActivity() {
    const recentMotivari = this.motivari.slice(0, 5);
    const container = document.getElementById('recent-activity');

    if (recentMotivari.length === 0) {
      container.innerHTML = '<p class="no-activity">Nu ai activitate recentă</p>';
      return;
    }

    const activityHTML = recentMotivari
      .map(
        (m) => `
            <div class="activity-item">
                <div class="activity-info">
                    <span class="activity-type">${this.getTipText(m.tip_motivare)}</span>
                    <small class="activity-date">${this.formatDate(m.created_at)}</small>
                </div>
                <span class="activity-status status-${m.status}">${this.getStatusText(
          m.status
        )}</span>
            </div>
        `
      )
      .join('');

    container.innerHTML = activityHTML;
  }

  getTipText(tip) {
    const tipTexts = {
      medicala: 'Medicală',
      invoire_scurta_personal: 'Învoire Personal',
      invoire_scurta_medical: 'Învoire Medical',
      invoire_lunga: 'Învoire Lungă',
    };
    return tipTexts[tip] || tip;
  }

  getStatusText(status) {
    const statusTexts = {
      in_asteptare: 'În așteptare',
      aprobata: 'Aprobată',
      respinsa: 'Respinsă',
      finalizata: 'Motivată',
    };
    return statusTexts[status] || status;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ro-RO');
  }

  formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('ro-RO');
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showSuccess(message) {
    // Implementează notificare success
    alert(message); // Temporary - poate fi înlocuit cu toast
  }

  showError(message) {
    // Implementează notificare error
    alert(message); // Temporary - poate fi înlocuit cu toast
  }
}

// Funcții globale pentru onclick handlers
window.selectMotivareType = (tip) => dashboard.selectMotivareType(tip);
window.openCamera = () => dashboard.openCamera();
window.openGallery = () => dashboard.openGallery();
window.removeImage = () => dashboard.removeImage();

// Inițializare
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
});
