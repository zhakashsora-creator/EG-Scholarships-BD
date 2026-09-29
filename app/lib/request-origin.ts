function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

export function publicRequestOrigin(request: Request) {
  const configuredOrigin = process.env.APP_PUBLIC_URL?.trim();
  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      // Fall through to proxy headers when deployment configuration is invalid.
    }
  }

  const host = firstForwardedValue(request.headers.get("x-forwarded-host"))
    || firstForwardedValue(request.headers.get("host"));
  const protocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))
    || new URL(request.url).protocol.replace(":", "");

  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}
