let cookieStore: Record<string, string> = {};

export function __setCookies(values: Record<string, string>): void {
  cookieStore = { ...values };
}

export async function cookies() {
  return {
    get: (name: string) =>
      Object.prototype.hasOwnProperty.call(cookieStore, name)
        ? { name, value: cookieStore[name] }
        : undefined
  };
}

export {};
