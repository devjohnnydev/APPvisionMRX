# 🚀 Deploy TechVision no Railway

## Visão Geral
Este guia explica como fazer deploy da aplicação TechVision no Railway, que hospedará tanto o frontend React quanto o backend Express com PostgreSQL.

## Pré-requisitos
- Conta no Railway (https://railway.app)
- Conta no GitHub com seu repositório
- Chave API do OpenAI para análise de placas

## 🔧 Configuração do Deploy

### 1. Conectar Repositório
1. Acesse https://railway.app e faça login
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Selecione seu repositório do TechVision
4. Railway detectará automaticamente que é uma aplicação Node.js

### 2. Configurar PostgreSQL
1. No projeto Railway, clique em "Add Service" → "Database" → "PostgreSQL"
2. Railway criará automaticamente uma instância PostgreSQL compatível
3. A variável `DATABASE_URL` será configurada automaticamente com SSL habilitado

### 3. Configurar Variáveis de Ambiente
Na aba "Variables" do seu projeto, adicione:

**Obrigatórias:**
```
NODE_ENV=production
SESSION_SECRET=um-segredo-super-seguro-aqui-min-32-chars
OPENAI_API_KEY=sua-chave-openai-aqui
```

**Opcionais (para criar usuário admin):**
```
ADMIN_EMAIL=admin@seu-dominio.com
ADMIN_PASSWORD=senha-admin-segura
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
```

**Automáticas (Railway configura):**
```
DATABASE_URL=postgresql://... (Railway configura automaticamente)
PORT=... (Railway atribui dinamicamente)
```

### 4. Deploy Inicial
1. Após configurar as variáveis, Railway iniciará o deploy automaticamente
2. O processo incluirá:
   - Instalação das dependências (`npm install`)
   - Build da aplicação (`npm run build`)
   - Inicialização (`npm start`)

### 5. Configurar Domínio
1. Na aba "Settings", você verá a URL gerada: `https://seu-app.railway.app`
2. Para domínio customizado, adicione na seção "Custom Domain"

## 🗄️ Banco de Dados

### Migrações
1. Execute as migrações do banco:
   ```bash
   npm run db:push
   ```
2. Ou conecte via Railway CLI:
   ```bash
   railway login
   railway shell
   npm run db:push
   ```

### Acesso ao Banco
- Use a aba "Data" no Railway para visualizar dados
- Ou conecte com qualquer cliente PostgreSQL usando a `DATABASE_URL`

## 🔒 Segurança

### CORS Configurado
**Desenvolvimento:** CORS habilitado para localhost
**Produção:** CORS desabilitado (frontend e backend no mesmo domínio)
- Se usar domínios separados, configure `FRONTEND_URL`
- Trust proxy configurado para Railway

### Cookies Seguros
- Cookies configurados para `secure: true` em produção
- `sameSite: 'none'` para funcionar em domínios separados
- `httpOnly: true` para prevenir ataques XSS

## 📊 Monitoramento

### Logs
- Acesse logs na aba "Deploy Logs" ou "App Logs"
- Logs são estruturados com informações de request/response

### Health Check
- Endpoint: `/health` (público, não requer autenticação)
- Timeout: 300 segundos
- Retry: até 10 tentativas

## 🚀 Deploy Contínuo

### Auto-Deploy
- Railway fará deploy automático a cada push na branch principal
- Tempo estimado: 2-5 minutos por deploy

### Rollback
- Use a aba "Deployments" para fazer rollback para versões anteriores
- Clique no deployment desejado → "Redeploy"

## 🔧 Troubleshooting

### Build Falha
1. Verifique se todas as variáveis estão configuradas
2. Verifique logs de build na aba "Deploy Logs"
3. Confirme que `package.json` tem scripts `build` e `start`

### Conexão com Banco
1. Verifique se o serviço PostgreSQL está rodando
2. Confirme que `DATABASE_URL` está definida
3. SSL está configurado automaticamente para produção
4. Teste conexão via Railway shell

### CORS Errors
1. Verifique se `FRONTEND_URL` está configurada corretamente
2. Confirme que está usando HTTPS em produção
3. Verifique logs para erros específicos de CORS

## 💰 Custos Estimados

**Tier Gratuito:**
- 500 horas de execução/mês
- PostgreSQL com 1GB de storage
- Adequado para desenvolvimento/teste

**Tier Pro ($5/mês):**
- Execução ilimitada
- PostgreSQL com storage expandido
- Domínios customizados

## 📞 Suporte

- Documentação Railway: https://docs.railway.app
- Discord Railway: https://discord.gg/railway
- Logs detalhados disponíveis no dashboard Railway