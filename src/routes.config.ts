import { physical, rootRoute } from "@tanstack/virtual-file-routes";

/**
 * Route files live next to each feature; only __root stays in src/routes.
 * Paths are relative to routesDirectory (src/routes).
 */
export default rootRoute("__root.tsx", [
  physical("../features/student/routes"),
  physical("../features/auth/routes"),
  physical("/admin", "../features/admin/routes"),
  physical("/lecturer", "../features/lecturer/routes"),
]);
