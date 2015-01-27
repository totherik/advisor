import Url from 'url';
import Wreck from 'wreck';
import { Readable } from 'stream';
import metamarked from 'meta-marked';


const INTERVAL = 5 * 60 * 1000;
const URL = 'https://api.github.com/repos/nodesecurity/nodesecurity-www/contents/advisories';


export default class GitHub extends Readable {

    constructor(url = URL, interval = INTERVAL) {
        Readable.call(this, { objectMode: true });

        this.interval = interval;
        this.url = url;
        this.lastUpdate = Date.now();
        this.headers = {
            'User-Agent': 'node.js',
            'If-None-Match': null,
            'If-Modified-Since': null
        };
    }

    get lastModified() {
        return new Date(this.headers['If-Modified-Since']);
    }

    _read() {
        let now = Date.now();
        let remaining = this.interval - (now - this.lastUpdate);

        setTimeout(() => {
            this._update();
        }, Math.max(0, remaining));

        this.lastUpdate = now;
    }

    _update() {

        let options = {
            headers: this.headers,
            json: true
        };

        Wreck.get(this.url, options, (err, res, payload) => {
            if (err) {
                this.emit('error', err);
                return;
            }

            switch (res.statusCode) {
                case 200:
                    this.headers['If-None-Match'] = res.headers['etag'];
                    this.headers['If-Modified-Since'] = res.headers['last-modified'];

                    let files = [];

                    for (let { type, download_url: url } of payload) {
                        if (type === 'file') {
                            files.push(this._download(url));
                        }
                    }

                    Promise
                        .all(files)
                        .then(this.push.bind(this), this.emit.bind(this, 'error'));
                    break;

                case 304:
                    // Not modified, so no new data for now.
                    break;

                default:
                    let error = new Error(payload && payload.message ? payload.message : 'GitHub read error.');
                    error.code = res.statusCode;
                    this.emit('error', error);
                    break;
            }
        });
    }

    _download(url) {
        return new Promise((resolve, reject) => {

            Wreck.get(url, (err, res, payload) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (res.statusCode !== 200) {
                    let error = new Error('Unknown error.');
                    error.statusCode = res.statusCode;
                    error.payload = payload;
                    reject(err);
                    return;
                }

                resolve(metamarked(payload).meta);
            });

        });
    }
}