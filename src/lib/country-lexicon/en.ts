import { COUNTRY_NAMES } from './names-en';

/** Alias éditoriaux : villes, gentilés et noms usuels, pas de traduction des articles. */
const EXTRA: Record<string, string[]> = {
  SN: ['Dakar', 'Senegalese', 'Diomaye', 'Sonko'], CI: ['Ivory Coast', 'Abidjan', 'Yamoussoukro', 'Ivorian', 'Ouattara'],
  ML: ['Bamako', 'Malian', 'Goita'], GN: ['Conakry', 'Guinean', 'Doumbouya'], BF: ['Ouagadougou', 'Burkinabe', 'Ibrahim Traore'],
  NE: ['Niamey', 'Nigerien', 'Tiani'], NG: ['Abuja', 'Lagos', 'Kano', 'Nigerian', 'Tinubu', 'Niger Delta', 'Niger State'],
  CM: ['Yaounde', 'Douala', 'Cameroonian', 'Biya'], CD: ['DR Congo', 'DRC', 'Democratic Republic of Congo', 'Congo Kinshasa', 'Kinshasa', 'Goma', 'Kivu', 'Tshisekedi'],
  CG: ['Republic of the Congo', 'Congo Brazzaville', 'Brazzaville', 'Sassou'], GA: ['Libreville', 'Gabonese', 'Oligui'], TD: ['N Djamena', 'Ndjamena', 'Chadian', 'Deby'],
  MA: ['Rabat', 'Casablanca', 'Moroccan', 'Mohammed VI'], DZ: ['Algiers', 'Algerian', 'Tebboune'], TN: ['Tunis', 'Tunisian', 'Saied'],
  EG: ['Cairo', 'Alexandria', 'Egyptian', 'Sisi'], GH: ['Accra', 'Ghanaian', 'Mahama'], KE: ['Nairobi', 'Kenyan', 'Ruto'],
  ET: ['Addis Ababa', 'Ethiopian', 'Abiy'], ZA: ['Pretoria', 'Johannesburg', 'Cape Town', 'Durban', 'South African', 'Ramaphosa'],
  RW: ['Kigali', 'Rwandan', 'Kagame'], BJ: ['Cotonou', 'Beninese', 'Talon'], TG: ['Lome', 'Togolese', 'Gnassingbe'],
  MR: ['Nouakchott', 'Mauritanian'], MG: ['Antananarivo', 'Malagasy'], AO: ['Luanda', 'Angolan'], MZ: ['Maputo', 'Mozambican'],
  ZW: ['Harare', 'Zimbabwean', 'Mnangagwa'], ZM: ['Lusaka', 'Zambian', 'Hichilema'], UG: ['Kampala', 'Ugandan', 'Museveni'],
  SD: ['Khartoum', 'Sudanese', 'Burhan'], SS: ['Juba', 'South Sudanese', 'Kiir'], CF: ['Bangui', 'Central African Republic', 'Touadera'],
  SL: ['Freetown', 'Sierra Leonean'], LR: ['Monrovia', 'Liberian'], GM: ['Banjul', 'Gambian', 'Barrow'], GW: ['Bissau', 'Guinea Bissau'],
  CV: ['Cape Verde', 'Praia'], KM: ['Comoros', 'Moroni', 'Comorian'], DJ: ['Djiboutian'], SO: ['Mogadishu', 'Somali', 'Somaliland'],
  MU: ['Mauritian', 'Port Louis'], SC: ['Seychellois'], BI: ['Bujumbura', 'Gitega', 'Burundian'], BW: ['Gaborone', 'Batswana'],
  NA: ['Windhoek', 'Namibian'], LS: ['Maseru', 'Basotho'], SZ: ['Swaziland', 'Mbabane'], MW: ['Lilongwe', 'Malawian'],
  GQ: ['Malabo', 'Equatorial Guinea'], ST: ['Sao Tome'], ER: ['Asmara', 'Eritrean'], EH: ['Western Sahara', 'Laayoune', 'Polisario'], LY: ['Tripoli', 'Libyan'],
};
export const COUNTRY_KEYWORDS: Record<string, string[]> = Object.fromEntries(Object.entries(COUNTRY_NAMES).map(([code, names]) =>
  [code, [...(code === 'CG' || code === 'CD' ? [] : names), ...(EXTRA[code] ?? [])]]));
