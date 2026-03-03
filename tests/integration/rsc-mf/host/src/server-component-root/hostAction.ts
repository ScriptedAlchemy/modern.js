'use server';

export async function hostLocalAction(input: string) {
  return `host-action:${input}`;
}
