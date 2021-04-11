"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.searchUrls = searchUrls;
exports.writeUrls = writeUrls;
exports.clipboardUrls = clipboardUrls;
exports.downloadUrls = downloadUrls;

var _clipboardy = _interopRequireDefault(require("clipboardy"));

var _chalk = _interopRequireDefault(require("chalk"));

var _fs = _interopRequireDefault(require("fs"));

var _progress = _interopRequireDefault(require("progress"));

var _loading = _interopRequireDefault(require("./loading"));

var _vidstreaming = _interopRequireDefault(require("../vidstreaming"));

async function searchUrls(search) {
  const vid = new _vidstreaming.default();
  vid.on('error', err => {
    switch (err.code) {
      case 'ANINOTFOUND':
        console.error(err.message);
        break;

      case 'ENOTFOUND':
        console.log('Something went wrong. Check your internet connection.');
        break;

      default:
        console.log(err.message);
    }

    process.exit(1);
  });
  return await vid.term(search);
}

async function writeUrls(anime, output, res, options) {
  const instance = new _vidstreaming.default(res, options);

  _loading.default.start();

  instance.on('error', err => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(err.message);

    _fs.default.unlink(output, e => {
      if (e) {
        console.log(e.message);
      }
    });

    process.exit(1);
  });
  instance.on('loaded', (urls, total) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    _loading.default.message(`Getting urls... ${urls.length} / ${total}`);
  });
  instance.on('write', () => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    _loading.default.message('Writing to file...');
  });
  const data = await instance.episodes(anime.link);
  await instance.writeTo(output, data);

  _loading.default.stop();

  console.log(_chalk.default.greenBright('  URLS written successfully'));
}

async function clipboardUrls(anime, res, options) {
  const instance = new _vidstreaming.default(res, options);

  _loading.default.start();

  instance.on('error', err => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(err.message);
    process.exit(1);
  });
  instance.on('loaded', (urls, total) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    _loading.default.message(`Getting urls... ${urls.length} / ${total} Episodes`);
  });
  const data = await instance.episodes(anime.link);
  const data_string = data ? data.map(d => d.src).join('\n') : '';
  await _clipboardy.default.write(data_string);

  _loading.default.stop();

  process.stdout.write(_chalk.default.greenBright('  Copied urls to clipboard'));
}

async function downloadUrls(anime, output, res, options) {
  const instance = new _vidstreaming.default(res, options);

  _loading.default.start();

  let bar;
  instance.on('error', err => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    console.log(err.message);
    process.exit(1);
  });
  instance.on('queue', (i, f, l) => {
    _loading.default.stop();

    const len = parseInt(l.length);
    bar = new _progress.default(`DL - [:bar] ${i.cur}/${i.total} :percent :size/${l.human}`, {
      width: 30,
      complete: '#',
      incomplete: ' ',
      total: len
    });
  });
  instance.on('loaded', (urls, total) => {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);

    _loading.default.message(`Getting urls... ${urls.length} / ${total} Episodes`);
  });
  instance.on('download', (chunk, _data, _filename) => {
    const size = require('pretty-bytes')(Number(_data), {
      maximumFractionDigits: 2
    });

    bar.tick(chunk.length, {
      'size': size
    });
  });
  instance.on('done', () => {
    process.stdout.clearLine(0);
    console.log('Downloads done~ Exiting...');
    process.exit(0);
  });
  const data = await instance.episodes(anime.link);
  await instance.download(output, data);
}