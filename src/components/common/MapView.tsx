/**
 * MapView.tsx
 * Platform-agnostic export file
 * 
 * React Native bundler (Metro) automatically resolves platform-specific files:
 * - MapView.mobile.tsx → iOS and Android
 * - MapView.web.tsx → Web
 * 
 * When you import: import MapView from './MapView'
 * The bundler automatically picks the right file based on platform.
 * 
 * This file is a fallback that re-exports the mobile version.
 * In practice, the bundler will use .mobile.tsx or .web.tsx directly.
 */

// Re-export mobile version as fallback
// Bundler will automatically use .mobile.tsx or .web.tsx based on platform
export { MapView, MapView as default } from './MapView.mobile';
export type { MapViewProps } from './MapView.mobile';

