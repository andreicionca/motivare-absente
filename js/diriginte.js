// js/diriginte.js

class Diriginte {
  constructor() {
    this.currentUser = null;
    this.motivari = [];
    this.cereri = [];
    this.selectedItems = new Set();
    this.currentFilter = 'toate';
    this.currentTypeFilter = 'toate';
    this.currentItem = null;
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
    }
  }

  setupEventListeners() {
    // Filtre status pentru pagina "toate"
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        this.updateFilterButtons();
        this.filterAllSolicitari();
      });
    });

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
      (item) =>
        item.status === 'in_asteptare' ||
        item.status === 'cerere_trimisa' ||
        item.status === 'aprobata_parinte'
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
      (item) =>
        item.status === 'in_asteptare' ||
        item.status === 'cerere_trimisa' ||
        item.status === 'aprobata_parinte'
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
      (item) =>
        item.status === 'in_asteptare' ||
        item.status === 'cerere_trimisa' ||
        item.status === 'aprobata_parinte'
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

    // Filtrare după status
    if (this.currentFilter !== 'toate') {
      filteredItems = filteredItems.filter((item) => {
        if (this.currentFilter === 'in_asteptare') {
          return (
            item.status === 'in_asteptare' ||
            item.status === 'cerere_trimisa' ||
            item.status === 'aprobata_parinte'
          );
        }
        if (this.currentFilter === 'aprobata') {
          return item.status === 'aprobata' || item.status === 'acceptata_diriginte';
        }
        return item.status === this.currentFilter;
      });
    }

    // Filtrare după tip
    if (this.currentTypeFilter !== 'toate') {
      if (this.currentTypeFilter === 'motivari') {
        filteredItems = filteredItems.filter((item) => item.type === 'motivare');
      } else if (this.currentTypeFilter === 'cereri') {
        filteredItems = filteredItems.filter((item) => item.type === 'cerere');
      } else {
        // Filtrare după tip specific
        filteredItems = filteredItems.filter((item) => {
          if (item.type === 'motivare') {
            return item.tip_motivare === this.currentTypeFilter;
          } else {
            return item.tip_cerere === this.currentTypeFilter;
          }
        });
      }
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
      aprobata_parinte: '#0891b2',
      aprobata: '#059669',
      acceptata_diriginte: '#059669',
      respinsa: '#EF4444',
      finalizata: '#2563EB',
    };

    const statusTexts = {
      in_asteptare: 'În așteptare',
      cerere_trimisa: 'Cerere trimisă',
      aprobata_parinte: 'Aprobată de părinte',
      aprobata: 'Aprobată',
      acceptata_diriginte: 'Acceptată',
      respinsa: 'Respinsă',
      finalizata: 'Motivată',
    };

    const tipTexts = {
      // Pentru motivări
      medicala_clasica: '🏥 Medicală',
      invoire_lunga: '📅 Învoire Lungă',
      alte_motive: '📋 Alte Motive',
      // Pentru cereri
      personal: '👤 Învoire Personal',
      medical_urgent: '🚨 Urgență Medicală',
    };

    // Determină dacă poate fi procesat
    const canProcess =
      item.status === 'in_asteptare' ||
      item.status === 'cerere_trimisa' ||
      item.status === 'aprobata_parinte';

    // Determină dacă poate fi selectat pentru finalizare
    const canSelect = item.status === 'aprobata' || item.status === 'acceptata_diriginte';

    // Generează acțiuni în funcție de context
    let actionsHTML = '';

    if (context === 'pending' && canProcess) {
      actionsHTML = `
        <div class="card-actions">
          <button class="card-btn reject-btn" onclick="diriginte.quickReject('${item.type}', ${item.id})">
            Respinge
          </button>
          <button class="card-btn approve-btn" onclick="diriginte.quickApprove('${item.type}', ${item.id})">
            Aprobă
          </button>
        </div>
      `;
    } else if (context === 'approved' && canSelect) {
      actionsHTML = `
        <input type="checkbox" class="solicitare-checkbox"
               onchange="diriginte.toggleItemSelection('${item.type}', ${item.id}, this.checked)">
      `;
    }

    // Generează conținut specific tipului
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
          <div class="card-image-container">
            <img src="${item.url_imagine}" alt="Document motivare" loading="lazy" />
          </div>
        `
            : ''
        }
      `;
    } else {
      // Cerere
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
      <div class="solicitare-card ${item.status}" onclick="diriginte.viewSolicitare('${
      item.type
    }', ${item.id})">
        ${actionsHTML}

        <div class="card-header">
          <div class="student-info">
            <div class="student-name">${item.elev_nume} ${item.elev_prenume}</div>
            <div class="solicitare-tip">${tipTexts[tipKey] || tipKey}</div>
          </div>
          <div class="status-badge" style="background: ${statusColors[item.status]};">
            ${statusTexts[item.status]}
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
      invoire_lunga: '📅 Învoire Lungă',
      alte_motive: '📋 Alte Motive',
      personal: '👤 Învoire Personal',
      medical_urgent: '🚨 Urgență Medicală',
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
            <div class="modal-image-container">
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
    const canProcess =
      item.status === 'in_asteptare' ||
      item.status === 'cerere_trimisa' ||
      item.status === 'aprobata_parinte';

    if (canProcess) {
      modalActions.style.display = 'flex';
    } else {
      modalActions.style.display = 'none';
    }

    modal.style.display = 'flex';
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

  updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
    });
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

  getTipTextMotivare(tip) {
    const tipTexts = {
      medicala_clasica: 'Medicală',
      invoire_lunga: 'Învoire Lungă',
      alte_motive: 'Alte Motive',
    };
    return tipTexts[tip] || tip;
  }

  getTipTextCerere(tip) {
    const tipTexts = {
      personal: 'Învoire Personal',
      medical_urgent: 'Urgență Medicală',
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
