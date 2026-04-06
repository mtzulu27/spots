# Spots Blueprint

## Vision

`Spots` es una app iOS-first para descubrir lugares y planes, recibir recomendaciones personalizadas y, en una fase posterior, armar parches con amigos.

El ecosistema inicial se compone de:

- una app mobile en React Native + Expo
- un dashboard administrativo en React
- una capa backend con Supabase para autenticacion, base de datos y storage

## Modulos

### 1. Auth y setup inicial

- Login con email y password
- Registro con email y password
- Login social con Google y Apple
- Recuperacion de contrasena
- Configuracion de perfil: foto, nombre, telefono
- Seleccion de intereses
- Onboarding de 3 slides + cierre

### 2. Explorar

- Feed principal de lugares
- Tab `Lugares`
- Tab `En casa`
- Busqueda por texto
- Filtros
- Ranking hibrido por intereses, popularidad y cercania
- Detalle del lugar

### 3. Que hacer hoy

- Pantalla de chips conceptuales
- Resultados a partir del mood/intencion actual
- Recomendaciones basadas en metadatos del lugar

### 4. Mi cuenta

- Resumen de perfil
- Tabs `Guardados` y `Parches`
- Edicion de perfil
- Logout

## Taxonomia

### Categorias primarias

- Arte y cultura
- Vida nocturna
- Cine
- Restaurantes
- Eventos
- Deporte y bienestar
- Familiar
- Pet friendly
- Naturaleza y aire libre
- Planes en casa

### Intereses de onboarding

Los intereses deben hablar el mismo idioma que categorias y subcategorias para mejorar el perfil inicial del usuario.

Ejemplos:

- Cafe
- Brunch
- Sushi
- Pizza
- Hamburguesas
- Panaderia
- Postres
- Cocteles
- Salsa
- Rooftops
- Museos
- Teatro
- Cine
- Hiking
- Picnic
- Yoga
- Spa
- Mascotas
- Planes familiares
- Conciertos
- Festivales

### Chips de "Que hacer hoy"

Estos chips representan intencion momentanea, no clasificacion editorial:

- Chill
- Plan tranqui
- Salir un rato
- Tengo frio
- Tengo hambre
- Brunch
- Algo rico
- Algo casual
- Ver gente
- Hablar
- Bailar
- Tomar algo
- Algo romantico
- Con amigos
- En familia
- Pet friendly
- Al aire libre
- Algo cerca
- Sin gastar mucho
- Algo especial

## Datos del lugar

Cada lugar o contenido debe poder almacenar como minimo:

- nombre
- tipo: `place` o `at_home`
- categoria principal
- subcategorias
- descripcion corta
- descripcion larga
- ciudad
- zona
- direccion
- latitud y longitud
- rango de precios
- horarios
- whatsapp
- instagram
- link de menu
- portada
- galeria
- tags
- moods relacionados
- estado activo/inactivo
- flag destacado

## Recomendaciones

Para el MVP no se requiere un sistema de ML. La primera version usara un score hibrido:

- afinidad con intereses del usuario
- cercania geografica
- popularidad
- coincidencia con moods
- refuerzo editorial

Esto permite iterar rapido y medir comportamiento real antes de sofisticar el ranking.

## Dashboard admin

El dashboard administrara tanto `Lugares` como `En casa`.

Funciones MVP:

- crear, editar y desactivar lugares
- subir portada, galeria y documentos
- editar links externos como WhatsApp, Instagram y Menupp
- administrar horarios, precios y metadatos
- asignar categorias, subcategorias, tags y moods

## Roadmap

### Fase 1

- monorepo base
- app mobile
- dashboard admin
- auth
- setup inicial
- explorar
- filtros
- detalle del lugar
- que hacer hoy
- mi cuenta

### Fase 2

- armar parche
- compartir parche
- votacion
- resultados de votacion
- mejoras de recomendaciones
