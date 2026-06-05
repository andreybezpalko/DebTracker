// data.js — робота з localStorage

const DB = (() => {
  const LOANS_KEY = 'lt_loans';

  function genId() {
    return 'loan_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  }

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(LOANS_KEY) || '[]');
    } catch { return []; }
  }

  function getById(id) {
    return getAll().find(l => l.id === id) || null;
  }

  function save(loan) {
    const loans = getAll();
    const idx = loans.findIndex(l => l.id === loan.id);
    if (idx >= 0) loans[idx] = loan;
    else loans.push(loan);
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
    return loan;
  }

  function create(data) {
    const loan = {
      id: genId(),
      name: data.name || 'Кредит',
      originalAmount: parseFloat(data.originalAmount) || 0,
      currentBalance: parseFloat(data.currentBalance || data.originalAmount) || 0,
      rate: parseFloat(data.rate) || 0,
      rateType: data.rateType || 'annual',
      monthlyPayment: parseFloat(data.monthlyPayment) || 0,
      loanType: data.loanType || 'annuity',
      category: data.category || 'other',
      bank: data.bank || '',
      nextPaymentDate: data.nextPaymentDate || '',
      paymentDay: parseInt(data.paymentDay) || 15,
      comment: data.comment || '',
      remind: data.remind !== false,
      payments: [],
      closed: false,
      createdAt: new Date().toISOString()
    };
    // розрахувати щомісячний платіж якщо не заданий
    if (!loan.monthlyPayment && loan.currentBalance && loan.rate) {
      const r = Calc.monthlyRate(loan);
      const n = data.totalMonths || 36;
      loan.monthlyPayment = parseFloat(Calc.annuityPayment(loan.currentBalance, r, n).toFixed(2));
      loan.totalMonths = n;
    }
    return save(loan);
  }

  function update(id, changes) {
    const loan = getById(id);
    if (!loan) return null;
    const updated = { ...loan, ...changes };
    return save(updated);
  }

  function remove(id) {
    const loans = getAll().filter(l => l.id !== id);
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
  }

  // Додати платіж до кредиту
  function addPayment(loanId, { amount, date, note }) {
    const loan = getById(loanId);
    if (!loan) return null;
    const payment = {
      id: genId(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().slice(0, 10),
      note: note || ''
    };
    loan.payments = loan.payments || [];
    loan.payments.push(payment);
    // оновити залишок
    loan.currentBalance = parseFloat((loan.currentBalance - payment.amount).toFixed(2));
    if (loan.currentBalance < 0) loan.currentBalance = 0;
    // оновити дату наступного платежу
    const nextDate = new Date(loan.nextPaymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    loan.nextPaymentDate = nextDate.toISOString().slice(0, 10);
    // перевірити чи закрито
    if (loan.currentBalance <= 0) loan.closed = true;
    return save(loan);
  }

  // Загальна статистика по всіх кредитах
  function summary() {
    const loans = getAll().filter(l => !l.closed);
    const totalBalance = loans.reduce((s, l) => s + l.currentBalance, 0);
    const totalMonthly = loans.reduce((s, l) => s + l.monthlyPayment, 0);
    const today = new Date();
    const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const thisMonth = loans.filter(l => {
      const d = new Date(l.nextPaymentDate);
      return d <= eom;
    });
    const thisMonthTotal = thisMonth.reduce((s, l) => s + l.monthlyPayment, 0);
    const overdueLoans = loans.filter(l => {
      const d = new Date(l.nextPaymentDate);
      d.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return d < today;
    });

    return {
      count: loans.length,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      totalMonthly: parseFloat(totalMonthly.toFixed(2)),
      thisMonthTotal: parseFloat(thisMonthTotal.toFixed(2)),
      thisMonthCount: thisMonth.length,
      overdueCount: overdueLoans.length
    };
  }

  // Найближчі платежі (відсортовані за датою)
  function upcomingPayments(limit = 5) {
    const loans = getAll().filter(l => !l.closed);
    return loans
      .map(l => ({ ...l, _days: Calc.daysUntil(l.nextPaymentDate) }))
      .sort((a, b) => a._days - b._days)
      .slice(0, limit);
  }

  return { getAll, getById, create, update, remove, addPayment, summary, upcomingPayments };
})();
