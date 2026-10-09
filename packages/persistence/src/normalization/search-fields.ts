export interface SearchFieldsInput {
  fullName: string;
  email?: string;
  phone: string;
}

export interface SearchFields {
  fullNameSearch: string;
  emailLower?: string;
  phoneDigits: string;
}

export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildSearchFields(input: SearchFieldsInput): SearchFields {
  const fields: SearchFields = {
    fullNameSearch: foldText(input.fullName),
    phoneDigits: input.phone.replace(/\D/g, '')
  };
  if (input.email) {
    fields.emailLower = normalizeEmail(input.email);
  }
  return fields;
}
