/**
 * Seed de fornecedores e contas a pagar fake para testes.
 *
 * Como usar:
 * 1. Abra o app em http://localhost:3000
 * 2. DevTools → Console (F12)
 * 3. Execute:
 *    fetch('/scripts/seed-payables.js').then(r=>r.text()).then(eval)
 *
 * Alternativa na raiz do projeto:
 *   make seed-payables
 */
(function seedPayables() {
  const SUPPLIERS_KEY = "restaurant-suppliers";
  const PAYABLES_KEY = "restaurant-payables";
  const SUPPLIERS_EVENT = "restaurant-suppliers-change";
  const PAYABLES_EVENT = "restaurant-payables-change";

  function dateKeyFromDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function daysFromToday(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return dateKeyFromDate(date);
  }

  function monthsFromToday(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return dateKeyFromDate(date);
  }

  const suppliers = [
    {
      id: "supplier-edp",
      name: "EDP Comercial",
      contactName: "Linha de apoio",
      email: "clientes@edp.pt",
      phone: "808 505 505",
      notes: "Energia elétrica",
      createdAt: "2026-01-10T09:00:00.000Z",
    },
    {
      id: "supplier-agua",
      name: "Águas do Litoral",
      contactName: "Atendimento",
      email: "faturacao@aguaslitoral.pt",
      phone: "800 200 300",
      createdAt: "2026-01-10T09:00:00.000Z",
    },
    {
      id: "supplier-contabilista",
      name: "Silva & Associados",
      contactName: "Dr. Ricardo Silva",
      email: "ricardo@silvaassociados.pt",
      phone: "+351 912 345 678",
      notes: "Contabilidade e impostos",
      createdAt: "2026-01-15T10:00:00.000Z",
    },
    {
      id: "supplier-imobiliaria",
      name: "Imobiliária Centro",
      contactName: "Ana Ferreira",
      email: "ana@imobcentro.pt",
      phone: "+351 213 456 789",
      notes: "Aluguel do espaço",
      createdAt: "2026-02-01T11:00:00.000Z",
    },
    {
      id: "supplier-nos",
      name: "NOS Comunicações",
      email: "empresas@nos.pt",
      phone: "1699",
      notes: "Internet e telefone",
      createdAt: "2026-02-01T11:00:00.000Z",
    },
    {
      id: "supplier-galp",
      name: "Galp Gás Natural",
      phone: "808 280 280",
      createdAt: "2026-03-01T08:00:00.000Z",
    },
  ];

  const payables = [
    {
      id: "payable-seed-luz",
      categoryId: "utilities",
      description: "Conta de luz",
      supplierId: "supplier-edp",
      amount: 284.5,
      dueDate: daysFromToday(5),
      recurrence: "monthly",
      status: "pending",
      notes: "Referência multibanco enviada por e-mail",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-agua",
      categoryId: "utilities",
      description: "Conta de água",
      supplierId: "supplier-agua",
      amount: 96.3,
      dueDate: daysFromToday(-4),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-contabilista",
      categoryId: "professional-services",
      description: "Honorários contabilista",
      supplierId: "supplier-contabilista",
      amount: 350,
      dueDate: daysFromToday(-10),
      recurrence: "monthly",
      status: "paid",
      paidAt: `${daysFromToday(-8)}T14:30:00.000Z`,
      paidAmount: 350,
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-aluguel",
      categoryId: "rent",
      description: "Aluguel do restaurante",
      supplierId: "supplier-imobiliaria",
      amount: 2200,
      dueDate: daysFromToday(12),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-internet",
      categoryId: "telecom",
      description: "Internet empresarial",
      supplierId: "supplier-nos",
      amount: 49.99,
      dueDate: daysFromToday(2),
      recurrence: "monthly",
      status: "pending",
      createdAt: "2026-06-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-gas",
      categoryId: "utilities",
      description: "Gás canalizado",
      supplierId: "supplier-galp",
      amount: 178.4,
      dueDate: daysFromToday(-15),
      recurrence: "quarterly",
      status: "pending",
      createdAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-seguro",
      categoryId: "other",
      description: "Seguro multirriscos",
      supplierId: "supplier-imobiliaria",
      amount: 890,
      dueDate: monthsFromToday(2),
      recurrence: "yearly",
      status: "pending",
      createdAt: "2026-01-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-taxa",
      categoryId: "taxes",
      description: "Taxa de ocupação de via pública",
      amount: 420,
      dueDate: daysFromToday(-20),
      recurrence: "yearly",
      status: "paid",
      paidAt: `${daysFromToday(-18)}T09:15:00.000Z`,
      paidAmount: 420,
      createdAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "payable-seed-fornecedor",
      categoryId: "suppliers",
      description: "Compra de embalagens",
      amount: 312.75,
      dueDate: daysFromToday(7),
      recurrence: "none",
      status: "pending",
      notes: "Pagamento único — pedido #4521",
      createdAt: "2026-06-20T10:00:00.000Z",
    },
  ];

  localStorage.setItem(SUPPLIERS_KEY, JSON.stringify(suppliers));
  localStorage.setItem(PAYABLES_KEY, JSON.stringify(payables));
  window.dispatchEvent(new Event(SUPPLIERS_EVENT));
  window.dispatchEvent(new Event(PAYABLES_EVENT));

  console.log(
    `[seed-payables] ${suppliers.length} fornecedores e ${payables.length} contas carregadas.`,
  );
})();
