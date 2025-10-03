// js/diriginte.js

class Diriginte {
  constructor() {
    this.currentUser = null;
    this.motivari = [];
    this.cereri = [];
    this.elevi = [];
    this.selectedItems = new Set();
    this.currentTypeFilter = 'toate';
    this.currentItem = null;
    this.currentElevId = null;
    this.modalImageRotation = 0;
    this.init();
  }

  async init() {
    // Verifică autentificarea
    await this.checkAuth();

    // Inițializează interfața
    this.setupNavigation();
    this.setupEventListeners();

    // Încarcă datele
    await this.loadSolicitari();

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

    // Actualizează bottom nav
    document.querySelectorAll('.nav-item').forEach((nav) => {
      nav.classList.remove('active');
      if (nav.dataset.page === page) {
        nav.classList.add('active');
      }
    });

    // Logica specifică pentru fiecare pagină
    switch (page) {
      case 'dashboard':
        this.updateStats();
        break;
      case 'pending':
        this.displayPendingSolicitari();
        break;
      case 'approved':
        this.displayApprovedSolicitari();
        break;
      case 'rejected':
        this.displayRejectedSolicitari();
        break;
      case 'all':
        this.displayAllSolicitari();
        break;
      case 'statistici-elevi':
        this.loadStatisticiElevi();
        break;
      case 'detalii-elev':
        if (this.currentElevId) {
          this.displayDetaliiElev(this.currentElevId);
        }
        break;
    }
  }

  setupEventListeners() {
    // Filtre tipuri pentru pagina "toate"
    const typeFilterBtns = document.querySelectorAll('.type-filter-btn');
    typeFilterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentTypeFilter = btn.dataset.type;
        this.updateTypeFilterButtons();
        this.filterAllSolicitari();
      });
    });

    // Click outside modal pentru închidere
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.closeModal();
        this.closeExportModal();
        this.closeImageModal();
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

  async loadSolicitari() {
    try {
      const response = await fetch('/.netlify/functions/get-diriginte-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clasa: this.currentUser.clasa,
          action: 'get-all-data',
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.motivari = result.data.motivari || [];
        this.cereri = result.data.cereri || [];
        this.updateStats();
        this.updateNavigationBadges();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare solicitări:', error);
      this.showToast('Eroare la încărcarea solicitărilor', 'error');
    }
  }

  updateStats() {
    // Combină motivări și cereri pentru statistici
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const pending = allItems.filter(
      (item) => item.status === 'in_asteptare' || item.status === 'cerere_trimisa'
    ).length;

    const approved = allItems.filter(
      (item) => item.status === 'aprobata' || item.status === 'acceptata_diriginte'
    ).length;

    const rejected = allItems.filter((item) => item.status === 'respinsa').length;
    const finalized = allItems.filter((item) => item.status === 'finalizata').length;

    // Actualizează cardurile de statistici
    document.getElementById('total-pending').textContent = pending;
    document.getElementById('total-approved').textContent = approved;
    document.getElementById('total-rejected').textContent = rejected;
    document.getElementById('total-finalized').textContent = finalized;

    // Actualizează badge-urile din quick actions
    document.getElementById('pending-badge').textContent = pending;
  }

  updateNavigationBadges() {
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const pending = allItems.filter(
      (item) => item.status === 'in_asteptare' || item.status === 'cerere_trimisa'
    ).length;

    const navBadge = document.getElementById('nav-pending-badge');

    if (pending > 0) {
      navBadge.textContent = pending;
      navBadge.style.display = 'block';
    } else {
      navBadge.style.display = 'none';
    }
  }

  displayPendingSolicitari() {
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const pendingItems = allItems.filter(
      (item) => item.status === 'in_asteptare' || item.status === 'cerere_trimisa'
    );

    // Sortează după data creării
    pendingItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const container = document.getElementById('pending-feed');
    const emptyState = document.getElementById('pending-empty');
    const countBadge = document.getElementById('pending-count');

    countBadge.textContent = pendingItems.length;

    if (pendingItems.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const itemsHTML = pendingItems
      .map((item) => this.createSolicitareCard(item, 'pending'))
      .join('');
    container.innerHTML = itemsHTML;
  }

  displayApprovedSolicitari() {
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const approvedItems = allItems.filter(
      (item) => item.status === 'aprobata' || item.status === 'acceptata_diriginte'
    );

    // Sortează după data creării
    approvedItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const container = document.getElementById('approved-feed');
    const emptyState = document.getElementById('approved-empty');

    if (approvedItems.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const itemsHTML = approvedItems
      .map((item) => this.createSolicitareCard(item, 'approved'))
      .join('');
    container.innerHTML = itemsHTML;
  }

  displayRejectedSolicitari() {
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const rejectedItems = allItems.filter((item) => item.status === 'respinsa');

    // Sortează după data creării
    rejectedItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const container = document.getElementById('rejected-feed');
    const emptyState = document.getElementById('rejected-empty');

    if (rejectedItems.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const itemsHTML = rejectedItems
      .map((item) => this.createSolicitareCard(item, 'rejected'))
      .join('');
    container.innerHTML = itemsHTML;
  }

  displayAllSolicitari() {
    this.filterAllSolicitari();
  }

  filterAllSolicitari() {
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    let filteredItems = allItems;

    // Filtrare după tip
    if (this.currentTypeFilter !== 'toate') {
      filteredItems = filteredItems.filter((item) => {
        if (item.type === 'motivare') {
          return item.tip_motivare === this.currentTypeFilter;
        } else {
          return item.tip_cerere === this.currentTypeFilter;
        }
      });
    }

    // Sortează după data creării
    filteredItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const container = document.getElementById('all-feed');
    const emptyState = document.getElementById('all-empty');

    if (filteredItems.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    const itemsHTML = filteredItems.map((item) => this.createSolicitareCard(item, 'all')).join('');
    container.innerHTML = itemsHTML;
  }

  createSolicitareCard(item, context) {
    const statusColors = {
      in_asteptare: '#D97706',
      cerere_trimisa: '#D97706',
      aprobata: '#059669',
      acceptata_diriginte: '#059669',
      respinsa: '#EF4444',
      finalizata: '#2563EB',
    };

    const statusTexts = {
      in_asteptare: 'În așteptare',
      cerere_trimisa: 'În așteptare',
      aprobata: 'Aprobată',
      acceptata_diriginte: 'Aprobată',
      respinsa: 'Respinsă',
      finalizata: 'Motivată',
    };

    const tipTexts = {
      medicala_clasica: '🏥 Medicală',
      invoire_lunga: '📅 Cerere învoire',
      alte_motive: '📋 Alte motive',
      personal: '👤 Problemă personală',
      invoire_justificata: '🚨 Învoire justificată',
    };

    const canProcess = item.status === 'in_asteptare' || item.status === 'cerere_trimisa';
    const canSelect = item.status === 'aprobata' || item.status === 'acceptata_diriginte';

    // Acțiuni pentru butoane (pending)
    let actionsHTML = '';
    if (context === 'pending' && canProcess) {
      actionsHTML = `
      <div class="card-actions">
        <button class="card-btn reject-btn" onclick="event.stopPropagation(); diriginte.quickReject('${item.type}', ${item.id})">
          Respinge
        </button>
        <button class="card-btn approve-btn" onclick="event.stopPropagation(); diriginte.quickApprove('${item.type}', ${item.id})">
          Aprobă
        </button>
      </div>
    `;
    }

    // Checkbox pentru selecție (approved)
    const checkboxHTML =
      context === 'approved' && canSelect
        ? `
    <input type="checkbox" class="solicitare-checkbox"
           onclick="event.stopPropagation()"
           onchange="diriginte.toggleItemSelection('${item.type}', ${item.id}, this.checked)">
  `
        : '';

    // Conținut specific tipului
    let contentHTML = '';
    if (item.type === 'motivare') {
      contentHTML = `
      <div class="perioada">
        <strong>Perioada:</strong>
        ${this.formatDate(item.perioada_inceput)}
        ${item.perioada_sfarsit ? ` - ${this.formatDate(item.perioada_sfarsit)}` : ''}
      </div>
      ${item.motiv ? `<div class="motiv"><strong>Motiv:</strong> ${item.motiv}</div>` : ''}
      ${
        item.ore_scazute > 0
          ? `<div class="ore-info"><strong>Ore scăzute:</strong> ${item.ore_scazute}</div>`
          : ''
      }
      ${
        item.url_imagine
          ? `
        <div class="card-image-container" onclick="event.stopPropagation(); diriginte.openImageModal('${item.url_imagine}')">
          <img src="${item.url_imagine}" alt="Document motivare" loading="lazy" />
        </div>
      `
          : ''
      }
    `;
    } else {
      contentHTML = `
      <div class="perioada">
        <strong>Data:</strong> ${this.formatDate(item.data_solicitata)}
        <br><strong>Ore:</strong> ${item.ora_inceput} - ${item.ora_sfarsit} (${
        item.ore_solicitate
      }h)
      </div>
      <div class="motiv"><strong>Motiv:</strong> ${item.motiv}</div>
      ${
        item.ore_scazute > 0
          ? `<div class="ore-info"><strong>Ore scăzute:</strong> ${item.ore_scazute}</div>`
          : ''
      }
    `;
    }

    const tipKey = item.type === 'motivare' ? item.tip_motivare : item.tip_cerere;

    return `
    <div class="solicitare-card ${item.status}" onclick="diriginte.viewSolicitare('${item.type}', ${
      item.id
    })">
      ${actionsHTML}

      <div class="card-header">
        <div class="student-info">
          <div class="student-name">${item.elev_nume} ${item.elev_prenume}</div>
          <div class="solicitare-tip">${tipTexts[tipKey] || tipKey}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${checkboxHTML}
          <div class="status-badge" style="background: ${statusColors[item.status]};">
            ${statusTexts[item.status]}
          </div>
        </div>
      </div>

      <div class="card-content">
        ${contentHTML}
      </div>

      <div class="card-footer">
        <small>Trimis la: ${this.formatDateTime(item.created_at)}</small>
        <small>de: ${item.trimis_de === 'elev' ? 'Elev' : 'Părinte'}</small>
      </div>
    </div>
  `;
  }

  async quickApprove(type, itemId) {
    event.stopPropagation();
    const newStatus = type === 'motivare' ? 'aprobata' : 'acceptata_diriginte';
    await this.updateItemStatus(type, itemId, newStatus);
  }

  async quickReject(type, itemId) {
    event.stopPropagation();
    await this.updateItemStatus(type, itemId, 'respinsa');
  }

  async updateItemStatus(type, itemId, newStatus) {
    try {
      const functionName = type === 'motivare' ? 'update-motivare-status' : 'update-cerere-status';

      const response = await fetch(`/.netlify/functions/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [`${type}Id`]: itemId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (result.success) {
        const statusText = newStatus === 'respinsa' ? 'respinsă' : 'aprobată';
        this.showToast(`Solicitarea a fost ${statusText}`, 'success');
        await this.loadSolicitari();

        // Reîmprospătează pagina curentă
        const activePage = document.querySelector('.nav-item.active').dataset.page;
        this.switchPage(activePage);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare actualizare status:', error);
      this.showToast('Eroare la actualizarea statusului', 'error');
    }
  }

  viewSolicitare(type, itemId) {
    const item =
      type === 'motivare'
        ? this.motivari.find((m) => m.id === itemId)
        : this.cereri.find((c) => c.id === itemId);

    if (!item) return;

    this.currentItem = { ...item, type };
    this.displaySolicitareModal(this.currentItem);
  }

  displaySolicitareModal(item) {
    const modal = document.getElementById('solicitare-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    const tipTexts = {
      medicala_clasica: '🏥 Motivare Medicală',
      invoire_lunga: '📅 Cerere Învoire',
      alte_motive: '📋 Alte Motive',
      personal: '👤 Învoire Personal',
      invoire_justificata: '🚨 Învoire Justificată',
    };

    const tipKey = item.type === 'motivare' ? item.tip_motivare : item.tip_cerere;
    modalTitle.textContent = `Detalii ${item.type === 'motivare' ? 'Motivare' : 'Cerere'}`;

    let detailsHTML = `
      <div class="solicitare-details">
        <div class="detail-row">
          <strong>Elev:</strong> ${item.elev_nume} ${item.elev_prenume}
        </div>
        <div class="detail-row">
          <strong>Tip:</strong> ${tipTexts[tipKey] || tipKey}
        </div>
    `;

    if (item.type === 'motivare') {
      detailsHTML += `
        <div class="detail-row">
          <strong>Perioada:</strong> ${this.formatDate(item.perioada_inceput)}
          ${item.perioada_sfarsit ? ` - ${this.formatDate(item.perioada_sfarsit)}` : ''}
        </div>
        ${item.motiv ? `<div class="detail-row"><strong>Motiv:</strong> ${item.motiv}</div>` : ''}
        ${
          item.ore_scazute > 0
            ? `<div class="detail-row"><strong>Ore scăzute:</strong> ${item.ore_scazute}</div>`
            : ''
        }
        ${
          item.url_imagine
            ? `
          <div class="detail-row">
            <strong>Document:</strong>
            <div class="modal-image-container" onclick="diriginte.openImageModal('${item.url_imagine}')">
              <img src="${item.url_imagine}" alt="Document motivare" />
            </div>
          </div>
        `
            : ''
        }
      `;
    } else {
      detailsHTML += `
        <div class="detail-row">
          <strong>Data:</strong> ${this.formatDate(item.data_solicitata)}
        </div>
        <div class="detail-row">
          <strong>Interval:</strong> ${item.ora_inceput} - ${item.ora_sfarsit} (${
        item.ore_solicitate
      }h)
        </div>
        <div class="detail-row">
          <strong>Motiv:</strong> ${item.motiv}
        </div>
        ${
          item.ore_scazute > 0
            ? `<div class="detail-row"><strong>Ore scăzute:</strong> ${item.ore_scazute}</div>`
            : ''
        }
      `;
    }

    detailsHTML += `
        <div class="detail-row">
          <strong>Trimis de:</strong> ${item.trimis_de === 'elev' ? 'Elev' : 'Părinte'}
        </div>
        <div class="detail-row">
          <strong>Data:</strong> ${this.formatDateTime(item.created_at)}
        </div>
      </div>
    `;

    modalBody.innerHTML = detailsHTML;

    // Afișează/ascunde butoanele în funcție de status
    const modalActions = document.getElementById('modal-actions');
    const canProcess = item.status === 'in_asteptare' || item.status === 'cerere_trimisa';

    if (canProcess) {
      modalActions.style.display = 'flex';
    } else {
      modalActions.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  openImageModal(imageUrl) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('modal-image');

    this.modalImageRotation = 0;
    img.src = imageUrl;
    img.style.transform = 'rotate(0deg)';

    modal.style.display = 'flex';
  }

  rotateModalImage(degrees) {
    this.modalImageRotation += degrees;
    const img = document.getElementById('modal-image');
    img.style.transform = `rotate(${this.modalImageRotation}deg)`;
  }

  closeImageModal() {
    document.getElementById('image-modal').style.display = 'none';
    this.modalImageRotation = 0;
  }

  async approveSolicitare() {
    if (this.currentItem) {
      const newStatus = this.currentItem.type === 'motivare' ? 'aprobata' : 'acceptata_diriginte';
      await this.updateItemStatus(this.currentItem.type, this.currentItem.id, newStatus);
      this.closeModal();
    }
  }

  async rejectSolicitare() {
    if (this.currentItem) {
      await this.updateItemStatus(this.currentItem.type, this.currentItem.id, 'respinsa');
      this.closeModal();
    }
  }

  closeModal() {
    document.getElementById('solicitare-modal').style.display = 'none';
    this.currentItem = null;
  }

  toggleItemSelection(type, itemId, selected) {
    const key = `${type}_${itemId}`;
    if (selected) {
      this.selectedItems.add(key);
    } else {
      this.selectedItems.delete(key);
    }
  }

  toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-approved');
    const allItems = [
      ...this.motivari.map((m) => ({ ...m, type: 'motivare' })),
      ...this.cereri.map((c) => ({ ...c, type: 'cerere' })),
    ];

    const approvedItems = allItems.filter(
      (item) => item.status === 'aprobata' || item.status === 'acceptata_diriginte'
    );

    if (selectAllCheckbox.checked) {
      // Selectează toate
      approvedItems.forEach((item) => this.selectedItems.add(`${item.type}_${item.id}`));
      document.querySelectorAll('.solicitare-checkbox').forEach((cb) => (cb.checked = true));
    } else {
      // Deselectează toate
      approvedItems.forEach((item) => this.selectedItems.delete(`${item.type}_${item.id}`));
      document.querySelectorAll('.solicitare-checkbox').forEach((cb) => (cb.checked = false));
    }
  }

  exportMotivari() {
    if (this.selectedItems.size === 0) {
      this.showToast('Selectează solicitările de exportat', 'error');
      return;
    }

    const selectedItemsArray = Array.from(this.selectedItems).map((key) => {
      const [type, id] = key.split('_');
      const item =
        type === 'motivare'
          ? this.motivari.find((m) => m.id === parseInt(id))
          : this.cereri.find((c) => c.id === parseInt(id));
      return { ...item, type };
    });

    const exportText = this.generateExportText(selectedItemsArray);

    document.getElementById('export-text').value = exportText;
    document.getElementById('export-modal').style.display = 'flex';
  }

  generateExportText(items) {
    let text = `Motivări pentru catalogul electronic - Clasa ${this.currentUser.clasa}\n`;
    text += `Generat la: ${new Date().toLocaleDateString('ro-RO')}\n\n`;

    items.forEach((item, index) => {
      text += `${index + 1}. ${item.elev_nume} ${item.elev_prenume}\n`;

      if (item.type === 'motivare') {
        text += `   Tip: ${this.getTipTextMotivare(item.tip_motivare)}\n`;
        text += `   Perioada: ${this.formatDate(item.perioada_inceput)}`;
        if (item.perioada_sfarsit) {
          text += ` - ${this.formatDate(item.perioada_sfarsit)}`;
        }
        text += `\n`;
      } else {
        text += `   Tip: ${this.getTipTextCerere(item.tip_cerere)}\n`;
        text += `   Data: ${this.formatDate(item.data_solicitata)}\n`;
        text += `   Ore: ${item.ora_inceput} - ${item.ora_sfarsit} (${item.ore_solicitate}h)\n`;
      }

      if (item.motiv) {
        text += `   Motiv: ${item.motiv}\n`;
      }
      text += `\n`;
    });

    return text;
  }

  async finalizeSelected() {
    if (this.selectedItems.size === 0) {
      this.showToast('Selectează solicitările de finalizat', 'error');
      return;
    }

    // Separă motivările de cereri
    const motivariIds = [];
    const cereriIds = [];

    this.selectedItems.forEach((key) => {
      const [type, id] = key.split('_');
      if (type === 'motivare') {
        motivariIds.push(parseInt(id));
      } else {
        cereriIds.push(parseInt(id));
      }
    });

    try {
      // Finalizează motivările
      if (motivariIds.length > 0) {
        const response = await fetch('/.netlify/functions/finalizeaza-motivari', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            motivariIds: motivariIds,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Finalizează cererile
      if (cereriIds.length > 0) {
        const response = await fetch('/.netlify/functions/finalizeaza-cereri', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cereriIds: cereriIds,
          }),
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      }

      this.showToast(
        `${this.selectedItems.size} solicitări au fost marcate ca finalizate`,
        'success'
      );
      this.selectedItems.clear();
      await this.loadSolicitari();
      this.displayApprovedSolicitari();
    } catch (error) {
      console.error('Eroare finalizare solicitări:', error);
      this.showToast('Eroare la finalizarea solicitărilor', 'error');
    }
  }

  copyExportText() {
    const textArea = document.getElementById('export-text');
    textArea.select();
    document.execCommand('copy');
    this.showToast('Text copiat în clipboard', 'success');
  }
  closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
  }

  updateTypeFilterButtons() {
    document.querySelectorAll('.type-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.type === this.currentTypeFilter);
    });
  }

  async refreshAll() {
    await this.loadSolicitari();
    this.showToast('Datele au fost actualizate', 'success');
  }

  async loadAllSolicitari() {
    await this.loadSolicitari();
    this.displayAllSolicitari();
  }

  async loadRejectedSolicitari() {
    await this.loadSolicitari();
    this.displayRejectedSolicitari();
  }

  // === STATISTICI ELEVI ===

  async loadStatisticiElevi() {
    try {
      // Obține lista elevilor din clasa dirigintelui
      const response = await fetch('/.netlify/functions/get-diriginte-motivari', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clasa: this.currentUser.clasa,
          action: 'get-elevi',
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.elevi = result.data.elevi || [];
        this.displayEleviList();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Eroare încărcare elevi:', error);
      this.showToast('Eroare la încărcarea elevilor', 'error');
    }
  }

  displayEleviList() {
    const container = document.getElementById('elevi-list');

    if (!this.elevi || this.elevi.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <p>Nu sunt elevi în această clasă</p>
        </div>
      `;
      return;
    }

    // Calculează statistici pentru fiecare elev
    const eleviCuStatistici = this.elevi.map((elev) => {
      const motivariElev = this.motivari.filter((m) => m.elev_id === elev.id);
      const cereriElev = this.cereri.filter((c) => c.elev_id === elev.id);

      const totalSolicitari = motivariElev.length + cereriElev.length;
      const motivate = [
        ...motivariElev.filter((m) => m.status === 'finalizata'),
        ...cereriElev.filter((c) => c.status === 'finalizata'),
      ].length;

      const oreRamase = 42 - (elev.ore_personale_folosite || 0);

      return {
        ...elev,
        totalSolicitari,
        motivate,
        oreRamase,
      };
    });

    // Sortează alfabetic
    eleviCuStatistici.sort((a, b) =>
      `${a.nume} ${a.prenume}`.localeCompare(`${b.nume} ${b.prenume}`)
    );

    const eleviHTML = eleviCuStatistici
      .map(
        (elev) => `
      <div class="elev-card" onclick="diriginte.viewDetaliiElev(${elev.id})">
        <div class="elev-card-header">
          <div class="elev-name">${elev.nume} ${elev.prenume}</div>
        </div>
        <div class="elev-stats-inline">
          <div class="elev-stat-item">
            <span>⏰</span>
            <strong>${elev.oreRamase}</strong>
            <span>ore rămase</span>
          </div>
          <div class="elev-stat-item">
            <span>✅</span>
            <strong>${elev.motivate}</strong>
            <span>motivate</span>
          </div>
          <div class="elev-stat-item">
            <span>📄</span>
            <strong>${elev.totalSolicitari}</strong>
            <span>total</span>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    container.innerHTML = eleviHTML;
  }

  viewDetaliiElev(elevId) {
    this.currentElevId = elevId;
    this.switchPage('detalii-elev');
    this.displayDetaliiElev(elevId);
  }

  displayDetaliiElev(elevId) {
    const elev = this.elevi.find((e) => e.id === elevId);
    if (!elev) return;

    // Actualizează titlul
    document.getElementById('detalii-elev-title').textContent = `${elev.nume} ${elev.prenume}`;

    // Filtrează solicitările elevului
    const motivariElev = this.motivari.filter((m) => m.elev_id === elevId);
    const cereriElev = this.cereri.filter((c) => c.elev_id === elevId);

    const allItems = [
      ...motivariElev.map((m) => ({ ...m, type: 'motivare' })),
      ...cereriElev.map((c) => ({ ...c, type: 'cerere' })),
    ];

    // Calculează statistici
    const oreRamase = 42 - (elev.ore_personale_folosite || 0);
    const motivate = allItems.filter((item) => item.status === 'finalizata').length;
    const totalSolicitari = allItems.length;

    // Actualizează stats
    document.getElementById('elev-ore-ramase').textContent = oreRamase;
    document.getElementById('elev-motivate').textContent = motivate;
    document.getElementById('elev-total').textContent = totalSolicitari;

    // Afișează lista de solicitări
    const container = document.getElementById('detalii-elev-feed');

    if (allItems.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <p>Nu sunt solicitări pentru acest elev</p>
        </div>
      `;
      return;
    }

    // Sortează după data creării
    allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const itemsHTML = allItems.map((item) => this.createSolicitareCard(item, 'elev')).join('');
    container.innerHTML = itemsHTML;
  }

  getTipTextMotivare(tip) {
    const tipTexts = {
      medicala_clasica: 'Medicală',
      invoire_lunga: 'Cerere învoire',
      alte_motive: 'Alte Motive',
    };
    return tipTexts[tip] || tip;
  }

  getTipTextCerere(tip) {
    const tipTexts = {
      personal: 'Învoire Personal',
      invoire_justificata: 'Învoire Justificată',
    };
    return tipTexts[tip] || tip;
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

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.display = show ? 'flex' : 'none';
    }
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'error');
  }
}

// Inițializare globală
let diriginte;
document.addEventListener('DOMContentLoaded', () => {
  diriginte = new Diriginte();
});
