#!/bin/env node
var express = require('express');
var fs      = require('fs');
var qs      = require('querystring');

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

app.post('/join', function(req, res) {
	queue.push({
		name 	: req.body.name,
		id 	: parseInt(req.body.id),
		placeid : parseInt(req.body.placeid),
		rank 	: parseInt(req.body.rank),
		type 	: req.body.type
	})

	for (p1 = 0; p1 < queue.length; p1++) {
		for (p2 = 0; p2 < queue.length; p2 ++) {
			var player1 = queue[p1];
			var player2 = queue[p2];
			console.log(player1.type + " " + player2.type + ", " + player1.id + " " + player2.id + ", " + player1.rank + " " + player2.rank);
			console.log(player1.type == player2.type + " " + player1.id != player2.id + " " + Math.abs(player1.rank - player2.rank) < 50);
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

app.get('/leave/:id', function(req, res) {
	console.log(req.params.id);
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
		//var other	 = (confirm[req.params.id].players[0].id == req.params.id && confirm[req.params.id].players[1]) || (confirm[req.params.id].players[1].id == req.params.id && confirm[req.params.id].players[0]);
	}
	res.send("");
});

app.get('/confirm/remove/:id', function(req, res) {
	confirm[confirm[req.params.id].players[0].id] = null;
	confirm[confirm[req.params.id].players[1].id] = null;
	res.send("");
});


var confirmRequests = [ ];
app.get('/confirm/:id', function(req, res) {
	confirmRequests.push({
		request 	: req,
		response	: res,
		timestamp	: new Date().getTime()
	});
});

//check every second for response
setInterval(function() {
	var expiration = new Date().getTime() - 28000;
	var response;
	for (var i = confirmRequests.length - 1; i >= 0; i--) {
		response = confirmRequests[i].response;
		if (confirm[confirmRequests[i].request.params.id] != "undefined") {
			console.log(confirm[confirmRequests[i].request.params.id]);
			response.send(confirm[confirmRequests[i].request.params.id]);
		//check if request has polled for more than 28 seconds
		} else if (requests[i].timestamp < expiration) {
			response.end("");
		}
	}
}, 1000);

app.post('/confirm/accept', function(req, res) {
	var response = parseInt(req.body.response);
	var userId   = parseInt(req.body.userId);
	if (confirm[userId].players[0].id == userId) {
		confirm[userId].players[0].accept = response;
	} else if (confirm[userId].players[1].id == userId) {
		confirm[userId].players[1].accept = response;
	}
})

app.get('/arenas/remove/:id', function(req, res) {
	arenas[parseInt(req.params.id)] = null;
	res.send("");
});

app.get('/arenas/:id', function(req, res) {
	res.send(arenas[parseInt(req.params.id)]);
});

app.get('/queue', function(req, res){
	res.send(queue);
})

app.get('/', function(req, res) {
	res.send('test');
});

app.listen(port, ipaddress, function() {
	console.log("Server online.");
});