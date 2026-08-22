export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('このブラウザは通知に対応していません')
  }

  const permission = await Notification.requestPermission()

  return permission
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }

  return Notification.permission
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('このブラウザはService Workerに対応していません')
  }

  const registration = await navigator.serviceWorker.ready

  return registration
}