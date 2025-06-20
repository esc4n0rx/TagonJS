// src/storage/manager.js (atualizações)
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { lerArquivo, escreverArquivo, arquivoExiste, inicializarDiretorio } = require('../util');
const { ConstraintValidator } = require('../constraints/validator');
const path = require('path');

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  parseAttributeValue: true,
  parseTrueNumberOnly: false,
  arrayMode: false
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  format: true,
  indentBy: '  '
};

// src/storage/manager.js (continuação)
class StorageManager {
  constructor() {
    this.parser = new XMLParser(parserOptions);
    this.builder = new XMLBuilder(builderOptions);
    this.constraintValidator = new ConstraintValidator(this);
  }

  async initialize() {
    await inicializarDiretorio();
  }

  async createDatabase(databaseName) {
    const filePath = path.join('dados', `${databaseName}.xml`);
    
    if (await arquivoExiste(filePath)) {
      return {
        sucesso: false,
        mensagem: `❌ Banco '${databaseName}' já existe`
      };
    }

    const dbStructure = {
      banco: {
        '@nome': databaseName,
        '@criado': new Date().toISOString(),
        tabelas: {}
      }
    };

    const xmlContent = this.builder.build(dbStructure);
    await escreverArquivo(filePath, xmlContent);

    return {
      sucesso: true,
      mensagem: `✅ Banco '${databaseName}' criado com sucesso`
    };
  }

  async loadDatabase(databaseName) {
    const filePath = path.join('dados', `${databaseName}.xml`);
    
    if (!await arquivoExiste(filePath)) {
      return null;
    }

    const xmlContent = await lerArquivo(filePath);
    return this.parser.parse(xmlContent);
  }

  async saveDatabase(databaseName, data) {
    const filePath = path.join('dados', `${databaseName}.xml`);
    const xmlContent = this.builder.build(data);
    await escreverArquivo(filePath, xmlContent);
  }

  async loadTable(databaseName, tableName) {
    const dbData = await this.loadDatabase(databaseName);
    
    if (!dbData || !dbData.banco.tabelas || !dbData.banco.tabelas[tableName]) {
      return null;
    }

    return dbData.banco.tabelas[tableName];
  }

  async saveTable(databaseName, tableName, tableData) {
    const dbData = await this.loadDatabase(databaseName);
    
    if (!dbData) {
      throw new Error(`Banco '${databaseName}' não encontrado`);
    }

    if (!dbData.banco.tabelas) {
      dbData.banco.tabelas = {};
    }

    dbData.banco.tabelas[tableName] = tableData;
    await this.saveDatabase(databaseName, dbData);
  }

// src/storage/manager.js (correção na função createTable)
async createTable(databaseName, tableName, columnDefinitions, tableConstraints = []) {
  const dbData = await this.loadDatabase(databaseName);
  
  if (!dbData) {
    throw new Error(`Banco '${databaseName}' não encontrado`);
  }

  if (!dbData.banco.tabelas) {
    dbData.banco.tabelas = {};
  }

  if (dbData.banco.tabelas[tableName]) {
    return {
      sucesso: false,
      mensagem: `❌ Tabela '${tableName}' já existe`
    };
  }

  const columns = {};
  const constraints = [];
  
  // Processar definições de colunas
  for (const colDef of columnDefinitions) {
    const constraintStrings = [];
    
    for (const constraint of colDef.constraints) {
      switch (constraint.type) {
        case 'PRIMARY_KEY':
          constraintStrings.push('PRIMARY_KEY');
          break;
        case 'UNIQUE':
          constraintStrings.push('UNIQUE');
          break;
        case 'NOT_NULL':
          constraintStrings.push('NOT_NULL');
          break;
        case 'AUTO_INCREMENT':
          constraintStrings.push('AUTO_INCREMENT');
          break;
        case 'DEFAULT':
          const defaultVal = constraint.options.value.value || constraint.options.value;
          constraintStrings.push(`DEFAULT:${defaultVal}`);
          break;
      }
    }
    
    columns[colDef.name] = {
      '@tipo': colDef.type,
      '@constraints': constraintStrings.join(',')
    };
  }
  
  for (const constraint of tableConstraints) {
    constraints.push({
      type: constraint.type,
      columnName: constraint.columnName,
      options: constraint.options || {}
    });
  }

  const tableStructure = {
    '@criada': new Date().toISOString(),
    colunas: columns,
    registros: {}
  };

  if (constraints.length > 0) {
    tableStructure.constraints = constraints;
  }

  dbData.banco.tabelas[tableName] = tableStructure;

  await this.saveDatabase(databaseName, dbData);

  return {
    sucesso: true,
    mensagem: `✅ Tabela '${tableName}' criada com sucesso`
  };
}

  async insertRecord(databaseName, tableName, record) {
    const tableData = await this.loadTable(databaseName, tableName);
    
    if (!tableData) {
      throw new Error(`Tabela '${tableName}' não encontrada`);
    }

    // Validar constraints
    const errors = await this.constraintValidator.validateInsert(
      databaseName, 
      tableName, 
      record, 
      tableData
    );
    
    if (errors.length > 0) {
      throw new Error(`Violação de constraints: ${errors.join(', ')}`);
    }

    // Gerar ID único para o registro
    const nextId = Object.keys(tableData.registros || {}).length + 1;
    tableData.registros = tableData.registros || {};
    tableData.registros[`reg_${nextId}`] = record;

    await this.saveTable(databaseName, tableName, tableData);
    
    return {
      sucesso: true,
      mensagem: `✅ Registro inserido na tabela '${tableName}' com sucesso`
    };
  }

  async databaseExists(databaseName) {
    const filePath = path.join('dados', `${databaseName}.xml`);
    return await arquivoExiste(filePath);
  }

  async listTables(databaseName) {
    const dbData = await this.loadDatabase(databaseName);
    
    if (!dbData || !dbData.banco.tabelas) {
      return [];
    }

    return Object.keys(dbData.banco.tabelas);
  }
}

module.exports = { StorageManager };