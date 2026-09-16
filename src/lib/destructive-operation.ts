import { createInterface } from 'node:readline/promises';

type DestructiveOperationOptions = {
  operation: string;
  confirmationText: string;
  args?: string[];
  interactive?: boolean;
  ask?: (prompt: string) => Promise<string>;
};

export function parseDestructiveOperationArgs(args: string[]) {
  const unknownArgs = args.filter((arg) => arg !== '--force');

  if (unknownArgs.length > 0) {
    throw new Error(
      `Argument(s) inconnu(s): ${unknownArgs.join(', ')}. Seule l'option --force est acceptée.`,
    );
  }

  return {
    force: args.includes('--force'),
  };
}

export async function requireDestructiveConfirmation({
  operation,
  confirmationText,
  args = process.argv.slice(2),
  interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY),
  ask,
}: DestructiveOperationOptions) {
  const { force } = parseDestructiveOperationArgs(args);

  if (force) {
    console.warn(`Confirmation contournée avec --force: ${operation}`);
    return;
  }

  if (!interactive) {
    throw new Error(
      `Opération destructive refusée en mode non interactif: ${operation}. ` +
        'Relancez explicitement avec --force.',
    );
  }

  console.warn(`ATTENTION: ${operation}`);
  const prompt = `Tapez exactement "${confirmationText}" pour continuer: `;

  let answer: string;
  if (ask) {
    answer = await ask(prompt);
  } else {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      answer = await readline.question(prompt);
    } finally {
      readline.close();
    }
  }

  if (answer.trim() !== confirmationText) {
    throw new Error('Confirmation incorrecte. Aucune donnée n’a été modifiée.');
  }
}
