export function positionToLineColumn(source, position) {
  let line = 1;
  let column = 1;
  const limit = Math.min(Math.max(position, 0), source.length);
  for (let i = 0; i < limit; i += 1) {
    if (source[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

export function extractParseLocation(error, source) {
  const message = String(error?.message || 'Invalid JSON syntax');
  const lineCol = message.match(/line (\d+) column (\d+)/i);
  const posMatch = message.match(/position (\d+)/i);

  let position = posMatch ? Number(posMatch[1]) : null;
  let line = lineCol ? Number(lineCol[1]) : null;
  let column = lineCol ? Number(lineCol[2]) : null;

  if (position != null && (line == null || column == null)) {
    const loc = positionToLineColumn(source, position);
    line = loc.line;
    column = loc.column;
  }

  if (line == null || column == null) {
    line = 1;
    column = 1;
  }

  return {
    message: normalizeParseMessage(message),
    rawMessage: message,
    line,
    column,
    position
  };
}

export function normalizeParseMessage(message) {
  const trimmed = message.replace(/^SyntaxError:\s*/i, '').trim();
  if (/unexpected end/i.test(trimmed)) {
    return trimmed;
  }
  if (/bad escaped character|invalid string/i.test(trimmed)) {
    return trimmed;
  }
  if (/trailing comma|expected/i.test(trimmed) || /unexpected token/i.test(trimmed)) {
    return trimmed;
  }
  return trimmed || 'Unexpected token or invalid JSON syntax';
}
