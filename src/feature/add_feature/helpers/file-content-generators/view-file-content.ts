import { toPascalCase } from "../../../../utils/pascal-case";

export function viewFileContent(featureName: string) {
  return `
  import 'package:flutter/material.dart';

  class ${toPascalCase(featureName)}View extends StatefulWidget {
    const ${toPascalCase(featureName)}View({super.key});
  
    @override
    State<${toPascalCase(featureName)}View> createState() => _${toPascalCase(
    featureName
  )}ViewState();
  }
  
  class _${toPascalCase(featureName)}ViewState extends State<${toPascalCase(
    featureName
  )}View> {
    @override
    Widget build(BuildContext context) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('${toPascalCase(featureName)}View'),
        ),
        body: const Center(
          child: Text('${toPascalCase(featureName)}View'),
        ),
      );
    }
  }
              
              `;
}
