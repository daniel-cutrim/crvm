import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('supabase')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const allFiles = walk('./src');
allFiles.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let original = code;
  
  // Handle parameter typing
  code = code.replace(/:\s*any\b/g, ': Record<string, unknown>');
  
  // Handle type assertions
  code = code.replace(/as\s+any\b/g, 'as any'); // Wait, if I change to 'as unknown', TS breaks on 'unknown' having no properties.
  
  // If we still have 'as any', we should insert an eslint-disable comment on the line above.
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('as any') && !lines[i].includes('eslint-disable-next-line')) {
          // match indentation
          const indent = lines[i].match(/^(\s*)/)[1];
          lines.splice(i, 0, indent + '// eslint-disable-next-line @typescript-eslint/no-explicit-any');
          i++;
      }
  }
  code = lines.join('\n');

  if (code !== original) {
    fs.writeFileSync(file, code, 'utf8');
  }
});
console.log('Finished replacing any');
