import { l, type InvitationDoc, type Section, type LText } from "@/features/invitations/doc";

export type EventType =
  | "wedding" | "engagement" | "birthday" | "anniversary" | "housewarming" | "religious" | "funeral" | "corporate" | "graduation" | "custom";

export const EVENT_TYPES: { value: EventType; label: LText }[] = [
  { value: "wedding", label: l("ពិធីមង្គលការ", "Wedding") },
  { value: "engagement", label: l("ពិធីភ្ជាប់ពាក្យ", "Engagement") },
  { value: "birthday", label: l("ខួបកំណើត", "Birthday") },
  { value: "anniversary", label: l("ខួបអាពាហ៍ពិពាហ៍", "Anniversary") },
  { value: "housewarming", label: l("ពិធីឡើងផ្ទះថ្មី", "Housewarming") },
  { value: "religious", label: l("ពិធីបុណ្យសាសនា", "Religious ceremony") },
  { value: "funeral", label: l("សេចក្ដីជូនដំណឹងបុណ្យសព", "Funeral notice") },
  { value: "corporate", label: l("ព្រឹត្តិការណ៍ក្រុមហ៊ុន", "Corporate event") },
  { value: "graduation", label: l("ពិធីបញ្ចប់ការសិក្សា", "Graduation") },
  { value: "custom", label: l("កម្មវិធីផ្សេងៗ", "Custom event") },
];

export type Family =
  | "royal" | "ivory" | "temple" | "lotus" | "emerald" | "silk" | "palmleaf" | "editorial" | "festive" | "village" | "memorial" | "marble" | "moonlit" | "curtains";

export type KhmerFont = "moul" | "moulpali" | "dangrek" | "kantumruy" | "battambang" | "notoSerif";
export type LatinFont = "cormorant" | "playfair" | "pinyon" | "inter";

export type Palette = { bg: string; surface: string; ink: string; muted: string; primary: string; accent: string; onPrimary: string };

export type TemplateDef = {
  slug: string;
  name: LText;
  description: LText;
  category: EventType;
  family: Family;
  style: "traditional" | "luxury" | "modern" | "minimal" | "floral" | "festive" | "solemn";
  color: "red" | "gold" | "ivory" | "navy" | "pink" | "green" | "black" | "brown" | "white" | "saffron" | "purple";
  tier: "free" | "premium";
  featured?: boolean;
  palette: Palette;
  fonts: { display: KhmerFont; body: KhmerFont; latin: LatinFont };
  envelope: { body: string; flap: string; seal: string; liner: string };
  version: number;
};

const P = (bg: string, surface: string, ink: string, muted: string, primary: string, accent: string, onPrimary: string): Palette => ({
  bg, surface, ink, muted, primary, accent, onPrimary,
});

export const MOONLIT_SAMPLE_PHOTO = "placeholder:moonlit-jasmine";
export const CURTAINS_SAMPLE_COVER = "placeholder:curtains-cover";
export const CURTAINS_SAMPLE_AUDIO = "placeholder:curtains-audio";
export const CLASSIC_SAMPLE_AUDIO = "placeholder:classic-audio";

export const TEMPLATES: TemplateDef[] = [
  {
    slug: "champagne-curtains", version: 1, category: "wedding", family: "curtains", style: "luxury", color: "gold", tier: "free", featured: true,
    name: l("វាំងននសូត្រ និងក្បាច់មាស", "Champagne Curtains"),
    description: l("ផ្ទៃវាំងននភ្លើងព្រិច ផ្កាកុលាបស្រាល ស៊ុមឈ្មោះក្បាច់មាស និងផ្កាធ្លាក់ — រចនាបែបទំនើប និងប្រពៃណីខ្មែរ", "Sheer fairy-lit curtains, blush roses, golden kbach name banner, squircle countdown, and falling rose petals"),
    palette: P("#FAF6F0", "#FFFDF9", "#4A3A28", "#8A7355", "#B08E4F", "#E9A96E", "#FFFFFF"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#EFE3CF", flap: "#E5D3B5", seal: "#B08E4F", liner: "#E9A96E" },
  },
  {
    slug: "classic-floral", version: 1, category: "wedding", family: "ivory", style: "floral", color: "ivory", tier: "premium", featured: true,
    name: l("ក្លាស៊ីក (ចុចបើក)", "Classic Floral"),
    description: l("ផ្ទៃផ្កាពណ៌ទឹកមាសមានចលនា រូបគំនូរកូនកំលោះ-កូនក្រមុំ ស៊ុមមាសបុរាណ និងផ្កាធ្លាក់", "Animated watercolor floral backdrop, illustrated bride & groom portraits, gold monogram crest, and falling petals"),
    palette: P("#FAF5EE", "#FFFDF9", "#5A3E1F", "#866742", "#C4914F", "#D09D5A", "#FFFFFF"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#F3EAE0", flap: "#E9DAC8", seal: "#C4914F", liner: "#D09D5A" },
  },
  {
    slug: "navy-scratch", version: 1, category: "wedding", family: "temple", style: "luxury", color: "navy", tier: "premium", featured: true,
    name: l("កោសបើក ស្លាយរូបភាព (Blue)", "Royal Navy Scratch"),
    description: l("ផ្ទៃខៀវចាស់ក្បាច់ខ្មែរ កោសបើកស៊ុមមាស បង្ហាញស្លាយរូបភាព និងក្បាច់មាសប្រណិត", "Deep navy kbach pattern with a gold scratch-to-open gate and photo slideshow"),
    palette: P("#0B1A3A", "#10234A", "#FFF3D2", "#9FB0CE", "#F0D48F", "#C99A4B", "#0B1A3A"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#0B1A3A", flap: "#142954", seal: "#F0D48F", liner: "#C99A4B" },
  },
  {
    slug: "crimson-lovestory", version: 1, category: "wedding", family: "royal", style: "traditional", color: "red", tier: "premium", featured: true,
    name: l("កោសបើក Love Story", "Crimson Love Story"),
    description: l("ផ្ទៃក្រហមឈាមជ្រូកក្បាច់មាស កោសបើកធៀប និងរឿងរ៉ាវស្នេហាដ៏ផ្អែមល្ហែម", "Deep crimson kbach pattern with a gold scratch-to-open gate and Love Story chapters"),
    palette: P("#8A1A27", "#711520", "#FFF3D2", "#DFB3B8", "#F0D48F", "#D4A95A", "#5A1119"),
    fonts: { display: "moul", body: "battambang", latin: "cormorant" },
    envelope: { body: "#8A1A27", flap: "#711520", seal: "#F0D48F", liner: "#D4A95A" },
  },
  {
    slug: "ivory-scratch-lite", version: 1, category: "wedding", family: "ivory", style: "luxury", color: "ivory", tier: "premium", featured: true,
    name: l("កោសបើក ស្លាយរូបភាព (Lite)", "Ivory Scratch Lite"),
    description: l("ផ្ទៃពណ៌ភ្លុកដំរីក្បាច់ខ្មែរ កោសបើកស៊ុមប្រាក់ និងរចនាបថមាសសំរិទ្ធ", "Warm ivory kbach backdrop with a silver scratch-to-open oval and bronze-gold typography"),
    palette: P("#E4E0DB", "#FFFDF9", "#5A3E1F", "#8A7355", "#B4813F", "#D09D5A", "#FFFFFF"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#E4E0DB", flap: "#D8D1C7", seal: "#B4813F", liner: "#D09D5A" },
  },
  {
    slug: "champagne-scratch", version: 1, category: "wedding", family: "curtains", style: "floral", color: "gold", tier: "premium", featured: true,
    name: l("កោសបើក - Scratch", "Champagne Scratch"),
    description: l("កោសបើកស៊ុមប្រាក់ ដើម្បីបង្ហាញផ្ទាំងវាំងននសូត្រ ផ្កាកុលាប និងក្បាច់មាស", "Silver scratch-to-open gate revealing the champagne curtains & gold kbach invitation"),
    palette: P("#FAF6F0", "#FFFDF9", "#4A3A28", "#8A7355", "#B08E4F", "#E9A96E", "#FFFFFF"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#E4E0DB", flap: "#D8D1C7", seal: "#B08E4F", liner: "#E9A96E" },
  },
  {
    slug: "marble-rose", version: 1, category: "wedding", family: "marble", style: "floral", color: "red", tier: "free", featured: true,
    name: l("ថ្មម៉ាប និងផ្កាកុលាបក្រហមទុំ", "Marble & Burgundy Rose"),
    description: l("ផ្ទៃថ្មម៉ាបស ផ្កាកុលាបពណ៌ក្រហមទុំ ស្លឹកអ៊ឺកាលីប និងស៊ុមមាស — ដូចធៀបបោះពុម្ពបែបខ្មែរ ព្រមទាំងផែនទីផ្លូវ និងលេខទូរស័ព្ទម្ចាស់កម្មវិធី", "White marble, burgundy roses, eucalyptus and a fine gold frame — like a classic printed Khmer card, with a directions map and host phone numbers"),
    palette: P("#F6F3F0", "#FFFFFF", "#4A1622", "#7E5F64", "#7A1F32", "#B8893E", "#FFFFFF"),
    fonts: { display: "moul", body: "battambang", latin: "pinyon" },
    envelope: { body: "#EFE7E1", flap: "#E6DAD2", seal: "#7A1F32", liner: "#B8893E" },
  },
  {
    slug: "moonlit-jasmine", version: 1, category: "wedding", family: "moonlit", style: "floral", color: "purple", tier: "free", featured: true,
    name: l("ម្លិះក្រោមពន្លឺចន្ទ", "Moonlit Jasmine"),
    description: l("ស៊ុមរូបថតលើផ្ទៃពណ៌ស្វាយចាស់ ជាមួយពណ៌លីឡាក់ស្រាល និងផ្កាម្លិះ សម្រាប់ពិធីមង្គលការពេលល្ងាច", "A framed portrait, pearl lettering, and softly lit jasmine against midnight plum for an evening wedding"),
    palette: P("#171223", "#251B32", "#F9F3F8", "#CFC2DA", "#E3C6EB", "#EDE3C9", "#26182E"),
    fonts: { display: "moulpali", body: "battambang", latin: "cormorant" },
    envelope: { body: "#372343", flap: "#422C51", seal: "#876191", liner: "#E3C6EB" },
  },
  {
    slug: "royal-khmer", version: 1, category: "wedding", family: "royal", style: "traditional", color: "red", tier: "premium", featured: true,
    name: l("រាជវង្សខ្មែរ", "Royal Khmer"),
    description: l("ក្រហមព្រះរាជវាំង និងក្បាច់មាសអង្គរ សម្រាប់ពិធីមង្គលការបែបប្រពៃណីដ៏ឧឡារិក", "Palace red with gold kbach Angkor framing for a grand traditional wedding"),
    palette: P("#5E0F14", "#6F151B", "#F6E7C8", "#D9BE8A", "#D4A64A", "#F1D592", "#3A0A0D"),
    fonts: { display: "moul", body: "battambang", latin: "cormorant" },
    envelope: { body: "#7A1A20", flap: "#8E2128", seal: "#C9973C", liner: "#D4A64A" },
  },
  {
    slug: "ivory-champagne", version: 1, category: "wedding", family: "ivory", style: "luxury", color: "ivory", tier: "free", featured: true,
    name: l("ភ្លុកដំរី និងស្រាសំប៉ាញ", "Ivory & Champagne"),
    description: l("ក្រដាសពណ៌ភ្លុក បន្ទាត់មាសស្ដើង និងរូបថតក្នុងស៊ុមទ្វារប្រាសាទ", "Ivory paper, hairline gold rules and arch-framed portraits"),
    palette: P("#F7F1E6", "#FFFBF3", "#3B2F24", "#8A7660", "#B68A45", "#E8D3A8", "#FFFFFF"),
    fonts: { display: "moulpali", body: "kantumruy", latin: "cormorant" },
    envelope: { body: "#EFE4D0", flap: "#E6D6B9", seal: "#9C2A2A", liner: "#B68A45" },
  },
  {
    slug: "angkor-twilight", version: 1, category: "wedding", family: "temple", style: "luxury", color: "navy", tier: "premium", featured: true,
    name: l("អង្គរពេលព្រលប់", "Angkor Twilight"),
    description: l("មេឃពេលព្រលប់ពណ៌ខៀវចាស់ ស្រមោលប្រាសាទអង្គរ និងផ្កាយមាស", "Deep twilight blue, an Angkor silhouette and gold starlight"),
    palette: P("#0E1630", "#16213F", "#F2E9D8", "#AFA68F", "#CFA855", "#F3D98B", "#0E1630"),
    fonts: { display: "moul", body: "kantumruy", latin: "playfair" },
    envelope: { body: "#1A2548", flap: "#202D57", seal: "#CFA855", liner: "#CFA855" },
  },
  {
    slug: "lotus-blush", version: 1, category: "wedding", family: "lotus", style: "floral", color: "pink", tier: "free",
    name: l("ផ្កាឈូកពណ៌ផ្កាឈូក", "Lotus Blush"),
    description: l("ផ្កាឈូកទន់ភ្លន់ ពណ៌ផ្កាឈូកស្រាល និងមាសកុលាប", "Soft lotus blooms in blush and rose gold"),
    palette: P("#FBEFEF", "#FFF8F7", "#4A2A30", "#9C7178", "#C0767F", "#E7B9A2", "#FFFFFF"),
    fonts: { display: "moulpali", body: "battambang", latin: "pinyon" },
    envelope: { body: "#F3D9D9", flap: "#EECACC", seal: "#B5636D", liner: "#E7B9A2" },
  },
  {
    slug: "emerald-phni-tes", version: 1, category: "wedding", family: "emerald", style: "traditional", color: "green", tier: "premium",
    name: l("មរកតភ្ញីទេស", "Emerald Phni Tes"),
    description: l("បៃតងមរកត និងវល្លិក្បាច់ភ្ញីទេសរុំព័ទ្ធ ប្លង់ពីរជួរបែបទំនើប", "Emerald green with intertwining phni tes vines in a modern split layout"),
    palette: P("#0F3B2E", "#134838", "#F3EBD7", "#B9C7B6", "#C9A24E", "#E9D08C", "#0F3B2E"),
    fonts: { display: "moul", body: "kantumruy", latin: "cormorant" },
    envelope: { body: "#155040", flap: "#1A5C49", seal: "#C9A24E", liner: "#C9A24E" },
  },
  {
    slug: "sampot-silk", version: 1, category: "wedding", family: "silk", style: "traditional", color: "red", tier: "premium",
    name: l("សំពត់ហូល", "Sampot Silk"),
    description: l("បំផុសគំនិតពីក្បាច់ត្បាញសំពត់ហូល ពណ៌ឆ្អៅ និងក្រហមជ្រៅ", "Inspired by woven hol silk bands in saffron and deep madder"),
    palette: P("#F5ECDD", "#FFF7EA", "#3E1B12", "#8B6A5A", "#9A2D1F", "#D9A23B", "#FFF7EA"),
    fonts: { display: "moul", body: "battambang", latin: "playfair" },
    envelope: { body: "#9A2D1F", flap: "#B23A28", seal: "#D9A23B", liner: "#D9A23B" },
  },
  {
    slug: "slek-rith", version: 1, category: "wedding", family: "palmleaf", style: "traditional", color: "brown", tier: "premium", featured: true,
    name: l("សាស្ត្រាស្លឹករឹត", "Palm-Leaf Manuscript"),
    description: l("រចនាដូចសាស្ត្រាស្លឹករឹតបុរាណ — ព័ត៌មាននីមួយៗសរសេរលើស្លឹកដាច់ៗ", "Each detail inscribed on its own palm-leaf strip, like an old Khmer manuscript"),
    palette: P("#EADBC0", "#F4E7CD", "#3A2A17", "#7A6446", "#7B4A1E", "#B07A3A", "#F4E7CD"),
    fonts: { display: "moulpali", body: "notoSerif", latin: "cormorant" },
    envelope: { body: "#C9A774", flap: "#BC9963", seal: "#7B4A1E", liner: "#7B4A1E" },
  },
  {
    slug: "modern-minimal", version: 1, category: "wedding", family: "editorial", style: "minimal", color: "white", tier: "free",
    name: l("ទំនើប សាមញ្ញ", "Modern Minimal"),
    description: l("អក្សរធំ ប្លង់បែបទស្សនាវដ្ដី ពណ៌ស-ខ្មៅ និងមាសតិចតួច", "Big type, magazine grid, black-on-white with a whisper of gold"),
    palette: P("#FFFFFF", "#F6F5F2", "#151515", "#6E6E6E", "#151515", "#B68A45", "#FFFFFF"),
    fonts: { display: "kantumruy", body: "kantumruy", latin: "inter" },
    envelope: { body: "#F1EFEA", flap: "#E8E5DE", seal: "#151515", liner: "#B68A45" },
  },
  {
    slug: "black-gold", version: 1, category: "wedding", family: "temple", style: "luxury", color: "black", tier: "premium",
    name: l("ខ្មៅ និងមាស", "Black & Gold"),
    description: l("ពណ៌ខ្មៅជ្រៅ និងមាសភ្លឺ សម្រាប់រាត្រីជប់លៀងដ៏ប្រណិត", "Ink black and bright gold for a glamorous evening reception"),
    palette: P("#0B0B0C", "#151517", "#F3E6C4", "#A59A80", "#D9B45A", "#F5D98A", "#0B0B0C"),
    fonts: { display: "moul", body: "kantumruy", latin: "playfair" },
    envelope: { body: "#18181A", flap: "#202023", seal: "#D9B45A", liner: "#D9B45A" },
  },
  {
    slug: "sla-dok-engagement", version: 1, category: "engagement", family: "lotus", style: "floral", color: "green", tier: "free",
    name: l("ស្លាធម៌ ភ្ជាប់ពាក្យ", "Sla Dok Engagement"),
    description: l("ពណ៌បៃតងស្លាម្លូ និងផ្កាឈូកស សម្រាប់ពិធីភ្ជាប់ពាក្យ", "Betel-leaf sage and white lotus for the engagement ceremony"),
    palette: P("#EEF2E6", "#F8FAF3", "#26331F", "#6F7D64", "#5E7A4A", "#C9B27A", "#FFFFFF"),
    fonts: { display: "moulpali", body: "battambang", latin: "pinyon" },
    envelope: { body: "#DCE5CF", flap: "#D1DCC1", seal: "#5E7A4A", liner: "#C9B27A" },
  },
  {
    slug: "festive-birthday", version: 1, category: "birthday", family: "festive", style: "festive", color: "pink", tier: "free",
    name: l("ខួបកំណើតសប្បាយ", "Festive Birthday"),
    description: l("ពណ៌ស្រស់ ផ្កាចន្ទតូចៗរាយប៉ាយ និងអក្សរធំដិត", "Bright colours, scattered chan-flower confetti and bold type"),
    palette: P("#FFF6E9", "#FFFFFF", "#2B1B3D", "#6D5C7E", "#E2553B", "#F4B63F", "#FFFFFF"),
    fonts: { display: "dangrek", body: "kantumruy", latin: "playfair" },
    envelope: { body: "#F4B63F", flap: "#E2553B", seal: "#2B1B3D", liner: "#4BA3A0" },
  },
  {
    slug: "golden-anniversary", version: 1, category: "anniversary", family: "ivory", style: "luxury", color: "gold", tier: "free",
    name: l("ខួបមាស", "Golden Anniversary"),
    description: l("ពណ៌មាសកក់ក្ដៅ សម្រាប់អបអរខួបអាពាហ៍ពិពាហ៍", "Warm gold tones to celebrate years together"),
    palette: P("#F8F0DF", "#FFF9EC", "#3D2E1A", "#8C7756", "#A8792F", "#E3C27A", "#FFFFFF"),
    fonts: { display: "moulpali", body: "battambang", latin: "pinyon" },
    envelope: { body: "#EAD9B4", flap: "#E0CB9F", seal: "#A8792F", liner: "#A8792F" },
  },
  {
    slug: "new-home-village", version: 1, category: "housewarming", family: "village", style: "modern", color: "green", tier: "free",
    name: l("ផ្ទះថ្មី វាលស្រែ", "Rice-Field Home"),
    description: l("ដើមត្នោត វាលស្រែ និងពណ៌ធម្មជាតិ សម្រាប់ពិធីឡើងផ្ទះថ្មី", "Sugar palms and paddy greens for a housewarming"),
    palette: P("#F3F1E4", "#FFFDF3", "#2A3520", "#6B7559", "#3F6B3A", "#D8A93E", "#FFFFFF"),
    fonts: { display: "dangrek", body: "kantumruy", latin: "playfair" },
    envelope: { body: "#D7DFC1", flap: "#C9D3AF", seal: "#3F6B3A", liner: "#D8A93E" },
  },
  {
    slug: "kathina-saffron", version: 1, category: "religious", family: "temple", style: "traditional", color: "saffron", tier: "free",
    name: l("កឋិនទាន ពណ៌ចីវរ", "Kathina Saffron"),
    description: l("ពណ៌ចីវរ និងស្រមោលវិហារ សម្រាប់ពិធីបុណ្យកឋិន ផ្កាប្រាក់ និងបុណ្យនានា", "Robe saffron with a temple silhouette for Kathina and merit ceremonies"),
    palette: P("#7A3A0C", "#8A4511", "#FFF1D6", "#F0C98A", "#F2B441", "#FFD97A", "#5A2A08"),
    fonts: { display: "moul", body: "battambang", latin: "cormorant" },
    envelope: { body: "#9A4E14", flap: "#B05A18", seal: "#F2B441", liner: "#F2B441" },
  },
  {
    slug: "memorial-lotus", version: 1, category: "funeral", family: "memorial", style: "solemn", color: "white", tier: "free",
    name: l("ផ្កាឈូកស រំលឹក", "White Lotus Memorial"),
    description: l("ស្ងប់ស្ងាត់ សមរម្យ ពណ៌ស-ប្រផេះ គ្មានចលនាឬភ្លេងដោយស្វ័យប្រវត្តិ", "Quiet and respectful in white and grey, with no autoplay music or flourish"),
    palette: P("#F4F4F2", "#FFFFFF", "#2B2B2B", "#6F6F6F", "#4A4A4A", "#9A9A9A", "#FFFFFF"),
    fonts: { display: "moulpali", body: "battambang", latin: "cormorant" },
    envelope: { body: "#E7E7E4", flap: "#DDDDDA", seal: "#4A4A4A", liner: "#9A9A9A" },
  },
  {
    slug: "corporate-modern", version: 1, category: "corporate", family: "editorial", style: "modern", color: "navy", tier: "free",
    name: l("ក្រុមហ៊ុនទំនើប", "Corporate Modern"),
    description: l("ស្អាត មានរបៀប សម្រាប់សន្និសីទ ការបើកសម្ពោធ និងព្រឹត្តិការណ៍អាជីវកម្ម", "Clean and structured for launches, conferences and grand openings"),
    palette: P("#F5F7FB", "#FFFFFF", "#0F1B33", "#5A6478", "#1E3A6E", "#C79A3C", "#FFFFFF"),
    fonts: { display: "kantumruy", body: "kantumruy", latin: "inter" },
    envelope: { body: "#1E3A6E", flap: "#24457F", seal: "#C79A3C", liner: "#C79A3C" },
  },
  {
    slug: "graduation-honours", version: 1, category: "graduation", family: "editorial", style: "modern", color: "navy", tier: "free",
    name: l("អបអរសាទរថ្ងៃបញ្ចប់ការសិក្សា", "Graduation Honours"),
    description: l("ពណ៌ខៀវចាស់ និងមាសសម្រាប់ពិធីប្រគល់សញ្ញាបត្រ ឬពិធីជប់លៀងអបអរសាទរ", "Midnight blue and gold for a commencement ceremony or graduation celebration"),
    palette: P("#F1F3F8", "#FFFFFF", "#141D35", "#505D73", "#243553", "#B98B45", "#FFFFFF"),
    fonts: { display: "kantumruy", body: "kantumruy", latin: "playfair" },
    envelope: { body: "#243553", flap: "#32486A", seal: "#B98B45", liner: "#F3E4C8" },
  },
  {
    slug: "garden-gathering", version: 1, category: "custom", family: "emerald", style: "floral", color: "green", tier: "free",
    name: l("ជួបជុំក្នុងសួន", "Garden Gathering"),
    description: l("ស្លឹកបៃតង និងផ្ទៃពណ៌ភ្លុកសម្រាប់ពិធីជួបជុំ ឬកម្មវិធីផ្ទាល់ខ្លួន", "Botanical details and warm ivory for gatherings and custom events"),
    palette: P("#F5F2E8", "#FFFCF4", "#263B2E", "#526457", "#315440", "#9D7444", "#FFFFFF"),
    fonts: { display: "moulpali", body: "battambang", latin: "cormorant" },
    envelope: { body: "#DFE6D5", flap: "#CEDAC4", seal: "#315440", liner: "#C9A872" },
  },
];

export function getTemplate(slug: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.slug === slug);
}

/* ---------------- Sample / starter content ---------------- */

let n = 0;
const sid = (p: string) => `${p}${++n}`;

const WEDDING_SCHEDULE = [
  { time: "07:00", title: l("ពិធីហែជំនូន", "Gift procession (Hae Chamnoun)"), desc: l("ក្រុមគ្រួសារខាងកូនកំលោះហែជំនូនមកដល់", "The groom's family arrives with offerings"), icon: "procession" },
  { time: "08:30", title: l("ពិធីសូត្រមន្តចម្រើនព្រះបរិត្ត", "Monks' blessing"), desc: l("", ""), icon: "lotus" },
  { time: "09:30", title: l("ពិធីកាត់សក់បង្កក់សិរី", "Hair-cutting ceremony"), desc: l("", ""), icon: "scissors" },
  { time: "11:00", title: l("ពិធីបង្វិលពពិល និងចងដៃ", "Popil & knot-tying"), desc: l("", ""), icon: "chan" },
  { time: "17:00", title: l("ពិធីជប់លៀងអាពាហ៍ពិពាហ៍", "Wedding reception"), desc: l("សូមអញ្ជើញពិសាភោជនាហារ", "Dinner & celebration"), icon: "glass" },
];

function weddingSample(): Section[] {
  return [
    { id: sid("s"), type: "cover", hidden: false, data: { kicker: l("សិរីមង្គលអាពាហ៍ពិពាហ៍", "The Wedding of"), title: l("សូមគោរពអញ្ជើញ", "You are invited"), names: l("សុវណ្ណ & ចន្ទលក្ខិណា", "Sovann & Chanlakhena"), photo: "placeholder:couple", button: l("បើកធៀប", "Open invitation") } },
    { id: sid("s"), type: "hero", hidden: false, data: { kicker: l("សិរីមង្គលអាពាហ៍ពិពាហ៍", "Together with their families"), names: l("សុវណ្ណ & ចន្ទលក្ខិណា", "Sovann & Chanlakhena"), tagline: l("សូមគោរពអញ្ជើញចូលរួមជាភ្ញៀវកិត្តិយស", "request the honour of your presence"), photo: "placeholder:couple", video: "" } },
    {
      id: sid("s"), type: "invitation", hidden: false,
      data: {
        heading: l("សូមគោរពអញ្ជើញ", "Invitation"),
        leftFamily: { father: l("លោក សុខ វណ្ណា", "Mr. Sok Vanna"), mother: l("លោកស្រី ជា សុភា", "Mrs. Chea Sophea") },
        rightFamily: { father: l("លោក ម៉ៅ សារិន", "Mr. Mao Sarin"), mother: l("លោកស្រី លឹម ចន្ធូ", "Mrs. Lim Chanthou") },
        body: l(
          "យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញ ឯកឧត្តម លោកជំទាវ លោក លោកស្រី អ្នកនាង កញ្ញា អញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ដើម្បីប្រសិទ្ធពរជ័យ សិរីសួស្តី ជ័យមង្គល ក្នុងពិធីអាពាហ៍ពិពាហ៍ កូនប្រុស កូនស្រី របស់យើងខ្ញុំ។",
          "Together with their families, we joyfully request the honour of your presence to bless the marriage of our son and daughter.",
        ),
        showParents: true,
      },
    },
    {
      id: sid("s"), type: "couple", hidden: false,
      data: {
        left: { role: l("កូនកំលោះ", "The Groom"), name: l("សុខ សុវណ្ណ", "Sok Sovann"), photo: "placeholder:groom", bio: l("កូនប្រុសទីពីរ", "Second son of the family") },
        right: { role: l("កូនក្រមុំ", "The Bride"), name: l("ម៉ៅ ចន្ទលក្ខិណា", "Mao Chanlakhena"), photo: "placeholder:bride", bio: l("កូនស្រីច្បង", "Eldest daughter of the family") },
      },
    },
    { id: sid("s"), type: "countdown", hidden: false, data: { heading: l("រាប់ថយក្រោយដល់ថ្ងៃមង្គល", "Counting down to our day") } },
    { id: sid("s"), type: "schedule", hidden: false, data: { heading: l("កម្មវិធីពិធី", "Ceremony programme"), items: WEDDING_SCHEDULE } },
    {
      id: sid("s"), type: "story", hidden: false,
      data: {
        heading: l("រឿងរ៉ាវរបស់យើង", "Our story"),
        chapters: [
          { date: "2019", title: l("ជួបគ្នាដំបូង", "First meeting"), text: l("នៅមហាវិទ្យាល័យ ក្នុងថ្ងៃភ្លៀងមួយ", "At university, on a rainy afternoon"), photo: "placeholder:story-1" },
          { date: "2023", title: l("ដំណើរកម្សាន្តសៀមរាប", "Siem Reap trip"), text: l("ថ្ងៃរះនៅអង្គរវត្ត", "Sunrise at Angkor Wat"), photo: "placeholder:story-2" },
          { date: "2025", title: l("ភ្ជាប់ពាក្យ", "Engaged"), text: l("ក្រុមគ្រួសារទាំងពីរជួបជុំគ្នា", "Both families came together"), photo: "placeholder:story-3" },
        ],
      },
    },
    { id: sid("s"), type: "video", hidden: false, data: { heading: l("កម្រងវីដេអូ", "Pre-wedding film"), caption: l(), src: "", poster: "placeholder:video", youtube: "", autoPlay: true } },
    {
      id: sid("s"), type: "gallery", hidden: false,
      data: { heading: l("អនុស្សាវរីយ៍", "Moments"), photos: ["g1", "g2", "g3", "g4", "g5", "g6"].map((g) => ({ src: `placeholder:${g}`, caption: l() })) },
    },
    { id: sid("s"), type: "venue", hidden: false, data: { heading: l("ទីតាំងកម្មវិធី", "Venue"), note: l("", ""), parking: l("មានចំណតរថយន្តនៅខាងមុខ", "Parking available in front"), mapImage: "", contacts: [], showQr: true } },
    { id: sid("s"), type: "gift", hidden: false, data: { heading: l("ចំណងដៃ", "Wedding gift"), note: l("វត្តមានរបស់លោកអ្នក គឺជាកាដូដ៏មានតម្លៃបំផុត", "Your presence is the greatest gift"), accounts: [] } },
    { id: sid("s"), type: "rsvp", hidden: false, data: { heading: l("សូមបញ្ជាក់ការចូលរួម", "Kindly reply"), note: l("", "") } },
    { id: sid("s"), type: "wishes", hidden: false, data: { heading: l("ពាក្យជូនពរ", "Wishes"), note: l("", "") } },
    { id: sid("s"), type: "thankyou", hidden: false, data: { message: l("សូមអរគុណយ៉ាងជ្រាលជ្រៅ ចំពោះវត្តមាន និងពរជ័យរបស់លោកអ្នក", "Thank you for your presence and your blessings"), signature: l("សុវណ្ណ & ចន្ទលក្ខិណា", "Sovann & Chanlakhena") } },
  ];
}

function genericSample(t: TemplateDef): Section[] {
  const c = t.category;
  const titles: Record<string, [LText, LText, LText]> = {
    engagement: [l("ពិធីភ្ជាប់ពាក្យ", "Engagement"), l("វិចិត្រ & សុភ័ក្ត្រ", "Vichet & Sopheak"), l("សូមគោរពអញ្ជើញចូលរួមពិធីភ្ជាប់ពាក្យ", "Join us as we celebrate our engagement")],
    birthday: [l("ខួបកំណើតគម្រប់ ៣០ ឆ្នាំ", "30th Birthday"), l("ដារ៉ា", "Dara"), l("មកអបអរជាមួយគ្នា!", "Come celebrate with us!")],
    anniversary: [l("ខួបអាពាហ៍ពិពាហ៍គម្រប់ ២៥ ឆ្នាំ", "25th Anniversary"), l("វណ្ណៈ & សុខា", "Vannak & Sokha"), l("រួមអបអរដំណើរជីវិតរួមគ្នា", "Celebrating a life together")],
    housewarming: [l("ពិធីឡើងផ្ទះថ្មី", "Housewarming"), l("គ្រួសារ ចាន់", "The Chan Family"), l("សូមអញ្ជើញមកកាន់គេហដ្ឋានថ្មីរបស់យើង", "Welcome to our new home")],
    religious: [l("ពិធីបុណ្យកឋិនទាន", "Kathina Ceremony"), l("វត្តភ្នំ", "Wat Phnom"), l("សូមអញ្ជើញចូលរួមកសាងកុសល", "Join us in making merit")],
    funeral: [l("សេចក្ដីជូនដំណឹង", "In loving memory"), l("លោក ហេង សុខ", "Mr. Heng Sok"), l("សូមអញ្ជើញចូលរួមពិធីបុណ្យ", "You are respectfully invited to the funeral rites")],
    corporate: [l("ពិធីបើកសម្ពោធ", "Grand Opening"), l("ក្រុមហ៊ុនគំរូ", "Sample Company"), l("សូមគោរពអញ្ជើញចូលរួម", "You are cordially invited")],
    graduation: [l("ពិធីប្រគល់សញ្ញាបត្រ", "Graduation Celebration"), l("រតនា", "Rathana"), l("សូមអញ្ជើញចូលរួមអបអរសាទរថ្ងៃដ៏ពិសេសនេះ", "Join us to celebrate this milestone")],
    custom: [l("ពិធីជួបជុំ", "A Garden Gathering"), l("គ្រួសារ សុខ", "The Sok Family"), l("រីករាយជួបជុំ និងចែករំលែកអនុស្សាវរីយ៍", "Join us for an evening together")],
  };
  const [kicker, names, tagline] = titles[c] ?? [l("ការអញ្ជើញ", "Invitation"), l("ឈ្មោះម្ចាស់កម្មវិធី", "Host name"), l("", "")];
  const sections: Section[] = [
    { id: sid("s"), type: "cover", hidden: false, data: { kicker, title: l("សូមគោរពអញ្ជើញ", "You are invited"), names, photo: c === "funeral" ? "" : "placeholder:host", button: l("បើកធៀប", "Open invitation") } },
    { id: sid("s"), type: "hero", hidden: false, data: { kicker, names, tagline, photo: c === "funeral" ? "placeholder:portrait" : "placeholder:host", video: "" } },
    {
      id: sid("s"), type: "invitation", hidden: false,
      data: {
        heading: c === "funeral" ? l("សេចក្ដីជូនដំណឹង", "Notice") : l("សូមគោរពអញ្ជើញ", "Invitation"),
        leftFamily: { father: l(), mother: l() }, rightFamily: { father: l(), mother: l() },
        body: c === "funeral"
          ? l("ក្រុមគ្រួសារសូមជូនដំណឹងដោយក្ដីសោកស្ដាយ និងសូមគោរពអញ្ជើញចូលរួមពិធីបុណ្យ ដើម្បីឧទ្ទិសកុសលដល់សព។", "With deep sorrow, the family respectfully invites you to join the funeral rites and merit-making.")
          : l("យើងខ្ញុំមានកិត្តិយសសូមគោរពអញ្ជើញលោកអ្នក ចូលរួមក្នុងកម្មវិធីរបស់យើងខ្ញុំ។", "We would be honoured by your presence at our celebration."),
        showParents: false,
      },
    },
    { id: sid("s"), type: "countdown", hidden: c === "funeral", data: { heading: l("រាប់ថយក្រោយ", "Counting down") } },
    {
      id: sid("s"), type: "schedule", hidden: false,
      data: {
        heading: l("កម្មវិធី", "Programme"),
        items: c === "funeral"
          ? [ { time: "07:00", title: l("ពិធីសូត្រមន្ត", "Chanting"), desc: l(), icon: "lotus" }, { time: "13:00", title: l("ពិធីបូជាសព", "Cremation"), desc: l(), icon: "flame" } ]
          : c === "corporate"
          ? [ { time: "08:00", title: l("ចុះឈ្មោះ", "Registration"), desc: l(), icon: "chan" }, { time: "09:00", title: l("សុន្ទរកថា", "Opening remarks"), desc: l(), icon: "mic" }, { time: "10:30", title: l("ទស្សនកិច្ច និងអាហារ", "Tour & reception"), desc: l(), icon: "glass" } ]
          : c === "graduation"
          ? [ { time: "16:30", title: l("ស្វាគមន៍ភ្ញៀវ", "Guest arrival"), desc: l(), icon: "chan" }, { time: "17:00", title: l("ពិធីប្រគល់សញ្ញាបត្រ", "Commencement"), desc: l(), icon: "mic" }, { time: "18:30", title: l("ថតរូបអនុស្សាវរីយ៍", "Photos & celebration"), desc: l(), icon: "chan" } ]
          : [ { time: "17:30", title: l("ទទួលភ្ញៀវ", "Welcome"), desc: l(), icon: "chan" }, { time: "18:30", title: l("ពិសាអាហារ", "Dinner"), desc: l(), icon: "glass" }, { time: "20:00", title: l("កម្សាន្ត", "Party"), desc: l(), icon: "music" } ],
      },
    },
    { id: sid("s"), type: "gallery", hidden: c === "funeral" || c === "religious", data: { heading: l("រូបភាព", "Photos"), photos: ["g1", "g2", "g3"].map((g) => ({ src: `placeholder:${g}`, caption: l() })) } },
    { id: sid("s"), type: "venue", hidden: false, data: { heading: l("ទីតាំង", "Venue"), note: l(), parking: l(), mapImage: "", contacts: [], showQr: true } },
    { id: sid("s"), type: "gift", hidden: c === "funeral" || c === "corporate", data: { heading: l("ចំណងដៃ", "Gift"), note: l(), accounts: [] } },
    { id: sid("s"), type: "rsvp", hidden: false, data: { heading: l("សូមបញ្ជាក់ការចូលរួម", "Kindly reply"), note: l() } },
    { id: sid("s"), type: "wishes", hidden: c === "corporate", data: { heading: c === "funeral" ? l("ពាក្យរំលែកទុក្ខ", "Condolences") : l("ពាក្យជូនពរ", "Wishes"), note: l() } },
    { id: sid("s"), type: "thankyou", hidden: false, data: { message: l("សូមអរគុណ", "Thank you"), signature: names } },
  ];
  return sections;
}

export function sampleDoc(t: TemplateDef): InvitationDoc {
  n = 0;
  const doc = sampleDocBase(t);
  if (t.family === "marble") {
    doc.sections = doc.sections.map((s) => (s.type === "venue" ? { ...s, data: { ...s.data, mapImage: "placeholder:map", note: l("ពីរង្វង់មូល បត់ស្ដាំតាមផ្លូវជាតិ ប្រហែល ៣ គីឡូម៉ែត្រ (ឧទាហរណ៍)", "From the roundabout, turn right on the national road for about 3 km (example)") } } : s));
  }
  if (t.family === "moonlit") {
    doc.sections = doc.sections.map((section): Section => {
      switch (section.type) {
        case "hero":
          return { ...section, data: { ...section.data, photo: MOONLIT_SAMPLE_PHOTO, tagline: l("សូមរួមអបអរសាទរជាមួយយើងទាំងពីរ", "Join us for an evening with our dearest people") } };
        case "story":
          return { ...section, hidden: true };
        case "venue":
          return { ...section, data: { ...section.data, mapImage: "placeholder:map", parking: l() } };
        default:
          return section;
      }
    });
  }
  if (t.slug === "classic-floral") {
    doc.theme.music = { src: CLASSIC_SAMPLE_AUDIO, title: "Classic Wedding Melody" };
    doc.sections = doc.sections.map((section): Section => {
      switch (section.type) {
        case "cover":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER, button: l("សូមចុចដើម្បីបើកសំបុត្រ", "Click to open invitation") } };
        case "hero":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER } };
        case "couple":
          return {
            ...section,
            data: {
              left: { ...section.data.left, photo: "placeholder:classic-groom" },
              right: { ...section.data.right, photo: "placeholder:classic-bride" },
            },
          };
        case "gallery":
          return {
            ...section,
            data: { ...section.data, photos: [1, 2, 3, 4].map((i) => ({ src: `placeholder:curtains-g${i}`, caption: l() })) },
          };
        case "story":
          return { ...section, hidden: true };
        default:
          return section;
      }
    });
  } else if (t.family === "curtains" || t.slug === "navy-scratch" || t.slug === "crimson-lovestory" || t.slug === "ivory-scratch-lite") {
    doc.theme.music = { src: CURTAINS_SAMPLE_AUDIO, title: "Wedding Melody" };
    doc.sections = doc.sections.map((section): Section => {
      switch (section.type) {
        case "cover":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER } };
        case "hero":
          return {
            ...section,
            data: {
              ...section.data,
              photo: CURTAINS_SAMPLE_COVER,
              tagline: l("សូមគោរពអញ្ជើញ", "We cordially invite"),
            },
          };
        case "gallery":
          return {
            ...section,
            data: {
              ...section.data,
              photos: [1, 2, 3, 4].map((i) => ({
                src: `placeholder:curtains-g${i}`,
                caption: l(),
              })),
            },
          };
        case "story":
          return { ...section, hidden: t.slug !== "crimson-lovestory" };
        default:
          return section;
      }
    });
  }
  return doc;
}

function sampleDocBase(t: TemplateDef): InvitationDoc {
  return {
    v: 1,
    defaultLocale: "km",
    theme: {
      palette: {}, envelope: t.family !== "memorial", music: { src: "", title: "" }, khmerNumerals: true,
      motion: { level: t.family === "memorial" ? "subtle" : "full", particles: "auto" },
    },
    sections: t.category === "wedding" ? weddingSample() : genericSample(t),
  };
}

/** Sample event details used only for template previews — clearly fictional. */
export function sampleEvent(t: TemplateDef) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 3, 14);
  d.setUTCHours(10, 0, 0, 0); // 17:00 Phnom Penh
  return {
    title: t.name.en,
    startsAt: d.toISOString(),
    endsAt: null as string | null,
    timezone: "Asia/Phnom_Penh",
    venueName: t.category === "corporate" ? "Sample Convention Hall" : "សណ្ឋាគារគំរូ (Sample Hotel)",
    previewVenueName: t.family === "moonlit" ? l("សណ្ឋាគារគំរូ", "Sample Hotel") : undefined,
    venueAddress: "Phnom Penh, Cambodia",
    mapUrl: "",
    allowMaybe: true,
    wishesEnabled: true,
  };
}

/**
 * Build a new event's draft from a template WITHOUT inventing personal details:
 * names come from the user, parents/story/gift accounts start empty, photos are placeholders.
 */
export function starterDoc(t: TemplateDef, input: {
  hostNames: LText;
  partnerNames?: readonly [string, string];
  message?: string;
  agenda?: { time: string; title: string; notes: string }[];
  locale?: "km" | "en";
}): InvitationDoc {
  const doc = sampleDoc(t);
  doc.defaultLocale = input.locale ?? doc.defaultLocale;
  const blank = l();
  const localize = (text: string) => doc.defaultLocale === "en" ? l("", text) : l(text, "");
  doc.sections = doc.sections.map((s): Section => {
    switch (s.type) {
      case "cover":
        return { ...s, data: { ...s.data, names: input.hostNames } };
      case "hero":
        return { ...s, data: { ...s.data, names: input.hostNames, photo: s.data.photo === MOONLIT_SAMPLE_PHOTO ? "placeholder:couple" : s.data.photo } };
      case "invitation":
        return {
          ...s,
          data: {
            ...s.data, leftFamily: { father: blank, mother: blank }, rightFamily: { father: blank, mother: blank },
            body: input.message ? localize(input.message) : s.data.body,
          },
        };
      case "couple":
        return {
          ...s,
          data: {
            left: { ...s.data.left, name: input.partnerNames ? localize(input.partnerNames[0]) : blank, bio: blank },
            right: { ...s.data.right, name: input.partnerNames ? localize(input.partnerNames[1]) : blank, bio: blank },
          },
        };
      case "schedule":
        if (!input.agenda) return s;
        return {
          ...s,
          hidden: input.agenda.length === 0,
          data: {
            ...s.data,
            items: input.agenda.map(({ time, title, notes }) => ({ time, title: localize(title), desc: localize(notes), icon: "chan" })),
          },
        };
      case "story":
        return { ...s, hidden: true, data: { ...s.data, chapters: [] } };
      case "thankyou":
        return { ...s, data: { ...s.data, signature: input.hostNames } };
      case "gift":
        return { ...s, data: { ...s.data, accounts: [] } };
      case "venue":
        return { ...s, data: { ...s.data, mapImage: "", note: l(), contacts: [] } };
      case "video":
        return { ...s, hidden: true, data: { ...s.data, poster: "", caption: l() } };
      default:
        return s;
    }
  });
  if (t.slug === "classic-floral") {
    doc.theme.music = { src: CLASSIC_SAMPLE_AUDIO, title: "Classic Wedding Melody" };
    doc.sections = doc.sections.map((section): Section => {
      switch (section.type) {
        case "cover":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER, button: l("សូមចុចដើម្បីបើកសំបុត្រ", "Click to open invitation") } };
        case "hero":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER } };
        case "couple":
          return {
            ...section,
            data: {
              left: { ...section.data.left, photo: "placeholder:classic-groom" },
              right: { ...section.data.right, photo: "placeholder:classic-bride" },
            },
          };
        case "gallery":
          return {
            ...section,
            data: { ...section.data, photos: [1, 2, 3, 4].map((i) => ({ src: `placeholder:curtains-g${i}`, caption: l() })) },
          };
        case "story":
          return { ...section, hidden: true };
        default:
          return section;
      }
    });
  } else if (t.family === "curtains" || t.slug === "navy-scratch" || t.slug === "crimson-lovestory" || t.slug === "ivory-scratch-lite") {
    doc.theme.music = { src: CURTAINS_SAMPLE_AUDIO, title: "Wedding Melody" };
    doc.sections = doc.sections.map((section): Section => {
      switch (section.type) {
        case "cover":
          return { ...section, data: { ...section.data, photo: CURTAINS_SAMPLE_COVER } };
        case "hero":
          return {
            ...section,
            data: {
              ...section.data,
              photo: CURTAINS_SAMPLE_COVER,
              tagline: l("សូមគោរពអញ្ជើញ", "We cordially invite"),
            },
          };
        case "gallery":
          return {
            ...section,
            data: {
              ...section.data,
              photos: [1, 2, 3, 4].map((i) => ({
                src: `placeholder:curtains-g${i}`,
                caption: l(),
              })),
            },
          };
        case "story":
          return { ...section, hidden: t.slug !== "crimson-lovestory" };
        default:
          return section;
      }
    });
  }
  return doc;
}
