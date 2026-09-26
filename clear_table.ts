import { db } from './src/db';
import { naboopayTransactions } from './src/db/schema';

async function clear() {
  await db.delete(naboopayTransactions);
  console.log('Cleared naboopay_transactions');
}

clear().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
