// js/diriginte.js

class Diriginte {
  constructor() {
    this.currentUser = null;
    this.motivari = [];
    this.selectedMotivari = new Set();
    this.currentFilter = 'toate';
    this.currentMotivare = null;
    this.init();
  }

  async init() {
    // Verifică autentificarea
    await this.checkAuth();

    // Inițializează interfața
    this.setupNavigation();
    this.setupEventListeners();

    // Încarcă datele
    await this.loadMotivari();

    // Actualizează interfața
    this.updateUserInterface();
    this.updateStats();
  }

  async checkAuth() {
    this.currentUser = await auth.checkCurrentUser();

    if (!this.currentUser || this.currentUser.role !== 'diriginte') {
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
      case 'dashboard':
        this.updateStats();
        break;
      case 'pending':
        this.displayPendingMotivari();
        break;
      case 'approved':
        this.displayApprovedMotivari();
        break;
      case 'all':
        this.displayAllMotivari();
        break;
    }
  }

  setupEventListeners() {
    // Filtre pentru pagina "toate"
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        this.updateFilterButtons();
        this.filterAllMotivari();
      });
    });

    // Click outside modal pentru închidere
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeModal();
        this.closeExportModal();
      }
    });
  }

  updateUserInterface() {
    if (!this.currentUser) return;

    // Actualizează header
    document.getElementById(
      'user-name'
    ).textContent = `${this.currentUser.nume} ${this.currentUser.prenume}`;

    document.getElementById(
      'user-class'
    ).textContent = `Diriginte • Clasa ${this.currentUser.clasa}`;

    // Avatar
    const avatar = this.currentUser.nume.charAt(0).toUpperCase();
    document.getElementById('user-avatar').textContent = avatar;
  }

  async loadMotivari() {
    try {
      const response = await fetch('/.netlify/functions/get-diriginte-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clasa: this.currentUser.clasa,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.motivari = result.data;
        this.updateStats();
        this.updateNavigationBadges();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare motivări:', error);
      this.showError('Eroare la încărcarea motivărilor');
    }
  }

  updateStats() {
    const pending = this.motivari.filter((m) => m.status === 'in_asteptare').length;
    const approved = this.motivari.filter((m) => m.status === 'aprobata').length;
    const rejected = this.motivari.filter((m) => m.status === 'respinsa').length;
    const finalized = this.motivari.filter((m) => m.status === 'finalizata').length;

    // Actualizează cardurile de statistici
    document.getElementById('total-pending').textContent = pending;
    document.getElementById('total-approved').textContent = approved;
    document.getElementById('total-rejected').textContent = rejected;
    document.getElementById('total-finalized').textContent = finalized;

    // Actualizează badge-urile din quick actions
    document.getElementById('pending-badge').textContent = pending;
  }

  updateNavigationBadges() {
    const pending = this.motivari.filter((m) => m.status === 'in_asteptare').length;
    const navBadge = document.getElementById('nav-pending-badge');

    if (pending > 0) {
      navBadge.textContent = pending;
      navBadge.style.display = 'block';
    } else {
      navBadge.style.display = 'none';
    }
  }

  displayPendingMotivari() {
    const pendingMotivari = this.motivari.filter((m) => m.status === 'in_asteptare');
    const container = document.getElementById('pending-feed');
    const emptyState = document.getElementById('pending-empty');
    const countBadge = document.getElementById('pending-count');

    countBadge.textContent = pendingMotivari.length;

    if (pendingMotivari.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const motivariHTML = pendingMotivari
      .map((motivare) => this.createMotivareCard(motivare, 'pending'))
      .join('');
    container.innerHTML = motivariHTML;
  }

  displayApprovedMotivari() {
    const approvedMotivari = this.motivari.filter((m) => m.status === 'aprobata');
    const container = document.getElementById('approved-feed');
    const emptyState = document.getElementById('approved-empty');

    if (approvedMotivari.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const motivariHTML = approvedMotivari
      .map((motivare) => this.createMotivareCard(motivare, 'approved'))
      .join('');
    container.innerHTML = motivariHTML;
  }

  displayAllMotivari() {
    this.filterAllMotivari();
  }

  filterAllMotivari() {
    let filteredMotivari = this.motivari;

    if (this.currentFilter !== 'toate') {
      filteredMotivari = this.motivari.filter((m) => m.status === this.currentFilter);
    }

    const container = document.getElementById('all-feed');
    const emptyState = document.getElementById('all-empty');

    if (filteredMotivari.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const motivariHTML = filteredMotivari
      .map((motivare) => this.createMotivareCard(motivare, 'all'))
      .join('');
    container.innerHTML = motivariHTML;
  }

  createMotivareCard(motivare, context) {
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

    // Generează acțiuni în funcție de context
    let actionsHTML = '';

    if (context === 'pending') {
      actionsHTML = `
                <div class="card-actions">
                    <button class="card-btn reject-btn" onclick="diriginte.quickReject(${motivare.id})">
                        Respinge
                    </button>
                    <button class="card-btn approve-btn" onclick="diriginte.quickApprove(${motivare.id})">
                        Aprobă
                    </button>
                </div>
            `;
    } else if (context === 'approved') {
      actionsHTML = `
                <input type="checkbox" class="motivare-checkbox"
                       onchange="diriginte.toggleMotivareSelection(${motivare.id}, this.checked)">
            `;
    }

    return `
            <div class="motivare-card ${motivare.status}" onclick="diriginte.viewMotivare(${
      motivare.id
    })">
                ${actionsHTML}

                <div class="card-header">
                    <div>
                        <div class="student-name">${motivare.elev_nume} ${
      motivare.elev_prenume
    }</div>
                        <div class="motivare-tip">${
                          tipTexts[motivare.tip_motivare] || motivare.tip_motivare
                        }</div>
                    </div>
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
                        ? `<div class="ore-info"><strong>Ore scăzute:</strong> ${motivare.ore_scazute}</div>`
                        : ''
                    }
                </div>

                <div class="card-footer">
                    <small>Trimis la: ${this.formatDateTime(motivare.created_at)}</small>
                    <small>de: ${motivare.trimis_de === 'elev' ? 'Elev' : 'Părinte'}</small>
                </div>
            </div>
        `;
  }

  async quickApprove(motivareId) {
    event.stopPropagation(); // Previne deschiderea modalului
    await this.updateMotivareStatus(motivareId, 'aprobata');
  }

  async quickReject(motivareId) {
    event.stopPropagation(); // Previne deschiderea modalului
    await this.updateMotivareStatus(motivareId, 'respinsa');
  }

  async updateMotivareStatus(motivareId, newStatus) {
    try {
      this.showLoading(true);

      const response = await fetch('/.netlify/functions/update-motivare-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivareId: motivareId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(`Motivarea a fost ${newStatus === 'aprobata' ? 'aprobată' : 'respinsă'}`);
        await this.loadMotivari();

        // Reîmprospătează pagina curentă
        const activePage = document.querySelector('.nav-item.active').dataset.page;
        this.switchPage(activePage);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare actualizare status:', error);
      this.showError('Eroare la actualizarea statusului');
    } finally {
      this.showLoading(false);
    }
  }

  viewMotivare(motivareId) {
    const motivare = this.motivari.find((m) => m.id === motivareId);
    if (!motivare) return;

    this.currentMotivare = motivare;
    this.displayMotivareModal(motivare);
  }

  displayMotivareModal(motivare) {
    const modal = document.getElementById('motivare-modal');
    const modalBody = document.getElementById('modal-body');

    const tipTexts = {
      medicala: '🏥 Motivare Medicală',
      invoire_scurta_personal: '⏱️ Învoire Scurtă Personal',
      invoire_scurta_medical: '⏱️ Învoire Scurtă Medical',
      invoire_lunga: '📅 Învoire Lungă',
    };

    modalBody.innerHTML = `
            <div class="motivare-details">
                <div class="detail-row">
                    <strong>Elev:</strong> ${motivare.elev_nume} ${motivare.elev_prenume}
                </div>
                <div class="detail-row">
                    <strong>Tip:</strong> ${tipTexts[motivare.tip_motivare]}
                </div>
                <div class="detail-row">
                    <strong>Perioada:</strong> ${this.formatDate(motivare.perioada_inceput)}
                    ${
                      motivare.perioada_sfarsit
                        ? ` - ${this.formatDate(motivare.perioada_sfarsit)}`
                        : ''
                    }
                </div>
                ${
                  motivare.ore_solicitare
                    ? `<div class="detail-row"><strong>Ore solicitate:</strong> ${motivare.ore_solicitare}</div>`
                    : ''
                }
                ${
                  motivare.motiv
                    ? `<div class="detail-row"><strong>Motiv:</strong> ${motivare.motiv}</div>`
                    : ''
                }
                ${
                  motivare.ore_scazute > 0
                    ? `<div class="detail-row"><strong>Ore scăzute:</strong> ${motivare.ore_scazute}</div>`
                    : ''
                }
                <div class="detail-row">
                    <strong>Trimis de:</strong> ${
                      motivare.trimis_de === 'elev' ? 'Elev' : 'Părinte'
                    }
                </div>
                <div class="detail-row">
                    <strong>Data:</strong> ${this.formatDateTime(motivare.created_at)}
                </div>
                ${
                  motivare.url_imagine
                    ? `<div class="detail-row">
                        <strong>Document:</strong>
                        <button onclick="window.open('${motivare.url_imagine}', '_blank')" class="view-btn">
                            📷 Vezi documentul
                        </button>
                    </div>`
                    : ''
                }
            </div>
        `;

    // Afișează/ascunde butoanele în funcție de status
    const approveBtn = document.getElementById('approve-btn');
    const rejectBtn = document.getElementById('reject-btn');

    if (motivare.status === 'in_asteptare') {
      approveBtn.style.display = 'block';
      rejectBtn.style.display = 'block';
    } else {
      approveBtn.style.display = 'none';
      rejectBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  async approveMotivare() {
    if (this.currentMotivare) {
      await this.updateMotivareStatus(this.currentMotivare.id, 'aprobata');
      this.closeModal();
    }
  }

  async rejectMotivare() {
    if (this.currentMotivare) {
      await this.updateMotivareStatus(this.currentMotivare.id, 'respinsa');
      this.closeModal();
    }
  }

  closeModal() {
    document.getElementById('motivare-modal').style.display = 'none';
    this.currentMotivare = null;
  }

  toggleMotivareSelection(motivareId, selected) {
    if (selected) {
      this.selectedMotivari.add(motivareId);
    } else {
      this.selectedMotivari.delete(motivareId);
    }
  }

  toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-approved');
    const approvedMotivari = this.motivari.filter((m) => m.status === 'aprobata');

    if (selectAllCheckbox.checked) {
      // Selectează toate
      approvedMotivari.forEach((m) => this.selectedMotivari.add(m.id));
      document.querySelectorAll('.motivare-checkbox').forEach((cb) => (cb.checked = true));
    } else {
      // Deselectează toate
      approvedMotivari.forEach((m) => this.selectedMotivari.delete(m.id));
      document.querySelectorAll('.motivare-checkbox').forEach((cb) => (cb.checked = false));
    }
  }

  exportMotivari() {
    const selectedIds = Array.from(this.selectedMotivari);

    if (selectedIds.length === 0) {
      this.showError('Selectează motivările de exportat');
      return;
    }

    const selectedMotivari = this.motivari.filter((m) => selectedIds.includes(m.id));
    const exportText = this.generateExportText(selectedMotivari);

    document.getElementById('export-text').value = exportText;
    document.getElementById('export-modal').style.display = 'flex';
  }

  generateExportText(motivari) {
    let text = `Motivări pentru catalogul electronic - Clasa ${this.currentUser.clasa}\n`;
    text += `Generat la: ${new Date().toLocaleDateString('ro-RO')}\n\n`;

    motivari.forEach((motivare, index) => {
      text += `${index + 1}. ${motivare.elev_nume} ${motivare.elev_prenume}\n`;
      text += `   Tip: ${this.getTipText(motivare.tip_motivare)}\n`;
      text += `   Perioada: ${this.formatDate(motivare.perioada_inceput)}`;
      if (motivare.perioada_sfarsit) {
        text += ` - ${this.formatDate(motivare.perioada_sfarsit)}`;
      }
      text += `\n`;
      if (motivare.ore_solicitare) {
        text += `   Ore: ${motivare.ore_solicitare}\n`;
      }
      if (motivare.motiv) {
        text += `   Motiv: ${motivare.motiv}\n`;
      }
      text += `\n`;
    });

    return text;
  }

  async finalizeSelected() {
    const selectedIds = Array.from(this.selectedMotivari);

    if (selectedIds.length === 0) {
      this.showError('Selectează motivările de finalizat');
      return;
    }

    if (!confirm(`Sigur vrei să marchezi ${selectedIds.length} motivări ca finalizate?`)) {
      return;
    }

    try {
      this.showLoading(true);

      const response = await fetch('/.netlify/functions/finalizeaza-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          motivariIds: selectedIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showSuccess(`${selectedIds.length} motivări au fost marcate ca finalizate`);
        this.selectedMotivari.clear();
        await this.loadMotivari();
        this.displayApprovedMotivari();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare finalizare motivări:', error);
      this.showError('Eroare la finalizarea motivărilor');
    } finally {
      this.showLoading(false);
    }
  }

  copyExportText() {
    const textArea = document.getElementById('export-text');
    textArea.select();
    document.execCommand('copy');
    this.showSuccess('Text copiat în clipboard');
  }

  closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
  }

  updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
    });
  }

  async refreshAll() {
    await this.loadMotivari();
    this.showSuccess('Datele au fost actualizate');
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
    alert(message); // Temporary - poate fi înlocuit cu toast
  }

  showError(message) {
    alert(message); // Temporary - poate fi înlocuit cu toast
  }
}

// Inițializare globală
let diriginte;
document.addEventListener('DOMContentLoaded', () => {
  diriginte = new Diriginte();
});
