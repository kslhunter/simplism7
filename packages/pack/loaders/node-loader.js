const path = require("path");
const fs = require("fs-extra");

module.exports = function () {
  fs.copySync(this.resourcePath, path.resolve(this._compiler.options.output.path, "nodes", path.basename(this.resourcePath)));
  return `try { global.process.dlopen(module, './nodes/${path.basename(this.resourcePath)}'); } catch(e) { throw new Error('Cannot open ./nodes/${path.basename(this.resourcePath)}: ' + e); }`;
};
