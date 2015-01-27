#!/usr/bin/env node

var Hapi = require('hapi');
var advisor = require('./dist');


var server = new Hapi.Server();

server.connection({ port: process.env.PORT || 8000 });

server.on('log', function (event, tags) {
    if (tags.error) {
        console.error(event);
    } else {
        console.log(event);
    }
});

server.register(
    {
        register: advisor
    },
    function (err) {
        if (err) {
            server.log(['error'], err);
            process.exit(1);
            return;
        }

        server.start(function (err) {
            if (err) {
                server.log(['error'], err);
                process.exit(1);
                return;
            }
            server.log(['info'], 'Server started at: ' + server.info.uri);
        });
    }
);