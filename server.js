#!/bin/env node
var express = require('express');
var fs      = require('fs');
var qs      = require('querystring');
var mysql	= require('mysql');

var ipaddress 	= process.env.OPENSHIFT_NODEJS_IP;
var port 		= process.env.OPENSHIFT_NODEJS_PORT || 8080;
var queue 		= [ ];
var confirm 	= { };
var arenas		= { };

if (typeof ipaddress === "undefined") {
	ipaddress = "127.0.0.1";
};

var app  = express();
var id   = app.param("/^\d+$/");
var type = app.param("/^\w+$/");

app.use(express.bodyParser());

//app.use('/css', express.static(__dirname + '/css'));
//app.use('/img', express.static(__dirname + '/img'));

//Joining queue
app.post('/join', function(req, res) {

	//accept - 0: awaiting
	//accept - 1: failed/canceled
	//accept - 2: accepted
	queue.push({ name : req.body.name, id : req.body.id, rank : req.body.rank, type : req.body.type, confirm : false, accept : 0, placeid : req.body.placeid });

	//Removes from queue and adds to confirmation
	for (p1 = 0; p1 < queue.length; p1++) {
		for (p2 = 0; p2 < queue.length; p2 ++) {
			var player1 = queue[p1];
			var player2 = queue[p2];
			if (player1.type == player2.type && player1.id != player2.id && Math.abs(player1.rank - player2.rank) < 50) {
				queue.splice((p1 > p2) ? p1 : p2, 1);
				queue.splice((p1 > p2) ? p2 : p1, 1);
				confirm[player1.id] = { players : [ player1, player2 ], id : player1.placeid, type : player1.type };
				confirm[player2.id] = confirm[player1.id];
			}
		}
	}
	res.send("added");
});

//leaving queue
app.get('/leave/:id', function(req, res) {
	req.params.id = parseInt(req.params.id);
	for (player = 0; player < queue.length; player++) {
		if (queue[player].id == req.params.id) {
			//console.log(queue[player].name + " has left(queue/" + queue[player].type + ")");
			queue.splice(player, 1);
			counter -= 1;
			break;
		}
	}

	res.send("removed");
});

//add to confirm queue
app.get('/confirm/add/:id', function(req, res) {
	req.params.id = parseInt(req.params.id);
	var c         = confirm[req.params.id];

	if (c.players[0].id == req.params.id) {
		c.players[0].confirm = true;
	} else if (c.players[1].id == req.params.id) {
		c.players[1].confirm = true;
	}

	if (c.players[0].confirm && c.players[1].confirm) {
		arenas[c.id] = { players : [ c.players[0], c.players[1] ], arenaid : c.id, type : c.type, set : "Players2" };
		var other         = (confirm[req.params.id].players[0].id == req.params.id && confirm[req.params.id].players[1]) || (confirm[req.params.id].players[1].id == req.params.id && confirm[req.params.id].players[0]);
	}
	res.send("");
});

//remove from confirmation queue
app.get('/confirm/remove/:id', function(req, res) {
	confirm[confirm[req.params.id].players[0].id] = null;
	confirm[confirm[req.params.id].players[1].id] = null;
	res.send("");
});

//return confirm queue for :id
app.get('/confirm/:id', function(req, res) {
	res.send(confirm[parseInt(req.params.id)] || []);
});

app.post('/confirm/accept', function(req, res) {
	var response = parseInt(req.body.response);
	var userId   = parseInt(req.body.userId);
	if (confirm[userId].players[0].id == userId) {
		confirm[userId].players[0].accept = response;
	} else if (confirm[userId].players[1].id == userId) {
		confirm[userId].players[1].accept = response;
	}
})

//remove arena
app.get('/arenas/remove/:id', function(req, res) {
	arenas[parseInt(req.params.id)] = null;
	res.send("");
});

//return id information
app.get('/arenas/:id', function(req, res) {
	res.send(arenas[parseInt(req.params.id)]);
});

app.get('/queue', function(req, res){
	res.send(queue);
})

//root page
app.get('/', function(req, res) {
	res.sendfile('index.html');
});

app.listen(port, ipaddress, function() {
	console.log("Server online.");
});