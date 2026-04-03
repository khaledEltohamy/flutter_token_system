const fs = require('fs');
const path = require('path');

// Load tokens.json
const tokensPath = path.join(__dirname, 'tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// Dart output paths
const globalOutputPath = path.join(__dirname, '../packages/tokens/lib/global/global_tokens.dart');
const aliasOutputPath = path.join(__dirname, '../packages/tokens/lib/alias/alias_tokens.dart');

/**
 * Generate Dart class from token set
 */
function generateDartClass(tokenSet, className, outputFile, isAlias = true) {
  let output = `// GENERATED FILE - DO NOT EDIT
import 'dart:ui';
${isAlias ? "import '../global/global_tokens.dart';" : ''}

class ${className} {
  ${className}._();
`;

function processTokens(obj, prefix = '', isAlias) {
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}_${key}` : key;

    if (value && typeof value === 'object' && ('value' in value || '$value' in value)) {
      const safeName = name.replace(/\s+/g, '_').replace(/\./g, '_').toLowerCase();
      const rawValue = value.value || value.$value;

      let colorReference;

      if (isAlias && typeof rawValue === 'string' && rawValue.startsWith('{') && rawValue.endsWith('}')) {
        const pathKeys = rawValue.replace(/[{}]/g, '').split('.');
        if (pathKeys[0] === 'color') {
          const globalName = pathKeys.slice(1).join('_').replace(/\./g, '_').toLowerCase();
          colorReference = `GlobalTokens.${globalName}`;
        } else {
          console.warn(`⚠️ Unsupported reference: ${rawValue}. Using white.`);
          colorReference = 'Color(0xFFFFFFFF)';
        }
      } else {
        const hex = rawValue.replace('#', '').toUpperCase();
        colorReference = `Color(0xFF${hex})`;
      }

      output += `  static const Color ${safeName} = ${colorReference};\n`;
    } 
    else if (value && typeof value === 'object') {
      processTokens(value, name, isAlias); // ✅ Pass isAlias here!
    }
  }
}


  processTokens(tokenSet, '', isAlias);


  output += `}\n`;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, output, 'utf8');

  console.log(`✅ ${className} generated at ${outputFile}`);
}

// 🔥 Generate Global Tokens
if (tokens.global) {
  generateDartClass(tokens.global, 'GlobalTokens', globalOutputPath);
}

// 🔥 Generate Alias Tokens (pass isAlias = true!)
if (tokens.alias) {
  generateDartClass(tokens.alias, 'AliasTokens', aliasOutputPath, true);
}

console.log('🎉 Token generation completed!');
