import etag from 'etag';
import Through from 'through2';
import GitHub from './github';
import pkg from '../package.json'


let advisor = function (server, options, next) {

    let advisories = [];
    let source = new GitHub(options.url, options.interval);

    source.on('error', function (err) {
        server.log(['error', 'advisor'], err);
    });

    source.pipe(Through.obj(
        function (data, _, done) {
            advisories = data;

            server.log(['info', 'advisor'], `Advisories updated.`);
            done();
        }
    ));


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


    next();
};


advisor.attributes = {
    pkg: pkg
};


export default advisor;