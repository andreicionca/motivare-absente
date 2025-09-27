// js/dashboard.js

class Dashboard {
  constructor() {
    this.currentUser = null;
    this.motivari = [];
    this.cereri = [];
    this.currentFilter = 'toate';
    this.currentRotation = 0;
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
      case 'cereri':
        this.resetCerereForm();
        break;
      case 'motivari':
        this.loadMotivari();
        break;
    }
  }

  setupEventListeners() {
    // Form submit pentru motivare
    const motivareForm = document.getElementById('motivare-form');
    if (motivareForm) {
      motivareForm.addEventListener('submit', (e) => this.handleMotivareSubmit(e));
    }

    // Form submit pentru cerere
    const cerereForm = document.getElementById('cerere-form');
    if (cerereForm) {
      cerereForm.addEventListener('submit', (e) => this.handleCerereSubmit(e));
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

    // Time inputs pentru cereri
    const oraInceput = document.getElementById('ora-inceput');
    const oraSfarsit = document.getElementById('ora-sfarsit');
    if (oraInceput && oraSfarsit) {
      oraInceput.addEventListener('change', () => this.calculateOreSolicitate());
      oraSfarsit.addEventListener('change', () => this.calculateOreSolicitate());
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
    document.querySelectorAll('#user-avatar').forEach((el) => {
      el.textContent = avatar;
    });

    // Ascunde butonul Învoire de la părinte pentru elevi
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
          action: 'get-all-data',
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.motivari = result.data.motivari || [];
        this.cereri = result.data.cereri || [];
        this.displayMotivari();
        this.updateStats();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare motivări:', error);
      this.showToast('Eroare la încărcarea motivărilor', 'error');
    }
  }

  updateStats() {
    const orePersonaleFolosite = this.cereri
      .filter((c) => c.tip_cerere === 'personal' && c.status === 'finalizata')
      .reduce((total, c) => total + (c.ore_scazute || 0), 0);

    const oreRamase = Config.APP_CONFIG.oreLimitaPersonale - orePersonaleFolosite;

    const totalMotivari = this.motivari.length + this.cereri.length;
    const inAsteptare =
      this.motivari.filter((m) => m.status === 'in_asteptare').length +
      this.cereri.filter((c) => c.status === 'cerere_trimisa' || c.status === 'aprobata_parinte')
        .length;
    // Calculează orele de absență motivată
    const absenteMotivate =
      this.motivari
        .filter((m) => m.status === 'finalizata')
        .reduce((total, m) => {
          // Pentru motivări, calculează zilele și înmulțește cu 6 ore/zi
          const startDate = new Date(m.perioada_inceput);
          const endDate = new Date(m.perioada_sfarsit || m.perioada_inceput);
          let zileScolare = 0;
          for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const ziua = d.getDay();
            if (ziua >= 1 && ziua <= 5) zileScolare++;
          }
          return total + zileScolare * 6;
        }, 0) +
      this.cereri
        .filter((c) => c.status === 'finalizata')
        .reduce((total, c) => total + (c.ore_solicitate || 0), 0);

    // Actualizează UI
    document.getElementById('ore-ramase').textContent = oreRamase;
    document.getElementById('total-motivari').textContent = totalMotivari;
    document.getElementById('in-asteptare').textContent = inAsteptare;
    document.getElementById('absente-motivate').textContent = absenteMotivate;
  }

  // Selectare tip motivare (Pagina Upload)
  selectMotivareType(tip) {
    // Resetează selecția anterioară
    document.querySelectorAll('.motivare-types .type-card').forEach((card) => {
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

    tipInput.value = tip;

    switch (tip) {
      case 'medicala_clasica':
        // Pentru medicală, perioada sfârșit e opțională
        perioadaSfarsitGroup.style.display = 'block';
        break;

      case 'invoire_lunga':
        // Pentru Învoire de la părinte, perioada completă obligatorie
        perioadaSfarsitGroup.style.display = 'block';
        const perioadaSfarsit = document.getElementById('perioada-sfarsit');
        perioadaSfarsit.required = true;
        break;

      case 'alte_motive':
        // Pentru alte motive, perioada sfârșit opțională
        perioadaSfarsitGroup.style.display = 'block';
        break;
    }
  }

  // Selectare tip cerere (Pagina Cereri)
  selectCerereType(tip) {
    // Resetează selecția anterioară
    document.querySelectorAll('.cereri-types .type-card').forEach((card) => {
      card.classList.remove('selected');
    });

    // Selectează noul tip
    event.target.closest('.type-card').classList.add('selected');

    // Afișează formularul
    const form = document.getElementById('cerere-form');
    form.style.display = 'block';

    // Configurează formularul pentru cerere
    const tipInput = document.getElementById('tip-cerere');
    tipInput.value = tip;

    // Calculează orele personale folosite dinamic din cereri
    const orePersonaleFolosite = this.cereri
      .filter((c) => c.tip_cerere === 'personal' && c.status === 'finalizata')
      .reduce((total, c) => total + (c.ore_scazute || 0), 0);

    const oreRamase = Config.APP_CONFIG.oreLimitaPersonale - orePersonaleFolosite;

    // Actualizează textul informativ în funcție de rol și ore disponibile
    const infoText = document.getElementById('cerere-info-text');

    if (tip === 'personal') {
      const baseText =
        this.currentUser.role === 'parinte'
          ? 'Cererea va fi trimisă direct dirigintelui.'
          : 'Cererea va fi trimisă părintelui pentru aprobare.';

      infoText.textContent = `${baseText} Orele se vor scădea din totalul orelor permise de regulament pentru învoirea la cerere a elevului într-un an școlar. În acest moment mai aveți ${oreRamase} ore de învoire disponibile.`;

      // Adaugă styling pentru avertisment dacă sunt puține ore
      if (oreRamase <= 5) {
        infoText.style.color = '#ef4444'; // roșu pentru avertisment
      } else {
        infoText.style.color = '#1e40af'; // albastru normal
      }
    } else {
      const baseText =
        this.currentUser.role === 'parinte'
          ? 'Cererea va fi trimisă direct dirigintelui.'
          : 'Cererea va fi trimisă părintelui pentru aprobare.';

      infoText.textContent = `${baseText} Orele NU se vor scădea cele 42 ore de învoire/an.`;
      infoText.style.color = '#1e40af';
    }

    // Scroll la formular
    form.scrollIntoView({ behavior: 'smooth' });
  }

  calculateOreSolicitate() {
    const oraInceput = document.getElementById('ora-inceput').value;
    const oraSfarsit = document.getElementById('ora-sfarsit').value;

    if (oraInceput && oraSfarsit) {
      const start = new Date(`2000-01-01T${oraInceput}`);
      const end = new Date(`2000-01-01T${oraSfarsit}`);

      if (end > start) {
        const diffMs = end - start;
        const oreSolicitate = Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours

        // Afișează orele calculate (opțional)
        console.log(`Ore solicitate: ${oreSolicitate}`);
      }
    }
  }

  async handleMotivareSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const motivareData = Object.fromEntries(formData.entries());

    // Validări
    if (!this.validateMotivareForm(motivareData)) return;

    this.showToast('Se încarcă...', 'info');

    try {
      // Upload imagine obligatoriu
      let urlImagine = null;
      if (this.selectedFile) {
        urlImagine = await this.uploadImage(this.selectedFile);
      } else {
        this.showToast('Documentul este obligatoriu', 'error');
        return;
      }

      // Calculează ore scăzute
      const oreScazute = this.calculateOreScazuteMotivare(motivareData);

      // Pregătește datele pentru inserare
      const insertData = {
        elev_id: this.currentUser.role === 'elev' ? this.currentUser.id : this.currentUser.elevId,
        tip_motivare: motivareData.tip_motivare,
        perioada_inceput: motivareData.perioada_inceput,
        perioada_sfarsit: motivareData.perioada_sfarsit || null,
        motiv: motivareData.motiv || null,
        url_imagine: urlImagine,
        trimis_de: this.currentUser.role,
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
        this.showToast('Motivarea a fost trimisă cu succes!', 'success');
        this.resetUploadForm();
        await this.loadMotivari();
        this.switchPage('motivari');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare salvare motivare:', error);
      this.showToast('Eroare la trimiterea motivării', 'error');
    }
  }

  async handleCerereSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const cerereData = Object.fromEntries(formData.entries());

    // Validări
    if (!this.validateCerereForm(cerereData)) return;

    this.showToast('Se trimite cererea...', 'info');

    try {
      // Calculează ore solicitate
      const oreSolicitate = this.calculateOreSolicitateCerere(cerereData);

      // Pregătește datele pentru inserare
      const insertData = {
        elev_id: this.currentUser.role === 'elev' ? this.currentUser.id : this.currentUser.elevId,
        tip_cerere: cerereData.tip_cerere,
        data_solicitata: cerereData.data_solicitata,
        ora_inceput: cerereData.ora_inceput,
        ora_sfarsit: cerereData.ora_sfarsit,
        ore_solicitate: oreSolicitate,
        motiv: cerereData.motiv,
        trimis_de: this.currentUser.role,
        aproba_parinte_digital: this.currentUser.role === 'parinte',
      };

      // Trimite prin Netlify Function
      const response = await fetch('/.netlify/functions/submit-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insertData),
      });

      const result = await response.json();

      if (result.success) {
        this.showToast('Cererea a fost trimisă cu succes!', 'success');
        this.resetCerereForm();
        await this.loadMotivari();
        this.switchPage('motivari');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare salvare cerere:', error);
      this.showToast('Eroare la trimiterea cererii', 'error');
    }
  }

  validateMotivareForm(data) {
    if (!data.tip_motivare) {
      this.showToast('Selectează tipul motivării', 'error');
      return false;
    }

    if (!data.perioada_inceput) {
      this.showToast('Selectează data de început', 'error');
      return false;
    }

    if (!this.selectedFile) {
      this.showToast('Atașează documentul', 'error');
      return false;
    }

    return true;
  }

  validateCerereForm(data) {
    if (!data.tip_cerere) {
      this.showToast('Selectează tipul cererii', 'error');
      return false;
    }

    if (!data.data_solicitata) {
      this.showToast('Selectează data solicitată', 'error');
      return false;
    }

    if (!data.ora_inceput || !data.ora_sfarsit) {
      this.showToast('Completează orele', 'error');
      return false;
    }

    if (data.ora_sfarsit <= data.ora_inceput) {
      this.showToast('Ora sfârșit trebuie să fie după ora început', 'error');
      return false;
    }

    if (!data.motiv) {
      this.showToast('Completează motivul', 'error');
      return false;
    }

    return true;
  }

  calculateOreScazuteMotivare(data) {
    const tip = data.tip_motivare;

    if (tip === 'medicala_clasica' || tip === 'alte_motive') {
      return 0; // Nu se scad ore pentru motivări medicale sau alte motive
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

  calculateOreSolicitateCerere(data) {
    const start = new Date(`2000-01-01T${data.ora_inceput}`);
    const end = new Date(`2000-01-01T${data.ora_sfarsit}`);

    const diffMs = end - start;
    return Math.ceil(diffMs / (1000 * 60 * 60)); // Convert to hours, rounded up
  }

  async uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', Config.CLOUDINARY_CONFIG.uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${Config.CLOUDINARY_CONFIG.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Cloudinary error:', data);
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
      this.showToast('Format neacceptat. Folosește JPG, PNG sau HEIC', 'error');
      return;
    }

    if (file.size > Config.APP_CONFIG.maxFileSize) {
      this.showToast('Fișierul este prea mare. Maximum 5MB', 'error');
      return;
    }

    this.selectedFile = file;
    this.showImagePreview(file);
  }

  showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const container = document.getElementById('image-preview-container');
      const img = document.getElementById('preview-img');

      img.src = e.target.result;
      container.style.display = 'block';

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

  rotateImage(degrees) {
    this.currentRotation += degrees;
    const img = document.getElementById('preview-img');
    if (img) {
      img.style.transform = `rotate(${this.currentRotation}deg)`;
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.currentRotation = 0; // Resetează rotația
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('file-input').value = '';

    // Resetează transformarea imaginii
    const img = document.getElementById('preview-img');
    if (img) {
      img.style.transform = '';
    }
  }

  resetUploadForm() {
    const form = document.getElementById('motivare-form');
    if (form) {
      form.reset();
      form.style.display = 'none';
    }

    // Resetează selecția tipului
    document.querySelectorAll('.motivare-types .type-card').forEach((card) => {
      card.classList.remove('selected');
    });

    this.removeImage();
  }

  resetCerereForm() {
    const form = document.getElementById('cerere-form');
    if (form) {
      form.reset();
      form.style.display = 'none';
    }

    // Resetează selecția tipului
    document.querySelectorAll('.cereri-types .type-card').forEach((card) => {
      card.classList.remove('selected');
    });
  }

  checkUploadPermissions() {
    // Ascunde Învoire de la părinte pentru elevi
    if (this.currentUser.role === 'elev') {
      const invoireLungaCard = document.getElementById('invoire-lunga-card');
      if (invoireLungaCard) {
        invoireLungaCard.style.display = 'none';
      }
    }
  }

  // Display motivări și cereri
  displayMotivari() {
    this.filterMotivari();
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
      medicala_clasica: '🏥 Medicală',
      invoire_lunga: '📅 Învoire de la părinte',
      alte_motive: '📋 Alte motive',
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
            ${motivare.perioada_sfarsit ? ` - ${this.formatDate(motivare.perioada_sfarsit)}` : ''}
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

          ${
            motivare.url_imagine
              ? `
            <div class="card-image-container">
              <img src="${motivare.url_imagine}" alt="Document motivare" loading="lazy" />
            </div>
          `
              : ''
          }
        </div>

        <div class="card-footer">
          <small>Trimis la: ${this.formatDateTime(motivare.created_at)}</small>
          ${
            motivare.status === 'in_asteptare'
              ? `
            <button class="delete-btn" onclick="dashboard.deleteMotivare(${motivare.id})">
              🗑️ Șterge
            </button>
          `
              : ''
          }
        </div>
      </div>
    `;
  }

  createCerereCard(cerere) {
    const statusColors = {
      cerere_trimisa: '#D97706',
      aprobata_parinte: '#0891b2',
      acceptata_diriginte: '#059669',
      respinsa: '#EF4444',
      finalizata: '#2563EB',
    };

    const statusTexts = {
      cerere_trimisa: 'Trimisă',
      aprobata_parinte: 'Aprobată de părinte',
      acceptata_diriginte: 'Acceptată',
      respinsa: 'Respinsă',
      finalizata: 'Finalizată',
    };

    const tipTexts = {
      personal: '👤 Învoire personală',
      invoire_justificata: '📋 Învoire justificată',
    };

    return `
      <div class="motivare-card">
        <div class="card-header">
          <div class="motivare-tip">${tipTexts[cerere.tip_cerere] || cerere.tip_cerere}</div>
          <div class="status-badge" style="background: ${statusColors[cerere.status]};">
            ${statusTexts[cerere.status]}
          </div>
        </div>

        <div class="card-content">
          <div class="perioada">
            <strong>Data:</strong> ${this.formatDate(cerere.data_solicitata)}
            <br><strong>Ore:</strong> ${cerere.ora_inceput} - ${cerere.ora_sfarsit} (${
      cerere.ore_solicitate
    }h)
          </div>

          <div class="motiv"><strong>Motiv:</strong> ${cerere.motiv}</div>

          ${
            cerere.ore_scazute > 0
              ? `<div class="ore-scazute">Ore scăzute: ${cerere.ore_scazute}</div>`
              : ''
          }
        </div>

        <div class="card-footer">
          <small>Trimis la: ${this.formatDateTime(cerere.created_at)}</small>
          ${
            cerere.status === 'cerere_trimisa'
              ? `
            <button class="delete-btn" onclick="dashboard.deleteCerere(${cerere.id})">
              🗑️ Șterge
            </button>
          `
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
    const container = document.getElementById('motivari-list');
    const emptyState = document.getElementById('motivari-empty');

    if (!container) return;

    // Combină motivări și cereri
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    // Filtrează pe baza selecției
    let filteredItems = allItems;

    if (this.currentFilter !== 'toate') {
      filteredItems = allItems.filter((item) => {
        // Pentru cereri, mapează statusurile specifice
        if (item.type === 'cerere') {
          switch (this.currentFilter) {
            case 'in_asteptare':
              return item.status === 'cerere_trimisa' || item.status === 'aprobata_parinte';
            case 'aprobata':
              return item.status === 'acceptata_diriginte';
            case 'finalizata':
            case 'respinsa':
              return item.status === this.currentFilter;
            default:
              return true;
          }
        }
        // Pentru motivări
        return item.status === this.currentFilter;
      });
    }

    // Sortează după data creării
    filteredItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filteredItems.length === 0) {
      container.innerHTML = '';
      if (emptyState) {
        emptyState.style.display = 'block';
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    const itemsHTML = filteredItems
      .map((item) =>
        item.type === 'motivare' ? this.createMotivareCard(item) : this.createCerereCard(item)
      )
      .join('');
    container.innerHTML = itemsHTML;
  }

  async deleteMotivare(id) {
    try {
      const response = await fetch('/.netlify/functions/delete-motivare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivareId: id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showToast('Motivarea a fost ștearsă', 'success');
        await this.loadMotivari();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare ștergere motivare:', error);
      this.showToast('Eroare la ștergerea motivării', 'error');
    }
  }

  async deleteCerere(id) {
    try {
      const response = await fetch('/.netlify/functions/delete-cerere', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cerereId: id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showToast('Cererea a fost ștearsă', 'success');
        await this.loadMotivari();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare ștergere cerere:', error);
      this.showToast('Eroare la ștergerea cererii', 'error');
    }
  }

  async loadRecentActivity() {
    // Combină ultimele 5 activități
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const recentItems = allItems
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const container = document.getElementById('recent-activity');

    if (recentItems.length === 0) {
      container.innerHTML = '<p class="no-activity">Nu ai activitate recentă</p>';
      return;
    }
    const activityHTML = recentItems
      .map((item) => {
        const tipText =
          item.type === 'motivare'
            ? this.getTipTextMotivare(item.tip_motivare)
            : this.getTipTextCerere(item.tip_cerere);

        return `
          <div class="activity-item">
            <div class="activity-info">
              <span class="activity-type">${tipText}</span>
              <small class="activity-date">${this.formatDate(item.created_at)}</small>
            </div>
            <span class="activity-status status-${item.status}">${this.getStatusText(
          item.status
        )}</span>
          </div>
        `;
      })
      .join('');

    container.innerHTML = activityHTML;
  }

  getTipTextMotivare(tip) {
    const tipTexts = {
      medicala_clasica: 'Medicală',
      invoire_lunga: 'Învoire de la părinte',
      alte_motive: 'Alte motive',
    };
    return tipTexts[tip] || tip;
  }

  getTipTextCerere(tip) {
    const tipTexts = {
      personal: 'Învoire personală',
      invoire_justificata: 'Învoire justificată',
    };
    return tipTexts[tip] || tip;
  }

  getStatusText(status) {
    const statusTexts = {
      in_asteptare: 'În așteptare',
      aprobata: 'Aprobată',
      respinsa: 'Respinsă',
      finalizata: 'Motivată',
      cerere_trimisa: 'Trimisă',
      aprobata_parinte: 'Aprobată de părinte',
      acceptata_diriginte: 'Acceptată',
    };
    return statusTexts[status] || status;
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ro-RO');
  }

  formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('ro-RO');
  }

  // Toast notifications system
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
      // Fallback la alert dacă nu există containerul
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${this.getToastIcon(type)}</span>
        <span>${message}</span>
      </div>
    `;

    container.appendChild(toast);

    // Auto-remove după 4 secunde
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 4000);

    // Remove pe click
    toast.addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
  }

  getToastIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || 'ℹ️';
  }
}

// Funcții globale pentru onclick handlers
window.selectMotivareType = (tip) => dashboard.selectMotivareType(tip);
window.selectCerereType = (tip) => dashboard.selectCerereType(tip);
window.openCamera = () => dashboard.openCamera();
window.openGallery = () => dashboard.openGallery();
window.removeImage = () => dashboard.removeImage();
window.resetForm = () => dashboard.resetUploadForm();
window.resetCerereForm = () => dashboard.resetCerereForm();
window.rotateImage = (degrees) => dashboard.rotateImage(degrees);
window.loadMotivari = () => {
  if (window.dashboard) {
    dashboard.loadMotivari();
  }
};

// Inițializare
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new Dashboard();
});
