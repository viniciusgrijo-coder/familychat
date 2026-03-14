# 🏠 FamilyChat — Chat Privado da Família

Sistema de chat completo e privado para sua família, com:
- 💬 Mensagens em tempo real
- 📷 Envio de fotos e arquivos
- 📞 Chamadas de voz (WebRTC)
- 🔒 Acesso apenas para sua família
- 📱 Funciona no celular e PC (pelo navegador)
- 🌐 Online (internet) e Offline (Wi-Fi local)

---

## 📦 INSTALAÇÃO (5 minutos)

### Requisitos
- **Node.js** instalado → https://nodejs.org (baixe a versão LTS)

### Passo 1 — Instalar dependências
```bash
# Abra o terminal na pasta do projeto e rode:
npm install
```

### Passo 2 — Iniciar o servidor
```bash
node server.js
```

Você verá:
```
🏠 FamilyChat rodando em:
   Local:   http://localhost:3000
   Rede:    http://SEU_IP_LOCAL:3000
```

### Passo 3 — Acessar
- **No mesmo computador:** abra http://localhost:3000
- **Outros dispositivos na mesma rede Wi-Fi:** use o IP mostrado no terminal

---

## 👤 Usuários Padrão

| Perfil | Usuário  | Senha padrão |
|--------|----------|--------------|
| 👨 Pai  | pai      | familia123   |
| 👩 Mãe  | mae      | familia123   |
| 👦 Filho| filho    | familia123   |
| 👧 Filha| filha    | familia123   |
| 👵 Vovó | vovo     | familia123   |

> **Importante:** Cada pessoa deve trocar sua senha após o primeiro login!

---

## 🌐 Usar de QUALQUER LUGAR (internet)

Para acessar de fora de casa, você precisa de uma das opções:

### Opção A — Ngrok (gratuito, fácil)
1. Baixe o ngrok: https://ngrok.com/download
2. Com o FamilyChat rodando, abra outro terminal e rode:
   ```bash
   ngrok http 3000
   ```
3. O ngrok vai te dar um link público tipo: `https://abc123.ngrok.io`
4. Compartilhe esse link com a família!
> ⚠️ O link muda toda vez que você reiniciar o ngrok (plano gratuito)

### Opção B — Railway (gratuito, permanente)
1. Crie conta em https://railway.app
2. Faça upload do projeto ou conecte ao GitHub
3. Deploy automático com URL fixa

### Opção C — Servidor VPS (R$ 15-25/mês)
- Contrate um VPS na DigitalOcean, Hostinger ou Contabo
- Faça upload do projeto via FTP/SSH
- Configure para rodar com `pm2` (mantém online 24h)

---

## 📱 Instalar como App no Celular (PWA)

1. Acesse o FamilyChat pelo Chrome no celular
2. Toque nos 3 pontinhos (menu)
3. Selecione **"Adicionar à tela inicial"**
4. Pronto! Vai aparecer como um app normal

---

## 🔧 Personalização

### Alterar nomes/avatares
Edite o arquivo `data/db.json` (criado na primeira execução) ou edite os usuários em `server.js`.

### Adicionar mais salas
No `data/db.json`, adicione na seção `rooms`:
```json
{ "id": "jogos", "name": "Jogos", "icon": "🎮", "description": "Falar de games" }
```

---

## 📁 Estrutura
```
familychat/
├── server.js          ← Servidor principal
├── package.json       ← Dependências
├── public/
│   └── index.html     ← App completo (frontend)
├── uploads/           ← Fotos e arquivos enviados
└── data/
    └── db.json        ← Banco de dados (criado automaticamente)
```

---

## 🛡️ Segurança

- Toda comunicação usa JWT (token criptografado)
- Senhas salvas com bcrypt (hash seguro)
- Para uso na internet, considere adicionar HTTPS

---

## ❓ Problemas comuns

**"Cannot find module"** → Rode `npm install` primeiro

**"Port already in use"** → Mude a porta: `PORT=3001 node server.js`

**Celular não conecta** → Verifique se está na mesma rede Wi-Fi e use o IP do terminal
