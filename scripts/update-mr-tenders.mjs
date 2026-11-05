import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const catalogPath = path.join(root, "apps/mobile/public/spots-catalog.json");
const htmlPath = "/private/tmp/mr-tenders.html";
const evidenceDir = path.join(root, "docs/catalog-review/mr-tenders-2026-09-05");
const menuUrl = "https://mr-tenders.tiendana.com/";
const instagramUrl = "https://www.instagram.com/mistertenders/";
const reviewedAt = "2026-09-06T00:30:00.000Z";

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const html = fs.readFileSync(htmlPath, "utf8");
const spot = catalog.spots.find((item) => item.id === 76);

if (!spot) throw new Error("Mr. Tenders (spot 76) not found");

const decode = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&#39;", "'")
  .replaceAll("&quot;", '"')
  .replaceAll("&aacute;", "á")
  .replaceAll("&eacute;", "é")
  .replaceAll("&iacute;", "í")
  .replaceAll("&oacute;", "ó")
  .replaceAll("&uacute;", "ú")
  .replaceAll("&ntilde;", "ñ")
  .replace(/<[^>]+>/g, "")
  .trim();

const sectionMatches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((match) => ({
  index: match.index,
  name: decode(match[1]),
}));
const titleMatches = [...html.matchAll(/class=product-card__title>([^<]+)<\/h3>/g)];
const includedForVisit = new Set([
  "Bandeja Mr Tenders", "Bowl de la Casa", "Bowl Fusión", "Bowl Mr Tenders",
  "Dog Tender", "Explosión de Pops", "Mr Kids", "Papá Pollito", "Combo Mr. Pops",
  "Combo Mr. Tenders", "Combo Mr. Tenders Agrandado", "Papas con Cheddar y Tocineta",
  "Papas con Cheddar y Tocineta + Pops", "Chicken Tenders x 3", "Chicken Tenders x 6",
]);

const menuItems = titleMatches.map((match, index) => {
  const nextIndex = titleMatches[index + 1]?.index ?? html.length;
  const before = html.slice(Math.max(0, match.index - 700), match.index);
  const after = html.slice(match.index, nextIndex);
  const section = [...sectionMatches].reverse().find((item) => item.index < match.index)?.name ?? "Sin sección";
  const priceMatch = after.match(/product-card__price-current>\$([\d.]+)/);
  if (!priceMatch) throw new Error(`Price not found for ${match[1]}`);
  const description = after.match(/product-card__description>(.*?)<\/div>/)?.[1] ?? "";
  const name = decode(match[1]);
  const soldOut = /product-card__badge--sold-out/.test(before);
  let category = "mains";
  if (section.includes("Bebidas")) category = "drinks";
  if (section.includes("Adiciones") || section === "Insumo - Producto" || section === "Otro") category = "extras";
  if (section.includes("Papas") || name === "Cubitos de Queso") category = "starters";
  const calculationIncluded = includedForVisit.has(name) || category === "drinks";
  return {
    name,
    price: Number(priceMatch[1].replaceAll(".", "")),
    category,
    menuSection: section.replace(/^\d+\s+/, ""),
    description: decode(description),
    sourceUrl: menuUrl,
    verifiedAt: reviewedAt,
    unit: category === "drinks" ? "bebida individual" : category === "extras" ? "adición" : "porción o plato según descripción",
    calculationIncluded: calculationIncluded && !soldOut,
    ...(soldOut ? { availability: "sold_out" } : {}),
    ...(!calculationIncluded ? { exclusionReason: "No corresponde a la cesta individual comparable usada para el presupuesto normal." } : {}),
  };
});

if (menuItems.length !== 58) throw new Error(`Expected 58 products, found ${menuItems.length}`);

Object.assign(spot, {
  name: "Mr. Tenders",
  short_description: "Tenders de pollo crujientes, bowls, papas y combos para caer con amigos o en familia. Elegí entre porciones individuales y bandejas para compartir, con varias salsas para armar el plan a tu gusto.",
  cover_image_url: "/place-media/mr-tenders/cover-user-20260905.jpg",
  gallery_urls: [
    "/place-media/mr-tenders/gallery-user-01-20260905.jpg",
    "/place-media/mr-tenders/gallery-user-02-20260905.jpg",
    "/place-media/mr-tenders/gallery-user-03-20260905.jpg",
    "/place-media/mr-tenders/gallery-user-04-20260905.jpg",
    "/place-media/mr-tenders/gallery-user-05-20260905.jpg",
    "/place-media/mr-tenders/gallery-user-06-20260905.jpg",
  ],
  logo_url: "/place-media/mr-tenders/logo-official-20260905.webp",
  category: "Comida",
  tags: ["pollo", "tenders", "combos", "bowls", "papas", "salsas", "restaurantes", "comida", "comer", "para compartir"],
  moods: ["casual", "con amigos", "en familia", "comer rico", "para compartir"],
  is_active: true,
  catalog_status: "ready",
  missing_fields: ["holiday_hours"],
  source_urls: [instagramUrl, menuUrl],
  updated_at: reviewedAt,
});

const branchDefinitions = [
  {
    slug: "mr-tenders-lago-verde",
    id: 85,
    neighborhood: "Pance",
    mall: "Parque Comercial Lago Verde",
    address: "Calle 16A #122-70, burbuja 10, Parque Comercial Lago Verde, Pance, Cali",
    latitude: 3.3423126796867266,
    longitude: -76.5357019970256,
    hours: "Lun-Mié 11:30-22:00 · Jue-Dom 11:30-23:00 · Festivos por confirmar",
    google_maps_url: "https://maps.google.com/?cid=4146298459322207888",
    schedule: [
      [0, "11:30:00", "23:00:00"], [1, "11:30:00", "22:00:00"],
      [2, "11:30:00", "22:00:00"], [3, "11:30:00", "22:00:00"],
      [4, "11:30:00", "23:00:00"], [5, "11:30:00", "23:00:00"],
      [6, "11:30:00", "23:00:00"],
    ],
  },
  {
    slug: "mr-tenders-ingenio",
    id: 5246,
    neighborhood: "El Ingenio",
    mall: "",
    address: "Carrera 85C #14A-89, El Ingenio, Cali",
    latitude: 3.3808635,
    longitude: -76.5311275,
    hours: "Todos los días 11:30-23:00 · Festivos por confirmar",
    google_maps_url: "https://maps.google.com/?cid=16234635198449043374",
    schedule: Array.from({ length: 7 }, (_, day) => [day, "11:30:00", "23:00:00"]),
  },
  {
    slug: "mr-tenders-granada",
    id: 5247,
    neighborhood: "Granada",
    mall: "",
    address: "Avenida 9 Norte #10N-31, Granada, Cali",
    latitude: 3.45681,
    longitude: -76.536427,
    hours: "Todos los días 11:30-23:00 · Festivos por confirmar",
    google_maps_url: "https://maps.google.com/?cid=4411562608620738804",
    schedule: Array.from({ length: 7 }, (_, day) => [day, "11:30:00", "23:00:00"]),
  },
];

for (const definition of branchDefinitions) {
  const existing = catalog.branches.find((branch) => branch.slug === definition.slug);
  const branch = existing ?? {
    id: definition.id,
    spot_id: spot.id,
    slug: definition.slug,
    created_at: reviewedAt,
  };
  Object.assign(branch, {
    neighborhood: definition.neighborhood,
    mall: definition.mall,
    hours: definition.hours,
    holiday_mode: "inherit",
    holiday_open_time: null,
    holiday_close_time: null,
    holiday_split_open_time: null,
    holiday_split_close_time: null,
    address: definition.address,
    min_budget: 21400,
    max_budget: 46400,
    typical_budget: 32400,
    budget_basis: "Referencia por persona: promedio de 15 platos o combos individuales comparables ($25.900) + una bebida individual ($6.500).",
    menu_calculation_note: "La carta completa tiene 58 productos. Combos familiares, bandejas grandes, promociones, adiciones y productos agotados se conservan, pero no entran en el promedio de una visita individual.",
    min_people: 1,
    max_people: 6,
    menu_url: menuUrl,
    menu_items: menuItems,
    whatsapp: "3194262727",
    phone: "3194262727",
    instagram: instagramUrl,
    latitude: definition.latitude,
    longitude: definition.longitude,
    google_maps_url: definition.google_maps_url,
    website_url: menuUrl,
    is_active: true,
    sort_order: 10,
    updated_at: reviewedAt,
  });
  if (!existing) catalog.branches.push(branch);
}

const branchIds = new Set(branchDefinitions.map((branch) => branch.id));
catalog.branchHours = (catalog.branchHours ?? []).filter((row) => !branchIds.has(row.branch_id));
catalog.hours = (catalog.hours ?? []).filter((row) => !branchIds.has(row.branch_id));
let hourId = Math.max(0, ...catalog.branchHours.map((row) => row.id ?? 0), ...catalog.hours.map((row) => row.id ?? 0)) + 1;
const newHours = branchDefinitions.flatMap((branch) => branch.schedule.map(([day, open, close]) => ({
  id: hourId++,
  branch_id: branch.id,
  day_of_week: day,
  is_closed: false,
  open_time: open,
  close_time: close,
  split_open_time: null,
  split_close_time: null,
  sort_order: day === 0 ? 70 : day * 10,
})));
catalog.branchHours.push(...newHours);
catalog.hours.push(...newHours.map((row) => ({ ...row })));
catalog.generatedAt = reviewedAt;

fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, "menu-extraction.json"), JSON.stringify({
  source: menuUrl,
  checkedAt: reviewedAt,
  productsDeclaredBySource: 58,
  productsExtracted: menuItems.length,
  products: menuItems,
}, null, 2) + "\n");

fs.writeFileSync(path.join(evidenceDir, "review.json"), JSON.stringify({
  version: 1,
  slug: "mr-tenders",
  reviewedAt,
  identity: { status: "verified", city: "Cali", officialName: "Mr. Tenders" },
  sources: [
    { id: "instagram-profile", kind: "instagram", url: instagramUrl, checkedAt: reviewedAt, status: "complete", details: "Bio verificada: Ingenio, Mall Lago Verde y Casa Granada; enlace oficial a Tiendana." },
    { id: "instagram-hours", kind: "instagram_highlight", url: instagramUrl, checkedAt: reviewedAt, status: "complete", storiesVisible: 1, storiesReviewed: 1, storiesPending: 0 },
    { id: "instagram-ingenio", kind: "instagram_highlight", url: instagramUrl, checkedAt: reviewedAt, status: "partial", storiesVisible: null, storiesReviewed: 15, storiesPending: null, details: "Se revisaron 15 historias visibles de ambiente de la sede; el total no fue expuesto por Instagram." },
    { id: "instagram-menu", kind: "instagram_highlight", url: instagramUrl, checkedAt: reviewedAt, status: "complete", storiesVisible: 1, storiesReviewed: 1, storiesPending: 0 },
    { id: "official-store", kind: "menu_and_website", url: menuUrl, checkedAt: reviewedAt, status: "complete", evidenceFile: "menu-extraction.json" },
    ...branchDefinitions.map((branch) => ({ id: `google-${branch.slug}`, kind: "google_places_new", url: branch.google_maps_url, checkedAt: reviewedAt, status: "complete", evidenceFile: `google-places-${branch.slug.replace("mr-tenders-", "") === "lago-verde" ? "pance" : branch.slug.replace("mr-tenders-", "")}.json` })),
  ],
  branches: branchDefinitions.map((branch) => ({ slug: branch.slug, identityStatus: "verified", addressStatus: "verified", coordinatesStatus: "verified", hoursStatus: "verified", holidayStatus: "unknown" })),
  menu: { status: "complete", url: menuUrl, pagesReviewed: 1, pagesTotal: 1, productsExtracted: menuItems.length },
  media: { decision: "user_provides", logoStatus: "verified", coverStatus: "verified", galleryStatus: "verified" },
  comparison: [
    { field: "branches", scope: "mr-tenders", before: ["Lago Verde"], after: ["Lago Verde", "Ingenio", "Granada"], action: "add", confidence: "high", evidence: ["instagram-profile", "official-store", "google-mr-tenders-lago-verde", "google-mr-tenders-ingenio", "google-mr-tenders-granada"] },
    { field: "catalog_status", scope: "mr-tenders", before: "pending_review", after: "ready", action: "replace", confidence: "high", evidence: ["official-store"] },
  ],
  criticalMissing: [],
  nonCriticalMissing: ["holiday_hours"],
  conflicts: [],
  notes: [
    "El teléfono 3194262727 y las tres direcciones aparecen en los datos estructurados de la tienda oficial; el flujo de pedido de la marca indica aviso por WhatsApp.",
    "Horario Lago Verde resuelto a favor de la historia oficial reciente: Lun-Mié 11:30-22:00 y Jue-Dom 11:30-23:00; Tiendana difiere el lunes y Google abre quince minutos más tarde.",
    "Horario Granada resuelto en 11:30-23:00: la historia oficial reciente coincide con Google Places y prevalece sobre la apertura 11:00 de Tiendana.",
    "La coordenada de Lago Verde suministrada previamente por el usuario se conserva por diferir menos de un metro del pin de Google Places.",
    "El usuario proporcionó una portada y seis fotos de galería de Instagram; se descargaron, validaron como imágenes y revisaron visualmente antes de activar el lugar.",
    "La portada contiene texto de marca integrado en el empaque del producto, no texto publicitario superpuesto; se conserva por selección explícita del usuario.",
  ],
}, null, 2) + "\n");

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Updated Mr. Tenders with ${branchDefinitions.length} branches and ${menuItems.length} menu items per branch.`);
