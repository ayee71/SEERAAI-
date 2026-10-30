export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported.');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showNotification = (title: string, body: string) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  new Notification(title, {
    body,
    icon: '/apple-touch-icon.png', // Uses existing asset
  });
};
