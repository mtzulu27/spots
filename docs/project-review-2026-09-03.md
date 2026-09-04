# Spots: revision de estado

Fecha: 2026-09-03. Alcance: checkout local, codigo, catalogo, Git y comprobaciones de compilacion. No se modifico codigo funcional, se desplego ni se consulto el backend de produccion.

## Diagnostico

MVP web/PWA avanzado en implementacion, con catalogo real y administracion. El checkout actual no es publicable: la exportacion web falla por assets eliminados. La UI esta en una iteracion sin commit y la documentacion visual corresponde a propuestas, no a una especificacion consolidada de lo implementado.

## Git y trabajo pendiente

- Rama: `codex/minimalist-ui`.
- HEAD y `main` local: `fabc7cb` (Update spots catalog data).
- Los cambios actuales de UI no estan en un commit de esta rama.
- Hay modificaciones en Explore, componentes compartidos y configuracion Vite del admin.
- Hay 11 PNG eliminados en assets y 5 JPG eliminados en place-media.
- PRODUCT.md, DESIGN.md, DESIGN.json y LAYOUT.md estan sin seguimiento.
- Hay un experimento Overtone Finder sin seguimiento incluido en las entradas de build del admin.
- `codex/urban-ui` sigue existiendo en `9e885f8`; no se debe asumir que sus cambios estan en main.
- Solo hay un worktree. No se hizo fetch ni se verifico equivalencia con produccion o remotos.

## Hallazgos prioritarios

### P1: exportacion web bloqueada por assets ausentes

La exportacion Expo termina con Unable to resolve module ../../assets/auth_reset_bg.png en apps/mobile/app/(auth)/forgot-password.tsx:20. Tambien quedan referencias a otros PNG eliminados en login, setup, filtros, Explore, cuenta y detalle. TypeScript no detecta este fallo de resolucion de recursos. Recuperar los recursos o sustituir conscientemente sus referencias antes de exportar.

El catalogo referencia cinco fotos que ya no existen: fit-bar/gallery-4.jpg, joes/gallery-6.jpg y madelo-lago-verde/gallery-1.jpg, gallery-3.jpg y gallery-6.jpg. Aunque se resuelva la compilacion, estas peticiones de imagen fallarian.

### P1: control de acceso del admin exclusivamente local

apps/admin/src/App.tsx:1925 compara el formulario con credenciales estaticas y escribe un indicador en localStorage. No establece una sesion autenticada de administrador con el backend. Esto protege visualmente la pantalla, pero no constituye autorizacion de operaciones.

docs/supabase-spots-storage.sql:13 define insercion, actualizacion y borrado para `to public` comprobando solo el bucket. Si se aplicaron tal cual, permiten modificar medios sin acreditar rol administrador. El esquema v2 revisado tampoco define RLS para las tablas principales del catalogo. Hay que verificar las politicas desplegadas: no se comprobo exposicion real ni se hicieron operaciones remotas.

### P1: guardados no persistentes en iPhone web

apps/mobile/lib/bookmarks-store.tsx:34 retorna un conjunto vacio en iOS web y :58 omite la escritura. Los guardados desaparecen al remontar el proveedor o recargar. En otras plataformas son locales, sin sincronizacion entre dispositivos.

Ademas, :111 calcula el siguiente conjunto dentro del updater de React pero lo escribe fuera inmediatamente. La escritura depende de cuando React ejecute ese updater; conviene eliminar esa dependencia antes de confiar en la persistencia.

### P2: reinicio del feed no representa todos los filtros

apps/mobile/app/(tabs)/explore.tsx:1150 interpola serializeFilters(filters) en una cadena. Esa funcion devuelve un objeto, convertido en `[object Object]`. Cambiar categorias, presupuesto u otros filtros sin cambiar query/tab no cambia ese trigger, por lo que no reinicia el limite progresivo mediante ese efecto. El filtrado de resultados sigue teniendo su propio calculo; el problema es el reset/trigger.

### P2: datos del admin y catalogo publicado pueden divergir

Explore consume public/spots-catalog.json, no consulta en vivo las tablas del catalogo. deploy:web exporta y sube archivos, pero no ejecuta build:catalog. Editar Supabase desde el admin no implica que Explore refleje esos cambios. El proceso necesita una decision explicita sobre sincronizacion y preservacion de ajustes locales.

El admin soporta excepciones de horario por fecha, pero build-static-catalog.mjs no las exporta y spots-store no las consume. Una excepcion configurada en admin no llega por este pipeline a Abierto ahora. schedule-status.ts:35 tambien usa la zona horaria del dispositivo, no fija America/Bogota.

### P2: app nativa sin catalogo

apps/mobile/lib/spots-store.tsx:746 inicializa y carga datos solo en web; en plataformas nativas deja spots vacio. La estructura Expo existe, pero eso no equivale a una version iOS/Android funcional con lugares.

### P2: calidad y deuda de interfaz

El lint del admin falla en App.tsx:4005 por setState sincrono dentro de un efecto y reporta tres warnings de hooks. Las animaciones nuevas de StackedFeedCard no contemplan reduced motion. No se localizaron suites de tests propias con nombres test/spec en la busqueda del repositorio.

Explore tiene 3976 lineas, detalle 2792 y App.tsx del admin 4432. Hay rutas alternativas de presentacion y codigo legacy desactivado. packages/shared sigue siendo un espacio reservado; contratos y conversiones estan duplicados.

## Producto implementado en codigo

| Area | Estado observado |
| --- | --- |
| Acceso | Login, registro, recuperacion, perfil y onboarding con integracion Supabase |
| Explore | Busqueda semantica mediante reglas, filtros, agrupacion por marca/sede, categorias, feed progresivo |
| Header | Perfil y notificaciones; busqueda con filtro; categorias; conteo y filtros |
| Cards editoriales | Cover, badge, bookmark, titulo sobre foto, descripcion y metadata horizontal |
| Detalle | Galeria, seleccion de sede, horarios, ubicacion, presupuesto y enlaces de contacto |
| Guardados | Implementados localmente, con limitaciones descritas |
| Notificaciones | Service worker, suscripciones y funcion para envio al propio usuario; funcionamiento remoto no validado |
| Admin | Edicion de lugares/sedes, medios, horarios, excepciones, importacion CSV y Supabase |
| Publicacion | Exportacion estatica y despliegue incremental Hostinger por FTP |

Hay codigo para eventos, pero el catalogo local contiene solo lugares. La ruta editorial es la inicial. La carga progresiva sigue configurada a 12 elementos iniciales y lotes de 12.

## Catalogo local

- 188 lugares totales; 168 activos; ningun evento.
- 337 sedes totales; 304 marcadas activas; 297 activas pertenecientes a lugares activos.
- De esas 297: 144 sin coordenadas, 17 sin presupuesto positivo, 25 sin horario textual ni filas semanales.
- En todos los registros hay direccion y descripcion no vacias; no se verifico su exactitud comercial.
- 142 de los 188 lugares son Comida. La cobertura de otras ocasiones es considerablemente menor.
- 234 referencias locales unicas a medios, cinco ausentes.
- 230 archivos existentes en place-media, unos 119 MB; 26 superan 1 MB. Es peso almacenado, no una medicion del trafico inicial.
- generatedAt indica 2026-04-12; commits posteriores cambiaron datos. Esa fecha no acredita frescura de cada registro.

## Direccion visual y documentacion

PRODUCT.md recoge proposito, audiencia, personalidad y principios de Spots. DESIGN.md se titula Spots Probe V1 y propone outlines fuertes, papel calido y Montserrat de gran peso. LAYOUT.md propone modulos editoriales de distintos tamanos y rails. El codigo actual conserva un feed uniforme y mezcla base minimalista con bordes negros, botones amarillos y titulos de 42 px sobre fotos.

Por tanto, el nombre minimalist-ui no basta para describir el estado visual. Hace falta separar la propuesta exploratoria de la especificacion aprobada. README.md sigue describiendo tareas de scaffold ya realizadas.

## Verificacion realizada

- pnpm typecheck: pasa para mobile y admin.
- Exportacion web Expo a /private/tmp/spots-audit-export: falla por asset requerido ausente.
- Build Vite del admin a /private/tmp/spots-audit-admin: pasa, incluyendo Overtone Kit y Overtone Finder.
- ESLint admin: un error, tres warnings.
- Integridad de referencias locales del catalogo: cinco ausencias confirmadas.
- Puerto 8081: no se encontro listener al comprobarlo.
- No se arrancaron servidores persistentes; los procesos de comprobacion terminaron.
- No se verificaron interfaz en navegador, Lighthouse, autenticacion real, politicas remotas ni estado publicado en Hostinger. La compilacion bloqueada impide validar visualmente una exportacion nueva del checkout completo.

## Orden recomendado para retomar

1. Resolver assets eliminados y obtener una exportacion reproducible, conservando los cambios pendientes.
2. Revisar autorizacion del admin y politicas reales de Supabase antes de publicar.
3. Corregir guardados, trigger de filtros y transporte de horarios excepcionales.
4. Consolidar un checkpoint de UI aprobado y separar Overtone Finder del trabajo de Spots.
5. Completar coordenadas, horarios y presupuestos; establecer un pipeline claro admin-catalogo-publicacion.
6. Validar Explore, filtros, detalle, guardados y retorno desde autenticacion en navegador y PWA de iPhone.
7. Continuar la iteracion visual sobre esa base verificada.
