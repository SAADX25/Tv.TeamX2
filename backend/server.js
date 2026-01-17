import dotenv from "dotenv";
dotenv.config();

import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import { validateSigToken } from "./sigAuth.js";

const {
  PORT = 4000,
  JWT_SECRET = "change_me",
  ORIGIN = "http://localhost:5173",
} = process.env;

const fastify = Fastify({ logger: true });

fastify.register(fastifyCors, { origin: ORIGIN, credentials: true });
fastify.register(fastifyCookie, { parseOptions: { sameSite: "lax", secure: false } });
fastify.register(fastifyJwt, { secret: JWT_SECRET });

fastify.post("/auth/login", async (req, reply) => {
  const { username } = req.body || {};
  if (!username) return reply.code(400).send({ error: "username required" });
  const token = fastify.jwt.sign({ sub: username }, { expiresIn: "2h" });
  reply
    .setCookie("token", token, { httpOnly: true, sameSite: "lax", secure: false, path: "/" })
    .send({ ok: true, token });
});

fastify.get("/rooms/new", async (_req, reply) => {
  const roomId = nanoid(10);
  const sigToken = fastify.jwt.sign({ roomId }, { expiresIn: "2h" });
  reply.send({ roomId, sigToken });
});

// Wait for Fastify to be ready before creating Socket.IO server
await fastify.ready();
const io = new Server(fastify.server, { cors: { origin: ORIGIN, credentials: true } });

io.use((socket, next) => {
  try {
    const { token, sigToken } = socket.handshake.auth || {};
    const user = fastify.jwt.verify(token);
    const payload = validateSigToken(sigToken, fastify.jwt);
    socket.data.user = user.sub;
    socket.data.roomId = payload.roomId;
    next();
  } catch (err) {
    next(err);
  }
});

io.on("connection", (socket) => {
  const { roomId, user } = socket.data;
  socket.join(roomId);
  io.to(roomId).emit("system", { type: "join", user });

  socket.on("signal", (payload) => socket.to(roomId).emit("signal", { from: user, ...payload }));
  socket.on("disconnect", () => socket.to(roomId).emit("system", { type: "leave", user }));
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`server listening on ${address}`);
});