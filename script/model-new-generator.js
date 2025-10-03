// Model New Generator - Separate module for generating custom Model classes
class ModelNewGenerator {
    constructor() {
        this.baseImports = [
            "import 'dart:convert';",
            "",
            "import '../main.dart';",
            "import 'base.dart';",
            ""
        ];
    }

    generate(className, jsonData, settings = {}) {
        let dartCode = '';

        // Check if the input is an array
        if (Array.isArray(jsonData)) {
            if (jsonData.length === 0) {
                throw new Error('Cannot generate class from empty array');
            }
            // Use the first item in the array as the template
            jsonData = jsonData[0];
        }

        // Add imports
        dartCode += this.baseImports.join('\n');

        // Class declaration
        dartCode += `class ${className} extends Model {\n`;

        // Add singleton pattern if requested
        if (settings.singletonPattern) {
            dartCode += `  ${className}._();\n`;
            dartCode += `  static ${className} i = ${className}._();\n\n`;
        }

        // Generate properties
        const properties = this.generateProperties(jsonData);
        dartCode += properties + '\n\n';

        // Generate fromJson method
        dartCode += this.generateFromJson(jsonData, settings.singletonPattern) + '\n\n';

        // Generate utility methods based on settings
        if (settings.localSave) {
            dartCode += this.generateSaveMethod(className) + '\n\n';
        }

        if (settings.localClear) {
            dartCode += this.generateClearMethod(className) + '\n\n';
        }

        if (settings.localGet) {
            dartCode += this.generateGetMethod(className) + '\n\n';
        }

        // Generate toJson method
        dartCode += this.generateToJson(jsonData) + '\n';

        dartCode += '}\n';

        // Add JSON comment if requested
        if (settings.generateJsonComment) {
            dartCode += '\n/*\n' + JSON.stringify(jsonData, null, 2) + '\n*/';
        }

        return dartCode;
    }

    generateProperties(jsonData) {
        const stringProps = [];
        const boolProps = [];
        const intProps = [];
        const doubleProps = [];
        const objectProps = [];

        // Categorize properties by type
        Object.keys(jsonData).forEach(key => {
            // Skip invalid Dart variable names
            if (!this.isValidDartVariableName(key)) {
                return;
            }

            const value = jsonData[key];
            const camelKey = this.toCamelCase(key);

            switch (typeof value) {
                case 'string':
                    stringProps.push(camelKey);
                    break;
                case 'boolean':
                    boolProps.push(camelKey);
                    break;
                case 'number':
                    if (Number.isInteger(value)) {
                        intProps.push(camelKey);
                    } else {
                        doubleProps.push(camelKey);
                    }
                    break;
                case 'object':
                    if (value !== null && !Array.isArray(value)) {
                        objectProps.push(`${this.capitalize(camelKey)}Model ${camelKey}`);
                    }
                    break;
            }
        });

        // Build property declarations
        let properties = '';

        if (stringProps.length > 0) {
            properties += `  late String ${stringProps.join(',\n      ')};\n`;
        }

        if (boolProps.length > 0) {
            properties += `  late bool ${boolProps.join(',\n      ')};\n`;
        }

        if (intProps.length > 0) {
            properties += `  late int ${intProps.join(',\n      ')};\n`;
        }

        if (doubleProps.length > 0) {
            properties += `  late double ${doubleProps.join(',\n      ')};\n`;
        }

        if (objectProps.length > 0) {
            objectProps.forEach(prop => {
                properties += `  late ${prop};\n`;
            });
        }

        return properties.trim();
    }

    generateFromJson(jsonData, hasSingleton) {
        // Use constructor name based on singleton pattern
        const constructorName = hasSingleton ? 'fromJson' : `${this.getCurrentClassName()}.fromJson`;

        let method = `  ${constructorName}([Map<String, dynamic>? json]) {\n`;
        method += '    id = stringFromJson(json, "id");\n';

        Object.keys(jsonData).forEach(key => {
            // Skip invalid Dart variable names
            if (!this.isValidDartVariableName(key)) {
                return;
            }

            const value = jsonData[key];
            const camelKey = this.toCamelCase(key);

            switch (typeof value) {
                case 'string':
                    method += `    ${camelKey} = stringFromJson(json, "${key}");\n`;
                    break;
                case 'boolean':
                    method += `    ${camelKey} = boolFromJson(json, "${key}");\n`;
                    break;
                case 'number':
                    if (Number.isInteger(value)) {
                        method += `    ${camelKey} = intFromJson(json, "${key}");\n`;
                    } else {
                        method += `    ${camelKey} = doubleFromJson(json, "${key}");\n`;
                    }
                    break;
                case 'object':
                    if (value !== null && !Array.isArray(value)) {
                        const modelName = this.capitalize(camelKey) + 'Model';
                        method += `    ${camelKey} = ${modelName}.fromJson(json?["${key}"] ?? {});\n`;
                    }
                    break;
            }
        });

        method += '  }';
        return method;
    }

    generateSaveMethod(className) {
        const key = className.toLowerCase();
        return [
            '  save() {',
            `    Prefs.setString('${key}', jsonEncode(toJson()));`,
            '  }'
        ].join('\n');
    }

    generateClearMethod(className) {
        const key = className.toLowerCase();
        return [
            '  clear() {',
            `    Prefs.remove('${key}');`,
            '    fromJson();',
            '  }'
        ].join('\n');
    }

    generateGetMethod(className) {
        const key = className.toLowerCase();
        return [
            '  get() {',
            `    String data = Prefs.getString('${key}') ?? '{}';`,
            '    fromJson(jsonDecode(data));',
            '  }'
        ].join('\n');
    }

    generateToJson(jsonData) {
        let method = '  @override\n  Map<String, dynamic> toJson() => {\n';
        method += '        "id": id,\n';

        const assignments = Object.keys(jsonData)
            .filter(key => this.isValidDartVariableName(key))
            .map(key => {
                const value = jsonData[key];
                const camelKey = this.toCamelCase(key);

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return `        "${key}": ${camelKey}.toJson()`;
                } else {
                    return `        "${key}": ${camelKey}`;
                }
            });

        method += assignments.join(',\n') + ',\n';
        method += '      };';

        return method;
    }

    getCurrentClassName() {
        // This will be set by the main script when generating
        return this.currentClassName || 'Model';
    }

    setCurrentClassName(className) {
        this.currentClassName = className;
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
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Make it globally available
window.ModelNewGenerator = ModelNewGenerator;