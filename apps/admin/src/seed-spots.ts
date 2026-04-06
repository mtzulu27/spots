export type AdminType = 'place' | 'event'

export type AdminWeeklyHour = {
  id: string
  dayOfWeek: number
  isClosed: boolean
  openTime: string
  closeTime: string
  splitOpenTime: string
  splitCloseTime: string
}

export type AdminHolidayMode = 'inherit' | 'same_as_sunday' | 'closed' | 'custom'

export type AdminScheduleException = {
  id: string
  date: string
  isClosed: boolean
  openTime: string
  closeTime: string
  splitOpenTime: string
  splitCloseTime: string
  label: string
}

export type AdminSpot = {
  id: string
  spotId: number | null
  branchId: number | null
  placeSlug: string
  branchSlug: string
  type: AdminType
  name: string
  brandName: string
  branchName: string
  neighborhood: string
  hubName: string
  category: string
  city: string
  imageUrl: string
  galleryUrls: string
  interests: string
  minPrice: number
  maxPrice: number
  schedule: string
  instagram: string
  whatsapp: string
  phone: string
  menuUrl: string
  tags: string
  moods: string
  likeCount: number
  distanceKm: number
  active: boolean
  featured: boolean
  description: string
  shortDescription: string
  address: string
  maxPeople: number
  days: string
  latitude: string
  longitude: string
  holidayMode: AdminHolidayMode
  holidayOpenTime: string
  holidayCloseTime: string
  holidaySplitOpenTime: string
  holidaySplitCloseTime: string
  weeklyHours: AdminWeeklyHour[]
  scheduleExceptions: AdminScheduleException[]
}

function withSpotDefaults(
  spot: Omit<
    AdminSpot,
    | 'spotId'
    | 'branchId'
    | 'placeSlug'
    | 'branchSlug'
    | 'address'
    | 'galleryUrls'
    | 'interests'
    | 'maxPeople'
    | 'phone'
    | 'days'
    | 'latitude'
    | 'longitude'
    | 'holidayMode'
    | 'holidayOpenTime'
    | 'holidayCloseTime'
    | 'holidaySplitOpenTime'
    | 'holidaySplitCloseTime'
    | 'weeklyHours'
    | 'scheduleExceptions'
  > &
    Partial<
      Pick<
        AdminSpot,
        | 'spotId'
        | 'branchId'
        | 'placeSlug'
        | 'branchSlug'
        | 'address'
        | 'galleryUrls'
        | 'interests'
        | 'maxPeople'
        | 'phone'
        | 'days'
        | 'latitude'
        | 'longitude'
        | 'holidayMode'
        | 'holidayOpenTime'
        | 'holidayCloseTime'
        | 'holidaySplitOpenTime'
        | 'holidaySplitCloseTime'
        | 'weeklyHours'
        | 'scheduleExceptions'
      >
    >,
): AdminSpot {
  return {
    spotId: null,
    branchId: null,
    placeSlug: spot.id,
    branchSlug: spot.id,
    address: '',
    galleryUrls: '',
    interests: '',
    maxPeople: 6,
    phone: '',
    days: '',
    latitude: '',
    longitude: '',
    holidayMode: 'inherit',
    holidayOpenTime: '',
    holidayCloseTime: '',
    holidaySplitOpenTime: '',
    holidaySplitCloseTime: '',
    weeklyHours: [],
    scheduleExceptions: [],
    ...spot,
  }
}

export const initialSpots: AdminSpot[] = [
  withSpotDefaults({
    id: 'brunchs-house-bio-mall',
    type: 'place',
    name: "Brunch's House",
    brandName: "Brunch's House",
    branchName: 'Ciudad Jardin',
    neighborhood: 'Ciudad Jardin',
    hubName: 'Bio Mall',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    galleryUrls:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    interests: 'Restaurantes,Cafe,Brunch',
    minPrice: 18000,
    maxPrice: 42000,
    schedule: 'Mar-Dom 08:00-16:00',
    instagram: '',
    whatsapp: '',
    menuUrl: '',
    tags: 'brunch, desayuno, cafeteria, panaderia, parche suave',
    moods: 'brunch, chill, cafe, antojo, desayuno',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      "Spot de brunch en Cali para desayunos tardios, cafes y platos reconfortantes. Esta sede queda en Bio Mall, al sur de la ciudad.",
    shortDescription: 'Brunch generoso, panaderia y platos de desayuno para parche suave.',
  }),
  withSpotDefaults({
    id: 'brunchs-house-carrera-29',
    type: 'place',
    name: "Brunch's House",
    brandName: "Brunch's House",
    branchName: 'El Jardin',
    neighborhood: 'El Jardin',
    hubName: '',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80',
    galleryUrls:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    interests: 'Restaurantes,Cafe,Brunch',
    minPrice: 18000,
    maxPrice: 42000,
    schedule: 'Mar-Dom 08:00-16:00',
    instagram: '',
    whatsapp: '',
    menuUrl: '',
    tags: 'brunch, desayuno, cafeteria, panaderia, parche suave',
    moods: 'brunch, chill, cafe, antojo, desayuno',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      "Spot de brunch en Cali para desayunos tardios, cafes y platos reconfortantes. Esta sede queda sobre la carrera 29.",
    shortDescription: 'Brunch generoso, panaderia y platos de desayuno para parche suave.',
  }),
  withSpotDefaults({
    id: 'mantra-coffee-club-granada',
    type: 'place',
    name: 'Mantra Coffee Club',
    brandName: 'Mantra Coffee Club',
    branchName: 'Granada',
    neighborhood: 'Granada',
    hubName: '',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    galleryUrls:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=80, https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
    interests: 'Restaurantes,Cafe,Brunch',
    minPrice: 19900,
    maxPrice: 36000,
    schedule: 'Mar-Dom 08:30-20:00 · Lun Cerrado',
    instagram: 'https://instagram.com/mantracoffee__/',
    whatsapp: 'https://wa.me/573151595600',
    menuUrl: 'https://mantracoffeeclub.com/',
    tags: 'cafe, brunch, granada, postres, work-friendly',
    moods: 'cafe, chill, brunch, frio, algo caliente',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Cafe en Granada ideal para una pausa larga, trabajar un rato o arrancar el dia con brunch y algo dulce. La direccion del venue aparece en listados publicos y eventos alojados alli.',
    shortDescription: 'Cafe de especialidad con perfil brunch en Granada.',
  }),
  withSpotDefaults({
    id: 'luci-bakery-ciudad-jardin',
    type: 'place',
    name: 'Luci Bakery',
    brandName: 'Luci Bakery',
    branchName: 'Ciudad Jardin',
    neighborhood: 'Ciudad Jardin',
    hubName: 'Solaz Plaza',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=80',
    minPrice: 16000,
    maxPrice: 70000,
    schedule:
      'Mar-Mie 07:30-19:30 · Jue 07:30-19:30 · Vie 07:30-22:00 · Sab 08:00-22:00 · Dom 08:00-18:00',
    instagram: 'https://instagram.com/lucibakery/',
    whatsapp: 'https://wa.me/573044226603',
    menuUrl: 'https://www.lucibakery.com/',
    tags: 'bakery, brunch, postres, cakes, ciudad jardin',
    moods: 'dulce, brunch, cafe, romantico, antojo',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: true,
    description:
      'Panaderia y brunch spot de Ciudad Jardin en Solaz Plaza. Tiene reposteria, desayunos, eventos tematicos y una propuesta fuerte para planes en pareja o con amigas.',
    shortDescription: 'Bakery y brunch en Ciudad Jardin con eventos y reposteria especial.',
  }),
  withSpotDefaults({
    id: 'casa-cantera-granada',
    type: 'place',
    name: 'Casa Cantera',
    brandName: 'Casa Cantera',
    branchName: 'Granada',
    neighborhood: 'Granada',
    hubName: '',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80',
    minPrice: 40000,
    maxPrice: 60000,
    schedule: 'Dom 09:00-19:00 · Lun Cerrado · Mar-Vie 15:00-23:00 · Sab 09:00-23:00',
    instagram: 'https://instagram.com/casa.cantera/',
    whatsapp: 'https://wa.me/573217768011',
    menuUrl: 'https://www.rappi.com.co/cali/restaurantes/delivery/300396-casa-cantera',
    tags: 'mexicano, brunch, cocteles, granada, date-night',
    moods: 'tomar algo, con amigos, pareja, brunch, hambre',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: true,
    description:
      'Restaurante en Granada con cocina mexicana, plan de brunch y buena vibra para ir con amigos o en cita. Cargue direccion, telefono e Instagram desde directorios publicos y listings del venue.',
    shortDescription: 'Mexicano en Granada con brunch, cocteles y vibe social.',
  }),
  withSpotDefaults({
    id: 'cafe-gardenia-santa-monica',
    type: 'place',
    name: 'Cafe Gardenia',
    brandName: 'Cafe Gardenia',
    branchName: 'Santa Monica Residencial',
    neighborhood: 'Santa Monica Residencial',
    hubName: '',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80',
    minPrice: 10000,
    maxPrice: 30000,
    schedule: 'Lun-Dom 08:00-20:00',
    instagram: 'https://instagram.com/cafegardenia.cali/',
    whatsapp: 'https://wa.me/573107794126',
    menuUrl: '',
    tags: 'cafe, pasteleria, brunch, santa monica, coffee shop',
    moods: 'cafe, frio, algo caliente, dulce, chill',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Cafe de barrio con pasteleria y brunch en Santa Monica Residencial. Buena opcion para cafe de especialidad, parche calmado y algo dulce en la tarde.',
    shortDescription: 'Cafe, pasteleria y brunch en un ambiente tranquilo del norte.',
  }),
  withSpotDefaults({
    id: 'casa-banana-granada',
    type: 'place',
    name: 'Casa Banana Granada',
    brandName: 'Casa Bananá',
    branchName: 'Granada',
    neighborhood: 'Granada',
    hubName: '',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://scontent.cdninstagram.com/v/t51.82787-15/631592412_18024646208801840_8771553113332950228_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=twqeXXKICvoQ7kNvwGWlD2B&_nc_oc=AdreCxahG_Mj40U-FfuZuPH8uSW-FyOIgAfQwQtbq8p22jqKQegj20dy39Cu6K-BApg&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=klLekJuacKRitOD6ZyRMkg&_nc_ss=7a30f&oh=00_Af24Z7jUnlYbxbSGubhWlrBN41xYsCUmh9MFzQ-RSbkwGw&oe=69D5F2BF',
    galleryUrls:
      'https://scontent.cdninstagram.com/v/t51.82787-15/589955006_18017773931801840_5507576778103146629_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=110&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=MHJbKt6kGGMQ7kNvwGF7s7E&_nc_oc=Adrc0s4w0a1FNjlCkok5IZrr_dI8JV8OQ206Dmfk8xh96JP3A-_rozhe-JVUlKYLDTA&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=Wone5bglhVgsCNtVOgD77Q&_nc_ss=7a30f&oh=00_Af0-AbpVD2g_tp3goJm_XBa190CgD6BIeMlZFyWuHnjOOQ&oe=69D5FA91, https://scontent.cdninstagram.com/v/t51.82787-15/541532139_18006898028801840_7975274611571161065_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=106&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=h_5lpcBBVogQ7kNvwELO3o3&_nc_oc=AdrM-b6theMsZZYuThrVmdoMPvLaMDRGN1K0-AJVfkzARA8nruDXllG5eU20_AHeWxM&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=p4q6jdc8S5jm5nEeh_lP3w&_nc_ss=7a30f&oh=00_Af0Alf6SyY6Gb4T5RP3ZWmAA22buFB7KlCQsDWKYeI43zA&oe=69D5F186, https://scontent.cdninstagram.com/v/t51.71878-15/623654923_1231931508865622_1980990372034898649_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=102&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=oKA3SN4VZ0IQ7kNvwFzpdm6&_nc_oc=AdrIuMLu52_qxSmQSdrVHhLY2CayUYxKB-7LlPJlA_DcPz6rujHvP-qh0ovrnJbibjY&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=L_GQNH_1Rv-8Qsj8BKFEKQ&_nc_ss=7a30f&oh=00_Af2EP7zeyrzNCCwaLeWgelb1LY4RUKqNj33_XiUXKRe2Uw&oe=69D5E0C3, https://scontent.cdninstagram.com/v/t39.30808-6/379284987_17916028004801840_2044567736595314098_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=hqmOjFlW5nMQ7kNvwEgnDxv&_nc_oc=AdrsafxFOjcguQiO5IDqz1Xh77jxAXNy6ahzHzLfgwFObyspD_NWpLgUjNKne49WCcU&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=EWnmXcHDCN_tmJfAPBlf_Q&_nc_ss=7a30f&oh=00_Af1rheCh9uGAqFRM27h7UjqkrrmdXXEdZJKMlI1tKPK72Q&oe=69D601C2',
    minPrice: 18000,
    maxPrice: 38000,
    schedule: 'Lun-Dom 08:00-20:00',
    instagram: 'https://instagram.com/mantracoffee__/',
    whatsapp: 'https://wa.me/573151595600',
    menuUrl: 'https://mantracoffeeclub.com/',
    tags: 'bakery, brunch, postres, granada, cafe',
    moods: 'brunch, dulce, chill, antojo, cafe',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Casa Bananá en Granada para brunch, postres y cafe, con una propuesta de bakery pensada para antojo dulce y parche chill.',
    shortDescription:
      'Bakery y brunch para cafe, postres y antojo dulce en Granada.',
  }),
  withSpotDefaults({
    id: 'casa-banana-puerto-125',
    type: 'place',
    name: 'Casa Banana Pance',
    brandName: 'Casa Bananá',
    branchName: 'Pance',
    neighborhood: 'Pance',
    hubName: 'Puerto 125',
    category: 'Restaurantes',
    city: 'Cali',
    imageUrl:
      'https://scontent.cdninstagram.com/v/t51.82787-15/631592412_18024646208801840_8771553113332950228_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=twqeXXKICvoQ7kNvwGWlD2B&_nc_oc=AdreCxahG_Mj40U-FfuZuPH8uSW-FyOIgAfQwQtbq8p22jqKQegj20dy39Cu6K-BApg&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=klLekJuacKRitOD6ZyRMkg&_nc_ss=7a30f&oh=00_Af24Z7jUnlYbxbSGubhWlrBN41xYsCUmh9MFzQ-RSbkwGw&oe=69D5F2BF',
    galleryUrls:
      'https://scontent.cdninstagram.com/v/t51.82787-15/589955006_18017773931801840_5507576778103146629_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=110&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=MHJbKt6kGGMQ7kNvwGF7s7E&_nc_oc=Adrc0s4w0a1FNjlCkok5IZrr_dI8JV8OQ206Dmfk8xh96JP3A-_rozhe-JVUlKYLDTA&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=Wone5bglhVgsCNtVOgD77Q&_nc_ss=7a30f&oh=00_Af0-AbpVD2g_tp3goJm_XBa190CgD6BIeMlZFyWuHnjOOQ&oe=69D5FA91, https://scontent.cdninstagram.com/v/t51.82787-15/541532139_18006898028801840_7975274611571161065_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=106&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=h_5lpcBBVogQ7kNvwELO3o3&_nc_oc=AdrM-b6theMsZZYuThrVmdoMPvLaMDRGN1K0-AJVfkzARA8nruDXllG5eU20_AHeWxM&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=p4q6jdc8S5jm5nEeh_lP3w&_nc_ss=7a30f&oh=00_Af0Alf6SyY6Gb4T5RP3ZWmAA22buFB7KlCQsDWKYeI43zA&oe=69D5F186, https://scontent.cdninstagram.com/v/t51.71878-15/623654923_1231931508865622_1980990372034898649_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=102&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=oKA3SN4VZ0IQ7kNvwFzpdm6&_nc_oc=AdrIuMLu52_qxSmQSdrVHhLY2CayUYxKB-7LlPJlA_DcPz6rujHvP-qh0ovrnJbibjY&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=L_GQNH_1Rv-8Qsj8BKFEKQ&_nc_ss=7a30f&oh=00_Af2EP7zeyrzNCCwaLeWgelb1LY4RUKqNj33_XiUXKRe2Uw&oe=69D5E0C3, https://scontent.cdninstagram.com/v/t39.30808-6/379284987_17916028004801840_2044567736595314098_n.jpg?stp=c288.0.864.864a_dst-jpg_e35_s640x640_tt6&_nc_cat=111&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0FST1VTRUxfSVRFTS5iZXN0X2ltYWdlX3VybGdlbi5DMyJ9&_nc_ohc=hqmOjFlW5nMQ7kNvwEgnDxv&_nc_oc=AdrsafxFOjcguQiO5IDqz1Xh77jxAXNy6ahzHzLfgwFObyspD_NWpLgUjNKne49WCcU&_nc_zt=23&_nc_ht=scontent.cdninstagram.com&_nc_gid=EWnmXcHDCN_tmJfAPBlf_Q&_nc_ss=7a30f&oh=00_Af1rheCh9uGAqFRM27h7UjqkrrmdXXEdZJKMlI1tKPK72Q&oe=69D601C2',
    minPrice: 18000,
    maxPrice: 38000,
    schedule: 'Lun-Dom 08:00-20:00',
    instagram: '',
    whatsapp: '',
    menuUrl: '',
    tags: 'bakery, brunch, postres, pance, puerto 125',
    moods: 'brunch, dulce, chill, antojo, cafe',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Casa Bananá en Puerto 125, Pance, para brunch, postres y cafe, ideal para un parche suave al sur de la ciudad.',
    shortDescription:
      'Bakery y brunch para cafe, postres y antojo dulce en Puerto 125.',
  }),
  withSpotDefaults({
    id: 'evento-luci-cake-decor-ciudad-jardin',
    type: 'event',
    name: 'Taller de cake decor',
    brandName: 'Luci Bakery',
    branchName: 'Ciudad Jardin',
    neighborhood: 'Ciudad Jardin',
    hubName: 'Solaz Plaza',
    category: 'Eventos',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=1200&q=80',
    minPrice: 85000,
    maxPrice: 85000,
    schedule: 'Sab 10:00-12:30',
    instagram: 'https://instagram.com/lucibakery/',
    whatsapp: 'https://wa.me/573044226603',
    menuUrl: 'https://www.lucibakery.com/',
    tags: 'workshop, cakes, bakery, pareja, amigas',
    moods: 'dulce, pareja, con amigos, brunch, creativo',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: true,
    description:
      'Microevento en Luci Bakery para aprender tecnicas basicas de decoracion de mini cakes, con bebida incluida y ambiente de brunch.',
    shortDescription: 'Workshop dulce para decorar mini cakes y compartir en parche pequeño.',
  }),
  withSpotDefaults({
    id: 'evento-mantra-brew-session-granada',
    type: 'event',
    name: 'Brew session de cafe',
    brandName: 'Mantra Coffee Club',
    branchName: 'Granada',
    neighborhood: 'Granada',
    hubName: '',
    category: 'Eventos',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80',
    minPrice: 45000,
    maxPrice: 45000,
    schedule: 'Jue 18:30-20:00',
    instagram: '',
    whatsapp: '',
    menuUrl: '',
    tags: 'cafe, degustacion, granada, especialidad, after office',
    moods: 'cafe, chill, algo caliente, pareja, con amigos',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Experiencia corta de cafe de especialidad con degustacion y explicacion de metodos manuales. Ideal para plan chill o cita tranquila.',
    shortDescription: 'Sesion guiada para probar metodos de cafe y aprender a preparar mejor tu taza.',
  }),
  withSpotDefaults({
    id: 'evento-casa-cantera-margaritas-granada',
    type: 'event',
    name: 'Noche de margaritas',
    brandName: 'Casa Cantera',
    branchName: 'Granada',
    neighborhood: 'Granada',
    hubName: '',
    category: 'Eventos',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80',
    minPrice: 70000,
    maxPrice: 70000,
    schedule: 'Vie 19:00-21:00',
    instagram: 'https://instagram.com/casa.cantera/',
    whatsapp: 'https://wa.me/573217768011',
    menuUrl: 'https://www.rappi.com.co/cali/restaurantes/delivery/300396-casa-cantera',
    tags: 'cocteles, margaritas, granada, date-night, friends',
    moods: 'tomar algo, con amigos, pareja, bailar',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: true,
    description:
      'Plan social en Casa Cantera con introduccion a cocteleria, margarita de bienvenida y tasting de variaciones de la casa.',
    shortDescription: 'Clase corta + tasting de margaritas para grupos pequenos.',
  }),
  withSpotDefaults({
    id: 'evento-gardenia-brunch-club-santa-monica',
    type: 'event',
    name: 'Brunch club de domingo',
    brandName: 'Cafe Gardenia',
    branchName: 'Santa Monica Residencial',
    neighborhood: 'Santa Monica Residencial',
    hubName: '',
    category: 'Eventos',
    city: 'Cali',
    imageUrl:
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80',
    minPrice: 55000,
    maxPrice: 55000,
    schedule: 'Dom 09:30-12:00',
    instagram: 'https://instagram.com/cafegardenia.cali/',
    whatsapp: 'https://wa.me/573107794126',
    menuUrl: '',
    tags: 'brunch, domingo, cafe, mesa compartida, norte',
    moods: 'brunch, chill, con amigos, pareja',
    likeCount: 0,
    distanceKm: 0,
    active: true,
    featured: false,
    description:
      'Experiencia de domingo con menu de brunch, cafe filtrado y formato de mesa compartida para conocer gente o ir con tu parche.',
    shortDescription: 'Mesa compartida de brunch con menu especial y charla suave.',
  }),
]
