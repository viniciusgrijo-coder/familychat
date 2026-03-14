// ============================================================
//  FamilyChat — Servidor Principal
//  Node.js + Express + Socket.IO
// ============================================================
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const multer    = require('multer');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const path      = require('path');
const fs        = require('fs');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { maxHttpBufferSize: 50e6 });

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'familychat-secret-2024';

// ── Diretórios ───────────────────────────────────────────────
['uploads', 'data'].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── Banco de dados simples em JSON ───────────────────────────
const DB_FILE = './data/db.json';
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [
        // Usuários pré-cadastrados (senha padrão: "familia123")
        { id: uuidv4(), name: 'Pai',  username: 'pai',   password: bcrypt.hashSync('familia123', 10), avatar: '👨', color: '#4a9eff' },
        { id: uuidv4(), name: 'Mãe',  username: 'mae',   password: bcrypt.hashSync('familia123', 10), avatar: '👩', color: '#ff6b9d' },
        { id: uuidv4(), name: 'Filho', username: 'filho', password: bcrypt.hashSync('familia123', 10), avatar: '👦', color: '#4affa0' },
        { id: uuidv4(), name: 'Filha', username: 'filha', password: bcrypt.hashSync('familia123', 10), avatar: '👧', color: '#ffcc4a' },
        { id: uuidv4(), name: 'Vovó', username: 'vovo',  password: bcrypt.hashSync('familia123', 10), avatar: '👵', color: '#c084fc' },
      ],
      messages: [],
      rooms: [
        { id: 'geral',  name: 'Família Toda', icon: '🏠', description: 'Grupo principal da família' },
        { id: 'avisos', name: 'Avisos',        icon: '📢', description: 'Recados importantes' },
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ── Multer (upload de imagens/arquivos) ─────────────────────
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Middlewares ──────────────────────────────────────────────
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ── Auth middleware ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sem token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Token inválido' }); }
}

// ── ROTAS HTTP ───────────────────────────────────────────────

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.username === username);
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ error: 'Usuário ou senha incorretos' });

  const token = jwt.sign(
    { id: user.id, name: user.name, username: user.username, avatar: user.avatar, color: user.color },
    JWT_SECRET, { expiresIn: '30d' }
  );
  res.json({ token, user: { id: user.id, name: user.name, username: user.username, avatar: user.avatar, color: user.color } });
});

// Alterar senha
app.post('/api/change-password', authMiddleware, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const db = loadDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user || !await bcrypt.compare(oldPassword, user.password))
    return res.status(401).json({ error: 'Senha atual incorreta' });
  user.password = await bcrypt.hash(newPassword, 10);
  saveDB(db);
  res.json({ ok: true });
});

// Salas
app.get('/api/rooms', authMiddleware, (req, res) => {
  res.json(loadDB().rooms);
});

// Mensagens de uma sala
app.get('/api/messages/:roomId', authMiddleware, (req, res) => {
  const db = loadDB();
  const msgs = db.messages.filter(m => m.room === req.params.roomId).slice(-100);
  res.json(msgs);
});

// Upload de arquivo
app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo' });
  res.json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size
  });
});

// Usuários online
app.get('/api/users', authMiddleware, (req, res) => {
  const db = loadDB();
  res.json(db.users.map(u => ({
    id: u.id, name: u.name, username: u.username,
    avatar: u.avatar, color: u.color
  })));
});

// ── SOCKET.IO ────────────────────────────────────────────────
const onlineUsers = new Map(); // socketId → user info

// Auth no socket
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Sem token'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { next(new Error('Token inválido')); }
});

io.on('connection', (socket) => {
  const user = socket.user;
  onlineUsers.set(socket.id, { ...user, socketId: socket.id });
  
  console.log(`✅ ${user.name} conectou`);
  
  // Notifica todos os usuários online
  io.emit('users:online', [...onlineUsers.values()]);

  // Entrar em sala
  socket.on('room:join', (roomId) => {
    socket.join(roomId);
  });

  // Mensagem de texto
  socket.on('message:send', (data) => {
    const db = loadDB();
    const msg = {
      id: uuidv4(),
      room: data.room,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userColor: user.color,
      text: data.text,
      type: 'text',
      replyTo: data.replyTo || null,
      createdAt: new Date().toISOString()
    };
    db.messages.push(msg);
    // Mantém apenas as últimas 1000 mensagens por sala
    if (db.messages.length > 5000) db.messages = db.messages.slice(-5000);
    saveDB(db);
    io.to(data.room).emit('message:new', msg);
  });

  // Mensagem com arquivo/imagem
  socket.on('message:file', (data) => {
    const db = loadDB();
    const msg = {
      id: uuidv4(),
      room: data.room,
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userColor: user.color,
      text: data.caption || '',
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      type: 'file',
      replyTo: data.replyTo || null,
      createdAt: new Date().toISOString()
    };
    db.messages.push(msg);
    saveDB(db);
    io.to(data.room).emit('message:new', msg);
  });

  // Digitando...
  socket.on('typing:start', (roomId) => {
    socket.to(roomId).emit('typing:update', { user: user.name, typing: true });
  });
  socket.on('typing:stop', (roomId) => {
    socket.to(roomId).emit('typing:update', { user: user.name, typing: false });
  });

  // ── WebRTC Signaling (chamadas de voz/vídeo) ──────────────
  socket.on('call:start', (data) => {
    // data: { targetUserId, offer, callType: 'audio'|'video' }
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.id === data.targetUserId)?.[0];
    if (targetSocket) {
      io.to(targetSocket).emit('call:incoming', {
        from: { id: user.id, name: user.name, avatar: user.avatar },
        offer: data.offer,
        callType: data.callType
      });
    }
  });

  socket.on('call:answer', (data) => {
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.id === data.targetUserId)?.[0];
    if (targetSocket) {
      io.to(targetSocket).emit('call:answered', { answer: data.answer });
    }
  });

  socket.on('call:ice', (data) => {
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.id === data.targetUserId)?.[0];
    if (targetSocket) {
      io.to(targetSocket).emit('call:ice', { candidate: data.candidate });
    }
  });

  socket.on('call:end', (data) => {
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.id === data.targetUserId)?.[0];
    if (targetSocket) io.to(targetSocket).emit('call:ended');
  });

  socket.on('call:reject', (data) => {
    const targetSocket = [...onlineUsers.entries()]
      .find(([, u]) => u.id === data.targetUserId)?.[0];
    if (targetSocket) io.to(targetSocket).emit('call:rejected');
  });

  // Desconexão
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    console.log(`❌ ${user.name} desconectou`);
    io.emit('users:online', [...onlineUsers.values()]);
  });
});

// ── Inicia servidor ──────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏠 FamilyChat rodando em:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Rede:    http://SEU_IP_LOCAL:${PORT}`);
  console.log(`\n👤 Usuários padrão (senha: familia123):`);
  console.log(`   pai / mae / filho / filha / vovo\n`);
});
