import test from 'tape';
import Hapi from 'hapi';
import Advisor from '../dist/index';

test('advisor', function (t) {
    let server, headers;


    t.test('plugin', function (t) {
        server = new Hapi.Server();
        server.connection({ port: 8000 });
        server.register({

            register: Advisor,
            options: {
                /*interval: 50,
                url: 'http://localhost:8000'*/
            }

        }, function (err) {
            t.error(err);
            t.end();
        });
    });


    t.test('request', function (t) {

        server.inject('/advisories', function (res) {
            t.equal(res.statusCode, 200);
            t.ok(/^application\/json/.test(res.headers['content-type']));

            let payload = JSON.parse(res.payload);
            t.ok(Array.isArray(payload));

            headers = {
                'If-None-Match': res.headers['etag'],
                'If-Modified-Since': res.headers['last-modified']
            };

            t.end();
        });

    });


    t.test('not modified', function (t) {
        let req = {
            method: 'get',
            url: '/advisories',
            headers: headers
        };

        server.inject(req, function (res) {
            t.equal(res.statusCode, 304);
            t.end();
        });
    });

});