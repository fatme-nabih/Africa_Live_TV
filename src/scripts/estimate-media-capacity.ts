import { estimateMonthlyEgressGiB } from '../lib/secure-media-assessment';

type Options = {
  averageBitrateMbps: number;
  peakBitrateMbps: number;
  averageConcurrency: number;
  peakConcurrency: number;
  activeHoursPerDay: number;
  includedEgressGiB: number;
  egressPricePerGiB: number;
  computeMonthly: number;
};

function nonNegativeNumber(value: string | undefined, name: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} doit être un nombre positif ou nul.`);
  return parsed;
}

function positiveNumber(value: string | undefined, name: string) {
  const parsed = nonNegativeNumber(value, name);
  if (parsed <= 0) throw new Error(`${name} doit être strictement positif.`);
  return parsed;
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    averageBitrateMbps: 2.28,
    peakBitrateMbps: 6.046,
    averageConcurrency: 25,
    peakConcurrency: 50,
    activeHoursPerDay: 12,
    includedEgressGiB: 0,
    egressPricePerGiB: 0,
    computeMonthly: 0,
  };
  for (let index = 0; index < args.length; index += 1) {
    switch (args[index]) {
      case '--average-bitrate':
        options.averageBitrateMbps = positiveNumber(args[++index], '--average-bitrate');
        break;
      case '--peak-bitrate':
        options.peakBitrateMbps = positiveNumber(args[++index], '--peak-bitrate');
        break;
      case '--average-concurrency':
        options.averageConcurrency = positiveNumber(args[++index], '--average-concurrency');
        break;
      case '--peak-concurrency':
        options.peakConcurrency = positiveNumber(args[++index], '--peak-concurrency');
        break;
      case '--active-hours':
        options.activeHoursPerDay = positiveNumber(args[++index], '--active-hours');
        if (options.activeHoursPerDay > 24) throw new Error('--active-hours ne peut pas dépasser 24.');
        break;
      case '--included-egress-gib':
        options.includedEgressGiB = nonNegativeNumber(args[++index], '--included-egress-gib');
        break;
      case '--egress-price-per-gib':
        options.egressPricePerGiB = nonNegativeNumber(args[++index], '--egress-price-per-gib');
        break;
      case '--compute-monthly':
        options.computeMonthly = nonNegativeNumber(args[++index], '--compute-monthly');
        break;
      case '--help':
      case '-h':
        console.log(`Usage:
  npm run capacity:media -- --average-bitrate 2.28 --peak-bitrate 6.046 \\
    --average-concurrency 25 --peak-concurrency 50 --active-hours 12 \\
    --included-egress-gib 1024 --egress-price-per-gib 0.15 --compute-monthly 20
`);
        process.exit(0);
      default:
        throw new Error(`Argument inconnu: ${args[index]}`);
    }
  }
  return options;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const monthlyEgressGiB = estimateMonthlyEgressGiB({
    concurrentStreams: options.averageConcurrency,
    averageBitrateMbps: options.averageBitrateMbps,
    activeHoursPerDay: options.activeHoursPerDay,
  });
  const billableEgressGiB = Math.max(0, monthlyEgressGiB - options.includedEgressGiB);
  const egressMonthly = billableEgressGiB * options.egressPricePerGiB;
  const averageOutboundMbps = options.averageConcurrency * options.averageBitrateMbps;
  const peakOutboundMbps = options.peakConcurrency * options.peakBitrateMbps;

  console.log(JSON.stringify({
    inputs: options,
    capacity: {
      averageOutboundMbps: round(averageOutboundMbps),
      peakOutboundMbps: round(peakOutboundMbps),
      recommendedPublicNetworkMbps: Math.ceil(peakOutboundMbps * 1.3),
      monthlyEgressGiB: round(monthlyEgressGiB),
      monthlyEgressTiB: round(monthlyEgressGiB / 1024),
    },
    cost: {
      billableEgressGiB: round(billableEgressGiB),
      egressMonthly: round(egressMonthly),
      computeMonthly: round(options.computeMonthly),
      estimatedMonthlyTotal: round(egressMonthly + options.computeMonthly),
      currency: 'Use the currency of the supplied provider prices.',
    },
  }, null, 2));
}

try {
  run();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Erreur de dimensionnement.');
  process.exit(1);
}
