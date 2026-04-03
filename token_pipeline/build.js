const fs = require('fs');
const path = require('path');

// Load tokens.json
const tokensPath = path.join(__dirname, 'tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// Dart output paths
const globalOutputPath = path.join(__dirname, '../packages/tokens/lib/global/global_tokens.dart');
const aliasOutputPath = path.join(__dirname, '../packages/tokens/lib/alias/alias_tokens.dart');

/**
 * Resolve token references like {color.gray.900}
 */
function resolveValue(val) {
  if (typeof val !== 'string') return val;

  if (val.startsWith('{') && val.endsWith('}')) {
    const pathKeys = val.replace(/[{}]/g, '').split('.'); // e.g. ['color','gray','0']

    let ref;
    if (pathKeys[0] === 'color') {
      ref = tokens.global;
      pathKeys.shift(); // remove 'color'
    } else {
      ref = tokens;
    }

    for (const key of pathKeys) {
      if (!ref[key]) {
        console.warn(`⚠️ Token reference not found: ${val}. Using default white.`);
        return '#FFFFFF'; // fallback
      }
      ref = ref[key];
    }

    // Return the actual value
    if (!ref.value && !ref.$value) {
      console.warn(`⚠️ Invalid reference (no value) for: ${val}. Using default white.`);
      return '#FFFFFF';
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

function processTokens(obj, prefix = '', isAlias = false) {
  for (const [key, value] of Object.entries(obj)) {
    const name = prefix ? `${prefix}_${key}` : key;

    // Leaf node: has `value` or `$value`
    if ((value && typeof value === 'object') && ('value' in value || '$value' in value)) {
      const safeName = name.replace(/\s+/g, '_').replace(/\./g, '_').toLowerCase();
      const rawValue = value.value || value.$value;

      let colorReference;

      if (isAlias && typeof rawValue === 'string' && rawValue.startsWith('{') && rawValue.endsWith('}')) {
        // Convert {color.gray.0} → GlobalTokens.gray_0
        const pathKeys = rawValue.replace(/[{}]/g, '').split('.');
        if (pathKeys[0] === 'color') {
          const globalName = pathKeys.slice(1).join('_').replace(/\./g, '_').toLowerCase();
          colorReference = `GlobalTokens.${globalName}`;
        } else {
          throw new Error(`❌ Unsupported reference: ${rawValue}`);
        }
      } else {
        // fallback to static color
        const hex = rawValue.replace('#', '').toUpperCase();
        colorReference = `Color(0xFF${hex})`;
      }

      output += `  static const Color ${safeName} = ${colorReference};\n`;
    } 
    // Nested object
    else if (value && typeof value === 'object') {
      processTokens(value, name, isAlias);
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
  generateDartClass(tokens.global, 'GlobalTokens', globalOutputPath);
}

// 🔥 Generate Alias Tokens
if (tokens.alias) {
  generateDartClass(tokens.alias, 'AliasTokens', aliasOutputPath);
}

console.log('🎉 Token generation completed!');
