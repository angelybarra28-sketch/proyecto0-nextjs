export type ServerLogInput = {
  area: string;
  action: string;
  entity?: string;
  entityId?: string | null;
  error: unknown;
};

export function logServerError(input: ServerLogInput): void {
  const error = input.error instanceof Error
    ? { name: input.error.name, message: input.error.message, stack: input.error.stack }
    : { message: String(input.error) };

  console.error(JSON.stringify({
    level: 'error',
    area: input.area,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    error,
    timestamp: new Date().toISOString(),
  }));
}
