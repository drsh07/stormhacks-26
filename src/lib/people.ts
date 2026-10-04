/** The two pre-seeded accounts for live demos. These names are reserved on the server. */
export const DEMO_NAMES = ['Demo Alex', 'Demo Sam'];

export function isDemoName(name: string): boolean {
  return DEMO_NAMES.includes(name);
}

/** "Maya Chen" -> "Maya". Demo accounts keep their whole name ("Demo Alex"), since "Demo" alone means nothing. */
export function firstName(name: string): string {
  return isDemoName(name) ? name : name.split(' ')[0];
}
