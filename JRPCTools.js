/**
 # Copyright (c) 2016-2018 The flatmax-elements Authors. All rights reserved.
 #
 # Redistribution and use in source and binary forms, with or without
 # modification, are permitted provided that the following conditions are
 # met:
 #
 #    * Redistributions of source code must retain the above copyright
 # notice, this list of conditions and the following disclaimer.
 #    * Redistributions in binary form must reproduce the above
 # copyright notice, this list of conditions and the following disclaimer
 # in the documentation and/or other materials provided with the
 # distribution.
 #    * Neither the name of Flatmax Pty Ltd nor the names of its
 # contributors may be used to endorse or promote products derived from
 # this software without specific prior written permission.
 #
 # THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 # "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 # LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 # A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 # OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 # SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 # LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 # DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 # THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 # (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 # OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

"use strict";

let WebSocketServer = require('ws').Server;
let assert = require('assert')

let fs = require('fs');
let https = require('https'); // require modules for secure socket connection

let JRPCCommon = require('./JRPCCommon.js');

/** Class which implements a JRPC server based on js-JRPC
*/
class JRPCServer extends JRPCCommon {
  /** Given a port, setup a JRPC server.
  \param port The port number to use for socket binding
  \param remoteTimeout The maximum timeout of connection, default 60 seconds
  \param ssl Set false for regular connection, default true for secure connection through ssl
  */
  constructor(port, remoteTimeout=60, ssl=true){
    super();
    this.remoteTimeout = remoteTimeout;

    if (!ssl)
      if(port == null)
        this.wss = new WebSocketServer({port: 9000}); // create the websocket
      else
        this.wss = new WebSocketServer({port: port}); // create the websocket
    else {
      let server = new https.createServer({
        cert: fs.readFileSync('./cert/server.crt'),
        key: fs.readFileSync('./cert/server.key')
      //  ca: fs.readFileSync('./cert/rootCA.key')
      });
      if(port == null)
        server.listen(9000);
      else
        server.listen(port);
      this.wss = new WebSocketServer({server:server}); // create the websocket
    }
    // set the wss reference to this
    this.wss.on('connection', this.createRemote.bind(this), this);
  }

  /** Function called by the WebSocketServer once 'connection' is fired
  \param ws The web socket created by the web socket server
  */
  createRemote(ws){
    let remote = this.newRemote();

    ws.on('message', function(data, isBinary) {
      const msg = isBinary ? data : data.toString(); // changes for upgrade to v8
      remote.receive(msg);
    });
    this.setupRemote(remote, ws);
  }
}

module.exports = {
  JRPCServer
}
