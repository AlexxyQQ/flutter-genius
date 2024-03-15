import { toPascalCase } from "../utils/pascal-case";

export function injectionContainerFileContent(featureName: string) {
  return `
  class ${toPascalCase(featureName)}InjectionContainer {
    void register() {
      // Hive Service
      
  
      // Data Sources
    
  
      // Repositories
     
  
      // Use Cases
      
  
      // Cubits
      
    }
  }
            
            `;
}
