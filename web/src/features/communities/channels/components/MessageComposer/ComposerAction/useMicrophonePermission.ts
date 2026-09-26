import { useEffect, useState } from 'react';

export function useMicrophonePermission() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    let active = true;
    let permissionStatus: PermissionStatus | null = null;

    async function checkPermission() {
      if (!navigator.mediaDevices?.getUserMedia || !('MediaRecorder' in window)) return;

      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (!active) return;
        if (permissionStatus) permissionStatus.onchange = null;
        permissionStatus = status;
        setGranted(status.state === 'granted');
        status.onchange = () => {
          if (active) setGranted(status.state === 'granted');
        };
      } catch {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (active) {
            setGranted(
              devices.some((device) => device.kind === 'audioinput' && Boolean(device.label)),
            );
          }
        } catch {
          if (active) setGranted(false);
        }
      }
    }

    void checkPermission();
    window.addEventListener('focus', checkPermission);
    return () => {
      active = false;
      window.removeEventListener('focus', checkPermission);
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, []);

  return granted;
}
