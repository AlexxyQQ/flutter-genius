/**
 * Generates the content for the main BLoC file.
 */
export function getBlocContent(pascalName: string, snakeName: string): string {
    return `import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:equatable/equatable.dart';

part '${snakeName}_event.dart';
part '${snakeName}_state.dart';
part '${snakeName}_bloc.freezed.dart';

class ${pascalName}Bloc extends Bloc<${pascalName}Event, ${pascalName}State> {
  ${pascalName}Bloc() : super(${pascalName}State.initial()) {
    on<SomethingEvent>(_onSomethingEvent);
  }

  void _onSomethingEvent(SomethingEvent event, Emitter<${pascalName}State> emit) {
    // Handle the event and emit new states
  }
}
`;
}

/**
 * Generates the content for the Event file.
 */
export function getEventContent(pascalName: string, snakeName: string): string {
    return `part of '${snakeName}_bloc.dart';

abstract class ${pascalName}Event extends Equatable {}

class SomethingEvent extends ${pascalName}Event {
  @override
  List<Object?> get props => [];
}
`;
}

/**
 * Generates the content for the State file.
 */
export function getStateContent(pascalName: string, snakeName: string): string {
    return `part of '${snakeName}_bloc.dart';

@freezed
class ${pascalName}State with _$${pascalName}State {
  const ${pascalName}State._();

  const factory ${pascalName}State({
    @Default(false) bool isLoading,
    @Default(false) bool isSuccess,
    String? errorMessage,
  }) = _${pascalName}State;

  factory ${pascalName}State.initial() => const ${pascalName}State();
}
`;
}