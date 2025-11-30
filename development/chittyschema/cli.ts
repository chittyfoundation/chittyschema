#!/usr/bin/env node
// ChittySchema CLI
// Command-line interface for schema operations

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const command = process.argv[2];
let args = process.argv.slice(3);

function parseStyle(argv: string[]): { style: 'pretty' | 'compact'; rest: string[] } {
  let style: 'pretty' | 'compact' = 'pretty';
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--compact') {
      style = 'compact';
      continue;
    }
    if (a.startsWith('--style=')) {
      const v = a.split('=')[1]?.toLowerCase();
      if (v === 'compact') style = 'compact';
      continue;
    }
    if (a === '--style') {
      const v = argv[i + 1]?.toLowerCase();
      if (v === 'compact') style = 'compact';
      i++;
      continue;
    }
    rest.push(a);
  }
  return { style, rest };
}

const { style: outputStyle, rest } = parseStyle(args);
args = rest;

function log(msg: string) {
  if (outputStyle !== 'compact') console.log(msg);
}

function run(cmd: string, options: { cwd?: string } = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    cwd: options.cwd ?? __dirname,
    env: { ...process.env, CHITTY_OUTPUT_STYLE: outputStyle },
  });
}

const commands: Record<string, { description: string; usage: string; fn: () => void }> = {
  validate: {
    description: 'Validate service schema compliance',
    usage: 'chittyschema validate [service-path]',
    fn: () => {
      const servicePath = args[0] || process.cwd();
      log(`Validating schema compliance for: ${servicePath}\n`);

      try {
        run(`npx tsx ${__dirname}/scripts/validate-service-compliance.ts ${servicePath}`);
      } catch (error) {
        process.exit(1);
      }
    },
  },

  introspect: {
    description: 'Introspect databases and generate schema.json',
    usage: 'chittyschema introspect',
    fn: () => {
      log('🔍 Introspecting databases...\n');

      try {
        run(`npx tsx ${__dirname}/scripts/introspect-all.ts`);
      } catch (error) {
        process.exit(1);
      }
    },
  },

  generate: {
    description: 'Generate types and validators from schema',
    usage: 'chittyschema generate [types|validators|docs|all]',
    fn: () => {
      const what = args[0] || 'all';

      const commands: Record<string, string> = {
        types: 'npx tsx scripts/generate-types-multi.ts',
        validators: 'npx tsx scripts/generate-validators.ts',
        docs: 'npx tsx scripts/generate-docs.ts',
        all: 'npm run generate',
      };

      const cmd = commands[what];
      if (!cmd) {
        console.error(`❌ Unknown generate target: ${what}`);
        console.error('Valid targets: types, validators, docs, all');
        process.exit(1);
      }

      try {
        run(cmd);
      } catch (error) {
        process.exit(1);
      }
    },
  },

  certify: {
    description: 'Run certification checks on a service',
    usage: 'chittyschema certify [service-path]',
    fn: () => {
      const servicePath = args[0] || process.cwd();
      log(`🎯 Running certification checks for: ${servicePath}\n`);

      try {
        run(`npx tsx ${__dirname}/scripts/validate-service-compliance.ts ${servicePath}`);
        log('\n✅ Service is certified and ready for deployment!');
      } catch (error) {
        log('\n❌ Service failed certification. Fix violations and try again.');
        process.exit(1);
      }
    },
  },

  help: {
    description: 'Show this help message',
    usage: 'chittyschema help',
    fn: () => {
      console.log('ChittySchema - Universal Data Framework for ChittyOS\n');
      console.log('Usage: chittyschema <command> [options]\n');
      console.log('Global options:');
      console.log('  --style compact    Use token-efficient JSON summaries');
      console.log('  --compact          Alias of --style compact\n');
      console.log('Commands:\n');

      Object.entries(commands).forEach(([name, cmd]) => {
        console.log(`  ${name.padEnd(15)} ${cmd.description}`);
        console.log(`  ${' '.repeat(15)} ${cmd.usage}\n`);
      });

      console.log('Examples:\n');
      console.log('  chittyschema validate ../chittyauth');
      console.log('  chittyschema introspect');
      console.log('  chittyschema generate types');
      console.log('  chittyschema certify .');
      console.log('');
    },
  },
};

// Show help if no command or unknown command
if (!command || !commands[command]) {
  if (command) {
    console.error(`❌ Unknown command: ${command}\n`);
  }
  commands.help.fn();
  process.exit(command ? 1 : 0);
}

// Execute command
commands[command].fn();
