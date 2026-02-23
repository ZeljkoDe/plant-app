import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationCategory() {
  await Notifications.setNotificationCategoryAsync('planty-reminder', [
    {
      identifier: 'watered',
      buttonTitle: 'Mark as watered',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'snooze',
      buttonTitle: 'Snooze 1 day',
      options: { opensAppToForeground: true },
    },
  ]);
}

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function onNotificationAction(handler) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const action = response.actionIdentifier;
    const data = response.notification.request.content.data || {};
    handler({ action, data });
  });
}

export async function cancelNotification(notificationId) {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => null);
}

export async function schedulePlantReminderNotification(plant) {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `💧 ${plant.name} might be thirsty`,
      body: `Planty learned ~${Math.round(plant.learnedIntervalDays)} day rhythm for this plant.`,
      categoryIdentifier: 'planty-reminder',
      data: { plantId: plant.id },
    },
    trigger: new Date(plant.nextReminderAt),
  });

  return id;
}
