export function toCamelCase(str: string) {
  // Split the string by underscores, capitalize the first letter of each segment except the first one, and join them together
  return str
    .split("_")
    .map((word, index) => {
      if (index === 0) {
        return word;
      } else {
        // Capitalize the first letter of the subsequent words
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    })
    .join("");
}
