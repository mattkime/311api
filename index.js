'use strict';

const Hapi = require('hapi');

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: '0.0.0.0',
    port: 3000,
	routes : { cors: true }
});

server.register({
	register: require('h2o2')
},function (err) {
	if (err) {
		console.log('Failed to load h2o2');
	}

	server.ext('onPostHandler', (request, reply) => {
		reply.request.response.headers['Access-Control-Allow-Origin'] = '*';
		reply.continue();
	});
	// Add the route
	server.route([{
		method: ['GET','POST'],
		path:'/{action}',
		handler: {
			proxy: {
				passThrough: true,
				uri: 'http://www1.nyc.gov/NYC311-Mobile-Services-A/SR{action}.htm'
			}
		}
	}, {
		method: ['GET','POST'],
		path:'/',
		handler: function (request, reply) {
			//someday this will be a web page
			reply(`hello world, port 3000, via travis, update attempt
			<form action='lookup' method='post'>
			<input name='trackingNumber' value='47149D0A64736AF6E0540003BA35EB85'/>
			<input name='userId' value='8D6A7185-D1C5-4822-9314-26B9BEB05C0B'/>
			<input name='v' value='7'/>
			<button>submit</button>
			</form>`);
		}
	}]);

	// Start the server
	server.start((err) => {

		if (err) {
			throw err;
		}
		console.log('Server running at:', server.info.uri);
	});
});

