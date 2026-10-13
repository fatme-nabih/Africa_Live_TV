import type { WorldRegion } from './world-desk-data';

export const REGION_KEYWORDS: Record<'en' | 'ar', Record<WorldRegion, string[]>> = {
  en: {
    europe: ['Europe', 'European', 'EU', 'Brussels', 'NATO', 'France', 'Paris', 'French', 'Macron', 'Germany', 'German', 'Berlin', 'Merz', 'UK', 'Britain', 'British', 'United Kingdom', 'London', 'Starmer', 'Italy', 'Italian', 'Rome', 'Spain', 'Spanish', 'Madrid', 'Portugal', 'Belgium', 'Switzerland', 'Netherlands', 'Poland', 'Ukraine', 'Ukrainian', 'Kyiv', 'Kiev', 'Zelensky', 'Russia', 'Russian', 'Moscow', 'Putin', 'Kremlin', 'Hungary', 'Greece', 'Sweden', 'Norway', 'Finland', 'Denmark', 'Serbia', 'Turkey', 'Ankara', 'Erdogan', 'Scotland', 'England', 'Wales', 'Ireland'],
    ameriques: ['United States', 'US', 'USA', 'American', 'America', 'Washington', 'White House', 'Trump', 'New York', 'California', 'Canada', 'Canadian', 'Ottawa', 'Quebec', 'Mexico', 'Mexican', 'Brazil', 'Brazilian', 'Lula', 'Argentina', 'Milei', 'Venezuela', 'Maduro', 'Colombia', 'Chile', 'Peru', 'Bolivia', 'Ecuador', 'Cuba', 'Haiti', 'Panama', 'Latin America', 'Caribbean', 'Carney'],
    'moyen-orient': ['Middle East', 'Israel', 'Israeli', 'Netanyahu', 'Gaza', 'Palestine', 'Palestinian', 'West Bank', 'Jerusalem', 'Hamas', 'Hezbollah', 'Lebanon', 'Lebanese', 'Beirut', 'Syria', 'Syrian', 'Damascus', 'Iran', 'Iranian', 'Tehran', 'Iraq', 'Iraqi', 'Saudi Arabia', 'Saudi', 'Riyadh', 'Yemen', 'Houthi', 'Houthis', 'Qatar', 'Doha', 'Emirates', 'UAE', 'Dubai', 'Jordan', 'Kuwait', 'Oman', 'Bahrain'],
    'asie-pacifique': ['Asia', 'Asian', 'Pacific', 'China', 'Chinese', 'Beijing', 'Xi Jinping', 'Hong Kong', 'Taiwan', 'Japan', 'Japanese', 'Tokyo', 'Korea', 'Korean', 'Seoul', 'Pyongyang', 'India', 'Indian', 'Delhi', 'Modi', 'Pakistan', 'Afghanistan', 'Taliban', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar', 'Thailand', 'Vietnam', 'Cambodia', 'Malaysia', 'Singapore', 'Indonesia', 'Philippines', 'Australia', 'Australian', 'Canberra', 'New Zealand'],
  },
  ar: {
    europe: ['أوروبا', 'الأوروبي', 'الأوروبية', 'بروكسل', 'الناتو', 'فرنسا', 'الفرنسي', 'الفرنسية', 'باريس', 'ماكرون', 'ألمانيا', 'الألماني', 'برلين', 'ميرتس', 'بريطانيا', 'البريطاني', 'المملكة المتحدة', 'لندن', 'ستارمر', 'إيطاليا', 'روما', 'إسبانيا', 'مدريد', 'البرتغال', 'بلجيكا', 'سويسرا', 'هولندا', 'بولندا', 'أوكرانيا', 'الأوكراني', 'الأوكرانية', 'كييف', 'زيلينسكي', 'روسيا', 'الروسي', 'الروسية', 'موسكو', 'بوتين', 'الكرملين', 'المجر', 'اليونان', 'السويد', 'النرويج', 'فنلندا', 'الدنمارك', 'صربيا', 'تركيا', 'أنقرة', 'أردوغان', 'إيرلندا'],
    ameriques: ['أمريكا', 'الولايات المتحدة', 'الأمريكي', 'الأمريكية', 'واشنطن', 'البيت الأبيض', 'ترامب', 'نيويورك', 'كاليفورنيا', 'كندا', 'الكندي', 'أوتاوا', 'المكسيك', 'البرازيل', 'لولا', 'الأرجنتين', 'ميلي', 'فنزويلا', 'مادورو', 'كولومبيا', 'تشيلي', 'بيرو', 'بوليفيا', 'الإكوادور', 'كوبا', 'هايتي', 'بنما', 'أمريكا اللاتينية', 'الكاريبي'],
    'moyen-orient': ['الشرق الأوسط', 'إسرائيل', 'الإسرائيلي', 'الإسرائيلية', 'نتنياهو', 'غزة', 'فلسطين', 'الفلسطيني', 'الفلسطينية', 'الضفة الغربية', 'القدس', 'حماس', 'حزب الله', 'لبنان', 'اللبناني', 'بيروت', 'سوريا', 'السوري', 'دمشق', 'إيران', 'الإيراني', 'طهران', 'العراق', 'العراقي', 'بغداد', 'السعودية', 'السعودي', 'الرياض', 'اليمن', 'الحوثي', 'الحوثيين', 'قطر', 'الدوحة', 'الإمارات', 'الإماراتي', 'دبي', 'أبو ظبي', 'الأردن', 'الكويت', 'عمان', 'البحرين'],
    'asie-pacifique': ['آسيا', 'الآسيوي', 'المحيط الهادئ', 'الصين', 'الصيني', 'الصينية', 'بكين', 'هونغ كونغ', 'تايوان', 'اليابان', 'الياباني', 'طوكيو', 'كوريا', 'الكوري', 'سيول', 'بيونغ يانغ', 'الهند', 'الهندي', 'نيودلهي', 'مودي', 'باكستان', 'أفغانستان', 'طالبان', 'بنغلاديش', 'سريلانكا', 'نيبال', 'ميانمار', 'تايلاند', 'فيتنام', 'كمبوديا', 'ماليزيا', 'سنغافورة', 'إندونيسيا', 'الفلبين', 'أستراليا', 'الأسترالي', 'نيوزيلندا'],
  },
};

// Villes et usages courants sans le nom du pays dans le titre.
REGION_KEYWORDS.en.europe.push('Georgia');
REGION_KEYWORDS.ar.europe.push('إسطنبول', 'ليفربول', 'مانشستر', 'فولهام', 'إيبسويتش', 'الإنجليزي', 'البوندسليغا', 'هامبورغ', 'بريطانية');
REGION_KEYWORDS.ar.ameriques.push('أميركا', 'البنتاغون');
REGION_KEYWORDS.ar['moyen-orient'].push('هرمز', 'هنية', 'كاتس', 'خليل الحية', 'الخليج');
