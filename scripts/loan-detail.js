// loan-detail.js — сторінка деталей кредиту

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const loan = id ? DB.getById(id) : null;

  if (!loan) { window.location.href = 'index.html'; return; }

  const PAGE_SIZE = 12;
  let currentPage = 1;
  let schedule = [];
  let stats = {};

  const CATS = {
    auto:'🚗 Авто', phone:'📱 Техніка', home:'🏠 Іпотека',
    shop:'🛒 Споживчий', biz:'💼 Бізнес', other:'📂 Інше'
  };

  function init() {
    const freshLoan = DB.getById(id);
    stats = Calc.loanStats(freshLoan);
    schedule = stats.schedule;
    renderHeader(freshLoan);
    renderOverview(freshLoan, stats);
    renderProgress(freshLoan, stats);
    renderSchedule();
    renderHistory(freshLoan);
    bindTabs();
    bindPayModal(freshLoan);
  }

  function renderHeader(loan) {
    document.getElementById('page-title').textContent = loan.name;
    document.getElementById('header-badge').textContent =
      (CATS[loan.category] || '📂') + ' · ' + loan.rate + '% ' + (loan.rateType === 'monthly' ? 'міс.' : 'річних');
  }

  function renderOverview(loan, stats) {
    const grid = document.getElementById('overview-grid');
    const items = [
      { label: 'Залишок боргу',        value: Calc.formatMoney(loan.currentBalance), cls: 'accent', sub: 'з ' + Calc.formatMoney(loan.originalAmount) },
      { label: 'Щомісячний платіж',    value: Calc.formatMoney(loan.monthlyPayment), sub: 'тіло + відсотки' },
      { label: 'До закриття',          value: stats.monthsRemaining + ' міс.', sub: stats.closingDate ? Calc.formatMonthYear(stats.closingDate) : '—' },
      { label: 'Сплачено (тіло)',       value: Calc.formatMoney(stats.paidPrincipal), cls: 'success', sub: stats.percentPaid + '% від суми' },
      { label: 'Сплачено відсотків',   value: Calc.formatMoney(stats.paidInterest), cls: 'warning' },
      { label: 'Наступний платіж',     value: Calc.formatDate(loan.nextPaymentDate), sub: daysLabel(Calc.daysUntil(loan.nextPaymentDate)) },
    ];
    grid.innerHTML = items.map(i => `
      <div class="ov-card">
        <div class="ov-label">${i.label}</div>
        <div class="ov-value ${i.cls || ''}">${i.value}</div>
        ${i.sub ? `<div class="ov-sub">${i.sub}</div>` : ''}
      </div>`).join('');
  }

  function daysLabel(days) {
    if (days === null) return '';
    if (days < 0) return `⚠️ прострочено ${Math.abs(days)} дн.`;
    if (days === 0) return '🔔 сьогодні!';
    return `через ${days} дн.`;
  }

  function renderProgress(loan, stats) {
    const pct = stats.percentPaid;
    document.getElementById('prog-pct').textContent = pct + '% погашено';
    document.getElementById('prog-fill').style.width = pct + '%';
    const startDate = loan.payments && loan.payments.length
      ? loan.payments[0].date : loan.nextPaymentDate;
    document.getElementById('prog-labels').innerHTML = `
      <span>Початок: ${Calc.formatMonthYear(startDate)}</span>
      <span>Сплачено ${Calc.formatMoney(stats.paidPrincipal + stats.paidInterest)}</span>
      <span>Кінець: ${stats.closingDate ? Calc.formatMonthYear(stats.closingDate) : '—'}</span>`;
  }

  function renderSchedule() {
    const body = document.getElementById('schedule-body');
    const total = schedule.length;
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = schedule.slice(start, start + PAGE_SIZE);

    const STATUS = {
      paid:    '<span class="pill pill-paid">✓ Сплачено</span>',
      current: '<span class="pill pill-current">⏳ Поточний</span>',
      future:  '<span class="pill pill-future">Майбутній</span>',
      overdue: '<span class="pill pill-overdue">⚠️ Прострочено</span>',
    };

    body.innerHTML = page.map(row => `
      <tr class="${row.status === 'current' ? 'row-current' : row.status === 'overdue' ? 'row-overdue' : ''}">
        <td class="td-num">${row.month}</td>
        <td>${Calc.formatDate(row.date)}</td>
        <td class="td-mono">₴ ${row.payment.toLocaleString('uk-UA')}</td>
        <td class="td-mono">${row.principal.toLocaleString('uk-UA')}</td>
        <td class="td-interest">${row.interest.toLocaleString('uk-UA')}</td>
        <td class="td-mono" style="font-weight:500">${row.balance.toLocaleString('uk-UA')}</td>
        <td>${STATUS[row.status] || ''}</td>
      </tr>`).join('');

    document.getElementById('schedule-info').textContent =
      `Показано ${start + 1}–${Math.min(start + PAGE_SIZE, total)} з ${total} платежів`;

    // Пагінація
    const pages = document.getElementById('pages');
    const totalPages = Math.ceil(total / PAGE_SIZE);
    pages.innerHTML = Array.from({ length: totalPages }, (_, i) =>
      `<button class="page-btn ${i + 1 === currentPage ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`
    ).join('');
    pages.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => { currentPage = parseInt(btn.dataset.p); renderSchedule(); });
    });

    // Підсумки
    document.getElementById('sum-total-interest').textContent = Calc.formatMoney(stats.totalInterest);
    document.getElementById('sum-paid-interest').textContent = Calc.formatMoney(stats.paidInterest);
    document.getElementById('sum-future-interest').textContent = Calc.formatMoney(stats.futureInterest);
  }

  function renderHistory(loan) {
    const list = document.getElementById('history-list');
    const payments = (loan.payments || []).slice().reverse();
    if (!payments.length) {
      list.innerHTML = `<div class="empty"><div class="empty-icon">🧾</div>
        <div class="empty-title">Платежів ще немає</div>
        <div class="empty-sub">Внесіть перший платіж через кнопку вгорі</div></div>`;
      return;
    }
    list.innerHTML = payments.map(p => `
      <div class="payment-row">
        <div class="pay-icon" style="background:var(--success-bg)">💚</div>
        <div>
          <div class="pay-name">${Calc.formatMoney(p.amount)}</div>
          <div class="pay-date">${Calc.formatDate(p.date)}${p.note ? ' · ' + p.note : ''}</div>
        </div>
      </div>`).join('');
  }

  function bindTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-schedule').style.display = tab.dataset.tab === 'schedule' ? '' : 'none';
        document.getElementById('tab-history').style.display = tab.dataset.tab === 'history' ? '' : 'none';
      });
    });
  }

  function bindPayModal(loan) {
    document.getElementById('pay-amount').value = loan.monthlyPayment;
    document.getElementById('pay-date').value = new Date().toISOString().slice(0, 10);

    const openModal = () => document.getElementById('pay-modal').classList.add('open');
    const closeModal = () => document.getElementById('pay-modal').classList.remove('open');

    document.getElementById('btn-pay-header').addEventListener('click', openModal);
    document.getElementById('pay-cancel').addEventListener('click', closeModal);
    document.getElementById('pay-modal').addEventListener('click', e => { if (e.target.id === 'pay-modal') closeModal(); });

    document.getElementById('pay-confirm').addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('pay-amount').value);
      const date = document.getElementById('pay-date').value;
      const note = document.getElementById('pay-note').value;
      if (!amount || amount <= 0) { showToast('Введіть суму', 'error'); return; }
      DB.addPayment(id, { amount, date, note });
      closeModal();
      init();
      showToast('Платіж внесено ✓', 'success');
    });
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
