import { requireOptionalNativeModule } from 'expo';

interface ProximityNativeModule {
  setMonitoring(enabled: boolean): void;
}

// Optional so a build made before this module existed keeps working, just without the sensor.
const Proximity = requireOptionalNativeModule<ProximityNativeModule>('Proximity');

/** Turns the screen off while the phone is held to the ear. */
export function setProximityMonitoring(enabled: boolean): void {
  Proximity?.setMonitoring(enabled);
}
