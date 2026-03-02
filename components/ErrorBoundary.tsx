/**
 * ErrorBoundary
 *
 * Production-grade React error boundary that catches unhandled render errors
 * anywhere in the component tree, logs them, and shows a friendly recovery UI
 * instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 */

import * as Sentry from '@sentry/react-native';
import { Component, ErrorInfo, ReactNode } from 'react';
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface Props {
  children: ReactNode;
  /** Optional custom fallback to render instead of the default error UI */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console
    console.error('[ErrorBoundary] Uncaught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    // Forward to Sentry (no-op if Sentry was not initialised)
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.reset);
      }

      return (
        <View style={styles.container}>
          <Image
            source={require('@/assets/images/ATMA-inApp.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Please try again.
          </Text>

          <ScrollView style={styles.detailBox} contentContainerStyle={styles.detailContent}>
            <Text style={styles.detailText}>{error.message}</Text>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={this.reset}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return children;
  }
}

export default ErrorBoundary;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#F9FAFB',
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 24,
    borderRadius: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailBox: {
    maxHeight: 100,
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  detailContent: {
    padding: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#DC2626',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
