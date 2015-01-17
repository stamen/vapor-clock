"use strict";

var spawn = require('child_process').spawn,
    util = require('util');

exports.execFile = function(file /* args, options, callback */) {
  var args, callback;
  var options = {
    encoding: 'utf8',
    timeout: 0,
    maxBuffer: 200 * 1024,
    killSignal: 'SIGTERM',
    cwd: null,
    env: null
  };

  // Parse the parameters.

  if (typeof arguments[arguments.length - 1] === 'function') {
    callback = arguments[arguments.length - 1];
  }

  if (util.isArray(arguments[1])) {
    args = arguments[1];
    options = util._extend(options, arguments[2]);
  } else {
    args = [];
    options = util._extend(options, arguments[1]);
  }

  var child = spawn(file, args, {
    cwd: options.cwd,
    env: options.env,
    gid: options.gid,
    uid: options.uid,
    windowsVerbatimArguments: !!options.windowsVerbatimArguments
  });

  var encoding;
  var _stdout;
  var _stderr;
  if (options.encoding !== 'buffer' && Buffer.isEncoding(options.encoding)) {
    encoding = options.encoding;
    _stdout = '';
    _stderr = '';
  } else {
    _stdout = [];
    _stderr = [];
    encoding = null;
  }
  var stdoutLen = 0;
  var stderrLen = 0;
  var killed = false;
  var exited = false;
  var timeoutId;

  var ex = null;

  function exithandler(code, signal) {
    if (exited) return;
    exited = true;

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (!callback) return;

    // merge chunks
    var stdout;
    var stderr;
    if (!encoding) {
      stdout = Buffer.concat(_stdout);
      stderr = Buffer.concat(_stderr);
    } else {
      stdout = _stdout;
      stderr = _stderr;
    }

    if (ex) {
      // Will be handled later
    } else if (code === 0 && signal === null) {
      callback(null, stdout, stderr);
      return;
    }

    var cmd = file;
    if (args.length !== 0)
      cmd += ' ' + args.join(' ');

    if (!ex) {
      ex = new Error('Command failed: ' + cmd + '\n' + stderr);
      ex.killed = child.killed || killed;
      ex.code = code < 0 ? uv.errname(code) : code;
      ex.signal = signal;
    }

    ex.cmd = cmd;
    callback(ex, stdout, stderr);
  }

  function errorhandler(e) {
    ex = e;
    child.stdout.destroy();
    child.stderr.destroy();
    exithandler();
  }

  function kill() {
    child.stdout.destroy();
    child.stderr.destroy();

    killed = true;
    try {
      child.kill(options.killSignal);
    } catch (e) {
      ex = e;
      exithandler();
    }
  }

  if (options.timeout > 0) {
    timeoutId = setTimeout(function() {
      kill();
      timeoutId = null;
    }, options.timeout);
  }

  child.stdout.addListener('data', function(chunk) {
    stdoutLen += chunk.length;

    if (stdoutLen > options.maxBuffer) {
      ex = new Error('stdout maxBuffer exceeded.');
      kill();
    } else {
      if (!encoding)
        _stdout.push(chunk);
      else
        _stdout += chunk;
    }
  });

  child.stderr.addListener('data', function(chunk) {
    stderrLen += chunk.length;

    if (stderrLen > options.maxBuffer) {
      ex = new Error('stderr maxBuffer exceeded.');
      kill();
    } else {
      if (!encoding)
        _stderr.push(chunk);
      else
        _stderr += chunk;
    }
  });

  if (encoding) {
    child.stderr.setEncoding(encoding);
    child.stdout.setEncoding(encoding);
  }

  child.addListener('close', exithandler);
  child.addListener('error', errorhandler);

  return child;
};
