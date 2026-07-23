import type { JobDescriptionSectionSchema } from '../services/api.js';

// Pre-compiled RegEx caches to prevent runtime instantiation GC thrashing during SSE streaming
const stringRegexCache = new Map<string, RegExp>();
const arrayRegexCache = new Map<string, RegExp>();
const partialArrayRegexCache = new Map<string, RegExp>();

function getStringRegex(key: string): RegExp {
  let regex = stringRegexCache.get(key);
  if (!regex) {
    regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*)"?`);
    stringRegexCache.set(key, regex);
  }
  return regex;
}

function getArrayRegex(key: string): RegExp {
  let regex = arrayRegexCache.get(key);
  if (!regex) {
    regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]?`);
    arrayRegexCache.set(key, regex);
  }
  return regex;
}

function getPartialArrayRegex(key: string): RegExp {
  let regex = partialArrayRegexCache.get(key);
  if (!regex) {
    regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\[\\]]*)$`);
    partialArrayRegexCache.set(key, regex);
  }
  return regex;
}

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
 * Maps values dynamically based on the backend sections schema using static cached RegEx.
 */
export function parsePartialJSON(jsonStr: string, sectionsSchema: JobDescriptionSectionSchema[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const s of sectionsSchema) {
    result[s.key] = s.type === 'array' ? [] : '';
  }

  const extractString = (key: string) => {
    const regex = getStringRegex(key);
    const match = jsonStr.match(regex);
    if (match) {
      result[key] = match[1];
    }
  };

  const extractArray = (key: string) => {
    const regex = getArrayRegex(key);
    const match = jsonStr.match(regex);

    if (match) {
      const itemsStr = match[1].trim();
      if (itemsStr) {
        result[key] = splitJsonArray(itemsStr)
          .map((item) => item.replace(/^"|"$/g, '').replace(/\\"/g, '"'))
          .filter((item) => item.length > 0 && !item.includes('://') && item !== '"');
      }
    } else {
      const partialRegex = getPartialArrayRegex(key);
      const partialMatch = jsonStr.match(partialRegex);
      if (partialMatch) {
        const itemsStr = partialMatch[1].trim();
        if (itemsStr) {
          result[key] = splitJsonArray(itemsStr)
            .map((item) => item.replace(/^"|"$/g, '').replace(/\\"/g, '"'))
            .filter((item) => item.length > 0 && item !== '"');
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
