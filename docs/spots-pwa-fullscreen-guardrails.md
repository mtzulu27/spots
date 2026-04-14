# Spots PWA Fullscreen Guardrails

Esta nota documenta la solucion actual del fullscreen de la PWA en iOS.

Importante:
- no tocar esta logica "a ciegas"
- no reemplazar `--app-height` por `100dvh`
- no simplificar el recovery sin revisar ambas capas juntas

## Archivos clave

- `/Users/mateo/Documents/Playground/apps/mobile/app/_layout.tsx`
- `/Users/mateo/Documents/Playground/apps/mobile/scripts/patch-web-output.mjs`

## Como funciona hoy

Hay dos capas complementarias:

1. `patch-web-output.mjs`
- inyecta meta tags PWA
- inyecta CSS base para ocultar el body hasta que el height este listo
- define el inline script de bootstrap `setAppHeight`
- aplica un override para iOS standalone portrait: si `visualViewport.height` sale mas de 30px por debajo de `screen.height`, usa `screen.height`
- evita shrink durante foco en `input/textarea/select`

2. `_layout.tsx`
- mantiene un recovery mas inteligente ya dentro de React
- usa `stableHeightRef` como referencia de altura "buena"
- evita hacer remount si la altura actual ya coincide con la altura estable
- guarda la altura previa al resume en `PRE_RESUMPTION_HEIGHT_KEY`
- si tras el recovery la altura sigue mal en la misma orientacion, fuerza un reload adicional como fallback

## Reglas que no se deben romper

### 1. Nunca comprometer un height chico en iOS standalone portrait

La regla mas importante del sistema es:

- si estamos en iOS PWA standalone
- en portrait
- y `visualViewport.height` viene sospechosamente bajo

entonces NO se debe guardar ese valor como altura estable.

Puntos donde esto ya esta implementado:
- `_layout.tsx` en `syncViewportHeight`
- `patch-web-output.mjs` en `setAppHeight`

Si se elimina ese override, el fullscreen se rompe otra vez.

### 2. No hacer remount/recovery si el height ya esta bien

Antes de disparar recovery fuerte:
- `forceResumeRecovery`
- listener de `AppState`

comparan la altura medida contra `stableHeightRef`.

Si ya coincide dentro de tolerancia:
- se aborta el recovery
- se evita parpadeo al volver desde otra app

### 3. No disparar recovery agresivo en fresh launch

Guards actuales:
- `pageshow` solo actua cuando `event.persisted === true`
- `focus` y `visibilitychange` ignoran los primeros 3 segundos tras mount

Esto evita falsos positivos al abrir la app por primera vez.

### 4. No volver al uso de `100vh/100dvh` como fuente de verdad

La fuente de verdad visual es:
- `--app-height`

El body/html/root dependen de esa variable.

No cambiar esto a una solucion simplificada con solo CSS viewport units.

## Señales de riesgo

Si en un cambio futuro se toca cualquiera de estas cosas, revisar con mucho cuidado:

- `syncViewportHeight`
- `forceResumeRecovery`
- `finalizeViewportRecovery`
- `setAppHeight` del inline script
- meta tags PWA
- ocultamiento inicial del `body`
- uso de `screen.height` como override en standalone portrait

## Sintomas de regresion

Si algo se rompe, estos son sintomas tipicos:

- la PWA vuelve con barras del navegador visibles
- el viewport queda mas corto despues de OAuth o al volver desde otra app
- aparece un parpadeo negro al regresar aunque el height ya estaba bien
- el layout se queda "encogido" tras resume

## Regla operativa

Antes de tocar fullscreen web/PWA:

1. revisar estos dos archivos juntos
2. asumir que el problema no vive solo en React ni solo en el inline script
3. probar especificamente:
- fresh launch
- volver desde link externo
- volver desde OAuth
- volver con teclado abierto/cerrado
- portrait standalone en iPhone
