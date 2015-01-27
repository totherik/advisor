import etag from 'etag';
import Boom from 'boom';
import Through from 'through2';
import GitHub from './github';
import pkg from '../package.json'


let advisor = function (server, options, next) {

    let advisories = [];

    let source = new GitHub(options.url, options.interval);
    source.on('error', function (err) {
        server.log(['error', 'advisor'], err);
    });

    let transform = Through.obj(
        function (data, _, done) {
            // First convert the array to a map of module name to a
            // data structure containing name and array of advisories.
            let map = data.reduce((map, { module_name }, index, src) => {
                if (!map.hasOwnProperty(module_name)) {
                    map[module_name] = {
                        module_name: module_name,
                        advisories: []
                    };
                }

                map[module_name].advisories.push(src[index]);
                return map;
            }, {});

            // Then, just get the values of the map as array.
            data = Object.keys(map).reduce(function (data, name) {
                data.push(map[name]);
                return data;
            }, []);

            // ... and sort on module name.
            data.sort(function ({ module_name: a }, { module_name: b}) {
                return a.localeCompare(b);
            });

            this.push(data);
            done();
        }
    );

    let assign = Through.obj(
        function (data, _, done) {
            advisories = data;
            server.log(['info', 'advisor'], 'Advisories updated.');
            done();
        }
    );

    // Start piping and let run forever.
    source
        .pipe(transform)
        .pipe(assign);


    server.route({

        method: 'GET',

        path: '/advisories',

        handler: function (request, reply) {
            let ts = source.lastModified;
            ts.setMilliseconds(0);

            if ('if-modified-since' in request.headers) {
                let mod = new Date(request.headers['if-modified-since']);
                mod.setMilliseconds(0);

                if (ts.getTime() <= mod.getTime()) {
                    let response;
                    response = reply();
                    response.code(304);
                    response.header('Last-Modified', String(ts));
                    return;
                }
            }

            let body = advisories;
            let crc = etag(JSON.stringify(body));

            if (request.headers['if-none-match'] === crc) {
                let response = reply();
                response.code(304);
                response.etag(crc);
                response.header('Last-Modified', String(ts));
                return;
            }

            let response = reply(body);
            response.code(200);
            response.etag(crc);
            response.header('Last-Modified', String(ts));
        }

    });


    server.route({

        method: 'GET',

        path: '/advisories/{module}',


        handler: function (request, reply) {
            let ts = source.lastModified;
            ts.setMilliseconds(0);

            if ('if-modified-since' in request.headers) {
                let mod = new Date(request.headers['if-modified-since']);
                mod.setMilliseconds(0);

                if (ts.getTime() <= mod.getTime()) {
                    let response;
                    response = reply();
                    response.code(304);
                    response.header('Last-Modified', String(ts));
                    return;
                }
            }


            let body = Boom.notFound();

            advisories.some(function ({ module_name }, index, arr) {
                return (module_name === request.params.module) && (body = arr[index]);
            });


            if (body.isBoom) {
                reply(body);
                return;
            }


            let crc = etag(JSON.stringify(body));

            if (request.headers['if-none-match'] === crc) {
                let response = reply();
                response.code(304);
                response.etag(crc);
                response.header('Last-Modified', String(ts));
                return;
            }

            let response = reply(body);
            response.code(200);
            response.etag(crc);
            response.header('Last-Modified', String(ts));
        }

    });

    next();
};


advisor.attributes = {
    pkg: pkg
};


export default advisor;