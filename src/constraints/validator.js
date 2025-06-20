// src/constraints/validator.js
class ConstraintValidator {
  constructor(storageManager) {
    this.storageManager = storageManager;
  }

async validateInsert(databaseName, tableName, record, tableData) {
  const errors = [];
  
  // Aplicar auto increment e valores padrão
  await this.applyAutoValues(record, tableData);
  
  // Validar constraints de coluna
  for (const [columnName, columnDef] of Object.entries(tableData.colunas)) {
    const value = record[columnName];
    const constraints = this.parseConstraints(columnDef['@constraints'] || '');
    
    // NOT NULL
    if (constraints.includes('NOT_NULL') && (value === null || value === undefined)) {
      errors.push(`Coluna '${columnName}' não pode ser nula`);
    }
    
    // PRIMARY KEY (implica NOT NULL e UNIQUE)
    if (constraints.includes('PRIMARY_KEY')) {
      if (value === null || value === undefined) {
        errors.push(`Chave primária '${columnName}' não pode ser nula`);
      } else {
        const isDuplicate = await this.checkDuplicateValue(databaseName, tableName, columnName, value);
        if (isDuplicate) {
          errors.push(`Valor duplicado para chave primária '${columnName}': ${value}`);
        }
      }
    }
    
    // UNIQUE
    if (constraints.includes('UNIQUE') && value !== null && value !== undefined) {
      const isDuplicate = await this.checkDuplicateValue(databaseName, tableName, columnName, value);
      if (isDuplicate) {
        errors.push(`Valor duplicado para coluna única '${columnName}': ${value}`);
      }
    }
  }
  
  // Validar FOREIGN KEYs - CORREÇÃO AQUI
  if (tableData.constraints && Array.isArray(tableData.constraints)) {
    for (const constraint of tableData.constraints) {
      if (constraint.type === 'FOREIGN_KEY') {
        const value = record[constraint.columnName];
        if (value !== null && value !== undefined) {
          const isValid = await this.validateForeignKey(
            databaseName, 
            constraint.options.referencedTable,
            constraint.options.referencedColumn,
            value
          );
          if (!isValid) {
            errors.push(`Chave estrangeira inválida: ${constraint.columnName} = ${value}`);
          }
        }
      }
    }
  }
  
  return errors;
}

  async applyAutoValues(record, tableData) {
    for (const [columnName, columnDef] of Object.entries(tableData.colunas)) {
      const constraints = this.parseConstraints(columnDef['@constraints'] || '');
      const type = columnDef['@tipo'];
      
      // AUTO INCREMENT
      if (constraints.includes('AUTO_INCREMENT')) {
        if (!record[columnName]) {
          record[columnName] = await this.getNextAutoIncrementValue(tableData, columnName);
        }
      }
      
      // UUID
      if (type === 'uuid' && !record[columnName]) {
        record[columnName] = this.generateUUID();
      }
      
      // DEFAULT VALUE
      const defaultConstraint = constraints.find(c => c.startsWith('DEFAULT:'));
      if (defaultConstraint && (record[columnName] === null || record[columnName] === undefined)) {
        const defaultValue = defaultConstraint.split(':')[1];
        record[columnName] = this.parseDefaultValue(defaultValue, type);
      }
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  async getNextAutoIncrementValue(tableData, columnName) {
    if (!tableData.registros) return 1;
    
    const values = Object.values(tableData.registros)
      .map(record => record[columnName])
      .filter(val => typeof val === 'number')
      .sort((a, b) => b - a);
    
    return values.length > 0 ? values[0] + 1 : 1;
  }

  async checkDuplicateValue(databaseName, tableName, columnName, value) {
    const tableData = await this.storageManager.loadTable(databaseName, tableName);
    if (!tableData || !tableData.registros) return false;
    
    return Object.values(tableData.registros).some(record => 
      record[columnName] === value
    );
  }

  async validateForeignKey(databaseName, referencedTable, referencedColumn, value) {
    if (value === null || value === undefined) return true;
    
    const refTableData = await this.storageManager.loadTable(databaseName, referencedTable);
    if (!refTableData || !refTableData.registros) return false;
    
    return Object.values(refTableData.registros).some(record => 
      record[referencedColumn] === value
    );
  }

  parseConstraints(constraintString) {
    return constraintString ? constraintString.split(',').filter(c => c.trim()) : [];
  }

  parseDefaultValue(defaultValue, type) {
    switch (type) {
      case 'numero':
        return parseFloat(defaultValue);
      case 'booleano':
        return defaultValue.toLowerCase() === 'true';
      case 'uuid':
        return defaultValue === 'UUID()' ? this.generateUUID() : defaultValue;
      default:
        return defaultValue;
    }
  }
}

module.exports = { ConstraintValidator };