# scrape-instagram.mjs — Contexto para Codex

Script de Playwright que extrae toda la información relevante de un perfil público de Instagram para catalogar lugares en la app Spots.

```
node scripts/scrape-instagram.mjs https://www.instagram.com/<usuario>/
```

Requiere: `npm install playwright` y sesión de Instagram guardada en `~/.spots-ig-session` (se loguea automáticamente la primera vez con las credenciales en el código).

---

## Qué extrae

- **Bio** + todos los links del bio
- **Links externos** — se visitan como pestañas reales del navegador, se clasifican y se navegan según su tipo
- **Highlights relevantes** — horarios, ubicación/sedes, menú/precios (screenshots de cada slide)
- **Fotos del grid** — todas las fotos del feed (reels excluidos), scroll completo hasta agotar el feed
- **Output**: `data.json` + carpeta de screenshots en `/tmp/ig-scrape-<timestamp>/`

---

## Pipeline de links

Todos los links del bio pasan por el mismo pipeline:

1. **Detectar** — `<a>` tags en header + regex en texto plano del bio + modal nativo de IG
2. **Clasificar** — `classifyLink(url)` → `whatsapp | map | linktree | menu | website | unknown`
3. **Visitar** — pestaña real de Playwright con JS habilitado
4. **Reclasificar por contenido** — si la página tiene 4+ links externos → `linktree`; si tiene precios/menú → `menu`
5. **Navegar a fondo** según tipo:
   - `linktree` → sigue todos sus sub-links (recursivo, max depth 3)
   - `menu` → navega secciones internas, toma screenshots página por página
   - `website` → busca sub-links de menú/reservas/contacto/horario
6. **Descartar** si no tiene info útil (`hasUsefulInfo()`)

---

## Modal nativo de múltiples links de Instagram

Instagram permite poner varios links nativos en el bio. Aparecen como:
> `cuaresma.granlangostino.com y 2 más`

El script lo detecta por patrón numérico (`\d+ \w+`) — idioma-agnóstico —, hace clic, abre el modal, extrae todos los links, y los agrega al pipeline. Estos links tienen precedencia sobre los detectados por regex.

---

## Clasificación de links

| Tipo | Qué hace el script |
|---|---|
| `whatsapp` | Guarda la URL, no abre pestaña |
| `map` | Abre Google Maps, extrae dirección, teléfono y horarios, toma screenshot |
| `linktree` | Abre, extrae todos los sub-links externos, visita cada uno |
| `menu` | Abre, navega secciones internas, screenshots por página |
| `website` | Abre, busca sub-links de menú/reservas/contacto |

**Dominios que se clasifican como `menu` automáticamente:**
menupp, heyzine (flipbooks), issuu, yumminn, me-qr (excepto `/link-list/`), drive.google.com, docs.google.com, notion.so, canva.com, flipsnack, calameo, URLs con `.pdf`

**Dominios que se clasifican como `linktree`:**
linktr.ee, bio.link, beacons.ai, tap.bio, lnk.bio, campsite.bio, solo.to, hoo.be, carrd.co, about.me, taplink.cc, milkshake.app, koji.to, bento.me, instabio.cc, snipfeed.co, allmylinks.com

**Dominios ignorados (`SOCIAL_DOMAINS`):**
threads, facebook, meta, tiktok, youtube, twitter/x, snapchat, pinterest, linkedin, spotify, soundcloud, apple, play.google.com, maps.apple.com

**Plataformas de delivery ignoradas (`DELIVERY_DOMAINS`):**
rappi, ifood, ubereats, pedidosya, domicilios.com, didi, just-eat

**Sites de reviews ignorados (`REVIEW_DOMAINS`):**
tripadvisor, yelp, eltenedor/thefork, opentable

La función `shouldSkipLink(url)` agrupa los tres filtros y se usa en todo el pipeline.

---

## Fotos del grid

- Scroll progresivo por todo el feed (hasta 60 scrolls, para cuando 3 scrolls seguidos no cargan posts nuevos)
- Excluye reels (detectados por URL `/reel/` o SVG de video)
- Descarga todas las fotos encontradas (hasta 120 candidatos) con dedup por URL
- Usa `fetch` desde el contexto del navegador (con cookies de Instagram) para descargar

**Posts simples**: ya no se depende solo de la miniatura del grid. El script abre el post real en una pestaña aparte e intenta descargar la imagen grande del artículo. Si falla, usa la miniatura del grid como fallback.

**Carruseles**: detectados por ícono SVG en el grid. Para cada carrusel se abre el post en una pestaña, se navega slide por slide (botón "Next"/"Siguiente", idioma-agnóstico) y se descarga cada imagen grande. Archivos nombrados `photo-01-slide-1.jpg`, `photo-01-slide-2.jpg`, etc. Si falla la extracción de slides, usa la miniatura del grid como fallback.

En `data.json`, las fotos incluyen metadatos útiles para curaduría:
- `slide: N` si vienen de carrusel
- `source: "post" | "grid-fallback"`
- `width` y `height` si se pudieron leer desde la imagen original

---

## Highlights

Solo captura highlights cuyo label coincida con keywords de negocio:
- Horarios: `horario`, `hora`, `schedule`, `abierto`, `when`
- Ubicación: `ubicaci`, `direcci`, `sede`, `local`, `donde`, `address`, `where`, `lugar`, `cómo llegar`
- Menú: `menú`, `menu`, `carta`, `precio`, `price`, `food`, `comida`, `bebida`, `drinks`

Captura todos los slides de cada highlight. Detecta el ID del highlight en la URL para evitar capturar slides del siguiente highlight automáticamente.

---

## Estructura de data.json

```json
{
  "instagram": "https://www.instagram.com/usuario/",
  "bio": "Texto completo de la bio",
  "bioLink": { "url": "...", "text": "..." },
  "bioLinks": [{ "url": "...", "text": "..." }],
  "visitedLinks": [
    {
      "url": "...",
      "type": "menu | linktree | website | whatsapp | map",
      "title": "...",
      "text": "texto completo extraído (hasta 10000 chars)",
      "phones": ["3001234567"],
      "prices": ["$25.000", "39.000"],
      "hours": ["Lunes - Viernes: 8am - 10pm", "Sábados: 9am - 11pm"],
      "addresses": ["Cra 100 #16-60, Cali"],
      "screenshots": ["/tmp/..."],
      "subLinks": []
    }
  ],
  "links": [],
  "highlights": [{ "label": "Horarios", "screenshots": ["/tmp/..."] }],
  "photos": [
    { "file": "/tmp/.../photos/photo-01.jpg", "postUrl": "https://instagram.com/p/..." },
    { "file": "/tmp/.../photos/photo-02-slide-1.jpg", "postUrl": "...", "slide": 1 }
  ]
}
```

**Campos en cada link visitado:** `hours`, `addresses`, `phones`, `prices` — extraídos estructuradamente.

## Consolidación y veredicto

Al final del scrape, `data.verdict` contiene los datos reconciliados de todas las fuentes:

```json
{
  "verdict": {
    "addresses": {
      "best": "Cra 100 #16-60, Cali",
      "sources": ["instagram_bio"],
      "confirmed": false,
      "all": [
        { "value": "Cra 100 #16-60, Cali", "sources": ["instagram_bio"], "priority": 1, "confirmedBy": 1 },
        { "value": "Cra 100 #16-60 LC E3", "sources": ["map"], "priority": 2, "confirmedBy": 1 }
      ],
      "conflicts": [{ "value": "Cra 100 #16-60 LC E3", "sources": ["map"], ... }]
    },
    "hours": { ... },
    "phones": { ... },
    "prices": { ... }
  }
}
```

**Jerarquía de fuentes (priority, menor = más confiable):**
1. `instagram_bio` / `instagram_highlight` — fuente primaria, siempre gana
2. `map` — Google Maps (bueno para dirección y horarios)
3. `website` — sitio oficial
4. `menu` — apps de menú
5. `linktree` — agregadores (datos estructurales menos confiables)

- `confirmed: true` = el mismo valor aparece en 2+ fuentes distintas
- `conflicts` presente = fuentes distintas dan valores diferentes → usar el de `priority: 1` (Instagram)
- El log imprime el veredicto al final con íconos: ✅ confirmado, ⚠️ solo una fuente, ⚡ conflicto

---

## Cómo pasarle los datos a Codex

Después de correr el script, el output imprime la ruta del `data.json`. Para interpretar y subir un lugar a Spots:

1. Leer `data.json`
2. Leer los screenshots de highlights (dirección, horario, menú)
3. Extraer: nombre, dirección/sedes, horario por sede, website, menú con precios estimados, WhatsApp/teléfono, palabras clave, fotos relevantes
4. Subir al catálogo de Spots siguiendo el schema de `apps/mobile/assets/catalog.json`

**Nota importante**: el script almacena la info cruda sin interpretarla. Codex es quien mapea esa info al schema de Spots.
