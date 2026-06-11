// add.js — логіка форми додавання кредиту

document.addEventListener('DOMContentLoaded', () => {
  let loanType = 'classic';

  const HINTS = {
    annuity:     'Рівний платіж, відсотки нараховуються на залишок боргу',
    classic:     'Тіло рівними частинами, відсотки зменшуються щомісяця',
    installment: 'Фіксована комісія банку щомісяця від початкової суми'
  };

  // Дефолтна дата — наступний місяць
  const defDate = new Date();
  defDate.setMonth(defDate.getMonth() + 1);
  defDate.setDate(15);
  document.getElementById('f-date').value = defDate.toISOString().slice(0, 10);

  // ─── ПЕРЕМИКАЧ ТИПУ ──────────────────────────
  document.querySelectorAll('.toggle-btn[data-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn[data-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loanType = btn.dataset.type;
      document.getElementById('type-hint-text').textContent = HINTS[loanType];
      document.getElementById('block-standard').style.display   = loanType !== 'installment' ? '' : 'none';
      document.getElementById('block-installment').style.display = loanType === 'installment' ? '' : 'none';
      updateCalc();
    });
  });

  // ─── АВТО-РОЗРАХУНОК АНУЇТЕТ/КЛАСИЧНИЙ ───────
  ['f-original','f-balance','f-rate','f-rate-type','f-months'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalc);
  });

  function updateCalc() {
    if (loanType === 'installment') { updateInstallmentCalc(); return; }
    const P = parseFloat(document.getElementById('f-balance').value)
           || parseFloat(document.getElementById('f-original').value) || 0;
    const rRaw = parseFloat(document.getElementById('f-rate').value) || 0;
    const rType = document.getElementById('f-rate-type').value;
    const n = parseInt(document.getElementById('f-months').value) || 0;
    const r = rType === 'monthly' ? rRaw / 100 : rRaw / 12 / 100;
    const hint = document.getElementById('calc-hint-value');
    const desc = document.getElementById('calc-hint-desc');
    if (!P || !n) { hint.textContent = '—'; desc.textContent = 'Заповніть суму і термін'; return; }
    let M;
    if (loanType === 'annuity') {
      M = Calc.annuityPayment(P, r, n);
      desc.textContent = `₴ ${Math.round(P).toLocaleString('uk-UA')} · ${rRaw}% · ${n} міс.`;
    } else {
      M = P / n + P * r;
      desc.textContent = `Перший платіж (класичний, зменшується)`;
    }
    hint.textContent = '₴\u00a0' + Math.round(M).toLocaleString('uk-UA') + ' / міс.';
  }

  // ─── АВТО-РОЗРАХУНОК РОЗСТРОЧКИ ──────────────
  ['i-original','i-balance','i-months-total','i-paid','i-commission','i-payment-manual'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateInstallmentCalc);
  });

  function updateInstallmentCalc() {
    const original    = parseFloat(document.getElementById('i-original').value) || 0;
    const paidMonths  = parseInt(document.getElementById('i-paid').value) || 0;
    const totalMonths = parseInt(document.getElementById('i-months-total').value) || 0;
    const commission  = parseFloat(document.getElementById('i-commission').value) || 1.9;
    const manualPay   = parseFloat(document.getElementById('i-payment-manual').value) || 0;

    if (!original || !totalMonths) {
      document.getElementById('i-hint-payment').textContent = '—';
      document.getElementById('i-hint-body').textContent = '—';
      document.getElementById('i-hint-commission').textContent = '—';
      document.getElementById('i-hint-overpay').textContent = '—';
      document.getElementById('i-hint-irr').textContent = '—';
      return;
    }

    const remainingMonths = totalMonths - paidMonths;
    const bodyPerMonth    = original / totalMonths;                  // тіло щомісяця
    const commissionAmt   = original * commission / 100;            // комісія щомісяця
    const payment         = manualPay || (bodyPerMonth + commissionAmt);
    const remainingBalance = bodyPerMonth * remainingMonths;        // залишок тіла
    const totalOverpay    = commissionAmt * totalMonths;
    const overpayPct      = (totalOverpay / original * 100).toFixed(1);

    // РРПС
    const irr = calcIRR(original, payment, totalMonths);
    const irrAnnual = (irr * 12 * 100).toFixed(1);

    document.getElementById('i-hint-payment').textContent =
      '₴\u00a0' + payment.toLocaleString('uk-UA', {minimumFractionDigits:2, maximumFractionDigits:2});
    document.getElementById('i-hint-body').textContent =
      `Тіло: ₴ ${bodyPerMonth.toFixed(2)} / міс.`;
    document.getElementById('i-hint-commission').textContent =
      `Комісія: ₴ ${commissionAmt.toFixed(2)} / міс. (${commission}% від ₴ ${original.toLocaleString('uk-UA')})`;
    document.getElementById('i-hint-overpay').textContent =
      `Переплата: ₴ ${totalOverpay.toFixed(2)} (${overpayPct}% від суми)`;
    document.getElementById('i-hint-irr').textContent =
      `РРПС ~${irrAnnual}% річних`;

    // Автозаповнити залишок якщо є сплачені платежі
    if (paidMonths > 0 && !document.getElementById('i-balance').value) {
      document.getElementById('i-balance').value = remainingBalance.toFixed(2);
    }
  }

  function calcIRR(pv, pmt, n) {
    let r = 0.03;
    for (let i = 0; i < 100; i++) {
      const f  = pv - pmt * (1 - Math.pow(1 + r, -n)) / r;
      const df = pmt * ((1 - Math.pow(1 + r, -n)) / (r * r) - n * Math.pow(1 + r, -n - 1) / r);
      const rNew = r - f / df;
      if (Math.abs(rNew - r) < 1e-8) return rNew;
      r = rNew;
    }
    return r;
  }

  // ─── ЗБЕРЕЖЕННЯ ──────────────────────────────
  document.getElementById('btn-save').addEventListener('click', () => {
    if (loanType === 'installment') {
      saveInstallment();
    } else {
      saveStandard();
    }
  });

  function saveStandard() {
    const name     = document.getElementById('f-name').value.trim();
    const original = parseFloat(document.getElementById('f-original').value);
    const balance  = parseFloat(document.getElementById('f-balance').value) || original;
    const rate     = parseFloat(document.getElementById('f-rate').value);
    const rateType = document.getElementById('f-rate-type').value;
    const months   = parseInt(document.getElementById('f-months').value);
    const payRaw   = parseFloat(document.getElementById('f-payment').value);

    if (!name)    { showErr('Введіть назву'); return; }
    if (!original){ showErr('Введіть початкову суму'); return; }
    if (!months)  { showErr('Введіть термін'); return; }

    let monthlyPayment = payRaw;
    if (!monthlyPayment) {
      const r = rateType === 'monthly' ? rate / 100 : rate / 12 / 100;
      monthlyPayment = parseFloat(Calc.annuityPayment(balance || original, r, months).toFixed(2));
    }

    DB.create({
      name, originalAmount: original, currentBalance: balance || original,
      rate, rateType, monthlyPayment, loanType, totalMonths: months,
      nextPaymentDate: document.getElementById('f-date').value,
      paymentDay: parseInt(document.getElementById('f-day').value),
      category: document.getElementById('f-category').value,
      bank: document.getElementById('f-bank').value.trim(),
      comment: document.getElementById('f-comment').value.trim(),
      remind: document.getElementById('f-remind').checked
    });
    window.location.href = 'index.html';
  }

  function saveInstallment() {
    const name        = document.getElementById('f-name').value.trim();
    const original    = parseFloat(document.getElementById('i-original').value);
    const paidMonths  = parseInt(document.getElementById('i-paid').value) || 0;
    const totalMonths = parseInt(document.getElementById('i-months-total').value);
    const commission  = parseFloat(document.getElementById('i-commission').value) || 1.9;
    const manualPay   = parseFloat(document.getElementById('i-payment-manual').value) || 0;

    if (!name)        { showErr('Введіть назву'); return; }
    if (!original)    { showErr('Введіть суму розстрочки'); return; }
    if (!totalMonths) { showErr('Введіть термін'); return; }

    const bodyPerMonth  = original / totalMonths;
    const commissionAmt = original * commission / 100;
    const payment       = manualPay || parseFloat((bodyPerMonth + commissionAmt).toFixed(2));

    // Залишок = тіло × місяців що лишились
    const remainingMonths  = totalMonths - paidMonths;
    const remainingBalance = parseFloat(document.getElementById('i-balance').value)
                          || parseFloat((bodyPerMonth * remainingMonths).toFixed(2));

    const totalOverpay = commissionAmt * totalMonths;
    const overpayPct   = (totalOverpay / original * 100).toFixed(1);

    DB.create({
      name,
      originalAmount:  original,
      currentBalance:  remainingBalance,
      rate:            commission * 12,       // номінальна річна для відображення
      rateType:        'annual',
      monthlyPayment:  payment,
      loanType:        'installment',
      totalMonths,
      commissionRate:  commission,            // зберігаємо реальну ставку
      nextPaymentDate: document.getElementById('f-date').value,
      paymentDay:      parseInt(document.getElementById('f-day').value),
      category:        document.getElementById('f-category').value,
      bank:            document.getElementById('f-bank').value.trim(),
      comment:         document.getElementById('f-comment').value.trim()
                       || `Комісія ${commission}%/міс. від суми. Переплата ₴${totalOverpay.toFixed(2)} (${overpayPct}%)`,
      remind:          document.getElementById('f-remind').checked
    });
    window.location.href = 'index.html';
  }

  function showErr(msg) {
    const t = document.createElement('div');
    t.className = 'toast error';
    t.textContent = '⚠️ ' + msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  // ─── PREFILL З КАЛЬКУЛЯТОРА ───────────────────
  (function() {
    const raw = sessionStorage.getItem('prefill');
    if (!raw || !window.location.search.includes('prefill')) return;
    try {
      const d = JSON.parse(raw);
      sessionStorage.removeItem('prefill');
      if (d.name)           document.getElementById('f-name').value      = d.name;
      if (d.originalAmount) document.getElementById('f-original').value  = d.originalAmount;
      if (d.currentBalance) document.getElementById('f-balance').value   = d.currentBalance;
      if (d.rate)           document.getElementById('f-rate').value      = d.rate;
      if (d.monthlyPayment) document.getElementById('f-payment').value   = d.monthlyPayment;
      if (d.totalMonths)    document.getElementById('f-months').value    = d.totalMonths;
      if (d.category)       document.getElementById('f-category').value  = d.category;
      if (d.rateType)       document.getElementById('f-rate-type').value = d.rateType;
    } catch(e) {}
  })();
});
