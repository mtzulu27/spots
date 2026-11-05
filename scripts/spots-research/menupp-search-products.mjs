export function indexMenuReport(report, evidenceFile) {
  if (report.status !== 'public_menu_records_received') return [];
  return (report.menus ?? []).filter(menu => menu.metadata?.active !== false && menu.metadata?.hide !== true).flatMap(menu => {
    let sourceUrl;
    try {
      const url = new URL(menu.source, report.source);
      if (url.protocol !== 'https:' || url.hostname !== 'menupp.co') return [];
      sourceUrl = url.href;
    } catch { return []; }
    const categories = new Map((menu.categories ?? []).map(category => [category.id, category]));
    const products = [], excluded = [];
    for (const product of menu.products ?? []) {
      const chain = [], seen = new Set();
      let id = product.product_category;
      let reason = '';
      while (id && id !== 'root') {
        if (seen.has(id)) { reason = 'category_cycle'; break; }
        seen.add(id);
        const category = categories.get(id);
        if (!category) { reason = 'unresolved_category'; break; }
        chain.unshift(category);
        id = category.hierarchy;
      }
      if (!chain.length) reason ||= 'unresolved_category';
      if (product.disabled === true || product.disable === true || product.noStock === true ||
          chain.some(category => category.disabled === true || category.disable === true)) reason = 'disabled_or_unavailable';
      if (Array.isArray(product.price) && product.price.length && product.price.every(price => price.disable === true || price.noStock === true)) reason = 'no_available_presentation';
      const name = String(product.product_name || product.name || '').trim();
      if (!name) reason = 'missing_name';
      const section = chain.map(category => String(category.name || '').trim()).filter(Boolean).join(' / ');
      const norm = section.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      if (/\b(?:adiciones|modificadores|toppings|insumos)\b/.test(norm)) reason = 'modifier_not_standalone_offer';
      if (reason) { excluded.push({ id: product.id, name, reason }); continue; }
      const category = /bebida|cerveza|vino|coctel|coffee|cafe|licor|whisky|tequila|ginebra|vodka|ron\b|sangria|macerado/.test(norm) ? 'drinks' :
        /postre|torta|helado|dulce/.test(norm) ? 'desserts' : 'extras';
      products.push({ name, category, menuSection: section, sourceUrl,
        verifiedAt: report.finishedAt, sourceProductId: product.id, available: true });
    }
    return [{ sourceUrl, verifiedAt: report.finishedAt, evidenceFile, products, excluded }];
  });
}
