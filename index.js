'use strict';

const Hapi = require('hapi');

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: '0.0.0.0',
    port: 3000,
	routes : { cors: true }
});

server.register(
	[require('h2o2'), require('inert')],
function (err) {
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
		method: ['GET'],
		path:'/',
		handler: function (request, reply) { reply.file('index.html'); }
	}, {
		method: ['GET'],
		path:'/script/{file*}',
		handler: {
			directory: {
				path: 'script',
			}
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

