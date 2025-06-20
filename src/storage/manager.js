// src/storage/manager.js
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const { lerArquivo, escreverArquivo, arquivoExiste, inicializarDiretorio } = require('../util');
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

class StorageManager {
  constructor() {
    this.parser = new XMLParser(parserOptions);
    this.builder = new XMLBuilder(builderOptions);
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

  async createTable(databaseName, tableName, columnDefinitions) {
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
    for (const colDef of columnDefinitions) {
      columns[colDef.name] = {
        '@tipo': colDef.type,
        '@constraints': colDef.constraints.join(',')
      };
    }

    dbData.banco.tabelas[tableName] = {
      '@criada': new Date().toISOString(),
      colunas: columns,
      registros: {}
    };

    await this.saveDatabase(databaseName, dbData);

    return {
      sucesso: true,
      mensagem: `✅ Tabela '${tableName}' criada com sucesso`
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