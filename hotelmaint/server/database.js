const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hotelmaint.db');

let db;

function getDB() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS hoteis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      endereco TEXT,
      telefone TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','supervisor','tecnico','hospede')),
      hotel_id INTEGER REFERENCES hoteis(id),
      ativo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ativos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hoteis(id),
      nome TEXT NOT NULL,
      categoria TEXT NOT NULL CHECK(categoria IN ('ac','elevador','piscina','eletrica','hidraulica','gerador','outro')),
      localizacao TEXT,
      numero_serie TEXT,
      fabricante TEXT,
      data_instalacao TEXT,
      vida_util_anos INTEGER,
      status TEXT DEFAULT 'ativo' CHECK(status IN ('ativo','inativo','em_manutencao')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ordens_servico (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hoteis(id),
      ativo_id INTEGER REFERENCES ativos(id),
      solicitante_id INTEGER NOT NULL REFERENCES usuarios(id),
      tecnico_id INTEGER REFERENCES usuarios(id),
      tipo TEXT NOT NULL CHECK(tipo IN ('corretiva','preventiva')),
      titulo TEXT NOT NULL,
      descricao TEXT,
      localizacao TEXT,
      prioridade TEXT NOT NULL CHECK(prioridade IN ('urgente','alta','normal','baixa')),
      status TEXT NOT NULL DEFAULT 'triagem' CHECK(status IN ('aberta','triagem','atribuida','em_execucao','aguardando_peca','concluida','cancelada')),
      sla_horas INTEGER,
      sla_status TEXT DEFAULT 'dentro' CHECK(sla_status IN ('dentro','em_risco','estourado')),
      custo_pecas REAL DEFAULT 0,
      custo_mao_obra REAL DEFAULT 0,
      observacoes_conclusao TEXT,
      data_abertura TEXT DEFAULT (datetime('now')),
      data_atribuicao TEXT,
      data_inicio TEXT,
      data_conclusao TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS os_registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id),
      autor_id INTEGER NOT NULL REFERENCES usuarios(id),
      tipo TEXT NOT NULL CHECK(tipo IN ('comentario','foto','status_change','peca_usada')),
      conteudo TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS planos_preventivos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hoteis(id),
      ativo_id INTEGER REFERENCES ativos(id),
      titulo TEXT NOT NULL,
      frequencia TEXT NOT NULL CHECK(frequencia IN ('diario','semanal','mensal','trimestral','semestral','anual')),
      proxima_execucao TEXT,
      ultima_execucao TEXT,
      responsavel_id INTEGER REFERENCES usuarios(id),
      instrucoes TEXT,
      ativo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estoque (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hotel_id INTEGER NOT NULL REFERENCES hoteis(id),
      item_nome TEXT NOT NULL,
      categoria TEXT,
      quantidade_atual REAL DEFAULT 0,
      quantidade_minima REAL DEFAULT 0,
      unidade TEXT DEFAULT 'un',
      fornecedor TEXT,
      custo_unitario REAL DEFAULT 0,
      localizacao_almoxarifado TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estoque_id INTEGER NOT NULL REFERENCES estoque(id),
      os_id INTEGER REFERENCES ordens_servico(id),
      usuario_id INTEGER REFERENCES usuarios(id),
      tipo TEXT NOT NULL CHECK(tipo IN ('entrada','saida')),
      quantidade REAL NOT NULL,
      observacao TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Check if already seeded
  const count = db.prepare('SELECT COUNT(*) as c FROM hoteis').get();
  if (count.c > 0) return;

  console.log('Populando banco de dados com dados iniciais...');

  // Seed hoteis
  const insHotel = db.prepare('INSERT INTO hoteis (nome, endereco, telefone) VALUES (?,?,?)');
  const h1 = insHotel.run('Grand Recife Porto Seguro', 'Av. Beira Mar, 1500 - Porto Seguro, BA', '(73) 3288-1000');
  const h2 = insHotel.run("Arraial d'Ajuda Eco Resort", 'Estrada do Mucugê, 320 - Arraial d\'Ajuda, BA', '(73) 3575-2200');

  // Seed usuarios
  const insUser = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, role, hotel_id) VALUES (?,?,?,?,?)');
  const hash = bcrypt.hashSync('hotel123', 10);
  insUser.run('Carlos Admin', 'admin@hotelmaint.com', hash, 'admin', null);
  insUser.run('Mariana Silva', 'mariana@hotelmaint.com', hash, 'supervisor', h1.lastInsertRowid);
  insUser.run('João Santos', 'joao@hotelmaint.com', hash, 'supervisor', h2.lastInsertRowid);
  insUser.run('Pedro Alves', 'pedro@hotelmaint.com', hash, 'tecnico', h1.lastInsertRowid);
  insUser.run('Lucas Ferreira', 'lucas@hotelmaint.com', hash, 'tecnico', h1.lastInsertRowid);
  insUser.run('Diego Costa', 'diego@hotelmaint.com', hash, 'tecnico', h2.lastInsertRowid);
  insUser.run('Hóspede 301', 'hospede@hotelmaint.com', hash, 'hospede', h1.lastInsertRowid);

  // Seed ativos
  const insAtivo = db.prepare('INSERT INTO ativos (hotel_id, nome, categoria, localizacao, fabricante, data_instalacao, vida_util_anos, status) VALUES (?,?,?,?,?,?,?,?)');
  const a1 = insAtivo.run(h1.lastInsertRowid, 'Elevador Principal', 'elevador', 'Hall Central', 'Atlas Schindler', '2019-03-15', 20, 'em_manutencao');
  const a2 = insAtivo.run(h1.lastInsertRowid, 'Sistema Hidráulico Quartos', 'hidraulica', 'Casa de Máquinas', 'Schneider', '2018-01-10', 15, 'ativo');
  const a3 = insAtivo.run(h1.lastInsertRowid, 'A/C Quarto 205', 'ac', 'Quarto 205', 'Daikin', '2021-06-20', 10, 'ativo');
  const a4 = insAtivo.run(h1.lastInsertRowid, 'Caixa d\'água Principal', 'hidraulica', 'Cobertura', 'Fortlev', '2017-08-05', 20, 'ativo');
  const a5 = insAtivo.run(h1.lastInsertRowid, 'Piscina Principal', 'piscina', 'Área de Lazer', 'AquaPool', '2018-01-01', 30, 'ativo');
  insAtivo.run(h1.lastInsertRowid, 'Gerador de Emergência', 'gerador', 'Casa de Máquinas', 'Cummins', '2020-02-14', 15, 'ativo');
  insAtivo.run(h1.lastInsertRowid, 'A/C Restaurante', 'ac', 'Restaurante Principal', 'Daikin', '2021-06-20', 10, 'ativo');
  const a8 = insAtivo.run(h2.lastInsertRowid, 'Gerador de Emergência', 'gerador', 'Casa de Máquinas', 'Stemac', '2019-11-30', 15, 'ativo');
  insAtivo.run(h2.lastInsertRowid, 'TV Restaurante', 'outro', 'Restaurante Principal', 'Samsung', '2022-01-10', 8, 'ativo');
  insAtivo.run(h2.lastInsertRowid, 'Piscina Principal', 'piscina', 'Área de Lazer', 'AquaPool', '2019-05-20', 30, 'ativo');
  insAtivo.run(h2.lastInsertRowid, 'Elevador Social', 'elevador', 'Hall Central', 'Otis', '2020-07-12', 20, 'ativo');
  insAtivo.run(h2.lastInsertRowid, 'Sistema A/C Central', 'ac', 'Casa de Máquinas', 'Carrier', '2019-03-01', 15, 'ativo');

  // Seed estoque
  const insEst = db.prepare('INSERT INTO estoque (hotel_id, item_nome, categoria, quantidade_atual, quantidade_minima, unidade, fornecedor, custo_unitario) VALUES (?,?,?,?,?,?,?,?)');
  const e1 = insEst.run(h1.lastInsertRowid, 'Filtro de ar condicionado', 'climatizacao', 2, 5, 'un', 'ClimaBR', 45);
  insEst.run(h1.lastInsertRowid, 'Gás Refrigerante R-410A', 'climatizacao', 1, 2, 'kg', 'GasFrio', 180);
  insEst.run(h1.lastInsertRowid, 'Lâmpada LED 9W', 'eletrica', 48, 20, 'un', 'Philips', 12);
  insEst.run(h1.lastInsertRowid, 'Disjuntor 20A', 'eletrica', 3, 5, 'un', 'Schneider', 28);
  insEst.run(h1.lastInsertRowid, 'Reparo para torneira', 'hidraulica', 8, 10, 'un', 'Lorenzetti', 8);
  insEst.run(h1.lastInsertRowid, 'Cloro granulado piscina', 'piscina', 15, 10, 'kg', 'Genco', 22);
  insEst.run(h1.lastInsertRowid, 'Óleo lubrificante elevador', 'elevador', 1, 3, 'L', 'ElevaTec', 95);
  insEst.run(h2.lastInsertRowid, 'Filtro de piscina', 'piscina', 1, 2, 'un', 'AquaPool', 340);
  insEst.run(h2.lastInsertRowid, 'Diesel gerador', 'gerador', 80, 50, 'L', 'BR Distribuidora', 5.5);
  insEst.run(h2.lastInsertRowid, 'Vedante de silicone', 'hidraulica', 6, 8, 'un', 'Tigre', 15);

  // Seed OS
  const insOS = db.prepare(`INSERT INTO ordens_servico 
    (hotel_id, ativo_id, solicitante_id, tecnico_id, tipo, titulo, descricao, localizacao, prioridade, status, sla_horas, custo_pecas, custo_mao_obra, data_abertura, data_atribuicao, data_inicio, data_conclusao, observacoes_conclusao)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const h1id = h1.lastInsertRowid, h2id = h2.lastInsertRowid;
  function dta(h) { return new Date(Date.now() - h * 3600000).toISOString(); }
  function dtd(d) { return new Date(Date.now() - d * 86400000).toISOString(); }

  const os1 = insOS.run(h1id, a1.lastInsertRowid, 7, 4, 'corretiva', 'Elevador parando entre andares', 'O elevador principal está parado no 3° andar sem responder ao chamado.', 'Hall - Elevador Principal', 'urgente', 'em_execucao', 1, 0, 0, dta(2), dta(1.5), dta(1), null, null);
  const os2 = insOS.run(h1id, a3.lastInsertRowid, 7, null, 'corretiva', 'Ar condicionado quarto 205 não liga', 'Hóspede reporta que o A/C do quarto 205 não responde ao controle remoto.', 'Quarto 205', 'alta', 'triagem', 4, 0, 0, dta(5), null, null, null, null);
  const os3 = insOS.run(h1id, null, 7, 5, 'corretiva', 'Vazamento no banheiro - Quarto 312', 'Água escorrendo pelo rodapé do banheiro, possível problema na vedação.', 'Quarto 312', 'alta', 'atribuida', 4, 0, 0, dta(3), dta(2), null, null, null);
  insOS.run(h1id, a5.lastInsertRowid, 2, 4, 'preventiva', 'Revisão mensal da piscina - Filtragem', 'Verificar bomba, filtro e nível de cloro da piscina principal.', 'Área da Piscina', 'normal', 'concluida', 24, 120, 80, dtd(7), dtd(7), dtd(6.5), dtd(6), 'Substituído filtro principal. Cloro ajustado. Sistema funcionando normalmente.');
  insOS.run(h2id, a8.lastInsertRowid, 3, 6, 'preventiva', 'Inspeção do gerador de emergência', 'Teste de acionamento e verificação do nível de combustível e óleo.', 'Casa de Máquinas', 'normal', 'concluida', 24, 0, 150, dtd(5), dtd(5), dtd(4.5), dtd(4), 'Gerador acionado por 30min. Combustível a 80%. Troca de óleo realizada.');
  insOS.run(h2id, null, 3, null, 'corretiva', 'TV do restaurante com tela azul', 'A TV do restaurante principal está exibindo tela azul desde ontem à noite.', 'Restaurante Principal', 'alta', 'aberta', 4, 0, 0, dta(18), null, null, null, null);
  insOS.run(h1id, a2.lastInsertRowid, 4, 5, 'corretiva', 'Chuveiro elétrico sem pressão - Quarto 108', 'Pressão da água muito baixa no chuveiro do quarto 108.', 'Quarto 108', 'alta', 'aguardando_peca', 4, 0, 0, dtd(2), dtd(2), dtd(1), null, null);
  insOS.run(h1id, null, 7, null, 'corretiva', 'Tomada com faísca - Quarto 410', 'Hóspede relata faísca ao plugar carregador na tomada ao lado da cama.', 'Quarto 410', 'urgente', 'triagem', 1, 0, 0, dta(1), null, null, null, null);
  insOS.run(h2id, null, 6, 6, 'corretiva', 'Fechadura eletrônica quarto 205', 'Hóspede não consegue abrir o quarto com o cartão.', 'Quarto 205', 'alta', 'em_execucao', 4, 0, 0, dta(4), dta(3), dta(2), null, null);
  insOS.run(h1id, a4.lastInsertRowid, 2, null, 'preventiva', 'Limpeza da caixa d\'água', 'Limpeza e desinfecção semestral da caixa d\'água conforme norma ABNT.', 'Cobertura - Caixa d\'água', 'normal', 'aberta', 24, 0, 0, dtd(1), null, null, null, null);
  insOS.run(h2id, null, 3, 6, 'corretiva', 'Bomba da piscina fazendo barulho', 'Ruído anormal na bomba principal da piscina, possível desgaste do rolamento.', 'Casa de Máquinas - Piscina', 'normal', 'atribuida', 24, 0, 0, dtd(1), dta(20), null, null, null);
  insOS.run(h1id, null, 7, null, 'corretiva', 'Banheira de hidromassagem fora de funcionamento', 'Hidromassagem não liga no quarto master suite 501.', 'Quarto 501 - Suíte Master', 'baixa', 'aberta', 72, 0, 0, dtd(3), null, null, null, null);

  // Timeline registros
  const insReg = db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo, created_at) VALUES (?,?,?,?,?)');
  insReg.run(os1.lastInsertRowid, 7, 'status_change', 'OS aberta pelo hóspede. Prioridade urgente detectada automaticamente.', dta(2));
  insReg.run(os1.lastInsertRowid, 2, 'status_change', 'Atribuída para Pedro Alves. Prioridade urgente confirmada.', dta(1.5));
  insReg.run(os1.lastInsertRowid, 4, 'status_change', 'Execução iniciada. Técnico no local.', dta(1));
  insReg.run(os1.lastInsertRowid, 4, 'comentario', 'Elevador preso no 3° andar. Verificando painel de controle elétrico.', dta(0.5));
  insReg.run(os2.lastInsertRowid, 7, 'status_change', 'OS aberta. Aguardando triagem do supervisor.', dta(5));
  insReg.run(os3.lastInsertRowid, 7, 'status_change', 'OS aberta pelo hóspede.', dta(3));
  insReg.run(os3.lastInsertRowid, 2, 'status_change', 'Atribuída para Lucas Ferreira.', dta(2));

  // Planos preventivos
  const insPrev = db.prepare('INSERT INTO planos_preventivos (hotel_id, ativo_id, titulo, frequencia, proxima_execucao, responsavel_id, instrucoes) VALUES (?,?,?,?,?,?,?)');
  insPrev.run(h1id, a1.lastInsertRowid, 'Inspeção mensal do elevador', 'mensal', '2026-05-20', 5, 'Verificar cabos, freios, nivelamento e iluminação interna.');
  insPrev.run(h1id, a3.lastInsertRowid, 'Limpeza filtros A/C - Quartos', 'mensal', '2026-05-15', 4, 'Limpar ou substituir filtros de todos os aparelhos de A/C dos quartos.');
  insPrev.run(h1id, a5.lastInsertRowid, 'Análise química da piscina', 'semanal', '2026-05-06', 4, 'Medir pH, cloro livre, alcalinidade e turbidez.');
  insPrev.run(h2id, a8.lastInsertRowid, 'Teste do gerador de emergência', 'mensal', '2026-06-01', 6, 'Acionamento manual por 30min, verificar nível de combustível e óleo.');
  insPrev.run(h1id, a4.lastInsertRowid, 'Limpeza caixa d\'água', 'semestral', '2026-11-01', 5, 'Esvaziar, limpar e desinfetar conforme norma ABNT NBR 5626.');

  console.log('Banco de dados populado com sucesso!');
}

module.exports = { getDB, initDB };
