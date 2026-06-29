import type {
  ChatSender,
  DecreeEvent,
  NotificationEvent,
  NotificationTone,
} from "../types/domain";

export type NotificationQueueItem =
  | {
      id: string;
      kind: "decree";
      target: ChatSender;
      sourceId: string;
      title: string;
      text: string;
      tone: NotificationTone;
      createdAt: string;
      remainingCount: number;
      decree: DecreeEvent;
    }
  | {
      id: string;
      kind: "notification";
      target: ChatSender;
      sourceId: string;
      title: string;
      text: string;
      tone: NotificationTone;
      createdAt: string;
      remainingCount: number;
      notification: NotificationEvent;
    };

export function notificationId(
  source: NotificationEvent["source"],
  target: ChatSender,
  sourceId: string,
) {
  return `notification-${source}-${target}-${sourceId}`;
}

export function createNotification(
  notification: Omit<NotificationEvent, "id" | "createdAt" | "tone"> & {
    createdAt?: string;
    tone?: NotificationTone;
  },
): NotificationEvent {
  return {
    ...notification,
    id: notificationId(
      notification.source,
      notification.target,
      notification.sourceId,
    ),
    createdAt: notification.createdAt ?? new Date().toISOString(),
    tone: notification.tone ?? "normal",
  };
}

export function upsertNotification(
  notifications: NotificationEvent[],
  notification: NotificationEvent,
) {
  const index = notifications.findIndex((item) => item.id === notification.id);
  if (index < 0) return [...notifications, notification];
  return notifications.map((item, currentIndex) =>
    currentIndex === index
      ? {
          ...notification,
          viewedAt: item.viewedAt ?? notification.viewedAt,
          skippedAt: item.skippedAt ?? notification.skippedAt,
        }
      : item,
  );
}

export function mergeNotifications(
  serverNotifications: NotificationEvent[],
  localNotifications: NotificationEvent[],
) {
  const merged = new Map<string, NotificationEvent>();
  for (const notification of serverNotifications) {
    merged.set(notification.id, notification);
  }
  for (const local of localNotifications) {
    const server = merged.get(local.id);
    merged.set(local.id, {
      ...(server ?? local),
      ...local,
      viewedAt: local.viewedAt ?? server?.viewedAt,
      skippedAt: local.skippedAt ?? server?.skippedAt,
    });
  }
  return [...merged.values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function markNotificationViewed(
  notifications: NotificationEvent[],
  notificationId: string,
  viewedAt = new Date().toISOString(),
) {
  return notifications.map((notification) =>
    notification.id === notificationId
      ? { ...notification, viewedAt, skippedAt: notification.skippedAt }
      : notification,
  );
}

export function markNotificationSkipped(
  notifications: NotificationEvent[],
  notificationId: string,
  skippedAt = new Date().toISOString(),
) {
  return notifications.map((notification) =>
    notification.id === notificationId
      ? { ...notification, skippedAt }
      : notification,
  );
}

export function buildNotificationQueue({
  decrees,
  notifications,
  target,
}: {
  decrees: DecreeEvent[];
  notifications: NotificationEvent[];
  target: ChatSender;
}): NotificationQueueItem[] {
  const decreeItems = decrees
    .filter((decree) => decree.target === target && !decree.acknowledgedAt)
    .map((decree): NotificationQueueItem => ({
      id: `decree:${decree.id}`,
      kind: "decree",
      target,
      sourceId: decree.id,
      title: decree.title,
      text: decree.text,
      tone: decree.tone,
      createdAt: decree.createdAt,
      remainingCount: 0,
      decree,
    }));
  const notificationItems = notifications
    .filter(
      (notification) =>
        notification.target === target && !notification.viewedAt,
    )
    .map((notification): NotificationQueueItem => ({
      id: `notification:${notification.id}`,
      kind: "notification",
      target,
      sourceId: notification.sourceId,
      title: notification.title,
      text: notification.text,
      tone: notification.tone,
      createdAt: notification.createdAt,
      remainingCount: 0,
      notification,
    }));

  return [...decreeItems, ...notificationItems]
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .map((item, index, items) => ({
      ...item,
      remainingCount: items.length - index - 1,
    }));
}

export function hasUnreadNotifications(items: NotificationQueueItem[]) {
  return items.length > 0;
}
