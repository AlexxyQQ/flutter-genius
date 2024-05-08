export function toSnakeCase(input: string): string {
  return (
    input
      .replace(/\s+/g, "_") // Replace spaces with underscores
      .replace(/(?:^|\.?)([A-Z])/g, (_, match) => `_${match.toLowerCase()}`) // Convert uppercase letters to lowercase and prepend with underscore
      .replace(/^_/, "")
      // if exist /_ replace with /
      .replace(/\/_/g, "/")
  ); // Remove leading underscore if present
}
