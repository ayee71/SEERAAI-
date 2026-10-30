export interface DeviceInfo {
  deviceType: string;
  browser: string;
  os: string;
  fullUA: string;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return { deviceType: 'Desktop Device', browser: 'Web Browser', os: 'Web OS', fullUA: 'Unknown' };
  }
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android OS';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile';
  else if (ua.includes('Linux')) os = 'Linux OS';

  let browser = 'Web Browser';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Google Chrome';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Edg')) browser = 'Microsoft Edge';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const deviceType = isMobile ? '📱 Mobile Device' : '💻 Desktop / Laptop';

  return { deviceType, browser, os, fullUA: ua };
}
