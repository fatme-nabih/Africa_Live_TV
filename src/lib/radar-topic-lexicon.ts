import type { RadarTopic } from './radar-topics';
import { textWords, phraseAt } from './text-normalize';

const english: [RegExp, RadarTopic][] = [
  [/ (elections?|electoral|presidents?|presidential|parliaments?|senate|government|ministers?|cabinet|opposition|diplomacy|ambassador|referendum|politics|political) /, 'politique'],
  [/ (economy|economic|finance|financial|inflation|banks?|budget|markets?|investment|business|oil|gas|trade|exports?|imports?|debt|tax|jobs?|employment|agriculture|tourism|growth|gdp|imf) /, 'economie'],
  [/ (attacks?|army|armies|military|soldiers?|security|war|conflict|rebels?|terrorism|terrorist|police|arrests?|hostages?|explosion|drones?|kidnapping|coup) /, 'securite'],
  [/ (health|hospitals?|doctors?|disease|epidemic|vaccines?|malaria|cholera|education|schools?|university|students?|women|youth|religion|justice|court|floods?|climate|environment|migration|poverty|human rights) /, 'societe'],
  [/ (football|soccer|afcon|world cup|champions league|match|matches|sports?|basketball|tennis|boxing|olympics|athletes?|stadium|tournament) /, 'sport'],
  [/ (culture|cultural|music|musicians?|singers?|films?|cinema|festivals?|books?|writers?|literature|artists?|concerts?|theatre|exhibition|heritage|dance|poetry) /, 'culture'],
];
const arabic: Record<RadarTopic, string[]> = {
  politique: ['انتخابات', 'انتخاب', 'انتخابيه', 'رئيس', 'الرئيس', 'رئاسيه', 'حكومه', 'الحكومه', 'برلمان', 'البرلمان', 'وزير', 'وزراء', 'سياسه', 'سياسيه', 'استفتاء', 'معارضه', 'دبلوماسيه'],
  economie: ['اقتصاد', 'اقتصادي', 'اقتصاديه', 'تضخم', 'بنك', 'بنوك', 'ميزانيه', 'موازنه', 'ماليه', 'المالي', 'استثمار', 'استثمارات', 'نفط', 'بترول', 'غاز', 'تجاره', 'صادرات', 'واردات', 'ديون', 'ضرائب', 'اسواق', 'بورصه', 'زراعه', 'سياحه', 'وظائف'],
  securite: ['هجوم', 'هجمات', 'جيش', 'الجيش', 'عسكري', 'عسكريه', 'جنود', 'امن', 'امنيه', 'حرب', 'صراع', 'متمردين', 'ارهاب', 'ارهابي', 'شرطه', 'اعتقال', 'اعتقالات', 'رهائن', 'انفجار', 'مسيرات', 'انقلاب', 'مقتل', 'قصف'],
  societe: ['صحه', 'مستشفي', 'اطباء', 'مرض', 'وباء', 'لقاح', 'تعليم', 'مدرسه', 'مدارس', 'جامعه', 'طلاب', 'نساء', 'شباب', 'عداله', 'محكمه', 'فيضانات', 'مناخ', 'بيئه', 'هجره', 'فقر', 'حقوق الانسان'],
  sport: ['كره القدم', 'كاس امم افريقيا', 'كاس العالم', 'دوري الابطال', 'مباراه', 'مباريات', 'رياضه', 'رياضي', 'رياضيه', 'بطوله', 'تنس', 'ملاكمه', 'اولمبياد', 'منتخب', 'ملعب'],
  culture: ['ثقافه', 'ثقافي', 'ثقافيه', 'موسيقي', 'غناء', 'فيلم', 'افلام', 'سينما', 'مهرجان', 'كتاب', 'كتب', 'ادب', 'فنان', 'فنانون', 'مسرح', 'معرض', 'تراث', 'رقص', 'شعر'],
};
export function foreignArticleTopics(title: string, category: string, edition: 'en' | 'ar'): RadarTopic[] {
  if (edition === 'en') {
    const normalized = ` ${textWords(`${title} ${category}`, 'en').join(' ')} `;
    return english.filter(([pattern]) => pattern.test(normalized)).map(([, topic]) => topic);
  }
  const words = textWords(`${title} ${category}`, 'ar');
  return (Object.keys(arabic) as RadarTopic[]).filter(topic => arabic[topic].some(alias => phraseAt(words, textWords(alias, 'ar'), 'ar') >= 0));
}
