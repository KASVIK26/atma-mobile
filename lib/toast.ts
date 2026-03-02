/**
 * Toast notification helpers
 *
 * Wraps react-native-toast-message to provide a consistent, typed API.
 * Import `showToast` anywhere — it calls Toast.show under the hood.
 *
 * The <Toast /> component is rendered once in app/_layout.tsx so it floats
 * above all screens without needing a local mount.
 *
 * Usage:
 *   import { showToast } from '@/lib/toast';
 *
 *   showToast.success('Profile saved');
 *   showToast.error('Network error — please retry');
 *   showToast.info('Attendance window opens in 5 minutes');
 */

import Toast, { ToastShowParams } from 'react-native-toast-message';

const defaults: Partial<ToastShowParams> = {
  position: 'top',
  visibilityTime: 3_000,
  autoHide: true,
  topOffset: 56,
};

export const showToast = {
  /** Green success toast */
  success: (text1: string, text2?: string, opts?: Partial<ToastShowParams>) =>
    Toast.show({ ...defaults, type: 'success', text1, text2, ...opts }),

  /** Red error toast */
  error: (text1: string, text2?: string, opts?: Partial<ToastShowParams>) =>
    Toast.show({
      ...defaults,
      type: 'error',
      text1,
      text2,
      visibilityTime: 5_000, // errors stay a bit longer
      ...opts,
    }),

  /** Blue info toast */
  info: (text1: string, text2?: string, opts?: Partial<ToastShowParams>) =>
    Toast.show({ ...defaults, type: 'info', text1, text2, ...opts }),
};
