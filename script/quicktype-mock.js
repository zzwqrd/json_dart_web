// Mock QuickType functionality for JSON to Dart conversion
class QuickTypeMock {
    static async runQuickType(className, jsonString, options) {
        try {
            const jsonObj = JSON.parse(jsonString);
            return this.generateDartClass(className, jsonObj, options);
        } catch (error) {
            throw new Error('Invalid JSON format');
        }
    }

    static generateDartClass(className, jsonObj, options) {
        let dartCode = '';

        // Add imports if needed
        if (options.useSerializable) {
            dartCode += "import 'package:json_annotation/json_annotation.dart';\n\n";
            dartCode += `part '${className.toLowerCase()}.g.dart';\n\n`;
        }

        if (options.useEquatable) {
            dartCode += "import 'package:equatable/equatable.dart';\n\n";
        }

        // Add class annotations
        if (options.useSerializable) {
            dartCode += '@JsonSerializable()\n';
        }

        // Class declaration
        const extendsClause = options.useEquatable ? ' extends Equatable' : '';
        dartCode += `class ${className}${extendsClause} {\n`;

        // Generate properties
        const properties = this.extractProperties(jsonObj, options);
        properties.forEach(prop => {
            if (options.generateKey && options.useSerializable) {
                dartCode += `  @JsonKey(name: '${prop.jsonKey}')\n`;
            }
            dartCode += `  final ${prop.type} ${prop.name};\n\n`;
        });

        // Constructor
        dartCode += `  const ${className}({\n`;
        properties.forEach(prop => {
            const required = prop.nullable ? '' : 'required ';
            dartCode += `    ${required}this.${prop.name},\n`;
        });
        dartCode += '  });\n\n';

        // fromJson method
        if (options.useSerializable) {
            dartCode += `  factory ${className}.fromJson(Map<String, dynamic> json) => _$${className}FromJson(json);\n\n`;
        } else {
            dartCode += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
            dartCode += '    return ' + className + '(\n';
            properties.forEach(prop => {
                dartCode += `      ${prop.name}: ${this.generateFromJsonAssignment(prop, options)},\n`;
            });
            dartCode += '    );\n';
            dartCode += '  }\n\n';
        }

        // toJson method
        if (options.generateToJson) {
            if (options.useSerializable) {
                dartCode += `  Map<String, dynamic> toJson() => _$${className}ToJson(this);\n\n`;
            } else {
                dartCode += '  Map<String, dynamic> toJson() {\n';
                dartCode += '    return {\n';
                properties.forEach(prop => {
                    const key = options.generateKey ? prop.jsonKey : prop.name;
                    dartCode += `      '${key}': ${prop.name},\n`;
                });
                dartCode += '    };\n';
                dartCode += '  }\n\n';
            }
        }

        // copyWith method
        if (options.generateCopyWith) {
            dartCode += `  ${className} copyWith({\n`;
            properties.forEach(prop => {
                dartCode += `    ${prop.type}? ${prop.name},\n`;
            });
            dartCode += '  }) {\n';
            dartCode += `    return ${className}(\n`;
            properties.forEach(prop => {
                dartCode += `      ${prop.name}: ${prop.name} ?? this.${prop.name},\n`;
            });
            dartCode += '    );\n';
            dartCode += '  }\n\n';
        }

        // toString method
        if (options.generateToString) {
            dartCode += '  @override\n';
            dartCode += '  String toString() {\n';
            dartCode += `    return '${className}(`;
            const toStringProps = properties.map(prop => `${prop.name}: \$${prop.name}`).join(', ');
            dartCode += `${toStringProps})';\n`;
            dartCode += '  }\n\n';
        }

        // Equatable props
        if (options.useEquatable) {
            dartCode += '  @override\n';
            dartCode += '  List<Object?> get props => [';
            dartCode += properties.map(prop => prop.name).join(', ');
            dartCode += '];\n\n';
        }

        dartCode += '}\n';

        // Add JSON comment if requested
        if (options.generateJsonComment) {
            dartCode += '\n/*\n';
            dartCode += 'JSON:\n';
            dartCode += JSON.stringify(jsonObj, null, 2);
            dartCode += '\n*/';
        }

        return dartCode;
    }

    static extractProperties(obj, options, prefix = '') {
        const properties = [];

        for (const [key, value] of Object.entries(obj)) {
            const prop = {
                name: this.toCamelCase(key),
                jsonKey: key,
                type: this.getDartType(value, options),
                nullable: value === null
            };
            properties.push(prop);
        }

        return properties;
    }

    static getDartType(value, options) {
        if (value === null) return 'dynamic';

        switch (typeof value) {
            case 'string':
                return options.useDefaultValue ? 'String' : 'String?';
            case 'number':
                if (options.useNum) {
                    return options.useDefaultValue ? 'num' : 'num?';
                }
                return Number.isInteger(value)
                    ? (options.useDefaultValue ? 'int' : 'int?')
                    : (options.useDefaultValue ? 'double' : 'double?');
            case 'boolean':
                return options.useDefaultValue ? 'bool' : 'bool?';
            case 'object':
                if (Array.isArray(value)) {
                    if (value.length === 0) return 'List<dynamic>';
                    const itemType = this.getDartType(value[0], options);
                    return `List<${itemType.replace('?', '')}>`;
                }
                return 'Map<String, dynamic>';
            default:
                return 'dynamic';
        }
    }

    static generateFromJsonAssignment(prop, options) {
        const jsonAccess = `json['${prop.jsonKey}']`;

        if (prop.type.includes('List<')) {
            const itemType = prop.type.match(/List<(.+)>/)[1];
            if (itemType === 'dynamic' || itemType.includes('Map')) {
                return `${jsonAccess} as List<dynamic>? ?? []`;
            }
            return `(${jsonAccess} as List<dynamic>?)?.cast<${itemType}>() ?? []`;
        }

        if (prop.type.includes('Map')) {
            return `${jsonAccess} as Map<String, dynamic>? ?? {}`;
        }

        const baseType = prop.type.replace('?', '');
        const defaultValue = this.getDefaultValue(baseType, options);

        if (options.useDefaultValue && !prop.nullable) {
            return `${jsonAccess} as ${baseType}? ?? ${defaultValue}`;
        }

        return `${jsonAccess} as ${prop.type}`;
    }

    static getDefaultValue(type, options) {
        switch (type) {
            case 'String': return "''";
            case 'int': return '0';
            case 'double': return '0.0';
            case 'num': return '0';
            case 'bool': return 'false';
            default: return 'null';
        }
    }

    static toCamelCase(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }
}

// Make it available globally
window.QuickType = QuickTypeMock;