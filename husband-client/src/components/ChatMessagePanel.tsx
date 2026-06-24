import { X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { ChatMessage, ChatSender } from "../types/domain";
import { publicAsset } from "../lib/assets";
import { ClickSpark } from "./effects/ClickSpark";

interface ChatMessageButtonProps {
  className?: string;
  viewer: ChatSender;
  unreadCount: number;
  onClick: () => void;
}

interface ChatMessagePanelProps {
  isOpen: boolean;
  viewer: ChatSender;
  messages: ChatMessage[];
  onClose: () => void;
  onSend: (text: string) => void;
}

const senderLabel: Record<ChatSender, string> = {
  husband: "老哥",
  wife: "老妞大人",
};

const senderAvatar: Record<ChatSender, string> = {
  husband: "哥",
  wife: "妞",
};

const chatActionIcon: Record<ChatSender, string> = {
  husband: publicAsset("/assets/ui/chat-submit.png"),
  wife: publicAsset("/assets/ui/chat-decree.png"),
};

const chatActionLabel: Record<ChatSender, string> = {
  husband: "上奏",
  wife: "下旨",
};

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMessageButton({
  className,
  viewer,
  unreadCount,
  onClick,
}: ChatMessageButtonProps) {
  const label = chatActionLabel[viewer];
  const button = (
    <button
      className={`chat-message-button memorial-icon-button${className ? ` ${className}` : ""}`}
      type="button"
      aria-label={`${label}聊天留言`}
      onClick={onClick}
    >
      <span>聊天留言</span>
      <img
        className="chat-message-button__image"
        src={chatActionIcon[viewer]}
        alt=""
        draggable={false}
      />
      {unreadCount > 0 ? (
        <b aria-label={`${unreadCount} 条未读留言`}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </b>
      ) : null}
    </button>
  );

  return viewer === "husband" ? button : <ClickSpark>{button}</ClickSpark>;
}

export function ChatMessagePanel({
  isOpen,
  viewer,
  messages,
  onClose,
  onSend,
}: ChatMessagePanelProps) {
  const [draft, setDraft] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const peer = viewer === "husband" ? "wife" : "husband";
  const title = viewer === "husband" ? "给老妞留言" : "给老哥留言";
  const placeholder =
    viewer === "husband" ? "给老妞留一句话......" : "给老哥留一句话......";

  const orderedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      ),
    [messages],
  );

  useEffect(() => {
    if (!isOpen) return;
    const scroller = scrollRef.current;
    if (!scroller) return;
    window.requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight;
    });
  }, [isOpen, orderedMessages.length]);

  useEffect(() => {
    if (!isOpen) {
      setKeyboardOffset(0);
      return;
    }

    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const updateKeyboardOffset = () => {
      const offset = Math.max(
        0,
        window.innerHeight - visualViewport.height - visualViewport.offsetTop,
      );
      setKeyboardOffset(Math.round(offset));
    };

    updateKeyboardOffset();
    visualViewport.addEventListener("resize", updateKeyboardOffset);
    visualViewport.addEventListener("scroll", updateKeyboardOffset);
    return () => {
      visualViewport.removeEventListener("resize", updateKeyboardOffset);
      visualViewport.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, [isOpen]);

  function submitMessage() {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  }

  return (
    <div
      className={`chat-message-drawer${isOpen ? " chat-message-drawer--open" : ""}`}
      aria-hidden={!isOpen}
      style={
        {
          "--chat-keyboard-offset": `${keyboardOffset}px`,
        } as CSSProperties
      }
    >
      <button
        className="chat-message-drawer__scrim"
        type="button"
        aria-label="关闭聊天留言"
        tabIndex={isOpen ? 0 : -1}
        onClick={onClose}
      />
      <section
        className="chat-message-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="chat-message-sheet__header">
          <div className="chat-message-sheet__title">
            <span aria-hidden="true" />
            <div>
              <h2>{title}</h2>
              <p>可在此留下想说的话</p>
            </div>
            <span aria-hidden="true" />
          </div>
          <ClickSpark>
            <button
              className="chat-message-sheet__close"
              type="button"
              aria-label="关闭"
              onClick={onClose}
            >
              <X size={25} />
            </button>
          </ClickSpark>
        </header>

        <div className="chat-message-list" ref={scrollRef}>
          {orderedMessages.length ? (
            orderedMessages.map((message) => {
              const isMine = message.sender === viewer;
              return (
                <article
                  className={`chat-message-item${isMine ? " chat-message-item--mine" : ""}`}
                  key={message.id}
                >
                  <div className="chat-message-avatar" aria-hidden="true">
                    {isMine ? senderAvatar[viewer] : senderAvatar[peer]}
                  </div>
                  <div className="chat-message-item__body">
                    <div className="chat-message-meta">
                      <span>{isMine ? senderLabel[viewer] : senderLabel[peer]}</span>
                      <time>{formatChatTime(message.createdAt)}</time>
                    </div>
                    <p>{message.text}</p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="chat-message-empty">
              <strong>还没有留言</strong>
              <p>
                {viewer === "husband"
                  ? "给老妞大人留一句温柔的话，等她打开时便能看见。"
                  : "给老哥留一道口谕，等他回来时自会领会。"}
              </p>
            </div>
          )}
        </div>

        <footer className="chat-message-compose">
          <input
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitMessage();
            }}
          />
          <ClickSpark>
            <button
              type="button"
              aria-label={chatActionLabel[viewer]}
              onClick={submitMessage}
              disabled={!draft.trim()}
            >
              <img
                className="chat-message-compose__icon"
                src={chatActionIcon[viewer]}
                alt=""
                draggable={false}
              />
              <span>发送</span>
            </button>
          </ClickSpark>
        </footer>
      </section>
    </div>
  );
}
