// utils/listRoutes.js
// Works for nested routers and all HTTP methods

function collectRoutes(app) {
  const routes = [];

  if (!app || !app._router) return routes;

  function extractPath(layer, basePath = "") {
    if (layer.route) {
      const routePath = basePath + layer.route.path;
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      routes.push({ methods, path: routePath });
    } else if (layer.name === "router" && layer.handle?.stack) {
      // Router mounted via app.use('/prefix', router)
      const prefix = layer.regexp?.source
        .replace("^\\", "")
        .replace("\\/?(?=\\/|$)", "")
        .replace("/i", "")
        .replace("\\/", "/")
        .replace("^", "")
        .replace("$", "")
        .replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ":param") || "";

      layer.handle.stack.forEach((nested) => extractPath(nested, basePath + prefix));
    }
  }

  app._router.stack.forEach((layer) => extractPath(layer, ""));
  return routes;
}

function printRoutes(app) {
  const routes = collectRoutes(app);

  if (!routes.length) {
    console.log("⚠️  No registered routes found.");
    return;
  }

  console.log("\n✅ Registered API routes:");
  for (const r of routes) {
    console.log(`${r.methods.join(", ")}\t ${r.path}`);
  }
  console.log();
}

module.exports = { collectRoutes, printRoutes };
