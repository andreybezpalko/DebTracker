// add.js — логіка форми додавання кредиту

document.addEventListener('DOMContentLoaded', () => {
  let loanType = 'annuity';

  // Дефолтна дата — наступний місяць 15-го
  const defDate = new Date();
  defDate.setMonth(defDate.getMonth() + 1);
  defDate.setDate(15);
  document.getElementById('f-date').value = defDate.toISOString().slice(0, 10);

  // Тип кредиту toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loanType = btn.dataset.type;
      updateCalcHint();
    });
  });

  // Авто-розрахунок платежу
  ['f-original', 'f-balance', 'f-rate', 'f-rate-type', 'f-months'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalcHint);
  });

  function updateCalcHint() {
    const P = parseFloat(document.getElementById('f-balance').value)
           || parseFloat(document.getElementById('f-original').value)
           || 0;
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
      const interest = P * r;
      const principal = P / n;
      M = principal + interest;
      desc.textContent = `Перший платіж (класичний)`;
    }

    hint.textContent = '₴\u00a0' + Math.round(M).toLocaleString('uk-UA') + ' / міс.';
  }

  // Збереження
  document.getElementById('btn-save').addEventListener('click', () => {
    const name = document.getElementById('f-name').value.trim();
    const original = parseFloat(document.getElementById('f-original').value);
    const balance = parseFloat(document.getElementById('f-balance').value) || original;
    const rate = parseFloat(document.getElementById('f-rate').value);
    const rateType = document.getElementById('f-rate-type').value;
    const months = parseInt(document.getElementById('f-months').value);
    const paymentRaw = parseFloat(document.getElementById('f-payment').value);
    const nextPaymentDate = document.getElementById('f-date').value;
    const paymentDay = parseInt(document.getElementById('f-day').value);
    const category = document.getElementById('f-category').value;
    const bank = document.getElementById('f-bank').value.trim();
    const comment = document.getElementById('f-comment').value.trim();
    const remind = document.getElementById('f-remind').checked;

    // Валідація
    if (!name) { showErr('Введіть назву кредиту'); return; }
    if (!original || original <= 0) { showErr('Введіть початкову суму'); return; }
    if (!rate && rate !== 0) { showErr('Введіть відсоткову ставку'); return; }
    if (!months || months < 1) { showErr('Введіть термін кредиту'); return; }
    if (!nextPaymentDate) { showErr('Введіть дату першого платежу'); return; }

    // Розрахувати платіж якщо не задано
    let monthlyPayment = paymentRaw;
    if (!monthlyPayment) {
      const r = rateType === 'monthly' ? rate / 100 : rate / 12 / 100;
      monthlyPayment = parseFloat(Calc.annuityPayment(balance || original, r, months).toFixed(2));
    }

    DB.create({
      name, originalAmount: original, currentBalance: balance || original,
      rate, rateType, monthlyPayment, loanType, totalMonths: months,
      nextPaymentDate, paymentDay, category, bank, comment, remind
    });

    window.location.href = 'index.html';
  });

  function showErr(msg) {
    const t = document.createElement('div');
    t.className = 'toast error';
    t.textContent = '⚠️ ' + msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }
});

// Prefill з калькулятора розстрочки
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
