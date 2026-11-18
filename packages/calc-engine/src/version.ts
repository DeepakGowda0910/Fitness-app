import { POLICY_VERSION } from './policy.js';

/**
 * Engine version stored with every result. Bump the code part when a formula
 * changes; the policy part changes with any policy value.
 */
export const ENGINE_CODE_VERSION = '0.1.0';
export const ENGINE_VERSION = `${ENGINE_CODE_VERSION}+policy.${POLICY_VERSION}`;
