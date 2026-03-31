const fs = require('fs');
const path = require('path');

// Load tokens.json
const tokens = JSON.parse(fs.readFileSync(__dirname + '/tokens.json', 'utf8'));

// Flutter output path
const outputPath = path.join(__dirname, '../packages/tokens/lib/global/global_tokens.dart');

let output = `// GENERATED FILE - DO NOT EDIT
import 'dart:ui';

class GlobalTokens {
  GlobalTokens._();
`;

// iterate over global tokens
for (const [key, token] of Object.entries(tokens.global)) {
  if (token.$type === 'color') {
    const name = key.replace(/\s+/g, '_'); // spaces to underscores
    const value = '0xFF' + token.$value.replace('#', '');
    output += `  static const Color ${name} = Color(${value});\n`;
  }
}

output += `}\n`;

// write to file
fs.writeFileSync(outputPath, output, 'utf8');
console.log('✅ global_tokens.dart generated!');
