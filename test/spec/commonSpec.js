var common = require('../../');

describe("common module", function() {
  it("reference router doc", function() {
    var router = require('../reference_docs/router.json');
    expect(common.router_validate(router)).toBe(undefined);
  });
});
