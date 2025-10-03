class DartGenerator {
    constructor() {
        this.options = {
            generateToJson: true,
            generateCopyWith: true,
            generateToString: true,
            generateKeys: true,
            useNum: false,
            useSerializable: true,
            useEquatable: true,
            useDefaultValue: false,
            generateComment: false
        };
    }

    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    generateDartClass(className, jsonString) {
        try {
            const jsonObj = JSON.parse(jsonString);

            // Check if the input is an array
            if (Array.isArray(jsonObj)) {
                if (jsonObj.length === 0) {
                    throw new Error('Cannot generate class from empty array');
                }
                // Use the first item in the array as the template
                return this.buildDartClass(className, jsonObj[0], jsonString);
            } else {
                return this.buildDartClass(className, jsonObj, jsonString);
            }
        } catch (error) {
            throw new Error('Invalid JSON: ' + error.message);
        }
    }

    buildDartClass(className, jsonObj, originalJson) {
        const properties = this.extractProperties(jsonObj);
        const imports = this.generateImports();
        const classDeclaration = this.generateClassDeclaration(className);
        const fields = this.generateFields(properties);
        const constructor = this.generateConstructor(className, properties);
        const fromJson = this.generateFromJson(className, properties);
        const toJson = this.generateToJson(properties);
        const copyWith = this.generateCopyWith(className, properties);
        const toString = this.generateToString(className, properties);
        const jsonComment = this.generateJsonComment(originalJson);

        return [
            imports,
            '',
            classDeclaration,
            fields,
            '',
            constructor,
            '',
            fromJson,
            toJson,
            copyWith,
            toString,
            '}',
            jsonComment
        ].filter(Boolean).join('\n');
    }

    extractProperties(obj) {
        const properties = [];

        for (const [key, value] of Object.entries(obj)) {
            // Skip if key is not a valid Dart variable name
            if (!this.isValidDartVariableName(key)) {
                continue;
            }

            const type = this.inferDartType(value);
            properties.push({
                name: this.toCamelCase(key),
                type: type,
                jsonKey: key,
                value: value
            });
        }

        return properties;
    }

    isValidDartVariableName(name) {
        // Check if name starts with a letter or underscore and contains only letters, numbers, and underscores
        return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && !this.isDartKeyword(name);
    }

    isDartKeyword(name) {
        const keywords = [
            'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class',
            'const', 'continue', 'default', 'deferred', 'do', 'dynamic', 'else', 'enum',
            'export', 'extends', 'external', 'factory', 'false', 'final', 'finally', 'for',
            'function', 'get', 'hide', 'if', 'implements', 'import', 'in', 'interface', 'is',
            'library', 'mixin', 'new', 'null', 'on', 'operator', 'part', 'rethrow', 'return',
            'set', 'show', 'static', 'super', 'switch', 'sync', 'this', 'throw', 'true', 'try',
            'typedef', 'var', 'void', 'while', 'with', 'yield'
        ];
        return keywords.includes(name);
    }

    toCamelCase(str) {
        // Handle snake_case to camelCase conversion
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    inferDartType(value) {
        if (value === null) return 'dynamic';

        const jsType = typeof value;

        switch (jsType) {
            case 'string':
                return 'String';
            case 'boolean':
                return 'bool';
            case 'number':
                if (this.options.useNum) {
                    return 'num';
                }
                return Number.isInteger(value) ? 'int' : 'double';
            case 'object':
                if (Array.isArray(value)) {
                    if (value.length === 0) return 'List<dynamic>';
                    const itemType = this.inferDartType(value[0]);
                    return `List<${itemType}>`;
                }
                return 'Map<String, dynamic>';
            default:
                return 'dynamic';
        }
    }

    generateImports() {
        const imports = [];

        if (this.options.useSerializable) {
            imports.push("import 'package:json_annotation/json_annotation.dart';");
        }

        if (this.options.useEquatable) {
            imports.push("import 'package:equatable/equatable.dart';");
        }

        if (this.options.useSerializable) {
            imports.push('');
            imports.push("part 'model.g.dart';");
        }

        return imports.join('\n');
    }

    generateClassDeclaration(className) {
        const annotations = [];

        if (this.options.useSerializable) {
            annotations.push('@JsonSerializable()');
        }

        const extendsClause = this.options.useEquatable ? ' extends Equatable' : '';

        return [
            ...annotations,
            `class ${className}${extendsClause} {`
        ].join('\n');
    }

    generateFields(properties) {
        return properties.map(prop => {
            const annotations = [];

            if (this.options.generateKeys && this.options.useSerializable) {
                annotations.push(`  @JsonKey(name: '${prop.jsonKey}')`);
            }

            const nullable = this.options.useDefaultValue ? '' : '?';
            const field = `  final ${prop.type}${nullable} ${prop.name};`;

            return [...annotations, field].join('\n');
        }).join('\n\n');
    }

    generateConstructor(className, properties) {
        const params = properties.map(prop => {
            const required = this.options.useDefaultValue ? 'required ' : '';
            return `    ${required}this.${prop.name}`;
        }).join(',\n');

        return [
            `  const ${className}({`,
            params,
            '  });'
        ].join('\n');
    }

    generateFromJson(className, properties) {
        if (!this.options.useSerializable) {
            const assignments = properties.map(prop => {
                let assignment = `      ${prop.name}: json['${prop.jsonKey}']`;

                if (prop.type !== 'dynamic' && !this.options.useDefaultValue) {
                    assignment += ` as ${prop.type}?`;
                } else if (this.options.useDefaultValue) {
                    const defaultValue = this.getDefaultValue(prop.type);
                    assignment += ` as ${prop.type}? ?? ${defaultValue}`;
                }

                return assignment;
            }).join(',\n');

            return [
                `  factory ${className}.fromJson(Map<String, dynamic> json) {`,
                '    return ' + className + '(',
                assignments,
                '    );',
                '  }'
            ].join('\n');
        } else {
            return `  factory ${className}.fromJson(Map<String, dynamic> json) => _$${className}FromJson(json);`;
        }
    }

    generateToJson(properties) {
        if (!this.options.generateToJson) return '';

        if (!this.options.useSerializable) {
            const assignments = properties.map(prop =>
                `      '${prop.jsonKey}': ${prop.name}`
            ).join(',\n');

            return [
                '',
                '  Map<String, dynamic> toJson() {',
                '    return {',
                assignments,
                '    };',
                '  }'
            ].join('\n');
        } else {
            return '\n  Map<String, dynamic> toJson() => _$' + this.className + 'ToJson(this);';
        }
    }

    generateCopyWith(className, properties) {
        if (!this.options.generateCopyWith) return '';

        const params = properties.map(prop => {
            const nullable = this.options.useDefaultValue ? '' : '?';
            return `    ${prop.type}${nullable} ${prop.name}`;
        }).join(',\n');

        const assignments = properties.map(prop =>
            `      ${prop.name}: ${prop.name} ?? this.${prop.name}`
        ).join(',\n');

        return [
            '',
            `  ${className} copyWith({`,
            params,
            '  }) {',
            `    return ${className}(`,
            assignments,
            '    );',
            '  }'
        ].join('\n');
    }

    generateToString(className, properties) {
        if (!this.options.generateToString) return '';

        if (this.options.useEquatable) {
            const propsList = properties.map(prop => prop.name).join(', ');
            return [
                '',
                '  @override',
                `  List<Object?> get props => [${propsList}];`
            ].join('\n');
        } else {
            const propsString = properties.map(prop =>
                `${prop.name}: $${prop.name}`
            ).join(', ');

            return [
                '',
                '  @override',
                '  String toString() {',
                `    return '${className}(${propsString})';`,
                '  }'
            ].join('\n');
        }
    }

    generateJsonComment(originalJson) {
        if (!this.options.generateComment) return '';

        const formattedJson = JSON.stringify(JSON.parse(originalJson), null, 2)
            .split('\n')
            .map(line => '// ' + line)
            .join('\n');

        return '\n\n' + formattedJson;
    }

    getDefaultValue(type) {
        switch (type) {
            case 'String': return "''";
            case 'int': return '0';
            case 'double': return '0.0';
            case 'num': return '0';
            case 'bool': return 'false';
            default: return 'null';
        }
    }
}

// Export for use in script.js
window.DartGenerator = DartGenerator;