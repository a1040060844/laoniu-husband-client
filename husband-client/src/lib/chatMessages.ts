import type { ChatMessage, ChatSender } from "../types/domain";

const CHAT_STORAGE_KEY = "laoniu.chat-messages.v1";

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
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMessage)
      .filter((message): message is ChatMessage => Boolean(message))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
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
