module.exports = function (source) {
  if (this.cacheable) {
    this.cacheable();
  }

  if ((typeof source === "string") && (/^#!/.test(source))) {
    source = source.replace(/^#![^\n\r]*[\r\n]/, "");
  }
  return source
};