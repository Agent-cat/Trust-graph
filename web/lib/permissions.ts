import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

const statement = {
  ...defaultStatements,
  product: ["create", "read", "update", "delete"],
  order: ["read", "update", "cancel"],
  cart: ["read", "add", "remove"],
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
  ...adminAc,
});

export const seller = ac.newRole({
  product: ["create", "read", "update", "delete"],
  order: ["read"],
});

export const customer = ac.newRole({
  product: ["read"],
  order: ["read", "cancel"],
  cart: ["read", "add", "remove"],
});

export const roles = {
  admin,
  seller,
  customer,
};
