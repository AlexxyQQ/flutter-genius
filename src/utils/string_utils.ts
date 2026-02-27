/**
 * string_utils.ts
 * ----------------
 * General-purpose string manipulation utilities used across the extension.
 */

/**
 * Converts a PascalCase or camelCase string to snake_case.
 *
 * Examples:
 *   'AccountEntity' → 'account_entity'
 *   'myVarName'     → 'my_var_name'
 *   'BankModel'     → 'bank_model'
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, ""); // Remove leading underscore for PascalCase input
}
