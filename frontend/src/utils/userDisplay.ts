export function getDisplayFullName(name?: string | null, username?: string | null, fallback = 'Name not provided') {
  const trimmedName = (name || '').trim();
  if (trimmedName) return trimmedName;

  const trimmedUsername = (username || '').trim();
  if (trimmedUsername) return trimmedUsername;

  return fallback;
}

export function getDisplayFirstName(name?: string | null, username?: string | null, fallback = 'User') {
  const fullName = getDisplayFullName(name, username, fallback).trim();
  if (!fullName) return fallback;

  return fullName.split(/\s+/)[0] || fallback;
}
