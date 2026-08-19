import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

/// Wraps step content with a consistent fade/slide entrance transition
/// (150-300ms, tasteful, not gratuitous).
class WizardStepScaffold extends StatelessWidget {
  final Widget child;
  const WizardStepScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return child.animate().fadeIn(duration: 220.ms).slideY(begin: 0.03, end: 0, duration: 220.ms, curve: Curves.easeOut);
  }
}

/// Standard "Save & Continue" footer button row used by every step.
class WizardStepFooter extends StatelessWidget {
  final VoidCallback? onSave;
  final bool loading;
  final String label;
  final Widget? leading;

  const WizardStepFooter({
    super.key,
    required this.onSave,
    required this.loading,
    this.label = 'Save & Continue',
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          leading ?? const SizedBox.shrink(),
          ElevatedButton(
            onPressed: loading ? null : onSave,
            child: loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text(label),
          ),
        ],
      ),
    );
  }
}

class StepHeading extends StatelessWidget {
  final String title;
  final String? subtitle;
  const StepHeading({super.key, required this.title, this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.3)),
          if (subtitle != null) ...[
            const SizedBox(height: 4),
            Text(subtitle!, style: const TextStyle(fontSize: 13, color: Colors.black54, height: 1.4)),
          ],
        ],
      ),
    );
  }
}
