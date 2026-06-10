// dashboard.js — логіка головної сторінки

document.addEventListener('DOMContentLoaded', () => {
  const CATS = {
    auto:  { label: 'Авто',       icon: '🚗', cls: 'badge-auto' },
    phone: { label: 'Техніка',    icon: '📱', cls: 'badge-phone' },
    home:  { label: 'Іпотека',    icon: '🏠', cls: 'badge-home' },
    shop:  { label: 'Споживчий',  icon: '🛒', cls: 'badge-shop' },
    biz:   { label: 'Бізнес',     icon: '💼', cls: 'badge-biz' },
    other: { label: 'Інше',       icon: '📂', cls: 'badge-other' }
  };

  let activeFilter = 'all';
  let activeSort = 'date';
  let editingId = null;

  function init() {
    renderSummary();
    renderLoans();
    renderUpcoming();
    bindNav();
    bindSort();
    bindPayModal();
    bindEditModal();
  }

  // ─── SUMMARY ───────────────────────────────
  function renderSummary() {
    const s = DB.summary();
    document.getElementById('stat-balance').textContent = Calc.formatMoney(s.totalBalance);
    document.getElementById('stat-monthly').textContent = Calc.formatMoney(s.thisMonthTotal);
    document.getElementById('stat-count').textContent = s.count + ' кредитів';
    document.getElementById('stat-monthly-sub').textContent = s.thisMonthCount + ' платежів цього місяця';
    const ovEl = document.getElementById('stat-overdue');
    if (s.overdueCount > 0) {
      ovEl.textContent = '⚠️ ' + s.overdueCount + ' прострочено';
      ovEl.style.color = 'var(--danger)';
    } else {
      ovEl.textContent = '✓ Все гаразд';
      ovEl.style.color = 'var(--success)';
    }
  }

  // ─── LOANS ─────────────────────────────────
  function renderLoans() {
    const grid = document.getElementById('loans-grid');
    let loans = DB.getAll();

    if (activeFilter === 'active') loans = loans.filter(l => !l.closed);
    if (activeFilter === 'closed') loans = loans.filter(l => l.closed);

    // Сортування
    loans = sortLoans(loans, activeSort);

    if (!loans.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <div class="empty-icon">💳</div>
        <div class="empty-title">Кредитів поки немає</div>
        <div class="empty-sub">Додайте перший кредит щоб почати відстеження</div>
        <a href="add.html" class="btn btn-primary">+ Додати кредит</a>
      </div>`;
      return;
    }

    grid.innerHTML = loans.map(loan => loanCardHTML(loan)).join('');

    grid.querySelectorAll('.btn-details').forEach(btn =>
      btn.addEventListener('click', () => window.location.href = 'loan.html?id=' + btn.dataset.id));

    grid.querySelectorAll('.btn-pay').forEach(btn =>
      btn.addEventListener('click', () => openPayModal(btn.dataset.id)));

    grid.querySelectorAll('.btn-edit').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id)));

    grid.querySelectorAll('.btn-del').forEach(btn =>
      btn.addEventListener('click', () => {
        const loan = DB.getById(btn.dataset.id);
        if (confirm('Видалити кредит "' + loan?.name + '"?')) {
          DB.remove(btn.dataset.id);
          init();
          showToast('Кредит видалено', 'success');
        }
      }));
  }

  function sortLoans(loans, by) {
    return [...loans].sort((a, b) => {
      if (by === 'date')    return new Date(a.nextPaymentDate) - new Date(b.nextPaymentDate);
      if (by === 'balance') return b.currentBalance - a.currentBalance;
      if (by === 'name')    return a.name.localeCompare(b.name, 'uk');
      if (by === 'rate')    return b.rate - a.rate;
      return 0;
    });
  }

  function loanCardHTML(loan) {
    const today = new Date(); today.setHours(0,0,0,0);
    const nextDate = new Date(loan.nextPaymentDate); nextDate.setHours(0,0,0,0);
    const isOverdue = nextDate < today && !loan.closed;
    const cat = CATS[loan.category] || CATS.other;
    const pct = loan.originalAmount > 0
      ? ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100).toFixed(1) : 0;
    const days = Calc.daysUntil(loan.nextPaymentDate);
    const daysLabel = days === null ? '—'
      : days < 0  ? `прострочено ${Math.abs(days)} дн.`
      : days === 0 ? 'сьогодні!'
      : `через ${days} дн.`;
    const pfClass = pct > 70 ? 'pf-green' : pct > 40 ? 'pf-blue' : 'pf-amber';

    return `<div class="loan-card ${isOverdue ? 'overdue' : ''}">
      <div class="card-head">
        <div>
          <div class="card-badge ${isOverdue ? 'badge-overdue' : cat.cls}">${isOverdue ? '⚠️ Прострочено' : cat.icon + ' ' + cat.label}</div>
          <div class="card-name">${loan.name}</div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="card-menu-btn btn-edit" data-id="${loan.id}" title="Редагувати">✏️</button>
          <button class="card-menu-btn btn-del" data-id="${loan.id}" title="Видалити">🗑</button>
        </div>
      </div>
      <div class="balance-row">
        <span class="balance-main">${Calc.formatMoney(loan.currentBalance)}</span>
        <span class="balance-orig">з ${Calc.formatMoney(loan.originalAmount)}</span>
      </div>
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill ${pfClass}" style="width:${pct}%"></div></div>
        <div class="progress-labels">
          <span>${pct}% погашено</span>
          <span>${daysLabel}</span>
        </div>
      </div>
      <div class="card-details">
        <div><div class="detail-label">Щомісяця</div><div class="detail-val">${Calc.formatMoney(loan.monthlyPayment)}</div></div>
        <div><div class="detail-label">Ставка</div><div class="detail-val">${loan.loanType === 'installment' ? (loan.commissionRate || (loan.rate/12).toFixed(1)) + '% / міс.' : loan.rate + '% річних'}</div></div>
        <div><div class="detail-label">Наступний платіж</div><div class="detail-val ${isOverdue ? 'danger' : ''}">${Calc.formatDate(loan.nextPaymentDate)}</div></div>
        <div><div class="detail-label">Банк</div><div class="detail-val">${loan.bank || '—'}</div></div>
      </div>
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm btn-details" data-id="${loan.id}">Деталі</button>
        <button class="btn btn-primary btn-sm btn-pay" data-id="${loan.id}">💳 Внести</button>
      </div>
    </div>`;
  }

  // ─── UPCOMING ──────────────────────────────
  function renderUpcoming() {
    const list = document.getElementById('upcoming-list');
    const upcoming = DB.upcomingPayments(5);
    if (!upcoming.length) {
      list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px 0">Немає кредитів</div>';
      return;
    }
    list.innerHTML = upcoming.map(loan => {
      const days = Calc.daysUntil(loan.nextPaymentDate);
      const cat = CATS[loan.category] || CATS.other;
      let pillCls = 'pay-pill-ok', pillLabel = days + ' дн.';
      if (days < 0)      { pillCls = 'pay-pill-over'; pillLabel = 'Прострочено'; }
      else if (days <= 7){ pillCls = 'pay-pill-soon'; pillLabel = days === 0 ? 'Сьогодні' : days + ' дн.'; }
      return `<div class="payment-row">
        <div class="pay-icon" style="background:var(--surface2)">${cat.icon}</div>
        <div>
          <div class="pay-name">${loan.name}</div>
          <div class="pay-date">${Calc.formatDate(loan.nextPaymentDate)}</div>
        </div>
        <div class="pay-amount">${Calc.formatMoney(loan.monthlyPayment)}</div>
        <span class="pay-pill ${pillCls}">${pillLabel}</span>
      </div>`;
    }).join('');
  }

  // ─── NAV & SORT ────────────────────────────
  function bindNav() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeFilter = tab.dataset.filter;
        renderLoans();
      });
    });
  }

  function bindSort() {
    document.getElementById('sort-select')?.addEventListener('change', e => {
      activeSort = e.target.value;
      renderLoans();
    });
  }

  // ─── PAY MODAL ─────────────────────────────
  function bindPayModal() {
    document.getElementById('pay-modal')?.addEventListener('click', e => {
      if (e.target.id === 'pay-modal') closePayModal();
    });
    document.getElementById('pay-cancel')?.addEventListener('click', closePayModal);
    document.getElementById('pay-confirm')?.addEventListener('click', () => {
      const id = document.getElementById('pay-confirm').dataset.id;
      const amount = parseFloat(document.getElementById('pay-amount-input').value);
      const date = document.getElementById('pay-date-input').value;
      const note = document.getElementById('pay-note-input').value;
      if (!amount || amount <= 0) { showToast('Введіть суму платежу', 'error'); return; }
      DB.addPayment(id, { amount, date, note });
      closePayModal();
      init();
      showToast('Платіж внесено ✓', 'success');
    });
  }

  function openPayModal(loanId) {
    const loan = DB.getById(loanId);
    if (!loan) return;
    document.getElementById('pay-modal-name').textContent = loan.name;
    document.getElementById('pay-amount-input').value = loan.monthlyPayment;
    document.getElementById('pay-date-input').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pay-note-input').value = '';
    document.getElementById('pay-confirm').dataset.id = loanId;
    document.getElementById('pay-modal').classList.add('open');
  }

  function closePayModal() {
    document.getElementById('pay-modal').classList.remove('open');
  }

  // ─── EDIT MODAL ────────────────────────────
  function bindEditModal() {
    document.getElementById('edit-modal')?.addEventListener('click', e => {
      if (e.target.id === 'edit-modal') closeEditModal();
    });
    document.getElementById('edit-cancel')?.addEventListener('click', closeEditModal);
    document.getElementById('edit-confirm')?.addEventListener('click', () => {
      if (!editingId) return;
      DB.update(editingId, {
        name:            document.getElementById('edit-name').value.trim(),
        currentBalance:  parseFloat(document.getElementById('edit-balance').value),
        monthlyPayment:  parseFloat(document.getElementById('edit-payment').value),
        rate:            parseFloat(document.getElementById('edit-rate').value),
        rateType:        document.getElementById('edit-rate-type').value,
        nextPaymentDate: document.getElementById('edit-date').value,
        comment:         document.getElementById('edit-comment').value.trim(),
      });
      closeEditModal();
      init();
      showToast('Кредит оновлено ✓', 'success');
    });
  }

  function openEditModal(loanId) {
    const loan = DB.getById(loanId);
    if (!loan) return;
    editingId = loanId;
    document.getElementById('edit-name').value        = loan.name;
    document.getElementById('edit-balance').value     = loan.currentBalance;
    document.getElementById('edit-payment').value     = loan.monthlyPayment;
    document.getElementById('edit-rate').value        = loan.rate;
    document.getElementById('edit-rate-type').value   = loan.rateType || 'annual';
    document.getElementById('edit-date').value        = loan.nextPaymentDate;
    document.getElementById('edit-comment').value     = loan.comment || '';
    document.getElementById('edit-modal').classList.add('open');
  }

  function closeEditModal() {
    editingId = null;
    document.getElementById('edit-modal').classList.remove('open');
  }

  init();
});

function showToast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
