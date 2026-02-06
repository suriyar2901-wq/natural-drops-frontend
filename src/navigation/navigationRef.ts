import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

// Central navigation ref used across nested navigators (tabs inside stack).
// Avoid importing AppNavigator from screens (prevents circular dependencies).
export const navigationRef = createNavigationContainerRef<any>();

export function navIsReady() {
  return navigationRef.isReady?.() === true;
}

export function navigate(name: string, params?: any) {
  if (!navIsReady()) return;
  try {
    navigationRef.navigate(name as never, params as never);
  } catch (e) {
    // no-op
  }
}

export function resetTo(name: string, params?: any) {
  if (!navIsReady()) return;
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name, params }],
    })
  );
}










