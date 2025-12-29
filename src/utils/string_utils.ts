/**
 * Utility functions for string manipulation.
 */

/**
 * Converts a PascalCase or camelCase string to snake_case.
 * * Examples:
 * - 'UserEntity' -> 'user_entity'
 * - 'myVarName'  -> 'my_var_name'
 *
 * @param str The input string (usually a class name).
 * @returns The snake_case version of the string.
 */
export function toSnakeCase(str: string): string {
    return str
        // Replace every uppercase letter with '_lowercase'
        .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        // Remove the leading underscore if the string started with an uppercase letter (PascalCase)
        .replace(/^_/, ''); 
}