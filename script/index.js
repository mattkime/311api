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

	let q = id => document.querySelector(`#${id}`).value;
	let incident = {
		INCIDENTSTREETNAME : q("INCIDENTSTREET1NAME"),
		LOCATIONDETAILS: q("INCIDENTONSTREETNAME") + ' & ' +
			q("INCIDENTSTREET1NAME") + ', ' +
			q("INCIDENTBOROUGH"),
		COMPLAINTDETAILS : q("COMPLAINTDETAILS") + ' - photo attached',
		media1: document.querySelector('#media1').files[0]
	};

	[
		'INCIDENTDATETIME',
		'INCIDENTONSTREETNAME',
		'INCIDENTSTREET1NAME',
		'INCIDENTBOROUGH',
		'INCIDENTZIP',
		'INCIDENTSPATIALXCOORD',
		'INCIDENTSPATIALYCOORD',
		'licensePlate',
	].forEach( item => incident[item] = q(item));

	Object.assign(complaint, basics, config.contact_info, incident);
	return complaint;
};

let fillForms = data => {
	let [str1, str2] = data.address.Address.split(' & ')

	document.querySelector("#INCIDENTDATETIME").value = data.datetime;
	document.querySelector("#INCIDENTONSTREETNAME").value = str1;
	document.querySelector("#INCIDENTSTREET1NAME").value = str2;
	document.querySelector("#INCIDENTZIP").value = data.address.Postal;
	document.querySelector("#INCIDENTSPATIALXCOORD").value = data.location.x;
	document.querySelector("#INCIDENTSPATIALYCOORD").value = data.location.y;
};

let objToFormData = ( obj ) => {
	let data = new FormData();
	Object.keys( obj ).forEach( k => data.append( k, obj[k] ) );
	return data;
};

let modifyDate = function(dateAsStr){
  let [ imgDate, imgTime] = dateAsStr.split(" ")
  let [ imgYear, imgMonth, imgDay ] = imgDate.split(":");
  let [ imgHour, imgMinute, imgSecond ] = imgTime.split(":");
  return dateFormat(new Date(imgYear, imgMonth - 1, imgDay, imgHour, imgMinute, imgSecond), "mm/dd/yyyy HH:MM:ss" )
};

let req$ = (url, data) =>
	Rx.Observable.fromPromise(
		$.ajax({
			method: 'POST',
			data : objToFormData(data),
			url,
			processData: false,
			contentType: false,
		})
	);

let lookup$ = trackingNumber => req$('lookup',{
		trackingNumber,
		v:7,
		userId:config.userId
	})
	.flatMap(Rx.Observable.from)
	.pluck('threeOneOneSRLookupResponse');

let lookupLoop$ = srnumber => Rx.Observable.of(srnumber)
	.delay(1000)
	.do(() => console.log('.'))
	.flatMap(lookup$)
	.flatMap( res => Rx.Observable.if(
		() => res.serviceRequestNumber,
		Rx.Observable.of(res.serviceRequestNumber),
		lookupLoop$(srnumber))
	);

let revGeocode$ = function({latLong: [ lat, long]}){
	let formDataObj = {
		location : `{ y : ${lat}, x : ${long} }`,
		distance : 150,
		returnIntersection : 'true',
		f : 'json',
	};

	return req$('//geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode',formDataObj)
		.map(JSON.parse)
};

let formatExif = exif => ({
	time : exif.tags.ModifyDate,
	latLong: [ exif.tags.GPSLatitude, exif.tags.GPSLongitude ]
});

let readerLoad$ = reader => Rx.Observable.fromEvent(reader, 'load')
	.pluck('target','result')
	.map( buffer => ExifParser.create(buffer).parse());

let ExifImage$ = image => {
	let reader = new FileReader();
	reader.readAsArrayBuffer(image);
	return readerLoad$(reader);
};

let exifRevGeocode$ = image => ExifImage$(image)
	.flatMap( exifInfo => {
		let datetime = modifyDate(exifInfo.tags.ModifyDate);
		return Rx.Observable.if(
			() => !!exifInfo.tags.GPSLatitude && !!exifInfo.tags.GPSLongitude,
			Rx.Observable.of(exifInfo)
				.map( formatExif )
				.flatMap( revGeocode$ )
				.map( addressInfo => Object.assign(addressInfo,{datetime})),
			Rx.Observable.of({ datetime })
	)});

Rx.Observable.fromEvent($('#media1'), 'change')
	.pluck('target','files')
	.map( files => files[0] )
	.flatMap( exifRevGeocode$ )
	.do( fillForms )
	.subscribe();

Rx.Observable.fromEvent($('#submit'), 'click')
	.do( e => e.preventDefault())
	.map(() => formatComplaint())
	.do(console.log)
	.flatMap(complaintData => req$('create', complaintData))
	.pluck('srnumber')
	.flatMap(lookupLoop$)
	.subscribe(console.log);
