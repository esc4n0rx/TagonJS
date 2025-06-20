// src/query/executor.js
const { 
  SelectStatement,
  InsertStatement,
  UpdateStatement,
  DeleteStatement,
  CreateTableStatement,
  CreateDatabaseStatement
} = require('../parser/ast/nodes');

class QueryExecutor {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.currentDatabase = null;
  }

  setCurrentDatabase(databaseName) {
    this.currentDatabase = databaseName;
  }

  async execute(ast) {
    try {
      if (ast.constructor.name === 'SelectStatement') {
        return await this.executeSelect(ast);
      } else if (ast.constructor.name === 'InsertStatement') {
        return await this.executeInsert(ast);
      } else if (ast.constructor.name === 'UpdateStatement') {
        return await this.executeUpdate(ast);
      } else if (ast.constructor.name === 'DeleteStatement') {
        return await this.executeDelete(ast);
      } else if (ast.constructor.name === 'CreateTableStatement') {
        return await this.executeCreateTable(ast);
      } else if (ast.type === 'CREATE_DATABASE') {
        return await this.executeCreateDatabase(ast);
      } else {
        throw new Error(`Tipo de comando não implementado: ${ast.constructor.name}`);
      }
    } catch (error) {
      return {
        sucesso: false,
        mensagem: `❌ Erro na execução: ${error.message}`
      };
    }
  }

  async executeSelect(ast) {
    if (!this.currentDatabase) {
      throw new Error('Nenhum banco selecionado');
    }

    // Carregar tabela principal
    const mainTable = await this.storageManager.loadTable(
      this.currentDatabase, 
      ast.fromClause.tableName
    );

    if (!mainTable) {
      throw new Error(`Tabela '${ast.fromClause.tableName}' não encontrada`);
    }

    let resultSet = this.convertTableToResultSet(mainTable, ast.fromClause.tableName, ast.fromClause.alias);

    // Processar JOINs
    for (const joinClause of ast.joinClauses) {
      const joinTable = await this.storageManager.loadTable(
        this.currentDatabase, 
        joinClause.tableName
      );

      if (!joinTable) {
        throw new Error(`Tabela '${joinClause.tableName}' não encontrada`);
      }

      resultSet = this.performJoin(
        resultSet, 
        this.convertTableToResultSet(joinTable, joinClause.tableName, joinClause.alias),
        joinClause
      );
    }

    // Aplicar WHERE
    if (ast.whereClause) {
      resultSet = this.applyWhere(resultSet, ast.whereClause.condition);
    }

    // Aplicar GROUP BY
    if (ast.groupByClause) {
      resultSet = this.applyGroupBy(resultSet, ast.groupByClause);
    }

    // Aplicar SELECT (projeção)
    resultSet = this.applyProjection(resultSet, ast.selectList);

    // Aplicar ORDER BY
    if (ast.orderByClause) {
      resultSet = this.applyOrderBy(resultSet, ast.orderByClause);
    }

    return {
      sucesso: true,
      resultados: resultSet,
      mensagem: `📊 ${resultSet.length} registro(s) encontrado(s)`
    };
  }

  convertTableToResultSet(tableData, tableName, alias = null) {
    const effectiveName = alias || tableName;
    const resultSet = [];

    if (!tableData.registros || Object.keys(tableData.registros).length === 0) {
      return resultSet;
    }

    for (const [regId, registro] of Object.entries(tableData.registros)) {
      const row = {};
      for (const [campo, valor] of Object.entries(registro)) {
        // Adicionar com prefixo da tabela
        row[`${effectiveName}.${campo}`] = valor;
        // Adicionar sem prefixo se não houver conflito
        row[campo] = valor;
      }
      resultSet.push(row);
    }

    return resultSet;
  }

  performJoin(leftResultSet, rightResultSet, joinClause) {
    const result = [];
    const condition = joinClause.onCondition;

    for (const leftRow of leftResultSet) {
      const matches = [];

      for (const rightRow of rightResultSet) {
        const combinedRow = { ...leftRow, ...rightRow };
        
        if (this.evaluateCondition(condition, combinedRow)) {
          matches.push({ ...leftRow, ...rightRow });
        }
      }

      if (matches.length > 0) {
        result.push(...matches);
      } else if (joinClause.joinType === 'LEFT') {
        // LEFT JOIN: incluir linha da esquerda mesmo sem match
        const nullRow = {};
        const rightTableName = joinClause.alias || joinClause.tableName;
        
        // Adicionar valores null para colunas da tabela direita
        for (const key of Object.keys(rightResultSet[0] || {})) {
          if (key.startsWith(`${rightTableName}.`)) {
            nullRow[key] = null;
          }
        }
        
        result.push({ ...leftRow, ...nullRow });
      }
    }

    return result;
  }

  applyWhere(resultSet, condition) {
    return resultSet.filter(row => this.evaluateCondition(condition, row));
  }

  evaluateCondition(condition, row) {
    if (condition.constructor.name === 'BinaryExpression') {
      const leftValue = this.evaluateExpression(condition.left, row);
      const rightValue = this.evaluateExpression(condition.right, row);

      switch (condition.operator) {
        case '=':
        case 'equals':
          return leftValue == rightValue;
        case '!=':
        case 'not_equals':
          return leftValue != rightValue;
        case '<':
        case 'less_than':
          return leftValue < rightValue;
        case '>':
        case 'greater_than':
          return leftValue > rightValue;
        case '<=':
        case 'less_equal':
          return leftValue <= rightValue;
        case '>=':
        case 'greater_equal':
          return leftValue >= rightValue;
        case 'like':
        case 'como':
          return this.evaluateLike(leftValue, rightValue);
        case 'e':
        case 'and':
          return this.evaluateCondition(condition.left, row) && 
                 this.evaluateCondition(condition.right, row);
        case 'ou':
        case 'or':
          return this.evaluateCondition(condition.left, row) || 
                 this.evaluateCondition(condition.right, row);
        default:
          throw new Error(`Operador não suportado: ${condition.operator}`);
      }
    }

    return true;
  }

  evaluateExpression(expression, row) {
    if (expression.constructor.name === 'LiteralExpression') {
      return expression.value;
    } else if (expression.constructor.name === 'IdentifierExpression') {
      const columnName = expression.tableName 
        ? `${expression.tableName}.${expression.name}`
        : expression.name;
      
      // Tentar com prefixo da tabela primeiro, depois sem prefixo
      return row[columnName] !== undefined ? row[columnName] : row[expression.name];
    } else if (expression.constructor.name === 'BinaryExpression') {
      // Para expressões matemáticas simples
      const left = this.evaluateExpression(expression.left, row);
      const right = this.evaluateExpression(expression.right, row);
      
      switch (expression.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        default:
          throw new Error(`Operador matemático não suportado: ${expression.operator}`);
      }
    }

    throw new Error(`Tipo de expressão não suportado: ${expression.constructor.name}`);
  }

  evaluateLike(value, pattern) {
    if (typeof value !== 'string' || typeof pattern !== 'string') {
      return false;
    }
    
    // Converter padrão SQL LIKE para regex
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escapar caracteres especiais
      .replace(/%/g, '.*') // % = qualquer sequência
      .replace(/_/g, '.'); // _ = qualquer caractere
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }

  applyProjection(resultSet, selectList) {
    if (resultSet.length === 0) return resultSet;

    const projectedResults = [];

    for (const row of resultSet) {
      const projectedRow = {};

      for (const columnExpr of selectList.columns) {
        if (columnExpr.expression.constructor.name === 'AllColumnsExpression') {
          // SELECT *
          if (columnExpr.expression.tableName) {
            // SELECT tabela.*
            const prefix = `${columnExpr.expression.tableName}.`;
            for (const [key, value] of Object.entries(row)) {
              if (key.startsWith(prefix)) {
                const columnName = key.substring(prefix.length);
                projectedRow[columnName] = value;
              }
            }
          } else {
            // SELECT *
            Object.assign(projectedRow, row);
          }
        } else {
          // Coluna específica
          const value = this.evaluateExpression(columnExpr.expression, row);
          const columnName = columnExpr.alias || this.getExpressionName(columnExpr.expression);
          projectedRow[columnName] = value;
        }
      }

      projectedResults.push(projectedRow);
    }

    return projectedResults;
  }

  getExpressionName(expression) {
    if (expression.constructor.name === 'IdentifierExpression') {
      return expression.name;
    } else if (expression.constructor.name === 'LiteralExpression') {
      return String(expression.value);
    } else {
      return 'expressao';
    }
  }

  applyOrderBy(resultSet, orderByClause) {
    return resultSet.sort((a, b) => {
      for (const orderExpr of orderByClause.expressions) {
        const aValue = this.evaluateExpression(orderExpr.expression, a);
        const bValue = this.evaluateExpression(orderExpr.expression, b);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;

        if (comparison !== 0) {
          return orderExpr.direction === 'DESC' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  applyGroupBy(resultSet, groupByClause) {
    const groups = new Map();

    for (const row of resultSet) {
      const groupKey = groupByClause.expressions
        .map(expr => this.evaluateExpression(expr, row))
        .join('|');

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    }

    // Para simplicidade, retornar apenas o primeiro registro de cada grupo
    // Em implementação completa, aqui processaríamos funções agregadas
    return Array.from(groups.values()).map(group => group[0]);
  }

  async executeInsert(ast) {
    if (!this.currentDatabase) {
      throw new Error('Nenhum banco selecionado');
    }

    const tableData = await this.storageManager.loadTable(
      this.currentDatabase, 
      ast.tableName
    );

    if (!tableData) {
      throw new Error(`Tabela '${ast.tableName}' não encontrada`);
    }

    const newRecord = {};
    const columns = ast.columns || Object.keys(tableData.colunas);

    if (ast.values.length !== columns.length) {
      throw new Error('Número de valores não corresponde ao número de colunas');
    }

    for (let i = 0; i < columns.length; i++) {
      const columnName = columns[i];
      const value = this.evaluateExpression(ast.values[i], {});
      
      // Validar tipo
      const columnType = tableData.colunas[columnName]?.['@tipo'];
      if (columnType && !this.validateType(value, columnType)) {
        throw new Error(`Tipo inválido para coluna '${columnName}'. Esperado: ${columnType}`);
      }
      
      newRecord[columnName] = value;
    }

    // Gerar ID único para o registro
    const nextId = Object.keys(tableData.registros || {}).length + 1;
    tableData.registros = tableData.registros || {};
    tableData.registros[`reg_${nextId}`] = newRecord;

    await this.storageManager.saveTable(this.currentDatabase, ast.tableName, tableData);

    return {
      sucesso: true,
      mensagem: `✅ Registro inserido na tabela '${ast.tableName}' com sucesso`
    };
  }

  async executeUpdate(ast) {
    if (!this.currentDatabase) {
      throw new Error('Nenhum banco selecionado');
    }

    const tableData = await this.storageManager.loadTable(
      this.currentDatabase, 
      ast.tableName
    );

    if (!tableData) {
      throw new Error(`Tabela '${ast.tableName}' não encontrada`);
    }

    let updatedCount = 0;

    for (const [regId, record] of Object.entries(tableData.registros || {})) {
      let shouldUpdate = true;

      if (ast.whereClause) {
        shouldUpdate = this.evaluateCondition(ast.whereClause.condition, record);
      }

      if (shouldUpdate) {
        for (const assignment of ast.assignments) {
          const newValue = this.evaluateExpression(assignment.value, record);
          record[assignment.column] = newValue;
        }
        updatedCount++;
      }
    }

    await this.storageManager.saveTable(this.currentDatabase, ast.tableName, tableData);

    return {
      sucesso: true,
      mensagem: `✅ ${updatedCount} registro(s) atualizado(s) na tabela '${ast.tableName}'`
    };
  }

  async executeDelete(ast) {
    if (!this.currentDatabase) {
      throw new Error('Nenhum banco selecionado');
    }

    const tableData = await this.storageManager.loadTable(
      this.currentDatabase, 
      ast.tableName
    );

    if (!tableData) {
      throw new Error(`Tabela '${ast.tableName}' não encontrada`);
    }

    let deletedCount = 0;
    const remainingRecords = {};

    for (const [regId, record] of Object.entries(tableData.registros || {})) {
      let shouldDelete = true;

      if (ast.whereClause) {
        shouldDelete = this.evaluateCondition(ast.whereClause.condition, record);
      }

      if (shouldDelete) {
        deletedCount++;
      } else {
        remainingRecords[regId] = record;
      }
    }

    tableData.registros = remainingRecords;
    await this.storageManager.saveTable(this.currentDatabase, ast.tableName, tableData);

    return {
      sucesso: true,
      mensagem: `✅ ${deletedCount} registro(s) removido(s) da tabela '${ast.tableName}'`
    };
  }

  async executeCreateTable(ast) {
    if (!this.currentDatabase) {
      throw new Error('Nenhum banco selecionado');
    }

    return await this.storageManager.createTable(
      this.currentDatabase,
      ast.tableName,
      ast.columns
    );
  }

  async executeCreateDatabase(ast) {
    return await this.storageManager.createDatabase(ast.databaseName);
  }

  validateType(value, expectedType) {
    switch (expectedType.toLowerCase()) {
      case 'numero':
        return typeof value === 'number' && !isNaN(value);
      case 'texto':
        return typeof value === 'string';
      case 'booleano':
        return typeof value === 'boolean';
      default:
        return true; // Tipo não reconhecido, aceitar
    }
  }
}

module.exports = { QueryExecutor };