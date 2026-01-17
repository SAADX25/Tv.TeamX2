export default function ChatBubble({ from, text, system }) {
  if (system) return <div className="bubble system">{text}</div>;
  const cls = from === "me" ? "bubble me slowmo" : "bubble peer slowmo";
  return <div className={cls}>{text}</div>;
}