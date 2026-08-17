export function safePublicHttpsUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isPlausibleOfficialEducationUrl(value: string, officialSource: string, provider: string) {
  const candidate = safePublicHttpsUrl(value);
  const source = safePublicHttpsUrl(officialSource);
  if (!candidate) return false;
  const host = candidate.hostname.toLowerCase();
  if (source && (host === source.hostname || host.endsWith(`.${source.hostname}`) || source.hostname.endsWith(`.${host}`))) return true;
  if (/(?:\.edu(?:\.[a-z]{2})?|\.ac\.[a-z]{2}|\.edu\.[a-z]{2}|\.gov(?:\.[a-z]{2})?)$/.test(host)) return true;
  const providerTokens = provider.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 5 && !/university|college|school|institute|scholarship|government/.test(token));
  return providerTokens.some((token) => host.includes(token));
}
