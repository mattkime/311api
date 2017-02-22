console.log('hello hello');

$('#file').on('change', function(e){
	console.log(e.target.files[0]);
	  var reader = new FileReader();
  reader.onload = (function(e) {
    var arrBuff = e.target.result;
    var exif = ExifParser.create(arrBuff).parse();
    if(exif.tags.ModifyDate){
      $('#time').text(modifyDate(exif.tags.ModifyDate));
    }
    if( exif.tags.GPSLatitude && exif.tags.GPSLongitude){
      var latlng = {lat: exif.tags.GPSLatitude, lng: exif.tags.GPSLongitude};
revGeocode$({latLong:[ latlng.lat, latlng.lng]})
	.subscribe(console.log,null, () => console.log('done'));
	/*
      geocoder.geocode({'location': latlng}, function(results, status) {
        console.log(status);
        console.log(results);
        var addrObj = results[0].address_components.reduce(function(obj, item){  obj[item.types[0]] = item.short_name; return obj;},{})
        $('#address').text(results[0].formatted_address)

        var API_URL = 'https://api.cityofnewyork.us/geoclient/v1/address.json';
        $.ajax(
          API_URL,
          {
            dataType:'jsonp',
            data: {
              houseNumber : addrObj.street_number,
              street : addrObj.route,
              zip: addrObj.postal_code,
              app_id: '9531fd3e',
              app_key: 'cd92412bac1c876fdafafe3b876a1228'
            }
          }
        ).done(onGeoclientData)
      });
	*/
    }
  });
  reader.readAsArrayBuffer(e.target.files[0]);
});
var onGeoclientData = function(data){
  console.log(data);
  //$('#precinct').text('@NYPD' + Number(data.address.policePrecinct) + 'Pct');
}

let objToFormData = ( obj ) => {
	let data = new FormData();

	Object.keys( obj ).forEach( k => data.append( k, obj[k] ) );
	//TODO - this doesn't work in the browser
	data.submit = data.submit.bind(data);
	return data;
};

var modifyDate = function(dateAsStr){
  console.log('dateAsStr', dateAsStr );
  var [ imgDate, imgTime] = dateAsStr.split(" ")
  var [ imgYear, imgMonth, imgDay ] = imgDate.split(":");
  var [ imgHour, imgMinute, imgSecond ] = imgTime.split(":");
  return dateFormat(new Date(imgYear, imgMonth - 1, imgDay, imgHour, imgMinute, imgSecond), "mm/dd/yyyy hh:MM:ss TT" )
};

let revGeocode$ = function({latLong: [ lat, long]}){
	let config = {
		host: 'geocode.arcgis.com',
		path: '/arcgis/rest/services/World/GeocodeServer/reverseGeocode',
		method: 'post'
	};
	let formDataObj = objToFormData({
		location : `{ y : ${lat}, x : ${long} }`,
		distance : 150,
		returnIntersection : 'true',
		f : 'json',
	});

	return Rx.Observable.bindNodeCallback(formDataObj.submit)(config)
		.flatMap(streamToString)
		.map(JSON.parse)
		.do(console.log)
};
