advisor
========
A simple Hapi application/plugin for caching NodeSecurity Advisory data.


### Run as a Plugin
```javascript
var Hapi = require('hapi');
var advisor = require('advisor');

var server = new Hapi.Server();
server.connection({ port: 8000 });

server.register(
	{
		register: advisor,
	    options: {
	        /*interval: 50,
	        url: 'http://localhost:8000'*/
	    }
	},
	function (err) {
		if (err) { throw err; }

		server.start(function (err) {
			if (err) { throw err; }
            console.log('Server started at: ' + server.info.uri);
		});
	}
);
```

### Run Standalone
```bash
$ npm i -g advisor
# ...
$ advisor
#...
```

### Plugin API

#### createReadStream
Creates a readable stream that returns advisories as their updated.
```javascript
server.plugins.advisor.createReadStream().pip(through.obj(advisories, _, done) {
	// ...
	done();
});
```