type NotificationIdentity = { id: string; memberIds?: string[] };
export function parseNotificationIds(raw: string | null): Set<string>;
export function collectNotificationIds(events: NotificationIdentity[]): string[];
export function isNotificationDismissed(event: NotificationIdentity, dismissed: Set<string>): boolean;
export function updateNotificationIds(current: Set<string>, ids: string[], add: boolean): Set<string>;
