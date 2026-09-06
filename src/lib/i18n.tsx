import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type LangCode = 'en' | 'fil' | 'ceb'

export const LANGUAGES: { code: LangCode; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fil', label: 'Filipino', short: 'FIL' },
  { code: 'ceb', label: 'Cebuano (Bisaya)', short: 'CEB' },
]

const STORAGE_KEY = 'boardease_lang'

type Dict = Record<string, string>

const en: Dict = {
  'nav.explore': 'Explore',
  'nav.locations': 'Locations',
  'nav.categories': 'Categories',
  'nav.howItWorks': 'How it works',
  'nav.dashboard': 'Dashboard',
  'nav.signIn': 'Sign in',
  'nav.logOut': 'Log out',
  'nav.language': 'Language',

  'hero.badge': 'The smartest way to find & manage boarding houses in Siquijor',
  'hero.titleBefore': 'Find Your Perfect',
  'hero.titleHighlight': 'Boarding House',
  'hero.titleAfter': 'in Siquijor.',
  'hero.subtitle':
    'Search, compare, review, and rent trusted boarding houses while helping landlords manage everything in one smart platform.',
  'hero.searchNow': 'Search now',
  'hero.exploreListings': 'Explore listings',
  'hero.statListings': 'Verified listings',
  'hero.statRating': 'Average rating',
  'hero.statBoarders': 'Happy boarders',
  'hero.verifiedLandlord': 'Verified landlord',
  'hero.checkedApproved': 'Checked & approved',
  'hero.bedsLeft': 'Only 2 beds left this week',
  'hero.municipality': 'Municipality',
  'hero.roomType': 'Room type',
  'hero.maxRent': 'Max rent',
  'hero.search': 'Search',
  'hero.popular': 'Popular:',
  'hero.anywhere': 'Anywhere',
  'hero.anyType': 'Any type',
  'hero.anyBudget': 'Any budget',
  'hero.bedspace': 'Bedspace',
  'hero.single': 'Single',
  'hero.double': 'Double',
  'hero.studio': 'Studio',

  'featured.eyebrow': 'Handpicked for you',
  'featured.title': 'Featured Boarding Houses',
  'featured.subtitle': 'Verified, top-rated homes loved by students and professionals across the island.',
  'featured.viewAll': 'View all',

  'locations.eyebrow': 'Explore the island',
  'locations.title': 'Popular Locations in Siquijor',
  'locations.subtitle':
    'From the sunset strip in San Juan to the heritage homes of Lazi — find a place that fits your rhythm.',
  'locations.houses': 'boarding house',
  'locations.housesPlural': 'boarding houses',

  'categories.eyebrow': 'Browse by need',
  'categories.title': 'Find Your Kind of Stay',
  'categories.subtitle': "Filter the island's boarding houses by what matters most to you.",
  'categories.bedspace': 'Bedspace',
  'categories.bedspaceDesc': 'Budget-friendly shared rooms',
  'categories.private': 'Private Rooms',
  'categories.privateDesc': 'Your own space & lock',
  'categories.aircon': 'With Aircon',
  'categories.airconDesc': 'Beat the Siquijor heat',
  'categories.female': 'Female Only',
  'categories.femaleDesc': 'All-female dormitories',
  'categories.school': 'Near School',
  'categories.schoolDesc': 'Walk to your campus',
  'categories.wifi': 'Fast WiFi',
  'categories.wifiDesc': 'Built for online classes',
  'categories.parking': 'With Parking',
  'categories.parkingDesc': 'Safe space for your ride',
  'categories.gcash': 'Pay via GCash',
  'categories.gcashDesc': 'Digital receipts & records',

  'stats.eyebrow': 'Why BoardEase',
  'stats.title': 'Everything Landlords Need to Run Their Boarding House',
  'stats.subtitle':
    'Stop juggling notebooks and spreadsheets. BoardEase turns your daily operations into a single, intelligent dashboard.',
  'stats.onTime': 'on-time collections',
  'stats.listed': 'Boarding houses listed',
  'stats.served': 'Happy boarders served',
  'stats.collections': 'On-time rent collections',
  'stats.municipalities': 'Municipalities covered',
  'stats.aiTitle': 'AI-powered management',
  'stats.aiDesc': 'Ask anything — "who hasn\'t paid?" — and get instant answers from your data.',
  'stats.analyticsTitle': 'Real-time analytics',
  'stats.analyticsDesc': 'Occupancy, revenue, and growth forecasts updated automatically every day.',
  'stats.receiptsTitle': 'Automated receipts & reminders',
  'stats.receiptsDesc': 'GCash-ready digital receipts and smart due-date reminders for tenants.',
  'stats.trustedTitle': 'Trusted & verified',
  'stats.trustedDesc': 'Verified landlords, real reviews, and transparent pricing — no surprises.',

  'testimonials.eyebrow': 'Loved across the island',
  'testimonials.title': 'What Boarders & Landlords Say',
  'testimonials.subtitle':
    'Real stories from the students, professionals, and property owners who use BoardEase every day.',

  'cta.badge': 'Ready when you are',
  'cta.title': 'Find Your Home — or Start Managing Yours — Today',
  'cta.subtitle':
    'Join hundreds of boarders and landlords across Siquijor using BoardEase to find homes, collect rent, and grow with confidence.',
  'cta.browse': 'Browse boarding houses',
  'cta.dashboard': 'Open landlord dashboard',

  'footer.tagline':
    'The smart way to discover and manage boarding houses in Siquijor — trusted by boarders, students, and landlords across the island.',
  'footer.explore': 'Explore',
  'footer.landlords': 'For Landlords',
  'footer.company': 'Company',
  'footer.stayLoop': 'Stay in the loop',
  'footer.newsletter': 'New boarding houses & island tips, once a month.',
  'footer.subscribe': 'Subscribe',
  'footer.rights': 'All rights reserved.',

  'settings.language': 'Language',
  'settings.languageHint': 'Choose the language used across BoardEase.',
}

const fil: Dict = {
  ...en,
  'nav.explore': 'Tuklasin',
  'nav.locations': 'Mga Lokasyon',
  'nav.categories': 'Mga Kategorya',
  'nav.howItWorks': 'Paano ito gumagana',
  'nav.dashboard': 'Dashboard',
  'nav.signIn': 'Mag-sign in',
  'nav.logOut': 'Mag-log out',
  'nav.language': 'Wika',

  'hero.badge': 'Ang pinakamatalinong paraan para humanap at pamahalaan ng boarding house sa Siquijor',
  'hero.titleBefore': 'Hanapin ang Iyong Perpektong',
  'hero.titleHighlight': 'Boarding House',
  'hero.titleAfter': 'sa Siquijor.',
  'hero.subtitle':
    'Maghanap, maghambing, mag-review, at umupa ng mapagkakatiwalaang boarding house habang tinutulungan ang mga landlord na pamahalaan ang lahat sa isang smart na plataporma.',
  'hero.searchNow': 'Maghanap ngayon',
  'hero.exploreListings': 'Tuklasin ang mga listing',
  'hero.statListings': 'Beripikadong listing',
  'hero.statRating': 'Average na rating',
  'hero.statBoarders': 'Masayang boarder',
  'hero.verifiedLandlord': 'Beripikadong landlord',
  'hero.checkedApproved': 'Nasuri at aprubado',
  'hero.bedsLeft': '2 kama na lang ang natitira ngayong linggo',
  'hero.municipality': 'Munisipalidad',
  'hero.roomType': 'Uri ng kuwarto',
  'hero.maxRent': 'Max na renta',
  'hero.search': 'Maghanap',
  'hero.popular': 'Sikat:',
  'hero.anywhere': 'Kahit saan',
  'hero.anyType': 'Anumang uri',
  'hero.anyBudget': 'Anumang budget',
  'hero.bedspace': 'Bedspace',
  'hero.single': 'Single',
  'hero.double': 'Double',
  'hero.studio': 'Studio',

  'featured.eyebrow': 'Pinili para sa iyo',
  'featured.title': 'Mga Tampok na Boarding House',
  'featured.subtitle': 'Beripikado at top-rated na tahanan na minamahal ng mga estudyante at propesyonal sa isla.',
  'featured.viewAll': 'Tingnan lahat',

  'locations.eyebrow': 'Tuklasin ang isla',
  'locations.title': 'Sikat na Lokasyon sa Siquijor',
  'locations.subtitle':
    'Mula sa sunset strip ng San Juan hanggang sa heritage homes ng Lazi — humanap ng lugar na bagay sa iyo.',
  'locations.houses': 'boarding house',
  'locations.housesPlural': 'mga boarding house',

  'categories.eyebrow': 'Mag-browse ayon sa pangangailangan',
  'categories.title': 'Hanapin ang Uri ng Stay Mo',
  'categories.subtitle': 'I-filter ang mga boarding house ayon sa mahalaga sa iyo.',
  'categories.bedspace': 'Bedspace',
  'categories.bedspaceDesc': 'Abot-kayang shared rooms',
  'categories.private': 'Pribadong Kuwarto',
  'categories.privateDesc': 'Sariling espasyo at kandado',
  'categories.aircon': 'May Aircon',
  'categories.airconDesc': 'Labas sa init ng Siquijor',
  'categories.female': 'Babae Lamang',
  'categories.femaleDesc': 'All-female dormitory',
  'categories.school': 'Malapit sa Paaralan',
  'categories.schoolDesc': 'Lakarin papunta sa campus',
  'categories.wifi': 'Mabilis na WiFi',
  'categories.wifiDesc': 'Para sa online class',
  'categories.parking': 'May Parking',
  'categories.parkingDesc': 'Ligtas na espasyo para sa sasakyan',
  'categories.gcash': 'Bayad via GCash',
  'categories.gcashDesc': 'Digital na resibo at record',

  'stats.eyebrow': 'Bakit BoardEase',
  'stats.title': 'Lahat ng Kailangan ng Landlord para Patakbuhin ang Boarding House',
  'stats.subtitle':
    'Itigil ang paghahalo ng notebooks at spreadsheets. Ginagawang isang intelligent dashboard ng BoardEase ang iyong araw-araw na operasyon.',
  'stats.onTime': 'on-time na koleksyon',
  'stats.listed': 'Mga boarding house na naka-lista',
  'stats.served': 'Masayang boarder na naseserbisyuhan',
  'stats.collections': 'On-time na koleksyon ng renta',
  'stats.municipalities': 'Munisipalidad na nasasakupan',
  'stats.aiTitle': 'AI-powered na pamamahala',
  'stats.aiDesc': 'Magtanong ng kahit ano — "sino ang hindi pa bayad?" — at makakuha agad ng sagot mula sa data mo.',
  'stats.analyticsTitle': 'Real-time analytics',
  'stats.analyticsDesc': 'Occupancy, kita, at growth forecast na awtomatikong ina-update araw-araw.',
  'stats.receiptsTitle': 'Automated na resibo at paalala',
  'stats.receiptsDesc': 'GCash-ready digital receipts at smart due-date reminders para sa mga tenant.',
  'stats.trustedTitle': 'Mapagkakatiwalaan at beripikado',
  'stats.trustedDesc': 'Beripikadong landlord, totoong review, at transparent na presyo — walang sorpresa.',

  'testimonials.eyebrow': 'Minamahal sa buong isla',
  'testimonials.title': 'Sinasabi ng mga Boarder at Landlord',
  'testimonials.subtitle':
    'Totoong kwento mula sa mga estudyante, propesyonal, at may-ari ng property na gumagamit ng BoardEase araw-araw.',

  'cta.badge': 'Handa kapag handa ka na',
  'cta.title': 'Hanapin ang Iyong Tahanan — o Simulang Pamahalaan ang Iyo — Ngayon',
  'cta.subtitle':
    'Sumali sa daan-daang boarder at landlord sa Siquijor na gumagamit ng BoardEase para humanap ng tahanan, mangolekta ng renta, at lumago nang may kumpiyansa.',
  'cta.browse': 'Mag-browse ng boarding house',
  'cta.dashboard': 'Buksan ang landlord dashboard',

  'footer.tagline':
    'Ang smart na paraan para matuklasan at pamahalaan ang boarding house sa Siquijor — pinagkakatiwalaan ng mga boarder, estudyante, at landlord sa buong isla.',
  'footer.explore': 'Tuklasin',
  'footer.landlords': 'Para sa mga Landlord',
  'footer.company': 'Kumpanya',
  'footer.stayLoop': 'Manatiling updated',
  'footer.newsletter': 'Bagong boarding house at tip sa isla, isang beses sa isang buwan.',
  'footer.subscribe': 'Mag-subscribe',
  'footer.rights': 'Lahat ng karapatan ay nakalaan.',

  'settings.language': 'Wika',
  'settings.languageHint': 'Piliin ang wikang gagamitin sa buong BoardEase.',
}

const ceb: Dict = {
  ...en,
  'nav.explore': 'Susiha',
  'nav.locations': 'Mga Lokasyon',
  'nav.categories': 'Mga Kategoriya',
  'nav.howItWorks': 'Unsa kini molihok',
  'nav.dashboard': 'Dashboard',
  'nav.signIn': 'Sign in',
  'nav.logOut': 'Log out',
  'nav.language': 'Pinulongan',

  'hero.badge': 'Ang labing maalamon nga paagi sa pagpangita ug pagdumala sa boarding house sa Siquijor',
  'hero.titleBefore': 'Pangitaa ang Imong Perpekto nga',
  'hero.titleHighlight': 'Boarding House',
  'hero.titleAfter': 'sa Siquijor.',
  'hero.subtitle':
    'Pangita, itandi, i-review, ug abangan ang kasaligang boarding house samtang gitabangan ang mga landlord sa pagdumala sa tanan sa usa ka smart nga plataporma.',
  'hero.searchNow': 'Pangita karon',
  'hero.exploreListings': 'Susiha ang mga listing',
  'hero.statListings': 'Verified nga listings',
  'hero.statRating': 'Average nga rating',
  'hero.statBoarders': 'Malipayong boarders',
  'hero.verifiedLandlord': 'Verified nga landlord',
  'hero.checkedApproved': 'Gisusi ug giaprobahan',
  'hero.bedsLeft': '2 ka higdaanan na lang ning semana',
  'hero.municipality': 'Munisipalidad',
  'hero.roomType': 'Klase sa kwarto',
  'hero.maxRent': 'Max nga abang',
  'hero.search': 'Pangita',
  'hero.popular': 'Popular:',
  'hero.anywhere': 'Bisan asa',
  'hero.anyType': 'Bisan unsang klase',
  'hero.anyBudget': 'Bisan unsang budget',
  'hero.bedspace': 'Bedspace',
  'hero.single': 'Single',
  'hero.double': 'Double',
  'hero.studio': 'Studio',

  'featured.eyebrow': 'Gipili para nimo',
  'featured.title': 'Featured nga Boarding Houses',
  'featured.subtitle': 'Verified ug top-rated nga mga balay nga giganahan sa mga estudyante ug propesyonal sa isla.',
  'featured.viewAll': 'Tan-awa tanan',

  'locations.eyebrow': 'Susiha ang isla',
  'locations.title': 'Popular nga Lokasyon sa Siquijor',
  'locations.subtitle':
    'Gikan sa sunset strip sa San Juan hangtod sa heritage homes sa Lazi — pangitaa ang lugar nga angay nimo.',
  'locations.houses': 'boarding house',
  'locations.housesPlural': 'mga boarding house',

  'categories.eyebrow': 'Browse sumala sa kinahanglan',
  'categories.title': 'Pangitaa ang Imong Klase sa Stay',
  'categories.subtitle': 'I-filter ang mga boarding house sumala sa importante nimo.',
  'categories.bedspace': 'Bedspace',
  'categories.bedspaceDesc': 'Barato nga shared rooms',
  'categories.private': 'Private nga Kwarto',
  'categories.privateDesc': 'Imong kaugalingong luna ug kandado',
  'categories.aircon': 'Adunay Aircon',
  'categories.airconDesc': 'Batokan ang kainit sa Siquijor',
  'categories.female': 'Babaye Lamang',
  'categories.femaleDesc': 'All-female dormitory',
  'categories.school': 'Duol sa Eskwelahan',
  'categories.schoolDesc': 'Laktan ngadto sa campus',
  'categories.wifi': 'Paspas nga WiFi',
  'categories.wifiDesc': 'Para sa online class',
  'categories.parking': 'Adunay Parking',
  'categories.parkingDesc': 'Luwas nga luna para sa imong sakyanan',
  'categories.gcash': 'Bayad via GCash',
  'categories.gcashDesc': 'Digital nga resibo ug records',

  'stats.eyebrow': 'Ngano BoardEase',
  'stats.title': 'Tanan nga Kinahanglan sa Landlord aron Padagan ang Boarding House',
  'stats.subtitle':
    'Hunonga ang pagdumala gamit notebooks ug spreadsheets. Ang BoardEase maghimo sa imong adlaw-adlaw nga operasyon ngadto sa usa ka intelligent dashboard.',
  'stats.onTime': 'on-time nga koleksyon',
  'stats.listed': 'Mga boarding house nga nalista',
  'stats.served': 'Malipayong boarders nga naserbisyuhan',
  'stats.collections': 'On-time nga koleksyon sa abang',
  'stats.municipalities': 'Munisipalidad nga nasakupan',
  'stats.aiTitle': 'AI-powered nga pagdumala',
  'stats.aiDesc': 'Pangutana bisan unsa — "kinsa wala pa bayad?" — ug makakuha dayon og tubag gikan sa imong data.',
  'stats.analyticsTitle': 'Real-time analytics',
  'stats.analyticsDesc': 'Occupancy, kita, ug growth forecast nga awtomatikong gi-update matag adlaw.',
  'stats.receiptsTitle': 'Automated nga resibo ug pahinumdom',
  'stats.receiptsDesc': 'GCash-ready digital receipts ug smart due-date reminders para sa mga tenant.',
  'stats.trustedTitle': 'Kasligan ug verified',
  'stats.trustedDesc': 'Verified nga landlords, tinuod nga reviews, ug transparent nga presyo — walay surprise.',

  'testimonials.eyebrow': 'Giganahan sa tibuok isla',
  'testimonials.title': 'Unsay Giingon sa mga Boarder ug Landlord',
  'testimonials.subtitle':
    'Tinuod nga mga istorya gikan sa mga estudyante, propesyonal, ug tag-iya sa property nga naggamit sa BoardEase matag adlaw.',

  'cta.badge': 'Andam kung andam ka na',
  'cta.title': 'Pangitaa ang Imong Balay — o Sugdi ang Pagdumala — Karon',
  'cta.subtitle':
    'Apil sa gatosan ka boarders ug landlords sa Siquijor nga naggamit sa BoardEase aron mangita og balay, mangolekta og abang, ug motubo nga may pagsalig.',
  'cta.browse': 'Browse sa mga boarding house',
  'cta.dashboard': 'Ablihi ang landlord dashboard',

  'footer.tagline':
    'Ang smart nga paagi sa pagdiskubre ug pagdumala sa boarding house sa Siquijor — gisaligan sa mga boarder, estudyante, ug landlord sa tibuok isla.',
  'footer.explore': 'Susiha',
  'footer.landlords': 'Para sa mga Landlord',
  'footer.company': 'Kumpanya',
  'footer.stayLoop': 'Magpabilin nga updated',
  'footer.newsletter': 'Bagong boarding house ug tip sa isla, kausa sa usa ka bulan.',
  'footer.subscribe': 'Subscribe',
  'footer.rights': 'Tanang katungod gitagana.',

  'settings.language': 'Pinulongan',
  'settings.languageHint': 'Pilia ang pinulongan nga gamiton sa tibuok BoardEase.',
}

const DICTS: Record<LangCode, Dict> = { en, fil, ceb }

function loadLang(): LangCode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'en' || raw === 'fil' || raw === 'ceb') return raw
  } catch {
    /* ignore */
  }
  return 'en'
}

interface LanguageState {
  lang: LangCode
  setLang: (code: LangCode) => void
  t: (key: string) => string
  languages: typeof LANGUAGES
}

const LanguageContext = createContext<LanguageState | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>(loadLang)

  const setLang = useCallback((code: LangCode) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'fil' ? 'fil' : lang === 'ceb' ? 'ceb' : 'en'
  }, [lang])

  const t = useCallback(
    (key: string) => DICTS[lang][key] ?? DICTS.en[key] ?? key,
    [lang],
  )

  const value = useMemo(
    () => ({ lang, setLang, t, languages: LANGUAGES }),
    [lang, setLang, t],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
