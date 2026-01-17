import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import {
  generateKeyPair,
  deriveAesKey,
  encryptMessage,
  decryptMessage,
} from "../lib/crypto.js";
import ChatBubble from "../components/ChatBubble.jsx";

const SIGNAL_SERVER = import.meta.env.VITE_SIGNAL_URL || "http://localhost:4000";

export default function Room() {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("connecting");

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const keyPairRef = useRef(null);
  const sharedKeyRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    (async () => {
      keyPairRef.current = await generateKeyPair();
      const token = getCookie("token");
      const sigToken = sessionStorage.getItem("sigToken");
      const socket = io(SIGNAL_SERVER, {
        withCredentials: true,
        auth: { token, sigToken },
      });
      socketRef.current = socket;

      socket.on("connect", () => setStatus("connected"));
      socket.on("system", ({ type, user }) =>
        setMessages((prev) => [
          ...prev,
          { system: true, text: `${user} ${type === "join" ? "joined" : "left"}` },
        ])
      );

      socket.on("signal", async (payload) => {
        await ensurePeer();
        if (payload.type === "offer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit("signal", { type: "answer", sdp: pcRef.current.localDescription });
        } else if (payload.type === "answer") {
          await pcRef.current.setRemoteDescription(payload.sdp);
        } else if (payload.type === "candidate") {
          await pcRef.current.addIceCandidate(payload.candidate);
        } else if (payload.type === "pubkey") {
          sharedKeyRef.current = await deriveAesKey(
            keyPairRef.current.privateKey,
            payload.pubkey
          );
        }
      });

      await ensurePeer(true);
      socket.emit("signal", { type: "pubkey", pubkey: keyPairRef.current.publicKey });
    })();

    return () => {
      socketRef.current?.disconnect();
      pcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  async function ensurePeer(isCaller = false) {
    if (pcRef.current) return;
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(import.meta.env.VITE_TURN_URL
          ? [
              {
                urls: import.meta.env.VITE_TURN_URL,
                username: import.meta.env.VITE_TURN_USER,
                credential: import.meta.env.VITE_TURN_PASS,
              },
            ]
          : []),
      ],
    });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current.emit("signal", { type: "candidate", candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (audioRef.current) audioRef.current.srcObject = stream;
    };
    pc.onconnectionstatechange = () => setStatus(pc.connectionState);

    const dc = pc.createDataChannel("chat");
    dcRef.current = dc;
    dc.onmessage = async (e) => {
      if (!sharedKeyRef.current) return;
      const data = JSON.parse(e.data);
      const text = await decryptMessage(sharedKeyRef.current, data);
      setMessages((prev) => [...prev, { from: "peer", text }]);
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("signal", { type: "offer", sdp: pc.localDescription });
    }
  }

  const send = async () => {
    if (!input || !dcRef.current || dcRef.current.readyState !== "open") return;
    if (!sharedKeyRef.current) return;
    const payload = await encryptMessage(sharedKeyRef.current, input);
    dcRef.current.send(JSON.stringify(payload));
    setMessages((prev) => [...prev, { from: "me", text: input }]);
    setInput("");
  };

  return (
    <div className="room">
      <header>
        <div>Room: {roomId}</div>
        <div>Status: {status}</div>
      </header>

      <div className="chat">
        {messages.map((m, idx) => (
          <ChatBubble key={idx} from={m.from} system={m.system} text={m.text} />
        ))}
      </div>

      <div className="controls">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="اكتب رسالة..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>إرسال</button>
      </div>

      <audio ref={audioRef} autoPlay />
    </div>
  );
}

function getCookie(name) {
  return document.cookie.split("; ").find((row) => row.startsWith(`${name}=`))?.split("=")[1];
}