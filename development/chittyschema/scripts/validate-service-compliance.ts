#!/usr/bin/env tsx
// Schema Compliance Validator
// Checks if a service properly uses @chittyos/schema and has no rogue schema definitions

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { setupOutputStyle, isCompact, printJSONSummary } from './lib/output-style.ts';

interface ComplianceReport {
  serviceName: string;
  compliant: boolean;
  score: number; // 0-100
  violations: Violation[];
  warnings: Warning[];
  passed: Check[];
}

interface Violation {
  type: 'CRITICAL' | 'ERROR';
  rule: string;
  description: string;
  file?: string;
  line?: number;
  suggestion: string;
}

interface Warning {
  rule: string;
  description: string;
  file?: string;
  suggestion: string;
}

interface Check {
  rule: string;
  description: string;
}

class SchemaComplianceValidator {
  private servicePath: string;
  private serviceName: string;
  private violations: Violation[] = [];
  private warnings: Warning[] = [];
  private passed: Check[] = [];

  constructor(servicePath: string) {
    this.servicePath = servicePath;
    this.serviceName = servicePath.split('/').pop() || 'unknown';
  }

  async validate(): Promise<ComplianceReport> {
    console.log(`\n🔍 Validating schema compliance for: ${this.serviceName}`);
    console.log('═'.repeat(60));

    // Run all validation checks
    this.checkPackageJson();
    this.checkForRogueSchemas();
    this.checkForORMConfigs();
    this.checkForLocalTypes();
    this.checkImportUsage();
    this.checkMigrationFiles();

    // Calculate compliance score
    const score = this.calculateScore();
    const compliant = score >= 80 && this.violations.filter(v => v.type === 'CRITICAL').length === 0;

    return {
      serviceName: this.serviceName,
      compliant,
      score,
      violations: this.violations,
      warnings: this.warnings,
      passed: this.passed,
    };
  }

  private checkPackageJson() {
    const packagePath = join(this.servicePath, 'package.json');

    if (!existsSync(packagePath)) {
      this.violations.push({
        type: 'ERROR',
        rule: 'PACKAGE_JSON_EXISTS',
        description: 'No package.json found',
        suggestion: 'Ensure this is a valid Node.js service',
      });
      return;
    }

    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

    // Check for @chittyos/schema dependency
    const hasSchema = pkg.dependencies?.['@chittyos/schema'] || pkg.devDependencies?.['@chittyos/schema'];

    if (!hasSchema) {
      this.violations.push({
        type: 'CRITICAL',
        rule: 'SCHEMA_DEPENDENCY',
        description: '@chittyos/schema not found in dependencies',
        file: 'package.json',
        suggestion: 'Run: npm install @chittyos/schema',
      });
    } else {
      this.passed.push({
        rule: 'SCHEMA_DEPENDENCY',
        description: '✅ Uses @chittyos/schema package',
      });
    }

    // Check for banned ORM dependencies
    const bannedDeps = ['drizzle-orm', 'prisma', '@prisma/client', 'typeorm', 'sequelize'];
    const foundBanned = bannedDeps.filter(dep =>
      pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
    );

    if (foundBanned.length > 0) {
      this.violations.push({
        type: 'ERROR',
        rule: 'NO_ORM_DEPENDENCIES',
        description: `Banned ORM dependencies found: ${foundBanned.join(', ')}`,
        file: 'package.json',
        suggestion: 'Remove ORM dependencies. Use @chittyos/schema types with raw SQL queries.',
      });
    } else {
      this.passed.push({
        rule: 'NO_ORM_DEPENDENCIES',
        description: '✅ No ORM dependencies detected',
      });
    }
  }

  private checkForRogueSchemas() {
    const roguePatterns = [
      '**/schema.sql',
      '**/init-database.sql',
      '**/migration*.sql',
      '**/create_tables.sql',
      '**/migrations/**/*.sql',
    ];

    const found: string[] = [];

    for (const pattern of roguePatterns) {
      try {
        const result = execSync(
          `find ${this.servicePath} -name "${pattern.replace('**/', '')}" -not -path "*/node_modules/*" 2>/dev/null || true`,
          { encoding: 'utf-8' }
        );

        const files = result.trim().split('\n').filter(Boolean);
        found.push(...files);
      } catch (error) {
        // Continue on error
      }
    }

    if (found.length > 0) {
      this.violations.push({
        type: 'CRITICAL',
        rule: 'NO_ROGUE_SCHEMAS',
        description: `Found ${found.length} SQL schema files in service repo`,
        file: found[0],
        suggestion: 'Move all migrations to chittyschema repository. Services should NOT contain schema definitions.',
      });
    } else {
      this.passed.push({
        rule: 'NO_ROGUE_SCHEMAS',
        description: '✅ No rogue SQL schema files',
      });
    }
  }

  private checkForORMConfigs() {
    const ormConfigs = [
      'drizzle.config.ts',
      'drizzle.config.js',
      'prisma/schema.prisma',
      'ormconfig.json',
      'ormconfig.ts',
    ];

    const found = ormConfigs.filter(config =>
      existsSync(join(this.servicePath, config))
    );

    if (found.length > 0) {
      this.violations.push({
        type: 'ERROR',
        rule: 'NO_ORM_CONFIGS',
        description: `Found ORM config files: ${found.join(', ')}`,
        suggestion: 'Remove ORM configurations. Use @chittyos/schema types with raw SQL.',
      });
    } else {
      this.passed.push({
        rule: 'NO_ORM_CONFIGS',
        description: '✅ No ORM config files',
      });
    }
  }

  private checkForLocalTypes() {
    // Search for local type definitions that duplicate database types
    const suspiciousPatterns = [
      'interface Identity',
      'interface ApiToken',
      'interface Evidence',
      'interface Case',
      'interface Credential',
      'interface Verification',
      'type Identity =',
      'type ApiToken =',
    ];

    try {
      const srcPath = join(this.servicePath, 'src');
      if (!existsSync(srcPath)) return;

      const found: { file: string; pattern: string }[] = [];

      for (const pattern of suspiciousPatterns) {
        try {
          const result = execSync(
            `grep -r "${pattern}" ${srcPath} --include="*.ts" --include="*.tsx" --exclude-dir=node_modules 2>/dev/null || true`,
            { encoding: 'utf-8' }
          );

          const matches = result.trim().split('\n').filter(Boolean);
          matches.forEach(match => {
            const [file] = match.split(':');
            if (file && !file.includes('node_modules')) {
              found.push({ file, pattern });
            }
          });
        } catch (error) {
          // Continue
        }
      }

      if (found.length > 0) {
        // Check if they're importing from @chittyos/schema
        const firstFile = found[0].file;
        const content = readFileSync(firstFile, 'utf-8');

        if (!content.includes("from '@chittyos/schema'")) {
          this.violations.push({
            type: 'CRITICAL',
            rule: 'NO_LOCAL_TYPE_DEFINITIONS',
            description: `Found local database type definitions in ${found.length} location(s)`,
            file: firstFile,
            suggestion: 'Remove local type definitions. Import from @chittyos/schema instead.',
          });
        } else {
          this.passed.push({
            rule: 'NO_LOCAL_TYPE_DEFINITIONS',
            description: '✅ Using imported types from @chittyos/schema',
          });
        }
      } else {
        this.passed.push({
          rule: 'NO_LOCAL_TYPE_DEFINITIONS',
          description: '✅ No local database type definitions found',
        });
      }
    } catch (error) {
      // Continue
    }
  }

  private checkImportUsage() {
    try {
      const srcPath = join(this.servicePath, 'src');
      if (!existsSync(srcPath)) return;

      const result = execSync(
        `grep -r "from '@chittyos/schema'" ${srcPath} --include="*.ts" --include="*.tsx" 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      const imports = result.trim().split('\n').filter(Boolean);

      if (imports.length > 0) {
        this.passed.push({
          rule: 'SCHEMA_IMPORTS',
          description: `✅ Found ${imports.length} import(s) from @chittyos/schema`,
        });
      } else {
        this.warnings.push({
          rule: 'SCHEMA_IMPORTS',
          description: 'No imports from @chittyos/schema found',
          suggestion: 'If this service uses database types, import them from @chittyos/schema',
        });
      }
    } catch (error) {
      // Continue
    }
  }

  private checkMigrationFiles() {
    const migrationDirs = ['migrations', 'prisma/migrations', 'drizzle'];

    const found = migrationDirs.filter(dir =>
      existsSync(join(this.servicePath, dir))
    );

    if (found.length > 0) {
      this.warnings.push({
        rule: 'NO_LOCAL_MIGRATIONS',
        description: `Found migration directories: ${found.join(', ')}`,
        suggestion: 'Migrations should be managed in chittyschema repository, not in services.',
      });
    } else {
      this.passed.push({
        rule: 'NO_LOCAL_MIGRATIONS',
        description: '✅ No local migration directories',
      });
    }
  }

  private calculateScore(): number {
    const totalChecks = this.violations.length + this.warnings.length + this.passed.length;
    if (totalChecks === 0) return 0;

    const criticalPenalty = this.violations.filter(v => v.type === 'CRITICAL').length * 25;
    const errorPenalty = this.violations.filter(v => v.type === 'ERROR').length * 15;
    const warningPenalty = this.warnings.length * 5;

    const score = 100 - criticalPenalty - errorPenalty - warningPenalty;
    return Math.max(0, Math.min(100, score));
  }
}

async function main() {
  const restoreLogs = setupOutputStyle();
  const servicePath = process.argv[2] || process.cwd();

  const validator = new SchemaComplianceValidator(servicePath);
  const report = await validator.validate();

  if (isCompact()) {
    restoreLogs();
    printJSONSummary({
      ok: report.compliant,
      service: report.serviceName,
      score: report.score,
      violations: report.violations.length,
      warnings: report.warnings.length,
      passed: report.passed.length,
    });
    process.exit(report.compliant ? 0 : 1);
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('\n📊 COMPLIANCE REPORT\n');

    console.log(`Service: ${report.serviceName}`);
    console.log(`Score: ${report.score}/100`);
    console.log(`Status: ${report.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}\n`);

    if (report.passed.length > 0) {
      console.log('✅ Passed Checks:');
      report.passed.forEach(check => {
        console.log(`   ${check.description}`);
      });
      console.log('');
    }

    if (report.violations.length > 0) {
      console.log('❌ Violations:');
      report.violations.forEach((v, i) => {
        console.log(`   ${i + 1}. [${v.type}] ${v.rule}`);
        console.log(`      ${v.description}`);
        if (v.file) console.log(`      File: ${v.file}`);
        console.log(`      💡 ${v.suggestion}`);
        console.log('');
      });
    }

    if (report.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      report.warnings.forEach((w, i) => {
        console.log(`   ${i + 1}. ${w.rule}`);
        console.log(`      ${w.description}`);
        console.log(`      💡 ${w.suggestion}`);
        console.log('');
      });
    }

    console.log('═'.repeat(60));

    if (report.compliant) {
      console.log('\n🎉 Service is schema-compliant and ready for certification!\n');
      process.exit(0);
    } else {
      console.log('\n⛔ Service is NOT compliant. Fix violations before certification.\n');
      process.exit(1);
    }
  }
}

main().catch(error => {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
});
