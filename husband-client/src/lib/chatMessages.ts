import type { ChatMessage, ChatSender } from "../types/domain";

export const CHAT_STORAGE_KEY = "laoniu.chat-messages.v1";

function chatId(sender: ChatSender) {
  return `chat-${sender}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isChatSender(value: unknown): value is ChatSender {
  return value === "husband" || value === "wife";
}

function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ChatMessage>;
  if (
    typeof record.id !== "string" ||
    !isChatSender(record.sender) ||
    typeof record.text !== "string" ||
    typeof record.createdAt !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    sender: record.sender,
    text: record.text,
    createdAt: record.createdAt,
    readBy: Array.isArray(record.readBy)
      ? record.readBy.filter(isChatSender)
      : [],
  };
}

export function hydrateChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeMessage)
    .filter((message): message is ChatMessage => Boolean(message))
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

function mergeChatMessage(first: ChatMessage, second: ChatMessage) {
  const readBy = Array.from(new Set([...first.readBy, ...second.readBy])).filter(
    isChatSender,
  );
  const firstTime = Date.parse(first.createdAt);
  const secondTime = Date.parse(second.createdAt);
  const preferred =
    Number.isFinite(secondTime) && secondTime >= (Number.isFinite(firstTime) ? firstTime : 0)
      ? second
      : first;
  return {
    ...preferred,
    readBy,
  };
}

export function mergeChatMessages(
  firstMessages: ChatMessage[],
  secondMessages: ChatMessage[],
) {
  const merged = new Map<string, ChatMessage>();
  firstMessages.forEach((message) => merged.set(message.id, message));
  secondMessages.forEach((message) => {
    const existing = merged.get(message.id);
    merged.set(message.id, existing ? mergeChatMessage(existing, message) : message);
  });
  return [...merged.values()].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

export function createChatMessage(sender: ChatSender, text: string): ChatMessage {
  return {
    id: chatId(sender),
    sender,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    readBy: [sender],
  };
}

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return hydrateChatMessages(parsed);
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // The chat panel still works for the current session when storage is blocked.
  }
}

export function unreadChatCount(messages: ChatMessage[], viewer: ChatSender) {
  return messages.filter(
    (message) => message.sender !== viewer && !message.readBy.includes(viewer),
  ).length;
}

export function markChatMessagesRead(
  messages: ChatMessage[],
  viewer: ChatSender,
) {
  let changed = false;
  const nextMessages = messages.map((message) => {
    if (message.sender === viewer || message.readBy.includes(viewer)) {
      return message;
    }
    changed = true;
    return {
      ...message,
      readBy: [...message.readBy, viewer],
    };
  });

  return changed ? nextMessages : messages;
}
