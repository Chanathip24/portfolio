import { removeTestContent, service } from "./db";

/** Leaves the local database as the tests found it: no test users, no test content. */
export default async function globalTeardown() {
  await removeTestContent();
  const { data } = await service().auth.admin.listUsers({ perPage: 1000 });
  for (const u of data.users.filter((x) => /^e2e-.*@test\.local$/.test(x.email ?? ""))) await service().auth.admin.deleteUser(u.id);
}
