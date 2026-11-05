# Spots desktop: acceso V1

Exploracion en MagicPath, 2026-11-01. Proyecto 459167073885626368.
Sin cambios en la autenticacion local, Supabase ni Hostinger.

## Variante centrada: referente Komoot

Nuevo componente467765843770626048/revision467765843770626049,
Spots Desktop · Acceso centrado · Referente Komoot. No reemplaza los anteriores.
Fuente seleccionada por el usuario: https://mobbin.com/screens/9fd1c585-3772-4ded-ae0e-3e07e13eb6c7.
Formulario centrado360px, amplio espacio libre, recorridos perifericos y marca
Spots en lugar de montañas/verde. Preserva tokens grises/coral y flujo progresivo.
Build completo; inputs/CTAs16px, email y recuperacion comprobados;
sin overflow375/768/1280. Captura komoot-centered-access.png.

- Acceso: componente 467755335663382528, revision 467760694159347712.
- Email unificado (anterior frame Registro): componente 467755461798662144, revision 467760698903105536.
- Recuperacion: componente 467755466634719232, revision 467760703445557248.

## Comentarios de escala y UX

Inputs y CTAs16px, encabezados24px/31px, apoyo14px/21px, legales12px/18px.
Logo30x40; sin bloque editorial sobre la foto ni frase de footer.
Explorar sin cuenta pasa a44px circular blanco con glyph20px, titulo y aria-label.
Acceso inicial Google/email; email revela formulario unificado con Continuar,
Otros metodos y Olvide mi contraseña. Se eliminan tabs login/registro: la app
real intenta login y luego signup con el mismo formulario. El prototipo no envia
credenciales ni simula como real esa decision de backend.
Formulario deshabilitado hasta email valido/password8+, toggle visible, recuperacion.
Builds3 completados; 1080x767 comprobado con screenshot access-refined.png;
inputs/CTAs16px verificados por estilos computados; flujo y validacion probados;
sin overflow a375/768/1280. Cambios exclusivamente en MagicPath.

## Consistencia con UI movil

Traslado solicitado: CTA appColors.primary #ff4e76, 56px/28px/16px/700;
Google del login 54px/18px/16px/700; tabs AppSegmentedTabs 18px/14px,
46px minimo, padding4 y sombra negra .04. Campos18px y texto16px;
labels13px, body15px/22px y legales12px/18px. Fondo y textos accountUi.
Iconos exactos de spots-icon-paths.ts con stroke2.5; back circular44px.
Se conserva el layout desktop, foto, estados y funciones del prototipo.
Comprobados CTA computado #ff4e76/28px/16px, thumb14px, tabs y recuperacion;
sin desbordamiento a375/768/1280. Evidencia login-mobile-consistency.png.

La foto y el logo proceden del login actual. Colores de account-ui.ts y
tratamiento de superficies de apps/mobile/components/DESIGN.md.
Montserrat 400/600/700 desde Google Fonts (CORS disponible); no fuentes locales
de Spots porque no ofrecen CORS para incrustacion en MagicPath.

Composicion desktop 1440x1000: foto editorial izquierda, formulario derecho,
selector de login/registro, Google, email y password, recuperacion y estados
de confirmacion. Los formularios solo actualizan estado del prototipo:
no crean cuentas ni envian emails. Los destinos no diseñados explican este limite.

Verificacion: tres builds completados; registro y recuperacion navegables,
confirmaciones comprobadas con prueba@example.com; sin desbordamiento horizontal
a 375, 768 y 1280px. Revision visual desktop 1440px y movil 375px.
No se midio Lighthouse: esta entrega es una exploracion de diseno en MagicPath,
no una implementacion final de autenticacion.
