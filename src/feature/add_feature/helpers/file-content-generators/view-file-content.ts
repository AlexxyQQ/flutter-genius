import { toPascalCase } from "../../../../utils/pascal-case";

export function viewFileContent(featureName: string) {
  return `
  import 'package:flutter/material.dart';

  class ${toPascalCase(featureName)} extends StatefulWidget {
    const ${toPascalCase(featureName)}({super.key});
  
    @override
    State<${toPascalCase(featureName)}> createState() => _${toPascalCase(
    featureName
  )}State();
  }
  
  class _${toPascalCase(featureName)}State extends State<${toPascalCase(
    featureName
  )}> {
    @override
    Widget build(BuildContext context) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('${toPascalCase(featureName)}'),
        ),
        body: const Center(
          child: Text('${toPascalCase(featureName)}'),
        ),
      );
    }
  }
              
              `;
}
