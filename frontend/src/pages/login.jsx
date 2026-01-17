import { useState } from "react";

// حدد رابط الـ Backend - غيّره حسب الـ Codespace الخاص بك
const API_URL = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username) return;
    setLoading(true);
    
    try {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body:  JSON.stringify({ username }),
      });
      
      if (!loginRes.ok) {
        throw new Error("Login failed");
      }

      const roomRes = await fetch(`${API_URL}/rooms/new`, { 
        credentials: "include" 
      });
      
      if (!roomRes.ok) {
        throw new Error("Failed to create room");
      }

      const { roomId, sigToken } = await roomRes.json();
      sessionStorage.setItem("sigToken", sigToken);
      window.location.href = `/room/${roomId}`;
    } catch (error) {
      console.error("Error:", error);
      alert("حدث خطأ، تأكد أن الـ Backend يعمل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <h1>Private Room</h1>
      <input
        placeholder="اسم المستخدم"
        value={username}
        onChange={(e) => setUsername(e.target. value)}
      />
      <button onClick={handleLogin} disabled={loading}>
        {loading ? "..." : "دخول"}
      </button>
    </div>
  );
}