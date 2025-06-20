// test-constraints.js
const { Lexer } = require('./src/parser/lexer');
const { Parser } = require('./src/parser/parser');
const { QueryExecutor } = require('./src/query/executor');
const { StorageManager } = require('./src/storage/manager');

async function testConstraints() {
  console.log('🔒 Testando Constraints no TagonJS v2.0\n');
  
  const storageManager = new StorageManager();
  await storageManager.initialize();
  
  const queryExecutor = new QueryExecutor(storageManager);
  
  try {
    // 1. Criar banco
    console.log('📋 Teste 1: Criando banco com constraints...');
    await executeCommand('criar banco constraint_test', queryExecutor);
    queryExecutor.setCurrentDatabase('constraint_test');
    
    // 2. Criar tabela com constraints
    console.log('📋 Teste 2: Criando tabelas com constraints...');
    
    // Tabela principal com PRIMARY KEY e AUTO INCREMENT
    await executeCommand(`
      criar tabela usuarios (
        id:numero auto incremento primaria chave,
        email:texto unico nao nulo,
        nome:texto nao nulo,
        idade:numero padrao 18,
        uuid_user:uuid
      )
    `, queryExecutor);
    
    // Tabela com FOREIGN KEY
    await executeCommand(`
      criar tabela posts (
        id:numero auto incremento primaria chave,
        titulo:texto nao nulo,
        conteudo:texto,
        usuario_id:numero,
        estrangeira chave (usuario_id) referencia usuarios (id)
      )
    `, queryExecutor);
    
    // 3. Testar AUTO INCREMENT
    console.log('📋 Teste 3: Testando AUTO INCREMENT...');
    await executeCommand('inserir em usuarios (email, nome) valores ("joao@email.com", "João")', queryExecutor);
    await executeCommand('inserir em usuarios (email, nome, idade) valores ("maria@email.com", "Maria", 25)', queryExecutor);
    
    // 4. Testar UNIQUE constraint
    console.log('📋 Teste 4: Testando UNIQUE constraint...');
    try {
      await executeCommand('inserir em usuarios (email, nome) valores ("joao@email.com", "João Duplicado")', queryExecutor);
    } catch (error) {
      console.log('✅ UNIQUE constraint funcionando: ' + error.message);
    }
    
    // 5. Testar NOT NULL constraint
    console.log('📋 Teste 5: Testando NOT NULL constraint...');
    try {
      await executeCommand('inserir em usuarios (nome) valores ("Sem Email")', queryExecutor);
    } catch (error) {
      console.log('✅ NOT NULL constraint funcionando: ' + error.message);
    }
    
    // 6. Testar FOREIGN KEY constraint
    console.log('📋 Teste 6: Testando FOREIGN KEY constraint...');
    await executeCommand('inserir em posts (titulo, conteudo, usuario_id) valores ("Primeiro Post", "Conteúdo", 1)', queryExecutor);
    
    try {
      await executeCommand('inserir em posts (titulo, conteudo, usuario_id) valores ("Post Inválido", "Conteúdo", 999)', queryExecutor);
    } catch (error) {
      console.log('✅ FOREIGN KEY constraint funcionando: ' + error.message);
    }
    
    // 7. Verificar dados finais
    console.log('📋 Teste 7: Verificando dados finais...');
    await executeCommand('selecionar * de usuarios', queryExecutor);
    await executeCommand('selecionar * de posts', queryExecutor);
    
    console.log('\n🎉 Todos os testes de constraints concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

async function executeCommand(sql, queryExecutor) {
  try {
    console.log(`\n🔍 Executando: ${sql.replace(/\s+/g, ' ').trim()}`);
    
    const lexer = new Lexer(sql);
    const tokens = lexer.tokenize();
    
    const parser = new Parser(tokens);
    const ast = parser.parse();
    
    const result = await queryExecutor.execute(ast);
    
    if (result.sucesso) {
      console.log(`✅ ${result.mensagem}`);
      
      if (result.resultados && result.resultados.length > 0) {
        console.table(result.resultados);
      }
    } else {
      console.log(`❌ ${result.mensagem}`);
    }
  } catch (error) {
    throw error;
  }
}

// Executar testes
testConstraints();