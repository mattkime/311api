console.log('hello hello');

let config = {
	"userId" : "54cc9827-b305-4960-b088-a44faebb051b",
	"contact_info" : {
		"CONTACTANONFLAG" : "Y",
		"CONTACTDAYTIMEPHONE" : "6166666561",
		"CONTACTFIRSTNAME" : "Matt",
		"CONTACTLASTNAME" : "Kime",
		"CONTACTEMAILADDRESS" : "matt@mattki.me"
	}
};

let formatComplaint = data => {
	let complaint = {
		COMPLAINTTYPE : 'For Hire Vehicle Complaint',
		DESCRIPTOR1 : 'Driver Complaint',
		DESCRIPTOR2 : 'Unsafe Driving',
		FORM : 'TLC FHV Complaint',
		topic : 'Taxi Driver',
		cellPhoneUsage : 'No',
		VEHICLETYPE : 'Car Service',
	};
	let basics = {
		userId : config.userId,
		v :'7',
		MSGSOURCE : '311 Mobile - iPhone',
	};

	let [str1, str2] = data.address.Address.split(' & ')

	let incident = {
		INCIDENTDATETIME : data.datetime,
		INCIDENTSTREET1NAME : str1,
		INCIDENTONSTREETNAME : str2,
		INCIDENTSTREETNAME : str2,
		//** LOCATIONDETAILS: data.address.Address + ', ' + data.promptData.INCIDENTBOROUGH,
		INCIDENTZIP: data.address.Postal,
		INCIDENTSPATIALXCOORD: data.location.x,
		INCIDENTSPATIALYCOORD: data.location.y,
		//
		//** INCIDENTBOROUGH : data.promptData.INCIDENTBOROUGH,
		//**COMPLAINTDETAILS: data.promptData.COMPLAINTDETAILS,
		//** licensePlate : data.promptData.licensePlate,
	};

	Object.assign(complaint, basics, config.contact_info, incident);
	return complaint;
};

let readerLoad$ = reader => Rx.Observable.fromEvent(reader, 'load')
	.pluck('target','result')
	.map( buffer => ExifParser.create(buffer).parse());

let ExifImage$ = image => {
	let reader = new FileReader();
	reader.readAsArrayBuffer(image);
	return readerLoad$(reader);
};

let formatExif = exif => ({
	time : exif.tags.ModifyDate,
	//latLong : dms2dec(exif.gps.GPSLatitude,exif.gps.GPSLatitudeRef,exif.gps.GPSLongitude,exif.gps.GPSLongitudeRef),
	latLong: [ exif.tags.GPSLatitude, exif.tags.GPSLongitude ]
});

let exifRevGeocode$ = image => ExifImage$(image)
	.do(console.log)
	.flatMap( exifInfo => {
		let datetime = modifyDate(exifInfo.tags.ModifyDate);
		return Rx.Observable.if(
		() => !!exifInfo.tags.GPSLatitude && !!exifInfo.tags.GPSLongitude,
		Rx.Observable.of(exifInfo)
			.map( formatExif )
			.flatMap( revGeocode$ )
			.do(console.log)
			.map( addressInfo => Object.assign(addressInfo,{datetime}))
			.do(console.log),
		Rx.Observable.of({ datetime })
	)});

let fillForms = data => {
	document.querySelector("#INCIDENTDATETIME").value = data.INCIDENTDATETIME;
	document.querySelector("#INCIDENTONSTREETNAME").value = data.INCIDENTONSTREETNAME;
	document.querySelector("#INCIDENTSTREET1NAME").value = data.INCIDENTSTREET1NAME;
	//data.INCIDENTONSTREETNAME;
	//data.INCIDENTSTREET1NAME;
	//data.INCIDENTDATETIME;


};

Rx.Observable.fromEvent($('#file'), 'change')
	.pluck('target','files')
	.map( files => files[0] )
	.flatMap( exifRevGeocode$ )
	.do( formattedExif => {
		if(formattedExif.datetime){
			$('#time').text(formattedExif.datetime);
		}
	})
	.map( formatComplaint )
	.do( fillForms )
	.subscribe(console.log);
	//todo - start putting together form

var onGeoclientData = function(data){
  console.log(data);
  //$('#precinct').text('@NYPD' + Number(data.address.policePrecinct) + 'Pct');
}

let objToFormData = ( obj ) => {
	let data = new FormData();

	Object.keys( obj ).forEach( k => data.append( k, obj[k] ) );
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
