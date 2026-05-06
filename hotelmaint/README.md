# 🏨 HotelMaint

Sistema de gestão de manutenção hoteleira para Porto Seguro, BA.

## Usuários de teste (senha: `hotel123`)

| E-mail | Perfil |
|--------|--------|
| admin@hotelmaint.com | Admin (acesso total) |
| mariana@hotelmaint.com | Supervisor (Hotel 1) |
| joao@hotelmaint.com | Supervisor (Hotel 2) |
| pedro@hotelmaint.com | Técnico (Hotel 1) |
| lucas@hotelmaint.com | Técnico (Hotel 1) |
| diego@hotelmaint.com | Técnico (Hotel 2) |
| hospede@hotelmaint.com | Hóspede |

---

## 🚀 Deploy em produção (Railway + Vercel)

### Pré-requisitos
- Conta no [GitHub](https://github.com) (grátis)
- Conta no [Railway](https://railway.app) (grátis)
- Conta no [Vercel](https://vercel.com) (grátis)

---

### PASSO 1 — Subir código no GitHub

1. Acesse [github.com](https://github.com) e crie um repositório chamado `hotelmaint` (deixe como Public)
2. Na página do repositório, clique em **"uploading an existing file"**
3. Arraste as pastas `server` e `client` (com todos os arquivos dentro)
4. Clique em **"Commit changes"**

---

### PASSO 2 — Deploy do Backend no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em **"New Project"** → **"Deploy from GitHub repo"**
3. Selecione o repositório `hotelmaint`
4. Após importar, clique no serviço criado → aba **"Settings"**
5. Em **"Root Directory"**, coloque: `server`
6. Vá na aba **"Variables"** → **"Add Variable"**:
   - `JWT_SECRET` = qualquer texto longo, ex: `minha-chave-secreta-2024`
   - `NODE_ENV` = `production`
7. Vá na aba **"Settings"** → **"Domains"** → **"Generate Domain"**
8. **Copie a URL gerada** (algo como `hotelmaint-production.up.railway.app`)

> ⏱️ O deploy leva cerca de 2-3 minutos. Você verá "Active" quando estiver pronto.

---

### PASSO 3 — Deploy do Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Add New Project"** → **"Import Git Repository"**
3. Selecione o repositório `hotelmaint`
4. Em **"Root Directory"**, clique em **Edit** e coloque: `client`
5. Em **"Environment Variables"**, adicione:
   - Nome: `VITE_API_URL`
   - Valor: a URL do Railway do passo anterior (ex: `https://hotelmaint-production.up.railway.app`)
6. Clique em **"Deploy"**
7. Em cerca de 1 minuto, você receberá a URL do app (ex: `hotelmaint.vercel.app`)

---

### PASSO 4 — Conectar frontend e backend

Volte ao Railway → aba **"Variables"** e adicione:
- `CLIENT_URL` = URL do Vercel (ex: `https://hotelmaint.vercel.app`)

Clique em **"Deploy"** para aplicar.

---

### ✅ Pronto!

Seu app estará disponível em: `https://hotelmaint.vercel.app`

Compartilhe este link com sua equipe. O app funciona em qualquer celular, sem instalar nada.

---

## 💻 Rodar localmente (para desenvolvimento)

### Requisitos
- [Node.js 18+](https://nodejs.org) instalado

### Backend
```bash
cd server
cp .env.example .env
npm install
npm start
```
O servidor inicia em `http://localhost:3001`

### Frontend
```bash
cd client
npm install
npm run dev
```
O app abre em `http://localhost:5173`

---

## 📁 Estrutura do projeto

```
hotelmaint/
├── server/
│   ├── index.js          # Servidor Express principal
│   ├── database.js       # Banco SQLite + seed inicial
│   ├── middleware.js      # Auth JWT
│   ├── package.json
│   └── routes/
│       ├── auth.js        # Login, logout, troca de senha
│       ├── os.js          # Ordens de serviço (CRUD completo)
│       ├── estoque.js     # Gestão de estoque
│       ├── ativos.js      # Equipamentos
│       ├── preventivos.js # Planos preventivos
│       ├── dashboard.js   # KPIs e métricas
│       ├── relatorios.js  # Relatórios analíticos
│       ├── usuarios.js    # Gestão de usuários
│       └── hoteis.js      # Gestão de hotéis
└── client/
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx         # Roteamento principal
        ├── api.js          # Configuração Axios
        ├── contexts/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx  # Topbar + bottom nav
        │   └── ui.jsx      # Componentes compartilhados
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── OS.jsx
            ├── OSDetalhe.jsx
            ├── NovaOS.jsx
            └── Preventiva.jsx  # Inclui Estoque e Relatórios
```

---

## 🔧 Funcionalidades

- **Dashboard** — KPIs, alertas de SLA, estoque mínimo, carga de técnicos
- **Ordens de Serviço** — Abertura, triagem, atribuição, execução, conclusão, validação
- **SLA automático** — Urgente=1h, Alta=4h, Normal=24h, Baixa=72h
- **Triagem por palavras-chave** — Prioridade detectada automaticamente
- **Timeline de auditoria** — Cada ação fica registrada com autor e hora
- **Preventiva** — Planos com frequência configurável, geração automática de OS
- **Estoque** — Baixa automática ao usar peça, alertas de mínimo, entradas manuais
- **Relatórios** — Custos, tempos, ranking de ativos, preventiva vs corretiva

---

## 🔒 Segurança

- Autenticação JWT com expiração de 7 dias
- Senhas criptografadas com bcrypt
- Controle de acesso por role (admin/supervisor/tecnico/hospede)
- Técnicos só veem suas próprias OS
- Supervisores só veem seu hotel

---

## 📞 Suporte

Para dúvidas sobre o código, utilize o Claude (claude.ai) com esta conversa como contexto.
