// Registers the module-resolution hook used by the test-suite (see helpers/loader.mjs).
import { register } from 'node:module';

register('./helpers/loader.mjs', import.meta.url);
