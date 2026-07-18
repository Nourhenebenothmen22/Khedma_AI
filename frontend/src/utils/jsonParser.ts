import type { JobDescriptionSectionSchema } from '../services/api.js';

/**
 * Splits a JSON array string by commas, respecting double quotes
 * (even if the string is partially generated/incomplete).
 */
function splitJsonArray(arrayStr: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < arrayStr.length; i++) {
    const char = arrayStr[i];
    // Toggle quote state (respecting escaped quotes)
    if (char === '"' && (i === 0 || arrayStr[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    result.push(current.trim());
  }
  
  return result;
}

/**
 * Parses incomplete/partial JSON strings progressively during streaming.
 * Maps values dynamically based on the backend sections schema.
 */
export function parsePartialJSON(jsonStr: string, sectionsSchema: JobDescriptionSectionSchema[]): Record<string, any> {
  const result: Record<string, any> = {};

  // Pre-populate keys with empty values based on schema type
  for (const s of sectionsSchema) {
    result[s.key] = s.type === 'array' ? [] : '';
  }

  // Helper to extract string fields in progress
  const extractString = (key: string) => {
    const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"?`);
    const match = jsonStr.match(regex);
    if (match) {
      result[key] = match[1];
    }
  };

  // Helper to extract array fields in progress
  const extractArray = (key: string) => {
    const regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]?`);
    const match = jsonStr.match(regex);
    
    if (match) {
      const itemsStr = match[1].trim();
      if (itemsStr) {
        // Use the quote-aware splitter to prevent comma fragmentation
        result[key] = splitJsonArray(itemsStr)
          .map(item => {
            // Strip outer quotes and unescape internal quotes
            return item.replace(/^"|"$/g, '').replace(/\\"/g, '"');
          })
          .filter(item => item.length > 0 && !item.includes('://') && item !== '"');
      }
    } else {
      const partialRegex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\[\\]]*)$`);
      const partialMatch = jsonStr.match(partialRegex);
      if (partialMatch) {
        const itemsStr = partialMatch[1].trim();
        if (itemsStr) {
          result[key] = splitJsonArray(itemsStr)
            .map(item => {
              return item.replace(/^"|"$/g, '').replace(/\\"/g, '"');
            })
            .filter(item => item.length > 0 && item !== '"');
        }
      }
    }
  };

  for (const section of sectionsSchema) {
    if (section.type === 'array') {
      extractArray(section.key);
    } else {
      extractString(section.key);
    }
  }

  return result;
}
