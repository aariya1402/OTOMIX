// OTOMIX §7.1; GAP-015
import { setWorldConstructor, World } from '@cucumber/cucumber';

interface WorldOptionsLike {
  attach?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
  parameters?: Record<string, unknown>;
}

export class AuthzWorld extends World {
  currentPermissions: string[] = [];
  method = '';
  path = '';
  responseStatus = 0;

  constructor(options: WorldOptionsLike) {
    super(options as never);
  }
}

setWorldConstructor(AuthzWorld);