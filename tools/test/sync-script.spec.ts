// X-OPS-M01: Test for sync-and-translate.ps1
// Verifies no hard-coded branch names in the script.

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SCRIPT_PATH = path.resolve(__dirname, '..', '..', 'Docs', 'ArchitectureBook', 'sync-and-translate.ps1');

describe('X-OPS-M01: sync-and-translate.ps1', () => {
  let scriptContent: string;

  beforeAll(() => {
    if (!fs.existsSync(SCRIPT_PATH)) {
      throw new Error(`Script not found at ${SCRIPT_PATH}`);
    }
    scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf-8');
  });

  it('should exist and be readable', () => {
    expect(scriptContent.length).toBeGreaterThan(0);
  });

  it('should not contain hard-coded branch names (main, master, develop, feature/, hotfix/, release/)', () => {
    // The script should use 'origin HEAD' instead of hard-coded branch names
    const hardcodedBranches = [
      /\bmain\b/,
      /\bmaster\b/,
      /\bdevelop\b/,
      /feature\//,
      /hotfix\//,
      /release\//
    ];

    for (const pattern of hardcodedBranches) {
      // Allow in comments or strings that are not git push commands
      const matches = scriptContent.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        // Check if it's in a git push context (which would be bad)
        for (const match of matches) {
          const index = scriptContent.indexOf(match);
          const context = scriptContent.substring(Math.max(0, index - 50), index + 50);
          if (/git\s+push/.test(context) || /origin\s+/.test(context)) {
            throw new Error(`Hard-coded branch name '${match}' found in git push context: ...${context}...`);
          }
        }
      }
    }
  });

  it('should use "origin HEAD" for git push', () => {
    expect(scriptContent).toMatch(/git push origin HEAD/);
  });

  it('should have parameterized commit message', () => {
    expect(scriptContent).toMatch(/\$CommitMessage/);
    // PowerShell param block spans multiple lines - use [\s\S]* to match across lines
    expect(scriptContent).toMatch(/param\([\s\S]*CommitMessage/);
  });

  it('should have NoPush switch parameter', () => {
    expect(scriptContent).toMatch(/\[switch\]\$NoPush/);
  });

  it('should not contain hard-coded commit message without parameter', () => {
    // The default message should be a parameter, not hard-coded
    const defaultMsgMatches = scriptContent.match(/CommitMessage\s*=\s*["'][^"']*["']/);
    if (defaultMsgMatches) {
      // This is OK - it's a default parameter value
      expect(defaultMsgMatches[0]).toMatch(/chore: sync plan translations/);
    }
  });

  it('should stage all changes with git add -A', () => {
    expect(scriptContent).toMatch(/git add -A/);
  });

  it('should check for staged changes before committing', () => {
    expect(scriptContent).toMatch(/git diff --cached --name-only/);
  });
});