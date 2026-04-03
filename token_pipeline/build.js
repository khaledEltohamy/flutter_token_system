const fs = require('fs');
const path = require('path');

// Load tokens.json
const tokensPath = path.join(__dirname, 'tokens.json');
if (!fs.existsSync(tokensPath)) {
  throw new Error(`❌ tokens.json not found at: ${tokensPath}`);
}
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

/**
 * Resolve token references مثل: {color.gray.900}
 */
function resolveValue(val) {
  if (typeof val !== 'string') return val;

  if (val.startsWith('{') && val.endsWith('}')) {
    const pathKeys = val.replace(/[{}]/g, '').split('.');
    let ref = tokens;
    for (const key of pathKeys) {
      if (!ref[key]) {
        throw new Error(`❌ Token reference not found: ${val}`);
      }
      ref = ref[key];
    }

    if (!ref.value && !ref.$value) {
      throw new Error(`❌ Invalid reference (no value): ${val}`);
    }

    return ref.value || ref.$value;
  }

  return val;
}
/**
 * Generate Dart class from token set
 */
function generateDartClass(tokenSet, className, outputFile) {
  let output = `// GENERATED FILE - DO NOT EDIT
import 'dart:ui';

class ${className} {
  ${className}._();
`;

  function processTokens(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const name = prefix ? `${prefix}_${key}` : key;

      // If token leaf
      if (value.type === 'color' || value.$type === 'color') {
        const safeName = name
          .replace(/\s+/g, '_')
          .replace(/\./g, '_')
          .toLowerCase();

        const rawValue = resolveValue(value.value || value.$value);
        const hex = rawValue.replace('#', '').toUpperCase();
        const color = `0xFF${hex}`;

        output += `  static const Color ${safeName} = Color(${color});\n`;
      }

      // If nested object
      else if (typeof value === 'object') {
        processTokens(value, name);
      }
    }
  }

  processTokens(tokenSet);

  output += `}\n`;

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, output, 'utf8');
  console.log(`✅ ${className} generated at ${outputFile}`);
}

// 🔥 Generate Global Tokens
if (tokens.global) {
  generateDartClass(
    tokens.global,
    'GlobalTokens',
    path.join(__dirname, '../packages/tokens/lib/global/global_tokens.dart')
  );
}

// 🔥 Generate Alias Tokens
if (tokens.alias) {
  generateDartClass(
    tokens.alias,
    'AliasTokens',
    path.join(__dirname, '../packages/tokens/lib/alias/alias_tokens.dart')
  );
}

console.log('🎉 Token generation completed!');
