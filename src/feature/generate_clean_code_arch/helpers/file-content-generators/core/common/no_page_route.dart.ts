export default function noPageRouteDart() {
  return `
    // ! DO NOT MODIFY THIS FILE

import 'exports.dart';

class NoRoutePage extends StatelessWidget {
  const NoRoutePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(''),
      ),
      body: const Center(
        child: Text('404 Page Not Found'),
      ),
    );
  }
}
`;
}
