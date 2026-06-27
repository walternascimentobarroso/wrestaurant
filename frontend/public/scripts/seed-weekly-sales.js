/**
 * Seed de vendas fake para os dias passados da semana atual.
 *
 * Como usar:
 * 1. Abra o app em http://localhost:3000
 * 2. DevTools → Console (F12)
 * 3. Execute:
 *    fetch('/scripts/seed-weekly-sales.js').then(r=>r.text()).then(eval)
 *
 * Alternativa na raiz do projeto:
 *   make seed-sales-week
 */
(function seedWeeklySales() {
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

  const DAY_VOLUME_SCALE = [0.75, 0.85, 0.9, 0.95, 1, 1.05, 1.1];

  function getLocalDateKey(isoDate) {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getPastDaysOfCurrentWeek(reference = new Date()) {
    const dayOfWeek = reference.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(reference);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(reference.getDate() - mondayOffset);

    const days = [];
    for (let index = 0; index < mondayOffset; index += 1) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      days.push(day);
    }

    return days;
  }

  function createSeededRandom(seed) {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  function hashDateKey(dateKey) {
    let hash = 0;
    for (const char of dateKey) {
      hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
    }
    return hash || 1;
  }

  function buildSaleItems(random) {
    const itemCount = 1 + Math.floor(random() * 3);
    const items = [];

    for (let index = 0; index < itemCount; index += 1) {
      const product = PRODUCTS[Math.floor(random() * PRODUCTS.length)];
      const quantity = 1 + Math.floor(random() * 2);
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

  function createSaleForDay(day, hour, minute, tableNumber, random) {
    const items = buildSaleItems(random);
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const paymentMethod = random() > 0.45 ? "card" : "cash";
    const paidAt = new Date(day);
    paidAt.setHours(hour, minute, 0, 0);

    const amountReceived =
      paymentMethod === "cash" && random() > 0.5
        ? Math.ceil(total / 10) * 10
        : total;

    return {
      id: crypto.randomUUID(),
      tableNumber,
      paidAt: paidAt.toISOString(),
      paymentMethod,
      amountReceived,
      change: Math.max(0, amountReceived - total),
      total,
      items,
      description: items
        .map((item) => `${item.quantity}x ${item.productName}`)
        .join(", "),
    };
  }

  function generateSalesForDay(day) {
    const dateKey = getLocalDateKey(day.toISOString());
    const random = createSeededRandom(hashDateKey(dateKey));
    const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
    const volumeScale = DAY_VOLUME_SCALE[dayIndex] ?? 1;
    const sales = [];

    for (const { hour, count } of HOURLY_PLAN) {
      const salesThisHour = Math.max(1, Math.round(count * volumeScale));

      for (let index = 0; index < salesThisHour; index += 1) {
        const minute = Math.floor(random() * 59);
        const tableNumber = 1 + Math.floor(random() * 12);
        sales.push(createSaleForDay(day, hour, minute, tableNumber, random));
      }
    }

    return sales.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    );
  }

  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  const kept = Array.isArray(existing) ? existing : [];
  const pastDays = getPastDaysOfCurrentWeek();
  const pastDayKeys = new Set(
    pastDays.map((day) => getLocalDateKey(day.toISOString())),
  );

  const withoutPastWeek = kept.filter(
    (sale) => !pastDayKeys.has(getLocalDateKey(sale.paidAt)),
  );
  const seeded = pastDays.flatMap((day) => generateSalesForDay(day));
  const nextSales = [...seeded, ...withoutPastWeek].sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSales));
  window.dispatchEvent(new Event(STORAGE_EVENT));

  const total = seeded.reduce((sum, sale) => sum + sale.total, 0);

  console.log("✅ Vendas fake da semana criadas com sucesso");
  console.log(`   ${pastDays.length} dias · ${seeded.length} vendas simuladas`);
  console.log(`   Total simulado: €${total.toFixed(2)}`);
  console.log("   Abra Admin → Relatórios para visualizar");

  return { days: pastDays.length, count: seeded.length, total, sales: seeded };
})();
