import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';

const root='docs/catalog-review/discovery/profiles-20261102';
const catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const line=(name,category,presentation='')=>({name,category,presentation,quantity:1,groupSize:1});
const scenario=(concept,lines)=>({concept,note:'Consumo individual propuesto con precios regulares de la carta oficial. Sin propina; el restaurante puede actualizar los precios.',lines});
const configs=[
  {username:'thepublegend',slug:'the-pub-legend',file:'legendbar-menupp-links-2026-11-03T05-41-37-247Z.json',locationId:'i94s0UZSrBzh2SJ2vdBn',
    sections:{mains:['BURGERS','CHICKEN WINGS','SANDWICH'],starters:['FINGER FOOD'],extras:['ENCHULADAS'],drinks:['GINEBRA','TEQUILA Y MEZCAL','SANGRIA','VODKA','RON','WHISKY','MIXERS','SODAS ITALIANAS','CERVEZAS','MOCKTAIL','COCTELES DE AUTOR','OTROS','COCTELES CLÁSICOS']},
    scenarios:[
      {concept:'Entrada compartida y cerveza',note:'Una entrada de papas San Francisco compartida entre dos y una Club Colombia Dorada por persona. Rendimiento compartido propuesto, no confirmado. Sin propina.',lines:[{...line('PAPAS SAN FRANCISCO','starters'),groupSize:2},line('CLUB COLOMBIA DORADA','drinks','BOTELLA')]},
      scenario('Burger y cerveza',[line('BURGER JACK FIRE','mains'),line('CLUB COLOMBIA DORADA','drinks','BOTELLA')]),
      {concept:'Burger, cóctel y entrada',note:'Una burger y un cóctel por persona, con una entrada de papas endiabladas compartida entre dos como propuesta, no rendimiento confirmado. El lugar puede actualizar los precios.',lines:[line('BURGER HELLS BELLS','mains'),line('ARCTIC MONKEYS','drinks'),{...line('PAPAS ENDIABLADAS','starters'),groupSize:2}]},
    ],note:'Carta activa enlazada desde el registro oficial legend al nuevo legendbar; ambos declaran thepublegend en Instagram. Presentaciones y precios regulares conservados, productos y variantes desactivados omitidos. Enchuladas son adicionales para el vaso, no bebidas completas. Horario Menupp inactivo no utilizado.'},
  {username:'cielitolindo_co',slug:'cielito-lindo',file:'cielitolindo-menupp-links-2026-11-03T05-16-22-830Z.json',contextMenus:true,
    sections:{mains:['PIZZAS ROJAS','PIZZAS BLANCAS','PIZZAS VERDES','ESPECIALES','ENSALADAS','PASTA','PANINOS','LASAGNA','Desayunos','Especiales','Frutos del Mar','Típicos'],starters:['ENTRADAS'],desserts:['POSTRES','Postres'],extras:['ADICIONALES','Adicionales'],drinks:['BEBIDAS','BEBIDAS CALIENTES','COCTELES Y LICORES','Bebidas calientes','Bebidas']},
    scenarios:[scenario('Desayuno y café',[line('HUEVOS NAPOLITANOS','mains','Menú Desayuno y Almuerzo'),line('CAPUCHINO','drinks','Menú Desayuno y Almuerzo')]),scenario('Pasta y soda italiana',[line('PASTA CARBONARA','mains','Menú Tardeo y Cena'),line('SODA ITALIANA DE LULO','drinks','Menú Tardeo y Cena')]),scenario('Steak, vino y postre',[line('STEAK PIMIENTA','mains','Menú Tardeo y Cena'),line('COPA DE VINO','drinks','Menú Tardeo y Cena'),line('CHEESECAKE FRUTOS ROJOS','desserts','Menú Tardeo y Cena')])],
    note:'Cartas de desayuno/almuerzo y tardeo/cena separadas por presentación de contexto, sin mezclar precios entre servicios. Ofertas 2x1 excluidas por falta de precio regular. No se utilizan horarios inactivos de Menupp.'},
  ...[
    ['tGOmA3ov1L6kVb3MXPUu','bonne-pasteleria-alameda','Menú Alameda'],
    ['9afd75e0-da8b-4ee9-82c8-8938fbb5d72a','bonne-pasteleria-ibiza-122','Menú Pance'],
    ['pnrqrFtaROwPkGNwIGKw','bonne-pasteleria-penon','Menú Peñón'],
  ].map(([locationId,branchSlug,menuName])=>({username:'bonnepasteleria',slug:'bonne-pasteleria',branchSlug,locationId,menus:[menuName],file:'bonnepasteleria-menupp-links-2026-11-03T05-05-39-230Z.json',
    sections:{mains:['Brunch','Brunch Típicos','Brunch todo el día','Pancakes','Panadería Artesanal','Menú Lunch'],starters:['Entradas'],desserts:['Postres y Tortas'],extras:['Adiciones','Actividades'],drinks:['Bebidas Calientes','Bebidas Frías']},
    scenarios:[scenario('Huevos pericos y café',[line('Pericos Clásicos','mains'),line('Cappuccino','drinks')]),scenario(branchSlug.endsWith('penon')?'Huevos trufados y latte':'Huevos hass y latte',[line(branchSlug.endsWith('penon')?'Huevos trufados':'Huevos hass','mains'),line('Café Latte','drinks')]),scenario('Brunch típico, café y postre',[line('Trancao','mains'),line('CapuNutella','drinks'),line('Brownie Caliente con Helado','desserts')])],
    note:'Carta presencial independiente por sede. Menú Prueba y Domicilios excluidos. Actividades opcionales no se suman al presupuesto gastronómico; importes Desde no se tratan como precios cerrados. Horarios de pedidos no se usan como horarios de visita.'})),
  ...[
    ['ea7042fe-5d42-4bfe-8f97-8b12ac0baf32','constantina-pizzeria-ibiza-122','Carta Pance (Ibiza 122)'],
    ['5m1kHrBS2rv0lNvxVvDw','constantina-pizzeria-calle-novena','Carta Calle 9na'],
  ].map(([locationId,branchSlug,menuName])=>{
    const pance=branchSlug.endsWith('ibiza-122');
    return {username:'constantinapizzeria',slug:'constantina-pizzeria',branchSlug,locationId,menus:[menuName],file:'constantinapizzeria-menupp-links-2026-11-03T05-05-52-541Z.json',
      sections:{mains:['Pizzas','Primi (Fettuccine)','Menú para Niños','Panini','Ensalada','Menú Pranzo - Medio día','Pizze Rosse','Panuozzo','Pizze Bianche',"Pizze D' Autore",'Lasagna'],starters:['Antipasti - Entradas','Tabla de Queso','Antipasti'],desserts:['Dolce','Dolci'],drinks:['Birre - Cerveza','Gaseosas Postobon','Hatsu','Cocktails','Sodas Italianas','Sangrías','Gin Tonics','Vini - Vinos','Jugos y Limonadas','LICORES','Licores','Bevande - Bebidas']},
      scenarios:[
        {concept:'Pizza compartida y cerveza',note:'Propuesta de una pizza entre dos y una cerveza por persona. No equivale a rendimiento confirmado por el restaurante.',lines:[{...line(pance?'La Regina Margherita':'Margherita','mains'),groupSize:2},line('Club Colombia Dorada','drinks')]},
        {concept:'Pizza, entrada y cerveza',note:'Propuesta de una pizza y una entrada compartidas entre dos, más una cerveza por persona. Rendimiento compartido propuesto, no confirmado.',lines:[{...line('Constantina','mains'),groupSize:2},{...line(pance?'La Caprese':'Mozzarella e Pomodoro','starters'),groupSize:2},line('Club Colombia Dorada','drinks')]},
        pance?scenario('Pasta, cóctel y postre',[line('La Rosa di Roma (Fettuccine)','mains'),line('Negroni','drinks'),line('Tarta Vasca','desserts','Creme Brulee')]):{concept:'Panuozzo, vino y postre',note:'Un panuozzo y una copa de vino por persona, con una pizza de Nutella compartida entre dos como propuesta, no rendimiento confirmado.',lines:[line('Panuozzo Burrata','mains'),line('Copa Vino Tinto','drinks'),{...line('Pizza Nutella','desserts'),groupSize:2}]},
      ],note:'Carta presencial de la sede indicada, distinta de Domicilios novena. No se extrapolan precios de pizzas entre Pance y Calle Novena. La sede Peñón en registros Menupp no aparece en el perfil actual ni tiene carta activa: existencia actual pendiente, no se crea una sede por ese registro aislado.'};
  }),
  ...[
    ['4JBmt0WtIQtzw5aUsj92','brazz-burger-parque-del-perro','CARTA PARQUE DEL PERRO','M0ZZARELLA FINGERS','CORONA'],
    ['hbawgfMLapXxiopZ44tU','brazz-burger-penon-plaza','CARTA PEÑÓN','Mozzarella fingers','CORONA'],
    ['Rnypzf5nxCkGbxq7hONb','brazz-burger-ciudad-jardin','CARTA CIUDAD JARDÍN y PANCE','Mozzarella fingers','Corona'],
    ['Rnypzf5nxCkGbxq7hONb','brazz-burger-ibiza-122','CARTA CIUDAD JARDÍN y PANCE','Mozzarella fingers','Corona'],
  ].map(([locationId,branchSlug,menuName,fingers,beer])=>({username:'brazzburger',slug:'brazz-burger',branchSlug,locationId,menus:[menuName],file:'brazzburger-menupp-links-2026-11-03T05-05-57-229Z.json',
    sections:{mains:['BURGERS DE AUTOR','PERROS','BURGER MASTER','BURGERS CLÁSICAS','BURGERS DE POLLO','VEGETARIANA','Perros','Burger Master','Burgers de Autor','Vegetariana','Clásicas.','Burgers de Pollo','Hamburguesas Clásicas.','Hamburguesas de Pollo'],starters:['ENTRADAS','Entradas'],extras:['ADICIONES','Adiciones'],drinks:['CERVEZAS','GASEOSAS','Cervezas','Bebidas','Gaseosas','Cocteles']},
    productCategories:{'Queso Mozzarella':'extras','Queso Americano':'extras','Carne Extra':'extras','Guacamole':'extras','Papas':'extras','Cebolla Crispy':'extras','Tocineta':'extras'},
    scenarios:[scenario('Hamburguesa y gaseosa',[line('S91','mains'),line('GASEOSAS','drinks','COCA COLA')]),scenario('Hamburguesa, papas y gaseosa',[line('MÓNACO','mains'),line('Papas','extras'),line('GASEOSAS','drinks','COCA COLA')]),{concept:'Burger de autor y entrada compartida',note:'Una AM y una cerveza por persona. Propuesta de una entrada de mozzarella entre dos; rendimiento compartido no confirmado por el restaurante.',lines:[line('AM','mains'),{...line(fingers,'starters'),groupSize:2},line(beer,'drinks')]}],
    note:'Carta revisada para esta sede. El documento Ciudad Jardín y Pance declara explícitamente ambos puntos; Tienda Camden no se incorpora como otra sede física. Variantes exclusivamente POLLO WEEK excluidas del cálculo.'})),
  ...[
    ['KA02JmhSPeMDi36lMUwO','la-fugitiva-granada'],
    ['jhfJgnsgRrj3ovActhCE','la-fugitiva-dapa'],
  ].map(([locationId,branchSlug])=>({username:'lafugitiva.co',slug:'la-fugitiva',branchSlug,locationId,file:'lafugitiva-menupp-links-2026-11-03T04-37-06-271Z.json',
    sections:{mains:['Pizzas Vegetarianas','Pizzas Clásicas','Pizzas Especiales','Platos Fuertes','Carnes y Pescados','Lasagnas'],starters:['Entradas','Burrata Bar'],desserts:['Postres'],extras:['Adiciones'],drinks:['Bebidas','Bebidas Calientes','Cervezas','Vinos y Sangrias']},
    scenarios:[
      {concept:'Pizza compartida y agua',note:'Una pizza mediana para dos y un agua por persona. La carta indica mediana para 2/3 personas. Sin propina.',lines:[{...line('Hawaiana','mains','Mediana 2/3 personas'),groupSize:2},line('Agua','drinks')]},
      {concept:'Pizza, entrada y bebida',note:'Propuesta: pizza mediana y papas trufadas compartidas entre dos; el rendimiento de la entrada es una propuesta, no porción confirmada. Una limonada de coco por persona.',lines:[{...line('Julia','mains','Mediana 2/3 personas'),groupSize:2},{...line('Papas Trufadas','starters'),groupSize:2},line('Limonada Coco','drinks')]},
      scenario('Lomo y postre',[line('Lomo Fugitivo','mains'),line('Agua','drinks'),line('Brownie con Helado','desserts')]),
    ],note:'Carta independiente por sede; tamaños de pizza y referencias compartidas explícitos. Productos sin categoría de origen, precios ausentes y entretenimiento fuera del presupuesto gastronómico quedan en evidencia, no se inventa su clasificación.'})),
  ...[
    ['ob9Jw0kGpoWha7XIf4OY','palo-mulata-san-antonio'],
    ['a6HVlSG26Cn7hFY6FjSr','palo-mulata-lago-verde'],
  ].map(([locationId,branchSlug])=>({username:'palomulata',slug:'palo-mulata',branchSlug,locationId,menus:['Menú'],file:'palomulata-menupp-links-2026-11-03T04-38-23-770Z.json',
    productCategories:{Campari:'drinks',Aperol:'drinks'},
    sections:{mains:['Pescados & Mariscos','Ensaladas','Hamburguesas','Cortes de Carne','PALOMULATA BURGUER','Aves','Sopas'],starters:['Entradas'],desserts:['Postres'],drinks:['VINOS TINTOS','SODAS ITALIANAS','CÓCTELES CLÁSICOS','TEQUILAS','RON','Bebidas','GINEBRA','LIMONADAS','CERVEZAS','WHISKY','CÓCTELES DE AUTOR','DIGESTIVOS','APERITIVOS','AGUAS','COGNAC & BRANDY','VINOS ROSADOS','VODKA','CHAMPAGNE & ESPUMOSOS','VINOS BLANCOS']},
    scenarios:[scenario('Hamburguesa de la casa y agua',[line('Palomulata','mains'),line('Agua Manantial','drinks')]),scenario('Pollo romesco y soda',[line('Pollo Romesco','mains'),line('Piña','drinks')]),scenario('Corte de carne, aperitivo y postre',[line('Picaña','mains','Cortes 400g'),line('Aperol Spritz','drinks'),line('Cheesecake de Nutella','desserts')])],
    note:'Menú en español leído por sede. Corte 400g, corte 1kg para tres, copas, tragos y botellas se mantienen separados; no se reparten cortes entre personas sin propuesta explícita. No se copia una carta de la otra sede.'})),
  ...[
    ['3FbhaLcFEHQirbK3ApsG','capriatto-granada-cali'],
    ['7t2lERHCJyInGm8UymrC','capriatto-mall-la-leyenda-cali'],
  ].map(([locationId,branchSlug])=>({username:'cappriato',slug:'capriatto',branchSlug,locationId,file:'cappriato-menupp-links-2026-11-03T04-37-46-287Z.json',
    sections:{mains:['Sandwiches','Combo Lunch'],starters:['Entradas'],desserts:['Postres'],drinks:['Bebidas','Bebidas con Licor']},
    scenarios:[scenario('Sándwich y gaseosa',[line('CASCHETTO CONFITADO','mains'),line('COCA COLA','drinks','Regular')]),scenario('Sándwich, soda y postre',[line('TRE PISTACCHIO','mains'),line('SODA DE FRUTOS ROJOS','drinks'),line('CHEESECAKE DE PISTACHO','desserts')]),scenario('Sándwich, aperitivo y postre',[line('NUVOLA AL TARTUFO','mains'),line('APEROL SPRITZ','drinks'),line('TORTA DE CHOCOLATE','desserts')])],
    note:'Carta de esta sede revisada de manera independiente. Combo Lunch no se utiliza sin confirmar horario y contenido; tablas compartidas no se convierten en consumo individual. Adiciones y vaso michelado no son platos o bebidas completas.'})),
  {username:'piropo.rest',slug:'piropo',file:'piropo-menupp-links-2026-11-03T04-36-45-325Z.json',
    sections:{mains:['PIROPOS DE LA CALLE','POLLO','PIROPOS CLÁSICOS','PIROPAZOS','ARROCES','CARNE','PIROPOS ORIGINALES','CERDO','MAR'],starters:['ENTRADAS CALIENTES','ENTRADAS FRIAS','ENTRADAS EXPRESS','FRITANGA'],desserts:['POSTRES','MECATO'],drinks:['BEBIDAS','Jarras','BEBIDAS CON Y SIN CAFÉ','COCTELES DE AUTOR','Bebidas','SIN LICOR','CON LICOR']},
    scenarios:[scenario('Tazón caleño y soda',[line('SABROSO','mains','Una carne desmechada'),line('Sodas Caleñas','drinks','Sandia')]),scenario('Chuleta valluna y soda',[line('CHULETA VALLUNA','mains'),line('Sodas Caleñas','drinks','Sandia')]),scenario('Lomo, cóctel y postre',[line('LOMO JOVITA','mains'),line('Cachesuda','drinks'),line('Flan de Pandebono','desserts')])],
    note:'Productos repetidos deduplicados por nombre, categoría y presentación. Importes contradictorios o con escala ambigua (Torta de Chontaduro a 19.5) excluidos; no se elige automáticamente entre precios. Adiciones separadas de platos.'},
  {username:'caffedamoreco',slug:'caffe-damore',file:'casadamore-menupp-links-2026-11-03T04-36-56-960Z.json',
    sections:{mains:['Panini y Hamburguesas','Brunch e Colazione','Panetteria','Secondi','Carnes Premium','Pasta e Risotti','Pizzas','Insalate'],starters:['Antipasti'],desserts:['Brunch Dolci','Dolci Tentazioni','Gelato Artigianale'],extras:['Salsas','Acompañamientos'],drinks:['BIRRA','APERITIVOS & DIGESTIVOS','ESPUMANTE','Bebidas Calientes','Cócteles Clásicos','GINEBRA','Cócteles con Café','BLANCO','WHISKEY','TINTO','Sodas','TEQUILA & MEZCAL','RON','Otras Bebidas','Cócteles','Sangrías','Bebidas Frías','VODKA','Jugos','COGNAC','ROSADO']},
    scenarios:[scenario('Croissant de prosciutto y café',[line('Croissant de Prosciutto','mains'),line('Cappuccino','drinks')]),scenario('Pasta, soda y tiramisú',[line('Pasta al Limón & Gamberi','mains'),line('Soda de Lulo','drinks'),line('Tiramisú tradicional','desserts','PERSONAL')]),scenario('Salmón, vino y tiramisú',[line('Salmone al Pesto di Pistacchio','mains'),line('Asio Otus','drinks','COPA'),line('Tiramisú tradicional','desserts','PERSONAL')])],
    note:'Menús oficiales de bebidas, comidas y postres revisados. Botella, copa y trago separados. Amore al Cioccolato personal tiene importes contradictorios entre menús y se excluye; no se utiliza una torta entera como porción individual.'},
  {username:'criollan_lovers',slug:'criollan-lovers',file:'criollanlovers-menupp-links-2026-11-03T04-36-14-530Z.json',menus:['Menú'],
    sections:{mains:['Causas','Ceviches','Ensaladas','Veggie/Vegan','De la casa','Apanaditos','Menú infantil (combo)','Sopitas','Arroz chaufa'],starters:['Entradas'],desserts:['Postres'],extras:['Mayonesas','Adiciones Personales'],drinks:['Vinos','Cócteles Clásicos','Licores','Coctelería de autor','Bebidas','Sodas Naturales','Mocktails','Cerveza Importada','Sangrías','Experiencias','Cerveza Artesanal','Juniper Sodas','Cerveza nacional']},
    productCategories:{'Lomo Saltado':'mains','Pollo Saltado':'mains'},
    scenarios:[scenario('Causa de pollo y agua',[line('Pollo','mains','Causas'),line('Agua','drinks','Con y Sin Gas')]),scenario('Milanesa y soda natural',[line('Milanesa de Pollo','mains','Pollo'),line('Flor Jamaica y Piña','drinks')]),scenario('Arroz del Pacífico, cóctel y postre',[line('Arroz Pacífico','mains'),line('Vichemule','drinks'),line('Brownie con helado','desserts')])],
    note:'Carta en español de San Antonio revisada. Menú en inglés no duplicado. Promociones omitidas; se toma el precio normal de Cri-ollitas, no el descuento. Las mayonesas y adiciones no representan un plato completo.'},
];
for(const config of configs.filter(c=>!process.argv[2]||c.username===process.argv[2])) {
  const raw=await read(`docs/catalog-review/benchmarks/${config.file}`),verifiedAt=new Date().toISOString();
  const mapping=new Map(Object.entries(config.sections).flatMap(([kind,names])=>names.map(name=>[name,kind])));
  const index=new Map(),omitted=[];
  for(const menu of raw.menus.filter(m=>(!config.menus||config.menus.includes(m.metadata.name))&&(!config.locationId||m.locationId===config.locationId))) {
    assert.equal(menu.metadata.currency?.value,'COP','Currency not verified');
    const categories=new Map(menu.categories.map(c=>[c.id,c]));
    for(const product of menu.products) {
      const section=categories.get(product.product_category),name=product.product_name?.trim();
      if(product.disabled||section?.disabled||categories.get(section?.hierarchy)?.disabled)continue;
      if(/\b2\s*[x×]\s*1\b/i.test(name??'')){omitted.push({name,reason:'promotional_only_regular_price_unknown'});continue;}
      if(/promo/i.test(section?.name??'')){omitted.push({name,reason:'promotional_only'});continue;}
      const kind=mapping.get(section?.name?.trim())??config.productCategories?.[name];
      if(!kind){omitted.push({name,reason:'unmapped_category'});continue;}
      const variants=Array.isArray(product.price)?product.price:[typeof product.price==='object'?product.price:{price:product.price,label:''}];
      for(const variant of variants) {
        if(!variant||variant.disable)continue;
        if(/^Desde$/i.test(variant.label?.trim()??'')){omitted.push({name,reason:'price_lower_bound_not_exact'});continue;}
        if(/POLLO WEEK/i.test(variant.label??'')){omitted.push({name,reason:'promotional_variant_regular_price_unconfirmed'});continue;}
        const price=Number(variant.price);
        const presentation=config.contextMenus?[variant.label?.trim(),menu.metadata.name].filter(Boolean).join(' · '):(section?.name==='Combo Lunch'||(config.slug==='criollan-lovers'&&name==='Pollo'&&!variant.label?.trim()))?section.name.trim():variant.label?.trim()??'';
        if(!Number.isFinite(price)||price<=0||!Number.isInteger(price)){omitted.push({name,presentation,reason:'unusable_or_ambiguous_price'});continue;}
        const category=/adici[oó]n|saborizantes|adicional/i.test(presentation)||['ZUMO DE LIMÓN','VASO MICHELADO'].includes(name)?'extras':kind;
        const item={name,category,presentation,price,currency:'COP',menuSection:section?.name?.trim()??'Platos',sourceUrl:menu.source,sourceProductId:product.id,verifiedAt,calculationIncluded:true};
        const key=JSON.stringify([name.toLocaleLowerCase('es'),category,presentation.toLocaleLowerCase('es')]);
        const prior=index.get(key);
        if(prior){if(prior.price!==price){prior.conflict=true;omitted.push({name,presentation,reason:'conflicting_regular_prices'});}continue;}
        index.set(key,item);
      }
    }
  }
  const items=[...index.values()].filter(i=>!i.conflict);
  const totals=config.scenarios.map(s=>s.lines.reduce((sum,l)=>{
    const found=items.filter(i=>i.name===l.name&&i.category===l.category&&i.presentation===l.presentation);
    assert.equal(found.length,1,`${config.slug}: missing/ambiguous ${l.name}/${l.presentation}`);
    return sum+found[0].price*Math.ceil(2/l.groupSize)*l.quantity/2;
  },0));
  assert.ok(totals[0]<totals[1]&&totals[1]<totals[2]);
  const current=await read(catalog),spot=current.spots.find(s=>s.slug===config.slug),branches=current.branches.filter(b=>b.spot_id===spot.id&&(!config.branchSlug||b.slug===config.branchSlug));
  assert.equal(branches.length,1,'This reviewed source covers one specific branch only');
  const branch=branches[0],data={id:branch.id,slug:branch.slug,menu_items:items,menu_items_verified_at:verifiedAt,budget_scenarios:config.scenarios,min_budget:totals[0],typical_budget:totals[0],max_budget:totals[2],budget_basis:`Parche tranqui: ${config.scenarios[0].concept}. Consumo individual propuesto, sin propina.`,menu_calculation_note:config.note,missing_fields:(branch.missing_fields??[]).filter(k=>k!=='menu_review')};
  const input={schemaVersion:1,data:{id:spot.id,slug:spot.slug},write:{mode:'update',fields:[]},branches:[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['menu_items','budget_scenarios','min_budget','typical_budget','max_budget','budget_basis'],source:raw.source,status:'preferred',consultedAt:verifiedAt,reason:'Precios regulares y presentaciones revisados por el agente. Escenarios explícitos sin promedios.'}],coverage:{menu:'active_menu_inventory_reviewed_with_documented_omissions',googlePlaces:'blocked_missing_api_key',highlights:'blocked_missing_devtools'},pending:omitted};
  const prefix=config.branchSlug?`menu-${config.branchSlug}`:'menu';
  await save(`${root}/${config.username}/${prefix}-consolidated.json`,input);
  await save(`${root}/${config.username}/${prefix}-review.json`,{source:raw.source,verifiedAt,items:items.length,omitted,scenarioBudgets:totals});
  await save(`${root}/${config.username}/${prefix}-integration.json`,await integrateCatalog(`${root}/${config.username}/${prefix}-consolidated.json`,catalog,{}));
  console.log(JSON.stringify({slug:spot.slug,items:items.length,omissions:omitted.length,scenarioBudgets:totals}));
}
