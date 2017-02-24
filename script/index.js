console.log('hello hello');

let readerLoad$ = reader => Rx.Observable.fromEvent(reader, 'load')
	.pluck('target','result')
	.map( buffer => ExifParser.create(buffer).parse())

Rx.Observable.fromEvent($('#file'), 'change')
	.pluck('target','files')
	.map( files => files[0] )
	.flatMap( file => {
		let reader = new FileReader();
		reader.readAsArrayBuffer(file);
		return readerLoad$(reader)
			.do( exif => {
				if(exif.tags.ModifyDate){
					$('#time').text(modifyDate(exif.tags.ModifyDate));
				}
			})
			.flatMap(exif =>
				Rx.Observable.if(
					() => exif.tags.GPSLatitude && exif.tags.GPSLongitude,
					revGeocode$({latLong:[ exif.tags.GPSLatitude, exif.tags.GPSLongitude]})
				)
			)
	})
	.subscribe(console.log);
	//todo - start putting together form

var onGeoclientData = function(data){
  console.log(data);
  //$('#precinct').text('@NYPD' + Number(data.address.policePrecinct) + 'Pct');
}

let objToFormData = ( obj ) => {
	let data = new FormData();

	Object.keys( obj ).forEach( k => data.append( k, obj[k] ) );
	//TODO - this doesn't work in the browser
	return data;
};


var modifyDate = function(dateAsStr){
  console.log('dateAsStr', dateAsStr );
  var [ imgDate, imgTime] = dateAsStr.split(" ")
  var [ imgYear, imgMonth, imgDay ] = imgDate.split(":");
  var [ imgHour, imgMinute, imgSecond ] = imgTime.split(":");
  return dateFormat(new Date(imgYear, imgMonth - 1, imgDay, imgHour, imgMinute, imgSecond), "mm/dd/yyyy hh:MM:ss TT" )
};

var req$ = (url, data) =>
	Rx.Observable.fromPromise(
		$.ajax({
			method: 'POST',
			data : objToFormData(data),
			url,
			processData: false,
			contentType: false,
		})
	);

let revGeocode$ = function({latLong: [ lat, long]}){
	let config = {
		host: 'geocode.arcgis.com',
		path: '/arcgis/rest/services/World/GeocodeServer/reverseGeocode',
		method: 'post'
	};
	let formDataObj = {
		location : `{ y : ${lat}, x : ${long} }`,
		distance : 150,
		returnIntersection : 'true',
		f : 'json',
	};

	return req$('//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode',formDataObj)
		.map(JSON.parse)
};
