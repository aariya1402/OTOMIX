// OTOMIX §7.1; §7.11
// @cucumber/cucumber v13 does not export IWorldOptions; use a plain shape.
import { setWorldConstructor, World } from '@cucumber/cucumber';

interface WorldOptionsLike {
  attach?: (...args: unknown[]) => void;
  log?: (...args: unknown[]) => void;
  parameters?: Record<string, unknown>;
}

export class AuthzWorld extends World {
  role = '';
  method = '';
  path = '';
  responseStatus = 0;

  constructor(options: WorldOptionsLike) {
    super(options as never);
  }
}

setWorldConstructor(AuthzWorld);