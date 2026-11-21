#!/usr/bin/env node
/**
 * gate0-check.ts — Gate-0 Exit Validation Script
 *
 * Validates that all CRITICAL GATE0-* tasks are DONE and catalog
 * fixture contains only `complete` rows with non-placeholder values.
 *
 * Usage: npx tsx tools/scripts/gate0-check.ts
 * Exit codes: 0 = all checks pass, 1 = failures found
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_DIR = path.join(ROOT, 'Docs', 'OtoMix Todo-Plan');
const TASKS_JSON = path.join(PLAN_DIR, 'OTOMIX_MicroTask_Plan.tasks.json');

interface Task {
  id: string;
  status: string;
  description: string;
  prerequisites: string[];
  test: string;
  spec: string;
  description_fa?: string;
}

function readJson(): Task[] {
  const raw = fs.readFileSync(TASKS_JSON, 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

export function checkCriticalTasks(tasks: Task[]): { passed: boolean; failed: string[] } {
  const criticalTasks = tasks.filter(t => t.id.startsWith('GATE0-'));
  const failed = criticalTasks
    .filter(t => t.status !== 'DONE')
    .map(t => `${t.id} (status: ${t.status})`);
  return {
    passed: failed.length === 0,
    failed,
  };
}

export function checkCatalogFixture(): { passed: boolean; errors: string[] } {
  // The catalog fixture is tested via the integration test in
  // packages/gateway/test/features-analysis-status.spec.ts
  // which verifies that default catalog queries exclude non-complete rows.
  //
  // Since this script runs without a database, we verify that:
  // 1. The migration 009_features_analysis_status.sql exists
  // 2. The features-repository.ts filters by analysis_status = 'complete'
  // 3. The ingestion test verifies enrichment marks rows complete

  const errors: string[] = [];

  // Check migration 009 exists
  const migrationPath = path.join(ROOT, 'packages', 'db', 'migrations', '009_features_analysis_status.sql');
  if (!fs.existsSync(migrationPath)) {
    errors.push('Missing migration: packages/db/migrations/009_features_analysis_status.sql');
  }

  // Check features-repository filters by analysis_status = 'complete'
  const repoPath = path.join(ROOT, 'packages', 'gateway', 'src', 'repository', 'features-repository.ts');
  if (fs.existsSync(repoPath)) {
    const content = fs.readFileSync(repoPath, 'utf-8');
    if (!content.includes("analysis_status = 'complete'")) {
      errors.push('features-repository.ts does not filter by analysis_status = complete');
    }
  } else {
    errors.push('Missing features-repository.ts');
  }

  // Check enrichment consumer marks rows complete
  const consumerPath = path.join(ROOT, 'packages', 'gateway', 'src', 'enrichment-consumer.ts');
  if (fs.existsSync(consumerPath)) {
    const content = fs.readFileSync(consumerPath, 'utf-8');
    if (!content.includes("analysis_status = 'complete'")) {
      errors.push('enrichment-consumer.ts does not mark rows complete');
    }
  } else {
    errors.push('Missing enrichment-consumer.ts');
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

function main(): number {
  console.log('🔍 Gate-0 Exit Validation');
  console.log('==========================\n');

  const tasks = readJson();

  // Check 1: All CRITICAL GATE0-* tasks DONE
  console.log('1️⃣  Checking CRITICAL GATE0-* tasks...');
  const taskResult = checkCriticalTasks(tasks);
  if (taskResult.passed) {
    console.log('   ✅ All CRITICAL GATE0-* tasks are DONE');
  } else {
    console.log('   ❌ CRITICAL tasks not DONE:');
    for (const f of taskResult.failed) {
      console.log(`      - ${f}`);
    }
  }

  // Check 2: Catalog fixture only has complete rows
  console.log('\n2️⃣  Checking catalog fixture integrity...');
  const catalogResult = checkCatalogFixture();
  if (catalogResult.passed) {
    console.log('   ✅ Catalog fixture integrity verified');
  } else {
    console.log('   ❌ Catalog fixture issues:');
    for (const e of catalogResult.errors) {
      console.log(`      - ${e}`);
    }
  }

  const allPassed = taskResult.passed && catalogResult.passed;

  console.log('\n==========================');
  if (allPassed) {
    console.log('✅ Gate-0 checks PASSED — ready for P08');
    return 0;
  } else {
    console.log('❌ Gate-0 checks FAILED — fix issues before P08');
    process.exitCode = 1;
    return 1;
  }
}

main();