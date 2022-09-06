/*
Copyright 2017 Flatmax Pty Ltd
You don't have rights to this code unless you are part of Flatmax Pty Ltd.
To have access to this code you must have written consent from Matt Flax @ Flatmax.
If you have found this code, remove it and destroy it immediately. You have no
rights to give it to others in any way, you may not alter it. This license will stay
in place.
*/

"use strict";

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){  // nodejs
  var ExposeClass = require("./ExposeClass.js")
  var JRPC = require('jrpc');
  var LitElement=class {};
} else {  // browser
  var ExposeClass = Window.ExposeClass;
  var LitElement = Window.LitElement; // load in the correct class for the browser
}

class JRPCCommon extends LitElement {
  /** Instansiate a new remote. It gets added to the array of remotes
  @return the new remote
  */
  newRemote(){
    let remote;
    if (typeof Window === 'undefined') // nodejs
      remote = new JRPC({ remoteTimeout: this.remoteTimeout }); // setup the remote
    else // browser
      remote = new Window.JRPC({ remoteTimeout: this.remoteTimeout }); // setup the remote
    if (this.remote==null)
      this.remote = [remote];
    else
      this.remote.push(remote);
    return remote;
  }

  /** expose classes and handle the setting up of remote's functions
  @param remote the remote to setup
  @param ws the websocket for transmission
  */
  setupRemote(remote, ws){
    remote.setTransmitter(this.transmit.bind(ws)); // Let JRPC send requests and responses continuously
    if (this.classes)
      this.classes.forEach((c) => {
        remote.expose(c);
      });
    remote.upgrade();

    remote.call('system.listComponents', [], (err, result) => {
      if (err) {
        console.log(err);
        console.log('Something went wrong when calling system.listComponents !');
      } else // setup the functions for overloading
        this.setupFns(Object.keys(result), remote);
    });
  }

  /** Transmit a message or queue of messages to the server.
  Bind the web socket to this method for calling this.send
  @param msg the message to send
  @param next the next to execute
  */
  transmit(msg, next){
  	try {
  	  this.send(msg);
  	  return next(false);
  	} catch (e) {
      console.log(e);
  	  return next(true);
  	}
  }

  /** Setup functions for calling on the server. It allows you to call server['class.method'](args) in your code.
  The return values from the function call will execute this['class.method'](returnArgs) here.
  @param fnNames The functions to make available on the server
  @param remote The remote to call
  */
  setupFns(fnNames, remote){
     let self=this;
     fnNames.forEach(fnName => {
      if (this.server==null)
        this.server={};
      this.server[fnName] = function (params) {
        remote.call(fnName, {args : Array.from(arguments)}, (err, result) => {
          if (err) {
            console.log('Error when calling remote function : '+fnName);
            console.log(err);
          } else // call the overloaded function
            if (self[fnName]==null)
              console.log("function not defined Error : "+fnName+" is not in your element, please define this function.");
            else
              self[fnName](result);
        });
      };
    });
    this.setupDone();
  }

  /** This function is called once the client has been contacted and the server functions are
  set up.
  You should overload this function to get a notification once the 'server' variable is ready
  for use.
  */
  setupDone(){}

  /** Add a class to the JRPC system. All functions in the class are exposed for use.
  \param c The class to expose for use in the JRPC system.
  \param objName If name is specified, then use it rather then the constructor's name to prepend the functions.
  */
  addClass(c, objName){
    c.getServer = () => {return this.server;} // give the class a method to get the server back to handle callbacks
    let exposeClass=new ExposeClass();
    let jrpcObj=exposeClass.exposeAllFns(c, objName); // get a js-JRPC friendly function object
    if (this.classes == null)
      this.classes = [jrpcObj];
    else
      this.classes.push(jrpcObj);

    if (this.remote!=null) // update all existing remotes
      this.remote.forEach(function(remote){
        remote.expose(jrpcObj); // expose the functions from the class
        remote.upgrade();  // Handshake extended capabilities
      });
  }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = JRPCCommon;
  else
    Window.JRPCCommon = JRPCCommon;