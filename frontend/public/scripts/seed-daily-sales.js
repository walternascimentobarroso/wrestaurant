/**
 * Seed de vendas fake para o relatório/gráfico do dia.
 *
 * Como usar:
 * 1. Abra o app em http://localhost:3000
 * 2. DevTools → Console (F12)
 * 3. Cole e execute este arquivo inteiro, ou rode:
 *    copy(await (await fetch('/scripts/seed-daily-sales.js')).text()); paste no console
 *
 * Alternativa rápida na raiz do projeto:
 *   make seed-sales
 */
(function seedDailySales() {
  const STORAGE_KEY = "restaurant-sales";
  const STORAGE_EVENT = "restaurant-sales-change";

  const PRODUCTS = [
    { id: "p1", name: "Bruschetta", price: 24.9 },
    { id: "p4", name: "Salada Caesar", price: 32.0 },
    { id: "p8", name: "Picanha na brasa", price: 89.9 },
    { id: "p11", name: "Penne ao pesto", price: 54.0 },
    { id: "p12", name: "Risoto de camarão", price: 72.0 },
    { id: "p16", name: "Água mineral", price: 6.0 },
    { id: "p17", name: "Refrigerante", price: 8.5 },
    { id: "p19", name: "Cerveja artesanal", price: 18.0 },
    { id: "p21", name: "Vinho tinto (taça)", price: 28.0 },
    { id: "p23", name: "Pudim de leite", price: 18.9 },
    { id: "p25", name: "Petit gateau", price: 26.5 },
  ];

  /** Vendas por hora — pico ao almoço (12–14h) e jantar (19–21h) */
  const HOURLY_PLAN = [
    { hour: 8, count: 1 },
    { hour: 9, count: 2 },
    { hour: 10, count: 2 },
    { hour: 11, count: 3 },
    { hour: 12, count: 4 },
    { hour: 13, count: 6 },
    { hour: 14, count: 5 },
    { hour: 15, count: 2 },
    { hour: 16, count: 2 },
    { hour: 17, count: 3 },
    { hour: 18, count: 4 },
    { hour: 19, count: 5 },
    { hour: 20, count: 6 },
    { hour: 21, count: 4 },
    { hour: 22, count: 2 },
  ];

  function isToday(isoDate) {
    const date = new Date(isoDate);
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function buildSaleItems() {
    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = [];

    for (let index = 0; index < itemCount; index += 1) {
      const product = pickRandom(PRODUCTS);
      const quantity = 1 + Math.floor(Math.random() * 2);
      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        subtotal: product.price * quantity,
      });
    }

    return items;
  }

  function createSale(hour, minute, tableNumber) {
    const items = buildSaleItems();
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const paymentMethod = Math.random() > 0.45 ? "card" : "cash";
    const paidAt = new Date();
    paidAt.setHours(hour, minute, 0, 0);

    const amountReceived =
      paymentMethod === "cash" && Math.random() > 0.5
        ? Math.ceil(total / 10) * 10
        : total;
    const change = Math.max(0, amountReceived - total);

    return {
      id: crypto.randomUUID(),
      tableNumber,
      paidAt: paidAt.toISOString(),
      paymentMethod,
      amountReceived,
      change,
      total,
      items,
      description: items
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(", "),
    };
  }

  function generateFakeSales() {
    const sales = [];

    for (const { hour, count } of HOURLY_PLAN) {
      for (let index = 0; index < count; index += 1) {
        const minute = Math.floor(Math.random() * 59);
        const tableNumber = 1 + Math.floor(Math.random() * 12);
        sales.push(createSale(hour, minute, tableNumber));
      }
    }

    return sales.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }

  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const kept = Array.isArray(existing)
    ? existing.filter((sale) => !isToday(sale.paidAt))
    : [];
  const seeded = generateFakeSales();
  const nextSales = [...seeded, ...kept];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSales));
  window.dispatchEvent(new Event(STORAGE_EVENT));

  const total = seeded.reduce((sum, sale) => sum + sale.total, 0);

  console.log("✅ Vendas fake do dia criadas com sucesso");
  console.log(`   ${seeded.length} vendas entre 08h e 22h`);
  console.log(`   Total simulado: €${total.toFixed(2)}`);
  console.log("   Abra o relatório → aba Gráfico para visualizar");

  return { count: seeded.length, total, sales: seeded };
})();
