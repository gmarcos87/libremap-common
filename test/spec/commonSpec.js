var common = require('../../');
var _ = require('underscore');

describe('router validation', function() {
  it('validates reference router doc', function() {
    var router = require('../reference_docs/router.json');
    expect(common.router_validate(router)).toBe(undefined);
  });

});

describe('bbox', function() {
  var ref = {
    string: {bbox: '52.1,13.2,53.1,13.91', fun: 'toString'},
    leaflet: {bbox: [[52.1,13.2],[53.1,13.91]], fun: 'toLeaflet'},
    geocouch: {bbox: [13.2,52.1,13.91,53.1], fun: 'toGeocouch'}
  };

  _.each(_.keys(ref), function(input) {
    var bbox = common.bbox(ref[input].bbox);
    _.each(_.keys(ref), function(output) {
      it('accepts '+input+' and converts to '+output, function() {
        expect(bbox[ref[output].fun]()).toEqual(ref[output].bbox);
      });
    });
  });
  it('returns undefined for invalid input', function() {
    expect(common.bbox('1,2,3,bla')).toBe(undefined);
  });
  it('checks for points in bbox', function() {
    var bbox = common.bbox(ref.string.bbox);
    expect(bbox.contains(52.3, 13.7)).toBe(true);
    expect(bbox.contains(51, 10)).toBe(false);
  });
});
