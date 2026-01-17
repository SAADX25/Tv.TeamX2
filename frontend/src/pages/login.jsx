import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username) return;
    setLoading(true);
    await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username }),
    });
    const roomRes = await fetch("/rooms/new", { credentials: "include" });
    const { roomId, sigToken } = await roomRes.json();
    sessionStorage.setItem("sigToken", sigToken);
    window.location.href = `/room/${roomId}`;
  };

  return (
    <div className="login">
      <h1>Private Room</h1>
      <input
        placeholder="اسم المستخدم"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "..." : "دخول"}
      </button>
    </div>
  );
}