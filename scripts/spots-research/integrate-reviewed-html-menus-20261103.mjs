import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {integrateCatalog} from './integrate-catalog.mjs';
import {scenarioBudget} from '../../apps/mobile/lib/budget-scenarios.ts';

const root='docs/catalog-review/discovery/profiles-20261102',catalog='apps/mobile/public/spots-catalog.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const save=(p,x)=>fs.writeFile(p,JSON.stringify(x,null,2)+'\n');
const sections=[
  ['cocina','mains',`SERRANO & TRUFFA|56900;MAXIMUS|52900;DIAVOLA|49900;ANANAS|49900;MARGHERITA|42900;TARTUFO & PANCETTA|52900;PERAS & BRIE|47900;VELEÑO & QUESO AZUL|45900;QUATTRO FORMAGGI|49900`],
  ['cocina','starters',`RICOTTA CON JAMÓN SERRANO Y MIEL DE TRUFA|40900;TUMACA & SERRANO|38900;RICOTTA CON NUECES CARAMELIZADAS Y ARÁNDANOS|36900;RICOTTA CON TOMATES CHERRY Y PESTO|36900;HUMMUS SALTEADO|44900;PATATAS BRAVAS CON JAMÓN SERRANO|38900;PANCETA CON PATATAS|45900;PATATAS TRUFADAS|38900`],
  ['postres','desserts','TARTA VASCA DE LA CASA|27900'],
  ['cocteles-de-autor','drinks',`CHURCHILL|58900;BALTAZAR|48900;MANDRAKE|48900;SULTÁN CARAJILLO|47900;RAMSES TONIC|49900;KATANA TONIC|49900;MELCHOR|49900;IKIGAI|49900;GASPAR NEGRONI|49900;TRUFFLE MARTINI|55900;KYBALION|49900;KATRINA|49900;DELULU|49900;NAHUAL NEGRONI|52900;SERENDIPITY|44900;GALEÓN DE MANILA|44900;LOTUS MARTINI|52900;JUANA LA LOCA|52900;GURU MULE|47900`],
  ['cocteles-clasicos','drinks',`NEGRONI|59900|HENDRICKS;NEGRONI|52900|BOMBAY;NEGRONI|45900|GORDONS;DRY MARTINI|55900|BOMBAY;DRY MARTINI|45900|GORDONS;PENICILLIN|55900|WOODFORD RESERVE;PENICILLIN|45900|JACK DANIELS NO7;OLD FASHIONED|55900|WOODFORD RESERVE;OLD FASHIONED|45900|JACK DANIELS NO7;MANHATTAN|55900|WOODFORD RESERVE;MANHATTAN|45900|JACK DANIELS NO7;BOULEVARDIER|55900|WOODFORD RESERVE;BOULEVARDIER|45900|JACK DANIELS NO7;BOULEVARDIER|55900|BULLEIT RYE;MARGARITA|52900|HERRADURA SILVER;MARGARITA|79900|PATRÓN CRISTALINO;MARGARITA|59900|PATRÓN REPOSADO;MARGARITA|55900|PATRÓN SILVER;MARGARITA|42900|JIMADOR REPOSADO;MARGARITA|82900|DON JULIO 70;MARGARITA|55900|DON JULIO BLANCO;MOJITO|55900|SANTA TERESA 1796;MOJITO|59900|ZACAPA 23;MOJITO|42900|BACARDI AÑEJO;MOSCOW MULE|55900|GREY GOOSE;MOSCOW MULE|44900|SKY VODKA;LYCHEE MARTINI|55900|GREY GOOSE;LYCHEE MARTINI|44900|SKY VODKA;ESPRESSO MARTINI|55900|GREY GOOSE;ESPRESSO MARTINI|44900|SKY VODKA;APEROL SPRITZ|42900;ST. GERMAIN SPRITZ|55900;GIN SHOT|54900|HENDRICKS;GIN SHOT|40900|BOMBAY;GIN SHOT|32900|GORDONS;TÓNICA FEVER TREE MEDITERRANEAN|19900;TÓNICA MIL 976 OCEAN|16900;GINGER BEER MIL 976|16900;TORONJA MIL 976|16900;TÓNICA CANADA DRY|12900`],
  ['licores','drinks',`MACALLAN 15 DOUBLE CASK|159900|Shot;MACALLAN 12 SHERRY OAK|85900|Shot;MACALLAN 12 DOUBLE CASK|659900|Botella;MACALLAN 12 DOUBLE CASK|69900|Shot;GLENFIDDICH 15|63900|Shot;GLENFIDDICH 12|49900|Shot;TALISKER 10|58900|Shot;GLENMORANGIE LA SANTA 12|599900|Botella;GLENMORANGIE LA SANTA 12|59900|Shot;ARDBEG 10|95900|Shot;GLENLIVET FOUNDERS RESERVE|449900|Botella;GLENLIVET FOUNDERS RESERVE|45900|Shot;JOHNNIE WALKER BLUE LABEL|199900|Shot;CHIVAS MIZUNARA|62900|Shot;BUCHANAN'S MASTER|499900|Botella;BUCHANAN'S MASTER|49900|Shot;WOODFORD RESERVE|449900|Botella;WOODFORD RESERVE|52900|Shot;JACK DANIELS SINGLE BARREL|59900|Shot;JACK DANIELS NO7|349900|Botella;JACK DANIELS NO7|36900|Shot;JAMESON|329900|Botella;JAMESON|36900|Shot;HENDRICKS|549900|Botella;HENDRICKS|54900|Shot;THE BOTANIST|54900|Shot;BOMBAY|379900|Botella;BOMBAY|40900|Shot;GORDONS|32900|Shot;SANTA TERESA 1796|49900;BACARDÍ AÑEJO|199900|Botella;BACARDÍ AÑEJO|32900|Shot;ZACAPA XO|179900|Shot;ZACAPA SOLERA 23|59900|Shot;LA HECHICERA|52900|Shot;HERRADURA SILVER|489900|BOTELLA;HERRADURA SILVER|48900|SHOT;PATRÓN CRISTALINO|79900|Shot;PATRÓN REPOSADO|55900|Shot;PATRÓN SILVER|52900|Shot;JIMADOR REPOSADO|329900|Botella;JIMADOR REPOSADO|34900|Shot;DON JULIO RESERVA 1942|199900|Shot;DON JULIO 70 CRISTALINO|799900|Botella;DON JULIO 70 CRISTALINO|79900|Shot;DON JULIO REPOSADO|589900|Botella;DON JULIO REPOSADO|58900|Shot;DON JULIO BLANCO|499900|Botella;DON JULIO BLANCO|49900|Shot;MEZCAL UNION|449900|BOTELLA;MEZCAL UNION|45900|SHOT;GREY GOOSE|499900|Botella;GREY GOOSE|52900|Shot;SKY VODKA|32900|Shot`],
  ['sodas-italianas','drinks',`SODA ITALIANA DE FRUTOS ROJOS|21900;SODA ITALIANA DE MARACUMANGO|21900;SODA ITALIANA DE JENGIBRE|21900`],
  ['vinos','drinks',`EL ENEMIGO MALBEC|359900;PROTOS RIBERA DEL DUERO ROBLE|199900;PARTAGER VIN ROUGE|139900|Botella;PARTAGER VIN ROUGE|38900|Copa;MARQUES DEL RISCAL ROSADO|179900;PARTAGER VIN ROSE|139900|Botella;PARTAGER VIN ROSE|38900|Copa;PROTOS VERDEJO CUVÉE|199900;PARTAGER VIN BLANC|139900|Botella;PARTAGER VIN BLANC|38900|Copa;CHAMPAGNE DOM PERIGNON BLANC|2499900;CHANDON EXTRA BRUT|189900`],
  ['mocktails','drinks',`ELIXIR VITAE|22900;PRANA TONIC|22900;COLD BREW TONIC|22900;COLD BREW MULE|22900`],
  ['cervezas','drinks',`STELLA ARTOIS|16900;CORONA EXTRA|16900;CLUB COLOMBIA DORADA|14900`],
  ['bebidas','drinks',`BUCHANAN´S DELUXE|499900|BOTELLA;BUCHANAN´S DELUXE|49900|SHOT;ACQUA PANNA|22900;ACQUA SAN PELLEGRINO|22900;AGUA MANANTIAL SIN GAS|10900;COLD BREW|14900;COCA COLA|10900;GINGER ALE|10900;RED BULL|19900`],
];
const files=(await fs.readdir('docs/catalog-review/benchmarks')).filter(f=>/^guruclubroom.com-website-2026-11-03T/.test(f));
const pages=new Map();
for(const file of files)for(const p of (await read(`docs/catalog-review/benchmarks/${file}`)).pages??[])if(p.status==='http_content_extracted')pages.set(p.finalUrl,p);
const items=[];
for(const [section,category,table] of sections) {
  const sourceUrl=`https://guruclubroom.com/menu/guru/${section}`,page=pages.get(sourceUrl);
  assert.ok(page,`Missing source page: ${section}`);
  for(const row of table.split(';')) {
    const [name,amount,presentation='']=row.split('|'),price=Number(amount),literal=new Intl.NumberFormat('es-CO').format(price);
    assert.ok(page.text.includes(name),`Missing name in source: ${name}`);
    assert.ok(page.text.includes(`$${literal}`),`Missing regular price in source: ${name}`);
    items.push({name,price,presentation,category,currency:'COP',sourceUrl,verifiedAt:new Date().toISOString(),menuSection:section,calculationIncluded:true});
  }
}
const line=(name,category)=>({name,category,presentation:'',quantity:1,groupSize:1});
const scenarios=[
  {concept:'Pizza y cerveza',note:'Una pizza y una cerveza por persona; propuesta individual, sin propina.',lines:[line('MARGHERITA','mains'),line('CLUB COLOMBIA DORADA','drinks')]},
  {concept:'Pizza y cóctel de autor',note:'Una pizza y un cóctel por persona, sin propina.',lines:[line('DIAVOLA','mains'),line('GALEÓN DE MANILA','drinks')]},
  {concept:'Pizza, cóctel y postre',note:'Consumo individual propuesto. El restaurante puede actualizar los precios.',lines:[line('SERRANO & TRUFFA','mains'),line('CHURCHILL','drinks'),line('TARTA VASCA DE LA CASA','desserts')]},
];
const totals=scenarios.map(s=>scenarioBudget(items,2,s).perPerson);
assert.ok(totals.every(Number.isFinite)&&totals[0]<totals[1]&&totals[1]<totals[2]);
const current=await read(catalog),spot=current.spots.find(s=>s.slug==='guru-clubroom'),b=current.branches.find(b=>b.spot_id===spot.id);
const data={id:b.id,slug:b.slug,menu_items:items,budget_scenarios:scenarios,min_budget:totals[0],typical_budget:totals[0],max_budget:totals[2],budget_basis:'Parche tranqui: una pizza Margherita y una Club Colombia Dorada por persona. Sin propina.',menu_items_verified_at:new Date().toISOString(),menu_calculation_note:'Diez secciones de la carta oficial revisadas. Tragos, copas y botellas separados; componentes de arma tu gin & tonic no se tratan como un cóctel completo.',missing_fields:(b.missing_fields??[]).filter(x=>x!=='menu_review')};
const input={schemaVersion:1,data:{id:spot.id,slug:spot.slug},write:{mode:'update',fields:[]},branches:[{data,write:{mode:'update',fields:Object.keys(data).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['menu_items','budget_scenarios'],status:'preferred',sources:[...new Set(items.map(i=>i.sourceUrl))],reason:'Transcripción manual revisada por producto, presentación y precio regular.'}],coverage:{menu:'ten_official_sections_reviewed',highlights:'blocked_missing_devtools',googlePlaces:'blocked_missing_api_key'},pending:['Horario de cierre no publicado; no completar por suposición.','Prana Tonic declara CBD en la carta; no atribuir beneficios de salud.']};
await save(`${root}/guruclubroom/menu-consolidated.json`,input);
await save(`${root}/guruclubroom/menu-integration.json`,await integrateCatalog(`${root}/guruclubroom/menu-consolidated.json`,catalog,{}));
console.log(JSON.stringify({place:spot.name,items:items.length,scenarioBudgets:totals}));

const brunchSource='https://primitivosensorial.com/brunch/';
const brunchReport=await read('docs/catalog-review/benchmarks/primitivosensorial.com-website-2026-11-03T05-07-34-956Z.json');
const brunchText=brunchReport.pages[0].text;
const brunchTables=[
  ['Croissants','desserts','Nutella|13100;Clásico Mantequilla|9400;Almendras|13100'],
  ['Fluffy Pancakes','mains','Nutella KitKat|33000;Primitivo|29000;Fresh Fluffy|27000;Tiramisú|29000'],
  ['Repostería','desserts','Vasca Clásica|27000|390 gr, 2 porciones;Vasca Frutos Rojos|32000|390 gr, 2 porciones;Vasca Tiramisú|37000|390 gr, 2 porciones;Vasca Nutella|37000|390 gr, 2 porciones;Carrot Coco Cake|19000;Almojábana Cake|17000;Matilda Cake|19000'],
  ['Fresh Bowls','mains','Parfait|29600;Smoothie & Granola|31200;Porción de fruta|10200'],
  ['Waffles','mains','Wafflebono Primitivo|24000;Burrata|39000;Poché|38000;Maduro & Carne|37000;Maduro Poché|35000'],
  ['Huevos','mains','Primitivo|33000;Croissant Poché|33000;Cremositos|29000;Pesto Burrata|59000|Para 2 personas'],
  ['Tostadas · Masa Madre','mains','Avocado Toast|18000;Tostada aguacate y quesitos|23000;Tostada aguacate, queso y jamón serrano|29000;Cheese Berries|17000'],
  ['Tostadas · Brioche','mains','Brioche & Panceta|35000;Brioche Napolitano|32000;French Toast|27000;Tiramisú Toast|32000'],
  ['Sándwiches','mains','Stracciatella & Mortadella|39000;Cotto & Salami|39000;Cheddar & Costilla|37000;La Gringa|29000;Lomito|45000'],
  ['Mini Cata Sensorial','drinks','Mini Cata Sensorial|37000|2 personas'],
  ['Filtrados','drinks','Aeropress|12900|1.5 tazas;Prensa Francesa|12900|1.5 tazas;V60|12900|1.5 tazas;Origami|13900|1.5 tazas'],
  ['Espresso','drinks','Espresso|7900|Siempre doble;Americano|8600;Macchiato|8900;Flat White|13600;Cappuccino|13600;Latte|12600;Irlandés|19000;Affogato|15900'],
  ['Cold Brew','drinks','El clásico con agua|9600;Con soda|14900;Tropical|14900;Mojito (sin licor)|16400;Frutos rojos|15400;Piña coco|16400'],
  ['Frappe & Iced Lattes','drinks','Frappe / Iced latte sencillo|13600;Frappe / Iced latte caramelo|16900;Frappe / Iced latte tiramisú|18900;Frappe de café y chocolate|19500;Iced Latte milk foam|15900;Iced Strawberry Green Tea Whip Cheese|18900;Iced Americano Cold Foam|15900;Iced Peanut Butter Latte Whip Cheese|19500'],
  ['Matcha','drinks','En agua|12900;Matcha latte caliente|14900;Matcha latte frío|18900;Matcha frappe|18900;Latte Matcha Whipcream|19900'],
  ['Cool Cocktails','drinks','Aperol Spritz|39000|Clásico, frutos rojos o piña-coco;Carajillo|39000;Mimosa|19000'],
  ['Sodas y Jugos','drinks','Sodas saborizadas|16900|Frutos rojos, maracuyá o jamaica tropical;Zumo de naranja|16600;Jugos|14900|Fresa, frutos rojos, maracuyá o jamaica tropical'],
  ['Otras Bebidas sin Café','drinks','Chocolate tradicional|12900|Caliente;Chocolate tradicional|13900|Frappe/Latte;Chocolate premium (con crema batida)|17500|Caliente;Milo|13900|Caliente;Milo|16900|Frappe/Latte;Té chai oregon dulce|13900|Caliente;Té chai oregon dulce|18900|Frappe/Latte;Té chai negro natural sin azúcar|12900|Caliente;Té chai negro natural sin azúcar|17900|Frappe/Latte;Té verde con jengibre y limón|10900|Caliente;Té verde con jengibre y limón|12900|Frappe/Latte;Té negro con fresa y cardamomo|10900|Caliente;Té negro con fresa y cardamomo|12900|Frappe/Latte'],
  ['Hatsu Cervezas & Sodas','drinks','Pola 3 Cordilleras|16000;Pola Club Dorada|16000;Pola Corona|17000;Pola Stella|18500;Soda Hatsu Frambuesa|9800;Soda Bretaña|8000;Ginger Canada Dry|8000;Agua Hatsu sin gas|7000;Agua Hatsu con gas|8000;Gaseosa|8000;Hatsu|14000'],
];
const brunchItems=[];
for(const [section,category,table]of brunchTables)for(const row of table.split(';')) {
  const [name,amount,presentation='']=row.split('|'),price=Number(amount),literal=new Intl.NumberFormat('es-CO').format(price);
  assert.ok(brunchText.includes(name)&&brunchText.includes(`$${literal}`),`Unverified brunch row: ${name}`);
  brunchItems.push({name,price,presentation,category,currency:'COP',menuSection:section,sourceUrl:brunchSource,verifiedAt:new Date().toISOString(),calculationIncluded:true});
}
// The two products called Primitivo belong to different menu sections.
for(const i of brunchItems.filter(i=>i.name==='Primitivo'))i.presentation=i.menuSection;
const bl=(name,category,presentation='')=>({name,category,presentation,quantity:1,groupSize:1});
const brunchScenarios=[
  {concept:'Huevos cremosos y café',note:'Consumo individual propuesto, sin propina.',lines:[bl('Cremositos','mains'),bl('Cappuccino','drinks')]},
  {concept:'Waffle, jugo y vasca compartida',note:'Un waffle y un jugo por persona, con una vasca de dos porciones compartida entre dos, como indica la carta.',lines:[bl('Burrata','mains'),bl('Zumo de naranja','drinks'),{...bl('Vasca Clásica','desserts','390 gr, 2 porciones'),groupSize:2}]},
  {concept:'Sándwich, mini cata y postre',note:'Un sándwich, jugo y postre por persona, con una mini cata para dos. El restaurante puede actualizar los precios.',lines:[bl('Lomito','mains'),{...bl('Mini Cata Sensorial','drinks','2 personas'),groupSize:2},bl('Matilda Cake','desserts'),bl('Jugos','drinks','Fresa, frutos rojos, maracuyá o jamaica tropical')]},
];
const brunchTotals=brunchScenarios.map(s=>scenarioBudget(brunchItems,2,s).perPerson);
assert.ok(brunchTotals.every(Number.isFinite)&&brunchTotals[0]<brunchTotals[1]&&brunchTotals[1]<brunchTotals[2]);
const bc=await read(catalog),bs=bc.spots.find(s=>s.slug==='primitivo-sensorial'),bb=bc.branches.find(b=>b.spot_id===bs.id);
const bd={id:bb.id,slug:bb.slug,menu_url:brunchSource,phone:'+573147338400',whatsapp:'https://wa.me/573147338400',menu_items:brunchItems,budget_scenarios:brunchScenarios,min_budget:brunchTotals[0],typical_budget:brunchTotals[0],max_budget:brunchTotals[2],budget_basis:'Parche tranqui: huevos Cremositos y Cappuccino por persona. Sin propina.',menu_items_verified_at:new Date().toISOString(),menu_calculation_note:'Carta oficial de brunch, no de cine. Vascas de dos porciones, mini cata para dos y filtrados de 1.5 tazas mantienen su presentación. Adiciones opcionales no se incluyen automáticamente.',missing_fields:(bb.missing_fields??[]).filter(k=>k!=='menu_review')};
const bi={schemaVersion:1,data:{id:bs.id,slug:bs.slug},write:{mode:'update',fields:[]},branches:[{data:bd,write:{mode:'update',fields:Object.keys(bd).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['menu_items','budget_scenarios','phone','whatsapp'],source:brunchSource,status:'preferred',reason:'Carta de brunch y WhatsApp publicados en la web oficial; no se mezcla el contacto ni el precio del cine.'}],coverage:{menu:'brunch_inventory_reviewed',googlePlaces:'blocked_missing_api_key',highlights:'blocked_missing_devtools'},pending:['Adiciones opcionales fuera de los escenarios; no se asumen gratuitas.']};
await save(`${root}/primitivorooftop/menu-consolidated.json`,bi);
await save(`${root}/primitivorooftop/menu-integration.json`,await integrateCatalog(`${root}/primitivorooftop/menu-consolidated.json`,catalog,{}));
console.log(JSON.stringify({place:bs.name,items:brunchItems.length,scenarioBudgets:brunchTotals}));

const premierReport=await read('docs/catalog-review/benchmarks/premierwings.niceeat.co-website-2026-11-03T04-38-07-076Z.json');
const premierPage=premierReport.pages.find(p=>p.finalUrl?.includes('/carta/menu-principal'));
const premierTables=[
  ['Entradas','starters','Aros de Cebolla|23000|9 unidades;Deditos de Pollo|28000|5 tiras, incluye papas;Nachos Premier|41000|Para 2 a 3 personas;Papas Premier|29000|150g;Jalapeños Apanados|28000|5 unidades;Cheese Fingers|28000|5 unidades'],
  ['Burgers','mains','Tropical Burger|39000;Carolina Crunchy Burger|39000;Mexican Burger|39000;Cheese Burger|35000;Nashville Burger|40000;La Callejera|42000;Gaucha Burger|40000'],
  ['Cervezas','drinks','Club Colombia|10500;Stella Artois|14000;Honey Ale RH|21000'],
  ['Cocteles de Autor','drinks','Ámbar de los Andes|40000;Pasión Dorada|35000;Pacífico Salvaje|35000;Florinda|40000;Cali Sunset|35000;Guayabito|35000;Sangria Premier|28000|Copa;Mango Royale|35000'],
  ['Malteadas','drinks','Malteada Berry Velvet|20000;Malteada Pistacho Passion|20000;Malteada Dulce Amazonía|20000;Malteada de Chocolate|18000;Malteada Vainilla|18000'],
  ['Sodas Italianas','drinks','Soda Italiana de Lulo y Herbales|18000;Soda Italiana de Frutos Rojos|18000;Soda Italiana de Frutos Amarillos|18000;Soda Italiana Rosa|18000'],
  ['Gaseosas','drinks','Coca-Cola Zero|7900;Coca-Cola 400 mL|7900;Agua Brisa con gas|5900;Agua Brisa sin gas|5900;Soda|8000;Ginger|8000'],
  ['Cocteles Clásicos','drinks','Mojito|30000;Daiquiri|30000;Margarita|30000;Margarita Blue|30000;Shot de Ginebra|28000'],
  ['Pasteleria','desserts','Porcion de Torta|13000;New York Cookies|12000;Alfajores|3000;Cup Cakes|6000;Galleta de Mantequilla|7000;Cookie Monster|12000;Cookie Pie|10000'],
  ['Menú Lunch','mains','Lunch Premier|28900|Pechuga, ensalada, papas y Soda Hatsu'],
  ['Alitas','mains','Alitas|37000|6 piezas, apio y zanahoria'],
];
const premierItems=[];
for(const [section,category,table]of premierTables)for(const row of table.split(';')){
  const [name,amount,presentation='']=row.split('|'),price=Number(amount);
  assert.ok(premierPage.text.includes(name)&&premierPage.text.includes(`$${new Intl.NumberFormat('en-US').format(price)}`),`Unverified Premier row: ${name}`);
  premierItems.push({name,price,presentation,category,currency:'COP',menuSection:section,sourceUrl:premierPage.finalUrl,verifiedAt:new Date().toISOString(),calculationIncluded:true});
}
const premierScenarios=[
  {concept:'Alitas y gaseosa',note:'Seis piezas de alitas con apio y zanahoria y una Coca-Cola de 400 mL por persona. Sin propina.',lines:[bl('Alitas','mains','6 piezas, apio y zanahoria'),bl('Coca-Cola 400 mL','drinks')]},
  {concept:'Alitas, entrada y malteada',note:'Seis alitas y una malteada por persona; una porción de papas Premier compartida entre dos como propuesta, no rendimiento confirmado.',lines:[bl('Alitas','mains','6 piezas, apio y zanahoria'),{...bl('Papas Premier','starters','150g'),groupSize:2},bl('Malteada de Chocolate','drinks')]},
  {concept:'Burger, cóctel y postre',note:'Una burger, un cóctel y una porción de torta por persona. El restaurante puede actualizar los precios.',lines:[bl('La Callejera','mains'),bl('Ámbar de los Andes','drinks'),bl('Porcion de Torta','desserts')]},
];
const premierTotals=premierScenarios.map(s=>scenarioBudget(premierItems,2,s).perPerson);
assert.ok(premierTotals.every(Number.isFinite)&&premierTotals[0]<premierTotals[1]&&premierTotals[1]<premierTotals[2]);
const pc=await read(catalog),ps=pc.spots.find(s=>s.slug==='premier-wings'),pb=pc.branches.find(b=>b.spot_id===ps.id);
const pd={id:pb.id,slug:pb.slug,menu_items:premierItems,budget_scenarios:premierScenarios,min_budget:premierTotals[0],typical_budget:premierTotals[0],max_budget:premierTotals[2],budget_basis:'Parche tranqui: seis alitas con apio y zanahoria, más Coca-Cola de 400 mL por persona. Sin propina.',menu_items_verified_at:new Date().toISOString(),menu_calculation_note:'Carta oficial de Ibiza 122 revisada. El mensaje tienda cerrada describe pedidos en ese momento, no un cierre comercial. Mal de Ojo es una pieza estacional de Halloween y no se utiliza como referencia regular.',missing_fields:(pb.missing_fields??[]).filter(k=>k!=='menu_review')};
const pi={schemaVersion:1,data:{id:ps.id,slug:ps.slug},write:{mode:'update',fields:[]},branches:[{data:pd,write:{mode:'update',fields:Object.keys(pd).filter(k=>!['id','slug'].includes(k))}}],fieldDecisions:[{fields:['menu_items','budget_scenarios'],source:premierPage.finalUrl,status:'preferred',reason:'Precios de la carta oficial de Ibiza 122; se conserva COP como moneda del catálogo de este establecimiento colombiano. Cantidad de alitas explícita en la descripción.'}],coverage:{menu:'fixed_regular_prices_reviewed',googlePlaces:'blocked_missing_api_key',highlights:'blocked_missing_devtools'},pending:[{name:'Mal de Ojo',reason:'seasonal_halloween_product_not_regular_budget_reference'}]};
await save(`${root}/premierwings.co/menu-consolidated.json`,pi);
await save(`${root}/premierwings.co/menu-integration.json`,await integrateCatalog(`${root}/premierwings.co/menu-consolidated.json`,catalog,{}));
console.log(JSON.stringify({place:ps.name,items:premierItems.length,scenarioBudgets:premierTotals}));
