/** Server-only permission checks — see `./permissions/server`. */
export type { CustomPermission } from "./permissions/server"
export {
  hasPermission,
  setCustomPermissions,
  addCustomPermission,
  removeCustomPermission,
} from "./permissions/server"
export { default } from "./permissions/server"
