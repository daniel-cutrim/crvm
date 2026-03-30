import fs from 'fs';
const dataPath = 'src/hooks/useData.ts';
let dataContent = fs.readFileSync(dataPath, 'utf8');

// Add import if not exists
if (!dataContent.includes('import type { Database }')) {
  dataContent = dataContent.replace(
    "import { logger } from '@/utils/logger';",
    "import { logger } from '@/utils/logger';\nimport type { Database } from '@/integrations/supabase/types';"
  );
}

// Add TableName type alias
if (!dataContent.includes('type TableName')) {
  dataContent = dataContent.replace(
    "// Generic hook factory",
    "type TableName = keyof Database['public']['Tables'];\n\n// Generic hook factory"
  );
}

// Replace table: string with table: TableName
dataContent = dataContent.replace(/table: string,/g, 'table: TableName,');

// Remove eslint comments and any casts
dataContent = dataContent.replace(/\s*\/\/\s*eslint-disable-next-line\s*@typescript-eslint\/no-explicit-any\s*/g, '\n    ');
dataContent = dataContent.replace(/const sb = supabase as any;/g, 'const sb = supabase;');
dataContent = dataContent.replace(/\(supabase\.from\('([^']+)'\) as any\)/g, "supabase.from('$1')");

fs.writeFileSync(dataPath, dataContent);

const marketingPath = 'src/hooks/useMarketing.ts';
let marketingContent = fs.readFileSync(marketingPath, 'utf8');
marketingContent = marketingContent.replace(/\s*\/\/\s*eslint-disable-next-line\s*@typescript-eslint\/no-explicit-any\s*/g, '\n    ');
marketingContent = marketingContent.replace(/\(supabase as any\)/g, 'supabase');
fs.writeFileSync(marketingPath, marketingContent);
console.log('Hooks fixed!');
