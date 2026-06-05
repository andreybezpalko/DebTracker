// calc.js — фінансові розрахунки

const Calc = (() => {

  // Місячна ставка
  function monthlyRate(loan) {
    const r = loan.rateType === 'monthly'
      ? loan.rate / 100
      : loan.rate / 12 / 100;
    return r;
  }

  // Ануїтетний платіж
  function annuityPayment(principal, r, n) {
    if (r === 0) return principal / n;
    return principal * r / (1 - Math.pow(1 + r, -n));
  }

  // Кількість місяців за залишком і платежем
  function monthsLeft(balance, r, payment) {
    if (r === 0) return Math.ceil(balance / payment);
    if (payment <= balance * r) return 999; // нескінченний кредит
    return Math.ceil(-Math.log(1 - balance * r / payment) / Math.log(1 + r));
  }

  // Генерація повного графіку платежів
  function generateSchedule(loan) {
    const r = monthlyRate(loan);
    const schedule = [];
    let balance = loan.currentBalance;
    let date = new Date(loan.nextPaymentDate);
    const payment = loan.monthlyPayment;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let month = 1;

    while (balance > 0.5) {
      const interest = parseFloat((balance * r).toFixed(2));
      let principal, actualPayment;

      if (loan.loanType === 'classic') {
        const totalMonths = loan.totalMonths || monthsLeft(loan.currentBalance, r, payment);
        principal = parseFloat((loan.originalAmount / totalMonths).toFixed(2));
        actualPayment = parseFloat((principal + interest).toFixed(2));
      } else {
        // ануїтет
        actualPayment = parseFloat(Math.min(payment, balance + balance * r).toFixed(2));
        principal = parseFloat((actualPayment - interest).toFixed(2));
      }

      if (balance - principal < 0.5) {
        principal = balance;
        actualPayment = parseFloat((principal + interest).toFixed(2));
      }

      balance = parseFloat((balance - principal).toFixed(2));
      if (balance < 0) balance = 0;

      const rowDate = new Date(date);
      const isPaid = loan.payments && loan.payments.some(p => {
        const pd = new Date(p.date);
        return pd.getFullYear() === rowDate.getFullYear() && pd.getMonth() === rowDate.getMonth();
      });

      let status;
      if (isPaid) {
        status = 'paid';
      } else {
        const isOverdue = rowDate < today && !isPaid;
        const isCurrent = rowDate.getFullYear() === today.getFullYear() && rowDate.getMonth() === today.getMonth();
        if (isOverdue) status = 'overdue';
        else if (isCurrent) status = 'current';
        else status = 'future';
      }

      schedule.push({
        month,
        date: rowDate.toISOString().slice(0, 10),
        payment: actualPayment,
        principal,
        interest,
        balance,
        status
      });

      month++;
      date.setMonth(date.getMonth() + 1);
      if (month > 600) break; // safety cap
    }

    return schedule;
  }

  // Зведена статистика по кредиту
  function loanStats(loan) {
    const schedule = generateSchedule(loan);
    const paidRows = schedule.filter(r => r.status === 'paid');
    const futureRows = schedule.filter(r => r.status !== 'paid');

    const paidInterest = paidRows.reduce((s, r) => s + r.interest, 0);
    const paidPrincipal = paidRows.reduce((s, r) => s + r.principal, 0);
    const futureInterest = futureRows.reduce((s, r) => s + r.interest, 0);
    const totalInterest = schedule.reduce((s, r) => s + r.interest, 0);
    const percentPaid = loan.originalAmount > 0
      ? ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100)
      : 0;

    const lastRow = schedule[schedule.length - 1];
    const closingDate = lastRow ? lastRow.date : null;
    const monthsRemaining = futureRows.length;

    return {
      paidInterest: parseFloat(paidInterest.toFixed(2)),
      paidPrincipal: parseFloat(paidPrincipal.toFixed(2)),
      futureInterest: parseFloat(futureInterest.toFixed(2)),
      totalInterest: parseFloat(totalInterest.toFixed(2)),
      percentPaid: parseFloat(percentPaid.toFixed(1)),
      closingDate,
      monthsRemaining,
      schedule
    };
  }

  // Форматування числа як гривня
  function formatMoney(n) {
    return '₴\u00a0' + Math.round(n).toLocaleString('uk-UA');
  }

  // Форматування дати
  function formatDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatMonthYear(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  }

  // Дні до наступного платежу
  function daysUntil(isoStr) {
    if (!isoStr) return null;
    const target = new Date(isoStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }

  return { monthlyRate, annuityPayment, monthsLeft, generateSchedule, loanStats, formatMoney, formatDate, formatMonthYear, daysUntil };
})();
