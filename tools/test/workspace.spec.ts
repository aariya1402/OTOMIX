import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

function readJson(p: string): any {
  const b = fs.readFileSync(p);
  expect(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf, `BOM detected in ${p}`).toBe(false);
  return JSON.parse(b.toString('utf-8'));
}

describe('Workspace Structure', () => {
  const rootDir = path.resolve(__dirname, '..', '..');
  const packagesDir = path.join(rootDir, 'packages');

  const expectedPackages = [
    'core', 'access', 'adapter', 'gateway', 'workers', 'ui', 'db', 'proto', 'contracts'
  ];

  function checkStrictMode(tsconfig: any, tsconfigPath: string, rootTsconfig: any): boolean {
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict === true) {
      return true;
    }
    if (tsconfig.extends) {
      const extendedPath = path.join(path.dirname(tsconfigPath), tsconfig.extends);
      const extendedConfig = readJson(extendedPath);
      return checkStrictMode(extendedConfig, extendedPath, rootTsconfig);
    }
    return false;
  }

  let rootTsconfig: any;

  beforeAll(() => {
    const rootTsconfigPath = path.join(rootDir, 'tsconfig.json');
    rootTsconfig = readJson(rootTsconfigPath);
  });

  it('should have all 9 packages in packages/ directory', () => {
    const actualPackages = fs.readdirSync(packagesDir)
      .filter(name => fs.statSync(path.join(packagesDir, name)).isDirectory());
    expect(actualPackages.sort()).toEqual(expectedPackages.sort());
  });

  it('each package should have a package.json', () => {
    for (const pkg of expectedPackages) {
      const pkgPath = path.join(packagesDir, pkg, 'package.json');
      expect(fs.existsSync(pkgPath)).toBe(true);
      const pkgJson = readJson(pkgPath);
      expect(pkgJson.name).toBe(`@otomix/${pkg}`);
    }
  });

  it('each package should have a tsconfig.json with strict: true', () => {
    for (const pkg of expectedPackages) {
      const pkgDir = path.join(packagesDir, pkg);
      const tsconfigPath = path.join(pkgDir, 'tsconfig.json');
      expect(fs.existsSync(tsconfigPath)).toBe(true);
      const tsconfig = readJson(tsconfigPath);
      const hasStrict = checkStrictMode(tsconfig, tsconfigPath, rootTsconfig);
      expect(hasStrict).toBe(true);
    }
  });

  it('each package should have a src/index.ts file', () => {
    for (const pkg of expectedPackages) {
      const indexPath = path.join(packagesDir, pkg, 'src', 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    }
  });

  it('root tsconfig.json should have strict: true', () => {
    const rootTsconfigPath = path.join(rootDir, 'tsconfig.json');
    const rootTsconfig = readJson(rootTsconfigPath);
    expect(rootTsconfig.compilerOptions.strict).toBe(true);
  });

  it('pnpm-workspace.yaml should exist and reference packages/*', () => {
    const workspacePath = path.join(rootDir, 'pnpm-workspace.yaml');
    expect(fs.existsSync(workspacePath)).toBe(true);
    const content = fs.readFileSync(workspacePath, 'utf-8');
    expect(content).toContain('packages:');
    expect(content).toContain('packages/*');
  });
});