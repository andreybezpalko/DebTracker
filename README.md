# 💳 Loan Tracker

Локальний трекер залишкових виплат по кредитах. Працює в браузері, не потребує сервера. Дані зберігаються в `localStorage`.

## Запуск

Просто відкрий `index.html` у браузері.

Або через GitHub Pages — посилання типу `https://твій-нікнейм.github.io/loan-tracker/`

## Функції

- Додавання кредитів (ануїтет / класичний)
- Автоматичний розрахунок графіку платежів
- Прогрес погашення з відсотками
- Внесення фактичних платежів
- Статус: сплачено / поточний / майбутній / прострочено
- Найближчі платежі на дашборді

## Структура

```
loan-tracker/
├── index.html       ← дашборд
├── loan.html        ← деталі кредиту
├── add.html         ← додавання кредиту
├── styles/
│   └── main.css
└── scripts/
    ├── calc.js      ← фінансові розрахунки
    ├── data.js      ← localStorage CRUD
    ├── dashboard.js
    ├── loan-detail.js
    └── add.js
```

## Git workflow

```bash
# Додати зміни
git add .
git commit -m "опис змін"
git push

# Відкотитись на попередню версію
git log --oneline
git revert HEAD
git push
```
