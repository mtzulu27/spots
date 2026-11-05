# Spots: pruebas con usuarios sinteticos

Fecha: 2026-11-01. Estado: investigacion y propuesta; no se han ejecutado
pruebas de personas sobre Spots, instalado plataformas ni contratado servicios.

## Conclusion

MatrAIx se ajusta mejor a probar la usabilidad de Spots. MiroFish tiene un foco
distinto: simulacion social, conversaciones y propagacion de opiniones. Un agente
que opina sobre una descripcion no equivale a un agente que usa la interfaz.

La primera opcion para Spots es un piloto pequeno y aislado de agentes que
naveguen la PWA, con perfiles escritos para sus escenarios locales, tareas
repetibles y evidencia verificable. Adoptar MatrAIx completo tiene sentido si
necesitamos despues cohortes, ejecuciones recurrentes y comparaciones por version.

## Fuentes y observaciones

### MiroFish

- Sitio: https://666ghj.github.io/mirofish-demo/
- Proyecto: https://github.com/666ghj/MiroFish
- REA abrio el sitio y pulso Try Live Demo. El destino observado fue
  https://666ghj.github.io/mirofish-demo/console.
- La consola presenta un caso prefijado sobre reputacion de Wuhan University.
- Aviso visible: "This page is a static demo only. Deep interaction with Agents
  is not connected to an LLM." No se subieron documentos ni direcciones de Spots.
- El proyecto completo documenta grafo de conocimiento, perfiles, simulacion en
  plataformas sociales, generacion de informes e interaccion posterior. Esto
  permite explorar hipotesis sociales, pero no establece un controlador de la UI
  de Spots ni una prueba de usabilidad del producto.
- Requisitos documentados del proyecto: Python, Node, API de modelo y Zep Cloud.
  No se configuraron claves, servicios ni ejecuciones de pago.

### MatrAIx

- Repositorio identificado en la captura:
  https://github.com/MatrAIx-ai/MatrAIx-Persona-8B
- README actual verificado por web y mediante captura de navegador de REA.
- Documenta cuatro entornos: encuesta, chat, web y aplicaciones de escritorio/movil.
- Para web, ofrece Playwright, browser-use y computer-use basado en capturas.
  Documentacion: https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/blob/main/docs/environment/web-interaction.md
- Las personas se inyectan como contexto del agente; tarea y perfil se mantienen
  separados. Se puede muestrear por edad y motivacion economica, entre otras
  dimensiones. Esto no demuestra representatividad de la poblacion de Cali.
- Ejemplo comprobado: elegir un portatil navegando un catalogo publico y generar
  decision, motivo y producto elegido, sin login ni compra.
  https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/tree/main/application/tasks/example-web-browser-use_laptop-choice
- Advertencia importante del contrato: los verificadores de esos ejemplos
  validan esquema/campos, no necesariamente correspondencia semantica con el
  catalogo vivo. Spots necesita sus propias comprobaciones observables.
- La instalacion completa requiere Python 3.12, uv, modelos/API y, normalmente,
  Docker para pruebas web. Computer-use de macOS/iOS puede requerir otro servicio.
  https://github.com/MatrAIx-ai/MatrAIx-Persona-8B/blob/main/docs/environment/agents.md
- No se instalo ni ejecuto MatrAIx: navegabilidad y requisitos se comprobaron en
  sus documentos/ejemplos, no mediante una corrida del framework sobre Spots.

## Piloto propuesto

Ocho perfiles sinteticos, tres tareas por perfil: 24 recorridos. Son hipotesis
de cobertura, no segmentos de mercado validados. No deducir conducta a partir
del genero, etnia, ingresos o edad; definir metas, restricciones y preferencias
explicitas, y cruzarlas de forma independiente.

| Perfil hipotetico | Contexto y restricciones explicitamente asignadas |
| --- | --- |
| Estudiante, 22 | Vive en Cali; busca algo por debajo de $30.000 por persona; compara precios. |
| Profesional, 29 | Poco tiempo para decidir; quiere algo abierto cerca despues del trabajo. |
| Visitante, 33 | No conoce barrios ni malls; necesita entender ubicacion y como llegar. |
| Organizador de grupo, 26 | Planea para cuatro; necesita distinguir costo individual y total. |
| Plan en pareja, 35 | Prefiere ambiente tranquilo y compara dos opciones antes de elegir. |
| Explorador, 24 | Prioriza descubrir algo diferente a sus lugares habituales. |
| Usuario de baja familiaridad digital, 45 | Prefiere lenguaje explicito y no reconoce todos los iconos; rasgo asignado, no inferido de su edad. |
| Usuario con texto ampliado, 38 | Usa una pantalla pequena y texto grande; se evalua el render real, no se presume simular una discapacidad. |

Tareas comunes, redactadas como objetivos y sin revelar la ruta correcta:

1. Encontrar un lugar que cumpla una restriccion de presupuesto, zona y horario.
2. Comparar opciones y consultar la sede y presupuesto para el plan.
3. Encontrar como sugerir un lugar o comunicar un problema, sin enviar datos.

Agregar pruebas separadas de guardar favoritos, login y mapas solo con cuentas
de prueba y permisos acotados. Usar lugares/precios reales del catalogo de la
version evaluada; si no hay un resultado valido, reconocerlo como tal.

## Protocolo para obtener evidencia util

- Cada persona recibe un contexto independiente y almacenamiento de navegador
  aislado. No deben competir por la misma ventana ni compartir sesiones/datos.
- No darle al agente el codigo, rutas internas, solucion de la tarea ni opiniones
  anteriores del equipo. Usar objetivos neutrales, sin dirigir las respuestas.
- Para energia visual y legibilidad, exigir capturas/vision; un agente que solo
  lee el DOM no puede validar adecuadamente el aspecto visual.
- Limitar por pasos; permitir que el agente abandone, declare una duda o diga que
  no sabe. No forzarlo a inventar exito o una opinion distinta por cada perfil.
- Registrar URL, acciones, capturas antes/despues, resultado y evidencia de fallo.
- Separar hechos de la interfaz, interpretacion del perfil e hipotesis del modelo.
- Verificar el exito contra la UI y datos visibles, no contra el relato del agente.
- Para comparar disenos, mantener tarea, datos, modelo y version; variar una sola
  condicion. Repetir algunos casos antes de atribuir un hallazgo al perfil.
- Medir exito, errores, retrocesos y pasos. La latencia del modelo/herramientas no
  equivale al tiempo que tardaria un humano en completar la tarea.
- No publicar feedback sintetico como reseñas ni enviarlo al inbox de produccion.
- No compras, mensajes externos, cambios de cuenta, ubicacion real ni escrituras
  persistentes sin autorizacion y un entorno de prueba adecuado.
- Para instalar MatrAIx, revisar presupuesto/API, aislamiento, acceso a la PWA y
  manejo de credenciales antes de ejecutar. No copiar credenciales de Codex ni
  sesiones personales a contenedores como parte de una instalacion automatica.

Formato minimo por recorrido:

```json
{
  "synthetic": true,
  "persona_id": "perfil-01",
  "task_id": "descubrir-lugar",
  "app_version": "identificador-de-version",
  "outcome": "completed|blocked|abandoned|not_applicable",
  "observations": [],
  "evidence": [],
  "persona_interpretation": [],
  "unverified_hypotheses": []
}
```

Los hallazgos sinteticos sirven para detectar friccion y preparar pruebas reales;
no estiman conversion, satisfaccion o preferencias de la poblacion. Numerosos
agentes del mismo modelo tampoco equivalen a personas humanas independientes.
Validar los problemas importantes con usuarios reales; no considerar una
simulacion de lector de pantalla sustituto de una prueba real de accesibilidad.

## Evidencia de REA y limites

- Landing: ev_8f0543d181e7ea5c57ac9f6e35bdef9514f3766f40e83fe09e26f38f6a74f4a0.
- Consola tras Try Live Demo:
  ev_8e35041be67df8fadee4d703bb52e5a82eaa40b32b8ebd9f15c00856d82ebcee.
- Repositorio MatrAIx:
  ev_97b0d6c722b856713508c66550e0d2927d0ad43fbd4f05a71a5d75b111af14fe.
- Analisis estatico del JS desplegado de MiroFish:
  ev_72da32691965d9d28becd31065bc22a7d15d68c039fcb1b5aa67a8a80a2dedd4.
- Resumen estatico:
  ev_a1e6b412950a7ed4019ba91102a3bd091fcd308c61ebfae7e30efdb9bcd1aedc.
- Archivo descargado: output/spots-persona-research-20261101/mirofish-demo-index.js.
  Se leyo como texto; no se ejecutaron scripts descargados fuera del navegador.
- La captura de DOM/accesibilidad de la consola completo sus pasos. La red de
  MiroFish tuvo omisiones por presupuesto, por lo que no se afirma que el trafico
  este completo ni que la ausencia de una llamada pruebe ausencia de backend.
- El analizador estatico leyo un archivo de 287.919 bytes, sin errores de parseo.
  Grafo semantico parcial por limites de retencion; no se analizaron todos los
  chunks de ruta ni backend. La advertencia de demo estatica fue observada en UI.
- Los tres navegadores temporales de REA reportaron terminated-owned-process.
  Ningun servidor, simulacion o proceso persistente quedo encendido.
