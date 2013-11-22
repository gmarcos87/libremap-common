var _ = require('underscore');

// WARNING by @andrenarchy: do not remove!
// (needed in couchdb <-> browserify glue hack)
module.exports._ = _;

var isType = module.exports.isType = function (v, t) {
  if (t=='number') {
    return _.isNumber(v);
  } else if (t=='string') {
    return _.isString(v);
  } else if (t=='boolean') {
    return _.isBoolean(v);
  } else if (t=='array') {
    return _.isArray(v);
  } else if (t=='object') {
    return _.isObject(v) && !_.isArray(v);
  } else if (t=='date') {
    return v == (new Date(v)).toISOString();
  } else if (t=='bbox') {
    return module.exports.bbox(v)!==undefined;
  }
  throw({err: 'unknown type: '+t});
};

var assertType = module.exports.assertType = function (v, t) {
  if (!isType(v,t)) {
    throw({err: 'type '+t+' expected'});
  }
};

var assertHas = module.exports.assertHas = function (o, k, t) {
  if (!_.has(o, k)) {
    throw({err: 'key '+k+' expected'});
  }
  if (t) {
    assertType(o[k], t);
  }
};

var assertOptional = module.exports.assertOptional = function (o, k, t) {
  if (_.has(o, k)) {
    assertType(o[k], t);
  }
};

// validate router document
// if the object is valid: nothing is returned
// otherwise: error string
// (backbone.js-style)
module.exports.router_validate = function(o) {
  try {
    assertHas(o, 'api_rev', 'string');
    assertHas(o, 'type', 'string');
    if (o.type!='router') {
      throw({err: 'type "router" expected'});
    }

    assertHas(o, 'hostname', 'string');

    // check ctime and mtime
    assertHas(o, 'ctime', 'date');
    assertHas(o, 'mtime', 'date');
    var ctime = new Date(o.ctime);
    var compare_time = (new Date( (new Date()).getTime() + 5*60*1000 )).toISOString();
    if (ctime > compare_time) {
      throw({err:'future dates not allowed in field ctime: ' + newDoc.ctime});
    }
    var mtime = new Date(o.mtime);
    if (mtime < ctime) {
      throw({err: 'mtime < ctime not allowed'});
    }

    // check location
    assertHas(o, 'lat', 'number');
    if (o.lat < -90 || o.lat > 90) {
      throw({err: 'invalid range: latitude should be between -90 and 90'});
    }
    assertHas(o, 'lon', 'number');
    if (o.lon < -180 || o.lon > 180) {
      throw({err: 'invalid range: longitude should be between -180 and 180'});
    }
    assertOptional(o, 'elev', 'number');

    // check aliases
    if (_.has(o, 'aliases')) {
      assertType(o.aliases, 'array');
      for (var i=0, alias; (alias=o.aliases[i++]);) {
        assertHas(alias, 'alias', 'string');
        assertOptional(alias, 'type', 'string');
      }
    }

    // check links
    if (_.has(o, 'links')) {
      assertType(o.links, 'array');
      for (var j=0, link; (link=o.links[j++]);) {
        assertHas(link, 'alias', 'string');
        assertOptional(link, 'type', 'string');
        if (_.has(link, 'quality')) {
          var quality = link.quality;
          assertType(quality, 'number');
          if (quality<0 || quality>1) {
            throw({err: 'invalid range: link quality should be between 0 and 1'});
          }
        }
        assertOptional(link, 'attributes', 'object');
      }
    }

    assertOptional(o, 'site', 'string');
    assertOptional(o, 'community', 'string');
    assertOptional(o, 'attributes', 'object');
  }
  catch (e) {
    return e.err;
  }
};

// remove all 'attributes' from object
module.exports.strip = function (d) {
  if (_.isArray(d)) {
    var arr=[];
    for (var i=0, cur; (cur=d[i++]);) {
      arr.push(strip(cur));
    }
    return arr;
  } else if (_.isObject(d)) {
    var obj = _.omit(d, 'attributes');
    for (var k in obj) {
      obj[k] = strip(obj[k]);
    }
    return obj;
  }
  return d;
};

// returns [lon,lat] GeoJSON for GeoCouch key
module.exports.router_coords = function (o) {
  return {type: 'Point', coordinates: [o.lon, o.lat]};
};

// this function returns a Bbox object with converter methods.
//
// unfortunately, there are several types of bounding boxes out there
// (lat1,lon1 is south-west; lat2,lon2 is north-east):
// string (e.g. in url):    lat1,lon1,lat2,lon2
// leaflet (LatLngBounds):  [[lat1,lon1], [lat2,lon2]]
// geocouch (spatial view): [lon1, lat1, lon2, lat2]
//
// the constructor takes any of the above bbox formats
module.exports.bbox = function(bbox_in) {
  // store bbox in array of form [lat1,lon1,lat2,lon2] internally
  var bbox = [];
  if (isType(bbox_in, 'string')) {
    // string incoming
    bbox = _.map(bbox_in.split(','), parseFloat);
  } else if (isType(bbox_in, 'array')) {
    if (bbox_in.length == 2) {
      // leaflet incoming
      bbox = _.flatten(bbox_in);
    } else if (bbox_in.length == 4) {
      // geocouch incoming
      bbox = [bbox_in[1],bbox_in[0],bbox_in[3],bbox_in[2]];
    }
  }
  // check if bbox is valid
  if (bbox.length!=4 || !_.every(bbox, _.isNumber) || _.some(bbox, _.isNaN) ||
        bbox[0]>bbox[2] || bbox[1]>bbox[3]) {
    return undefined;
  }

  this.toString = function() {
    return bbox.toString();
  };
  this.toLeaflet = function() {
    return [[bbox[0],bbox[1]], [bbox[2],bbox[3]]];
  };
  this.toGeocouch = function() {
    return [bbox[1],bbox[0],bbox[3],bbox[2]];
  };
  this.contains = function(lat, lon) {
    return bbox[0]<=lat && lat<=bbox[2] && bbox[1]<=lon && lon<=bbox[3];
  };
  return this;
};
