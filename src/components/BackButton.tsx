import { useRouter, type Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

import { Button } from './Button';

interface Props {
  /** Where to go when there is no history (the screen was opened directly or refreshed): its parent tab. */
  fallback: Href;
  /** Use instead of normal back behaviour, e.g. to step back inside a multi-step form. */
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * The back button for every screen that sits deeper than a main tab.
 * Goes back to wherever the person came from, the same as the browser's back
 * button, and that screen is exactly as they left it.
 */
export function BackButton({ fallback, onPress, disabled }: Props) {
  const router = useRouter();
  return (
    <Button
      label="Back"
      icon={ArrowLeft}
      variant="secondary"
      disabled={disabled}
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace(fallback)))}
    />
  );
}
