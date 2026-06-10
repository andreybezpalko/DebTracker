// calc.js — фінансові розрахунки

const Calc = (() => {

  function monthlyRate(loan) {
    return loan.rateType === 'monthly' ? loan.rate / 100 : loan.rate / 12 / 100;
  }

  function annuityPayment(principal, r, n) {
    if (r === 0) return principal / n;
    return principal * r / (1 - Math.pow(1 + r, -n));
  }

  function monthsLeft(balance, r, payment) {
    if (r === 0) return Math.ceil(balance / payment);
    if (payment <= balance * r) return 999;
    return Math.ceil(-Math.log(1 - balance * r / payment) / Math.log(1 + r));
  }

  // Платіж для розстрочки
  function installmentPayment(originalAmount, commissionPct, months) {
    const body       = originalAmount / months;
    const commission = originalAmount * commissionPct / 100;
    return parseFloat((body + commission).toFixed(2));
  }

  function generateSchedule(loan) {
    const schedule = [];
    let balance = parseFloat(loan.currentBalance);
    let date    = new Date(loan.nextPaymentDate);
    const today = new Date(); today.setHours(0,0,0,0);
    let month   = 1;

    const isInstallment = loan.loanType === 'installment';
    const r = monthlyRate(loan);

    // Для розстрочки — фіксоване тіло і фіксована комісія з початкової суми
    const totalMonthsOrig  = loan.totalMonths || 12;
    const bodyPerMonth     = isInstallment
      ? parseFloat((loan.originalAmount / totalMonthsOrig).toFixed(2)) : 0;
    const commissionFixed  = isInstallment
      ? parseFloat((loan.monthlyPayment - bodyPerMonth).toFixed(2)) : 0;

    // Скільки місяців залишилось
    const paidCount       = (loan.payments || []).length;
    const remainMonths    = isInstallment ? totalMonthsOrig - paidCount : 9999;

    while (balance > 0.01 && month <= (isInstallment ? remainMonths : 600)) {
      let principal, interest, actualPayment;

      if (isInstallment) {
        principal     = parseFloat(Math.min(bodyPerMonth, balance).toFixed(2));
        interest      = commissionFixed;
        actualPayment = parseFloat((principal + interest).toFixed(2));

      } else if (loan.loanType === 'classic') {
        const tm  = loan.totalMonths || monthsLeft(loan.currentBalance, r, loan.monthlyPayment);
        principal = parseFloat((loan.originalAmount / tm).toFixed(2));
        interest  = parseFloat((balance * r).toFixed(2));
        if (balance - principal < 0.5) principal = balance;
        actualPayment = parseFloat((principal + interest).toFixed(2));

      } else {
        // ануїтет
        interest      = parseFloat((balance * r).toFixed(2));
        actualPayment = parseFloat(Math.min(loan.monthlyPayment, balance + interest).toFixed(2));
        principal     = parseFloat((actualPayment - interest).toFixed(2));
        if (balance - principal < 0.5) { principal = balance; actualPayment = parseFloat((principal + interest).toFixed(2)); }
      }

      balance = parseFloat((balance - principal).toFixed(2));
      if (balance < 0) balance = 0;

      const rowDate = new Date(date);
      const isPaid  = (loan.payments || []).some(p => {
        const pd = new Date(p.date);
        return pd.getFullYear() === rowDate.getFullYear() && pd.getMonth() === rowDate.getMonth();
      });

      let status;
      if (isPaid) status = 'paid';
      else {
        const isOverdue = rowDate < today;
        const isCurrent = rowDate.getFullYear() === today.getFullYear() && rowDate.getMonth() === today.getMonth();
        status = isOverdue ? 'overdue' : isCurrent ? 'current' : 'future';
      }

      schedule.push({ month, date: rowDate.toISOString().slice(0,10), payment: actualPayment, principal, interest, balance, status });
      month++;
      date.setMonth(date.getMonth() + 1);
    }

    return schedule;
  }

  function loanStats(loan) {
    const schedule    = generateSchedule(loan);
    const paidRows    = schedule.filter(r => r.status === 'paid');
    const futureRows  = schedule.filter(r => r.status !== 'paid');

    const paidInterest   = paidRows.reduce((s,r) => s + r.interest, 0);
    const paidPrincipal  = paidRows.reduce((s,r) => s + r.principal, 0);
    const futureInterest = futureRows.reduce((s,r) => s + r.interest, 0);
    const totalInterest  = schedule.reduce((s,r) => s + r.interest, 0);
    const percentPaid    = loan.originalAmount > 0
      ? ((loan.originalAmount - loan.currentBalance) / loan.originalAmount * 100) : 0;

    const lastRow = schedule[schedule.length - 1];
    return {
      paidInterest:   parseFloat(paidInterest.toFixed(2)),
      paidPrincipal:  parseFloat(paidPrincipal.toFixed(2)),
      futureInterest: parseFloat(futureInterest.toFixed(2)),
      totalInterest:  parseFloat(totalInterest.toFixed(2)),
      percentPaid:    parseFloat(percentPaid.toFixed(1)),
      closingDate:    lastRow ? lastRow.date : null,
      monthsRemaining: futureRows.length,
      schedule
    };
  }

  function formatMoney(n) {
    return '₴\u00a0' + parseFloat(n).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function formatMonthYear(isoStr) {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
  }

  function daysUntil(isoStr) {
    if (!isoStr) return null;
    const target = new Date(isoStr); target.setHours(0,0,0,0);
    const today  = new Date();       today.setHours(0,0,0,0);
    return Math.round((target - today) / 86400000);
  }

  return { monthlyRate, annuityPayment, monthsLeft, installmentPayment, generateSchedule, loanStats, formatMoney, formatDate, formatMonthYear, daysUntil };
})();
