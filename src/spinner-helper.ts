// This file handles the dynamic import of ora
import chalk from 'chalk';

interface Spinner {
  start: () => Spinner;
  stop: () => Spinner;
  succeed: (text?: string) => Spinner;
  fail: (text?: string) => Spinner;
  info: (text?: string) => Spinner;
  warn: (text?: string) => Spinner;
  text: string;
}

// A simple spinner implementation that works without ora
class SimpleSpinner implements Spinner {
  text: string;

  constructor(initialText: string) {
    this.text = initialText;
  }

  start(): Spinner {
    console.log(chalk.blue(`⏳ ${this.text}`));
    return this;
  }

  stop(): Spinner {
    return this;
  }

  succeed(text?: string): Spinner {
    console.log(chalk.green(`✅ ${text || this.text}`));
    return this;
  }

  fail(text?: string): Spinner {
    console.log(chalk.red(`❌ ${text || this.text}`));
    return this;
  }

  info(text?: string): Spinner {
    console.log(chalk.blue(`ℹ️ ${text || this.text}`));
    return this;
  }

  warn(text?: string): Spinner {
    console.log(chalk.yellow(`⚠️ ${text || this.text}`));
    return this;
  }
}

// Function to create a spinner
export function createSpinner(text: string): Spinner {
  return new SimpleSpinner(text);
}
