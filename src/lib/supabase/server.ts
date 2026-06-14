// Stub vazio — auth migrada para src/lib/auth.ts
// Mantido para evitar erros de import durante a transição
export async function createClient() {
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  };
}
