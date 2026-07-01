/**
 * Limpa produtos e categorias locais e recarrega do servidor.
 *
 * Como usar:
 * 1. Abra o app em http://localhost:3000 (ou produção)
 * 2. DevTools → Console (F12)
 * 3. Execute:
 *    fetch('/scripts/reset-menu-catalog.js').then(r=>r.text()).then(eval)
 */
(async function resetMenuCatalog() {
  const PREFIX = "restaurant:v1:";
  const KEYS = ["products", "menu-catalog", "product-temp-id-map", "sync-queue", "sync-delta-cursor"];

  for (const key of KEYS) {
    localStorage.removeItem(PREFIX + key);
  }

  const snapshot = await fetch("/api/sync/snapshot").then((r) => r.json());

  localStorage.setItem(PREFIX + "products", JSON.stringify(snapshot.products));
  localStorage.setItem(PREFIX + "menu-catalog", JSON.stringify(snapshot.menuCatalog));
  localStorage.setItem(PREFIX + "sync-delta-cursor", JSON.stringify(snapshot.serverTime));

  window.dispatchEvent(new CustomEvent("restaurant-products-change"));
  window.dispatchEvent(new CustomEvent("restaurant-menu-catalog-change"));

  console.log(
    `Catálogo recarregado: ${snapshot.products.length} produtos, ` +
      `${snapshot.menuCatalog.length} categorias.`,
  );
})();
