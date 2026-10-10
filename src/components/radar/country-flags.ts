// Drapeaux SVG des pays du Radar (country-flag-icons, MIT). Module à part : chargé seulement quand une grille de pays s'affiche.
import { AO, BF, BI, BJ, BW, CD, CF, CG, CI, CM, CV, DJ, DZ, EG, EH, ER, ET, GA, GH, GM, GN, GQ, GW, KE, KM, LR, LS, LY, MA, MG, ML, MR, MU, MW, MZ, NA, NE, NG, RW, SC, SD, SL, SN, SO, SS, ST, SZ, TD, TG, TN, TZ, UG, ZA, ZM, ZW } from 'country-flag-icons/react/3x2';

const FLAGS = { AO, BF, BI, BJ, BW, CD, CF, CG, CI, CM, CV, DJ, DZ, EG, EH, ER, ET, GA, GH, GM, GN, GQ, GW, KE, KM, LR, LS, LY, MA, MG, ML, MR, MU, MW, MZ, NA, NE, NG, RW, SC, SD, SL, SN, SO, SS, ST, SZ, TD, TG, TN, TZ, UG, ZA, ZM, ZW };

export default FLAGS as Record<string, (typeof FLAGS)['SN'] | undefined>;
